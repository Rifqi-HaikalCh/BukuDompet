// Uji alur CRUD → antrean → server: perubahan di store HARUS sampai ke "database" (server tiruan), dan
// kegagalan HARUS terlihat (bukan diam-diam). Tanpa jaringan/Postgres.
// Jalankan: npx tsx tests/sync/crud-push.test.mts
import assert from "node:assert/strict";
import { SyncEngine, SyncHttpError, type CollectionAdapter, type Persisted, type PullResponse, type PushResponse, type WireOp, type WireResult } from "../../src/lib/sync/engine.ts";
import type { Doc } from "../../src/lib/sync/canon.ts";
import { buildFinanceContext } from "../../src/lib/finance/context.ts";
import { makeDefaultWallets, allocateToWallet, transferBetween, walletIdFor } from "../../src/lib/finance/wallets.ts";
import { buildGrantRequest, approveGrant, settleGrant } from "../../src/lib/finance/grants.ts";
import { buildSupervisorIncome, verifiedPatch } from "../../src/lib/finance/income.ts";
import { buildClosing, computeClosingFigures, splitSurplus } from "../../src/lib/finance/closing.ts";
import type { FinTx, GrantRequest, MonthlyClosing, SubWallet } from "../../src/lib/finance/types.ts";

type Mode = "ok" | "http500" | "offline" | "unauthorized";

/** Server tiruan dengan aturan revisi yang sama seperti app_sync_push/app_sync_pull. */
class FakeServer {
  docs = new Map<string, { rev: number; seq: number; data: Doc | null; deleted: boolean }>();
  seq = 0;
  mode: Mode = "ok";
  pushCalls = 0;
  private gate() {
    if (this.mode === "offline") throw new TypeError("offline");
    if (this.mode === "unauthorized") throw new SyncHttpError(401, "session_invalid");
    if (this.mode === "http500") throw new SyncHttpError(500);
  }
  async pull(since: number): Promise<PullResponse> {
    this.gate();
    const docs = [...this.docs.entries()]
      .filter(([, v]) => v.seq > since)
      .sort((a, b) => a[1].seq - b[1].seq)
      .map(([k, v]) => {
        const [c, ...rest] = k.split("/");
        return { c, i: rest.join("/"), r: v.rev, s: v.seq, x: v.deleted, d: v.deleted ? null : v.data };
      });
    return { epoch: "e1", docs, seq: docs.length ? docs[docs.length - 1].s : since, more: false };
  }
  async push(ops: WireOp[]): Promise<PushResponse> {
    this.gate();
    this.pushCalls++;
    const results: WireResult[] = ops.map((op) => {
      const k = `${op.c}/${op.i}`;
      const ex = this.docs.get(k);
      if (ex && ex.rev !== op.b) return { k, s: "conflict", r: ex.rev, d: ex.deleted ? null : ex.data, x: ex.deleted };
      const rev = (ex?.rev ?? 0) + 1;
      this.docs.set(k, { rev, seq: ++this.seq, data: op.t === "d" ? null : (op.d as Doc), deleted: op.t === "d" });
      return { k, s: "ok", r: rev, q: this.seq };
    });
    return { epoch: "e1", results };
  }
  get(c: string, i: string) {
    return this.docs.get(`${c}/${i}`)?.data ?? undefined;
  }
}

/** Satu "perangkat": store array sederhana + mesin sinkron. */
function device(server: FakeServer, userId = "u1", role = "user") {
  const store = {
    profiles: [] as Doc[],
    transactions: [] as Doc[],
    missions: [] as Doc[],
    sub_wallets: [] as Doc[],
    grant_requests: [] as Doc[],
    monthly_closings: [] as Doc[],
    wishlist_items: [] as Doc[],
  };
  const arr = (name: keyof typeof store): CollectionAdapter => ({
    name,
    read: () => store[name].map((d) => [String(d.id), d] as [string, Doc]),
    apply: (ups, dels) => {
      store[name] = store[name].filter((d) => !dels.has(String(d.id))).map((d) => (ups.has(String(d.id)) ? (ups.get(String(d.id)) as Doc) : d));
      for (const [id, d] of ups) if (!store[name].some((x) => String(x.id) === id)) store[name].push(d);
    },
  });
  let saved: Persisted | null = null;
  let invalid = 0;
  const engine = new SyncEngine({
    adapters: [arr("profiles"), arr("transactions"), arr("missions"), arr("sub_wallets"), arr("grant_requests"), arr("monthly_closings"), arr("wishlist_items")],
    transport: { pull: (s) => server.pull(s), push: (o) => server.push(o) },
    io: { load: () => (saved ? (JSON.parse(JSON.stringify(saved)) as Persisted) : null), save: (p) => (saved = JSON.parse(JSON.stringify(p)) as Persisted) },
    onSessionInvalid: () => invalid++,
  });
  engine.init(userId, role);
  return { store, engine, invalidCount: () => invalid, snap: () => engine.getSnapshot() };
}

let pass = 0, fail = 0;
const t = async (name: string, f: () => Promise<void>) => {
  try { await f(); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  GAGAL", name, "\n   ", (e as Error).message.split("\n").slice(0, 6).join("\n    ")); }
};

const PROFILE = { id: "u1", username: "tiara", role: "user", pet_custom_name: "Mochi", monthly_budget_target: 1_500_000, points_balance: 500 };

console.log("CRUD → server");
await t("edit nama pet sampai ke database", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.profiles.push({ ...PROFILE }); await A.engine.syncNow();
  A.store.profiles = [{ ...PROFILE, pet_custom_name: "Kopi" }];
  A.engine.recount(); assert.equal(A.snap().pending, 1, "perubahan terdeteksi sebagai antrean");
  await A.engine.syncNow();
  assert.equal(s.get("profiles", "u1")?.pet_custom_name, "Kopi");
  assert.equal(A.snap().pending, 0); assert.equal(A.snap().phase, "idle");
});

await t("edit budget bulanan sampai ke database", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.profiles.push({ ...PROFILE }); await A.engine.syncNow();
  A.store.profiles = [{ ...PROFILE, monthly_budget_target: 2_000_000 }];
  await A.engine.syncNow();
  assert.equal(s.get("profiles", "u1")?.monthly_budget_target, 2_000_000);
});

await t("catat kas masuk & keluar → dokumen transaksi di database", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.profiles.push({ ...PROFILE }); await A.engine.syncNow();
  A.store.transactions.unshift({ id: "t1", user_id: "u1", type: "income", total_amount: 50_000, title: "Uang saku" });
  A.store.transactions.unshift({ id: "t2", user_id: "u1", type: "expense", total_amount: 12_000, title: "Jajan" });
  await A.engine.syncNow();
  assert.equal(s.get("transactions", "t1")?.total_amount, 50_000);
  assert.equal(s.get("transactions", "t2")?.type, "expense");
  assert.equal(A.snap().pending, 0);
});

await t("misi baru & hapus transaksi (batu nisan) ikut tersimpan", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.transactions.push({ id: "t9", user_id: "u1", total_amount: 1 }); await A.engine.syncNow();
  A.store.missions.push({ id: "m1", user_id: "u1", title: "Menabung" });
  A.store.transactions = [];
  await A.engine.syncNow();
  assert.equal(s.get("missions", "m1")?.title, "Menabung");
  assert.equal(s.docs.get("transactions/t9")?.deleted, true);
});

console.log("Kegagalan harus terlihat & antrean selamat");
await t("server 500 berulang → phase error, failStreak naik, antrean TIDAK hilang; pulih → terkirim", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.profiles.push({ ...PROFILE }); await A.engine.syncNow();
  s.mode = "http500";
  A.store.profiles = [{ ...PROFILE, pet_custom_name: "Kopi" }];
  for (let i = 0; i < 3; i++) await A.engine.syncNow();
  assert.equal(A.snap().phase, "error"); assert.equal(A.snap().failStreak, 3);
  assert.equal(A.snap().pending, 1, "perubahan masih antre");
  assert.notEqual(s.get("profiles", "u1")?.pet_custom_name, "Kopi");
  s.mode = "ok"; await A.engine.syncNow();
  assert.equal(s.get("profiles", "u1")?.pet_custom_name, "Kopi");
  assert.equal(A.snap().pending, 0); assert.equal(A.snap().failStreak, 0); assert.equal(A.snap().phase, "idle");
});

await t("offline → phase offline (bukan error), antrean tetap, terkirim saat online", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.profiles.push({ ...PROFILE }); await A.engine.syncNow();
  s.mode = "offline";
  A.store.transactions.push({ id: "t1", user_id: "u1", total_amount: 5 });
  await A.engine.syncNow();
  assert.equal(A.snap().phase, "offline"); assert.equal(A.snap().failStreak, 0); assert.equal(A.snap().pending, 1);
  s.mode = "ok"; await A.engine.syncNow();
  assert.equal(s.get("transactions", "t1")?.total_amount, 5); assert.equal(A.snap().pending, 0);
});

await t("antrean selamat setelah muat ulang halaman (keadaan tersimpan)", async () => {
  const s = new FakeServer(); const A = device(s);
  s.mode = "http500";
  A.store.transactions.push({ id: "t1", user_id: "u1", total_amount: 7 });
  await A.engine.syncNow();
  // "reload": mesin baru, store sama (localStorage), keadaan sinkron tersimpan
  s.mode = "ok";
  const B = device(s); B.store.transactions = A.store.transactions;
  await B.engine.syncNow();
  assert.equal(s.get("transactions", "t1")?.total_amount, 7);
});

await t("401 → phase auth + onSessionInvalid dipanggil (bukan diam)", async () => {
  const s = new FakeServer(); const A = device(s);
  s.mode = "unauthorized";
  A.store.transactions.push({ id: "t1", user_id: "u1", total_amount: 1 });
  await A.engine.syncNow();
  assert.equal(A.snap().phase, "auth"); assert.equal(A.invalidCount(), 1);
  assert.equal(A.snap().pending, 1, "data lokal tidak dihapus");
});

console.log("Pindah perangkat");
await t("perangkat baru menarik data terbaru dari server", async () => {
  const s = new FakeServer(); const A = device(s);
  A.store.profiles.push({ ...PROFILE, pet_custom_name: "Kopi" });
  A.store.transactions.push({ id: "t1", user_id: "u1", total_amount: 50_000 });
  await A.engine.syncNow();
  const B = device(s);
  await B.engine.syncNow();
  assert.equal(B.store.profiles[0]?.pet_custom_name, "Kopi");
  assert.equal(B.store.transactions[0]?.total_amount, 50_000);
});


console.log("V5.6 — pemasukan dua arah, hibah, dompet zero-sum & tutup buku");
const NOW = "2026-11-09T05:00:00.000Z";
const TODAY = "2026-11-09";
const asDoc = (x: unknown) => x as Doc;
const profile = { monthly_budget_target: 1_000_000, monthly_saving_target: 200_000 };
const ctxFor = (txs: Doc[], wallets: Doc[], closings: Doc[] = []) =>
  buildFinanceContext({ userId: "u1", today: TODAY, profile, txs: txs as unknown as FinTx[], wallets: wallets as unknown as SubWallet[], closings: closings as unknown as MonthlyClosing[] });

await t("pemasukan ganda dicegah: catatan anak + konfirmasi Supervisor tetap SATU pemasukan di server", async () => {
  const s = new FakeServer(); const kid = device(s, "u1", "user"); const sv = device(s, "sv", "supervisor");
  kid.store.transactions.push({ id: "inc-kid", user_id: "u1", type: "income", total_amount: 100_000, title: "Uang saku", transaction_date: TODAY, created_at: NOW, createdByRole: "child", verificationStatus: "pending_supervisor" });
  await kid.engine.syncNow(); await sv.engine.syncNow();
  assert.equal(sv.store.transactions.length, 1, "Supervisor melihat catatan anak");
  // Supervisor menjawab 'ya, sama': catatan anak ditandai terverifikasi, TIDAK ada transaksi baru.
  const child = sv.store.transactions[0] as unknown as FinTx;
  sv.store.transactions = [asDoc({ ...child, ...verifiedPatch(child, 100_000, "sv", NOW) })];
  await sv.engine.syncNow(); await kid.engine.syncNow();
  const incomes = [...s.docs.entries()].filter(([k, v]) => k.startsWith("transactions/") && !v.deleted && v.data?.type === "income");
  assert.equal(incomes.length, 1, "hanya satu pemasukan");
  assert.equal(s.get("transactions", "inc-kid")?.verificationStatus, "verified");
  assert.equal(kid.store.transactions[0]?.verificationStatus, "verified");
  const c = ctxFor(kid.store.transactions, []);
  assert.equal(c.totals.income, 100_000, "saldo tidak dihitung dobel");
});

await t("pemasukan Supervisor yang tak cocok dicatat terpisah dan terverifikasi; anak menerimanya", async () => {
  const s = new FakeServer(); const kid = device(s, "u1", "user"); const sv = device(s, "sv", "supervisor");
  const tx = buildSupervisorIncome({ id: "inc-sv", userId: "u1", supervisorId: "sv", amount: 250_000, title: "Uang saku", category: "Bonus Orang Tua / Abang", date: TODAY, nowIso: NOW });
  sv.store.transactions.push(asDoc(tx));
  await sv.engine.syncNow(); await kid.engine.syncNow();
  assert.equal(kid.store.transactions.length, 1);
  assert.equal(ctxFor(kid.store.transactions, []).totals.income, 250_000);
  assert.equal(s.get("transactions", "inc-sv")?.verificationStatus, "verified");
});

await t("konflik: anak mengubah catatan saat Supervisor memverifikasi → status 'verified' tidak hilang", async () => {
  const s = new FakeServer(); const kid = device(s, "u1", "user"); const sv = device(s, "sv", "supervisor");
  const base = { id: "inc-c", user_id: "u1", type: "income", total_amount: 100_000, title: "Uang saku", transaction_date: TODAY, created_at: NOW, createdByRole: "child", verificationStatus: "pending_supervisor" };
  kid.store.transactions.push({ ...base });
  await kid.engine.syncNow(); await sv.engine.syncNow();
  sv.store.transactions = [asDoc({ ...(sv.store.transactions[0] as unknown as FinTx), ...verifiedPatch(sv.store.transactions[0] as unknown as FinTx, 100_000, "sv", NOW) })];
  kid.store.transactions = [{ ...base, title: "Uang saku dari ayah" }];
  await sv.engine.syncNow();            // Supervisor lebih dulu
  await kid.engine.syncNow();           // anak konflik → digabung
  await sv.engine.syncNow(); await kid.engine.syncNow();
  assert.equal(s.get("transactions", "inc-c")?.verificationStatus, "verified");
  assert.equal(kid.store.transactions[0]?.verificationStatus, "verified");
});

await t("hibah: anggaran bulanan terisolasi — pengeluaran dari dompet hibah tidak menambah belanja pribadi", async () => {
  const s = new FakeServer(); const kid = device(s, "u1", "user"); const sv = device(s, "sv", "supervisor");
  const wallets = makeDefaultWallets("u1", "2026-11", 200_000, NOW);
  kid.store.sub_wallets.push(...wallets.map(asDoc));
  const g = buildGrantRequest({ id: "g1", userId: "u1", title: "Buku praktikum", category: "Pendidikan", items: [{ label: "Buku", amount: 100_000 }], note: "", nowIso: NOW });
  kid.store.grant_requests.push(asDoc(g));
  await kid.engine.syncNow(); await sv.engine.syncNow();
  const ap = approveGrant(sv.store.grant_requests[0] as unknown as GrantRequest, { approvedAmount: 100_000, note: "", byId: "sv", nowIso: NOW });
  assert.ok(ap.ok);
  if (!ap.ok) return;
  sv.store.grant_requests = [asDoc(ap.grant)];
  sv.store.sub_wallets.push(asDoc(ap.wallet));
  await sv.engine.syncNow(); await kid.engine.syncNow();
  assert.equal(kid.store.grant_requests[0]?.status, "disbursed");
  const gw = ap.wallet!;
  const spend = (id: string, walletId: string, amount: number): Doc => ({ id, user_id: "u1", type: "expense", category: "Buku & Alat Tulis", need_or_want: "need", title: "x", total_amount: amount, transaction_date: TODAY, created_at: NOW, walletId, ...(walletId === gw.id ? { linkedGrantId: "g1" } : {}) });
  const before = ctxFor([], kid.store.sub_wallets);
  const txs = [spend("e1", gw.id, 60_000)];
  const after = ctxFor(txs, kid.store.sub_wallets);
  assert.equal(after.totals.ownSpent, before.totals.ownSpent, "belanja pribadi tidak berubah");
  assert.equal(after.burnRatio, 0, "tidak menambah burn-rate");
  assert.equal(after.unallocated, before.unallocated, "uang bulanan yang belum dibagi tidak tersentuh");
  assert.equal(after.grantWallets[0]?.balance, 40_000, "saldo dompet hibah berkurang sendiri");
});

await t("hibah: status tidak pernah mundur (salinan 'pending' basi tidak menimpa 'disbursed'/'settled')", async () => {
  const s = new FakeServer(); const sv = device(s, "sv", "supervisor"); const kid = device(s, "u1", "user"); const stale = device(s, "u1", "user");
  const g = buildGrantRequest({ id: "g2", userId: "u1", title: "Seragam", category: "Pendidikan", items: [{ label: "Seragam", amount: 80_000 }], note: "", nowIso: NOW });
  kid.store.grant_requests.push(asDoc(g));
  await kid.engine.syncNow(); await stale.engine.syncNow(); await sv.engine.syncNow();
  const ap = approveGrant(g, { approvedAmount: 80_000, note: "", byId: "sv", nowIso: NOW });
  assert.ok(ap.ok); if (!ap.ok) return;
  sv.store.grant_requests = [asDoc(ap.grant)]; await sv.engine.syncNow();
  await kid.engine.syncNow();
  const st = settleGrant(kid.store.grant_requests[0] as unknown as GrantRequest, { spent: 80_000, receiptPhoto: "data:image/webp;base64,AAA", nowIso: NOW });
  assert.ok(st.ok); if (!st.ok) return;
  kid.store.grant_requests = [asDoc(st.grant)]; await kid.engine.syncNow();
  assert.equal(s.get("grant_requests", "g2")?.status, "settled");
  // perangkat basi masih memegang 'pending' dan mengubah catatan → tidak boleh menurunkan status
  stale.store.grant_requests = [asDoc({ ...g, note: "revisi basi" })];
  for (let i = 0; i < 3; i++) await stale.engine.syncNow();
  assert.equal(s.get("grant_requests", "g2")?.status, "settled");
  assert.equal(stale.store.grant_requests[0]?.status, "settled");
});

await t("sub-dompet zero-sum: alokasi + geser saldo tersinkron, total tidak bocor", async () => {
  const s = new FakeServer(); const A = device(s, "u1", "user"); const B = device(s, "u1", "user");
  let wallets = makeDefaultWallets("u1", "2026-11", 200_000, NOW);
  const monthly = 1_000_000;
  const base = { monthlyCash: monthly, mandatorySavingsTarget: 200_000, cycleKey: "2026-11", nowIso: NOW };
  for (const [key, amt] of [["food", 400_000], ["transport", 100_000], ["bills", 200_000], ["emergency", 50_000], ["fun", 50_000]] as const) {
    const r = allocateToWallet(wallets, walletIdFor("u1", key), amt, base);
    assert.ok(r.ok, `alokasi ${key}`); if (r.ok) wallets = r.wallets;
  }
  // melebihi sisa uang bebas harus ditolak
  assert.equal(allocateToWallet(wallets, walletIdFor("u1", "fun"), 1, base).ok, false);
  A.store.sub_wallets.push(...wallets.map(asDoc));
  await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal(B.store.sub_wallets.length, wallets.length);
  const sum = (ws: Doc[]) => ws.filter((w) => w.type !== "savings").reduce((n, w) => n + Number(w.allocated), 0);
  const totalBefore = sum(B.store.sub_wallets);
  const tr = transferBetween({ wallets: B.store.sub_wallets as unknown as SubWallet[], fromId: walletIdFor("u1", "fun"), toId: walletIdFor("u1", "food"), amount: 30_000, reason: "uang jajan habis", fromBalance: 50_000, today: TODAY, nowIso: NOW });
  assert.ok(tr.ok); if (!tr.ok) return;
  B.store.sub_wallets = tr.wallets.map(asDoc);
  await B.engine.syncNow(); await A.engine.syncNow();
  assert.equal(sum(A.store.sub_wallets), totalBefore, "geser saldo tidak mengubah total");
  assert.equal(A.store.sub_wallets.find((w) => w.key === "food")?.allocated, 430_000);
  assert.equal(ctxFor([], A.store.sub_wallets).unallocated, monthly - 200_000 - totalBefore);
});

await t("tutup buku: dua perangkat menutup siklus yang sama → hanya SATU catatan (yang lebih dulu menang)", async () => {
  const s = new FakeServer(); const A = device(s, "u1", "user"); const B = device(s, "u1", "user");
  const figures = computeClosingFigures({ monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, ownSpent: 500_000, savedInCycle: 200_000 });
  const split = splitSurplus("split_choice", figures.surplus, 100_000);
  const mk = (at: string, by: string) => buildClosing({ userId: "u1", cycleKey: "2026-10", policy: "split_choice", monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, figures, ownSpent: 500_000, split, byId: by, nowIso: at });
  A.store.monthly_closings.push(asDoc(mk("2026-11-01T08:00:00.000Z", "A")));
  B.store.monthly_closings.push(asDoc(mk("2026-11-01T09:00:00.000Z", "B")));
  await A.engine.syncNow(); await B.engine.syncNow();
  for (let i = 0; i < 2; i++) { await A.engine.syncNow(); await B.engine.syncNow(); }
  const closings = [...s.docs.entries()].filter(([k, v]) => k.startsWith("monthly_closings/") && !v.deleted);
  assert.equal(closings.length, 1, "id deterministik per siklus");
  assert.equal(s.get("monthly_closings", closings[0][0].split("/")[1])?.closedBy, "A");
  assert.equal(A.store.monthly_closings[0]?.closedBy, "A"); assert.equal(B.store.monthly_closings[0]?.closedBy, "A");
  // sisa uang dibawa ke siklus berikutnya mengikuti catatan yang sama di kedua perangkat
  const nov = (d: Doc[]) => buildFinanceContext({ userId: "u1", today: "2026-11-09", profile, txs: [], wallets: [], closings: d as unknown as MonthlyClosing[] }).carriedOver;
  assert.equal(nov(A.store.monthly_closings), nov(B.store.monthly_closings));
  assert.equal(nov(A.store.monthly_closings), split.rolledOverAmount);
});

await t("daftar tunggu: keputusan final menang atas 'cooling' basi", async () => {
  const s = new FakeServer(); const A = device(s, "u1", "user"); const B = device(s, "u1", "user");
  const w = { id: "w1", userId: "u1", title: "Sepatu", amount: 400_000, category: "Fashion", need_or_want: "want", createdAt: NOW, coolUntil: "2026-11-11T05:00:00.000Z", status: "cooling", updatedAt: NOW };
  A.store.wishlist_items.push({ ...w }); await A.engine.syncNow(); await B.engine.syncNow();
  A.store.wishlist_items = [{ ...w, status: "cancelled", resolvedAt: "2026-11-11T06:00:00.000Z", cancelledAfterCooling: true, updatedAt: "2026-11-11T06:00:00.000Z" }];
  B.store.wishlist_items = [{ ...w, title: "Sepatu lari", updatedAt: "2026-11-11T07:00:00.000Z" }];
  await A.engine.syncNow(); await B.engine.syncNow(); await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal(s.get("wishlist_items", "w1")?.status, "cancelled");
  assert.equal(B.store.wishlist_items[0]?.status, "cancelled");
});

console.log(`\n${pass} lulus, ${fail} gagal`);
if (fail) process.exit(1);

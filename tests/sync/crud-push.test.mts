// Uji alur CRUD → antrean → server: perubahan di store HARUS sampai ke "database" (server tiruan), dan
// kegagalan HARUS terlihat (bukan diam-diam). Tanpa jaringan/Postgres.
// Jalankan: npx tsx tests/sync/crud-push.test.mts
import assert from "node:assert/strict";
import { SyncEngine, SyncHttpError, type CollectionAdapter, type Persisted, type PullResponse, type PushResponse, type WireOp, type WireResult } from "../../src/lib/sync/engine.ts";
import type { Doc } from "../../src/lib/sync/canon.ts";

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
  const store = { profiles: [] as Doc[], transactions: [] as Doc[], missions: [] as Doc[] };
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
    adapters: [arr("profiles"), arr("transactions"), arr("missions")],
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

console.log(`\n${pass} lulus, ${fail} gagal`);
if (fail) process.exit(1);

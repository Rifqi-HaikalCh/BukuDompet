// Uji mesin sinkron klien terhadap fungsi database sungguhan (tanpa jaringan).
// Jalankan: BD_TEST_PG=postgres://postgres:bdtest@localhost:5432/bdtest npx tsx tests/sync/engine.test.ts
import pg from "pg";
import assert from "node:assert/strict";
import { SyncEngine, SyncHttpError, type CollectionAdapter, type Persisted, type PullResponse, type PushResponse, type WireOp } from "../../src/lib/sync/engine.ts";
import type { Doc } from "../../src/lib/sync/canon.ts";

const pool = new pg.Pool({ connectionString: process.env.BD_TEST_PG || "postgres://postgres:bdtest@localhost:5432/bdtest" });
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ADMIN = ID(1), SV = ID(2), TIARA = ID(6), EKAL = ID(8), SOFIA = ID(10);
const call = async (fn: string, ...a: unknown[]) => {
  try {
    return (await pool.query(`select public.${fn}(${a.map((_, i) => `$${i + 1}`).join(",")}) as r`, a.map((x) => (x !== null && typeof x === "object" ? JSON.stringify(x) : x)))).rows[0].r;
  } catch (e) {
    if (/SESSION_INVALID/.test((e as Error).message)) throw new SyncHttpError(401, "session_invalid");
    throw e;
  }
};

let pass = 0, fail = 0;
const t = async (name: string, f: () => Promise<void>) => {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  try { await f(); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  GAGAL", name, "\n   ", (e as Error).message.split("\n").slice(0, 6).join("\n    ")); }
};

const COLS: Array<[string, ((id: string, d: Doc) => string | null) | undefined, boolean?]> = [
  ["profiles", (id) => id],
  ["assignments", undefined],
  ["transactions", (_i, d) => String(d.user_id), false],
  ["stories", (_i, d) => String(d.userId), true],
  ["feed_posts", undefined],
  ["kv", undefined],
  // Versi 5.6 (migrasi 006): aturan tulis sama seperti schema.ts
  ["budget_configs", (_i, d) => String(d.userId)],
  ["sub_wallets", (_i, d) => String(d.userId)],
  ["grant_requests", (_i, d) => String(d.userId)],
  ["monthly_closings", (_i, d) => String(d.userId)],
  ["vault_loans", (_i, d) => String(d.userId)],
  ["wishlist_items", (_i, d) => String(d.userId), true],
];

function device(actor: string, role: string, ver = 1, seedIds: string[] = []) {
  const cols: Record<string, Map<string, Doc>> = Object.fromEntries(COLS.map(([n]) => [n, new Map<string, Doc>()]));
  const adapters: CollectionAdapter[] = COLS.map(([name, ownerOf, ownerOnly]) => ({
    name,
    read: () => [...cols[name].entries()],
    apply: (u, d) => { for (const [i, v] of u) cols[name].set(i, v); for (const i of d) cols[name].delete(i); },
    ownerOf, ownerOnly,
    ...(name === "assignments"
      ? {
          isSeed: (id: string) => seedIds.includes(id),
          // sama seperti schema.ts: penugasan hanya diunggah admin (atau bila sudah ada di server)
          shouldPush: (_i: string, _d: Doc, has: boolean, me: { role: string }) => has || me.role === "admin",
        }
      : {}),
  }));
  const dev = { online: true, saved: null as Persisted | null, invalid: 0, pushes: 0, cols, engine: null as unknown as SyncEngine, ver, actor, role, adapters };
  const mk = () => new SyncEngine({
    adapters,
    transport: {
      async pull(since): Promise<PullResponse> { if (!dev.online) throw new TypeError("offline"); return call("app_sync_pull", actor, dev.ver, since, 1500000); },
      async push(ops: WireOp[]): Promise<PushResponse> { if (!dev.online) throw new TypeError("offline"); dev.pushes += ops.length; return call("app_sync_push", actor, dev.ver, ops); },
    },
    io: { load: () => (dev.saved ? JSON.parse(JSON.stringify(dev.saved)) : null), save: (p) => { dev.saved = JSON.parse(JSON.stringify(p)); } },
    onSessionInvalid: () => { dev.invalid++; },
  });
  dev.engine = mk();
  dev.engine.init(actor, role);
  /** simulasi tutup-buka aplikasi: mesin baru, data lokal & keadaan tersimpan sama */
  (dev as { reload: () => void }).reload = () => { dev.engine = mk(); dev.engine.init(actor, role); };
  return dev as typeof dev & { reload: () => void };
}
const txd = (id: string, user: string, extra: Doc = {}): Doc => ({ id, user_id: user, title: "t", total_amount: 1000, created_at: "2026-11-08T10:00:00Z", ...extra });
const prof = (id: string, extra: Doc = {}): Doc => ({ id, username: "tiara", role: "user", points_balance: 500, lifetime_points: 500, xp: 0, level: 1, ownedAccessories: [], ...extra });

async function reset() {
  await pool.query("delete from sync_docs where collection <> 'assignments'");
  await pool.query("update profiles set session_ver=1, is_active=true where id::text like '00000000-%'");
}

await reset();

console.log("Dasar");
await t("catatan baru di A sampai ke database lalu ke perangkat B", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  A.cols.transactions.set("m1", txd("m1", TIARA));
  A.engine.recount(); assert.equal(A.engine.getSnapshot().pending, 1);
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().pending, 0); assert.equal(A.engine.getSnapshot().phase, "idle");
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id='m1' and not deleted")).rows[0].c, 1);
  await B.engine.syncNow();
  assert.deepEqual(B.cols.transactions.get("m1"), txd("m1", TIARA));
});
await t("ubah & hapus menyebar; tidak ada kiriman ulang bila tak berubah", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  await A.engine.syncNow(); await B.engine.syncNow();
  A.cols.transactions.set("m1", txd("m1", TIARA, { title: "diubah" }));
  await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal(B.cols.transactions.get("m1")!.title, "diubah");
  const before = A.pushes; await A.engine.syncNow(); assert.equal(A.pushes, before, "tidak boleh ada kiriman ulang");
  A.cols.transactions.delete("m1");
  await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal(B.cols.transactions.has("m1"), false);
});
await t("offline: perubahan menunggu, lalu terkirim saat online; tahan reload", async () => {
  const A = device(TIARA, "user");
  A.online = false;
  A.cols.transactions.set("o1", txd("o1", TIARA));
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().phase, "offline"); assert.equal(A.engine.getSnapshot().pending, 1);
  A.reload(); A.engine.recount();
  assert.equal(A.engine.getSnapshot().pending, 1, "antrean selamat setelah reload");
  A.online = true; await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().pending, 0);
  A.reload(); A.engine.recount(); const p = A.pushes; await A.engine.syncNow(); assert.equal(A.pushes, p);
});
await t("flush mengosongkan antrean (jalur keluar akun) dan melapor offline bila gagal", async () => {
  const A = device(TIARA, "user");
  A.cols.transactions.set("f1", txd("f1", TIARA));
  const r = await A.engine.flush(); assert.equal(r.ok, true); assert.equal(r.unsaved, 0);
  A.cols.transactions.set("f2", txd("f2", TIARA)); A.online = false;
  const r2 = await A.engine.flush(); assert.equal(r2.ok, false); assert.equal(r2.unsaved, 1); assert.equal(r2.offline, true);
});

console.log("Konflik");
await t("dua perangkat mengubah dokumen yang sama: konvergen, tidak ada yang hilang diam-diam", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  A.cols.stories.set("s1", { id: "s1", userId: TIARA, title: "a", body: "x", extra: 1 });
  await A.engine.syncNow(); await B.engine.syncNow();
  A.cols.stories.set("s1", { id: "s1", userId: TIARA, title: "dari A", body: "x", extra: 1 });
  B.cols.stories.set("s1", { id: "s1", userId: TIARA, title: "a", body: "dari B", extra: 1 });
  await A.engine.syncNow(); await B.engine.syncNow(); await A.engine.syncNow();
  assert.deepEqual(A.cols.stories.get("s1"), B.cols.stories.get("s1"), "harus konvergen");
});
await pool.query("delete from sync_docs where collection='profiles'");
await t("poin profil: dua perangkat sama-sama +50 → +100 (digabung sebagai selisih)", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  A.cols.profiles.set(TIARA, prof(TIARA));
  await A.engine.syncNow(); await B.engine.syncNow();
  A.cols.profiles.set(TIARA, prof(TIARA, { points_balance: 550, lifetime_points: 550, xp: 20 }));
  B.cols.profiles.set(TIARA, prof(TIARA, { points_balance: 550, lifetime_points: 550, xp: 30 }));
  await A.engine.syncNow(); await B.engine.syncNow(); await A.engine.syncNow();
  const a = A.cols.profiles.get(TIARA)!, b = B.cols.profiles.get(TIARA)!;
  assert.equal(a.points_balance, 600); assert.equal(a.lifetime_points, 600); assert.equal(a.xp, 50);
  assert.deepEqual(a, b);
});
await t("hapus di A vs ubah di B: pengguna yang menghapus menang tanpa macet", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  A.cols.stories.set("s9", { id: "s9", userId: TIARA, title: "x" });
  await A.engine.syncNow(); await B.engine.syncNow();
  B.cols.stories.set("s9", { id: "s9", userId: TIARA, title: "ubah" });
  await B.engine.syncNow();
  A.cols.stories.delete("s9");
  await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal(A.cols.stories.has("s9"), false); assert.equal(B.cols.stories.has("s9"), false);
  assert.equal(A.engine.getSnapshot().pending, 0);
});
await t("feed: like dari dua perangkat digabung (tidak saling menimpa)", async () => {
  const A = device(TIARA, "user"), B = device(EKAL, "user");
  A.cols.feed_posts.set("p1", { id: "p1", authorId: TIARA, text: "hai", likes: [], comments: [], gifts: [] });
  await A.engine.syncNow(); await B.engine.syncNow();
  A.cols.feed_posts.set("p1", { ...A.cols.feed_posts.get("p1")!, likes: [TIARA] });
  B.cols.feed_posts.set("p1", { ...B.cols.feed_posts.get("p1")!, likes: [EKAL] });
  await A.engine.syncNow(); await B.engine.syncNow(); await A.engine.syncNow();
  assert.deepEqual([...(A.cols.feed_posts.get("p1")!.likes as string[])].sort(), [EKAL, TIARA].sort());
  assert.deepEqual(A.cols.feed_posts.get("p1"), B.cols.feed_posts.get("p1"));
});

console.log("Hak akses & keselamatan");
await t("penugasan bawaan di perangkat akun biasa tidak diunggah, tidak ditolak, tidak dihitung 'akun lain'", async () => {
  const sid = `${ID(3)}:${ID(7)}`;
  await pool.query("delete from sync_docs where collection='assignments' and id=$1", [sid]);
  const A = device(TIARA, "user", 1, [sid]);
  A.cols.assignments.set(sid, { supervisorId: ID(3), userId: ID(7) });
  await A.engine.syncNow();
  const s = A.engine.getSnapshot();
  assert.equal(s.blocked, 0, "tidak ada op ditolak"); assert.equal(s.foreign, 0, "bukan data akun lain"); assert.equal(s.pending, 0);
  assert.equal(A.pushes, 0, "tidak ada yang dikirim");
});
await t("data akun lain yang tertinggal di perangkat tidak diunggah (foreign), tidak memblokir", async () => {
  const A = device(TIARA, "user");
  A.cols.transactions.set("x1", txd("x1", EKAL)); A.cols.transactions.set("x2", txd("x2", TIARA));
  await A.engine.syncNow();
  const s = A.engine.getSnapshot(); assert.equal(s.foreign, 1); assert.equal(s.pending, 1 - 1 + 0); assert.equal(s.blocked, 0);
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id='x1'")).rows[0].c, 0);
});
await t("Admin mengunggah data lama semua orang (migrasi)", async () => {
  const D = device(ADMIN, "admin");
  D.cols.transactions.set("x1", txd("x1", EKAL));
  D.cols.transactions.set("x3", txd("x3", SOFIA));
  await D.engine.syncNow();
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id in ('x1','x3') and not deleted")).rows[0].c, 2);
});
await t("Supervisor mengubah cerita anak (ditolak server) → dikembalikan ke versi server", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  kid.cols.stories.set("sk", { id: "sk", userId: TIARA, title: "asli" });
  await kid.engine.syncNow(); await sv.engine.syncNow();
  assert.equal(sv.cols.stories.get("sk")!.title, "asli");
  sv.cols.stories.set("sk", { id: "sk", userId: TIARA, title: "dirusak" });
  await sv.engine.syncNow();
  assert.equal(sv.cols.stories.get("sk")!.title, "asli");
  assert.equal(sv.engine.getSnapshot().pending, 0); assert.equal(sv.engine.getSnapshot().blocked, 0);
});
await t("Supervisor menambah transaksi pemasukan anak (persetujuan pencairan) diterima", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  await kid.engine.syncNow(); await sv.engine.syncNow();
  sv.cols.transactions.set("cash1", txd("cash1", TIARA, { type: "income" }));
  await sv.engine.syncNow(); await kid.engine.syncNow();
  assert.ok(kid.cols.transactions.has("cash1"));
});
await t("dokumen ditolak 'invalid' ditandai blocked, tidak dikirim ulang terus-menerus, dan pulih saat diperbaiki", async () => {
  const A = device(TIARA, "user");
  A.cols.stories.set("huge", { id: "huge", userId: TIARA, body: "y".repeat(1_600_000) });
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().blocked, 1);
  const n = A.pushes; await A.engine.syncNow(); assert.equal(A.pushes, n, "tidak diulang");
  A.cols.stories.set("huge", { id: "huge", userId: TIARA, body: "kecil" });
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().blocked, 0); assert.equal(A.engine.getSnapshot().pending, 0);
});
await pool.query("delete from sync_docs where collection='profiles'");
await t("perangkat baru dengan profil bawaan (500) bertemu profil server (600): server menang, tak ada poin hilang/ganda", async () => {
  const first = device(TIARA, "user");
  first.cols.profiles.set(TIARA, prof(TIARA, { points_balance: 600, lifetime_points: 640, xp: 50, ownedAccessories: ["topi"] }));
  await first.engine.syncNow();
  const fresh = device(TIARA, "user");
  fresh.cols.profiles.set(TIARA, prof(TIARA)); // salinan bawaan hasil seed
  await fresh.engine.syncNow();
  const p = fresh.cols.profiles.get(TIARA)!;
  assert.equal(p.points_balance, 600); assert.equal(p.lifetime_points, 640); assert.deepEqual(p.ownedAccessories, ["topi"]);
  assert.equal(fresh.engine.getSnapshot().pending, 0);
  const row = (await pool.query("select data->>'points_balance' pb from sync_docs where collection='profiles' and id=$1", [TIARA])).rows[0];
  assert.equal(row.pb, "600");
});
await pool.query("delete from sync_docs where collection='profiles'");
await t("respons kiriman hilang lalu dikirim ulang: poin tidak terhitung dua kali", async () => {
  const A = device(TIARA, "user");
  A.cols.profiles.set(TIARA, prof(TIARA));
  await A.engine.syncNow();
  A.cols.profiles.set(TIARA, prof(TIARA, { points_balance: 560, lifetime_points: 560 }));
  // simulasi: server menerima tetapi respons hilang
  const real = A.engine["deps"].transport.push;
  A.engine["deps"].transport.push = async (ops) => { await real(ops); throw new TypeError("respons hilang"); };
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().phase, "offline");
  A.engine["deps"].transport.push = real;
  await A.engine.syncNow();
  assert.equal(A.cols.profiles.get(TIARA)!.points_balance, 560);
  assert.equal(A.engine.getSnapshot().pending, 0);
});
await t("penghapusan massal ditahan; 'izinkan' mengirimnya; 'pulihkan' mengembalikan dari server", async () => {
  const A = device(TIARA, "user");
  for (let i = 0; i < 12; i++) A.cols.stories.set("bulk" + i, { id: "bulk" + i, userId: TIARA, title: "b" });
  await A.engine.syncNow();
  const keep = new Map(A.cols.stories);
  A.cols.stories.clear();
  await A.engine.syncNow();
  assert.ok(A.engine.getSnapshot().held >= 12, "ditahan");
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id like 'bulk%' and not deleted")).rows[0].c, 12, "server aman");
  await A.engine.restoreFromServer();
  assert.ok([...keep.keys()].every((k) => A.cols.stories.has(k)), "pulih");
  A.cols.stories.clear();
  await A.engine.syncNow(); assert.ok(A.engine.getSnapshot().held >= 12);
  await A.engine.allowHeldDeletes();
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id like 'bulk%' and not deleted")).rows[0].c, 0);
});
await t("siklus reset mingguan feed (kv berubah) tidak dianggap penghapusan massal berbahaya", async () => {
  const A = device(TIARA, "user");
  for (let i = 0; i < 10; i++) A.cols.feed_posts.set("fp" + i, { id: "fp" + i, authorId: TIARA, text: "x", likes: [], comments: [], gifts: [] });
  A.cols.kv.set("feedCycleStartDate", { v: "2026-11-01" });
  await A.engine.syncNow();
  A.cols.feed_posts.clear(); A.cols.kv.set("feedCycleStartDate", { v: "2026-11-08" });
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().held, 0);
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id like 'fp%' and not deleted")).rows[0].c, 0);
});
await t("penugasan bawaan yang sudah dicabut Admin tidak dihidupkan lagi oleh perangkat baru", async () => {
  const admin = device(ADMIN, "admin");
  const key = `${ID(3)}:${ID(7)}`;
  admin.cols.assignments.set(key, { supervisorId: ID(3), userId: ID(7) });
  await admin.engine.syncNow();
  admin.cols.assignments.delete(key);
  await admin.engine.syncNow();
  const fresh = device(ID(7), "user", 1, [key]);
  fresh.cols.assignments.set(key, { supervisorId: ID(3), userId: ID(7) }); // salinan bawaan di perangkat baru
  await fresh.engine.syncNow();
  assert.equal(fresh.cols.assignments.has(key), false, "seed kalah oleh penghapusan");
  const row = (await pool.query("select deleted from sync_docs where collection='assignments' and id=$1", [key])).rows[0];
  assert.equal(row.deleted, true);
});
await t("Admin menugaskan ulang id yang pernah dihapus (perangkat belum pernah melihat penghapusannya): berhasil", async () => {
  const admin = device(ADMIN, "admin");
  const key = `${ID(3)}:${ID(7)}`;
  admin.cols.assignments.set(key, { supervisorId: ID(3), userId: ID(7) });
  await admin.engine.syncNow();
  const row = (await pool.query("select deleted from sync_docs where collection='assignments' and id=$1", [key])).rows[0];
  assert.equal(row.deleted, false);
  admin.cols.assignments.delete(key); await admin.engine.syncNow();
});
await t("kehilangan akses (penugasan dicabut): salinan lokal yang tak diubah dibuang", async () => {
  const kid = device(SOFIA, "user"), sv = device(ID(3), "supervisor"), admin = device(ADMIN, "admin");
  // ID(3) = ayah_sv: tugaskan ke Sofia, lalu cabut
  kid.cols.stories.set("sf1", { id: "sf1", userId: SOFIA, title: "rahasia" });
  await kid.engine.syncNow();
  admin.cols.assignments.set(`${ID(3)}:${SOFIA}`, { supervisorId: ID(3), userId: SOFIA });
  await admin.engine.syncNow(); await sv.engine.syncNow();
  assert.ok(sv.cols.stories.has("sf1"), "terlihat saat ditugaskan");
  admin.cols.assignments.delete(`${ID(3)}:${SOFIA}`);
  await admin.engine.syncNow(); await sv.engine.syncNow();
  assert.equal(sv.cols.stories.has("sf1"), false, "hilang setelah dicabut");
});

console.log("Versi 5.6 — pemasukan dua arah, hibah, dompet & tutup buku (database sungguhan)");
const serverDoc = async (collection: string, id: string) =>
  (await pool.query("select data, deleted from sync_docs where collection=$1 and id=$2", [collection, id])).rows[0] as { data: Doc; deleted: boolean } | undefined;
const incomeBase = (id: string, extra: Doc = {}): Doc => txd(id, TIARA, { type: "income", total_amount: 100000, transaction_date: "2026-11-09", ...extra });

await t("pemasukan dua arah: anak mencatat, Supervisor memverifikasi catatan yang SAMA → satu pemasukan", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  kid.cols.transactions.set("v56-in1", incomeBase("v56-in1", { createdByRole: "child", verificationStatus: "pending_supervisor" }));
  await kid.engine.syncNow(); await sv.engine.syncNow();
  assert.ok(sv.cols.transactions.has("v56-in1"));
  sv.cols.transactions.set("v56-in1", { ...sv.cols.transactions.get("v56-in1")!, verificationStatus: "verified", verifiedBy: SV, verifiedAt: "2026-11-09T06:00:00Z" });
  await sv.engine.syncNow(); await kid.engine.syncNow();
  assert.equal(kid.cols.transactions.get("v56-in1")!.verificationStatus, "verified");
  assert.equal((await pool.query("select count(*)::int c from sync_docs where collection='transactions' and id like 'v56-in%' and not deleted and data->>'type'='income'")).rows[0].c, 1);
});
await t("anak tidak bisa memverifikasi pemasukannya sendiri atau memalsukan catatan Supervisor (ditolak trigger)", async () => {
  const kid = device(TIARA, "user");
  kid.cols.transactions.set("v56-fake1", incomeBase("v56-fake1", { createdByRole: "child", verificationStatus: "verified" }));
  kid.cols.transactions.set("v56-fake2", incomeBase("v56-fake2", { createdByRole: "supervisor", verificationStatus: "verified" }));
  await kid.engine.syncNow();
  assert.equal((await serverDoc("transactions", "v56-fake1"))?.deleted ?? true, true, "verifikasi sendiri ditolak");
  assert.equal((await serverDoc("transactions", "v56-fake2"))?.deleted ?? true, true, "catatan palsu Supervisor ditolak");
});
await t("pemasukan terverifikasi dikunci: anak tidak bisa mengubah nominalnya", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  sv.cols.transactions.set("v56-lock", incomeBase("v56-lock", { createdByRole: "supervisor", verificationStatus: "verified", createdBy: SV }));
  await sv.engine.syncNow(); await kid.engine.syncNow();
  kid.cols.transactions.set("v56-lock", { ...kid.cols.transactions.get("v56-lock")!, total_amount: 900000 });
  await kid.engine.syncNow();
  assert.equal((await serverDoc("transactions", "v56-lock"))?.data.total_amount, 100000);
});
await t("anggaran hanya diatur Supervisor: push anak ke budget_configs ditolak, Supervisor diterima", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  const cfg = (extra: Doc = {}): Doc => ({ id: `bc-${TIARA}`, userId: TIARA, monthlyBudget: 1000000, mandatorySavingsTarget: 200000, cycleStartDay: 1, rolloverPolicy: "split_choice", updatedAt: "2026-11-09T05:00:00Z", ...extra });
  kid.cols.budget_configs.set(`bc-${TIARA}`, cfg({ monthlyBudget: 9000000 }));
  await kid.engine.syncNow();
  assert.equal((await serverDoc("budget_configs", `bc-${TIARA}`))?.deleted ?? true, true, "anak ditolak");
  sv.cols.budget_configs.set(`bc-${TIARA}`, cfg());
  await sv.engine.syncNow();
  assert.equal((await serverDoc("budget_configs", `bc-${TIARA}`))?.data.monthlyBudget, 1000000);
});
await t("dompet (V5.6.1, migrasi 007): Supervisor tidak bisa mengubah dompet biasa anak, tetapi bisa mencairkan dompet hibah", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  const w = (key: string, type: string, allocated: number, extra: Doc = {}): Doc => ({ id: `sw-${TIARA}-${key}`, userId: TIARA, key, name: key, type, allocated, cycleKey: "2026-11", categories: [], openedVia: "manual", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-09T05:00:00Z", ...extra });
  kid.cols.sub_wallets.set(`sw-${TIARA}-v561`, w("v561", "operational", 100000));
  await kid.engine.syncNow(); await sv.engine.syncNow();
  assert.equal((await serverDoc("sub_wallets", `sw-${TIARA}-v561`))?.data.openedVia, "manual", "anak membuka dompet");
  sv.cols.sub_wallets.set(`sw-${TIARA}-v561`, w("v561", "operational", 999999, { updatedAt: "2026-11-09T06:00:00Z" }));
  await sv.engine.syncNow();
  assert.equal((await serverDoc("sub_wallets", `sw-${TIARA}-v561`))?.data.allocated, 100000, "Supervisor ditolak mengubah dompet biasa");
  sv.cols.sub_wallets.set(`sw-${TIARA}-grant-v561`, w("grant-v561", "grant", 80000, { linkedGrantId: "v561" }));
  await sv.engine.syncNow();
  assert.equal((await serverDoc("sub_wallets", `sw-${TIARA}-grant-v561`))?.data.type, "grant", "dompet hibah boleh dicairkan Supervisor");
});
await t("hibah: anak mengajukan, hanya Supervisor yang memutuskan; status tidak mundur", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  const g: Doc = { id: "v56-g1", userId: TIARA, title: "Buku", category: "Pendidikan", items: [{ label: "Buku", amount: 100000 }], requestedAmount: 100000, note: "", status: "pending", createdAt: "2026-11-09T05:00:00Z", updatedAt: "2026-11-09T05:00:00Z" };
  kid.cols.grant_requests.set("v56-g1", g);
  await kid.engine.syncNow(); await sv.engine.syncNow();
  assert.ok(sv.cols.grant_requests.has("v56-g1"));
  // anak mencoba menyetujui sendiri → ditolak server, kembali 'pending'
  kid.cols.grant_requests.set("v56-g1", { ...g, status: "disbursed", approvedAmount: 100000, updatedAt: "2026-11-09T05:30:00Z" });
  await kid.engine.syncNow();
  assert.equal((await serverDoc("grant_requests", "v56-g1"))?.data.status, "pending");
  sv.cols.grant_requests.set("v56-g1", { ...g, status: "disbursed", approvedAmount: 80000, supervisorNote: "disesuaikan", walletId: `sw-${TIARA}-grant-v56-g1`, updatedAt: "2026-11-09T06:00:00Z" });
  await sv.engine.syncNow(); await kid.engine.syncNow();
  assert.equal(kid.cols.grant_requests.get("v56-g1")!.status, "disbursed");
  assert.equal(kid.cols.grant_requests.get("v56-g1")!.approvedAmount, 80000);
});
await t("sub-dompet & tutup buku: tersinkron ke perangkat kedua; tutup buku ganda tidak membuat catatan kedua", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user"), sv = device(SV, "supervisor");
  const w = (key: string, allocated: number): Doc => ({ id: `sw-${TIARA}-${key}`, userId: TIARA, key, name: key, type: "operational", allocated, cycleKey: "2026-11", categories: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-09T05:00:00Z" });
  A.cols.sub_wallets.set(`sw-${TIARA}-food`, w("food", 400000));
  A.cols.sub_wallets.set(`sw-${TIARA}-fun`, w("fun", 50000));
  const closing = (by: string, at: string): Doc => ({ id: `mc-${TIARA}-2026-10`, userId: TIARA, cycleKey: "2026-10", policy: "split_choice", monthlyCash: 1000000, mandatorySavingsTarget: 200000, mandatorySecured: 200000, ownSpent: 500000, surplus: 300000, savedToVaultAmount: 100000, rolledOverAmount: 200000, bonusPoints: 40, closedAt: at, closedBy: by });
  A.cols.monthly_closings.set(`mc-${TIARA}-2026-10`, closing(TIARA, "2026-11-01T08:00:00Z"));
  await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal(B.cols.sub_wallets.size, 2);
  // Supervisor menutup siklus yang sama sedikit lebih lambat
  await sv.engine.syncNow();
  sv.cols.monthly_closings.set(`mc-${TIARA}-2026-10`, closing(SV, "2026-11-01T09:00:00Z"));
  await sv.engine.syncNow(); await A.engine.syncNow(); await B.engine.syncNow();
  assert.equal((await pool.query("select count(*)::int c from sync_docs where collection='monthly_closings' and id like $1 and not deleted", [`mc-${TIARA}-%`])).rows[0].c, 1);
  assert.equal(A.cols.monthly_closings.get(`mc-${TIARA}-2026-10`)!.closedBy, TIARA, "yang lebih dulu menang");
});
await t("daftar tunggu hanya milik pemilik: Supervisor tidak bisa menulis wishlist anak", async () => {
  const kid = device(TIARA, "user"), sv = device(SV, "supervisor");
  const w: Doc = { id: "v56-w1", userId: TIARA, title: "Sepatu", amount: 400000, category: "Fashion", need_or_want: "want", createdAt: "2026-11-09T05:00:00Z", coolUntil: "2026-11-11T05:00:00Z", status: "cooling", updatedAt: "2026-11-09T05:00:00Z" };
  kid.cols.wishlist_items.set("v56-w1", w);
  await kid.engine.syncNow(); await sv.engine.syncNow();
  sv.cols.wishlist_items.set("v56-w1", { ...w, status: "bought" });
  await sv.engine.syncNow();
  assert.equal((await serverDoc("wishlist_items", "v56-w1"))?.data.status, "cooling");
});

console.log("Ketahanan");
await t("database dikosongkan (epoch baru): data lokal diunggah ulang, tidak hilang", async () => {
  const A = device(TIARA, "user");
  A.cols.stories.set("e1", { id: "e1", userId: TIARA, title: "tetap ada" });
  await A.engine.syncNow();
  await pool.query("delete from sync_docs where collection <> 'assignments'");
  await pool.query("update sync_meta set value = gen_random_uuid()::text where key='epoch'");
  await A.engine.syncNow();
  assert.ok(A.cols.stories.has("e1"));
  assert.equal((await pool.query("select count(*)::int c from sync_docs where id='e1' and not deleted")).rows[0].c, 1);
});
await t("sesi dicabut (PIN diganti) → fase 'auth' + callback; data lokal tidak disentuh", async () => {
  const A = device(EKAL, "user");
  A.cols.stories.set("z1", { id: "z1", userId: EKAL, title: "lokal" });
  await pool.query("update profiles set session_ver = 7 where id=$1", [EKAL]);
  await A.engine.syncNow();
  assert.equal(A.engine.getSnapshot().phase, "auth"); assert.equal(A.invalid, 1);
  assert.ok(A.cols.stories.has("z1"));
  await pool.query("update profiles set session_ver = 1 where id=$1", [EKAL]);
});
await t("server 500 → fase 'error', antrean utuh; pulih saat server sehat", async () => {
  const A = device(TIARA, "user");
  const orig = A.engine["deps"].transport.push;
  A.engine["deps"].transport.push = async () => { throw new SyncHttpError(500, "server_error"); };
  A.cols.stories.set("er1", { id: "er1", userId: TIARA, title: "x" });
  await A.engine.syncNow(); assert.equal(A.engine.getSnapshot().phase, "error"); assert.equal(A.engine.getSnapshot().pending, 1);
  A.engine["deps"].transport.push = orig;
  await A.engine.syncNow(); assert.equal(A.engine.getSnapshot().pending, 0); assert.equal(A.engine.getSnapshot().phase, "idle");
});
await t("banyak dokumen (600) tersinkron lewat beberapa batch & halaman", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  for (let i = 0; i < 600; i++) A.cols.transactions.set("n" + i, txd("n" + i, TIARA));
  await A.engine.syncNow(); assert.equal(A.engine.getSnapshot().pending, 0);
  await B.engine.syncNow(); assert.equal([...B.cols.transactions.keys()].filter((k) => /^n\d+$/.test(k)).length, 600);
});
await t("pembaruan serentak dari dua perangkat pada banyak dokumen tidak menyisakan antrean", async () => {
  const A = device(TIARA, "user"), B = device(TIARA, "user");
  await A.engine.syncNow(); await B.engine.syncNow();
  for (let i = 0; i < 20; i++) {
    A.cols.transactions.set("n" + i, txd("n" + i, TIARA, { title: "A" + i }));
    B.cols.transactions.set("n" + i, txd("n" + i, TIARA, { title: "B" + i }));
  }
  await Promise.all([A.engine.syncNow(), B.engine.syncNow()]);
  for (let k = 0; k < 3; k++) { await A.engine.syncNow(); await B.engine.syncNow(); }
  assert.equal(A.engine.getSnapshot().pending, 0); assert.equal(B.engine.getSnapshot().pending, 0);
  for (let i = 0; i < 20; i++) assert.deepEqual(A.cols.transactions.get("n" + i), B.cols.transactions.get("n" + i));
});

console.log(`\n${pass} lulus, ${fail} gagal`);
await pool.end();
process.exit(fail ? 1 : 0);

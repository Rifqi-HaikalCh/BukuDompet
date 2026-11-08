// Uji fungsi database 005 di Postgres sungguhan.
// Jalankan: BD_TEST_PG=postgres://postgres@localhost:5432/bdtest node tests/sync/db.test.mjs
// (butuh `npm i --no-save pg`; basis data sudah dimigrasi 001-005)
import pg from "pg";
import assert from "node:assert/strict";

const pool = new pg.Pool({ connectionString: process.env.BD_TEST_PG || "postgres://postgres@localhost:5432/bdtest" });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const fn = async (name, ...args) => {
  const ph = args.map((_, i) => `$${i + 1}`).join(",");
  const rows = await q(`select public.${name}(${ph}) as r`, args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
  return rows[0].r;
};
let pass = 0;
const t = async (name, f) => { try { await f(); pass++; console.log("  ok  ", name); } catch (e) { console.log("  GAGAL", name, "\n", e.message); process.exitCode = 1; } };

const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ADMIN = ID(1), SV_BUNDA = ID(2), TIARA = ID(6), EKAL = ID(8), SOFIA = ID(10);

// bersihkan data sinkron + reset penguncian agar uji bisa diulang
await q("delete from sync_docs where collection <> 'assignments'");
await q("update profiles set failed_attempts=0, locked_until=null, session_ver=1, is_active=true where id::text like '00000000-%'");
await q("update profiles set pin_hash = extensions.crypt('1111', extensions.gen_salt('bf',4)) where id = $1", [TIARA]);

const push = (actor, ops, ver = 1) => fn("app_sync_push", actor, ver, ops);
const pull = (actor, since = 0, ver = 1, max = 1500000) => fn("app_sync_pull", actor, ver, since, max);
const tx = (id, user, extra = {}) => ({ c: "transactions", i: id, t: "u", b: 0, d: { id, user_id: user, title: "x", total_amount: 1000, ...extra } });

console.log("Akun & login");
await t("lookup 'ekal' -> 4 peran", async () => assert.equal((await fn("app_lookup", "Ekal")).length, 4));
await t("lookup 'Bunda' -> 2 akun", async () => assert.equal((await fn("app_lookup", " bunda ")).length, 2));
await t("lookup nama asing -> kosong", async () => assert.deepEqual(await fn("app_lookup", "zzz"), []));
await t("PIN salah ditolak + sisa percobaan", async () => {
  const r = await fn("app_login", TIARA, null, "9999");
  assert.equal(r.ok, false); assert.equal(r.reason, "invalid"); assert.equal(r.attempts_left, 5);
});
await t("PIN benar masuk (tanpa PIN di respons)", async () => {
  const r = await fn("app_login", TIARA, null, "1111");
  assert.equal(r.ok, true); assert.equal(r.role, "user"); assert.ok(!("pin_hash" in r) && !("pin_code" in r));
});
await t("login by username", async () => assert.equal((await fn("app_login", null, "tiara", "1111")).ok, true));
await t("PIN non-angka ditolak", async () => assert.equal((await fn("app_login", TIARA, null, "abcd")).ok, false));
await t("6x salah -> terkunci 10 menit, PIN benar pun ditolak", async () => {
  let r; for (let i = 0; i < 6; i++) r = await fn("app_login", TIARA, null, "0000");
  assert.equal(r.reason, "locked");
  const r2 = await fn("app_login", TIARA, null, "1111");
  assert.equal(r2.ok, false); assert.equal(r2.reason, "locked"); assert.ok(r2.retry_after > 0);
  await q("update profiles set locked_until=null, failed_attempts=0 where id=$1", [TIARA]);
});
await t("PIN teks biasa tidak tersisa", async () => assert.equal((await q("select count(*)::int c from profiles where pin_code<>''"))[0].c, 0));
await t("sesi tidak valid bila versi beda", async () => {
  await assert.rejects(() => pull(TIARA, 0, 99), /SESSION_INVALID/);
});

console.log("Sinkron: hak tulis");
await t("pemilik menulis transaksi sendiri", async () => {
  const r = await push(TIARA, [tx("t1", TIARA)]);
  assert.equal(r.results[0].s, "ok"); assert.equal(r.results[0].r, 1);
});
await t("user lain TIDAK boleh menulis transaksi orang lain", async () => {
  const r = await push(EKAL, [tx("t-evil", TIARA)]);
  assert.equal(r.results[0].s, "denied");
});
await t("supervisor yang ditugaskan BOLEH menulis transaksi anak (persetujuan pencairan), yang tidak ditugaskan tidak", async () => {
  assert.equal((await push(SV_BUNDA, [tx("t-sv", TIARA)])).results[0].s, "ok");
  assert.equal((await push(SV_BUNDA, [tx("t-sv2", SOFIA)])).results[0].s, "denied");
});
await t("Admin boleh menulis transaksi siapa pun", async () => {
  const r = await push(ADMIN, [tx("t-admin", TIARA)]);
  assert.equal(r.results[0].s, "ok");
});
await t("koleksi tak dikenal / pemilik kosong / id kosong -> invalid", async () => {
  const r = await push(TIARA, [{ c: "nope", i: "a", t: "u", b: 0, d: {} }, { c: "transactions", i: "z", t: "u", b: 0, d: { title: "tanpa user" } }, { c: "transactions", i: "", t: "u", b: 0, d: {} }]);
  assert.deepEqual(r.results.map((x) => x.s), ["invalid", "invalid", "invalid"]);
});
await t("pemilik berpindah ditolak", async () => {
  const r = await push(TIARA, [{ c: "transactions", i: "t1", t: "u", b: 1, d: { id: "t1", user_id: EKAL, title: "curi" } }]);
  assert.equal(r.results[0].s, "denied");
});
await t("assignments hanya Admin", async () => {
  const mk = (a) => push(a, [{ c: "assignments", i: `${SV_BUNDA}:${SOFIA}`, t: "u", b: 0, d: { supervisorId: SV_BUNDA, userId: SOFIA } }]);
  assert.equal((await mk(TIARA)).results[0].s, "denied");
});

console.log("Sinkron: profil");
const prof = (id, extra = {}) => ({ c: "profiles", i: id, t: "u", b: 0, d: { id, pet_custom_name: "Mochi", points_balance: 500, lifetime_points: 500, xp: 10, pin_code: "1111", role: "admin", username: "hacker", ...extra } });
await t("profil dibuat; PIN dibuang; identitas dipaksa dari tabel akun", async () => {
  const r = await push(TIARA, [prof(TIARA)]);
  assert.equal(r.results[0].s, "ok");
  const d = (await pull(TIARA)).docs.find((x) => x.c === "profiles" && x.i === TIARA).d;
  assert.ok(!("pin_code" in d)); assert.equal(d.role, "user"); assert.equal(d.username, "tiara");
});
await t("profil akun yang tidak ada ditolak", async () => {
  const r = await push(TIARA, [prof("11111111-1111-4111-8111-111111111111")]);
  assert.equal(r.results[0].s, "denied");
});
await t("id profil bukan UUID -> invalid", async () => assert.equal((await push(TIARA, [prof("tx-123")])).results[0].s, "invalid"));
await t("non-pemilik tidak boleh MENGURANGI poin profil orang lain", async () => {
  const r = await push(EKAL, [{ c: "profiles", i: TIARA, t: "u", b: 1, d: { id: TIARA, points_balance: 100, lifetime_points: 500, xp: 10 } }]);
  assert.equal(r.results[0].s, "denied"); assert.equal(r.results[0].m, "poin_tidak_boleh_dikurangi");
});
await t("non-pemilik BOLEH menambah poin (hadiah/transfer)", async () => {
  const r = await push(EKAL, [{ c: "profiles", i: TIARA, t: "u", b: 1, d: { id: TIARA, points_balance: 510, lifetime_points: 510, xp: 10 } }]);
  assert.equal(r.results[0].s, "ok");
});
await t("pemilik boleh mengurangi poinnya sendiri", async () => {
  const r = await push(TIARA, [{ c: "profiles", i: TIARA, t: "u", b: 2, d: { id: TIARA, points_balance: 300, lifetime_points: 510, xp: 10 } }]);
  assert.equal(r.results[0].s, "ok");
});
await t("hapus profil: hanya Admin", async () => {
  assert.equal((await push(TIARA, [{ c: "profiles", i: TIARA, t: "d", b: 3 }])).results[0].s, "denied");
});

console.log("Sinkron: visibilitas");
await push(EKAL, [tx("e1", EKAL)]);
await push(ADMIN, [tx("s1", SOFIA)]);
await t("user tidak melihat transaksi orang lain, tapi melihat profil & milik sendiri", async () => {
  const docs = (await pull(TIARA)).docs;
  assert.ok(docs.some((d) => d.c === "transactions" && d.i === "t1"));
  assert.ok(!docs.some((d) => d.c === "transactions" && d.i === "e1"));
  assert.ok(docs.some((d) => d.c === "profiles"));
});
await t("supervisor melihat anak yang ditugaskan (Tiara, Ekal) tapi tidak Sofia", async () => {
  const ids = (await pull(SV_BUNDA)).docs.filter((d) => d.c === "transactions").map((d) => d.i);
  assert.ok(ids.includes("t1") && ids.includes("e1")); assert.ok(!ids.includes("s1"));
});
await t("Admin melihat semuanya", async () => {
  const ids = (await pull(ADMIN)).docs.filter((d) => d.c === "transactions").map((d) => d.i);
  for (const x of ["t1", "e1", "s1"]) assert.ok(ids.includes(x), x);
});
await t("penarikan inkremental (since) hanya mengembalikan yang baru", async () => {
  const first = await pull(TIARA);
  await push(TIARA, [tx("t2", TIARA)]);
  const inc = await pull(TIARA, first.seq);
  assert.deepEqual(inc.docs.map((d) => d.i), ["t2"]);
});

console.log("Sinkron: konflik, hapus, kebangkitan");
await t("revisi basi -> conflict + dokumen server", async () => {
  const r = await push(TIARA, [{ c: "transactions", i: "t1", t: "u", b: 0, d: { id: "t1", user_id: TIARA, title: "basi" } }]);
  assert.equal(r.results[0].s, "conflict"); assert.equal(r.results[0].d.title, "x");
});
await t("revisi benar -> rev naik", async () => {
  const r = await push(TIARA, [{ c: "transactions", i: "t1", t: "u", b: 1, d: { id: "t1", user_id: TIARA, title: "baru" } }]);
  assert.equal(r.results[0].s, "ok"); assert.equal(r.results[0].r, 2);
});
await t("hapus -> batu nisan terkirim ke perangkat lain", async () => {
  const before = (await pull(TIARA)).seq;
  assert.equal((await push(TIARA, [{ c: "transactions", i: "t2", t: "d", b: 1 }])).results[0].s, "ok");
  const inc = await pull(TIARA, before - 1);
  const tomb = inc.docs.find((d) => d.i === "t2"); assert.ok(tomb && tomb.x === true && tomb.d === null);
});
await t("menghapus yang sudah tak ada = ok (idempoten)", async () => assert.equal((await push(TIARA, [{ c: "transactions", i: "t2", t: "d", b: 0 }])).results[0].s, "ok"));
await t("kebangkitan setelah hapus memakai revisi batu nisan", async () => {
  const cur = (await push(TIARA, [tx("t2", TIARA)])).results[0];
  assert.equal(cur.s, "conflict"); assert.equal(cur.x, true);
  const r = await push(TIARA, [{ ...tx("t2", TIARA), b: cur.r }]);
  assert.equal(r.results[0].s, "ok");
});
await t("kirim ulang op yang sama (respons hilang) = konflik yang bisa dirujuk, tanpa duplikasi", async () => {
  const op = { c: "transactions", i: "dup", t: "u", b: 0, d: { id: "dup", user_id: TIARA, title: "sekali" } };
  assert.equal((await push(TIARA, [op])).results[0].s, "ok");
  const again = (await push(TIARA, [op])).results[0];
  assert.equal(again.s, "conflict"); assert.equal(again.d.title, "sekali");
  assert.equal((await q("select count(*)::int c from sync_docs where id='dup'"))[0].c, 1);
});
await t("satu op gagal tidak membatalkan op lain dalam batch", async () => {
  const r = await push(TIARA, [tx("b1", TIARA), { c: "transactions", i: "bx", t: "u", b: 0, d: { user_id: "bukan-uuid" } }, tx("b2", TIARA)]);
  assert.deepEqual(r.results.map((x) => x.s), ["ok", "invalid", "ok"]);
});

console.log("Sinkron: koleksi record, keluarga, supervisor");
await t("ledger (keyprefix) dimiliki awalan id", async () => {
  assert.equal((await push(TIARA, [{ c: "ledger", i: `${TIARA}:2026-11-08`, t: "u", b: 0, d: { n: 1 } }])).results[0].s, "ok");
  assert.equal((await push(EKAL, [{ c: "ledger", i: `${TIARA}:2026-11-09`, t: "u", b: 0, d: { n: 1 } }])).results[0].s, "denied");
});
await t("chat/feed: semua anggota boleh menulis", async () => {
  assert.equal((await push(EKAL, [{ c: "chat", i: "c1", t: "u", b: 0, d: { id: "c1", authorId: EKAL, text: "halo" } }])).results[0].s, "ok");
  assert.ok((await pull(TIARA)).docs.some((d) => d.c === "chat" && d.i === "c1"));
});
await t("arcade_limits: supervisor yang ditugaskan boleh, yang tidak ditugaskan tidak", async () => {
  assert.equal((await push(SV_BUNDA, [{ c: "arcade_limits", i: TIARA, t: "u", b: 0, d: { maxRounds: 5 } }])).results[0].s, "ok");
  assert.equal((await push(SV_BUNDA, [{ c: "arcade_limits", i: SOFIA, t: "u", b: 0, d: { maxRounds: 5 } }])).results[0].s, "denied");
});

console.log("Sinkron: paging & ukuran");
await t("penarikan dipecah per batas ukuran (more=true) tanpa kehilangan dokumen", async () => {
  const big = "x".repeat(60000);
  await push(TIARA, Array.from({ length: 12 }, (_, i) => ({ c: "stories", i: `big${i}`, t: "u", b: 0, d: { id: `big${i}`, userId: TIARA, body: big } })));
  let since = 0, got = new Set(), pages = 0, more = true;
  while (more) { const p = await pull(TIARA, since, 1, 200000); pages++; for (const d of p.docs) got.add(d.c + "/" + d.i); since = p.seq; more = p.more; if (pages > 50) throw new Error("loop"); }
  assert.ok(pages > 1, "harus lebih dari 1 halaman"); for (let i = 0; i < 12; i++) assert.ok(got.has(`stories/big${i}`));
});
await t("dokumen > 1,5MB ditolak", async () => {
  const r = await push(TIARA, [{ c: "stories", i: "huge", t: "u", b: 0, d: { id: "huge", userId: TIARA, body: "y".repeat(1600000) } }]);
  assert.equal(r.results[0].s, "invalid");
});

console.log("Sinkron: tulis paralel");
await t("30 push paralel ke dokumen yang sama: tepat 1 menang per revisi, tanpa duplikat", async () => {
  await push(TIARA, [tx("race", TIARA)]);
  const rs = await Promise.all(Array.from({ length: 30 }, (_, i) => push(TIARA, [{ c: "transactions", i: "race", t: "u", b: 1, d: { id: "race", user_id: TIARA, title: "r" + i } }])));
  const ok = rs.filter((r) => r.results[0].s === "ok").length, cf = rs.filter((r) => r.results[0].s === "conflict").length;
  assert.equal(ok, 1); assert.equal(cf, 29);
  assert.equal((await q("select rev::int r from sync_docs where id='race'"))[0].r, 2);
});
await t("seq unik dan naik", async () => {
  const rows = await q("select count(*)::int n, count(distinct seq)::int d from sync_docs");
  assert.equal(rows[0].n, rows[0].d);
});

console.log("Akun: admin");
await t("non-admin tidak bisa buat akun / ganti PIN", async () => {
  assert.equal((await fn("app_create_account", TIARA, 1, null, "baru1", "Baru", "user", "1234")).reason, "forbidden");
  assert.equal((await fn("app_set_pin", TIARA, 1, EKAL, "4321")).reason, "forbidden");
});
await t("admin membuat akun; username kembar ditolak; PIN jelek ditolak", async () => {
  await q("delete from profiles where username='uji_baru'");
  const ok = await fn("app_create_account", ADMIN, 1, null, "uji_baru", "Uji Baru", "user", "4321");
  assert.equal(ok.ok, true);
  assert.equal((await fn("app_create_account", ADMIN, 1, null, "uji_baru", "X", "user", "4321")).reason, "username_taken");
  assert.equal((await fn("app_create_account", ADMIN, 1, null, "ujilain", "X", "user", "12")).reason, "bad_pin");
  assert.equal((await fn("app_create_account", ADMIN, 1, null, "BAD NAME", "X", "user", "1234")).reason, "bad_username");
  assert.equal((await fn("app_login", null, "uji_baru", "4321")).ok, true);
});
await t("ganti PIN -> sesi lama tidak berlaku, PIN baru dipakai", async () => {
  const r = await fn("app_set_pin", ADMIN, 1, EKAL, "7777");
  assert.equal(r.ok, true); assert.equal(r.ver, 2);
  await assert.rejects(() => pull(EKAL, 0, 1), /SESSION_INVALID/);
  assert.equal((await fn("app_login", EKAL, null, "1111")).ok, false);
  assert.equal((await fn("app_login", EKAL, null, "7777")).ok, true);
  await q("update profiles set session_ver=1, pin_hash=extensions.crypt('1111', extensions.gen_salt('bf',4)) where id=$1", [EKAL]);
});
await t("akun dinonaktifkan tidak bisa masuk / sesinya mati", async () => {
  await q("update profiles set is_active=false where id=$1", [SOFIA]);
  assert.equal((await fn("app_login", SOFIA, null, "1111")).ok, false);
  await assert.rejects(() => pull(SOFIA), /SESSION_INVALID/);
  await q("update profiles set is_active=true where id=$1", [SOFIA]);
});
await t("anon (kunci publik) tidak bisa memanggil fungsi atau membaca tabel", async () => {
  const c = await pool.connect();
  try {
    await c.query("set role anon");
    await assert.rejects(() => c.query("select app_login(null,'tiara','1111')"), /permission denied/);
    await assert.rejects(() => c.query("select * from sync_docs"), /permission denied/);
    await assert.rejects(() => c.query("select pin_hash from profiles"), /permission denied/);
  } finally { await c.query("reset role"); c.release(); }
});
await t("service_role hanya perlu EXECUTE (fungsi SECURITY DEFINER)", async () => {
  const c = await pool.connect();
  try {
    await c.query("set role service_role");
    const r = await c.query("select app_health() as h"); assert.equal(r.rows[0].h.ok, true);
  } finally { await c.query("reset role"); c.release(); }
});

console.log(`\n${pass} lulus${process.exitCode ? ", ADA YANG GAGAL" : ""}`);
await pool.end();

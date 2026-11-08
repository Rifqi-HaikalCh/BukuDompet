// Uji pembaca env server & pengklasifikasi galat database (tanpa jaringan).
// Jalankan: npx tsx tests/server/env.test.mts
import assert from "node:assert/strict";
import { ConfigError, cleanEnv, normalizeUrl, readServerEnv, readSessionSecret } from "../../src/lib/server/env.ts";
import { classifyRpcError } from "../../src/lib/server/errors.ts";

let pass = 0, fail = 0;
const t = (name: string, f: () => void) => {
  try { f(); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  GAGAL", name, "\n   ", (e as Error).message.split("\n").slice(0, 4).join("\n    ")); }
};
const code = (f: () => unknown) => { try { f(); return "none"; } catch (e) { return e instanceof ConfigError ? e.code : "other:" + (e as Error).message; } };
const b64u = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (ref: string) => `${b64u({ alg: "HS256" })}.${b64u({ ref, role: "service_role" })}.sig_nature-123`;
const URL_OK = "https://pxsfhknavwwundgcuuym.supabase.co";
// Kunci PALSU dirakit saat dijalankan (bukan teks utuh) agar tidak memicu GitHub secret scanning.
const SECRET_PREFIX = ["sb", "secret", ""].join("_");
const PUBLISHABLE_PREFIX = ["sb", "publishable", ""].join("_");
const KEY_OK = SECRET_PREFIX + "x".repeat(22) + "_" + "y".repeat(8);

console.log("cleanEnv");
t("CRLF & spasi di ujung dibuang", () => assert.equal(cleanEnv("  abc\r\n"), "abc"));
t("kutip pembungkus dibuang", () => assert.equal(cleanEnv('"abc"'), "abc"));
t("\\n harfiah di ujung dibuang", () => assert.equal(cleanEnv("abc\\n"), "abc"));
t("undefined → kosong", () => assert.equal(cleanEnv(undefined), ""));

console.log("normalizeUrl");
t("garis miring & /rest/v1 dibuang", () => assert.equal(normalizeUrl(URL_OK + "/rest/v1/"), URL_OK));
t("bukan URL → url_invalid", () => assert.equal(code(() => normalizeUrl("pxsfhknav.supabase")), "url_invalid"));

console.log("readServerEnv");
t("env sehat", () => assert.deepEqual(readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_SECRET_KEY: KEY_OK }), { url: URL_OK, key: KEY_OK }));
t("kunci dengan CRLF (salah-tempel Windows) tetap dipakai setelah dibersihkan", () =>
  assert.equal(readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK + "\r\n", SUPABASE_SECRET_KEY: KEY_OK + "\r\n" }).key, KEY_OK));
t("url kosong → url_missing", () => assert.equal(code(() => readServerEnv({ SUPABASE_SECRET_KEY: KEY_OK })), "url_missing"));
t("kunci kosong → key_missing", () => assert.equal(code(() => readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK })), "key_missing"));
t("kunci publishable ditolak", () => assert.equal(code(() => readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_SECRET_KEY: PUBLISHABLE_PREFIX + "abc" })), "key_is_publishable"));
t("spasi di tengah kunci → key_bad_chars", () => assert.equal(code(() => readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_SECRET_KEY: SECRET_PREFIX + "abc def" })), "key_bad_chars"));
t("JWT proyek lain → key_project_mismatch", () =>
  assert.equal(code(() => readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_SERVICE_ROLE_KEY: jwt("mtveyrbvszasprbexhqz") })), "key_project_mismatch"));
t("JWT proyek yang sama diterima", () =>
  assert.equal(readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_SERVICE_ROLE_KEY: jwt("pxsfhknavwwundgcuuym") }).url, URL_OK));
t("NEXT_PUBLIC_SUPABASE_URL didahulukan atas SUPABASE_URL", () =>
  assert.equal(readServerEnv({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_URL: "https://mtveyrbvszasprbexhqz.supabase.co", SUPABASE_SECRET_KEY: KEY_OK }).url, URL_OK));

console.log("readSessionSecret");
t("rahasia sesi dibersihkan & minimal 16 karakter", () => {
  assert.equal(readSessionSecret({ SESSION_SECRET: "x".repeat(20) + "\r\n" }), "x".repeat(20));
  assert.equal(readSessionSecret({ SESSION_SECRET: "pendek" }), null);
});

console.log("classifyRpcError");
t("fetch failed → network", () => assert.equal(classifyRpcError({ message: "TypeError: fetch failed" }, 0), "network"));
t("header tak sah → bad_header", () => assert.equal(classifyRpcError({ message: "TypeError: Headers.append: \"x\" is an invalid header value" }, 0), "bad_header"));
t("401 → invalid_api_key", () => assert.equal(classifyRpcError({ message: "Invalid API key" }, 401), "invalid_api_key"));
t("PGRST202 → function_missing", () => assert.equal(classifyRpcError({ message: "Could not find the function public.app_health", code: "PGRST202" }, 404), "function_missing"));
t("42501 → forbidden", () => assert.equal(classifyRpcError({ message: "permission denied", code: "42501" }, 403), "forbidden"));
t("lainnya → db_error", () => assert.equal(classifyRpcError({ message: "boom", code: "XX000" }, 500), "db_error"));

console.log(`\n${pass} lulus, ${fail} gagal`);
if (fail) process.exit(1);

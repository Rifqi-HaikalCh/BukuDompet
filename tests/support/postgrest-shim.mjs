// Pengganti PostgREST untuk uji: POST /rest/v1/rpc/:fn -> `select public.fn(named args)` di Postgres lokal.
// Dengan ini supabase-js ASLI (di route Next.js) diuji end-to-end tanpa Supabase cloud.
// Pakai:  PG=postgres://postgres:bdtest@localhost:5432/bdtest PORT=54399 node tests/support/postgrest-shim.mjs
import http from "node:http";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.PG || "postgres://postgres:bdtest@localhost:5432/bdtest", max: 8 });
const REQUIRED_KEY = process.env.SHIM_KEY || "";
const log = [];

http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.url === "/__log") return send(200, log.splice(0));
  const m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(req.url || "");
  if (req.method !== "POST" || !m) return send(404, { message: "not found" });
  // meniru perilaku nyata: kunci harus dikirim
  const auth = req.headers["apikey"] || "";
  if (REQUIRED_KEY && auth !== REQUIRED_KEY) return send(401, { message: "Invalid API key" });
  let raw = ""; for await (const c of req) raw += c;
  const args = raw ? JSON.parse(raw) : {};
  const names = Object.keys(args);
  const sql = `select public.${m[1]}(${names.map((n, i) => `${n} => $${i + 1}`).join(",")}) as r`;
  const vals = names.map((n) => (args[n] !== null && typeof args[n] === "object" ? JSON.stringify(args[n]) : args[n]));
  log.push({ fn: m[1], role: "service_role" });
  const c = await pool.connect();
  try {
    await c.query("set role service_role"); // sama seperti PostgREST: peran dari kunci
    const r = await c.query(sql, vals);
    send(200, r.rows[0].r);
  } catch (e) {
    send(400, { code: e.code, message: e.message, details: null, hint: null });
  } finally { await c.query("reset role").catch(() => {}); c.release(); }
}).listen(Number(process.env.PORT || 54399), () => console.log("shim siap"));

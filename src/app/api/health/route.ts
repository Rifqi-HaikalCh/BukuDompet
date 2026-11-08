import { rpc } from "@/lib/server/db"
import { errorCode, json } from "@/lib/server/http"
import { cleanEnv, readServerEnv } from "@/lib/server/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HINTS: Record<string, string> = {
  url_missing: "NEXT_PUBLIC_SUPABASE_URL belum diatur di Vercel (Production).",
  url_invalid: "NEXT_PUBLIC_SUPABASE_URL bukan alamat yang sah (contoh benar: https://<kode>.supabase.co).",
  key_missing: "SUPABASE_SECRET_KEY belum diatur di Vercel (Production).",
  key_is_publishable: "SUPABASE_SECRET_KEY berisi kunci PUBLISHABLE. Pakai kunci 'secret' (sb_secret_…) dari Supabase > Settings > API Keys.",
  key_bad_chars: "SUPABASE_SECRET_KEY mengandung karakter tak sah (spasi/baris baru). Hapus lalu isi ulang tepat satu baris tanpa spasi, kemudian Redeploy.",
  key_project_mismatch: "Kunci dan URL milik proyek Supabase yang berbeda. Samakan keduanya dengan proyek BukuDompet.",
  network: "Server Vercel tidak bisa menjangkau Supabase (jaringan/DNS). Periksa URL proyek dan status proyek Supabase.",
  bad_header: "SUPABASE_SECRET_KEY tak bisa dipakai sebagai header (ada karakter tersembunyi). Isi ulang di Vercel lalu Redeploy.",
  invalid_api_key: "Supabase menolak kunci. Salin ulang kunci 'secret' proyek BukuDompet ke SUPABASE_SECRET_KEY lalu Redeploy.",
  forbidden: "Kunci diterima tetapi tak berhak menjalankan fungsi. Jalankan ulang bagian GRANT di migrasi 005.",
  function_missing: "Fungsi app_* tidak ditemukan di proyek pada 'host'. Pastikan host = proyek BukuDompet (lihat 'sources'); bila sudah benar, jalankan supabase/migrations/005_v5_5_server_sync.sql di SQL Editor.",
  db_error: "Database menolak panggilan. Lihat Runtime Logs Vercel (cari '[db] rpc gagal').",
  unknown: "Galat tak terduga. Lihat Runtime Logs Vercel.",
}

function hostOf(v: string | undefined): string | null {
  const c = cleanEnv(v)
  if (!c) return null
  try {
    return new URL(c).host
  } catch {
    return "(tidak valid)"
  }
}

/** Cek cepat setelah deploy: apakah env terpasang dan database bisa dijangkau? Tanpa data sensitif. */
export async function GET() {
  const env = {
    url: !!cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    secretKey: !!cleanEnv(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    sessionSecret: !!cleanEnv(process.env.SESSION_SECRET),
  }
  // Dibaca lewat objek (bukan literal process.env.X) agar nilai RUNTIME yang terlihat, bukan hasil inline saat build.
  const rt = process.env as Record<string, string | undefined>
  const sources = { NEXT_PUBLIC_SUPABASE_URL: hostOf(rt["NEXT_PUBLIC_SUPABASE_URL"]), SUPABASE_URL: hostOf(rt["SUPABASE_URL"]) }
  const conflict = !!sources.NEXT_PUBLIC_SUPABASE_URL && !!sources.SUPABASE_URL && sources.NEXT_PUBLIC_SUPABASE_URL !== sources.SUPABASE_URL
  let host: string | undefined
  try {
    host = new URL(readServerEnv().url).host
  } catch {
    host = undefined
  }
  try {
    const h = await rpc<{ ok: boolean; accounts: number }>("app_health", {})
    return json({ ok: true, env, host, sources, conflict, migrated: true, accounts: h.accounts })
  } catch (e) {
    const code = errorCode(e)
    console.error("[health] gagal", code, e instanceof Error ? e.message : e)
    return json({ ok: false, env, host, sources, conflict, code, hint: HINTS[code] ?? HINTS.unknown }, 503)
  }
}

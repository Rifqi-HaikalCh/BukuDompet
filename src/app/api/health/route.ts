import { rpc } from "@/lib/server/db"
import { json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Cek cepat setelah deploy: apakah env terpasang dan migrasi 005 sudah dijalankan? Tanpa data sensitif. */
export async function GET() {
  const env = {
    url: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    secretKey: !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    sessionSecret: !!process.env.SESSION_SECRET,
  }
  try {
    const h = await rpc<{ ok: boolean; accounts: number }>("app_health", {})
    return json({ ok: true, env, migrated: true, accounts: h.accounts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    const hint = msg.startsWith("SERVER_NOT_CONFIGURED")
      ? "Atur SUPABASE_SECRET_KEY dan NEXT_PUBLIC_SUPABASE_URL di Vercel"
      : "Jalankan supabase/migrations/005_v5_5_server_sync.sql di SQL Editor"
    return json({ ok: false, env, migrated: false, hint }, 503)
  }
}

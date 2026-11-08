import { SessionInvalidError, rpc } from "@/lib/server/db"
import { clearSessionCookie, currentSession, json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Apakah sesi masih sah? Dipakai klien saat dibuka & berkala. 401 → klien keluar & bersihkan data lokal. */
export async function GET() {
  try {
    const s = await currentSession()
    if (!s) return json({ ok: false }, 401)
    const r = await rpc<{ ok: boolean; id?: string; username?: string; display_name?: string; role?: string }>(
      "app_session",
      { p_actor: s.uid, p_ver: s.ver },
    )
    if (!r.ok) {
      await clearSessionCookie()
      return json({ ok: false }, 401)
    }
    return json({ ok: true, user: { id: r.id, username: r.username, display_name: r.display_name, role: r.role } })
  } catch (e) {
    if (e instanceof SessionInvalidError) return json({ ok: false }, 401)
    // gangguan sementara ≠ sesi tidak sah: klien tidak boleh menghapus data karenanya
    return json({ ok: false, error: "server_error" }, 503)
  }
}

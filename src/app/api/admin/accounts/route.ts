import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Admin membuat akun baru. Peran admin diperiksa ulang di database. */
export const POST = authedPost(4_000, async (_req, s, b) => {
  const r = await rpc<{ ok: boolean; reason?: string; id?: string }>("app_create_account", {
    p_actor: s.uid,
    p_ver: s.ver,
    p_id: null,
    p_username: String(b.username ?? ""),
    p_display: String(b.display_name ?? ""),
    p_role: String(b.role ?? ""),
    p_pin: String(b.pin ?? ""),
  })
  return json(r, r.ok ? 200 : r.reason === "forbidden" ? 403 : 400)
})

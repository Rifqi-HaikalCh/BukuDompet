import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type R = { ok: boolean; reason?: string; id?: string; username?: string; display_name?: string; active?: boolean; docs_removed?: number }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Admin mengelola akun: ubah nama/username, nonaktifkan/aktifkan, hapus permanen (hanya akun nonaktif).
 * Peran admin, perlindungan diri-sendiri, dan admin terakhir ditegakkan ulang di database.
 * Peran akun TIDAK bisa diubah dari sini. PIN tidak pernah dikirim atau dicatat di jejak.
 */
export const POST = authedPost(2_000, async (_req, s, b) => {
  const action = String(b.action ?? "")
  const target = String(b.target ?? "")
  if (!UUID.test(target)) return json({ ok: false, reason: "not_found" }, 400)
  const base = { p_actor: s.uid, p_ver: s.ver, p_target: target }
  let r: R
  if (action === "update") {
    r = await rpc<R>("app_update_account", { ...base, p_display: String(b.display_name ?? ""), p_username: String(b.username ?? "") })
  } else if (action === "active") {
    if (typeof b.active !== "boolean") return json({ ok: false, reason: "bad_request" }, 400)
    r = await rpc<R>("app_set_account_active", { ...base, p_active: b.active })
  } else if (action === "delete") {
    r = await rpc<R>("app_delete_account", { ...base, p_confirm: String(b.confirm ?? "") })
  } else {
    return json({ ok: false, reason: "bad_request" }, 400)
  }
  return json(r, r.ok ? 200 : r.reason === "forbidden" ? 403 : 400)
})

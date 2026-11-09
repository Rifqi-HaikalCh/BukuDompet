import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Jejak tindakan Admin terakhir (tanpa PIN atau data rahasia). */
export const POST = authedPost(1_000, async (_req, s, b) => {
  const limit = Math.max(1, Math.min(100, Math.round(Number(b.limit ?? 30)) || 30))
  const r = await rpc<{ ok: boolean; reason?: string; rows?: unknown[] }>("app_admin_audit", { p_actor: s.uid, p_ver: s.ver, p_limit: limit })
  return json(r, r.ok ? 200 : r.reason === "forbidden" ? 403 : 400)
})

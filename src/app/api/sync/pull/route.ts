import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

export const POST = authedPost(2_000, async (_req, s, body) => {
  const since = Number.isFinite(body.since) ? Math.max(0, Math.floor(body.since as number)) : 0
  const data = await rpc("app_sync_pull", { p_actor: s.uid, p_ver: s.ver, p_since: since })
  return json(data)
})

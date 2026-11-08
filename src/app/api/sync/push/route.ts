import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

/** Batas badan 3,5MB (batas Vercel ±4,5MB) dan 200 operasi per permintaan; klien memecah sisanya. */
export const POST = authedPost(3_500_000, async (_req, s, body) => {
  const ops = body.ops
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 200) return json({ error: "bad_request" }, 400)
  const data = await rpc("app_sync_push", { p_actor: s.uid, p_ver: s.ver, p_ops: ops })
  return json(data)
})

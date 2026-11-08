import { clearSessionCookie, json, sameOriginOk } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return json({ error: "origin" }, 403)
  await clearSessionCookie()
  return json({ ok: true })
}

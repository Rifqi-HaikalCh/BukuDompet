import { rpc } from "@/lib/server/db"
import { clientIp, fail, json, rateLimited, readJson, sameOriginOk } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Cari akun berdasarkan nama/username untuk layar masuk (tanpa PIN, tanpa sesi). */
export async function POST(req: Request) {
  if (!sameOriginOk(req)) return json({ error: "origin" }, 403)
  if (rateLimited(`lookup:${clientIp(req)}`, 40, 60_000)) return json({ error: "terlalu_sering" }, 429)
  const body = await readJson(req, 2_000)
  const name = typeof body?.name === "string" ? body.name : ""
  if (!name.trim()) return json({ candidates: [] })
  try {
    const candidates = await rpc<unknown[]>("app_lookup", { p_name: name })
    return json({ candidates })
  } catch (e) {
    return fail("auth/lookup", e)
  }
}

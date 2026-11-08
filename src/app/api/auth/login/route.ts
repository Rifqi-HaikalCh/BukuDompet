import { cookies } from "next/headers"
import { rpc } from "@/lib/server/db"
import { clientIp, json, rateLimited, readJson, sameOriginOk } from "@/lib/server/http"
import { SESSION_COOKIE, cookieOptions, createSessionToken } from "@/lib/server/session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface LoginResult {
  ok: boolean
  reason?: "invalid" | "locked"
  attempts_left?: number
  retry_after?: number
  id?: string
  username?: string
  display_name?: string
  role?: string
  ver?: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Masuk: PIN diverifikasi di database (bcrypt + penguncian). Sukses → cookie sesi httpOnly. */
export async function POST(req: Request) {
  if (!sameOriginOk(req)) return json({ error: "origin" }, 403)
  if (rateLimited(`login:${clientIp(req)}`, 30, 60_000)) return json({ ok: false, reason: "rate" }, 429)
  const body = await readJson(req, 2_000)
  if (!body) return json({ ok: false, reason: "bad_request" }, 400)
  const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null
  const username = typeof body.username === "string" ? body.username.slice(0, 40) : null
  const pin = typeof body.pin === "string" ? body.pin : ""
  if (!id && !username) return json({ ok: false, reason: "bad_request" }, 400)
  try {
    const r = await rpc<LoginResult>("app_login", { p_id: id, p_username: username, p_pin: pin })
    if (!r.ok) {
      return json(
        { ok: false, reason: r.reason ?? "invalid", attempts_left: r.attempts_left, retry_after: r.retry_after },
        r.reason === "locked" ? 429 : 401,
      )
    }
    const jar = await cookies()
    jar.set(SESSION_COOKIE, createSessionToken(r.id!, r.ver ?? 1), cookieOptions())
    return json({ ok: true, user: { id: r.id, username: r.username, display_name: r.display_name, role: r.role } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ""
    return json({ ok: false, reason: msg.startsWith("SERVER_NOT_CONFIGURED") ? "server_not_configured" : "server_error" }, 500)
  }
}

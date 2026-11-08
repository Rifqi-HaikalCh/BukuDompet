import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { SESSION_COOKIE, cookieOptions, verifySessionToken, type SessionPayload } from "./session"
import { SessionInvalidError } from "./db"

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

/** Cegah CSRF lintas-situs: Origin (bila ada) harus sama dengan Host. Cookie juga SameSite=Strict. */
export function sameOriginOk(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") || req.headers.get("host"))
  } catch {
    return false
  }
}

/** Baca JSON dengan batas ukuran (Vercel membatasi badan fungsi ±4,5MB). */
export async function readJson(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") || 0)
  if (len > maxBytes) return null
  const text = await req.text()
  if (text.length > maxBytes) return null
  try {
    const v = JSON.parse(text)
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function currentSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value)
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 })
}

/** Pembatas laju sederhana per-instansi (lapisan tambahan; penguncian sungguhan ada di database). */
const hits = new Map<string, { n: number; t: number }>()
export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const h = hits.get(key)
  if (!h || now - h.t > windowMs) {
    hits.set(key, { n: 1, t: now })
    if (hits.size > 2000) for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k)
    return false
  }
  h.n++
  return h.n > limit
}
export const clientIp = (req: Request) =>
  (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown"

type Handler = (req: Request, session: SessionPayload, body: Record<string, unknown>) => Promise<Response>

/**
 * Bungkus route ber-sesi POST JSON: cek origin, sesi, ukuran, dan ubah
 * SessionInvalidError menjadi 401 (klien lalu membersihkan data lokal).
 */
export function authedPost(maxBytes: number, handler: Handler) {
  return async (req: Request): Promise<Response> => {
    try {
      if (!sameOriginOk(req)) return json({ error: "origin" }, 403)
      const session = await currentSession()
      if (!session) return json({ error: "session_invalid" }, 401)
      const body = await readJson(req, maxBytes)
      if (!body) return json({ error: "bad_request" }, 400)
      return await handler(req, session, body)
    } catch (e) {
      if (e instanceof SessionInvalidError) {
        await clearSessionCookie()
        return json({ error: "session_invalid" }, 401)
      }
      const msg = e instanceof Error ? e.message : "error"
      return json({ error: msg.startsWith("SERVER_NOT_CONFIGURED") ? "server_not_configured" : "server_error" }, 500)
    }
  }
}

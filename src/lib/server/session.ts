import { createHmac, timingSafeEqual } from "node:crypto"
import { readSessionSecret } from "./env"

export const SESSION_COOKIE = "bd_session"
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30 hari

export interface SessionPayload {
  /** id akun (UUID) */
  uid: string
  /** versi sesi — naik saat PIN diganti sehingga semua sesi lama otomatis mati */
  ver: number
  /** kedaluwarsa (detik epoch) */
  exp: number
}

function secret(): string {
  const s = readSessionSecret()
  if (!s) throw new Error("SERVER_NOT_CONFIGURED: SESSION_SECRET / SUPABASE_SECRET_KEY belum diatur")
  return s
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url")
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest()

export function createSessionToken(uid: string, ver: number, now = Date.now()): string {
  const payload: SessionPayload = { uid, ver, exp: Math.floor(now / 1000) + MAX_AGE_SEC }
  const body = b64u(JSON.stringify(payload))
  return `${body}.${b64u(sign(body))}`
}

export function verifySessionToken(token: string | undefined | null, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 1024) return null
  const dot = token.indexOf(".")
  if (dot < 1) return null
  const body = token.slice(0, dot)
  let given: Buffer
  try {
    given = Buffer.from(token.slice(dot + 1), "base64url")
  } catch {
    return null
  }
  const want = sign(body)
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload
    if (typeof p.uid !== "string" || !Number.isInteger(p.ver) || !Number.isFinite(p.exp)) return null
    if (p.exp * 1000 < now) return null
    return p
  } catch {
    return null
  }
}

export function cookieOptions(maxAge = MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  }
}

import { cookies } from "next/headers"
import { rpc } from "@/lib/server/db"
import { authedPost, json } from "@/lib/server/http"
import { SESSION_COOKIE, cookieOptions, createSessionToken } from "@/lib/server/session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Admin mengganti PIN akun. Semua sesi akun itu langsung tidak berlaku (session_ver naik). */
export const POST = authedPost(2_000, async (_req, s, b) => {
  const target = String(b.target ?? "")
  const r = await rpc<{ ok: boolean; reason?: string; id?: string; ver?: number }>("app_set_pin", {
    p_actor: s.uid,
    p_ver: s.ver,
    p_target: target,
    p_pin: String(b.pin ?? ""),
  })
  if (r.ok && r.id === s.uid && r.ver) {
    // admin mengganti PIN-nya sendiri: terbitkan cookie baru agar tidak terlempar keluar
    const jar = await cookies()
    jar.set(SESSION_COOKIE, createSessionToken(s.uid, r.ver), cookieOptions())
  }
  return json({ ok: r.ok, reason: r.reason }, r.ok ? 200 : r.reason === "forbidden" ? 403 : 400)
})

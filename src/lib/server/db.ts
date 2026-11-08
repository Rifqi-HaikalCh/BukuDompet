import { createAdminClient } from "@/lib/supabase/admin"
import { DbError, classifyRpcError } from "./errors"

export { DbError } from "./errors"

/** Sesi ditolak database (akun nonaktif / PIN diganti / versi tidak cocok). */
export class SessionInvalidError extends Error {
  constructor() {
    super("SESSION_INVALID")
  }
}

/** Panggil fungsi `app_*` di database. Satu-satunya pintu ke data. Galat dicatat ke log Vercel dengan kode penyebab. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error, status } = await createAdminClient().rpc(fn, args)
  if (error) {
    if (/SESSION_INVALID/.test(error.message || "")) throw new SessionInvalidError()
    const code = classifyRpcError(error, status)
    console.error(
      "[db] rpc gagal",
      JSON.stringify({ fn, code, http: status, pg: error.code ?? null, msg: String(error.message ?? "").slice(0, 200), details: String(error.details ?? "").slice(0, 300) }),
    )
    throw new DbError(fn, code, status, `DB_ERROR(${fn}): ${error.message}`)
  }
  return data as T
}

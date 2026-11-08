import { createAdminClient } from "@/lib/supabase/admin"

/** Sesi ditolak database (akun nonaktif / PIN diganti / versi tidak cocok). */
export class SessionInvalidError extends Error {
  constructor() {
    super("SESSION_INVALID")
  }
}

/** Panggil fungsi `app_*` di database. Satu-satunya pintu ke data. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createAdminClient().rpc(fn, args)
  if (error) {
    if (/SESSION_INVALID/.test(error.message || "")) throw new SessionInvalidError()
    throw new Error(`DB_ERROR(${fn}): ${error.message}`)
  }
  return data as T
}

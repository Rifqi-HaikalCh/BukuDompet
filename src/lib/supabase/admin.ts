import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

/**
 * Klien Supabase dengan kunci rahasia (service role). HANYA untuk server.
 * Jangan pernah diimpor dari kode klien ("use client"): kunci ini tidak boleh
 * sampai ke browser. Build diperiksa agar kunci tidak bocor ke bundel.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("SERVER_NOT_CONFIGURED: SUPABASE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_URL belum diatur")
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}

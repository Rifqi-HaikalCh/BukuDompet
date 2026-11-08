import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { readServerEnv } from "@/lib/server/env"

let cached: { sig: string; client: SupabaseClient } | null = null

/**
 * Klien Supabase dengan kunci rahasia (service role). HANYA untuk server.
 * Jangan pernah diimpor dari kode klien ("use client"): kunci ini tidak boleh
 * sampai ke browser. Build diperiksa agar kunci tidak bocor ke bundel.
 *
 * Nilai env dibersihkan (spasi/baris baru/kutip) dan divalidasi; bila salah, galat `ConfigError`
 * membawa KODE penyebabnya (url_missing, key_bad_chars, key_project_mismatch, ...).
 */
export function createAdminClient(): SupabaseClient {
  const { url, key } = readServerEnv()
  const sig = `${url}|${key}`
  if (cached?.sig === sig) return cached.client
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  cached = { sig, client }
  return client
}

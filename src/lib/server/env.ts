/**
 * Pembaca variabel lingkungan server yang tahan salah-tempel (spasi, baris baru, kutip, "\n" harfiah
 * yang ikut tersimpan di Vercel) dan yang melaporkan penyebabnya dengan KODE aman-tampil (tanpa rahasia).
 * Modul murni tanpa impor agar bisa diuji di Node.
 */

export type ConfigCode =
  | "url_missing"
  | "url_invalid"
  | "key_missing"
  | "key_is_publishable"
  | "key_bad_chars"
  | "key_project_mismatch";

export class ConfigError extends Error {
  constructor(public code: ConfigCode) {
    super(`SERVER_NOT_CONFIGURED: ${code}`);
  }
}

/** Buang BOM, spasi/baris baru di ujung, "\n" harfiah di ujung, dan kutip pembungkus. */
export function cleanEnv(v: string | undefined | null): string {
  let s = (v ?? "").replace(/^﻿/, "").trim();
  s = s.replace(/(\\r|\\n)+$/g, "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
  return s;
}

export function normalizeUrl(raw: string): string {
  const u = cleanEnv(raw).replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
  try {
    const p = new URL(u);
    if (p.protocol !== "https:" && p.protocol !== "http:") throw new Error("protocol");
    return p.origin;
  } catch {
    throw new ConfigError("url_invalid");
  }
}

/** Kode proyek dari `https://<ref>.supabase.co` (null untuk host lain, mis. lokal). */
export function projectRefOfUrl(url: string): string | null {
  const m = /^https?:\/\/([a-z0-9]+)\.supabase\.(co|in|net)$/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

/** Klaim `ref` pada kunci berformat JWT (kunci lama `service_role`); null bila bukan JWT. */
export function projectRefOfKey(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { ref?: unknown };
    return typeof p.ref === "string" ? p.ref.toLowerCase() : null;
  } catch {
    return null;
  }
}

export interface ServerEnv {
  url: string;
  key: string;
}

export function readServerEnv(env: Record<string, string | undefined> = process.env): ServerEnv {
  const rawUrl = cleanEnv(env.NEXT_PUBLIC_SUPABASE_URL) || cleanEnv(env.SUPABASE_URL);
  if (!rawUrl) throw new ConfigError("url_missing");
  const url = normalizeUrl(rawUrl);

  const key = cleanEnv(env.SUPABASE_SECRET_KEY) || cleanEnv(env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) throw new ConfigError("key_missing");
  if (key.startsWith("sb_publishable_")) throw new ConfigError("key_is_publishable");
  if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new ConfigError("key_bad_chars");

  // Kunci service_role lama membawa kode proyeknya: tolak bila beda dengan URL (mis. sisa integrasi proyek lain).
  const urlRef = projectRefOfUrl(url);
  const keyRef = projectRefOfKey(key);
  if (urlRef && keyRef && urlRef !== keyRef) throw new ConfigError("key_project_mismatch");
  return { url, key };
}

/** Rahasia penandatangan sesi; null bila belum diatur / terlalu pendek. */
export function readSessionSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = cleanEnv(env.SESSION_SECRET) || cleanEnv(env.SUPABASE_SECRET_KEY) || cleanEnv(env.SUPABASE_SERVICE_ROLE_KEY);
  return s && s.length >= 16 ? s : null;
}

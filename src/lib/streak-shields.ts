/**
 * Pelindung Streak (Perisai Es) — Versi 5.1.
 *
 * - Setiap awal bulan (tanggal 1) tiap anak otomatis mendapat 3 perisai GRATIS. Sisa jatah gratis bulan
 *   lalu hangus (tidak ditumpuk) sehingga selalu paling banyak 3 per bulan.
 * - Perisai tambahan dibeli di Butik dengan Poin dan disimpan sampai terpakai (maks. 10 perisai beli).
 * - Saat ada hari terlewat, perisai GRATIS dipakai lebih dulu, baru perisai beli.
 *
 * Seluruh fungsi murni (tanpa jam sistem) agar mudah diuji dan aman untuk SSR.
 */
import { addDaysStr, parseLocalDate } from "@/lib/dates";

export const FREE_SHIELDS_PER_MONTH = 3;
export const MAX_PAID_SHIELDS = 10;

export type ShieldPackId = "single" | "trio" | "week";

export interface ShieldPack {
  id: ShieldPackId;
  name: string;
  /** Jumlah perisai yang didapat. */
  shields: number;
  /** Harga dalam Poin. */
  price: number;
  tagline: string;
  description: string;
}

export const SHIELD_PACKS: readonly ShieldPack[] = [
  {
    id: "single",
    name: "Perisai Es Tunggal",
    shields: 1,
    price: 500,
    tagline: "Melindungi 1 hari terlewat",
    description: "Satu perisai es yang menjaga api streak-mu tetap menyala saat kamu lupa mencatat satu hari.",
  },
  {
    id: "trio",
    name: "Paket Trio Beku",
    shields: 3,
    price: 1350,
    tagline: "Hemat 150 Poin",
    description: "Tiga perisai es sekaligus. Cocok untuk persiapan liburan atau pekan ujian yang padat.",
  },
  {
    id: "week",
    name: "Paket Pekan Aman",
    shields: 7,
    price: 2800,
    tagline: "Hemat 700 Poin",
    description: "Tujuh perisai es untuk satu pekan penuh. Paling hemat, tetapi muat maksimal 10 perisai beli.",
  },
];

export const SHIELD_PACK_BY_ID: Readonly<Record<ShieldPackId, ShieldPack>> = {
  single: SHIELD_PACKS[0],
  trio: SHIELD_PACKS[1],
  week: SHIELD_PACKS[2],
};

/** Bentuk minimal profil yang menyimpan perisai. */
export interface ShieldHolder {
  /** Perisai hasil beli (disimpan terus). */
  streak_freeze_count: number;
  /** Sisa jatah gratis pada bulan `free_shield_month`. */
  free_shield_left?: number;
  /** Bulan jatah gratis ("YYYY-MM"). */
  free_shield_month?: string;
}

/** Kunci bulan "YYYY-MM" dari tanggal "YYYY-MM-DD". */
export const monthKeyOf = (dateStr: string): string => dateStr.slice(0, 7);

/** Sisa perisai gratis pada bulan berjalan (bulan baru = jatah penuh). */
export function freeShieldsFor(p: ShieldHolder, today: string): number {
  if (p.free_shield_month !== monthKeyOf(today)) return FREE_SHIELDS_PER_MONTH;
  return Math.max(0, Math.min(FREE_SHIELDS_PER_MONTH, p.free_shield_left ?? 0));
}

/** Total perisai yang bisa dipakai hari ini (gratis + beli). */
export function totalShieldsFor(p: ShieldHolder, today: string): number {
  return freeShieldsFor(p, today) + Math.max(0, p.streak_freeze_count);
}

/** Field yang harus ditulis agar jatah gratis bulan ini tercatat. */
export function monthlyFreeFields(p: ShieldHolder, today: string): { free_shield_left: number; free_shield_month: string } {
  return { free_shield_left: freeShieldsFor(p, today), free_shield_month: monthKeyOf(today) };
}

/** Kurangi `count` perisai: gratis lebih dulu, sisanya dari perisai beli. */
export function spendShields(
  p: ShieldHolder,
  today: string,
  count: number
): { free_shield_left: number; free_shield_month: string; streak_freeze_count: number } {
  const free = freeShieldsFor(p, today);
  const fromFree = Math.min(free, count);
  const fromPaid = Math.min(Math.max(0, p.streak_freeze_count), count - fromFree);
  return {
    free_shield_left: free - fromFree,
    free_shield_month: monthKeyOf(today),
    streak_freeze_count: Math.max(0, p.streak_freeze_count) - fromPaid,
  };
}

/** Berapa hari lagi sampai jatah gratis diisi ulang (1 = besok tanggal 1). */
export function daysUntilShieldReset(today: string): number {
  const d = parseLocalDate(today);
  const nextFirst = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0, 0);
  const ms = nextFirst.getTime() - d.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

/** Tanggal isi ulang berikutnya ("YYYY-MM-01"). */
export function nextShieldResetDate(today: string): string {
  return addDaysStr(today, daysUntilShieldReset(today));
}

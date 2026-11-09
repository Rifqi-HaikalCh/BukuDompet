/**
 * Siklus anggaran. Satu siklus dimulai pada `cycleStartDay` (1–28) dan berakhir sehari sebelum
 * tanggal yang sama bulan berikutnya. Kuncinya `YYYY-MM` dari bulan tempat siklus DIMULAI.
 * Pemilihan bulan kalender (Kalender Kas) tetap terpisah di `lib/dates.ts`.
 */
import { addDaysStr, diffDaysStr } from "../dates";

const pad2 = (n: number) => String(n).padStart(2, "0");

export const MIN_CYCLE_START_DAY = 1;
export const MAX_CYCLE_START_DAY = 28;

export function clampStartDay(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return MIN_CYCLE_START_DAY;
  return Math.min(MAX_CYCLE_START_DAY, Math.max(MIN_CYCLE_START_DAY, v));
}

function parts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return [y || 1970, m || 1, d || 1];
}

export function monthKeyShift(key: string, delta: number): string {
  const [y, m] = key.split("-").map((v) => Number(v));
  const idx = (y || 1970) * 12 + ((m || 1) - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad2((idx % 12) + 1)}`;
}

export const nextCycleKey = (key: string) => monthKeyShift(key, 1);
export const prevCycleKey = (key: string) => monthKeyShift(key, -1);

/** Kunci siklus yang memuat `dateStr`. */
export function cycleKeyOf(dateStr: string, startDay: number): string {
  const s = clampStartDay(startDay);
  const [y, m, d] = parts(dateStr);
  const key = `${y}-${pad2(m)}`;
  return d >= s ? key : prevCycleKey(key);
}

export function cycleStartOf(key: string, startDay: number): string {
  return `${key}-${pad2(clampStartDay(startDay))}`;
}

export function cycleEndOf(key: string, startDay: number): string {
  return addDaysStr(cycleStartOf(nextCycleKey(key), startDay), -1);
}

export interface CycleBounds {
  key: string;
  start: string;
  end: string;
  totalDays: number;
  /** Sisa hari TERMASUK hari ini (minimal 1). */
  daysLeft: number;
}

export function cycleBounds(dateStr: string, startDay: number): CycleBounds {
  const key = cycleKeyOf(dateStr, startDay);
  const start = cycleStartOf(key, startDay);
  const end = cycleEndOf(key, startDay);
  return {
    key,
    start,
    end,
    totalDays: diffDaysStr(start, end) + 1,
    daysLeft: Math.max(1, diffDaysStr(dateStr, end) + 1),
  };
}

export function isDateInCycle(dateStr: string, key: string, startDay: number): boolean {
  return dateStr >= cycleStartOf(key, startDay) && dateStr <= cycleEndOf(key, startDay);
}

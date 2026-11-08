import { addDaysStr, diffDaysStr } from "@/lib/dates";

/**
 * Evaluasi streak ketat (Versi 5.0).
 *
 * Aturan:
 * - Kemarin atau hari ini sudah ada catatan (kas / cerita / tabungan) -> streak aman.
 * - Hari terlewat <= jumlah Perisai Es yang dimiliki -> perisai terpakai sebanyak hari terlewat, streak tetap hidup.
 * - Selain itu -> streak jadi 0 dan Mode Streak Padam (suasana dingin) menyala.
 *
 * Fungsi ini murni: tidak membaca jam sistem dan tidak mengubah argumennya, sehingga
 * aman dipakai di store, UI, maupun pengujian.
 */
export interface StreakCheckInput {
  lastRecordedDate: string;
  currentStreak: number;
  freezeCount: number;
  today: string;
}

export type StreakCheckStatus = "ok" | "saved_by_shield" | "broken";

export interface StreakCheckResult {
  status: StreakCheckStatus;
  /** Jumlah hari penuh yang terlewat tanpa catatan. */
  missedDays: number;
  nextStreak: number;
  nextFreezeCount: number;
  nextLastRecordedDate: string;
  /** Jumlah perisai yang terpakai pada evaluasi ini. */
  shieldsUsed: number;
}

export function evaluateStreakContinuity(
  input: StreakCheckInput
): StreakCheckResult {
  const { lastRecordedDate, currentStreak, freezeCount, today } = input;
  const gap = lastRecordedDate ? diffDaysStr(lastRecordedDate, today) : 99;
  const missedDays = Math.max(0, gap - 1);

  if (missedDays === 0) {
    return {
      status: "ok",
      missedDays: 0,
      nextStreak: currentStreak,
      nextFreezeCount: freezeCount,
      nextLastRecordedDate: lastRecordedDate,
      shieldsUsed: 0,
    };
  }

  if (missedDays >= 1 && missedDays <= freezeCount) {
    return {
      status: "saved_by_shield",
      missedDays,
      nextStreak: currentStreak,
      nextFreezeCount: freezeCount - missedDays,
      shieldsUsed: missedDays,
      // Hari yang terlewat dianggap "dibekukan" -> pencatatan hari ini tetap menyambung.
      nextLastRecordedDate: addDaysStr(today, -1),
    };
  }

  return {
    status: "broken",
    missedDays,
    nextStreak: 0,
    nextFreezeCount: freezeCount,
    nextLastRecordedDate: lastRecordedDate,
    shieldsUsed: 0,
  };
}

/**
 * Streak baru ketika pengguna mencatat di hari `today`.
 * Jika jeda lebih dari 1 hari (dan belum dievaluasi), streak mulai lagi dari 1.
 */
export function nextStreakOnRecord(
  lastRecordedDate: string,
  currentStreak: number,
  today: string
): number {
  if (lastRecordedDate === today) return currentStreak;
  const gap = lastRecordedDate ? diffDaysStr(lastRecordedDate, today) : 99;
  if (gap === 1) return currentStreak + 1;
  return 1;
}

/**
 * Aturan murni kemajuan & batas bermain Arcade Sekolah (Versi 5.2).
 * Tanpa React/store supaya mudah diuji dan dipakai ulang oleh UI maupun store.
 */
import {
  ARCADE_CLEARS_TO_LEVEL_UP,
  ARCADE_MAX_LEVEL,
  DEFAULT_ARCADE_LIMITS,
  type ArcadeDaily,
  type ArcadeLimits,
  type ArcadeModeProgress,
} from "@/lib/family-types";

export const progressKey = (userId: string, modeId: string): string => `${userId}|${modeId}`;

export function emptyProgress(): ArcadeModeProgress {
  return { level: 1, clears: {}, cursor: {} };
}

export const clampLevel = (level: number): number => Math.min(ARCADE_MAX_LEVEL, Math.max(1, Math.floor(level) || 1));

/**
 * Terapkan hasil satu ronde ke kemajuan mode.
 * Naik level bila lulus `ARCADE_CLEARS_TO_LEVEL_UP` ronde di level yang sedang dikejar, atau lulus sempurna sekali.
 * Hanya ronde di level tertinggi yang terbuka yang bisa membuka level berikutnya (ulang level lama tidak menaikkan).
 */
export function applyRoundResult(
  progress: ArcadeModeProgress,
  playedLevel: number,
  passed: boolean,
  perfect: boolean
): { next: ArcadeModeProgress; levelUp: boolean } {
  if (!passed) return { next: progress, levelUp: false };
  const clears = { ...progress.clears, [playedLevel]: (progress.clears[playedLevel] ?? 0) + 1 };
  let level = progress.level;
  let levelUp = false;
  if (playedLevel === progress.level && progress.level < ARCADE_MAX_LEVEL) {
    if (perfect || clears[playedLevel] >= ARCADE_CLEARS_TO_LEVEL_UP) {
      level = progress.level + 1;
      levelUp = true;
    }
  }
  return { next: { ...progress, clears, level }, levelUp };
}

export function dailyOf(daily: ArcadeDaily | undefined, today: string): ArcadeDaily {
  return daily && daily.date === today ? daily : { date: today, rounds: 0, seconds: 0 };
}

export function limitsOf(limits: ArcadeLimits | undefined): ArcadeLimits {
  return limits ?? DEFAULT_ARCADE_LIMITS;
}

export type LimitBlock = "rounds" | "time" | null;

export interface LimitStatus {
  roundsLeft: number;
  secondsLeft: number;
  blocked: LimitBlock;
  /** true bila sisa waktu tinggal 2 menit atau kurang (tapi belum habis). */
  timeWarning: boolean;
}

export function limitStatus(daily: ArcadeDaily, limits: ArcadeLimits): LimitStatus {
  const roundsLeft = Math.max(0, limits.maxRoundsPerDay - daily.rounds);
  const secondsLeft = Math.max(0, limits.maxMinutesPerDay * 60 - daily.seconds);
  const blocked: LimitBlock = secondsLeft <= 0 ? "time" : roundsLeft <= 0 ? "rounds" : null;
  return { roundsLeft, secondsLeft, blocked, timeWarning: secondsLeft > 0 && secondsLeft <= 120 };
}

/** "12:05" untuk sisa detik. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Tutup Buku Bulanan. Urutan: (1) pastikan tabungan wajib terkunci aman di Brankas, (2) hitung surplus
 * operasional, (3) bagi surplus sesuai kebijakan Supervisor: ke Brankas (`savedToVaultAmount`, dapat bonus)
 * dan/atau dibawa ke siklus berikutnya (`rolledOverAmount` → `carriedOverBalance`).
 */
import { cycleKeyOf, prevCycleKey } from "./cycle";
import type { MonthlyClosing, RolloverPolicy } from "./types";

export const closingId = (userId: string, cycleKey: string) => `mc-${userId}-${cycleKey}`;

export interface ClosingFigures {
  /** Uang sisa setelah pengeluaran pribadi dan semua setoran celengan. */
  cashLeft: number;
  /** Setoran tambahan yang dibutuhkan agar tabungan wajib genap. */
  topUp: number;
  mandatorySecured: number;
  mandatoryComplete: boolean;
  surplus: number;
}

export function computeClosingFigures(a: { monthlyCash: number; mandatorySavingsTarget: number; ownSpent: number; savedInCycle: number }): ClosingFigures {
  const cashLeft = a.monthlyCash - a.ownSpent - a.savedInCycle;
  const shortfall = Math.max(0, a.mandatorySavingsTarget - a.savedInCycle);
  const topUp = Math.min(shortfall, Math.max(0, cashLeft));
  const mandatorySecured = a.savedInCycle + topUp;
  return {
    cashLeft,
    topUp,
    mandatorySecured,
    mandatoryComplete: mandatorySecured >= a.mandatorySavingsTarget,
    surplus: Math.max(0, cashLeft - topUp),
  };
}

/** Bagi surplus menurut kebijakan. `chosenVault` hanya dipakai pada `split_choice`. */
export function splitSurplus(policy: RolloverPolicy, surplus: number, chosenVault?: number): { savedToVaultAmount: number; rolledOverAmount: number } {
  const s = Math.max(0, Math.round(surplus));
  if (policy === "auto_vault") return { savedToVaultAmount: s, rolledOverAmount: 0 };
  if (policy === "auto_carryover") return { savedToVaultAmount: 0, rolledOverAmount: s };
  const vault = Math.min(s, Math.max(0, Math.round(chosenVault ?? Math.floor(s / 2))));
  return { savedToVaultAmount: vault, rolledOverAmount: s - vault };
}

/** Bonus poin gamifikasi: tiap Rp10.000 yang diamankan ke Brankas = 5 poin (maks. 150) + 20 poin bila tabungan wajib genap. */
export function closingBonusPoints(savedToVaultAmount: number, mandatoryComplete: boolean): number {
  return Math.min(150, Math.floor(Math.max(0, savedToVaultAmount) / 10_000) * 5) + (mandatoryComplete ? 20 : 0);
}

export function buildClosing(a: {
  userId: string;
  cycleKey: string;
  policy: RolloverPolicy;
  monthlyCash: number;
  mandatorySavingsTarget: number;
  figures: ClosingFigures;
  ownSpent: number;
  split: { savedToVaultAmount: number; rolledOverAmount: number };
  byId: string;
  nowIso: string;
}): MonthlyClosing {
  return {
    id: closingId(a.userId, a.cycleKey),
    userId: a.userId,
    cycleKey: a.cycleKey,
    policy: a.policy,
    monthlyCash: a.monthlyCash,
    mandatorySavingsTarget: a.mandatorySavingsTarget,
    mandatorySecured: a.figures.mandatorySecured,
    ownSpent: a.ownSpent,
    surplus: a.figures.surplus,
    savedToVaultAmount: a.split.savedToVaultAmount,
    rolledOverAmount: a.split.rolledOverAmount,
    bonusPoints: closingBonusPoints(a.split.savedToVaultAmount, a.figures.mandatoryComplete),
    closedAt: a.nowIso,
    closedBy: a.byId,
  };
}

export const isCycleClosed = (closings: readonly MonthlyClosing[], userId: string, cycleKey: string): boolean =>
  closings.some((c) => c.userId === userId && c.cycleKey === cycleKey);

/** Saldo bawaan yang masuk ke siklus `cycleKey` = sisa yang dibawa dari tutup buku siklus sebelumnya. */
export function carriedOverBalance(closings: readonly MonthlyClosing[], userId: string, cycleKey: string): number {
  const prev = closings.find((c) => c.userId === userId && c.cycleKey === prevCycleKey(cycleKey));
  return prev ? Math.max(0, prev.rolledOverAmount) : 0;
}

/**
 * Siklus yang menunggu ditutup: siklus SEBELUMNYA bila sudah berganti siklus, belum ditutup, dan ada aktivitas.
 * Tombol "Tutup Buku Akhir Bulan" boleh menutup siklus berjalan secara manual.
 */
export function pendingClosureKey(a: { today: string; startDay: number; closings: readonly MonthlyClosing[]; userId: string; hasActivityIn: (cycleKey: string) => boolean }): string | null {
  const prev = prevCycleKey(cycleKeyOf(a.today, a.startDay));
  if (isCycleClosed(a.closings, a.userId, prev)) return null;
  return a.hasActivityIn(prev) ? prev : null;
}

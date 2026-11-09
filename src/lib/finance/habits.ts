/**
 * Lima fitur edukasi Versi 5.6 (bagian logika murni): uang aman hari ini, masa tunggu keinginan 48 jam,
 * utang patungan teman, pinjaman darurat Brankas, dan Cocokkan Saldo Nyata.
 */
import { addDaysStr } from "../dates";
import { isCounted } from "./ledger";
import type { CashReconciliation, FinTx, VaultLoan, WishlistItem } from "./types";

/* ───────── (b) uang aman hari ini ───────── */

/** Sisa dompet Makan & Harian dibagi sisa hari siklus (termasuk hari ini). `null` bila dompet belum ada. */
export function safeToSpendToday(a: { foodWalletBalance: number | null; daysLeft: number }): number | null {
  if (a.foodWalletBalance === null) return null;
  return Math.max(0, Math.floor(a.foodWalletBalance / Math.max(1, a.daysLeft)));
}

/* ───────── (b) masa tunggu keinginan ───────── */

export const COOLING_THRESHOLD = 50_000;
export const COOLING_HOURS = 48;
export const SELF_CONTROL_BONUS_POINTS = 25;

export function needsCoolingOff(a: { type: string; need_or_want: string; amount: number }): boolean {
  return a.type === "expense" && a.need_or_want === "want" && a.amount >= COOLING_THRESHOLD;
}

export const coolUntilIso = (createdIso: string): string => new Date(Date.parse(createdIso) + COOLING_HOURS * 3600 * 1000).toISOString();

export const isCoolingDone = (w: Pick<WishlistItem, "coolUntil">, nowIso: string): boolean => Date.parse(nowIso) >= Date.parse(w.coolUntil);

export function hoursLeft(w: Pick<WishlistItem, "coolUntil">, nowIso: string): number {
  return Math.max(0, Math.ceil((Date.parse(w.coolUntil) - Date.parse(nowIso)) / 3600000));
}

/** Membatalkan SETELAH 48 jam = pengendalian diri sungguhan → bonus poin + lencana. Membatalkan lebih awal tidak dapat bonus. */
export function cancelOutcome(w: WishlistItem, nowIso: string): { cancelledAfterCooling: boolean; bonusPoints: number } {
  const done = isCoolingDone(w, nowIso);
  return { cancelledAfterCooling: done, bonusPoints: done && !w.bonusAwarded ? SELF_CONTROL_BONUS_POINTS : 0 };
}

/* ───────── (c) utang patungan ───────── */

export const openFriendDebts = (txs: readonly FinTx[], userId: string): FinTx[] =>
  txs.filter((t) => t.user_id === userId && t.type === "expense" && t.isReimbursable && !t.reimbursedAt && isCounted(t));

export const friendDebtTotal = (txs: readonly FinTx[], userId: string): number => openFriendDebts(txs, userId).reduce((s, t) => s + Number(t.total_amount), 0);

/* ───────── (e) pinjaman darurat Brankas ───────── */

export type VaultDipPlan =
  | { ok: true; fromEmergency: number; fromVault: number; needsLoan: boolean }
  | { ok: false; error: string };

/** Dompet Darurat dipakai lebih dulu; kekurangannya baru boleh diambil dari Brankas sebagai pinjaman internal. */
export function planVaultDip(a: { emergencyBalance: number; vaultBalance: number; amount: number }): VaultDipPlan {
  if (!Number.isInteger(a.amount) || a.amount <= 0) return { ok: false, error: "Jumlah harus lebih dari Rp0." };
  const fromEmergency = Math.min(Math.max(0, a.emergencyBalance), a.amount);
  const fromVault = a.amount - fromEmergency;
  if (fromVault > a.vaultBalance) return { ok: false, error: "Saldo Brankas tidak cukup untuk jumlah ini." };
  return { ok: true, fromEmergency, fromVault, needsLoan: fromVault > 0 };
}

export function buildVaultLoan(a: {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  mode: "recovery" | "approval";
  nowIso: string;
}): VaultLoan | { error: string } {
  if (a.reason.trim().length < 5) return { error: "Tulis alasan darurat dengan jelas (minimal 5 huruf)." };
  return {
    id: a.id,
    userId: a.userId,
    amount: Math.round(a.amount),
    reason: a.reason.trim().slice(0, 160),
    recoveryTarget: Math.round(a.amount),
    recovered: 0,
    status: "open",
    needsApproval: a.mode === "approval",
    createdAt: a.nowIso,
    updatedAt: a.nowIso,
  };
}

export function applyRecovery(l: VaultLoan, amount: number, nowIso: string): VaultLoan {
  const recovered = Math.min(l.recoveryTarget, l.recovered + Math.max(0, Math.round(amount)));
  return { ...l, recovered, status: recovered >= l.recoveryTarget ? "repaid" : l.status, updatedAt: nowIso };
}

/* ───────── (a) Cocokkan Saldo Nyata ───────── */

export const ADJUSTMENT_CATEGORY = "Penyesuaian Kas Tak Tercatat";

export function buildReconciliation(a: { id: string; userId: string; date: string; recordedCash: number; actualCash: number; nowIso: string }): CashReconciliation {
  return {
    id: a.id,
    userId: a.userId,
    date: a.date,
    recordedCash: Math.round(a.recordedCash),
    actualCash: Math.round(a.actualCash),
    difference: Math.round(a.actualCash - a.recordedCash),
    createdAt: a.nowIso,
    updatedAt: a.nowIso,
  };
}

/** Transaksi penyesuaian. Tidak membawa poin/XP dan tidak dihitung sebagai pencatatan harian (streak aman). */
export function buildAdjustmentTx(a: { id: string; userId: string; difference: number; walletId?: string; date: string; nowIso: string }): FinTx & Record<string, unknown> {
  const gain = a.difference > 0;
  return {
    id: a.id,
    user_id: a.userId,
    type: "adjustment",
    category: ADJUSTMENT_CATEGORY,
    need_or_want: "want",
    title: gain ? "Penyesuaian Kas: uang lebih dari catatan" : "Penyesuaian Kas: uang kurang dari catatan",
    total_amount: Math.abs(Math.round(a.difference)),
    is_itemized: false,
    points_earned: 0,
    xp_earned: 0,
    transaction_date: a.date,
    created_at: a.nowIso,
    items: [],
    adjustmentDirection: gain ? "gain" : "loss",
    ...(a.walletId ? { walletId: a.walletId } : {}),
  };
}

export interface LeakStats {
  lossTotal: number;
  spentTotal: number;
  leakPercent: number;
  count: number;
}

/** Kebocoran mikro 7 hari terakhir: selisih "uang hilang" dibanding total pengeluaran + kebocoran. */
export function weeklyLeakStats(txs: readonly FinTx[], userId: string, today: string): LeakStats {
  const from = addDaysStr(today, -6);
  let loss = 0;
  let spent = 0;
  let count = 0;
  for (const t of txs) {
    if (t.user_id !== userId || !isCounted(t) || t.transaction_date < from || t.transaction_date > today) continue;
    if (t.type === "adjustment" && t.adjustmentDirection !== "gain") {
      loss += Number(t.total_amount);
      count += 1;
    } else if (t.type === "expense") spent += Number(t.total_amount);
  }
  const base = spent + loss;
  return { lossTotal: loss, spentTotal: spent, count, leakPercent: base > 0 ? Math.round((loss / base) * 1000) / 10 : 0 };
}

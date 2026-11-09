/**
 * Pemasukan dua arah + rekonsiliasi pintar 72 jam.
 *  - Supervisor mengisi  → `createdByRole:'supervisor'`, `verified`, saldo langsung naik.
 *  - Anak mengisi sendiri → `createdByRole:'child'`, `pending_supervisor`, saldo naik optimistis,
 *    masuk Antrean Konfirmasi Supervisor.
 *  - Bila Supervisor mencatat kiriman uang yang cocok (jumlah sama atau selisih ≤10%) dengan catatan anak
 *    dalam 72 jam, jangan dihitung dua kali: cukup tandai catatan anak sebagai `verified`.
 */
import { longDateLabel } from "../dates";
import type { FinTx } from "./types";

export const RECONCILE_WINDOW_MS = 72 * 3600 * 1000;
export const RECONCILE_TOLERANCE = 0.1;

export const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export function amountsMatch(a: number, b: number, tolerance = RECONCILE_TOLERANCE): boolean {
  if (!(a > 0) || !(b > 0)) return false;
  if (a === b) return true;
  return Math.abs(a - b) / Math.max(a, b) <= tolerance;
}

export const isPendingChildIncome = (t: FinTx): boolean =>
  t.type === "income" && t.createdByRole === "child" && t.verificationStatus === "pending_supervisor";

/**
 * Cari catatan pemasukan anak yang kemungkinan sama dengan kiriman Supervisor.
 * Urutan prioritas: jumlah persis sama → selisih jumlah terkecil → waktu paling dekat.
 */
export function findReconcileCandidate(sup: { amount: number; nowIso: string; userId: string }, txs: readonly FinTx[]): FinTx | null {
  const now = Date.parse(sup.nowIso);
  let best: { tx: FinTx; exact: boolean; diff: number; gap: number } | null = null;
  for (const t of txs) {
    if (t.user_id !== sup.userId || !isPendingChildIncome(t)) continue;
    const gap = Math.abs(now - Date.parse(t.created_at));
    if (!Number.isFinite(gap) || gap > RECONCILE_WINDOW_MS) continue;
    const amt = Number(t.total_amount);
    if (!amountsMatch(sup.amount, amt)) continue;
    const cand = { tx: t, exact: amt === sup.amount, diff: Math.abs(amt - sup.amount), gap };
    if (
      !best ||
      (cand.exact && !best.exact) ||
      (cand.exact === best.exact && (cand.diff < best.diff || (cand.diff === best.diff && cand.gap < best.gap)))
    ) {
      best = cand;
    }
  }
  return best?.tx ?? null;
}

/** Kalimat konfirmasi untuk modal Supervisor. */
export function reconcilePrompt(child: Pick<FinTx, "total_amount" | "transaction_date">): string {
  return `Anak sudah mencatat pemasukan ${rupiah(Number(child.total_amount))} pada ${longDateLabel(child.transaction_date)}. Apakah ini kiriman uang yang sama?`;
}

/**
 * Tandai catatan anak sebagai terverifikasi tanpa membuat transaksi baru. Jumlah mengikuti angka Supervisor
 * (sumber kebenaran); jumlah yang diklaim anak disimpan di `claimedAmount` untuk jejak.
 */
export function verifiedPatch(child: FinTx, supervisorAmount: number | undefined, byId: string, nowIso: string): Partial<FinTx> & Record<string, unknown> {
  const amount = supervisorAmount && supervisorAmount > 0 ? Math.round(supervisorAmount) : Number(child.total_amount);
  return {
    verificationStatus: "verified",
    total_amount: amount,
    ...(amount !== Number(child.total_amount) ? { claimedAmount: Number(child.total_amount) } : {}),
    verifiedAt: nowIso,
    verifiedBy: byId,
  };
}

/** Pemasukan baru yang dicatat Supervisor (tanpa poin/XP — hadiah hanya untuk catatan anak sendiri). */
export function buildSupervisorIncome(a: {
  userId: string;
  supervisorId: string;
  amount: number;
  title: string;
  category: string;
  date: string;
  nowIso: string;
  id: string;
}): FinTx & Record<string, unknown> {
  return {
    id: a.id,
    user_id: a.userId,
    type: "income",
    category: a.category,
    need_or_want: "income",
    title: a.title.trim() || a.category,
    total_amount: Math.round(a.amount),
    is_itemized: false,
    points_earned: 0,
    xp_earned: 0,
    transaction_date: a.date,
    created_at: a.nowIso,
    items: [],
    createdByRole: "supervisor",
    verificationStatus: "verified",
    createdBy: a.supervisorId,
  };
}

/** Peringkat verifikasi untuk merge: terverifikasi mengalahkan ditolak, ditolak mengalahkan menunggu. */
export const VERIFICATION_RANK: Record<string, number> = { pending_supervisor: 0, rejected: 1, verified: 2 };

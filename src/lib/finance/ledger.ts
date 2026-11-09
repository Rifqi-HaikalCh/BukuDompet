/**
 * Hitungan dasar buku kas Versi 5.6. Murni: menerima daftar transaksi, mengembalikan angka.
 * Aturan kunci:
 *  - Pemasukan yang ditolak Supervisor (`rejected`) tidak dihitung; yang masih `pending_supervisor` DIHITUNG
 *    (saldo optimistis) supaya anak tidak merasa catatannya hilang.
 *  - Pengeluaran dari dompet hibah dipisah: tidak masuk laju pembakaran bulanan maupun skor detektif.
 *  - Pengeluaran "patungan" yang sudah diganti teman (`reimbursedAt`) tidak mengurangi saldo lagi.
 */
import type { FinTx, SubWallet } from "./types";

export const isCounted = (t: Pick<FinTx, "verificationStatus">): boolean => t.verificationStatus !== "rejected";

/** Nilai yang benar-benar mengurangi saldo (patungan yang sudah diganti = 0). */
export function netAmount(t: Pick<FinTx, "type" | "total_amount" | "isReimbursable" | "reimbursedAt">): number {
  const n = Number(t.total_amount) || 0;
  if (t.type === "expense" && t.isReimbursable && t.reimbursedAt) return 0;
  return n;
}

export function grantWalletIds(wallets: readonly SubWallet[]): Set<string> {
  return new Set(wallets.filter((w) => w.type === "grant").map((w) => w.id));
}

export function isGrantTx(t: Pick<FinTx, "walletId" | "linkedGrantId">, grantIds: ReadonlySet<string>): boolean {
  return Boolean(t.linkedGrantId) || (t.walletId !== undefined && grantIds.has(t.walletId));
}

export interface DateRange {
  start: string;
  end: string;
}

export const inRange = (date: string, r?: DateRange): boolean => !r || (date >= r.start && date <= r.end);

export interface CycleTotals {
  income: number;
  /** Pengeluaran uang pribadi (di luar hibah), sudah bersih dari patungan yang diganti, plus penyesuaian kas. */
  ownSpent: number;
  grantSpent: number;
  saved: number;
  adjustmentLoss: number;
  adjustmentGain: number;
}

export function cycleTotals(txs: readonly FinTx[], userId: string, range: DateRange | undefined, wallets: readonly SubWallet[]): CycleTotals {
  const grantIds = grantWalletIds(wallets);
  const out: CycleTotals = { income: 0, ownSpent: 0, grantSpent: 0, saved: 0, adjustmentLoss: 0, adjustmentGain: 0 };
  for (const t of txs) {
    if (t.user_id !== userId || !isCounted(t) || !inRange(t.transaction_date, range)) continue;
    const amt = Number(t.total_amount) || 0;
    switch (t.type) {
      case "income":
        out.income += amt;
        break;
      case "expense":
        if (isGrantTx(t, grantIds)) out.grantSpent += amt;
        else out.ownSpent += netAmount(t);
        break;
      case "saving":
        out.saved += amt;
        break;
      case "adjustment":
        if (t.adjustmentDirection === "gain") out.adjustmentGain += amt;
        else out.adjustmentLoss += amt;
        break;
    }
  }
  out.ownSpent += out.adjustmentLoss - out.adjustmentGain;
  return out;
}

/**
 * Uang pribadi yang seharusnya ada di tangan (seluruh waktu, di luar hibah): pemasukan − pengeluaran bersih
 * − setoran celengan ± penyesuaian. Dasar fitur "Cocokkan Saldo Nyata".
 */
export function recordedCash(txs: readonly FinTx[], userId: string, wallets: readonly SubWallet[]): number {
  const t = cycleTotals(txs, userId, undefined, wallets);
  return t.income - t.ownSpent - t.saved;
}

/**
 * Catatan yang layak dinilai Detektif Kas: tanpa penyesuaian kas, pemasukan yang ditolak, pengeluaran dari
 * dompet hibah, dan pengeluaran patungan teman.
 */
export function scoreableTransactions<T extends Pick<FinTx, "type" | "verificationStatus" | "linkedGrantId" | "isReimbursable">>(list: readonly T[]): T[] {
  return list.filter(
    (t) => t.type !== "adjustment" && t.verificationStatus !== "rejected" && !(t.type === "expense" && (t.linkedGrantId || t.isReimbursable)),
  );
}

/**
 * Aturan edit/hapus transaksi (Versi 5.4).
 * Hanya pemilik akun yang boleh mengubah, hanya untuk transaksi bertanggal HARI INI, dan hanya
 * pemasukan/pengeluaran biasa. Tabungan Celengan dan pemasukan hasil pencairan Poin dibuat sistem
 * sehingga dikunci agar saldo celengan dan tiket tidak melenceng.
 */
import type { TransactionRecord } from "@/lib/spending-detective";

export const TX_TITLE_MAX = 80;

/** Alasan transaksi tidak bisa diubah, atau `null` bila boleh. */
export function transactionLockReason(
  tx: Pick<TransactionRecord, "id" | "user_id" | "type" | "transaction_date">,
  ownerId: string,
  todayStr: string
): string | null {
  if (tx.user_id !== ownerId) return "Hanya pemilik catatan yang bisa mengubahnya.";
  if (tx.transaction_date !== todayStr) return "Catatan hari sebelumnya sudah terkunci dan tidak bisa diubah.";
  if (tx.type === "saving") return "Tabungan dikelola dari menu Celengan.";
  if (tx.id.startsWith("tx-cashout-")) return "Pemasukan dari pencairan Poin dibuat otomatis dan tidak bisa diubah.";
  return null;
}

export function rewardLedgerKey(userId: string, dateStr: string): string {
  return `${userId}:${dateStr}`;
}

/**
 * Versi 5.6 — tipe data keuangan berlapis (anggaran, sub-dompet, hibah, tutup buku, dll).
 * Semua tipe berupa objek JSON polos agar langsung bisa disinkronkan sebagai dokumen ber-`id`.
 * File ini tidak mengimpor apa pun (aman dipakai di Node untuk pengujian).
 */

export type VerificationStatus = "verified" | "pending_supervisor" | "rejected";
export type CreatedByRole = "child" | "supervisor";

export type WalletType = "savings" | "operational" | "emergency" | "commitment" | "grant";
export type RolloverPolicy = "split_choice" | "auto_vault" | "auto_carryover";
export type EffectiveScope = "current_month" | "next_month";

/** Bagian transaksi yang dibaca logika keuangan. `TransactionRecord` memenuhi bentuk ini secara struktural. */
export interface FinTx {
  id: string;
  user_id: string;
  type: "income" | "expense" | "saving" | "adjustment";
  category: string;
  need_or_want: "need" | "want" | "income";
  title: string;
  total_amount: number;
  transaction_date: string; // YYYY-MM-DD
  created_at: string; // ISO
  walletId?: string;
  verificationStatus?: VerificationStatus;
  createdByRole?: CreatedByRole;
  linkedGrantId?: string;
  isReimbursable?: boolean;
  reimbursedAt?: string;
  /** Hanya untuk `type: "adjustment"`: "loss" = uang nyata lebih sedikit dari catatan, "gain" = lebih banyak. */
  adjustmentDirection?: "loss" | "gain";
}

export interface BudgetSnapshot {
  monthlyBudget: number;
  mandatorySavingsTarget: number;
  /** Tanggal mulai siklus, 1–28. */
  cycleStartDay: number;
}

export interface BudgetConfig extends BudgetSnapshot {
  /** `bc-<userId>` — satu dokumen per anak. */
  id: string;
  userId: string;
  rolloverPolicy: RolloverPolicy;
  effectiveScope: EffectiveScope;
  /** Kunci siklus (`YYYY-MM`) mulai berlakunya nilai di atas. Sebelumnya dipakai `previous`. */
  effectiveFromCycle: string;
  previous?: BudgetSnapshot;
  updatedAt: string;
  updatedBy: string;
}

export interface SubWallet {
  /** Deterministik: `sw-<userId>-<key>` (dompet bawaan) atau `sw-<userId>-grant-<grantId>`. */
  id: string;
  userId: string;
  key: string;
  name: string;
  type: WalletType;
  /** Jumlah yang dialokasikan ke dompet ini untuk siklus `cycleKey` (dompet hibah: jumlah disetujui). */
  allocated: number;
  cycleKey: string;
  /** Kategori pengeluaran yang otomatis diarahkan ke dompet ini. */
  categories: string[];
  isLocked?: boolean;
  /** Dompet komitmen terkunci sampai tanggal ini (`YYYY-MM-DD`). */
  lockUntil?: string;
  linkedGrantId?: string;
  archived?: boolean;
  /** Cara dompet dibuka: rekomendasi sistem, manual oleh anak, atau dompet lama (dibuat otomatis sebelum V5.6.1). */
  openedVia?: "recommendation" | "manual" | "legacy";
  openedAt?: string;
  openedBy?: string;
  /** Geseran saldo terakhir yang menyentuh dompet ini (alasan singkat wajib). */
  lastTransfer?: { fromId: string; toId: string; amount: number; reason: string; at: string };
  createdAt: string;
  updatedAt: string;
}

export interface GrantItem {
  label: string;
  amount: number;
}

export type GrantStatus = "pending" | "disbursed" | "rejected" | "settled";

export interface GrantRequest {
  id: string;
  userId: string;
  title: string;
  category: string;
  items: GrantItem[];
  requestedAmount: number;
  note: string;
  /** Foto bukti/rencana (data URL WebP). */
  proofPhoto?: string;
  status: GrantStatus;
  approvedAmount?: number;
  supervisorNote?: string;
  rejectReason?: string;
  decidedAt?: string;
  decidedBy?: string;
  walletId?: string;
  /** Penyelesaian oleh anak. */
  receiptPhoto?: string;
  leftoverAmount?: number;
  leftoverAction?: "vault" | "return";
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyClosing {
  /** Deterministik: `mc-<userId>-<cycleKey>` supaya tutup buku tidak bisa ganda. */
  id: string;
  userId: string;
  cycleKey: string;
  policy: RolloverPolicy;
  monthlyCash: number;
  mandatorySavingsTarget: number;
  /** Jumlah tabungan wajib yang berhasil diamankan ke Brankas pada siklus ini. */
  mandatorySecured: number;
  ownSpent: number;
  surplus: number;
  savedToVaultAmount: number;
  rolledOverAmount: number;
  bonusPoints: number;
  closedAt: string;
  closedBy: string;
}

export type WishlistStatus = "cooling" | "bought" | "cancelled";

export interface WishlistItem {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  need_or_want: "need" | "want";
  walletId?: string;
  createdAt: string;
  /** ISO — setelah waktu ini keputusan boleh diambil. */
  coolUntil: string;
  status: WishlistStatus;
  resolvedAt?: string;
  /** true bila dibatalkan SETELAH masa tunggu selesai (layak bonus pengendalian diri). */
  cancelledAfterCooling?: boolean;
  bonusAwarded?: boolean;
  updatedAt: string;
}

export interface CashReconciliation {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  recordedCash: number;
  actualCash: number;
  /** actualCash − recordedCash. Negatif = ada uang tak tercatat yang keluar. */
  difference: number;
  adjustmentTxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultLoan {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  /** Misi pemulihan: target yang harus dikembalikan ke Brankas. */
  recoveryTarget: number;
  recovered: number;
  status: "open" | "repaid" | "rejected";
  /** Pinjaman darurat butuh persetujuan Supervisor bila anak tidak memilih misi pemulihan. */
  needsApproval: boolean;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

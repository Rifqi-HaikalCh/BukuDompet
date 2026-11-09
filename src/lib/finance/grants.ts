/**
 * Hibah bertujuan (earmarked grant): anak mengajukan permintaan uang untuk keperluan tertentu, Supervisor
 * menyetujui penuh / menyesuaikan jumlah / menolak, lalu uangnya masuk ke dompet hibah khusus.
 * Status: pending → disbursed | rejected (Supervisor) → settled (anak, dengan foto struk).
 */
import { grantWalletIdFor } from "./wallets";
import type { GrantItem, GrantRequest, GrantStatus, SubWallet } from "./types";

export const GRANT_CATEGORIES = ["Sekolah & Perlengkapan", "Kegiatan & Acara", "Kesehatan", "Hobi & Peralatan", "Lainnya"];

/** Peringkat status untuk merge: status lanjut tidak boleh ditimpa salinan lama. */
export const GRANT_RANK: Record<GrantStatus, number> = { pending: 0, rejected: 1, disbursed: 1, settled: 2 };

export const itemsTotal = (items: readonly GrantItem[]): number =>
  items.reduce((s, i) => s + (Number.isFinite(i.amount) && i.amount > 0 ? Math.round(i.amount) : 0), 0);

export function validateGrantInput(i: { title: string; category: string; items: readonly GrantItem[] }): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (i.title.trim().length < 3) errors.title = "Tulis judul permintaan (minimal 3 huruf).";
  if (!i.category.trim()) errors.category = "Pilih kategori.";
  const valid = i.items.filter((x) => x.label.trim() && x.amount > 0);
  if (valid.length === 0) errors.items = "Tambahkan minimal satu rincian barang beserta harganya.";
  else if (valid.length !== i.items.length) errors.items = "Setiap rincian harus punya nama dan harga lebih dari Rp0.";
  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildGrantRequest(a: {
  id: string;
  userId: string;
  title: string;
  category: string;
  items: readonly GrantItem[];
  note: string;
  proofPhoto?: string;
  nowIso: string;
}): GrantRequest {
  const items = a.items.filter((x) => x.label.trim() && x.amount > 0).map((x) => ({ label: x.label.trim().slice(0, 60), amount: Math.round(x.amount) }));
  return {
    id: a.id,
    userId: a.userId,
    title: a.title.trim().slice(0, 80),
    category: a.category,
    items,
    requestedAmount: itemsTotal(items),
    note: a.note.trim().slice(0, 300),
    ...(a.proofPhoto ? { proofPhoto: a.proofPhoto } : {}),
    status: "pending",
    createdAt: a.nowIso,
    updatedAt: a.nowIso,
  };
}

export type GrantDecision =
  | { ok: true; grant: GrantRequest; wallet?: SubWallet }
  | { ok: false; error: string };

export function approveGrant(g: GrantRequest, a: { approvedAmount: number; note: string; byId: string; nowIso: string }): GrantDecision {
  if (g.status !== "pending") return { ok: false, error: "Permintaan ini sudah diputuskan." };
  const amount = Math.round(a.approvedAmount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Jumlah yang disetujui harus lebih dari Rp0." };
  const adjusted = amount !== g.requestedAmount;
  if (adjusted && a.note.trim().length < 3) return { ok: false, error: "Beri catatan singkat bila jumlah disesuaikan." };
  const walletId = grantWalletIdFor(g.userId, g.id);
  const grant: GrantRequest = {
    ...g,
    status: "disbursed",
    approvedAmount: amount,
    supervisorNote: a.note.trim().slice(0, 200),
    decidedAt: a.nowIso,
    decidedBy: a.byId,
    walletId,
    updatedAt: a.nowIso,
  };
  return { ok: true, grant, wallet: buildGrantWallet(grant, a.nowIso) };
}

export function rejectGrant(g: GrantRequest, a: { reason: string; byId: string; nowIso: string }): GrantDecision {
  if (g.status !== "pending") return { ok: false, error: "Permintaan ini sudah diputuskan." };
  if (a.reason.trim().length < 3) return { ok: false, error: "Alasan penolakan wajib diisi." };
  return { ok: true, grant: { ...g, status: "rejected", rejectReason: a.reason.trim().slice(0, 200), decidedAt: a.nowIso, decidedBy: a.byId, updatedAt: a.nowIso } };
}

/** Dompet hibah: tidak ikut pembagian zero-sum dan tidak terikat siklus. */
export function buildGrantWallet(g: GrantRequest, nowIso: string): SubWallet {
  return {
    id: g.walletId ?? grantWalletIdFor(g.userId, g.id),
    userId: g.userId,
    key: `grant-${g.id}`,
    name: `Kebutuhan: ${g.title}`,
    type: "grant",
    allocated: g.approvedAmount ?? 0,
    cycleKey: "grant",
    categories: [],
    linkedGrantId: g.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export type SettleResult = { ok: true; grant: GrantRequest; leftover: number } | { ok: false; error: string };

export function settleGrant(g: GrantRequest, a: { spent: number; receiptPhoto?: string; leftoverAction?: "vault" | "return"; nowIso: string }): SettleResult {
  if (g.status !== "disbursed") return { ok: false, error: "Pengajuan ini belum cair atau sudah diselesaikan." };
  if (!a.receiptPhoto) return { ok: false, error: "Unggah foto struk untuk menyelesaikan pengajuan." };
  const leftover = Math.max(0, (g.approvedAmount ?? 0) - Math.max(0, a.spent));
  if (leftover > 0 && !a.leftoverAction) return { ok: false, error: "Pilih sisa uang: masuk Brankas atau dikembalikan." };
  return {
    ok: true,
    leftover,
    grant: {
      ...g,
      status: "settled",
      receiptPhoto: a.receiptPhoto,
      leftoverAmount: leftover,
      ...(leftover > 0 && a.leftoverAction ? { leftoverAction: a.leftoverAction } : {}),
      settledAt: a.nowIso,
      updatedAt: a.nowIso,
    },
  };
}

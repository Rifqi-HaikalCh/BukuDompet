/**
 * Sub-dompet berjenjang yang bersifat ZERO-SUM: uang bulanan dibagi habis ke dompet-dompet; yang belum dibagi
 * tampil sebagai `unallocatedCash`. Saldo dompet = alokasi − pengeluaran bertanda `walletId` pada siklus itu.
 */
import { isCounted, netAmount, inRange, type DateRange } from "./ledger";
import type { FinTx, SubWallet, WalletType } from "./types";

export interface WalletPreset {
  key: string;
  name: string;
  type: WalletType;
  categories: string[];
  /** Bobot untuk "Bagi Otomatis" (jumlah semua dompet kebutuhan = 1). */
  weight: number;
  locked?: boolean;
}

export const FOOD_WALLET_KEY = "food";
export const EMERGENCY_WALLET_KEY = "emergency";
export const VAULT_WALLET_KEY = "vault";

export const WALLET_PRESETS: WalletPreset[] = [
  { key: "food", name: "Dompet Makan & Harian", type: "operational", categories: ["Makan Pokok", "Jajan/Cemilan", "Kopi/Minuman", "Kuliah/Alat Tulis"], weight: 0.35 },
  { key: "transport", name: "Dompet Transportasi", type: "operational", categories: ["Transportasi"], weight: 0.15 },
  { key: "bills", name: "Dompet Tagihan & Komitmen Rutin", type: "commitment", categories: ["Tagihan"], weight: 0.2, locked: true },
  { key: "emergency", name: "Dompet Dana Darurat", type: "emergency", categories: [], weight: 0.1 },
  { key: "fun", name: "Dompet Keinginan & Hiburan", type: "operational", categories: ["Nongkrong", "Belanja/Hiburan", "Lainnya"], weight: 0.2 },
];

export const walletIdFor = (userId: string, key: string) => `sw-${userId}-${key}`;
export const grantWalletIdFor = (userId: string, grantId: string) => `sw-${userId}-grant-${grantId}`;

/** Dompet yang ikut dalam pembagian uang bulanan (zero-sum). */
export const isAllocatable = (w: Pick<SubWallet, "type" | "archived">): boolean =>
  !w.archived && (w.type === "operational" || w.type === "emergency" || w.type === "commitment");

export function makeDefaultWallets(userId: string, cycleKey: string, mandatorySavingsTarget: number, nowIso: string): SubWallet[] {
  const wallets: SubWallet[] = WALLET_PRESETS.map((p) => ({
    id: walletIdFor(userId, p.key),
    userId,
    key: p.key,
    name: p.name,
    type: p.type,
    allocated: 0,
    cycleKey,
    categories: [...p.categories],
    ...(p.locked ? { isLocked: true } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
  wallets.push({
    id: walletIdFor(userId, VAULT_WALLET_KEY),
    userId,
    key: VAULT_WALLET_KEY,
    name: "Brankas Tabungan",
    type: "savings",
    allocated: mandatorySavingsTarget,
    cycleKey,
    categories: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  return wallets;
}

/** Dompet bawaan yang belum ada untuk pengguna ini (hidrasi malas untuk data lama; tidak mengubah saldo). */
export function missingDefaultWallets(existing: readonly SubWallet[], userId: string, cycleKey: string, mandatory: number, nowIso: string): SubWallet[] {
  const have = new Set(existing.filter((w) => w.userId === userId).map((w) => w.id));
  return makeDefaultWallets(userId, cycleKey, mandatory, nowIso).filter((w) => !have.has(w.id));
}

/** Dompet tujuan otomatis untuk sebuah kategori pengeluaran (bisa diubah pengguna). */
export function pickWalletForCategory(category: string, wallets: readonly SubWallet[], userId?: string): SubWallet | undefined {
  const usable = wallets.filter((w) => !w.archived && (w.type === "operational" || w.type === "commitment") && (!userId || w.userId === userId));
  return usable.find((w) => w.categories.includes(category)) ?? usable.find((w) => w.key === FOOD_WALLET_KEY) ?? usable[0];
}

/** Nominal yang sudah terpakai dari dompet ini (hanya hitungan berdasarkan `walletId`). */
export function walletSpent(w: Pick<SubWallet, "id" | "type">, txs: readonly FinTx[], range?: DateRange): number {
  let sum = 0;
  const bounded = w.type === "grant" ? undefined : range;
  for (const t of txs) {
    if (t.walletId !== w.id || !isCounted(t) || !inRange(t.transaction_date, bounded)) continue;
    if (t.type === "expense") sum += netAmount(t);
    else if (t.type === "adjustment") sum += (t.adjustmentDirection === "gain" ? -1 : 1) * (Number(t.total_amount) || 0);
  }
  return sum;
}

export const walletBalance = (w: SubWallet, txs: readonly FinTx[], range?: DateRange): number => w.allocated - walletSpent(w, txs, range);

export function totalAllocated(wallets: readonly SubWallet[], cycleKey: string, userId?: string): number {
  return wallets
    .filter((w) => isAllocatable(w) && w.cycleKey === cycleKey && (!userId || w.userId === userId))
    .reduce((s, w) => s + w.allocated, 0);
}

/** Uang bulanan yang tersedia: yang lebih besar antara anggaran dan pemasukan siklus ini, ditambah saldo bawaan. */
export function monthlyCashOf(a: { monthlyBudget: number; incomeInCycle: number; carriedOver: number }): number {
  return Math.max(a.monthlyBudget, a.incomeInCycle) + Math.max(0, a.carriedOver);
}

export function unallocatedCash(a: { monthlyCash: number; mandatorySavingsTarget: number; wallets: readonly SubWallet[]; cycleKey: string; userId?: string }): number {
  return a.monthlyCash - a.mandatorySavingsTarget - totalAllocated(a.wallets, a.cycleKey, a.userId);
}

export type WalletResult = { ok: true; wallets: SubWallet[] } | { ok: false; error: string };

const bump = (w: SubWallet, patch: Partial<SubWallet>, nowIso: string): SubWallet => ({ ...w, ...patch, updatedAt: nowIso });

/** Tambah (atau kurangi, bila negatif) alokasi satu dompet dari uang yang belum dibagi. */
export function allocateToWallet(
  wallets: readonly SubWallet[],
  walletId: string,
  delta: number,
  ctx: { monthlyCash: number; mandatorySavingsTarget: number; cycleKey: string; nowIso: string; balance?: number },
): WalletResult {
  const w = wallets.find((x) => x.id === walletId);
  if (!w || !isAllocatable(w)) return { ok: false, error: "Dompet tidak ditemukan atau tidak bisa diisi." };
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: "Jumlah harus bilangan bulat dan bukan nol." };
  const free = unallocatedCash({ monthlyCash: ctx.monthlyCash, mandatorySavingsTarget: ctx.mandatorySavingsTarget, wallets, cycleKey: ctx.cycleKey, userId: w.userId });
  if (delta > 0 && delta > free) return { ok: false, error: `Uang yang belum dibagi hanya Rp${Math.max(0, free).toLocaleString("id-ID")}.` };
  if (delta < 0 && ctx.balance !== undefined && -delta > ctx.balance) return { ok: false, error: "Alokasi tidak bisa dikurangi di bawah uang yang sudah terpakai." };
  if (w.allocated + delta < 0) return { ok: false, error: "Alokasi tidak boleh negatif." };
  return { ok: true, wallets: wallets.map((x) => (x.id === walletId ? bump(x, { allocated: x.allocated + delta, cycleKey: ctx.cycleKey }, ctx.nowIso) : x)) };
}

/** Usulan "Bagi Otomatis": bobot bawaan, dibulatkan ke bawah per Rp1.000 sehingga tidak pernah melebihi sisa. */
export function suggestAutoSplit(free: number, wallets: readonly SubWallet[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!(free > 0)) return out;
  for (const p of WALLET_PRESETS) {
    const w = wallets.find((x) => x.key === p.key && isAllocatable(x));
    if (!w) continue;
    const amt = Math.floor((free * p.weight) / 1000) * 1000;
    if (amt > 0) out[w.id] = amt;
  }
  return out;
}

export function applyAutoSplit(wallets: readonly SubWallet[], split: Record<string, number>, cycleKey: string, nowIso: string): SubWallet[] {
  return wallets.map((w) => (split[w.id] ? bump(w, { allocated: w.allocated + split[w.id], cycleKey }, nowIso) : w));
}

export const isWalletLocked = (w: Pick<SubWallet, "isLocked" | "lockUntil">, today: string): boolean =>
  Boolean(w.isLocked) && !(w.lockUntil && today >= w.lockUntil);

export type ExpenseCheck =
  | { ok: true }
  | { ok: false; code: "insufficient"; shortBy: number }
  | { ok: false; code: "locked"; message: string }
  | { ok: false; code: "invalid"; message: string };

/** Boleh tidaknya sebuah pengeluaran memakai dompet ini. */
export function checkExpense(a: { wallet: SubWallet | undefined; amount: number; balance: number; category: string; today: string }): ExpenseCheck {
  const { wallet, amount, balance, category, today } = a;
  if (!wallet || wallet.archived) return { ok: false, code: "invalid", message: "Pilih dompet untuk pengeluaran ini." };
  if (wallet.type === "savings") return { ok: false, code: "invalid", message: "Brankas Tabungan tidak dipakai untuk jajan. Tarik lewat menu Celengan." };
  if (!(amount > 0)) return { ok: false, code: "invalid", message: "Jumlah harus lebih dari Rp0." };
  if (wallet.type === "commitment" && isWalletLocked(wallet, today) && !wallet.categories.includes(category)) {
    return { ok: false, code: "locked", message: `${wallet.name} terkunci untuk tagihan rutin. Pakai dompet lain, atau tunggu jatuh tempo.` };
  }
  if (amount > balance) return { ok: false, code: "insufficient", shortBy: amount - balance };
  return { ok: true };
}

/** Geser saldo antar-dompet kebutuhan (zero-sum: jumlah total alokasi tetap). Alasan singkat wajib. */
export function transferBetween(a: {
  wallets: readonly SubWallet[];
  fromId: string;
  toId: string;
  amount: number;
  reason: string;
  fromBalance: number;
  today: string;
  nowIso: string;
}): WalletResult {
  const from = a.wallets.find((w) => w.id === a.fromId);
  const to = a.wallets.find((w) => w.id === a.toId);
  const reason = a.reason.trim();
  if (!from || !to || from.id === to.id) return { ok: false, error: "Pilih dua dompet yang berbeda." };
  if (!isAllocatable(from) || !isAllocatable(to)) return { ok: false, error: "Hanya dompet kebutuhan yang bisa saling digeser." };
  if (!Number.isInteger(a.amount) || a.amount <= 0) return { ok: false, error: "Jumlah harus lebih dari Rp0." };
  if (reason.length < 3) return { ok: false, error: "Tulis alasan singkat geseran saldo ini." };
  if (isWalletLocked(from, a.today)) return { ok: false, error: `${from.name} terkunci sampai jatuh tempo, saldonya tidak bisa dipindah.` };
  if (a.amount > a.fromBalance) return { ok: false, error: `Saldo ${from.name} hanya Rp${Math.max(0, a.fromBalance).toLocaleString("id-ID")}.` };
  const log = { fromId: from.id, toId: to.id, amount: a.amount, reason: reason.slice(0, 80), at: a.nowIso };
  return {
    ok: true,
    wallets: a.wallets.map((w) =>
      w.id === from.id ? bump(w, { allocated: w.allocated - a.amount, lastTransfer: log }, a.nowIso)
      : w.id === to.id ? bump(w, { allocated: w.allocated + a.amount, lastTransfer: log }, a.nowIso)
      : w),
  };
}

/**
 * Pindah ke siklus baru: rencana alokasi dibawa maju, dikecilkan proporsional bila uang bulan baru lebih sedikit
 * (supaya total alokasi tidak pernah melebihi uang yang ada).
 */
export function rollWalletsToCycle(wallets: readonly SubWallet[], userId: string, cycleKey: string, cashForNeeds: number, mandatory: number, nowIso: string): SubWallet[] {
  const mine = wallets.filter((w) => w.userId === userId && isAllocatable(w));
  const stale = mine.some((w) => w.cycleKey !== cycleKey);
  const vault = wallets.find((w) => w.userId === userId && w.type === "savings");
  const vaultStale = vault !== undefined && (vault.cycleKey !== cycleKey || vault.allocated !== mandatory);
  if (!stale && !vaultStale) return wallets as SubWallet[];
  const plan = mine.reduce((s, w) => s + w.allocated, 0);
  const factor = plan > cashForNeeds && plan > 0 ? Math.max(0, cashForNeeds) / plan : 1;
  return wallets.map((w) => {
    if (w.userId !== userId || w.archived) return w;
    if (isAllocatable(w) && w.cycleKey !== cycleKey) {
      return bump(w, { allocated: factor < 1 ? Math.floor((w.allocated * factor) / 1000) * 1000 : w.allocated, cycleKey }, nowIso);
    }
    if (w.type === "savings" && (w.cycleKey !== cycleKey || w.allocated !== mandatory)) return bump(w, { allocated: mandatory, cycleKey }, nowIso);
    return w;
  });
}


/** Bila anggaran dikurangi sehingga total alokasi melebihi uang yang ada, kecilkan proporsional (kelipatan Rp1.000). */
export function fitToCash(wallets: readonly SubWallet[], userId: string, cycleKey: string, cashForNeeds: number, nowIso: string): SubWallet[] {
  const mine = wallets.filter((w) => w.userId === userId && isAllocatable(w) && w.cycleKey === cycleKey);
  const plan = mine.reduce((s, w) => s + w.allocated, 0);
  if (plan <= Math.max(0, cashForNeeds)) return wallets as SubWallet[];
  const factor = plan > 0 ? Math.max(0, cashForNeeds) / plan : 0;
  return wallets.map((w) =>
    w.userId === userId && isAllocatable(w) && w.cycleKey === cycleKey
      ? bump(w, { allocated: Math.floor((w.allocated * factor) / 1000) * 1000 }, nowIso)
      : w,
  );
}

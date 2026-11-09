"use client";

/**
 * Store keuangan Versi 5.6: konfigurasi anggaran Supervisor, sub-dompet zero-sum, hibah bertujuan, tutup buku
 * bulanan, daftar tunggu keinginan, rekonsiliasi kas dan pinjaman darurat Brankas.
 *
 * Aturan emas: store ini TIDAK menyimpan salinan saldo. Semua angka dihitung ulang dari transaksi
 * (`useBukuDompetStore.transactions`) lewat `buildFinanceContext`, sehingga tidak mungkin melenceng dari buku kas.
 * Poin hanya diberikan lewat `awardReward` milik store utama.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { isChildRole, useBukuDompetStore } from "@/store/useBukuDompetStore";
import { shortName, useFamilyStore } from "@/store/useFamilyStore";
import { notify } from "@/lib/notify";
import { localDateStr } from "@/lib/dates";
import { SELF_CONTROL_TITLE_ID } from "@/lib/badge-catalog";
import type { TransactionRecord } from "@/lib/spending-detective";
import { applyBudgetChange, budgetChangeWarning, defaultBudgetFor, validateBudgetInput, type BudgetInput, type BudgetWarning } from "@/lib/finance/budget";
import { cycleStartOf } from "@/lib/finance/cycle";
import { buildFinanceContext, type FinanceContext } from "@/lib/finance/context";
import { buildClosing, computeClosingFigures, isCycleClosed, splitSurplus, type ClosingFigures } from "@/lib/finance/closing";
import { buildGrantRequest, approveGrant, rejectGrant, settleGrant, validateGrantInput } from "@/lib/finance/grants";
import {
  ADJUSTMENT_CATEGORY,
  applyRecovery,
  buildAdjustmentTx,
  buildReconciliation,
  buildVaultLoan,
  cancelOutcome,
  coolUntilIso,
  isCoolingDone,
  planVaultDip,
  SELF_CONTROL_BONUS_POINTS,
} from "@/lib/finance/habits";
import { buildSupervisorIncome, findReconcileCandidate, reconcilePrompt, rupiah, verifiedPatch } from "@/lib/finance/income";
import { recordedCash } from "@/lib/finance/ledger";
import { buildOpenedWallets, canArchiveWallet, validateWalletPlan, type OpenVia, type PlanItem } from "@/lib/finance/opening";
import {
  allocateToWallet,
  applyAutoSplit,
  checkExpense,
  fitToCash,
  rollWalletsToCycle,
  suggestAutoSplit,
  transferBetween,
  walletSpent,
  type ExpenseCheck,
} from "@/lib/finance/wallets";
import type {
  BudgetConfig,
  CashReconciliation,
  FinTx,
  GrantItem,
  GrantRequest,
  MonthlyClosing,
  SubWallet,
  VaultLoan,
  WishlistItem,
} from "@/lib/finance/types";

/* ───────────────────────── Penyimpanan aman ───────────────────────── */

/** Foto hibah (WebP) bisa memenuhi localStorage: bila gagal menulis, foto hibah terlama dibuang lalu dicoba lagi. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
      return;
    } catch {
      /* lanjut pangkas foto */
    }
    try {
      const parsed = JSON.parse(value) as { state?: { grantRequests?: GrantRequest[] } };
      const list = parsed.state?.grantRequests;
      if (!list) return;
      for (let i = list.length - 1; i >= 0; i--) {
        if (!list[i].proofPhoto && !list[i].receiptPhoto) continue;
        list[i] = { ...list[i], proofPhoto: undefined, receiptPhoto: undefined };
        try {
          window.localStorage.setItem(name, JSON.stringify(parsed));
          return;
        } catch {
          /* coba berikutnya */
        }
      }
    } catch {
      /* data tetap ada di memori */
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      /* abaikan */
    }
  },
};

/* ───────────────────────── Tipe ───────────────────────── */

export interface Res {
  success: boolean;
  message: string;
}

export interface IncomeDecisionNeeded extends Res {
  needsDecision: true;
  candidate: TransactionRecord;
  prompt: string;
}

export interface FinanceState {
  budgetConfigs: BudgetConfig[];
  subWallets: SubWallet[];
  grantRequests: GrantRequest[];
  monthlyClosings: MonthlyClosing[];
  wishlistItems: WishlistItem[];
  reconciliations: CashReconciliation[];
  vaultLoans: VaultLoan[];

  /* anggaran (Supervisor) */
  saveBudgetConfig: (userId: string, input: BudgetInput, opts?: { acknowledged?: boolean }) => Res & { warning?: BudgetWarning; errors?: Record<string, string> };
  syncProfileBudget: (userId: string) => void;

  /* sub-dompet */
  /** Merapikan dompet yang SUDAH ada ke siklus berjalan. Tidak lagi membuat dompet baru diam-diam. */
  ensureWallets: (userId: string) => void;
  /** Anak membuka dompet: via rekomendasi sistem atau manual. Disimpan sebagai dokumen `sub_wallets`. */
  openWallets: (userId: string, via: OpenVia, items: PlanItem[]) => Res & { opened?: number };
  archiveWallet: (userId: string, walletId: string) => Res;
  allocate: (userId: string, walletId: string, delta: number) => Res;
  autoSplit: (userId: string) => Res;
  transferBalance: (userId: string, fromId: string, toId: string, amount: number, reason: string) => Res;
  checkSpend: (userId: string, walletId: string | undefined, amount: number, category: string) => ExpenseCheck & { balance: number };

  /* pemasukan dua arah */
  recordSupervisorIncome: (p: { userId: string; amount: number; title?: string; category?: string; date?: string }) => Res | IncomeDecisionNeeded;
  resolveSupervisorIncome: (p: { userId: string; amount: number; title?: string; category?: string; date?: string; candidateId?: string; same: boolean }) => Res;
  verifyChildIncome: (txId: string) => Res;
  rejectChildIncome: (txId: string) => Res;

  /* hibah */
  submitGrant: (p: { userId: string; title: string; category: string; items: GrantItem[]; note: string; proofPhoto?: string }) => Res & { errors?: Record<string, string> };
  approveGrantRequest: (id: string, approvedAmount: number, note: string) => Res;
  rejectGrantRequest: (id: string, reason: string) => Res;
  settleGrantRequest: (id: string, p: { receiptPhoto?: string; leftoverAction?: "vault" | "return" }) => Res;

  /* tutup buku */
  previewClosing: (userId: string, cycleKey?: string) => ClosingPreview;
  closeMonth: (userId: string, opts?: { cycleKey?: string; chosenVault?: number }) => Res & { closing?: MonthlyClosing };

  /* kebiasaan & edukasi */
  addWishlist: (p: { userId: string; title: string; amount: number; category: string; need_or_want: "need" | "want"; walletId?: string }) => Res & { item?: WishlistItem };
  resolveWishlist: (id: string, decision: "bought" | "cancelled") => Res & { item?: WishlistItem };
  markReimbursed: (txId: string) => Res;
  reconcileCash: (userId: string, actualCash: number) => Res & { difference?: number };
  dipVault: (p: { userId: string; amount: number; reason: string; mode: "recovery" | "approval" }) => Res & { useEmergencyWallet?: boolean };
  decideVaultLoan: (id: string, approve: boolean) => Res;
  repayVaultLoan: (id: string, amount: number) => Res;

  resetFinanceData: () => void;
}

export interface ClosingPreview {
  cycleKey: string;
  alreadyClosed: boolean;
  policy: BudgetInput["rolloverPolicy"];
  monthlyCash: number;
  mandatorySavingsTarget: number;
  ownSpent: number;
  savedInCycle: number;
  figures: ClosingFigures;
}

/* ───────────────────────── Pembantu ───────────────────────── */

const main = useBukuDompetStore;
const fam = useFamilyStore;
let counter = 0;
const newId = (prefix: string) => {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
};
const nowIso = () => new Date().toISOString();
const fail = (message: string): Res => ({ success: false, message });
const ok = (message: string): Res => ({ success: true, message });

function actor() {
  const m = main.getState();
  return { id: m.activeProfileId, role: m.currentRole, name: m.profiles.find((p) => p.id === m.activeProfileId)?.display_name ?? "Supervisor" };
}
const isSupervisor = () => actor().role === "supervisor";

function ownVault(userId: string): number {
  return fam.getState().goals.filter((g) => g.userId === userId).reduce((s, g) => s + g.savedAmount, 0);
}

/** Setor ke Brankas: celengan utama "Brankas Tabungan" (dibuat otomatis bila belum ada). Tanpa poin. */
function creditVault(userId: string, amount: number, cashFrom?: { title: string; date: string }): void {
  if (!(amount > 0)) return;
  const f = fam.getState();
  let goal = f.goals.find((g) => g.userId === userId && g.name === "Brankas Tabungan" && !g.completedAt) ?? f.goals.find((g) => g.userId === userId && !g.completedAt);
  if (!goal) {
    const prof = main.getState().profiles.find((p) => p.id === userId);
    const res = f.createGoal({ userId, name: "Brankas Tabungan", category: "Tabungan / Lainnya", targetAmount: Math.max(1_000_000, (prof?.monthly_budget_target ?? 1_500_000) * 12) });
    goal = res.goal;
  }
  if (!goal) return;
  const id = goal.id;
  fam.setState((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, savedAmount: g.savedAmount + amount } : g)) }));
  if (cashFrom) {
    main.getState().appendTransaction({
      id: newId("tx-vault"),
      user_id: userId,
      type: "saving",
      category: "Tabungan / Lainnya",
      need_or_want: "need",
      title: cashFrom.title,
      total_amount: amount,
      is_itemized: false,
      points_earned: 0,
      xp_earned: 0,
      transaction_date: cashFrom.date,
      created_at: nowIso(),
      items: [],
    });
  }
}

/** Tarik dari Brankas (mulai dari celengan yang paling besar). */
function debitVault(userId: string, amount: number): void {
  let left = amount;
  fam.setState((s) => {
    const mine = s.goals.filter((g) => g.userId === userId).sort((a, b) => b.savedAmount - a.savedAmount);
    const take = new Map<string, number>();
    for (const g of mine) {
      if (left <= 0) break;
      const t = Math.min(g.savedAmount, left);
      if (t > 0) take.set(g.id, t);
      left -= t;
    }
    return { goals: s.goals.map((g) => (take.has(g.id) ? { ...g, savedAmount: g.savedAmount - (take.get(g.id) ?? 0), completedAt: undefined } : g)) };
  });
}

function contextFor(state: Pick<FinanceState, "budgetConfigs" | "subWallets" | "monthlyClosings">, userId: string, today = localDateStr()): FinanceContext {
  const m = main.getState();
  const prof = m.profiles.find((p) => p.id === userId);
  return buildFinanceContext({
    userId,
    today,
    config: state.budgetConfigs.find((c) => c.userId === userId),
    profile: prof ?? {},
    txs: m.transactions as FinTx[],
    wallets: state.subWallets,
    closings: state.monthlyClosings,
  });
}

const replaceById = <T extends { id: string }>(list: T[], item: T): T[] => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]);

function post(authorId: string, kind: "income" | "grant" | "closing" | "wallet", text: string, dedupeKey: string): void {
  fam.getState().addAutoPost({ kind, authorId, text, dedupeKey });
}

const nameOf = (id: string) => shortName(main.getState().profiles.find((p) => p.id === id)?.display_name ?? "Anak");

const INITIAL = {
  budgetConfigs: [] as BudgetConfig[],
  subWallets: [] as SubWallet[],
  grantRequests: [] as GrantRequest[],
  monthlyClosings: [] as MonthlyClosing[],
  wishlistItems: [] as WishlistItem[],
  reconciliations: [] as CashReconciliation[],
  vaultLoans: [] as VaultLoan[],
};

/* ───────────────────────── Store ───────────────────────── */

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      /* ───── anggaran ───── */

      saveBudgetConfig: (userId, input, opts) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa mengatur anggaran anak.");
        const v = validateBudgetInput(input);
        if (!v.ok) return { ...fail(Object.values(v.errors)[0] ?? "Data anggaran belum benar."), errors: v.errors as Record<string, string> };
        const prof = main.getState().profiles.find((p) => p.id === userId);
        if (!prof || !isChildRole(prof.role)) return fail("Akun anak tidak ditemukan.");
        const st = get();
        const ctx = contextFor(st, userId);
        const warning = budgetChangeWarning({ scope: input.effectiveScope, newBudget: input.monthlyBudget, spentThisCycle: ctx.totals.ownSpent });
        if (warning && !opts?.acknowledged) return { ...fail(warning.message), warning };
        const cfg = applyBudgetChange(st.budgetConfigs.find((c) => c.userId === userId), input, {
          userId,
          byId: actor().id,
          today: localDateStr(),
          nowIso: nowIso(),
          fallback: defaultBudgetFor(prof),
        });
        set({ budgetConfigs: replaceById(st.budgetConfigs, cfg) });
        get().syncProfileBudget(userId);
        notify.success("Anggaran tersimpan", input.effectiveScope === "next_month" ? "Berlaku mulai siklus berikutnya." : "Berlaku mulai sekarang.");
        return ok(input.effectiveScope === "next_month" ? "Anggaran baru akan berlaku mulai siklus berikutnya." : "Anggaran baru berlaku sekarang.");
      },

      syncProfileBudget: (userId) => {
        const m = main.getState();
        const prof = m.profiles.find((p) => p.id === userId);
        if (!prof) return;
        const ctx = contextFor(get(), userId);
        if (prof.monthly_budget_target === ctx.budget.monthlyBudget && prof.monthly_saving_target === ctx.budget.mandatorySavingsTarget) return;
        main.setState({
          profiles: m.profiles.map((p) =>
            p.id === userId ? { ...p, monthly_budget_target: ctx.budget.monthlyBudget, monthly_saving_target: ctx.budget.mandatorySavingsTarget } : p,
          ),
        });
      },

      /* ───── sub-dompet ───── */

      ensureWallets: (userId) => {
        const prof = main.getState().profiles.find((p) => p.id === userId);
        if (!prof || !isChildRole(prof.role)) return;
        // Dompet hanya disentuh pemiliknya (server menolak tulisan Supervisor ke dompet non-hibah).
        if (actor().id !== userId) {
          get().syncProfileBudget(userId);
          return;
        }
        const st = get();
        const ctx = contextFor(st, userId);
        const t = nowIso();
        const mandatory = ctx.budget.mandatorySavingsTarget;
        let wallets = st.subWallets;
        // Dompet dibuat HANYA lewat `openWallets` (pilihan anak). Di sini cukup menyesuaikan yang sudah ada.
        if (!wallets.some((w) => w.userId === userId)) {
          get().syncProfileBudget(userId);
          return;
        }
        const cashForNeeds = ctx.monthlyCash - mandatory;
        wallets = rollWalletsToCycle(wallets, userId, ctx.cycle.key, cashForNeeds, mandatory, t);
        wallets = fitToCash(wallets, userId, ctx.cycle.key, cashForNeeds, t);
        if (wallets !== st.subWallets) set({ subWallets: wallets });
        get().syncProfileBudget(userId);
      },

      openWallets: (userId, via, items) => {
        const a = actor();
        if (a.id !== userId) return fail("Dompet hanya bisa dibuka oleh pemilik akun.");
        const prof = main.getState().profiles.find((p) => p.id === userId);
        if (!prof || !isChildRole(prof.role)) return fail("Akun tidak ditemukan.");
        const st = get();
        const ctx = contextFor(st, userId);
        const check = validateWalletPlan(items, { free: ctx.unallocated, existing: st.subWallets, userId });
        if (!check.ok) return fail(check.error);
        const t = nowIso();
        const fresh = buildOpenedWallets({
          userId,
          items,
          via,
          cycleKey: ctx.cycle.key,
          mandatory: ctx.budget.mandatorySavingsTarget,
          existing: st.subWallets,
          byId: a.id,
          nowIso: t,
          uid: () => newId("w").slice(2),
        });
        set({ subWallets: [...st.subWallets, ...fresh] });
        const n = items.length;
        post(userId, "wallet", `${nameOf(userId)} membuka ${n} dompet ${via === "recommendation" ? "mengikuti rekomendasi sistem" : "dengan pilihan sendiri"}.`, `wallet-open:${userId}:${t}`);
        return { ...ok(n === 1 ? "Dompet terbuka!" : `${n} dompet terbuka!`), opened: n };
      },

      archiveWallet: (userId, walletId) => {
        if (actor().id !== userId) return fail("Dompet hanya bisa diarsipkan oleh pemilik akun.");
        const st = get();
        const ctx = contextFor(st, userId);
        const w = ctx.wallets.find((x) => x.id === walletId);
        if (!w) return fail("Dompet tidak ditemukan.");
        const check = canArchiveWallet(w, w.spent);
        if (!check.ok) return fail(check.error);
        const t = nowIso();
        set({ subWallets: st.subWallets.map((x) => (x.id === walletId ? { ...x, archived: true, updatedAt: t } : x)) });
        return ok("Dompet diarsipkan. Alokasinya kembali ke uang yang belum dibagi.");
      },

      allocate: (userId, walletId, delta) => {
        const st = get();
        const ctx = contextFor(st, userId);
        const w = ctx.wallets.find((x) => x.id === walletId);
        const r = allocateToWallet(st.subWallets, walletId, Math.round(delta), {
          monthlyCash: ctx.monthlyCash,
          mandatorySavingsTarget: ctx.budget.mandatorySavingsTarget,
          cycleKey: ctx.cycle.key,
          nowIso: nowIso(),
          balance: w?.balance,
        });
        if (!r.ok) return fail(r.error);
        set({ subWallets: r.wallets });
        return ok(delta > 0 ? "Uang dibagi ke dompet." : "Alokasi dompet dikurangi.");
      },

      autoSplit: (userId) => {
        const st = get();
        const ctx = contextFor(st, userId);
        const split = suggestAutoSplit(ctx.unallocated, ctx.wallets);
        if (Object.keys(split).length === 0) return fail("Tidak ada uang yang belum dibagi.");
        set({ subWallets: applyAutoSplit(st.subWallets, split, ctx.cycle.key, nowIso()) });
        return ok("Uang yang belum dibagi sudah dibagi otomatis ke dompet-dompetmu.");
      },

      transferBalance: (userId, fromId, toId, amount, reason) => {
        const st = get();
        const ctx = contextFor(st, userId);
        const from = ctx.wallets.find((w) => w.id === fromId);
        const r = transferBetween({ wallets: st.subWallets, fromId, toId, amount: Math.round(amount), reason, fromBalance: from?.balance ?? 0, today: localDateStr(), nowIso: nowIso() });
        if (!r.ok) return fail(r.error);
        set({ subWallets: r.wallets });
        return ok("Saldo berhasil digeser antar-dompet.");
      },

      checkSpend: (userId, walletId, amount, category) => {
        const ctx = contextFor(get(), userId);
        const w = ctx.wallets.find((x) => x.id === walletId) ?? ctx.grantWallets.find((x) => x.id === walletId);
        const res = checkExpense({ wallet: w, amount, balance: w?.balance ?? 0, category, today: localDateStr() });
        return { ...res, balance: w?.balance ?? 0 };
      },

      /* ───── pemasukan dua arah ───── */

      recordSupervisorIncome: (p) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa mencatat uang masuk untuk anak.");
        const amount = Math.round(Number(p.amount));
        if (!(amount > 0)) return fail("Jumlah harus lebih dari Rp0.");
        const cand = findReconcileCandidate({ amount, nowIso: nowIso(), userId: p.userId }, main.getState().transactions as FinTx[]);
        if (cand) {
          const full = main.getState().transactions.find((t) => t.id === cand.id);
          if (full) return { success: true, message: "Ada catatan anak yang mirip.", needsDecision: true, candidate: full, prompt: reconcilePrompt(full) };
        }
        return get().resolveSupervisorIncome({ ...p, same: false });
      },

      resolveSupervisorIncome: (p) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa mencatat uang masuk untuk anak.");
        const amount = Math.round(Number(p.amount));
        if (!(amount > 0)) return fail("Jumlah harus lebih dari Rp0.");
        const by = actor();
        const t = nowIso();
        const m = main.getState();
        if (p.same && p.candidateId) {
          const child = m.transactions.find((x) => x.id === p.candidateId);
          if (!child) return fail("Catatan anak tidak ditemukan.");
          m.patchTransaction(child.id, verifiedPatch(child as FinTx, amount, by.id, t) as Partial<TransactionRecord>);
          notify.success("Dikonfirmasi tanpa dobel", `Catatan ${nameOf(p.userId)} ditandai terverifikasi: ${rupiah(amount)}.`);
          post(p.userId, "income", `${by.name} mengonfirmasi uang masuk ${rupiah(amount)} untuk ${nameOf(p.userId)}.`, `income:${child.id}`);
          return ok("Catatan anak ditandai terverifikasi. Tidak ada pemasukan ganda.");
        }
        const tx = buildSupervisorIncome({
          id: newId("tx-sup"),
          userId: p.userId,
          supervisorId: by.id,
          amount,
          title: p.title ?? "Uang saku dari orang tua",
          category: p.category ?? "Bonus Orang Tua / Abang",
          date: p.date ?? localDateStr(),
          nowIso: t,
        });
        m.appendTransaction(tx as unknown as TransactionRecord);
        notify.success("Uang masuk dicatat", `${rupiah(amount)} langsung menambah saldo ${nameOf(p.userId)}.`);
        post(p.userId, "income", `${by.name} mengirim ${rupiah(amount)} untuk ${nameOf(p.userId)}.`, `income:${tx.id}`);
        return ok("Uang masuk tercatat dan saldo anak langsung bertambah.");
      },

      verifyChildIncome: (txId) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa mengonfirmasi.");
        const m = main.getState();
        const tx = m.transactions.find((t) => t.id === txId);
        if (!tx || tx.verificationStatus !== "pending_supervisor") return fail("Catatan ini sudah tidak menunggu konfirmasi.");
        m.patchTransaction(txId, verifiedPatch(tx as FinTx, undefined, actor().id, nowIso()) as Partial<TransactionRecord>);
        post(tx.user_id, "income", `${actor().name} mengonfirmasi pemasukan ${rupiah(Number(tx.total_amount))} milik ${nameOf(tx.user_id)}.`, `income:${txId}`);
        return ok("Pemasukan anak dikonfirmasi.");
      },

      rejectChildIncome: (txId) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa menolak.");
        const m = main.getState();
        const tx = m.transactions.find((t) => t.id === txId);
        if (!tx || tx.verificationStatus !== "pending_supervisor") return fail("Catatan ini sudah tidak menunggu konfirmasi.");
        m.patchTransaction(txId, { verificationStatus: "rejected", verifiedAt: nowIso(), verifiedBy: actor().id });
        return ok("Pemasukan ditolak dan tidak dihitung dalam saldo.");
      },

      /* ───── hibah ───── */

      submitGrant: (p) => {
        const a = actor();
        if (!isChildRole(a.role) || a.id !== p.userId) return fail("Hanya anak pemilik akun yang bisa mengajukan kebutuhan darurat.");
        const v = validateGrantInput(p);
        if (!v.ok) return { ...fail(Object.values(v.errors)[0] ?? "Data belum lengkap."), errors: v.errors };
        const g = buildGrantRequest({ id: newId("grant"), nowIso: nowIso(), ...p });
        set((s) => ({ grantRequests: [g, ...s.grantRequests] }));
        return ok(`Permintaan ${rupiah(g.requestedAmount)} terkirim. Tunggu keputusan Supervisor ya.`);
      },

      approveGrantRequest: (id, approvedAmount, note) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa memutuskan pengajuan kebutuhan darurat.");
        const g = get().grantRequests.find((x) => x.id === id);
        if (!g) return fail("Permintaan tidak ditemukan.");
        const r = approveGrant(g, { approvedAmount, note, byId: actor().id, nowIso: nowIso() });
        if (!r.ok) return fail(r.error);
        set((s) => ({
          grantRequests: replaceById(s.grantRequests, r.grant),
          subWallets: r.wallet && !s.subWallets.some((w) => w.id === r.wallet!.id) ? [r.wallet, ...s.subWallets] : s.subWallets,
        }));
        post(g.userId, "grant", `Kebutuhan darurat “${g.title}” untuk ${nameOf(g.userId)} cair ${rupiah(r.grant.approvedAmount ?? 0)}.`, `grant:${g.id}`);
        return ok(`Dana ${rupiah(r.grant.approvedAmount ?? 0)} dicairkan ke dompet kebutuhan khusus.`);
      },

      rejectGrantRequest: (id, reason) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa memutuskan pengajuan kebutuhan darurat.");
        const g = get().grantRequests.find((x) => x.id === id);
        if (!g) return fail("Permintaan tidak ditemukan.");
        const r = rejectGrant(g, { reason, byId: actor().id, nowIso: nowIso() });
        if (!r.ok) return fail(r.error);
        set((s) => ({ grantRequests: replaceById(s.grantRequests, r.grant) }));
        return ok("Permintaan ditolak.");
      },

      settleGrantRequest: (id, p) => {
        const g = get().grantRequests.find((x) => x.id === id);
        if (!g) return fail("Pengajuan tidak ditemukan.");
        const a = actor();
        if (a.id !== g.userId) return fail("Hanya pemilik pengajuan yang bisa menyelesaikannya.");
        const wallet = get().subWallets.find((w) => w.id === g.walletId);
        const spent = wallet ? walletSpent(wallet, main.getState().transactions as FinTx[]) : 0;
        const r = settleGrant(g, { spent, receiptPhoto: p.receiptPhoto, leftoverAction: p.leftoverAction, nowIso: nowIso() });
        if (!r.ok) return fail(r.error);
        if (r.leftover > 0 && p.leftoverAction === "vault") creditVault(g.userId, r.leftover);
        set((s) => ({
          grantRequests: replaceById(s.grantRequests, r.grant),
          subWallets: s.subWallets.map((w) => (w.id === g.walletId ? { ...w, archived: true, updatedAt: nowIso() } : w)),
        }));
        return ok(r.leftover > 0 ? (p.leftoverAction === "vault" ? `Pengajuan selesai. Sisa ${rupiah(r.leftover)} masuk Brankas.` : `Pengajuan selesai. Sisa ${rupiah(r.leftover)} dikembalikan.`) : "Pengajuan selesai, pas tanpa sisa.");
      },

      /* ───── tutup buku ───── */

      previewClosing: (userId, cycleKey) => {
        const st = get();
        const today = localDateStr();
        const base = contextFor(st, userId, today);
        const key = cycleKey ?? base.cycle.key;
        const probe = key === base.cycle.key ? today : cycleStartOf(key, base.budget.cycleStartDay);
        const ctx = key === base.cycle.key ? base : contextFor(st, userId, probe);
        const figures = computeClosingFigures({
          monthlyCash: ctx.monthlyCash,
          mandatorySavingsTarget: ctx.budget.mandatorySavingsTarget,
          ownSpent: ctx.totals.ownSpent,
          savedInCycle: ctx.totals.saved,
        });
        return {
          cycleKey: key,
          alreadyClosed: isCycleClosed(st.monthlyClosings, userId, key),
          policy: ctx.budget.rolloverPolicy,
          monthlyCash: ctx.monthlyCash,
          mandatorySavingsTarget: ctx.budget.mandatorySavingsTarget,
          ownSpent: ctx.totals.ownSpent,
          savedInCycle: ctx.totals.saved,
          figures,
        };
      },

      closeMonth: (userId, opts) => {
        const a = actor();
        if (a.id !== userId && !isSupervisor()) return fail("Tutup buku hanya bisa dilakukan pemilik akun atau Supervisor.");
        const pv = get().previewClosing(userId, opts?.cycleKey);
        if (pv.alreadyClosed) return fail("Siklus ini sudah ditutup bukunya.");
        const split = splitSurplus(pv.policy, pv.figures.surplus, opts?.chosenVault);
        const t = nowIso();
        const closing = buildClosing({
          userId,
          cycleKey: pv.cycleKey,
          policy: pv.policy,
          monthlyCash: pv.monthlyCash,
          mandatorySavingsTarget: pv.mandatorySavingsTarget,
          figures: pv.figures,
          ownSpent: pv.ownSpent,
          split,
          byId: a.id,
          nowIso: t,
        });
        const date = localDateStr();
        // 1) tabungan wajib dikunci aman ke Brankas, 2) bagian surplus yang dipilih masuk Brankas.
        if (pv.figures.topUp > 0) creditVault(userId, pv.figures.topUp, { title: `Tabungan wajib ${pv.cycleKey}`, date });
        if (split.savedToVaultAmount > 0) creditVault(userId, split.savedToVaultAmount, { title: `Sisa bulan ${pv.cycleKey} ke Brankas`, date });
        set((s) => ({ monthlyClosings: replaceById(s.monthlyClosings, closing) }));
        if (closing.bonusPoints > 0) {
          main.getState().awardReward({
            profileId: userId,
            points: closing.bonusPoints,
            xp: Math.round(closing.bonusPoints / 2),
            title: "Tutup Buku Selesai!",
            subtitle: `+${closing.bonusPoints} Poin karena tabungan wajib aman dan sisa uang dikelola dengan baik.`,
          });
        }
        post(userId, "closing", `${nameOf(userId)} menutup buku ${pv.cycleKey}: ${rupiah(split.savedToVaultAmount)} masuk Brankas, ${rupiah(split.rolledOverAmount)} dibawa ke bulan depan.`, `closing:${closing.id}`);
        return { ...ok("Buku bulan ini sudah ditutup."), closing };
      },

      /* ───── kebiasaan & edukasi ───── */

      addWishlist: (p) => {
        if (!(p.amount > 0) || p.title.trim().length < 2) return fail("Isi nama dan harga barang yang diinginkan.");
        const t = nowIso();
        const item: WishlistItem = {
          id: newId("wish"),
          userId: p.userId,
          title: p.title.trim().slice(0, 60),
          amount: Math.round(p.amount),
          category: p.category,
          need_or_want: p.need_or_want,
          ...(p.walletId ? { walletId: p.walletId } : {}),
          createdAt: t,
          coolUntil: coolUntilIso(t),
          status: "cooling",
          updatedAt: t,
        };
        set((s) => ({ wishlistItems: [item, ...s.wishlistItems] }));
        return { ...ok("Disimpan di Daftar Tunggu. Pikirkan lagi 48 jam, ya!"), item };
      },

      resolveWishlist: (id, decision) => {
        const item = get().wishlistItems.find((w) => w.id === id);
        if (!item || item.status !== "cooling") return fail("Keinginan ini sudah diputuskan.");
        const t = nowIso();
        if (decision === "bought") {
          if (!isCoolingDone(item, t)) return fail("Masa tunggu 48 jam belum selesai.");
          const next = { ...item, status: "bought" as const, resolvedAt: t, updatedAt: t };
          set((s) => ({ wishlistItems: replaceById(s.wishlistItems, next) }));
          return { ...ok("Silakan catat pembeliannya."), item: next };
        }
        const out = cancelOutcome(item, t);
        const next: WishlistItem = { ...item, status: "cancelled", resolvedAt: t, cancelledAfterCooling: out.cancelledAfterCooling, bonusAwarded: out.bonusPoints > 0, updatedAt: t };
        set((s) => ({ wishlistItems: replaceById(s.wishlistItems, next) }));
        if (out.bonusPoints > 0) {
          const m = main.getState();
          m.awardReward({ profileId: item.userId, points: out.bonusPoints, xp: 10, title: "Hebat, kamu menahan diri!", subtitle: `+${SELF_CONTROL_BONUS_POINTS} Poin karena batal beli setelah berpikir 48 jam.` });
          m.unlockBadgeItems(item.userId, { titleIds: [SELF_CONTROL_TITLE_ID] });
          return { ...ok("Keren! Kamu menahan diri dan dapat bonus + gelar Penahan Diri."), item: next };
        }
        return { ...ok("Keinginan dibatalkan."), item: next };
      },

      markReimbursed: (txId) => {
        const m = main.getState();
        const tx = m.transactions.find((t) => t.id === txId);
        if (!tx || !tx.isReimbursable) return fail("Catatan ini bukan patungan teman.");
        if (tx.reimbursedAt) return fail("Sudah ditandai diganti.");
        m.patchTransaction(txId, { reimbursedAt: nowIso() });
        return ok(`Saldo ${rupiah(Number(tx.total_amount))} dikembalikan ke dompet asalnya.`);
      },

      reconcileCash: (userId, actualCash) => {
        const actual = Math.round(Number(actualCash));
        if (!Number.isFinite(actual) || actual < 0) return fail("Isi jumlah uang nyata yang kamu pegang (0 atau lebih).");
        const st = get();
        const m = main.getState();
        const recorded = recordedCash(m.transactions as FinTx[], userId, st.subWallets);
        const date = localDateStr();
        const t = nowIso();
        const rec = buildReconciliation({ id: newId("rec"), userId, date, recordedCash: recorded, actualCash: actual, nowIso: t });
        if (rec.difference === 0) {
          set((s) => ({ reconciliations: [rec, ...s.reconciliations] }));
          return { ...ok("Pas! Catatanmu sama persis dengan uang nyata."), difference: 0 };
        }
        const ctx = contextFor(st, userId);
        const food = ctx.wallets.find((w) => w.key === "food");
        const adj = buildAdjustmentTx({ id: newId("tx-adj"), userId, difference: rec.difference, walletId: rec.difference < 0 ? food?.id : undefined, date, nowIso: t });
        m.appendTransaction(adj as unknown as TransactionRecord);
        set((s) => ({ reconciliations: [{ ...rec, adjustmentTxId: adj.id }, ...s.reconciliations] }));
        return {
          ...ok(rec.difference < 0 ? `Tercatat "${ADJUSTMENT_CATEGORY}" ${rupiah(-rec.difference)}. Streak-mu aman.` : `Uang lebih ${rupiah(rec.difference)} dicatat sebagai penyesuaian. Streak-mu aman.`),
          difference: rec.difference,
        };
      },

      dipVault: (p) => {
        const st = get();
        const ctx = contextFor(st, p.userId);
        const emergency = ctx.wallets.find((w) => w.type === "emergency");
        const plan = planVaultDip({ emergencyBalance: emergency?.balance ?? 0, vaultBalance: ownVault(p.userId), amount: Math.round(p.amount) });
        if (!plan.ok) return fail(plan.error);
        if (!plan.needsLoan) return { ...ok("Dompet Dana Darurat masih cukup. Pakai dompet itu dulu, ya."), useEmergencyWallet: true };
        const loan = buildVaultLoan({ id: newId("loan"), userId: p.userId, amount: plan.fromVault, reason: p.reason, mode: p.mode, nowIso: nowIso() });
        if ("error" in loan) return fail(loan.error);
        set((s) => ({ vaultLoans: [loan, ...s.vaultLoans] }));
        if (p.mode === "approval") return ok("Permintaan pinjaman darurat dikirim. Tunggu persetujuan Supervisor.");
        releaseLoan(loan);
        return ok(`Pinjaman Darurat Internal ${rupiah(loan.amount)} cair. Misi pemulihan: kembalikan ke Brankas.`);
      },

      decideVaultLoan: (id, approve) => {
        if (!isSupervisor()) return fail("Hanya Supervisor yang bisa memutuskan.");
        const loan = get().vaultLoans.find((l) => l.id === id);
        if (!loan || loan.status !== "open" || !loan.needsApproval || loan.approvedBy) return fail("Pinjaman ini sudah diputuskan.");
        const t = nowIso();
        if (!approve) {
          set((s) => ({ vaultLoans: replaceById(s.vaultLoans, { ...loan, status: "rejected", updatedAt: t }) }));
          return ok("Pinjaman darurat ditolak.");
        }
        const next = { ...loan, approvedBy: actor().id, updatedAt: t };
        set((s) => ({ vaultLoans: replaceById(s.vaultLoans, next) }));
        releaseLoan(next);
        return ok("Pinjaman darurat disetujui dan dicairkan.");
      },

      repayVaultLoan: (id, amount) => {
        const loan = get().vaultLoans.find((l) => l.id === id);
        const amt = Math.round(amount);
        if (!loan || loan.status !== "open") return fail("Pinjaman tidak ditemukan atau sudah lunas.");
        if (!(amt > 0)) return fail("Jumlah harus lebih dari Rp0.");
        const pay = Math.min(amt, loan.recoveryTarget - loan.recovered);
        creditVault(loan.userId, pay, { title: "Pemulihan Pinjaman Darurat Internal", date: localDateStr() });
        const next = applyRecovery(loan, pay, nowIso());
        set((s) => ({ vaultLoans: replaceById(s.vaultLoans, next) }));
        return ok(next.status === "repaid" ? "Pinjaman darurat lunas! Brankas pulih." : `Pemulihan ${rupiah(pay)} masuk Brankas.`);
      },

      resetFinanceData: () => set({ ...INITIAL }),
    }),
    {
      name: "bukudompet-v56-finance",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        budgetConfigs: s.budgetConfigs,
        subWallets: s.subWallets,
        grantRequests: s.grantRequests,
        monthlyClosings: s.monthlyClosings,
        wishlistItems: s.wishlistItems,
        reconciliations: s.reconciliations,
        vaultLoans: s.vaultLoans,
      }),
    },
  ),
);

/** Cairkan pinjaman darurat: uang keluar dari Brankas dan masuk sebagai pemasukan internal. */
function releaseLoan(loan: VaultLoan): void {
  debitVault(loan.userId, loan.amount);
  main.getState().appendTransaction({
    id: newId("tx-loan"),
    user_id: loan.userId,
    type: "income",
    category: "Pinjaman Darurat Internal",
    need_or_want: "income",
    title: `Pinjaman Darurat Internal: ${loan.reason}`,
    total_amount: loan.amount,
    is_itemized: false,
    points_earned: 0,
    xp_earned: 0,
    transaction_date: localDateStr(),
    created_at: nowIso(),
    items: [],
    verificationStatus: "verified",
    createdByRole: "child",
  } as TransactionRecord);
}


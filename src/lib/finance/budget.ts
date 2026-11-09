/**
 * Konfigurasi anggaran yang diatur Supervisor. Admin hanya mengisi nilai awal akun (supaya tidak ada
 * pembagian dengan nol); setelah itu Supervisor yang menentukan anggaran, tabungan wajib, tanggal siklus
 * dan kebijakan sisa bulan.
 */
import { cycleKeyOf, clampStartDay, nextCycleKey, MAX_CYCLE_START_DAY, MIN_CYCLE_START_DAY } from "./cycle";
import type { BudgetConfig, BudgetSnapshot, EffectiveScope, RolloverPolicy } from "./types";

export const DEFAULT_MONTHLY_BUDGET = 1_500_000;
export const ROLLOVER_POLICIES: { id: RolloverPolicy; label: string; hint: string }[] = [
  { id: "split_choice", label: "Anak memilih (bagi dua)", hint: "Anak menentukan berapa ke Brankas dan berapa dibawa ke bulan berikutnya." },
  { id: "auto_vault", label: "Otomatis ke Brankas", hint: "Seluruh sisa operasional langsung masuk Brankas Tabungan." },
  { id: "auto_carryover", label: "Otomatis dibawa ke bulan depan", hint: "Seluruh sisa menjadi saldo bawaan bulan berikutnya." },
];

export const budgetConfigId = (userId: string) => `bc-${userId}`;

export interface BudgetInput {
  monthlyBudget: number;
  mandatorySavingsTarget: number;
  cycleStartDay: number;
  rolloverPolicy: RolloverPolicy;
  effectiveScope: EffectiveScope;
}

export type BudgetErrors = Partial<Record<"monthlyBudget" | "mandatorySavingsTarget" | "cycleStartDay" | "rolloverPolicy", string>>;

export function validateBudgetInput(i: Partial<BudgetInput>): { ok: boolean; errors: BudgetErrors } {
  const errors: BudgetErrors = {};
  const budget = Number(i.monthlyBudget);
  const saving = Number(i.mandatorySavingsTarget);
  const day = Number(i.cycleStartDay);
  if (!Number.isFinite(budget) || !Number.isInteger(budget) || budget <= 0) {
    errors.monthlyBudget = "Anggaran bulanan harus bilangan bulat lebih dari Rp0.";
  }
  if (!Number.isFinite(saving) || !Number.isInteger(saving) || saving < 0) {
    errors.mandatorySavingsTarget = "Tabungan wajib tidak boleh negatif.";
  } else if (!errors.monthlyBudget && saving >= budget) {
    errors.mandatorySavingsTarget = "Tabungan wajib harus lebih kecil dari anggaran bulanan, supaya masih ada uang untuk dipakai.";
  }
  if (!Number.isInteger(day) || day < MIN_CYCLE_START_DAY || day > MAX_CYCLE_START_DAY) {
    errors.cycleStartDay = `Tanggal mulai siklus harus antara ${MIN_CYCLE_START_DAY} dan ${MAX_CYCLE_START_DAY}.`;
  }
  if (!ROLLOVER_POLICIES.some((p) => p.id === i.rolloverPolicy)) {
    errors.rolloverPolicy = "Pilih kebijakan sisa bulan.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export interface BudgetWarning {
  level: "warn";
  message: string;
  recommendedScope: "next_month";
}

/** Peringatan eksplisit bila anggaran baru lebih kecil dari yang sudah terpakai pada siklus berjalan. */
export function budgetChangeWarning(a: { scope: EffectiveScope; newBudget: number; spentThisCycle: number }): BudgetWarning | null {
  if (a.scope !== "current_month") return null;
  if (!(a.newBudget < a.spentThisCycle)) return null;
  return {
    level: "warn",
    recommendedScope: "next_month",
    message: `Anggaran baru lebih kecil dari yang sudah terpakai bulan ini. Anak sudah memakai Rp${a.spentThisCycle.toLocaleString("id-ID")} sehingga langsung berstatus melebihi anggaran. Disarankan memilih "Berlaku bulan depan".`,
  };
}

/** Nilai awal dari profil (Admin) — selalu valid: anggaran > 0 dan tabungan wajib < anggaran. */
export function defaultBudgetFor(profile: { monthly_budget_target?: number; monthly_saving_target?: number }): BudgetSnapshot {
  const budget = Number(profile.monthly_budget_target);
  const monthlyBudget = Number.isFinite(budget) && budget > 0 ? Math.round(budget) : DEFAULT_MONTHLY_BUDGET;
  const sv = Number(profile.monthly_saving_target);
  const raw = Number.isFinite(sv) && sv >= 0 ? Math.round(sv) : Math.round(monthlyBudget * 0.2);
  const mandatorySavingsTarget = raw >= monthlyBudget ? Math.round(monthlyBudget * 0.2) : raw;
  return { monthlyBudget, mandatorySavingsTarget, cycleStartDay: 1 };
}

export interface ActiveBudget extends BudgetSnapshot {
  rolloverPolicy: RolloverPolicy;
  cycleKey: string;
  /** true bila ada perubahan yang dijadwalkan untuk siklus berikutnya. */
  hasPendingChange: boolean;
  pending?: BudgetSnapshot & { effectiveFromCycle: string };
}

/** Anggaran yang berlaku pada `dateStr`. Tanpa konfigurasi Supervisor dipakai nilai awal dari profil. */
export function activeBudgetAt(cfg: BudgetConfig | undefined, dateStr: string, fallback: BudgetSnapshot): ActiveBudget {
  if (!cfg) {
    return { ...fallback, rolloverPolicy: "split_choice", cycleKey: cycleKeyOf(dateStr, fallback.cycleStartDay), hasPendingChange: false };
  }
  const monthKey = dateStr.slice(0, 7);
  const useCurrent = cycleKeyOf(dateStr, cfg.cycleStartDay) >= cfg.effectiveFromCycle || (!cfg.previous && monthKey >= cfg.effectiveFromCycle);
  const snap: BudgetSnapshot = useCurrent || !cfg.previous ? cfg : cfg.previous;
  const cycleKey = cycleKeyOf(dateStr, snap.cycleStartDay);
  const pendingNow = !useCurrent && Boolean(cfg.previous);
  return {
    monthlyBudget: snap.monthlyBudget,
    mandatorySavingsTarget: snap.mandatorySavingsTarget,
    cycleStartDay: snap.cycleStartDay,
    rolloverPolicy: cfg.rolloverPolicy,
    cycleKey,
    hasPendingChange: pendingNow,
    pending: pendingNow
      ? { monthlyBudget: cfg.monthlyBudget, mandatorySavingsTarget: cfg.mandatorySavingsTarget, cycleStartDay: cfg.cycleStartDay, effectiveFromCycle: cfg.effectiveFromCycle }
      : undefined,
  };
}

/** Bangun dokumen konfigurasi baru dari input Supervisor (input sudah divalidasi pemanggil). */
export function applyBudgetChange(
  prev: BudgetConfig | undefined,
  input: BudgetInput,
  ctx: { userId: string; byId: string; today: string; nowIso: string; fallback: BudgetSnapshot },
): BudgetConfig {
  const active = activeBudgetAt(prev, ctx.today, ctx.fallback);
  const previous: BudgetSnapshot = {
    monthlyBudget: active.monthlyBudget,
    mandatorySavingsTarget: active.mandatorySavingsTarget,
    cycleStartDay: active.cycleStartDay,
  };
  const day = clampStartDay(input.cycleStartDay);
  const effectiveFromCycle =
    input.effectiveScope === "current_month" ? cycleKeyOf(ctx.today, day) : nextCycleKey(active.cycleKey);
  return {
    id: budgetConfigId(ctx.userId),
    userId: ctx.userId,
    monthlyBudget: Math.round(input.monthlyBudget),
    mandatorySavingsTarget: Math.round(input.mandatorySavingsTarget),
    cycleStartDay: day,
    rolloverPolicy: input.rolloverPolicy,
    effectiveScope: input.effectiveScope,
    effectiveFromCycle,
    previous: input.effectiveScope === "next_month" ? previous : undefined,
    updatedAt: ctx.nowIso,
    updatedBy: ctx.byId,
  };
}

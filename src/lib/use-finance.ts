"use client";

/**
 * Hook ringkasan keuangan (Versi 5.6). Semua layar membaca angka dari `buildFinanceContext`, jadi
 * Beranda, Laci Catat, Detektif dan panel Supervisor selalu sepakat.
 */
import { useEffect, useMemo } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { buildFinanceContext, type FinanceContext } from "@/lib/finance/context";
import { localDateStr } from "@/lib/dates";
import type { FinTx } from "@/lib/finance/types";

export function useFinanceContext(userId: string | undefined): FinanceContext | null {
  const txs = useBukuDompetStore((s) => s.transactions);
  const profiles = useBukuDompetStore((s) => s.profiles);
  const configs = useFinanceStore((s) => s.budgetConfigs);
  const wallets = useFinanceStore((s) => s.subWallets);
  const closings = useFinanceStore((s) => s.monthlyClosings);
  const today = localDateStr();
  return useMemo(() => {
    if (!userId) return null;
    const prof = profiles.find((p) => p.id === userId);
    if (!prof) return null;
    return buildFinanceContext({
      userId,
      today,
      config: configs.find((c) => c.userId === userId),
      profile: prof,
      txs: txs as FinTx[],
      wallets,
      closings,
    });
  }, [userId, today, profiles, txs, configs, wallets, closings]);
}

/** Pastikan dompet bawaan ada & sudah di siklus berjalan (hidrasi malas untuk akun lama; tidak mengubah saldo). */
export function useEnsureWallets(userId: string | undefined, enabled = true): void {
  const ensure = useFinanceStore((s) => s.ensureWallets);
  const configs = useFinanceStore((s) => s.budgetConfigs);
  const closings = useFinanceStore((s) => s.monthlyClosings);
  const today = localDateStr();
  useEffect(() => {
    if (userId && enabled) ensure(userId);
  }, [userId, enabled, ensure, configs, closings, today]);
}

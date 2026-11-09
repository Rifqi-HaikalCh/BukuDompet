/**
 * Ringkasan keuangan satu anak pada satu tanggal — satu fungsi murni yang dipakai Beranda, Dompet, Supervisor
 * dan aksi store, sehingga semua layar menampilkan angka yang sama.
 */
import { activeBudgetAt, defaultBudgetFor, type ActiveBudget } from "./budget";
import { cycleBounds, type CycleBounds } from "./cycle";
import { carriedOverBalance } from "./closing";
import { safeToSpendToday, friendDebtTotal } from "./habits";
import { cycleTotals, type CycleTotals } from "./ledger";
import { FOOD_WALLET_KEY, monthlyCashOf, totalAllocated, unallocatedCash, walletBalance, walletSpent } from "./wallets";
import type { BudgetConfig, FinTx, MonthlyClosing, SubWallet } from "./types";

export interface WalletView extends SubWallet {
  spent: number;
  balance: number;
}

export interface FinanceContext {
  budget: ActiveBudget;
  cycle: CycleBounds;
  totals: CycleTotals;
  carriedOver: number;
  monthlyCash: number;
  allocated: number;
  unallocated: number;
  wallets: WalletView[];
  grantWallets: WalletView[];
  vault?: WalletView;
  foodBalance: number | null;
  safeToSpend: number | null;
  friendDebt: number;
  /** Total pengeluaran pribadi siklus ini dibanding anggaran (0..n). */
  burnRatio: number;
}

export function buildFinanceContext(i: {
  userId: string;
  today: string;
  config?: BudgetConfig;
  profile: { monthly_budget_target?: number; monthly_saving_target?: number };
  txs: readonly FinTx[];
  wallets: readonly SubWallet[];
  closings: readonly MonthlyClosing[];
}): FinanceContext {
  const mine = i.wallets.filter((w) => w.userId === i.userId && !w.archived);
  const budget = activeBudgetAt(i.config, i.today, defaultBudgetFor(i.profile));
  const cycle = cycleBounds(i.today, budget.cycleStartDay);
  const range = { start: cycle.start, end: cycle.end };
  const totals = cycleTotals(i.txs, i.userId, range, mine);
  const carriedOver = carriedOverBalance(i.closings, i.userId, cycle.key);
  const monthlyCash = monthlyCashOf({ monthlyBudget: budget.monthlyBudget, incomeInCycle: totals.income, carriedOver });
  const view = (w: SubWallet): WalletView => ({ ...w, spent: walletSpent(w, i.txs, range), balance: walletBalance(w, i.txs, range) });
  const wallets = mine.filter((w) => w.type !== "grant").map(view);
  const food = wallets.find((w) => w.key === FOOD_WALLET_KEY);
  return {
    budget,
    cycle,
    totals,
    carriedOver,
    monthlyCash,
    allocated: totalAllocated(mine, cycle.key),
    unallocated: unallocatedCash({ monthlyCash, mandatorySavingsTarget: budget.mandatorySavingsTarget, wallets: mine, cycleKey: cycle.key }),
    wallets,
    grantWallets: mine.filter((w) => w.type === "grant").map(view),
    vault: wallets.find((w) => w.type === "savings"),
    foodBalance: food ? food.balance : null,
    safeToSpend: safeToSpendToday({ foodWalletBalance: food ? food.balance : null, daysLeft: cycle.daysLeft }),
    friendDebt: friendDebtTotal(i.txs, i.userId),
    burnRatio: budget.monthlyBudget > 0 ? totals.ownSpent / budget.monthlyBudget : 0,
  };
}

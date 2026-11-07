"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Receipt,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  EXPENSE_CATEGORIES,
} from "@/lib/spending-detective";
import {
  MochiCompanion,
  MOCHI_STAGE_NAMES,
} from "@/components/illustrations/MochiCompanion";
import {
  SteppingStoneNode,
  AnimatedTreasureChest,
  type StoneStatus,
  type ChestState,
} from "@/components/illustrations/AdventureNodes";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  RollingNumber,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type TimeScope = "daily" | "weekly" | "monthly";

function getRelativeDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

export default function UserHomePage() {
  const {
    profiles,
    transactions,
    isProudComboActive,
    openedCheckpointWeeks,
    setTransactionDrawerOpen,
    claimWeeklyCheckpointChest,
    recordZeroSpendDay,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];
  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = analyzeSpendingDetective({
    transactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    isProudComboActive,
  });

  const [scope, setScope] = useState<TimeScope>("daily");
  const todayStr = getRelativeDateStr(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Build 14-day Adventure Path Stones (last 6 days + today + next 7 days checkpoint track)
  const adventureDays = useMemo(() => {
    const list: {
      dateStr: string;
      dayNum: number;
      dayLabel: string;
      status: StoneStatus;
      totalSpent: number;
      txCount: number;
      isCheckpointChestAfter?: number; // Week 1 or Week 2
    }[] = [];

    for (let offset = -6; offset <= 1; offset++) {
      const dStr = getRelativeDateStr(offset);
      const dObj = new Date(dStr + "T12:00:00");
      const dayNum = dObj.getDate();
      const dayLabel =
        offset === 0
          ? "Hari Ini"
          : offset === -1
          ? "Kemarin"
          : dObj.toLocaleDateString("id-ID", {
              weekday: "short",
              day: "numeric",
            });

      const dayTxs = transactions.filter((t) => t.transaction_date === dStr);
      const dayExpense = dayTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.total_amount), 0);

      let status: StoneStatus = "completed_safe";
      if (offset === 0) {
        status = "active_today";
      } else if (offset > 0) {
        status = "missed_frozen";
      } else if (dayExpense > report.dssl * 1.05) {
        status = "completed_warn";
      } else if (dayTxs.length === 0 && offset === -6) {
        status = "missed_frozen";
      } else {
        status = "completed_safe";
      }

      list.push({
        dateStr: dStr,
        dayNum,
        dayLabel,
        status,
        totalSpent: dayExpense,
        txCount: dayTxs.length,
        isCheckpointChestAfter: offset === 0 ? 1 : undefined,
      });
    }
    return list;
  }, [transactions, report.dssl]);

  const selectedDayTransactions = useMemo(() => {
    return transactions.filter((t) => t.transaction_date === selectedDateStr);
  }, [transactions, selectedDateStr]);

  const handleChestClick = (weekNum: number) => {
    const res = claimWeeklyCheckpointChest(weekNum);
    if (res.success) {
      soundEffects.mysteryDrumroll();
      fireCozyConfetti("jackpot");
    } else {
      soundEffects.tactileClick();
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Mochi's Cozy Room Widget */}
      <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Mochi Companion SVG */}
          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-[#FFFDF7] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center shrink-0 relative">
            <MochiCompanion
              stage={report.mochiStage}
              mood={report.mochiMood}
              className="w-36 h-36"
            />
            <span className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-[#FFC800] border-2 border-[#3D352E] font-fredoka text-[11px] font-bold">
              {MOCHI_STAGE_NAMES[report.mochiStage]}
            </span>
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left w-full">
            {/* Speech Bubble */}
            <div className="bg-[#FFF7D6] border-2 border-[#3D352E] rounded-2xl p-3 text-xs sm:text-sm font-bold text-[#3D352E] relative">
              <p>&ldquo;{report.mochiSpeech}&rdquo;</p>
            </div>

            {/* Remaining Daily Safe Spend Banner */}
            <div className="bg-[#E5F9D7] border-2 border-[#3D352E] rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#46A302]">
                  Sisa Jatah Aman Hari Ini (DSSL)
                </p>
                <div className="font-fredoka text-xl sm:text-2xl font-bold text-[#3D352E]">
                  <RollingNumber
                    value={report.remainingDailySafeSpend}
                    prefix="Rp"
                  />
                </div>
                <p className="text-[11px] font-bold text-[#7A6E65]">
                  Terpakai hari ini: {formatRupiah(report.todayTotalSpend)} dari{" "}
                  {formatRupiah(report.dssl)}
                </p>
              </div>
              <TactileButton
                variant="matcha"
                size="sm"
                onClick={() => setTransactionDrawerOpen(true)}
              >
                <Plus className="w-4 h-4" /> Catat
              </TactileButton>
            </div>
          </div>
        </div>

        {/* Budget Health Bar */}
        <ChunkyProgressBar
          value={report.remainingDailySafeSpend}
          max={report.dssl}
          variant={
            report.statusColor === "matcha"
              ? "matcha"
              : report.statusColor === "honey"
              ? "honey"
              : "berry"
          }
          label="Energi Dompet Harian"
          showFraction
        />
      </CozyCard>

      {/* 2. Time-Scope Segmented Switcher */}
      <div className="grid grid-cols-3 gap-2 bg-[#F7F2E7] p-1.5 rounded-2xl border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E]">
        {(
          [
            { id: "daily", label: "Harian (Jalur)" },
            { id: "weekly", label: "Mingguan" },
            { id: "monthly", label: "Bulanan" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              soundEffects.tactileClick();
              setScope(tab.id);
            }}
            className={cn(
              "py-2 px-2 rounded-xl font-fredoka text-xs sm:text-sm font-bold transition-all cursor-pointer",
              scope === tab.id
                ? "bg-[#FFC800] text-[#3D352E] border-2 border-[#3D352E] shadow-[0_2px_0_0_#3D352E]"
                : "text-[#7A6E65] hover:text-[#3D352E]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3A. DAILY VIEW: Duolingo-style Adventure Track + Selected Day Receipt Feed */}
      {scope === "daily" && (
        <div className="space-y-5">
          <CozyCard
            tone="vanilla"
            className="p-4 sm:p-6 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E]">
                  🗺️ Peta Jalur Kas Harian
                </h2>
                <p className="text-xs font-bold text-[#7A6E65]">
                  Ketuk batu pijakan untuk melihat struk rincian hari tersebut!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  recordZeroSpendDay();
                  soundEffects.comboFanfare();
                  fireCozyConfetti("combo");
                }}
                className="px-3 py-1.5 rounded-xl bg-[#E5F9D7] hover:bg-[#58CC02] hover:text-white border-2 border-[#3D352E] text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Klaim Rp0 Hari Ini
              </button>
            </div>

            {/* Winding Stepping Stones Track */}
            <div className="flex flex-col items-center space-y-3 py-2">
              {adventureDays.map((node, index) => {
                // Zigzag horizontal offset like Duolingo path
                const offsets = [
                  "translate-x-0",
                  "-translate-x-8 sm:-translate-x-12",
                  "-translate-x-12 sm:-translate-x-16",
                  "-translate-x-6 sm:-translate-x-8",
                  "translate-x-4 sm:translate-x-8",
                  "translate-x-10 sm:translate-x-14",
                  "translate-x-0",
                  "-translate-x-6 sm:-translate-x-10",
                ];
                const offsetCls = offsets[index % offsets.length];
                const isSelected = selectedDateStr === node.dateStr;

                const chestState: ChestState = openedCheckpointWeeks.includes(1)
                  ? "opened"
                  : "ready_shaking";

                return (
                  <React.Fragment key={node.dateStr}>
                    <div
                      className={cn(
                        "flex flex-col items-center transition-transform",
                        offsetCls
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.tactileClick();
                          setSelectedDateStr(node.dateStr);
                        }}
                        className={cn(
                          "group relative flex flex-col items-center focus:outline-none cursor-pointer p-1.5 rounded-3xl transition-all",
                          isSelected &&
                            "ring-4 ring-[#FFC800] bg-white/80 shadow-[0_4px_0_0_#3D352E]"
                        )}
                      >
                        <SteppingStoneNode
                          status={node.status}
                          label={node.dayNum}
                          className="w-24 h-20 sm:w-28 sm:h-24 group-hover:scale-105 transition-transform"
                        />
                        <div className="mt-1 px-2.5 py-0.5 rounded-xl bg-white border-2 border-[#3D352E] text-[11px] font-extrabold flex items-center gap-1.5">
                          <span>{node.dayLabel}</span>
                          {node.totalSpent > 0 && (
                            <span className="font-mono-num text-[#E06353]">
                              • {formatRupiah(node.totalSpent)}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Every 7th stone: Weekly Checkpoint Treasure Chest */}
                    {node.isCheckpointChestAfter && (
                      <div className="py-2 flex flex-col items-center">
                        <div className="w-1 h-5 bg-[#3D352E]/30 rounded-full mb-1" />
                        <button
                          type="button"
                          onClick={() =>
                            handleChestClick(node.isCheckpointChestAfter!)
                          }
                          className="group bg-[#FFF7D6] hover:bg-[#FFC800]/40 border-2 border-[#3D352E] shadow-[0_4px_0_0_#3D352E] rounded-3xl px-5 py-3 flex items-center gap-3 cursor-pointer transition-all"
                        >
                          <AnimatedTreasureChest
                            state={chestState}
                            className="w-20 h-20"
                          />
                          <div className="text-left">
                            <span className="px-2 py-0.5 rounded-lg bg-[#FFC800] border border-[#3D352E] text-[10px] font-extrabold uppercase">
                              Checkpoint Minggu 1
                            </span>
                            <p className="font-fredoka text-base font-bold text-[#3D352E] mt-0.5">
                              {chestState === "opened"
                                ? "Peti Checkpoint Terklaim! 🎉"
                                : "Buka Peti Harta Mingguan! 🎁"}
                            </p>
                            <p className="text-xs font-bold text-[#7A6E65]">
                              {chestState === "opened"
                                ? "Hadiah +350 Poin & Mystery Box sudah masuk."
                                : "Ketuk peti untuk klaim +350 Poin & 1x Mystery Box!"}
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CozyCard>

          {/* Selected Stone Day Itemized Receipts Feed */}
          <TransactionDayFeed
            dateStr={selectedDateStr}
            transactions={selectedDayTransactions}
            onAddClick={() => setTransactionDrawerOpen(true)}
          />
        </div>
      )}

      {/* 3B. WEEKLY VIEW */}
      {scope === "weekly" && (
        <CozyCard tone="white" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                📅 Ringkasan Kas Mingguan (7 Hari)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Otomatis menghitung pengeluaran & sisa jatah mingguanmu
              </p>
            </div>
            <Calendar className="w-6 h-6 text-[#38B6FF]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#E0F4FF] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Jatah Mingguan Aman
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#3D352E]">
                {formatRupiah(report.weeklyBudgetAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFE8E5] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Terpakai Minggu Ini
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#E06353]">
                {formatRupiah(report.totalSpentThisWeek)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa Uang Minggu Ini
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#46A302]">
                {formatRupiah(report.remainingWeeklyBudget)}
              </p>
            </div>
          </div>

          <ChunkyProgressBar
            value={report.remainingWeeklyBudget}
            max={report.weeklyBudgetAllowance}
            variant="sky"
            label="Sisa Kuota Mingguan"
            showFraction
          />

          <div className="space-y-2.5 pt-2">
            <h3 className="font-fredoka text-base font-bold">
              Daftar Transaksi 7 Hari Terakhir
            </h3>
            {transactions.slice(0, 8).map((tx) => (
              <ReceiptCardItem key={tx.id} tx={tx} />
            ))}
          </div>
        </CozyCard>
      )}

      {/* 3C. MONTHLY VIEW */}
      {scope === "monthly" && (
        <CozyCard tone="white" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                🌕 Ringkasan Kas Bulanan & Target Tabungan
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa {report.remainingDaysInMonth} hari lagi di bulan ini
              </p>
            </div>
            <Sparkles className="w-6 h-6 text-[#FFC800]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Total Uang Saku Bulanan
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#3D352E]">
                {formatRupiah(report.monthlyAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFF7D6] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Target Tabungan Dikunci
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#E5A400]">
                {formatRupiah(report.monthlySavingTarget)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFE8E5] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Total Terpakai Bulan Ini
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#E06353]">
                {formatRupiah(report.totalSpentThisMonth)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#E0F4FF] border-2 border-[#3D352E]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa Uang Bulan Ini
              </p>
              <p className="font-mono-num text-lg font-extrabold text-[#1E88E5]">
                {formatRupiah(report.remainingTotalBalanceThisMonth)}
              </p>
            </div>
          </div>

          <ChunkyProgressBar
            value={report.remainingMonthlyPool}
            max={report.monthlySpendablePool}
            variant="matcha"
            label="Sisa Jatah Belanja Bulanan (Di Luar Tabungan)"
            showFraction
          />

          <div className="space-y-2 pt-2">
            <h3 className="font-fredoka text-base font-bold">
              Porsi Pengeluaran per Kategori
            </h3>
            {report.categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="p-3 rounded-2xl bg-[#F7F2E7] border-2 border-[#3D352E] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{cat.emoji}</span>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-[#3D352E]">
                      {cat.category}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#3D352E]">
                      {cat.group === "need" ? "Kebutuhan" : "Keinginan"} •{" "}
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <span className="font-mono-num text-sm font-extrabold text-[#3D352E]">
                  {formatRupiah(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </CozyCard>
      )}
    </div>
  );
}

function TransactionDayFeed({
  dateStr,
  transactions,
  onAddClick,
}: {
  dateStr: string;
  transactions: ReturnType<typeof useBukuDompetStore.getState>["transactions"];
  onAddClick: () => void;
}) {
  const formattedDate = new Date(dateStr + "T12:00:00").toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );

  return (
    <CozyCard tone="white" className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#3D352E]" />
          <div>
            <h3 className="font-fredoka text-base sm:text-lg font-bold text-[#3D352E]">
              Struk & Rincian Kas ({formattedDate})
            </h3>
            <p className="text-xs font-bold text-[#7A6E65]">
              {transactions.length} transaksi tercatat pada hari ini
            </p>
          </div>
        </div>
        <TactileButton variant="honey" size="sm" onClick={onAddClick}>
          <Plus className="w-4 h-4" /> Tambah
        </TactileButton>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F7F2E7] border-2 border-dashed border-[#3D352E] text-center space-y-2">
          <p className="font-fredoka text-base font-bold text-[#3D352E]">
            Belum ada pengeluaran di tanggal ini! 🍃
          </p>
          <p className="text-xs font-bold text-[#7A6E65]">
            Catat struk belanjamu dengan Misi Rinci untuk dapat +35 Poin!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {transactions.map((tx) => (
            <ReceiptCardItem key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </CozyCard>
  );
}

function ReceiptCardItem({
  tx,
}: {
  tx: ReturnType<typeof useBukuDompetStore.getState>["transactions"][number];
}) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const catMeta = EXPENSE_CATEGORIES.find((c) => c.name === tx.category);

  return (
    <div className="rounded-2xl border-2 border-[#3D352E] bg-[#FFFDF7] p-3.5 transition-all">
      <div
        onClick={() => {
          if (tx.items && tx.items.length > 0) {
            soundEffects.tactileClick();
            setExpanded(!expanded);
          }
        }}
        className="flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-2xl border-2 border-[#3D352E] flex items-center justify-center text-lg shrink-0",
              tx.type === "income"
                ? "bg-[#E5F9D7]"
                : tx.need_or_want === "need"
                ? "bg-[#E0F4FF]"
                : "bg-[#FFE8E5]"
            )}
          >
            {tx.type === "income" ? "💰" : catMeta?.emoji || "🧾"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-fredoka text-sm sm:text-base font-bold text-[#3D352E] truncate">
                {tx.title}
              </p>
              {tx.is_itemized && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FFC800] border border-[#3D352E] text-[10px] font-extrabold">
                  ✨ Rinci
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#7A6E65]">
              <span>{tx.category}</span>
              {tx.points_earned > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#E5A400] font-extrabold">
                  <Coins className="w-3 h-3" />+{tx.points_earned} Poin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "font-mono-num text-sm sm:text-base font-extrabold",
              tx.type === "income" ? "text-[#46A302]" : "text-[#3D352E]"
            )}
          >
            {tx.type === "income" ? "+" : "-"}
            {formatRupiah(tx.total_amount)}
          </span>
          {tx.items && tx.items.length > 0 && (
            <span className="p-1 rounded-lg bg-[#F7F2E7] border border-[#3D352E]">
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Sub-items receipt breakdown */}
      <AnimatePresence>
        {expanded && tx.items && tx.items.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-2.5 border-t-2 border-dashed border-[#3D352E]/30 space-y-1.5">
              {tx.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs font-bold px-2 py-1 rounded-xl bg-[#F7F2E7]"
                >
                  <span className="text-[#3D352E]">
                    • {item.item_name}{" "}
                    {item.quantity > 1 && (
                      <span className="text-[#7A6E65]">x{item.quantity}</span>
                    )}
                  </span>
                  <span className="font-mono-num font-extrabold text-[#3D352E]">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

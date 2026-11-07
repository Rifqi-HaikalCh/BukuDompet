"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
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
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  RollingNumber,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
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
    equippedMochiStage,
    equippedTitle,
    isProudComboActive,
    openedCheckpointWeeks,
    setTransactionDrawerOpen,
    setStreakCalendarOpen,
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

  const displayStage = equippedMochiStage || report.mochiStage;

  const [scope, setScope] = useState<TimeScope>("daily");
  const todayStr = getRelativeDateStr(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [confirmZeroSpendOpen, setConfirmZeroSpendOpen] =
    useState<boolean>(false);
  const [confirmChestWeek, setConfirmChestWeek] = useState<number | null>(null);

  // Build Adventure Path Stones
  const adventureDays = useMemo(() => {
    const list: {
      dateStr: string;
      dayNum: number;
      dayLabel: string;
      status: StoneStatus;
      totalSpent: number;
      txCount: number;
      isCheckpointChestAfter?: number;
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

  const executeChestOpen = (weekNum: number) => {
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
      {/* Confirm Modals */}
      <CozyConfirmModal
        open={confirmZeroSpendOpen}
        onClose={() => setConfirmZeroSpendOpen(false)}
        onConfirm={() => {
          recordZeroSpendDay();
          soundEffects.comboFanfare();
          fireCozyConfetti("combo");
        }}
        title="Hari Ini Nggak Jajan (Rp0 Spend)?"
        description="Mochi akan mencatat bahwa hari ini kamu berhasil puasa jajan! Api Streak harianmu tetap menyala + kamu mendapat hadiah +25 Poin & +30 XP!"
        confirmLabel="Ya, Klaim Rp0 Hari Ini!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        mochiStage={displayStage}
        badgeText="Master Puasa Jajan"
      />

      <CozyConfirmModal
        open={confirmChestWeek !== null}
        onClose={() => setConfirmChestWeek(null)}
        onConfirm={() => {
          if (confirmChestWeek !== null) {
            executeChestOpen(confirmChestWeek);
          }
        }}
        title="Buka Peti Harta Checkpoint?"
        description="Kamu akan membuka Peti Harta Mingguan dan langsung mendapatkan hadiah +350 Poin (Rp350) serta +1x Mystery Box Gacha!"
        confirmLabel="Ya, Buka Peti!"
        confirmVariant="honey"
        mochiMood="proud_combo"
        mochiStage={displayStage}
        badgeText="Checkpoint Mingguan"
      />

      {/* 1. Mochi's Cozy Room Widget */}
      <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Mochi Companion SVG */}
          <Link
            href="/app/pets"
            onClick={() => soundEffects.tactileClick()}
            className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 relative group"
          >
            <MochiCompanion
              stage={displayStage}
              mood={report.mochiMood}
              className="w-36 h-36 group-hover:scale-105 transition-transform"
            />
            <span className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-[#FFC800] border-b-[3px] border-b-[#E5A400] font-display text-[11px] font-extrabold text-[#3D352E]">
              {MOCHI_STAGE_NAMES[displayStage]}
            </span>
          </Link>

          <div className="flex-1 space-y-3 text-center sm:text-left w-full">
            <div className="flex items-center justify-center sm:justify-between flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB] inline-flex items-center gap-1">
                <CozyIcon name="pet_paw" size={14} /> {equippedTitle}
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  setStreakCalendarOpen(true);
                }}
                className="px-2.5 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1 hover:bg-[#FFC800]/30 cursor-pointer"
              >
                <CozyIcon name="calendar_streak" size={15} /> Kalender Streak
              </button>
            </div>

            {/* Speech Bubble */}
            <div className="bg-[#FFFBEB] border-2 border-[#FDE08D] rounded-2xl p-3 text-xs sm:text-sm font-bold text-[#3D352E] relative">
              <p>&ldquo;{report.mochiSpeech}&rdquo;</p>
            </div>

            {/* Remaining Daily Safe Spend Banner */}
            <div className="bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] rounded-2xl p-3.5 flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#46A302]">
                  Sisa Jatah Aman Hari Ini (DSSL)
                </p>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E]">
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
                <CozyIcon name="plus_record" size={18} /> Catat
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
      <div className="grid grid-cols-3 gap-2 bg-[#F6F0E4] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
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
              "py-2 px-2 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
              scope === tab.id
                ? "bg-[#FFC800] text-[#3D352E] border-b-[3px] border-b-[#E5A400]"
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
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CozyIcon name="home_path" size={28} />
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">
                    Peta Jalur Kas Harian
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Ketuk batu pijakan untuk melihat struk rincian hari tersebut!
                  </p>
                </div>
              </div>
              <TactileButton
                variant="matcha"
                size="sm"
                onClick={() => setConfirmZeroSpendOpen(true)}
              >
                <CozyIcon name="zero_spend" size={18} /> Klaim Rp0 Hari Ini
              </TactileButton>
            </div>

            {/* Winding Stepping Stones Track */}
            <div className="flex flex-col items-center space-y-3 py-2">
              {adventureDays.map((node, index) => {
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
                          "group relative flex flex-col items-center focus:outline-none cursor-pointer p-2 rounded-3xl transition-all",
                          isSelected &&
                            "bg-white/95 border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] shadow-sm"
                        )}
                      >
                        <SteppingStoneNode
                          status={node.status}
                          label={node.dayNum}
                          className="w-24 h-20 sm:w-28 sm:h-24 group-hover:scale-105 transition-transform"
                        />
                        <div className="mt-1 px-3 py-0.5 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold flex items-center gap-1.5">
                          <span>{node.dayLabel}</span>
                          {node.totalSpent > 0 && (
                            <span className="tabular-nums text-[#E06353]">
                              • {formatRupiah(node.totalSpent)}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Every 7th stone: Weekly Checkpoint Treasure Chest */}
                    {node.isCheckpointChestAfter && (
                      <div className="py-2 flex flex-col items-center">
                        <div className="w-1 h-5 bg-[#D4C9B4] rounded-full mb-1" />
                        <button
                          type="button"
                          onClick={() => {
                            if (chestState === "opened") {
                              soundEffects.tactileClick();
                            } else {
                              soundEffects.tactileClick();
                              setConfirmChestWeek(node.isCheckpointChestAfter!);
                            }
                          }}
                          className="group bg-[#FFFBEB] hover:bg-[#FFF4CE] border-2 border-[#FDE08D] border-b-[5px] border-b-[#F5C84C] rounded-3xl px-5 py-3 flex items-center gap-3 cursor-pointer transition-all"
                        >
                          <AnimatedTreasureChest
                            state={chestState}
                            className="w-20 h-20"
                          />
                          <div className="text-left">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFC800] text-[10px] font-display font-extrabold uppercase">
                              Checkpoint Minggu 1
                            </span>
                            <p className="font-display text-base font-extrabold text-[#3D352E] mt-0.5">
                              {chestState === "opened"
                                ? "Peti Checkpoint Terklaim!"
                                : "Buka Peti Harta Mingguan!"}
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
              <h2 className="font-display text-xl font-extrabold text-[#3D352E]">
                Ringkasan Kas Mingguan (7 Hari)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Otomatis menghitung pengeluaran & sisa jatah mingguanmu
              </p>
            </div>
            <CozyIcon name="calendar_streak" size={30} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#EEF8FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Jatah Mingguan Aman
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#3D352E]">
                {formatRupiah(report.weeklyBudgetAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Terpakai Minggu Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#E06353]">
                {formatRupiah(report.totalSpentThisWeek)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa Uang Minggu Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#46A302]">
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
            <h3 className="font-display text-base font-extrabold">
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
              <h2 className="font-display text-xl font-extrabold text-[#3D352E]">
                Ringkasan Kas Bulanan & Target Tabungan
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa {report.remainingDaysInMonth} hari lagi di bulan ini
              </p>
            </div>
            <CozyIcon name="cat_saving" size={30} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Total Uang Saku Bulanan
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#3D352E]">
                {formatRupiah(report.monthlyAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Target Tabungan Dikunci
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#E5A400]">
                {formatRupiah(report.monthlySavingTarget)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Total Terpakai Bulan Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#E06353]">
                {formatRupiah(report.totalSpentThisMonth)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#EEF8FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF]">
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa Uang Bulan Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-lg text-[#1E88E5]">
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
            <h3 className="font-display text-base font-extrabold">
              Porsi Pengeluaran per Kategori
            </h3>
            {report.categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="p-3 rounded-2xl bg-[#F9F4EA] border-2 border-[#E6DFD2] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <CategoryIcon category={cat.category} size={26} />
                  <div>
                    <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E]">
                      {cat.category}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E6DFD2]">
                      {cat.group === "need" ? "Kebutuhan" : "Keinginan"} •{" "}
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <span className="font-display font-extrabold tabular-nums text-sm text-[#3D352E]">
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
        <div className="flex items-center gap-2.5">
          <CozyIcon name="missions_scroll" size={26} />
          <div>
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E]">
              Struk & Rincian Kas ({formattedDate})
            </h3>
            <p className="text-xs font-bold text-[#7A6E65]">
              {transactions.length} transaksi tercatat pada hari ini
            </p>
          </div>
        </div>
        <TactileButton variant="honey" size="sm" onClick={onAddClick}>
          <CozyIcon name="plus_record" size={16} /> Tambah
        </TactileButton>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F9F4EA] border-2 border-dashed border-[#D4C9B4] text-center space-y-2">
          <p className="font-display text-base font-extrabold text-[#3D352E]">
            Belum ada pengeluaran di tanggal ini!
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

  return (
    <div className="rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-[#FFFDF9] p-3.5 transition-all">
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
              "w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0",
              tx.type === "income"
                ? "bg-[#EFFBE6] border-[#C3EFA4]"
                : tx.need_or_want === "need"
                ? "bg-[#EEF8FF] border-[#BCE3FF]"
                : "bg-[#FFF2F0] border-[#FFCDC6]"
            )}
          >
            <CategoryIcon category={tx.category} size={26} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate">
                {tx.title}
              </p>
              {tx.is_itemized && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold inline-flex items-center gap-0.5">
                  <CozyIcon name="combo_sparkle" size={12} /> Rinci
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#7A6E65]">
              <span>{tx.category}</span>
              {tx.points_earned > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#E5A400] font-display font-extrabold">
                  <CozyIcon name="coin_rupiah" size={14} />+{tx.points_earned}{" "}
                  Poin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "font-display text-sm sm:text-base font-extrabold tabular-nums",
              tx.type === "income" ? "text-[#46A302]" : "text-[#3D352E]"
            )}
          >
            {tx.type === "income" ? "+" : "-"}
            {formatRupiah(tx.total_amount)}
          </span>
          {tx.items && tx.items.length > 0 && (
            <span className="p-1 rounded-lg bg-[#F9F4EA] border border-[#E6DFD2]">
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
            <div className="mt-3 pt-2.5 border-t-2 border-dashed border-[#E6DFD2] space-y-1.5">
              {tx.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#F9F4EA]"
                >
                  <span className="text-[#3D352E]">
                    • {item.item_name}{" "}
                    {item.quantity > 1 && (
                      <span className="text-[#7A6E65]">x{item.quantity}</span>
                    )}
                  </span>
                  <span className="font-display font-extrabold tabular-nums text-[#3D352E]">
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

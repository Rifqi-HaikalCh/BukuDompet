"use client";

import React, { useState, useMemo } from "react";
import { Drawer } from "vaul";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects } from "@/lib/sound-effects";
import { cn, formatCompactRupiah } from "@/lib/utils";

type SummaryTab = "daily" | "weekly" | "monthly";
type TxFilterType = "all" | "expense" | "income";

export function StreakCalendarModal() {
  const {
    isStreakCalendarOpen,
    setStreakCalendarOpen,
    activeProfileId,
    profiles,
    transactions,
    streakFreezeDates,
    zeroSpendDates,
    buyStreakFreezeShield,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.id === activeProfileId && p.role === "user") ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const userTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === userProfile.id),
    [transactions, userProfile.id]
  );

  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = analyzeSpendingDetective({
    transactions: userTransactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    currentStage: userProfile.currentStage || 1,
    petCustomName: userProfile.petCustomName || "Mochi",
  });

  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState<SummaryTab>("daily");
  const [txFilter, setTxFilter] = useState<TxFilterType>("all");
  const [showAllTx, setShowAllTx] = useState<boolean>(false);
  const [confirmBuyFreeze, setConfirmBuyFreeze] = useState<boolean>(false);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    }
  );

  // Build calendar cells for current viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: {
      dateStr: string | null;
      dayNum: number | null;
      status: "safe" | "warn" | "freeze" | "empty";
      isZeroSpend: boolean;
      income: number;
      expense: number;
      txCount: number;
    }[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({
        dateStr: null,
        dayNum: null,
        status: "empty",
        isZeroSpend: false,
        income: 0,
        expense: 0,
        txCount: 0,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;

      const dayTxs = userTransactions.filter((t) => t.transaction_date === dStr);
      const income = dayTxs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.total_amount), 0);
      const expense = dayTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.total_amount), 0);

      const isFreeze = streakFreezeDates.includes(dStr);
      const isZeroSpend = zeroSpendDates.includes(dStr);

      let status: "safe" | "warn" | "freeze" | "empty" = "empty";
      if (isFreeze) {
        status = "freeze";
      } else if (isZeroSpend) {
        status = "safe";
      } else if (dayTxs.length > 0) {
        status = expense > report.dssl ? "warn" : "safe";
      }

      cells.push({
        dateStr: dStr,
        dayNum: d,
        status,
        isZeroSpend,
        income,
        expense,
        txCount: dayTxs.length,
      });
    }

    return cells;
  }, [
    viewYear,
    viewMonth,
    userTransactions,
    streakFreezeDates,
    zeroSpendDates,
    report.dssl,
  ]);

  // Selected date transactions & summary
  const selectedDayTxs = useMemo(() => {
    const raw = userTransactions.filter(
      (t) => t.transaction_date === selectedDateStr
    );
    if (txFilter === "all") return raw;
    return raw.filter((t) => t.type === txFilter);
  }, [userTransactions, selectedDateStr, txFilter]);

  const selectedDaySummary = useMemo(() => {
    const allDay = userTransactions.filter(
      (t) => t.transaction_date === selectedDateStr
    );
    const income = allDay
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const expense = allDay
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const safeRemaining = Math.max(0, report.dssl - expense);
    return { income, expense, safeRemaining };
  }, [userTransactions, selectedDateStr, report.dssl]);

  // Weekly breakdown (Weeks 1 - 4 in current month)
  const weeklySummaries = useMemo(() => {
    const monthTxs = userTransactions.filter((t) =>
      t.transaction_date.startsWith(monthPrefix)
    );
    const weeks = [
      { label: "Minggu 1 (Tgl 1-7)", min: 1, max: 7, income: 0, expense: 0 },
      { label: "Minggu 2 (Tgl 8-14)", min: 8, max: 14, income: 0, expense: 0 },
      {
        label: "Minggu 3 (Tgl 15-21)",
        min: 15,
        max: 21,
        income: 0,
        expense: 0,
      },
      {
        label: "Minggu 4+ (Tgl 22-31)",
        min: 22,
        max: 31,
        income: 0,
        expense: 0,
      },
    ];

    for (const tx of monthTxs) {
      const dayNum = parseInt(tx.transaction_date.slice(8, 10), 10);
      const bucket =
        weeks.find((w) => dayNum >= w.min && dayNum <= w.max) || weeks[3];
      if (tx.type === "income") {
        bucket.income += Number(tx.total_amount);
      } else {
        bucket.expense += Number(tx.total_amount);
      }
    }

    return weeks;
  }, [userTransactions, monthPrefix]);

  // Monthly summary for viewed month
  const monthlySummary = useMemo(() => {
    const monthTxs = userTransactions.filter((t) =>
      t.transaction_date.startsWith(monthPrefix)
    );
    const income = monthTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const needsExpense = monthTxs
      .filter((t) => t.type === "expense" && t.need_or_want === "need")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const wantsExpense = monthTxs
      .filter((t) => t.type === "expense" && t.need_or_want === "want")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const totalExpense = needsExpense + wantsExpense;

    const effectiveIncome = Math.max(income, userProfile.monthly_budget_target);
    const netRemaining = Math.max(0, effectiveIncome - totalExpense);

    const filteredMonthTxs =
      txFilter === "all"
        ? monthTxs
        : monthTxs.filter((t) => t.type === txFilter);

    return {
      income: effectiveIncome,
      needsExpense,
      wantsExpense,
      totalExpense,
      netRemaining,
      filteredMonthTxs,
    };
  }, [
    userTransactions,
    monthPrefix,
    userProfile.monthly_budget_target,
    txFilter,
  ]);

  const handlePrevMonth = () => {
    soundEffects.tactileClick();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    soundEffects.tactileClick();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const visibleDailyTxs = showAllTx
    ? selectedDayTxs
    : selectedDayTxs.slice(0, 5);

  const visibleMonthlyTxs = showAllTx
    ? monthlySummary.filteredMonthTxs
    : monthlySummary.filteredMonthTxs.slice(0, 5);

  return (
    <>
      <CozyConfirmModal
        open={confirmBuyFreeze}
        onClose={() => setConfirmBuyFreeze(false)}
        onConfirm={() => {
          const res = buyStreakFreezeShield();
          if (res.success) {
            soundEffects.comboFanfare();
          } else {
            soundEffects.detectiveBuzz();
          }
        }}
        title="Beli Perisai Es Streak Freeze?"
        description="Tukarkan 500 Poin (Rp500) untuk mendapatkan +1 Perisai Es yang otomatis melindungi api Streak jika kamu lupa mencatat sehari."
        confirmLabel="Ya, Beli (500 Poin)"
        confirmVariant="sky"
        badgeText="Proteksi Streak"
      />

      <Drawer.Root
        open={isStreakCalendarOpen}
        onOpenChange={setStreakCalendarOpen}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/50 z-50 backdrop-blur-[2px]" />
          <Drawer.Content
            className={cn(
              "bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] z-50 flex flex-col focus:outline-none",
              // Mobile: Bottom Sheet
              "fixed bottom-0 left-0 right-0 rounded-t-[32px] max-h-[92dvh]",
              // Desktop (>= 768px): Master-Detail Modal max-w-4xl
              "md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-[95vw] md:max-w-4xl md:rounded-3xl md:max-h-[88dvh] md:shadow-2xl"
            )}
          >
            <div className="md:hidden mx-auto w-14 h-2 rounded-full bg-[#D4C9B4] my-2.5 shrink-0" />

            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b-2 border-[#E6DFD2] flex items-center justify-between gap-3 shrink-0 bg-white md:rounded-t-3xl">
              <div className="flex items-center gap-3 min-w-0">
                <CozyIcon name="calendar_streak" size={30} animated />
                <div className="min-w-0">
                  <Drawer.Title className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                    Kalender Streak & Rekap Kas
                  </Drawer.Title>
                  <Drawer.Description className="text-xs font-bold text-[#7A6E65] truncate">
                    Ketuk tanggal mana pun untuk melihat rincian pemasukan &
                    pengeluaran!
                  </Drawer.Description>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStreakCalendarOpen(false)}
                className="p-2 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 text-[#3D352E]" />
              </button>
            </div>

            {/* Body: 2 Columns Master-Detail on Desktop, Vertical on Mobile */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* KOLOM KIRI (6 cols on Desktop): Streak Stats + Monthly Calendar Grid */}
                <div className="md:col-span-6 space-y-4 min-w-0">
                  {/* Streak Stats Header */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
                      <p className="text-[10px] font-bold text-[#7A6E65] truncate">
                        Streak Aktif
                      </p>
                      <p className="font-display text-base font-extrabold text-[#3D352E] flex items-center gap-1 mt-0.5">
                        <CozyIcon name="flame_streak" size={18} animated />
                        <span className="tabular-nums truncate">
                          {userProfile.current_streak} Hari
                        </span>
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
                      <p className="text-[10px] font-bold text-[#7A6E65] truncate">
                        Rekor Terpanjang
                      </p>
                      <p className="font-display text-base font-extrabold text-[#3D352E] tabular-nums mt-0.5 truncate">
                        {userProfile.longest_streak} Hari
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-[#7A6E65] truncate">
                          Freeze
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmBuyFreeze(true)}
                          className="text-[10px] font-display font-extrabold text-[#1E88E5] hover:underline cursor-pointer"
                        >
                          +Beli
                        </button>
                      </div>
                      <p className="font-display text-base font-extrabold text-[#3D352E] flex items-center gap-1 mt-0.5">
                        <CozyIcon name="ice_shield" size={16} />
                        <span className="tabular-nums">
                          {userProfile.streak_freeze_count}x
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Monthly Calendar Card */}
                  <CozyCard tone="white" className="p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-[#3D352E]" />
                      </button>
                      <h3 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] capitalize">
                        {monthName}
                      </h3>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-[#3D352E]" />
                      </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-display font-extrabold text-[#7A6E65]">
                      {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                        (day) => (
                          <div key={day} className="py-0.5">
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    {/* Standardized 4-Color Pastel Calendar Cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((cell, idx) => {
                        if (!cell.dateStr || !cell.dayNum) {
                          return <div key={`empty-${idx}`} className="h-13" />;
                        }

                        const isSelected = cell.dateStr === selectedDateStr;

                        // 4 Standardized Cell Colors per Task 5.2
                        const cellColorCls =
                          cell.status === "safe"
                            ? "bg-[#E8F8DC] text-[#2E6F00] border-[#B8E994]"
                            : cell.status === "warn"
                            ? "bg-[#FFEAE6] text-[#C83E2B] border-[#FFBFB3]"
                            : cell.status === "freeze"
                            ? "bg-[#E3F4FF] text-[#1565C0] border-[#9AD2FF]"
                            : "bg-[#F7F3EB] text-[#9E9284] border-transparent hover:border-[#E6DFD2]";

                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            onClick={() => {
                              soundEffects.tactileClick();
                              setSelectedDateStr(cell.dateStr!);
                              setActiveTab("daily");
                            }}
                            className={cn(
                              "h-13 rounded-xl p-1 flex flex-col items-center justify-between transition-all cursor-pointer border-2 min-w-0 overflow-hidden",
                              cellColorCls,
                              isSelected &&
                                "ring-2 ring-[#38B6FF] -translate-y-0.5 shadow-xs"
                            )}
                          >
                            <span className="text-[11px] font-display font-extrabold leading-none">
                              {cell.dayNum}
                            </span>

                            {cell.txCount > 0 ? (
                              <span className="tabular-nums text-[10px] font-display font-extrabold leading-tight truncate max-w-full">
                                {cell.expense > 0
                                  ? formatCompactRupiah(-cell.expense, {
                                      withPrefix: false,
                                      showSign: true,
                                    })
                                  : formatCompactRupiah(cell.income, {
                                      withPrefix: false,
                                      showSign: true,
                                    })}
                              </span>
                            ) : cell.isZeroSpend ? (
                              <span className="tabular-nums text-[10px] font-display font-extrabold leading-tight">
                                Rp0
                              </span>
                            ) : cell.status === "freeze" ? (
                              <span className="text-[9px] font-display font-extrabold">
                                Es
                              </span>
                            ) : (
                              <span className="text-[10px] opacity-40">-</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* 4-Color Legend */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px] font-bold text-[#7A6E65]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-[#E8F8DC] border border-[#B8E994] shrink-0" />
                        <span className="truncate">Aman / Rp0</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-[#FFEAE6] border border-[#FFBFB3] shrink-0" />
                        <span className="truncate">Lewat Batas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-[#E3F4FF] border border-[#9AD2FF] shrink-0" />
                        <span className="truncate">Freeze</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-[#F7F3EB] border border-[#E6DFD2] shrink-0" />
                        <span className="truncate">Kosong</span>
                      </div>
                    </div>
                  </CozyCard>
                </div>

                {/* KOLOM KANAN (6 cols on Desktop): Smart Summary Panel */}
                <div className="md:col-span-6 space-y-3.5 min-w-0">
                  {/* Sky Blue Active Time Filter Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
                    {(
                      [
                        { id: "daily", label: "Tanggal Dipilih" },
                        { id: "weekly", label: "Mingguan" },
                        { id: "monthly", label: "Bulanan" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          soundEffects.tactileClick();
                          setActiveTab(t.id);
                          setShowAllTx(false);
                        }}
                        className={cn(
                          "py-2 px-2 rounded-xl font-display text-xs font-extrabold transition-all cursor-pointer truncate",
                          activeTab === t.id
                            ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                            : "text-[#3D352E] hover:bg-white"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: HARIAN / TANGGAL DIPILIH */}
                  {activeTab === "daily" && (
                    <CozyCard tone="white" className="p-4 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate">
                          {new Date(
                            selectedDateStr + "T12:00:00"
                          ).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </h4>
                        <span className="text-xs font-bold text-[#7A6E65] shrink-0">
                          {selectedDayTxs.length} Catatan
                        </span>
                      </div>

                      {/* Visual Cashflow Bar (Pemasukan Hijau vs Pengeluaran Peach vs Sisa Uang Emas) */}
                      <VisualCashflowBar
                        income={selectedDaySummary.income}
                        expense={selectedDaySummary.expense}
                        remaining={selectedDaySummary.safeRemaining}
                        remainingLabel="Sisa Aman Hari Ini"
                      />

                      {/* Quick Filter: Semua | Pengeluaran | Pemasukan */}
                      <TxQuickFilterBar
                        active={txFilter}
                        onChange={(v) => {
                          setTxFilter(v);
                          setShowAllTx(false);
                        }}
                      />

                      {/* Bounded Transaction List (Max 5 default) */}
                      {selectedDayTxs.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-[#F7F3EB] text-center text-xs font-bold text-[#7A6E65]">
                          Belum ada transaksi pada filter & tanggal ini.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleDailyTxs.map((tx) => (
                            <CompactTxItem key={tx.id} tx={tx} />
                          ))}
                          {selectedDayTxs.length > 5 && (
                            <TactileButton
                              variant="cream"
                              size="sm"
                              fullWidth
                              onClick={() => setShowAllTx(!showAllTx)}
                            >
                              {showAllTx
                                ? "Tutup Sebagian ▴"
                                : `Lihat Semua (${selectedDayTxs.length} Transaksi) ▾`}
                            </TactileButton>
                          )}
                        </div>
                      )}
                    </CozyCard>
                  )}

                  {/* TAB 2: MINGGUAN (MINGGU 1 - 4) */}
                  {activeTab === "weekly" && (
                    <CozyCard tone="white" className="p-4 space-y-3.5">
                      <h4 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E]">
                        Rekap Kas 4 Minggu ({monthName})
                      </h4>

                      <div className="space-y-3">
                        {weeklySummaries.map((w) => {
                          const rem = Math.max(
                            0,
                            report.weeklyBudgetAllowance - w.expense
                          );
                          return (
                            <div
                              key={w.label}
                              className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs font-extrabold gap-2">
                                <span className="font-display text-[#3D352E] truncate">
                                  {w.label}
                                </span>
                                <span className="font-display tabular-nums text-[#C83E2B] shrink-0">
                                  -{formatCompactRupiah(w.expense)}
                                </span>
                              </div>
                              <VisualCashflowBar
                                income={w.income}
                                expense={w.expense}
                                remaining={rem}
                                remainingLabel="Sisa Kuota"
                                compact
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CozyCard>
                  )}

                  {/* TAB 3: BULANAN */}
                  {activeTab === "monthly" && (
                    <CozyCard tone="white" className="p-4 space-y-3.5">
                      <h4 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E]">
                        Rekapitulasi Bulanan ({monthName})
                      </h4>

                      <VisualCashflowBar
                        income={monthlySummary.income}
                        expense={monthlySummary.totalExpense}
                        remaining={monthlySummary.netRemaining}
                        remainingLabel="Sisa Uang Bersih"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
                          <p className="text-[10px] font-bold text-[#7A6E65]">
                            Kebutuhan Pokok (Needs)
                          </p>
                          <p className="font-display text-sm font-extrabold tabular-nums text-[#3D352E] truncate">
                            {formatCompactRupiah(monthlySummary.needsExpense)}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
                          <p className="text-[10px] font-bold text-[#7A6E65]">
                            Keinginan / Jajan (Wants)
                          </p>
                          <p className="font-display text-sm font-extrabold tabular-nums text-[#C83E2B] truncate">
                            {formatCompactRupiah(monthlySummary.wantsExpense)}
                          </p>
                        </div>
                      </div>

                      <TxQuickFilterBar
                        active={txFilter}
                        onChange={(v) => {
                          setTxFilter(v);
                          setShowAllTx(false);
                        }}
                      />

                      <div className="space-y-2">
                        {visibleMonthlyTxs.map((tx) => (
                          <CompactTxItem key={tx.id} tx={tx} />
                        ))}
                        {monthlySummary.filteredMonthTxs.length > 5 && (
                          <TactileButton
                            variant="cream"
                            size="sm"
                            fullWidth
                            onClick={() => setShowAllTx(!showAllTx)}
                          >
                            {showAllTx
                              ? "Tutup Sebagian ▴"
                              : `Lihat Semua (${monthlySummary.filteredMonthTxs.length} Transaksi) ▾`}
                          </TactileButton>
                        )}
                      </div>
                    </CozyCard>
                  )}
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

function VisualCashflowBar({
  income,
  expense,
  remaining,
  remainingLabel,
  compact = false,
}: {
  income: number;
  expense: number;
  remaining: number;
  remainingLabel: string;
  compact?: boolean;
}) {
  const totalBase = Math.max(1, income + expense + remaining);
  const incPct = Math.round((income / totalBase) * 100);
  const expPct = Math.round((expense / totalBase) * 100);
  const remPct = Math.max(0, 100 - incPct - expPct);

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
            <p className="text-[10px] font-bold text-[#7A6E65] truncate">
              Pemasukan
            </p>
            <p className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#2E6F00] truncate">
              +{formatCompactRupiah(income)}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
            <p className="text-[10px] font-bold text-[#7A6E65] truncate">
              Pengeluaran
            </p>
            <p className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#C83E2B] truncate">
              -{formatCompactRupiah(expense)}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
            <p className="text-[10px] font-bold text-[#7A6E65] truncate">
              {remainingLabel}
            </p>
            <p className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#4A3500] truncate">
              {formatCompactRupiah(remaining)}
            </p>
          </div>
        </div>
      )}

      {/* Multi-segment visual bar */}
      <div className="h-3.5 w-full rounded-full bg-[#F3ECE0] border border-[#E2D8C5] overflow-hidden flex">
        {income > 0 && (
          <div
            style={{ width: `${Math.max(10, incPct)}%` }}
            className="bg-[#58CC02] h-full"
            title={`Pemasukan: ${formatRupiah(income)}`}
          />
        )}
        {expense > 0 && (
          <div
            style={{ width: `${Math.max(10, expPct)}%` }}
            className="bg-[#FF8B7B] h-full"
            title={`Pengeluaran: ${formatRupiah(expense)}`}
          />
        )}
        {remaining > 0 && (
          <div
            style={{ width: `${Math.max(10, remPct)}%` }}
            className="bg-[#FFC800] h-full"
            title={`${remainingLabel}: ${formatRupiah(remaining)}`}
          />
        )}
      </div>
    </div>
  );
}

function TxQuickFilterBar({
  active,
  onChange,
}: {
  active: TxFilterType;
  onChange: (val: TxFilterType) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {(
        [
          { id: "all", label: "Semua" },
          { id: "expense", label: "Pengeluaran (-Rp)" },
          { id: "income", label: "Pemasukan (+Rp)" },
        ] as const
      ).map((btn) => (
        <button
          key={btn.id}
          type="button"
          onClick={() => {
            soundEffects.tactileClick();
            onChange(btn.id);
          }}
          className={cn(
            "px-2.5 py-1 rounded-xl text-[11px] font-display font-extrabold cursor-pointer transition-all",
            active === btn.id
              ? "bg-[#38B6FF] text-white border-b-[2px] border-b-[#1E88E5]"
              : "bg-[#F7F3EB] text-[#7A6E65] hover:text-[#3D352E]"
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

function CompactTxItem({
  tx,
}: {
  tx: ReturnType<typeof useBukuDompetStore.getState>["transactions"][number];
}) {
  return (
    <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <CategoryIcon category={tx.category} size={22} />
          <div className="min-w-0">
            <p className="font-display text-xs sm:text-sm font-extrabold text-[#3D352E] truncate">
              {tx.title}
            </p>
            <p className="text-[10px] font-bold text-[#7A6E65] truncate">
              {tx.category}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "font-display font-extrabold tabular-nums text-xs sm:text-sm shrink-0",
            tx.type === "income" ? "text-[#2E6F00]" : "text-[#C83E2B]"
          )}
        >
          {tx.type === "income" ? "+" : "-"}
          {formatRupiah(tx.total_amount)}
        </span>
      </div>

      {tx.items && tx.items.length > 0 && (
        <div className="pl-7 space-y-0.5">
          {tx.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between text-[11px] font-bold text-[#7A6E65]"
            >
              <span className="truncate pr-2">
                • {it.item_name} {it.quantity > 1 && `x${it.quantity}`}
              </span>
              <span className="font-display font-extrabold tabular-nums text-[#3D352E] shrink-0">
                {formatRupiah(it.subtotal)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

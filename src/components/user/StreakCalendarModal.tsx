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
  ChunkyProgressBar,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type SummaryTab = "daily" | "weekly" | "monthly";

function formatShortCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "+";
  if (abs >= 1000000) {
    return `${sign}${(abs / 1000000).toFixed(1).replace(".0", "")}jt`;
  }
  if (abs >= 1000) {
    return `${sign}${Math.round(abs / 1000)}rb`;
  }
  return `${sign}${abs}`;
}

export function StreakCalendarModal() {
  const {
    isStreakCalendarOpen,
    setStreakCalendarOpen,
    profiles,
    transactions,
    streakFreezeDates,
    zeroSpendDates,
    buyStreakFreezeShield,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];
  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = analyzeSpendingDetective({
    transactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
  });

  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState<SummaryTab>("daily");
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
    // Monday-based index (0 = Senin ... 6 = Minggu)
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: {
      dateStr: string | null;
      dayNum: number | null;
      status: "safe" | "warn" | "freeze" | "zero" | "empty";
      netAmount: number;
      income: number;
      expense: number;
      txCount: number;
    }[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({
        dateStr: null,
        dayNum: null,
        status: "empty",
        netAmount: 0,
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

      const dayTxs = transactions.filter((t) => t.transaction_date === dStr);
      const income = dayTxs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.total_amount), 0);
      const expense = dayTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.total_amount), 0);

      const isFreeze = streakFreezeDates.includes(dStr);
      const isZeroSpend = zeroSpendDates.includes(dStr);

      let status: "safe" | "warn" | "freeze" | "zero" | "empty" = "empty";
      if (isFreeze) {
        status = "freeze";
      } else if (isZeroSpend) {
        status = "zero";
      } else if (dayTxs.length > 0) {
        status = expense > report.dssl ? "warn" : "safe";
      }

      cells.push({
        dateStr: dStr,
        dayNum: d,
        status,
        netAmount: income - expense,
        income,
        expense,
        txCount: dayTxs.length,
      });
    }

    return cells;
  }, [
    viewYear,
    viewMonth,
    transactions,
    streakFreezeDates,
    zeroSpendDates,
    report.dssl,
  ]);

  // Selected date transactions & summary
  const selectedDayTxs = useMemo(() => {
    return transactions.filter((t) => t.transaction_date === selectedDateStr);
  }, [transactions, selectedDateStr]);

  const selectedDaySummary = useMemo(() => {
    const income = selectedDayTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const expense = selectedDayTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const safeRemaining = Math.max(0, report.dssl - expense);
    return { income, expense, safeRemaining };
  }, [selectedDayTxs, report.dssl]);

  // Weekly breakdown (Weeks 1 - 4 in current month)
  const weeklySummaries = useMemo(() => {
    const monthTxs = transactions.filter((t) =>
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
  }, [transactions, monthPrefix]);

  // Monthly summary for viewed month
  const monthlySummary = useMemo(() => {
    const monthTxs = transactions.filter((t) =>
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

    const activeDaysCount = new Set(monthTxs.map((t) => t.transaction_date))
      .size;

    return {
      income: Math.max(income, userProfile.monthly_budget_target),
      needsExpense,
      wantsExpense,
      totalExpense,
      netRemaining: Math.max(
        0,
        Math.max(income, userProfile.monthly_budget_target) - totalExpense
      ),
      activeDaysCount,
    };
  }, [transactions, monthPrefix, userProfile.monthly_budget_target]);

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
          <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/45 z-50 backdrop-blur-[2px]" />
          <Drawer.Content className="bg-[#FFFDF9] border-t-4 border-[#E6DFD2] rounded-t-[36px] fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] flex flex-col focus:outline-none">
            <div className="mx-auto w-14 h-2 rounded-full bg-[#D4C9B4] my-3 shrink-0" />

            <div className="px-4 sm:px-6 pb-8 overflow-y-auto max-w-2xl mx-auto w-full space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] flex items-center justify-center">
                    <CozyIcon name="calendar_streak" size={32} animated />
                  </div>
                  <div>
                    <Drawer.Title className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E]">
                      Kalender Streak & Rekap Kas
                    </Drawer.Title>
                    <Drawer.Description className="text-xs font-bold text-[#7A6E65]">
                      Ketuk tanggal mana pun untuk mengintip rincian & statistik!
                    </Drawer.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStreakCalendarOpen(false)}
                  className="p-2.5 rounded-2xl bg-[#F9F4EA] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] cursor-pointer"
                >
                  <X className="w-5 h-5 text-[#3D352E]" />
                </button>
              </div>

              {/* Streak & Freeze Top Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CozyCard
                  tone="honey"
                  className="p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <CozyIcon name="flame_streak" size={34} animated />
                    <div>
                      <p className="text-xs font-bold text-[#7A6E65]">
                        Streak Aktif Saat Ini
                      </p>
                      <p className="font-display text-xl font-extrabold text-[#3D352E]">
                        {userProfile.current_streak} Hari Berturut!
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-white border border-[#FDE08D] text-xs font-display font-extrabold text-[#3D352E]">
                    Rekor: {userProfile.longest_streak}h
                  </span>
                </CozyCard>

                <CozyCard
                  tone="sky"
                  className="p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <CozyIcon name="ice_shield" size={34} />
                    <div>
                      <p className="text-xs font-bold text-[#7A6E65]">
                        Perisai Es (Streak Freeze)
                      </p>
                      <p className="font-display text-xl font-extrabold text-[#3D352E]">
                        {userProfile.streak_freeze_count} Tersedia
                      </p>
                    </div>
                  </div>
                  <TactileButton
                    variant="sky"
                    size="sm"
                    onClick={() => setConfirmBuyFreeze(true)}
                  >
                    + Beli (500P)
                  </TactileButton>
                </CozyCard>
              </div>

              {/* Monthly Calendar Grid */}
              <CozyCard tone="white" className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl bg-[#F9F4EA] border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#3D352E]" />
                  </button>
                  <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] capitalize">
                    {monthName}
                  </h3>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl bg-[#F9F4EA] border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-[#3D352E]" />
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-display font-extrabold text-[#7A6E65]">
                  {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                    (day) => (
                      <div key={day} className="py-1">
                        {day}
                      </div>
                    )
                  )}
                </div>

                {/* Calendar Cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.dateStr || !cell.dayNum) {
                      return <div key={`empty-${idx}`} className="h-16" />;
                    }

                    const isSelected = cell.dateStr === selectedDateStr;
                    const hasActivity =
                      cell.txCount > 0 ||
                      cell.status === "freeze" ||
                      cell.status === "zero";

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
                          "h-16 rounded-2xl p-1 flex flex-col items-center justify-between transition-all cursor-pointer border-2",
                          isSelected
                            ? "bg-[#FFFBEB] border-[#FFC800] border-b-[4px] border-b-[#E5A400] -translate-y-0.5"
                            : cell.status === "safe" || cell.status === "zero"
                            ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[3px] border-b-[#9EE070]"
                            : cell.status === "warn"
                            ? "bg-[#FFF2F0] border-[#FFCDC6] border-b-[3px] border-b-[#FFA89C]"
                            : cell.status === "freeze"
                            ? "bg-[#EEF8FF] border-[#BCE3FF] border-b-[3px] border-b-[#89CAFF]"
                            : "bg-[#F9F4EA] border-[#E6DFD2] hover:bg-white"
                        )}
                      >
                        <span className="text-[11px] font-display font-extrabold text-[#3D352E] leading-none">
                          {cell.dayNum}
                        </span>

                        <div className="flex items-center justify-center">
                          {cell.status === "safe" && (
                            <CozyIcon name="flame_streak" size={18} />
                          )}
                          {cell.status === "warn" && (
                            <CozyIcon name="warning_siren" size={18} />
                          )}
                          {cell.status === "freeze" && (
                            <CozyIcon name="ice_shield" size={18} />
                          )}
                          {cell.status === "zero" && (
                            <CozyIcon name="zero_spend" size={18} />
                          )}
                          {cell.status === "empty" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4C9B4]" />
                          )}
                        </div>

                        {hasActivity && cell.txCount > 0 ? (
                          <span
                            className={cn(
                              "text-[9px] font-display font-extrabold tabular-nums px-1 rounded-md leading-tight truncate max-w-full",
                              cell.expense > 0
                                ? "text-[#E06353] bg-white/80"
                                : "text-[#46A302] bg-white/80"
                            )}
                          >
                            {cell.expense > 0
                              ? formatShortCompact(-cell.expense)
                              : formatShortCompact(cell.income)}
                          </span>
                        ) : cell.status === "zero" ? (
                          <span className="text-[9px] font-display font-extrabold text-[#46A302]">
                            Rp0
                          </span>
                        ) : (
                          <span className="text-[9px] text-transparent">.</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] font-bold text-[#7A6E65]">
                  <span className="inline-flex items-center gap-1">
                    <CozyIcon name="flame_streak" size={15} /> Aman & Mencatat
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CozyIcon name="zero_spend" size={15} /> Puasa Jajan Rp0
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CozyIcon name="ice_shield" size={15} /> Streak Freeze
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CozyIcon name="warning_siren" size={15} /> Lewat Batas
                  </span>
                </div>
              </CozyCard>

              {/* 3 Smart Summary Tabs Switcher */}
              <div className="grid grid-cols-3 gap-2 bg-[#F6F0E4] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
                {(
                  [
                    { id: "daily", label: "Tanggal Terpilih" },
                    { id: "weekly", label: "Mingguan (1-4)" },
                    { id: "monthly", label: "Bulanan" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setActiveTab(t.id);
                    }}
                    className={cn(
                      "py-2 px-2 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer",
                      activeTab === t.id
                        ? "bg-[#FFC800] text-[#3D352E] border-b-[3px] border-b-[#E5A400]"
                        : "text-[#7A6E65] hover:text-[#3D352E]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: RINGKASAN TANGGAL TERPILIH */}
              {activeTab === "daily" && (
                <CozyCard tone="white" className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-base font-extrabold text-[#3D352E]">
                      Rekap Tanggal:{" "}
                      {new Date(
                        selectedDateStr + "T12:00:00"
                      ).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h4>
                    <span className="text-xs font-bold text-[#7A6E65]">
                      {selectedDayTxs.length} Transaksi
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4]">
                      <p className="text-[11px] font-bold text-[#7A6E65]">
                        Pemasukan
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-sm sm:text-base text-[#46A302]">
                        {formatRupiah(selectedDaySummary.income)}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#FFF2F0] border border-[#FFCDC6]">
                      <p className="text-[11px] font-bold text-[#7A6E65]">
                        Pengeluaran
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-sm sm:text-base text-[#E06353]">
                        {formatRupiah(selectedDaySummary.expense)}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#EEF8FF] border border-[#BCE3FF]">
                      <p className="text-[11px] font-bold text-[#7A6E65]">
                        Sisa Jatah Aman
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-sm sm:text-base text-[#1E88E5]">
                        {formatRupiah(selectedDaySummary.safeRemaining)}
                      </p>
                    </div>
                  </div>

                  {selectedDayTxs.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#F9F4EA] border border-[#E6DFD2] text-center text-xs font-bold text-[#7A6E65]">
                      Tidak ada transaksi pada tanggal ini.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayTxs.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl bg-[#F9F4EA] border border-[#E6DFD2] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={tx.category} size={24} />
                              <div>
                                <p className="font-display text-sm font-extrabold text-[#3D352E]">
                                  {tx.title}
                                </p>
                                <p className="text-[11px] font-bold text-[#7A6E65]">
                                  {tx.category}
                                </p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "font-display font-extrabold tabular-nums text-sm",
                                tx.type === "income"
                                  ? "text-[#46A302]"
                                  : "text-[#E06353]"
                              )}
                            >
                              {tx.type === "income" ? "+" : "-"}
                              {formatRupiah(tx.total_amount)}
                            </span>
                          </div>
                          {tx.items && tx.items.length > 0 && (
                            <div className="pl-7 space-y-1">
                              {tx.items.map((it) => (
                                <div
                                  key={it.id}
                                  className="flex items-center justify-between text-xs font-bold text-[#7A6E65]"
                                >
                                  <span>
                                    • {it.item_name}{" "}
                                    {it.quantity > 1 && `x${it.quantity}`}
                                  </span>
                                  <span className="font-display font-extrabold tabular-nums text-[#3D352E]">
                                    {formatRupiah(it.subtotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CozyCard>
              )}

              {/* TAB 2: RINGKASAN MINGGUAN (MINGGU 1 - 4) */}
              {activeTab === "weekly" && (
                <CozyCard tone="white" className="space-y-3.5">
                  <h4 className="font-display text-base font-extrabold text-[#3D352E]">
                    Perbandingan Mingguan ({monthName})
                  </h4>
                  <div className="space-y-3">
                    {weeklySummaries.map((w) => (
                      <div
                        key={w.label}
                        className="p-3.5 rounded-2xl bg-[#F9F4EA] border border-[#E6DFD2] space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span className="font-display text-sm text-[#3D352E]">
                            {w.label}
                          </span>
                          <span className="font-display tabular-nums text-[#E06353]">
                            Keluar: {formatRupiah(w.expense)}
                          </span>
                        </div>
                        <ChunkyProgressBar
                          value={w.expense}
                          max={report.weeklyBudgetAllowance}
                          variant={
                            w.expense <= report.weeklyBudgetAllowance
                              ? "matcha"
                              : "peach"
                          }
                          showFraction
                        />
                      </div>
                    ))}
                  </div>
                </CozyCard>
              )}

              {/* TAB 3: RINGKASAN BULANAN */}
              {activeTab === "monthly" && (
                <CozyCard tone="white" className="space-y-3.5">
                  <h4 className="font-display text-base font-extrabold text-[#3D352E]">
                    Rekapitulasi Bulanan & Statistik Streak ({monthName})
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4]">
                      <p className="text-xs font-bold text-[#7A6E65]">
                        Total Dana Bulan Ini
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-lg text-[#46A302]">
                        {formatRupiah(monthlySummary.income)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FFF2F0] border border-[#FFCDC6]">
                      <p className="text-xs font-bold text-[#7A6E65]">
                        Total Pengeluaran
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-lg text-[#E06353]">
                        {formatRupiah(monthlySummary.totalExpense)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#EEF8FF] border border-[#BCE3FF]">
                      <p className="text-xs font-bold text-[#7A6E65]">
                        Butuh vs Ingin
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-xs text-[#3D352E] mt-1">
                        Butuh: {formatRupiah(monthlySummary.needsExpense)} |
                        Ingin: {formatRupiah(monthlySummary.wantsExpense)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE08D]">
                      <p className="text-xs font-bold text-[#7A6E65]">
                        Sisa Uang / Tabungan Bersih
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-lg text-[#3D352E]">
                        {formatRupiah(monthlySummary.netRemaining)}
                      </p>
                    </div>
                  </div>
                </CozyCard>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

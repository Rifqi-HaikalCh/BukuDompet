"use client";

import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Users,
  Heart,
} from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { SupervisorShell } from "@/components/supervisor/SupervisorShell";
import { KidMonitorPanel } from "@/components/supervisor/KidMonitorPanel";
import { localDateStr } from "@/lib/dates";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  GROWTH_STAGE_META,
} from "@/components/illustrations/PetAvatarSystem";
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
import { cn, formatCompactRupiah } from "@/lib/utils";

type SupervisorTab = "today" | "week" | "month" | "calendar";
type TxSubFilter = "all" | "expense" | "income" | "saving";

/** Tanggal lokal (WIB tidak lagi bergeser seperti saat memakai UTC). */
function getRelativeDateStr(daysOffset: number): string {
  return localDateStr(daysOffset);
}

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const {
    activeProfileId,
    monitoredUserId,
    profiles,
    supervisorAssignments,
    transactions,
    streakFreezeDates,
    zeroSpendDates,
    setMonitoredUserId,
    sendSupervisorCheer,
  } = useBukuDompetStore();

  // Active Supervisor Profile
  const supervisorProfiles = useMemo(
    () => profiles.filter((p) => p.role === "supervisor"),
    [profiles]
  );

  const activeSupervisor =
    supervisorProfiles.find((p) => p.id === activeProfileId) ||
    supervisorProfiles[0] ||
    profiles[0];

  // Strict RBAC Filter: Only users assigned to this Supervisor by Admin
  const assignedUsers = useMemo(() => {
    const allowedUserIds = new Set(
      supervisorAssignments
        .filter((a) => a.supervisorId === activeSupervisor.id)
        .map((a) => a.userId)
    );
    return profiles.filter(
      (p) => isChildRole(p.role) && allowedUserIds.has(p.id)
    );
  }, [profiles, supervisorAssignments, activeSupervisor.id]);

  const inspectedUser =
    assignedUsers.find((u) => u.id === monitoredUserId) ||
    assignedUsers[0] ||
    profiles.find((p) => isChildRole(p.role)) ||
    profiles[0];

  const isKid = inspectedUser.role === "schoolchild";

  const userTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === inspectedUser.id),
    [transactions, inspectedUser.id]
  );

  const [cheerMessage, setCheerMessage] = useState<string | null>(null);
  const [customCheerNote, setCustomCheerNote] = useState<string>(
    `Bangga banget lihat catatan kas ${inspectedUser.display_name} rapi & jujur!`
  );
  const [confirmCheerOpen, setConfirmCheerOpen] = useState<boolean>(false);

  // Zona 2 Navigation States
  const [activeTab, setActiveTab] = useState<SupervisorTab>("today");
  const [subFilter, setSubFilter] = useState<TxSubFilter>("all");
  const [showAllMonthTx, setShowAllMonthTx] = useState<boolean>(false);

  // Weekly Accordion State
  const todayStr = getRelativeDateStr(0);
  const [expandedWeekDay, setExpandedWeekDay] = useState<string>(todayStr);

  // Supervisor Interactive Calendar State
  const nowObj = new Date();
  const [calYear, setCalYear] = useState<number>(nowObj.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(nowObj.getMonth());
  const [calSelectedDate, setCalSelectedDate] = useState<string>(todayStr);

  // Versi 5.1: setelah login, Supervisor wajib memilih anak dulu (halaman "Pilih Anak").
  const supervisorChildChosen = useBukuDompetStore((s) => s.supervisorChildChosen);
  useEffect(() => {
    if (!supervisorChildChosen) router.replace("/supervisor/pilih");
  }, [supervisorChildChosen, router]);

  const levelInfo = getLevelFromXp(inspectedUser.xp);
  const currentStage = inspectedUser.currentStage || 1;
  const petName = inspectedUser.petCustomName || "Mochi";

  const report = analyzeSpendingDetective({
    transactions: userTransactions,
    monthlyBudgetTarget: inspectedUser.monthly_budget_target,
    monthlySavingTarget: inspectedUser.monthly_saving_target,
    userLevel: levelInfo.level,
    currentStage,
    petCustomName: petName,
  });

  // Dihitung dari stiker yang tersimpan di profil anak (ikut tersinkron), bukan variabel lokal perangkat.
  const myCheers = (inspectedUser.supervisorCheers ?? []).filter(
    (c) => c.fromSupervisorName === activeSupervisor?.display_name
  );
  const alreadyCheeredToday = myCheers.some((c) => c.sentAt === todayStr);
  const supervisorCheersCount = myCheers.length;

  const executeSendCheer = () => {
    const res = sendSupervisorCheer(customCheerNote);
    setCheerMessage(res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.tactileClick();
    }
  };

  // 1. TODAY DATA
  const todayTransactions = useMemo(() => {
    const raw = userTransactions.filter((t) => t.transaction_date === todayStr);
    if (subFilter === "all") return raw;
    return raw.filter((t) => t.type === subFilter);
  }, [userTransactions, todayStr, subFilter]);

  const todayIncome = useMemo(() => {
    return userTransactions
      .filter((t) => t.transaction_date === todayStr && t.type === "income")
      .reduce((s, t) => s + Number(t.total_amount), 0);
  }, [userTransactions, todayStr]);

  // 2. WEEK DATA (Last 7 days accordion)
  const weeklyDaysAccordion = useMemo(() => {
    const days: {
      dateStr: string;
      dayName: string;
      statusBadge: "Hemat" | "Melebihi Batas" | "Rp0 Jajan";
      statusColor: "matcha" | "peach" | "sky";
      income: number;
      expense: number;
      txs: typeof userTransactions;
    }[] = [];

    for (let offset = 0; offset >= -6; offset--) {
      const dStr = getRelativeDateStr(offset);
      const dObj = new Date(dStr + "T12:00:00");
      const dayName =
        offset === 0
          ? "Hari Ini — " +
            dObj.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })
          : offset === -1
          ? "Kemarin — " +
            dObj.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })
          : dObj.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
            });

      const allDayTxs = userTransactions.filter(
        (t) => t.transaction_date === dStr
      );
      const filteredTxs =
        subFilter === "all"
          ? allDayTxs
          : allDayTxs.filter((t) => t.type === subFilter);

      const income = allDayTxs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.total_amount), 0);
      const expense = allDayTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.total_amount), 0);

      let statusBadge: "Hemat" | "Melebihi Batas" | "Rp0 Jajan" = "Hemat";
      let statusColor: "matcha" | "peach" | "sky" = "matcha";

      if (expense === 0) {
        statusBadge = "Rp0 Jajan";
        statusColor = "sky";
      } else if (expense > report.dssl) {
        statusBadge = "Melebihi Batas";
        statusColor = "peach";
      }

      days.push({
        dateStr: dStr,
        dayName,
        statusBadge,
        statusColor,
        income,
        expense,
        txs: filteredTxs,
      });
    }
    return days;
  }, [userTransactions, subFilter, report.dssl]);

  const weeklyIncomeTotal = useMemo(() => {
    const sevenDaysAgo = getRelativeDateStr(-6);
    return userTransactions
      .filter(
        (t) =>
          t.transaction_date >= sevenDaysAgo &&
          t.transaction_date <= todayStr &&
          t.type === "income"
      )
      .reduce((s, t) => s + Number(t.total_amount), 0);
  }, [userTransactions, todayStr]);

  // 3. MONTH DATA (4 Weeks + Needs vs Wants + Top 3 Largest Expenses + Bounded List)
  const monthPrefix = todayStr.slice(0, 7);
  const monthlyData = useMemo(() => {
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

    let needsSpend = 0;
    let wantsSpend = 0;

    for (const tx of monthTxs) {
      const dayNum = parseInt(tx.transaction_date.slice(8, 10), 10);
      const bucket =
        weeks.find((w) => dayNum >= w.min && dayNum <= w.max) || weeks[3];
      if (tx.type === "income") {
        bucket.income += Number(tx.total_amount);
      } else if (tx.type === "expense") {
        // Tabungan ("saving") bukan pengeluaran, jadi tidak masuk hitungan boros / kebutuhan vs keinginan.
        bucket.expense += Number(tx.total_amount);
        if (tx.need_or_want === "need") {
          needsSpend += Number(tx.total_amount);
        } else {
          wantsSpend += Number(tx.total_amount);
        }
      }
    }

    const top3Expenses = [...monthTxs]
      .filter((t) => t.type === "expense")
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
      .slice(0, 3);

    const filteredMonthTxs =
      subFilter === "all"
        ? monthTxs
        : monthTxs.filter((t) => t.type === subFilter);

    const totalExp = Math.max(1, needsSpend + wantsSpend);
    const needsPercent = Math.round((needsSpend / totalExp) * 100);
    const wantsPercent = Math.max(0, 100 - needsPercent);

    return {
      weeks,
      needsSpend,
      wantsSpend,
      needsPercent,
      wantsPercent,
      top3Expenses,
      filteredMonthTxs,
    };
  }, [userTransactions, monthPrefix, subFilter]);

  // 4. SUPERVISOR CALENDAR DATA
  const calMonthName = new Date(calYear, calMonth, 1).toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    }
  );

  const supervisorCalendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
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
      const dStr = `${calYear}-${String(calMonth + 1).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;
      const dayTxs = userTransactions.filter(
        (t) => t.transaction_date === dStr
      );
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
    calYear,
    calMonth,
    userTransactions,
    streakFreezeDates,
    zeroSpendDates,
    report.dssl,
  ]);

  const calSelectedDayTxs = useMemo(() => {
    const raw = userTransactions.filter(
      (t) => t.transaction_date === calSelectedDate
    );
    if (subFilter === "all") return raw;
    return raw.filter((t) => t.type === subFilter);
  }, [userTransactions, calSelectedDate, subFilter]);

  const calSelectedDayTotals = useMemo(() => {
    const raw = userTransactions.filter(
      (t) => t.transaction_date === calSelectedDate
    );
    const income = raw
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    const expense = raw
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.total_amount), 0);
    return { income, expense };
  }, [userTransactions, calSelectedDate]);

  if (!supervisorChildChosen) return null;

  return (
    <SupervisorShell active="monitor">
      <CozyConfirmModal
        open={confirmCheerOpen}
        onClose={() => setConfirmCheerOpen(false)}
        onConfirm={executeSendCheer}
        title="Kirim Stiker Apresiasi Visual (0 Poin)?"
        description={`${activeSupervisor.display_name} akan mengirimkan Stiker Apresiasi Visual murni (0 Poin) yang langsung dipajang di kamar beranda ${inspectedUser.display_name} sebagai dukungan hangat tanpa merusak keseimbangan ekonomi poin!`}
        confirmLabel="Ya, Kirim Stiker Apresiasi!"
        confirmVariant="honey"
        mochiMood="proud_combo"
        mochiStage={report.mochiStage}
        badgeText="Apresiasi Visual Murni (0 Poin)"
      />

        {/* ============================================================
            ZONA 1 — KARTU KESIMPULAN CEPAT ORANG TUA (EXECUTIVE SUMMARY)
           ============================================================ */}
        <section className="space-y-4 min-w-0 max-w-full">
          {/* Single Hero Card (Matcha Soft) - Fixed Anti-Jebol Layout (Tugas 1.2) */}
          <CozyCard tone="matcha" className="p-4 sm:p-5 space-y-4 w-full max-w-full overflow-hidden">
            <div className="flex flex-col xl:flex-row items-start justify-between gap-4 w-full max-w-full min-w-0">
              <div className="flex flex-col sm:flex-row items-start gap-3.5 w-full max-w-full min-w-0 flex-1">
                {/* Karakter anak = tanda pengenal utama bagi orang tua: besar di ponsel (tengah, ±176px), ringkas di layar lebar. */}
                <div className="w-44 h-48 sm:w-28 sm:h-32 mx-auto sm:mx-0 rounded-3xl bg-white border-2 border-[#C3EFA4] border-b-4 flex items-center justify-center shrink-0 p-1.5 sm:p-1">
                  <CustomizablePetAvatar
                    species={inspectedUser.activeSpecies || "chubby_cat"}
                    stage={currentStage}
                    mood={report.petMood}
                    customName={petName}
                    equippedAccessories={inspectedUser.equippedAccessories}
                    className="w-full h-full"
                  />
                </div>
                <div className="space-y-2 w-full max-w-full min-w-0 flex-1">
                  {/* Strict RBAC Monitored User Selector (Tugas 1.2: flex-wrap w-full max-w-full) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap w-full max-w-full">
                    <span className="px-2.5 py-1 rounded-full bg-white border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00] inline-flex items-center gap-1.5 w-fit max-w-full break-words">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>User Ditugaskan Admin ({assignedUsers.length}):</span>
                    </span>
                    <select
                      value={inspectedUser.id}
                      onChange={(e) => {
                        soundEffects.tactileClick();
                        setMonitoredUserId(e.target.value);
                      }}
                      className="w-full sm:w-auto max-w-full px-3 py-1.5 rounded-xl bg-white border-2 border-[#C3EFA4] font-display text-xs font-extrabold text-[#3D352E] focus:outline-none cursor-pointer"
                    >
                      {assignedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name} — Pet: {u.petCustomName || "Mochi"} (
                          {GROWTH_STAGE_META[u.currentStage || 1].name})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        router.push("/supervisor/pilih");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFFDF9] border-2 border-[#C3EFA4] border-b-[3px] text-xs font-display font-extrabold text-[#2E6F00] cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <GlyphInline name="swap" /> Ganti Anak
                    </button>
                  </div>

                  <div className="space-y-1 w-full max-w-full break-words">
                    {isKid ? (
                      <>
                        <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                          Jurnal Cerita {inspectedUser.display_name}
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-[#7A6E65] break-words">
                          Anak SD Kelas 3 • Streak {inspectedUser.current_streak} hari
                        </p>
                      </>
                    ) : (
                      <>
                        <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                          Sisa Uang Saku {inspectedUser.display_name}:{" "}
                          <span className="text-[#2E6F00] tabular-nums">
                            {formatRupiah(report.remainingTotalBalanceThisMonth)}
                          </span>
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-[#7A6E65] break-words">
                          Batas Aman Harian: {formatRupiah(report.dssl)}/hari
                        </p>
                      </>
                    )}
                  </div>

                  {isKid ? (
                    <p className="text-xs font-bold text-[#3D352E]/85 leading-relaxed break-words">
                      {inspectedUser.display_name} bersama pet <strong>{petName}</strong> menulis cerita harian dan belajar mengelola celengan. Pantau perkembangannya di bawah.
                    </p>
                  ) : (
                  <p className="text-xs font-bold text-[#3D352E]/85 leading-relaxed break-words">
                    {inspectedUser.display_name} bersama pet{" "}
                    <strong>{petName}</strong> konsisten mencatat kas{" "}
                    <strong>
                      {inspectedUser.current_streak} hari berturut-turut
                    </strong>{" "}
                    (Fase #{currentStage}: {GROWTH_STAGE_META[currentStage].name}) dan
                    mengunci tabungan{" "}
                    <strong className="tabular-nums">
                      {formatRupiah(report.monthlySavingTarget)}
                    </strong>
                    .
                  </p>
                  )}
                  {cheerMessage && (
                    <div className="w-full max-w-full">
                      <p className="text-xs font-extrabold text-[#2E6F00] bg-white px-3 py-1.5 rounded-xl border border-[#C3EFA4] break-words leading-snug">
                        {cheerMessage}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Corner CTA: Kirim Stiker Apresiasi Visual (0 Poin) */}
              <div className="w-full xl:w-72 max-w-full shrink-0 space-y-2 pt-2 xl:pt-0 border-t xl:border-t-0 border-[#C3EFA4]/60">
                <input
                  type="text"
                  value={customCheerNote}
                  onChange={(e) => setCustomCheerNote(e.target.value)}
                  placeholder="Pesan semangat singkat..."
                  className="w-full max-w-full px-3 py-2 rounded-xl bg-white border border-[#C3EFA4] text-xs font-bold text-[#3D352E] focus:outline-none"
                />
                <TactileButton
                  variant={alreadyCheeredToday ? "white" : "honey"}
                  size="md"
                  fullWidth
                  onClick={() => setConfirmCheerOpen(true)}
                >
                  <Heart className="w-4 h-4 fill-current shrink-0" />
                  <span className="break-words">
                    {alreadyCheeredToday
                      ? `Kirim Lagi Stiker Apresiasi (${supervisorCheersCount}x)`
                      : "Kirim Stiker Apresiasi (0 Poin)"}
                  </span>
                </TactileButton>
              </div>
            </div>
          </CozyCard>

          {isKid && <KidMonitorPanel user={inspectedUser} />}

          {/* 3 Clean White Metric Cards below Executive Summary (No truncate on Rupiah!) */}
          {!isKid && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            {/* Card 1: Pengeluaran Hari Ini */}
            <CozyCard tone="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                  1. Pengeluaran Hari Ini
                </span>
                <CozyIcon name="cat_food" size={24} />
              </div>
              <div className="font-display text-xl sm:text-2xl font-extrabold text-[#C83E2B] tabular-nums break-words">
                <RollingNumber value={report.todayTotalSpend} prefix="-Rp" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-[#7A6E65] pt-1 border-t border-[#E6DFD2]">
                <span>Batas Aman Harian:</span>
                <span className="font-display font-extrabold tabular-nums text-[#2E6F00]">
                  {formatRupiah(report.dssl)}
                </span>
              </div>
            </CozyCard>

            {/* Card 2: Pengeluaran Minggu Ini */}
            <CozyCard tone="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                  2. Pengeluaran Minggu Ini (7 Hari)
                </span>
                <CozyIcon name="calendar_streak" size={24} />
              </div>
              <div className="font-display text-xl sm:text-2xl font-extrabold text-[#C83E2B] tabular-nums break-words">
                <RollingNumber value={report.totalSpentThisWeek} prefix="-Rp" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-[#7A6E65] pt-1 border-t border-[#E6DFD2]">
                <span>
                  Masuk 7 Hari: +{formatCompactRupiah(weeklyIncomeTotal)}
                </span>
                <span className="font-display font-extrabold tabular-nums text-[#3D352E]">
                  Sisa: {formatCompactRupiah(report.remainingWeeklyBudget)}
                </span>
              </div>
            </CozyCard>

            {/* Card 3: Rekap Bulan Ini */}
            <CozyCard tone="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                  3. Rekap Bulan Ini
                </span>
                <CozyIcon name="cat_saving" size={24} />
              </div>
              <div className="font-display text-xl sm:text-2xl font-extrabold text-[#2E6F00] tabular-nums break-words">
                <RollingNumber
                  value={report.remainingTotalBalanceThisMonth}
                  prefix="Rp"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-[#7A6E65] pt-1 border-t border-[#E6DFD2] gap-2">
                <span className="text-[#2E6F00]">
                  +{formatCompactRupiah(report.monthlyAllowance)}
                </span>
                <span className="text-[#C83E2B]">
                  -{formatCompactRupiah(report.totalSpentThisMonth)}
                </span>
              </div>
            </CozyCard>
          </div>
          )}
        </section>

        {/* ============================================================
            ZONA 2 — JURNAL KAS & KALENDER TRANSPARAN (4 TAB TERSTRUKTUR)
           ============================================================ */}
        {!isKid && (
        <CozyCard tone="white" className="p-4 sm:p-6 space-y-5">
          {/* Header & Segmented Control */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#E6DFD2] pb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <CozyIcon name="missions_scroll" size={28} />
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                  Jurnal Kas & Kalender Transparan ({inspectedUser.display_name})
                </h2>
                <p className="text-xs font-bold text-[#7A6E65] truncate">
                  Pantau rincian belanja per item di setiap waktu dengan nyaman
                </p>
              </div>
            </div>

            {/* 4 Time Tabs (Sky Blue Exclusive for Active Time Filter) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
              {(
                [
                  { id: "today", label: "Hari Ini" },
                  { id: "week", label: "Minggu Ini" },
                  { id: "month", label: "Bulan Ini" },
                  { id: "calendar", label: "Kalender Kas" },
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
                    "py-2 px-3 rounded-xl font-display text-xs font-extrabold transition-all cursor-pointer truncate",
                    activeTab === t.id
                      ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                      : "text-[#3D352E] hover:bg-white"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-filter: Semua | Pengeluaran (-Rp) | Pemasukan (+Rp) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ChipScroller label="Filter jenis transaksi" watch={subFilter} className="flex-1">
              <span className="text-xs font-bold text-[#7A6E65] mr-1">
                Filter Jenis:
              </span>
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "expense", label: "Pengeluaran (-Rp)" },
                  { id: "income", label: "Pemasukan (+Rp)" },
                  { id: "saving", label: "Tabungan" },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setSubFilter(sub.id);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-display font-extrabold cursor-pointer transition-all",
                    subFilter === sub.id
                      ? "bg-[#38B6FF] text-white border-b-[2px] border-b-[#1E88E5]"
                      : "bg-[#F7F3EB] text-[#7A6E65] hover:text-[#3D352E]"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </ChipScroller>
          </div>

          {/* ------------------------------------------------------------
              TAB 1: HARI INI (Direct Transparent Sub-Items)
             ------------------------------------------------------------ */}
          {activeTab === "today" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7A6E65]">
                    Pemasukan Hari Ini
                  </span>
                  <span className="font-display font-extrabold tabular-nums text-sm text-[#2E6F00]">
                    +{formatRupiah(todayIncome)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7A6E65]">
                    Pengeluaran Hari Ini
                  </span>
                  <span className="font-display font-extrabold tabular-nums text-sm text-[#C83E2B]">
                    -{formatRupiah(report.todayTotalSpend)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7A6E65]">
                    Sisa Jatah Aman Hari Ini
                  </span>
                  <span className="font-display font-extrabold tabular-nums text-sm text-[#3D352E]">
                    {formatRupiah(report.remainingDailySafeSpend)}
                  </span>
                </div>
              </div>

              {todayTransactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#F7F3EB] text-center text-xs font-bold text-[#7A6E65]">
                  Belum ada catatan transaksi untuk filter ini pada hari ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTransactions.map((tx) => (
                    <SupervisorTransparentTxCard key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------
              TAB 2: MINGGU INI (7-Day Daily Accordion Cards)
             ------------------------------------------------------------ */}
          {activeTab === "week" && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-[#7A6E65]">
                Klik pada baris hari untuk membuka rincian barang yang dibeli
                pada hari tersebut:
              </p>
              {weeklyDaysAccordion.map((day) => {
                const isOpen = expandedWeekDay === day.dateStr;
                return (
                  <div
                    key={day.dateStr}
                    className="rounded-2xl border-2 border-[#E6DFD2] bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        setExpandedWeekDay(isOpen ? "" : day.dateStr);
                      }}
                      className="w-full p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2 bg-[#F7F3EB] hover:bg-[#EFE9DC] transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] capitalize truncate">
                          {day.dayName}
                        </span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-display font-extrabold border shrink-0",
                            day.statusColor === "matcha"
                              ? "bg-[#E8F8DC] text-[#2E6F00] border-[#B8E994]"
                              : day.statusColor === "peach"
                              ? "bg-[#FFEAE6] text-[#C83E2B] border-[#FFBFB3]"
                              : "bg-[#E3F4FF] text-[#1565C0] border-[#9AD2FF]"
                          )}
                        >
                          {day.statusBadge}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {day.income > 0 && (
                          <span className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#2E6F00]">
                            +{formatCompactRupiah(day.income)}
                          </span>
                        )}
                        <span className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#C83E2B]">
                          -{formatRupiah(day.expense)}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#3D352E]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#3D352E]" />
                        )}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-3.5 sm:p-4 space-y-2.5 bg-white border-t border-[#E6DFD2]">
                        {day.txs.length === 0 ? (
                          <p className="text-xs font-bold text-[#7A6E65]">
                            Tidak ada pengeluaran tercatat pada hari ini (Rp0).
                          </p>
                        ) : (
                          day.txs.map((tx) => (
                            <SupervisorTransparentTxCard key={tx.id} tx={tx} />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ------------------------------------------------------------
              TAB 3: BULAN INI (4 Weeks + Needs vs Wants + Top 3 + Bounded List)
             ------------------------------------------------------------ */}
          {activeTab === "month" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 4 Weeks Summary */}
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-3">
                  <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                    Ringkasan 4 Minggu Bulan Ini
                  </h3>
                  <div className="space-y-2.5">
                    {monthlyData.weeks.map((w) => (
                      <div
                        key={w.label}
                        className="p-3 rounded-xl bg-white border border-[#E6DFD2] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span className="text-[#3D352E]">{w.label}</span>
                          <div className="flex items-center gap-2 tabular-nums">
                            {w.income > 0 && (
                              <span className="text-[#2E6F00]">
                                +{formatCompactRupiah(w.income)}
                              </span>
                            )}
                            <span className="text-[#C83E2B]">
                              -{formatRupiah(w.expense)}
                            </span>
                          </div>
                        </div>
                        <ChunkyProgressBar
                          value={w.expense}
                          max={report.weeklyBudgetAllowance}
                          variant={
                            w.expense <= report.weeklyBudgetAllowance
                              ? "matcha"
                              : "peach"
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Needs vs Wants + Top 3 Largest Expenses */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-3">
                    <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                      Proporsi Kebutuhan Pokok vs Jajan
                    </h3>
                    <div className="space-y-2">
                      <ChunkyProgressBar
                        value={monthlyData.needsPercent}
                        max={100}
                        variant="matcha"
                        label={`Kebutuhan Pokok (Needs): ${formatRupiah(
                          monthlyData.needsSpend
                        )} (${monthlyData.needsPercent}%)`}
                      />
                      <ChunkyProgressBar
                        value={monthlyData.wantsPercent}
                        max={100}
                        variant="peach"
                        label={`Keinginan / Jajan (Wants): ${formatRupiah(
                          monthlyData.wantsSpend
                        )} (${monthlyData.wantsPercent}%)`}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-2.5">
                    <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                      Top 3 Pengeluaran Terbesar Bulan Ini
                    </h3>
                    {monthlyData.top3Expenses.map((tx, idx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-white border border-[#E6DFD2] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] font-display text-xs font-extrabold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-display text-xs sm:text-sm font-extrabold text-[#3D352E] truncate">
                              {tx.title}
                            </p>
                            <p className="text-[10px] font-bold text-[#7A6E65]">
                              {tx.category}
                            </p>
                          </div>
                        </div>
                        <span className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#C83E2B] shrink-0">
                          -{formatRupiah(tx.total_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bounded Monthly Transactions List */}
              <div className="space-y-3">
                <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                  Daftar Transaksi Bulanan (
                  {monthlyData.filteredMonthTxs.length} Catatan)
                </h3>
                {(showAllMonthTx
                  ? monthlyData.filteredMonthTxs
                  : monthlyData.filteredMonthTxs.slice(0, 5)
                ).map((tx) => (
                  <SupervisorTransparentTxCard key={tx.id} tx={tx} />
                ))}
                {monthlyData.filteredMonthTxs.length > 5 && (
                  <TactileButton
                    variant="cream"
                    size="sm"
                    fullWidth
                    onClick={() => setShowAllMonthTx(!showAllMonthTx)}
                  >
                    {showAllMonthTx
                      ? <>Tutup Sebagian Daftar <ChevronUp className="w-4 h-4" aria-hidden="true" /></>
                      : <>Lihat Semua ({monthlyData.filteredMonthTxs.length} Transaksi) <ChevronDown className="w-4 h-4" aria-hidden="true" /></>}
                  </TactileButton>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------
              TAB 4: KALENDER KAS INTERAKTIF SUPERVISOR (2 Columns on Desktop)
             ------------------------------------------------------------ */}
          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Monthly Calendar */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      if (calMonth === 0) {
                        setCalMonth(11);
                        setCalYear((y) => y - 1);
                      } else {
                        setCalMonth((m) => m - 1);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-white border border-[#E6DFD2] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#3D352E]" />
                  </button>
                  <h3 className="font-display text-base font-extrabold text-[#3D352E] capitalize">
                    {calMonthName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      if (calMonth === 11) {
                        setCalMonth(0);
                        setCalYear((y) => y + 1);
                      } else {
                        setCalMonth((m) => m + 1);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-white border border-[#E6DFD2] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-[#3D352E]" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-display font-extrabold text-[#7A6E65]">
                  {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                    (d) => (
                      <div key={d} className="py-0.5">
                        {d}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {supervisorCalendarCells.map((cell, idx) => {
                    if (!cell.dateStr || !cell.dayNum) {
                      return <div key={`empty-${idx}`} className="h-13" />;
                    }
                    const isSelected = cell.dateStr === calSelectedDate;
                    const cellCls =
                      cell.status === "safe"
                        ? "bg-[#E8F8DC] text-[#2E6F00] border-[#B8E994]"
                        : cell.status === "warn"
                        ? "bg-[#FFEAE6] text-[#C83E2B] border-[#FFBFB3]"
                        : cell.status === "freeze"
                        ? "bg-[#E3F4FF] text-[#1565C0] border-[#9AD2FF]"
                        : "bg-white text-[#9E9284] border-[#E6DFD2]";

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => {
                          soundEffects.tactileClick();
                          setCalSelectedDate(cell.dateStr!);
                        }}
                        className={cn(
                          "h-13 rounded-xl p-1 flex flex-col items-center justify-between transition-all cursor-pointer border-2 min-w-0 overflow-hidden",
                          cellCls,
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
                          <span className="tabular-nums text-[10px] font-display font-extrabold">
                            Rp0
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-30">-</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Date Detail Panel */}
              <div className="lg:col-span-6 space-y-3.5 min-w-0">
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-extrabold text-[#3D352E] truncate">
                      Detail Tanggal:{" "}
                      {new Date(
                        calSelectedDate + "T12:00:00"
                      ).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <span className="text-xs font-bold text-[#7A6E65] shrink-0">
                      {calSelectedDayTxs.length} Transaksi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-white border border-[#E6DFD2]">
                      <p className="text-[10px] font-bold text-[#7A6E65]">
                        Total Uang Masuk
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-sm text-[#2E6F00]">
                        +{formatRupiah(calSelectedDayTotals.income)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E6DFD2]">
                      <p className="text-[10px] font-bold text-[#7A6E65]">
                        Total Uang Keluar
                      </p>
                      <p className="font-display font-extrabold tabular-nums text-sm text-[#C83E2B]">
                        -{formatRupiah(calSelectedDayTotals.expense)}
                      </p>
                    </div>
                  </div>
                </div>

                {calSelectedDayTxs.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#F7F3EB] text-center text-xs font-bold text-[#7A6E65]">
                    Tidak ada transaksi tercatat pada tanggal ini.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {calSelectedDayTxs.map((tx) => (
                      <SupervisorTransparentTxCard key={tx.id} tx={tx} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CozyCard>
        )}

      </SupervisorShell>
  );
}

function SupervisorTransparentTxCard({
  tx,
}: {
  tx: ReturnType<typeof useBukuDompetStore.getState>["transactions"][number];
}) {
  const dateFormatted = new Date(
    tx.transaction_date + "T12:00:00"
  ).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="p-4 rounded-2xl border-2 border-[#E6DFD2] bg-white space-y-2.5 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center justify-center shrink-0">
            <CategoryIcon category={tx.category} size={26} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate">
                {tx.title}
              </span>
              {tx.is_itemized && (
                <span className="px-2 py-0.5 rounded-lg bg-[#E8F8DC] border border-[#B8E994] text-[10px] font-display font-extrabold text-[#2E6F00] inline-flex items-center gap-1 shrink-0">
                  <CozyIcon name="check_badge" size={12} />
                  Rincian Jujur
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-[#7A6E65] truncate">
              {dateFormatted} • {tx.category} (
              {tx.need_or_want === "need"
                ? "Kebutuhan Pokok"
                : tx.need_or_want === "want"
                ? "Keinginan / Jajan"
                : "Pemasukan"}
              )
            </p>
          </div>
        </div>

        <span
          className={cn(
            "font-display text-sm sm:text-base font-extrabold tabular-nums shrink-0",
            tx.type === "income"
              ? "text-[#2E6F00]"
              : tx.type === "saving"
              ? "text-[#1565C0]"
              : "text-[#C83E2B]"
          )}
        >
          {tx.type === "income" ? "+" : tx.type === "saving" ? <GlyphInline name="piggy" className="mr-0.5" /> : "-"}
          {formatRupiah(tx.total_amount)}
        </span>
      </div>

      {/* Directly visible sub-items without extra clicks */}
      {tx.items && tx.items.length > 0 && (
        <div className="bg-[#F7F3EB] rounded-2xl border border-[#E6DFD2] p-3 space-y-1.5">
          <p className="text-[10px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
            Rincian Barang yang Dibeli:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {tx.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs font-bold text-[#3D352E] bg-white px-3 py-1.5 rounded-xl border border-[#E6DFD2] min-w-0"
              >
                <span className="truncate pr-2">
                  • {item.item_name}{" "}
                  {item.quantity > 1 && `(${item.quantity}x)`}
                </span>
                <span className="font-display font-extrabold tabular-nums shrink-0">
                  {formatRupiah(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

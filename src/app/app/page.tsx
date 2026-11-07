"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Sparkles,
  ShoppingBag,
  Gift,
  LocateFixed,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  GROWTH_STAGE_TARGETS,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  AccessoryPreviewIcon,
  GROWTH_STAGE_META,
  getSpeciesInfo,
  ACCESSORY_CATALOG,
} from "@/components/illustrations/PetAvatarSystem";
import {
  BIOME_MONTHS,
  BiomeMapSection,
  BiomeTransitionDivider,
  getBiomeResourceStatus,
} from "@/components/illustrations/BiomeEnvironment";
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
import { AccessoryDropModal } from "@/components/user/AccessoryDropModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn, formatCompactRupiah } from "@/lib/utils";

type TimeScope = "daily" | "weekly" | "monthly";

function getRelativeDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

function addDaysToDateStr(baseDateStr: string, addDays: number): string {
  const d = new Date(baseDateStr + "T12:00:00");
  d.setDate(d.getDate() + addDays);
  return d.toISOString().split("T")[0];
}

function diffDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr + "T12:00:00").getTime();
  const end = new Date(endDateStr + "T12:00:00").getTime();
  return Math.round((end - start) / 86400000);
}

const PATH_DROP_ITEMS = ACCESSORY_CATALOG.filter(
  (it) => it.source === "path_drop"
);

export default function UserHomePage() {
  const {
    activeProfileId,
    profiles,
    transactions,
    equippedTitle,
    isProudComboActive,
    setTransactionDrawerOpen,
    setStreakCalendarOpen,
    claimPathMilestoneDrop,
    renamePet,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.id === activeProfileId && p.role === "user") ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const userTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === userProfile.id),
    [transactions, userProfile.id]
  );

  const activeSpecies = userProfile.activeSpecies || "chubby_cat";
  const speciesInfo = getSpeciesInfo(activeSpecies);
  const currentStage = userProfile.currentStage || 1;
  const stageMeta = GROWTH_STAGE_META[currentStage] || GROWTH_STAGE_META[1];
  const stageTarget = GROWTH_STAGE_TARGETS[currentStage];
  const petName = userProfile.petCustomName || speciesInfo.defaultName;
  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = analyzeSpendingDetective({
    transactions: userTransactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    currentStage,
    petCustomName: petName,
    isProudComboActive,
  });

  const [scope, setScope] = useState<TimeScope>("daily");
  const todayStr = getRelativeDateStr(0);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [showAllWeeklyTx, setShowAllWeeklyTx] = useState<boolean>(false);

  // Automatic Real-Time Month for Biome (No manual month selector per Tugas 2.1)
  const currentRealMonthIndex = new Date().getMonth();
  const activeBiome = BIOME_MONTHS[currentRealMonthIndex] || BIOME_MONTHS[0];

  // Inline Pet Rename State
  const [isEditingPetName, setIsEditingPetName] = useState<boolean>(false);
  const [petNameInput, setPetNameInput] = useState<string>(petName);

  // Scrollable Map Ref & Today Stone Ref (Tugas 2.4)
  const mapScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const todayStoneRef = useRef<HTMLDivElement | null>(null);

  const scrollToTodayStone = () => {
    if (todayStoneRef.current) {
      todayStoneRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  useEffect(() => {
    if (scope === "daily") {
      const timer = setTimeout(() => {
        scrollToTodayStone();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [scope]);

  const handleSavePetName = () => {
    const res = renamePet(petNameInput);
    if (res.success) {
      soundEffects.coinChime();
      setIsEditingPetName(false);
    } else {
      soundEffects.tactileClick();
    }
  };

  /**
   * TUGAS 2.2 & 2.3: Continuous Journey from Day 1 (`Hari ke-1` s/d `Hari Ini` + 5 Hari ke Depan)
   * dengan Gerbang Perbatasan Bioma otomatis setiap kelipatan 30 langkah atau pergantian bulan.
   */
  const continuousJourneyNodes = useMemo(() => {
    // Tentukan tanggal Hari ke-1 (tanggal transaksi paling awal user, minimal H-7 agar peta kaya)
    let earliestDateStr = getRelativeDateStr(-7);
    for (const tx of userTransactions) {
      if (tx.transaction_date < earliestDateStr) {
        earliestDateStr = tx.transaction_date;
      }
    }

    const totalDaysToToday = Math.max(
      1,
      diffDaysBetween(earliestDateStr, todayStr) + 1
    );
    const totalNodesCount = totalDaysToToday + 5; // +5 batu pijakan mendatang

    const nodes: {
      dayIndex: number; // 1..N
      dateStr: string;
      calendarShortLabel: string;
      monthIndex: number;
      prevMonthIndex?: number;
      showBiomeGateBefore: boolean;
      status: StoneStatus;
      totalSpent: number;
      totalIncome: number;
      txCount: number;
      isMilestoneDay: boolean;
    }[] = [];

    for (let i = 0; i < totalNodesCount; i++) {
      const dayIndex = i + 1;
      const dStr = addDaysToDateStr(earliestDateStr, i);
      const dObj = new Date(dStr + "T12:00:00");
      const monthIndex = dObj.getMonth();
      const prevDateObj =
        i > 0
          ? new Date(addDaysToDateStr(earliestDateStr, i - 1) + "T12:00:00")
          : null;
      const prevMonthIndex = prevDateObj ? prevDateObj.getMonth() : undefined;

      const calendarShortLabel = dObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });

      const dayTxs = userTransactions.filter(
        (t) => t.transaction_date === dStr
      );
      const dayExpense = dayTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.total_amount), 0);
      const dayIncome = dayTxs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.total_amount), 0);

      let status: StoneStatus = "completed_safe";
      if (dStr === todayStr) {
        status = "active_today";
      } else if (dStr > todayStr) {
        status = "missed_frozen";
      } else if (dayExpense > report.dssl * 1.05) {
        status = "completed_warn";
      } else if (dayTxs.length === 0) {
        status = "missed_frozen";
      } else {
        status = "completed_safe";
      }

      // Munculkan Gerbang Perbatasan Bioma di Hari ke-1, setiap kelipatan 30 langkah (Hari 31, 61...), atau saat bulan kalender berganti
      const showBiomeGateBefore =
        dayIndex === 1 ||
        (dayIndex - 1) % 30 === 0 ||
        (prevMonthIndex !== undefined && prevMonthIndex !== monthIndex);

      nodes.push({
        dayIndex,
        dateStr: dStr,
        calendarShortLabel,
        monthIndex,
        prevMonthIndex,
        showBiomeGateBefore,
        status,
        totalSpent: dayExpense,
        totalIncome: dayIncome,
        txCount: dayTxs.length,
        isMilestoneDay: dayIndex % 7 === 0,
      });
    }

    return nodes;
  }, [userTransactions, todayStr, report.dssl]);

  // Count unique recorded days for the Biome Resource Growth Engine
  const completedDaysCount = useMemo(() => {
    const uniqueDates = new Set(
      userTransactions.map((t) => t.transaction_date)
    );
    return Math.max(
      uniqueDates.size,
      userProfile.current_streak || 1,
      userProfile.stageRecordedDays || 1
    );
  }, [
    userTransactions,
    userProfile.current_streak,
    userProfile.stageRecordedDays,
  ]);

  const biomeStatus = useMemo(
    () => getBiomeResourceStatus(currentRealMonthIndex, completedDaysCount),
    [currentRealMonthIndex, completedDaysCount]
  );

  const selectedDayTransactions = useMemo(() => {
    return userTransactions.filter(
      (t) => t.transaction_date === selectedDateStr
    );
  }, [userTransactions, selectedDateStr]);

  const weeklyTransactions = useMemo(() => {
    const cutoffStr = getRelativeDateStr(-6);
    return userTransactions.filter((t) => t.transaction_date >= cutoffStr);
  }, [userTransactions]);

  const visibleWeeklyTx = showAllWeeklyTx
    ? weeklyTransactions
    : weeklyTransactions.slice(0, 5);

  const handleOpenMilestoneChest = (milestoneDay: number, isFuture: boolean) => {
    if (isFuture) {
      soundEffects.tactileClick();
      return;
    }
    const res = claimPathMilestoneDrop(milestoneDay);
    if (res.success) {
      soundEffects.mysteryDrumroll();
      fireCozyConfetti("jackpot");
    } else {
      soundEffects.tactileClick();
    }
  };

  const latestCheer =
    userProfile.supervisorCheers && userProfile.supervisorCheers.length > 0
      ? userProfile.supervisorCheers[0]
      : null;

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      {/* TUGAS 3: Modal Unboxing Khusus Aksesoris Jalur Kas */}
      <AccessoryDropModal />

      {/* 1. Pet's Cozy Room Widget */}
      <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          {/* Customizable 8-Species & 8-Stage Pet Avatar */}
          <Link
            href="/app/pets"
            onClick={() => soundEffects.tactileClick()}
            className="w-40 h-44 sm:w-44 sm:h-48 rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 relative group p-2"
          >
            <CustomizablePetAvatar
              species={activeSpecies}
              stage={currentStage}
              mood={report.petMood}
              customName={petName}
              equippedAccessories={userProfile.equippedAccessories}
              className="w-36 h-40 group-hover:scale-105 transition-transform"
            />
            <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] font-display text-[10px] font-extrabold text-[#A552DB] leading-snug text-center">
              Fase {currentStage}/8: {stageMeta.name}
            </span>
          </Link>

          <div className="flex-1 space-y-3 text-center sm:text-left w-full min-w-0">
            {/* Pet Name + Inline Edit + Quick Actions */}
            <div className="flex items-center justify-center sm:justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                {isEditingPetName ? (
                  <div className="inline-flex items-center gap-1 bg-[#F7F3EB] border-2 border-[#38B6FF] rounded-xl px-2 py-0.5">
                    <input
                      type="text"
                      value={petNameInput}
                      maxLength={18}
                      onChange={(e) => setPetNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePetName();
                        if (e.key === "Escape") setIsEditingPetName(false);
                      }}
                      className="w-28 bg-transparent font-display text-xs font-extrabold text-[#3D352E] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSavePetName}
                      className="p-1 rounded-lg bg-[#58CC02] text-white cursor-pointer"
                      title="Simpan Nama Pet"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPetName(false)}
                      className="p-1 rounded-lg bg-[#E6DFD2] text-[#3D352E] cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                    <span className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] break-words">
                      {petName}
                    </span>
                    <span className="text-[11px] font-bold text-[#7A6E65]">
                      ({speciesInfo.name})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        setPetNameInput(petName);
                        setIsEditingPetName(true);
                      }}
                      className="p-1 rounded-lg bg-[#F7F3EB] hover:bg-[#FFFBEB] border border-[#E6DFD2] text-[#7A6E65] hover:text-[#3D352E] cursor-pointer transition-colors"
                      title="Ubah Nama Pet"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <span className="px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB] inline-flex items-center gap-1 leading-snug break-words">
                  <CozyIcon name="pet_paw" size={13} />
                  <span>{equippedTitle}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Link
                  href="/app/pets?tab=shop"
                  onClick={() => soundEffects.tactileClick()}
                  className="px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1 hover:bg-[#FFF4CE]"
                >
                  <ShoppingBag className="w-3 h-3" /> Pet & Butik
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setStreakCalendarOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1 hover:bg-[#FFFBEB] cursor-pointer"
                >
                  <CozyIcon name="calendar_streak" size={14} /> Kalender
                </button>
              </div>
            </div>

            {/* Speech Bubble */}
            <div className="bg-[#F7F3EB] border border-[#E6DFD2] rounded-2xl p-3 text-xs sm:text-sm font-bold text-[#3D352E] leading-relaxed break-words">
              <p>&ldquo;{report.mochiSpeech}&rdquo;</p>
            </div>

            {/* Remaining Daily Safe Spend Hero Banner (Matcha Pastel — Never Truncated) */}
            <div className="bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="text-left min-w-0 space-y-0.5">
                <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00] leading-snug break-words">
                  Sisa Jatah Aman Hari Ini (DSSL)
                </p>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-[#2E6F00] break-words">
                  <RollingNumber
                    value={report.remainingDailySafeSpend}
                    prefix="Rp"
                  />
                </div>
                <p className="text-[11px] font-bold text-[#3D352E] tabular-nums leading-snug break-words">
                  Terpakai: {formatRupiah(report.todayTotalSpend)} dari{" "}
                  {formatRupiah(report.dssl)}
                </p>
              </div>
              <TactileButton
                variant="matcha"
                size="sm"
                onClick={() => setTransactionDrawerOpen(true)}
                className="shrink-0 w-full sm:w-auto"
              >
                <CozyIcon name="plus_record" size={18} /> + Catat Kas
              </TactileButton>
            </div>
          </div>
        </div>

        {/* Supervisor Visual Appreciation Sticker Banner */}
        {latestCheer && (
          <div className="rounded-2xl bg-[#FFFDF9] border-2 border-[#E6DFD2] p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF2F0] border border-[#FFCDC6] flex items-center justify-center shrink-0">
                <CozyIcon name="parent_heart" size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500]">
                    {latestCheer.stickerLabel}
                  </span>
                  <span className="text-[11px] font-bold text-[#7A6E65]">
                    dari {latestCheer.fromSupervisorName} • Apresiasi Visual
                  </span>
                </div>
                <p className="text-xs font-bold text-[#3D352E] leading-snug break-words mt-0.5">
                  &ldquo;{latestCheer.message}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dual Progress Bars: Budget Health + Growth Stage Unlock Requirements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <ChunkyProgressBar
            value={report.remainingDailySafeSpend}
            max={report.dssl}
            variant={
              report.statusColor === "matcha"
                ? "matcha"
                : report.statusColor === "honey"
                ? "honey"
                : "peach"
            }
            label="Energi Dompet Harian"
            showFraction
          />
          <ChunkyProgressBar
            value={userProfile.stageXp}
            max={stageTarget.nextStageXpTarget}
            variant="sky"
            label={
              currentStage < 8
                ? `Menuju Fase ${currentStage + 1} (${GROWTH_STAGE_META[(currentStage + 1) as 2].name}): ${userProfile.stageRecordedDays}/${stageTarget.nextStageDaysTarget} Hari`
                : "Fase Puncak: Sepuh Bijaksana"
            }
            showFraction
          />
        </div>
      </CozyCard>

      {/* 2. Time-Scope Segmented Switcher */}
      <div className="grid grid-cols-3 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
        {(
          [
            { id: "daily", label: "Peta Jalur Kas" },
            { id: "weekly", label: "Minggu Ini" },
            { id: "monthly", label: "Bulan Ini" },
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
              "py-2 px-2 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer leading-snug break-words",
              scope === tab.id
                ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3A. DAILY VIEW: Continuous Journey from Day 1 + Auto Biome Transition + Scrollable Map */}
      {scope === "daily" && (
        <div className="space-y-5 min-w-0">
          <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
            {/* Top Header (Automatic Real-Time Biome — No Manual Month Selector & No Klaim Rp0 Gimmick) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <CozyIcon name="home_path" size={28} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                      Peta Perjalanan Kas: {activeBiome.biomeTitle}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EEF8FF] border border-[#BCE3FF] text-[11px] font-display font-extrabold text-[#1E88E5]">
                      Bulan {activeBiome.monthName} (Otomatis)
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words mt-0.5">
                    {activeBiome.subtitle} • Cuaca: {activeBiome.weatherLabel}
                  </p>
                </div>
              </div>

              <TactileButton
                variant="sky"
                size="sm"
                onClick={() => {
                  soundEffects.tactileClick();
                  setSelectedDateStr(todayStr);
                  scrollToTodayStone();
                }}
                className="shrink-0"
              >
                <LocateFixed className="w-4 h-4" /> 📍 Fokus Hari Ini
              </TactileButton>
            </div>

            {/* Growing Biome Resource Banner */}
            <div className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-1 rounded-xl bg-white border border-[#E6DFD2] font-display text-xs font-extrabold text-[#2E6F00] shrink-0">
                  Ekosistem Lv.{biomeStatus.ecosystemLevel}/4
                </span>
                <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E] leading-snug break-words">
                  {biomeStatus.bannerText}
                </p>
              </div>
              <span className="text-xs font-display font-extrabold text-[#7A6E65] shrink-0">
                Perjalanan Hari ke-{continuousJourneyNodes.length - 5}
              </span>
            </div>

            {/* TUGAS 2.4: Scrollable Map Container with Floating "📍 Fokus Hari Ini" Button */}
            <div className="relative">
              <div
                ref={mapScrollContainerRef}
                className="h-[460px] md:h-[520px] overflow-y-auto overflow-x-hidden rounded-3xl border-2 border-[#E6DFD2] relative scroll-smooth"
              >
                <BiomeMapSection
                  monthIndex={currentRealMonthIndex}
                  completedStepsCount={completedDaysCount}
                  className="border-0 rounded-none min-h-full"
                >
                  <div className="flex flex-col items-center space-y-3 py-4">
                    {continuousJourneyNodes.map((node, index) => {
                      const offsets = [
                        "translate-x-0",
                        "-translate-x-6 sm:-translate-x-12",
                        "-translate-x-10 sm:-translate-x-16",
                        "-translate-x-4 sm:-translate-x-8",
                        "translate-x-4 sm:translate-x-8",
                        "translate-x-8 sm:translate-x-14",
                        "translate-x-0",
                        "-translate-x-5 sm:-translate-x-10",
                      ];
                      const offsetCls = offsets[index % offsets.length];
                      const isSelected = selectedDateStr === node.dateStr;
                      const isToday = node.dateStr === todayStr;
                      const isFuture = node.dateStr > todayStr;

                      // Tentukan item preview untuk peti milestone (kelipatan 7 hari)
                      const dropIdx =
                        Math.floor((node.dayIndex / 7 - 1) % PATH_DROP_ITEMS.length);
                      const milestonePreviewItem =
                        PATH_DROP_ITEMS[Math.max(0, dropIdx)] ||
                        PATH_DROP_ITEMS[0];

                      const isMilestoneClaimed = (
                        userProfile.claimedPathMilestones || []
                      ).includes(node.dayIndex);

                      const chestState: ChestState = isMilestoneClaimed
                        ? "opened"
                        : isFuture
                        ? "locked"
                        : "ready_shaking";

                      return (
                        <React.Fragment key={node.dateStr}>
                          {/* TUGAS 2.3: Gerbang Perbatasan Bioma Otomatis */}
                          {node.showBiomeGateBefore && (
                            <BiomeTransitionDivider
                              previousMonthIndex={node.prevMonthIndex}
                              currentMonthIndex={node.monthIndex}
                              dayNumber={node.dayIndex}
                              isStartGate={node.dayIndex === 1}
                            />
                          )}

                          <div
                            ref={isToday ? todayStoneRef : undefined}
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
                                "group relative flex flex-col items-center focus:outline-none cursor-pointer p-2.5 rounded-3xl transition-all",
                                isSelected &&
                                  "bg-white/95 border-2 border-[#38B6FF] border-b-[4px] border-b-[#1E88E5] shadow-sm"
                              )}
                            >
                              {isToday && (
                                <span className="mb-1 px-2.5 py-0.5 rounded-full bg-[#58CC02] text-white font-display text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                                  📍 Posisi Hari Ini
                                </span>
                              )}

                              <SteppingStoneNode
                                status={node.status}
                                label={node.dayIndex}
                                className="w-24 h-20 sm:w-28 sm:h-24 group-hover:scale-105 transition-transform"
                              />

                              <div className="mt-1 px-3 py-1 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold flex flex-wrap items-center justify-center gap-1.5 shadow-2xs">
                                <span className="text-[#3D352E]">
                                  Hari ke-{node.dayIndex}
                                </span>
                                <span className="text-[#7A6E65]">
                                  • {node.calendarShortLabel}
                                </span>
                                {node.totalSpent > 0 && (
                                  <span className="tabular-nums text-[#C83E2B]">
                                    • -{formatCompactRupiah(node.totalSpent)}
                                  </span>
                                )}
                                {node.totalSpent === 0 &&
                                  node.totalIncome > 0 && (
                                    <span className="tabular-nums text-[#2E6F00]">
                                      • +{formatCompactRupiah(node.totalIncome)}
                                    </span>
                                  )}
                              </div>
                            </button>
                          </div>

                          {/* Milestone Checkpoint Treasure Chest (Setiap Kelipatan 7 Hari) */}
                          {node.isMilestoneDay && milestonePreviewItem && (
                            <div className="py-2 flex flex-col items-center max-w-full px-2">
                              <div className="w-1 h-5 bg-[#D4C9B4] rounded-full mb-1" />
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenMilestoneChest(
                                    node.dayIndex,
                                    isFuture
                                  )
                                }
                                className={cn(
                                  "group border-2 border-b-[5px] rounded-3xl px-4 sm:px-5 py-3 flex items-center gap-3 transition-all max-w-md w-full shadow-sm text-left",
                                  isFuture
                                    ? "bg-[#F7F3EB]/95 border-[#E6DFD2] border-b-[#D4C9B4] opacity-85 cursor-not-allowed"
                                    : "bg-[#FFFBEB]/95 hover:bg-[#FFF4CE] border-[#FDE08D] border-b-[#F5C84C] cursor-pointer"
                                )}
                              >
                                <div className="relative flex items-center justify-center shrink-0">
                                  <AnimatedTreasureChest
                                    state={chestState}
                                    className="w-16 h-16"
                                  />
                                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E6DFD2] flex items-center justify-center -ml-3 shadow-xs">
                                    <AccessoryPreviewIcon
                                      accessoryId={milestonePreviewItem.id}
                                      isMysteryLocked={!isMilestoneClaimed}
                                      className="w-8 h-8"
                                    />
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-lg bg-[#FFC800] text-[#4A3500] text-[10px] font-display font-extrabold uppercase inline-flex items-center gap-1">
                                      <Gift className="w-3 h-3" /> Peti Hari ke-
                                      {node.dayIndex}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg bg-white border border-[#E6DFD2] text-[10px] font-display font-extrabold text-[#3D352E]">
                                      Drop Eksklusif Jalur Kas
                                    </span>
                                  </div>
                                  <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] mt-1 leading-snug break-words">
                                    {isMilestoneClaimed
                                      ? "Peti Terbuka: Aksesoris Eksklusif Diklaim!"
                                      : isFuture
                                      ? `Capai Hari ke-${node.dayIndex} untuk Membuka Peti!`
                                      : "Peti Harta Siap Dibuka! Ketuk Sekarang 🎁"}
                                  </p>
                                  <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                                    {isMilestoneClaimed
                                      ? "Sudah tersimpan di Lemari Kostum Pet kamu."
                                      : "Berisi 1 Aksesoris Eksklusif Jalur Kas + 10 Poin & 15 Stage XP!"}
                                  </p>
                                </div>
                              </button>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </BiomeMapSection>
              </div>

              {/* Floating "📍 Fokus Hari Ini" Button Inside Map Corner */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  setSelectedDateStr(todayStr);
                  scrollToTodayStone();
                }}
                className="absolute bottom-3 right-3 z-20 px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-[#EEF8FF] border-2 border-[#38B6FF] border-b-[4px] border-b-[#1E88E5] font-display text-xs font-extrabold text-[#1E88E5] shadow-md flex items-center gap-1.5 cursor-pointer transition-transform active:translate-y-0.5"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>📍 Fokus Hari Ini</span>
              </button>
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
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                Ringkasan Kas Mingguan (7 Hari)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Otomatis menghitung pengeluaran & sisa jatah mingguanmu
              </p>
            </div>
            <CozyIcon name="calendar_streak" size={30} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Jatah Mingguan Aman
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#3D352E] break-words mt-0.5">
                {formatRupiah(report.weeklyBudgetAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Terpakai Minggu Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#C83E2B] break-words mt-0.5">
                -{formatRupiah(report.totalSpentThisWeek)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Sisa Uang Minggu Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#2E6F00] break-words mt-0.5">
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

          <div className="space-y-2.5 pt-2 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                Daftar Transaksi 7 Hari Terakhir
              </h3>
              <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                {weeklyTransactions.length} Transaksi
              </span>
            </div>
            {visibleWeeklyTx.map((tx) => (
              <ReceiptCardItem key={tx.id} tx={tx} />
            ))}
            {weeklyTransactions.length > 5 && (
              <TactileButton
                variant="cream"
                size="sm"
                fullWidth
                onClick={() => setShowAllWeeklyTx((prev) => !prev)}
              >
                {showAllWeeklyTx
                  ? "Sembunyikan Sebagian ▴"
                  : `Lihat Semua (${weeklyTransactions.length} Transaksi) ▾`}
              </TactileButton>
            )}
          </div>
        </CozyCard>
      )}

      {/* 3C. MONTHLY VIEW */}
      {scope === "monthly" && (
        <CozyCard tone="white" className="space-y-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                Ringkasan Kas Bulanan & Target Tabungan
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa {report.remainingDaysInMonth} hari lagi di bulan ini
              </p>
            </div>
            <CozyIcon name="cat_saving" size={30} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Total Uang Saku Bulanan
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#2E6F00] break-words mt-0.5">
                +{formatRupiah(report.monthlyAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Target Tabungan Dikunci
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#4A3500] break-words mt-0.5">
                {formatRupiah(report.monthlySavingTarget)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Total Terpakai Bulan Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#C83E2B] break-words mt-0.5">
                -{formatRupiah(report.totalSpentThisMonth)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Sisa Uang Bulan Ini
              </p>
              <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#2E6F00] break-words mt-0.5">
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

          <div className="space-y-2 pt-2 min-w-0">
            <h3 className="font-display text-base font-extrabold text-[#3D352E]">
              Porsi Pengeluaran per Kategori
            </h3>
            {report.categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="p-3 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] flex items-center justify-between gap-2 flex-wrap min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon category={cat.category} size={26} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E] leading-snug break-words">
                      {cat.category}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E6DFD2]">
                      {cat.group === "need" ? "Kebutuhan" : "Keinginan"} •{" "}
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <span className="font-display font-extrabold tabular-nums text-sm text-[#3D352E] shrink-0">
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
  const [showAll, setShowAll] = useState<boolean>(false);

  const formattedDate = new Date(dateStr + "T12:00:00").toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );

  const visibleTx = showAll ? transactions : transactions.slice(0, 5);

  return (
    <CozyCard tone="white" className="space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="missions_scroll" size={26} />
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug break-words">
              Struk & Rincian Kas ({formattedDate})
            </h3>
            <p className="text-xs font-bold text-[#7A6E65]">
              {transactions.length} transaksi tercatat pada hari ini (Maks. 3
              transaksi berpoin/hari)
            </p>
          </div>
        </div>
        <TactileButton
          variant="matcha"
          size="sm"
          onClick={onAddClick}
          className="shrink-0"
        >
          <CozyIcon name="plus_record" size={16} /> + Catat Kas
        </TactileButton>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-2">
          <p className="font-display text-base font-extrabold text-[#3D352E]">
            Belum ada catatan kas di tanggal ini!
          </p>
          <p className="text-xs font-bold text-[#7A6E65]">
            Catat struk belanjamu secara Rinci (&ge;2 sub-item) untuk dapat +10
            Poin & +20 Stage XP!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 min-w-0">
          {visibleTx.map((tx) => (
            <ReceiptCardItem key={tx.id} tx={tx} />
          ))}
          {transactions.length > 5 && (
            <TactileButton
              variant="cream"
              size="sm"
              fullWidth
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll
                ? "Sembunyikan Sebagian ▴"
                : `Lihat Semua (${transactions.length} Transaksi) ▾`}
            </TactileButton>
          )}
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
    <div className="rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-white p-3.5 transition-all min-w-0 max-w-full overflow-hidden">
      <div
        onClick={() => {
          if (tx.items && tx.items.length > 0) {
            soundEffects.tactileClick();
            setExpanded(!expanded);
          }
        }}
        className="flex items-start sm:items-center justify-between gap-3 cursor-pointer flex-wrap sm:flex-nowrap min-w-0"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] leading-snug break-words">
                {tx.title}
              </p>
              {tx.is_itemized && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-0.5 shrink-0">
                  <Sparkles className="w-3 h-3" /> Rinci
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-[#7A6E65] mt-0.5">
              <span>{tx.category}</span>
              {tx.points_earned > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#4A3500] bg-[#FFFBEB] px-1.5 py-0.2 rounded border border-[#FDE08D] font-display font-extrabold shrink-0">
                  <CozyIcon name="coin_rupiah" size={13} />+{tx.points_earned}{" "}
                  Poin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span
            className={cn(
              "font-display text-sm sm:text-base font-extrabold tabular-nums break-words",
              tx.type === "income" ? "text-[#2E6F00]" : "text-[#C83E2B]"
            )}
          >
            {tx.type === "income" ? "+" : "-"}
            {formatRupiah(tx.total_amount)}
          </span>
          {tx.items && tx.items.length > 0 && (
            <span className="p-1 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2]">
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
                  className="flex items-center justify-between text-xs font-bold text-[#7A6E65] gap-2 flex-wrap min-w-0"
                >
                  <span className="leading-snug break-words">
                    • {item.item_name}{" "}
                    <span className="text-[#3D352E]">x{item.quantity}</span>
                  </span>
                  <span className="tabular-nums font-extrabold text-[#3D352E] shrink-0">
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

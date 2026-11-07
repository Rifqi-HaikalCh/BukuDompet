"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  CASTE_STAGE_TARGETS,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  AccessoryPreviewIcon,
  CASTE_META,
  PET_SPECIES_META,
  ACCESSORY_BY_ID,
} from "@/components/illustrations/PetAvatarSystem";
import {
  BIOME_MONTHS,
  BiomeMapSection,
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
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn, formatCompactRupiah } from "@/lib/utils";

type TimeScope = "daily" | "weekly" | "monthly";

function getRelativeDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

const PATH_MILESTONE_DROPS: Record<
  7 | 14 | 21 | 28,
  { day: 7 | 14 | 21 | 28; accessoryId: string; weekLabel: string }
> = {
  7: {
    day: 7,
    accessoryId: "head_straw_hat",
    weekLabel: "Checkpoint Hari ke-7",
  },
  14: {
    day: 14,
    accessoryId: "eyes_sunglasses",
    weekLabel: "Checkpoint Hari ke-14",
  },
  21: {
    day: 21,
    accessoryId: "vehicle_skateboard",
    weekLabel: "Checkpoint Hari ke-21",
  },
  28: {
    day: 28,
    accessoryId: "decor_lucky_cat",
    weekLabel: "Checkpoint Hari ke-28",
  },
};

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
    recordZeroSpendDay,
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

  const levelInfo = getLevelFromXp(userProfile.xp);
  const currentStage = userProfile.currentStage || 1;
  const stageTarget = CASTE_STAGE_TARGETS[currentStage];
  const petName = userProfile.petCustomName || "Mochi";

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
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [confirmZeroSpendOpen, setConfirmZeroSpendOpen] =
    useState<boolean>(false);
  const [confirmMilestoneDay, setConfirmMilestoneDay] = useState<
    7 | 14 | 21 | 28 | null
  >(null);
  const [showAllWeeklyTx, setShowAllWeeklyTx] = useState<boolean>(false);

  // Inline Pet Rename State
  const [isEditingPetName, setIsEditingPetName] = useState<boolean>(false);
  const [petNameInput, setPetNameInput] = useState<string>(petName);

  const handleSavePetName = () => {
    const res = renamePet(petNameInput);
    if (res.success) {
      soundEffects.coinChime();
      setIsEditingPetName(false);
    } else {
      soundEffects.tactileClick();
    }
  };

  // Build Adventure Path Stones with 4 Milestone Checkpoints (Days 7, 14, 21, 28)
  const adventureDays = useMemo(() => {
    const list: {
      dateStr: string;
      dayNum: number;
      dayLabel: string;
      status: StoneStatus;
      totalSpent: number;
      txCount: number;
      milestoneDayAfter?: 7 | 14 | 21 | 28;
    }[] = [];

    const milestoneMap: Record<number, 7 | 14 | 21 | 28> = {
      [-5]: 7,
      [-3]: 14,
      [-1]: 21,
      [0]: 28,
    };

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

      const dayTxs = userTransactions.filter(
        (t) => t.transaction_date === dStr
      );
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
        milestoneDayAfter: milestoneMap[offset],
      });
    }
    return list;
  }, [userTransactions, report.dssl]);

  // Count unique recorded days for the Biome Resource Growth Engine
  const completedDaysInMonth = useMemo(() => {
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
    () => getBiomeResourceStatus(selectedMonth, completedDaysInMonth),
    [selectedMonth, completedDaysInMonth]
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

  const executeMilestoneClaim = (milestoneDay: 7 | 14 | 21 | 28) => {
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
        description={`${petName} akan mencatat bahwa hari ini kamu berhasil puasa jajan! Api Streak harianmu tetap menyala + kamu mendapat +10 Poin & +15 Stage XP!`}
        confirmLabel="Ya, Klaim Rp0 Hari Ini!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        mochiStage={report.mochiStage}
        badgeText="Master Puasa Jajan"
      />

      <CozyConfirmModal
        open={confirmMilestoneDay !== null}
        onClose={() => setConfirmMilestoneDay(null)}
        onConfirm={() => {
          if (confirmMilestoneDay !== null) {
            executeMilestoneClaim(confirmMilestoneDay);
          }
        }}
        title={
          confirmMilestoneDay
            ? `Klaim Drop Aksesoris Hari ke-${confirmMilestoneDay}?`
            : "Klaim Drop Aksesoris?"
        }
        description={
          confirmMilestoneDay
            ? `Selamat! Kamu berhak membuka peti Checkpoint Hari ke-${confirmMilestoneDay} untuk mendapatkan Aksesoris Eksklusif "${
                ACCESSORY_BY_ID[
                  PATH_MILESTONE_DROPS[confirmMilestoneDay].accessoryId
                ]?.name || "Langka"
              }" serta +10 Poin & +15 Stage XP!`
            : ""
        }
        confirmLabel="Ya, Klaim Aksesoris & Poin!"
        confirmVariant="honey"
        mochiMood="proud_combo"
        mochiStage={report.mochiStage}
        badgeText="Drop Eksklusif Jalur Kas"
      />

      {/* 1. Pet's Cozy Room Widget (Single Soft Pastel Hero Section Inside White Card) */}
      <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          {/* Customizable Multi-Species & 8-Caste Pet Avatar */}
          <Link
            href="/app/pets"
            onClick={() => soundEffects.tactileClick()}
            className="w-40 h-44 sm:w-44 sm:h-48 rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 relative group p-2"
          >
            <CustomizablePetAvatar
              species={userProfile.activeSpecies || "cat"}
              stage={currentStage}
              mood={report.petMood}
              customName={petName}
              equippedAccessories={userProfile.equippedAccessories}
              className="w-36 h-40 group-hover:scale-105 transition-transform"
            />
            <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] font-display text-[10px] font-extrabold text-[#A552DB] truncate max-w-[160px]">
              Kasta #{currentStage}: {CASTE_META[currentStage].name}
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
                      maxLength={24}
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
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-display text-base sm:text-lg font-extrabold text-[#3D352E]">
                      {petName}
                    </span>
                    <span className="text-[11px] font-bold text-[#7A6E65]">
                      ({PET_SPECIES_META[userProfile.activeSpecies || "cat"].name})
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

                <span className="px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB] inline-flex items-center gap-1 truncate max-w-full">
                  <CozyIcon name="pet_paw" size={13} />
                  <span className="truncate">{equippedTitle}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/app/shop"
                  onClick={() => soundEffects.tactileClick()}
                  className="px-2.5 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1 hover:bg-[#FFF4CE]"
                >
                  <ShoppingBag className="w-3 h-3" /> Butik Shop
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setStreakCalendarOpen(true);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1 hover:bg-[#FFFBEB] cursor-pointer shrink-0"
                >
                  <CozyIcon name="calendar_streak" size={14} /> Kalender
                </button>
              </div>
            </div>

            {/* Speech Bubble */}
            <div className="bg-[#F7F3EB] border border-[#E6DFD2] rounded-2xl p-3 text-xs sm:text-sm font-bold text-[#3D352E] relative">
              <p>&ldquo;{report.mochiSpeech}&rdquo;</p>
            </div>

            {/* Remaining Daily Safe Spend Hero Banner (Matcha Pastel) */}
            <div className="bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] rounded-2xl p-3.5 flex items-center justify-between gap-2 min-w-0">
              <div className="text-left min-w-0">
                <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00] truncate">
                  Sisa Jatah Aman Hari Ini (DSSL)
                </p>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-[#2E6F00] truncate">
                  <RollingNumber
                    value={report.remainingDailySafeSpend}
                    prefix="Rp"
                  />
                </div>
                <p className="text-[11px] font-bold text-[#3D352E] truncate tabular-nums">
                  Terpakai: {formatCompactRupiah(report.todayTotalSpend)} dari{" "}
                  {formatCompactRupiah(report.dssl)}
                </p>
              </div>
              <TactileButton
                variant="matcha"
                size="sm"
                onClick={() => setTransactionDrawerOpen(true)}
                className="shrink-0"
              >
                <CozyIcon name="plus_record" size={18} /> + Catat
              </TactileButton>
            </div>
          </div>
        </div>

        {/* Supervisor Visual Appreciation Sticker Banner (0 Poin — Pure Visual Love) */}
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
                <p className="text-xs font-bold text-[#3D352E] truncate mt-0.5">
                  &ldquo;{latestCheer.message}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dual Progress Bars: Budget Health + Caste Unlock Requirements */}
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
                ? `Syarat Kasta #${currentStage + 1}: Stage XP (${userProfile.stageRecordedDays}/${stageTarget.nextStageDaysTarget} Hari)`
                : "Kasta Puncak Maharaja Berlian"
            }
            showFraction
          />
        </div>
      </CozyCard>

      {/* 2. Time-Scope Segmented Switcher (Sky Blue Active Tab per Tugas 1.2) */}
      <div className="grid grid-cols-3 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
        {(
          [
            { id: "daily", label: "Hari Ini (Jalur Bioma)" },
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
              "py-2 px-2 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer truncate",
              scope === tab.id
                ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3A. DAILY VIEW: 12-Month Biome Map + Stepping Stones + Milestone Drops */}
      {scope === "daily" && (
        <div className="space-y-5 min-w-0">
          <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
            {/* Top Header & Zero Spend Claim Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <CozyIcon name="home_path" size={28} />
                <div className="min-w-0">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                    Peta Jalur Kas 12 Bioma: {BIOME_MONTHS[selectedMonth]?.biomeTitle}
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    {BIOME_MONTHS[selectedMonth]?.subtitle} (Cuaca:{" "}
                    {BIOME_MONTHS[selectedMonth]?.weatherLabel})
                  </p>
                </div>
              </div>
              <TactileButton
                variant="cream"
                size="sm"
                onClick={() => setConfirmZeroSpendOpen(true)}
              >
                <CozyIcon name="zero_spend" size={18} /> Klaim Rp0 (+10 Poin)
              </TactileButton>
            </div>

            {/* 12-Month Selector Pills (Januari s/d Desember) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-display font-extrabold text-[#7A6E65]">
                <span>JELAJAHI 12 BIOMA BULANAN (JANUARI — DESEMBER):</span>
                <span className="text-[#3D352E]">
                  Bulan Aktif: {BIOME_MONTHS[selectedMonth]?.monthName}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                {BIOME_MONTHS.map((m) => {
                  const isActive = selectedMonth === m.monthIndex;
                  return (
                    <button
                      key={m.monthIndex}
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        setSelectedMonth(m.monthIndex);
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-xl font-display text-xs font-extrabold transition-all cursor-pointer border text-center truncate",
                        isActive
                          ? "bg-[#38B6FF] text-white border-[#1E88E5] border-b-[3px]"
                          : "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
                      )}
                      title={`${m.monthName}: ${m.biomeTitle}`}
                    >
                      {m.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Growing Biome Resource Banner (Tugas 6.3) */}
            <div className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-1 rounded-xl bg-white border border-[#E6DFD2] font-display text-xs font-extrabold text-[#2E6F00] shrink-0">
                  Lv.{biomeStatus.ecosystemLevel}/4
                </span>
                <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E]">
                  {biomeStatus.bannerText}
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#7A6E65] shrink-0">
                {completedDaysInMonth} Hari Tercatat
              </span>
            </div>

            {/* Illustrated 12-Month Biome Scenery + Weather + Stepping Stones */}
            <BiomeMapSection
              monthIndex={selectedMonth}
              completedStepsCount={completedDaysInMonth}
            >
              <div className="flex flex-col items-center space-y-3 py-2">
                {adventureDays.map((node, index) => {
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

                  const milestoneMeta = node.milestoneDayAfter
                    ? PATH_MILESTONE_DROPS[node.milestoneDayAfter]
                    : null;
                  const milestoneAcc = milestoneMeta
                    ? ACCESSORY_BY_ID[milestoneMeta.accessoryId]
                    : null;
                  const isMilestoneClaimed = milestoneMeta
                    ? (userProfile.claimedPathMilestones || []).includes(
                        milestoneMeta.day
                      ) ||
                      (userProfile.ownedAccessories || []).includes(
                        milestoneMeta.accessoryId
                      )
                    : false;
                  const chestState: ChestState = isMilestoneClaimed
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
                              "bg-white/90 border-2 border-[#38B6FF] border-b-[4px] border-b-[#1E88E5] shadow-sm"
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
                              <span className="tabular-nums text-[#C83E2B]">
                                • {formatCompactRupiah(node.totalSpent)}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Milestone Checkpoint Drop (Days 7, 14, 21, 28) */}
                      {milestoneMeta && milestoneAcc && (
                        <div className="py-2 flex flex-col items-center max-w-full">
                          <div className="w-1 h-5 bg-[#D4C9B4] rounded-full mb-1" />
                          <button
                            type="button"
                            onClick={() => {
                              soundEffects.tactileClick();
                              if (!isMilestoneClaimed) {
                                setConfirmMilestoneDay(milestoneMeta.day);
                              }
                            }}
                            className="group bg-[#FFFBEB]/95 hover:bg-[#FFF4CE] border-2 border-[#FDE08D] border-b-[5px] border-b-[#F5C84C] rounded-3xl px-4 sm:px-5 py-3 flex items-center gap-3 cursor-pointer transition-all max-w-full shadow-sm"
                          >
                            <div className="relative flex items-center justify-center shrink-0">
                              <AnimatedTreasureChest
                                state={chestState}
                                className="w-16 h-16 sm:w-18 sm:h-18"
                              />
                              <div className="w-10 h-10 rounded-xl bg-white border border-[#E6DFD2] flex items-center justify-center -ml-3 shadow-xs">
                                <AccessoryPreviewIcon
                                  accessoryId={milestoneAcc.id}
                                  className="w-8 h-8"
                                />
                              </div>
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-lg bg-[#FFC800] text-[#4A3500] text-[10px] font-display font-extrabold uppercase inline-flex items-center gap-1">
                                  <Gift className="w-3 h-3" />{" "}
                                  {milestoneMeta.weekLabel}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-white border border-[#E6DFD2] text-[10px] font-display font-extrabold text-[#3D352E]">
                                  Drop Eksklusif Jalur Kas
                                </span>
                              </div>
                              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] mt-0.5 truncate">
                                {isMilestoneClaimed
                                  ? `Terklaim: ${milestoneAcc.name}`
                                  : `Hadiah Drop: ${milestoneAcc.name}`}
                              </p>
                              <p className="text-xs font-bold text-[#7A6E65]">
                                {isMilestoneClaimed
                                  ? "Sudah masuk ke Lemari Aksesoris di Galeri Pet!"
                                  : "Ketuk untuk klaim aksesoris langka + 10 Poin & 15 Stage XP!"}
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
              <h2 className="font-display text-xl font-extrabold text-[#3D352E] truncate">
                Ringkasan Kas Mingguan (7 Hari)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Otomatis menghitung pengeluaran & sisa jatah mingguanmu
              </p>
            </div>
            <CozyIcon name="calendar_streak" size={30} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Jatah Mingguan Aman
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#3D352E] truncate"
                title={formatRupiah(report.weeklyBudgetAllowance)}
              >
                {formatCompactRupiah(report.weeklyBudgetAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Terpakai Minggu Ini
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#C83E2B] truncate"
                title={formatRupiah(report.totalSpentThisWeek)}
              >
                -{formatCompactRupiah(report.totalSpentThisWeek)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Sisa Uang Minggu Ini
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#2E6F00] truncate"
                title={formatRupiah(report.remainingWeeklyBudget)}
              >
                {formatCompactRupiah(report.remainingWeeklyBudget)}
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
            <div className="flex items-center justify-between gap-2">
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
              <h2 className="font-display text-xl font-extrabold text-[#3D352E] truncate">
                Ringkasan Kas Bulanan & Target Tabungan
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Sisa {report.remainingDaysInMonth} hari lagi di bulan ini
              </p>
            </div>
            <CozyIcon name="cat_saving" size={30} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Total Uang Saku Bulanan
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#2E6F00] truncate"
                title={formatRupiah(report.monthlyAllowance)}
              >
                +{formatCompactRupiah(report.monthlyAllowance)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Target Tabungan Dikunci
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#4A3500] truncate"
                title={formatRupiah(report.monthlySavingTarget)}
              >
                {formatCompactRupiah(report.monthlySavingTarget)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Total Terpakai Bulan Ini
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#C83E2B] truncate"
                title={formatRupiah(report.totalSpentThisMonth)}
              >
                -{formatCompactRupiah(report.totalSpentThisMonth)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0 overflow-hidden">
              <p className="text-xs font-bold text-[#7A6E65] truncate">
                Sisa Uang Bulan Ini
              </p>
              <p
                className="font-display font-extrabold tabular-nums text-lg text-[#2E6F00] truncate"
                title={formatRupiah(report.remainingTotalBalanceThisMonth)}
              >
                {formatCompactRupiah(report.remainingTotalBalanceThisMonth)}
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
                className="p-3 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] flex items-center justify-between gap-2 min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon category={cat.category} size={26} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E] truncate">
                      {cat.category}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E6DFD2]">
                      {cat.group === "need" ? "Kebutuhan" : "Keinginan"} •{" "}
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <span className="font-display font-extrabold tabular-nums text-sm text-[#3D352E] shrink-0">
                  {formatCompactRupiah(cat.amount)}
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
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="missions_scroll" size={26} />
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] truncate">
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
            Belum ada pengeluaran di tanggal ini!
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
        className="flex items-center justify-between gap-3 cursor-pointer min-w-0"
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
              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate max-w-[180px] sm:max-w-[260px]">
                {tx.title}
              </p>
              {tx.is_itemized && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-0.5 shrink-0">
                  <Sparkles className="w-3 h-3" /> Rinci
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#7A6E65]">
              <span className="truncate">{tx.category}</span>
              {tx.points_earned > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#4A3500] bg-[#FFFBEB] px-1.5 py-0.2 rounded border border-[#FDE08D] font-display font-extrabold shrink-0">
                  <CozyIcon name="coin_rupiah" size={13} />+{tx.points_earned}{" "}
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
                  className="flex items-center justify-between text-xs font-bold text-[#7A6E65] gap-2 min-w-0"
                >
                  <span className="truncate">
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

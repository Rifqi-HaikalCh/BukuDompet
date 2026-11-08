"use client";

/**
 * /app/journey — Jalur Kas (dewasa) / Jalur Cerita (Anak SD).
 * Versi 5.0: menggabungkan Peta Perjalanan + Celengan dan Detektif Kas (Inspektur Saku) dalam satu halaman.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Pencil, Check, X, ShoppingBag, Gift, LocateFixed } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { analyzeSpendingDetective, getLevelFromXp, GROWTH_STAGE_TARGETS } from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  AccessoryPreviewIcon,
  GROWTH_STAGE_META,
  getSpeciesInfo,
  ACCESSORY_BY_ID,
  type PetMood,
} from "@/components/illustrations/PetAvatarSystem";
import { InspectorSakuOwl, PiggyVaultIllustration } from "@/components/illustrations/DetectiveAndStoryAssets";
import { previewPathDrops } from "@/lib/path-drop";
import { BIOME_MONTHS, BiomeMapSection, BiomeTransitionDivider, getBiomeResourceStatus } from "@/components/illustrations/BiomeEnvironment";
import { SteppingStoneNode, AnimatedTreasureChest, type StoneStatus, type ChestState } from "@/components/illustrations/AdventureNodes";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { TactileButton, CozyCard, ChunkyProgressBar, RollingNumber, formatRupiah } from "@/components/ui/CozyPrimitives";
import { AccessoryDropModal } from "@/components/user/AccessoryDropModal";
import { DetectiveInvestigation, owlMoodFromReport } from "@/components/journey/DetectiveInvestigation";
import { PodLegend, PodPopover, KidDayFeed, type PodSummary } from "@/components/journey/PodInfo";
import { TransactionDayFeed, WeeklySummary, MonthlySummary } from "@/components/journey/ReceiptViews";
import { localDateStr, addDaysStr, diffDaysStr, parseLocalDate, shortDateLabel } from "@/lib/dates";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn, formatCompactRupiah } from "@/lib/utils";

type TimeScope = "daily" | "weekly" | "monthly";
type MainTab = "map" | "detective";

export default function JourneyPage() {
  const {
    activeProfileId,
    monitoredUserId,
    currentRole,
    profiles,
    transactions,
    equippedTitle,
    isProudComboActive,
    setTransactionDrawerOpen,
    setStreakCalendarOpen,
    setStoryModalOpen,
    setSavingsModalOpen,
    claimPathMilestoneDrop,
    renamePet,
    addTransaction,
  } = useBukuDompetStore();
  const stories = useFamilyStore((s) => s.stories);
  const goals = useFamilyStore((s) => s.goals);

  const userProfile =
    (isChildRole(currentRole)
      ? profiles.find((p) => p.id === activeProfileId && isChildRole(p.role))
      : profiles.find((p) => p.id === monitoredUserId && isChildRole(p.role))) ||
    profiles.find((p) => isChildRole(p.role)) ||
    profiles[0];

  const isKid = userProfile.role === "schoolchild";
  const isCold = Boolean(userProfile.isColdStreakMode);

  const userTransactions = useMemo(() => transactions.filter((t) => t.user_id === userProfile.id), [transactions, userProfile.id]);
  const userStories = useMemo(() => stories.filter((s) => s.userId === userProfile.id), [stories, userProfile.id]);

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
  const owlMood = owlMoodFromReport(report, isProudComboActive);

  const [mainTab, setMainTab] = useState<MainTab>("map");
  const [scope, setScope] = useState<TimeScope>("daily");
  const todayStr = localDateStr();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);

  const currentRealMonthIndex = new Date().getMonth();
  const activeBiome = BIOME_MONTHS[currentRealMonthIndex] || BIOME_MONTHS[0];

  const [isEditingPetName, setIsEditingPetName] = useState<boolean>(false);
  const [petNameInput, setPetNameInput] = useState<string>(petName);

  const mapScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const todayStoneRef = useRef<HTMLDivElement | null>(null);

  const scrollToTodayStone = () => {
    todayStoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Tautan dari rute lama (/app/detective) membuka tab Investigasi langsung.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "detective") setMainTab("detective");
  }, []);

  useEffect(() => {
    if (mainTab === "map" && scope === "daily") {
      const timer = setTimeout(scrollToTodayStone, 250);
      return () => clearTimeout(timer);
    }
  }, [scope, mainTab]);

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
   * Perjalanan berkelanjutan dari Hari ke-1 sampai hari ini + 5 hari ke depan.
   * Dewasa: status dari catatan kas. Anak SD: status dari cerita harian.
   */
  const journeyNodes = useMemo(() => {
    let earliestDateStr = addDaysStr(todayStr, -7);
    for (const tx of userTransactions) if (tx.transaction_date < earliestDateStr) earliestDateStr = tx.transaction_date;
    for (const st of userStories) if (st.date < earliestDateStr) earliestDateStr = st.date;

    const totalDaysToToday = Math.max(1, diffDaysStr(earliestDateStr, todayStr) + 1);
    const totalNodesCount = totalDaysToToday + 5;

    const nodes: (PodSummary & {
      calendarShortLabel: string;
      monthIndex: number;
      prevMonthIndex?: number;
      showBiomeGateBefore: boolean;
      isMilestoneDay: boolean;
    })[] = [];

    for (let i = 0; i < totalNodesCount; i++) {
      const dayIndex = i + 1;
      const dStr = addDaysStr(earliestDateStr, i);
      const monthIndex = parseLocalDate(dStr).getMonth();
      const prevMonthIndex = i > 0 ? parseLocalDate(addDaysStr(earliestDateStr, i - 1)).getMonth() : undefined;

      const dayTxs = userTransactions.filter((t) => t.transaction_date === dStr);
      const cashTxs = dayTxs.filter((t) => t.type !== "saving");
      const dayExpense = dayTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.total_amount), 0);
      const dayIncome = dayTxs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.total_amount), 0);
      const daySaved = dayTxs.filter((t) => t.type === "saving").reduce((s, t) => s + Number(t.total_amount), 0);
      const dayStories = userStories.filter((s) => s.date === dStr);
      const hasRecord = isKid ? dayStories.length > 0 : cashTxs.length > 0;

      let status: StoneStatus = "completed_safe";
      if (dStr === todayStr) status = "active_today";
      else if (dStr > todayStr) status = "missed_frozen";
      else if (!isKid && dayExpense > report.dssl * 1.05) status = "completed_warn";
      else if (!hasRecord) status = "missed_frozen";

      nodes.push({
        dayIndex,
        dateStr: dStr,
        calendarShortLabel: shortDateLabel(dStr),
        monthIndex,
        prevMonthIndex,
        showBiomeGateBefore: dayIndex === 1 || (dayIndex - 1) % 30 === 0 || (prevMonthIndex !== undefined && prevMonthIndex !== monthIndex),
        status,
        isFuture: dStr > todayStr,
        totalSpent: dayExpense,
        totalIncome: dayIncome,
        totalSaved: daySaved,
        cashCount: cashTxs.length,
        stories: dayStories,
        isMilestoneDay: dayIndex % 7 === 0,
      });
    }
    return nodes;
  }, [userTransactions, userStories, todayStr, report.dssl, isKid]);

  const pathDropPreview = useMemo(() => {
    const claimed = userProfile.claimedPathMilestones || [];
    const unclaimedDays = journeyNodes.filter((n) => n.isMilestoneDay && !claimed.includes(n.dayIndex)).map((n) => n.dayIndex);
    return previewPathDrops(userProfile.ownedAccessories, userProfile.currentStage, unclaimedDays);
  }, [journeyNodes, userProfile.claimedPathMilestones, userProfile.ownedAccessories, userProfile.currentStage]);

  const completedDaysCount = useMemo(() => {
    const uniqueDates = new Set<string>([
      ...userTransactions.filter((t) => t.type !== "saving").map((t) => t.transaction_date),
      ...userStories.map((s) => s.date),
    ]);
    return Math.max(uniqueDates.size, userProfile.current_streak || 1, userProfile.stageRecordedDays || 1);
  }, [userTransactions, userStories, userProfile.current_streak, userProfile.stageRecordedDays]);

  const biomeStatus = useMemo(() => getBiomeResourceStatus(currentRealMonthIndex, completedDaysCount), [currentRealMonthIndex, completedDaysCount]);

  const selectedDayTransactions = useMemo(
    () => userTransactions.filter((t) => t.transaction_date === selectedDateStr),
    [userTransactions, selectedDateStr]
  );
  const selectedDayStories = useMemo(() => userStories.filter((s) => s.date === selectedDateStr), [userStories, selectedDateStr]);
  const selectedDaySaved = useMemo(
    () => selectedDayTransactions.filter((t) => t.type === "saving").reduce((s, t) => s + Number(t.total_amount), 0),
    [selectedDayTransactions]
  );
  const selectedPod = journeyNodes.find((n) => n.dateStr === selectedDateStr);

  const weeklyTransactions = useMemo(() => {
    const cutoffStr = addDaysStr(todayStr, -6);
    return userTransactions.filter((t) => t.transaction_date >= cutoffStr);
  }, [userTransactions, todayStr]);

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

  const handleSimulateOverburn = () => {
    soundEffects.detectiveBuzz();
    addTransaction({
      type: "expense",
      category: "Nongkrong",
      need_or_want: "want",
      title: "Nongkrong Cafe & Dessert Impulsif",
      total_amount: 65000,
      items: [
        { item_name: "Caramel Macchiato Large", quantity: 1, unit_price: 38000 },
        { item_name: "Croissant Coklat Lumer", quantity: 1, unit_price: 27000 },
      ],
    });
  };

  const latestCheer = userProfile.supervisorCheers && userProfile.supervisorCheers.length > 0 ? userProfile.supervisorCheers[0] : null;

  // Tujuan celengan aktif (untuk kartu celengan di bawah peta)
  const myGoals = goals.filter((g) => g.userId === userProfile.id);
  const activeGoal = myGoals.find((g) => !g.completedAt) ?? myGoals[0];
  const goalPct = activeGoal && activeGoal.targetAmount > 0 ? Math.min(100, Math.round((activeGoal.savedAmount / activeGoal.targetAmount) * 100)) : 0;

  const petMood: PetMood = isCold ? "shivering_cold" : report.petMood;
  const petSpeech = isCold
    ? isKid
      ? `Brrr... streak-mu padam dan ${petName} kedinginan. Tulis satu cerita hari ini ya!`
      : `Brrr... streak-mu padam dan ${petName} kedinginan. Catat kas hari ini ya!`
    : isKid
    ? userProfile.last_recorded_date === todayStr
      ? `Ceritamu hari ini keren! ${petName} bangga banget.`
      : `Halo! Aku ${petName}. Yuk tulis cerita hari ini supaya streak kita menyala.`
    : report.mochiSpeech;

  const handlePrimaryAction = () => {
    soundEffects.tactileClick();
    if (isKid) setStoryModalOpen(true);
    else setTransactionDrawerOpen(true);
  };

  const mapTabLabel = isKid ? "Peta Cerita & Celengan" : "Peta Perjalanan & Celengan";

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      <AccessoryDropModal />

      {/* 1. Kamar Pet */}
      <CozyCard tone={isCold ? "sky" : "white"} className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          <Link
            href="/app/pets"
            onClick={() => soundEffects.tactileClick()}
            className="w-40 h-44 sm:w-44 sm:h-48 rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 relative group p-2"
          >
            <CustomizablePetAvatar
              species={activeSpecies}
              stage={currentStage}
              mood={petMood}
              customName={petName}
              equippedAccessories={userProfile.equippedAccessories}
              className="w-36 h-40 group-hover:scale-105 transition-transform"
            />
            <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] font-display text-[10px] font-extrabold text-[#A552DB] leading-snug text-center">
              Fase {currentStage}/8: {stageMeta.name}
            </span>
          </Link>

          <div className="flex-1 space-y-3 text-center sm:text-left w-full min-w-0">
            <div className="flex items-center justify-center sm:justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                {isEditingPetName ? (
                  <div className="inline-flex items-center gap-1 bg-[#F7F3EB] border-2 border-[#38B6FF] rounded-xl px-2 py-0.5">
                    <input
                      type="text"
                      value={petNameInput}
                      maxLength={18}
                      aria-label="Nama pet"
                      onChange={(e) => setPetNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePetName();
                        if (e.key === "Escape") setIsEditingPetName(false);
                      }}
                      className="w-28 bg-transparent font-display text-xs font-extrabold text-[#3D352E] focus:outline-none"
                      autoFocus
                    />
                    <button type="button" onClick={handleSavePetName} className="p-1 rounded-lg bg-[#58CC02] text-white cursor-pointer" title="Simpan Nama Pet" aria-label="Simpan nama pet">
                      <Check className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => setIsEditingPetName(false)} className="p-1 rounded-lg bg-[#E6DFD2] text-[#3D352E] cursor-pointer" title="Batal" aria-label="Batal ubah nama">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                    <span className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] break-words">{petName}</span>
                    <span className="text-[11px] font-bold text-[#7A6E65]">({speciesInfo.name})</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        setPetNameInput(petName);
                        setIsEditingPetName(true);
                      }}
                      className="p-1 rounded-lg bg-[#F7F3EB] hover:bg-[#FFFBEB] border border-[#E6DFD2] text-[#7A6E65] hover:text-[#3D352E] cursor-pointer transition-colors"
                      title="Ubah Nama Pet"
                      aria-label="Ubah nama pet"
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

            <div className={cn("border rounded-2xl p-3 text-xs sm:text-sm font-bold leading-relaxed break-words", isCold ? "bg-[#EBF3F9] border-[#B8D4E8] text-[#1B4F7A]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E]")}>
              <p>&ldquo;{petSpeech}&rdquo;</p>
            </div>
          </div>
        </div>

        {latestCheer && (
          <div className="rounded-2xl bg-[#FFFDF9] border-2 border-[#E6DFD2] p-3 flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFF2F0] border border-[#FFCDC6] flex items-center justify-center shrink-0">
              <CozyIcon name="parent_heart" size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500]">{latestCheer.stickerLabel}</span>
                <span className="text-[11px] font-bold text-[#7A6E65]">dari {latestCheer.fromSupervisorName} • Apresiasi Visual</span>
              </div>
              <p className="text-xs font-bold text-[#3D352E] leading-snug break-words mt-0.5">&ldquo;{latestCheer.message}&rdquo;</p>
            </div>
          </div>
        )}

        <ChunkyProgressBar
          value={userProfile.stageXp}
          max={stageTarget.nextStageXpTarget}
          variant="sky"
          label={currentStage < 8 ? `Menuju Fase ${currentStage + 1} (${GROWTH_STAGE_META[(currentStage + 1) as 2].name}): ${userProfile.stageRecordedDays}/${stageTarget.nextStageDaysTarget} Hari` : "Fase Puncak: Sepuh Bijaksana"}
          showFraction
        />
      </CozyCard>

      {/* 2. Widget Ringkas Inspektur Saku (di atas peta) */}
      {isKid ? (
        <CozyCard tone="honey" className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <InspectorSakuOwl mood={userStories.some((s) => s.date === todayStr) ? "proud" : "safe"} className="w-20 h-20 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#4A3500]">Inspektur Saku</p>
              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] leading-snug break-words">
                {userStories.some((s) => s.date === todayStr) ? "Cerita hari ini sudah tertulis. Mantap!" : "Belum ada cerita hari ini."}
              </p>
              <p className="text-xs font-bold text-[#7A6E65] tabular-nums break-words">
                Celengan: {formatRupiah(activeGoal?.savedAmount ?? 0)}
                {activeGoal ? ` dari ${formatRupiah(activeGoal.targetAmount)}` : ""}
              </p>
            </div>
          </div>
          <TactileButton variant="matcha" size="sm" onClick={handlePrimaryAction} className="shrink-0 w-full sm:w-auto">
            <GlyphInline name="pen" /> Tulis Cerita
          </TactileButton>
        </CozyCard>
      ) : (
        <CozyCard tone={report.statusColor === "matcha" ? "matcha" : report.statusColor === "honey" ? "honey" : "peach"} className="p-4 space-y-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <InspectorSakuOwl mood={owlMood} className="w-20 h-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#3D352E]">Inspektur Saku</p>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold tabular-nums text-[#3D352E]">
                  Status: {report.walletStatus === "PENTING_TERDETEKSI" ? "Waspada" : report.walletStatus === "AMAN" ? "Aman" : report.walletStatus === "WASPADA" ? "Waspada" : "Bengkak"}
                </span>
              </div>
              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] leading-snug break-words mt-0.5">{report.statusTitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00] leading-snug">Sisa Jatah Aman Hari Ini</p>
              <div className="font-display text-xl font-extrabold text-[#2E6F00] break-words">
                <RollingNumber value={report.remainingDailySafeSpend} prefix="Rp" />
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums break-words">
                Terpakai {formatCompactRupiah(report.todayTotalSpend)} dari {formatCompactRupiah(report.dssl)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#1565C0] leading-snug">Sisa Minggu Ini</p>
              <p className="font-display text-xl font-extrabold tabular-nums text-[#1565C0] break-words">{formatCompactRupiah(report.remainingWeeklyBudget)}</p>
              <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums break-words">Jatah {formatCompactRupiah(report.weeklyBudgetAllowance)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
              <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#8A3FC2] leading-snug">Sisa Belanja Bulan Ini</p>
              <p className="font-display text-xl font-extrabold tabular-nums text-[#8A3FC2] break-words">{formatCompactRupiah(report.remainingMonthlyPool)}</p>
              <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums break-words">{report.remainingDaysInMonth} hari lagi</p>
            </div>
          </div>

          {(report.walletStatus === "BENGKAK" || report.microLeaks.length > 0) && (
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setMainTab("detective");
              }}
              className="w-full text-left rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] p-3 text-xs font-bold text-[#8F2A1B] leading-relaxed break-words cursor-pointer hover:bg-[#FFE8E4]"
            >
              <GlyphInline name="bolt" /> {report.walletStatus === "BENGKAK" ? "Alarm: pengeluaran hari ini melewati batas aman." : report.microLeaks[0].message} <span className="font-display font-extrabold underline">Lihat Investigasi</span>
            </button>
          )}
        </CozyCard>
      )}

      {/* 3. Tab utama */}
      <div role="tablist" aria-label="Pilih tampilan jalur" className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
        {(
          [
            { id: "map", label: mapTabLabel },
            { id: "detective", label: "Investigasi Inspektur Saku (Detektif Kas)" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mainTab === tab.id}
            onClick={() => {
              soundEffects.tactileClick();
              setMainTab(tab.id);
            }}
            className={cn(
              "py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer leading-snug break-words",
              mainTab === tab.id ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]" : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "detective" && (
        <DetectiveInvestigation
          profileId={userProfile.id}
          isKid={isKid}
          petName={petName}
          report={report}
          owlMood={owlMood}
          onSimulateOverburn={handleSimulateOverburn}
          onOpenSavings={() => setSavingsModalOpen(true)}
        />
      )}

      {mainTab === "map" && (
        <>
          {!isKid && (
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
                    scope === tab.id ? "bg-[#7ED957] text-[#173300] border-b-[3px] border-b-[#46A302]" : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {(isKid || scope === "daily") && (
            <div className="space-y-5 min-w-0">
              <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CozyIcon name="home_path" size={28} className="shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                          {isKid ? "Peta Jalur Cerita" : "Peta Perjalanan Kas"}: {activeBiome.biomeTitle}
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
                    <LocateFixed className="w-4 h-4" /> Fokus Hari Ini
                  </TactileButton>
                </div>

                {/* Legenda visual semua jenis pod */}
                <PodLegend isKid={isKid} />

                <div className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-1 rounded-xl bg-white border border-[#E6DFD2] font-display text-xs font-extrabold text-[#2E6F00] shrink-0">
                      Ekosistem Lv.{biomeStatus.ecosystemLevel}/4
                    </span>
                    <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E] leading-snug break-words">{biomeStatus.bannerText}</p>
                  </div>
                  <span className="text-xs font-display font-extrabold text-[#7A6E65] shrink-0">Perjalanan Hari ke-{journeyNodes.length - 5}</span>
                </div>

                <div className="relative">
                  <div ref={mapScrollContainerRef} className="h-[460px] md:h-[520px] overflow-y-auto overflow-x-hidden rounded-3xl border-2 border-[#E6DFD2] relative scroll-smooth">
                    <BiomeMapSection monthIndex={currentRealMonthIndex} completedStepsCount={completedDaysCount} className="border-0 rounded-none min-h-full">
                      <div className="flex flex-col items-center space-y-3 py-4">
                        {journeyNodes.map((node, index) => {
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
                          const isFuture = node.isFuture;

                          const isMilestoneClaimed = (userProfile.claimedPathMilestones || []).includes(node.dayIndex);
                          const recordedDropId = userProfile.pathMilestoneDrops?.[node.dayIndex];
                          const milestonePreviewItem = isMilestoneClaimed ? (recordedDropId ? ACCESSORY_BY_ID[recordedDropId] : undefined) : pathDropPreview[node.dayIndex];
                          const chestState: ChestState = isMilestoneClaimed ? "opened" : isFuture ? "locked" : "ready_shaking";

                          return (
                            <React.Fragment key={node.dateStr}>
                              {node.showBiomeGateBefore && (
                                <BiomeTransitionDivider
                                  previousMonthIndex={node.prevMonthIndex}
                                  currentMonthIndex={node.monthIndex}
                                  dayNumber={node.dayIndex}
                                  isStartGate={node.dayIndex === 1}
                                />
                              )}

                              <div ref={isToday ? todayStoneRef : undefined} className={cn("flex flex-col items-center transition-transform", offsetCls)}>
                                <button
                                  type="button"
                                  aria-label={`Hari ke-${node.dayIndex}, ${node.calendarShortLabel}. Ketuk untuk info`}
                                  aria-expanded={isSelected && popoverOpen}
                                  onClick={() => {
                                    soundEffects.tactileClick();
                                    setSelectedDateStr(node.dateStr);
                                    setPopoverOpen(true);
                                  }}
                                  className={cn(
                                    "group relative flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38B6FF] cursor-pointer p-2.5 rounded-3xl transition-all",
                                    isSelected && "bg-white/95 border-2 border-[#38B6FF] border-b-[4px] border-b-[#1E88E5] shadow-sm"
                                  )}
                                >
                                  {isToday && (
                                    <span className="mb-1 px-2.5 py-0.5 rounded-full bg-[#58CC02] text-white font-display text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                                      <GlyphInline name="pin" /> Posisi Hari Ini
                                    </span>
                                  )}
                                  <SteppingStoneNode status={node.status} label={node.dayIndex} className="w-24 h-20 sm:w-28 sm:h-24 group-hover:scale-105 transition-transform" />
                                  <div className="mt-1 px-3 py-1 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold flex flex-wrap items-center justify-center gap-1.5 shadow-2xs">
                                    <span className="text-[#3D352E]">Hari ke-{node.dayIndex}</span>
                                    <span className="text-[#7A6E65]">• {node.calendarShortLabel}</span>
                                    {!isKid && node.totalSpent > 0 && <span className="tabular-nums text-[#C83E2B]">• -{formatCompactRupiah(node.totalSpent)}</span>}
                                    {!isKid && node.totalSpent === 0 && node.totalIncome > 0 && <span className="tabular-nums text-[#2E6F00]">• +{formatCompactRupiah(node.totalIncome)}</span>}
                                    {isKid && node.stories.length > 0 && <span className="text-[#2E6F00]">• <GlyphInline name="book_open" /> {node.stories.length}</span>}
                                    {node.totalSaved > 0 && <span className="tabular-nums text-[#1565C0]">• <GlyphInline name="piggy" /></span>}
                                  </div>
                                </button>
                              </div>

                          {/* Milestone Checkpoint Treasure Chest (Setiap Kelipatan 7 Hari) */}
                          {node.isMilestoneDay && (
                            <div className="py-2 flex flex-col items-center max-w-full px-2">
                              <div className="w-1 h-5 bg-[#D4C9B4] rounded-full mb-1" />
                              <button
                                type="button"
                                aria-disabled={isFuture}
                                aria-label={
                                  isMilestoneClaimed
                                    ? `Peti Harta Hari ke-${node.dayIndex}, sudah dibuka`
                                    : isFuture
                                    ? `Peti Harta Hari ke-${node.dayIndex}, terkunci sampai harinya tiba`
                                    : `Buka Peti Harta Hari ke-${node.dayIndex}`
                                }
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
                                  {milestonePreviewItem && (
                                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E6DFD2] flex items-center justify-center -ml-3 shadow-xs">
                                      <AccessoryPreviewIcon
                                        accessoryId={milestonePreviewItem.id}
                                        isMysteryLocked={!isMilestoneClaimed}
                                        className="w-8 h-8"
                                      />
                                    </div>
                                  )}
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
                                      : "Peti Harta Siap Dibuka! Ketuk Sekarang"}
                                  </p>
                                  <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                                    {isMilestoneClaimed
                                      ? milestonePreviewItem
                                        ? `${milestonePreviewItem.name} sudah tersimpan di Lemari Kostum Pet kamu.`
                                        : "Sudah tersimpan di Lemari Kostum Pet kamu."
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

                  <AnimatePresence>
                    {popoverOpen && selectedPod && <PodPopover key={selectedPod.dateStr} pod={selectedPod} isKid={isKid} onClose={() => setPopoverOpen(false)} />}
                  </AnimatePresence>

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
                    <span>Hari Ini</span>
                  </button>
                </div>
              </CozyCard>

              {/* Celengan ringkas */}
              <CozyCard tone="white" className="p-4 flex flex-col sm:flex-row items-center gap-4 min-w-0">
                <PiggyVaultIllustration progressPercent={goalPct} className="w-28 h-28 shrink-0" />
                <div className="flex-1 min-w-0 w-full space-y-2">
                  <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                    <GlyphInline name="piggy" /> Celengan{activeGoal ? `: ${activeGoal.name}` : ""}
                  </h3>
                  {activeGoal ? (
                    <ChunkyProgressBar value={activeGoal.savedAmount} max={activeGoal.targetAmount} variant="honey" label="Tabungan terkumpul" showFraction />
                  ) : (
                    <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Belum ada tujuan celengan. Menabung tidak dihitung sebagai pengeluaran boros.</p>
                  )}
                  <TactileButton
                    variant="sky"
                    size="sm"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setSavingsModalOpen(true);
                    }}
                  >
                    <CozyIcon name="cat_saving" size={18} /> Catat Tabungan
                  </TactileButton>
                </div>
              </CozyCard>

              {isKid ? (
                <KidDayFeed dateStr={selectedDateStr} stories={selectedDayStories} savedAmount={selectedDaySaved} onWrite={handlePrimaryAction} />
              ) : (
                <TransactionDayFeed dateStr={selectedDateStr} transactions={selectedDayTransactions} onAddClick={() => setTransactionDrawerOpen(true)} />
              )}
            </div>
          )}

          {!isKid && scope === "weekly" && <WeeklySummary report={report} weeklyTransactions={weeklyTransactions} />}
          {!isKid && scope === "monthly" && <MonthlySummary report={report} />}
        </>
      )}
    </div>
  );
}

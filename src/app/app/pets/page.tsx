"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Pencil,
  Check,
  X,
  Lock,
  Sparkles,
  ShoppingBag,
  Shirt,
  Egg,
  MessageCircleHeart,
  RefreshCw,
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
  GROWTH_STAGES,
  PET_SPECIES_CATALOG,
  ACCESSORY_CATALOG,
  ACCESSORY_BY_ID,
  ACCESSORY_SLOTS,
  SLOT_LABEL,
  getSpeciesInfo,
  type PetSpecies,
  type GrowthStage,
  type AccessorySlot,
} from "@/components/illustrations/PetAvatarSystem";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type PetBoutiqueTab = "wardrobe" | "shop" | "kandang";

function PetsAndBoutiqueContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  const {
    activeProfileId,
    profiles,
    transactions,
    equippedTitle,
    isProudComboActive,
    renamePet,
    equipPetSpecies,
    buyPetSpecies,
    buyAccessory,
    toggleEquipAccessory,
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

  const activeSpecies: PetSpecies = userProfile.activeSpecies || "chubby_cat";
  const speciesInfo = getSpeciesInfo(activeSpecies);
  const currentStage: GrowthStage = userProfile.currentStage || 1;
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

  // Main Sub-Tab State
  const [activeTab, setActiveTab] = useState<PetBoutiqueTab>(() => {
    if (initialTabParam === "shop") return "shop";
    if (initialTabParam === "kandang" || initialTabParam === "adopt")
      return "kandang";
    return "wardrobe";
  });

  useEffect(() => {
    if (initialTabParam === "shop") setActiveTab("shop");
    else if (initialTabParam === "kandang" || initialTabParam === "adopt")
      setActiveTab("kandang");
    else if (initialTabParam === "wardrobe") setActiveTab("wardrobe");
  }, [initialTabParam]);

  // Wardrobe & Shop Filters
  const [wardrobeSlotFilter, setWardrobeSlotFilter] = useState<
    "all" | AccessorySlot
  >("all");
  const [shopStageFilter, setShopStageFilter] = useState<
    "all" | GrowthStage
  >(currentStage);
  const [shopSlotFilter, setShopSlotFilter] = useState<"all" | AccessorySlot>(
    "all"
  );

  // Sync shop stage filter when active pet changes
  useEffect(() => {
    setShopStageFilter(currentStage);
  }, [currentStage, activeSpecies]);

  // Inline Rename State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(petName);

  // TUGAS 4: Interactive "Cek Kabar & Mood Finansial Pet" State (0 Free XP/Points)
  const [petHopKey, setPetHopKey] = useState<number>(0);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);

  // Preview Growth Stage on Left Stage (defaults to active pet's currentStage)
  const [previewStage, setPreviewStage] = useState<GrowthStage>(currentStage);
  useEffect(() => {
    setPreviewStage(currentStage);
  }, [currentStage, activeSpecies]);

  // Confirmation Modal States
  const [confirmBuyItemId, setConfirmBuyItemId] = useState<string | null>(null);
  const [confirmAdoptSpecies, setConfirmAdoptSpecies] =
    useState<PetSpecies | null>(null);

  const smartDialogues = useMemo(() => {
    const remXp = Math.max(
      0,
      stageTarget.nextStageXpTarget - userProfile.stageXp
    );
    const remDays = Math.max(
      0,
      stageTarget.nextStageDaysTarget - userProfile.stageRecordedDays
    );
    const nextStageName =
      currentStage < 8
        ? GROWTH_STAGE_META[(currentStage + 1) as GrowthStage].name
        : "Sepuh Bijaksana";

    const list: string[] = [
      report.mochiSpeech,
      `📊 Kabar Dompet Hari Ini: Sisa jatah aman harianmu ${formatRupiah(
        report.remainingDailySafeSpend
      )} dari batas ${formatRupiah(report.dssl)} (Status: ${
        report.walletStatus
      }).`,
      currentStage < 8
        ? `🌱 Progres Pertumbuhan ${petName}: Saat ini di Fase ${currentStage}/8 (${stageMeta.name}). Butuh ${remXp} Stage XP & ${remDays} hari mencatat lagi untuk tumbuh ke Fase ${
            currentStage + 1
          } (${nextStageName})!`
        : `👑 ${petName} sudah mencapai Fase 8 (Sepuh Bijaksana)! Terima kasih sudah konsisten merawat dan mencatat kas setiap hari!`,
      `🔥 Konsistensi Api Streak: Kamu sudah mencatat kas ${userProfile.current_streak} hari berturut-turut dan punya ${userProfile.streak_freeze_count} Perisai Es pelindung!`,
    ];

    if (report.microLeaks.length > 0) {
      list.push(report.microLeaks[0].message);
    }

    return list;
  }, [
    report.mochiSpeech,
    report.remainingDailySafeSpend,
    report.dssl,
    report.walletStatus,
    report.microLeaks,
    stageTarget,
    userProfile.stageXp,
    userProfile.stageRecordedDays,
    userProfile.current_streak,
    userProfile.streak_freeze_count,
    currentStage,
    petName,
    stageMeta.name,
  ]);

  const handleCheckPetMood = () => {
    soundEffects.tactileClick();
    setPetHopKey((k) => k + 1);
    setDialogueIndex((prev) => (prev + 1) % smartDialogues.length);
  };

  const handleSaveName = () => {
    const res = renamePet(nameInput);
    if (res.success) {
      soundEffects.coinChime();
      setIsEditingName(false);
    } else {
      soundEffects.tactileClick();
    }
  };

  // Wardrobe Items (Owned by user)
  const ownedAccessoryItems = useMemo(() => {
    const ownedIds = userProfile.ownedAccessories || [];
    return ACCESSORY_CATALOG.filter((item) => {
      if (!ownedIds.includes(item.id)) return false;
      if (wardrobeSlotFilter !== "all" && item.slot !== wardrobeSlotFilter) {
        return false;
      }
      return true;
    });
  }, [userProfile.ownedAccessories, wardrobeSlotFilter]);

  // Boutique Shop Items (STRICTLY source === "shop" per Tugas 6)
  const shopAccessoryItems = useMemo(() => {
    return ACCESSORY_CATALOG.filter((item) => {
      if (item.source !== "shop") return false;
      if (
        shopStageFilter !== "all" &&
        item.stageRequirement !== shopStageFilter
      ) {
        return false;
      }
      if (shopSlotFilter !== "all" && item.slot !== shopSlotFilter) {
        return false;
      }
      return true;
    });
  }, [shopStageFilter, shopSlotFilter]);

  const pendingBuyItem = confirmBuyItemId
    ? ACCESSORY_BY_ID[confirmBuyItemId]
    : null;
  const pendingAdoptInfo = confirmAdoptSpecies
    ? getSpeciesInfo(confirmAdoptSpecies)
    : null;

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Confirm Buy Accessory Modal */}
      <CozyConfirmModal
        open={pendingBuyItem !== null}
        onClose={() => setConfirmBuyItemId(null)}
        onConfirm={() => {
          if (!pendingBuyItem) return;
          const res = buyAccessory(pendingBuyItem.id);
          if (res.success) {
            soundEffects.coinChime();
            fireCozyConfetti("combo");
          } else {
            soundEffects.tactileClick();
          }
          setConfirmBuyItemId(null);
        }}
        title={
          pendingBuyItem
            ? `Beli "${pendingBuyItem.name}"?`
            : "Beli Kostum Pet?"
        }
        description={
          pendingBuyItem
            ? `Tukarkan ${pendingBuyItem.pricePoints.toLocaleString(
                "id-ID"
              )} Poin untuk membeli ${pendingBuyItem.name} (Slot: ${
                SLOT_LABEL[pendingBuyItem.slot]
              }) dan langsung memasangnya ke ${petName}?`
            : ""
        }
        confirmLabel={
          pendingBuyItem
            ? `Ya, Beli (${pendingBuyItem.pricePoints.toLocaleString(
                "id-ID"
              )} Poin)`
            : "Ya, Beli"
        }
        confirmVariant="matcha"
        mochiStage={report.mochiStage}
        badgeText="Butik Kostum Pet"
      />

      {/* Confirm Adopt New Pet Egg Modal */}
      <CozyConfirmModal
        open={pendingAdoptInfo !== null}
        onClose={() => setConfirmAdoptSpecies(null)}
        onConfirm={() => {
          if (!pendingAdoptInfo) return;
          const res = buyPetSpecies(pendingAdoptInfo.id);
          if (res.success) {
            soundEffects.comboFanfare();
            fireCozyConfetti("jackpot");
          } else {
            soundEffects.tactileClick();
          }
          setConfirmAdoptSpecies(null);
        }}
        title={
          pendingAdoptInfo
            ? `Adopsi Telur ${pendingAdoptInfo.name}? 🥚`
            : "Adopsi Telur Pet?"
        }
        description={
          pendingAdoptInfo
            ? `Tukarkan ${pendingAdoptInfo.pricePoints.toLocaleString(
                "id-ID"
              )} Poin untuk mengadopsi ${
                pendingAdoptInfo.name
              }? Pet baru akan menetas mulai dari Fase 1 (Telur Ajaib — 0 Stage XP & 0 Hari Mencatat) agar kamu bisa merawat pertumbuhannya dari awal!`
            : ""
        }
        confirmLabel={
          pendingAdoptInfo
            ? `Adopsi Telur (${pendingAdoptInfo.pricePoints.toLocaleString(
                "id-ID"
              )} Poin)`
            : "Adopsi"
        }
        confirmVariant="matcha"
        mochiStage={1}
        badgeText="Adopsi Telur Kawaii Baru"
      />

      {/* Top Page Header Banner */}
      <CozyCard tone="white" className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#A552DB]">
              <Sparkles className="w-3.5 h-3.5" /> Dunia Pet & Butik Terpadu
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug break-words">
              Panggung Pet, Lemari 7 Slot & Butik 8 Fase Hidup
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#7A6E65] leading-relaxed break-words">
              Rawat pet dari Telur Ajaib hingga Sepuh Bijaksana, padu-padankan
              kostum di panggung kiri, dan belanja item sesuai fase pertumbuhan!
            </p>
          </div>

          {/* User Points Balance Card (Never Truncated per Tugas 1) */}
          <div className="bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] rounded-2xl p-3.5 flex flex-col items-start gap-1 shrink-0">
            <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Saldo Poin Belanja & Tabungan
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <CozyIcon name="coin_rupiah" size={22} />
              <span className="font-display text-xl font-extrabold tabular-nums text-[#4A3500] break-words">
                {userProfile.points_balance.toLocaleString("id-ID")} Poin
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-white border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#2E6F00]">
              Setara {formatRupiah(userProfile.points_balance)}
            </span>
          </div>
        </div>
      </CozyCard>

      {/* TUGAS 6.2: SPLIT-VIEW LAYOUT (Left lg:col-span-5 Sticky Stage + Right lg:col-span-7 Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN (lg:col-span-5 — Sticky Live Pet Stage) ================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4 min-w-0">
          <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
            {/* Pet Name + Inline Edit + Species & Stage Badges */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#EEF8FF] border border-[#BCE3FF] text-xs font-display font-extrabold text-[#1565C0]">
                  Fase {currentStage}/8: {stageMeta.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#A552DB] leading-snug break-words">
                  {equippedTitle}
                </span>
              </div>

              {isEditingName ? (
                <div className="inline-flex items-center gap-1.5 bg-[#F7F3EB] border-2 border-[#38B6FF] rounded-2xl px-3 py-1">
                  <input
                    type="text"
                    value={nameInput}
                    maxLength={18}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                    className="w-36 bg-transparent font-display text-base font-extrabold text-[#3D352E] text-center focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="p-1.5 rounded-xl bg-[#58CC02] text-white cursor-pointer"
                    title="Simpan Nama"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 rounded-xl bg-[#E6DFD2] text-[#3D352E] cursor-pointer"
                    title="Batal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h2 className="font-display text-2xl font-extrabold text-[#3D352E] leading-snug break-words">
                    {petName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setNameInput(petName);
                      setIsEditingName(true);
                    }}
                    className="p-1.5 rounded-xl bg-[#F7F3EB] hover:bg-[#FFFBEB] border border-[#E6DFD2] text-[#7A6E65] hover:text-[#3D352E] cursor-pointer transition-colors"
                    title="Ubah Nama Pet"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Spesies: {speciesInfo.name} •{" "}
                {GROWTH_STAGE_META[previewStage].description}
              </p>
            </div>

            {/* Interactive Live Pet Avatar Canvas */}
            <div
              onClick={handleCheckPetMood}
              className="relative rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] p-4 flex flex-col items-center justify-center cursor-pointer group overflow-hidden"
              title="Ketuk untuk cek kabar & mood finansial Pet!"
            >
              {previewStage !== currentStage && (
                <div className="mb-2 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500]">
                  {previewStage > currentStage
                    ? `🔒 Siluet Rahasia Fase ${previewStage}: ${GROWTH_STAGE_META[previewStage].name}`
                    : `👀 Pratinjau Wujud Fase ${previewStage}: ${GROWTH_STAGE_META[previewStage].name}`}
                </div>
              )}

              <motion.div
                key={petHopKey}
                initial={{ y: -12, scale: 1.04 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
                className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center"
              >
                <CustomizablePetAvatar
                  species={activeSpecies}
                  stage={previewStage}
                  mood={report.petMood}
                  customName={petName}
                  equippedAccessories={userProfile.equippedAccessories}
                  isMysteryLocked={previewStage > currentStage}
                  className="w-full h-full"
                />
              </motion.div>

              {previewStage === 1 && (
                <span className="mt-1 px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-bold text-[#4A3500] text-center leading-snug">
                  🥚 Catatan: Saat masih Fase 1 (Telur Ajaib), hanya Topi,
                  Properti Alas, Aura, dan Latar yang terlihat!
                </span>
              )}
            </div>

            {/* TUGAS 4: Meaningful Interaction — "Cek Kabar & Mood Finansial Pet" (Replaces Gimmick Elus/Lempar Koin) */}
            <div className="space-y-2.5">
              <div className="bg-[#F7F3EB] border-2 border-[#E6DFD2] rounded-2xl p-3.5 text-xs sm:text-sm font-bold text-[#3D352E] leading-relaxed break-words">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00]">
                    💬 Mood & Diagnosis Finansial {petName}:
                  </span>
                  <span className="text-[10px] font-bold text-[#7A6E65]">
                    Pesan {(dialogueIndex % smartDialogues.length) + 1}/
                    {smartDialogues.length}
                  </span>
                </div>
                <p>&ldquo;{smartDialogues[dialogueIndex % smartDialogues.length]}&rdquo;</p>
              </div>

              <TactileButton
                variant="sky"
                size="sm"
                fullWidth
                onClick={handleCheckPetMood}
              >
                <MessageCircleHeart className="w-4 h-4" />
                <span>Cek Kabar & Mood Finansial {petName}</span>
              </TactileButton>
            </div>

            {/* 8 Growth Stage Switcher Bar (1: Telur Ajaib .. 8: Sepuh Bijaksana) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-display font-extrabold text-[#3D352E]">
                  8 Fase Pertumbuhan Hidup:
                </span>
                {previewStage !== currentStage && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setPreviewStage(currentStage);
                    }}
                    className="text-[11px] font-display font-extrabold text-[#1E88E5] underline cursor-pointer"
                  >
                    Kembali ke Fase Aktif ({currentStage})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {GROWTH_STAGES.map((st) => {
                  const unlocked = st <= currentStage;
                  const isPreview = previewStage === st;
                  const meta = GROWTH_STAGE_META[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        setPreviewStage(st);
                      }}
                      className={cn(
                        "p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5",
                        isPreview
                          ? "bg-[#EEF8FF] border-2 border-[#38B6FF] border-b-[3px] border-b-[#1E88E5] text-[#1565C0]"
                          : unlocked
                          ? "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-white"
                          : "bg-[#F5EFE6] border-[#E6DFD2] text-[#7A6E65] opacity-80"
                      )}
                    >
                      <span className="font-display text-xs font-extrabold">
                        {unlocked ? `Fase ${st}` : `🔒 Fase ${st}`}
                      </span>
                      <span className="text-[10px] font-bold leading-tight break-words">
                        {unlocked ? meta.name : "???"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dual Progress Bars for Active Pet's Growth Stage (Reset to 0 at every new stage!) */}
            {currentStage < 8 ? (
              <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] space-y-2.5">
                <p className="text-xs font-display font-extrabold text-[#3D352E] leading-snug break-words">
                  Syarat Tumbuh ke Fase {currentStage + 1} (
                  {GROWTH_STAGE_META[(currentStage + 1) as GrowthStage].name}):
                </p>
                <ChunkyProgressBar
                  value={userProfile.stageXp}
                  max={stageTarget.nextStageXpTarget}
                  variant="sky"
                  label="Stage XP (Direset 0 tiap naik Fase)"
                  showFraction
                />
                <ChunkyProgressBar
                  value={userProfile.stageRecordedDays}
                  max={stageTarget.nextStageDaysTarget}
                  variant="honey"
                  label="Hari Mencatat di Fase Ini"
                  showFraction
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] text-center font-display text-xs font-extrabold text-[#2E6F00]">
                👑 Fase Puncak (Stage 8: Sepuh Bijaksana) Telah Tercapai!
              </div>
            )}

            {/* 7 Equipped Accessory Slots Summary */}
            <div className="space-y-2 pt-1">
              <p className="text-xs font-display font-extrabold text-[#3D352E]">
                7 Slot Kosmetik Terpasang Saat Ini:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACCESSORY_SLOTS.map((slot) => {
                  const eqId = userProfile.equippedAccessories?.[slot];
                  const eqItem = eqId ? ACCESSORY_BY_ID[eqId] : null;
                  return (
                    <div
                      key={slot}
                      className="p-2.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center justify-between gap-2 min-w-0"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-display font-extrabold uppercase text-[#7A6E65] block">
                          {SLOT_LABEL[slot]}
                        </span>
                        <span className="text-xs font-extrabold text-[#3D352E] leading-snug break-words block">
                          {eqItem ? eqItem.name : "Polos (Kosong)"}
                        </span>
                      </div>
                      {eqItem && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.tactileClick();
                            toggleEquipAccessory(eqItem.id);
                          }}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-[#FFEAE6] border border-[#E6DFD2] text-[10px] font-display font-extrabold text-[#C83E2B] cursor-pointer shrink-0"
                        >
                          Lepas
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CozyCard>
        </div>

        {/* ================= RIGHT COLUMN (lg:col-span-7 — 3 Sub-Tabs: Lemari, Butik Shop, Kandang) ================= */}
        <div className="lg:col-span-7 space-y-4 min-w-0">
          {/* 3 Main Sub-Tabs Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setActiveTab("wardrobe");
              }}
              className={cn(
                "py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                activeTab === "wardrobe"
                  ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                  : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
              )}
            >
              <Shirt className="w-4 h-4 shrink-0" />
              <span>👗 Lemari Kostum ({userProfile.ownedAccessories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setActiveTab("shop");
              }}
              className={cn(
                "py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                activeTab === "shop"
                  ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                  : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
              )}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>🛍️ Butik Shop</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setActiveTab("kandang");
              }}
              className={cn(
                "py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                activeTab === "kandang"
                  ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
                  : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
              )}
            >
              <Egg className="w-4 h-4 shrink-0" />
              <span>
                🥚 Kandang & Adopsi ({userProfile.unlockedSpecies.length}/8)
              </span>
            </button>
          </div>

          {/* ================= TAB 1: 👗 LEMARI KOSTUM (WARDROBE) ================= */}
          {activeTab === "wardrobe" && (
            <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                  👗 Lemari Koleksi Kostum & Properti ({ownedAccessoryItems.length} Item)
                </h2>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                  Pilih slot kategori di bawah untuk memadu-padankan pakaian,
                  topi, kacamata, properti, aura, dan latar belakang pada{" "}
                  {petName}.
                </p>
              </div>

              {/* 7 Slot Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setWardrobeSlotFilter("all");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-display text-xs font-extrabold border cursor-pointer transition-all",
                    wardrobeSlotFilter === "all"
                      ? "bg-[#38B6FF] text-white border-[#1E88E5] border-b-[3px]"
                      : "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
                  )}
                >
                  Semua Slot ({userProfile.ownedAccessories.length})
                </button>
                {ACCESSORY_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setWardrobeSlotFilter(slot);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-display text-xs font-extrabold border cursor-pointer transition-all",
                      wardrobeSlotFilter === slot
                        ? "bg-[#38B6FF] text-white border-[#1E88E5] border-b-[3px]"
                        : "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
                    )}
                  >
                    {SLOT_LABEL[slot]}
                  </button>
                ))}
              </div>

              {ownedAccessoryItems.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-3">
                  <p className="font-display text-base font-extrabold text-[#3D352E]">
                    Belum ada koleksi di kategori slot ini!
                  </p>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Yuk kunjungi tab Butik Shop atau buka Peti Harta di Peta
                    Jalur Kas Harian untuk mengoleksi item baru!
                  </p>
                  <TactileButton
                    variant="sky"
                    size="sm"
                    onClick={() => setActiveTab("shop")}
                  >
                    <ShoppingBag className="w-4 h-4" /> Buka Butik Shop Sekarang
                  </TactileButton>
                </div>
              ) : (
                /* TUGAS 1.1 & 6.2: Vertical Card Layout (`flex-col items-center text-center p-4 gap-2`, Never Truncate) */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {ownedAccessoryItems.map((item) => {
                    const equippedInSlotId =
                      userProfile.equippedAccessories?.[item.slot];
                    const isEquipped = equippedInSlotId === item.id;
                    const otherEquippedItem =
                      equippedInSlotId && equippedInSlotId !== item.id
                        ? ACCESSORY_BY_ID[equippedInSlotId]
                        : null;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-3xl border-2 border-b-[4px] flex flex-col items-center text-center p-4 gap-2 transition-all",
                          isEquipped
                            ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
                            : "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                        )}
                      >
                        {/* 1. Large Vector Preview Icon on Top */}
                        <div className="w-24 h-24 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6DFD2] flex items-center justify-center p-2 shrink-0">
                          <AccessoryPreviewIcon
                            accessoryId={item.id}
                            className="w-20 h-20"
                          />
                        </div>

                        {/* 2. Full Item Name (No Truncate!) */}
                        <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                          {item.name}
                        </h3>

                        {/* 3. Slot & Stage Metadata Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB]">
                            Slot: {SLOT_LABEL[item.slot]}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#7A6E65]">
                            Fase {item.stageRequirement}
                          </span>
                          {item.source === "path_drop" && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500]">
                              🎁 Eksklusif Jalur Kas
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                          {item.description}
                        </p>

                        {/* Explicit Replacement Info if another item occupies the same slot */}
                        {otherEquippedItem && (
                          <div className="w-full px-3 py-1.5 rounded-xl bg-[#EEF8FF] border border-[#BCE3FF] text-[11px] font-bold text-[#1565C0] leading-snug break-words">
                            Menggantikan: <strong>{otherEquippedItem.name}</strong>
                          </div>
                        )}

                        {/* 4. Full-Width Action Button at the Bottom */}
                        <div className="w-full pt-1 mt-auto">
                          <TactileButton
                            variant={
                              isEquipped
                                ? "cream"
                                : otherEquippedItem
                                ? "sky"
                                : "matcha"
                            }
                            size="sm"
                            fullWidth
                            onClick={() => {
                              soundEffects.tactileClick();
                              toggleEquipAccessory(item.id);
                            }}
                          >
                            {isEquipped ? (
                              <>Lepas dari {SLOT_LABEL[item.slot]}</>
                            ) : otherEquippedItem ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" /> Tukar{" "}
                                {SLOT_LABEL[item.slot]}
                              </>
                            ) : (
                              <>✨ Pasang ke Pet</>
                            )}
                          </TactileButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CozyCard>
          )}

          {/* ================= TAB 2: 🛍️ BUTIK SHOP (BELI KOSTUM & AURA) ================= */}
          {activeTab === "shop" && (
            <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                    🛍️ Butik Kostum, Properti & Latar (32 Item Shop)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]">
                    Fase Aktif {petName}: Fase {currentStage}/8
                  </span>
                </div>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                  Beli kostum sesuai Fase Pertumbuhan {petName}. Item dari Fase
                  di atas Fase {currentStage} masih terkunci dalam Siluet
                  Rahasia. (16 Item Eksklusif Jalur Kas tidak dijual di sini —
                  dapatkan gratis dari Peti Harta Peta Jalur Kas!)
                </p>
              </div>

              {/* Filter by Growth Stage (Fase 1..8) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Filter Berdasarkan Fase Pertumbuhan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setShopStageFilter("all");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-display text-xs font-extrabold border cursor-pointer transition-all",
                      shopStageFilter === "all"
                        ? "bg-[#38B6FF] text-white border-[#1E88E5] border-b-[3px]"
                        : "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
                    )}
                  >
                    Semua Fase (32)
                  </button>
                  {GROWTH_STAGES.map((st) => {
                    const isUnlocked = st <= currentStage;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          soundEffects.tactileClick();
                          setShopStageFilter(st);
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl font-display text-xs font-extrabold border cursor-pointer transition-all",
                          shopStageFilter === st
                            ? "bg-[#38B6FF] text-white border-[#1E88E5] border-b-[3px]"
                            : isUnlocked
                            ? "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
                            : "bg-[#F5EFE6] text-[#7A6E65] border-[#E6DFD2]"
                        )}
                      >
                        {isUnlocked ? `Fase ${st}` : `🔒 Fase ${st}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter by Slot */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setShopSlotFilter("all");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-xl font-display text-[11px] font-extrabold border cursor-pointer transition-all",
                    shopSlotFilter === "all"
                      ? "bg-[#A552DB] text-white border-[#7E3AF2]"
                      : "bg-white text-[#7A6E65] border-[#E6DFD2]"
                  )}
                >
                  Semua Slot
                </button>
                {ACCESSORY_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setShopSlotFilter(slot);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-xl font-display text-[11px] font-extrabold border cursor-pointer transition-all",
                      shopSlotFilter === slot
                        ? "bg-[#A552DB] text-white border-[#7E3AF2]"
                        : "bg-white text-[#7A6E65] border-[#E6DFD2]"
                    )}
                  >
                    {SLOT_LABEL[slot]}
                  </button>
                ))}
              </div>

              {/* Shop Item Cards Grid — Vertical Layout (`flex-col items-center text-center p-4 gap-2`) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {shopAccessoryItems.map((item) => {
                  const isOwned = userProfile.ownedAccessories.includes(
                    item.id
                  );
                  const isMysteryLocked = item.stageRequirement > currentStage;
                  const canAfford =
                    userProfile.points_balance >= item.pricePoints;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-3xl border-2 border-b-[4px] flex flex-col items-center text-center p-4 gap-2 transition-all",
                        isOwned
                          ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
                          : isMysteryLocked
                          ? "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4]"
                          : "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                      )}
                    >
                      {/* 1. Vector Icon or Mystery Locked Silhouette */}
                      <div className="w-24 h-24 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6DFD2] flex items-center justify-center p-2 shrink-0">
                        <AccessoryPreviewIcon
                          accessoryId={item.id}
                          isMysteryLocked={isMysteryLocked}
                          className="w-20 h-20"
                        />
                      </div>

                      {/* 2. Item Name (Mystery Locked hides name per Tugas 6) */}
                      <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                        {isMysteryLocked
                          ? `Item Rahasia Fase #${item.stageRequirement}`
                          : item.name}
                      </h3>

                      {/* 3. Slot & Stage Requirement Badges */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB]">
                          Slot: {SLOT_LABEL[item.slot]}
                        </span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-lg border text-[11px] font-display font-extrabold",
                            isMysteryLocked
                              ? "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
                              : "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]"
                          )}
                        >
                          Fase {item.stageRequirement}:{" "}
                          {GROWTH_STAGE_META[item.stageRequirement].name}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                        {isMysteryLocked
                          ? `Rawat ${petName} hingga mencapai Fase ${item.stageRequirement} (${GROWTH_STAGE_META[item.stageRequirement].name}) untuk membuka siluet rahasia ini!`
                          : item.description}
                      </p>

                      {/* Price Pill */}
                      {!isMysteryLocked && (
                        <div className="px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] font-display text-xs font-extrabold text-[#4A3500] inline-flex items-center gap-1">
                          <CozyIcon name="coin_rupiah" size={16} />
                          <span>
                            {item.pricePoints.toLocaleString("id-ID")} Poin
                          </span>
                        </div>
                      )}

                      {/* 4. Full-Width Action Button */}
                      <div className="w-full pt-1 mt-auto">
                        {isOwned ? (
                          <TactileButton
                            variant="cream"
                            size="sm"
                            fullWidth
                            onClick={() => {
                              soundEffects.tactileClick();
                              setActiveTab("wardrobe");
                            }}
                          >
                            ✅ Sudah di Lemari (Buka Lemari)
                          </TactileButton>
                        ) : isMysteryLocked ? (
                          <TactileButton
                            variant="cream"
                            size="sm"
                            fullWidth
                            disabled
                            className="opacity-75 cursor-not-allowed"
                          >
                            <Lock className="w-3.5 h-3.5" /> Buka Fase Stage #
                            {item.stageRequirement} Dulu
                          </TactileButton>
                        ) : (
                          <TactileButton
                            variant={canAfford ? "matcha" : "cream"}
                            size="sm"
                            fullWidth
                            onClick={() => {
                              soundEffects.tactileClick();
                              if (canAfford) {
                                setConfirmBuyItemId(item.id);
                              } else {
                                buyAccessory(item.id);
                              }
                            }}
                          >
                            {canAfford
                              ? `Beli & Pasang (${item.pricePoints.toLocaleString(
                                  "id-ID"
                                )} Poin)`
                              : `Poin Belum Cukup (${item.pricePoints.toLocaleString(
                                  "id-ID"
                                )} Poin)`}
                          </TactileButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CozyCard>
          )}

          {/* ================= TAB 3: 🥚 KANDANG & ADOPSI TELUR PET (8 SPESIES KAWAII) ================= */}
          {activeTab === "kandang" && (
            <div className="space-y-4">
              <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                    🥚 Kandang Pet & Adopsi Telur Baru (8 Spesies Kawaii)
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                    Setiap spesies Pet yang kamu adopsi dimulai dari{" "}
                    <strong>Fase 1: Telur Ajaib (0 Stage XP & 0 Hari)</strong>{" "}
                    dan menyimpan progres pertumbuhannya masing-masing secara
                    mandiri!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {PET_SPECIES_CATALOG.map((sp) => {
                    const isUnlocked = userProfile.unlockedSpecies.includes(
                      sp.id
                    );
                    const isActive = activeSpecies === sp.id;
                    const petInstance = userProfile.ownedPets?.[sp.id];
                    const instStage: GrowthStage =
                      petInstance?.currentStage || (isActive ? currentStage : 1);
                    const instMeta = GROWTH_STAGE_META[instStage];
                    const canAfford =
                      userProfile.points_balance >= sp.pricePoints;

                    return (
                      <div
                        key={sp.id}
                        className={cn(
                          "rounded-3xl border-2 border-b-[4px] flex flex-col items-center text-center p-4 gap-2.5 transition-all",
                          isActive
                            ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
                            : isUnlocked
                            ? "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                            : "bg-[#FFFDF9] border-[#E6DFD2] border-b-[#D4C9B4]"
                        )}
                      >
                        {/* Avatar Preview: Owned shows its current stage, Unowned shows Cute Preview + Egg Badge */}
                        <div className="relative w-32 h-32 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] flex items-center justify-center p-2">
                          <CustomizablePetAvatar
                            species={sp.id}
                            stage={isUnlocked ? instStage : 3}
                            mood="happy"
                            className="w-28 h-28"
                          />
                          <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500]">
                            Tier Kawaii ★{sp.kawaiiTier}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                          {isUnlocked && petInstance?.customName
                            ? `${petInstance.customName} (${sp.name})`
                            : sp.name}
                        </h3>

                        {isUnlocked ? (
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#EEF8FF] border border-[#BCE3FF] text-[11px] font-display font-extrabold text-[#1565C0]">
                              Fase {instStage}/8: {instMeta.name}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-bold text-[#7A6E65]">
                              {petInstance?.stageXp ?? 0} XP •{" "}
                              {petInstance?.stageRecordedDays ?? 0} Hari
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB]">
                            🥚 Diadopsi Mulai Fase 1: Telur Ajaib
                          </span>
                        )}

                        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                          {sp.description}
                        </p>

                        {!isUnlocked && (
                          <div className="px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] font-display text-xs font-extrabold text-[#4A3500] inline-flex items-center gap-1">
                            <CozyIcon name="coin_rupiah" size={16} />
                            <span>
                              {sp.pricePoints === 0
                                ? "Gratis (Starter)"
                                : `${sp.pricePoints.toLocaleString(
                                    "id-ID"
                                  )} Poin`}
                            </span>
                          </div>
                        )}

                        <div className="w-full pt-1 mt-auto">
                          {isActive ? (
                            <TactileButton
                              variant="cream"
                              size="sm"
                              fullWidth
                              disabled
                            >
                              ✨ Sedang Aktif di Panggung
                            </TactileButton>
                          ) : isUnlocked ? (
                            <TactileButton
                              variant="sky"
                              size="sm"
                              fullWidth
                              onClick={() => {
                                soundEffects.tactileClick();
                                equipPetSpecies(sp.id);
                              }}
                            >
                              Panggil ke Panggung Pet
                            </TactileButton>
                          ) : (
                            <TactileButton
                              variant={canAfford ? "matcha" : "cream"}
                              size="sm"
                              fullWidth
                              onClick={() => {
                                soundEffects.tactileClick();
                                if (canAfford) {
                                  setConfirmAdoptSpecies(sp.id);
                                } else {
                                  buyPetSpecies(sp.id);
                                }
                              }}
                            >
                              🥚 Adopsi Telur (
                              {sp.pricePoints.toLocaleString("id-ID")} Poin)
                            </TactileButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CozyCard>

              {/* Utility Item: Perisai Es Pelindung Streak */}
              <CozyCard tone="white" className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-[#EEF8FF] border-2 border-[#BCE3FF] flex items-center justify-center shrink-0">
                      <CozyIcon name="ice_shield" size={32} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                          Perisai Es Pelindung Streak (Streak Freeze)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#EEF8FF] border border-[#BCE3FF] text-xs font-display font-extrabold text-[#1565C0]">
                          Dimiliki: {userProfile.streak_freeze_count} Perisai
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words mt-0.5">
                        Melindungi api streak harianmu agar tidak kembali ke 0
                        saat lupa mencatat kas 1 hari.
                      </p>
                    </div>
                  </div>

                  <TactileButton
                    variant="sky"
                    size="sm"
                    onClick={() => {
                      const res = buyStreakFreezeShield();
                      if (res.success) {
                        soundEffects.coinChime();
                      } else {
                        soundEffects.tactileClick();
                      }
                    }}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    Beli +1 Perisai (500 Poin)
                  </TactileButton>
                </div>
              </CozyCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PetsAndBoutiquePage() {
  return (
    <Suspense
      fallback={
        <CozyCard tone="white" className="p-8 text-center">
          <p className="font-display text-base font-extrabold text-[#3D352E]">
            Memuat Dunia Pet & Butik...
          </p>
        </CozyCard>
      }
    >
      <PetsAndBoutiqueContent />
    </Suspense>
  );
}

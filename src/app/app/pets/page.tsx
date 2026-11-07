"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Check,
  X,
  ShoppingBag,
  Sparkles,
  Lock,
  HelpCircle,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  getLevelFromXp,
  CASTE_STAGE_TARGETS,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  AccessoryPreviewIcon,
  CASTE_STAGES,
  CASTE_META,
  PET_SPECIES_LIST,
  PET_SPECIES_META,
  ACCESSORY_CATALOG,
  SLOT_LABEL,
  type CasteStage,
  type PetMood,
  type PetSpecies,
} from "@/components/illustrations/PetAvatarSystem";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { BADGE_META, BADGE_IDS } from "@/components/illustrations/PraiseBadges";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS: { id: PetMood; label: string; desc: string }[] = [
  { id: "happy", label: "Senang", desc: "Dompet Aman" },
  { id: "proud", label: "Bangga Rinci", desc: "Jurnal Rinci Aktif" },
  { id: "worried", label: "Cemas", desc: "Hampir Batas Harian" },
  { id: "shocked_boros", label: "Detektif Kaget", desc: "Alarm Boros" },
];

export default function MochiPetGalleryPage() {
  const {
    activeProfileId,
    profiles,
    badges,
    equippedTitle,
    equipSpecialTitle,
    petMochiForAffection,
    triggerParticleBurst,
    renamePet,
    equipPetSpecies,
    toggleEquipAccessory,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.id === activeProfileId && p.role === "user") ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const levelInfo = getLevelFromXp(userProfile.xp);
  const currentStage: CasteStage = userProfile.currentStage || 1;
  const currentStageTarget = CASTE_STAGE_TARGETS[currentStage];
  const petName = userProfile.petCustomName || "Mochi";
  const activeSpecies: PetSpecies = userProfile.activeSpecies || "cat";
  const unlockedSpecies = userProfile.unlockedSpecies || ["cat"];
  const equippedAccessories = userProfile.equippedAccessories || {};

  const [showcaseStage, setShowcaseStage] = useState<CasteStage>(currentStage);
  const [showcaseMood, setShowcaseMood] = useState<PetMood>("happy");
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  // Rename Pet State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(petName);

  const handleSaveName = () => {
    const res = renamePet(nameInput);
    if (res.success) {
      soundEffects.coinChime();
      setIsEditingName(false);
    } else {
      soundEffects.tactileClick();
    }
  };

  const handlePetMochi = () => {
    soundEffects.comboFanfare();
    setIsBouncing(true);
    setShowcaseMood("proud");
    setFloatingHearts((prev) => [...prev, Date.now()]);
    petMochiForAffection();
    setTimeout(() => {
      setIsBouncing(false);
    }, 650);
  };

  const handleTossCoin = () => {
    soundEffects.coinChime();
    fireCozyConfetti("normal");
    setIsBouncing(true);
    triggerParticleBurst("coin");
    setTimeout(() => {
      setIsBouncing(false);
    }, 550);
  };

  const ownedAccessoryItems = useMemo(() => {
    const owned = userProfile.ownedAccessories || [];
    return ACCESSORY_CATALOG.filter((item) => owned.includes(item.id));
  }, [userProfile.ownedAccessories]);

  const userBadges = useMemo(
    () => badges.filter((b) => b.user_id === userProfile.id),
    [badges, userProfile.id]
  );
  const earnedBadgeCodes = new Set(userBadges.map((b) => b.badge_code));

  const isShowcaseLocked = showcaseStage > currentStage;

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      {/* 1. Interactive Stage Showcase (Single Soft Pastel Taro Hero Card per Tugas 1.2) */}
      <CozyCard tone="taro" className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CozyIcon name="pet_paw" size={32} animated />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB]">
                  Gelar: {equippedTitle}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E3F4FF] border border-[#9AD2FF] text-[11px] font-display font-extrabold text-[#1565C0]">
                  Lv.{levelInfo.level} ({userProfile.xp} Total XP)
                </span>
              </div>

              {/* Pet Name + Inline Edit */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isEditingName ? (
                  <div className="inline-flex items-center gap-1.5 bg-white border-2 border-[#38B6FF] rounded-xl px-2.5 py-1">
                    <input
                      type="text"
                      value={nameInput}
                      maxLength={24}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      className="w-32 bg-transparent font-display text-sm font-extrabold text-[#3D352E] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1 rounded-lg bg-[#58CC02] text-white cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 rounded-lg bg-[#E6DFD2] text-[#3D352E] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] truncate">
                      {petName} —{" "}
                      {isShowcaseLocked
                        ? `Kasta Rahasia #${showcaseStage}`
                        : CASTE_META[showcaseStage].name}
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.tactileClick();
                        setNameInput(petName);
                        setIsEditingName(true);
                      }}
                      className="p-1.5 rounded-xl bg-white hover:bg-[#FFFBEB] border border-[#E2C6FF] text-[#3D352E] cursor-pointer transition-colors shrink-0"
                      title="Ubah Nama Pet"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-2xl bg-white border-2 border-[#E2C6FF] border-b-[4px] border-b-[#C99BFF] text-xs font-display font-extrabold text-[#3D352E]">
              Kasta Aktif: #{currentStage} / 8
            </span>
            <Link
              href="/app/shop"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] text-xs font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1.5 hover:bg-[#FFF4CE]"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Butik Shop
            </Link>
          </div>
        </div>

        {/* Big Interactive Stage */}
        <div className="relative rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-6 flex flex-col items-center justify-center overflow-hidden">
          {/* Floating Affection Hearts */}
          <AnimatePresence>
            {floatingHearts.map((hid) => (
              <motion.div
                key={hid}
                initial={{ opacity: 1, y: 10, scale: 0.6 }}
                animate={{ opacity: 0, y: -90, scale: 1.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute top-12 z-20 pointer-events-none flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2F0] border border-[#FFCDC6] font-display font-extrabold text-xs text-[#C83E2B]"
              >
                <CozyIcon name="parent_heart" size={20} /> +2 XP Sayang{" "}
                {petName}!
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div
            animate={
              isBouncing
                ? { y: [0, -18, 0], scale: [1, 1.08, 1] }
                : { y: 0, scale: 1 }
            }
            transition={{ duration: 0.45 }}
            onClick={handlePetMochi}
            className="cursor-pointer"
          >
            <CustomizablePetAvatar
              species={activeSpecies}
              stage={showcaseStage}
              mood={showcaseMood}
              customName={petName}
              equippedAccessories={equippedAccessories}
              isMysteryLocked={isShowcaseLocked}
              className="w-56 h-60 sm:w-64 sm:h-68"
            />
          </motion.div>

          {/* Species Switcher (Unlocked Species) */}
          <div className="w-full max-w-lg mt-3">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-center text-[#7A6E65] mb-2">
              Pilih Spesies Pet ({unlockedSpecies.length}/4 Terbuka):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PET_SPECIES_LIST.map((sp) => {
                const isUnlocked = unlockedSpecies.includes(sp);
                const isSelected = activeSpecies === sp;
                const spMeta = PET_SPECIES_META[sp];

                return (
                  <button
                    key={sp}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (isUnlocked) {
                        soundEffects.tactileClick();
                        equipPetSpecies(sp);
                      }
                    }}
                    className={cn(
                      "py-2 px-2.5 rounded-2xl text-center transition-all border-2",
                      isSelected
                        ? "bg-[#58CC02] border-[#58CC02] border-b-[4px] border-b-[#46A302] font-display font-extrabold text-white cursor-pointer"
                        : isUnlocked
                        ? "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-white font-bold cursor-pointer"
                        : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65] opacity-60 cursor-not-allowed"
                    )}
                  >
                    <span className="text-xs block truncate">{spMeta.name}</span>
                    <span className="text-[10px] opacity-85 block truncate">
                      {isSelected
                        ? "Sedang Aktif"
                        : isUnlocked
                        ? "Klik Pakai"
                        : "Adopsi di Shop"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Tester Switcher (Sky Blue Active Tab) */}
          <div className="w-full max-w-lg mt-3">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-center text-[#7A6E65] mb-2">
              Uji Ekspresi & Mood {petName}:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setShowcaseMood(m.id);
                  }}
                  className={cn(
                    "py-2 px-2.5 rounded-2xl text-center transition-all cursor-pointer border-2",
                    showcaseMood === m.id
                      ? "bg-[#38B6FF] border-[#38B6FF] border-b-[4px] border-b-[#1E88E5] font-display font-extrabold text-white"
                      : "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-white font-bold"
                  )}
                >
                  <span className="text-xs block truncate">{m.label}</span>
                  <span className="text-[10px] opacity-85 block truncate">
                    {m.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-4">
            <TactileButton
              variant="matcha"
              size="md"
              onClick={handlePetMochi}
            >
              <CozyIcon name="parent_heart" size={22} />
              Elus {petName} (+2 Stage XP)
            </TactileButton>
            <TactileButton
              variant="honey"
              size="md"
              onClick={handleTossCoin}
            >
              <CozyIcon name="coin_rupiah" size={22} />
              Lempar Koin Keberuntungan!
            </TactileButton>
          </div>
        </div>

        {/* Active Caste Stage Reset Progress Panel */}
        <div className="rounded-2xl bg-white border-2 border-[#E6DFD2] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E]">
                Progres Kasta Saat Ini: Stage {currentStage} (
                {CASTE_META[currentStage].name})
              </h3>
              <p className="text-xs font-bold text-[#7A6E65]">
                {currentStage < 8
                  ? `Penuhi kedua syarat di bawah untuk naik ke Kasta #${
                      currentStage + 1
                    }. Saat naik kasta, progres Stage XP & Hari Mencatat di-reset kembali ke 0!`
                  : "Selamat! Kamu telah mencapai Kasta Puncak Maharaja Berlian (Stage 8)!"}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E]">
              Reset per Kasta Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChunkyProgressBar
              value={userProfile.stageXp}
              max={currentStageTarget.nextStageXpTarget}
              variant="sky"
              label="Syarat 1: Stage XP Terkumpul"
              showFraction
            />
            <ChunkyProgressBar
              value={userProfile.stageRecordedDays}
              max={currentStageTarget.nextStageDaysTarget}
              variant="matcha"
              label="Syarat 2: Hari Mencatat di Kasta Ini"
              showFraction
            />
          </div>
        </div>
      </CozyCard>

      {/* 2. Interactive Wardrobe / Lemari Aksesoris (Neutral White Card) */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-6 h-6 text-[#FFC800] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                Lemari Aksesoris & Kostum {petName} ({ownedAccessoryItems.length}
                /24 Dimiliki)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Klik Pasang / Lepas untuk memakaikan aksesoris yang sudah kamu
                miliki!
              </p>
            </div>
          </div>
          <Link href="/app/shop" onClick={() => soundEffects.tactileClick()}>
            <TactileButton variant="honey" size="sm">
              <ShoppingBag className="w-4 h-4" /> Belanja di Butik Shop
            </TactileButton>
          </Link>
        </div>

        {ownedAccessoryItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-2">
            <p className="font-display text-base font-extrabold text-[#3D352E]">
              Belum ada aksesoris yang dimiliki
            </p>
            <p className="text-xs font-bold text-[#7A6E65]">
              Kunjungi Butik Shop atau klaim peti Checkpoint di Jalur Kas
              Harian!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ownedAccessoryItems.map((acc) => {
              const isEquipped = equippedAccessories[acc.slot] === acc.id;
              return (
                <div
                  key={acc.id}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all min-w-0",
                    isEquipped
                      ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[4px] border-b-[#9EE070]"
                      : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#E6DFD2] flex items-center justify-center shrink-0">
                      <AccessoryPreviewIcon
                        accessoryId={acc.id}
                        className="w-12 h-12"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-display font-extrabold uppercase text-[#7A6E65] block truncate">
                        {SLOT_LABEL[acc.slot]}
                      </span>
                      <p className="font-display text-sm font-extrabold text-[#3D352E] truncate">
                        {acc.name}
                      </p>
                      <span className="text-[10px] font-bold text-[#2E6F00]">
                        {isEquipped ? "Sedang Dipakai" : "Tersimpan di Lemari"}
                      </span>
                    </div>
                  </div>

                  <TactileButton
                    variant={isEquipped ? "matcha" : "cream"}
                    size="sm"
                    onClick={() => {
                      soundEffects.tactileClick();
                      toggleEquipAccessory(acc.id);
                    }}
                    className="shrink-0"
                  >
                    {isEquipped ? "Lepas" : "Pasang"}
                  </TactileButton>
                </div>
              );
            })}
          </div>
        )}
      </CozyCard>

      {/* 3. 8 Caste Evolution Stages Grid with Mystery Silhouette Lock (`???`) */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
              8 Kasta Evolusi Karakter (Perantau Kardus &rarr; Maharaja Berlian)
            </h2>
            <p className="text-xs font-bold text-[#7A6E65]">
              Kasta di atas Stage {currentStage} masih diselimuti siluet rahasia
              (`???`). Rajinlah mencatat setiap hari untuk membukanya!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CASTE_STAGES.map((stageNum) => {
            const isUnlocked = stageNum <= currentStage;
            const isPreviewed = showcaseStage === stageNum;
            const meta = CASTE_META[stageNum];
            const prevStageReq =
              stageNum > 1
                ? CASTE_STAGE_TARGETS[(stageNum - 1) as CasteStage]
                : null;
            const isNextImmediateStage = stageNum === currentStage + 1;

            return (
              <div
                key={stageNum}
                className={cn(
                  "rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all border-2 min-w-0 overflow-hidden",
                  isPreviewed && isUnlocked
                    ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[4px] border-b-[#9EE070]"
                    : isUnlocked
                    ? "bg-white border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4]"
                    : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4]"
                )}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#3D352E]">
                      Kasta #{stageNum} / 8
                    </span>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#2E6F00]">
                        <CozyIcon name="check_badge" size={18} /> Terbuka
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#7A6E65]">
                        <Lock className="w-3.5 h-3.5" /> Rahasia (???)
                      </span>
                    )}
                  </div>

                  {/* Avatar Preview OR Strict Mystery Silhouette (`isMysteryLocked={true}`) */}
                  <div
                    onClick={() => {
                      soundEffects.tactileClick();
                      setShowcaseStage(stageNum);
                    }}
                    className="relative rounded-2xl bg-white border border-[#E6DFD2] py-3 flex items-center justify-center cursor-pointer group"
                  >
                    <CustomizablePetAvatar
                      species={activeSpecies}
                      stage={stageNum}
                      mood="happy"
                      customName={isUnlocked ? petName : "???"}
                      equippedAccessories={
                        isUnlocked ? equippedAccessories : undefined
                      }
                      isMysteryLocked={!isUnlocked}
                      className="w-36 h-40 group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Strict Anti-Spoiler Text for Locked Stages (Tugas 3.2) */}
                  <div className="min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] truncate flex items-center gap-1.5">
                      {isUnlocked ? (
                        meta.name
                      ) : (
                        <>
                          <HelpCircle className="w-4 h-4 text-[#7A6E65] shrink-0" />
                          <span>Kasta Rahasia #{stageNum}</span>
                        </>
                      )}
                    </h3>
                    <p className="text-[11px] font-display font-bold text-[#A552DB]">
                      {isUnlocked
                        ? `Aura Kemakmuran: ${meta.aura}`
                        : "Aura & Kostum: ??? (Masih Disegel)"}
                    </p>
                    <p className="text-xs font-bold text-[#7A6E65] mt-1 leading-relaxed">
                      {isUnlocked
                        ? meta.description
                        : `Wujud asli dan gelar kasta ke-${stageNum} baru akan terungkap setelah kamu menyelesaikan syarat di Kasta #${
                            stageNum - 1
                          }!`}
                    </p>
                  </div>
                </div>

                {isUnlocked ? (
                  <div className="pt-1">
                    <TactileButton
                      variant={isPreviewed ? "matcha" : "cream"}
                      size="sm"
                      fullWidth
                      onClick={() => {
                        soundEffects.tactileClick();
                        setShowcaseStage(stageNum);
                      }}
                    >
                      {isPreviewed ? (
                        <>
                          <CozyIcon name="check_badge" size={18} />
                          Sedang Ditampilkan di Panggung
                        </>
                      ) : (
                        "Lihat Wujud Kasta Ini di Panggung"
                      )}
                    </TactileButton>
                  </div>
                ) : (
                  prevStageReq && (
                    <div className="space-y-2 pt-2 border-t border-[#E6DFD2]">
                      <div className="flex items-center justify-between text-[11px] font-display font-extrabold text-[#3D352E]">
                        <span>Syarat Buka dari Kasta #{stageNum - 1}:</span>
                        <span className="text-[#1565C0]">
                          {prevStageReq.nextStageXpTarget} XP &{" "}
                          {prevStageReq.nextStageDaysTarget} Hari
                        </span>
                      </div>
                      <ChunkyProgressBar
                        value={
                          isNextImmediateStage ? userProfile.stageXp : 0
                        }
                        max={prevStageReq.nextStageXpTarget}
                        variant="sky"
                        label={`Stage XP (${
                          isNextImmediateStage ? userProfile.stageXp : 0
                        }/${prevStageReq.nextStageXpTarget})`}
                      />
                      <ChunkyProgressBar
                        value={
                          isNextImmediateStage
                            ? userProfile.stageRecordedDays
                            : 0
                        }
                        max={prevStageReq.nextStageDaysTarget}
                        variant="matcha"
                        label={`Hari Mencatat (${
                          isNextImmediateStage
                            ? userProfile.stageRecordedDays
                            : 0
                        }/${prevStageReq.nextStageDaysTarget} Hari)`}
                      />
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </CozyCard>

      {/* 4. Special Titles / Gelar Kehormatan (Neutral White Card) */}
      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="crown_sultan" size={28} />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold text-[#3D352E] truncate">
              Koleksi Gelar Kehormatan {petName}
            </h2>
            <p className="text-xs font-bold text-[#7A6E65]">
              Terbuka otomatis dari lencana pencapaian yang berhasil kamu raih!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {BADGE_IDS.map((bid) => {
            const unlocked = earnedBadgeCodes.has(bid);
            const meta = BADGE_META[bid];
            const isSelected = equippedTitle === meta.title;

            return (
              <button
                key={bid}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) {
                    soundEffects.tactileClick();
                    equipSpecialTitle(meta.title);
                  }
                }}
                className={cn(
                  "p-3 rounded-2xl text-left border-2 transition-all flex items-center justify-between gap-2 min-w-0",
                  isSelected
                    ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] cursor-pointer"
                    : unlocked
                    ? "bg-white border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] hover:bg-[#F7F3EB] cursor-pointer"
                    : "bg-[#F7F3EB] border-[#E6DFD2] opacity-60 cursor-not-allowed"
                )}
              >
                <div className="min-w-0">
                  <p className="font-display text-xs sm:text-sm font-extrabold text-[#3D352E] truncate">
                    {meta.title}
                  </p>
                  <p className="text-[10px] font-bold text-[#7A6E65] truncate">
                    {unlocked ? "Klik untuk pasang gelar" : "Buka lencana dulu"}
                  </p>
                </div>
                <CozyIcon
                  name={
                    isSelected
                      ? "check_badge"
                      : unlocked
                      ? "xp_star"
                      : "lock_cozy"
                  }
                  size={20}
                />
              </button>
            );
          })}
        </div>
      </CozyCard>
    </div>
  );
}

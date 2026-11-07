"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  getLevelFromXp,
  getMochiStageFromLevel,
} from "@/lib/spending-detective";
import {
  MochiCompanion,
  MOCHI_STAGE_NAMES,
  type MochiStage,
  type MochiMood,
} from "@/components/illustrations/MochiCompanion";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { BADGE_META, BADGE_IDS } from "@/components/illustrations/PraiseBadges";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const EVOLUTION_STAGES: {
  stage: MochiStage;
  minLevel: number;
  requiredXp: number;
  title: string;
  lore: string;
  habitat: string;
}[] = [
  {
    stage: 1,
    minLevel: 1,
    requiredXp: 0,
    title: MOCHI_STAGE_NAMES[1],
    lore: "Memulai perjalanan menabung dari nol! Memakai topi koran lipat sambil menjaga kaleng celengan pertamanya.",
    habitat: "Kotak Kardus Hangat",
  },
  {
    stage: 2,
    minLevel: 4,
    requiredXp: 360,
    title: MOCHI_STAGE_NAMES[2],
    lore: "Mulai disiplin mencatat kas! Mochi memakai syal rajut merah muda dan duduk di bantal empuk bersama celengan keramik.",
    habitat: "Bantal Pastel Nyaman",
  },
  {
    stage: 3,
    minLevel: 8,
    requiredXp: 840,
    title: MOCHI_STAGE_NAMES[3],
    lore: "Ahli mengatur kebutuhan vs keinginan! Memakai kacamata bulat dan rompi manajer sambil memegang kalkulator pintar.",
    habitat: "Ruang Belajar Hijau",
  },
  {
    stage: 4,
    minLevel: 13,
    requiredXp: 1440,
    title: MOCHI_STAGE_NAMES[4],
    lore: "Tabungan semakin tebal! Memakai blazer rapi, menyeruput matcha latte di samping brankas penuh koin emas.",
    habitat: "Kantor Bos Muda",
  },
  {
    stage: 5,
    minLevel: 19,
    requiredXp: 2160,
    title: MOCHI_STAGE_NAMES[5],
    lore: "Puncak evolusi kebebasan finansial! Mengenakan mahkota emas dan jubah beludru di atas singgasana koin berkilau.",
    habitat: "Singgasana Sultan Mochi",
  },
];

const MOOD_OPTIONS: { id: MochiMood; label: string; desc: string }[] = [
  { id: "happy", label: "Senang", desc: "Dompet Aman" },
  { id: "proud_combo", label: "Bangga Combo", desc: "Misi Rinci Aktif" },
  { id: "worried", label: "Cemas", desc: "Hampir Batas Harian" },
  { id: "shocked_boros", label: "Detektif Kaget", desc: "Alarm Boros" },
];

export default function MochiPetGalleryPage() {
  const {
    profiles,
    badges,
    equippedMochiStage,
    equippedTitle,
    equipMochiStage,
    equipSpecialTitle,
    petMochiForAffection,
    triggerParticleBurst,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];
  const levelInfo = getLevelFromXp(userProfile.xp);
  const maxUnlockedStage = getMochiStageFromLevel(levelInfo.level);

  const activeStage = equippedMochiStage || maxUnlockedStage;

  const [showcaseStage, setShowcaseStage] = useState<MochiStage>(activeStage);
  const [showcaseMood, setShowcaseMood] = useState<MochiMood>("happy");
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  const handlePetMochi = () => {
    soundEffects.comboFanfare();
    setIsBouncing(true);
    setShowcaseMood("proud_combo");
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

  const earnedBadgeCodes = new Set(badges.map((b) => b.badge_code));

  return (
    <div className="space-y-5">
      {/* 1. Interactive Stage Showcase */}
      <CozyCard tone="taro" className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <CozyIcon name="pet_paw" size={32} animated />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB]">
                  Gelar: {equippedTitle}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#3D352E]">
                  Lv.{levelInfo.level} ({userProfile.xp} XP)
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] mt-1">
                Panggung Interaktif: {MOCHI_STAGE_NAMES[showcaseStage]}
              </h1>
            </div>
          </div>

          <span className="px-3 py-1 rounded-2xl bg-white border-2 border-[#E2C6FF] border-b-[4px] border-b-[#C99BFF] text-xs font-display font-extrabold text-[#3D352E]">
            Tahap {showcaseStage} / 5
          </span>
        </div>

        {/* Big Interactive Stage */}
        <div className="relative rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] p-6 flex flex-col items-center justify-center overflow-hidden">
          {/* Floating Affection Hearts */}
          <AnimatePresence>
            {floatingHearts.map((hid) => (
              <motion.div
                key={hid}
                initial={{ opacity: 1, y: 10, scale: 0.6 }}
                animate={{ opacity: 0, y: -90, scale: 1.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute top-12 z-20 pointer-events-none flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2F0] border border-[#FFCDC6] font-display font-extrabold text-xs text-[#E06353]"
              >
                <CozyIcon name="parent_heart" size={20} /> +5 XP Sayang Mochi!
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
            <MochiCompanion
              stage={showcaseStage}
              mood={showcaseMood}
              className="w-52 h-52 sm:w-60 sm:h-60"
            />
          </motion.div>

          {/* Mood Tester Switcher */}
          <div className="w-full max-w-md mt-3">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-center text-[#7A6E65] mb-2">
              Uji Ekspresi & Mood Mochi:
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
                      ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] font-display font-extrabold text-[#3D352E]"
                      : "bg-[#F9F4EA] border-[#E6DFD2] text-[#7A6E65] hover:bg-white font-bold"
                  )}
                >
                  <span className="text-xs block">{m.label}</span>
                  <span className="text-[10px] opacity-80 block">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md mt-4">
            <TactileButton
              variant="peach"
              size="md"
              onClick={handlePetMochi}
            >
              <CozyIcon name="parent_heart" size={22} />
              Elus Mochi (+5 XP Kasih Sayang)
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
      </CozyCard>

      {/* 2. Evolution Stage Cards Grid (Unlocked vs Locked) */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">
              5 Tahap Evolusi Mochi (Zero to Millionaire)
            </h2>
            <p className="text-xs font-bold text-[#7A6E65]">
              Pilih wujud Mochi yang sudah terbuka untuk dipasang di kamar berandamu!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EVOLUTION_STAGES.map((item) => {
            const isUnlocked = item.stage <= maxUnlockedStage;
            const isEquipped = activeStage === item.stage;

            return (
              <div
                key={item.stage}
                className={cn(
                  "rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all border-2",
                  isEquipped
                    ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[5px] border-b-[#9EE070]"
                    : isUnlocked
                    ? "bg-[#FFFDF9] border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4]"
                    : "bg-[#F6F0E4] border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] opacity-90"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#3D352E]">
                      Stage {item.stage} • Min. Lv.{item.minLevel}
                    </span>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#46A302]">
                        <CozyIcon name="check_badge" size={18} /> Terbuka
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-display font-extrabold text-[#7A6E65]">
                        <CozyIcon name="lock_cozy" size={18} /> Terkunci
                      </span>
                    )}
                  </div>

                  {/* Mochi Preview or Silhouette */}
                  <div
                    onClick={() => {
                      soundEffects.tactileClick();
                      setShowcaseStage(item.stage);
                    }}
                    className="relative rounded-2xl bg-white border border-[#E6DFD2] py-3 flex items-center justify-center cursor-pointer group"
                  >
                    <div
                      className={cn(
                        "transition-transform group-hover:scale-105",
                        !isUnlocked && "grayscale contrast-75 opacity-60"
                      )}
                    >
                      <MochiCompanion
                        stage={item.stage}
                        mood="happy"
                        className="w-32 h-32"
                      />
                    </div>
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-2.5 rounded-2xl bg-white/90 border-2 border-[#E6DFD2] shadow-sm">
                          <CozyIcon name="lock_cozy" size={28} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E]">
                      {item.title}
                    </h3>
                    <p className="text-[11px] font-display font-bold text-[#A552DB]">
                      Habitat: {item.habitat}
                    </p>
                    <p className="text-xs font-bold text-[#7A6E65] mt-1 leading-relaxed">
                      {item.lore}
                    </p>
                  </div>
                </div>

                {isUnlocked ? (
                  <div className="pt-1">
                    {isEquipped ? (
                      <TactileButton
                        variant="matcha"
                        size="sm"
                        fullWidth
                        onClick={() => setShowcaseStage(item.stage)}
                      >
                        <CozyIcon name="check_badge" size={18} />
                        Sedang Dipasang di Kamar
                      </TactileButton>
                    ) : (
                      <TactileButton
                        variant="honey"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setShowcaseStage(item.stage);
                          equipMochiStage(item.stage);
                        }}
                      >
                        Pasang di Kamar (Equip)
                      </TactileButton>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <ChunkyProgressBar
                      value={userProfile.xp}
                      max={item.requiredXp}
                      variant="sky"
                      label={`Syarat Buka: Lv.${item.minLevel}`}
                      showFraction
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CozyCard>

      {/* 3. Special Titles / Gelar Kehormatan unlocked from Achievement Badges */}
      <CozyCard tone="vanilla" className="space-y-3.5">
        <div className="flex items-center gap-2.5">
          <CozyIcon name="crown_sultan" size={28} />
          <div>
            <h2 className="font-display text-lg font-extrabold text-[#3D352E]">
              Koleksi Gelar Kehormatan Mochi
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
                  "p-3 rounded-2xl text-left border-2 transition-all flex items-center justify-between gap-2",
                  isSelected
                    ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] cursor-pointer"
                    : unlocked
                    ? "bg-white border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] hover:bg-[#EFFBE6] cursor-pointer"
                    : "bg-[#F6F0E4] border-[#E6DFD2] opacity-60 cursor-not-allowed"
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

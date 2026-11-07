"use client";

import React, { useState } from "react";
import {
  Target,
  Sparkles,
  CheckCircle2,
  Coins,
  Zap,
  Gift,
  Shield,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { AnimatedTreasureChest } from "@/components/illustrations/AdventureNodes";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export default function MissionsAndGachaPage() {
  const {
    missions,
    mysteryBoxCount,
    claimMissionReward,
    openMysteryBox,
  } = useBukuDompetStore();

  const [lastGachaResult, setLastGachaResult] = useState<string | null>(null);
  const [chestJustOpened, setChestJustOpened] = useState<boolean>(false);

  const dailyMissions = missions.filter((m) => m.mission_type === "daily");
  const weeklyMissions = missions.filter((m) => m.mission_type === "weekly");
  const challengeMissions = missions.filter(
    (m) =>
      m.mission_type === "saving_challenge" ||
      m.mission_type === "budget_challenge"
  );

  const handleClaimMission = (missionId: string) => {
    const res = claimMissionReward(missionId);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    }
  };

  const handleOpenGacha = () => {
    if (mysteryBoxCount <= 0) {
      soundEffects.tactileClick();
      return;
    }
    soundEffects.mysteryDrumroll();
    const res = openMysteryBox();
    if (res.success) {
      setChestJustOpened(true);
      setLastGachaResult(res.label);
      fireCozyConfetti(res.rewardType === "jackpot" ? "jackpot" : "combo");
      setTimeout(() => {
        setChestJustOpened(false);
      }, 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Mystery Box Gacha Arena */}
      <CozyCard tone="taro" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-white border-2 border-[#3D352E] text-[11px] font-extrabold">
              🎁 Gacha Peti Harta Mochi
            </span>
            <h1 className="font-fredoka text-xl sm:text-2xl font-bold text-[#3D352E] mt-1">
              Mystery Box Keberuntungan
            </h1>
            <p className="text-xs font-bold text-[#7A6E65]">
              Buka peti dari Checkpoint Mingguan atau setiap naik 500 XP!
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-[#FFC800] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] text-center">
            <span className="font-mono-num text-lg font-extrabold text-[#3D352E] block leading-none">
              {mysteryBoxCount}x
            </span>
            <span className="text-[10px] font-extrabold text-[#3D352E]">
              Kunci Peti
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border-2 border-[#3D352E] p-5 flex flex-col items-center text-center space-y-3">
          <div
            onClick={handleOpenGacha}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <AnimatedTreasureChest
              state={
                chestJustOpened
                  ? "opened"
                  : mysteryBoxCount > 0
                  ? "ready_shaking"
                  : "locked"
              }
              className="w-36 h-36"
            />
          </div>

          {lastGachaResult && (
            <div className="px-4 py-2 rounded-2xl bg-[#FFF7D6] border-2 border-[#3D352E] font-fredoka text-sm sm:text-base font-bold text-[#3D352E]">
              Hasil Gacha: {lastGachaResult}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full text-[11px] font-extrabold">
            <div className="p-2 rounded-xl bg-[#F7F2E7] border border-[#3D352E]">
              60%: +150~300 Poin
            </div>
            <div className="p-2 rounded-xl bg-[#FFF7D6] border border-[#3D352E]">
              25%: +500 Poin
            </div>
            <div className="p-2 rounded-xl bg-[#E0F4FF] border border-[#3D352E]">
              10%: 🧊 1x Freeze
            </div>
            <div className="p-2 rounded-xl bg-[#E5F9D7] border border-[#3D352E]">
              5%: 🏆 +1.500 Poin!
            </div>
          </div>

          <TactileButton
            variant={mysteryBoxCount > 0 ? "honey" : "cream"}
            size="lg"
            fullWidth
            disabled={mysteryBoxCount <= 0}
            onClick={handleOpenGacha}
          >
            <Gift className="w-5 h-5" />
            {mysteryBoxCount > 0
              ? `Kocok & Buka Mystery Box Sekarang! (${mysteryBoxCount} Tersedia)`
              : "Kumpulkan 500 XP / Checkpoint untuk Peti Baru"}
          </TactileButton>
        </div>
      </CozyCard>

      {/* 2. Daily Missions */}
      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#58CC02]" />
            <h2 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E]">
              Misi Harian (Reset Tiap Hari)
            </h2>
          </div>
          <span className="text-xs font-extrabold text-[#7A6E65]">
            1 Poin = Rp 1
          </span>
        </div>

        <div className="space-y-3">
          {dailyMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={() => handleClaimMission(mission.id)}
            />
          ))}
        </div>
      </CozyCard>

      {/* 3. Weekly & Saving Challenges */}
      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#38B6FF]" />
          <div>
            <h2 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E]">
              Misi Mingguan & Tantangan Menabung
            </h2>
            <p className="text-xs font-bold text-[#7A6E65]">
              Hadiah poin jumbo untuk konsistensi mingguan & bulanan!
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[...weeklyMissions, ...challengeMissions].map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={() => handleClaimMission(mission.id)}
            />
          ))}
        </div>
      </CozyCard>
    </div>
  );
}

function MissionCard({
  mission,
  onClaim,
}: {
  mission: ReturnType<typeof useBukuDompetStore.getState>["missions"][number];
  onClaim: () => void;
}) {
  const isCompleted = mission.current_value >= mission.target_value;

  return (
    <div className="p-4 rounded-2xl border-2 border-[#3D352E] bg-[#FFFDF7] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-[#F7F2E7] border border-[#3D352E] text-[10px] font-extrabold uppercase">
              {mission.mission_type === "daily"
                ? "Harian"
                : mission.mission_type === "weekly"
                ? "Mingguan"
                : mission.mission_type === "saving_challenge"
                ? "Saving Challenge"
                : "Budget Challenge"}
            </span>
            <h3 className="font-fredoka text-base font-bold text-[#3D352E]">
              {mission.title}
            </h3>
          </div>
          <p className="text-xs font-bold text-[#7A6E65]">
            {mission.description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-[#FFC800] border-2 border-[#3D352E] font-mono-num text-xs font-extrabold flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />+{mission.reward_points} Poin
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-[#E0F4FF] border border-[#3D352E] font-mono-num text-[10px] font-extrabold flex items-center gap-0.5">
            <Zap className="w-3 h-3 text-[#1E88E5]" />+{mission.reward_xp} XP
          </span>
        </div>
      </div>

      <ChunkyProgressBar
        value={mission.current_value}
        max={mission.target_value}
        variant={isCompleted ? "matcha" : "honey"}
        showFraction
      />

      <div className="flex justify-end">
        {mission.is_claimed ? (
          <span className="px-3.5 py-2 rounded-xl bg-[#E5F9D7] border-2 border-[#3D352E] text-xs font-extrabold text-[#46A302] inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Hadiah Sudah Diklaim!
          </span>
        ) : isCompleted ? (
          <TactileButton variant="matcha" size="sm" onClick={onClaim}>
            Klaim Hadiah +{mission.reward_points} Poin! 🎉
          </TactileButton>
        ) : (
          <span className="text-xs font-extrabold text-[#7A6E65] inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Sedang Berjalan
          </span>
        )}
      </div>
    </div>
  );
}

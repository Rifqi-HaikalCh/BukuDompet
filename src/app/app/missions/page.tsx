"use client";

import React, { useState } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { AnimatedTreasureChest } from "@/components/illustrations/AdventureNodes";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
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
  const [confirmGachaOpen, setConfirmGachaOpen] = useState<boolean>(false);

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

  const executeOpenGacha = () => {
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
      <CozyConfirmModal
        open={confirmGachaOpen}
        onClose={() => setConfirmGachaOpen(false)}
        onConfirm={executeOpenGacha}
        title="Buka Peti Harta Mystery Box?"
        description={`Kamu akan menggunakan 1 Kunci Peti (Tersisa: ${mysteryBoxCount}x) untuk mengocok hadiah Poin, Perisai Streak Freeze, atau Jackpot +1.500 Poin!`}
        confirmLabel="Ya, Buka Sekarang!"
        confirmVariant="honey"
        mochiMood="proud_combo"
        badgeText="Gacha Peti Harta Mochi"
      />

      {/* 1. Mystery Box Gacha Arena */}
      <CozyCard tone="taro" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E2C6FF] text-[11px] font-display font-extrabold inline-flex items-center gap-1">
              <CozyIcon name="mystery_box" size={16} />
              Gacha Peti Harta Mochi
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] mt-1">
              Mystery Box Keberuntungan
            </h1>
            <p className="text-xs font-bold text-[#7A6E65]">
              Buka peti dari Checkpoint Mingguan atau setiap naik 500 XP!
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-[#FFC800] border-b-[4px] border-b-[#E5A400] text-center">
            <span className="font-display font-extrabold tabular-nums text-lg text-[#3D352E] block leading-none">
              {mysteryBoxCount}x
            </span>
            <span className="text-[10px] font-display font-extrabold text-[#3D352E]">
              Kunci Peti
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] p-5 flex flex-col items-center text-center space-y-3">
          <div
            onClick={() => {
              if (mysteryBoxCount > 0) {
                soundEffects.tactileClick();
                setConfirmGachaOpen(true);
              }
            }}
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
            <div className="px-4 py-2 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] font-display text-sm sm:text-base font-extrabold text-[#3D352E]">
              Hasil Gacha: {lastGachaResult}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full text-[11px] font-display font-extrabold">
            <div className="p-2 rounded-xl bg-[#F9F4EA] border border-[#E6DFD2]">
              60%: +150~300 Poin
            </div>
            <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE08D]">
              25%: +500 Poin
            </div>
            <div className="p-2 rounded-xl bg-[#EEF8FF] border border-[#BCE3FF] inline-flex items-center justify-center gap-1">
              <CozyIcon name="ice_shield" size={14} /> 10%: 1x Freeze
            </div>
            <div className="p-2 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] inline-flex items-center justify-center gap-1">
              <CozyIcon name="crown_sultan" size={14} /> 5%: +1.500 Poin!
            </div>
          </div>

          <TactileButton
            variant={mysteryBoxCount > 0 ? "honey" : "cream"}
            size="lg"
            fullWidth
            disabled={mysteryBoxCount <= 0}
            onClick={() => setConfirmGachaOpen(true)}
          >
            <CozyIcon name="mystery_box" size={22} />
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
            <CozyIcon name="missions_scroll" size={26} />
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">
              Misi Harian (Reset Tiap Hari)
            </h2>
          </div>
          <span className="text-xs font-display font-extrabold text-[#7A6E65]">
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
          <CozyIcon name="combo_sparkle" size={26} animated />
          <div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">
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
    <div className="p-4 rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-[#FFFDF9] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-[#F9F4EA] border border-[#E6DFD2] text-[10px] font-display font-extrabold uppercase">
              {mission.mission_type === "daily"
                ? "Harian"
                : mission.mission_type === "weekly"
                ? "Mingguan"
                : mission.mission_type === "saving_challenge"
                ? "Saving Challenge"
                : "Budget Challenge"}
            </span>
            <h3 className="font-display text-base font-extrabold text-[#3D352E]">
              {mission.title}
            </h3>
          </div>
          <p className="text-xs font-bold text-[#7A6E65]">
            {mission.description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-[#FFC800] border-b-[3px] border-b-[#E5A400] font-display tabular-nums text-xs font-extrabold flex items-center gap-1">
            <CozyIcon name="coin_rupiah" size={16} />+{mission.reward_points}{" "}
            Poin
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-[#EEF8FF] border border-[#BCE3FF] font-display tabular-nums text-[10px] font-extrabold flex items-center gap-1">
            <CozyIcon name="xp_star" size={14} />+{mission.reward_xp} XP
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
          <span className="px-3.5 py-2 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#46A302] inline-flex items-center gap-1.5">
            <CozyIcon name="check_badge" size={18} /> Hadiah Sudah Diklaim!
          </span>
        ) : isCompleted ? (
          <TactileButton variant="matcha" size="sm" onClick={onClaim}>
            <CozyIcon name="coin_rupiah" size={18} />
            Klaim Hadiah +{mission.reward_points} Poin!
          </TactileButton>
        ) : (
          <span className="text-xs font-display font-extrabold text-[#7A6E65] inline-flex items-center gap-1">
            <CozyIcon name="missions_scroll" size={16} /> Sedang Berjalan
          </span>
        )}
      </div>
    </div>
  );
}

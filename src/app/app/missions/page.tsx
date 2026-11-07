"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { CASTE_STAGE_TARGETS } from "@/lib/spending-detective";
import { CASTE_META } from "@/components/illustrations/PetAvatarSystem";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export default function MissionsPage() {
  const {
    activeProfileId,
    profiles,
    missions,
    claimMissionReward,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.id === activeProfileId && p.role === "user") ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const currentStage = userProfile.currentStage || 1;
  const stageReq = CASTE_STAGE_TARGETS[currentStage];

  const userMissions = useMemo(
    () => missions.filter((m) => m.user_id === userProfile.id),
    [missions, userProfile.id]
  );

  const dailyMissions = userMissions.filter((m) => m.mission_type === "daily");
  const weeklyMissions = userMissions.filter(
    (m) => m.mission_type === "weekly"
  );
  const challengeMissions = userMissions.filter(
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

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      {/* 1. Hardcore Cozy Pacing Economy Overview (Single Soft Pastel Honey Hero Card) */}
      <CozyCard tone="honey" className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
          <div className="min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E5A400]" />
              Ekonomi Jangka Panjang • Kurs Tetap 1 Poin = Rp1
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] mt-1 truncate">
              Misi Konsistensi & Evaluasi Kas
            </h1>
            <p className="text-xs font-bold text-[#7A6E65]">
              Kumpulkan Poin dan Stage XP secara jujur setiap hari tanpa jalan
              pintas instan!
            </p>
          </div>

          <Link
            href="/app/shop"
            onClick={() => soundEffects.tactileClick()}
            className="shrink-0"
          >
            <TactileButton variant="matcha" size="sm">
              <ShoppingBag className="w-4 h-4" /> Buka Butik & Shop
            </TactileButton>
          </Link>
        </div>

        {/* Strict Rate Table */}
        <div className="bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2E6F00]" />
              Tabel Tarif Poin & Stage XP Resmi (Tanpa Boost Instan)
            </h2>
            <span className="text-[11px] font-display font-extrabold px-2.5 py-0.5 rounded-lg bg-[#EFFBE6] border border-[#C3EFA4] text-[#2E6F00]">
              Maks. 3 Transaksi Berpoin / Hari
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-1">
              <p className="font-display font-extrabold text-[#3D352E]">
                1. Catat Transaksi Biasa
              </p>
              <p className="font-display font-extrabold text-[#4A3500]">
                +5 Poin & +10 Stage XP
              </p>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Maks. 3 transaksi berpoin/hari
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE08D] space-y-1">
              <p className="font-display font-extrabold text-[#3D352E]">
                2. Transaksi Rinci (&ge;2 Item)
              </p>
              <p className="font-display font-extrabold text-[#4A3500]">
                +10 Poin & +20 Stage XP
              </p>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Maks. 3 transaksi berpoin/hari
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-1">
              <p className="font-display font-extrabold text-[#3D352E]">
                3. Klaim Kehadiran / Streak Harian
              </p>
              <p className="font-display font-extrabold text-[#4A3500]">
                +10 Poin & +15 Stage XP
              </p>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                1x per hari (termasuk Rp0 Jajan)
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] space-y-1">
              <p className="font-display font-extrabold text-[#3D352E]">
                4. Misi Harian (3 Misi/Hari)
              </p>
              <p className="font-display font-extrabold text-[#4A3500]">
                +15 Poin & +25 Stage XP
              </p>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Hadiah per 1 misi harian selesai
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] space-y-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-display font-extrabold text-[#2E6F00]">
                  5. Misi Evaluasi Mingguan & Tantangan Konsistensi
                </p>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-[#C3EFA4] font-display font-extrabold text-[#2E6F00]">
                  +150 Poin & +120 Stage XP
                </span>
              </div>
              <p className="text-[11px] font-bold text-[#3D352E]">
                Menjaga pengeluaran tetap di bawah batas aman DSSL dan menabung
                disiplin sepanjang minggu.
              </p>
            </div>
          </div>

          {/* Current Caste Progress Bar Summary */}
          <div className="pt-2 border-t border-[#E6DFD2] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChunkyProgressBar
              value={userProfile.stageXp}
              max={stageReq.nextStageXpTarget}
              variant="sky"
              label={`Progres Kasta #${currentStage} (${CASTE_META[currentStage].name}) — Stage XP`}
              showFraction
            />
            <ChunkyProgressBar
              value={userProfile.stageRecordedDays}
              max={stageReq.nextStageDaysTarget}
              variant="matcha"
              label="Syarat Hari Mencatat di Kasta Ini"
              showFraction
            />
          </div>
        </div>
      </CozyCard>

      {/* 2. Daily Missions (Neutral White Card) */}
      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CozyIcon name="missions_scroll" size={26} />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                Misi Harian (3 Misi • Reset Tiap Hari)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Setiap misi harian memberikan +15 Poin & +25 Stage XP
              </p>
            </div>
          </div>
          <span className="text-xs font-display font-extrabold text-[#4A3500] bg-[#FFFBEB] px-2.5 py-1 rounded-xl border border-[#FDE08D] shrink-0">
            +15 Poin / Misi
          </span>
        </div>

        <div className="space-y-3 min-w-0">
          {dailyMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={() => handleClaimMission(mission.id)}
            />
          ))}
        </div>
      </CozyCard>

      {/* 3. Weekly & Saving Challenges (Neutral White Card) */}
      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CozyIcon name="combo_sparkle" size={26} animated />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                Misi Evaluasi Mingguan & Tantangan Menabung
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Selesaikan evaluasi mingguan untuk klaim +150 Poin & +120 Stage
                XP!
              </p>
            </div>
          </div>
          <span className="text-xs font-display font-extrabold text-[#2E6F00] bg-[#EFFBE6] px-2.5 py-1 rounded-xl border border-[#C3EFA4] shrink-0">
            +150 Poin / Evaluasi
          </span>
        </div>

        <div className="space-y-3 min-w-0">
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
    <div className="p-4 rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-white space-y-3 min-w-0 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[10px] font-display font-extrabold uppercase text-[#3D352E]">
              {mission.mission_type === "daily"
                ? "Misi Harian"
                : mission.mission_type === "weekly"
                ? "Evaluasi Mingguan"
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
          <span className="px-2.5 py-1 rounded-xl bg-[#FFC800] border-b-[3px] border-b-[#E5A400] text-[#4A3500] font-display tabular-nums text-xs font-extrabold flex items-center gap-1">
            <CozyIcon name="coin_rupiah" size={16} />+{mission.reward_points}{" "}
            Poin
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-[#E3F4FF] border border-[#9AD2FF] text-[#1565C0] font-display tabular-nums text-[10px] font-extrabold flex items-center gap-1">
            <CozyIcon name="xp_star" size={14} />+{mission.reward_xp} Stage XP
          </span>
        </div>
      </div>

      <ChunkyProgressBar
        value={mission.current_value}
        max={mission.target_value}
        variant={isCompleted ? "matcha" : "sky"}
        showFraction
      />

      <div className="flex justify-end">
        {mission.is_claimed ? (
          <span className="px-3.5 py-2 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00] inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Hadiah Sudah Diklaim!
          </span>
        ) : isCompleted ? (
          /* Honey Gold Exclusive for Claim Mission Reward per Tugas 1.2 */
          <TactileButton variant="honey" size="sm" onClick={onClaim}>
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

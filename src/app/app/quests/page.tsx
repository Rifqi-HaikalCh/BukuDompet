"use client";

/**
 * /app/quests — gabungan Misi + Hadiah (Versi 5.0).
 * 1) Dompet Poin & Pencairan  2) Misi Harian/Mingguan  3) Etalase Medali & Gelar  4) Panduan Panen.
 */
import React from "react";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { useQuestState } from "@/lib/use-quest-state";
import { GROWTH_STAGE_TARGETS } from "@/lib/spending-detective";
import { GROWTH_STAGE_META } from "@/components/illustrations/PetAvatarSystem";
import { CozyCard, ChunkyProgressBar } from "@/components/ui/CozyPrimitives";
import { PointsWalletSection } from "@/components/quests/PointsWalletSection";
import { MissionsSection } from "@/components/quests/MissionsSection";
import { MedalShowcase } from "@/components/quests/MedalShowcase";
import { HarvestGuide } from "@/components/quests/HarvestGuide";
import { SchoolArcadeHub } from "@/components/schoolchild/SchoolArcadeHub";

export default function QuestsPage() {
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const currentRole = useBukuDompetStore((s) => s.currentRole);
  const monitoredUserId = useBukuDompetStore((s) => s.monitoredUserId);
  const profiles = useBukuDompetStore((s) => s.profiles);

  const profile =
    (isChildRole(currentRole)
      ? profiles.find((p) => p.id === activeProfileId && isChildRole(p.role))
      : profiles.find((p) => p.id === monitoredUserId && isChildRole(p.role))) ||
    profiles.find((p) => isChildRole(p.role)) ||
    profiles[0];

  const state = useQuestState(profile);
  const stage = profile.currentStage || 1;
  const req = GROWTH_STAGE_TARGETS[stage];

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      <PointsWalletSection profile={profile} />

      <CozyCard tone="white" className="space-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug break-words">Misi, Medali & Hadiah</h1>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
            Kumpulkan Poin dan Stage XP secara jujur setiap hari. {state.claimableCount + state.claimableMedals > 0 ? `Ada ${state.claimableCount + state.claimableMedals} hadiah siap diklaim!` : ""}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChunkyProgressBar
            value={profile.stageXp}
            max={req.nextStageXpTarget}
            variant="sky"
            label={`Progres Fase #${stage} (${GROWTH_STAGE_META[stage].name}) — Stage XP`}
            showFraction
          />
          <ChunkyProgressBar value={profile.stageRecordedDays} max={req.nextStageDaysTarget} variant="matcha" label="Syarat Hari Mencatat di Fase Ini" showFraction />
        </div>
      </CozyCard>

      <MissionsSection profile={profile} state={state} />
      {profile.role === "schoolchild" && <SchoolArcadeHub profile={profile} />}
      <MedalShowcase profile={profile} state={state} />
      <HarvestGuide isKid={profile.role === "schoolchild"} />
    </div>
  );
}

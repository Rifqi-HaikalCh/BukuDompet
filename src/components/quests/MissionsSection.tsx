"use client";

/**
 * Bagian 2 /app/quests — Misi Harian & Mingguan.
 * Setiap misi menampilkan medali yang ikut maju saat misi itu dikerjakan.
 */
import React from "react";
import { CheckCircle2 } from "@/components/illustrations/UiGlyphs";
import { useFamilyStore } from "@/store/useFamilyStore";
import type { ProfileData } from "@/store/useBukuDompetStore";
import type { QuestState } from "@/lib/use-quest-state";
import { MEDAL_BY_ID, MEDAL_TIER_LABEL, type ActiveQuest } from "@/lib/quest-engine";
import { MedalBadge } from "@/components/illustrations/PraiseBadges";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { CozyCard, TactileButton, ChunkyProgressBar } from "@/components/ui/CozyPrimitives";
import { notify } from "@/lib/notify";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

function QuestCard({ quest, profile, audience }: { quest: ActiveQuest; profile: ProfileData; audience: QuestState["audience"] }) {
  const claimQuest = useFamilyStore((s) => s.claimQuest);
  const medal = MEDAL_BY_ID[quest.def.medalId];

  const onClaim = () => {
    const res = claimQuest({ profileId: profile.id, audience, claimKey: quest.claimKey });
    // Berhasil: toast hadiah dari store sudah tampil. Gagal: tampilkan alasannya.
    if (!res.success) notify.warn("Belum bisa diklaim", res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.detectiveBuzz();
    }
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-white space-y-3 min-w-0 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="space-y-1 min-w-0">
          <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">{quest.def.title}</h3>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">{quest.def.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-[#FFC800] border-b-[3px] border-b-[#E5A400] text-[#4A3500] font-display tabular-nums text-xs font-extrabold flex items-center gap-1">
            <CozyIcon name="coin_rupiah" size={16} />+{quest.rewardPoints} Poin
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-[#E3F4FF] border border-[#9AD2FF] text-[#1565C0] font-display tabular-nums text-[10px] font-extrabold flex items-center gap-1">
            <CozyIcon name="xp_star" size={14} />+{quest.rewardXp} Stage XP
          </span>
        </div>
      </div>

      {medal && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] px-2.5 py-1.5 min-w-0">
          <MedalBadge tier={medal.tier} glyph={medal.glyph} title={medal.title} earned className="w-9 h-9 shrink-0" />
          <p className="text-[11px] font-bold text-[#3D352E] leading-snug break-words">
            Misi ini menambah progres medali <span className="font-display font-extrabold">{medal.title}</span> ({MEDAL_TIER_LABEL[medal.tier]})
          </p>
        </div>
      )}

      <ChunkyProgressBar value={Math.min(quest.value, quest.target)} max={quest.target} variant={quest.done ? "matcha" : "sky"} showFraction />

      <div className="flex items-center justify-end gap-2 flex-wrap">
        {quest.claimed ? (
          <span className="px-3.5 py-2 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00] inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Hadiah Sudah Diklaim!
          </span>
        ) : quest.done ? (
          <TactileButton variant="honey" size="sm" onClick={onClaim}>
            <CozyIcon name="coin_rupiah" size={18} />
            Klaim Hadiah +{quest.rewardPoints} Poin!
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

export function MissionsSection({ profile, state }: { profile: ProfileData; state: QuestState }) {
  return (
    <div className="space-y-5 min-w-0">
      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CozyIcon name="missions_scroll" size={26} />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">Misi Harian (3 Misi • Berganti Tiap Hari)</h2>
              <p className="text-xs font-bold text-[#7A6E65]">Setiap misi harian memberi +15 Poin & +25 Stage XP</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 min-w-0">
          {state.daily.map((q) => (
            <QuestCard key={q.claimKey} quest={q} profile={profile} audience={state.audience} />
          ))}
        </div>
      </CozyCard>

      <CozyCard tone="white" className="space-y-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <CozyIcon name="combo_sparkle" size={26} animated />
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">Misi Mingguan (2 Misi • Berganti Tiap Senin)</h2>
            <p className="text-xs font-bold text-[#7A6E65]">Setiap misi mingguan memberi +150 Poin & +120 Stage XP</p>
          </div>
        </div>
        <div className="space-y-3 min-w-0">
          {state.weekly.map((q) => (
            <QuestCard key={q.claimKey} quest={q} profile={profile} audience={state.audience} />
          ))}
        </div>
      </CozyCard>
    </div>
  );
}

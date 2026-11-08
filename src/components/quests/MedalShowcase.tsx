"use client";

/**
 * Bagian 3 /app/quests — Etalase Medali & Gelar.
 * Setiap medali: lambang bertingkat, syarat, progres, hadiah tonggak, dan tombol pasang gelar.
 */
import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useMemo, useState } from "react";
import { useBukuDompetStore, type ProfileData } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import type { QuestState } from "@/lib/use-quest-state";
import { MEDAL_TIER_LABEL, type MedalProgress } from "@/lib/quest-engine";
import { MedalBadge } from "@/components/illustrations/PraiseBadges";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { CozyCard, TactileButton, ChunkyProgressBar } from "@/components/ui/CozyPrimitives";
import { notify } from "@/lib/notify";
import { DEFAULT_TITLE_ID, MEDAL_TITLE_ID } from "@/lib/badge-catalog";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type Filter = "all" | "claimable" | "earned" | "locked";

const TIER_CHIP: Record<MedalProgress["def"]["tier"], string> = {
  bronze: "bg-[#FCEBDD] border-[#E9B98F] text-[#7A4420]",
  silver: "bg-[#EEF2F6] border-[#C9D3DE] text-[#475569]",
  gold: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]",
  diamond: "bg-[#E8F7FF] border-[#9AD2FF] text-[#1565C0]",
};

function MedalCard({ progress, profile }: { progress: MedalProgress; profile: ProfileData }) {
  const equipBadge = useBukuDompetStore((s) => s.equipBadge);
  const claimed = useFamilyStore((s) => Boolean(s.medalClaims[`${profile.id}:${progress.def.id}`]));
  const claimMedalReward = useFamilyStore((s) => s.claimMedalReward);
  const { def, earned } = progress;
  const titleId = MEDAL_TITLE_ID(def.id);
  const wearing = (profile.equippedTitleId ?? DEFAULT_TITLE_ID) === titleId;

  return (
    <div
      className={cn(
        "p-3.5 rounded-3xl border-2 flex flex-col items-center text-center gap-2 min-w-0",
        earned ? "bg-white border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4]" : "bg-[#F7F3EB] border-[#E6DFD2]"
      )}
    >
      <MedalBadge tier={def.tier} glyph={def.glyph} title={def.title} earned={earned} className="w-28 h-28" />
      <div className="space-y-1 min-w-0 w-full">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <h3 className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">{def.title}</h3>
          <span className={cn("text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full border", TIER_CHIP[def.tier])}>{MEDAL_TIER_LABEL[def.tier]}</span>
        </div>
        <p className="text-[11px] font-bold text-[#7A6E65] leading-snug break-words">{def.description}</p>
        <p className="text-[11px] font-display font-extrabold text-[#3D352E] leading-snug break-words">Syarat: {def.requirementLabel}</p>
      </div>

      <div className="w-full">
        <ChunkyProgressBar value={Math.min(progress.value, def.threshold)} max={def.threshold} variant={earned ? "matcha" : "sky"} showFraction />
      </div>

      <p className="text-[11px] font-bold text-[#4A3500] bg-[#FFFBEB] border border-[#FDE08D] rounded-xl px-2.5 py-1 tabular-nums">
        Hadiah tonggak: +{def.rewardPoints} Poin, +{def.rewardXp} Stage XP & Gelar &ldquo;{def.title}&rdquo;
      </p>

      <div className="flex items-center justify-center gap-2 flex-wrap w-full">
        {earned && !claimed && (
          <TactileButton
            variant="honey"
            size="sm"
            onClick={() => {
              const res = claimMedalReward(profile.id, def.id);
              if (!res.success) notify.warn("Belum bisa diklaim", res.message);
              if (res.success) {
                soundEffects.comboFanfare();
                fireCozyConfetti("jackpot");
              }
            }}
          >
            <CozyIcon name="coin_rupiah" size={16} /> Klaim Hadiah
          </TactileButton>
        )}
        {earned && claimed && (
          <span className="px-2.5 py-1 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] text-[11px] font-display font-extrabold text-[#2E6F00]"><GlyphInline name="check_circle" /> Hadiah Diklaim</span>
        )}
        {earned && claimed && (
          <button
            type="button"
            disabled={wearing}
            onClick={() => {
              soundEffects.tactileClick();
              notify.result(equipBadge(profile.id, { titleId }), `Gelar "${def.title}" terpasang`, "Belum bisa dipasang");
            }}
            className={cn(
              "px-2.5 py-1 rounded-xl border-2 text-[11px] font-display font-extrabold cursor-pointer",
              wearing ? "bg-[#F8F0FF] border-[#E2C6FF] text-[#8A3FC2] cursor-default" : "bg-white border-[#E2C6FF] text-[#8A3FC2] hover:bg-[#F8F0FF]"
            )}
          >
            {wearing ? <><GlyphInline name="crown" /> Gelar Terpasang</> : "Pasang Gelar"}
          </button>
        )}
        {!earned && (
          <span className="px-2.5 py-1 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#7A6E65] inline-flex items-center gap-1">
            <CozyIcon name="lock_cozy" size={13} /> Terkunci
          </span>
        )}
      </div>
    </div>
  );
}

export function MedalShowcase({ profile, state }: { profile: ProfileData; state: QuestState }) {
  const medalClaims = useFamilyStore((s) => s.medalClaims);
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    return state.medals.filter((m) => {
      const claimed = Boolean(medalClaims[`${profile.id}:${m.def.id}`]);
      if (filter === "claimable") return m.earned && !claimed;
      if (filter === "earned") return m.earned;
      if (filter === "locked") return !m.earned;
      return true;
    });
  }, [state.medals, medalClaims, profile.id, filter]);

  const families = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, MedalProgress[]>();
    for (const m of list) {
      if (!map.has(m.def.family)) {
        map.set(m.def.family, []);
        order.push(m.def.family);
      }
      map.get(m.def.family)!.push(m);
    }
    return order.map((f) => ({ family: f, items: map.get(f)! }));
  }, [list]);

  const earnedCount = state.medals.filter((m) => m.earned).length;

  return (
    <CozyCard tone="white" className="space-y-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <CozyIcon name="crown_sultan" size={30} className="shrink-0" />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">Etalase Medali & Gelar</h2>
          <p className="text-xs font-bold text-[#7A6E65]">
            Terbuka {earnedCount} dari {state.medals.length} medali • Klaim hadiah tonggak dan pasang gelar kehormatanmu
          </p>
        </div>
      </div>

      <ChipScroller label="Saring medali" watch={filter}>
        {(
          [
            { id: "all", label: "Semua" },
            { id: "claimable", label: `Siap Klaim (${state.claimableMedals})` },
            { id: "earned", label: "Diraih" },
            { id: "locked", label: "Terkunci" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => {
              soundEffects.tactileClick();
              setFilter(f.id);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full border-2 text-xs font-display font-extrabold cursor-pointer",
              filter === f.id ? "bg-[#38B6FF] border-[#1E88E5] text-white" : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFDF9]"
            )}
          >
            {f.label}
          </button>
        ))}
      </ChipScroller>

      {families.length === 0 && <p className="text-sm font-bold text-[#7A6E65] py-6 text-center">Tidak ada medali di kategori ini.</p>}

      {families.map(({ family, items }) => (
        <section key={family} aria-label={family} className="space-y-2.5 min-w-0">
          <h3 className="font-display text-sm font-extrabold text-[#8A3FC2] uppercase tracking-wider">{family}</h3>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
            {items.map((m) => (
              <MedalCard key={m.def.id} progress={m} profile={profile} />
            ))}
          </div>
        </section>
      ))}
    </CozyCard>
  );
}

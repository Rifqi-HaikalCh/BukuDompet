"use client";

/**
 * Arcade Sekolah (Versi 5.0) — 24 mode dalam 4 kategori untuk Anak SD.
 * Hasil direkam lewat `recordArcadePlay`; hadiah Poin diklaim lewat `claimArcadeReward`
 * (lulus >= 60%, maksimal 2 klaim per hari).
 */
import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useMemo, useState } from "react";
import { useFamilyStore } from "@/store/useFamilyStore";
import type { ProfileData } from "@/store/useBukuDompetStore";
import {
  ARCADE_CATEGORIES,
  ARCADE_MODES,
  ARCADE_MODE_BY_ID,
  ARCADE_PASS_RATIO,
  type ArcadeModeDef,
} from "@/lib/arcade-modes";
import { ARCADE_CLAIM_POINTS, ARCADE_CLAIM_XP, ARCADE_DAILY_CLAIM_LIMIT, type ArcadeCategoryId, type ArcadePlay } from "@/lib/family-types";
import { localDateStr } from "@/lib/dates";
import { CozyCard, TactileButton } from "@/components/ui/CozyPrimitives";
import { CozySheet } from "@/components/ui/CozySheet";
import { fireCozyConfetti, soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";
import {
  BreathingExercise,
  ChoiceQuiz,
  KindnessChecklist,
  MemoryMatch,
  OrderChronology,
  SentenceBuilder,
  ThankYouCard,
  ThreeWordStory,
  type EngineProps,
} from "./arcade-engines";

function Engine({ mode, ...props }: EngineProps & { mode: ArcadeModeDef }) {
  switch (mode.engine) {
    case "sentence":
      return <SentenceBuilder {...props} />;
    case "threeword":
      return <ThreeWordStory {...props} />;
    case "breath":
      return <BreathingExercise {...props} />;
    case "kindness":
      return <KindnessChecklist {...props} />;
    case "thanks":
      return <ThankYouCard {...props} />;
    case "memory":
      return <MemoryMatch {...props} />;
    case "order":
      return <OrderChronology {...props} />;
    default:
      return <ChoiceQuiz {...props} />;
  }
}

interface Outcome {
  score: number;
  total: number;
  passed: boolean;
  play: ArcadePlay;
}

export function SchoolArcadeHub({ profile }: { profile: ProfileData }) {
  const plays = useFamilyStore((s) => s.arcadePlays);
  const recordArcadePlay = useFamilyStore((s) => s.recordArcadePlay);
  const claimArcadeReward = useFamilyStore((s) => s.claimArcadeReward);

  const [category, setCategory] = useState<ArcadeCategoryId>("language");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [claimMsg, setClaimMsg] = useState("");

  const today = localDateStr();
  const mine = useMemo(() => plays.filter((p) => p.userId === profile.id), [plays, profile.id]);
  const claimedToday = mine.filter((p) => p.date === today && p.rewardClaimed).length;
  const claimsLeft = Math.max(0, ARCADE_DAILY_CLAIM_LIMIT - claimedToday);
  const modes = ARCADE_MODES.filter((m) => m.category === category);
  const activeMode = activeId ? ARCADE_MODE_BY_ID[activeId] : null;
  const livePlay = outcome ? mine.find((p) => p.id === outcome.play.id) ?? outcome.play : null;

  const seed = activeMode ? `${profile.id}|${activeMode.id}|${today}|${mine.filter((p) => p.modeId === activeMode.id).length}|${round}` : "";

  const open = (id: string) => {
    setActiveId(id);
    setOutcome(null);
    setClaimMsg("");
    setRound((r) => r + 1);
  };

  const close = () => {
    setActiveId(null);
    setOutcome(null);
    setClaimMsg("");
  };

  const finish = (score: number, total: number) => {
    if (!activeMode) return;
    const passed = total > 0 && score / total >= ARCADE_PASS_RATIO;
    const play = recordArcadePlay({
      userId: profile.id,
      modeId: activeMode.id,
      category: activeMode.category,
      score,
      total,
      passed,
    });
    setOutcome({ score, total, passed, play });
    if (passed) {
      soundEffects.coinChime();
      fireCozyConfetti();
    }
  };

  const claim = () => {
    if (!outcome) return;
    const res = claimArcadeReward(outcome.play.id);
    setClaimMsg(res.message);
    if (res.success) fireCozyConfetti();
  };

  const retry = () => {
    setOutcome(null);
    setClaimMsg("");
    setRound((r) => r + 1);
  };

  return (
    <CozyCard tone="white" className="space-y-4 min-w-0">
      <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words"><GlyphInline name="gamepad" /> Arcade Sekolah</h2>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
            24 permainan belajar. Lulus minimal 60% untuk membuka hadiah Poin.
          </p>
        </div>
        <span
          className={cn(
            "px-3 py-1.5 rounded-2xl border-2 text-xs font-display font-extrabold tabular-nums shrink-0",
            claimsLeft > 0 ? "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]"
          )}
        >
          Klaim hari ini: {claimedToday}/{ARCADE_DAILY_CLAIM_LIMIT}
        </span>
      </div>

      <ChipScroller label="Kategori arcade" watch={category}>
        {ARCADE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "px-3.5 py-2 rounded-2xl border-2 border-b-[4px] font-display text-xs font-extrabold leading-snug cursor-pointer whitespace-nowrap",
              category === c.id ? c.tone : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65]"
            )}
          >
            <GlyphInline name={c.icon} className="mr-1" />
            {c.label}
          </button>
        ))}
      </ChipScroller>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {modes.map((m) => {
          const best = mine.filter((p) => p.modeId === m.id).reduce<ArcadePlay | null>((b, p) => (!b || p.score / Math.max(1, p.total) > b.score / Math.max(1, b.total) ? p : b), null);
          const count = mine.filter((p) => p.modeId === m.id).length;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => open(m.id)}
              className="text-left rounded-2xl border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] bg-white p-3 space-y-1.5 min-w-0 cursor-pointer hover:bg-[#FFFDF9] active:border-b-[2px] active:translate-y-[3px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GlyphIcon name={m.icon} size={30} />
                <p className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words min-w-0">{m.title}</p>
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65] leading-snug break-words">{m.blurb}</p>
              <p className="text-[10px] font-display font-extrabold tabular-nums text-[#8A3FC2]">
                {count === 0 ? "Belum pernah dimainkan" : `Terbaik ${best ? `${best.score}/${best.total}` : "-"} • ${count}x main`}
              </p>
            </button>
          );
        })}
      </div>

      <CozySheet
        open={activeMode !== null}
        onOpenChange={(v) => {
          if (!v) close();
        }}
        title={activeMode?.title ?? "Arcade"}
        description={activeMode?.blurb}
        icon={activeMode ? <GlyphIcon name={activeMode.icon} size={30} /> : undefined}
        maxWidthClass="md:max-w-xl"
      >
        {activeMode && !outcome && <Engine key={`${activeMode.id}-${round}`} mode={activeMode} modeId={activeMode.id} seed={seed} onFinish={finish} />}

        {activeMode && outcome && livePlay && (
          <div className="space-y-4 text-center py-2">
            <div className="flex justify-center" aria-hidden="true"><GlyphIcon name={outcome.passed ? "trophy" : "sprout"} size={72} /></div>
            <p className="font-display text-xl font-extrabold text-[#3D352E]">
              {outcome.passed ? "Kamu Lulus!" : "Hampir Berhasil!"}
            </p>
            <p className="font-display text-3xl font-extrabold text-[#58CC02] tabular-nums">
              {outcome.score}/{outcome.total}
            </p>
            <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
              {outcome.passed
                ? "Skormu cukup untuk membuka hadiah. Klaim Poin dan Stage XP-mu di bawah ini."
                : "Skor minimal 60% untuk membuka hadiah. Coba lagi, soalnya akan berganti."}
            </p>
            {claimMsg && (
              <p role="status" className="p-2.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] text-xs font-bold text-[#4A3500] break-words">
                {claimMsg}
              </p>
            )}
            <div className="grid gap-2">
              {outcome.passed && (
                <TactileButton variant="honey" fullWidth disabled={livePlay.rewardClaimed || claimsLeft === 0} onClick={claim}>
                  {livePlay.rewardClaimed ? "Hadiah Sudah Diklaim" : claimsLeft === 0 ? "Batas Klaim Hari Ini Tercapai" : <>Klaim +{ARCADE_CLAIM_POINTS} Poin &amp; +{ARCADE_CLAIM_XP} Stage XP <GlyphInline name="gift" /></>}
                </TactileButton>
              )}
              <div className="grid grid-cols-2 gap-2">
                <TactileButton variant="cream" onClick={retry}>
                  Main Lagi
                </TactileButton>
                <TactileButton variant="matcha" onClick={close}>
                  Selesai
                </TactileButton>
              </div>
            </div>
          </div>
        )}
      </CozySheet>
    </CozyCard>
  );
}

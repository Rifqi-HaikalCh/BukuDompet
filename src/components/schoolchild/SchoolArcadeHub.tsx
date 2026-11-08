"use client";

/**
 * Arcade Sekolah (Versi 5.2) — 24 mode dalam 4 kategori, 5 level kesulitan per mode.
 * - Level & ronde yang sedang berjalan tersimpan (lanjut dari soal terakhir, tidak mengulang).
 * - Hasil ronde lulus menambah Poin/Stage XP dan mengabari Beranda Keluarga lewat `finishArcadeRound`.
 * - Batas ronde & menit per hari (diatur Wali) menjaga waktu layar; sisa jatah selalu terlihat.
 * - Musik arcade (lebih riang) menyala selama tantangan dan kembali ke musik santai setelahnya.
 */
import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFamilyStore, type ArcadeRoundResult } from "@/store/useFamilyStore";
import type { ProfileData } from "@/store/useBukuDompetStore";
import {
  ARCADE_CATEGORIES,
  ARCADE_MODES,
  ARCADE_MODE_BY_ID,
  type ArcadeModeDef,
} from "@/lib/arcade-modes";
import {
  ARCADE_CLEARS_TO_LEVEL_UP,
  ARCADE_DAILY_REWARD_LIMIT,
  ARCADE_LEVEL_NAMES,
  ARCADE_LEVEL_POINTS,
  ARCADE_LEVEL_XP,
  ARCADE_MAX_LEVEL,
  type ArcadeCategoryId,
  type ArcadeSession,
} from "@/lib/family-types";
import { dailyOf, emptyProgress, formatClock, limitStatus, limitsOf, progressKey } from "@/lib/arcade-progress";
import { localDateStr } from "@/lib/dates";
import { cozyBgm, useCozyBgm } from "@/lib/cozy-bgm";
import { ChunkyProgressBar, CozyCard, TactileButton } from "@/components/ui/CozyPrimitives";
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

type Phase = "start" | "play" | "result" | "timeup";

interface RoundOutcome {
  score: number;
  total: number;
  result: ArcadeRoundResult;
}

const LEVEL_TONES = [
  "",
  "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]",
  "bg-[#E8F6FF] border-[#B5E2FF] text-[#0B5E94]",
  "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]",
  "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]",
  "bg-[#F8F0FF] border-[#E2C6FF] text-[#8A3FC2]",
] as const;

export function SchoolArcadeHub({ profile }: { profile: ProfileData }) {
  const userId = profile.id;
  const progressMap = useFamilyStore((s) => s.arcadeProgress);
  const sessions = useFamilyStore((s) => s.arcadeSessions);
  const dailyMap = useFamilyStore((s) => s.arcadeDaily);
  const limitsMap = useFamilyStore((s) => s.arcadeLimits);
  const startArcadeRound = useFamilyStore((s) => s.startArcadeRound);
  const saveArcadeStep = useFamilyStore((s) => s.saveArcadeStep);
  const finishArcadeRound = useFamilyStore((s) => s.finishArcadeRound);
  const addArcadeSeconds = useFamilyStore((s) => s.addArcadeSeconds);
  const { isPlaying: musicOn, toggleBgm } = useCozyBgm();

  const [category, setCategory] = useState<ArcadeCategoryId>("language");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("start");
  const [pickedLevel, setPickedLevel] = useState(1);
  const [session, setSession] = useState<ArcadeSession | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [liveLeft, setLiveLeft] = useState<number | null>(null);

  const today = localDateStr();
  const daily = dailyOf(dailyMap[userId], today);
  const limits = limitsOf(limitsMap[userId]);
  const status = limitStatus(daily, limits);
  const activeMode = activeId ? ARCADE_MODE_BY_ID[activeId] : null;
  const modes = ARCADE_MODES.filter((m) => m.category === category);

  const progressOf = useCallback((modeId: string) => progressMap[progressKey(userId, modeId)] ?? emptyProgress(), [progressMap, userId]);
  const participation = activeMode?.engine === "breath" || activeMode?.engine === "kindness" || activeMode?.engine === "thanks";
  const unlockedLevel = activeMode ? progressOf(activeMode.id).level : 1;
  const savedSession = activeMode ? sessions[progressKey(userId, activeMode.id)] : undefined;

  /* ── Pewaktu layar: hitung detik bermain hanya saat tab terlihat, simpan tiap 5 detik ── */
  const pendingRef = useRef(0);
  const warnedRef = useRef(false);
  useEffect(() => {
    if (phase !== "play") return;
    pendingRef.current = 0;
    warnedRef.current = false;
    const flush = () => {
      if (pendingRef.current > 0) {
        addArcadeSeconds(userId, pendingRef.current);
        pendingRef.current = 0;
      }
    };
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pendingRef.current += 1;
      if (pendingRef.current >= 5) flush();
      const st = useFamilyStore.getState();
      const left =
        limitStatus(dailyOf(st.arcadeDaily[userId], localDateStr()), limitsOf(st.arcadeLimits[userId])).secondsLeft - pendingRef.current;
      setLiveLeft(Math.max(0, left));
      if (left <= 120 && left > 0 && !warnedRef.current) {
        warnedRef.current = true;
        soundEffects.arcadeTimeWarning();
      }
      if (left <= 0) {
        flush();
        soundEffects.arcadeTryAgain();
        setPhase("timeup");
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
      flush();
    };
  }, [phase, userId, addArcadeSeconds]);

  /* ── Musik: suasana arcade selama tantangan berjalan ── */
  useEffect(() => {
    if (phase === "play" && activeId) cozyBgm.setMode("arcade");
    else cozyBgm.setMode("cozy");
  }, [phase, activeId]);
  useEffect(() => () => cozyBgm.setMode("cozy"), []);

  const open = (id: string) => {
    const key = progressKey(userId, id);
    const prog = progressMap[key] ?? emptyProgress();
    setActiveId(id);
    setOutcome(null);
    setLiveLeft(null);
    setSession(null);
    setPickedLevel(sessions[key]?.level ?? prog.level);
    setPhase("start");
  };

  const close = () => {
    setActiveId(null);
    setOutcome(null);
    setSession(null);
    setPhase("start");
  };

  const begin = () => {
    if (!activeMode) return;
    const res = startArcadeRound({ userId, modeId: activeMode.id, level: pickedLevel });
    if (!res.ok) return;
    soundEffects.arcadeStart();
    setSession(res.session);
    setLiveLeft(null);
    setRunKey((k) => k + 1);
    setPhase("play");
  };

  const onStep = useCallback(
    (answered: number, score: number) => {
      if (activeId) saveArcadeStep(userId, activeId, answered, score);
    },
    [activeId, saveArcadeStep, userId]
  );

  const onFinish = useCallback(
    (score: number, total: number) => {
      if (!activeId) return;
      const result = finishArcadeRound({ userId, modeId: activeId, score, total });
      setOutcome({ score, total, result });
      setPhase("result");
      if (result.levelUp) soundEffects.arcadeLevelUp();
      else if (result.passed) soundEffects.arcadeWin();
      else soundEffects.arcadeTryAgain();
      if (result.passed) fireCozyConfetti();
    },
    [activeId, finishArcadeRound, userId]
  );

  const modeCountToday = useMemo(() => daily.rounds, [daily.rounds]);
  const secondsShown = phase === "play" && liveLeft !== null ? liveLeft : status.secondsLeft;
  const blocked = status.blocked;
  const levelsList = Array.from({ length: ARCADE_MAX_LEVEL }, (_, i) => i + 1);

  return (
    <CozyCard tone="white" className="space-y-4 min-w-0">
      <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
            <GlyphInline name="gamepad" /> Games Belajar
          </h2>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
            24 permainan, 5 level tiap permainan. Lulus minimal 60% untuk Poin, naik level dengan lulus {ARCADE_CLEARS_TO_LEVEL_UP}x.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleBgm}
          aria-pressed={musicOn}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-b-[3px] font-display text-xs font-extrabold cursor-pointer shrink-0",
            musicOn ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9ED87A] text-[#2E6F00]" : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65]"
          )}
        >
          <GlyphInline name={musicOn ? "volume_on" : "volume_off"} />
          Musik {musicOn ? "Nyala" : "Mati"}
        </button>
      </div>

      {/* Jatah bermain hari ini */}
      <div
        className={cn(
          "rounded-2xl border-2 p-3 space-y-2.5 min-w-0",
          blocked ? "bg-[#FFF2F0] border-[#FFCDC6]" : "bg-[#FFFBEB] border-[#FDE08D]"
        )}
        aria-label="Jatah bermain hari ini"
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-display font-extrabold text-[#4A3500] tabular-nums">
              Ronde hari ini: {modeCountToday}/{limits.maxRoundsPerDay}
            </p>
            <ChunkyProgressBar value={modeCountToday} max={limits.maxRoundsPerDay} variant={status.roundsLeft === 0 ? "peach" : "honey"} />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-display font-extrabold text-[#4A3500] tabular-nums">
              <GlyphInline name="clock" /> Sisa waktu: {formatClock(secondsShown)} dari {limits.maxMinutesPerDay} menit
            </p>
            <ChunkyProgressBar value={limits.maxMinutesPerDay * 60 - secondsShown} max={limits.maxMinutesPerDay * 60} variant={status.secondsLeft === 0 ? "peach" : "sky"} />
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#7A6E65] leading-snug break-words">
          {blocked === "time"
            ? "Waktu main hari ini sudah habis. Istirahat dulu ya, besok lanjut lagi!"
            : blocked === "rounds"
              ? "Jatah ronde hari ini sudah habis. Besok kamu bisa main lagi!"
              : `Poin hadiah dibatasi ${ARCADE_DAILY_REWARD_LIMIT} ronde lulus per hari. Jatah main diatur oleh Wali.`}
        </p>
      </div>

      <ChipScroller label="Kategori game" watch={category}>
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
          const key = progressKey(userId, m.id);
          const prog = progressMap[key] ?? emptyProgress();
          const ses = sessions[key];
          const clears = prog.clears[prog.level] ?? 0;
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("px-2 py-0.5 rounded-full border-2 text-[10px] font-display font-extrabold tabular-nums", LEVEL_TONES[prog.level])}>
                  Level {prog.level} • {ARCADE_LEVEL_NAMES[prog.level]}
                </span>
                {ses && ses.index > 0 && (
                  <span className="px-2 py-0.5 rounded-full border-2 border-[#B5E2FF] bg-[#E8F6FF] text-[10px] font-display font-extrabold text-[#0B5E94] tabular-nums">
                    Lanjut: sudah {ses.index} soal
                  </span>
                )}
              </div>
              <p className="text-[10px] font-display font-extrabold tabular-nums text-[#8A3FC2]">
                {prog.level >= ARCADE_MAX_LEVEL ? "Level tertinggi tercapai" : `Lulus ${clears}/${ARCADE_CLEARS_TO_LEVEL_UP} untuk naik level`}
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
        title={activeMode?.title ?? "Games"}
        description={activeMode?.blurb}
        icon={activeMode ? <GlyphIcon name={activeMode.icon} size={30} /> : undefined}
        maxWidthClass="md:max-w-xl"
      >
        {activeMode && phase === "start" && (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <p className="font-display text-sm font-extrabold text-[#3D352E]">Pilih level</p>
              <div className="grid grid-cols-5 gap-1.5">
                {levelsList.map((l) => {
                  const locked = l > unlockedLevel;
                  return (
                    <button
                      key={l}
                      type="button"
                      disabled={locked}
                      aria-pressed={pickedLevel === l}
                      onClick={() => setPickedLevel(l)}
                      className={cn(
                        "rounded-2xl border-2 border-b-[4px] py-2 px-1 font-display text-xs font-extrabold leading-tight flex flex-col items-center gap-0.5 min-w-0",
                        locked
                          ? "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] text-[#B5A99B] cursor-not-allowed"
                          : pickedLevel === l
                            ? cn(LEVEL_TONES[l], "cursor-pointer")
                            : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65] cursor-pointer"
                      )}
                    >
                      {locked ? <GlyphInline name="lock" /> : <span className="tabular-nums text-base">{l}</span>}
                      <span className="text-[9px] sm:text-[10px] break-words">{ARCADE_LEVEL_NAMES[l]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65] leading-snug">
                Level {pickedLevel} memberi {ARCADE_LEVEL_POINTS[pickedLevel]} Poin &amp; {ARCADE_LEVEL_XP[pickedLevel]} Stage XP bila lulus. Level lebih tinggi terbuka setelah lulus
                {" "}
                {ARCADE_CLEARS_TO_LEVEL_UP}x{participation ? "." : " atau skor sempurna."}
              </p>
            </div>

            {savedSession && savedSession.index > 0 && savedSession.level === pickedLevel && (
              <p role="status" className="p-2.5 rounded-2xl bg-[#E8F6FF] border-2 border-[#B5E2FF] text-xs font-bold text-[#0B5E94] leading-snug">
                Ronde Level {savedSession.level} tadi berhenti setelah {savedSession.index} soal. Kamu akan lanjut dari sana, soal tidak diulang.
              </p>
            )}
            {savedSession && savedSession.level !== pickedLevel && (
              <p role="status" className="p-2.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] text-xs font-bold text-[#4A3500] leading-snug">
                Ada ronde Level {savedSession.level} yang belum selesai. Memilih level lain akan menggantinya.
              </p>
            )}
            {blocked && (
              <p role="status" className="p-2.5 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] text-xs font-bold text-[#8F2A1B] leading-snug">
                {blocked === "time" ? "Waktu main hari ini sudah habis. Besok lanjut lagi ya!" : "Jatah ronde hari ini sudah habis. Besok lanjut lagi ya!"}
              </p>
            )}
            <TactileButton variant="matcha" fullWidth disabled={Boolean(blocked)} onClick={begin}>
              {savedSession && savedSession.index > 0 && savedSession.level === pickedLevel ? `Lanjutkan (sudah ${savedSession.index} soal)` : `Mulai Level ${pickedLevel}`}
            </TactileButton>
          </div>
        )}

        {activeMode && phase === "play" && session && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={cn("px-2.5 py-1 rounded-full border-2 text-[11px] font-display font-extrabold tabular-nums", LEVEL_TONES[session.level])}>
                Level {session.level} • {ARCADE_LEVEL_NAMES[session.level]}
              </span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full border-2 text-[11px] font-display font-extrabold tabular-nums",
                  secondsShown <= 120 ? "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]"
                )}
                role="timer"
                aria-label="Sisa waktu bermain hari ini"
              >
                <GlyphInline name="clock" /> {formatClock(secondsShown)}
              </span>
            </div>
            <Engine
              key={`${activeMode.id}-${session.level}-${session.cursor}-${runKey}`}
              mode={activeMode}
              modeId={activeMode.id}
              level={session.level}
              seed={session.seed}
              cursor={session.cursor}
              initialIndex={session.index}
              initialScore={session.score}
              onStep={onStep}
              onFinish={onFinish}
            />
          </div>
        )}

        {activeMode && phase === "timeup" && (
          <div className="space-y-4 text-center py-2">
            <div className="flex justify-center" aria-hidden="true">
              <GlyphIcon name="clock" size={72} />
            </div>
            <p className="font-display text-xl font-extrabold text-[#3D352E]">Waktu Main Habis</p>
            <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
              Jatah main hari ini sudah penuh. Ronde tadi tersimpan, besok kamu bisa lanjut dari soal terakhir. Istirahatkan matamu dulu ya!
            </p>
            <TactileButton variant="matcha" fullWidth onClick={close}>
              Oke, Istirahat
            </TactileButton>
          </div>
        )}

        {activeMode && phase === "result" && outcome && (
          <ResultView
            outcome={outcome}
            blocked={blocked}
            onAgain={() => {
              setOutcome(null);
              setPickedLevel(outcome.result.newLevel);
              setPhase("start");
            }}
            onClose={close}
          />
        )}
      </CozySheet>
    </CozyCard>
  );
}

function ResultView({
  outcome,
  blocked,
  onAgain,
  onClose,
}: {
  outcome: RoundOutcome;
  blocked: "rounds" | "time" | null;
  onAgain: () => void;
  onClose: () => void;
}) {
  const { result, score, total } = outcome;
  return (
    <div className="space-y-4 text-center py-2">
      <div className="flex justify-center" aria-hidden="true">
        <GlyphIcon name={result.levelUp ? "star" : result.passed ? "trophy" : "sprout"} size={72} />
      </div>
      <p className="font-display text-xl font-extrabold text-[#3D352E]">
        {result.levelUp ? `Naik ke Level ${result.newLevel}!` : result.passed ? "Kamu Lulus!" : "Hampir Berhasil!"}
      </p>
      <p className="font-display text-3xl font-extrabold text-[#58CC02] tabular-nums">
        {score}/{total}
      </p>
      {result.rewarded && (
        <p role="status" className="p-2.5 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] text-sm font-display font-extrabold text-[#4A3500] tabular-nums">
          +{result.points} Poin &amp; +{result.xp} Stage XP <GlyphInline name="gift" />
        </p>
      )}
      {result.rewardCapped && (
        <p role="status" className="p-2.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] text-xs font-bold text-[#7A6E65] leading-snug">
          Kamu lulus! Tapi jatah Poin hari ini sudah penuh ({ARCADE_DAILY_REWARD_LIMIT} ronde). Kemajuan levelmu tetap tersimpan.
        </p>
      )}
      {!result.passed && (
        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Skor minimal 60% untuk lulus. Coba lagi, soalnya akan berganti.</p>
      )}
      {result.passed && (
        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Kabar baiknya sudah dikirim ke Beranda Keluarga.</p>
      )}
      {blocked && (
        <p role="status" className="p-2.5 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] text-xs font-bold text-[#8F2A1B] leading-snug">
          {blocked === "time" ? "Waktu main hari ini sudah habis. Besok lanjut lagi ya!" : "Jatah ronde hari ini sudah habis. Besok lanjut lagi ya!"}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <TactileButton variant="cream" disabled={Boolean(blocked)} onClick={onAgain}>
          Main Lagi
        </TactileButton>
        <TactileButton variant="matcha" onClick={onClose}>
          Selesai
        </TactileButton>
      </div>
    </div>
  );
}

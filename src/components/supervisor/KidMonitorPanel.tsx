"use client";

/**
 * Panel pantau Supervisor untuk Anak SD (Versi 5.0):
 * cerita harian, perkembangan emosi, tabungan celengan, dan skor game edukasi.
 */
import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useMemo, useState } from "react";
import { useBukuDompetStore, type ProfileData } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { EmotionWheelIcon, PiggyVaultIllustration, EMOTION_KEYS, EMOTION_LABEL } from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozyCard, ChunkyProgressBar, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { ARCADE_CATEGORIES, ARCADE_MODE_BY_ID } from "@/lib/arcade-modes";
import { ARCADE_LEVEL_NAMES, ARCADE_LIMIT_MINUTE_OPTIONS, ARCADE_LIMIT_ROUND_OPTIONS } from "@/lib/family-types";
import { dailyOf, formatClock, limitsOf } from "@/lib/arcade-progress";
import { STORY_CATEGORY_BY_ID } from "@/lib/story-utils";
import { addDaysStr, localDateStr, shortDateLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function KidMonitorPanel({ user }: { user: ProfileData }) {
  const stories = useFamilyStore((s) => s.stories);
  const goals = useFamilyStore((s) => s.goals);
  const plays = useFamilyStore((s) => s.arcadePlays);
  const transactions = useBukuDompetStore((s) => s.transactions);
  const arcadeDaily = useFamilyStore((s) => s.arcadeDaily);
  const arcadeLimits = useFamilyStore((s) => s.arcadeLimits);
  const arcadeProgress = useFamilyStore((s) => s.arcadeProgress);
  const setArcadeLimits = useFamilyStore((s) => s.setArcadeLimits);
  const [openStory, setOpenStory] = useState<string | null>(null);

  const myStories = useMemo(() => stories.filter((s) => s.userId === user.id), [stories, user.id]);
  const myGoals = useMemo(() => goals.filter((g) => g.userId === user.id), [goals, user.id]);
  const myPlays = useMemo(() => plays.filter((p) => p.userId === user.id), [plays, user.id]);

  const today = localDateStr();
  const monthStart = addDaysStr(today, -29);
  const monthStories = myStories.filter((s) => s.date >= monthStart);

  const emotionCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of monthStories) if (s.emotion) m[s.emotion] = (m[s.emotion] ?? 0) + 1;
    return m;
  }, [monthStories]);
  const emotionMax = Math.max(1, ...EMOTION_KEYS.map((k) => emotionCount[k] ?? 0));

  const totalSaved = useMemo(
    () => transactions.filter((t) => t.user_id === user.id && t.type === "saving").reduce((s, t) => s + Number(t.total_amount), 0),
    [transactions, user.id]
  );
  const activeGoal = myGoals.find((g) => !g.completedAt) ?? myGoals[0];
  const goalPct = activeGoal && activeGoal.targetAmount > 0 ? Math.min(100, Math.round((activeGoal.savedAmount / activeGoal.targetAmount) * 100)) : 0;

  const byCategory = useMemo(
    () =>
      ARCADE_CATEGORIES.map((c) => {
        const list = myPlays.filter((p) => p.category === c.id);
        const passed = list.filter((p) => p.passed).length;
        const best = list.reduce((m, p) => Math.max(m, p.total > 0 ? Math.round((p.score / p.total) * 100) : 0), 0);
        return { cat: c, played: list.length, passed, best };
      }),
    [myPlays]
  );
  const recentPlays = myPlays.slice(0, 6);
  const limits = limitsOf(arcadeLimits[user.id]);
  const usage = dailyOf(arcadeDaily[user.id], today);
  const topLevels = useMemo(
    () =>
      Object.entries(arcadeProgress)
        .filter(([k, v]) => k.startsWith(`${user.id}|`) && v.level > 1)
        .map(([k, v]) => ({ modeId: k.slice(user.id.length + 1), level: v.level }))
        .sort((a, b) => b.level - a.level)
        .slice(0, 4),
    [arcadeProgress, user.id]
  );
  const limitSelect =
    "px-2.5 py-1.5 rounded-xl border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] bg-white font-display text-xs font-extrabold text-[#3D352E] cursor-pointer";

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Cerita harian */}
        <CozyCard tone="white" className="p-4 space-y-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CozyIcon name="missions_scroll" size={24} />
            <h2 className="font-display text-base font-extrabold text-[#3D352E] leading-snug">Cerita Harian ({monthStories.length} dalam 30 hari)</h2>
          </div>
          {myStories.length === 0 ? (
            <p className="text-xs font-bold text-[#7A6E65]">Belum ada cerita yang ditulis.</p>
          ) : (
            <ul className="space-y-2">
              {myStories.slice(0, 6).map((s) => (
                <li key={s.id} className="rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] p-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenStory(openStory === s.id ? null : s.id)}
                    aria-expanded={openStory === s.id}
                    className="w-full flex items-center gap-2 text-left cursor-pointer min-w-0"
                  >
                    {s.emotion ? <EmotionWheelIcon emotion={s.emotion} size={28} /> : <GlyphIcon name="book_open" size={28} />}
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xs font-extrabold text-[#3D352E] leading-snug break-words">{s.title}</span>
                      <span className="block text-[10px] font-bold text-[#7A6E65]">
                        {shortDateLabel(s.date)} • {STORY_CATEGORY_BY_ID[s.category].label} • {s.wordCount} kata
                      </span>
                    </span>
                  </button>
                  {openStory === s.id && <p className="mt-2 text-xs font-bold text-[#3D352E] leading-relaxed break-words whitespace-pre-line">{s.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </CozyCard>

        {/* Emosi */}
        <CozyCard tone="white" className="p-4 space-y-3 min-w-0">
          <h2 className="font-display text-base font-extrabold text-[#3D352E] leading-snug">Perkembangan Emosi (30 Hari)</h2>
          <div className="space-y-2">
            {EMOTION_KEYS.map((k) => {
              const n = emotionCount[k] ?? 0;
              return (
                <div key={k} className="flex items-center gap-2 min-w-0">
                  <EmotionWheelIcon emotion={k} size={30} />
                  <span className="w-20 text-xs font-display font-extrabold text-[#3D352E] shrink-0">{EMOTION_LABEL[k]}</span>
                  <div className="flex-1 h-3 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] overflow-hidden">
                    <div className="h-full bg-[#CE82FF]" style={{ width: `${Math.round((n / emotionMax) * 100)}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs font-extrabold tabular-nums text-[#7A6E65]">{n}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] font-bold text-[#7A6E65] leading-relaxed">
            Bantu anak mengenali perasaannya. Bila banyak cerita sedih atau cemas, ajak ngobrol hangat.
          </p>
        </CozyCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Celengan */}
        <CozyCard tone="white" className="p-4 space-y-3 min-w-0">
          <h2 className="font-display text-base font-extrabold text-[#3D352E] leading-snug">Tabungan Celengan</h2>
          <div className="flex items-center gap-3 min-w-0">
            <PiggyVaultIllustration progressPercent={goalPct} className="w-24 h-24 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-bold text-[#7A6E65]">Total ditabung</p>
              <p className="font-display text-lg font-extrabold text-[#1565C0] tabular-nums break-words">{formatRupiah(totalSaved)}</p>
              {activeGoal ? (
                <ChunkyProgressBar value={activeGoal.savedAmount} max={activeGoal.targetAmount} variant="honey" label={activeGoal.name} showFraction />
              ) : (
                <p className="text-xs font-bold text-[#7A6E65]">Belum ada tujuan celengan.</p>
              )}
            </div>
          </div>
          {myGoals.length > 1 && (
            <ul className="text-xs font-bold text-[#3D352E] space-y-1">
              {myGoals.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <span className="break-words min-w-0">{g.name}</span>
                  <span className="tabular-nums shrink-0">{g.completedAt ? <><GlyphInline name="check_circle" /> Tercapai</> : `${formatRupiah(g.savedAmount)} / ${formatRupiah(g.targetAmount)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </CozyCard>

        {/* Game edukasi */}
        <CozyCard tone="white" className="p-4 space-y-3 min-w-0">
          <h2 className="font-display text-base font-extrabold text-[#3D352E] leading-snug">Skor Game Edukasi ({myPlays.length} permainan)</h2>
          <div className="grid grid-cols-2 gap-2">
            {byCategory.map(({ cat, played, passed, best }) => (
              <div key={cat.id} className={cn("p-2.5 rounded-2xl border-2 min-w-0", cat.tone)}>
                <p className="text-[11px] font-display font-extrabold leading-snug break-words">
                  <GlyphInline name={cat.icon} /> {cat.label}
                </p>
                <p className="text-xs font-bold tabular-nums mt-0.5">
                  Lulus {passed}/{played} • Terbaik {best}%
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] p-3 space-y-2 min-w-0">
            <p className="font-display text-xs font-extrabold text-[#4A3500] leading-snug">Batas Main Hari Ini (Screen Time)</p>
            <p className="text-xs font-bold text-[#7A6E65] tabular-nums leading-snug">
              Terpakai {usage.rounds}/{limits.maxRoundsPerDay} ronde • {formatClock(usage.seconds)} dari {limits.maxMinutesPerDay} menit
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 text-xs font-bold text-[#3D352E]">
                Maks. ronde / hari
                <select
                  className={limitSelect}
                  value={limits.maxRoundsPerDay}
                  onChange={(e) => setArcadeLimits(user.id, { ...limits, maxRoundsPerDay: Number(e.target.value) })}
                >
                  {ARCADE_LIMIT_ROUND_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} ronde
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-xs font-bold text-[#3D352E]">
                Maks. waktu / hari
                <select
                  className={limitSelect}
                  value={limits.maxMinutesPerDay}
                  onChange={(e) => setArcadeLimits(user.id, { ...limits, maxMinutesPerDay: Number(e.target.value) })}
                >
                  {ARCADE_LIMIT_MINUTE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} menit
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {topLevels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topLevels.map((t) => (
                <span key={t.modeId} className="px-2 py-1 rounded-full bg-[#F8F0FF] border-2 border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#8A3FC2] break-words">
                  {ARCADE_MODE_BY_ID[t.modeId]?.title ?? t.modeId}: Level {t.level} ({ARCADE_LEVEL_NAMES[t.level]})
                </span>
              ))}
            </div>
          )}
          {recentPlays.length > 0 && (
            <ul className="space-y-1">
              {recentPlays.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs font-bold text-[#3D352E] min-w-0">
                  <span className="break-words min-w-0">
                    {ARCADE_MODE_BY_ID[p.modeId] && <GlyphInline name={ARCADE_MODE_BY_ID[p.modeId].icon} />} {ARCADE_MODE_BY_ID[p.modeId]?.title ?? p.modeId}
                    {p.level ? <span className="text-[#8A3FC2]"> • Lv {p.level}</span> : null}
                  </span>
                  <span className={cn("tabular-nums shrink-0", p.passed ? "text-[#2E6F00]" : "text-[#C83E2B]")}>
                    {p.score}/{p.total} <GlyphInline name={p.passed ? "check" : "cross"} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CozyCard>
      </div>
    </div>
  );
}

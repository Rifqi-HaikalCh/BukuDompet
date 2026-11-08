"use client";

/**
 * Mesin permainan Arcade Sekolah (Versi 5.0, bertingkat sejak 5.2). Setiap mesin menerima `seed`,
 * `level`, dan `cursor` deterministik, melaporkan tiap soal selesai lewat `onStep` (agar bisa dilanjutkan
 * saat dibuka lagi), dan memanggil `onFinish(score, total)` sekali ketika ronde selesai.
 * Tidak ada Math.random: pengacakan memakai `seededShuffle`.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TactileButton, ChunkyProgressBar } from "@/components/ui/CozyPrimitives";
import { seededShuffle } from "@/lib/quest-engine";
import { tokenizeWords } from "@/lib/story-utils";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";
import { AnimalGlyph, BiomeGlyph, type BiomeGlyphId } from "@/components/illustrations/GlyphCreatures";
import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import {
  BREATH_CYCLES_BY_LEVEL,
  buildChoiceItems,
  buildOrderStories,
  buildSentences,
  KINDNESS_PASS_BY_LEVEL,
  KINDNESS_TASKS,
  MEMORY_PAIRS_BY_LEVEL,
  MEMORY_SYMBOLS,
  pickThreeWords,
  THANKS_MIN_BY_LEVEL,
  THANKS_RECIPIENTS,
  THREEWORD_MIN_BY_LEVEL,
  type BuildCtx,
  type ChoiceItem,
} from "./arcade-content";

export interface EngineProps {
  modeId: string;
  /** Level kesulitan 1..5. */
  level: number;
  /** Benih dasar sesi (tanpa cursor). */
  seed: string;
  /** Putaran bank soal untuk level ini. */
  cursor: number;
  /** Jumlah soal yang sudah dijawab pada sesi tersimpan (0 untuk ronde baru). */
  initialIndex: number;
  initialScore: number;
  /** Dipanggil tiap satu soal selesai dijawab: `answered` soal, `score` benar. */
  onStep: (answered: number, score: number) => void;
  onFinish: (score: number, total: number) => void;
}

const lv = (n: number) => Math.min(5, Math.max(1, Math.floor(n) || 1));

/* ───────────────────────── Pilihan ganda (choice/numeric/clock/silhouette) ───────────────────────── */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [Math.round((cx + r * Math.cos(rad)) * 100) / 100, Math.round((cy + r * Math.sin(rad)) * 100) / 100];
}

function ClockFace({ hour, minute }: { hour: number; minute: number }) {
  const cx = 70;
  const cy = 70;
  const minuteDeg = minute * 6;
  const hourDeg = (hour % 12) * 30 + minute * 0.5;
  const [hx, hy] = polar(cx, cy, 34, hourDeg);
  const [mx, my] = polar(cx, cy, 52, minuteDeg);
  return (
    <svg viewBox="0 0 140 140" className="w-40 h-40 sm:w-44 sm:h-44" role="img" aria-label="Jam dinding dengan jarum pendek dan panjang">
      <circle cx={cx} cy={cy} r="64" fill="#FFFDF9" stroke="#D4C9B4" strokeWidth="6" />
      <circle cx={cx} cy={cy} r="58" fill="none" stroke="#E6DFD2" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const [tx, ty] = polar(cx, cy, 47, n * 30);
        return (
          <text key={n} x={tx} y={ty + 4} textAnchor="middle" fontSize="13" fontWeight="800" fill="#3D352E">
            {n}
          </text>
        );
      })}
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#3D352E" strokeWidth="6" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#38B6FF" strokeWidth="4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#FF8B7B" stroke="#E06353" strokeWidth="2" />
    </svg>
  );
}

function ChoiceVisualView({ item, revealed }: { item: ChoiceItem; revealed: boolean }) {
  const v = item.visual;
  if (!v) return null;
  if (v.kind === "clock") {
    return (
      <div className="flex justify-center">
        <ClockFace hour={v.hour} minute={v.minute} />
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <div className="w-32 h-32 rounded-3xl bg-[#EEF8FF] border-2 border-[#BCE3FF] flex items-center justify-center select-none" aria-hidden="true">
        <span style={{ filter: revealed ? "none" : "brightness(0)" }} className="transition-[filter] duration-300">
          <AnimalGlyph id={v.animal} size={96} />
        </span>
      </div>
    </div>
  );
}

export function ChoiceQuiz({ modeId, level, seed, cursor, initialIndex, initialScore, onStep, onFinish }: EngineProps) {
  const items = useMemo(() => buildChoiceItems(modeId, { seed, level: lv(level), cursor } satisfies BuildCtx), [modeId, seed, level, cursor]);
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, items.length - 1)));
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(initialScore);
  const [streak, setStreak] = useState(0);
  const finishedRef = useRef(false);

  // Sesi tersimpan yang sebenarnya sudah selesai dijawab semua: langsung tampilkan hasil.
  useEffect(() => {
    if (items.length > 0 && initialIndex >= items.length && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(initialScore, items.length);
    }
  }, [items.length, initialIndex, initialScore, onFinish]);

  if (items.length === 0) {
    return <p className="text-sm font-bold text-[#7A6E65]">Soal untuk mode ini belum tersedia.</p>;
  }
  const item = items[index];
  const answered = picked !== null;
  const isLast = index === items.length - 1;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const right = i === item.answerIndex;
    const nextScore = right ? score + 1 : score;
    if (right) {
      setScore(nextScore);
      setStreak((n) => n + 1);
      soundEffects.arcadeCorrect(streak + 1);
    } else {
      setStreak(0);
      soundEffects.arcadeWrong();
    }
    // Simpan sekarang juga, supaya menutup game lalu membukanya lagi tidak bisa mengulang soal ini.
    onStep(index + 1, nextScore);
  };

  const next = () => {
    if (isLast) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish(score, items.length);
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
  };

  return (
    <div className="space-y-3.5">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#7A6E65]">
          <span>Soal {index + 1} dari {items.length}</span>
          <span className="tabular-nums">
            Benar: {score}
            {streak >= 2 && <span className="ml-1.5 px-1.5 py-0.5 rounded-lg bg-[#FFC800] text-[#4A3500]">Beruntun x{streak}</span>}
          </span>
        </div>
        <ChunkyProgressBar value={index + (answered ? 1 : 0)} max={items.length} variant="matcha" />
      </div>

      <ChoiceVisualView item={item} revealed={answered} />

      <p className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug break-words">{item.prompt}</p>

      <div className="grid gap-2">
        {item.options.map((opt, i) => {
          const isRight = answered && i === item.answerIndex;
          const isWrong = answered && picked === i && i !== item.answerIndex;
          return (
            <button
              key={`${item.id}-${opt}`}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              className={cn(
                "w-full text-left px-3.5 py-3 rounded-2xl border-2 border-b-[4px] font-display text-sm font-extrabold break-words cursor-pointer transition-colors",
                !answered && "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#3D352E] hover:bg-[#FFFDF9] active:border-b-[2px] active:translate-y-[2px]",
                isRight && "bg-[#EFFBE6] border-[#58CC02] border-b-[#46A302] text-[#2E6F00]",
                isWrong && "bg-[#FFF2F0] border-[#FF4B4B] border-b-[#EA2B2B] text-[#8F2A1B]",
                answered && !isRight && !isWrong && "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65]"
              )}
            >
              {isRight && <GlyphIcon name="check_circle" size={20} className="mr-1.5" />}
              {isWrong && <GlyphIcon name="cross" size={18} className="mr-1.5 text-[#EA2B2B]" />}
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          role="status"
          className={cn(
            "p-3 rounded-2xl border-2 text-xs font-bold leading-relaxed",
            picked === item.answerIndex ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" : "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
          )}
        >
          {picked === item.answerIndex ? "Hebat, jawabanmu benar! " : "Belum tepat, tidak apa-apa. "}
          {item.explain}
        </div>
      )}

      <TactileButton variant="matcha" fullWidth disabled={!answered} onClick={next}>
        {isLast ? <>Lihat Hasil <GlyphIcon name="party" size={20} /></> : <>Soal Berikutnya <GlyphIcon name="arrow_right" size={16} /></>}
      </TactileButton>
    </div>
  );
}

/* ───────────────────────── Susun Kalimat ───────────────────────── */

function shuffleNotEqual<T>(items: readonly T[], seed: string): T[] {
  let out = seededShuffle(items, seed);
  let tries = 0;
  while (tries < 6 && out.every((v, i) => v === items[i])) {
    tries += 1;
    out = seededShuffle(items, `${seed}|re${tries}`);
  }
  if (out.every((v, i) => v === items[i]) && out.length > 1) out = [...out.slice(1), out[0]];
  return out;
}

export function SentenceBuilder({ level, seed, cursor, initialIndex, initialScore, onStep, onFinish }: EngineProps) {
  const rounds = useMemo(
    () => buildSentences({ seed, level: lv(level), cursor }).map((words, i) => ({ words, tiles: shuffleNotEqual(words.map((w, j) => ({ w, j })), `${seed}|c${cursor}|t|${i}`) })),
    [seed, level, cursor]
  );
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, rounds.length - 1)));
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [score, setScore] = useState(initialScore);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (rounds.length > 0 && initialIndex >= rounds.length && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(initialScore, rounds.length);
    }
  }, [rounds.length, initialIndex, initialScore, onFinish]);

  const round = rounds[index];
  const isLast = index === rounds.length - 1;
  const built = chosen.map((j) => round.words[j]);
  const complete = chosen.length === round.words.length;

  const toggle = (j: number) => {
    if (checked !== null) return;
    soundEffects.arcadeFlip();
    setChosen((c) => (c.includes(j) ? c.filter((x) => x !== j) : [...c, j]));
  };

  const check = () => {
    const ok = chosen.every((j, pos) => round.words[j] === round.words[pos]);
    setChecked(ok);
    const nextScore = ok ? score + 1 : score;
    if (ok) {
      setScore(nextScore);
      soundEffects.arcadeCorrect();
    } else {
      soundEffects.arcadeWrong();
    }
    onStep(index + 1, nextScore);
  };

  const next = () => {
    if (isLast) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish(score, rounds.length);
      return;
    }
    setIndex((n) => n + 1);
    setChosen([]);
    setChecked(null);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#7A6E65]">
        <span>Kalimat {index + 1} dari {rounds.length}</span>
        <span className="tabular-nums">Benar: {score}</span>
      </div>
      <p className="text-sm font-bold text-[#3D352E]">Ketuk kata sesuai urutan agar menjadi kalimat yang benar.</p>

      <div
        aria-live="polite"
        className={cn(
          "min-h-[3.5rem] rounded-2xl border-2 border-dashed p-2.5 flex flex-wrap gap-1.5 items-center",
          checked === true ? "bg-[#EFFBE6] border-[#58CC02]" : checked === false ? "bg-[#FFF2F0] border-[#FF4B4B]" : "bg-[#F7F3EB] border-[#D4C9B4]"
        )}
      >
        {built.length === 0 && <span className="text-xs font-bold text-[#7A6E65]">Kalimatmu muncul di sini…</span>}
        {chosen.map((j) => (
          <button
            key={`c-${j}`}
            type="button"
            onClick={() => toggle(j)}
            className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] font-display text-sm font-extrabold text-[#3D352E] cursor-pointer"
          >
            {round.words[j]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {round.tiles.map(({ w, j }) => {
          const used = chosen.includes(j);
          return (
            <button
              key={`t-${j}`}
              type="button"
              disabled={used || checked !== null}
              onClick={() => toggle(j)}
              className={cn(
                "px-3 py-1.5 rounded-xl border-2 border-b-[3px] font-display text-sm font-extrabold cursor-pointer transition-opacity",
                used ? "opacity-30 bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]" : "bg-[#F8F0FF] border-[#E2C6FF] border-b-[#CE82FF] text-[#8A3FC2]"
              )}
            >
              {w}
            </button>
          );
        })}
      </div>

      {checked !== null && (
        <div role="status" className={cn("p-3 rounded-2xl border-2 text-xs font-bold", checked ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" : "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]")}>
          {checked ? "Kalimatmu tepat. Keren!" : `Urutan yang benar: ${round.words.join(" ")}.`}
        </div>
      )}

      {checked === null ? (
        <div className="grid grid-cols-2 gap-2">
          <TactileButton variant="cream" disabled={chosen.length === 0} onClick={() => setChosen([])}>
            Ulangi
          </TactileButton>
          <TactileButton variant="matcha" disabled={!complete} onClick={check}>
            Periksa
          </TactileButton>
        </div>
      ) : (
        <TactileButton variant="matcha" fullWidth onClick={next}>
          {isLast ? <>Lihat Hasil <GlyphIcon name="party" size={20} /></> : <>Kalimat Berikutnya <GlyphIcon name="arrow_right" size={16} /></>}
        </TactileButton>
      )}
    </div>
  );
}

/* ───────────────────────── 3 Kata Jadi Cerita ───────────────────────── */

export function ThreeWordStory({ level, seed, cursor, onFinish }: EngineProps) {
  const words = useMemo(() => pickThreeWords({ seed, level: lv(level), cursor }), [seed, level, cursor]);
  const minWords = THREEWORD_MIN_BY_LEVEL[lv(level)];
  const [text, setText] = useState("");
  const finishedRef = useRef(false);
  const tokens = tokenizeWords(text);
  const missing = words.filter((w) => !tokens.includes(w));
  const enough = tokens.length >= minWords;
  const ok = enough && missing.length === 0;

  const finish = () => {
    if (!ok || finishedRef.current) return;
    finishedRef.current = true;
    soundEffects.arcadeCorrect(3);
    onFinish(1, 1);
  };

  return (
    <div className="space-y-3.5">
      <p className="text-sm font-bold text-[#3D352E]">Tulis cerita mini yang memakai ketiga kata ajaib ini:</p>
      <div className="flex flex-wrap gap-2">
        {words.map((w) => (
          <span
            key={w}
            className={cn(
              "px-3 py-1.5 rounded-xl border-2 font-display text-sm font-extrabold",
              tokens.includes(w) ? "bg-[#EFFBE6] border-[#58CC02] text-[#2E6F00]" : "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
            )}
          >
            {tokens.includes(w) ? <GlyphIcon name="check_circle" size={18} className="mr-1.5" /> : <GlyphIcon name="dice" size={18} className="mr-1.5" />}
            {w}
          </span>
        ))}
      </div>
      <label className="block">
        <span className="sr-only">Cerita mini tiga kata</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={600}
          placeholder="Pada suatu hari…"
          className="w-full rounded-2xl border-2 border-[#E6DFD2] bg-white p-3 text-sm font-bold text-[#3D352E] focus:outline-none focus:border-[#38B6FF] resize-none"
        />
      </label>
      <p className={cn("text-xs font-bold tabular-nums", enough ? "text-[#2E6F00]" : "text-[#7A6E65]")}>
        {tokens.length} kata • minimal {minWords} kata{missing.length > 0 ? ` • belum memakai: ${missing.join(", ")}` : ""}
      </p>
      <TactileButton variant="matcha" fullWidth disabled={!ok} onClick={finish}>
        <>Selesai Bercerita <GlyphIcon name="party" size={20} /></>
      </TactileButton>
    </div>
  );
}

/* ───────────────────────── Latihan Napas ───────────────────────── */

const BREATH_PHASES = [
  { label: "Tarik napas pelan…", seconds: 4, scale: 1.25 },
  { label: "Tahan sebentar…", seconds: 2, scale: 1.25 },
  { label: "Hembuskan perlahan…", seconds: 4, scale: 0.8 },
] as const;

export function BreathingExercise({ level, onFinish }: EngineProps) {
  const BREATH_CYCLES = BREATH_CYCLES_BY_LEVEL[lv(level)];
  const reduce = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0); // 0 .. BREATH_CYCLES*3
  const finishedRef = useRef(false);
  const total = BREATH_CYCLES * BREATH_PHASES.length;
  const done = step >= total;

  useEffect(() => {
    if (!started || done) return;
    const phase = BREATH_PHASES[step % BREATH_PHASES.length];
    const t = window.setTimeout(() => setStep((s) => s + 1), phase.seconds * 1000);
    return () => window.clearTimeout(t);
  }, [started, step, done]);

  useEffect(() => {
    if (done && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(BREATH_CYCLES, BREATH_CYCLES);
    }
  }, [done, onFinish, BREATH_CYCLES]);

  const phase = BREATH_PHASES[step % BREATH_PHASES.length];
  const cycle = Math.min(BREATH_CYCLES, Math.floor(step / BREATH_PHASES.length) + 1);

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm font-bold text-[#3D352E]">Duduk nyaman, lalu ikuti lingkaran napas selama {BREATH_CYCLES} putaran.</p>
      <div className="flex justify-center py-3">
        <motion.div
          aria-hidden="true"
          animate={{ scale: started && !reduce ? phase.scale : 1 }}
          transition={{ duration: started && !reduce ? phase.seconds : 0.2, ease: "easeInOut" }}
          className="w-32 h-32 rounded-full bg-[#EEF8FF] border-4 border-[#38B6FF] flex items-center justify-center text-5xl"
        >
          <GlyphIcon name="wind" size={64} />
        </motion.div>
      </div>
      <p aria-live="polite" className="font-display text-lg font-extrabold text-[#3D352E] min-h-[1.75rem]">
        {started ? phase.label : "Siap?"}
      </p>
      {started && <p className="text-xs font-bold text-[#7A6E65] tabular-nums">Putaran {cycle} dari {BREATH_CYCLES}</p>}
      {!started && (
        <TactileButton variant="sky" fullWidth onClick={() => setStarted(true)}>
          Mulai Bernapas
        </TactileButton>
      )}
    </div>
  );
}

/* ───────────────────────── Misi Kebaikan ───────────────────────── */

export function KindnessChecklist({ level, seed, cursor, onFinish }: EngineProps) {
  const KINDNESS_PASS = KINDNESS_PASS_BY_LEVEL[lv(level)];
  const tasks = useMemo(() => seededShuffle(KINDNESS_TASKS, `${seed}|c${cursor}|k`).slice(0, lv(level) >= 4 ? 8 : 6), [seed, cursor, level]);
  const [checked, setChecked] = useState<string[]>([]);
  const finishedRef = useRef(false);
  const enough = checked.length >= KINDNESS_PASS;

  const finish = () => {
    if (!enough || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(KINDNESS_PASS, KINDNESS_PASS);
  };

  return (
    <div className="space-y-3.5">
      <p className="text-sm font-bold text-[#3D352E]">Centang kebaikan yang benar-benar kamu lakukan hari ini (minimal {KINDNESS_PASS}).</p>
      <div className="grid gap-2">
        {tasks.map((t) => {
          const on = checked.includes(t);
          return (
            <button
              key={t}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => setChecked((c) => (on ? c.filter((x) => x !== t) : [...c, t]))}
              className={cn(
                "w-full text-left px-3.5 py-3 rounded-2xl border-2 border-b-[4px] font-display text-sm font-extrabold break-words cursor-pointer",
                on ? "bg-[#EFFBE6] border-[#58CC02] border-b-[#46A302] text-[#2E6F00]" : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#3D352E]"
              )}
            >
              {on ? <GlyphIcon name="check_circle" size={20} className="mr-1.5" /> : <GlyphIcon name="square" size={20} className="mr-1.5 text-[#B9B2A6]" />}
              {t}
            </button>
          );
        })}
      </div>
      <p className="text-xs font-bold text-[#7A6E65] tabular-nums">Terpilih {checked.length} dari {tasks.length}</p>
      <TactileButton variant="matcha" fullWidth disabled={!enough} onClick={finish}>
        <>Selesaikan Misi <GlyphIcon name="heart" size={20} /></>
      </TactileButton>
    </div>
  );
}

/* ───────────────────────── Kartu Terima Kasih ───────────────────────── */

export function ThankYouCard({ level, onFinish }: EngineProps) {
  const THANKS_MIN = THANKS_MIN_BY_LEVEL[lv(level)];
  const [to, setTo] = useState<string>(THANKS_RECIPIENTS[0]);
  const [text, setText] = useState("");
  const finishedRef = useRef(false);
  const count = tokenizeWords(text).length;
  const ok = count >= THANKS_MIN;

  const finish = () => {
    if (!ok || finishedRef.current) return;
    finishedRef.current = true;
    onFinish(1, 1);
  };

  return (
    <div className="space-y-3.5">
      <p className="text-sm font-bold text-[#3D352E]">Untuk siapa kartu terima kasih ini?</p>
      <div className="flex flex-wrap gap-1.5">
        {THANKS_RECIPIENTS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setTo(r)}
            aria-pressed={to === r}
            className={cn(
              "px-3 py-1.5 rounded-xl border-2 border-b-[3px] font-display text-xs font-extrabold cursor-pointer",
              to === r ? "bg-[#FFF2F0] border-[#FF8B7B] border-b-[#E06353] text-[#8F2A1B]" : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#3D352E]"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="rounded-3xl border-2 border-[#FFCDC6] bg-[#FFF8F6] p-3.5 space-y-2">
        <p className="font-display text-sm font-extrabold text-[#8F2A1B]">Untuk {to} tersayang,</p>
        <label className="block">
          <span className="sr-only">Isi kartu terima kasih</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={400}
            placeholder="Terima kasih sudah…"
            className="w-full rounded-2xl border-2 border-[#E6DFD2] bg-white p-3 text-sm font-bold text-[#3D352E] focus:outline-none focus:border-[#FF8B7B] resize-none"
          />
        </label>
      </div>
      <p className={cn("text-xs font-bold tabular-nums", ok ? "text-[#2E6F00]" : "text-[#7A6E65]")}>
        {count} kata • minimal {THANKS_MIN} kata
      </p>
      <TactileButton variant="peach" fullWidth disabled={!ok} onClick={finish}>
        <>Kirim Kartu <GlyphIcon name="letter" size={20} /></>
      </TactileButton>
    </div>
  );
}

/* ───────────────────────── Kartu Memori Bioma ───────────────────────── */

interface MemoryCard {
  key: string;
  symbolId: string;
  symbol: BiomeGlyphId;
  label: string;
}

/** Skor 1..pairs menurut jumlah langkah; main rapi (≤ 1,6× jumlah pasang) = nilai penuh. */
function memoryScore(moves: number, pairs: number): number {
  if (moves <= pairs * 1.6) return pairs;
  if (moves <= pairs * 2.4) return pairs - 1;
  if (moves <= pairs * 3.2) return pairs - 2;
  return Math.max(1, pairs - 3);
}

export function MemoryMatch({ level, seed, cursor, onFinish }: EngineProps) {
  const MEMORY_PAIRS = MEMORY_PAIRS_BY_LEVEL[lv(level)];
  const cards = useMemo<MemoryCard[]>(() => {
    const picked = seededShuffle(MEMORY_SYMBOLS, `${seed}|c${cursor}|m`).slice(0, MEMORY_PAIRS);
    const doubled = picked.flatMap((s) => [
      { key: `${s.id}-a`, symbolId: s.id, symbol: s.id, label: s.label },
      { key: `${s.id}-b`, symbolId: s.id, symbol: s.id, label: s.label },
    ]);
    return seededShuffle(doubled, `${seed}|c${cursor}|deck`);
  }, [seed, cursor, MEMORY_PAIRS]);

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const finishedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const byKey = useMemo(() => new Map(cards.map((c) => [c.key, c])), [cards]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flip = (key: string) => {
    if (locked || flipped.includes(key) || matched.includes(key)) return;
    soundEffects.arcadeFlip();
    const nextFlipped = [...flipped, key];
    setFlipped(nextFlipped);
    if (nextFlipped.length < 2) return;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const [a, b] = nextFlipped.map((k) => byKey.get(k)!);
    if (a.symbolId === b.symbolId) {
      const nextMatched = [...matched, a.key, b.key];
      setMatched(nextMatched);
      setFlipped([]);
      soundEffects.arcadeMatch();
      if (nextMatched.length === cards.length && !finishedRef.current) {
        finishedRef.current = true;
        timerRef.current = window.setTimeout(() => onFinish(memoryScore(nextMoves, MEMORY_PAIRS), MEMORY_PAIRS), 700);
      }
    } else {
      setLocked(true);
      window.setTimeout(() => soundEffects.arcadeWrong(), 250);
      timerRef.current = window.setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 800);
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#7A6E65]">
        <span>Cocokkan {MEMORY_PAIRS} pasang kartu bioma</span>
        <span className="tabular-nums">Langkah: {moves}</span>
      </div>
      <div className={cn("grid gap-2", cards.length <= 6 ? "grid-cols-3 max-w-xs mx-auto" : "grid-cols-4")}>
        {cards.map((c) => {
          const open = flipped.includes(c.key) || matched.includes(c.key);
          const isMatched = matched.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => flip(c.key)}
              aria-label={open ? c.label : "Kartu tertutup"}
              className={cn(
                "aspect-square rounded-2xl border-2 border-b-[4px] flex items-center justify-center text-3xl sm:text-4xl cursor-pointer select-none transition-colors",
                isMatched ? "bg-[#EFFBE6] border-[#58CC02] border-b-[#46A302]" : open ? "bg-white border-[#38B6FF] border-b-[#1E88E5]" : "bg-[#CE82FF] border-[#A552DB] border-b-[#8A3FC2] text-white"
              )}
            >
              <span aria-hidden="true" className="inline-flex">{open ? <BiomeGlyph id={c.symbol} size={40} /> : <GlyphIcon name="question" size={34} />}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs font-bold text-[#7A6E65]">Makin sedikit langkahmu, makin tinggi skornya.</p>
    </div>
  );
}

/* ───────────────────────── Urutkan Kronologi ───────────────────────── */

export function OrderChronology({ level, seed, cursor, initialIndex, initialScore, onStep, onFinish }: EngineProps) {
  const stories = useMemo(
    () => buildOrderStories({ seed, level: lv(level), cursor }).map((s, i) => ({ ...s, tiles: shuffleNotEqual(s.steps.map((text, j) => ({ text, j })), `${seed}|c${cursor}|ot|${i}`) })),
    [seed, level, cursor]
  );
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, stories.length - 1)));
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [score, setScore] = useState(initialScore);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (stories.length > 0 && initialIndex >= stories.length && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(initialScore, stories.length);
    }
  }, [stories.length, initialIndex, initialScore, onFinish]);

  const story = stories[index];
  const isLast = index === stories.length - 1;
  const complete = chosen.length === story.steps.length;

  const toggle = (j: number) => {
    if (checked !== null) return;
    soundEffects.arcadeFlip();
    setChosen((c) => (c.includes(j) ? c.filter((x) => x !== j) : [...c, j]));
  };
  const check = () => {
    const ok = chosen.every((j, pos) => j === pos);
    setChecked(ok);
    const nextScore = ok ? score + 1 : score;
    if (ok) {
      setScore(nextScore);
      soundEffects.arcadeCorrect();
    } else {
      soundEffects.arcadeWrong();
    }
    onStep(index + 1, nextScore);
  };
  const next = () => {
    if (isLast) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish(score, stories.length);
      return;
    }
    setIndex((n) => n + 1);
    setChosen([]);
    setChecked(null);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#7A6E65]">
        <span>Cerita {index + 1} dari {stories.length}</span>
        <span className="tabular-nums">Benar: {score}</span>
      </div>
      <p className="font-display text-base font-extrabold text-[#3D352E] break-words">{story.title}</p>
      <p className="text-xs font-bold text-[#7A6E65]">Ketuk kejadian sesuai urutan dari yang pertama sampai terakhir. Ketuk lagi untuk membatalkan.</p>

      <div className="grid gap-2">
        {story.tiles.map(({ text, j }) => {
          const pos = chosen.indexOf(j);
          const used = pos >= 0;
          const right = checked !== null && used && pos === j;
          const wrong = checked !== null && used && pos !== j;
          return (
            <button
              key={j}
              type="button"
              disabled={checked !== null}
              onClick={() => toggle(j)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-2xl border-2 border-b-[4px] flex items-center gap-2.5 font-display text-sm font-extrabold break-words cursor-pointer",
                right ? "bg-[#EFFBE6] border-[#58CC02] border-b-[#46A302] text-[#2E6F00]" : wrong ? "bg-[#FFF2F0] border-[#FF4B4B] border-b-[#EA2B2B] text-[#8F2A1B]" : used ? "bg-[#EEF8FF] border-[#38B6FF] border-b-[#1E88E5] text-[#1565C0]" : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#3D352E]"
              )}
            >
              <span className={cn("shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs tabular-nums", used ? "bg-white border border-current" : "bg-[#F7F3EB] text-[#7A6E65]")}>
                {used ? pos + 1 : "•"}
              </span>
              <span className="min-w-0">{text}</span>
            </button>
          );
        })}
      </div>

      {checked !== null && (
        <div role="status" className={cn("p-3 rounded-2xl border-2 text-xs font-bold leading-relaxed", checked ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" : "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]")}>
          {checked ? "Urutannya tepat. Hebat!" : `Urutan yang benar: ${story.steps.map((t, i) => `${i + 1}) ${t}`).join("; ")}.`}
        </div>
      )}

      {checked === null ? (
        <div className="grid grid-cols-2 gap-2">
          <TactileButton variant="cream" disabled={chosen.length === 0} onClick={() => setChosen([])}>
            Ulangi
          </TactileButton>
          <TactileButton variant="matcha" disabled={!complete} onClick={check}>
            Periksa
          </TactileButton>
        </div>
      ) : (
        <TactileButton variant="matcha" fullWidth onClick={next}>
          {isLast ? <>Lihat Hasil <GlyphIcon name="party" size={20} /></> : <>Cerita Berikutnya <GlyphIcon name="arrow_right" size={16} /></>}
        </TactileButton>
      )}
    </div>
  );
}

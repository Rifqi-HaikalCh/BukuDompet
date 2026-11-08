"use client";

import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PenLine, Lightbulb, Sparkles } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import {
  CustomizablePetAvatar,
  type PetMood,
} from "@/components/illustrations/PetAvatarSystem";
import {
  EmotionWheelIcon,
  EMOTION_KEYS,
  EMOTION_LABEL,
  type EmotionKey,
} from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozySheet } from "@/components/ui/CozySheet";
import { TactileButton, ChunkyProgressBar } from "@/components/ui/CozyPrimitives";
import {
  MIN_STORY_WORDS,
  MIN_UNIQUE_WORDS,
  STORY_CATEGORIES,
  STORY_CATEGORY_BY_ID,
  analyzeStory,
} from "@/lib/story-utils";
import {
  STORY_REWARD_POINTS,
  STORY_REWARD_XP,
  type StoryCategory,
} from "@/lib/family-types";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const MAX_BODY_CHARS = 1500;

/**
 * Waktu Cerita (Anak SD): tulis cerita minimal 30 kata, pilih kategori, lalu simpan.
 * Menyimpan = menyambung Streak, membuka batu pijakan hari ini di Jalur Cerita,
 * +15 Poin & +25 Stage XP (cerita pertama hari itu), dan membagikan kutipan bangga ke Beranda Keluarga.
 */
export function StoryTimeModal() {
  const isOpen = useBukuDompetStore((s) => s.isStoryModalOpen);
  const setOpen = useBukuDompetStore((s) => s.setStoryModalOpen);
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const profile = useBukuDompetStore((s) =>
    s.profiles.find((p) => p.id === s.activeProfileId && p.role === "schoolchild")
  );
  const saveStory = useFamilyStore((s) => s.saveStory);

  const [category, setCategory] = useState<StoryCategory>("activity");
  const [emotion, setEmotion] = useState<EmotionKey | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; rewarded: boolean } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const meta = STORY_CATEGORY_BY_ID[category];
  const analysis = useMemo(() => analyzeStory(body), [body]);
  const needsEmotion = category === "emotion" && !emotion;
  const canSave = analysis.valid && !needsEmotion;

  if (!profile) return null;

  const petMood: PetMood = done ? "proud" : "happy";

  const resetForm = () => {
    setCategory("activity");
    setEmotion(undefined);
    setTitle("");
    setBody("");
    setPrompt("");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open && done) {
      // Setelah sukses ditutup, siapkan formulir bersih untuk cerita berikutnya.
      setDone(null);
      resetForm();
    }
  };

  const handleSave = () => {
    setError(null);
    const res = saveStory({
      userId: activeProfileId,
      category,
      emotion: category === "emotion" ? emotion : undefined,
      title,
      body,
    });
    if (!res.success) {
      soundEffects.detectiveBuzz();
      setError(res.message);
      return;
    }
    soundEffects.comboFanfare();
    fireCozyConfetti("combo");
    setDone({ message: res.message, rewarded: res.rewarded });
  };

  const progressPct = Math.round(analysis.progress * 100);

  return (
    <CozySheet
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Waktu Cerita"
      description={`Tulis ceritamu, ${profile.display_name.replace(/\s*\(.*?\)\s*/g, "")}! Minimal ${MIN_STORY_WORDS} kata.`}
      icon={<PenLine className="w-7 h-7 text-[#E5A400] shrink-0" aria-hidden="true" />}
      footer={
        done ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/app/journey"
              onClick={() => {
                soundEffects.tactileClick();
                handleOpenChange(false);
              }}
              className="flex-1"
            >
              <TactileButton variant="matcha" size="md" fullWidth showLoadingOnClick>
                Lihat Jalur Cerita
              </TactileButton>
            </Link>
            <TactileButton
              variant="cream"
              size="md"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Tutup
            </TactileButton>
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <p role="alert" className="text-xs font-extrabold text-[#8F2A1B] bg-[#FFF2F0] border-2 border-[#FFCDC6] rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <TactileButton
              variant="matcha"
              size="lg"
              fullWidth
              disabled={!canSave}
              onClick={handleSave}
            >
              <PenLine className="w-5 h-5" aria-hidden="true" />
              Simpan Ceritaku
            </TactileButton>
            {!canSave && (
              <p className="text-[11px] font-bold text-[#7A6E65] text-center">
                {needsEmotion
                  ? "Pilih dulu perasaanmu di atas."
                  : analysis.reason || `Tulis minimal ${MIN_STORY_WORDS} kata untuk menyimpan.`}
              </p>
            )}
          </div>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center text-center gap-3 py-2" data-testid="story-success">
          <div className="w-40 h-40 rounded-3xl bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] flex items-center justify-center">
            <CustomizablePetAvatar
              species={profile.activeSpecies}
              stage={profile.currentStage}
              mood={petMood}
              customName={profile.petCustomName}
              equippedAccessories={profile.equippedAccessories}
              className="w-36 h-36"
            />
          </div>
          <h3 className="font-display text-xl font-extrabold text-[#3D352E]">
            Hebat! Ceritamu sudah tersimpan <GlyphInline name="party" />
          </h3>
          <p className="text-sm font-bold text-[#3D352E]/85 max-w-sm">{done.message}</p>
          <ul className="text-xs font-bold text-[#3D352E] space-y-1">
            <li><GlyphInline name="flame" /> Streak harianmu menyambung.</li>
            <li><GlyphInline name="rock" /> Batu pijakan hari ini di Jalur Cerita terbuka.</li>
            <li>
              {done.rewarded
                ? <><GlyphInline name="coin" /> +{STORY_REWARD_POINTS} Poin &amp; <GlyphInline name="star" /> +{STORY_REWARD_XP} Stage XP.</>
                : <><GlyphInline name="coin" /> Hadiah Poin hanya untuk cerita pertama setiap hari.</>}
            </li>
            <li><GlyphInline name="chat" /> Kutipan bangga sudah dibagikan ke Beranda Keluarga.</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-4 min-w-0">
          {/* Kategori */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1.5">
              1. Pilih jenis ceritamu
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STORY_CATEGORIES.map((c) => {
                const active = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      soundEffects.tactileClick();
                      setCategory(c.id);
                      setPrompt("");
                      setError(null);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border-2 border-b-[4px] text-left transition-all cursor-pointer min-w-0",
                      "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
                      active
                        ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[#F5C84C]"
                        : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] hover:bg-white"
                    )}
                  >
                    <GlyphIcon name={c.icon} size={30} />
                    <span className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-bold text-[#7A6E65]">{meta.hint}</p>
          </fieldset>

          {/* Pilih emosi */}
          {category === "emotion" && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1.5">
                Bagaimana perasaanmu hari ini?
              </legend>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {EMOTION_KEYS.map((k) => {
                  const active = emotion === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={active}
                      aria-label={EMOTION_LABEL[k]}
                      onClick={() => {
                        soundEffects.tactileClick();
                        setEmotion(k);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-2xl border-2 border-b-[4px] transition-all cursor-pointer",
                        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
                        active
                          ? "bg-[#E3F4FF] border-[#38B6FF] border-b-[#1E88E5]"
                          : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] hover:bg-[#FFFDF9]"
                      )}
                    >
                      <EmotionWheelIcon emotion={k} size={52} />
                      <span className="text-[11px] font-display font-extrabold text-[#3D352E]">
                        {EMOTION_LABEL[k]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Ide tulisan */}
          <div className="space-y-2">
            <p className="text-xs font-display font-extrabold uppercase text-[#3D352E] flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-[#E5A400]" aria-hidden="true" />
              Bingung mau tulis apa? Ketuk satu ide
            </p>
            <ChipScroller label="Ide cerita">
              {meta.prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setPrompt(p);
                    if (!title.trim()) setTitle("");
                    bodyRef.current?.focus();
                  }}
                  className={cn(
                    "w-[230px] whitespace-normal px-3 py-1.5 rounded-2xl border-2 text-xs font-display font-extrabold text-left cursor-pointer transition-colors",
                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
                    prompt === p
                      ? "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
                      : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFBEB]"
                  )}
                >
                  <GlyphInline name="bulb" /> {p}
                </button>
              ))}
            </ChipScroller>
            {prompt && (
              <p className="text-xs font-bold text-[#4A3500] bg-[#FFFBEB] border border-[#FDE08D] rounded-xl px-3 py-2">
                Jawab pertanyaan ini dalam ceritamu: <strong>{prompt}</strong>
              </p>
            )}
          </div>

          {/* Judul + isi */}
          <div className="space-y-3">
            <div>
              <label htmlFor="story-title" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
                2. Judul cerita
              </label>
              <input
                id="story-title"
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={meta.titlePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white focus:border-[#38B6FF] focus:outline-none font-display font-extrabold text-sm text-[#3D352E]"
              />
            </div>
            <div>
              <label htmlFor="story-body" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
                3. Tulis ceritamu
              </label>
              <textarea
                id="story-body"
                ref={bodyRef}
                rows={6}
                maxLength={MAX_BODY_CHARS}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setError(null);
                }}
                placeholder={meta.bodyPlaceholder}
                className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-white focus:border-[#38B6FF] focus:outline-none text-sm font-bold text-[#3D352E] leading-relaxed resize-y"
              />
            </div>

            {/* Progres kata langsung */}
            <div className="space-y-1.5" aria-live="polite">
              <ChunkyProgressBar
                value={Math.min(analysis.wordCount, MIN_STORY_WORDS)}
                max={MIN_STORY_WORDS}
                variant={analysis.valid ? "matcha" : progressPct >= 100 ? "honey" : "sky"}
                label={`Kata: ${analysis.wordCount} / ${MIN_STORY_WORDS} (kata berbeda: ${analysis.uniqueCount})`}
              />
              <p
                className={cn(
                  "text-xs font-extrabold flex items-center gap-1.5",
                  analysis.valid ? "text-[#2E6F00]" : "text-[#7A6E65]"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {analysis.valid
                  ? "Ceritamu sudah cukup panjang dan kaya. Siap disimpan!"
                  : analysis.wordCount === 0
                  ? `Mulai menulis. Butuh ${MIN_STORY_WORDS} kata dan minimal ${MIN_UNIQUE_WORDS} kata berbeda.`
                  : analysis.reason}
              </p>
            </div>
          </div>
        </div>
      )}
    </CozySheet>
  );
}

"use client";

/**
 * Gelembung bicara Pet (Versi 5.3): diagnosis & mood finansial disampaikan oleh pet itu sendiri.
 * Ekor gelembung menunjuk ke pet di atasnya, teks muncul huruf demi huruf (langsung penuh bila
 * pengguna memilih gerak dikurangi), dan pet ikut "bicara" lewat `onSpeakingChange`.
 */
import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import { PET_MOOD_LABEL, type PetMood } from "@/components/illustrations/PetAvatarSystem";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export interface PetMessage {
  /** Judul topik singkat, mis. "Diagnosis" atau "Kabar Dompet". */
  topic: string;
  text: string;
}

const CHARS_PER_TICK = 2;
const TICK_MS = 22;

export function PetSpeechBubble({
  petName,
  mood,
  messages,
  index,
  onNext,
  onSpeakingChange,
}: {
  petName: string;
  mood: PetMood;
  messages: PetMessage[];
  index: number;
  onNext: () => void;
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const msg = messages[index % messages.length];
  const [shown, setShown] = useState<number>(0);

  // Mulai mengetik ulang setiap kali pesan berganti.
  useEffect(() => {
    if (reduce) {
      setShown(msg.text.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= msg.text.length) {
          window.clearInterval(id);
          return n;
        }
        return Math.min(msg.text.length, n + CHARS_PER_TICK);
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [msg.text, reduce]);

  const done = shown >= msg.text.length;
  useEffect(() => {
    onSpeakingChange?.(!done);
  }, [done, onSpeakingChange]);
  useEffect(() => () => onSpeakingChange?.(false), [onSpeakingChange]);

  return (
    <div className="relative w-full mt-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      {/* ekor menunjuk ke pet */}
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-t-2 border-l-2 border-[#E6DFD2]"
      />
      <div className="relative rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-3.5 space-y-2 text-left min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-display font-extrabold text-[#3D352E] min-w-0">
            <GlyphIcon name="chat" size={14} className="shrink-0" />
            <span className="truncate">
              {petName} merasa {PET_MOOD_LABEL[mood].split(" ")[0]}
            </span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] text-[10px] font-display font-extrabold text-[#7A6E65] shrink-0">
            {msg.topic}
          </span>
        </div>

        <p className="text-sm font-bold text-[#3D352E] leading-relaxed break-words min-h-[4.5rem]" aria-live="polite" aria-atomic="true">
          <span className="sr-only">{msg.text}</span>
          <span aria-hidden="true">
            &ldquo;{msg.text.slice(0, shown)}
            {!done && <span className="inline-block w-0.5 h-4 align-middle bg-[#3D352E] ml-0.5 animate-pulse" />}
            {done && <>&rdquo;</>}
          </span>
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" aria-label={`Pesan ${(index % messages.length) + 1} dari ${messages.length}`} role="img">
            {messages.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index % messages.length ? "w-5 bg-[#38B6FF]" : "w-1.5 bg-[#D4C9B4]")} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              soundEffects.tactileClick();
              onNext();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5] active:border-b-[1px] active:translate-y-[2px] font-display text-xs font-extrabold cursor-pointer"
          >
            Dengar lagi <GlyphIcon name="chevron_right" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

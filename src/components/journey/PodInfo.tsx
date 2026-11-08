"use client";

/**
 * Elemen informasi Peta Perjalanan (Versi 5.0):
 * - PodLegend: legenda visual semua jenis pod (batu pijakan) di bagian atas peta.
 * - PodPopover: kartu info melayang saat sebuah pod diketuk (Hari ke-X, tanggal, arti pod, ringkasan).
 * - KidDayFeed: daftar cerita & tabungan Anak SD pada tanggal terpilih.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React from "react";
import { motion } from "framer-motion";
import { X } from "@/components/illustrations/UiGlyphs";
import { SteppingStoneNode, type StoneStatus } from "@/components/illustrations/AdventureNodes";
import { EmotionWheelIcon, EMOTION_LABEL } from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { CozyCard, formatRupiah } from "@/components/ui/CozyPrimitives";
import { longDateLabel, mediumDateLabel } from "@/lib/dates";
import { STORY_CATEGORY_BY_ID } from "@/lib/story-utils";
import type { StoryEntry } from "@/lib/family-types";
import { cn, formatCompactRupiah } from "@/lib/utils";

export interface PodSummary {
  dayIndex: number;
  dateStr: string;
  status: StoneStatus;
  isFuture: boolean;
  totalSpent: number;
  totalIncome: number;
  totalSaved: number;
  /** Jumlah catatan kas (tanpa tabungan). */
  cashCount: number;
  stories: StoryEntry[];
}

interface PodCopy {
  name: string;
  meaning: string;
  tone: string;
}

export function podCopy(status: StoneStatus, isFuture: boolean, isKid: boolean): PodCopy {
  if (isFuture) {
    return {
      name: "Pod Kristal Beku (Belum Tiba)",
      meaning: "Hari ini belum tiba. Pod akan mencair dan berbunga saat harinya datang.",
      tone: "bg-[#EBF3F9] border-[#B8D4E8] text-[#1B4F7A]",
    };
  }
  switch (status) {
    case "completed_safe":
      return {
        name: "Pod Taman Berbunga",
        meaning: isKid
          ? "Hari selesai dengan cerita yang tertulis. Bunga mekar di jalurmu!"
          : "Hari selesai dengan pengeluaran aman, masih di dalam batas harian.",
        tone: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]",
      };
    case "completed_warn":
      return {
        name: "Pod Kuning Waspada",
        meaning: "Hari tercatat, tetapi pengeluaran melewati batas aman harian. Hati-hati besok ya.",
        tone: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]",
      };
    case "active_today":
      return {
        name: "Pod Hari Ini",
        meaning: isKid
          ? "Posisimu sekarang. Tulis satu cerita agar pod ini berbunga."
          : "Posisimu sekarang. Catat kas hari ini agar pod ini berbunga.",
        tone: "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]",
      };
    default:
      return {
        name: "Pod Kristal Beku",
        meaning: isKid ? "Hari terlewat tanpa cerita, jadi jalurnya membeku." : "Hari terlewat tanpa catatan, jadi jalurnya membeku.",
        tone: "bg-[#EBF3F9] border-[#B8D4E8] text-[#1B4F7A]",
      };
  }
}

/* ───────────────────────── Legenda ───────────────────────── */

const LEGEND: { status: StoneStatus; short: string; adult: string; kid: string }[] = [
  { status: "completed_safe", short: "Taman Berbunga", adult: "Aman", kid: "Ada cerita" },
  { status: "completed_warn", short: "Kuning Waspada", adult: "Melewati batas", kid: "Melewati batas" },
  { status: "missed_frozen", short: "Kristal Beku", adult: "Tanpa catatan", kid: "Tanpa cerita" },
  { status: "active_today", short: "Pod Hari Ini", adult: "Posisimu", kid: "Posisimu" },
];

export function PodLegend({ isKid }: { isKid: boolean }) {
  const items = isKid ? LEGEND.filter((l) => l.status !== "completed_warn") : LEGEND;
  return (
    <div
      role="list"
      aria-label="Legenda jenis pod"
      className={cn("grid gap-2 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] p-2.5", isKid ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}
    >
      {items.map((l) => (
        <div key={l.status} role="listitem" className="flex items-center gap-2 min-w-0 rounded-xl bg-white border border-[#E6DFD2] px-2 py-1.5">
          <SteppingStoneNode status={l.status} className="w-9 h-8 shrink-0" title={l.short} />
          <div className="min-w-0">
            <p className="text-[11px] font-display font-extrabold text-[#3D352E] leading-tight break-words">{l.short}</p>
            <p className="text-[10px] font-bold text-[#7A6E65] leading-tight break-words">{isKid ? l.kid : l.adult}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Popover ───────────────────────── */

export function PodPopover({ pod, isKid, onClose }: { pod: PodSummary; isKid: boolean; onClose: () => void }) {
  const copy = podCopy(pod.status, pod.isFuture, isKid);
  const firstStory = pod.stories[0];
  return (
    <motion.div
      role="dialog"
      aria-label={`Perjalanan Hari ke-${pod.dayIndex}`}
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="absolute z-30 bottom-3 left-3 right-[8.75rem] sm:right-auto sm:w-[22rem] rounded-3xl bg-white/98 border-2 border-[#38B6FF] border-b-[5px] border-b-[#1E88E5] shadow-lg p-3.5 space-y-2 min-w-0"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">Perjalanan Hari ke-{pod.dayIndex}</p>
          <p className="text-[11px] font-bold text-[#7A6E65] leading-snug break-words">{mediumDateLabel(pod.dateStr)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup info pod"
          className="p-1 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[#3D352E] cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={cn("rounded-2xl border px-2.5 py-1.5 space-y-0.5", copy.tone)}>
        <p className="text-xs font-display font-extrabold leading-snug break-words">{copy.name}</p>
        <p className="text-[11px] font-bold leading-snug break-words">{copy.meaning}</p>
      </div>

      {!pod.isFuture && (
        <div className="text-[11px] font-bold text-[#3D352E] space-y-0.5 leading-snug">
          {isKid ? (
            <>
              <p className="break-words">
                {firstStory
                  ? <><GlyphInline name="book_open" /> {pod.stories.length} cerita: “{firstStory.title}”{firstStory.emotion ? ` • perasaan ${EMOTION_LABEL[firstStory.emotion].toLowerCase()}` : ""}</>
                  : <><GlyphInline name="book_open" /> Belum ada cerita di hari ini.</>}
              </p>
              {pod.totalSaved > 0 && <p className="text-[#1565C0] tabular-nums"><GlyphInline name="piggy" /> Menabung {formatCompactRupiah(pod.totalSaved)}</p>}
            </>
          ) : (
            <>
              <p className="tabular-nums break-words">
                {pod.cashCount > 0
                  ? <><GlyphInline name="receipt" /> {pod.cashCount} catatan • keluar {formatCompactRupiah(pod.totalSpent)}{pod.totalIncome > 0 ? ` • masuk ${formatCompactRupiah(pod.totalIncome)}` : ""}</>
                  : <><GlyphInline name="receipt" /> Belum ada catatan kas.</>}
              </p>
              {pod.totalSaved > 0 && <p className="text-[#1565C0] tabular-nums"><GlyphInline name="piggy" /> Menabung {formatCompactRupiah(pod.totalSaved)} (bukan pengeluaran)</p>}
              {pod.stories.length > 0 && <p className="break-words"><GlyphInline name="book_open" /> Cerita: “{firstStory.title}”</p>}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ───────────────────────── Feed harian Anak SD ───────────────────────── */

export function KidDayFeed({
  dateStr,
  stories,
  savedAmount,
  onWrite,
}: {
  dateStr: string;
  stories: StoryEntry[];
  savedAmount: number;
  onWrite: () => void;
}) {
  return (
    <CozyCard tone="white" className="space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="missions_scroll" size={26} />
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug break-words">
              Cerita Harian ({longDateLabel(dateStr)})
            </h3>
            <p className="text-xs font-bold text-[#7A6E65]">{stories.length} cerita tertulis di hari ini</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onWrite}
          className="px-3 py-2 rounded-2xl bg-[#58CC02] text-[#173300] border-b-[4px] border-b-[#46A302] active:border-b-[2px] active:translate-y-[2px] font-display text-xs font-extrabold cursor-pointer shrink-0"
        >
          <GlyphInline name="pen" /> Tulis Cerita
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-1">
          <p className="font-display text-base font-extrabold text-[#3D352E]">Belum ada cerita di tanggal ini</p>
          <p className="text-xs font-bold text-[#7A6E65]">Tulis cerita minimal 30 kata untuk menyalakan streak dan mendapat hadiah.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {stories.map((s) => (
            <article key={s.id} className="rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-white p-3.5 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {s.emotion && <EmotionWheelIcon emotion={s.emotion} size={26} />}
                <h4 className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">{s.title}</h4>
                <span className="px-2 py-0.5 rounded-lg bg-[#F8F0FF] border border-[#E2C6FF] text-[10px] font-display font-extrabold text-[#A552DB]">
                  {STORY_CATEGORY_BY_ID[s.category].label}
                </span>
              </div>
              <p className="text-xs font-bold text-[#3D352E] leading-relaxed break-words whitespace-pre-line">{s.body}</p>
              <p className="text-[10px] font-bold text-[#7A6E65] tabular-nums">{s.wordCount} kata</p>
            </article>
          ))}
        </div>
      )}

      {savedAmount > 0 && (
        <div className="p-3 rounded-2xl bg-[#EEF8FF] border-2 border-[#BCE3FF] text-xs font-bold text-[#1565C0] tabular-nums">
          <GlyphInline name="piggy" /> Kamu menabung {formatRupiah(savedAmount)} di hari ini. Keren!
        </div>
      )}
    </CozyCard>
  );
}

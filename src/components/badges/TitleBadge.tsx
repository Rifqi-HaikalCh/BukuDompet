"use client";

/**
 * Badge Gelar (Versi 5.3): tulisan pengenal + latar berefek. Dipakai di kartu pet, Beranda Keluarga
 * (postingan, peringkat, chat), dan Koleksi Badge. Bisa menerima `profileId` (membaca pilihan terpasang
 * dari store) atau `titleId` / `bgId` langsung (untuk pratinjau).
 */
import React from "react";
import { GlyphIcon, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  BADGE_BG_BY_ID,
  DEFAULT_BG_ID,
  DEFAULT_TITLE_ID,
  TITLE_BY_ID,
  type BadgeBgDef,
  type Rarity,
} from "@/lib/badge-catalog";
import { cn } from "@/lib/utils";

export type TitleBadgeSize = "xs" | "sm" | "md" | "lg";

const SIZE: Record<TitleBadgeSize, { pad: string; text: string; icon: number; gap: string }> = {
  xs: { pad: "px-2 py-0.5", text: "text-[10px]", icon: 11, gap: "gap-1" },
  sm: { pad: "px-2.5 py-0.5", text: "text-xs", icon: 13, gap: "gap-1" },
  md: { pad: "px-3 py-1", text: "text-sm", icon: 16, gap: "gap-1.5" },
  lg: { pad: "px-4 py-1.5", text: "text-base", icon: 20, gap: "gap-2" },
};

const RARITY_GLYPH: Record<Rarity, GlyphName> = { umum: "leaf", langka: "star", epik: "sparkle", mitos: "crown" };

export function bgStyle(bg: BadgeBgDef): React.CSSProperties {
  return {
    background: bg.pattern ? `${bg.pattern}, ${bg.gradient}` : bg.gradient,
    borderColor: bg.border,
    color: bg.text,
    // Teks putih di atas latar gelap/berpola diberi bayangan tipis supaya tetap terbaca.
    textShadow: /^#f{3,6}$/i.test(bg.text) ? "0 1px 2px rgba(0,0,0,.5)" : undefined,
  };
}

export interface TitleBadgeProps {
  profileId?: string;
  titleId?: string;
  bgId?: string;
  size?: TitleBadgeSize;
  /** Izinkan nama gelar turun ke baris kedua (kolom sempit seperti podium). */
  wrap?: boolean;
  className?: string;
}

export function TitleBadge({ profileId, titleId, bgId, size = "sm", wrap = false, className }: TitleBadgeProps) {
  const prof = useBukuDompetStore((s) => (profileId ? s.profiles.find((p) => p.id === profileId) : undefined));
  const tid = titleId ?? prof?.equippedTitleId ?? DEFAULT_TITLE_ID;
  const bid = bgId ?? prof?.equippedBadgeBgId ?? DEFAULT_BG_ID;
  const title = TITLE_BY_ID[tid] ?? TITLE_BY_ID[DEFAULT_TITLE_ID];
  const bg = BADGE_BG_BY_ID[bid] ?? BADGE_BG_BY_ID[DEFAULT_BG_ID];
  const sz = SIZE[size];
  return (
    <span
      className={cn(
        "tb inline-flex max-w-full items-center border-2 font-display font-extrabold align-middle",
        wrap ? "rounded-2xl leading-tight text-center justify-center" : "rounded-full leading-snug",
        sz.pad,
        sz.text,
        sz.gap,
        bg.fx && `tb-${bg.fx}`,
        className
      )}
      style={bgStyle(bg)}
      title={`${title.name} • ${bg.name}`}
    >
      <GlyphIcon name={RARITY_GLYPH[title.rarity]} size={sz.icon} className="shrink-0" />
      <span className={wrap ? "break-words min-w-0" : "truncate"}>{title.name}</span>
    </span>
  );
}

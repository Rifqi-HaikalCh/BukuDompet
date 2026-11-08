"use client";

/**
 * Hewan & simbol bioma kustom untuk Arcade Sekolah (menggantikan emoji OS).
 * Gaya sama dengan GlyphIcons: garis #3D352E, pastel duotone, viewBox 48×48.
 * Dipakai oleh mode "Siluet Hewan" (siluet dibuat dengan CSS `filter: brightness(0)`)
 * dan "Kartu Memori Bioma".
 */

import type { ReactNode } from "react";
import { GLYPH_INK } from "./GlyphIcons";

const C = {
  grey: "#B9B2A6",
  greyLight: "#DDD7CB",
  peach: "#FFB5A8",
  coral: "#FF8B7B",
  honey: "#FFC800",
  honeySoft: "#FFE08A",
  matcha: "#58CC02",
  matchaSoft: "#9BE564",
  sky: "#38B6FF",
  skySoft: "#BCE3FF",
  taro: "#CE82FF",
  cream: "#FFFDF9",
  cocoa: "#8A5A3C",
  cocoaSoft: "#C99A6B",
  orange: "#FFA24C",
  black: "#4A4540",
} as const;

const L = { stroke: GLYPH_INK, strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const eye = (x: number, y: number, r = 1.8) => <circle cx={x} cy={y} r={r} fill={GLYPH_INK} stroke="none" />;

export const ANIMAL_IDS = [
  "elephant",
  "giraffe",
  "turtle",
  "lion",
  "penguin",
  "monkey",
  "rabbit",
  "owl",
  "duck",
  "bee",
  "crab",
  "dolphin",
] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

const ANIMALS: Record<AnimalId, () => ReactNode> = {
  elephant: () => (
    <g {...L}>
      <circle cx="12" cy="22" r="9" fill={C.greyLight} />
      <circle cx="26" cy="22" r="14" fill={C.grey} />
      <path d="M32 26 Q44 28 42 40 Q41 44 37 42 Q38 36 32 34Z" fill={C.grey} />
      <circle cx="26" cy="22" r="14" fill="none" />
      <path d="M24 34 Q18 36 18 42" fill="none" />
      {eye(24, 19)}
      <path d="M36 30 Q39 31 39 34" fill="none" stroke={C.cream} strokeWidth={2} />
    </g>
  ),
  giraffe: () => (
    <g {...L}>
      <path d="M40 30 Q46 32 44 40" fill="none" />
      <rect x="9" y="34" width="5" height="10" rx="2" fill={C.honeySoft} />
      <rect x="16" y="34" width="5" height="10" rx="2" fill={C.honeySoft} />
      <rect x="28" y="34" width="5" height="10" rx="2" fill={C.honeySoft} />
      <rect x="35" y="34" width="5" height="10" rx="2" fill={C.honeySoft} />
      <ellipse cx="25" cy="32" rx="16" ry="8" fill={C.honeySoft} />
      <path d="M9 30 L13 8 H20 L24 30Z" fill={C.honeySoft} />
      <ellipse cx="14" cy="7" rx="9" ry="5.5" fill={C.honeySoft} />
      <path d="M10 2 V-1 M17 2 V-1" />
      <circle cx="10" cy="-1" r="1.6" fill={C.cocoa} />
      <circle cx="17" cy="-1" r="1.6" fill={C.cocoa} />
      <circle cx="17" cy="30" r="2.6" fill={C.cocoaSoft} stroke="none" />
      <circle cx="28" cy="31" r="2.6" fill={C.cocoaSoft} stroke="none" />
      <circle cx="14" cy="18" r="2.2" fill={C.cocoaSoft} stroke="none" />
      {eye(13, 6, 1.5)}
    </g>
  ),
  turtle: () => (
    <g {...L}>
      <path d="M36 28 Q46 26 44 34 Q42 38 36 36Z" fill={C.matchaSoft} />
      <rect x="10" y="34" width="7" height="8" rx="3" fill={C.matchaSoft} />
      <rect x="28" y="34" width="7" height="8" rx="3" fill={C.matchaSoft} />
      <path d="M6 36 Q6 14 24 14 Q42 14 42 36Z" fill={C.matcha} />
      <path d="M15 36 L18 22 H30 L33 36 M18 22 L24 14 L30 22" fill="none" stroke={C.cream} strokeWidth={2.2} />
      {eye(41, 30, 1.5)}
    </g>
  ),
  lion: () => (
    <g {...L}>
      <path d="M24.0 3.0 L27.3 7.3 L32.0 4.6 L33.4 9.9 L38.8 9.2 L38.1 14.6 L43.4 16.0 L40.7 20.7 L45.0 24.0 L40.7 27.3 L43.4 32.0 L38.1 33.4 L38.8 38.8 L33.4 38.1 L32.0 43.4 L27.3 40.7 L24.0 45.0 L20.7 40.7 L16.0 43.4 L14.6 38.1 L9.2 38.8 L9.9 33.4 L4.6 32.0 L7.3 27.3 L3.0 24.0 L7.3 20.7 L4.6 16.0 L9.9 14.6 L9.2 9.2 L14.6 9.9 L16.0 4.6 L20.7 7.3Z" fill={C.orange} />
      <circle cx="24" cy="26" r="12" fill={C.honeySoft} />
      <circle cx="15" cy="16" r="4" fill={C.honeySoft} />
      <circle cx="33" cy="16" r="4" fill={C.honeySoft} />
      {eye(19, 24)}
      {eye(29, 24)}
      <path d="M22 29 H26 L24 32Z" fill={C.coral} />
      <path d="M24 32 Q20 36 17 33 M24 32 Q28 36 31 33" fill="none" strokeWidth={2.2} />
    </g>
  ),
  penguin: () => (
    <g {...L}>
      <ellipse cx="24" cy="26" rx="14" ry="18" fill={C.black} />
      <ellipse cx="24" cy="30" rx="9" ry="13" fill={C.cream} />
      <path d="M10 26 Q4 32 8 38 Q12 34 12 30Z" fill={C.black} />
      <path d="M38 26 Q44 32 40 38 Q36 34 36 30Z" fill={C.black} />
      <path d="M20 21 L24 25 L28 21 Q24 18 20 21Z" fill={C.honey} />
      {eye(19, 17, 1.6)}
      {eye(29, 17, 1.6)}
      <path d="M16 44 H22 M26 44 H32" stroke={C.orange} strokeWidth={4} />
    </g>
  ),
  monkey: () => (
    <g {...L}>
      <circle cx="8" cy="22" r="6" fill={C.cocoaSoft} />
      <circle cx="40" cy="22" r="6" fill={C.cocoaSoft} />
      <circle cx="24" cy="22" r="16" fill={C.cocoa} />
      <path d="M12 22 Q12 14 24 14 Q36 14 36 22 Q36 34 24 36 Q12 34 12 22Z" fill={C.honeySoft} />
      {eye(19, 21)}
      {eye(29, 21)}
      <path d="M20 29 Q24 33 28 29" fill="none" />
      <circle cx="22" cy="26" r="1" fill={GLYPH_INK} stroke="none" />
      <circle cx="26" cy="26" r="1" fill={GLYPH_INK} stroke="none" />
    </g>
  ),
  rabbit: () => (
    <g {...L}>
      <ellipse cx="17" cy="11" rx="4.6" ry="10" fill={C.cream} />
      <ellipse cx="31" cy="11" rx="4.6" ry="10" fill={C.cream} />
      <ellipse cx="17" cy="12" rx="2" ry="6" fill={C.peach} stroke="none" />
      <ellipse cx="31" cy="12" rx="2" ry="6" fill={C.peach} stroke="none" />
      <ellipse cx="24" cy="31" rx="15" ry="13" fill={C.cream} />
      {eye(18, 29)}
      {eye(30, 29)}
      <path d="M22 33 H26 L24 35Z" fill={C.coral} />
      <path d="M24 35 V37 M24 37 Q21 40 19 38 M24 37 Q27 40 29 38" fill="none" strokeWidth={2} />
    </g>
  ),
  owl: () => (
    <g {...L}>
      <path d="M10 14 L14 6 L20 11 H28 L34 6 L38 14 V32 Q38 43 24 43 Q10 43 10 32Z" fill={C.cocoaSoft} />
      <circle cx="17" cy="21" r="7" fill={C.cream} />
      <circle cx="31" cy="21" r="7" fill={C.cream} />
      {eye(17, 21, 2.8)}
      {eye(31, 21, 2.8)}
      <path d="M22 26 L24 30 L26 26Z" fill={C.honey} />
    </g>
  ),
  duck: () => (
    <g {...L}>
      <path d="M8 30 Q8 42 22 42 H32 Q42 42 42 30 Q42 24 34 26 Q36 14 26 12 Q16 12 16 22 Q8 22 8 30Z" fill={C.honey} />
      <path d="M12 8 Q12 4 18 4 Q26 4 26 12 Q26 20 18 20 Q12 20 12 14Z" fill={C.honey} />
      <path d="M4 11 H12 L10 16 H4Z" fill={C.orange} />
      {eye(18, 10, 1.6)}
      <path d="M26 30 Q32 26 36 32 Q32 38 26 34" fill={C.honeySoft} />
    </g>
  ),
  bee: () => (
    <g {...L}>
      <ellipse cx="15" cy="15" rx="8" ry="11" fill={C.skySoft} transform="rotate(-25 15 15)" />
      <ellipse cx="29" cy="12" rx="8" ry="11" fill={C.skySoft} transform="rotate(20 29 12)" />
      <ellipse cx="24" cy="30" rx="15" ry="12" fill={C.honey} />
      <path d="M19 19 Q17 30 20 41 M28 19 Q30 30 28 41" fill="none" strokeWidth={5} stroke={C.black} />
      <path d="M38 28 L45 29" fill="none" />
      {eye(12, 27, 1.5)}
    </g>
  ),
  crab: () => (
    <g {...L}>
      <path d="M8 22 Q2 16 6 9 Q12 11 12 18Z" fill={C.coral} />
      <path d="M40 22 Q46 16 42 9 Q36 11 36 18Z" fill={C.coral} />
      <ellipse cx="24" cy="28" rx="16" ry="11" fill={C.coral} />
      <path d="M10 34 L5 40 M15 38 L12 44 M33 38 L36 44 M38 34 L43 40" fill="none" />
      <path d="M18 18 V14 M30 18 V14" />
      <circle cx="18" cy="13" r="3" fill={C.cream} />
      <circle cx="30" cy="13" r="3" fill={C.cream} />
      {eye(18, 13, 1.2)}
      {eye(30, 13, 1.2)}
      <path d="M20 30 Q24 34 28 30" fill="none" strokeWidth={2.2} />
    </g>
  ),
  dolphin: () => (
    <g {...L}>
      <path d="M4 34 Q10 14 28 14 Q38 14 40 6 Q46 16 42 26 Q38 38 22 40 Q14 40 4 34Z" fill={C.sky} />
      <path d="M12 36 Q26 40 38 28" fill="none" stroke={C.cream} strokeWidth={3} />
      <path d="M4 34 L1 40 L9 37" fill={C.sky} />
      <path d="M22 40 L18 46 L28 41Z" fill={C.sky} />
      {eye(30, 20, 1.6)}
    </g>
  ),
};

export function AnimalGlyph({ id, size = 64, className }: { id: AnimalId; size?: number; className?: string }) {
  const Art = ANIMALS[id];
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true" focusable="false" style={{ display: "inline-block" }}>
      <Art />
    </svg>
  );
}

export const BIOME_GLYPH_IDS = ["forest", "cactus", "blossom", "maple", "snow", "wave", "volcano", "island"] as const;
export type BiomeGlyphId = (typeof BIOME_GLYPH_IDS)[number];

const BIOMES: Record<BiomeGlyphId, () => ReactNode> = {
  forest: () => (
    <g {...L}>
      <rect x="21" y="34" width="6" height="9" rx="2" fill={C.cocoaSoft} />
      <path d="M24 4 L35 20 H29 L39 34 H9 L19 20 H13Z" fill={C.matcha} />
      <path d="M24 10 L30 19 M19 30 L16 33" fill="none" stroke={C.matchaSoft} strokeWidth={2.4} />
    </g>
  ),
  cactus: () => (
    <g {...L}>
      <path d="M17 44 V16 Q17 8 24 8 Q31 8 31 16 V44Z" fill={C.matcha} />
      <path d="M17 30 H11 Q8 30 8 26 V18 Q8 15 11 15 Q14 15 14 18 V24 H17" fill={C.matcha} />
      <path d="M31 24 H37 Q40 24 40 20 V14 Q40 11 37 11 Q34 11 34 14 V18 H31" fill={C.matcha} />
      <path d="M22 18 V38 M26 18 V38" fill="none" stroke={C.matchaSoft} strokeWidth={2} />
      <circle cx="24" cy="7" r="3" fill={C.coral} />
      <path d="M10 44 H38" />
    </g>
  ),
  blossom: () => (
    <g {...L}>
      <circle cx="24" cy="10" r="7" fill={C.peach} />
      <circle cx="38" cy="20" r="7" fill={C.peach} />
      <circle cx="33" cy="36" r="7" fill={C.peach} />
      <circle cx="15" cy="36" r="7" fill={C.peach} />
      <circle cx="10" cy="20" r="7" fill={C.peach} />
      <circle cx="24" cy="24" r="6" fill={C.honey} />
    </g>
  ),
  maple: () => (
    <g {...L}>
      <path d="M24 3 L28 12 L36 9 L33 19 L43 20 L35 28 L41 34 L30 34 L30 38 L26 36 L24 44 L22 36 L18 38 L18 34 L7 34 L13 28 L5 20 L15 19 L12 9 L20 12Z" fill={C.coral} />
      <path d="M24 44 V20 M24 28 L15 22 M24 28 L33 22" fill="none" stroke={C.cream} strokeWidth={2} />
    </g>
  ),
  snow: () => (
    <g stroke={C.sky} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M24 5 V43 M7.5 14.5 L40.5 33.5 M7.5 33.5 L40.5 14.5" />
      <path d="M18 9 L24 14 L30 9 M18 39 L24 34 L30 39" strokeWidth={3} />
    </g>
  ),
  wave: () => (
    <g {...L}>
      <path d="M4 30 Q8 16 18 14 Q28 12 30 20 Q24 20 24 26 Q30 28 36 22 Q44 22 44 34 Q44 42 36 42 H12 Q4 42 4 30Z" fill={C.sky} />
      <path d="M8 36 Q14 32 20 36 T32 36" fill="none" stroke={C.cream} strokeWidth={2.6} />
    </g>
  ),
  volcano: () => (
    <g {...L}>
      <path d="M5 42 L18 16 H30 L43 42Z" fill={C.cocoaSoft} />
      <path d="M18 16 L21 22 L25 18 L28 23 L30 16Z" fill={C.coral} />
      <circle cx="22" cy="8" r="4" fill={C.greyLight} />
      <circle cx="30" cy="5" r="3" fill={C.greyLight} />
      <path d="M24 22 V34" fill="none" stroke={C.orange} strokeWidth={3} />
    </g>
  ),
  island: () => (
    <g {...L}>
      <path d="M24 28 L26 12" fill="none" strokeWidth={3.2} />
      <path d="M10 18 Q16 4 26 12 Q36 4 40 16 Q32 10 26 14 Q18 10 10 18Z" fill={C.matcha} />
      <path d="M6 36 Q24 22 42 36Z" fill={C.honeySoft} />
      <path d="M3 41 Q10 37 17 41 T31 41 T45 41" fill="none" stroke={C.sky} strokeWidth={3.4} />
    </g>
  ),
};

export function BiomeGlyph({ id, size = 48, className }: { id: BiomeGlyphId; size?: number; className?: string }) {
  const Art = BIOMES[id];
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true" focusable="false" style={{ display: "inline-block" }}>
      <Art />
    </svg>
  );
}

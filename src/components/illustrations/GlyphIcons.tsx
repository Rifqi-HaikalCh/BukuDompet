"use client";

/**
 * GlyphIcons (Versi 5.1) — ikon kustom BukuDompet pengganti emoji OS & Lucide.
 *
 * Dua keluarga, satu gaya (garis tepi hangat #3D352E, ujung bulat, pastel duotone):
 *  - UI glyph   : bergaris tebal berwarna `currentColor` (tutup, centang, panah, dst.)
 *                 sehingga otomatis mengikuti warna teks tombol.
 *  - Tematik    : duotone berwarna (celengan, hadiah, buku, piala, dst.).
 *
 * Pakai:
 *   <GlyphIcon name="piggy" size={24} />
 *   <GlyphIcon name="close" className="w-4 h-4" />       // ukuran lewat className
 *
 * Semua viewBox 0 0 48 48, tanpa id/gradient/clipPath → aman diulang & aman SSR.
 * Dekoratif (aria-hidden) kecuali `title` diberikan.
 */

import type { ReactNode } from "react";

export const GLYPH_INK = "#3D352E";

const P = {
  peach: "#FFB5A8",
  coral: "#FF8B7B",
  honey: "#FFC800",
  honeySoft: "#FFE08A",
  matcha: "#58CC02",
  matchaSoft: "#9BE564",
  sky: "#38B6FF",
  skySoft: "#BCE3FF",
  taro: "#CE82FF",
  taroSoft: "#E2C6FF",
  cream: "#FFFDF9",
  cocoa: "#8A5A3C",
  cocoaSoft: "#C99A6B",
  red: "#FF4B4B",
  grey: "#D4C9B4",
} as const;

const L = {
  stroke: GLYPH_INK,
  strokeWidth: 2.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Garis UI: mengikuti warna teks. */
const U = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 4.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* ───────────────────────── Glyph UI (currentColor) ───────────────────────── */

const UI_GLYPHS = {
  close: () => <path d="M12 12 L36 36 M36 12 L12 36" {...U} />,
  check: () => <path d="M10 25 L20 35 L38 14" {...U} />,
  plus: () => <path d="M24 9 V39 M9 24 H39" {...U} />,
  minus: () => <path d="M10 24 H38" {...U} />,
  chevron_up: () => <path d="M10 31 L24 17 L38 31" {...U} />,
  chevron_down: () => <path d="M10 17 L24 31 L38 17" {...U} />,
  chevron_left: () => <path d="M31 10 L17 24 L31 38" {...U} />,
  chevron_right: () => <path d="M17 10 L31 24 L17 38" {...U} />,
  arrow_right: () => <path d="M8 24 H38 M26 12 L38 24 L26 36" {...U} />,
  trash: () => (
    <g {...U}>
      <path d="M8 13 H40" />
      <path d="M18 13 V8 H30 V13" />
      <path d="M12 13 L14 40 H34 L36 13" />
      <path d="M20 21 V32 M28 21 V32" />
    </g>
  ),
  pencil: () => (
    <g {...U}>
      <path d="M9 39 L11 29 L31 9 L39 17 L19 37 Z" />
      <path d="M27 13 L35 21" />
    </g>
  ),
  send: () => (
    <g {...U}>
      <path d="M41 7 L6 20 L19 27 Z" />
      <path d="M41 7 L22 41 L19 27" />
    </g>
  ),
  volume_on: () => (
    <g {...U}>
      <path d="M8 18 H15 L25 9 V39 L15 30 H8 Z" />
      <path d="M32 17 Q37 24 32 31" />
      <path d="M37 11 Q46 24 37 37" />
    </g>
  ),
  volume_off: () => (
    <g {...U}>
      <path d="M8 18 H15 L25 9 V39 L15 30 H8 Z" />
      <path d="M33 18 L43 30 M43 18 L33 30" />
    </g>
  ),
  user: () => (
    <g {...U}>
      <circle cx="24" cy="16" r="8" />
      <path d="M8 41 Q8 28 24 28 Q40 28 40 41" />
    </g>
  ),
  user_plus: () => (
    <g {...U}>
      <circle cx="19" cy="16" r="8" />
      <path d="M4 41 Q4 28 19 28 Q28 28 33 33" />
      <path d="M37 22 V38 M29 30 H45" />
    </g>
  ),
  locate: () => (
    <g {...U}>
      <circle cx="24" cy="24" r="10" />
      <path d="M24 4 V10 M24 38 V44 M4 24 H10 M38 24 H44" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </g>
  ),
  archive: () => (
    <g {...U}>
      <rect x="6" y="9" width="36" height="9" rx="2" />
      <path d="M10 18 V39 H38 V18" />
      <path d="M19 26 H29" />
    </g>
  ),
  delete_key: () => (
    <g {...U}>
      <path d="M17 10 H42 V38 H17 L5 24 Z" />
      <path d="M24 18 L34 30 M34 18 L24 30" />
    </g>
  ),
  image_plus: () => (
    <g {...U}>
      <path d="M26 8 H10 Q6 8 6 12 V36 Q6 40 10 40 H34 Q38 40 38 36 V24" />
      <path d="M6 33 L16 23 L25 32" />
      <path d="M38 6 V18 M32 12 H44" />
    </g>
  ),
  shield_check: () => (
    <g {...U}>
      <path d="M24 5 L40 11 V23 Q40 36 24 43 Q8 36 8 23 V11 Z" />
      <path d="M16 24 L22 30 L32 18" />
    </g>
  ),
  refresh: () => (
    <g {...U}>
      <path d="M39 20 A15 15 0 0 0 11 16" />
      <path d="M39 8 V20 H27" />
      <path d="M9 28 A15 15 0 0 0 37 32" />
      <path d="M9 40 V28 H21" />
    </g>
  ),
  cross: () => <path d="M12 12 L36 36 M36 12 L12 36" {...U} />,
  users: () => (
    <g {...U}>
      <circle cx="17" cy="16" r="7" />
      <path d="M4 40 Q4 28 17 28 Q30 28 30 40" />
      <circle cx="33" cy="17" r="6" />
      <path d="M33 28 Q44 28 44 39" />
    </g>
  ),
  square: () => <rect x="9" y="9" width="30" height="30" rx="8" {...U} />,
  check_square: () => (
    <g {...U}>
      <rect x="9" y="9" width="30" height="30" rx="8" />
      <path d="M17 24 L22 29 L32 18" />
    </g>
  ),
  sort: () => <path d="M12 14 H36 M12 24 H30 M12 34 H24" {...U} />,
} satisfies Record<string, () => ReactNode>;

/* ───────────────────────── Glyph tematik (duotone) ───────────────────────── */

const ART_GLYPHS = {
  piggy: () => (
    <g {...L}>
      <path d="M33 14 L38 8 L40 18Z" fill={P.coral} />
      <ellipse cx="22" cy="27" rx="16" ry="13" fill={P.peach} />
      <rect x="11" y="35" width="7" height="8" rx="3" fill={P.coral} />
      <rect x="28" y="35" width="7" height="8" rx="3" fill={P.coral} />
      <ellipse cx="38" cy="28" rx="6" ry="5" fill={P.coral} />
      <circle cx="36.5" cy="28" r="1" fill={GLYPH_INK} stroke="none" />
      <circle cx="39.8" cy="28" r="1" fill={GLYPH_INK} stroke="none" />
      <circle cx="31" cy="22" r="1.8" fill={GLYPH_INK} stroke="none" />
      <path d="M14 19 H24" />
      <path d="M6 26 Q3 25 4 22" fill="none" />
      <circle cx="19" cy="9" r="6" fill={P.honey} />
      <path d="M17 9 H21" />
    </g>
  ),
  gift: () => (
    <g {...L}>
      <rect x="8" y="22" width="32" height="20" rx="3" fill={P.coral} />
      <rect x="6" y="15" width="36" height="9" rx="3" fill={P.peach} />
      <rect x="21" y="15" width="6" height="27" fill={P.honey} />
      <path d="M24 15 C18 6 9 8 13 14 C15 16 20 15 24 15Z" fill={P.honey} />
      <path d="M24 15 C30 6 39 8 35 14 C33 16 28 15 24 15Z" fill={P.honey} />
    </g>
  ),
  check_circle: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="18" fill={P.matchaSoft} />
      <path d="M14 25 L21 32 L34 17" fill="none" stroke={P.cream} strokeWidth={5.2} />
      <path d="M14 25 L21 32 L34 17" fill="none" strokeWidth={2} opacity={0.35} />
    </g>
  ),
  party: () => (
    <g {...L}>
      <path d="M7 42 L15 16 L32 33Z" fill={P.honey} />
      <path d="M11 31 L20 34 M13 24 L25 29" fill="none" />
      <path d="M26 12 Q30 6 34 10" fill="none" stroke={P.sky} strokeWidth={3} />
      <path d="M33 22 Q41 20 42 14" fill="none" stroke={P.taro} strokeWidth={3} />
      <circle cx="38" cy="30" r="2.4" fill={P.coral} stroke="none" />
      <circle cx="22" cy="6" r="2.2" fill={P.matcha} stroke="none" />
      <circle cx="42" cy="6" r="2" fill={P.honey} stroke="none" />
    </g>
  ),
  sparkle: () => (
    <g {...L}>
      <path d="M22 5 L26 18 L39 22 L26 26 L22 39 L18 26 L5 22 L18 18Z" fill={P.honey} />
      <path d="M38 6 L40 11 L45 13 L40 15 L38 20 L36 15 L31 13 L36 11Z" fill={P.honeySoft} />
    </g>
  ),
  pen: () => (
    <g {...L}>
      <path d="M8 37 L10 28 L30 8 L38 16 L18 36Z" fill={P.honey} />
      <path d="M30 8 L38 16 L41 13 Q43 10 40 7 L39 6 Q36 3 33 5Z" fill={P.coral} />
      <path d="M8 37 L10 28 L18 36Z" fill={P.cream} />
      <path d="M6 44 Q12 40 18 44 T30 44" fill="none" />
    </g>
  ),
  books: () => (
    <g {...L}>
      <rect x="7" y="8" width="11" height="32" rx="2" fill={P.sky} />
      <rect x="19" y="12" width="10" height="28" rx="2" fill={P.coral} />
      <rect x="30" y="8" width="11" height="32" rx="2" fill={P.matchaSoft} transform="rotate(8 35 24)" />
      <path d="M9 15 H16 M21 18 H27" fill="none" />
      <path d="M5 42 H43" />
    </g>
  ),
  book_open: () => (
    <g {...L}>
      <path d="M24 12 Q14 7 5 10 V37 Q14 34 24 39Z" fill={P.cream} />
      <path d="M24 12 Q34 7 43 10 V37 Q34 34 24 39Z" fill={P.skySoft} />
      <path d="M9 17 Q15 16 20 18 M9 23 Q15 22 20 24 M28 18 Q33 16 39 17 M28 24 Q33 22 39 23" fill="none" strokeWidth={2} />
    </g>
  ),
  sprout: () => (
    <g {...L}>
      <path d="M24 42 V22" fill="none" strokeWidth={3.2} />
      <path d="M24 26 C10 28 6 16 8 10 C20 10 25 16 24 26Z" fill={P.matcha} />
      <path d="M24 22 C26 12 34 8 41 9 C42 19 34 25 24 22Z" fill={P.matchaSoft} />
      <path d="M16 42 H32" fill="none" />
    </g>
  ),
  snowflake: () => (
    <g stroke={P.sky} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M24 5 V43 M7.5 14.5 L40.5 33.5 M7.5 33.5 L40.5 14.5" />
      <path d="M18 9 L24 14 L30 9 M18 39 L24 34 L30 39" strokeWidth={3} />
    </g>
  ),
  receipt: () => (
    <g {...L}>
      <path d="M10 5 H38 V43 L33 39 L28 43 L24 39 L20 43 L15 39 L10 43Z" fill={P.cream} />
      <path d="M16 14 H32 M16 21 H32 M16 28 H26" fill="none" />
      <path d="M30 28 H32" fill="none" stroke={P.coral} />
    </g>
  ),
  coin: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="17" fill={P.honey} />
      <circle cx="24" cy="24" r="11" fill={P.honeySoft} />
      <path d="M20 17 V31 M20 18 H26 Q30 18 30 22 Q30 26 26 26 H20 M25 26 L30 31" fill="none" strokeWidth={2.4} />
    </g>
  ),
  chat: () => (
    <g {...L}>
      <path d="M8 9 H40 Q43 9 43 12 V30 Q43 33 40 33 H25 L15 42 V33 H8 Q5 33 5 30 V12 Q5 9 8 9Z" fill={P.taroSoft} />
      <circle cx="16" cy="21" r="2.4" fill={GLYPH_INK} stroke="none" />
      <circle cx="24" cy="21" r="2.4" fill={GLYPH_INK} stroke="none" />
      <circle cx="32" cy="21" r="2.4" fill={GLYPH_INK} stroke="none" />
    </g>
  ),
  letter: () => (
    <g {...L}>
      <rect x="5" y="10" width="38" height="28" rx="4" fill={P.cream} />
      <path d="M6 13 L24 27 L42 13" fill="none" />
      <path d="M24 38 C16 32 18 26 22 27 C24 28 24 29 24 29 C24 29 24 28 26 27 C30 26 32 32 24 38Z" fill={P.coral} transform="translate(0 -4) scale(1)" />
    </g>
  ),
  trophy: () => (
    <g {...L}>
      <path d="M14 7 H34 V20 Q34 30 24 31 Q14 30 14 20Z" fill={P.honey} />
      <path d="M14 11 H7 Q7 22 15 24 M34 11 H41 Q41 22 33 24" fill="none" />
      <path d="M24 31 V37" />
      <rect x="14" y="37" width="20" height="6" rx="2" fill={P.cocoaSoft} />
      <path d="M19 12 Q19 18 21 21" fill="none" stroke={P.cream} strokeWidth={3} />
    </g>
  ),
  pin: () => (
    <g {...L}>
      <path d="M24 44 C14 32 10 26 10 19 A14 14 0 0 1 38 19 C38 26 34 32 24 44Z" fill={P.coral} />
      <circle cx="24" cy="19" r="5.5" fill={P.cream} />
    </g>
  ),
  magnifier: () => (
    <g {...L}>
      <circle cx="20" cy="20" r="13" fill={P.skySoft} />
      <path d="M13 15 Q15 11 20 10" fill="none" stroke={P.cream} strokeWidth={3} />
      <path d="M30 30 L42 42" strokeWidth={6} />
      <path d="M30 30 L42 42" stroke={P.cocoaSoft} strokeWidth={2.6} />
    </g>
  ),
  gender_male: () => (
    <g {...L} fill="none" stroke={P.sky} strokeWidth={4.2}>
      <circle cx="20" cy="28" r="12" />
      <path d="M29 19 L42 6 M31 6 H42 V17" />
    </g>
  ),
  gender_female: () => (
    <g {...L} fill="none" stroke={P.coral} strokeWidth={4.2}>
      <circle cx="24" cy="18" r="12" />
      <path d="M24 30 V44 M17 38 H31" />
    </g>
  ),
  gender_neutral: () => (
    <g {...L} fill="none" stroke={P.taro} strokeWidth={4.2}>
      <circle cx="18" cy="24" r="11" />
      <circle cx="30" cy="24" r="11" />
    </g>
  ),
  leaf: () => (
    <g {...L}>
      <path d="M8 38 C6 18 20 6 41 7 C42 28 30 42 8 38Z" fill={P.matcha} />
      <path d="M8 38 C16 28 24 20 34 14" fill="none" stroke={P.cream} strokeWidth={2.4} />
    </g>
  ),
  music: () => (
    <g {...L}>
      <path d="M18 34 V11 L40 7 V30" fill="none" />
      <path d="M18 17 L40 13" fill="none" strokeWidth={4} />
      <ellipse cx="13" cy="35" rx="7" ry="5.5" fill={P.taro} />
      <ellipse cx="35" cy="31" rx="7" ry="5.5" fill={P.taro} />
    </g>
  ),
  sun: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="10" fill={P.honey} />
      <path d="M24 5 V10 M24 38 V43 M5 24 H10 M38 24 H43 M10.5 10.5 L14 14 M34 34 L37.5 37.5 M10.5 37.5 L14 34 M34 14 L37.5 10.5" fill="none" />
    </g>
  ),
  crown: () => (
    <g {...L}>
      <path d="M7 36 L9 14 L18 24 L24 10 L30 24 L39 14 L41 36Z" fill={P.honey} />
      <rect x="7" y="34" width="34" height="7" rx="2.5" fill={P.honeySoft} />
      <circle cx="9" cy="13" r="2.6" fill={P.coral} />
      <circle cx="24" cy="9" r="2.6" fill={P.sky} />
      <circle cx="39" cy="13" r="2.6" fill={P.coral} />
    </g>
  ),
  bulb: () => (
    <g {...L}>
      <path d="M24 5 C14 5 9 12 9 19 C9 26 15 29 17 34 H31 C33 29 39 26 39 19 C39 12 34 5 24 5Z" fill={P.honeySoft} />
      <rect x="17" y="34" width="14" height="4" rx="2" fill={P.grey} />
      <rect x="19" y="38" width="10" height="4" rx="2" fill={P.grey} />
      <path d="M17 17 Q18 12 23 11" fill="none" stroke={P.cream} strokeWidth={3} />
    </g>
  ),
  dice: () => (
    <g {...L}>
      <rect x="7" y="7" width="34" height="34" rx="8" fill={P.cream} />
      <circle cx="17" cy="17" r="3" fill={P.coral} stroke="none" />
      <circle cx="24" cy="24" r="3" fill={P.coral} stroke="none" />
      <circle cx="31" cy="31" r="3" fill={P.coral} stroke="none" />
      <circle cx="31" cy="17" r="3" fill={P.coral} stroke="none" />
      <circle cx="17" cy="31" r="3" fill={P.coral} stroke="none" />
    </g>
  ),
  wind: () => (
    <g {...L} fill="none" stroke={P.sky} strokeWidth={4}>
      <path d="M6 18 H28 Q36 18 36 12 Q36 7 31 7" />
      <path d="M6 28 H36 Q43 28 43 34 Q43 40 37 40" />
      <path d="M6 38 H20" />
    </g>
  ),
  heart: () => (
    <g {...L}>
      <path d="M24 42 C8 30 5 21 8 14 C12 7 21 8 24 15 C27 8 36 7 40 14 C43 21 40 30 24 42Z" fill={P.coral} />
      <path d="M13 16 Q15 12 19 12" fill="none" stroke={P.cream} strokeWidth={3} />
    </g>
  ),
  owl: () => (
    <g {...L}>
      <path d="M10 14 L14 7 L20 12 H28 L34 7 L38 14 V32 Q38 43 24 43 Q10 43 10 32Z" fill={P.cocoaSoft} />
      <circle cx="17" cy="21" r="7" fill={P.cream} />
      <circle cx="31" cy="21" r="7" fill={P.cream} />
      <circle cx="17" cy="21" r="2.8" fill={GLYPH_INK} stroke="none" />
      <circle cx="31" cy="21" r="2.8" fill={GLYPH_INK} stroke="none" />
      <path d="M22 26 L24 30 L26 26Z" fill={P.honey} />
      <path d="M17 36 Q24 40 31 36" fill="none" strokeWidth={2} />
    </g>
  ),
  money_bag: () => (
    <g {...L}>
      <path d="M17 8 L19 14 H29 L31 8 Q24 5 17 8Z" fill={P.honey} />
      <path d="M19 14 C8 22 6 42 24 42 C42 42 40 22 29 14Z" fill={P.honeySoft} />
      <path d="M20 24 V37 M20 24 H27 Q31 24 31 28.5 Q31 33 27 33 H20 M26 33 L31 38" fill="none" strokeWidth={2.4} />
    </g>
  ),
  wave: () => (
    <g {...L}>
      <path d="M14 26 V12 Q14 9 17 9 Q20 9 20 12 V22 M20 22 V8 Q20 5 23 5 Q26 5 26 8 V22 M26 22 V9 Q26 6 29 6 Q32 6 32 9 V24 M32 24 V15 Q32 12 35 12 Q38 12 38 15 V30 Q38 42 26 42 Q16 42 12 34 L7 25 Q6 22 9 21 Q12 21 14 24Z" fill={P.honeySoft} />
    </g>
  ),
  backpack: () => (
    <g {...L}>
      <path d="M17 11 Q17 5 24 5 Q31 5 31 11" fill="none" />
      <rect x="9" y="10" width="30" height="33" rx="9" fill={P.matcha} />
      <rect x="15" y="27" width="18" height="12" rx="4" fill={P.matchaSoft} />
      <path d="M15 20 H33" fill="none" />
      <circle cx="24" cy="33" r="1.8" fill={GLYPH_INK} stroke="none" />
    </g>
  ),
  map: () => (
    <g {...L}>
      <path d="M5 11 L17 7 L31 11 L43 7 V37 L31 41 L17 37 L5 41Z" fill={P.cream} />
      <path d="M17 7 V37 M31 11 V41" fill="none" />
      <path d="M9 30 Q14 22 21 26 T36 20" fill="none" stroke={P.coral} strokeDasharray="1 5" strokeWidth={3.2} />
      <circle cx="37" cy="19" r="2.4" fill={P.coral} stroke="none" />
    </g>
  ),
  shop_bag: () => (
    <g {...L}>
      <path d="M17 17 V13 Q17 6 24 6 Q31 6 31 13 V17" fill="none" />
      <path d="M8 16 H40 L38 42 H10Z" fill={P.peach} />
      <circle cx="18" cy="23" r="1.8" fill={GLYPH_INK} stroke="none" />
      <circle cx="30" cy="23" r="1.8" fill={GLYPH_INK} stroke="none" />
    </g>
  ),
  star: () => (
    <g {...L}>
      <path d="M24 5 L29.5 17 L42 18.5 L33 27.5 L35.5 41 L24 34.5 L12.5 41 L15 27.5 L6 18.5 L18.5 17Z" fill={P.honey} />
      <path d="M17 16 L24 9" fill="none" stroke={P.cream} strokeWidth={2.6} />
    </g>
  ),
  boba: () => (
    <g {...L}>
      <path d="M27 4 L31 14" fill="none" stroke={P.coral} strokeWidth={3.4} />
      <path d="M10 14 H38 L34 43 H14Z" fill={P.cream} />
      <path d="M12 22 H36 L34 43 H14Z" fill={P.cocoaSoft} />
      <circle cx="19" cy="38" r="2.4" fill={GLYPH_INK} stroke="none" />
      <circle cx="26" cy="39" r="2.4" fill={GLYPH_INK} stroke="none" />
      <circle cx="30" cy="35" r="2.4" fill={GLYPH_INK} stroke="none" />
      <rect x="8" y="10" width="32" height="6" rx="3" fill={P.skySoft} />
    </g>
  ),
  paw: () => (
    <g {...L}>
      <ellipse cx="10" cy="22" rx="4.6" ry="6" fill={P.coral} transform="rotate(-20 10 22)" />
      <ellipse cx="19" cy="12" rx="4.6" ry="6.4" fill={P.coral} />
      <ellipse cx="29" cy="12" rx="4.6" ry="6.4" fill={P.coral} />
      <ellipse cx="38" cy="22" rx="4.6" ry="6" fill={P.coral} transform="rotate(20 38 22)" />
      <path d="M24 24 C14 24 10 34 15 39 C19 43 22 40 24 40 C26 40 29 43 33 39 C38 34 34 24 24 24Z" fill={P.peach} />
    </g>
  ),
  tree: () => (
    <g {...L}>
      <rect x="21" y="30" width="6" height="13" rx="2" fill={P.cocoaSoft} />
      <circle cx="24" cy="19" r="14" fill={P.matcha} />
      <circle cx="17" cy="23" r="7" fill={P.matchaSoft} stroke="none" opacity={0.7} />
      <circle cx="24" cy="19" r="14" fill="none" />
    </g>
  ),
  gate: () => (
    <g {...L}>
      <path d="M4 12 Q24 6 44 12 L42 18 H6Z" fill={P.coral} />
      <rect x="9" y="18" width="5" height="25" fill={P.coral} />
      <rect x="34" y="18" width="5" height="25" fill={P.coral} />
      <rect x="9" y="24" width="30" height="5" fill={P.coral} />
    </g>
  ),
  teddy: () => (
    <g {...L}>
      <circle cx="11" cy="12" r="6" fill={P.cocoaSoft} />
      <circle cx="37" cy="12" r="6" fill={P.cocoaSoft} />
      <circle cx="24" cy="26" r="17" fill={P.cocoaSoft} />
      <ellipse cx="24" cy="31" rx="8" ry="6" fill={P.honeySoft} />
      <circle cx="17" cy="23" r="2.2" fill={GLYPH_INK} stroke="none" />
      <circle cx="31" cy="23" r="2.2" fill={GLYPH_INK} stroke="none" />
      <path d="M22 29 H26 L24 32Z" fill={GLYPH_INK} />
    </g>
  ),
  headphones: () => (
    <g {...L}>
      <path d="M8 28 V24 A16 16 0 0 1 40 24 V28" fill="none" strokeWidth={4} />
      <rect x="5" y="27" width="10" height="15" rx="4" fill={P.taro} />
      <rect x="33" y="27" width="10" height="15" rx="4" fill={P.taro} />
    </g>
  ),
  beach: () => (
    <g {...L}>
      <path d="M24 42 L26 18" fill="none" strokeWidth={3.4} />
      <path d="M8 24 Q14 8 26 18 Q38 8 42 22 Q32 14 26 20 Q18 14 8 24Z" fill={P.matcha} />
      <path d="M4 43 Q14 38 24 43 T44 43" fill="none" stroke={P.sky} strokeWidth={3.4} />
      <circle cx="38" cy="8" r="4" fill={P.honey} />
    </g>
  ),
  lifebuoy: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="17" fill={P.cream} />
      <circle cx="24" cy="24" r="7" fill={P.cream} />
      <path d="M24 7 A17 17 0 0 1 41 24 H31 A7 7 0 0 0 24 17Z" fill={P.red} />
      <path d="M24 41 A17 17 0 0 1 7 24 H17 A7 7 0 0 0 24 31Z" fill={P.red} />
    </g>
  ),
  bike: () => (
    <g {...L}>
      <circle cx="11" cy="31" r="8" fill="none" strokeWidth={3} />
      <circle cx="37" cy="31" r="8" fill="none" strokeWidth={3} />
      <path d="M11 31 L19 15 H31 L37 31 M19 15 L24 31 H11 M24 31 L31 15" fill="none" stroke={P.coral} strokeWidth={3.2} />
      <path d="M17 11 H22 M30 11 H35" />
    </g>
  ),
  flame: () => (
    <g {...L}>
      <path d="M24 5 C26 14 38 18 38 31 C38 39 32 44 24 44 C16 44 10 39 10 31 C10 24 15 20 17 14 C19 18 21 19 22 19 C22 14 22 9 24 5Z" fill={P.coral} />
      <path d="M24 44 C19 44 16 40 17 35 C18 30 22 28 24 24 C27 29 31 31 31 36 C31 41 28 44 24 44Z" fill={P.honey} />
    </g>
  ),
  rock: () => (
    <g {...L}>
      <path d="M5 40 L9 24 L20 18 L30 24 L32 40Z" fill={P.grey} />
      <path d="M26 40 L29 28 L38 24 L44 32 L43 40Z" fill={P.cocoaSoft} />
      <path d="M12 26 L19 22" fill="none" stroke={P.cream} strokeWidth={2.6} />
    </g>
  ),
  question: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="18" fill={P.taroSoft} />
      <path d="M17 19 Q17 11 24 11 Q31 11 31 18 Q31 22 27 25 Q24 27 24 31" fill="none" strokeWidth={4.2} />
      <circle cx="24" cy="38" r="2.6" fill={GLYPH_INK} stroke="none" />
    </g>
  ),
  gamepad: () => (
    <g {...L}>
      <path d="M13 14 H35 Q44 14 44 28 Q44 40 38 40 Q34 40 32 34 H16 Q14 40 10 40 Q4 40 4 28 Q4 14 13 14Z" fill={P.sky} />
      <path d="M14 22 V30 M10 26 H18" fill="none" stroke={P.cream} strokeWidth={3.4} />
      <circle cx="32" cy="24" r="2.4" fill={P.honey} />
      <circle cx="37" cy="28" r="2.4" fill={P.coral} />
    </g>
  ),
  lock: () => (
    <g {...L}>
      <path d="M15 21 V15 Q15 7 24 7 Q33 7 33 15 V21" fill="none" strokeWidth={3.4} />
      <rect x="9" y="20" width="30" height="22" rx="6" fill={P.honey} />
      <circle cx="24" cy="30" r="3.2" fill={GLYPH_INK} stroke="none" />
      <path d="M24 32 V37" />
    </g>
  ),
  unlock: () => (
    <g {...L}>
      <path d="M15 21 V15 Q15 7 24 7 Q33 7 33 13" fill="none" strokeWidth={3.4} />
      <rect x="9" y="20" width="30" height="22" rx="6" fill={P.matchaSoft} />
      <circle cx="24" cy="30" r="3.2" fill={GLYPH_INK} stroke="none" />
      <path d="M24 32 V37" />
    </g>
  ),
  house: () => (
    <g {...L}>
      <path d="M6 24 L24 8 L42 24" fill={P.coral} />
      <path d="M11 22 V42 H37 V22 L24 11Z" fill={P.cream} />
      <rect x="20" y="29" width="8" height="13" rx="2" fill={P.honey} />
    </g>
  ),
  dress: () => (
    <g {...L}>
      <path d="M17 5 L21 5 L24 11 L27 5 L31 5 L31 18 L38 42 H10 L17 18Z" fill={P.taroSoft} />
      <path d="M17 18 H31" fill="none" />
      <circle cx="24" cy="26" r="2" fill={P.coral} stroke="none" />
    </g>
  ),
  bolt: () => (
    <g {...L}>
      <path d="M27 4 L9 27 H21 L18 44 L38 19 H26Z" fill={P.honey} />
    </g>
  ),
  bento: () => (
    <g {...L}>
      <rect x="5" y="12" width="38" height="28" rx="6" fill={P.cocoaSoft} />
      <rect x="8" y="15" width="32" height="22" rx="4" fill={P.cream} />
      <path d="M24 15 V37 M24 26 H40" fill="none" />
      <circle cx="16" cy="26" r="5" fill={P.coral} />
      <rect x="28" y="18" width="9" height="5" rx="2" fill={P.matcha} />
      <rect x="28" y="29" width="9" height="5" rx="2" fill={P.honey} />
    </g>
  ),
  smile: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="18" fill={P.honeySoft} />
      <circle cx="17" cy="20" r="2.4" fill={GLYPH_INK} stroke="none" />
      <circle cx="31" cy="20" r="2.4" fill={GLYPH_INK} stroke="none" />
      <path d="M15 28 Q24 38 33 28" fill="none" strokeWidth={3} />
    </g>
  ),
  thumbs_up: () => (
    <g {...L}>
      <path d="M5 21 H13 V42 H5Z" fill={P.skySoft} />
      <path d="M13 22 L22 8 Q27 6 28 11 L26 19 H40 Q44 19 43 24 L40 38 Q39 42 35 42 H13Z" fill={P.honeySoft} />
    </g>
  ),
  clock: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="18" fill={P.cream} />
      <path d="M24 12 V24 L32 29" fill="none" strokeWidth={3.4} />
    </g>
  ),
  shield: () => (
    <g {...L}>
      <path d="M24 5 L40 11 V23 Q40 36 24 43 Q8 36 8 23 V11Z" fill={P.skySoft} />
      <path d="M24 5 L40 11 V23 Q40 36 24 43Z" fill={P.sky} opacity={0.45} stroke="none" />
      <path d="M24 5 L40 11 V23 Q40 36 24 43 Q8 36 8 23 V11Z" fill="none" />
      <path d="M17 24 L22 29 L31 18" fill="none" stroke={P.cream} strokeWidth={4} />
    </g>
  ),
  calendar: () => (
    <g {...L}>
      <rect x="6" y="9" width="36" height="33" rx="6" fill={P.cream} />
      <path d="M6 20 H42" fill="none" />
      <rect x="6" y="9" width="36" height="11" rx="6" fill={P.coral} />
      <path d="M15 5 V13 M33 5 V13" fill="none" />
      <circle cx="16" cy="29" r="2.4" fill={P.matcha} stroke="none" />
      <circle cx="24" cy="29" r="2.4" fill={P.matcha} stroke="none" />
      <circle cx="32" cy="29" r="2.4" fill={P.honey} stroke="none" />
      <circle cx="16" cy="36" r="2.4" fill={P.matcha} stroke="none" />
    </g>
  ),
  swap: () => (
    <g {...L} fill="none">
      <path d="M8 17 H36 M28 8 L37 17 L28 26" strokeWidth={4} stroke={P.sky} />
      <path d="M40 33 H12 M20 24 L11 33 L20 42" strokeWidth={4} stroke={P.coral} />
    </g>
  ),
  mailbox: () => (
    <g {...L}>
      <path d="M7 38 V22 Q7 12 18 12 H30 Q41 12 41 22 V38Z" fill={P.skySoft} />
      <rect x="15" y="22" width="18" height="4" rx="2" fill={GLYPH_INK} />
      <path d="M31 12 V5 H39 V10 H34" fill="none" />
      <path d="M24 38 V43 M15 43 H33" />
    </g>
  ),
  tag: () => (
    <g {...L}>
      <path d="M5 22 L22 5 H40 V23 L23 40 Q21 42 19 40 L5 26 Q3 24 5 22Z" fill={P.honeySoft} />
      <circle cx="32" cy="14" r="3.2" fill={P.cream} />
    </g>
  ),
  grid: () => (
    <g {...L}>
      <rect x="6" y="6" width="15" height="15" rx="4" fill={P.skySoft} />
      <rect x="27" y="6" width="15" height="15" rx="4" fill={P.peach} />
      <rect x="6" y="27" width="15" height="15" rx="4" fill={P.matchaSoft} />
      <rect x="27" y="27" width="15" height="15" rx="4" fill={P.taroSoft} />
    </g>
  ),
  eye: () => (
    <g {...L}>
      <path d="M4 24 Q24 6 44 24 Q24 42 4 24Z" fill={P.cream} />
      <circle cx="24" cy="24" r="7" fill={P.sky} />
      <circle cx="24" cy="24" r="3" fill={GLYPH_INK} stroke="none" />
    </g>
  ),
  hanger: () => (
    <g {...L}>
      <path d="M24 16 V13 Q24 8 29 8 Q33 8 33 12" fill="none" />
      <path d="M24 16 L6 32 Q4 34 6 36 H42 Q44 34 42 32Z" fill={P.taroSoft} />
    </g>
  ),
  hat: () => (
    <g {...L}>
      <path d="M13 30 Q13 10 24 10 Q35 10 35 30Z" fill={P.honeySoft} />
      <ellipse cx="24" cy="31" rx="19" ry="6" fill={P.honey} />
      <path d="M14 27 Q24 31 34 27" fill="none" stroke={P.coral} strokeWidth={3.4} />
    </g>
  ),
  shirt: () => (
    <g {...L}>
      <path d="M17 6 L5 14 L10 22 L14 20 V42 H34 V20 L38 22 L43 14 L31 6 Q24 12 17 6Z" fill={P.skySoft} />
    </g>
  ),
  glasses: () => (
    <g {...L}>
      <circle cx="13" cy="28" r="8" fill={P.skySoft} />
      <circle cx="35" cy="28" r="8" fill={P.skySoft} />
      <path d="M21 27 Q24 24 27 27 M5 26 L2 20 M43 26 L46 20" fill="none" />
    </g>
  ),
  scarf: () => (
    <g {...L}>
      <path d="M6 14 Q24 24 42 14 V24 Q24 34 6 24Z" fill={P.coral} />
      <path d="M30 27 L35 44 H25 L24 31Z" fill={P.peach} />
    </g>
  ),
  wand: () => (
    <g {...L}>
      <path d="M7 41 L29 19" fill="none" strokeWidth={5.4} />
      <path d="M7 41 L29 19" fill="none" stroke={P.cocoaSoft} strokeWidth={2.6} />
      <path d="M33 5 L35 12 L42 14 L35 16 L33 23 L31 16 L24 14 L31 12Z" fill={P.honey} />
    </g>
  ),
  aura: () => (
    <g {...L}>
      <circle cx="24" cy="24" r="8" fill={P.honeySoft} />
      <path d="M24 5 L26 11 M24 43 L26 37 M5 24 L11 22 M43 24 L37 26" fill="none" />
      <circle cx="10" cy="10" r="2.6" fill={P.taro} stroke="none" />
      <circle cx="38" cy="10" r="2.6" fill={P.sky} stroke="none" />
      <circle cx="10" cy="38" r="2.6" fill={P.matcha} stroke="none" />
      <circle cx="38" cy="38" r="2.6" fill={P.coral} stroke="none" />
    </g>
  ),
  scenery: () => (
    <g {...L}>
      <rect x="5" y="8" width="38" height="32" rx="6" fill={P.skySoft} />
      <path d="M5 33 Q15 24 24 31 T43 28 V34 Q43 40 37 40 H11 Q5 40 5 34Z" fill={P.matchaSoft} />
      <circle cx="33" cy="17" r="4" fill={P.honey} />
    </g>
  ),
  lantern: () => (
    <g {...L}>
      <path d="M24 4 V9" />
      <rect x="15" y="9" width="18" height="4" rx="2" fill={P.cocoaSoft} />
      <path d="M16 13 H32 Q38 24 32 36 H16 Q10 24 16 13Z" fill={P.coral} />
      <rect x="15" y="36" width="18" height="4" rx="2" fill={P.cocoaSoft} />
      <path d="M24 13 V36" fill="none" strokeWidth={1.8} opacity={0.5} />
    </g>
  ),
} satisfies Record<string, () => ReactNode>;

const GLYPHS = { ...UI_GLYPHS, ...ART_GLYPHS } as const;

export type GlyphName = keyof typeof GLYPHS;
export const GLYPH_NAMES = Object.keys(GLYPHS) as GlyphName[];

export interface GlyphIconProps {
  name: GlyphName;
  /** Ukuran px. Bila kosong, ukuran mengikuti `className` (mis. "w-4 h-4") atau 1em. */
  size?: number;
  className?: string;
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export function GlyphIcon({ name, size, className, title, ...rest }: GlyphIconProps) {
  const Art = GLYPHS[name];
  const dim = size ?? undefined;
  return (
    <svg
      viewBox="0 0 48 48"
      width={dim ?? (className ? undefined : "1em")}
      height={dim ?? (className ? undefined : "1em")}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : (rest["aria-hidden"] ?? true)}
      focusable="false"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
    >
      {title ? <title>{title}</title> : null}
      <Art />
    </svg>
  );
}

/** Ikon sebaris teks: ukuran mengikuti font (1.2em) dan sejajar dengan huruf. */
export function GlyphInline({ name, className }: { name: GlyphName; className?: string }) {
  return <GlyphIcon name={name} className={`inline-block w-[1.2em] h-[1.2em] align-[-0.22em] ${className ?? ""}`} />;
}

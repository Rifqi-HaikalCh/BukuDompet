"use client";

/**
 * BiomeEnvironment — 12-Wilayah (Tahap Eksplorasi) Dynamic Biome Map, Weather Particles & Growing Ecosystem Engine.
 * Gaya: Duolingo × Finch Cozy Pastel (outline hangat #3D352E, duotone vector layers).
 */

import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React from "react";
import { MotionConfig, motion } from "framer-motion";
import { LivingBiomeBackdrop, LivingBiomeTrees } from "./LivingBiome";

/**
 * Reset origin transformasi untuk elemen SVG yang memakai atribut `transform="rotate/scale/..."`.
 * Tanpa ini, CSS global `svg g, svg path { transform-box: fill-box }` memindahkan titik asal
 * transformasi ke pojok bbox elemen sehingga bagian tubuh/ikon bergeser dan berantakan.
 */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;


export type WeatherType =
  | "sparkle_dew"
  | "warm_mist"
  | "breeze_leaf"
  | "sakura_petal"
  | "firefly_glow"
  | "sea_bubble"
  | "fluffy_cloud"
  | "golden_harvest"
  | "maple_fall"
  | "lantern_star"
  | "cozy_rain"
  | "crystal_snow";

/**
 * Satu tema ekosistem. Bioma melambangkan TAHAP EKSPLORASI (Wilayah I, II, ...), bukan bulan kalender:
 * bab perjalanan ke-c memakai tema `c % 12`, lalu berulang. Pemilihan bulan buku kas ada di `lib/dates.ts`.
 */
export interface BiomeRegionMeta {
  regionIndex: number; // 0..11, urutan tema
  /** Angka Romawi tema ini (mis. "II"). Nama bab sebenarnya dibentuk `regionLabelForChapter`. */
  regionNumeral: string;
  biomeTitle: string;
  subtitle: string;
  weatherType: WeatherType;
  weatherLabel: string;
  resourceName: string;
  bgTop: string;
  bgBottom: string;
  hillBack: string;
  hillFront: string;
  accentColor: string;
  borderColor: string;
  lipColor: string;
  treeFoliage: string;
  treeFoliageLight: string;
}

export const BIOME_REGIONS: readonly BiomeRegionMeta[] = [
  {
    regionIndex: 0,
    regionNumeral: "I",
    biomeTitle: "Lembah Embun Pagi",
    subtitle: "Pagi yang segar dengan embun berkilau dan tunas harapan baru.",
    weatherType: "sparkle_dew",
    weatherLabel: "Embun Pagi Berkilau",
    resourceName: "Pohon Pinus Koin",
    bgTop: "#EEF8FF",
    bgBottom: "#EFFBE6",
    hillBack: "#CBECC0",
    hillFront: "#B2E29E",
    accentColor: "#58CC02",
    borderColor: "#C3EFA4",
    lipColor: "#9EE070",
    treeFoliage: "#58CC02",
    treeFoliageLight: "#8EE04A",
  },
  {
    regionIndex: 1,
    regionNumeral: "II",
    biomeTitle: "Kebun Teh Berkabut",
    subtitle: "Perbukitan teh hijau yang sejuk dengan aroma matcha menenangkan.",
    weatherType: "warm_mist",
    weatherLabel: "Kabut Lembah Hangat",
    resourceName: "Perkebunan Pucuk Matcha",
    bgTop: "#F2FBEA",
    bgBottom: "#E5F7D6",
    hillBack: "#C5E8AC",
    hillFront: "#A7DB85",
    accentColor: "#46A302",
    borderColor: "#C3EFA4",
    lipColor: "#9EE070",
    treeFoliage: "#46A302",
    treeFoliageLight: "#7AD63B",
  },
  {
    regionIndex: 2,
    regionNumeral: "III",
    biomeTitle: "Padang Rumput Pelangi",
    subtitle: "Hamparan bunga matahari dan semilir angin sepoi yang ceria.",
    weatherType: "breeze_leaf",
    weatherLabel: "Angin Sepoi Berbunga",
    resourceName: "Bunga Matahari Emas",
    bgTop: "#FFFDF2",
    bgBottom: "#EFFBE6",
    hillBack: "#D4F0B9",
    hillFront: "#B9E593",
    accentColor: "#FFC800",
    borderColor: "#FDE08D",
    lipColor: "#F5C84C",
    treeFoliage: "#58CC02",
    treeFoliageLight: "#9EE070",
  },
  {
    regionIndex: 3,
    regionNumeral: "IV",
    biomeTitle: "Taman Sakura Pastel",
    subtitle: "Kelopak bunga merah muda berguguran lembut di sepanjang jalur kas.",
    weatherType: "sakura_petal",
    weatherLabel: "Guguran Kelopak Sakura",
    resourceName: "Pohon Sakura Koin",
    bgTop: "#FFF5F5",
    bgBottom: "#FFFDF7",
    hillBack: "#FAD4D8",
    hillFront: "#F7BEC4",
    accentColor: "#FF8B7B",
    borderColor: "#FFCDC6",
    lipColor: "#FFA89C",
    treeFoliage: "#FF9E9E",
    treeFoliageLight: "#FFC4C4",
  },
  {
    regionIndex: 4,
    regionNumeral: "V",
    biomeTitle: "Hutan Bambu Zamrud",
    subtitle: "Rimbun bambu teduh ditemani kunang-kunang emas penjaga tabungan.",
    weatherType: "firefly_glow",
    weatherLabel: "Kunang-Kunang Cahaya",
    resourceName: "Rumpun Bambu Rezeki",
    bgTop: "#EFFBE6",
    bgBottom: "#E3F6D5",
    hillBack: "#BBE5A3",
    hillFront: "#9FD880",
    accentColor: "#58CC02",
    borderColor: "#C3EFA4",
    lipColor: "#9EE070",
    treeFoliage: "#46A302",
    treeFoliageLight: "#8EE04A",
  },
  {
    regionIndex: 5,
    regionNumeral: "VI",
    biomeTitle: "Pantai Pasir Koral",
    subtitle: "Suasana pesisir yang hangat dengan kerang mutiara dan pohon kelapa.",
    weatherType: "sea_bubble",
    weatherLabel: "Gelembung Angin Laut",
    resourceName: "Kelapa Gading & Mutiara",
    bgTop: "#EEF8FF",
    bgBottom: "#FFFBEB",
    hillBack: "#FCE5B8",
    hillFront: "#F9D694",
    accentColor: "#38B6FF",
    borderColor: "#BCE3FF",
    lipColor: "#89CAFF",
    treeFoliage: "#58CC02",
    treeFoliageLight: "#9EE070",
  },
  {
    regionIndex: 6,
    regionNumeral: "VII",
    biomeTitle: "Dataran Tinggi Awan",
    subtitle: "Padang savana biru langit dengan kincir angin yang berputar tenang.",
    weatherType: "fluffy_cloud",
    weatherLabel: "Awan Putih Berarak",
    resourceName: "Kincir Angin & Kebun Berry",
    bgTop: "#E8F6FF",
    bgBottom: "#F4FBFF",
    hillBack: "#C2E4FB",
    hillFront: "#A5D6F7",
    accentColor: "#38B6FF",
    borderColor: "#BCE3FF",
    lipColor: "#89CAFF",
    treeFoliage: "#38B6FF",
    treeFoliageLight: "#89CAFF",
  },
  {
    regionIndex: 7,
    regionNumeral: "VIII",
    biomeTitle: "Kebun Panen Raya",
    subtitle: "Kemerdekaan finansial terasa di ladang gandum dan pohon buah emas.",
    weatherType: "golden_harvest",
    weatherLabel: "Kilau Panen Raya",
    resourceName: "Pohon Apel Emas",
    bgTop: "#FFFBEB",
    bgBottom: "#FFF5D6",
    hillBack: "#F9DF9B",
    hillFront: "#F4CE71",
    accentColor: "#FFC800",
    borderColor: "#FDE08D",
    lipColor: "#F5C84C",
    treeFoliage: "#F5A623",
    treeFoliageLight: "#FFD166",
  },
  {
    regionIndex: 8,
    regionNumeral: "IX",
    biomeTitle: "Lembah Maple Senja",
    subtitle: "Nuansa senja yang hangat dengan dedaunan maple jingga keemasan.",
    weatherType: "maple_fall",
    weatherLabel: "Daun Maple Gugur",
    resourceName: "Hutan Maple Keemasan",
    bgTop: "#FFF5EE",
    bgBottom: "#FFFBEB",
    hillBack: "#FAD0B4",
    hillFront: "#F6B992",
    accentColor: "#FF8B7B",
    borderColor: "#FFCDC6",
    lipColor: "#FFA89C",
    treeFoliage: "#E06353",
    treeFoliageLight: "#FF8B7B",
  },
  {
    regionIndex: 9,
    regionNumeral: "X",
    biomeTitle: "Taman Lentera Hangat",
    subtitle: "Malam pastel bertabur lentera apung dan tanaman labu madu yang subur.",
    weatherType: "lantern_star",
    weatherLabel: "Lentera & Bintang Senja",
    resourceName: "Kebun Labu Madu",
    bgTop: "#F8F0FF",
    bgBottom: "#FFFBEB",
    hillBack: "#E5CEF8",
    hillFront: "#D4B2F2",
    accentColor: "#CE82FF",
    borderColor: "#E2C6FF",
    lipColor: "#C99BFF",
    treeFoliage: "#A552DB",
    treeFoliageLight: "#CE82FF",
  },
  {
    regionIndex: 10,
    regionNumeral: "XI",
    biomeTitle: "Danau Hujan Rintik",
    subtitle: "Suasana teduh hujan rintik yang menyuburkan bunga teratai dan pohon kas.",
    weatherType: "cozy_rain",
    weatherLabel: "Hujan Rintik Sejuk",
    resourceName: "Kolam Teratai & Pohon Kas",
    bgTop: "#EEF8FF",
    bgBottom: "#EFFBE6",
    hillBack: "#C2E2F5",
    hillFront: "#A8D4EE",
    accentColor: "#38B6FF",
    borderColor: "#BCE3FF",
    lipColor: "#89CAFF",
    treeFoliage: "#46A302",
    treeFoliageLight: "#8EE04A",
  },
  {
    regionIndex: 11,
    regionNumeral: "XII",
    biomeTitle: "Puncak Salju Kristal",
    subtitle: "Puncak berkilau salju lembut dengan pohon cemara bertabur berlian.",
    weatherType: "crystal_snow",
    weatherLabel: "Salju Kristal Lembut",
    resourceName: "Cemara Berlian Kristal",
    bgTop: "#F0F9FF",
    bgBottom: "#FFFFFF",
    hillBack: "#D6EEFF",
    hillFront: "#BCE3FF",
    accentColor: "#38B6FF",
    borderColor: "#BCE3FF",
    lipColor: "#89CAFF",
    treeFoliage: "#1E88E5",
    treeFoliageLight: "#64B5F6",
  },
];

export interface BiomeResourceStatus {
  ecosystemLevel: 1 | 2 | 3 | 4;
  stageTitle: string;
  nextTargetDays: number;
  daysRemainingToNext: number;
  bannerText: string;
  progressPercent: number;
}

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

/** Angka Romawi untuk penomoran Wilayah (1 → "I"). Di luar 1..3999 dikembalikan sebagai angka biasa. */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n);
  let rest = n;
  let out = "";
  for (const [v, sym] of ROMAN) {
    while (rest >= v) {
      out += sym;
      rest -= v;
    }
  }
  return out;
}

/** Nama tahap untuk bab perjalanan ke-`chapterIndex` (mulai 0): "Wilayah I", "Wilayah II", dst. */
export function regionLabelForChapter(chapterIndex: number): string {
  return `Wilayah ${toRoman(Math.max(0, Math.floor(chapterIndex)) + 1)}`;
}

export function getBiomeResourceStatus(
  regionIndex: number,
  completedStepsCount: number
): BiomeResourceStatus {
  const safeIdx = ((regionIndex % 12) + 12) % 12;
  const biome = BIOME_REGIONS[safeIdx];
  const steps = Math.max(0, completedStepsCount);

  if (steps >= 20) {
    return {
      ecosystemLevel: 4,
      stageTitle: "Panen Pohon Koin Berbuah",
      nextTargetDays: 28,
      daysRemainingToNext: Math.max(0, 28 - steps),
      bannerText: `Ekosistem ${biome.biomeTitle}: Level 4 (Panen ${biome.resourceName}) — Pohon Koin telah berbuah lebat!`,
      progressPercent: 100,
    };
  }
  if (steps >= 10) {
    const rem = 20 - steps;
    return {
      ecosystemLevel: 3,
      stageTitle: "Taman Berbunga",
      nextTargetDays: 20,
      daysRemainingToNext: rem,
      bannerText: `Ekosistem Wilayah Ini: Level 3 (Taman Berbunga) — Catat ${rem} hari lagi agar Pohon Koin berbuah!`,
      progressPercent: Math.min(100, Math.round((steps / 20) * 100)),
    };
  }
  if (steps >= 4) {
    const rem = 10 - steps;
    return {
      ecosystemLevel: 2,
      stageTitle: "Tunas Rimbun",
      nextTargetDays: 10,
      daysRemainingToNext: rem,
      bannerText: `Ekosistem Wilayah Ini: Level 2 (Tunas Rimbun) — Catat ${rem} hari lagi menuju Taman Berbunga!`,
      progressPercent: Math.min(100, Math.round((steps / 10) * 100)),
    };
  }
  const rem = 4 - steps;
  return {
    ecosystemLevel: 1,
    stageTitle: "Bibit Awal",
    nextTargetDays: 4,
    daysRemainingToNext: rem,
    bannerText: `Ekosistem Wilayah Ini: Level 1 (Bibit Awal) — Catat ${rem} hari lagi agar tunas ekosistem tumbuh!`,
    progressPercent: Math.min(100, Math.round((steps / 4) * 100)),
  };
}

const INK = "#3D352E";

export function GrowingResourceTree({
  x,
  y,
  scale = 1,
  level,
  foliage,
  foliageLight,
}: {
  x: number;
  y: number;
  scale?: number;
  level: 1 | 2 | 3 | 4;
  foliage: string;
  foliageLight: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} style={SVG_ATTR_ORIGIN}>
      {/* Ground shadow */}
      <ellipse cx={0} cy={4} rx={28} ry={7} fill={INK} opacity={0.12} />

      {level === 1 && (
        /* Level 1: Sprout / Bibit */
        <motion.g
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M0 2 V-18"
            stroke={INK}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <path
            d="M0 -12 C-14 -24 -22 -12 -6 -4 C-2 -2 0 -8 0 -12Z"
            fill={foliageLight}
            stroke={INK}
            strokeWidth={3}
          />
          <path
            d="M0 -16 C14 -28 22 -16 6 -8 C2 -6 0 -12 0 -16Z"
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
        </motion.g>
      )}

      {level === 2 && (
        /* Level 2: Lush Bush / Tunas Rimbun */
        <motion.g
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={{ scaleY: [1, 1.04, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle
            cx={-14}
            cy={-12}
            r={16}
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={14}
            cy={-12}
            r={16}
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={0}
            cy={-22}
            r={20}
            fill={foliageLight}
            stroke={INK}
            strokeWidth={3}
          />
        </motion.g>
      )}

      {level === 3 && (
        /* Level 3: Flowering Tree / Taman Berbunga */
        <motion.g
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={{ rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect
            x={-7}
            y={-28}
            width={14}
            height={30}
            rx={4}
            fill="#C8935A"
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={-18}
            cy={-34}
            r={20}
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={18}
            cy={-34}
            r={20}
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={0}
            cy={-48}
            r={24}
            fill={foliageLight}
            stroke={INK}
            strokeWidth={3}
          />
          {/* Flowers */}
          <circle
            cx={-12}
            cy={-46}
            r={5}
            fill="#FFFDF7"
            stroke={INK}
            strokeWidth={2}
          />
          <circle
            cx={10}
            cy={-52}
            r={5}
            fill="#FF8B7B"
            stroke={INK}
            strokeWidth={2}
          />
          <circle
            cx={16}
            cy={-32}
            r={4.5}
            fill="#FFFDF7"
            stroke={INK}
            strokeWidth={2}
          />
        </motion.g>
      )}

      {level === 4 && (
        /* Level 4: Golden Coin-Bearing Tree / Pohon Koin Berbuah */
        <motion.g
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={{ rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect
            x={-8}
            y={-32}
            width={16}
            height={34}
            rx={5}
            fill="#C8935A"
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={-20}
            cy={-38}
            r={22}
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={20}
            cy={-38}
            r={22}
            fill={foliage}
            stroke={INK}
            strokeWidth={3}
          />
          <circle
            cx={0}
            cy={-54}
            r={26}
            fill={foliageLight}
            stroke={INK}
            strokeWidth={3}
          />
          {/* Golden Coin Fruits */}
          {[
            [-14, -50],
            [12, -56],
            [-18, -32],
            [18, -34],
            [0, -38],
          ].map(([cx, cy], idx) => (
            <g key={idx} transform={`translate(${cx} ${cy})`} style={SVG_ATTR_ORIGIN}>
              <circle
                r={6.5}
                fill="#FFC800"
                stroke={INK}
                strokeWidth={2.2}
              />
              <circle r={3.5} fill="#FFE27A" />
            </g>
          ))}
        </motion.g>
      )}
    </g>
  );
}

export interface BiomeMapSectionProps {
  regionIndex: number; // 0..11, tema ekosistem
  completedStepsCount: number;
  children: React.ReactNode;
  className?: string;
}

export function BiomeMapSection({
  regionIndex,
  completedStepsCount,
  children,
  className,
}: BiomeMapSectionProps) {
  const safeIdx = ((regionIndex % 12) + 12) % 12;
  const biome = BIOME_REGIONS[safeIdx];
  const eco = getBiomeResourceStatus(safeIdx, completedStepsCount);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`relative rounded-3xl border-2 overflow-hidden transition-colors ${className ?? ""}`}
        style={{
          borderColor: biome.borderColor,
          borderBottomWidth: "5px",
          borderBottomColor: biome.lipColor,
          background: `linear-gradient(180deg, ${biome.bgTop} 0%, ${biome.bgBottom} 100%)`,
        }}
      >
        {/* Bioma Hidup: awan, kolam beriak, partikel cuaca */}
        <LivingBiomeBackdrop biome={biome} />

        {/* Illustrated SVG Biome Scenery */}
        <svg
          viewBox="0 0 400 560"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          aria-hidden="true"
        >
          {/* Soft Distant Hills */}
          <path
            d="M-20 150 Q90 95 210 140 T420 125 L420 580 L-20 580 Z"
            fill={biome.hillBack}
            opacity={0.45}
          />
          <path
            d="M-20 340 Q130 290 260 335 T420 315 L420 580 L-20 580 Z"
            fill={biome.hillFront}
            opacity={0.45}
          />

          {/* Winding Trail Backdrop */}
          <path
            d="M200 40 C120 130 280 230 190 330 C110 420 270 490 200 550"
            fill="none"
            stroke="#FFFDF9"
            strokeWidth={46}
            strokeLinecap="round"
            opacity={0.55}
          />
          <path
            d="M200 40 C120 130 280 230 190 330 C110 420 270 490 200 550"
            fill="none"
            stroke="#D4C9B4"
            strokeWidth={4}
            strokeDasharray="10 12"
            strokeLinecap="round"
            opacity={0.65}
          />
        </svg>

        {/* Foreground Content (Stepping Stones & Checkpoints) */}
        <div className="relative z-10 p-4 sm:p-6">{children}</div>

        {/* Pohon tepi peta yang bisa diketuk */}
        <LivingBiomeTrees biome={biome} level={eco.ecosystemLevel} />
      </div>
    </MotionConfig>
  );
}

export interface BiomeTransitionDividerProps {
  previousRegionIndex?: number;
  currentRegionIndex: number;
  /** Nama tahap bab ini / sebelumnya, mis. "Wilayah II". Bila kosong dipakai penomoran tema. */
  regionLabel?: string;
  previousRegionLabel?: string;
  dayNumber: number;
  isStartGate?: boolean;
}

/**
 * Gerbang Perbatasan Bioma (Biome Transition Divider Banner)
 * Muncul otomatis saat perjalanan melewati kelipatan 30 hari (pindah Wilayah).
 */
export function BiomeTransitionDivider({
  previousRegionIndex,
  currentRegionIndex,
  regionLabel,
  previousRegionLabel,
  dayNumber,
  isStartGate = false,
}: BiomeTransitionDividerProps) {
  const currBiome = BIOME_REGIONS[((currentRegionIndex % 12) + 12) % 12];
  const prevBiome =
    previousRegionIndex !== undefined
      ? BIOME_REGIONS[((previousRegionIndex % 12) + 12) % 12]
      : null;
  const currLabel = regionLabel ?? `Wilayah ${currBiome.regionNumeral}`;
  const prevLabel = previousRegionLabel ?? (prevBiome ? `Wilayah ${prevBiome.regionNumeral}` : "");

  return (
    <div className="w-full max-w-md mx-auto my-3 px-2">
      <div
        className="relative rounded-2xl border-2 p-3.5 text-center shadow-sm overflow-hidden"
        style={{
          backgroundColor: "#FFFDF7",
          borderColor: currBiome.borderColor,
          borderBottomWidth: "4px",
          borderBottomColor: currBiome.lipColor,
        }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] text-[10px] font-display font-extrabold text-[#7A6E65] uppercase tracking-wider mb-1">
          <span><GlyphInline name="gate" /> {isStartGate ? `Gerbang Awal Perjalanan • Hari ke-${dayNumber}` : `Gerbang Transisi Bioma • Hari ke-${dayNumber}`}</span>
        </div>

        <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] leading-snug break-words">
          {prevBiome
            ? <>{prevLabel} <GlyphInline name="arrow_right" /> {currLabel}: {currBiome.biomeTitle}</>
            : `Memasuki ${currLabel}: ${currBiome.biomeTitle}`}
        </p>

        <p className="text-[11px] font-bold text-[#7A6E65] mt-0.5 leading-snug break-words">
          Cuaca Aktif: {currBiome.weatherLabel} • Ekosistem: {currBiome.resourceName}
        </p>
      </div>
    </div>
  );
}


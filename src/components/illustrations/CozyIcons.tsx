"use client";

/**
 * CozyIcons — 31 ikon duotone kustom BukuDompet (pengganti Lucide / emoji OS).
 * Gaya: Duolingo × Finch Cozy Pastel. Teknik: Duotone Layered Vector
 *   warna dasar pastel → layer bayangan dalam → highlight kilap krem (#FFFDF7),
 *   semua dibungkus garis tepi hangat #3D352E (round cap & round join).
 *
 * Contoh pakai:
 *   <CozyIcon name="flame_streak" size={32} />
 *   <CozyIcon name="warning_siren" size={48} animated />          // animasi halus (opsional)
 *   <CozyIcon name={getCategoryIconName("Makan Pokok")} size={28} />
 *   import { FlameStreakIcon } from "@/components/illustrations/CozyIcons";
 *
 * Catatan:
 * - Semua ikon viewBox 0 0 48 48, tanpa gradient/clipPath/id → aman dipakai
 *   berulang kali di satu halaman (tidak ada bentrok id) dan aman di SSR.
 * - Ikon bersifat dekoratif (aria-hidden) kecuali `title` diberikan.
 * - `animated` hanya aktif bila diminta; MotionConfig menghormati "reduce motion".
 */

import type { ComponentType, ReactNode } from "react";
import { MotionConfig, motion, type TargetAndTransition } from "framer-motion";

/* ───────────────────────── Types ───────────────────────── */

export interface CozyIconProps {
  /** Ukuran sisi dalam px. Default 32. */
  size?: number;
  className?: string;
  /** Nama aksesibel. Bila kosong, ikon disembunyikan dari screen reader. */
  title?: string;
  /** Aktifkan animasi halus (kilau, api, sirine, dll). Default false. */
  animated?: boolean;
}

export const ICON_NAMES = [
  "flame_streak",
  "coin_rupiah",
  "xp_star",
  "ice_shield",
  "calendar_streak",
  "home_path",
  "missions_scroll",
  "detective_radar",
  "pet_paw",
  "rewards_ticket",
  "plus_record",
  "cat_food",
  "cat_snack",
  "cat_transport",
  "cat_study",
  "cat_shopping",
  "cat_entertainment",
  "cat_bills",
  "cat_income",
  "cat_saving",
  "combo_sparkle",
  "zero_spend",
  "mystery_box",
  "parent_heart",
  "crown_sultan",
  "lock_cozy",
  "warning_siren",
  "check_badge",
  "wardrobe_costume",
  "boutique_shop",
  "egg_nest",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export interface CozyIconComponentProps extends CozyIconProps {
  name: IconName;
}

/* ───────────────────────── Tokens ───────────────────────── */

const INK = "#3D352E";

/**
 * Atribut SVG `transform="..."` memakai titik asal viewBox. Style ini membuatnya kebal
 * terhadap aturan CSS global `svg g, svg path { transform-box: fill-box }` (yang dulu
 * membuat jari kaki / ornamen bergeser ke pojok kiri-atas bounding box masing-masing).
 */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;

const C = {
  cream: "#FFFDF7",
  matcha: "#58CC02",
  matchaDark: "#46A302",
  matchaSoft: "#8EE04A",
  honey: "#FFC800",
  honeyDark: "#E5A400",
  honeySoft: "#FFE27A",
  peach: "#FF8B7B",
  peachDark: "#E06353",
  peachSoft: "#FFB5A8",
  taro: "#CE82FF",
  taroDark: "#A552DB",
  taroSoft: "#E3B6FF",
  sky: "#38B6FF",
  skyDark: "#1E88E5",
  skySoft: "#BDE7FF",
  berry: "#FF4B4B",
  flame: "#FF9600",
  fur: "#FFF1D6",
  tan: "#E8B87A",
  tanDark: "#C8935A",
  tanLight: "#F4D3A3",
  steel: "#B9C9D4",
  steelDark: "#8FA5B4",
  goldDeep: "#C98A00",
  wheel: "#6C6258",
} as const;

const O = {
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const O3 = { ...O, strokeWidth: 3 } as const;
const O2 = { ...O, strokeWidth: 2 } as const;

/* ───────────────────────── Geometry helpers ───────────────────────── */

const f = (n: number): string => n.toFixed(2);
const rad = (deg: number): number => (deg * Math.PI) / 180;

type Pt = [number, number];

const starArr = (cx: number, cy: number, R: number, r: number): Pt[] =>
  Array.from({ length: 10 }, (_, i): Pt => {
    const rr = i % 2 === 0 ? R : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  });

const toPts = (pts: Pt[]): string => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");

const sparklePath = (s: number): string =>
  `M0 ${-s} Q${s * 0.16} ${-s * 0.16} ${s} 0 Q${s * 0.16} ${s * 0.16} 0 ${s} Q${-s * 0.16} ${s * 0.16} ${-s} 0 Q${-s * 0.16} ${-s * 0.16} 0 ${-s}Z`;

/** Path cincin (lingkaran berlubang) — pakai fillRule="evenodd". */
const ringPath = (cx: number, cy: number, R: number, r: number): string =>
  `M${f(cx - R)} ${f(cy)} a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0Z ` +
  `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

const snowflakePath = (cx: number, cy: number, L: number, tick = 2.6): string => {
  let d = "";
  for (const a of [0, 60, 120]) {
    const t = rad(a);
    const dx = Math.sin(t);
    const dy = -Math.cos(t);
    d += `M${f(cx - L * dx)} ${f(cy - L * dy)} L${f(cx + L * dx)} ${f(cy + L * dy)} `;
    for (const s of [-1, 1]) {
      const bx = cx + 0.58 * L * s * dx;
      const by = cy + 0.58 * L * s * dy;
      for (const k of [-1, 1]) {
        const ang = Math.atan2(s * dy, s * dx) + k * rad(50);
        d += `M${f(bx)} ${f(by)} L${f(bx + tick * Math.cos(ang))} ${f(by + tick * Math.sin(ang))} `;
      }
    }
  }
  return d;
};

/** Busur wifi menghadap atas, berpusat di (cx, cy) dengan radius r. */
const wifiArc = (cx: number, cy: number, r: number): string => {
  const k = Math.SQRT1_2;
  return `M${f(cx - r * k)} ${f(cy - r * k)} A${r} ${r} 0 0 1 ${f(cx + r * k)} ${f(cy - r * k)}`;
};

/* ───────────────────────── Primitives ───────────────────────── */

/** Highlight kilap krem (garis pendek melengkung). */
function Hl({ d, w = 2.4, o = 0.95 }: { d: string; w?: number; o?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={C.cream}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={o}
    />
  );
}

/** Garis dua lapis: tepi tinta di bawah + warna di atas (tangkai, ring, busur). */
function Duo({ d, inner, ow = 7, iw = 4 }: { d: string; inner: string; ow?: number; iw?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={ow} />
      <path d={d} stroke={inner} strokeWidth={iw} />
    </g>
  );
}

function Spark({
  x,
  y,
  s = 4,
  fill = C.honey,
  outline = false,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  outline?: boolean;
}) {
  return (
    <path
      transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}
      d={sparklePath(s)}
      fill={fill}
      stroke={outline ? INK : undefined}
      strokeWidth={outline ? 1.6 : undefined}
      strokeLinejoin="round"
    />
  );
}

function MiniCoin({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.honey} {...O2} />
      <circle cx={cx} cy={cy} r={r * 0.58} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={1.4} />
      <path
        d={`M${f(cx - r * 0.55)} ${f(cy - r * 0.2)} Q${f(cx - r * 0.45)} ${f(cy - r * 0.55)} ${f(cx - r * 0.1)} ${f(cy - r * 0.65)}`}
        fill="none"
        stroke={C.cream}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function Star({
  cx,
  cy,
  R,
  fill,
  shade,
  sw = 2.5,
  ratio = 0.52,
}: {
  cx: number;
  cy: number;
  R: number;
  fill: string;
  shade: string;
  sw?: number;
  ratio?: number;
}) {
  const p = starArr(cx, cy, R, R * ratio);
  const half: Pt[] = [[cx, cy], ...p.slice(0, 6)];
  return (
    <g>
      <polygon points={toPts(p)} fill={fill} />
      <polygon points={toPts(half)} fill={shade} />
      <polygon points={toPts(p)} fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      <Hl
        d={`M${f(cx - 0.62 * R)} ${f(cy - 0.16 * R)} L${f(cx - 0.42 * R)} ${f(cy - 0.27 * R)}`}
        w={Math.max(1.6, R * 0.14)}
      />
    </g>
  );
}

/* ───────────────────────── Animation helper ───────────────────────── */

type LiveKind = "flicker" | "twinkle" | "bob" | "blink" | "wiggle" | "pulse";

const LIVE: Record<LiveKind, { animate: TargetAndTransition; d: number }> = {
  flicker: { animate: { scaleY: [1, 1.07, 0.97, 1.05, 1], scaleX: [1, 0.96, 1.03, 0.98, 1] }, d: 1.1 },
  twinkle: { animate: { scale: [0.55, 1.15, 0.55], rotate: [0, 45, 90], opacity: [0.5, 1, 0.5] }, d: 1.7 },
  bob: { animate: { y: [0, -2.5, 0] }, d: 1.5 },
  blink: { animate: { opacity: [1, 0.3, 1] }, d: 0.8 },
  wiggle: { animate: { rotate: [-5, 5, -5] }, d: 1.3 },
  pulse: { animate: { scale: [1, 1.07, 1] }, d: 1.4 },
};

function Live({
  on,
  kind,
  delay = 0,
  origin = "center",
  children,
}: {
  on?: boolean;
  kind: LiveKind;
  delay?: number;
  origin?: "center" | "bottom" | "top";
  children: ReactNode;
}) {
  if (!on) return <g>{children}</g>;
  const spec = LIVE[kind];
  return (
    <motion.g
      style={{
        transformBox: "fill-box",
        originX: 0.5,
        originY: origin === "bottom" ? 1 : origin === "top" ? 0 : 0.5,
      }}
      animate={spec.animate}
      transition={{ duration: spec.d, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.g>
  );
}

/* ───────────────────────── Base wrapper ───────────────────────── */

function IconBase({
  size = 32,
  className,
  title,
  animated,
  children,
}: CozyIconProps & { children: ReactNode }) {
  const svg = (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ overflow: "visible" }}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
  return animated ? <MotionConfig reducedMotion="user">{svg}</MotionConfig> : svg;
}

/* ═════════════════════════════════════════════════════════════
 *  1–11  Navigasi & gamifikasi
 * ═════════════════════════════════════════════════════════════ */

/** 1. Api streak berlapis oranye → emas → krem. */
export function FlameStreakIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="flicker" origin="bottom">
        <path
          d="M25 4 C26 11 35 16 35 28 C35 38 30 44 24 44 C18 44 13 38 13 29 C13 24 15.5 21 18 18 C18.5 21.5 20 23 22 23.5 C21 17 22 10 25 4Z"
          fill={C.flame}
          {...O3}
        />
        <path
          d="M24 21 C26 26.5 31 29 31 35 C31 40 28 42 24 42 C20 42 17 40 17 35 C17 30 21.5 27.5 24 21Z"
          fill={C.honey}
        />
        <path
          d="M24 31 C25.5 33.5 28 34.5 28 37.5 C28 40 26 41 24 41 C22 41 20 40 20 37.5 C20 34.5 22.5 33.5 24 31Z"
          fill={C.cream}
        />
        <Hl d="M16.5 32 Q16 27 19 23" />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={39} y={11} s={4.5} />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.7}>
        <Spark x={8.5} y={15} s={3.5} fill={C.honeySoft} />
      </Live>
    </IconBase>
  );
}

/** 2. Koin emas tebal dengan simbol Rp. */
export function CoinRupiahIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <circle cx={24} cy={27.5} r={17} fill={C.honeyDark} {...O3} />
      <rect x={7} y={23.5} width={34} height={4} fill={C.honeyDark} />
      <path d="M7 23.5 V27.5 M41 23.5 V27.5" {...O3} />
      <circle cx={24} cy={23.5} r={17} fill={C.honey} {...O3} />
      <circle cx={24} cy={23.5} r={12.6} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={2} />
      <g fill="none" stroke={C.goldDeep} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 31 V17 H20.2 Q24.6 17 24.6 21 Q24.6 25 20.2 25 H15 M20.4 25 L25 31" />
        <path d="M29 22 V35 M29 23 Q36 21 36 26.6 Q36 31.6 29 30.2" />
      </g>
      <Hl d="M12.6 17.6 Q15 11.6 21 10" />
      <Live on={props.animated} kind="twinkle">
        <Spark x={40.5} y={8} s={4} />
      </Live>
    </IconBase>
  );
}

/** 3. Bintang XP biru langit. */
export function XpStarIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Star cx={24} cy={25.5} R={19} fill={C.sky} shade={C.skyDark} sw={3} />
      <Live on={props.animated} kind="twinkle">
        <Spark x={40.5} y={9} s={4.5} fill={C.honey} />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.8}>
        <Spark x={7.5} y={11} s={3.4} fill={C.skySoft} outline />
      </Live>
    </IconBase>
  );
}

/** 4. Perisai es kristal (Streak Freeze). */
export function IceShieldIcon(props: CozyIconProps) {
  const shield = "M24 4 L40 9 V23 C40 33 33 40 24 44 C15 40 8 33 8 23 V9Z";
  return (
    <IconBase {...props}>
      <path d={shield} fill={C.skySoft} />
      <path d="M24 4 L40 9 V23 C40 33 33 40 24 44Z" fill={C.sky} />
      <path d="M24 4 L8 9 V23 C8 33 15 40 24 44 M24 4 V44 M8 23 L24 16 L40 23" fill="none" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <path d={shield} fill="none" {...O3} />
      <path d="M24 9.5 L35 13 V23 C35 30 30.5 35 24 38 C17.5 35 13 30 13 23 V13Z" fill="none" stroke={C.cream} strokeWidth={1.8} strokeDasharray="1.5 4" strokeLinecap="round" opacity={0.9} />
      <Live on={props.animated} kind="pulse">
        <Duo d={snowflakePath(24, 24, 8)} inner={C.cream} ow={4.8} iw={2.2} />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41} y={6} s={4} fill={C.cream} outline />
      </Live>
    </IconBase>
  );
}

const MINI_FLAME =
  "M5 0 C5.5 3 9 4.5 9 8.2 C9 11 7.2 12.5 5 12.5 C2.8 12.5 1 11 1 8.2 C1 6.2 2.2 5 3.2 3.8 C3.4 5 3.8 5.6 4.4 5.8 C4 3.8 4 1.8 5 0Z";

/** 5. Kalender pastel + centang hijau + api kecil. */
export function CalendarStreakIcon(props: CozyIconProps) {
  const header = "M7 19.5 V17 Q7 10 14 10 H34 Q41 10 41 17 V19.5Z";
  return (
    <IconBase {...props}>
      <rect x={7} y={10} width={34} height={31} rx={7} fill={C.cream} />
      <path d="M7 34 H41 V34 Q41 41 34 41 H14 Q7 41 7 34Z" fill={C.fur} />
      <path d={header} fill={C.matcha} />
      <path d="M7 16 H41 V19.5 H7Z" fill={C.matchaDark} opacity={0.35} />
      <rect x={7} y={10} width={34} height={31} rx={7} fill="none" {...O3} />
      <path d="M7 19.5 H41" {...O} />
      <rect x={14} y={5.5} width={5} height={10} rx={2.5} fill={C.honey} {...O} />
      <rect x={29} y={5.5} width={5} height={10} rx={2.5} fill={C.honey} {...O} />
      <Hl d="M12 13.6 H21" w={2} o={0.8} />
      <Duo d="M11.5 30 L16.5 35 L25 24.5" inner={C.matcha} ow={7.6} iw={4.4} />
      <Live on={props.animated} kind="flicker" origin="bottom">
        <g transform="translate(29.6 25.4) scale(1.05)" style={SVG_ATTR_ORIGIN}>
          <path d={MINI_FLAME} fill={C.flame} {...O2} />
          <path d="M5 6.4 C5.8 8 7 8.4 7 9.8 C7 11 6 11.6 5 11.6 C4 11.6 3 11 3 9.8 C3 8.4 4.2 8 5 6.4Z" fill={C.honey} />
        </g>
      </Live>
    </IconBase>
  );
}

/** 6. Rumah dengan jalan berbatu hijau. */
export function HomePathIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 40 L7 36 M8 40 L9.4 35.4 M8 40 L11 37" stroke={C.matchaDark} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M40 40 L41 36 M40 40 L38.6 35.4 M40 40 L37 37" stroke={C.matchaDark} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={31} y={9} width={5.5} height={10} rx={1.6} fill={C.peach} {...O2} />
      <rect x={10} y={21} width={28} height={17} rx={3} fill={C.cream} {...O3} />
      <path d="M10 33 H38 V35 Q38 38 35 38 H13 Q10 38 10 35Z" fill={C.fur} />
      <path d="M5 24.5 L24 6.5 L43 24.5Z" fill={C.matcha} />
      <path d="M24 6.5 L43 24.5 H24Z" fill={C.matchaDark} />
      <path d="M5 24.5 L24 6.5 L43 24.5Z" fill="none" {...O3} />
      <Hl d="M12 21.4 L21.5 12.6" />
      <path d="M20.5 38 V30.5 Q20.5 26.5 24 26.5 Q27.5 26.5 27.5 30.5 V38Z" fill={C.honey} {...O2} />
      <circle cx={25.8} cy={32.6} r={0.9} fill={INK} />
      <circle cx={15.4} cy={29.6} r={2.8} fill={C.skySoft} {...O2} />
      <circle cx={32.6} cy={29.6} r={2.8} fill={C.skySoft} {...O2} />
      <ellipse cx={24} cy={41.2} rx={5.2} ry={2.1} fill={C.matchaSoft} {...O2} />
      <ellipse cx={30.6} cy={43.8} rx={4.3} ry={1.8} fill={C.matchaSoft} {...O2} />
      <ellipse cx={36.6} cy={45.9} rx={3.4} ry={1.5} fill={C.matchaSoft} {...O2} />
    </IconBase>
  );
}

/** 7. Gulungan misi + target panah + pita emas. */
export function MissionsScrollIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <rect x={11} y={10} width={26} height={29} fill={C.cream} {...O} />
      <path d="M11 33 H37 V39 H11Z" fill={C.fur} />
      <rect x={7} y={5.5} width={34} height={9} rx={4.5} fill={C.tan} {...O3} />
      <Hl d="M12 8.6 H29" w={2} />
      <rect x={7} y={33} width={34} height={9} rx={4.5} fill={C.tan} {...O3} />
      <Hl d="M12 36.2 H27" w={2} />
      <circle cx={24} cy={24} r={8} fill={C.peach} {...O2} />
      <circle cx={24} cy={24} r={5.2} fill={C.cream} {...O2} />
      <circle cx={24} cy={24} r={2.2} fill={C.peach} />
      <Live on={props.animated} kind="wiggle">
        <path d="M24 24 L33 15" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M31 13 L35.4 11.8 L34.2 16.2 Z M33.2 15.4 L37.6 14.2 L36.4 18.6 Z" fill={C.matcha} {...O2} strokeWidth={1.8} />
      </Live>
      <rect x={30} y={31.5} width={6} height={12} rx={2} fill={C.honey} {...O2} />
      <path d="M30.8 43.5 L29 47.2 L32.8 45.8 L35.2 47.2 L35.2 43.5Z" fill={C.honey} {...O2} strokeWidth={1.8} />
    </IconBase>
  );
}

/** 8. Kaca pembesar detektif + topi deerstalker + radar. */
export function DetectiveRadarIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Duo d="M30 36.5 L40.4 45" inner={C.peach} ow={7.6} iw={4.4} />
      <circle cx={21} cy={28} r={11} fill={C.skySoft} />
      <g fill="none" stroke={C.cream} strokeLinecap="round" strokeWidth={1.8} opacity={0.95}>
        <circle cx={21} cy={28} r={7} />
        <circle cx={21} cy={28} r={3.2} />
        <path d="M21 28 L27.2 21.8" />
      </g>
      <Live on={props.animated} kind="pulse">
        <circle cx={17} cy={32} r={1.9} fill={C.peach} stroke={INK} strokeWidth={1.4} />
      </Live>
      <Duo d="M21 17 a11 11 0 1 0 0.01 0Z" inner={C.honey} ow={7.6} iw={4.6} />
      <Hl d="M12.6 23.4 Q14 19.6 18 18.2" w={2} />
      {/* topi deerstalker */}
      <path d="M8 16 Q6.4 12.6 8.8 10.4 Q11.2 11 11.4 14.8Z" fill={C.tanLight} {...O2} />
      <path d="M34 16 Q35.6 12.6 33.2 10.4 Q30.8 11 30.6 14.8Z" fill={C.tanLight} {...O2} />
      <path d="M10 15 Q10.6 5 21 4.6 Q31.4 5 32 15 Q21 19 10 15Z" fill={C.tan} {...O2} />
      <path d="M14 15.4 Q21 17.6 28 15.4 L28.4 17.6 Q21 20 13.6 17.6Z" fill={C.tanDark} {...O2} strokeWidth={1.8} />
      <path d="M17 6.4 Q16 10 17 14 M21 4.8 V15 M25 6.4 Q26 10 25 14" fill="none" stroke={C.tanDark} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
      <circle cx={21} cy={5} r={2} fill={C.tanDark} {...O2} strokeWidth={1.6} />
    </IconBase>
  );
}

/** 9. Jejak kaki Mochi — bantalan peach & 4 jari emas (tanpa rotasi, rapi di semua ukuran). */
export function PetPawIcon(props: CozyIconProps) {
  const PAD =
    "M24 24.6 C17.6 24.6 11.6 29.6 12.4 35.4 C13.2 40.6 18.6 42 24 40 C29.4 42 34.8 40.6 35.6 35.4 C36.4 29.6 30.4 24.6 24 24.6Z";
  /* jari: bentuk kacang tegak, sedikit miring lewat kurva (bukan transform) */
  const TOES = [
    "M7.4 21.2 C5.4 19.2 5.8 15.2 8.6 14 C11.4 12.8 13.8 15.4 13.4 19 C13.2 21.6 10 24 7.4 21.2Z",
    "M15.6 12.4 C14 9.2 15.4 4.8 18.6 4.4 C21.8 4 23.4 7.6 22.6 10.8 C21.8 13.8 17.4 15.4 15.6 12.4Z",
    "M32.4 12.4 C34 9.2 32.6 4.8 29.4 4.4 C26.2 4 24.6 7.6 25.4 10.8 C26.2 13.8 30.6 15.4 32.4 12.4Z",
    "M40.6 21.2 C42.6 19.2 42.2 15.2 39.4 14 C36.6 12.8 34.2 15.4 34.6 19 C34.8 21.6 38 24 40.6 21.2Z",
  ];
  return (
    <IconBase {...props}>
      <path d={PAD} fill={C.peach} />
      <path d="M35.6 35.4 C34.8 40.6 29.4 42 24 40 C30 37 32.4 31.4 31 26 C34.6 27.2 36.2 31.2 35.6 35.4Z" fill={C.peachDark} />
      <path d={PAD} fill="none" {...O3} />
      <Hl d="M16.6 32.6 Q18 29.6 21.4 28.2" />
      {/* hati kecil di bantalan */}
      <path
        d="M24 37.2 C20.6 35 20.4 32.2 22.2 31.6 C23.2 31.3 24 32 24 32.6 C24 32 24.8 31.3 25.8 31.6 C27.6 32.2 27.4 35 24 37.2Z"
        fill={C.cream}
        opacity={0.9}
      />
      <g fill={C.honey} {...O3}>
        {TOES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="none" stroke={C.honeySoft} strokeWidth={1.8} strokeLinecap="round">
        <path d="M8.2 18.8 Q8.4 17.2 9.6 16.4" />
        <path d="M17.4 8.4 Q17.8 6.8 19.4 6.4" />
        <path d="M30.6 8.4 Q30.2 6.8 28.6 6.4" />
        <path d="M39.8 18.8 Q39.6 17.2 38.4 16.4" />
      </g>
      <Live on={props.animated} kind="twinkle">
        <Spark x={42} y={6} s={3.4} />
      </Live>
    </IconBase>
  );
}

/** 10. Tiket kupon emas berlubang (Tukar Poin). */
export function RewardsTicketIcon(props: CozyIconProps) {
  const ticket =
    "M9 12 H39 a4 4 0 0 1 4 4 V20.5 a3.5 3.5 0 0 0 0 7 V32 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4 V27.5 a3.5 3.5 0 0 0 0 -7 V16 a4 4 0 0 1 4 -4Z";
  return (
    <IconBase {...props}>
      <g transform="rotate(-9 24 24)" style={SVG_ATTR_ORIGIN}>
        <path d={ticket} fill={C.honey} />
        <path d="M5 30 H43 V32 a4 4 0 0 1 -4 4 H9 a4 4 0 0 1 -4 -4Z" fill={C.honeyDark} />
        <path d="M9 12 H17 V36 H9 a4 4 0 0 1 -4 -4 V27.5 a3.5 3.5 0 0 0 0 -7 V16 a4 4 0 0 1 4 -4Z" fill={C.peach} />
        <path d="M5 30 H17 V36 H9 a4 4 0 0 1 -4 -4Z" fill={C.peachDark} />
        <path d={ticket} fill="none" {...O3} />
        <path d="M17 14.5 V33.5" stroke={C.cream} strokeWidth={2} strokeDasharray="1.8 3.6" strokeLinecap="round" />
        <Live on={props.animated} kind="pulse">
          <Star cx={30.5} cy={24.2} R={7.4} fill={C.cream} shade={C.honeySoft} sw={2} />
        </Live>
        <g fill={C.cream}>
          <circle cx={11} cy={19} r={1.4} />
          <circle cx={11} cy={24} r={1.4} />
          <circle cx={11} cy={29} r={1.4} />
        </g>
        <Hl d="M22 15.4 H37" w={2} o={0.8} />
      </g>
      <Live on={props.animated} kind="twinkle">
        <Spark x={42} y={8.5} s={4} />
      </Live>
    </IconBase>
  );
}

/** 11. Tanda tambah chunky dengan kilau koin. */
export function PlusRecordIcon(props: CozyIconProps) {
  const pts =
    "22.5,11.5 25.5,11.5 25.5,22.5 36.5,22.5 36.5,25.5 25.5,25.5 25.5,36.5 22.5,36.5 22.5,25.5 11.5,25.5 11.5,22.5 22.5,22.5";
  return (
    <IconBase {...props}>
      <polygon points={pts} fill={C.matcha} stroke={INK} strokeWidth={11} strokeLinejoin="round" />
      <polygon points={pts} fill={C.matcha} stroke={C.matcha} strokeWidth={6} strokeLinejoin="round" />
      <path d="M26.6 31 V37.5 M31 26.6 H37.6" stroke={C.matchaDark} strokeWidth={2.6} strokeLinecap="round" />
      <Hl d="M21.4 17.4 V12.6 M12.4 21.6 H17" />
      <Live on={props.animated} kind="bob">
        <MiniCoin cx={37} cy={10.5} r={5.6} />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.6}>
        <Spark x={8.5} y={39.5} s={4} />
      </Live>
    </IconBase>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  12–20  Kategori transaksi
 * ═════════════════════════════════════════════════════════════ */

/** 12. Mangkuk nasi hangat + sumpit + telur. */
export function CatFoodIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="bob">
        <g fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.35}>
          <path d="M19 2.6 Q16.6 5 19 7.4 Q21.2 9.6 19 12" />
          <path d="M27 3.4 Q24.6 5.8 27 8.2" />
        </g>
      </Live>
      <path d="M10 27 C10 18.4 16 14 24 14 C32 14 38 18.4 38 27Z" fill={C.cream} {...O3} />
      <path d="M33 21 C36 22.6 37.6 24.6 38 27 H31Z" fill={C.fur} />
      <g stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.3}>
        <path d="M25 18.4 l2.4 1.2 M30 21.6 l2 1.4 M22.4 23 l2.2 -0.6 M29 25 l2.2 0.4" />
      </g>
      <g transform="rotate(-14 17.6 20.6)" style={SVG_ATTR_ORIGIN}>
        <ellipse cx={17.6} cy={20.6} rx={6} ry={4.4} fill={C.cream} {...O2} />
        <circle cx={17.6} cy={20.6} r={2.4} fill={C.honey} stroke={C.honeyDark} strokeWidth={1.2} />
      </g>
      <Duo d="M35.4 3 L27 20.6" inner={C.tan} ow={4.6} iw={2.2} />
      <Duo d="M39.4 5.6 L31.2 21.8" inner={C.tanLight} ow={4.6} iw={2.2} />
      <path d="M6.5 26.4 H41.5 C41 36 34 42.5 24 42.5 C14 42.5 7 36 6.5 26.4Z" fill={C.peach} />
      <path d="M41.5 26.4 C41 36 34 42.5 24 42.5 C31 40.4 36 34.6 37.2 26.4Z" fill={C.peachDark} />
      <path d="M6.5 26.4 H41.5 C41 36 34 42.5 24 42.5 C14 42.5 7 36 6.5 26.4Z" fill="none" {...O3} />
      <path d="M8.6 31 Q24 36.4 39.4 31" fill="none" stroke={C.honey} strokeWidth={2.6} strokeLinecap="round" />
      <Hl d="M10.6 29.4 Q11.4 33 14.6 36.2" w={2} />
      <rect x={17} y={41} width={14} height={3.6} rx={1.8} fill={C.peachDark} {...O2} />
    </IconBase>
  );
}

/** 13. Es kopi susu + donat. */
export function CatSnackIcon(props: CozyIconProps) {
  const cup = "M13 16 L35 16 L32.2 41.2 Q32 43.6 29.6 43.6 H18.4 Q16 43.6 15.8 41.2Z";
  return (
    <IconBase {...props}>
      <g transform="translate(-3 0)" style={SVG_ATTR_ORIGIN}>
        <path d={cup} fill={C.cream} fillOpacity={0.7} />
        <path d="M13.22 18 H34.78 L33.78 27 H14.22Z" fill={C.fur} />
        <path d="M14.22 27 H33.78 L32.2 41.2 H15.8Z" fill="#C9915C" />
        <path d="M14.22 27 Q19 29.4 24 27 Q29 24.6 33.78 27 V29.4 H14.22Z" fill="#C9915C" />
        <path d="M27 30 H33.4 L32.2 41.2 H25Z" fill="#A9743F" opacity={0.55} />
        <g fill={C.cream} stroke={INK} strokeWidth={1.7} strokeLinejoin="round" opacity={0.95}>
          <rect x={16.4} y={19.6} width={6} height={5.4} rx={1.6} transform="rotate(-10 19.4 22.3)" style={SVG_ATTR_ORIGIN} />
          <rect x={26} y={19} width={6} height={5.4} rx={1.6} transform="rotate(12 29 21.7)" style={SVG_ATTR_ORIGIN} />
        </g>
        <g fill="#4A3B30">
          <circle cx={19.4} cy={37.4} r={1.9} />
          <circle cx={23.6} cy={38.8} r={1.9} />
          <circle cx={27.8} cy={37.4} r={1.9} />
          <circle cx={21.6} cy={34.6} r={1.9} />
          <circle cx={26} cy={34.8} r={1.9} />
        </g>
        <path d={cup} fill="none" {...O3} />
        <Hl d="M16.6 29 L17.6 38" w={2} o={0.7} />
        <rect x={10.6} y={13} width={26.8} height={3.8} rx={1.9} fill={C.taro} {...O2} />
        <path d="M11.6 13 Q11.6 7 24 7 Q36.4 7 36.4 13Z" fill={C.skySoft} fillOpacity={0.85} {...O3} />
        <Hl d="M16 11.6 Q18 9.4 22 9" w={2} />
        <Live on={props.animated} kind="bob">
          <Duo d="M26 11.6 L31 1.8" inner={C.peach} ow={5.2} iw={2.8} />
        </Live>
      </g>
      <g>
        <path d={ringPath(35.4, 37.4, 9.2, 3.2)} fill={C.tanLight} fillRule="evenodd" {...O2} />
        <path d={ringPath(35.4, 36.8, 7.4, 3.2)} fill={C.peachSoft} fillRule="evenodd" stroke={C.peach} strokeWidth={1.2} />
        <circle cx={35.4} cy={37.4} r={3.2} fill="none" {...O2} />
        <g strokeWidth={1.8} strokeLinecap="round">
          <path d="M30.2 33.8 l1.6 -1" stroke={C.cream} />
          <path d="M38.8 32.8 l1.8 0.8" stroke={C.sky} />
          <path d="M40.6 38 l0.4 1.8" stroke={C.cream} />
          <path d="M31 40.4 l1.4 1" stroke={C.honey} />
          <path d="M36.2 42.2 l-1.4 0.8" stroke={C.cream} />
        </g>
      </g>
    </IconBase>
  );
}

/** 14. Bus mungil pastel. */
export function CatTransportIcon(props: CozyIconProps) {
  const body = "M5 37 V16 Q5 9 12 9 H37 Q43 9 43 16 V37 Q43 39 41 39 H7 Q5 39 5 37Z";
  return (
    <IconBase {...props}>
      <rect x={17} y={4.6} width={14} height={5.4} rx={2.2} fill={C.peach} {...O2} />
      <path d={body} fill={C.sky} />
      <path d="M5 30 H43 V37 Q43 39 41 39 H7 Q5 39 5 37Z" fill={C.skyDark} />
      <path d="M5 25 H43 V30 H5Z" fill={C.honey} />
      <path d="M5 25 H43" stroke={INK} strokeWidth={2} />
      <path d="M5 30 H43" stroke={INK} strokeWidth={2} />
      <path d={body} fill="none" {...O3} />
      <g fill={C.skySoft} {...O2}>
        <rect x={9} y={13} width={8} height={9} rx={2.4} />
        <rect x={19.6} y={13} width={8} height={9} rx={2.4} />
        <rect x={30.2} y={13} width={9} height={9} rx={2.4} />
      </g>
      <g stroke={C.cream} strokeWidth={1.8} strokeLinecap="round">
        <path d="M11 15.6 V17.6" />
        <path d="M21.6 15.6 V17.6" />
        <path d="M32.2 15.6 V17.6" />
      </g>
      <circle cx={40.2} cy={33.2} r={2} fill={C.honeySoft} stroke={INK} strokeWidth={1.6} />
      <circle cx={8} cy={33.2} r={1.6} fill={C.peach} stroke={INK} strokeWidth={1.4} />
      <Live on={props.animated} kind="bob" origin="bottom">
        <g>
          <circle cx={14} cy={39.6} r={5.2} fill={C.wheel} {...O} />
          <circle cx={14} cy={39.6} r={1.9} fill={C.cream} />
          <circle cx={35} cy={39.6} r={5.2} fill={C.wheel} {...O} />
          <circle cx={35} cy={39.6} r={1.9} fill={C.cream} />
        </g>
      </Live>
      <Hl d="M8 12.4 Q9 10.8 12 10.6" w={2} />
    </IconBase>
  );
}

function Book({
  x,
  y,
  w,
  h,
  color,
  shade,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  shade: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={color} {...O} />
      <rect x={x} y={y + h - 3.4} width={w} height={3.4} rx={1.7} fill={shade} />
      <rect x={x + 7} y={y + 2.6} width={w - 7} height={h - 5.2} rx={1.4} fill={C.cream} {...O2} />
      <path d={`M${x + 4.4} ${y + 2} V${y + h - 2}`} stroke={shade} strokeWidth={2} strokeLinecap="round" />
      <path d={`M${x + 11} ${y + h / 2} H${x + w - 4}`} stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.3} />
    </g>
  );
}

/** 15. Tumpukan buku + pensil. */
export function CatStudyIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Book x={4} y={32} w={30} h={10} color={C.taro} shade={C.taroDark} />
      <Book x={6.4} y={22} w={30} h={10} color={C.matcha} shade={C.matchaDark} />
      <Book x={8} y={12.4} w={26} h={9.6} color={C.sky} shade={C.skyDark} />
      <Live on={props.animated} kind="wiggle" origin="bottom">
        <g transform="translate(39.6 22.6) rotate(20)" style={SVG_ATTR_ORIGIN}>
          <rect x={-3} y={-17} width={6} height={4.6} rx={1.8} fill={C.peach} {...O2} />
          <rect x={-3} y={-12.6} width={6} height={3.2} fill={C.steel} {...O2} strokeWidth={1.8} />
          <rect x={-3} y={-9.6} width={6} height={16} fill={C.honey} {...O2} />
          <path d="M1.2 -8.6 V5.4" stroke={C.honeyDark} strokeWidth={2} strokeLinecap="round" />
          <path d="M-3 6.4 H3 L0 13.4Z" fill={C.cream} {...O2} />
          <path d="M-1.1 10.4 H1.1 L0 13.4Z" fill={INK} />
        </g>
      </Live>
    </IconBase>
  );
}

/** 16. Tas belanja dengan pita. */
export function CatShoppingIcon(props: CozyIconProps) {
  const bag = "M9 16 H39 L41 41 Q41 43.4 38.6 43.4 H9.4 Q7 43.4 7 41Z";
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="wiggle" origin="bottom">
        <Duo d="M16.6 18 V12.4 Q16.6 5.6 24 5.6 Q31.4 5.6 31.4 12.4 V18" inner={C.taro} ow={6.2} iw={3} />
      </Live>
      <path d={bag} fill={C.peach} />
      <path d="M8.1 33 H40.1 L41 41 Q41 43.4 38.6 43.4 H9.4 Q7 43.4 7 41Z" fill={C.peachDark} />
      <path d="M8.3 25.6 H39.7 L40 31 H8Z" fill={C.taro} />
      <path d="M8.3 25.6 H39.7 M8 31 H40" stroke={INK} strokeWidth={2} />
      <path d={bag} fill="none" {...O3} />
      <Hl d="M11 20.4 L11.6 24" w={2.2} />
      <path d="M24 28.4 C18 21.4 11.6 24.6 14.4 29.4 C16.6 32.6 22 31 24 28.4Z" fill={C.taroSoft} {...O2} />
      <path d="M24 28.4 C30 21.4 36.4 24.6 33.6 29.4 C31.4 32.6 26 31 24 28.4Z" fill={C.taroSoft} {...O2} />
      <path d="M24 28.6 L20.4 36.4 M24 28.6 L27.6 36.4" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={24} cy={28.4} r={2.8} fill={C.honey} {...O2} />
      <Live on={props.animated} kind="twinkle">
        <Spark x={40.5} y={7} s={3.8} />
      </Live>
    </IconBase>
  );
}

/** 17. Gamepad pastel. */
export function CatEntertainmentIcon(props: CozyIconProps) {
  const pad =
    "M13 13 H35 Q44 13 44.5 25 Q45 37 39.5 38.5 Q34.5 40 31 33.5 H17 Q13.5 40 8.5 38.5 Q3 37 3.5 25 Q4 13 13 13Z";
  return (
    <IconBase {...props}>
      <path d={pad} fill={C.taro} />
      <path
        d="M5.2 31.4 Q5.8 36.2 8.8 36.6 Q13 37.4 15.4 32 H32.6 Q35 37.4 39.2 36.6 Q42.2 36.2 42.8 31.4"
        fill="none"
        stroke={C.taroDark}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={pad} fill="none" {...O3} />
      <Hl d="M9 18 Q11 16 15 15.6" />
      <Hl d="M31 15.6 H36" w={2.2} />
      <path
        d="M11.6 19.4 H15.4 V22.6 H18.6 V26.4 H15.4 V29.6 H11.6 V26.4 H8.4 V22.6 H11.6Z"
        fill={C.cream}
        {...O2}
      />
      <Live on={props.animated} kind="pulse">
        <g {...O2}>
          <circle cx={34.6} cy={19.8} r={2.9} fill={C.matcha} />
          <circle cx={39.2} cy={24.4} r={2.9} fill={C.peach} />
          <circle cx={34.6} cy={29} r={2.9} fill={C.sky} />
          <circle cx={30} cy={24.4} r={2.9} fill={C.honey} />
        </g>
      </Live>
      <rect x={20.4} y={25.4} width={3.4} height={2.2} rx={1.1} fill={C.cream} stroke={INK} strokeWidth={1.4} />
      <rect x={25} y={25.4} width={3.4} height={2.2} rx={1.1} fill={C.cream} stroke={INK} strokeWidth={1.4} />
      <Live on={props.animated} kind="twinkle">
        <Spark x={24} y={8} s={4} />
      </Live>
    </IconBase>
  );
}

/** 18. Kartu tagihan dengan petir & Wi-Fi. */
export function CatBillsIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <rect x={4} y={9} width={40} height={30} rx={7} fill={C.cream} />
      <path d="M4 16 Q4 9 11 9 H37 Q44 9 44 16 V21 H4Z" fill={C.honey} />
      <path d="M4 17.4 H44 V21 H4Z" fill={C.honeyDark} opacity={0.5} />
      <path d="M4 33 H44 V32 Q44 39 37 39 H11 Q4 39 4 32Z" fill={C.fur} />
      <rect x={4} y={9} width={40} height={30} rx={7} fill="none" {...O3} />
      <path d="M4 21 H44" {...O} />
      <Hl d="M9 13.4 H20" w={2} o={0.85} />
      <Live on={props.animated} kind="pulse">
        <path
          d="M19.2 22.6 L11.4 31.6 H16.4 L14.2 37.8 L22.4 28.4 H17.2Z"
          fill={C.honey}
          {...O2}
        />
      </Live>
      <g fill="none" stroke={C.sky} strokeWidth={3.2} strokeLinecap="round">
        <path d={wifiArc(33.5, 36, 12.4)} />
        <path d={wifiArc(33.5, 36, 8.2)} />
        <path d={wifiArc(33.5, 36, 4)} />
      </g>
      <circle cx={33.5} cy={36} r={1.9} fill={C.sky} stroke={INK} strokeWidth={1.4} />
    </IconBase>
  );
}

/** 19. Dompet terbuka mengeluarkan uang & koin. */
export function CatIncomeIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 22 Q6 17.4 10.6 17.4 H37.4 Q42 17.4 42 22 V38 Q42 42.4 37.4 42.4 H10.6 Q6 42.4 6 38Z" fill={C.matchaDark} {...O3} />
      <Live on={props.animated} kind="bob">
        <g transform="translate(17.6 21) rotate(-14)" style={SVG_ATTR_ORIGIN}>
          <rect x={-8} y={-17} width={16} height={22} rx={2.6} fill={C.matchaSoft} {...O2} />
          <circle cx={0} cy={-6.4} r={3.4} fill={C.cream} {...O2} strokeWidth={1.8} />
          <path d="M-4.8 -13 H-2 M2 -13 H4.8" stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.4} />
        </g>
        <g transform="translate(29.6 21) rotate(10)" style={SVG_ATTR_ORIGIN}>
          <rect x={-8} y={-18} width={16} height={22} rx={2.6} fill={C.cream} {...O2} />
          <circle cx={0} cy={-7.4} r={3.4} fill={C.honey} {...O2} strokeWidth={1.8} />
          <path d="M-4.8 -14 H-2 M2 -14 H4.8" stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.4} />
        </g>
      </Live>
      <path d="M6 26 H42 V38 Q42 42.4 37.4 42.4 H10.6 Q6 42.4 6 38Z" fill={C.matcha} {...O3} />
      <path d="M7.4 37 H40.6 Q40 41 37.4 41 H10.6 Q8 41 7.4 37Z" fill={C.matchaDark} opacity={0.45} />
      <path d="M11 30.4 H29" stroke={C.cream} strokeWidth={2} strokeDasharray="2 3.4" strokeLinecap="round" />
      <rect x={33.4} y={28.6} width={10.6} height={9.4} rx={4.2} fill={C.honey} {...O2} />
      <circle cx={38.6} cy={33.3} r={1.7} fill={INK} />
      <Live on={props.animated} kind="twinkle">
        <MiniCoin cx={40.4} cy={9} r={5} />
      </Live>
    </IconBase>
  );
}

/** 20. Celengan babi keramik. */
export function CatSavingIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <path d="M39.6 25.6 Q46 22.4 43.6 28.2 Q42 31.6 45.6 31.4" fill="none" {...O} />
      <rect x={13} y={35} width={6.4} height={7.4} rx={2.6} fill={C.peach} {...O} />
      <rect x={28.4} y={35} width={6.4} height={7.4} rx={2.6} fill={C.peach} {...O} />
      <ellipse cx={23.4} cy={26} rx={16.8} ry={12.6} fill={C.peach} />
      <path d="M39.4 26.6 C39.2 33.8 32.6 38.6 23.4 38.6 C30.6 36 34 31.6 34 24.6Z" fill={C.peachDark} />
      <ellipse cx={23.4} cy={26} rx={16.8} ry={12.6} fill="none" {...O3} />
      <path d="M13 16.6 L12.2 6.6 L21.4 12.4Z" fill={C.peachSoft} {...O} />
      <ellipse cx={6.6} cy={27.6} rx={5.2} ry={4.4} fill={C.peachSoft} {...O} />
      <ellipse cx={5} cy={27} rx={1} ry={1.5} fill={INK} />
      <ellipse cx={8.4} cy={28} rx={1} ry={1.5} fill={INK} />
      <circle cx={14.6} cy={22.4} r={2.1} fill={INK} />
      <circle cx={15.2} cy={21.7} r={0.7} fill={C.cream} />
      <ellipse cx={15.4} cy={30} rx={3.4} ry={2} fill={C.berry} opacity={0.35} />
      <path d="M20.6 14.4 Q26.6 11.6 32 14.2" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
      <Hl d="M12.6 20 Q15.4 16.4 19 15.4" w={2} />
      <Star cx={28.4} cy={27.4} R={3.6} fill={C.honey} shade={C.honeyDark} sw={1.4} />
      <Live on={props.animated} kind="bob">
        <MiniCoin cx={26.4} cy={6.6} r={4.6} />
      </Live>
    </IconBase>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  21–28  Reward, status & peringatan
 * ═════════════════════════════════════════════════════════════ */

/** 21. Tiga bintang kombo bertumpuk. */
export function ComboSparkleIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="bob" delay={0.3}>
        <Star cx={10.5} cy={32.4} R={9.6} fill={C.sky} shade={C.skyDark} sw={2.4} />
      </Live>
      <Live on={props.animated} kind="bob" delay={0.6}>
        <Star cx={37.5} cy={32.4} R={9.6} fill={C.peach} shade={C.peachDark} sw={2.4} />
      </Live>
      <Live on={props.animated} kind="bob">
        <Star cx={24} cy={20.6} R={15} fill={C.honey} shade={C.honeyDark} sw={3} />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41} y={8} s={4.4} fill={C.honeySoft} outline />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.9}>
        <Spark x={6.5} y={11} s={3.4} fill={C.cream} outline />
      </Live>
    </IconBase>
  );
}

/** 22. Perisai emas dengan tanda Rp0. */
export function ZeroSpendIcon(props: CozyIconProps) {
  const shield = "M24 4.5 L40.5 9.5 V23 C40.5 33 33.5 40 24 44 C14.5 40 7.5 33 7.5 23 V9.5Z";
  return (
    <IconBase {...props}>
      <path d={shield} fill={C.honey} />
      <path d="M24 4.5 L40.5 9.5 V23 C40.5 33 33.5 40 24 44Z" fill={C.honeyDark} />
      <path d={shield} fill="none" {...O3} />
      <path
        d="M24 10 L35 13.4 V23 C35 30 30.6 35 24 38 C17.4 35 13 30 13 23 V13.4Z"
        fill={C.cream}
        stroke={C.honeyDark}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Live on={props.animated} kind="pulse">
        <g
          transform="translate(24 24.6) scale(0.9) translate(-24 -24)" style={SVG_ATTR_ORIGIN}
          fill="none"
          stroke={INK}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.4 29 V19 H17.6 Q20.4 19 20.4 21.7 Q20.4 24.4 17.6 24.4 H14.4 M17.6 24.4 L20.6 29" />
          <path d="M22.8 22 V31.4 M22.8 22.8 Q27.8 21 27.8 25.4 Q27.8 29 22.8 28.2" />
          <ellipse cx={32} cy={24} rx={3.1} ry={5.2} />
        </g>
      </Live>
      <Hl d="M11 12.6 L20 9.4" w={2.2} />
      <Live on={props.animated} kind="twinkle">
        <Spark x={42} y={8} s={4} fill={C.honeySoft} outline />
      </Live>
    </IconBase>
  );
}

/** 23. Kotak hadiah ungu-emas bertanda tanya. */
export function MysteryBoxIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="bob" origin="bottom">
        <rect x={8} y={22} width={32} height={20} rx={4} fill={C.taro} />
        <path d="M31 22 H36 Q40 22 40 26 V38 Q40 42 36 42 H31Z" fill={C.taroDark} />
        <rect x={8} y={22} width={32} height={20} rx={4} fill="none" {...O3} />
        <g fill={C.honey} {...O2}>
          <circle cx={12.4} cy={38} r={1.5} />
          <circle cx={35.6} cy={38} r={1.5} />
        </g>
        <path d="M24 14 C16.4 4.4 9 8.8 12 14 C14 17 21 16 24 14Z" fill={C.honey} {...O2} />
        <path d="M24 14 C31.6 4.4 39 8.8 36 14 C34 17 27 16 24 14Z" fill={C.honey} {...O2} />
        <rect x={5} y={14} width={38} height={9} rx={3.6} fill={C.taroSoft} {...O3} />
        <rect x={20} y={14} width={8} height={9} fill={C.honey} {...O2} />
        <circle cx={24} cy={13.4} r={2.8} fill={C.honeyDark} {...O2} />
        <Hl d="M9 17 H17" w={2} />
        <Duo d="M19.8 31 Q19.8 27 24 27 Q28.2 27 28.2 30.4 Q28.2 32.8 24 34 V35.6" inner={C.cream} ow={6} iw={3} />
        <circle cx={24} cy={39.2} r={1.9} fill={C.cream} stroke={INK} strokeWidth={1.6} />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41} y={8} s={4} />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.8}>
        <Spark x={6.5} y={9} s={3.2} fill={C.taroSoft} outline />
      </Live>
    </IconBase>
  );
}

const WING_PATH =
  "M16 27 C14 20 8 16 2.5 17.5 C3.5 20.5 4.5 22 6.5 23 C4 24 3.5 27 5.5 28.5 C4.5 30.5 6 33 9 33.5 C12 33.5 15 31 16 29Z";

/** 24. Lencana hati bersayap (Stiker Semangat Orang Tua). */
export function ParentHeartIcon(props: CozyIconProps) {
  const heart =
    "M24 41 C11 32.5 9 23 14.5 19 C18.5 16.2 22.5 18.2 24 22 C25.5 18.2 29.5 16.2 33.5 19 C39 23 37 32.5 24 41Z";
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="wiggle" origin="center">
        <g>
          <path d={WING_PATH} fill={C.cream} {...O3} />
          <path d="M14 26.4 C10.4 23.4 7.4 22.4 5.6 22.6 M13.6 29.6 C10.6 28.4 8 28.6 6.4 29" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.35} />
          <g transform="translate(48 0) scale(-1 1)" style={SVG_ATTR_ORIGIN}>
            <path d={WING_PATH} fill={C.cream} {...O3} />
            <path d="M14 26.4 C10.4 23.4 7.4 22.4 5.6 22.6 M13.6 29.6 C10.6 28.4 8 28.6 6.4 29" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.35} />
          </g>
        </g>
      </Live>
      <path d={heart} fill={C.peach} />
      <path d="M24 41 C37 32.5 39 23 33.5 19 C29.5 16.2 25.5 18.2 24 22Z" fill={C.peachDark} />
      <path d={heart} fill="none" {...O3} />
      <Hl d="M13.6 24 Q14 20.8 17.4 19.8" />
      <ellipse cx={24} cy={10.4} rx={6.4} ry={2.4} fill="none" stroke={INK} strokeWidth={6} />
      <ellipse cx={24} cy={10.4} rx={6.4} ry={2.4} fill="none" stroke={C.honey} strokeWidth={3} />
      <Live on={props.animated} kind="twinkle">
        <Spark x={41.5} y={11} s={3.6} />
      </Live>
    </IconBase>
  );
}

/** 25. Mahkota emas berpermata. */
export function CrownSultanIcon(props: CozyIconProps) {
  const crown = "M7 35 L5 14 L17 24 L24 7 L31 24 L43 14 L41 35Z";
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="bob" origin="bottom">
        <path d={crown} fill={C.honey} />
        <path d="M24 7 L31 24 L43 14 L41 35 H24Z" fill={C.honeyDark} />
        <path d={crown} fill="none" {...O3} />
        <Hl d="M9 20 L9.8 29" w={2.2} />
        <Hl d="M20 20.6 L23.4 12.6" w={2.2} />
        <g fill={C.cream} {...O2}>
          <circle cx={5} cy={13} r={2.9} />
          <circle cx={24} cy={6} r={2.9} />
          <circle cx={43} cy={13} r={2.9} />
        </g>
        <rect x={6.5} y={32} width={35} height={9} rx={3} fill={C.honeySoft} {...O3} />
        <Hl d="M10 34.6 H18" w={1.8} o={0.9} />
        <circle cx={24} cy={36.5} r={3.3} fill={C.sky} {...O2} />
        <circle cx={14.4} cy={36.5} r={2.3} fill={C.peach} {...O2} strokeWidth={1.8} />
        <circle cx={33.6} cy={36.5} r={2.3} fill={C.matcha} {...O2} strokeWidth={1.8} />
        <path d="M22.6 35.4 L23.6 34.6" stroke={C.cream} strokeWidth={1.4} strokeLinecap="round" />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41} y={4.6} s={3.8} fill={C.honeySoft} outline />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.9}>
        <Spark x={7.5} y={4} s={3} fill={C.cream} outline />
      </Live>
    </IconBase>
  );
}

/** 26. Gembok emas bulat lucu (item terkunci). */
export function LockCozyIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="wiggle" origin="bottom">
        <Duo d="M15.4 23 V16.6 Q15.4 6.6 24 6.6 Q32.6 6.6 32.6 16.6 V23" inner={C.steel} ow={8} iw={4.6} />
        <rect x={8} y={21} width={32} height={23} rx={9} fill={C.honey} />
        <path d="M8.2 32 H39.8 V35 Q39.8 44 31 44 H17 Q8.2 44 8.2 35Z" fill={C.honeyDark} />
        <rect x={8} y={21} width={32} height={23} rx={9} fill="none" {...O3} />
        <Hl d="M13 28 Q13.4 24.6 16.6 23.6" />
        <circle cx={24} cy={30} r={3.3} fill={INK} />
        <path d="M22.3 31.4 H25.7 L26.6 37.4 H21.4Z" fill={INK} />
        <ellipse cx={14.6} cy={34} rx={2.8} ry={1.8} fill={C.peach} opacity={0.85} />
        <ellipse cx={33.4} cy={34} rx={2.8} ry={1.8} fill={C.peach} opacity={0.85} />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41} y={11} s={3.6} />
      </Live>
    </IconBase>
  );
}

/** 27. Lampu sirine peringatan boros. */
export function WarningSirenIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="blink">
        <g fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round">
          <path d="M9 17 L4.6 13.6" />
          <path d="M14 9.6 L12 4.6" />
          <path d="M24 6.6 V1.8" />
          <path d="M34 9.6 L36 4.6" />
          <path d="M39 17 L43.4 13.6" />
        </g>
      </Live>
      <rect x={21.4} y={9.4} width={5.2} height={5} rx={1.6} fill={C.honey} {...O2} />
      <path d="M11 35 V27 Q11 13.6 24 13.6 Q37 13.6 37 27 V35Z" fill={C.peach} />
      <path d="M24 13.6 Q37 13.6 37 27 V35 H24Z" fill={C.peachDark} />
      <path d="M11 35 V27 Q11 13.6 24 13.6 Q37 13.6 37 27 V35Z" fill="none" {...O3} />
      <Hl d="M15.4 27 Q15.8 19.8 21 17.8" />
      <Live on={props.animated} kind="pulse">
        <Duo d="M24 20.2 V27" inner={C.cream} ow={5.8} iw={3} />
        <circle cx={24} cy={31} r={1.7} fill={C.cream} stroke={INK} strokeWidth={1.6} />
      </Live>
      <path d="M7.5 35 H40.5 V39.4 Q40.5 43 37 43 H11 Q7.5 43 7.5 39.4Z" fill={C.taro} {...O3} />
      <path d="M9 39.6 H39" stroke={C.taroDark} strokeWidth={2} strokeLinecap="round" />
      <Hl d="M11 37.4 H18" w={1.8} o={0.8} />
    </IconBase>
  );
}

/** 28. Lingkaran centang matcha tebal. */
export function CheckBadgeIcon(props: CozyIconProps) {
  return (
    <IconBase {...props}>
      <circle cx={24} cy={24} r={19} fill={C.matchaDark} />
      <circle cx={23} cy={22.5} r={17} fill={C.matcha} />
      <circle cx={24} cy={24} r={19} fill="none" {...O3} />
      <Hl d="M11.6 19.4 Q13.6 13.6 19.6 11.2" w={2.8} />
      <Live on={props.animated} kind="pulse">
        <Duo d="M14.6 24.6 L21.4 31.4 L33.4 17" inner={C.cream} ow={7.8} iw={4.4} />
      </Live>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41.5} y={7} s={3.8} />
      </Live>
    </IconBase>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  29–31  Dunia Pet & Butik (pengganti ikon Lucide + emoji pada tab)
 * ═════════════════════════════════════════════════════════════ */

/** 29. Lemari Kostum — kaos peach tergantung pada gantungan emas. */
export function WardrobeCostumeIcon(props: CozyIconProps) {
  const TEE =
    "M17 14 L8.4 17.6 Q6.6 18.4 7 20.4 L8.6 27 Q9 28.4 10.6 28 L13.4 27.2 V41 Q13.4 43 15.4 43 H32.6 Q34.6 43 34.6 41 V27.2 L37.4 28 Q39 28.4 39.4 27 L41 20.4 Q41.4 18.4 39.6 17.6 L31 14 Q28 18.2 24 18.2 Q20 18.2 17 14Z";
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="wiggle" origin="top">
        {/* kait gantungan (kecil, di atas kerah) */}
        <Duo d="M24 15 V11.4 Q24 7.2 27.4 7.2 Q30.4 7.2 30.4 10" inner={C.honey} ow={5.4} iw={2.8} />
        {/* kaos */}
        <path d={TEE} fill={C.peach} />
        <path d="M34.6 27.2 L37.4 28 Q39 28.4 39.4 27 L41 20.4 Q41.4 18.4 39.6 17.6 L31 14 Q33 19 34.6 24Z" fill={C.peachDark} />
        <path d="M34.6 27.2 V41 Q34.6 43 32.6 43 H27 Q31 38 31 31 Q31.4 28 34.6 27.2Z" fill={C.peachDark} opacity={0.55} />
        <path d={TEE} fill="none" {...O3} />
        {/* kerah rib */}
        <path d="M17.4 14.4 Q20.4 19.4 24 19.4 Q27.6 19.4 30.6 14.4" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M17.4 14.4 Q20.4 19.4 24 19.4 Q27.6 19.4 30.6 14.4" fill="none" stroke={C.honeySoft} strokeWidth={2.4} strokeLinecap="round" />
        {/* bintang di dada */}
        <Star cx={24} cy={31} R={4.6} fill={C.honey} shade={C.honeyDark} sw={2} />
        <Hl d="M14.4 31 Q14.4 36 15.4 39" w={2.2} o={0.75} />
        <Hl d="M12.2 20.6 L9.4 22" w={2} o={0.8} />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.3}>
        <Spark x={41.6} y={9} s={3.6} fill={C.taroSoft} />
      </Live>
    </IconBase>
  );
}

/** 30. Butik — toko mungil dengan kanopi belang peach & krem. */
export function BoutiqueShopIcon(props: CozyIconProps) {
  const W = 38 / 6;
  const seg = (i: number): [number, number] => [5 + i * W, 5 + (i + 1) * W];
  const stripe = (i: number): string => {
    const [x, x2] = seg(i);
    return `M${f(x)} 12 H${f(x2)} V20 Q${f((x + x2) / 2)} 25.4 ${f(x)} 20Z`;
  };
  let AWN = "M5 20 V9 Q5 6 8 6 H40 Q43 6 43 9 V20";
  for (let i = 5; i >= 0; i--) {
    const [x, x2] = seg(i);
    AWN += ` Q${f((x + x2) / 2)} 25.4 ${f(x)} 20`;
  }
  AWN += "Z";
  return (
    <IconBase {...props}>
      {/* badan toko */}
      <rect x={8.4} y={20} width={31.2} height={22.6} rx={3.2} fill={C.cream} />
      <path d="M31 20 H36.4 Q39.6 20 39.6 23.2 V39.4 Q39.6 42.6 36.4 42.6 H31Z" fill={C.fur} />
      <rect x={8.4} y={20} width={31.2} height={22.6} rx={3.2} fill="none" {...O3} />
      {/* jendela */}
      <rect x={11.6} y={27.4} width={11.6} height={9.8} rx={2.4} fill={C.skySoft} {...O} />
      <Hl d="M13.6 30.6 L16.4 29" w={2} />
      <Hl d="M13.6 33.8 L18.2 31.2" w={1.6} o={0.7} />
      {/* pintu */}
      <path d="M26.6 42.6 V30.6 Q26.6 28 29.2 28 H31 Q33.6 28 33.6 30.6 V42.6Z" fill={C.honey} {...O} />
      <path d="M31 28 Q33.6 28 33.6 30.6 V42.6 H31Z" fill={C.honeyDark} opacity={0.5} />
      <circle cx={31.8} cy={36} r={1.1} fill={C.cream} />
      {/* kanopi belang */}
      <path d={AWN} fill={C.cream} />
      <path d="M5 12 V9 Q5 6 8 6 H40 Q43 6 43 9 V12Z" fill={C.peach} />
      {[0, 2, 4].map((i) => (
        <path key={i} d={stripe(i)} fill={C.peach} />
      ))}
      <path d={AWN} fill="none" {...O3} />
      <Hl d="M9.6 9.4 H17" w={2.2} />
      <Live on={props.animated} kind="twinkle" delay={0.4}>
        <Spark x={44} y={32} s={3.6} />
      </Live>
      <Live on={props.animated} kind="bob">
        <Spark x={5} y={32} s={2.6} fill={C.taroSoft} />
      </Live>
    </IconBase>
  );
}

/** 31. Kandang & Adopsi — telur bercak dalam sarang jerami. */
export function EggNestIcon(props: CozyIconProps) {
  const EGG = "M24 4.6 C31.6 4.6 36.6 15 36.6 23.2 C36.6 31 31 36.4 24 36.4 C17 36.4 11.4 31 11.4 23.2 C11.4 15 16.4 4.6 24 4.6Z";
  const NEST = "M4.6 28.6 Q5 43.2 24 43.4 Q43 43.2 43.4 28.6 Q36.4 35 24 35 Q11.6 35 4.6 28.6Z";
  return (
    <IconBase {...props}>
      <Live on={props.animated} kind="wiggle" origin="bottom">
        <path d={EGG} fill={C.cream} />
        <path d="M36.6 23.2 C36.6 31 31 36.4 24 36.4 C28.4 33 30.6 27.6 29.6 20.6 C29 15.6 26.6 9.6 22.6 5.2 C23 4.8 23.5 4.6 24 4.6 C31.6 4.6 36.6 15 36.6 23.2Z" fill={C.fur} />
        <circle cx={19.4} cy={17.4} r={3} fill={C.taroSoft} stroke={C.taro} strokeWidth={1.6} />
        <circle cx={29.4} cy={24.4} r={3.6} fill={C.peachSoft} stroke={C.peach} strokeWidth={1.6} />
        <circle cx={19.8} cy={28.6} r={2.2} fill={C.skySoft} stroke={C.sky} strokeWidth={1.4} />
        <circle cx={26} cy={12.2} r={1.8} fill={C.honeySoft} stroke={C.honey} strokeWidth={1.2} />
        <path d={EGG} fill="none" {...O3} />
        <Hl d="M16.2 22.4 Q15.8 16.2 20 10.6" w={2.6} />
      </Live>
      {/* sarang */}
      <path d={NEST} fill={C.tan} />
      <path d="M4.6 28.6 Q11.6 35 24 35 Q36.4 35 43.4 28.6 Q43.6 31 43.2 33 Q36 37.4 24 37.4 Q12 37.4 4.8 33 Q4.4 31 4.6 28.6Z" fill={C.tanLight} />
      <path d="M8 38 Q24 44.6 40 38 Q38.6 42.6 24 43.4 Q9.4 42.6 8 38Z" fill={C.tanDark} opacity={0.65} />
      <path d={NEST} fill="none" {...O3} />
      <g fill="none" stroke={C.tanDark} strokeWidth={1.8} strokeLinecap="round">
        <path d="M10 33 Q16 35.6 21 35.4" />
        <path d="M27 35.4 Q33 35.6 38 33" />
        <path d="M13 40 Q24 42.6 35 40" />
      </g>
      <Live on={props.animated} kind="twinkle">
        <Spark x={41} y={9} s={4} />
      </Live>
      <Live on={props.animated} kind="twinkle" delay={0.6}>
        <Spark x={7} y={14} s={2.8} fill={C.taroSoft} />
      </Live>
    </IconBase>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  Dispatcher & helper
 * ═════════════════════════════════════════════════════════════ */

export const COZY_ICON_COMPONENTS: Record<IconName, ComponentType<CozyIconProps>> = {
  flame_streak: FlameStreakIcon,
  coin_rupiah: CoinRupiahIcon,
  xp_star: XpStarIcon,
  ice_shield: IceShieldIcon,
  calendar_streak: CalendarStreakIcon,
  home_path: HomePathIcon,
  missions_scroll: MissionsScrollIcon,
  detective_radar: DetectiveRadarIcon,
  pet_paw: PetPawIcon,
  rewards_ticket: RewardsTicketIcon,
  plus_record: PlusRecordIcon,
  cat_food: CatFoodIcon,
  cat_snack: CatSnackIcon,
  cat_transport: CatTransportIcon,
  cat_study: CatStudyIcon,
  cat_shopping: CatShoppingIcon,
  cat_entertainment: CatEntertainmentIcon,
  cat_bills: CatBillsIcon,
  cat_income: CatIncomeIcon,
  cat_saving: CatSavingIcon,
  combo_sparkle: ComboSparkleIcon,
  zero_spend: ZeroSpendIcon,
  mystery_box: MysteryBoxIcon,
  parent_heart: ParentHeartIcon,
  crown_sultan: CrownSultanIcon,
  lock_cozy: LockCozyIcon,
  warning_siren: WarningSirenIcon,
  check_badge: CheckBadgeIcon,
  wardrobe_costume: WardrobeCostumeIcon,
  boutique_shop: BoutiqueShopIcon,
  egg_nest: EggNestIcon,
};

/** Nama bahasa Indonesia tiap ikon — berguna untuk `title` / tooltip. */
export const ICON_LABEL: Record<IconName, string> = {
  flame_streak: "Api streak",
  coin_rupiah: "Koin rupiah",
  xp_star: "Bintang XP",
  ice_shield: "Perisai es Streak Freeze",
  calendar_streak: "Kalender streak",
  home_path: "Beranda",
  missions_scroll: "Misi",
  detective_radar: "Detektif pengeluaran",
  pet_paw: "Galeri Mochi",
  rewards_ticket: "Tukar poin",
  plus_record: "Catat transaksi",
  cat_food: "Makan pokok",
  cat_snack: "Jajan dan minuman",
  cat_transport: "Transportasi",
  cat_study: "Kuliah dan alat tulis",
  cat_shopping: "Belanja",
  cat_entertainment: "Hiburan",
  cat_bills: "Tagihan dan kuota",
  cat_income: "Pemasukan",
  cat_saving: "Tabungan",
  combo_sparkle: "Combo misi rinci",
  zero_spend: "Puasa jajan Rp0",
  mystery_box: "Kotak misteri",
  parent_heart: "Semangat dari orang tua",
  crown_sultan: "Mahkota sultan",
  lock_cozy: "Terkunci",
  warning_siren: "Peringatan boros",
  check_badge: "Selesai",
  wardrobe_costume: "Lemari kostum",
  boutique_shop: "Butik",
  egg_nest: "Kandang dan adopsi telur",
};

/** Ikon dinamis berdasarkan nama. */
export function CozyIcon({ name, ...props }: CozyIconComponentProps) {
  const Component = COZY_ICON_COMPONENTS[name];
  return <Component {...props} />;
}

/**
 * Peta nama kategori transaksi di `src/lib/spending-detective.ts` → ikon.
 * Dipakai untuk mengganti emoji OS (`EXPENSE_CATEGORIES[n].emoji`).
 */
export const CATEGORY_ICON: Record<string, IconName> = {
  // Pengeluaran
  "Makan Pokok": "cat_food",
  Transportasi: "cat_transport",
  "Kuliah/Alat Tulis": "cat_study",
  Tagihan: "cat_bills",
  "Jajan/Cemilan": "cat_snack",
  "Kopi/Minuman": "cat_snack",
  Nongkrong: "cat_snack",
  "Belanja/Hiburan": "cat_shopping",
  Lainnya: "mystery_box",
  // Pemasukan
  "Uang Saku Bulanan": "cat_income",
  "Bonus Orang Tua / Abang": "parent_heart",
  "Hadiah Tukar Poin Gamifikasi": "rewards_ticket",
  "Tabungan / Lainnya": "cat_saving",
};

export function getCategoryIconName(category: string): IconName {
  return CATEGORY_ICON[category] ?? "mystery_box";
}

/** Ikon kategori langsung dari nama kategori. */
export function CategoryIcon({
  category,
  ...props
}: CozyIconProps & { category: string }) {
  return <CozyIcon name={getCategoryIconName(category)} {...props} />;
}

export default CozyIcon;

"use client";

/**
 * BukuDompetLogo — identitas resmi BukuDompet.
 * Gaya: Duolingo × Finch Cozy Pastel (duotone layered, outline hangat #3D352E).
 *
 * Contoh pakai:
 *   <BukuDompetLogo variant="full" size="md" />      // mark + wordmark + badge
 *   <BukuDompetLogo variant="mark" size="sm" />      // hanya buku + Mochi (favicon/header)
 *   <MochiLoadingHop message="Menyiapkan buku kasmu..." />
 *
 * Catatan:
 * - Wordmark memakai font Fredoka dari `next/font` (`--font-fredoka`) dan
 *   `textLength` agar lebar tetap konsisten walau font belum termuat.
 * - Tanpa gradient/clipPath/id → aman dirender berkali-kali di satu halaman.
 * - Animasi (kedip tiap 4 dtk, telinga, koin) memakai framer-motion dan
 *   menghormati preferensi "reduce motion".
 */

import { MotionConfig, motion, type Transition } from "framer-motion";

/**
 * Reset origin transformasi untuk elemen SVG yang memakai atribut `transform="rotate/scale/..."`.
 * Tanpa ini, CSS global `svg g, svg path { transform-box: fill-box }` memindahkan titik asal
 * transformasi ke pojok bbox elemen sehingga bagian tubuh/ikon bergeser dan berantakan.
 */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;


/* ───────────────────────── Types ───────────────────────── */

export type LogoVariant = "full" | "mark";
export type LogoSize = "sm" | "md" | "lg";

export interface BukuDompetLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  /** Matikan semua animasi (mis. untuk favicon atau cetak). */
  static?: boolean;
}

export interface MochiLoadingHopProps {
  message?: string;
  className?: string;
}

/* ───────────────────────── Tokens ───────────────────────── */

const INK = "#3D352E";

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
  sky: "#38B6FF",
  fur: "#FFF1D6",
} as const;

// `var(--x, fallback)` agar font-family tetap valid walau variabel next/font belum ada.
const DISPLAY_FONT = 'var(--font-fredoka, "Fredoka"), "Nunito", ui-rounded, system-ui, sans-serif';
const BODY_FONT = 'var(--font-nunito, "Nunito"), system-ui, sans-serif';

const O = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const O25 = { ...O, strokeWidth: 2.5 } as const;

const loop = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "easeInOut", ...extra }) as Transition;

const sparklePath = (s: number): string =>
  `M0 ${-s} Q${s * 0.16} ${-s * 0.16} ${s} 0 Q${s * 0.16} ${s * 0.16} 0 ${s} Q${-s * 0.16} ${s * 0.16} ${-s} 0 Q${-s * 0.16} ${-s * 0.16} 0 ${-s}Z`;

const starPts = (cx: number, cy: number, R: number, r: number): string =>
  Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 === 0 ? R : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

/** Kilau berkedip. Bila `still`, tampil statis. */
function Sparkle({
  x,
  y,
  size = 8,
  color = C.honey,
  delay = 0,
  still,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  delay?: number;
  still?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      {still ? (
        <path d={sparklePath(size)} fill={color} />
      ) : (
        <motion.path
          d={sparklePath(size)}
          fill={color}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          animate={{ scale: [0.5, 1.1, 0.5], rotate: [0, 90, 180], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
        />
      )}
    </g>
  );
}

function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.honey} {...O} strokeWidth={r < 10 ? 2.5 : 3} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={2} />
      <path
        d={`M${cx - r * 0.1} ${cy - r * 0.3} V${cy + r * 0.3}`}
        stroke={C.honeyDark}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d={`M${cx - r * 0.62} ${cy - r * 0.2} Q${cx - r * 0.5} ${cy - r * 0.55} ${cx - r * 0.1} ${cy - r * 0.68}`}
        fill="none"
        stroke={C.cream}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  Mark: buku jurnal tebal + Mochi mengintip
 *  Koordinat lokal 0 0 160 168
 * ═════════════════════════════════════════════════════════════ */

const MARK_W = 160;
const MARK_H = 168;

function MochiPeek({ still }: { still?: boolean }) {
  const eye = (cx: number) => {
    const shape = (
      <g>
        <ellipse cx={cx} cy={44} rx={5.4} ry={6.6} fill={INK} />
        <circle cx={cx + 1.8} cy={41.6} r={2} fill={C.cream} />
        <circle cx={cx - 1.6} cy={46.6} r={1} fill={C.cream} />
      </g>
    );
    if (still) return shape;
    return (
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 4, times: [0, 0.93, 0.965, 1], repeat: Infinity, ease: "easeInOut" }}
      >
        {shape}
      </motion.g>
    );
  };

  const ear = (side: "l" | "r") => {
    const l = side === "l";
    const outer = l
      ? "M46 48 Q40 22 46 13 Q60 18 70 33Z"
      : "M106 48 Q112 22 106 13 Q92 18 82 33Z";
    const inner = l
      ? "M51 40 Q48 26 50 21 Q58 25 63 34Z"
      : "M101 40 Q104 26 102 21 Q94 25 89 34Z";
    const body = (
      <g>
        <path d={outer} fill={C.fur} {...O} />
        <path d={inner} fill={C.peachSoft} />
      </g>
    );
    if (still) return body;
    return (
      <motion.g
        style={{ transformBox: "fill-box", originX: l ? 0.7 : 0.3, originY: 0.95 }}
        animate={{ rotate: [0, l ? -9 : 9, 0, 0] }}
        transition={{
          duration: 0.5,
          times: [0, 0.35, 0.7, 1],
          repeat: Infinity,
          repeatDelay: l ? 2.6 : 3.7,
        }}
      >
        {body}
      </motion.g>
    );
  };

  const head = (
    <g>
      {ear("l")}
      {ear("r")}
      <ellipse cx={76} cy={56} rx={34} ry={29} fill={C.fur} {...O} />
      <g fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinecap="round">
        <path d="M70 29 Q72 36 69 41" />
        <path d="M76 28 V40" />
        <path d="M82 29 Q80 36 83 41" />
      </g>
      <ellipse cx={50} cy={53} rx={7.5} ry={4.6} fill={C.peach} opacity={0.65} />
      <ellipse cx={102} cy={53} rx={7.5} ry={4.6} fill={C.peach} opacity={0.65} />
      {eye(62)}
      {eye(90)}
      <path d="M72 52.4 Q76 50.4 80 52.4 Q78.4 56.4 76 57 Q73.6 56.4 72 52.4Z" fill={C.peach} {...O25} strokeWidth={2} />
    </g>
  );

  if (still) return head;
  return (
    <motion.g animate={{ y: [0, -3.5, 0] }} transition={loop(3.2)}>
      {head}
    </motion.g>
  );
}

function Mark({ still }: { still?: boolean }) {
  return (
    <g>
      <ellipse cx={80} cy={157} rx={60} ry={7} fill={INK} opacity={0.12} />

      {/* Mochi mengintip dari balik buku */}
      <MochiPeek still={still} />

      {/* blok halaman (menunjukkan ketebalan buku) */}
      <rect x={31} y={64} width={102} height={88} rx={18} fill={C.cream} {...O} />
      <path d="M126.4 80 V132 M129.6 84 V128" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.3} />
      <path d="M46 147.4 H108 M50 150.2 H104" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.3} />

      {/* pita pembatas buku — peach */}
      <path d="M103 138 V161 L111 154.4 L119 161 V138Z" fill={C.peach} {...O} />
      <path d="M111 140 V153" stroke={C.peachDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />

      {/* sampul matcha */}
      <rect x={22} y={58} width={100} height={86} rx={18} fill={C.matcha} {...O} />
      <path d="M22 76 Q22 58 40 58 H50 V144 H40 Q22 144 22 126Z" fill={C.matchaDark} />
      <path d="M22 136 H122 V126 Q122 144 104 144 H40 Q22 144 22 126Z" fill={C.matchaDark} opacity={0.35} />
      <rect x={22} y={58} width={100} height={86} rx={18} fill="none" {...O} />
      <path d="M50 58 V144" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M56 68 V134" stroke={C.cream} strokeWidth={2.4} strokeDasharray="3 6" strokeLinecap="round" opacity={0.85} />
      <path d="M32 74 Q33 66 41 63.6" fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.7} />
      <path d="M60 66 Q80 62.6 106 66" fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.55} />

      {/* label buku kas */}
      <rect x={63} y={76} width={46} height={22} rx={7} fill={C.cream} {...O25} />
      <path d="M81 84 H102 M81 91 H95" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.3} />
      <circle cx={72} cy={87} r={5.4} fill={C.honey} {...O25} strokeWidth={2} />

      {/* tali pengait + koin mahkota emas */}
      <rect x={96} y={102} width={35} height={15} rx={7.5} fill={C.honeySoft} {...O} />
      <path d="M118 105 V114" stroke={C.honeyDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
      <circle cx={97} cy={109.5} r={18} fill={C.honey} {...O} />
      <circle cx={97} cy={109.5} r={13} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={2.2} />
      <path
        d="M89.4 114.4 L88.4 103.4 L93.6 108.2 L97 100.8 L100.4 108.2 L105.6 103.4 L104.6 114.4Z"
        fill={C.honey}
        {...O25}
        strokeWidth={2.2}
      />
      <rect x={89} y={114} width={16} height={3.6} rx={1.8} fill={C.honeyDark} {...O25} strokeWidth={2} />
      <circle cx={97} cy={109.4} r={1.7} fill={C.sky} stroke={INK} strokeWidth={1.2} />
      <path d="M86.4 100 Q89 95.4 94.4 94.4" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.9} />

      {/* paw mencengkeram tepi buku */}
      <g>
        <ellipse cx={56} cy={60} rx={10} ry={7.4} fill={C.fur} {...O} strokeWidth={2.6} />
        <path d="M52.8 60.4 V64 M56.2 60.6 V64.4 M59.6 60.4 V64" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.45} />
        <ellipse cx={98} cy={60} rx={10} ry={7.4} fill={C.fur} {...O} strokeWidth={2.6} />
        <path d="M94.8 60.4 V64 M98.2 60.6 V64.4 M101.6 60.4 V64" stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.45} />
      </g>

      <Sparkle x={140} y={52} size={9} delay={0} still={still} />
      <Sparkle x={14} y={84} size={7} color={C.cream} delay={0.9} still={still} />
      <Sparkle x={146} y={96} size={6} color={C.honeySoft} delay={1.5} still={still} />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  Wordmark + badge
 *  Koordinat lokal (diletakkan di kanan mark)
 * ═════════════════════════════════════════════════════════════ */

const WORD_X = 178;
const WORD_Y = 92;
const WORD_LEN = 300;

function Wordmark({ still }: { still?: boolean }) {
  const common = {
    x: WORD_X,
    y: WORD_Y,
    fontFamily: DISPLAY_FONT,
    fontSize: 62,
    fontWeight: 700,
    textLength: WORD_LEN,
    lengthAdjust: "spacingAndGlyphs" as const,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  const word = (kuk: string, dom: string, strokeW: number) => (
    <>
      <tspan fill={kuk} stroke={kuk} strokeWidth={strokeW}>
        Buku
      </tspan>
      <tspan fill={dom} stroke={dom} strokeWidth={strokeW}>
        Dompet
      </tspan>
    </>
  );

  return (
    <g>
      {/* lapisan bayangan dalam (lip) */}
      <text {...common} transform="translate(0 5)" style={SVG_ATTR_ORIGIN}>
        {word("#B9AEA0", C.matchaDark, 1.6)}
      </text>
      {/* lapisan utama */}
      <text {...common}>{word(INK, C.matcha, 1.6)}</text>

      {/* aksen koin kecil berkilau */}
      <g transform="translate(490 40)" style={SVG_ATTR_ORIGIN}>
        {still ? (
          <Coin cx={0} cy={0} r={9} />
        ) : (
          <motion.g
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
            animate={{ y: [0, -4, 0], rotate: [-8, 8, -8] }}
            transition={loop(2)}
          >
            <Coin cx={0} cy={0} r={9} />
          </motion.g>
        )}
      </g>
      <Sparkle x={505} y={22} size={8} delay={0.2} still={still} />
      <Sparkle x={474} y={24} size={5} color={C.honeySoft} delay={1} still={still} />
    </g>
  );
}

function SubBadge() {
  return (
    <g>
      <rect x={WORD_X} y={112} width={168} height={32} rx={16} fill={C.honeyDark} />
      <rect x={WORD_X} y={108} width={168} height={32} rx={16} fill={C.honey} {...O25} />
      <path d={`M${WORD_X + 14} 113 H${WORD_X + 70}`} stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
      <polygon points={starPts(WORD_X + 20, 124.4, 7.4, 3.4)} fill={C.cream} {...O25} strokeWidth={1.8} />
      <text
        x={WORD_X + 100}
        y={129.4}
        textAnchor="middle"
        fontFamily={BODY_FONT}
        fontSize={16}
        fontWeight={900}
        fill={INK}
        textLength={118}
        lengthAdjust="spacingAndGlyphs"
      >
        Jurnal Kas Seru
      </text>
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  BukuDompetLogo
 * ═════════════════════════════════════════════════════════════ */

const SIZE_PX: Record<LogoSize, number> = { sm: 40, md: 64, lg: 120 };
const FULL_W = 516;

export function BukuDompetLogo({
  variant = "full",
  size = "md",
  className,
  static: still = false,
}: BukuDompetLogoProps) {
  const h = SIZE_PX[size];
  const vbW = variant === "full" ? FULL_W : MARK_W;
  const w = Math.round((h * vbW) / MARK_H);
  const label = variant === "full" ? "BukuDompet — Jurnal Kas Seru" : "Logo BukuDompet";

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox={`0 0 ${vbW} ${MARK_H}`}
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
        className={className}
        style={{ overflow: "visible" }}
      >
        <title>{label}</title>
        <Mark still={still} />
        {variant === "full" && (
          <>
            <Wordmark still={still} />
            <SubBadge />
          </>
        )}
      </svg>
    </MotionConfig>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  MochiLoadingHop — loading perpindahan halaman
 *  Mochi melompati 3 koin yang membal bergantian; buku kas membuka-menutup.
 *  Koordinat lokal 0 0 320 200
 * ═════════════════════════════════════════════════════════════ */

const HOP_DURATION = 5.6;
const LAND_X = [50, 107, 162, 217];
const X_TIMES = [0, 0.14, 0.28, 0.42, 0.5, 0.64, 0.78, 0.92, 1];
const X_VALUES = [
  LAND_X[0],
  LAND_X[1],
  LAND_X[2],
  LAND_X[3],
  LAND_X[3],
  LAND_X[2],
  LAND_X[1],
  LAND_X[0],
  LAND_X[0],
];
const Y_TIMES = [0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.5, 0.57, 0.64, 0.71, 0.78, 0.85, 0.92, 1];
const Y_VALUES = [0, -46, 0, -46, 0, -46, 0, 0, -46, 0, -46, 0, -46, 0, 0];
const SQUASH_VALUES = [0.9, 1.1, 0.9, 1.1, 0.9, 1.1, 0.9, 0.9, 1.1, 0.9, 1.1, 0.9, 1.1, 0.9, 0.9];
const FLIP_TIMES = [0, 0.44, 0.5, 0.94, 1];
const FLIP_VALUES = [1, 1, -1, -1, 1];

const COIN_X = [78, 134, 190];

function MochiSprite() {
  return (
    <g>
      {/* ekor */}
      <path d="M-13 -14 Q-32 -14 -29 -35" fill="none" stroke={INK} strokeWidth={9.4} strokeLinecap="round" />
      <path d="M-13 -14 Q-32 -14 -29 -35" fill="none" stroke={C.fur} strokeWidth={5.4} strokeLinecap="round" />
      <path d="M-29.6 -29 Q-30 -32 -29 -35" fill="none" stroke={C.honey} strokeWidth={5.4} strokeLinecap="round" />
      {/* kaki belakang & badan */}
      <ellipse cx={-9} cy={-3.6} rx={7} ry={4.4} fill={C.fur} {...O25} />
      <ellipse cx={0} cy={-17} rx={17} ry={14.4} fill={C.fur} {...O} />
      <ellipse cx={3} cy={-13} rx={9.6} ry={8.4} fill={C.cream} />
      <ellipse cx={10} cy={-3.6} rx={7} ry={4.4} fill={C.fur} {...O25} />
      {/* telinga */}
      <path d="M-8 -47 L-11 -63 L3 -54Z" fill={C.fur} {...O25} />
      <path d="M-7.4 -50 L-8.8 -58 L-1.6 -54Z" fill={C.peachSoft} />
      <path d="M15 -54 L24 -64 L26 -46Z" fill={C.fur} {...O25} />
      <path d="M17 -52 L22.6 -58.4 L23.4 -49Z" fill={C.peachSoft} />
      {/* kepala */}
      <ellipse cx={7} cy={-37} rx={19} ry={16} fill={C.fur} {...O} />
      <g fill="none" stroke={C.honey} strokeWidth={3.4} strokeLinecap="round">
        <path d="M3.6 -51 Q5 -47 3 -44.6" />
        <path d="M8 -51.4 V-44" />
        <path d="M12.4 -51 Q11 -47 13 -44.6" />
      </g>
      {/* wajah gembira */}
      <path d="M-1.4 -37 Q1.4 -41.4 4.2 -37" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
      <path d="M12.2 -37 Q15 -41.4 17.8 -37" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
      <ellipse cx={-3} cy={-30.6} rx={4} ry={2.6} fill={C.peach} opacity={0.7} />
      <ellipse cx={21} cy={-30.6} rx={4} ry={2.6} fill={C.peach} opacity={0.7} />
      <path d="M6 -33 Q9 -31 12 -33 Q10.8 -29.6 9 -29 Q7.2 -29.6 6 -33Z" fill={C.peach} {...O25} strokeWidth={1.8} />
      <path d="M4 -27.6 Q7 -24.4 9 -27.4 Q11 -24.4 14 -27.6" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

function BouncyCoin({ x, index }: { x: number; index: number }) {
  return (
    <g transform={`translate(${x} 156)`} style={SVG_ATTR_ORIGIN}>
      <motion.ellipse
        cx={0}
        cy={13}
        rx={11}
        ry={3.4}
        fill={INK}
        opacity={0.16}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ scaleX: [1, 0.6, 1] }}
        transition={{
          duration: 0.8,
          times: [0, 0.5, 1],
          repeat: Infinity,
          repeatDelay: 0.7,
          delay: index * 0.5,
          ease: "easeInOut",
        }}
      />
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        animate={{ y: [0, -26, 0], scaleY: [0.86, 1.06, 0.86] }}
        transition={{
          duration: 0.8,
          times: [0, 0.5, 1],
          repeat: Infinity,
          repeatDelay: 0.7,
          delay: index * 0.5,
          ease: ["easeOut", "easeIn"],
        }}
      >
        <Coin cx={0} cy={0} r={13} />
      </motion.g>
    </g>
  );
}

const BOOK_TIMES = [0, 0.2, 0.3, 0.4, 0.7, 0.8, 0.9, 1];
const COVER_SCALE = [1, 1, 0, 0, 0, 0, 1, 1];
const INSIDE_SCALE = [0, 0, 0, -1, -1, 0, 0, 0];

function LedgerBook() {
  const bookT: Transition = { duration: 3.6, times: BOOK_TIMES, repeat: Infinity, ease: "easeInOut" };
  return (
    <g transform="translate(254 126)" style={SVG_ATTR_ORIGIN}>
      <ellipse cx={26} cy={46} rx={30} ry={4.4} fill={INK} opacity={0.14} />
      {/* halaman kanan (selalu ada) */}
      <rect x={26} y={0} width={26} height={42} rx={4} fill={C.cream} {...O} strokeWidth={2.6} />
      <path d="M32 11 H46 M32 18 H46 M32 25 H42" stroke={C.sky} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
      <circle cx={44} cy={33} r={3.6} fill={C.honey} {...O25} strokeWidth={1.8} />
      {/* halaman kiri (tampak saat buku terbuka) */}
      <motion.g
        style={{ transformBox: "fill-box", originX: 0, originY: 0.5 }}
        animate={{ scaleX: INSIDE_SCALE }}
        transition={bookT}
      >
        <rect x={26} y={0} width={26} height={42} rx={4} fill={C.cream} {...O} strokeWidth={2.6} />
        <path d="M32 11 H46 M32 18 H46 M32 25 H43" stroke={C.honey} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
        <path d="M32 33 H40" stroke={C.matcha} strokeWidth={2.6} strokeLinecap="round" />
      </motion.g>
      {/* sampul matcha */}
      <motion.g
        style={{ transformBox: "fill-box", originX: 0, originY: 0.5 }}
        animate={{ scaleX: COVER_SCALE }}
        transition={bookT}
      >
        <rect x={26} y={-2} width={26} height={46} rx={6} fill={C.matcha} {...O} />
        <path d="M26 6 Q26 -2 32 -2 H35 V44 H32 Q26 44 26 38Z" fill={C.matchaDark} />
        <rect x={26} y={-2} width={26} height={46} rx={6} fill="none" {...O} />
        <path d="M35 -2 V44" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        <circle cx={44} cy={21} r={6.4} fill={C.honey} {...O25} />
        <path d="M41.4 23 L41 18.6 L43 20.4 L44 17.6 L45 20.4 L47 18.6 L46.6 23Z" fill={C.honeySoft} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M30 4 Q30 1.6 33 1.2" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
      </motion.g>
    </g>
  );
}

function Dots() {
  return (
    <span aria-hidden className="inline-flex w-[1.4em] justify-start">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

export function MochiLoadingHop({
  message = "Mochi lagi menyiapkan buku kasmu",
  className,
}: MochiLoadingHopProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div
        role="status"
        aria-live="polite"
        className={["flex flex-col items-center gap-2", className].filter(Boolean).join(" ")}
      >
        <svg
          viewBox="0 0 320 200"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          className="w-full max-w-xs"
          style={{ overflow: "visible" }}
        >
          {/* tanah rumput */}
          <rect x={14} y={170} width={292} height={12} rx={6} fill={C.matchaSoft} {...O} />
          <rect x={14} y={176} width={292} height={6} rx={3} fill={C.matcha} opacity={0.55} />
          <g stroke={C.matchaDark} strokeWidth={2.6} strokeLinecap="round">
            <path d="M30 170 L28 164 M30 170 L32 163.6" />
            <path d="M104 170 L102 165 M104 170 L106 164.6" />
            <path d="M246 170 L244 164 M246 170 L248 163.6" />
          </g>

          <LedgerBook />

          {COIN_X.map((x, i) => (
            <BouncyCoin key={x} x={x} index={i} />
          ))}

          {/* Mochi melompat */}
          <g transform="translate(0 168)" style={SVG_ATTR_ORIGIN}>
            <motion.g
              animate={{ x: X_VALUES }}
              transition={{ duration: HOP_DURATION, times: X_TIMES, repeat: Infinity, ease: "linear" }}
            >
              <motion.g
                animate={{ scaleX: FLIP_VALUES }}
                transition={{ duration: HOP_DURATION, times: FLIP_TIMES, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
              >
                <motion.g
                  animate={{ y: Y_VALUES, scaleY: SQUASH_VALUES }}
                  transition={{ duration: HOP_DURATION, times: Y_TIMES, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
                >
                  <MochiSprite />
                </motion.g>
              </motion.g>
            </motion.g>
          </g>

          <Sparkle x={34} y={96} size={8} delay={0} />
          <Sparkle x={290} y={80} size={6} color={C.cream} delay={0.8} />
          <Sparkle x={160} y={60} size={7} color={C.honeySoft} delay={1.4} />
        </svg>

        <p
          className="m-0 text-center text-sm font-extrabold text-[#3D352E]"
          style={{ fontFamily: BODY_FONT }}
        >
          {message}
          <Dots />
        </p>
      </div>
    </MotionConfig>
  );
}

export default BukuDompetLogo;

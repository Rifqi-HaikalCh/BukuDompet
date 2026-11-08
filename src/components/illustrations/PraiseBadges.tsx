"use client";

/**
 * PraiseBadges — 6 lencana medali koleksi penabung BukuDompet.
 *
 *   <PraiseBadge type="streak_7" className="w-40" />
 *   <PraiseBadge type="millionaire_club" earned={false} />   // belum terbuka (abu-abu, tanpa animasi)
 *   <PraiseBadgeCollection earned={["streak_7", "detail_master"]} />
 *
 * Tiap lencana: pita V + medali emas + wajah berwarna + emblem unik + banner pita
 * + kilau (shimmer) menyapu + kerlip bintang.
 * Garis tepi utama #3D352E strokeWidth 3 / 3.5, detail mungil 2.5.
 */

import { useId, type ReactNode } from "react";
import { MotionConfig, motion, type Transition } from "framer-motion";

/**
 * Reset origin transformasi untuk elemen SVG yang memakai atribut `transform="rotate/scale/..."`.
 * Tanpa ini, CSS global `svg g, svg path { transform-box: fill-box }` memindahkan titik asal
 * transformasi ke pojok bbox elemen sehingga bagian tubuh/ikon bergeser dan berantakan.
 */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;


/* ───────────────────────── Types & metadata ───────────────────────── */

export type BadgeId =
  | "streak_7"
  | "detail_master"
  | "budget_guardian"
  | "no_spend_hero"
  | "detective_ally"
  | "millionaire_club";

export const BADGE_IDS: BadgeId[] = [
  "streak_7",
  "detail_master",
  "budget_guardian",
  "no_spend_hero",
  "detective_ally",
  "millionaire_club",
];

export const BADGE_META: Record<BadgeId, { title: string; description: string }> = {
  streak_7: {
    title: "Api Konsistensi",
    description: "Mencatat keuangan 7 hari berturut-turut.",
  },
  detail_master: {
    title: "Juru Tulis Teliti",
    description: "Mengisi detail kategori dan catatan di setiap transaksi.",
  },
  budget_guardian: {
    title: "Perisai Dompet",
    description: "Menjaga pengeluaran tetap di bawah anggaran bulanan.",
  },
  no_spend_hero: {
    title: "Master Puasa Jajan",
    description: "Berhasil melewati hari tanpa jajan impulsif.",
  },
  detective_ally: {
    title: "Sahabat Detektif",
    description: "Membantu Mochi melacak pengeluaran yang mencurigakan.",
  },
  millionaire_club: {
    title: "Kandidat Jutawan",
    description: "Tabunganmu mulai mendekati target jutaan.",
  },
};

export interface PraiseBadgeProps {
  type: BadgeId;
  /** false → tampil abu-abu & statis (lencana belum terbuka). */
  earned?: boolean;
  className?: string;
  title?: string;
}

/* ───────────────────────── Tokens ───────────────────────── */

const INK = "#3D352E";
const C = {
  cream: "#FFFDF7",
  matcha: "#58CC02",
  honey: "#FFC800",
  peach: "#FF8B7B",
  taro: "#CE82FF",
  sky: "#38B6FF",
} as const;
const GOLD_DARK = "#E5A800";
const HONEY_SOFT = "#FFE27A";
const MATCHA_DARK = "#46A302";
const TARO_DEEP = "#A45EE8";
const TAN = "#E8B87A";
const TAN_LIGHT = "#F4D3A3";
const TAN_DARK = "#C8935A";

const line = {
  stroke: INK,
  strokeWidth: 3.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const line3 = { ...line, strokeWidth: 3 } as const;
const line25 = { ...line, strokeWidth: 2.5 } as const;

const loop = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "easeInOut", ...extra }) as Transition;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Bulatkan 2 desimal: hasil sin/cos bisa beda di digit terakhir antara server & klien (mismatch hidrasi). */
const r2 = (n: number): number => Math.round(n * 100) / 100;

const starPoints = (cx: number, cy: number, outer: number, inner: number, n = 5): string => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / n) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
};

const sparklePath = (s: number): string =>
  `M0 ${-s} Q${s * 0.16} ${-s * 0.16} ${s} 0 Q${s * 0.16} ${s * 0.16} 0 ${s} Q${-s * 0.16} ${s * 0.16} ${-s} 0 Q${-s * 0.16} ${-s * 0.16} 0 ${-s}Z`;

function Sparkle({
  x,
  y,
  size = 9,
  color = C.cream,
  delay = 0,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.path
        d={sparklePath(size)}
        fill={color}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1, 0], rotate: [0, 90, 180], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    </g>
  );
}

/* ───────────────────────── Per-badge theme ───────────────────────── */

interface Theme {
  face: string;
  faceLight: string;
  ribbon: [string, string];
}

const THEME: Record<BadgeId, Theme> = {
  streak_7: { face: C.taro, faceLight: "#E6BBFF", ribbon: [C.peach, C.honey] },
  detail_master: { face: C.sky, faceLight: "#9ADBFF", ribbon: [C.peach, C.taro] },
  budget_guardian: { face: "#FFF1D6", faceLight: C.cream, ribbon: [C.matcha, C.honey] },
  no_spend_hero: { face: C.peach, faceLight: "#FFC2B8", ribbon: [C.sky, C.taro] },
  detective_ally: { face: C.matcha, faceLight: "#9BE45A", ribbon: [C.honey, C.peach] },
  millionaire_club: { face: TARO_DEEP, faceLight: "#C79BF7", ribbon: [C.peach, C.sky] },
};

/* ───────────────────────── Medal frame ───────────────────────── */

function MedalFrame({
  uid,
  theme,
  earned,
  children,
}: {
  uid: string;
  theme: Theme;
  earned: boolean;
  children: ReactNode;
}) {
  const gold = `${uid}-gold`;
  const face = `${uid}-face`;
  const sheen = `${uid}-sheen`;
  const clip = `${uid}-disc`;

  return (
    <motion.g
      animate={earned ? { y: [0, -3, 0] } : { y: 0 }}
      transition={loop(3)}
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF0A0" />
          <stop offset="0.5" stopColor={C.honey} />
          <stop offset="1" stopColor={GOLD_DARK} />
        </linearGradient>
        <radialGradient id={face} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={theme.faceLight} />
          <stop offset="1" stopColor={theme.face} />
        </radialGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx={100} cy={112} r={66} />
        </clipPath>
      </defs>

      {/* pita V */}
      <polygon points="154,4 112,4 78,100 118,100" fill={theme.ribbon[1]} {...line} />
      <polygon points="46,4 88,4 122,100 82,100" fill={theme.ribbon[0]} {...line} />
      <path
        d="M67 9 L102 98 M133 9 L98 98"
        fill="none"
        stroke={C.cream}
        strokeWidth={2.5}
        strokeDasharray="2 6"
        strokeLinecap="round"
        opacity={0.75}
      />

      {/* ekor banner */}
      <path d="M12 164 L40 164 L40 190 L12 190 L22 177Z" fill={theme.ribbon[1]} {...line} />
      <path d="M188 164 L160 164 L160 190 L188 190 L178 177Z" fill={theme.ribbon[1]} {...line} />

      {/* medali */}
      <circle cx={100} cy={112} r={66} fill={`url(#${gold})`} {...line} />
      {Array.from({ length: 20 }).map((_, i) => (
        <circle
          key={i}
          cx={r2(100 + 59.5 * Math.cos(rad(i * 18)))}
          cy={r2(112 + 59.5 * Math.sin(rad(i * 18)))}
          r={2.4}
          fill={C.cream}
          opacity={0.85}
        />
      ))}
      <circle cx={100} cy={112} r={52} fill={`url(#${face})`} {...line3} />
      <path
        d="M64 88 Q72 66 98 60"
        fill="none"
        stroke={C.cream}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.5}
      />

      {children}

      {/* banner pita */}
      <path d="M36 160 Q100 182 164 160 L164 186 Q100 208 36 186Z" fill={theme.ribbon[0]} {...line} />
      {[
        [68, 181],
        [100, 184],
        [132, 181],
      ].map(([x, y]) => (
        <polygon key={x} points={starPoints(x, y, 5.5, 2.4)} fill={C.cream} {...line25} strokeWidth={2} />
      ))}

      {/* kilau */}
      {earned && (
        <>
          <g clipPath={`url(#${clip})`}>
            <g transform="rotate(25 100 112)" style={SVG_ATTR_ORIGIN}>
              <motion.rect
                x={-70}
                y={20}
                width={34}
                height={190}
                fill={`url(#${sheen})`}
                animate={{ x: [-70, 250] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
              />
            </g>
          </g>
          <Sparkle x={30} y={58} size={9} delay={0} />
          <Sparkle x={172} y={72} size={7} delay={0.8} />
          <Sparkle x={168} y={146} size={8} delay={1.4} color={C.honey} />
        </>
      )}
    </motion.g>
  );
}

/* ───────────────────────── Emblems ───────────────────────── */

/* 1 ─ Api Konsistensi: obor emas menyala + 7 titik hari */
function TorchEmblem() {
  return (
    <g>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = rad(-150 + i * 20);
        return (
          <motion.circle
            key={i}
            cx={r2(100 + 44 * Math.cos(a))}
            cy={r2(112 + 44 * Math.sin(a))}
            r={3.6}
            fill={C.honey}
            stroke={INK}
            strokeWidth={2}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={loop(1.4, { delay: i * 0.15 })}
          />
        );
      })}
      <g transform="translate(0 8)" style={SVG_ATTR_ORIGIN}>
        <motion.g
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={{ scaleY: [1, 1.1, 0.95, 1.06, 1], skewX: [-3, 3, -2, 2, -3] }}
          transition={loop(1.2)}
        >
          <path
            d="M100 70 C106 84 120 94 118 108 C116 118 108 120 100 120 C92 120 84 118 82 108 C80 94 94 84 100 70Z"
            fill={C.honey}
            {...line}
          />
          <path
            d="M100 88 C104 98 112 102 110 111 C109 116 105 118 100 118 C95 118 91 116 90 111 C88 102 96 98 100 88Z"
            fill={C.peach}
          />
          <ellipse cx={100} cy={111} rx={5} ry={6} fill={C.cream} />
        </motion.g>
        <path d="M92 130 L108 130 L105 150 Q100 154 95 150Z" fill={C.honey} {...line} />
        <path d="M93.5 138 L106.5 140 M94.5 145 L105.5 147" stroke={GOLD_DARK} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M83 112 L117 112 L110 130 Q100 134 90 130Z" fill={C.honey} {...line} />
        <path d="M85.5 119 L114.5 119" stroke={GOLD_DARK} strokeWidth={3} strokeLinecap="round" />
        <Sparkle x={120} y={74} size={7} color={C.cream} delay={0.3} />
        <Sparkle x={80} y={82} size={6} color={C.honey} delay={1} />
      </g>
    </g>
  );
}

/* 2 ─ Juru Tulis Teliti: struk bintang + kaca pembesar */
function ReceiptEmblem() {
  const bottom = Array.from({ length: 9 }, (_, i) => `L${(102 - i * 4.75).toFixed(2)} ${i % 2 ? 140 : 146}`).join(" ");
  return (
    <g>
      <g transform="rotate(-8 83 108)" style={SVG_ATTR_ORIGIN}>
        <path d={`M64 72 L102 72 ${bottom} Z`} fill={C.cream} {...line} />
        <path
          d="M70 82 L96 82 M70 92 L84 92 M90 92 L96 92 M70 100 L82 100 M90 100 L96 100 M70 134 L96 134"
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.4}
        />
        <polygon points={starPoints(83, 117, 11, 5)} fill={C.honey} {...line3} />
      </g>
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ rotate: [-6, 6, -6] }}
        transition={loop(2.2)}
      >
        <path d="M122 138 L132 148" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <path d="M122 138 L132 148" stroke={C.peach} strokeWidth={5.5} strokeLinecap="round" />
        <circle cx={110} cy={126} r={17} fill={C.cream} fillOpacity={0.35} />
        <circle cx={110} cy={126} r={17} fill="none" stroke={INK} strokeWidth={10.5} />
        <circle cx={110} cy={126} r={17} fill="none" stroke={C.honey} strokeWidth={4.5} />
        <path d="M99 120 Q102 114 108 112" fill="none" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" />
      </motion.g>
      <Sparkle x={126} y={84} size={6} color={C.cream} delay={0.6} />
    </g>
  );
}

/* 3 ─ Perisai Dompet: perisai zamrud matcha + koin berhati */
function ShieldEmblem({ uid }: { uid: string }) {
  const outline = "M100 66 L138 78 L138 112 Q138 140 100 160 Q62 140 62 112 L62 78Z";
  const clip = `${uid}-shield`;
  return (
    <motion.g
      style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={loop(2.4)}
    >
      <clipPath id={clip}>
        <path d={outline} />
      </clipPath>
      <path d={outline} fill={MATCHA_DARK} />
      <g clipPath={`url(#${clip})`}>
        <polygon points="62,78 100,66 100,108" fill="#8EE04A" />
        <polygon points="100,66 138,78 100,108" fill="#70D420" />
        <polygon points="138,78 138,112 100,108" fill={C.matcha} />
        <polygon points="138,112 100,160 100,108" fill={MATCHA_DARK} />
        <polygon points="100,160 62,112 100,108" fill={C.matcha} />
        <polygon points="62,112 62,78 100,108" fill="#70D420" />
        <path
          d="M100 66 L100 108 M62 78 L100 108 M138 78 L100 108 M62 112 L100 108 M138 112 L100 108 M100 160 L100 108"
          stroke={INK}
          strokeWidth={2.5}
          opacity={0.25}
          strokeLinecap="round"
        />
      </g>
      <path
        d="M100 73 L131 83 L131 112 Q131 134 100 151 Q69 134 69 112 L69 83Z"
        fill="none"
        stroke={C.honey}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <path d={outline} fill="none" {...line} />
      <g transform="translate(100 112)" style={SVG_ATTR_ORIGIN}>
        <circle r={16} fill={C.honey} {...line3} />
        <circle r={11.5} fill={HONEY_SOFT} stroke={GOLD_DARK} strokeWidth={2} />
        <path
          d="M0 8 C-11 0 -9 -9 -3.5 -9 C-1 -9 0 -6.5 0 -5.5 C0 -6.5 1 -9 3.5 -9 C9 -9 11 0 0 8Z"
          fill={C.peach}
          {...line25}
          strokeWidth={2}
        />
      </g>
      <Sparkle x={72} y={80} size={6} color={C.cream} delay={0.5} />
    </motion.g>
  );
}

/* 4 ─ Master Puasa Jajan: koin bersayap tenang + kue dicoret */
const WING_D =
  "M0 2 C-10 -16 -30 -24 -48 -18 C-44 -12 -44 -8 -48 -4 C-42 -2 -40 2 -42 8 C-36 8 -32 12 -32 18 C-20 18 -8 14 0 12Z";

function Wing() {
  return (
    <motion.g
      style={{ transformBox: "fill-box", originX: 1, originY: 0.6 }}
      animate={{ rotate: [0, -14, 0] }}
      transition={loop(1.1)}
    >
      <path d={WING_D} fill={C.cream} {...line} strokeWidth={5.2} />
      <path
        d="M-6 6 Q-24 0 -42 -10 M-6 10 Q-22 8 -40 6"
        fill="none"
        stroke={INK}
        strokeWidth={4.3}
        strokeLinecap="round"
        opacity={0.4}
      />
    </motion.g>
  );
}

function WingedCoinEmblem() {
  return (
    <g>
      <g transform="translate(84 108) scale(0.58)" style={SVG_ATTR_ORIGIN}>
        <Wing />
      </g>
      <g transform="translate(116 108) scale(-0.58 0.58)" style={SVG_ATTR_ORIGIN}>
        <Wing />
      </g>

      <motion.g animate={{ y: [0, -2.5, 0] }} transition={loop(1.1)}>
        <ellipse cx={100} cy={84} rx={13} ry={4.5} fill="none" stroke={INK} strokeWidth={8} />
        <ellipse cx={100} cy={84} rx={13} ry={4.5} fill="none" stroke={C.honey} strokeWidth={4} />
      </motion.g>

      <circle cx={100} cy={112} r={19} fill={C.honey} {...line} />
      <circle cx={100} cy={112} r={14} fill={HONEY_SOFT} stroke={GOLD_DARK} strokeWidth={2.5} />
      <path d="M90 111 Q93.5 106 97 111 M103 111 Q106.5 106 110 111" fill="none" {...line} strokeWidth={3} />
      <path d="M95 117 Q97.5 121 100 117 Q102.5 121 105 117" fill="none" {...line} strokeWidth={2.5} />
      <circle cx={88} cy={117} r={3.2} fill={C.peach} opacity={0.75} />
      <circle cx={112} cy={117} r={3.2} fill={C.peach} opacity={0.75} />

      {/* kue dicoret = puasa jajan */}
      <g transform="translate(122 138)" style={SVG_ATTR_ORIGIN}>
        <circle r={9} fill={TAN} {...line25} />
        <circle cx={-3} cy={-2} r={1.8} fill={INK} />
        <circle cx={3} cy={-3} r={1.8} fill={INK} />
        <circle cx={1} cy={4} r={1.8} fill={INK} />
        <circle r={12.5} fill="none" stroke={INK} strokeWidth={7} />
        <circle r={12.5} fill="none" stroke={C.cream} strokeWidth={3.5} />
        <path d="M-9 9 L9 -9" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        <path d="M-9 9 L9 -9" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" />
      </g>
    </g>
  );
}

/* 5 ─ Sahabat Detektif: topi deerstalker + lencana bintang emas */
function DetectiveEmblem() {
  const tips = Array.from({ length: 5 }).map((_, k) => {
    const a = rad(-90 + k * 72);
    return { x: r2(100 + 22 * Math.cos(a)), y: r2(140 + 22 * Math.sin(a)) };
  });
  return (
    <g>
      <g transform="translate(100 90) scale(0.9) translate(-100 -90)" style={SVG_ATTR_ORIGIN}>
        <path d="M62 86 Q48 94 56 112 Q68 112 70 98Z" fill={TAN_LIGHT} {...line} />
        <path d="M138 86 Q152 94 144 112 Q132 112 130 98Z" fill={TAN_LIGHT} {...line} />
        <path d="M64 102 Q66 70 100 68 Q134 70 136 102 Q100 112 64 102Z" fill={TAN} {...line} />
        <path
          d="M84 74 Q82 90 84 106 M100 68 L100 108 M116 74 Q118 90 116 106 M66 90 Q100 98 134 90"
          fill="none"
          stroke={TAN_DARK}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.65}
        />
        <path d="M76 104 Q100 118 124 104 L128 112 Q100 128 72 112Z" fill={TAN_DARK} {...line} />
        <ellipse cx={92} cy={65} rx={7} ry={4.5} fill={TAN_LIGHT} {...line25} transform="rotate(-20 92 65)" style={SVG_ATTR_ORIGIN} />
        <ellipse cx={108} cy={65} rx={7} ry={4.5} fill={TAN_LIGHT} {...line25} transform="rotate(20 108 65)" style={SVG_ATTR_ORIGIN} />
        <circle cx={100} cy={67} r={4} fill={TAN_DARK} {...line25} />
      </g>

      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ rotate: [-4, 4, -4] }}
        transition={loop(2)}
      >
        {tips.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={3.4} fill={HONEY_SOFT} {...line25} />
        ))}
        <polygon points={starPoints(100, 140, 22, 10)} fill={C.honey} {...line} />
        <circle cx={100} cy={140} r={7.5} fill={C.cream} {...line25} />
        <circle cx={99} cy={139} r={3.2} fill="none" stroke={INK} strokeWidth={2} />
        <path d="M101.5 141.5 L104.5 144.5" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      </motion.g>
      <Sparkle x={134} y={104} size={6} color={C.cream} delay={0.4} />
    </g>
  );
}

/* 6 ─ Kandidat Jutawan: piala bermahkota berlian */
function TrophyEmblem() {
  return (
    <g transform="translate(100 108) scale(0.9) translate(-100 -108)" style={SVG_ATTR_ORIGIN}>
      {/* gagang */}
      <path d="M74 94 Q54 92 56 108 Q58 122 78 118" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M74 94 Q54 92 56 108 Q58 122 78 118" fill="none" stroke={C.honey} strokeWidth={4} strokeLinecap="round" />
      <path d="M126 94 Q146 92 144 108 Q142 122 122 118" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M126 94 Q146 92 144 108 Q142 122 122 118" fill="none" stroke={C.honey} strokeWidth={4} strokeLinecap="round" />
      {/* kaki */}
      <rect x={76} y={148} width={48} height={12} rx={4} fill={C.honey} {...line} />
      <path d="M93 148 L107 148 L105 134 L95 134Z" fill={C.honey} {...line3} />
      <ellipse cx={100} cy={141} rx={9} ry={3.5} fill={HONEY_SOFT} {...line25} />
      {/* cawan */}
      <path d="M72 88 L128 88 L124 112 Q120 134 100 136 Q80 134 76 112Z" fill={C.honey} {...line} />
      <path d="M82 96 L84 114" stroke={C.cream} strokeWidth={4.5} strokeLinecap="round" opacity={0.65} />
      {/* berlian */}
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={loop(1.6)}
      >
        <g transform="translate(100 108)" style={SVG_ATTR_ORIGIN}>
          <polygon points="-12,-3 -6.6,-9.6 6.6,-9.6 12,-3 0,12" fill={C.sky} {...line3} />
          <path
            d="M-12 -3 L12 -3 M-6.6 -9.6 L-3 -3 L0 12 M6.6 -9.6 L3 -3 L0 12"
            fill="none"
            stroke={C.cream}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        </g>
      </motion.g>
      {/* mahkota */}
      <path d="M76 88 L74 62 L88 74 L100 56 L112 74 L126 62 L124 88Z" fill={HONEY_SOFT} {...line} />
      <path d="M77 82 L123 82" stroke={GOLD_DARK} strokeWidth={3} strokeLinecap="round" />
      <circle cx={74} cy={60} r={3.6} fill={C.cream} {...line25} strokeWidth={2} />
      <circle cx={100} cy={54} r={3.6} fill={C.cream} {...line25} strokeWidth={2} />
      <circle cx={126} cy={60} r={3.6} fill={C.cream} {...line25} strokeWidth={2} />
      <circle cx={100} cy={76} r={4} fill={C.peach} {...line25} />
      <Sparkle x={134} y={90} size={8} color={C.cream} delay={0.2} />
      <Sparkle x={64} y={128} size={6} color={C.honey} delay={1} />
    </g>
  );
}

const EMBLEMS: Record<BadgeId, (props: { uid: string }) => ReactNode> = {
  streak_7: () => <TorchEmblem />,
  detail_master: () => <ReceiptEmblem />,
  budget_guardian: ({ uid }) => <ShieldEmblem uid={uid} />,
  no_spend_hero: () => <WingedCoinEmblem />,
  detective_ally: () => <DetectiveEmblem />,
  millionaire_club: () => <TrophyEmblem />,
};

/* ───────────────────────── Public components ───────────────────────── */

export function PraiseBadge({ type, earned = true, className, title }: PraiseBadgeProps) {
  const uid = useId().replace(/:/g, "");
  const theme = THEME[type];
  const meta = BADGE_META[type];
  const label = title ?? `${meta.title}${earned ? "" : " (belum terbuka)"}`;

  return (
    <MotionConfig reducedMotion={earned ? "user" : "always"}>
      <svg
        viewBox="0 0 200 210"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
        className={className}
        style={{
          overflow: "visible",
          filter: earned ? undefined : "grayscale(1) opacity(0.55)",
        }}
      >
        <title>{label}</title>
        <MedalFrame uid={uid} theme={theme} earned={earned}>
          {EMBLEMS[type]({ uid })}
        </MedalFrame>
      </svg>
    </MotionConfig>
  );
}

export interface PraiseBadgeCollectionProps {
  /** Lencana yang sudah diraih. Default: semuanya. */
  earned?: BadgeId[];
  className?: string;
}

export function PraiseBadgeCollection({ earned = BADGE_IDS, className }: PraiseBadgeCollectionProps) {
  return (
    <ul className={className ?? "grid grid-cols-2 gap-5 sm:grid-cols-3"}>
      {BADGE_IDS.map((id) => {
        const has = earned.includes(id);
        return (
          <li key={id} className="flex flex-col items-center text-center">
            <PraiseBadge type={id} earned={has} className="w-full max-w-[160px]" />
            <p className="mt-2 text-sm font-extrabold text-[#3D352E]">{BADGE_META[id].title}</p>
            <p className="mt-0.5 text-xs leading-snug text-[#3D352E]/60">{BADGE_META[id].description}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default PraiseBadge;

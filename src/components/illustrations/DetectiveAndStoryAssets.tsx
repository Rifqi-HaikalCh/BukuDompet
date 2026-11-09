"use client";

/**
 * DetectiveAndStoryAssets — ilustrasi BukuDompet v5.0.
 * Gaya: Duolingo × Finch Cozy Pastel (outline hangat #3D352E, palet pastel proyek).
 *
 * Komponen:
 *   <InspectorSakuOwl mood="safe" className="w-64" />            // NPC Detektif Kas (bukan Pet milik user)
 *   <ColdStreakOverlayBadge isCold className="w-40" />           // indikator streak padam + efek es
 *   <EmotionWheelIcon emotion="happy" size={96} />               // roda emosi Story Time (Anak SD)
 *   <PiggyVaultIllustration progressPercent={62} isShaking />    // celengan kaca & emas (Catat Tabungan)
 *
 * Catatan teknis:
 * - Semua animasi memakai framer-motion di dalam <MotionConfig reducedMotion="user">, sehingga
 *   gerak transformasi otomatis dimatikan bagi pengguna yang meminta "reduce motion".
 * - Semua <motion.g> memakai `transformBox: "fill-box"` (helper `fb`). Grup yang berputar/berskala
 *   di sekitar titik tertentu memakai `Pivot`, yang menyertakan kotak jangkar transparan agar bbox
 *   (dan titik putar) pasti sama di server maupun klien.
 * - Elemen SVG biasa yang memakai atribut `transform=` memakai `SVG_ATTR_ORIGIN`.
 * - Tanpa Math.random / Date: seluruh posisi tetap dan koordinat trigonometri dibulatkan 2 desimal
 *   (`r2`) agar hasil SSR identik dengan hasil klien (tidak ada galat hidrasi).
 * - ID SVG (clipPath, pattern) unik per instance lewat useId().
 */

import { useId, type ReactNode } from "react";
import {
  MotionConfig,
  motion,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";

/* ───────────────────────── Token & helper ───────────────────────── */

const INK = "#3D352E";

/** Palet proyek (sama dengan PetAvatarSystem; tidak ada warna baru). */
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
  mouth: "#5B2E2E",
  steel: "#B9C9D4",
  steelDark: "#8FA5B4",
  wood: "#D99A5B",
  woodDark: "#B77C3F",
  woodLight: "#EBB67A",
  cardboard: "#E8B87A",
  cardboardLight: "#F4D3A3",
  cardboardDark: "#C8935A",
  wheel: "#6C6258",
} as const;

const O = { stroke: INK, strokeWidth: 3.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const O3 = { ...O, strokeWidth: 3 } as const;
const O25 = { ...O, strokeWidth: 2.5 } as const;

/** Elemen SVG biasa ber-`transform=`: asal transformasi = pojok kiri-atas sistem koordinat lokal. */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;

/** `transform-box: fill-box` + titik asal (0..1 dari bbox) untuk semua <motion.g>. */
const fb = (originX = 0.5, originY = 0.5) =>
  ({ transformBox: "fill-box", originX, originY }) as const;

const loop = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "easeInOut", ...extra }) as Transition;

const linearLoop = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "linear", ...extra }) as Transition;

/** Pembulatan 2 desimal (SSR = CSR). */
const r2 = (n: number): number => Math.round(n * 100) / 100;

type Pt = readonly [number, number];

/** Poligon bintang lima (koordinat dibulatkan). */
const starPoints = (cx: number, cy: number, R: number, r: number, n = 5): string =>
  Array.from({ length: n * 2 }, (_, i) => {
    const rr = i % 2 === 0 ? R : r;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${r2(cx + rr * Math.cos(a))},${r2(cy + rr * Math.sin(a))}`;
  }).join(" ");

const sparklePath = (s: number): string =>
  `M0 ${-s} Q${r2(s * 0.16)} ${r2(-s * 0.16)} ${s} 0 Q${r2(s * 0.16)} ${r2(s * 0.16)} 0 ${s} Q${r2(-s * 0.16)} ${r2(s * 0.16)} ${-s} 0 Q${r2(-s * 0.16)} ${r2(-s * 0.16)} 0 ${-s}Z`;

/** Kilau berkedip. */
function Sparkle({
  x,
  y,
  size = 8,
  color = C.honey,
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
      <motion.g
        style={fb()}
        animate={{ scale: [0.4, 1.1, 0.4], rotate: [0, 90, 180], opacity: [0.4, 1, 0.4] }}
        transition={loop(1.8, { delay })}
      >
        <path d={sparklePath(size)} fill={color} />
      </motion.g>
    </g>
  );
}

/**
 * Grup animasi dengan titik putar di koordinat (px, py). Kotak jangkar transparan (x, y, w, h) memaksa
 * bbox grup = kotak itu, sehingga `originX/originY` (fraksi bbox) tepat jatuh di (px, py). Semua isi grup
 * harus berada di dalam kotak jangkar.
 */
function Pivot({
  x,
  y,
  w,
  h,
  px,
  py,
  animate,
  transition,
  initial,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  px: number;
  py: number;
  animate?: TargetAndTransition;
  transition?: Transition;
  initial?: false;
  children: ReactNode;
}) {
  return (
    <motion.g
      style={fb(r2((px - x) / w), r2((py - y) / h))}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      <rect x={x} y={y} width={w} height={h} fill="none" pointerEvents="none" />
      {children}
    </motion.g>
  );
}

const idOf = (raw: string): string => raw.replace(/:/g, "");

/* ═════════════════════════════════════════════════════════════
 *  1. INSPEKTUR SAKU — BURUNG HANTU DETEKTIF
 * ═════════════════════════════════════════════════════════════ */

export type InspectorSakuMood = "safe" | "warning" | "danger_siren" | "proud";

export interface InspectorSakuOwlProps {
  mood?: InspectorSakuMood;
  className?: string;
}

export const INSPECTOR_SAKU_MOOD_LABEL: Readonly<Record<InspectorSakuMood, string>> = {
  safe: "tenang karena keuangan aman",
  warning: "waspada meneliti struk pengeluaran",
  danger_siren: "panik, sirine bahaya menyala",
  proud: "bangga karena kamu berhasil menabung",
};

/** Satu lengan: titik kontrol lengkung lengan jubah + posisi tangan. */
interface ArmFrame {
  c: Pt;
  h: Pt;
}

const SHOULDER_L: Pt = [134, 292];
const SHOULDER_R: Pt = [266, 292];

interface OwlPose {
  /** Lengan kiri-layar (memegang kaca pembesar). Dua bingkai = bergerak bolak-balik. */
  l: readonly ArmFrame[];
  /** Lengan kanan-layar. */
  r: readonly ArmFrame[];
  /** Durasi bolak-balik (detik) jika bingkai > 1. */
  dur: number;
  /** Rotasi kaca pembesar terhadap tangan (derajat), searah bingkai lengan. */
  lensRot: readonly number[];
}

const OWL_POSE: Record<InspectorSakuMood, OwlPose> = {
  safe: {
    l: [
      { c: [100, 306], h: [86, 348] },
      { c: [100, 302], h: [88, 342] },
    ],
    r: [
      { c: [324, 304], h: [332, 240] },
      { c: [324, 300], h: [332, 232] },
    ],
    dur: 1.8,
    lensRot: [0, 0],
  },
  warning: {
    l: [
      { c: [162, 296], h: [175, 258] },
      { c: [160, 294], h: [171, 254] },
    ],
    r: [
      { c: [310, 332], h: [298, 350] },
      { c: [310, 330], h: [298, 348] },
    ],
    dur: 1.4,
    lensRot: [0, 0],
  },
  danger_siren: {
    l: [
      { c: [66, 262], h: [56, 176] },
      { c: [98, 304], h: [78, 238] },
    ],
    r: [
      { c: [334, 304], h: [322, 238] },
      { c: [336, 262], h: [346, 176] },
    ],
    dur: 0.2,
    lensRot: [-14, 14],
  },
  proud: {
    l: [
      { c: [64, 250], h: [54, 182] },
      { c: [64, 246], h: [52, 172] },
    ],
    r: [
      { c: [348, 214], h: [264, 152] },
      { c: [348, 210], h: [262, 150] },
    ],
    dur: 0.55,
    lensRot: [-8, -14],
  },
};

const sleeveD = (s: Pt, a: ArmFrame): string =>
  `M${s[0]} ${s[1]} Q${a.c[0]} ${a.c[1]} ${a.h[0]} ${a.h[1]}`;

/** Lengan jubah (outline + caramel) yang bergerak antar-bingkai, sinkron dengan grup tangan. */
function Sleeve({
  shoulder,
  frames,
  dur,
}: {
  shoulder: Pt;
  frames: readonly ArmFrame[];
  dur: number;
}) {
  const ds = frames.map((f) => sleeveD(shoulder, f));
  const seq = frames.length > 1 ? [...ds, ds[0]] : ds;
  const t: Transition = frames.length > 1 ? loop(dur) : { duration: 0.45, ease: "easeOut" };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d={ds[0]} initial={false} animate={{ d: seq }} transition={t} stroke={INK} strokeWidth={34} />
      <motion.path d={ds[0]} initial={false} animate={{ d: seq }} transition={t} stroke={C.wood} strokeWidth={27} />
    </g>
  );
}

/** Grup yang mengikuti posisi tangan (koordinat lokal: tangan = titik 0,0). */
function HandFollow({
  frames,
  dur,
  children,
}: {
  frames: readonly ArmFrame[];
  dur: number;
  children: ReactNode;
}) {
  const xs = frames.map((f) => f.h[0]);
  const ys = frames.map((f) => f.h[1]);
  const multi = frames.length > 1;
  const t: Transition = multi ? loop(dur) : { duration: 0.45, ease: "easeOut" };
  return (
    <motion.g
      style={fb(0, 0)}
      initial={false}
      animate={{ x: multi ? [...xs, xs[0]] : xs, y: multi ? [...ys, ys[0]] : ys }}
      transition={t}
    >
      {children}
    </motion.g>
  );
}

/** Tangan/sayap berbentuk mitten (opsional jempol terangkat). */
function Mitt({ thumb = false }: { thumb?: boolean }) {
  return (
    <g>
      {thumb && <ellipse cx={-1} cy={-19} rx={7} ry={12} fill={C.cardboard} {...O3} />}
      <ellipse cx={0} cy={0} rx={16} ry={14} fill={C.cardboard} {...O3} />
      <path d="M-8 4 Q0 9 8 4" fill="none" stroke={C.cardboardDark} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

/** Lencana perisai di dada (warna & simbol mengikuti mood). */
function ShieldBadge({ mood }: { mood: InspectorSakuMood }) {
  const fill = mood === "safe" ? C.matcha : mood === "danger_siren" ? C.peach : C.honey;
  return (
    <g transform="translate(250 332)" style={SVG_ATTR_ORIGIN}>
      <path d="M0 -21 L17 -14 Q17 13 0 23 Q-17 13 -17 -14Z" fill={fill} {...O3} />
      <path d="M-9 -12 Q0 -17 9 -12" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      {mood === "safe" && (
        <path d="M-8 1 L-2 8 L9 -6" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {mood === "warning" && (
        <g stroke={C.cream} strokeLinecap="round" strokeWidth={4}>
          <path d="M0 -8 V3" fill="none" />
          <path d="M0 11 V11.5" fill="none" />
        </g>
      )}
      {mood === "danger_siren" && (
        <path d="M-7 -6 L7 8 M7 -6 L-7 8" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" />
      )}
      {mood === "proud" && <polygon points={starPoints(0, 1, 11, 5)} fill={C.cream} stroke={INK} strokeWidth={2} strokeLinejoin="round" />}
    </g>
  );
}

/** Buku catatan kas yang digenggam (koordinat lokal: tangan = 0,0). */
function HeldNotebook({ receipt }: { receipt: boolean }) {
  return (
    <g transform="rotate(-10)" style={SVG_ATTR_ORIGIN}>
      {receipt && (
        <g>
          <path d="M-12 -46 V-86 H8 V-46 l-3.3 -4 l-3.4 4 l-3.3 -4 l-3.4 4 l-3.3 -4Z" fill={C.cream} {...O25} />
          <path d="M-8 -78 H4 M-8 -70 H4 M-8 -62 H0" fill="none" stroke={C.cardboardDark} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      )}
      <rect x={-30} y={-58} width={46} height={56} rx={7} fill={C.honey} {...O3} />
      <rect x={10} y={-54} width={4} height={48} rx={2} fill={C.cream} />
      <g fill={C.honeyDark}>
        <circle cx={-26} cy={-48} r={2} />
        <circle cx={-26} cy={-38} r={2} />
        <circle cx={-26} cy={-28} r={2} />
        <circle cx={-26} cy={-18} r={2} />
      </g>
      <circle cx={-8} cy={-30} r={12} fill={C.cream} {...O25} />
      <path d="M-8 -36 V-24 M-12 -33 Q-8 -37 -4 -33 M-12 -27 Q-8 -23 -4 -27" fill="none" stroke={C.honeyDark} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

/** Kaca pembesar (koordinat lokal: tangan = 0,0; lensa berpusat di -8,-60). */
function Magnifier({
  uid,
  magnified,
  rotKeys,
  dur,
}: {
  uid: string;
  magnified: boolean;
  rotKeys: readonly number[];
  dur: number;
}) {
  const rot = rotKeys.length > 1 && rotKeys[0] !== rotKeys[1];
  return (
    <Pivot
      x={-44}
      y={-92}
      w={62}
      h={102}
      px={0}
      py={0}
      initial={false}
      animate={rot ? { rotate: [...rotKeys, rotKeys[0]] } : { rotate: rotKeys[0] }}
      transition={rot ? loop(dur) : { duration: 0.45, ease: "easeOut" }}
    >
      <clipPath id={`${uid}-lens`}>
        <circle cx={-8} cy={-60} r={24} />
      </clipPath>
      <path d="M-1 0 L-6 -34" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <path d="M-1 0 L-6 -34" fill="none" stroke={C.woodDark} strokeWidth={5.5} strokeLinecap="round" />
      <circle cx={-8} cy={-60} r={27} fill={C.skySoft} fillOpacity={0.5} stroke={INK} strokeWidth={8.5} />
      <circle cx={-8} cy={-60} r={27} fill="none" stroke={C.honey} strokeWidth={4.5} />
      {magnified && (
        <g clipPath={`url(#${uid}-lens)`}>
          <circle cx={-8} cy={-60} r={38} fill={C.cream} />
          <circle cx={-6} cy={-57} r={17} fill={INK} />
          <circle cx={-12} cy={-63} r={5.5} fill={C.cream} />
          <circle cx={0} cy={-52} r={2.6} fill={C.cream} />
          <path d="M-34 -78 L16 -70" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
      <path d="M-27 -66 Q-24 -78 -12 -83" fill="none" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" opacity={0.95} />
    </Pivot>
  );
}

/** Koin bersayap yang terbang kabur (mood sirine). */
function WingedCoin({
  from,
  dx,
  dy,
  delay,
  dur,
}: {
  from: Pt;
  dx: number;
  dy: number;
  delay: number;
  dur: number;
}) {
  return (
    <g transform={`translate(${from[0]} ${from[1]})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={fb()}
        animate={{ x: [0, dx * 0.5, dx], y: [0, dy * 0.7, dy], opacity: [0, 1, 0], rotate: [0, 8, -8] }}
        transition={{ duration: dur, repeat: Infinity, ease: "easeOut", delay }}
      >
        <motion.g
          style={fb(1, 0.5)}
          animate={{ scaleY: [1, 0.3, 1] }}
          transition={loop(0.22)}
        >
          <path d="M-11 -3 Q-26 -22 -36 -14 Q-31 -4 -35 3 Q-23 5 -11 4Z" fill={C.cream} {...O25} />
        </motion.g>
        <motion.g
          style={fb(0, 0.5)}
          animate={{ scaleY: [1, 0.3, 1] }}
          transition={loop(0.22)}
        >
          <path d="M11 -3 Q26 -22 36 -14 Q31 -4 35 3 Q23 5 11 4Z" fill={C.cream} {...O25} />
        </motion.g>
        <circle r={14} fill={C.honey} {...O3} />
        <circle r={8.5} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={2} />
        <path d="M-10 -4 Q-8 -9 -3 -11" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

/** Lampu sirine merah-oranye di atas topi (mood danger_siren). */
function SirenLamp() {
  const rays = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (Math.PI / 3) * i;
    return {
      x1: r2(200 + 31 * Math.cos(a)),
      y1: r2(56 + 31 * Math.sin(a)),
      x2: r2(200 + 43 * Math.cos(a)),
      y2: r2(56 + 43 * Math.sin(a)),
      color: i % 2 === 0 ? C.peach : C.honey,
    };
  });
  return (
    <g>
      {/* sorot bergantian kiri-kanan */}
      <motion.g style={fb(1, 0.5)} animate={{ opacity: [0.75, 0.05, 0.75] }} transition={loop(0.6)}>
        <polygon points="196,56 112,30 112,82" fill={C.honeySoft} />
      </motion.g>
      <motion.g style={fb(0, 0.5)} animate={{ opacity: [0.05, 0.75, 0.05] }} transition={loop(0.6)}>
        <polygon points="204,56 288,30 288,82" fill={C.peachSoft} />
      </motion.g>
      {/* sinar berputar */}
      <Pivot x={156} y={12} w={88} h={88} px={200} py={56} animate={{ rotate: 360 }} transition={linearLoop(1.1)}>
        {rays.map((ray, i) => (
          <path
            key={i}
            d={`M${ray.x1} ${ray.y1} L${ray.x2} ${ray.y2}`}
            fill="none"
            stroke={ray.color}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ))}
      </Pivot>
      <rect x={176} y={68} width={48} height={16} rx={6} fill={C.steel} {...O3} />
      <path d="M182 70 Q182 40 200 40 Q218 40 218 70Z" fill={C.peach} {...O3} />
      <motion.g style={fb(0.5, 1)} animate={{ opacity: [1, 0.35, 1] }} transition={loop(0.6)}>
        <path d="M190 68 Q190 52 200 52 Q210 52 210 68Z" fill={C.honey} />
      </motion.g>
      <path d="M188 58 Q189 48 196 45" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.95} />
    </g>
  );
}

/** Wajah burung hantu: mata, alis, paruh, mulut, pipi (berbeda per mood). */
function OwlFace({ mood, uid }: { mood: InspectorSakuMood; uid: string }) {
  const EL: Pt = [160, 200];
  const ER: Pt = [240, 200];
  const eyes: [Pt, "l" | "r"][] = [
    [EL, "l"],
    [ER, "r"],
  ];
  const blink = mood === "safe" || mood === "warning";

  const browPaths: Record<InspectorSakuMood, [string, string]> = {
    safe: ["M136 172 Q158 163 182 170", "M218 170 Q242 163 264 172"],
    warning: ["M136 160 Q160 163 184 175", "M216 175 Q240 163 264 156"],
    danger_siren: ["M136 176 Q160 170 184 160", "M216 160 Q240 170 264 176"],
    proud: ["M136 168 Q158 156 182 164", "M218 164 Q242 156 264 168"],
  };

  return (
    <g>
      {/* piringan wajah */}
      <path d="M200 175.82 A44 44 0 1 0 200 220.18 A44 44 0 1 0 200 175.82Z" fill={C.cardboardLight} {...O3} />

      {/* pipi merona */}
      <ellipse cx={132} cy={226} rx={13} ry={7.5} fill={C.peach} opacity={mood === "danger_siren" ? 0.35 : 0.7} />
      <ellipse cx={268} cy={226} rx={13} ry={7.5} fill={C.peach} opacity={mood === "danger_siren" ? 0.35 : 0.7} />

      {/* mata */}
      {mood === "proud" ? (
        <g fill="none" {...O} strokeWidth={4.5}>
          <motion.path d="M143 206 Q160 184 177 206" animate={{ y: [0, -2, 0] }} transition={loop(0.55)} />
          <motion.path d="M223 206 Q240 184 257 206" animate={{ y: [0, -2, 0] }} transition={loop(0.55)} />
        </g>
      ) : (
        <motion.g
          style={fb(0.5, 0.5)}
          animate={blink ? { scaleY: [1, 1, 0.1, 1] } : undefined}
          transition={blink ? { duration: 0.3, times: [0, 0.5, 0.75, 1], repeat: Infinity, repeatDelay: 3.2 } : undefined}
        >
          {eyes.map(([[x, y], side]) => {
            const lid = mood === "warning";
            const px = mood === "safe" ? x + (side === "l" ? 1 : -1) : mood === "warning" ? x - 3 : x;
            const py = mood === "safe" ? y + 3 : mood === "warning" ? y + 6 : y;
            const pr = mood === "safe" ? 12 : mood === "warning" ? 8.5 : 5.5;
            return (
              <g key={side}>
                <clipPath id={`${uid}-eye${side}`}>
                  <circle cx={x} cy={y} r={26} />
                </clipPath>
                <circle cx={x} cy={y} r={26} fill={C.cream} {...O3} />
                <motion.g
                  style={fb()}
                  animate={mood === "danger_siren" ? { x: [-2.5, 2.5, -2.5] } : undefined}
                  transition={mood === "danger_siren" ? loop(0.1) : undefined}
                >
                  <circle cx={px} cy={py} r={pr} fill={INK} />
                  <circle cx={px - pr * 0.35} cy={py - pr * 0.4} r={Math.max(2, pr * 0.34)} fill={C.cream} />
                  {mood === "safe" && <circle cx={px + 4} cy={py + 5} r={1.8} fill={C.cream} />}
                </motion.g>
                {lid && (
                  <g clipPath={`url(#${uid}-eye${side})`}>
                    <path
                      d={`M${x - 30} ${y - 30} L${x + 30} ${y - 30} L${x + 30} ${side === "l" ? y - 8 : y - 2} L${x - 30} ${side === "l" ? y - 2 : y - 8}Z`}
                      fill={C.cardboardLight}
                    />
                    <path
                      d={`M${x - 30} ${side === "l" ? y - 2 : y - 8} L${x + 30} ${side === "l" ? y - 8 : y - 2}`}
                      fill="none"
                      {...O25}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </motion.g>
      )}

      {/* alis */}
      <motion.g
        style={fb()}
        animate={
          mood === "warning"
            ? { y: [0, 1.5, 0] }
            : mood === "danger_siren"
            ? { y: [0, -2, 0] }
            : mood === "proud"
            ? { y: [0, -2, 0] }
            : { y: [0, -1.5, 0] }
        }
        transition={loop(mood === "danger_siren" ? 0.2 : 1.6)}
      >
        <path d={browPaths[mood][0]} fill="none" {...O} />
        <path d={browPaths[mood][1]} fill="none" {...O} />
      </motion.g>

      {/* paruh */}
      <path d="M190 210 Q200 202 210 210 Q207 228 200 233 Q193 228 190 210Z" fill={C.honey} {...O3} />
      <path d="M195 211 Q199 208 202 209" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} />

      {/* mulut */}
      {mood === "safe" && <path d="M181 240 Q200 257 219 240" fill="none" {...O3} />}
      {mood === "warning" && <path d="M187 245 Q200 241 213 245" fill="none" {...O3} />}
      {mood === "danger_siren" && (
        <motion.g style={fb(0.5, 0)} animate={{ scaleY: [1, 1.2, 1] }} transition={loop(0.18)}>
          <ellipse cx={200} cy={250} rx={10} ry={12} fill={C.mouth} {...O3} />
          <ellipse cx={200} cy={256} rx={6} ry={4} fill={C.peach} />
        </motion.g>
      )}
      {mood === "proud" && (
        <g>
          <clipPath id={`${uid}-mouth`}>
            <path d="M176 238 Q200 270 224 238Z" />
          </clipPath>
          <path d="M176 238 Q200 270 224 238Z" fill={C.mouth} />
          <g clipPath={`url(#${uid}-mouth)`}>
            <ellipse cx={200} cy={256} rx={11} ry={7} fill={C.peach} />
          </g>
          <path d="M176 238 Q200 270 224 238Z" fill="none" {...O3} />
        </g>
      )}

      {/* guratan bulu pipi */}
      <g fill="none" stroke={C.cardboardDark} strokeWidth={2.5} strokeLinecap="round">
        <path d="M112 214 q7 4 14 0 M108 230 q7 4 14 0" />
        <path d="M288 214 q-7 4 -14 0 M292 230 q-7 4 -14 0" />
      </g>
    </g>
  );
}

/** Topi deerstalker motif kotak-kotak hangat. */
function Deerstalker({ uid }: { uid: string }) {
  const pat = `${uid}-plaid`;
  return (
    <g>
      <defs>
        <pattern id={pat} width={26} height={26} patternUnits="userSpaceOnUse">
          <rect width={26} height={26} fill={C.woodLight} />
          <rect width={13} height={13} fill={C.wood} />
          <rect x={13} y={13} width={13} height={13} fill={C.wood} />
          <path d="M0 13 H26 M13 0 V26" stroke={C.woodDark} strokeWidth={2.2} />
          <path d="M0 0 H26 M0 0 V26" stroke={C.cream} strokeWidth={1.2} opacity={0.8} />
        </pattern>
      </defs>
      {/* penutup telinga yang diikat ke atas */}
      <path d="M124 150 Q100 152 96 128 Q96 108 112 110 Q126 116 130 142Z" fill={`url(#${pat})`} {...O3} />
      <path d="M276 150 Q300 152 304 128 Q304 108 288 110 Q274 116 270 142Z" fill={`url(#${pat})`} {...O3} />
      {/* kubah topi */}
      <path d="M114 154 Q110 94 200 86 Q290 94 286 154 Q200 134 114 154Z" fill={`url(#${pat})`} {...O} />
      <path d="M134 118 Q150 100 176 96" fill="none" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />
      {/* visor depan */}
      <path d="M148 142 Q200 160 252 142 Q246 164 200 166 Q154 164 148 142Z" fill={C.woodDark} {...O3} />
      <path d="M162 150 Q200 160 238 150" fill="none" stroke={C.woodLight} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
      {/* pita simpul di puncak */}
      <path d="M200 90 Q184 78 176 88 Q184 98 200 90Z" fill={C.woodDark} {...O25} />
      <path d="M200 90 Q216 78 224 88 Q216 98 200 90Z" fill={C.woodDark} {...O25} />
      <circle cx={200} cy={90} r={5.5} fill={C.honey} {...O25} />
    </g>
  );
}

/** Kacamata monocle emas di mata kanan (sisi kanan layar) lengkap dengan rantai. */
function Monocle() {
  return (
    <g>
      <path d="M244 228 Q276 252 262 304" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M244 228 Q276 252 262 304" fill="none" stroke={C.honeyDark} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 6" />
      <circle cx={240} cy={200} r={32} fill={C.skySoft} fillOpacity={0.3} stroke={INK} strokeWidth={8} />
      <circle cx={240} cy={200} r={32} fill="none" stroke={C.honey} strokeWidth={4} />
      <path d="M216 190 Q220 176 232 171" fill="none" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" opacity={0.95} />
    </g>
  );
}

export function InspectorSakuOwl({ mood = "safe", className }: InspectorSakuOwlProps) {
  const uid = idOf(useId());
  const pose = OWL_POSE[mood];
  const label = `Inspektur Saku, burung hantu detektif kas, ${INSPECTOR_SAKU_MOOD_LABEL[mood]}`;
  const heldNotebook = mood === "warning" || mood === "danger_siren";
  const showPocketBook = !heldNotebook;
  const dangerous = mood === "danger_siren";

  /* gerak badan keseluruhan per mood */
  const bodyAnim: TargetAndTransition | undefined =
    mood === "proud"
      ? { y: [0, -28, 0] }
      : dangerous
      ? { x: [-2.5, 2.5, -2.5] }
      : undefined;
  const bodyTrans: Transition | undefined =
    mood === "proud" ? { duration: 0.95, repeat: Infinity, ease: "easeOut" } : dangerous ? loop(0.09) : undefined;

  const headAnim: TargetAndTransition =
    mood === "safe"
      ? { rotate: [-1.5, 3, -1.5], y: [0, 4, 0] }
      : mood === "warning"
      ? { rotate: [-3, -6, -3], x: [0, 2, 0] }
      : dangerous
      ? { rotate: [-2.5, 2.5, -2.5] }
      : { rotate: [0, -4, 0], y: [0, -2, 0] };
  const headTrans: Transition = loop(mood === "safe" ? 1.8 : mood === "warning" ? 1.6 : dangerous ? 0.12 : 0.55);

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 400 460"
        width="100%"
        className={className}
        role="img"
        aria-label={label}
        style={{ overflow: "visible" }}
      >
        <title>{label}</title>

        {/* bayangan tanah */}
        <motion.g
          style={fb()}
          animate={mood === "proud" ? { scaleX: [1, 0.78, 1], opacity: [0.18, 0.1, 0.18] } : undefined}
          transition={mood === "proud" ? { duration: 0.95, repeat: Infinity, ease: "easeOut" } : undefined}
        >
          <ellipse cx={200} cy={438} rx={98} ry={9} fill={INK} opacity={0.18} />
        </motion.g>

        <Pivot x={90} y={-10} w={220} h={460} px={200} py={440} animate={bodyAnim} transition={bodyTrans}>
          {/* kaki */}
          <g>
            <ellipse cx={166} cy={430} rx={22} ry={9} fill={C.honey} {...O3} />
            <ellipse cx={234} cy={430} rx={22} ry={9} fill={C.honey} {...O3} />
            <path d="M156 428 v6 M166 429 v6 M176 428 v6 M224 428 v6 M234 429 v6 M244 428 v6" fill="none" stroke={C.honeyDark} strokeWidth={2.5} strokeLinecap="round" />
          </g>

          {/* trench coat */}
          <path d="M126 278 Q108 346 100 418 Q200 440 300 418 Q292 346 274 278 Q200 258 126 278Z" fill={C.wood} {...O} />
          <path d="M138 300 Q124 350 118 400" fill="none" stroke={C.woodLight} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
          {/* kemeja bulu di sela kerah */}
          <path d="M168 278 L200 356 L232 278 Q200 264 168 278Z" fill={C.cream} {...O3} />
          <path d="M192 318 q4 5 8 0 q4 5 8 0 M186 334 q4 5 8 0 q4 5 8 0" fill="none" stroke={C.cardboardDark} strokeWidth={2.5} strokeLinecap="round" />
          {/* kerah lebar */}
          <path d="M126 278 Q152 280 168 278 L200 356 L178 362 L118 322Z" fill={C.woodDark} {...O3} />
          <path d="M274 278 Q248 280 232 278 L200 356 L222 362 L282 322Z" fill={C.woodDark} {...O3} />
          <path d="M134 296 L168 332" fill="none" stroke={C.woodLight} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          {/* ikat pinggang */}
          <path d="M108 376 Q200 394 292 376 L294 396 Q200 414 106 396Z" fill={C.woodDark} {...O3} />
          <rect x={187} y={380} width={26} height={18} rx={4.5} fill={C.honey} {...O3} />
          <rect x={194} y={385} width={12} height={8} rx={2.5} fill="none" stroke={C.honeyDark} strokeWidth={2.5} />
          {/* kancing */}
          <circle cx={168} cy={360} r={5.5} fill={C.honey} {...O25} />
          <circle cx={232} cy={360} r={5.5} fill={C.honey} {...O25} />
          {/* kantong + buku catatan menyembul */}
          {showPocketBook && (
            <g>
              <g transform="rotate(-8 150 350)" style={SVG_ATTR_ORIGIN}>
                <rect x={138} y={334} width={24} height={26} rx={4} fill={C.honey} {...O25} />
                <rect x={156} y={337} width={3} height={20} rx={1.5} fill={C.cream} />
              </g>
              <path d="M128 356 L172 352 L174 384 L130 388Z" fill={C.wood} {...O3} />
              <path d="M128 356 L172 352" fill="none" stroke={C.woodDark} strokeWidth={3.5} strokeLinecap="round" />
            </g>
          )}

          {/* lencana perisai */}
          <ShieldBadge mood={mood} />

          {/* lengan jubah */}
          <Sleeve shoulder={SHOULDER_L} frames={pose.l} dur={pose.dur} />
          <Sleeve shoulder={SHOULDER_R} frames={pose.r} dur={pose.dur} />

          {/* kepala (mengangguk / menoleh / gemetar) */}
          <Pivot x={90} y={8} w={220} h={282} px={200} py={282} animate={headAnim} transition={headTrans}>
            <ellipse cx={200} cy={192} rx={96} ry={92} fill={C.cardboard} {...O} />
            <path d="M126 250 Q140 270 164 276" fill="none" stroke={C.cardboardDark} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
            <path d="M274 250 Q260 270 236 276" fill="none" stroke={C.cardboardDark} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
            <OwlFace mood={mood} uid={uid} />
            <Monocle />
            <Deerstalker uid={uid} />
            {dangerous && <SirenLamp />}
          </Pivot>

          {/* dasi kupu-kupu matcha */}
          <g>
            <path d="M198 292 L164 274 Q157 292 164 310Z" fill={C.matcha} {...O3} />
            <path d="M202 292 L236 274 Q243 292 236 310Z" fill={C.matcha} {...O3} />
            <path d="M172 284 L164 292" fill="none" stroke={C.matchaSoft} strokeWidth={2.5} strokeLinecap="round" />
            <rect x={191} y={281} width={18} height={22} rx={7} fill={C.matchaDark} {...O3} />
          </g>

          {/* tangan digambar di atas kepala agar kaca pembesar/hormat tidak tertutup */}
          {/* tangan kiri-layar + kaca pembesar */}
          <HandFollow frames={pose.l} dur={pose.dur}>
            <Magnifier uid={uid} magnified={mood === "warning"} rotKeys={pose.lensRot} dur={pose.dur} />
            <Mitt />
          </HandFollow>

          {/* tangan kanan-layar: jempol (aman) / buku catatan (waspada, bahaya) / hormat (bangga) */}
          <HandFollow frames={pose.r} dur={pose.dur}>
            {heldNotebook && <HeldNotebook receipt={mood === "warning"} />}
            <Mitt thumb={mood === "safe"} />
          </HandFollow>
        </Pivot>

        {/* ── efek per mood ── */}
        {mood === "safe" && (
          <g pointerEvents="none">
            <Sparkle x={276} y={304} size={7} color={C.matchaSoft} delay={0.2} />
            <Sparkle x={226} y={348} size={5} color={C.cream} delay={1} />
            <Sparkle x={344} y={214} size={7} color={C.honeySoft} delay={0.6} />
          </g>
        )}
        {mood === "warning" && (
          <g pointerEvents="none">
            <motion.g
              style={fb(0.5, 1)}
              animate={{ scale: [1, 1.2, 1], rotate: [-6, 6, -6] }}
              transition={loop(0.9)}
            >
              <rect x={331} y={48} width={10} height={26} rx={5} fill={C.honey} {...O3} />
              <circle cx={336} cy={90} r={5.6} fill={C.honey} {...O3} />
            </motion.g>
          </g>
        )}
        {dangerous && (
          <g pointerEvents="none">
            <WingedCoin from={[200, 340]} dx={-130} dy={-190} delay={0} dur={2.2} />
            <WingedCoin from={[210, 336]} dx={140} dy={-150} delay={0.7} dur={2.4} />
            <WingedCoin from={[190, 344]} dx={10} dy={-250} delay={1.4} dur={2.6} />
            {[0, 1].map((i) => (
              <motion.g
                key={i}
                style={fb()}
                animate={{ y: [0, 28], opacity: [0, 1, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeIn", delay: i * 0.45 }}
              >
                <path
                  d={i === 0 ? "M104 156 Q96 170 104 178 Q112 178 112 170 Q112 164 104 156Z" : "M296 156 Q288 170 296 178 Q304 178 304 170 Q304 164 296 156Z"}
                  fill={C.skySoft}
                  {...O25}
                />
              </motion.g>
            ))}
          </g>
        )}
        {mood === "proud" && (
          <g pointerEvents="none">
            {[
              { x: 70, y: 112, R: 15, r: 6.5, d: 0 },
              { x: 330, y: 92, R: 17, r: 7.5, d: 0.25 },
              { x: 44, y: 262, R: 11, r: 5, d: 0.5 },
              { x: 360, y: 252, R: 12, r: 5.5, d: 0.75 },
              { x: 200, y: 22, R: 13, r: 5.8, d: 0.4 },
            ].map((s, i) => (
              <motion.g
                key={i}
                style={fb()}
                animate={{ scale: [0.5, 1.15, 0.5], rotate: [-14, 14, -14], opacity: [0.5, 1, 0.5] }}
                transition={loop(0.9, { delay: s.d })}
              >
                <polygon points={starPoints(s.x, s.y, s.R, s.r)} fill={C.honey} {...O3} />
              </motion.g>
            ))}
            <Sparkle x={120} y={60} size={8} color={C.honeySoft} delay={0.1} />
            <Sparkle x={290} y={44} size={7} color={C.cream} delay={0.5} />
          </g>
        )}
      </svg>
    </MotionConfig>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  2. LENCANA STREAK PADAM (OBOR BEKU)
 * ═════════════════════════════════════════════════════════════ */

export interface ColdStreakOverlayBadgeProps {
  /** true = streak padam (0 hari): obor mati, asap biru-abu, es membeku. false = obor menyala. */
  isCold: boolean;
  className?: string;
}

/** Kristal es berbentuk berlian. */
function IceCrystal({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={fb()}
        animate={{ scale: [0.9, 1.1, 0.9], rotate: [-6, 6, -6], opacity: [0.8, 1, 0.8] }}
        transition={loop(2.2, { delay })}
      >
        <path d="M0 -15 L9 0 L0 15 L-9 0Z" fill={C.skySoft} {...O3} />
        <path d="M0 -15 L0 15 M-9 0 H9" fill="none" stroke={C.sky} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
        <path d="M-4 -6 L-1 -10" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

/** Gumpalan asap (digambar di sekitar 0,0). */
const SMOKE_PUFF_D =
  "M-11 5 Q-18 5 -18 -3 Q-18 -11 -9 -11 Q-7 -19 2 -18 Q11 -20 13 -10 Q20 -8 18 0 Q15 7 6 6Z";

/** Es menggantung: pangkal (x, y) di atas, panjang len ke bawah. */
function Icicle({ x, y, len, w = 7 }: { x: number; y: number; len: number; w?: number }) {
  return (
    <g>
      <path
        d={`M${r2(x - w)} ${r2(y)} L${r2(x + w)} ${r2(y)} L${r2(x + 1.8)} ${r2(y + len)} Q${r2(x)} ${r2(y + len + 4)} ${r2(x - 1.8)} ${r2(y + len)}Z`}
        fill={C.skySoft}
        {...O25}
      />
      <path
        d={`M${r2(x - w * 0.45)} ${r2(y + 3)} L${r2(x - 1)} ${r2(y + len * 0.7)}`}
        fill="none"
        stroke={C.cream}
        strokeWidth={2.2}
        strokeLinecap="round"
        opacity={0.95}
      />
    </g>
  );
}

/** Titik-titik es di tepi atas piringan (posisi tetap; dihitung dari sudut dan dibulatkan). */
const PLATE_ICICLES: readonly { x: number; y: number; len: number }[] = [
  { a: 212, len: 16 },
  { a: 232, len: 24 },
  { a: 252, len: 32 },
  { a: 270, len: 22 },
  { a: 288, len: 34 },
  { a: 308, len: 24 },
  { a: 328, len: 15 },
].map(({ a, len }) => {
  const rad = (a * Math.PI) / 180;
  return { x: r2(100 + 77 * Math.cos(rad)), y: r2(106 + 77 * Math.sin(rad)), len };
});

export function ColdStreakOverlayBadge({ isCold, className }: ColdStreakOverlayBadgeProps) {
  const label = isCold
    ? "Streak padam 0 hari: obor mati, asap biru keabu-abuan dan es membeku"
    : "Streak menyala: obor api hangat";

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 200 200"
        width="100%"
        className={className}
        role="img"
        aria-label={label}
        style={{ overflow: "visible" }}
      >
        <title>{label}</title>

        {/* piringan lencana */}
        <circle cx={100} cy={106} r={78} fill={isCold ? C.skySoft : C.honeySoft} fillOpacity={isCold ? 0.55 : 0.8} />
        <circle cx={100} cy={106} r={78} fill="none" {...O} />
        <circle cx={100} cy={106} r={67} fill="none" stroke={isCold ? C.sky : C.honey} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" opacity={0.8} />

        {/* gusti salju dingin */}
        {isCold &&
          [0, 1, 2].map((i) => (
            <motion.g
              key={i}
              style={fb()}
              animate={{ x: [-26, 26], opacity: [0, 0.9, 0] }}
              transition={linearLoop(2.4, { delay: i * 0.8 })}
            >
              <path
                d={`M24 ${118 + i * 20} Q58 ${106 + i * 20} 90 ${118 + i * 20} Q112 ${126 + i * 20} 122 ${112 + i * 20}`}
                fill="none"
                stroke={C.skyDark}
                strokeWidth={4}
                strokeLinecap="round"
              />
              <circle cx={130} cy={110 + i * 20} r={3.2} fill={C.skyDark} />
            </motion.g>
          ))}

        {/* gagang obor */}
        <path d="M89 120 L111 120 L107 188 Q100 194 93 188Z" fill={C.wood} {...O3} />
        <path d="M91 142 Q100 147 109 142 M92 162 Q100 167 108 162" fill="none" stroke={C.woodDark} strokeWidth={3.5} strokeLinecap="round" />
        <path d="M94 126 L96 180" fill="none" stroke={C.woodLight} strokeWidth={3} strokeLinecap="round" opacity={0.8} />

        {/* mangkuk obor */}
        <path d="M72 98 L128 98 L116 126 Q100 133 84 126Z" fill={C.steelDark} {...O3} />
        <ellipse cx={100} cy={98} rx={28} ry={7} fill={C.steel} {...O3} />
        <path d="M80 108 L88 122" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />

        {isCold ? (
          <g>
            {/* sumbu hangus */}
            <path d="M92 97 L96 83 Q100 79 104 83 L108 97Z" fill={C.wheel} {...O3} />
            {/* es membekukan bibir mangkuk */}
            <path d="M68 100 Q75 88 88 95 Q96 84 108 93 Q121 86 132 100 Q124 108 100 108 Q76 108 68 100Z" fill={C.skySoft} {...O3} />
            <path d="M80 98 Q86 92 92 96" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" />
            <Icicle x={84} y={123} len={10} w={5.5} />
            <Icicle x={100} y={129} len={14} w={6} />
            <Icicle x={116} y={123} len={10} w={5.5} />

            {/* asap biru keabu-abuan */}
            {[
              { dx: -14, d: 0, s: 0.75, f: C.steel },
              { dx: 10, d: 0.9, s: 0.95, f: C.steelDark },
              { dx: -6, d: 1.8, s: 1.15, f: C.steel },
            ].map((p, i) => (
              <g key={i} transform="translate(100 80)" style={SVG_ATTR_ORIGIN}>
                <motion.g
                  style={fb()}
                  animate={{ y: [0, -44], x: [0, p.dx], scale: [0.55 * p.s, 1.1 * p.s], opacity: [0, 0.95, 0] }}
                  transition={{ duration: 2.7, repeat: Infinity, ease: "easeOut", delay: p.d }}
                >
                  <path d={SMOKE_PUFF_D} fill={p.f} {...O25} />
                  <path d="M-8 -9 Q-5 -13 -1 -13" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.9} />
                </motion.g>
              </g>
            ))}

            <IceCrystal x={46} y={92} s={1} delay={0} />
            <IceCrystal x={154} y={84} s={1.15} delay={0.7} />
            <IceCrystal x={42} y={150} s={0.8} delay={1.2} />
            <IceCrystal x={158} y={146} s={0.9} delay={0.4} />

            {/* es menggantung di tepi atas */}
            {PLATE_ICICLES.map((ic, i) => (
              <Icicle key={i} x={ic.x} y={ic.y - 2} len={ic.len} w={7} />
            ))}
          </g>
        ) : (
          <g>
            {/* api menyala */}
            <motion.g
              style={fb(0.5, 1)}
              animate={{ scaleY: [1, 1.1, 0.95, 1], scaleX: [1, 0.93, 1.05, 1] }}
              transition={loop(0.7)}
            >
              <path d="M100 32 Q117 58 121 76 Q125 96 100 100 Q75 96 79 76 Q83 58 100 32Z" fill={C.peach} {...O} />
              <path d="M100 54 Q111 69 113 82 Q113 95 100 97 Q87 95 87 82 Q89 69 100 54Z" fill={C.honey} {...O3} />
              <path d="M100 74 Q107 83 107 89 Q106 96 100 96 Q94 96 93 89 Q93 83 100 74Z" fill={C.honeySoft} />
            </motion.g>
            {[0, 1, 2].map((i) => (
              <motion.g
                key={i}
                style={fb()}
                animate={{ y: [0, -26], x: [0, (i - 1) * 8], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }}
              >
                <circle cx={90 + i * 10} cy={44} r={2.6} fill={C.honey} />
              </motion.g>
            ))}
            <Sparkle x={50} y={86} size={6} color={C.cream} delay={0.2} />
            <Sparkle x={150} y={78} size={7} color={C.cream} delay={0.9} />
          </g>
        )}
      </svg>
    </MotionConfig>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  3. RODA EMOSI (STORY TIME)
 * ═════════════════════════════════════════════════════════════ */

export type EmotionKey = "happy" | "proud" | "grateful" | "sad" | "angry" | "anxious";

export interface EmotionWheelIconProps {
  emotion: EmotionKey;
  /** Ukuran sisi (px). Default 96. */
  size?: number;
  className?: string;
}

export const EMOTION_KEYS: readonly EmotionKey[] = ["happy", "proud", "grateful", "sad", "angry", "anxious"];

export const EMOTION_LABEL: Readonly<Record<EmotionKey, string>> = {
  happy: "Senang",
  proud: "Bangga",
  grateful: "Bersyukur",
  sad: "Sedih",
  angry: "Marah",
  anxious: "Cemas",
};

const EMOTION_FACE: Record<EmotionKey, string> = {
  happy: C.honey,
  proud: C.peachSoft,
  grateful: C.matchaSoft,
  sad: C.skySoft,
  angry: C.peach,
  anxious: C.taroSoft,
};

/** Mata bulat oval dengan kilau. */
function OvalEye({ x, y, rx = 4.6, ry = 6.4, look = 0 }: { x: number; y: number; rx?: number; ry?: number; look?: number }) {
  return (
    <g>
      <ellipse cx={x + look} cy={y} rx={rx} ry={ry} fill={INK} />
      <circle cx={x + look - rx * 0.35} cy={y - ry * 0.35} r={Math.max(1.4, rx * 0.36)} fill={C.cream} />
    </g>
  );
}

function EmotionFeatures({ emotion, uid }: { emotion: EmotionKey; uid: string }) {
  switch (emotion) {
    case "happy":
      return (
        <g>
          <ellipse cx={26} cy={62} rx={6.5} ry={4.2} fill={C.peach} opacity={0.75} />
          <ellipse cx={74} cy={62} rx={6.5} ry={4.2} fill={C.peach} opacity={0.75} />
          <OvalEye x={36} y={47} />
          <OvalEye x={64} y={47} />
          <clipPath id={`${uid}-m`}>
            <path d="M35 60 Q50 82 65 60Z" />
          </clipPath>
          <path d="M35 60 Q50 82 65 60Z" fill={C.mouth} />
          <g clipPath={`url(#${uid}-m)`}>
            <ellipse cx={50} cy={74} rx={9} ry={5.5} fill={C.peach} />
          </g>
          <path d="M35 60 Q50 82 65 60Z" fill="none" {...O3} />
        </g>
      );
    case "proud":
      return (
        <g>
          <ellipse cx={25} cy={62} rx={6.5} ry={4.2} fill={C.peach} opacity={0.8} />
          <ellipse cx={75} cy={62} rx={6.5} ry={4.2} fill={C.peach} opacity={0.8} />
          <path d="M29 50 Q36 40 43 50 M57 50 Q64 40 71 50" fill="none" {...O} />
          <path d="M30 35 Q36 31 42 34 M58 34 Q64 31 70 35" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M37 63 Q50 76 63 63" fill="none" {...O3} />
        </g>
      );
    case "grateful":
      return (
        <g>
          <ellipse cx={25} cy={60} rx={7.5} ry={4.8} fill={C.peach} opacity={0.9} />
          <ellipse cx={75} cy={60} rx={7.5} ry={4.8} fill={C.peach} opacity={0.9} />
          <path d="M29 47 Q36 56 43 47 M57 47 Q64 56 71 47" fill="none" {...O} />
          <path d="M41 63 Q50 72 59 63" fill="none" {...O3} />
        </g>
      );
    case "sad":
      return (
        <g>
          <path d="M28 41 L43 35 M57 35 L72 41" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <OvalEye x={36} y={50} rx={5} ry={6.6} look={-0.6} />
          <OvalEye x={64} y={50} rx={5} ry={6.6} look={0.6} />
          <circle cx={34} cy={52.5} r={1.6} fill={C.cream} />
          <path d="M39 70 Q50 60 61 70" fill="none" {...O3} />
        </g>
      );
    case "angry":
      return (
        <g>
          <ellipse cx={24} cy={62} rx={6.5} ry={4.2} fill={C.peachDark} opacity={0.55} />
          <ellipse cx={76} cy={62} rx={6.5} ry={4.2} fill={C.peachDark} opacity={0.55} />
          <path d="M26 37 L44 46 M74 37 L56 46" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <circle cx={37} cy={52} r={4.4} fill={INK} />
          <circle cx={63} cy={52} r={4.4} fill={INK} />
          <circle cx={35.8} cy={50.6} r={1.4} fill={C.cream} />
          <circle cx={61.8} cy={50.6} r={1.4} fill={C.cream} />
          <path d="M37 71 l6.5 -5 l6.5 5 l6.5 -5 l6.5 5" fill="none" {...O3} />
        </g>
      );
    case "anxious":
      return (
        <g>
          <path d="M28 38 Q35 33 43 39 M57 39 Q65 33 72 38" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <circle cx={36} cy={49} r={8} fill={C.cream} {...O25} />
          <circle cx={64} cy={49} r={8} fill={C.cream} {...O25} />
          <circle cx={36.8} cy={50.4} r={3} fill={INK} />
          <circle cx={63.2} cy={50.4} r={3} fill={INK} />
          <path d="M37 69 Q41.5 63 46 68 Q50 73 54 68 Q58.5 63 63 69" fill="none" {...O3} />
        </g>
      );
  }
}

/** Dekorasi di luar wajah (bintang, hati, tetes air mata, uap, keringat) dengan animasi masing-masing. */
function EmotionExtras({ emotion }: { emotion: EmotionKey }) {
  switch (emotion) {
    case "happy":
      return (
        <g>
          <Sparkle x={84} y={22} size={6} color={C.honeySoft} delay={0} />
          <Sparkle x={14} y={30} size={5} color={C.honey} delay={0.7} />
        </g>
      );
    case "proud":
      return (
        <g>
          <motion.g
            style={fb()}
            animate={{ scale: [0.85, 1.15, 0.85], rotate: [-12, 12, -12] }}
            transition={loop(1.1)}
          >
            <polygon points={starPoints(80, 20, 11, 4.8)} fill={C.honey} {...O3} />
          </motion.g>
          <Sparkle x={16} y={26} size={5} color={C.honey} delay={0.5} />
        </g>
      );
    case "grateful":
      return (
        <motion.g
          style={fb()}
          animate={{ y: [0, -7, 0], scale: [0.9, 1.08, 0.9] }}
          transition={loop(1.6)}
        >
          <path
            d="M50 24 C42 16 31 21 36 30 C39 35 46 38 50 42 C54 38 61 35 64 30 C69 21 58 16 50 24Z"
            transform="translate(38 -8) scale(0.6)"
            style={SVG_ATTR_ORIGIN}
            fill={C.peach}
            {...O3}
          />
        </motion.g>
      );
    case "sad":
      return (
        <motion.g
          style={fb()}
          animate={{ y: [0, 14], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeIn" }}
        >
          <path d="M31 58 Q25 67 31 72 Q37 72 37 66 Q37 62 31 58Z" fill={C.sky} {...O25} />
        </motion.g>
      );
    case "angry":
      return (
        <g>
          {[0, 1].map((i) => (
            <motion.g
              key={i}
              style={fb()}
              animate={{ y: [0, -10], scale: [0.7, 1.15], opacity: [0, 1, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut", delay: i * 0.55 }}
            >
              <circle cx={i === 0 ? 14 : 86} cy={i === 0 ? 30 : 30} r={6} fill={C.cream} {...O25} />
            </motion.g>
          ))}
          <path d="M65 27 l6 6 m0 -6 l-6 6" fill="none" stroke={C.peachDark} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "anxious":
      return (
        <motion.g
          style={fb()}
          animate={{ y: [0, 10], opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn" }}
        >
          <path d="M80 28 Q74 37 80 42 Q86 42 86 36 Q86 32 80 28Z" fill={C.skySoft} {...O25} />
        </motion.g>
      );
  }
}

const EMOTION_MOTION: Record<EmotionKey, { animate: TargetAndTransition; transition: Transition }> = {
  happy: { animate: { y: [0, -4, 0] }, transition: loop(1.1) },
  proud: { animate: { scale: [1, 1.05, 1], rotate: [-2, 2, -2] }, transition: loop(1.4) },
  grateful: { animate: { rotate: [-3, 3, -3] }, transition: loop(2.2) },
  sad: { animate: { y: [0, 2, 0], rotate: [-1.5, -1.5, -1.5] }, transition: loop(2.4) },
  angry: { animate: { x: [-1.4, 1.4, -1.4] }, transition: loop(0.12) },
  anxious: { animate: { x: [-0.9, 0.9, -0.9], y: [0, 0.6, 0] }, transition: loop(0.14) },
};

export function EmotionWheelIcon({ emotion, size = 96, className }: EmotionWheelIconProps) {
  const uid = idOf(useId());
  const label = `Perasaan ${EMOTION_LABEL[emotion].toLowerCase()}`;
  const mot = EMOTION_MOTION[emotion];
  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={label}
        style={{ overflow: "visible" }}
      >
        <title>{label}</title>
        <clipPath id={`${uid}-face`}>
          <circle cx={50} cy={53} r={38} />
        </clipPath>
        <ellipse cx={50} cy={95} rx={26} ry={3.4} fill={INK} opacity={0.14} />
        <motion.g style={fb(0.5, 1)} animate={mot.animate} transition={mot.transition}>
          <circle cx={50} cy={53} r={38} fill={EMOTION_FACE[emotion]} />
          {/* volume: bayangan bawah + kilau kiri-atas */}
          <g clipPath={`url(#${uid}-face)`}>
            <ellipse cx={50} cy={90} rx={46} ry={22} fill={INK} opacity={0.1} />
          </g>
          <path d="M24 40 Q28 27 41 22" fill="none" stroke={C.cream} strokeWidth={4.5} strokeLinecap="round" opacity={0.75} />
          <circle cx={50} cy={53} r={38} fill="none" {...O} />
          <EmotionFeatures emotion={emotion} uid={uid} />
          <EmotionExtras emotion={emotion} />
        </motion.g>
      </svg>
    </MotionConfig>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  4. CELENGAN KACA & EMAS
 * ═════════════════════════════════════════════════════════════ */

export interface PiggyVaultIllustrationProps {
  /** 0–100. Nilai di luar rentang atau bukan angka dipotong ke rentang tersebut. */
  progressPercent: number;
  isShaking?: boolean;
  className?: string;
}

/** Batas isian di dalam badan celengan. */
const VAULT_BOTTOM = 290;
const VAULT_TOP = 132;
const VAULT_ROWS = 8;
const VAULT_COLS = 9;

interface VaultCoin {
  cx: number;
  cy: number;
  soft: boolean;
}

/** Kisi koin heksagonal tetap (deterministik). Baris 0 = dasar. */
const VAULT_COINS: readonly VaultCoin[] = Array.from({ length: VAULT_ROWS }, (_, row) =>
  Array.from({ length: VAULT_COLS }, (_, col) => ({
    cx: 84 + col * 27 + (row % 2) * 13.5,
    cy: 278 - row * 19,
    soft: (row + col) % 3 === 0,
  }))
).flat();

interface VaultNote {
  cx: number;
  cy: number;
  rot: number;
}

/** Uang kertas yang terselip di antara koin. */
const VAULT_NOTES: readonly VaultNote[] = [
  { cx: 120, cy: 262, rot: -14 },
  { cx: 214, cy: 230, rot: 10 },
  { cx: 158, cy: 190, rot: -8 },
  { cx: 246, cy: 168, rot: 14 },
];

const clampPercent = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
};

function GoldCoin({ r = 13, soft = false }: { r?: number; soft?: boolean }) {
  return (
    <g>
      <circle r={r} fill={soft ? C.honeySoft : C.honey} {...O25} />
      <circle r={r * 0.6} fill="none" stroke={C.honeyDark} strokeWidth={2} />
      <path d={`M${-r * 0.62} ${-r * 0.2} Q${-r * 0.5} ${-r * 0.55} ${-r * 0.1} ${-r * 0.68}`} fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

export function PiggyVaultIllustration({ progressPercent, isShaking = false, className }: PiggyVaultIllustrationProps) {
  const uid = idOf(useId());
  const pct = clampPercent(progressPercent);
  const level = VAULT_BOTTOM - (VAULT_BOTTOM - VAULT_TOP) * (pct / 100);
  const full = pct >= 100;
  const label = `Celengan babi terisi ${pct} persen${full ? ", sudah penuh" : ""}`;

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 400 340"
        width="100%"
        className={className}
        role="img"
        aria-label={label}
        style={{ overflow: "visible" }}
      >
        <title>{label}</title>
        <defs>
          <clipPath id={`${uid}-glass`}>
            <ellipse cx={190} cy={198} rx={121} ry={91} />
          </clipPath>
        </defs>

        {/* bayangan tanah */}
        <ellipse cx={190} cy={320} rx={130} ry={10} fill={INK} opacity={0.16} />

        {/* koin jatuh ke lubang celengan (hanya jika belum penuh) */}
        {!full && (
          <motion.g
            style={fb()}
            animate={{ y: [-40, 0, 14], opacity: [0, 1, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: "easeIn", times: [0, 0.7, 1] }}
          >
            <g transform="translate(180 62)" style={SVG_ATTR_ORIGIN}>
              <GoldCoin r={15} />
            </g>
          </motion.g>
        )}

        {/* seluruh celengan bergoyang bila isShaking, jika tidak bernapas pelan */}
        <Pivot
          x={20}
          y={40}
          w={360}
          h={290}
          px={190}
          py={318}
          animate={
            isShaking
              ? { rotate: [-3.5, 3.5, -3.5], x: [-4, 4, -4] }
              : { y: [0, -3, 0] }
          }
          transition={isShaking ? loop(0.12) : loop(2.8)}
        >
          {/* ekor keriting (bergoyang) */}
          <motion.g style={fb(1, 1)} animate={{ rotate: [0, -14, 6, 0] }} transition={loop(2.6)}>
            <path d="M68 196 C36 202 26 168 50 160 C70 154 80 174 62 176" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M68 196 C36 202 26 168 50 160 C70 154 80 174 62 176" fill="none" stroke={C.peach} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>

          {/* kaki belakang */}
          <rect x={92} y={262} width={42} height={46} rx={18} fill={C.peach} {...O3} />
          <rect x={246} y={262} width={42} height={46} rx={18} fill={C.peach} {...O3} />

          {/* telinga lembut (bergerak) */}
          <motion.g style={fb(0.15, 1)} animate={{ rotate: [0, -9, 0, 0] }} transition={loop(3.4)}>
            <path d="M236 108 Q238 66 272 66 Q290 84 276 118Z" fill={C.peach} {...O3} />
            <path d="M248 100 Q250 80 266 78" fill="none" stroke={C.peachSoft} strokeWidth={5} strokeLinecap="round" />
          </motion.g>
          <motion.g style={fb(0.1, 1)} animate={{ rotate: [0, 7, 0, 0] }} transition={loop(3.4, { delay: 0.5 })}>
            <path d="M262 112 Q268 62 310 72 Q320 104 292 130Z" fill={C.peach} {...O3} />
            <path d="M274 108 Q280 86 300 86" fill="none" stroke={C.peachSoft} strokeWidth={6} strokeLinecap="round" />
          </motion.g>

          {/* badan kaca */}
          <ellipse cx={190} cy={198} rx={128} ry={98} fill={C.peachSoft} fillOpacity={0.5} />
          <ellipse cx={190} cy={198} rx={128} ry={98} fill={C.cream} fillOpacity={0.35} />

          {/* isi: koin & uang kertas naik sesuai persen */}
          <g clipPath={`url(#${uid}-glass)`}>
            <ellipse cx={190} cy={300} rx={121} ry={22} fill={C.honeyDark} opacity={pct > 0 ? 0.55 : 0} />
            {VAULT_COINS.map((c, i) => {
              const on = pct > 0 && c.cy + 12 >= level;
              return (
                <motion.g
                  key={i}
                  style={fb()}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.2, y: on ? 0 : -14 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: on ? (i % VAULT_COLS) * 0.012 : 0 }}
                >
                  <g transform={`translate(${r2(c.cx)} ${r2(c.cy)})`} style={SVG_ATTR_ORIGIN}>
                    <GoldCoin soft={c.soft} />
                  </g>
                </motion.g>
              );
            })}
            {VAULT_NOTES.map((n, i) => {
              const on = pct > 0 && n.cy + 16 >= level;
              return (
                <motion.g
                  key={i}
                  style={fb()}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.2 }}
                  transition={{ type: "spring", stiffness: 240, damping: 16 }}
                >
                  <g transform={`translate(${n.cx} ${n.cy}) rotate(${n.rot})`} style={SVG_ATTR_ORIGIN}>
                    <rect x={-28} y={-15} width={56} height={30} rx={6} fill={C.matcha} {...O25} />
                    <rect x={-22} y={-9} width={44} height={18} rx={4} fill="none" stroke={C.matchaSoft} strokeWidth={2} />
                    <circle r={7} fill={C.cream} stroke={INK} strokeWidth={2} />
                    <path d="M-3 0 H3 M0 -3 V3" stroke={C.matchaDark} strokeWidth={2} strokeLinecap="round" />
                  </g>
                </motion.g>
              );
            })}
          </g>

          {/* kilau kaca */}
          <path d="M96 168 Q104 132 142 116" fill="none" stroke={C.cream} strokeWidth={7} strokeLinecap="round" opacity={0.9} />
          <path d="M92 192 Q92 184 94 178" fill="none" stroke={C.cream} strokeWidth={6} strokeLinecap="round" opacity={0.9} />
          <path d="M270 262 Q298 246 308 214" fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" opacity={0.6} />

          {/* garis tepi badan */}
          <ellipse cx={190} cy={198} rx={128} ry={98} fill="none" {...O} />

          {/* lubang koin emas di punggung */}
          <rect x={146} y={96} width={72} height={16} rx={8} fill={C.honey} {...O3} />
          <rect x={156} y={100} width={52} height={7} rx={3.5} fill={INK} />
          <path d="M152 100 Q160 98 170 98" fill="none" stroke={C.cream} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />

          {/* kaki depan */}
          <rect x={112} y={270} width={44} height={46} rx={18} fill={C.peach} {...O3} />
          <rect x={226} y={270} width={44} height={46} rx={18} fill={C.peach} {...O3} />
          <path d="M127 306 V316 M141 306 V316 M241 306 V316 M255 306 V316" fill="none" stroke={C.peachDark} strokeWidth={2.5} strokeLinecap="round" />

          {/* pipi merona */}
          <ellipse cx={266} cy={202} rx={17} ry={10.5} fill={C.peach} opacity={0.85} />
          <path d="M258 200 l3 -3 M266 200 l3 -3 M274 200 l3 -3" fill="none" stroke={C.cream} strokeWidth={2} strokeLinecap="round" opacity={0.9} />

          {/* moncong */}
          <motion.g style={fb()} animate={{ scaleX: [1, 1.06, 1], scaleY: [1, 0.96, 1] }} transition={loop(2.2)}>
            <ellipse cx={328} cy={208} rx={30} ry={25} fill={C.peach} {...O} />
            <ellipse cx={328} cy={208} rx={21} ry={17} fill={C.peachSoft} />
            <ellipse cx={319} cy={208} rx={3.8} ry={6.5} fill={INK} />
            <ellipse cx={337} cy={208} rx={3.8} ry={6.5} fill={INK} />
            <path d="M311 193 Q319 187 330 190" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
          </motion.g>

          {/* mata besar berkilau (berkedip), atau mata bahagia bila penuh */}
          {full ? (
            <path d="M270 176 Q284 158 298 176" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          ) : (
            <motion.g style={fb()} animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={loop(4.2, { times: [0, 0.9, 0.94, 0.98, 1] })}>
              <ellipse cx={284} cy={170} rx={11} ry={14} fill={INK} />
              <circle cx={280.5} cy={164} r={4.6} fill={C.cream} />
              <circle cx={289} cy={176} r={2.3} fill={C.cream} />
              <path d="M272 158 l-6 -4 M276 154 l-3 -6 M296 156 l4 -5" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
            </motion.g>
          )}

          {/* senyum lebar */}
          <path d="M276 230 Q294 248 314 232" fill="none" {...O} />
          {pct === 0 && !full && <path d="M288 238 Q294 252 302 240" fill={C.peachDark} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />}
        </Pivot>

        {/* penuh: kilau emas */}
        {full && (
          <g pointerEvents="none">
            <Sparkle x={60} y={86} size={11} color={C.honey} delay={0} />
            <Sparkle x={332} y={92} size={12} color={C.honeySoft} delay={0.4} />
            <Sparkle x={190} y={44} size={13} color={C.honey} delay={0.8} />
            <Sparkle x={350} y={270} size={8} color={C.honeySoft} delay={1.2} />
            <Sparkle x={34} y={250} size={8} color={C.honey} delay={0.6} />
            {[0, 1, 2].map((i) => (
              <motion.g
                key={i}
                style={fb()}
                animate={{ y: [0, -46], opacity: [0, 1, 0], scale: [0.6, 1, 0.8] }}
                transition={loop(2.4, { delay: i * 0.8, ease: "easeOut" })}
              >
                <g transform={`translate(${300 + i * 22} ${72 - (i % 2) * 14})`} style={SVG_ATTR_ORIGIN}>
                  <path d="M0 6 C-12 -4 -8 -14 0 -8 C8 -14 12 -4 0 6Z" fill={C.peach} {...O25} />
                </g>
              </motion.g>
            ))}
          </g>
        )}
        {!full && pct > 0 && (
          <g pointerEvents="none">
            <Sparkle x={60} y={120} size={6} color={C.honeySoft} delay={0.3} />
            <Sparkle x={336} y={120} size={6} color={C.cream} delay={1.1} />
          </g>
        )}
      </svg>
    </MotionConfig>
  );
}

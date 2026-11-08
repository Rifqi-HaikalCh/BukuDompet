"use client";

/**
 * Perkakas bersama untuk aura & latar Butik tambahan (Versi 5.1).
 * Berdiri sendiri (tidak mengimpor PetAvatarSystem) agar tidak terjadi impor melingkar.
 * Aturan: tanpa Math.random (hash deterministik), `motion.g` yang berotasi/berskala memakai `fb()`.
 */
import type { ReactNode } from "react";
import { motion, type Transition } from "framer-motion";

export const INK = "#3D352E";

export const K = {
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
  wood: "#D99A5B",
  woodDark: "#B77C3F",
  woodLight: "#EBB67A",
  steel: "#B9C9D4",
  steelDark: "#8FA5B4",
} as const;

/** Style wajib untuk motion.g yang berotasi/berskala: kotak transform = bbox elemen. */
export const fb = (originX = 0.5, originY = 0.5) =>
  ({ transformBox: "fill-box", originX, originY }) as const;

/** Reset origin untuk elemen SVG biasa yang memakai atribut `transform`. */
export const ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;

export const loop = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "easeInOut", ...extra }) as Transition;

export const linear = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "linear", ...extra }) as Transition;

export const f2 = (n: number): number => Number(n.toFixed(2));

/** Hash deterministik 0..1. */
export const hash = (n: number): number => {
  let x = Math.imul(n + 1, 2654435761) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 2246822519) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  return (x % 1000) / 1000;
};

export const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [f2(cx + r * Math.cos(a)), f2(cy + r * Math.sin(a))];
};

export const starPts = (cx: number, cy: number, R: number, r: number, n = 5): string =>
  Array.from({ length: n * 2 }, (_, i) => {
    const rr = i % 2 === 0 ? R : r;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${f2(cx + rr * Math.cos(a))},${f2(cy + rr * Math.sin(a))}`;
  }).join(" ");

export const sparkD = (s: number): string =>
  `M0 ${-s} Q${s * 0.16} ${-s * 0.16} ${s} 0 Q${s * 0.16} ${s * 0.16} 0 ${s} Q${-s * 0.16} ${s * 0.16} ${-s} 0 Q${-s * 0.16} ${-s * 0.16} 0 ${-s}Z`;

/* ───────────────────────── Sebaran titik deterministik ───────────────────────── */

export interface Spot {
  /** Posisi mutlak X (0..400). */
  x: number;
  /** Posisi Y relatif terhadap pusat aura. */
  y: number;
  /** Skala 1.05..1.65. */
  s: number;
  /** Jeda animasi (detik). */
  d: number;
  /** Rotasi awal (derajat). */
  r: number;
}

/** Titik tersebar di sekeliling pet (cincin elips), tidak menumpuk di tengah. */
export function ringSpots(n: number, seed: number, rMin: number, rMax: number, ySq = 0.95): Spot[] {
  return Array.from({ length: n }, (_, i) => {
    const step = 360 / n;
    const deg = step * i + (hash(seed + i * 3) - 0.5) * step * 0.7;
    const r = rMin + hash(seed + i * 5 + 1) * (rMax - rMin);
    const rad = (deg * Math.PI) / 180;
    return {
      x: f2(Math.min(374, Math.max(26, 200 + r * Math.cos(rad)))),
      y: f2(r * Math.sin(rad) * ySq),
      s: f2(1.05 + hash(seed + i * 7 + 2) * 0.6),
      d: f2(hash(seed + i * 11 + 3) * 3),
      r: f2((hash(seed + i * 13 + 4) - 0.5) * 80),
    };
  });
}

export type FloatKind = "rise" | "fall" | "bob" | "twinkle" | "spin" | "sway" | "pulse";

function FloatAnim({ kind, d, dur, children }: { kind: FloatKind; d: number; dur: number; children: ReactNode }) {
  switch (kind) {
    case "rise":
      return (
        <motion.g animate={{ y: [14, -30], opacity: [0, 1, 1, 0] }} transition={linear(dur, { delay: d })}>
          {children}
        </motion.g>
      );
    case "fall":
      return (
        <motion.g animate={{ y: [-22, 30], opacity: [0, 1, 1, 0] }} transition={linear(dur, { delay: d })}>
          {children}
        </motion.g>
      );
    case "bob":
      return (
        <motion.g animate={{ y: [0, -12, 0], x: [0, 6, 0] }} transition={loop(dur, { delay: d })}>
          {children}
        </motion.g>
      );
    case "twinkle":
      return (
        <motion.g style={fb()} animate={{ scale: [0.5, 1.1, 0.5], opacity: [0.3, 1, 0.3] }} transition={loop(dur, { delay: d })}>
          {children}
        </motion.g>
      );
    case "spin":
      return (
        <motion.g style={fb()} animate={{ rotate: 360 }} transition={linear(dur, { delay: d })}>
          {children}
        </motion.g>
      );
    case "sway":
      return (
        <motion.g style={fb(0.5, 0.1)} animate={{ rotate: [-14, 14, -14], y: [0, 8, 0] }} transition={loop(dur, { delay: d })}>
          {children}
        </motion.g>
      );
    case "pulse":
      return (
        <motion.g style={fb()} animate={{ scale: [0.85, 1.15, 0.85] }} transition={loop(dur, { delay: d })}>
          {children}
        </motion.g>
      );
  }
}

/** Kumpulan partikel beranimasi di sekeliling pet. */
export function Floaters({
  cy,
  spots,
  kind,
  dur = 5,
  render,
}: {
  cy: number;
  spots: readonly Spot[];
  kind: FloatKind;
  dur?: number;
  render: (i: number, spot: Spot) => ReactNode;
}) {
  return (
    <g pointerEvents="none">
      {spots.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${f2(cy + p.y)}) scale(${p.s}) rotate(${p.r})`} style={ATTR_ORIGIN}>
          <FloatAnim kind={kind} d={p.d} dur={dur + (i % 3) * 0.7}>
            {/* kotak bantu agar bbox animasi stabil */}
            <circle r={9} fill="none" stroke="none" pointerEvents="none" />
            {render(i, p)}
          </FloatAnim>
        </g>
      ))}
    </g>
  );
}

/** Cahaya lembut berdenyut di belakang pet. */
export function Glow({
  uid,
  tag,
  cy,
  color,
  r,
  op,
  cx = 200,
}: {
  uid: string;
  tag: string;
  cy: number;
  color: string;
  r: number;
  op: number;
  cx?: number;
}) {
  const gid = `${uid}-${tag}`;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={op} />
          <stop offset="62%" stopColor={color} stopOpacity={op * 0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#${gid})`}
        style={fb()}
        animate={{ scale: [0.95, 1.06, 0.95] }}
        transition={loop(3.8)}
      />
    </g>
  );
}

/** Kilau berkedip. */
export function Spark({ x, y, size = 8, color = K.honey, delay = 0 }: { x: number; y: number; size?: number; color?: string; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={ATTR_ORIGIN}>
      <motion.path
        d={sparkD(size)}
        fill={color}
        style={fb()}
        animate={{ scale: [0.4, 1.1, 0.4], rotate: [0, 90, 180], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    </g>
  );
}

/** Debu cahaya melayang pelan (latar). */
export function Mote({ x, y, r = 2.6, d = 0, color = K.honeySoft }: { x: number; y: number; r?: number; d?: number; color?: string }) {
  return (
    <motion.circle
      cx={x}
      cy={y}
      r={r}
      fill={color}
      animate={{ y: [0, -14, 0], x: [0, 6, 0], opacity: [0.2, 0.9, 0.2] }}
      transition={loop(3.6 + d, { delay: d })}
    />
  );
}

/** Awan kartun; `drift` menggeser pelan ke kiri-kanan. */
export function Cloud({
  x,
  y,
  s = 1,
  fill = K.cream,
  outline = true,
  drift = 0,
  dur = 14,
  opacity = 1,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  outline?: boolean;
  drift?: number;
  dur?: number;
  opacity?: number;
}) {
  const d = "M-44 12 Q-60 12 -60 -2 Q-60 -16 -44 -16 Q-42 -34 -22 -34 Q-12 -48 6 -42 Q22 -48 32 -32 Q54 -34 56 -14 Q66 -6 58 4 Q54 12 44 12Z";
  return (
    <motion.g animate={drift === 0 ? undefined : { x: [-drift, drift, -drift] }} transition={loop(dur)} opacity={opacity}>
      <g transform={`translate(${x} ${y}) scale(${s})`} style={ATTR_ORIGIN}>
        <path d={d} fill={fill} stroke={outline ? INK : "none"} strokeWidth={outline ? 3 : 0} strokeLinejoin="round" />
        <path d="M-40 4 Q-30 -2 -18 -2" fill="none" stroke={K.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      </g>
    </motion.g>
  );
}

/** Pohon cemara sederhana (x = tengah, y = dasar batang). */
export function Pine({ x, y, s = 1, fill = K.matchaDark, trunk = K.woodDark, outline = true }: { x: number; y: number; s?: number; fill?: string; trunk?: string; outline?: boolean }) {
  const sw = outline ? 2.6 : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={ATTR_ORIGIN}>
      <rect x={-5} y={-14} width={10} height={16} rx={2} fill={trunk} stroke={INK} strokeWidth={sw} />
      <path d="M0 -92 L26 -48 H12 L32 -20 H-32 L-12 -48 H-26Z" fill={fill} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
}

/** Gradien langit vertikal + persegi penuh. */
export function SkyRect({ id, stops, h = 410 }: { id: string; stops: readonly (readonly [number, string])[]; h?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, c]) => (
            <stop key={o} offset={`${o}%`} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={h} fill={`url(#${id})`} />
    </>
  );
}

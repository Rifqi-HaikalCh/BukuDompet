"use client";

/**
 * MochiCompanion — maskot kucing BukuDompet.
 * Gaya: Duolingo meets Cozy Pastel Kawaii (outline hangat #3D352E, palet pastel).
 *
 * Contoh pakai:
 *   <MochiCompanion stage={3} mood="happy" className="w-64" />
 *
 * Catatan:
 * - Semua animasi memakai framer-motion; <MotionConfig reducedMotion="user">
 *   otomatis menghormati preferensi "reduce motion" pengguna.
 * - Garis tepi utama strokeWidth 3 / 3.5. Detail mungil (kumis, hidung) 2.5.
 */

import { useId } from "react";
import {
  MotionConfig,
  motion,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";

/* ───────────────────────── Types ───────────────────────── */

export type MochiStage = 1 | 2 | 3 | 4 | 5;
export type MochiMood = "happy" | "proud_combo" | "worried" | "shocked_boros";

export interface MochiCompanionProps {
  stage: MochiStage;
  mood?: MochiMood;
  className?: string;
  /** Override aria-label / <title>. */
  title?: string;
}

export const MOCHI_STAGE_NAMES: Record<MochiStage, string> = {
  1: "Mochi Kardus",
  2: "Mochi Perintis",
  3: "Mochi Manajer",
  4: "Mochi Bos Muda",
  5: "Sultan Mochi Jutawan",
};

const MOOD_LABEL: Record<MochiMood, string> = {
  happy: "senang",
  proud_combo: "bangga karena combo",
  worried: "cemas",
  shocked_boros: "kaget melihat pengeluaran boros",
};

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

const T = {
  fur: "#FFF1D6",
  honeySoft: "#FFE27A",
  goldDark: "#E5A800",
  peachSoft: "#FFB5A8",
  matchaSoft: "#8EE04A",
  matchaDark: "#46A302",
  taroSoft: "#E3B6FF",
  taroDark: "#A45EE8",
  cardboard: "#E8B87A",
  cardboardLight: "#F4D3A3",
  cardboardDark: "#C8935A",
  steel: "#B9C9D4",
  steelDark: "#8FA5B4",
  mouth: "#5B2E2E",
} as const;

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

/* ───────────────────────── Geometry helpers ───────────────────────── */

const starPoints = (
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points = 5,
): string => {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
};

const sparklePath = (s: number): string =>
  `M0 ${-s} Q${s * 0.16} ${-s * 0.16} ${s} 0 Q${s * 0.16} ${s * 0.16} 0 ${s} Q${-s * 0.16} ${s * 0.16} ${-s} 0 Q${-s * 0.16} ${-s * 0.16} 0 ${-s}Z`;

const BODY_D =
  "M138 292 C138 246 164 228 200 228 C236 228 262 246 262 292 C262 326 236 344 200 344 C164 344 138 326 138 292Z";
const HEAD_D =
  "M116 206 C116 150 150 128 200 128 C250 128 284 150 284 206 C284 246 250 270 200 270 C150 270 116 246 116 206Z";

/* ───────────────────────── Small reusable pieces ───────────────────────── */

function Coin({ r = 14 }: { r?: number }) {
  const sw = r < 10 ? 2.5 : 3;
  return (
    <g>
      <circle r={r} fill={C.honey} {...line} strokeWidth={sw} />
      <circle r={r * 0.62} fill={T.honeySoft} stroke={T.goldDark} strokeWidth={2} />
      <path
        d={`M${-r * 0.1} ${-r * 0.3} L${-r * 0.1} ${r * 0.3}`}
        stroke={T.goldDark}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d={`M${-r * 0.62} ${-r * 0.2} Q${-r * 0.5} ${-r * 0.55} ${-r * 0.1} ${-r * 0.68}`}
        fill="none"
        stroke={C.cream}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.9}
      />
    </g>
  );
}

function WingedCoin({ r = 10 }: { r?: number }) {
  const wing = "M0 0 Q-14 -13 -24 -5 Q-17 -2 -21 4 Q-10 4 0 7Z";
  return (
    <g>
      <g transform={`translate(${-r + 3} -2)`}>
        <path d={wing} fill={C.cream} {...line25} />
      </g>
      <g transform={`translate(${r - 3} -2) scale(-1 1)`}>
        <path d={wing} fill={C.cream} {...line25} />
      </g>
      <Coin r={r} />
    </g>
  );
}

function Sparkle({
  x,
  y,
  size = 10,
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
    <g transform={`translate(${x} ${y})`}>
      <motion.path
        d={sparklePath(size)}
        fill={color}
        style={{ originX: 0.5, originY: 0.5 }}
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ scale: [0, 1, 0], rotate: [0, 90, 180], opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    </g>
  );
}

function Diamond({
  x,
  y,
  s = 14,
  delay = 0,
}: {
  x: number;
  y: number;
  s?: number;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g animate={{ y: [0, -3, 0] }} transition={loop(2.4, { delay })}>
        <polygon
          points={`${-s},${-s * 0.25} ${-s * 0.55},${-s * 0.8} ${s * 0.55},${-s * 0.8} ${s},${-s * 0.25} 0,${s}`}
          fill={C.sky}
          {...line3}
        />
        <path
          d={`M${-s} ${-s * 0.25} L${s} ${-s * 0.25} M${-s * 0.55} ${-s * 0.8} L${-s * 0.25} ${-s * 0.25} L0 ${s} M${s * 0.55} ${-s * 0.8} L${s * 0.25} ${-s * 0.25} L0 ${s}`}
          fill="none"
          stroke={C.cream}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      </motion.g>
    </g>
  );
}

function CoinStack({
  x,
  y,
  n,
  rx = 13,
  ry = 5,
  h = 7,
}: {
  x: number;
  y: number;
  n: number;
  rx?: number;
  ry?: number;
  h?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }).map((_, i) => {
        const yy = -i * h;
        return (
          <g key={i}>
            <path
              d={`M${-rx} ${yy} L${-rx} ${yy - h} L${rx} ${yy - h} L${rx} ${yy} A${rx} ${ry} 0 0 1 ${-rx} ${yy}Z`}
              fill={C.honey}
              {...line25}
            />
            <ellipse cx={0} cy={yy - h} rx={rx} ry={ry} fill={T.honeySoft} {...line25} />
          </g>
        );
      })}
    </g>
  );
}

function TreasurePile({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx={48} ry={8} fill={INK} opacity={0.12} />
      <CoinStack x={x - 20 * s} y={y} n={3} />
      <CoinStack x={x + 2 * s} y={y + 3} n={5} />
      <CoinStack x={x + 24 * s} y={y} n={2} />
      <g transform={`translate(${x - 40 * s} ${y - 2})`}>
        <Coin r={9} />
      </g>
      <Diamond x={x + 2 * s} y={y - 50} s={12} delay={flip ? 0.8 : 0} />
      <Sparkle x={x - 22 * s} y={y - 42} size={7} delay={flip ? 0.3 : 1} />
    </g>
  );
}

function Paw({ cx, cy, rx = 15, ry = 13 }: { cx: number; cy: number; rx?: number; ry?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={T.fur} {...line} />
      <path
        d={`M${cx - 4} ${cy + 3} L${cx - 4} ${cy + ry * 0.6} M${cx + 4} ${cy + 3} L${cx + 4} ${cy + ry * 0.6}`}
        fill="none"
        {...line25}
        opacity={0.55}
      />
    </g>
  );
}

/* ───────────────────────── Motion specs ───────────────────────── */

type MotionSpec = { animate: TargetAndTransition; transition: Transition };

const BODY_RIG: Record<MochiMood, MotionSpec> = {
  happy: {
    animate: { x: 0, y: 0, rotate: 0, scaleX: [1, 0.985, 1], scaleY: [1, 1.025, 1] },
    transition: loop(3.2),
  },
  proud_combo: {
    animate: {
      x: [0, 0, 0, 0, 0],
      y: [0, -30, 0, -16, 0],
      rotate: [0, -4, 0, 4, 0],
      scaleX: [1, 0.96, 1.06, 0.98, 1],
      scaleY: [1, 1.05, 0.93, 1.02, 1],
    },
    transition: {
      duration: 1.2,
      times: [0, 0.28, 0.5, 0.72, 1],
      repeat: Infinity,
      repeatDelay: 0.3,
      ease: "easeInOut",
    },
  },
  worried: {
    animate: { x: [-1.5, 1.5, -1.5], y: 0, rotate: 0, scaleX: [1, 0.99, 1], scaleY: [1, 1.015, 1] },
    transition: { default: loop(1.6), x: loop(0.28) } as Transition,
  },
  shocked_boros: {
    animate: {
      x: [0, -2.5, 2.5, -2.5, 2.5, 0],
      y: 0,
      rotate: 0,
      scaleX: [1, 1.04, 1],
      scaleY: [1, 1.08, 1],
    },
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1.1, ease: "easeInOut" },
  },
};

const HEAD_RIG: Record<MochiMood, MotionSpec> = {
  happy: { animate: { rotate: [-2, 2, -2], y: 0 }, transition: loop(3.6) },
  proud_combo: { animate: { rotate: [-5, 5, -5], y: 0 }, transition: loop(0.6) },
  worried: { animate: { rotate: [-6, -3, -6], y: 0 }, transition: loop(0.5) },
  shocked_boros: {
    animate: { rotate: 0, y: [0, -4, 0] },
    transition: { duration: 0.35, repeat: Infinity, repeatDelay: 1.2 },
  },
};

const TAIL_RIG: Record<MochiMood, MotionSpec> = {
  happy: { animate: { rotate: [-6, 10, -6] }, transition: loop(2.6) },
  proud_combo: { animate: { rotate: [-14, 16, -14] }, transition: loop(0.45) },
  worried: { animate: { rotate: [22, 27, 22] }, transition: loop(0.4) },
  shocked_boros: { animate: { rotate: [-12, -7, -12] }, transition: loop(0.25) },
};

function earSpec(mood: MochiMood, side: "l" | "r"): MotionSpec {
  const s = side === "l" ? -1 : 1;
  switch (mood) {
    case "proud_combo":
      return { animate: { rotate: [0, s * 12, 0], scaleY: 1.05 }, transition: loop(0.5) };
    case "worried":
      return { animate: { rotate: [s * 24, s * 21, s * 24], scaleY: 1 }, transition: loop(0.4) };
    case "shocked_boros":
      return {
        animate: { rotate: [-s * 3, s * 3, -s * 3], scaleY: [1.12, 1.16, 1.12] },
        transition: loop(0.25),
      };
    default:
      return {
        animate: { rotate: [0, s * 10, 0, 0], scaleY: 1 },
        transition: {
          duration: 0.5,
          times: [0, 0.35, 0.7, 1],
          repeat: Infinity,
          repeatDelay: side === "l" ? 2.4 : 3.4,
        },
      };
  }
}

const PLACEMENT: Record<MochiStage, { x: number; y: number; r: number }> = {
  1: { x: 0, y: 0, r: 0 },
  2: { x: 0, y: 0, r: 0 },
  3: { x: 0, y: 0, r: 0 },
  4: { x: -34, y: 0, r: 4 },
  5: { x: 0, y: 0, r: 0 },
};

/* ───────────────────────── Cat anatomy ───────────────────────── */

function Tail({ mood }: { mood: MochiMood }) {
  const spec = TAIL_RIG[mood];
  const d = "M252 304 Q312 306 304 246 Q300 224 280 226";
  return (
    <motion.g
      animate={spec.animate}
      transition={spec.transition}
      style={{ originX: 0.1, originY: 0.9 }}
    >
      <path d={d} fill="none" stroke={INK} strokeWidth={24} strokeLinecap="round" />
      <path d={d} fill="none" stroke={T.fur} strokeWidth={17} strokeLinecap="round" />
      <path
        d="M303 242 Q299 226 280 226"
        fill="none"
        stroke={C.honey}
        strokeWidth={17}
        strokeLinecap="round"
      />
    </motion.g>
  );
}

function Body() {
  return (
    <g>
      <path d={BODY_D} fill={T.fur} {...line} />
      <ellipse cx={200} cy={304} rx={30} ry={32} fill={C.cream} />
      <ellipse cx={172} cy={340} rx={21} ry={12} fill={T.fur} {...line} />
      <ellipse cx={228} cy={340} rx={21} ry={12} fill={T.fur} {...line} />
      <path
        d="M166 340 L166 346 M178 340 L178 346 M222 340 L222 346 M234 340 L234 346"
        fill="none"
        {...line25}
        opacity={0.5}
      />
    </g>
  );
}

function Ear({ side, mood }: { side: "l" | "r"; mood: MochiMood }) {
  const spec = earSpec(mood, side);
  const l = side === "l";
  const outer = l
    ? "M128 172 Q114 120 136 98 Q166 108 180 140Z"
    : "M272 172 Q286 120 264 98 Q234 108 220 140Z";
  const inner = l
    ? "M138 152 Q132 124 142 114 Q158 124 166 140Z"
    : "M262 152 Q268 124 258 114 Q242 124 234 140Z";
  return (
    <motion.g
      animate={spec.animate}
      transition={spec.transition}
      style={{ originX: l ? 0.7 : 0.3, originY: 0.95 }}
    >
      <path d={outer} fill={T.fur} {...line} />
      <path d={inner} fill={T.peachSoft} />
    </motion.g>
  );
}

function HeadMarks() {
  return (
    <g fill="none" stroke={C.honey} strokeWidth={5} strokeLinecap="round">
      <path d="M190 134 Q193 146 188 155" />
      <path d="M200 132 L200 150" />
      <path d="M210 134 Q207 146 212 155" />
    </g>
  );
}

/* ───────────────────────── Face ───────────────────────── */

function Blink({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.g
      style={{ originX: 0.5, originY: 0.5 }}
      animate={{ scaleY: [1, 1, 0.1, 1] }}
      transition={{
        duration: 4,
        times: [0, 0.93, 0.965, 1],
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.g>
  );
}

const EYE_L = 165;
const EYE_R = 235;
const EYE_Y = 206;

function Eyes({ mood }: { mood: MochiMood }) {
  if (mood === "proud_combo") {
    return (
      <g>
        {[EYE_L, EYE_R].map((x, i) => (
          <motion.g
            key={x}
            style={{ originX: 0.5, originY: 0.5 }}
            animate={{ scale: [1, 1.18, 1], rotate: [-8, 8, -8] }}
            transition={loop(0.7, { delay: i * 0.1 })}
          >
            <polygon points={starPoints(x, EYE_Y, 19, 8.5)} fill={C.honey} {...line3} />
            <circle cx={x - 4} cy={EYE_Y - 4} r={3} fill={C.cream} />
          </motion.g>
        ))}
      </g>
    );
  }

  if (mood === "shocked_boros") {
    return (
      <g>
        {[EYE_L, EYE_R].map((x) => (
          <g key={x}>
            <circle cx={x} cy={EYE_Y} r={17} fill={C.cream} {...line3} />
            <motion.g
              animate={{ x: [-1.5, 1.5, -1.5], y: [1, -1, 1] }}
              transition={loop(0.25)}
            >
              <circle cx={x} cy={EYE_Y} r={5.5} fill={INK} />
              <circle cx={x + 1.8} cy={EYE_Y - 2} r={1.8} fill={C.cream} />
            </motion.g>
          </g>
        ))}
      </g>
    );
  }

  if (mood === "worried") {
    return (
      <Blink>
        {[EYE_L, EYE_R].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={EYE_Y} rx={10} ry={12} fill={INK} />
            <motion.g animate={{ x: [-1.8, 1.8, -1.8] }} transition={loop(2.4)}>
              <circle cx={x + 3} cy={EYE_Y - 4} r={5} fill={C.cream} />
              <circle cx={x - 3.5} cy={EYE_Y + 4.5} r={2} fill={C.cream} />
            </motion.g>
            <ellipse cx={x} cy={EYE_Y + 10} rx={7} ry={2.6} fill={C.sky} opacity={0.65} />
          </g>
        ))}
      </Blink>
    );
  }

  return (
    <Blink>
      {[EYE_L, EYE_R].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={EYE_Y} rx={10} ry={12.5} fill={INK} />
          <circle cx={x + 3.5} cy={EYE_Y - 5} r={4.2} fill={C.cream} />
          <circle cx={x - 3.5} cy={EYE_Y + 5} r={2} fill={C.cream} />
        </g>
      ))}
    </Blink>
  );
}

function Brows({ mood }: { mood: MochiMood }) {
  if (mood === "worried") {
    return (
      <motion.g animate={{ y: [0, 1.5, 0] }} transition={loop(0.8)}>
        <path d="M146 176 Q162 168 180 160" fill="none" {...line} />
        <path d="M254 176 Q238 168 220 160" fill="none" {...line} />
      </motion.g>
    );
  }
  if (mood === "shocked_boros") {
    return (
      <motion.g animate={{ y: [0, -3, 0] }} transition={loop(0.35)}>
        <path d="M147 177 Q165 160 183 175" fill="none" {...line} />
        <path d="M253 177 Q235 160 217 175" fill="none" {...line} />
      </motion.g>
    );
  }
  return null;
}

function Nose() {
  return (
    <path
      d="M193 214 Q200 211 207 214 Q204 222 200 224 Q196 222 193 214Z"
      fill={C.peach}
      {...line25}
    />
  );
}

function Whiskers() {
  return (
    <g fill="none" {...line25} opacity={0.7}>
      <path d="M120 216 L92 210 M120 227 L90 230" />
      <path d="M280 216 L308 210 M280 227 L310 230" />
    </g>
  );
}

function Cheeks({ mood }: { mood: MochiMood }) {
  const o = mood === "happy" || mood === "proud_combo" ? 0.7 : mood === "worried" ? 0.25 : 0;
  return (
    <g fill={C.peach}>
      <motion.ellipse
        cx={140}
        cy={229}
        rx={15}
        ry={9}
        animate={{ opacity: [o * 0.8, o, o * 0.8] }}
        transition={loop(2)}
      />
      <motion.ellipse
        cx={260}
        cy={229}
        rx={15}
        ry={9}
        animate={{ opacity: [o * 0.8, o, o * 0.8] }}
        transition={loop(2)}
      />
    </g>
  );
}

function Mouth({ mood, uid }: { mood: MochiMood; uid: string }) {
  switch (mood) {
    case "proud_combo": {
      const d = "M178 226 Q200 262 222 226Z";
      return (
        <g>
          <clipPath id={`${uid}-mouth`}>
            <path d={d} />
          </clipPath>
          <path d={d} fill={T.mouth} />
          <g clipPath={`url(#${uid}-mouth)`}>
            <ellipse cx={200} cy={248} rx={11} ry={8} fill={C.peach} />
          </g>
          <path d={d} fill="none" {...line} />
        </g>
      );
    }
    case "worried":
      return (
        <motion.path
          d="M185 236 Q192.5 228 200 236 Q207.5 244 215 236"
          fill="none"
          {...line}
          animate={{ y: [0, 1.2, 0] }}
          transition={loop(0.35)}
        />
      );
    case "shocked_boros":
      return (
        <motion.g
          style={{ originX: 0.5, originY: 0 }}
          animate={{ scaleY: [1, 1.1, 1] }}
          transition={loop(0.4)}
        >
          <clipPath id={`${uid}-mouth`}>
            <ellipse cx={200} cy={244} rx={13} ry={17} />
          </clipPath>
          <ellipse cx={200} cy={244} rx={13} ry={17} fill={T.mouth} />
          <g clipPath={`url(#${uid}-mouth)`}>
            <ellipse cx={200} cy={257} rx={10} ry={8} fill={C.peach} />
          </g>
          <ellipse cx={200} cy={244} rx={13} ry={17} fill="none" {...line} />
        </motion.g>
      );
    default:
      return <path d="M182 230 Q191 242 200 230 Q209 242 218 230" fill="none" {...line} />;
  }
}

function Face({ mood, uid }: { mood: MochiMood; uid: string }) {
  return (
    <motion.g
      style={{ originX: 0.5, originY: 0.5 }}
      initial={{ scale: 0.94 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <Whiskers />
      <Cheeks mood={mood} />
      <Eyes mood={mood} />
      <Brows mood={mood} />
      <Nose />
      <Mouth mood={mood} uid={uid} />
    </motion.g>
  );
}

/* ───────────────────────── Headwear per stage ───────────────────────── */

function Newspaper() {
  return (
    <g>
      <path d="M168 142 L174 114 L200 98 L226 114 L232 142Z" fill="#F4EFE2" {...line} />
      <path d="M200 98 L200 142" stroke={INK} strokeWidth={2.5} opacity={0.4} strokeLinecap="round" />
      <path
        d="M180 122 L193 113 M178 130 L194 120 M207 113 L220 122 M206 120 L222 130"
        fill="none"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.35}
      />
      <rect x={184} y={132} width={12} height={5} rx={1.5} fill={INK} opacity={0.25} />
      <rect x={206} y={132} width={12} height={5} rx={1.5} fill={INK} opacity={0.25} />
      <path
        d="M158 146 Q200 156 242 146 L240 137 Q200 147 160 137Z"
        fill="#E9E2D0"
        {...line}
      />
    </g>
  );
}

function Glasses() {
  return (
    <g>
      <circle cx={EYE_L} cy={EYE_Y} r={23} fill={C.sky} fillOpacity={0.16} {...line} />
      <circle cx={EYE_R} cy={EYE_Y} r={23} fill={C.sky} fillOpacity={0.16} {...line} />
      <path d="M188 203 Q200 196 212 203" fill="none" {...line3} />
      <path d="M142 201 L124 195 M258 201 L276 195" fill="none" {...line3} />
      <path
        d="M151 196 Q155 190 163 188 M221 196 Q225 190 233 188"
        fill="none"
        stroke={C.cream}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.9}
      />
    </g>
  );
}

function Crown() {
  return (
    <g>
      <path
        d="M160 140 L161 106 L180 122 L200 98 L220 122 L239 106 L240 140 Q200 150 160 140Z"
        fill={C.honey}
        {...line}
      />
      <path
        d="M165 134 Q200 143 235 134"
        fill="none"
        stroke={T.honeySoft}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={161} cy={102} r={5.5} fill={C.cream} {...line25} />
      <circle cx={200} cy={94} r={5.5} fill={C.cream} {...line25} />
      <circle cx={239} cy={102} r={5.5} fill={C.cream} {...line25} />
      <circle cx={200} cy={128} r={6.5} fill={C.sky} {...line25} />
      <circle cx={178} cy={131} r={4.5} fill={C.peach} {...line25} />
      <circle cx={222} cy={131} r={4.5} fill={C.matcha} {...line25} />
    </g>
  );
}

function Headwear({ stage }: { stage: MochiStage }) {
  if (stage === 1) return <Newspaper />;
  if (stage === 3) return <Glasses />;
  if (stage === 5) return <Crown />;
  return null;
}

/* ───────────────────────── Stage: backdrops (behind the cat) ───────────────────────── */

function BoxBack() {
  return (
    <g>
      <path d="M106 268 L70 236 L96 220 L136 262Z" fill={T.cardboardLight} {...line} />
      <path d="M294 268 L330 236 L304 220 L264 262Z" fill={T.cardboardLight} {...line} />
      <path
        d="M88 238 L102 230 M312 238 L298 230"
        stroke={T.cardboardDark}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.7}
      />
    </g>
  );
}

function Plant() {
  const leaves = [
    { a: -52, l: 52, c: C.matcha },
    { a: -26, l: 70, c: T.matchaSoft },
    { a: 0, l: 78, c: C.matcha },
    { a: 26, l: 66, c: T.matchaSoft },
    { a: 52, l: 50, c: C.matcha },
  ];
  return (
    <motion.g
      style={{ originX: 0.5, originY: 1 }}
      animate={{ rotate: [-2.5, 2.5, -2.5] }}
      transition={loop(3.4)}
    >
      {leaves.map((lf, i) => (
        <g key={i} transform={`rotate(${lf.a} 87 302)`}>
          <path
            d={`M87 302 Q68 ${302 - lf.l * 0.5} 87 ${302 - lf.l} Q106 ${302 - lf.l * 0.5} 87 302Z`}
            fill={lf.c}
            {...line3}
          />
          <path
            d={`M87 296 L87 ${302 - lf.l + 10}`}
            stroke={T.matchaDark}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
      ))}
    </motion.g>
  );
}

function PlantPot() {
  return (
    <g>
      <path d="M62 312 L112 312 L106 352 L68 352Z" fill={C.peach} {...line} />
      <rect x={57} y={302} width={60} height={14} rx={6} fill={T.peachSoft} {...line} />
      <circle cx={80} cy={331} r={2.6} fill={INK} />
      <circle cx={94} cy={331} r={2.6} fill={INK} />
      <path d="M83 337 Q87 341 91 337" fill="none" {...line25} />
      <ellipse cx={73} cy={338} rx={4} ry={2.5} fill={C.cream} opacity={0.6} />
      <ellipse cx={101} cy={338} rx={4} ry={2.5} fill={C.cream} opacity={0.6} />
    </g>
  );
}

function VaultCoins({ clipId }: { clipId: string }) {
  const coins: { x: number; y: number }[] = [];
  for (let row = 6; row >= 0; row--) {
    const n = 6 - Math.floor(row / 2);
    for (let i = 0; i < n; i++) {
      coins.push({
        x: 308 + (i - (n - 1) / 2) * 17 + (row % 2 ? 4 : -4),
        y: 276 - row * 15,
      });
    }
  }
  return (
    <g clipPath={`url(#${clipId})`}>
      {coins.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          <Coin r={11} />
        </g>
      ))}
    </g>
  );
}

function Vault({ uid }: { uid: string }) {
  const clipId = `${uid}-vault`;
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={256} y={172} width={104} height={110} rx={10} />
      </clipPath>
      {/* pintu terbuka di sisi kanan */}
      <path d="M372 152 L394 166 L394 326 L372 344Z" fill={T.steelDark} {...line} />
      <rect x={370} y={176} width={7} height={14} rx={2} fill={C.honey} {...line25} />
      <rect x={370} y={304} width={7} height={14} rx={2} fill={C.honey} {...line25} />
      {/* badan brankas */}
      <rect x={242} y={150} width={132} height={198} rx={14} fill={T.steel} {...line} />
      <rect x={256} y={172} width={104} height={110} rx={10} fill="#5A4A3A" />
      <VaultCoins clipId={clipId} />
      <rect x={256} y={172} width={104} height={110} rx={10} fill="none" {...line} />
      <polygon points={starPoints(308, 161, 8, 3.6)} fill={C.honey} {...line25} />
      {[
        [252, 158],
        [364, 158],
        [252, 340],
        [364, 340],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2} fill={T.steelDark} />
      ))}
      {/* roda pemutar */}
      <circle cx={308} cy={316} r={18} fill="#D9E3EA" {...line} />
      <path
        d="M308 300 L308 332 M292 316 L324 316 M297 305 L319 327 M319 305 L297 327"
        fill="none"
        {...line25}
        opacity={0.55}
      />
      <circle cx={308} cy={316} r={5.5} fill={C.honey} {...line25} />
      <rect x={252} y={348} width={20} height={8} rx={3} fill={T.steelDark} {...line25} />
      <rect x={344} y={348} width={20} height={8} rx={3} fill={T.steelDark} {...line25} />
      <Sparkle x={282} y={196} size={9} delay={0} />
      <Sparkle x={338} y={214} size={7} delay={0.7} color={C.cream} />
      <Sparkle x={316} y={186} size={6} delay={1.2} />
    </g>
  );
}

function ThroneBack() {
  return (
    <g>
      <path
        d="M92 334 L92 160 Q92 108 150 108 L250 108 Q308 108 308 160 L308 334Z"
        fill={C.taro}
        {...line}
      />
      <path
        d="M112 322 L112 168 Q112 128 152 128 L248 128 Q288 128 288 168 L288 322Z"
        fill={T.taroSoft}
        stroke={C.honey}
        strokeWidth={3.5}
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      {/* tufting berlian */}
      <path
        d="M150 150 L200 200 L250 150 M126 200 L200 274 L274 200 M150 250 L200 300 L250 250 M200 130 L200 300 M126 200 L274 200"
        fill="none"
        stroke={T.taroDark}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.35}
      />
      {[
        [200, 200],
        [150, 150],
        [250, 150],
        [126, 200],
        [274, 200],
        [200, 274],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={5} fill={C.honey} {...line25} />
      ))}
      <circle cx={98} cy={150} r={9} fill={C.honey} {...line3} />
      <circle cx={302} cy={150} r={9} fill={C.honey} {...line3} />
    </g>
  );
}

function Backdrop({ stage, uid }: { stage: MochiStage; uid: string }) {
  switch (stage) {
    case 1:
      return <BoxBack />;
    case 3:
      return (
        <g>
          <Plant />
        </g>
      );
    case 4:
      return <Vault uid={uid} />;
    case 5:
      return <ThroneBack />;
    default:
      return null;
  }
}

/* ───────────────────────── Stage: outfit (moves with the cat) ───────────────────────── */

function OutfitBack({ stage }: { stage: MochiStage }) {
  if (stage !== 5) return null;
  return (
    <g>
      <path d="M146 254 Q108 300 106 346 L294 346 Q292 300 254 254Z" fill={C.peach} {...line} />
      <path
        d="M130 300 Q124 322 124 340 M270 300 Q276 322 276 340"
        fill="none"
        stroke={T.peachSoft}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.8}
      />
    </g>
  );
}

function Scarf() {
  return (
    <g>
      <path d="M234 284 L262 281 L266 303 L238 306Z" fill={C.peach} {...line} />
      <path
        d="M238 294 L264 291 M239 300 L265 297"
        stroke={C.cream}
        strokeWidth={3.5}
        strokeLinecap="round"
        opacity={0.8}
      />
      <path
        d="M242 306 L241 314 M250 305 L249 313 M258 304 L258 312"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path d="M140 262 Q200 296 260 262 L262 282 Q200 316 138 282Z" fill={C.peach} {...line} />
      <path
        d="M144 272 Q200 306 256 272"
        fill="none"
        stroke={T.peachSoft}
        strokeWidth={4}
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
    </g>
  );
}

function Vest() {
  return (
    <g>
      <path d="M182 236 L200 292 L218 236Z" fill={C.cream} {...line3} />
      <path
        d="M140 280 C140 256 160 240 182 236 L200 292 L188 344 C160 340 140 322 140 280Z"
        fill={C.matcha}
        {...line}
      />
      <path
        d="M260 280 C260 256 240 240 218 236 L200 292 L212 344 C240 340 260 322 260 280Z"
        fill={C.matcha}
        {...line}
      />
      <path
        d="M146 296 Q150 322 172 334 M254 296 Q250 322 228 334"
        fill="none"
        stroke={T.matchaSoft}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="2 7"
      />
      <polygon points={starPoints(164, 290, 8, 3.6)} fill={C.honey} {...line25} />
      {/* dasi kupu-kupu */}
      <path d="M200 281 L178 270 L178 292Z" fill={C.peach} {...line3} />
      <path d="M200 281 L222 270 L222 292Z" fill={C.peach} {...line3} />
      <circle cx={200} cy={281} r={5.5} fill={T.peachSoft} {...line25} />
    </g>
  );
}

function Abacus() {
  const rods = [168, 189, 211, 232];
  const beadColors = [C.honey, C.peach, C.sky, C.honey];
  return (
    <g>
      <rect x={152} y={302} width={96} height={44} rx={7} fill="#D79A5B" {...line} />
      <rect x={157} y={307} width={86} height={34} rx={4} fill={C.cream} opacity={0.35} />
      <path d="M157 315 L243 315" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {rods.map((x, i) => (
        <g key={x}>
          <path d={`M${x} 307 L${x} 341`} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          <motion.ellipse
            cx={x}
            cy={310}
            rx={7}
            ry={3.6}
            fill={beadColors[i]}
            {...line25}
            animate={{ y: i === 1 ? [0, 3, 0] : 0 }}
            transition={loop(2.2)}
          />
          {[0, 1, 2].map((k) => (
            <motion.ellipse
              key={k}
              cx={x}
              cy={325 + k * 8}
              rx={7}
              ry={3.6}
              fill={beadColors[i]}
              {...line25}
              animate={{ y: i === 0 && k === 0 ? [0, -5, 0] : i === 3 && k === 2 ? [0, -4, 0] : 0 }}
              transition={loop(2.6, { delay: 0.4 })}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function Blazer() {
  return (
    <g>
      <path d={BODY_D} fill={C.taro} {...line} />
      <path d="M178 240 L200 300 L222 240Z" fill={C.cream} {...line3} />
      <path d="M176 238 L200 302 L186 306 L158 264Z" fill={T.taroSoft} {...line3} />
      <path d="M224 238 L200 302 L214 306 L242 264Z" fill={T.taroSoft} {...line3} />
      <path d="M196 262 L204 262 L208 296 L200 312 L192 296Z" fill={C.honey} {...line3} />
      <rect x={192} y={256} width={16} height={9} rx={4} fill={T.honeySoft} {...line25} />
      <circle cx={200} cy={326} r={3.8} fill={C.honey} {...line25} />
      <path d="M228 288 L244 285 L242 298 L230 298Z" fill={C.matcha} {...line25} />
      <ellipse cx={172} cy={340} rx={21} ry={7} fill={T.fur} opacity={0} />
    </g>
  );
}

function MatchaGlass() {
  return (
    <g>
      <path d="M278 262 L286 238" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <path d="M278 262 L286 238" stroke={C.sky} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M252 258 L286 258 L281 306 L257 306Z" fill={C.cream} fillOpacity={0.9} {...line} />
      <path d="M255 284 L283 284 L281 304 Q269 308 257 304Z" fill={T.matchaSoft} />
      <path d="M254 270 L284 270 L283 284 L255 284Z" fill={C.cream} />
      <path d="M255 284 L283 284" stroke={C.matcha} strokeWidth={3} strokeLinecap="round" />
      <rect x={258} y={290} width={8} height={8} rx={2} fill={C.cream} opacity={0.8} transform="rotate(12 262 294)" />
      <rect x={270} y={286} width={8} height={8} rx={2} fill={C.cream} opacity={0.8} transform="rotate(-14 274 290)" />
      <path d="M252 258 L286 258 L281 306 L257 306Z" fill="none" {...line} />
      <path d="M257 264 L259 292" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

function SleeveArm({ d, color }: { d: string; color: string }) {
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={28} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={21} strokeLinecap="round" />
    </g>
  );
}

function Ermine() {
  const tails: [number, number][] = [
    [150, 280],
    [170, 290],
    [190, 296],
    [210, 296],
    [230, 290],
    [250, 280],
  ];
  return (
    <g>
      <path d="M138 262 Q200 292 262 262 L262 276 Q200 306 138 276Z" fill={C.cream} {...line} />
      {tails.map(([x, y]) => (
        <path key={x} d={`M${x - 2.5} ${y} L${x} ${y + 8} L${x + 2.5} ${y}Z`} fill={INK} />
      ))}
    </g>
  );
}

function RoyalFront() {
  return (
    <g>
      <path d="M138 272 Q128 304 126 342 L158 342 Q158 306 170 284Z" fill={C.peach} {...line} />
      <path d="M262 272 Q272 304 274 342 L242 342 Q242 306 230 284Z" fill={C.peach} {...line} />
      <path
        d="M169 288 Q158 308 158 340 M231 288 Q242 308 242 340"
        fill="none"
        stroke={C.cream}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.85}
      />
      <Ermine />
    </g>
  );
}

function OutfitFront({ stage, mood }: { stage: MochiStage; mood: MochiMood }) {
  const showGlass = mood !== "shocked_boros";
  switch (stage) {
    case 1:
      return (
        <g>
          <Paw cx={158} cy={262} />
          <Paw cx={242} cy={262} />
        </g>
      );
    case 2:
      return (
        <g>
          <Scarf />
          <g transform="translate(200 298)">
            <Coin r={12} />
          </g>
          <Paw cx={178} cy={302} rx={14} ry={12} />
          <Paw cx={222} cy={302} rx={14} ry={12} />
        </g>
      );
    case 3:
      return (
        <g>
          <Vest />
          <Abacus />
          <Paw cx={152} cy={324} rx={13} ry={12} />
          <Paw cx={248} cy={324} rx={13} ry={12} />
        </g>
      );
    case 4:
      return (
        <g>
          <Blazer />
          {showGlass ? (
            <>
              {/* tangan kanan santai, tangan kiri memegang gelas di sisi yang lapang */}
              <SleeveArm d="M246 268 Q260 288 254 306" color={C.taro} />
              <Paw cx={254} cy={314} rx={13} ry={11} />
              <SleeveArm d="M154 268 Q132 276 132 296" color={C.taro} />
              <g transform="translate(-142 -4)">
                <MatchaGlass />
              </g>
              <Paw cx={130} cy={298} rx={14} ry={11} />
            </>
          ) : (
            <>
              <SleeveArm d="M154 268 Q138 286 146 306" color={C.taro} />
              <Paw cx={147} cy={314} rx={13} ry={11} />
              <SleeveArm d="M246 268 Q268 272 268 292" color={C.taro} />
              <Paw cx={262} cy={296} rx={14} ry={11} />
            </>
          )}
        </g>
      );
    case 5:
      return (
        <g>
          <RoyalFront />
          <Diamond x={200} y={314} s={17} />
          <Paw cx={178} cy={322} rx={13} ry={11} />
          <Paw cx={222} cy={322} rx={13} ry={11} />
        </g>
      );
    default:
      return null;
  }
}

/* ───────────────────────── Stage: foreground (static, in front of the cat) ───────────────────────── */

function Plaster({ x, y, rot, w = 50 }: { x: number; y: number; rot: number; w?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-w / 2} y={-10} width={w} height={20} rx={10} fill="#FFD9CC" {...line3} />
      <rect x={-w / 2 + 14} y={-10} width={w - 28} height={20} fill="#FFC4B3" />
      <path
        d={`M${-w / 2 + 14} -10 L${-w / 2 + 14} 10 M${w / 2 - 14} -10 L${w / 2 - 14} 10`}
        stroke={INK}
        strokeWidth={2}
        opacity={0.4}
      />
      <circle cx={-w / 2 + 7} cy={-3} r={1.4} fill={INK} opacity={0.4} />
      <circle cx={-w / 2 + 7} cy={4} r={1.4} fill={INK} opacity={0.4} />
      <circle cx={w / 2 - 7} cy={-3} r={1.4} fill={INK} opacity={0.4} />
      <circle cx={w / 2 - 7} cy={4} r={1.4} fill={INK} opacity={0.4} />
    </g>
  );
}

function EmptyCan() {
  return (
    <g>
      <rect x={42} y={306} width={44} height={46} rx={6} fill="#D5E0E7" {...line} />
      <rect x={42} y={322} width={44} height={15} fill={C.sky} {...line25} />
      <circle cx={64} cy={329.5} r={5} fill="none" stroke={C.cream} strokeWidth={2.5} strokeDasharray="3 3" />
      <ellipse cx={64} cy={306} rx={22} ry={7} fill="#6C6258" {...line} />
      <path d="M50 312 L50 346" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <motion.g
        animate={{ opacity: [0, 0.8, 0], y: [0, -10, -18], x: [0, 3, 6] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
      >
        <circle cx={64} cy={298} r={4} fill={C.cream} {...line25} />
      </motion.g>
    </g>
  );
}

function BoxFront() {
  return (
    <g>
      <path d="M96 268 L304 268 L294 352 L106 352Z" fill={T.cardboard} {...line} />
      <path d="M96 268 L304 268 L301 284 L99 284Z" fill={T.cardboardLight} {...line} />
      <path
        d="M146 292 L148 346 M200 292 L200 346 M254 292 L252 346"
        stroke={T.cardboardDark}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.45}
      />
      <Plaster x={140} y={318} rot={-12} />
      <Plaster x={258} y={304} rot={18} w={44} />
      <g stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.7}>
        <path d="M268 330 L282 342 M282 330 L268 342" />
      </g>
      <g fill={C.peach} {...line25}>
        <ellipse cx={200} cy={328} rx={9} ry={7.5} />
        <circle cx={186} cy={316} r={3.8} />
        <circle cx={196} cy={308} r={3.8} />
        <circle cx={206} cy={308} r={3.8} />
        <circle cx={214} cy={316} r={3.8} />
      </g>
      <EmptyCan />
    </g>
  );
}

function Cushion() {
  return (
    <g>
      <path
        d="M104 334 Q98 318 126 316 L274 316 Q302 318 296 334 Q304 348 276 354 L124 354 Q96 348 104 334Z"
        fill={T.taroSoft}
        {...line}
      />
      <path
        d="M200 336 L150 328 M200 336 L250 328 M200 336 L156 348 M200 336 L244 348"
        fill="none"
        stroke={T.taroDark}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.45}
      />
      <circle cx={200} cy={336} r={4.5} fill={C.taro} {...line25} />
      <path d="M130 324 Q160 319 190 322" stroke={C.cream} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.8} />
      {[104, 296].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={338} rx={6} ry={5} fill={C.honey} {...line25} />
          <path
            d={`M${x - 3} 342 L${x - 4} 352 M${x} 343 L${x} 354 M${x + 3} 342 L${x + 4} 352`}
            stroke={C.honey}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}

function PiggyBank() {
  return (
    <g transform="translate(322 322)">
      <motion.g
        style={{ originX: 0.5, originY: 1 }}
        animate={{ scaleY: [1, 1, 1, 0.93, 1] }}
        transition={{ duration: 3, times: [0, 0.6, 0.68, 0.76, 1], repeat: Infinity }}
      >
        <rect x={-24} y={18} width={14} height={15} rx={5} fill={C.peach} {...line} />
        <rect x={10} y={18} width={14} height={15} rx={5} fill={C.peach} {...line} />
        <path d="M-22 -24 L-30 -43 L-8 -32Z" fill={T.peachSoft} {...line} />
        <ellipse rx={40} ry={32} fill={C.peach} {...line} />
        <path d="M38 -2 Q56 -12 49 4 Q45 12 55 12" fill="none" {...line3} />
        <ellipse cx={-38} cy={3} rx={11} ry={9} fill={T.peachSoft} {...line3} />
        <ellipse cx={-41} cy={2} rx={2} ry={3} fill={INK} />
        <ellipse cx={-35} cy={4} rx={2} ry={3} fill={INK} />
        <circle cx={-14} cy={-7} r={3.6} fill={INK} />
        <circle cx={-13} cy={-8} r={1.2} fill={C.cream} />
        <ellipse cx={-20} cy={10} rx={7} ry={4} fill="#FF6F5E" opacity={0.45} />
        <path d="M4 -31 Q14 -35 24 -31" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M-6 -22 Q8 -29 22 -23" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      </motion.g>
      <motion.g
        animate={{ y: [-34, -10, 14, 18, 18], opacity: [0, 1, 1, 0, 0], scaleX: [1, 0.3, 1, 0.5, 1] }}
        transition={{ duration: 3, times: [0, 0.3, 0.62, 0.7, 1], repeat: Infinity }}
        style={{ originX: 0.5, originY: 0.5 }}
      >
        <g transform="translate(14 -66)">
          <Coin r={9} />
        </g>
      </motion.g>
    </g>
  );
}

function ArmRests() {
  return (
    <g>
      {[
        { x: 70, cx: 98 },
        { x: 276, cx: 304 },
      ].map(({ x, cx }) => (
        <g key={x}>
          <path
            d={`M${x} 346 L${x} 266 Q${x} 246 ${cx} 246 Q${x + 56} 246 ${x + 56} 266 L${x + 56} 346Z`}
            fill={C.taro}
            {...line}
          />
          <path
            d={`M${x + 6} 276 Q${cx} 292 ${x + 50} 276`}
            fill="none"
            stroke={C.honey}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <path
            d={`M${x + 8} 258 Q${x + 12} 250 ${x + 20} 249`}
            fill="none"
            stroke={C.cream}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.7}
          />
        </g>
      ))}
    </g>
  );
}

function SeatFront() {
  return (
    <g>
      <path
        d="M106 330 Q106 322 118 322 L282 322 Q294 322 294 330 L294 348 Q294 354 282 354 L118 354 Q106 354 106 348Z"
        fill={T.taroSoft}
        {...line}
      />
      <path d="M112 340 L288 340" stroke={C.honey} strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />
    </g>
  );
}

function Foreground({ stage }: { stage: MochiStage }) {
  switch (stage) {
    case 1:
      return <BoxFront />;
    case 2:
      return (
        <g>
          <Cushion />
          <PiggyBank />
        </g>
      );
    case 3:
      return <PlantPot />;
    case 4:
      return (
        <g>
          <TreasurePile x={330} y={346} flip />
          <g transform="translate(228 350)">
            <Coin r={8} />
          </g>
        </g>
      );
    case 5:
      return (
        <g>
          <TreasurePile x={36} y={348} />
          <TreasurePile x={366} y={348} flip />
          <ArmRests />
          <SeatFront />
        </g>
      );
    default:
      return null;
  }
}

/* ───────────────────────── Mood overlays ───────────────────────── */

const BURST = [
  { dx: -95, peak: -100, delay: 0, r: 13 },
  { dx: -60, peak: -125, delay: 0.15, r: 11 },
  { dx: -25, peak: -150, delay: 0.3, r: 14 },
  { dx: 20, peak: -135, delay: 0.1, r: 12 },
  { dx: 55, peak: -120, delay: 0.25, r: 13 },
  { dx: 95, peak: -95, delay: 0.05, r: 11 },
];

function ProudOverlay() {
  return (
    <g>
      <g transform="translate(200 150)">
        {BURST.map((b, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              x: [0, b.dx * 0.7, b.dx],
              y: [0, b.peak, 40],
              opacity: [0, 1, 1, 0],
              rotate: [0, 200, 360],
            }}
            transition={{
              duration: 1.7,
              delay: b.delay,
              repeat: Infinity,
              repeatDelay: 0.2,
              x: { duration: 1.7, ease: "linear", delay: b.delay, repeat: Infinity, repeatDelay: 0.2 },
              y: {
                duration: 1.7,
                times: [0, 0.45, 1],
                ease: ["easeOut", "easeIn"],
                delay: b.delay,
                repeat: Infinity,
                repeatDelay: 0.2,
              },
              opacity: {
                duration: 1.7,
                times: [0, 0.1, 0.8, 1],
                delay: b.delay,
                repeat: Infinity,
                repeatDelay: 0.2,
              },
            }}
          >
            <Coin r={b.r} />
          </motion.g>
        ))}
      </g>
      <Sparkle x={96} y={112} size={12} delay={0} />
      <Sparkle x={306} y={118} size={10} color={C.cream} delay={0.5} />
      <Sparkle x={72} y={196} size={8} delay={0.9} />
      <Sparkle x={332} y={200} size={11} delay={0.3} />
      <Sparkle x={200} y={70} size={9} color={C.cream} delay={1.1} />
    </g>
  );
}

function WorriedOverlay() {
  return (
    <g>
      <motion.g
        animate={{ y: [0, 4, 18, 24], opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.8] }}
        transition={{ duration: 1.6, times: [0, 0.2, 0.8, 1], repeat: Infinity, ease: "easeIn" }}
        style={{ originX: 0.5, originY: 0.5 }}
      >
        <g transform="translate(270 172)">
          <path d="M0 -11 Q9 2 0 9 Q-9 2 0 -11Z" fill={C.sky} {...line25} />
          <path d="M-2 -2 Q-4 3 -1 5" fill="none" stroke={C.cream} strokeWidth={2.5} strokeLinecap="round" />
        </g>
      </motion.g>
      <motion.g
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={loop(1.2)}
        fill="none"
        stroke={C.taro}
        strokeWidth={4}
        strokeLinecap="round"
      >
        <path d="M146 142 L146 154 M156 140 L156 156 M166 142 L166 154" />
      </motion.g>
    </g>
  );
}

function Siren() {
  return (
    <motion.g animate={{ y: [0, -5, 0] }} transition={loop(1)}>
      <g transform="translate(200 60)">
        <motion.g
          animate={{ opacity: [0, 1, 0] }}
          transition={loop(0.5)}
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
        >
          <path d="M-24 -14 L-34 -20 M-26 -4 L-38 -4 M24 -14 L34 -20 M26 -4 L38 -4 M0 -33 L0 -42" />
        </motion.g>
        <rect x={-18} y={-4} width={36} height={9} rx={3.5} fill={C.cream} {...line3} />
        <motion.path
          d="M-14 -4 Q-14 -26 0 -26 Q14 -26 14 -4Z"
          fill={C.peach}
          {...line3}
          animate={{ fill: [C.peach, C.sky] }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
        />
        <path d="M-8 -10 Q-8 -19 -2 -21" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      </g>
    </motion.g>
  );
}

function Magnifier({ uid }: { uid: string }) {
  return (
    <g>
      <motion.g
        animate={{ rotate: [-4, 4, -4] }}
        transition={loop(1.4)}
        style={{ originX: 0.1, originY: 0.95 }}
      >
        <path d="M284 259 L262 292" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <path d="M284 259 L262 292" stroke={C.peach} strokeWidth={7} strokeLinecap="round" />
        <clipPath id={`${uid}-lens`}>
          <circle cx={305} cy={238} r={24} />
        </clipPath>
        <circle cx={305} cy={238} r={24} fill={C.sky} fillOpacity={0.22} />
        <g clipPath={`url(#${uid}-lens)`}>
          <motion.g
            animate={{ y: [0, -4, 0] }}
            transition={loop(0.6)}
          >
            <g transform="translate(305 238) scale(1.25)">
              <WingedCoin r={10} />
            </g>
          </motion.g>
        </g>
        <circle cx={305} cy={238} r={29} fill="none" stroke={INK} strokeWidth={12} />
        <circle cx={305} cy={238} r={29} fill="none" stroke={C.honey} strokeWidth={5.5} />
        <path
          d="M289 224 Q294 214 304 211"
          fill="none"
          stroke={C.cream}
          strokeWidth={3.5}
          strokeLinecap="round"
          opacity={0.9}
        />
      </motion.g>
      <Paw cx={260} cy={296} rx={14} ry={11} />
    </g>
  );
}

const FLYERS = [
  { delay: 0, x: -60, y: -110 },
  { delay: 0.7, x: -90, y: -70 },
  { delay: 1.3, x: -40, y: -130 },
];

function ShockedOverlay({ uid }: { uid: string }) {
  return (
    <g>
      <Siren />
      <g transform="translate(150 300)">
        {FLYERS.map((f, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ x: [0, f.x], y: [0, f.y], opacity: [0, 1, 1, 0], rotate: [0, -20, 10] }}
            transition={{
              duration: 2,
              delay: f.delay,
              repeat: Infinity,
              ease: "easeOut",
              opacity: { duration: 2, times: [0, 0.15, 0.7, 1], delay: f.delay, repeat: Infinity },
            }}
          >
            <WingedCoin r={8} />
          </motion.g>
        ))}
      </g>
      <Magnifier uid={uid} />
    </g>
  );
}

function HappyOverlay() {
  return (
    <g>
      <Sparkle x={104} y={124} size={7} delay={0.4} color={C.cream} />
      <Sparkle x={300} y={136} size={6} delay={1.4} />
    </g>
  );
}

function MoodOverlay({ mood, uid }: { mood: MochiMood; uid: string }) {
  switch (mood) {
    case "proud_combo":
      return <ProudOverlay />;
    case "worried":
      return <WorriedOverlay />;
    case "shocked_boros":
      return <ShockedOverlay uid={uid} />;
    default:
      return <HappyOverlay />;
  }
}

/* ───────────────────────── Main component ───────────────────────── */

export function MochiCompanion({ stage, mood = "happy", className, title }: MochiCompanionProps) {
  const uid = useId().replace(/:/g, "");
  const place = PLACEMENT[stage];
  const body = BODY_RIG[mood];
  const head = HEAD_RIG[mood];
  const label = title ?? `${MOCHI_STAGE_NAMES[stage]} sedang ${MOOD_LABEL[mood]}`;

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
        className={className}
        style={{ overflow: "visible" }}
      >
        <title>{label}</title>

        {/* bayangan lantai */}
        <ellipse cx={200} cy={357} rx={132} ry={12} fill={INK} opacity={0.12} />

        {/* latar belakang tiap stage */}
        <Backdrop stage={stage} uid={uid} />

        {/* kucing + kostum */}
        <g transform={`translate(${place.x} ${place.y}) rotate(${place.r} 200 340)`}>
          <Tail mood={mood} />
          <motion.g
            animate={body.animate}
            transition={body.transition}
            style={{ originX: 0.5, originY: 1 }}
          >
            <OutfitBack stage={stage} />
            <Body />
            <OutfitFront stage={stage} mood={mood} />
            <motion.g
              animate={head.animate}
              transition={head.transition}
              style={{ originX: 0.5, originY: 1 }}
            >
              <Ear side="l" mood={mood} />
              <Ear side="r" mood={mood} />
              <path d={HEAD_D} fill={T.fur} {...line} />
              <HeadMarks />
              <Face key={mood} mood={mood} uid={uid} />
              <Headwear stage={stage} />
            </motion.g>
          </motion.g>
          <MoodOverlay mood={mood} uid={uid} />
        </g>

        {/* furnitur depan (statis) */}
        <Foreground stage={stage} />
      </svg>
    </MotionConfig>
  );
}

export default MochiCompanion;

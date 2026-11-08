"use client";

/**
 * AdventureNodes — elemen peta jalur harian BukuDompet (gaya Duolingo path).
 *
 *   <SteppingStoneNode status="active_today" label={7} className="w-24" />
 *   <AnimatedTreasureChest state="ready_shaking" className="w-32" />
 *
 * Garis tepi utama #3D352E strokeWidth 3 / 3.5, detail mungil 2.5.
 * Animasi: framer-motion, dihormati preferensi "reduce motion" lewat MotionConfig.
 */

import { useId } from "react";
import { MotionConfig, motion, type Transition } from "framer-motion";

/**
 * Reset origin transformasi untuk elemen SVG yang memakai atribut `transform="rotate/scale/..."`.
 * Tanpa ini, CSS global `svg g, svg path { transform-box: fill-box }` memindahkan titik asal
 * transformasi ke pojok bbox elemen sehingga bagian tubuh/ikon bergeser dan berantakan.
 */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;


/* ───────────────────────── Types ───────────────────────── */

export type StoneStatus = "completed_safe" | "completed_warn" | "missed_frozen" | "active_today";
export type ChestState = "locked" | "ready_shaking" | "opened";

export interface SteppingStoneNodeProps {
  status: StoneStatus;
  /** Nomor / teks pendek di atas batu (opsional). */
  label?: string | number;
  className?: string;
  title?: string;
}

export interface AnimatedTreasureChestProps {
  state: ChestState;
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
const MATCHA_SOFT = "#8EE04A";

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

function Coin({ r = 12 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill={C.honey} {...line} strokeWidth={r < 10 ? 2.5 : 3} />
      <circle r={r * 0.62} fill={HONEY_SOFT} stroke={GOLD_DARK} strokeWidth={2} />
      <path
        d={`M${-r * 0.1} ${-r * 0.3} L${-r * 0.1} ${r * 0.3}`}
        stroke={GOLD_DARK}
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

/* ═════════════════════════════════════════════════════════════
 *  1.  SteppingStoneNode
 * ═════════════════════════════════════════════════════════════ */

const STONE_PALETTE: Record<StoneStatus, { side: string; top: string; bevel: string }> = {
  completed_safe: { side: MATCHA_DARK, top: C.matcha, bevel: "#7ADB2E" },
  completed_warn: { side: GOLD_DARK, top: C.honey, bevel: HONEY_SOFT },
  missed_frozen: { side: "#8EB4CC", top: "#BFD9EA", bevel: "#DDEEF8" },
  active_today: { side: "#E59F00", top: "#FFD21F", bevel: "#FFEA85" },
};

const STONE_LABEL: Record<StoneStatus, string> = {
  completed_safe: "Hari selesai, keuangan aman",
  completed_warn: "Hari selesai, ada peringatan pengeluaran",
  missed_frozen: "Hari terlewat, jalur membeku",
  active_today: "Hari ini, ayo mulai mencatat",
};

function StoneBase({ side, top, bevel }: { side: string; top: string; bevel: string }) {
  return (
    <g>
      <path d="M26 88 L26 108 A54 34 0 0 0 134 108 L134 88Z" fill={side} {...line} />
      <ellipse cx={52} cy={118} rx={6} ry={3} fill={INK} opacity={0.12} />
      <ellipse cx={104} cy={124} rx={7} ry={3.4} fill={INK} opacity={0.12} />
      <ellipse cx={80} cy={88} rx={54} ry={34} fill={top} {...line} />
      <ellipse cx={80} cy={86} rx={40} ry={23} fill={bevel} />
      <path
        d="M46 78 Q58 62 82 60"
        fill="none"
        stroke={C.cream}
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.75}
      />
    </g>
  );
}

function Flower({
  x,
  y,
  petal,
  r = 5,
  delay = 0,
}: {
  x: number;
  y: number;
  petal: string;
  r?: number;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ rotate: [-7, 7, -7] }}
        transition={loop(2.8, { delay })}
      >
        {[0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={r2(Math.cos(rad(a)) * r * 1.05)}
            cy={r2(Math.sin(rad(a)) * r * 1.05)}
            r={r}
            fill={petal}
            {...line25}
          />
        ))}
        <circle r={r * 0.72} fill={C.honey} stroke={INK} strokeWidth={2} />
      </motion.g>
    </g>
  );
}

function GrassTuft({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <path
      transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}
      d="M0 0 L-4 -10 M0 0 L1 -12 M0 0 L6 -9"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
    />
  );
}

function SafeDecor() {
  return (
    <g>
      <GrassTuft x={38} y={96} color={MATCHA_DARK} />
      <GrassTuft x={124} y={98} color={MATCHA_DARK} />
      {/* daun kecil */}
      <path transform="translate(-18 4)" style={SVG_ATTR_ORIGIN} d="M68 92 Q60 84 66 78 Q74 82 72 92Z" fill={MATCHA_SOFT} {...line25} />
      <path d="M92 70 Q100 62 106 68 Q100 76 92 74Z" fill={MATCHA_SOFT} {...line25} />
      <Flower x={56} y={82} petal={C.peach} delay={0} />
      <Flower x={99} y={78} petal={C.cream} r={4.5} delay={0.5} />
      <Flower x={113} y={98} petal={C.taro} r={5} delay={1} />
      <Sparkle x={34} y={62} size={8} delay={0.2} />
      <Sparkle x={128} y={60} size={7} color={C.cream} delay={1.1} />
    </g>
  );
}

function WarnDecor() {
  return (
    <g>
      <path
        d="M62 68 L69 79 L61 87 L68 98 M106 72 L99 83 L107 91"
        fill="none"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.35}
      />
      <GrassTuft x={36} y={97} color={GOLD_DARK} />
      <GrassTuft x={125} y={99} color={GOLD_DARK} />
      <motion.g
        animate={{ y: [0, 20, 20], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeIn", times: [0, 0.7, 1] }}
      >
        <g transform="translate(42 66)" style={SVG_ATTR_ORIGIN}>
          <path d="M0 -9 Q8 2 0 8 Q-8 2 0 -9Z" fill={C.sky} {...line25} />
        </g>
      </motion.g>
      <motion.g animate={{ y: [0, -4, 0], rotate: [-6, 6, -6] }} transition={loop(1.2)} style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}>
        <g transform="translate(120 50)" style={SVG_ATTR_ORIGIN}>
          <circle r={14} fill={C.peach} {...line} />
          <rect x={-2.2} y={-8.5} width={4.4} height={11} rx={2.2} fill={C.cream} />
          <circle cy={7} r={2.6} fill={C.cream} />
        </g>
      </motion.g>
    </g>
  );
}

function FrozenDecor() {
  return (
    <g>
      {/* lapisan es di atas batu */}
      <ellipse cx={80} cy={86} rx={50} ry={30} fill={C.sky} fillOpacity={0.3} stroke={INK} strokeWidth={3} strokeDasharray="1 7" strokeLinecap="round" />
      {/* kristal es */}
      <g>
        <polygon points="62,74 71,30 90,74" fill="#D7F1FF" {...line} />
        <polygon points="71,30 74,74 90,74" fill="#9AD7FF" opacity={0.65} />
        <polygon points="36,84 48,50 62,86" fill="#D7F1FF" {...line} />
        <polygon points="48,50 52,86 62,86" fill="#9AD7FF" opacity={0.65} />
        <polygon points="98,82 114,46 126,86" fill="#D7F1FF" {...line} />
        <polygon points="114,46 112,86 126,86" fill="#9AD7FF" opacity={0.65} />
        <polygon points="76,108 84,82 94,110" fill="#D7F1FF" {...line} />
      </g>
      {/* es menggantung */}
      {[
        [40, 112, 14],
        [58, 120, 20],
        [102, 122, 18],
        [122, 112, 13],
      ].map(([x, y, h]) => (
        <polygon key={x} points={`${x - 5},${y} ${x + 5},${y} ${x},${y + h}`} fill="#D7F1FF" {...line25} />
      ))}
      <path d="M58 40 L66 62 M44 62 L50 74" fill="none" stroke={C.cream} strokeWidth={3.5} strokeLinecap="round" opacity={0.9} />
      <Sparkle x={78} y={22} size={9} color={C.cream} delay={0} />
      <Sparkle x={128} y={44} size={7} color={C.sky} delay={0.8} />
      <Sparkle x={32} y={52} size={7} color={C.cream} delay={1.4} />
      {/* kepingan salju melayang */}
      <motion.g
        animate={{ y: [0, 20], x: [0, -6], opacity: [0, 1, 0], rotate: [0, 120] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
      >
        <g transform="translate(138 76)" style={SVG_ATTR_ORIGIN} stroke={C.sky} strokeWidth={3} strokeLinecap="round">
          <path d="M0 -7 L0 7 M-6 -3.5 L6 3.5 M-6 3.5 L6 -3.5" />
        </g>
      </motion.g>
    </g>
  );
}

function Crown() {
  return (
    <motion.g
      animate={{ y: [0, -5, 0], rotate: [-4, 4, -4] }}
      transition={loop(1.4)}
      style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
    >
      <g transform="translate(0 -4)" style={SVG_ATTR_ORIGIN}>
        <path
          d="M58 52 L54 24 L69 36 L80 14 L91 36 L106 24 L102 52 Q80 60 58 52Z"
          fill={HONEY_SOFT}
          {...line}
        />
        <path d="M62 49 Q80 56 98 49" fill="none" stroke={C.honey} strokeWidth={4} strokeLinecap="round" />
        <circle cx={54} cy={22} r={4.5} fill={C.cream} {...line25} />
        <circle cx={80} cy={12} r={4.5} fill={C.cream} {...line25} />
        <circle cx={106} cy={22} r={4.5} fill={C.cream} {...line25} />
        <circle cx={80} cy={42} r={5.5} fill={C.peach} {...line25} />
        <circle cx={65} cy={46} r={3.4} fill={C.sky} {...line25} />
        <circle cx={95} cy={46} r={3.4} fill={C.matcha} {...line25} />
      </g>
    </motion.g>
  );
}

function ActiveHalo() {
  return (
    <g>
      <motion.ellipse
        cx={80}
        cy={102}
        rx={68}
        ry={44}
        fill={C.honey}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.35, 0.1, 0.35] }}
        transition={loop(1.8)}
      />
      {[0, 0.9].map((d) => (
        <motion.ellipse
          key={d}
          cx={80}
          cy={110}
          rx={56}
          ry={34}
          fill="none"
          stroke={C.honey}
          strokeWidth={3}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          animate={{ scale: [1, 1.38], opacity: [0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: d }}
        />
      ))}
    </g>
  );
}

export function SteppingStoneNode({ status, label, className, title }: SteppingStoneNodeProps) {
  const p = STONE_PALETTE[status];
  const name = title ?? STONE_LABEL[status];
  const active = status === "active_today";

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 160 160"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={name}
        className={className}
        style={{ overflow: "visible" }}
      >
        <title>{name}</title>
        <ellipse cx={80} cy={148} rx={56} ry={9} fill={INK} opacity={0.14} />
        {active && <ActiveHalo />}

        <motion.g
          style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
          animate={
            active
              ? { y: [0, -4, 0], scaleY: [1, 1.03, 1] }
              : status === "missed_frozen"
                ? { x: [0, -1.2, 1.2, 0] }
                : { y: 0 }
          }
          transition={
            status === "missed_frozen"
              ? { duration: 0.35, repeat: Infinity, repeatDelay: 2.4 }
              : loop(1.4)
          }
        >
          <StoneBase side={p.side} top={p.top} bevel={p.bevel} />
          {status === "completed_safe" && <SafeDecor />}
          {status === "completed_warn" && <WarnDecor />}
          {status === "missed_frozen" && <FrozenDecor />}
          {active && (
            <g>
              <Crown />
              <Sparkle x={26} y={60} size={9} delay={0} />
              <Sparkle x={136} y={54} size={8} color={C.cream} delay={0.6} />
              <Sparkle x={128} y={104} size={6} delay={1.2} />
            </g>
          )}
          {label !== undefined && status !== "missed_frozen" && (
            <text
              x={80}
              y={active ? 98 : 96}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Nunito, system-ui, sans-serif"
              fontWeight={900}
              fontSize={active ? 30 : 26}
              fill={C.cream}
              stroke={INK}
              strokeWidth={5}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {label}
            </text>
          )}
        </motion.g>
      </svg>
    </MotionConfig>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  2.  AnimatedTreasureChest
 * ═════════════════════════════════════════════════════════════ */

const WOOD = {
  locked: { wood: "#C9AE92", dark: "#A58C72", light: "#DCC3A8", band: "#B8C4CC", bandDark: "#8FA0AB" },
  live: { wood: "#D99A5B", dark: "#B77C3F", light: "#EBB67A", band: C.honey, bandDark: GOLD_DARK },
} as const;

type Wood = (typeof WOOD)[keyof typeof WOOD];

const CHEST_LABEL: Record<ChestState, string> = {
  locked: "Peti harta terkunci",
  ready_shaking: "Peti harta siap dibuka",
  opened: "Peti harta terbuka penuh koin",
};

const LID_D = "M40 112 L40 92 Q40 48 100 48 Q160 48 160 92 L160 112Z";

function ChestBody({ w }: { w: Wood }) {
  return (
    <g>
      <path d="M42 110 L158 110 L154 176 Q154 184 146 184 L54 184 Q46 184 46 176Z" fill={w.wood} {...line} />
      <path d="M45 136 L155 136 M46 160 L154 160" stroke={w.dark} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
      <path d="M52 118 L52 176" stroke={w.light} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      <rect x={60} y={110} width={18} height={74} fill={w.band} {...line3} />
      <rect x={122} y={110} width={18} height={74} fill={w.band} {...line3} />
      {[69, 131].map((x) => (
        <g key={x}>
          <circle cx={x} cy={124} r={2.8} fill={w.bandDark} />
          <circle cx={x} cy={170} r={2.8} fill={w.bandDark} />
        </g>
      ))}
      <rect x={42} y={174} width={116} height={11} rx={4} fill={w.band} {...line3} />
    </g>
  );
}

function ChestLidClosed({ w, uid }: { w: Wood; uid: string }) {
  const clip = `${uid}-lid`;
  return (
    <g>
      <clipPath id={clip}>
        <path d={LID_D} />
      </clipPath>
      <path d={LID_D} fill={w.wood} />
      <g clipPath={`url(#${clip})`}>
        <path d="M44 84 Q100 62 156 84" fill="none" stroke={w.dark} strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
        <rect x={60} y={40} width={18} height={76} fill={w.band} stroke={INK} strokeWidth={3} />
        <rect x={122} y={40} width={18} height={76} fill={w.band} stroke={INK} strokeWidth={3} />
      </g>
      <path d={LID_D} fill="none" {...line} />
      <path d="M52 74 Q64 58 90 54" fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      <rect x={38} y={104} width={124} height={12} rx={4} fill={w.band} {...line3} />
      <circle cx={46} cy={110} r={2.8} fill={w.bandDark} />
      <circle cx={154} cy={110} r={2.8} fill={w.bandDark} />
    </g>
  );
}

function LockPlate({ w, glow = false }: { w: Wood; glow?: boolean }) {
  return (
    <g>
      <rect x={88} y={112} width={24} height={26} rx={7} fill={w.band} {...line3} />
      {glow && (
        <motion.circle
          cx={100}
          cy={124}
          r={8}
          fill={C.cream}
          style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.9, 0.3, 0.9] }}
          transition={loop(0.8)}
        />
      )}
      <circle cx={100} cy={122} r={3.6} fill={INK} />
      <path d="M98.5 124 L101.5 124 L102.5 132 L97.5 132Z" fill={INK} />
    </g>
  );
}

function Chains({ w }: { w: Wood }) {
  const links: { x: number; y: number; a: number; k: number }[] = [];
  const ts = [0.1, 0.24, 0.38, 0.62, 0.76, 0.9];
  const aDown = (Math.atan2(62, 108) * 180) / Math.PI;
  ts.forEach((t, k) => {
    links.push({ x: 46 + 108 * t, y: 116 + 62 * t, a: aDown, k });
    links.push({ x: 154 - 108 * t, y: 116 + 62 * t, a: -aDown, k });
  });
  return (
    <g>
      {links.map((l, i) => {
        const h = l.k % 2 === 0 ? 9 : 4.5;
        return (
          <g key={i} transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.a.toFixed(1)})`} style={SVG_ATTR_ORIGIN}>
            <rect x={-8} y={-h / 2} width={16} height={h} rx={h / 2} fill="none" stroke={INK} strokeWidth={6.5} />
            <rect x={-8} y={-h / 2} width={16} height={h} rx={h / 2} fill="none" stroke={w.band} strokeWidth={2.5} />
          </g>
        );
      })}
    </g>
  );
}

function Padlock({ w }: { w: Wood }) {
  return (
    <motion.g
      style={{ transformBox: "fill-box", originX: 0.5, originY: 0.1 }}
      animate={{ rotate: [-3, 3, -3] }}
      transition={loop(2.4)}
    >
      <path d="M92 132 L92 123 Q92 112 100 112 Q108 112 108 123 L108 132" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <path d="M92 132 L92 123 Q92 112 100 112 Q108 112 108 123 L108 132" fill="none" stroke={w.bandDark} strokeWidth={4.5} strokeLinecap="round" />
      <rect x={86} y={130} width={28} height={24} rx={6} fill={w.band} {...line} />
      <circle cx={100} cy={140} r={3.8} fill={INK} />
      <path d="M98.5 142 L101.5 142 L102.5 148 L97.5 148Z" fill={INK} />
      <path d="M90 134 L90 148" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </motion.g>
  );
}

/* ----- state: locked ----- */

function LockedChest({ uid }: { uid: string }) {
  const w = WOOD.locked;
  return (
    <motion.g
      style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
      animate={{ scaleY: [1, 1.012, 1] }}
      transition={loop(3)}
    >
      <ChestBody w={w} />
      <ChestLidClosed w={w} uid={uid} />
      <Chains w={w} />
      <Padlock w={w} />
    </motion.g>
  );
}

/* ----- state: ready_shaking ----- */

function ReadyChest({ uid }: { uid: string }) {
  const w = WOOD.live;
  const gradId = `${uid}-beam`;
  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={C.honey} stopOpacity={0.95} />
          <stop offset="1" stopColor={C.honey} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.g
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={loop(0.7)}
        fill={`url(#${gradId})`}
      >
        <path d="M58 108 L18 6 L66 0 L84 108Z" />
        <path d="M90 108 L80 -6 L120 -6 L110 108Z" />
        <path d="M116 108 L134 0 L182 6 L142 108Z" />
      </motion.g>

      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        animate={{ rotate: [0, -4, 4, -3, 3, -1, 0], x: [0, -1, 1, -1, 1, 0, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
      >
        <rect x={44} y={103} width={112} height={11} fill={HONEY_SOFT} />
        <ChestBody w={w} />
        <motion.g animate={{ y: [0, -7, -3, -7, 0] }} transition={loop(0.8, { repeatDelay: 0.5 })}>
          <ChestLidClosed w={w} uid={uid} />
        </motion.g>
        <LockPlate w={w} glow />
      </motion.g>

      <Sparkle x={34} y={52} size={10} delay={0} />
      <Sparkle x={166} y={46} size={9} color={C.cream} delay={0.5} />
      <Sparkle x={100} y={18} size={12} delay={1} />
      <Sparkle x={150} y={86} size={7} delay={1.4} color={C.cream} />
    </g>
  );
}

/* ----- state: opened ----- */

const MOUND_COINS = [
  [56, 112, 10],
  [76, 110, 11],
  [96, 108, 11],
  [118, 108, 11],
  [136, 112, 10],
  [66, 100, 10],
  [86, 96, 10],
  [106, 94, 10],
  [128, 100, 10],
  [76, 86, 9],
  [96, 80, 10],
  [116, 84, 9],
] as const;

const POPPERS = [
  { dx: -52, delay: 0, r: 8 },
  { dx: -20, delay: 0.45, r: 7 },
  { dx: 24, delay: 0.2, r: 8 },
  { dx: 54, delay: 0.7, r: 7 },
];

const RISING_STARS = [
  { x: -40, delay: 0, size: 12 },
  { x: 2, delay: 0.5, size: 15 },
  { x: 44, delay: 1, size: 11 },
];

function OpenedChest({ uid }: { uid: string }) {
  const w = WOOD.live;
  const glow = `${uid}-glow`;
  const moundClip = `${uid}-mound`;
  const mound = "M50 112 Q52 80 100 72 Q148 80 150 112Z";
  return (
    <g>
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor={MATCHA_SOFT} stopOpacity={0.9} />
          <stop offset="1" stopColor={C.matcha} stopOpacity={0} />
        </radialGradient>
        <clipPath id={moundClip}>
          <path d={mound} />
        </clipPath>
      </defs>

      <motion.circle
        cx={100}
        cy={90}
        r={92}
        fill={`url(#${glow})`}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={loop(2)}
      />
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      >
        <g transform="translate(100 90)" style={SVG_ATTR_ORIGIN} fill={C.matcha} opacity={0.26}>
          {Array.from({ length: 8 }).map((_, i) => (
            <path key={i} d="M0 0 L-9 -88 L9 -88Z" transform={`rotate(${i * 45})`} style={SVG_ATTR_ORIGIN} />
          ))}
        </g>
      </motion.g>

      {/* bagian dalam tutup peti */}
      <path d="M40 112 L46 30 Q100 8 154 30 L160 112Z" fill={w.wood} {...line} />
      <path d="M50 108 L56 40 Q100 24 144 40 L150 108Z" fill={C.peach} {...line3} />
      <path d="M58 100 L62 48 Q100 36 138 48 L142 100Z" fill="none" stroke={C.cream} strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round" />
      {[
        [100, 58],
        [80, 80],
        [120, 80],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={C.honey} {...line25} />
      ))}

      {/* gundukan koin */}
      <path d={mound} fill={C.honey} />
      <g clipPath={`url(#${moundClip})`}>
        {[...MOUND_COINS]
          .sort((a, b) => a[1] - b[1])
          .map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
              <Coin r={r} />
            </g>
          ))}
      </g>
      <path d="M50 112 Q52 80 100 72 Q148 80 150 112" fill="none" {...line} />
      <g transform="translate(124 84)" style={SVG_ATTR_ORIGIN}>
        <polygon points="-9,-2 -5,-8 5,-8 9,-2 0,9" fill={C.sky} {...line25} />
      </g>
      <circle cx={80} cy={92} r={4.5} fill={C.peach} {...line25} />

      <ChestBody w={w} />
      <rect x={38} y={104} width={124} height={12} rx={4} fill={w.band} {...line3} />
      <circle cx={46} cy={110} r={2.8} fill={w.bandDark} />
      <circle cx={154} cy={110} r={2.8} fill={w.bandDark} />
      <LockPlate w={w} />

      {/* koin tumpah */}
      <g transform="translate(66 116)" style={SVG_ATTR_ORIGIN}>
        <Coin r={9} />
      </g>
      <g transform="translate(136 114)" style={SVG_ATTR_ORIGIN}>
        <Coin r={8} />
      </g>
      <g transform="translate(34 190)" style={SVG_ATTR_ORIGIN}>
        <Coin r={9} />
      </g>
      <g transform="translate(166 188)" style={SVG_ATTR_ORIGIN}>
        <Coin r={8} />
      </g>
      <g transform="translate(152 198)" style={SVG_ATTR_ORIGIN}>
        <Coin r={6} />
      </g>

      {/* koin melompat keluar */}
      <g transform="translate(100 80)" style={SVG_ATTR_ORIGIN}>
        {POPPERS.map((p, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
            animate={{ x: [0, p.dx * 0.7, p.dx], y: [0, -70, 30], opacity: [0, 1, 1, 0], rotate: [0, 180, 360] }}
            transition={{
              duration: 1.8,
              delay: p.delay,
              repeat: Infinity,
              repeatDelay: 0.4,
              x: { duration: 1.8, ease: "linear", delay: p.delay, repeat: Infinity, repeatDelay: 0.4 },
              y: { duration: 1.8, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"], delay: p.delay, repeat: Infinity, repeatDelay: 0.4 },
              opacity: { duration: 1.8, times: [0, 0.1, 0.8, 1], delay: p.delay, repeat: Infinity, repeatDelay: 0.4 },
            }}
          >
            <Coin r={p.r} />
          </motion.g>
        ))}
      </g>

      {/* bintang naik */}
      <g transform="translate(100 62)" style={SVG_ATTR_ORIGIN}>
        {RISING_STARS.map((s, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ y: [0, -46], scale: [0.3, 1.1, 0.8], rotate: [0, 160], opacity: [0, 1, 0] }}
            transition={{ duration: 1.8, delay: s.delay, repeat: Infinity, ease: "easeOut" }}
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          >
            <g transform={`translate(${s.x} 0)`} style={SVG_ATTR_ORIGIN}>
              <polygon points={starPoints(0, 0, s.size, s.size * 0.45)} fill={C.honey} {...line3} />
              <circle cx={-s.size * 0.25} cy={-s.size * 0.25} r={2} fill={C.cream} />
            </g>
          </motion.g>
        ))}
      </g>
      <Sparkle x={30} y={64} size={10} delay={0.2} />
      <Sparkle x={172} y={70} size={9} color={C.cream} delay={0.9} />
      <Sparkle x={156} y={28} size={7} delay={1.4} />
    </g>
  );
}

export function AnimatedTreasureChest({ state, className, title }: AnimatedTreasureChestProps) {
  const uid = useId().replace(/:/g, "");
  const name = title ?? CHEST_LABEL[state];
  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 200 206"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={name}
        className={className}
        style={{ overflow: "visible" }}
      >
        <title>{name}</title>
        <ellipse cx={100} cy={190} rx={72} ry={8} fill={INK} opacity={0.14} />
        {state === "locked" && <LockedChest uid={uid} />}
        {state === "ready_shaking" && <ReadyChest uid={uid} />}
        {state === "opened" && <OpenedChest uid={uid} />}
      </svg>
    </MotionConfig>
  );
}

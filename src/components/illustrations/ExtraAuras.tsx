"use client";

/**
 * 16 aura baru untuk Butik (Versi 5.1) — 2 aura per fase pertumbuhan.
 * Semua partikel memakai posisi deterministik (tanpa Math.random) dan digambar di belakang pet.
 */
import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { Floaters, Glow, INK, K, Spark, fb, linear, loop, polar, ringSpots, starPts } from "./cosmeticKit";

type AuraProps = { cy: number; uid: string };

/* ───────────────────────── FASE 1 ───────────────────────── */

const RAIN = ringSpots(14, 101, 112, 178);
const RAINBOW = [K.peach, K.honey, K.matcha, K.sky] as const;

function AuraRainbowDrizzle({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="rn" cy={cy} color={K.skySoft} r={160} op={0.4} />
      <motion.g animate={{ y: [0, -5, 0] }} transition={loop(4.2)}>
        {RAINBOW.map((col, i) => {
          const r = 118 - i * 10;
          return <path key={col} d={`M${200 - r} ${cy - 96} A${r} ${r} 0 0 1 ${200 + r} ${cy - 96}`} fill="none" stroke={col} strokeWidth={7} strokeLinecap="round" opacity={0.85} />;
        })}
      </motion.g>
      <Floaters
        cy={cy}
        spots={RAIN}
        kind="fall"
        dur={2.6}
        render={() => <path d="M0 -8 C5 -1 6 3 0 7 C-6 3 -5 -1 0 -8Z" fill={K.skySoft} stroke={K.sky} strokeWidth={1.8} strokeLinejoin="round" />}
      />
    </g>
  );
}

const DANDE = ringSpots(10, 131, 110, 176);

function AuraDandelion({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="dn" cy={cy} color={K.honeySoft} r={150} op={0.3} />
      <Floaters
        cy={cy}
        spots={DANDE}
        kind="sway"
        dur={4.4}
        render={(i) => (
          <g>
            <path d="M0 2 Q-1 8 0 12" fill="none" stroke={K.matchaDark} strokeWidth={1.8} strokeLinecap="round" />
            <g stroke={K.cream} strokeWidth={1.6} strokeLinecap="round" fill="none">
              <path d="M0 2 L-8 -8 M0 2 L-4 -11 M0 2 L0 -12 M0 2 L4 -11 M0 2 L8 -8" />
            </g>
            <g fill={K.cream} stroke={INK} strokeWidth={1.1}>
              <circle cx={-8} cy={-8} r={1.8} />
              <circle cx={-4} cy={-11} r={1.8} />
              <circle cx={0} cy={-12} r={1.8} />
              <circle cx={4} cy={-11} r={1.8} />
              <circle cx={8} cy={-8} r={1.8} />
            </g>
            <circle cx={0} cy={2} r={2.2} fill={i % 2 ? K.honeySoft : K.cream} stroke={INK} strokeWidth={1.2} />
          </g>
        )}
      />
      <Spark x={64} y={cy - 70} size={6} color={K.cream} delay={0.2} />
      <Spark x={338} y={cy + 20} size={6} color={K.honeySoft} delay={1} />
    </g>
  );
}

/* ───────────────────────── FASE 2 ───────────────────────── */

const AUTUMN = ringSpots(12, 151, 108, 180);
const AUTUMN_COLS = ["#FF9A3C", "#E0553F", K.honey, "#C98B3A"] as const;

function AuraAutumnLeaves({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="au" cy={cy} color="#FFC58A" r={160} op={0.32} />
      <Floaters
        cy={cy}
        spots={AUTUMN}
        kind="fall"
        dur={4.2}
        render={(i) => (
          <g>
            <path d="M0 -9 Q8 -5 6 1 Q11 6 0 10 Q-11 6 -6 1 Q-8 -5 0 -9Z" fill={AUTUMN_COLS[i % AUTUMN_COLS.length]} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
            <path d="M0 -6 V9" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
          </g>
        )}
      />
    </g>
  );
}

const RAY_COUNT = 14;

function AuraSunRays({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="sr" cy={cy} color={K.honeySoft} r={172} op={0.55} />
      <motion.g style={fb()} animate={{ rotate: 360 }} transition={linear(48)}>
        <circle cx={200} cy={cy} r={182} fill="none" stroke="none" />
        {Array.from({ length: RAY_COUNT }).map((_, i) => {
          const a = (360 / RAY_COUNT) * i;
          const tip = i % 2 ? 160 : 176;
          const [x1, y1] = polar(200, cy, 124, a - 3.4);
          const [x2, y2] = polar(200, cy, tip, a);
          const [x3, y3] = polar(200, cy, 124, a + 3.4);
          return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={i % 2 ? K.honeySoft : K.honey} stroke={K.honeyDark} strokeWidth={1.8} strokeLinejoin="round" opacity={0.9} />;
        })}
      </motion.g>
      <Spark x={72} y={cy - 96} size={7} color={K.cream} delay={0.4} />
      <Spark x={330} y={cy + 92} size={7} color={K.cream} delay={1.2} />
    </g>
  );
}

/* ───────────────────────── FASE 3 ───────────────────────── */

function Paw({ col }: { col: string }) {
  return (
    <g fill={col} stroke={INK} strokeWidth={1.8}>
      <ellipse cx={0} cy={4} rx={7.5} ry={6} />
      <circle cx={-9} cy={-4} r={3.2} />
      <circle cx={-3.4} cy={-9.5} r={3.2} />
      <circle cx={3.4} cy={-9.5} r={3.2} />
      <circle cx={9} cy={-4} r={3.2} />
    </g>
  );
}

const PAWS = Array.from({ length: 9 }, (_, i) => {
  const [x, y] = polar(200, 0, 150, -200 + i * 28);
  return { x: x, y: y * 0.92, s: 0.9, d: i * 0.35, r: -20 + i * 28 - 90 + 20 };
});

function AuraPawPrints({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="pw" cy={cy} color={K.peachSoft} r={150} op={0.28} />
      {PAWS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${cy + p.y}) rotate(${p.r})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
          <motion.g animate={{ opacity: [0, 1, 1, 0] }} transition={linear(3.4, { delay: p.d, times: [0, 0.2, 0.7, 1] })}>
            <Paw col={i % 2 ? K.peachSoft : K.honeySoft} />
          </motion.g>
        </g>
      ))}
    </g>
  );
}

function AuraRainbowRing({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="rr" cy={cy} color={K.taroSoft} r={165} op={0.3} />
      {RAINBOW.map((col, i) => {
        const r = 150 - i * 11;
        return (
          <motion.g key={col} style={fb()} animate={{ rotate: i % 2 ? -360 : 360 }} transition={linear(14 + i * 5)}>
            <circle cx={200} cy={cy} r={r + 6} fill="none" stroke="none" />
            <circle cx={200} cy={cy} r={r} fill="none" stroke={col} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${40 + i * 6} ${30 - i * 2}`} opacity={0.9} />
          </motion.g>
        );
      })}
      <Spark x={60} y={cy - 40} size={7} color={K.cream} delay={0} />
      <Spark x={342} y={cy - 70} size={7} color={K.honeySoft} delay={0.8} />
      <Spark x={330} y={cy + 100} size={6} color={K.skySoft} delay={1.5} />
    </g>
  );
}

/* ───────────────────────── FASE 4 ───────────────────────── */

const MOON_STARS = ringSpots(9, 201, 112, 176);

function AuraMoonStars({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="mn" cy={cy} color="#C9C6FF" r={165} op={0.35} />
      <motion.g animate={{ y: [0, -8, 0], rotate: [-4, 4, -4] }} style={fb()} transition={loop(5)}>
        <path d="M312 70 A30 30 0 1 0 336 118 A24 24 0 1 1 312 70Z" transform={`translate(0 ${cy - 232})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }} fill={K.honeySoft} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      </motion.g>
      <Floaters
        cy={cy}
        spots={MOON_STARS}
        kind="twinkle"
        dur={2.4}
        render={(i) => <polygon points={starPts(0, 0, 9, 4)} fill={i % 3 === 0 ? K.honey : K.cream} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />}
      />
    </g>
  );
}

const CLOUDS = ringSpots(6, 231, 120, 172, 0.85);

function AuraCottonClouds({ cy, uid }: AuraProps) {
  const d = "M-44 12 Q-60 12 -60 -2 Q-60 -16 -44 -16 Q-42 -34 -22 -34 Q-12 -48 6 -42 Q22 -48 32 -32 Q54 -34 56 -14 Q66 -6 58 4 Q54 12 44 12Z";
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="cc" cy={cy} color={K.skySoft} r={165} op={0.35} />
      <Floaters
        cy={cy}
        spots={CLOUDS}
        kind="bob"
        dur={4.6}
        render={(i) => (
          <g transform="scale(0.34)" style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
            <path d={d} fill={i % 2 ? K.cream : "#FFE3EC"} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            <path d="M-40 4 Q-30 -2 -18 -2" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
          </g>
        )}
      />
    </g>
  );
}

/* ───────────────────────── FASE 5 ───────────────────────── */

const BALLOONS = ringSpots(7, 261, 118, 176, 0.8);
const BALLOON_COLS = [K.peach, K.honey, K.sky, K.matcha, K.taro, K.peachSoft, K.skySoft] as const;

function AuraBalloons({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="bl" cy={cy} color={K.peachSoft} r={160} op={0.28} />
      <Floaters
        cy={cy}
        spots={BALLOONS}
        kind="sway"
        dur={3.8}
        render={(i) => (
          <g>
            <path d="M0 12 Q-4 22 2 30 Q-2 38 0 44" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
            <path d="M0 -14 C12 -14 14 2 0 12 C-14 2 -12 -14 0 -14Z" fill={BALLOON_COLS[i % BALLOON_COLS.length]} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
            <path d="M-3 12 L3 12 L0 16Z" fill={BALLOON_COLS[i % BALLOON_COLS.length]} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
            <path d="M-6 -8 Q-8 -3 -6 1" fill="none" stroke={K.cream} strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />
          </g>
        )}
      />
    </g>
  );
}

const BOLTS = ringSpots(8, 291, 116, 176);

function AuraSparks({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="sp" cy={cy} color={K.honeySoft} r={168} op={0.4} />
      <Floaters
        cy={cy}
        spots={BOLTS}
        kind="twinkle"
        dur={1.5}
        render={(i) => (
          <path d="M3 -14 L-7 1 H-1 L-4 14 L8 -3 H1 Z" fill={i % 2 ? K.honey : K.honeySoft} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        )}
      />
      <Spark x={62} y={cy + 60} size={6} color={K.skySoft} delay={0.5} />
      <Spark x={340} y={cy - 80} size={6} color={K.cream} delay={1.1} />
    </g>
  );
}

/* ───────────────────────── FASE 6 ───────────────────────── */

const FEATHERS = ringSpots(10, 321, 112, 178);
const FEATHER_COLS = [K.cream, K.skySoft, K.taroSoft, "#FFE3EC"] as const;

function AuraFeathers({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="ft" cy={cy} color={K.cream} r={168} op={0.5} />
      <Floaters
        cy={cy}
        spots={FEATHERS}
        kind="fall"
        dur={5.6}
        render={(i) => (
          <g>
            <path d="M0 -14 Q9 -6 7 4 Q5 12 0 16 Q-5 12 -7 4 Q-9 -6 0 -14Z" fill={FEATHER_COLS[i % FEATHER_COLS.length]} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
            <path d="M0 -12 V18" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
            <path d="M0 -4 L5 -8 M0 2 L5 -2 M0 -4 L-5 -8 M0 2 L-5 -2" stroke={INK} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
          </g>
        )}
      />
    </g>
  );
}

const GEM_COLS = [K.sky, K.taro, K.peach, K.matcha, K.honey, K.skySoft] as const;

function Gem({ col }: { col: string }) {
  return (
    <g>
      <path d="M0 -10 L9 -3 L0 10 L-9 -3Z" fill={col} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M-9 -3 H9 M-3 -3 L0 -10 L3 -3 L0 10" fill="none" stroke={K.cream} strokeWidth={1.4} strokeLinejoin="round" opacity={0.8} />
    </g>
  );
}

function AuraGemOrbit({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="gm" cy={cy} color={K.taroSoft} r={165} op={0.35} />
      {[
        { r: 150, n: 6, dur: 26, rev: false },
        { r: 116, n: 4, dur: 20, rev: true },
      ].map((ring, ri) => (
        <motion.g key={ri} style={fb()} animate={{ rotate: ring.rev ? -360 : 360 }} transition={linear(ring.dur)}>
          <circle cx={200} cy={cy} r={ring.r + 14} fill="none" stroke="none" />
          {Array.from({ length: ring.n }).map((_, i) => {
            const [x, y] = polar(200, cy, ring.r, (360 / ring.n) * i + ri * 30);
            return (
              <g key={i} transform={`translate(${x} ${y})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
                <Gem col={GEM_COLS[(i + ri * 2) % GEM_COLS.length]} />
              </g>
            );
          })}
        </motion.g>
      ))}
      <Spark x={58} y={cy - 80} size={7} color={K.cream} delay={0.3} />
      <Spark x={344} y={cy + 70} size={7} color={K.cream} delay={1} />
    </g>
  );
}

/* ───────────────────────── FASE 7 ───────────────────────── */

const CONFETTI = ringSpots(18, 351, 106, 184);
const CONFETTI_COLS = [K.peach, K.honey, K.sky, K.matcha, K.taro] as const;

function AuraConfetti({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="cf" cy={cy} color={K.honeySoft} r={160} op={0.25} />
      <Floaters
        cy={cy}
        spots={CONFETTI}
        kind="fall"
        dur={3.2}
        render={(i) =>
          i % 3 === 0 ? (
            <circle r={3.2} fill={CONFETTI_COLS[i % CONFETTI_COLS.length]} stroke={INK} strokeWidth={1.4} />
          ) : (
            <rect x={-3.5} y={-6} width={7} height={12} rx={1.6} fill={CONFETTI_COLS[i % CONFETTI_COLS.length]} stroke={INK} strokeWidth={1.4} />
          )
        }
      />
      <Spark x={66} y={cy - 98} size={8} color={K.honey} delay={0.2} />
      <Spark x={334} y={cy - 60} size={8} color={K.peach} delay={0.9} />
    </g>
  );
}

const AURORA_PATHS = [
  ["M20 120 Q110 60 200 110 T380 100", "M20 100 Q110 140 200 90 T380 120"],
  ["M30 190 Q120 140 210 190 T380 170", "M30 170 Q120 215 210 165 T380 190"],
  ["M24 260 Q120 220 210 262 T380 244", "M24 246 Q120 288 210 240 T380 266"],
] as const;
const AURORA_COLS = [K.matchaSoft, K.skySoft, K.taroSoft] as const;

function AuraAuroraRibbons({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none" transform={`translate(0 ${cy - 205})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
      <Glow uid={uid} tag="ar" cy={205} color={K.matchaSoft} r={160} op={0.2} />
      {AURORA_PATHS.map(([a, b], i) => (
        <g key={i}>
          <motion.path d={a} fill="none" stroke={AURORA_COLS[i]} strokeWidth={14} strokeLinecap="round" opacity={0.55} animate={{ d: [a, b, a] }} transition={loop(5 + i * 1.4)} />
          <motion.path d={a} fill="none" stroke={K.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} animate={{ d: [a, b, a] }} transition={loop(5 + i * 1.4)} />
        </g>
      ))}
      <Spark x={60} y={70} size={7} color={K.cream} delay={0.2} />
      <Spark x={344} y={320} size={7} color={K.cream} delay={1.1} />
    </g>
  );
}

/* ───────────────────────── FASE 8 ───────────────────────── */

function MiniCrown() {
  return (
    <g>
      <path d="M-10 6 L-11 -6 L-5 0 L0 -9 L5 0 L11 -6 L10 6Z" fill={K.honey} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={0} cy={-9} r={2.2} fill={K.peach} stroke={INK} strokeWidth={1.2} />
      <path d="M-8 3 H8" stroke={K.honeyDark} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function AuraCrownHalo({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="ch" cy={cy} color={K.honeySoft} r={172} op={0.5} />
      <motion.g style={fb()} animate={{ rotate: 360 }} transition={linear(30)}>
        <circle cx={200} cy={cy} r={168} fill="none" stroke="none" />
        <circle cx={200} cy={cy} r={148} fill="none" stroke={K.honey} strokeWidth={4} strokeDasharray="3 12" strokeLinecap="round" opacity={0.85} />
        {[0, 120, 240].map((a) => {
          const [x, y] = polar(200, cy, 148, a);
          return (
            <g key={a} transform={`translate(${x} ${y})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
              <MiniCrown />
            </g>
          );
        })}
      </motion.g>
      <motion.g animate={{ y: [0, -6, 0] }} transition={loop(2.8)}>
        <ellipse cx={200} cy={cy - 150} rx={46} ry={11} fill="none" stroke={INK} strokeWidth={9} />
        <ellipse cx={200} cy={cy - 150} rx={46} ry={11} fill="none" stroke={K.honeySoft} strokeWidth={5} />
      </motion.g>
      <Spark x={60} y={cy - 60} size={8} color={K.cream} delay={0.3} />
      <Spark x={342} y={cy + 40} size={8} color={K.cream} delay={1} />
    </g>
  );
}

const COMETS = [
  { x: 330, y: -150, d: 0 },
  { x: 380, y: -70, d: 1.6 },
  { x: 300, y: 0, d: 3.1 },
  { x: 380, y: 100, d: 4.4 },
] as const;

function AuraComets({ cy, uid }: AuraProps) {
  return (
    <g pointerEvents="none">
      <Glow uid={uid} tag="cm" cy={cy} color={K.taroSoft} r={168} op={0.32} />
      <motion.g animate={{ y: [0, -6, 0], x: [0, -4, 0] }} transition={loop(3.6)}>
        <path d={`M338 ${cy - 118} L${338 + 46} ${cy - 142}`} stroke={K.cream} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        <path d={`M338 ${cy - 118} L${338 + 24} ${cy - 130}`} stroke={K.skySoft} strokeWidth={5} strokeLinecap="round" />
        <polygon points={starPts(338, cy - 118, 9, 4)} fill={K.honey} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      </motion.g>
      {COMETS.map((c, i) => (
        <motion.g key={i} animate={{ x: [0, -230], y: [0, 120], opacity: [0, 1, 1, 0] }} transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.2, delay: c.d, ease: "easeIn" }}>
          <path d={`M${c.x} ${cy + c.y} L${c.x + 70} ${cy + c.y - 36}`} stroke={K.cream} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
          <path d={`M${c.x} ${cy + c.y} L${c.x + 34} ${cy + c.y - 17}`} stroke={K.skySoft} strokeWidth={5} strokeLinecap="round" />
          <polygon points={starPts(c.x, cy + c.y, 9, 4)} fill={K.honey} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        </motion.g>
      ))}
      <Spark x={70} y={cy - 110} size={7} color={K.cream} delay={0.4} />
      <Spark x={110} y={cy + 120} size={6} color={K.honeySoft} delay={1.3} />
      <Spark x={310} y={cy + 130} size={7} color={K.taroSoft} delay={0.9} />
    </g>
  );
}

export const EXTRA_AURA_REG: Readonly<Record<string, ComponentType<AuraProps>>> = {
  aura_rainbow_drizzle: AuraRainbowDrizzle,
  aura_dandelion_seeds: AuraDandelion,
  aura_autumn_leaves: AuraAutumnLeaves,
  aura_sun_rays: AuraSunRays,
  aura_paw_prints: AuraPawPrints,
  aura_rainbow_ring: AuraRainbowRing,
  aura_moon_stars: AuraMoonStars,
  aura_cotton_clouds: AuraCottonClouds,
  aura_party_balloons: AuraBalloons,
  aura_electric_sparks: AuraSparks,
  aura_angel_feathers: AuraFeathers,
  aura_gem_orbit: AuraGemOrbit,
  aura_confetti_party: AuraConfetti,
  aura_aurora_ribbons: AuraAuroraRibbons,
  aura_crown_halo: AuraCrownHalo,
  aura_shooting_comets: AuraComets,
};

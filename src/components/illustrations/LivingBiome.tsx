"use client";

/**
 * Bioma Hidup (Versi 5.0): lapisan dekorasi yang bergerak di belakang & tepi peta perjalanan.
 * - Awan melayang pelan, kolam kecil dengan riak air.
 * - Partikel cuaca sesuai bulan (hujan, salju, kelopak, kunang-kunang, gelembung, dst.).
 * - Pohon di tepi peta: diketuk akan bergoyang; Pohon Koin (level 4) menjatuhkan koin hiasan.
 * Semua posisi berasal dari tabel tetap (tanpa acak) sehingga SSR/CSR konsisten.
 * Gerakan CSS dimatikan oleh `prefers-reduced-motion`; gerakan framer oleh MotionConfig.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { GrowingResourceTree, type BiomeMonthMeta, type WeatherType } from "./BiomeEnvironment";

interface Particle {
  left: number; // %
  delay: number; // detik (negatif = sudah berjalan)
  dur: number; // detik
  size: number; // px
  drift: number; // px
}

const PARTICLES: readonly Particle[] = [
  { left: 6, delay: -2, dur: 9, size: 8, drift: 10 },
  { left: 14, delay: -7, dur: 11, size: 6, drift: 14 },
  { left: 23, delay: -4, dur: 8, size: 9, drift: 8 },
  { left: 31, delay: -9, dur: 12, size: 7, drift: 12 },
  { left: 40, delay: -1, dur: 10, size: 6, drift: 16 },
  { left: 48, delay: -6, dur: 9, size: 8, drift: 9 },
  { left: 56, delay: -3, dur: 13, size: 7, drift: 13 },
  { left: 64, delay: -8, dur: 8, size: 9, drift: 11 },
  { left: 72, delay: -5, dur: 11, size: 6, drift: 15 },
  { left: 80, delay: -10, dur: 10, size: 8, drift: 9 },
  { left: 87, delay: -2.5, dur: 12, size: 7, drift: 12 },
  { left: 94, delay: -6.5, dur: 9, size: 6, drift: 10 },
  { left: 19, delay: -11, dur: 14, size: 7, drift: 13 },
  { left: 60, delay: -12, dur: 14, size: 8, drift: 10 },
];

/** Posisi kunang-kunang / kilau (top %). */
const GLOW_SPOTS: readonly { left: number; top: number; delay: number; dur: number; size: number }[] = [
  { left: 10, top: 6, delay: -0.4, dur: 3.2, size: 7 },
  { left: 82, top: 11, delay: -1.5, dur: 2.8, size: 6 },
  { left: 26, top: 19, delay: -2.1, dur: 3.6, size: 8 },
  { left: 70, top: 27, delay: -0.9, dur: 3.0, size: 6 },
  { left: 12, top: 36, delay: -1.8, dur: 3.4, size: 7 },
  { left: 88, top: 45, delay: -2.6, dur: 2.9, size: 8 },
  { left: 36, top: 54, delay: -0.2, dur: 3.3, size: 6 },
  { left: 76, top: 63, delay: -1.2, dur: 3.7, size: 7 },
  { left: 8, top: 72, delay: -2.3, dur: 3.1, size: 8 },
  { left: 60, top: 81, delay: -0.7, dur: 2.7, size: 6 },
  { left: 22, top: 90, delay: -1.9, dur: 3.5, size: 7 },
  { left: 90, top: 95, delay: -2.8, dur: 3.0, size: 6 },
];

const CLOUDS: readonly { top: number; dur: number; delay: number; scale: number; opacity: number }[] = [
  { top: 2, dur: 95, delay: -20, scale: 1, opacity: 0.85 },
  { top: 16, dur: 120, delay: -70, scale: 0.7, opacity: 0.7 },
  { top: 33, dur: 105, delay: -40, scale: 0.9, opacity: 0.8 },
  { top: 52, dur: 130, delay: -95, scale: 0.65, opacity: 0.65 },
  { top: 71, dur: 110, delay: -10, scale: 0.85, opacity: 0.75 },
  { top: 88, dur: 125, delay: -60, scale: 0.75, opacity: 0.7 },
];

const PONDS: readonly { left: number; top: number; w: number }[] = [
  { left: 6, top: 24, w: 74 },
  { left: 76, top: 47, w: 70 },
  { left: 8, top: 69, w: 78 },
  { left: 74, top: 90, w: 72 },
];

const TREE_SPOTS: readonly { side: "left" | "right"; top: number; scale: number }[] = [
  { side: "left", top: 7, scale: 1 },
  { side: "right", top: 21, scale: 0.92 },
  { side: "left", top: 38, scale: 0.96 },
  { side: "right", top: 56, scale: 1 },
  { side: "left", top: 74, scale: 0.94 },
  { side: "right", top: 91, scale: 0.98 },
];

function CloudShape({ scale }: { scale: number }) {
  return (
    <svg width={Math.round(92 * scale)} height={Math.round(44 * scale)} viewBox="0 0 92 44" aria-hidden="true">
      <path
        d="M16 38a14 14 0 0 1-1-28 18 18 0 0 1 34-4 15 15 0 0 1 25 9 12 12 0 0 1-2 23Z"
        fill="#FFFFFF"
        stroke="#3D352E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ParticleShape({ type, size }: { type: WeatherType; size: number }) {
  switch (type) {
    case "cozy_rain":
      return <span style={{ display: "block", width: 2.5, height: size * 2.2, borderRadius: 2, background: "#38B6FF", opacity: 0.6 }} />;
    case "crystal_snow":
      return <span style={{ display: "block", width: size, height: size, borderRadius: 9999, background: "#FFFFFF", border: "1.5px solid #8FD3FF" }} />;
    case "sakura_petal":
      return <span style={{ display: "block", width: size * 1.5, height: size * 0.9, borderRadius: "70% 30% 70% 30%", background: "#FFB5A8", border: "1.5px solid #3D352E" }} />;
    case "maple_fall":
      return <span style={{ display: "block", width: size * 1.3, height: size * 1.1, borderRadius: "50% 50% 50% 8%", background: "#FF8B7B", border: "1.5px solid #3D352E" }} />;
    case "breeze_leaf":
      return <span style={{ display: "block", width: size * 1.5, height: size * 0.8, borderRadius: "80% 20% 80% 20%", background: "#9BE564", border: "1.5px solid #3D352E" }} />;
    case "golden_harvest":
      return <span style={{ display: "block", width: size * 0.9, height: size * 0.9, borderRadius: 9999, background: "#FFC800", border: "1.5px solid #3D352E" }} />;
    case "sea_bubble":
      return <span style={{ display: "block", width: size * 1.1, height: size * 1.1, borderRadius: 9999, background: "rgba(255,255,255,0.55)", border: "1.5px solid #6FC6F2" }} />;
    default:
      return null;
  }
}

const FALLING: readonly WeatherType[] = ["cozy_rain", "crystal_snow", "sakura_petal", "maple_fall", "breeze_leaf", "golden_harvest"];
const SWAYING: readonly WeatherType[] = ["sakura_petal", "maple_fall", "breeze_leaf", "crystal_snow"];
const GLOWING: readonly WeatherType[] = ["sparkle_dew", "firefly_glow", "lantern_star"];

function glowColor(type: WeatherType): string {
  if (type === "firefly_glow") return "#F7FF8A";
  if (type === "lantern_star") return "#FFD76B";
  return "#BFEAFF";
}

/** Lapisan di belakang konten peta (awan, kolam, cuaca). */
export function LivingBiomeBackdrop({ biome }: { biome: BiomeMonthMeta }) {
  const type = biome.weatherType;
  const isFalling = FALLING.includes(type);
  const isRising = type === "sea_bubble";
  const isGlowing = GLOWING.includes(type);
  const isMist = type === "warm_mist";
  const rainy = type === "cozy_rain" || type === "sea_bubble";

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
      {/* Kolam & riak air */}
      {PONDS.map((p, i) => (
        <div key={`pond-${i}`} className="absolute" style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.w, height: Math.round(p.w * 0.38) }}>
          <div className="absolute inset-0 rounded-[50%] border-2" style={{ background: "rgba(143, 211, 255, 0.55)", borderColor: "rgba(61, 53, 46, 0.35)" }} />
          {[0, 1, 2].map((r) => (
            <span
              key={r}
              className="living-ripple"
              style={{
                left: "50%",
                top: "50%",
                width: rainy ? "92%" : "80%",
                height: "92%",
                border: "2px solid rgba(255,255,255,0.9)",
                animationDelay: `${-(i * 0.9 + r * (rainy ? 0.8 : 1.05))}s`,
                animationDuration: rainy ? "2.4s" : "3.4s",
              }}
            />
          ))}
        </div>
      ))}

      {/* Awan melayang */}
      {CLOUDS.map((c, i) => (
        <div key={`cloud-${i}`} className="living-cloud" style={{ top: `${c.top}%`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, opacity: c.opacity }}>
          <CloudShape scale={c.scale} />
        </div>
      ))}

      {/* Kabut hangat */}
      {isMist &&
        [12, 38, 64, 86].map((top, i) => (
          <div
            key={`mist-${top}`}
            className="living-mist"
            style={{ top: `${top}%`, width: "45%", height: 54, borderRadius: 9999, background: "rgba(255,255,255,0.45)", animationDuration: `${55 + i * 12}s`, animationDelay: `${-(i * 21)}s` }}
          />
        ))}

      {/* Partikel jatuh / naik */}
      {(isFalling || isRising) &&
        PARTICLES.map((p, i) => (
          <div
            key={`p-${i}`}
            className={`living-particle ${isRising ? "living-particle-rise" : "living-particle-fall"}`}
            style={{ left: `${p.left}%`, animationDuration: `${type === "cozy_rain" ? 1.6 + (i % 4) * 0.25 : p.dur}s`, animationDelay: `${type === "cozy_rain" ? -(i * 0.37) : p.delay}s` }}
          >
            {SWAYING.includes(type) ? (
              <div className="living-particle-sway" style={{ ["--drift" as string]: `${p.drift}px`, animationDuration: `${3 + (i % 3)}s` }}>
                <ParticleShape type={type} size={p.size} />
              </div>
            ) : (
              <ParticleShape type={type} size={p.size} />
            )}
          </div>
        ))}

      {/* Kunang-kunang / kilau */}
      {isGlowing &&
        GLOW_SPOTS.map((g, i) => (
          <span
            key={`g-${i}`}
            className="living-twinkle"
            style={{
              left: `${g.left}%`,
              top: `${g.top}%`,
              width: g.size,
              height: g.size,
              borderRadius: 9999,
              background: glowColor(type),
              boxShadow: `0 0 ${g.size * 1.6}px ${glowColor(type)}`,
              animationDelay: `${g.delay}s`,
              animationDuration: `${g.dur}s`,
            }}
          />
        ))}
    </div>
  );
}

const COIN_DROPS: readonly { x: number; delay: number }[] = [
  { x: -14, delay: 0 },
  { x: 2, delay: 0.08 },
  { x: 16, delay: 0.16 },
];

function InteractiveTree({
  side,
  top,
  scale,
  level,
  foliage,
  foliageLight,
}: {
  side: "left" | "right";
  top: number;
  scale: number;
  level: 1 | 2 | 3 | 4;
  foliage: string;
  foliageLight: string;
}) {
  const [shake, setShake] = useState(0);
  const fruiting = level === 4;
  const w = Math.round(64 * scale);
  const h = Math.round(78 * scale);

  return (
    <button
      type="button"
      onPointerDown={() => setShake((n) => n + 1)}
      aria-label={fruiting ? "Goyangkan Pohon Koin" : "Goyangkan pohon ekosistem"}
      className="pointer-events-auto absolute cursor-pointer bg-transparent border-0 p-0 focus-visible:outline-2 focus-visible:outline-[#38B6FF] rounded-xl"
      style={{ [side]: 2, top: `${top}%`, width: w, height: h, touchAction: "manipulation" } as React.CSSProperties}
    >
      <svg viewBox="-42 -92 84 100" width={w} height={h} overflow="visible" aria-hidden="true">
        <motion.g
          key={shake}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          initial={shake > 0 ? { rotate: 0 } : false}
          animate={shake > 0 ? { rotate: [0, -9, 8, -5, 3, 0] } : { rotate: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <GrowingResourceTree x={0} y={0} scale={0.9} level={level} foliage={foliage} foliageLight={foliageLight} />
        </motion.g>
        {fruiting && shake > 0 &&
          COIN_DROPS.map((c) => (
            <motion.circle
              key={`${shake}-${c.x}`}
              cx={c.x}
              cy={-30}
              r={5}
              fill="#FFC800"
              stroke="#3D352E"
              strokeWidth={2}
              initial={{ cy: -34, opacity: 1 }}
              animate={{ cy: 6, opacity: [1, 1, 0] }}
              transition={{ duration: 0.8, delay: c.delay, ease: "easeIn" }}
            />
          ))}
      </svg>
    </button>
  );
}

/** Pohon tepi peta yang bisa diketuk (di atas konten, hanya area pohon yang menangkap sentuhan). */
export function LivingBiomeTrees({ biome, level }: { biome: BiomeMonthMeta; level: 1 | 2 | 3 | 4 }) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {TREE_SPOTS.map((t, i) => (
        <InteractiveTree key={i} side={t.side} top={t.top} scale={t.scale} level={level} foliage={biome.treeFoliage} foliageLight={biome.treeFoliageLight} />
      ))}
    </div>
  );
}

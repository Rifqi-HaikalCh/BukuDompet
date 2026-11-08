"use client";

import React, { useEffect } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Suasana Streak Padam (Versi 5.0): latar es `#EBF3F9`, vinyet embun beku, dan salju turun.
 * Posisi serpihan ditetapkan deterministik (tanpa Math.random) supaya server & klien identik.
 * Warna latar dan tepi kartu diubah lewat kelas `cold-mode` pada <body> (lihat globals.css).
 */
const FLAKES: { left: number; size: number; delay: number; dur: number; drift: number }[] =
  Array.from({ length: 26 }).map((_, i) => ({
    left: Math.round(((i * 37 + 11) % 100) * 10) / 10,
    size: 4 + ((i * 5) % 7),
    delay: -Math.round(((i * 53) % 90)) / 10,
    dur: 9 + ((i * 7) % 8),
    drift: ((i % 5) - 2) * 14,
  }));

export function ColdAmbience({ active }: { active: boolean }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("cold-mode", active);
    return () => document.body.classList.remove("cold-mode");
  }, [active]);

  if (!active) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-hidden="true"
        data-testid="cold-ambience"
        className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(235,243,249,0) 52%, rgba(184,212,232,0.55) 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent" />
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="cold-flake absolute rounded-full bg-white"
            style={{
              left: `${f.left}%`,
              top: "-12px",
              width: f.size,
              height: f.size,
              opacity: 0.85,
              boxShadow: "0 0 4px rgba(255,255,255,0.9)",
              animationDuration: `${f.dur}s`,
              animationDelay: `${f.delay}s`,
              ["--drift" as string]: `${f.drift}px`,
            }}
          />
        ))}
      </div>
    </MotionConfig>
  );
}

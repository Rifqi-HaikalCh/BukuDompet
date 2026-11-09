"use client";

/**
 * Dompet kartun beranimasi (V5.6.1) — pasangan "celengan kaca": isinya naik-turun sesuai sisa saldo, wajahnya
 * berubah (senang / cemas / pusing), koin melompat saat diisi, tutupnya terbuka saat dompet baru dibuka.
 * Semua gerak mengikuti preferensi "kurangi gerak" lewat MotionConfig.
 */
import React, { useId } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { WalletType } from "@/lib/finance/types";

const INK = "#3D352E";

export type WalletMood = "happy" | "worried" | "empty" | "sleepy";

const TONES: Record<string, { body: string; flap: string; liquid: string }> = {
  operational: { body: "#8FD6FF", flap: "#BCE3FF", liquid: "#FFC800" },
  commitment: { body: "#E2C6FF", flap: "#F1E3FF", liquid: "#FFC800" },
  emergency: { body: "#FFB3A8", flap: "#FFD3CC", liquid: "#FFC800" },
  savings: { body: "#A8E87A", flap: "#CFF3B3", liquid: "#FFC800" },
  grant: { body: "#FFE08D", flap: "#FFF0BE", liquid: "#58CC02" },
};

export const walletToneKey = (type: WalletType): string => (type in TONES ? type : "operational");

/** Suasana dompet dari sisa saldo: ≥35% senang, 10–35% cemas, <10% pusing, 0 alokasi mengantuk. */
export function moodOf(remainingRatio: number, allocated: number): WalletMood {
  if (allocated <= 0) return "sleepy";
  if (remainingRatio >= 0.35) return "happy";
  if (remainingRatio >= 0.1) return "worried";
  return "empty";
}

function Face({ mood }: { mood: WalletMood }) {
  const eye = (cx: number) =>
    mood === "empty" ? (
      <g stroke={INK} strokeWidth={3} strokeLinecap="round">
        <path d={`M${cx - 4} 72 L${cx + 4} 80`} />
        <path d={`M${cx + 4} 72 L${cx - 4} 80`} />
      </g>
    ) : mood === "sleepy" ? (
      <path d={`M${cx - 5} 77 Q${cx} 81 ${cx + 5} 77`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    ) : (
      <motion.ellipse
        cx={cx}
        cy={76}
        rx={3.6}
        ry={4.6}
        fill={INK}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    );
  return (
    <g>
      {eye(62)}
      {eye(98)}
      <ellipse cx={52} cy={88} rx={6} ry={3.4} fill="#FF8B7B" opacity={0.45} />
      <ellipse cx={108} cy={88} rx={6} ry={3.4} fill="#FF8B7B" opacity={0.45} />
      {mood === "happy" && <path d="M71 88 Q80 98 89 88" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
      {mood === "worried" && <path d="M72 94 Q80 88 88 94" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
      {mood === "empty" && <ellipse cx={80} cy={93} rx={4.5} ry={3.5} fill={INK} />}
      {mood === "sleepy" && <path d="M75 92 L85 92" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
      {mood === "worried" && (
        <motion.path
          d="M120 62 q4 7 0 10 q-4 -3 0 -10z"
          fill="#38B6FF"
          stroke={INK}
          strokeWidth={1.5}
          animate={{ y: [0, 6, 0], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
    </g>
  );
}

function Coin({ x, delay, dx }: { x: number; delay: number; dx: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, x, y: 40, scale: 0.4 }}
      animate={{ opacity: [0, 1, 1, 0], x: [x, x + dx * 0.5, x + dx], y: [40, -6, 30], scale: [0.4, 1, 0.9], rotate: [0, 180, 360] }}
      transition={{ duration: 1.1, delay, ease: "easeOut" }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      <circle r={9} fill="#FFC800" stroke={INK} strokeWidth={2.4} />
      <circle r={5} fill="none" stroke="#E5A400" strokeWidth={2} />
    </motion.g>
  );
}

export interface WalletIllustrationProps {
  type?: WalletType;
  /** Sisa saldo / alokasi, 0..1. */
  ratio: number;
  allocated?: number;
  locked?: boolean;
  /** Berubah setiap kali ada isi ulang agar koin melompat lagi. */
  pulseKey?: number;
  /** Tutup terbuka (mis. saat dompet baru dibuka atau disorot). */
  open?: boolean;
  /** Dompet baru: muncul membesar dengan pegas. */
  entrance?: boolean;
  className?: string;
  label?: string;
}

export function WalletIllustration({ type = "operational", ratio, allocated = 1, locked = false, pulseKey = 0, open = false, entrance = false, className, label }: WalletIllustrationProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tone = TONES[walletToneKey(type)];
  const pct = Math.max(0, Math.min(1, ratio));
  const mood = moodOf(pct, allocated);
  const top = 128 - 70 * pct; // permukaan isi (koordinat SVG)
  const text = label ?? `Dompet terisi ${Math.round(pct * 100)} persen${locked ? ", terkunci" : ""}`;
  return (
    <MotionConfig reducedMotion="user">
      <motion.svg
        viewBox="0 0 160 140"
        width="100%"
        className={className}
        role="img"
        aria-label={text}
        style={{ overflow: "visible" }}
        initial={entrance ? { scale: 0.2, opacity: 0, rotate: -12 } : false}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
      >
        <title>{text}</title>
        <defs>
          <clipPath id={`${uid}-body`}>
            <rect x={16} y={52} width={128} height={76} rx={20} />
          </clipPath>
        </defs>
        <ellipse cx={80} cy={134} rx={56} ry={6} fill={INK} opacity={0.14} />

        <motion.g
          animate={mood === "worried" ? { rotate: [-1.6, 1.6, -1.6] } : mood === "empty" ? { rotate: [-2, 2, -2], y: [0, 1, 0] } : { y: [0, -2.5, 0] }}
          transition={{ duration: mood === "happy" || mood === "sleepy" ? 3 : 0.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          {/* tutup / lipatan atas (berputar membuka) */}
          <motion.g
            animate={{ rotate: open ? -26 : 0, y: open ? -4 : 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 12 }}
            style={{ transformBox: "fill-box", transformOrigin: "10% 90%" }}
          >
            <path d="M18 62 Q18 36 46 34 L118 34 Q142 36 142 62 Z" fill={tone.flap} stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />
            <path d="M34 46 Q48 40 62 42" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
          </motion.g>

          {/* badan dompet + isi */}
          <rect x={16} y={52} width={128} height={76} rx={20} fill="#fff" stroke="none" />
          <g clipPath={`url(#${uid}-body)`}>
            <rect x={16} y={52} width={128} height={76} fill={tone.body} opacity={0.35} />
            <motion.rect
              x={16}
              width={128}
              height={80}
              fill={tone.liquid}
              opacity={0.55}
              initial={false}
              animate={{ y: top }}
              transition={{ type: "spring", stiffness: 70, damping: 14 }}
            />
            <motion.path
              d="M10 0 Q30 -6 50 0 T90 0 T130 0 T170 0 V8 H10Z"
              fill={tone.liquid}
              opacity={0.9}
              initial={false}
              animate={{ y: top - 1, x: [0, -40, 0] }}
              transition={{ y: { type: "spring", stiffness: 70, damping: 14 }, x: { duration: 4, repeat: Infinity, ease: "linear" } }}
            />
          </g>
          <rect x={16} y={52} width={128} height={76} rx={20} fill="none" stroke={INK} strokeWidth={3.2} />
          <path d="M26 66 Q26 60 34 60" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.75} />

          {/* kancing */}
          <g>
            <rect x={118} y={78} width={34} height={26} rx={13} fill={tone.flap} stroke={INK} strokeWidth={3} />
            {locked ? (
              <g transform="translate(135 91)">
                <rect x={-5} y={-2} width={10} height={8} rx={2} fill={INK} />
                <path d="M-3 -2 V-5 a3 3 0 0 1 6 0 V-2" fill="none" stroke={INK} strokeWidth={2} />
              </g>
            ) : (
              <circle cx={135} cy={91} r={4.5} fill="#FFC800" stroke={INK} strokeWidth={2} />
            )}
          </g>

          <Face mood={mood} />
        </motion.g>

        {/* koin melompat saat diisi / dibuka */}
        <AnimatePresence>
          {(pulseKey > 0 || open) && (
            <g key={`coins-${pulseKey}-${open ? 1 : 0}`}>
              <Coin x={52} delay={0} dx={-14} />
              <Coin x={82} delay={0.12} dx={4} />
              <Coin x={108} delay={0.24} dx={16} />
            </g>
          )}
        </AnimatePresence>

        {mood === "happy" && pct >= 0.9 && (
          <motion.path
            d="M142 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"
            fill="#FFC800"
            stroke={INK}
            strokeWidth={1.5}
            animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 20, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        )}
      </motion.svg>
    </MotionConfig>
  );
}

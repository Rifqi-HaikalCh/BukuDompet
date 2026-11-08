"use client";

/**
 * Persona karakter untuk Supervisor (Orang Tua / Wali) dan Admin (Abang) — Versi 5.1.
 * Sebelumnya peran dewasa memakai telur Pet; kini punya wajah sendiri agar anak mengenali
 * "siapa yang menemani": Wali Hangat (kacamata bulat, cardigan lavender, pin hati) dan
 * Abang Penjaga (headphone, hoodie matcha, lencana mahkota).
 *
 * Gaya: viewBox 120×120, outline #3D352E, pastel duotone, `useId` tanpa ":" untuk id gradien,
 * `transformBox: fill-box` pada setiap `motion.*` yang berotasi/berskala, `MotionConfig reducedMotion="user"`.
 */
import React, { useId } from "react";
import { MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const INK = "#3D352E";
const SKIN = "#FFE0C7";
const BLUSH = "#FFB4A8";

export type PersonaRole = "supervisor" | "admin";

export interface PersonaAvatarProps {
  role: PersonaRole;
  /** 0 | 1 — variasi warna rambut/aksesori agar dua supervisor tidak kembar. */
  variant?: 0 | 1;
  size?: number;
  className?: string;
  /** Beri judul bila avatar berdiri sendiri (bukan dekoratif). */
  title?: string;
  animated?: boolean;
}

/** Variasi deterministik dari id profil (tanpa Math.random). */
export function personaVariantFromId(id: string): 0 | 1 {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h % 2) as 0 | 1;
}

const CENTER_BOX: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

function Face({ animated }: { animated: boolean }) {
  return (
    <g>
      <ellipse cx="44" cy="63" rx="6" ry="4" fill={BLUSH} opacity="0.75" />
      <ellipse cx="76" cy="63" rx="6" ry="4" fill={BLUSH} opacity="0.75" />
      <motion.ellipse
        cx="50"
        cy="55"
        rx="3"
        ry="4.2"
        fill={INK}
        style={CENTER_BOX}
        animate={animated ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined}
        transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}
      />
      <motion.ellipse
        cx="70"
        cy="55"
        rx="3"
        ry="4.2"
        fill={INK}
        style={CENTER_BOX}
        animate={animated ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined}
        transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}
      />
      <circle cx="51" cy="53.4" r="1" fill="#fff" />
      <circle cx="71" cy="53.4" r="1" fill="#fff" />
      <path d="M54 66 Q60 72.5 66 66" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

function SupervisorArt({ variant, animated, uid }: { variant: 0 | 1; animated: boolean; uid: string }) {
  const hair = variant === 0 ? "#8A5A3C" : "#4B3A52";
  const hairLight = variant === 0 ? "#A9754F" : "#6A5470";
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-cardi`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3C7FF" />
          <stop offset="1" stopColor="#CE9BFF" />
        </linearGradient>
      </defs>
      {/* rambut belakang + sanggul */}
      <circle cx="60" cy="22" r="11" fill={hair} stroke={INK} strokeWidth="3" />
      <path d="M52 20 Q60 14 68 20" fill="none" stroke={hairLight} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 58 C28 34 44 20 60 20 C76 20 92 34 88 58 C88 70 82 78 76 80 L44 80 C38 78 32 70 32 58 Z" fill={hair} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {/* badan: cardigan */}
      <path d="M16 120 C16 96 36 86 60 86 C84 86 104 96 104 120 Z" fill={`url(#${uid}-cardi)`} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 86 L60 120" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M46 88 L60 104 L74 88" fill="#FFF7EC" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="66" cy="108" r="2.2" fill="#fff" stroke={INK} strokeWidth="1.8" />
      <circle cx="66" cy="116" r="2.2" fill="#fff" stroke={INK} strokeWidth="1.8" />
      {/* pin hati */}
      <motion.path
        d="M84 100 C80 96 76 100 80 104 L84 108 L88 104 C92 100 88 96 84 100 Z"
        fill="#FF8B7B"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
        style={CENTER_BOX}
        animate={animated ? { scale: [1, 1.15, 1] } : undefined}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* leher + kepala */}
      <rect x="52" y="76" width="16" height="14" rx="5" fill={SKIN} stroke={INK} strokeWidth="3" />
      <ellipse cx="60" cy="56" rx="26" ry="26" fill={SKIN} stroke={INK} strokeWidth="3" />
      {/* poni */}
      <path d="M34 52 C34 36 46 30 60 30 C74 30 86 36 86 52 C80 44 72 41 60 41 C48 41 40 44 34 52 Z" fill={hair} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Face animated={animated} />
      {/* kacamata bulat */}
      <circle cx="50" cy="55" r="9.5" fill="#fff" fillOpacity="0.28" stroke={INK} strokeWidth="2.6" />
      <circle cx="70" cy="55" r="9.5" fill="#fff" fillOpacity="0.28" stroke={INK} strokeWidth="2.6" />
      <path d="M59.5 55 L60.5 55" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

function AdminArt({ animated, uid }: { animated: boolean; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-hood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A6EE66" />
          <stop offset="1" stopColor="#7ED63A" />
        </linearGradient>
      </defs>
      {/* badan: hoodie */}
      <path d="M14 120 C14 96 34 86 60 86 C86 86 106 96 106 120 Z" fill={`url(#${uid}-hood)`} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 88 C44 100 52 104 60 104 C68 104 76 100 80 88" fill="#7ED63A" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M54 104 L53 116" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M66 104 L67 116" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      {/* lencana mahkota */}
      <motion.g
        style={CENTER_BOX}
        animate={animated ? { rotate: [-6, 6, -6] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="88" cy="102" r="9" fill="#FFC800" stroke={INK} strokeWidth="2.4" />
        <path d="M82 105 L83 98 L86 101 L88 97 L90 101 L93 98 L94 105 Z" fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      </motion.g>
      {/* leher + kepala */}
      <rect x="52" y="76" width="16" height="14" rx="5" fill={SKIN} stroke={INK} strokeWidth="3" />
      <ellipse cx="60" cy="56" rx="26" ry="26" fill={SKIN} stroke={INK} strokeWidth="3" />
      {/* rambut jabrik */}
      <path d="M33 54 C30 38 38 26 46 24 L44 14 L54 22 L60 12 L66 22 L76 14 L74 24 C82 26 90 38 87 54 C82 44 74 40 60 40 C46 40 38 44 33 54 Z" fill="#3F6FD0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Face animated={animated} />
      {/* headphone */}
      <path d="M31 56 C29 22 91 22 89 56" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M31 56 C29 22 91 22 89 56" fill="none" stroke="#38B6FF" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="24" y="50" width="11" height="20" rx="5" fill="#38B6FF" stroke={INK} strokeWidth="2.6" />
      <rect x="85" y="50" width="11" height="20" rx="5" fill="#38B6FF" stroke={INK} strokeWidth="2.6" />
    </g>
  );
}

export function PersonaArt({ role, variant = 0, animated = true }: { role: PersonaRole; variant?: 0 | 1; animated?: boolean }) {
  const raw = useId();
  const uid = `persona${raw.replace(/:/g, "")}`;
  return role === "supervisor" ? <SupervisorArt variant={variant} animated={animated} uid={uid} /> : <AdminArt animated={animated} uid={uid} />;
}

export const PERSONA_NAME: Record<PersonaRole, string> = {
  supervisor: "Wali Hangat",
  admin: "Abang Penjaga",
};

export function PersonaAvatar({ role, variant = 0, size = 64, className, title, animated = true }: PersonaAvatarProps) {
  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        focusable="false"
        className={cn("shrink-0", className)}
      >
        {title ? <title>{title}</title> : null}
        <PersonaArt role={role} variant={variant} animated={animated} />
      </svg>
    </MotionConfig>
  );
}

/** Persona di dalam lingkaran pastel (pengganti FamilyAvatar untuk peran dewasa). */
export function PersonaDisc({ role, variant = 0, size = 44, className }: { role: PersonaRole; variant?: 0 | 1; size?: number; className?: string }) {
  const tone = role === "supervisor" ? "border-[#E2C6FF] bg-[#F8F0FF]" : "border-[#C3EFA4] bg-[#EFFBE6]";
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn("rounded-full border-2 overflow-hidden shrink-0 flex items-end justify-center", tone, className)}
    >
      <PersonaAvatar role={role} variant={variant} size={Math.round(size * 1.02)} />
    </div>
  );
}

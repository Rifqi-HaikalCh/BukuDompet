"use client";

/**
 * Bagian paling atas halaman Admin (V5.6.1): judul singkat, ringkasan jumlah akun, dan navigasi antar bagian.
 * Menggantikan banner lama yang judulnya terpotong dan chip jumlah akun yang memanjang.
 */
import React from "react";
import { MotionConfig, motion } from "framer-motion";
import { CozyCard, RollingNumber } from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/store/useBukuDompetStore";

export const ADMIN_SECTIONS = [
  { id: "admin-akun", label: "Akun" },
  { id: "admin-penugasan", label: "Daftar & Penugasan" },
  { id: "admin-pencairan", label: "Pencairan Poin" },
  { id: "admin-misi", label: "Misi" },
] as const;

function Tile({ label, value, tone, hint }: { label: string; value: number; tone: string; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border-2 p-3 min-w-0", tone)}>
      <p className="text-[11px] font-display font-extrabold leading-tight opacity-80">{label}</p>
      <RollingNumber value={value} className="text-2xl" />
      {hint && <p className="text-[10px] font-bold opacity-70 leading-tight">{hint}</p>}
    </motion.div>
  );
}

export function AdminOverview({ profiles, pendingCashouts, assignments }: { profiles: ProfileData[]; pendingCashouts: number; assignments: number }) {
  const active = profiles.filter((p) => p.isActive !== false);
  const count = (r: string) => active.filter((p) => p.role === r).length;
  const inactive = profiles.length - active.length;
  const go = (id: string) => {
    soundEffects.tactileClick();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <MotionConfig reducedMotion="user">
      <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
        <div className="space-y-0.5">
          <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#1565C0]">Pusat Kendali</p>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-tight">Admin BukuDompet</h1>
          <p className="text-xs sm:text-sm font-bold text-[#7A6E65] leading-relaxed">Kelola akun, atur siapa memantau siapa, dan proses pencairan poin. Setiap perubahan dikonfirmasi dulu sebelum dikirim.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Tile label="Akun aktif" value={active.length} tone="bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]" />
          <Tile label="User" value={count("user")} tone="bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" />
          <Tile label="Anak SD" value={count("schoolchild")} tone="bg-[#FFFBEB] border-[#FDE08D] text-[#8A6A00]" />
          <Tile label="Supervisor" value={count("supervisor")} tone="bg-[#F8F0FF] border-[#E2C6FF] text-[#8A3FC2]" />
          <Tile label="Admin" value={count("admin")} tone="bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E]" />
          <Tile label="Nonaktif" value={inactive} tone="bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]" />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#7A6E65]">
          <span className="px-2.5 py-1 rounded-full bg-[#F7F3EB] border border-[#E6DFD2]">{assignments} relasi penugasan aktif</span>
          {pendingCashouts > 0 && <span className="px-2.5 py-1 rounded-full bg-[#FFF3C4] border border-[#FDE08D] text-[#8A6A00] font-extrabold">{pendingCashouts} pencairan menunggu</span>}
        </div>

        <nav aria-label="Bagian halaman Admin" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ADMIN_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#F7F3EB] hover:bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-xs font-display font-extrabold text-[#3D352E] cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </nav>
      </CozyCard>
    </MotionConfig>
  );
}

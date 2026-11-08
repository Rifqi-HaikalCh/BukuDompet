"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "@/components/illustrations/UiGlyphs";
import { GlyphIcon, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { PersonaDisc, personaVariantFromId } from "@/components/illustrations/PersonaAvatars";
import { FloatingRewardBanner } from "@/components/ui/CozyPrimitives";
import { useSafeLogout } from "@/components/ui/SafeLogout";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { GamificationFX } from "@/components/ui/GamificationFX";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { soundEffects } from "@/lib/sound-effects";
import { useCozyBgm } from "@/lib/cozy-bgm";
import { cn } from "@/lib/utils";

/**
 * Kerangka bersama halaman Supervisor (Versi 5.2): menu tidak lagi menumpuk di atas.
 * - Desktop (≥ 768px): sidebar kiri yang menempel — identitas, 3 menu vertikal, lalu aksi (musik, layar user, admin, keluar).
 * - Mobile: header tipis (logo + judul halaman + aksi ikon) dan bilah menu bawah yang mudah dijangkau jempol.
 * Tiga halaman terpisah: Pilih Anak → Pemantauan → Beranda Keluarga.
 */
export type SupervisorSection = "pilih" | "monitor" | "keluarga";

const NAV: readonly { id: SupervisorSection; href: string; label: string; short: string; hint: string; icon: GlyphName }[] = [
  { id: "pilih", href: "/supervisor/pilih", label: "Pilih Anak", short: "Anak", hint: "Pilih anak yang dipantau", icon: "users" },
  { id: "monitor", href: "/supervisor", label: "Pemantauan", short: "Pantau", hint: "Catatan, cerita, dan arcade anak", icon: "shield_check" },
  { id: "keluarga", href: "/supervisor/keluarga", label: "Beranda Keluarga", short: "Keluarga", hint: "Kabar, peringkat, dan obrolan", icon: "house" },
];

const SIDE_BTN =
  "w-full px-3 py-2 rounded-xl bg-[#F7F3EB] hover:bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-2 text-[#3D352E] cursor-pointer";
const TOP_BTN =
  "w-9 h-9 rounded-xl bg-[#F7F3EB] hover:bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] flex items-center justify-center text-[#3D352E] cursor-pointer";

export function SupervisorShell({
  active,
  children,
  mainClassName,
}: {
  active: SupervisorSection;
  children: React.ReactNode;
  mainClassName?: string;
}) {
  const { isPlaying: isBgmPlaying, toggleBgm } = useCozyBgm();
  const profiles = useBukuDompetStore((s) => s.profiles);
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const safeLogout = useSafeLogout();
  const [confirmExitOpen, setConfirmExitOpen] = useState<boolean>(false);

  const supervisorProfiles = useMemo(() => profiles.filter((p) => p.role === "supervisor"), [profiles]);
  const activeSupervisor = supervisorProfiles.find((p) => p.id === activeProfileId) || supervisorProfiles[0] || profiles[0];
  const activeNav = NAV.find((n) => n.id === active) ?? NAV[0];

  const askExit = () => {
    soundEffects.tactileClick();
    setConfirmExitOpen(true);
  };
  const toggleMusic = () => {
    soundEffects.tactileClick();
    toggleBgm();
  };

  return (
    <div className="min-h-screen text-[#3D352E] pb-28 md:pb-10 md:flex">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />

      {safeLogout.overlay}
      <CozyConfirmModal
        open={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        onConfirm={() => {
          void safeLogout.run();
        }}
        title="Keluar ke Halaman Login?"
        description="Anda akan kembali ke halaman Login Kredensial untuk beralih akun."
        confirmLabel="Ya, Ke Halaman Login"
        confirmVariant="peach"
        mochiStage={3}
      />

      {/* ───────── Desktop: sidebar kiri ───────── */}
      <aside
        aria-label="Menu Supervisor"
        className="hidden md:flex md:flex-col md:w-64 lg:w-72 shrink-0 sticky top-0 h-screen overflow-y-auto bg-[#FFFDF9]/95 border-r-2 border-[#E6DFD2] p-4 gap-4"
      >
        <BukuDompetLogo variant="full" size="sm" className="h-10 w-auto self-start" />

        <div className="rounded-2xl bg-[#F8F0FF] border-2 border-[#E2C6FF] p-3 flex items-center gap-2.5 min-w-0">
          <PersonaDisc role="supervisor" variant={personaVariantFromId(activeSupervisor.id)} size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-display font-extrabold uppercase tracking-wider text-[#8A3FC2]">Supervisor</p>
            <p className="font-display text-sm font-extrabold text-[#3D352E] truncate">{activeSupervisor.display_name}</p>
          </div>
        </div>

        <nav aria-label="Halaman Supervisor" className="flex flex-col gap-2">
          {NAV.map((n) => {
            const on = n.id === active;
            return (
              <Link
                key={n.id}
                href={n.href}
                aria-current={on ? "page" : undefined}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "rounded-2xl border-2 px-3 py-2.5 flex items-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E]",
                  on
                    ? "bg-[#38B6FF] border-[#1E88E5] border-b-[4px] text-[#0B2A44]"
                    : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-[#3D352E] hover:bg-white"
                )}
              >
                <GlyphIcon name={n.icon} size={26} />
                <span className="min-w-0">
                  <span className="block font-display text-sm font-extrabold leading-snug">{n.label}</span>
                  <span className={cn("block text-[11px] font-bold leading-snug", on ? "text-[#0B2A44]/80" : "text-[#7A6E65]")}>{n.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <button type="button" onClick={toggleMusic} className={cn(SIDE_BTN, isBgmPlaying && "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070] text-[#2E6F00]")} title="Nyalakan / Matikan Musik Latar Cozy">
            {isBgmPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[#7A6E65]" />}
            Musik: {isBgmPlaying ? "Nyala" : "Senyap"}
          </button>
          <button type="button" onClick={askExit} className={cn(SIDE_BTN, "bg-[#FFF2F0] border-[#FFCDC6] border-b-[#FFA89C]")}>
            <CozyIcon name="lock_cozy" size={16} /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* ───────── Mobile: header tipis ───────── */}
        <header className="md:hidden sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b-2 border-[#E6DFD2]">
          <div className="px-4 h-14 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <BukuDompetLogo variant="mark" size="sm" className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-sm font-extrabold leading-tight truncate">{activeNav.label}</p>
                <p className="text-[10px] font-bold text-[#7A6E65] leading-tight truncate">{activeSupervisor.display_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" onClick={toggleMusic} aria-label={isBgmPlaying ? "Matikan musik" : "Nyalakan musik"} className={cn(TOP_BTN, isBgmPlaying && "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]")}>
                {isBgmPlaying ? <Volume2 className="w-4 h-4 text-[#2E6F00]" /> : <VolumeX className="w-4 h-4 text-[#7A6E65]" />}
              </button>
              <button type="button" onClick={askExit} aria-label="Keluar" className={cn(TOP_BTN, "bg-[#FFF2F0] border-[#FFCDC6] border-b-[#FFA89C]")}>
                <CozyIcon name="lock_cozy" size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className={cn("max-w-5xl mx-auto px-4 sm:px-6 pt-5 md:pt-8 space-y-6 min-w-0 max-w-full overflow-hidden", mainClassName)}>{children}</main>
      </div>

      {/* ───────── Mobile: bilah menu bawah ───────── */}
      <nav aria-label="Halaman Supervisor (bawah)" className="md:hidden fixed bottom-3 left-2 right-2 z-40 max-w-lg mx-auto">
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-3xl bg-[#FFFDF9]/97 border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] shadow-lg">
          {NAV.map((n) => {
            const on = n.id === active;
            return (
              <Link
                key={n.id}
                href={n.href}
                aria-current={on ? "page" : undefined}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "py-2 rounded-2xl font-display text-[11px] font-extrabold flex flex-col items-center gap-0.5 leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E]",
                  on ? "bg-[#38B6FF] text-[#0B2A44] border-b-[3px] border-b-[#1E88E5]" : "text-[#3D352E] hover:bg-[#F7F3EB]"
                )}
              >
                <GlyphIcon name={n.icon} size={24} />
                <span>{n.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

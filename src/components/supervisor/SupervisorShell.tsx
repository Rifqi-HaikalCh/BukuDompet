"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX } from "@/components/illustrations/UiGlyphs";
import { GlyphIcon, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { PersonaDisc, personaVariantFromId } from "@/components/illustrations/PersonaAvatars";
import { FloatingRewardBanner } from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { GamificationFX } from "@/components/ui/GamificationFX";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { soundEffects } from "@/lib/sound-effects";
import { useCozyBgm } from "@/lib/cozy-bgm";
import { cn } from "@/lib/utils";

/**
 * Kerangka bersama halaman Supervisor (Versi 5.1): header, pengalih akun, dan navigasi 3 halaman terpisah:
 * Pilih Anak → Pemantauan → Beranda Keluarga.
 */
export type SupervisorSection = "pilih" | "monitor" | "keluarga";

const NAV: readonly { id: SupervisorSection; href: string; label: string; short: string; icon: GlyphName }[] = [
  { id: "pilih", href: "/supervisor/pilih", label: "Pilih Anak", short: "Anak", icon: "users" },
  { id: "monitor", href: "/supervisor", label: "Pemantauan", short: "Pantau", icon: "eye" },
  { id: "keluarga", href: "/supervisor/keluarga", label: "Beranda Keluarga", short: "Keluarga", icon: "house" },
];

export function SupervisorShell({
  active,
  children,
  mainClassName,
}: {
  active: SupervisorSection;
  children: React.ReactNode;
  mainClassName?: string;
}) {
  const router = useRouter();
  const { isPlaying: isBgmPlaying, toggleBgm } = useCozyBgm();
  const profiles = useBukuDompetStore((s) => s.profiles);
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const monitoredUserId = useBukuDompetStore((s) => s.monitoredUserId);
  const switchRoleDirect = useBukuDompetStore((s) => s.switchRoleDirect);
  const logout = useBukuDompetStore((s) => s.logout);
  const [confirmExitOpen, setConfirmExitOpen] = useState<boolean>(false);

  const supervisorProfiles = useMemo(() => profiles.filter((p) => p.role === "supervisor"), [profiles]);
  const activeSupervisor = supervisorProfiles.find((p) => p.id === activeProfileId) || supervisorProfiles[0] || profiles[0];
  const inspected = profiles.find((p) => p.id === monitoredUserId) || profiles.find((p) => p.role === "user" || p.role === "schoolchild") || profiles[0];

  return (
    <div className="min-h-screen text-[#3D352E] pb-16">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />

      <CozyConfirmModal
        open={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        onConfirm={() => {
          logout();
          router.push("/login");
        }}
        title="Keluar ke Halaman Login?"
        description="Anda akan kembali ke halaman Login Kredensial untuk beralih akun."
        confirmLabel="Ya, Ke Halaman Login"
        confirmVariant="peach"
        mochiStage={3}
      />

      <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <BukuDompetLogo variant="mark" size="sm" className="sm:hidden w-10 h-10 shrink-0" />
            <BukuDompetLogo variant="full" size="sm" className="hidden sm:block h-10 w-auto shrink-0" />
            <div className="hidden md:flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold truncate">
              <PersonaDisc role="supervisor" variant={personaVariantFromId(activeSupervisor.id)} size={26} />
              <span>Supervisor:</span>
              <select
                value={activeSupervisor.id}
                onChange={(e) => {
                  soundEffects.tactileClick();
                  switchRoleDirect("supervisor", e.target.value);
                  router.push("/supervisor/pilih");
                }}
                className="bg-transparent font-display font-extrabold text-[#3D352E] focus:outline-none cursor-pointer"
                title="Ganti Akun Supervisor Aktif"
              >
                {supervisorProfiles.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.display_name} (@{sup.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                toggleBgm();
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border-2 border-b-[3px] text-xs font-display font-extrabold flex items-center gap-1.5 cursor-pointer transition-all",
                isBgmPlaying
                  ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070] text-[#2E6F00]"
                  : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65]"
              )}
              title="Nyalakan / Matikan Musik Latar Cozy"
            >
              {isBgmPlaying ? <Volume2 className="w-4 h-4 text-[#2E6F00]" /> : <VolumeX className="w-4 h-4 text-[#7A6E65]" />}
              <span className="hidden sm:inline">Musik: {isBgmPlaying ? "Nyala" : "Senyap"}</span>
            </button>

            <Link
              href="/app"
              onClick={() => {
                soundEffects.tactileClick();
                switchRoleDirect(inspected.role, inspected.id);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] hover:bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-1.5 text-[#3D352E]"
            >
              <CozyIcon name="home_path" size={16} />
              <span className="hidden sm:inline">Layar User</span>
            </Link>
            <Link
              href="/admin"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] hover:bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-1.5 text-[#3D352E]"
            >
              <CozyIcon name="crown_sultan" size={16} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setConfirmExitOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FFF2F0] hover:bg-[#FF8B7B]/30 border-2 border-[#FFCDC6] border-b-[3px] border-b-[#FFA89C] text-xs font-display font-extrabold flex items-center gap-1 cursor-pointer text-[#3D352E]"
            >
              <CozyIcon name="lock_cozy" size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        <nav aria-label="Halaman Supervisor" className="max-w-5xl mx-auto px-4 sm:px-6 pb-2.5 grid grid-cols-3 gap-1.5">
          {NAV.map((n) => {
            const on = n.id === active;
            return (
              <Link
                key={n.id}
                href={n.href}
                aria-current={on ? "page" : undefined}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "py-2 px-1.5 rounded-xl border-2 font-display text-[11px] sm:text-sm font-extrabold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-center leading-tight transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E]",
                  on
                    ? "bg-[#38B6FF] border-[#1E88E5] border-b-[3px] text-[#3D352E]"
                    : "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-white"
                )}
              >
                <GlyphIcon name={n.icon} size={20} />
                <span>
                  <span className="sm:hidden">{n.short}</span>
                  <span className="hidden sm:inline">{n.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={cn("max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6 min-w-0 max-w-full overflow-hidden", mainClassName)}>{children}</main>
    </div>
  );
}

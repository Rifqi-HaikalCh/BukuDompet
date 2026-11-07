"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import {
  MochiCompanion,
  MOCHI_STAGE_NAMES,
} from "@/components/illustrations/MochiCompanion";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import {
  CozyIcon,
  type IconName,
} from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  RollingNumber,
  FloatingRewardBanner,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { GamificationFX } from "@/components/ui/GamificationFX";
import { TransactionDrawer } from "@/components/user/TransactionDrawer";
import { PointCashoutModal } from "@/components/user/PointCashoutModal";
import { StreakCalendarModal } from "@/components/user/StreakCalendarModal";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  href: string;
  label: string;
  shortLabel: string;
  iconName: IconName;
}[] = [
  {
    href: "/app",
    label: "Jalur Kas",
    shortLabel: "Beranda",
    iconName: "home_path",
  },
  {
    href: "/app/missions",
    label: "Misi & Gacha",
    shortLabel: "Misi",
    iconName: "missions_scroll",
  },
  {
    href: "/app/pets",
    label: "Galeri Mochi",
    shortLabel: "Mochi",
    iconName: "pet_paw",
  },
  {
    href: "/app/detective",
    label: "Detektif Kas",
    shortLabel: "Detektif",
    iconName: "detective_radar",
  },
  {
    href: "/app/rewards",
    label: "Koleksi & Poin",
    shortLabel: "Poin",
    iconName: "rewards_ticket",
  },
];

export function UserAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    profiles,
    transactions,
    missions,
    equippedMochiStage,
    equippedTitle,
    isProudComboActive,
    isSandboxMode,
    particleBurstKey,
    setTransactionDrawerOpen,
    setCashoutModalOpen,
    setStreakCalendarOpen,
  } = useBukuDompetStore();

  const [confirmExitOpen, setConfirmExitOpen] = useState<boolean>(false);
  const [hudPulse, setHudPulse] = useState<boolean>(false);

  useEffect(() => {
    if (particleBurstKey <= 0) return;
    const t1 = setTimeout(() => setHudPulse(true), 520);
    const t2 = setTimeout(() => setHudPulse(false), 1050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [particleBurstKey]);

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];

  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = analyzeSpendingDetective({
    transactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    isProudComboActive,
  });

  const displayStage = equippedMochiStage || report.mochiStage;

  const unclaimedMissionsCount = missions.filter(
    (m) => !m.is_claimed && m.current_value >= m.target_value
  ).length;

  return (
    <div className="min-h-screen text-[#3D352E] pb-28 lg:pb-12">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />
      <TransactionDrawer />
      <PointCashoutModal />
      <StreakCalendarModal />

      <CozyConfirmModal
        open={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        onConfirm={() => router.push("/login")}
        title="Ganti Pintu Akun Keluarga?"
        description="Kamu akan kembali ke halaman Pintu PIN untuk beralih antara akun Adik (User), Orang Tua (Supervisor), atau Abang (Admin)."
        confirmLabel="Ya, Ke Pintu PIN"
        confirmVariant="honey"
        mochiStage={displayStage}
        badgeText="Pindah Pintu Role"
      />

      {/* Top Sticky HUD (Pure Duolingo × Finch Soft Self-Shaded Lip) */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/92 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-[1240px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link
            href="/app"
            onClick={() => soundEffects.tactileClick()}
            className="flex items-center gap-2 group"
          >
            <BukuDompetLogo
              variant="mark"
              size="sm"
              className="sm:hidden w-10 h-10"
            />
            <BukuDompetLogo
              variant="full"
              size="sm"
              className="hidden sm:block h-10 w-auto"
            />
          </Link>

          {/* Top Sticky HUD Pills: Streak (Calendar Trigger), Point Wallet, Level & XP */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {isSandboxMode && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-[#F8F0FF] border-2 border-[#E2C6FF] border-b-[4px] border-b-[#C99BFF] text-xs font-display font-extrabold text-[#3D352E]">
                <CozyIcon name="combo_sparkle" size={18} />
                Mode Simulasi
              </span>
            )}

            {/* Streak Pill -> Opens Interactive Streak Calendar Modal */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setStreakCalendarOpen(true);
              }}
              title="Buka Kalender Streak & Rekap 3 Waktu"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#FFFBEB] hover:bg-[#FFF5D1] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CozyIcon name="flame_streak" size={22} animated />
              <span className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#3D352E]">
                {userProfile.current_streak}
              </span>
              <span className="hidden md:inline text-xs font-bold text-[#7A6E65]">
                Hari
              </span>
            </button>

            {/* Point Wallet Pill (1 Poin = Rp1) -> Opens Cashout Modal */}
            <motion.button
              type="button"
              animate={
                hudPulse ? { scale: [1, 1.18, 1] } : { scale: 1 }
              }
              transition={{ duration: 0.35 }}
              onClick={() => {
                soundEffects.tactileClick();
                setCashoutModalOpen(true);
              }}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#FFC800] hover:bg-[#FFD22B] border-0 border-b-[4px] border-b-[#E5A400] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CozyIcon name="coin_rupiah" size={22} />
              <RollingNumber
                value={userProfile.points_balance}
                prefix="Rp"
                className="text-xs sm:text-sm text-[#3D352E]"
              />
            </motion.button>

            {/* Level & XP Pill -> Links to Pet Gallery */}
            <motion.div
              animate={
                hudPulse ? { scale: [1, 1.16, 1] } : { scale: 1 }
              }
              transition={{ duration: 0.35 }}
            >
              <Link
                href="/app/pets"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#EEF8FF] hover:bg-[#DEF2FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF] flex items-center gap-1.5 transition-all"
              >
                <CozyIcon name="xp_star" size={20} />
                <span className="font-display text-xs sm:text-sm font-extrabold text-[#3D352E]">
                  Lv.{levelInfo.level}
                </span>
              </Link>
            </motion.div>

            {/* Quick Role / Pintu Exit with Confirmation */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setConfirmExitOpen(true);
              }}
              title="Pindah Pintu Role (Adik / Orang Tua / Abang)"
              className="px-2.5 py-1.5 rounded-2xl bg-white hover:bg-[#FFF2F0] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px] transition-all cursor-pointer flex items-center gap-1 text-xs font-display font-extrabold text-[#7A6E65]"
            >
              <CozyIcon name="lock_cozy" size={18} />
              <span className="hidden xl:inline">Pintu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Responsive 3-Column Cozy Bento Layout on Desktop (>=1024px) */}
      <div className="max-w-[1240px] mx-auto px-3 sm:px-6 pt-5 lg:grid lg:grid-cols-[260px_minmax(0,540px)_360px] lg:justify-between lg:gap-6 items-start">
        {/* LEFT SIDEBAR (260px on Desktop) */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
          <CozyCard tone="vanilla" className="p-3.5 space-y-2">
            <p className="px-2 text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Menu Petualangan
            </p>
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => soundEffects.tactileClick()}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-display text-sm font-extrabold transition-all",
                      active
                        ? "bg-[#58CC02] text-white border-b-[4px] border-b-[#46A302]"
                        : "text-[#3D352E] hover:bg-white"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <CozyIcon name={item.iconName} size={22} />
                      {item.label}
                    </span>
                    {item.href === "/app/missions" &&
                      unclaimedMissionsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FFC800] text-[#3D352E] font-display tabular-nums text-[11px] font-extrabold">
                          {unclaimedMissionsCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2">
              <TactileButton
                variant="matcha"
                size="md"
                fullWidth
                onClick={() => setTransactionDrawerOpen(true)}
              >
                <CozyIcon name="plus_record" size={22} />
                Catat Kas Sekarang
              </TactileButton>
            </div>
          </CozyCard>

          {/* Interactive Streak Calendar Trigger Widget */}
          <CozyCard tone="white" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-extrabold flex items-center gap-1.5">
                <CozyIcon name="calendar_streak" size={22} />
                Kalender Streak
              </span>
              <span className="text-xs font-display font-extrabold px-2.5 py-0.5 rounded-xl bg-[#EEF8FF] border border-[#BCE3FF] inline-flex items-center gap-1">
                <CozyIcon name="ice_shield" size={16} />
                {userProfile.streak_freeze_count}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "S", "R", "K", "J", "S", "M"].map((d, idx) => {
                const isDone = idx < 6;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "py-1.5 rounded-xl text-[11px] font-display font-extrabold border",
                      isDone
                        ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[3px] border-b-[#F5C84C] text-[#3D352E]"
                        : "bg-[#F9F4EA] border-[#E6DFD2] text-[#7A6E65]"
                    )}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <TactileButton
              variant="honey"
              size="sm"
              fullWidth
              onClick={() => setStreakCalendarOpen(true)}
            >
              <CozyIcon name="calendar_streak" size={18} />
              Buka Kalender & Rekap Kas
            </TactileButton>
          </CozyCard>

          {/* Role Switcher Shortcut */}
          <CozyCard tone="vanilla" className="p-3.5 space-y-2">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Pintu Keluarga (Demo Cepat)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/supervisor"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-2 rounded-xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#FFFBEB]"
              >
                <CozyIcon name="parent_heart" size={18} /> Orang Tua
              </Link>
              <Link
                href="/admin"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-2 rounded-xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 hover:bg-[#EEF8FF]"
              >
                <CozyIcon name="crown_sultan" size={18} /> Abang Admin
              </Link>
            </div>
          </CozyCard>
        </aside>

        {/* CENTER STAGE (Max 540px on Desktop, Full on Mobile) */}
        <main className="w-full max-w-[540px] mx-auto space-y-5">
          {children}
        </main>

        {/* RIGHT COMPANION & DETECTIVE PANEL (360px on Desktop) */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
          {/* Interactive Virtual Companion Room */}
          <CozyCard tone="white" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#A552DB]">
                  {equippedTitle} • Lv.{levelInfo.level}
                </span>
                <h3 className="font-display text-lg font-extrabold text-[#3D352E]">
                  {MOCHI_STAGE_NAMES[displayStage]}
                </h3>
              </div>
              <Link
                href="/app/pets"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-1 rounded-xl bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#A552DB] flex items-center gap-1 hover:bg-[#E2C6FF]/40"
              >
                <CozyIcon name="pet_paw" size={16} /> Galeri
              </Link>
            </div>

            <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E6DFD2] p-2 flex flex-col items-center">
              <MochiCompanion
                stage={displayStage}
                mood={report.mochiMood}
                className="w-48 h-48"
              />
              <div className="w-full bg-[#FFFBEB] border-2 border-[#FDE08D] rounded-2xl p-2.5 text-xs font-bold text-[#3D352E] mt-1">
                &ldquo;{report.mochiSpeech}&rdquo;
              </div>
            </div>

            <ChunkyProgressBar
              value={levelInfo.currentLevelXp}
              max={levelInfo.nextLevelXp}
              variant="sky"
              label={`Progres Evolusi Lv.${levelInfo.level + 1}`}
              showFraction
            />
          </CozyCard>

          {/* Spending Detective Radar Mini Card */}
          <CozyCard
            tone={
              report.statusColor === "matcha"
                ? "matcha"
                : report.statusColor === "honey"
                ? "honey"
                : report.statusColor === "berry"
                ? "berry"
                : "sky"
            }
            className="p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-extrabold flex items-center gap-1.5">
                <CozyIcon name="detective_radar" size={22} /> Radar Detektif Kas
              </span>
              <span className="font-display tabular-nums text-xs font-extrabold px-2 py-0.5 rounded-lg bg-white border border-[#E6DFD2]">
                DOI: {report.doi}x
              </span>
            </div>
            <p className="text-xs font-extrabold text-[#3D352E]">
              {report.statusTitle}
            </p>
            <p className="text-xs font-bold text-[#7A6E65]">
              {report.statusDescription}
            </p>
            {report.microLeaks.length > 0 && (
              <div className="bg-white/90 rounded-2xl border border-[#E6DFD2] p-2.5 text-xs font-bold text-[#3D352E]">
                {report.microLeaks[0].message}
              </div>
            )}
          </CozyCard>

          {/* Point Cashout Ticket Widget */}
          <CozyCard tone="honey" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#7A6E65]">
                  Tiket Tukar Poin (1 Poin = Rp1)
                </p>
                <p className="font-display text-xl font-extrabold tabular-nums text-[#3D352E]">
                  {formatRupiah(userProfile.points_balance)}
                </p>
              </div>
              <CozyIcon name="rewards_ticket" size={34} />
            </div>
            <TactileButton
              variant="cream"
              size="sm"
              fullWidth
              onClick={() => setCashoutModalOpen(true)}
            >
              <CozyIcon name="rewards_ticket" size={18} />
              Cairkan Poin Jadi Uang Saku
            </TactileButton>
          </CozyCard>
        </aside>
      </div>

      {/* Floating Chunky Bottom Navigation Bar on Mobile (< 1024px) */}
      <nav className="lg:hidden fixed bottom-3 left-2.5 right-2.5 z-40 max-w-lg mx-auto">
        <div className="bg-white/95 backdrop-blur-md border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] rounded-3xl px-2 py-1.5 grid grid-cols-6 items-center gap-1 shadow-lg">
          {NAV_ITEMS.slice(0, 3).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-2xl text-[10px] font-display font-extrabold transition-all relative",
                  active
                    ? "bg-[#EFFBE6] text-[#3D352E] border border-[#C3EFA4] border-b-[3px] border-b-[#9EE070]"
                    : "text-[#7A6E65]"
                )}
              >
                <CozyIcon name={item.iconName} size={22} />
                <span className="truncate mt-0.5">{item.shortLabel}</span>
                {item.href === "/app/missions" && unclaimedMissionsCount > 0 && (
                  <span className="absolute -top-1 right-1.5 w-4 h-4 rounded-full bg-[#FFC800] text-[9px] font-display font-extrabold flex items-center justify-center text-[#3D352E]">
                    {unclaimedMissionsCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Central Oversized + Catat 3D Button */}
          <div className="flex justify-center -mt-6">
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setTransactionDrawerOpen(true);
              }}
              className="w-13 h-13 rounded-2xl bg-[#58CC02] hover:bg-[#61DC06] text-white border-0 border-b-[5px] border-b-[#46A302] active:border-b-[2px] active:translate-y-[3px] flex flex-col items-center justify-center cursor-pointer transition-all shadow-md"
            >
              <CozyIcon name="plus_record" size={26} />
              <span className="text-[9px] font-display font-extrabold leading-none mt-0.5">
                Catat
              </span>
            </button>
          </div>

          {NAV_ITEMS.slice(3, 5).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-2xl text-[10px] font-display font-extrabold transition-all",
                  active
                    ? "bg-[#EFFBE6] text-[#3D352E] border border-[#C3EFA4] border-b-[3px] border-b-[#9EE070]"
                    : "text-[#7A6E65]"
                )}
              >
                <CozyIcon name={item.iconName} size={22} />
                <span className="truncate mt-0.5">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

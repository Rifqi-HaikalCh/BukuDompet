"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  GROWTH_STAGE_TARGETS,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  GROWTH_STAGE_META,
  getSpeciesInfo,
} from "@/components/illustrations/PetAvatarSystem";
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
import { AccessoryDropModal } from "@/components/user/AccessoryDropModal";
import { soundEffects } from "@/lib/sound-effects";
import { useCozyBgm } from "@/lib/cozy-bgm";
import { cn } from "@/lib/utils";

/**
 * TUGAS 6.1: Konsolidasi Navigasi — Shop terintegrasi ke dalam "Pet & Butik" (/app/pets)
 */
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
    label: "Misi Harian",
    shortLabel: "Misi",
    iconName: "missions_scroll",
  },
  {
    href: "/app/pets",
    label: "Dunia Pet & Butik",
    shortLabel: "Pet & Butik",
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
    label: "Koleksi & Hadiah",
    shortLabel: "Hadiah",
    iconName: "rewards_ticket",
  },
];

export function UserAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPlaying: isBgmPlaying, toggleBgm } = useCozyBgm();

  const {
    currentRole,
    activeProfileId,
    monitoredUserId,
    profiles,
    transactions,
    missions,
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
    (currentRole === "user"
      ? profiles.find((p) => p.id === activeProfileId && p.role === "user")
      : profiles.find((p) => p.id === monitoredUserId && p.role === "user")) ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const userTransactions = transactions.filter(
    (t) => t.user_id === userProfile.id
  );
  const userMissions = missions.filter((m) => m.user_id === userProfile.id);

  const activeSpecies = userProfile.activeSpecies || "chubby_cat";
  const speciesInfo = getSpeciesInfo(activeSpecies);
  const levelInfo = getLevelFromXp(userProfile.xp);
  const currentStage = userProfile.currentStage || 1;
  const stageMeta = GROWTH_STAGE_META[currentStage] || GROWTH_STAGE_META[1];
  const stageTarget = GROWTH_STAGE_TARGETS[currentStage];
  const petName = userProfile.petCustomName || speciesInfo.defaultName;

  const report = analyzeSpendingDetective({
    transactions: userTransactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    currentStage,
    petCustomName: petName,
    isProudComboActive,
  });

  const unclaimedMissionsCount = userMissions.filter(
    (m) => !m.is_claimed && m.current_value >= m.target_value
  ).length;

  const isPetsPage =
    pathname === "/app/pets" || pathname?.startsWith("/app/shop");

  return (
    <div className="min-h-screen text-[#3D352E] pb-28 lg:pb-12 overflow-x-hidden">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />
      <TransactionDrawer />
      <PointCashoutModal />
      <StreakCalendarModal />
      <AccessoryDropModal />

      <CozyConfirmModal
        open={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        onConfirm={() => router.push("/login")}
        title="Keluar & Ganti Akun?"
        description="Kamu akan kembali ke halaman Login Kredensial untuk beralih antara akun User, Supervisor, atau Admin."
        confirmLabel="Ya, Ke Halaman Login"
        confirmVariant="peach"
        mochiStage={report.mochiStage}
        badgeText="Ganti Akun BukuDompet"
      />

      {/* Top Sticky HUD */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/92 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-[1240px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          {/* Brand Logo */}
          <Link
            href="/app"
            onClick={() => soundEffects.tactileClick()}
            className="flex items-center gap-2 group shrink-0"
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

          {/* Active User Indicator + Sticky HUD Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E]">
              @{userProfile.username} • {petName}
            </span>

            {isSandboxMode && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold text-[#3D352E] shrink-0">
                <CozyIcon name="combo_sparkle" size={18} />
                Simulasi
              </span>
            )}

            {/* TUGAS 7: Cozy BGM Toggle Button */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                toggleBgm();
              }}
              title={
                isBgmPlaying
                  ? "Matikan Musik Latar Cozy"
                  : "Nyalakan Musik Latar Cozy (Kalimba & Piano)"
              }
              className={cn(
                "px-2.5 sm:px-3 py-1.5 rounded-2xl border-2 border-b-[4px] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 font-display text-xs font-extrabold",
                isBgmPlaying
                  ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070] text-[#2E6F00]"
                  : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65]"
              )}
            >
              {isBgmPlaying ? (
                <Volume2 className="w-4 h-4 text-[#58CC02]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#7A6E65]" />
              )}
              <span className="hidden md:inline">
                {isBgmPlaying ? "🎵 Musik: Nyala" : "🎵 Musik: Senyap"}
              </span>
            </button>

            {/* Streak Pill -> Opens Interactive Streak Calendar Modal */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setStreakCalendarOpen(true);
              }}
              title="Buka Kalender Streak & Rekap Kas"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#FFFBEB] hover:bg-[#FFF5D1] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CozyIcon name="flame_streak" size={22} animated />
              <span className="font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#4A3500]">
                {userProfile.current_streak}
              </span>
              <span className="hidden md:inline text-xs font-bold text-[#7A6E65]">
                Hari
              </span>
            </button>

            {/* Point Wallet Pill (1 Poin = Rp1) -> Opens Cashout Modal */}
            <motion.button
              type="button"
              animate={hudPulse ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              onClick={() => {
                soundEffects.tactileClick();
                setCashoutModalOpen(true);
              }}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#FFC800] hover:bg-[#FFD22B] border-0 border-b-[4px] border-b-[#E5A400] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CozyIcon name="coin_rupiah" size={20} />
              <RollingNumber
                value={userProfile.points_balance}
                suffix=" Poin"
                className="text-xs sm:text-sm text-[#4A3500]"
              />
            </motion.button>

            {/* Growth Stage Pill -> Links to Pet & Butik */}
            <motion.div
              animate={hudPulse ? { scale: [1, 1.16, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              className="hidden sm:block shrink-0"
            >
              <Link
                href="/app/pets"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#EEF8FF] hover:bg-[#DEF2FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF] flex items-center gap-1.5 transition-all"
              >
                <CozyIcon name="xp_star" size={20} />
                <span className="font-display text-xs sm:text-sm font-extrabold text-[#1565C0]">
                  Fase {currentStage}/8
                </span>
              </Link>
            </motion.div>

            {/* Quick Exit with Confirmation */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setConfirmExitOpen(true);
              }}
              title="Ganti Akun / Keluar ke Login"
              className="px-2.5 py-1.5 rounded-2xl bg-[#F7F3EB] hover:bg-[#FFEAE6] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px] transition-all cursor-pointer flex items-center gap-1 text-xs font-display font-extrabold text-[#3D352E] shrink-0"
            >
              <CozyIcon name="lock_cozy" size={18} />
              <span className="hidden xl:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Cozy Bento Layout on Desktop (>=1024px) */}
      <div
        className={cn(
          "max-w-[1240px] mx-auto px-3 sm:px-6 pt-5 lg:grid lg:justify-between lg:gap-6 items-start",
          isPetsPage
            ? "lg:grid-cols-[250px_minmax(0,1fr)]"
            : "lg:grid-cols-[260px_minmax(0,540px)_360px]"
        )}
      >
        {/* LEFT SIDEBAR (260px on Desktop) */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20 min-w-0 max-w-full overflow-hidden">
          <CozyCard tone="white" className="p-3.5 space-y-2">
            <p className="px-2 text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Menu Petualangan
            </p>
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/app/pets" &&
                    pathname?.startsWith("/app/shop"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => soundEffects.tactileClick()}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-display text-sm font-extrabold transition-all min-w-0",
                      active
                        ? "bg-[#38B6FF] text-white border-b-[4px] border-b-[#1E88E5]"
                        : "text-[#3D352E] hover:bg-[#F7F3EB]"
                    )}
                  >
                    <span className="flex items-center gap-2.5 leading-snug break-words">
                      <CozyIcon name={item.iconName} size={22} />
                      <span>{item.label}</span>
                    </span>
                    {item.href === "/app/missions" &&
                      unclaimedMissionsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FFC800] text-[#4A3500] font-display tabular-nums text-[11px] font-extrabold shrink-0">
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
                + Catat Kas Sekarang
              </TactileButton>
            </div>
          </CozyCard>

          {/* Interactive Streak Calendar Trigger Widget */}
          <CozyCard tone="white" className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="font-display text-sm font-extrabold flex items-center gap-1.5">
                <CozyIcon name="calendar_streak" size={22} />
                <span>Kalender Streak</span>
              </span>
              <span className="text-xs font-display font-extrabold px-2.5 py-0.5 rounded-xl bg-[#E3F4FF] border border-[#9AD2FF] text-[#1565C0] inline-flex items-center gap-1 shrink-0">
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
                        ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[3px] border-b-[#F5C84C] text-[#4A3500]"
                        : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]"
                    )}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <TactileButton
              variant="cream"
              size="sm"
              fullWidth
              onClick={() => setStreakCalendarOpen(true)}
            >
              <CozyIcon name="calendar_streak" size={18} />
              Buka Kalender & Rekap Kas
            </TactileButton>
          </CozyCard>

          {/* Role Switcher Shortcut */}
          <CozyCard tone="white" className="p-3.5 space-y-2">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Pintu Keluarga (Demo Cepat)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/supervisor"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-2 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 hover:bg-white text-[#3D352E]"
              >
                <CozyIcon name="parent_heart" size={18} /> Supervisor
              </Link>
              <Link
                href="/admin"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-2 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 hover:bg-white text-[#3D352E]"
              >
                <CozyIcon name="crown_sultan" size={18} /> Admin
              </Link>
            </div>
          </CozyCard>
        </aside>

        {/* CENTER STAGE */}
        <main
          className={cn(
            "w-full mx-auto space-y-5 min-w-0",
            isPetsPage ? "max-w-full" : "max-w-[540px]"
          )}
        >
          {children}
        </main>

        {/* RIGHT COMPANION & DETECTIVE PANEL (360px on Desktop, hidden on /app/pets because /app/pets has its own Split-View) */}
        {!isPetsPage && (
          <aside className="hidden lg:flex flex-col gap-4 sticky top-20 min-w-0 max-w-full overflow-hidden">
            {/* Interactive Virtual Companion Room with 8-Stage Growth & Accessories */}
            <CozyCard tone="white" className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#A552DB] block leading-snug break-words">
                    {equippedTitle} • Fase {currentStage}/8
                  </span>
                  <h3 className="font-display text-lg font-extrabold text-[#3D352E] leading-snug break-words">
                    {petName} — {stageMeta.name}
                  </h3>
                </div>
                <Link
                  href="/app/pets?tab=shop"
                  onClick={() => soundEffects.tactileClick()}
                  className="px-2.5 py-1 rounded-xl bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#A552DB] flex items-center gap-1 hover:bg-[#E2C6FF]/40 shrink-0"
                >
                  <CozyIcon name="mystery_box" size={16} /> Butik
                </Link>
              </div>

              <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E6DFD2] p-2 flex flex-col items-center">
                <CustomizablePetAvatar
                  species={activeSpecies}
                  stage={currentStage}
                  mood={report.petMood}
                  customName={petName}
                  equippedAccessories={userProfile.equippedAccessories}
                  className="w-48 h-48"
                />
                <div className="w-full bg-[#F7F3EB] border border-[#E6DFD2] rounded-2xl p-2.5 text-xs font-bold text-[#3D352E] mt-1 leading-relaxed break-words">
                  &ldquo;{report.mochiSpeech}&rdquo;
                </div>
              </div>

              {currentStage < 8 ? (
                <div className="space-y-2">
                  <ChunkyProgressBar
                    value={userProfile.stageXp}
                    max={stageTarget.nextStageXpTarget}
                    variant="sky"
                    label={`Stage XP menuju Fase ${currentStage + 1}`}
                    showFraction
                  />
                  <ChunkyProgressBar
                    value={userProfile.stageRecordedDays}
                    max={stageTarget.nextStageDaysTarget}
                    variant="honey"
                    label={`Hari Mencatat di Fase Ini`}
                    showFraction
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] text-center text-xs font-display font-extrabold text-[#2E6F00]">
                  Fase Puncak Sepuh Bijaksana Tercapai! 👑
                </div>
              )}
            </CozyCard>

            {/* Spending Detective Radar Mini Card */}
            <CozyCard tone="white" className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="font-display text-base font-extrabold flex items-center gap-1.5 leading-snug break-words">
                  <CozyIcon name="detective_radar" size={22} />
                  <span>Radar Detektif {petName}</span>
                </span>
                <span
                  className={cn(
                    "font-display tabular-nums text-xs font-extrabold px-2 py-0.5 rounded-lg border shrink-0",
                    report.statusColor === "matcha"
                      ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                      : report.statusColor === "honey"
                      ? "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
                      : "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
                  )}
                >
                  DOI: {report.doi}x
                </span>
              </div>
              <p className="text-xs font-extrabold text-[#3D352E] leading-snug break-words">
                {report.statusTitle}
              </p>
              <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                {report.statusDescription}
              </p>
              {report.microLeaks.length > 0 && (
                <div className="bg-[#FFF2F0] rounded-2xl border border-[#FFCDC6] p-2.5 text-xs font-bold text-[#C83E2B] leading-relaxed break-words">
                  {report.microLeaks[0].message}
                </div>
              )}
            </CozyCard>

            {/* Point Cashout Ticket Widget (TUGAS 1: No Truncate on Point Balance) */}
            <CozyCard tone="white" className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex flex-col items-start gap-1 min-w-0">
                  <p className="text-xs font-extrabold text-[#7A6E65] leading-snug break-words">
                    Tiket Tukar Poin (1 Poin = Rp1)
                  </p>
                  <p className="font-display text-xl font-extrabold tabular-nums text-[#4A3500] break-words">
                    {userProfile.points_balance.toLocaleString("id-ID")} Poin
                  </p>
                  <span className="px-2 py-0.5 rounded-lg bg-[#EFFBE6] border border-[#C3EFA4] text-[10px] font-display font-extrabold text-[#2E6F00]">
                    Setara {formatRupiah(userProfile.points_balance)}
                  </span>
                </div>
                <CozyIcon name="rewards_ticket" size={34} className="shrink-0" />
              </div>
              <TactileButton
                variant="honey"
                size="sm"
                fullWidth
                onClick={() => setCashoutModalOpen(true)}
              >
                <CozyIcon name="rewards_ticket" size={18} />
                Cairkan Poin Jadi Uang Saku
              </TactileButton>
            </CozyCard>
          </aside>
        )}
      </div>

      {/* Floating Chunky Bottom Navigation Bar on Mobile (< 1024px) — 5 Main Destinations + Central + Catat */}
      <nav className="lg:hidden fixed bottom-3 left-2 right-2 z-40 max-w-lg mx-auto">
        <div className="bg-white/95 backdrop-blur-md border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] rounded-3xl px-1.5 py-1.5 grid grid-cols-6 items-center gap-0.5 shadow-lg">
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-2xl text-[9px] font-display font-extrabold transition-all relative min-w-0",
                  active
                    ? "bg-[#E3F4FF] text-[#1565C0] border border-[#9AD2FF] border-b-[3px] border-b-[#38B6FF]"
                    : "text-[#7A6E65]"
                )}
              >
                <CozyIcon name={item.iconName} size={20} />
                <span className="mt-0.5 text-center leading-tight px-0.5">
                  {item.shortLabel}
                </span>
                {item.href === "/app/missions" && unclaimedMissionsCount > 0 && (
                  <span className="absolute -top-1 right-1 w-4 h-4 rounded-full bg-[#FFC800] text-[9px] font-display font-extrabold flex items-center justify-center text-[#4A3500]">
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
              className="w-12 h-12 rounded-2xl bg-[#58CC02] hover:bg-[#61DC06] text-white border-0 border-b-[5px] border-b-[#46A302] active:border-b-[2px] active:translate-y-[3px] flex flex-col items-center justify-center cursor-pointer transition-all shadow-md"
            >
              <CozyIcon name="plus_record" size={24} />
              <span className="text-[8px] font-display font-extrabold leading-none mt-0.5">
                Catat
              </span>
            </button>
          </div>

          {NAV_ITEMS.slice(2, 5).map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/app/pets" && pathname?.startsWith("/app/shop"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "flex flex-col items-center justify-center py-1 rounded-2xl text-[9px] font-display font-extrabold transition-all min-w-0",
                  active
                    ? "bg-[#E3F4FF] text-[#1565C0] border border-[#9AD2FF] border-b-[3px] border-b-[#38B6FF]"
                    : "text-[#7A6E65]"
                )}
              >
                <CozyIcon name={item.iconName} size={20} />
                <span className="mt-0.5 text-center leading-tight px-0.5">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

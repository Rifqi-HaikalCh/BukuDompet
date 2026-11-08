"use client";

import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Snowflake } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  GROWTH_STAGE_TARGETS,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  GROWTH_STAGE_META,
  getSpeciesInfo,
  type PetMood,
} from "@/components/illustrations/PetAvatarSystem";
import {
  InspectorSakuOwl,
  ColdStreakOverlayBadge,
  type InspectorSakuMood,
} from "@/components/illustrations/DetectiveAndStoryAssets";
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
import { SavingsVaultModal } from "@/components/user/SavingsVaultModal";
import { StoryTimeModal } from "@/components/schoolchild/StoryTimeModal";
import { useQuestState } from "@/lib/use-quest-state";
import { localDateStr } from "@/lib/dates";
import { soundEffects } from "@/lib/sound-effects";
import { useCozyBgm } from "@/lib/cozy-bgm";
import { totalShieldsFor } from "@/lib/streak-shields";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  iconName: IconName;
}

/**
 * Versi 5.0: navigasi dikonsolidasi.
 * - Beranda Keluarga (/app), Jalur Kas / Jalur Cerita (/app/journey, termasuk Detektif Kas),
 * - Misi, Medali & Hadiah (/app/quests, gabungan Misi + Hadiah), Dunia Pet & Butik (/app/pets).
 * Rute lama (/app/missions, /app/rewards, /app/detective, /app/shop) tetap ada sebagai pengalihan lembut.
 */
function getNavItems(isKid: boolean): NavItem[] {
  return [
    { href: "/app", label: "Beranda Keluarga", shortLabel: "Beranda", iconName: "parent_heart" },
    {
      href: "/app/journey",
      label: isKid ? "Jalur Cerita" : "Jalur Kas",
      shortLabel: isKid ? "Cerita" : "Jalur",
      iconName: "home_path",
    },
    { href: "/app/quests", label: "Misi, Medali & Hadiah", shortLabel: "Misi", iconName: "missions_scroll" },
    { href: "/app/pets", label: "Dunia Pet & Butik", shortLabel: "Pet", iconName: "pet_paw" },
  ];
}

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/app") return pathname === "/app";
  if (href === "/app/pets") return pathname === "/app/pets" || pathname.startsWith("/app/shop");
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    equippedTitle,
    isProudComboActive,
    isSandboxMode,
    particleBurstKey,
    setTransactionDrawerOpen,
    setCashoutModalOpen,
    setStreakCalendarOpen,
    setStoryModalOpen,
    setSavingsModalOpen,
    triggerActionLoading,
    setColdStreakMode,
    logout,
  } = useBukuDompetStore();
  const stories = useFamilyStore((s) => s.stories);
  const markRemindersSeen = useFamilyStore((s) => s.markRemindersSeen);

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
    (isChildRole(currentRole)
      ? profiles.find((p) => p.id === activeProfileId && isChildRole(p.role))
      : profiles.find((p) => p.id === monitoredUserId && isChildRole(p.role))) ||
    profiles.find((p) => isChildRole(p.role)) ||
    profiles[0];

  const isKid = userProfile.role === "schoolchild";
  const isOwner = isChildRole(currentRole) && userProfile.id === activeProfileId;
  const isCold = Boolean(userProfile.isColdStreakMode);
  const navItems = getNavItems(isKid);

  // Pengingat dari keluarga dianggap terbaca saat pemilik akun membuka aplikasi.
  useEffect(() => {
    if (isOwner) markRemindersSeen(userProfile.id);
  }, [isOwner, userProfile.id, markRemindersSeen]);

  const userTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === userProfile.id),
    [transactions, userProfile.id]
  );

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

  const quest = useQuestState(userProfile);
  const claimableBadge = quest.claimableCount + quest.claimableMedals;

  const today = localDateStr();
  const storiesToday = stories.filter(
    (s) => s.userId === userProfile.id && s.date === today
  ).length;
  const hasRecordToday = userProfile.last_recorded_date === today;

  // Pet menggigil saat Streak Padam; selain itu mengikuti laporan Inspektur Saku.
  const petMood: PetMood = isCold ? "shivering_cold" : report.petMood;
  const petSpeech = isCold
    ? isKid
      ? `Brrr... streak-mu padam dan ${petName} kedinginan. Tulis satu cerita hari ini supaya kami hangat lagi!`
      : `Brrr... streak-mu padam dan ${petName} kedinginan. Catat kas hari ini supaya api streak menyala lagi!`
    : isKid
    ? hasRecordToday
      ? `Ceritamu hari ini keren banget! ${petName} bangga sama kamu.`
      : `Halo! Aku ${petName}. Yuk tulis ceritamu hari ini supaya streak kita tetap menyala!`
    : report.mochiSpeech;

  const owlMood: InspectorSakuMood = isProudComboActive
    ? "proud"
    : report.walletStatus === "BENGKAK"
    ? "danger_siren"
    : report.walletStatus === "WASPADA" || report.walletStatus === "PENTING_TERDETEKSI"
    ? "warning"
    : "safe";

  const isPetsPage =
    pathname === "/app/pets" || pathname?.startsWith("/app/shop");

  /** Nyalakan overlay loading seketika saat klik navigasi (bukan menunggu halaman selesai). */
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    soundEffects.tactileClick();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href === pathname) return;
    triggerActionLoading(6000);
  };

  const openPrimaryAction = () => {
    soundEffects.tactileClick();
    if (isKid) setStoryModalOpen(true);
    else setTransactionDrawerOpen(true);
  };

  const primaryLabel = isKid ? (
    <>
      <GlyphInline name="pen" /> Tulis Cerita
    </>
  ) : (
    <>
      <GlyphInline name="plus" /> Catat Kas Sekarang
    </>
  );

  return (
    <div className="min-h-screen text-[#3D352E] pb-28 lg:pb-12 overflow-x-hidden">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />
      <TransactionDrawer />
      <PointCashoutModal />
      <StreakCalendarModal />
      <AccessoryDropModal />
      <SavingsVaultModal />
      <StoryTimeModal />

      <CozyConfirmModal
        open={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        onConfirm={() => {
          triggerActionLoading(6000);
          logout();
          router.push("/login");
        }}
        title="Keluar & Ganti Akun?"
        description="Kamu akan kembali ke Brankas Login. Kartu profilmu tetap tersimpan, jadi masuk lagi cukup dengan 4 angka PIN."
        confirmLabel="Ya, Ke Brankas Login"
        confirmVariant="peach"
        mochiStage={report.mochiStage}
        badgeText="Ganti Akun BukuDompet"
      />

      {/* Top Sticky HUD */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/92 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-[1240px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          <Link
            href="/app"
            onClick={(e) => handleNavClick(e, "/app")}
            aria-label="BukuDompet — ke Beranda Keluarga"
            className="flex items-center gap-2 group shrink-0"
          >
            <BukuDompetLogo variant="mark" size="sm" className="sm:hidden w-10 h-10" />
            <BukuDompetLogo variant="full" size="sm" className="hidden sm:block h-10 w-auto" />
          </Link>

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

            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                toggleBgm();
              }}
              aria-label={isBgmPlaying ? "Matikan musik latar" : "Nyalakan musik latar"}
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
                <Volume2 className="w-4 h-4 text-[#58CC02]" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#7A6E65]" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {isBgmPlaying ? "Musik: Nyala" : "Musik: Senyap"}
              </span>
            </button>

            {/* Catat Tabungan */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setSavingsModalOpen(true);
              }}
              aria-label="Catat Tabungan"
              title="Catat Tabungan ke celengan"
              className="px-2.5 py-1.5 rounded-2xl bg-[#EEF8FF] hover:bg-[#DEF2FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CozyIcon name="cat_saving" size={20} />
              <span className="hidden md:inline font-display text-xs font-extrabold text-[#1565C0]">
                Tabungan
              </span>
            </button>

            {/* Streak Pill */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setStreakCalendarOpen(true);
              }}
              title={isCold ? "Streak padam. Catat hari ini untuk menghangatkannya lagi" : (isKid ? "Buka Kalender Streak dan Rekap Catatan" : "Buka Kalender Streak & Rekap Kas")}
              aria-label={`Streak ${userProfile.current_streak} hari${isCold ? ", padam" : ""}`}
              className={cn(
                "px-2.5 sm:px-3.5 py-1.5 rounded-2xl border-2 border-b-[4px] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                isCold
                  ? "bg-[#EBF3F9] hover:bg-[#DDEBF5] border-[#B8D4E8] border-b-[#8DB8D6]"
                  : "bg-[#FFFBEB] hover:bg-[#FFF5D1] border-[#FDE08D] border-b-[#F5C84C]"
              )}
            >
              {isCold ? (
                <Snowflake className="w-5 h-5 text-[#1E88E5]" aria-hidden="true" />
              ) : (
                <CozyIcon name="flame_streak" size={22} animated />
              )}
              <span
                className={cn(
                  "font-display font-extrabold tabular-nums text-xs sm:text-sm",
                  isCold ? "text-[#1B4F7A]" : "text-[#4A3500]"
                )}
              >
                {userProfile.current_streak}
              </span>
              <span className="hidden md:inline text-xs font-bold text-[#7A6E65]">Hari</span>
            </button>

            {/* Dompet Poin */}
            <motion.button
              type="button"
              animate={hudPulse ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              onClick={() => {
                soundEffects.tactileClick();
                setCashoutModalOpen(true);
              }}
              aria-label="Buka dompet poin"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#FFC800] hover:bg-[#FFD22B] border-0 border-b-[4px] border-b-[#E5A400] active:border-b-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CozyIcon name="coin_rupiah" size={20} />
              <RollingNumber
                value={userProfile.points_balance}
                suffix=" Poin"
                className="text-xs sm:text-sm text-[#4A3500]"
              />
            </motion.button>

            <motion.div
              animate={hudPulse ? { scale: [1, 1.16, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              className="hidden sm:block shrink-0"
            >
              <Link
                href="/app/pets"
                onClick={(e) => handleNavClick(e, "/app/pets")}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-[#EEF8FF] hover:bg-[#DEF2FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF] flex items-center gap-1.5 transition-all"
              >
                <CozyIcon name="xp_star" size={20} />
                <span className="font-display text-xs sm:text-sm font-extrabold text-[#1565C0]">
                  Fase {currentStage}/8
                </span>
              </Link>
            </motion.div>

            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setConfirmExitOpen(true);
              }}
              aria-label="Ganti akun atau keluar"
              title="Ganti Akun / Keluar ke Brankas Login"
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
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20 min-w-0 max-w-full overflow-hidden">
          <CozyCard tone="white" className="p-3.5 space-y-2">
            <p className="px-2 text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Menu Petualangan
            </p>
            <nav aria-label="Menu utama" className="space-y-1.5">
              {navItems.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-display text-sm font-extrabold transition-all min-w-0",
                      active
                        ? "bg-[#38B6FF] text-[#12324D] border-b-[4px] border-b-[#1E88E5]"
                        : "text-[#3D352E] hover:bg-[#F7F3EB]"
                    )}
                  >
                    <span className="flex items-center gap-2.5 leading-snug break-words">
                      <CozyIcon name={item.iconName} size={22} />
                      <span>{item.label}</span>
                    </span>
                    {item.href === "/app/quests" && claimableBadge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFC800] text-[#4A3500] font-display tabular-nums text-[11px] font-extrabold shrink-0">
                        {claimableBadge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 space-y-2">
              <TactileButton variant="matcha" size="md" fullWidth onClick={openPrimaryAction}>
                {!isKid && <CozyIcon name="plus_record" size={22} />}
                {primaryLabel}
              </TactileButton>
              <TactileButton
                variant="sky"
                size="sm"
                fullWidth
                onClick={() => setSavingsModalOpen(true)}
              >
                <CozyIcon name="cat_saving" size={18} />
                Catat Tabungan
              </TactileButton>
            </div>
          </CozyCard>

          {/* Streak Calendar Trigger */}
          <CozyCard tone="white" className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="font-display text-sm font-extrabold flex items-center gap-1.5">
                <CozyIcon name="calendar_streak" size={22} />
                <span>Kalender Streak</span>
              </span>
              <span className="text-xs font-display font-extrabold px-2.5 py-0.5 rounded-xl bg-[#E3F4FF] border border-[#9AD2FF] text-[#1565C0] inline-flex items-center gap-1 shrink-0">
                <CozyIcon name="ice_shield" size={16} />
                {totalShieldsFor(userProfile, localDateStr(0))}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "S", "R", "K", "J", "S", "M"].map((d, idx) => {
                const isDone = idx < Math.min(6, userProfile.current_streak);
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
            <TactileButton variant="cream" size="sm" fullWidth onClick={() => setStreakCalendarOpen(true)}>
              <CozyIcon name="calendar_streak" size={18} />
              {isKid ? "Buka Kalender Streak dan Rekap Catatan" : "Buka Kalender & Rekap Kas"}
            </TactileButton>
          </CozyCard>

          {/* Pintu Keluarga + Uji Streak Padam */}
          <CozyCard tone="white" className="p-3.5 space-y-2">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Pintu Keluarga (Demo Cepat)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/supervisor"
                onClick={(e) => handleNavClick(e, "/supervisor")}
                className="px-2.5 py-2 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 hover:bg-white text-[#3D352E]"
              >
                <CozyIcon name="parent_heart" size={18} /> Supervisor
              </Link>
              <Link
                href="/admin"
                onClick={(e) => handleNavClick(e, "/admin")}
                className="px-2.5 py-2 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 hover:bg-white text-[#3D352E]"
              >
                <CozyIcon name="crown_sultan" size={18} /> Admin
              </Link>
            </div>
            <button
              type="button"
              aria-pressed={isCold}
              onClick={() => {
                soundEffects.tactileClick();
                setColdStreakMode(userProfile.id, !isCold);
              }}
              className={cn(
                "w-full px-2.5 py-2 rounded-xl border-2 border-b-[4px] text-xs font-display font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors",
                isCold
                  ? "bg-[#FFF2F0] border-[#FFCDC6] border-b-[#FFA89C] text-[#8F2A1B]"
                  : "bg-[#EBF3F9] border-[#B8D4E8] border-b-[#8DB8D6] text-[#1B4F7A] hover:bg-[#DDEBF5]"
              )}
            >
              <Snowflake className="w-4 h-4" aria-hidden="true" />
              {isCold ? (
                <>
                  <GlyphInline name="sun" /> Hangatkan Lagi (Kembali Normal)
                </>
              ) : (
                <>
                  <GlyphInline name="snowflake" /> Uji Mode Streak Padam (Cold Ambience)
                </>
              )}
            </button>
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

        {/* RIGHT COMPANION PANEL */}
        {!isPetsPage && (
          <aside className="hidden lg:flex flex-col gap-4 sticky top-20 min-w-0 max-w-full overflow-hidden">
            <CozyCard tone="white" className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#8A3FC2] block leading-snug break-words">
                    {equippedTitle} • Fase {currentStage}/8
                  </span>
                  <h3 className="font-display text-lg font-extrabold text-[#3D352E] leading-snug break-words">
                    {petName} — {stageMeta.name}
                  </h3>
                </div>
                <Link
                  href="/app/pets?tab=shop"
                  onClick={(e) => handleNavClick(e, "/app/pets")}
                  className="px-2.5 py-1 rounded-xl bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#8A3FC2] flex items-center gap-1 hover:bg-[#E2C6FF]/40 shrink-0"
                >
                  <CozyIcon name="mystery_box" size={16} /> Butik
                </Link>
              </div>

              <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E6DFD2] p-2 flex flex-col items-center">
                <CustomizablePetAvatar
                  species={activeSpecies}
                  stage={currentStage}
                  mood={petMood}
                  customName={petName}
                  equippedAccessories={userProfile.equippedAccessories}
                  className="w-48 h-48"
                />
                <div className="w-full bg-[#F7F3EB] border border-[#E6DFD2] rounded-2xl p-2.5 text-xs font-bold text-[#3D352E] mt-1 leading-relaxed break-words">
                  &ldquo;{petSpeech}&rdquo;
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
                    label="Hari Mencatat di Fase Ini"
                    showFraction
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#EFFBE6] border border-[#C3EFA4] text-center text-xs font-display font-extrabold text-[#2E6F00]">
                  Fase Puncak Sepuh Bijaksana Tercapai! <GlyphInline name="crown" />
                </div>
              )}
            </CozyCard>

            {isCold && (
              <CozyCard tone="sky" className="p-4 flex items-center gap-3">
                <ColdStreakOverlayBadge isCold className="w-20 h-20 shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-sm font-extrabold text-[#12324D]">Streak Padam</p>
                  <p className="text-xs font-bold text-[#1B4F7A] leading-snug break-words">
                    {isKid
                      ? "Tulis satu cerita hari ini untuk menyalakan apinya lagi."
                      : "Catat kas hari ini untuk menyalakan apinya lagi."}
                  </p>
                </div>
              </CozyCard>
            )}

            {isKid ? (
              <CozyCard tone="white" className="p-4 space-y-2.5">
                <span className="font-display text-base font-extrabold flex items-center gap-1.5 leading-snug break-words">
                  <CozyIcon name="missions_scroll" size={22} />
                  <span>Jurnal Cerita Hari Ini</span>
                </span>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                  {storiesToday > 0
                    ? `Kamu sudah menulis ${storiesToday} cerita hari ini. Keren!`
                    : "Belum ada cerita hari ini. Satu cerita 30 kata cukup menyambung streak."}
                </p>
                <TactileButton variant="matcha" size="sm" fullWidth onClick={openPrimaryAction}>
                  <GlyphInline name="pen" /> Tulis Cerita
                </TactileButton>
              </CozyCard>
            ) : (
              <CozyCard tone="white" className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="font-display text-base font-extrabold flex items-center gap-1.5 leading-snug break-words">
                    <CozyIcon name="detective_radar" size={22} />
                    <span>Inspektur Saku</span>
                  </span>
                  <span
                    className={cn(
                      "font-display tabular-nums text-xs font-extrabold px-2 py-0.5 rounded-lg border shrink-0",
                      report.statusColor === "matcha"
                        ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                        : report.statusColor === "honey"
                        ? "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
                        : "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]"
                    )}
                  >
                    DOI: {report.doi}x
                  </span>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <InspectorSakuOwl mood={owlMood} className="w-20 h-20 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#3D352E] leading-snug break-words">
                      {report.statusTitle}
                    </p>
                    <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                      Sisa jatah aman hari ini {formatRupiah(report.remainingDailySafeSpend)}
                    </p>
                  </div>
                </div>
                {report.microLeaks.length > 0 && (
                  <div className="bg-[#FFF2F0] rounded-2xl border border-[#FFCDC6] p-2.5 text-xs font-bold text-[#8F2A1B] leading-relaxed break-words">
                    {report.microLeaks[0].message}
                  </div>
                )}
              </CozyCard>
            )}

            <CozyCard tone="white" className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex flex-col items-start gap-1 min-w-0">
                  <p className="text-xs font-extrabold text-[#7A6E65] leading-snug break-words">
                    Dompet Poin (1 Poin = Rp1)
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
              <TactileButton variant="honey" size="sm" fullWidth onClick={() => setCashoutModalOpen(true)}>
                <CozyIcon name="rewards_ticket" size={18} />
                Cairkan Poin Jadi Uang Saku
              </TactileButton>
            </CozyCard>
          </aside>
        )}
      </div>

      {/* Bottom Navigation (Mobile < 1024px): 2 + tombol tengah + 2 */}
      <nav aria-label="Menu utama" className="lg:hidden fixed bottom-3 left-2 right-2 z-40 max-w-lg mx-auto">
        <div className="bg-white/95 backdrop-blur-md border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] rounded-3xl px-1.5 py-1.5 grid grid-cols-5 items-center gap-0.5 shadow-lg">
          {navItems.slice(0, 2).map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              onClick={handleNavClick}
            />
          ))}

          <div className="flex justify-center -mt-6">
            <button
              type="button"
              onClick={openPrimaryAction}
              aria-label={isKid ? "Tulis Cerita" : "Catat Kas"}
              className="w-14 h-14 rounded-2xl bg-[#58CC02] hover:bg-[#61DC06] text-[#173300] border-0 border-b-[5px] border-b-[#46A302] active:border-b-[2px] active:translate-y-[3px] flex flex-col items-center justify-center cursor-pointer transition-all shadow-md"
            >
              {isKid ? (
                <>
                  <GlyphIcon name="pen" size={22} />
                  <span className="text-[8px] font-display font-extrabold leading-tight mt-0.5 text-center">
                    Tulis Cerita
                  </span>
                </>
              ) : (
                <>
                  <CozyIcon name="plus_record" size={24} />
                  <span className="text-[8px] font-display font-extrabold leading-none mt-0.5">Catat</span>
                </>
              )}
            </button>
          </div>

          {navItems.slice(2).map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              badge={item.href === "/app/quests" ? claimableBadge : 0}
              onClick={handleNavClick}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function MobileNavLink({
  item,
  active,
  badge = 0,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={(e) => onClick(e, item.href)}
      className={cn(
        "flex flex-col items-center justify-center py-1 rounded-2xl text-[10px] font-display font-extrabold transition-all relative min-w-0",
        active
          ? "bg-[#E3F4FF] text-[#12324D] border border-[#9AD2FF] border-b-[3px] border-b-[#38B6FF]"
          : "text-[#6B5F56]"
      )}
    >
      <CozyIcon name={item.iconName} size={20} />
      <span className="mt-0.5 text-center leading-tight px-0.5">{item.shortLabel}</span>
      {badge > 0 && (
        <span className="absolute -top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#FFC800] text-[9px] font-display font-extrabold flex items-center justify-center text-[#4A3500]">
          {badge}
        </span>
      )}
    </Link>
  );
}

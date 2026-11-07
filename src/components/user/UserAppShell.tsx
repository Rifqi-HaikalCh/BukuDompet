"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Map,
  Target,
  Search,
  Award,
  Plus,
  Flame,
  Coins,
  Sparkles,
  LogOut,
  ShieldAlert,
  Ticket,
  Eye,
  Settings,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import {
  MochiCompanion,
  MOCHI_STAGE_NAMES,
} from "@/components/illustrations/MochiCompanion";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  RollingNumber,
  FloatingRewardBanner,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { TransactionDrawer } from "@/components/user/TransactionDrawer";
import { PointCashoutModal } from "@/components/user/PointCashoutModal";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Jalur Kas", icon: Map },
  { href: "/app/missions", label: "Misi & Gacha", icon: Target },
  { href: "/app/detective", label: "Detektif Kas", icon: Search },
  { href: "/app/rewards", label: "Koleksi & Poin", icon: Award },
];

export function UserAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    profiles,
    transactions,
    missions,
    isProudComboActive,
    isSandboxMode,
    setTransactionDrawerOpen,
    setCashoutModalOpen,
  } = useBukuDompetStore();

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

  const unclaimedMissionsCount = missions.filter(
    (m) => !m.is_claimed && m.current_value >= m.target_value
  ).length;

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#3D352E] pb-28 lg:pb-12">
      <FloatingRewardBanner />
      <TransactionDrawer />
      <PointCashoutModal />

      {/* Top Sticky HUD */}
      <header className="sticky top-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-sm border-b-2 border-[#3D352E]">
        <div className="max-w-[1240px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <Link
            href="/app"
            onClick={() => soundEffects.tactileClick()}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#FFC800] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
              🐱
            </div>
            <div className="hidden sm:block">
              <span className="font-fredoka text-xl font-bold tracking-tight text-[#3D352E] block leading-none">
                BukuDompet
              </span>
              <span className="text-[11px] font-extrabold text-[#7A6E65]">
                Jurnal Kas Petualangan
              </span>
            </div>
          </Link>

          {/* Top Sticky HUD Pills: Streak, Point Wallet, Level & XP */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSandboxMode && (
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F5E6FF] border-2 border-[#3D352E] text-xs font-extrabold text-[#3D352E]">
                🧪 Mode Simulasi Aktif
              </span>
            )}

            {/* Streak Pill */}
            <div
              title="Streak Harian Mencatat Kas"
              className="px-3 py-1.5 rounded-2xl bg-[#FFF7D6] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center gap-1.5"
            >
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF8B7B] fill-[#FFC800]" />
              <span className="font-mono-num text-xs sm:text-sm font-extrabold">
                {userProfile.current_streak}
              </span>
              <span className="hidden md:inline text-xs font-bold text-[#7A6E65]">
                Hari
              </span>
            </div>

            {/* Point Wallet Pill (1 Poin = Rp1) -> Opens Cashout Modal */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setCashoutModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-2xl bg-[#FFC800] hover:bg-[#FFD22B] border-2 border-[#3D352E] border-b-[4px] active:border-b-2 active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#3D352E]" />
              <RollingNumber
                value={userProfile.points_balance}
                prefix="Rp"
                className="text-xs sm:text-sm font-extrabold text-[#3D352E]"
              />
            </button>

            {/* Level & XP Pill */}
            <div className="px-3 py-1.5 rounded-2xl bg-[#E0F4FF] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1E88E5]" />
              <span className="font-fredoka text-xs sm:text-sm font-bold text-[#3D352E]">
                Lv.{levelInfo.level}
              </span>
            </div>

            {/* Quick Role / Pintu Exit */}
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                router.push("/login");
              }}
              title="Pindah Pintu Role (Adik / Orang Tua / Abang)"
              className="p-2 rounded-2xl bg-[#F7F2E7] hover:bg-[#FFE8E5] border-2 border-[#3D352E] border-b-[4px] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#3D352E]" />
            </button>
          </div>
        </div>
      </header>

      {/* Responsive 3-Column Cozy Bento Layout on Desktop (>=1024px) */}
      <div className="max-w-[1240px] mx-auto px-3 sm:px-6 pt-5 lg:grid lg:grid-cols-[260px_minmax(0,540px)_360px] lg:justify-between lg:gap-6 items-start">
        {/* LEFT SIDEBAR (260px on Desktop) */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
          <CozyCard tone="vanilla" className="p-3.5 space-y-2">
            <p className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Menu Petualangan
            </p>
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => soundEffects.tactileClick()}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-fredoka text-sm font-bold transition-all",
                      active
                        ? "bg-[#58CC02] text-white border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E]"
                        : "text-[#3D352E] hover:bg-white border-2 border-transparent"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {item.href === "/app/missions" &&
                      unclaimedMissionsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FFC800] text-[#3D352E] border border-[#3D352E] font-mono-num text-[11px] font-extrabold">
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
                <Plus className="w-5 h-5" /> + Catat Kas Sekarang
              </TactileButton>
            </div>
          </CozyCard>

          {/* Streak & Shield Mini Widget */}
          <CozyCard tone="white" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-fredoka text-sm font-bold">
                🔥 Api Konsistensi
              </span>
              <span className="text-xs font-mono-num font-extrabold px-2 py-0.5 rounded-lg bg-[#E0F4FF] border border-[#3D352E]">
                🧊 {userProfile.streak_freeze_count} Freeze
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "S", "R", "K", "J", "S", "M"].map((d, idx) => {
                const isDone = idx < 6;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "py-1.5 rounded-xl border-2 border-[#3D352E] text-[11px] font-extrabold",
                      isDone
                        ? "bg-[#FFC800] text-[#3D352E]"
                        : "bg-[#F7F2E7] text-[#7A6E65]"
                    )}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <p className="text-xs font-bold text-[#7A6E65]">
              1 hari lagi menuju <strong className="text-[#3D352E]">Peti Streak 7 Hari (+500 Poin)</strong>!
            </p>
          </CozyCard>

          {/* Role Switcher Shortcut */}
          <CozyCard tone="vanilla" shadowType="warm" className="p-3.5 space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Pintu Keluarga (Demo Cepat)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/supervisor"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-2 rounded-xl bg-white border-2 border-[#3D352E] text-xs font-extrabold flex items-center justify-center gap-1 hover:bg-[#FFF7D6]"
              >
                <Eye className="w-3.5 h-3.5" /> Orang Tua
              </Link>
              <Link
                href="/admin"
                onClick={() => soundEffects.tactileClick()}
                className="px-2.5 py-2 rounded-xl bg-white border-2 border-[#3D352E] text-xs font-extrabold flex items-center justify-center gap-1 hover:bg-[#E0F4FF]"
              >
                <Settings className="w-3.5 h-3.5" /> Abang Admin
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
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Tahap {report.mochiStage} • Lv.{levelInfo.level}
                </span>
                <h3 className="font-fredoka text-lg font-bold text-[#3D352E]">
                  {MOCHI_STAGE_NAMES[report.mochiStage]}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-[#F5E6FF] border-2 border-[#3D352E] text-xs font-extrabold text-[#3D352E]">
                Mood:{" "}
                {report.mochiMood === "happy"
                  ? "Senang 😸"
                  : report.mochiMood === "proud_combo"
                  ? "Bangga 🤩"
                  : report.mochiMood === "worried"
                  ? "Cemas 😿"
                  : "Kaget Boros 😱"}
              </span>
            </div>

            <div className="bg-[#FFFDF7] rounded-2xl border-2 border-[#3D352E] p-2 flex flex-col items-center">
              <MochiCompanion
                stage={report.mochiStage}
                mood={report.mochiMood}
                className="w-48 h-48"
              />
              <div className="w-full bg-[#FFF7D6] border-2 border-[#3D352E] rounded-2xl p-2.5 text-xs font-bold text-[#3D352E] mt-1">
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
              <span className="font-fredoka text-base font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Radar Detektif Kas
              </span>
              <span className="font-mono-num text-xs font-extrabold px-2 py-0.5 rounded-lg bg-white border border-[#3D352E]">
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
              <div className="bg-white/90 rounded-2xl border-2 border-[#3D352E] p-2.5 text-xs font-bold text-[#3D352E]">
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
                <p className="font-fredoka text-xl font-bold text-[#3D352E]">
                  {formatRupiah(userProfile.points_balance)}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-[#3D352E]" />
            </div>
            <TactileButton
              variant="white"
              size="sm"
              fullWidth
              onClick={() => setCashoutModalOpen(true)}
            >
              Cairkan Poin Jadi Uang Saku 🎫
            </TactileButton>
          </CozyCard>
        </aside>
      </div>

      {/* Floating Chunky Bottom Navigation Bar on Mobile (< 1024px) */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto">
        <div className="bg-[#FFFDF7] border-2 border-[#3D352E] shadow-[0_5px_0_0_#3D352E] rounded-3xl px-2 py-2 grid grid-cols-5 items-center gap-1">
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 rounded-2xl text-[11px] font-extrabold transition-all relative",
                  active
                    ? "bg-[#E5F9D7] text-[#3D352E] border-2 border-[#3D352E]"
                    : "text-[#7A6E65]"
                )}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate">{item.label.split(" ")[0]}</span>
                {item.href === "/app/missions" && unclaimedMissionsCount > 0 && (
                  <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-[#FFC800] border border-[#3D352E] text-[9px] font-mono-num flex items-center justify-center text-[#3D352E]">
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
              className="w-14 h-14 rounded-2xl bg-[#58CC02] hover:bg-[#61DC06] text-white border-2 border-[#3D352E] border-b-[5px] active:border-b-2 active:translate-y-[3px] shadow-[0_4px_0_0_#3D352E] flex flex-col items-center justify-center cursor-pointer transition-all"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              <span className="text-[10px] font-fredoka font-bold leading-none">
                Catat
              </span>
            </button>
          </div>

          {NAV_ITEMS.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => soundEffects.tactileClick()}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 rounded-2xl text-[11px] font-extrabold transition-all",
                  active
                    ? "bg-[#E5F9D7] text-[#3D352E] border-2 border-[#3D352E]"
                    : "text-[#7A6E65]"
                )}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

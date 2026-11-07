"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
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
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const {
    profiles,
    transactions,
    equippedMochiStage,
    lastSupervisorCheerDate,
    supervisorCheersCount,
    sendSupervisorCheer,
  } = useBukuDompetStore();

  const [selectedUserId, setSelectedUserId] = useState<string>(
    profiles.find((p) => p.role === "user")?.id || profiles[0].id
  );
  const [cheerMessage, setCheerMessage] = useState<string | null>(null);
  const [confirmCheerOpen, setConfirmCheerOpen] = useState<boolean>(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState<boolean>(false);

  const inspectedUser =
    profiles.find((p) => p.id === selectedUserId) ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const levelInfo = getLevelFromXp(inspectedUser.xp);
  const report = analyzeSpendingDetective({
    transactions,
    monthlyBudgetTarget: inspectedUser.monthly_budget_target,
    monthlySavingTarget: inspectedUser.monthly_saving_target,
    userLevel: levelInfo.level,
  });

  const displayStage = equippedMochiStage || report.mochiStage;

  const todayStr = new Date().toISOString().split("T")[0];
  const alreadyCheeredToday = lastSupervisorCheerDate === todayStr;

  const executeSendCheer = () => {
    const res = sendSupervisorCheer();
    setCheerMessage(res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.tactileClick();
    }
  };

  return (
    <div className="min-h-screen text-[#3D352E] pb-16">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />

      <CozyConfirmModal
        open={confirmCheerOpen}
        onClose={() => setConfirmCheerOpen(false)}
        onConfirm={executeSendCheer}
        title="Kirim Stiker Semangat (+50 Poin)?"
        description="Orang Tua akan mengirimkan apresiasi Stiker Semangat beserta hadiah +50 Poin (Rp50) & +30 XP langsung ke dompet kas Adik!"
        confirmLabel="Ya, Kirim Semangat!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        mochiStage={displayStage}
        badgeText="Apresiasi Orang Tua"
      />

      <CozyConfirmModal
        open={confirmExitOpen}
        onClose={() => setConfirmExitOpen(false)}
        onConfirm={() => router.push("/login")}
        title="Kembali ke Pintu PIN Keluarga?"
        description="Anda akan kembali ke halaman Pintu PIN untuk beralih peran akun."
        confirmLabel="Ya, Ke Pintu PIN"
        confirmVariant="honey"
        mochiStage={displayStage}
      />

      {/* Top Sticky Supervisor Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/92 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
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
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEB] border-2 border-[#FDE08D] text-xs font-display font-extrabold">
              <CozyIcon name="parent_heart" size={18} />
              Layar Pantau Orang Tua
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] text-xs font-display font-extrabold flex items-center gap-1.5 hover:bg-[#58CC02] hover:text-white transition-colors"
            >
              <CozyIcon name="home_path" size={18} /> Layar Adik
            </Link>
            <Link
              href="/admin"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#EEF8FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF] text-xs font-display font-extrabold flex items-center gap-1.5"
            >
              <CozyIcon name="crown_sultan" size={18} /> Admin
            </Link>
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setConfirmExitOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <CozyIcon name="lock_cozy" size={16} /> Pintu PIN
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* 1. User Selector Dropdown + Parent Appreciation Action */}
        <CozyCard
          tone="honey"
          className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0">
              <MochiCompanion
                stage={displayStage}
                mood={report.mochiMood}
                className="w-16 h-16"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CozyIcon name="parent_heart" size={20} />
                <label className="text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Buku Kas yang Dipantau:
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-3 py-1 rounded-xl bg-white border-2 border-[#E6DFD2] font-display text-sm font-extrabold text-[#3D352E] focus:outline-none"
                >
                  {profiles
                    .filter((p) => p.role === "user")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} — {MOCHI_STAGE_NAMES[displayStage]}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#3D352E]">
                Adik sudah rajin mencatat{" "}
                <strong>{inspectedUser.current_streak} hari berturut-turut</strong>
                ! Beri semangat agar makin disiplin menabung.
              </p>
              {cheerMessage && (
                <p className="text-xs font-extrabold text-[#46A302] bg-white px-2.5 py-1 rounded-lg border border-[#C3EFA4] inline-block">
                  {cheerMessage}
                </p>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <TactileButton
              variant={alreadyCheeredToday ? "cream" : "matcha"}
              size="md"
              fullWidth
              onClick={() => {
                if (alreadyCheeredToday) {
                  executeSendCheer();
                } else {
                  setConfirmCheerOpen(true);
                }
              }}
            >
              <CozyIcon name="parent_heart" size={20} />
              {alreadyCheeredToday
                ? `Stiker Semangat Terkirim Hari Ini (${supervisorCheersCount}x)`
                : "Kirim Stiker Semangat (+50 Poin Bonus)!"}
            </TactileButton>
          </div>
        </CozyCard>

        {/* 2. Kartu Ringkasan Orang Tua (Plain-Language Storytelling + 4 Big Cards) */}
        <div className="space-y-3">
          <CozyCard tone="white" className="p-5 space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold inline-flex items-center gap-1.5">
              <CozyIcon name="missions_scroll" size={16} />
              Cerita Keuangan Harian (Bahasa Ramah Orang Tua)
            </span>
            <p className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-relaxed">
              &ldquo;Bulan ini dari uang saku{" "}
              <span className="underline decoration-[#58CC02] decoration-2 tabular-nums">
                {formatRupiah(report.monthlyAllowance)}
              </span>
              , Adik sudah menyisihkan target tabungan{" "}
              <span className="text-[#46A302] tabular-nums">
                {formatRupiah(report.monthlySavingTarget)}
              </span>
              . Hari ini pengeluaran Adik tercatat{" "}
              <span className="text-[#E06353] tabular-nums">
                {formatRupiah(report.todayTotalSpend)}
              </span>{" "}
              (batas aman harian {formatRupiah(report.dssl)}), sehingga kondisi
              dompet saat ini{" "}
              <span className="px-2.5 py-0.5 rounded-xl bg-[#FFFBEB] border border-[#FDE08D]">
                {report.walletStatus}
              </span>
              !&rdquo;
            </p>
          </CozyCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CozyCard tone="matcha" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#3D352E]">
                <span>Sisa Uang Bulan Ini</span>
                <CozyIcon name="cat_saving" size={22} />
              </div>
              <div className="font-display text-2xl font-extrabold text-[#3D352E]">
                <RollingNumber
                  value={report.remainingTotalBalanceThisMonth}
                  prefix="Rp"
                />
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Termasuk tabungan {formatRupiah(report.monthlySavingTarget)}
              </p>
            </CozyCard>

            <CozyCard tone="peach" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#3D352E]">
                <span>Pengeluaran Hari Ini</span>
                <CozyIcon name="cat_food" size={22} />
              </div>
              <div className="font-display text-2xl font-extrabold text-[#3D352E]">
                <RollingNumber value={report.todayTotalSpend} prefix="Rp" />
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Sisa jatah hari ini: {formatRupiah(report.remainingDailySafeSpend)}
              </p>
            </CozyCard>

            <CozyCard tone="sky" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#3D352E]">
                <span>Pengeluaran Minggu Ini</span>
                <CozyIcon name="calendar_streak" size={22} />
              </div>
              <div className="font-display text-2xl font-extrabold text-[#3D352E]">
                <RollingNumber value={report.totalSpentThisWeek} prefix="Rp" />
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Sisa kuota mingguan: {formatRupiah(report.remainingWeeklyBudget)}
              </p>
            </CozyCard>

            <CozyCard tone="honey" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-display font-extrabold text-[#3D352E]">
                <span>Skor Kerajinan (Streak)</span>
                <CozyIcon name="flame_streak" size={22} animated />
              </div>
              <div className="font-display text-2xl font-extrabold text-[#3D352E]">
                {inspectedUser.current_streak} Hari Berturut
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Saldo Poin Hadiah: {formatRupiah(inspectedUser.points_balance)}
              </p>
            </CozyCard>
          </div>
        </div>

        {/* 3. Two-Column Parent Section: Transparent Itemized Timeline + Category & Detective Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Jurnal Harian Transparan (What, For What, How Much) */}
          <CozyCard tone="white" className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CozyIcon name="missions_scroll" size={28} />
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[#3D352E]">
                    Jurnal Harian Transparan (Rincian Per Item)
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Orang tua bisa melihat dengan jelas uang dipakai beli apa
                    saja (bukan sekadar tulis &ldquo;Makan&rdquo;)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {transactions.map((tx) => {
                const dateFormatted = new Date(
                  tx.transaction_date + "T12:00:00"
                ).toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });

                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-[#FFFDF9] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#F9F4EA] border border-[#E6DFD2] flex items-center justify-center shrink-0">
                          <CategoryIcon category={tx.category} size={26} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-base font-extrabold text-[#3D352E]">
                              {tx.title}
                            </span>
                            {tx.is_itemized && (
                              <span className="px-2 py-0.5 rounded-lg bg-[#EFFBE6] border border-[#C3EFA4] text-[10px] font-display font-extrabold text-[#46A302] inline-flex items-center gap-1">
                                <CozyIcon name="check_badge" size={12} />
                                Rincian Jujur Lengkap
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-[#7A6E65]">
                            {dateFormatted} • Kategori: {tx.category} (
                            {tx.need_or_want === "need"
                              ? "Kebutuhan Pokok"
                              : tx.need_or_want === "want"
                              ? "Keinginan / Jajan"
                              : "Pemasukan"}
                            )
                          </p>
                        </div>
                      </div>

                      <span
                        className={`font-display text-base font-extrabold tabular-nums shrink-0 ${
                          tx.type === "income"
                            ? "text-[#46A302]"
                            : "text-[#3D352E]"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatRupiah(tx.total_amount)}
                      </span>
                    </div>

                    {/* Transparent Sub-items */}
                    {tx.items && tx.items.length > 0 && (
                      <div className="bg-[#F9F4EA] rounded-2xl border border-[#E6DFD2] p-3 space-y-1.5">
                        <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                          Rincian Item Belanja Adik:
                        </p>
                        {tx.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#3D352E] bg-white px-3 py-1.5 rounded-xl border border-[#E6DFD2]"
                          >
                            <span>
                              • {item.item_name}{" "}
                              {item.quantity > 1 && `(${item.quantity}x)`}
                            </span>
                            <span className="font-display font-extrabold tabular-nums">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CozyCard>

          {/* Right Column: Grafik Kategori Pastel & Laporan Detektif Mochi */}
          <div className="space-y-4">
            <CozyCard tone="vanilla" className="space-y-3.5">
              <h3 className="font-display text-lg font-extrabold text-[#3D352E] flex items-center gap-2">
                <CozyIcon name="coin_rupiah" size={24} />
                Grafik Kategori Pengeluaran
              </h3>
              <div className="space-y-3">
                {report.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="p-3 rounded-2xl bg-white border border-[#E6DFD2] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon category={cat.category} size={18} />
                        {cat.category}
                      </span>
                      <span className="font-display font-extrabold tabular-nums">
                        {formatRupiah(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <ChunkyProgressBar
                      value={cat.percentage}
                      max={100}
                      variant={cat.group === "need" ? "matcha" : "peach"}
                    />
                  </div>
                ))}
              </div>
            </CozyCard>

            <CozyCard tone="white" className="space-y-3">
              <div className="flex items-center gap-2">
                <CozyIcon name="detective_radar" size={24} />
                <h3 className="font-display text-lg font-extrabold text-[#3D352E]">
                  Catatan Detektif Mochi untuk Orang Tua
                </h3>
              </div>
              {report.microLeaks.length > 0 ? (
                report.microLeaks.map((leak, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE08D] text-xs font-bold text-[#3D352E] leading-relaxed"
                  >
                    {leak.message}
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-bold text-[#3D352E]">
                  Minggu ini pengeluaran Adik sangat terkendali dan tidak ada
                  kebocoran jajan impulsif!
                </div>
              )}
            </CozyCard>
          </div>
        </div>
      </main>
    </div>
  );
}

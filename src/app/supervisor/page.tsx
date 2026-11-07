"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  Receipt,
  Flame,
  Wallet,
  Calendar,
  Sparkles,
  ArrowLeft,
  Settings,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  EXPENSE_CATEGORIES,
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
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export default function SupervisorDashboardPage() {
  const {
    profiles,
    transactions,
    lastSupervisorCheerDate,
    supervisorCheersCount,
    sendSupervisorCheer,
  } = useBukuDompetStore();

  const [selectedUserId, setSelectedUserId] = useState<string>(
    profiles.find((p) => p.role === "user")?.id || profiles[0].id
  );
  const [cheerMessage, setCheerMessage] = useState<string | null>(null);

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

  const todayStr = new Date().toISOString().split("T")[0];
  const alreadyCheeredToday = lastSupervisorCheerDate === todayStr;

  const handleSendCheer = () => {
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
    <div className="min-h-screen bg-[#FFFDF7] text-[#3D352E] pb-16">
      <FloatingRewardBanner />

      {/* Top Sticky Supervisor Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-sm border-b-2 border-[#3D352E]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFC800] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center">
              <HeartHandshake className="w-5 h-5 text-[#3D352E]" />
            </div>
            <div>
              <h1 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E] leading-none">
                Layar Pantau Orang Tua (Supervisor)
              </h1>
              <p className="text-xs font-bold text-[#7A6E65]">
                Transparan, Ramah Keluarga & Real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#E5F9D7] border-2 border-[#3D352E] text-xs font-extrabold flex items-center gap-1 hover:bg-[#58CC02] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Layar Adik
            </Link>
            <Link
              href="/admin"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#E0F4FF] border-2 border-[#3D352E] text-xs font-extrabold flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" /> Admin
            </Link>
            <Link
              href="/login"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#F7F2E7] border-2 border-[#3D352E] text-xs font-extrabold"
            >
              Pintu PIN
            </Link>
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
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#3D352E] flex items-center justify-center shrink-0">
              <MochiCompanion
                stage={report.mochiStage}
                mood={report.mochiMood}
                className="w-16 h-16"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCheck className="w-4 h-4 text-[#3D352E]" />
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Buku Kas yang Dipantau:
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-3 py-1 rounded-xl bg-white border-2 border-[#3D352E] font-fredoka text-sm font-bold text-[#3D352E] focus:outline-none"
                >
                  {profiles
                    .filter((p) => p.role === "user")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} — {MOCHI_STAGE_NAMES[report.mochiStage]}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#3D352E]">
                Adik sudah rajin mencatat{" "}
                <strong>{inspectedUser.current_streak} hari berturut-turut</strong>!
                Beri semangat agar makin disiplin menabung.
              </p>
              {cheerMessage && (
                <p className="text-xs font-extrabold text-[#46A302] bg-white px-2.5 py-1 rounded-lg border border-[#3D352E] inline-block">
                  {cheerMessage}
                </p>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <TactileButton
              variant={alreadyCheeredToday ? "white" : "matcha"}
              size="md"
              fullWidth
              onClick={handleSendCheer}
            >
              <Sparkles className="w-4 h-4" />
              {alreadyCheeredToday
                ? `Stiker Semangat Terkirim Hari Ini (${supervisorCheersCount}x)`
                : "Kirim Stiker Semangat (+50 Poin Bonus)! 💌"}
            </TactileButton>
          </div>
        </CozyCard>

        {/* 2. Kartu Ringkasan Orang Tua (Plain-Language Storytelling + 4 Big Cards) */}
        <div className="space-y-3">
          <CozyCard tone="white" className="p-5 space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#E5F9D7] border-2 border-[#3D352E] text-xs font-extrabold">
              📖 Cerita Keuangan Harian (Bahasa Ramah Orang Tua)
            </span>
            <p className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E] leading-relaxed">
              &ldquo;Bulan ini dari uang saku{" "}
              <span className="underline decoration-[#58CC02] decoration-2">
                {formatRupiah(report.monthlyAllowance)}
              </span>
              , Adik sudah menyisihkan target tabungan{" "}
              <span className="text-[#46A302]">
                {formatRupiah(report.monthlySavingTarget)}
              </span>
              . Hari ini pengeluaran Adik tercatat{" "}
              <span className="text-[#E06353]">
                {formatRupiah(report.todayTotalSpend)}
              </span>{" "}
              (batas aman harian {formatRupiah(report.dssl)}), sehingga kondisi
              dompet saat ini{" "}
              <span className="px-2 py-0.5 rounded-lg bg-[#FFF7D6] border border-[#3D352E]">
                {report.walletStatus}
              </span>
              !&rdquo;
            </p>
          </CozyCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CozyCard tone="matcha" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#3D352E]">
                <span>Sisa Uang Bulan Ini</span>
                <Wallet className="w-4 h-4 text-[#46A302]" />
              </div>
              <div className="font-fredoka text-2xl font-bold text-[#3D352E]">
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
              <div className="flex items-center justify-between text-xs font-extrabold text-[#3D352E]">
                <span>Pengeluaran Hari Ini</span>
                <Receipt className="w-4 h-4 text-[#E06353]" />
              </div>
              <div className="font-fredoka text-2xl font-bold text-[#3D352E]">
                <RollingNumber value={report.todayTotalSpend} prefix="Rp" />
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Sisa jatah hari ini: {formatRupiah(report.remainingDailySafeSpend)}
              </p>
            </CozyCard>

            <CozyCard tone="sky" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#3D352E]">
                <span>Pengeluaran Minggu Ini</span>
                <Calendar className="w-4 h-4 text-[#1E88E5]" />
              </div>
              <div className="font-fredoka text-2xl font-bold text-[#3D352E]">
                <RollingNumber value={report.totalSpentThisWeek} prefix="Rp" />
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65]">
                Sisa kuota mingguan: {formatRupiah(report.remainingWeeklyBudget)}
              </p>
            </CozyCard>

            <CozyCard tone="honey" className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#3D352E]">
                <span>Skor Kerajinan (Streak)</span>
                <Flame className="w-4 h-4 text-[#E5A400]" />
              </div>
              <div className="font-fredoka text-2xl font-bold text-[#3D352E]">
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
              <div>
                <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                  🧾 Jurnal Harian Transparan (Rincian Per Item)
                </h2>
                <p className="text-xs font-bold text-[#7A6E65]">
                  Orang tua bisa melihat dengan jelas uang dipakai beli apa saja
                  (bukan sekadar tulis &ldquo;Makan&rdquo;)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {transactions.map((tx) => {
                const catMeta = EXPENSE_CATEGORIES.find(
                  (c) => c.name === tx.category
                );
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
                    className="p-4 rounded-2xl border-2 border-[#3D352E] bg-[#FFFDF7] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#F7F2E7] border-2 border-[#3D352E] flex items-center justify-center text-lg shrink-0">
                          {tx.type === "income" ? "💰" : catMeta?.emoji || "🧾"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-fredoka text-base font-bold text-[#3D352E]">
                              {tx.title}
                            </span>
                            {tx.is_itemized && (
                              <span className="px-2 py-0.5 rounded-lg bg-[#E5F9D7] border border-[#3D352E] text-[10px] font-extrabold text-[#46A302]">
                                <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
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
                        className={`font-mono-num text-base font-extrabold shrink-0 ${
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
                      <div className="bg-[#F7F2E7] rounded-2xl border-2 border-[#3D352E] p-3 space-y-1.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6E65]">
                          Rincian Item Belanja Adik:
                        </p>
                        {tx.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#3D352E] bg-white px-3 py-1.5 rounded-xl border border-[#3D352E]"
                          >
                            <span>
                              • {item.item_name}{" "}
                              {item.quantity > 1 && `(${item.quantity}x)`}
                            </span>
                            <span className="font-mono-num font-extrabold">
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
              <h3 className="font-fredoka text-lg font-bold text-[#3D352E]">
                📊 Grafik Kategori Pengeluaran
              </h3>
              <div className="space-y-3">
                {report.categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="p-3 rounded-2xl bg-white border-2 border-[#3D352E] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>
                        {cat.emoji} {cat.category}
                      </span>
                      <span className="font-mono-num">
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
                <ShieldAlert className="w-5 h-5 text-[#E5A400]" />
                <h3 className="font-fredoka text-lg font-bold text-[#3D352E]">
                  🕵️‍♂️ Catatan Detektif Mochi untuk Orang Tua
                </h3>
              </div>
              {report.microLeaks.length > 0 ? (
                report.microLeaks.map((leak, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#FFF7D6] border-2 border-[#3D352E] text-xs font-bold text-[#3D352E] leading-relaxed"
                  >
                    {leak.message}
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E] text-xs font-bold text-[#3D352E]">
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

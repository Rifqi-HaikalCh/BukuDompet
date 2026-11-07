"use client";

import React from "react";
import {
  Search,
  ShieldAlert,
  TrendingDown,
  Wallet,
  Calendar,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import { MochiCompanion } from "@/components/illustrations/MochiCompanion";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";

export default function SpendingDetectivePage() {
  const {
    profiles,
    transactions,
    isProudComboActive,
    addTransaction,
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

  const handleSimulateOverburn = () => {
    soundEffects.detectiveBuzz();
    addTransaction({
      type: "expense",
      category: "Nongkrong",
      need_or_want: "want",
      title: "Nongkrong Cafe & Dessert Impulsif",
      total_amount: 65000,
      items: [
        { item_name: "Caramel Macchiato Large", quantity: 1, unit_price: 38000 },
        { item_name: "Croissant Coklat Lumer", quantity: 1, unit_price: 27000 },
      ],
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. Spending Detective Report Card */}
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
        className="p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-32 h-32 rounded-3xl bg-white border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center shrink-0">
            <MochiCompanion
              stage={report.mochiStage}
              mood={report.mochiMood}
              className="w-32 h-32"
            />
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border-2 border-[#3D352E] text-xs font-extrabold">
              <Search className="w-3.5 h-3.5" />
              <span>Status Dompet: {report.walletStatus}</span>
              <span>•</span>
              <span className="font-mono-num">DOI: {report.doi}x</span>
            </div>

            <h1 className="font-fredoka text-xl sm:text-2xl font-bold text-[#3D352E]">
              {report.statusTitle}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#3D352E]/90">
              {report.statusDescription}
            </p>
          </div>
        </div>

        {/* Formula 1 & Formula 2 Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white border-2 border-[#3D352E]">
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Batas Aman Harian (DSSL)
            </p>
            <p className="font-mono-num text-base font-extrabold text-[#3D352E]">
              {formatRupiah(report.dssl)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white border-2 border-[#3D352E]">
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Terpakai Hari Ini
            </p>
            <p className="font-mono-num text-base font-extrabold text-[#E06353]">
              {formatRupiah(report.todayTotalSpend)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white border-2 border-[#3D352E] col-span-2 sm:col-span-1">
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Butuh vs Ingin Hari Ini
            </p>
            <p className="font-mono-num text-xs font-extrabold text-[#3D352E] mt-1">
              🍱 {formatRupiah(report.todayNeedsSpend)} | 🧋{" "}
              {formatRupiah(report.todayWantsSpend)}
            </p>
          </div>
        </div>
      </CozyCard>

      {/* 2. Radar Bocor Halus (Formula 3: Micro-Leak / Latte Factor Detector) */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#EA2B2B]" />
            <div>
              <h2 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E]">
                🕵️‍♂️ Radar Bocor Halus (7 Hari Terakhir)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Mendeteksi jajan kecil berulang (&ge; 4x seminggu) yang diam-diam menguras dompet
              </p>
            </div>
          </div>
          {report.walletStatus !== "BENGKAK" && (
            <TactileButton
              variant="peach"
              size="sm"
              onClick={handleSimulateOverburn}
            >
              Uji Alarm Boros 🚨
            </TactileButton>
          )}
        </div>

        {report.microLeaks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E] text-xs sm:text-sm font-bold text-[#3D352E]">
            ✨ Bebas Bocor Halus! Minggu ini tidak ada kategori keinginan/jajan yang berulang berlebihan.
          </div>
        ) : (
          <div className="space-y-3">
            {report.microLeaks.map((leak, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#FFF7D6] border-2 border-[#3D352E] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#FF8B7B] border border-[#3D352E] text-xs font-extrabold">
                    Terdeteksi {leak.count}x Minggu Ini!
                  </span>
                  <span className="font-mono-num text-xs font-extrabold text-[#46A302] bg-[#E5F9D7] px-2.5 py-0.5 rounded-lg border border-[#3D352E]">
                    Potensi Hemat: {formatRupiah(leak.potentialSaving)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-[#3D352E] leading-relaxed">
                  {leak.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </CozyCard>

      {/* 3. Weekly & Monthly Automatic Calculation */}
      <CozyCard tone="vanilla" className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#3D352E]" />
          <h2 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E]">
            📊 Kalkulasi Otomatis Mingguan & Bulanan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white border-2 border-[#3D352E] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6E65]">
              <span>Total Pemasukan Bulan Ini</span>
              <Sparkles className="w-4 h-4 text-[#58CC02]" />
            </div>
            <p className="font-mono-num text-xl font-extrabold text-[#46A302]">
              {formatRupiah(report.totalIncomeThisMonth)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Target Tabungan Dikunci: {formatRupiah(report.monthlySavingTarget)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border-2 border-[#3D352E] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6E65]">
              <span>Total Terpakai Bulan Ini</span>
              <TrendingDown className="w-4 h-4 text-[#FF8B7B]" />
            </div>
            <p className="font-mono-num text-xl font-extrabold text-[#E06353]">
              {formatRupiah(report.totalSpentThisMonth)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Dari Kuota Belanja Aman: {formatRupiah(report.monthlySpendablePool)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#E0F4FF] border-2 border-[#3D352E] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#3D352E]">
              <span>Sisa Uang Minggu Ini</span>
              <Calendar className="w-4 h-4 text-[#1E88E5]" />
            </div>
            <p className="font-mono-num text-xl font-extrabold text-[#3D352E]">
              {formatRupiah(report.remainingWeeklyBudget)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Terpakai Minggu Ini: {formatRupiah(report.totalSpentThisWeek)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#3D352E]">
              <span>Sisa Uang Bulan Ini</span>
              <AlertTriangle className="w-4 h-4 text-[#46A302]" />
            </div>
            <p className="font-mono-num text-xl font-extrabold text-[#3D352E]">
              {formatRupiah(report.remainingTotalBalanceThisMonth)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Sisa Belanja (Di Luar Tabungan):{" "}
              {formatRupiah(report.remainingMonthlyPool)}
            </p>
          </div>
        </div>

        {/* Category Progress Bars */}
        <div className="bg-white rounded-2xl border-2 border-[#3D352E] p-4 space-y-3">
          <h3 className="font-fredoka text-base font-bold text-[#3D352E]">
            Distribusi Pengeluaran (Kebutuhan vs Keinginan)
          </h3>
          {report.categoryBreakdown.map((item) => (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span>
                  {item.emoji} {item.category}{" "}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F7F2E7] border border-[#3D352E] ml-1">
                    {item.group === "need" ? "NEEDS" : "WANTS"}
                  </span>
                </span>
                <span className="font-mono-num">
                  {formatRupiah(item.amount)} ({item.percentage}%)
                </span>
              </div>
              <ChunkyProgressBar
                value={item.percentage}
                max={100}
                variant={item.group === "need" ? "sky" : "peach"}
              />
            </div>
          ))}
        </div>
      </CozyCard>
    </div>
  );
}

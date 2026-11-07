"use client";

import React, { useMemo } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import { CustomizablePetAvatar } from "@/components/illustrations/PetAvatarSystem";
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";
import { formatCompactRupiah } from "@/lib/utils";

export default function SpendingDetectivePage() {
  const {
    activeProfileId,
    profiles,
    transactions,
    isProudComboActive,
    addTransaction,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.id === activeProfileId && p.role === "user") ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const userTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === userProfile.id),
    [transactions, userProfile.id]
  );

  const levelInfo = getLevelFromXp(userProfile.xp);
  const currentStage = userProfile.currentStage || 1;
  const petName = userProfile.petCustomName || "Mochi";

  const report = analyzeSpendingDetective({
    transactions: userTransactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    currentStage,
    petCustomName: petName,
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
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      {/* 1. Spending Detective Report Card (Single Soft Pastel Hero Card) */}
      <CozyCard
        tone={
          report.statusColor === "matcha"
            ? "matcha"
            : report.statusColor === "honey"
            ? "honey"
            : "peach"
        }
        className="p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          <div className="w-36 h-40 rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 p-1.5">
            <CustomizablePetAvatar
              species={userProfile.activeSpecies || "chubby_cat"}
              stage={currentStage}
              mood={report.petMood}
              customName={petName}
              equippedAccessories={userProfile.equippedAccessories}
              className="w-32 h-36"
            />
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-[#E6DFD2] text-xs font-display font-extrabold">
              <CozyIcon name="detective_radar" size={18} />
              <span>Status Dompet: {report.walletStatus}</span>
              <span>•</span>
              <span className="tabular-nums">DOI: {report.doi}x</span>
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E]">
              {report.statusTitle}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#3D352E]/90">
              {report.statusDescription}
            </p>
          </div>
        </div>

        {/* Formula 1 & Formula 2 Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] min-w-0">
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Batas Aman Harian (DSSL)
            </p>
            <p
              className="font-display font-extrabold tabular-nums text-base text-[#2E6F00] break-words"
              title={formatRupiah(report.dssl)}
            >
              {formatCompactRupiah(report.dssl)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] min-w-0">
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Terpakai Hari Ini
            </p>
            <p
              className="font-display font-extrabold tabular-nums text-base text-[#C83E2B] break-words"
              title={formatRupiah(report.todayTotalSpend)}
            >
              -{formatCompactRupiah(report.todayTotalSpend)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] col-span-2 sm:col-span-1 min-w-0">
            <p className="text-[11px] font-bold text-[#7A6E65]">
              Butuh vs Ingin Hari Ini
            </p>
            <p className="font-display font-extrabold tabular-nums text-xs text-[#3D352E] mt-1 break-words">
              Butuh {formatCompactRupiah(report.todayNeedsSpend)} | Ingin{" "}
              {formatCompactRupiah(report.todayWantsSpend)}
            </p>
          </div>
        </div>
      </CozyCard>

      {/* 2. Radar Bocor Halus (Neutral White Card) */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CozyIcon name="warning_siren" size={28} animated />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                Radar Bocor Halus {petName} (7 Hari Terakhir)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Mendeteksi jajan kecil berulang (&ge; 4x seminggu) yang diam-diam
                menguras dompet
              </p>
            </div>
          </div>
          {report.walletStatus !== "BENGKAK" && (
            <TactileButton
              variant="peach"
              size="sm"
              onClick={handleSimulateOverburn}
            >
              <CozyIcon name="warning_siren" size={18} /> Uji Alarm Boros
            </TactileButton>
          )}
        </div>

        {report.microLeaks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs sm:text-sm font-bold text-[#2E6F00] flex items-center gap-2">
            <CozyIcon name="check_badge" size={22} />
            <span>
              Bebas Bocor Halus! Minggu ini tidak ada kategori keinginan/jajan
              yang berulang berlebihan.
            </span>
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            {report.microLeaks.map((leak, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C] space-y-2 min-w-0 overflow-hidden"
              >
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#FF8B7B] text-white text-xs font-display font-extrabold">
                    Terdeteksi {leak.count}x Minggu Ini!
                  </span>
                  <span className="font-display font-extrabold tabular-nums text-xs text-[#2E6F00] bg-[#EFFBE6] px-2.5 py-0.5 rounded-lg border border-[#C3EFA4]">
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

      {/* 3. Weekly & Monthly Automatic Calculation (Neutral White Card) */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="detective_radar" size={28} />
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
            Kalkulasi Otomatis Mingguan & Bulanan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6E65]">
              <span>Total Pemasukan Bulan Ini</span>
              <CozyIcon name="cat_income" size={20} />
            </div>
            <p
              className="font-display font-extrabold tabular-nums text-xl text-[#2E6F00] break-words"
              title={formatRupiah(report.totalIncomeThisMonth)}
            >
              +{formatCompactRupiah(report.totalIncomeThisMonth)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65] break-words tabular-nums">
              Target Tabungan Dikunci:{" "}
              {formatCompactRupiah(report.monthlySavingTarget)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6E65]">
              <span>Total Terpakai Bulan Ini</span>
              <CozyIcon name="cat_snack" size={20} />
            </div>
            <p
              className="font-display font-extrabold tabular-nums text-xl text-[#C83E2B] break-words"
              title={formatRupiah(report.totalSpentThisMonth)}
            >
              -{formatCompactRupiah(report.totalSpentThisMonth)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65] break-words tabular-nums">
              Dari Kuota Belanja Aman:{" "}
              {formatCompactRupiah(report.monthlySpendablePool)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6E65]">
              <span>Sisa Uang Minggu Ini</span>
              <CozyIcon name="calendar_streak" size={20} />
            </div>
            <p
              className="font-display font-extrabold tabular-nums text-xl text-[#2E6F00] break-words"
              title={formatRupiah(report.remainingWeeklyBudget)}
            >
              {formatCompactRupiah(report.remainingWeeklyBudget)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65] break-words tabular-nums">
              Terpakai Minggu Ini: -{formatCompactRupiah(report.totalSpentThisWeek)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A6E65]">
              <span>Sisa Uang Bulan Ini</span>
              <CozyIcon name="cat_saving" size={20} />
            </div>
            <p
              className="font-display font-extrabold tabular-nums text-xl text-[#2E6F00] break-words"
              title={formatRupiah(report.remainingTotalBalanceThisMonth)}
            >
              {formatCompactRupiah(report.remainingTotalBalanceThisMonth)}
            </p>
            <p className="text-[11px] font-bold text-[#7A6E65] break-words tabular-nums">
              Sisa Belanja (Di Luar Tabungan):{" "}
              {formatCompactRupiah(report.remainingMonthlyPool)}
            </p>
          </div>
        </div>

        {/* Category Progress Bars */}
        <div className="bg-[#F7F3EB] rounded-2xl border-2 border-[#E6DFD2] p-4 space-y-3 min-w-0 overflow-hidden">
          <h3 className="font-display text-base font-extrabold text-[#3D352E]">
            Distribusi Pengeluaran (Kebutuhan vs Keinginan)
          </h3>
          {report.categoryBreakdown.map((item) => (
            <div key={item.category} className="space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs font-extrabold min-w-0">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <CategoryIcon category={item.category} size={18} />
                  <span className="truncate">{item.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E6DFD2] shrink-0">
                    {item.group === "need" ? "NEEDS" : "WANTS"}
                  </span>
                </span>
                <span className="font-display font-extrabold tabular-nums shrink-0">
                  {formatCompactRupiah(item.amount)} ({item.percentage}%)
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

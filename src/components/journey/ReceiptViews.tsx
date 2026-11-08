"use client";

/**
 * Tampilan struk & ringkasan kas yang dipakai halaman /app/journey.
 * Tabungan (type "saving") ditampilkan biru dengan ikon celengan, BUKAN merah seperti pengeluaran.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import type { SpendingDetectiveReport } from "@/lib/spending-detective";
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
import { TactileButton, CozyCard, ChunkyProgressBar, formatRupiah } from "@/components/ui/CozyPrimitives";
import { parseLocalDate } from "@/lib/dates";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type TxList = ReturnType<typeof useBukuDompetStore.getState>["transactions"];

export function WeeklySummary({
  report,
  weeklyTransactions,
}: {
  report: SpendingDetectiveReport;
  weeklyTransactions: TxList;
}) {
  const [showAllWeeklyTx, setShowAllWeeklyTx] = useState<boolean>(false);
  const visibleWeeklyTx = showAllWeeklyTx ? weeklyTransactions : weeklyTransactions.slice(0, 5);
  return (
    <CozyCard tone="white" className="space-y-4">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">
            Ringkasan Kas Mingguan (7 Hari)
          </h2>
          <p className="text-xs font-bold text-[#7A6E65]">
            Otomatis menghitung pengeluaran & sisa jatah mingguanmu
          </p>
        </div>
        <CozyIcon name="calendar_streak" size={30} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Jatah Mingguan Aman
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#3D352E] break-words mt-0.5">
            {formatRupiah(report.weeklyBudgetAllowance)}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Terpakai Minggu Ini
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#C83E2B] break-words mt-0.5">
            -{formatRupiah(report.totalSpentThisWeek)}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Sisa Uang Minggu Ini
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#2E6F00] break-words mt-0.5">
            {formatRupiah(report.remainingWeeklyBudget)}
          </p>
        </div>
      </div>

      <ChunkyProgressBar
        value={report.remainingWeeklyBudget}
        max={report.weeklyBudgetAllowance}
        variant="sky"
        label="Sisa Kuota Mingguan"
        showFraction
      />

      <div className="space-y-2.5 pt-2 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-display text-base font-extrabold text-[#3D352E]">
            Daftar Transaksi 7 Hari Terakhir
          </h3>
          <span className="text-xs font-display font-extrabold text-[#7A6E65]">
            {weeklyTransactions.length} Transaksi
          </span>
        </div>
        {visibleWeeklyTx.map((tx) => (
          <ReceiptCardItem key={tx.id} tx={tx} />
        ))}
        {weeklyTransactions.length > 5 && (
          <TactileButton
            variant="cream"
            size="sm"
            fullWidth
            onClick={() => setShowAllWeeklyTx((prev) => !prev)}
          >
            {showAllWeeklyTx
              ? <>Sembunyikan Sebagian <ChevronUp className="w-4 h-4" aria-hidden="true" /></>
              : <>Lihat Semua ({weeklyTransactions.length} Transaksi) <ChevronDown className="w-4 h-4" aria-hidden="true" /></>}
          </TactileButton>
        )}
      </div>
    </CozyCard>
  );
}

export function MonthlySummary({ report }: { report: SpendingDetectiveReport }) {
  return (
    <CozyCard tone="white" className="space-y-4">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">
            Ringkasan Kas Bulanan & Target Tabungan
          </h2>
          <p className="text-xs font-bold text-[#7A6E65]">
            Sisa {report.remainingDaysInMonth} hari lagi di bulan ini
          </p>
        </div>
        <CozyIcon name="cat_saving" size={30} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Total Uang Saku Bulanan
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#2E6F00] break-words mt-0.5">
            +{formatRupiah(report.monthlyAllowance)}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Target Tabungan Dikunci
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#4A3500] break-words mt-0.5">
            {formatRupiah(report.monthlySavingTarget)}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Total Terpakai Bulan Ini
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#C83E2B] break-words mt-0.5">
            -{formatRupiah(report.totalSpentThisMonth)}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] min-w-0">
          <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
            Sisa Uang Bulan Ini
          </p>
          <p className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#2E6F00] break-words mt-0.5">
            {formatRupiah(report.remainingTotalBalanceThisMonth)}
          </p>
        </div>
      </div>

      <ChunkyProgressBar
        value={report.remainingMonthlyPool}
        max={report.monthlySpendablePool}
        variant="matcha"
        label="Sisa Jatah Belanja Bulanan (Di Luar Tabungan)"
        showFraction
      />

      <div className="space-y-2 pt-2 min-w-0">
        <h3 className="font-display text-base font-extrabold text-[#3D352E]">
          Porsi Pengeluaran per Kategori
        </h3>
        {report.categoryBreakdown.map((cat) => (
          <div
            key={cat.category}
            className="p-3 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] flex items-center justify-between gap-2 flex-wrap min-w-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CategoryIcon category={cat.category} size={26} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-display font-extrabold text-[#3D352E] leading-snug break-words">
                  {cat.category}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E6DFD2]">
                  {cat.group === "need" ? "Kebutuhan" : "Keinginan"} •{" "}
                  {cat.percentage}%
                </span>
              </div>
            </div>
            <span className="font-display font-extrabold tabular-nums text-sm text-[#3D352E] shrink-0">
              {formatRupiah(cat.amount)}
            </span>
          </div>
        ))}
      </div>
    </CozyCard>
  );
}

export function TransactionDayFeed({
  dateStr,
  transactions,
  onAddClick,
}: {
  dateStr: string;
  transactions: TxList;
  onAddClick: () => void;
}) {
  const [showAll, setShowAll] = useState<boolean>(false);

  const formattedDate = parseLocalDate(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const visibleTx = showAll ? transactions : transactions.slice(0, 5);

  return (
    <CozyCard tone="white" className="space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="missions_scroll" size={26} />
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug break-words">
              Struk & Rincian Kas ({formattedDate})
            </h3>
            <p className="text-xs font-bold text-[#7A6E65]">
              {transactions.length} transaksi tercatat pada hari ini (Maks. 3
              transaksi berpoin/hari)
            </p>
          </div>
        </div>
        <TactileButton
          variant="matcha"
          size="sm"
          onClick={onAddClick}
          className="shrink-0"
        >
          <CozyIcon name="plus_record" size={16} /> + Catat Kas
        </TactileButton>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-2">
          <p className="font-display text-base font-extrabold text-[#3D352E]">
            Belum ada catatan kas di tanggal ini!
          </p>
          <p className="text-xs font-bold text-[#7A6E65]">
            Catat struk belanjamu secara Rinci (&ge;2 sub-item) untuk dapat +10
            Poin & +20 Stage XP!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 min-w-0">
          {visibleTx.map((tx) => (
            <ReceiptCardItem key={tx.id} tx={tx} />
          ))}
          {transactions.length > 5 && (
            <TactileButton
              variant="cream"
              size="sm"
              fullWidth
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll
                ? <>Sembunyikan Sebagian <ChevronUp className="w-4 h-4" aria-hidden="true" /></>
                : <>Lihat Semua ({transactions.length} Transaksi) <ChevronDown className="w-4 h-4" aria-hidden="true" /></>}
            </TactileButton>
          )}
        </div>
      )}
    </CozyCard>
  );
}

export function ReceiptCardItem({
  tx,
}: {
  tx: TxList[number];
}) {
  const [expanded, setExpanded] = useState<boolean>(true);

  return (
    <div className="rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-white p-3.5 transition-all min-w-0 max-w-full overflow-hidden">
      <div
        onClick={() => {
          if (tx.items && tx.items.length > 0) {
            soundEffects.tactileClick();
            setExpanded(!expanded);
          }
        }}
        className="flex items-start sm:items-center justify-between gap-3 cursor-pointer flex-wrap sm:flex-nowrap min-w-0"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0",
              tx.type === "income"
                ? "bg-[#EFFBE6] border-[#C3EFA4]"
                : tx.type === "saving"
                ? "bg-[#EEF8FF] border-[#BCE3FF]"
                : tx.need_or_want === "need"
                ? "bg-[#EEF8FF] border-[#BCE3FF]"
                : "bg-[#FFF2F0] border-[#FFCDC6]"
            )}
          >
            <CategoryIcon category={tx.category} size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] leading-snug break-words">
                {tx.title}
              </p>
              {tx.is_itemized && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-0.5 shrink-0">
                  <Sparkles className="w-3 h-3" /> Rinci
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-[#7A6E65] mt-0.5">
              <span>{tx.category}</span>
              {tx.points_earned > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[#4A3500] bg-[#FFFBEB] px-1.5 py-0.2 rounded border border-[#FDE08D] font-display font-extrabold shrink-0">
                  <CozyIcon name="coin_rupiah" size={13} />+{tx.points_earned}{" "}
                  Poin
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span
            className={cn(
              "font-display text-sm sm:text-base font-extrabold tabular-nums break-words",
              tx.type === "income"
                ? "text-[#2E6F00]"
                : tx.type === "saving"
                ? "text-[#1565C0]"
                : "text-[#C83E2B]"
            )}
          >
            {tx.type === "income" ? "+" : tx.type === "saving" ? <GlyphInline name="piggy" className="mr-0.5" /> : "-"}
            {formatRupiah(tx.total_amount)}
          </span>
          {tx.items && tx.items.length > 0 && (
            <span className="p-1 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2]">
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Sub-items receipt breakdown */}
      <AnimatePresence>
        {expanded && tx.items && tx.items.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-2.5 border-t-2 border-dashed border-[#E6DFD2] space-y-1.5">
              {tx.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs font-bold text-[#7A6E65] gap-2 flex-wrap min-w-0"
                >
                  <span className="leading-snug break-words">
                    • {item.item_name}{" "}
                    <span className="text-[#3D352E]">x{item.quantity}</span>
                  </span>
                  <span className="tabular-nums font-extrabold text-[#3D352E] shrink-0">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

/**
 * Panel "Investigasi Inspektur Saku (Detektif Kas)" — hasil penggabungan halaman /app/detective
 * ke dalam /app/journey (Versi 5.0).
 * - Pengguna dewasa: laporan penuh (status dompet, Bocor Halus, kalkulasi mingguan/bulanan, distribusi kategori).
 * - Anak SD: versi lembut (tabungan celengan + ringkasan perasaan), tanpa istilah boros/bengkak.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useMemo } from "react";
import { InspectorSakuOwl, EmotionWheelIcon, PiggyVaultIllustration, EMOTION_KEYS, EMOTION_LABEL, type InspectorSakuMood } from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
import { TactileButton, CozyCard, ChunkyProgressBar, formatRupiah } from "@/components/ui/CozyPrimitives";
import type { SpendingDetectiveReport } from "@/lib/spending-detective";
import { useFamilyStore } from "@/store/useFamilyStore";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { localDateStr, addDaysStr } from "@/lib/dates";
import { soundEffects } from "@/lib/sound-effects";
import { formatCompactRupiah } from "@/lib/utils";

interface Props {
  profileId: string;
  isKid: boolean;
  petName: string;
  report: SpendingDetectiveReport;
  owlMood: InspectorSakuMood;
  /** Hanya dipakai pengguna dewasa untuk tombol "Uji Alarm Boros". */
  onSimulateOverburn?: () => void;
  onOpenSavings: () => void;
}

export function owlMoodFromReport(report: SpendingDetectiveReport, isProud: boolean): InspectorSakuMood {
  if (isProud) return "proud";
  if (report.walletStatus === "BENGKAK") return "danger_siren";
  if (report.walletStatus === "WASPADA" || report.walletStatus === "PENTING_TERDETEKSI") return "warning";
  return "safe";
}

export function DetectiveInvestigation(props: Props) {
  return props.isKid ? <KidInvestigation {...props} /> : <AdultInvestigation {...props} />;
}

/* ───────────────────────── Versi dewasa ───────────────────────── */

function AdultInvestigation({ petName, report, owlMood, onSimulateOverburn }: Props) {
  const tone = report.statusColor === "matcha" ? "matcha" : report.statusColor === "honey" ? "honey" : "peach";
  return (
    <div className="space-y-5 min-w-0">
      <CozyCard tone={tone} className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          <div className="w-36 h-40 rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 p-1.5">
            <InspectorSakuOwl mood={owlMood} className="w-32 h-36" />
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-[#E6DFD2] text-xs font-display font-extrabold flex-wrap justify-center">
              <CozyIcon name="detective_radar" size={18} />
              <span>Status Dompet: {report.walletStatus}</span>
              <span>•</span>
              <span className="tabular-nums">DOI: {report.doi}x</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug break-words">
              {report.statusTitle}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-[#3D352E]/90 leading-relaxed break-words">
              {report.statusDescription}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] min-w-0">
            <p className="text-[11px] font-bold text-[#7A6E65]">Batas Aman Harian (DSSL)</p>
            <p className="font-display font-extrabold tabular-nums text-base text-[#2E6F00] break-words" title={formatRupiah(report.dssl)}>
              {formatCompactRupiah(report.dssl)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] min-w-0">
            <p className="text-[11px] font-bold text-[#7A6E65]">Terpakai Hari Ini</p>
            <p className="font-display font-extrabold tabular-nums text-base text-[#C83E2B] break-words" title={formatRupiah(report.todayTotalSpend)}>
              -{formatCompactRupiah(report.todayTotalSpend)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] col-span-2 sm:col-span-1 min-w-0">
            <p className="text-[11px] font-bold text-[#7A6E65]">Butuh vs Ingin Hari Ini</p>
            <p className="font-display font-extrabold tabular-nums text-xs text-[#3D352E] mt-1 break-words">
              Butuh {formatCompactRupiah(report.todayNeedsSpend)} | Ingin {formatCompactRupiah(report.todayWantsSpend)}
            </p>
          </div>
        </div>
      </CozyCard>

      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CozyIcon name="warning_siren" size={28} animated />
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                Radar Bocor Halus {petName} (7 Hari Terakhir)
              </h3>
              <p className="text-xs font-bold text-[#7A6E65] leading-snug">
                Mendeteksi jajan kecil berulang (&ge; 4x seminggu) yang diam-diam menguras dompet
              </p>
            </div>
          </div>
          {report.walletStatus !== "BENGKAK" && onSimulateOverburn && (
            <TactileButton variant="peach" size="sm" onClick={onSimulateOverburn}>
              <CozyIcon name="warning_siren" size={18} /> Uji Alarm Boros
            </TactileButton>
          )}
        </div>

        {report.microLeaks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs sm:text-sm font-bold text-[#2E6F00] flex items-center gap-2">
            <CozyIcon name="check_badge" size={22} />
            <span>Bebas Bocor Halus! Minggu ini tidak ada kategori keinginan/jajan yang berulang berlebihan.</span>
          </div>
        ) : (
          <div className="space-y-3 min-w-0">
            {report.microLeaks.map((leak, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C] space-y-2 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#FF8B7B] text-white text-xs font-display font-extrabold">
                    Terdeteksi {leak.count}x Minggu Ini!
                  </span>
                  <span className="font-display font-extrabold tabular-nums text-xs text-[#2E6F00] bg-[#EFFBE6] px-2.5 py-0.5 rounded-lg border border-[#C3EFA4]">
                    Potensi Hemat: {formatRupiah(leak.potentialSaving)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-[#3D352E] leading-relaxed break-words">{leak.message}</p>
              </div>
            ))}
          </div>
        )}
      </CozyCard>

      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="detective_radar" size={28} />
          <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
            Kalkulasi Otomatis Mingguan & Bulanan
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatTile label="Total Pemasukan Bulan Ini" icon="cat_income" value={`+${formatCompactRupiah(report.totalIncomeThisMonth)}`} full={formatRupiah(report.totalIncomeThisMonth)} valueCls="text-[#2E6F00]" note={`Target Tabungan Dikunci: ${formatCompactRupiah(report.monthlySavingTarget)}`} />
          <StatTile label="Total Terpakai Bulan Ini" icon="cat_snack" value={`-${formatCompactRupiah(report.totalSpentThisMonth)}`} full={formatRupiah(report.totalSpentThisMonth)} valueCls="text-[#C83E2B]" note={`Dari Kuota Belanja Aman: ${formatCompactRupiah(report.monthlySpendablePool)}`} />
          <StatTile label="Sisa Uang Minggu Ini" icon="calendar_streak" value={formatCompactRupiah(report.remainingWeeklyBudget)} full={formatRupiah(report.remainingWeeklyBudget)} valueCls="text-[#2E6F00]" note={`Terpakai Minggu Ini: -${formatCompactRupiah(report.totalSpentThisWeek)}`} />
          <StatTile label="Sisa Uang Bulan Ini" icon="cat_saving" value={formatCompactRupiah(report.remainingTotalBalanceThisMonth)} full={formatRupiah(report.remainingTotalBalanceThisMonth)} valueCls="text-[#2E6F00]" note={`Sisa Belanja (Di Luar Tabungan): ${formatCompactRupiah(report.remainingMonthlyPool)}`} />
        </div>

        <div className="bg-[#F7F3EB] rounded-2xl border-2 border-[#E6DFD2] p-4 space-y-3 min-w-0 overflow-hidden">
          <h4 className="font-display text-base font-extrabold text-[#3D352E]">Distribusi Pengeluaran (Kebutuhan vs Keinginan)</h4>
          {report.categoryBreakdown.length === 0 && (
            <p className="text-xs font-bold text-[#7A6E65]">Belum ada pengeluaran bulan ini. Dompetmu masih bersih!</p>
          )}
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
              <ChunkyProgressBar value={item.percentage} max={100} variant={item.group === "need" ? "sky" : "peach"} />
            </div>
          ))}
        </div>
      </CozyCard>
    </div>
  );
}

function StatTile({
  label,
  icon,
  value,
  full,
  valueCls,
  note,
}: {
  label: string;
  icon: "cat_income" | "cat_snack" | "calendar_streak" | "cat_saving";
  value: string;
  full: string;
  valueCls: string;
  note: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] space-y-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#7A6E65]">
        <span className="leading-snug break-words">{label}</span>
        <CozyIcon name={icon} size={20} className="shrink-0" />
      </div>
      <p className={`font-display font-extrabold tabular-nums text-xl break-words ${valueCls}`} title={full}>
        {value}
      </p>
      <p className="text-[11px] font-bold text-[#7A6E65] break-words tabular-nums">{note}</p>
    </div>
  );
}

/* ───────────────────────── Versi Anak SD (lembut) ───────────────────────── */

function KidInvestigation({ profileId, petName, onOpenSavings }: Props) {
  const goals = useFamilyStore((s) => s.goals);
  const stories = useFamilyStore((s) => s.stories);
  const transactions = useBukuDompetStore((s) => s.transactions);

  const myGoals = useMemo(() => goals.filter((g) => g.userId === profileId), [goals, profileId]);
  const activeGoal = myGoals.find((g) => !g.completedAt) ?? myGoals[0];
  const pct = activeGoal && activeGoal.targetAmount > 0 ? Math.min(100, Math.round((activeGoal.savedAmount / activeGoal.targetAmount) * 100)) : 0;

  const totalSaved = useMemo(
    () => transactions.filter((t) => t.user_id === profileId && t.type === "saving").reduce((s, t) => s + Number(t.total_amount), 0),
    [transactions, profileId]
  );

  const weekStart = addDaysStr(localDateStr(), -6);
  const weekStories = useMemo(
    () => stories.filter((s) => s.userId === profileId && s.date >= weekStart),
    [stories, profileId, weekStart]
  );
  const emotionCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of weekStories) if (s.emotion) map[s.emotion] = (map[s.emotion] ?? 0) + 1;
    return map;
  }, [weekStories]);
  const hasEmotion = Object.keys(emotionCount).length > 0;

  return (
    <div className="space-y-5 min-w-0">
      <CozyCard tone="honey" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          <div className="w-36 h-40 rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0 p-1.5">
            <InspectorSakuOwl mood={weekStories.length > 0 ? "proud" : "safe"} className="w-32 h-36" />
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">
              Inspektur Saku &amp; {petName} Mengamati Petualanganmu
            </h2>
            <p className="text-sm font-bold text-[#3D352E]/90 leading-relaxed break-words">
              {weekStories.length > 0
                ? `Minggu ini kamu sudah menulis ${weekStories.length} cerita. Hebat sekali!`
                : "Belum ada cerita minggu ini. Yuk tulis satu cerita kecil hari ini!"}
            </p>
          </div>
        </div>
      </CozyCard>

      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <CozyIcon name="cat_saving" size={28} />
          <h3 className="font-display text-lg font-extrabold text-[#3D352E] leading-snug break-words">Celengan Impianku</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
          <PiggyVaultIllustration progressPercent={pct} className="w-36 h-36 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0 w-full">
            {activeGoal ? (
              <>
                <p className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">{activeGoal.name}</p>
                <ChunkyProgressBar value={activeGoal.savedAmount} max={activeGoal.targetAmount} variant="honey" label="Tabungan terkumpul" showFraction />
                <p className="text-xs font-bold text-[#7A6E65] tabular-nums break-words">
                  {formatRupiah(activeGoal.savedAmount)} dari {formatRupiah(activeGoal.targetAmount)}
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-[#7A6E65] leading-relaxed">
                Belum ada tujuan celengan. Buat satu tujuan, misalnya sepeda atau buku baru.
              </p>
            )}
            <p className="text-xs font-bold text-[#7A6E65]">Total uang yang sudah kamu tabung: <span className="text-[#2E6F00] tabular-nums">{formatRupiah(totalSaved)}</span></p>
            <TactileButton
              variant="sky"
              size="sm"
              onClick={() => {
                soundEffects.tactileClick();
                onOpenSavings();
              }}
            >
              <GlyphInline name="piggy" /> Buka Celengan
            </TactileButton>
          </div>
        </div>
      </CozyCard>

      <CozyCard tone="white" className="space-y-3">
        <h3 className="font-display text-lg font-extrabold text-[#3D352E] leading-snug">Roda Perasaan 7 Hari Ini</h3>
        {hasEmotion ? (
          <div className="grid grid-cols-3 gap-2.5">
            {EMOTION_KEYS.map((k) => (
              <div key={k} className="p-2.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] flex flex-col items-center gap-1 min-w-0">
                <EmotionWheelIcon emotion={k} size={44} />
                <span className="text-[11px] font-display font-extrabold text-[#3D352E]">{EMOTION_LABEL[k]}</span>
                <span className="text-xs font-extrabold tabular-nums text-[#7A6E65]">{emotionCount[k] ?? 0}x</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[#7A6E65] leading-relaxed">
            Tulis cerita bertema perasaan supaya Roda Perasaanmu terisi.
          </p>
        )}
      </CozyCard>
    </div>
  );
}

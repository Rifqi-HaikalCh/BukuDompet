"use client";

/**
 * Tutup Buku Bulanan — sisi anak. Menampilkan ringkasan siklus, lalu membagi uang sisa sesuai kebijakan
 * yang ditetapkan Supervisor (pilih sendiri / otomatis ke Brankas / otomatis dibawa ke bulan depan).
 */
import React, { useMemo, useState } from "react";
import { CozySheet } from "@/components/ui/CozySheet";
import { CozyCard, TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { useFinanceStore } from "@/store/useFinanceStore";
import { splitSurplus, closingBonusPoints } from "@/lib/finance/closing";
import { notify } from "@/lib/notify";

const POLICY_COPY: Record<string, string> = {
  split_choice: "Kamu yang menentukan pembagian sisa uang.",
  auto_vault: "Sisa uang otomatis masuk Brankas Tabungan.",
  auto_carryover: "Sisa uang otomatis dibawa ke bulan depan.",
};

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs font-bold text-[#7A6E65]">{label}</span>
      <span className={strong ? "font-display text-base font-extrabold text-[#3D352E] tabular-nums" : "font-display text-sm font-extrabold text-[#3D352E] tabular-nums"}>{value}</span>
    </div>
  );
}

export function MonthlyClosingModal({
  open,
  onOpenChange,
  userId,
  cycleKey,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  cycleKey?: string;
}) {
  const preview = useFinanceStore((s) => s.previewClosing);
  const closeMonth = useFinanceStore((s) => s.closeMonth);
  // Pratinjau dihitung ulang tiap sheet dibuka agar mengikuti catatan terbaru.
  const pv = useMemo(() => (open ? preview(userId, cycleKey) : null), [open, preview, userId, cycleKey]);
  const [vaultPart, setVaultPart] = useState<number | null>(null);

  if (!pv) return null;
  const surplus = Math.max(0, pv.figures.surplus);
  const chosen = vaultPart ?? Math.floor(surplus / 2);
  const split = splitSurplus(pv.policy, surplus, pv.policy === "split_choice" ? chosen : undefined);
  const bonus = closingBonusPoints(split.savedToVaultAmount, pv.figures.mandatoryComplete);
  const step = surplus >= 100_000 ? 10_000 : surplus >= 20_000 ? 1_000 : 500;

  return (
    <CozySheet
      open={open}
      onOpenChange={onOpenChange}
      title="Tutup Buku Bulan Ini"
      description={`Siklus ${pv.cycleKey} • ${POLICY_COPY[pv.policy] ?? ""}`}
      icon={<GlyphInline name="calendar" className="w-7 h-7" />}
      footer={
        pv.alreadyClosed ? (
          <TactileButton type="button" variant="white" size="lg" fullWidth onClick={() => onOpenChange(false)}>
            Sudah ditutup
          </TactileButton>
        ) : (
          <TactileButton
            type="button"
            variant="matcha"
            size="lg"
            fullWidth
            onClick={() => {
              const res = closeMonth(userId, { cycleKey: pv.cycleKey, chosenVault: pv.policy === "split_choice" ? chosen : undefined });
              notify.result(res, "Buku ditutup", "Belum bisa ditutup");
              if (res.success) {
                setVaultPart(null);
                onOpenChange(false);
              }
            }}
          >
            Tutup Buku
          </TactileButton>
        )
      }
    >
      <div className="space-y-4">
        <CozyCard tone="white" className="divide-y divide-[#F0EADC]">
          <Row label="Uang yang tersedia" value={formatRupiah(pv.monthlyCash)} />
          <Row label="Pengeluaran pribadi" value={formatRupiah(pv.ownSpent)} />
          <Row label="Sudah ditabung" value={formatRupiah(pv.savedInCycle)} />
          <Row label={`Target tabungan wajib ${formatRupiah(pv.mandatorySavingsTarget)}`} value={pv.figures.mandatoryComplete ? "Genap" : "Belum genap"} />
          {pv.figures.topUp > 0 && <Row label="Dilengkapi otomatis dari sisa uang" value={formatRupiah(pv.figures.topUp)} />}
          <Row label="Sisa uang" value={formatRupiah(surplus)} strong />
        </CozyCard>

        {surplus > 0 && pv.policy === "split_choice" && (
          <CozyCard tone="sky" className="space-y-3">
            <p className="text-xs font-display font-extrabold text-[#3D352E]">Bagi sisa uangmu</p>
            <input
              type="range"
              min={0}
              max={surplus}
              step={step}
              value={Math.min(chosen, surplus)}
              onChange={(e) => setVaultPart(Number(e.target.value))}
              aria-label="Bagian untuk Brankas Tabungan"
              className="w-full accent-[#58CC02]"
            />
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-white border-2 border-[#E6DFD2] p-2">
                <p className="text-[11px] font-bold text-[#7A6E65]">Ke Brankas</p>
                <p className="font-display text-sm font-extrabold text-[#3D352E] tabular-nums">{formatRupiah(split.savedToVaultAmount)}</p>
              </div>
              <div className="rounded-2xl bg-white border-2 border-[#E6DFD2] p-2">
                <p className="text-[11px] font-bold text-[#7A6E65]">Bulan depan</p>
                <p className="font-display text-sm font-extrabold text-[#3D352E] tabular-nums">{formatRupiah(split.rolledOverAmount)}</p>
              </div>
            </div>
          </CozyCard>
        )}

        {surplus > 0 && pv.policy !== "split_choice" && (
          <CozyCard tone={pv.policy === "auto_vault" ? "matcha" : "honey"}>
            <p className="text-sm font-bold text-[#3D352E]">
              {pv.policy === "auto_vault" ? `${formatRupiah(split.savedToVaultAmount)} masuk Brankas Tabungan.` : `${formatRupiah(split.rolledOverAmount)} dibawa ke bulan depan.`}
            </p>
          </CozyCard>
        )}

        {!pv.alreadyClosed && bonus > 0 && (
          <p className="text-xs font-bold text-[#46A302]">Bonus penutupan: +{bonus} poin.</p>
        )}
      </div>
    </CozySheet>
  );
}

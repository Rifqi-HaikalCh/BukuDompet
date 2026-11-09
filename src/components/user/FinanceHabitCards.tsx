"use client";

/**
 * Dua kartu edukasi Versi 5.6:
 * - CashReconcileCard: "Cocokkan Saldo Nyata" + kartu kebocoran mikro mingguan (di Detektif Kas).
 * - VaultDipCard: "Pinjaman Darurat Internal" dari Brankas Tabungan (di Catat Tabungan).
 */
import React, { useMemo, useState } from "react";
import { CozyCard, TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozySheet } from "@/components/ui/CozySheet";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { recordedCash } from "@/lib/finance/ledger";
import { weeklyLeakStats } from "@/lib/finance/habits";
import { localDateStr } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { FinTx } from "@/lib/finance/types";

export function CashReconcileCard({ userId }: { userId: string }) {
  const txs = useBukuDompetStore((s) => s.transactions) as unknown as FinTx[];
  const wallets = useFinanceStore((s) => s.subWallets);
  const reconcile = useFinanceStore((s) => s.reconcileCash);
  const [actual, setActual] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const recorded = useMemo(() => recordedCash(txs, userId, wallets.filter((w) => w.userId === userId)), [txs, userId, wallets]);
  const leak = useMemo(() => weeklyLeakStats(txs, userId, localDateStr()), [txs, userId]);

  return (
    <CozyCard tone="sky" className="space-y-3">
      <h3 className="flex items-center gap-2 font-display text-sm font-extrabold text-[#3D352E]">
        <GlyphInline name="magnifier" className="w-5 h-5" /> Cocokkan Saldo Nyata
      </h3>
      <p className="text-xs font-bold text-[#7A6E65]">
        Menurut catatan, uangmu <span className="font-display font-extrabold text-[#3D352E] tabular-nums">{formatRupiah(Math.max(0, recorded))}</span>. Hitung uang yang benar-benar kamu pegang, lalu cocokkan.
      </p>
      <div className="flex items-end gap-2">
        <MoneyInput className="flex-1" label="Uang nyata sekarang" value={actual} onChange={setActual} />
        <TactileButton
          type="button"
          variant="matcha"
          size="md"
          disabled={actual === ""}
          onClick={() => {
            const res = reconcile(userId, toInt(actual));
            setMsg({ ok: res.success, text: res.message });
            if (res.success) setActual("");
          }}
        >
          Cocokkan
        </TactileButton>
      </div>
      {msg && (
        <p role="status" className={cn("text-xs font-extrabold", msg.ok ? "text-[#2E6F00]" : "text-[#C83E2B]")}>
          {msg.text}
        </p>
      )}
      {leak.count > 0 && (
        <div className="rounded-2xl bg-white border-2 border-[#BCE3FF] p-3">
          <p className="font-display text-xs font-extrabold text-[#3D352E]">Kebocoran mikro 7 hari</p>
          <p className="text-xs font-bold text-[#7A6E65] tabular-nums">
            {formatRupiah(leak.lossTotal)} uang tak tercatat ({leak.leakPercent}% dari total keluar). Biasakan catat jajan kecil sebelum lupa.
          </p>
        </div>
      )}
    </CozyCard>
  );
}

export function VaultDipCard({ userId }: { userId: string }) {
  const dip = useFinanceStore((s) => s.dipVault);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"recovery" | "approval">("recovery");
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-1.5">
        <TactileButton type="button" variant="white" size="md" fullWidth onClick={() => setOpen(true)}>
          <GlyphInline name="lifebuoy" /> Pinjam dari Celengan
        </TactileButton>
        <p className="px-1 text-center text-[11px] font-bold text-[#7A6E65] leading-snug">Hanya untuk keperluan mendadak, dan harus dikembalikan.</p>
      </div>
      <CozySheet
        open={open}
        onOpenChange={setOpen}
        title="Pinjam dari Celengan"
        description="Dompet Dana Darurat dipakai lebih dulu. Kekurangannya baru boleh diambil dari celengan dan harus dikembalikan."
        icon={<GlyphInline name="shield_check" className="w-7 h-7" />}
        footer={
          <TactileButton
            type="button"
            variant="matcha"
            size="lg"
            fullWidth
            onClick={() => {
              const res = dip({ userId, amount: toInt(amount), reason, mode });
              if (!res.success) {
                setErr(res.message);
                return;
              }
              notify.info(res.useEmergencyWallet ? "Pakai Dana Darurat" : "Pinjaman diproses", res.message);
              setAmount("");
              setReason("");
              setErr(null);
              setOpen(false);
            }}
          >
            Ajukan Pinjaman
          </TactileButton>
        }
      >
        <div className="space-y-4">
          <MoneyInput label="Jumlah dibutuhkan" value={amount} onChange={setAmount} />
          <label className="block">
            <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Alasan darurat</span>
            <input value={reason} maxLength={160} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: biaya berobat mendadak" className={FIELD_CLASS} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Cara pinjam">
            {(
              [
                { id: "recovery", label: "Misi Pemulihan", hint: "Cair langsung, kamu kembalikan ke Brankas" },
                { id: "approval", label: "Minta Persetujuan", hint: "Menunggu Supervisor menyetujui" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={mode === o.id}
                onClick={() => setMode(o.id)}
                className={cn(
                  "p-3 rounded-2xl border-2 text-left cursor-pointer",
                  mode === o.id ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302]" : "bg-[#F7F3EB] border-[#E6DFD2]",
                )}
              >
                <span className="block font-display text-xs font-extrabold text-[#3D352E]">{o.label}</span>
                <span className="block text-[11px] font-bold text-[#7A6E65]">{o.hint}</span>
              </button>
            ))}
          </div>
          {err && (
            <p role="alert" className="text-xs font-bold text-[#C83E2B]">
              {err}
            </p>
          )}
        </div>
      </CozySheet>
    </>
  );
}

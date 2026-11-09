"use client";

/** Komponen bersama panel Dompet & Celengan: judul seksi, sheet atur alokasi, dan sheet geser saldo. */
import React, { useState } from "react";
import { TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozySheet } from "@/components/ui/CozySheet";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { useFinanceStore } from "@/store/useFinanceStore";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { WalletView } from "@/lib/finance/context";

export function SectionTitle({ icon, children, aside }: { icon: GlyphName; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="flex items-center gap-2 font-display text-sm font-extrabold text-[#3D352E]">
        <GlyphInline name={icon} className="w-5 h-5" />
        {children}
      </h3>
      {aside}
    </div>
  );
}

export function ResultNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="text-xs font-bold text-[#C83E2B]">
      {text}
    </p>
  );
}

/* ───────────── sheet: atur alokasi satu dompet ───────────── */

export function AllocateSheet({ userId, wallet, unallocated, onClose }: { userId: string; wallet: WalletView | null; unallocated: number; onClose: () => void }) {
  const allocate = useFinanceStore((s) => s.allocate);
  const [mode, setMode] = useState<"add" | "sub">("add");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const n = toInt(amount);
  return (
    <CozySheet
      open={Boolean(wallet)}
      onOpenChange={(o) => {
        if (!o) {
          setAmount("");
          setErr(null);
          onClose();
        }
      }}
      title={wallet ? `Atur ${wallet.name}` : "Atur dompet"}
      description={wallet ? `Saldo ${formatRupiah(wallet.balance)} • dialokasikan ${formatRupiah(wallet.allocated)}` : ""}
      footer={
        <TactileButton
          type="button"
          variant="matcha"
          size="lg"
          fullWidth
          disabled={n <= 0}
          onClick={() => {
            if (!wallet) return;
            const res = allocate(userId, wallet.id, mode === "add" ? n : -n);
            if (!res.success) {
              setErr(res.message);
              return;
            }
            notify.success("Alokasi diperbarui", res.message);
            setAmount("");
            setErr(null);
            onClose();
          }}
        >
          Simpan
        </TactileButton>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis perubahan">
          {(
            [
              { id: "add", label: "Tambah dana" },
              { id: "sub", label: "Kurangi dana" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={mode === o.id}
              onClick={() => setMode(o.id)}
              className={cn(
                "px-3 py-2.5 rounded-2xl border-2 font-display text-xs font-extrabold cursor-pointer",
                mode === o.id ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302] text-[#3D352E]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <MoneyInput label="Jumlah" value={amount} onChange={setAmount} />
        <p className="text-xs font-bold text-[#7A6E65]">Uang belum dialokasikan: {formatRupiah(unallocated)}</p>
        <ResultNote text={err} />
      </div>
    </CozySheet>
  );
}

/* ───────────── sheet: geser saldo antar-dompet ───────────── */

export function TransferSheet({ userId, open, wallets, onOpenChange }: { userId: string; open: boolean; wallets: WalletView[]; onOpenChange: (o: boolean) => void }) {
  const transfer = useFinanceStore((s) => s.transferBalance);
  const usable = wallets.filter((w) => w.type !== "savings");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const src = usable.find((w) => w.id === from);
  return (
    <CozySheet
      open={open}
      onOpenChange={onOpenChange}
      title="Geser Saldo Antar-Dompet"
      description="Total uangmu tidak berubah, hanya pindah dompet. Alasan singkat wajib diisi."
      icon={<GlyphInline name="swap" className="w-7 h-7" />}
      footer={
        <TactileButton
          type="button"
          variant="matcha"
          size="lg"
          fullWidth
          onClick={() => {
            const res = transfer(userId, from, to, toInt(amount), reason);
            if (!res.success) {
              setErr(res.message);
              return;
            }
            notify.success("Saldo digeser", res.message);
            setAmount("");
            setReason("");
            setErr(null);
            onOpenChange(false);
          }}
        >
          Geser Saldo
        </TactileButton>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Dari dompet</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD_CLASS}>
            <option value="">Pilih dompet asal</option>
            {usable.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — sisa {formatRupiah(w.balance)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Ke dompet</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={FIELD_CLASS}>
            <option value="">Pilih dompet tujuan</option>
            {usable
              .filter((w) => w.id !== from)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </label>
        <MoneyInput label={src ? `Jumlah (maks. ${formatRupiah(src.balance)})` : "Jumlah"} value={amount} onChange={setAmount} />
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Alasan</span>
          <input value={reason} maxLength={80} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: uang jajan habis, butuh tambahan makan" className={FIELD_CLASS} />
        </label>
        <ResultNote text={err} />
      </div>
    </CozySheet>
  );
}

/* ───────────── panel utama ───────────── */

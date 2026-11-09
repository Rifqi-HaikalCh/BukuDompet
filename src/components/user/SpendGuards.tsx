"use client";

/**
 * Potongan UI untuk Laci Catat (Versi 5.6): pilih dompet, tandai patungan teman, tunda 48 jam untuk
 * keinginan besar, dan "Geser Saldo Antar-Dompet" saat saldo dompet kurang.
 */
import React, { useMemo, useState } from "react";
import { TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { isWalletLocked } from "@/lib/finance/wallets";
import { COOLING_HOURS, COOLING_THRESHOLD } from "@/lib/finance/habits";
import { localDateStr } from "@/lib/dates";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";
import type { WalletView } from "@/lib/finance/context";

export function WalletPicker({
  wallets,
  value,
  onChange,
}: {
  wallets: WalletView[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const usable = wallets.filter((w) => w.type === "operational" || w.type === "emergency" || w.type === "commitment" || w.type === "grant");
  if (usable.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-display font-extrabold text-[#7A6E65]">Bayar dari dompet</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {usable.map((w) => {
          const selected = w.id === value;
          const locked = w.type === "commitment" && isWalletLocked(w, localDateStr());
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                onChange(w.id);
              }}
              aria-pressed={selected}
              className={cn(
                "p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer min-w-0",
                selected ? "bg-white border-[#38B6FF] border-b-[4px] border-b-[#1E88E5]" : "bg-[#F7F3EB] border-[#E6DFD2]",
              )}
            >
              <span className="block font-display text-xs font-extrabold text-[#3D352E] leading-snug break-words">
                {w.type === "grant" && <GlyphInline name="gift" />} {w.name} {locked && <GlyphInline name="lock" />}
              </span>
              <span className={cn("block text-[11px] font-bold tabular-nums", w.balance <= 0 ? "text-[#C83E2B]" : "text-[#2E6F00]")}>
                Sisa {formatRupiah(Math.max(0, w.balance))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReimbursableToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        soundEffects.tactileClick();
        onChange(!checked);
      }}
      className={cn(
        "w-full flex items-center justify-between gap-3 p-3 rounded-2xl border-2 text-left cursor-pointer transition-all",
        checked ? "bg-[#EEF8FF] border-[#38B6FF]" : "bg-[#F7F3EB] border-[#E6DFD2]",
      )}
    >
      <span className="min-w-0">
        <span className="block font-display text-xs font-extrabold text-[#3D352E]">Patungan / titip bayar teman</span>
        <span className="block text-[11px] font-bold text-[#7A6E65] leading-snug">
          Uangmu tetap berkurang, tapi tidak dihitung boros. Nanti tandai &ldquo;Sudah Diganti Teman&rdquo; untuk mengembalikan saldo.
        </span>
      </span>
      <span className={cn("shrink-0 w-11 h-6 rounded-full border-2 relative transition-colors", checked ? "bg-[#38B6FF] border-[#1E88E5]" : "bg-white border-[#D4C9B4]")}>
        <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white border border-[#D4C9B4] transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/** Keinginan ≥ Rp50.000: tawarkan masa tunggu 48 jam sebelum dicatat. */
export function CoolingOffPanel({ amount, onPostpone, onBought }: { amount: number; onPostpone: () => void; onBought: () => void }) {
  return (
    <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] p-3 space-y-2.5" role="alert">
      <p className="font-display text-sm font-extrabold text-[#4A3500] leading-snug">
        <GlyphInline name="clock" /> Keinginan {formatRupiah(amount)} — tunggu {COOLING_HOURS} jam dulu?
      </p>
      <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
        Pembelian keinginan di atas {formatRupiah(COOLING_THRESHOLD)} paling aman dipikir ulang dua hari. Kalau setelah itu kamu batal beli, kamu dapat bonus Poin dan gelar Penahan Diri!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TactileButton type="button" variant="honey" size="md" fullWidth onClick={onPostpone}>
          Tunda {COOLING_HOURS} Jam
        </TactileButton>
        <TactileButton type="button" variant="white" size="md" fullWidth onClick={onBought}>
          Sudah terlanjur dibeli, catat
        </TactileButton>
      </div>
    </div>
  );
}

/** Saldo dompet kurang: transaksi ditahan, tawarkan geser saldo dari dompet lain dengan alasan singkat. */
export function ShortBalancePanel({
  target,
  shortBy,
  wallets,
  onTransfer,
  onCancel,
}: {
  target: WalletView;
  shortBy: number;
  wallets: WalletView[];
  onTransfer: (fromId: string, amount: number, reason: string) => string | null;
  onCancel: () => void;
}) {
  const sources = useMemo(
    () =>
      wallets
        .filter((w) => w.id !== target.id && (w.type === "operational" || w.type === "emergency" || w.type === "commitment") && w.balance > 0 && !isWalletLocked(w, localDateStr()))
        .sort((a, b) => b.balance - a.balance),
    [wallets, target.id],
  );
  const [fromId, setFromId] = useState<string>(sources[0]?.id ?? "");
  const [amount, setAmount] = useState<string>(String(shortBy));
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] p-3 space-y-2.5" role="alert">
      <p className="font-display text-sm font-extrabold text-[#8F2A1B] leading-snug">
        Saldo {target.name} kurang {formatRupiah(shortBy)}. Catatan ditahan dulu.
      </p>
      {sources.length === 0 ? (
        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Dompet lain juga belum punya saldo yang bisa digeser. Kurangi jumlah, atau bagi dulu uang ke dompet di halaman Beranda.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-display font-extrabold text-[#7A6E65]">Geser Saldo Antar-Dompet</p>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={FIELD_CLASS} aria-label="Ambil dari dompet">
            {sources.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} (sisa {formatRupiah(w.balance)})
              </option>
            ))}
          </select>
          <MoneyInput value={amount} onChange={setAmount} label="Jumlah digeser" />
          <label className="block">
            <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Alasan singkat</span>
            <input value={reason} maxLength={80} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: ada acara sekolah mendadak" className={FIELD_CLASS} />
          </label>
          {error && <p className="text-xs font-bold text-[#C83E2B]">{error}</p>}
          <TactileButton
            type="button"
            variant="sky"
            size="md"
            fullWidth
            onClick={() => {
              const err = onTransfer(fromId, toInt(amount), reason);
              setError(err);
            }}
          >
            Geser &amp; Lanjut Catat
          </TactileButton>
        </div>
      )}
      <button type="button" onClick={onCancel} className="text-xs font-display font-extrabold text-[#7A6E65] underline cursor-pointer">
        Batal, ganti dompet / jumlah
      </button>
    </div>
  );
}

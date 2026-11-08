"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CozySheet } from "@/components/ui/CozySheet";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { RollingNumber, TactileButton } from "@/components/ui/CozyPrimitives";
import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

/**
 * Modal "Kirim / Tukar Poin" beranimasi (Versi 5.1).
 *
 * Tujuan: anak SD paham bahwa saat Poin dikirim, Poin MILIKNYA BERKURANG dan PINDAH ke penerima.
 *  1) Konfirmasi: dua kartu jelas — "Poinmu −N (90 → 85)" dan "{Penerima} +N" + kalimat sederhana.
 *  2) Mengirim: koin terbang dari pengirim ke penerima, "−N" melayang dari pengirim, "+N" muncul di penerima.
 *  3) Selesai: saldo berhitung turun (NumberFlow), penerima melompat senang.
 * Aksi nyata (`execute`) dijalankan di klik konfirmasi; animasi hanyalah visualisasi dari hasil nyata itu.
 */
export interface TransferParty {
  name: string;
  caption?: string;
  visual: React.ReactNode;
}

export interface PointTransferModalProps {
  open: boolean;
  onClose: () => void;
  /** `gift`: hadiah ke anggota keluarga. `cashout`: tukar Poin jadi tiket Rupiah ke Admin. */
  mode: "gift" | "cashout";
  from: TransferParty;
  to: TransferParty;
  amount: number;
  amountOptions?: readonly number[];
  onAmountChange?: (n: number) => void;
  /** Saldo Poin pengirim SAAT INI (live dari store). */
  fromBalance: number;
  execute: () => { success: boolean; message: string };
  confirmLabel?: string;
  /** Keterangan tambahan di kartu penerima, mis. "= Rp5.000". */
  receiveNote?: string;
}

type Phase = "confirm" | "sending" | "done" | "error";

const FLIGHT_MS = 1700;

function Coin({ size = 26 }: { size?: number }) {
  return <GlyphIcon name="coin" size={size} />;
}

export function PointTransferModal({
  open,
  onClose,
  mode,
  from,
  to,
  amount,
  amountOptions,
  onAmountChange,
  fromBalance,
  execute,
  confirmLabel,
  receiveNote,
}: PointTransferModalProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [before, setBefore] = useState<number>(fromBalance);
  const [message, setMessage] = useState<string>("");
  const [prevOpen, setPrevOpen] = useState<boolean>(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setPhase("confirm");
      setMessage("");
      setBefore(fromBalance);
    }
  }

  useEffect(() => {
    if (phase !== "sending") return;
    const t = setTimeout(() => setPhase("done"), reduce ? 400 : FLIGHT_MS);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const shownBefore = phase === "confirm" ? fromBalance : before;
  const after = Math.max(0, shownBefore - amount);
  const notEnough = amount > shownBefore;
  const coinCount = Math.min(7, Math.max(3, Math.ceil(amount / 5)));
  const sendingOrDone = phase === "sending" || phase === "done";

  const confirm = () => {
    if (notEnough) return;
    setBefore(fromBalance);
    const res = execute();
    setMessage(res.message);
    if (res.success) {
      soundEffects.coinChime();
      setPhase("sending");
      setTimeout(() => fireCozyConfetti("normal"), reduce ? 0 : FLIGHT_MS - 200);
    } else {
      soundEffects.detectiveBuzz();
      setPhase("error");
    }
  };

  const title = mode === "gift" ? "Kirim Hadiah Poin" : "Tukar Poin jadi Tiket Rupiah";
  const unitWord = mode === "gift" ? "hadiah" : "tiket";

  return (
    <CozySheet
      open={open}
      onOpenChange={(o) => {
        if (!o && phase !== "sending") onClose();
      }}
      title={title}
      description={mode === "gift" ? "Poinmu berpindah ke temanmu" : "Poinmu ditukar jadi tiket untuk Abang"}
      icon={<GlyphIcon name="swap" size={30} />}
      maxWidthClass="md:max-w-md"
      footer={
        phase === "confirm" ? (
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <TactileButton variant="cream" fullWidth onClick={onClose}>
              Batal
            </TactileButton>
            <TactileButton variant="honey" fullWidth disabled={notEnough || amount <= 0} onClick={confirm}>
              <GlyphIcon name="send" size={18} /> {confirmLabel ?? `Kirim ${amount.toLocaleString("id-ID")} Poin`}
            </TactileButton>
          </div>
        ) : phase === "sending" ? (
          <TactileButton variant="cream" fullWidth disabled>
            Mengirim...
          </TactileButton>
        ) : (
          <TactileButton variant={phase === "done" ? "matcha" : "cream"} fullWidth onClick={onClose}>
            {phase === "done" ? "Selesai" : "Tutup"}
          </TactileButton>
        )
      }
    >
      <div className="space-y-4">
        {phase === "confirm" && amountOptions && onAmountChange && (
          <div className="space-y-1">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">Jumlah Poin</p>
            <ChipScroller label="Pilih jumlah Poin" watch={amount}>
              {amountOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={amount === n}
                  onClick={() => {
                    soundEffects.tactileClick();
                    onAmountChange(n);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl border-2 font-display text-sm font-extrabold tabular-nums cursor-pointer",
                    amount === n
                      ? "bg-[#FFC800] border-[#E5A400] text-[#4A3500] border-b-[3px]"
                      : "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-white"
                  )}
                >
                  {n.toLocaleString("id-ID")} Poin
                </button>
              ))}
            </ChipScroller>
          </div>
        )}

        {/* Panggung animasi: pengirim, koin terbang, penerima */}
        <div
          className="rounded-3xl bg-[#FFFBEB] border-2 border-[#FDE08D] p-3 sm:p-4"
          role="img"
          aria-label={`${from.name} mengirim ${amount} Poin ke ${to.name}`}
        >
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Pengirim */}
            <div className="relative flex flex-col items-center gap-1 w-[84px] sm:w-24 shrink-0 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">{from.visual}</div>
              <p className="font-display text-xs font-extrabold text-[#3D352E] leading-tight break-words">{from.name}</p>
              <AnimatePresence>
                {sendingOrDone && (
                  <motion.span
                    key="minus"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [6, -14, -22, -34] }}
                    transition={{ duration: reduce ? 0.2 : 1.4 }}
                    className="absolute -top-2 right-0 px-2 py-0.5 rounded-full bg-[#FFEAE6] border-2 border-[#FFCDC6] font-display text-xs font-extrabold text-[#C83E2B] tabular-nums"
                  >
                    −{amount.toLocaleString("id-ID")}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Lintasan koin */}
            <div className="relative flex-1 h-14 min-w-[56px]" aria-hidden="true">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-[3px] border-dashed border-[#E5C45A]" />
              <GlyphIcon
                name="arrow_right"
                size={22}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#E5A400] bg-[#FFFBEB]"
              />
              {phase === "confirm" || phase === "error" ? (
                <motion.span
                  className="absolute left-1/2 top-1/2 -ml-3 -mt-3"
                  animate={reduce ? undefined : { y: [0, -5, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Coin />
                </motion.span>
              ) : (
                Array.from({ length: coinCount }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-1/2 -mt-3"
                    initial={{ left: "0%", opacity: 0, scale: 0.6 }}
                    animate={
                      reduce
                        ? { left: "70%", opacity: 1, scale: 1 }
                        : { left: ["0%", "35%", "75%"], opacity: [0, 1, 0], scale: [0.6, 1.1, 0.8], y: [0, -12, 0] }
                    }
                    transition={{ duration: 0.95, delay: reduce ? 0 : i * 0.14, ease: "easeInOut" }}
                  >
                    <Coin />
                  </motion.span>
                ))
              )}
            </div>

            {/* Penerima */}
            <div className="relative flex flex-col items-center gap-1 w-[84px] sm:w-24 shrink-0 text-center">
              <motion.div
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"
                animate={phase === "done" && !reduce ? { y: [0, -10, 0, -6, 0], scale: [1, 1.06, 1] } : { y: 0 }}
                transition={{ duration: 0.7 }}
              >
                {to.visual}
              </motion.div>
              <p className="font-display text-xs font-extrabold text-[#3D352E] leading-tight break-words">{to.name}</p>
              <AnimatePresence>
                {sendingOrDone && (
                  <motion.span
                    key="plus"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: [0.4, 1.25, 1] }}
                    transition={{ duration: 0.45, delay: reduce ? 0 : 0.9 }}
                    className="absolute -top-2 left-0 px-2 py-0.5 rounded-full bg-[#EFFBE6] border-2 border-[#C3EFA4] font-display text-xs font-extrabold text-[#2E6F00] tabular-nums"
                  >
                    +{amount.toLocaleString("id-ID")}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Penjelasan berkurang / bertambah */}
        {phase !== "error" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] p-3 space-y-0.5">
              <p className="text-[10px] font-display font-extrabold uppercase tracking-wider text-[#8F2A1B]">Poinmu berkurang</p>
              <p className="font-display text-lg font-extrabold tabular-nums text-[#C83E2B]">−{amount.toLocaleString("id-ID")} Poin</p>
              <p className="text-xs font-bold text-[#6B5F56] tabular-nums inline-flex items-center gap-1.5 flex-wrap">
                {shownBefore.toLocaleString("id-ID")} <GlyphIcon name="arrow_right" size={14} />{" "}
                <span className={cn("font-extrabold", notEnough ? "text-[#C83E2B]" : "text-[#3D352E]")}>
                  {phase === "confirm" ? after.toLocaleString("id-ID") : <RollingNumber value={fromBalance} className="text-xs" />}
                </span>
              </p>
            </div>
            <div className="rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] p-3 space-y-0.5">
              <p className="text-[10px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00]">
                {to.name.split(" ")[0]} menerima
              </p>
              <p className="font-display text-lg font-extrabold tabular-nums text-[#2E6F00]">+{amount.toLocaleString("id-ID")} Poin</p>
              {receiveNote && <p className="text-xs font-bold text-[#6B5F56]">{receiveNote}</p>}
            </div>
          </div>
        )}

        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs sm:text-sm font-bold leading-relaxed break-words rounded-2xl px-3 py-2 border-2",
            phase === "error"
              ? "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]"
              : phase === "done"
              ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
              : "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]"
          )}
        >
          {phase === "confirm" &&
            (notEnough
              ? "Poinmu belum cukup untuk jumlah ini. Pilih jumlah yang lebih kecil ya."
              : `Kalau kamu kirim, Poinmu BERKURANG ${amount.toLocaleString("id-ID")} dan pindah ke ${to.name}. ${
                  mode === "gift" ? "Poin yang sudah dikirim tidak bisa diminta kembali." : "Tiket menunggu persetujuan Abang dulu."
                }`)}
          {phase === "sending" && `Koin sedang terbang ke ${to.name}...`}
          {(phase === "done" || phase === "error") && message}
          {phase === "done" && !message && `Hore! ${unitWord} terkirim.`}
        </p>
      </div>
    </CozySheet>
  );
}

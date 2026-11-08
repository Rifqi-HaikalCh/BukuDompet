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

const FLIGHT_MS = 1900;

/** Arah percikan kilau di penerima (tetap, tanpa acak). */
const SPARKS = [
  { x: -44, y: -30 },
  { x: 44, y: -30 },
  { x: -50, y: 12 },
  { x: 50, y: 12 },
  { x: 0, y: -50 },
  { x: 0, y: 46 },
] as const;

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
      icon={<GlyphIcon name="send" size={30} />}
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
                      : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFDF9]"
                  )}
                >
                  {n.toLocaleString("id-ID")} Poin
                </button>
              ))}
            </ChipScroller>
          </div>
        )}

        {/* Panggung: pengirim melempar koin melengkung ke penerima, lalu riak + kilau di penerima */}
        <div
          className="rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] p-3 sm:p-4 overflow-hidden"
          role="img"
          aria-label={`${from.name} mengirim ${amount} Poin ke ${to.name}`}
        >
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Pengirim */}
            <div className="relative flex flex-col items-center gap-1 w-[84px] sm:w-24 shrink-0 text-center">
              <motion.div
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"
                animate={phase === "sending" && !reduce ? { scaleX: [1, 1.1, 0.94, 1], scaleY: [1, 0.9, 1.06, 1] } : { scaleX: 1, scaleY: 1 }}
                transition={{ duration: 0.6 }}
              >
                {from.visual}
              </motion.div>
              <p className="font-display text-xs font-extrabold text-[#3D352E] leading-tight break-words">{from.name}</p>
              <AnimatePresence>
                {sendingOrDone && (
                  <motion.span
                    key="minus"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [6, -14, -22, -34] }}
                    transition={{ duration: reduce ? 0.2 : 1.4 }}
                    className="absolute -top-2 right-0 px-2 py-0.5 rounded-full bg-white border-2 border-[#E6DFD2] font-display text-xs font-extrabold text-[#3D352E] tabular-nums"
                  >
                    −{amount.toLocaleString("id-ID")}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Lintasan koin melengkung */}
            <div className="relative flex-1 h-20 min-w-[64px]" aria-hidden="true">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path d="M2 34 Q50 -10 98 34" fill="none" stroke="#E6DFD2" strokeWidth="2" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              </svg>
              {phase === "confirm" || phase === "error" ? (
                <motion.span
                  className="absolute left-1/2 top-[22%] -ml-3"
                  animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Coin />
                </motion.span>
              ) : (
                Array.from({ length: coinCount }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute bottom-[8%] -ml-3"
                    initial={{ left: "2%", opacity: 0, scale: 0.6 }}
                    animate={
                      reduce
                        ? { left: "92%", opacity: 1, scale: 1 }
                        : {
                            left: ["2%", "25%", "50%", "75%", "92%"],
                            y: [0, -34, -48, -34, 0],
                            opacity: [0, 1, 1, 1, 0],
                            scale: [0.6, 1.1, 1.15, 1.05, 0.7],
                            rotate: [0, 180, 360, 540, 720],
                          }
                    }
                    transition={{ duration: 1.05, delay: reduce ? 0 : i * 0.13, ease: "easeInOut" }}
                  >
                    <Coin />
                  </motion.span>
                ))
              )}
            </div>

            {/* Penerima */}
            <div className="relative flex flex-col items-center gap-1 w-[84px] sm:w-24 shrink-0 text-center">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {phase === "done" && !reduce && (
                  <>
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full border-4 border-[#FFC800]"
                      initial={{ scale: 0.6, opacity: 0.9 }}
                      animate={{ scale: 1.9, opacity: 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                    {SPARKS.map((sp, i) => (
                      <motion.span
                        key={i}
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 -ml-2 -mt-2"
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                        animate={{ x: sp.x, y: sp.y, opacity: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.05 * i, ease: "easeOut" }}
                      >
                        <GlyphIcon name="sparkle" size={16} />
                      </motion.span>
                    ))}
                  </>
                )}
                <motion.div
                  className="relative w-full h-full flex items-center justify-center"
                  animate={phase === "done" && !reduce ? { y: [0, -10, 0, -6, 0], scale: [1, 1.08, 1] } : { y: 0 }}
                  transition={{ duration: 0.7 }}
                >
                  {to.visual}
                </motion.div>
              </div>
              <p className="font-display text-xs font-extrabold text-[#3D352E] leading-tight break-words">{to.name}</p>
              <AnimatePresence>
                {sendingOrDone && (
                  <motion.span
                    key="plus"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: [0.4, 1.25, 1] }}
                    transition={{ duration: 0.45, delay: reduce ? 0 : 0.95 }}
                    className="absolute -top-2 left-0 px-2 py-0.5 rounded-full bg-[#FFC800] border-2 border-[#E5A400] font-display text-xs font-extrabold text-[#4A3500] tabular-nums"
                  >
                    +{amount.toLocaleString("id-ID")}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Ringkasan satu kartu: dua baris, satu palet */}
        {phase !== "error" && (
          <dl className="rounded-2xl bg-white border-2 border-[#E6DFD2] divide-y divide-[#EFE9DC]">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="text-xs font-bold text-[#7A6E65]">Poinmu</dt>
              <dd className="font-display text-sm font-extrabold tabular-nums text-[#3D352E] inline-flex items-center gap-1.5 flex-wrap justify-end">
                {shownBefore.toLocaleString("id-ID")} <GlyphIcon name="arrow_right" size={14} />
                <span className={notEnough ? "text-[#C83E2B]" : undefined}>
                  {phase === "confirm" ? after.toLocaleString("id-ID") : <RollingNumber value={fromBalance} className="text-sm" />}
                </span>
                <span className="text-xs text-[#7A6E65]">(−{amount.toLocaleString("id-ID")})</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="text-xs font-bold text-[#7A6E65] min-w-0 truncate">{to.name.split(" ")[0]} menerima</dt>
              <dd className="font-display text-sm font-extrabold tabular-nums text-[#3D352E] text-right">
                +{amount.toLocaleString("id-ID")} Poin
                {receiveNote && <span className="ml-1.5 text-xs font-bold text-[#7A6E65]">{receiveNote}</span>}
              </dd>
            </div>
          </dl>
        )}

        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs sm:text-sm font-bold leading-relaxed break-words rounded-2xl px-3 py-2 bg-[#F7F3EB] border-2 border-[#E6DFD2]",
            phase === "error" ? "text-[#C83E2B]" : "text-[#3D352E]"
          )}
        >
          {phase === "confirm" &&
            (notEnough
              ? "Poinmu belum cukup untuk jumlah ini. Pilih jumlah yang lebih kecil ya."
              : `Poinmu berkurang ${amount.toLocaleString("id-ID")} dan pindah ke ${to.name}. ${
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

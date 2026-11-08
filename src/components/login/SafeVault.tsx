"use client";

import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Delete } from "@/components/illustrations/UiGlyphs";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

/**
 * Brankas taktil (Versi 5.0): pintu besi berbingkai emas dengan numpad PIN 4 angka.
 * - Tombol angka asli (bukan <input type="password">), bisa juga lewat keyboard fisik.
 * - Benar: roda putar berputar, lampu emas menyala, pintu terbuka (CSS 3D).
 * - Salah: lampu merah, pintu bergetar, PIN dikosongkan.
 */
export interface SafeVaultProps {
  title: string;
  subtitle?: string;
  pinLength?: number;
  /** Panggil saat PIN lengkap; kembalikan true bila benar. Boleh async (menunggu verifikasi server). */
  onComplete: (pin: string) => boolean | Promise<boolean>;
  /** Dipanggil pada klik yang menyelesaikan PIN benar (nyalakan overlay loading di sini). */
  onBeforeOpen?: () => void;
  /** Dipanggil setelah animasi pintu terbuka selesai. */
  onOpened?: () => void;
  disabled?: boolean;
}

type VaultStatus = "idle" | "checking" | "open" | "error";

const KEYS: (string | "back" | "ok")[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"];

export function SafeVault({
  title,
  subtitle,
  pinLength = 4,
  onComplete,
  onBeforeOpen,
  onOpened,
  disabled = false,
}: SafeVaultProps) {
  const [pin, setPin] = useState<string>("");
  const [status, setStatus] = useState<VaultStatus>("idle");
  const pinRef = useRef<string>("");
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  // Reset saat brankas berganti pemilik
  useEffect(() => {
    pinRef.current = "";
    setPin("");
    setStatus("idle");
  }, [title]);

  const submit = useCallback(
    (value: string) => {
      const finish = (ok: boolean) => {
        if (ok) {
          setStatus("open");
          soundEffects.comboFanfare();
          onBeforeOpen?.();
          later(() => onOpened?.(), 700);
        } else {
          setStatus("error");
          soundEffects.detectiveBuzz();
          later(() => {
            pinRef.current = "";
            setPin("");
            setStatus("idle");
          }, 650);
        }
      };
      const result = onComplete(value);
      if (typeof result === "boolean") {
        finish(result);
        return;
      }
      // Verifikasi server: kunci numpad, lampu emas menyala sampai jawaban datang.
      setStatus("checking");
      result.then(finish, () => finish(false));
    },
    [onComplete, onBeforeOpen, onOpened]
  );

  const press = useCallback(
    (digit: string) => {
      if (disabled || status !== "idle") return;
      if (pinRef.current.length >= pinLength) return;
      soundEffects.tactileClick();
      const next = pinRef.current + digit;
      pinRef.current = next;
      setPin(next);
      if (next.length === pinLength) {
        // Tunda sejenak agar lampu terakhir sempat menyala; batal bila PIN diubah (hapus) di sela waktu itu.
        later(() => {
          if (pinRef.current === next) submit(next);
        }, 120);
      }
    },
    [disabled, status, pinLength, submit]
  );

  const back = useCallback(() => {
    if (disabled || status !== "idle") return;
    soundEffects.tactileClick();
    pinRef.current = pinRef.current.slice(0, -1);
    setPin(pinRef.current);
  }, [disabled, status]);

  // Keyboard fisik
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  const lampOn = (i: number) => i < pin.length;
  const lampColor =
    status === "error" ? "#FF4B4B" : status === "open" ? "#58CC02" : "#FFC800";

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full max-w-[360px] mx-auto select-none" data-testid="safe-vault">
        <div className="text-center mb-3 min-w-0">
          <p className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug break-words">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">{subtitle}</p>
          )}
        </div>

        {/* Badan brankas + interior */}
        <div className="relative" style={{ perspective: "1100px" }}>
          {/* Interior (terlihat saat pintu terbuka) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[28px] border-4 border-[#3D352E] bg-gradient-to-b from-[#FFF3C4] via-[#FFE27A] to-[#FFC800] flex items-center justify-center overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{ scale: status === "open" ? [0.6, 1.1, 1] : 0.6, opacity: status === "open" ? 1 : 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <GlyphIcon name="money_bag" size={72} />
            </motion.div>
          </div>

          {/* Pintu */}
          <motion.div
            initial={false}
            animate={{
              rotateY: status === "open" ? -104 : 0,
              x: status === "error" ? [0, -9, 9, -7, 7, 0] : 0,
            }}
            transition={
              status === "error"
                ? { duration: 0.45 }
                : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
            className={cn(
              "relative rounded-[28px] border-4 border-[#3D352E] p-3 sm:p-4",
              "bg-gradient-to-br from-[#D5DBE3] via-[#A3ACB8] to-[#747E8B]",
              "shadow-[0_6px_0_#3D352E]"
            )}
          >
            {/* Rivet */}
            {[
              "top-2 left-2",
              "top-2 right-2",
              "bottom-2 left-2",
              "bottom-2 right-2",
            ].map((pos) => (
              <span
                key={pos}
                aria-hidden="true"
                className={cn(
                  "absolute w-2.5 h-2.5 rounded-full bg-[#EEF1F5] border-2 border-[#3D352E]",
                  pos
                )}
              />
            ))}

            {/* Bingkai emas */}
            <div className="rounded-[20px] border-[5px] border-[#E5A400] bg-[#C7CFD9]/60 p-3 outline outline-[3px] outline-[#3D352E] -outline-offset-[1px]">
              {/* Lampu PIN + roda putar */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy={status === "checking"}
                  aria-label={status === "checking" ? "Memeriksa PIN ke server…" : `PIN terisi ${pin.length} dari ${pinLength} angka`}
                  className="flex items-center gap-2 rounded-2xl bg-[#3D352E] px-3 py-2.5 border-2 border-[#2A241F]"
                >
                  {Array.from({ length: pinLength }).map((_, i) => (
                    <motion.span
                      key={i}
                      initial={false}
                      animate={{ scale: lampOn(i) ? [1, 1.25, 1] : 1 }}
                      transition={{ duration: 0.25 }}
                      className="block w-4 h-4 rounded-full border-2 border-[#FFFDF7]/70"
                      style={{
                        backgroundColor: lampOn(i) ? lampColor : "#5B5148",
                        boxShadow: lampOn(i) ? `0 0 8px ${lampColor}` : "none",
                      }}
                    />
                  ))}
                </div>

                <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0" aria-hidden="true" focusable="false">
                  <circle cx="40" cy="40" r="36" fill="#E5A400" stroke="#3D352E" strokeWidth="3.5" />
                  <circle cx="40" cy="40" r="28" fill="#FFC800" stroke="#3D352E" strokeWidth="3" />
                  <motion.g
                    initial={false}
                    animate={{ rotate: status === "open" ? 360 : pin.length * 90 }}
                    transition={{ type: "spring", stiffness: 140, damping: 14 }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  >
                    <rect x="35" y="8" width="10" height="64" rx="5" fill="#FFE27A" stroke="#3D352E" strokeWidth="3" />
                    <rect x="8" y="35" width="64" height="10" rx="5" fill="#FFE27A" stroke="#3D352E" strokeWidth="3" />
                    <circle cx="40" cy="40" r="9" fill="#FFFDF7" stroke="#3D352E" strokeWidth="3" />
                  </motion.g>
                </svg>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {KEYS.map((k) => {
                  const isBack = k === "back";
                  const isOk = k === "ok";
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={disabled || status !== "idle" || isOk}
                      aria-label={isBack ? "Hapus angka terakhir" : isOk ? "Brankas membuka otomatis saat 4 angka terisi" : `Angka ${k}`}
                      onClick={() => (isBack ? back() : isOk ? undefined : press(k))}
                      className={cn(
                        "h-12 sm:h-14 rounded-2xl border-2 border-[#3D352E] border-b-[5px] font-display text-xl sm:text-2xl font-extrabold",
                        "active:border-b-[2px] active:translate-y-[3px] transition-all duration-75 cursor-pointer",
                        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF] focus-visible:outline-offset-2",
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                        isBack
                          ? "bg-[#FFF2F0] text-[#C83E2B] hover:bg-[#FFE4DF]"
                          : isOk
                          ? "bg-[#EFFBE6] text-[#2E6F00]"
                          : "bg-[#FFFDF7] text-[#3D352E] hover:bg-[#FFF3C4]"
                      )}
                    >
                      {isBack ? (
                        <Delete className="w-6 h-6 mx-auto" aria-hidden="true" />
                      ) : isOk ? (
                        <GlyphIcon name="unlock" size={24} />
                      ) : (
                        k
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Engsel */}
            <span aria-hidden="true" className="absolute -left-2 top-8 w-3 h-8 rounded-md bg-[#E5A400] border-2 border-[#3D352E]" />
            <span aria-hidden="true" className="absolute -left-2 bottom-8 w-3 h-8 rounded-md bg-[#E5A400] border-2 border-[#3D352E]" />
          </motion.div>
        </div>

        <p
          aria-live="polite"
          className={cn(
            "mt-3 text-center text-xs font-display font-extrabold min-h-[1.25rem]",
            status === "error" ? "text-[#C83E2B]" : status === "open" ? "text-[#2E6F00]" : "text-[#7A6E65]"
          )}
        >
          {status === "error"
            ? "PIN salah. Coba ketuk 4 angka lagi."
            : status === "open"
            ? "Brankas terbuka! Selamat datang."
            : "Ketuk 4 angka PIN-mu untuk membuka brankas."}
        </p>
      </div>
    </MotionConfig>
  );
}

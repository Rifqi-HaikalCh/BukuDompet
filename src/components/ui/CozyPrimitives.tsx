"use client";

import React from "react";
import NumberFlow from "@number-flow/react";
import { cn, formatCompactRupiah } from "@/lib/utils";
import { soundEffects } from "@/lib/sound-effects";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { ToastHost } from "@/components/ui/ToastHost";
import { notify } from "@/lib/notify";

export { formatCompactRupiah };

/**
 * Standar Semantik Warna 60-30-10 BukuDompet V2.5:
 * - matcha: Primary CTA (+ Catat Kas, Simpan, Setujui) & Pemasukan (+Rp) / Aman
 * - honey: Klaim Hadiah Misi, Poin/Koin (1 Poin = Rp1), Streak Api (teks #4A3500)
 * - sky: Tab Filter Waktu Aktif, XP Progress Bar, & Streak Freeze
 * - peach / berry: Pengeluaran (-Rp), Peringatan Boros/Bengkak, Keluar/Tolak
 * - taro: Eksklusif untuk Evolusi Mochi & Mystery Box Gacha
 * - cream / white: Seluruh Tombol Sekunder, Tombol Batal, & Tab Non-Aktif
 */
export type TactileVariant =
  | "matcha"
  | "honey"
  | "sky"
  | "peach"
  | "berry"
  | "taro"
  | "cream"
  | "white";

const VARIANT_CLASSES: Record<TactileVariant, string> = {
  matcha:
    "bg-[#58CC02] hover:bg-[#61DC06] text-white border-0 border-b-[5px] border-b-[#46A302] active:border-b-[2px] active:translate-y-[3px]",
  sky:
    "bg-[#38B6FF] hover:bg-[#52C0FF] text-white border-0 border-b-[5px] border-b-[#1E88E5] active:border-b-[2px] active:translate-y-[3px]",
  honey:
    "bg-[#FFC800] hover:bg-[#FFD22B] text-[#4A3500] border-0 border-b-[5px] border-b-[#E5A400] active:border-b-[2px] active:translate-y-[3px]",
  peach:
    "bg-[#FF8B7B] hover:bg-[#FF9B8D] text-[#3D352E] border-0 border-b-[5px] border-b-[#E06353] active:border-b-[2px] active:translate-y-[3px]",
  berry:
    "bg-[#FF4B4B] hover:bg-[#FF6262] text-white border-0 border-b-[5px] border-b-[#EA2B2B] active:border-b-[2px] active:translate-y-[3px]",
  taro:
    "bg-[#CE82FF] hover:bg-[#D796FF] text-white border-0 border-b-[5px] border-b-[#A552DB] active:border-b-[2px] active:translate-y-[3px]",
  cream:
    "bg-[#F7F3EB] hover:bg-[#EFE9DC] text-[#3D352E] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px]",
  white:
    "bg-white hover:bg-[#FFFDF9] text-[#3D352E] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px]",
};

export interface TactileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TactileVariant;
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  silent?: boolean;
  /**
   * Nyalakan overlay loading global SEKETIKA saat diklik (Versi 5.0), tanpa menunggu
   * halaman/aksi selesai. Dimatikan otomatis oleh rute baru atau timer pengaman.
   */
  showLoadingOnClick?: boolean;
  /** Pengaman: overlay otomatis tertutup setelah sekian ms bila tidak ada navigasi. */
  loadingAutoHideMs?: number;
}

export function TactileButton({
  variant = "matcha",
  size = "md",
  fullWidth = false,
  silent = false,
  showLoadingOnClick = false,
  loadingAutoHideMs = 900,
  className,
  children,
  onClick,
  disabled,
  ...props
}: TactileButtonProps) {
  const sizeClass = {
    sm: "px-3.5 py-1.5 text-xs rounded-2xl",
    md: "px-4 py-2.5 text-sm rounded-2xl",
    lg: "px-5 py-3 text-base rounded-2xl",
    xl: "px-6 py-4 text-lg rounded-2xl",
  }[size];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (!silent && !disabled) {
          soundEffects.tactileClick();
        }
        if (showLoadingOnClick && !disabled) {
          useBukuDompetStore.getState().triggerActionLoading(loadingAutoHideMs);
        }
        onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-display font-extrabold select-none cursor-pointer transition-all duration-75 max-w-full",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASSES[variant],
        sizeClass,
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface CozyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?:
    | "white"
    | "vanilla"
    | "matcha"
    | "honey"
    | "sky"
    | "peach"
    | "berry"
    | "taro";
  shadowType?: "ink" | "warm";
}

export function CozyCard({
  tone = "white",
  className,
  children,
  ...props
}: CozyCardProps) {
  // Default 60% Neutral White Canvas: bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4]
  const toneStyles = {
    white:
      "bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] shadow-xs",
    vanilla:
      "bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] shadow-xs",
    matcha:
      "bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070]",
    honey:
      "bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C]",
    peach:
      "bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C]",
    berry:
      "bg-[#FFF0F0] border-2 border-[#FFC2C2] border-b-[4px] border-b-[#FF9494]",
    taro:
      "bg-[#F8F0FF] border-2 border-[#E2C6FF] border-b-[4px] border-b-[#C99BFF]",
    sky:
      "bg-[#EEF8FF] border-2 border-[#BCE3FF] border-b-[4px] border-b-[#89CAFF]",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-3xl p-4 sm:p-5 min-w-0 max-w-full overflow-hidden",
        toneStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ChunkyProgressBarProps {
  value: number;
  max?: number;
  variant?: "matcha" | "sky" | "honey" | "peach" | "berry" | "taro";
  size?: "md" | "lg";
  label?: string;
  showFraction?: boolean;
  className?: string;
}

export function ChunkyProgressBar({
  value,
  max = 100,
  variant = "matcha",
  size = "md",
  label,
  showFraction = false,
  className,
}: ChunkyProgressBarProps) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  const fillBg = {
    matcha: "bg-[#58CC02]",
    sky: "bg-[#38B6FF]",
    honey: "bg-[#FFC800]",
    peach: "bg-[#FF8B7B]",
    berry: "bg-[#FF4B4B]",
    taro: "bg-[#CE82FF]",
  }[variant];

  return (
    <div className={cn("w-full min-w-0", className)}>
      {(label || showFraction) && (
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[#3D352E] mb-1.5 min-w-0">
          {label && <span className="truncate">{label}</span>}
          {showFraction && (
            <span className="font-display font-extrabold tabular-nums tracking-tight text-[#7A6E65] shrink-0">
              {value.toLocaleString("id-ID")} / {max.toLocaleString("id-ID")}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full bg-[#F3ECE0] rounded-full border-2 border-[#E2D8C5] overflow-hidden relative",
          size === "lg" ? "h-6" : "h-5"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out relative flex flex-col",
            fillBg
          )}
          style={{ width: `${Math.max(pct > 0 ? 8 : 0, pct)}%` }}
        >
          <div className="h-1.5 bg-white/45 rounded-full mx-2 mt-1 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export interface RollingNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  isCurrency?: boolean;
}

export function RollingNumber({
  value,
  prefix = "",
  suffix = "",
  className,
  isCurrency = false,
}: RollingNumberProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-extrabold tabular-nums tracking-tight truncate max-w-full",
        className
      )}
    >
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <NumberFlow
        value={Math.round(value)}
        locales="id-ID"
        format={
          isCurrency
            ? { style: "decimal", maximumFractionDigits: 0 }
            : { maximumFractionDigits: 0 }
        }
      />
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}

export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

/**
 * Penyalur notifikasi hadiah: memindahkan `rewardToast` dari store ke antrean notifikasi global
 * dan memasang <ToastHost /> (pojok kanan-bawah). Dipasang di semua cangkang halaman.
 */
export function FloatingRewardBanner() {
  const rewardToast = useBukuDompetStore((s) => s.rewardToast);
  const clearRewardToast = useBukuDompetStore((s) => s.clearRewardToast);

  React.useEffect(() => {
    if (!rewardToast) return;
    const hasReward = rewardToast.points > 0 || rewardToast.xp > 0 || rewardToast.isCombo;
    if (hasReward) notify.reward(rewardToast.title, rewardToast.subtitle, rewardToast.points, rewardToast.xp);
    else notify.success(rewardToast.title, rewardToast.subtitle);
    clearRewardToast();
  }, [rewardToast, clearRewardToast]);

  return <ToastHost />;
}

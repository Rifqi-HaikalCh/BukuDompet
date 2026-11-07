"use client";

import React from "react";
import NumberFlow from "@number-flow/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { soundEffects } from "@/lib/sound-effects";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { CozyIcon } from "@/components/illustrations/CozyIcons";

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
    "bg-[#FFC800] hover:bg-[#FFD22B] text-[#3D352E] border-0 border-b-[5px] border-b-[#E5A400] active:border-b-[2px] active:translate-y-[3px]",
  peach:
    "bg-[#FF8B7B] hover:bg-[#FF9B8D] text-[#3D352E] border-0 border-b-[5px] border-b-[#E06353] active:border-b-[2px] active:translate-y-[3px]",
  berry:
    "bg-[#FF4B4B] hover:bg-[#FF6262] text-white border-0 border-b-[5px] border-b-[#EA2B2B] active:border-b-[2px] active:translate-y-[3px]",
  taro:
    "bg-[#CE82FF] hover:bg-[#D796FF] text-white border-0 border-b-[5px] border-b-[#A552DB] active:border-b-[2px] active:translate-y-[3px]",
  cream:
    "bg-white hover:bg-[#FFFDF9] text-[#3D352E] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[3px]",
  white:
    "bg-white hover:bg-[#FFFDF9] text-[#3D352E] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[3px]",
};

export interface TactileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TactileVariant;
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  silent?: boolean;
}

export function TactileButton({
  variant = "matcha",
  size = "md",
  fullWidth = false,
  silent = false,
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
        onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-display font-extrabold select-none cursor-pointer transition-all duration-75",
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
  const toneStyles = {
    white:
      "bg-white border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] shadow-sm",
    vanilla:
      "bg-[#F9F4EA] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] shadow-sm",
    matcha:
      "bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[5px] border-b-[#9EE070]",
    honey:
      "bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[5px] border-b-[#F5C84C]",
    peach:
      "bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[5px] border-b-[#FFA89C]",
    berry:
      "bg-[#FFF0F0] border-2 border-[#FFC2C2] border-b-[5px] border-b-[#FF9494]",
    taro:
      "bg-[#F8F0FF] border-2 border-[#E2C6FF] border-b-[5px] border-b-[#C99BFF]",
    sky:
      "bg-[#EEF8FF] border-2 border-[#BCE3FF] border-b-[5px] border-b-[#89CAFF]",
  }[tone];

  return (
    <div
      className={cn("rounded-3xl p-4 sm:p-5", toneStyles, className)}
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
    <div className={cn("w-full", className)}>
      {(label || showFraction) && (
        <div className="flex items-center justify-between text-xs font-extrabold text-[#3D352E] mb-1.5">
          {label && <span>{label}</span>}
          {showFraction && (
            <span className="font-display font-extrabold tabular-nums tracking-tight text-[#7A6E65]">
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
        "inline-flex items-baseline font-display font-extrabold tabular-nums tracking-tight",
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

export function FloatingRewardBanner() {
  const { rewardToast, clearRewardToast } = useBukuDompetStore();

  React.useEffect(() => {
    if (!rewardToast) return;
    const t = setTimeout(() => {
      clearRewardToast();
    }, 4200);
    return () => clearTimeout(t);
  }, [rewardToast, clearRewardToast]);

  return (
    <AnimatePresence>
      {rewardToast && (
        <motion.div
          key={rewardToast.id}
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
          onClick={clearRewardToast}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md cursor-pointer"
        >
          <div
            className={cn(
              "rounded-3xl p-3.5 flex items-center justify-between gap-3 shadow-md",
              rewardToast.isCombo
                ? "bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[5px] border-b-[#F5C84C]"
                : "bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[5px] border-b-[#9EE070]"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CozyIcon
                name={rewardToast.isCombo ? "combo_sparkle" : "check_badge"}
                size={32}
                animated
              />
              <div className="min-w-0">
                <p className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate">
                  {rewardToast.title}
                </p>
                <p className="text-xs font-bold text-[#7A6E65] truncate">
                  {rewardToast.subtitle}
                </p>
              </div>
            </div>
            {(rewardToast.points > 0 || rewardToast.xp > 0) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {rewardToast.points > 0 && (
                  <span className="px-2.5 py-1 rounded-xl bg-[#FFC800] border-b-[3px] border-b-[#E5A400] font-display tabular-nums text-xs font-extrabold text-[#3D352E] inline-flex items-center gap-1">
                    <CozyIcon name="coin_rupiah" size={16} />+
                    {rewardToast.points}
                  </span>
                )}
                {rewardToast.xp > 0 && (
                  <span className="px-2 py-1 rounded-xl bg-[#38B6FF] border-b-[3px] border-b-[#1E88E5] font-display tabular-nums text-xs font-extrabold text-white inline-flex items-center gap-1">
                    <CozyIcon name="xp_star" size={16} />+{rewardToast.xp}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

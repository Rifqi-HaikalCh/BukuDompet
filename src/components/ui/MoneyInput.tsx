"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const FIELD_CLASS =
  "w-full px-3 py-2.5 rounded-2xl border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] bg-white text-sm font-bold text-[#3D352E] placeholder:text-[#B8AC9A] focus:outline-none focus:border-[#38B6FF] focus:border-b-[#1E88E5]";

/** Isi `digits` hanya angka; tampilan diberi pemisah ribuan. */
export function MoneyInput({
  value,
  onChange,
  label,
  placeholder = "0",
  className,
  id,
}: {
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const shown = value ? Number(value).toLocaleString("id-ID") : "";
  return (
    <label className={cn("block min-w-0", className)}>
      {label && <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">{label}</span>}
      <span className="flex items-center gap-2">
        <span className="font-display text-sm font-extrabold text-[#7A6E65]">Rp</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={shown}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 12))}
          className={cn(FIELD_CLASS, "tabular-nums")}
        />
      </span>
    </label>
  );
}

export const toInt = (digits: string): number => Number(digits.replace(/\D/g, "")) || 0;

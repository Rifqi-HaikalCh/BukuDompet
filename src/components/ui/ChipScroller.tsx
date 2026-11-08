"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/illustrations/UiGlyphs";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

/**
 * Baris tombol/kategori yang bisa digeser ke samping (Versi 5.1).
 *
 * Menggantikan `flex-wrap` yang menumpuk tombol jadi beberapa baris. Hanya 1 baris tinggi tetap:
 * - geser jari/trackpad di ponsel, panah ‹ › di desktop (muncul hanya jika ada konten tersembunyi);
 * - tepi yang masih bisa digeser memudar (mask), jadi anak langsung paham "masih ada lanjutannya";
 * - elemen aktif (`aria-pressed`/`aria-selected`/`data-active`) otomatis digulir ke tengah saat `watch` berubah;
 * - scroll-snap + tanpa scrollbar agar bersih; tetap bisa difokus papan ketik karena isinya `<button>` biasa.
 */
export interface ChipScrollerProps {
  /** Nama grup untuk pembaca layar. */
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Nilai yang berubah ketika pilihan aktif berubah → gulir otomatis ke chip aktif. */
  watch?: unknown;
  /** Tinggi tambahan agar bayangan tombol 3D (border-b) tidak terpotong. */
  roomy?: boolean;
}

const ACTIVE_SELECTOR = '[aria-pressed="true"],[aria-selected="true"],[data-active="true"]';

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ChipScroller({ label, children, className, watch, roomy = true }: ChipScrollerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    Array.from(el.children).forEach((c) => ro?.observe(c));
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure, children]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(ACTIVE_SELECTOR);
    if (!active) return;
    const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [watch]);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    soundEffects.tactileClick();
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const maskImage = `linear-gradient(to right, ${edge.left ? "transparent 0, #000 28px" : "#000 0, #000 28px"}, #000 calc(100% - 28px), ${
    edge.right ? "transparent 100%" : "#000 100%"
  })`;

  return (
    <div className={cn("relative min-w-0 max-w-full group/chips", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        style={{ maskImage, WebkitMaskImage: maskImage }}
        className={cn(
          "flex items-center gap-1.5 overflow-x-auto overscroll-x-contain snap-x snap-proximity",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start",
          roomy ? "pt-0.5 pb-1 px-0.5" : ""
        )}
      >
        {children}
      </div>
      {edge.left && (
        <button
          type="button"
          aria-label={`Geser ${label} ke kiri`}
          onClick={() => nudge(-1)}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center rounded-full bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-[#3D352E] cursor-pointer hover:bg-[#FFFDF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E]"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
      {edge.right && (
        <button
          type="button"
          aria-label={`Geser ${label} ke kanan`}
          onClick={() => nudge(1)}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center rounded-full bg-white border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] text-[#3D352E] cursor-pointer hover:bg-[#FFFDF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E]"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

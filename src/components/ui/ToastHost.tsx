"use client";

/**
 * Tumpukan notifikasi pojok kanan-bawah (Versi 5.3). Kartu meluncur masuk dari kanan ke kiri,
 * keluar ke kanan. Di ponsel berada di atas bilah menu bawah. Satu palet netral (krem) dengan
 * pita warna tipis di tepi kiri sebagai penanda jenis, bukan latar warna-warni.
 */
import React, { useEffect } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { GlyphIcon, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { useNotifyStore, type NotifyItem, type NotifyTone } from "@/lib/notify";
import { cn } from "@/lib/utils";

const TONE: Record<NotifyTone, { stripe: string; glyph: GlyphName; label: string }> = {
  success: { stripe: "bg-[#58CC02]", glyph: "check_circle", label: "Berhasil" },
  info: { stripe: "bg-[#38B6FF]", glyph: "chat", label: "Info" },
  warn: { stripe: "bg-[#FFC800]", glyph: "bolt", label: "Perhatian" },
  reward: { stripe: "bg-[#FFC800]", glyph: "gift", label: "Hadiah" },
};

function Toast({ item }: { item: NotifyItem }) {
  const dismiss = useNotifyStore((s) => s.dismiss);
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(item.id), item.duration);
    return () => window.clearTimeout(t);
  }, [item.id, item.duration, dismiss]);
  const tone = TONE[item.tone];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 140 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 140, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] shadow-md"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1.5", tone.stripe)} aria-hidden="true" />
      <div className="flex items-start gap-3 pl-4 pr-2.5 py-2.5">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {item.tone === "reward" ? <CozyIcon name="combo_sparkle" size={28} animated /> : <GlyphIcon name={tone.glyph} size={26} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">{item.title}</p>
          {item.subtitle && <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words mt-0.5">{item.subtitle}</p>}
          {((item.points ?? 0) > 0 || (item.xp ?? 0) > 0) && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {(item.points ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-[#FFC800] font-display tabular-nums text-[11px] font-extrabold text-[#4A3500]">+{item.points} Poin</span>
              )}
              {(item.xp ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-[#38B6FF] font-display tabular-nums text-[11px] font-extrabold text-white">+{item.xp} XP</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          aria-label="Tutup notifikasi"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#7A6E65] hover:bg-[#F7F3EB] cursor-pointer"
        >
          <GlyphIcon name="close" size={14} />
        </button>
      </div>
      <motion.span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[3px] bg-[#3D352E]/15"
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: item.duration / 1000, ease: "linear" }}
      />
    </motion.li>
  );
}

export function ToastHost() {
  const items = useNotifyStore((s) => s.items);
  return (
    <MotionConfig reducedMotion="user">
      <ul
        role="status"
        aria-live="polite"
        aria-label="Notifikasi"
        className="fixed z-[140] right-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6 w-[min(22rem,calc(100vw-1.5rem))] flex flex-col gap-2 pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <Toast key={it.id} item={it} />
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  );
}

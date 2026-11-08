"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MochiLoadingHop } from "@/components/illustrations/BukuDompetLogo";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";

/** Lama minimal overlay tetap terlihat setelah halaman tujuan siap, agar tidak berkedip. */
const MIN_VISIBLE_AFTER_NAV_MS = 260;

/**
 * Overlay loading global (Versi 5.0).
 *
 * Dinyalakan SEKETIKA saat onClick lewat `triggerActionLoading()` (nav, tombol brankas,
 * `TactileButton showLoadingOnClick`), bukan menunggu halaman selesai dimuat. Dimatikan saat
 * rute berganti (navigasi tuntas) atau oleh timer pengaman di store.
 */
export function PageTransitionLoader() {
  const pathname = usePathname();
  const isActionLoading = useBukuDompetStore((s) => s.isActionLoading);
  const clearActionLoading = useBukuDompetStore((s) => s.clearActionLoading);

  useEffect(() => {
    // Rute berubah = navigasi selesai. Beri jeda singkat lalu matikan overlay.
    const timer = setTimeout(() => clearActionLoading(), MIN_VISIBLE_AFTER_NAV_MS);
    return () => clearTimeout(timer);
  }, [pathname, clearActionLoading]);

  return (
    <AnimatePresence>
      {isActionLoading && (
        <motion.div
          key="action-loading"
          data-testid="action-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] backdrop-blur-md bg-[#FFFDF7]/65 flex items-center justify-center p-6"
          aria-busy="true"
        >
          <MochiLoadingHop message="Melompat ke halaman..." className="w-48 sm:w-56" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Layar pemuat penuh untuk menunggu hidrasi store (render pertama = HTML server). */
export function HydrationSplash() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-[#FFFDF7]"
      data-testid="hydration-splash"
    >
      <MochiLoadingHop message="Menyiapkan Jurnal Kas Mochi..." className="w-48 sm:w-56" />
    </div>
  );
}

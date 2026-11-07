"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MochiLoadingHop } from "@/components/illustrations/BukuDompetLogo";

const COZY_FINANCE_TIPS = [
  "Mencatat minimal 2 item rincian memberimu +35 Poin (Rp35) otomatis!",
  "1 Poin di BukuDompet bernilai Rp 1 asli yang bisa dicairkan!",
  "Hari tanpa jajan impulsif tetap menjaga api Streak menyala!",
  "Detektif Mochi membantumu mendeteksi bocor halus sebelum dompet tipis!",
  "Mochi berevolusi dari Mochi Kardus hingga Sultan Mochi Jutawan!",
];

export function PageTransitionLoader() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>(pathname);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [tipIndex, setTipIndex] = useState<number>(0);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setTipIndex((prev) => (prev + 1) % COZY_FINANCE_TIPS.length);
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[110] bg-[#FFFDF9]/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.9, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: -6 }}
            className="rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] px-6 py-5 flex flex-col items-center text-center max-w-sm shadow-lg"
          >
            <MochiLoadingHop
              message="Melompat ke halaman..."
              className="w-40"
            />
            <p className="text-xs font-bold text-[#7A6E65] mt-2">
              {COZY_FINANCE_TIPS[tipIndex]}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

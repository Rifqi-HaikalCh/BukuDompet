"use client";

import { useEffect, useState } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { useFinanceStore } from "@/store/useFinanceStore";

/**
 * Hidrasi manual ketiga store (utama, keluarga, keuangan) (`skipHydration: true`).
 *
 * Alasan: bila persist membaca localStorage secara sinkron saat store dibuat, render pertama di
 * klien berbeda dari HTML server (data pengguna vs data seed) dan React melaporkan galat
 * hidrasi. Dengan hidrasi setelah mount + layar pemuat singkat, HTML server dan render pertama
 * klien selalu identik.
 */
let hydrationPromise: Promise<void> | null = null;
let hydrationDone = false;

export function hydrateStores(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = Promise.all([
      Promise.resolve(useBukuDompetStore.persist.rehydrate()),
      Promise.resolve(useFamilyStore.persist.rehydrate()),
      Promise.resolve(useFinanceStore.persist.rehydrate()),
    ])
      .then(() => undefined)
      .catch(() => undefined)
      .then(() => {
        hydrationDone = true;
        // Evaluasi streak ketat & reset 7 hari berjalan sekali begitu data sungguhan termuat.
        useBukuDompetStore.getState().runStreakEvaluation();
        useFamilyStore.getState().runMaintenance();
      });
  }
  return hydrationPromise;
}

/** true setelah kedua store selesai dihidrasi. Awal render selalu sama dengan server (false saat muat pertama). */
export function useStoresHydrated(): boolean {
  const [ready, setReady] = useState<boolean>(hydrationDone);
  useEffect(() => {
    let alive = true;
    hydrateStores().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { startFamilyBridge, useFamilyStore } from "@/store/useFamilyStore";
import { useStoresHydrated } from "@/lib/hydration";
import { localDateStr } from "@/lib/dates";
import { ColdAmbience } from "@/components/ui/ColdAmbience";
import { HydrationSplash } from "@/components/ui/PageTransitionLoader";

export type AuthRequirement = "required" | "none";

/** Rumah tiap peran setelah masuk. */
export function homePathForRole(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "supervisor") return "/supervisor";
  return "/app";
}

/**
 * Pembungkus tiap segmen rute: hidrasi store, sesi permanen, jembatan siaran keluarga,
 * pergantian hari otomatis (evaluasi streak ketat + reset 7 hari), dan suasana dingin.
 */
export function AppProviders({
  children,
  auth = "required",
}: {
  children: React.ReactNode;
  auth?: AuthRequirement;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useStoresHydrated();

  const isLoggedIn = useBukuDompetStore((s) => s.isLoggedIn);
  const currentRole = useBukuDompetStore((s) => s.currentRole);
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const monitoredUserId = useBukuDompetStore((s) => s.monitoredUserId);
  const profiles = useBukuDompetStore((s) => s.profiles);

  // Profil anak yang sedang "dilihat": diri sendiri (user/anak SD) atau yang dipantau supervisor.
  const viewed = profiles.find((p) =>
    isChildRole(currentRole) ? p.id === activeProfileId : p.id === monitoredUserId
  );
  // Suasana dingin hanya untuk pemilik akun yang sedang masuk, bukan saat supervisor memantau.
  const coldActive = Boolean(
    hydrated && isLoggedIn && isChildRole(currentRole) && viewed?.isColdStreakMode
  );

  // Penjaga sesi
  useEffect(() => {
    if (!hydrated) return;
    if (auth === "required" && !isLoggedIn) {
      router.replace("/login");
    }
  }, [hydrated, auth, isLoggedIn, router, pathname]);

  // Jembatan siaran keluarga (setelah hidrasi)
  useEffect(() => {
    if (!hydrated) return;
    return startFamilyBridge();
  }, [hydrated]);

  // Pergantian hari saat aplikasi terbuka: evaluasi streak & reset 7 hari
  const lastDayRef = useRef<string>("");
  useEffect(() => {
    if (!hydrated) return;
    lastDayRef.current = localDateStr();
    const tick = () => {
      const today = localDateStr();
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        useBukuDompetStore.getState().runStreakEvaluation();
        useFamilyStore.getState().runMaintenance();
      }
    };
    const id = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated]);

  if (!hydrated) return <HydrationSplash />;
  if (auth === "required" && !isLoggedIn) return <HydrationSplash />;

  return (
    <>
      <ColdAmbience active={coldActive} />
      {children}
    </>
  );
}

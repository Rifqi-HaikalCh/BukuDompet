"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { startFamilyBridge, useFamilyStore } from "@/store/useFamilyStore";
import { useStoresHydrated } from "@/lib/hydration";
import { localDateStr } from "@/lib/dates";
import { ColdAmbience } from "@/components/ui/ColdAmbience";
import { HydrationSplash } from "@/components/ui/PageTransitionLoader";
import { SyncStatusPill } from "@/components/ui/SyncStatusPill";
import { bootSession } from "@/lib/sync/client";
import { cozyBgm } from "@/lib/cozy-bgm";

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
  roles,
}: {
  children: React.ReactNode;
  auth?: AuthRequirement;
  /**
   * Peran yang boleh membuka segmen ini. Peran lain otomatis dikembalikan ke rumahnya sendiri,
   * jadi mengetik alamat /admin atau /supervisor tidak membuka halaman peran lain.
   */
  roles?: string[];
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

  const roleAllowed = !roles || roles.includes(currentRole);

  // Sesi server: pastikan cookie masih sah (401 → kembali ke layar masuk, data lokal utuh) lalu nyalakan sinkron.
  // Jaringan putus ≠ sesi habis: aplikasi tetap bisa dipakai offline dengan identitas terakhir yang sah.
  const [booted, setBooted] = useState<boolean>(false);
  useEffect(() => {
    if (!hydrated || auth !== "required" || !isLoggedIn) {
      setBooted(false);
      return;
    }
    let cancelled = false;
    void bootSession().then(() => {
      if (!cancelled) setBooted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, auth, isLoggedIn]);

  // Penjaga sesi + penjaga peran
  useEffect(() => {
    if (!hydrated) return;
    if (auth === "required" && !isLoggedIn) {
      router.replace("/login");
    } else if (auth === "required" && isLoggedIn && !roleAllowed) {
      router.replace(homePathForRole(currentRole));
    }
  }, [hydrated, auth, isLoggedIn, roleAllowed, currentRole, router, pathname]);

  // Backsound semua halaman (Versi 5.2): halaman login senyap; setelah masuk, musik menyala dan terus
  // mengalir antarhalaman. Musik dimulai saat tombol login ditekan (gestur pengguna). Bila halaman dimuat
  // ulang saat sudah masuk, peramban memblokir suara otomatis, jadi musik menyambung di sentuhan pertama.
  useEffect(() => {
    if (!hydrated) return;
    if (auth === "none") {
      // Senyap di halaman login (belum masuk). Begitu login berhasil, isLoggedIn berubah saat halaman
      // masih tampil sebentar: jangan matikan musik yang baru dinyalakan tombol login.
      if (!isLoggedIn) cozyBgm.stop(false);
      return;
    }
    if (!isLoggedIn || cozyBgm.isPlaying() || !cozyBgm.wantsMusic()) return;
    const resume = () => {
      cozyBgm.start(false);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [hydrated, auth, isLoggedIn]);

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
  if (auth === "required" && !roleAllowed) return <HydrationSplash />;
  if (auth === "required" && !booted) return <HydrationSplash />;

  return (
    <>
      <ColdAmbience active={coldActive} />
      {children}
      {auth === "required" && <SyncStatusPill />}
    </>
  );
}

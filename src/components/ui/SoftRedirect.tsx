"use client";

/**
 * Pengalihan lembut untuk rute lama (Versi 5.0): menampilkan kartu kecil dengan tautan manual
 * lalu otomatis berpindah ke menu baru. Aman bagi bookmark lama dan tidak menimbulkan layar kosong.
 */
import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CozyCard } from "@/components/ui/CozyPrimitives";

export function SoftRedirect({ to, label }: { to: string; label: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setTimeout(() => router.replace(to), 250);
    return () => window.clearTimeout(t);
  }, [router, to]);

  return (
    <CozyCard tone="vanilla" className="p-6 text-center space-y-2">
      <p className="font-display text-base font-extrabold text-[#3D352E]">Menu ini sudah pindah rumah</p>
      <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
        Kami mengantarmu ke <span className="text-[#1565C0]">{label}</span>.
      </p>
      <Link href={to} className="inline-block px-4 py-2 rounded-2xl bg-[#38B6FF] text-white font-display text-xs font-extrabold border-b-[4px] border-b-[#1E88E5]">
        Buka {label} sekarang
      </Link>
    </CozyCard>
  );
}

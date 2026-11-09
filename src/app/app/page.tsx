"use client";

/**
 * /app — Beranda Keluarga (Versi 5.0). Peta perjalanan pindah ke /app/journey.
 */
import React from "react";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { FamilyHome } from "@/components/family/FamilyHome";

export default function FamilyHomePage() {
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const profiles = useBukuDompetStore((s) => s.profiles);
  const viewer = profiles.find((p) => p.id === activeProfileId && isChildRole(p.role)) ?? profiles.find((p) => isChildRole(p.role));
  if (!viewer) return null;
  return (
    <div className="space-y-6 min-w-0">
      <FamilyHome viewerId={viewer.id} />
    </div>
  );
}

"use client";

import React from "react";
import { FamilyHome } from "@/components/family/FamilyHome";
import { SupervisorShell } from "@/components/supervisor/SupervisorShell";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";

/** Beranda Keluarga Supervisor — halaman sendiri, terpisah dari pemantauan anak (Versi 5.1). */
export default function SupervisorFamilyPage() {
  const profiles = useBukuDompetStore((s) => s.profiles);
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const supervisors = profiles.filter((p) => p.role === "supervisor");
  const me = supervisors.find((p) => p.id === activeProfileId) || supervisors[0] || profiles[0];

  return (
    <SupervisorShell active="keluarga" mainClassName="max-w-3xl">
      <FamilyHome viewerId={me.id} />
    </SupervisorShell>
  );
}

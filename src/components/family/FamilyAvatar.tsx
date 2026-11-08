"use client";

/**
 * Avatar keluarga: menampilkan Pet milik seorang profil (lengkap dengan aksesori yang dipakai)
 * di dalam lingkaran pastel. Dipakai di feed, komentar, dan gelembung chat.
 */
import React from "react";
import { CustomizablePetAvatar, type GrowthStage, type PetMood } from "@/components/illustrations/PetAvatarSystem";
import type { ProfileData, UserRole } from "@/store/useBukuDompetStore";
import { PersonaDisc, personaVariantFromId } from "@/components/illustrations/PersonaAvatars";
import { cn } from "@/lib/utils";

export const ROLE_LABEL: Record<UserRole, string> = {
  user: "Anggota",
  schoolchild: "Anak SD",
  supervisor: "Supervisor",
  admin: "Admin",
};

const ROLE_RING: Record<UserRole, string> = {
  user: "border-[#9AD2FF] bg-[#EEF8FF]",
  schoolchild: "border-[#FDE08D] bg-[#FFFBEB]",
  supervisor: "border-[#E2C6FF] bg-[#F8F0FF]",
  admin: "border-[#C3EFA4] bg-[#EFFBE6]",
};

export function FamilyAvatar({
  profile,
  size = 44,
  mood = "happy",
  className,
}: {
  profile: Pick<ProfileData, "id" | "role" | "activeSpecies" | "currentStage" | "equippedAccessories" | "isColdStreakMode" | "display_name">;
  size?: number;
  mood?: PetMood;
  className?: string;
}) {
  if (profile.role === "supervisor" || profile.role === "admin") {
    return <PersonaDisc role={profile.role} variant={personaVariantFromId(profile.id)} size={size} className={className} />;
  }
  const stage = Math.min(8, Math.max(1, profile.currentStage || 1)) as GrowthStage;
  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn("rounded-full border-2 overflow-hidden shrink-0 flex items-center justify-center", ROLE_RING[profile.role], className)}
    >
      <CustomizablePetAvatar
        species={profile.activeSpecies || "chubby_cat"}
        stage={stage}
        mood={profile.isColdStreakMode ? "shivering_cold" : mood}
        equippedAccessories={profile.equippedAccessories}
        className="w-[112%] h-[112%] -mt-0.5"
      />
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { shortName } from "@/store/useFamilyStore";
import { SupervisorShell } from "@/components/supervisor/SupervisorShell";
import { CustomizablePetAvatar, GROWTH_STAGE_META } from "@/components/illustrations/PetAvatarSystem";
import { PersonaAvatar, personaVariantFromId } from "@/components/illustrations/PersonaAvatars";
import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import { CozyCard } from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";
import { localDateStr } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Halaman "Pilih Anak" Supervisor (Versi 5.1): ditampilkan tepat setelah Supervisor masuk.
 * Setiap anak yang ditugaskan Admin tampil sebagai kartu besar: karakter Pet + nama anak.
 */
export default function SupervisorChooseChildPage() {
  const router = useRouter();
  const profiles = useBukuDompetStore((s) => s.profiles);
  const assignments = useBukuDompetStore((s) => s.supervisorAssignments);
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const monitoredUserId = useBukuDompetStore((s) => s.monitoredUserId);
  const chosen = useBukuDompetStore((s) => s.supervisorChildChosen);
  const transactions = useBukuDompetStore((s) => s.transactions);
  const chooseMonitoredChild = useBukuDompetStore((s) => s.chooseMonitoredChild);

  const supervisors = profiles.filter((p) => p.role === "supervisor");
  const me = supervisors.find((p) => p.id === activeProfileId) || supervisors[0] || profiles[0];

  const kids = useMemo(() => {
    const ids = new Set(assignments.filter((a) => a.supervisorId === me.id).map((a) => a.userId));
    return profiles.filter((p) => isChildRole(p.role) && ids.has(p.id));
  }, [profiles, assignments, me.id]);

  const today = localDateStr();
  const recordedToday = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) if (t.transaction_date === today) set.add(t.user_id);
    return set;
  }, [transactions, today]);

  return (
    <SupervisorShell active="pilih">
      <CozyCard tone="matcha" className="p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border-2 border-[#C3EFA4] flex items-end justify-center shrink-0 overflow-hidden">
            <PersonaAvatar role="supervisor" variant={personaVariantFromId(me.id)} size={92} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00]">
              {chosen ? "Ganti anak yang dipantau" : "Selamat datang kembali"}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug break-words">
              Halo, {shortName(me.display_name)}! Mau pantau siapa hari ini?
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#3D352E]/80 leading-relaxed">
              Ketuk karakter Pet anak untuk membuka laporan catatan, tabungan, dan perkembangannya.
            </p>
          </div>
        </div>
      </CozyCard>

      {kids.length === 0 ? (
        <CozyCard tone="white" className="p-8 text-center space-y-2">
          <GlyphIcon name="users" size={44} className="mx-auto" />
          <p className="font-display text-base font-extrabold text-[#3D352E]">Belum ada anak yang ditugaskan.</p>
          <p className="text-xs font-bold text-[#7A6E65]">Minta Admin menugaskan anak lewat menu Manajemen Pengguna.</p>
        </CozyCard>
      ) : (
        <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {kids.map((kid) => {
            const stage = (kid.currentStage || 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
            const isSel = chosen && kid.id === monitoredUserId;
            const noteToday = recordedToday.has(kid.id);
            return (
              <li key={kid.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    chooseMonitoredChild(kid.id);
                    router.push("/supervisor");
                  }}
                  aria-label={`Pantau ${shortName(kid.display_name)}, Pet ${kid.petCustomName || ""}`}
                  className={cn(
                    "w-full rounded-3xl border-2 border-b-[5px] p-3.5 flex flex-col items-center gap-2 text-center cursor-pointer transition-all",
                    "hover:-translate-y-0.5 active:translate-y-[2px] active:border-b-[2px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9]",
                    isSel ? "bg-[#EFFBE6] border-[#58CC02] border-b-[#46A302]" : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] hover:bg-[#FFFDF9]"
                  )}
                >
                  <span className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] flex items-center justify-center p-1">
                    <CustomizablePetAvatar
                      species={kid.activeSpecies || "chubby_cat"}
                      stage={stage}
                      mood={kid.isColdStreakMode ? "shivering_cold" : "happy"}
                      customName={kid.petCustomName}
                      equippedAccessories={kid.equippedAccessories}
                      className="w-full h-full"
                    />
                    {isSel && (
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#58CC02] border-2 border-white text-white flex items-center justify-center">
                        <GlyphIcon name="check" size={16} />
                      </span>
                    )}
                  </span>
                  <span className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                    {shortName(kid.display_name)}
                  </span>
                  <span className="text-[11px] font-bold text-[#7A6E65] leading-snug">
                    Pet {kid.petCustomName || "Mochi"} • Fase {stage}: {GROWTH_STAGE_META[stage].name}
                  </span>
                  <span className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500]">
                      <GlyphInline name="flame" /> {kid.current_streak} hari
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold",
                        kid.role === "schoolchild" ? "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]" : "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]"
                      )}
                    >
                      {kid.role === "schoolchild" ? "Anak SD" : "Buku Kas"}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold",
                        noteToday ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#6B5F56]"
                      )}
                    >
                      {noteToday ? "Sudah mencatat hari ini" : "Belum mencatat hari ini"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SupervisorShell>
  );
}

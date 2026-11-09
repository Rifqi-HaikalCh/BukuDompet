"use client";

/**
 * Ringkasan profil anak di bagian paling atas halaman Pemantauan (V5.6.1): siapa, kondisinya, dan apa yang
 * perlu diputuskan, dalam satu pandangan. Apresiasi (stiker 0 poin) dipadatkan jadi satu baris di bawahnya.
 */
import React from "react";
import { MotionConfig, motion } from "framer-motion";
import { CozyCard, RollingNumber, TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { Heart } from "@/components/illustrations/UiGlyphs";
import { CustomizablePetAvatar, GROWTH_STAGE_META } from "@/components/illustrations/PetAvatarSystem";
import { WalletIllustration } from "@/components/wallet/WalletIllustration";
import { useFinanceContext } from "@/lib/use-finance";
import { useSupervisorInbox } from "@/lib/use-supervisor-inbox";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/store/useBukuDompetStore";
import type { analyzeSpendingDetective } from "@/lib/spending-detective";

type Report = ReturnType<typeof analyzeSpendingDetective>;

export interface ChildSummaryCardProps {
  user: ProfileData;
  assignedUsers: ProfileData[];
  isKid: boolean;
  report: Report;
  petName: string;
  stage: number;
  level: number;
  onPick: (id: string) => void;
  onSwap: () => void;
  cheer: { note: string; setNote: (v: string) => void; already: boolean; count: number; message: string | null; onSend: () => void };
}

function Stat({ label, children, tone = "text-[#3D352E]" }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white border-2 border-[#E9E2D4] p-2.5 min-w-0">
      <p className="text-[11px] font-bold text-[#7A6E65] leading-tight">{label}</p>
      <div className={cn("font-display text-base sm:text-lg font-extrabold tabular-nums break-words", tone)}>{children}</div>
    </div>
  );
}

export function ChildSummaryCard({ user, assignedUsers, isKid, report, petName, stage, level, onPick, onSwap, cheer }: ChildSummaryCardProps) {
  const ctx = useFinanceContext(isKid ? undefined : user.id);
  const inbox = useSupervisorInbox(user.id);
  const walletCount = ctx ? ctx.wallets.filter((w) => w.type !== "savings").length : 0;

  const goto = (id: string) => {
    soundEffects.tactileClick();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <motion.div
            className="w-28 h-32 sm:w-24 sm:h-28 mx-auto sm:mx-0 rounded-3xl bg-[#F6FBFF] border-2 border-[#DCEBF5] border-b-4 flex items-center justify-center shrink-0 p-1"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <CustomizablePetAvatar species={user.activeSpecies || "chubby_cat"} stage={stage as never} mood={report.petMood} customName={petName} equippedAccessories={user.equippedAccessories} className="w-full h-full" />
          </motion.div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-extrabold text-[#3D352E] leading-tight break-words">{user.display_name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-[#EEF8FF] text-[#1E88E5] text-[11px] font-extrabold">{isKid ? "Anak SD" : "Remaja/Dewasa"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF3C4] text-[#8A6A00] text-[11px] font-extrabold">
                <GlyphInline name="flame" className="w-3.5 h-3.5" /> Streak {user.current_streak} hari
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F8F0FF] text-[#8A3FC2] text-[11px] font-extrabold">
                <GlyphInline name="star" className="w-3.5 h-3.5" /> Level {level}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFFBE6] text-[#2E6F00] text-[11px] font-extrabold">
                <GlyphInline name="paw" className="w-3.5 h-3.5" /> {petName} • {GROWTH_STAGE_META[stage as 1]?.name ?? `Fase ${stage}`}
              </span>
            </div>
            {assignedUsers.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Pilih anak yang dipantau"
                  value={user.id}
                  onChange={(e) => {
                    soundEffects.tactileClick();
                    onPick(e.target.value);
                  }}
                  className="max-w-full px-3 py-1.5 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] font-display text-xs font-extrabold text-[#3D352E] cursor-pointer"
                >
                  {assignedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button type="button" onClick={onSwap} className="inline-flex items-center gap-1.5 text-xs font-display font-extrabold text-[#1E88E5] underline cursor-pointer">
              <GlyphInline name="swap" className="w-4 h-4" /> Ganti anak yang dipantau
            </button>
          </div>
        </div>

        {isKid ? (
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
            {user.display_name} bersama {petName} menulis cerita harian dan belajar mengelola celengan. Pantau perkembangannya di bawah.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Sisa uang saku bulan ini" tone="text-[#2E6F00]">
              <RollingNumber value={report.remainingTotalBalanceThisMonth} prefix="Rp" isCurrency />
            </Stat>
            <Stat label="Batas aman per hari">{formatRupiah(report.dssl)}</Stat>
            <Stat label="Tabungan wajib">{formatRupiah(ctx?.budget.mandatorySavingsTarget ?? report.monthlySavingTarget)}</Stat>
            <Stat label="Dompet aktif">
              {walletCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  {walletCount}
                  <span className="w-7 inline-block">
                    <WalletIllustration ratio={0.8} className="w-full" label={`${walletCount} dompet aktif`} />
                  </span>
                </span>
              ) : (
                <span className="text-sm text-[#7A6E65]">Belum ada</span>
              )}
            </Stat>
          </div>
        )}

        {!isKid && (
          <div className="flex flex-wrap items-center gap-2">
            {inbox.count > 0 ? (
              <motion.button
                type="button"
                onClick={() => goto("perlu-tindakan")}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF3C4] border-2 border-[#FDE08D] text-xs font-display font-extrabold text-[#8A6A00] cursor-pointer"
              >
                <GlyphInline name="mailbox" className="w-4 h-4" /> {inbox.count} perlu tindakan
              </motion.button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFFBE6] border-2 border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]">
                <GlyphInline name="check_circle" className="w-4 h-4" /> Semua beres
              </span>
            )}
            <button type="button" onClick={() => goto("atur-anggaran")} className="px-3 py-1.5 rounded-full bg-[#EEF8FF] border-2 border-[#BCE3FF] text-xs font-display font-extrabold text-[#1E88E5] cursor-pointer">
              Atur Anggaran
            </button>
            <button type="button" onClick={() => goto("dompet-anak")} className="px-3 py-1.5 rounded-full bg-[#F8F0FF] border-2 border-[#E2C6FF] text-xs font-display font-extrabold text-[#8A3FC2] cursor-pointer">
              Lihat Dompet
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] p-3 space-y-2">
          <p className="text-[11px] font-display font-extrabold text-[#8A6A00]">Kirim semangat (stiker apresiasi, 0 poin)</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={cheer.note}
              onChange={(e) => cheer.setNote(e.target.value)}
              placeholder="Pesan semangat singkat..."
              aria-label="Pesan semangat"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border-2 border-[#FDE08D] text-xs font-bold text-[#3D352E] focus:outline-none"
            />
            <TactileButton variant={cheer.already ? "white" : "honey"} size="md" onClick={cheer.onSend}>
              <Heart className="w-4 h-4 fill-current shrink-0" />
              <span>{cheer.already ? `Kirim Lagi (${cheer.count}x)` : "Kirim Stiker"}</span>
            </TactileButton>
          </div>
          {cheer.message && <p className="text-xs font-extrabold text-[#2E6F00]">{cheer.message}</p>}
        </div>
      </CozyCard>
    </MotionConfig>
  );
}

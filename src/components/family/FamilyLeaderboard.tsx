"use client";

/**
 * Peringkat Keluarga (Versi 5.3).
 *
 * Analisis layout:
 * - Peringkat adalah data sedikit (2-6 anak) dengan satu angka utama per baris, jadi bentuk terbaiknya
 *   "podium" untuk 3 teratas (cepat dibaca, terasa seperti kompetisi) + daftar rapat untuk sisanya.
 * - Lebar kartu bergantung pada ruang yang tersedia (ada sidebar, ada layar sempit), bukan lebar layar,
 *   jadi tata letak memakai container query: dua papan berdampingan hanya bila lebar wadah >= 56rem,
 *   di bawah itu satu papan dengan sakelar "Poin | Streak". Tidak ada nama yang terpotong menjadi
 *   beberapa baris, kolom angka lebar tetap dan rata kanan.
 * Poin terbanyak = total poin yang pernah dikumpulkan (tidak turun saat belanja);
 * streak terbanyak = streak berjalan, rekor terpanjang sebagai pembanding.
 */
import React, { useMemo, useState } from "react";
import { GlyphIcon, GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { CozyCard } from "@/components/ui/CozyPrimitives";
import { FamilyAvatar } from "@/components/family/FamilyAvatar";
import { TitleBadge } from "@/components/badges/TitleBadge";
import { isChildRole, useBukuDompetStore, type ProfileData } from "@/store/useBukuDompetStore";
import { shortName } from "@/store/useFamilyStore";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const MEDAL = [
  { ring: "border-[#FDE08D] bg-[#FFFBEB]", badge: "bg-[#FFC800] text-[#4A3500]", step: "bg-[#FFC800]", h: "h-24" },
  { ring: "border-[#D6DEE4] bg-[#F5F8FA]", badge: "bg-[#B9C9D4] text-[#2A3A45]", step: "bg-[#B9C9D4]", h: "h-16" },
  { ring: "border-[#F2C9A0] bg-[#FFF5EA]", badge: "bg-[#D99A5B] text-[#3A2200]", step: "bg-[#D99A5B]", h: "h-12" },
] as const;

interface Row {
  profile: ProfileData;
  value: number;
  sub: string;
}

type BoardId = "points" | "streak";

function nf(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Podium 2-1-3: kolom tengah paling tinggi. */
function Podium({ rows, unit, viewerId }: { rows: Row[]; unit: string; viewerId: string }) {
  const top = rows.slice(0, 3);
  // urutan tampil: peringkat 2, 1, 3 (bila hanya 2 anak: 2, 1)
  const order = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];
  return (
    <ol className={cn("grid items-end gap-2 sm:gap-3 border-b-4 border-[#E6DFD2] mb-4", top.length === 1 ? "grid-cols-1 max-w-[12rem] mx-auto" : top.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {order.map((idx) => {
        const r = top[idx];
        const medal = MEDAL[idx];
        const mine = r.profile.id === viewerId;
        return (
          <li key={r.profile.id} className="min-w-0 flex flex-col items-center text-center">
            <div className="relative">
              {idx === 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2" aria-hidden="true">
                  <GlyphIcon name="crown" size={26} />
                </span>
              )}
              <div className={cn("rounded-full p-1 border-4", medal.ring, mine && "ring-2 ring-[#38B6FF] ring-offset-2")}>
                <FamilyAvatar profile={r.profile} size={idx === 0 ? 68 : 56} />
              </div>
            </div>
            <p className="mt-1.5 w-full truncate font-display text-xs sm:text-sm font-extrabold text-[#3D352E]" title={r.profile.display_name}>
              {shortName(r.profile.display_name)}
            </p>
            <div className="mt-0.5 max-w-full">
              <TitleBadge profileId={r.profile.id} size="xs" wrap />
            </div>
            <p className="font-display text-base sm:text-lg font-extrabold tabular-nums text-[#3D352E] leading-tight mt-1">
              {nf(r.value)}
              <span className="ml-1 text-[10px] sm:text-[11px] text-[#7A6E65]">{unit}</span>
            </p>
            <p className="w-full truncate text-[10px] sm:text-[11px] font-bold text-[#7A6E65] leading-snug" title={r.sub}>
              {r.sub}
            </p>
            <div className={cn("mt-2 w-full rounded-t-2xl border-2 border-b-0 border-[#3D352E]/10 flex items-start justify-center pt-1.5", medal.step, medal.h)}>
              <span className="font-display text-lg font-extrabold text-[#3D352E]/80 leading-none">{idx + 1}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RankRow({ r, rank, top, unit, viewerId }: { r: Row; rank: number; top: number; unit: string; viewerId: string }) {
  const mine = r.profile.id === viewerId;
  return (
    <li
      className={cn(
        "grid grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] px-3 py-2 min-w-0",
        mine && "ring-2 ring-[#38B6FF]"
      )}
    >
      <span className="w-8 h-8 rounded-full bg-white border border-[#E6DFD2] flex items-center justify-center font-display text-sm font-extrabold text-[#7A6E65] tabular-nums">{rank}</span>
      <FamilyAvatar profile={r.profile} size={44} />
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-extrabold text-[#3D352E] leading-snug">
          {shortName(r.profile.display_name)}
          {mine && <span className="ml-1.5 text-[10px] text-[#1E88E5]">(kamu)</span>}
        </p>
        <p className="truncate text-[11px] font-bold text-[#7A6E65] leading-snug">{r.sub}</p>
        <div className="mt-1 h-2 rounded-full bg-white border border-[#E6DFD2] overflow-hidden">
          <div className="h-full bg-[#58CC02]" style={{ width: `${Math.round((r.value / top) * 100)}%` }} />
        </div>
      </div>
      <p className="w-20 text-right font-display text-base font-extrabold tabular-nums text-[#3D352E] leading-tight">
        {nf(r.value)}
        <span className="block text-[10px] text-[#7A6E65]">{unit}</span>
      </p>
    </li>
  );
}

function Board({
  title,
  icon,
  unit,
  rows,
  viewerId,
  className,
}: {
  title: string;
  icon: GlyphName;
  unit: string;
  rows: Row[];
  viewerId: string;
  className?: string;
}) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  const rest = rows.slice(3);
  return (
    <CozyCard tone="white" className={cn("p-4 sm:p-5 space-y-4 min-w-0", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <GlyphIcon name={icon} size={28} />
        <h2 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug truncate">{title}</h2>
      </div>
      <div className="pt-4">
        <Podium rows={rows} unit={unit} viewerId={viewerId} />
      </div>
      {rest.length > 0 && (
        <ol start={4} className="space-y-2">
          {rest.map((r, i) => (
            <RankRow key={r.profile.id} r={r} rank={i + 4} top={top} unit={unit} viewerId={viewerId} />
          ))}
        </ol>
      )}
    </CozyCard>
  );
}

export function FamilyLeaderboard({ viewerId }: { viewerId: string }) {
  const profiles = useBukuDompetStore((s) => s.profiles);
  const kids = useMemo(() => profiles.filter((p) => isChildRole(p.role)), [profiles]);
  const [view, setView] = useState<BoardId>("points");

  const pointRows = useMemo<Row[]>(
    () =>
      [...kids]
        .sort((a, b) => b.lifetime_points - a.lifetime_points || a.display_name.localeCompare(b.display_name))
        .map((p) => ({ profile: p, value: p.lifetime_points, sub: `Saldo ${nf(p.points_balance)} Poin` })),
    [kids]
  );
  const streakRows = useMemo<Row[]>(
    () =>
      [...kids]
        .sort((a, b) => b.current_streak - a.current_streak || b.longest_streak - a.longest_streak || a.display_name.localeCompare(b.display_name))
        .map((p) => ({ profile: p, value: p.current_streak, sub: `Rekor ${p.longest_streak} hari` })),
    [kids]
  );

  if (kids.length === 0) return null;
  return (
    <section aria-label="Peringkat keluarga" className="@container space-y-3 min-w-0">
      <div role="tablist" aria-label="Pilih papan peringkat" className="grid grid-cols-2 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2] @4xl:hidden">
        {(
          [
            { id: "points", label: "Poin Terbanyak", icon: "coin" },
            { id: "streak", label: "Streak Terbanyak", icon: "flame" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={view === t.id}
            onClick={() => {
              soundEffects.tactileClick();
              setView(t.id);
            }}
            className={cn(
              "py-2 px-2 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer leading-snug",
              view === t.id ? "bg-[#7ED957] text-[#173300] border-b-[3px] border-b-[#46A302]" : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
            )}
          >
            <GlyphInline name={t.icon} /> {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 @4xl:grid-cols-2 gap-4 min-w-0">
        <Board
          title="Poin Terbanyak"
          icon="coin"
          unit="Poin"
          rows={pointRows}
          viewerId={viewerId}
          className={cn(view !== "points" && "hidden @4xl:block")}
        />
        <Board
          title="Streak Terbanyak"
          icon="flame"
          unit="hari"
          rows={streakRows}
          viewerId={viewerId}
          className={cn(view !== "streak" && "hidden @4xl:block")}
        />
      </div>
    </section>
  );
}

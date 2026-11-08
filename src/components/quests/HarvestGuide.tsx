"use client";

/** Bagian 4 /app/quests — Panduan Panen Poin & Stage XP (kartu visual). */
import React from "react";
import { CozyIcon, type IconName } from "@/components/illustrations/CozyIcons";
import { CozyCard } from "@/components/ui/CozyPrimitives";
import { ARCADE_DAILY_REWARD_LIMIT, ARCADE_LEVEL_POINTS, ARCADE_LEVEL_XP, ARCADE_MAX_LEVEL, STORY_REWARD_POINTS, STORY_REWARD_XP } from "@/lib/family-types";
import { cn } from "@/lib/utils";

interface Row {
  icon: IconName;
  title: string;
  reward: string;
  note: string;
  tone: string;
}

const USER_ROWS: Row[] = [
  { icon: "plus_record", title: "Catat Transaksi Biasa", reward: "+5 Poin & +10 Stage XP", note: "Maks. 3 transaksi berpoin/hari", tone: "bg-[#F7F3EB] border-[#E6DFD2]" },
  { icon: "cat_snack", title: "Transaksi Rinci (≥2 Item)", reward: "+10 Poin & +20 Stage XP", note: "Maks. 3 transaksi berpoin/hari", tone: "bg-[#FFFBEB] border-[#FDE08D]" },
  { icon: "flame_streak", title: "Klaim Streak Harian", reward: "+10 Poin & +15 Stage XP", note: "1x per hari (hari Rp0 jajan juga boleh)", tone: "bg-[#FFF2F0] border-[#FFCDC6]" },
  { icon: "cat_saving", title: "Setor Celengan", reward: "Progres misi & medali", note: "Menabung bukan pengeluaran boros", tone: "bg-[#EEF8FF] border-[#BCE3FF]" },
];

const KID_ROWS: Row[] = [
  { icon: "missions_scroll", title: "Tulis Cerita Harian", reward: `+${STORY_REWARD_POINTS} Poin & +${STORY_REWARD_XP} Stage XP`, note: "Minimal 30 kata, 1x per hari", tone: "bg-[#EFFBE6] border-[#C3EFA4]" },
  { icon: "combo_sparkle", title: "Mini-Game Arcade Sekolah", reward: `+${ARCADE_LEVEL_POINTS[1]} s/d +${ARCADE_LEVEL_POINTS[ARCADE_MAX_LEVEL]} Poin & +${ARCADE_LEVEL_XP[1]} s/d +${ARCADE_LEVEL_XP[ARCADE_MAX_LEVEL]} Stage XP`, note: `Makin tinggi level makin besar. Maks. ${ARCADE_DAILY_REWARD_LIMIT} ronde berhadiah/hari, lulus ≥ 60%`, tone: "bg-[#FFFBEB] border-[#FDE08D]" },
  { icon: "flame_streak", title: "Jaga Api Streak", reward: "+10 Poin & +15 Stage XP", note: "Tulis cerita setiap hari agar api tidak padam", tone: "bg-[#FFF2F0] border-[#FFCDC6]" },
  { icon: "cat_saving", title: "Isi Celengan", reward: "Progres misi & medali", note: "Setor tabungan kecil tiap hari", tone: "bg-[#EEF8FF] border-[#BCE3FF]" },
];

const SHARED_ROWS: Row[] = [
  { icon: "missions_scroll", title: "Misi Harian (3/hari)", reward: "+15 Poin & +25 Stage XP", note: "Per misi selesai", tone: "bg-[#F7F3EB] border-[#E6DFD2]" },
  { icon: "combo_sparkle", title: "Misi Mingguan (2/minggu)", reward: "+150 Poin & +120 Stage XP", note: "Per misi selesai", tone: "bg-[#EFFBE6] border-[#C3EFA4]" },
  { icon: "crown_sultan", title: "Hadiah Tonggak Medali", reward: "Perunggu 50 • Perak 150 • Emas 400 • Berlian 1.000 Poin", note: "Sekali per medali", tone: "bg-[#F8F0FF] border-[#E2C6FF]" },
  { icon: "mystery_box", title: "Peti Harta Jalur", reward: "+10 Poin & +15 Stage XP + aksesori", note: "Setiap kelipatan 7 hari di peta", tone: "bg-[#FFFBEB] border-[#FDE08D]" },
  { icon: "parent_heart", title: "Hadiah dari Keluarga", reward: "+5 atau +10 Poin per hadiah", note: "Dikirim lewat Beranda Keluarga", tone: "bg-[#FFF2F0] border-[#FFCDC6]" },
];

export function HarvestGuide({ isKid }: { isKid: boolean }) {
  const rows = [...(isKid ? KID_ROWS : USER_ROWS), ...SHARED_ROWS];
  return (
    <CozyCard tone="white" className="space-y-3.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <CozyIcon name="xp_star" size={28} className="shrink-0" />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold text-[#3D352E] leading-snug break-words">Panduan Panen Poin & Stage XP</h2>
          <p className="text-xs font-bold text-[#7A6E65]">Semua cara resmi mengumpulkan Poin dan Stage XP, dalam satu tampilan.</p>
        </div>
      </div>
      <ul className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5">
        {rows.map((r) => (
          <li key={r.title} className={cn("p-3 rounded-2xl border-2 border-b-[4px] flex gap-2.5 min-w-0", r.tone)}>
            <CozyIcon name={r.icon} size={30} className="shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-0.5">
              <p className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">{r.title}</p>
              <p className="font-display text-xs font-extrabold text-[#4A3500] leading-snug break-words">{r.reward}</p>
              <p className="text-[11px] font-bold text-[#7A6E65] leading-snug break-words">{r.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </CozyCard>
  );
}

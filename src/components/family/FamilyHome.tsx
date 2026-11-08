"use client";

/** Beranda Keluarga: tab Beranda, Peringkat, dan Chat Keluarga (Obrolan Pet). Dipakai di /app dan /supervisor. */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { FamilyFeed, FeedResetBadge } from "@/components/family/FamilyFeed";
import { FamilyChat } from "@/components/family/FamilyChat";
import { FamilyLeaderboard } from "@/components/family/FamilyLeaderboard";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type Tab = "feed" | "rank" | "chat";

export function FamilyHome({ viewerId, heading = true }: { viewerId: string; heading?: boolean }) {
  const viewer = useBukuDompetStore((s) => s.profiles.find((p) => p.id === viewerId));
  const [tab, setTab] = useState<Tab>("feed");
  if (!viewer) return null;

  return (
    <section aria-label="Beranda Keluarga" className="space-y-4 min-w-0">
      {heading && (
        <div className="space-y-2">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug"><GlyphInline name="house" /> Beranda Keluarga</h1>
          <FeedResetBadge />
        </div>
      )}
      <div role="tablist" aria-label="Pilih ruang keluarga" className="grid grid-cols-3 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
        {(
          [
            { id: "feed", label: "Beranda", icon: "house" },
            { id: "rank", label: "Peringkat", icon: "trophy" },
            { id: "chat", label: "Chat Keluarga", icon: "chat" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              soundEffects.tactileClick();
              setTab(t.id);
            }}
            className={cn(
              "py-2.5 px-2 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer leading-snug break-words",
              tab === t.id ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]" : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
            )}
          >
            <GlyphInline name={t.icon} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "feed" && <FamilyFeed viewer={viewer} />}
      {tab === "rank" && <FamilyLeaderboard viewerId={viewer.id} />}
      {tab === "chat" && <FamilyChat viewerId={viewer.id} />}
    </section>
  );
}

"use client";

/**
 * Chat Keluarga (Obrolan Pet): semua peran mengobrol dalam satu ruang.
 * Setiap gelembung chat muncul di samping Pet milik pengirim (lengkap dengan aksesorinya).
 * Riwayat ikut direset otomatis setiap 7 hari bersama Beranda Keluarga.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useEffect, useRef, useState } from "react";
import { Send } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFamilyStore, shortName, feedCycleInfo } from "@/store/useFamilyStore";
import { CozyCard } from "@/components/ui/CozyPrimitives";
import { FamilyAvatar, ROLE_LABEL } from "@/components/family/FamilyAvatar";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const MAX_LEN = 300;

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function FamilyChat({ viewerId }: { viewerId: string }) {
  const profiles = useBukuDompetStore((s) => s.profiles);
  const chat = useFamilyStore((s) => s.chat);
  const sendChat = useFamilyStore((s) => s.sendChat);
  const cycleStart = useFamilyStore((s) => s.feedCycleStartDate);
  const [text, setText] = useState<string>("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const { daysLeft } = feedCycleInfo(cycleStart);

  // Gulir ke pesan terbaru di dalam daftar chat (bukan halaman).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const submit = () => {
    if (!text.trim()) return;
    if (sendChat(viewerId, text)) {
      soundEffects.tactileClick();
      setText("");
    }
  };

  return (
    <CozyCard tone="white" className="p-0 overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b-2 border-[#E6DFD2] bg-[#FFFDF9] flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug"><GlyphInline name="chat" /> Chat Keluarga (Obrolan Pet)</h2>
        <span className="px-2.5 py-1 rounded-full bg-[#EEF8FF] border border-[#BCE3FF] text-[11px] font-display font-extrabold text-[#1565C0]">
          <GlyphInline name="refresh" /> Chat di-reset otomatis setiap 7 hari (Sisa {daysLeft} hari)
        </span>
      </div>

      <div ref={listRef} role="log" aria-live="polite" aria-label="Riwayat chat keluarga" className="h-[min(56vh,460px)] overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 bg-[#FBF8F1]">
        {chat.length === 0 && (
          <div className="h-full flex items-center justify-center text-center">
            <p className="max-w-xs text-sm font-bold text-[#7A6E65] leading-relaxed">Belum ada obrolan. Sapa keluargamu dan lihat Pet-mu ikut bicara!</p>
          </div>
        )}
        {chat.map((m) => {
          const author = profiles.find((p) => p.id === m.authorId);
          const mine = m.authorId === viewerId;
          if (!author) return null;
          return (
            <div key={m.id} className={cn("flex items-end gap-2 min-w-0", mine && "flex-row-reverse")}>
              <FamilyAvatar profile={author} size={46} />
              <div className={cn("max-w-[78%] min-w-0 space-y-0.5", mine && "items-end text-right")}>
                <p className="text-[10px] font-display font-extrabold text-[#7A6E65] leading-tight">
                  {mine ? "Kamu" : shortName(author.display_name)} • {ROLE_LABEL[author.role]} • {clock(m.createdAt)}
                </p>
                <div
                  className={cn(
                    "inline-block px-3 py-2 rounded-2xl border-2 text-sm font-bold leading-relaxed break-words text-left",
                    mine ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#173300] rounded-br-md" : "bg-white border-[#E6DFD2] text-[#3D352E] rounded-bl-md"
                  )}
                >
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="p-3 border-t-2 border-[#E6DFD2] bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={text}
          maxLength={MAX_LEN}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan untuk keluarga..."
          aria-label="Pesan chat keluarga"
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] focus:border-[#38B6FF] focus:outline-none text-sm font-bold text-[#3D352E]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Kirim pesan"
          className="px-3.5 py-2.5 rounded-2xl bg-[#58CC02] disabled:bg-[#D4C9B4] disabled:cursor-not-allowed text-[#173300] border-b-[4px] border-b-[#46A302] disabled:border-b-[#B9AC95] active:border-b-[2px] active:translate-y-[2px] cursor-pointer flex items-center gap-1.5 font-display text-sm font-extrabold shrink-0"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>
    </CozyCard>
  );
}

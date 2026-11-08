"use client";

/**
 * Chat Keluarga (Obrolan Pet): semua peran mengobrol dalam satu ruang.
 * Setiap gelembung chat muncul di samping Pet milik pengirim (lengkap dengan aksesorinya).
 * Riwayat ikut direset otomatis setiap 7 hari bersama Beranda Keluarga.
 */
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useEffect, useRef, useState } from "react";
import { Send, ImagePlus, X } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFamilyStore, shortName, feedCycleInfo } from "@/store/useFamilyStore";
import { CozyCard } from "@/components/ui/CozyPrimitives";
import { FamilyAvatar, ROLE_LABEL } from "@/components/family/FamilyAvatar";
import { TitleBadge } from "@/components/badges/TitleBadge";
import { convertImageToWebp, CHAT_WEBP_OPTIONS } from "@/lib/webp-converter";
import { notify } from "@/lib/notify";
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
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { daysLeft } = feedCycleInfo(cycleStart);

  // Gulir ke pesan terbaru di dalam daftar chat (bukan halaman).
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  // Tutup pratinjau foto besar dengan tombol Escape.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const res = await convertImageToWebp(file, CHAT_WEBP_OPTIONS);
      setImage(res.dataUrl);
    } catch (err) {
      notify.warn("Foto belum bisa dikirim", err instanceof Error ? err.message : "Foto gagal diproses.");
    } finally {
      setBusy(false);
    }
  };

  const canSend = !busy && (text.trim().length > 0 || image !== null);

  const submit = () => {
    if (!canSend) return;
    if (sendChat(viewerId, text, image ?? undefined)) {
      soundEffects.tactileClick();
      setText("");
      setImage(null);
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
                <div className={cn("flex", mine && "justify-end")}>
                  <TitleBadge profileId={author.id} size="xs" />
                </div>
                <div
                  className={cn(
                    "inline-block max-w-full px-3 py-2 rounded-2xl border-2 text-sm font-bold leading-relaxed break-words text-left space-y-2",
                    mine ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#173300] rounded-br-md" : "bg-white border-[#E6DFD2] text-[#3D352E] rounded-bl-md"
                  )}
                >
                  {m.imageDataUrl && (
                    <button type="button" onClick={() => setZoom(m.imageDataUrl ?? null)} aria-label="Perbesar foto" className="block cursor-zoom-in">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL lokal hasil WebP */}
                      <img src={m.imageDataUrl} alt={`Foto dari ${shortName(author.display_name)}`} loading="lazy" className="max-h-56 w-auto max-w-full rounded-xl object-contain bg-[#F7F3EB]" />
                    </button>
                  )}
                  {m.text && <p className="break-words whitespace-pre-line">{m.text}</p>}
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
        className="p-3 border-t-2 border-[#E6DFD2] bg-white flex flex-wrap items-center gap-2"
      >
        {image && (
          <div className="basis-full relative inline-block w-fit max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL lokal hasil WebP */}
            <img src={image} alt="Pratinjau foto yang akan dikirim" className="max-h-28 rounded-xl border-2 border-[#E6DFD2] object-contain bg-[#F7F3EB]" />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="Hapus foto"
              className="absolute -top-2 -right-2 p-1 rounded-full bg-white border-2 border-[#E6DFD2] text-[#3D352E] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} aria-label="Pilih foto untuk chat" />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          aria-label="Kirim foto"
          className="p-2.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] active:border-b-[2px] active:translate-y-[2px] disabled:opacity-60 text-[#3D352E] cursor-pointer shrink-0"
        >
          <ImagePlus className="w-4 h-4" aria-hidden="true" />
        </button>
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
          disabled={!canSend}
          aria-label="Kirim pesan"
          className="px-3.5 py-2.5 rounded-2xl bg-[#58CC02] disabled:bg-[#D4C9B4] disabled:cursor-not-allowed text-[#173300] border-b-[4px] border-b-[#46A302] disabled:border-b-[#B9AC95] active:border-b-[2px] active:translate-y-[2px] cursor-pointer flex items-center gap-1.5 font-display text-sm font-extrabold shrink-0"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </form>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto chat diperbesar"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[120] bg-[#3D352E]/80 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL lokal hasil WebP */}
          <img src={zoom} alt="Foto chat diperbesar" className="max-h-[88dvh] max-w-full rounded-2xl border-4 border-white object-contain bg-white" />
          <button
            type="button"
            onClick={() => setZoom(null)}
            aria-label="Tutup foto"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white border-2 border-[#E6DFD2] text-[#3D352E] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </CozyCard>
  );
}

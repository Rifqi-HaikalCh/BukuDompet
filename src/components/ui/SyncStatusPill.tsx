"use client";

import React, { useEffect, useRef, useState } from "react";
import { getEngine, useSyncSnapshot } from "@/lib/sync/client";
import { cn } from "@/lib/utils";

/* Glyph SVG kustom (gaya garis membulat, selaras ikon aplikasi) */

function CloudBase({ children, color }: { children?: React.ReactNode; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 18.5h9.5a4 4 0 0 0 .9-7.9 5.5 5.5 0 0 0-10.6 1.5A3.2 3.2 0 0 0 7 18.5Z" />
      {children}
    </svg>
  );
}
const GlyphSaved = () => (
  <CloudBase color="#2E6F00">
    <path d="m9.6 13.4 1.9 1.9 3.3-3.6" />
  </CloudBase>
);
const GlyphSyncing = () => (
  <CloudBase color="#8A5A00">
    <path d="M12 11.2v4.2M10.2 13.4 12 15.4l1.8-2" />
  </CloudBase>
);
const GlyphOffline = () => (
  <CloudBase color="#7A6E65">
    <path d="m4.5 4.5 15 15" />
  </CloudBase>
);
const GlyphAlert = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#C83E2B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.8 21 19.5H3L12 3.8Z" />
    <path d="M12 10v4.2M12 17.2h.01" />
  </svg>
);

type Tone = "ok" | "work" | "off" | "bad";

const TONE: Record<Tone, string> = {
  ok: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]",
  work: "bg-[#FFFBEB] border-[#FDE08D] text-[#6B4A00]",
  off: "bg-[#F7F3EB] border-[#E6DFD2] text-[#5E544B]",
  bad: "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]",
};

function describe(s: ReturnType<typeof useSyncSnapshot>): { tone: Tone; label: string; detail: string; glyph: React.ReactNode; spin?: boolean } {
  const issues = s.blocked + s.held;
  if (s.phase === "auth") {
    return { tone: "bad", label: "Sesi berakhir", detail: "Masuk lagi untuk melanjutkan penyimpanan.", glyph: <GlyphAlert /> };
  }
  if (issues > 0) {
    return {
      tone: "bad",
      label: `${issues.toLocaleString("id-ID")} perubahan tertahan`,
      detail: "Ada perubahan yang ditolak server atau ditahan demi keamanan (penghapusan massal). Periksa lalu pulihkan dari server bila bukan kamu yang menghapusnya.",
      glyph: <GlyphAlert />,
    };
  }
  if (s.phase === "offline") {
    return {
      tone: "off",
      label: s.pending > 0 ? `Offline • ${s.pending.toLocaleString("id-ID")} menunggu` : "Offline",
      detail: "Tidak ada koneksi. Catatanmu aman di perangkat ini dan otomatis terkirim begitu internet kembali.",
      glyph: <GlyphOffline />,
    };
  }
  if (s.phase === "error") {
    return {
      tone: "work",
      label: "Server sibuk • mencoba lagi",
      detail: "Server sedang bermasalah. Catatanmu tetap aman di perangkat ini dan akan dicoba kirim lagi otomatis.",
      glyph: <GlyphAlert />,
    };
  }
  if (s.phase === "syncing" || s.pending > 0) {
    return {
      tone: "work",
      label: s.pending > 0 ? `Menyimpan ${s.pending.toLocaleString("id-ID")}…` : "Menyinkronkan…",
      detail: "Perubahanmu sedang dikirim ke server.",
      glyph: <GlyphSyncing />,
      spin: true,
    };
  }
  return { tone: "ok", label: "Tersimpan", detail: "Semua perubahan sudah tersimpan di server.", glyph: <GlyphSaved /> };
}

/**
 * Indikator penyimpanan: pengguna selalu tahu apakah catatannya sudah ada di server atau masih menunggu.
 * Inilah yang mencegah "terlihat tersimpan padahal belum".
 */
export function SyncStatusPill() {
  const snap = useSyncSnapshot();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!snap.ready) return null;
  const d = describe(snap);
  const compact = d.tone === "ok" && !open;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const last = snap.lastSyncAt
    ? new Date(snap.lastSyncAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      ref={boxRef}
      className="fixed left-3 z-[60] bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-4 max-w-[calc(100vw-1.5rem)]"
    >
      {open && (
        <div
          role="dialog"
          aria-label="Status penyimpanan"
          className="mb-2 w-72 max-w-full rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] p-3.5 space-y-2.5 shadow-lg"
        >
          <p className="font-display text-sm font-extrabold text-[#3D352E]">{d.label}</p>
          <p className="text-xs font-bold text-[#5E544B] leading-relaxed">{d.detail}</p>
          {last && <p className="text-[11px] font-bold text-[#7A6E65]">Terakhir tersinkron pukul {last}</p>}
          {snap.foreign > 0 && (
            <p className="text-[11px] font-bold text-[#8A5A00] leading-relaxed">
              {snap.foreign.toLocaleString("id-ID")} data milik akun lain tertinggal di perangkat ini dan tidak diunggah
              dari akun ini. Masuk sebagai Admin untuk menyimpannya.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || snap.phase === "auth"}
              onClick={() => run(() => getEngine().syncNow())}
              className="px-3 py-1.5 rounded-xl bg-[#E3F4FF] border-2 border-[#9AD2FF] border-b-[4px] border-b-[#5DB4F5] text-xs font-display font-extrabold text-[#1565C0] disabled:opacity-60 cursor-pointer"
            >
              {busy ? "Memproses…" : "Sinkronkan sekarang"}
            </button>
            {snap.blocked + snap.held > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => getEngine().restoreFromServer())}
                className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] text-xs font-display font-extrabold text-[#6B4A00] disabled:opacity-60 cursor-pointer"
              >
                Pulihkan dari server
              </button>
            )}
            {snap.held > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => getEngine().allowHeldDeletes())}
                className="px-3 py-1.5 rounded-xl bg-[#FFF2F0] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C] text-xs font-display font-extrabold text-[#C83E2B] disabled:opacity-60 cursor-pointer"
              >
                Ya, hapus memang sengaja
              </button>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Status penyimpanan: ${d.label}`}
        title={d.label}
        className={cn(
          "flex items-center gap-1.5 rounded-full border-2 border-b-[3px] font-display text-[11px] font-extrabold cursor-pointer shadow-sm",
          "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
          TONE[d.tone],
          compact ? "h-9 w-9 justify-center" : "h-9 px-3"
        )}
      >
        <span className={cn("shrink-0 inline-flex", d.spin && "motion-safe:animate-spin")}>{d.glyph}</span>
        {!compact && <span className="truncate max-w-[14rem]">{d.label}</span>}
      </button>
    </div>
  );
}

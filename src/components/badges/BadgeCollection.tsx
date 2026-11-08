"use client";

/**
 * Koleksi Gelar & Latar Badge (Versi 5.3). Satu panel untuk melihat, membeli, dan memasang:
 * - Tab "Gelar" (tulisan pengenal) dan "Latar" (tampilan belakang badge).
 * - Penyaring status: Milikku / Dijual / Terkunci, dan rarity.
 * - Pratinjau langsung di atas daftar: badge terpasang atau item yang sedang dilihat.
 * Gelar/Latar didapat dari: hadiah awal, Butik (Poin), klaim medali di Misi, Peti Harta Peta Jalur Kas.
 */
import React, { useMemo, useState } from "react";
import { GlyphIcon, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { TitleBadge } from "@/components/badges/TitleBadge";
import { TactileButton } from "@/components/ui/CozyPrimitives";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  BADGE_BGS,
  BADGE_BG_BY_ID,
  DEFAULT_BG_ID,
  DEFAULT_TITLE_ID,
  RARITY_CHIP,
  RARITY_LABEL,
  STARTER_BG_IDS,
  STARTER_TITLE_IDS,
  TITLES,
  TITLE_BY_ID,
  sourceLabel,
  type Rarity,
} from "@/lib/badge-catalog";
import { notify } from "@/lib/notify";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type Kind = "title" | "bg";
type Status = "owned" | "shop" | "locked";

const RARITY_ORDER: Rarity[] = ["umum", "langka", "epik", "mitos"];

function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; glyph?: GlyphName }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 p-1 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => {
            soundEffects.tactileClick();
            onChange(o.id);
          }}
          className={cn(
            "flex-1 min-w-fit px-3 py-1.5 rounded-xl font-display text-xs sm:text-sm font-extrabold leading-snug whitespace-nowrap cursor-pointer transition-colors",
            value === o.id ? "bg-[#7ED957] text-[#173300] border-b-[3px] border-b-[#46A302]" : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
          )}
        >
          {o.glyph && <GlyphIcon name={o.glyph} size={14} className="inline-block mr-1 -mt-0.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BadgeCollection({ profileId }: { profileId: string }) {
  const profile = useBukuDompetStore((s) => s.profiles.find((p) => p.id === profileId));
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const buyBadgeItem = useBukuDompetStore((s) => s.buyBadgeItem);
  const equipBadge = useBukuDompetStore((s) => s.equipBadge);

  const [kind, setKind] = useState<Kind>("title");
  const [status, setStatus] = useState<"owned" | "shop" | "locked" | "all">("owned");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [focusId, setFocusId] = useState<string | null>(null);

  const ownedTitles = useMemo(() => new Set(profile?.ownedTitleIds ?? STARTER_TITLE_IDS), [profile?.ownedTitleIds]);
  const ownedBgs = useMemo(() => new Set(profile?.ownedBadgeBgIds ?? STARTER_BG_IDS), [profile?.ownedBadgeBgIds]);
  const equippedTitleId = profile?.equippedTitleId ?? DEFAULT_TITLE_ID;
  const equippedBgId = profile?.equippedBadgeBgId ?? DEFAULT_BG_ID;
  const canManage = !!profile && profile.id === activeProfileId;

  const items = useMemo(() => {
    const list = kind === "title" ? TITLES : BADGE_BGS;
    const owned = kind === "title" ? ownedTitles : ownedBgs;
    return list
      .map((it) => {
        const st: Status = owned.has(it.id) ? "owned" : it.source.kind === "shop" ? "shop" : "locked";
        return { it, st };
      })
      .filter(({ it, st }) => (status === "all" || st === status) && (rarity === "all" || it.rarity === rarity))
      .sort((a, b) => RARITY_ORDER.indexOf(a.it.rarity) - RARITY_ORDER.indexOf(b.it.rarity) || a.it.name.localeCompare(b.it.name));
  }, [kind, ownedTitles, ownedBgs, status, rarity]);

  if (!profile) return null;

  const previewTitle = kind === "title" ? focusId && TITLE_BY_ID[focusId] ? focusId : equippedTitleId : equippedTitleId;
  const previewBg = kind === "bg" ? (focusId && BADGE_BG_BY_ID[focusId] ? focusId : equippedBgId) : equippedBgId;
  const previewTitleFinal = kind === "title" ? previewTitle : equippedTitleId;
  const focusing = focusId !== null;

  const act = (id: string, st: Status) => {
    if (!canManage) {
      notify.info("Hanya pemilik profil", "Gelar dan Latar dipasang dari profil anak itu sendiri.");
      return;
    }
    if (st === "owned") {
      const res = equipBadge(profile.id, kind === "title" ? { titleId: id } : { bgId: id });
      notify.result(res, "Badge terpasang", "Belum bisa dipasang");
      if (res.success) soundEffects.tactileClick();
    } else if (st === "shop") {
      const res = buyBadgeItem(kind, id);
      // Berhasil: toast "dibeli" dari store sudah tampil; gagal: tampilkan alasannya.
      if (!res.success) notify.warn("Belum bisa dibeli", res.message);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="rounded-3xl border-2 border-[#E6DFD2] bg-[#FFFDF9] p-4 flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
          {focusing ? "Pratinjau" : "Badge terpasang"}
        </span>
        <TitleBadge titleId={previewTitleFinal} bgId={previewBg} size="lg" />
        {focusing && (
          <button type="button" onClick={() => setFocusId(null)} className="text-xs font-bold text-[#1E88E5] underline cursor-pointer">
            Kembali ke badge terpasang
          </button>
        )}
      </div>

      <Seg
        label="Jenis badge"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setFocusId(null);
        }}
        options={[
          { id: "title", label: "Gelar", glyph: "crown" },
          { id: "bg", label: "Latar", glyph: "sparkle" },
        ]}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <Seg
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { id: "owned", label: "Milikku" },
            { id: "shop", label: "Dijual" },
            { id: "locked", label: "Terkunci" },
            { id: "all", label: "Semua" },
          ]}
        />
        <Seg
          label="Rarity"
          value={rarity}
          onChange={setRarity}
          options={[{ id: "all" as const, label: "Semua" }, ...RARITY_ORDER.map((r) => ({ id: r, label: RARITY_LABEL[r] }))]}
        />
      </div>

      {items.length === 0 ? (
        <div className="p-6 rounded-3xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center">
          <p className="font-display text-sm font-extrabold text-[#3D352E]">Belum ada yang cocok dengan filter ini.</p>
          <p className="text-xs font-bold text-[#7A6E65] mt-1">Coba ganti status atau rarity.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map(({ it, st }) => {
            const equipped = kind === "title" ? equippedTitleId === it.id : equippedBgId === it.id;
            const price = it.source.kind === "shop" ? it.source.price : 0;
            const poor = st === "shop" && profile.points_balance < price;
            return (
              <li
                key={it.id}
                className={cn(
                  "rounded-2xl border-2 bg-white p-3 flex flex-col gap-2 min-w-0",
                  equipped ? "border-[#58CC02]" : "border-[#E6DFD2]",
                  focusId === it.id && "ring-2 ring-[#38B6FF]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setFocusId(it.id)}
                  aria-label={`Pratinjau ${it.name}`}
                  className={cn("self-start max-w-full cursor-pointer", st === "locked" && "opacity-60 grayscale")}
                >
                  {kind === "title" ? (
                    <TitleBadge titleId={it.id} bgId={equippedBgId} size="sm" />
                  ) : (
                    <TitleBadge titleId={equippedTitleId} bgId={it.id} size="sm" />
                  )}
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  {/* Nama gelar sudah tampil di dalam badge; nama hanya ditulis untuk Latar agar tidak dobel. */}
                  <p className="font-display text-sm font-extrabold text-[#3D352E] leading-snug truncate min-w-0 flex-1">
                    {kind === "bg" ? it.name : <span className="sr-only">{it.name}</span>}
                  </p>
                  <span className={cn("shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-display font-extrabold", RARITY_CHIP[it.rarity])}>
                    {RARITY_LABEL[it.rarity]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto min-w-0">
                  <p className="text-[11px] font-bold text-[#7A6E65] leading-snug min-w-0">
                    {st === "owned" ? "Sudah kamu miliki" : sourceLabel(it.source)}
                  </p>
                  {st === "owned" ? (
                    equipped ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#E8F8DD] text-[#2E7D00] font-display text-xs font-extrabold">
                        <GlyphIcon name="check_circle" size={13} /> Dipakai
                      </span>
                    ) : (
                      <TactileButton variant="matcha" size="sm" onClick={() => act(it.id, st)} className="shrink-0">
                        Pasang
                      </TactileButton>
                    )
                  ) : st === "shop" ? (
                    <TactileButton variant={poor ? "cream" : "honey"} size="sm" onClick={() => act(it.id, st)} className="shrink-0">
                      <GlyphIcon name="coin" size={13} /> {price.toLocaleString("id-ID")}
                    </TactileButton>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-display font-extrabold text-[#7A6E65]">
                      <GlyphIcon name="lock" size={13} /> Terkunci
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] font-bold text-[#7A6E65] leading-relaxed">
        Gelar dan Latar yang terpasang tampil di Beranda Keluarga: postingan, peringkat, dan chat. Dapatkan lebih banyak dari Butik, klaim medali di Misi, dan Peti Harta Peta Jalur Kas.
      </p>
    </div>
  );
}

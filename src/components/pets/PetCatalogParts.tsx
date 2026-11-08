"use client";

import React from "react";
import {
  AccessoryPreviewIcon,
  GROWTH_STAGE_META,
  SLOT_LABEL,
  ACCESSORY_SLOTS,
  ACCESSORY_BY_ID,
  ACCESSORY_GENDER_LABEL,
  type AccessoryItem,
  type AccessorySlot,
  type GrowthStage,
} from "@/components/illustrations/PetAvatarSystem";
import { GlyphIcon, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { LazyAccessoryPreview } from "@/components/user/LazyAccessoryPreview";
import { CozySheet } from "@/components/ui/CozySheet";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { TactileButton, type TactileVariant } from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

/* ───────────────────────── Ikon kategori slot ───────────────────────── */

/** Ikon kustom per slot kosmetik (menggantikan teks polos pada chip). */
export const SLOT_GLYPH: Record<AccessorySlot, GlyphName> = {
  head: "hat",
  outfit: "shirt",
  face: "glasses",
  neck: "scarf",
  prop: "wand",
  aura: "aura",
  background: "scenery",
};

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9]";

/* ───────────────────────── Kartu item ringkas ───────────────────────── */

export interface TileAction {
  label: React.ReactNode;
  variant: TactileVariant;
  onClick?: () => void;
  disabled?: boolean;
}

export interface ItemTileProps {
  item: AccessoryItem;
  /** Item rahasia (fase belum terbuka): nama & gambar disembunyikan. */
  locked?: boolean;
  /** Sedang dipasang di pet. */
  equipped?: boolean;
  /** Sudah dimiliki (Butik). */
  owned?: boolean;
  /** Harga (hanya di Butik). */
  price?: number;
  action: TileAction;
  onOpen: () => void;
}

/**
 * Kartu item Versi 5.1: hanya gambar, nama, dan SATU tombol aksi (beli/pasang/lepas).
 * Deskripsi, fase, slot, harga lengkap, dan info penggantian dipindah ke `ItemDetailModal`
 * yang terbuka saat gambar/nama diketuk. Hasilnya kartu ±3× lebih pendek dan 2–3 kolom muat sejajar.
 */
export function ItemTile({ item, locked = false, equipped = false, owned = false, price, action, onOpen }: ItemTileProps) {
  const displayName = locked ? `Item Rahasia Fase ${item.stageRequirement}` : item.name;
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-b-[4px] flex flex-col p-2 gap-1.5 transition-all min-w-0",
        equipped || owned
          ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
          : locked
          ? "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4]"
          : "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
      )}
    >
      <button
        type="button"
        onClick={() => {
          soundEffects.tactileClick();
          onOpen();
        }}
        aria-label={`Lihat detail ${displayName}`}
        className={cn("flex flex-col items-center gap-1.5 text-center cursor-pointer rounded-xl min-w-0", FOCUS_RING)}
      >
        <span className="relative w-full aspect-square max-w-[104px] rounded-xl bg-[#FFFDF9] border-2 border-[#E6DFD2] flex items-center justify-center p-1.5">
          <LazyAccessoryPreview accessoryId={item.id} isMysteryLocked={locked} className="w-full h-full" />
          {(equipped || owned) && (
            <span
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#58CC02] border-2 border-white flex items-center justify-center text-white"
              title={equipped ? "Sedang dipasang" : "Sudah dimiliki"}
            >
              <GlyphIcon name="check" size={14} />
            </span>
          )}
          <span className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-white border-2 border-[#E6DFD2] flex items-center justify-center text-[#3D352E]" aria-hidden="true">
            <GlyphIcon name={SLOT_GLYPH[item.slot]} size={14} />
          </span>
        </span>
        <span className="font-display text-xs font-extrabold text-[#3D352E] leading-tight line-clamp-2 min-h-[2.5em] break-words">
          {displayName}
        </span>
        {typeof price === "number" && !locked && !owned && (
          <span className="inline-flex items-center gap-1 font-display text-[11px] font-extrabold tabular-nums text-[#4A3500]">
            <CozyIcon name="coin_rupiah" size={14} />
            {price.toLocaleString("id-ID")}
          </span>
        )}
      </button>
      <TactileButton
        variant={action.variant}
        size="sm"
        fullWidth
        disabled={action.disabled}
        onClick={action.onClick}
        className="!px-2 !py-1.5 text-[11px] mt-auto"
      >
        {action.label}
      </TactileButton>
    </div>
  );
}

/* ───────────────────────── Modal detail item ───────────────────────── */

export interface ItemDetailModalProps {
  item: AccessoryItem | null;
  onClose: () => void;
  petName: string;
  locked?: boolean;
  equipped?: boolean;
  owned?: boolean;
  /** Item lain yang akan digantikan pada slot yang sama. */
  replacing?: AccessoryItem | null;
  /** Tampilkan harga & saldo (Butik). */
  showPrice?: boolean;
  balance?: number;
  /** Peringatan: rambut/hijab belum tampil di Fase 1. */
  hatchFirst?: boolean;
  action: TileAction | null;
}

export function ItemDetailModal({
  item,
  onClose,
  petName,
  locked = false,
  equipped = false,
  owned = false,
  replacing = null,
  showPrice = false,
  balance = 0,
  hatchFirst = false,
  action,
}: ItemDetailModalProps) {
  const stageMeta = item ? GROWTH_STAGE_META[item.stageRequirement as GrowthStage] : null;
  return (
    <CozySheet
      open={item !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={item ? (locked ? `Item Rahasia Fase ${item.stageRequirement}` : item.name) : "Detail Item"}
      description={item ? `Slot ${SLOT_LABEL[item.slot]}` : undefined}
      icon={item ? <GlyphIcon name={SLOT_GLYPH[item.slot]} size={30} /> : undefined}
      maxWidthClass="md:max-w-md"
      footer={
        action ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <TactileButton variant={action.variant} fullWidth disabled={action.disabled} onClick={action.onClick}>
              {action.label}
            </TactileButton>
            <TactileButton variant="cream" fullWidth onClick={onClose}>
              Tutup
            </TactileButton>
          </div>
        ) : undefined
      }
    >
      {item && stageMeta && (
        <div className="space-y-3.5">
          <div className="mx-auto w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] flex items-center justify-center p-3">
            <AccessoryPreviewIcon accessoryId={item.id} isMysteryLocked={locked} className="w-full h-full" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1">
              <GlyphIcon name={SLOT_GLYPH[item.slot]} size={14} /> {SLOT_LABEL[item.slot]}
            </span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-lg border text-[11px] font-display font-extrabold",
                locked ? "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]" : "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]"
              )}
            >
              Fase {item.stageRequirement}: {stageMeta.name}
            </span>
            {!locked && (
              <span className="px-2.5 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#6B5F56]">
                {ACCESSORY_GENDER_LABEL[item.gender]}
              </span>
            )}
            {item.source === "path_drop" ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1">
                <CozyIcon name="mystery_box" size={14} /> Eksklusif Jalur Kas
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-[#EFFBE6] border border-[#C3EFA4] text-[11px] font-display font-extrabold text-[#2E6F00] inline-flex items-center gap-1">
                <CozyIcon name="boutique_shop" size={14} /> Dijual di Butik
              </span>
            )}
            {equipped && (
              <span className="px-2.5 py-0.5 rounded-lg bg-[#58CC02] text-white text-[11px] font-display font-extrabold inline-flex items-center gap-1">
                <GlyphIcon name="check" size={12} /> Sedang dipasang
              </span>
            )}
            {owned && !equipped && (
              <span className="px-2.5 py-0.5 rounded-lg bg-[#EFFBE6] border border-[#C3EFA4] text-[11px] font-display font-extrabold text-[#2E6F00]">
                Sudah dimiliki
              </span>
            )}
          </div>

          <p className="text-sm font-bold text-[#7A6E65] leading-relaxed break-words text-center">
            {locked
              ? `Rawat ${petName} hingga mencapai Fase ${item.stageRequirement} (${stageMeta.name}) untuk membuka siluet rahasia ini!`
              : item.description}
          </p>

          {showPrice && !locked && (
            <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">Harga</p>
                <p className="font-display text-lg font-extrabold tabular-nums text-[#4A3500] inline-flex items-center gap-1.5">
                  <CozyIcon name="coin_rupiah" size={20} /> {item.pricePoints.toLocaleString("id-ID")} Poin
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">Saldomu</p>
                <p
                  className={cn(
                    "font-display text-sm font-extrabold tabular-nums",
                    balance >= item.pricePoints ? "text-[#2E6F00]" : "text-[#C83E2B]"
                  )}
                >
                  {balance.toLocaleString("id-ID")} Poin
                </p>
              </div>
            </div>
          )}

          {replacing && (
            <div className="px-3 py-2 rounded-xl bg-[#EEF8FF] border border-[#BCE3FF] text-xs font-bold text-[#1565C0] leading-snug break-words">
              Menggantikan: <strong>{replacing.name}</strong> (slot {SLOT_LABEL[item.slot]} hanya muat satu).
            </div>
          )}

          {hatchFirst && !locked && (
            <div className="px-3 py-2 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] text-xs font-bold text-[#4A3500] leading-snug inline-flex items-start gap-1.5">
              <CozyIcon name="egg_nest" size={16} className="shrink-0" />
              <span>Rambut dan hijab baru tampil setelah {petName} menetas (Fase 2+).</span>
            </div>
          )}
        </div>
      )}
    </CozySheet>
  );
}

/* ───────────────────────── Panel kosmetik terpasang ───────────────────────── */

export interface EquippedSlotsPanelProps {
  equipped: Partial<Record<AccessorySlot, string>> | undefined;
  ownedIds: readonly string[];
  /** Pasang / lepas / tukar (toggle). */
  onToggle: (itemId: string) => void;
  onOpenItem: (itemId: string) => void;
  /** Buka Butik dengan filter slot ini. */
  onGoShop: (slot: AccessorySlot) => void;
  petName: string;
  /** Jika disetel, tampilkan petunjuk "rambut belum tampil di Fase 1". */
  isEggStage?: boolean;
}

/**
 * Lemari mini di samping karakter pet:
 * 7 chip slot berikon (hijau = terpasang, abu = kosong) → pilih slot → strip koleksi slot itu
 * yang bisa digeser ke samping. Ketuk item untuk pasang/tukar, ketuk item terpasang untuk melepas.
 */
export function EquippedSlotsPanel({ equipped, ownedIds, onToggle, onOpenItem, onGoShop, petName, isEggStage }: EquippedSlotsPanelProps) {
  const [slot, setSlot] = React.useState<AccessorySlot>("outfit");
  const eqId = equipped?.[slot];
  const eqItem = eqId ? ACCESSORY_BY_ID[eqId] : null;
  const installedCount = ACCESSORY_SLOTS.filter((s) => equipped?.[s]).length;
  const slotItems = React.useMemo(
    () => ownedIds.map((id) => ACCESSORY_BY_ID[id]).filter((a): a is AccessoryItem => !!a && a.slot === slot),
    [ownedIds, slot]
  );

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1.5">
          <GlyphIcon name="hanger" size={18} /> Lemari Cepat · Terpasang {installedCount}/{ACCESSORY_SLOTS.length}
        </p>
      </div>

      <ChipScroller label="Slot kosmetik" watch={slot}>
        {ACCESSORY_SLOTS.map((s) => {
          const on = !!equipped?.[s];
          const selected = s === slot;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={selected}
              aria-label={`${SLOT_LABEL[s]}: ${on ? "terpasang" : "kosong"}`}
              onClick={() => {
                soundEffects.tactileClick();
                setSlot(s);
              }}
              className={cn(
                "relative rounded-2xl border-2 px-2.5 py-1.5 min-w-[76px] flex flex-col items-center gap-0.5 cursor-pointer transition-all",
                FOCUS_RING,
                selected
                  ? "bg-[#EEF8FF] border-[#38B6FF] border-b-[4px] border-b-[#1E88E5]"
                  : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] hover:bg-white"
              )}
            >
              <GlyphIcon name={SLOT_GLYPH[s]} size={26} />
              <span className="font-display text-[11px] font-extrabold text-[#3D352E] leading-none">{SLOT_LABEL[s]}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[9px] font-display font-extrabold leading-none",
                  on ? "text-[#2E6F00]" : "text-[#6B5F56]"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-[#58CC02]" : "bg-[#C9BFAE]")} aria-hidden="true" />
                {on ? "Terpasang" : "Kosong"}
              </span>
            </button>
          );
        })}
      </ChipScroller>

      <div className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] p-2.5 flex items-center gap-2.5 min-w-0">
        <span className="w-12 h-12 rounded-xl bg-white border-2 border-[#E6DFD2] flex items-center justify-center shrink-0 p-1">
          {eqItem ? (
            <AccessoryPreviewIcon accessoryId={eqItem.id} className="w-full h-full" />
          ) : (
            <GlyphIcon name={SLOT_GLYPH[slot]} size={24} className="opacity-40" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-display font-extrabold uppercase text-[#7A6E65]">{SLOT_LABEL[slot]}</p>
          <p className="text-xs font-extrabold text-[#3D352E] leading-snug break-words">
            {eqItem ? eqItem.name : `Polos — ${petName} belum memakai ${SLOT_LABEL[slot].toLowerCase()}`}
          </p>
        </div>
        {eqItem && (
          <button
            type="button"
            onClick={() => {
              soundEffects.tactileClick();
              onToggle(eqItem.id);
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FFEAE6] border-2 border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#C83E2B] cursor-pointer shrink-0",
              FOCUS_RING
            )}
          >
            Lepas
          </button>
        )}
      </div>

      <ChipScroller label={`Koleksi slot ${SLOT_LABEL[slot]}`} watch={`${slot}:${eqId ?? ""}`}>
        {slotItems.map((it) => {
          const isOn = eqId === it.id;
          return (
            <div key={it.id} className="w-[84px] flex flex-col items-center gap-1">
              <button
                type="button"
                aria-pressed={isOn}
                aria-label={`${isOn ? "Lepas" : "Pasang"} ${it.name}`}
                onClick={() => {
                  soundEffects.tactileClick();
                  onToggle(it.id);
                }}
                className={cn(
                  "relative w-[72px] h-[72px] rounded-2xl border-2 p-1.5 cursor-pointer transition-all",
                  FOCUS_RING,
                  isOn ? "bg-[#EFFBE6] border-[#58CC02] border-b-[4px] border-b-[#46A302]" : "bg-white border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] hover:bg-[#FFFDF9]"
                )}
              >
                <LazyAccessoryPreview accessoryId={it.id} className="w-full h-full" />
                {isOn && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#58CC02] border-2 border-white text-white flex items-center justify-center">
                    <GlyphIcon name="check" size={11} />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  onOpenItem(it.id);
                }}
                className={cn("text-[10px] font-display font-extrabold text-[#3D352E] leading-tight line-clamp-2 text-center underline decoration-dotted cursor-pointer rounded", FOCUS_RING)}
              >
                {it.name}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => {
            soundEffects.tactileClick();
            onGoShop(slot);
          }}
          className={cn(
            "w-[84px] h-[72px] rounded-2xl border-2 border-dashed border-[#BCE3FF] bg-[#EEF8FF] text-[#1565C0] flex flex-col items-center justify-center gap-0.5 cursor-pointer font-display text-[10px] font-extrabold leading-tight text-center",
            FOCUS_RING
          )}
        >
          <CozyIcon name="boutique_shop" size={22} />
          {slotItems.length === 0 ? "Belum punya, ke Butik" : "Cari lagi di Butik"}
        </button>
      </ChipScroller>

      {isEggStage && (slot === "head" || slot === "outfit") && (
        <p className="text-[10px] font-bold text-[#6B5F56] leading-snug">
          Saat masih Telur Ajaib (Fase 1), hanya topi, properti, aura, dan latar yang terlihat.
        </p>
      )}
    </div>
  );
}

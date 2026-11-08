"use client";

import { TitleBadge } from "@/components/badges/TitleBadge";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  AccessoryPreviewIcon,
  SLOT_LABEL,
  GROWTH_STAGE_META,
} from "@/components/illustrations/PetAvatarSystem";
import { TactileButton } from "@/components/ui/CozyPrimitives";
import { Sparkles, Archive } from "@/components/illustrations/UiGlyphs";

const SVG_ATTR_ORIGIN = {
  transformBox: "view-box" as const,
  transformOrigin: "0 0",
};

export function AccessoryDropModal() {
  const rawUid = useId();
  const uid = rawUid.replace(/:/g, "");
  const unboxed = useBukuDompetStore((s) => s.unboxedAccessoryDrop);
  const closeUnboxed = useBukuDompetStore((s) => s.closeUnboxedAccessoryModal);
  const equipDirect = useBukuDompetStore((s) => s.equipAccessoryDirect);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const isOpen = unboxed !== null;

  // Aksesibilitas dialog: fokus awal ke tombol aman, Esc menutup (item sudah tersimpan di lemari)
  useEffect(() => {
    if (!isOpen) return;
    actionsRef.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUnboxed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeUnboxed]);

  if (!unboxed) return null;

  const { item: droppedItem, milestoneDay, points, xp } = unboxed;
  const newTitleIds = unboxed.newTitleIds ?? [];
  const newBgIds = unboxed.newBgIds ?? [];
  const slotLabel = SLOT_LABEL[droppedItem.slot] || droppedItem.slot;
  const stageMeta = GROWTH_STAGE_META[droppedItem.stageRequirement];

  const handleEquipNow = () => {
    equipDirect(droppedItem.id);
    closeUnboxed();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-[#3D352E]/65 backdrop-blur-sm">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${uid}-drop-title`}
          initial={{ opacity: 0, scale: 0.86, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="relative w-full max-w-md bg-white border-2 border-[#E6DFD2] border-b-[6px] border-b-[#D4C9B4] rounded-[32px] p-6 md:p-7 text-center overflow-hidden shadow-xl"
        >
          {/* Golden-Taro Rotating Sunburst Rays */}
          <div className="relative mx-auto w-48 h-48 flex items-center justify-center mb-3">
            <motion.svg
              viewBox="0 0 200 200"
              className="absolute inset-0 w-full h-full pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            >
              <defs>
                <radialGradient id={`${uid}-unbox-sunburst-grad`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFE27A" stopOpacity="0.85" />
                  <stop offset="55%" stopColor="#E3B6FF" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FFFDF7" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="94" fill={`url(#${uid}-unbox-sunburst-grad)`} />
              {Array.from({ length: 12 }).map((_, idx) => {
                const angle = idx * 30;
                return (
                  <polygon
                    key={idx}
                    points="100,100 90,8 110,8"
                    fill={idx % 2 === 0 ? "#FFC800" : "#CE82FF"}
                    opacity={idx % 2 === 0 ? 0.28 : 0.22}
                    transform={`rotate(${angle} 100 100)`}
                    style={SVG_ATTR_ORIGIN}
                  />
                );
              })}
            </motion.svg>

            {/* Glowing Pedestal */}
            <motion.div
              initial={{ scale: 0.5, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.08 }}
              className="relative z-10 w-32 h-32 rounded-3xl bg-[#FFFDF7] border-2 border-[#E5A400] border-b-[5px] border-b-[#C98A00] flex items-center justify-center p-2 shadow-md"
            >
              <AccessoryPreviewIcon
                accessoryId={droppedItem.id}
                className="w-28 h-28"
              />
            </motion.div>
          </div>

          {/* Exclusive Path Drop Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF9E6] border-2 border-[#E5A400] text-[#4A3500] text-xs font-extrabold tracking-wide mb-3">
            <GlyphInline name="gift" /> ITEM EKSKLUSIF JALUR KAS DITEMUKAN!
          </div>

          <p className="text-xs font-bold text-[#7A6E65] mb-1">
            Peti Harta Hari ke-{milestoneDay} Terbuka!
          </p>

          {/* Item Name — Full, Never Truncated */}
          <h2
            id={`${uid}-drop-title`}
            className="font-display text-2xl font-extrabold text-[#3D352E] leading-snug break-words mb-2"
          >
            {droppedItem.name}
          </h2>

          {/* Slot & Growth Stage Metadata Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-[#3D352E] text-xs font-extrabold">
              Slot: {slotLabel}
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-[#3D352E] text-xs font-extrabold">
              Fase {droppedItem.stageRequirement}: {stageMeta?.name || "Spesial"}
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#FFF9E6] border border-[#F5D97E] text-[#4A3500] text-xs font-extrabold">
              +{points} Poin & +{xp} Stage XP
            </span>
          </div>

          {/* Description */}
          <p className="text-sm font-semibold text-[#5C5248] bg-[#FAF6EE] border border-[#E6DFD2] rounded-2xl p-3.5 leading-relaxed mb-5">
            {droppedItem.description}
          </p>

          {(newTitleIds.length > 0 || newBgIds.length > 0) && (
            <div className="mb-5 rounded-2xl border-2 border-[#E6DFD2] bg-white p-3 space-y-2">
              <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">Bonus Badge Baru</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {newTitleIds.map((id) => (
                  <TitleBadge key={id} titleId={id} size="md" />
                ))}
                {newBgIds.map((id) => (
                  <TitleBadge key={id} bgId={id} titleId="t_penabung_cerdas" size="md" />
                ))}
              </div>
              <p className="text-[11px] font-bold text-[#7A6E65] leading-snug">Pasang dari Koleksi Badge di halaman Pet, lalu pamerkan di Beranda Keluarga.</p>
            </div>
          )}

          {/* Two Direct Action Buttons */}
          <div ref={actionsRef} className="flex flex-col sm:flex-row gap-2.5">
            <TactileButton
              variant="cream"
              size="md"
              className="w-full sm:flex-1 justify-center"
              onClick={closeUnboxed}
            >
              <Archive className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Simpan ke Lemari</span>
            </TactileButton>

            <TactileButton
              variant="matcha"
              size="md"
              className="w-full sm:flex-1 justify-center"
              onClick={handleEquipNow}
            >
              <Sparkles className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Pasang Langsung ke Pet!</span>
            </TactileButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

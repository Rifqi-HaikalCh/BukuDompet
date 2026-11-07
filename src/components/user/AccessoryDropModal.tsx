"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  AccessoryPreviewIcon,
  SLOT_LABEL,
  GROWTH_STAGE_META,
} from "@/components/illustrations/PetAvatarSystem";
import { TactileButton } from "@/components/ui/CozyPrimitives";
import { Sparkles, Archive } from "lucide-react";

export function AccessoryDropModal() {
  const unboxed = useBukuDompetStore((s) => s.unboxedAccessoryDrop);
  const closeUnboxed = useBukuDompetStore((s) => s.closeUnboxedAccessoryModal);
  const equipDirect = useBukuDompetStore((s) => s.equipAccessoryDirect);

  if (!unboxed) return null;

  const { item: droppedItem, milestoneDay, points, xp } = unboxed;
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
                <radialGradient id="unbox-sunburst-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFE27A" stopOpacity="0.85" />
                  <stop offset="55%" stopColor="#E3B6FF" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FFFDF7" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="94" fill="url(#unbox-sunburst-grad)" />
              {Array.from({ length: 12 }).map((_, idx) => {
                const angle = idx * 30;
                return (
                  <polygon
                    key={idx}
                    points="100,100 90,8 110,8"
                    fill={idx % 2 === 0 ? "#FFC800" : "#CE82FF"}
                    opacity={idx % 2 === 0 ? 0.28 : 0.22}
                    transform={`rotate(${angle} 100 100)`}
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
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF9E6] border-2 border-[#E5A400] text-[#9E6D00] text-xs font-extrabold tracking-wide mb-3">
            🎁 ITEM EKSKLUSIF JALUR KAS DITEMUKAN!
          </div>

          <p className="text-xs font-bold text-[#7A6E65] mb-1">
            Peti Harta Hari ke-{milestoneDay} Terbuka!
          </p>

          {/* Item Name — Full, Never Truncated */}
          <h2 className="font-display text-2xl font-extrabold text-[#3D352E] leading-snug break-words mb-2">
            {droppedItem.name}
          </h2>

          {/* Slot & Growth Stage Metadata Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-xl bg-[#F3E8FF] border border-[#D8B4FE] text-[#6B21A8] text-xs font-extrabold">
              Slot: {slotLabel}
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#EFFBE6] border border-[#BCE89C] text-[#2F6A00] text-xs font-extrabold">
              Fase {droppedItem.stageRequirement}: {stageMeta?.name || "Spesial"}
            </span>
            <span className="px-3 py-1 rounded-xl bg-[#FFF9E6] border border-[#F5D97E] text-[#9E6D00] text-xs font-extrabold">
              +{points} Poin & +{xp} Stage XP
            </span>
          </div>

          {/* Description */}
          <p className="text-sm font-semibold text-[#5C5248] bg-[#FAF6EE] border border-[#E6DFD2] rounded-2xl p-3.5 leading-relaxed mb-5">
            {droppedItem.description}
          </p>

          {/* Two Direct Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
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
              <span>Pasang Langsung ke Pet! ✨</span>
            </TactileButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

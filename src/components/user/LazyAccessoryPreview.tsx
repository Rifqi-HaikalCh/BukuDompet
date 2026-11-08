"use client";

import React, { useRef } from "react";
import { useInView } from "framer-motion";
import {
  AccessoryPreviewIcon,
  SLOT_LABEL,
  getAccessory,
} from "@/components/illustrations/PetAvatarSystem";

export interface LazyAccessoryPreviewProps {
  accessoryId: string;
  /** Tampilkan kotak misterius terkunci dengan lencana `?`. */
  isMysteryLocked?: boolean;
  /** Kelas ukuran pembungkus (mis. `w-20 h-20`). */
  className?: string;
}

/**
 * Pratinjau item yang baru digambar ketika masuk (atau mendekati) viewport.
 *
 * Alasan: grid Butik bisa menampilkan hingga 96 kartu, dan tiap pratinjau (terutama aura & latar) memuat
 * puluhan elemen SVG dengan animasi berulang. Dengan CPU 4× lebih lambat, mem-mount semuanya sekaligus
 * memakan >1,5 detik dan animasi tak terlihat tetap membebani main thread. Di luar viewport, yang
 * dirender hanyalah kotak kosong berukuran sama (tanpa pergeseran tata letak) yang tetap memiliki label
 * aksesibilitas.
 */
export function LazyAccessoryPreview({
  accessoryId,
  isMysteryLocked = false,
  className,
}: LazyAccessoryPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "240px 0px 240px 0px" });

  if (inView) {
    return (
      <div ref={ref} className={className}>
        <AccessoryPreviewIcon
          accessoryId={accessoryId}
          isMysteryLocked={isMysteryLocked}
          className="w-full h-full"
        />
      </div>
    );
  }

  const item = getAccessory(accessoryId);
  const label = !item
    ? "Item tidak dikenal"
    : isMysteryLocked
    ? `Item rahasia: ${SLOT_LABEL[item.slot]} terkunci, buka di fase ${item.stageRequirement}`
    : `${item.name} — ${SLOT_LABEL[item.slot]}`;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={`${className ?? ""} rounded-2xl bg-[#F7F3EB]`}
    />
  );
}

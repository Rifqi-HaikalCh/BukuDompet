"use client";

import React from "react";
import { Drawer } from "vaul";
import { X } from "@/components/illustrations/UiGlyphs";
import { cn } from "@/lib/utils";
import { soundEffects } from "@/lib/sound-effects";

/**
 * Laci geser (bottom sheet di ponsel, modal di tengah pada desktop) bergaya Cozy.
 * Dibungkus agar modal baru Versi 5.0 (Cerita, Tabungan, Arcade) tampil seragam dengan
 * TransactionDrawer yang sudah ada.
 */
export interface CozySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Lebar maksimum modal desktop. */
  maxWidthClass?: string;
}

export function CozySheet({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  maxWidthClass = "md:max-w-2xl",
}: CozySheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/50 z-50 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            "bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] z-50 flex flex-col focus:outline-none",
            "fixed bottom-0 left-0 right-0 rounded-t-[32px] max-h-[92dvh]",
            "md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:after:hidden! md:w-[94vw] md:rounded-3xl md:max-h-[88dvh] md:shadow-2xl",
            maxWidthClass
          )}
        >
          <div className="md:hidden mx-auto w-14 h-2 rounded-full bg-[#D4C9B4] my-2.5 shrink-0" />

          <div className="px-4 sm:px-6 py-3.5 border-b-2 border-[#E6DFD2] flex items-center justify-between gap-2 shrink-0 bg-white md:rounded-t-3xl">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon}
              <div className="min-w-0">
                <Drawer.Title className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                  {title}
                </Drawer.Title>
                <Drawer.Description className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                  {description ?? "Dialog Buku Dompet"}
                </Drawer.Description>
              </div>
            </div>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => {
                soundEffects.tactileClick();
                onOpenChange(false);
              }}
              className="p-2 rounded-2xl border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] bg-[#F7F3EB] hover:bg-[#EFE9DC] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 text-[#3D352E]" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 min-h-0">
            {children}
          </div>

          {footer && (
            <div className="px-4 sm:px-6 py-3 border-t-2 border-[#E6DFD2] bg-white shrink-0 md:rounded-b-3xl">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

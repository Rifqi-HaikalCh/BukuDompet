"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MochiCompanion,
  type MochiMood,
  type MochiStage,
} from "@/components/illustrations/MochiCompanion";
import {
  TactileButton,
  type TactileVariant,
} from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";

export interface CozyConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: TactileVariant;
  mochiMood?: MochiMood;
  mochiStage?: MochiStage;
  badgeText?: string;
}

export function CozyConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan!",
  cancelLabel = "Batal",
  confirmVariant = "matcha",
  mochiMood = "happy",
  mochiStage = 3,
  badgeText,
}: CozyConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              soundEffects.tactileClick();
              onClose();
            }}
            className="fixed inset-0 bg-[#3D352E]/45 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
            className="relative z-10 w-full max-w-sm rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[6px] border-b-[#D4C9B4] p-5 sm:p-6 text-center space-y-4 shadow-xl"
          >
            {badgeText && (
              <span className="inline-block px-3 py-1 rounded-full bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[3px] border-b-[#F5C84C] text-xs font-display font-extrabold text-[#3D352E]">
                {badgeText}
              </span>
            )}

            <div className="mx-auto w-28 h-28 rounded-3xl bg-[#F9F4EA] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center">
              <MochiCompanion
                stage={mochiStage}
                mood={mochiMood}
                className="w-24 h-24"
              />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-extrabold text-[#3D352E]">
                {title}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[#7A6E65] leading-relaxed">
                {description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <TactileButton
                variant="cream"
                size="md"
                onClick={() => {
                  onClose();
                }}
              >
                {cancelLabel}
              </TactileButton>
              <TactileButton
                variant={confirmVariant}
                size="md"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </TactileButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

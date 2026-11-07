"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  MochiCompanion,
  MOCHI_STAGE_NAMES,
} from "@/components/illustrations/MochiCompanion";
import { PraiseBadge } from "@/components/illustrations/PraiseBadges";
import { TactileButton } from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

interface ParticleNode {
  id: number;
  kind: "coin" | "xp";
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  delay: number;
}

export function GamificationFX() {
  const {
    particleBurstKey,
    particleBurstType,
    celebrationModal,
    closeCelebrationModal,
  } = useBukuDompetStore();

  const [particles, setParticles] = useState<ParticleNode[]>([]);

  useEffect(() => {
    if (particleBurstKey <= 0 || typeof window === "undefined") return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = w * 0.5;
    const centerY = h * 0.55;
    // Target top-right HUD area where Wallet & XP pills live
    const hudTargetX = Math.min(w - 90, w * 0.72);
    const hudTargetY = 28;

    const count = 8;
    const generated: ParticleNode[] = Array.from({ length: count }, (_, i) => {
      const kind: "coin" | "xp" =
        particleBurstType === "coin"
          ? "coin"
          : particleBurstType === "xp"
          ? "xp"
          : i % 2 === 0
          ? "coin"
          : "xp";

      const angle = (Math.PI * 2 * i) / count;
      const spread = 55 + (i % 3) * 24;

      return {
        id: particleBurstKey * 100 + i,
        kind,
        startX: centerX,
        startY: centerY,
        midX: centerX + Math.cos(angle) * spread,
        midY: centerY + Math.sin(angle) * spread - 40,
        endX: hudTargetX + (kind === "xp" ? 45 : -25),
        endY: hudTargetY,
        delay: i * 0.045,
      };
    });

    setParticles(generated);
    const timer = setTimeout(() => {
      setParticles([]);
    }, 1150);

    return () => clearTimeout(timer);
  }, [particleBurstKey, particleBurstType]);

  useEffect(() => {
    if (celebrationModal) {
      soundEffects.comboFanfare();
      fireCozyConfetti("jackpot");
    }
  }, [celebrationModal]);

  return (
    <>
      {/* 1. Flying Coin & XP Particle System */}
      <div className="fixed inset-0 pointer-events-none z-[115] overflow-hidden">
        <AnimatePresence>
          {particles.map((pt) => (
            <motion.div
              key={pt.id}
              initial={{
                x: pt.startX - 16,
                y: pt.startY - 16,
                scale: 0.3,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: [pt.startX - 16, pt.midX - 16, pt.endX - 16],
                y: [pt.startY - 16, pt.midY - 16, pt.endY - 16],
                scale: [0.6, 1.25, 0.75],
                opacity: [1, 1, 0],
                rotate: [0, 15, 360],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.85,
                delay: pt.delay,
                ease: "easeInOut",
              }}
              className="fixed top-0 left-0"
            >
              <CozyIcon
                name={pt.kind === "coin" ? "coin_rupiah" : "xp_star"}
                size={32}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 2. Full-Screen Level Up & Milestone Celebration Modal */}
      <AnimatePresence>
        {celebrationModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCelebrationModal}
              className="fixed inset-0 bg-[#3D352E]/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.82, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="relative z-10 w-full max-w-md rounded-[36px] bg-[#FFFDF9] border-2 border-[#FDE08D] border-b-[7px] border-b-[#F5C84C] p-6 sm:p-8 text-center overflow-hidden shadow-2xl"
            >
              {/* Rotating Sunburst Rays Behind Character */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 opacity-35 pointer-events-none"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, #FFC800 0deg 15deg, transparent 15deg 30deg)",
                  borderRadius: "50%",
                }}
              />

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[3px] border-b-[#F5C84C] text-xs font-display font-extrabold text-[#3D352E]">
                  <CozyIcon name="crown_sultan" size={20} animated />
                  <span>
                    {celebrationModal.type === "level_up"
                      ? `LEVEL UP KE LV.${celebrationModal.newLevel}!`
                      : celebrationModal.type === "badge_unlocked"
                      ? "MEDali KEHORMATAN TERBUKA!"
                      : "PENCAPAIAN SPESIAL!"}
                  </span>
                </div>

                <div className="mx-auto w-44 h-44 rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] flex items-center justify-center shadow-sm">
                  {celebrationModal.badgeId ? (
                    <PraiseBadge
                      type={celebrationModal.badgeId}
                      earned
                      className="w-36 h-36"
                    />
                  ) : (
                    <MochiCompanion
                      stage={celebrationModal.mochiStage || 3}
                      mood="proud_combo"
                      className="w-40 h-40"
                    />
                  )}
                </div>

                {celebrationModal.mochiStage && (
                  <span className="inline-block px-3.5 py-1 rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] text-xs font-display font-extrabold text-[#46A302]">
                    Wujud: {MOCHI_STAGE_NAMES[celebrationModal.mochiStage]}
                  </span>
                )}

                <div className="space-y-1.5">
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#3D352E]">
                    {celebrationModal.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-[#7A6E65] leading-relaxed">
                    {celebrationModal.subtitle}
                  </p>
                </div>

                {celebrationModal.rewardPoints &&
                  celebrationModal.rewardPoints > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FFC800] border-b-[4px] border-b-[#E5A400] font-display font-extrabold text-sm text-[#3D352E]">
                      <CozyIcon name="coin_rupiah" size={22} />
                      <span>
                        +{celebrationModal.rewardPoints} Poin (Rp
                        {celebrationModal.rewardPoints})
                      </span>
                    </div>
                  )}

                <div className="pt-2">
                  <TactileButton
                    variant="matcha"
                    size="lg"
                    fullWidth
                    onClick={closeCelebrationModal}
                  >
                    Lanjutkan Petualangan!
                  </TactileButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

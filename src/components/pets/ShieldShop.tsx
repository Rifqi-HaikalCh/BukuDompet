"use client";

/**
 * Butik Pelindung Streak (Versi 5.1).
 * Menampilkan jatah 3 perisai GRATIS per bulan, tas perisai hasil beli, dan 3 paket yang dijual di Butik.
 */
import React, { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { TactileButton } from "@/components/ui/CozyPrimitives";
import { parseLocalDate } from "@/lib/dates";
import {
  FREE_SHIELDS_PER_MONTH,
  MAX_PAID_SHIELDS,
  SHIELD_PACKS,
  daysUntilShieldReset,
  nextShieldResetDate,
  type ShieldPack,
  type ShieldPackId,
} from "@/lib/streak-shields";
import { cn } from "@/lib/utils";

export interface ShieldShopProps {
  today: string;
  freeLeft: number;
  paidCount: number;
  balance: number;
  onBuy: (id: ShieldPackId) => void;
}

const idr = (n: number): string => n.toLocaleString("id-ID");

function PackTile({ pack, paidCount, balance, onBuy }: { pack: ShieldPack; paidCount: number; balance: number; onBuy: (id: ShieldPackId) => void }) {
  const room = MAX_PAID_SHIELDS - paidCount;
  const tooMany = pack.shields > room;
  const poor = balance < pack.price;
  const disabled = tooMany || poor;
  const label = tooMany ? (room <= 0 ? "Tas penuh" : `Muat ${room} lagi`) : poor ? `Kurang ${idr(pack.price - balance)} Poin` : `Beli (${idr(pack.price)} Poin)`;
  const shown = Math.min(pack.shields, 3);
  return (
    <div className="rounded-3xl border-2 border-[#BCE3FF] bg-[#F4FAFF] p-3.5 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative h-14 w-16 shrink-0 flex items-center justify-center">
          {Array.from({ length: shown }).map((_, i) => (
            <span key={i} className="absolute" style={{ left: i * 12, top: i % 2 ? 6 : 0, zIndex: shown - i }}>
              <CozyIcon name="ice_shield" size={34} />
            </span>
          ))}
        </div>
        <span className="ml-auto px-2.5 py-0.5 rounded-full bg-[#1E88E5] border-2 border-[#3D352E] text-white text-xs font-display font-extrabold tabular-nums shrink-0">
          ×{pack.shields}
        </span>
      </div>
      <div className="min-w-0">
        <h4 className="font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">{pack.name}</h4>
        <p className="text-[11px] font-bold text-[#1565C0] leading-snug break-words">{pack.tagline}</p>
        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words mt-1">{pack.description}</p>
      </div>
      <TactileButton
        variant={disabled ? "cream" : "sky"}
        size="sm"
        fullWidth
        disabled={disabled}
        onClick={() => onBuy(pack.id)}
        className="mt-auto"
      >
        {label}
      </TactileButton>
    </div>
  );
}

export function ShieldShop({ today, freeLeft, paidCount, balance, onBuy }: ShieldShopProps) {
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const days = daysUntilShieldReset(today);
  const resetLabel = parseLocalDate(nextShieldResetDate(today)).toLocaleDateString("id-ID", { day: "numeric", month: "long" });

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-3" data-testid="shield-shop">
        <div className="rounded-3xl border-2 border-[#9AD2FF] bg-gradient-to-br from-[#EAF6FF] to-[#F6EEFF] p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3 min-w-0">
            <motion.div
              className="shrink-0 h-14 w-14 rounded-2xl bg-white border-2 border-[#BCE3FF] flex items-center justify-center"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <CozyIcon name="ice_shield" size={40} />
            </motion.div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] leading-snug break-words">Pelindung Streak</h3>
              <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                Lupa mencatat sehari? Perisai es menjaga api streak-mu tetap menyala. Setiap bulan kamu dapat {FREE_SHIELDS_PER_MONTH} perisai gratis!
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 border-2 border-[#D6ECFF] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-display text-xs font-extrabold text-[#3D352E] flex items-center gap-1.5">
                <GlyphIcon name="gift" size={16} /> Jatah Gratis Bulan Ini
              </span>
              <span className="text-[11px] font-bold text-[#7A6E65]">
                Diisi ulang {days} hari lagi ({resetLabel})
              </span>
            </div>
            <div className="flex items-center gap-2" role="img" aria-label={`Sisa ${freeLeft} dari ${FREE_SHIELDS_PER_MONTH} perisai gratis bulan ini`}>
              {Array.from({ length: FREE_SHIELDS_PER_MONTH }).map((_, i) => {
                const has = i < freeLeft;
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-14 w-14 rounded-2xl border-2 flex items-center justify-center",
                      has ? "bg-[#EEF8FF] border-[#7CC4FF]" : "bg-[#F1ECE4] border-dashed border-[#D4C9B4]"
                    )}
                  >
                    <span className={has ? "" : "opacity-30 grayscale"}>
                      <CozyIcon name="ice_shield" size={34} />
                    </span>
                  </div>
                );
              })}
              <span className="ml-1 font-display text-sm font-extrabold text-[#1565C0] tabular-nums">
                {freeLeft}/{FREE_SHIELDS_PER_MONTH}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E3F0FA]">
              <span className="font-display text-xs font-extrabold text-[#3D352E]">Tas perisai hasil beli</span>
              <span className="font-display text-xs font-extrabold text-[#1565C0] tabular-nums">
                {paidCount}/{MAX_PAID_SHIELDS}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-expanded={showInfo}
            onClick={() => setShowInfo((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-display font-extrabold text-[#1565C0] hover:underline cursor-pointer"
          >
            <GlyphIcon name="question" size={16} /> {showInfo ? "Sembunyikan" : "Lihat"} cara kerja perisai
          </button>
          {showInfo && (
            <ul className="space-y-1.5 text-xs font-bold text-[#5B5148] leading-relaxed">
              <li>Perisai gratis dipakai lebih dulu, baru perisai hasil beli.</li>
              <li>Satu hari terlewat memakai satu perisai. Dua hari terlewat butuh dua perisai.</li>
              <li>Jatah gratis diisi ulang tanggal 1 setiap bulan. Sisa bulan lalu tidak dibawa ke bulan baru.</li>
              <li>Perisai hasil beli tersimpan sampai terpakai (maksimal {MAX_PAID_SHIELDS}).</li>
              <li>Tanpa perisai, streak kembali ke 0 dan suasana aplikasi menjadi dingin sampai kamu mencatat lagi.</li>
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SHIELD_PACKS.map((pack) => (
            <PackTile key={pack.id} pack={pack} paidCount={paidCount} balance={balance} onBuy={onBuy} />
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}

/** Banner ringkas untuk filter "Semua" di Butik. */
export function ShieldTeaser({ freeLeft, total, onOpen }: { freeLeft: number; total: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-3xl border-2 border-[#9AD2FF] bg-gradient-to-r from-[#EAF6FF] to-[#F6EEFF] p-3 flex items-center gap-3 cursor-pointer hover:brightness-[1.02] transition min-w-0"
    >
      <span className="h-12 w-12 rounded-2xl bg-white border-2 border-[#BCE3FF] flex items-center justify-center shrink-0">
        <CozyIcon name="ice_shield" size={32} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-extrabold text-[#3D352E] leading-snug break-words">Pelindung Streak</span>
        <span className="block text-xs font-bold text-[#7A6E65] leading-snug break-words">
          Punya {total} perisai ({freeLeft} gratis bulan ini). Ketuk untuk melihat paket.
        </span>
      </span>
      <GlyphIcon name="chevron_right" size={20} />
    </button>
  );
}

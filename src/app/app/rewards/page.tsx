"use client";

import React, { useState } from "react";
import {
  Ticket,
  Coins,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  PraiseBadge,
  BADGE_IDS,
  BADGE_META,
  type BadgeId,
} from "@/components/illustrations/PraiseBadges";
import {
  TactileButton,
  CozyCard,
  RollingNumber,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

const PRAISE_QUOTES_BY_ID: Record<BadgeId, string> = {
  streak_7:
    "Penabung Ulung: Konsistensimu mencatat 7 hari berturut-turut adalah awal dari kebebasan finansial!",
  detail_master:
    "Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat Mochi sangat bangga!",
  budget_guardian:
    "Hebat! Kamu selalu memikirkan kebutuhan utama sebelum keinginan sesaat.",
  no_spend_hero:
    "Master Puasa Jajan! Hari tanpa pengeluaran impulsif membuat tabunganmu melesat cepat!",
  detective_ally:
    "Mata elang! Bersama Detektif Mochi, tidak ada pengeluaran bocor halus yang lolos dari catatanmu.",
  millionaire_club:
    "Langkah demi langkah dari uang receh menuju jutaan! Kamu adalah calon Sultan Mochi sejati!",
};

export default function RewardsAndBadgesPage() {
  const {
    profiles,
    badges,
    redemptions,
    requestPointCashout,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];

  const [pointsToRedeem, setPointsToRedeem] = useState<string>("5000");
  const [note, setNote] = useState<string>(
    "Tukar poin rajin mencatat kas buat ditabung ke celengan Mochi! 🐱✨"
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const earnedBadgeIds = new Set(badges.map((b) => b.badge_code));

  const handleCreateGoldenTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = Number(pointsToRedeem) || 0;
    const res = requestPointCashout(pts, note);
    setStatusMessage(res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.detectiveBuzz();
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Golden Cashout Ticket Generator (1 Poin = Rp 1) */}
      <CozyCard tone="honey" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-white border-2 border-[#3D352E] text-[11px] font-extrabold">
              🎫 Kurs Tetap: 1 Poin = Rp 1
            </span>
            <h1 className="font-fredoka text-xl sm:text-2xl font-bold text-[#3D352E] mt-1">
              Tukar Poin Jadi Saldo Uang Asli
            </h1>
            <p className="text-xs font-bold text-[#7A6E65]">
              Cetak Tiket Emas untuk dicairkan oleh Abang (Admin) atau Orang Tua!
            </p>
          </div>
          <Ticket className="w-10 h-10 text-[#3D352E] shrink-0" />
        </div>

        <div className="bg-white rounded-3xl border-2 border-[#3D352E] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase text-[#7A6E65]">
              Saldo Dompet Poin Aktif
            </p>
            <div className="font-fredoka text-2xl sm:text-3xl font-bold text-[#3D352E] flex items-center gap-2 mt-0.5">
              <Coins className="w-7 h-7 text-[#E5A400]" />
              <RollingNumber
                value={userProfile.points_balance}
                suffix=" Poin"
              />
            </div>
            <p className="text-xs font-mono-num font-extrabold text-[#46A302]">
              Nilai Tunai: {formatRupiah(userProfile.points_balance)} • Total
              Seumur Hidup: {userProfile.lifetime_points.toLocaleString("id-ID")}{" "}
              Poin
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E] text-xs font-extrabold text-[#3D352E]">
            ✨ Disetujui Admin &rarr; Otomatis Masuk Kas!
          </div>
        </div>

        <form onSubmit={handleCreateGoldenTicket} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-[#3D352E] mb-1">
                Jumlah Poin Dicairkan
              </label>
              <input
                type="number"
                min={1000}
                max={userProfile.points_balance}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#3D352E] bg-white font-mono-num text-base font-extrabold"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-[#3D352E] mb-1">
                Catatan Tujuan Pencairan
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#3D352E] bg-white text-xs sm:text-sm font-bold"
              />
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-2xl bg-white border-2 border-[#3D352E] text-xs font-extrabold text-[#3D352E]">
              {statusMessage}
            </div>
          )}

          <TactileButton type="submit" variant="matcha" size="md" fullWidth>
            <Sparkles className="w-4 h-4" /> Buat Tiket Emas Pencairan (
            {formatRupiah(Number(pointsToRedeem) || 0)})
          </TactileButton>
        </form>

        {/* Ticket Queue List */}
        <div className="space-y-2 pt-2">
          <h3 className="font-fredoka text-sm font-bold text-[#3D352E]">
            Daftar Tiket Emas Pencairanmu
          </h3>
          {redemptions.map((ticket) => (
            <div
              key={ticket.id}
              className="p-3.5 rounded-2xl bg-white border-2 border-[#3D352E] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-mono-num text-sm font-extrabold text-[#3D352E]">
                  🎫 {formatRupiah(ticket.rupiah_value)} (
                  {ticket.points_redeemed.toLocaleString("id-ID")} Poin)
                </p>
                <p className="text-xs font-bold text-[#7A6E65] truncate">
                  {ticket.note}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-xl border-2 border-[#3D352E] text-xs font-extrabold inline-flex items-center gap-1 shrink-0 ${
                  ticket.status === "approved"
                    ? "bg-[#E5F9D7] text-[#3D352E]"
                    : ticket.status === "pending"
                    ? "bg-[#FFF7D6] text-[#3D352E]"
                    : "bg-[#FFDEDE] text-[#EA2B2B]"
                }`}
              >
                {ticket.status === "approved" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#46A302]" />
                    Disetujui
                  </>
                ) : ticket.status === "pending" ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#E5A400]" />
                    Menunggu Admin
                  </>
                ) : (
                  "Ditolak"
                )}
              </span>
            </div>
          ))}
        </div>
      </CozyCard>

      {/* 2. Lemari Pujian (Achievement & Badges) using PraiseBadges.tsx */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-[#FFC800]" />
            <div>
              <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                🏅 Lemari Pujian & Medali Penabung
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Terbuka {earnedBadgeIds.size} dari {BADGE_IDS.length} Lencana
                Kehormatan BukuDompet
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BADGE_IDS.map((badgeId) => {
            const isEarned = earnedBadgeIds.has(badgeId);
            const meta = BADGE_META[badgeId];
            const unlockedRecord = badges.find(
              (b) => b.badge_code === badgeId
            );
            const praiseQuote =
              unlockedRecord?.praise_quote || PRAISE_QUOTES_BY_ID[badgeId];

            return (
              <div
                key={badgeId}
                className={`p-4 rounded-3xl border-2 border-[#3D352E] flex flex-col items-center text-center space-y-2.5 transition-all ${
                  isEarned
                    ? "bg-[#FFFDF7] shadow-[0_4px_0_0_#3D352E]"
                    : "bg-[#F7F2E7] opacity-80"
                }`}
              >
                <PraiseBadge
                  type={badgeId}
                  earned={isEarned}
                  className="w-36 h-36"
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="font-fredoka text-base font-bold text-[#3D352E]">
                      {meta.title}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#3D352E] ${
                        isEarned ? "bg-[#E5F9D7]" : "bg-white text-[#7A6E65]"
                      }`}
                    >
                      {isEarned ? "Terbuka ✨" : "Terkunci 🔒"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    {meta.description}
                  </p>
                </div>

                <div className="w-full p-2.5 rounded-2xl bg-[#FFF7D6] border border-[#3D352E] text-[11px] font-bold italic text-[#3D352E]">
                  &ldquo;{praiseQuote}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      </CozyCard>
    </div>
  );
}

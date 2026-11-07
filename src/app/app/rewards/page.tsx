"use client";

import React, { useState, useMemo } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  PraiseBadge,
  BADGE_IDS,
  BADGE_META,
  type BadgeId,
} from "@/components/illustrations/PraiseBadges";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  RollingNumber,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { formatCompactRupiah } from "@/lib/utils";

const PRAISE_QUOTES_BY_ID: Record<BadgeId, string> = {
  streak_7:
    "Penabung Ulung: Konsistensimu mencatat 7 hari berturut-turut adalah awal dari kebebasan finansial!",
  detail_master:
    "Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat pet kesayanganmu sangat bangga!",
  budget_guardian:
    "Hebat! Kamu selalu memikirkan kebutuhan utama sebelum keinginan sesaat.",
  no_spend_hero:
    "Master Puasa Jajan! Hari tanpa pengeluaran impulsif membuat tabunganmu melesat cepat!",
  detective_ally:
    "Mata elang! Bersama Detektif Kas, tidak ada pengeluaran bocor halus yang lolos dari catatanmu.",
  millionaire_club:
    "Langkah demi langkah dari uang receh menuju jutaan! Kamu adalah calon Maharaja Berlian sejati!",
};

export default function RewardsAndBadgesPage() {
  const {
    activeProfileId,
    profiles,
    badges,
    redemptions,
    requestPointCashout,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.id === activeProfileId && p.role === "user") ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const petName = userProfile.petCustomName || "Mochi";

  const userBadges = useMemo(
    () => badges.filter((b) => b.user_id === userProfile.id),
    [badges, userProfile.id]
  );

  const userRedemptions = useMemo(
    () => redemptions.filter((r) => r.user_id === userProfile.id),
    [redemptions, userProfile.id]
  );

  const [pointsToRedeem, setPointsToRedeem] = useState<string>("1000");
  const [note, setNote] = useState<string>(
    `Tukar poin rajin mencatat kas buat ditabung bersama ${petName}!`
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [showAllTickets, setShowAllTickets] = useState<boolean>(false);

  const earnedBadgeIds = new Set(userBadges.map((b) => b.badge_code));

  const visibleTickets = showAllTickets
    ? userRedemptions
    : userRedemptions.slice(0, 5);

  const executeCreateGoldenTicket = () => {
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
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      <CozyConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeCreateGoldenTicket}
        title={`Cetak Tiket Emas ${formatRupiah(Number(pointsToRedeem) || 0)}?`}
        description={`Tukarkan ${(
          Number(pointsToRedeem) || 0
        ).toLocaleString(
          "id-ID"
        )} Poin menjadi saldo Rp${(
          Number(pointsToRedeem) || 0
        ).toLocaleString("id-ID")} asli untuk disetujui Abang (Admin).`}
        confirmLabel="Ya, Cetak Tiket!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        badgeText="Kurs Tetap: 1 Poin = Rp 1"
      />

      {/* 1. Golden Cashout Ticket Generator (Single Soft Pastel Honey Hero Card) */}
      <CozyCard tone="honey" className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1">
              <CozyIcon name="rewards_ticket" size={16} />
              Kurs Tetap: 1 Poin = Rp 1
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] mt-1 truncate">
              Tukar Poin Jadi Saldo Uang Asli
            </h1>
            <p className="text-xs font-bold text-[#7A6E65]">
              Cetak Tiket Emas untuk dicairkan oleh Abang (Admin) atau digunakan
              belanja di Butik Shop!
            </p>
          </div>
          <CozyIcon name="rewards_ticket" size={38} />
        </div>

        <div className="bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0 overflow-hidden">
          <div className="min-w-0">
            <p className="text-xs font-display font-extrabold uppercase text-[#7A6E65]">
              Saldo Dompet Poin Aktif ({userProfile.display_name})
            </p>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#4A3500] flex items-center gap-2 mt-0.5 min-w-0">
              <CozyIcon name="coin_rupiah" size={30} />
              <RollingNumber
                value={userProfile.points_balance}
                suffix=" Poin"
                className="truncate"
              />
            </div>
            <p className="text-xs font-display font-extrabold tabular-nums text-[#2E6F00] truncate">
              Nilai Tunai: {formatCompactRupiah(userProfile.points_balance)} •
              Total Seumur Hidup:{" "}
              {userProfile.lifetime_points.toLocaleString("id-ID")} Poin
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00] flex items-center gap-1.5 shrink-0">
            <CozyIcon name="check_badge" size={18} />
            <span>Disetujui Admin &rarr; Otomatis Masuk Kas!</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
          className="space-y-3 min-w-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
                Jumlah Poin Dicairkan (Min. 1.000 Poin)
              </label>
              <input
                type="number"
                min={1000}
                max={Math.max(1000, userProfile.points_balance)}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white font-display font-extrabold tabular-nums text-base"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
                Catatan Tujuan Pencairan
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold"
              />
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-2xl bg-white border border-[#E6DFD2] text-xs font-extrabold text-[#3D352E]">
              {statusMessage}
            </div>
          )}

          <TactileButton type="submit" variant="matcha" size="md" fullWidth>
            <CozyIcon name="rewards_ticket" size={20} />
            Buat Tiket Emas Pencairan ({formatRupiah(Number(pointsToRedeem) || 0)})
          </TactileButton>
        </form>

        {/* Ticket Queue List (Bounded List Pattern: Max 5 visible) */}
        <div className="space-y-2 pt-2 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-extrabold text-[#3D352E]">
              Daftar Tiket Emas Pencairanmu
            </h3>
            <span className="text-xs font-display font-extrabold text-[#7A6E65]">
              {userRedemptions.length} Tiket
            </span>
          </div>
          {visibleTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-3.5 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-between gap-3 min-w-0 overflow-hidden"
            >
              <div className="min-w-0">
                <p className="font-display font-extrabold tabular-nums text-sm text-[#3D352E] flex items-center gap-1.5 truncate">
                  <CozyIcon name="rewards_ticket" size={18} />
                  <span className="truncate">
                    {formatRupiah(ticket.rupiah_value)} (
                    {ticket.points_redeemed.toLocaleString("id-ID")} Poin)
                  </span>
                </p>
                <p className="text-xs font-bold text-[#7A6E65] truncate">
                  {ticket.note}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-xl border text-xs font-display font-extrabold inline-flex items-center gap-1 shrink-0 ${
                  ticket.status === "approved"
                    ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                    : ticket.status === "pending"
                    ? "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
                    : "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
                }`}
              >
                <CozyIcon
                  name={
                    ticket.status === "approved"
                      ? "check_badge"
                      : ticket.status === "pending"
                      ? "rewards_ticket"
                      : "warning_siren"
                  }
                  size={16}
                />
                {ticket.status === "approved"
                  ? "Disetujui"
                  : ticket.status === "pending"
                  ? "Menunggu Admin"
                  : "Ditolak"}
              </span>
            </div>
          ))}
          {userRedemptions.length > 5 && (
            <TactileButton
              variant="cream"
              size="sm"
              fullWidth
              onClick={() => setShowAllTickets((prev) => !prev)}
            >
              {showAllTickets
                ? "Sembunyikan Sebagian ▴"
                : `Lihat Semua (${userRedemptions.length} Tiket) ▾`}
            </TactileButton>
          )}
        </div>
      </CozyCard>

      {/* 2. Lemari Pujian (Achievement & Badges) using PraiseBadges.tsx */}
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CozyIcon name="crown_sultan" size={30} />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold text-[#3D352E] truncate">
                Lemari Pujian & Medali Penabung
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
            const unlockedRecord = userBadges.find(
              (b) => b.badge_code === badgeId
            );
            const praiseQuote =
              unlockedRecord?.praise_quote || PRAISE_QUOTES_BY_ID[badgeId];

            return (
              <div
                key={badgeId}
                className={`p-4 rounded-3xl border-2 flex flex-col items-center text-center space-y-2.5 transition-all min-w-0 overflow-hidden ${
                  isEarned
                    ? "bg-white border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4]"
                    : "bg-[#F7F3EB] border-[#E6DFD2] opacity-80"
                }`}
              >
                <PraiseBadge
                  type={badgeId}
                  earned={isEarned}
                  className="w-36 h-36"
                />

                <div className="space-y-1 min-w-0 w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                      {meta.title}
                    </h3>
                    <span
                      className={`text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                        isEarned
                          ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                          : "bg-white border-[#E6DFD2] text-[#7A6E65]"
                      }`}
                    >
                      <CozyIcon
                        name={isEarned ? "check_badge" : "lock_cozy"}
                        size={12}
                      />
                      {isEarned ? "Terbuka" : "Terkunci"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    {meta.description}
                  </p>
                </div>

                <div className="w-full p-2.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-bold italic text-[#3D352E]">
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

"use client";
import { ChevronUp, ChevronDown } from "@/components/illustrations/UiGlyphs";

/**
 * Bagian 1 /app/quests — Dompet Poin & Pencairan (1 Poin = Rp1).
 * Dipindahkan dari halaman Hadiah lama: form Tiket Emas + daftar tiket pencairan.
 */
import React, { useMemo, useState } from "react";
import { useBukuDompetStore, type ProfileData } from "@/store/useBukuDompetStore";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { TactileButton, CozyCard, RollingNumber, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export function PointsWalletSection({ profile }: { profile: ProfileData }) {
  const redemptions = useBukuDompetStore((s) => s.redemptions);
  const requestPointCashout = useBukuDompetStore((s) => s.requestPointCashout);

  const isKid = profile.role === "schoolchild";
  const petName = profile.petCustomName || "Mochi";
  const tickets = useMemo(() => redemptions.filter((r) => r.user_id === profile.id), [redemptions, profile.id]);

  const [pointsToRedeem, setPointsToRedeem] = useState<string>("1000");
  const [note, setNote] = useState<string>(`Tukar poin rajin mencatat buat ditabung bersama ${petName}!`);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);

  const amount = Number(pointsToRedeem) || 0;
  const visible = showAll ? tickets : tickets.slice(0, 5);

  const execute = () => {
    const res = requestPointCashout(amount, note);
    setStatusMessage(res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.detectiveBuzz();
    }
  };

  return (
    <CozyCard tone="honey" className="p-5 space-y-4">
      <CozyConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={execute}
        title={`Cetak Tiket Emas ${formatRupiah(amount)}?`}
        description={`Tukarkan ${amount.toLocaleString("id-ID")} Poin menjadi saldo Rp${amount.toLocaleString("id-ID")} untuk disetujui ${isKid ? "Orang Tua" : "Admin"}.`}
        confirmLabel="Ya, Cetak Tiket!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        badgeText="Kurs Tetap: 1 Poin = Rp 1"
      />

      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500] inline-flex items-center gap-1">
            <CozyIcon name="rewards_ticket" size={16} />
            Kurs Tetap: 1 Poin = Rp 1
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] mt-1 leading-snug break-words">Dompet Poin & Pencairan</h2>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
            Cetak Tiket Emas untuk dicairkan atau dipakai belanja di Butik Pet.
          </p>
        </div>
        <CozyIcon name="rewards_ticket" size={38} className="shrink-0" />
      </div>

      <div className="bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-4 flex flex-col items-start gap-2.5 min-w-0">
        <div className="min-w-0 w-full">
          <p className="text-xs font-display font-extrabold uppercase text-[#7A6E65] leading-snug break-words">Saldo Dompet Poin Aktif ({profile.display_name})</p>
          <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#4A3500] flex items-center gap-2 flex-wrap mt-1">
            <CozyIcon name="coin_rupiah" size={30} className="shrink-0" />
            <RollingNumber value={profile.points_balance} suffix=" Poin" className="break-words" />
          </div>
          <p className="text-xs font-display font-extrabold tabular-nums text-[#2E6F00] leading-snug break-words mt-1">
            Nilai Tunai: {formatRupiah(profile.points_balance)} • Total Seumur Hidup: {profile.lifetime_points.toLocaleString("id-ID")} Poin
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00] flex items-center gap-1.5 flex-wrap">
          <CozyIcon name="check_badge" size={18} className="shrink-0" />
          <span>Disetujui {isKid ? "Orang Tua" : "Admin"} &rarr; Otomatis Masuk Kas!</span>
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
            <label htmlFor="cashout-points" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
              Jumlah Poin Dicairkan (Min. 1.000 Poin)
            </label>
            <input
              id="cashout-points"
              type="number"
              inputMode="numeric"
              min={1000}
              max={Math.max(1000, profile.points_balance)}
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white font-display font-extrabold tabular-nums text-base"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="cashout-note" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
              Catatan Tujuan Pencairan
            </label>
            <input
              id="cashout-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold"
            />
          </div>
        </div>

        {statusMessage && (
          <div role="status" className="p-3 rounded-2xl bg-white border border-[#E6DFD2] text-xs font-extrabold text-[#3D352E]">
            {statusMessage}
          </div>
        )}

        <TactileButton type="submit" variant="matcha" size="md" fullWidth>
          <CozyIcon name="rewards_ticket" size={20} />
          Buat Tiket Emas Pencairan ({formatRupiah(amount)})
        </TactileButton>
      </form>

      <div className="space-y-2 pt-2 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-extrabold text-[#3D352E]">Daftar Tiket Emas Pencairanmu</h3>
          <span className="text-xs font-display font-extrabold text-[#7A6E65]">{tickets.length} Tiket</span>
        </div>
        {tickets.length === 0 && <p className="text-xs font-bold text-[#7A6E65]">Belum ada tiket. Kumpulkan minimal 1.000 Poin untuk mencetak yang pertama.</p>}
        {visible.map((ticket) => (
          <div key={ticket.id} className="p-3.5 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
            <div className="min-w-0">
              <p className="font-display font-extrabold tabular-nums text-sm text-[#3D352E] flex items-center gap-1.5 flex-wrap leading-snug break-words">
                <CozyIcon name="rewards_ticket" size={18} className="shrink-0" />
                <span>
                  {formatRupiah(ticket.rupiah_value)} ({ticket.points_redeemed.toLocaleString("id-ID")} Poin)
                </span>
              </p>
              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words mt-0.5">{ticket.note}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-xl border text-xs font-display font-extrabold inline-flex items-center gap-1 shrink-0 self-start sm:self-center ${
                ticket.status === "approved"
                  ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                  : ticket.status === "pending"
                  ? "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]"
                  : "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
              }`}
            >
              <CozyIcon name={ticket.status === "approved" ? "check_badge" : ticket.status === "pending" ? "rewards_ticket" : "warning_siren"} size={16} />
              {ticket.status === "approved" ? "Disetujui" : ticket.status === "pending" ? "Menunggu Persetujuan" : "Ditolak"}
            </span>
          </div>
        ))}
        {tickets.length > 5 && (
          <TactileButton variant="cream" size="sm" fullWidth onClick={() => setShowAll((p) => !p)}>
            {showAll ? <>Sembunyikan Sebagian <ChevronUp className="w-4 h-4" aria-hidden="true" /></> : <>Lihat Semua ({tickets.length} Tiket) <ChevronDown className="w-4 h-4" aria-hidden="true" /></>}
          </TactileButton>
        )}
      </div>
    </CozyCard>
  );
}

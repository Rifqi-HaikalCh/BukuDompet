"use client";

/**
 * Dompet Poin & Pencairan (1 Poin = Rp1) — dirancang ulang di Versi 5.3.
 * - Desktop (lebar wadah >= 48rem): dua kolom. Kiri: saldo + form pencairan dengan pilihan nominal cepat.
 *   Kanan: riwayat tiket ringkas (satu baris per tiket) dengan ringkasan, filter status, dan area gulir
 *   sehingga daftar panjang tidak memanjangkan halaman.
 * - Ponsel: satu kolom, form dulu lalu riwayat.
 * Pesan hasil aksi tampil sebagai notifikasi pojok kanan-bawah.
 */
import React, { useMemo, useState } from "react";
import { useBukuDompetStore, type ProfileData, type PointRedemptionRecord } from "@/store/useBukuDompetStore";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import { TactileButton, CozyCard, RollingNumber, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { notify } from "@/lib/notify";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const MIN_CASHOUT = 1000;
const QUICK_AMOUNTS = [1000, 2500, 5000];

type TicketFilter = "all" | PointRedemptionRecord["status"];

const STATUS_META: Record<PointRedemptionRecord["status"], { label: string; chip: string }> = {
  pending: { label: "Menunggu", chip: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]" },
  approved: { label: "Disetujui", chip: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" },
  rejected: { label: "Ditolak", chip: "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]" },
};

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function PointsWalletSection({ profile }: { profile: ProfileData }) {
  const redemptions = useBukuDompetStore((s) => s.redemptions);
  const requestPointCashout = useBukuDompetStore((s) => s.requestPointCashout);

  const isKid = profile.role === "schoolchild";
  const petName = profile.petCustomName || "Mochi";
  const approver = isKid ? "Orang Tua" : "Admin";
  const tickets = useMemo(
    () => redemptions.filter((r) => r.user_id === profile.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [redemptions, profile.id]
  );

  const [pointsToRedeem, setPointsToRedeem] = useState<string>("1000");
  const [note, setNote] = useState<string>(`Tukar poin rajin mencatat buat ditabung bersama ${petName}!`);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<TicketFilter>("all");

  const amount = Number(pointsToRedeem) || 0;
  const missing = Math.max(0, MIN_CASHOUT - profile.points_balance);

  const stats = useMemo(() => {
    const sum = (st: PointRedemptionRecord["status"]) => tickets.filter((t) => t.status === st).reduce((a, t) => a + t.rupiah_value, 0);
    return {
      approved: sum("approved"),
      pending: sum("pending"),
      counts: {
        all: tickets.length,
        pending: tickets.filter((t) => t.status === "pending").length,
        approved: tickets.filter((t) => t.status === "approved").length,
        rejected: tickets.filter((t) => t.status === "rejected").length,
      } satisfies Record<TicketFilter, number>,
    };
  }, [tickets]);

  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const execute = () => {
    const res = requestPointCashout(amount, note);
    // Saat berhasil, toast hadiah dari store sudah tampil; notifikasi tambahan hanya untuk kegagalan.
    if (!res.success) notify.warn("Belum bisa mencairkan", res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.detectiveBuzz();
    }
  };

  return (
    <CozyCard tone="honey" className="@container p-4 sm:p-5 space-y-4">
      <CozyConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={execute}
        title={`Cetak Tiket Emas ${formatRupiah(amount)}?`}
        description={`Tukarkan ${amount.toLocaleString("id-ID")} Poin menjadi saldo Rp${amount.toLocaleString("id-ID")} untuk disetujui ${approver}.`}
        confirmLabel="Ya, Cetak Tiket!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        badgeText="Kurs Tetap: 1 Poin = Rp 1"
      />

      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug break-words">Dompet Poin & Pencairan</h2>
          <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
            Kurs tetap 1 Poin = Rp 1. Cetak Tiket Emas untuk dicairkan atau dipakai belanja di Butik Pet.
          </p>
        </div>
        <CozyIcon name="rewards_ticket" size={40} className="shrink-0" />
      </div>

      <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4 items-start min-w-0">
        {/* ───────── Kiri: saldo + form ───────── */}
        <div className="space-y-3 min-w-0">
          <div className="bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-4 space-y-2 min-w-0">
            <p className="text-[11px] font-display font-extrabold uppercase text-[#7A6E65] leading-snug break-words">Saldo Poin {profile.display_name.replace(/\s*\(.*?\)\s*/g, "")}</p>
            <div className="font-display text-3xl font-extrabold text-[#4A3500] flex items-center gap-2 flex-wrap">
              <CozyIcon name="coin_rupiah" size={32} className="shrink-0" />
              <RollingNumber value={profile.points_balance} className="break-words" />
              <span className="text-lg text-[#7A6E65]">Poin</span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[#F7F3EB] px-3 py-2 min-w-0">
                <dt className="font-bold text-[#7A6E65]">Nilai tunai</dt>
                <dd className="font-display font-extrabold tabular-nums text-[#2E6F00] break-words">{formatRupiah(profile.points_balance)}</dd>
              </div>
              <div className="rounded-xl bg-[#F7F3EB] px-3 py-2 min-w-0">
                <dt className="font-bold text-[#7A6E65]">Total seumur hidup</dt>
                <dd className="font-display font-extrabold tabular-nums text-[#3D352E] break-words">{profile.lifetime_points.toLocaleString("id-ID")} Poin</dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (amount < MIN_CASHOUT) {
                notify.warn("Belum bisa mencairkan", `Minimal pencairan ${MIN_CASHOUT.toLocaleString("id-ID")} Poin.`);
                return;
              }
              setConfirmOpen(true);
            }}
            className="bg-white rounded-3xl border-2 border-[#E6DFD2] p-4 space-y-3 min-w-0"
          >
            <div className="min-w-0">
              <label htmlFor="cashout-points" className="block text-xs font-display font-extrabold text-[#3D352E] mb-1">
                Jumlah Poin (minimal {MIN_CASHOUT.toLocaleString("id-ID")})
              </label>
              <input
                id="cashout-points"
                type="number"
                inputMode="numeric"
                min={MIN_CASHOUT}
                max={Math.max(MIN_CASHOUT, profile.points_balance)}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white font-display font-extrabold tabular-nums text-base"
              />
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Pilihan nominal cepat">
                {QUICK_AMOUNTS.filter((q) => q <= profile.points_balance).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setPointsToRedeem(String(q));
                    }}
                    className={cn(
                      "px-3 py-1 rounded-xl border-2 font-display text-xs font-extrabold tabular-nums cursor-pointer",
                      amount === q ? "bg-[#FFC800] border-[#E5A400] text-[#4A3500]" : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFDF9]"
                    )}
                  >
                    {q.toLocaleString("id-ID")}
                  </button>
                ))}
                {profile.points_balance >= MIN_CASHOUT && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setPointsToRedeem(String(profile.points_balance));
                    }}
                    className={cn(
                      "px-3 py-1 rounded-xl border-2 font-display text-xs font-extrabold cursor-pointer",
                      amount === profile.points_balance ? "bg-[#FFC800] border-[#E5A400] text-[#4A3500]" : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFDF9]"
                    )}
                  >
                    Semua
                  </button>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="cashout-note" className="block text-xs font-display font-extrabold text-[#3D352E] mb-1">
                Catatan tujuan
              </label>
              <input
                id="cashout-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold"
              />
            </div>
            {missing > 0 && (
              <p className="text-[11px] font-bold text-[#7A6E65] leading-snug">
                Kumpulkan {missing.toLocaleString("id-ID")} Poin lagi untuk bisa mencetak tiket pertama.
              </p>
            )}
            <TactileButton type="submit" variant="matcha" size="md" fullWidth>
              <CozyIcon name="rewards_ticket" size={20} />
              Buat Tiket Emas ({formatRupiah(amount)})
            </TactileButton>
            <p className="text-[11px] font-bold text-[#7A6E65] leading-snug flex items-start gap-1.5">
              <GlyphIcon name="check_circle" size={14} className="shrink-0 mt-0.5" />
              <span>Disetujui {approver}, lalu otomatis masuk Kas.</span>
            </p>
          </form>
        </div>

        {/* ───────── Kanan: riwayat tiket ───────── */}
        <section aria-label="Riwayat Tiket Emas" className="bg-white rounded-3xl border-2 border-[#E6DFD2] p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h3 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] leading-snug">Riwayat Tiket Emas</h3>
            <span className="text-xs font-display font-extrabold text-[#7A6E65] tabular-nums shrink-0">{tickets.length} tiket</span>
          </div>

          {tickets.length > 0 && (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[#EFFBE6] px-3 py-2 min-w-0">
                <dt className="font-bold text-[#2E6F00]">Sudah disetujui</dt>
                <dd className="font-display font-extrabold tabular-nums text-[#173300] break-words">{formatRupiah(stats.approved)}</dd>
              </div>
              <div className="rounded-xl bg-[#FFFBEB] px-3 py-2 min-w-0">
                <dt className="font-bold text-[#7A5A00]">Menunggu</dt>
                <dd className="font-display font-extrabold tabular-nums text-[#4A3500] break-words">{formatRupiah(stats.pending)}</dd>
              </div>
            </dl>
          )}

          {tickets.length > 3 && (
            <div role="group" aria-label="Saring status tiket" className="flex gap-1.5 overflow-x-auto pb-0.5">
              {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => {
                    soundEffects.tactileClick();
                    setFilter(f);
                  }}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-xl border-2 font-display text-xs font-extrabold cursor-pointer whitespace-nowrap",
                    filter === f ? "bg-[#7ED957] border-[#46A302] text-[#173300]" : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFDF9]"
                  )}
                >
                  {f === "all" ? "Semua" : STATUS_META[f].label} <span className="tabular-nums opacity-70">{stats.counts[f]}</span>
                </button>
              ))}
            </div>
          )}

          {tickets.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] p-5 text-center">
              <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Belum ada tiket. Kumpulkan minimal {MIN_CASHOUT.toLocaleString("id-ID")} Poin untuk mencetak yang pertama.</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="text-xs font-bold text-[#7A6E65] text-center py-4">Tidak ada tiket dengan status ini.</p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto overscroll-contain divide-y divide-[#EFE9DC] rounded-2xl border-2 border-[#E6DFD2]">
              {visible.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-extrabold tabular-nums text-[#3D352E] leading-snug">
                      {formatRupiah(t.rupiah_value)}
                      <span className="ml-1.5 text-[11px] font-bold text-[#7A6E65]">{dateLabel(t.created_at)}</span>
                    </p>
                    <p className="text-[11px] font-bold text-[#7A6E65] leading-snug truncate" title={t.note}>
                      {t.note}
                    </p>
                  </div>
                  <span className={cn("shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-display font-extrabold", STATUS_META[t.status].chip)}>
                    {STATUS_META[t.status].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </CozyCard>
  );
}

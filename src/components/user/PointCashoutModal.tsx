"use client";

import { ChipScroller } from "@/components/ui/ChipScroller";
import React, { useState } from "react";
import { Drawer } from "vaul";
import { X } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { pickViewedChild } from "@/lib/active-child";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  RollingNumber,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { PointTransferModal } from "@/components/ui/PointTransferModal";
import { FamilyAvatar } from "@/components/family/FamilyAvatar";
import { soundEffects } from "@/lib/sound-effects";

export function PointCashoutModal() {
  const {
    activeProfileId,
    currentRole,
    monitoredUserId,
    isCashoutModalOpen,
    setCashoutModalOpen,
    profiles,
    redemptions,
    requestPointCashout,
  } = useBukuDompetStore();

  const userProfile = pickViewedChild({ currentRole, activeProfileId, monitoredUserId, profiles });

  const [pointsInput, setPointsInput] = useState<string>("5000");
  const [noteInput, setNoteInput] = useState<string>(
    "Tukar poin rajin mencatat kas buat masuk celengan Mochi!"
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const [lastOk, setLastOk] = useState<boolean>(false);
  const adminProfile = profiles.find((p) => p.role === "admin") ?? null;

  const executeCashout = () => {
    const pts = Number(pointsInput) || 0;
    const res = requestPointCashout(pts, noteInput);
    setLastOk(res.success);
    setFeedback(res.success ? null : res.message);
    return res;
  };

  return (
    <>
      <PointTransferModal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          if (lastOk) {
            setLastOk(false);
            setCashoutModalOpen(false);
          }
        }}
        mode="cashout"
        from={{ name: userProfile.display_name.split(" ")[0], visual: <FamilyAvatar profile={userProfile} size={64} /> }}
        to={{
          name: "Abang (Admin)",
          visual: adminProfile ? (
            <FamilyAvatar profile={adminProfile} size={64} />
          ) : (
            <CozyIcon name="rewards_ticket" size={56} />
          ),
        }}
        amount={Number(pointsInput) || 0}
        fromBalance={userProfile.points_balance}
        execute={executeCashout}
        confirmLabel="Ya, Cetak Tiket!"
        receiveNote={`Tiket ${formatRupiah(Number(pointsInput) || 0)} (1 Poin = Rp 1)`}
      />

      <Drawer.Root
        open={isCashoutModalOpen}
        onOpenChange={setCashoutModalOpen}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/45 z-50 backdrop-blur-[2px]" />
          <Drawer.Content className="bg-[#FFFDF9] border-t-4 border-[#E6DFD2] rounded-t-[36px] fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col focus:outline-none">
            <div className="mx-auto w-14 h-2 rounded-full bg-[#D4C9B4] my-3 shrink-0" />

            <div className="px-4 sm:px-6 pb-8 overflow-y-auto max-w-lg mx-auto w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] flex items-center justify-center">
                    <CozyIcon name="rewards_ticket" size={30} />
                  </div>
                  <div>
                    <Drawer.Title className="font-display text-xl font-extrabold text-[#3D352E]">
                      Tukar Poin Jadi Saldo Rupiah
                    </Drawer.Title>
                    <Drawer.Description className="text-xs font-bold text-[#7A6E65]">
                      Kurs Jujur: 1 Poin = Rp 1 Asli!
                    </Drawer.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCashoutModalOpen(false)}
                  className="p-2.5 rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-[#F9F4EA] hover:bg-[#FFF2F0] cursor-pointer"
                >
                  <X className="w-5 h-5 text-[#3D352E]" />
                </button>
              </div>

              {/* Golden Balance Ticket Card — Stacked flex-col items-start gap-2 so Points Balance is never truncated */}
              <CozyCard tone="honey" className="relative overflow-hidden">
                <div className="flex flex-col items-start gap-2">
                  <div className="min-w-0 w-full">
                    <p className="text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                      Saldo Dompet Poin Saat Ini
                    </p>
                    <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#3D352E] mt-1 flex items-center gap-2 flex-wrap">
                      <CozyIcon name="coin_rupiah" size={30} className="shrink-0" />
                      <RollingNumber
                        value={userProfile.points_balance}
                        suffix=" Poin"
                        className="break-words"
                      />
                    </div>
                    <p className="text-xs font-display font-extrabold tabular-nums text-[#46A302] mt-1">
                      Setara dengan {formatRupiah(userProfile.points_balance)}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white border-2 border-[#FDE08D] font-display text-xs font-extrabold text-[#4A3500]">
                    Kurs Tetap: 1 Poin = Rp1
                  </span>
                </div>
              </CozyCard>

              <form onSubmit={handleOpenConfirm} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                    Jumlah Poin yang Ingin Dicairkan (Min. 1.000)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    max={userProfile.points_balance}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-white font-display font-extrabold tabular-nums text-lg text-[#3D352E] focus:outline-none focus:border-[#FFC800]"
                  />
                  <ChipScroller label="Nominal tukar cepat" className="mt-2">
                    {[2000, 5000, 10000, userProfile.points_balance].map(
                      (preset, idx) =>
                        preset >= 1000 && (
                          <button
                            key={`${preset}-${idx}`}
                            type="button"
                            onClick={() => {
                              soundEffects.tactileClick();
                              setPointsInput(String(preset));
                            }}
                            className="px-3 py-1 rounded-xl border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] bg-[#F9F4EA] hover:bg-[#FFFBEB] font-display font-extrabold tabular-nums text-xs cursor-pointer"
                          >
                            {idx === 3
                              ? `Semua (${preset.toLocaleString("id-ID")})`
                              : `${preset.toLocaleString("id-ID")} Poin`}
                          </button>
                        )
                    )}
                  </ChipScroller>
                </div>

                <div>
                  <label className="block text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                    Pesan untuk Abang / Orang Tua
                  </label>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                  />
                </div>

                {feedback && (
                  <div className="p-3 rounded-2xl border-2 border-[#C3EFA4] bg-[#EFFBE6] text-xs font-extrabold text-[#3D352E]">
                    {feedback}
                  </div>
                )}

                <TactileButton
                  type="submit"
                  variant="honey"
                  size="lg"
                  fullWidth
                >
                  <CozyIcon name="rewards_ticket" size={22} />
                  Cetak Tiket Emas Pencairan (
                  {formatRupiah(Number(pointsInput) || 0)})
                </TactileButton>
              </form>

              {/* Recent Cashout Tickets */}
              <div className="pt-2">
                <p className="text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65] mb-2">
                  Riwayat Tiket Pencairan Poin
                </p>
                <div className="space-y-2">
                  {redemptions.slice(0, 3).map((red) => (
                    <div
                      key={red.id}
                      className="p-3 rounded-2xl border-2 border-[#E6DFD2] bg-white flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-display font-extrabold tabular-nums text-sm text-[#3D352E]">
                          {formatRupiah(red.rupiah_value)}{" "}
                          <span className="text-xs text-[#7A6E65]">
                            ({red.points_redeemed.toLocaleString("id-ID")} Poin)
                          </span>
                        </p>
                        <p className="text-xs font-bold text-[#7A6E65] truncate">
                          {red.note}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl border text-xs font-display font-extrabold inline-flex items-center gap-1 shrink-0 ${
                          red.status === "approved"
                            ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#46A302]"
                            : red.status === "pending"
                            ? "bg-[#FFFBEB] border-[#FDE08D] text-[#3D352E]"
                            : "bg-[#FFF0F0] border-[#FFC2C2] text-[#EA2B2B]"
                        }`}
                      >
                        <CozyIcon
                          name={
                            red.status === "approved"
                              ? "check_badge"
                              : red.status === "pending"
                              ? "rewards_ticket"
                              : "warning_siren"
                          }
                          size={16}
                        />
                        {red.status === "approved"
                          ? "Cair!"
                          : red.status === "pending"
                          ? "Menunggu"
                          : "Ditolak"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

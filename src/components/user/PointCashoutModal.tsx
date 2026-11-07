"use client";

import React, { useState } from "react";
import { Drawer } from "vaul";
import { Ticket, Coins, CheckCircle2, Clock, X } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  TactileButton,
  CozyCard,
  RollingNumber,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export function PointCashoutModal() {
  const {
    isCashoutModalOpen,
    setCashoutModalOpen,
    profiles,
    redemptions,
    requestPointCashout,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];

  const [pointsInput, setPointsInput] = useState<string>("5000");
  const [noteInput, setNoteInput] = useState<string>(
    "Tukar poin rajin mencatat kas buat masuk celengan Mochi! 🐱✨"
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCashout = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = Number(pointsInput) || 0;
    const res = requestPointCashout(pts, noteInput);
    setFeedback(res.message);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
      setTimeout(() => {
        setFeedback(null);
        setCashoutModalOpen(false);
      }, 1800);
    } else {
      soundEffects.detectiveBuzz();
    }
  };

  return (
    <Drawer.Root open={isCashoutModalOpen} onOpenChange={setCashoutModalOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/50 z-50 backdrop-blur-[2px]" />
        <Drawer.Content className="bg-[#FFFDF7] border-t-4 border-[#3D352E] rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col focus:outline-none">
          <div className="mx-auto w-14 h-2 rounded-full bg-[#3D352E]/25 my-3 shrink-0" />

          <div className="px-4 sm:px-6 pb-8 overflow-y-auto max-w-lg mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FFC800] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-[#3D352E]" />
                </div>
                <div>
                  <Drawer.Title className="font-fredoka text-xl font-bold text-[#3D352E]">
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
                className="p-2 rounded-2xl border-2 border-[#3D352E] bg-[#F7F2E7] hover:bg-[#FFE8E5] cursor-pointer"
              >
                <X className="w-5 h-5 text-[#3D352E]" />
              </button>
            </div>

            {/* Golden Balance Ticket Card */}
            <CozyCard tone="honey" className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#7A6E65]">
                    Saldo Dompet Poin Saat Ini
                  </p>
                  <div className="font-fredoka text-2xl sm:text-3xl font-bold text-[#3D352E] mt-1 flex items-center gap-2">
                    <Coins className="w-7 h-7 text-[#E5A400]" />
                    <RollingNumber
                      value={userProfile.points_balance}
                      suffix=" Poin"
                    />
                  </div>
                  <p className="text-xs font-mono-num font-extrabold text-[#46A302] mt-1">
                    Setara dengan {formatRupiah(userProfile.points_balance)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-white border-2 border-[#3D352E] font-mono-num text-xs font-extrabold">
                    1 Poin = Rp1
                  </span>
                </div>
              </div>
            </CozyCard>

            <form onSubmit={handleCashout} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                  Jumlah Poin yang Ingin Dicairkan (Min. 1.000)
                </label>
                <input
                  type="number"
                  min={1000}
                  max={userProfile.points_balance}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#3D352E] bg-white font-mono-num text-lg font-extrabold text-[#3D352E] focus:outline-none"
                />
                <div className="flex flex-wrap gap-2 mt-2">
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
                          className="px-3 py-1 rounded-xl border-2 border-[#3D352E] bg-[#F7F2E7] hover:bg-[#FFF7D6] font-mono-num text-xs font-extrabold cursor-pointer"
                        >
                          {idx === 3
                            ? `Semua (${preset.toLocaleString("id-ID")})`
                            : `${preset.toLocaleString("id-ID")} Poin`}
                        </button>
                      )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                  Pesan untuk Abang / Orang Tua
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#3D352E] bg-white text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                />
              </div>

              {feedback && (
                <div className="p-3 rounded-2xl border-2 border-[#3D352E] bg-[#E5F9D7] text-xs font-extrabold text-[#3D352E]">
                  {feedback}
                </div>
              )}

              <TactileButton
                type="submit"
                variant="honey"
                size="lg"
                fullWidth
              >
                Cetak Tiket Emas Pencairan ({formatRupiah(Number(pointsInput) || 0)}) 🎫
              </TactileButton>
            </form>

            {/* Recent Cashout Tickets */}
            <div className="pt-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#7A6E65] mb-2">
                Riwayat Tiket Pencairan Poin
              </p>
              <div className="space-y-2">
                {redemptions.slice(0, 3).map((red) => (
                  <div
                    key={red.id}
                    className="p-3 rounded-2xl border-2 border-[#3D352E] bg-white flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono-num text-sm font-extrabold text-[#3D352E]">
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
                      className={`px-2.5 py-1 rounded-xl border-2 border-[#3D352E] text-xs font-extrabold inline-flex items-center gap-1 shrink-0 ${
                        red.status === "approved"
                          ? "bg-[#E5F9D7] text-[#3D352E]"
                          : red.status === "pending"
                          ? "bg-[#FFF7D6] text-[#3D352E]"
                          : "bg-[#FFDEDE] text-[#EA2B2B]"
                      }`}
                    >
                      {red.status === "approved" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#46A302]" />
                          Cair!
                        </>
                      ) : red.status === "pending" ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#E5A400]" />
                          Menunggu
                        </>
                      ) : (
                        "Ditolak"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

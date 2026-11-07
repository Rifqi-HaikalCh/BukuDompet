"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Ticket,
  Sliders,
  FlaskConical,
  Check,
  X,
  Plus,
  RotateCcw,
  Eye,
  Smartphone,
  Sparkles,
  Coins,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import { MochiCompanion } from "@/components/illustrations/MochiCompanion";
import {
  TactileButton,
  CozyCard,
  FloatingRewardBanner,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { TransactionDrawer } from "@/components/user/TransactionDrawer";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export default function AdminCommandCenterPage() {
  const {
    profiles,
    transactions,
    redemptions,
    isSandboxMode,
    toggleSandboxMode,
    setTransactionDrawerOpen,
    approveOrRejectCashout,
    updateBudgetSettings,
    addCustomMission,
    resetToDemoSeed,
  } = useBukuDompetStore();

  const userProfile =
    profiles.find((p) => p.role === "user") || profiles[0];
  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = analyzeSpendingDetective({
    transactions,
    monthlyBudgetTarget: userProfile.monthly_budget_target,
    monthlySavingTarget: userProfile.monthly_saving_target,
    userLevel: levelInfo.level,
  });

  // Budget Configurator Form State
  const [budgetInput, setBudgetInput] = useState<string>(
    String(userProfile.monthly_budget_target)
  );
  const [savingInput, setSavingInput] = useState<string>(
    String(userProfile.monthly_saving_target)
  );

  // Custom Mission Injector State
  const [missionTitle, setMissionTitle] = useState<string>(
    "Tantangan Spesial Abang: Catat Struk Kantin"
  );
  const [missionDesc, setMissionDesc] = useState<string>(
    "Catat pengeluaran makan siang dengan rincian jujur hari ini!"
  );
  const [missionPoints, setMissionPoints] = useState<string>("250");

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const historyRedemptions = redemptions.filter((r) => r.status !== "pending");

  const handleApprove = (id: string) => {
    soundEffects.comboFanfare();
    fireCozyConfetti("jackpot");
    approveOrRejectCashout(id, "approved");
  };

  const handleReject = (id: string) => {
    soundEffects.detectiveBuzz();
    approveOrRejectCashout(id, "rejected");
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.coinChime();
    updateBudgetSettings(
      Number(budgetInput) || 1800000,
      Number(savingInput) || 350000
    );
  };

  const handleAddMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionTitle.trim()) return;
    soundEffects.comboFanfare();
    fireCozyConfetti("normal");
    addCustomMission({
      title: missionTitle.trim(),
      description: missionDesc.trim(),
      mission_type: "saving_challenge",
      target_value: 1,
      reward_points: Number(missionPoints) || 200,
      reward_xp: 75,
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#3D352E] pb-16">
      <FloatingRewardBanner />
      <TransactionDrawer />

      {/* Top Sticky Admin Command Bar & Role View Switcher */}
      <header className="sticky top-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-sm border-b-2 border-[#3D352E]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#38B6FF] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-fredoka text-lg sm:text-xl font-bold text-[#3D352E] leading-none">
                Command Center Abang (Admin & Sponsor Poin)
              </h1>
              <p className="text-xs font-bold text-[#7A6E65]">
                Kelola Pencairan Poin (1 Poin = Rp1), Simulasi Kas & Target Budget
              </p>
            </div>
          </div>

          {/* Instant Role View Switcher */}
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#E5F9D7] border-2 border-[#3D352E] text-xs font-extrabold flex items-center gap-1 hover:bg-[#58CC02] hover:text-white transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" /> User View (Adik)
            </Link>
            <Link
              href="/supervisor"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#FFF7D6] border-2 border-[#3D352E] text-xs font-extrabold flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Supervisor View
            </Link>
            <Link
              href="/login"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#F7F2E7] border-2 border-[#3D352E] text-xs font-extrabold"
            >
              Pintu PIN
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* 1. Sandbox / Simulasi Pencatatan Banner */}
        <CozyCard
          tone={isSandboxMode ? "taro" : "sky"}
          className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#3D352E] flex items-center justify-center shrink-0">
              <MochiCompanion stage={5} mood="happy" className="w-16 h-16" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white border-2 border-[#3D352E] text-xs font-extrabold">
                  {isSandboxMode
                    ? "🧪 Mode Simulasi Sandbox: AKTIF"
                    : "📡 Mode Live Buku Kas: AKTIF"}
                </span>
                <span className="text-xs font-mono-num font-bold text-[#3D352E]">
                  Saldo Poin Adik: {formatRupiah(userProfile.points_balance)}
                </span>
              </div>
              <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                Simulasi Catat Uang & Efek Gamifikasi
              </h2>
              <p className="text-xs sm:text-sm font-bold text-[#3D352E]/85">
                Abang bisa langsung menguji fitur Smart Quick-Split, Combo
                Detail (+35 Poin), dan suara koin di sini!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <TactileButton
              variant={isSandboxMode ? "honey" : "white"}
              size="md"
              onClick={toggleSandboxMode}
            >
              <FlaskConical className="w-4 h-4" />
              {isSandboxMode ? "Matikan Sandbox" : "Aktifkan Mode Simulasi"}
            </TactileButton>

            <TactileButton
              variant="matcha"
              size="md"
              onClick={() => setTransactionDrawerOpen(true)}
            >
              <Plus className="w-4 h-4" /> Uji Catat Transaksi
            </TactileButton>

            <TactileButton
              variant="peach"
              size="sm"
              onClick={() => {
                soundEffects.tactileClick();
                resetToDemoSeed();
              }}
              title="Reset seluruh data kembali ke Seed Awal"
            >
              <RotateCcw className="w-4 h-4" /> Reset Demo
            </TactileButton>
          </div>
        </CozyCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 2. Approval Pencairan Poin (Cashout Queue: 1 Poin = Rp 1) */}
          <CozyCard tone="white" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-6 h-6 text-[#E5A400]" />
                <div>
                  <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                    🎫 Antrean Approval Pencairan Poin
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Saat disetujui, otomatis membuat transaksi pemasukan{" "}
                    <em>&ldquo;Hadiah Tukar Poin Gamifikasi&rdquo;</em> di kas Adik!
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[#FFF7D6] border-2 border-[#3D352E] font-mono-num text-xs font-extrabold">
                {pendingRedemptions.length} Pending
              </span>
            </div>

            {pendingRedemptions.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#E5F9D7] border-2 border-[#3D352E] text-center space-y-1">
                <p className="font-fredoka text-base font-bold text-[#3D352E]">
                  Semua Tiket Pencairan Sudah Diproses! ✨
                </p>
                <p className="text-xs font-bold text-[#7A6E65]">
                  Adik dapat mengajukan pencairan baru dari menu Koleksi & Tukar
                  Poin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRedemptions.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-[#FFF7D6] border-2 border-[#3D352E] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-[#3D352E] text-[10px] font-extrabold uppercase">
                          Menunggu Persetujuan Sponsor
                        </span>
                        <p className="font-mono-num text-xl font-extrabold text-[#3D352E] mt-1 flex items-center gap-1.5">
                          <Coins className="w-5 h-5 text-[#E5A400]" />
                          {formatRupiah(req.rupiah_value)}{" "}
                          <span className="text-xs text-[#7A6E65]">
                            ({req.points_redeemed.toLocaleString("id-ID")} Poin)
                          </span>
                        </p>
                        <p className="text-xs font-bold text-[#3D352E] mt-1">
                          Catatan Adik: &ldquo;{req.note}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <TactileButton
                        variant="matcha"
                        size="sm"
                        onClick={() => handleApprove(req.id)}
                      >
                        <Check className="w-4 h-4" /> Setujui & Cairkan Rp
                        {req.rupiah_value.toLocaleString("id-ID")}
                      </TactileButton>
                      <TactileButton
                        variant="berry"
                        size="sm"
                        onClick={() => handleReject(req.id)}
                      >
                        <X className="w-4 h-4" /> Tolak & Kembalikan Poin
                      </TactileButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Approved / Rejected History */}
            <div className="pt-2 space-y-2">
              <h3 className="font-fredoka text-sm font-bold text-[#7A6E65] uppercase">
                Riwayat Pencairan Sebelumnya
              </h3>
              {historyRedemptions.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#F7F2E7] border-2 border-[#3D352E] flex items-center justify-between text-xs font-bold"
                >
                  <div>
                    <p className="font-mono-num font-extrabold text-[#3D352E]">
                      {formatRupiah(item.rupiah_value)} ({item.points_redeemed}{" "}
                      Poin)
                    </p>
                    <p className="text-[#7A6E65]">{item.note}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl border border-[#3D352E] font-extrabold ${
                      item.status === "approved"
                        ? "bg-[#E5F9D7] text-[#46A302]"
                        : "bg-[#FFDEDE] text-[#EA2B2B]"
                    }`}
                  >
                    {item.status === "approved" ? "Disetujui ✅" : "Ditolak ❌"}
                  </span>
                </div>
              ))}
            </div>
          </CozyCard>

          {/* 3. Budget & Challenge Configurator */}
          <div className="space-y-6">
            <CozyCard tone="white" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-[#38B6FF]" />
                <div>
                  <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                    ⚙️ Pengaturan Target Budget & Tabungan
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Otomatis memperbarui rumus DSSL (Batas Aman Harian) Detektif
                    Mochi
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveBudget} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-[#7A6E65] mb-1">
                    Jatah Uang Saku Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#3D352E] bg-[#FFFDF7] font-mono-num text-base font-extrabold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-[#7A6E65] mb-1">
                    Target Tabungan Wajib Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    value={savingInput}
                    onChange={(e) => setSavingInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#3D352E] bg-[#FFFDF7] font-mono-num text-base font-extrabold"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[#E0F4FF] border-2 border-[#3D352E] text-xs font-bold flex items-center justify-between">
                  <span>Batas Aman Harian (DSSL) Saat Ini:</span>
                  <span className="font-mono-num text-sm font-extrabold text-[#3D352E]">
                    {formatRupiah(report.dssl)} / hari
                  </span>
                </div>

                <TactileButton
                  type="submit"
                  variant="sky"
                  size="md"
                  fullWidth
                >
                  Simpan Konfigurasi Anggaran 💾
                </TactileButton>
              </form>
            </CozyCard>

            {/* Inject Bonus Mission for Sister */}
            <CozyCard tone="vanilla" className="space-y-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#A552DB]" />
                <div>
                  <h3 className="font-fredoka text-lg font-bold text-[#3D352E]">
                    🎯 Kirim Misi Tantangan Baru untuk Adik
                  </h3>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Tambahkan misi spesial berhadiah Poin langsung ke layar Adik
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddMission} className="space-y-3">
                <input
                  type="text"
                  value={missionTitle}
                  onChange={(e) => setMissionTitle(e.target.value)}
                  placeholder="Judul Misi"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#3D352E] bg-white text-xs sm:text-sm font-bold"
                />
                <input
                  type="text"
                  value={missionDesc}
                  onChange={(e) => setMissionDesc(e.target.value)}
                  placeholder="Deskripsi Misi"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#3D352E] bg-white text-xs sm:text-sm font-bold"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#7A6E65]">
                    Hadiah Poin (Rp):
                  </span>
                  <input
                    type="number"
                    value={missionPoints}
                    onChange={(e) => setMissionPoints(e.target.value)}
                    className="w-32 px-3 py-1.5 rounded-xl border-2 border-[#3D352E] bg-white font-mono-num text-sm font-extrabold"
                  />
                </div>
                <TactileButton
                  type="submit"
                  variant="taro"
                  size="sm"
                  fullWidth
                >
                  <Plus className="w-4 h-4" /> Luncurkan Misi Bonus ke Adik!
                </TactileButton>
              </form>
            </CozyCard>
          </div>
        </div>
      </main>
    </div>
  );
}

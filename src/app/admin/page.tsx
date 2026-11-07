"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import { MochiCompanion } from "@/components/illustrations/MochiCompanion";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  FloatingRewardBanner,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { GamificationFX } from "@/components/ui/GamificationFX";
import { TransactionDrawer } from "@/components/user/TransactionDrawer";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";

export default function AdminCommandCenterPage() {
  const router = useRouter();
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

  // Confirm Modal States
  const [pendingAction, setPendingAction] = useState<{
    type:
      | "approve_cashout"
      | "reject_cashout"
      | "save_budget"
      | "reset_demo"
      | "exit_login";
    redemptionId?: string;
    amount?: number;
  } | null>(null);

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const historyRedemptions = redemptions.filter((r) => r.status !== "pending");

  const executePendingConfirm = () => {
    if (!pendingAction) return;
    if (
      pendingAction.type === "approve_cashout" &&
      pendingAction.redemptionId
    ) {
      soundEffects.comboFanfare();
      fireCozyConfetti("jackpot");
      approveOrRejectCashout(pendingAction.redemptionId, "approved");
    } else if (
      pendingAction.type === "reject_cashout" &&
      pendingAction.redemptionId
    ) {
      soundEffects.detectiveBuzz();
      approveOrRejectCashout(pendingAction.redemptionId, "rejected");
    } else if (pendingAction.type === "save_budget") {
      soundEffects.coinChime();
      updateBudgetSettings(
        Number(budgetInput) || 1800000,
        Number(savingInput) || 350000
      );
    } else if (pendingAction.type === "reset_demo") {
      soundEffects.tactileClick();
      resetToDemoSeed();
    } else if (pendingAction.type === "exit_login") {
      router.push("/login");
    }
    setPendingAction(null);
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
    <div className="min-h-screen text-[#3D352E] pb-16">
      <PageTransitionLoader />
      <GamificationFX />
      <FloatingRewardBanner />
      <TransactionDrawer />

      {/* Universal Admin Confirm Modal */}
      <CozyConfirmModal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={executePendingConfirm}
        title={
          pendingAction?.type === "approve_cashout"
            ? `Setujui Pencairan ${formatRupiah(pendingAction.amount || 0)}?`
            : pendingAction?.type === "reject_cashout"
            ? "Tolak Tiket Pencairan Poin?"
            : pendingAction?.type === "save_budget"
            ? "Simpan Perubahan Target Budget?"
            : pendingAction?.type === "reset_demo"
            ? "Reset Seluruh Data Demo?"
            : "Kembali ke Pintu PIN?"
        }
        description={
          pendingAction?.type === "approve_cashout"
            ? "Saat disetujui, sistem otomatis membuat transaksi pemasukan 'Hadiah Tukar Poin Gamifikasi' di Buku Kas Adik!"
            : pendingAction?.type === "reject_cashout"
            ? "Tiket akan dibatalkan dan saldo Poin akan dikembalikan utuh ke dompet Adik."
            : pendingAction?.type === "save_budget"
            ? `Uang saku bulanan akan diatur ke ${formatRupiah(
                Number(budgetInput) || 0
              )} dengan target tabungan ${formatRupiah(
                Number(savingInput) || 0
              )}. Rumus DSSL Detektif Mochi akan otomatis menyesuaikan.`
            : pendingAction?.type === "reset_demo"
            ? "Seluruh transaksi, poin, misi, dan evolusi akan dikembalikan ke data awal (Seed Data)."
            : "Anda akan kembali ke layar pemilihan profil keluarga."
        }
        confirmLabel={
          pendingAction?.type === "reject_cashout"
            ? "Ya, Tolak Tiket"
            : "Ya, Lanjutkan!"
        }
        confirmVariant={
          pendingAction?.type === "reject_cashout" ||
          pendingAction?.type === "reset_demo"
            ? "berry"
            : "matcha"
        }
        mochiStage={5}
        mochiMood={
          pendingAction?.type === "reject_cashout" ? "worried" : "proud_combo"
        }
        badgeText="Konfirmasi Admin Abang"
      />

      {/* Top Sticky Admin Command Bar & Role View Switcher */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/92 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BukuDompetLogo
              variant="mark"
              size="sm"
              className="sm:hidden w-10 h-10"
            />
            <BukuDompetLogo
              variant="full"
              size="sm"
              className="hidden sm:block h-10 w-auto"
            />
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF8FF] border-2 border-[#BCE3FF] text-xs font-display font-extrabold">
              <CozyIcon name="crown_sultan" size={18} />
              Command Center Abang (Admin)
            </span>
          </div>

          {/* Instant Role View Switcher */}
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] text-xs font-display font-extrabold flex items-center gap-1.5 hover:bg-[#58CC02] hover:text-white transition-colors"
            >
              <CozyIcon name="home_path" size={18} /> User View (Adik)
            </Link>
            <Link
              href="/supervisor"
              onClick={() => soundEffects.tactileClick()}
              className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] text-xs font-display font-extrabold flex items-center gap-1.5"
            >
              <CozyIcon name="parent_heart" size={18} /> Supervisor
            </Link>
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setPendingAction({ type: "exit_login" });
              }}
              className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <CozyIcon name="lock_cozy" size={16} /> Pintu PIN
            </button>
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
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center shrink-0">
              <MochiCompanion stage={5} mood="happy" className="w-16 h-16" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#BCE3FF] text-xs font-display font-extrabold inline-flex items-center gap-1">
                  <CozyIcon name="combo_sparkle" size={16} />
                  {isSandboxMode
                    ? "Mode Simulasi Sandbox: AKTIF"
                    : "Mode Live Buku Kas: AKTIF"}
                </span>
                <span className="text-xs font-display font-extrabold tabular-nums text-[#3D352E]">
                  Saldo Poin Adik: {formatRupiah(userProfile.points_balance)}
                </span>
              </div>
              <h2 className="font-display text-xl font-extrabold text-[#3D352E]">
                Simulasi Catat Uang & Efek Gamifikasi
              </h2>
              <p className="text-xs sm:text-sm font-bold text-[#3D352E]/85">
                Abang bisa langsung menguji fitur Smart Quick-Split, Combo
                Detail (+35 Poin), dan partikel koin terbang di sini!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <TactileButton
              variant={isSandboxMode ? "honey" : "cream"}
              size="md"
              onClick={toggleSandboxMode}
            >
              <CozyIcon name="combo_sparkle" size={18} />
              {isSandboxMode ? "Matikan Sandbox" : "Aktifkan Mode Simulasi"}
            </TactileButton>

            <TactileButton
              variant="matcha"
              size="md"
              onClick={() => setTransactionDrawerOpen(true)}
            >
              <CozyIcon name="plus_record" size={20} /> Uji Catat Transaksi
            </TactileButton>

            <TactileButton
              variant="peach"
              size="sm"
              onClick={() => setPendingAction({ type: "reset_demo" })}
              title="Reset seluruh data kembali ke Seed Awal"
            >
              Reset Demo
            </TactileButton>
          </div>
        </CozyCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 2. Approval Pencairan Poin (Cashout Queue: 1 Poin = Rp 1) */}
          <CozyCard tone="white" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CozyIcon name="rewards_ticket" size={30} />
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[#3D352E]">
                    Antrean Approval Pencairan Poin
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Saat disetujui, otomatis membuat transaksi pemasukan{" "}
                    <em>&ldquo;Hadiah Tukar Poin Gamifikasi&rdquo;</em> di kas Adik!
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] font-display tabular-nums text-xs font-extrabold">
                {pendingRedemptions.length} Pending
              </span>
            </div>

            {pendingRedemptions.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-center space-y-1">
                <p className="font-display text-base font-extrabold text-[#3D352E]">
                  Semua Tiket Pencairan Sudah Diproses!
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
                    className="p-4 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-[#FDE08D] text-[10px] font-display font-extrabold uppercase">
                          Menunggu Persetujuan Sponsor
                        </span>
                        <p className="font-display text-xl font-extrabold tabular-nums text-[#3D352E] mt-1 flex items-center gap-1.5">
                          <CozyIcon name="coin_rupiah" size={24} />
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
                        onClick={() =>
                          setPendingAction({
                            type: "approve_cashout",
                            redemptionId: req.id,
                            amount: req.rupiah_value,
                          })
                        }
                      >
                        <CozyIcon name="check_badge" size={18} />
                        Setujui & Cairkan Rp
                        {req.rupiah_value.toLocaleString("id-ID")}
                      </TactileButton>
                      <TactileButton
                        variant="berry"
                        size="sm"
                        onClick={() =>
                          setPendingAction({
                            type: "reject_cashout",
                            redemptionId: req.id,
                            amount: req.rupiah_value,
                          })
                        }
                      >
                        Tolak & Kembalikan Poin
                      </TactileButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Approved / Rejected History */}
            <div className="pt-2 space-y-2">
              <h3 className="font-display text-sm font-extrabold text-[#7A6E65] uppercase">
                Riwayat Pencairan Sebelumnya
              </h3>
              {historyRedemptions.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#F9F4EA] border border-[#E6DFD2] flex items-center justify-between text-xs font-bold"
                >
                  <div>
                    <p className="font-display font-extrabold tabular-nums text-[#3D352E]">
                      {formatRupiah(item.rupiah_value)} ({item.points_redeemed}{" "}
                      Poin)
                    </p>
                    <p className="text-[#7A6E65]">{item.note}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl border font-display font-extrabold inline-flex items-center gap-1 ${
                      item.status === "approved"
                        ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#46A302]"
                        : "bg-[#FFF0F0] border-[#FFC2C2] text-[#EA2B2B]"
                    }`}
                  >
                    <CozyIcon
                      name={
                        item.status === "approved"
                          ? "check_badge"
                          : "warning_siren"
                      }
                      size={14}
                    />
                    {item.status === "approved" ? "Disetujui" : "Ditolak"}
                  </span>
                </div>
              ))}
            </div>
          </CozyCard>

          {/* 3. Budget & Challenge Configurator */}
          <div className="space-y-6">
            <CozyCard tone="white" className="space-y-4">
              <div className="flex items-center gap-2.5">
                <CozyIcon name="cat_saving" size={28} />
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[#3D352E]">
                    Pengaturan Target Budget & Tabungan
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Otomatis memperbarui rumus DSSL (Batas Aman Harian) Detektif
                    Mochi
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPendingAction({ type: "save_budget" });
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                    Jatah Uang Saku Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] font-display font-extrabold tabular-nums text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                    Target Tabungan Wajib Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    value={savingInput}
                    onChange={(e) => setSavingInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] font-display font-extrabold tabular-nums text-base"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[#EEF8FF] border border-[#BCE3FF] text-xs font-bold flex items-center justify-between">
                  <span>Batas Aman Harian (DSSL) Saat Ini:</span>
                  <span className="font-display font-extrabold tabular-nums text-sm text-[#3D352E]">
                    {formatRupiah(report.dssl)} / hari
                  </span>
                </div>

                <TactileButton
                  type="submit"
                  variant="sky"
                  size="md"
                  fullWidth
                >
                  <CozyIcon name="check_badge" size={20} />
                  Simpan Konfigurasi Anggaran
                </TactileButton>
              </form>
            </CozyCard>

            {/* Inject Bonus Mission for Sister */}
            <CozyCard tone="vanilla" className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <CozyIcon name="missions_scroll" size={26} />
                <div>
                  <h3 className="font-display text-lg font-extrabold text-[#3D352E]">
                    Kirim Misi Tantangan Baru untuk Adik
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
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold"
                />
                <input
                  type="text"
                  value={missionDesc}
                  onChange={(e) => setMissionDesc(e.target.value)}
                  placeholder="Deskripsi Misi"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                    Hadiah Poin (Rp):
                  </span>
                  <input
                    type="number"
                    value={missionPoints}
                    onChange={(e) => setMissionPoints(e.target.value)}
                    className="w-32 px-3 py-1.5 rounded-xl border-2 border-[#E6DFD2] bg-white font-display font-extrabold tabular-nums text-sm"
                  />
                </div>
                <TactileButton
                  type="submit"
                  variant="taro"
                  size="sm"
                  fullWidth
                >
                  <CozyIcon name="plus_record" size={18} />
                  Luncurkan Misi Bonus ke Adik!
                </TactileButton>
              </form>
            </CozyCard>
          </div>
        </div>
      </main>
    </div>
  );
}

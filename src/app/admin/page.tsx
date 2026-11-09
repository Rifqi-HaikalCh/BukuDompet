"use client";

import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  UserPlus,
  Users,
  ShieldCheck,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
} from "@/components/illustrations/UiGlyphs";
import {
  useBukuDompetStore,
  isChildRole,
  type UserRole,
} from "@/store/useBukuDompetStore";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
} from "@/lib/spending-detective";
import { validateBudgetInput } from "@/lib/finance/budget";
import { GROWTH_STAGE_META } from "@/components/illustrations/PetAvatarSystem";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  FloatingRewardBanner,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { useSafeLogout } from "@/components/ui/SafeLogout";
import { adminCreateAccount } from "@/lib/sync/client";
import { AdminActionProvider, useAdminAction } from "@/components/admin/AdminActionModal";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AccountManager } from "@/components/admin/AccountManager";
import { accountError } from "@/components/admin/account-errors";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { GamificationFX } from "@/components/ui/GamificationFX";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { useCozyBgm } from "@/lib/cozy-bgm";
import { cn, formatCompactRupiah } from "@/lib/utils";

export default function AdminCommandCenterPage() {
  return (
    <AdminActionProvider>
      <AdminCommandCenter />
    </AdminActionProvider>
  );
}

const ROLE_NAME: Record<string, string> = { admin: "Admin", supervisor: "Supervisor", user: "User", schoolchild: "Anak SD" };

function AdminCommandCenter() {
  const { ask, busy } = useAdminAction();
  const { isPlaying: isBgmPlaying, toggleBgm } = useCozyBgm();
  const {
    profiles,
    supervisorAssignments,
    transactions,
    redemptions,
    approveOrRejectCashout,
    addCustomMission,
    registerNewAccount,
    toggleSupervisorAssignment,
    switchRoleDirect,
  } = useBukuDompetStore();
  const safeLogout = useSafeLogout();

  const userProfiles = useMemo(
    () => profiles.filter((p) => isChildRole(p.role) && p.isActive !== false),
    [profiles]
  );
  const supervisorProfiles = useMemo(
    () => profiles.filter((p) => p.role === "supervisor" && p.isActive !== false),
    [profiles]
  );

  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>(
    userProfiles[0]?.id || profiles[0].id
  );

  const targetUserProfile =
    userProfiles.find((u) => u.id === selectedTargetUserId) ||
    userProfiles[0] ||
    profiles[0];

  const targetUserTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === targetUserProfile.id),
    [transactions, targetUserProfile.id]
  );

  const levelInfo = getLevelFromXp(targetUserProfile.xp);

  const report = analyzeSpendingDetective({
    transactions: targetUserTransactions,
    monthlyBudgetTarget: targetUserProfile.monthly_budget_target,
    monthlySavingTarget: targetUserProfile.monthly_saving_target,
    userLevel: levelInfo.level,
    currentStage: targetUserProfile.currentStage || 1,
    petCustomName: targetUserProfile.petCustomName || "Mochi",
  });

  // 1. Form Tambah Pengguna Baru (Register) State
  const [newDisplayName, setNewDisplayName] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [newPinCode, setNewPinCode] = useState<string>("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [newBudgetTarget, setNewBudgetTarget] = useState<string>("1500000");
  const [newSavingTarget, setNewSavingTarget] = useState<string>("300000");
  const [newPetName, setNewPetName] = useState<string>("Mochi");
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const [registerFeedback, setRegisterFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 2. Matriks Penugasan Supervisor State
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(
    supervisorProfiles[0]?.id || ""
  );

  const activeSelectedSupervisor =
    supervisorProfiles.find((s) => s.id === selectedSupervisorId) ||
    supervisorProfiles[0];

  // 4. Custom Mission Injector State
  const [missionTitle, setMissionTitle] = useState<string>(
    "Tantangan Spesial: Catat Struk Kantin"
  );
  const [missionDesc, setMissionDesc] = useState<string>(
    "Catat pengeluaran makan siang dengan rincian jujur hari ini!"
  );
  const [missionPoints, setMissionPoints] = useState<string>("150");

  // Bounded list state for redemption history
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  // Confirm Modal States
  const [pendingAction, setPendingAction] = useState<{ type: "exit_login" } | null>(null);

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const historyRedemptions = redemptions.filter((r) => r.status !== "pending");
  const visibleHistoryRedemptions = showAllHistory
    ? historyRedemptions
    : historyRedemptions.slice(0, 5);

  const handleRegisterAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = newDisplayName.trim();
    const username = newUsername.trim().toLowerCase().replace(/\s+/g, "_");
    const pin = newPinCode.trim();
    const role = newRole;
    const child = isChildRole(role);
    if (child) {
      // Admin hanya menetapkan nilai awal. Anggaran lanjutan diatur Supervisor.
      const v = validateBudgetInput({
        monthlyBudget: Number(newBudgetTarget),
        mandatorySavingsTarget: Number(newSavingTarget),
        cycleStartDay: 1,
        rolloverPolicy: "split_choice",
        effectiveScope: "current_month",
      });
      if (!v.ok) {
        soundEffects.detectiveBuzz();
        setRegisterFeedback({ success: false, message: Object.values(v.errors)[0] ?? "Anggaran awal belum benar." });
        return;
      }
    }
    if (!name || !username || pin.length !== 4) {
      soundEffects.detectiveBuzz();
      setRegisterFeedback({ success: false, message: "Nama, username, dan PIN 4 angka wajib diisi." });
      return;
    }
    setRegisterFeedback(null);
    const budget = Number(newBudgetTarget);
    const saving = Number(newSavingTarget);
    const pet = newPetName;
    const supId = child ? newSupervisorId || supervisorProfiles[0]?.id : undefined;
    const supName = supervisorProfiles.find((x) => x.id === supId)?.display_name;
    ask({
      title: `Daftarkan akun ${name}?`,
      description: "Akun dibuat di database dan PIN disimpan terenkripsi. Setelah ini akun bisa langsung dipakai masuk.",
      rows: [
        { label: "Nama tampilan", to: name },
        { label: "Username", to: `@${username}` },
        { label: "Peran", to: ROLE_NAME[role] ?? role },
        { label: "PIN", to: "••••" },
        ...(child ? [{ label: "Anggaran awal", to: formatRupiah(budget) }, { label: "Tabungan wajib awal", to: formatRupiah(saving) }] : []),
        ...(supName ? [{ label: "Dipantau oleh", to: supName }] : []),
      ],
      confirmLabel: "Ya, Daftarkan",
      run: async () => {
        // Akun & PIN dibuat DI SERVER dulu (PIN di-hash di database). Hanya bila berhasil, profil lokal dibuat.
        const created = await adminCreateAccount({
          username,
          display_name: name,
          role,
          pin,
          ...(child ? { initial_budget: budget, initial_saving: saving } : {}),
        });
        if (!created.ok) return { ok: false, message: accountError(created.reason) };
        const res = registerNewAccount({
          id: created.id,
          displayName: name,
          username,
          role,
          monthlyBudgetTarget: child ? budget : undefined,
          monthlySavingTarget: child ? saving : undefined,
          petCustomName: child ? pet : undefined,
          supervisorId: supId,
        });
        if (res.success) {
          soundEffects.comboFanfare();
          fireCozyConfetti("combo");
          setNewDisplayName("");
          setNewUsername("");
          setNewPinCode("");
          setRegisterFeedback(null);
        }
        return { ok: res.success, message: res.message };
      },
    });
  };

  const askToggleAssignment = (
    sup: (typeof profiles)[number],
    usr: (typeof profiles)[number],
    isAssigned: boolean
  ) =>
    ask({
      title: isAssigned ? `Cabut akses pantau ${sup.display_name}?` : `Beri akses pantau ke ${sup.display_name}?`,
      description: isAssigned
        ? "Supervisor ini tidak akan melihat data akun tersebut lagi."
        : "Supervisor ini akan bisa memantau dan mengatur anggaran akun tersebut.",
      rows: [
        { label: "Supervisor", to: sup.display_name },
        { label: "Akun dipantau", to: `${usr.display_name} (@${usr.username})` },
        { label: "Akses", from: isAssigned ? "Dipantau" : "Tidak dipantau", to: isAssigned ? "Tidak dipantau" : "Dipantau" },
      ],
      confirmLabel: isAssigned ? "Ya, Cabut Akses" : "Ya, Beri Akses",
      variant: isAssigned ? "peach" : "matcha",
      run: async () => {
        toggleSupervisorAssignment(sup.id, usr.id);
        return { ok: true, message: isAssigned ? "Akses pantau dicabut." : "Akses pantau diberikan." };
      },
    });

  const askCashout = (req: (typeof redemptions)[number], action: "approved" | "rejected") => {
    const requester = profiles.find((p) => p.id === req.user_id);
    const approve = action === "approved";
    ask({
      title: approve ? `Setujui pencairan ${formatRupiah(req.rupiah_value)}?` : "Tolak tiket pencairan poin?",
      description: approve
        ? "Sistem otomatis membuat transaksi pemasukan 'Hadiah Tukar Poin Gamifikasi' di Buku Kas pengguna."
        : "Tiket dibatalkan dan poin dikembalikan utuh ke pengguna.",
      rows: [
        { label: "Pemohon", to: requester?.display_name ?? "User" },
        { label: "Nilai", to: `${formatRupiah(req.rupiah_value)} (${req.points_redeemed.toLocaleString("id-ID")} poin)` },
        { label: "Keputusan", to: approve ? "Setujui" : "Tolak & kembalikan poin" },
      ],
      confirmLabel: approve ? "Ya, Setujui" : "Ya, Tolak Tiket",
      variant: approve ? "matcha" : "peach",
      run: async () => {
        if (approve) {
          soundEffects.comboFanfare();
          fireCozyConfetti("jackpot");
        } else {
          soundEffects.detectiveBuzz();
        }
        approveOrRejectCashout(req.id, action);
        return { ok: true, message: approve ? "Pencairan disetujui." : "Tiket ditolak, poin dikembalikan." };
      },
    });
  };

  const executePendingConfirm = () => {
    if (pendingAction?.type === "exit_login") void safeLogout.run();
    setPendingAction(null);
  };

  const handleAddMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !missionTitle.trim()) return;
    const title = missionTitle.trim();
    const desc = missionDesc.trim();
    const points = Number(missionPoints) || 150;
    const target = targetUserProfile;
    ask({
      title: `Kirim misi ke ${target.display_name}?`,
      description: "Misi langsung muncul di daftar misi pengguna.",
      rows: [
        { label: "Judul", to: title },
        { label: "Penerima", to: `${target.display_name} (@${target.username})` },
        { label: "Hadiah", to: `${points.toLocaleString("id-ID")} poin` },
      ],
      confirmLabel: "Ya, Kirim Misi",
      run: async () => {
        soundEffects.comboFanfare();
        fireCozyConfetti("normal");
        addCustomMission({
          title,
          description: desc,
          mission_type: "saving_challenge",
          target_value: 1,
          reward_points: points,
          reward_xp: 120,
          targetUserId: target.id,
        });
        return { ok: true, message: "Misi terkirim." };
      },
    });
  };

  return (
    <div className="min-h-screen text-[#3D352E] pb-16 overflow-x-hidden">
      <PageTransitionLoader />
      {safeLogout.overlay}
      <GamificationFX />
      <FloatingRewardBanner />

      {/* Konfirmasi keluar ke halaman login (aksi data lain memakai AdminActionModal) */}
      <CozyConfirmModal
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={executePendingConfirm}
        title="Keluar ke Halaman Login?"
        description="Anda akan kembali ke layar Login Kredensial."
        confirmLabel="Ya, Lanjutkan!"
        confirmVariant="peach"
        mochiStage={5}
        mochiMood="proud_combo"
        badgeText="Konfirmasi Admin"
      />

      {/* Top Sticky Admin Command Bar & Role View Switcher */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/92 backdrop-blur-md border-b-2 border-[#E6DFD2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <BukuDompetLogo
              variant="mark"
              size="sm"
              className="sm:hidden w-10 h-10 shrink-0"
            />
            <BukuDompetLogo
              variant="full"
              size="sm"
              className="hidden sm:block h-10 w-auto shrink-0"
            />
          </div>

          {/* Instant Role View Switcher + BGM Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                toggleBgm();
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border-2 border-b-[4px] text-xs font-display font-extrabold flex items-center gap-1.5 cursor-pointer transition-all",
                isBgmPlaying
                  ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070] text-[#2E6F00]"
                  : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] text-[#7A6E65]"
              )}
              title="Nyalakan / Matikan Musik Latar Cozy"
            >
              {isBgmPlaying ? (
                <Volume2 className="w-4 h-4 text-[#2E6F00]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#7A6E65]" />
              )}
              <span className="hidden sm:inline">
                Musik: {isBgmPlaying ? "Nyala" : "Senyap"}
              </span>
            </button>
            <Link
              href="/app"
              onClick={() => {
                soundEffects.tactileClick();
                switchRoleDirect(targetUserProfile.role, targetUserProfile.id);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-1.5 hover:bg-white transition-colors text-[#3D352E]"
            >
              <CozyIcon name="home_path" size={18} />
              <span className="hidden sm:inline">User View</span>
            </Link>
            <Link
              href="/supervisor"
              onClick={() => {
                soundEffects.tactileClick();
                if (activeSelectedSupervisor) {
                  switchRoleDirect("supervisor", activeSelectedSupervisor.id);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] text-xs font-display font-extrabold flex items-center gap-1.5 hover:bg-white transition-colors text-[#3D352E]"
            >
              <CozyIcon name="parent_heart" size={18} />
              <span className="hidden sm:inline">Supervisor</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setPendingAction({ type: "exit_login" });
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FFF2F0] hover:bg-[#FFEAE6] border-2 border-[#FFCDC6] border-b-[4px] border-b-[#FFA89C] text-xs font-display font-extrabold flex items-center gap-1 cursor-pointer text-[#C83E2B]"
            >
              <CozyIcon name="lock_cozy" size={16} /> Login
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6 min-w-0 max-w-full overflow-hidden">
        <AdminOverview
          profiles={profiles}
          pendingCashouts={pendingRedemptions.length}
          assignments={supervisorAssignments.length}
        />

        {/* Kelola Akun (CRUD) */}
        <div id="admin-akun" className="scroll-mt-20">
          <AccountManager profiles={profiles} />
        </div>

        {/* ============================================================
            SECTION BARU WAJIB (TUGAS 1.3):
            MANAJEMEN PENGGUNA & PENUGASAN SUPERVISOR
           ============================================================ */}
        <div id="admin-penugasan" className="scroll-mt-20">
        <CozyCard tone="white" className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-[#E6DFD2] pb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Users className="w-7 h-7 text-[#1565C0] shrink-0" />
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                  Manajemen Pengguna & Penugasan Supervisor (RBAC)
                </h2>
                <p className="text-xs font-bold text-[#7A6E65]">
                  Pendaftaran akun baru hanya dapat dilakukan oleh Admin di sini.
                  Atur juga siapa memantau siapa pada matriks di sebelah kanan!
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E]">
              {supervisorAssignments.length} Relasi Penugasan Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* SUB-PANEL 1: FORM TAMBAH PENGGUNA BARU (REGISTER) */}
            <div className="lg:col-span-6 p-4 rounded-3xl bg-[#F7F3EB] border-2 border-[#E6DFD2] space-y-3.5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2E6F00]" />
                <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                  1. Form Tambah Pengguna Baru (Register)
                </h3>
              </div>

              <form onSubmit={handleRegisterAccount} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                      Nama Tampilan
                    </label>
                    <input
                      type="text"
                      required
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="Cth: Adik Dito (SMP)"
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none focus:border-[#38B6FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                      Username Login
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Cth: dito"
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none focus:border-[#38B6FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                      PIN (4 angka)
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      value={newPinCode}
                      onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="4 angka, cth: 1414"
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display text-xs sm:text-sm font-extrabold text-[#3D352E] focus:outline-none focus:border-[#38B6FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                      Role Akun
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => {
                        const next = e.target.value as UserRole;
                        setNewRole(next);
                        // Uang saku Anak SD jauh lebih kecil daripada pengguna dewasa.
                        if (next === "schoolchild") {
                          setNewBudgetTarget("150000");
                          setNewSavingTarget("30000");
                        } else if (next === "user") {
                          setNewBudgetTarget("1500000");
                          setNewSavingTarget("300000");
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display text-xs sm:text-sm font-extrabold text-[#3D352E] focus:outline-none"
                    >
                      <option value="user">User (Penabung / Anak)</option>
                      <option value="schoolchild">
                        Anak SD (Kelas 3 • Jurnal Cerita)
                      </option>
                      <option value="supervisor">
                        Supervisor (Orang Tua / Wali)
                      </option>
                      <option value="admin">Admin (Pengelola Utama)</option>
                    </select>
                  </div>
                </div>

                {isChildRole(newRole) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                        Target Budget Bulanan Awal (Rp)
                      </label>
                      <input
                        type="number"
                        value={newBudgetTarget}
                        onChange={(e) => setNewBudgetTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display tabular-nums text-xs sm:text-sm font-extrabold text-[#3D352E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                        Target Tabungan Wajib Awal (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newSavingTarget}
                        onChange={(e) => setNewSavingTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display tabular-nums text-xs sm:text-sm font-extrabold text-[#3D352E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                        Nama Pet Awal
                      </label>
                      <input
                        type="text"
                        value={newPetName}
                        onChange={(e) => setNewPetName(e.target.value)}
                        placeholder="Mochi"
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display text-xs sm:text-sm font-extrabold text-[#3D352E]"
                      />
                    </div>
                  </div>
                )}

                {isChildRole(newRole) && supervisorProfiles.length > 0 && (
                  <div>
                    <label
                      htmlFor="new-account-supervisor"
                      className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1"
                    >
                      Supervisor Pemantau
                    </label>
                    <select
                      id="new-account-supervisor"
                      value={newSupervisorId || supervisorProfiles[0].id}
                      onChange={(e) => setNewSupervisorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display text-xs sm:text-sm font-extrabold text-[#3D352E] focus:outline-none"
                    >
                      {supervisorProfiles.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {registerFeedback && (
                  <div
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-extrabold",
                      registerFeedback.success
                        ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                        : "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
                    )}
                  >
                    {registerFeedback.message}
                  </div>
                )}

                <TactileButton
                  type="submit"
                  variant="matcha"
                  size="md"
                  fullWidth
                  disabled={busy}
                >
                  <UserPlus className="w-4 h-4" />
                  {busy ? "Memproses…" : "Daftarkan Akun Baru Sekarang"}
                </TactileButton>
              </form>

            </div>

            {/* SUB-PANEL 2: MATRIKS PENUGASAN SUPERVISOR (ASSIGN MONITORING) */}
            <div className="lg:col-span-6 p-4 rounded-3xl bg-[#F7F3EB] border-2 border-[#E6DFD2] space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1565C0]" />
                  <h3 className="font-display text-base font-extrabold text-[#3D352E]">
                    2. Matriks Penugasan Supervisor
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-[#7A6E65]">
                  Klik untuk centang / lepas akses pantau
                </span>
              </div>

              {activeSelectedSupervisor ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                      Pilih Akun Supervisor yang Akan Diatur:
                    </label>
                    <select
                      value={activeSelectedSupervisor.id}
                      onChange={(e) => {
                        soundEffects.tactileClick();
                        setSelectedSupervisorId(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#E6DFD2] bg-white font-display text-xs sm:text-sm font-extrabold text-[#3D352E] focus:outline-none"
                    >
                      {supervisorProfiles.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.display_name} (Username: @{sup.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-display font-extrabold text-[#3D352E]">
                      Centang Akun User yang Boleh Dipantau oleh{" "}
                      <span className="text-[#1565C0]">
                        {activeSelectedSupervisor.display_name}
                      </span>
                      :
                    </p>

                    <div className="space-y-2 max-h-[230px] overflow-y-auto pr-1">
                      {userProfiles.map((usr) => {
                        const isAssigned = supervisorAssignments.some(
                          (a) =>
                            a.supervisorId === activeSelectedSupervisor.id &&
                            a.userId === usr.id
                        );
                        return (
                          <button
                            key={usr.id}
                            type="button"
                            onClick={() => {
                              soundEffects.tactileClick();
                              askToggleAssignment(activeSelectedSupervisor, usr, isAssigned);
                            }}
                            className={cn(
                              "w-full p-3 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all cursor-pointer",
                              isAssigned
                                ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[4px] border-b-[#9EE070]"
                                : "bg-white border-[#E6DFD2] hover:bg-[#FFFDF9]"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isAssigned ? (
                                <CheckSquare className="w-5 h-5 text-[#2E6F00] shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-[#7A6E65] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-display text-xs sm:text-sm font-extrabold text-[#3D352E] truncate">
                                  {usr.role === "schoolchild" ? <GlyphInline name="backpack" className="mr-1" /> : null}
                                  {usr.display_name}{" "}
                                  <span className="text-[#7A6E65] font-bold">
                                    (@{usr.username})
                                  </span>
                                </p>
                                <p className="text-[11px] font-bold text-[#7A6E65] break-words">
                                  Pet: {usr.petCustomName || "Mochi"} • Fase #
                                  {usr.currentStage || 1} (
                                  {GROWTH_STAGE_META[usr.currentStage || 1].name})
                                </p>
                              </div>
                            </div>

                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-[10px] font-display font-extrabold shrink-0",
                                isAssigned
                                  ? "bg-white border border-[#C3EFA4] text-[#2E6F00]"
                                  : "bg-[#F7F3EB] border border-[#E6DFD2] text-[#7A6E65]"
                              )}
                            >
                              {isAssigned ? "Dipantau" : "Tidak Dipantau"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-[#7A6E65]">
                  Belum ada akun Supervisor. Tambahkan akun dengan role
                  Supervisor di sebelah kiri.
                </p>
              )}
            </div>
          </div>
        </CozyCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
          {/* 2. Approval Pencairan Poin (Neutral White Card) */}
          <div id="admin-pencairan" className="scroll-mt-20 min-w-0">
          <CozyCard tone="white" className="space-y-4">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <CozyIcon name="rewards_ticket" size={30} />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-extrabold text-[#3D352E] truncate">
                    Antrean Approval Pencairan Poin
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Saat disetujui, otomatis membuat transaksi pemasukan{" "}
                    <em>&ldquo;Hadiah Tukar Poin Gamifikasi&rdquo;</em> di kas
                    pengguna!
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] font-display tabular-nums text-xs font-extrabold text-[#4A3500] shrink-0">
                {pendingRedemptions.length} Pending
              </span>
            </div>

            {pendingRedemptions.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#EFFBE6] border border-[#C3EFA4] text-center space-y-1">
                <p className="font-display text-base font-extrabold text-[#2E6F00]">
                  Semua Tiket Pencairan Sudah Diproses!
                </p>
                <p className="text-xs font-bold text-[#3D352E]">
                  Pengguna dapat mengajukan pencairan baru dari menu Tukar Poin.
                </p>
              </div>
            ) : (
              <div className="space-y-3 min-w-0">
                {pendingRedemptions.map((req) => {
                  const requester = profiles.find((p) => p.id === req.user_id);
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] space-y-3 min-w-0 overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <span className="px-2 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold uppercase text-[#4A3500]">
                            Pemohon:{" "}
                            {requester ? requester.display_name : "User"}
                          </span>
                          <p className="font-display text-xl font-extrabold tabular-nums text-[#4A3500] mt-1 flex flex-wrap items-center gap-1.5 break-words">
                            <CozyIcon name="coin_rupiah" size={24} />
                            <span>{formatRupiah(req.rupiah_value)}</span>{" "}
                            <span className="text-xs text-[#7A6E65] shrink-0">
                              ({req.points_redeemed.toLocaleString("id-ID")}{" "}
                              Poin)
                            </span>
                          </p>
                          <p className="text-xs font-bold text-[#3D352E] mt-1">
                            Catatan: &ldquo;{req.note}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <TactileButton
                          variant="matcha"
                          size="sm"
                          onClick={() => askCashout(req, "approved")}
                        >
                          <CozyIcon name="check_badge" size={18} />
                          Setujui ({formatCompactRupiah(req.rupiah_value)})
                        </TactileButton>
                        <TactileButton
                          variant="peach"
                          size="sm"
                          onClick={() => askCashout(req, "rejected")}
                        >
                          Tolak & Kembalikan Poin
                        </TactileButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Approved / Rejected History (Bounded List Pattern: Max 5 visible) */}
            <div className="pt-2 space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-extrabold text-[#7A6E65] uppercase">
                  Riwayat Pencairan Sebelumnya
                </h3>
                <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                  {historyRedemptions.length} Riwayat
                </span>
              </div>
              {visibleHistoryRedemptions.map((item) => {
                const requester = profiles.find((p) => p.id === item.user_id);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center justify-between gap-2 text-xs font-bold min-w-0 overflow-hidden"
                  >
                    <div className="min-w-0">
                      <p className="font-display font-extrabold tabular-nums text-[#3D352E] truncate">
                        {formatRupiah(item.rupiah_value)} (
                        {item.points_redeemed} Poin) —{" "}
                        {requester?.display_name || "User"}
                      </p>
                      <p className="text-[#7A6E65] truncate">{item.note}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl border font-display font-extrabold inline-flex items-center gap-1 shrink-0 ${
                        item.status === "approved"
                          ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                          : "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
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
                );
              })}
              {historyRedemptions.length > 5 && (
                <TactileButton
                  variant="cream"
                  size="sm"
                  fullWidth
                  onClick={() => setShowAllHistory((prev) => !prev)}
                >
                  {showAllHistory
                    ? <>Sembunyikan Sebagian <ChevronUp className="w-4 h-4" aria-hidden="true" /></>
                    : <>Lihat Semua ({historyRedemptions.length} Riwayat) <ChevronDown className="w-4 h-4" aria-hidden="true" /></>}
                </TactileButton>
              )}
            </div>
          </CozyCard>
          </div>

          {/* 3. Budget & Challenge Configurator (Neutral White Cards) */}
          <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
            <CozyCard tone="white" className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CozyIcon name="cat_saving" size={28} />
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-extrabold text-[#3D352E] truncate">
                      Pengaturan Target Budget & Tabungan
                    </h2>
                    <p className="text-xs font-bold text-[#7A6E65]">
                      Pilih pengguna dan sesuaikan jatah bulanan serta target
                      tabungannya
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                  Pilih Akun User:
                </label>
                <select
                  value={targetUserProfile.id}
                  onChange={(e) => setSelectedTargetUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-[#F7F3EB] font-display text-xs sm:text-sm font-extrabold text-[#3D352E]"
                >
                  {userProfiles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name} (@{u.username}) — Saldo:{" "}
                      {u.points_balance} Poin
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
                  <p className="text-[11px] font-display font-extrabold uppercase text-[#7A6E65]">Jatah Bulanan Saat Ini</p>
                  <p className="font-display text-base font-extrabold tabular-nums text-[#3D352E]">
                    {formatRupiah(targetUserProfile.monthly_budget_target)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] min-w-0">
                  <p className="text-[11px] font-display font-extrabold uppercase text-[#7A6E65]">Tabungan Wajib Saat Ini</p>
                  <p className="font-display text-base font-extrabold tabular-nums text-[#3D352E]">
                    {formatRupiah(targetUserProfile.monthly_saving_target)}
                  </p>
                </div>
              </div>

              <p className="p-3 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] text-xs font-bold text-[#8A6A00] leading-relaxed">
                Admin hanya menetapkan nilai awal saat membuat akun. Perubahan anggaran, tabungan wajib, tanggal mulai
                siklus, dan kebijakan sisa uang dilakukan oleh Supervisor di halaman pantau anak.
              </p>

              <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-bold flex items-center justify-between gap-2 min-w-0">
                <span className="truncate">
                  Batas Aman Harian (DSSL) {targetUserProfile.display_name}:
                </span>
                <span className="font-display font-extrabold tabular-nums text-sm text-[#2E6F00] shrink-0">
                  {formatRupiah(report.dssl)} / hari
                </span>
              </div>
            </CozyCard>

            {/* Inject Bonus Mission for Selected User (Neutral White Card) */}
            <div id="admin-misi" className="scroll-mt-20">
            <CozyCard tone="white" className="space-y-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <CozyIcon name="missions_scroll" size={26} />
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-extrabold text-[#3D352E] truncate">
                    Kirim Misi Tantangan ke {targetUserProfile.display_name}
                  </h3>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Tambahkan misi evaluasi spesial berhadiah Poin & Stage XP
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddMission} className="space-y-3 min-w-0">
                <input
                  type="text"
                  value={missionTitle}
                  onChange={(e) => setMissionTitle(e.target.value)}
                  placeholder="Judul Misi"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E6DFD2] bg-[#FFFDF9] text-xs sm:text-sm font-bold"
                />
                <input
                  type="text"
                  value={missionDesc}
                  onChange={(e) => setMissionDesc(e.target.value)}
                  placeholder="Deskripsi Misi"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E6DFD2] bg-[#FFFDF9] text-xs sm:text-sm font-bold"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                    Hadiah Poin (Rp):
                  </span>
                  <input
                    type="number"
                    value={missionPoints}
                    onChange={(e) => setMissionPoints(e.target.value)}
                    className="w-32 px-3 py-1.5 rounded-xl border-2 border-[#E6DFD2] bg-[#FFFDF9] font-display font-extrabold tabular-nums text-sm"
                  />
                </div>
                <TactileButton
                  type="submit"
                  variant="matcha"
                  size="sm"
                  fullWidth
                >
                  <CozyIcon name="plus_record" size={18} />
                  Luncurkan Misi ke {targetUserProfile.display_name}!
                </TactileButton>
              </form>
            </CozyCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

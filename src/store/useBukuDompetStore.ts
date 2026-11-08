"use client";

import { BADGE_BG_BY_ID, STARTER_BG_IDS, STARTER_TITLE_IDS, TITLE_BY_ID, journeyUnlockForDay, type BadgeUnlock } from "@/lib/badge-catalog";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BadgeId } from "@/components/illustrations/PraiseBadges";
import { BADGE_META } from "@/components/illustrations/PraiseBadges";
import type { MochiStage } from "@/components/illustrations/MochiCompanion";
import {
  type PetSpecies,
  type GrowthStage,
  type AccessorySlot,
  type AccessoryItem,
  GROWTH_STAGE_META,
  ACCESSORY_BY_ID,
  getSpeciesInfo,
} from "@/components/illustrations/PetAvatarSystem";
import {
  type TransactionRecord,
  type TransactionItem,
  validateItemizedCombo,
  getLevelFromXp,
  GROWTH_STAGE_TARGETS,
  PET_SPECIES_SHOP_PRICES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/spending-detective";
import { transactionLockReason, rewardLedgerKey, TX_TITLE_MAX } from "@/lib/transaction-rules";
import { pickPathDropItem } from "@/lib/path-drop";
import { localDateStr } from "@/lib/dates";
import { evaluateStreakContinuity, nextStreakOnRecord } from "@/lib/streak";
import {
  MAX_PAID_SHIELDS,
  SHIELD_PACK_BY_ID,
  freeShieldsFor,
  monthKeyOf,
  monthlyFreeFields,
  spendShields,
  type ShieldPackId,
} from "@/lib/streak-shields";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserRole = "user" | "supervisor" | "admin" | "schoolchild";

/** Peran yang punya Pet, Streak, Poin dan Buku Kas/Cerita sendiri (User dewasa/remaja & Anak SD). */
export function isChildRole(role: UserRole | undefined | null): boolean {
  return role === "user" || role === "schoolchild";
}

export interface SupervisorCheerSticker {
  id: string;
  fromSupervisorName: string;
  stickerLabel: string;
  message: string;
  sentAt: string;
}

export interface OwnedPetInstance {
  species: PetSpecies;
  customName: string;
  currentStage: GrowthStage;
  stageXp: number;
  stageRecordedDays: number;
  unlockedAt: string;
}

export interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  pin_code: string;
  /**
   * Versi 5.2: tanggal registrasi akun (`YYYY-MM-DD`, lokal). Menjadi "Hari ke-1" Peta Perjalanan.
   * Opsional agar data lama tetap valid; bila kosong, peta memakai catatan paling awal atau hari ini.
   */
  createdAt?: string;
  avatar_theme: string;
  xp: number;
  level: number;
  // Versi 4.0: 8 Fase Pertumbuhan Hidup (Telur Ajaib s/d Sepuh Bijaksana) & Multi-Pet Kandang
  currentStage: GrowthStage;
  stageXp: number;
  stageRecordedDays: number;
  petCustomName: string;
  activeSpecies: PetSpecies;
  unlockedSpecies: PetSpecies[];
  ownedPets: Partial<Record<PetSpecies, OwnedPetInstance>>;
  ownedAccessories: string[];
  equippedAccessories: Partial<Record<AccessorySlot, string>>;
  claimedPathMilestones: number[]; // [7, 14, 21, 28, 35, ...]
  /** Item yang dijatuhkan tiap peti (hari -> id). Opsional: klaim lama sebelum fitur ini tidak punya catatan. */
  pathMilestoneDrops?: Record<number, string>;
  /** Gelar & Latar badge (Versi 5.3). Opsional: profil lama otomatis memakai bawaan. */
  ownedTitleIds?: string[];
  ownedBadgeBgIds?: string[];
  equippedTitleId?: string;
  equippedBadgeBgId?: string;
  supervisorCheers: SupervisorCheerSticker[];
  // Economy & Streak
  points_balance: number; // 1 Poin = Rp 1
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  /** Perisai Es hasil beli (disimpan sampai terpakai, maks. 10). */
  streak_freeze_count: number;
  /** Versi 5.1: sisa perisai GRATIS bulan `free_shield_month` (jatah 3 per bulan, hangus tiap pergantian bulan). */
  free_shield_left?: number;
  free_shield_month?: string;
  last_recorded_date: string;
  last_daily_claim_date?: string;
  monthly_budget_target: number;
  monthly_saving_target: number;
  /** Versi 5.0: Mode Streak Padam. true = streak putus, seluruh aplikasi bersuasana dingin. */
  isColdStreakMode?: boolean;
  /** Tanggal terakhir streak menjadi 0 (untuk pesan pengingat). */
  coldSince?: string;
  /** Tanggal terakhir evaluasi streak dijalankan (cegah evaluasi ganda dalam sehari). */
  lastStreakCheckDate?: string;
  /** Hanya dipakai tombol uji "Streak Padam": streak sebelum diuji, dipulihkan saat dihangatkan lagi. */
  streakBeforeCold?: number;
}

export interface SupervisorAssignment {
  supervisorId: string;
  userId: string;
}

export interface MissionRecord {
  id: string;
  user_id: string;
  mission_type: "daily" | "weekly" | "saving_challenge" | "budget_challenge";
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  reward_points: number;
  reward_xp: number;
  is_claimed: boolean;
  valid_until: string;
}

export interface UserBadgeRecord {
  id: string;
  user_id: string;
  badge_code: BadgeId;
  badge_name: string;
  praise_quote: string;
  unlocked_at: string;
}

export interface PointRedemptionRecord {
  id: string;
  user_id: string;
  points_redeemed: number;
  rupiah_value: number;
  status: "pending" | "approved" | "rejected";
  note: string;
  created_at: string;
  approved_at?: string | null;
}

export interface FloatingRewardToast {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  xp: number;
  isCombo?: boolean;
}

export interface CelebrationModalState {
  type: "level_up" | "badge_unlocked" | "milestone";
  title: string;
  subtitle: string;
  newLevel?: number;
  mochiStage?: MochiStage;
  badgeId?: BadgeId;
  rewardPoints?: number;
}

export interface UnboxedAccessoryDropState {
  item: AccessoryItem;
  milestoneDay: number;
  points: number;
  xp: number;
  /** Gelar & Latar bonus dari peti ini (Versi 5.3). */
  newTitleIds?: string[];
  newBgIds?: string[];
}

function getRelativeDateStr(daysOffset: number): string {
  // Zona waktu lokal (bukan UTC) agar pergantian hari tepat tengah malam waktu pengguna.
  return localDateStr(daysOffset);
}

/**
 * Versi 5.4 — GO LIVE. Seluruh data demo (akun contoh, transaksi, misi, lencana, penukaran) sudah dihapus.
 * Yang tersisa hanyalah 12 akun keluarga asli di bawah ini. ID bersifat tetap (deterministik) agar
 * `supabase/migrations/004_v5_4_go_live.sql` memakai ID yang sama persis dengan aplikasi.
 *
 * Kunci masuk = `username` (unik) + PIN. Nama yang sama (mis. "Ekal") dipakai beberapa peran, maka
 * halaman Login menampilkan pilihan peran saat satu nama cocok dengan lebih dari satu akun.
 */
export const POIN_AWAL_AKUN_BARU = 500;

const realId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const ADMIN_ID = realId(1); // Ekal (Admin)
export const SUPERVISOR_BUNDA_ID = realId(2);
export const SUPERVISOR_AYAH_ID = realId(3);
export const USER_BUNDA_ID = realId(4);
export const USER_AYAH_ID = realId(5);
export const USER_TIARA_ID = realId(6);
export const SCHOOLCHILD_AIRA_ID = realId(7);
export const USER_EKAL_ID = realId(8);
export const USER_TANIA_ID = realId(9);
export const USER_SOFIA_ID = realId(10);
export const SCHOOLCHILD_EKAL_ID = realId(11);
export const SUPERVISOR_EKAL_ID = realId(12);

/**
 * Pemetaan pengawasan.
 * - Ayah & Bunda (Supervisor) -> Ayah, Bunda, Tiara, Aira, Tania, dan kedua akun bernama "Ekal"
 *   (User & Anak SD).
 * - Ekal (Supervisor) -> Sofia, Ekal (User), dan Ekal (Anak SD).
 */
const AWASI_ORANG_TUA: string[] = [
  USER_AYAH_ID,
  USER_BUNDA_ID,
  USER_TIARA_ID,
  SCHOOLCHILD_AIRA_ID,
  USER_TANIA_ID,
  USER_EKAL_ID,
  SCHOOLCHILD_EKAL_ID,
];
const AWASI_EKAL: string[] = [USER_SOFIA_ID, USER_EKAL_ID, SCHOOLCHILD_EKAL_ID];

export const INITIAL_SUPERVISOR_ASSIGNMENTS: SupervisorAssignment[] = [
  ...AWASI_ORANG_TUA.map((userId) => ({ supervisorId: SUPERVISOR_BUNDA_ID, userId })),
  ...AWASI_ORANG_TUA.map((userId) => ({ supervisorId: SUPERVISOR_AYAH_ID, userId })),
  ...AWASI_EKAL.map((userId) => ({ supervisorId: SUPERVISOR_EKAL_ID, userId })),
];

/** Profil baru yang bersih: Fase 1 (Telur Ajaib), tanpa riwayat apa pun. */
function buildRealProfile(spec: {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  pin_code: string;
}): ProfileData {
  const isKid = spec.role === "schoolchild";
  const isPlayer = spec.role === "user" || isKid;
  const budget = isKid ? 150000 : 1500000;
  const today = getRelativeDateStr(0);
  return {
    id: spec.id,
    username: spec.username,
    display_name: spec.display_name,
    role: spec.role,
    pin_code: spec.pin_code,
    createdAt: today,
    avatar_theme: spec.role === "admin" ? "mochi-boss" : spec.role === "supervisor" ? "mochi-parent" : "mochi-cat",
    xp: 0,
    level: 1,
    currentStage: 1,
    stageXp: 0,
    stageRecordedDays: 0,
    petCustomName: "Mochi",
    activeSpecies: "chubby_cat",
    unlockedSpecies: ["chubby_cat"],
    ownedPets: {
      chubby_cat: {
        species: "chubby_cat",
        customName: "Mochi",
        currentStage: 1,
        stageXp: 0,
        stageRecordedDays: 0,
        unlockedAt: today,
      },
    },
    ownedAccessories: isPlayer ? ["head_straw_hat", "bg_warm_room"] : [],
    equippedAccessories: {},
    claimedPathMilestones: [],
    supervisorCheers: [],
    points_balance: isPlayer ? POIN_AWAL_AKUN_BARU : 0,
    lifetime_points: isPlayer ? POIN_AWAL_AKUN_BARU : 0,
    current_streak: 0,
    longest_streak: 0,
    streak_freeze_count: isPlayer ? 1 : 0,
    // Kemarin: catatan pertama hari ini langsung menyambung menjadi streak 1 (lihat evaluator streak).
    last_recorded_date: getRelativeDateStr(-1),
    monthly_budget_target: budget,
    monthly_saving_target: Math.round(budget * 0.2),
  };
}

export const INITIAL_PROFILES: ProfileData[] = [
  buildRealProfile({ id: ADMIN_ID, username: "ekal_admin", display_name: "Ekal (Admin)", role: "admin", pin_code: "0000" }),
  buildRealProfile({ id: SUPERVISOR_BUNDA_ID, username: "bunda_sv", display_name: "Bunda (Supervisor)", role: "supervisor", pin_code: "1111" }),
  buildRealProfile({ id: SUPERVISOR_AYAH_ID, username: "ayah_sv", display_name: "Ayah (Supervisor)", role: "supervisor", pin_code: "1111" }),
  buildRealProfile({ id: USER_BUNDA_ID, username: "bunda", display_name: "Bunda", role: "user", pin_code: "2222" }),
  buildRealProfile({ id: USER_AYAH_ID, username: "ayah", display_name: "Ayah", role: "user", pin_code: "2222" }),
  buildRealProfile({ id: USER_TIARA_ID, username: "tiara", display_name: "Tiara", role: "user", pin_code: "1111" }),
  buildRealProfile({ id: SCHOOLCHILD_AIRA_ID, username: "aira", display_name: "Aira", role: "schoolchild", pin_code: "1111" }),
  buildRealProfile({ id: USER_EKAL_ID, username: "ekal", display_name: "Ekal", role: "user", pin_code: "1111" }),
  buildRealProfile({ id: USER_TANIA_ID, username: "tania", display_name: "Tania", role: "user", pin_code: "1111" }),
  buildRealProfile({ id: USER_SOFIA_ID, username: "sofia", display_name: "Sofia", role: "user", pin_code: "1111" }),
  buildRealProfile({ id: SCHOOLCHILD_EKAL_ID, username: "ekal_sd", display_name: "Ekal (Anak SD)", role: "schoolchild", pin_code: "2222" }),
  buildRealProfile({ id: SUPERVISOR_EKAL_ID, username: "ekal_sv", display_name: "Ekal (Supervisor)", role: "supervisor", pin_code: "3333" }),
];

/* Go live: tidak ada transaksi, misi, lencana, atau penukaran contoh. */
export const INITIAL_TRANSACTIONS: TransactionRecord[] = [];
export const INITIAL_MISSIONS: MissionRecord[] = [];
export const INITIAL_BADGES: UserBadgeRecord[] = [];
export const INITIAL_REDEMPTIONS: PointRedemptionRecord[] = [];

/**
 * Helper: Evaluasi kenaikan Fase Pertumbuhan (Stage 1..8) untuk Pet Aktif
 * dengan mekanisme RESET Stage XP & Hari Mencatat di setiap Fase baru!
 */
function evaluateGrowthProgression(
  profile: ProfileData,
  addedStageXp: number,
  addedRecordedDays: number
): {
  nextStage: GrowthStage;
  nextStageXp: number;
  nextStageDays: number;
  nextOwnedPets: Partial<Record<PetSpecies, OwnedPetInstance>>;
  promoted: boolean;
} {
  const activeSp = profile.activeSpecies || "chubby_cat";
  const existingInstance = profile.ownedPets?.[activeSp];

  let stage: GrowthStage =
    existingInstance?.currentStage || profile.currentStage || 1;
  let sXp = (existingInstance?.stageXp ?? profile.stageXp ?? 0) + addedStageXp;
  let sDays =
    (existingInstance?.stageRecordedDays ?? profile.stageRecordedDays ?? 0) +
    addedRecordedDays;
  let promoted = false;

  if (stage < 8) {
    const req = GROWTH_STAGE_TARGETS[stage];
    if (sXp >= req.nextStageXpTarget && sDays >= req.nextStageDaysTarget) {
      stage = (stage + 1) as GrowthStage;
      // RESET Stage XP & Stage Recorded Days kembali ke 0 di setiap Fase baru!
      sXp = 0;
      sDays = 0;
      promoted = true;
    }
  }

  const updatedInstance: OwnedPetInstance = {
    species: activeSp,
    customName:
      existingInstance?.customName ||
      profile.petCustomName ||
      getSpeciesInfo(activeSp).defaultName,
    currentStage: stage,
    stageXp: sXp,
    stageRecordedDays: sDays,
    unlockedAt: existingInstance?.unlockedAt || getRelativeDateStr(0),
  };

  return {
    nextStage: stage,
    nextStageXp: sXp,
    nextStageDays: sDays,
    nextOwnedPets: {
      ...(profile.ownedPets || {}),
      [activeSp]: updatedInstance,
    },
    promoted,
  };
}

/**
 * Terapkan hadiah (Poin + Stage XP) ke satu profil secara murni.
 * `continueStreak` menyambung streak hanya jika hari ini belum tercatat; hasilnya juga
 * mematikan Mode Streak Padam karena pengguna sudah kembali mencatat.
 */
function applyRewardToProfile(
  prof: ProfileData,
  points: number,
  xp: number,
  continueStreak: boolean,
  today: string
): {
  next: ProfileData;
  promoted: boolean;
  newStreak: number;
  newLevel: number;
  nextStage: GrowthStage;
} {
  let newStreak = prof.current_streak;
  let addedDays = 0;
  let lastRecorded = prof.last_recorded_date;
  let continued = false;

  if (continueStreak && prof.last_recorded_date !== today) {
    newStreak = nextStreakOnRecord(
      prof.last_recorded_date,
      prof.current_streak,
      today
    );
    addedDays = 1;
    lastRecorded = today;
    continued = true;
  }

  const newXp = prof.xp + xp;
  const { level: newLevel } = getLevelFromXp(newXp);
  const growth = evaluateGrowthProgression(prof, xp, addedDays);

  const next: ProfileData = {
    ...prof,
    xp: newXp,
    level: newLevel,
    currentStage: growth.nextStage,
    stageXp: growth.nextStageXp,
    stageRecordedDays: growth.nextStageDays,
    ownedPets: growth.nextOwnedPets,
    points_balance: prof.points_balance + points,
    lifetime_points: prof.lifetime_points + Math.max(0, points),
    current_streak: newStreak,
    longest_streak: Math.max(prof.longest_streak, newStreak),
    last_recorded_date: lastRecorded,
    isColdStreakMode: continued ? false : prof.isColdStreakMode,
    coldSince: continued ? undefined : prof.coldSince,
    streakBeforeCold: continued ? undefined : prof.streakBeforeCold,
  };

  return {
    next,
    promoted: growth.promoted,
    newStreak,
    newLevel,
    nextStage: growth.nextStage,
  };
}

interface BukuDompetState {
  // Active Session Role & Multi-User Context
  currentRole: UserRole;
  activeProfileId: string;
  monitoredUserId: string;

  // Data Entities
  profiles: ProfileData[];
  supervisorAssignments: SupervisorAssignment[];
  transactions: TransactionRecord[];
  missions: MissionRecord[];
  badges: UserBadgeRecord[];
  redemptions: PointRedemptionRecord[];

  // Gamification & UI State
  equippedMochiStage: MochiStage | null;
  equippedTitle: string;
  streakFreezeDates: string[];
  zeroSpendDates: string[];
  mysteryBoxCount: number;
  openedCheckpointWeeks: number[];
  isProudComboActive: boolean;
  lastSupervisorCheerDate: string | null;
  supervisorCheersCount: number;

  // Modals & Drawers
  isTransactionDrawerOpen: boolean;
  isCashoutModalOpen: boolean;
  isStreakCalendarOpen: boolean;
  /** Versi 5.0: modal Tulis Cerita (Anak SD) & Catat Tabungan. */
  isStoryModalOpen: boolean;
  isSavingsModalOpen: boolean;
  unboxedAccessoryDrop: UnboxedAccessoryDropState | null;

  // FX & Celebrations
  rewardToast: FloatingRewardToast | null;
  particleBurstKey: number;
  particleBurstType: "coin" | "xp" | "both";
  celebrationModal: CelebrationModalState | null;
  supabaseConnected: boolean;

  // Versi 5.0: sesi permanen, kartu profil tersimpan, dan overlay loading global
  /** Sesi permanen: tetap true sampai pengguna menekan Keluar. Disimpan di localStorage. */
  isLoggedIn: boolean;
  /** Versi 5.1: Supervisor sudah memilih anak yang dipantau pada sesi masuk ini (false setiap login baru). */
  supervisorChildChosen: boolean;
  /** Daftar ID akun yang pernah masuk di perangkat ini (Kartu Profil Tersimpan). */
  savedProfileIds: string[];
  /** Overlay loading global; dinyalakan saat onClick, bukan saat halaman selesai dimuat. */
  isActionLoading: boolean;

  // Auth & Multi-User RBAC Actions
  loginWithCredentials: (
    username: string,
    pin: string
  ) => {
    success: boolean;
    role?: UserRole;
    targetPath?: string;
    message?: string;
  };
  loginWithPin: (
    role: UserRole,
    pin: string
  ) => { success: boolean; message?: string };
  switchRoleDirect: (role: UserRole, profileId?: string) => void;
  setMonitoredUserId: (userId: string) => void;
  /** Versi 5.1: pilih anak yang dipantau dari halaman "Pilih Anak" Supervisor. */
  chooseMonitoredChild: (userId: string) => void;
  /** Keluar dari sesi (kartu profil tersimpan tetap ada). */
  logout: () => void;
  /** Lupakan kartu profil dari perangkat ini. */
  forgetSavedProfile: (profileId: string) => void;
  /** Nyalakan overlay loading seketika (dipanggil di onClick). `autoHideMs` menjadi pengaman. */
  triggerActionLoading: (autoHideMs?: number) => void;
  clearActionLoading: () => void;

  // Versi 5.0: Streak ketat & Mode Streak Padam
  /** Evaluasi semua profil anak/user terhadap tanggal hari ini. Idempoten per hari. */
  runStreakEvaluation: () => void;
  /**
   * Beri hadiah generik (Poin + Stage XP) ke profil, opsional sekaligus menyambung streak.
   * Dipakai Cerita Harian, Arcade, Misi Katalog, Tabungan, dan Hadiah Poin dari keluarga.
   */
  awardReward: (payload: {
    profileId?: string;
    points: number;
    xp: number;
    title: string;
    subtitle?: string;
    continueStreak?: boolean;
    isCombo?: boolean;
  }) => { promoted: boolean; newStreak: number };
  /** Pindahkan Poin dari satu profil ke profil lain (Hadiah Poin di Beranda Keluarga). */
  transferPoints: (
    fromProfileId: string,
    toProfileId: string,
    points: number
  ) => { success: boolean; message: string };
  /** Catat setoran tabungan sebagai transaksi `saving` (bukan pengeluaran). */
  addSavingDeposit: (payload: {
    profileId?: string;
    amount: number;
    goalName: string;
    category: string;
  }) => {
    success: boolean;
    message: string;
    pointsEarned: number;
    xpEarned: number;
  };

  // Admin Account Management & Supervisor Assignment Actions
  registerNewAccount: (payload: {
    displayName: string;
    username: string;
    pinCode: string;
    role: UserRole;
    monthlyBudgetTarget?: number;
    monthlySavingTarget?: number;
    petCustomName?: string;
    /** Untuk peran `schoolchild`: Supervisor yang otomatis memantau akun baru ini. */
    supervisorId?: string;
  }) => { success: boolean; message: string; newProfileId?: string };
  toggleSupervisorAssignment: (supervisorId: string, userId: string) => void;

  // UI Modal Actions
  setTransactionDrawerOpen: (open: boolean) => void;
  setCashoutModalOpen: (open: boolean) => void;
  setStreakCalendarOpen: (open: boolean) => void;
  setStoryModalOpen: (open: boolean) => void;
  setSavingsModalOpen: (open: boolean) => void;
  closeUnboxedAccessoryModal: () => void;
  clearRewardToast: () => void;
  closeCelebrationModal: () => void;
  triggerParticleBurst: (type?: "coin" | "xp" | "both") => void;

  // Pet Customization, Boutique Shop & Evolution Actions
  renamePet: (newName: string) => { success: boolean; message: string };
  equipPetSpecies: (species: PetSpecies) => void;
  buyPetSpecies: (species: PetSpecies) => {
    success: boolean;
    message: string;
  };
  buyAccessory: (accessoryId: string) => {
    success: boolean;
    message: string;
  };
  toggleEquipAccessory: (accessoryId: string) => void;
  equipAccessoryDirect: (accessoryId: string) => void;
  claimPathMilestoneDrop: (milestoneDay: number) => {
    success: boolean;
    droppedItem?: AccessoryItem;
    droppedAccessoryName?: string;
    points: number;
    xp: number;
    message: string;
  };
  equipMochiStage: (stage: MochiStage | null) => void;
  equipSpecialTitle: (title: string) => void;
  /** Gelar & Latar badge (Versi 5.3). */
  buyBadgeItem: (kind: "title" | "bg", id: string) => { success: boolean; message: string };
  equipBadge: (profileId: string, pick: { titleId?: string; bgId?: string }) => { success: boolean; message: string };
  /** Buka gelar/latar sekaligus (hadiah Peti/Medali). Mengembalikan yang benar-benar baru. */
  unlockBadgeItems: (profileId: string, unlock: BadgeUnlock) => { titleIds: string[]; bgIds: string[] };
  petMochiForAffection: () => { xpEarned: number; leveledUp: boolean };
  buyStreakFreezeShield: (packId?: ShieldPackId) => { success: boolean; message: string };

  // Core Gamification & Cashbook Actions
  addTransaction: (payload: {
    type: "income" | "expense";
    category: string;
    need_or_want: "need" | "want" | "income";
    title: string;
    total_amount: number;
    transaction_date?: string;
    items?: { item_name: string; quantity: number; unit_price: number }[];
  }) => {
    pointsEarned: number;
    xpEarned: number;
    isCombo: boolean;
    dailyCapReached: boolean;
  };

  /** Versi 5.4: ubah catatan HARI INI milik sendiri. Poin & XP yang sudah didapat tidak berubah. */
  updateTransaction: (
    id: string,
    patch: { title: string; category: string; total_amount?: number }
  ) => { success: boolean; message: string };
  /** Versi 5.4: hapus catatan HARI INI milik sendiri. Poin & XP tidak ditarik, kuota 3 transaksi berpoin tetap terhitung. */
  removeTransaction: (id: string) => { success: boolean; message: string };
  /** Jumlah transaksi berpoin yang sudah dihapus per `userId:tanggal` (agar kuota harian tidak bisa dicurangi). */
  deletedRewardLedger: Record<string, number>;

  recordZeroSpendDay: () => {
    alreadyRecorded: boolean;
    pointsEarned: number;
    xpEarned: number;
  };

  claimMissionReward: (missionId: string) => {
    success: boolean;
    points: number;
    xp: number;
  };

  openMysteryBox: () => {
    success: boolean;
    rewardType: "points" | "shield" | "jackpot";
    amount: number;
    label: string;
  };

  claimWeeklyCheckpointChest: (weekNumber: number) => {
    success: boolean;
    points: number;
  };

  requestPointCashout: (points: number, note: string) => {
    success: boolean;
    message: string;
  };

  approveOrRejectCashout: (
    redemptionId: string,
    action: "approved" | "rejected"
  ) => void;

  sendSupervisorCheer: (customMessage?: string) => {
    success: boolean;
    message: string;
  };

  updateBudgetSettings: (
    monthlyBudgetTarget: number,
    monthlySavingTarget: number,
    targetUserId?: string
  ) => void;

  addCustomMission: (payload: {
    title: string;
    description: string;
    mission_type: MissionRecord["mission_type"];
    target_value: number;
    reward_points: number;
    reward_xp: number;
    targetUserId?: string;
  }) => void;

  syncWithSupabaseIfAvailable: () => Promise<void>;
}

/** Token pemicu overlay loading terakhir (mencegah timer lama mematikan overlay milik klik baru). */
let loadingToken = 0;

async function trySupabaseInsert(table: string, row: Record<string, unknown>) {
  try {
    if (
      typeof window === "undefined" ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.from(table).insert(row);
  } catch {
    // Fallback gracefully to Local/Zustand state
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ubah/hapus baris transaksi di Supabase (best-effort). `patch = null` berarti hapus. */
async function trySupabaseMutate(
  tx: Pick<TransactionRecord, "id" | "user_id" | "created_at">,
  patch: Record<string, unknown> | null
) {
  try {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createSupabaseBrowserClient();
    const base = supabase.from("transactions");
    const q = patch ? base.update(patch) : base.delete();
    // Baris bawaan server punya UUID; baris buatan lokal dicocokkan lewat pemilik + waktu buat.
    await (UUID_RE.test(tx.id) ? q.eq("id", tx.id) : q.eq("user_id", tx.user_id).eq("created_at", tx.created_at));
  } catch {
    // Tetap lokal bila tabel belum dimigrasi
  }
}

function getActiveUserProfile(state: {
  currentRole: UserRole;
  activeProfileId: string;
  monitoredUserId: string;
  profiles: ProfileData[];
}): ProfileData {
  if (isChildRole(state.currentRole)) {
    const found = state.profiles.find(
      (p) => p.id === state.activeProfileId && isChildRole(p.role)
    );
    if (found) return found;
  }
  const monitored = state.profiles.find(
    (p) => p.id === state.monitoredUserId && isChildRole(p.role)
  );
  if (monitored) return monitored;
  return (
    state.profiles.find((p) => isChildRole(p.role)) ||
    INITIAL_PROFILES.find((p) => p.id === USER_EKAL_ID) ||
    INITIAL_PROFILES[0]
  );
}

/**
 * Bersihkan daftar kepemilikan & pemasangan aksesori dari ID yang tidak ada di katalog.
 * Aman dijalankan berulang (idempoten) dan tidak pernah mengubah ID yang valid.
 */
function sanitizeProfileAccessories(p: ProfileData): ProfileData {
  const owned = Array.from(
    new Set(
      (Array.isArray(p.ownedAccessories) ? p.ownedAccessories : []).filter(
        (id) => typeof id === "string" && Boolean(ACCESSORY_BY_ID[id])
      )
    )
  );
  const equipped: Partial<Record<AccessorySlot, string>> = {};
  for (const [slot, id] of Object.entries(p.equippedAccessories ?? {})) {
    const item = typeof id === "string" ? ACCESSORY_BY_ID[id] : undefined;
    if (item && item.slot === slot) equipped[item.slot] = id as string;
  }
  return { ...p, ownedAccessories: owned, equippedAccessories: equipped };
}

export const useBukuDompetStore = create<BukuDompetState>()(
  persist(
    (set, get) => ({
      currentRole: "user",
      activeProfileId: USER_EKAL_ID,
      monitoredUserId: USER_EKAL_ID,
      profiles: INITIAL_PROFILES,
      supervisorAssignments: INITIAL_SUPERVISOR_ASSIGNMENTS,
      transactions: INITIAL_TRANSACTIONS,
      missions: INITIAL_MISSIONS,
      badges: INITIAL_BADGES,
      redemptions: INITIAL_REDEMPTIONS,
      equippedMochiStage: null,
      equippedTitle: "Penabung Cerdas",
      streakFreezeDates: [getRelativeDateStr(-6), getRelativeDateStr(-9)],
      zeroSpendDates: [getRelativeDateStr(-7)],
      mysteryBoxCount: 0,
      openedCheckpointWeeks: [],
      deletedRewardLedger: {},
      isProudComboActive: false,
      lastSupervisorCheerDate: null,
      supervisorCheersCount: 1,
      isTransactionDrawerOpen: false,
      isCashoutModalOpen: false,
      isStreakCalendarOpen: false,
      isStoryModalOpen: false,
      isSavingsModalOpen: false,
      unboxedAccessoryDrop: null,
      rewardToast: null,
      particleBurstKey: 0,
      particleBurstType: "both",
      celebrationModal: null,
      supabaseConnected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      isLoggedIn: false,
      supervisorChildChosen: false,
      savedProfileIds: [],
      isActionLoading: false,

      loginWithCredentials: (username, pin) => {
        const state = get();
        const cleanUser = username.trim().toLowerCase();
        const cleanPin = pin.trim();

        const profile = state.profiles.find(
          (p) => p.username.toLowerCase() === cleanUser
        );

        if (!profile) {
          return {
            success: false,
            message:
              "Username tidak ditemukan. Periksa ejaannya atau minta Admin mendaftarkan akunmu.",
          };
        }

        if (profile.pin_code !== cleanPin) {
          return {
            success: false,
            message: "PIN / Password salah. Silakan periksa kembali.",
          };
        }

        let nextMonitoredUserId = state.monitoredUserId;
        if (isChildRole(profile.role)) {
          nextMonitoredUserId = profile.id;
        } else if (profile.role === "supervisor") {
          const assigned = state.supervisorAssignments.find(
            (a) => a.supervisorId === profile.id
          );
          if (assigned) {
            nextMonitoredUserId = assigned.userId;
          }
        }

        const targetPath =
          profile.role === "admin"
            ? "/admin"
            : profile.role === "supervisor"
            ? "/supervisor/pilih"
            : "/app";

        set({
          currentRole: profile.role,
          activeProfileId: profile.id,
          monitoredUserId: nextMonitoredUserId,
          isLoggedIn: true,
          supervisorChildChosen: false,
          savedProfileIds: Array.from(
            new Set([...state.savedProfileIds, profile.id])
          ),
        });

        return {
          success: true,
          role: profile.role,
          targetPath,
        };
      },

      loginWithPin: (role, pin) => {
        const state = get();
        const profile =
          state.profiles.find((p) => p.role === role && p.pin_code === pin) ||
          state.profiles.find((p) => p.role === role);

        if (!profile) {
          return { success: false, message: "Profil tidak ditemukan." };
        }
        if (profile.pin_code !== pin) {
          return {
            success: false,
            message: "PIN salah. Silakan periksa kembali.",
          };
        }

        let nextMonitored = state.monitoredUserId;
        if (isChildRole(profile.role)) {
          nextMonitored = profile.id;
        } else if (profile.role === "supervisor") {
          const assigned = state.supervisorAssignments.find(
            (a) => a.supervisorId === profile.id
          );
          if (assigned) nextMonitored = assigned.userId;
        }

        set({
          currentRole: profile.role,
          activeProfileId: profile.id,
          monitoredUserId: nextMonitored,
          isLoggedIn: true,
          supervisorChildChosen: false,
          savedProfileIds: Array.from(
            new Set([...state.savedProfileIds, profile.id])
          ),
        });
        return { success: true };
      },

      switchRoleDirect: (role, profileId) => {
        const state = get();
        const profile = profileId
          ? state.profiles.find((p) => p.id === profileId)
          : state.profiles.find((p) => p.role === role);

        if (profile) {
          let nextMonitored = state.monitoredUserId;
          if (isChildRole(profile.role)) {
            nextMonitored = profile.id;
          } else if (profile.role === "supervisor") {
            const assigned = state.supervisorAssignments.find(
              (a) => a.supervisorId === profile.id
            );
            if (assigned) nextMonitored = assigned.userId;
          }
          const newSupervisorSession =
            profile.role === "supervisor" &&
            (state.currentRole !== "supervisor" || state.activeProfileId !== profile.id);
          set({
            currentRole: profile.role,
            activeProfileId: profile.id,
            monitoredUserId: nextMonitored,
            isLoggedIn: true,
            supervisorChildChosen: newSupervisorSession ? false : state.supervisorChildChosen,
            savedProfileIds: Array.from(
              new Set([...state.savedProfileIds, profile.id])
            ),
          });
        }
      },

      setMonitoredUserId: (userId) => {
        set({ monitoredUserId: userId });
      },

      chooseMonitoredChild: (userId) => {
        set({ monitoredUserId: userId, supervisorChildChosen: true });
      },

      logout: () => {
        set({ isLoggedIn: false, supervisorChildChosen: false, isActionLoading: false });
      },

      forgetSavedProfile: (profileId) => {
        set((st) => ({
          savedProfileIds: st.savedProfileIds.filter((id) => id !== profileId),
        }));
      },

      triggerActionLoading: (autoHideMs = 6000) => {
        loadingToken += 1;
        const myToken = loadingToken;
        set({ isActionLoading: true });
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            // Pengaman: hanya mematikan overlay milik pemicu yang sama (bukan pemicu yang lebih baru).
            if (myToken === loadingToken && get().isActionLoading) {
              set({ isActionLoading: false });
            }
          }, autoHideMs);
        }
      },

      clearActionLoading: () => {
        loadingToken += 1;
        if (get().isActionLoading) set({ isActionLoading: false });
      },

      runStreakEvaluation: () => {
        const state = get();
        const today = getRelativeDateStr(0);
        const month = monthKeyOf(today);
        let changed = false;
        const nextProfiles = state.profiles.map((p) => {
          if (!isChildRole(p.role)) return p;
          // Awal bulan: jatah 3 perisai gratis diisi ulang (sisa bulan lalu hangus).
          let base = p;
          if (p.free_shield_month !== month) {
            base = { ...p, ...monthlyFreeFields(p, today) };
            changed = true;
          }
          if (base.lastStreakCheckDate === today) return base;
          changed = true;
          // Akun yang belum pernah mencatat apa pun belum punya streak untuk diputus: jangan
          // dinginkan. Catatan pertama kelak langsung menyambung menjadi streak 1.
          if (base.longest_streak === 0 && base.xp === 0) {
            return {
              ...base,
              last_recorded_date: getRelativeDateStr(-1),
              lastStreakCheckDate: today,
            };
          }
          const res = evaluateStreakContinuity({
            lastRecordedDate: base.last_recorded_date,
            currentStreak: base.current_streak,
            freezeCount: freeShieldsFor(base, today) + base.streak_freeze_count,
            today,
          });
          if (res.status === "ok") {
            return { ...base, lastStreakCheckDate: today };
          }
          if (res.status === "saved_by_shield") {
            return {
              ...base,
              ...spendShields(base, today, res.shieldsUsed),
              last_recorded_date: res.nextLastRecordedDate,
              lastStreakCheckDate: today,
            };
          }
          return {
            ...base,
            current_streak: 0,
            isColdStreakMode: true,
            coldSince: base.coldSince ?? today,
            lastStreakCheckDate: today,
          };
        });
        if (changed) set({ profiles: nextProfiles });
      },

      awardReward: (payload) => {
        const state = get();
        const prof = payload.profileId
          ? state.profiles.find((p) => p.id === payload.profileId)
          : getActiveUserProfile(state);
        if (!prof) return { promoted: false, newStreak: 0 };

        const today = getRelativeDateStr(0);
        const res = applyRewardToProfile(
          prof,
          payload.points,
          payload.xp,
          Boolean(payload.continueStreak),
          today
        );

        set({
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) => (p.id === prof.id ? res.next : p)),
          celebrationModal: res.promoted
            ? {
                type: "level_up",
                title: `PERTUMBUHAN NAIK! Fase ${res.nextStage}: ${
                  GROWTH_STAGE_META[res.nextStage].name
                }!`,
                subtitle: `${prof.petCustomName} tumbuh ke Fase ${
                  GROWTH_STAGE_META[res.nextStage].name
                }. Progres Stage XP & Hari Mencatat direset ke 0 untuk fase berikutnya!`,
                newLevel: res.newLevel,
                mochiStage: Math.min(5, res.nextStage) as MochiStage,
                rewardPoints: payload.points,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: payload.title,
            subtitle:
              payload.subtitle ??
              `+${payload.points} Poin & +${payload.xp} Stage XP masuk ke akunmu!`,
            points: payload.points,
            xp: payload.xp,
            isCombo: payload.isCombo,
          },
        });

        return { promoted: res.promoted, newStreak: res.newStreak };
      },

      transferPoints: (fromProfileId, toProfileId, points) => {
        const state = get();
        const amount = Math.floor(Number(points));
        if (fromProfileId === toProfileId) {
          return { success: false, message: "Tidak bisa menghadiahi diri sendiri." };
        }
        if (!(amount > 0)) {
          return { success: false, message: "Jumlah Poin harus lebih dari 0." };
        }
        const from = state.profiles.find((p) => p.id === fromProfileId);
        const to = state.profiles.find((p) => p.id === toProfileId);
        if (!from || !to) {
          return { success: false, message: "Profil tidak ditemukan." };
        }
        if (from.points_balance < amount) {
          return {
            success: false,
            message: `Poinmu belum cukup (saldo ${from.points_balance.toLocaleString("id-ID")} Poin).`,
          };
        }
        set({
          profiles: state.profiles.map((p) => {
            if (p.id === fromProfileId) {
              return { ...p, points_balance: p.points_balance - amount };
            }
            if (p.id === toProfileId) {
              return {
                ...p,
                points_balance: p.points_balance + amount,
                lifetime_points: p.lifetime_points + amount,
              };
            }
            return p;
          }),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Hadiah ${amount} Poin terkirim!`,
            subtitle: `${to.display_name} menerima hadiah darimu.`,
            points: 0,
            xp: 0,
          },
        });
        return { success: true, message: `Hadiah ${amount} Poin terkirim ke ${to.display_name}.` };
      },

      addSavingDeposit: ({ profileId, amount, goalName, category }) => {
        const state = get();
        const prof = profileId
          ? state.profiles.find((p) => p.id === profileId)
          : getActiveUserProfile(state);
        const amt = Math.round(Number(amount));
        if (!prof || !(amt > 0)) {
          return {
            success: false,
            message: "Nominal tabungan harus lebih dari Rp0.",
            pointsEarned: 0,
            xpEarned: 0,
          };
        }

        const today = getRelativeDateStr(0);
        // Setoran memakai batas harian yang sama dengan catatan kas (maks. 3 transaksi berpoin).
        const rewardedToday = state.transactions.filter(
          (t) =>
            t.user_id === prof.id &&
            t.transaction_date === today &&
            t.points_earned > 0
        ).length;
        const capped = rewardedToday >= 3;
        const points = capped ? 0 : 5;
        const xp = capped ? 0 : 10;

        const tx: TransactionRecord = {
          id: `tx-save-${Date.now()}`,
          user_id: prof.id,
          type: "saving",
          category,
          // Tabungan bukan pengeluaran: tidak pernah masuk hitungan Boros/Bengkak Inspektur Saku.
          need_or_want: "need",
          title: `Setor ke celengan: ${goalName}`,
          total_amount: amt,
          is_itemized: false,
          points_earned: points,
          xp_earned: xp,
          transaction_date: today,
          created_at: new Date().toISOString(),
          items: [],
        };

        const res = applyRewardToProfile(prof, points, xp, true, today);

        set({
          transactions: [tx, ...state.transactions],
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "coin",
          profiles: state.profiles.map((p) => (p.id === prof.id ? res.next : p)),
          celebrationModal: res.promoted
            ? {
                type: "level_up",
                title: `PERTUMBUHAN NAIK! Fase ${res.nextStage}: ${
                  GROWTH_STAGE_META[res.nextStage].name
                }!`,
                subtitle: `Rajin menabung membuat ${prof.petCustomName} tumbuh ke fase baru!`,
                newLevel: res.newLevel,
                mochiStage: Math.min(5, res.nextStage) as MochiStage,
                rewardPoints: points,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Rp${amt.toLocaleString("id-ID")} masuk celengan!`,
            subtitle: capped
              ? "Tersimpan! (Batas 3/3 catatan berpoin hari ini tercapai)"
              : "+5 Poin & +10 Stage XP untuk kebiasaan menabung!",
            points,
            xp,
          },
        });

        trySupabaseInsert("transactions", {
          user_id: prof.id,
          type: tx.type,
          category: tx.category,
          need_or_want: tx.need_or_want,
          title: tx.title,
          total_amount: tx.total_amount,
          is_itemized: false,
          points_earned: tx.points_earned,
          xp_earned: tx.xp_earned,
          transaction_date: tx.transaction_date,
        });

        return {
          success: true,
          message: `Rp${amt.toLocaleString("id-ID")} tersimpan di celengan "${goalName}".`,
          pointsEarned: points,
          xpEarned: xp,
        };
      },

      registerNewAccount: (payload) => {
        const state = get();
        const cleanUsername = payload.username
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
        const cleanDisplayName = payload.displayName.trim();
        const cleanPin = payload.pinCode.trim() || "1234";

        if (!cleanUsername || !cleanDisplayName) {
          return {
            success: false,
            message: "Nama tampilan dan username wajib diisi.",
          };
        }

        if (
          state.profiles.some(
            (p) => p.username.toLowerCase() === cleanUsername
          )
        ) {
          return {
            success: false,
            message: `Username "${cleanUsername}" sudah terdaftar. Gunakan username lain.`,
          };
        }

        // UUID asli agar sinkron ke kolom `profiles.id` (UUID) di Supabase.
        const newId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `prof-${Date.now()}`;
        const isKid = payload.role === "schoolchild";
        const budget =
          Number(payload.monthlyBudgetTarget) || (isKid ? 150000 : 1500000);
        const saving =
          Number(payload.monthlySavingTarget) || Math.round(budget * 0.2);
        const petName = payload.petCustomName?.trim() || "Mochi";

        const newProfile: ProfileData = {
          id: newId,
          username: cleanUsername,
          display_name: cleanDisplayName,
          role: payload.role,
          pin_code: cleanPin,
          createdAt: getRelativeDateStr(0),
          avatar_theme: "mochi-cat",
          xp: 0,
          level: 1,
          currentStage: 1, // Mulai dari Fase 1: Telur Ajaib Polos!
          stageXp: 0,
          stageRecordedDays: 0,
          petCustomName: petName,
          activeSpecies: "chubby_cat",
          unlockedSpecies: ["chubby_cat"],
          ownedPets: {
            chubby_cat: {
              species: "chubby_cat",
              customName: petName,
              currentStage: 1,
              stageXp: 0,
              stageRecordedDays: 0,
              unlockedAt: getRelativeDateStr(0),
            },
          },
          ownedAccessories: ["head_straw_hat", "bg_warm_room"],
          equippedAccessories: {},
          claimedPathMilestones: [],
          supervisorCheers: [],
          points_balance: 0,
          lifetime_points: 0,
          current_streak: 1,
          longest_streak: 1,
          streak_freeze_count: 1,
          last_recorded_date: getRelativeDateStr(0),
          monthly_budget_target: budget,
          monthly_saving_target: saving,
        };

        const nextTransactions = [...state.transactions];
        const nextMissions = [...state.missions];

        if (payload.role === "user") {
          nextTransactions.unshift({
            id: `tx-init-${Date.now()}`,
            user_id: newId,
            type: "income",
            category: "Uang Saku Bulanan",
            need_or_want: "income",
            title: `Saldo Awal Uang Saku ${cleanDisplayName}`,
            total_amount: budget,
            is_itemized: false,
            points_earned: 5,
            xp_earned: 10,
            transaction_date: getRelativeDateStr(0),
            created_at: new Date().toISOString(),
            items: [],
          });

          nextMissions.push(
            {
              id: `mis-${newId}-1`,
              user_id: newId,
              mission_type: "daily",
              title: "Detektif Struk Harian",
              description:
                "Catat minimal 1 pengeluaran hari ini dengan rincian 2 sub-item spesifik.",
              target_value: 1,
              current_value: 0,
              reward_points: 15,
              reward_xp: 25,
              is_claimed: false,
              valid_until: getRelativeDateStr(0),
            },
            {
              id: `mis-${newId}-2`,
              user_id: newId,
              mission_type: "daily",
              title: "Rem Pakem Harian",
              description:
                "Jaga pengeluaran kategori Jajan hari ini di bawah 50% batas harian.",
              target_value: 1,
              current_value: 1,
              reward_points: 15,
              reward_xp: 25,
              is_claimed: false,
              valid_until: getRelativeDateStr(0),
            },
            {
              id: `mis-${newId}-3`,
              user_id: newId,
              mission_type: "weekly",
              title: "Evaluasi Anggaran Mingguan",
              description:
                "Selesaikan 7 hari penuh dengan total pengeluaran di bawah Budget Mingguan.",
              target_value: 7,
              current_value: 1,
              reward_points: 150,
              reward_xp: 120,
              is_claimed: false,
              valid_until: getRelativeDateStr(7),
            }
          );
        }

        const nextAssignments =
          payload.supervisorId &&
          isChildRole(payload.role) &&
          state.profiles.some(
            (p) => p.id === payload.supervisorId && p.role === "supervisor"
          )
            ? [
                ...state.supervisorAssignments,
                { supervisorId: payload.supervisorId, userId: newId },
              ]
            : state.supervisorAssignments;

        set({
          profiles: [...state.profiles, newProfile],
          transactions: nextTransactions,
          missions: nextMissions,
          supervisorAssignments: nextAssignments,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Akun "${cleanDisplayName}" Berhasil Dibuat!`,
            subtitle: `Role: ${payload.role.toUpperCase()} • Username: @${cleanUsername} • PIN: ${cleanPin}`,
            points: 0,
            xp: 0,
          },
        });

        trySupabaseInsert("profiles", {
          id: newProfile.id,
          username: newProfile.username,
          display_name: newProfile.display_name,
          role: newProfile.role,
          pin_code: newProfile.pin_code,
          monthly_budget_target: newProfile.monthly_budget_target,
          monthly_saving_target: newProfile.monthly_saving_target,
        });

        return {
          success: true,
          message: `Akun @${cleanUsername} (${payload.role}) berhasil didaftarkan!`,
          newProfileId: newId,
        };
      },

      toggleSupervisorAssignment: (supervisorId, userId) => {
        const state = get();
        const exists = state.supervisorAssignments.some(
          (a) => a.supervisorId === supervisorId && a.userId === userId
        );

        const nextAssignments = exists
          ? state.supervisorAssignments.filter(
              (a) => !(a.supervisorId === supervisorId && a.userId === userId)
            )
          : [...state.supervisorAssignments, { supervisorId, userId }];

        set({
          supervisorAssignments: nextAssignments,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: exists
              ? "Akses Pantau Supervisor Dicabut"
              : "Akses Pantau Supervisor Ditambahkan!",
            subtitle: "Perubahan hak akses monitoring buku kas telah disimpan.",
            points: 0,
            xp: 0,
          },
        });
      },

      setTransactionDrawerOpen: (open) =>
        set({ isTransactionDrawerOpen: open }),

      setCashoutModalOpen: (open) => set({ isCashoutModalOpen: open }),

      setStreakCalendarOpen: (open) => set({ isStreakCalendarOpen: open }),

      setStoryModalOpen: (open) => set({ isStoryModalOpen: open }),

      setSavingsModalOpen: (open) => set({ isSavingsModalOpen: open }),

      closeUnboxedAccessoryModal: () => set({ unboxedAccessoryDrop: null }),

      clearRewardToast: () => set({ rewardToast: null }),

      closeCelebrationModal: () => set({ celebrationModal: null }),

      triggerParticleBurst: (type = "both") =>
        set((s) => ({
          particleBurstKey: s.particleBurstKey + 1,
          particleBurstType: type,
        })),

      renamePet: (newName) => {
        const clean = newName.trim().slice(0, 18);
        if (!clean) {
          return { success: false, message: "Nama pet tidak boleh kosong." };
        }
        const state = get();
        const targetUser = getActiveUserProfile(state);
        const activeSp = targetUser.activeSpecies || "chubby_cat";
        const currentPetObj = targetUser.ownedPets?.[activeSp] || {
          species: activeSp,
          customName: clean,
          currentStage: targetUser.currentStage || 1,
          stageXp: targetUser.stageXp || 0,
          stageRecordedDays: targetUser.stageRecordedDays || 0,
          unlockedAt: getRelativeDateStr(0),
        };

        set({
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  petCustomName: clean,
                  ownedPets: {
                    ...(p.ownedPets || {}),
                    [activeSp]: { ...currentPetObj, customName: clean },
                  },
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Nama Pet Diubah Menjadi "${clean}"!`,
            subtitle: `${clean} siap menemani perjalanan menabungmu setiap hari!`,
            points: 0,
            xp: 0,
          },
        });

        return {
          success: true,
          message: `Nama pet berhasil diubah menjadi ${clean}!`,
        };
      },

      equipPetSpecies: (species) => {
        const state = get();
        const targetUser = getActiveUserProfile(state);
        if (!targetUser.unlockedSpecies.includes(species)) return;

        const spInfo = getSpeciesInfo(species);
        const instance: OwnedPetInstance = targetUser.ownedPets?.[species] || {
          species,
          customName: spInfo.defaultName,
          currentStage: 1,
          stageXp: 0,
          stageRecordedDays: 0,
          unlockedAt: getRelativeDateStr(0),
        };

        set({
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  activeSpecies: species,
                  petCustomName: instance.customName,
                  currentStage: instance.currentStage,
                  stageXp: instance.stageXp,
                  stageRecordedDays: instance.stageRecordedDays,
                  ownedPets: {
                    ...(p.ownedPets || {}),
                    [species]: instance,
                  },
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `${instance.customName} (${spInfo.name}) Dipilih!`,
            subtitle: `Fase ${instance.currentStage}/8 (${
              GROWTH_STAGE_META[instance.currentStage].name
            }) aktif di panggung pet!`,
            points: 0,
            xp: 0,
          },
        });
      },

      /**
       * TUGAS 5: Mengadopsi Spesies Pet Baru dari Telur (Stage 1: Telur Ajaib, Stage XP 0, Hari Mencatat 0)
       */
      buyPetSpecies: (species) => {
        const state = get();
        const targetUser = getActiveUserProfile(state);
        const spInfo = getSpeciesInfo(species);
        const price = PET_SPECIES_SHOP_PRICES[species] ?? spInfo.pricePoints;

        if (targetUser.unlockedSpecies.includes(species)) {
          return {
            success: false,
            message: "Spesies hewan ini sudah ada di Kandang Pet kamu!",
          };
        }

        if (targetUser.points_balance < price) {
          return {
            success: false,
            message: `Saldo Poin belum cukup. Butuh ${price.toLocaleString(
              "id-ID"
            )} Poin untuk mengadopsi Telur ${spInfo.name}.`,
          };
        }

        const newEggInstance: OwnedPetInstance = {
          species,
          customName: spInfo.defaultName,
          currentStage: 1, // Mulai dari Telur Ajaib (Stage 1)!
          stageXp: 0,
          stageRecordedDays: 0,
          unlockedAt: getRelativeDateStr(0),
        };

        set({
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  points_balance: p.points_balance - price,
                  unlockedSpecies: [...p.unlockedSpecies, species],
                  activeSpecies: species,
                  petCustomName: newEggInstance.customName,
                  currentStage: 1,
                  stageXp: 0,
                  stageRecordedDays: 0,
                  ownedPets: {
                    ...(p.ownedPets || {}),
                    [species]: newEggInstance,
                  },
                }
              : p
          ),
          celebrationModal: {
            type: "milestone",
            title: `Telur Baru Diadopsi: ${spInfo.name}!`,
            subtitle: `${newEggInstance.customName} lahir sebagai Fase 1 (${GROWTH_STAGE_META[1].name}). Yuk catat kas rutin agar telurnya menetas dan tumbuh besar!`,
            rewardPoints: 0,
          },
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Telur ${spInfo.name} Berhasil Diadopsi!`,
            subtitle: `Mulai tumbuh dari Fase 1 (Telur Ajaib) di panggung pet!`,
            points: 0,
            xp: 0,
            isCombo: true,
          },
        });

        return {
          success: true,
          message: `Berhasil mengadopsi Telur ${spInfo.name}!`,
        };
      },

      buyAccessory: (accessoryId) => {
        const state = get();
        const targetUser = getActiveUserProfile(state);
        const item = ACCESSORY_BY_ID[accessoryId];

        if (!item) {
          return { success: false, message: "Item aksesoris tidak ditemukan." };
        }

        if (targetUser.ownedAccessories.includes(accessoryId)) {
          return {
            success: false,
            message: "Aksesoris ini sudah ada di lemari koleksimu!",
          };
        }

        if (targetUser.currentStage < item.stageRequirement) {
          return {
            success: false,
            message: `Terkunci! Butuh Fase Stage ${item.stageRequirement} (${
              GROWTH_STAGE_META[item.stageRequirement].name
            }) untuk membeli item ini.`,
          };
        }

        if (item.source === "path_drop") {
          return {
            success: false,
            message:
              "Item eksklusif ini tidak dijual—dapatkan dari Peti Harta Peta Jalur Kas Harian!",
          };
        }

        if (targetUser.points_balance < item.pricePoints) {
          return {
            success: false,
            message: `Saldo Poin belum cukup (butuh ${item.pricePoints.toLocaleString(
              "id-ID"
            )} Poin).`,
          };
        }

        set({
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "coin",
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  points_balance: p.points_balance - item.pricePoints,
                  ownedAccessories: [...p.ownedAccessories, accessoryId],
                  equippedAccessories: {
                    ...p.equippedAccessories,
                    [item.slot]: accessoryId,
                  },
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `${item.name} Dibeli & Dipasang!`,
            subtitle: `${targetUser.petCustomName} makin menggemaskan dengan kostum Fase ${item.stageRequirement}!`,
            points: 0,
            xp: 0,
            isCombo: true,
          },
        });

        return {
          success: true,
          message: `${item.name} berhasil dibeli dan dipasang!`,
        };
      },

      toggleEquipAccessory: (accessoryId) => {
        const state = get();
        const targetUser = getActiveUserProfile(state);
        const item = ACCESSORY_BY_ID[accessoryId];
        if (!item || !targetUser.ownedAccessories.includes(accessoryId)) return;

        const currentlyEquipped = targetUser.equippedAccessories[item.slot];
        const isUnequip = currentlyEquipped === accessoryId;

        const nextEquipped = { ...targetUser.equippedAccessories };
        if (isUnequip) {
          delete nextEquipped[item.slot];
        } else {
          nextEquipped[item.slot] = accessoryId;
        }

        set({
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? { ...p, equippedAccessories: nextEquipped }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: isUnequip
              ? `${item.name} Dilepas`
              : `${item.name} Dipasang!`,
            subtitle: `Penampilan ${targetUser.petCustomName} telah diperbarui.`,
            points: 0,
            xp: 0,
          },
        });
      },

      equipAccessoryDirect: (accessoryId) => {
        const state = get();
        const targetUser = getActiveUserProfile(state);
        const item = ACCESSORY_BY_ID[accessoryId];
        if (!item) return;

        const nextOwned = targetUser.ownedAccessories.includes(accessoryId)
          ? targetUser.ownedAccessories
          : [...targetUser.ownedAccessories, accessoryId];

        set({
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  ownedAccessories: nextOwned,
                  equippedAccessories: {
                    ...p.equippedAccessories,
                    [item.slot]: accessoryId,
                  },
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `${item.name} Langsung Dipasang!`,
            subtitle: `${targetUser.petCustomName} langsung mengenakan ${item.name}!`,
            points: 0,
            xp: 0,
            isCombo: true,
          },
        });
      },

      /**
       * TUGAS 3: Klaim Peti Harta Peta Jalur Kas -> Buka Modal Unboxing Eksklusif (`AccessoryDropModal`)
       */
      claimPathMilestoneDrop: (milestoneDay) => {
        const state = get();
        const targetUser = getActiveUserProfile(state);

        if (targetUser.claimedPathMilestones.includes(milestoneDay)) {
          return {
            success: false,
            points: 0,
            xp: 0,
            message: `Peti Harta Hari ke-${milestoneDay} sudah pernah diklaim.`,
          };
        }

        // Pemilihan item memakai fungsi murni bersama (juga dipakai pratinjau peti di UI)
        const droppedItem = pickPathDropItem(
          targetUser.ownedAccessories,
          targetUser.currentStage
        );

        const rewardPoints = 10;
        const rewardStageXp = 15;

        const growthEval = evaluateGrowthProgression(
          targetUser,
          rewardStageXp,
          0
        );

        const nextOwned = Array.from(
          new Set([...targetUser.ownedAccessories, droppedItem.id])
        );
        const journeyBadge = journeyUnlockForDay(milestoneDay);
        const ownedTitlesNow = targetUser.ownedTitleIds ?? STARTER_TITLE_IDS;
        const ownedBgsNow = targetUser.ownedBadgeBgIds ?? STARTER_BG_IDS;
        const newTitleIds = (journeyBadge.titleIds ?? []).filter((id) => !ownedTitlesNow.includes(id));
        const newBgIds = (journeyBadge.bgIds ?? []).filter((id) => !ownedBgsNow.includes(id));

        set({
          openedCheckpointWeeks: Array.from(
            new Set([...state.openedCheckpointWeeks, milestoneDay])
          ),
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  xp: p.xp + rewardStageXp,
                  level: getLevelFromXp(p.xp + rewardStageXp).level,
                  currentStage: growthEval.nextStage,
                  stageXp: growthEval.nextStageXp,
                  stageRecordedDays: growthEval.nextStageDays,
                  ownedPets: growthEval.nextOwnedPets,
                  points_balance: p.points_balance + rewardPoints,
                  lifetime_points: p.lifetime_points + rewardPoints,
                  ownedAccessories: nextOwned,
                  ownedTitleIds: [...ownedTitlesNow, ...newTitleIds],
                  ownedBadgeBgIds: [...ownedBgsNow, ...newBgIds],
                  claimedPathMilestones: [
                    ...p.claimedPathMilestones,
                    milestoneDay,
                  ],
                  pathMilestoneDrops: {
                    ...(p.pathMilestoneDrops ?? {}),
                    [milestoneDay]: droppedItem.id,
                  },
                }
              : p
          ),
          // Buka Modal Unboxing Khusus (TUGAS 3)
          unboxedAccessoryDrop: {
            item: droppedItem,
            milestoneDay,
            points: rewardPoints,
            xp: rewardStageXp,
            newTitleIds: newTitleIds,
            newBgIds: newBgIds,
          },
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Item Eksklusif Ditemukan: ${droppedItem.name}!`,
            subtitle: `Hadiah Peti Hari ke-${milestoneDay} (+${rewardPoints} Poin & +${rewardStageXp} Stage XP)`,
            points: rewardPoints,
            xp: rewardStageXp,
            isCombo: true,
          },
        });

        return {
          success: true,
          droppedItem,
          droppedAccessoryName: droppedItem.name,
          points: rewardPoints,
          xp: rewardStageXp,
          message: `Berhasil mengklaim ${droppedItem.name}!`,
        };
      },

      equipMochiStage: (stage) => {
        set({
          equippedMochiStage: stage,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: stage
              ? `Fase Stage ${stage} Dipasang!`
              : "Mode Fase Aktif Otomatis!",
            subtitle: "Penampilan pet telah diperbarui.",
            points: 0,
            xp: 0,
          },
        });
      },

      buyBadgeItem: (kind, id) => {
        const state = get();
        const prof = getActiveUserProfile(state);
        const def = kind === "title" ? TITLE_BY_ID[id] : BADGE_BG_BY_ID[id];
        if (!def || def.source.kind !== "shop") return { success: false, message: "Item ini tidak dijual di Butik." };
        const owned = kind === "title" ? prof.ownedTitleIds ?? STARTER_TITLE_IDS : prof.ownedBadgeBgIds ?? STARTER_BG_IDS;
        if (owned.includes(id)) return { success: false, message: `${def.name} sudah menjadi milikmu.` };
        const price = def.source.price;
        if (prof.points_balance < price) {
          return { success: false, message: `Poin belum cukup (butuh ${price.toLocaleString("id-ID")} Poin untuk ${def.name}).` };
        }
        set({
          profiles: state.profiles.map((p) =>
            p.id === prof.id
              ? {
                  ...p,
                  points_balance: p.points_balance - price,
                  ownedTitleIds: kind === "title" ? [...(p.ownedTitleIds ?? STARTER_TITLE_IDS), id] : p.ownedTitleIds,
                  ownedBadgeBgIds: kind === "bg" ? [...(p.ownedBadgeBgIds ?? STARTER_BG_IDS), id] : p.ownedBadgeBgIds,
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `${kind === "title" ? "Gelar" : "Latar"} "${def.name}" Dibeli!`,
            subtitle: "Pasang dari Koleksi Badge, lalu pamerkan di Beranda Keluarga.",
            points: 0,
            xp: 0,
          },
        });
        return { success: true, message: `${def.name} berhasil dibeli.` };
      },

      equipBadge: (profileId, pick) => {
        const state = get();
        const prof = state.profiles.find((p) => p.id === profileId);
        if (!prof) return { success: false, message: "Profil tidak ditemukan." };
        const ownedT = prof.ownedTitleIds ?? STARTER_TITLE_IDS;
        const ownedB = prof.ownedBadgeBgIds ?? STARTER_BG_IDS;
        if (pick.titleId && !ownedT.includes(pick.titleId)) return { success: false, message: "Gelar ini belum kamu miliki." };
        if (pick.bgId && !ownedB.includes(pick.bgId)) return { success: false, message: "Latar ini belum kamu miliki." };
        set({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? { ...p, equippedTitleId: pick.titleId ?? p.equippedTitleId, equippedBadgeBgId: pick.bgId ?? p.equippedBadgeBgId }
              : p
          ),
        });
        return { success: true, message: "Badge dipasang." };
      },

      unlockBadgeItems: (profileId, unlock) => {
        const state = get();
        const prof = state.profiles.find((p) => p.id === profileId);
        if (!prof) return { titleIds: [], bgIds: [] };
        const ownedT = prof.ownedTitleIds ?? STARTER_TITLE_IDS;
        const ownedB = prof.ownedBadgeBgIds ?? STARTER_BG_IDS;
        const titleIds = (unlock.titleIds ?? []).filter((id) => TITLE_BY_ID[id] && !ownedT.includes(id));
        const bgIds = (unlock.bgIds ?? []).filter((id) => BADGE_BG_BY_ID[id] && !ownedB.includes(id));
        if (titleIds.length === 0 && bgIds.length === 0) return { titleIds, bgIds };
        set({
          profiles: state.profiles.map((p) =>
            p.id === profileId ? { ...p, ownedTitleIds: [...ownedT, ...titleIds], ownedBadgeBgIds: [...ownedB, ...bgIds] } : p
          ),
        });
        return { titleIds, bgIds };
      },

      equipSpecialTitle: (title) => {
        set({
          equippedTitle: title,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Gelar "${title}" Dipasang!`,
            subtitle: "Gelar kehormatanmu kini tampil di profil pet.",
            points: 0,
            xp: 0,
          },
        });
      },

      /**
       * TUGAS 4: Tidak ada lagi elus/lempar koin gratis yang memberi XP/Poin
       */
      petMochiForAffection: () => {
        return { xpEarned: 0, leveledUp: false };
      },

      buyStreakFreezeShield: (packId = "single") => {
        const state = get();
        const userProf = getActiveUserProfile(state);
        const pack = SHIELD_PACK_BY_ID[packId];
        if (userProf.points_balance < pack.price) {
          return {
            success: false,
            message: `Poin belum cukup (butuh ${pack.price.toLocaleString("id-ID")} Poin untuk ${pack.name}).`,
          };
        }
        const room = MAX_PAID_SHIELDS - userProf.streak_freeze_count;
        if (pack.shields > room) {
          return {
            success: false,
            message:
              room <= 0
                ? `Tas perisai beli sudah penuh (maks. ${MAX_PAID_SHIELDS}). Pakai dulu sebelum membeli lagi.`
                : `Tas perisai hanya muat ${room} lagi (maks. ${MAX_PAID_SHIELDS}). Pilih paket yang lebih kecil.`,
          };
        }
        const today = getRelativeDateStr(0);
        set({
          profiles: state.profiles.map((p) =>
            p.id === userProf.id
              ? {
                  ...p,
                  ...monthlyFreeFields(p, today),
                  points_balance: p.points_balance - pack.price,
                  streak_freeze_count: p.streak_freeze_count + pack.shields,
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `${pack.name} Dibeli!`,
            subtitle: `+${pack.shields} Perisai Es siap melindungi api streak harianmu!`,
            points: 0,
            xp: 0,
          },
        });
        return {
          success: true,
          message: `Berhasil menukar ${pack.price.toLocaleString("id-ID")} Poin menjadi +${pack.shields} Perisai Es!`,
        };
      },

      addTransaction: (payload) => {
        const state = get();
        const userProf = getActiveUserProfile(state);
        const todayStr = payload.transaction_date || getRelativeDateStr(0);

        const todayRewardedTxCount =
          state.transactions.filter(
            (t) =>
              t.user_id === userProf.id &&
              t.transaction_date === todayStr &&
              t.points_earned > 0
          ).length +
          // Catatan berpoin yang sudah dihapus tetap dihitung agar kuota 3/hari tidak bisa dicurangi.
          (state.deletedRewardLedger?.[rewardLedgerKey(userProf.id, todayStr)] ?? 0);

        const dailyCapReached = todayRewardedTxCount >= 3;

        const rawItems = payload.items || [];
        const comboCheck = validateItemizedCombo(rawItems);
        const isCombo = comboCheck.isValidCombo;

        let pointsEarned = 0;
        let xpEarned = 0;

        if (!dailyCapReached) {
          if (isCombo) {
            pointsEarned = 10;
            xpEarned = 20;
          } else {
            pointsEarned = 5;
            xpEarned = 10;
          }
        }

        let streakBonusPoints = 0;
        let streakBonusXp = 0;
        let newStreak = userProf.current_streak;
        let addedRecordedDays = 0;

        if (userProf.last_recorded_date !== todayStr) {
          addedRecordedDays = 1;
          // Streak ketat: jeda lebih dari 1 hari memulai lagi dari 1 (bukan menyambung).
          newStreak = nextStreakOnRecord(
            userProf.last_recorded_date,
            userProf.current_streak,
            todayStr
          );
          if (userProf.last_daily_claim_date !== todayStr) {
            streakBonusPoints = 10;
            streakBonusXp = 15;
          }
        }

        const totalPointsEarned = pointsEarned + streakBonusPoints;
        const totalXpEarned = xpEarned + streakBonusXp;

        const newTxId = `tx-${Date.now()}`;
        const formattedItems: TransactionItem[] = rawItems
          .filter((it) => it.item_name.trim() && Number(it.unit_price) > 0)
          .map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            transaction_id: newTxId,
            item_name: it.item_name.trim(),
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price),
            subtotal: (Number(it.quantity) || 1) * Number(it.unit_price),
          }));

        const newTx: TransactionRecord = {
          id: newTxId,
          user_id: userProf.id,
          type: payload.type,
          category: payload.category,
          need_or_want: payload.need_or_want,
          title: payload.title.trim() || payload.category,
          total_amount: Number(payload.total_amount),
          is_itemized: isCombo || formattedItems.length >= 2,
          points_earned: totalPointsEarned,
          xp_earned: totalXpEarned,
          transaction_date: todayStr,
          created_at: new Date().toISOString(),
          items: formattedItems,
        };

        const newXp = userProf.xp + totalXpEarned;
        const { level: newLevel } = getLevelFromXp(newXp);

        const growthEval = evaluateGrowthProgression(
          userProf,
          totalXpEarned,
          addedRecordedDays
        );

        const updatedMissions = state.missions.map((m) => {
          if (m.user_id !== userProf.id) return m;
          if (
            m.title.includes("Detektif Struk") &&
            isCombo &&
            m.current_value < m.target_value
          ) {
            return { ...m, current_value: m.target_value };
          }
          if (
            (m.title.includes("Jurnal") || m.mission_type === "daily") &&
            m.current_value < m.target_value
          ) {
            return { ...m, current_value: m.target_value };
          }
          return m;
        });

        const hasDetailBadge = state.badges.some(
          (b) => b.user_id === userProf.id && b.badge_code === "detail_master"
        );
        const updatedBadges = [...state.badges];
        if (isCombo && !hasDetailBadge) {
          updatedBadges.push({
            id: `bdg-${Date.now()}`,
            user_id: userProf.id,
            badge_code: "detail_master",
            badge_name: BADGE_META.detail_master.title,
            praise_quote:
              "Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat pet kesayanganmu sangat bangga!",
            unlocked_at: todayStr,
          });
        }

        set({
          transactions: [newTx, ...state.transactions],
          missions: updatedMissions,
          badges: updatedBadges,
          isProudComboActive: isCombo,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.id === userProf.id
              ? {
                  ...p,
                  xp: newXp,
                  level: newLevel,
                  currentStage: growthEval.nextStage,
                  stageXp: growthEval.nextStageXp,
                  stageRecordedDays: growthEval.nextStageDays,
                  ownedPets: growthEval.nextOwnedPets,
                  points_balance: p.points_balance + totalPointsEarned,
                  lifetime_points: p.lifetime_points + totalPointsEarned,
                  current_streak: newStreak,
                  longest_streak: Math.max(p.longest_streak, newStreak),
                  last_recorded_date: todayStr,
                  last_daily_claim_date:
                    streakBonusPoints > 0
                      ? todayStr
                      : p.last_daily_claim_date,
                  isColdStreakMode:
                    addedRecordedDays > 0 ? false : p.isColdStreakMode,
                  coldSince: addedRecordedDays > 0 ? undefined : p.coldSince,
                  streakBeforeCold:
                    addedRecordedDays > 0 ? undefined : p.streakBeforeCold,
                }
              : p
          ),
          celebrationModal: growthEval.promoted
            ? {
                type: "level_up",
                title: `PERTUMBUHAN NAIK! Fase ${growthEval.nextStage}: ${
                  GROWTH_STAGE_META[growthEval.nextStage].name
                }!`,
                subtitle: `Selamat! ${userProf.petCustomName} tumbuh ke Fase ${
                  GROWTH_STAGE_META[growthEval.nextStage].name
                }. Progres Stage XP & Hari Mencatat direset ke 0 untuk fase pertumbuhan berikutnya!`,
                newLevel,
                mochiStage: Math.min(5, growthEval.nextStage) as MochiStage,
                rewardPoints: totalPointsEarned,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: isCombo
              ? "Jurnal Rinci Tersimpan! (+10 Poin & +20 Stage XP)"
              : dailyCapReached
              ? "Catatan Tersimpan! (Batas 3/3 Transaksi Berpoin Harian)"
              : "Catatan Kas Tersimpan! (+5 Poin & +10 Stage XP)",
            subtitle:
              streakBonusPoints > 0
                ? `Termasuk Bonus Kehadiran Harian (+10 Poin & +15 Stage XP)!`
                : payload.title,
            points: totalPointsEarned,
            xp: totalXpEarned,
            isCombo,
          },
        });

        if (isCombo) {
          setTimeout(() => {
            set({ isProudComboActive: false });
          }, 5500);
        }

        trySupabaseInsert("transactions", {
          user_id: userProf.id,
          type: newTx.type,
          category: newTx.category,
          need_or_want: newTx.need_or_want,
          title: newTx.title,
          total_amount: newTx.total_amount,
          is_itemized: newTx.is_itemized,
          points_earned: newTx.points_earned,
          xp_earned: newTx.xp_earned,
          transaction_date: newTx.transaction_date,
          created_at: newTx.created_at,
        });

        return {
          pointsEarned: totalPointsEarned,
          xpEarned: totalXpEarned,
          isCombo,
          dailyCapReached,
        };
      },

      updateTransaction: (id, patch) => {
        const state = get();
        const owner = getActiveUserProfile(state);
        const tx = state.transactions.find((t) => t.id === id);
        if (!tx) return { success: false, message: "Catatan tidak ditemukan." };
        const lock = transactionLockReason(tx, owner.id, getRelativeDateStr(0));
        if (lock) return { success: false, message: lock };

        const title = patch.title.trim().slice(0, TX_TITLE_MAX);
        if (!title) return { success: false, message: "Judul catatan tidak boleh kosong." };

        let need_or_want = tx.need_or_want;
        if (tx.type === "expense") {
          const cat = EXPENSE_CATEGORIES.find((c) => c.name === patch.category);
          if (!cat) return { success: false, message: "Kategori pengeluaran tidak dikenal." };
          need_or_want = cat.group;
        } else if (!INCOME_CATEGORIES.some((c) => c.name === patch.category)) {
          return { success: false, message: "Kategori pemasukan tidak dikenal." };
        }

        // Catatan rinci: total berasal dari sub-item struk, jadi nominal dikunci.
        let total = tx.total_amount;
        if (!tx.is_itemized && patch.total_amount !== undefined) {
          const n = Number(patch.total_amount);
          if (!Number.isFinite(n) || n <= 0) return { success: false, message: "Nominal harus lebih dari 0." };
          if (n > 1_000_000_000) return { success: false, message: "Nominal terlalu besar." };
          total = Math.round(n);
        }

        set({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, title, category: patch.category, need_or_want, total_amount: total } : t
          ),
        });
        trySupabaseMutate(tx, { title, category: patch.category, need_or_want, total_amount: total });
        return { success: true, message: "Catatan berhasil diperbarui." };
      },

      removeTransaction: (id) => {
        const state = get();
        const owner = getActiveUserProfile(state);
        const tx = state.transactions.find((t) => t.id === id);
        if (!tx) return { success: false, message: "Catatan tidak ditemukan." };
        const lock = transactionLockReason(tx, owner.id, getRelativeDateStr(0));
        if (lock) return { success: false, message: lock };

        const key = rewardLedgerKey(tx.user_id, tx.transaction_date);
        const ledger = { ...(state.deletedRewardLedger ?? {}) };
        if (tx.points_earned > 0) ledger[key] = (ledger[key] ?? 0) + 1;

        set({
          transactions: state.transactions.filter((t) => t.id !== id),
          deletedRewardLedger: ledger,
        });
        trySupabaseMutate(tx, null);
        return { success: true, message: "Catatan dihapus." };
      },

      recordZeroSpendDay: () => {
        return { alreadyRecorded: true, pointsEarned: 0, xpEarned: 0 };
      },

      claimMissionReward: (missionId) => {
        const state = get();
        const mission = state.missions.find((m) => m.id === missionId);
        if (
          !mission ||
          mission.is_claimed ||
          mission.current_value < mission.target_value
        ) {
          return { success: false, points: 0, xp: 0 };
        }

        const userProf = getActiveUserProfile(state);

        const strictPoints = mission.mission_type === "daily" ? 15 : 150;
        const strictStageXp = mission.mission_type === "daily" ? 25 : 120;

        const newXp = userProf.xp + strictStageXp;
        const { level: newLevel } = getLevelFromXp(newXp);
        const growthEval = evaluateGrowthProgression(
          userProf,
          strictStageXp,
          0
        );

        set({
          missions: state.missions.map((m) =>
            m.id === missionId ? { ...m, is_claimed: true } : m
          ),
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.id === userProf.id
              ? {
                  ...p,
                  xp: newXp,
                  level: newLevel,
                  currentStage: growthEval.nextStage,
                  stageXp: growthEval.nextStageXp,
                  stageRecordedDays: growthEval.nextStageDays,
                  ownedPets: growthEval.nextOwnedPets,
                  points_balance: p.points_balance + strictPoints,
                  lifetime_points: p.lifetime_points + strictPoints,
                }
              : p
          ),
          celebrationModal: growthEval.promoted
            ? {
                type: "level_up",
                title: `PERTUMBUHAN NAIK! Fase ${growthEval.nextStage}: ${
                  GROWTH_STAGE_META[growthEval.nextStage].name
                }!`,
                subtitle: `Misi "${mission.title}" mengantarkan ${userProf.petCustomName} tumbuh ke Fase baru!`,
                newLevel,
                mochiStage: Math.min(5, growthEval.nextStage) as MochiStage,
                rewardPoints: strictPoints,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Misi "${mission.title}" Selesai!`,
            subtitle: `+${strictPoints} Poin & +${strictStageXp} Stage XP masuk ke akunmu!`,
            points: strictPoints,
            xp: strictStageXp,
            isCombo: true,
          },
        });

        return {
          success: true,
          points: strictPoints,
          xp: strictStageXp,
        };
      },

      openMysteryBox: () => {
        return {
          success: false,
          rewardType: "points",
          amount: 0,
          label:
            "Fitur Gacha Jackpot telah digantikan oleh Drop Aksesoris Jalur Harian.",
        };
      },

      claimWeeklyCheckpointChest: (weekNumber) => {
        const milestone = weekNumber >= 7 ? weekNumber : weekNumber * 7;
        const res = get().claimPathMilestoneDrop(milestone);
        return { success: res.success, points: res.points };
      },

      requestPointCashout: (points, note) => {
        const state = get();
        const userProf = getActiveUserProfile(state);

        if (points < 1000) {
          return {
            success: false,
            message: "Minimal penukaran adalah 1.000 Poin (Rp1.000).",
          };
        }
        if (points > userProf.points_balance) {
          return {
            success: false,
            message: "Saldo Poin kamu belum mencukupi jumlah tersebut.",
          };
        }

        const newRedemption: PointRedemptionRecord = {
          id: `red-${Date.now()}`,
          user_id: userProf.id,
          points_redeemed: points,
          rupiah_value: points,
          status: "pending",
          note:
            note.trim() ||
            "Tukar poin rajin mencatat kas menjadi saldo tabungan!",
          created_at: new Date().toISOString(),
          approved_at: null,
        };

        set({
          redemptions: [newRedemption, ...state.redemptions],
          profiles: state.profiles.map((p) =>
            p.id === userProf.id
              ? { ...p, points_balance: p.points_balance - points }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Tiket Emas Pencairan Dibuat!",
            subtitle: `Menunggu persetujuan Admin sebesar Rp${points.toLocaleString(
              "id-ID"
            )}.`,
            points: 0,
            xp: 10,
          },
        });

        trySupabaseInsert("point_redemptions", {
          user_id: userProf.id,
          points_redeemed: points,
          rupiah_value: points,
          status: "pending",
          note: newRedemption.note,
        });

        return {
          success: true,
          message:
            "Tiket pencairan berhasil dikirim ke Dashboard Admin & Supervisor!",
        };
      },

      approveOrRejectCashout: (redemptionId, action) => {
        const state = get();
        const target = state.redemptions.find((r) => r.id === redemptionId);
        if (!target || target.status !== "pending") return;

        const nowIso = new Date().toISOString();
        const todayStr = getRelativeDateStr(0);

        const updatedRedemptions = state.redemptions.map((r) =>
          r.id === redemptionId
            ? { ...r, status: action, approved_at: nowIso }
            : r
        );

        if (action === "approved") {
          const rewardIncomeTx: TransactionRecord = {
            id: `tx-cashout-${Date.now()}`,
            user_id: target.user_id,
            type: "income",
            category: "Hadiah Tukar Poin Gamifikasi",
            need_or_want: "income",
            title: `Hadiah Tukar Poin Gamifikasi (${target.points_redeemed.toLocaleString(
              "id-ID"
            )} Poin)`,
            total_amount: target.rupiah_value,
            is_itemized: false,
            points_earned: 0,
            xp_earned: 20,
            transaction_date: todayStr,
            created_at: nowIso,
            items: [],
          };

          set({
            redemptions: updatedRedemptions,
            transactions: [rewardIncomeTx, ...state.transactions],
            particleBurstKey: state.particleBurstKey + 1,
            particleBurstType: "coin",
            rewardToast: {
              id: `toast-${Date.now()}`,
              title: "Pencairan Poin Disetujui!",
              subtitle: `Rp${target.rupiah_value.toLocaleString(
                "id-ID"
              )} otomatis masuk sebagai pemasukan di Buku Kas!`,
              points: 0,
              xp: 20,
              isCombo: true,
            },
          });
        } else {
          set({
            redemptions: updatedRedemptions,
            profiles: state.profiles.map((p) =>
              p.id === target.user_id
                ? {
                    ...p,
                    points_balance: p.points_balance + target.points_redeemed,
                  }
                : p
            ),
          });
        }
      },

      sendSupervisorCheer: (customMessage) => {
        const state = get();
        const todayStr = getRelativeDateStr(0);
        const supervisorProf =
          state.profiles.find((p) => p.id === state.activeProfileId) ||
          state.profiles.find((p) => p.role === "supervisor");
        const targetUser = getActiveUserProfile(state);

        const newSticker: SupervisorCheerSticker = {
          id: `cheer-${Date.now()}`,
          fromSupervisorName:
            supervisorProf?.display_name || "Supervisor Keluarga",
          stickerLabel: "Stiker Apresiasi Keluarga",
          message:
            customMessage?.trim() ||
            `Semangat terus mencatat kasnya ya, ${targetUser.display_name}! Kami bangga sama kedisiplinanmu!`,
          sentAt: todayStr,
        };

        set({
          lastSupervisorCheerDate: todayStr,
          supervisorCheersCount: state.supervisorCheersCount + 1,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "xp",
          profiles: state.profiles.map((p) =>
            p.id === targetUser.id
              ? {
                  ...p,
                  supervisorCheers: [newSticker, ...(p.supervisorCheers || [])],
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Stiker Apresiasi Terkirim!",
            subtitle: `Stiker visual tampil hangat di beranda ${targetUser.display_name} (0 Poin).`,
            points: 0,
            xp: 0,
          },
        });

        return {
          success: true,
          message: `Stiker Apresiasi Visual berhasil dikirim ke beranda ${targetUser.display_name}!`,
        };
      },

      updateBudgetSettings: (
        monthlyBudgetTarget,
        monthlySavingTarget,
        targetUserId
      ) => {
        const state = get();
        const uid = targetUserId || getActiveUserProfile(state).id;
        set({
          profiles: state.profiles.map((p) =>
            p.id === uid
              ? {
                  ...p,
                  monthly_budget_target: monthlyBudgetTarget,
                  monthly_saving_target: monthlySavingTarget,
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Target Budget & Tabungan Diperbarui!",
            subtitle: "Rumus DSSL Detektif Kas otomatis menyesuaikan.",
            points: 0,
            xp: 0,
          },
        });
      },

      addCustomMission: (payload) => {
        const state = get();
        const uid = payload.targetUserId || getActiveUserProfile(state).id;
        const strictPts = payload.mission_type === "daily" ? 15 : 150;
        const strictXp = payload.mission_type === "daily" ? 25 : 120;

        const newMission: MissionRecord = {
          id: `mis-custom-${Date.now()}`,
          user_id: uid,
          mission_type: payload.mission_type,
          title: payload.title,
          description: payload.description,
          target_value: payload.target_value,
          current_value: 1,
          reward_points: strictPts,
          reward_xp: strictXp,
          is_claimed: false,
          valid_until: getRelativeDateStr(7),
        };
        set({
          missions: [newMission, ...state.missions],
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Misi Tantangan Baru Ditambahkan!",
            subtitle: `"${payload.title}" siap dikerjakan (+${strictPts} Poin & +${strictXp} Stage XP)!`,
            points: 0,
            xp: 0,
          },
        });
      },

      syncWithSupabaseIfAvailable: async () => {
        try {
          if (
            typeof window === "undefined" ||
            !process.env.NEXT_PUBLIC_SUPABASE_URL
          ) {
            return;
          }
          const supabase = createSupabaseBrowserClient();
          const { data: txData, error: txErr } = await supabase
            .from("transactions")
            .select("*, items:transaction_items(*)")
            .order("transaction_date", { ascending: false })
            .limit(50);

          if (!txErr && txData && txData.length > 0) {
            set({
              transactions: txData as unknown as TransactionRecord[],
              supabaseConnected: true,
            });
          }
        } catch {
          // Keep rich local state if Supabase tables aren't migrated yet
        }
      },
    }),
    {
      name: "bukudompet-v4-storage",
      version: 6,
      // Hidrasi dipicu manual lewat <StoreHydrator /> setelah mount, agar render pertama di klien
      // identik dengan SSR (tanpa galat hidrasi) walau localStorage berisi data berbeda.
      skipHydration: true,
      // Versi 5.4 (GO LIVE): data lokal versi lama berisi akun & catatan DEMO. Semuanya dibuang, lalu
      // aplikasi memakai 12 akun asli dari seed. Penyimpanan versi 6 ke atas dipakai apa adanya.
      migrate: (persistedState, fromVersion) =>
        (fromVersion < 6 ? {} : persistedState) as BukuDompetState,
      // Merge ringan & idempoten: hanya membuang ID aksesori yang tidak dikenal katalog
      // (data rusak) agar tidak muncul sebagai item "?" di lemari. Tidak ada lagi akun seed
      // yang dihidupkan kembali, jadi akun yang dihapus Admin tetap terhapus.
      merge: (persistedState, currentState) => {
        const raw = (persistedState ?? {}) as Partial<BukuDompetState>;
        const merged = { ...currentState, ...raw };
        if (Array.isArray(merged.profiles)) {
          merged.profiles = merged.profiles.map(sanitizeProfileAccessories);
        }
        if (!Array.isArray(merged.savedProfileIds)) merged.savedProfileIds = [];
        return merged;
      },
      partialize: (state) => ({
        currentRole: state.currentRole,
        activeProfileId: state.activeProfileId,
        monitoredUserId: state.monitoredUserId,
        profiles: state.profiles,
        supervisorAssignments: state.supervisorAssignments,
        transactions: state.transactions,
        deletedRewardLedger: state.deletedRewardLedger,
        missions: state.missions,
        badges: state.badges,
        redemptions: state.redemptions,
        equippedMochiStage: state.equippedMochiStage,
        equippedTitle: state.equippedTitle,
        streakFreezeDates: state.streakFreezeDates,
        zeroSpendDates: state.zeroSpendDates,
        openedCheckpointWeeks: state.openedCheckpointWeeks,
        lastSupervisorCheerDate: state.lastSupervisorCheerDate,
        supervisorCheersCount: state.supervisorCheersCount,
        isLoggedIn: state.isLoggedIn,
        supervisorChildChosen: state.supervisorChildChosen,
        savedProfileIds: state.savedProfileIds,
      }),
    }
  )
);

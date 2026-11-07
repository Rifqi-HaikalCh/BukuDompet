"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BadgeId } from "@/components/illustrations/PraiseBadges";
import { BADGE_META } from "@/components/illustrations/PraiseBadges";
import type { MochiStage } from "@/components/illustrations/MochiCompanion";
import { MOCHI_STAGE_NAMES } from "@/components/illustrations/MochiCompanion";
import {
  type TransactionRecord,
  type TransactionItem,
  validateItemizedCombo,
  getLevelFromXp,
  getMochiStageFromLevel,
} from "@/lib/spending-detective";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserRole = "user" | "supervisor" | "admin";

export interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  pin_code: string;
  avatar_theme: string;
  xp: number;
  level: number;
  points_balance: number; // 1 Poin = Rp 1
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  streak_freeze_count: number;
  last_recorded_date: string;
  monthly_budget_target: number;
  monthly_saving_target: number;
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

function getRelativeDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUPERVISOR_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";

export const INITIAL_PROFILES: ProfileData[] = [
  {
    id: USER_ID,
    username: "adik",
    display_name: "Adik (Pemilik Buku Kas)",
    role: "user",
    pin_code: "1111",
    avatar_theme: "mochi-cat",
    xp: 980,
    level: 9, // Stage 3: Mochi Manajer
    points_balance: 18500,
    lifetime_points: 28500,
    current_streak: 6,
    longest_streak: 9,
    streak_freeze_count: 2,
    last_recorded_date: getRelativeDateStr(0),
    monthly_budget_target: 1800000,
    monthly_saving_target: 350000,
  },
  {
    id: SUPERVISOR_ID,
    username: "orangtua",
    display_name: "Orang Tua (Supervisor)",
    role: "supervisor",
    pin_code: "2222",
    avatar_theme: "mochi-parent",
    xp: 0,
    level: 1,
    points_balance: 0,
    lifetime_points: 0,
    current_streak: 0,
    longest_streak: 0,
    streak_freeze_count: 0,
    last_recorded_date: getRelativeDateStr(0),
    monthly_budget_target: 1800000,
    monthly_saving_target: 350000,
  },
  {
    id: ADMIN_ID,
    username: "abang",
    display_name: "Abang (Admin & Sponsor Poin)",
    role: "admin",
    pin_code: "9999",
    avatar_theme: "mochi-boss",
    xp: 2500,
    level: 15,
    points_balance: 50000,
    lifetime_points: 50000,
    current_streak: 14,
    longest_streak: 14,
    streak_freeze_count: 5,
    last_recorded_date: getRelativeDateStr(0),
    monthly_budget_target: 1800000,
    monthly_saving_target: 350000,
  },
];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "tx-seed-1",
    user_id: USER_ID,
    type: "income",
    category: "Uang Saku Bulanan",
    need_or_want: "income",
    title: "Transfer Uang Saku Bulanan dari Orang Tua",
    total_amount: 1800000,
    is_itemized: false,
    points_earned: 25,
    xp_earned: 30,
    transaction_date: getRelativeDateStr(-5),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-2",
    user_id: USER_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Kantin & Air Mineral",
    total_amount: 24000,
    is_itemized: true,
    points_earned: 35,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-5),
    created_at: new Date(Date.now() - 5 * 86400000 + 3600000).toISOString(),
    items: [
      {
        id: "it-201",
        transaction_id: "tx-seed-2",
        item_name: "Nasi Ayam Bakar Madu",
        quantity: 1,
        unit_price: 18000,
        subtotal: 18000,
      },
      {
        id: "it-202",
        transaction_id: "tx-seed-2",
        item_name: "Air Mineral Botol",
        quantity: 1,
        unit_price: 6000,
        subtotal: 6000,
      },
    ],
  },
  {
    id: "tx-seed-3",
    user_id: USER_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Es Kopi Susu Gula Aren",
    total_amount: 19000,
    is_itemized: false,
    points_earned: 10,
    xp_earned: 15,
    transaction_date: getRelativeDateStr(-5),
    created_at: new Date(Date.now() - 5 * 86400000 + 7200000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-4",
    user_id: USER_ID,
    type: "expense",
    category: "Kuliah/Alat Tulis",
    need_or_want: "need",
    title: "Beli Alat Tulis & Fotokopi Modul",
    total_amount: 31000,
    is_itemized: true,
    points_earned: 40,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-4),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    items: [
      {
        id: "it-401",
        transaction_id: "tx-seed-4",
        item_name: "Buku Catatan Bergaris",
        quantity: 1,
        unit_price: 15000,
        subtotal: 15000,
      },
      {
        id: "it-402",
        transaction_id: "tx-seed-4",
        item_name: "Pulpen Gel Hitam",
        quantity: 2,
        unit_price: 5000,
        subtotal: 10000,
      },
      {
        id: "it-403",
        transaction_id: "tx-seed-4",
        item_name: "Fotokopi Modul Kuliah",
        quantity: 1,
        unit_price: 6000,
        subtotal: 6000,
      },
    ],
  },
  {
    id: "tx-seed-5",
    user_id: USER_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Kopi Kenangan Mantan",
    total_amount: 22000,
    is_itemized: false,
    points_earned: 10,
    xp_earned: 15,
    transaction_date: getRelativeDateStr(-4),
    created_at: new Date(Date.now() - 4 * 86400000 + 3600000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-6",
    user_id: USER_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Malam Warung Pak Kumis",
    total_amount: 23000,
    is_itemized: true,
    points_earned: 40,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-3),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [
      {
        id: "it-601",
        transaction_id: "tx-seed-6",
        item_name: "Nasi Goreng Spesial",
        quantity: 1,
        unit_price: 15000,
        subtotal: 15000,
      },
      {
        id: "it-602",
        transaction_id: "tx-seed-6",
        item_name: "Es Teh Manis",
        quantity: 1,
        unit_price: 5000,
        subtotal: 5000,
      },
      {
        id: "it-603",
        transaction_id: "tx-seed-6",
        item_name: "Kerupuk Kaleng",
        quantity: 1,
        unit_price: 3000,
        subtotal: 3000,
      },
    ],
  },
  {
    id: "tx-seed-7",
    user_id: USER_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Matcha Latte Dingin",
    total_amount: 21000,
    is_itemized: false,
    points_earned: 10,
    xp_earned: 15,
    transaction_date: getRelativeDateStr(-3),
    created_at: new Date(Date.now() - 3 * 86400000 + 5400000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-8",
    user_id: USER_ID,
    type: "expense",
    category: "Transportasi",
    need_or_want: "need",
    title: "Naik KRL & Ojek Stasiun",
    total_amount: 18000,
    is_itemized: true,
    points_earned: 35,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-2),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      {
        id: "it-801",
        transaction_id: "tx-seed-8",
        item_name: "Tiket KRL Commuter",
        quantity: 1,
        unit_price: 6000,
        subtotal: 6000,
      },
      {
        id: "it-802",
        transaction_id: "tx-seed-8",
        item_name: "Ojek Online Stasiun",
        quantity: 1,
        unit_price: 12000,
        subtotal: 12000,
      },
    ],
  },
  {
    id: "tx-seed-9",
    user_id: USER_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Boba Brown Sugar Fresh Milk",
    total_amount: 24000,
    is_itemized: false,
    points_earned: 10,
    xp_earned: 15,
    transaction_date: getRelativeDateStr(-2),
    created_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-10",
    user_id: USER_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Warteg Bahari",
    total_amount: 22000,
    is_itemized: true,
    points_earned: 40,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-1),
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      {
        id: "it-1001",
        transaction_id: "tx-seed-10",
        item_name: "Nasi Sayur Sop & Telur Dadar",
        quantity: 1,
        unit_price: 14000,
        subtotal: 14000,
      },
      {
        id: "it-1002",
        transaction_id: "tx-seed-10",
        item_name: "Tempe Orek & Perkedel",
        quantity: 1,
        unit_price: 5000,
        subtotal: 5000,
      },
      {
        id: "it-1003",
        transaction_id: "tx-seed-10",
        item_name: "Es Jeruk Peras",
        quantity: 1,
        unit_price: 3000,
        subtotal: 3000,
      },
    ],
  },
  {
    id: "tx-seed-11",
    user_id: USER_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Nasi Goreng & Es Teh",
    total_amount: 23000,
    is_itemized: true,
    points_earned: 40,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(0),
    created_at: new Date(Date.now() - 7200000).toISOString(),
    items: [
      {
        id: "it-1101",
        transaction_id: "tx-seed-11",
        item_name: "Nasi Goreng Kampung",
        quantity: 1,
        unit_price: 15000,
        subtotal: 15000,
      },
      {
        id: "it-1102",
        transaction_id: "tx-seed-11",
        item_name: "Es Teh Manis Segar",
        quantity: 1,
        unit_price: 5000,
        subtotal: 5000,
      },
      {
        id: "it-1103",
        transaction_id: "tx-seed-11",
        item_name: "Kerupuk Udang",
        quantity: 1,
        unit_price: 3000,
        subtotal: 3000,
      },
    ],
  },
  {
    id: "tx-seed-12",
    user_id: USER_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Es Kopi Susu Kampus",
    total_amount: 16000,
    is_itemized: false,
    points_earned: 10,
    xp_earned: 15,
    transaction_date: getRelativeDateStr(0),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    items: [],
  },
  // Seed earlier month dates for rich Calendar Streak & Weekly Summary
  {
    id: "tx-seed-13",
    user_id: USER_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Sarapan Bubur Ayam & Teh Hangat",
    total_amount: 17000,
    is_itemized: true,
    points_earned: 35,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-8),
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    items: [
      {
        id: "it-1301",
        transaction_id: "tx-seed-13",
        item_name: "Bubur Ayam Komplit",
        quantity: 1,
        unit_price: 13000,
        subtotal: 13000,
      },
      {
        id: "it-1302",
        transaction_id: "tx-seed-13",
        item_name: "Teh Tawar Hangat",
        quantity: 1,
        unit_price: 4000,
        subtotal: 4000,
      },
    ],
  },
  {
    id: "tx-seed-14",
    user_id: USER_ID,
    type: "expense",
    category: "Kuliah/Alat Tulis",
    need_or_want: "need",
    title: "Jilid Makalah & Spidol",
    total_amount: 21000,
    is_itemized: true,
    points_earned: 35,
    xp_earned: 40,
    transaction_date: getRelativeDateStr(-10),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    items: [
      {
        id: "it-1401",
        transaction_id: "tx-seed-14",
        item_name: "Jilid Spiral Makalah",
        quantity: 1,
        unit_price: 12000,
        subtotal: 12000,
      },
      {
        id: "it-1402",
        transaction_id: "tx-seed-14",
        item_name: "Spidol Warna Stabilo",
        quantity: 1,
        unit_price: 9000,
        subtotal: 9000,
      },
    ],
  },
];

export const INITIAL_MISSIONS: MissionRecord[] = [
  {
    id: "mis-1",
    user_id: USER_ID,
    mission_type: "daily",
    title: "Detektif Struk",
    description:
      "Catat 1 pengeluaran hari ini dengan rincian minimal 2 item spesifik.",
    target_value: 1,
    current_value: 1,
    reward_points: 50,
    reward_xp: 40,
    is_claimed: false,
    valid_until: getRelativeDateStr(0),
  },
  {
    id: "mis-2",
    user_id: USER_ID,
    mission_type: "daily",
    title: "Rem Pakem",
    description:
      "Pengeluaran kategori Jajan/Wants hari ini di bawah 50% batas harian.",
    target_value: 1,
    current_value: 1,
    reward_points: 75,
    reward_xp: 50,
    is_claimed: false,
    valid_until: getRelativeDateStr(0),
  },
  {
    id: "mis-3",
    user_id: USER_ID,
    mission_type: "daily",
    title: "Jurnal Jujur",
    description: "Catat transaksi harianmu sebelum jam 21:00 WIB.",
    target_value: 1,
    current_value: 1,
    reward_points: 30,
    reward_xp: 25,
    is_claimed: false,
    valid_until: getRelativeDateStr(0),
  },
  {
    id: "mis-4",
    user_id: USER_ID,
    mission_type: "weekly",
    title: "Pahlawan Anggaran",
    description:
      "Selesaikan 7 hari penuh dengan total pengeluaran di bawah Budget Mingguan.",
    target_value: 7,
    current_value: 6,
    reward_points: 1000,
    reward_xp: 250,
    is_claimed: false,
    valid_until: getRelativeDateStr(2),
  },
  {
    id: "mis-5",
    user_id: USER_ID,
    mission_type: "saving_challenge",
    title: "Tabungan Akhir Bulan Rp350.000",
    description:
      "Pertahankan sisa uang saku minimal Rp350.000 hingga akhir bulan untuk masuk celengan.",
    target_value: 350000,
    current_value: 350000,
    reward_points: 1500,
    reward_xp: 300,
    is_claimed: false,
    valid_until: getRelativeDateStr(20),
  },
  {
    id: "mis-6",
    user_id: USER_ID,
    mission_type: "budget_challenge",
    title: "Tantangan Tanpa Boba Berlebih",
    description:
      "Batasi jajan minuman manis maksimal 5x minggu ini agar dompet tetap aman.",
    target_value: 5,
    current_value: 5,
    reward_points: 500,
    reward_xp: 150,
    is_claimed: false,
    valid_until: getRelativeDateStr(4),
  },
];

export const INITIAL_BADGES: UserBadgeRecord[] = [
  {
    id: "bdg-1",
    user_id: USER_ID,
    badge_code: "streak_7",
    badge_name: BADGE_META.streak_7.title,
    praise_quote:
      "Penabung Ulung: Konsistensimu mencatat 7 hari berturut-turut adalah awal dari kebebasan finansial!",
    unlocked_at: getRelativeDateStr(-2),
  },
  {
    id: "bdg-2",
    user_id: USER_ID,
    badge_code: "detail_master",
    badge_name: BADGE_META.detail_master.title,
    praise_quote:
      "Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat Mochi sangat bangga!",
    unlocked_at: getRelativeDateStr(-1),
  },
  {
    id: "bdg-3",
    user_id: USER_ID,
    badge_code: "budget_guardian",
    badge_name: BADGE_META.budget_guardian.title,
    praise_quote:
      "Hebat! Kamu selalu memikirkan kebutuhan utama sebelum keinginan sesaat.",
    unlocked_at: getRelativeDateStr(0),
  },
];

export const INITIAL_REDEMPTIONS: PointRedemptionRecord[] = [
  {
    id: "red-1",
    user_id: USER_ID,
    points_redeemed: 10000,
    rupiah_value: 10000,
    status: "approved",
    note: "Tukar poin buat tambahan beli buku catatan kuliah",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    approved_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "red-2",
    user_id: USER_ID,
    points_redeemed: 15000,
    rupiah_value: 15000,
    status: "pending",
    note: "Tukar poin rajin mencatat minggu ini buat ditabung ke celengan Mochi!",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    approved_at: null,
  },
];

interface BukuDompetState {
  // Active Session Role
  currentRole: UserRole;
  activeProfileId: string;

  // Data Entities
  profiles: ProfileData[];
  transactions: TransactionRecord[];
  missions: MissionRecord[];
  badges: UserBadgeRecord[];
  redemptions: PointRedemptionRecord[];

  // Gamification & UI State
  equippedMochiStage: MochiStage | null; // null means follow current user level stage automatically
  equippedTitle: string;
  streakFreezeDates: string[]; // Dates protected by Ice Shield
  zeroSpendDates: string[]; // Dates recorded as Rp0 Spend
  mysteryBoxCount: number;
  openedCheckpointWeeks: number[];
  isSandboxMode: boolean; // Admin simulation mode
  isProudComboActive: boolean;
  lastSupervisorCheerDate: string | null;
  supervisorCheersCount: number;

  // Modals & Drawers
  isTransactionDrawerOpen: boolean;
  isCashoutModalOpen: boolean;
  isStreakCalendarOpen: boolean;

  // FX & Celebrations
  rewardToast: FloatingRewardToast | null;
  particleBurstKey: number;
  particleBurstType: "coin" | "xp" | "both";
  celebrationModal: CelebrationModalState | null;
  supabaseConnected: boolean;

  // Actions
  loginWithPin: (
    role: UserRole,
    pin: string
  ) => { success: boolean; message?: string };
  switchRoleDirect: (role: UserRole) => void;
  setTransactionDrawerOpen: (open: boolean) => void;
  setCashoutModalOpen: (open: boolean) => void;
  setStreakCalendarOpen: (open: boolean) => void;
  clearRewardToast: () => void;
  closeCelebrationModal: () => void;
  triggerParticleBurst: (type?: "coin" | "xp" | "both") => void;
  toggleSandboxMode: () => void;

  // Pet Gallery Actions
  equipMochiStage: (stage: MochiStage | null) => void;
  equipSpecialTitle: (title: string) => void;
  petMochiForAffection: () => { xpEarned: number; leveledUp: boolean };
  buyStreakFreezeShield: () => { success: boolean; message: string };

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

  sendSupervisorCheer: () => {
    success: boolean;
    message: string;
  };

  updateBudgetSettings: (
    monthlyBudgetTarget: number,
    monthlySavingTarget: number
  ) => void;

  addCustomMission: (payload: {
    title: string;
    description: string;
    mission_type: MissionRecord["mission_type"];
    target_value: number;
    reward_points: number;
    reward_xp: number;
  }) => void;

  resetToDemoSeed: () => void;
  syncWithSupabaseIfAvailable: () => Promise<void>;
}

/**
 * Helper: Attempt non-blocking Supabase sync when credentials exist
 */
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

export const useBukuDompetStore = create<BukuDompetState>()(
  persist(
    (set, get) => ({
      currentRole: "user",
      activeProfileId: USER_ID,
      profiles: INITIAL_PROFILES,
      transactions: INITIAL_TRANSACTIONS,
      missions: INITIAL_MISSIONS,
      badges: INITIAL_BADGES,
      redemptions: INITIAL_REDEMPTIONS,
      equippedMochiStage: null,
      equippedTitle: "Penabung Cerdas",
      streakFreezeDates: [getRelativeDateStr(-6), getRelativeDateStr(-9)],
      zeroSpendDates: [getRelativeDateStr(-7)],
      mysteryBoxCount: 2,
      openedCheckpointWeeks: [],
      isSandboxMode: false,
      isProudComboActive: false,
      lastSupervisorCheerDate: null,
      supervisorCheersCount: 1,
      isTransactionDrawerOpen: false,
      isCashoutModalOpen: false,
      isStreakCalendarOpen: false,
      rewardToast: null,
      particleBurstKey: 0,
      particleBurstType: "both",
      celebrationModal: null,
      supabaseConnected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),

      loginWithPin: (role, pin) => {
        const profile = get().profiles.find((p) => p.role === role);
        if (!profile) {
          return { success: false, message: "Profil tidak ditemukan." };
        }
        if (profile.pin_code !== pin) {
          return {
            success: false,
            message: `PIN salah! (Petunjuk demo: ${profile.pin_code})`,
          };
        }
        set({
          currentRole: role,
          activeProfileId: profile.id,
        });
        return { success: true };
      },

      switchRoleDirect: (role) => {
        const profile = get().profiles.find((p) => p.role === role);
        if (profile) {
          set({ currentRole: role, activeProfileId: profile.id });
        }
      },

      setTransactionDrawerOpen: (open) =>
        set({ isTransactionDrawerOpen: open }),

      setCashoutModalOpen: (open) => set({ isCashoutModalOpen: open }),

      setStreakCalendarOpen: (open) => set({ isStreakCalendarOpen: open }),

      clearRewardToast: () => set({ rewardToast: null }),

      closeCelebrationModal: () => set({ celebrationModal: null }),

      triggerParticleBurst: (type = "both") =>
        set((s) => ({
          particleBurstKey: s.particleBurstKey + 1,
          particleBurstType: type,
        })),

      toggleSandboxMode: () =>
        set((s) => ({ isSandboxMode: !s.isSandboxMode })),

      equipMochiStage: (stage) => {
        set({
          equippedMochiStage: stage,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: stage
              ? `${MOCHI_STAGE_NAMES[stage]} Dipasang di Kamar!`
              : "Mode Evolusi Otomatis Aktif!",
            subtitle:
              "Wujud Mochi pilihanmu kini tampil di Beranda & Ruang Mochi.",
            points: 0,
            xp: 0,
          },
        });
      },

      equipSpecialTitle: (title) => {
        set({
          equippedTitle: title,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Gelar "${title}" Dipasang!`,
            subtitle: "Gelar kehormatanmu kini tampil di profil Mochi.",
            points: 0,
            xp: 0,
          },
        });
      },

      petMochiForAffection: () => {
        const state = get();
        const userProf =
          state.profiles.find((p) => p.role === "user") || state.profiles[0];
        const xpGain = 5;
        const oldLevel = getLevelFromXp(userProf.xp).level;
        const newXp = userProf.xp + xpGain;
        const newLevel = getLevelFromXp(newXp).level;
        const leveledUp = newLevel > oldLevel;

        set({
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "xp",
          profiles: state.profiles.map((p) =>
            p.role === "user" ? { ...p, xp: newXp, level: newLevel } : p
          ),
          celebrationModal: leveledUp
            ? {
                type: "level_up",
                title: `Level Up! Selamat Naik ke Lv.${newLevel}!`,
                subtitle: `Kasih sayang & kedisiplinanmu membuat ${
                  MOCHI_STAGE_NAMES[getMochiStageFromLevel(newLevel)]
                } semakin bersinar!`,
                newLevel,
                mochiStage: getMochiStageFromLevel(newLevel),
                rewardPoints: 100,
              }
            : state.celebrationModal,
        });

        return { xpEarned: xpGain, leveledUp };
      },

      buyStreakFreezeShield: () => {
        const state = get();
        const userProf =
          state.profiles.find((p) => p.role === "user") || state.profiles[0];
        const cost = 500;
        if (userProf.points_balance < cost) {
          return {
            success: false,
            message: "Poin belum cukup (butuh 500 Poin untuk 1 Perisai Es).",
          };
        }
        set({
          profiles: state.profiles.map((p) =>
            p.role === "user"
              ? {
                  ...p,
                  points_balance: p.points_balance - cost,
                  streak_freeze_count: p.streak_freeze_count + 1,
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Perisai Es Streak Freeze Dibeli!",
            subtitle: "+1 Perisai Es siap melindungi api streak harianmu!",
            points: 0,
            xp: 15,
          },
        });
        return {
          success: true,
          message: "Berhasil menukar 500 Poin menjadi +1 Perisai Es!",
        };
      },

      addTransaction: (payload) => {
        const state = get();
        const todayStr = payload.transaction_date || getRelativeDateStr(0);

        const todayTxCount = state.transactions.filter(
          (t) => t.transaction_date === todayStr
        ).length;

        const dailyCapReached = todayTxCount >= 5;

        const rawItems = payload.items || [];
        const comboCheck = validateItemizedCombo(rawItems);
        const isCombo = comboCheck.isValidCombo;

        let pointsEarned = 0;
        let xpEarned = 5;

        if (!dailyCapReached) {
          if (isCombo) {
            pointsEarned = comboCheck.pointsPreview;
            xpEarned = comboCheck.xpPreview;
          } else {
            pointsEarned = 10;
            xpEarned = 15;
          }
        }

        const userProf =
          state.profiles.find((p) => p.role === "user") || state.profiles[0];
        let streakBonusPoints = 0;
        let streakBonusXp = 0;
        let newStreak = userProf.current_streak;

        if (userProf.last_recorded_date !== todayStr) {
          streakBonusPoints = 25;
          streakBonusXp = 30;
          newStreak += 1;
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
          user_id: USER_ID,
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

        const oldLevel = getLevelFromXp(userProf.xp).level;
        const newXp = userProf.xp + totalXpEarned;
        const { level: newLevel } = getLevelFromXp(newXp);
        const leveledUp = newLevel > oldLevel;

        const earnedMysteryBoxFromXp =
          Math.floor(newXp / 500) > Math.floor(userProf.xp / 500) ? 1 : 0;

        const updatedMissions = state.missions.map((m) => {
          if (
            m.title === "Detektif Struk" &&
            isCombo &&
            m.current_value < m.target_value
          ) {
            return { ...m, current_value: m.target_value };
          }
          if (
            m.title === "Jurnal Jujur" &&
            m.current_value < m.target_value
          ) {
            return { ...m, current_value: m.target_value };
          }
          return m;
        });

        const hasDetailBadge = state.badges.some(
          (b) => b.badge_code === "detail_master"
        );
        const updatedBadges = [...state.badges];
        if (isCombo && !hasDetailBadge) {
          updatedBadges.push({
            id: `bdg-${Date.now()}`,
            user_id: USER_ID,
            badge_code: "detail_master",
            badge_name: BADGE_META.detail_master.title,
            praise_quote:
              "Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat Mochi sangat bangga!",
            unlocked_at: todayStr,
          });
        }

        set({
          transactions: [newTx, ...state.transactions],
          missions: updatedMissions,
          badges: updatedBadges,
          mysteryBoxCount: state.mysteryBoxCount + earnedMysteryBoxFromXp,
          isProudComboActive: isCombo,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.role === "user"
              ? {
                  ...p,
                  xp: newXp,
                  level: newLevel,
                  points_balance: p.points_balance + totalPointsEarned,
                  lifetime_points: p.lifetime_points + totalPointsEarned,
                  current_streak: newStreak,
                  longest_streak: Math.max(p.longest_streak, newStreak),
                  last_recorded_date: todayStr,
                }
              : p
          ),
          celebrationModal: leveledUp
            ? {
                type: "level_up",
                title: `Level Up! Kamu Naik ke Lv.${newLevel}!`,
                subtitle: `Konsistensimu mencatat kas membawa Mochi menuju tahap ${
                  MOCHI_STAGE_NAMES[getMochiStageFromLevel(newLevel)]
                }!`,
                newLevel,
                mochiStage: getMochiStageFromLevel(newLevel),
                rewardPoints: totalPointsEarned,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: isCombo
              ? "COMBO DETAIL! Misi Rinci Sukses!"
              : dailyCapReached
              ? "Catatan Tersimpan! (Batas Poin Harian 5/5)"
              : "Catatan Kas Tersimpan!",
            subtitle: isCombo
              ? `${formattedItems.length} item rincian tercatat dengan jujur!`
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

        if (!state.isSandboxMode) {
          trySupabaseInsert("transactions", {
            user_id: USER_ID,
            type: newTx.type,
            category: newTx.category,
            need_or_want: newTx.need_or_want,
            title: newTx.title,
            total_amount: newTx.total_amount,
            is_itemized: newTx.is_itemized,
            points_earned: newTx.points_earned,
            xp_earned: newTx.xp_earned,
            transaction_date: newTx.transaction_date,
          });
        }

        return {
          pointsEarned: totalPointsEarned,
          xpEarned: totalXpEarned,
          isCombo,
          dailyCapReached,
        };
      },

      recordZeroSpendDay: () => {
        const state = get();
        const todayStr = getRelativeDateStr(0);
        const userProf =
          state.profiles.find((p) => p.role === "user") || state.profiles[0];

        const points = 25;
        const xp = 30;
        const oldLevel = getLevelFromXp(userProf.xp).level;
        const newXp = userProf.xp + xp;
        const { level: newLevel } = getLevelFromXp(newXp);
        const leveledUp = newLevel > oldLevel;

        const newStreak =
          userProf.last_recorded_date === todayStr
            ? userProf.current_streak
            : userProf.current_streak + 1;

        const hasNoSpendBadge = state.badges.some(
          (b) => b.badge_code === "no_spend_hero"
        );
        const updatedBadges = [...state.badges];
        if (!hasNoSpendBadge) {
          updatedBadges.push({
            id: `bdg-nospend-${Date.now()}`,
            user_id: USER_ID,
            badge_code: "no_spend_hero",
            badge_name: BADGE_META.no_spend_hero.title,
            praise_quote:
              "Master Puasa Jajan! Hari tanpa pengeluaran impulsif membuat tabunganmu melesat cepat!",
            unlocked_at: todayStr,
          });
        }

        const nextZeroSpendDates = state.zeroSpendDates.includes(todayStr)
          ? state.zeroSpendDates
          : [...state.zeroSpendDates, todayStr];

        set({
          badges: updatedBadges,
          zeroSpendDates: nextZeroSpendDates,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.role === "user"
              ? {
                  ...p,
                  xp: newXp,
                  level: newLevel,
                  points_balance: p.points_balance + points,
                  lifetime_points: p.lifetime_points + points,
                  current_streak: newStreak,
                  longest_streak: Math.max(p.longest_streak, newStreak),
                  last_recorded_date: todayStr,
                }
              : p
          ),
          celebrationModal: !hasNoSpendBadge
            ? {
                type: "badge_unlocked",
                title: "Lencana Baru Terbuka: Master Puasa Jajan!",
                subtitle:
                  "Berhasil melewati hari tanpa jajan impulsif! +25 Poin & +30 XP!",
                badgeId: "no_spend_hero",
                rewardPoints: points,
              }
            : leveledUp
            ? {
                type: "level_up",
                title: `Level Up! Kamu Naik ke Lv.${newLevel}!`,
                subtitle: "Puasa jajanmu membuat Mochi berevolusi makin keren!",
                newLevel,
                mochiStage: getMochiStageFromLevel(newLevel),
                rewardPoints: points,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Hari Ini Rp0 Pengeluaran!",
            subtitle: "Streak harian terjaga & lencana Master Puasa Jajan aktif!",
            points,
            xp,
            isCombo: true,
          },
        });

        return { alreadyRecorded: false, pointsEarned: points, xpEarned: xp };
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

        const userProf =
          state.profiles.find((p) => p.role === "user") || state.profiles[0];
        const oldLevel = getLevelFromXp(userProf.xp).level;
        const newXp = userProf.xp + mission.reward_xp;
        const { level: newLevel } = getLevelFromXp(newXp);
        const leveledUp = newLevel > oldLevel;

        set({
          missions: state.missions.map((m) =>
            m.id === missionId ? { ...m, is_claimed: true } : m
          ),
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.role === "user"
              ? {
                  ...p,
                  xp: newXp,
                  level: newLevel,
                  points_balance: p.points_balance + mission.reward_points,
                  lifetime_points: p.lifetime_points + mission.reward_points,
                }
              : p
          ),
          celebrationModal: leveledUp
            ? {
                type: "level_up",
                title: `Level Up! Selamat Naik ke Lv.${newLevel}!`,
                subtitle: `Misi "${mission.title}" tuntas dan mengantar Mochi ke level baru!`,
                newLevel,
                mochiStage: getMochiStageFromLevel(newLevel),
                rewardPoints: mission.reward_points,
              }
            : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Misi "${mission.title}" Selesai!`,
            subtitle: "Hadiah poin langsung masuk ke Dompet Poinmu!",
            points: mission.reward_points,
            xp: mission.reward_xp,
            isCombo: true,
          },
        });

        return {
          success: true,
          points: mission.reward_points,
          xp: mission.reward_xp,
        };
      },

      openMysteryBox: () => {
        const state = get();
        if (state.mysteryBoxCount <= 0) {
          return {
            success: false,
            rewardType: "points",
            amount: 0,
            label: "Belum ada Mystery Box yang tersedia.",
          };
        }

        const roll = Math.random() * 100;
        let rewardType: "points" | "shield" | "jackpot" = "points";
        let amount = 250;
        let label = "+250 Poin (Rp250)";

        if (roll < 5) {
          rewardType = "jackpot";
          amount = 1500;
          label = "JACKPOT SULTAN! +1.500 Poin (Rp1.500)!";
        } else if (roll < 15) {
          rewardType = "shield";
          amount = 1;
          label = "+1x Perisai Es Streak Freeze!";
        } else if (roll < 40) {
          rewardType = "points";
          amount = 500;
          label = "Hadiah Langka! +500 Poin (Rp500)!";
        } else {
          rewardType = "points";
          amount = Math.floor(150 + Math.random() * 151);
          label = `Berkah Celengan! +${amount} Poin (Rp${amount})!`;
        }

        set({
          mysteryBoxCount: state.mysteryBoxCount - 1,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: rewardType === "shield" ? "xp" : "both",
          profiles: state.profiles.map((p) => {
            if (p.role !== "user") return p;
            if (rewardType === "shield") {
              return {
                ...p,
                streak_freeze_count: p.streak_freeze_count + 1,
              };
            }
            return {
              ...p,
              points_balance: p.points_balance + amount,
              lifetime_points: p.lifetime_points + amount,
            };
          }),
          celebrationModal:
            rewardType === "jackpot"
              ? {
                  type: "milestone",
                  title: "JACKPOT PETI MISTERI!",
                  subtitle: label,
                  rewardPoints: amount,
                }
              : state.celebrationModal,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Peti Harta Gacha Terbuka!",
            subtitle: label,
            points: rewardType === "shield" ? 0 : amount,
            xp: 50,
            isCombo: true,
          },
        });

        return { success: true, rewardType, amount, label };
      },

      claimWeeklyCheckpointChest: (weekNumber) => {
        const state = get();
        if (state.openedCheckpointWeeks.includes(weekNumber)) {
          return { success: false, points: 0 };
        }
        const bonusPoints = 350;
        set({
          openedCheckpointWeeks: [...state.openedCheckpointWeeks, weekNumber],
          mysteryBoxCount: state.mysteryBoxCount + 1,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.role === "user"
              ? {
                  ...p,
                  points_balance: p.points_balance + bonusPoints,
                  lifetime_points: p.lifetime_points + bonusPoints,
                }
              : p
          ),
          celebrationModal: {
            type: "milestone",
            title: `Peti Checkpoint Minggu Ke-${weekNumber} Terbuka!`,
            subtitle:
              "Selamat! Kamu mendapatkan +350 Poin (Rp350) & +1x Mystery Box Gacha!",
            rewardPoints: bonusPoints,
          },
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: `Peti Checkpoint Minggu Ke-${weekNumber}!`,
            subtitle: "Kamu dapat +350 Poin & +1x Mystery Box Gacha!",
            points: bonusPoints,
            xp: 60,
            isCombo: true,
          },
        });
        return { success: true, points: bonusPoints };
      },

      requestPointCashout: (points, note) => {
        const state = get();
        const userProf =
          state.profiles.find((p) => p.role === "user") || state.profiles[0];

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
          user_id: USER_ID,
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
            p.role === "user"
              ? { ...p, points_balance: p.points_balance - points }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Tiket Emas Pencairan Dibuat!",
            subtitle: `Menunggu persetujuan Abang/Orang Tua sebesar Rp${points.toLocaleString(
              "id-ID"
            )}.`,
            points: 0,
            xp: 20,
          },
        });

        trySupabaseInsert("point_redemptions", {
          user_id: USER_ID,
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
            user_id: USER_ID,
            type: "income",
            category: "Hadiah Tukar Poin Gamifikasi",
            need_or_want: "income",
            title: `Hadiah Tukar Poin Gamifikasi (${target.points_redeemed.toLocaleString(
              "id-ID"
            )} Poin)`,
            total_amount: target.rupiah_value,
            is_itemized: false,
            points_earned: 0,
            xp_earned: 50,
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
              )} otomatis masuk sebagai pemasukan di Buku Kas Adik!`,
              points: target.points_redeemed,
              xp: 50,
              isCombo: true,
            },
          });
        } else {
          set({
            redemptions: updatedRedemptions,
            profiles: state.profiles.map((p) =>
              p.role === "user"
                ? {
                    ...p,
                    points_balance: p.points_balance + target.points_redeemed,
                  }
                : p
            ),
          });
        }
      },

      sendSupervisorCheer: () => {
        const state = get();
        const todayStr = getRelativeDateStr(0);
        if (state.lastSupervisorCheerDate === todayStr) {
          return {
            success: false,
            message:
              "Stiker semangat hari ini sudah dikirim! Bisa kirim lagi besok ya",
          };
        }

        const bonus = 50;
        set({
          lastSupervisorCheerDate: todayStr,
          supervisorCheersCount: state.supervisorCheersCount + 1,
          particleBurstKey: state.particleBurstKey + 1,
          particleBurstType: "both",
          profiles: state.profiles.map((p) =>
            p.role === "user"
              ? {
                  ...p,
                  points_balance: p.points_balance + bonus,
                  lifetime_points: p.lifetime_points + bonus,
                  xp: p.xp + 30,
                }
              : p
          ),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Stiker Semangat Orang Tua Terkirim!",
            subtitle: "Adik mendapat tambahan +50 Poin (Rp50) & +30 XP!",
            points: bonus,
            xp: 30,
            isCombo: true,
          },
        });

        return {
          success: true,
          message:
            "Stiker Semangat & Bonus +50 Poin berhasil dikirim ke layar Adik!",
        };
      },

      updateBudgetSettings: (monthlyBudgetTarget, monthlySavingTarget) => {
        set((state) => ({
          profiles: state.profiles.map((p) => ({
            ...p,
            monthly_budget_target: monthlyBudgetTarget,
            monthly_saving_target: monthlySavingTarget,
          })),
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Target Anggaran Diperbarui!",
            subtitle: `Jatah Bulanan: Rp${monthlyBudgetTarget.toLocaleString(
              "id-ID"
            )} | Target Tabungan: Rp${monthlySavingTarget.toLocaleString(
              "id-ID"
            )}`,
            points: 0,
            xp: 0,
          },
        }));
      },

      addCustomMission: (payload) => {
        const newMission: MissionRecord = {
          id: `mis-custom-${Date.now()}`,
          user_id: USER_ID,
          mission_type: payload.mission_type,
          title: payload.title,
          description: payload.description,
          target_value: payload.target_value,
          current_value: payload.target_value,
          reward_points: payload.reward_points,
          reward_xp: payload.reward_xp,
          is_claimed: false,
          valid_until: getRelativeDateStr(7),
        };
        set((state) => ({
          missions: [newMission, ...state.missions],
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Misi Baru Ditambahkan!",
            subtitle: `${payload.title} (+${payload.reward_points} Poin)`,
            points: payload.reward_points,
            xp: payload.reward_xp,
          },
        }));
      },

      resetToDemoSeed: () => {
        set({
          profiles: INITIAL_PROFILES,
          transactions: INITIAL_TRANSACTIONS,
          missions: INITIAL_MISSIONS,
          badges: INITIAL_BADGES,
          redemptions: INITIAL_REDEMPTIONS,
          equippedMochiStage: null,
          equippedTitle: "Penabung Cerdas",
          streakFreezeDates: [getRelativeDateStr(-6), getRelativeDateStr(-9)],
          zeroSpendDates: [getRelativeDateStr(-7)],
          mysteryBoxCount: 2,
          openedCheckpointWeeks: [],
          lastSupervisorCheerDate: null,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Data Demo Direset!",
            subtitle: "Seluruh data kembali ke kondisi awal yang segar.",
            points: 0,
            xp: 0,
          },
        });
      },

      syncWithSupabaseIfAvailable: async () => {
        if (
          typeof window === "undefined" ||
          !process.env.NEXT_PUBLIC_SUPABASE_URL
        ) {
          return;
        }
        try {
          const supabase = createSupabaseBrowserClient();
          const { data: profs, error } = await supabase
            .from("profiles")
            .select("*");
          if (!error && profs && profs.length > 0) {
            set({ supabaseConnected: true });
          }
        } catch {
          // Local store remains authoritative fallback
        }
      },
    }),
    {
      name: "bukudompet-cozy-storage-v2",
      partialize: (state) => ({
        currentRole: state.currentRole,
        activeProfileId: state.activeProfileId,
        profiles: state.profiles,
        transactions: state.transactions,
        missions: state.missions,
        badges: state.badges,
        redemptions: state.redemptions,
        equippedMochiStage: state.equippedMochiStage,
        equippedTitle: state.equippedTitle,
        streakFreezeDates: state.streakFreezeDates,
        zeroSpendDates: state.zeroSpendDates,
        mysteryBoxCount: state.mysteryBoxCount,
        openedCheckpointWeeks: state.openedCheckpointWeeks,
        isSandboxMode: state.isSandboxMode,
        lastSupervisorCheerDate: state.lastSupervisorCheerDate,
        supervisorCheersCount: state.supervisorCheersCount,
      }),
    }
  )
);

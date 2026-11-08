"use client";

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
} from "@/lib/spending-detective";
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
}

function getRelativeDateStr(daysOffset: number): string {
  // Zona waktu lokal (bukan UTC) agar pergantian hari tepat tengah malam waktu pengguna.
  return localDateStr(daysOffset);
}

export const USER_1_ID = "11111111-1111-4111-8111-111111111111"; // Adik Rara
export const USER_2_ID = "11111111-1111-4111-8111-222222222222"; // Adik Bima
export const USER_3_ID = "11111111-1111-4111-8111-333333333333"; // Sepupu Citra
export const SUPERVISOR_1_ID = "22222222-2222-4222-8222-222222222222"; // Ayah & Ibu
export const SUPERVISOR_2_ID = "22222222-2222-4222-8222-333333333333"; // Bibi Ratna (Wali)
export const ADMIN_ID = "99999999-9999-4999-8999-999999999999"; // Abang Admin
export const SCHOOLCHILD_1_ID = "11111111-1111-4111-8111-444444444444"; // Adik Kecil (Kelas 3 SD)

export const INITIAL_SUPERVISOR_ASSIGNMENTS: SupervisorAssignment[] = [
  // Ayah & Ibu memantau Adik Rara & Adik Bima
  { supervisorId: SUPERVISOR_1_ID, userId: USER_1_ID },
  { supervisorId: SUPERVISOR_1_ID, userId: USER_2_ID },
  // Bibi Ratna (Wali) memantau Sepupu Citra & Adik Rara
  { supervisorId: SUPERVISOR_2_ID, userId: USER_3_ID },
  { supervisorId: SUPERVISOR_2_ID, userId: USER_1_ID },
  // Orang Tua juga memantau Adik Kecil (Kelas 3 SD)
  { supervisorId: SUPERVISOR_1_ID, userId: SCHOOLCHILD_1_ID },
];

export const INITIAL_PROFILES: ProfileData[] = [
  {
    id: USER_1_ID,
    username: "adik",
    display_name: "Adik Rara (Mahasiswi)",
    role: "user",
    pin_code: "1111",
    avatar_theme: "mochi-cat",
    xp: 630,
    level: 6,
    currentStage: 3, // Balita Gembul (Menuju Stage 4: butuh 1800 Stage XP & 25 Hari)
    stageXp: 540,
    stageRecordedDays: 8,
    petCustomName: "Mochi",
    activeSpecies: "chubby_cat",
    unlockedSpecies: ["chubby_cat"],
    ownedPets: {
      chubby_cat: {
        species: "chubby_cat",
        customName: "Mochi",
        currentStage: 3,
        stageXp: 540,
        stageRecordedDays: 8,
        unlockedAt: getRelativeDateStr(-8),
      },
    },
    ownedAccessories: [
      "head_straw_hat",
      "outfit_tee",
      "prop_patched_cardboard",
      "bg_warm_room",
      "head_pastel_ribbon",
      "outfit_knit_sweater",
      "neck_knit_scarf",
      "face_round_glasses",
    ],
    equippedAccessories: {
      head: "head_pastel_ribbon",
      outfit: "outfit_knit_sweater",
      neck: "neck_knit_scarf",
      background: "bg_warm_room",
    },
    claimedPathMilestones: [],
    supervisorCheers: [
      {
        id: "cheer-seed-1",
        fromSupervisorName: "Ayah & Ibu (Orang Tua)",
        stickerLabel: "Stiker Bintang Kebanggaan Keluarga",
        message: "Bangga banget lihat catatan kas Rara minggu ini rapi & jujur!",
        sentAt: getRelativeDateStr(-1),
      },
    ],
    points_balance: 3260,
    lifetime_points: 5260,
    current_streak: 8,
    longest_streak: 9,
    streak_freeze_count: 2,
    last_recorded_date: getRelativeDateStr(0),
    last_daily_claim_date: getRelativeDateStr(-1),
    monthly_budget_target: 1800000,
    monthly_saving_target: 350000,
  },
  {
    id: USER_2_ID,
    username: "bima",
    display_name: "Adik Bima (SMA)",
    role: "user",
    pin_code: "1212",
    avatar_theme: "mochi-capybara",
    xp: 1450,
    level: 12,
    currentStage: 4, // Anak Ceria
    stageXp: 620,
    stageRecordedDays: 10,
    petCustomName: "Yuzu",
    activeSpecies: "capybara_chill",
    unlockedSpecies: ["chubby_cat", "capybara_chill"],
    ownedPets: {
      chubby_cat: {
        species: "chubby_cat",
        customName: "Mochi",
        currentStage: 2,
        stageXp: 180,
        stageRecordedDays: 4,
        unlockedAt: getRelativeDateStr(-15),
      },
      capybara_chill: {
        species: "capybara_chill",
        customName: "Yuzu",
        currentStage: 4,
        stageXp: 620,
        stageRecordedDays: 10,
        unlockedAt: getRelativeDateStr(-10),
      },
    },
    ownedAccessories: [
      "head_straw_hat",
      "head_grad_cap",
      "outfit_cozy_hoodie",
      "prop_matcha_boba",
      "face_round_glasses",
      "bg_warm_room",
    ],
    equippedAccessories: {
      head: "head_grad_cap",
      outfit: "outfit_cozy_hoodie",
      prop: "prop_matcha_boba",
      face: "face_round_glasses",
    },
    claimedPathMilestones: [7],
    supervisorCheers: [],
    points_balance: 2400,
    lifetime_points: 5400,
    current_streak: 10,
    longest_streak: 14,
    streak_freeze_count: 2,
    last_recorded_date: getRelativeDateStr(0),
    last_daily_claim_date: getRelativeDateStr(-1),
    monthly_budget_target: 1200000,
    monthly_saving_target: 250000,
  },
  {
    id: USER_3_ID,
    username: "citra",
    display_name: "Sepupu Citra (Kos Baru)",
    role: "user",
    pin_code: "1313",
    avatar_theme: "mochi-fox",
    xp: 140,
    level: 2,
    currentStage: 1, // Telur Ajaib (Menuju Stage 2: butuh 350 Stage XP & 7 Hari)
    stageXp: 140,
    stageRecordedDays: 3,
    petCustomName: "Stroberi",
    activeSpecies: "lop_bunny",
    unlockedSpecies: ["chubby_cat", "lop_bunny"],
    ownedPets: {
      chubby_cat: {
        species: "chubby_cat",
        customName: "Mochi",
        currentStage: 2,
        stageXp: 90,
        stageRecordedDays: 2,
        unlockedAt: getRelativeDateStr(-7),
      },
      lop_bunny: {
        species: "lop_bunny",
        customName: "Stroberi",
        currentStage: 1,
        stageXp: 140,
        stageRecordedDays: 3,
        unlockedAt: getRelativeDateStr(-3),
      },
    },
    ownedAccessories: ["head_straw_hat", "prop_patched_cardboard"],
    equippedAccessories: {
      head: "head_straw_hat",
      prop: "prop_patched_cardboard",
    },
    claimedPathMilestones: [],
    supervisorCheers: [],
    points_balance: 620,
    lifetime_points: 620,
    current_streak: 3,
    longest_streak: 3,
    streak_freeze_count: 1,
    last_recorded_date: getRelativeDateStr(0),
    last_daily_claim_date: getRelativeDateStr(-1),
    monthly_budget_target: 1500000,
    monthly_saving_target: 300000,
  },
  {
    id: SCHOOLCHILD_1_ID,
    username: "adik_sd",
    display_name: "Adik Kecil (Kelas 3 SD)",
    role: "schoolchild",
    pin_code: "3333",
    avatar_theme: "mochi-cat",
    xp: 180,
    level: 2,
    currentStage: 2, // Menetas Imut
    stageXp: 120,
    stageRecordedDays: 3,
    petCustomName: "Kumo",
    activeSpecies: "hamster_cheek",
    unlockedSpecies: ["hamster_cheek"],
    ownedPets: {
      hamster_cheek: {
        species: "hamster_cheek",
        customName: "Kumo",
        currentStage: 2,
        stageXp: 120,
        stageRecordedDays: 3,
        unlockedAt: getRelativeDateStr(-4),
      },
    },
    ownedAccessories: ["head_straw_hat", "bg_warm_room"],
    equippedAccessories: { head: "head_straw_hat", background: "bg_warm_room" },
    claimedPathMilestones: [],
    supervisorCheers: [],
    points_balance: 90,
    lifetime_points: 90,
    current_streak: 4,
    longest_streak: 4,
    streak_freeze_count: 1,
    // Kemarin sudah menulis cerita -> hari ini belum, jadi beranda menampilkan pengingat.
    last_recorded_date: getRelativeDateStr(-1),
    monthly_budget_target: 150000,
    monthly_saving_target: 50000,
  },
  {
    id: SUPERVISOR_1_ID,
    username: "orangtua",
    display_name: "Ayah & Ibu (Orang Tua)",
    role: "supervisor",
    pin_code: "2222",
    avatar_theme: "mochi-parent",
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
        unlockedAt: getRelativeDateStr(0),
      },
    },
    ownedAccessories: [],
    equippedAccessories: {},
    claimedPathMilestones: [],
    supervisorCheers: [],
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
    id: SUPERVISOR_2_ID,
    username: "wali",
    display_name: "Bibi Ratna (Wali Kos)",
    role: "supervisor",
    pin_code: "3333",
    avatar_theme: "mochi-guardian",
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
        unlockedAt: getRelativeDateStr(0),
      },
    },
    ownedAccessories: [],
    equippedAccessories: {},
    claimedPathMilestones: [],
    supervisorCheers: [],
    points_balance: 0,
    lifetime_points: 0,
    current_streak: 0,
    longest_streak: 0,
    streak_freeze_count: 0,
    last_recorded_date: getRelativeDateStr(0),
    monthly_budget_target: 1500000,
    monthly_saving_target: 300000,
  },
  {
    id: ADMIN_ID,
    username: "abang",
    display_name: "Abang (Admin & Sponsor Poin)",
    role: "admin",
    pin_code: "9999",
    avatar_theme: "mochi-boss",
    xp: 3500,
    level: 18,
    currentStage: 6,
    stageXp: 1200,
    stageRecordedDays: 22,
    petCustomName: "Sultan Rusty",
    activeSpecies: "red_panda",
    unlockedSpecies: [
      "chubby_cat",
      "hamster_cheek",
      "lop_bunny",
      "capybara_chill",
      "red_panda",
    ],
    ownedPets: {
      chubby_cat: {
        species: "chubby_cat",
        customName: "Mochi",
        currentStage: 4,
        stageXp: 400,
        stageRecordedDays: 10,
        unlockedAt: getRelativeDateStr(-30),
      },
      red_panda: {
        species: "red_panda",
        customName: "Sultan Rusty",
        currentStage: 6,
        stageXp: 1200,
        stageRecordedDays: 22,
        unlockedAt: getRelativeDateStr(-20),
      },
    },
    ownedAccessories: [
      "head_top_hat",
      "outfit_boss_suit",
      "prop_pastel_scooter",
      "aura_sparkle_stars",
      "bg_gold_vault",
    ],
    equippedAccessories: {
      head: "head_top_hat",
      outfit: "outfit_boss_suit",
      prop: "prop_pastel_scooter",
    },
    claimedPathMilestones: [7, 14],
    supervisorCheers: [],
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
  // === TRANSAKSI ADIK RARA (USER_1_ID — Perjalanan sejak Hari ke-1 = H-7 s/d Hari ke-8 = Hari Ini) ===
  {
    id: "tx-seed-0a",
    user_id: USER_1_ID,
    type: "income",
    category: "Uang Saku Bulanan",
    need_or_want: "income",
    title: "Transfer Uang Saku Bulanan dari Orang Tua",
    total_amount: 1800000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-7),
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-0b",
    user_id: USER_1_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Sarapan Bubur Ayam & Teh Hangat",
    total_amount: 17000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
    transaction_date: getRelativeDateStr(-7),
    created_at: new Date(Date.now() - 7 * 86400000 + 3600000).toISOString(),
    items: [
      {
        id: "it-001",
        transaction_id: "tx-seed-0b",
        item_name: "Bubur Ayam Komplit",
        quantity: 1,
        unit_price: 13000,
        subtotal: 13000,
      },
      {
        id: "it-002",
        transaction_id: "tx-seed-0b",
        item_name: "Teh Manis Hangat",
        quantity: 1,
        unit_price: 4000,
        subtotal: 4000,
      },
    ],
  },
  {
    id: "tx-seed-0c",
    user_id: USER_1_ID,
    type: "expense",
    category: "Transportasi",
    need_or_want: "need",
    title: "Isi Saldo Kartu KRL & Busway",
    total_amount: 25000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-6),
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-2",
    user_id: USER_1_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Kantin & Air Mineral",
    total_amount: 24000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
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
    user_id: USER_1_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Es Kopi Susu Gula Aren",
    total_amount: 19000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-5),
    created_at: new Date(Date.now() - 5 * 86400000 + 7200000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-4",
    user_id: USER_1_ID,
    type: "expense",
    category: "Kuliah/Alat Tulis",
    need_or_want: "need",
    title: "Beli Alat Tulis & Fotokopi Modul",
    total_amount: 31000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
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
    user_id: USER_1_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Kopi Kenangan Mantan",
    total_amount: 22000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-4),
    created_at: new Date(Date.now() - 4 * 86400000 + 3600000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-6",
    user_id: USER_1_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Malam Warung Pak Kumis",
    total_amount: 23000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
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
    user_id: USER_1_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Matcha Latte Dingin",
    total_amount: 21000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-3),
    created_at: new Date(Date.now() - 3 * 86400000 + 5400000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-8",
    user_id: USER_1_ID,
    type: "expense",
    category: "Transportasi",
    need_or_want: "need",
    title: "Naik KRL & Ojek Stasiun",
    total_amount: 18000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
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
    user_id: USER_1_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Boba Brown Sugar Fresh Milk",
    total_amount: 24000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-2),
    created_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    items: [],
  },
  {
    id: "tx-seed-10",
    user_id: USER_1_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Warteg Bahari",
    total_amount: 22000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
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
    user_id: USER_1_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Nasi Goreng & Es Teh",
    total_amount: 23000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
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
    user_id: USER_1_ID,
    type: "expense",
    category: "Kopi/Minuman",
    need_or_want: "want",
    title: "Es Kopi Susu Kampus",
    total_amount: 16000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(0),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    items: [],
  },

  // === TRANSAKSI ADIK BIMA (USER_2_ID) ===
  {
    id: "tx-bima-1",
    user_id: USER_2_ID,
    type: "income",
    category: "Uang Saku Bulanan",
    need_or_want: "income",
    title: "Uang Saku Sekolah Bulanan Bima",
    total_amount: 1200000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-4),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    items: [],
  },
  {
    id: "tx-bima-2",
    user_id: USER_2_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Makan Siang Kantin SMA & Susu Kotak",
    total_amount: 21000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
    transaction_date: getRelativeDateStr(0),
    created_at: new Date(Date.now() - 5400000).toISOString(),
    items: [
      {
        id: "it-bima-201",
        transaction_id: "tx-bima-2",
        item_name: "Soto Ayam Kantin",
        quantity: 1,
        unit_price: 15000,
        subtotal: 15000,
      },
      {
        id: "it-bima-202",
        transaction_id: "tx-bima-2",
        item_name: "Susu UHT Coklat",
        quantity: 1,
        unit_price: 6000,
        subtotal: 6000,
      },
    ],
  },
  {
    id: "tx-bima-3",
    user_id: USER_2_ID,
    type: "expense",
    category: "Kuliah/Alat Tulis",
    need_or_want: "need",
    title: "Beli Buku Latihan Olimpiade & Jangka",
    total_amount: 45000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
    transaction_date: getRelativeDateStr(-1),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: [
      {
        id: "it-bima-301",
        transaction_id: "tx-bima-3",
        item_name: "Buku Soal Matematika",
        quantity: 1,
        unit_price: 32000,
        subtotal: 32000,
      },
      {
        id: "it-bima-302",
        transaction_id: "tx-bima-3",
        item_name: "Jangka Besi & Penggaris",
        quantity: 1,
        unit_price: 13000,
        subtotal: 13000,
      },
    ],
  },

  // === TRANSAKSI SEPUPU CITRA (USER_3_ID) ===
  {
    id: "tx-citra-1",
    user_id: USER_3_ID,
    type: "income",
    category: "Uang Saku Bulanan",
    need_or_want: "income",
    title: "Kiriman Bulanan Kos Citra",
    total_amount: 1500000,
    is_itemized: false,
    points_earned: 5,
    xp_earned: 10,
    transaction_date: getRelativeDateStr(-3),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [],
  },
  {
    id: "tx-citra-2",
    user_id: USER_3_ID,
    type: "expense",
    category: "Makan Pokok",
    need_or_want: "need",
    title: "Belanja Sayur & Telur Masak di Kos",
    total_amount: 28000,
    is_itemized: true,
    points_earned: 10,
    xp_earned: 20,
    transaction_date: getRelativeDateStr(0),
    created_at: new Date(Date.now() - 4200000).toISOString(),
    items: [
      {
        id: "it-citra-201",
        transaction_id: "tx-citra-2",
        item_name: "Telur Ayam 1/2 Kg",
        quantity: 1,
        unit_price: 16000,
        subtotal: 16000,
      },
      {
        id: "it-citra-202",
        transaction_id: "tx-citra-2",
        item_name: "Sayur Bayam & Tempe",
        quantity: 1,
        unit_price: 12000,
        subtotal: 12000,
      },
    ],
  },
];

export const INITIAL_MISSIONS: MissionRecord[] = [
  {
    id: "mis-1",
    user_id: USER_1_ID,
    mission_type: "daily",
    title: "Detektif Struk Harian",
    description:
      "Catat 1 pengeluaran hari ini dengan rincian minimal 2 sub-item spesifik.",
    target_value: 1,
    current_value: 1,
    reward_points: 15,
    reward_xp: 25,
    is_claimed: false,
    valid_until: getRelativeDateStr(0),
  },
  {
    id: "mis-2",
    user_id: USER_1_ID,
    mission_type: "daily",
    title: "Rem Pakem Harian",
    description:
      "Pengeluaran kategori Jajan/Wants hari ini di bawah 50% batas harian.",
    target_value: 1,
    current_value: 1,
    reward_points: 15,
    reward_xp: 25,
    is_claimed: false,
    valid_until: getRelativeDateStr(0),
  },
  {
    id: "mis-3",
    user_id: USER_1_ID,
    mission_type: "daily",
    title: "Jurnal Jujur",
    description: "Catat transaksi harianmu sebelum jam 21:00 WIB.",
    target_value: 1,
    current_value: 1,
    reward_points: 15,
    reward_xp: 25,
    is_claimed: false,
    valid_until: getRelativeDateStr(0),
  },
  {
    id: "mis-4",
    user_id: USER_1_ID,
    mission_type: "weekly",
    title: "Evaluasi Anggaran Mingguan",
    description:
      "Selesaikan 7 hari penuh dengan total pengeluaran di bawah Budget Mingguan.",
    target_value: 7,
    current_value: 6,
    reward_points: 150,
    reward_xp: 120,
    is_claimed: false,
    valid_until: getRelativeDateStr(2),
  },
  {
    id: "mis-5",
    user_id: USER_1_ID,
    mission_type: "saving_challenge",
    title: "Disiplin Tabungan Rp350.000",
    description:
      "Pertahankan sisa uang saku minimal Rp350.000 hingga akhir bulan untuk masuk celengan.",
    target_value: 350000,
    current_value: 350000,
    reward_points: 150,
    reward_xp: 120,
    is_claimed: false,
    valid_until: getRelativeDateStr(20),
  },
  {
    id: "mis-6",
    user_id: USER_1_ID,
    mission_type: "budget_challenge",
    title: "Evaluasi Mingguan Tanpa Boros Minuman",
    description:
      "Batasi jajan minuman manis maksimal 5x minggu ini agar dompet tetap aman.",
    target_value: 5,
    current_value: 5,
    reward_points: 150,
    reward_xp: 120,
    is_claimed: false,
    valid_until: getRelativeDateStr(4),
  },
];

export const INITIAL_BADGES: UserBadgeRecord[] = [
  {
    id: "bdg-1",
    user_id: USER_1_ID,
    badge_code: "streak_7",
    badge_name: BADGE_META.streak_7.title,
    praise_quote:
      "Penabung Ulung: Konsistensimu mencatat 7 hari berturut-turut adalah awal dari kebebasan finansial!",
    unlocked_at: getRelativeDateStr(-2),
  },
  {
    id: "bdg-2",
    user_id: USER_1_ID,
    badge_code: "detail_master",
    badge_name: BADGE_META.detail_master.title,
    praise_quote:
      "Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat pet kesayanganmu sangat bangga!",
    unlocked_at: getRelativeDateStr(-1),
  },
  {
    id: "bdg-3",
    user_id: USER_1_ID,
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
    user_id: USER_1_ID,
    points_redeemed: 1000,
    rupiah_value: 1000,
    status: "approved",
    note: "Tukar poin konsistensi buat tambahan tabungan buku kuliah",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    approved_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "red-2",
    user_id: USER_1_ID,
    points_redeemed: 1500,
    rupiah_value: 1500,
    status: "pending",
    note: "Tukar poin rajin mencatat minggu ini buat ditabung ke celengan!",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    approved_at: null,
  },
];

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
  isSandboxMode: boolean;
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
  /** Tombol uji/demo: nyalakan atau matikan suasana dingin untuk satu profil. */
  setColdStreakMode: (profileId: string, cold: boolean) => void;
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
  toggleSandboxMode: () => void;

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

  resetToDemoSeed: () => void;
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
    state.profiles.find((p) => isChildRole(p.role)) || INITIAL_PROFILES[0]
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
      activeProfileId: USER_1_ID,
      monitoredUserId: USER_1_ID,
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
      isSandboxMode: false,
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
              "Username tidak ditemukan. Gunakan akun terdaftar atau panel Demo di bawah.",
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
            message: `PIN salah! (Petunjuk demo: ${profile.pin_code})`,
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

      setColdStreakMode: (profileId, cold) => {
        const state = get();
        set({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId) return p;
            if (cold) {
              if (p.isColdStreakMode) return p;
              return {
                ...p,
                isColdStreakMode: true,
                coldSince: getRelativeDateStr(0),
                streakBeforeCold: p.current_streak,
                current_streak: 0,
              };
            }
            return {
              ...p,
              isColdStreakMode: false,
              coldSince: undefined,
              current_streak:
                p.current_streak === 0 && p.streakBeforeCold !== undefined
                  ? p.streakBeforeCold
                  : p.current_streak,
              streakBeforeCold: undefined,
            };
          }),
        });
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

        if (!state.isSandboxMode) {
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
        }

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

        const newId = `prof-${Date.now()}`;
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

      toggleSandboxMode: () =>
        set((s) => ({ isSandboxMode: !s.isSandboxMode })),

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

        const todayRewardedTxCount = state.transactions.filter(
          (t) =>
            t.user_id === userProf.id &&
            t.transaction_date === todayStr &&
            t.points_earned > 0
        ).length;

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

        if (!state.isSandboxMode) {
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

      resetToDemoSeed: () => {
        set({
          currentRole: "user",
          activeProfileId: USER_1_ID,
          monitoredUserId: USER_1_ID,
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
          isSandboxMode: false,
          isProudComboActive: false,
          lastSupervisorCheerDate: null,
          supervisorCheersCount: 1,
          unboxedAccessoryDrop: null,
          rewardToast: {
            id: `toast-${Date.now()}`,
            title: "Data Demo Versi 4.0 Direset!",
            subtitle:
              "Seluruh akun multi-user, 8 fase pet, dan buku kas kembali ke pengaturan awal.",
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
      version: 5,
      // Hidrasi dipicu manual lewat <StoreHydrator /> setelah mount, agar render pertama di klien
      // identik dengan SSR (tanpa galat hidrasi) walau localStorage berisi data berbeda.
      skipHydration: true,
      // Versi 4 -> 5 hanya MENAMBAH field opsional dan akun seed baru; data lama dipakai apa adanya.
      migrate: (persistedState) => persistedState as BukuDompetState,
      // Migrasi ringan & idempoten: katalog aksesori membesar 48 -> 144 tanpa mengubah ID lama,
      // jadi data lama tetap valid. Merge ini hanya membuang ID yang tidak dikenal katalog
      // (data rusak / sisa versi eksperimen) agar tidak muncul sebagai item "?" di lemari.
      merge: (persistedState, currentState) => {
        const raw = (persistedState ?? {}) as Partial<BukuDompetState>;
        const merged = { ...currentState, ...raw };
        if (Array.isArray(merged.profiles)) {
          // Versi 5.0: tambahkan akun seed baru (Adik Kecil) bila data lama belum memilikinya.
          const knownIds = new Set(merged.profiles.map((p) => p.id));
          const missingSeeds = INITIAL_PROFILES.filter(
            (p) => p.role === "schoolchild" && !knownIds.has(p.id)
          );
          merged.profiles = [...merged.profiles, ...missingSeeds].map(
            sanitizeProfileAccessories
          );
          if (missingSeeds.length > 0 && Array.isArray(merged.supervisorAssignments)) {
            const seedIds = new Set(missingSeeds.map((p) => p.id));
            const have = new Set(
              merged.supervisorAssignments.map((a) => `${a.supervisorId}:${a.userId}`)
            );
            merged.supervisorAssignments = [
              ...merged.supervisorAssignments,
              ...INITIAL_SUPERVISOR_ASSIGNMENTS.filter(
                (a) =>
                  seedIds.has(a.userId) && !have.has(`${a.supervisorId}:${a.userId}`)
              ),
            ];
          }
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
        missions: state.missions,
        badges: state.badges,
        redemptions: state.redemptions,
        equippedMochiStage: state.equippedMochiStage,
        equippedTitle: state.equippedTitle,
        streakFreezeDates: state.streakFreezeDates,
        zeroSpendDates: state.zeroSpendDates,
        openedCheckpointWeeks: state.openedCheckpointWeeks,
        isSandboxMode: state.isSandboxMode,
        lastSupervisorCheerDate: state.lastSupervisorCheerDate,
        supervisorCheersCount: state.supervisorCheersCount,
        isLoggedIn: state.isLoggedIn,
        supervisorChildChosen: state.supervisorChildChosen,
        savedProfileIds: state.savedProfileIds,
      }),
    }
  )
);

/**
 * Tipe data Versi 5.0 yang dipakai bersama oleh store keluarga, mesin misi, dan UI.
 * File ini hanya berisi tipe + konstanta murni (tanpa React) agar aman diimpor di mana saja.
 */
import type { EmotionKey } from "@/components/illustrations/DetectiveAndStoryAssets";
import type {
  AccessorySlot,
  PetSpecies,
} from "@/components/illustrations/PetAvatarSystem";

/* ───────────────────────── Cerita Harian (Anak SD) ───────────────────────── */

export type StoryCategory = "activity" | "school" | "emotion" | "imagination";

export interface StoryEntry {
  id: string;
  userId: string;
  /** Tanggal lokal YYYY-MM-DD saat cerita ditulis. */
  date: string;
  category: StoryCategory;
  /** Wajib untuk kategori `emotion`; opsional untuk kategori lain. */
  emotion?: EmotionKey;
  title: string;
  body: string;
  wordCount: number;
  createdAt: string;
}

/* ───────────────────────── Arcade Sekolah ───────────────────────── */

export type ArcadeCategoryId = "language" | "money" | "empathy" | "science";

export interface ArcadePlay {
  id: string;
  userId: string;
  modeId: string;
  category: ArcadeCategoryId;
  score: number;
  total: number;
  /** true bila skor mencapai ambang lulus (>= 60%) atau mode non-skor selesai. */
  passed: boolean;
  /** true bila ronde ini mendapat hadiah Poin (otomatis saat lulus, selama batas hadiah harian belum habis). */
  rewardClaimed: boolean;
  /** Versi 5.2: level kesulitan saat ronde dimainkan (1..5). Data lama tidak punya field ini. */
  level?: number;
  /** Versi 5.2: Poin yang benar-benar diterima dari ronde ini. */
  pointsEarned?: number;
  date: string;
  createdAt: string;
}

/** Versi 5.2: kemajuan level per (anak, mode). Kunci = `${userId}|${modeId}`. */
export interface ArcadeModeProgress {
  /** Level tertinggi yang sudah terbuka (1..ARCADE_MAX_LEVEL). */
  level: number;
  /** Jumlah ronde lulus per level (kunci = nomor level). */
  clears: Record<number, number>;
  /** Penunjuk soal berikutnya per level, agar soal tidak berulang selama bank belum habis. */
  cursor: Record<number, number>;
}

/** Versi 5.2: ronde yang sedang berjalan. Disimpan tiap soal selesai supaya tidak mengulang saat dibuka lagi. */
export interface ArcadeSession {
  userId: string;
  modeId: string;
  level: number;
  /** Benih deterministik (tanpa cursor) untuk mengacak bank soal level ini. */
  seed: string;
  /** Nomor putaran bank soal level ini. */
  cursor: number;
  /** Jumlah soal yang sudah dijawab. */
  index: number;
  score: number;
  startedAt: string;
}

/** Versi 5.2: batas bermain per anak (menjaga screen time). */
export interface ArcadeLimits {
  maxRoundsPerDay: number;
  maxMinutesPerDay: number;
}

/** Pemakaian hari ini; bila `date` bukan hari ini dianggap nol. */
export interface ArcadeDaily {
  date: string;
  rounds: number;
  seconds: number;
}

/* ───────────────────────── Tabungan ───────────────────────── */

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  category: string;
  targetAmount: number;
  savedAmount: number;
  createdAt: string;
  completedAt?: string;
}

/* ───────────────────────── Beranda Keluarga ───────────────────────── */

export type FeedPostKind =
  | "user"
  | "streak"
  | "pet_new"
  | "pet_phase"
  | "story"
  | "pride"
  | "saving"
  | "arcade";

export interface FeedComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface FeedPetPreview {
  species: PetSpecies;
  stage: number;
  name: string;
  accessories: Partial<Record<AccessorySlot, string>>;
}

export interface FeedPost {
  id: string;
  kind: FeedPostKind;
  /** Profil yang menulis / menjadi subjek postingan. */
  authorId: string;
  text: string;
  /** Foto yang sudah dikompres ke WebP (data URL). Maks. 1 per postingan. */
  imageDataUrl?: string;
  createdAt: string;
  /** Tanggal lokal posting (dasar siklus reset 7 hari). */
  day: string;
  likes: string[];
  comments: FeedComment[];
  gifts: { fromId: string; amount: number; at: string }[];
  streak?: number;
  petPreview?: FeedPetPreview;
  storyTitle?: string;
  emotion?: EmotionKey;
  /** Kunci unik agar siaran otomatis tidak terkirim dua kali. */
  dedupeKey?: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  /** Foto WebP kecil (data URL). Hanya beberapa foto terbaru disimpan agar penyimpanan lokal hemat. */
  imageDataUrl?: string;
  createdAt: string;
}

export interface ReminderEntry {
  id: string;
  fromId: string;
  toId: string;
  day: string;
  createdAt: string;
  seen: boolean;
}

/** Panjang siklus reset Beranda Keluarga & Chat (hari). */
export const FEED_CYCLE_DAYS = 7;

/** Arcade Versi 5.2: 5 level kesulitan per game. */
export const ARCADE_MAX_LEVEL = 5;
export const ARCADE_LEVEL_NAMES = ["", "Pemula", "Penjelajah", "Petualang", "Jagoan", "Legenda"] as const;
/** Naik level setelah lulus sekian ronde di level itu, atau 1 ronde dengan skor sempurna. */
export const ARCADE_CLEARS_TO_LEVEL_UP = 2;
/** Hadiah ronde lulus menurut level (indeks = level). Makin sulit, makin besar. */
export const ARCADE_LEVEL_POINTS = [0, 6, 8, 10, 12, 15] as const;
export const ARCADE_LEVEL_XP = [0, 8, 10, 12, 15, 18] as const;
/** Maksimal ronde berhadiah per hari (ronde lain tetap boleh dimainkan, hanya tanpa Poin). */
export const ARCADE_DAILY_REWARD_LIMIT = 4;
/** Batas bermain bawaan (bisa diubah Supervisor per anak). */
export const DEFAULT_ARCADE_LIMITS: ArcadeLimits = { maxRoundsPerDay: 8, maxMinutesPerDay: 20 };
export const ARCADE_LIMIT_ROUND_OPTIONS = [4, 6, 8, 10, 12] as const;
export const ARCADE_LIMIT_MINUTE_OPTIONS = [10, 15, 20, 30, 45] as const;

/** Hadiah menulis cerita. */
export const STORY_REWARD_POINTS = 15;
export const STORY_REWARD_XP = 25;

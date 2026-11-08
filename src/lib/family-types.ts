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
  /** true bila permainan ini yang dipakai mengklaim hadiah Poin harian. */
  rewardClaimed: boolean;
  date: string;
  createdAt: string;
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
  | "saving";

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

/** Batas hadiah klaim Poin Arcade per hari. */
export const ARCADE_DAILY_CLAIM_LIMIT = 2;
export const ARCADE_CLAIM_POINTS = 10;
export const ARCADE_CLAIM_XP = 15;

/** Hadiah menulis cerita. */
export const STORY_REWARD_POINTS = 15;
export const STORY_REWARD_XP = 25;

"use client";

/**
 * Store Keluarga Versi 5.0 — Cerita Harian, Tabungan, Arcade, Misi, Medali,
 * Beranda Keluarga (feed) dan Chat Pet.
 *
 * Dipisah dari store utama supaya data lama (profil, kas, pet) tidak tersentuh migrasi besar.
 * Hadiah Poin/XP selalu lewat aksi store utama (`awardReward`, `transferPoints`,
 * `addSavingDeposit`) sehingga ekonomi, level, dan fase pet tetap satu sumber kebenaran.
 *
 * Catatan arsitektur jujur: aplikasi ini berjalan di satu browser (login hanya berganti profil
 * aktif), jadi "keluarga" berbagi data lewat localStorage perangkat yang sama. Penyimpanan
 * lintas-perangkat membutuhkan Supabase Realtime; di sini tersedia penyisipan best-effort bila
 * `NEXT_PUBLIC_SUPABASE_URL` diatur, tetapi sinkronisasi dua arah belum dibangun.
 */

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import {
  useBukuDompetStore,
  isChildRole,
  type ProfileData,
} from "@/store/useBukuDompetStore";
import {
  addDaysStr,
  diffDaysStr,
  localDateStr,
} from "@/lib/dates";
import {
  ARCADE_DAILY_REWARD_LIMIT,
  ARCADE_LEVEL_NAMES,
  ARCADE_LEVEL_POINTS,
  ARCADE_LEVEL_XP,
  FEED_CYCLE_DAYS,
  STORY_REWARD_POINTS,
  STORY_REWARD_XP,
  type ArcadeCategoryId,
  type ArcadeDaily,
  type ArcadeLimits,
  type ArcadeModeProgress,
  type ArcadePlay,
  type ArcadeSession,
  type ChatMessage,
  type FeedComment,
  type FeedPost,
  type FeedPostKind,
  type ReminderEntry,
  type SavingsGoal,
  type StoryCategory,
  type StoryEntry,
} from "@/lib/family-types";
import { analyzeStory } from "@/lib/story-utils";
import { medalUnlock } from "@/lib/badge-catalog";
import { ARCADE_MODE_BY_ID } from "@/lib/arcade-modes";
import {
  applyRoundResult,
  clampLevel,
  dailyOf,
  emptyProgress,
  limitsOf,
  limitStatus,
  progressKey,
  type LimitBlock,
} from "@/lib/arcade-progress";
import type { TransactionRecord } from "@/lib/spending-detective";
import {
  DAILY_QUEST_REWARD,
  WEEKLY_QUEST_REWARD,
  MEDAL_BY_ID,
  evaluateMedals,
  getActiveQuests,
  type MetricInputs,
  type QuestAudience,
} from "@/lib/quest-engine";
import type { EmotionKey } from "@/components/illustrations/DetectiveAndStoryAssets";
import { EMOTION_LABEL } from "@/components/illustrations/DetectiveAndStoryAssets";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ───────────────────────── Penyimpanan aman ───────────────────────── */

/**
 * localStorage hanya ±5 MB. Foto WebP bisa memenuhinya, jadi bila penulisan gagal
 * (QuotaExceededError) kita buang foto dari postingan terlama lalu coba lagi, dan terakhir
 * menyerah tanpa melempar galat agar aplikasi tidak macet.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
      return;
    } catch {
      // lanjut ke pemangkasan foto
    }
    try {
      const parsed = JSON.parse(value) as {
        state?: { feedPosts?: FeedPost[]; chat?: ChatMessage[] };
      };
      // Foto chat terlama dibuang dulu (paling murah untuk dikorbankan).
      const chatMsgs = parsed.state?.chat;
      if (chatMsgs) {
        for (let i = 0; i < chatMsgs.length; i++) {
          if (!chatMsgs[i].imageDataUrl) continue;
          chatMsgs[i] = { ...chatMsgs[i], imageDataUrl: undefined };
          try {
            window.localStorage.setItem(name, JSON.stringify(parsed));
            return;
          } catch {
            // lanjut buang foto berikutnya
          }
        }
      }
      const posts = parsed.state?.feedPosts;
      if (posts) {
        // Buang foto dari yang terlama dulu sampai muat.
        const withImg = posts
          .map((p, i) => ({ p, i }))
          .filter((x) => x.p.imageDataUrl)
          .reverse();
        for (const { i } of withImg) {
          posts[i] = { ...posts[i], imageDataUrl: undefined };
          try {
            window.localStorage.setItem(name, JSON.stringify(parsed));
            return;
          } catch {
            // coba hapus foto berikutnya
          }
        }
      }
    } catch {
      // abaikan; data tetap ada di memori selama sesi berjalan
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      // abaikan
    }
  },
};

async function trySupabaseInsert(table: string, row: Record<string, unknown>) {
  try {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from(table).insert(row);
  } catch {
    // Tetap lokal bila tabel belum dimigrasi
  }
}

/* ───────────────────────── State ───────────────────────── */

export interface ArcadeRoundResult {
  play: ArcadePlay;
  passed: boolean;
  level: number;
  points: number;
  xp: number;
  /** true bila Poin benar-benar diberikan. */
  rewarded: boolean;
  /** true bila lulus tetapi batas ronde berhadiah hari ini sudah habis. */
  rewardCapped: boolean;
  levelUp: boolean;
  newLevel: number;
}

export interface FamilyState {
  stories: StoryEntry[];
  goals: SavingsGoal[];
  arcadePlays: ArcadePlay[];
  /** claimKey -> tanggal klaim. */
  questClaims: Record<string, string>;
  /** `${profileId}:${medalId}` -> tanggal hadiah medali diklaim. */
  medalClaims: Record<string, string>;
  feedPosts: FeedPost[];
  chat: ChatMessage[];
  reminders: ReminderEntry[];
  /** Awal siklus 7 hari Beranda Keluarga & Chat. */
  feedCycleStartDate: string;

  /** Reset otomatis feed/chat/pengingat tiap 7 hari. TIDAK menyentuh poin, medali, cerita, tabungan. */
  runMaintenance: () => { didReset: boolean };

  addFeedPost: (payload: {
    authorId: string;
    text: string;
    imageDataUrl?: string;
  }) => { success: boolean; message: string };
  toggleLike: (postId: string, profileId: string) => void;
  addComment: (postId: string, profileId: string, text: string) => boolean;
  giftPoints: (
    postId: string,
    fromId: string,
    amount: 5 | 10
  ) => { success: boolean; message: string };
  sendReminder: (fromId: string, toId: string) => { success: boolean; message: string };
  markRemindersSeen: (toId: string) => void;
  /** Kirim pesan teks dan/atau foto. Mengembalikan false bila kosong atau kepanjangan. */
  sendChat: (authorId: string, text: string, imageDataUrl?: string) => boolean;
  /** Siaran otomatis; dilewati bila `dedupeKey` sudah ada. */
  addAutoPost: (post: Omit<FeedPost, "id" | "createdAt" | "day" | "likes" | "comments" | "gifts">) => void;

  saveStory: (payload: {
    userId: string;
    category: StoryCategory;
    emotion?: EmotionKey;
    title: string;
    body: string;
  }) => {
    success: boolean;
    message: string;
    rewarded: boolean;
    story?: StoryEntry;
  };

  createGoal: (payload: {
    userId: string;
    name: string;
    category: string;
    targetAmount: number;
  }) => { success: boolean; message: string; goal?: SavingsGoal };
  removeGoal: (goalId: string) => void;
  depositToGoal: (payload: {
    userId: string;
    goalId: string;
    amount: number;
  }) => { success: boolean; message: string; completed: boolean };

  recordArcadePlay: (payload: {
    userId: string;
    modeId: string;
    category: ArcadeCategoryId;
    score: number;
    total: number;
    passed: boolean;
  }) => ArcadePlay;
  /** Versi 5.2: kemajuan level, sesi berjalan, pemakaian harian, dan batas bermain. */
  arcadeProgress: Record<string, ArcadeModeProgress>;
  arcadeSessions: Record<string, ArcadeSession>;
  arcadeDaily: Record<string, ArcadeDaily>;
  arcadeLimits: Record<string, ArcadeLimits>;
  /** Mulai ronde baru, atau lanjutkan sesi yang tersimpan (tanpa mengulang soal yang sudah dijawab). */
  startArcadeRound: (payload: {
    userId: string;
    modeId: string;
    level?: number;
  }) => { ok: true; session: ArcadeSession; resumed: boolean } | { ok: false; blocked: LimitBlock };
  /** Simpan langkah: `index` soal sudah dijawab dengan total `score` benar. */
  saveArcadeStep: (userId: string, modeId: string, index: number, score: number) => void;
  dropArcadeSession: (userId: string, modeId: string) => void;
  addArcadeSeconds: (userId: string, seconds: number) => void;
  finishArcadeRound: (payload: {
    userId: string;
    modeId: string;
    score: number;
    total: number;
  }) => ArcadeRoundResult;
  setArcadeLimits: (userId: string, limits: ArcadeLimits) => void;

  claimQuest: (payload: {
    profileId: string;
    audience: QuestAudience;
    claimKey: string;
  }) => { success: boolean; message: string };
  claimMedalReward: (profileId: string, medalId: string) => {
    success: boolean;
    message: string;
  };

  resetFamilyData: () => void;
}

/** Jumlah foto chat yang disimpan; sisanya dipangkas dari yang terlama. */
const MAX_CHAT_IMAGES = 12;

let idCounter = 0;
/** ID unik tanpa Math.random: waktu + penghitung urut (aman untuk beberapa aksi dalam 1 milidetik). */
const newId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
};

function profileOf(id: string): ProfileData | undefined {
  return useBukuDompetStore.getState().profiles.find((p) => p.id === id);
}

function nameOf(id: string): string {
  return profileOf(id)?.display_name ?? "Anggota Keluarga";
}

/** Nama panggilan singkat: buang keterangan dalam tanda kurung ("Adik Rara (Mahasiswi)" -> "Adik Rara"). */
export function shortName(display: string): string {
  return display.replace(/\s*\(.*?\)\s*/g, "").trim() || display;
}

/** Kumpulkan input metrik misi/medali untuk satu profil dari kedua store. */
export function buildMetricInputs(
  profile: ProfileData,
  family: Pick<FamilyState, "stories" | "arcadePlays">,
  today: string = localDateStr(),
  transactions?: TransactionRecord[]
): MetricInputs {
  const main = { transactions: transactions ?? useBukuDompetStore.getState().transactions };
  return {
    today,
    streak: profile.current_streak,
    longestStreak: profile.longest_streak,
    monthlyBudgetTarget: profile.monthly_budget_target,
    monthlySavingTarget: profile.monthly_saving_target,
    transactions: main.transactions.filter((t) => t.user_id === profile.id),
    stories: family.stories.filter((s) => s.userId === profile.id),
    arcadePlays: family.arcadePlays.filter((p) => p.userId === profile.id),
  };
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      stories: [],
      goals: [],
      arcadePlays: [],
      arcadeProgress: {},
      arcadeSessions: {},
      arcadeDaily: {},
      arcadeLimits: {},
      questClaims: {},
      medalClaims: {},
      feedPosts: [],
      chat: [],
      reminders: [],
      feedCycleStartDate: "",

      runMaintenance: () => {
        const today = localDateStr();
        const start = get().feedCycleStartDate;
        if (!start) {
          set({ feedCycleStartDate: today });
          return { didReset: false };
        }
        if (diffDaysStr(start, today) >= FEED_CYCLE_DAYS) {
          // Hanya meringankan penyimpanan: feed, chat, dan pengingat. Poin, medali, cerita,
          // tabungan, dan skor arcade tidak disentuh sama sekali.
          set({
            feedPosts: [],
            chat: [],
            reminders: [],
            feedCycleStartDate: today,
          });
          return { didReset: true };
        }
        return { didReset: false };
      },

      addFeedPost: ({ authorId, text, imageDataUrl }) => {
        const clean = text.trim();
        if (!clean && !imageDataUrl) {
          return { success: false, message: "Tulis sesuatu atau pilih foto dulu ya." };
        }
        if (clean.length > 500) {
          return { success: false, message: "Maksimal 500 karakter per postingan." };
        }
        const post: FeedPost = {
          id: newId("post"),
          kind: "user",
          authorId,
          text: clean,
          imageDataUrl,
          createdAt: new Date().toISOString(),
          day: localDateStr(),
          likes: [],
          comments: [],
          gifts: [],
        };
        set((s) => ({ feedPosts: [post, ...s.feedPosts] }));
        return { success: true, message: "Postingan terkirim ke Beranda Keluarga!" };
      },

      toggleLike: (postId, profileId) => {
        set((s) => ({
          feedPosts: s.feedPosts.map((p) =>
            p.id !== postId
              ? p
              : {
                  ...p,
                  likes: p.likes.includes(profileId)
                    ? p.likes.filter((id) => id !== profileId)
                    : [...p.likes, profileId],
                }
          ),
        }));
      },

      addComment: (postId, profileId, text) => {
        const clean = text.trim();
        if (!clean || clean.length > 240) return false;
        const comment: FeedComment = {
          id: newId("cm"),
          authorId: profileId,
          text: clean,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          feedPosts: s.feedPosts.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
          ),
        }));
        return true;
      },

      giftPoints: (postId, fromId, amount) => {
        const post = get().feedPosts.find((p) => p.id === postId);
        if (!post) return { success: false, message: "Postingan tidak ditemukan." };
        const res = useBukuDompetStore
          .getState()
          .transferPoints(fromId, post.authorId, amount);
        if (!res.success) return res;
        set((s) => ({
          feedPosts: s.feedPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  gifts: [
                    ...p.gifts,
                    { fromId, amount, at: new Date().toISOString() },
                  ],
                }
              : p
          ),
        }));
        return res;
      },

      sendReminder: (fromId, toId) => {
        const today = localDateStr();
        const already = get().reminders.some(
          (r) => r.fromId === fromId && r.toId === toId && r.day === today
        );
        if (already) {
          return {
            success: false,
            message: "Pengingat hari ini sudah terkirim. Beri dia waktu ya!",
          };
        }
        const entry: ReminderEntry = {
          id: newId("rem"),
          fromId,
          toId,
          day: today,
          createdAt: new Date().toISOString(),
          seen: false,
        };
        set((s) => ({ reminders: [entry, ...s.reminders] }));
        return {
          success: true,
          message: `Pengingat terkirim ke ${shortName(nameOf(toId))}!`,
        };
      },

      markRemindersSeen: (toId) => {
        const has = get().reminders.some((r) => r.toId === toId && !r.seen);
        if (!has) return;
        set((s) => ({
          reminders: s.reminders.map((r) =>
            r.toId === toId ? { ...r, seen: true } : r
          ),
        }));
      },

      sendChat: (authorId, text, imageDataUrl) => {
        const clean = text.trim();
        if ((!clean && !imageDataUrl) || clean.length > 300) return false;
        const msg: ChatMessage = {
          id: newId("chat"),
          authorId,
          text: clean,
          imageDataUrl,
          createdAt: new Date().toISOString(),
        };
        set((s) => {
          const next = [...s.chat, msg].slice(-200);
          // Simpan foto hanya untuk 12 pesan bergambar terbaru; yang lebih lama tinggal teksnya.
          let kept = 0;
          for (let i = next.length - 1; i >= 0; i--) {
            if (!next[i].imageDataUrl) continue;
            kept += 1;
            if (kept > MAX_CHAT_IMAGES) next[i] = { ...next[i], imageDataUrl: undefined };
          }
          return { chat: next };
        });
        return true;
      },

      addAutoPost: (post) => {
        if (post.dedupeKey && get().feedPosts.some((p) => p.dedupeKey === post.dedupeKey)) {
          return;
        }
        const full: FeedPost = {
          ...post,
          id: newId("auto"),
          createdAt: new Date().toISOString(),
          day: localDateStr(),
          likes: [],
          comments: [],
          gifts: [],
        };
        set((s) => ({ feedPosts: [full, ...s.feedPosts] }));
      },

      saveStory: ({ userId, category, emotion, title, body }) => {
        const prof = profileOf(userId);
        if (!prof) {
          return { success: false, message: "Profil tidak ditemukan.", rewarded: false };
        }
        const analysis = analyzeStory(body);
        if (!analysis.valid) {
          return { success: false, message: analysis.reason, rewarded: false };
        }
        if (category === "emotion" && !emotion) {
          return {
            success: false,
            message: "Pilih dulu perasaanmu hari ini ya.",
            rewarded: false,
          };
        }
        const normalized = body.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
        if (
          get().stories.some(
            (s) =>
              s.userId === userId &&
              s.body.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID") === normalized
          )
        ) {
          return {
            success: false,
            message: "Cerita yang sama persis sudah pernah disimpan. Tulis cerita yang baru ya!",
            rewarded: false,
          };
        }

        const today = localDateStr();
        const cleanTitle = title.trim().slice(0, 80) || "Ceritaku Hari Ini";
        const story: StoryEntry = {
          id: newId("story"),
          userId,
          date: today,
          category,
          emotion,
          title: cleanTitle,
          body: body.trim(),
          wordCount: analysis.wordCount,
          createdAt: new Date().toISOString(),
        };

        // Hadiah Poin hanya untuk cerita PERTAMA tiap hari agar tidak bisa dipanen berulang.
        const firstToday = !get().stories.some(
          (s) => s.userId === userId && s.date === today
        );

        set((s) => ({ stories: [story, ...s.stories] }));

        const main = useBukuDompetStore.getState();
        const res = main.awardReward({
          profileId: userId,
          points: firstToday ? STORY_REWARD_POINTS : 0,
          xp: firstToday ? STORY_REWARD_XP : 0,
          continueStreak: true,
          isCombo: firstToday,
          title: firstToday
            ? `Cerita Tersimpan! (+${STORY_REWARD_POINTS} Poin & +${STORY_REWARD_XP} Stage XP)`
            : "Cerita Tersimpan!",
          subtitle: firstToday
            ? "Streak harianmu menyambung dan batu pijakan hari ini terbuka!"
            : "Hadiah Poin hanya untuk cerita pertama setiap hari, tapi ceritamu tetap tersimpan.",
        });

        const short = shortName(prof.display_name);
        const quote = emotion
          ? `Hari ini aku merasa ${EMOTION_LABEL[emotion].toLocaleLowerCase("id-ID")}, dan aku bangga sudah berani menuliskannya!`
          : "Aku bangga sudah menulis ceritaku sendiri hari ini!";
        get().addAutoPost({
          kind: "story",
          authorId: userId,
          text: `${short} telah menulis cerita baru berjudul “${cleanTitle}”. ${quote}`,
          storyTitle: cleanTitle,
          emotion,
          streak: res.newStreak,
          dedupeKey: `story:${story.id}`,
        });

        trySupabaseInsert("daily_stories", {
          user_id: userId,
          story_date: story.date,
          category: story.category,
          emotion: story.emotion ?? null,
          title: story.title,
          body: story.body,
          word_count: story.wordCount,
        });

        return {
          success: true,
          message: firstToday
            ? `Hebat! Cerita tersimpan. +${STORY_REWARD_POINTS} Poin & +${STORY_REWARD_XP} Stage XP.`
            : "Cerita tersimpan.",
          rewarded: firstToday,
          story,
        };
      },

      createGoal: ({ userId, name, category, targetAmount }) => {
        const cleanName = name.trim();
        const target = Math.round(Number(targetAmount));
        if (!cleanName) {
          return { success: false, message: "Beri nama impianmu dulu ya." };
        }
        if (!(target >= 1000)) {
          return { success: false, message: "Target minimal Rp1.000." };
        }
        if (target > 1_000_000_000) {
          return { success: false, message: "Target terlalu besar." };
        }
        const goal: SavingsGoal = {
          id: newId("goal"),
          userId,
          name: cleanName.slice(0, 40),
          category,
          targetAmount: target,
          savedAmount: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ goals: [goal, ...s.goals] }));
        return { success: true, message: "Impian baru dibuat!", goal };
      },

      removeGoal: (goalId) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== goalId) }));
      },

      depositToGoal: ({ userId, goalId, amount }) => {
        const goal = get().goals.find((g) => g.id === goalId && g.userId === userId);
        if (!goal) {
          return { success: false, message: "Impian tidak ditemukan.", completed: false };
        }
        const amt = Math.round(Number(amount));
        if (!(amt > 0)) {
          return { success: false, message: "Nominal harus lebih dari Rp0.", completed: false };
        }
        const res = useBukuDompetStore.getState().addSavingDeposit({
          profileId: userId,
          amount: amt,
          goalName: goal.name,
          category: goal.category,
        });
        if (!res.success) return { success: false, message: res.message, completed: false };

        const saved = goal.savedAmount + amt;
        const completed = saved >= goal.targetAmount && !goal.completedAt;
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  savedAmount: saved,
                  completedAt: completed ? new Date().toISOString() : g.completedAt,
                }
              : g
          ),
        }));

        const prof = profileOf(userId);
        if (prof) {
          get().addAutoPost({
            kind: "saving",
            authorId: userId,
            text: completed
              ? `${shortName(prof.display_name)} berhasil menuntaskan celengan impian “${goal.name}”!`
              : `${shortName(prof.display_name)} baru saja menabung Rp${amt.toLocaleString("id-ID")} untuk “${goal.name}”.`,
            dedupeKey: `saving:${userId}:${goalId}:${saved}`,
          });
        }
        return { success: true, message: res.message, completed };
      },

      recordArcadePlay: ({ userId, modeId, category, score, total, passed }) => {
        const play: ArcadePlay = {
          id: newId("play"),
          userId,
          modeId,
          category,
          score,
          total,
          passed,
          rewardClaimed: false,
          date: localDateStr(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ arcadePlays: [play, ...s.arcadePlays].slice(0, 400) }));
        return play;
      },

      startArcadeRound: ({ userId, modeId, level }) => {
        const state = get();
        const today = localDateStr();
        const status = limitStatus(dailyOf(state.arcadeDaily[userId], today), limitsOf(state.arcadeLimits[userId]));
        if (status.blocked) return { ok: false, blocked: status.blocked };

        const key = progressKey(userId, modeId);
        const progress = state.arcadeProgress[key] ?? emptyProgress();
        const existing = state.arcadeSessions[key];
        const wanted = level === undefined ? progress.level : Math.min(clampLevel(level), progress.level);
        if (existing && existing.level === wanted) {
          return { ok: true, session: existing, resumed: existing.index > 0 };
        }

        const cursor = progress.cursor[wanted] ?? 0;
        const session: ArcadeSession = {
          userId,
          modeId,
          level: wanted,
          seed: `${userId}|${modeId}|L${wanted}`,
          cursor,
          index: 0,
          score: 0,
          startedAt: new Date().toISOString(),
        };
        set((st) => ({
          arcadeSessions: { ...st.arcadeSessions, [key]: session },
          arcadeProgress: {
            ...st.arcadeProgress,
            [key]: { ...progress, cursor: { ...progress.cursor, [wanted]: cursor + 1 } },
          },
        }));
        return { ok: true, session, resumed: false };
      },

      saveArcadeStep: (userId, modeId, index, score) => {
        const key = progressKey(userId, modeId);
        const cur = get().arcadeSessions[key];
        if (!cur) return;
        set((st) => ({ arcadeSessions: { ...st.arcadeSessions, [key]: { ...cur, index, score } } }));
      },

      dropArcadeSession: (userId, modeId) => {
        const key = progressKey(userId, modeId);
        if (!get().arcadeSessions[key]) return;
        set((st) => {
          const next = { ...st.arcadeSessions };
          delete next[key];
          return { arcadeSessions: next };
        });
      },

      addArcadeSeconds: (userId, seconds) => {
        if (!(seconds > 0)) return;
        const today = localDateStr();
        set((st) => {
          const d = dailyOf(st.arcadeDaily[userId], today);
          return { arcadeDaily: { ...st.arcadeDaily, [userId]: { ...d, seconds: d.seconds + seconds } } };
        });
      },

      setArcadeLimits: (userId, limits) => {
        set((st) => ({ arcadeLimits: { ...st.arcadeLimits, [userId]: limits } }));
      },

      finishArcadeRound: ({ userId, modeId, score, total }) => {
        const state = get();
        const mode = ARCADE_MODE_BY_ID[modeId];
        const key = progressKey(userId, modeId);
        const playedLevel = state.arcadeSessions[key]?.level ?? state.arcadeProgress[key]?.level ?? 1;
        const passed = total > 0 && score / total >= 0.6;
        // Mode "partisipasi" (napas, kebaikan, kartu terima kasih) selalu bisa 100%, jadi skor sempurna
        // tidak mempercepat naik level di sana; level hanya naik lewat jumlah ronde lulus.
        const participation = mode?.engine === "breath" || mode?.engine === "kindness" || mode?.engine === "thanks";
        const perfect = !participation && total >= 3 && score === total;
        const today = localDateStr();

        const progress = state.arcadeProgress[key] ?? emptyProgress();
        const { next: nextProgress, levelUp } = applyRoundResult(progress, playedLevel, passed, perfect);

        const rewardedToday = state.arcadePlays.filter((p) => p.userId === userId && p.date === today && p.rewardClaimed).length;
        const rewardCapped = passed && rewardedToday >= ARCADE_DAILY_REWARD_LIMIT;
        const rewarded = passed && !rewardCapped;
        const points = rewarded ? ARCADE_LEVEL_POINTS[playedLevel] : 0;
        const xp = rewarded ? ARCADE_LEVEL_XP[playedLevel] : 0;

        const play: ArcadePlay = {
          id: newId("play"),
          userId,
          modeId,
          category: mode?.category ?? "language",
          score,
          total,
          passed,
          rewardClaimed: rewarded,
          level: playedLevel,
          pointsEarned: points,
          date: today,
          createdAt: new Date().toISOString(),
        };

        set((st) => {
          const sessions = { ...st.arcadeSessions };
          delete sessions[key];
          const d = dailyOf(st.arcadeDaily[userId], today);
          return {
            arcadePlays: [play, ...st.arcadePlays].slice(0, 400),
            arcadeSessions: sessions,
            arcadeProgress: { ...st.arcadeProgress, [key]: nextProgress },
            arcadeDaily: { ...st.arcadeDaily, [userId]: { ...d, rounds: d.rounds + 1 } },
          };
        });

        if (rewarded) {
          useBukuDompetStore.getState().awardReward({
            profileId: userId,
            points,
            xp,
            title: `Hadiah Game! (+${points} Poin & +${xp} Stage XP)`,
            subtitle: `${mode?.title ?? "Arcade"} • Level ${playedLevel} (${ARCADE_LEVEL_NAMES[playedLevel]})`,
          });
        }

        // Kabar ke Beranda Keluarga hanya untuk ronde yang lulus.
        if (passed) {
          const prof = profileOf(userId);
          if (prof) {
            const who = shortName(prof.display_name);
            const base = `${who} lulus “${mode?.title ?? "Arcade"}” Level ${playedLevel} dengan skor ${score}/${total}`;
            const tail = rewarded ? ` dan dapat +${points} Poin!` : "!";
            get().addAutoPost({
              kind: "arcade",
              authorId: userId,
              text: levelUp ? `${base}${tail} Naik ke Level ${nextProgress.level} (${ARCADE_LEVEL_NAMES[nextProgress.level]})!` : `${base}${tail}`,
              dedupeKey: `arcade:${play.id}`,
            });
          }
        }

        return { play, passed, level: playedLevel, points, xp, rewarded, rewardCapped, levelUp, newLevel: nextProgress.level };
      },

      claimQuest: ({ profileId, audience, claimKey }) => {
        const state = get();
        const prof = profileOf(profileId);
        if (!prof) return { success: false, message: "Profil tidak ditemukan." };
        const inputs = buildMetricInputs(prof, state);
        const active = getActiveQuests(profileId, audience, inputs, state.questClaims);
        const quest = [...active.daily, ...active.weekly].find((a) => a.claimKey === claimKey);
        if (!quest) return { success: false, message: "Misi tidak aktif lagi." };
        if (quest.claimed) return { success: false, message: "Hadiah misi ini sudah diklaim." };
        if (!quest.done) return { success: false, message: "Misi belum selesai." };

        set((s) => ({
          questClaims: { ...s.questClaims, [claimKey]: localDateStr() },
        }));
        const reward = quest.def.period === "daily" ? DAILY_QUEST_REWARD : WEEKLY_QUEST_REWARD;
        useBukuDompetStore.getState().awardReward({
          profileId,
          points: reward.points,
          xp: reward.xp,
          isCombo: true,
          title: `Misi "${quest.def.title}" Selesai!`,
          subtitle: `+${reward.points} Poin & +${reward.xp} Stage XP masuk ke akunmu!`,
        });
        return { success: true, message: `+${reward.points} Poin & +${reward.xp} Stage XP` };
      },

      claimMedalReward: (profileId, medalId) => {
        const state = get();
        const prof = profileOf(profileId);
        const def = MEDAL_BY_ID[medalId];
        if (!prof || !def) return { success: false, message: "Medali tidak ditemukan." };
        const key = `${profileId}:${medalId}`;
        if (state.medalClaims[key]) {
          return { success: false, message: "Hadiah medali ini sudah diklaim." };
        }
        const aud: QuestAudience = prof.role === "schoolchild" ? "schoolchild" : "user";
        const progress = evaluateMedals(aud, buildMetricInputs(prof, state)).find(
          (m) => m.def.id === medalId
        );
        if (!progress?.earned) {
          return { success: false, message: "Syarat medali belum terpenuhi." };
        }
        set((s) => ({ medalClaims: { ...s.medalClaims, [key]: localDateStr() } }));
        const unlocked = useBukuDompetStore.getState().unlockBadgeItems(profileId, medalUnlock(def.id, def.tier));
        const bonus = [
          unlocked.titleIds.length > 0 ? `Gelar "${def.title}"` : "",
          unlocked.bgIds.length > 0 ? `${unlocked.bgIds.length} Latar badge` : "",
        ].filter(Boolean);
        useBukuDompetStore.getState().awardReward({
          profileId,
          points: def.rewardPoints,
          xp: def.rewardXp,
          isCombo: true,
          title: `Medali "${def.title}" Diklaim!`,
          subtitle: `Hadiah tonggak: +${def.rewardPoints} Poin & +${def.rewardXp} Stage XP${bonus.length ? `, plus ${bonus.join(" & ")}` : ""}.`,
        });
        return { success: true, message: `+${def.rewardPoints} Poin & +${def.rewardXp} Stage XP${bonus.length ? ` • ${bonus.join(" & ")}` : ""}` };
      },

      resetFamilyData: () => {
        set({
          stories: [],
          goals: [],
          arcadePlays: [],
          arcadeProgress: {},
          arcadeSessions: {},
          arcadeDaily: {},
          arcadeLimits: {},
          questClaims: {},
          medalClaims: {},
          feedPosts: [],
          chat: [],
          reminders: [],
          feedCycleStartDate: localDateStr(),
        });
      },
    }),
    {
      name: "bukudompet-v5-family",
      // Versi 2 (GO LIVE): cerita, tabungan, skor arcade, feed, dan chat versi lama berasal dari akun demo
      // yang sudah tidak ada, jadi dibuang. Penyimpanan versi 2 ke atas dipakai apa adanya.
      version: 2,
      migrate: (persistedState, fromVersion) =>
        (fromVersion < 2 ? {} : persistedState) as FamilyState,
      skipHydration: true,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        stories: state.stories,
        goals: state.goals,
        arcadePlays: state.arcadePlays,
        arcadeProgress: state.arcadeProgress,
        arcadeSessions: state.arcadeSessions,
        arcadeDaily: state.arcadeDaily,
        arcadeLimits: state.arcadeLimits,
        questClaims: state.questClaims,
        medalClaims: state.medalClaims,
        feedPosts: state.feedPosts,
        chat: state.chat,
        reminders: state.reminders,
        feedCycleStartDate: state.feedCycleStartDate,
      }),
    }
  )
);

/* ───────────────────────── Jembatan siaran otomatis ───────────────────────── */

interface ProfileSnap {
  streak: number;
  stage: number;
  petCount: number;
  lastRecorded: string;
}

function snapshotProfiles(profiles: ProfileData[]): Map<string, ProfileSnap> {
  const map = new Map<string, ProfileSnap>();
  for (const p of profiles) {
    if (!isChildRole(p.role)) continue;
    map.set(p.id, {
      streak: p.current_streak,
      stage: p.currentStage,
      petCount: Object.keys(p.ownedPets ?? {}).length,
      lastRecorded: p.last_recorded_date,
    });
  }
  return map;
}

/**
 * Pantau perubahan profil di store utama dan terbitkan siaran keluarga:
 * lanjut streak, pet baru, naik fase. Panggil SETELAH hidrasi selesai
 * (supaya data yang baru dimuat tidak dianggap sebagai kejadian baru).
 * Mengembalikan fungsi berhenti.
 */
export function startFamilyBridge(): () => void {
  const main = useBukuDompetStore;
  let prev = snapshotProfiles(main.getState().profiles);
  let prevProfiles = main.getState().profiles;

  const unsub = main.subscribe((state) => {
    if (state.profiles === prevProfiles) return;
    prevProfiles = state.profiles;
    const today = localDateStr();
    const family = useFamilyStore.getState();

    for (const p of state.profiles) {
      if (!isChildRole(p.role)) continue;
      const before = prev.get(p.id);
      if (!before) continue;
      const short = shortName(p.display_name);

      if (
        p.current_streak > before.streak &&
        p.last_recorded_date === today &&
        p.role !== "schoolchild"
      ) {
        family.addAutoPost({
          kind: "streak",
          authorId: p.id,
          text: `${short} telah membuat catatan baru dan melanjutkan Streak ke-${p.current_streak}!`,
          streak: p.current_streak,
          dedupeKey: `streak:${p.id}:${today}`,
        });
      }

      const petCount = Object.keys(p.ownedPets ?? {}).length;
      const petPreview = {
        species: p.activeSpecies,
        stage: p.currentStage,
        name: p.petCustomName,
        accessories: p.equippedAccessories ?? {},
      };
      if (petCount > before.petCount) {
        family.addAutoPost({
          kind: "pet_new",
          authorId: p.id,
          text: `${short} telah membeli telur Pet baru! Siapa ya yang akan menetas?`,
          petPreview,
          dedupeKey: `petnew:${p.id}:${petCount}`,
        });
      } else if (p.currentStage > before.stage) {
        family.addAutoPost({
          kind: "pet_phase",
          authorId: p.id,
          text: `${p.petCustomName}, pet milik ${short}, naik ke Fase ${p.currentStage}!`,
          petPreview,
          dedupeKey: `phase:${p.id}:${p.activeSpecies}:${p.currentStage}`,
        });
      }
    }
    prev = snapshotProfiles(state.profiles);
  });

  return unsub;
}

/** Jenis postingan otomatis (untuk ikon/label di UI). */
export const AUTO_POST_KINDS: FeedPostKind[] = [
  "streak",
  "pet_new",
  "pet_phase",
  "story",
  "pride",
  "saving",
];

/** Tanggal berikutnya reset otomatis dan sisa hari (minimal 0). */
export function feedCycleInfo(startDate: string, today: string = localDateStr()) {
  if (!startDate) return { daysLeft: FEED_CYCLE_DAYS, resetOn: addDaysStr(today, FEED_CYCLE_DAYS) };
  const elapsed = diffDaysStr(startDate, today);
  return {
    daysLeft: Math.max(0, FEED_CYCLE_DAYS - elapsed),
    resetOn: addDaysStr(startDate, FEED_CYCLE_DAYS),
  };
}

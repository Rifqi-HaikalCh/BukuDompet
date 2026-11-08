/**
 * Mesin Misi & Medali Versi 5.0.
 *
 * Progres misi dan medali DIHITUNG dari data nyata (transaksi, cerita, setoran, skor arcade),
 * bukan angka yang diubah-ubah lewat banyak aksi. Dengan begitu progres selalu konsisten dan
 * tidak bisa "tersangkut" bila satu aksi lupa memperbarui penghitung.
 *
 * Katalog besar (44 misi) dirotasi deterministik: setiap hari tampil 3 misi harian dan setiap
 * pekan 2 misi mingguan per profil. Hadiah tetap mengikuti ekonomi lama (harian 15 Poin / 25 XP,
 * mingguan 150 Poin / 120 XP) sehingga inflasi Poin tidak terjadi.
 */
import type { TransactionRecord } from "@/lib/spending-detective";
import type {
  ArcadeCategoryId,
  ArcadePlay,
  StoryEntry,
} from "@/lib/family-types";
import type { EmotionKey } from "@/components/illustrations/DetectiveAndStoryAssets";
import {
  addDaysStr,
  dateRangeStr,
  startOfWeekStr,
} from "@/lib/dates";

export type QuestAudience = "user" | "schoolchild";
export type QuestPeriod = "daily" | "weekly";

/* ───────────────────────── Metrik ───────────────────────── */

export type MetricKey =
  // Bersama
  | "record_days"
  | "streak_len"
  | "saving_deposits"
  | "saving_amount"
  | "arcade_passes"
  | "arcade_modes"
  // User
  | "tx_count"
  | "itemized_count"
  | "safe_days"
  | "no_want_days"
  | "income_records"
  | "early_records"
  | "saving_target_pct"
  | "need_records"
  // Anak SD
  | "story_count"
  | "story_max_words"
  | "emotion_stories"
  | "emotion_distinct"
  | "school_stories"
  | "activity_stories"
  | "imagination_stories"
  | "arcade_language"
  | "arcade_money"
  | "arcade_empathy"
  | "arcade_science";

export interface MetricInputs {
  today: string;
  streak: number;
  longestStreak: number;
  monthlyBudgetTarget: number;
  monthlySavingTarget: number;
  /** Hanya transaksi milik profil ini. */
  transactions: TransactionRecord[];
  stories: StoryEntry[];
  arcadePlays: ArcadePlay[];
}

export interface MetricWindow {
  from: string;
  to: string;
}

export const dayWindow = (today: string): MetricWindow => ({
  from: today,
  to: today,
});
export const weekWindow = (today: string): MetricWindow => ({
  from: startOfWeekStr(today),
  to: today,
});
export const lifetimeWindow = (today: string): MetricWindow => ({
  from: "0000-01-01",
  to: today,
});

const inWin = (date: string, w: MetricWindow) => date >= w.from && date <= w.to;

/** Batas pengeluaran aman per hari (aproksimasi stabil: (anggaran - target tabungan) / 30). */
function safeDayLimit(inputs: MetricInputs): number {
  const pool = Math.max(0, inputs.monthlyBudgetTarget - inputs.monthlySavingTarget);
  return Math.max(10000, Math.round(pool / 30));
}

export function computeMetric(
  key: MetricKey,
  inputs: MetricInputs,
  win: MetricWindow
): number {
  const tx = inputs.transactions.filter((t) => inWin(t.transaction_date, win));
  const stories = inputs.stories.filter((s) => inWin(s.date, win));
  const plays = inputs.arcadePlays.filter(
    (p) => inWin(p.date, win) && p.passed
  );
  const cashTx = tx.filter((t) => t.type !== "saving");
  const savingTx = tx.filter((t) => t.type === "saving");

  switch (key) {
    case "record_days": {
      const days = new Set<string>();
      for (const t of tx) days.add(t.transaction_date);
      for (const s of stories) days.add(s.date);
      return days.size;
    }
    case "streak_len":
      return Math.max(inputs.streak, win.from === "0000-01-01" ? inputs.longestStreak : 0);
    case "saving_deposits":
      return savingTx.length;
    case "saving_amount":
      return savingTx.reduce((s, t) => s + Number(t.total_amount), 0);
    case "arcade_passes":
      return plays.length;
    case "arcade_modes":
      return new Set(plays.map((p) => p.modeId)).size;

    case "tx_count":
      return cashTx.length;
    case "itemized_count":
      return cashTx.filter((t) => t.is_itemized).length;
    case "income_records":
      return cashTx.filter((t) => t.type === "income").length;
    case "need_records":
      return cashTx.filter(
        (t) => t.type === "expense" && t.need_or_want === "need"
      ).length;
    case "early_records":
      return cashTx.filter((t) => new Date(t.created_at).getHours() < 21).length;
    case "safe_days":
    case "no_want_days": {
      const limit = safeDayLimit(inputs);
      let n = 0;
      for (const d of dateRangeStr(win.from === "0000-01-01" ? addDaysStr(inputs.today, -400) : win.from, win.to)) {
        const dayTx = cashTx.filter((t) => t.transaction_date === d);
        if (dayTx.length === 0) continue;
        const expenses = dayTx.filter((t) => t.type === "expense");
        const spent = expenses.reduce((s, t) => s + Number(t.total_amount), 0);
        if (key === "safe_days") {
          if (spent <= limit * 1.05) n += 1;
        } else if (!expenses.some((t) => t.need_or_want === "want")) {
          n += 1;
        }
      }
      return n;
    }
    case "saving_target_pct": {
      const base = inputs.monthlySavingTarget > 0 ? inputs.monthlySavingTarget / 4 : 0;
      if (base <= 0) return 0;
      const amount = savingTx.reduce((s, t) => s + Number(t.total_amount), 0);
      return Math.round((amount / base) * 100);
    }

    case "story_count":
      return stories.length;
    case "story_max_words":
      return stories.reduce((m, s) => Math.max(m, s.wordCount), 0);
    case "emotion_stories":
      return stories.filter((s) => s.category === "emotion").length;
    case "emotion_distinct": {
      const set = new Set<EmotionKey>();
      for (const s of stories) if (s.emotion) set.add(s.emotion);
      return set.size;
    }
    case "school_stories":
      return stories.filter((s) => s.category === "school").length;
    case "activity_stories":
      return stories.filter((s) => s.category === "activity").length;
    case "imagination_stories":
      return stories.filter((s) => s.category === "imagination").length;
    case "arcade_language":
      return plays.filter((p) => p.category === "language").length;
    case "arcade_money":
      return plays.filter((p) => p.category === "money").length;
    case "arcade_empathy":
      return plays.filter((p) => p.category === "empathy").length;
    case "arcade_science":
      return plays.filter((p) => p.category === "science").length;
    default:
      return 0;
  }
}

/* ───────────────────────── Medali ───────────────────────── */

export type MedalTier = "bronze" | "silver" | "gold" | "diamond";
export type MedalGlyph =
  | "flame"
  | "receipt"
  | "piggy"
  | "shield"
  | "calendar"
  | "pen"
  | "heart"
  | "book"
  | "gamepad"
  | "coin";

export interface MedalDef {
  id: string;
  audience: QuestAudience | "both";
  title: string;
  description: string;
  /** Syarat dalam bahasa anak/pengguna, tampil di Etalase Medali. */
  requirementLabel: string;
  tier: MedalTier;
  glyph: MedalGlyph;
  metric: MetricKey;
  threshold: number;
  rewardPoints: number;
  rewardXp: number;
  /** Famili tangga medali (untuk pengelompokan visual). */
  family: string;
}

export const MEDAL_TIER_LABEL: Record<MedalTier, string> = {
  bronze: "Perunggu",
  silver: "Perak",
  gold: "Emas",
  diamond: "Berlian",
};

const TIER_REWARD: Record<MedalTier, { points: number; xp: number }> = {
  bronze: { points: 50, xp: 60 },
  silver: { points: 150, xp: 120 },
  gold: { points: 400, xp: 250 },
  diamond: { points: 1000, xp: 500 },
};

function medal(
  d: Omit<MedalDef, "rewardPoints" | "rewardXp">
): MedalDef {
  return { ...d, rewardPoints: TIER_REWARD[d.tier].points, rewardXp: TIER_REWARD[d.tier].xp };
}

export const MEDAL_CATALOG: MedalDef[] = [
  // ── Tangga Streak (semua peran) ──
  medal({ id: "streak_7", family: "Api Streak", audience: "both", tier: "bronze", glyph: "flame",
    title: "Api Konsistensi", description: "Menyalakan api streak seminggu penuh.",
    requirementLabel: "Streak 7 hari", metric: "streak_len", threshold: 7 }),
  medal({ id: "streak_30", family: "Api Streak", audience: "both", tier: "silver", glyph: "flame",
    title: "Penjaga Api Setia", description: "Sebulan penuh tanpa putus mencatat.",
    requirementLabel: "Streak 30 hari", metric: "streak_len", threshold: 30 }),
  medal({ id: "streak_60", family: "Api Streak", audience: "both", tier: "gold", glyph: "flame",
    title: "Pejuang Tanpa Libur", description: "Dua bulan beruntun tetap menyala.",
    requirementLabel: "Streak 60 hari", metric: "streak_len", threshold: 60 }),
  medal({ id: "streak_100", family: "Api Streak", audience: "both", tier: "diamond", glyph: "flame",
    title: "Legenda Streak 100 Hari", description: "Seratus hari beruntun. Kamu legenda!",
    requirementLabel: "Streak 100 hari", metric: "streak_len", threshold: 100 }),

  // ── User: pencatat rinci ──
  medal({ id: "detail_5", family: "Juru Tulis", audience: "user", tier: "bronze", glyph: "receipt",
    title: "Juru Tulis Teliti", description: "Rajin merinci isi struk belanja.",
    requirementLabel: "5 catatan rinci (≥2 item)", metric: "itemized_count", threshold: 5 }),
  medal({ id: "detail_25", family: "Juru Tulis", audience: "user", tier: "silver", glyph: "receipt",
    title: "Detektif Struk Handal", description: "Ketelitianmu bikin Inspektur Saku kagum.",
    requirementLabel: "25 catatan rinci", metric: "itemized_count", threshold: 25 }),
  medal({ id: "detail_75", family: "Juru Tulis", audience: "user", tier: "gold", glyph: "receipt",
    title: "Raja Rincian", description: "Tidak ada rupiah yang lolos dari catatanmu.",
    requirementLabel: "75 catatan rinci", metric: "itemized_count", threshold: 75 }),

  // ── User: penabung ──
  medal({ id: "saver_50k", family: "Penabung", audience: "user", tier: "bronze", glyph: "piggy",
    title: "Penabung Pemula", description: "Langkah pertama menuju impianmu.",
    requirementLabel: "Total tabungan Rp50.000", metric: "saving_amount", threshold: 50000 }),
  medal({ id: "saver_500k", family: "Penabung", audience: "user", tier: "silver", glyph: "piggy",
    title: "Penabung Tangguh", description: "Celenganmu makin berat dan berkilau.",
    requirementLabel: "Total tabungan Rp500.000", metric: "saving_amount", threshold: 500000 }),
  medal({ id: "saver_2m", family: "Penabung", audience: "user", tier: "gold", glyph: "piggy",
    title: "Sultan Celengan", description: "Disiplin menabung level sultan.",
    requirementLabel: "Total tabungan Rp2.000.000", metric: "saving_amount", threshold: 2000000 }),

  // ── User: dompet aman & rutin ──
  medal({ id: "safe_7", family: "Dompet Aman", audience: "user", tier: "bronze", glyph: "shield",
    title: "Perisai Dompet", description: "Pengeluaran harian tetap di batas aman.",
    requirementLabel: "7 hari pengeluaran aman", metric: "safe_days", threshold: 7 }),
  medal({ id: "safe_30", family: "Dompet Aman", audience: "user", tier: "silver", glyph: "shield",
    title: "Penjaga Anggaran", description: "Sebulan lebih dompetmu terkendali.",
    requirementLabel: "30 hari pengeluaran aman", metric: "safe_days", threshold: 30 }),
  medal({ id: "days_14", family: "Pencatat Setia", audience: "user", tier: "bronze", glyph: "calendar",
    title: "Pencatat Setia", description: "Dua pekan penuh punya catatan.",
    requirementLabel: "14 hari bercatatan", metric: "record_days", threshold: 14 }),
  medal({ id: "days_60", family: "Pencatat Setia", audience: "user", tier: "silver", glyph: "calendar",
    title: "Arsiparis Kas", description: "Hari-harimu terarsip rapi.",
    requirementLabel: "60 hari bercatatan", metric: "record_days", threshold: 60 }),

  // ── Anak SD: penulis ──
  medal({ id: "story_3", family: "Penulis Cilik", audience: "schoolchild", tier: "bronze", glyph: "pen",
    title: "Penulis Cilik Pemula", description: "Tiga cerita pertamamu sudah lahir.",
    requirementLabel: "Tulis 3 cerita", metric: "story_count", threshold: 3 }),
  medal({ id: "story_15", family: "Penulis Cilik", audience: "schoolchild", tier: "silver", glyph: "pen",
    title: "Penulis Cilik Berbakat", description: "Ceritamu makin hidup dan seru.",
    requirementLabel: "Tulis 15 cerita", metric: "story_count", threshold: 15 }),
  medal({ id: "story_50", family: "Penulis Cilik", audience: "schoolchild", tier: "gold", glyph: "pen",
    title: "Pujangga Cilik", description: "Lima puluh cerita. Hebat sekali!",
    requirementLabel: "Tulis 50 cerita", metric: "story_count", threshold: 50 }),

  // ── Anak SD: emosi ──
  medal({ id: "emotion_3", family: "Sahabat Emosi", audience: "schoolchild", tier: "bronze", glyph: "heart",
    title: "Sahabat Emosi Jujur", description: "Berani menceritakan tiga perasaan berbeda.",
    requirementLabel: "Catat 3 jenis perasaan", metric: "emotion_distinct", threshold: 3 }),
  medal({ id: "emotion_6", family: "Sahabat Emosi", audience: "schoolchild", tier: "silver", glyph: "heart",
    title: "Penjelajah Perasaan", description: "Kamu sudah mengenal keenam perasaan.",
    requirementLabel: "Catat 6 jenis perasaan", metric: "emotion_distinct", threshold: 6 }),
  medal({ id: "emotion_20", family: "Sahabat Emosi", audience: "schoolchild", tier: "gold", glyph: "heart",
    title: "Master Empati", description: "Dua puluh jurnal perasaan yang jujur.",
    requirementLabel: "20 jurnal emosi", metric: "emotion_stories", threshold: 20 }),

  // ── Anak SD: kosa kata ──
  medal({ id: "vocab_3", family: "Juara Kosa Kata", audience: "schoolchild", tier: "bronze", glyph: "book",
    title: "Juara Kosa Kata", description: "Lulus tiga permainan bahasa.",
    requirementLabel: "Lulus 3 game Bahasa", metric: "arcade_language", threshold: 3 }),
  medal({ id: "vocab_15", family: "Juara Kosa Kata", audience: "schoolchild", tier: "silver", glyph: "book",
    title: "Bintang Bahasa", description: "Kosa katamu makin kaya.",
    requirementLabel: "Lulus 15 game Bahasa", metric: "arcade_language", threshold: 15 }),

  // ── Anak SD: celengan ──
  medal({ id: "piggy_5", family: "Celengan", audience: "schoolchild", tier: "bronze", glyph: "piggy",
    title: "Penabung Celengan Ulung", description: "Lima kali memasukkan koin ke celengan.",
    requirementLabel: "5 kali menabung", metric: "saving_deposits", threshold: 5 }),
  medal({ id: "piggy_20", family: "Celengan", audience: "schoolchild", tier: "silver", glyph: "coin",
    title: "Raja Koin Kecil", description: "Dua puluh koin masuk celengan.",
    requirementLabel: "20 kali menabung", metric: "saving_deposits", threshold: 20 }),

  // ── Anak SD: arcade ──
  medal({ id: "arcade_10", family: "Petualang Arcade", audience: "schoolchild", tier: "bronze", glyph: "gamepad",
    title: "Petualang Arcade", description: "Sepuluh game berhasil dilewati.",
    requirementLabel: "Lulus 10 game", metric: "arcade_passes", threshold: 10 }),
  medal({ id: "arcade_50", family: "Petualang Arcade", audience: "schoolchild", tier: "silver", glyph: "gamepad",
    title: "Jagoan Arcade", description: "Lima puluh game lulus.",
    requirementLabel: "Lulus 50 game", metric: "arcade_passes", threshold: 50 }),
  medal({ id: "arcade_24", family: "Petualang Arcade", audience: "schoolchild", tier: "diamond", glyph: "gamepad",
    title: "Master 24 Mode", description: "Semua 24 mode arcade sudah kamu taklukkan.",
    requirementLabel: "Lulus 24 mode berbeda", metric: "arcade_modes", threshold: 24 }),
];

export const MEDAL_BY_ID: Record<string, MedalDef> = Object.fromEntries(
  MEDAL_CATALOG.map((m) => [m.id, m])
);

export function medalsForAudience(aud: QuestAudience): MedalDef[] {
  return MEDAL_CATALOG.filter((m) => m.audience === "both" || m.audience === aud);
}

export interface MedalProgress {
  def: MedalDef;
  value: number;
  earned: boolean;
  pct: number;
}

export function evaluateMedals(
  aud: QuestAudience,
  inputs: MetricInputs
): MedalProgress[] {
  const win = lifetimeWindow(inputs.today);
  return medalsForAudience(aud).map((def) => {
    const value = computeMetric(def.metric, inputs, win);
    return {
      def,
      value,
      earned: value >= def.threshold,
      pct: Math.min(100, Math.round((value / def.threshold) * 100)),
    };
  });
}

/* ───────────────────────── Katalog misi ───────────────────────── */

export interface QuestDef {
  id: string;
  audience: QuestAudience;
  period: QuestPeriod;
  title: string;
  description: string;
  metric: MetricKey;
  target: number;
  /** Medali yang ikut maju saat misi ini dikerjakan. */
  medalId: string;
}

function q(
  id: string,
  audience: QuestAudience,
  period: QuestPeriod,
  title: string,
  description: string,
  metric: MetricKey,
  target: number,
  medalId: string
): QuestDef {
  return { id, audience, period, title, description, metric, target, medalId };
}

export const QUEST_CATALOG: QuestDef[] = [
  /* ── USER · HARIAN (14) ── */
  q("u-d-catat", "user", "daily", "Catat Kas Hari Ini", "Buat minimal 1 catatan kas hari ini.", "tx_count", 1, "days_14"),
  q("u-d-rinci", "user", "daily", "Detektif Struk Harian", "Catat 1 pengeluaran dengan minimal 2 rincian item.", "itemized_count", 1, "detail_5"),
  q("u-d-rinci2", "user", "daily", "Dua Struk Lengkap", "Buat 2 catatan rinci (≥2 item) hari ini.", "itemized_count", 2, "detail_25"),
  q("u-d-aman", "user", "daily", "Hari Dompet Aman", "Akhiri hari dengan pengeluaran di bawah batas aman.", "safe_days", 1, "safe_7"),
  q("u-d-nowant", "user", "daily", "Puasa Jajan", "Catat hari ini tanpa pengeluaran keinginan (jajan).", "no_want_days", 1, "safe_30"),
  q("u-d-awal", "user", "daily", "Jurnal Jujur Sebelum 21.00", "Catat transaksimu sebelum pukul 21.00.", "early_records", 1, "days_60"),
  q("u-d-setor", "user", "daily", "Setor Celengan", "Setor tabungan minimal 1 kali hari ini.", "saving_deposits", 1, "saver_50k"),
  q("u-d-setor2", "user", "daily", "Setor Dua Kali", "Setor tabungan 2 kali hari ini (pagi dan sore).", "saving_deposits", 2, "saver_500k"),
  q("u-d-kebutuhan", "user", "daily", "Kebutuhan Dulu", "Catat 1 pengeluaran kebutuhan pokok.", "need_records", 1, "safe_7"),
  q("u-d-income", "user", "daily", "Catat Pemasukan", "Catat 1 pemasukan (uang saku, hadiah, atau gaji).", "income_records", 1, "days_14"),
  q("u-d-api", "user", "daily", "Jaga Api Streak", "Pastikan streakmu tetap menyala hari ini (≥1 hari).", "streak_len", 1, "streak_7"),
  q("u-d-tiga", "user", "daily", "Tiga Catatan Rapi", "Buat 3 catatan kas berbeda hari ini.", "tx_count", 3, "detail_75"),
  q("u-d-dua", "user", "daily", "Dua Catatan Rapi", "Buat 2 catatan kas berbeda hari ini.", "tx_count", 2, "days_14"),
  q("u-d-celeng3", "user", "daily", "Setoran Besar Hari Ini", "Setor total minimal Rp20.000 ke celengan.", "saving_amount", 20000, "saver_500k"),

  /* ── USER · MINGGUAN (8) ── */
  q("u-w-hari5", "user", "weekly", "Lima Hari Bercatatan", "Punya catatan di 5 hari berbeda pekan ini.", "record_days", 5, "days_14"),
  q("u-w-hari7", "user", "weekly", "Seminggu Penuh", "Catat setiap hari selama 7 hari pekan ini.", "record_days", 7, "days_60"),
  q("u-w-rinci5", "user", "weekly", "Lima Struk Rinci", "Buat 5 catatan rinci sepanjang pekan.", "itemized_count", 5, "detail_25"),
  q("u-w-aman5", "user", "weekly", "Lima Hari Aman", "Pengeluaran aman di 5 hari pekan ini.", "safe_days", 5, "safe_30"),
  q("u-w-setor3", "user", "weekly", "Tiga Kali Menabung", "Setor celengan 3 kali pekan ini.", "saving_deposits", 3, "saver_50k"),
  q("u-w-rasio", "user", "weekly", "Target Tabungan Pekanan", "Tabunganmu pekan ini mencapai 100% dari seperempat target bulanan.", "saving_target_pct", 100, "saver_2m"),
  q("u-w-nowant3", "user", "weekly", "Tiga Hari Tanpa Jajan", "Ada 3 hari tanpa pengeluaran keinginan.", "no_want_days", 3, "safe_30"),
  q("u-w-catat12", "user", "weekly", "Dua Belas Catatan", "Kumpulkan 12 catatan kas pekan ini.", "tx_count", 12, "detail_75"),

  /* ── ANAK SD · HARIAN (14) ── */
  q("s-d-cerita", "schoolchild", "daily", "Tulis Cerita Hari Ini", "Tulis 1 cerita minimal 30 kata.", "story_count", 1, "story_3"),
  q("s-d-panjang", "schoolchild", "daily", "Cerita Panjang", "Tulis cerita sepanjang minimal 45 kata.", "story_max_words", 45, "story_15"),
  q("s-d-emosi", "schoolchild", "daily", "Jurnal Perasaan", "Tulis 1 jurnal emosi tentang perasaanmu.", "emotion_stories", 1, "emotion_3"),
  q("s-d-sekolah", "schoolchild", "daily", "Cerita Pelajaran", "Tulis tentang pelajaran sekolah hari ini.", "school_stories", 1, "story_3"),
  q("s-d-kegiatan", "schoolchild", "daily", "Cerita Kegiatan", "Ceritakan kegiatan serumu hari ini.", "activity_stories", 1, "story_15"),
  q("s-d-dongeng", "schoolchild", "daily", "Dongeng Karanganku", "Karang 1 dongeng bebas dari imajinasimu.", "imagination_stories", 1, "story_50"),
  q("s-d-koin", "schoolchild", "daily", "Masukkan Koin", "Masukkan koin ke celengan hari ini.", "saving_deposits", 1, "piggy_5"),
  q("s-d-koin2", "schoolchild", "daily", "Dua Koin Hari Ini", "Menabung 2 kali hari ini.", "saving_deposits", 2, "piggy_20"),
  q("s-d-game", "schoolchild", "daily", "Selesaikan 1 Game", "Lulus 1 game di menu Cerita, panel Games.", "arcade_passes", 1, "arcade_10"),
  q("s-d-game2", "schoolchild", "daily", "Dua Game Seru", "Lulus 2 game di menu Cerita, panel Games.", "arcade_passes", 2, "arcade_50"),
  q("s-d-bahasa", "schoolchild", "daily", "Juara Bahasa", "Lulus 1 game kategori Bahasa & Kosa Kata.", "arcade_language", 1, "vocab_3"),
  q("s-d-uang", "schoolchild", "daily", "Pintar Uang", "Lulus 1 game kategori Uang & Logika.", "arcade_money", 1, "vocab_15"),
  q("s-d-empati", "schoolchild", "daily", "Hati yang Baik", "Lulus 1 game kategori Empati & Karakter.", "arcade_empathy", 1, "emotion_20"),
  q("s-d-alam", "schoolchild", "daily", "Penjelajah Alam", "Lulus 1 game kategori Memori & Sains.", "arcade_science", 1, "arcade_24"),

  /* ── ANAK SD · MINGGUAN (8) ── */
  q("s-w-cerita3", "schoolchild", "weekly", "Tiga Cerita Pekan Ini", "Tulis 3 cerita sepanjang pekan.", "story_count", 3, "story_15"),
  q("s-w-cerita5", "schoolchild", "weekly", "Lima Cerita Pekan Ini", "Tulis 5 cerita sepanjang pekan.", "story_count", 5, "story_50"),
  q("s-w-emosi3", "schoolchild", "weekly", "Tiga Perasaan Berbeda", "Catat 3 jenis perasaan yang berbeda pekan ini.", "emotion_distinct", 3, "emotion_6"),
  q("s-w-hari5", "schoolchild", "weekly", "Lima Hari Menulis", "Punya cerita di 5 hari berbeda.", "record_days", 5, "streak_7"),
  q("s-w-koin4", "schoolchild", "weekly", "Empat Koin Celengan", "Menabung 4 kali pekan ini.", "saving_deposits", 4, "piggy_5"),
  q("s-w-game6", "schoolchild", "weekly", "Enam Game Lulus", "Lulus 6 game pekan ini.", "arcade_passes", 6, "arcade_10"),
  q("s-w-mode5", "schoolchild", "weekly", "Lima Mode Berbeda", "Lulus 5 mode arcade yang berbeda.", "arcade_modes", 5, "arcade_24"),
  q("s-w-bahasa3", "schoolchild", "weekly", "Tiga Game Bahasa", "Lulus 3 game kategori Bahasa & Kosa Kata.", "arcade_language", 3, "vocab_15"),
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUEST_CATALOG.map((d) => [d.id, d])
);

export function questsForAudience(aud: QuestAudience): QuestDef[] {
  return QUEST_CATALOG.filter((d) => d.audience === aud);
}

export const DAILY_QUEST_REWARD = { points: 15, xp: 25 } as const;
export const WEEKLY_QUEST_REWARD = { points: 150, xp: 120 } as const;
export const DAILY_QUEST_SLOTS = 3;
export const WEEKLY_QUEST_SLOTS = 2;

/* ───────────────────────── Rotasi deterministik ───────────────────────── */

/** Hash string 32-bit (FNV-1a). Deterministik di server & klien. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG kecil mulberry32 (menggantikan Math.random agar hasil bisa diulang). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Acak-ulang (Fisher-Yates) deterministik. */
export function seededShuffle<T>(items: readonly T[], seedText: string): T[] {
  const rand = mulberry32(hashString(seedText));
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ActiveQuest {
  def: QuestDef;
  periodKey: string;
  claimKey: string;
  value: number;
  target: number;
  done: boolean;
  claimed: boolean;
  rewardPoints: number;
  rewardXp: number;
}

export function questClaimKey(
  profileId: string,
  questId: string,
  periodKey: string
): string {
  return `${profileId}:${questId}:${periodKey}`;
}

/** Misi aktif hari ini (3 harian + 2 mingguan) dengan progres dan status klaim. */
export function getActiveQuests(
  profileId: string,
  aud: QuestAudience,
  inputs: MetricInputs,
  claimedKeys: Record<string, string>
): { daily: ActiveQuest[]; weekly: ActiveQuest[] } {
  const today = inputs.today;
  const weekKey = startOfWeekStr(today);

  const pick = (period: QuestPeriod, slots: number, periodKey: string) => {
    const pool = questsForAudience(aud).filter((d) => d.period === period);
    return seededShuffle(pool, `${profileId}|${period}|${periodKey}`).slice(0, slots);
  };

  const build = (def: QuestDef, periodKey: string): ActiveQuest => {
    const win = def.period === "daily" ? dayWindow(today) : weekWindow(today);
    const value = computeMetric(def.metric, inputs, win);
    const claimKey = questClaimKey(profileId, def.id, periodKey);
    const reward = def.period === "daily" ? DAILY_QUEST_REWARD : WEEKLY_QUEST_REWARD;
    return {
      def,
      periodKey,
      claimKey,
      value,
      target: def.target,
      done: value >= def.target,
      claimed: Boolean(claimedKeys[claimKey]),
      rewardPoints: reward.points,
      rewardXp: reward.xp,
    };
  };

  return {
    daily: pick("daily", DAILY_QUEST_SLOTS, today).map((d) => build(d, today)),
    weekly: pick("weekly", WEEKLY_QUEST_SLOTS, weekKey).map((d) => build(d, weekKey)),
  };
}

/** Kategori arcade -> label ringkas (dipakai halaman Misi & Pantau Supervisor). */
export const ARCADE_CATEGORY_LABEL: Record<ArcadeCategoryId, string> = {
  language: "Bahasa & Kosa Kata",
  money: "Uang & Logika",
  empathy: "Empati, Karakter & Emosi",
  science: "Memori, Sains & Kreativitas",
};

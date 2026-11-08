/**
 * Validasi cerita harian Anak SD (Versi 5.0).
 *
 * Tujuan: mendorong anak benar-benar menulis, bukan mengetik asal. Aturan murni dan
 * deterministik agar bisa dipakai bar progres langsung (live) di UI dan pengecekan akhir di store.
 */
import type { StoryCategory } from "@/lib/family-types";
import type { GlyphName } from "@/components/illustrations/GlyphIcons";

export const MIN_STORY_WORDS = 30;
/** Minimal jumlah kata unik agar cerita tidak sekadar mengulang kata yang sama. */
export const MIN_UNIQUE_WORDS = 18;
/** Satu kata tidak boleh mendominasi lebih dari porsi ini dari seluruh cerita. */
const MAX_SINGLE_WORD_SHARE = 0.2;

export interface StoryAnalysis {
  /** Kata sah (bukan ketikan asal). */
  wordCount: number;
  uniqueCount: number;
  /** 0..1 menuju batas minimal kata. */
  progress: number;
  valid: boolean;
  /** Alasan ramah anak bila belum valid; kosong bila sudah valid. */
  reason: string;
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const VOWEL_PATTERN = /[aeiouAEIOU]/;

/** Pecah teks menjadi token kata huruf kecil. */
export function tokenizeWords(text: string): string[] {
  const matches = text.toLocaleLowerCase("id-ID").match(WORD_PATTERN);
  return matches ? matches : [];
}

/**
 * Kata dianggap sah bila: >= 2 karakter (kecuali angka), tidak berupa satu huruf diulang
 * ("aaaaa"), dan kata panjang punya huruf vokal (menolak "asdfgh").
 */
function isRealWord(token: string): boolean {
  if (/^\d+$/u.test(token)) return true;
  if (token.length < 2) return false;
  if (/^(.)\1{2,}$/u.test(token)) return false;
  if (token.length >= 4 && !VOWEL_PATTERN.test(token)) return false;
  return true;
}

export function analyzeStory(text: string): StoryAnalysis {
  const tokens = tokenizeWords(text).filter(isRealWord);

  // Kata yang sama berturut-turut lebih dari 2 kali dianggap spam ("lari lari lari lari").
  const filtered: string[] = [];
  let run = 0;
  for (let i = 0; i < tokens.length; i++) {
    run = i > 0 && tokens[i] === tokens[i - 1] ? run + 1 : 1;
    if (run <= 2) filtered.push(tokens[i]);
  }

  const counts = new Map<string, number>();
  for (const t of filtered) counts.set(t, (counts.get(t) ?? 0) + 1);
  const uniqueCount = counts.size;
  const wordCount = filtered.length;
  const maxShare =
    wordCount > 0 ? Math.max(...Array.from(counts.values())) / wordCount : 0;

  const progress = Math.min(1, wordCount / MIN_STORY_WORDS);

  let reason = "";
  if (wordCount < MIN_STORY_WORDS) {
    const left = MIN_STORY_WORDS - wordCount;
    reason = `Tulis ${left} kata lagi ya. Kata asal-asalan atau yang diulang-ulang tidak dihitung.`;
  } else if (uniqueCount < MIN_UNIQUE_WORDS) {
    reason = `Ceritamu masih memakai kata yang itu-itu saja. Coba pakai minimal ${MIN_UNIQUE_WORDS} kata yang berbeda.`;
  } else if (maxShare > MAX_SINGLE_WORD_SHARE) {
    reason =
      "Ada satu kata yang terlalu sering muncul. Ganti sebagian dengan kata lain supaya ceritamu lebih kaya.";
  }

  return {
    wordCount,
    uniqueCount,
    progress,
    valid: reason === "",
    reason,
  };
}

/* ───────────────────────── Kategori & ide tulisan ───────────────────────── */

export interface StoryCategoryMeta {
  id: StoryCategory;
  icon: GlyphName;
  label: string;
  hint: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  prompts: string[];
}

export const STORY_CATEGORIES: StoryCategoryMeta[] = [
  {
    id: "activity",
    icon: "backpack",
    label: "Kegiatan Hari Ini",
    hint: "Ceritakan apa saja yang kamu lakukan hari ini, dari bangun tidur sampai sekarang.",
    titlePlaceholder: "Contoh: Bermain layang-layang di lapangan",
    bodyPlaceholder:
      "Hari ini aku bangun pagi, lalu... Setelah itu aku... Aku paling suka waktu...",
    prompts: [
      "Siapa teman yang paling baik hari ini?",
      "Apa hal pertama yang kamu lakukan setelah bangun tidur?",
      "Makanan apa yang paling enak hari ini dan siapa yang memasaknya?",
      "Apa yang kamu bantu di rumah hari ini?",
    ],
  },
  {
    id: "school",
    icon: "books",
    label: "Pelajaran Sekolah Hari Ini",
    hint: "Tulis pelajaran yang kamu dapat di sekolah dan bagian yang paling kamu ingat.",
    titlePlaceholder: "Contoh: Belajar pecahan bersama Bu Guru",
    bodyPlaceholder:
      "Di sekolah tadi kami belajar tentang... Menurutku bagian yang seru adalah...",
    prompts: [
      "Apa hal baru yang kamu pelajari?",
      "Pelajaran apa yang paling kamu suka hari ini, dan kenapa?",
      "Apa yang masih sulit dan ingin kamu tanyakan ke guru?",
      "Siapa yang membantumu belajar hari ini?",
    ],
  },
  {
    id: "emotion",
    icon: "smile",
    label: "Jurnal Emosi & Perasaan",
    hint: "Pilih perasaanmu, lalu ceritakan kenapa kamu merasa begitu. Semua perasaan itu boleh.",
    titlePlaceholder: "Contoh: Hari ketika aku merasa bangga",
    bodyPlaceholder:
      "Hari ini aku merasa... Itu terjadi karena... Yang aku lakukan supaya lebih tenang adalah...",
    prompts: [
      "Kapan hari ini kamu merasa paling senang?",
      "Apa yang membuatmu merasa sedikit sedih atau cemas?",
      "Siapa yang membuatmu merasa disayang hari ini?",
      "Apa yang bisa kamu lakukan supaya perasaanmu lebih tenang?",
    ],
  },
  {
    id: "imagination",
    icon: "wand",
    label: "Imajinasi & Dongeng Bebas",
    hint: "Buat dongeng karanganmu sendiri. Tokoh, tempat, dan petualangannya terserah kamu!",
    titlePlaceholder: "Contoh: Kucing yang bisa terbang ke bulan",
    bodyPlaceholder:
      "Pada suatu hari, hiduplah seekor... Ia ingin pergi ke... Di tengah perjalanan...",
    prompts: [
      "Kalau kamu bisa terbang, kamu mau pergi ke mana?",
      "Ceritakan petualangan hewan peliharaanmu di hutan permen.",
      "Apa yang terjadi kalau hujan turun berupa kue?",
      "Buat dongeng tentang robot kecil yang mencari teman.",
    ],
  },
];

export const STORY_CATEGORY_BY_ID: Record<StoryCategory, StoryCategoryMeta> =
  Object.fromEntries(STORY_CATEGORIES.map((c) => [c.id, c])) as Record<
    StoryCategory,
    StoryCategoryMeta
  >;

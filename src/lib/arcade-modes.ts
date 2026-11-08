/**
 * Katalog 24 mode Arcade Sekolah (4 kategori × 6 mode) — hanya metadata.
 * Isi soal ada di `components/schoolchild/arcade-content.ts`; mesin permainan ada di
 * `components/schoolchild/arcade-engines.tsx`. Dipakai juga oleh panel pantau Supervisor.
 */
import type { ArcadeCategoryId } from "@/lib/family-types";
import type { GlyphName } from "@/components/illustrations/GlyphIcons";

export type ArcadeEngine =
  | "choice"
  | "sentence"
  | "threeword"
  | "numeric"
  | "breath"
  | "kindness"
  | "thanks"
  | "memory"
  | "order"
  | "clock"
  | "silhouette";

export interface ArcadeModeDef {
  id: string;
  category: ArcadeCategoryId;
  title: string;
  icon: GlyphName;
  engine: ArcadeEngine;
  blurb: string;
}

export interface ArcadeCategoryDef {
  id: ArcadeCategoryId;
  label: string;
  icon: GlyphName;
  tone: string;
}

export const ARCADE_CATEGORIES: ArcadeCategoryDef[] = [
  { id: "language", label: "Bahasa", icon: "books", tone: "bg-[#F8F0FF] border-[#E2C6FF] text-[#8A3FC2]" },
  { id: "money", label: "Uang & Logika", icon: "money_bag", tone: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]" },
  { id: "empathy", label: "Empati, Karakter & Emosi", icon: "heart", tone: "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]" },
  { id: "science", label: "Memori, Sains & Kreativitas", icon: "bulb", tone: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" },
];

export const ARCADE_MODES: ArcadeModeDef[] = [
  // Bahasa
  { id: "l-sentence", category: "language", title: "Susun Kalimat Cerita", icon: "grid", engine: "sentence", blurb: "Urutkan kata-kata menjadi kalimat yang benar." },
  { id: "l-english", category: "language", title: "Kuis Bahasa Inggris Dasar", icon: "chat", engine: "choice", blurb: "Tebak arti kata Inggris sehari-hari." },
  { id: "l-antonym", category: "language", title: "Tebak Lawan Kata", icon: "swap", engine: "choice", blurb: "Pilih lawan kata yang tepat." },
  { id: "l-spelling", category: "language", title: "Pilih Ejaan Benar", icon: "pen", engine: "choice", blurb: "Mana tulisan kata yang benar?" },
  { id: "l-proverb", category: "language", title: "Lengkapi Peribahasa Anak", icon: "book_open", engine: "choice", blurb: "Lengkapi peribahasa yang sering kita dengar." },
  { id: "l-threeword", category: "language", title: "Tantangan 3 Kata Jadi Cerita", icon: "dice", engine: "threeword", blurb: "Buat cerita mini dari tiga kata ajaib." },
  // Uang & Logika
  { id: "m-change", category: "money", title: "Hitung Kembalian Kantin", icon: "receipt", engine: "numeric", blurb: "Berapa uang kembalianmu di kantin?" },
  { id: "m-denom", category: "money", title: "Kenali Pecahan Rupiah", icon: "coin", engine: "choice", blurb: "Kenali uang kertas dan koin rupiah." },
  { id: "m-compare", category: "money", title: "Bandingkan Harga Hemat", icon: "tag", engine: "choice", blurb: "Pilih pembelian yang paling hemat." },
  { id: "m-needwant", category: "money", title: "Kebutuhan vs Keinginan", icon: "shop_bag", engine: "choice", blurb: "Mana yang kebutuhan, mana keinginan?" },
  { id: "m-target", category: "money", title: "Hitung Target Celengan", icon: "piggy", engine: "numeric", blurb: "Berapa kali menabung sampai target tercapai?" },
  { id: "m-sequence", category: "money", title: "Deret Angka Petualang", icon: "bolt", engine: "numeric", blurb: "Tebak angka berikutnya dalam deret." },
  // Empati, Karakter & Emosi
  { id: "e-feeling", category: "empathy", title: "Tebak Perasaan Teman", icon: "smile", engine: "choice", blurb: "Bagaimana perasaan temanmu?" },
  { id: "e-breath", category: "empathy", title: "Latihan Tarik Napas", icon: "wind", engine: "breath", blurb: "Tarik napas pelan untuk menenangkan hati." },
  { id: "e-kindness", category: "empathy", title: "Misi Kebaikan Bantu Orang Tua", icon: "thumbs_up", engine: "kindness", blurb: "Centang kebaikan kecil yang kamu lakukan." },
  { id: "e-honesty", category: "empathy", title: "Kuis Kejujuran", icon: "shield", engine: "choice", blurb: "Pilih tindakan yang jujur." },
  { id: "e-thanks", category: "empathy", title: "Tulis Kartu Terima Kasih", icon: "letter", engine: "thanks", blurb: "Tulis kartu terima kasih untuk seseorang." },
  { id: "e-share", category: "empathy", title: "Simulasi Berbagi", icon: "gift", engine: "choice", blurb: "Latihan berbagi dengan teman dan keluarga." },
  // Memori, Sains & Kreativitas
  { id: "s-memory", category: "science", title: "Kartu Memori Bioma", icon: "scenery", engine: "memory", blurb: "Cocokkan pasangan kartu bioma." },
  { id: "s-order", category: "science", title: "Urutkan Kronologi Cerita", icon: "calendar", engine: "order", blurb: "Susun kejadian cerita sesuai urutannya." },
  { id: "s-nature", category: "science", title: "Kuis Pengetahuan Alam SD", icon: "leaf", engine: "choice", blurb: "Seputar hewan, tumbuhan, dan alam." },
  { id: "s-silhouette", category: "science", title: "Tebak Siluet Hewan", icon: "paw", engine: "silhouette", blurb: "Hewan apa yang bersembunyi di bayangan?" },
  { id: "s-clock", category: "science", title: "Belajar Membaca Jam", icon: "clock", engine: "clock", blurb: "Baca jarum jam dan pilih waktunya." },
  { id: "s-weekly", category: "science", title: "Cerdas Cermat Mingguan", icon: "trophy", engine: "choice", blurb: "Soal campuran yang berganti tiap minggu." },
];

export const ARCADE_MODE_BY_ID: Record<string, ArcadeModeDef> = Object.fromEntries(
  ARCADE_MODES.map((m) => [m.id, m])
);

export const ARCADE_PASS_RATIO = 0.6;

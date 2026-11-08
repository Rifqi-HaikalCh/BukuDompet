"use client";

/**
 * PetAvatarSystem — 8 Fase Pertumbuhan (Telur → Sepuh), 8 Spesies Kawaii,
 * dan 7 Slot Kosmetik terpisah. Gaya: Duolingo × Finch × Animal Crossing Cozy Kawaii.
 *
 * Pet SELALU tampil polos (tanpa baju, topi, kardus, atau latar). Seluruh pakaian,
 * topi, kacamata, syal, properti/kendaraan, aura, dan latar adalah layer kosmetik
 * independen lewat `equippedAccessories`.
 *
 * Contoh pakai:
 *   <CustomizablePetAvatar
 *     species="red_panda"
 *     stage={6}
 *     mood="proud"
 *     equippedAccessories={{
 *       head: "head_top_hat",
 *       outfit: "outfit_boss_suit",
 *       prop: "prop_pastel_scooter",
 *       aura: "aura_gold_coins",
 *       background: "bg_gold_vault",
 *     }}
 *     className="w-72"
 *   />
 *   <CustomizablePetAvatar species="cloud_unicorn" stage={1} />            // telur polos
 *   <CustomizablePetAvatar species="milk_bear" stage={8} isMysteryLocked /> // siluet rahasia
 *   <AccessoryPreviewIcon accessoryId="prop_classic_car" className="w-20" />
 *   <AccessoryPreviewIcon accessoryId="head_diamond_crown" isMysteryLocked />
 *
 * Urutan layer (belakang → depan):
 *   latar → aura → bayangan → properti-alas (belakang) → [ekor → badan → pakaian] →
 *   properti-alas (depan) → [tangan → kepala + wajah → leher → wajah-kosmetik → topi] →
 *   properti-genggam → overlay mood → papan nama.
 *
 * Catatan teknis:
 * - Setiap `motion.g` yang berotasi/berskala memakai `transformBox: "fill-box"`.
 * - Animasi menghormati preferensi "reduce motion" lewat MotionConfig.
 * - Tidak ada Math.random → aman untuk SSR / hidrasi Next.js.
 */

import {
  createContext,
  memo,
  useContext,
  useId,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";

import { EXTRA_AURA_REG } from "./ExtraAuras";
import { EXTRA_BG_REG } from "./ExtraBackgrounds";
import { EXTRA_COSMETIC_SPECS } from "./extraCosmeticSpecs";

/**
 * Reset origin transformasi untuk elemen SVG biasa (bukan motion) yang memakai atribut
 * `transform="rotate/scale/..."`. Titik asal dikunci ke pojok viewBox sehingga hasilnya sama di semua
 * browser dan tidak bergantung pada CSS global `transform-box` (aturan global itu sudah dihapus dari
 * globals.css karena menggeser bagian pet & ikon). Pakai `style={SVG_ATTR_ORIGIN}` pada elemen non-motion
 * yang punya atribut `transform`; elemen `motion.*` yang berotasi/berskala memakai `fb()` (fill-box).
 */
const SVG_ATTR_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" } as const;

/* ═════════════════════════════════════════════════════════════
 *  TYPES
 * ═════════════════════════════════════════════════════════════ */

export type PetSpecies =
  | "chubby_cat"
  | "hamster_cheek"
  | "lop_bunny"
  | "capybara_chill"
  | "red_panda"
  | "milk_bear"
  | "fennec_fox"
  | "cloud_unicorn";

export type GrowthStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
/** Alias agar kode lama yang memakai `CasteStage` tetap valid. */
export type CasteStage = GrowthStage;

/**
 * Suasana pet. `shivering_cold` = menggigil kedinginan (dipakai saat streak padam / 0 hari):
 * mata menyipit rapat, gigi bergemeletuk, pipi membiru, telinga & ekor merapat, serta salju turun.
 */
export type PetMood = "happy" | "proud" | "worried" | "shocked_boros" | "shivering_cold";

/** Deskripsi suasana (Bahasa Indonesia) untuk aria-label avatar. */
export const PET_MOOD_LABEL: Readonly<Record<PetMood, string>> = {
  happy: "senang",
  proud: "bangga",
  worried: "cemas",
  shocked_boros: "kaget melihat pengeluaran boros",
  shivering_cold: "menggigil kedinginan",
};

export type AccessorySlot = "head" | "outfit" | "face" | "neck" | "prop" | "aura" | "background";
export type AccessorySource = "shop" | "path_drop";
/** Peruntukan kosmetik: netral, khusus pet perempuan, atau khusus pet laki-laki (semua bisa dipakai siapa saja). */
export type AccessoryGender = "unisex" | "female" | "male";

export interface AccessoryItem {
  id: string;
  name: string;
  slot: AccessorySlot;
  /** Fase pertumbuhan minimum agar item terbuka (1..8). */
  stageRequirement: GrowthStage;
  /** Harga dalam poin. Item `path_drop` tidak dijual di Shop (0). */
  pricePoints: number;
  source: AccessorySource;
  /** Gaya yang dituju item ini (hanya label/filter; semua item tetap bisa dipakai pet apa pun). */
  gender: AccessoryGender;
  description: string;
}

export interface PetSpeciesInfo {
  id: PetSpecies;
  name: string;
  defaultName: string;
  /** Harga dalam poin (0 = starter gratis). */
  pricePoints: number;
  /** Tingkat kelucuan 1 (paling sederhana) … 8 (paling spesial). */
  kawaiiTier: number;
  description: string;
}

export interface GrowthStageInfo {
  stage: GrowthStage;
  name: string;
  englishName: string;
  /** Skala tubuh relatif terhadap dewasa (1.0). */
  scale: number;
  description: string;
}

export interface CustomizablePetAvatarProps {
  species: PetSpecies;
  stage: GrowthStage;
  mood?: PetMood;
  /** Satu item per slot; id harus ada di `ACCESSORY_CATALOG` dan cocok dengan slotnya. */
  equippedAccessories?: Partial<Record<AccessorySlot, string>>;
  /** Tampilkan siluet rahasia berkilau + lencana ??? (untuk fase/spesies yang belum dibuka). */
  isMysteryLocked?: boolean;
  /** Jika diisi, papan nama ditampilkan di bawah pet. */
  customName?: string;
  className?: string;
}

export interface AccessoryPreviewIconProps {
  accessoryId: string;
  /** Tampilkan kotak misterius terkunci dengan lencana `?`. */
  isMysteryLocked?: boolean;
  className?: string;
}

/* ═════════════════════════════════════════════════════════════
 *  METADATA
 * ═════════════════════════════════════════════════════════════ */

export const PET_SPECIES_LIST: readonly PetSpecies[] = [
  "chubby_cat",
  "hamster_cheek",
  "lop_bunny",
  "capybara_chill",
  "red_panda",
  "milk_bear",
  "fennec_fox",
  "cloud_unicorn",
];
export const GROWTH_STAGES: readonly GrowthStage[] = [1, 2, 3, 4, 5, 6, 7, 8];
export const PET_MOODS: readonly PetMood[] = ["happy", "proud", "worried", "shocked_boros", "shivering_cold"];
export const ACCESSORY_SLOTS: readonly AccessorySlot[] = [
  "head",
  "outfit",
  "face",
  "neck",
  "prop",
  "aura",
  "background",
];

/** Urut dari gratis → termahal & paling lucu. */
export const PET_SPECIES_CATALOG: readonly PetSpeciesInfo[] = [
  {
    id: "chubby_cat",
    name: "Kucing Mochi Gembul",
    defaultName: "Mochi",
    pricePoints: 0,
    kawaiiTier: 1,
    description: "Kucing krem-oranye bulat seperti mochi. Teman pertama yang selalu menemani, gratis!",
  },
  {
    id: "hamster_cheek",
    name: "Hamster Pipi Bakpao",
    defaultName: "Bakpao",
    pricePoints: 12000,
    kawaiiTier: 2,
    description: "Krem-peach dengan pipi gembul sebesar bakpao, memeluk sebutir biji bunga matahari.",
  },
  {
    id: "lop_bunny",
    name: "Kelinci Lup Stroberi",
    defaultName: "Stroberi",
    pricePoints: 20000,
    kawaiiTier: 3,
    description: "Putih-pink pastel dengan telinga panjang menjuntai selembut kapas.",
  },
  {
    id: "capybara_chill",
    name: "Kapibara Yuzu Santai",
    defaultName: "Yuzu",
    pricePoints: 30000,
    kawaiiTier: 4,
    description: "Cokelat karamel yang kalem. Matanya rileks, hidupnya tanpa terburu-buru.",
  },
  {
    id: "red_panda",
    name: "Panda Merah Fluffy",
    defaultName: "Rusty",
    pricePoints: 42000,
    kawaiiTier: 5,
    description: "Oranye bata dengan topeng wajah putih-cokelat dan ekor belang cincin yang tebal.",
  },
  {
    id: "milk_bear",
    name: "Beruang Susu Boba",
    defaultName: "Boba",
    pricePoints: 55000,
    kawaiiTier: 6,
    description: "Beruang krem-putih super empuk dengan telinga bulat pink dan pipi semanis susu.",
  },
  {
    id: "fennec_fox",
    name: "Rubah Fennec Bintang",
    defaultName: "Bintang",
    pricePoints: 75000,
    kawaiiTier: 7,
    description: "Krem keemasan dengan telinga raksasa berbulu pastel dan mata berbinar bintang.",
  },
  {
    id: "cloud_unicorn",
    name: "Poni Awan Pelangi",
    defaultName: "Nimbus",
    pricePoints: 100000,
    kawaiiTier: 8,
    description: "Putih selembut awan, bertanduk emas mungil dengan surai gradasi pink-biru-ungu.",
  },
] as const;

export const GROWTH_STAGE_CATALOG: readonly GrowthStageInfo[] = [
  { stage: 1, name: "Telur Ajaib", englishName: "Magic Egg", scale: 1, description: "Telur hangat yang bergoyang pelan. Ada sesuatu yang mengintip dari dalam." },
  { stage: 2, name: "Bayi Menetas", englishName: "Hatchling", scale: 0.68, description: "Mungil dengan mata super besar, masih memakai potongan cangkang." },
  { stage: 3, name: "Balita Gembul", englishName: "Toddler", scale: 0.78, description: "Tubuh bulat chubby, pipi merona, kaki pendek menggemaskan." },
  { stage: 4, name: "Anak Ceria", englishName: "Child", scale: 0.88, description: "Lincah dan penasaran pada segala hal." },
  { stage: 5, name: "Remaja Lincah", englishName: "Teen", scale: 0.95, description: "Proporsi seimbang, telinga dan ekor makin bervolume." },
  { stage: 6, name: "Dewasa Prima", englishName: "Adult", scale: 1, description: "Bulu lembut paripurna, sehat dan berkilau." },
  { stage: 7, name: "Master Anggun", englishName: "Prime", scale: 1.05, description: "Jambul lebat dengan kilau keemasan alami di ujung telinga dan ekor." },
  { stage: 8, name: "Sepuh Bijaksana", englishName: "Elder", scale: 1.02, description: "Kerutan halus yang bijak dan tatapan teduh yang hangat, tampil tenang untuk gaya apa pun." },
] as const;

export const GROWTH_STAGE_META: Readonly<Record<GrowthStage, GrowthStageInfo>> = Object.fromEntries(
  GROWTH_STAGE_CATALOG.map((g) => [g.stage, g]),
) as Record<GrowthStage, GrowthStageInfo>;

export const SLOT_LABEL: Record<AccessorySlot, string> = {
  head: "Topi & Kepala",
  outfit: "Pakaian",
  face: "Wajah",
  neck: "Leher",
  prop: "Properti",
  aura: "Aura",
  background: "Latar",
};

/* ═════════════════════════════════════════════════════════════
 *  KATALOG KOSMETIK — 176 item (144 dasar + 32 aura/latar Butik V5.1).
 *  96 dijual di Shop, 48 eksklusif drop dari peti Peta Jalur Kas Harian.
 * ═════════════════════════════════════════════════════════════ */

const ACCESSORY_CORE: readonly Omit<AccessoryItem, "gender">[] = [
  /* ── FASE 1 ── */
  { id: "head_straw_hat", name: "Topi Jerami Panen", slot: "head", stageRequirement: 1, pricePoints: 400, source: "shop", description: "Topi jerami berpita honey. Cocok untuk telur yang ingin tampil rapi." },
  { id: "outfit_tee", name: "Kaos Polos Nyaman", slot: "outfit", stageRequirement: 1, pricePoints: 500, source: "shop", description: "Kaos katun matcha dengan kantong kecil bergambar koin." },
  { id: "prop_patched_cardboard", name: "Alas Kardus Tambalan", slot: "prop", stageRequirement: 1, pricePoints: 300, source: "shop", description: "Alas kardus bekas penuh tambalan. Sederhana, tapi hangat." },
  { id: "bg_warm_room", name: "Kamar Polos Hangat", slot: "background", stageRequirement: 1, pricePoints: 600, source: "shop", description: "Kamar krem dengan jendela, tirai, dan lantai kayu yang hangat." },
  { id: "aura_floating_leaves", name: "Aura Daun Melayang", slot: "aura", stageRequirement: 1, pricePoints: 0, source: "path_drop", description: "Daun-daun hijau muda menari pelan di sekeliling pet." },
  { id: "neck_bandana", name: "Bandana Petualang", slot: "neck", stageRequirement: 1, pricePoints: 0, source: "path_drop", description: "Bandana peach bertitik krem, khas petualang kecil." },

  /* ── FASE 2 ── */
  { id: "head_pastel_ribbon", name: "Pita Pastel Manis", slot: "head", stageRequirement: 2, pricePoints: 900, source: "shop", description: "Pita lavender-peach yang bergoyang manja." },
  { id: "outfit_knit_sweater", name: "Sweater Rajut Hangat", slot: "outfit", stageRequirement: 2, pricePoints: 1100, source: "shop", description: "Sweater rajut peach berpola kepang dengan tambalan bintang." },
  { id: "prop_fluffy_cushion", name: "Bantal Empuk", slot: "prop", stageRequirement: 2, pricePoints: 1000, source: "shop", description: "Bantal bulat selembut awan untuk duduk nyaman." },
  { id: "neck_knit_scarf", name: "Syal Rajut Cozy", slot: "neck", stageRequirement: 2, pricePoints: 800, source: "shop", description: "Syal rajut belang sky dan krem dengan rumbai kecil." },
  { id: "face_round_glasses", name: "Kacamata Bulat Cendekia", slot: "face", stageRequirement: 2, pricePoints: 0, source: "path_drop", description: "Bingkai honey bulat yang membuat pet tampak pintar." },
  { id: "aura_soap_bubbles", name: "Aura Gelembung Sabun", slot: "aura", stageRequirement: 2, pricePoints: 0, source: "path_drop", description: "Gelembung sabun pelangi naik perlahan dan pecah berkilau." },

  /* ── FASE 3 ── */
  { id: "head_artist_beret", name: "Baret Seniman Cozy", slot: "head", stageRequirement: 3, pricePoints: 1500, source: "shop", description: "Baret taro dengan tangkai kecil di puncaknya." },
  { id: "outfit_barista_apron", name: "Celemek Barista", slot: "outfit", stageRequirement: 3, pricePoints: 1800, source: "shop", description: "Celemek matcha berkantong dengan lambang cangkir kopi." },
  { id: "prop_abacus", name: "Sempoa Emas Kecil", slot: "prop", stageRequirement: 3, pricePoints: 1900, source: "shop", description: "Sempoa mungil berbutir koin untuk menghitung tabungan." },
  { id: "face_cheek_bandaid", name: "Plester Pipi Lucu", slot: "face", stageRequirement: 3, pricePoints: 700, source: "shop", description: "Plester krem berhati kecil di pipi kiri." },
  { id: "aura_pink_hearts", name: "Aura Hati Pink", slot: "aura", stageRequirement: 3, pricePoints: 0, source: "path_drop", description: "Hati-hati pink melayang naik, penuh kasih sayang." },
  { id: "bg_picnic_park", name: "Taman Piknik", slot: "background", stageRequirement: 3, pricePoints: 0, source: "path_drop", description: "Padang rumput bertikar kotak-kotak dengan keranjang piknik." },

  /* ── FASE 4 ── */
  { id: "head_grad_cap", name: "Topi Wisuda Cerdas", slot: "head", stageRequirement: 4, pricePoints: 2400, source: "shop", description: "Topi wisuda berumbai honey untuk si rajin menabung." },
  { id: "outfit_cozy_hoodie", name: "Hoodie Awan Empuk", slot: "outfit", stageRequirement: 4, pricePoints: 2800, source: "shop", description: "Hoodie sky lembut dengan kantong kanguru dan tali kerut." },
  { id: "prop_matcha_boba", name: "Gelas Matcha Boba", slot: "prop", stageRequirement: 4, pricePoints: 2200, source: "shop", description: "Matcha boba dingin lengkap dengan sedotan peach." },
  { id: "neck_golden_bell", name: "Kalung Lonceng Emas", slot: "neck", stageRequirement: 4, pricePoints: 2600, source: "shop", description: "Pita merah dengan lonceng emas yang berkilau." },
  { id: "face_star_glasses", name: "Kacamata Bintang", slot: "face", stageRequirement: 4, pricePoints: 0, source: "path_drop", description: "Kacamata berbentuk bintang honey penuh kilau." },
  { id: "bg_pastel_cafe", name: "Kafe Pastel", slot: "background", stageRequirement: 4, pricePoints: 0, source: "path_drop", description: "Sudut kafe pastel dengan meja kasir, lampu gantung, dan papan menu." },

  /* ── FASE 5 ── */
  { id: "head_bunny_hood", name: "Tudung Kelinci Empuk", slot: "head", stageRequirement: 5, pricePoints: 3600, source: "shop", description: "Tudung putih-pink berkuping kelinci panjang." },
  { id: "outfit_manager_vest", name: "Rompi Manajer Muda", slot: "outfit", stageRequirement: 5, pricePoints: 4200, source: "shop", description: "Rompi taro, kemeja krem, dan dasi peach yang rapi." },
  { id: "prop_skateboard", name: "Skateboard Pastel", slot: "prop", stageRequirement: 5, pricePoints: 4500, source: "shop", description: "Papan luncur peach-krem dengan roda sky." },
  { id: "neck_bowtie", name: "Dasi Kupu-kupu Rapi", slot: "neck", stageRequirement: 5, pricePoints: 3800, source: "shop", description: "Dasi kupu-kupu taro dengan simpul honey." },
  { id: "face_sunglasses", name: "Kacamata Hitam Santai", slot: "face", stageRequirement: 5, pricePoints: 0, source: "path_drop", description: "Kacamata hitam berkilat untuk gaya akhir pekan." },
  { id: "bg_wood_library", name: "Perpustakaan Kayu", slot: "background", stageRequirement: 5, pricePoints: 0, source: "path_drop", description: "Rak buku kayu hangat dengan tangga dan lampu baca." },

  /* ── FASE 6 ── */
  { id: "head_top_hat", name: "Topi Silinder Juragan", slot: "head", stageRequirement: 6, pricePoints: 5500, source: "shop", description: "Topi silinder taro dengan pita dan gesper honey." },
  { id: "outfit_boss_suit", name: "Jas Bos Besar", slot: "outfit", stageRequirement: 6, pricePoints: 6500, source: "shop", description: "Jas emerald berkancing emas, lengkap dengan dasi." },
  { id: "prop_pastel_scooter", name: "Skuter Pastel", slot: "prop", stageRequirement: 6, pricePoints: 7000, source: "shop", description: "Skuter mint dengan lampu depan bulat dan jok cokelat." },
  { id: "face_sleep_mask", name: "Masker Tidur Awan", slot: "face", stageRequirement: 6, pricePoints: 3000, source: "shop", description: "Masker tidur taro bermata terpejam manis dan bintang kecil." },
  { id: "aura_sparkle_stars", name: "Aura Bintang Kemilau", slot: "aura", stageRequirement: 6, pricePoints: 0, source: "path_drop", description: "Bintang-bintang berkelip mengorbit di sekitar pet." },
  { id: "bg_gold_vault", name: "Ruang Brankas Emas", slot: "background", stageRequirement: 6, pricePoints: 0, source: "path_drop", description: "Brankas besar penuh batangan emas dan tumpukan koin." },

  /* ── FASE 7 ── */
  { id: "head_astronaut_helmet", name: "Helm Astronot Bintang", slot: "head", stageRequirement: 7, pricePoints: 8500, source: "shop", description: "Helm kaca bening berkilau untuk menjelajah angkasa." },
  { id: "outfit_party_gown", name: "Gaun Pesta Pastel", slot: "outfit", stageRequirement: 7, pricePoints: 9500, source: "shop", description: "Gaun lavender berenda dengan rok mengembang." },
  { id: "prop_classic_car", name: "Mobil Klasik Sultan", slot: "prop", stageRequirement: 7, pricePoints: 12000, source: "shop", description: "Mobil convertible pastel berkilau, kendaraan para sultan." },
  { id: "neck_diamond_pendant", name: "Kalung Berlian Biru", slot: "neck", stageRequirement: 7, pricePoints: 9000, source: "shop", description: "Liontin berlian biru pada rantai perak halus." },
  { id: "aura_gold_coins", name: "Aura Koin Emas Berputar", slot: "aura", stageRequirement: 7, pricePoints: 0, source: "path_drop", description: "Koin-koin emas berputar mengelilingi pemilik kekayaan." },
  { id: "bg_cloud_palace", name: "Istana Awan Pelangi", slot: "background", stageRequirement: 7, pricePoints: 0, source: "path_drop", description: "Istana di atas awan dengan menara emas dan pelangi." },

  /* ── FASE 8 ── */
  { id: "head_diamond_crown", name: "Mahkota Berlian Maharaja", slot: "head", stageRequirement: 8, pricePoints: 14000, source: "shop", description: "Mahkota emas bertabur berlian untuk sang penguasa." },
  { id: "outfit_sultan_robe", name: "Jubah Sultan Emas", slot: "outfit", stageRequirement: 8, pricePoints: 16000, source: "shop", description: "Jubah merah delima berkerah bulu ermine dan bros berlian." },
  { id: "prop_gem_scepter", name: "Tongkat Permata", slot: "prop", stageRequirement: 8, pricePoints: 15000, source: "shop", description: "Tongkat emas berpuncak berlian biru raksasa." },
  { id: "neck_royal_fur_scarf", name: "Syal Bulu Bangsawan", slot: "neck", stageRequirement: 8, pricePoints: 13000, source: "shop", description: "Syal bulu putih berbintik dengan bros emas." },
  { id: "face_diamond_monocle", name: "Monokel Berlian", slot: "face", stageRequirement: 8, pricePoints: 0, source: "path_drop", description: "Monokel emas berantai, lensa sebening berlian." },
  { id: "aura_cosmic_rainbow", name: "Aura Pelangi Kosmik", slot: "aura", stageRequirement: 8, pricePoints: 0, source: "path_drop", description: "Pelangi kosmik berputar dengan bintang dan berlian." },
] as const;

const CORE_GENDER: Readonly<Record<string, AccessoryGender>> = {
  head_pastel_ribbon: "female",
  outfit_party_gown: "female",
};

/** 96 item tambahan (12 per fase): rambut & topi, pakaian, wajah, leher, properti, aura, latar — pria/wanita/netral. */
const ACCESSORY_EXTRA: readonly AccessoryItem[] = [
  { id: "head_hair_short_crop", name: "Rambut Cepak Rapi", slot: "head", stageRequirement: 1, pricePoints: 400, source: "shop", gender: "male", description: "Potongan cepak cokelat espresso yang rapi dan segar." },
  { id: "head_cap_baseball", name: "Topi Baseball Santai", slot: "head", stageRequirement: 1, pricePoints: 400, source: "shop", gender: "unisex", description: "Topi baseball sky dengan lencana bintang kecil di depan." },
  { id: "head_beanie_knit", name: "Kupluk Rajut Pompom", slot: "head", stageRequirement: 1, pricePoints: 400, source: "shop", gender: "unisex", description: "Kupluk rajut garis-garis dengan pompom bulat yang lucu." },
  { id: "outfit_pajamas_star", name: "Piyama Bintang Malam", slot: "outfit", stageRequirement: 1, pricePoints: 500, source: "shop", gender: "unisex", description: "Piyama biru lembut bertabur bintang dan bulan sabit." },
  { id: "outfit_denim_overalls", name: "Overall Jeans Ceria", slot: "outfit", stageRequirement: 1, pricePoints: 500, source: "shop", gender: "unisex", description: "Overall denim dengan dua kancing honey dan kantong depan." },
  { id: "face_blush_stickers", name: "Stiker Pipi Merona", slot: "face", stageRequirement: 1, pricePoints: 300, source: "shop", gender: "unisex", description: "Stiker pipi bulat pink dengan kilau kecil, bikin makin merona." },
  { id: "neck_flower_lei", name: "Kalung Bunga Lei", slot: "neck", stageRequirement: 1, pricePoints: 400, source: "shop", gender: "unisex", description: "Untaian bunga warna-warni ala pantai tropis." },
  { id: "prop_balloon_bunch", name: "Seikat Balon Pesta", slot: "prop", stageRequirement: 1, pricePoints: 500, source: "shop", gender: "unisex", description: "Tiga balon pastel yang melayang ceria di genggaman." },
  { id: "face_freckles", name: "Bintik Wajah Manis", slot: "face", stageRequirement: 1, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Bintik-bintik cokelat halus di pipi dan hidung." },
  { id: "aura_fireflies", name: "Aura Kunang-kunang", slot: "aura", stageRequirement: 1, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Kunang-kunang kecil berkelip hangat di sekitar pet." },
  { id: "neck_sailor_scarf", name: "Syal Pelaut Segitiga", slot: "neck", stageRequirement: 1, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Syal segitiga biru-putih khas pelaut cilik." },
  { id: "bg_forest_glade", name: "Hutan Pagi Berembun", slot: "background", stageRequirement: 1, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Sela pepohonan dengan sinar matahari pagi dan jamur imut." },
  { id: "head_hair_bob_cut", name: "Rambut Bob Manis", slot: "head", stageRequirement: 2, pricePoints: 900, source: "shop", gender: "female", description: "Potongan bob pink-cokelat dengan poni rapi dan jepit kecil." },
  { id: "head_bucket_hat", name: "Topi Bucket Santai", slot: "head", stageRequirement: 2, pricePoints: 900, source: "shop", gender: "unisex", description: "Topi bucket krem dengan pita peach, serasi untuk jalan sore." },
  { id: "outfit_raincoat_yellow", name: "Jas Hujan Kuning", slot: "outfit", stageRequirement: 2, pricePoints: 1100, source: "shop", gender: "unisex", description: "Jas hujan kuning cerah berkancing, siap melompat di genangan." },
  { id: "outfit_sundress_floral", name: "Terusan Bunga Musim Semi", slot: "outfit", stageRequirement: 2, pricePoints: 1100, source: "shop", gender: "female", description: "Terusan peach berbunga-bunga dengan tali pundak dan rok melebar." },
  { id: "face_eyelashes_cute", name: "Bulu Mata Lentik", slot: "face", stageRequirement: 2, pricePoints: 600, source: "shop", gender: "female", description: "Bulu mata lentik yang membuat tatapan makin berbinar." },
  { id: "face_nerd_glasses", name: "Kacamata Kotak Kutu Buku", slot: "face", stageRequirement: 2, pricePoints: 600, source: "shop", gender: "unisex", description: "Bingkai kotak tebal dengan plester kecil di tengah." },
  { id: "neck_ribbon_choker", name: "Kalung Pita Choker", slot: "neck", stageRequirement: 2, pricePoints: 800, source: "shop", gender: "female", description: "Pita satin taro dengan lonceng-hati mungil." },
  { id: "prop_pastel_umbrella", name: "Payung Pastel Polkadot", slot: "prop", stageRequirement: 2, pricePoints: 1100, source: "shop", gender: "unisex", description: "Payung pink berpolkadot krem, genggam sambil bergaya." },
  { id: "head_hair_side_part", name: "Rambut Belah Samping", slot: "head", stageRequirement: 2, pricePoints: 0, source: "path_drop", gender: "male", description: "Rambut hitam kilap belah samping ala anak rajin." },
  { id: "aura_butterflies", name: "Aura Kupu-kupu", slot: "aura", stageRequirement: 2, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Kupu-kupu pastel menari mengelilingi pet." },
  { id: "neck_star_pendant", name: "Liontin Bintang Kecil", slot: "neck", stageRequirement: 2, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Liontin bintang honey pada rantai tipis." },
  { id: "bg_candy_land", name: "Negeri Permen", slot: "background", stageRequirement: 2, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Bukit gula-gula, lollipop raksasa, dan awan kapas manis." },
  { id: "head_hair_pigtails", name: "Kuncir Dua Ceria", slot: "head", stageRequirement: 3, pricePoints: 1500, source: "shop", gender: "female", description: "Dua kuncir tinggi berpita merah muda yang bergoyang." },
  { id: "head_hair_spiky", name: "Rambut Jabrik Energik", slot: "head", stageRequirement: 3, pricePoints: 1500, source: "shop", gender: "male", description: "Rambut jabrik berdiri penuh semangat dengan sorot oranye." },
  { id: "head_chef_hat", name: "Topi Koki Mungil", slot: "head", stageRequirement: 3, pricePoints: 1500, source: "shop", gender: "unisex", description: "Topi koki putih mengembang, siap memasak tabungan." },
  { id: "outfit_chef_coat", name: "Seragam Koki Cilik", slot: "outfit", stageRequirement: 3, pricePoints: 1900, source: "shop", gender: "unisex", description: "Jas koki putih berkancing dua baris dan kain lap di pinggang." },
  { id: "outfit_soccer_jersey", name: "Jersey Sepak Bola", slot: "outfit", stageRequirement: 3, pricePoints: 1900, source: "shop", gender: "male", description: "Jersey merah-putih bernomor 10 dengan kerah v." },
  { id: "face_mustache_classic", name: "Kumis Klasik Bijak", slot: "face", stageRequirement: 3, pricePoints: 1000, source: "shop", gender: "male", description: "Kumis tebal melengkung ala tuan terhormat." },
  { id: "neck_necktie_red", name: "Dasi Merah Panjang", slot: "neck", stageRequirement: 3, pricePoints: 1400, source: "shop", gender: "male", description: "Dasi merah berpola garis diagonal untuk tampil formal." },
  { id: "prop_flower_bouquet", name: "Buket Bunga Segar", slot: "prop", stageRequirement: 3, pricePoints: 1800, source: "shop", gender: "unisex", description: "Buket mawar dan tulip pastel terikat pita." },
  { id: "face_cat_eye_glasses", name: "Kacamata Cat-Eye Anggun", slot: "face", stageRequirement: 3, pricePoints: 0, source: "path_drop", gender: "female", description: "Kacamata ujung lancip berbingkai pink bermanik." },
  { id: "aura_cherry_blossoms", name: "Aura Kelopak Sakura", slot: "aura", stageRequirement: 3, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Kelopak sakura berguguran lembut di sekitar pet." },
  { id: "prop_cloud_cushion", name: "Bantal Awan Melayang", slot: "prop", stageRequirement: 3, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Awan empuk berkilau yang melayang membawa pet." },
  { id: "bg_school_classroom", name: "Ruang Kelas Hangat", slot: "background", stageRequirement: 3, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Papan tulis, meja kayu, dan jendela dengan sinar sore." },
  { id: "head_hair_ponytail", name: "Kuncir Kuda Lincah", slot: "head", stageRequirement: 4, pricePoints: 2400, source: "shop", gender: "female", description: "Kuncir kuda tinggi dengan ikat rambut honey yang berayun." },
  { id: "head_hair_quiff", name: "Rambut Jambul Pomade", slot: "head", stageRequirement: 4, pricePoints: 2400, source: "shop", gender: "male", description: "Jambul tebal klimis yang menjulang gagah." },
  { id: "head_sailor_cap", name: "Topi Pelaut Petualang", slot: "head", stageRequirement: 4, pricePoints: 2400, source: "shop", gender: "unisex", description: "Topi pelaut putih berpita biru dengan jangkar kecil." },
  { id: "outfit_sailor_school", name: "Seragam Pelaut Sekolah", slot: "outfit", stageRequirement: 4, pricePoints: 3000, source: "shop", gender: "female", description: "Atasan pelaut biru-putih dengan pita merah dan rok lipit." },
  { id: "outfit_hawaiian_shirt", name: "Kemeja Hawaii Santai", slot: "outfit", stageRequirement: 4, pricePoints: 3000, source: "shop", gender: "male", description: "Kemeja pantai bermotif bunga dan daun palem." },
  { id: "face_heart_glasses", name: "Kacamata Hati Pink", slot: "face", stageRequirement: 4, pricePoints: 1700, source: "shop", gender: "unisex", description: "Kacamata berlensa hati pink yang bikin gemas." },
  { id: "neck_pearl_necklace", name: "Kalung Mutiara Putih", slot: "neck", stageRequirement: 4, pricePoints: 2200, source: "shop", gender: "female", description: "Untaian mutiara bulat berkilau dengan pengait emas." },
  { id: "prop_mini_guitar", name: "Gitar Mini Ukulele", slot: "prop", stageRequirement: 4, pricePoints: 2900, source: "shop", gender: "unisex", description: "Ukulele mungil berwarna kayu hangat untuk bernyanyi." },
  { id: "head_peci_hitam", name: "Peci Hitam Nasional", slot: "head", stageRequirement: 4, pricePoints: 0, source: "path_drop", gender: "male", description: "Peci hitam beludru dengan jahitan tepi emas." },
  { id: "aura_music_notes", name: "Aura Nada Musik", slot: "aura", stageRequirement: 4, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Not-not musik menari naik membawa melodi." },
  { id: "face_pirate_eyepatch", name: "Penutup Mata Bajak Laut", slot: "face", stageRequirement: 4, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Penutup mata hitam bergambar tengkorak imut." },
  { id: "bg_sakura_garden", name: "Taman Sakura Mekar", slot: "background", stageRequirement: 4, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Pohon sakura merah muda dengan jembatan kayu kecil." },
  { id: "head_hair_twin_buns", name: "Cepol Dua Gemas", slot: "head", stageRequirement: 5, pricePoints: 3600, source: "shop", gender: "female", description: "Dua cepol bulat di atas kepala dengan pita mungil." },
  { id: "head_hair_man_bun", name: "Rambut Cepol Pria", slot: "head", stageRequirement: 5, pricePoints: 3600, source: "shop", gender: "male", description: "Rambut diikat cepol kecil dengan sisi yang rapi." },
  { id: "head_cowboy_hat", name: "Topi Koboi Padang", slot: "head", stageRequirement: 5, pricePoints: 3600, source: "shop", gender: "unisex", description: "Topi koboi cokelat berpita dan lencana bintang." },
  { id: "outfit_kebaya_modern", name: "Kebaya Modern Anggun", slot: "outfit", stageRequirement: 5, pricePoints: 4500, source: "shop", gender: "female", description: "Kebaya taro berenda dengan kain batik sederhana di pinggang." },
  { id: "outfit_batik_shirt", name: "Kemeja Batik Parang", slot: "outfit", stageRequirement: 5, pricePoints: 4500, source: "shop", gender: "male", description: "Kemeja batik cokelat-emas bermotif parang dengan kancing rapi." },
  { id: "face_mustache_curly", name: "Kumis Melengkung Dandy", slot: "face", stageRequirement: 5, pricePoints: 2500, source: "shop", gender: "male", description: "Kumis ujung melingkar bergaya dandy." },
  { id: "neck_ruffle_collar", name: "Kerah Renda Putri", slot: "neck", stageRequirement: 5, pricePoints: 3200, source: "shop", gender: "female", description: "Kerah renda berlapis krem dengan pita tengah." },
  { id: "prop_pastel_bicycle", name: "Sepeda Pastel Keranjang", slot: "prop", stageRequirement: 5, pricePoints: 4300, source: "shop", gender: "unisex", description: "Sepeda mint dengan keranjang bunga di depan." },
  { id: "head_hijab_pastel", name: "Kerudung Pastel Lembut", slot: "head", stageRequirement: 5, pricePoints: 0, source: "path_drop", gender: "female", description: "Kerudung pastel lembut dengan bros bunga kecil." },
  { id: "aura_clover_luck", name: "Aura Semanggi Hoki", slot: "aura", stageRequirement: 5, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Semanggi daun empat berputar membawa keberuntungan." },
  { id: "neck_camera_strap", name: "Kamera Saku Kalung", slot: "neck", stageRequirement: 5, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Kamera analog mungil tergantung di tali kulit." },
  { id: "bg_beach_sunset", name: "Pantai Senja Oranye", slot: "background", stageRequirement: 5, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Pantai dengan matahari terbenam dan ombak lembut." },
  { id: "head_hair_long_straight", name: "Rambut Panjang Lurus", slot: "head", stageRequirement: 6, pricePoints: 5500, source: "shop", gender: "female", description: "Rambut panjang lurus berkilau dengan jepit bunga." },
  { id: "head_hair_mohawk", name: "Rambut Mohawk Keren", slot: "head", stageRequirement: 6, pricePoints: 5500, source: "shop", gender: "male", description: "Mohawk pastel melengkung gagah di tengah kepala." },
  { id: "head_witch_hat", name: "Topi Penyihir Bulan", slot: "head", stageRequirement: 6, pricePoints: 5500, source: "shop", gender: "unisex", description: "Topi runcing ungu bergesper dengan bintang dan bulan." },
  { id: "outfit_yukata_sakura", name: "Yukata Sakura", slot: "outfit", stageRequirement: 6, pricePoints: 6900, source: "shop", gender: "unisex", description: "Yukata biru muda bermotif sakura dengan obi merah muda." },
  { id: "outfit_tuxedo_dapper", name: "Tuksedo Pesta Dandy", slot: "outfit", stageRequirement: 6, pricePoints: 6900, source: "shop", gender: "male", description: "Tuksedo hitam berkerah satin dan dasi kupu-kupu merah." },
  { id: "face_goatee_beard", name: "Jenggot Kambing Gagah", slot: "face", stageRequirement: 6, pricePoints: 3800, source: "shop", gender: "male", description: "Jenggot tipis di dagu yang membuat pet tampak dewasa." },
  { id: "neck_heart_locket", name: "Liontin Hati Rahasia", slot: "neck", stageRequirement: 6, pricePoints: 5000, source: "shop", gender: "female", description: "Liontin emas berbentuk hati yang bisa dibuka." },
  { id: "prop_magic_wand", name: "Tongkat Sihir Bintang", slot: "prop", stageRequirement: 6, pricePoints: 6600, source: "shop", gender: "unisex", description: "Tongkat sihir bintang yang menebar kilau." },
  { id: "head_headphones", name: "Headphone Besar Kinclong", slot: "head", stageRequirement: 6, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Headphone peach tebal dengan bantalan empuk." },
  { id: "aura_snowflakes", name: "Aura Kristal Salju", slot: "aura", stageRequirement: 6, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Kristal salju berkilau berputar dingin dan indah." },
  { id: "face_masquerade_mask", name: "Topeng Pesta Misteri", slot: "face", stageRequirement: 6, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Topeng pesta taro berhias bulu dan permata." },
  { id: "bg_snowy_village", name: "Desa Salju Cozy", slot: "background", stageRequirement: 6, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Rumah-rumah mungil bersalju dengan lampu hangat." },
  { id: "head_hair_twin_braids", name: "Kepang Dua Panjang", slot: "head", stageRequirement: 7, pricePoints: 8500, source: "shop", gender: "female", description: "Dua kepang panjang berpita yang jatuh di bahu." },
  { id: "head_wizard_hat", name: "Topi Penyihir Agung", slot: "head", stageRequirement: 7, pricePoints: 8500, source: "shop", gender: "unisex", description: "Topi kerucut tinggi biru berhias bintang-bintang." },
  { id: "outfit_ballet_tutu", name: "Tutu Balerina Pastel", slot: "outfit", stageRequirement: 7, pricePoints: 10600, source: "shop", gender: "female", description: "Leotard berlapis tutu pink pastel yang mengembang." },
  { id: "outfit_hero_cape", name: "Kostum Pahlawan Super", slot: "outfit", stageRequirement: 7, pricePoints: 10600, source: "shop", gender: "unisex", description: "Kostum merah-biru berlambang bintang dan jubah berkibar." },
  { id: "outfit_knight_armor", name: "Baju Zirah Kesatria", slot: "outfit", stageRequirement: 7, pricePoints: 10600, source: "shop", gender: "male", description: "Zirah perak berkilau dengan perisai kecil di dada." },
  { id: "face_vr_goggles", name: "Kacamata Realitas Virtual", slot: "face", stageRequirement: 7, pricePoints: 6000, source: "shop", gender: "unisex", description: "Goggle VR putih berlensa neon yang futuristik." },
  { id: "neck_medal_gold", name: "Medali Juara Emas", slot: "neck", stageRequirement: 7, pricePoints: 7600, source: "shop", gender: "unisex", description: "Medali emas bertali pita untuk sang juara." },
  { id: "prop_foam_sword", name: "Pedang Busa Pahlawan", slot: "prop", stageRequirement: 7, pricePoints: 10200, source: "shop", gender: "unisex", description: "Pedang mainan berpelindung emas yang gagah." },
  { id: "head_hair_wavy_long", name: "Rambut Ombak Panjang", slot: "head", stageRequirement: 7, pricePoints: 0, source: "path_drop", gender: "female", description: "Rambut panjang bergelombang gradasi pastel yang indah." },
  { id: "aura_fire_embers", name: "Aura Bara Api Hangat", slot: "aura", stageRequirement: 7, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Percikan api hangat melayang naik tanpa membakar." },
  { id: "prop_wooden_wagon", name: "Gerobak Kayu Piknik", slot: "prop", stageRequirement: 7, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Gerobak kayu mungil penuh buah dan bunga." },
  { id: "bg_night_sky", name: "Langit Malam Bertabur Bintang", slot: "background", stageRequirement: 7, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Langit malam dengan bulan sabit, bintang, dan awan tipis." },
  { id: "head_hair_curly_puff", name: "Rambut Keriting Mengembang", slot: "head", stageRequirement: 8, pricePoints: 14000, source: "shop", gender: "unisex", description: "Rambut keriting mengembang lucu dengan pita kuning." },
  { id: "head_santa_hat", name: "Topi Sinterklas", slot: "head", stageRequirement: 8, pricePoints: 14000, source: "shop", gender: "unisex", description: "Topi merah berpompom putih untuk musim perayaan." },
  { id: "head_flower_crown", name: "Mahkota Bunga Taman", slot: "head", stageRequirement: 8, pricePoints: 14000, source: "shop", gender: "unisex", description: "Mahkota bunga warna-warni dengan daun hijau." },
  { id: "head_cat_ears", name: "Bando Telinga Kucing", slot: "head", stageRequirement: 8, pricePoints: 14000, source: "shop", gender: "unisex", description: "Bando dengan telinga kucing pink yang menggemaskan." },
  { id: "outfit_doctor_coat", name: "Jas Dokter Ramah", slot: "outfit", stageRequirement: 8, pricePoints: 17500, source: "shop", gender: "unisex", description: "Jas putih rapi dengan stetoskop dan lencana nama." },
  { id: "face_face_paint_stars", name: "Lukisan Wajah Bintang", slot: "face", stageRequirement: 8, pricePoints: 9800, source: "shop", gender: "unisex", description: "Lukisan bintang dan hati warna-warni di pipi." },
  { id: "neck_winter_muffler", name: "Syal Tebal Musim Dingin", slot: "neck", stageRequirement: 8, pricePoints: 12600, source: "shop", gender: "unisex", description: "Syal tebal merah-putih bergaris dengan rumbai." },
  { id: "prop_rocket_ship", name: "Roket Antariksa Mini", slot: "prop", stageRequirement: 8, pricePoints: 16800, source: "shop", gender: "unisex", description: "Roket pastel berapi kecil, siap melesat ke bulan." },
  { id: "face_lipstick_pink", name: "Lipstik Pink Berkilau", slot: "face", stageRequirement: 8, pricePoints: 0, source: "path_drop", gender: "female", description: "Bibir pink berkilau yang bikin senyum makin manis." },
  { id: "neck_dog_tag", name: "Kalung Tanda Pengenal", slot: "neck", stageRequirement: 8, pricePoints: 0, source: "path_drop", gender: "male", description: "Rantai perak dengan dua plat nama tentara." },
  { id: "aura_galaxy_swirl", name: "Aura Pusaran Galaksi", slot: "aura", stageRequirement: 8, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Pusaran galaksi ungu-biru dengan bintang berkilau." },
  { id: "bg_city_night", name: "Atap Kota Malam Hari", slot: "background", stageRequirement: 8, pricePoints: 0, source: "path_drop", gender: "unisex", description: "Atap gedung dengan gemerlap lampu kota di kejauhan." },
];

/** Seluruh katalog: 48 item dasar + 96 tambahan + 32 aura/latar Butik (V5.1) = 176 item. */
export const ACCESSORY_CATALOG: readonly AccessoryItem[] = [
  ...ACCESSORY_CORE.map((a): AccessoryItem => ({ ...a, gender: CORE_GENDER[a.id] ?? "unisex" })),
  ...ACCESSORY_EXTRA,
  // Versi 5.1: 16 aura + 16 latar tambahan, semuanya dapat dibeli di Butik.
  ...EXTRA_COSMETIC_SPECS.map((e): AccessoryItem => ({ ...e, source: "shop", gender: "unisex" })),
];

export type AccessoryId = (typeof ACCESSORY_CATALOG)[number]["id"];

export const ACCESSORY_BY_ID: Readonly<Record<string, AccessoryItem>> = Object.fromEntries(
  ACCESSORY_CATALOG.map((a) => [a.id, a]),
);

const HIJAB_ID = "head_hijab_pastel";
const BUNNY_HOOD_ID = "head_bunny_hood";

/**
 * Item kepala berupa rambut atau hijab (menutupi seluruh kepala).
 * Pada Fase 1 (telur) item seperti ini tidak dirender; hanya topi/aksesori kecil yang tampil.
 */
export function isHairAccessory(id?: string): boolean {
  return Boolean(id) && (id!.startsWith("head_hair_") || id === HIJAB_ID);
}

export function getAccessory(id: string): AccessoryItem | undefined {
  return ACCESSORY_BY_ID[id];
}

export function getAccessoriesBySlot(slot: AccessorySlot): AccessoryItem[] {
  return ACCESSORY_CATALOG.filter((a) => a.slot === slot);
}

export function getAccessoriesByGender(gender: AccessoryGender): AccessoryItem[] {
  return ACCESSORY_CATALOG.filter((a) => a.gender === gender || a.gender === "unisex");
}

export const ACCESSORY_GENDER_LABEL: Record<AccessoryGender, string> = {
  unisex: "Netral",
  female: "Perempuan",
  male: "Laki-laki",
};

export function getAccessoriesByStage(stage: GrowthStage): AccessoryItem[] {
  return ACCESSORY_CATALOG.filter((a) => a.stageRequirement === stage);
}

export function isAccessoryUnlocked(item: AccessoryItem, stage: GrowthStage): boolean {
  return stage >= item.stageRequirement;
}

export function getSpeciesInfo(species: PetSpecies): PetSpeciesInfo {
  return PET_SPECIES_CATALOG.find((s) => s.id === species) ?? PET_SPECIES_CATALOG[0];
}
/* ═════════════════════════════════════════════════════════════
 *  TOKENS & HELPERS
 * ═════════════════════════════════════════════════════════════ */

const INK = "#3D352E";

const C = {
  cream: "#FFFDF7",
  matcha: "#58CC02",
  matchaDark: "#46A302",
  matchaSoft: "#8EE04A",
  honey: "#FFC800",
  honeyDark: "#E5A400",
  honeySoft: "#FFE27A",
  peach: "#FF8B7B",
  peachDark: "#E06353",
  peachSoft: "#FFB5A8",
  taro: "#CE82FF",
  taroDark: "#A552DB",
  taroSoft: "#E3B6FF",
  sky: "#38B6FF",
  skyDark: "#1E88E5",
  skySoft: "#BDE7FF",
  ink: INK,
  mouth: "#5B2E2E",
  steel: "#B9C9D4",
  steelDark: "#8FA5B4",
  wood: "#D99A5B",
  woodDark: "#B77C3F",
  woodLight: "#EBB67A",
  cardboard: "#E8B87A",
  cardboardLight: "#F4D3A3",
  cardboardDark: "#C8935A",
  burlap: "#D9B98C",
  wheel: "#6C6258",
} as const;

const O = {
  stroke: INK,
  strokeWidth: 3.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const O3 = { ...O, strokeWidth: 3 } as const;
const O25 = { ...O, strokeWidth: 2.5 } as const;
const O2 = { ...O, strokeWidth: 2 } as const;

/** Style wajib untuk motion.g yang berotasi/berskala: kotak transform = bbox elemen. */
const fb = (originX = 0.5, originY = 0.5) =>
  ({ transformBox: "fill-box", originX, originY }) as const;

const loop = (duration: number, extra: Transition = {}): Transition =>
  ({ duration, repeat: Infinity, ease: "easeInOut", ...extra }) as Transition;

type Pt = [number, number];

const f2 = (n: number): string => n.toFixed(2);

const starPoints = (cx: number, cy: number, R: number, r: number, n = 5): string =>
  Array.from({ length: n * 2 }, (_, i) => {
    const rr = i % 2 === 0 ? R : r;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${f2(cx + rr * Math.cos(a))},${f2(cy + rr * Math.sin(a))}`;
  }).join(" ");

const sparklePath = (s: number): string =>
  `M0 ${-s} Q${s * 0.16} ${-s * 0.16} ${s} 0 Q${s * 0.16} ${s * 0.16} 0 ${s} Q${-s * 0.16} ${s * 0.16} ${-s} 0 Q${-s * 0.16} ${-s * 0.16} 0 ${-s}Z`;

/** Highlight kilap krem. */
function Hl({ d, w = 3, o = 0.9 }: { d: string; w?: number; o?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={C.cream}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={o}
    />
  );
}

/** Garis dua lapis: tepi tinta + warna. */
function Duo({ d, inner, ow = 7, iw = 4 }: { d: string; inner: string; ow?: number; iw?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={ow} />
      <path d={d} stroke={inner} strokeWidth={iw} />
    </g>
  );
}

/** Kilau berkedip (animasi). */
function Sparkle({
  x,
  y,
  size = 8,
  color = C.honey,
  delay = 0,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.path
        d={sparklePath(size)}
        fill={color}
        style={fb()}
        animate={{ scale: [0.4, 1.1, 0.4], rotate: [0, 90, 180], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    </g>
  );
}

function Coin({ r = 12 }: { r?: number }) {
  const sw = r < 10 ? 2.5 : 3;
  return (
    <g>
      <circle r={r} fill={C.honey} {...O} strokeWidth={sw} />
      <circle r={r * 0.62} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={2} />
      <path d={`M${-r * 0.1} ${-r * 0.3} V${r * 0.3}`} stroke={C.honeyDark} strokeWidth={2.4} strokeLinecap="round" />
      <path
        d={`M${-r * 0.62} ${-r * 0.2} Q${-r * 0.5} ${-r * 0.55} ${-r * 0.1} ${-r * 0.68}`}
        fill="none"
        stroke={C.cream}
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.9}
      />
    </g>
  );
}

function Diamond({ s = 12 }: { s?: number }) {
  return (
    <g>
      <polygon
        points={`${-s},${-s * 0.25} ${-s * 0.55},${-s * 0.8} ${s * 0.55},${-s * 0.8} ${s},${-s * 0.25} 0,${s}`}
        fill={C.sky}
        {...O3}
        strokeWidth={s < 9 ? 2.2 : 3}
      />
      <path
        d={`M${-s} ${-s * 0.25} H${s} M${-s * 0.55} ${-s * 0.8} L${-s * 0.25} ${-s * 0.25} L0 ${s} M${s * 0.55} ${-s * 0.8} L${s * 0.25} ${-s * 0.25} L0 ${s}`}
        fill="none"
        stroke={C.cream}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </g>
  );
}

function CoinStack({ x, y, n, rx = 14, ry = 5.4, h = 7.5 }: { x: number; y: number; n: number; rx?: number; ry?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      {Array.from({ length: n }).map((_, i) => {
        const yy = -i * h;
        return (
          <g key={i}>
            <path
              d={`M${-rx} ${yy} V${yy - h} H${rx} V${yy} A${rx} ${ry} 0 0 1 ${-rx} ${yy}Z`}
              fill={C.honey}
              {...O25}
            />
            <ellipse cx={0} cy={yy - h} rx={rx} ry={ry} fill={C.honeySoft} {...O25} />
          </g>
        );
      })}
    </g>
  );
}

/** Paw / tangan depan. */
function Paw({
  cx,
  cy,
  rx = 15,
  ry = 12.5,
  fill,
  toes = true,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  fill: string;
  toes?: boolean;
}) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} {...O} strokeWidth={3} />
      {toes && (
        <path
          d={`M${cx - 4.5} ${cy + 3} V${cy + ry * 0.62} M${cx + 4.5} ${cy + 3} V${cy + ry * 0.62}`}
          fill="none"
          {...O25}
          opacity={0.5}
        />
      )}
    </g>
  );
}

/** Artboard avatar. */
const VB_W = 400;
const VB_H = 410;

/** Titik terendah (telapak kaki / dasar telur) semua pet di artboard. */
const GROUND = 358;

/* ═════════════════════════════════════════════════════════════
 *  KONTRAK SPESIES & RIG ANIMASI BERSAMA
 * ═════════════════════════════════════════════════════════════ */

type EyeStyle = "round" | "sleepy" | "almond" | "mask" | "star" | "bead" | "glossy";
type NoseStyle = "pink_tri" | "snout" | "oval" | "nostrils" | "button" | "heart" | "y_nose";

/** Data wajah + titik jangkar kosmetik untuk satu spesies (koordinat artboard 400×410). */
interface FaceSpec {
  eyeL: Pt;
  eyeR: Pt;
  eyeStyle: EyeStyle;
  /** Warna iris untuk eyeStyle "glossy" (default taro). */
  irisColor?: string;
  nose: NoseStyle;
  noseY: number;
  mouthY: number;
  browY: number;
  cheekY: number;
  cheekDX: number;
  cheekColor: string;
  whiskers: "cat" | "fine" | "none";
  /** Warna tangan depan. */
  pawColor: string;
  /** Titik dagu (tengah bawah kepala) — janggut fase 8 menempel di sini. */
  chin: Pt;
  /** Titik puncak kepala untuk jambul fase 7. */
  crest: Pt;
  /** Ujung telinga kiri/kanan (kilau emas fase 7). */
  earTips: [Pt, Pt];
  /** Ujung ekor (kilau emas fase 7). */
  tailTip: Pt;
  /** Y dasar topi (titik tengah antara telinga, sedikit masuk ke kepala). */
  headTop: number;
  /** Y bawah dagu untuk syal/kalung (pusat atas item leher). */
  neckY: number;
  /** Lebar relatif kepala terhadap kepala kucing (1 = 168px). Dipakai menskalakan topi. */
  hatScale: number;
  /** Path badan (hasil `Body`) — dipakai untuk memotong pakaian agar pas. */
  bodyPath: string;
  /** Pengali ukuran mata (1 = bawaan). Dikalibrasi agar mata tetap imut di kepala besar. */
  eyeScale?: number;
  /** Rambut/tudung kelinci: angkat dasar item (px) agar poni tidak menutupi mata. */
  hairLift?: number;
  /** Rambut/tudung kelinci: skala vertikal (<1 memendekkan poni) untuk kepala yang matanya dekat puncak. */
  hairSquash?: number;
  /** Hijab: pelebaran horizontal agar pipi gembul tidak terpotong kain. */
  hijabScaleX?: number;
}

/** Semua yang dibutuhkan untuk menggambar satu spesies. */
interface SpeciesArt {
  face: FaceSpec;
  /** Badan duduk lengkap dengan kaki; telapak kaki berakhir di y = GROUND. */
  Body: () => ReactElement;
  /** Telinga + kepala (tanpa wajah). Gunakan EarWrap untuk telinga bergerak. */
  Head: (p: { mood: PetMood }) => ReactElement;
  /** Ekor (dibungkus TailWrap agar bergerak mengikuti mood). */
  Tail: (p: { mood: PetMood }) => ReactElement;
  /** Telur fase 1: cangkang + corak khas spesies + telinga mungil. Pusat (200,284), rx≈62, ry≈74, dasar y = GROUND. */
  Egg: () => ReactElement;
  /** Opsional: digambar DI ATAS topi (mis. tanduk unicorn yang menembus topi). */
  FrontOfHat?: () => ReactElement;
}

interface MotionSpec {
  animate: TargetAndTransition;
  transition: Transition;
}

/** Fase pertumbuhan saat ini, dibaca EarWrap / TailWrap untuk volume telinga & ekor. */
const GrowthCtx = createContext<{ stage: GrowthStage }>({ stage: 6 });

const VOLUME: Record<GrowthStage, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1.1, 6: 1.1, 7: 1.16, 8: 1.1 };

function earSpec(mood: PetMood, side: "l" | "r", amp: number): MotionSpec {
  const s = (side === "l" ? -1 : 1) * amp;
  switch (mood) {
    case "proud":
      return { animate: { rotate: [0, s * 12, 0] }, transition: loop(0.5) };
    case "worried":
      return { animate: { rotate: [s * 24, s * 21, s * 24] }, transition: loop(0.4) };
    case "shocked_boros":
      return { animate: { rotate: [-s * 3, s * 3, -s * 3] }, transition: loop(0.25) };
    case "shivering_cold":
      // telinga merapat dan bergetar cepat
      return { animate: { rotate: [s * 16, s * 19, s * 16] }, transition: loop(0.11) };
    default:
      return {
        animate: { rotate: [0, s * 10, 0, 0] },
        transition: {
          duration: 0.5,
          times: [0, 0.35, 0.7, 1],
          repeat: Infinity,
          repeatDelay: side === "l" ? 2.4 : 3.4,
        },
      };
  }
}

/**
 * Pembungkus telinga yang bergerak sesuai mood.
 * - `ox`/`oy`: titik putar (0..1 dari bbox telinga). Default: pangkal telinga bagian bawah.
 * - `amp`: pengali amplitudo rotasi (telinga menjuntai/lop cukup 0.4–0.6).
 */
function EarWrap({
  side,
  mood,
  ox,
  oy = 0.95,
  amp = 1,
  children,
}: {
  side: "l" | "r";
  mood: PetMood;
  ox?: number;
  oy?: number;
  amp?: number;
  children: ReactNode;
}) {
  const { stage } = useContext(GrowthCtx);
  const spec = earSpec(mood, side, amp);
  return (
    <motion.g
      animate={spec.animate}
      transition={spec.transition}
      style={{ ...fb(ox ?? (side === "l" ? 0.75 : 0.25), oy), scale: VOLUME[stage] }}
    >
      {children}
    </motion.g>
  );
}

const TAIL_RIG: Record<PetMood, MotionSpec> = {
  happy: { animate: { rotate: [-6, 10, -6] }, transition: loop(2.6) },
  proud: { animate: { rotate: [-14, 16, -14] }, transition: loop(0.45) },
  worried: { animate: { rotate: [20, 25, 20] }, transition: loop(0.4) },
  shocked_boros: { animate: { rotate: [-12, -7, -12] }, transition: loop(0.25) },
  shivering_cold: { animate: { rotate: [26, 31, 26] }, transition: loop(0.1) },
};

/** Pembungkus ekor: bergoyang sesuai mood; titik putar default di pangkal ekor (kiri-bawah bbox). */
function TailWrap({
  mood,
  ox = 0.08,
  oy = 0.92,
  children,
}: {
  mood: PetMood;
  ox?: number;
  oy?: number;
  children: ReactNode;
}) {
  const { stage } = useContext(GrowthCtx);
  const spec = TAIL_RIG[mood];
  return (
    <motion.g
      animate={spec.animate}
      transition={spec.transition}
      style={{ ...fb(ox, oy), scale: VOLUME[stage] }}
    >
      {children}
    </motion.g>
  );
}

/** Dua telapak kaki depan (dipakai sebagian besar spesies di bagian bawah badan). */
function Feet({ fill, cx = 170, y = 346, rx = 22 }: { fill: string; cx?: number; y?: number; rx?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={y} rx={rx} ry={12} fill={fill} {...O} strokeWidth={3} />
      <ellipse cx={400 - cx} cy={y} rx={rx} ry={12} fill={fill} {...O} strokeWidth={3} />
      <path
        d={`M${cx - 6} ${y + 3} V${y + 8} M${cx + 4} ${y + 3} V${y + 8} M${400 - cx - 4} ${y + 3} V${y + 8} M${400 - cx + 6} ${y + 3} V${y + 8}`}
        fill="none"
        {...O25}
        opacity={0.5}
      />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  KONTRAK ITEM PROPERTI
 * ═════════════════════════════════════════════════════════════ */

interface SeatSpec {
  /** Seberapa tinggi pet terangkat dari tanah (px artboard); dasar pet berada di y = GROUND - lift. */
  lift: number;
  back: ReactNode;
  front: ReactNode;
}

type PropSpec =
  | ({ kind: "seat" } & SeatSpec)
  /** Item genggam: koordinat lokal, titik genggam (0,0), item menjulang ke -y. Digeser ke tangan kanan pet. */
  | { kind: "held"; Item: ComponentType };

/* ═════════════════════════════════════════════════════════════
 *  KONTRAK ITEM KOSMETIK TAMBAHAN (registry per slot)
 * ═════════════════════════════════════════════════════════════ */

/**
 * Rambut / topi. Koordinat lokal: (0,0) = tengah pangkal topi di ubun-ubun; item tumbuh ke -y.
 * Kepala ± 168px lebar; mata di (±35, +66), hidung ≈ +82, mulut ≈ +92, dagu ≈ +128.
 * `Back` digambar DI BELAKANG badan (rambut panjang/kuncir yang jatuh ke bahu), `Front` DI ATAS kepala.
 */
interface HeadArt {
  Front: ComponentType;
  Back?: ComponentType;
}

/** Item wajah. (0,0) = titik tengah antara dua mata; mata di (±half, 0); hidung (0,noseDY); mulut (0,mouthDY). */
interface FaceArtProps {
  half: number;
  noseDY: number;
  mouthDY: number;
}
type FaceArt = ComponentType<FaceArtProps>;

/** Item leher. (0,0) = tengah tepat di bawah dagu; ke bawah ≤ ~62px, lebar ≤ ~110px. */
type NeckArt = ComponentType;

/**
 * Pakaian (koordinat artboard, badan berpusat x=200). `Clipped` dipotong mengikuti badan spesies
 * (torso ± x112..288, y246..342), `Overlay` tidak dipotong, `Back` di belakang badan.
 */
interface OutfitArt {
  Back?: ComponentType;
  Clipped?: ComponentType;
  Overlay?: ComponentType;
}

/** Aura (koordinat artboard 400×410, pusat x=200, pusat vertikal `cy`), digambar di belakang pet. */
type AuraArt = ComponentType<{ cy: number; uid: string }>;

/** Latar penuh artboard 0..400 × 0..410 (lantai ≈ y 366), dipotong rounded rect oleh komponen utama. */
type BackgroundArt = ComponentType<{ uid: string }>;

/* ═════════════════════════════════════════════════════════════
 *  SISTEM WAJAH BERSAMA (ekspresi mood × fase pertumbuhan)
 * ═════════════════════════════════════════════════════════════ */


function Blink({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.g
      style={fb()}
      animate={{ scaleY: [1, 1, 0.1, 1] }}
      transition={{ duration: 4, times: [0, 0.93, 0.965, 1], repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.g>
  );
}

function EyeShape({ style, cx, cy, side, iris }: { style: EyeStyle; cx: number; cy: number; side: "l" | "r"; iris?: string }) {
  const o = side === "l" ? -1 : 1;
  switch (style) {
    case "sleepy":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={7.6} ry={8.6} fill={INK} />
          <circle cx={cx + 2.4} cy={cy - 2.2} r={2.8} fill={C.cream} />
          <circle cx={cx - 2.6} cy={cy + 3} r={1.3} fill={C.cream} />
          <path d={`M${cx - 11} ${cy - 10} Q${cx} ${cy - 15} ${cx + 11} ${cy - 10}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "almond":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={9.6} ry={11.8} fill={INK} transform={`rotate(${o * -10} ${cx} ${cy})`} style={SVG_ATTR_ORIGIN} />
          <circle cx={cx + 3.2} cy={cy - 4.4} r={3.8} fill={C.cream} />
          <circle cx={cx - 3} cy={cy + 4.6} r={1.8} fill={C.cream} />
          <path d={`M${cx + o * 9} ${cy - 8} L${cx + o * 16} ${cy - 13}`} fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
        </g>
      );
    case "mask":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={9} ry={10.5} fill={INK} />
          <circle cx={cx + 3} cy={cy - 4.2} r={4.2} fill={C.cream} />
          <circle cx={cx - 3.2} cy={cy + 4.4} r={2} fill={C.cream} />
        </g>
      );
    case "star":
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={12.4} ry={14.4} fill={INK} />
          <polygon points={starPoints(cx, cy - 0.5, 9.4, 4.4)} fill={C.honey} stroke={C.honeySoft} strokeWidth={1.4} strokeLinejoin="round" />
          <polygon points={starPoints(cx, cy - 0.5, 4.6, 2.2)} fill={C.honeySoft} />
          <circle cx={cx + 6} cy={cy - 7.4} r={3.2} fill={C.cream} />
          <circle cx={cx - 6} cy={cy + 8} r={1.8} fill={C.cream} />
          <circle cx={cx + 6.4} cy={cy + 6.4} r={1.1} fill={C.skySoft} />
        </g>
      );
    case "glossy": {
      const col = iris ?? C.taroDark;
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={12.2} ry={14.4} fill={INK} />
          <ellipse cx={cx} cy={cy + 1.4} rx={9.8} ry={11.8} fill={col} />
          <path d={`M${cx - 8.6} ${cy + 5} Q${cx} ${cy + 15} ${cx + 8.6} ${cy + 5} Q${cx} ${cy + 9} ${cx - 8.6} ${cy + 5}Z`} fill={C.cream} opacity={0.38} />
          <ellipse cx={cx} cy={cy + 0.4} rx={5.4} ry={6.6} fill={INK} />
          <circle cx={cx + 4.4} cy={cy - 5.4} r={4.4} fill={C.cream} />
          <circle cx={cx - 4.6} cy={cy + 5.4} r={2.3} fill={C.cream} />
          <polygon points={starPoints(cx - 5, cy - 5, 2.8, 1.2)} fill={C.cream} opacity={0.9} />
        </g>
      );
    }
    case "bead":
      return (
        <g>
          <circle cx={cx} cy={cy} r={7.4} fill={INK} />
          <circle cx={cx + 2.4} cy={cy - 2.6} r={2.6} fill={C.cream} />
          <circle cx={cx - 2} cy={cy + 2.6} r={1} fill={C.cream} />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={10} ry={12.5} fill={INK} />
          <circle cx={cx + 3.5} cy={cy - 5} r={4.2} fill={C.cream} />
          <circle cx={cx - 3.5} cy={cy + 5} r={2} fill={C.cream} />
        </g>
      );
  }
}

function Eyes({ spec, mood, stage }: { spec: FaceSpec; mood: PetMood; stage: GrowthStage }) {
  const pts: [Pt, "l" | "r"][] = [
    [spec.eyeL, "l"],
    [spec.eyeR, "r"],
  ];
  const k = (stage === 2 ? 1.6 : stage === 3 ? 1.14 : 1) * (spec.eyeScale ?? 1);

  if (mood === "proud") {
    return (
      <g>
        {pts.map(([[x, y], side], i) => (
          <motion.g
            key={side}
            style={fb()}
            animate={{ scale: [1, 1.18, 1], rotate: [-8, 8, -8] }}
            transition={loop(0.7, { delay: i * 0.1 })}
          >
            <polygon points={starPoints(x, y, 19 * k, 8.5 * k)} fill={C.honey} {...O3} />
            <circle cx={x - 4} cy={y - 4} r={3} fill={C.cream} />
          </motion.g>
        ))}
      </g>
    );
  }

  if (mood === "shivering_cold") {
    // Mata menyipit rapat ("> <") dengan geometri dihitung langsung (tanpa mirror transform)
    return (
      <g>
        {pts.map(([[x, y], side]) => {
          const dir = side === "l" ? 1 : -1;
          return (
            <g key={side}>
              <path
                d={`M${f2(x - 12 * k * dir)} ${f2(y - 9 * k)} L${f2(x + 8 * k * dir)} ${f2(y)} L${f2(x - 12 * k * dir)} ${f2(y + 9 * k)}`}
                fill="none"
                {...O}
              />
              <ellipse cx={x} cy={y + 15 * k} rx={5 * k} ry={2.4 * k} fill={C.skySoft} opacity={0.85} />
            </g>
          );
        })}
      </g>
    );
  }

  if (mood === "shocked_boros") {
    return (
      <g>
        {pts.map(([[x, y], side]) => (
          <g key={side}>
            <circle cx={x} cy={y} r={17 * k} fill={C.cream} {...O3} />
            <motion.g animate={{ x: [-1.5, 1.5, -1.5], y: [1, -1, 1] }} transition={loop(0.25)}>
              <circle cx={x} cy={y} r={5.6} fill={INK} />
              <circle cx={x + 1.8} cy={y - 2} r={1.8} fill={C.cream} />
            </motion.g>
          </g>
        ))}
      </g>
    );
  }

  return (
    <Blink>
      {pts.map(([[x, y], side]) => (
        <g key={side} transform={k === 1 ? undefined : `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`} style={SVG_ATTR_ORIGIN}>
          <EyeShape style={spec.eyeStyle} cx={x} cy={y} side={side} iris={spec.irisColor} />
          {mood === "worried" && <ellipse cx={x} cy={y + 12} rx={7} ry={2.6} fill={C.sky} opacity={0.7} />}
        </g>
      ))}
    </Blink>
  );
}

function Brows({ spec, mood, stage }: { spec: FaceSpec; mood: PetMood; stage: GrowthStage }) {
  const { eyeL, eyeR, browY } = spec;
  if (mood === "worried") {
    return (
      <motion.g animate={{ y: [0, 1.5, 0] }} transition={loop(0.8)}>
        <path d={`M${eyeL[0] - 20} ${browY + 8} Q${eyeL[0] - 4} ${browY + 2} ${eyeL[0] + 14} ${browY - 8}`} fill="none" {...O} />
        <path d={`M${eyeR[0] + 20} ${browY + 8} Q${eyeR[0] + 4} ${browY + 2} ${eyeR[0] - 14} ${browY - 8}`} fill="none" {...O} />
      </motion.g>
    );
  }
  if (mood === "shivering_cold") {
    return (
      <motion.g animate={{ y: [0, 1, 0] }} transition={loop(0.1)}>
        <path d={`M${eyeL[0] - 18} ${browY + 6} Q${eyeL[0] - 2} ${browY + 2} ${eyeL[0] + 14} ${browY - 6}`} fill="none" {...O} />
        <path d={`M${eyeR[0] + 18} ${browY + 6} Q${eyeR[0] + 2} ${browY + 2} ${eyeR[0] - 14} ${browY - 6}`} fill="none" {...O} />
      </motion.g>
    );
  }
  if (mood === "shocked_boros") {
    return (
      <motion.g animate={{ y: [0, -3, 0] }} transition={loop(0.35)}>
        <path d={`M${eyeL[0] - 18} ${browY + 4} Q${eyeL[0]} ${browY - 14} ${eyeL[0] + 18} ${browY + 2}`} fill="none" {...O} />
        <path d={`M${eyeR[0] - 18} ${browY + 2} Q${eyeR[0]} ${browY - 14} ${eyeR[0] + 18} ${browY + 4}`} fill="none" {...O} />
      </motion.g>
    );
  }
  if (stage === 4) {
    return (
      <motion.g animate={{ y: [0, -2.5, 0] }} transition={loop(2.4)}>
        <path d={`M${eyeL[0] - 12} ${browY + 2} Q${eyeL[0]} ${browY - 8} ${eyeL[0] + 12} ${browY}`} fill="none" {...O25} />
        <path d={`M${eyeR[0] - 11} ${browY + 8} Q${eyeR[0]} ${browY + 4} ${eyeR[0] + 11} ${browY + 8}`} fill="none" {...O25} />
      </motion.g>
    );
  }
  return null;
}

function Nose({ spec }: { spec: FaceSpec }) {
  const y = spec.noseY;
  switch (spec.nose) {
    case "nostrils":
      return (
        <g fill={INK}>
          <ellipse cx={187} cy={y} rx={3.4} ry={4.6} />
          <ellipse cx={213} cy={y} rx={3.4} ry={4.6} />
          <circle cx={186} cy={y - 1.4} r={1} fill={C.cream} />
          <circle cx={212} cy={y - 1.4} r={1} fill={C.cream} />
        </g>
      );
    case "oval":
      return (
        <g>
          <ellipse cx={200} cy={y} rx={10} ry={7} fill={INK} />
          <ellipse cx={197} cy={y - 2.4} rx={3.4} ry={1.8} fill={C.cream} opacity={0.85} />
        </g>
      );
    case "snout":
      return (
        <path
          d={`M191 ${y - 3} Q200 ${y - 8} 209 ${y - 3} Q206 ${y + 6} 200 ${y + 8} Q194 ${y + 6} 191 ${y - 3}Z`}
          fill={INK}
          stroke={INK}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      );
    case "button":
      return (
        <g>
          <circle cx={200} cy={y} r={5.2} fill={C.peach} {...O25} />
          <circle cx={198.4} cy={y - 1.6} r={1.4} fill={C.cream} />
        </g>
      );
    case "heart":
      return (
        <path
          d={`M200 ${y + 6} C190 ${y} 191 ${y - 7} 197 ${y - 6} Q200 ${y - 5.6} 200 ${y - 3} Q200 ${y - 5.6} 203 ${y - 6} C209 ${y - 7} 210 ${y} 200 ${y + 6}Z`}
          fill={C.peach}
          {...O25}
        />
      );
    case "y_nose":
      return (
        <g>
          <path d={`M192 ${y - 3} Q200 ${y - 7} 208 ${y - 3} Q204 ${y + 4} 200 ${y + 5} Q196 ${y + 4} 192 ${y - 3}Z`} fill={C.peach} {...O25} />
          <path d={`M200 ${y + 5} V${y + 9}`} fill="none" {...O25} />
        </g>
      );
    default:
      return (
        <path
          d={`M193 ${y - 3} Q200 ${y - 6} 207 ${y - 3} Q204 ${y + 5} 200 ${y + 7} Q196 ${y + 5} 193 ${y - 3}Z`}
          fill={C.peach}
          {...O25}
        />
      );
  }
}

function Mouth({ spec, mood, uid }: { spec: FaceSpec; mood: PetMood; uid: string }) {
  const y = spec.mouthY;
  const cx = 200;
  const calm = spec.nose === "nostrils";

  switch (mood) {
    case "proud": {
      const d = `M${cx - 18} ${y - 4} Q${cx} ${y + 34} ${cx + 18} ${y - 4}Z`;
      return (
        <g>
          <clipPath id={`${uid}-mouth`}>
            <path d={d} />
          </clipPath>
          <path d={d} fill={C.mouth} />
          <g clipPath={`url(#${uid}-mouth)`}>
            <ellipse cx={cx} cy={y + 17} rx={11} ry={8} fill={C.peach} />
          </g>
          <path d={d} fill="none" {...O} strokeWidth={3} />
        </g>
      );
    }
    case "worried":
      return (
        <motion.path
          d={`M${cx - 13} ${y + 4} Q${cx - 6.5} ${y - 4} ${cx} ${y + 4} Q${cx + 6.5} ${y + 12} ${cx + 13} ${y + 4}`}
          fill="none"
          {...O}
          strokeWidth={3}
          animate={{ y: [0, 1.2, 0] }}
          transition={loop(0.35)}
        />
      );
    case "shivering_cold": {
      // Gigi bergemeletuk: zig-zag rapat yang bergetar
      const step = 5.4;
      let d = `M${f2(cx - step * 3)} ${f2(y + 3)}`;
      for (let i = 0; i < 6; i++) d += ` l${step} ${i % 2 === 0 ? -6 : 6}`;
      return (
        <motion.path
          d={d}
          fill="none"
          {...O}
          strokeWidth={3}
          animate={{ y: [0, 1.4, 0] }}
          transition={loop(0.08)}
        />
      );
    }
    case "shocked_boros":
      return (
        <motion.g style={fb(0.5, 0)} animate={{ scaleY: [1, 1.1, 1] }} transition={loop(0.4)}>
          <clipPath id={`${uid}-mouth`}>
            <ellipse cx={cx} cy={y + 8} rx={13} ry={17} />
          </clipPath>
          <ellipse cx={cx} cy={y + 8} rx={13} ry={17} fill={C.mouth} />
          <g clipPath={`url(#${uid}-mouth)`}>
            <ellipse cx={cx} cy={y + 21} rx={10} ry={8} fill={C.peach} />
          </g>
          <ellipse cx={cx} cy={y + 8} rx={13} ry={17} fill="none" {...O} strokeWidth={3} />
        </motion.g>
      );
    default:
      return calm ? (
        <path d={`M${cx - 15} ${y - 1} Q${cx} ${y + 10} ${cx + 15} ${y - 1}`} fill="none" {...O} strokeWidth={3} />
      ) : (
        <path d={`M${cx - 18} ${y - 1} Q${cx - 9} ${y + 11} ${cx} ${y - 1} Q${cx + 9} ${y + 11} ${cx + 18} ${y - 1}`} fill="none" {...O} strokeWidth={3} />
      );
  }
}

function Cheeks({ spec, mood, stage }: { spec: FaceSpec; mood: PetMood; stage: GrowthStage }) {
  const { cheekY, cheekDX, cheekColor } = spec;
  const base =
    mood === "happy" || mood === "proud"
      ? 0.75
      : mood === "shivering_cold"
      ? 0.85
      : mood === "worried"
      ? 0.3
      : 0;
  const o = stage === 3 ? Math.min(1, base + 0.2) : base;
  const rx = stage === 3 ? 20 : stage === 2 ? 17 : 15;
  const ry = stage === 3 ? 12 : stage === 2 ? 10 : 9;
  return (
    <g fill={mood === "shivering_cold" ? C.skySoft : cheekColor}>
      {[200 - cheekDX, 200 + cheekDX].map((x) => (
        <motion.ellipse
          key={x}
          cx={x}
          cy={cheekY}
          rx={rx}
          ry={ry}
          animate={{ opacity: [o * 0.8, o, o * 0.8] }}
          transition={loop(2)}
        />
      ))}
    </g>
  );
}

function Whiskers({ spec }: { spec: FaceSpec }) {
  const [lx, ly] = spec.eyeL;
  const [rx] = spec.eyeR;
  const y = spec.noseY;
  if (spec.whiskers === "cat") {
    return (
      <g fill="none" {...O25} opacity={0.65}>
        <path d={`M${lx - 44} ${y - 2} L${lx - 72} ${y - 8} M${lx - 44} ${y + 10} L${lx - 74} ${y + 13} M${rx + 44} ${y - 2} L${rx + 72} ${y - 8} M${rx + 44} ${y + 10} L${rx + 74} ${y + 13}`} />
      </g>
    );
  }
  if (spec.whiskers === "fine") {
    return (
      <g fill="none" {...O25} opacity={0.5}>
        <path d={`M${lx - 38} ${y} L${lx - 60} ${y - 2} M${lx - 36} ${y + 11} L${lx - 56} ${y + 15} M${rx + 38} ${y} L${rx + 60} ${y - 2} M${rx + 36} ${y + 11} L${rx + 56} ${y + 15}`} />
      </g>
    );
  }
  void ly;
  return null;
}

/** Fase 8 — keriput halus (dahi, ujung mata, kantung mata, garis senyum) + kelopak teduh. Netral gender. */
function ElderDetails({ spec }: { spec: FaceSpec }) {
  const { eyeL, eyeR, browY, noseY, mouthY } = spec;
  const mid = (eyeL[0] + eyeR[0]) / 2;
  const line = { fill: "none", stroke: INK, strokeLinecap: "round", strokeLinejoin: "round", opacity: 0.5 } as const;
  const lidLine = (cx: number, cy: number) => (
    <path d={`M${cx - 12} ${cy - 5} Q${cx} ${cy - 13} ${cx + 12} ${cy - 5}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
  );
  const crow = (cx: number, cy: number, o: 1 | -1) => (
    <g {...line} strokeWidth={2.2}>
      <path d={`M${cx + o * 16} ${cy - 6} L${cx + o * 25} ${cy - 11}`} />
      <path d={`M${cx + o * 17} ${cy} L${cx + o * 27} ${cy}`} />
      <path d={`M${cx + o * 16} ${cy + 6} L${cx + o * 25} ${cy + 11}`} />
    </g>
  );
  const bag = (cx: number, cy: number) => (
    <path d={`M${cx - 9} ${cy + 17} Q${cx} ${cy + 22} ${cx + 9} ${cy + 17}`} {...line} strokeWidth={2} opacity={0.4} />
  );
  return (
    <g pointerEvents="none">
      {lidLine(eyeL[0], eyeL[1])}
      {lidLine(eyeR[0], eyeR[1])}
      {/* kerutan dahi */}
      <g {...line} strokeWidth={2.2}>
        <path d={`M${mid - 24} ${browY - 8} Q${mid} ${browY - 15} ${mid + 24} ${browY - 8}`} />
        <path d={`M${mid - 17} ${browY - 18} Q${mid} ${browY - 24} ${mid + 17} ${browY - 18}`} opacity={0.7} />
      </g>
      {crow(eyeL[0], eyeL[1], -1)}
      {crow(eyeR[0], eyeR[1], 1)}
      {bag(eyeL[0], eyeL[1])}
      {bag(eyeR[0], eyeR[1])}
      {/* garis senyum (nasolabial) */}
      <g {...line} strokeWidth={2.4}>
        <path d={`M${mid - 17} ${noseY + 3} Q${mid - 31} ${mouthY - 4} ${mid - 26} ${mouthY + 9}`} />
        <path d={`M${mid + 17} ${noseY + 3} Q${mid + 31} ${mouthY - 4} ${mid + 26} ${mouthY + 9}`} />
      </g>
    </g>
  );
}

function Face({ spec, mood, stage, uid }: { spec: FaceSpec; mood: PetMood; stage: GrowthStage; uid: string }) {
  return (
    <motion.g style={fb()} initial={{ scale: 0.94 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
      <Whiskers spec={spec} />
      <Cheeks spec={spec} mood={mood} stage={stage} />
      <Eyes spec={spec} mood={mood} stage={stage} />
      <Brows spec={spec} mood={mood} stage={stage} />
      <Nose spec={spec} />
      <Mouth spec={spec} mood={mood} uid={uid} />
      {stage === 8 && <ElderDetails spec={spec} />}
    </motion.g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  SPESIES A — Kucing Mochi, Hamster Bakpao, Kelinci Lup, Kapibara Yuzu
 * ═════════════════════════════════════════════════════════════ */

/** Path telur standar (pusat 200,284 · rx≈62 · ry≈74 · dasar y=358). */
const SA_EGG_D =
  "M200 210 C160 210 138 256 138 296 C138 336 164 358 200 358 C236 358 262 336 262 296 C262 256 240 210 200 210Z";
/** Sub-path yang persis mengikuti lengkung atas telur (untuk corak tanpa clipPath). */
const SA_EGG_CAP_D = "M138 296 C138 256 160 210 200 210 C240 210 262 256 262 296 C250 262 230 250 200 250 C170 250 150 262 138 296Z";
/** Sub-path yang persis mengikuti lengkung bawah telur. */
const SA_EGG_BASE_D = "M138 296 C138 336 164 358 200 358 C236 358 262 336 262 296 C246 316 224 322 200 322 C176 322 154 316 138 296Z";

function SaEggShine() {
  return (
    <g>
      <Hl d="M154 270 Q152 246 168 228" w={4} o={0.85} />
      <circle cx={158} cy={284} r={2.6} fill={C.cream} opacity={0.85} />
    </g>
  );
}

/* ───────────────────────── 1. KUCING MOCHI GEMBUL ───────────────────────── */

const CAT = { fur: "#FFF1D6", orange: "#FFAB5C", orangeDark: "#F08C34", cream: "#FFFDF7" } as const;

const CAT_BODY_D =
  "M132 298 C132 250 164 230 200 230 C236 230 268 250 268 298 C268 334 240 350 200 350 C160 350 132 334 132 298Z";

function CatBody() {
  return (
    <g>
      <path d={CAT_BODY_D} fill={CAT.fur} />
      <path d="M136 296 C136 264 150 248 166 241 C158 268 158 304 170 332 C150 326 136 316 136 296Z" fill={CAT.orange} />
      <path d="M264 290 C262 268 254 254 240 245 C246 266 244 292 238 308 C252 306 264 300 264 290Z" fill={CAT.orange} opacity={0.9} />
      <ellipse cx={202} cy={314} rx={33} ry={32} fill={CAT.cream} />
      <path d={CAT_BODY_D} fill="none" {...O} />
      <Feet fill={CAT.fur} cx={170} y={346} rx={22} />
    </g>
  );
}

function CatTail({ mood }: { mood: PetMood }) {
  const d = "M262 318 C322 326 342 282 316 250 C302 232 284 238 290 254";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill="none" stroke={INK} strokeWidth={28} strokeLinecap="round" />
      <path d={d} fill="none" stroke={CAT.orange} strokeWidth={21} strokeLinecap="round" />
      <path d={d} pathLength={100} fill="none" stroke={CAT.cream} strokeWidth={21} strokeLinecap="round" strokeDasharray="13 200" strokeDashoffset={-87} />
      <path d="M296 322 Q322 316 330 296" fill="none" stroke={CAT.orangeDark} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
    </TailWrap>
  );
}

function CatHead({ mood }: { mood: PetMood }) {
  const head = "M116 206 C116 150 150 128 200 128 C250 128 284 150 284 206 C284 246 250 270 200 270 C150 270 116 246 116 206Z";
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <path d="M128 172 Q114 120 136 98 Q166 108 180 140Z" fill={CAT.orange} {...O} />
        <path d="M138 152 Q132 124 142 114 Q158 124 166 140Z" fill={C.peachSoft} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <path d="M272 172 Q286 120 264 98 Q234 108 220 140Z" fill={CAT.fur} {...O} />
        <path d="M262 152 Q268 124 258 114 Q242 124 234 140Z" fill={C.peachSoft} />
      </EarWrap>
      <path d={head} fill={CAT.fur} />
      <path d="M121 180 C126 146 156 130 200 130 C244 130 274 146 279 180 C252 160 226 154 200 160 C174 154 148 160 121 180Z" fill={CAT.orange} />
      <ellipse cx={200} cy={236} rx={31} ry={21} fill={CAT.cream} />
      <g fill="none" stroke={CAT.orangeDark} strokeWidth={5} strokeLinecap="round">
        <path d="M188 132 Q192 144 187 153" />
        <path d="M200 131 V150" />
        <path d="M212 132 Q208 144 213 153" />
      </g>
      <Hl d="M140 168 Q152 152 172 146" w={3.4} o={0.55} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function CatEgg() {
  return (
    <g>
      <path d="M146 238 Q134 196 156 186 Q182 198 186 226Z" fill={CAT.orange} {...O} />
      <path d="M254 238 Q266 196 244 186 Q218 198 214 226Z" fill={CAT.fur} {...O} />
      <path d="M152 222 Q148 202 158 196 Q172 204 176 220Z" fill={C.peachSoft} />
      <path d="M248 222 Q252 202 242 196 Q228 204 224 220Z" fill={C.peachSoft} />
      <path d={SA_EGG_D} fill={CAT.fur} />
      <path d={SA_EGG_CAP_D} fill={CAT.orange} />
      <path d="M166 322 Q196 336 232 322 Q226 346 200 350 Q172 346 166 322Z" fill={CAT.cream} />
      <g fill="none" stroke={CAT.orangeDark} strokeWidth={5} strokeLinecap="round">
        <path d="M188 214 Q192 226 187 236" />
        <path d="M200 213 V232" />
        <path d="M212 214 Q208 226 213 236" />
        <path d="M232 292 q14 -4 22 6 M230 308 q14 -2 22 8" />
      </g>
      <SaEggShine />
      <path d={SA_EGG_D} fill="none" {...O} />
    </g>
  );
}

const CAT_ART: SpeciesArt = {
  face: {
    eyeL: [165, 208],
    eyeR: [235, 208],
    eyeStyle: "round",
    nose: "pink_tri",
    noseY: 217,
    mouthY: 231,
    browY: 178,
    cheekY: 230,
    cheekDX: 60,
    cheekColor: C.peach,
    whiskers: "cat",
    pawColor: CAT.fur,
    chin: [200, 270],
    crest: [200, 128],
    earTips: [
      [136, 100],
      [264, 100],
    ],
    tailTip: [290, 254],
    headTop: 138,
    neckY: 264,
    hatScale: 1,
    bodyPath: CAT_BODY_D,
  },
  Body: CatBody,
  Head: CatHead,
  Tail: CatTail,
  Egg: CatEgg,
};

/* ───────────────────────── 2. HAMSTER PIPI BAKPAO ───────────────────────── */

const HAM = {
  fur: "#FFE9CF",
  cap: "#F9C79A",
  capDark: "#EDA873",
  belly: "#FFF8EC",
  ear: "#FFC9BF",
  seed: "#6B5A4E",
} as const;

const HAMSTER_BODY_D =
  "M128 298 C128 252 160 232 200 232 C240 232 272 252 272 298 C272 334 242 350 200 350 C158 350 128 334 128 298Z";

const HAMSTER_HEAD_D =
  "M200 136 C152 136 114 156 110 194 C102 204 100 230 110 248 C122 270 152 276 178 274 L222 274 C248 276 278 270 290 248 C300 230 298 204 290 194 C286 156 248 136 200 136Z";

function HamsterBody() {
  return (
    <g>
      <path d={HAMSTER_BODY_D} fill={HAM.fur} />
      <path d="M132 296 C132 268 146 250 164 242 C156 270 158 306 170 332 C148 326 132 316 132 296Z" fill={HAM.cap} opacity={0.85} />
      <path d="M268 296 C268 268 254 250 236 242 C244 270 242 306 230 332 C252 326 268 316 268 296Z" fill={HAM.cap} opacity={0.85} />
      <ellipse cx={200} cy={312} rx={42} ry={34} fill={HAM.belly} />
      <path d={HAMSTER_BODY_D} fill="none" {...O} />
      <g transform="translate(200 322) rotate(16)" style={SVG_ATTR_ORIGIN}>
        <ellipse cx={0} cy={0} rx={10.5} ry={16.5} fill={HAM.seed} {...O25} />
        <path d="M-4 -10 Q-6 0 -3 10 M4 -10 Q6 0 3 10 M0 -12 V12" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.9} />
      </g>
      <Feet fill={HAM.fur} cx={168} y={346} rx={21} />
    </g>
  );
}

function HamsterTail({ mood }: { mood: PetMood }) {
  return (
    <TailWrap mood={mood} ox={0.1} oy={0.5}>
      <circle cx={272} cy={334} r={10} fill={HAM.cap} {...O} strokeWidth={3} />
      <Hl d="M268 329 Q271 327 274 328" w={2.4} o={0.8} />
    </TailWrap>
  );
}

function HamsterHead({ mood }: { mood: PetMood }) {
  return (
    <g>
      <EarWrap side="l" mood={mood} amp={0.6} ox={0.6} oy={0.9}>
        <circle cx={140} cy={150} r={15} fill={HAM.cap} {...O} />
        <circle cx={141} cy={152} r={8} fill={HAM.ear} />
      </EarWrap>
      <EarWrap side="r" mood={mood} amp={0.6} ox={0.4} oy={0.9}>
        <circle cx={260} cy={150} r={15} fill={HAM.cap} {...O} />
        <circle cx={259} cy={152} r={8} fill={HAM.ear} />
      </EarWrap>
      <path d={HAMSTER_HEAD_D} fill={HAM.fur} />
      <path d="M118 190 C122 154 160 140 200 140 C240 140 278 154 282 190 C254 170 228 166 200 172 C172 166 146 170 118 190Z" fill={HAM.cap} />
      <path d="M186 142 Q200 156 214 142 Q210 160 200 166 Q190 160 186 142Z" fill={HAM.capDark} opacity={0.7} />
      <ellipse cx={200} cy={242} rx={28} ry={19} fill={HAM.belly} />
      <path d="M120 214 Q114 232 122 250" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d="M280 214 Q286 232 278 250" fill="none" stroke={HAM.capDark} strokeWidth={3} strokeLinecap="round" opacity={0.35} />
      <path d={HAMSTER_HEAD_D} fill="none" {...O} />
    </g>
  );
}

function HamsterEgg() {
  return (
    <g>
      <circle cx={158} cy={226} r={15} fill={HAM.cap} {...O} />
      <circle cx={158} cy={228} r={8} fill={HAM.ear} />
      <circle cx={242} cy={226} r={15} fill={HAM.cap} {...O} />
      <circle cx={242} cy={228} r={8} fill={HAM.ear} />
      <path d={SA_EGG_D} fill={HAM.fur} />
      <path d={SA_EGG_CAP_D} fill={HAM.cap} />
      <ellipse cx={162} cy={312} rx={16} ry={11} fill={C.peachSoft} opacity={0.85} />
      <ellipse cx={238} cy={312} rx={16} ry={11} fill={C.peachSoft} opacity={0.85} />
      <ellipse cx={200} cy={326} rx={26} ry={16} fill={HAM.belly} />
      <g transform="translate(200 288) rotate(16)" style={SVG_ATTR_ORIGIN}>
        <ellipse cx={0} cy={0} rx={7} ry={11} fill={HAM.seed} {...O2} />
        <path d="M0 -8 V8" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" />
      </g>
      <SaEggShine />
      <path d={SA_EGG_D} fill="none" {...O} />
    </g>
  );
}

const HAMSTER_ART: SpeciesArt = {
  face: {
    eyeL: [166, 206],
    eyeR: [234, 206],
    eyeStyle: "bead",
    nose: "button",
    noseY: 230,
    mouthY: 245,
    browY: 178,
    cheekY: 238,
    cheekDX: 76,
    cheekColor: C.peach,
    whiskers: "fine",
    pawColor: HAM.fur,
    chin: [200, 274],
    crest: [200, 136],
    earTips: [
      [140, 136],
      [260, 136],
    ],
    tailTip: [278, 330],
    headTop: 146,
    neckY: 268,
    hatScale: 1,
    bodyPath: HAMSTER_BODY_D,
    hijabScaleX: 1.24,
  },
  Body: HamsterBody,
  Head: HamsterHead,
  Tail: HamsterTail,
  Egg: HamsterEgg,
};

/* ───────────────────────── 3. KELINCI LUP STROBERI ───────────────────────── */

const BUN = {
  fur: "#FFF6F7",
  pink: "#FFD3DE",
  pinkDark: "#FFB3C6",
  berry: "#F2557A",
  seed: "#FFE27A",
  belly: "#FFFFFF",
} as const;

const BUNNY_BODY_D =
  "M134 298 C134 250 164 232 200 232 C236 232 266 250 266 298 C266 334 240 350 200 350 C160 350 134 334 134 298Z";

function BunnyBody() {
  return (
    <g>
      <path d={BUNNY_BODY_D} fill={BUN.fur} />
      <path d="M138 296 C138 268 150 250 166 243 C158 270 160 304 170 330 C150 324 138 314 138 296Z" fill={BUN.pink} />
      <path d="M262 296 C262 268 250 250 234 243 C242 270 240 304 230 330 C250 324 262 314 262 296Z" fill={BUN.pink} opacity={0.8} />
      <ellipse cx={200} cy={314} rx={34} ry={32} fill={BUN.belly} />
      <path d={BUNNY_BODY_D} fill="none" {...O} />
      <Feet fill={BUN.fur} cx={170} y={346} rx={22} />
      <g fill={BUN.pinkDark} opacity={0.9}>
        <ellipse cx={162} cy={349} rx={4} ry={3} />
        <ellipse cx={238} cy={349} rx={4} ry={3} />
      </g>
    </g>
  );
}

function BunnyTail({ mood }: { mood: PetMood }) {
  const d =
    "M262 326 Q248 322 252 308 Q246 296 262 292 Q268 280 282 288 Q298 284 300 300 Q312 310 300 322 Q298 336 282 336 Q270 346 262 326Z";
  return (
    <TailWrap mood={mood} ox={0.1} oy={0.6}>
      <path d={d} fill={C.cream} {...O} />
      <path d="M262 312 Q270 300 284 302" fill="none" stroke={BUN.pink} strokeWidth={4} strokeLinecap="round" />
      <Hl d="M268 296 Q276 292 284 294" w={2.6} o={0.9} />
    </TailWrap>
  );
}

function BunnyEarShape({ flip }: { flip: boolean }) {
  const t = (x: number) => (flip ? 400 - x : x);
  const outer = `M${t(152)} 148 C${t(118)} 138 ${t(94)} 172 ${t(98)} 224 C${t(100)} 264 ${t(114)} 296 ${t(134)} 294 C${t(152)} 292 ${t(152)} 252 ${t(154)} 214 C${t(156)} 186 ${t(162)} 160 ${t(152)} 148Z`;
  const inner = `M${t(144)} 168 C${t(124)} 164 ${t(112)} 190 ${t(114)} 228 C${t(116)} 256 ${t(124)} 278 ${t(134)} 278 C${t(144)} 276 ${t(142)} 246 ${t(143)} 214 C${t(144)} 192 ${t(148)} 178 ${t(144)} 168Z`;
  return (
    <g>
      <path d={outer} fill={BUN.fur} {...O} />
      <path d={inner} fill={BUN.pink} />
      <Hl d={`M${t(112)} 196 Q${t(108)} 224 ${t(114)} 252`} w={3} o={0.7} />
    </g>
  );
}

function BunnyHead({ mood }: { mood: PetMood }) {
  const head = "M118 208 C116 158 150 134 200 134 C250 134 284 158 282 208 C281 248 248 272 200 272 C152 272 119 248 118 208Z";
  return (
    <g>
      <EarWrap side="l" mood={mood} amp={0.5} ox={0.7} oy={0.05}>
        <BunnyEarShape flip={false} />
      </EarWrap>
      <EarWrap side="r" mood={mood} amp={0.5} ox={0.3} oy={0.05}>
        <BunnyEarShape flip />
      </EarWrap>
      <path d={head} fill={BUN.fur} />
      <path d="M124 186 C130 154 158 138 200 138 C242 138 270 154 276 186 C252 168 226 162 200 168 C174 162 148 168 124 186Z" fill={BUN.pink} opacity={0.6} />
      <ellipse cx={200} cy={238} rx={26} ry={18} fill={BUN.belly} />
      <g fill={BUN.berry} opacity={0.75}>
        <ellipse cx={142} cy={228} rx={2.2} ry={3} />
        <ellipse cx={150} cy={238} rx={2.2} ry={3} />
        <ellipse cx={140} cy={242} rx={2.2} ry={3} />
        <ellipse cx={258} cy={228} rx={2.2} ry={3} />
        <ellipse cx={250} cy={238} rx={2.2} ry={3} />
        <ellipse cx={260} cy={242} rx={2.2} ry={3} />
      </g>
      <Hl d="M142 164 Q154 150 174 146" w={3.4} o={0.7} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function BunnyEgg() {
  const berry = (x: number, y: number, s = 1) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M0 14 C-12 8 -14 -6 -6 -10 Q0 -8 0 -8 Q0 -8 6 -10 C14 -6 12 8 0 14Z" fill={BUN.berry} {...O2} />
      <path d="M-5 -10 Q0 -17 5 -10 Q0 -12 -5 -10Z" fill={C.matcha} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <g fill={BUN.seed}>
        <circle cx={-3} cy={-1} r={1.1} />
        <circle cx={3} cy={0} r={1.1} />
        <circle cx={0} cy={5} r={1.1} />
      </g>
    </g>
  );
  return (
    <g>
      <path d="M146 240 C124 232 118 262 128 300 C136 306 148 290 152 262 C154 252 152 244 146 240Z" fill={BUN.fur} {...O} />
      <path d="M254 240 C276 232 282 262 272 300 C264 306 252 290 248 262 C246 252 248 244 254 240Z" fill={BUN.fur} {...O} />
      <path d="M144 252 C134 250 132 268 136 284 C142 282 146 268 146 258Z" fill={BUN.pink} />
      <path d="M256 252 C266 250 268 268 264 284 C258 282 254 268 254 258Z" fill={BUN.pink} />
      <path d={SA_EGG_D} fill={BUN.fur} />
      <path d={SA_EGG_BASE_D} fill={BUN.pink} />
      {berry(176, 262, 0.9)}
      {berry(228, 284, 1.1)}
      {berry(188, 314, 0.8)}
      <SaEggShine />
      <path d={SA_EGG_D} fill="none" {...O} />
    </g>
  );
}

const BUNNY_ART: SpeciesArt = {
  face: {
    eyeL: [168, 208],
    eyeR: [232, 208],
    eyeStyle: "round",
    nose: "heart",
    noseY: 226,
    mouthY: 238,
    browY: 180,
    cheekY: 234,
    cheekDX: 58,
    cheekColor: "#FFB3C6",
    whiskers: "none",
    pawColor: BUN.fur,
    chin: [200, 272],
    crest: [200, 134],
    earTips: [
      [120, 290],
      [280, 290],
    ],
    tailTip: [304, 308],
    headTop: 142,
    neckY: 266,
    hatScale: 0.95,
    bodyPath: BUNNY_BODY_D,
  },
  Body: BunnyBody,
  Head: BunnyHead,
  Tail: BunnyTail,
  Egg: BunnyEgg,
};

/* ───────────────────────── 4. KAPIBARA YUZU SANTAI ───────────────────────── */

const CAPY = {
  brown: "#C8935A",
  brownDark: "#A06E3F",
  light: "#E8C79A",
  lighter: "#F5E1BF",
  paw: "#B98350",
} as const;

const CAPY_BODY_D =
  "M122 300 C122 254 156 234 200 234 C244 234 278 254 278 300 C278 334 246 350 200 350 C154 350 122 334 122 300Z";

function CapyBody() {
  return (
    <g>
      <path d={CAPY_BODY_D} fill={CAPY.brown} />
      <path d="M200 238 Q252 238 272 280 Q278 300 274 320 Q250 258 200 252 Q150 258 126 320 Q122 300 128 280 Q148 238 200 238Z" fill={CAPY.brownDark} opacity={0.4} />
      <ellipse cx={200} cy={318} rx={42} ry={30} fill={CAPY.light} />
      <g stroke={CAPY.brownDark} strokeWidth={3} strokeLinecap="round" opacity={0.55}>
        <path d="M146 288 l-5 6 M156 304 l-6 5 M138 314 l-5 4 M254 288 l5 6 M244 304 l6 5 M262 314 l5 4" />
      </g>
      <path d={CAPY_BODY_D} fill="none" {...O} />
      <Feet fill={CAPY.paw} cx={160} y={346} rx={22} />
    </g>
  );
}

function CapyTail({ mood }: { mood: PetMood }) {
  return (
    <TailWrap mood={mood} ox={0.1} oy={0.5}>
      <ellipse cx={274} cy={336} rx={11} ry={9} fill={CAPY.brownDark} {...O} strokeWidth={3} />
    </TailWrap>
  );
}

function CapyHead({ mood }: { mood: PetMood }) {
  const head = "M118 212 C116 166 148 142 200 142 C252 142 284 166 282 212 C281 250 252 276 200 276 C148 276 119 250 118 212Z";
  return (
    <g>
      <EarWrap side="l" mood={mood} amp={0.7}>
        <circle cx={140} cy={156} r={15} fill={CAPY.brown} {...O} />
        <circle cx={140} cy={158} r={7.5} fill={CAPY.brownDark} />
      </EarWrap>
      <EarWrap side="r" mood={mood} amp={0.7}>
        <circle cx={260} cy={156} r={15} fill={CAPY.brown} {...O} />
        <circle cx={260} cy={158} r={7.5} fill={CAPY.brownDark} />
      </EarWrap>
      <path d={head} fill={CAPY.brown} />
      <path d="M150 156 Q200 134 250 156 Q200 148 150 156Z" fill={CAPY.brownDark} opacity={0.5} />
      <path d="M146 230 Q146 204 200 204 Q254 204 254 230 Q254 270 200 274 Q146 270 146 230Z" fill={CAPY.light} {...O} strokeWidth={3} />
      <path d="M160 220 Q168 212 184 210" fill="none" stroke={CAPY.lighter} strokeWidth={4} strokeLinecap="round" />
      <g fill={CAPY.brownDark} opacity={0.5}>
        <circle cx={166} cy={238} r={2} />
        <circle cx={172} cy={246} r={2} />
        <circle cx={234} cy={238} r={2} />
        <circle cx={228} cy={246} r={2} />
      </g>
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function CapyEgg() {
  return (
    <g>
      <circle cx={156} cy={226} r={14} fill={CAPY.brown} {...O} />
      <circle cx={156} cy={228} r={7} fill={CAPY.brownDark} />
      <circle cx={244} cy={226} r={14} fill={CAPY.brown} {...O} />
      <circle cx={244} cy={228} r={7} fill={CAPY.brownDark} />
      <path d={SA_EGG_D} fill={CAPY.brown} />
      <path d={SA_EGG_CAP_D} fill={CAPY.brownDark} opacity={0.45} />
      <ellipse cx={200} cy={312} rx={40} ry={32} fill={CAPY.light} />
      <path d="M170 296 Q200 282 230 296" fill="none" stroke={CAPY.lighter} strokeWidth={4} strokeLinecap="round" />
      <g stroke={CAPY.brownDark} strokeWidth={3} strokeLinecap="round" opacity={0.6}>
        <path d="M156 262 l-5 6 M166 250 l-5 6 M244 262 l5 6 M234 250 l5 6" />
      </g>
      <SaEggShine />
      <path d={SA_EGG_D} fill="none" {...O} />
    </g>
  );
}

const CAPY_ART: SpeciesArt = {
  face: {
    eyeL: [158, 194],
    eyeR: [242, 194],
    eyeStyle: "sleepy",
    nose: "nostrils",
    noseY: 222,
    mouthY: 246,
    browY: 168,
    cheekY: 232,
    cheekDX: 72,
    cheekColor: C.peach,
    whiskers: "none",
    pawColor: CAPY.paw,
    chin: [200, 276],
    crest: [200, 142],
    earTips: [
      [140, 142],
      [260, 142],
    ],
    tailTip: [280, 336],
    headTop: 152,
    neckY: 270,
    hatScale: 1.05,
    bodyPath: CAPY_BODY_D,
    hairLift: 10,
    hairSquash: 0.8,
    hijabScaleX: 1.12,
  },
  Body: CapyBody,
  Head: CapyHead,
  Tail: CapyTail,
  Egg: CapyEgg,
};

/* ═════════════════════════════════════════════════════════════
 *  SPESIES PREMIUM — Panda Merah Fluffy & Beruang Susu Boba (versi poles)
 * ═════════════════════════════════════════════════════════════ */

/** Siluet telur bersama (pusat 200,284 · rx≈62 · ry≈74 · dasar y = GROUND). */
const PdEggD =
  "M200 210 C250 210 262 262 262 296 C262 334 236 358 200 358 C164 358 138 334 138 296 C138 262 150 210 200 210Z";

/* ───────────────────────── PANDA MERAH ───────────────────────── */

const PD = {
  rust: "#E5774E",
  rustLight: "#F39468",
  rustDark: "#C75A33",
  brown: "#6E3826",
  brownSoft: "#9A5233",
  cream: "#FFF4E2",
  creamShade: "#F2DDBF",
  tear: "#C0502C",
} as const;

const PD_BODY_D =
  "M136 296 C136 250 164 232 200 232 C236 232 264 250 264 296 C264 332 238 350 200 350 C162 350 136 332 136 296Z";

function PdBody() {
  return (
    <g>
      <path d={PD_BODY_D} fill={PD.rust} />
      {/* dada & perut krem berbulu */}
      <path
        d="M170 246 Q200 262 230 246 Q250 280 240 306 Q234 330 214 338 Q200 346 186 338 Q166 330 160 306 Q150 280 170 246Z"
        fill={PD.cream}
      />
      <path d="M166 318 q4 6 10 4 M184 334 q6 5 12 1 M206 336 q6 4 12 -1 M226 322 q4 4 10 2" fill="none" stroke={PD.creamShade} strokeWidth={3} strokeLinecap="round" />
      {/* bayangan sisi kanan & sorot kiri */}
      <path d="M263 290 C262 270 254 254 240 246 C246 266 245 290 239 308 C253 306 263 300 263 290Z" fill={PD.rustDark} opacity={0.55} />
      <path d="M148 286 Q144 298 150 312" fill="none" stroke={PD.rustLight} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
      <Hl d="M152 262 Q158 250 170 246" w={3.2} o={0.5} />
      <path d={PD_BODY_D} fill="none" {...O} />
      <Feet fill={PD.brown} />
      <g fill={PD.brownSoft} opacity={0.9}>
        <ellipse cx={162} cy={342} rx={8} ry={3.4} />
        <ellipse cx={238} cy={342} rx={8} ry={3.4} />
      </g>
    </g>
  );
}

/** Telinga bulat berujung putih dengan bagian dalam cokelat tua. */
function PdEar({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={27} fill={PD.rust} />
      <path d={`M${cx - 22.1} ${cy - 15.5} A27 27 0 0 1 ${cx + 22.1} ${cy - 15.5} Q${cx} ${cy - 5} ${cx - 22.1} ${cy - 15.5}Z`} fill={PD.cream} />
      <ellipse cx={cx} cy={cy + 4} rx={13.5} ry={14.5} fill={PD.brown} />
      <ellipse cx={cx - 3.4} cy={cy} rx={4} ry={5} fill={PD.brownSoft} opacity={0.9} />
      <circle cx={cx} cy={cy} r={27} fill="none" {...O} />
    </g>
  );
}

function PdHead({ mood }: { mood: PetMood }) {
  const head =
    "M114 206 C114 152 150 132 200 132 C250 132 286 152 286 206 C288 222 291 233 283 243 C285 254 277 263 263 262 C251 270 226 274 200 274 C174 274 149 270 137 262 C123 263 115 254 117 243 C109 233 112 222 114 206Z";
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <PdEar cx={138} cy={150} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <PdEar cx={262} cy={150} />
      </EarWrap>
      <path d={head} fill={PD.rust} />
      {/* kilau & bayangan bulu */}
      <path d="M150 168 C158 146 182 138 200 138 C218 138 242 146 250 168 C230 152 170 152 150 168Z" fill={PD.rustLight} opacity={0.9} />
      <path d="M283 243 C285 254 277 263 263 262 C251 270 226 274 200 274 C240 268 270 246 276 214 C282 222 285 232 283 243Z" fill={PD.rustDark} opacity={0.4} />
      {/* bercak pipi krem yang bersih */}
      <path d="M118 226 C118 206 134 200 152 208 C166 218 170 238 160 252 C144 262 124 256 118 226Z" fill={PD.cream} />
      <path d="M282 226 C282 206 266 200 248 208 C234 218 230 238 240 252 C256 262 276 256 282 226Z" fill={PD.cream} />
      <path d="M128 250 q4 6 10 5 M272 250 q-4 6 -10 5" fill="none" stroke={PD.creamShade} strokeWidth={3} strokeLinecap="round" />
      {/* garis air mata lembut */}
      <path d="M174 218 Q172 232 162 242" fill="none" stroke={PD.tear} strokeWidth={6} strokeLinecap="round" opacity={0.75} />
      <path d="M226 218 Q228 232 238 242" fill="none" stroke={PD.tear} strokeWidth={6} strokeLinecap="round" opacity={0.75} />
      {/* moncong krem */}
      <ellipse cx={200} cy={244} rx={30} ry={23} fill={PD.cream} />
      <path d="M176 254 Q200 270 224 254 Q214 266 200 268 Q186 266 176 254Z" fill={PD.creamShade} opacity={0.8} />
      {/* titik alis putih */}
      <ellipse cx={168} cy={176} rx={8} ry={5.2} fill={PD.cream} />
      <ellipse cx={232} cy={176} rx={8} ry={5.2} fill={PD.cream} />
      <path d="M200 140 V156" stroke={PD.rustDark} strokeWidth={4.5} strokeLinecap="round" opacity={0.6} />
      <Hl d="M150 158 Q166 144 190 141" w={3.4} o={0.55} />
      <Sparkle x={254} y={166} size={5} color={C.honeySoft} delay={0.6} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function PdTail({ mood }: { mood: PetMood }) {
  const d = "M256 322 C310 338 342 292 326 250 C318 228 302 220 292 228";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill="none" stroke={INK} strokeWidth={50} strokeLinecap="round" />
      <path d={d} fill="none" stroke={PD.rust} strokeWidth={43} strokeLinecap="round" />
      <path d={d} fill="none" stroke={PD.rustDark} strokeWidth={43} strokeLinecap="butt" strokeDasharray="11 21" strokeDashoffset={-4} opacity={0.85} />
      <path d={d} pathLength={100} fill="none" stroke={PD.cream} strokeWidth={43} strokeLinecap="round" strokeDasharray="9 200" strokeDashoffset={-91} />
      <path d="M268 328 C312 338 338 302 324 264" fill="none" stroke={PD.rustLight} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
    </TailWrap>
  );
}

function PdEgg() {
  return (
    <g>
      <circle cx={158} cy={226} r={16} fill={PD.rust} {...O} />
      <circle cx={158} cy={229} r={8} fill={PD.brown} />
      <circle cx={242} cy={226} r={16} fill={PD.rust} {...O} />
      <circle cx={242} cy={229} r={8} fill={PD.brown} />
      <path d={PdEggD} fill={PD.rust} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={PD.rustDark} opacity={0.5} />
      <path d="M152 322 Q200 342 250 320" fill="none" stroke={PD.brown} strokeWidth={9} strokeLinecap="round" />
      <path d="M170 344 Q200 354 232 344" fill="none" stroke={PD.brown} strokeWidth={8} strokeLinecap="round" />
      <path d="M146 300 Q200 318 256 298" fill="none" stroke={PD.rustDark} strokeWidth={7} strokeLinecap="round" opacity={0.6} />
      <ellipse cx={200} cy={266} rx={34} ry={24} fill={PD.cream} />
      <ellipse cx={181} cy={260} rx={7} ry={10} fill={PD.tear} opacity={0.8} />
      <ellipse cx={219} cy={260} rx={7} ry={10} fill={PD.tear} opacity={0.8} />
      <ellipse cx={200} cy={276} rx={6} ry={4} fill={PD.brown} />
      <Hl d="M158 262 Q160 240 176 228" w={4} o={0.6} />
      <path d={PdEggD} fill="none" {...O} />
    </g>
  );
}

const PD_FACE: FaceSpec = {
  eyeL: [166, 204],
  eyeR: [234, 204],
  eyeStyle: "glossy",
  irisColor: "#9A5233",
  nose: "snout",
  noseY: 234,
  mouthY: 248,
  browY: 176,
  cheekY: 232,
  cheekDX: 66,
  cheekColor: "#FFA999",
  whiskers: "none",
  pawColor: PD.brown,
  chin: [200, 274],
  crest: [200, 134],
  earTips: [
    [138, 126],
    [262, 126],
  ],
  tailTip: [292, 228],
  headTop: 142,
  neckY: 266,
  hatScale: 1,
  bodyPath: PD_BODY_D,
  hijabScaleX: 1.14,
};

const PANDA_ART: SpeciesArt = {
  face: PD_FACE,
  Body: PdBody,
  Head: PdHead,
  Tail: PdTail,
  Egg: PdEgg,
};

/* ───────────────────────── BERUANG SUSU BOBA ───────────────────────── */

const BR = {
  fur: "#FFF6E8",
  furLight: "#FFFFFF",
  shade: "#F0D9BE",
  belly: "#FFFDF8",
  pink: "#FFB5C2",
  pinkDark: "#F58FA6",
  muzzle: "#FFEBD6",
  honey: "#FFC800",
  honeyDark: "#E5A400",
} as const;

const BR_BODY_D =
  "M130 300 C130 250 160 232 200 232 C240 232 270 250 270 300 C270 336 240 352 200 352 C160 352 130 336 130 300Z";

function BrBody() {
  return (
    <g>
      <path d={BR_BODY_D} fill={BR.fur} />
      <path d="M270 296 C270 268 258 250 240 240 C250 266 248 298 238 322 C258 320 270 312 270 296Z" fill={BR.shade} />
      <ellipse cx={200} cy={318} rx={42} ry={32} fill={BR.belly} />
      {/* bulu lembut berlekuk di sisi badan */}
      <g fill="none" stroke={BR.shade} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M137 282 Q144 286 140 294" />
        <path d="M139 308 Q146 312 142 320" />
        <path d="M263 282 Q256 286 260 294" opacity={0.7} />
      </g>
      {/* hati susu di perut */}
      <path
        d="M200 330 C186 322 188 308 196 308 Q200 309 200 314 Q200 309 204 308 C212 308 214 322 200 330Z"
        fill={BR.pink}
        {...O25}
      />
      <Hl d="M148 268 Q152 254 168 248" w={3.4} o={0.7} />
      <path d={BR_BODY_D} fill="none" {...O} />
      <Feet fill={BR.fur} cx={166} rx={23} />
      <g fill={BR.pink}>
        <ellipse cx={166} cy={350} rx={8} ry={4.4} />
        <ellipse cx={234} cy={350} rx={8} ry={4.4} />
      </g>
    </g>
  );
}

function BrBow() {
  return (
    <g>
      <path d="M128 136 L146 124 L148 146Z" fill={BR.honey} {...O25} />
      <path d="M128 136 L110 126 L108 148Z" fill={BR.honey} {...O25} />
      <circle cx={128} cy={137} r={5.6} fill={BR.honeyDark} {...O25} />
      <circle cx={126.6} cy={135.4} r={1.6} fill={C.cream} />
    </g>
  );
}

function BrHead({ mood }: { mood: PetMood }) {
  const head =
    "M114 208 C114 154 150 134 200 134 C250 134 286 154 286 208 C288 224 290 236 282 246 C282 258 272 266 258 264 C246 274 224 276 200 276 C176 276 154 274 142 264 C128 266 118 258 118 246 C110 236 112 224 114 208Z";
  return (
    <g>
      <EarWrap side="l" mood={mood} ox={0.6} oy={0.8}>
        <circle cx={136} cy={152} r={25} fill={BR.fur} {...O} />
        <circle cx={138} cy={155} r={14} fill={BR.pink} />
        <circle cx={141} cy={150} r={4} fill={C.cream} opacity={0.75} />
      </EarWrap>
      <EarWrap side="r" mood={mood} ox={0.4} oy={0.8}>
        <circle cx={264} cy={152} r={25} fill={BR.fur} {...O} />
        <circle cx={262} cy={155} r={14} fill={BR.pink} />
        <circle cx={265} cy={150} r={4} fill={C.cream} opacity={0.75} />
      </EarWrap>
      <path d={head} fill={BR.fur} />
      <path d="M282 246 C282 258 272 266 258 264 C246 274 224 276 200 276 C238 266 262 242 270 198 C280 202 286 224 282 246Z" fill={BR.shade} opacity={0.75} />
      {/* bulu pipi lembut (bulat, bukan runcing) */}
      <g fill="none" stroke={BR.shade} strokeWidth={3.2} strokeLinecap="round">
        <path d="M122 236 Q130 240 128 248" />
        <path d="M278 236 Q270 240 272 248" opacity={0.7} />
      </g>
      <ellipse cx={200} cy={244} rx={36} ry={26} fill={BR.muzzle} />
      <path d="M170 258 Q200 276 230 258 Q218 272 200 273 Q182 272 170 258Z" fill={BR.shade} opacity={0.7} />
      {/* hiasan kecil di dahi: tetes susu */}
      <path d="M200 148 Q192 158 196 164 Q200 168 204 164 Q208 158 200 148Z" fill={C.skySoft} {...O2} />
      <Hl d="M150 162 Q168 146 190 144" w={3.6} o={0.85} />
      <path d={head} fill="none" {...O} />
      <BrBow />
    </g>
  );
}

function BrTail({ mood }: { mood: PetMood }) {
  return (
    <TailWrap mood={mood}>
      <path
        d="M272 318 Q284 316 288 326 Q296 332 290 342 Q286 352 274 350 Q262 354 258 342 Q250 332 260 324 Q264 318 272 318Z"
        fill={BR.fur}
        {...O}
      />
      <path d="M262 330 Q266 324 274 324" fill="none" stroke={BR.shade} strokeWidth={3} strokeLinecap="round" />
      <Hl d="M264 332 Q266 328 270 327" w={2.6} o={0.9} />
    </TailWrap>
  );
}

function BrEgg() {
  return (
    <g>
      <circle cx={158} cy={226} r={17} fill={BR.fur} {...O} />
      <circle cx={159} cy={228} r={8.5} fill={BR.pink} />
      <circle cx={242} cy={226} r={17} fill={BR.fur} {...O} />
      <circle cx={241} cy={228} r={8.5} fill={BR.pink} />
      <path d={PdEggD} fill={BR.fur} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={BR.shade} />
      <g fill={BR.pink}>
        <circle cx={172} cy={262} r={6} />
        <circle cx={226} cy={250} r={5} />
        <circle cx={206} cy={296} r={6.5} />
        <circle cx={166} cy={314} r={5} />
        <circle cx={238} cy={318} r={6} />
        <circle cx={196} cy={340} r={5} />
        <circle cx={240} cy={282} r={4} />
      </g>
      <Hl d="M158 262 Q160 240 176 228" w={4} o={0.9} />
      <path d={PdEggD} fill="none" {...O} />
    </g>
  );
}

const BR_FACE: FaceSpec = {
  eyeL: [162, 206],
  eyeR: [238, 206],
  eyeStyle: "glossy",
  irisColor: "#8A5A44",
  nose: "oval",
  noseY: 234,
  mouthY: 249,
  browY: 176,
  cheekY: 238,
  cheekDX: 68,
  cheekColor: "#FFA3B5",
  whiskers: "none",
  pawColor: BR.fur,
  chin: [200, 276],
  crest: [200, 134],
  earTips: [
    [136, 130],
    [264, 130],
  ],
  tailTip: [280, 336],
  headTop: 144,
  neckY: 268,
  hatScale: 1,
  bodyPath: BR_BODY_D,
  hijabScaleX: 1.2,
};

const BEAR_ART: SpeciesArt = {
  face: BR_FACE,
  Body: BrBody,
  Head: BrHead,
  Tail: BrTail,
  Egg: BrEgg,
};

/* ═════════════════════════════════════════════════════════════
 *  SPESIES C (PREMIUM) — Rubah Fennec Bintang & Poni Awan Pelangi
 *  Desain ulang: kepala besar & bulat, badan mungil, mata besar berkilau,
 *  tekstur bulu halus, detail kilau. Mandiri (tidak bergantung spesies lain).
 * ═════════════════════════════════════════════════════════════ */

/** Path telur standar (pusat 200,284 · rx≈62 · ry≈74 · dasar y=358). */
const FX_EGG_D =
  "M200 210 C160 210 138 256 138 296 C138 336 164 358 200 358 C236 358 262 336 262 296 C262 256 240 210 200 210Z";
/** Lengkung atas telur (corak tanpa clipPath). */
const FX_EGG_CAP_D = "M138 296 C138 256 160 210 200 210 C240 210 262 256 262 296 C250 262 230 250 200 250 C170 250 150 262 138 296Z";
/** Lengkung bawah telur. */
const FX_EGG_BASE_D = "M138 296 C138 336 164 358 200 358 C236 358 262 336 262 296 C246 316 224 322 200 322 C176 322 154 316 138 296Z";

/** Titik x simetris terhadap sumbu 200: s = -1 (kiri) atau 1 (kanan), d = jarak dari tengah. */
const fxX = (s: -1 | 1, d: number): number => 200 + s * d;

/* ───────────────────────── 7 · RUBAH FENNEC BINTANG ───────────────────────── */

const FX = {
  sand: "#F4C07C",
  sandDark: "#DE9A52",
  sandLight: "#FBDDA6",
  cream: "#FFF6E2",
  pink: "#FFC2CE",
  tip: "#B87A44",
  paw: "#EBB677",
} as const;

const FX_BODY_D =
  "M140 304 C140 260 166 240 200 240 C234 240 260 260 260 304 C260 336 236 350 200 350 C164 350 140 336 140 304Z";
const FX_HEAD_D =
  "M118 204 C118 164 153 130 200 130 C247 130 282 164 282 204 C282 245 247 276 200 276 C153 276 118 245 118 204Z";

function FxBody() {
  return (
    <g>
      <path d={FX_BODY_D} fill={FX.sand} />
      <path d="M252 296 C252 274 244 258 232 250 C238 272 236 298 228 320 C244 318 252 310 252 296Z" fill={FX.sandDark} opacity={0.55} />
      {/* perut krem */}
      <ellipse cx={200} cy={316} rx={38} ry={32} fill={FX.cream} />
      {/* jambul dada: gumpalan bulu halus */}
      <path
        d="M170 272 Q200 290 230 272 Q236 286 226 292 Q226 304 214 302 Q208 314 200 306 Q192 314 186 302 Q174 304 174 292 Q164 286 170 272Z"
        fill={FX.cream}
      />
      <Hl d="M152 278 Q154 264 168 256" w={3.2} o={0.7} />
      <path d={FX_BODY_D} fill="none" {...O} />
      <Feet fill={FX.paw} cx={172} y={346} rx={21} />
    </g>
  );
}

/** Telinga besar berbulu halus; s = -1 kiri, 1 kanan. Koordinat dihitung simetris (tanpa transform). */
function FxEar({ s }: { s: -1 | 1 }) {
  const x = (d: number) => fxX(s, d);
  const outer = `M${x(72)} 178 C${x(98)} 146 ${x(102)} 106 ${x(88)} 82 Q${x(84)} 76 ${x(78)} 80 C${x(44)} 94 ${x(14)} 120 ${x(8)} 152Z`;
  return (
    <g>
      <path d={outer} fill={FX.sand} {...O} />
      <path
        d={`M${x(95)} 100 C${x(98)} 92 ${x(94)} 85 ${x(88)} 82 Q${x(84)} 76 ${x(78)} 80 C${x(84)} 85 ${x(90)} 92 ${x(95)} 100Z`}
        fill={FX.tip}
      />
      <path
        d={`M${x(62)} 166 C${x(78)} 140 ${x(82)} 112 ${x(77)} 96 C${x(50)} 108 ${x(28)} 128 ${x(21)} 150Z`}
        fill={FX.pink}
      />
      <path
        d={`M${x(77)} 96 C${x(50)} 108 ${x(28)} 128 ${x(21)} 150`}
        fill="none"
        stroke={FX.cream}
        strokeWidth={5.6}
        strokeLinecap="round"
        strokeDasharray="0.5 7.5"
      />
      <path d={`M${x(70)} 150 Q${x(62)} 126 ${x(66)} 112`} fill="none" stroke={C.cream} strokeWidth={3.2} strokeLinecap="round" opacity={0.65} />
      <Hl d={`M${x(90)} 128 Q${x(94)} 108 ${x(86)} 92`} w={3} o={0.55} />
    </g>
  );
}

/** Rumbai bulu pipi (di belakang kepala) agar wajah terlihat lebih lebar dan berbulu. */
function FxCheekFur({ s }: { s: -1 | 1 }) {
  const x = (d: number) => fxX(s, d);
  return (
    <path
      d={`M${x(74)} 216 Q${x(96)} 214 ${x(92)} 230 Q${x(108)} 236 ${x(94)} 248 Q${x(98)} 262 ${x(80)} 260 Q${x(72)} 268 ${x(62)} 258 Q${x(56)} 236 ${x(66)} 220Z`}
      fill={FX.cream}
      {...O}
    />
  );
}

function FxHead({ mood }: { mood: PetMood }) {
  return (
    <g>
      <EarWrap side="l" mood={mood} ox={0.88} oy={0.95}>
        <FxEar s={-1} />
      </EarWrap>
      <EarWrap side="r" mood={mood} ox={0.12} oy={0.95}>
        <FxEar s={1} />
      </EarWrap>
      <FxCheekFur s={-1} />
      <FxCheekFur s={1} />
      <path d={FX_HEAD_D} fill={FX.sand} />
      {/* wajah bawah krem (bentuk lembut mengikuti pipi) */}
      <path
        d="M122 214 Q142 206 160 226 Q180 243 200 243 Q220 243 240 226 Q258 206 278 214 C276 250 246 276 200 276 C154 276 124 250 122 214Z"
        fill={FX.cream}
      />
      {/* tanda bintang di dahi */}
      <polygon points={starPoints(200, 164, 13, 6)} fill={FX.sandDark} opacity={0.75} stroke={FX.sandDark} strokeWidth={1.6} strokeLinejoin="round" />
      <polygon points={starPoints(200, 164, 6, 2.8)} fill={FX.sandLight} />
      {/* bintik alis krem */}
      <circle cx={158} cy={178} r={3.4} fill={FX.cream} />
      <circle cx={242} cy={178} r={3.4} fill={FX.cream} />
      <Hl d="M138 168 Q150 150 176 142" w={3.6} o={0.6} />
      <path d={FX_HEAD_D} fill="none" {...O} />
      <Sparkle x={262} y={140} size={7} color={C.honeySoft} delay={0.6} />
    </g>
  );
}

function FxTail({ mood }: { mood: PetMood }) {
  const d =
    "M250 334 A26 26 0 0 0 288 344 A26 26 0 0 0 326 338 A24 24 0 0 0 350 312 A24 24 0 0 0 360 276 A22 22 0 0 0 350 240 A20 20 0 0 0 330 210 L318 198 Q318 236 298 266 Q278 292 252 298Z";
  return (
    <TailWrap mood={mood} ox={0.06} oy={0.95}>
      <g transform="translate(250 334) scale(0.92) translate(-250 -334)" style={SVG_ATTR_ORIGIN}>
      <path d={d} fill={FX.sand} />
      <path d="M252 302 Q278 292 298 266 Q318 236 318 198 Q332 204 340 218 Q330 250 308 282 Q284 318 254 326Z" fill={FX.sandDark} opacity={0.4} />
      {/* ujung krem berbulu */}
      <path
        d="M318 198 L330 208 A20 20 0 0 1 350 240 A22 22 0 0 1 360 276 A24 24 0 0 1 350 312 Q344 302 336 308 Q340 294 328 290 Q340 278 328 270 Q336 254 324 244 Q320 224 318 198Z"
        fill={FX.cream}
      />
      <path d={d} fill="none" {...O} />
      <Hl d="M268 334 Q316 332 340 304" w={3.6} o={0.6} />
      <polygon points={starPoints(340, 256, 9, 4.2)} fill={FX.sandLight} stroke={FX.sandDark} strokeWidth={1.8} strokeLinejoin="round" />
      </g>
    </TailWrap>
  );
}

function FxEarEgg({ s }: { s: -1 | 1 }) {
  const x = (d: number) => fxX(s, d);
  return (
    <g>
      <path d={`M${x(52)} 236 C${x(60)} 206 ${x(54)} 178 ${x(44)} 158 C${x(22)} 170 ${x(8)} 198 ${x(10)} 228Z`} fill={FX.sand} {...O} />
      <path d={`M${x(44)} 222 C${x(48)} 202 ${x(44)} 184 ${x(38)} 172 C${x(24)} 182 ${x(18)} 200 ${x(18)} 220Z`} fill={FX.pink} />
    </g>
  );
}

function FxEgg() {
  return (
    <g>
      <FxEarEgg s={-1} />
      <FxEarEgg s={1} />
      <path d={FX_EGG_D} fill={FX.sand} />
      <path d={FX_EGG_BASE_D} fill={FX.cream} />
      <path d="M262 296 C262 334 238 358 200 358 C176 358 158 346 148 330 C202 346 246 332 262 296Z" fill={FX.sandDark} opacity={0.5} />
      <path d={FX_EGG_CAP_D} fill={FX.sandLight} opacity={0.55} />
      <g fill={C.honeySoft} stroke={FX.sandDark} strokeWidth={1.6} strokeLinejoin="round">
        <polygon points={starPoints(176, 262, 9, 4)} />
        <polygon points={starPoints(228, 250, 8, 3.6)} />
        <polygon points={starPoints(204, 292, 10, 4.4)} />
        <polygon points={starPoints(162, 304, 7, 3.2)} />
        <polygon points={starPoints(244, 292, 7, 3.2)} />
      </g>
      <Hl d="M154 270 Q152 246 168 228" w={4} o={0.8} />
      <path d={FX_EGG_D} fill="none" {...O} />
    </g>
  );
}

const FENNEC_FACE: FaceSpec = {
  eyeL: [164, 206],
  eyeR: [236, 206],
  eyeStyle: "glossy",
  irisColor: "#C9822D",
  nose: "heart",
  noseY: 232,
  mouthY: 247,
  browY: 177,
  cheekY: 237,
  cheekDX: 60,
  cheekColor: "#FFAFA6",
  whiskers: "none",
  pawColor: FX.paw,
  chin: [200, 276],
  crest: [200, 132],
  earTips: [
    [116, 82],
    [284, 82],
  ],
  tailTip: [330, 214],
  headTop: 140,
  neckY: 268,
  hatScale: 0.95,
  bodyPath: FX_BODY_D,
  eyeScale: 1.15,
  hijabScaleX: 1.17,
};

const FENNEC_ART: SpeciesArt = {
  face: FENNEC_FACE,
  Body: FxBody,
  Head: FxHead,
  Tail: FxTail,
  Egg: FxEgg,
};

/* ───────────────────────── 8 · PONI AWAN PELANGI ───────────────────────── */

const UN = {
  cloud: "#FFFDF7",
  shade: "#E6ECFB",
  shadeDeep: "#CCD9F2",
  pink: "#FFB5D6",
  pinkDeep: "#FF8FC0",
  blue: "#9ED8FF",
  purple: "#CBA6FF",
  rosy: "#FFA8C8",
  hoof: "#FFC4B0",
} as const;

/** Siluet awan: elips dengan gelembung busur sepanjang tepinya. */
function UnScallop(cx: number, cy: number, rx: number, ry: number, n: number, r: number): string {
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  const p = (q: Pt): string => `${f2(q[0])} ${f2(q[1])}`;
  return `M${p(pts[0])} ${pts.map((_, i) => `A${r} ${r} 0 0 1 ${p(pts[(i + 1) % n])}`).join(" ")}Z`;
}

const UN_BODY_D = UnScallop(200, 298, 54, 46, 11, 17);
const UN_HEAD_D = UnScallop(200, 204, 82, 68, 15, 25);

function UnBody() {
  return (
    <g>
      <path d={UN_BODY_D} fill={UN.cloud} />
      <path d="M250 296 C250 276 244 262 232 254 C238 274 236 298 228 318 C242 316 250 308 250 296Z" fill={UN.shade} />
      {/* hati pastel di perut */}
      <path
        d="M200 336 C178 320 182 300 194 302 Q200 303 200 310 Q200 303 206 302 C218 300 222 320 200 336Z"
        fill={UN.pink}
        {...O25}
      />
      <Hl d="M158 282 Q162 268 176 262" w={3.4} o={0.9} />
      <path d={UN_BODY_D} fill="none" {...O} />
      <Feet fill={UN.cloud} cx={172} y={346} rx={21} />
      {/* kuku kaki pastel */}
      <ellipse cx={172} cy={354} rx={15} ry={4.4} fill={UN.hoof} />
      <ellipse cx={228} cy={354} rx={15} ry={4.4} fill={UN.hoof} />
    </g>
  );
}

/** Helai surai pelangi mengalir di sisi kepala (garis berlapis: pink · biru · ungu), ujungnya melengkung keluar. */
function UnManeSide({ s }: { s: -1 | 1 }) {
  const x = (d: number) => fxX(s, d);
  const lock = `M${x(52)} 150 C${x(90)} 156 ${x(104)} 196 ${x(94)} 232 C${x(90)} 250 ${x(102)} 262 ${x(114)} 256`;
  const lock2 = `M${x(70)} 142 C${x(100)} 152 ${x(112)} 188 ${x(110)} 214 C${x(110)} 226 ${x(120)} 230 ${x(124)} 222`;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={lock} stroke={INK} strokeWidth={27} />
      <path d={lock} stroke={UN.pink} strokeWidth={20.5} />
      <path d={lock} stroke={UN.blue} strokeWidth={13} />
      <path d={lock} stroke={UN.purple} strokeWidth={5.4} />
      <path d={lock2} stroke={INK} strokeWidth={21} />
      <path d={lock2} stroke={UN.purple} strokeWidth={14} />
      <path d={lock2} stroke={UN.pink} strokeWidth={6} />
      <path d={`M${x(60)} 156 C${x(84)} 162 ${x(96)} 184 ${x(94)} 204`} stroke={C.cream} strokeWidth={2.6} opacity={0.75} />
    </g>
  );
}

function UnEarShape({ s }: { s: -1 | 1 }) {
  const x = (d: number) => fxX(s, d);
  return (
    <g>
      <path d={`M${x(58)} 158 Q${x(66)} 118 ${x(46)} 104 Q${x(26)} 116 ${x(20)} 146Z`} fill={UN.cloud} {...O} />
      <path d={`M${x(50)} 148 Q${x(56)} 124 ${x(46)} 116 Q${x(36)} 124 ${x(32)} 142Z`} fill={UN.pink} />
    </g>
  );
}

function UnHead({ mood }: { mood: PetMood }) {
  return (
    <g>
      <motion.g style={fb(0.8, 0.1)} animate={{ rotate: [-1.6, 1.6, -1.6] }} transition={loop(3.6)}>
        <UnManeSide s={-1} />
      </motion.g>
      <motion.g style={fb(0.2, 0.1)} animate={{ rotate: [1.6, -1.6, 1.6] }} transition={loop(3.6, { delay: 0.3 })}>
        <UnManeSide s={1} />
      </motion.g>
      <EarWrap side="l" mood={mood} ox={0.7} oy={0.9}>
        <UnEarShape s={-1} />
      </EarWrap>
      <EarWrap side="r" mood={mood} ox={0.3} oy={0.9}>
        <UnEarShape s={1} />
      </EarWrap>
      <path d={UN_HEAD_D} fill={UN.cloud} />
      <path d="M282 204 C282 242 248 270 200 272 C242 260 266 238 272 198 C280 194 282 198 282 204Z" fill={UN.shade} opacity={0.9} />
      <Hl d="M142 172 Q160 150 190 146" w={3.6} o={0.9} />
      <path d={UN_HEAD_D} fill="none" {...O} />
      {/* poni pelangi: dua helai mengapit tanduk */}
      {([-1, 1] as const).map((sd) => {
        const lk = `M${fxX(sd, 6)} 134 C${fxX(sd, 22)} 138 ${fxX(sd, 32)} 154 ${fxX(sd, 28)} 172 C${fxX(sd, 27)} 180 ${fxX(sd, 36)} 182 ${fxX(sd, 40)} 174`;
        return (
          <g key={sd} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={lk} stroke={INK} strokeWidth={22} />
            <path d={lk} stroke={UN.pink} strokeWidth={15} />
            <path d={lk} stroke={UN.blue} strokeWidth={8} />
            <path d={lk} stroke={UN.purple} strokeWidth={2.6} />
          </g>
        );
      })}
    </g>
  );
}

/** Tanduk emas berulir + bintang kecil di ujung (digambar di atas topi). */
function UnHorn() {
  return (
    <g pointerEvents="none">
      <path d="M190 150 Q196 116 212 92 Q219 120 218 150Z" fill={C.honey} {...O25} />
      <path d="M192 142 L217 134 M193 129 L215 121 M197 116 L212 109" fill="none" stroke={C.honeyDark} strokeWidth={3} strokeLinecap="round" />
      <Hl d="M197 144 Q201 122 207 104" w={3} o={0.9} />
      <ellipse cx={204} cy={152} rx={17} ry={6.6} fill={UN.cloud} {...O25} />
      <polygon points={starPoints(214, 86, 9, 4.2)} fill={C.honeySoft} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Sparkle x={236} y={104} size={7} color={C.honeySoft} delay={0.4} />
      <Sparkle x={184} y={98} size={5} color={C.cream} delay={1.1} />
    </g>
  );
}

function UnTail({ mood }: { mood: PetMood }) {
  const puff = UnScallop(264, 322, 24, 20, 9, 12);
  return (
    <TailWrap mood={mood} ox={0.08} oy={0.92}>
      <Duo d="M280 318 C318 322 346 296 336 262 C332 248 318 246 314 256" inner={UN.purple} ow={18} iw={12} />
      <Duo d="M276 322 C308 330 330 306 322 280 C318 270 309 270 307 278" inner={UN.blue} ow={18} iw={12} />
      <Duo d="M270 326 C292 336 306 322 302 304" inner={UN.pink} ow={18} iw={12} />
      <path d={puff} fill={UN.cloud} {...O} />
      <Hl d="M248 328 Q252 316 264 314" w={3} o={0.9} />
      <Sparkle x={342} y={246} size={6} color={C.honeySoft} delay={0.7} />
    </TailWrap>
  );
}

function UnEarEgg({ s }: { s: -1 | 1 }) {
  const x = (d: number) => fxX(s, d);
  return (
    <g>
      <path d={`M${x(46)} 232 Q${x(52)} 206 ${x(38)} 192 Q${x(20)} 204 ${x(16)} 228Z`} fill={UN.cloud} {...O} />
      <path d={`M${x(40)} 224 Q${x(44)} 210 ${x(37)} 203 Q${x(28)} 211 ${x(26)} 222Z`} fill={UN.pink} />
    </g>
  );
}

function UnEgg() {
  return (
    <g>
      <UnEarEgg s={-1} />
      <UnEarEgg s={1} />
      <path d={FX_EGG_D} fill={UN.cloud} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={UN.shade} />
      <path d="M148 284 Q200 306 252 284" fill="none" stroke={UN.pink} strokeWidth={9} strokeLinecap="round" />
      <path d="M144 297 Q200 319 256 297" fill="none" stroke={UN.blue} strokeWidth={9} strokeLinecap="round" />
      <path d="M146 310 Q200 332 254 310" fill="none" stroke={UN.purple} strokeWidth={9} strokeLinecap="round" />
      <Hl d="M154 270 Q152 246 168 228" w={4} o={0.95} />
      <path d={FX_EGG_D} fill="none" {...O} />
      <path d="M191 222 L201 186 L211 222Z" fill={C.honey} {...O25} />
      <path d="M194 212 L208 207 M196 201 L206 197" fill="none" stroke={C.honeyDark} strokeWidth={2.4} strokeLinecap="round" />
      <g fill={UN.cloud} {...O25}>
        <circle cx={158} cy={346} r={12} />
        <circle cx={200} cy={347} r={11} />
        <circle cx={242} cy={346} r={12} />
      </g>
    </g>
  );
}

const UNICORN_FACE: FaceSpec = {
  eyeL: [166, 208],
  eyeR: [234, 208],
  eyeStyle: "glossy",
  irisColor: "#B58CFF",
  nose: "button",
  noseY: 235,
  mouthY: 249,
  browY: 178,
  cheekY: 238,
  cheekDX: 60,
  cheekColor: UN.rosy,
  whiskers: "none",
  pawColor: UN.cloud,
  chin: [200, 272],
  crest: [200, 136],
  earTips: [
    [154, 106],
    [246, 106],
  ],
  tailTip: [336, 252],
  headTop: 142,
  neckY: 268,
  hatScale: 1,
  bodyPath: UN_BODY_D,
  eyeScale: 1.15,
  hijabScaleX: 1.06,
};

const UNICORN_ART: SpeciesArt = {
  face: UNICORN_FACE,
  Body: UnBody,
  Head: UnHead,
  Tail: UnTail,
  Egg: UnEgg,
  FrontOfHat: UnHorn,
};

/* ═════════════════════════════════════════════════════════════
 *  ITEM KOSMETIK: KEPALA (8) · WAJAH (6) · LEHER (6)
 * ═════════════════════════════════════════════════════════════ */

const HFN = {
  straw: "#F3D98B",
  strawDark: "#DDB65E",
  strawLight: "#FBEBB6",
  cap: "#5A4E44",
  red: "#E8576A",
  redDark: "#C73D52",
  fur: "#FFFEFA",
  furShade: "#EAF2FF",
  band: "#FFE3BE",
  bandDark: "#F4C79A",
} as const;

/** Titik di sepanjang pita leher (kurva atas) untuk garis-garis rajutan. */
const hfnBandTop = (x: number): number => {
  const t = (x + 54) / 108;
  return -6 + 40 * t * (1 - t);
};

/* ───────────── Topi (origin = pusat dasar topi, naik ke -y) ───────────── */

function HfnHead({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case "head_straw_hat":
      return (
        <g>
          <ellipse cx={0} cy={-2} rx={58} ry={11} fill={HFN.strawDark} {...O} />
          <path d="M-33 -2 Q-36 -42 0 -44 Q36 -42 33 -2 Q0 8 -33 -2Z" fill={HFN.straw} {...O} />
          <path d="M14 -42 Q34 -38 33 -2 Q24 3 12 5Z" fill={HFN.strawDark} opacity={0.4} />
          <path d="M-33 -16 Q0 -6 33 -16 L34 -4 Q0 8 -34 -4Z" fill={C.honey} {...O25} />
          <path d="M-8 -9 Q-22 -26 -16 -14 Q-14 -2 -6 -9Z M8 -9 Q22 -26 16 -14 Q14 -2 6 -9Z" fill={C.honeySoft} {...O2} />
          <circle cx={0} cy={-8} r={4.4} fill={C.honeyDark} {...O2} />
          <path d="M-22 -30 l5 4 M-8 -34 l5 4 M8 -34 l5 4 M20 -28 l5 4 M-38 4 l6 2 M30 5 l6 -2" fill="none" stroke={HFN.strawDark} strokeWidth={2.4} strokeLinecap="round" />
          <Hl d="M-24 -30 Q-18 -38 -6 -40" w={3.2} o={0.8} />
          <Hl d="M-48 3 Q-40 8 -26 9" w={2.8} o={0.7} />
        </g>
      );
    case "head_pastel_ribbon":
      return (
        <g>
          <path d="M-4 -12 L-26 14 L-12 12 L-4 2Z" fill={C.peachSoft} {...O25} />
          <path d="M4 -12 L26 14 L12 12 L4 2Z" fill={C.peach} {...O25} />
          <motion.g style={fb(0.5, 0.8)} animate={{ rotate: [-3, 3, -3] }} transition={loop(2.8)}>
            <path d="M-4 -14 Q-36 -52 -50 -24 Q-52 4 -4 -10Z" fill={C.taroSoft} {...O} />
            <path d="M-12 -16 Q-30 -38 -42 -22" fill="none" stroke={C.taro} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
            <path d="M4 -14 Q36 -52 50 -24 Q52 4 4 -10Z" fill={C.peachSoft} {...O} />
            <path d="M12 -16 Q30 -38 42 -22" fill="none" stroke={C.peach} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
            <Hl d="M-38 -34 Q-30 -42 -20 -40" w={3.2} o={0.85} />
            <Hl d="M30 -40 Q40 -38 44 -30" w={3.2} o={0.85} />
          </motion.g>
          <circle cx={0} cy={-12} r={8.4} fill={C.honey} {...O3} />
          <circle cx={-2.4} cy={-14.4} r={2.4} fill={C.cream} />
          <Sparkle x={52} y={-44} size={8} color={C.honeySoft} delay={0.4} />
        </g>
      );
    case "head_artist_beret":
      return (
        <g>
          <path d="M-48 -2 Q-52 -34 -10 -40 Q36 -46 50 -12 Q54 2 30 3 Q-10 9 -48 -2Z" fill={C.taro} {...O} />
          <path d="M22 -34 Q50 -26 50 -8 Q52 2 30 3 Q16 5 6 6 Q30 -6 22 -34Z" fill={C.taroDark} opacity={0.4} />
          <path d="M-47 -4 Q-10 8 30 2" fill="none" stroke={C.taroDark} strokeWidth={4.6} strokeLinecap="round" opacity={0.75} />
          <path d="M8 -43 Q10 -52 16 -51 Q18 -46 12 -42Z" fill={C.taroDark} {...O25} />
          <Hl d="M-34 -22 Q-26 -34 -8 -36" w={3.4} o={0.8} />
          <circle cx={-30} cy={-8} r={2.6} fill={C.cream} opacity={0.85} />
          <circle cx={-18} cy={-14} r={2} fill={C.cream} opacity={0.7} />
        </g>
      );
    case "head_grad_cap":
      return (
        <g>
          <path d="M-32 -16 V2 Q0 16 32 2 V-16Z" fill={HFN.cap} {...O3} />
          <path d="M-54 -22 L0 -40 L54 -22 L0 -4Z" fill={HFN.cap} {...O} />
          <Hl d="M-42 -23 L-10 -33" w={3} o={0.45} />
          <path d="M0 -22 Q30 -18 42 -12 V8" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <path d="M0 -22 Q30 -18 42 -12 V8" fill="none" stroke={C.honey} strokeWidth={3.6} strokeLinecap="round" />
          <path d="M37 6 H47 L49 24 H35Z" fill={C.honey} {...O2} />
          <path d="M39 12 V22 M45 12 V22" stroke={C.honeyDark} strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={0} cy={-22} r={4.6} fill={C.honey} {...O2} />
        </g>
      );
    case "head_bunny_hood":
      return (
        <g>
          <motion.g style={fb(0.5, 1)} animate={{ rotate: [-3, 2, -3] }} transition={loop(3)}>
            <path d="M-26 -26 Q-48 -92 -24 -100 Q-2 -94 -8 -28Z" fill={C.cream} {...O} />
            <path d="M-24 -36 Q-36 -84 -24 -92 Q-14 -86 -16 -36Z" fill={C.peachSoft} />
            <Hl d="M-32 -78 Q-30 -90 -26 -94" w={3} o={0.8} />
          </motion.g>
          <motion.g style={fb(0.5, 1)} animate={{ rotate: [3, -2, 3] }} transition={loop(3.4)}>
            <path d="M26 -26 Q48 -92 24 -100 Q2 -94 8 -28Z" fill={C.cream} {...O} />
            <path d="M24 -36 Q36 -84 24 -92 Q14 -86 16 -36Z" fill={C.peachSoft} />
          </motion.g>
          <path d="M-47 6 Q-54 -30 0 -36 Q54 -30 47 6 Q0 14 -47 6Z" fill={C.cream} {...O} />
          <path d="M-47 6 Q0 14 47 6 L45 -6 Q0 2 -45 -6Z" fill={C.peachSoft} {...O25} />
          <path d="M-22 -26 Q-14 -34 0 -34" fill="none" stroke={C.skySoft} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          <path d="M-45 4 Q-50 18 -46 32 M45 4 Q50 18 46 32" fill="none" stroke={INK} strokeWidth={6.4} strokeLinecap="round" />
          <path d="M-45 4 Q-50 18 -46 32 M45 4 Q50 18 46 32" fill="none" stroke={C.peach} strokeWidth={3.2} strokeLinecap="round" />
          <circle cx={-46} cy={34} r={6.4} fill={C.cream} {...O25} />
          <circle cx={46} cy={34} r={6.4} fill={C.cream} {...O25} />
        </g>
      );
    case "head_top_hat":
      return (
        <g>
          <ellipse cx={0} cy={-2} rx={56} ry={10} fill={C.taroDark} {...O} />
          <path d="M-34 -2 V-60 Q-34 -68 -26 -68 H26 Q34 -68 34 -60 V-2 Q0 8 -34 -2Z" fill={C.taro} {...O} />
          <path d="M14 -66 H26 Q34 -66 34 -58 V-2 Q26 2 14 4Z" fill={C.taroDark} opacity={0.4} />
          <path d="M-34 -22 Q0 -14 34 -22 V-8 Q0 0 -34 -8Z" fill={C.honey} {...O25} />
          <rect x={-9} y={-21} width={18} height={12} rx={3} fill={C.honeySoft} stroke={INK} strokeWidth={2.2} />
          <rect x={-4} y={-18} width={8} height={6} rx={1.5} fill="none" stroke={INK} strokeWidth={2} />
          <Hl d="M-25 -58 V-34" w={3.4} o={0.6} />
          <Sparkle x={42} y={-58} size={7} color={C.honeySoft} delay={0.5} />
        </g>
      );
    case "head_astronaut_helmet":
      return (
        <g>
          <circle cx={0} cy={62} r={98} fill={C.skySoft} fillOpacity={0.1} stroke={INK} strokeWidth={4} />
          <circle cx={0} cy={62} r={91} fill="none" stroke={C.cream} strokeWidth={3} opacity={0.55} />
          <path d="M-74 10 A92 92 0 0 1 -36 -22" fill="none" stroke={C.cream} strokeWidth={6} strokeLinecap="round" opacity={0.9} />
          <path d="M-84 34 A92 92 0 0 1 -80 22" fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
          <path d="M60 -14 A92 92 0 0 1 78 14" fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.6} />
          <path d="M0 -36 V-52" stroke={INK} strokeWidth={6.4} strokeLinecap="round" />
          <path d="M0 -36 V-52" stroke={C.steel} strokeWidth={3} strokeLinecap="round" />
          <circle cx={0} cy={-56} r={6.4} fill={C.peach} {...O25} />
          <circle cx={-2} cy={-58} r={1.8} fill={C.cream} />
          <circle cx={-98} cy={62} r={8} fill={C.steel} {...O25} />
          <circle cx={98} cy={62} r={8} fill={C.steel} {...O25} />
          <ellipse cx={0} cy={150} rx={80} ry={15} fill={C.steel} {...O} />
          <ellipse cx={0} cy={147} rx={66} ry={9} fill={C.steelDark} opacity={0.55} />
          <polygon points={starPoints(-38, 152, 6.4, 2.8)} fill={C.honey} {...O2} />
          <polygon points={starPoints(38, 152, 6.4, 2.8)} fill={C.sky} {...O2} />
          <circle cx={0} cy={154} r={4.4} fill={C.peach} {...O2} />
          <Hl d="M-58 144 Q-30 150 -14 150" w={3} o={0.8} />
          <Sparkle x={-100} y={-8} size={8} color={C.cream} delay={0.2} />
        </g>
      );
    case "head_diamond_crown":
      return (
        <g>
          <path d="M-46 4 V-26 L-30 -12 L-15 -40 L0 -16 L15 -40 L30 -12 L46 -26 V4 Q0 12 -46 4Z" fill={C.honey} {...O} />
          <path d="M-46 -8 Q0 2 46 -8 V4 Q0 12 -46 4Z" fill={C.honeyDark} opacity={0.5} />
          <Hl d="M-40 -18 L-34 -12" w={3} o={0.8} />
          <circle cx={-46} cy={-28} r={4.6} fill={C.honeySoft} {...O2} />
          <circle cx={46} cy={-28} r={4.6} fill={C.honeySoft} {...O2} />
          <g transform="translate(-15 -46)" style={SVG_ATTR_ORIGIN}>
            <Diamond s={7} />
          </g>
          <g transform="translate(15 -46)" style={SVG_ATTR_ORIGIN}>
            <Diamond s={7} />
          </g>
          <g transform="translate(0 -2)" style={SVG_ATTR_ORIGIN}>
            <Diamond s={9} />
          </g>
          <circle cx={0} cy={-18} r={3.6} fill={C.honeySoft} {...O2} />
          <Sparkle x={-36} y={-44} size={8} color={C.cream} delay={0} />
          <Sparkle x={38} y={-38} size={9} color={C.skySoft} delay={0.8} />
        </g>
      );
    default:
      return null;
  }
}

/* ───────────── Wajah (origin = tengah antara dua mata) ───────────── */

function HfnFace({ id, half }: { id: string; half: number }): ReactElement | null {
  switch (id) {
    case "face_round_glasses": {
      const r = 19;
      return (
        <g>
          {[-half, half].map((x) => (
            <g key={x}>
              <circle cx={x} cy={0} r={r} fill={C.skySoft} opacity={0.38} />
              <circle cx={x} cy={0} r={r} fill="none" stroke={INK} strokeWidth={6.4} />
              <circle cx={x} cy={0} r={r} fill="none" stroke={C.honey} strokeWidth={3.2} />
              <path d={`M${x - 11} -7 Q${x - 7} -13 ${x - 1} -14`} fill="none" stroke={C.cream} strokeWidth={2.8} strokeLinecap="round" />
            </g>
          ))}
          <Duo d={`M${-half + r} -3 Q0 -11 ${half - r} -3`} inner={C.honey} ow={6.4} iw={3.2} />
          <Duo d={`M${-half - r} -3 L${-half - r - 18} -7`} inner={C.honey} ow={6.4} iw={3.2} />
          <Duo d={`M${half + r} -3 L${half + r + 18} -7`} inner={C.honey} ow={6.4} iw={3.2} />
        </g>
      );
    }
    case "face_cheek_bandaid":
      return (
        <g transform={`translate(${-half - 18} 26) rotate(-22)`} style={SVG_ATTR_ORIGIN}>
          <rect x={-20} y={-8} width={40} height={16} rx={8} fill={HFN.band} {...O25} />
          <rect x={-8} y={-8} width={16} height={16} fill={HFN.bandDark} stroke={INK} strokeWidth={2} />
          <path d="M0 4 C-6 0 -5 -5 -1.6 -4 Q0 -3.6 0 -2.4 Q0 -3.6 1.6 -4 C5 -5 6 0 0 4Z" fill={C.peach} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
          <g fill={HFN.bandDark}>
            <circle cx={-14} cy={-2} r={1.2} />
            <circle cx={-14} cy={3} r={1.2} />
            <circle cx={14} cy={-2} r={1.2} />
            <circle cx={14} cy={3} r={1.2} />
          </g>
          <Hl d="M-17 -5 H-11" w={2} o={0.9} />
        </g>
      );
    case "face_star_glasses":
      return (
        <g>
          <Duo d={`M${-half + 22} -2 Q0 -10 ${half - 22} -2`} inner={C.honey} ow={6.4} iw={3.2} />
          {[-half, half].map((x, i) => (
            <g key={x}>
              <polygon points={starPoints(x, 1, 28, 14)} fill={C.honey} {...O} />
              <polygon points={starPoints(x, 1, 19, 9.6)} fill={C.skySoft} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
              <path d={`M${x - 8} -3 L${x - 2} -10`} fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" />
              <Sparkle x={x + (i === 0 ? -26 : 26)} y={-22} size={7} color={i === 0 ? C.cream : C.skySoft} delay={i * 0.7} />
            </g>
          ))}
        </g>
      );
    case "face_sunglasses":
      return (
        <g>
          <Duo d={`M${-half + 20} -4 Q0 -10 ${half - 20} -4`} inner={INK} ow={7} iw={4} />
          <path d={`M${-half - 22} -6 L${-half - 38} -10 M${half + 22} -6 L${half + 38} -10`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          {[-half, half].map((x) => (
            <g key={x} transform={`translate(${x} 0)`} style={SVG_ATTR_ORIGIN}>
              <path d="M-22 -12 H22 Q24 -12 24 -10 V4 Q24 17 9 17 H-9 Q-24 17 -24 4 V-10 Q-24 -12 -22 -12Z" fill="#33302B" {...O} />
              <path d="M-14 -7 L-6 -7 L-14 9Z" fill={C.cream} opacity={0.75} />
              <path d="M-2 -7 L2 -7 L-6 9 L-10 9Z" fill={C.cream} opacity={0.4} />
            </g>
          ))}
          <Sparkle x={half + 30} y={-16} size={6} color={C.cream} delay={0.4} />
        </g>
      );
    case "face_sleep_mask": {
      const w = half + 24;
      return (
        <g>
          <path d={`M${-w} -2 Q${-w - 22} -8 ${-w - 32} -2`} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d={`M${-w} -2 Q${-w - 22} -8 ${-w - 32} -2`} fill="none" stroke={C.taroDark} strokeWidth={5} strokeLinecap="round" />
          <path d={`M${w} -2 Q${w + 22} -8 ${w + 32} -2`} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d={`M${w} -2 Q${w + 22} -8 ${w + 32} -2`} fill="none" stroke={C.taroDark} strokeWidth={5} strokeLinecap="round" />
          <path
            d={`M${-w} -10 Q${-w} -22 ${-w + 12} -22 Q0 -16 ${w - 12} -22 Q${w} -22 ${w} -10 V10 Q${w} 20 ${w - 12} 20 Q${w - 22} 20 ${w - 30} 12 Q0 4 ${-w + 30} 12 Q${-w + 22} 20 ${-w + 12} 20 Q${-w} 20 ${-w} 10Z`}
            fill={C.taro}
            {...O}
          />
          <path d={`M${-w + 6} -12 Q${-w + 10} -19 ${-w + 22} -19`} fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          {[-half, half].map((x) => (
            <g key={x}>
              <path d={`M${x - 12} -1 Q${x} 9 ${x + 12} -1`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
              <path d={`M${x - 11} 0 l-3 4 M${x} 6 v5 M${x + 11} 0 l3 4`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
            </g>
          ))}
          <polygon points={starPoints(0, -3, 8, 3.6)} fill={C.honey} {...O2} />
          <Sparkle x={w + 8} y={-20} size={6} color={C.honeySoft} delay={0.6} />
        </g>
      );
    }
    case "face_diamond_monocle": {
      const r = 21;
      return (
        <g>
          <circle cx={half} cy={0} r={r} fill={C.skySoft} opacity={0.4} />
          <path d={`M${half - 10} -6 L${half - 4} -14 M${half + 2} 12 L${half + 12} 4 M${half - 12} 8 L${half - 2} 14`} fill="none" stroke={C.cream} strokeWidth={2} strokeLinecap="round" opacity={0.65} />
          <circle cx={half} cy={0} r={r} fill="none" stroke={INK} strokeWidth={6.6} />
          <circle cx={half} cy={0} r={r} fill="none" stroke={C.honey} strokeWidth={3.4} />
          <path d={`M${half - 12} -8 Q${half - 8} -14 ${half - 1} -15`} fill="none" stroke={C.cream} strokeWidth={2.8} strokeLinecap="round" />
          <path d={`M${half + 6} ${r - 1} Q${half + 30} ${r + 34} ${half + 8} ${r + 58}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${half + 6} ${r - 1} Q${half + 30} ${r + 34} ${half + 8} ${r + 58}`} fill="none" stroke={C.honey} strokeWidth={3} strokeLinecap="round" strokeDasharray="5 4" />
          <g transform={`translate(${half + 8} ${r + 70})`} style={SVG_ATTR_ORIGIN}>
            <Diamond s={10} />
          </g>
          <Sparkle x={half + 24} y={-18} size={7} color={C.honeySoft} delay={0.2} />
        </g>
      );
    }
    default:
      return null;
  }
}

/* ───────────── Leher (origin = bawah dagu, tengah) ───────────── */

function HfnNeck({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case "neck_bandana":
      return (
        <g>
          <path d="M-54 -6 Q0 14 54 -6 L58 8 Q0 32 -58 8Z" fill={C.peach} {...O} />
          <path d="M-38 14 Q0 24 38 14 L0 58Z" fill={C.peach} {...O} />
          <g fill={C.cream}>
            <circle cx={-32} cy={7} r={2.8} />
            <circle cx={0} cy={13} r={2.8} />
            <circle cx={32} cy={7} r={2.8} />
            <circle cx={-13} cy={30} r={2.8} />
            <circle cx={13} cy={30} r={2.8} />
            <circle cx={0} cy={44} r={2.8} />
          </g>
          <circle cx={-52} cy={3} r={6.4} fill={C.peachDark} {...O25} />
          <Hl d="M-44 -2 Q-26 8 -8 8" w={3} o={0.55} />
        </g>
      );
    case "neck_knit_scarf":
      return (
        <g>
          <path d="M16 12 L42 12 L46 56 L22 56Z" fill={C.sky} {...O} />
          {[24, 36, 48].map((y) => (
            <path key={y} d={`M${17 + (y - 12) * 0.1} ${y} H${44 + (y - 12) * 0.1}`} stroke={C.cream} strokeWidth={5} strokeLinecap="butt" />
          ))}
          <path d="M16 12 L42 12 L46 56 L22 56Z" fill="none" {...O} />
          <path d="M25 56 V64 M31 56 V65 M37 56 V64 M43 56 V63" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M-54 -6 Q0 14 54 -6 L56 10 Q0 30 -56 10Z" fill={C.sky} />
          {[-45, -30, -15, 0, 15, 30, 45].map((x, i) => {
            const top = hfnBandTop(x);
            return <path key={x} d={`M${x} ${top - 1} L${x} ${top + 17}`} stroke={i % 2 === 0 ? C.cream : C.skyDark} strokeWidth={5.4} strokeLinecap="butt" opacity={i % 2 === 0 ? 1 : 0.55} />;
          })}
          <path d="M-54 -6 Q0 14 54 -6 L56 10 Q0 30 -56 10Z" fill="none" {...O} />
          <Hl d="M-44 2 Q-22 12 -4 14" w={2.8} o={0.6} />
        </g>
      );
    case "neck_golden_bell":
      return (
        <g>
          <path d="M-50 -4 Q0 16 50 -4 L52 7 Q0 29 -52 7Z" fill={HFN.red} {...O} />
          <g fill={C.honeySoft}>
            <circle cx={-34} cy={6} r={1.8} />
            <circle cx={-14} cy={11} r={1.8} />
            <circle cx={14} cy={11} r={1.8} />
            <circle cx={34} cy={6} r={1.8} />
          </g>
          <Hl d="M-42 -1 Q-22 9 -4 11" w={2.8} o={0.6} />
          <path d="M0 18 V22" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <circle cx={0} cy={34} r={13} fill={C.honey} {...O} />
          <path d="M-13 33 H13" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
          <circle cx={0} cy={40} r={2.8} fill={INK} />
          <Hl d="M-8 26 Q-5 22 0 21" w={3} o={0.9} />
          <Sparkle x={19} y={24} size={6} color={C.cream} delay={0.4} />
        </g>
      );
    case "neck_bowtie":
      return (
        <g>
          <path d="M-5 14 L-42 -2 Q-50 14 -42 30Z" fill={C.taro} {...O} />
          <path d="M5 14 L42 -2 Q50 14 42 30Z" fill={C.taro} {...O} />
          <path d="M-26 8 L-12 14 M-26 20 L-12 14 M26 8 L12 14 M26 20 L12 14" fill="none" stroke={C.taroDark} strokeWidth={2.6} strokeLinecap="round" />
          <rect x={-9} y={4} width={18} height={20} rx={6} fill={C.honey} {...O} />
          <Hl d="M-4 9 V17" w={2.6} o={0.8} />
        </g>
      );
    case "neck_diamond_pendant":
      return (
        <g>
          <path d="M-44 -2 Q0 52 44 -2" fill="none" stroke={INK} strokeWidth={6.6} strokeLinecap="round" />
          <path d="M-44 -2 Q0 52 44 -2" fill="none" stroke={C.steel} strokeWidth={3.2} strokeLinecap="round" />
          <path d="M0 25 V31" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <g transform="translate(0 43)" style={SVG_ATTR_ORIGIN}>
            <Diamond s={13} />
          </g>
          <Sparkle x={19} y={33} size={7} color={C.cream} delay={0} />
          <Sparkle x={-18} y={52} size={5} color={C.skySoft} delay={0.9} />
        </g>
      );
    case "neck_royal_fur_scarf": {
      const lower = [-40, -24, -8, 8, 24, 40];
      const upper = [-48, -32, -16, 0, 16, 32, 48];
      return (
        <g>
          {[0, 1].map((pass) => (
            <g key={pass}>
              {lower.map((x) => (
                <circle key={x} cx={x} cy={hfnBandTop(x) + 20} r={pass === 0 ? 13 : 11.6} fill={pass === 0 ? HFN.fur : HFN.furShade} stroke={pass === 0 ? INK : "none"} strokeWidth={3} />
              ))}
            </g>
          ))}
          {[0, 1].map((pass) => (
            <g key={pass}>
              {upper.map((x) => (
                <circle key={x} cx={x} cy={hfnBandTop(x) + 8} r={pass === 0 ? 13.4 : 12} fill={HFN.fur} stroke={pass === 0 ? INK : "none"} strokeWidth={3} />
              ))}
            </g>
          ))}
          <g fill="none" stroke={C.skySoft} strokeWidth={3} strokeLinecap="round">
            {[-32, 0, 32].map((x) => (
              <path key={x} d={`M${x - 5} ${hfnBandTop(x) + 12} q5 5 10 0`} />
            ))}
            {[-24, 8, 40].map((x) => (
              <path key={x} d={`M${x - 5} ${hfnBandTop(x) + 28} q5 5 10 0`} />
            ))}
          </g>
          <path d="M-36 6 Q-30 -2 -20 -2 M20 -2 Q32 -2 38 6" fill="none" stroke={C.skySoft} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          <g transform="translate(0 32)" style={SVG_ATTR_ORIGIN}>
            <circle r={9} fill={C.honey} {...O3} />
            <g transform="translate(0 0.6)" style={SVG_ATTR_ORIGIN}>
              <Diamond s={5.4} />
            </g>
          </g>
          <Sparkle x={26} y={40} size={6} color={C.honeySoft} delay={0.5} />
        </g>
      );
    }
    default:
      return null;
  }
}

/* ───────────── API publik fragmen ini ───────────── */

function HeadItem({ id }: { id: string }): ReactElement | null {
  return <HfnHead id={id} />;
}

function FaceItem({ id, half }: { id: string; half: number }): ReactElement | null {
  return <HfnFace id={id} half={half} />;
}

function NeckItem({ id }: { id: string }): ReactElement | null {
  return <HfnNeck id={id} />;
}

/** viewBox (koordinat lokal item) untuk ikon pratinjau; FaceItem dipratinjau dengan half = 35. */
const HFN_BOX: Record<string, string> = {
  head_straw_hat: "-62 -80 124 124",
  head_pastel_ribbon: "-62 -78 124 124",
  head_artist_beret: "-62 -76 124 124",
  head_grad_cap: "-64 -74 128 128",
  head_bunny_hood: "-72 -108 144 154",
  head_top_hat: "-65 -96 130 130",
  head_astronaut_helmet: "-114 -66 228 238",
  head_diamond_crown: "-60 -80 120 120",
  face_round_glasses: "-80 -76 160 152",
  face_cheek_bandaid: "-90 -8 74 70",
  face_star_glasses: "-80 -76 160 152",
  face_sunglasses: "-80 -76 160 152",
  face_sleep_mask: "-100 -72 200 150",
  face_diamond_monocle: "-24 -36 128 140",
  neck_bandana: "-66 -34 132 132",
  neck_knit_scarf: "-66 -30 132 132",
  neck_golden_bell: "-66 -30 132 132",
  neck_bowtie: "-66 -30 132 132",
  neck_diamond_pendant: "-66 -30 132 132",
  neck_royal_fur_scarf: "-66 -32 132 132",
};

/* ═════════════════════════════════════════════════════════════
 *  KOSMETIK: PAKAIAN (outfit) & PROPERTI (prop)
 * ═════════════════════════════════════════════════════════════ */

const OP_K = {
  emerald: "#3DBE8B",
  emeraldDark: "#2A9A6D",
  emeraldLight: "#7BE0B6",
  crimson: "#E8576A",
  crimsonDark: "#C73D52",
  crimsonLight: "#F58A98",
  mint: "#8FE3C8",
  mintDark: "#4FC4A0",
  leather: "#8A5A44",
} as const;

/** Siluet torso netral untuk ikon pratinjau pakaian. */
const OP_TORSO =
  "M136 296 C136 250 164 232 200 232 C236 232 264 250 264 296 C264 332 238 350 200 350 C162 350 136 332 136 296Z";

/** Kotak pratinjau pakaian (bawaan = lebar, muat rok & jubah). Dipersempit per item lewat OUTFIT_BOX_TIER. */
const OP_OUTFIT_BOX = "76 214 248 156";
const OUTFIT_BOX_NARROW = "120 218 160 144";
const OUTFIT_BOX_MID = "100 214 200 156";
const OUTFIT_BOX_TIER: Record<string, string> = {
  outfit_tee: OUTFIT_BOX_NARROW,
  outfit_knit_sweater: OUTFIT_BOX_NARROW,
  outfit_manager_vest: OUTFIT_BOX_NARROW,
  outfit_boss_suit: OUTFIT_BOX_NARROW,
  outfit_pajamas_star: OUTFIT_BOX_NARROW,
  outfit_denim_overalls: OUTFIT_BOX_NARROW,
  outfit_chef_coat: OUTFIT_BOX_NARROW,
  outfit_soccer_jersey: OUTFIT_BOX_NARROW,
  outfit_hawaiian_shirt: OUTFIT_BOX_NARROW,
  outfit_batik_shirt: OUTFIT_BOX_NARROW,
  outfit_yukata_sakura: OUTFIT_BOX_NARROW,
  outfit_tuxedo_dapper: OUTFIT_BOX_NARROW,
  outfit_doctor_coat: OUTFIT_BOX_NARROW,
  outfit_barista_apron: OUTFIT_BOX_MID,
  outfit_cozy_hoodie: OUTFIT_BOX_MID,
  outfit_raincoat_yellow: OUTFIT_BOX_MID,
  outfit_sultan_robe: OUTFIT_BOX_MID,
  outfit_kebaya_modern: OUTFIT_BOX_MID,
  outfit_knight_armor: OUTFIT_BOX_MID,
};

/* ───────────────────────── Pakaian: belakang ───────────────────────── */

function OutfitBack({ id }: { id: string }): ReactElement | null {
  if (id === "outfit_sultan_robe") {
    return (
      <g>
        <path d="M116 250 Q92 304 104 356 H296 Q308 304 284 250Z" fill={OP_K.crimsonDark} {...O} />
        <path d="M126 262 Q108 306 118 348" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinecap="round" />
        <path d="M274 262 Q292 306 282 348" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinecap="round" />
        <Hl d="M112 290 Q108 316 112 336" w={3} o={0.35} />
      </g>
    );
  }
  if (id === "outfit_party_gown") {
    return (
      <path
        d="M134 312 Q88 338 86 358 H314 Q312 338 266 312Z"
        fill={C.taroDark}
        opacity={0.9}
        {...O}
      />
    );
  }
  return null;
}

/* ───────────────────────── Pakaian: terpotong badan ───────────────────────── */

function OutfitClipped({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case "outfit_tee":
      return (
        <g>
          <rect x={100} y={246} width={200} height={96} fill={C.matcha} />
          <path d="M244 250 Q272 296 264 342 H300 V248Z" fill={C.matchaDark} opacity={0.45} />
          <path d="M100 330 H300 V342 H100Z" fill={C.matchaDark} opacity={0.5} />
          <path d="M100 330 H300 M100 342 H300" fill="none" stroke={INK} strokeWidth={2.6} />
          <ellipse cx={200} cy={252} rx={32} ry={12} fill={C.matchaDark} stroke={INK} strokeWidth={2.6} />
          <path d="M124 262 Q116 290 124 316 M276 262 Q284 290 276 316" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
          <rect x={150} y={286} width={34} height={30} rx={6} fill={C.matchaSoft} stroke={INK} strokeWidth={2.4} />
          <path d="M150 294 H184" stroke={INK} strokeWidth={2} opacity={0.35} />
          <g transform="translate(167 304)" style={SVG_ATTR_ORIGIN}>
            <Coin r={8.4} />
          </g>
          <Hl d="M130 266 Q142 258 162 258" w={3} o={0.5} />
        </g>
      );
    case "outfit_knit_sweater": {
      const braid = (x: number) =>
        `M${x} 262${" q7 5 0 10 q-7 5 0 10".repeat(5)}`;
      return (
        <g>
          <rect x={100} y={246} width={200} height={96} fill={C.peach} />
          <path d="M244 250 Q272 296 264 342 H300 V248Z" fill={C.peachDark} opacity={0.35} />
          <g fill="none" stroke={C.peachDark} strokeWidth={3} strokeLinecap="round" opacity={0.55}>
            {[122, 146, 254, 278].map((x) => (
              <path key={x} d={braid(x)} />
            ))}
            <path d={braid(222)} />
            <path d={braid(178)} />
          </g>
          <rect x={100} y={326} width={200} height={16} fill={C.peachDark} opacity={0.55} />
          <g stroke={INK} strokeWidth={2} opacity={0.4} strokeLinecap="round">
            {Array.from({ length: 17 }).map((_, i) => (
              <path key={i} d={`M${108 + i * 12} 328 V340`} />
            ))}
          </g>
          <path d="M100 326 H300" stroke={INK} strokeWidth={2.6} />
          <ellipse cx={200} cy={252} rx={32} ry={12} fill={C.cream} stroke={INK} strokeWidth={2.6} />
          <polygon points={starPoints(200, 300, 15, 6.4)} fill={C.honey} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <Hl d="M130 264 Q142 258 160 258" w={3} o={0.5} />
        </g>
      );
    }
    case "outfit_barista_apron":
      return (
        <g>
          <rect x={100} y={246} width={200} height={96} fill={C.cream} />
          <path d="M162 248 H238 V290 H276 V342 H124 V290 H162Z" fill={C.matcha} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M238 292 H276 V342 H246Z" fill={C.matchaDark} opacity={0.35} />
          <path d="M124 290 H276" stroke={INK} strokeWidth={2.4} />
          <rect x={172} y={304} width={56} height={28} rx={8} fill={C.matchaDark} stroke={INK} strokeWidth={2.4} />
          <g transform="translate(200 318)" style={SVG_ATTR_ORIGIN}>
            <path d="M-10 -7 H8 V4 Q8 10 1 10 H-3 Q-10 10 -10 4Z" fill={C.cream} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <path d="M8 -3 Q15 -3 15 2 Q15 7 8 6" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
            <path d="M-3 -10 Q0 -14 -3 -18 M3 -10 Q6 -14 3 -18" fill="none" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" />
          </g>
          <Hl d="M170 262 V282" w={3} o={0.55} />
          <path d="M138 262 Q132 280 134 296" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
        </g>
      );
    case "outfit_cozy_hoodie":
      return (
        <g>
          <rect x={100} y={246} width={200} height={98} fill={C.sky} />
          <path d="M244 250 Q272 296 264 344 H300 V248Z" fill={C.skyDark} opacity={0.4} />
          <path d="M140 302 H260 L274 338 H126Z" fill={C.skyDark} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M146 302 L134 330 M254 302 L266 330" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.55} />
          <path d="M100 330 H300 V344 H100Z" fill={C.skyDark} opacity={0.5} />
          <path d="M100 330 H140 M260 330 H300" fill="none" stroke={INK} strokeWidth={2.4} />
          <Hl d="M132 266 Q128 292 132 314" w={3} o={0.45} />
          <Hl d="M152 310 H196" w={3} o={0.3} />
        </g>
      );
    case "outfit_manager_vest":
      return (
        <g>
          <rect x={100} y={246} width={200} height={98} fill={C.cream} />
          <path d="M104 246 L168 248 L196 304 L194 344 H100Z" fill={C.taro} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M296 246 L232 248 L204 304 L206 344 H300Z" fill={C.taroDark} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M164 248 L200 298 L236 248 L222 244 L200 266 L178 244Z" fill={C.cream} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <path d="M194 266 L206 266 L211 316 L200 330 L189 316Z" fill={C.peach} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M191 262 L209 262 L206 274 L194 274Z" fill={C.peachDark} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <g fill={C.honey} stroke={INK} strokeWidth={2}>
            <circle cx={186} cy={318} r={3.8} />
            <circle cx={186} cy={334} r={3.8} />
          </g>
          <path d="M138 296 H168" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.6} />
          <Hl d="M122 270 Q124 296 126 318" w={3} o={0.5} />
        </g>
      );
    case "outfit_boss_suit":
      return (
        <g>
          <rect x={100} y={246} width={200} height={98} fill={OP_K.emerald} />
          <path d="M104 246 L196 252 L194 344 H100Z" fill={OP_K.emerald} />
          <path d="M296 246 L204 252 L206 344 H300Z" fill={OP_K.emerald} />
          <path d="M104 250 Q94 296 100 344 M296 250 Q306 296 300 344" fill="none" stroke={OP_K.emeraldDark} strokeWidth={10} opacity={0.5} />
          <path d="M196 252 V344 M204 252 V344" stroke={C.honey} strokeWidth={4} />
          <path d="M164 248 L196 304 L190 262Z M236 248 L204 304 L210 262Z" fill={OP_K.emeraldLight} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <g fill={C.honey} stroke={INK} strokeWidth={2.2}>
            {[316, 334].map((y) => (
              <g key={y}>
                <circle cx={184} cy={y} r={4.2} />
                <circle cx={216} cy={y} r={4.2} />
              </g>
            ))}
          </g>
          <path d="M178 248 L200 280 L222 248 Q200 262 178 248Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <rect x={138} y={284} width={24} height={9} rx={2} fill={C.honey} stroke={INK} strokeWidth={2} />
          <path d="M142 284 L148 276 L154 284Z" fill={C.peach} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d="M130 322 H160 M240 322 H270" stroke={OP_K.emeraldDark} strokeWidth={4} strokeLinecap="round" />
          <Hl d="M124 268 Q120 296 122 320" w={3} o={0.5} />
        </g>
      );
    case "outfit_party_gown":
      return (
        <g>
          <rect x={100} y={246} width={200} height={98} fill={C.taroSoft} />
          <path d="M246 250 Q274 296 264 344 H300 V248Z" fill={C.taro} opacity={0.45} />
          <rect x={100} y={310} width={200} height={34} fill={C.taro} opacity={0.55} />
          <path d="M100 312 H300" stroke={INK} strokeWidth={2.4} />
          <rect x={100} y={306} width={200} height={12} fill={C.peach} stroke={INK} strokeWidth={2.4} />
          <path
            d="M134 250 q8 14 16 0 q8 14 16 0 q8 14 16 0 q8 14 16 0 q8 14 16 0 q8 14 16 0 q8 14 16 0 V246 H134Z"
            fill={C.cream}
            stroke={INK}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <g fill={C.honeySoft}>
            <circle cx={150} cy={280} r={2.6} />
            <circle cx={176} cy={292} r={2.6} />
            <circle cx={228} cy={284} r={2.6} />
            <circle cx={254} cy={296} r={2.6} />
            <circle cx={200} cy={274} r={2.6} />
          </g>
          <g transform="translate(200 312)" style={SVG_ATTR_ORIGIN}>
            <path d="M0 0 L-24 -12 Q-30 0 -24 12Z" fill={C.honeySoft} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
            <path d="M0 0 L24 -12 Q30 0 24 12Z" fill={C.honeySoft} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
            <circle r={5.4} fill={C.honey} stroke={INK} strokeWidth={2.2} />
          </g>
          <Hl d="M128 268 Q124 288 128 304" w={3} o={0.55} />
        </g>
      );
    case "outfit_sultan_robe":
      return (
        <g>
          <rect x={100} y={244} width={200} height={100} fill={OP_K.crimson} />
          <path d="M246 250 Q274 296 264 344 H300 V248Z" fill={OP_K.crimsonDark} opacity={0.5} />
          <path d="M186 252 L200 308 L214 252" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinejoin="round" />
          <path d="M200 308 V344" stroke={C.honey} strokeWidth={4.4} />
          <path d="M100 322 H300 V346 H100Z" fill={C.cream} />
          <path d="M100 322 H300" stroke={INK} strokeWidth={2.4} />
          <g fill={INK}>
            {[120, 148, 176, 224, 252, 280].map((x, i) => (
              <ellipse key={x} cx={x} cy={i % 2 === 0 ? 333 : 336} rx={3.4} ry={5} />
            ))}
          </g>
          <path d="M100 244 H300 V264 Q200 284 100 264Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <g fill={INK}>
            {[[126, 255], [154, 264], [246, 264], [274, 255]].map(([x, y]) => (
              <ellipse key={x} cx={x} cy={y} rx={3} ry={4.4} />
            ))}
          </g>
          <circle cx={200} cy={294} r={13} fill={C.honey} stroke={INK} strokeWidth={2.8} />
          <g transform="translate(200 294)" style={SVG_ATTR_ORIGIN}>
            <Diamond s={9} />
          </g>
          <Hl d="M124 280 Q122 304 124 316" w={3} o={0.45} />
        </g>
      );
    default:
      return null;
  }
}

/* ───────────────────────── Pakaian: lapisan luar (tanpa clip) ───────────────────────── */

function OutfitOverlay({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case "outfit_barista_apron":
      return (
        <g>
          <path d="M262 290 L278 282 Q284 296 276 306Z" fill={C.matchaDark} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M262 290 L276 304 Q268 314 260 306Z" fill={C.matcha} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <circle cx={262} cy={291} r={4.4} fill={C.matchaDark} stroke={INK} strokeWidth={2.2} />
        </g>
      );
    case "outfit_cozy_hoodie":
      return (
        <g>
          <path
            d="M118 264 Q132 244 200 254 Q268 244 282 264 Q292 286 264 294 Q200 312 136 294 Q108 286 118 264Z"
            fill={C.sky}
            {...O}
          />
          <path d="M154 264 Q200 286 246 264 Q238 252 200 250 Q162 252 154 264Z" fill={C.skyDark} {...O25} />
          <Hl d="M128 274 Q134 262 156 258" w={3.2} o={0.6} />
          <Duo d="M188 284 Q186 300 190 318" inner={C.cream} ow={6} iw={3} />
          <Duo d="M212 284 Q214 300 210 318" inner={C.cream} ow={6} iw={3} />
          <circle cx={190} cy={321} r={4.4} fill={C.honey} {...O25} />
          <circle cx={210} cy={321} r={4.4} fill={C.honey} {...O25} />
        </g>
      );
    case "outfit_party_gown":
      return (
        <g>
          <path d="M138 318 Q100 340 98 358 H302 Q300 340 262 318Z" fill={C.taroSoft} {...O} />
          <path d="M150 322 Q122 342 120 358 H280 Q278 342 250 322Z" fill={C.taro} opacity={0.55} />
          <path d="M176 324 Q168 344 164 358 M200 326 V358 M224 324 Q232 344 236 358" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.35} />
          <path
            d="M98 350 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 V348 H98Z"
            fill={C.cream}
            stroke={INK}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <g fill={C.honeySoft}>
            <circle cx={128} cy={338} r={2.4} />
            <circle cx={168} cy={344} r={2.4} />
            <circle cx={232} cy={344} r={2.4} />
            <circle cx={272} cy={338} r={2.4} />
          </g>
          <Hl d="M112 340 Q118 330 134 326" w={3} o={0.55} />
          <Sparkle x={104} y={332} size={7} color={C.cream} delay={0.4} />
          <Sparkle x={296} y={340} size={7} color={C.honeySoft} delay={1.2} />
        </g>
      );
    case "outfit_sultan_robe":
      return (
        <g>
          <path
            d="M114 262 Q112 244 156 246 Q200 254 244 246 Q288 244 286 262 Q286 282 244 278 Q200 288 156 278 Q114 282 114 262Z"
            fill={C.cream}
            {...O}
          />
          <g fill={INK}>
            {[[128, 258], [150, 270], [176, 264], [224, 264], [250, 270], [272, 258]].map(([x, y]) => (
              <ellipse key={x} cx={x} cy={y} rx={3} ry={4.4} />
            ))}
          </g>
          <Hl d="M122 256 Q128 248 150 249" w={3} o={0.9} />
          <Sparkle x={290} y={270} size={7} color={C.honeySoft} delay={0.6} />
        </g>
      );
    default:
      return null;
  }
}

/* ───────────────────────── Pratinjau pakaian ───────────────────────── */

function OutfitPreviewArt({ id }: { id: string }): ReactElement {
  const clipId = `op-prev-${id}`;
  return (
    <g>
      <OutfitBack id={id} />
      <path d={OP_TORSO} fill="#FFF1D6" />
      <clipPath id={clipId}>
        <path d={OP_TORSO} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <OutfitClipped id={id} />
      </g>
      <path d={OP_TORSO} fill="none" {...O} />
      <OutfitOverlay id={id} />
    </g>
  );
}

/* ───────────────────────── Properti: roda ───────────────────────── */

function OpWheel({ cx, cy, r, tire = C.wheel, rim = C.cream }: { cx: number; cy: number; r: number; tire?: string; rim?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={tire} {...O} strokeWidth={r > 14 ? 3.5 : 3} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill={rim} stroke={INK} strokeWidth={2.2} />
      <circle cx={cx} cy={cy} r={r * 0.22} fill={C.honey} stroke={INK} strokeWidth={2} />
      <path d={`M${cx - r * 0.5} ${cy} H${cx + r * 0.5} M${cx} ${cy - r * 0.5} V${cy + r * 0.5}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.4} />
    </g>
  );
}

/* ───────────────────────── Properti: alas (seat) ───────────────────────── */

const OP_SEAT_CARDBOARD: SeatSpec = {
  lift: 4,
  back: (
    <g>
      <path d="M84 362 Q84 350 112 348 H288 Q316 350 316 362 Q316 374 288 376 H112 Q84 374 84 362Z" fill={C.cardboard} {...O} />
      <path d="M96 362 Q96 355 116 354 H284 Q304 355 304 362" fill="none" stroke={C.cardboardLight} strokeWidth={3.4} strokeLinecap="round" opacity={0.8} />
      <g stroke={INK} strokeWidth={2.4} strokeLinejoin="round">
        <rect x={104} y={356} width={34} height={14} rx={3} fill={C.cardboardLight} transform="rotate(-4 121 363)" style={SVG_ATTR_ORIGIN} />
        <rect x={256} y={358} width={36} height={14} rx={3} fill={C.peachSoft} transform="rotate(5 274 365)" style={SVG_ATTR_ORIGIN} />
        <rect x={160} y={364} width={30} height={10} rx={3} fill={C.cardboardDark} transform="rotate(2 175 369)" style={SVG_ATTR_ORIGIN} />
      </g>
      <path d="M108 363 H134 M260 365 H288" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeDasharray="4 4" opacity={0.65} />
      <path d="M232 352 H262 L258 372 H228Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" opacity={0.92} />
      <path d="M92 370 q6 5 12 0" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <Hl d="M92 356 Q98 350 116 349" w={3} o={0.7} />
    </g>
  ),
  front: null,
};

const OP_SEAT_CUSHION: SeatSpec = {
  lift: 12,
  back: (
    <g>
      <ellipse cx={200} cy={356} rx={116} ry={20} fill={C.taroDark} {...O} />
      <ellipse cx={200} cy={350} rx={106} ry={15} fill={C.taroSoft} stroke={INK} strokeWidth={2.4} />
    </g>
  ),
  front: (
    <g>
      <path d="M90 350 Q86 332 128 336 Q200 346 272 336 Q314 332 310 350 Q312 370 270 374 H130 Q88 370 90 350Z" fill={C.peachSoft} {...O} />
      <path d="M96 354 Q150 364 200 364 Q250 364 304 354" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" strokeDasharray="1 9" />
      <path d="M92 346 Q130 340 200 350 Q270 340 308 346" fill="none" stroke={C.honey} strokeWidth={3.4} strokeLinecap="round" />
      <g>
        <circle cx={88} cy={352} r={5.6} fill={C.honey} {...O25} />
        <path d="M86 357 V368 M90 357 V368" stroke={C.honeyDark} strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={312} cy={352} r={5.6} fill={C.honey} {...O25} />
        <path d="M310 357 V368 M314 357 V368" stroke={C.honeyDark} strokeWidth={2.6} strokeLinecap="round" />
      </g>
      <circle cx={200} cy={358} r={5} fill={C.taro} {...O25} />
      <Hl d="M108 346 Q116 340 138 340" w={3.2} o={0.7} />
    </g>
  ),
};

const OP_SEAT_SKATE: SeatSpec = {
  lift: 14,
  back: null,
  front: (
    <g>
      <rect x={118} y={355} width={22} height={7} rx={2} fill={C.steel} {...O25} />
      <rect x={260} y={355} width={22} height={7} rx={2} fill={C.steel} {...O25} />
      <path d="M70 336 Q74 344 92 344 H308 Q326 344 330 336 Q334 356 308 357 H92 Q66 356 70 336Z" fill={C.peachSoft} {...O} />
      <path d="M92 350 H308" stroke={C.honey} strokeWidth={4} strokeLinecap="round" />
      <g fill={C.sky} stroke={INK} strokeWidth={1.8}>
        <circle cx={150} cy={350} r={2.6} />
        <circle cx={200} cy={350} r={2.6} />
        <circle cx={250} cy={350} r={2.6} />
      </g>
      <OpWheel cx={130} cy={363} r={9} tire={C.sky} />
      <OpWheel cx={270} cy={363} r={9} tire={C.sky} />
      <Hl d="M80 340 Q84 343 98 343" w={2.8} o={0.7} />
    </g>
  ),
};

const OP_SEAT_SCOOTER: SeatSpec = {
  lift: 36,
  back: (
    <g>
      <OpWheel cx={92} cy={344} r={22} />
      <OpWheel cx={300} cy={344} r={22} />
      <motion.g
        animate={{ x: [0, 16], opacity: [0.7, 0], scale: [0.6, 1.3] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        style={fb()}
      >
        <circle cx={338} cy={342} r={7} fill={C.cream} stroke={INK} strokeWidth={2.4} />
      </motion.g>
    </g>
  ),
  front: (
    <g>
      <path
        d="M108 258 Q104 252 114 250 Q128 250 132 262 Q138 300 144 322 H302 Q324 322 324 336 Q324 350 302 350 H130 Q108 350 108 330Z"
        fill={OP_K.mint}
        {...O}
      />
      <path d="M118 262 Q122 300 130 326" fill="none" stroke={OP_K.mintDark} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d="M150 342 H300" stroke={C.cream} strokeWidth={4.4} strokeLinecap="round" opacity={0.85} />
      <Hl d="M114 266 Q116 286 122 302" w={3.4} o={0.7} />
      <path d="M144 322 Q150 316 160 316 H284 Q296 316 300 322Z" fill={OP_K.leather} {...O3} />
      <Duo d="M92 252 H138" inner={C.steel} ow={8} iw={4.6} />
      <circle cx={92} cy={252} r={5.4} fill={C.peach} {...O25} />
      <circle cx={138} cy={252} r={5.4} fill={C.peach} {...O25} />
      <circle cx={114} cy={274} r={7.4} fill={C.honey} {...O25} />
      <circle cx={112} cy={272} r={2.4} fill={C.cream} />
      <rect x={112} y={346} width={36} height={8} rx={4} fill={OP_K.mintDark} {...O25} />
    </g>
  ),
};

const OP_SEAT_CAR: SeatSpec = {
  lift: 26,
  back: (
    <g>
      <path d="M252 308 Q256 266 296 262 L340 266 L336 336 H252Z" fill={C.taro} {...O} />
      <path d="M262 300 Q266 276 292 272" fill="none" stroke={C.taroSoft} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      <path d="M356 296 L376 266 L376 304Z" fill={C.peach} {...O3} />
    </g>
  ),
  front: (
    <g>
      <circle cx={96} cy={344} r={29} fill="#5B4E44" {...O3} />
      <circle cx={304} cy={344} r={29} fill="#5B4E44" {...O3} />
      <path
        d="M28 338 Q28 320 48 316 L112 310 Q124 308 130 304 H286 Q300 304 306 296 L356 292 Q374 292 374 308 V338 Q374 352 356 352 H44 Q28 352 28 338Z"
        fill={C.peachSoft}
        {...O}
      />
      <path d="M34 331 H366" fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" />
      <path d="M130 308 V350 M286 308 V350" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.6} />
      <rect x={138} y={318} width={16} height={5} rx={2.5} fill={C.honey} {...O2} />
      <path d="M124 306 L142 266 H152" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M124 306 L142 266 H152" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M130 302 L144 272 H150 L146 302Z" fill={C.skySoft} opacity={0.55} />
      <rect x={20} y={332} width={14} height={16} rx={6} fill={C.honeySoft} {...O3} />
      <rect x={366} y={326} width={12} height={16} rx={6} fill={C.honeySoft} {...O3} />
      <circle cx={50} cy={322} r={9} fill={C.cream} {...O3} />
      <circle cx={50} cy={322} r={4.4} fill={C.honey} stroke={INK} strokeWidth={1.8} />
      <circle cx={96} cy={344} r={22} fill={C.wheel} {...O} />
      <circle cx={96} cy={344} r={15} fill={C.cream} stroke={INK} strokeWidth={2.4} />
      <circle cx={96} cy={344} r={6.2} fill={C.honey} stroke={INK} strokeWidth={2.2} />
      <circle cx={304} cy={344} r={22} fill={C.wheel} {...O} />
      <circle cx={304} cy={344} r={15} fill={C.cream} stroke={INK} strokeWidth={2.4} />
      <circle cx={304} cy={344} r={6.2} fill={C.honey} stroke={INK} strokeWidth={2.2} />
      <Hl d="M40 322 Q60 318 100 316" w={3.2} o={0.7} />
      <Sparkle x={26} y={324} size={7} color={C.cream} delay={0.3} />
      <Sparkle x={364} y={318} size={7} color={C.honeySoft} delay={1} />
    </g>
  ),
};

/* ───────────────────────── Properti: genggam ───────────────────────── */

function OpAbacus() {
  const rows: { y: number; color: string; beads: number[] }[] = [
    { y: -40, color: C.honey, beads: [-22, -12, 12, 22] },
    { y: -28, color: C.peach, beads: [-22, 0, 10, 22] },
    { y: -16, color: C.sky, beads: [-12, -2, 18, 28] },
  ];
  return (
    <g transform="rotate(-8)" style={SVG_ATTR_ORIGIN}>
      <rect x={-36} y={-52} width={72} height={50} rx={7} fill={C.wood} {...O} />
      <rect x={-30} y={-46} width={60} height={38} rx={4} fill={C.woodLight} stroke={INK} strokeWidth={2.2} />
      {rows.map((r) => (
        <g key={r.y}>
          <path d={`M-30 ${r.y} H30`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          {r.beads.map((bx) => (
            <ellipse key={bx} cx={bx} cy={r.y} rx={5.2} ry={5.6} fill={r.color} stroke={INK} strokeWidth={2.2} />
          ))}
        </g>
      ))}
      <path d="M-30 -22 H30" stroke={INK} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" opacity={0.35} />
      <Hl d="M-30 -48 H-6" w={2.8} o={0.7} />
      <Sparkle x={34} y={-54} size={7} color={C.honeySoft} delay={0.4} />
    </g>
  );
}

function OpBoba() {
  return (
    <g>
      <Duo d="M-1 -30 L12 -98" inner={C.peach} ow={7} iw={3.8} />
      <path d="M-17 -60 H17 L12 -4 Q0 2 -12 -4Z" fill={C.cream} fillOpacity={0.85} {...O3} />
      <path d="M-15 -46 Q0 -42 15 -46 L12.4 -5 Q0 0 -12.4 -5Z" fill={C.matchaSoft} />
      <path d="M-15 -46 Q0 -42 15 -46 L14.2 -34 Q0 -30 -14.2 -34Z" fill={C.cream} opacity={0.9} />
      <path d="M-15 -46 Q0 -41 15 -46" fill="none" stroke={C.matcha} strokeWidth={2.6} strokeLinecap="round" />
      <g fill={INK}>
        <circle cx={-7} cy={-8} r={3.4} />
        <circle cx={1} cy={-6} r={3.4} />
        <circle cx={8} cy={-9} r={3.4} />
        <circle cx={-3} cy={-14} r={3.4} />
        <circle cx={5} cy={-16} r={3.4} />
        <circle cx={-9} cy={-17} r={3.4} />
      </g>
      <path d="M-18 -60 Q0 -80 18 -60Z" fill={C.cream} {...O3} />
      <Hl d="M-12 -54 L-9 -22" w={3} o={0.75} />
      <Sparkle x={24} y={-60} size={6} color={C.matchaSoft} delay={0.5} />
    </g>
  );
}

function OpScepter() {
  return (
    <g transform="rotate(14)" style={SVG_ATTR_ORIGIN}>
      <Duo d="M0 0 V-92" inner={C.honey} ow={9.5} iw={5.6} />
      <ellipse cx={0} cy={-30} rx={7.4} ry={3.6} fill={C.honeySoft} {...O2} />
      <ellipse cx={0} cy={-60} rx={7.4} ry={3.6} fill={C.honeySoft} {...O2} />
      <path d="M-13 -92 L-18 -108 L-7 -99 L0 -114 L7 -99 L18 -108 L13 -92Z" fill={C.honey} {...O25} />
      <g transform="translate(0 -117)" style={SVG_ATTR_ORIGIN}>
        <Diamond s={17} />
      </g>
      <Sparkle x={20} y={-128} size={8} color={C.cream} delay={0} />
      <Sparkle x={-20} y={-108} size={6} color={C.skySoft} delay={0.8} />
    </g>
  );
}

/* ───────────────────────── Registri properti ───────────────────────── */

const PROPS: Record<string, PropSpec> = {
  prop_patched_cardboard: { kind: "seat", ...OP_SEAT_CARDBOARD },
  prop_fluffy_cushion: { kind: "seat", ...OP_SEAT_CUSHION },
  prop_abacus: { kind: "held", Item: OpAbacus },
  prop_matcha_boba: { kind: "held", Item: OpBoba },
  prop_skateboard: { kind: "seat", ...OP_SEAT_SKATE },
  prop_pastel_scooter: { kind: "seat", ...OP_SEAT_SCOOTER },
  prop_classic_car: { kind: "seat", ...OP_SEAT_CAR },
  prop_gem_scepter: { kind: "held", Item: OpScepter },
};

const OP_PROP_BOX: Record<string, string> = {
  prop_patched_cardboard: "70 306 260 110",
  prop_fluffy_cushion: "76 296 248 130",
  prop_abacus: "-52 -70 104 84",
  prop_matcha_boba: "-48 -108 96 118",
  prop_skateboard: "56 300 288 110",
  prop_pastel_scooter: "50 232 310 170",
  prop_classic_car: "10 246 380 150",
  prop_gem_scepter: "-40 -150 100 160",
};

/* ═════════════════════════════════════════════════════════════
 *  ITEM AURA & LATAR (slot "aura" dan "background")
 * ═════════════════════════════════════════════════════════════ */

/** Hash deterministik 0..1 (tanpa Math.random → aman untuk SSR). */
const abHash = (n: number): number => {
  let x = Math.imul(n + 1, 2654435761) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 2246822519) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  return (x % 1000) / 1000;
};

const abPolar = (cx: number, cy: number, r: number, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [Number(f2(cx + r * Math.cos(a))), Number(f2(cy + r * Math.sin(a)))];
};

const abArc = (cx: number, cy: number, r: number, a0: number, a1: number): string => {
  const [x0, y0] = abPolar(cx, cy, r, a0);
  const [x1, y1] = abPolar(cx, cy, r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

const AB = {
  leafA: "#8EE04A",
  leafB: "#58CC02",
  leafC: "#B6EE82",
  bubble: "#9ED8FF",
  heartA: "#FF8B7B",
  heartB: "#FFB5A8",
  heartC: "#FF6F91",
  hill1: "#C9EFA0",
  hill2: "#A9E46E",
  hill3: "#8EDB4F",
  grass: "#8EE04A",
  mint: "#CDEFE3",
  mintDark: "#9ADBC5",
  blush: "#FFE3DC",
  roomWall: "#FFF1D6",
  roomFloor: "#EBC08A",
  roomFloorDark: "#D9A467",
  cream2: "#FFF6E3",
  shelfBack: "#C99560",
  gold1: "#FFD84A",
  gold2: "#F2B800",
  vaultWall: "#FFEBAE",
  vaultSteel: "#D3E3EC",
  vaultSteelDark: "#9FB6C4",
} as const;

/* ───────────────────────── Komponen bersama ───────────────────────── */

function AbOrbit({
  cx,
  cy,
  r,
  dur,
  reverse = false,
  children,
}: {
  cx: number;
  cy: number;
  r: number;
  dur: number;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.g
      style={fb()}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
    >
      <circle cx={cx} cy={cy} r={r + 22} fill="none" stroke="none" pointerEvents="none" />
      {children}
    </motion.g>
  );
}

function AbOrbitItems({
  cx,
  cy,
  r,
  count,
  offset = 0,
  render,
}: {
  cx: number;
  cy: number;
  r: number;
  count: number;
  offset?: number;
  render: (i: number) => ReactNode;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const [x, y] = abPolar(cx, cy, r, offset + (360 / count) * i);
        return (
          <g key={i} transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
            {render(i)}
          </g>
        );
      })}
    </>
  );
}

function AbSpinCoin({ r = 11, delay = 0 }: { r?: number; delay?: number }) {
  return (
    <motion.g
      style={fb()}
      animate={{ scaleX: [1, 0.25, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <Coin r={r} />
    </motion.g>
  );
}

function AbGlow({ uid, cy, color, r, op }: { uid: string; cy: number; color: string; r: number; op: number }) {
  const gid = `${uid}-abglow`;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={op} />
          <stop offset="62%" stopColor={color} stopOpacity={op * 0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <motion.circle
        cx={200}
        cy={cy}
        r={r}
        fill={`url(#${gid})`}
        style={fb()}
        animate={{ scale: [0.95, 1.06, 0.95] }}
        transition={loop(3.6)}
      />
    </g>
  );
}

function AbCloud({
  x,
  y,
  s = 1,
  fill = C.cream,
  outline = true,
  drift = 0,
  dur = 14,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  outline?: boolean;
  drift?: number;
  dur?: number;
}) {
  const d =
    "M-44 12 Q-60 12 -60 -2 Q-60 -16 -44 -16 Q-42 -34 -22 -34 Q-12 -48 6 -42 Q22 -48 32 -32 Q54 -34 56 -14 Q66 -6 58 4 Q54 12 44 12Z";
  return (
    <motion.g
      animate={drift === 0 ? undefined : { x: [-drift, drift, -drift] }}
      transition={loop(dur)}
    >
      <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
        <path d={d} fill={fill} {...(outline ? O3 : {})} />
        <path d="M-40 4 Q-30 -2 -18 -2" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      </g>
    </motion.g>
  );
}

function AbMote({ x, y, r = 2.6, d = 0, color = C.honeySoft }: { x: number; y: number; r?: number; d?: number; color?: string }) {
  return (
    <motion.circle
      cx={x}
      cy={y}
      r={r}
      fill={color}
      animate={{ y: [0, -14, 0], x: [0, 6, 0], opacity: [0.2, 0.9, 0.2] }}
      transition={loop(3.6 + d, { delay: d })}
    />
  );
}

/* ═════════════════════════════════════════════════════════════
 *  AURA
 * ═════════════════════════════════════════════════════════════ */

const AB_LEAVES: { x: number; y: number; s: number; rot: number; col: string }[] = [
  { x: 70, y: 120, s: 1.2, rot: -30, col: AB.leafA },
  { x: 332, y: 142, s: 1, rot: 24, col: AB.leafB },
  { x: 92, y: 252, s: 0.9, rot: 50, col: AB.leafC },
  { x: 314, y: 268, s: 1.25, rot: -48, col: AB.leafA },
  { x: 150, y: 66, s: 0.9, rot: 16, col: AB.leafB },
  { x: 262, y: 82, s: 1.1, rot: -20, col: AB.leafC },
  { x: 46, y: 198, s: 1, rot: 70, col: AB.leafB },
  { x: 356, y: 216, s: 0.85, rot: -70, col: AB.leafC },
  { x: 118, y: 336, s: 1, rot: -10, col: AB.leafA },
  { x: 292, y: 338, s: 0.9, rot: 36, col: AB.leafB },
  { x: 204, y: 44, s: 0.8, rot: 0, col: AB.leafA },
  { x: 184, y: 112, s: 0.6, rot: 30, col: AB.leafC },
];

function AbLeafBit({ x, y, s, rot, col, d }: { x: number; y: number; s: number; rot: number; col: string; d: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={fb()}
        animate={{ y: [0, -12, 0], x: [0, 5, 0], rotate: [rot - 18, rot + 18, rot - 18] }}
        transition={loop(3.4 + (d % 5) * 0.4, { delay: d * 0.2 })}
      >
        <g transform={`scale(${s})`} style={SVG_ATTR_ORIGIN}>
          <path d="M0 -13 Q12 -3 0 13 Q-12 -3 0 -13Z" fill={col} {...O25} />
          <path d="M0 -9 V10" fill="none" stroke={C.matchaDark} strokeWidth={2} strokeLinecap="round" />
          <path d="M0 -2 L5 -6 M0 3 L-5 -1" fill="none" stroke={C.matchaDark} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      </motion.g>
    </g>
  );
}

function AbLeaves({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbGlow uid={uid} cy={cy} color="#8EE04A" r={150} op={0.3} />
      {AB_LEAVES.map((l, i) => (
        <AbLeafBit key={i} {...l} d={i} />
      ))}
      <Sparkle x={104} y={176} size={6} color={C.cream} delay={0.4} />
      <Sparkle x={298} y={196} size={6} color={C.matchaSoft} delay={1.1} />
    </g>
  );
}

const AB_BUBBLES: { x: number; y: number; r: number; d: number }[] = [
  { x: 80, y: 300, r: 17, d: 0 },
  { x: 322, y: 280, r: 21, d: 0.7 },
  { x: 60, y: 196, r: 12, d: 1.4 },
  { x: 346, y: 172, r: 14, d: 2.1 },
  { x: 120, y: 110, r: 20, d: 0.3 },
  { x: 282, y: 100, r: 13, d: 1.1 },
  { x: 214, y: 58, r: 16, d: 1.8 },
  { x: 150, y: 346, r: 11, d: 2.4 },
  { x: 266, y: 344, r: 14, d: 0.9 },
  { x: 40, y: 110, r: 10, d: 2.7 },
];

function AbBubble({ x, y, r, d }: { x: number; y: number; r: number; d: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={fb()}
        animate={{ y: [0, -52], opacity: [0, 1, 1, 0], scale: [0.85, 1.1] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeOut", delay: d }}
      >
        <circle r={r} fill={C.skySoft} fillOpacity={0.3} stroke={C.sky} strokeWidth={2.6} />
        <path d={`M${-r * 0.62} ${-r * 0.12} Q${-r * 0.5} ${-r * 0.62} ${-r * 0.08} ${-r * 0.72}`} fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" />
        <path d={`M${r * 0.5} ${r * 0.34} Q${r * 0.3} ${r * 0.66} ${-r * 0.06} ${r * 0.68}`} fill="none" stroke={C.peachSoft} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
        <path d={`M${r * 0.62} ${r * 0.04} Q${r * 0.66} ${r * 0.2} ${r * 0.58} ${r * 0.32}`} fill="none" stroke={C.taroSoft} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      </motion.g>
    </g>
  );
}

function AbBubbles({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbGlow uid={uid} cy={cy} color="#BDE7FF" r={150} op={0.4} />
      {AB_BUBBLES.map((b, i) => (
        <AbBubble key={i} {...b} />
      ))}
      <Sparkle x={96} y={232} size={6} color={C.cream} delay={0.2} />
      <Sparkle x={310} y={226} size={7} color={C.skySoft} delay={1} />
    </g>
  );
}

const AB_HEARTS: { x: number; y: number; s: number; col: string; d: number }[] = [
  { x: 78, y: 290, s: 1.1, col: AB.heartA, d: 0 },
  { x: 328, y: 270, s: 1.3, col: AB.heartB, d: 0.5 },
  { x: 54, y: 190, s: 0.8, col: AB.heartC, d: 1 },
  { x: 350, y: 170, s: 0.9, col: AB.heartA, d: 1.5 },
  { x: 116, y: 120, s: 1.2, col: AB.heartB, d: 2 },
  { x: 288, y: 108, s: 0.9, col: AB.heartC, d: 0.3 },
  { x: 206, y: 60, s: 1, col: AB.heartA, d: 1.2 },
  { x: 140, y: 340, s: 0.8, col: AB.heartB, d: 1.8 },
  { x: 270, y: 340, s: 1, col: AB.heartC, d: 2.3 },
];

function AbHeart({ x, y, s, col, d }: { x: number; y: number; s: number; col: string; d: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={fb()}
        animate={{ y: [0, -56], opacity: [0, 1, 1, 0], scale: [0.7, 1.15, 0.9], rotate: [-10, 10, -10] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeOut", delay: d }}
      >
        <g transform={`scale(${s})`} style={SVG_ATTR_ORIGIN}>
          <path d="M0 11 C-17 -1 -12 -16 -4 -15 Q0 -14 0 -9 Q0 -14 4 -15 C12 -16 17 -1 0 11Z" fill={col} {...O25} />
          <path d="M-9 -6 Q-8 -11 -4 -11" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.9} />
        </g>
      </motion.g>
    </g>
  );
}

function AbHearts({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbGlow uid={uid} cy={cy} color="#FFB5A8" r={152} op={0.42} />
      {AB_HEARTS.map((h, i) => (
        <AbHeart key={i} {...h} />
      ))}
      <Sparkle x={92} y={236} size={6} color={C.cream} delay={0.6} />
      <Sparkle x={314} y={224} size={6} color={C.honeySoft} delay={1.3} />
    </g>
  );
}

function AbStars({ cy, uid }: { cy: number; uid: string }) {
  const cx = 200;
  return (
    <g pointerEvents="none">
      <AbGlow uid={uid} cy={cy} color="#FFE27A" r={160} op={0.42} />
      <AbOrbit cx={cx} cy={cy} r={142} dur={26}>
        <circle cx={cx} cy={cy} r={142} fill="none" stroke={C.honeySoft} strokeWidth={2.4} strokeDasharray="3 11" strokeLinecap="round" opacity={0.8} />
        <AbOrbitItems
          cx={cx}
          cy={cy}
          r={142}
          count={5}
          offset={-80}
          render={(i) => <polygon points={starPoints(0, 0, 13, 5.8)} fill={i % 2 === 0 ? C.honey : C.honeySoft} {...O25} />}
        />
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={108} dur={34} reverse>
        <AbOrbitItems
          cx={cx}
          cy={cy}
          r={108}
          count={3}
          offset={20}
          render={(i) => <polygon points={starPoints(0, 0, 9, 4)} fill={i === 1 ? C.skySoft : C.cream} {...O2} />}
        />
      </AbOrbit>
      <Sparkle x={66} y={150} size={9} color={C.honey} delay={0} />
      <Sparkle x={338} y={170} size={9} color={C.cream} delay={0.7} />
      <Sparkle x={300} y={56} size={7} color={C.honeySoft} delay={1.3} />
      <Sparkle x={96} y={332} size={7} color={C.skySoft} delay={1.8} />
    </g>
  );
}

function AbCoins({ cy, uid }: { cy: number; uid: string }) {
  const cx = 200;
  return (
    <g pointerEvents="none">
      <AbGlow uid={uid} cy={cy} color="#FFC800" r={165} op={0.46} />
      <AbOrbit cx={cx} cy={cy} r={142} dur={24}>
        <circle cx={cx} cy={cy} r={142} fill="none" stroke={C.honey} strokeWidth={2.6} strokeDasharray="4 12" strokeLinecap="round" opacity={0.7} />
        <AbOrbitItems cx={cx} cy={cy} r={142} count={5} offset={-90} render={(i) => <AbSpinCoin r={12} delay={i * 0.3} />} />
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={106} dur={32} reverse>
        <AbOrbitItems cx={cx} cy={cy} r={106} count={3} offset={30} render={(i) => <AbSpinCoin r={8} delay={i * 0.5} />} />
      </AbOrbit>
      <Sparkle x={64} y={140} size={9} color={C.honey} delay={0} />
      <Sparkle x={338} y={158} size={9} color={C.cream} delay={0.6} />
      <Sparkle x={308} y={330} size={7} color={C.honeySoft} delay={1.2} />
      <Sparkle x={90} y={320} size={7} color={C.honey} delay={1.7} />
    </g>
  );
}

const AB_RAINBOW = [C.peach, C.honey, C.matchaSoft, C.sky, C.taro] as const;

function AbCosmic({ cy, uid }: { cy: number; uid: string }) {
  const cx = 200;
  return (
    <g pointerEvents="none">
      <AbGlow uid={uid} cy={cy} color="#E3B6FF" r={185} op={0.5} />
      <circle cx={cx} cy={cy} r={148} fill="none" stroke={C.cream} strokeWidth={2.6} strokeDasharray="2 10" strokeLinecap="round" opacity={0.85} />
      <AbOrbit cx={cx} cy={cy} r={140} dur={48}>
        {AB_RAINBOW.map((col, i) => (
          <path key={col} d={abArc(cx, cy, 140 - i * 8, -150, 110)} fill="none" stroke={col} strokeWidth={7.5} strokeLinecap="round" opacity={0.85} />
        ))}
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={100} dur={28} reverse>
        <AbOrbitItems cx={cx} cy={cy} r={100} count={4} offset={-45} render={() => <Diamond s={10} />} />
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={84} dur={36}>
        <AbOrbitItems
          cx={cx}
          cy={cy}
          r={84}
          count={3}
          offset={30}
          render={(i) => <polygon points={starPoints(0, 0, 9, 4)} fill={i % 2 === 0 ? C.honey : C.cream} {...O2} />}
        />
      </AbOrbit>
      <Sparkle x={52} y={110} size={10} color={C.cream} delay={0} />
      <Sparkle x={350} y={132} size={10} color={C.skySoft} delay={0.6} />
      <Sparkle x={330} y={52} size={7} color={C.honeySoft} delay={1.1} />
      <Sparkle x={70} y={50} size={7} color={C.taroSoft} delay={1.6} />
      <Sparkle x={348} y={300} size={8} color={C.peachSoft} delay={2} />
    </g>
  );
}

function AuraItem({ id, cy, uid }: { id: string; cy: number; uid: string }): ReactElement | null {
  switch (id) {
    case "aura_floating_leaves":
      return <AbLeaves cy={cy} uid={uid} />;
    case "aura_soap_bubbles":
      return <AbBubbles cy={cy} uid={uid} />;
    case "aura_pink_hearts":
      return <AbHearts cy={cy} uid={uid} />;
    case "aura_sparkle_stars":
      return <AbStars cy={cy} uid={uid} />;
    case "aura_gold_coins":
      return <AbCoins cy={cy} uid={uid} />;
    case "aura_cosmic_rainbow":
      return <AbCosmic cy={cy} uid={uid} />;
    default:
      return null;
  }
}

/* ═════════════════════════════════════════════════════════════
 *  LATAR
 * ═════════════════════════════════════════════════════════════ */

const abThin = { stroke: INK, strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/* ───────────────────────── Kamar Polos Hangat ───────────────────────── */

function AbWarmRoom({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8E8" />
          <stop offset="100%" stopColor="#FFE9C4" />
        </linearGradient>
        <radialGradient id={`${uid}-lamp`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE27A" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#FFE27A" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BDE7FF" />
          <stop offset="100%" stopColor="#E8F6FF" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-wall)`} />
      <g opacity={0.35} fill="#FFE2B0">
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={i * 40 + 18} y={0} width={14} height={336} />
        ))}
      </g>

      {/* lantai kayu */}
      <rect x={0} y={338} width={400} height={72} fill={AB.roomFloor} />
      <g stroke={AB.roomFloorDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.75}>
        <path d="M0 362 H400 M0 386 H400" />
        <path d="M60 338 V362 M170 338 V362 M290 338 V362 M350 338 V362 M30 362 V386 M120 362 V386 M240 362 V386 M330 362 V386 M80 386 V410 M200 386 V410 M310 386 V410 M390 386 V410" />
      </g>
      <rect x={-4} y={328} width={408} height={12} fill={C.woodLight} stroke={INK} strokeWidth={2.6} />

      {/* karpet lembut */}
      <ellipse cx={200} cy={376} rx={150} ry={17} fill={C.taroSoft} opacity={0.5} />

      {/* berkas cahaya jendela */}
      <motion.polygon
        points="32,176 112,176 270,338 160,338"
        fill={C.honeySoft}
        animate={{ opacity: [0.12, 0.2, 0.12] }}
        transition={loop(4.4)}
      />

      {/* jendela + tirai */}
      <rect x={30} y={56} width={84} height={118} rx={8} fill={`url(#${uid}-sky)`} {...O} />
      <path d="M72 56 V174 M30 114 H114" fill="none" {...O25} />
      <g transform="translate(52 88)" style={SVG_ATTR_ORIGIN}>
        <path d="M0 8 Q-8 8 -8 2 Q-8 -4 0 -4 Q2 -12 10 -10 Q16 -14 20 -6 Q28 -4 26 4 Q24 8 18 8Z" fill={C.cream} {...abThin} />
      </g>
      <rect x={24} y={170} width={96} height={10} rx={4} fill={C.woodLight} {...O3} />
      <path d="M22 48 H58 Q50 110 58 176 H22Z" fill={C.peachSoft} {...O3} />
      <path d="M122 48 H86 Q94 110 86 176 H122Z" fill={C.peachSoft} {...O3} />
      <path d="M32 60 Q34 110 32 160 M112 60 Q110 110 112 160" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <rect x={16} y={44} width={112} height={9} rx={4.5} fill={C.honey} {...O3} />

      {/* pigura */}
      <rect x={290} y={70} width={84} height={66} rx={6} fill={C.woodLight} {...O} />
      <rect x={298} y={78} width={68} height={50} rx={3} fill={C.skySoft} stroke={INK} strokeWidth={2.4} />
      <path d="M298 128 V112 Q316 98 332 112 Q348 100 366 112 V128Z" fill={C.matchaSoft} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <circle cx={350} cy={94} r={7} fill={C.honey} {...abThin} />

      {/* lampu berdiri */}
      <circle cx={354} cy={196} r={96} fill={`url(#${uid}-lamp)`} />
      <path d="M354 224 V322" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M354 224 V322" stroke={C.honeyDark} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={354} cy={324} rx={22} ry={7} fill={C.honeyDark} {...O3} />
      <path d="M332 224 L340 180 H368 L376 224Z" fill={C.honeySoft} {...O} />
      <path d="M342 214 L346 188" fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.85} />

      {/* tanaman */}
      <motion.g style={fb(0.5, 1)} animate={{ rotate: [-2.5, 2.5, -2.5] }} transition={loop(4.6)}>
        <path d="M46 296 Q24 262 34 226 Q56 258 46 296Z" fill={C.matcha} {...O3} />
        <path d="M46 296 Q68 264 62 222 Q40 252 46 296Z" fill={C.matchaSoft} {...O3} />
        <path d="M46 296 Q44 262 50 206 Q70 248 46 296Z" fill={C.matcha} {...O3} />
        <path d="M46 296 Q46 260 49 212" fill="none" stroke={C.matchaDark} strokeWidth={2.4} strokeLinecap="round" />
      </motion.g>
      <path d="M22 296 H70 L64 330 H28Z" fill={C.peach} {...O} />
      <rect x={18} y={288} width={56} height={13} rx={5} fill={C.peachDark} {...O3} />

      {/* debu cahaya */}
      <AbMote x={74} y={200} d={0} />
      <AbMote x={110} y={246} d={0.8} r={2} />
      <AbMote x={150} y={296} d={1.6} />
      <AbMote x={310} y={230} d={1.1} r={2} />
    </g>
  );
}

/* ───────────────────────── Taman Piknik ───────────────────────── */

function AbButterfly({ x, y, color, d }: { x: number; y: number; color: string; d: number }) {
  return (
    <motion.g
      animate={{ x: [0, 34, 10, -20, 0], y: [0, -16, -34, -14, 0] }}
      transition={loop(9, { delay: d })}
    >
      <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
        <motion.g style={fb()} animate={{ scaleX: [1, 0.35, 1] }} transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M0 0 Q-12 -14 -14 -3 Q-12 8 0 3Z" fill={color} {...abThin} strokeWidth={2} />
          <path d="M0 0 Q12 -14 14 -3 Q12 8 0 3Z" fill={color} {...abThin} strokeWidth={2} />
        </motion.g>
        <path d="M0 -3 V5" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      </g>
    </motion.g>
  );
}

function AbDaisy({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <g fill={C.cream} stroke={INK} strokeWidth={1.6}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={0} cy={-5.4} rx={3.2} ry={4.6} transform={`rotate(${a})`} style={SVG_ATTR_ORIGIN} />
        ))}
      </g>
      <circle r={3} fill={C.honey} stroke={INK} strokeWidth={1.6} />
    </g>
  );
}

function AbPicnic({ uid }: { uid: string }) {
  const bl = `${uid}-blanket`;
  const cols = 9;
  const rows = 3;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-psky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ADCFF" />
          <stop offset="100%" stopColor="#F2FBFF" />
        </linearGradient>
        <linearGradient id={`${uid}-pgrass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A9E46E" />
          <stop offset="100%" stopColor="#7DD14A" />
        </linearGradient>
        <clipPath id={bl}>
          <path d="M70 366 L104 342 H296 L330 366 Q334 392 312 398 H88 Q66 392 70 366Z" />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-psky)`} />

      {/* matahari */}
      <motion.circle cx={64} cy={64} r={44} fill={C.honeySoft} opacity={0.5} style={fb()} animate={{ scale: [0.94, 1.08, 0.94] }} transition={loop(4)} />
      <circle cx={64} cy={64} r={24} fill={C.honey} {...O3} />
      <Hl d="M52 56 Q56 48 66 46" w={3} o={0.85} />

      {/* awan */}
      <AbCloud x={190} y={72} s={0.8} drift={22} dur={16} />
      <AbCloud x={320} y={118} s={0.6} drift={16} dur={13} outline />
      <AbCloud x={110} y={156} s={0.5} drift={12} dur={11} fill={C.cream} />

      {/* bukit */}
      <path d="M0 250 Q70 196 150 238 Q230 190 310 232 Q360 212 400 236 V340 H0Z" fill={AB.hill1} />
      <path d="M0 292 Q90 236 190 280 Q290 232 400 284 V350 H0Z" fill={AB.hill2} />
      <rect x={0} y={330} width={400} height={80} fill={`url(#${uid}-pgrass)`} />
      <path d="M0 330 Q100 322 200 330 T400 328" fill="none" stroke={C.matchaDark} strokeWidth={2.6} strokeLinecap="round" opacity={0.6} />

      {/* pohon */}
      <path d="M346 332 Q352 270 348 214 H368 Q366 270 372 332Z" fill={C.woodDark} {...O3} />
      <circle cx={338} cy={196} r={32} fill={C.matcha} {...O} />
      <circle cx={376} cy={190} r={28} fill={C.matcha} {...O} />
      <circle cx={356} cy={160} r={34} fill={C.matchaSoft} {...O} />
      <circle cx={356} cy={168} r={22} fill={C.matcha} />
      <g fill={C.peach} stroke={INK} strokeWidth={2}>
        <circle cx={338} cy={200} r={5} />
        <circle cx={370} cy={176} r={5} />
        <circle cx={360} cy={206} r={5} />
        <circle cx={346} cy={160} r={5} />
      </g>
      <Hl d="M326 180 Q332 168 346 164" w={3.2} o={0.6} />

      {/* tikar piknik */}
      <path d="M70 366 L104 342 H296 L330 366 Q334 392 312 398 H88 Q66 392 70 366Z" fill={C.cream} />
      <g clipPath={`url(#${bl})`}>
        {Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((__, c) =>
            (r + c) % 2 === 0 ? (
              <rect key={`${r}-${c}`} x={62 + c * 30} y={340 + r * 20} width={30} height={20} fill={C.peachSoft} />
            ) : null,
          ),
        )}
      </g>
      <path d="M70 366 L104 342 H296 L330 366 Q334 392 312 398 H88 Q66 392 70 366Z" fill="none" {...O3} />

      {/* keranjang */}
      <path d="M300 342 Q304 316 322 316 Q340 316 344 342Z" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M292 342 H352 L346 372 Q344 378 336 378 H308 Q300 378 298 372Z" fill={C.woodLight} {...O3} />
      <path d="M296 352 H348 M298 362 H346" fill="none" stroke={C.woodDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
      <path d="M306 342 L312 330 L322 340 L330 328 L338 342Z" fill={C.peachSoft} {...abThin} strokeWidth={2.2} />

      {/* bunga */}
      <AbDaisy x={30} y={350} s={1.2} />
      <AbDaisy x={60} y={384} s={1} />
      <AbDaisy x={20} y={394} s={0.8} />
      <AbDaisy x={372} y={392} s={1.1} />
      <AbDaisy x={346} y={396} s={0.8} />
      <AbDaisy x={210} y={404} s={0.8} />

      <AbButterfly x={92} y={286} color={C.taroSoft} d={0} />
      <AbButterfly x={290} y={270} color={C.honeySoft} d={2.4} />
    </g>
  );
}

/* ───────────────────────── Kafe Pastel ───────────────────────── */

function AbCup({ x, y, color = C.cream, s = 1 }: { x: number; y: number; color?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M12 -10 Q24 -10 24 0 Q24 10 10 10" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M12 -10 Q24 -10 24 0 Q24 10 10 10" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-14 -14 H14 V4 Q14 14 4 14 H-4 Q-14 14 -14 4Z" fill={color} {...abThin} />
      <path d="M-14 -4 H14" stroke={C.peachSoft} strokeWidth={4} />
    </g>
  );
}

function AbCafe({ uid }: { uid: string }) {
  const tiles: ReactNode[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 === 0) tiles.push(<rect key={`${r}-${c}`} x={c * 40} y={250 + r * 18} width={40} height={18} fill={AB.mintDark} opacity={0.35} />);
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-cwall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9E3" />
          <stop offset="100%" stopColor="#FFD9D0" />
        </linearGradient>
        <radialGradient id={`${uid}-clamp`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE27A" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#FFE27A" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-cwall)`} />

      {/* dinding ubin mint */}
      <rect x={0} y={250} width={400} height={116} fill={AB.mint} />
      {tiles}
      <path d="M0 250 H400" stroke={INK} strokeWidth={3} />
      <rect x={0} y={244} width={400} height={8} fill={C.cream} stroke={INK} strokeWidth={2.6} />

      {/* lantai papan catur */}
      <rect x={0} y={366} width={400} height={44} fill={C.cream} />
      {Array.from({ length: 10 }).flatMap((_, c) =>
        [0, 1].map((r) =>
          (c + r) % 2 === 0 ? <rect key={`${c}-${r}`} x={c * 40} y={366 + r * 22} width={40} height={22} fill={C.peachSoft} opacity={0.6} /> : null,
        ),
      )}
      <path d="M0 366 H400" stroke={INK} strokeWidth={3} />

      {/* papan menu */}
      <rect x={26} y={84} width={108} height={96} rx={8} fill="#5B4E44" {...O} />
      <rect x={34} y={92} width={92} height={80} rx={4} fill="#6E5F54" />
      <g stroke={C.cream} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.92}>
        <path d="M46 110 H78 M46 122 H70" />
        <path d="M92 104 H112 V118 Q112 126 104 126 H100 Q92 126 92 118Z" />
        <path d="M112 108 Q120 108 120 114 Q120 120 112 120" />
        <path d="M98 98 Q101 94 98 90 M106 98 Q109 94 106 90" stroke={C.skySoft} />
        <path d="M60 150 C50 142 52 134 57 134 Q60 134 60 138 Q60 134 63 134 C68 134 70 142 60 150Z" stroke={C.peachSoft} />
        <path d="M84 150 H114 M84 160 H106" />
      </g>

      {/* rak cangkir */}
      <rect x={290} y={126} width={90} height={9} rx={3} fill={C.woodLight} {...O3} />
      <AbCup x={312} y={116} color={C.skySoft} s={0.7} />
      <AbCup x={344} y={116} color={C.taroSoft} s={0.7} />
      <AbCup x={372} y={116} color={C.honeySoft} s={0.7} />

      {/* lampu gantung */}
      {[68, 332].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={96} r={64} fill={`url(#${uid}-clamp)`} />
          <path d={`M${x} 0 V54`} stroke={INK} strokeWidth={3.4} />
          <motion.g style={fb(0.5, 0)} animate={{ rotate: [-2, 2, -2] }} transition={loop(3.6, { delay: i * 0.9 })}>
            <path d={`M${x - 22} 80 Q${x - 22} 52 ${x} 52 Q${x + 22} 52 ${x + 22} 80Z`} fill={i === 0 ? C.peach : C.taro} {...O} />
            <path d={`M${x - 14} 74 Q${x - 14} 60 ${x - 4} 58`} fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
            <ellipse cx={x} cy={82} rx={10} ry={5} fill={C.honeySoft} {...O25} />
          </motion.g>
        </g>
      ))}

      {/* meja kasir */}
      <path d="M300 366 V282 Q300 274 308 274 H392 Q400 274 400 282 V366Z" fill={C.woodLight} {...O} />
      <rect x={294} y={262} width={112} height={16} rx={5} fill={C.honey} {...O} />
      <Hl d="M304 268 H340" w={3} o={0.7} />
      <AbCup x={332} y={248} color={C.cream} s={0.9} />
      <g transform="translate(372 242)" style={SVG_ATTR_ORIGIN}>
        <path d="M-18 14 V6 Q-18 -10 0 -10 Q18 -10 18 6 V14Z" fill={C.skySoft} fillOpacity={0.55} {...abThin} />
        <ellipse cx={0} cy={14} rx={22} ry={4} fill={C.cream} {...abThin} />
        <circle cx={-6} cy={6} r={5} fill={C.peachSoft} {...abThin} strokeWidth={2} />
        <circle cx={6} cy={4} r={5} fill={C.taroSoft} {...abThin} strokeWidth={2} />
        <circle cx={0} cy={-13} r={2.6} fill={C.peach} />
      </g>
      <path d="M312 300 H388 M312 322 H388" stroke={C.woodDark} strokeWidth={2.6} strokeLinecap="round" opacity={0.6} />

      {/* uap kopi */}
      <g fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.9}>
        {[0, 1].map((i) => (
          <motion.path
            key={i}
            d={`M${326 + i * 10} 232 q-5 -8 0 -16 q5 -8 0 -16`}
            animate={{ y: [4, -10], opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: i * 0.9 }}
          />
        ))}
      </g>
      <AbMote x={150} y={150} d={0.4} color={C.cream} />
      <AbMote x={250} y={190} d={1.2} color={C.cream} r={2} />
    </g>
  );
}

/* ───────────────────────── Perpustakaan Kayu ───────────────────────── */

const AB_BOOK_COLS = [C.peach, C.sky, C.matcha, C.taro, C.honey, C.peachSoft, C.skySoft, C.matchaSoft, C.taroSoft] as const;

function AbBookRow({ x, y, w, seed }: { x: number; y: number; w: number; seed: number }) {
  const books: ReactNode[] = [];
  let cx = x;
  let i = 0;
  while (cx < x + w - 8) {
    const bw = 12 + Math.floor(abHash(seed + i * 3) * 8);
    const bh = 28 + Math.floor(abHash(seed + i * 7 + 1) * 16);
    const col = AB_BOOK_COLS[Math.floor(abHash(seed + i * 11 + 2) * AB_BOOK_COLS.length)];
    const lean = i % 7 === 5;
    if (cx + bw > x + w) break;
    books.push(
      <g key={i} transform={lean ? `rotate(-9 ${cx + bw} ${y})` : undefined} style={SVG_ATTR_ORIGIN}>
        <rect x={cx} y={y - bh} width={bw} height={bh} rx={2} fill={col} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        <path d={`M${cx + 2} ${y - bh + 6} H${cx + bw - 2} M${cx + 2} ${y - 7} H${cx + bw - 2}`} stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" opacity={0.75} />
      </g>,
    );
    cx += bw + 2;
    i += 1;
  }
  return <g>{books}</g>;
}

function AbShelf({ x, y, w, h, rows, seed }: { x: number; y: number; w: number; h: number; rows: number; seed: number }) {
  const rh = (h - 16) / rows;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={C.woodLight} {...O} />
      <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} rx={2} fill={AB.shelfBack} stroke={INK} strokeWidth={2.4} />
      {Array.from({ length: rows }).map((_, r) => {
        const by = y + 8 + (r + 1) * rh;
        return (
          <g key={r}>
            <AbBookRow x={x + 10} y={by - 4} w={w - 20} seed={seed + r * 19} />
            <rect x={x + 8} y={by - 4} width={w - 16} height={5} fill={C.wood} stroke={INK} strokeWidth={2.2} />
          </g>
        );
      })}
    </g>
  );
}

function AbLibrary({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-lwall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F6DEB8" />
          <stop offset="100%" stopColor="#EFCB9A" />
        </linearGradient>
        <radialGradient id={`${uid}-llamp`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE27A" stopOpacity={0.62} />
          <stop offset="100%" stopColor="#FFE27A" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-lwall)`} />
      <g opacity={0.3} fill="#E3B987">
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={110 + i * 34} y={0} width={12} height={340} />
        ))}
      </g>

      {/* lantai */}
      <rect x={0} y={346} width={400} height={64} fill={AB.roomFloor} />
      <g stroke={AB.roomFloorDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.7}>
        <path d="M0 372 H400 M0 394 H400 M70 346 V372 M200 346 V372 M330 346 V372 M20 372 V394 M140 372 V394 M270 372 V394 M380 372 V394" />
      </g>
      <rect x={-4} y={338} width={408} height={10} fill={C.woodLight} stroke={INK} strokeWidth={2.6} />

      {/* rak buku kiri & kanan */}
      <AbShelf x={-6} y={46} w={98} h={296} rows={5} seed={3} />
      <AbShelf x={308} y={46} w={98} h={296} rows={5} seed={41} />

      {/* tangga */}
      <g>
        <path d="M284 340 L304 70" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d="M284 340 L304 70" stroke={C.woodDark} strokeWidth={5} strokeLinecap="round" />
        <path d="M322 340 L330 70" stroke={INK} strokeWidth={9} strokeLinecap="round" opacity={0} />
        {[110, 160, 210, 260, 310].map((yy) => {
          const t = (340 - yy) / 270;
          const x1 = 284 + 20 * t;
          return <path key={yy} d={`M${x1} ${yy} H${x1 + 24}`} stroke={INK} strokeWidth={8} strokeLinecap="round" />;
        })}
        {[110, 160, 210, 260, 310].map((yy) => {
          const t = (340 - yy) / 270;
          const x1 = 284 + 20 * t;
          return <path key={`i${yy}`} d={`M${x1} ${yy} H${x1 + 24}`} stroke={C.woodLight} strokeWidth={4} strokeLinecap="round" />;
        })}
        <path d="M308 340 L326 70" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d="M308 340 L326 70" stroke={C.wood} strokeWidth={5} strokeLinecap="round" />
      </g>

      {/* lampu gantung baca */}
      <circle cx={200} cy={78} r={80} fill={`url(#${uid}-llamp)`} />
      <path d="M200 0 V40" stroke={INK} strokeWidth={3.4} />
      <motion.g style={fb(0.5, 0)} animate={{ rotate: [-1.6, 1.6, -1.6] }} transition={loop(4)}>
        <path d="M168 66 Q172 38 200 38 Q228 38 232 66Z" fill={C.matcha} {...O} />
        <path d="M178 60 Q180 48 192 44" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <rect x={166} y={64} width={68} height={7} rx={3.5} fill={C.honey} {...O3} />
        <ellipse cx={200} cy={76} rx={11} ry={5} fill={C.honeySoft} {...O25} />
      </motion.g>

      {/* karpet */}
      <ellipse cx={200} cy={380} rx={156} ry={20} fill={C.peach} opacity={0.55} />
      <ellipse cx={200} cy={380} rx={156} ry={20} fill="none" stroke={INK} strokeWidth={2.6} opacity={0.35} />

      <AbMote x={150} y={150} d={0.2} />
      <AbMote x={250} y={214} d={1.4} r={2} />
      <AbMote x={178} y={282} d={2.2} />
    </g>
  );
}

/* ───────────────────────── Ruang Brankas Emas ───────────────────────── */

function AbGoldBar({ x, y, w = 40, h = 16 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <path d={`M${x + 6} ${y} H${x + w - 6} L${x + w} ${y + h} H${x} Z`} fill={AB.gold1} {...O25} />
      <path d={`M${x + 10} ${y + 4} H${x + w - 14}`} fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.85} />
      <path d={`M${x + 4} ${y + h - 4} H${x + w - 4}`} fill="none" stroke={AB.gold2} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

function AbVault({ uid }: { uid: string }) {
  const cx = 200;
  const cy = 190;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-vwall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3C9" />
          <stop offset="100%" stopColor="#FFE08A" />
        </linearGradient>
        <radialGradient id={`${uid}-vlight`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFDF0" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#FFE27A" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-vwall)`} />
      <motion.circle
        cx={cx}
        cy={cy}
        r={200}
        fill={`url(#${uid}-vlight)`}
        style={fb()}
        animate={{ scale: [0.96, 1.05, 0.96] }}
        transition={loop(4)}
      />

      {/* pintu brankas */}
      <circle cx={cx} cy={cy} r={150} fill={AB.vaultSteelDark} {...O} />
      <circle cx={cx} cy={cy} r={136} fill={AB.vaultSteel} stroke={INK} strokeWidth={2.6} />
      <circle cx={cx} cy={cy} r={104} fill="#E4EEF4" stroke={INK} strokeWidth={2.6} />
      {Array.from({ length: 12 }).map((_, i) => {
        const [bx, by] = abPolar(cx, cy, 120, i * 30);
        return <circle key={i} cx={bx} cy={by} r={5.4} fill={AB.vaultSteelDark} stroke={INK} strokeWidth={2.2} />;
      })}
      <g stroke={INK} strokeWidth={9} strokeLinecap="round" opacity={0.9}>
        <path d={`M${cx - 70} ${cy} H${cx + 70} M${cx} ${cy - 70} V${cy + 70} M${cx - 50} ${cy - 50} L${cx + 50} ${cy + 50} M${cx + 50} ${cy - 50} L${cx - 50} ${cy + 50}`} />
      </g>
      <g stroke={AB.vaultSteelDark} strokeWidth={4.6} strokeLinecap="round">
        <path d={`M${cx - 70} ${cy} H${cx + 70} M${cx} ${cy - 70} V${cy + 70} M${cx - 50} ${cy - 50} L${cx + 50} ${cy + 50} M${cx + 50} ${cy - 50} L${cx - 50} ${cy + 50}`} />
      </g>
      <circle cx={cx} cy={cy} r={26} fill={C.honey} {...O} />
      <circle cx={cx} cy={cy} r={12} fill={C.honeySoft} stroke={INK} strokeWidth={2.4} />
      <Hl d={`M${cx - 112} ${cy - 40} Q${cx - 96} ${cy - 78} ${cx - 60} ${cy - 96}`} w={5} o={0.55} />

      {/* lantai emas */}
      <rect x={0} y={366} width={400} height={44} fill="#F6CF55" />
      <path d="M0 366 H400" stroke={INK} strokeWidth={3} />
      <g stroke="#E5A400" strokeWidth={2.4} strokeLinecap="round" opacity={0.7}>
        <path d="M0 388 H400 M60 366 V388 M180 366 V388 M290 366 V388 M360 366 V388 M30 388 V410 M130 388 V410 M240 388 V410 M340 388 V410" />
      </g>

      {/* batangan emas & koin — kiri */}
      <AbGoldBar x={14} y={350} />
      <AbGoldBar x={58} y={350} />
      <AbGoldBar x={36} y={334} />
      <AbGoldBar x={36} y={318} w={36} h={15} />
      <CoinStack x={96} y={366} n={4} />
      <CoinStack x={116} y={372} n={2} rx={12} />

      {/* kanan */}
      <AbGoldBar x={346} y={350} />
      <AbGoldBar x={302} y={350} />
      <AbGoldBar x={324} y={334} />
      <CoinStack x={284} y={366} n={3} />
      <CoinStack x={268} y={374} n={2} rx={12} />
      <g transform="translate(378 322)" style={SVG_ATTR_ORIGIN}>
        <Coin r={10} />
      </g>

      <Sparkle x={52} y={296} size={9} color={C.cream} delay={0} />
      <Sparkle x={350} y={298} size={9} color={C.cream} delay={0.8} />
      <Sparkle x={92} y={112} size={7} color={C.honey} delay={1.4} />
      <Sparkle x={316} y={96} size={7} color={C.cream} delay={0.4} />
      <AbMote x={70} y={220} d={0.3} />
      <AbMote x={330} y={236} d={1.2} />
    </g>
  );
}

/* ───────────────────────── Istana Awan Pelangi ───────────────────────── */

function AbTower({
  x,
  base,
  w,
  h,
  roof,
  flag,
  d,
}: {
  x: number;
  base: number;
  w: number;
  h: number;
  roof: string;
  flag: string;
  d: number;
}) {
  const top = base - h;
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} fill={C.honeySoft} {...O} />
      <path d={`M${x + 4} ${top + 6} V${base - 6}`} stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <rect x={x - 4} y={top - 6} width={w + 8} height={9} rx={3} fill={C.honey} {...O3} />
      <path d={`M${x - 6} ${top - 6} L${cx} ${top - 6 - w * 0.95} L${x + w + 6} ${top - 6}Z`} fill={roof} {...O} />
      <path d={`M${cx - w * 0.2} ${top - 12} L${cx - 2} ${top - 6 - w * 0.78}`} stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} fill="none" />
      <path d={`M${cx} ${top - 6 - w * 0.95} V${top - 6 - w * 0.95 - 22}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <motion.g style={fb(0, 0.5)} animate={{ rotate: [-8, 8, -8], scaleX: [1, 0.85, 1] }} transition={loop(1.8, { delay: d })}>
        <path d={`M${cx} ${top - 6 - w * 0.95 - 22} L${cx + 20} ${top - 6 - w * 0.95 - 16} L${cx} ${top - 6 - w * 0.95 - 8}Z`} fill={flag} {...abThin} strokeWidth={2.2} />
      </motion.g>
      <path d={`M${cx - 7} ${base} V${base - 26} Q${cx} ${base - 38} ${cx + 7} ${base - 26} V${base}Z`} fill={C.skySoft} {...abThin} strokeWidth={2.2} />
      <path d={`M${cx - 6} ${top + 22} V${top + 8} Q${cx} ${top + 0} ${cx + 6} ${top + 8} V${top + 22}Z`} fill={C.skySoft} {...abThin} strokeWidth={2.2} />
    </g>
  );
}

function AbPalace({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-psk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B8E3FF" />
          <stop offset="55%" stopColor="#E3D2FF" />
          <stop offset="100%" stopColor="#FFE0E6" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-psk)`} />

      {/* pelangi besar di belakang */}
      <g fill="none" strokeLinecap="butt" opacity={0.65}>
        {AB_RAINBOW.map((col, i) => (
          <path key={col} d={`M-40 342 A240 240 0 0 1 440 342`} stroke={col} strokeWidth={12} transform={`translate(0 ${i * 12 - 4}) scale(1 1)`} style={SVG_ATTR_ORIGIN} />
        ))}
      </g>

      {/* istana */}
      <AbTower x={22} base={340} w={52} h={150} roof={C.peach} flag={C.peach} d={0} />
      <AbTower x={86} base={340} w={40} h={106} roof={C.taro} flag={C.taro} d={0.5} />
      <AbTower x={326} base={340} w={52} h={158} roof={C.taro} flag={C.honey} d={0.3} />
      <AbTower x={274} base={340} w={40} h={112} roof={C.peach} flag={C.peach} d={0.8} />
      <path d="M126 340 V270 H150 V340 M250 340 V270 H274 V340" fill={C.honeySoft} {...O3} />

      {/* awan melayang */}
      <AbCloud x={80} y={98} s={0.7} drift={16} dur={14} fill={C.cream} />
      <AbCloud x={320} y={80} s={0.55} drift={14} dur={12} fill={C.cream} />
      <AbCloud x={200} y={50} s={0.45} drift={10} dur={10} fill={C.cream} />

      {/* lantai awan */}
      <g>
        <rect x={0} y={366} width={400} height={44} fill={C.cream} />
        <path d="M-10 366 Q10 336 40 352 Q64 326 98 348 Q126 330 160 350 Q190 330 222 350 Q254 328 288 350 Q316 330 346 350 Q374 334 410 360 V372 H-10Z" fill={C.cream} {...O3} />
        <path d="M30 372 Q60 380 96 372 M180 374 Q220 384 262 374 M300 372 Q330 380 372 372" fill="none" stroke={C.skySoft} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      </g>
      <Sparkle x={150} y={92} size={7} color={C.cream} delay={0.3} />
      <Sparkle x={260} y={150} size={8} color={C.honeySoft} delay={1} />
      <Sparkle x={56} y={200} size={7} color={C.cream} delay={1.6} />
    </g>
  );
}

function BackgroundItem({ id, uid }: { id: string; uid: string }): ReactElement | null {
  switch (id) {
    case "bg_warm_room":
      return <AbWarmRoom uid={uid} />;
    case "bg_picnic_park":
      return <AbPicnic uid={uid} />;
    case "bg_pastel_cafe":
      return <AbCafe uid={uid} />;
    case "bg_wood_library":
      return <AbLibrary uid={uid} />;
    case "bg_gold_vault":
      return <AbVault uid={uid} />;
    case "bg_cloud_palace":
      return <AbPalace uid={uid} />;
    default:
      return null;
  }
}
/* ═════════════════════════════════════════════════════════════
 *  ITEM KOSMETIK: 14 GAYA RAMBUT (Front + Back)
 *  Koordinat lokal: (0,0) = tengah pangkal rambut di ubun-ubun, tumbuh ke -y.
 * ═════════════════════════════════════════════════════════════ */

interface HaPalette {
  b: string; // dasar
  s: string; // bayangan
  l: string; // terang
}

const HA_BROWN: HaPalette = { b: "#5B3A2A", s: "#3F271C", l: "#8A5C43" };
const HA_PINKBROWN: HaPalette = { b: "#C9788A", s: "#A65A6E", l: "#E7A2B0" };
const HA_BLACK: HaPalette = { b: "#34303A", s: "#211E27", l: "#6A6377" };
const HA_ORANGE: HaPalette = { b: "#E8802F", s: "#BC5C1B", l: "#F7AB5E" };
const HA_BLONDE: HaPalette = { b: "#F2C45A", s: "#D79F32", l: "#FFE49A" };
const HA_AUBURN: HaPalette = { b: "#A8503A", s: "#80362A", l: "#D07C5C" };
const HA_NAVY: HaPalette = { b: "#41507A", s: "#2C3759", l: "#6F82B5" };
const HA_LAVENDER: HaPalette = { b: "#B792E8", s: "#9168CB", l: "#D8BEF7" };
const HA_CHESTNUT: HaPalette = { b: "#8A5A3B", s: "#66402A", l: "#B07C57" };
const HA_PLUM: HaPalette = { b: "#3B2C46", s: "#271D31", l: "#6E5A82" };
const HA_TEAL: HaPalette = { b: "#34CDBE", s: "#1FA395", l: "#8BF0E3" };
const HA_GINGER: HaPalette = { b: "#E58F55", s: "#C4703A", l: "#F8BB8C" };
const HA_COCOA: HaPalette = { b: "#4A2F2A", s: "#33201C", l: "#7A524A" };

/** Garis helai tipis berwarna bayangan. */
function HaStrands({ d, c, w = 2.4, o = 0.55 }: { d: string; c: string; w?: number; o?: number }) {
  return <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={o} />;
}

/** Jepit rambut kecil (batang honey + bintang). */
function HaClip({ x, y, rot = -24 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} style={SVG_ATTR_ORIGIN}>
      <rect x={-13} y={-4.2} width={26} height={8.4} rx={4.2} fill={C.honey} {...O25} />
      <path d="M-7 -1.4 H5" fill="none" stroke={C.honeySoft} strokeWidth={2} strokeLinecap="round" />
      <polygon points={starPoints(8, 0, 4.6, 2, 5)} fill={C.peach} {...O2} />
    </g>
  );
}

/** Pita kecil (simpul + dua loop + dua ekor). */
function HaBow({ x, y, c, d, size = 1, rot = 0 }: { x: number; y: number; c: string; d: string; size?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${size})`} style={SVG_ATTR_ORIGIN}>
      <path d="M-2 4 L-12 22 L-4 20 L0 10Z" fill={d} {...O2} />
      <path d="M2 4 L12 22 L4 20 L0 10Z" fill={c} {...O2} />
      <path d="M-3 0 Q-22 -16 -24 -2 Q-22 12 -3 2Z" fill={c} {...O25} />
      <path d="M3 0 Q22 -16 24 -2 Q22 12 3 2Z" fill={c} {...O25} />
      <circle cx={0} cy={1} r={5} fill={d} {...O25} />
      <Hl d="M-17 -6 Q-12 -9 -8 -6" w={2} o={0.8} />
    </g>
  );
}

const HA_DOME = "M-88 46 C-96 8 -78 -30 -38 -40 C-8 -47 26 -47 50 -38 C84 -26 98 12 88 46";

/* ───────────── 1. Cepak rapi (pria) ───────────── */
function HaShortCrop() {
  const P = HA_BROWN;
  return (
    <g>
      <path
        d={`${HA_DOME} C82 32 76 24 66 22 Q56 10 40 16 L30 28 L18 12 L4 26 L-10 12 L-24 26 L-38 14 Q-56 10 -66 22 C-76 24 -82 34 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C82 32 76 24 66 22 C70 0 64 -22 46 -34Z" fill={P.s} opacity={0.5} />
      <HaStrands d="M-30 -34 Q-22 -14 -26 4" c={P.s} />
      <HaStrands d="M-8 -40 Q0 -20 -4 0" c={P.s} />
      <HaStrands d="M16 -40 Q22 -22 18 -2" c={P.s} />
      <HaStrands d="M-62 -6 Q-70 10 -72 28" c={P.s} />
      <Hl d="M-56 -20 Q-34 -38 -8 -40" w={4} o={0.55} />
      <Hl d="M-48 -26 Q-40 -32 -30 -35" w={2.4} o={0.9} />
    </g>
  );
}

/* ───────────── 2. Bob manis (wanita) ───────────── */
function HaBobCut() {
  const P = HA_PINKBROWN;
  return (
    <g>
      <path
        d="M-90 104 C-106 60 -102 -10 -50 -38 C-20 -54 24 -54 52 -38 C102 -10 106 60 90 104 Q80 114 62 108 L62 74 Q64 48 56 38 Q0 50 -56 38 Q-64 48 -62 74 L-62 108 Q-80 114 -90 104Z"
        fill={P.b}
        {...O}
      />
      <path d="M52 -38 C102 -10 106 60 90 104 Q80 114 62 108 L62 74 Q64 48 56 38 Q76 10 70 -20Z" fill={P.s} opacity={0.45} />
      <path d="M-64 100 Q-62 108 -76 110" fill="none" stroke={P.s} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />
      <HaStrands d="M-36 -42 Q-44 0 -38 36" c={P.s} />
      <HaStrands d="M-8 -48 Q-12 0 -8 42" c={P.s} />
      <HaStrands d="M24 -48 Q28 2 24 42" c={P.s} />
      <HaStrands d="M-84 20 Q-90 60 -84 96" c={P.s} />
      <Hl d="M-58 -24 Q-36 -42 -6 -46" w={4.4} o={0.7} />
      <Hl d="M-92 40 Q-96 62 -90 82" w={3} o={0.6} />
      <HaClip x={46} y={16} rot={-28} />
    </g>
  );
}

/* ───────────── 3. Belah samping (pria) ───────────── */
function HaSidePart() {
  const P = HA_BLACK;
  return (
    <g>
      <path
        d={`${HA_DOME} C82 30 74 22 64 22 Q50 32 30 30 Q4 26 -14 4 Q-28 22 -44 22 Q-60 20 -66 24 C-76 26 -82 34 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M-14 4 Q4 26 30 30 Q50 32 64 22 C66 4 60 -12 50 -22 Q20 -2 -14 4Z" fill={P.s} opacity={0.5} />
      <HaStrands d="M-12 2 Q-8 -20 -10 -42" c="#6A6377" w={2.6} o={0.7} />
      <HaStrands d="M10 12 Q36 20 54 14" c={P.l} o={0.4} />
      <HaStrands d="M-30 14 Q-52 6 -62 18" c={P.l} o={0.4} />
      <Hl d="M-62 -14 Q-24 -42 30 -36" w={5.6} o={0.35} />
      <Hl d="M-52 -22 Q-30 -36 -4 -40" w={2.6} o={0.95} />
      <Hl d="M20 -30 Q40 -26 52 -16" w={2.4} o={0.8} />
    </g>
  );
}

/* ───────────── 4. Kuncir dua (wanita) ───────────── */
function HaPigtailsBack() {
  const P = HA_BLONDE;
  const tail = (s: 1 | -1) => (
    <motion.g key={s} style={fb(0.5, 0)} animate={{ rotate: [s * -5, s * 5, s * -5] }} transition={loop(2.6, { delay: s > 0 ? 0 : 0.4 })}>
      <path
        d={`M${s * 66} -10 C${s * 104} -26 ${s * 140} 0 ${s * 134} 46 C${s * 130} 84 ${s * 116} 108 ${s * 100} 124 C${s * 90} 92 ${s * 92} 62 ${s * 74} 26Z`}
        fill={P.b}
        {...O}
      />
      <path
        d={`M${s * 118} -6 C${s * 140} 10 ${s * 140} 30 ${s * 134} 46 C${s * 130} 84 ${s * 116} 108 ${s * 100} 124 C${s * 112} 90 ${s * 118} 48 ${s * 108} 10Z`}
        fill={P.s}
        opacity={0.4}
      />
      <HaStrands d={`M${s * 92} -2 Q${s * 120} 30 ${s * 106} 110`} c={P.s} />
      <HaStrands d={`M${s * 108} 6 Q${s * 126} 36 ${s * 122} 70`} c={P.s} />
      <HaStrands d={`M${s * 80} 10 Q${s * 98} 40 ${s * 92} 78`} c={P.s} />
      <Hl d={`M${s * 104} -14 Q${s * 126} -4 ${s * 128} 24`} w={3.4} o={0.8} />
    </motion.g>
  );
  return (
    <g>
      {tail(-1)}
      {tail(1)}
    </g>
  );
}
function HaPigtailsFront() {
  const P = HA_BLONDE;
  return (
    <g>
      <path
        d={`${HA_DOME} C82 32 78 26 68 24 Q58 36 40 30 Q22 22 4 16 Q-14 24 -34 30 Q-56 36 -68 24 C-78 26 -82 34 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C82 32 78 26 68 24 Q74 0 66 -22Z" fill={P.s} opacity={0.45} />
      <path d="M4 16 Q2 -14 -2 -44" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <HaStrands d="M-30 -34 Q-40 -6 -34 26" c={P.s} />
      <HaStrands d="M30 -36 Q42 -6 38 24" c={P.s} />
      <Hl d="M-58 -20 Q-36 -38 -10 -42" w={4.2} o={0.7} />
      <Hl d="M12 -42 Q30 -40 44 -30" w={3} o={0.7} />
      {([-1, 1] as const).map((s) => (
        <g key={s}>
          <ellipse cx={s * 68} cy={-6} rx={9} ry={7.6} fill={C.peach} {...O25} />
          <HaBow x={s * 74} y={-12} c="#FF5E7E" d="#E03A5E" size={0.86} rot={s * 12} />
        </g>
      ))}
    </g>
  );
}

/* ───────────── 5. Jabrik energik (pria) ───────────── */
function HaSpiky() {
  const P = HA_ORANGE;
  return (
    <g>
      <path
        d="M-90 10 L-100 -16 L-72 -6 L-74 -46 L-46 -26 L-38 -62 L-16 -34 L0 -72 L16 -34 L38 -62 L46 -26 L74 -46 L72 -6 L100 -16 L90 10 C94 24 94 36 88 46 C82 32 76 24 66 22 Q56 12 40 18 L30 30 L18 14 L4 28 L-10 14 L-24 28 L-38 16 Q-56 12 -66 22 C-76 24 -82 34 -88 46 C-94 36 -94 24 -90 10Z"
        fill={P.b}
        {...O}
      />
      <path d="M38 -62 L46 -26 L74 -46 L72 -6 L100 -16 L90 10 C94 24 94 36 88 46 C82 32 76 24 66 22 C72 4 62 -18 44 -24Z" fill={P.s} opacity={0.45} />
      <HaStrands d="M-60 -12 L-62 -34" c={P.s} />
      <HaStrands d="M-28 -34 L-30 -52" c={P.s} />
      <HaStrands d="M0 -36 L0 -60" c={P.s} />
      <HaStrands d="M-70 6 Q-40 0 -20 -8" c={P.s} />
      <Hl d="M-66 -34 L-58 -22" w={3} o={0.85} />
      <Hl d="M-36 -54 L-30 -42" w={3} o={0.85} />
      <Hl d="M-6 -62 L-3 -48" w={3} o={0.85} />
      <Hl d="M-82 -4 Q-80 8 -78 16" w={2.6} o={0.6} />
    </g>
  );
}

/* ───────────── 6. Kuncir kuda tinggi (wanita) ───────────── */
function HaPonytailBack() {
  const P = HA_AUBURN;
  return (
    <motion.g style={fb(0.17, 0.57)} animate={{ rotate: [-5, 5, -5] }} transition={loop(2.4)}>
      <path
        d="M-8 -40 C-22 -88 16 -122 58 -104 C98 -86 112 -24 98 48 C92 78 82 96 72 110 C70 76 70 36 58 -6 C50 -34 36 -52 16 -48Z"
        fill={P.b}
        {...O}
      />
      <path d="M58 -104 C98 -86 112 -24 98 48 C92 78 82 96 72 110 C84 66 90 10 80 -40 C74 -66 66 -84 58 -104Z" fill={P.s} opacity={0.4} />
      <HaStrands d="M10 -52 Q-6 -92 30 -102" c={P.s} />
      <HaStrands d="M30 -50 Q40 -86 62 -90" c={P.s} />
      <HaStrands d="M66 -40 Q86 -10 84 50" c={P.s} />
      <HaStrands d="M60 -20 Q72 20 70 76" c={P.s} />
      <Hl d="M-6 -62 Q4 -94 34 -100" w={3.6} o={0.7} />
      <Hl d="M88 -50 Q98 -20 96 10" w={3} o={0.6} />
    </motion.g>
  );
}
function HaPonytailFront() {
  const P = HA_AUBURN;
  return (
    <g>
      <path
        d={`M-88 46 C-96 8 -82 -26 -42 -36 C-12 -42 24 -42 50 -34 C86 -24 98 12 88 46 C84 34 78 28 70 28 Q64 10 44 0 Q20 -6 0 -4 Q-24 -6 -46 2 Q-64 10 -70 28 C-78 28 -84 34 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -34 C86 -24 98 12 88 46 C84 34 78 28 70 28 Q66 8 52 -2 Q70 -12 66 -28Z" fill={P.s} opacity={0.45} />
      <path d="M-70 26 Q-80 50 -68 76 Q-60 56 -60 36Z" fill={P.b} {...O25} />
      <path d="M70 26 Q80 50 68 76 Q60 56 60 36Z" fill={P.b} {...O25} />
      <HaStrands d="M-40 -28 Q-30 -12 -36 0" c={P.s} />
      <HaStrands d="M-8 -34 Q0 -18 -6 -4" c={P.s} />
      <HaStrands d="M26 -34 Q34 -18 28 -2" c={P.s} />
      <Hl d="M-60 -14 Q-36 -32 -8 -35" w={4} o={0.65} />
      <Hl d="M-76 44 Q-70 56 -66 64" w={2.4} o={0.7} />
      <g>
        <ellipse cx={4} cy={-38} rx={20} ry={11} fill={C.honey} {...O} />
        <ellipse cx={4} cy={-41} rx={13} ry={5} fill={C.honeySoft} />
        <path d="M-12 -34 Q4 -28 20 -34" fill="none" stroke={C.honeyDark} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={-6} cy={-40} r={1.8} fill={C.cream} />
        <circle cx={10} cy={-42} r={1.8} fill={C.cream} />
      </g>
    </g>
  );
}

/* ───────────── 7. Jambul pomade (pria) ───────────── */
function HaQuiff() {
  const P = HA_NAVY;
  return (
    <g>
      {/* sisi dipangkas (fade) */}
      <path
        d={`${HA_DOME} C82 32 76 24 66 22 Q56 14 46 12 L-46 12 Q-56 14 -66 22 C-76 24 -82 34 -88 46Z`}
        fill={P.s}
        {...O}
      />
      <HaStrands d="M-76 30 Q-72 14 -60 6 M76 30 Q72 14 60 6 M-82 40 Q-80 28 -72 20 M82 40 Q80 28 72 20" c={P.l} o={0.4} w={2} />
      {/* gulungan jambul */}
      <path
        d="M-76 18 C-100 -2 -96 -38 -64 -54 C-40 -66 -18 -62 -2 -74 C16 -88 48 -104 78 -88 C100 -76 98 -50 92 -30 C90 -12 84 4 76 18 Q58 -2 32 -4 Q2 -8 -30 -4 Q-58 0 -76 18Z"
        fill={P.b}
        {...O}
      />
      <path d="M78 -88 C100 -76 98 -50 92 -30 C90 -12 84 4 76 18 Q66 4 54 -2 Q80 -26 70 -70Z" fill={P.s} opacity={0.55} />
      <HaStrands d="M-74 8 Q-70 -30 -44 -52" c={P.s} w={2.8} />
      <HaStrands d="M-44 -2 Q-34 -40 -6 -62" c={P.s} w={2.8} />
      <HaStrands d="M-12 -4 Q4 -48 40 -82" c={P.s} w={2.8} />
      <HaStrands d="M22 -4 Q44 -36 76 -62" c={P.s} w={2.8} />
      <Hl d="M-84 -12 Q-70 -48 -34 -62" w={6} o={0.4} />
      <Hl d="M-72 -22 Q-60 -44 -34 -56" w={2.8} o={0.95} />
      <Hl d="M4 -78 Q24 -92 50 -92" w={2.8} o={0.9} />
      <Hl d="M60 -84 Q76 -82 84 -70" w={2.4} o={0.8} />
    </g>
  );
}

/* ───────────── 8. Cepol dua (wanita) ───────────── */
function HaBun({ x, y, r, P }: { x: number; y: number; r: number; P: HaPalette }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={P.b} {...O} />
      <path d={`M${x + r * 0.55} ${y - r * 0.8} A${r} ${r} 0 0 1 ${x + r * 0.55} ${y + r * 0.8} A${r * 0.8} ${r * 0.8} 0 0 0 ${x + r * 0.55} ${y - r * 0.8}Z`} fill={P.s} opacity={0.5} />
      <path d={`M${x - r * 0.5} ${y - r * 0.1} Q${x} ${y - r * 0.7} ${x + r * 0.5} ${y - r * 0.1} Q${x} ${y + r * 0.4} ${x - r * 0.3} ${y + r * 0.2}`} fill="none" stroke={P.s} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />
      <Hl d={`M${x - r * 0.62} ${y - r * 0.15} Q${x - r * 0.5} ${y - r * 0.6} ${x - r * 0.1} ${y - r * 0.72}`} w={3} o={0.8} />
    </g>
  );
}
function HaTwinBuns() {
  const P = HA_LAVENDER;
  return (
    <g>
      <HaBun x={-52} y={-48} r={25} P={P} />
      <HaBun x={52} y={-48} r={25} P={P} />
      <path
        d={`${HA_DOME} C82 32 78 26 68 24 Q60 38 44 30 Q24 20 6 8 L0 4 L-6 8 Q-24 20 -44 30 Q-60 38 -68 24 C-78 26 -82 34 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C82 32 78 26 68 24 Q74 0 66 -22Z" fill={P.s} opacity={0.45} />
      <path d="M0 4 Q0 -18 0 -42" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <HaStrands d="M-30 -32 Q-38 -4 -34 22" c={P.s} />
      <HaStrands d="M30 -32 Q38 -4 34 22" c={P.s} />
      <Hl d="M-60 -18 Q-40 -36 -14 -40" w={4.2} o={0.75} />
      <HaBow x={-52} y={-30} c={C.peach} d={C.peachDark} size={0.72} rot={-8} />
      <HaBow x={52} y={-30} c={C.peach} d={C.peachDark} size={0.72} rot={8} />
    </g>
  );
}

/* ───────────── 9. Cepol pria ───────────── */
function HaManBun() {
  const P = HA_CHESTNUT;
  return (
    <g>
      <circle cx={0} cy={-60} r={25} fill={P.b} {...O} />
      <path d="M14 -82 A25 25 0 0 1 14 -38 A20 20 0 0 0 14 -82Z" fill={P.s} opacity={0.5} />
      <path d="M-14 -66 Q0 -82 16 -66 M-12 -54 Q2 -66 14 -54" fill="none" stroke={P.s} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />
      <Hl d="M-16 -72 Q-10 -82 2 -84" w={3} o={0.85} />
      <path
        d={`${HA_DOME} C82 30 76 22 66 20 Q60 4 42 -2 Q22 -8 0 -8 Q-22 -8 -42 -2 Q-60 4 -66 20 C-76 22 -82 30 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C82 30 76 22 66 20 C70 0 64 -22 46 -34Z" fill={P.s} opacity={0.5} />
      <path d="M-88 46 C-94 28 -90 14 -78 8 L-66 20 C-76 22 -82 30 -88 46Z" fill={P.s} opacity={0.7} />
      <path d="M88 46 C94 28 90 14 78 8 L66 20 C76 22 82 30 88 46Z" fill={P.s} opacity={0.7} />
      <HaStrands d="M-40 -30 Q-22 -16 -8 -10" c={P.s} />
      <HaStrands d="M-8 -40 Q0 -24 4 -10" c={P.s} />
      <HaStrands d="M26 -34 Q18 -20 10 -10" c={P.s} />
      <Hl d="M-58 -16 Q-36 -36 -8 -40" w={4} o={0.55} />
      <Hl d="M-48 -24 Q-38 -32 -28 -35" w={2.4} o={0.9} />
      <rect x={-17} y={-44} width={34} height={9} rx={4.5} fill={C.honey} {...O25} />
      <Hl d="M-11 -41 H4" w={2.2} o={0.85} />
    </g>
  );
}

/* ───────────── 10. Panjang lurus (wanita) ───────────── */
function HaLongStraightBack() {
  const P = HA_PLUM;
  return (
    <g>
      <path
        d="M-86 8 C-108 60 -112 140 -100 192 Q-80 202 -60 194 L60 194 Q80 202 100 192 C112 140 108 60 86 8Z"
        fill={P.b}
        {...O}
      />
      <path d="M86 8 C108 60 112 140 100 192 Q80 202 60 194 L60 100 Q84 70 86 8Z" fill={P.s} opacity={0.5} />
      <HaStrands d="M-94 50 Q-100 120 -92 184" c={P.l} o={0.45} />
      <HaStrands d="M-84 80 Q-86 130 -80 190" c={P.l} o={0.35} />
      <HaStrands d="M94 50 Q100 120 92 184" c={P.s} o={0.6} />
    </g>
  );
}
function HaLongStraightFront() {
  const P = HA_PLUM;
  return (
    <g>
      <path
        d={`${HA_DOME} C82 32 76 26 66 24 Q56 40 36 36 Q8 30 -12 4 Q-30 28 -56 32 Q-66 34 -68 26 C-78 28 -84 36 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C82 32 76 26 66 24 Q70 0 62 -20Z" fill={P.s} opacity={0.5} />
      {/* helai samping jatuh menutupi bahu */}
      <path d="M-88 46 C-100 80 -102 130 -96 172 Q-84 180 -70 172 C-66 140 -66 100 -68 26Z" fill={P.b} {...O} />
      <path d="M88 46 C100 80 102 130 96 172 Q84 180 70 172 C66 140 66 100 68 26Z" fill={P.b} {...O} />
      <path d="M88 46 C100 80 102 130 96 172 Q84 180 70 172 C66 140 66 100 68 26Z" fill={P.s} opacity={0.4} />
      <HaStrands d="M-84 56 Q-90 110 -86 164" c={P.l} o={0.5} />
      <HaStrands d="M-76 70 Q-78 118 -76 166" c={P.s} o={0.6} />
      <HaStrands d="M-12 4 Q-14 -20 -8 -42" c={P.l} o={0.6} />
      <HaStrands d="M10 18 Q30 28 50 22" c={P.l} o={0.45} />
      <Hl d="M-62 -16 Q-30 -40 12 -40" w={5} o={0.4} />
      <Hl d="M-52 -22 Q-30 -36 -4 -40" w={2.6} o={0.85} />
      <Hl d="M-82 60 Q-86 80 -84 104" w={2.8} o={0.6} />
      {/* jepit bunga */}
      <g transform="translate(58 12)" style={SVG_ATTR_ORIGIN}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={0} cy={-9.4} rx={5.6} ry={8.6} fill={C.peachSoft} {...O2} transform={`rotate(${a})`} style={SVG_ATTR_ORIGIN} />
        ))}
        <circle r={5} fill={C.honey} {...O2} />
      </g>
    </g>
  );
}

/* ───────────── 11. Mohawk pastel (pria) ───────────── */
function HaMohawkFlame({ x, h, w = 14, pink = 0.5 }: { x: number; h: number; w?: number; pink?: number }) {
  const cut = -h * (1 - pink);
  return (
    <g>
      <path d={`M${x - w} 8 C${x - w - 4} ${-h * 0.4} ${x - w * 0.4} ${-h * 0.86} ${x} ${-h} C${x + w * 0.4} ${-h * 0.86} ${x + w + 4} ${-h * 0.4} ${x + w} 8Z`} fill={HA_TEAL.b} {...O} />
      <path d={`M${x - w * 0.74} ${cut} C${x - w * 0.62} ${cut - h * 0.2} ${x - w * 0.3} ${-h * 0.88} ${x} ${-h} C${x + w * 0.3} ${-h * 0.88} ${x + w * 0.62} ${cut - h * 0.2} ${x + w * 0.74} ${cut} Q${x + w * 0.4} ${cut + 7} ${x} ${cut + 3} Q${x - w * 0.4} ${cut + 7} ${x - w * 0.74} ${cut}Z`} fill="#FF8FBE" {...O2} />
      <path d={`M${x + w * 0.3} 4 Q${x + w + 1} ${-h * 0.3} ${x + w * 0.56} ${-h * 0.5}`} fill="none" stroke={HA_TEAL.s} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
      <Hl d={`M${x - w * 0.55} -2 Q${x - w * 0.7} ${-h * 0.25} ${x - w * 0.4} ${-h * 0.36}`} w={2.4} o={0.8} />
    </g>
  );
}
function HaMohawk() {
  const P = HA_TEAL;
  return (
    <g>
      {/* sisi dicukur tipis */}
      <path
        d={`${HA_DOME} C82 32 76 24 66 22 Q56 12 44 10 L-44 10 Q-56 12 -66 22 C-76 24 -82 34 -88 46Z`}
        fill="#8FE0D6"
        {...O}
      />
      <path d="M-70 14 Q-76 28 -80 40 M70 14 Q76 28 80 40 M-60 -8 Q-70 4 -74 14 M60 -8 Q70 4 74 14 M-46 -20 Q-56 -8 -60 4 M46 -20 Q56 -8 60 4" fill="none" stroke={P.s} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="1 5" opacity={0.75} />
      <HaMohawkFlame x={-38} h={54} w={13} pink={0.42} />
      <HaMohawkFlame x={38} h={54} w={13} pink={0.42} />
      <HaMohawkFlame x={-19} h={72} w={16} pink={0.46} />
      <HaMohawkFlame x={19} h={72} w={16} pink={0.46} />
      <HaMohawkFlame x={0} h={88} w={17} pink={0.5} />
      <path d="M-46 10 Q0 -6 46 10 L46 16 Q0 2 -46 16Z" fill={P.b} {...O25} />
      <Sparkle x={54} y={-64} size={7} color={C.honeySoft} delay={0.3} />
    </g>
  );
}

/* ───────────── 12. Kepang dua (wanita) ───────────── */
function HaBraid({ s }: { s: 1 | -1 }) {
  const P = HA_GINGER;
  const x0 = s * 92;
  const links = [0, 1, 2, 3, 4, 5, 6];
  return (
    <motion.g style={fb(0.5, 0)} animate={{ rotate: [s * -3, s * 3, s * -3] }} transition={loop(2.8, { delay: s > 0 ? 0 : 0.5 })}>
      <path
        d={`M${x0 - 14} 24 C${x0 - 20} 70 ${x0 - 14} 120 ${x0 - 8} 168 L${x0 + 8} 168 C${x0 + 14} 120 ${x0 + 20} 70 ${x0 + 14} 24Z`}
        fill={P.b}
        {...O}
      />
      {links.map((i) => (
        <path
          key={i}
          d={`M${x0 - 14 + i * 0.2} ${34 + i * 19} Q${x0} ${46 + i * 19} ${x0 + 14 - i * 0.2} ${34 + i * 19}`}
          fill="none"
          stroke={P.s}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.75}
        />
      ))}
      {links.map((i) => (
        <path
          key={`h${i}`}
          d={`M${x0 - 9} ${38 + i * 19} Q${x0 - 4} ${42 + i * 19} ${x0 - 2} ${46 + i * 19}`}
          fill="none"
          stroke={P.l}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.8}
        />
      ))}
      <HaBow x={x0} y={166} c="#FF7FA6" d="#E25683" size={0.8} rot={s * 6} />
    </motion.g>
  );
}
function HaTwinBraidsBack() {
  return (
    <g>
      <HaBraid s={-1} />
      <HaBraid s={1} />
    </g>
  );
}
function HaTwinBraidsFront() {
  const P = HA_GINGER;
  return (
    <g>
      <path
        d={`${HA_DOME} C84 34 80 28 70 26 Q60 38 44 30 Q22 20 4 8 L0 4 L-4 8 Q-22 20 -44 30 Q-60 38 -70 26 C-80 28 -84 34 -88 46Z`}
        fill={P.b}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C84 34 80 28 70 26 Q76 0 66 -22Z" fill={P.s} opacity={0.45} />
      <path d="M0 4 Q0 -18 0 -42" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <HaStrands d="M-30 -34 Q-38 -4 -34 24" c={P.s} />
      <HaStrands d="M30 -34 Q38 -4 34 24" c={P.s} />
      <HaStrands d="M-60 -6 Q-72 14 -76 36" c={P.s} />
      <Hl d="M-60 -18 Q-40 -36 -14 -40" w={4.2} o={0.75} />
      <Hl d="M14 -42 Q32 -38 46 -28" w={3} o={0.7} />
      {([-1, 1] as const).map((s) => (
        <path key={s} d={`M${s * 72} 26 Q${s * 88} 34 ${s * 92} 26 Q${s * 88} 14 ${s * 76} 12Z`} fill={P.b} {...O25} />
      ))}
    </g>
  );
}

/* ───────────── 13. Ombak panjang gradasi (wanita) ───────────── */
const HA_WAVE_COLORS = ["#C7A6F6", "#E4A6E8", "#FFB1C8", "#FFCBA8"] as const;
/** Pita warna antara y0..y1 di antara tepi kiri xl(y) dan kanan xr(y); batas atas/bawah bergelombang halus. */
function haBand(xl: (y: number) => number, xr: (y: number) => number, y0: number, y1: number): string {
  const pts: string[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const x = xl(y0) + ((xr(y0) - xl(y0)) * i) / n;
    pts.push(`${f2(x)} ${f2(y0 + 5 * Math.sin(x / 11))}`);
  }
  for (let y = y0 + 8; y < y1 - 6; y += 8) pts.push(`${f2(xr(y))} ${f2(y)}`);
  for (let i = n; i >= 0; i--) {
    const x = xl(y1) + ((xr(y1) - xl(y1)) * i) / n;
    pts.push(`${f2(x)} ${f2(y1 - 6 + 6 * Math.cos(x / 18))}`);
  }
  for (let y = y1 - 14; y > y0 + 4; y -= 8) pts.push(`${f2(xl(y))} ${f2(y)}`);
  return `M${pts.join(" L")}Z`;
}
const haWave = (s: 1 | -1, y: number, base: number): number => s * (base + 6 * Math.sin(y / 16));
function HaWavyLongBack() {
  const cols = HA_WAVE_COLORS;
  const xl = (y: number) => haWave(-1, y, 100);
  const xr = (y: number) => haWave(1, y, 100);
  return (
    <g>
      <path d={haBand(xl, xr, 10, 198)} fill={cols[0]} {...O} />
      <path d={haBand(xl, xr, 104, 198)} fill={cols[1]} />
      <path d={haBand(xl, xr, 142, 198)} fill={cols[2]} />
      <path d={haBand(xl, xr, 172, 198)} fill={cols[3]} />
      <path d={haBand(xl, xr, 10, 198)} fill="none" {...O} />
      <HaStrands d="M-90 40 Q-82 100 -92 170" c="#8C62CF" o={0.4} />
      <HaStrands d="M90 40 Q82 100 92 170" c="#8C62CF" o={0.5} />
    </g>
  );
}
function HaWavyLongFront() {
  const cols = HA_WAVE_COLORS;
  const side = (s: 1 | -1) => {
    const outer = (y: number) => haWave(s, y, 88);
    const inner = (y: number) => s * (68 - 3 * Math.sin(y / 14));
    const band = (y0: number, y1: number) =>
      s < 0 ? haBand(outer, inner, y0, y1) : haBand(inner, outer, y0, y1);
    return (
      <g key={s}>
        <path d={band(30, 176)} fill={cols[0]} {...O} />
        <path d={band(104, 176)} fill={cols[1]} />
        <path d={band(140, 176)} fill={cols[2]} />
        <path d={band(160, 176)} fill={cols[3]} />
        <path d={band(30, 176)} fill="none" {...O} />
        <HaStrands d={`M${s * 82} 56 Q${s * 78} 100 ${s * 82} 150`} c="#8C62CF" o={0.45} />
      </g>
    );
  };
  return (
    <g>
      <path
        d={`${HA_DOME} C84 34 78 28 68 26 Q58 42 38 38 Q8 30 -14 2 Q-30 26 -56 34 Q-66 36 -68 28 C-78 30 -84 36 -88 46Z`}
        fill={cols[0]}
        {...O}
      />
      <path d="M50 -38 C84 -26 98 12 88 46 C84 34 78 28 68 26 Q74 0 62 -20Z" fill="#9068CB" opacity={0.4} />
      {side(-1)}
      {side(1)}
      <HaStrands d="M-14 2 Q-14 -20 -8 -42" c="#8C62CF" o={0.6} />
      <HaStrands d="M-40 -34 Q-52 -4 -44 24" c="#8C62CF" o={0.5} />
      <HaStrands d="M14 24 Q34 32 54 24" c="#8C62CF" o={0.5} />
      <Hl d="M-62 -16 Q-30 -40 12 -40" w={5} o={0.55} />
      <Hl d="M-52 -22 Q-30 -36 -4 -40" w={2.6} o={0.9} />
      <Sparkle x={60} y={-30} size={7} color={C.cream} delay={0.6} />
    </g>
  );
}

/* ───────────── 14. Keriting mengembang (netral) ───────────── */
const HA_PUFF: [number, number, number][] = [
  [-82, 6, 22],
  [-90, -26, 24],
  [-72, -54, 26],
  [-44, -74, 27],
  [-10, -82, 28],
  [26, -78, 28],
  [58, -64, 26],
  [82, -38, 25],
  [90, -6, 23],
  [80, 24, 20],
  [-60, -22, 30],
  [60, -22, 30],
  [0, -42, 40],
];
function HaCurlyPuff() {
  const P = HA_COCOA;
  const fringe: [number, number][] = [-54, -36, -18, 0, 18, 36, 54].map((x, i) => [x, 8 + (i % 2) * 6 - Math.abs(x) * 0.06]);
  return (
    <g>
      <g stroke={INK} strokeWidth={7} strokeLinejoin="round" fill={INK}>
        {HA_PUFF.map(([x, y, r]) => <circle key={`o${x}${y}`} cx={x} cy={y} r={r} />)}
        {fringe.map(([x, y]) => <circle key={`fo${x}`} cx={x} cy={y} r={13} />)}
      </g>
      <g fill={P.b}>
        {HA_PUFF.map(([x, y, r]) => <circle key={`i${x}${y}`} cx={x} cy={y} r={r} />)}
        {fringe.map(([x, y]) => <circle key={`fi${x}`} cx={x} cy={y} r={13} />)}
      </g>
      {/* bayangan sisi kanan */}
      <g fill={P.s} opacity={0.45}>
        <circle cx={90} cy={-6} r={14} />
        <circle cx={82} cy={-38} r={14} />
        <circle cx={60} cy={-62} r={13} />
      </g>
      {/* pusar ikal */}
      <g fill="none" stroke={P.s} strokeWidth={2.6} strokeLinecap="round" opacity={0.7}>
        <path d="M-44 -74 Q-36 -84 -28 -76 Q-30 -68 -38 -70" />
        <path d="M24 -78 Q32 -88 40 -80 Q38 -72 30 -74" />
        <path d="M-84 -26 Q-96 -30 -90 -40 Q-82 -40 -82 -32" />
        <path d="M-6 -50 Q4 -60 12 -52 Q8 -44 0 -46" />
        <path d="M58 -22 Q68 -30 74 -20 Q68 -14 62 -18" />
        <path d="M-34 8 Q-28 2 -22 10 M2 14 Q8 8 14 16 M30 8 Q36 2 42 10" />
      </g>
      <Hl d="M-60 -64 Q-44 -80 -22 -80" w={4} o={0.45} />
      <Hl d="M-96 -22 Q-96 -34 -88 -42" w={3} o={0.45} />
      {/* bando kuning + pita */}
      <path d="M-86 -12 Q0 -36 86 -12" fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
      <path d="M-86 -12 Q0 -36 86 -12" fill="none" stroke={C.honey} strokeWidth={8} strokeLinecap="round" />
      <path d="M-70 -17 Q-30 -30 0 -30" fill="none" stroke={C.honeySoft} strokeWidth={2.6} strokeLinecap="round" />
      <HaBow x={-54} y={-26} c={C.honey} d={C.honeyDark} size={0.9} rot={-14} />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  REGISTRY
 * ═════════════════════════════════════════════════════════════ */

const HEAD_REG_A: Record<string, HeadArt> = {
  head_hair_short_crop: { Front: HaShortCrop },
  head_hair_bob_cut: { Front: HaBobCut },
  head_hair_side_part: { Front: HaSidePart },
  head_hair_pigtails: { Front: HaPigtailsFront, Back: HaPigtailsBack },
  head_hair_spiky: { Front: HaSpiky },
  head_hair_ponytail: { Front: HaPonytailFront, Back: HaPonytailBack },
  head_hair_quiff: { Front: HaQuiff },
  head_hair_twin_buns: { Front: HaTwinBuns },
  head_hair_man_bun: { Front: HaManBun },
  head_hair_long_straight: { Front: HaLongStraightFront, Back: HaLongStraightBack },
  head_hair_mohawk: { Front: HaMohawk },
  head_hair_twin_braids: { Front: HaTwinBraidsFront, Back: HaTwinBraidsBack },
  head_hair_wavy_long: { Front: HaWavyLongFront, Back: HaWavyLongBack },
  head_hair_curly_puff: { Front: HaCurlyPuff },
};

const HEAD_BOX_A: Record<string, string> = {
  head_hair_short_crop: "-104 -58 208 120",
  head_hair_bob_cut: "-116 -66 232 192",
  head_hair_side_part: "-104 -58 208 120",
  head_hair_pigtails: "-132 -44 264 176",
  head_hair_spiky: "-112 -88 224 150",
  head_hair_ponytail: "-110 -134 240 262",
  head_hair_quiff: "-112 -96 224 152",
  head_hair_twin_buns: "-100 -86 200 140",
  head_hair_man_bun: "-104 -92 208 150",
  head_hair_long_straight: "-124 -66 248 280",
  head_hair_mohawk: "-102 -96 204 150",
  head_hair_twin_braids: "-116 -66 232 262",
  head_hair_wavy_long: "-124 -66 248 280",
  head_hair_curly_puff: "-116 -112 232 180",
};
/* ═════════════════════════════════════════════════════════════
 *  TOPI & PENUTUP KEPALA TAMBAHAN (14): baseball, kupluk, bucket, koki, pelaut,
 *  peci, koboi, kerudung, penyihir, headphone, wizard, sinterklas, mahkota bunga, bando kucing
 *  Koordinat lokal: (0,0) = tengah pangkal topi di ubun-ubun, tumbuh ke -y.
 * ═════════════════════════════════════════════════════════════ */

const HB = {
  white: "#FFFEFA",
  whiteShade: "#DDE6F4",
  sand: "#F6E6C4",
  sandDark: "#E2C98F",
  sandLight: "#FFF4DC",
  brown: "#C98B4E",
  brownDark: "#9F6330",
  brownLight: "#E3AE72",
  velvet: "#34302D",
  velvetLight: "#524C47",
  indigo: "#5A6BE0",
  indigoDark: "#3C49B5",
  indigoLight: "#8E9BF2",
  plum: "#8C5BD6",
  plumDark: "#5E3AA0",
  plumBand: "#4A2F82",
  pink: "#FF9EBB",
  pinkSoft: "#FFD0DE",
  pinkDark: "#E5708F",
  red: "#E8576A",
  redDark: "#C73D52",
  lav: "#E6D6FA",
  lavDark: "#C6ADF0",
  lavLight: "#F6EFFF",
  navy: "#2F4A8A",
} as const;

/** Lingkaran-lingkaran menyatu dengan garis tepi luar tinta (dua lapis: tinta r+t, lalu warna r). */
function HbPuff({ pts, fill, t = 3.2 }: { pts: readonly (readonly [number, number, number])[]; fill: string; t?: number }) {
  return (
    <g>
      {pts.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r + t} fill={INK} />
      ))}
      {pts.map(([x, y, r], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r={r} fill={fill} />
      ))}
    </g>
  );
}

/** Daun runcing dari titik (cx,cy) menunjuk sudut `ang` (derajat), tanpa atribut transform. */
function HbLeaf({ cx, cy, ang, len, w, fill = C.matcha }: { cx: number; cy: number; ang: number; len: number; w: number; fill?: string }) {
  const a = (ang * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const px = -uy;
  const py = ux;
  const tip: Pt = [cx + ux * len, cy + uy * len];
  const c1: Pt = [cx + ux * len * 0.45 + px * w, cy + uy * len * 0.45 + py * w];
  const c2: Pt = [cx + ux * len * 0.45 - px * w, cy + uy * len * 0.45 - py * w];
  return (
    <g>
      <path d={`M${f2(cx)} ${f2(cy)} Q${f2(c1[0])} ${f2(c1[1])} ${f2(tip[0])} ${f2(tip[1])} Q${f2(c2[0])} ${f2(c2[1])} ${f2(cx)} ${f2(cy)}Z`} fill={fill} {...O25} />
      <path d={`M${f2(cx + ux * 3)} ${f2(cy + uy * 3)} L${f2(cx + ux * len * 0.78)} ${f2(cy + uy * len * 0.78)}`} fill="none" stroke={C.matchaDark} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

/** Bunga 5 kelopak (posisi dihitung, tanpa transform). */
function HbFlower({ x, y, r, petal, center = C.honey }: { x: number; y: number; r: number; petal: string; center?: string }) {
  const pr = r * 0.52;
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (-90 + i * 72) * (Math.PI / 180);
        return <circle key={i} cx={f2(x + Math.cos(a) * r * 0.62)} cy={f2(y + Math.sin(a) * r * 0.62)} r={f2(pr)} fill={petal} {...O25} />;
      })}
      <circle cx={x} cy={y} r={r * 0.4} fill={center} {...O2} />
      <circle cx={x - r * 0.12} cy={y - r * 0.14} r={r * 0.1} fill={C.cream} />
    </g>
  );
}

/* ───────────── 1. Topi baseball ───────────── */

function HbCap() {
  return (
    <g>
      <path d="M-46 4 Q-50 -42 0 -46 Q50 -42 46 4 Q0 13 -46 4Z" fill={C.sky} {...O} />
      <path d="M20 -44 Q50 -38 46 4 Q30 10 14 11 Q36 -14 20 -44Z" fill={C.skyDark} opacity={0.4} />
      <path d="M-14 -44 Q-24 -20 -22 8 M14 -44 Q24 -20 22 8" fill="none" stroke={C.skyDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />
      <circle cx={0} cy={-46} r={4.6} fill={C.skyDark} {...O2} />
            <path d="M-42 6 Q0 18 42 6 Q38 24 0 26 Q-38 24 -42 6Z" fill={C.skyDark} {...O} />
      <path d="M-28 13 Q0 21 28 13" fill="none" stroke={C.skySoft} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
      <polygon points={starPoints(0, -19, 11, 5)} fill={C.honey} {...O25} />
      <polygon points={starPoints(-1.4, -20, 4.6, 2.1)} fill={C.honeySoft} />
      <Hl d="M-36 -26 Q-30 -38 -14 -42" w={3.2} o={0.8} />
    </g>
  );
}

/* ───────────── 2. Kupluk rajut ───────────── */

const hbDomeHalf = (y: number): number => {
  // kurva bezier kuadratik dari (-50,2) via (-54,-44) ke (0,-48)
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 28; i++) {
    const t = (lo + hi) / 2;
    const yy = (1 - t) * (1 - t) * 2 + 2 * t * (1 - t) * -44 + t * t * -48;
    if (yy > y) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  return -((1 - t) * (1 - t) * -50 + 2 * t * (1 - t) * -54);
};

function HbStripe({ y1, y2, fill, bend = 7 }: { y1: number; y2: number; fill: string; bend?: number }) {
  const w1 = hbDomeHalf(y1);
  const w2 = hbDomeHalf(y2);
  return (
    <path
      d={`M${f2(-w2)} ${y2} Q0 ${y2 + bend} ${f2(w2)} ${y2} L${f2(w1)} ${y1} Q0 ${y1 + bend} ${f2(-w1)} ${y1}Z`}
      fill={fill}
    />
  );
}

function HbBeanie() {
  const ribs = [-42, -33, -24, -15, -6, 3, 12, 21, 30, 39];
  return (
    <g>
      <path d="M-50 2 Q-54 -44 0 -48 Q54 -44 50 2Z" fill={C.peach} />
      <HbStripe y1={-18} y2={-8} fill={C.cream} />
      <HbStripe y1={-36} y2={-27} fill={C.cream} />
      <path d="M22 -46 Q52 -40 50 2 L28 2 Q40 -22 22 -46Z" fill={C.peachDark} opacity={0.35} />
      <path d="M-50 2 Q-54 -44 0 -48 Q54 -44 50 2" fill="none" {...O} />
      <path d="M-54 2 Q0 12 54 2 L56 20 Q0 32 -56 20Z" fill={C.peachDark} {...O} />
      {ribs.map((x) => (
        <path key={x} d={`M${x * 1.32} ${f2(5 + (1 - (x / 42) ** 2) * 6)} V${f2(16 + (1 - (x / 42) ** 2) * 8)}`} fill="none" stroke={C.peach} strokeWidth={3.2} strokeLinecap="round" opacity={0.85} />
      ))}
      <Hl d="M-40 -20 Q-34 -36 -16 -42" w={3.2} o={0.8} />
      <motion.g style={fb(0.5, 1)} animate={{ rotate: [-6, 6, -6] }} transition={loop(2.4)}>
        <HbPuff pts={[[-8, -58, 9], [8, -58, 9], [0, -66, 10], [0, -54, 9]]} fill={HB.white} t={3} />
        <path d="M-10 -52 Q-2 -48 6 -53 M-4 -62 Q2 -58 8 -62" fill="none" stroke={HB.whiteShade} strokeWidth={2.6} strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

/* ───────────── 3. Topi bucket ───────────── */

function HbBucket() {
  return (
    <g>
      <path d="M-36 -6 Q-66 -2 -62 12 Q0 26 62 12 Q66 -2 36 -6Z" fill={HB.sandDark} {...O} />
      <path d="M-56 10 Q0 22 56 10" fill="none" stroke={HB.sand} strokeWidth={3} strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M-36 -6 Q-40 -34 -26 -38 Q0 -42 26 -38 Q40 -34 36 -6 Q0 4 -36 -6Z" fill={HB.sand} {...O} />
      <path d="M16 -40 Q40 -34 36 -6 Q26 -1 14 2Z" fill={HB.sandDark} opacity={0.45} />
      <path d="M-37 -20 Q0 -10 37 -20 L36 -6 Q0 4 -36 -6Z" fill={C.peach} {...O25} />
      <path d="M-30 -14 Q0 -6 30 -14" fill="none" stroke={C.peachSoft} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} />
      <circle cx={-32} cy={-26} r={2.6} fill={INK} />
      <circle cx={32} cy={-26} r={2.6} fill={INK} />
      <path d="M-46 4 Q0 14 46 4" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.7} />
      <Hl d="M-26 -34 Q-18 -38 -4 -39" w={3.2} o={0.85} />
    </g>
  );
}

/* ───────────── 4. Topi koki ───────────── */

function HbChef() {
  return (
    <g>
      <HbPuff pts={[[-34, -36, 17], [34, -36, 17], [-17, -54, 19], [17, -54, 19], [0, -42, 22]]} fill={HB.white} />
      <path d="M-34 -26 L-32 -2 Q0 6 32 -2 L34 -26Z" fill={HB.white} stroke="none" />
      <path d="M-35 -26 L-33 -2 Q0 7 33 -2 L35 -26" fill="none" {...O} />
      <path d="M-18 -26 Q-20 -40 -24 -52 M0 -26 Q0 -44 0 -58 M18 -26 Q20 -40 24 -52" fill="none" stroke={HB.whiteShade} strokeWidth={3} strokeLinecap="round" />
      <path d="M-34 -8 Q0 2 34 -8 L33 4 Q0 12 -33 4Z" fill={HB.whiteShade} {...O25} />
      <path d="M-14 -4 V8 M0 -2 V10 M14 -4 V8" fill="none" stroke={C.cream} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      <Hl d="M-44 -42 Q-42 -52 -34 -52" w={3} o={0.9} />
    </g>
  );
}

/* ───────────── 5. Topi pelaut ───────────── */

function HbSailor() {
  return (
    <g>
      <path d="M-38 -4 Q-42 -40 0 -42 Q42 -40 38 -4Z" fill={HB.white} {...O} />
      <path d="M14 -40 Q42 -34 38 -4 L24 -4 Q34 -24 14 -40Z" fill={HB.whiteShade} opacity={0.9} />
      <path d="M-46 -6 Q0 6 46 -6 L44 10 Q0 24 -44 10Z" fill={HB.white} {...O} />
      <path d="M-45 0 Q0 12 45 0" fill="none" stroke={C.skyDark} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M-44 6 Q0 18 44 6" fill="none" stroke={C.skyDark} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M40 4 Q56 16 52 34 L44 30 Q46 18 38 10Z" fill={C.sky} {...O25} />
      <path d="M46 6 Q64 14 66 30 L58 28 Q56 18 44 12Z" fill={C.skyDark} {...O25} />
      <circle cx={42} cy={8} r={5.4} fill={C.sky} {...O25} />
      <g fill="none" stroke={HB.navy} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={0} cy={-31} r={3} />
        <path d="M0 -28 V-12 M-6 -22 H6 M-10 -18 Q-9 -10 0 -10 Q9 -10 10 -18" />
      </g>
      <Hl d="M-30 -30 Q-24 -38 -10 -40" w={3} o={0.9} />
    </g>
  );
}

/* ───────────── 6. Peci hitam ───────────── */

function HbPeci() {
  return (
    <g>
      <path d="M-37 8 L-33 -34 Q0 -44 33 -34 L37 8 Q0 16 -37 8Z" fill={HB.velvet} {...O} />
      <path d="M-33 -34 Q0 -50 33 -34 Q0 -26 -33 -34Z" fill={HB.velvetLight} {...O25} />
      <path d="M-30 -34 Q0 -46 30 -34" fill="none" stroke={C.honey} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="5 3" />
      <path d="M-37 -6 Q0 2 37 -6 L37 8 Q0 16 -37 8Z" fill="#2A2624" {...O25} />
      <path d="M-37 -5 Q0 3 37 -5" fill="none" stroke={C.honey} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M-37 7 Q0 15 37 7" fill="none" stroke={C.honey} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M14 -34 L18 6" fill="none" stroke={HB.velvetLight} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <path d="M-22 -30 L-24 -10" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.4} />
      <polygon points="0,-24 6,-16 0,-8 -6,-16" fill={C.honey} {...O2} />
      <Sparkle x={40} y={-34} size={6} color={C.honeySoft} delay={0.4} />
    </g>
  );
}

/* ───────────── 7. Topi koboi ───────────── */

function HbCowboy() {
  return (
    <g>
      <path d="M-70 -4 Q-76 -24 -58 -18 Q-30 -8 0 -8 Q30 -8 58 -18 Q76 -24 70 -4 Q40 15 0 15 Q-40 15 -70 -4Z" fill={HB.brownDark} {...O} />
      <path d="M-62 -2 Q0 12 62 -2" fill="none" stroke={HB.brownLight} strokeWidth={2.6} strokeLinecap="round" strokeDasharray="1 6" />
      <path d="M-33 -8 Q-38 -42 -22 -50 Q-10 -46 0 -49 Q10 -46 22 -50 Q38 -42 33 -8 Q0 4 -33 -8Z" fill={HB.brown} {...O} />
      <path d="M16 -48 Q38 -42 33 -8 Q24 -3 12 0Z" fill={HB.brownDark} opacity={0.4} />
      <path d="M-8 -46 Q0 -38 8 -46" fill="none" stroke={HB.brownDark} strokeWidth={3} strokeLinecap="round" />
      <path d="M-34 -22 Q0 -12 34 -22 L33 -8 Q0 4 -33 -8Z" fill={C.peachDark} {...O25} />
      <polygon points={starPoints(0, -12, 9.6, 4.4)} fill={C.honey} {...O25} />
      <Hl d="M-28 -40 Q-22 -48 -12 -48" w={3.2} o={0.75} />
      <Hl d="M-58 -10 Q-48 -4 -34 -2" w={2.8} o={0.6} />
    </g>
  );
}

/* ───────────── 8. Kerudung pastel ───────────── */

const HB_HIJAB_OUTER =
  "M0 -30 C-56 -30 -100 8 -100 62 C-100 102 -88 130 -76 146 C-62 162 -30 170 0 172 C30 170 62 162 76 146 C88 130 100 102 100 62 C100 8 56 -30 0 -30Z";
const HB_HIJAB_INNER =
  "M0 8 C-46 8 -76 34 -76 66 C-76 100 -50 134 0 136 C50 134 76 100 76 66 C76 34 46 8 0 8Z";

function HbHijabBack() {
  return (
    <g>
      <path d="M-100 40 C-106 96 -102 156 -84 196 Q0 206 84 196 C102 156 106 96 100 40Z" fill={HB.lavDark} {...O} />
      <path d="M-80 120 Q-84 160 -70 192 M80 120 Q84 160 70 192" fill="none" stroke={HB.lav} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

function HbHijabFront() {
  return (
    <g>
      <path d={`${HB_HIJAB_OUTER} ${HB_HIJAB_INNER}`} fillRule="evenodd" fill={HB.lav} {...O} />
      <path d="M0 8 C-46 8 -76 34 -76 66 C-76 100 -50 134 0 136 C50 134 76 100 76 66 C76 34 46 8 0 8Z" fill="none" stroke={INK} strokeWidth={4} />
      <path d="M-92 52 C-86 26 -56 -4 -8 -16 M-98 80 C-96 40 -64 4 -28 -6" fill="none" stroke={HB.lavDark} strokeWidth={3.2} strokeLinecap="round" opacity={0.85} />
      <path d="M-84 124 C-64 154 -30 164 0 164 C30 164 64 154 84 124" fill="none" stroke={HB.lavDark} strokeWidth={3.2} strokeLinecap="round" opacity={0.8} />
      <path d="M-40 148 C-24 156 -8 158 8 156" fill="none" stroke={HB.lavLight} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
      <path d="M66 -6 C90 18 96 44 94 70" fill="none" stroke={HB.lavDark} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <Hl d="M-48 -12 C-68 0 -86 22 -92 44" w={3.6} o={0.9} />
      <HbFlower x={62} y={144} r={13} petal={C.peachSoft} center={C.honey} />
      <HbLeaf cx={74} cy={152} ang={30} len={16} w={5} />
      <HbLeaf cx={52} cy={154} ang={150} len={14} w={4.4} />
      <HbFlower x={62} y={144} r={13} petal={C.peachSoft} center={C.honey} />
      <Sparkle x={90} y={118} size={6} color={C.cream} delay={0.5} />
    </g>
  );
}

/* ───────────── 9. Topi penyihir ───────────── */

function HbWitch() {
  return (
    <g>
      <ellipse cx={0} cy={-2} rx={62} ry={12} fill={HB.plumDark} {...O} />
      <path d="M-34 -2 Q-26 -50 -14 -78 Q-6 -104 20 -112 Q42 -108 40 -94 Q24 -96 14 -80 Q12 -42 34 -2 Q0 8 -34 -2Z" fill={HB.plum} {...O} />
      <path d="M12 -80 Q12 -42 34 -2 Q24 4 10 5 Q22 -34 8 -78Z" fill={HB.plumDark} opacity={0.4} />
      <path d="M-32 -20 Q0 -10 32 -20 L33 -4 Q0 6 -33 -4Z" fill={HB.plumBand} {...O25} />
      <rect x={-9} y={-19} width={18} height={14} rx={3} fill={C.honey} {...O25} />
      <rect x={-4} y={-15} width={8} height={6} rx={1.5} fill="none" stroke={INK} strokeWidth={2} />
      <polygon points={starPoints(-6, -46, 8.4, 3.8)} fill={C.honey} {...O2} />
      <path d="M8 -74 A9 9 0 1 0 8 -58 A7 7 0 1 1 8 -74Z" fill={C.honeySoft} {...O2} />
      <Hl d="M-24 -40 Q-20 -64 -10 -82" w={3.4} o={0.55} />
      <Sparkle x={34} y={-116} size={8} color={C.honeySoft} delay={0.3} />
      <Sparkle x={-46} y={-30} size={6} color={C.cream} delay={1.1} />
    </g>
  );
}

/* ───────────── 10. Headphone ───────────── */

function HbHeadphones() {
  const cup = (x: number, side: 1 | -1) => (
    <g>
      <ellipse cx={x} cy={56} rx={15} ry={25} fill={C.peach} {...O} />
      <ellipse cx={x - side * 5} cy={56} rx={9} ry={18} fill={C.peachDark} {...O25} />
      <polygon points={starPoints(x + side * 1.5, 56, 6, 2.8)} fill={C.honey} {...O2} />
      <path d={`M${x + side * 8} 38 Q${x + side * 11} 46 ${x + side * 11} 54`} fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
    </g>
  );
  return (
    <g>
      <Duo d="M-84 44 C-92 -36 92 -36 84 44" inner={C.peach} ow={13} iw={8} />
      <path d="M-70 4 C-60 -22 -30 -26 -12 -25" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <rect x={-8} y={-22} width={16} height={9} rx={3} fill={C.honey} {...O2} />
      {cup(-86, -1)}
      {cup(86, 1)}
      <Sparkle x={0} y={-34} size={7} color={C.honeySoft} delay={0.3} />
    </g>
  );
}

/* ───────────── 11. Topi wizard ───────────── */

function HbWizard() {
  return (
    <g>
      <ellipse cx={0} cy={-2} rx={64} ry={12} fill={HB.indigoDark} {...O} />
      <path d="M-50 2 Q-30 10 -14 6 M50 2 Q30 10 14 6" fill="none" stroke={C.honey} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M-36 -2 Q-24 -60 -4 -100 Q4 -128 30 -134 Q46 -128 38 -116 Q22 -116 18 -100 Q16 -56 36 -2 Q0 8 -36 -2Z" fill={HB.indigo} {...O} />
      <path d="M16 -100 Q16 -56 36 -2 Q24 4 10 5 Q24 -40 6 -96Z" fill={HB.indigoDark} opacity={0.45} />
      <path d="M-34 -20 Q0 -10 34 -20 L35 -4 Q0 6 -35 -4Z" fill={C.honey} {...O25} />
      <path d="M-26 -14 Q-12 -8 0 -9" fill="none" stroke={C.honeySoft} strokeWidth={2.6} strokeLinecap="round" />
      <polygon points={starPoints(-6, -38, 8.4, 3.8)} fill={C.honey} {...O2} />
      <polygon points={starPoints(8, -66, 6.4, 3)} fill={C.honeySoft} {...O2} />
      <polygon points={starPoints(-2, -92, 5.2, 2.4)} fill={C.honey} {...O2} />
      <Hl d="M-26 -34 Q-18 -66 -8 -92" w={3.2} o={0.5} />
      <Sparkle x={44} y={-118} size={8} color={C.honeySoft} delay={0.2} />
      <Sparkle x={-30} y={-64} size={5} color={C.cream} delay={1} />
    </g>
  );
}

/* ───────────── 12. Topi sinterklas ───────────── */

function HbSanta() {
  const trim: [number, number, number][] = [
    [-42, 8, 10.5],
    [-28, 11, 10.5],
    [-14, 13, 10.5],
    [0, 13.5, 10.5],
    [14, 13, 10.5],
    [28, 11, 10.5],
    [42, 8, 10.5],
  ];
  return (
    <g>
      <path d="M-46 4 Q-48 -48 -6 -62 Q34 -72 58 -44 Q66 -32 60 -18 Q56 -8 50 4Z" fill={HB.red} {...O} />
      <path d="M30 -56 Q58 -46 60 -18 Q56 -8 50 4 L32 4 Q44 -20 30 -56Z" fill={HB.redDark} opacity={0.45} />
      <Hl d="M-36 -20 Q-34 -42 -14 -54" w={3.4} o={0.7} />
      <HbPuff pts={trim} fill={HB.white} />
      <path d="M-34 8 Q-26 14 -18 10 M-4 14 Q4 18 12 14 M24 10 Q32 14 38 8" fill="none" stroke={HB.whiteShade} strokeWidth={2.6} strokeLinecap="round" />
      <motion.g style={fb(0.5, 0)} animate={{ rotate: [-10, 10, -10] }} transition={loop(2.2)}>
        <path d="M60 -16 Q62 -6 60 -2" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <HbPuff pts={[[60, 4, 10], [53, 8, 8], [67, 8, 8], [60, 12, 8]]} fill={HB.white} t={3} />
      </motion.g>
    </g>
  );
}

/* ───────────── 13. Mahkota bunga ───────────── */

const hbCrownY = (x: number): number => -8 + 0.0074 * x * x;

function HbFlowerCrown() {
  const leaves: [number, number][] = [-62, -48, -28, -9, 9, 28, 48, 62].map((x) => [x, hbCrownY(x)]);
  const flowers: { x: number; r: number; petal: string; center?: string }[] = [
    { x: -56, r: 10, petal: C.peachSoft },
    { x: -38, r: 12, petal: C.honeySoft, center: C.peach },
    { x: -18, r: 10, petal: C.taroSoft },
    { x: 0, r: 13, petal: C.peach, center: C.honeySoft },
    { x: 18, r: 10, petal: C.skySoft },
    { x: 38, r: 12, petal: C.taroSoft, center: C.honey },
    { x: 56, r: 10, petal: C.honeySoft, center: C.peach },
  ];
  return (
    <g>
      <path d={`M-70 ${f2(hbCrownY(-70))} Q0 -36 70 ${f2(hbCrownY(70))}`} fill="none" stroke={C.matchaDark} strokeWidth={5} strokeLinecap="round" />
      {leaves.map(([x, y], i) => (
        <HbLeaf key={i} cx={x} cy={y - 2} ang={i % 2 === 0 ? -150 + x * 0.3 : -30 + x * 0.3} len={20} w={6} />
      ))}
      {flowers.map((f) => (
        <HbFlower key={f.x} x={f.x} y={hbCrownY(f.x) - 4} r={f.r} petal={f.petal} center={f.center} />
      ))}
      <Sparkle x={-30} y={-34} size={7} color={C.honeySoft} delay={0.2} />
      <Sparkle x={34} y={-30} size={6} color={C.cream} delay={0.9} />
    </g>
  );
}

/* ───────────── 14. Bando telinga kucing ───────────── */

function HbCatEars() {
  return (
    <g>
      <motion.g style={fb(0.5, 1)} animate={{ rotate: [0, -6, 0, 0] }} transition={{ duration: 0.5, times: [0, 0.4, 0.8, 1], repeat: Infinity, repeatDelay: 2.6 }}>
        <path d="M-60 -2 Q-60 -38 -54 -52 Q-36 -44 -20 -8 Q-40 4 -60 -2Z" fill={HB.pinkSoft} {...O} />
        <path d="M-52 -8 Q-52 -30 -50 -40 Q-38 -32 -30 -10 Q-42 -2 -52 -8Z" fill={HB.pink} />
        <Hl d="M-56 -26 Q-56 -38 -52 -46" w={2.8} o={0.85} />
      </motion.g>
      <motion.g style={fb(0.5, 1)} animate={{ rotate: [0, 6, 0, 0] }} transition={{ duration: 0.5, times: [0, 0.4, 0.8, 1], repeat: Infinity, repeatDelay: 3.4 }}>
        <path d="M60 -2 Q60 -38 54 -52 Q36 -44 20 -8 Q40 4 60 -2Z" fill={HB.pinkSoft} {...O} />
        <path d="M52 -8 Q52 -30 50 -40 Q38 -32 30 -10 Q42 -2 52 -8Z" fill={HB.pink} />
      </motion.g>
      <Duo d="M-78 32 Q0 -50 78 32" inner={HB.pink} ow={11} iw={6.4} />
      <path d="M-62 14 Q-40 -12 -16 -18" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.8} />
      <path d="M-8 -12 L-20 -22 Q-26 -14 -20 -6Z M8 -12 L20 -22 Q26 -14 20 -6Z" fill={C.peach} {...O2} />
      <circle cx={0} cy={-12} r={4.6} fill={C.honey} {...O2} />
      <path d="M0 -6 V0" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={0} cy={5} r={5.4} fill={C.honey} {...O25} />
      <path d="M-3 6 H3" stroke={C.honeyDark} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

/* ───────────── Registry ───────────── */

const HEAD_REG_B: Record<string, HeadArt> = {
  head_cap_baseball: { Front: HbCap },
  head_beanie_knit: { Front: HbBeanie },
  head_bucket_hat: { Front: HbBucket },
  head_chef_hat: { Front: HbChef },
  head_sailor_cap: { Front: HbSailor },
  head_peci_hitam: { Front: HbPeci },
  head_cowboy_hat: { Front: HbCowboy },
  head_hijab_pastel: { Front: HbHijabFront, Back: HbHijabBack },
  head_witch_hat: { Front: HbWitch },
  head_headphones: { Front: HbHeadphones },
  head_wizard_hat: { Front: HbWizard },
  head_santa_hat: { Front: HbSanta },
  head_flower_crown: { Front: HbFlowerCrown },
  head_cat_ears: { Front: HbCatEars },
};

const HEAD_BOX_B: Record<string, string> = {
  head_cap_baseball: "-66 -62 132 100",
  head_beanie_knit: "-70 -84 140 124",
  head_bucket_hat: "-76 -54 152 98",
  head_chef_hat: "-70 -82 140 106",
  head_sailor_cap: "-64 -56 134 106",
  head_peci_hitam: "-60 -58 120 88",
  head_cowboy_hat: "-86 -62 172 94",
  head_hijab_pastel: "-116 -44 232 256",
  head_witch_hat: "-76 -128 152 148",
  head_headphones: "-112 -50 224 150",
  head_wizard_hat: "-76 -146 152 168",
  head_santa_hat: "-66 -80 140 118",
  head_flower_crown: "-84 -52 168 110",
  head_cat_ears: "-84 -64 168 108",
};

/* ═════════════════════════════════════════════════════════════
 *  KOSMETIK TAMBAHAN: 16 PAKAIAN (perempuan, laki-laki, netral)
 *  Koordinat artboard 400×410, badan berpusat x=200.
 * ═════════════════════════════════════════════════════════════ */

const OX_K = {
  denim: "#6C9BD2",
  denimDark: "#4F7DB5",
  denimLight: "#A6C8EE",
  navy: "#3E4A7A",
  navyDark: "#2D3760",
  red: "#E8576A",
  redDark: "#C73D52",
  redLight: "#F58A98",
  yellow: "#FFD23F",
  yellowDark: "#E5AE12",
  yellowLight: "#FFE98A",
  teal: "#2FB5A8",
  tealDark: "#1F8F85",
  tealLight: "#7FDCD2",
  brown: "#A8703F",
  brownDark: "#7A4C28",
  gold: "#E8B84A",
  suit: "#3F3950",
  suitDark: "#2A2536",
  suitLight: "#5A5170",
  silver: "#CBD5DE",
  silverDark: "#9AA9B7",
  silverLight: "#F0F5F9",
  lav: "#D9C1F6",
  lavDark: "#B993E8",
  pink: "#FFB6C9",
  pinkDark: "#F58FAB",
  pinkLight: "#FFD9E3",
  skyPj: "#A8D3FF",
  skyPjDark: "#7DB4EE",
  white: "#FFFEFA",
  whiteDark: "#E3E9F1",
  leaf: "#4FBF73",
  leafDark: "#2F9A56",
} as const;

/** Jalur bergelombang (skalop) untuk pinggiran kain: lebar tiap lengkung `w`, kedalaman `h`. */
const oxScallop = (x0: number, x1: number, y: number, w: number, h: number): string => {
  const n = Math.round((x1 - x0) / w);
  const step = (x1 - x0) / n;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i += 1) d += ` q${f2(step / 2)} ${h} ${f2(step)} 0`;
  return d;
};

/** Dasar kain polos: badan penuh + bayangan sisi kanan. */
function OxBase({ fill, shade, y0 = 246, y1 = 346, so = 0.4 }: { fill: string; shade: string; y0?: number; y1?: number; so?: number }) {
  return (
    <g>
      <rect x={100} y={y0} width={200} height={y1 - y0} fill={fill} />
      <path d={`M244 ${y0 + 4} Q272 ${(y0 + y1) / 2} 264 ${y1} H300 V${y0 + 2}Z`} fill={shade} opacity={so} />
    </g>
  );
}

function OxFlower({ x, y, r = 6, petal, center = C.honey }: { x: number; y: number; r?: number; petal: string; center?: string }) {
  const pts = [0, 72, 144, 216, 288].map((a) => {
    const t = (a - 90) * (Math.PI / 180);
    return [x + Math.cos(t) * r * 0.9, y + Math.sin(t) * r * 0.9] as const;
  });
  return (
    <g>
      {pts.map(([px, py], i) => (
        <circle key={i} cx={f2(px)} cy={f2(py)} r={r * 0.62} fill={petal} stroke={INK} strokeWidth={1.4} />
      ))}
      <circle cx={x} cy={y} r={r * 0.46} fill={center} stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

function OxButton({ x, y, r = 3.6, fill = C.honey }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={INK} strokeWidth={2} />
      <circle cx={x - r * 0.28} cy={y - r * 0.28} r={r * 0.28} fill={C.cream} opacity={0.85} />
    </g>
  );
}

function OxMoon({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y - 8 * s} A${8 * s} ${8 * s} 0 1 0 ${x + 8 * s} ${y + 4 * s} A${6.2 * s} ${6.2 * s} 0 1 1 ${x} ${y - 8 * s}Z`}
      fill={C.honeySoft}
      stroke={INK}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  );
}

/* ───────────────────────── 1. Piyama bintang ───────────────────────── */

function OxPajamasClipped() {
  return (
    <g>
      <OxBase fill={OX_K.skyPj} shade={OX_K.skyPjDark} so={0.55} />
      <rect x={100} y={328} width={200} height={18} fill={C.cream} />
      <path d="M100 328 H300 M100 346 H300" stroke={INK} strokeWidth={2.4} />
      <path d="M100 333 H300" stroke={OX_K.skyPjDark} strokeWidth={2} opacity={0.7} />
      <path d="M200 262 V328" stroke={C.cream} strokeWidth={4} />
      <path d="M200 262 V328" stroke={INK} strokeWidth={1.4} strokeDasharray="1 7" strokeLinecap="round" opacity={0.5} />
      {[282, 302, 320].map((y) => (
        <OxButton key={y} x={200} y={y} r={3.4} fill={C.cream} />
      ))}
      <polygon points={starPoints(142, 280, 8, 3.4)} fill={C.honey} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <polygon points={starPoints(160, 312, 6, 2.6)} fill={C.honeySoft} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <polygon points={starPoints(246, 276, 6, 2.6)} fill={C.honeySoft} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <polygon points={starPoints(262, 312, 8, 3.4)} fill={C.honey} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <OxMoon x={236} y={304} s={1.05} />
      <OxMoon x={120} y={304} s={0.8} />
      <circle cx={170} cy={292} r={2} fill={C.cream} />
      <circle cx={232} cy={324} r={2} fill={C.cream} />
      <circle cx={126} cy={266} r={2} fill={C.cream} />
      <ellipse cx={200} cy={252} rx={34} ry={13} fill={C.cream} stroke={INK} strokeWidth={2.6} />
      <path d="M170 254 Q200 266 230 254" fill="none" stroke={OX_K.skyPjDark} strokeWidth={2} />
      <path d="M124 262 Q116 292 124 316" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
      <Hl d="M130 266 Q142 258 162 258" w={3} o={0.5} />
    </g>
  );
}

/* ───────────────────────── 2. Overall jeans ───────────────────────── */

function OxOverallsClipped() {
  return (
    <g>
      {/* kaus belang di balik overall */}
      <rect x={100} y={246} width={200} height={100} fill={C.cream} />
      {[252, 266, 280].map((y) => (
        <rect key={y} x={100} y={y} width={200} height={7} fill={C.skySoft} />
      ))}
      <path d="M244 250 Q272 296 264 346 H300 V248Z" fill={C.sky} opacity={0.18} />
      {/* celana + dada overall */}
      <path d="M152 262 H248 V298 L284 306 V346 H116 V306 L152 298Z" fill={OX_K.denim} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M248 262 V298 L284 306 V346 H252Z" fill={OX_K.denimDark} opacity={0.5} />
      <path d="M152 298 H248" stroke={INK} strokeWidth={2.2} opacity={0.5} />
      <path d="M158 270 V292 M242 270 V292" stroke={OX_K.denimLight} strokeWidth={2.4} strokeDasharray="4 4" strokeLinecap="round" />
      <path d="M200 304 V344" stroke={INK} strokeWidth={2.2} opacity={0.4} />
      <path d="M124 312 V340 M276 312 V340" stroke={OX_K.denimLight} strokeWidth={2.4} strokeDasharray="4 4" strokeLinecap="round" />
      {/* kantong dada */}
      <path d="M176 276 H224 V302 Q200 310 176 302Z" fill={OX_K.denimDark} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M176 276 H224" stroke={OX_K.denimLight} strokeWidth={2.4} />
      <path d="M182 284 H218" stroke={OX_K.denimLight} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />
      <polygon points={starPoints(200, 292, 5.6, 2.4)} fill={C.honey} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      {/* tali bahu */}
      <path d="M152 262 L146 246 H164 L164 262Z" fill={OX_K.denim} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M248 262 L254 246 H236 L236 262Z" fill={OX_K.denimDark} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <OxButton x={158} y={270} r={4.4} />
      <OxButton x={242} y={270} r={4.4} />
      <Hl d="M122 318 V336" w={3} o={0.45} />
    </g>
  );
}

/* ───────────────────────── 3. Jas hujan kuning ───────────────────────── */

function OxRaincoatClipped() {
  return (
    <g>
      <OxBase fill={OX_K.yellow} shade={OX_K.yellowDark} so={0.5} />
      <rect x={100} y={330} width={200} height={16} fill={OX_K.yellowDark} opacity={0.55} />
      <path d="M100 330 H300 M100 346 H300" stroke={INK} strokeWidth={2.4} />
      <path d="M200 262 V346" stroke={INK} strokeWidth={2.6} />
      <path d="M200 262 V346" stroke={OX_K.yellowDark} strokeWidth={9} opacity={0.35} />
      {[278, 300, 322].map((y) => (
        <g key={y}>
          <path d={`M194 ${y} Q186 ${y - 5} 189 ${y + 4}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          <rect x={196} y={y - 4} width={14} height={8} rx={4} fill={OX_K.brown} stroke={INK} strokeWidth={2.2} />
        </g>
      ))}
      {/* kantong */}
      <path d="M126 304 H168 V332 H126Z" fill={OX_K.yellowDark} opacity={0.5} />
      <path d="M126 304 H168 V332 H126Z" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M126 304 H168 L164 314 H130Z" fill={OX_K.yellow} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M232 304 H274 V332 H232Z" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M232 304 H274 L270 314 H236Z" fill={OX_K.yellow} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M122 262 Q114 290 122 318" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
      <Hl d="M130 268 Q124 288 128 296" w={3.2} o={0.7} />
      <circle cx={158} cy={280} r={2} fill={C.cream} opacity={0.7} />
      <circle cx={246} cy={284} r={2} fill={C.cream} opacity={0.5} />
    </g>
  );
}

function OxRaincoatOverlay() {
  return (
    <g>
      <path d="M118 262 Q130 244 200 252 Q270 244 282 262 Q292 286 264 294 Q200 310 136 294 Q108 286 118 262Z" fill={OX_K.yellow} {...O} />
      <path d="M154 264 Q200 286 246 264 Q238 252 200 250 Q162 252 154 264Z" fill={OX_K.yellowDark} {...O25} />
      <Hl d="M128 272 Q134 262 156 258" w={3.2} o={0.7} />
      <path d="M190 288 Q188 302 192 316 M210 288 Q212 302 208 316" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={192} cy={318} r={3.8} fill={C.cream} {...O25} />
      <circle cx={208} cy={318} r={3.8} fill={C.cream} {...O25} />
    </g>
  );
}

/* ───────────────────────── 4. Terusan bunga ───────────────────────── */

function OxSundressClipped() {
  return (
    <g>
      {/* kain terusan mulai di bawah leher (bahu terbuka) */}
      <path d="M100 268 Q150 292 200 280 Q250 292 300 268 V346 H100Z" fill={C.peachSoft} />
      <path d="M246 282 Q274 310 264 346 H300 V268Z" fill={C.peach} opacity={0.4} />
      <path d="M104 266 Q150 290 200 278 Q250 290 296 266" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      {/* tali bahu */}
      <path d="M150 250 L158 282" stroke={C.peachDark} strokeWidth={7} strokeLinecap="round" />
      <path d="M150 250 L158 282" stroke={INK} strokeWidth={9.6} strokeLinecap="round" opacity={0} />
      <path d="M250 250 L242 282" stroke={C.peachDark} strokeWidth={7} strokeLinecap="round" />
      <path d="M150 250 L158 282 M250 250 L242 282" fill="none" stroke={C.peach} strokeWidth={3} strokeLinecap="round" />
      {/* ikat pinggang */}
      <rect x={100} y={306} width={200} height={14} fill={C.peach} />
      <path d="M100 306 H300 M100 320 H300" stroke={INK} strokeWidth={2.4} />
      <Hl d="M112 311 H170" w={3} o={0.5} />
      {/* bunga cetak */}
      <OxFlower x={136} y={288} r={6.4} petal={C.cream} />
      <OxFlower x={176} y={300} r={5.4} petal={C.taroSoft} center={C.honeySoft} />
      <OxFlower x={232} y={292} r={6.4} petal={C.cream} />
      <OxFlower x={268} y={300} r={5.4} petal={C.taroSoft} center={C.honeySoft} />
      <OxFlower x={120} y={332} r={5.4} petal={C.taroSoft} center={C.honeySoft} />
      <OxFlower x={168} y={336} r={6.4} petal={C.cream} />
      <OxFlower x={232} y={336} r={6.4} petal={C.cream} />
      <OxFlower x={280} y={332} r={5.4} petal={C.taroSoft} center={C.honeySoft} />
      <g fill={OX_K.leaf} stroke={INK} strokeWidth={1.3}>
        <ellipse cx={150} cy={296} rx={4.4} ry={2.2} />
        <ellipse cx={250} cy={300} rx={4.4} ry={2.2} />
        <ellipse cx={200} cy={340} rx={4.4} ry={2.2} />
      </g>
      <Hl d="M112 280 Q114 296 118 302" w={3} o={0.5} />
    </g>
  );
}

function OxSundressOverlay() {
  return (
    <g>
      <path d="M134 316 Q92 338 86 358 H314 Q308 338 266 316Z" fill={C.peachSoft} {...O} />
      <path d="M262 318 Q300 338 306 356 H262Z" fill={C.peach} opacity={0.4} />
      <path d="M170 322 Q158 342 150 358 M200 324 V358 M230 322 Q242 342 250 358" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.28} />
      <path d={`${oxScallop(86, 314, 354, 22.8, 9)} V352 H86Z`} fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <OxFlower x={116} y={338} r={5.6} petal={C.cream} />
      <OxFlower x={152} y={346} r={5} petal={C.taroSoft} center={C.honeySoft} />
      <OxFlower x={250} y={346} r={5} petal={C.taroSoft} center={C.honeySoft} />
      <OxFlower x={286} y={338} r={5.6} petal={C.cream} />
      <Hl d="M104 342 Q110 332 124 328" w={3} o={0.6} />
    </g>
  );
}

/* ───────────────────────── 5. Seragam koki ───────────────────────── */

function OxChefClipped() {
  return (
    <g>
      <OxBase fill={OX_K.white} shade={OX_K.whiteDark} so={0.9} />
      <rect x={100} y={330} width={200} height={16} fill={OX_K.whiteDark} opacity={0.7} />
      <path d="M100 330 H300" stroke={INK} strokeWidth={2.4} />
      {/* lipatan dua baris */}
      <path d="M176 252 L226 346" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M168 254 L200 304 L232 254 L218 250 L200 270 L182 250Z" fill={OX_K.white} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M200 304 V346" stroke={INK} strokeWidth={2.4} opacity={0.5} />
      {[[184, 286], [184, 306], [184, 326], [216, 286], [216, 306], [216, 326]].map(([x, y]) => (
        <OxButton key={`${x}-${y}`} x={x} y={y} r={4} fill={OX_K.silver} />
      ))}
      {/* syal merah kecil */}
      <path d="M176 250 L224 250 L212 278 Q200 284 188 278Z" fill={OX_K.red} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M200 252 L200 278" stroke={OX_K.redDark} strokeWidth={2} opacity={0.6} />
      {/* kantong */}
      <path d="M126 292 H156 V316 H126Z" fill={OX_K.whiteDark} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" opacity={0.95} />
      <path d="M134 292 V280" stroke={OX_K.red} strokeWidth={4} strokeLinecap="round" />
      {/* lap kain kotak-kotak */}
      <path d="M254 308 H280 V346 H254Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M254 318 H280 M254 328 H280 M262 308 V346 M271 308 V346" stroke={C.skySoft} strokeWidth={4} />
      <path d="M254 308 H280 V346 H254Z" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Hl d="M122 268 Q120 290 124 314" w={3} o={0.7} />
    </g>
  );
}

/* ───────────────────────── 6. Jersey sepak bola ───────────────────────── */

function OxJerseyClipped() {
  return (
    <g>
      <OxBase fill={OX_K.red} shade={OX_K.redDark} so={0.55} />
      {/* strip putih samping */}
      <path d="M100 246 H124 V346 H100Z" fill={C.cream} />
      <path d="M276 246 H300 V346 H276Z" fill={C.cream} />
      <path d="M124 246 V346 M276 246 V346" stroke={INK} strokeWidth={2.4} />
      <rect x={124} y={330} width={152} height={16} fill={OX_K.redDark} opacity={0.7} />
      <path d="M100 330 H300" stroke={INK} strokeWidth={2.4} />
      <path d="M100 338 H300" stroke={C.cream} strokeWidth={3.2} />
      {/* kerah v */}
      <path d="M166 248 L200 288 L234 248 L222 244 L200 268 L178 244Z" fill={C.cream} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      {/* nomor 10 */}
      <path d="M180 296 L188 289 V320" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={216} cy={304} rx={10} ry={15} fill="none" stroke={INK} strokeWidth={10} />
      <path d="M180 296 L188 289 V320" fill="none" stroke={C.cream} strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={216} cy={304} rx={10} ry={15} fill="none" stroke={C.cream} strokeWidth={5.4} />
      <Hl d="M132 266 Q134 292 136 316" w={3} o={0.45} />
    </g>
  );
}

/* ───────────────────────── 7. Seragam pelaut ───────────────────────── */

function OxSailorClipped() {
  return (
    <g>
      <OxBase fill={OX_K.white} shade={OX_K.whiteDark} so={0.9} />
      {/* ikat pinggang rok */}
      <rect x={100} y={316} width={200} height={30} fill={OX_K.navy} />
      <path d="M244 318 Q268 330 264 346 H300 V316Z" fill={OX_K.navyDark} opacity={0.5} />
      <path d="M100 316 H300" stroke={INK} strokeWidth={2.6} />
      <path d="M100 322 H300" stroke={C.cream} strokeWidth={2.4} />
      {/* kerah pelaut besar */}
      <path d="M104 254 Q150 262 176 248 L200 296 L224 248 Q250 262 296 254 L296 270 Q240 292 200 312 Q160 292 104 270Z" fill={OX_K.navy} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M116 262 Q150 270 182 256 M118 272 Q152 280 188 266" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M284 262 Q250 270 218 256 M282 272 Q248 280 212 266" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M184 252 L200 290 L216 252Z" fill={OX_K.white} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <Hl d="M114 258 Q130 262 150 258" w={3} o={0.35} />
      {/* pita merah */}
      <path d="M200 292 L178 282 Q170 296 178 308Z" fill={OX_K.red} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M200 292 L222 282 Q230 296 222 308Z" fill={OX_K.red} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M200 296 L190 326 M200 296 L210 326" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={200} cy={294} r={5.6} fill={OX_K.redDark} stroke={INK} strokeWidth={2.2} />
    </g>
  );
}

function OxSailorOverlay() {
  return (
    <g>
      <path d="M130 316 Q88 336 84 358 H316 Q312 336 270 316Z" fill={OX_K.navy} {...O} />
      <path d="M262 318 Q302 336 306 356 H262Z" fill={OX_K.navyDark} opacity={0.5} />
      <path d="M118 326 L98 358 M144 322 L132 358 M172 322 L168 358 M200 322 V358 M228 322 L232 358 M256 322 L268 358 M282 326 L302 358" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.45} />
      <path d="M86 349 Q200 357 314 349 V357 Q200 365 86 357Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Hl d="M100 338 Q108 330 124 326" w={3} o={0.4} />
    </g>
  );
}

/* ───────────────────────── 8. Kemeja Hawaii ───────────────────────── */

function OxHibiscus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const petals = [0, 72, 144, 216, 288].map((a) => {
    const t = (a - 90) * (Math.PI / 180);
    return [x + Math.cos(t) * 6.4 * s, y + Math.sin(t) * 6.4 * s] as const;
  });
  return (
    <g>
      {petals.map(([px, py], i) => (
        <circle key={i} cx={f2(px)} cy={f2(py)} r={5.2 * s} fill={C.peach} stroke={INK} strokeWidth={1.4} />
      ))}
      <circle cx={x} cy={y} r={3 * s} fill={C.honey} stroke={INK} strokeWidth={1.2} />
      <path d={`M${x} ${y} L${x + 7 * s} ${y - 6 * s}`} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function OxPalm({ x, y, flip = 1 }: { x: number; y: number; flip?: 1 | -1 }) {
  return (
    <g>
      <path d={`M${x} ${y} Q${x + 12 * flip} ${y - 12} ${x + 24 * flip} ${y - 8} Q${x + 14 * flip} ${y} ${x} ${y}Z`} fill={OX_K.leaf} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={`M${x} ${y} Q${x + 8 * flip} ${y + 10} ${x + 20 * flip} ${y + 12} Q${x + 12 * flip} ${y + 2} ${x} ${y}Z`} fill={OX_K.leafDark} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

function OxHawaiianClipped() {
  return (
    <g>
      <OxBase fill={OX_K.teal} shade={OX_K.tealDark} so={0.5} />
      <rect x={100} y={332} width={200} height={14} fill={OX_K.tealDark} opacity={0.5} />
      <path d="M100 332 H300" stroke={INK} strokeWidth={2.4} />
      {/* kaus dalam krem pada belahan */}
      <path d="M176 248 L200 300 L224 248Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M200 300 V346" stroke={INK} strokeWidth={2.4} opacity={0.55} />
      <OxHibiscus x={140} y={284} />
      <OxPalm x={116} y={316} />
      <OxHibiscus x={162} y={326} s={0.8} />
      <OxHibiscus x={252} y={282} s={0.9} />
      <OxPalm x={284} y={314} flip={-1} />
      <OxHibiscus x={240} y={328} />
      <OxButton x={200} y={316} r={3.4} fill={C.cream} />
      <OxButton x={200} y={334} r={3.4} fill={C.cream} />
      <Hl d="M122 266 Q120 288 124 306" w={3} o={0.4} />
    </g>
  );
}

function OxHawaiianOverlay() {
  return (
    <g>
      <path d="M130 250 Q168 240 200 252 L196 288 L168 270 Z" fill={OX_K.tealLight} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M270 250 Q232 240 200 252 L204 288 L232 270 Z" fill={OX_K.teal} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <Hl d="M142 252 Q160 248 178 256" w={3} o={0.6} />
    </g>
  );
}

/* ───────────────────────── 9. Kebaya modern ───────────────────────── */

function OxBatikBand({ y0, y1 }: { y0: number; y1: number }) {
  const rows = Math.max(1, Math.round((y1 - y0) / 12));
  const cells: ReactElement[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cx = 108 + c * 24 + (r % 2) * 12;
      const cy = y0 + 6 + r * 12;
      cells.push(<circle key={`${r}-${c}`} cx={cx} cy={cy} r={5.2} fill="none" stroke={OX_K.gold} strokeWidth={1.6} />);
      cells.push(<circle key={`d${r}-${c}`} cx={cx} cy={cy} r={1.5} fill={C.cream} />);
    }
  }
  return (
    <g>
      <rect x={100} y={y0} width={200} height={y1 - y0} fill={OX_K.brown} />
      {cells}
    </g>
  );
}

function OxKebayaClipped() {
  return (
    <g>
      <OxBase fill={OX_K.lav} shade={OX_K.lavDark} so={0.5} />
      {/* sarung batik di pinggang */}
      <OxBatikBand y0={316} y1={346} />
      <path d="M244 318 Q268 330 264 346 H300 V316Z" fill={OX_K.brownDark} opacity={0.45} />
      <path d="M100 316 H300" stroke={INK} strokeWidth={2.6} />
      <path d="M100 346 H300" stroke={INK} strokeWidth={2.4} />
      {/* bukaan depan */}
      <path d="M200 262 V316" stroke={INK} strokeWidth={2.6} />
      {/* renda tepi bukaan */}
      <path d="M196 268 q-6 5 0 10 q-6 5 0 10 q-6 5 0 10 q-6 5 0 10 q-6 5 0 10" fill="none" stroke={C.cream} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M204 268 q6 5 0 10 q6 5 0 10 q6 5 0 10 q6 5 0 10 q6 5 0 10" fill="none" stroke={C.cream} strokeWidth={4.4} strokeLinecap="round" />
      {/* leher V berenda */}
      <path d="M142 248 Q170 262 196 284 M258 248 Q230 262 204 284" fill="none" stroke={C.cream} strokeWidth={7} strokeLinecap="round" />
      {/* motif bunga halus */}
      <g fill={C.cream} opacity={0.85}>
        <circle cx={140} cy={286} r={2.6} />
        <circle cx={158} cy={304} r={2.6} />
        <circle cx={246} cy={290} r={2.6} />
        <circle cx={262} cy={306} r={2.6} />
        <circle cx={126} cy={308} r={2.6} />
        <circle cx={276} cy={284} r={2.6} />
      </g>
      {/* bros */}
      <circle cx={200} cy={272} r={9} fill={C.honey} stroke={INK} strokeWidth={2.6} />
      <circle cx={200} cy={272} r={4.2} fill={C.peach} stroke={INK} strokeWidth={1.6} />
      <circle cx={194} cy={266} r={1.8} fill={C.cream} />
      {/* manset renda lengan */}
      <Hl d="M124 268 Q120 290 124 308" w={3} o={0.5} />
    </g>
  );
}

function OxKebayaOverlay() {
  return (
    <g>
      <path d="M128 322 Q100 336 98 358 H302 Q300 336 272 322Z" fill={OX_K.brown} {...O} />
      <g fill="none" stroke={OX_K.gold} strokeWidth={1.6}>
        {[116, 140, 164, 188, 212, 236, 260, 284].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 === 0 ? 340 : 348} r={5.2} />
        ))}
        {[128, 152, 176, 200, 224, 248, 272].map((x) => (
          <circle key={x} cx={x} cy={334} r={5.2} />
        ))}
      </g>
      <path d="M262 324 Q298 336 300 356 H264Z" fill={OX_K.brownDark} opacity={0.4} />
      <path d={`${oxScallop(98, 302, 354, 17, 6)} V352 H98Z`} fill={C.cream} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <Hl d="M110 336 Q114 330 126 326" w={3} o={0.5} />
    </g>
  );
}

/* ───────────────────────── 10. Kemeja batik ───────────────────────── */

function OxBatikShirtClipped() {
  const waves: ReactElement[] = [];
  for (let i = -2; i < 8; i += 1) {
    const x0 = 100 + i * 34;
    waves.push(
      <path
        key={i}
        d={`M${x0} 346 q10 -12 22 -4 q10 -14 22 -8 q8 -16 22 -10 q10 -16 22 -12 q8 -16 22 -14 q8 -16 22 -14`}
        fill="none"
        stroke={OX_K.gold}
        strokeWidth={3.6}
        strokeLinecap="round"
        opacity={0.95}
      />,
    );
  }
  return (
    <g>
      <OxBase fill={OX_K.brown} shade={OX_K.brownDark} so={0.5} />
      <g opacity={0.85}>{waves}</g>
      <g fill={C.cream} opacity={0.9}>
        {[[134, 286], [168, 312], [236, 286], [270, 312], [150, 268], [252, 268], [204, 330], [128, 330], [276, 336]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} />
        ))}
      </g>
      <rect x={100} y={332} width={200} height={14} fill={OX_K.brownDark} opacity={0.65} />
      <path d="M100 332 H300" stroke={INK} strokeWidth={2.4} />
      <path d="M100 339 H300" stroke={OX_K.gold} strokeWidth={2.4} />
      {/* plaket tengah */}
      <path d="M200 262 V332" stroke={INK} strokeWidth={2.6} />
      <path d="M194 264 V332 M206 264 V332" stroke={C.cream} strokeWidth={2} opacity={0.5} />
      {[282, 302, 322].map((y) => (
        <OxButton key={y} x={200} y={y} r={3.8} />
      ))}
      {/* kerah mandarin */}
      <path d="M170 250 Q200 270 230 250 L230 262 Q200 282 170 262Z" fill={OX_K.gold} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M176 252 Q200 268 224 252" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
      <path d="M124 262 Q116 290 124 316" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.35} />
      <Hl d="M130 266 Q132 292 134 314" w={3} o={0.4} />
    </g>
  );
}

/* ───────────────────────── 11. Yukata sakura ───────────────────────── */

function OxSakura({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  const petals = [0, 72, 144, 216, 288].map((a) => {
    const t = (a - 90) * (Math.PI / 180);
    return [x + Math.cos(t) * r * 0.85, y + Math.sin(t) * r * 0.85] as const;
  });
  return (
    <g>
      {petals.map(([px, py], i) => (
        <circle key={i} cx={f2(px)} cy={f2(py)} r={r * 0.62} fill={C.peachSoft} stroke={INK} strokeWidth={1.3} />
      ))}
      <circle cx={x} cy={y} r={r * 0.34} fill={C.honey} stroke={INK} strokeWidth={1} />
    </g>
  );
}

function OxYukataClipped() {
  return (
    <g>
      <OxBase fill="#BFE0F7" shade="#8FC1E8" so={0.5} />
      {/* kerah bersilang kiri-ke-kanan */}
      <path d="M170 248 L222 312" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M232 248 L186 312" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M170 248 L222 312 L212 318 L160 252Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M232 248 L186 312 L196 318 L242 252Z" fill="#E7F3FC" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <OxSakura x={132} y={282} r={7} />
      <OxSakura x={156} y={318} r={5.6} />
      <OxSakura x={262} y={286} r={7} />
      <OxSakura x={244} y={322} r={5.6} />
      <OxSakura x={118} y={330} r={5} />
      <OxSakura x={282} y={328} r={5} />
      <g fill="#FF9DB8">
        <circle cx={146} cy={302} r={2} />
        <circle cx={254} cy={304} r={2} />
        <circle cx={140} cy={262} r={2} />
        <circle cx={266} cy={264} r={2} />
      </g>
      {/* obi */}
      <rect x={100} y={310} width={200} height={26} fill="#FF9DB8" />
      <path d="M244 312 Q270 322 264 336 H300 V310Z" fill="#F77AA0" opacity={0.5} />
      <path d="M100 310 H300 M100 336 H300" stroke={INK} strokeWidth={2.6} />
      <path d="M100 323 H300" stroke={C.cream} strokeWidth={2.2} strokeDasharray="5 5" strokeLinecap="round" opacity={0.8} />
      <Hl d="M112 316 H168" w={3} o={0.5} />
      <path d="M100 336 H300 V346 H100Z" fill="#BFE0F7" />
      <path d="M100 346 H300" stroke={INK} strokeWidth={2.4} />
    </g>
  );
}

function OxYukataOverlay() {
  return (
    <g>
      {/* simpul pita obi */}
      <path d="M200 322 L164 304 Q150 322 164 340Z" fill="#FF9DB8" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M200 322 L236 304 Q250 322 236 340Z" fill="#F77AA0" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M200 326 L184 352 L196 350 L200 358 L206 350 L218 352Z" fill="#FF9DB8" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M164 312 Q158 322 164 332" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.75} />
      <rect x={190} y={312} width={20} height={20} rx={7} fill="#FFB6C9" stroke={INK} strokeWidth={2.6} />
      <circle cx={200} cy={322} r={3} fill={C.honey} stroke={INK} strokeWidth={1.4} />
    </g>
  );
}

/* ───────────────────────── 12. Tuksedo dandy ───────────────────────── */

function OxTuxedoClipped() {
  return (
    <g>
      <OxBase fill={OX_K.suit} shade={OX_K.suitDark} so={0.6} />
      {/* kemeja putih */}
      <path d="M170 248 L200 330 L230 248Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M200 262 V330" stroke={OX_K.whiteDark} strokeWidth={2} />
      {[290, 306, 322].map((y) => (
        <circle key={y} cx={200} cy={y} r={2.2} fill={OX_K.suitDark} />
      ))}
      {/* lapel satin */}
      <path d="M162 246 L200 332 L176 252Z" fill={OX_K.suitLight} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M238 246 L200 332 L224 252Z" fill={OX_K.suitLight} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M170 258 L192 304 M230 258 L208 304" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.4} />
      <path d="M100 330 H300 V346 H100Z" fill={OX_K.suitDark} opacity={0.6} />
      <path d="M100 330 H300" stroke={INK} strokeWidth={2.4} />
      {/* kancing */}
      <OxButton x={188} y={336} r={3.6} fill={OX_K.suitLight} />
      {/* saputangan saku */}
      <path d="M130 300 H160" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.55} />
      <path d="M130 292 L140 280 L148 292Z" fill={C.cream} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M133 292 L141 284 L147 292Z" fill={OX_K.red} opacity={0.85} />
      <path d="M116 262 Q110 290 116 318" fill="none" stroke={OX_K.suitLight} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    </g>
  );
}

function OxTuxedoOverlay() {
  return (
    <g>
      <path d="M200 280 L178 270 Q170 282 178 294Z" fill={OX_K.red} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M200 280 L222 270 Q230 282 222 294Z" fill={OX_K.redDark} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M178 275 Q174 282 178 288" fill="none" stroke={OX_K.redLight} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={193} y={274} width={14} height={13} rx={5} fill={OX_K.red} stroke={INK} strokeWidth={2.6} />
    </g>
  );
}

/* ───────────────────────── 13. Tutu balerina ───────────────────────── */

function OxTutuClipped() {
  return (
    <g>
      <OxBase fill={C.peachSoft} shade={OX_K.pinkDark} so={0.0} />
      <rect x={100} y={246} width={200} height={100} fill={OX_K.pink} />
      <path d="M246 250 Q274 296 264 346 H300 V248Z" fill={OX_K.pinkDark} opacity={0.45} />
      {/* garis leher hati */}
      <path d="M140 264 Q170 286 200 270 Q230 286 260 264" fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" />
      {/* pita menyilang di dada */}
      <path d="M160 270 L240 306 M240 270 L160 306" stroke={C.cream} strokeWidth={4.6} strokeLinecap="round" />
      <path d="M160 270 L240 306 M240 270 L160 306" stroke={OX_K.pinkDark} strokeWidth={1.8} strokeLinecap="round" strokeDasharray="1 6" />
      {/* tali pundak */}
      <path d="M150 250 V266 M250 250 V266" stroke={C.cream} strokeWidth={6} strokeLinecap="round" />
      {/* ikat pinggang */}
      <rect x={100} y={312} width={200} height={12} fill={C.cream} />
      <path d="M100 312 H300 M100 324 H300" stroke={INK} strokeWidth={2.4} />
      <circle cx={200} cy={318} r={5.6} fill={OX_K.pinkDark} stroke={INK} strokeWidth={2.2} />
      <circle cx={198} cy={316} r={1.8} fill={C.cream} />
      <Hl d="M122 268 Q120 288 124 304" w={3} o={0.55} />
      <rect x={100} y={324} width={200} height={22} fill={OX_K.pinkDark} opacity={0.5} />
    </g>
  );
}

function OxTutuOverlay() {
  const skirt = (half: number, yb: number, fill: string, wave: number) => {
    const sc = oxScallop(200 - half, 200 + half, yb, wave, 7).replace(/^M\S+ \S+/, "");
    return (
      <path
        d={`M${200 - 54} 320 Q${200 - half + 4} ${yb - 22} ${200 - half} ${yb}${sc} Q${200 + half - 4} ${yb - 22} ${200 + 54} 320Z`}
        fill={fill}
        {...O}
      />
    );
  };
  return (
    <g>
      {skirt(112, 352, OX_K.pinkDark, 18.6)}
      {skirt(100, 346, OX_K.pink, 16.7)}
      {skirt(86, 340, OX_K.pinkLight, 14.3)}
      <path d="M154 326 Q140 336 132 344 M184 330 Q180 340 178 346 M216 330 Q220 340 222 346 M246 326 Q260 336 268 344" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.28} />
      <Hl d="M122 338 Q130 330 144 328" w={3} o={0.75} />
      <Sparkle x={96} y={336} size={6} color={C.cream} delay={0.3} />
      <Sparkle x={304} y={344} size={7} color={C.honeySoft} delay={1.1} />
    </g>
  );
}

/* ───────────────────────── 14. Pahlawan super ───────────────────────── */

function OxHeroBack() {
  return (
    <motion.g style={fb(0.5, 0)} animate={{ rotate: [-2.5, 2.5, -2.5] }} transition={loop(2.8)}>
      <path d="M118 254 Q84 304 84 356 Q142 346 200 358 Q258 346 316 356 Q316 304 282 254Z" fill={OX_K.red} {...O} />
      <path d="M200 262 V356 M150 262 Q132 312 132 350 M250 262 Q268 312 268 350" fill="none" stroke={OX_K.redDark} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
      <path d="M86 346 Q142 338 200 350 Q258 338 314 346" fill="none" stroke={OX_K.yellow} strokeWidth={5} strokeLinecap="round" />
      <Hl d="M104 290 Q98 318 100 336" w={3.4} o={0.4} />
    </motion.g>
  );
}

function OxHeroClipped() {
  return (
    <g>
      <OxBase fill={OX_K.denim} shade={OX_K.denimDark} so={0.55} />
      <rect x={100} y={246} width={200} height={100} fill="#3E8EDE" />
      <path d="M246 250 Q274 296 264 346 H300 V248Z" fill="#2B6DB8" opacity={0.55} />
      {/* celana merah */}
      <path d="M100 326 H300 V346 H100Z" fill={OX_K.red} />
      <path d="M100 326 H300" stroke={INK} strokeWidth={2.4} />
      {/* ikat pinggang emas */}
      <rect x={100} y={314} width={200} height={12} fill={OX_K.yellow} />
      <path d="M100 314 H300" stroke={INK} strokeWidth={2.4} />
      <rect x={186} y={311} width={28} height={18} rx={5} fill={OX_K.yellowLight} stroke={INK} strokeWidth={2.6} />
      <polygon points={starPoints(200, 320, 6, 2.6)} fill={OX_K.red} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      {/* lambang bintang */}
      <path d="M200 270 L228 280 Q228 304 200 318 Q172 304 172 280Z" fill={OX_K.yellow} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M200 278 L222 285 Q222 300 200 311 Q178 300 178 285Z" fill={OX_K.red} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <polygon points={starPoints(200, 294, 10, 4.4)} fill={OX_K.yellowLight} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      {/* manset merah */}
      <Hl d="M130 266 Q126 288 130 306" w={3.2} o={0.5} />
    </g>
  );
}

function OxHeroOverlay() {
  return (
    <g>
      {/* kerah merah + pengait jubah */}
      <path d="M126 252 Q160 240 200 252 Q240 240 274 252 Q276 268 262 270 Q200 286 138 270 Q124 268 126 252Z" fill={OX_K.red} {...O} />
      <Hl d="M136 258 Q150 250 174 252" w={3} o={0.55} />
      <circle cx={146} cy={262} r={6.4} fill={OX_K.yellow} stroke={INK} strokeWidth={2.4} />
      <circle cx={254} cy={262} r={6.4} fill={OX_K.yellow} stroke={INK} strokeWidth={2.4} />
      <circle cx={144} cy={260} r={2} fill={C.cream} />
      <circle cx={252} cy={260} r={2} fill={C.cream} />
    </g>
  );
}

/* ───────────────────────── 15. Zirah kesatria ───────────────────────── */

function OxKnightClipped() {
  return (
    <g>
      <OxBase fill={OX_K.silver} shade={OX_K.silverDark} so={0.6} />
      {/* pelat dada */}
      <path d="M200 252 V346" stroke={INK} strokeWidth={2.6} />
      <path d="M104 262 Q150 296 200 292 Q250 296 296 262" fill="none" stroke={OX_K.silverDark} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d="M110 308 Q200 322 290 308" fill="none" stroke={OX_K.silverDark} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d="M100 330 H300 V346 H100Z" fill={OX_K.silverDark} opacity={0.5} />
      <path d="M100 330 H300" stroke={INK} strokeWidth={2.4} />
      {/* tabard merah */}
      <path d="M170 300 H230 L236 346 H164Z" fill={OX_K.red} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M214 302 L228 346 H236 L230 300Z" fill={OX_K.redDark} opacity={0.5} />
      <path d="M170 300 H230" stroke={OX_K.yellow} strokeWidth={4.4} />
      <path d="M174 340 H226" stroke={OX_K.yellow} strokeWidth={4} strokeLinecap="round" />
      {/* lambang perisai berisi singa sederhana */}
      <path d="M200 308 L218 312 Q218 328 200 336 Q182 328 182 312Z" fill={OX_K.yellow} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={200} cy={320} r={6.2} fill={OX_K.yellowDark} stroke={INK} strokeWidth={1.6} />
      <path d="M194 316 L192 311 L197 314 L200 310 L203 314 L208 311 L206 316" fill={OX_K.yellowLight} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <circle cx={198} cy={319} r={1} fill={INK} />
      <circle cx={202} cy={319} r={1} fill={INK} />
      <path d="M198 323 Q200 325 202 323" fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
      {/* paku keling */}
      {[[130, 276], [270, 276], [150, 300], [250, 300], [128, 326], [272, 326]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={3.4} fill={OX_K.silverDark} stroke={INK} strokeWidth={1.8} />
          <circle cx={x - 1} cy={y - 1} r={1} fill={C.cream} />
        </g>
      ))}
      <path d="M156 252 Q200 270 244 252" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <Hl d="M128 262 Q124 284 128 300" w={3.4} o={0.9} />
      <Hl d="M160 266 Q168 276 178 280" w={3} o={0.7} />
    </g>
  );
}

function OxKnightOverlay() {
  const pad = (cx: number, flip: 1 | -1) => (
    <g>
      <path d={`M${cx - 20} 262 Q${cx - 22} 244 ${cx} 244 Q${cx + 22} 244 ${cx + 20} 262 Q${cx + 22} 282 ${cx} 284 Q${cx - 22} 282 ${cx - 20} 262Z`} fill={OX_K.silver} {...O} />
      <path d={`M${cx - 14} 252 Q${cx} 248 ${cx + 14} 252 M${cx - 17} 264 Q${cx} 260 ${cx + 17} 264 M${cx - 14} 276 Q${cx} 272 ${cx + 14} 276`} fill="none" stroke={OX_K.silverDark} strokeWidth={2.4} strokeLinecap="round" />
      <path d={`M${cx - 12 * flip} 250 Q${cx - 16 * flip} 262 ${cx - 12 * flip} 274`} fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
      <circle cx={cx} cy={264} r={3} fill={OX_K.silverDark} stroke={INK} strokeWidth={1.6} />
    </g>
  );
  return (
    <g>
      {pad(120, 1)}
      {pad(280, -1)}
      {/* jambul merah di pundak kanan */}
      <g>
        <path d="M280 246 Q290 224 304 226 Q300 240 292 248Z" fill={OX_K.red} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M278 246 Q282 226 292 220 Q292 236 286 248Z" fill={OX_K.redLight} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <path d="M276 248 Q272 230 280 220 Q284 236 282 248Z" fill={OX_K.redDark} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      </g>
      {/* gorget */}
      <path d="M150 254 Q200 276 250 254 L246 266 Q200 288 154 266Z" fill={OX_K.silver} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <Hl d="M160 262 Q184 274 210 274" w={3} o={0.9} />
    </g>
  );
}

/* ───────────────────────── 16. Jas dokter ───────────────────────── */

function OxDoctorClipped() {
  return (
    <g>
      <OxBase fill={OX_K.teal} shade={OX_K.tealDark} so={0.5} />
      {/* jas putih terbuka */}
      <path d="M100 246 L170 250 L192 312 L186 346 H100Z" fill={OX_K.white} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M300 246 L230 250 L208 312 L214 346 H300Z" fill={OX_K.whiteDark} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      {/* v-neck scrub */}
      <path d="M172 250 L200 304 L228 250Z" fill={OX_K.tealLight} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M180 252 L200 290 L220 252" fill="none" stroke={OX_K.teal} strokeWidth={3} strokeLinecap="round" />
      {/* kerah jas */}
      <path d="M156 248 L196 300 L176 252Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M244 248 L204 300 L224 252Z" fill={OX_K.whiteDark} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      {/* saku + pena */}
      <path d="M118 308 H152 V336 H118Z" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M118 308 H152 L148 316 H122Z" fill={OX_K.whiteDark} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M130 308 V298" stroke={OX_K.red} strokeWidth={4} strokeLinecap="round" />
      <path d="M138 308 V300" stroke={C.sky} strokeWidth={4} strokeLinecap="round" />
      {/* lencana nama + palang merah */}
      <rect x={230} y={290} width={30} height={20} rx={4} fill={C.cream} stroke={INK} strokeWidth={2.4} />
      <path d="M241 296 H249 M245 292 V300" stroke={OX_K.red} strokeWidth={3.4} strokeLinecap="round" transform="translate(-1 3)" style={SVG_ATTR_ORIGIN} />
      <path d="M236 307 H254" stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
      <Hl d="M112 262 Q110 286 114 302" w={3} o={0.6} />
    </g>
  );
}

function OxDoctorOverlay() {
  return (
    <g>
      {/* stetoskop */}
      <path d="M164 266 Q156 316 196 328 Q238 318 236 266" fill="none" stroke={INK} strokeWidth={6.4} strokeLinecap="round" />
      <path d="M164 266 Q156 316 196 328 Q238 318 236 266" fill="none" stroke="#6B6F7D" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M170 280 Q166 304 180 316" fill="none" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
      <circle cx={196} cy={332} r={8.4} fill={OX_K.silver} stroke={INK} strokeWidth={2.6} />
      <circle cx={196} cy={332} r={4.2} fill={OX_K.silverDark} stroke={INK} strokeWidth={1.6} />
      <circle cx={193} cy={329} r={1.6} fill={C.cream} />
      <circle cx={164} cy={264} r={3} fill={OX_K.silver} stroke={INK} strokeWidth={1.8} />
      <circle cx={236} cy={264} r={3} fill={OX_K.silver} stroke={INK} strokeWidth={1.8} />
    </g>
  );
}

/* ───────────────────────── Registry ───────────────────────── */

const OUTFIT_REG: Record<string, OutfitArt> = {
  outfit_pajamas_star: { Clipped: OxPajamasClipped },
  outfit_denim_overalls: { Clipped: OxOverallsClipped },
  outfit_raincoat_yellow: { Clipped: OxRaincoatClipped, Overlay: OxRaincoatOverlay },
  outfit_sundress_floral: { Clipped: OxSundressClipped, Overlay: OxSundressOverlay },
  outfit_chef_coat: { Clipped: OxChefClipped },
  outfit_soccer_jersey: { Clipped: OxJerseyClipped },
  outfit_sailor_school: { Clipped: OxSailorClipped, Overlay: OxSailorOverlay },
  outfit_hawaiian_shirt: { Clipped: OxHawaiianClipped, Overlay: OxHawaiianOverlay },
  outfit_kebaya_modern: { Clipped: OxKebayaClipped, Overlay: OxKebayaOverlay },
  outfit_batik_shirt: { Clipped: OxBatikShirtClipped },
  outfit_yukata_sakura: { Clipped: OxYukataClipped, Overlay: OxYukataOverlay },
  outfit_tuxedo_dapper: { Clipped: OxTuxedoClipped, Overlay: OxTuxedoOverlay },
  outfit_ballet_tutu: { Clipped: OxTutuClipped, Overlay: OxTutuOverlay },
  outfit_hero_cape: { Back: OxHeroBack, Clipped: OxHeroClipped, Overlay: OxHeroOverlay },
  outfit_knight_armor: { Clipped: OxKnightClipped, Overlay: OxKnightOverlay },
  outfit_doctor_coat: { Clipped: OxDoctorClipped, Overlay: OxDoctorOverlay },
};
/* ═════════════════════════════════════════════════════════════
 *  ITEM KOSMETIK TAMBAHAN: WAJAH (14) · LEHER (12)
 *  Registry: FACE_REG, NECK_REG (+ tabel viewBox pratinjau FACE_BOX_X / NECK_BOX_X)
 * ═════════════════════════════════════════════════════════════ */

const FNX = {
  brown: "#8A5A3B",
  brownDark: "#5E3B26",
  brownLight: "#B58157",
  pinkSoft: "#FFC2D1",
  pink: "#FF9FB5",
  pinkHot: "#FF6F9C",
  teal: "#2FA6A0",
  tealSoft: "#8FE3DA",
  navy: "#2E3A59",
  cyan: "#4FE3F5",
  cyanDark: "#1FB6D1",
  shell: "#FFF6E0",
  shellDark: "#EBD7B0",
  leather: "#9A6A45",
  leatherDark: "#7A4E30",
  red: "#E8576A",
  redDark: "#C73D52",
  white: "#FFFEFA",
  whiteShade: "#E4EBF5",
  mint: "#8FE3CF",
  mintDark: "#55BFA6",
  hibiscus: "#FF6F8E",
  leaf: "#6FCF4A",
  leafDark: "#46A302",
  black: "#2D2621",
  blackSoft: "#4A403A",
} as const;

/** Titik di sepanjang parabola kalung: dari (-w,-3) ke (+w,-3) dengan lembah sedalam `depth` di tengah. */
const fnxArc = (t: number, w = 52, depth = 40): Pt => [-w + 2 * w * t, -3 + depth * 4 * t * (1 - t)];

/** Daun/bulu runcing: pangkal (cx,cy), menunjuk ke sudut `deg` (0 = kanan, -90 = atas). */
function fnxLeaf(cx: number, cy: number, len: number, w: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const px = -dy;
  const py = dx;
  const tx = cx + dx * len;
  const ty = cy + dy * len;
  const m = len * 0.5;
  return `M${f2(cx)} ${f2(cy)} Q${f2(cx + dx * m + px * w)} ${f2(cy + dy * m + py * w)} ${f2(tx)} ${f2(ty)} Q${f2(cx + dx * m - px * w)} ${f2(cy + dy * m - py * w)} ${f2(cx)} ${f2(cy)}Z`;
}

/** Bentuk hati berpusat di (cx,cy) dengan skala s. */
function fnxHeart(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${f2(cx + x * s)} ${f2(cy + y * s)}`;
  return `M${p(0, 0.9)} C${p(-1.2, -0.1)} ${p(-1.0, -1.0)} ${p(-0.45, -0.95)} C${p(-0.15, -0.92)} ${p(0, -0.65)} ${p(0, -0.45)} C${p(0, -0.65)} ${p(0.15, -0.92)} ${p(0.45, -0.95)} C${p(1.0, -1.0)} ${p(1.2, -0.1)} ${p(0, 0.9)}Z`;
}

/* ═════════════════════════ WAJAH ═════════════════════════ */

function FnxBlushStickers({ half }: { half: number }) {
  const x = half + 18;
  return (
    <g>
      {[-1, 1].map((o) => (
        <g key={o}>
          <circle cx={o * x} cy={23} r={11.5} fill={FNX.pink} {...O25} />
          <circle cx={o * x} cy={23} r={7.6} fill={FNX.pinkHot} opacity={0.55} />
          <path d={fnxHeart(o * x, 23.6, 4.8)} fill={C.cream} {...O2} />
          <circle cx={o * x - 4.4} cy={18.6} r={1.8} fill={C.cream} opacity={0.95} />
          <path d={`M${o * x - 9} ${23} q-1 -5 3.6 -8`} fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
        </g>
      ))}
      <Sparkle x={x + 16} y={10} size={6} color={C.honeySoft} delay={0.2} />
      <Sparkle x={-x - 16} y={34} size={5} color={C.cream} delay={0.9} />
    </g>
  );
}

function FnxFreckles({ half }: { half: number }) {
  const cx = half + 14;
  const dots: [number, number, number][] = [
    [-6, 14, 2.6],
    [4, 20, 2.2],
    [12, 12, 2.4],
    [-1, 28, 2],
    [-14, 24, 2.3],
    [16, 26, 2],
    [-10, 8, 1.8],
  ];
  return (
    <g fill={FNX.brown}>
      {[-1, 1].map((o) => (
        <g key={o}>
          {dots.map(([dx, dy, r]) => (
            <circle key={`${dx}-${dy}`} cx={o * cx + o * dx * 0.9} cy={dy} r={f2(r * 1.2)} />
          ))}
        </g>
      ))}
      {[
        [-5, 6, 1.8],
        [4, 7, 1.8],
        [-1, 11, 1.6],
        [8, 11, 1.4],
        [-9, 11, 1.4],
      ].map(([x, y, r]) => (
        <circle key={`n${x}`} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

function FnxEyelashes({ half }: { half: number }) {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      {[-1, 1].map((o) => {
        const cx = o * half;
        return (
          <g key={o}>
            <path d={`M${cx - o * 14} -12 Q${cx} -19.5 ${cx + o * 14} -13.4`} strokeWidth={3.8} />
            <path d={`M${cx + o * 5} -16.8 Q${cx + o * 8} -23 ${cx + o * 14} -26`} strokeWidth={3.2} />
            <path d={`M${cx + o * 10.4} -15.2 Q${cx + o * 17} -19.6 ${cx + o * 23.4} -19.4`} strokeWidth={3.2} />
            <path d={`M${cx + o * 13.6} -12.6 Q${cx + o * 21} -14.4 ${cx + o * 26} -9`} strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
}

function FnxNerdGlasses({ half }: { half: number }) {
  return (
    <g>
      {[-1, 1].map((o) => (
        <g key={o}>
          <rect x={o * half - 20} y={-18} width={40} height={36} rx={10} fill={C.skySoft} fillOpacity={0.22} />
          <Hl d={`M${o * half - 13} -8 L${o * half - 9} -13`} w={3} o={0.75} />
          <Hl d={`M${o * half - 14} -1 L${o * half - 12} -3`} w={2.4} o={0.6} />
        </g>
      ))}
      <Duo d={`M${-half + 20} -5 Q0 -12 ${half - 20} -5`} inner={FNX.teal} ow={7} iw={3.8} />
      {[-1, 1].map((o) => (
        <g key={`f${o}`}>
          <rect x={o * half - 20} y={-18} width={40} height={36} rx={10} fill="none" stroke={INK} strokeWidth={8} />
          <rect x={o * half - 20} y={-18} width={40} height={36} rx={10} fill="none" stroke={FNX.teal} strokeWidth={4.4} />
          <Duo d={`M${o * (half + 20)} -8 L${o * (half + 34)} -10`} inner={FNX.teal} ow={7} iw={3.8} />
        </g>
      ))}
      <g transform="translate(0 -7) rotate(-14)" style={SVG_ATTR_ORIGIN}>
        <rect x={-8.4} y={-4.6} width={16.8} height={9.2} rx={2.4} fill={C.cream} {...O2} />
        <path d="M-3 -4.6 V4.6 M3 -4.6 V4.6" stroke={C.peachSoft} strokeWidth={2} />
        <path d="M-8.4 0 H8.4" stroke={FNX.shellDark} strokeWidth={1.4} />
      </g>
    </g>
  );
}

function FnxMustacheClassic({ noseDY }: { noseDY: number }) {
  const a = noseDY + 4;
  const d = `M0 ${a} C8 ${a - 6} 24 ${a - 6} 36 ${a + 5} C30 ${a + 15} 17 ${a + 11} 0 ${a + 9} C-17 ${a + 11} -30 ${a + 15} -36 ${a + 5} C-24 ${a - 6} -8 ${a - 6} 0 ${a}Z`;
  return (
    <g>
      <path d={d} fill={FNX.brown} {...O} />
      <path d={`M0 ${a + 9} C-17 ${a + 11} -30 ${a + 15} -36 ${a + 5} C-26 ${a + 6} -12 ${a + 6} 0 ${a + 3} C12 ${a + 6} 26 ${a + 6} 36 ${a + 5} C30 ${a + 15} 17 ${a + 11} 0 ${a + 9}Z`} fill={FNX.brownDark} opacity={0.45} />
      <path d={`M-30 ${a + 2} Q-22 ${a - 3} -10 ${a - 1}`} fill="none" stroke={FNX.brownLight} strokeWidth={2.4} strokeLinecap="round" />
      <path d={`M30 ${a + 2} Q22 ${a - 3} 10 ${a - 1}`} fill="none" stroke={FNX.brownLight} strokeWidth={2.4} strokeLinecap="round" />
      <path d={`M-22 ${a + 7} q-4 3 -9 3 M22 ${a + 7} q4 3 9 3`} fill="none" stroke={FNX.brownDark} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

/** Bingkai cat-eye: sisi luar menunjuk ke atas membentuk sayap. */
function fnxCatEyePath(cx: number, o: 1 | -1): string {
  const p = (dx: number, dy: number) => `${f2(cx + o * dx)} ${f2(dy)}`;
  return `M${p(-18, -3)} C${p(-14, -14)} ${p(8, -17)} ${p(27, -25)} C${p(26, -10)} ${p(23, 6)} ${p(14, 14)} C${p(4, 22)} ${p(-16, 20)} ${p(-19, 8)} C${p(-20, 3)} ${p(-20, -1)} ${p(-18, -3)}Z`;
}

function FnxCatEyeGlasses({ half }: { half: number }) {
  return (
    <g>
      <Duo d={`M${-half + 18} -3 Q0 -10 ${half - 18} -3`} inner={FNX.pinkHot} ow={6.4} iw={3.2} />
      {([-1, 1] as const).map((o) => {
        const cx = o * half;
        const d = fnxCatEyePath(cx, o);
        return (
          <g key={o}>
            <path d={d} fill={C.skySoft} fillOpacity={0.2} />
            <path d={d} fill="none" stroke={INK} strokeWidth={7.6} strokeLinejoin="round" />
            <path d={d} fill="none" stroke={FNX.pinkHot} strokeWidth={4} strokeLinejoin="round" />
            <Hl d={`M${cx - o * 10} -6 Q${cx - o * 4} -12 ${cx + o * 6} -12`} w={2.8} o={0.8} />
            <Duo d={`M${cx + o * 25} -20 L${cx + o * 38} -23`} inner={FNX.pinkHot} ow={6} iw={3} />
            <circle cx={cx + o * 27} cy={-24.4} r={3.6} fill={C.honey} {...O2} />
            <circle cx={cx + o * 26} cy={-25.4} r={1.1} fill={C.cream} />
          </g>
        );
      })}
    </g>
  );
}

function FnxHeartGlasses({ half }: { half: number }) {
  return (
    <g>
      <Duo d={`M${-half + 17} -6 Q0 -13 ${half - 17} -6`} inner={FNX.pinkHot} ow={6.4} iw={3.2} />
      {([-1, 1] as const).map((o) => {
        const cx = o * half;
        const d = fnxHeart(cx, 0, 20.5);
        return (
          <g key={o}>
            <path d={d} fill={FNX.pinkSoft} fillOpacity={0.5} />
            <path d={d} fill="none" stroke={INK} strokeWidth={7.6} strokeLinejoin="round" />
            <path d={d} fill="none" stroke={FNX.pinkHot} strokeWidth={4} strokeLinejoin="round" />
            <Hl d={`M${cx - 14} -6 Q${cx - 13} -13 ${cx - 7} -15`} w={3} o={0.85} />
            <Duo d={`M${cx + o * 19} -8 L${cx + o * 33} -10`} inner={FNX.pinkHot} ow={6} iw={3} />
          </g>
        );
      })}
      <Sparkle x={half + 24} y={-24} size={6} color={C.cream} delay={0.3} />
    </g>
  );
}

function FnxPirateEyepatch({ half }: { half: number }) {
  const cx = -half;
  return (
    <g>
      {/* tali: melintang di dahi ke sisi kanan, dan turun ke telinga kiri */}
      <path d={`M${cx - 12} -12 L${half + 32} -42`} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d={`M${cx - 12} -12 L${half + 32} -42`} fill="none" stroke={FNX.blackSoft} strokeWidth={4.4} strokeLinecap="round" />
      <path d={`M${cx - 16} 6 L${cx - 40} 16`} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d={`M${cx - 16} 6 L${cx - 40} 16`} fill="none" stroke={FNX.blackSoft} strokeWidth={4.4} strokeLinecap="round" />
      <path d={`M${cx - 6} -26 Q${cx + 22} -20 ${cx + 20} 4 Q${cx + 16} 26 ${cx - 8} 22 Q${cx - 26} 16 ${cx - 22} -4 Q${cx - 22} -22 ${cx - 6} -26Z`} fill={FNX.black} {...O} />
      <path d={`M${cx - 4} -23 Q${cx + 14} -20 ${cx + 17} -6`} fill="none" stroke={FNX.blackSoft} strokeWidth={3.6} strokeLinecap="round" />
      <Hl d={`M${cx - 15} -12 Q${cx - 13} -19 ${cx - 6} -21`} w={3} o={0.6} />
      {/* tengkorak mungil */}
      <circle cx={cx - 1} cy={-1.4} r={5.4} fill={C.cream} />
      <rect x={cx - 3.4} y={2} width={6.8} height={4.4} rx={1.4} fill={C.cream} />
      <circle cx={cx - 3} cy={-2} r={1.4} fill={FNX.black} />
      <circle cx={cx + 1.4} cy={-2} r={1.4} fill={FNX.black} />
      <path d={`M${cx - 7} 8.4 L${cx + 5} 12 M${cx + 5} 8.4 L${cx - 7} 12`} stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

function FnxMustacheCurly({ noseDY }: { noseDY: number }) {
  const a = noseDY + 6;
  const side = (o: 1 | -1) =>
    `M${o * 2} ${a + 2} C${o * 14} ${a + 9} ${o * 30} ${a + 8} ${o * 38} ${a - 2} C${o * 43} ${a - 9} ${o * 36} ${a - 15} ${o * 31} ${a - 11} C${o * 28} ${a - 8} ${o * 32} ${a - 4} ${o * 35} ${a - 6}`;
  return (
    <g>
      <Duo d={side(-1)} inner={FNX.brownDark} ow={11.6} iw={7.4} />
      <Duo d={side(1)} inner={FNX.brownDark} ow={11.6} iw={7.4} />
      <ellipse cx={0} cy={a + 2.6} rx={6.6} ry={5} fill={FNX.brownDark} {...O25} />
      <path d={`M-30 ${a + 3} Q-20 ${a + 5} -10 ${a + 3}`} fill="none" stroke={FNX.brownLight} strokeWidth={2} strokeLinecap="round" />
      <path d={`M30 ${a + 3} Q20 ${a + 5} 10 ${a + 3}`} fill="none" stroke={FNX.brownLight} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function FnxGoateeBeard({ mouthDY }: { mouthDY: number }) {
  const y = mouthDY;
  return (
    <g>
      <ellipse cx={0} cy={y + 11} rx={4.6} ry={2.8} fill={FNX.brownDark} {...O2} />
      <path d={`M-11 ${y + 14} C-15 ${y + 25} -5 ${y + 32} 0 ${y + 35} C5 ${y + 32} 15 ${y + 25} 11 ${y + 14} Q0 ${y + 19} -11 ${y + 14}Z`} fill={FNX.brown} {...O} />
      <path d={`M0 ${y + 18} Q-3 ${y + 28} 0 ${y + 35} C5 ${y + 32} 15 ${y + 25} 11 ${y + 14} Q6 ${y + 17} 0 ${y + 18}Z`} fill={FNX.brownDark} opacity={0.4} />
      <path d={`M-6 ${y + 21} q1 5 4 8 M3 ${y + 21} q1 5 -1 9`} fill="none" stroke={FNX.brownLight} strokeWidth={2} strokeLinecap="round" />
      <Hl d={`M-8 ${y + 17} Q-8 ${y + 22} -5 ${y + 25}`} w={2.2} o={0.5} />
    </g>
  );
}

function FnxMasqueradeMask({ half }: { half: number }) {
  const hh = half + 30;
  const outer = `M${-hh} -2 C${-hh} -22 ${-half - 14} -30 ${-half + 8} -27 Q0 -18 ${half - 8} -27 C${half + 14} -30 ${hh} -22 ${hh} -2 C${hh} 14 ${half + 14} 26 ${half + 2} 24 Q${half - 12} 22 ${half - 16} 12 Q0 4 ${-half + 16} 12 Q${-half + 12} 22 ${-half - 2} 24 C${-half - 14} 26 ${-hh} 14 ${-hh} -2Z`;
  const hole = (cx: number) => `M${cx - 15} 0 a15 17 0 1 0 30 0 a15 17 0 1 0 -30 0Z`;
  const featherX = half + 24;
  return (
    <g>
      {[
        { len: 52, deg: -52, c: C.skySoft },
        { len: 58, deg: -74, c: C.taroSoft },
        { len: 50, deg: -96, c: C.peachSoft },
      ].map((f) => (
        <g key={f.deg}>
          <path d={fnxLeaf(featherX, -16, f.len, 9, f.deg)} fill={f.c} {...O25} />
          <path d={`M${featherX} -16 L${f2(featherX + Math.cos((f.deg * Math.PI) / 180) * f.len * 0.88)} ${f2(-16 + Math.sin((f.deg * Math.PI) / 180) * f.len * 0.88)}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
        </g>
      ))}
      <path d={`${outer} ${hole(-half)} ${hole(half)}`} fillRule="evenodd" fill={C.taro} {...O} />
      <path d={`M${-hh + 4} -2 C${-hh + 4} -18 ${-half - 14} -25 ${-half + 6} -22 Q0 -14 ${half - 6} -22 C${half + 14} -25 ${hh - 4} -18 ${hh - 4} -2`} fill="none" stroke={C.taroDark} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      {[-1, 1].map((o) => (
        <path key={o} d={`M${o * half - 15} -22 Q${o * half} -29 ${o * half + 15} -22`} fill="none" stroke={C.honey} strokeWidth={2.6} strokeLinecap="round" />
      ))}
      <Hl d={`M${-half - 20} -14 Q${-half - 14} -22 ${-half - 4} -23`} w={3.2} o={0.8} />
      {[-1, 1].map((o) => (
        <g key={`g${o}`} transform={`translate(${o * (half + 21)} -6)`} style={SVG_ATTR_ORIGIN}>
          <Diamond s={5.6} />
        </g>
      ))}
      <circle cx={0} cy={-18} r={3.6} fill={C.honey} {...O2} />
      <Sparkle x={featherX + 18} y={-52} size={6} color={C.honeySoft} delay={0.4} />
    </g>
  );
}

function FnxVrGoggles({ half }: { half: number }) {
  const W = half + 24;
  const lens = `M${-W + 8 + 15} -17 H${W - 8 - 15} Q${W - 8} -17 ${W - 8} 1 Q${W - 8} 19 ${W - 8 - 15} 19 H${-W + 8 + 15} Q${-W + 8} 19 ${-W + 8} 1 Q${-W + 8} -17 ${-W + 8 + 15} -17Z`;
  const shell = `M${-W + 18} -24 H${W - 18} Q${W} -24 ${W} -6 V8 Q${W} 26 ${W - 18} 26 H14 Q8 26 4 16 Q0 11 -4 16 Q-8 26 -14 26 H${-W + 18} Q${-W} 26 ${-W} 8 V-6 Q${-W} -24 ${-W + 18} -24Z`;
  return (
    <g>
      {[-1, 1].map((o) => (
        <g key={o}>
          <rect x={o > 0 ? W - 4 : -W - 20} y={-12} width={24} height={22} rx={7} fill={C.sky} {...O} strokeWidth={3} />
          <path d={`M${o * (W + 6)} -9 V7 M${o * (W + 12)} -9 V7`} stroke={C.skyDark} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
        </g>
      ))}
      <path d={`${shell} ${lens}`} fillRule="evenodd" fill={FNX.white} {...O} />
      <path d={`M${-W + 6} 10 Q${-W + 6} 22 ${-W + 18} 22 H-14 Q-8 22 -4 13 Q0 8 4 13 Q8 22 14 22 H${W - 18} Q${W - 6} 22 ${W - 6} 10 Q0 15 ${-W + 6} 10Z ${lens}`} fillRule="evenodd" fill={FNX.whiteShade} />
      <path d={lens} fill={FNX.cyan} fillOpacity={0.2} stroke={INK} strokeWidth={3} />
      <path d={`M${-W + 14} -4 L${-W + 24} -14`} stroke={C.cream} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
      <path d={`M${-W + 26} 2 L${-W + 30} -3`} stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <path d={`M${W - 22} 8 L${W - 14} 0`} stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d={`M${-W + 12} -14 Q0 -22 ${W - 12} -14`} fill="none" stroke={FNX.cyanDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
      <circle cx={0} cy={-22} r={3} fill={FNX.cyan} {...O2} />
      <motion.circle cx={W - 9} cy={-14} r={2.6} fill={C.matcha} {...O2} style={fb()} animate={{ scale: [1, 1.4, 1], opacity: [1, 0.55, 1] }} transition={loop(1.4)} />
      <Sparkle x={W + 14} y={-26} size={6} color={FNX.cyan} delay={0.5} />
    </g>
  );
}

function FnxFacePaintStars({ half }: { half: number }) {
  const x = half + 17;
  return (
    <g>
      <polygon points={starPoints(-x, 22, 12.4, 5.6)} fill={C.honey} {...O25} />
      <polygon points={starPoints(-x - 1, 21, 5.8, 2.6)} fill={C.honeySoft} />
      <circle cx={-x + 12} cy={11} r={2.4} fill={C.sky} {...O2} />
      <circle cx={-x - 13} cy={34} r={2} fill={C.taro} {...O2} />
      <path d={fnxHeart(x, 22, 12)} fill={FNX.pinkHot} {...O25} />
      <path d={`M${x - 8} 18 q1 -5 5 -6`} fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} />
      <circle cx={x - 12} cy={34} r={2.2} fill={C.matcha} {...O2} />
      <circle cx={x + 13} cy={11} r={2} fill={C.honey} {...O2} />
      <Sparkle x={x + 18} y={32} size={5} color={C.cream} delay={0.6} />
    </g>
  );
}

function FnxLipstickPink({ mouthDY }: { mouthDY: number }) {
  const y = mouthDY + 1;
  return (
    <g>
      <path d={`M-14 ${y} C-9 ${y - 6} -4 ${y - 9} 0 ${y - 4.4} C4 ${y - 9} 9 ${y - 6} 14 ${y} C9 ${y + 10} -9 ${y + 10} -14 ${y}Z`} fill={FNX.pinkHot} {...O25} />
      <path d={`M-14 ${y} Q-6 ${y + 2.4} 0 ${y + 0.6} Q6 ${y + 2.4} 14 ${y}`} fill="none" stroke={FNX.redDark} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <ellipse cx={-3.6} cy={y + 4.4} rx={4.4} ry={1.7} fill={C.cream} opacity={0.9} />
      <circle cx={5} cy={y + 4} r={1} fill={C.cream} opacity={0.9} />
      <Sparkle x={19} y={y - 9} size={5} color={C.honeySoft} delay={0.3} />
    </g>
  );
}

const FACE_REG: Record<string, FaceArt> = {
  face_blush_stickers: FnxBlushStickers,
  face_freckles: FnxFreckles,
  face_eyelashes_cute: FnxEyelashes,
  face_nerd_glasses: FnxNerdGlasses,
  face_mustache_classic: FnxMustacheClassic,
  face_cat_eye_glasses: FnxCatEyeGlasses,
  face_heart_glasses: FnxHeartGlasses,
  face_pirate_eyepatch: FnxPirateEyepatch,
  face_mustache_curly: FnxMustacheCurly,
  face_goatee_beard: FnxGoateeBeard,
  face_masquerade_mask: FnxMasqueradeMask,
  face_vr_goggles: FnxVrGoggles,
  face_face_paint_stars: FnxFacePaintStars,
  face_lipstick_pink: FnxLipstickPink,
};

/** Pratinjau memakai half = 35, noseDY = 16, mouthDY = 26. */
const FACE_BOX_X: Record<string, string> = {
  face_blush_stickers: "-70 -2 140 52",
  face_freckles: "-70 0 140 44",
  face_eyelashes_cute: "-74 -36 148 60",
  face_nerd_glasses: "-80 -34 160 68",
  face_mustache_classic: "-48 6 96 40",
  face_cat_eye_glasses: "-84 -42 168 76",
  face_heart_glasses: "-80 -34 160 68",
  face_pirate_eyepatch: "-96 -52 192 90",
  face_mustache_curly: "-54 6 108 40",
  face_goatee_beard: "-34 28 68 50",
  face_masquerade_mask: "-92 -86 184 120",
  face_vr_goggles: "-92 -38 184 76",
  face_face_paint_stars: "-72 2 144 46",
  face_lipstick_pink: "-34 8 68 40",
};

/* ═════════════════════════ LEHER ═════════════════════════ */

function FnxHibiscus({ cx, cy, r = 6.8 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i * 72 - 90) * (Math.PI / 180);
        return <circle key={i} cx={f2(cx + Math.cos(a) * r * 0.9)} cy={f2(cy + Math.sin(a) * r * 0.9)} r={r * 0.95} fill={FNX.hibiscus} {...O2} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.5} fill={FNX.redDark} />
      <circle cx={cx} cy={cy} r={r * 0.3} fill={C.honey} />
    </g>
  );
}

function FnxPlumeria({ cx, cy, r = 6.4 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i * 72 - 70) * (Math.PI / 180);
        return <circle key={i} cx={f2(cx + Math.cos(a) * r * 0.85)} cy={f2(cy + Math.sin(a) * r * 0.85)} r={r * 0.92} fill={FNX.shell} {...O2} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.46} fill={C.honey} />
      <circle cx={cx - 1} cy={cy - 1} r={r * 0.16} fill={C.honeySoft} />
    </g>
  );
}

function FnxFlowerLei() {
  const ts = [0.04, 0.14, 0.24, 0.34, 0.43, 0.5, 0.57, 0.66, 0.76, 0.86, 0.96];
  const leafTs = [0.09, 0.19, 0.29, 0.39, 0.61, 0.71, 0.81, 0.91];
  const curve = Array.from({ length: 21 }, (_, i) => fnxArc(i / 20, 52, 38));
  const d = curve.map((p, i) => `${i ? "L" : "M"}${f2(p[0])} ${f2(p[1])}`).join(" ");
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={FNX.leafDark} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      {leafTs.map((t, i) => {
        const p = fnxArc(t, 52, 38);
        return <path key={t} d={fnxLeaf(p[0], p[1], 15, 5, i % 2 ? 60 : 120)} fill={FNX.leaf} {...O2} />;
      })}
      {ts.map((t, i) => {
        const p = fnxArc(t, 52, 38);
        return i % 2 === 0 ? <FnxHibiscus key={t} cx={p[0]} cy={p[1]} r={i === 5 ? 8 : 6.6} /> : <FnxPlumeria key={t} cx={p[0]} cy={p[1]} r={6.2} />;
      })}
      <Sparkle x={34} y={42} size={6} color={C.honeySoft} delay={0.4} />
    </g>
  );
}

function FnxSailorScarf() {
  return (
    <g>
      <path d="M-34 10 L0 58 L34 10 Q0 22 -34 10Z" fill={C.sky} {...O} />
      <path d="M0 58 L34 10 Q18 16 12 17 Z" fill={C.skyDark} opacity={0.4} />
      <path d="M-26 17 Q0 26 26 17" fill="none" stroke={FNX.white} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M-18 29 Q0 36 18 29" fill="none" stroke={FNX.white} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M-56 -6 Q0 10 56 -6 L52 8 Q0 24 -52 8Z" fill={C.sky} {...O} />
      <path d="M-56 -6 Q0 10 56 -6 L55 -1 Q0 15 -55 -1Z" fill={FNX.white} />
      <path d="M-54 3 Q0 19 54 3" fill="none" stroke={FNX.white} strokeWidth={3.2} strokeLinecap="round" />
      <Hl d="M-46 -2 Q-24 6 -10 7" w={3} o={0.55} />
      <path d="M-4 14 L-14 28 L-2 24Z M4 14 L14 28 L2 24Z" fill={C.skyDark} {...O25} />
      <ellipse cx={0} cy={13} rx={9} ry={7.4} fill={C.sky} {...O3} />
      <Hl d="M-5 10 Q-2 8 2 9" w={2.4} o={0.8} />
    </g>
  );
}

function FnxRibbonChoker() {
  return (
    <g>
      <path d="M-48 -3 Q0 13 48 -3 L46 8 Q0 24 -46 8Z" fill={C.taro} {...O} />
      <path d="M-48 -3 Q0 13 48 -3 L47.4 2 Q0 18 -47.4 2Z" fill={C.taroSoft} opacity={0.75} />
      <path d="M-40 11 Q-20 18 0 19 Q20 18 40 11" fill="none" stroke={C.taroDark} strokeWidth={2} strokeLinecap="round" strokeDasharray="3 4" opacity={0.8} />
      <path d="M-4 17 L-20 30 L-8 28Z M4 17 L20 30 L8 28Z" fill={C.taroDark} {...O25} />
      <motion.g style={fb(0.5, 0.5)} animate={{ rotate: [-3, 3, -3] }} transition={loop(2.6)}>
        <path d="M0 15 Q-18 0 -22 14 Q-20 24 0 17Z" fill={C.taro} {...O3} />
        <path d="M0 15 Q18 0 22 14 Q20 24 0 17Z" fill={C.taro} {...O3} />
        <path d="M-17 9 Q-12 6 -7 9" fill="none" stroke={C.taroSoft} strokeWidth={2.4} strokeLinecap="round" />
      </motion.g>
      <circle cx={0} cy={16} r={5} fill={C.taroDark} {...O25} />
      <path d="M0 24 L0 29" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <path d={fnxHeart(0, 38, 8.4)} fill={C.honey} {...O25} />
      <path d="M0 41 V45" stroke={C.honeyDark} strokeWidth={2} strokeLinecap="round" />
      <path d="M-4.4 34 q1.2 -2.6 3.6 -2.6" fill="none" stroke={C.cream} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function FnxStarPendant() {
  return (
    <g>
      <Duo d="M-44 -4 Q0 60 44 -4" inner={C.steel} ow={4.6} iw={2} />
      <circle cx={0} cy={28} r={3.2} fill={C.honeyDark} {...O2} />
      <polygon points={starPoints(0, 42, 14, 6.4)} fill={C.honey} {...O25} />
      <polygon points={starPoints(0, 42, 6.8, 3)} fill={C.honeySoft} />
      <path d="M-8 36 Q-6 32 -2 31" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.9} />
      <Sparkle x={19} y={34} size={6} color={C.honeySoft} delay={0.2} />
    </g>
  );
}

function FnxNecktie() {
  const hw = (y: number): number => (y <= 46 ? 7 + (y - 12) * (7 / 34) : Math.max(0, (14 * (60 - y)) / 14));
  const stripe = (y: number) => {
    const y1 = y + 6;
    const y2 = y - 6;
    return `M${f2(-hw(y1) + 1.6)} ${y1} L${f2(hw(y2) - 1.6)} ${y2}`;
  };
  return (
    <g>
      <path d="M-4 2 L-28 -4 L-20 20 Z" fill={FNX.white} {...O3} />
      <path d="M4 2 L28 -4 L20 20 Z" fill={FNX.white} {...O3} />
      <path d="M-7 12 L7 12 L14 46 L0 60 L-14 46Z" fill={FNX.red} {...O} />
      <path d="M7 12 L14 46 L0 60 L2 40Z" fill={FNX.redDark} opacity={0.45} />
      <g fill="none" stroke={FNX.white} strokeWidth={3.2} strokeLinecap="round" opacity={0.95}>
        <path d={stripe(26)} />
        <path d={stripe(37)} />
        <path d={stripe(48)} />
      </g>
      <path d="M-8 1 L8 1 L10 12 Q0 17 -10 12Z" fill={FNX.red} {...O3} />
      <Hl d="M-5 4 L-4 9" w={2.4} o={0.7} />
    </g>
  );
}

function FnxPearls() {
  const n = 11;
  return (
    <g>
      <Duo d="M-52 -3 Q0 77 52 -3" inner={C.honeyDark} ow={4.4} iw={1.8} />
      {Array.from({ length: n }, (_, i) => {
        const t = 0.06 + (0.88 * i) / (n - 1);
        const p = fnxArc(t, 52, 38);
        const r = 4.8 + 2 * Math.sin(Math.PI * t);
        return (
          <g key={i}>
            <circle cx={f2(p[0])} cy={f2(p[1])} r={f2(r)} fill={FNX.white} {...O2} />
            <path d={`M${f2(p[0] - r * 0.5)} ${f2(p[1] + r * 0.45)} Q${f2(p[0])} ${f2(p[1] + r * 0.95)} ${f2(p[0] + r * 0.55)} ${f2(p[1] + r * 0.4)}`} fill="none" stroke={FNX.pinkSoft} strokeWidth={1.8} strokeLinecap="round" />
            <circle cx={f2(p[0] - r * 0.34)} cy={f2(p[1] - r * 0.34)} r={f2(r * 0.22)} fill={C.cream} />
          </g>
        );
      })}
      <rect x={-56} y={-9} width={9} height={7} rx={2.4} fill={C.honey} {...O2} />
      <Sparkle x={30} y={40} size={6} color={C.honeySoft} delay={0.3} />
    </g>
  );
}

function FnxRuffleCollar() {
  const back = [-48, -32, -16, 0, 16, 32, 48];
  const front = [-40, -24, -8, 8, 24, 40];
  const yOf = (x: number): number => 2 + 14 * (1 - (x / 56) * (x / 56));
  return (
    <g>
      {back.map((x) => (
        <circle key={x} cx={x} cy={f2(yOf(x) + 6)} r={11} fill={FNX.shellDark} {...O3} />
      ))}
      {back.map((x) => (
        <circle key={`b${x}`} cx={x} cy={f2(yOf(x) + 5)} r={9.2} fill={FNX.shell} />
      ))}
      {front.map((x) => (
        <circle key={`f${x}`} cx={x} cy={f2(yOf(x) + 18)} r={10.4} fill={FNX.shell} {...O3} />
      ))}
      <g fill="none" stroke={C.peachSoft} strokeWidth={2.4} strokeLinecap="round">
        {front.map((x) => (
          <path key={`l${x}`} d={`M${x - 5} ${f2(yOf(x) + 19)} q5 5 10 0`} />
        ))}
      </g>
      <g fill={C.honeySoft}>
        {back.map((x) => (
          <circle key={`d${x}`} cx={x} cy={f2(yOf(x) + 3)} r={1.6} />
        ))}
      </g>
      <motion.g style={fb(0.5, 0.5)} animate={{ rotate: [-2, 2, -2] }} transition={loop(3)}>
        <path d="M0 24 Q-18 12 -22 26 Q-20 36 0 27Z" fill={C.peach} {...O3} />
        <path d="M0 24 Q18 12 22 26 Q20 36 0 27Z" fill={C.peach} {...O3} />
        <path d="M-17 21 Q-12 17 -7 20" fill="none" stroke={C.peachSoft} strokeWidth={2.4} strokeLinecap="round" />
      </motion.g>
      <circle cx={0} cy={26} r={5} fill={C.honey} {...O25} />
    </g>
  );
}

function FnxCameraStrap() {
  return (
    <g>
      <Duo d="M-46 -4 Q-30 22 -13 32" inner={FNX.leather} ow={7.6} iw={4.4} />
      <Duo d="M46 -4 Q30 22 13 32" inner={FNX.leather} ow={7.6} iw={4.4} />
      <path d="M-18 33 H18 Q22 33 22 37 V54 Q22 58 18 58 H-18 Q-22 58 -22 54 V37 Q-22 33 -18 33Z" fill={FNX.mint} {...O} />
      <path d="M-22 44 H22 V54 Q22 58 18 58 H-18 Q-22 58 -22 54Z" fill={FNX.mintDark} opacity={0.4} />
      <path d="M-18 33 H18 Q22 33 22 37 V41 H-22 V37 Q-22 33 -18 33Z" fill={FNX.white} {...O25} />
      <rect x={-17} y={35.4} width={7} height={3.4} rx={1} fill={C.honey} stroke={INK} strokeWidth={1.6} />
      <circle cx={13} cy={37} r={2} fill={C.peach} {...O2} />
      <circle cx={0} cy={48.6} r={9.2} fill={C.steel} {...O25} />
      <circle cx={0} cy={48.6} r={6} fill={FNX.navy} stroke={INK} strokeWidth={2} />
      <circle cx={0} cy={48.6} r={2.8} fill={C.sky} />
      <circle cx={-2.4} cy={46} r={1.6} fill={C.cream} />
      <Hl d="M-17 45 Q-17 41 -13 41" w={2.2} o={0.7} />
    </g>
  );
}

function FnxHeartLocket() {
  return (
    <g>
      <Duo d="M-44 -4 Q0 56 44 -4" inner={C.honeyDark} ow={4.6} iw={2} />
      <circle cx={0} cy={26} r={3.2} fill={C.honeyDark} {...O2} />
      <path d={fnxHeart(0, 39, 13)} fill={C.honey} {...O} />
      <path d={fnxHeart(0, 39.6, 8.4)} fill="none" stroke={C.honeyDark} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M0 29 V50" stroke={C.honeyDark} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <circle cx={-4.4} cy={38} r={1.8} fill={C.honeySoft} />
      <circle cx={4.4} cy={38} r={1.8} fill={C.honeySoft} />
      <path d="M-9 33 q1.6 -4 5 -4.4" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" />
      <path d={fnxHeart(0, 40, 3.2)} fill={C.peach} />
      <Sparkle x={19} y={31} size={6} color={C.honeySoft} delay={0.3} />
    </g>
  );
}

function FnxMedalGold() {
  const ribbon = (d: string) => (
    <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={19} />
      <path d={d} stroke={FNX.red} strokeWidth={15} />
      <path d={d} stroke={FNX.white} strokeWidth={9} />
      <path d={d} stroke={C.skyDark} strokeWidth={3.4} />
    </g>
  );
  return (
    <g>
      {ribbon("M-34 -6 L-3 28")}
      {ribbon("M34 -6 L3 28")}
      <circle cx={0} cy={31} r={3.6} fill={C.honeyDark} {...O2} />
      <circle cx={0} cy={45} r={14} fill={C.honey} {...O} />
      <circle cx={0} cy={45} r={9.6} fill={C.honeySoft} stroke={C.honeyDark} strokeWidth={2.2} />
      <polygon points={starPoints(0, 45, 7, 3.2)} fill={C.honey} stroke={C.honeyDark} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M-10 38 Q-8 33 -3 32" fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" opacity={0.9} />
      <Sparkle x={19} y={36} size={6} color={C.cream} delay={0.5} />
    </g>
  );
}

function FnxMuffler() {
  /* tepi atas/bawah syal = kurva Q yang sama persis dengan outline → belang rapi */
  const topY = (x: number): number => {
    const t = (x + 58) / 116;
    return -6 * ((1 - t) * (1 - t) + t * t) + 56 * t * (1 - t);
  };
  const BY = 17.3;
  const botY = (x: number): number => {
    const t = (54 - x) / 108;
    return BY * ((1 - t) * (1 - t) + t * t) + 92 * t * (1 - t);
  };
  const stripeXs = [-44, -26, -8, 10, 28, 44];
  const quad = (x: number) => {
    const xs = [x, x + 3, x + 6, x + 9];
    const up = xs.map((v) => `${f2(v)} ${f2(topY(v))}`).join(" L");
    const down = [...xs].reverse().map((v) => `${f2(v)} ${f2(botY(v))}`).join(" L");
    return `M${up} L${down}Z`;
  };
  return (
    <g>
      <path d={`M-58 -6 Q0 28 58 -6 L54 ${f2(BY)} Q0 46 -54 ${f2(BY)}Z`} fill={FNX.white} {...O} />
      <g fill={FNX.red}>
        {stripeXs.map((x) => (
          <path key={x} d={quad(x)} />
        ))}
      </g>
      <path d={`M-58 -6 Q0 28 58 -6 L54 ${f2(BY)} Q0 46 -54 ${f2(BY)}Z`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M-50 4 Q-26 12 -8 14" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      {/* ekor menjuntai */}
      <path d="M14 28 L38 26 L40 56 L16 58Z" fill={FNX.white} {...O} />
      <g fill={FNX.red}>
        <path d="M15 34 L39 32 L39.4 39 L15.4 41Z" />
        <path d="M15.8 46 L39.8 44 L40 51 L16 53Z" />
      </g>
      <path d="M14 28 L38 26 L40 56 L16 58Z" fill="none" stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />
      <g fill="none" strokeLinecap="round" strokeWidth={2.6}>
        {[19, 25, 31, 37].map((x, i) => (
          <path key={x} d={`M${x} 58 V${f2(63 + (i % 2) * 1.6)}`} stroke={i % 2 ? FNX.red : INK} />
        ))}
      </g>
      <g fill="none" stroke={C.skySoft} strokeWidth={2.2} strokeLinecap="round" opacity={0.85}>
        {[-40, -20, 0, 20, 40].map((x) => (
          <path key={x} d={`M${x - 3.6} ${f2(topY(x) + 15)} l3.6 3.4 l3.6 -3.4`} />
        ))}
      </g>
    </g>
  );
}

function FnxDogTag() {
  return (
    <g>
      <path d="M-46 -4 Q0 56 46 -4" fill="none" stroke={INK} strokeWidth={4.2} strokeLinecap="round" strokeDasharray="0.1 5.2" />
      <path d="M-46 -4 Q0 56 46 -4" fill="none" stroke={C.steel} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="0.1 5.2" />
      <g transform="translate(5 47) rotate(9)" style={SVG_ATTR_ORIGIN}>
        <rect x={-8.6} y={-12.4} width={17.2} height={25} rx={7} fill={C.steelDark} {...O25} />
        <circle cx={0} cy={-7.6} r={1.8} fill={FNX.white} stroke={INK} strokeWidth={1.4} />
      </g>
      <g transform="translate(-5 43) rotate(-9)" style={SVG_ATTR_ORIGIN}>
        <rect x={-8.6} y={-12.4} width={17.2} height={25} rx={7} fill={C.steel} {...O25} />
        <circle cx={0} cy={-7.6} r={1.8} fill={FNX.white} stroke={INK} strokeWidth={1.4} />
        <path d="M-4.4 -1 H4.4 M-4.4 3.4 H4.4 M-3 7.6 H3" stroke={C.steelDark} strokeWidth={1.8} strokeLinecap="round" />
        <path d="M-6 -4 Q-6 -9 -2 -10" fill="none" stroke={C.cream} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      </g>
    </g>
  );
}

const NECK_REG: Record<string, NeckArt> = {
  neck_flower_lei: FnxFlowerLei,
  neck_sailor_scarf: FnxSailorScarf,
  neck_ribbon_choker: FnxRibbonChoker,
  neck_star_pendant: FnxStarPendant,
  neck_necktie_red: FnxNecktie,
  neck_pearl_necklace: FnxPearls,
  neck_ruffle_collar: FnxRuffleCollar,
  neck_camera_strap: FnxCameraStrap,
  neck_heart_locket: FnxHeartLocket,
  neck_medal_gold: FnxMedalGold,
  neck_winter_muffler: FnxMuffler,
  neck_dog_tag: FnxDogTag,
};

const NECK_BOX_X: Record<string, string> = {
  neck_flower_lei: "-66 -22 132 80",
  neck_sailor_scarf: "-66 -16 132 82",
  neck_ribbon_choker: "-60 -14 120 76",
  neck_star_pendant: "-56 -14 112 76",
  neck_necktie_red: "-46 -10 92 80",
  neck_pearl_necklace: "-66 -20 132 80",
  neck_ruffle_collar: "-66 -14 132 80",
  neck_camera_strap: "-60 -14 120 80",
  neck_heart_locket: "-56 -14 112 76",
  neck_medal_gold: "-50 -12 100 80",
  neck_winter_muffler: "-70 -18 140 92",
  neck_dog_tag: "-56 -14 112 76",
};

/* ═════════════════════════════════════════════════════════════
 *  PROPERTI TAMBAHAN (10): 6 genggam + 4 kendaraan/alas
 * ═════════════════════════════════════════════════════════════ */

/* ───────────────────────── Bunga & daun (bahan buket / keranjang) ───────────────────────── */

function PxRose({ x, y, r = 11, c = C.peachSoft, cd = C.peach }: { x: number; y: number; r?: number; c?: string; cd?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c} {...O3} />
      <path
        d={`M${x - r * 0.55} ${y + r * 0.1} Q${x - r * 0.4} ${y - r * 0.7} ${x + r * 0.2} ${y - r * 0.55} Q${x + r * 0.7} ${y - r * 0.2} ${x + r * 0.3} ${y + r * 0.35} Q${x - r * 0.1} ${y + r * 0.55} ${x - r * 0.1} ${y + r * 0.05}`}
        fill="none"
        stroke={cd}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x - r * 0.38} cy={y - r * 0.4} r={r * 0.16} fill={C.cream} opacity={0.9} />
    </g>
  );
}

function PxTulip({ x, y, c = C.taroSoft, cd = C.taro }: { x: number; y: number; c?: string; cd?: string }) {
  return (
    <g>
      <path d={`M${x - 10} ${y - 8} L${x - 8} ${y - 20} L${x - 3} ${y - 12} L${x} ${y - 22} L${x + 3} ${y - 12} L${x + 8} ${y - 20} L${x + 10} ${y - 8} Q${x + 10} ${y + 8} ${x} ${y + 9} Q${x - 10} ${y + 8} ${x - 10} ${y - 8}Z`} fill={c} {...O3} />
      <path d={`M${x} ${y - 12} Q${x - 3} ${y} ${x} ${y + 8}`} fill="none" stroke={cd} strokeWidth={2.2} strokeLinecap="round" />
      <path d={`M${x - 7} ${y - 6} Q${x - 7} ${y + 2} ${x - 4} ${y + 6}`} fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
    </g>
  );
}

function PxLeaf({ x, y, rot = 0, s = 1 }: { x: number; y: number; rot?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M0 0 Q-10 -8 0 -22 Q10 -8 0 0Z" fill={C.matchaSoft} {...O25} />
      <path d="M0 -3 V-16" stroke={C.matcha} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/* ───────────────────────── Genggam: seikat balon ───────────────────────── */

function PxBalloon({ cx, cy, rx = 17, ry = 20, c, cd, knotX }: { cx: number; cy: number; rx?: number; ry?: number; c: string; cd: string; knotX: number }) {
  const by = cy + ry;
  return (
    <g>
      <path d={`M${knotX} 0 Q${(knotX + cx) / 2 + 6} ${by * 0.5} ${cx} ${by + 5}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      <path d={`M${cx - 4} ${by + 8} L${cx} ${by} L${cx + 4} ${by + 8}Z`} fill={cd} {...O2} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c} {...O} />
      <path d={`M${cx + rx * 0.35} ${cy - ry * 0.7} Q${cx + rx * 0.95} ${cy - ry * 0.1} ${cx + rx * 0.5} ${cy + ry * 0.7}`} fill="none" stroke={cd} strokeWidth={4} strokeLinecap="round" opacity={0.55} />
      <Hl d={`M${cx - rx * 0.6} ${cy - ry * 0.2} Q${cx - rx * 0.6} ${cy - ry * 0.65} ${cx - rx * 0.2} ${cy - ry * 0.75}`} w={3.2} o={0.85} />
    </g>
  );
}

function PxBalloons() {
  return (
    <g transform="rotate(24)" style={SVG_ATTR_ORIGIN}>
    <motion.g style={fb(0.5, 1)} animate={{ rotate: [-3, 3, -3] }} transition={loop(3)}>
      <PxBalloon cx={-28} cy={-80} c={C.peach} cd={C.peachDark} knotX={-2} />
      <PxBalloon cx={3} cy={-102} rx={18} ry={21} c={C.sky} cd={C.skyDark} knotX={0} />
      <PxBalloon cx={32} cy={-76} c={C.taro} cd={C.taroDark} knotX={2} />
      <circle cx={0} cy={0} r={3.4} fill={C.cream} {...O25} />
      <Sparkle x={48} y={-104} size={7} color={C.honeySoft} delay={0.3} />
    </motion.g>
    </g>
  );
}

/* ───────────────────────── Genggam: payung pastel ───────────────────────── */

function PxUmbrella() {
  const dots: [number, number][] = [
    [-30, -84],
    [-8, -100],
    [20, -90],
    [34, -76],
    [-42, -74],
    [4, -78],
  ];
  return (
    <g transform="rotate(34) scale(0.9)" style={SVG_ATTR_ORIGIN}>
      <path d="M0 -84 V-4 Q0 8 -9 8 Q-16 8 -16 0" fill="none" stroke={INK} strokeWidth={8.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0 -84 V-4 Q0 8 -9 8 Q-16 8 -16 0" fill="none" stroke={C.honey} strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-56 -72 Q-52 -116 0 -122 Q52 -116 56 -72 Q42 -64 28 -72 Q14 -64 0 -72 Q-14 -64 -28 -72 Q-42 -64 -56 -72Z" fill={C.peachSoft} {...O} />
      <path d="M-28 -72 Q-26 -104 0 -122 M28 -72 Q26 -104 0 -122 M0 -72 V-122" fill="none" stroke={C.peach} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
      <path d="M-56 -72 Q-52 -116 0 -122 Q-30 -112 -36 -72 Q-46 -64 -56 -72Z" fill={C.cream} opacity={0.35} />
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={C.cream} />
      ))}
      <circle cx={0} cy={-124} r={3.6} fill={C.honey} {...O25} />
      <Hl d="M-44 -86 Q-38 -106 -14 -114" w={3.2} o={0.8} />
      <Sparkle x={54} y={-110} size={7} color={C.honeySoft} delay={0.2} />
    </g>
  );
}

/* ───────────────────────── Genggam: buket bunga ───────────────────────── */

function PxBouquet() {
  return (
    <g transform="rotate(20) scale(0.88)" style={SVG_ATTR_ORIGIN}>
      <PxLeaf x={-12} y={-46} rot={-40} s={1.3} />
      <PxLeaf x={14} y={-46} rot={40} s={1.3} />
      <PxLeaf x={0} y={-58} rot={0} s={1.2} />
      <g>
        <PxTulip x={-22} y={-76} c={C.taroSoft} cd={C.taro} />
        <PxTulip x={24} y={-74} c={C.honeySoft} cd={C.honey} />
        <PxRose x={-2} y={-82} r={13} c={C.peachSoft} cd={C.peachDark} />
        <PxRose x={-20} y={-58} r={10} c={C.cream} cd={C.peach} />
        <PxRose x={20} y={-56} r={10} c={C.skySoft} cd={C.sky} />
        <circle cx={-34} cy={-62} r={3} fill={C.cream} {...O2} />
        <circle cx={36} cy={-64} r={3} fill={C.cream} {...O2} />
        <circle cx={6} cy={-100} r={3} fill={C.cream} {...O2} />
      </g>
      <path d="M-30 -48 L30 -48 L9 0 Q0 4 -9 0Z" fill={C.cardboardLight} {...O} />
      <path d="M-30 -48 L-6 -4 M30 -48 L6 -4" fill="none" stroke={C.cardboard} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <path d="M-24 -38 L-16 -42 L-8 -36" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <path d="M-9 -26 Q0 -20 9 -26" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M0 -26 L-12 -14 Q-16 -6 -9 -8 L0 -22 L9 -8 Q16 -6 12 -14Z" fill={C.peach} {...O25} />
      <ellipse cx={0} cy={-26} rx={5} ry={4} fill={C.peach} {...O25} />
      <Sparkle x={36} y={-96} size={7} color={C.honeySoft} delay={0.5} />
    </g>
  );
}

/* ───────────────────────── Genggam: ukulele mini ───────────────────────── */

function PxUkulele() {
  return (
    <g transform="rotate(26)" style={SVG_ATTR_ORIGIN}>
      <rect x={-5.5} y={-112} width={11} height={72} rx={3} fill={C.woodDark} {...O3} />
      <g stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.55}>
        <path d="M-5.5 -96 H5.5 M-5.5 -82 H5.5 M-5.5 -68 H5.5 M-5.5 -54 H5.5" />
      </g>
      <rect x={-9} y={-128} width={18} height={20} rx={7} fill={C.honey} {...O} />
      <circle cx={-12} cy={-122} r={3} fill={C.cream} {...O2} />
      <circle cx={12} cy={-122} r={3} fill={C.cream} {...O2} />
      <circle cx={-12} cy={-113} r={3} fill={C.cream} {...O2} />
      <circle cx={12} cy={-113} r={3} fill={C.cream} {...O2} />
      <path d="M0 -56 C-14 -58 -22 -50 -20 -40 C-28 -34 -30 -16 -22 -6 C-14 4 14 4 22 -6 C30 -16 28 -34 20 -40 C22 -50 14 -58 0 -56Z" fill={C.wood} {...O} />
      <path d="M-18 -8 Q-24 -24 -18 -36" fill="none" stroke={C.woodLight} strokeWidth={4.4} strokeLinecap="round" opacity={0.85} />
      <circle cx={0} cy={-30} r={8} fill={C.woodDark} {...O3} />
      <circle cx={0} cy={-30} r={11} fill="none" stroke={C.honey} strokeWidth={2.6} />
      <rect x={-9} y={-12} width={18} height={5} rx={2} fill={C.woodDark} {...O2} />
      <g stroke={C.cream} strokeWidth={1.5} strokeLinecap="round">
        <path d="M-3 -112 V-10 M-1 -112 V-10 M1 -112 V-10 M3 -112 V-10" />
      </g>
      <Hl d="M-12 -50 Q-17 -46 -16 -40" w={2.6} o={0.85} />
      <Sparkle x={26} y={-104} size={6} color={C.honeySoft} delay={0.2} />
      <Sparkle x={-26} y={-76} size={5} color={C.cream} delay={0.9} />
    </g>
  );
}

/* ───────────────────────── Genggam: tongkat sihir ───────────────────────── */

function PxWand() {
  return (
    <g transform="rotate(16)" style={SVG_ATTR_ORIGIN}>
      <Duo d="M0 0 V-86" inner={C.taro} ow={9.5} iw={5.4} />
      <rect x={-6.4} y={-40} width={12.8} height={7} rx={3} fill={C.honey} {...O2} />
      <rect x={-6.4} y={-8} width={12.8} height={7} rx={3} fill={C.honey} {...O2} />
      <path d="M0 -86 Q-14 -82 -18 -74 M0 -86 Q14 -82 18 -74" fill="none" stroke={C.honey} strokeWidth={3.4} strokeLinecap="round" />
      <motion.g style={fb()} animate={{ scale: [1, 1.1, 1], rotate: [-4, 4, -4] }} transition={loop(1.8)}>
        <polygon points={starPoints(0, -108, 24, 11)} fill={C.honey} {...O} />
        <polygon points={starPoints(0, -108, 12, 5.4)} fill={C.honeySoft} />
        <circle cx={-6} cy={-114} r={2.4} fill={C.cream} />
      </motion.g>
      <Sparkle x={-30} y={-122} size={8} color={C.taroSoft} delay={0} />
      <Sparkle x={30} y={-136} size={7} color={C.cream} delay={0.6} />
      <Sparkle x={26} y={-90} size={6} color={C.honeySoft} delay={1.1} />
      <Hl d="M-4 -78 V-50" w={2.8} o={0.6} />
    </g>
  );
}

/* ───────────────────────── Genggam: pedang busa ───────────────────────── */

function PxFoamSword() {
  return (
    <g transform="rotate(14)" style={SVG_ATTR_ORIGIN}>
      <rect x={-6.5} y={-26} width={13} height={32} rx={5} fill={C.peach} {...O} />
      <path d="M-6.5 -18 L6.5 -22 M-6.5 -10 L6.5 -14 M-6.5 -2 L6.5 -6" fill="none" stroke={C.peachDark} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={0} cy={9} r={6} fill={C.honey} {...O25} />
      <path d="M-24 -30 Q-24 -38 -14 -36 H14 Q24 -38 24 -30 Q24 -24 14 -26 H-14 Q-24 -24 -24 -30Z" fill={C.honey} {...O} />
      <circle cx={-18} cy={-31} r={2.6} fill={C.sky} stroke={INK} strokeWidth={1.8} />
      <circle cx={18} cy={-31} r={2.6} fill={C.sky} stroke={INK} strokeWidth={1.8} />
      <path d="M-10 -36 V-104 Q-10 -118 0 -122 Q10 -118 10 -104 V-36Z" fill={C.skySoft} {...O} />
      <path d="M2 -36 V-108 Q2 -118 0 -122 Q10 -118 10 -104 V-36Z" fill={C.sky} opacity={0.45} />
      <path d="M0 -52 C-9 -58 -8 -68 0 -66 C8 -68 9 -58 0 -52Z" fill={C.peach} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <Hl d="M-5 -42 V-96" w={3} o={0.85} />
      <Sparkle x={22} y={-96} size={7} color={C.cream} delay={0.4} />
    </g>
  );
}

/* ───────────────────────── Alas: bantal awan ───────────────────────── */

const PX_SEAT_CLOUD: SeatSpec = {
  lift: 22,
  back: (
    <g>
      <ellipse cx={200} cy={390} rx={78} ry={7} fill={C.taroSoft} opacity={0.4} />
      <ellipse cx={200} cy={386} rx={50} ry={5} fill={C.taroSoft} opacity={0.4} />
      <path
        d="M92 350 Q82 336 98 330 Q100 312 124 318 Q140 304 160 316 Q180 304 200 314 Q222 304 242 316 Q264 306 278 320 Q302 316 304 332 Q320 340 310 352 Q310 368 290 366 H110 Q86 368 92 350Z"
        fill={C.skySoft}
        {...O}
      />
      <Sparkle x={86} y={300} size={8} color={C.honeySoft} delay={0.1} />
      <Sparkle x={316} y={310} size={7} color={C.cream} delay={0.7} />
      <Sparkle x={300} y={372} size={6} color={C.honeySoft} delay={1.3} />
    </g>
  ),
  front: (
    <g>
      <path
        d="M88 354 Q78 338 96 336 Q96 322 118 326 Q130 314 150 326 Q168 318 186 328 Q204 318 222 328 Q244 318 262 328 Q282 322 290 334 Q312 332 312 348 Q322 358 308 366 Q312 380 288 378 H114 Q84 382 88 354Z"
        fill={C.cream}
        {...O}
      />
      <path d="M96 366 Q110 374 140 372 M244 374 Q276 376 296 366" fill="none" stroke={C.skySoft} strokeWidth={5} strokeLinecap="round" />
      <path d="M104 348 Q108 340 120 338 M214 340 Q224 336 234 340" fill="none" stroke={C.skySoft} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <Hl d="M104 346 Q108 338 122 336" w={3.2} o={0.9} />
      <Hl d="M262 338 Q272 334 280 340" w={3} o={0.8} />
      <circle cx={130} cy={360} r={2.4} fill={C.taroSoft} />
      <circle cx={270} cy={364} r={2.4} fill={C.peachSoft} />
    </g>
  ),
};

/* ───────────────────────── Alas: sepeda pastel ───────────────────────── */

function PxSpokeWheel({ cx, cy, r = 34 }: { cx: number; cy: number; r?: number }) {
  const spokes = [0, 45, 90, 135];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.cream} fillOpacity={0.25} {...O} />
      <circle cx={cx} cy={cy} r={r - 5} fill="none" stroke={C.wheel} strokeWidth={4.5} />
      {spokes.map((a) => {
        const rad = (a * Math.PI) / 180;
        const dx = Math.cos(rad) * (r - 6);
        const dy = Math.sin(rad) * (r - 6);
        return <path key={a} d={`M${f2(cx - dx)} ${f2(cy - dy)} L${f2(cx + dx)} ${f2(cy + dy)}`} stroke={INK} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />;
      })}
      <circle cx={cx} cy={cy} r={6} fill={C.honey} {...O25} />
    </g>
  );
}

const PX_SEAT_BIKE: SeatSpec = {
  lift: 40,
  back: (
    <g>
      <PxSpokeWheel cx={78} cy={332} />
      <Duo d="M78 332 L200 354" inner={OP_K.mint} ow={8} iw={4.6} />
      <Duo d="M200 354 L200 322" inner={OP_K.mint} ow={8} iw={4.6} />
      <Duo d="M78 332 L190 322" inner={OP_K.mintDark} ow={8} iw={4.6} />
      <circle cx={200} cy={354} r={9} fill={C.steel} {...O3} />
      <path d="M200 354 L222 372" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <rect x={214} y={368} width={20} height={8} rx={3} fill={C.peach} {...O25} />
      <path d="M200 354 L180 338" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <path d="M150 316 Q150 306 166 306 H236 Q252 306 252 318 Q252 328 236 328 H170 Q150 328 150 316Z" fill={C.peach} {...O} />
      <Hl d="M160 312 Q164 308 180 308" w={3} o={0.75} />
    </g>
  ),
  front: (
    <g>
      <Duo d="M200 322 L290 292" inner={OP_K.mint} ow={8} iw={4.6} />
      <Duo d="M222 340 L290 292" inner={OP_K.mintDark} ow={8} iw={4.6} />
      <PxSpokeWheel cx={322} cy={332} />
      <Duo d="M290 292 L322 332" inner={OP_K.mint} ow={8} iw={4.6} />
      <Duo d="M290 292 L284 276" inner={C.steel} ow={7} iw={4} />
      <Duo d="M270 276 H308" inner={C.steel} ow={7.5} iw={4.2} />
      <circle cx={270} cy={276} r={5.2} fill={C.peach} {...O25} />
      <rect x={300} y={268} width={14} height={9} rx={4} fill={C.peach} {...O25} />
      <circle cx={305} cy={294} r={5} fill={C.honey} {...O25} />
      <path d="M312 288 L348 288 L342 318 Q340 324 332 324 H320 Q312 324 310 318Z" fill={C.woodLight} {...O} />
      <path d="M318 290 L320 322 M326 290 V324 M334 290 L332 322" fill="none" stroke={C.woodDark} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
      <g>
        <circle cx={322} cy={284} r={6.4} fill={C.peachSoft} {...O25} />
        <circle cx={334} cy={282} r={6.4} fill={C.honeySoft} {...O25} />
        <circle cx={343} cy={286} r={5.6} fill={C.taroSoft} {...O25} />
        <PxLeaf x={328} y={290} rot={-20} s={0.6} />
      </g>
      <Sparkle x={356} y={276} size={7} color={C.honeySoft} delay={0.4} />
    </g>
  ),
};

/* ───────────────────────── Alas: gerobak kayu ───────────────────────── */

function PxApple({ cx, cy, c = C.peach }: { cx: number; cy: number; c?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={c} {...O25} />
      <path d={`M${cx} ${cy - 8} Q${cx + 1} ${cy - 13} ${cx + 4} ${cy - 14}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={cx + 6} cy={cy - 12} rx={4} ry={2.2} fill={C.matchaSoft} {...O2} />
      <circle cx={cx - 3.2} cy={cy - 3} r={1.8} fill={C.cream} opacity={0.9} />
    </g>
  );
}

const PX_SEAT_WAGON: SeatSpec = {
  lift: 22,
  back: (
    <g>
      <path d="M86 300 H314 L318 346 H82Z" fill={C.woodDark} {...O} />
      <path d="M92 312 H308 M90 326 H310" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" opacity={0.4} />
      <PxApple cx={106} cy={298} c={C.peach} />
      <PxApple cx={126} cy={296} c={C.honeySoft} />
      <PxApple cx={290} cy={296} c={C.matchaSoft} />
      <PxApple cx={272} cy={298} c={C.peach} />
      <rect x={82} y={296} width={236} height={9} rx={4} fill={C.wood} {...O3} />
      <Hl d="M92 300 H140" w={2.6} o={0.7} />
    </g>
  ),
  front: (
    <g>
      <path d="M80 330 Q80 324 88 324 H312 Q320 324 320 330 L316 360 Q315 366 308 366 H92 Q85 366 84 360Z" fill={C.wood} {...O} />
      <path d="M86 338 H314 M85 350 H315" fill="none" stroke={C.woodDark} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={78} y={320} width={244} height={10} rx={5} fill={C.woodLight} {...O} />
      <circle cx={96} cy={338} r={2.4} fill={C.honey} stroke={INK} strokeWidth={1.4} />
      <circle cx={304} cy={338} r={2.4} fill={C.honey} stroke={INK} strokeWidth={1.4} />
      <circle cx={96} cy={354} r={2.4} fill={C.honey} stroke={INK} strokeWidth={1.4} />
      <circle cx={304} cy={354} r={2.4} fill={C.honey} stroke={INK} strokeWidth={1.4} />
      <PxApple cx={112} cy={316} c={C.peachSoft} />
      <g>
        <circle cx={296} cy={316} r={8} fill={C.taroSoft} {...O25} />
        <circle cx={296} cy={316} r={3} fill={C.honey} stroke={INK} strokeWidth={1.6} />
      </g>
      <OpWheel cx={120} cy={352} r={16} tire={C.peach} rim={C.cream} />
      <OpWheel cx={280} cy={352} r={16} tire={C.peach} rim={C.cream} />
      <Duo d="M82 346 L34 366" inner={C.woodLight} ow={8} iw={4.6} />
      <Duo d="M28 356 L40 376" inner={C.honey} ow={8} iw={4.6} />
      <Hl d="M90 326 H150" w={2.8} o={0.75} />
      <Sparkle x={326} y={308} size={7} color={C.honeySoft} delay={0.6} />
    </g>
  ),
};

/* ───────────────────────── Alas: roket antariksa ───────────────────────── */

const PX_SEAT_ROCKET: SeatSpec = {
  lift: 40,
  back: (
    <g>
      <path d="M200 44 Q268 110 292 226 Q304 280 300 336 H100 Q96 280 108 226 Q132 110 200 44Z" fill={C.cream} {...O} />
      <path d="M200 44 Q244 84 258 132 Q230 142 200 142 Q170 142 142 132 Q156 84 200 44Z" fill={C.peach} {...O3} />
      <Hl d="M182 66 Q170 88 164 112" w={3.4} o={0.85} />
      <path d="M112 260 H288 M108 288 H292" fill="none" stroke={C.skySoft} strokeWidth={9} strokeLinecap="round" />
      <path d="M300 336 Q304 280 290 226 Q298 250 296 300 Q296 322 288 336Z" fill={C.skySoft} opacity={0.65} />
      <path d="M112 300 Q70 312 66 362 Q96 358 114 342Z" fill={C.peach} {...O} />
      <path d="M288 300 Q330 312 334 362 Q304 358 286 342Z" fill={C.peach} {...O} />
      <Sparkle x={84} y={130} size={9} color={C.honeySoft} delay={0.2} />
      <Sparkle x={322} y={186} size={8} color={C.cream} delay={0.9} />
      <Sparkle x={70} y={250} size={6} color={C.skySoft} delay={1.4} />
    </g>
  ),
  front: (
    <g>
      <path d="M114 308 Q200 290 286 308 V342 Q286 352 276 352 H124 Q114 352 114 342Z" fill={C.cream} {...O} />
      <path d="M114 308 Q200 290 286 308" fill="none" stroke={C.honey} strokeWidth={6} strokeLinecap="round" />
      <path d="M118 340 H282" stroke={C.skySoft} strokeWidth={6} strokeLinecap="round" />
      <circle cx={200} cy={328} r={12} fill={C.sky} {...O} />
      <circle cx={200} cy={328} r={7.4} fill={C.skySoft} stroke={INK} strokeWidth={1.8} />
      <Hl d="M194 324 Q196 321 200 321" w={2.4} o={0.9} />
      <circle cx={140} cy={330} r={3.2} fill={C.honey} stroke={INK} strokeWidth={1.8} />
      <circle cx={260} cy={330} r={3.2} fill={C.honey} stroke={INK} strokeWidth={1.8} />
      <rect x={168} y={350} width={64} height={9} rx={4.5} fill={C.steel} {...O3} />
      <motion.g style={fb(0.5, 0)} animate={{ scaleY: [1, 1.3, 1], scaleX: [1, 0.92, 1] }} transition={loop(0.35)}>
        <path d="M178 358 Q200 408 222 358Z" fill={C.honey} {...O} />
        <path d="M188 360 Q200 392 212 360Z" fill={C.honeySoft} />
        <path d="M194 360 Q200 378 206 360Z" fill={C.peach} />
      </motion.g>
      <Sparkle x={336} y={296} size={7} color={C.honeySoft} delay={0.5} />
    </g>
  ),
};

/* ───────────────────────── Registri ───────────────────────── */

const PROPS_X: Record<string, PropSpec> = {
  prop_balloon_bunch: { kind: "held", Item: PxBalloons },
  prop_pastel_umbrella: { kind: "held", Item: PxUmbrella },
  prop_flower_bouquet: { kind: "held", Item: PxBouquet },
  prop_mini_guitar: { kind: "held", Item: PxUkulele },
  prop_magic_wand: { kind: "held", Item: PxWand },
  prop_foam_sword: { kind: "held", Item: PxFoamSword },
  prop_cloud_cushion: { kind: "seat", ...PX_SEAT_CLOUD },
  prop_pastel_bicycle: { kind: "seat", ...PX_SEAT_BIKE },
  prop_wooden_wagon: { kind: "seat", ...PX_SEAT_WAGON },
  prop_rocket_ship: { kind: "seat", ...PX_SEAT_ROCKET },
};

const PX_PROP_BOX: Record<string, string> = {
  prop_balloon_bunch: "-58 -134 150 152",
  prop_pastel_umbrella: "-64 -144 184 164",
  prop_flower_bouquet: "-46 -112 92 120",
  prop_mini_guitar: "-50 -140 110 156",
  prop_magic_wand: "-54 -150 120 166",
  prop_foam_sword: "-50 -134 110 150",
  prop_cloud_cushion: "70 296 260 100",
  prop_pastel_bicycle: "40 260 330 120",
  prop_wooden_wagon: "10 290 320 100",
  prop_rocket_ship: "50 30 300 380",
};

/* ═════════════════════════════════════════════════════════════
 *  AURA & LATAR TAMBAHAN (8 aura + 8 latar) — registry AURA_REG / BG_REG
 * ═════════════════════════════════════════════════════════════ */

const ABX = {
  pinkA: "#FFC1D3",
  pinkB: "#FF9DB8",
  pinkC: "#FFE3EC",
  firefly: "#FFF59A",
  fireflyHalo: "#E4F06A",
  snow: "#6CC4FF",
  snowDark: "#3AA0E8",
  ember1: "#FF9A3C",
  ember2: "#FFC800",
  ember3: "#FF6F4A",
  galaxyA: "#9B8CFF",
  galaxyB: "#5BA8FF",
  clover: "#58CC02",
  cloverDark: "#3E9A02",
  cloverLight: "#8EE04A",
} as const;

function AbxGlow({
  uid,
  tag,
  cy,
  color,
  r,
  op,
  cx = 200,
}: {
  uid: string;
  tag: string;
  cy: number;
  color: string;
  r: number;
  op: number;
  cx?: number;
}) {
  const gid = `${uid}-${tag}`;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={op} />
          <stop offset="62%" stopColor={color} stopOpacity={op * 0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#${gid})`}
        style={fb()}
        animate={{ scale: [0.95, 1.06, 0.95] }}
        transition={loop(3.8)}
      />
    </g>
  );
}

/* ───────────────────────── Kunang-kunang ───────────────────────── */

const ABX_FIREFLIES: { x: number; y: number; dx: number; dy: number; r: number }[] = [
  { x: 64, y: -90, dx: 18, dy: -14, r: 3.6 },
  { x: 120, y: -140, dx: -14, dy: 10, r: 3 },
  { x: 300, y: -128, dx: 16, dy: 12, r: 3.8 },
  { x: 346, y: -60, dx: -12, dy: -16, r: 3.2 },
  { x: 48, y: 0, dx: 14, dy: 16, r: 3 },
  { x: 354, y: 24, dx: -16, dy: 12, r: 4 },
  { x: 76, y: 82, dx: 18, dy: -12, r: 3.4 },
  { x: 330, y: 96, dx: -14, dy: -10, r: 3.2 },
  { x: 118, y: 150, dx: 12, dy: -16, r: 3.6 },
  { x: 282, y: 152, dx: -16, dy: -12, r: 3 },
  { x: 204, y: -166, dx: 20, dy: 8, r: 3.4 },
  { x: 168, y: 176, dx: -10, dy: -12, r: 2.8 },
  { x: 236, y: 180, dx: 12, dy: -10, r: 3.2 },
];

function AbxFirefly({ x, y, dx, dy, r, d }: { x: number; y: number; dx: number; dy: number; r: number; d: number }) {
  return (
    <motion.g
      animate={{ x: [0, dx, -dx * 0.5, 0], y: [0, dy, -dy * 0.7, 0] }}
      transition={loop(6 + (d % 3), { delay: d * 0.35 })}
    >
      <motion.g
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={loop(2.2 + (d % 4) * 0.4, { delay: d * 0.3 })}
      >
        <circle cx={x} cy={y} r={r * 3.1} fill={ABX.fireflyHalo} opacity={0.3} />
        <circle cx={x} cy={y} r={r * 1.9} fill={ABX.firefly} opacity={0.55} />
        <circle cx={x} cy={y} r={r} fill={ABX.firefly} stroke={INK} strokeWidth={1.6} />
        <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill={C.cream} />
      </motion.g>
    </motion.g>
  );
}

function AbxFireflies({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="ffg" cy={cy} color="#E4F06A" r={150} op={0.26} />
      {ABX_FIREFLIES.map((f, i) => (
        <AbxFirefly key={i} {...f} y={cy + f.y} d={i} />
      ))}
      <Sparkle x={96} y={cy - 30} size={5} color={C.cream} delay={0.5} />
      <Sparkle x={308} y={cy + 52} size={5} color={ABX.firefly} delay={1.2} />
    </g>
  );
}

/* ───────────────────────── Kupu-kupu ───────────────────────── */

function AbxButterflyShape({ c1, c2 }: { c1: string; c2: string }) {
  return (
    <g>
      <motion.g style={fb()} animate={{ scaleX: [1, 0.3, 1] }} transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M0 -1 C-6 -17 -23 -15 -21 -3 C-20 4 -8 3 0 0Z" fill={c1} {...O25} strokeWidth={2.2} />
        <path d="M0 1 C-4 9 -14 17 -18 11 C-20 5 -8 3 0 1Z" fill={c2} {...O25} strokeWidth={2.2} />
        <path d="M0 -1 C6 -17 23 -15 21 -3 C20 4 8 3 0 0Z" fill={c1} {...O25} strokeWidth={2.2} />
        <path d="M0 1 C4 9 14 17 18 11 C20 5 8 3 0 1Z" fill={c2} {...O25} strokeWidth={2.2} />
        <circle cx={-13} cy={-6} r={2.4} fill={C.cream} opacity={0.9} />
        <circle cx={13} cy={-6} r={2.4} fill={C.cream} opacity={0.9} />
      </motion.g>
      <ellipse cx={0} cy={0} rx={2} ry={7.4} fill={INK} />
      <path d="M0 -6 Q-4 -13 -7 -13 M0 -6 Q4 -13 7 -13" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

const ABX_BUTTERFLIES: { x: number; y: number; s: number; c1: string; c2: string; path: [number[], number[]] }[] = [
  { x: 76, y: -90, s: 1.1, c1: C.peach, c2: C.peachSoft, path: [[0, 26, 8, -14, 0], [0, -18, -34, -14, 0]] },
  { x: 330, y: -110, s: 0.9, c1: C.taro, c2: C.taroSoft, path: [[0, -22, 12, 20, 0], [0, -12, -28, -8, 0]] },
  { x: 58, y: 40, s: 0.8, c1: C.sky, c2: C.skySoft, path: [[0, 22, 40, 14, 0], [0, 14, -10, -24, 0]] },
  { x: 340, y: 60, s: 1.15, c1: C.honey, c2: C.honeySoft, path: [[0, -26, -8, 12, 0], [0, -20, -40, -16, 0]] },
  { x: 110, y: 150, s: 0.85, c1: C.matchaSoft, c2: C.matcha, path: [[0, 18, 34, 10, 0], [0, -16, -6, 14, 0]] },
  { x: 290, y: 164, s: 1, c1: C.peachSoft, c2: C.taroSoft, path: [[0, -20, -34, -6, 0], [0, -24, -2, 12, 0]] },
  { x: 214, y: -176, s: 0.75, c1: C.skySoft, c2: C.taroSoft, path: [[0, 24, -6, -20, 0], [0, 10, 20, 8, 0]] },
];

function AbxButterflies({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="bfg" cy={cy} color="#FFD3E6" r={150} op={0.32} />
      {ABX_BUTTERFLIES.map((b, i) => (
        <motion.g
          key={i}
          animate={{ x: b.path[0], y: b.path[1] }}
          transition={loop(7 + (i % 3) * 1.5, { delay: i * 0.4 })}
        >
          <g transform={`translate(${b.x} ${cy + b.y}) scale(${b.s})`} style={SVG_ATTR_ORIGIN}>
            <AbxButterflyShape c1={b.c1} c2={b.c2} />
          </g>
        </motion.g>
      ))}
      <Sparkle x={100} y={cy + 8} size={5} color={C.cream} delay={0.3} />
      <Sparkle x={304} y={cy - 40} size={6} color={C.peachSoft} delay={1.1} />
    </g>
  );
}

/* ───────────────────────── Kelopak sakura ───────────────────────── */

const ABX_PETALS: { x: number; amp: number; rot: number; dur: number; d: number; s: number; deep: boolean }[] = Array.from(
  { length: 16 },
  (_, i) => ({
    x: 30 + abHash(i * 3 + 1) * 340,
    amp: 14 + abHash(i * 5 + 2) * 20,
    rot: abHash(i * 7 + 3) * 360,
    dur: 5.2 + abHash(i * 11 + 4) * 2.6,
    d: abHash(i * 13 + 5) * 6,
    s: 0.8 + abHash(i * 17 + 6) * 0.7,
    deep: i % 3 === 0,
  }),
);

function AbxPetal({ cy, p }: { cy: number; p: (typeof ABX_PETALS)[number] }) {
  return (
    <motion.g
      style={fb()}
      animate={{
        x: [0, p.amp, -p.amp * 0.6, p.amp * 0.8, 0],
        y: [0, 90, 170, 250, 330],
        rotate: [p.rot, p.rot + 140, p.rot + 220, p.rot + 330, p.rot + 420],
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{ duration: p.dur, repeat: Infinity, ease: "linear", delay: p.d }}
    >
      <g transform={`translate(${p.x} ${cy - 176}) scale(${p.s})`} style={SVG_ATTR_ORIGIN}>
        <path
          d="M0 -9 C7 -9 10 -2 6 5 L0 2.4 L-6 5 C-10 -2 -7 -9 0 -9Z"
          fill={p.deep ? ABX.pinkB : ABX.pinkA}
          stroke="#E0708F"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <path d="M0 -6 V1" stroke={C.cream} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      </g>
    </motion.g>
  );
}

function AbxSakuraFlower({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.g
        style={fb()}
        animate={{ rotate: [0, 360], y: [0, -8, 0] }}
        transition={{ duration: 16 + d * 3, repeat: Infinity, ease: "linear" }}
      >
        <g transform={`scale(${s})`} style={SVG_ATTR_ORIGIN}>
          {[0, 72, 144, 216, 288].map((a) => (
            <path
              key={a}
              d="M0 0 C-7 -6 -6 -15 0 -14 C6 -15 7 -6 0 0Z"
              transform={`rotate(${a})`}
              style={SVG_ATTR_ORIGIN}
              fill={ABX.pinkA}
              stroke="#E0708F"
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          ))}
          <circle r={3.4} fill={C.honey} stroke="#E0708F" strokeWidth={1.4} />
        </g>
      </motion.g>
    </g>
  );
}

function AbxCherry({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="chg" cy={cy} color="#FFC1D3" r={156} op={0.34} />
      {ABX_PETALS.map((p, i) => (
        <AbxPetal key={i} cy={cy} p={p} />
      ))}
      <AbxSakuraFlower x={70} y={cy - 40} s={1} d={0} />
      <AbxSakuraFlower x={336} y={cy + 20} s={1.2} d={1} />
      <AbxSakuraFlower x={120} y={cy + 140} s={0.8} d={2} />
      <Sparkle x={310} y={cy - 120} size={6} color={C.cream} delay={0.4} />
    </g>
  );
}

/* ───────────────────────── Nada musik ───────────────────────── */

function AbxNoteGlyph({ kind, col }: { kind: number; col: string }) {
  const head = (cx: number, cy: number) => (
    <ellipse
      cx={cx}
      cy={cy}
      rx={6}
      ry={4.6}
      transform={`rotate(-22 ${cx} ${cy})`}
      style={SVG_ATTR_ORIGIN}
      fill={col}
      stroke={INK}
      strokeWidth={2.2}
    />
  );
  if (kind === 0)
    return (
      <g>
        <path d="M5 8 V-14" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M5 -14 Q16 -10 13 1 Q11 -6 5 -8Z" fill={col} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        {head(0, 9)}
      </g>
    );
  if (kind === 1)
    return (
      <g>
        <path d="M-6 8 V-12 M10 4 V-16" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M-6 -12 L10 -16 V-9 L-6 -5Z" fill={col} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        {head(-11, 9)}
        {head(5, 5)}
      </g>
    );
  if (kind === 2)
    return (
      <g>
        <path d="M5 8 V-14" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        {head(0, 9)}
      </g>
    );
  return (
    <g>
      <path d="M2 -20 C12 -12 5 -3 -2 2 C-9 8 -4 16 2 15 C9 14 8 6 1 6 M-1 -14 V18" fill="none" stroke={INK} strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 -20 C12 -12 5 -3 -2 2 C-9 8 -4 16 2 15 C9 14 8 6 1 6 M-1 -14 V18" fill="none" stroke={col} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={-2} cy={19} r={2.6} fill={col} stroke={INK} strokeWidth={1.8} />
    </g>
  );
}

const ABX_NOTE_COLS = [C.peach, C.taro, C.sky, C.honey, C.matcha, C.peachSoft] as const;
const ABX_NOTES: { x: number; y: number; k: number; d: number; dur: number }[] = [
  { x: 66, y: 120, k: 0, d: 0, dur: 4.6 },
  { x: 330, y: 100, k: 1, d: 0.8, dur: 5.2 },
  { x: 48, y: 0, k: 3, d: 1.6, dur: 5 },
  { x: 354, y: -20, k: 2, d: 2.2, dur: 4.4 },
  { x: 100, y: 170, k: 1, d: 3, dur: 5.4 },
  { x: 300, y: 176, k: 0, d: 0.4, dur: 4.8 },
  { x: 150, y: 60, k: 2, d: 2.6, dur: 5 },
  { x: 260, y: 40, k: 3, d: 1.2, dur: 5.6 },
  { x: 84, y: -120, k: 2, d: 3.4, dur: 4.6 },
  { x: 318, y: -140, k: 0, d: 2, dur: 5.2 },
];

function AbxMusic({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="mug" cy={cy} color="#E3B6FF" r={150} op={0.3} />
      {ABX_NOTES.map((n, i) => (
        <motion.g
          key={i}
          animate={{ y: [0, -38, -76, -112], x: [0, 12, -12, 8], opacity: [0, 1, 1, 0] }}
          transition={{ duration: n.dur, repeat: Infinity, ease: "easeOut", delay: n.d }}
        >
          <g transform={`translate(${n.x} ${cy + n.y + 40})`} style={SVG_ATTR_ORIGIN}>
            <motion.g
              style={fb()}
              animate={{ rotate: [-8, 8, -8] }}
              transition={loop(2 + (i % 3) * 0.4, { delay: n.d })}
            >
              <AbxNoteGlyph kind={n.k} col={ABX_NOTE_COLS[i % ABX_NOTE_COLS.length]} />
            </motion.g>
          </g>
        </motion.g>
      ))}
      <Sparkle x={96} y={cy - 70} size={6} color={C.cream} delay={0.2} />
      <Sparkle x={310} y={cy + 60} size={6} color={C.taroSoft} delay={1} />
    </g>
  );
}

/* ───────────────────────── Semanggi hoki ───────────────────────── */

function AbxClover({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M0 2 Q2 12 8 16" fill="none" stroke={ABX.cloverDark} strokeWidth={2.6} strokeLinecap="round" />
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a})`} style={SVG_ATTR_ORIGIN}>
          <path
            d="M0 0 C-10 -4 -11 -15 -4.5 -16 C-1.4 -16.4 0 -13 0 -11 C0 -13 1.4 -16.4 4.5 -16 C11 -15 10 -4 0 0Z"
            fill={ABX.cloverLight}
            stroke={INK}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <path d="M0 -3 V-10" stroke={ABX.cloverDark} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      ))}
      <circle r={2.6} fill={C.honey} stroke={INK} strokeWidth={1.6} />
    </g>
  );
}

function AbxLuck({ cy, uid }: { cy: number; uid: string }) {
  const cx = 200;
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="lkg" cy={cy} color="#8EE04A" r={160} op={0.3} />
      <AbOrbit cx={cx} cy={cy} r={142} dur={34}>
        <circle cx={cx} cy={cy} r={142} fill="none" stroke={C.honey} strokeWidth={2.4} strokeDasharray="3 11" strokeLinecap="round" opacity={0.75} />
        <AbOrbitItems cx={cx} cy={cy} r={142} count={6} offset={-90} render={() => <AbxClover s={1.1} />} />
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={104} dur={26} reverse>
        <AbOrbitItems cx={cx} cy={cy} r={104} count={4} offset={-40} render={(i) => <AbxClover s={0.7 + (i % 2) * 0.1} />} />
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={124} dur={20}>
        <AbOrbitItems
          cx={cx}
          cy={cy}
          r={124}
          count={8}
          offset={10}
          render={(i) => <circle r={2.4 + (i % 3) * 0.6} fill={i % 2 ? C.honey : C.honeySoft} />}
        />
      </AbOrbit>
      <Sparkle x={64} y={cy - 80} size={8} color={C.honey} delay={0} />
      <Sparkle x={338} y={cy - 50} size={8} color={C.cream} delay={0.7} />
      <Sparkle x={316} y={cy + 130} size={6} color={C.honeySoft} delay={1.3} />
      <Sparkle x={92} y={cy + 120} size={6} color={C.honey} delay={1.8} />
    </g>
  );
}

/* ───────────────────────── Kristal salju ───────────────────────── */

function abxFlakePath(s: number): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = i * 60 - 90;
    const [x1, y1] = abPolar(0, 0, s, a);
    d += `M0 0 L${x1} ${y1} `;
    const [bx, by] = abPolar(0, 0, s * 0.58, a);
    const [l1x, l1y] = abPolar(bx, by, s * 0.3, a - 55);
    const [l2x, l2y] = abPolar(bx, by, s * 0.3, a + 55);
    d += `M${bx} ${by} L${l1x} ${l1y} M${bx} ${by} L${l2x} ${l2y} `;
  }
  return d;
}

function AbxFlake({ s, rot = 0 }: { s: number; rot?: number }) {
  const d = abxFlakePath(s);
  return (
    <g transform={`rotate(${rot})`} style={SVG_ATTR_ORIGIN}>
      <path d={d} fill="none" stroke={C.cream} strokeWidth={5.2} strokeLinecap="round" />
      <path d={d} fill="none" stroke={ABX.snow} strokeWidth={2.6} strokeLinecap="round" />
      <circle r={s * 0.14} fill={C.cream} stroke={ABX.snow} strokeWidth={1.6} />
    </g>
  );
}

const ABX_FLAKES: { x: number; y: number; s: number; dur: number; d: number; dy: number }[] = [
  { x: 64, y: -100, s: 16, dur: 18, d: 0, dy: 26 },
  { x: 332, y: -120, s: 13, dur: 14, d: 1, dy: -22 },
  { x: 44, y: 10, s: 11, dur: 12, d: 2, dy: 24 },
  { x: 356, y: 30, s: 18, dur: 20, d: 0.5, dy: 28 },
  { x: 98, y: 110, s: 14, dur: 16, d: 1.5, dy: -24 },
  { x: 306, y: 120, s: 12, dur: 13, d: 2.5, dy: 22 },
  { x: 150, y: 176, s: 10, dur: 11, d: 3, dy: -18 },
  { x: 250, y: -176, s: 12, dur: 15, d: 1.2, dy: 20 },
  { x: 196, y: 186, s: 9, dur: 12, d: 0.2, dy: -16 },
];

function AbxSnowflakes({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="sng" cy={cy} color="#BDE7FF" r={165} op={0.4} />
      {ABX_FLAKES.map((f, i) => (
        <motion.g
          key={i}
          animate={{ y: [0, f.dy, 0], x: [0, 8, 0] }}
          transition={loop(5 + (i % 3), { delay: f.d })}
        >
          <g transform={`translate(${f.x} ${cy + f.y})`} style={SVG_ATTR_ORIGIN}>
            <motion.g
              style={fb()}
              animate={{ rotate: [0, i % 2 ? -360 : 360] }}
              transition={{ duration: f.dur, repeat: Infinity, ease: "linear" }}
            >
              <circle r={f.s + 2} fill="none" stroke="none" pointerEvents="none" />
              <AbxFlake s={f.s} />
            </motion.g>
          </g>
        </motion.g>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.circle
          key={i}
          cx={60 + abHash(i + 40) * 280}
          cy={cy - 150 + abHash(i + 50) * 60}
          r={2.2 + (i % 3) * 0.6}
          fill={C.cream}
          stroke={ABX.snow}
          strokeWidth={1.2}
          animate={{ y: [0, 300], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6 + i * 0.5, repeat: Infinity, ease: "linear", delay: i * 0.9 }}
        />
      ))}
      <Sparkle x={86} y={cy - 40} size={6} color={C.cream} delay={0.3} />
      <Sparkle x={318} y={cy + 50} size={6} color={ABX.snow} delay={1.1} />
    </g>
  );
}

/* ───────────────────────── Bara api hangat ───────────────────────── */

const ABX_EMBER_COLS = [ABX.ember1, ABX.ember2, ABX.ember3, C.honeySoft] as const;
const ABX_EMBERS: { x: number; y: number; r: number; dx: number; dur: number; d: number }[] = Array.from({ length: 18 }, (_, i) => ({
  x: 40 + abHash(i * 3 + 70) * 320,
  y: 40 + abHash(i * 5 + 71) * 200,
  r: 2 + abHash(i * 7 + 72) * 2.6,
  dx: (abHash(i * 11 + 73) - 0.5) * 36,
  dur: 3.2 + abHash(i * 13 + 74) * 2,
  d: abHash(i * 17 + 75) * 4,
}));

function AbxFlame({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={SVG_ATTR_ORIGIN}>
      <motion.g style={fb(0.5, 1)} animate={{ scaleY: [1, 1.18, 0.95, 1], scaleX: [1, 0.92, 1.05, 1] }} transition={loop(1.1, { delay: d })}>
        <g transform={`scale(${s})`} style={SVG_ATTR_ORIGIN}>
          <path d="M0 0 C-12 -2 -13 -16 -6 -26 C-6 -18 -2 -16 0 -20 C-1 -28 6 -34 8 -40 C16 -28 14 -12 8 -4 C6 -1 3 0 0 0Z" fill={ABX.ember1} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M0 -2 C-6 -3 -6 -11 -2 -16 C-1 -12 3 -10 4 -16 C8 -10 6 -3 0 -2Z" fill={C.honeySoft} />
        </g>
      </motion.g>
    </g>
  );
}

function AbxEmbers({ cy, uid }: { cy: number; uid: string }) {
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="emg" cy={cy} color="#FFB070" r={160} op={0.34} />
      {ABX_EMBERS.map((e, i) => (
        <motion.g
          key={i}
          style={fb()}
          animate={{ y: [0, -70, -140], x: [0, e.dx, -e.dx * 0.6], opacity: [0, 1, 0], scale: [1, 0.8, 0.3] }}
          transition={{ duration: e.dur, repeat: Infinity, ease: "easeOut", delay: e.d }}
        >
          <circle cx={e.x} cy={cy - 200 + e.y + 120} r={e.r * 2.2} fill={ABX_EMBER_COLS[i % 4]} opacity={0.22} />
          <circle cx={e.x} cy={cy - 200 + e.y + 120} r={e.r} fill={ABX_EMBER_COLS[i % 4]} />
        </motion.g>
      ))}
      <AbxFlame x={62} y={cy + 150} s={0.7} d={0} />
      <AbxFlame x={338} y={cy + 150} s={0.8} d={0.4} />
      <AbxFlame x={34} y={cy + 100} s={0.5} d={0.8} />
      <AbxFlame x={366} y={cy + 102} s={0.55} d={0.2} />
      <Sparkle x={90} y={cy - 70} size={6} color={C.honey} delay={0.2} />
      <Sparkle x={316} y={cy - 30} size={6} color={C.honeySoft} delay={0.9} />
    </g>
  );
}

/* ───────────────────────── Pusaran galaksi ───────────────────────── */

function abxSpiral(cx: number, cy: number, a0: number, turns: number, r0: number, r1: number): string {
  const pts: string[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = abPolar(cx, cy, r0 + (r1 - r0) * t, a0 + t * turns);
    pts.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
  }
  return pts.join(" ");
}

function AbxPlanet({ r, body, shade, ring }: { r: number; body: string; shade: string; ring: string }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={r * 1.9} ry={r * 0.55} fill="none" stroke={ring} strokeWidth={3} opacity={0.9} />
      <circle r={r} fill={body} {...O25} />
      <path d={`M${-r * 0.7} ${r * 0.3} Q0 ${r * 0.9} ${r * 0.7} ${r * 0.3}`} fill="none" stroke={shade} strokeWidth={r * 0.28} strokeLinecap="round" opacity={0.7} />
      <circle cx={-r * 0.35} cy={-r * 0.35} r={r * 0.2} fill={C.cream} opacity={0.85} />
      <path d={`M${-r * 1.9} 0 Q${-r * 1.9} ${r * 0.55} 0 ${r * 0.55} Q${r * 1.9} ${r * 0.55} ${r * 1.9} 0`} fill="none" stroke={ring} strokeWidth={3} />
    </g>
  );
}

function AbxGalaxy({ cy, uid }: { cy: number; uid: string }) {
  const cx = 200;
  return (
    <g pointerEvents="none">
      <AbxGlow uid={uid} tag="gxg" cy={cy} color={ABX.galaxyA} r={185} op={0.42} />
      <AbxGlow uid={uid} tag="gxh" cy={cy} color={ABX.galaxyB} r={120} op={0.22} />
      <AbOrbit cx={cx} cy={cy} r={150} dur={70}>
        {[0, 120, 240].map((a, i) => (
          <g key={a}>
            <path d={abxSpiral(cx, cy, a, 300, 40, 150)} fill="none" stroke={i === 1 ? C.skySoft : C.taroSoft} strokeWidth={4} strokeLinecap="round" strokeDasharray="0.1 9" opacity={0.95} />
            <path d={abxSpiral(cx, cy, a + 10, 300, 40, 150)} fill="none" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" strokeDasharray="0.1 14" opacity={0.9} />
          </g>
        ))}
      </AbOrbit>
      <circle cx={cx} cy={cy} r={158} fill="none" stroke={C.cream} strokeWidth={2.2} strokeDasharray="2 10" strokeLinecap="round" opacity={0.75} />
      <AbOrbit cx={cx} cy={cy} r={146} dur={44}>
        <AbOrbitItems cx={cx} cy={cy} r={146} count={1} offset={-30} render={() => <AbxPlanet r={9} body={C.taro} shade={C.taroDark} ring={C.honeySoft} />} />
      </AbOrbit>
      <AbOrbit cx={cx} cy={cy} r={108} dur={30} reverse>
        <AbOrbitItems cx={cx} cy={cy} r={108} count={1} offset={140} render={() => <AbxPlanet r={6} body={C.sky} shade={C.skyDark} ring={C.peachSoft} />} />
        <AbOrbitItems
          cx={cx}
          cy={cy}
          r={108}
          count={3}
          offset={20}
          render={(i) => <polygon points={starPoints(0, 0, 7, 3)} fill={i % 2 ? C.honey : C.cream} {...O2} />}
        />
      </AbOrbit>
      <Sparkle x={52} y={cy - 100} size={9} color={C.cream} delay={0} />
      <Sparkle x={348} y={cy - 90} size={8} color={C.skySoft} delay={0.7} />
      <Sparkle x={330} y={cy + 120} size={7} color={C.taroSoft} delay={1.3} />
      <Sparkle x={70} y={cy + 130} size={7} color={C.honeySoft} delay={1.8} />
      <Sparkle x={200} y={cy - 178} size={6} color={C.cream} delay={0.4} />
    </g>
  );
}

const AURA_REG: Record<string, AuraArt> = {
  aura_fireflies: AbxFireflies,
  aura_butterflies: AbxButterflies,
  aura_cherry_blossoms: AbxCherry,
  aura_music_notes: AbxMusic,
  aura_clover_luck: AbxLuck,
  aura_snowflakes: AbxSnowflakes,
  aura_fire_embers: AbxEmbers,
  aura_galaxy_swirl: AbxGalaxy,
};

/* ═════════════════════════════════════════════════════════════
 *  LATAR TAMBAHAN
 * ═════════════════════════════════════════════════════════════ */

/* ───────────────────────── Hutan Pagi Berembun ───────────────────────── */

function AbxTree({ x, base, h, w, c1, c2, outline = false }: { x: number; base: number; h: number; w: number; c1: string; c2: string; outline?: boolean }) {
  const ol = outline ? { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const } : {};
  return (
    <g>
      <rect x={x - w * 0.09} y={base - h * 0.42} width={w * 0.18} height={h * 0.42} rx={3} fill="#C99560" {...ol} />
      <ellipse cx={x} cy={base - h * 0.62} rx={w * 0.5} ry={h * 0.38} fill={c1} {...ol} />
      <ellipse cx={x - w * 0.14} cy={base - h * 0.74} rx={w * 0.26} ry={h * 0.2} fill={c2} opacity={0.8} />
    </g>
  );
}

function AbxMushroom({ x, y, s = 1, cap = C.peach }: { x: number; y: number; s?: number; cap?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M-6 0 Q-7 -12 -5 -14 H5 Q7 -12 6 0Z" fill={C.cream} {...abThin} />
      <path d="M-18 -13 Q-18 -32 0 -32 Q18 -32 18 -13 Q0 -8 -18 -13Z" fill={cap} {...abThin} />
      <circle cx={-7} cy={-23} r={3} fill={C.cream} />
      <circle cx={6} cy={-26} r={2.4} fill={C.cream} />
      <circle cx={9} cy={-17} r={2} fill={C.cream} />
    </g>
  );
}

function AbxFern({ x, y, s = 1, flip = 1 }: { x: number; y: number; s?: number; flip?: 1 | -1 }) {
  return (
    <motion.g style={fb(0.5, 1)} animate={{ rotate: [-2, 2, -2] }} transition={loop(4.2)}>
      <g transform={`translate(${x} ${y}) scale(${s * flip} ${s})`} style={SVG_ATTR_ORIGIN}>
        {[-40, -20, 0, 20, 40].map((a) => (
          <path
            key={a}
            d="M0 0 Q4 -22 0 -42 Q-6 -22 0 0Z"
            transform={`rotate(${a})`}
            style={SVG_ATTR_ORIGIN}
            fill={a % 40 === 0 ? C.matcha : C.matchaSoft}
            {...abThin}
            strokeWidth={2.2}
          />
        ))}
      </g>
    </motion.g>
  );
}

function AbxForest({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-fsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D6F2AE" />
          <stop offset="60%" stopColor="#F2FADA" />
          <stop offset="100%" stopColor="#E8F7C6" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-fsky)`} />

      {/* pohon jauh */}
      <g opacity={0.55}>
        <AbxTree x={110} base={346} h={180} w={92} c1="#BDE59A" c2="#D4F0B4" />
        <AbxTree x={210} base={346} h={150} w={80} c1="#C9EBA8" c2="#DDF4C2" />
        <AbxTree x={290} base={346} h={190} w={96} c1="#B4DE90" c2="#CBEBA8" />
        <AbxTree x={160} base={346} h={120} w={66} c1="#D2EDB4" c2="#E4F6CC" />
      </g>

      {/* berkas cahaya */}
      <g>
        <motion.polygon points="120,0 160,0 250,350 170,350" fill={C.honeySoft} animate={{ opacity: [0.1, 0.22, 0.1] }} transition={loop(5)} />
        <motion.polygon points="190,0 215,0 300,350 250,350" fill={C.honeySoft} animate={{ opacity: [0.14, 0.08, 0.14] }} transition={loop(6)} />
        <motion.polygon points="70,0 90,0 140,350 105,350" fill={C.honeySoft} animate={{ opacity: [0.06, 0.16, 0.06] }} transition={loop(4.4)} />
      </g>

      {/* batang kiri */}
      <path d="M-6 0 H64 Q58 120 70 250 Q74 320 90 350 H-6Z" fill="#C99560" {...O} />
      <path d="M14 0 Q22 130 16 350 M40 20 Q46 150 38 350" fill="none" stroke="#B77C3F" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <ellipse cx={34} cy={140} rx={6} ry={9} fill="#9A6431" stroke={INK} strokeWidth={2.4} />
      {/* batang kanan */}
      <path d="M406 0 H336 Q342 110 330 240 Q326 310 312 350 H406Z" fill="#C99560" {...O} />
      <path d="M380 0 Q372 140 380 350 M356 24 Q352 160 358 350" fill="none" stroke="#B77C3F" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      {/* tajuk dedaunan */}
      <g {...abThin}>
        <circle cx={10} cy={22} r={50} fill={C.matcha} />
        <circle cx={70} cy={6} r={38} fill={C.matchaSoft} />
        <circle cx={44} cy={62} r={30} fill={C.matcha} />
        <circle cx={392} cy={24} r={52} fill={C.matcha} />
        <circle cx={332} cy={4} r={36} fill={C.matchaSoft} />
        <circle cx={360} cy={66} r={30} fill={C.matcha} />
        <circle cx={206} cy={-14} r={34} fill={C.matchaSoft} />
        <circle cx={150} cy={-8} r={28} fill={C.matcha} />
      </g>

      {/* tanah */}
      <path d="M0 346 Q60 330 130 342 Q200 352 270 340 Q340 330 400 344 V410 H0Z" fill="#8EDB4F" {...abThin} />
      <rect x={0} y={362} width={400} height={48} fill="#7ACF3C" />
      <path d="M0 362 Q100 370 200 362 Q300 372 400 362" fill="none" stroke="#6CBE31" strokeWidth={3} strokeLinecap="round" />
      <g fill="#A9E46E">
        <ellipse cx={90} cy={384} rx={30} ry={5} />
        <ellipse cx={300} cy={390} rx={36} ry={5} />
      </g>

      {/* jamur & pakis & bunga */}
      <AbxMushroom x={96} y={360} s={1} />
      <AbxMushroom x={120} y={364} s={0.6} cap={C.honey} />
      <AbxMushroom x={312} y={366} s={0.8} cap={C.peachSoft} />
      <AbxFern x={348} y={366} s={0.9} />
      <AbxFern x={60} y={370} s={0.8} flip={-1} />
      <AbDaisy x={256} y={380} s={1.1} />
      <AbDaisy x={146} y={388} s={0.9} />

      {/* embun */}
      <Sparkle x={84} y={250} size={5} color={C.cream} delay={0.2} />
      <Sparkle x={322} y={210} size={6} color={C.cream} delay={0.9} />
      <Sparkle x={250} y={130} size={5} color={C.honeySoft} delay={1.5} />
      <AbMote x={150} y={110} d={0.4} />
      <AbMote x={280} y={176} d={1.2} r={2} />
      <AbMote x={110} y={220} d={2} r={2} />
    </g>
  );
}

/* ───────────────────────── Negeri Permen ───────────────────────── */

function AbxLollipop({ x, y, r, c1, c2, d }: { x: number; y: number; r: number; c1: string; c2: string; d: number }) {
  const spiral = abxSpiral(x, y, 0, 900, 2, r - 5);
  return (
    <motion.g animate={{ rotate: [-2, 2, -2] }} style={fb(0.5, 1)} transition={loop(4, { delay: d })}>
      <rect x={x - 4.5} y={y + r - 4} width={9} height={350 - y - r + 8} rx={4.5} fill={C.cream} {...O3} />
      <circle cx={x} cy={y} r={r} fill={c1} {...O} />
      <path d={spiral} fill="none" stroke={c2} strokeWidth={r * 0.2} strokeLinecap="round" />
      <path d={`M${x - r * 0.7} ${y - r * 0.2} Q${x - r * 0.6} ${y - r * 0.65} ${x - r * 0.15} ${y - r * 0.75}`} fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.9} />
    </motion.g>
  );
}

function AbxCane({ x, base, h, flip = 1 }: { x: number; base: number; h: number; flip?: 1 | -1 }) {
  const d = `M${x} ${base} V${base - h} Q${x} ${base - h - 26} ${x + 22 * flip} ${base - h - 26} Q${x + 44 * flip} ${base - h - 26} ${x + 44 * flip} ${base - h - 4}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={INK} strokeWidth={15} />
      <path d={d} stroke={C.cream} strokeWidth={9} />
      <path d={d} stroke={C.peach} strokeWidth={9} strokeDasharray="7 11" strokeLinecap="butt" />
    </g>
  );
}

function AbxGumdrop({ x, y, col, s = 1 }: { x: number; y: number; col: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M-14 0 Q-14 -22 0 -22 Q14 -22 14 0Z" fill={col} {...abThin} />
      <path d="M-8 -6 Q-8 -14 -2 -16" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <g fill={C.cream} opacity={0.8}>
        <circle cx={-2} cy={-8} r={1.2} />
        <circle cx={6} cy={-12} r={1.2} />
        <circle cx={7} cy={-4} r={1.2} />
      </g>
    </g>
  );
}

function AbxCandy({ uid }: { uid: string }) {
  const sprinkle = ["#FF8B7B", "#38B6FF", "#FFC800", "#CE82FF", "#58CC02"] as const;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-csky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD9EA" />
          <stop offset="55%" stopColor="#F1E4FF" />
          <stop offset="100%" stopColor="#E4F6FF" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-csky)`} />

      <AbCloud x={92} y={96} s={0.62} drift={14} dur={13} fill={C.peachSoft} />
      <AbCloud x={316} y={70} s={0.55} drift={12} dur={11} fill={C.skySoft} />
      <AbCloud x={216} y={44} s={0.42} drift={10} dur={9} fill={C.taroSoft} />

      {/* bukit jauh */}
      <path d="M-10 346 Q50 284 120 330 Q160 300 220 336 Q280 292 340 326 Q380 306 410 336 V360 H-10Z" fill="#CFF3E2" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M-10 346 Q40 316 90 336 M150 340 Q200 316 250 340" fill="none" stroke="#A8E4CB" strokeWidth={4} strokeLinecap="round" />

      <AbxLollipop x={52} y={176} r={38} c1={C.peach} c2={C.cream} d={0} />
      <AbxLollipop x={352} y={150} r={32} c1={C.taro} c2={C.cream} d={0.8} />
      <AbxCane x={112} base={346} h={86} />
      <AbxCane x={296} base={346} h={70} flip={-1} />

      {/* tanah gula */}
      <path d="M-4 346 Q30 336 60 346 Q92 338 124 348 Q160 338 196 348 Q232 338 268 348 Q304 338 336 348 Q370 338 404 346 V372 H-4Z" fill="#FFBBD4" {...O3} />
      <path d="M-4 372 H404 V410 H-4Z" fill="#E8B87A" />
      <path d="M-4 372 Q20 384 44 372 Q68 384 92 372 Q116 384 140 372 Q164 384 188 372 Q212 384 236 372 Q260 384 284 372 Q308 384 332 372 Q356 384 380 372 L404 376" fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-4 372 H404" stroke={INK} strokeWidth={2.6} />

      {/* taburan */}
      <g strokeWidth={4} strokeLinecap="round">
        {Array.from({ length: 22 }).map((_, i) => (
          <path
            key={i}
            d={`M${14 + i * 18 + abHash(i) * 8} ${352 + abHash(i + 9) * 14} l${4 + abHash(i + 3) * 3} ${-2 - abHash(i + 5) * 3}`}
            stroke={sprinkle[i % 5]}
          />
        ))}
      </g>
      <AbxGumdrop x={26} y={346} col={C.sky} s={0.9} />
      <AbxGumdrop x={372} y={348} col={C.honey} s={1} />
      <AbxGumdrop x={348} y={350} col={C.peach} s={0.7} />
      <Sparkle x={150} y={120} size={7} color={C.cream} delay={0.3} />
      <Sparkle x={256} y={96} size={6} color={C.honeySoft} delay={1} />
      <Sparkle x={86} y={286} size={6} color={C.cream} delay={1.6} />
    </g>
  );
}

/* ───────────────────────── Ruang Kelas Hangat ───────────────────────── */

function AbxDesk({ x, y, w, flip = 1 }: { x: number; y: number; w: number; flip?: 1 | -1 }) {
  return (
    <g>
      <path d={`M${x + 8 * flip} ${y + 8} V${y + 66} M${x + (w - 8) * flip} ${y + 8} V${y + 66}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d={`M${x + 8 * flip} ${y + 8} V${y + 66} M${x + (w - 8) * flip} ${y + 8} V${y + 66}`} stroke={C.steelDark} strokeWidth={2} strokeLinecap="round" />
      <rect x={flip === 1 ? x : x - w} y={y} width={w} height={14} rx={4} fill={C.woodLight} {...O3} />
      <rect x={flip === 1 ? x : x - w} y={y + 14} width={w} height={6} fill={C.woodDark} stroke={INK} strokeWidth={2.4} />
    </g>
  );
}

function AbxClassroom({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-cwall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8E4" />
          <stop offset="100%" stopColor="#FFEDC8" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-cwall)`} />

      {/* wainscot kayu */}
      <rect x={0} y={262} width={400} height={80} fill="#EBC08A" />
      <g stroke="#D9A467" strokeWidth={2.4} strokeLinecap="round">
        {Array.from({ length: 10 }).map((_, i) => (
          <path key={i} d={`M${i * 42 + 10} 270 V338`} />
        ))}
      </g>
      <rect x={-4} y={256} width={408} height={9} fill={C.woodLight} stroke={INK} strokeWidth={2.6} />

      {/* lantai */}
      <rect x={0} y={342} width={400} height={68} fill="#D9A467" />
      <g stroke="#C08850" strokeWidth={2.4} strokeLinecap="round" opacity={0.8}>
        <path d="M0 366 H400 M0 388 H400" />
        <path d="M70 342 V366 M200 342 V366 M320 342 V366 M30 366 V388 M150 366 V388 M270 366 V388 M370 366 V388 M100 388 V410 M230 388 V410 M340 388 V410" />
      </g>
      <rect x={-4} y={338} width={408} height={8} fill={C.woodLight} stroke={INK} strokeWidth={2.6} />

      {/* papan tulis */}
      <rect x={96} y={26} width={208} height={80} rx={6} fill={C.woodLight} {...O} />
      <rect x={104} y={34} width={192} height={64} rx={3} fill="#5F8F78" stroke={INK} strokeWidth={2.4} />
      <g fill="none" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
        <polygon points={starPoints(130, 56, 9, 4)} />
        <path d="M152 52 H182 M152 62 H174 M152 72 H186" />
        <circle cx={226} cy={60} r={12} />
        <path d="M221 57 v1 M231 57 v1 M220 65 Q226 71 232 65" />
        <path d="M252 72 L262 48 L272 72 M255 64 H269" />
        <path d="M120 84 Q140 76 160 84 T200 84" opacity={0.7} />
      </g>
      <rect x={168} y={102} width={64} height={7} rx={3} fill={C.woodDark} stroke={INK} strokeWidth={2.2} />
      <rect x={176} y={96} width={14} height={6} rx={2} fill={C.cream} stroke={INK} strokeWidth={1.8} />
      <rect x={196} y={97} width={10} height={5} rx={2} fill={C.peachSoft} stroke={INK} strokeWidth={1.8} />

      {/* jendela + sinar sore */}
      <motion.polygon
        points="20,140 86,140 250,340 130,340"
        fill={C.honeySoft}
        animate={{ opacity: [0.14, 0.24, 0.14] }}
        transition={loop(4.6)}
      />
      <rect x={14} y={126} width={78} height={104} rx={7} fill="#CFEBFF" {...O} />
      <path d="M53 126 V230 M14 178 H92" fill="none" {...O25} />
      <path d="M22 140 Q24 160 22 178" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <rect x={8} y={226} width={90} height={9} rx={4} fill={C.woodLight} {...O3} />

      {/* jam dinding */}
      <circle cx={352} cy={70} r={25} fill={C.cream} {...O} />
      <circle cx={352} cy={70} r={19} fill="none" stroke={C.honey} strokeWidth={2} strokeDasharray="1 7.4" strokeLinecap="round" />
      <path d="M352 70 V55 M352 70 L363 76" fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={352} cy={70} r={3} fill={C.peach} stroke={INK} strokeWidth={1.8} />

      {/* meja & buku (tepi saja) */}
      <AbxDesk x={-8} y={282} w={92} />
      <g>
        <rect x={6} y={266} width={34} height={16} rx={3} fill={C.sky} {...O3} />
        <rect x={10} y={252} width={30} height={14} rx={3} fill={C.peach} {...O3} />
        <rect x={52} y={256} width={14} height={26} rx={3} fill={C.cream} {...O3} />
        <path d="M54 256 L58 244 M62 256 L64 242" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M58 244 l-1 -4 M64 242 l1 -4" stroke={C.peach} strokeWidth={2.4} strokeLinecap="round" />
      </g>
      <AbxDesk x={408} y={282} w={92} flip={-1} />
      <g>
        <circle cx={364} cy={254} r={20} fill={C.skySoft} {...O3} />
        <path d="M352 246 Q360 240 366 248 Q372 254 364 260 M372 266 Q376 258 382 262" fill="none" stroke={C.matcha} strokeWidth={4} strokeLinecap="round" />
        <path d="M364 274 V282 M354 282 H374" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <rect x={322} y={268} width={26} height={14} rx={3} fill={C.honey} {...O3} />
      </g>
      <AbMote x={64} y={190} d={0.2} />
      <AbMote x={120} y={250} d={1.1} r={2} />
      <AbMote x={170} y={290} d={1.9} />
    </g>
  );
}

/* ───────────────────────── Taman Sakura Mekar ───────────────────────── */

function AbxBlossomTree({ x, base, flip = 1 }: { x: number; base: number; flip?: 1 | -1 }) {
  const f = (v: number) => x + v * flip;
  return (
    <g>
      <path d={`M${f(-14)} ${base} Q${f(-10)} ${base - 90} ${f(0)} ${base - 150} Q${f(12)} ${base - 210} ${f(-4)} ${base - 250} L${f(20)} ${base - 250} Q${f(30)} ${base - 200} ${f(22)} ${base - 140} Q${f(20)} ${base - 80} ${f(18)} ${base}Z`} fill="#A56E4A" {...O} />
      <path d={`M${f(2)} ${base - 130} Q${f(24)} ${base - 160} ${f(46)} ${base - 168}`} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <path d={`M${f(2)} ${base - 130} Q${f(24)} ${base - 160} ${f(46)} ${base - 168}`} fill="none" stroke="#A56E4A" strokeWidth={5} strokeLinecap="round" />
      {[
        [10, -250, 56, "#FFC1D3"],
        [-34, -236, 40, "#FFB0C8"],
        [50, -226, 42, "#FFD7E3"],
        [14, -200, 46, "#FFB0C8"],
        [58, -176, 34, "#FFC1D3"],
        [-26, -192, 32, "#FFD7E3"],
      ].map(([dx, dy, r, col], i) => (
        <circle key={i} cx={f(dx as number)} cy={base + (dy as number)} r={r as number} fill={col as string} stroke="#E0708F" strokeWidth={2.2} />
      ))}
      <g fill={C.cream} opacity={0.8}>
        <circle cx={f(-10)} cy={base - 262} r={4} />
        <circle cx={f(34)} cy={base - 232} r={3} />
        <circle cx={f(4)} cy={base - 212} r={3.4} />
      </g>
    </g>
  );
}

function AbxLantern({ x, base }: { x: number; base: number }) {
  return (
    <g>
      <rect x={x - 14} y={base - 8} width={28} height={10} rx={3} fill="#C9CBD6" {...O3} />
      <rect x={x - 6} y={base - 52} width={12} height={46} fill="#D6D8E2" {...O3} />
      <rect x={x - 18} y={base - 80} width={36} height={30} rx={4} fill="#D6D8E2" {...O3} />
      <motion.rect x={x - 11} y={base - 74} width={22} height={18} rx={3} fill={C.honeySoft} stroke={INK} strokeWidth={2} animate={{ opacity: [0.7, 1, 0.7] }} transition={loop(2.4)} />
      <path d={`M${x - 26} ${base - 78} Q${x} ${base - 106} ${x + 26} ${base - 78}Z`} fill="#BFC2D0" {...O3} />
    </g>
  );
}

function AbxSakura({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-ssky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE6F0" />
          <stop offset="70%" stopColor="#FFF6EC" />
          <stop offset="100%" stopColor="#F7F0DC" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-ssky)`} />

      {/* gunung kabut */}
      <path d="M-10 330 Q60 230 130 300 Q170 260 220 310 Q290 220 360 300 Q390 280 410 310 V350 H-10Z" fill="#EBD8F0" opacity={0.7} />
      <path d="M-10 340 Q80 290 170 330 Q240 290 320 330 Q370 310 410 336 V352 H-10Z" fill="#F6E1EA" opacity={0.9} />

      {/* jembatan merah kecil */}
      <g>
        <path d="M-6 336 Q50 292 110 336" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" />
        <path d="M-6 336 Q50 292 110 336" fill="none" stroke="#FF6F5E" strokeWidth={10} strokeLinecap="round" />
        <path d="M0 316 Q50 276 104 316 M14 308 V330 M50 292 V316 M86 308 V330" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <path d="M0 316 Q50 276 104 316" fill="none" stroke="#FF9A8C" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      </g>

      <AbxBlossomTree x={34} base={352} />
      <AbxBlossomTree x={366} base={352} flip={-1} />

      {/* tanah */}
      <path d="M0 348 Q70 336 150 348 Q230 358 310 346 Q360 338 400 348 V410 H0Z" fill="#C4EAA0" {...abThin} />
      <rect x={0} y={362} width={400} height={48} fill="#B3E18B" />
      {/* kolam */}
      <ellipse cx={90} cy={388} rx={64} ry={14} fill="#BDE7FF" stroke={INK} strokeWidth={2.6} />
      <motion.path d="M54 388 Q70 384 86 388 M96 392 Q112 388 126 392" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" animate={{ opacity: [0.4, 1, 0.4] }} transition={loop(3)} />
      <g transform="translate(120 382)" style={SVG_ATTR_ORIGIN}>
        <ellipse rx={9} ry={4} fill={C.matcha} stroke={INK} strokeWidth={2} />
        <circle cx={0} cy={-3} r={3} fill={ABX.pinkA} stroke={INK} strokeWidth={1.6} />
      </g>
      <AbxLantern x={338} base={364} />

      {/* kelopak jatuh */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.path
          key={i}
          d="M0 -6 C5 -6 7 -1 4 3 L0 1.6 L-4 3 C-7 -1 -5 -6 0 -6Z"
          fill={i % 2 ? ABX.pinkA : ABX.pinkB}
          stroke="#E0708F"
          strokeWidth={1.2}
          style={fb()}
          initial={{ x: 40 + abHash(i + 20) * 320, y: 20 }}
          animate={{ x: [40 + abHash(i + 20) * 320, 60 + abHash(i + 20) * 320, 30 + abHash(i + 20) * 320], y: [20, 220, 380], rotate: [0, 200, 400], opacity: [0, 1, 0] }}
          transition={{ duration: 7 + abHash(i + 30) * 3, repeat: Infinity, ease: "linear", delay: abHash(i + 40) * 6 }}
        />
      ))}
      <Sparkle x={200} y={90} size={6} color={C.cream} delay={0.5} />
      <Sparkle x={280} y={140} size={5} color={C.peachSoft} delay={1.3} />
    </g>
  );
}

/* ───────────────────────── Pantai Senja Oranye ───────────────────────── */

function AbxFrond({ a, len = 62, d = 0 }: { a: number; len?: number; d?: number }) {
  return (
    <g transform={`rotate(${a})`} style={SVG_ATTR_ORIGIN}>
      <path
        d={`M0 0 Q${len * 0.5} ${-len * 0.42} ${len} ${-len * 0.02} Q${len * 0.55} ${-len * 0.16} 0 0Z`}
        fill={d % 2 ? "#4DB35C" : "#3FA34D"}
        stroke={INK}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d={`M4 -2 Q${len * 0.5} ${-len * 0.26} ${len * 0.9} ${-len * 0.04}`} fill="none" stroke="#8EE04A" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

function AbxStarfish({ x, y, s = 1, col = C.peach }: { x: number; y: number; s?: number; col?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <polygon points={starPoints(0, 0, 13, 6)} fill={col} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <circle cx={0} cy={0} r={1.6} fill={C.cream} />
      <circle cx={0} cy={-6} r={1.2} fill={C.cream} />
      <circle cx={5} cy={2} r={1.2} fill={C.cream} />
      <circle cx={-5} cy={2} r={1.2} fill={C.cream} />
    </g>
  );
}

function AbxShell({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={SVG_ATTR_ORIGIN}>
      <path d="M-11 0 Q-12 -14 0 -15 Q12 -14 11 0 Q0 5 -11 0Z" fill={C.peachSoft} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M0 -14 V2 M-6 -12 L-5 1 M6 -12 L5 1" fill="none" stroke={C.peach} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function AbxBeach({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-bsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8FA8" />
          <stop offset="45%" stopColor="#FFB280" />
          <stop offset="100%" stopColor="#FFE29E" />
        </linearGradient>
        <linearGradient id={`${uid}-bsea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB38E" />
          <stop offset="45%" stopColor="#FF9AA6" />
          <stop offset="100%" stopColor="#7CC2F0" />
        </linearGradient>
        <radialGradient id={`${uid}-bsun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF0A8" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#FFD060" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${uid}-bclip`}>
          <rect x={0} y={0} width={400} height={256} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-bsky)`} />

      {/* matahari */}
      <motion.circle cx={296} cy={252} r={110} fill={`url(#${uid}-bsun)`} style={fb()} animate={{ scale: [0.96, 1.06, 0.96] }} transition={loop(4)} />
      <g clipPath={`url(#${uid}-bclip)`}>
        <circle cx={296} cy={252} r={44} fill={C.honey} stroke="#FF9A3C" strokeWidth={3} />
        <circle cx={296} cy={252} r={32} fill={C.honeySoft} opacity={0.7} />
      </g>

      <AbCloud x={84} y={90} s={0.7} drift={14} dur={14} fill="#FFD0C4" outline={false} />
      <AbCloud x={236} y={62} s={0.5} drift={12} dur={11} fill="#FFE0CC" outline={false} />
      <AbCloud x={340} y={118} s={0.46} drift={10} dur={10} fill="#FFD0C4" outline={false} />

      {/* camar */}
      <motion.g animate={{ x: [0, 40, 0], y: [0, -6, 0] }} transition={loop(10)}>
        <path d="M150 130 Q158 122 166 130 Q174 122 182 130" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M214 154 Q220 148 226 154 Q232 148 238 154" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* laut */}
      <rect x={0} y={252} width={400} height={92} fill={`url(#${uid}-bsea)`} />
      <path d="M0 252 H400" stroke="#FF8A70" strokeWidth={2.4} />
      <g fill="none" strokeLinecap="round">
        <motion.g animate={{ x: [-10, 10, -10] }} transition={loop(5)} stroke={C.honeySoft} strokeWidth={3.4}>
          <path d="M250 262 H340 M270 274 H330 M262 286 H312" />
        </motion.g>
        <motion.g animate={{ x: [8, -8, 8] }} transition={loop(6)} stroke={C.cream} strokeWidth={3} opacity={0.8}>
          <path d="M40 270 H110 M70 284 H140 M20 296 H80" />
        </motion.g>
      </g>

      {/* pasir */}
      <path d="M-4 342 Q60 322 140 338 Q220 354 300 336 Q360 324 404 340 V410 H-4Z" fill="#FFE2B0" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M-4 348 Q60 332 140 344 Q220 358 300 342 Q360 332 404 346" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
      <rect x={0} y={368} width={400} height={42} fill="#F5D199" />
      <path d="M0 368 Q100 376 200 368 Q300 378 400 368" fill="none" stroke="#E9BB78" strokeWidth={3} strokeLinecap="round" />

      {/* palem */}
      <path d="M338 352 Q330 280 352 214 L366 218 Q350 284 358 352Z" fill="#A56E4A" {...O} />
      <path d="M342 330 H356 M342 306 H358 M344 282 H360 M348 258 H362" stroke="#8A5A3C" strokeWidth={3} strokeLinecap="round" />
      <motion.g style={fb(0.5, 0.5)} animate={{ rotate: [-2, 2, -2] }} transition={loop(4)}>
        <circle cx={358} cy={214} r={70} fill="none" stroke="none" pointerEvents="none" />
        <g transform="translate(358 214)" style={SVG_ATTR_ORIGIN}>
          <AbxFrond a={-170} len={64} d={0} />
          <AbxFrond a={-130} len={70} d={1} />
          <AbxFrond a={-90} len={50} d={0} />
          <AbxFrond a={-45} len={70} d={1} />
          <AbxFrond a={-8} len={64} d={0} />
          <circle cx={-4} cy={6} r={7} fill="#8A5A3C" {...abThin} />
          <circle cx={8} cy={8} r={6} fill="#8A5A3C" {...abThin} />
        </g>
      </motion.g>

      <AbxStarfish x={58} y={376} s={1} />
      <AbxStarfish x={118} y={392} s={0.6} col={C.honey} />
      <AbxShell x={300} y={388} s={1} />
      <AbxShell x={22} y={396} s={0.7} />
      <Sparkle x={246} y={226} size={6} color={C.cream} delay={0.2} />
      <Sparkle x={120} y={214} size={5} color={C.honeySoft} delay={1} />
    </g>
  );
}

/* ───────────────────────── Desa Salju Cozy ───────────────────────── */

function AbxCottage({ x, base, w, h, roof, d, dim = 1 }: { x: number; base: number; w: number; h: number; roof: string; d: number; dim?: number }) {
  const top = base - h;
  return (
    <g opacity={dim}>
      <rect x={x + w * 0.6} y={top - 30} width={w * 0.14} height={30} fill="#C99560" {...O3} />
      <motion.circle cx={x + w * 0.67} cy={top - 42} r={6} fill={C.cream} stroke={INK} strokeWidth={2} animate={{ y: [0, -14], opacity: [0.9, 0], scale: [0.8, 1.5] }} style={fb()} transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: d }} />
      <rect x={x} y={top} width={w} height={h} fill="#FFF0D8" {...O} />
      <path d={`M${x - 8} ${top + 4} L${x + w / 2} ${top - 34} L${x + w + 8} ${top + 4}Z`} fill={roof} {...O} />
      <path d={`M${x - 4} ${top - 2} Q${x + w * 0.25} ${top - 18} ${x + w / 2} ${top - 32} Q${x + w * 0.75} ${top - 18} ${x + w + 4} ${top - 2} Q${x + w * 0.8} ${top - 8} ${x + w * 0.6} ${top - 6} Q${x + w * 0.4} ${top - 12} ${x + w * 0.2} ${top - 6} Q${x + w * 0.1} ${top - 8} ${x - 4} ${top - 2}Z`} fill="#F6FBFF" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <motion.rect x={x + w * 0.12} y={top + h * 0.28} width={w * 0.28} height={h * 0.3} rx={3} fill={C.honeySoft} stroke={INK} strokeWidth={2.4} animate={{ opacity: [0.8, 1, 0.8] }} transition={loop(2.6, { delay: d })} />
      <path d={`M${x + w * 0.26} ${top + h * 0.28} V${top + h * 0.58} M${x + w * 0.12} ${top + h * 0.43} H${x + w * 0.4}`} stroke={INK} strokeWidth={1.8} />
      <rect x={x + w * 0.58} y={top + h * 0.4} width={w * 0.24} height={h * 0.6} rx={4} fill="#C99560" {...O3} />
    </g>
  );
}

function AbxPine({ x, base, h, w }: { x: number; base: number; h: number; w: number }) {
  return (
    <g>
      <rect x={x - 4} y={base - 10} width={8} height={12} fill="#8A5A3C" stroke={INK} strokeWidth={2.2} />
      {[0, 1, 2].map((i) => {
        const y = base - 8 - i * (h * 0.27);
        const ww = w * (1 - i * 0.26);
        return (
          <g key={i}>
            <path d={`M${x - ww / 2} ${y} L${x} ${y - h * 0.4} L${x + ww / 2} ${y}Z`} fill="#3E8E6B" {...abThin} />
            <path d={`M${x - ww * 0.3} ${y - h * 0.14} Q${x - ww * 0.1} ${y - h * 0.2} ${x} ${y - h * 0.4} Q${x + ww * 0.1} ${y - h * 0.2} ${x + ww * 0.3} ${y - h * 0.14} Q${x + ww * 0.15} ${y - h * 0.1} ${x} ${y - h * 0.14} Q${x - ww * 0.15} ${y - h * 0.1} ${x - ww * 0.3} ${y - h * 0.14}Z`} fill="#F6FBFF" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

function AbxLights({ y0, y1, sag, n, seed = 0 }: { y0: number; y1: number; sag: number; n: number; seed?: number }) {
  const cols = [C.peach, C.honey, C.matchaSoft, C.sky, C.taroSoft] as const;
  const pt = (t: number): Pt => [Number(f2(t * 400)), Number(f2(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag))];
  return (
    <g>
      <path d={Array.from({ length: 21 }, (_, i) => `${i === 0 ? "M" : "L"}${pt(i / 20)[0]} ${pt(i / 20)[1]}`).join(" ")} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      {Array.from({ length: n }).map((_, i) => {
        const [bx, by] = pt((i + 0.5) / n);
        return (
          <motion.g key={i} animate={{ opacity: [0.55, 1, 0.55] }} transition={loop(1.8 + (i % 3) * 0.5, { delay: abHash(i + seed) * 2 })}>
            <circle cx={bx} cy={by + 7} r={8} fill={cols[i % 5]} opacity={0.25} />
            <ellipse cx={bx} cy={by + 6} rx={3.6} ry={5} fill={cols[i % 5]} stroke={INK} strokeWidth={1.8} />
          </motion.g>
        );
      })}
    </g>
  );
}

function AbxSnowVillage({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-vsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A4690" />
          <stop offset="55%" stopColor="#7A7ED0" />
          <stop offset="100%" stopColor="#F3C9DA" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-vsky)`} />
      {[
        [40, 40, 2], [92, 90, 1.6], [150, 36, 2.2], [236, 70, 1.6], [300, 34, 2], [360, 96, 1.8], [330, 150, 1.4], [60, 150, 1.4], [200, 120, 1.4],
      ].map(([sx, sy, sr], i) => (
        <motion.circle key={i} cx={sx} cy={sy} r={sr} fill={C.cream} animate={{ opacity: [0.4, 1, 0.4] }} transition={loop(2 + (i % 3), { delay: i * 0.3 })} />
      ))}
      <Sparkle x={246} y={44} size={6} color={C.cream} delay={0.4} />
      <Sparkle x={110} y={60} size={5} color={C.honeySoft} delay={1.2} />

      {/* bukit salju */}
      <path d="M-10 330 Q60 280 140 316 Q200 290 260 318 Q330 276 410 322 V360 H-10Z" fill="#D2DEF6" />
      <path d="M-10 346 Q80 312 170 340 Q250 318 330 340 Q380 328 410 342 V372 H-10Z" fill="#E4EEFB" />

      <AbxCottage x={130} base={336} w={44} h={34} roof={C.peachSoft} d={0.5} dim={0.55} />
      <AbxCottage x={14} base={348} w={74} h={58} roof={C.peach} d={0} />
      <AbxCottage x={312} base={348} w={70} h={54} roof="#7FB6F0" d={1} />
      <AbxPine x={110} base={350} h={86} w={42} />
      <AbxPine x={296} base={350} h={74} w={38} />
      <AbxPine x={268} base={346} h={50} w={28} />

      {/* tanah salju */}
      <path d="M-4 348 Q70 334 150 346 Q230 358 310 344 Q360 336 404 346 V410 H-4Z" fill="#F6FBFF" {...abThin} />
      <rect x={0} y={364} width={400} height={46} fill="#E6EFFB" />
      <path d="M0 364 Q100 372 200 364 Q300 374 400 364" fill="none" stroke="#C9D8F0" strokeWidth={3} strokeLinecap="round" />
      <g fill="#CFDDF3">
        <ellipse cx={80} cy={386} rx={34} ry={5} />
        <ellipse cx={310} cy={392} rx={40} ry={5} />
      </g>

      <AbxLights y0={64} y1={72} sag={26} n={11} seed={3} />

      {/* salju turun */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.circle
          key={i}
          cx={abHash(i + 100) * 400}
          cy={0}
          r={1.8 + abHash(i + 110) * 2}
          fill={C.cream}
          animate={{ y: [0, 410], x: [0, 14, -8, 10] }}
          transition={{ duration: 7 + abHash(i + 120) * 4, repeat: Infinity, ease: "linear", delay: abHash(i + 130) * 7 }}
        />
      ))}
    </g>
  );
}

/* ───────────────────────── Langit Malam Bertabur Bintang ───────────────────────── */

function AbxNightSky({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-nsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1C1F5E" />
          <stop offset="60%" stopColor="#4A3C94" />
          <stop offset="100%" stopColor="#8A63B8" />
        </linearGradient>
        <radialGradient id={`${uid}-nmoon`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF0A8" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#FFF0A8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-nsky)`} />

      <circle cx={318} cy={86} r={84} fill={`url(#${uid}-nmoon)`} />
      <path d="M318 48 A38 38 0 1 0 356 92 A30 30 0 1 1 318 48Z" fill={C.honeySoft} stroke={C.honey} strokeWidth={3} strokeLinejoin="round" />

      {Array.from({ length: 26 }).map((_, i) => {
        const x = 8 + abHash(i + 200) * 384;
        const y = 10 + abHash(i + 220) * 250;
        const r = 1.2 + abHash(i + 240) * 2.2;
        return (
          <motion.circle key={i} cx={x} cy={y} r={r} fill={i % 4 === 0 ? C.honeySoft : C.cream} animate={{ opacity: [0.35, 1, 0.35] }} transition={loop(2 + abHash(i + 260) * 3, { delay: abHash(i + 280) * 3 })} />
        );
      })}
      <Sparkle x={70} y={64} size={8} color={C.cream} delay={0} />
      <Sparkle x={150} y={120} size={6} color={C.honeySoft} delay={0.8} />
      <Sparkle x={236} y={40} size={7} color={C.cream} delay={1.5} />
      <Sparkle x={44} y={188} size={6} color={C.skySoft} delay={2} />
      <Sparkle x={356} y={206} size={6} color={C.cream} delay={0.5} />

      {/* awan tipis */}
      <g opacity={0.35}>
        <AbCloud x={110} y={226} s={0.7} drift={20} dur={18} fill={C.taroSoft} outline={false} />
        <AbCloud x={300} y={190} s={0.55} drift={16} dur={15} fill={C.skySoft} outline={false} />
      </g>

      {/* bintang jatuh */}
      <motion.g animate={{ x: [0, -150], y: [0, 74], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 4.5, ease: "easeIn" }}>
        <path d="M250 56 L296 38" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        <path d="M250 56 L274 47" stroke={C.cream} strokeWidth={4.4} strokeLinecap="round" />
        <polygon points={starPoints(248, 57, 7, 3)} fill={C.honey} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      </motion.g>

      {/* bukit */}
      <path d="M-10 330 Q60 270 140 312 Q220 280 300 316 Q360 292 410 322 V380 H-10Z" fill="#3B3585" />
      <path d="M-6 346 Q90 322 190 348 Q290 326 406 346 V410 H-6Z" fill="#5A4EA3" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <rect x={0} y={366} width={400} height={44} fill="#645AB0" />
      <path d="M0 366 Q100 374 200 366 Q300 376 400 366" fill="none" stroke="#7E72C4" strokeWidth={3} strokeLinecap="round" />
      <g fill="none" stroke="#7E72C4" strokeWidth={3} strokeLinecap="round">
        <path d="M60 378 l-4 -9 M60 378 l4 -9 M66 380 l1 -8" />
        <path d="M330 384 l-4 -9 M330 384 l4 -9 M336 386 l1 -8" />
      </g>
      <AbMote x={90} y={330} d={0.5} color={C.honeySoft} />
      <AbMote x={300} y={340} d={1.5} color={C.honeySoft} r={2} />
    </g>
  );
}

/* ───────────────────────── Atap Kota Malam Hari ───────────────────────── */

function AbxWindows({ x, y, w, h, cols, rows, seed }: { x: number; y: number; w: number; h: number; cols: number; rows: number; seed: number }) {
  const cw = w / cols;
  const ch = h / rows;
  return (
    <g>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const lit = abHash(seed + i) > 0.42;
        const flick = lit && abHash(seed + i + 500) > 0.86;
        const props = { x: x + c * cw + cw * 0.22, y: y + r * ch + ch * 0.2, width: cw * 0.56, height: ch * 0.56, rx: 1.6 };
        return flick ? (
          <motion.rect key={i} {...props} fill={C.honeySoft} animate={{ opacity: [1, 0.25, 1] }} transition={loop(3 + abHash(i) * 3, { delay: abHash(i + 9) * 3 })} />
        ) : (
          <rect key={i} {...props} fill={lit ? C.honeySoft : "#4A4390"} opacity={lit ? 0.95 : 0.8} />
        );
      })}
    </g>
  );
}

function AbxCityNight({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-ysky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B1F4B" />
          <stop offset="55%" stopColor="#5A4A9C" />
          <stop offset="100%" stopColor="#FF9DB5" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill={`url(#${uid}-ysky)`} />
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.circle key={i} cx={10 + abHash(i + 300) * 380} cy={10 + abHash(i + 320) * 130} r={1.2 + abHash(i + 340)} fill={C.cream} animate={{ opacity: [0.3, 1, 0.3] }} transition={loop(2 + abHash(i + 360) * 3, { delay: abHash(i + 380) * 3 })} />
      ))}
      {/* bulan */}
      <circle cx={72} cy={92} r={58} fill={C.honeySoft} opacity={0.18} />
      <circle cx={72} cy={92} r={30} fill={C.honeySoft} stroke={C.honey} strokeWidth={3} />
      <circle cx={62} cy={84} r={5} fill={C.honey} opacity={0.4} />
      <circle cx={84} cy={100} r={7} fill={C.honey} opacity={0.35} />
      <circle cx={80} cy={78} r={3} fill={C.honey} opacity={0.4} />

      {/* siluet kota jauh */}
      <g fill="#3A3478">
        <rect x={0} y={232} width={34} height={112} />
        <rect x={40} y={196} width={30} height={148} />
        <rect x={76} y={250} width={26} height={94} />
        <rect x={298} y={214} width={36} height={130} />
        <rect x={340} y={176} width={32} height={168} />
        <rect x={376} y={244} width={30} height={100} />
        <rect x={104} y={284} width={30} height={60} />
        <rect x={262} y={290} width={32} height={54} />
      </g>
      <AbxWindows x={0} y={238} w={34} h={100} cols={3} rows={8} seed={10} />
      <AbxWindows x={40} y={202} w={30} h={136} cols={3} rows={10} seed={50} />
      <AbxWindows x={298} y={220} w={36} h={118} cols={3} rows={9} seed={90} />
      <AbxWindows x={340} y={182} w={32} h={156} cols={3} rows={11} seed={130} />
      <AbxWindows x={376} y={250} w={26} h={90} cols={2} rows={7} seed={170} />
      <path d="M55 196 V170" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <motion.circle cx={55} cy={168} r={3.6} fill={C.peach} animate={{ opacity: [1, 0.2, 1] }} transition={loop(1.6)} />

      {/* lampu tali */}
      <AbxLights y0={36} y1={44} sag={30} n={12} seed={9} />

      {/* parapet */}
      <rect x={-4} y={330} width={408} height={20} fill="#8E7BB8" stroke={INK} strokeWidth={2.6} />
      <g stroke="#7A67A8" strokeWidth={2.4} strokeLinecap="round">
        <path d="M0 340 H400 M30 330 V340 M90 340 V350 M150 330 V340 M210 340 V350 M270 330 V340 M330 340 V350 M390 330 V340" />
      </g>
      <rect x={-4} y={324} width={408} height={9} rx={3} fill="#A592CC" stroke={INK} strokeWidth={2.6} />

      {/* tangki air */}
      <g>
        <path d="M322 350 V324 M346 350 V324 M370 350 V324" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <rect x={314} y={262} width={64} height={60} rx={8} fill="#B77C3F" {...O} />
        <path d="M326 264 V320 M346 264 V320 M366 264 V320" stroke="#8A5A3C" strokeWidth={3} strokeLinecap="round" />
        <path d="M308 266 L346 234 L384 266Z" fill="#6F6AA6" {...O} />
        <path d="M322 262 L346 242" stroke="#9A95CC" strokeWidth={3} strokeLinecap="round" />
      </g>

      {/* lantai atap */}
      <rect x={0} y={348} width={400} height={62} fill="#6E6A9E" />
      <g stroke="#5E5A8E" strokeWidth={2.4} strokeLinecap="round">
        <path d="M0 366 H400 M0 388 H400" />
        <path d="M60 348 V366 M180 348 V366 M300 348 V366 M120 366 V388 M240 366 V388 M360 366 V388 M30 388 V410 M150 388 V410 M270 388 V410 M390 388 V410" />
      </g>
      <path d="M-4 348 H404" stroke={INK} strokeWidth={2.6} />
      <AbMote x={150} y={290} d={0.6} color={C.honeySoft} />
      <AbMote x={256} y={250} d={1.4} color={C.cream} r={2} />
    </g>
  );
}

const BG_REG: Record<string, BackgroundArt> = {
  bg_forest_glade: AbxForest,
  bg_candy_land: AbxCandy,
  bg_school_classroom: AbxClassroom,
  bg_sakura_garden: AbxSakura,
  bg_beach_sunset: AbxBeach,
  bg_snowy_village: AbxSnowVillage,
  bg_night_sky: AbxNightSky,
  bg_city_night: AbxCityNight,
};

/* ═════════════════════════════════════════════════════════════
 *  REGISTRI SPESIES
 * ═════════════════════════════════════════════════════════════ */

const SPECIES_ART: Readonly<Record<PetSpecies, SpeciesArt>> = {
  chubby_cat: CAT_ART,
  hamster_cheek: HAMSTER_ART,
  lop_bunny: BUNNY_ART,
  capybara_chill: CAPY_ART,
  red_panda: PANDA_ART,
  milk_bear: BEAR_ART,
  fennec_fox: FENNEC_ART,
  cloud_unicorn: UNICORN_ART,
};

const DISPLAY_FONT = 'var(--font-fredoka, "Fredoka"), "Nunito", ui-rounded, system-ui, sans-serif';

/* ═════════════════════════════════════════════════════════════
 *  MOOD
 * ═════════════════════════════════════════════════════════════ */

const MOOD_MOTION: Record<PetMood, MotionSpec> = {
  happy: { animate: { y: [0, -3, 0] }, transition: loop(2.8) },
  proud: { animate: { y: [0, -7, 0] }, transition: loop(0.55) },
  worried: { animate: { y: [0, 2, 0], x: [0, -1, 0] }, transition: loop(1.6) },
  shocked_boros: { animate: { x: [-2, 2, -2], y: [0, -1, 0] }, transition: loop(0.2) },
  shivering_cold: { animate: { x: [-1.8, 1.8, -1.8], y: [0, 0.8, 0] }, transition: loop(0.09) },
};

function PetMotion({ mood, children }: { mood: PetMood; children: ReactNode }) {
  const spec = MOOD_MOTION[mood];
  return (
    <motion.g animate={spec.animate} transition={spec.transition}>
      {children}
    </motion.g>
  );
}

function FlyingCoin({ dx, dy, delay }: { dx: number; dy: number; delay: number }) {
  return (
    <motion.g
      animate={{ x: [0, dx], y: [0, dy], opacity: [1, 1, 0] }}
      transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut", delay }}
    >
      <g transform="translate(236 292)" style={SVG_ATTR_ORIGIN}>
        <Coin r={10} />
      </g>
    </motion.g>
  );
}

function Exclaim({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.g
      style={fb(0.5, 1)}
      animate={{ scale: [1, 1.18, 1], rotate: [-6, 6, -6] }}
      transition={loop(0.5, { delay })}
    >
      <rect x={x - 5} y={y - 26} width={10} height={26} rx={5} fill={C.peach} {...O3} />
      <circle cx={x} cy={y + 10} r={5.6} fill={C.peach} {...O3} />
    </motion.g>
  );
}

/** Kristal salju 6 sisi (koordinat dibulatkan agar SSR dan CSR identik). */
function snowflakePath(r: number): string {
  let d = "";
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI / 3) * i;
    d += `M${f2(-r * Math.cos(a))} ${f2(-r * Math.sin(a))} L${f2(r * Math.cos(a))} ${f2(r * Math.sin(a))} `;
  }
  return d.trim();
}

/** Posisi butiran salju tetap (deterministik, tanpa Math.random). */
const SNOW_FLAKES: readonly { x: number; y: number; r: number; dur: number; delay: number; drift: number }[] = [
  { x: 64, y: 72, r: 7, dur: 3.2, delay: 0, drift: 10 },
  { x: 100, y: 56, r: 5, dur: 2.8, delay: 0.7, drift: -8 },
  { x: 120, y: 90, r: 4, dur: 3.5, delay: 1.4, drift: 6 },
  { x: 282, y: 90, r: 4, dur: 3, delay: 0.3, drift: -6 },
  { x: 304, y: 58, r: 5, dur: 3.3, delay: 1.1, drift: 8 },
  { x: 338, y: 74, r: 7, dur: 2.9, delay: 1.8, drift: -10 },
  { x: 82, y: 120, r: 4, dur: 2.6, delay: 2.1, drift: 6 },
  { x: 322, y: 118, r: 4, dur: 2.7, delay: 0.5, drift: -6 },
];

function MoodOverlay({ mood }: { mood: PetMood }) {
  switch (mood) {
    case "proud":
      return (
        <g pointerEvents="none">
          <Sparkle x={92} y={118} size={10} color={C.honey} delay={0} />
          <Sparkle x={314} y={104} size={11} color={C.honeySoft} delay={0.4} />
          <Sparkle x={84} y={230} size={8} color={C.cream} delay={0.8} />
          <Sparkle x={322} y={222} size={8} color={C.honey} delay={1.2} />
          {[0, 1, 2].map((i) => (
            <motion.g
              key={i}
              animate={{ y: [0, -34], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: i * 0.6 }}
            >
              <polygon
                points={starPoints(104 + i * 96, 150 - (i % 2) * 14, 8, 3.6)}
                fill={i === 1 ? C.peach : C.honey}
                {...O2}
              />
            </motion.g>
          ))}
        </g>
      );
    case "worried":
      return (
        <g pointerEvents="none">
          <motion.g animate={{ x: [-4, 4, -4] }} transition={loop(3.2)}>
            <path
              d="M262 112 Q246 112 246 98 Q246 84 262 84 Q264 68 282 68 Q294 56 308 66 Q326 62 330 80 Q346 82 346 98 Q346 112 330 112Z"
              fill="#D9CCEB"
              {...O3}
            />
            <path d="M256 106 Q262 100 272 100" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d={`M${272 + i * 22} 120 l-3 10`}
                fill="none"
                stroke={C.sky}
                strokeWidth={4}
                strokeLinecap="round"
                animate={{ y: [0, 36], opacity: [0, 1, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeIn", delay: i * 0.35 }}
              />
            ))}
          </motion.g>
          <motion.path
            d="M284 178 Q278 190 284 196 Q292 196 292 188 Q292 184 284 178Z"
            fill={C.skySoft}
            {...O25}
            animate={{ y: [0, 10], opacity: [1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn" }}
          />
        </g>
      );
    case "shivering_cold":
      return (
        <g pointerEvents="none">
          {/* Garis getar di kiri-kanan badan */}
          <motion.g
            animate={{ opacity: [1, 0.25, 1] }}
            transition={loop(0.22)}
            fill="none"
            stroke={C.skyDark}
            strokeWidth={3.4}
            strokeLinecap="round"
          >
            <path d="M104 214 l-12 -6 M102 238 l-16 0 M106 262 l-12 6" />
            <path d="M296 214 l12 -6 M298 238 l16 0 M294 262 l12 6" />
          </motion.g>
          {/* Butiran salju jatuh (posisi tetap, tidak acak) */}
          {SNOW_FLAKES.map((f, i) => (
            <motion.g
              key={i}
              animate={{ y: [0, 210], x: [0, f.drift], opacity: [0, 1, 1, 0] }}
              transition={{ duration: f.dur, repeat: Infinity, ease: "linear", delay: f.delay }}
            >
              <g transform={`translate(${f.x} ${f.y})`} style={SVG_ATTR_ORIGIN}>
                <path d={snowflakePath(f.r)} fill="none" stroke={C.skyDark} strokeWidth={2.2} strokeLinecap="round" />
                <circle cx={0} cy={0} r={f.r * 0.22} fill={C.cream} />
              </g>
            </motion.g>
          ))}
          {/* Uap napas dingin */}
          <motion.g
            animate={{ y: [0, -16], x: [0, -10], opacity: [0.9, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          >
            <path
              d="M96 250 Q84 250 84 240 Q84 230 96 230 Q100 220 112 224 Q124 220 126 232 Q136 236 130 246 Q126 252 114 250Z"
              fill={C.cream}
              {...O25}
            />
          </motion.g>
        </g>
      );
    case "shocked_boros":
      return (
        <g pointerEvents="none">
          <Exclaim x={322} y={150} />
          <Exclaim x={80} y={170} delay={0.25} />
          <motion.g
            animate={{ opacity: [1, 0.2, 1] }}
            transition={loop(0.3)}
            fill="none"
            stroke={INK}
            strokeWidth={3.4}
            strokeLinecap="round"
          >
            <path d="M104 142 l-16 -8 M100 170 l-20 0 M106 198 l-16 8" />
            <path d="M296 142 l16 -8 M300 170 l20 0 M294 198 l16 8" />
          </motion.g>
          <FlyingCoin dx={86} dy={-70} delay={0} />
          <FlyingCoin dx={-96} dy={-50} delay={0.55} />
          <FlyingCoin dx={30} dy={-110} delay={1.1} />
        </g>
      );
    default:
      return (
        <g pointerEvents="none">
          <Sparkle x={308} y={120} size={7} color={C.honeySoft} delay={0.2} />
          <Sparkle x={92} y={134} size={6} color={C.cream} delay={1} />
        </g>
      );
  }
}

/* ═════════════════════════════════════════════════════════════
 *  FASE 1 — TELUR AJAIB
 * ═════════════════════════════════════════════════════════════ */

/** Anchor transparan: menyamakan bbox semua grup goyang telur agar titik putar sama (dasar telur). */
function EggAnchor() {
  return <rect x={40} y={150} width={320} height={GROUND - 150} fill="none" pointerEvents="none" />;
}

const EGG_WOBBLE: MotionSpec = { animate: { rotate: [-3, 3, -3] }, transition: loop(1.5) };

function EggCracks({ uid }: { uid: string }) {
  const gid = `${uid}-eggglow`;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE27A" stopOpacity={0.85} />
          <stop offset="60%" stopColor="#FFC800" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#FFC800" stopOpacity={0} />
        </radialGradient>
      </defs>
      <motion.circle
        cx={212}
        cy={256}
        r={46}
        fill={`url(#${gid})`}
        style={fb()}
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.08, 0.9] }}
        transition={loop(1.5)}
      />
      <motion.path
        d="M216 232 L207 246 L220 255 L206 270 L214 280"
        fill="none"
        stroke={C.honey}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0.4, 0.95, 0.4] }}
        transition={loop(1.5)}
      />
      <path
        d="M216 232 L207 246 L220 255 L206 270 L214 280"
        fill="none"
        stroke={INK}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.path
        d="M173 300 L181 309 L172 317"
        fill="none"
        stroke={C.honey}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0.3, 0.9, 0.3] }}
        transition={loop(1.5, { delay: 0.3 })}
      />
      <path
        d="M173 300 L181 309 L172 317"
        fill="none"
        stroke={INK}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Sparkle x={236} y={226} size={8} color={C.honeySoft} delay={0.1} />
      <Sparkle x={166} y={252} size={6} color={C.cream} delay={0.9} />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  FASE 2 — POTONGAN CANGKANG
 * ═════════════════════════════════════════════════════════════ */

const SHELL = { base: "#FFF6E0", shade: "#F1E1BF", dot: "#E4CC9C" } as const;

function ShellBack() {
  return (
    <g>
      <path
        d="M104 352 C100 304 124 262 158 250 L168 264 L182 246 L200 262 L218 246 L232 264 L242 250 C276 262 300 304 296 352 Z"
        fill={SHELL.shade}
        {...O}
      />
      <path d="M118 336 C116 306 130 282 150 270" fill="none" stroke={SHELL.base} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
    </g>
  );
}

function ShellFront() {
  return (
    <g>
      <path
        d="M112 334 L126 322 L141 336 L156 322 L171 336 L186 322 L200 336 L214 322 L229 336 L244 322 L259 336 L274 322 L288 334 Q288 360 200 361 Q112 360 112 334Z"
        fill={SHELL.base}
        {...O}
      />
      <path d="M126 346 Q150 356 190 356" fill="none" stroke={SHELL.shade} strokeWidth={5} strokeLinecap="round" />
      <circle cx={140} cy={347} r={3.2} fill={SHELL.dot} />
      <circle cx={252} cy={350} r={3.8} fill={SHELL.dot} />
      <circle cx={214} cy={352} r={2.6} fill={SHELL.dot} />
      <Hl d="M122 340 Q124 334 130 330" w={3} o={0.9} />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  FASE 7 — KILAU EMAS
 * ═════════════════════════════════════════════════════════════ */

function PrimeCrest({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at[0]} ${at[1] + 4})`} style={SVG_ATTR_ORIGIN} pointerEvents="none">
      <motion.g style={fb(0.5, 1)} animate={{ rotate: [-3, 3, -3] }} transition={loop(2.6)}>
        <path d="M-14 4 Q-24 -14 -10 -28 Q-8 -12 0 -4Z" fill={C.honey} {...O25} />
        <path d="M-5 4 Q-9 -24 5 -38 Q13 -20 7 4Z" fill={C.honey} {...O25} />
        <path d="M8 4 Q12 -12 26 -20 Q24 -4 15 6Z" fill={C.honey} {...O25} />
        <path d="M-2 -6 Q-2 -22 4 -30" fill="none" stroke={C.honeySoft} strokeWidth={3} strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function PrimeShine({ face }: { face: FaceSpec }) {
  return (
    <g pointerEvents="none">
      <Sparkle x={face.earTips[0][0]} y={face.earTips[0][1] - 4} size={9} color={C.honey} delay={0.2} />
      <Sparkle x={face.earTips[1][0]} y={face.earTips[1][1] - 4} size={9} color={C.honey} delay={0.9} />
      <Sparkle x={face.tailTip[0]} y={face.tailTip[1]} size={9} color={C.honeySoft} delay={0.5} />
    </g>
  );
}

function AdultShine({ face }: { face: FaceSpec }) {
  return (
    <g pointerEvents="none">
      <Sparkle x={face.crest[0] - 50} y={face.crest[1] + 24} size={6} color={C.cream} delay={0.3} />
      <Sparkle x={face.crest[0] + 56} y={face.crest[1] + 40} size={5} color={C.cream} delay={1.1} />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  REGISTRI KOSMETIK (item dasar + item tambahan)
 * ═════════════════════════════════════════════════════════════ */

const HEAD_REGISTRY: Readonly<Record<string, HeadArt>> = { ...HEAD_REG_A, ...HEAD_REG_B };
/**
 * Koreksi viewBox pratinjau hasil pengukuran bounding box (audit): item yang terpotong di tepi kotak
 * (kuncir dua, topi sinterklas, payung, buket, pedang busa, skuter, balon) dilebarkan; item wajah mungil
 * (plester pipi, janggut, lipstik) diperketat agar terbaca di kartu 80×80.
 */
const PREVIEW_BOX_FIX: Record<string, string> = {
  head_hair_pigtails: "-159 -55 319 192",
  head_santa_hat: "-66 -75 160 112",
  prop_pastel_umbrella: "-56 -133 172 178",
  prop_flower_bouquet: "-41 -106 114 130",
  prop_foam_sword: "-37 -134 100 165",
  prop_pastel_scooter: "60 237 313 139",
  prop_balloon_bunch: "-59 -145 167 181",
  face_cheek_bandaid: "-80 -2 53 56",
  face_blush_stickers: "-80 -4 160 56",
  face_goatee_beard: "-20 27 40 40",
  face_lipstick_pink: "-17 5 41 40",
};

const HEAD_BOX_ALL: Readonly<Record<string, string>> = { ...HFN_BOX, ...HEAD_BOX_A, ...HEAD_BOX_B, ...PREVIEW_BOX_FIX };
const FACE_BOX_ALL: Readonly<Record<string, string>> = { ...HFN_BOX, ...FACE_BOX_X, ...PREVIEW_BOX_FIX };
const NECK_BOX_ALL: Readonly<Record<string, string>> = { ...HFN_BOX, ...NECK_BOX_X };
const PROPS_ALL: Readonly<Record<string, PropSpec>> = { ...PROPS, ...PROPS_X };
const PROP_BOX_ALL: Readonly<Record<string, string>> = { ...OP_PROP_BOX, ...PX_PROP_BOX, ...PREVIEW_BOX_FIX };

function HeadFront({ id }: { id: string }) {
  const art = HEAD_REGISTRY[id];
  if (art) return <art.Front />;
  return <HeadItem id={id} />;
}

function HeadBack({ id }: { id: string }) {
  const art = HEAD_REGISTRY[id];
  return art?.Back ? <art.Back /> : null;
}

function OutfitBackAny({ id }: { id: string }) {
  const art = OUTFIT_REG[id];
  if (art) return art.Back ? <art.Back /> : null;
  return <OutfitBack id={id} />;
}

function OutfitClippedAny({ id }: { id: string }) {
  const art = OUTFIT_REG[id];
  if (art) return art.Clipped ? <art.Clipped /> : null;
  return <OutfitClipped id={id} />;
}

function OutfitOverlayAny({ id }: { id: string }) {
  const art = OUTFIT_REG[id];
  if (art) return art.Overlay ? <art.Overlay /> : null;
  return <OutfitOverlay id={id} />;
}

function OutfitPreviewAny({ id, uid }: { id: string; uid: string }) {
  if (!OUTFIT_REG[id]) return <OutfitPreviewArt id={id} />;
  const clipId = `${uid}-outfit-prev`;
  return (
    <g>
      <OutfitBackAny id={id} />
      <path d={OP_TORSO} fill="#FFF1D6" />
      <clipPath id={clipId}>
        <path d={OP_TORSO} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <OutfitClippedAny id={id} />
      </g>
      <path d={OP_TORSO} fill="none" {...O} />
      <OutfitOverlayAny id={id} />
    </g>
  );
}

function AuraAny({ id, cy, uid }: { id: string; cy: number; uid: string }) {
  const Aura = AURA_REG[id] ?? EXTRA_AURA_REG[id];
  if (Aura) return <Aura cy={cy} uid={uid} />;
  return <AuraItem id={id} cy={cy} uid={uid} />;
}

function BackgroundAny({ id, uid }: { id: string; uid: string }) {
  const Bg = BG_REG[id] ?? EXTRA_BG_REG[id];
  if (Bg) return <Bg uid={uid} />;
  return <BackgroundItem id={id} uid={uid} />;
}

/* ═════════════════════════════════════════════════════════════
 *  LAYER KOSMETIK
 * ═════════════════════════════════════════════════════════════ */

/**
 * Transform penempatan item kepala. Rambut, tudung kelinci, dan hijab dapat disetel per spesies
 * (`hairLift`, `hairSquash`, `hijabScaleX`) agar poni tidak menutupi mata dan hijab tidak memotong pipi.
 */
function headTransform(id: string, face: FaceSpec, egg: boolean): string {
  if (egg) return "translate(200 224) scale(0.74)";
  const k = face.hatScale;
  if (id === HIJAB_ID && face.hijabScaleX) {
    return `translate(200 ${face.headTop}) scale(${f2(k * face.hijabScaleX)} ${k})`;
  }
  if ((isHairAccessory(id) || id === BUNNY_HOOD_ID) && (face.hairLift || face.hairSquash)) {
    return `translate(200 ${f2(face.headTop - (face.hairLift ?? 0))}) scale(${k} ${f2(k * (face.hairSquash ?? 1))})`;
  }
  return `translate(200 ${face.headTop}) scale(${k})`;
}

function HeadLayer({ id, face, egg }: { id: string; face: FaceSpec; egg: boolean }) {
  return (
    <g transform={headTransform(id, face, egg)} style={SVG_ATTR_ORIGIN}>
      <HeadFront id={id} />
    </g>
  );
}

function HeadBackLayer({ id, face }: { id: string; face: FaceSpec }) {
  return (
    <g transform={headTransform(id, face, false)} style={SVG_ATTR_ORIGIN}>
      <HeadBack id={id} />
    </g>
  );
}

function FaceLayer({ id, face }: { id: string; face: FaceSpec }) {
  const half = (face.eyeR[0] - face.eyeL[0]) / 2;
  const mid = (face.eyeR[0] + face.eyeL[0]) / 2;
  const y = (face.eyeL[1] + face.eyeR[1]) / 2;
  const Extra = FACE_REG[id];
  return (
    <g transform={`translate(${mid} ${y})`} style={SVG_ATTR_ORIGIN}>
      {Extra ? (
        <Extra half={half} noseDY={face.noseY - y} mouthDY={face.mouthY - y} />
      ) : (
        <FaceItem id={id} half={half} />
      )}
    </g>
  );
}

function NeckAny({ id }: { id: string }) {
  const Extra = NECK_REG[id];
  return Extra ? <Extra /> : <NeckItem id={id} />;
}

function NeckLayer({ id, face }: { id: string; face: FaceSpec }) {
  return (
    <g transform={`translate(200 ${face.neckY})`} style={SVG_ATTR_ORIGIN}>
      <NeckAny id={id} />
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  BAGIAN BAWAH & ATAS PET
 * ═════════════════════════════════════════════════════════════ */

function PetLower({
  art,
  stage,
  mood,
  outfitId,
  headId,
  uid,
}: {
  art: SpeciesArt;
  stage: GrowthStage;
  mood: PetMood;
  outfitId: string | undefined;
  headId: string | undefined;
  uid: string;
}) {
  if (stage === 1) {
    return (
      <motion.g style={fb(0.5, 1)} animate={EGG_WOBBLE.animate} transition={EGG_WOBBLE.transition}>
        <EggAnchor />
        <art.Egg />
        <EggCracks uid={uid} />
      </motion.g>
    );
  }
  const clipId = `${uid}-body`;
  return (
    <g>
      {outfitId && <OutfitBackAny id={outfitId} />}
      {headId && <HeadBackLayer id={headId} face={art.face} />}
      {stage === 2 && <ShellBack />}
      <art.Tail mood={mood} />
      <art.Body />
      {outfitId && (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={art.face.bodyPath} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <OutfitClippedAny id={outfitId} />
          </g>
          <path d={art.face.bodyPath} fill="none" {...O} />
          <OutfitOverlayAny id={outfitId} />
        </>
      )}
      {stage === 2 && <ShellFront />}
    </g>
  );
}

function PetUpper({
  art,
  stage,
  mood,
  uid,
  headId,
  faceId,
  neckId,
  holding,
  decorated,
}: {
  art: SpeciesArt;
  stage: GrowthStage;
  mood: PetMood;
  uid: string;
  headId: string | undefined;
  faceId: string | undefined;
  neckId: string | undefined;
  holding: boolean;
  /** false = mode siluet rahasia: tanpa kilau/mood. */
  decorated: boolean;
}) {
  const spec = art.face;
  if (stage === 1) {
    return (
      <motion.g style={fb(0.5, 1)} animate={EGG_WOBBLE.animate} transition={EGG_WOBBLE.transition}>
        <EggAnchor />
        {headId && <HeadLayer id={headId} face={spec} egg />}
      </motion.g>
    );
  }
  const headStuff = (
    <>
      <art.Head mood={mood} />
      <Face spec={spec} mood={mood} stage={stage} uid={uid} />
      {stage === 7 && !headId && <PrimeCrest at={spec.crest} />}
      {faceId && <FaceLayer id={faceId} face={spec} />}
      {headId && <HeadLayer id={headId} face={spec} egg={false} />}
      {art.FrontOfHat && <art.FrontOfHat />}
    </>
  );
  const pawFill = spec.pawColor;
  return (
    <g>
      <Paw cx={holding ? 168 : 172} cy={316} fill={pawFill} />
      {!holding && <Paw cx={228} cy={316} fill={pawFill} />}
      {stage === 4 ? (
        <motion.g
          style={fb(0.5, 1)}
          animate={{ rotate: [0, 4, 4, -3, -3, 0] }}
          transition={{ duration: 6, times: [0, 0.2, 0.45, 0.6, 0.85, 1], repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x={40} y={100} width={320} height={spec.chin[1] - 100} fill="none" pointerEvents="none" />
          {headStuff}
        </motion.g>
      ) : (
        <g>{headStuff}</g>
      )}
      {neckId && <NeckLayer id={neckId} face={spec} />}
      {decorated && stage === 6 && <AdultShine face={spec} />}
      {decorated && stage === 7 && <PrimeShine face={spec} />}
      {decorated && <MoodOverlay mood={mood} />}
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  SILUET RAHASIA
 * ═════════════════════════════════════════════════════════════ */

function SilhouetteFilter({ uid, animate }: { uid: string; animate: boolean }) {
  return (
    <>
      <filter
        id={`${uid}-ghost`}
        filterUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={VB_W}
        height={VB_H}
        colorInterpolationFilters="sRGB"
      >
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0 0 0 0 0.35  0 0 0 0 0.29  0 0 0 0 0.37  0 0 0 0.62 0"
        />
      </filter>
      <filter id={`${uid}-fogblur`} filterUnits="userSpaceOnUse" x={-40} y={200} width={VB_W + 80} height={220}>
        <feGaussianBlur stdDeviation={8} />
      </filter>
      <filter
        id={`${uid}-sil`}
        filterUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={VB_W}
        height={VB_H}
        colorInterpolationFilters="sRGB"
      >
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0 0 0 0 0.176  0 0 0 0 0.149  0 0 0 0 0.129  0 0 0 1 0"
          result="flat"
        />
        <feGaussianBlur in="SourceAlpha" stdDeviation={3.2} result="blur" />
        <feSpecularLighting
          in="blur"
          surfaceScale={5}
          specularConstant={1}
          specularExponent={26}
          lightingColor="#FFE27A"
          result="spec"
        >
          <fePointLight x={60} y={40} z={120}>
            {animate && <animate attributeName="x" values="40;360;40" dur="5.5s" repeatCount="indefinite" />}
            {animate && <animate attributeName="y" values="50;170;50" dur="3.7s" repeatCount="indefinite" />}
          </fePointLight>
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
        <feMerge>
          <feMergeNode in="flat" />
          <feMergeNode in="specIn" />
        </feMerge>
      </filter>
    </>
  );
}

function SecretFogBack({ uid }: { uid: string }) {
  const gid = `${uid}-fog`;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#CE82FF" stopOpacity={0.42} />
          <stop offset="60%" stopColor="#8E5BC8" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#CE82FF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <motion.circle
        cx={200}
        cy={226}
        r={178}
        fill={`url(#${gid})`}
        style={fb()}
        animate={{ scale: [0.95, 1.06, 0.95] }}
        transition={loop(3.8)}
      />
      {[
        { x: 70, y: 150, r: 26, d: 0 },
        { x: 336, y: 190, r: 22, d: 0.9 },
        { x: 296, y: 90, r: 18, d: 1.7 },
        { x: 100, y: 70, r: 16, d: 2.4 },
      ].map((p) => (
        <motion.g key={p.d} animate={{ y: [0, -10, 0], opacity: [0.35, 0.8, 0.35] }} transition={loop(3, { delay: p.d })}>
          <path
            d={`M${p.x - p.r * 0.5} ${p.y - p.r * 0.7} Q${p.x - p.r * 0.5} ${p.y - p.r * 1.5} ${p.x + p.r * 0.3} ${p.y - p.r * 1.4} Q${p.x + p.r} ${p.y - p.r * 1.3} ${p.x + p.r * 0.7} ${p.y - p.r * 0.6} Q${p.x + p.r * 0.2} ${p.y - p.r * 0.2} ${p.x} ${p.y + p.r * 0.2}`}
            fill="none"
            stroke={C.taroSoft}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={p.x} cy={p.y + p.r * 0.8} r={2.6} fill={C.taroSoft} />
        </motion.g>
      ))}
    </g>
  );
}

function SecretFogFront({ uid }: { uid: string }) {
  const puffs = [
    { cx: 92, cy: 356, rx: 78, ry: 17, d: 0, c: "#E3B6FF" },
    { cx: 312, cy: 350, rx: 84, ry: 19, d: 1.1, c: "#CFC6E0" },
    { cx: 200, cy: 368, rx: 120, ry: 14, d: 2.1, c: "#E3B6FF" },
    { cx: 150, cy: 322, rx: 60, ry: 12, d: 0.6, c: "#CFC6E0" },
    { cx: 260, cy: 312, rx: 56, ry: 11, d: 1.6, c: "#E3B6FF" },
  ];
  return (
    <g pointerEvents="none" filter={`url(#${uid}-fogblur)`}>
      {puffs.map((p) => (
        <motion.ellipse
          key={p.d}
          cx={p.cx}
          cy={p.cy}
          rx={p.rx}
          ry={p.ry}
          fill={p.c}
          animate={{ x: [-14, 14, -14], opacity: [0.45, 0.75, 0.45] }}
          transition={loop(5 + p.d, { delay: p.d * 0.3 })}
        />
      ))}
    </g>
  );
}

function MysteryBadge() {
  return (
    <motion.g animate={{ y: [0, -6, 0] }} transition={loop(2.2)}>
      <g transform="translate(200 288)" style={SVG_ATTR_ORIGIN}>
        <rect x={-50} y={-23} width={100} height={46} rx={23} fill={C.honey} {...O} />
        <rect x={-42} y={-17} width={84} height={34} rx={17} fill={C.honeySoft} opacity={0.8} />
        <Hl d="M-34 -10 Q-24 -16 -10 -16" w={3.4} o={0.9} />
        <text
          x={0}
          y={9}
          textAnchor="middle"
          fontFamily={DISPLAY_FONT}
          fontWeight={700}
          fontSize={30}
          letterSpacing={2}
          fill={INK}
        >
          ???
        </text>
      </g>
      <Sparkle x={262} y={262} size={10} color={C.cream} delay={0.2} />
      <Sparkle x={138} y={316} size={8} color={C.honeySoft} delay={1} />
    </motion.g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  PAPAN NAMA
 * ═════════════════════════════════════════════════════════════ */

function Nameplate({ label, badge }: { label: string; badge: string }) {
  const text = label.length > 14 ? `${label.slice(0, 13)}…` : label;
  const w = Math.max(96, text.length * 10.6 + 62);
  const x0 = 200 - w / 2;
  return (
    <g>
      <rect x={x0} y={380} width={w} height={26} rx={13} fill={C.cream} {...O3} />
      <circle cx={x0 + 15} cy={393} r={11.5} fill={C.honey} {...O25} />
      <text x={x0 + 15} y={398} textAnchor="middle" fontFamily={DISPLAY_FONT} fontWeight={700} fontSize={14} fill={INK}>
        {badge}
      </text>
      <text x={x0 + 34} y={399} fontFamily={DISPLAY_FONT} fontWeight={700} fontSize={16} fill={INK}>
        {text}
      </text>
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  CustomizablePetAvatar
 * ═════════════════════════════════════════════════════════════ */

const SEAT_NONE: SeatSpec = { lift: 0, back: null, front: null };

function sameEquipped(
  a: Partial<Record<AccessorySlot, string>> | undefined,
  b: Partial<Record<AccessorySlot, string>> | undefined,
): boolean {
  if (a === b) return true;
  for (const slot of ACCESSORY_SLOTS) {
    if (a?.[slot] !== b?.[slot]) return false;
  }
  return true;
}

function avatarPropsEqual(a: CustomizablePetAvatarProps, b: CustomizablePetAvatarProps): boolean {
  return (
    a.species === b.species &&
    a.stage === b.stage &&
    a.mood === b.mood &&
    a.isMysteryLocked === b.isMysteryLocked &&
    a.customName === b.customName &&
    a.className === b.className &&
    sameEquipped(a.equippedAccessories, b.equippedAccessories)
  );
}

/**
 * Avatar pet lengkap. Dibungkus `memo` dengan pembanding per-slot agar objek `equippedAccessories`
 * baru dengan isi sama (mis. literal inline) tidak memicu render ulang SVG yang berat.
 */
export const CustomizablePetAvatar = memo(function CustomizablePetAvatar({
  species,
  stage,
  mood = "happy",
  equippedAccessories,
  isMysteryLocked = false,
  customName,
  className,
}: CustomizablePetAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const locked = isMysteryLocked;
  const effMood: PetMood = locked ? "happy" : mood;
  const eq = locked ? undefined : equippedAccessories;

  const pick = (slot: AccessorySlot): string | undefined => {
    const id = eq?.[slot];
    if (!id) return undefined;
    const item = ACCESSORY_BY_ID[id];
    return item && item.slot === slot ? id : undefined;
  };

  const art = SPECIES_ART[species];
  const isEgg = stage === 1;
  const rawHeadId = pick("head");
  const headId = isEgg && isHairAccessory(rawHeadId) ? undefined : rawHeadId;
  const outfitId = isEgg ? undefined : pick("outfit");
  const faceId = isEgg ? undefined : pick("face");
  const neckId = isEgg ? undefined : pick("neck");
  const auraId = pick("aura");
  const bgId = pick("background");
  const propId = pick("prop");
  const propSpec: PropSpec | undefined = propId ? PROPS_ALL[propId] : undefined;
  const seat: SeatSpec = propSpec && propSpec.kind === "seat" ? propSpec : SEAT_NONE;
  const HeldItem = propSpec && propSpec.kind === "held" && !isEgg ? propSpec.Item : undefined;
  const lift = seat.lift;

  const info = getSpeciesInfo(species);
  const stageInfo = GROWTH_STAGE_META[stage];
  /** Telur digambar sedikit lebih besar agar seimbang dengan fase lain. */
  const scale = stageInfo.scale * (isEgg ? 1.12 : 1);
  const name = customName?.trim() || info.defaultName;
  const plateLabel = locked ? "???" : name;
  const plateBadge = locked ? "?" : String(stage);
  const showPlate = Boolean(customName?.trim());

  const ariaLabel = locked
    ? `Siluet rahasia: ${info.name} fase ${stage} belum terbuka`
    : `${name}, ${info.name}, fase ${stage} ${stageInfo.name}, suasana ${PET_MOOD_LABEL[effMood]}`;

  const lower = (
    <PetMotion mood={effMood}>
      <g transform={`translate(0 ${-lift})`} style={SVG_ATTR_ORIGIN}>
        <PetLower art={art} stage={stage} mood={effMood} outfitId={outfitId} headId={headId} uid={uid} />
      </g>
    </PetMotion>
  );

  const upper = (
    <PetMotion mood={effMood}>
      <g transform={`translate(0 ${-lift})`} style={SVG_ATTR_ORIGIN}>
        <PetUpper
          art={art}
          stage={stage}
          mood={effMood}
          uid={uid}
          headId={headId}
          faceId={faceId}
          neckId={neckId}
          holding={Boolean(HeldItem)}
          decorated={!locked}
        />
        {HeldItem && (
          <>
            <g transform="translate(250 318)" style={SVG_ATTR_ORIGIN}>
              <HeldItem />
            </g>
            <Paw cx={250} cy={323} rx={14} ry={12} fill={art.face.pawColor} />
          </>
        )}
      </g>
    </PetMotion>
  );

  const placeCharacter = (children: ReactNode) => (
    <g transform={`translate(200 ${GROUND}) scale(${scale}) translate(-200 ${-GROUND})`} style={SVG_ATTR_ORIGIN}>{children}</g>
  );

  const auraCy = GROUND - scale * (lift + 126);

  return (
    <MotionConfig reducedMotion="user">
      <GrowthCtx.Provider value={{ stage }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          className={className}
          role="img"
          aria-label={ariaLabel}
          style={{ overflow: "visible" }}
        >
          <title>{ariaLabel}</title>
          <desc>
            {locked
              ? "Karakter ini masih terkunci. Capai fase pertumbuhan ini untuk membukanya."
              : `${stageInfo.description}`}
          </desc>

          {locked ? (
            <>
              <defs>
                <SilhouetteFilter uid={uid} animate={!reduce} />
              </defs>
              <SecretFogBack uid={uid} />
              {placeCharacter(
                <>
                  <ellipse cx={200} cy={369} rx={112 + lift} ry={9} fill={INK} opacity={0.18} />
                  <g filter={`url(#${uid}-ghost)`}>{seat.back}</g>
                  <g filter={`url(#${uid}-sil)`}>{lower}</g>
                  <g filter={`url(#${uid}-ghost)`}>{seat.front}</g>
                  <g filter={`url(#${uid}-sil)`}>{upper}</g>
                </>,
              )}
              <SecretFogFront uid={uid} />
              <MysteryBadge />
            </>
          ) : (
            <>
              {bgId && (
                <>
                  <defs>
                    <clipPath id={`${uid}-bgclip`}>
                      <rect x={0} y={0} width={VB_W} height={VB_H} rx={28} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${uid}-bgclip)`}>
                    <BackgroundAny id={bgId} uid={`${uid}b`} />
                  </g>
                  <rect x={1.5} y={1.5} width={VB_W - 3} height={VB_H - 3} rx={27} fill="none" {...O} />
                </>
              )}
              {auraId && <AuraAny id={auraId} cy={auraCy} uid={`${uid}a`} />}
              {placeCharacter(
                <>
                  <ellipse cx={200} cy={369} rx={112 + lift} ry={9} fill={INK} opacity={0.14} />
                  {seat.back}
                  {lower}
                  {seat.front}
                  {upper}
                </>,
              )}
            </>
          )}

          {showPlate && <Nameplate label={plateLabel} badge={plateBadge} />}
        </svg>
      </GrowthCtx.Provider>
    </MotionConfig>
  );
}, avatarPropsEqual);

/* ═════════════════════════════════════════════════════════════
 *  AccessoryPreviewIcon
 * ═════════════════════════════════════════════════════════════ */

const FACE_PREVIEW_HALF = 35;

/** Ubah viewBox menjadi persegi (sisi pendek diperlebar, terpusat) agar ikon selalu 1:1. */
function squareBox(box: string): string {
  const n = box.trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) return box;
  const [x, y, w, h] = n;
  const side = Math.max(w, h);
  return `${f2(x - (side - w) / 2)} ${f2(y - (side - h) / 2)} ${f2(side)} ${f2(side)}`;
}

function buildPreview({ item, uid }: { item: AccessoryItem; uid: string }): { box: string; node: ReactElement } {
  const id = item.id;
  switch (item.slot) {
    case "head":
      return {
        box: HEAD_BOX_ALL[id] ?? "-90 -120 180 200",
        node: (
          <g>
            <HeadBack id={id} />
            <HeadFront id={id} />
          </g>
        ),
      };
    case "face": {
      const Extra = FACE_REG[id];
      return {
        box: FACE_BOX_ALL[id] ?? "-70 -40 140 80",
        node: Extra ? (
          <Extra half={FACE_PREVIEW_HALF} noseDY={16} mouthDY={26} />
        ) : (
          <FaceItem id={id} half={FACE_PREVIEW_HALF} />
        ),
      };
    }
    case "neck":
      return { box: NECK_BOX_ALL[id] ?? "-70 -10 140 80", node: <NeckAny id={id} /> };
    case "outfit":
      return { box: OUTFIT_BOX_TIER[id] ?? OP_OUTFIT_BOX, node: <OutfitPreviewAny id={id} uid={uid} /> };
    case "prop": {
      const spec = PROPS_ALL[id];
      const box = PROP_BOX_ALL[id] ?? "0 0 400 410";
      if (!spec) return { box, node: <g /> };
      if (spec.kind === "seat") {
        return {
          box,
          node: (
            <g>
              {spec.back}
              {spec.front}
            </g>
          ),
        };
      }
      const Held = spec.Item;
      return { box, node: <Held /> };
    }
    case "aura":
      return {
        box: `0 0 ${VB_W} ${VB_H}`,
        node: (
          <g>
            <circle cx={200} cy={205} r={52} fill={C.cream} {...O} opacity={0.9} />
            <AuraAny id={id} cy={205} uid={`${uid}a`} />
          </g>
        ),
      };
    case "background":
      return {
        box: `0 0 ${VB_W} ${VB_H}`,
        node: (
          <g>
            <defs>
              <clipPath id={`${uid}-pbg`}>
                <rect x={0} y={0} width={VB_W} height={VB_H} rx={28} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${uid}-pbg)`}>
              <BackgroundAny id={id} uid={`${uid}b`} />
            </g>
            <rect x={3} y={3} width={VB_W - 6} height={VB_H - 6} rx={26} fill="none" {...O} strokeWidth={6} />
          </g>
        ),
      };
    default:
      return { box: "0 0 100 100", node: <g /> };
  }
}

/** Pratinjau item (kartu Lemari/Butik/peti). `memo` agar render ulang induk tidak menggambar ulang SVG. */
export const AccessoryPreviewIcon = memo(function AccessoryPreviewIcon({ accessoryId, isMysteryLocked = false, className }: AccessoryPreviewIconProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const item = getAccessory(accessoryId);

  if (!item) {
    return (
      <svg viewBox="0 0 100 100" width="100%" className={className} role="img" aria-label="Item tidak dikenal">
        <title>Item tidak dikenal</title>
        <rect x={6} y={6} width={88} height={88} rx={22} fill={C.taroSoft} {...O} />
        <text x={50} y={66} textAnchor="middle" fontFamily={DISPLAY_FONT} fontWeight={700} fontSize={46} fill={INK}>
          ?
        </text>
      </svg>
    );
  }

  const built = buildPreview({ item, uid });
  const art = { node: built.node, box: squareBox(built.box) };

  if (isMysteryLocked) {
    const label = `Item rahasia: ${SLOT_LABEL[item.slot]} terkunci, buka di fase ${item.stageRequirement}`;
    return (
      <MotionConfig reducedMotion="user">
        <svg viewBox="0 0 100 100" width="100%" className={className} role="img" aria-label={label}>
          <title>{label}</title>
          <defs>
            <filter id={`${uid}-lock`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.176  0 0 0 0 0.149  0 0 0 0 0.129  0 0 0 0.78 0"
              />
            </filter>
            <clipPath id={`${uid}-lockclip`}>
              <rect x={6} y={6} width={88} height={88} rx={22} />
            </clipPath>
          </defs>
          <rect x={6} y={6} width={88} height={88} rx={22} fill={C.taroSoft} />
          <g clipPath={`url(#${uid}-lockclip)`}>
            <path d="M-10 30 L30 -10 M-10 60 L60 -10 M-10 90 L90 -10 M10 110 L110 10 M40 110 L110 40 M70 110 L110 70" stroke={C.cream} strokeWidth={5} opacity={0.35} />
            <svg x={16} y={14} width={68} height={68} viewBox={art.box} preserveAspectRatio="xMidYMid meet">
              <g filter={`url(#${uid}-lock)`}>{art.node}</g>
            </svg>
            <motion.g
              animate={reduce ? undefined : { opacity: [0.2, 0.55, 0.2] }}
              transition={loop(2.4)}
            >
              <rect x={6} y={6} width={88} height={88} rx={22} fill={C.taro} opacity={0.35} />
            </motion.g>
          </g>
          <rect x={6} y={6} width={88} height={88} rx={22} fill="none" {...O} />
          <motion.g animate={{ y: [0, -2, 0] }} transition={loop(2.2)}>
            <circle cx={74} cy={74} r={17} fill={C.honey} {...O} />
            <circle cx={74} cy={74} r={11.5} fill={C.honeySoft} opacity={0.85} />
            <text x={74} y={83} textAnchor="middle" fontFamily={DISPLAY_FONT} fontWeight={700} fontSize={26} fill={INK}>
              ?
            </text>
          </motion.g>
          <Sparkle x={24} y={26} size={6} color={C.cream} delay={0.3} />
        </svg>
      </MotionConfig>
    );
  }

  const label = `${item.name} — ${SLOT_LABEL[item.slot]}`;
  return (
    <MotionConfig reducedMotion="user">
      <svg viewBox={art.box} width="100%" className={className} role="img" aria-label={label}>
        <title>{label}</title>
        {art.node}
      </svg>
    </MotionConfig>
  );
});

// __AUDIT_EXPORT_START (khusus harness audit di cloud; DIHAPUS sebelum sinkron ke repo)
export const __AUDIT = { SPECIES_ART, GROUND, VB_W, VB_H };
// __AUDIT_EXPORT_END

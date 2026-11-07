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

export type PetMood = "happy" | "proud" | "worried" | "shocked_boros";

export type AccessorySlot = "head" | "outfit" | "face" | "neck" | "prop" | "aura" | "background";
export type AccessorySource = "shop" | "path_drop";

export interface AccessoryItem {
  id: string;
  name: string;
  slot: AccessorySlot;
  /** Fase pertumbuhan minimum agar item terbuka (1..8). */
  stageRequirement: GrowthStage;
  /** Harga dalam poin. Item `path_drop` tidak dijual di Shop (0). */
  pricePoints: number;
  source: AccessorySource;
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
export const PET_MOODS: readonly PetMood[] = ["happy", "proud", "worried", "shocked_boros"];
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
  { stage: 8, name: "Sepuh Bijaksana", englishName: "Elder", scale: 1.02, description: "Alis putih kapas, janggut halus, dan tatapan teduh yang hangat." },
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
 *  KATALOG KOSMETIK — 48 item, 6 per fase.
 *  32 dijual di Shop, 16 eksklusif drop dari peti Peta Jalur Kas Harian.
 * ═════════════════════════════════════════════════════════════ */

export const ACCESSORY_CATALOG: readonly AccessoryItem[] = [
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

export type AccessoryId = (typeof ACCESSORY_CATALOG)[number]["id"];

export const ACCESSORY_BY_ID: Readonly<Record<string, AccessoryItem>> = Object.fromEntries(
  ACCESSORY_CATALOG.map((a) => [a.id, a]),
);

export function getAccessory(id: string): AccessoryItem | undefined {
  return ACCESSORY_BY_ID[id];
}

export function getAccessoriesBySlot(slot: AccessorySlot): AccessoryItem[] {
  return ACCESSORY_CATALOG.filter((a) => a.slot === slot);
}

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
    <g transform={`translate(${x} ${y})`}>
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
    <g transform={`translate(${x} ${y})`}>
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

type EyeStyle = "round" | "sleepy" | "almond" | "mask" | "star" | "bead";
type NoseStyle = "pink_tri" | "snout" | "oval" | "nostrils" | "button" | "heart" | "y_nose";

/** Data wajah + titik jangkar kosmetik untuk satu spesies (koordinat artboard 400×410). */
interface FaceSpec {
  eyeL: Pt;
  eyeR: Pt;
  eyeStyle: EyeStyle;
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
 *  SISTEM WAJAH BERSAMA (ekspresi mood × fase pertumbuhan)
 * ═════════════════════════════════════════════════════════════ */

const COTTON = "#FFFEFA";

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

function EyeShape({ style, cx, cy, side }: { style: EyeStyle; cx: number; cy: number; side: "l" | "r" }) {
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
          <ellipse cx={cx} cy={cy} rx={9.6} ry={11.8} fill={INK} transform={`rotate(${o * -10} ${cx} ${cy})`} />
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
          <ellipse cx={cx} cy={cy} rx={11.5} ry={13.5} fill={INK} />
          <polygon points={starPoints(cx + 1, cy - 2, 7.4, 3.3)} fill={C.honeySoft} stroke={C.cream} strokeWidth={1} strokeLinejoin="round" />
          <circle cx={cx - 4} cy={cy + 6} r={2.2} fill={C.cream} />
          <circle cx={cx + 5} cy={cy + 5} r={1.2} fill={C.skySoft} />
        </g>
      );
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
  const k = stage === 2 ? 1.6 : stage === 3 ? 1.14 : 1;

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
        <g key={side} transform={k === 1 ? undefined : `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`}>
          <EyeShape style={spec.eyeStyle} cx={x} cy={y} side={side} />
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
  const base = mood === "happy" || mood === "proud" ? 0.75 : mood === "worried" ? 0.3 : 0;
  const o = stage === 3 ? Math.min(1, base + 0.2) : base;
  const rx = stage === 3 ? 20 : stage === 2 ? 17 : 15;
  const ry = stage === 3 ? 12 : stage === 2 ? 10 : 9;
  return (
    <g fill={cheekColor}>
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

/** Fase 8 — alis kapas tebal, kumis halus, janggut berbulu, dan kelopak teduh. */
function ElderDetails({ spec }: { spec: FaceSpec }) {
  const { eyeL, eyeR, browY, chin, noseY, mouthY } = spec;
  const brow = (cx: number, side: 1 | -1) => (
    <g key={cx}>
      <path
        d={`M${cx - 20} ${browY + 6} Q${cx - 24} ${browY - 6} ${cx - 10} ${browY - 8} Q${cx - 6} ${browY - 18} ${cx + 4} ${browY - 12} Q${cx + 16} ${browY - 16} ${cx + 18} ${browY - 4} Q${cx + 26} ${browY + 2} ${cx + 18} ${browY + 8} Q${cx} ${browY + 12} ${cx - 20} ${browY + 6}Z`}
        fill={COTTON}
        {...O25}
        transform={`rotate(${side * 5} ${cx} ${browY})`}
      />
      <path d={`M${cx - 10} ${browY - 2} Q${cx - 6} ${browY - 8} ${cx} ${browY - 5}`} fill="none" stroke={C.skySoft} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
  const lidLine = (cx: number, cy: number) => (
    <path d={`M${cx - 12} ${cy - 5} Q${cx} ${cy - 13} ${cx + 12} ${cy - 5}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
  );
  return (
    <g>
      {lidLine(eyeL[0], eyeL[1])}
      {lidLine(eyeR[0], eyeR[1])}
      {brow(eyeL[0], 1)}
      {brow(eyeR[0], -1)}
      <path
        d={`M${200 - 8} ${mouthY - 6} Q${200 - 34} ${mouthY - 14} ${200 - 40} ${noseY + 10} Q${200 - 30} ${mouthY + 6} ${200 - 8} ${mouthY - 1}Z`}
        fill={COTTON}
        {...O25}
      />
      <path
        d={`M${200 + 8} ${mouthY - 6} Q${200 + 34} ${mouthY - 14} ${200 + 40} ${noseY + 10} Q${200 + 30} ${mouthY + 6} ${200 + 8} ${mouthY - 1}Z`}
        fill={COTTON}
        {...O25}
      />
      <path
        d={`M${chin[0] - 20} ${chin[1] - 12} Q${chin[0] - 24} ${chin[1] + 8} ${chin[0] - 8} ${chin[1] + 14} Q${chin[0]} ${chin[1] + 26} ${chin[0] + 8} ${chin[1] + 14} Q${chin[0] + 24} ${chin[1] + 8} ${chin[0] + 20} ${chin[1] - 12} Q${chin[0]} ${chin[1] - 4} ${chin[0] - 20} ${chin[1] - 12}Z`}
        fill={COTTON}
        {...O25}
      />
      <path d={`M${chin[0] - 7} ${chin[1] + 2} Q${chin[0] - 4} ${chin[1] + 10} ${chin[0]} ${chin[1] + 12}`} fill="none" stroke={C.skySoft} strokeWidth={2.2} strokeLinecap="round" />
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
      <g transform="translate(200 322) rotate(16)">
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
      <g transform="translate(200 288) rotate(16)">
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
    <g transform={`translate(${x} ${y}) scale(${s})`}>
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
  },
  Body: CapyBody,
  Head: CapyHead,
  Tail: CapyTail,
  Egg: CapyEgg,
};

/* ═════════════════════════════════════════════════════════════
 *  SPESIES B — Panda Merah, Beruang Susu, Rubah Fennec, Poni Awan
 * ═════════════════════════════════════════════════════════════ */

/** Siluet telur bersama (pusat 200,284 · rx≈62 · ry≈74 · dasar y = GROUND). */
const PandaEggD =
  "M200 210 C250 210 262 262 262 296 C262 334 236 358 200 358 C164 358 138 334 138 296 C138 262 150 210 200 210Z";

/* ───────────────────────── 5 · PANDA MERAH ───────────────────────── */

const PANDA = {
  rust: "#E0704A",
  rustDark: "#C4542F",
  brown: "#7A3F2A",
  cream: "#FFF3E0",
} as const;

const PANDA_BODY_D =
  "M136 296 C136 250 164 232 200 232 C236 232 264 250 264 296 C264 332 238 350 200 350 C162 350 136 332 136 296Z";

function PandaBody() {
  return (
    <g>
      <path d={PANDA_BODY_D} fill={PANDA.rust} />
      <path d="M170 244 Q200 262 230 244 Q252 290 230 336 Q200 348 170 336 Q148 290 170 244Z" fill={PANDA.brown} />
      <path d="M262 288 C260 268 252 254 240 246 C246 266 244 290 238 306 C252 304 262 298 262 288Z" fill={PANDA.rustDark} opacity={0.6} />
      <path d="M150 290 Q146 300 150 312" fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.5} />
      <path d={PANDA_BODY_D} fill="none" {...O} />
      <Feet fill={PANDA.brown} />
    </g>
  );
}

function PandaHead({ mood }: { mood: PetMood }) {
  const head =
    "M114 206 C114 152 150 132 200 132 C250 132 286 152 286 206 C286 248 252 272 200 272 C148 272 114 248 114 206Z";
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <circle cx={138} cy={150} r={27} fill={PANDA.rust} {...O} />
        <ellipse cx={138} cy={152} rx={15} ry={16} fill={PANDA.cream} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <circle cx={262} cy={150} r={27} fill={PANDA.rust} {...O} />
        <ellipse cx={262} cy={152} rx={15} ry={16} fill={PANDA.cream} />
      </EarWrap>
      <path d={head} fill={PANDA.rust} />
      <path d="M118 214 C118 188 140 184 158 202 C168 224 152 254 128 246 C120 238 118 226 118 214Z" fill={PANDA.cream} />
      <path d="M282 214 C282 188 260 184 242 202 C232 224 248 254 272 246 C280 238 282 226 282 214Z" fill={PANDA.cream} />
      <ellipse cx={200} cy={240} rx={34} ry={26} fill={PANDA.cream} />
      <ellipse cx={170} cy={168} rx={9} ry={6} fill={PANDA.cream} transform="rotate(-14 170 168)" />
      <ellipse cx={230} cy={168} rx={9} ry={6} fill={PANDA.cream} transform="rotate(14 230 168)" />
      <ellipse cx={166} cy={205} rx={17} ry={19} fill={PANDA.brown} transform="rotate(8 166 205)" />
      <ellipse cx={234} cy={205} rx={17} ry={19} fill={PANDA.brown} transform="rotate(-8 234 205)" />
      <path d="M158 220 Q154 236 146 246 M242 220 Q246 236 254 246" fill="none" stroke={PANDA.brown} strokeWidth={6} strokeLinecap="round" />
      <path d="M200 140 V158" stroke={PANDA.rustDark} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <Hl d="M150 156 Q168 142 192 140" w={3.4} o={0.45} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function PandaTail({ mood }: { mood: PetMood }) {
  const d = "M256 322 C310 338 342 292 326 250 C318 228 302 220 292 228";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill="none" stroke={INK} strokeWidth={48} strokeLinecap="round" />
      <path d={d} fill="none" stroke={PANDA.rust} strokeWidth={41} strokeLinecap="round" />
      <path d={d} fill="none" stroke={PANDA.brown} strokeWidth={41} strokeLinecap="butt" strokeDasharray="12 22" strokeDashoffset={-6} opacity={0.9} />
      <path d="M268 326 C312 336 336 300 322 262" fill="none" stroke={C.cream} strokeWidth={3.6} strokeLinecap="round" opacity={0.5} />
    </TailWrap>
  );
}

function PandaEgg() {
  return (
    <g>
      <circle cx={158} cy={226} r={16} fill={PANDA.rust} {...O} />
      <circle cx={158} cy={228} r={7.5} fill={PANDA.cream} />
      <circle cx={242} cy={226} r={16} fill={PANDA.rust} {...O} />
      <circle cx={242} cy={228} r={7.5} fill={PANDA.cream} />
      <path d={PandaEggD} fill={PANDA.rust} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={PANDA.rustDark} opacity={0.5} />
      <path d="M152 322 Q200 342 250 320" fill="none" stroke={PANDA.brown} strokeWidth={9} strokeLinecap="round" />
      <path d="M170 344 Q200 354 232 344" fill="none" stroke={PANDA.brown} strokeWidth={8} strokeLinecap="round" />
      <ellipse cx={200} cy={266} rx={34} ry={24} fill={PANDA.cream} />
      <ellipse cx={180} cy={262} rx={10} ry={12} fill={PANDA.brown} transform="rotate(10 180 262)" />
      <ellipse cx={220} cy={262} rx={10} ry={12} fill={PANDA.brown} transform="rotate(-10 220 262)" />
      <ellipse cx={200} cy={278} rx={6} ry={4} fill={PANDA.brown} />
      <Hl d="M158 262 Q160 240 176 228" w={4} o={0.6} />
      <path d={PandaEggD} fill="none" {...O} />
    </g>
  );
}

const PANDA_FACE: FaceSpec = {
  eyeL: [166, 204],
  eyeR: [234, 204],
  eyeStyle: "mask",
  nose: "snout",
  noseY: 232,
  mouthY: 246,
  browY: 174,
  cheekY: 232,
  cheekDX: 64,
  cheekColor: C.peachSoft,
  whiskers: "none",
  pawColor: PANDA.brown,
  chin: [200, 272],
  crest: [200, 134],
  earTips: [
    [138, 126],
    [262, 126],
  ],
  tailTip: [292, 228],
  headTop: 142,
  neckY: 266,
  hatScale: 1,
  bodyPath: PANDA_BODY_D,
};

const PANDA_ART: SpeciesArt = {
  face: PANDA_FACE,
  Body: PandaBody,
  Head: PandaHead,
  Tail: PandaTail,
  Egg: PandaEgg,
};

/* ───────────────────────── 6 · BERUANG SUSU BOBA ───────────────────────── */

const BEAR = {
  fur: "#FFF6E6",
  shade: "#F1DABD",
  belly: "#FFFDF7",
  pink: "#FFB5C2",
  pinkDark: "#F58FA6",
  muzzle: "#FFEBD0",
} as const;

const BEAR_BODY_D =
  "M130 300 C130 250 160 232 200 232 C240 232 270 250 270 300 C270 336 240 352 200 352 C160 352 130 336 130 300Z";

function BearBody() {
  return (
    <g>
      <path d={BEAR_BODY_D} fill={BEAR.fur} />
      <path d="M270 296 C270 268 258 250 240 240 C250 266 248 298 238 322 C258 320 270 312 270 296Z" fill={BEAR.shade} />
      <ellipse cx={200} cy={316} rx={40} ry={32} fill={BEAR.belly} />
      <g fill="none" stroke={BEAR.shade} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M134 280 l9 5 l-9 5" />
        <path d="M266 280 l-9 5 l9 5" />
        <path d="M136 312 l8 4 l-8 5" />
      </g>
      <Hl d="M148 266 Q152 252 168 246" w={3.4} o={0.7} />
      <path d={BEAR_BODY_D} fill="none" {...O} />
      <Feet fill={BEAR.fur} cx={166} rx={23} />
      <g fill={BEAR.pink}>
        <ellipse cx={166} cy={350} rx={8} ry={4.4} />
        <ellipse cx={234} cy={350} rx={8} ry={4.4} />
      </g>
    </g>
  );
}

function BearHead({ mood }: { mood: PetMood }) {
  const head =
    "M114 208 C114 154 150 134 200 134 C250 134 286 154 286 208 C286 250 252 274 200 274 C148 274 114 250 114 208Z";
  return (
    <g>
      <EarWrap side="l" mood={mood} ox={0.6} oy={0.8}>
        <circle cx={136} cy={152} r={25} fill={BEAR.fur} {...O} />
        <circle cx={138} cy={155} r={13.5} fill={BEAR.pink} />
        <circle cx={141} cy={151} r={4} fill={C.cream} opacity={0.7} />
      </EarWrap>
      <EarWrap side="r" mood={mood} ox={0.4} oy={0.8}>
        <circle cx={264} cy={152} r={25} fill={BEAR.fur} {...O} />
        <circle cx={262} cy={155} r={13.5} fill={BEAR.pink} />
        <circle cx={265} cy={151} r={4} fill={C.cream} opacity={0.7} />
      </EarWrap>
      <path d={head} fill={BEAR.fur} />
      <path d="M286 208 C286 250 252 274 200 274 C236 262 262 240 270 196 C282 190 286 198 286 208Z" fill={BEAR.shade} opacity={0.8} />
      <path d="M118 222 L104 230 L116 236 L106 246 L124 244Z" fill={BEAR.fur} {...O25} />
      <path d="M282 222 L296 230 L284 236 L294 246 L276 244Z" fill={BEAR.fur} {...O25} />
      <ellipse cx={200} cy={242} rx={36} ry={26} fill={BEAR.muzzle} />
      <path d="M192 138 Q190 120 204 122 Q200 130 212 138Z" fill={BEAR.fur} {...O25} />
      <Hl d="M148 160 Q166 144 192 142" w={3.6} o={0.8} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function BearTail({ mood }: { mood: PetMood }) {
  return (
    <TailWrap mood={mood}>
      <circle cx={272} cy={334} r={15} fill={BEAR.fur} {...O} />
      <path d="M262 328 Q266 322 274 322" fill="none" stroke={BEAR.shade} strokeWidth={3} strokeLinecap="round" />
      <Hl d="M264 330 Q266 326 270 325" w={2.6} o={0.9} />
    </TailWrap>
  );
}

function BearEgg() {
  return (
    <g>
      <circle cx={158} cy={226} r={17} fill={BEAR.fur} {...O} />
      <circle cx={159} cy={228} r={8.5} fill={BEAR.pink} />
      <circle cx={242} cy={226} r={17} fill={BEAR.fur} {...O} />
      <circle cx={241} cy={228} r={8.5} fill={BEAR.pink} />
      <path d={PandaEggD} fill={BEAR.fur} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={BEAR.shade} />
      <g fill={BEAR.pink}>
        <circle cx={172} cy={262} r={6} />
        <circle cx={226} cy={250} r={5} />
        <circle cx={206} cy={296} r={6.5} />
        <circle cx={166} cy={314} r={5} />
        <circle cx={238} cy={318} r={6} />
        <circle cx={196} cy={340} r={5} />
        <circle cx={240} cy={282} r={4} />
      </g>
      <Hl d="M158 262 Q160 240 176 228" w={4} o={0.9} />
      <path d={PandaEggD} fill="none" {...O} />
    </g>
  );
}

const BEAR_FACE: FaceSpec = {
  eyeL: [162, 206],
  eyeR: [238, 206],
  eyeStyle: "round",
  nose: "oval",
  noseY: 233,
  mouthY: 248,
  browY: 176,
  cheekY: 238,
  cheekDX: 68,
  cheekColor: "#FFA3B5",
  whiskers: "none",
  pawColor: BEAR.fur,
  chin: [200, 274],
  crest: [200, 124],
  earTips: [
    [136, 130],
    [264, 130],
  ],
  tailTip: [276, 322],
  headTop: 144,
  neckY: 268,
  hatScale: 1,
  bodyPath: BEAR_BODY_D,
};

const BEAR_ART: SpeciesArt = {
  face: BEAR_FACE,
  Body: BearBody,
  Head: BearHead,
  Tail: BearTail,
  Egg: BearEgg,
};

/* ───────────────────────── 7 · RUBAH FENNEC BINTANG ───────────────────────── */

const FENNEC = {
  sand: "#F6C98A",
  sandDark: "#E2A765",
  cream: "#FFF4DC",
  pink: "#FFC6D0",
  tip: "#C98F55",
  paw: "#E8B070",
} as const;

const FENNEC_BODY_D =
  "M140 298 C140 252 168 234 200 234 C232 234 260 252 260 298 C260 334 236 350 200 350 C164 350 140 334 140 298Z";

function FennecBody() {
  return (
    <g>
      <path d={FENNEC_BODY_D} fill={FENNEC.sand} />
      <path d="M174 242 Q200 262 226 242 Q240 290 216 334 Q200 346 184 334 Q160 290 174 242Z" fill={FENNEC.cream} />
      <path d="M260 290 C260 270 252 254 238 246 C246 268 244 294 236 316 C252 312 260 304 260 290Z" fill={FENNEC.sandDark} opacity={0.6} />
      <Hl d="M152 270 Q154 256 168 250" w={3.2} o={0.6} />
      <path d={FENNEC_BODY_D} fill="none" {...O} />
      <Feet fill={FENNEC.paw} />
    </g>
  );
}

function FennecEarShape() {
  return (
    <g>
      <path d="M122 176 C100 130 92 84 104 50 C146 70 182 112 188 150Z" fill={FENNEC.sand} {...O} />
      <path d="M134 160 C118 124 114 92 120 72 C146 90 170 120 176 148Z" fill={FENNEC.pink} />
      <path d="M120 72 C146 90 170 120 176 148" fill="none" stroke={FENNEC.cream} strokeWidth={5.4} strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M104 50 C98 58 96 66 96 74 C102 66 108 60 112 56Z" fill={FENNEC.tip} />
      <Hl d="M108 100 Q104 82 110 66" w={3.2} o={0.6} />
    </g>
  );
}

function FennecHead({ mood }: { mood: PetMood }) {
  const head =
    "M118 198 C122 156 154 132 200 132 C246 132 278 156 282 198 L292 224 L264 236 C250 262 226 276 200 278 C174 276 150 262 136 236 L108 224Z";
  return (
    <g>
      <EarWrap side="l" mood={mood} ox={0.85} oy={0.95}>
        <FennecEarShape />
      </EarWrap>
      <EarWrap side="r" mood={mood} ox={0.15} oy={0.95}>
        <g transform="translate(400 0) scale(-1 1)">
          <FennecEarShape />
        </g>
      </EarWrap>
      <path d={head} fill={FENNEC.sand} />
      <path d="M124 210 Q146 204 168 224 Q184 238 200 238 Q216 238 232 224 Q254 204 276 210 L286 224 L264 236 C250 262 226 276 200 278 C174 276 150 262 136 236 L114 224Z" fill={FENNEC.cream} />
      <path d="M182 138 Q200 150 218 138 Q212 158 200 168 Q188 158 182 138Z" fill={FENNEC.sandDark} opacity={0.55} />
      <Hl d="M142 160 Q160 144 186 140" w={3.4} o={0.5} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function FennecTail({ mood }: { mood: PetMood }) {
  const d =
    "M244 302 C284 300 330 300 344 258 C354 224 336 194 312 182 C314 214 308 246 286 276 C272 296 260 322 246 338Z";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill={FENNEC.sand} />
      <path d="M312 182 C336 194 352 214 348 238 C334 232 320 230 308 234 C312 216 314 198 312 182Z" fill={FENNEC.cream} />
      <path d="M286 276 C272 296 260 322 246 338 C268 328 288 304 298 270 C305 252 307 234 307 218 C307 248 298 264 286 276Z" fill={FENNEC.sandDark} opacity={0.6} />
      <path d={d} fill="none" {...O} />
      <Hl d="M268 306 Q304 304 332 280" w={3.4} o={0.55} />
    </TailWrap>
  );
}

function FennecEarEgg() {
  return (
    <g>
      <path d="M148 232 C138 196 140 164 152 142 C170 166 178 202 176 228Z" fill={FENNEC.sand} {...O} />
      <path d="M155 222 C148 198 150 176 154 160 C164 178 169 202 168 218Z" fill={FENNEC.pink} />
    </g>
  );
}

function FennecEgg() {
  return (
    <g>
      <FennecEarEgg />
      <g transform="translate(400 0) scale(-1 1)">
        <FennecEarEgg />
      </g>
      <path d={PandaEggD} fill={FENNEC.sand} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={FENNEC.sandDark} opacity={0.6} />
      <path d="M142 316 Q200 346 258 316 C256 336 236 358 200 358 C164 358 144 336 142 316Z" fill={FENNEC.cream} />
      <g fill={C.honeySoft} stroke={FENNEC.sandDark} strokeWidth={1.4} strokeLinejoin="round">
        <polygon points={starPoints(176, 258, 9, 4)} />
        <polygon points={starPoints(228, 246, 8, 3.6)} />
        <polygon points={starPoints(204, 288, 10, 4.4)} />
        <polygon points={starPoints(160, 296, 7, 3.2)} />
        <polygon points={starPoints(244, 286, 7, 3.2)} />
      </g>
      <Hl d="M158 262 Q160 240 176 228" w={4} o={0.7} />
      <path d={PandaEggD} fill="none" {...O} />
    </g>
  );
}

const FENNEC_FACE: FaceSpec = {
  eyeL: [164, 206],
  eyeR: [236, 206],
  eyeStyle: "star",
  nose: "snout",
  noseY: 237,
  mouthY: 252,
  browY: 176,
  cheekY: 240,
  cheekDX: 62,
  cheekColor: "#FFB5A8",
  whiskers: "fine",
  pawColor: FENNEC.paw,
  chin: [200, 278],
  crest: [200, 134],
  earTips: [
    [104, 52],
    [296, 52],
  ],
  tailTip: [312, 184],
  headTop: 140,
  neckY: 268,
  hatScale: 0.95,
  bodyPath: FENNEC_BODY_D,
};

const FENNEC_ART: SpeciesArt = {
  face: FENNEC_FACE,
  Body: FennecBody,
  Head: FennecHead,
  Tail: FennecTail,
  Egg: FennecEgg,
};

/* ───────────────────────── 8 · PONI AWAN PELANGI ───────────────────────── */

const UNI = {
  cloud: "#FFFDF7",
  shade: "#E3EBFA",
  shadeDeep: "#CCD9F2",
  pink: "#FFB5D6",
  blue: "#9ED8FF",
  purple: "#CBA6FF",
  rosy: "#FFA8C8",
} as const;

/** Siluet awan: sebuah elips dengan gelembung busur di sepanjang tepinya. */
function UniScallop(cx: number, cy: number, rx: number, ry: number, n: number, r: number): string {
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
  const p = (q: Pt): string => `${f2(q[0])} ${f2(q[1])}`;
  return `M${p(pts[0])} ${pts.map((_, i) => `A${r} ${r} 0 0 1 ${p(pts[(i + 1) % n])}`).join(" ")}Z`;
}

const UNI_BODY_D = UniScallop(200, 294, 62, 48, 12, 18);
const UNI_HEAD_D = UniScallop(200, 204, 80, 66, 14, 24);

function UniBody() {
  return (
    <g>
      <path d={UNI_BODY_D} fill={UNI.cloud} />
      <path d="M262 290 C262 270 254 256 240 250 C248 270 246 296 238 318 C254 316 262 306 262 290Z" fill={UNI.shade} />
      <ellipse cx={200} cy={314} rx={34} ry={26} fill={C.cream} />
      <Hl d="M150 276 Q154 262 168 256" w={3.4} o={0.9} />
      <path d={UNI_BODY_D} fill="none" {...O} />
      <Feet fill={UNI.cloud} />
      <g fill={UNI.pink}>
        <ellipse cx={170} cy={351} rx={9} ry={3.6} />
        <ellipse cx={230} cy={351} rx={9} ry={3.6} />
      </g>
    </g>
  );
}

function UniManeSide() {
  return (
    <g>
      <path d="M154 142 C100 138 76 196 92 254 C104 272 132 268 136 250 C126 222 138 190 164 172Z" fill={UNI.pink} {...O} />
      <path d="M160 152 C118 152 100 196 112 242 C120 252 130 248 130 240 C124 216 138 190 164 176Z" fill={UNI.blue} {...O25} />
      <path d="M164 162 C134 168 120 200 128 230 C134 232 138 228 136 222 C134 204 146 188 166 180Z" fill={UNI.purple} {...O2} />
    </g>
  );
}

function UniEarShape() {
  return (
    <g>
      <path d="M142 170 Q128 134 150 116 Q174 134 178 160Z" fill={UNI.cloud} {...O} />
      <path d="M149 158 Q142 138 152 128 Q164 138 167 152Z" fill={UNI.pink} />
    </g>
  );
}

function UniHead({ mood }: { mood: PetMood }) {
  return (
    <g>
      <motion.g style={fb(0.8, 0.05)} animate={{ rotate: [-2, 2, -2] }} transition={loop(3.4)}>
        <UniManeSide />
      </motion.g>
      <motion.g style={fb(0.2, 0.05)} animate={{ rotate: [2, -2, 2] }} transition={loop(3.4, { delay: 0.3 })}>
        <g transform="translate(400 0) scale(-1 1)">
          <UniManeSide />
        </g>
      </motion.g>
      <EarWrap side="l" mood={mood} ox={0.7} oy={0.9}>
        <UniEarShape />
      </EarWrap>
      <EarWrap side="r" mood={mood} ox={0.3} oy={0.9}>
        <g transform="translate(400 0) scale(-1 1)">
          <UniEarShape />
        </g>
      </EarWrap>
      <path d={UNI_HEAD_D} fill={UNI.cloud} />
      <path d="M280 204 C280 240 246 268 200 270 C240 258 264 236 270 196 C278 192 280 198 280 204Z" fill={UNI.shade} opacity={0.9} />
      <Hl d="M146 168 Q164 148 192 144" w={3.6} o={0.9} />
      <path d={UNI_HEAD_D} fill="none" {...O} />
      <path d="M190 142 C172 142 160 158 164 178 C176 170 184 158 192 148Z" fill={UNI.pink} {...O25} />
      <path d="M186 146 C174 148 168 160 170 172 C178 166 184 158 188 152Z" fill={UNI.blue} {...O2} />
      <path d="M184 150 C177 153 174 160 175 166 C180 162 183 158 185 155Z" fill={UNI.purple} />
    </g>
  );
}

function UniHorn() {
  return (
    <g transform="rotate(8 204 150)" pointerEvents="none">
      <ellipse cx={203} cy={150} rx={15} ry={6.4} fill={UNI.cloud} {...O25} />
      <path d="M190 150 Q196 112 207 90 Q216 116 216 150Z" fill={C.honey} {...O25} />
      <path d="M192 142 L214 134 M193 130 L212 122 M197 118 L209 110" fill="none" stroke={C.honeyDark} strokeWidth={3} strokeLinecap="round" />
      <Hl d="M197 144 Q201 120 206 100" w={3} o={0.9} />
      <Sparkle x={222} y={98} size={7} color={C.honeySoft} delay={0.4} />
    </g>
  );
}

function UniTail({ mood }: { mood: PetMood }) {
  const puff = UniScallop(284, 322, 26, 22, 9, 13);
  return (
    <TailWrap mood={mood} ox={0.1} oy={0.9}>
      <Duo d="M298 306 C318 296 324 280 316 262" inner={UNI.purple} ow={11} iw={7} />
      <Duo d="M292 308 C310 300 315 288 308 274" inner={UNI.blue} ow={11} iw={7} />
      <Duo d="M286 310 C300 304 304 296 298 286" inner={UNI.pink} ow={11} iw={7} />
      <path d={puff} fill={UNI.cloud} {...O} />
      <Hl d="M270 316 Q274 308 284 306" w={3} o={0.9} />
    </TailWrap>
  );
}

function UniEarEgg() {
  return (
    <g>
      <circle cx={158} cy={226} r={14} fill={UNI.cloud} {...O} />
      <circle cx={158} cy={228} r={6.4} fill={UNI.pink} />
    </g>
  );
}

function UniEgg() {
  return (
    <g>
      <UniEarEgg />
      <g transform="translate(400 0) scale(-1 1)">
        <UniEarEgg />
      </g>
      <path d={PandaEggD} fill={UNI.cloud} />
      <path d="M262 296 C262 334 236 358 200 358 C176 358 158 346 148 330 C200 346 244 332 262 296Z" fill={UNI.shade} />
      <path d="M148 286 Q200 308 252 286" fill="none" stroke={UNI.pink} strokeWidth={9} strokeLinecap="round" />
      <path d="M144 299 Q200 321 256 299" fill="none" stroke={UNI.blue} strokeWidth={9} strokeLinecap="round" />
      <path d="M146 312 Q200 334 254 312" fill="none" stroke={UNI.purple} strokeWidth={9} strokeLinecap="round" />
      <Hl d="M158 262 Q160 240 176 228" w={4} o={0.95} />
      <path d={PandaEggD} fill="none" {...O} />
      <path d="M191 222 L201 188 L211 222Z" fill={C.honey} {...O25} />
      <path d="M194 212 L208 207 M196 201 L206 197" fill="none" stroke={C.honeyDark} strokeWidth={2.4} strokeLinecap="round" />
      <g fill={UNI.cloud} {...O25}>
        <circle cx={156} cy={346} r={12} />
        <circle cx={200} cy={347} r={11} />
        <circle cx={244} cy={346} r={12} />
      </g>
    </g>
  );
}

const UNICORN_FACE: FaceSpec = {
  eyeL: [166, 208],
  eyeR: [234, 208],
  eyeStyle: "round",
  nose: "button",
  noseY: 235,
  mouthY: 249,
  browY: 178,
  cheekY: 237,
  cheekDX: 62,
  cheekColor: UNI.rosy,
  whiskers: "none",
  pawColor: UNI.cloud,
  chin: [200, 272],
  crest: [200, 138],
  earTips: [
    [150, 118],
    [250, 118],
  ],
  tailTip: [316, 264],
  headTop: 142,
  neckY: 268,
  hatScale: 1,
  bodyPath: UNI_BODY_D,
};

const UNICORN_ART: SpeciesArt = {
  face: UNICORN_FACE,
  Body: UniBody,
  Head: UniHead,
  Tail: UniTail,
  Egg: UniEgg,
  FrontOfHat: UniHorn,
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
          <g transform="translate(-15 -46)">
            <Diamond s={7} />
          </g>
          <g transform="translate(15 -46)">
            <Diamond s={7} />
          </g>
          <g transform="translate(0 -2)">
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
        <g transform={`translate(${-half - 18} 26) rotate(-22)`}>
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
            <g key={x} transform={`translate(${x} 0)`}>
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
          <g transform={`translate(${half + 8} ${r + 70})`}>
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
          <g transform="translate(0 43)">
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
          <g transform="translate(0 32)">
            <circle r={9} fill={C.honey} {...O3} />
            <g transform="translate(0 0.6)">
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

const OP_OUTFIT_BOX = "72 214 256 160";

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
          <g transform="translate(167 304)">
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
          <g transform="translate(200 318)">
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
          <g transform="translate(200 312)">
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
          <g transform="translate(200 294)">
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
        <rect x={104} y={356} width={34} height={14} rx={3} fill={C.cardboardLight} transform="rotate(-4 121 363)" />
        <rect x={256} y={358} width={36} height={14} rx={3} fill={C.peachSoft} transform="rotate(5 274 365)" />
        <rect x={160} y={364} width={30} height={10} rx={3} fill={C.cardboardDark} transform="rotate(2 175 369)" />
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
    <g transform="rotate(-8)">
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
    <g transform="rotate(14)">
      <Duo d="M0 0 V-92" inner={C.honey} ow={9.5} iw={5.6} />
      <ellipse cx={0} cy={-30} rx={7.4} ry={3.6} fill={C.honeySoft} {...O2} />
      <ellipse cx={0} cy={-60} rx={7.4} ry={3.6} fill={C.honeySoft} {...O2} />
      <path d="M-13 -92 L-18 -108 L-7 -99 L0 -114 L7 -99 L18 -108 L13 -92Z" fill={C.honey} {...O25} />
      <g transform="translate(0 -117)">
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
          <g key={i} transform={`translate(${x} ${y})`}>
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
      <g transform={`translate(${x} ${y}) scale(${s})`}>
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
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        style={fb()}
        animate={{ y: [0, -12, 0], x: [0, 5, 0], rotate: [rot - 18, rot + 18, rot - 18] }}
        transition={loop(3.4 + (d % 5) * 0.4, { delay: d * 0.2 })}
      >
        <g transform={`scale(${s})`}>
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
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        style={fb()}
        animate={{ y: [0, -52], opacity: [0, 1, 1, 0], scale: [0.85, 1.1] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeOut", delay: d }}
      >
        <circle r={r} fill={C.skySoft} fillOpacity={0.22} stroke={AB.bubble} strokeWidth={2.4} />
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
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        style={fb()}
        animate={{ y: [0, -56], opacity: [0, 1, 1, 0], scale: [0.7, 1.15, 0.9], rotate: [-10, 10, -10] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeOut", delay: d }}
      >
        <g transform={`scale(${s})`}>
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
      <ellipse cx={200} cy={376} rx={128} ry={12} fill="none" stroke={C.cream} strokeWidth={3} strokeDasharray="7 8" strokeLinecap="round" opacity={0.7} />

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
      <g transform="translate(52 88)">
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
      <g transform={`translate(${x} ${y})`}>
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
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill={C.cream} stroke={INK} strokeWidth={1.6}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={0} cy={-5.4} rx={3.2} ry={4.6} transform={`rotate(${a})`} />
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
    <g transform={`translate(${x} ${y}) scale(${s})`}>
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
      <g transform="translate(372 242)">
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
      <g key={i} transform={lean ? `rotate(-9 ${cx + bw} ${y})` : undefined}>
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
      <ellipse cx={200} cy={380} rx={140} ry={15} fill="none" stroke={C.cream} strokeWidth={3} strokeDasharray="6 8" strokeLinecap="round" opacity={0.7} />
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
      <g transform="translate(378 322)">
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
          <path key={col} d={`M-40 342 A240 240 0 0 1 440 342`} stroke={col} strokeWidth={12} transform={`translate(0 ${i * 12 - 4}) scale(1 1)`} style={{ opacity: 1 }} />
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
      <g transform="translate(236 292)">
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
    <g transform={`translate(${at[0]} ${at[1] + 4})`} pointerEvents="none">
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
 *  LAYER KOSMETIK
 * ═════════════════════════════════════════════════════════════ */

function HeadLayer({ id, face, egg }: { id: string; face: FaceSpec; egg: boolean }) {
  const y = egg ? 224 : face.headTop;
  const k = egg ? 0.74 : face.hatScale;
  return (
    <g transform={`translate(200 ${y}) scale(${k})`}>
      <HeadItem id={id} />
    </g>
  );
}

function FaceLayer({ id, face }: { id: string; face: FaceSpec }) {
  const half = (face.eyeR[0] - face.eyeL[0]) / 2;
  const mid = (face.eyeR[0] + face.eyeL[0]) / 2;
  const y = (face.eyeL[1] + face.eyeR[1]) / 2;
  return (
    <g transform={`translate(${mid} ${y})`}>
      <FaceItem id={id} half={half} />
    </g>
  );
}

function NeckLayer({ id, face }: { id: string; face: FaceSpec }) {
  return (
    <g transform={`translate(200 ${face.neckY})`}>
      <NeckItem id={id} />
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
  uid,
}: {
  art: SpeciesArt;
  stage: GrowthStage;
  mood: PetMood;
  outfitId: string | undefined;
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
      {outfitId && <OutfitBack id={outfitId} />}
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
            <OutfitClipped id={outfitId} />
          </g>
          <path d={art.face.bodyPath} fill="none" {...O} />
          <OutfitOverlay id={outfitId} />
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
      <g transform="translate(200 288)">
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

export function CustomizablePetAvatar({
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
  const headId = pick("head");
  const outfitId = isEgg ? undefined : pick("outfit");
  const faceId = isEgg ? undefined : pick("face");
  const neckId = isEgg ? undefined : pick("neck");
  const auraId = pick("aura");
  const bgId = pick("background");
  const propId = pick("prop");
  const propSpec: PropSpec | undefined = propId ? PROPS[propId] : undefined;
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
    : `${name}, ${info.name}, fase ${stage} ${stageInfo.name}, suasana ${effMood.replace("_", " ")}`;

  const lower = (
    <PetMotion mood={effMood}>
      <g transform={`translate(0 ${-lift})`}>
        <PetLower art={art} stage={stage} mood={effMood} outfitId={outfitId} uid={uid} />
      </g>
    </PetMotion>
  );

  const upper = (
    <PetMotion mood={effMood}>
      <g transform={`translate(0 ${-lift})`}>
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
            <g transform="translate(250 318)">
              <HeldItem />
            </g>
            <Paw cx={250} cy={323} rx={14} ry={12} fill={art.face.pawColor} />
          </>
        )}
      </g>
    </PetMotion>
  );

  const placeCharacter = (children: ReactNode) => (
    <g transform={`translate(200 ${GROUND}) scale(${scale}) translate(-200 ${-GROUND})`}>{children}</g>
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
                    <BackgroundItem id={bgId} uid={`${uid}b`} />
                  </g>
                  <rect x={1.5} y={1.5} width={VB_W - 3} height={VB_H - 3} rx={27} fill="none" {...O} />
                </>
              )}
              {auraId && <AuraItem id={auraId} cy={auraCy} uid={`${uid}a`} />}
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
}

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
      return { box: HFN_BOX[id] ?? "-90 -120 180 200", node: <HeadItem id={id} /> };
    case "face":
      return { box: HFN_BOX[id] ?? "-70 -40 140 80", node: <FaceItem id={id} half={FACE_PREVIEW_HALF} /> };
    case "neck":
      return { box: HFN_BOX[id] ?? "-70 -10 140 80", node: <NeckItem id={id} /> };
    case "outfit":
      return { box: OP_OUTFIT_BOX, node: <OutfitPreviewArt id={id} /> };
    case "prop": {
      const spec = PROPS[id];
      const box = OP_PROP_BOX[id] ?? "0 0 400 410";
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
            <AuraItem id={id} cy={205} uid={`${uid}a`} />
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
              <BackgroundItem id={id} uid={`${uid}b`} />
            </g>
            <rect x={3} y={3} width={VB_W - 6} height={VB_H - 6} rx={26} fill="none" {...O} strokeWidth={6} />
          </g>
        ),
      };
    default:
      return { box: "0 0 100 100", node: <g /> };
  }
}

export function AccessoryPreviewIcon({ accessoryId, isMysteryLocked = false, className }: AccessoryPreviewIconProps) {
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
}

/**
 * Katalog Gelar & Latar Badge (Versi 5.3).
 * - Gelar = tulisan pengenal/pujian di samping nama pet (mis. "Ksatria Celengan").
 * - Latar = tampilan belakang badge gelar (warna, pola, efek kilau/aurora).
 * Cara mendapatkan: awal (gratis), Butik (Poin), Misi (klaim medali), Peta Jalur (Peti Harta tiap 7 hari).
 * Sepenuhnya data statis tanpa Math.random.
 */
import { MEDAL_CATALOG, type MedalTier } from "@/lib/quest-engine";

export type Rarity = "umum" | "langka" | "epik" | "mitos";

export const RARITY_LABEL: Record<Rarity, string> = {
  umum: "Umum",
  langka: "Langka",
  epik: "Epik",
  mitos: "Mitos",
};

/** Penanda rarity pada kartu (warna chip kecil, bukan latar kartu). */
export const RARITY_CHIP: Record<Rarity, string> = {
  umum: "bg-[#F1ECE2] border-[#D4C9B4] text-[#6B5F54]",
  langka: "bg-[#E8F6FF] border-[#9AD2FF] text-[#0B5E94]",
  epik: "bg-[#F4E9FF] border-[#CDA2F5] text-[#6B2FA3]",
  mitos: "bg-[#FFF3C4] border-[#F2C84B] text-[#7A4A00]",
};

export type BadgeSource =
  | { kind: "start" }
  | { kind: "shop"; price: number }
  | { kind: "medal"; medalId: string }
  | { kind: "medal_tier"; tier: MedalTier }
  | { kind: "journey"; day: number }
  /** Gelar khusus yang dibuka lewat perilaku tertentu (bukan dibeli). */
  | { kind: "special"; how: string };

export interface TitleDef {
  id: string;
  name: string;
  rarity: Rarity;
  source: BadgeSource;
}

export type BadgeFx = "sheen" | "twinkle" | "aurora" | "holo" | "ember" | "cosmos" | "radiant";

export interface BadgeBgDef {
  id: string;
  name: string;
  rarity: Rarity;
  source: BadgeSource;
  /** Gradien dasar (CSS `background`). */
  gradient: string;
  /** Lapisan pola opsional (ditumpuk di atas gradien). */
  pattern?: string;
  border: string;
  text: string;
  fx?: BadgeFx;
}

/* ───────────────────────── Gelar ───────────────────────── */

const SHOP_TITLES: [string, string, Rarity, number][] = [
  ["rajin_menabung", "Si Rajin Menabung", "umum", 200],
  ["pencatat_ceria", "Pencatat Ceria", "umum", 200],
  ["hemat_pangkal_kaya", "Hemat Pangkal Kaya", "umum", 250],
  ["bintang_kecil", "Bintang Kecil", "umum", 250],
  ["jagoan_jajan_bijak", "Jagoan Jajan Bijak", "umum", 300],
  ["sahabat_celengan", "Sahabat Celengan", "umum", 300],
  ["penjaga_dompet", "Penjaga Dompet", "langka", 700],
  ["ksatria_celengan", "Ksatria Celengan", "langka", 800],
  ["peramu_anggaran", "Peramu Anggaran", "langka", 900],
  ["rubah_hemat", "Rubah Hemat", "langka", 900],
  ["kapten_kas_kecil", "Kapten Kas Kecil", "langka", 1000],
  ["pemburu_diskon", "Pemburu Diskon", "langka", 1000],
  ["pangeran_tabungan", "Pangeran Tabungan", "epik", 2200],
  ["putri_hemat", "Putri Hemat Jelita", "epik", 2200],
  ["naga_penjaga_emas", "Naga Penjaga Emas", "epik", 2600],
  ["maestro_anggaran", "Maestro Anggaran", "epik", 2800],
  ["penyihir_koin", "Penyihir Koin", "epik", 3000],
  ["dewa_dompet", "Dewa Dompet Abadi", "mitos", 6000],
  ["penguasa_aurora", "Penguasa Aurora Koin", "mitos", 7000],
  ["phoenix_keuangan", "Phoenix Keuangan", "mitos", 8000],
  ["legenda_langit", "Legenda Langit Rupiah", "mitos", 9000],
];

const JOURNEY_TITLES: [string, string, Rarity, number][] = [
  ["pejalan_pagi", "Pejalan Pagi", "umum", 7],
  ["penjelajah_sabana", "Penjelajah Sabana", "umum", 21],
  ["pendaki_berani", "Pendaki Berani", "langka", 35],
  ["pelaut_tangguh", "Pelaut Tangguh", "langka", 49],
  ["penjaga_hutan", "Penjaga Hutan Ajaib", "epik", 63],
  ["pemburu_bintang", "Pemburu Bintang", "mitos", 77],
];

const TIER_RARITY: Record<MedalTier, Rarity> = { bronze: "umum", silver: "langka", gold: "epik", diamond: "mitos" };

/** Lencana pengendalian diri (Versi 5.6): membatalkan pembelian impulsif setelah masa tunggu 48 jam. */
export const SELF_CONTROL_TITLE_ID = "t_penahan_diri";

export const MEDAL_TITLE_ID = (medalId: string): string => `m:${medalId}`;

export const TITLES: TitleDef[] = [
  { id: "t_penabung_cerdas", name: "Penabung Cerdas", rarity: "umum", source: { kind: "start" } },
  { id: "t_pemula_ceria", name: "Pemula Ceria", rarity: "umum", source: { kind: "start" } },
  ...SHOP_TITLES.map(([k, name, rarity, price]): TitleDef => ({ id: `t_${k}`, name, rarity, source: { kind: "shop", price } })),
  ...JOURNEY_TITLES.map(([k, name, rarity, day]): TitleDef => ({ id: `t_${k}`, name, rarity, source: { kind: "journey", day } })),
  { id: SELF_CONTROL_TITLE_ID, name: "Penahan Diri", rarity: "langka", source: { kind: "special", how: "Batalkan keinginan belanja setelah masa tunggu 48 jam" } },
  ...MEDAL_CATALOG.map(
    (m): TitleDef => ({ id: MEDAL_TITLE_ID(m.id), name: m.title, rarity: TIER_RARITY[m.tier], source: { kind: "medal", medalId: m.id } })
  ),
];

export const TITLE_BY_ID: Record<string, TitleDef> = Object.fromEntries(TITLES.map((t) => [t.id, t]));

export const DEFAULT_TITLE_ID = "t_penabung_cerdas";

/* ───────────────────────── Latar ───────────────────────── */

const g = (a: string, b: string, c?: string, deg = 135): string =>
  c ? `linear-gradient(${deg}deg, ${a} 0%, ${b} 55%, ${c} 100%)` : `linear-gradient(${deg}deg, ${a} 0%, ${b} 100%)`;

const DOTS = (color: string, size = 10): string => `radial-gradient(circle, ${color} 1.2px, transparent 1.6px) 0 0 / ${size}px ${size}px`;
const STRIPES = (color: string): string => `repeating-linear-gradient(45deg, ${color} 0 6px, transparent 6px 12px)`;

export const BADGE_BGS: BadgeBgDef[] = [
  // Awal
  { id: "bg_polos", name: "Lembayung Polos", rarity: "umum", source: { kind: "start" }, gradient: g("#F8F0FF", "#F1E3FF"), border: "#E2C6FF", text: "#6B2FA3" },

  // Butik: umum
  { id: "bg_krem", name: "Krem Hangat", rarity: "umum", source: { kind: "shop", price: 200 }, gradient: g("#FFFBEB", "#FFF1C9"), border: "#FDE08D", text: "#6B4B00" },
  { id: "bg_mint", name: "Mint Segar", rarity: "umum", source: { kind: "shop", price: 250 }, gradient: g("#EFFBE6", "#D9F6C1"), border: "#B6E58E", text: "#2E6F00" },
  { id: "bg_langit", name: "Langit Pagi", rarity: "umum", source: { kind: "shop", price: 300 }, gradient: g("#EAF7FF", "#CDEBFF"), border: "#9AD2FF", text: "#0B5E94" },
  { id: "bg_peach", name: "Peach Lembut", rarity: "umum", source: { kind: "shop", price: 300 }, gradient: g("#FFF2EA", "#FFD9C4"), border: "#FFB894", text: "#8A3A12" },
  { id: "bg_lavender", name: "Lavender Tipis", rarity: "umum", source: { kind: "shop", price: 350 }, gradient: g("#F4EEFF", "#E2D4FF"), border: "#C9B3F5", text: "#52309A" },

  // Butik: langka
  { id: "bg_pelangi", name: "Pelangi Pastel", rarity: "langka", source: { kind: "shop", price: 800 }, gradient: "linear-gradient(110deg, #FFD6D6, #FFE9B8 22%, #E4F7BF 44%, #C6EEFF 66%, #E3CCFF)", border: "#F0B8E0", text: "#5A2A6B" },
  { id: "bg_malam", name: "Bintang Malam", rarity: "langka", source: { kind: "shop", price: 900 }, gradient: g("#1F2A5C", "#3B2F7A"), pattern: DOTS("rgba(255,255,255,.75)", 14), border: "#6C63C9", text: "#FFFFFF", fx: "twinkle" },
  { id: "bg_senja", name: "Senja Jingga", rarity: "langka", source: { kind: "shop", price: 1000 }, gradient: g("#FF9E7A", "#FFC76B", "#FFE7A3", 100), border: "#E8793F", text: "#5C2300" },
  { id: "bg_laut", name: "Laut Dalam", rarity: "langka", source: { kind: "shop", price: 1000 }, gradient: g("#0E6BA8", "#38B6FF", "#9BE3FF", 160), border: "#0A4F7D", text: "#FFFFFF" },
  { id: "bg_bunga", name: "Kebun Bunga", rarity: "langka", source: { kind: "shop", price: 1200 }, gradient: g("#FFE3F0", "#FFD0E6"), pattern: DOTS("rgba(255,107,170,.55)", 12), border: "#F58DBA", text: "#7A1F4B" },

  // Butik: epik
  { id: "bg_emas", name: "Emas Berkilau", rarity: "epik", source: { kind: "shop", price: 2600 }, gradient: g("#FFD84A", "#FFB300", "#FFE27A", 120), border: "#B77C00", text: "#4A2F00", fx: "sheen" },
  { id: "bg_kristal", name: "Es Kristal", rarity: "epik", source: { kind: "shop", price: 2800 }, gradient: g("#DFF6FF", "#A9E4FF", "#F3FCFF", 150), pattern: STRIPES("rgba(255,255,255,.35)"), border: "#5BBCE8", text: "#0A4A6B", fx: "twinkle" },
  { id: "bg_galaksi", name: "Galaksi Ungu", rarity: "epik", source: { kind: "shop", price: 3200 }, gradient: g("#2B1260", "#6A2FB8", "#C45CE8", 140), pattern: DOTS("rgba(255,255,255,.7)", 16), border: "#8E4BD8", text: "#FFFFFF", fx: "cosmos" },
  { id: "bg_api", name: "Api Semangat", rarity: "epik", source: { kind: "shop", price: 3200 }, gradient: g("#FF5B3A", "#FF9A2E", "#FFD23F", 90), border: "#B83A12", text: "#3A1200", fx: "ember" },
  { id: "bg_zamrud", name: "Zamrud Hutan", rarity: "epik", source: { kind: "shop", price: 3500 }, gradient: g("#0F8A5F", "#2FD08A", "#A7F3C8", 140), border: "#0A5C40", text: "#FFFFFF", fx: "sheen" },

  // Butik: mitos
  { id: "bg_aurora", name: "Aurora Mitos", rarity: "mitos", source: { kind: "shop", price: 8000 }, gradient: "linear-gradient(120deg, #5CF2C5, #4BA8FF, #B45CFF, #FF6BD6, #5CF2C5)", border: "#FFFFFF", text: "#12123A", fx: "aurora" },
  { id: "bg_holo", name: "Holo Pelangi", rarity: "mitos", source: { kind: "shop", price: 9000 }, gradient: "linear-gradient(115deg, #FFB3E6, #B3D9FF, #C8FFD9, #FFF2B3, #FFB3E6)", border: "#FFFFFF", text: "#3A1250", fx: "holo" },
  { id: "bg_naga", name: "Naga Emas", rarity: "mitos", source: { kind: "shop", price: 10000 }, gradient: g("#8F0F1F", "#E0262F", "#FFB300", 100), pattern: STRIPES("rgba(255,215,0,.18)"), border: "#FFD700", text: "#FFF3B0", fx: "ember" },
  { id: "bg_kosmik", name: "Kosmik Abadi", rarity: "mitos", source: { kind: "shop", price: 11000 }, gradient: g("#05051F", "#1B1B6B", "#4B1B8F", 150), pattern: DOTS("rgba(255,255,255,.9)", 12), border: "#9B8CFF", text: "#FFFFFF", fx: "cosmos" },
  { id: "bg_mahkota", name: "Mahkota Cahaya", rarity: "mitos", source: { kind: "shop", price: 12000 }, gradient: "radial-gradient(circle at 50% 0%, #FFFFFF 0%, #FFF0A6 35%, #FFC933 75%, #FF9E1F 100%)", border: "#FFFFFF", text: "#5A3A00", fx: "radiant" },

  // Peta Jalur (Peti Harta)
  { id: "bg_padang", name: "Padang Rumput", rarity: "umum", source: { kind: "journey", day: 14 }, gradient: g("#BDF29A", "#7ED957"), pattern: STRIPES("rgba(255,255,255,.2)"), border: "#46A302", text: "#173300" },
  { id: "bg_embun", name: "Hutan Embun", rarity: "langka", source: { kind: "journey", day: 28 }, gradient: g("#2E8B57", "#6FCF97", "#CFF5DA", 160), border: "#1B5E3A", text: "#FFFFFF", fx: "sheen" },
  { id: "bg_gurun", name: "Gurun Senja", rarity: "langka", source: { kind: "journey", day: 42 }, gradient: g("#F4B860", "#E07B53", "#8E4162", 160), border: "#7A3A18", text: "#FFFFFF" },
  { id: "bg_karang", name: "Pantai Karang", rarity: "epik", source: { kind: "journey", day: 56 }, gradient: g("#FFE3C2", "#6FD6E8", "#1E9BC9", 170), border: "#0E6E96", text: "#05384F", fx: "sheen" },
  { id: "bg_salju", name: "Puncak Salju", rarity: "epik", source: { kind: "journey", day: 70 }, gradient: g("#FFFFFF", "#CDE9FF", "#9CCBF5", 170), pattern: DOTS("rgba(255,255,255,.95)", 11), border: "#6FA8DC", text: "#12456E", fx: "twinkle" },
  { id: "bg_lembah", name: "Lembah Pelangi", rarity: "mitos", source: { kind: "journey", day: 84 }, gradient: "linear-gradient(120deg, #FF9AA2, #FFB347, #FFF275, #8BEA9A, #6FC3FF, #C79BFF, #FF9AA2)", border: "#FFFFFF", text: "#3A1250", fx: "aurora" },

  // Misi (klaim medali, satu latar per tingkatan)
  { id: "bg_medali_perunggu", name: "Medali Perunggu", rarity: "umum", source: { kind: "medal_tier", tier: "bronze" }, gradient: g("#E9B98F", "#C98A58", "#F2CBA6"), border: "#8F5A2E", text: "#3F2410", fx: "sheen" },
  { id: "bg_medali_perak", name: "Medali Perak", rarity: "langka", source: { kind: "medal_tier", tier: "silver" }, gradient: g("#F1F5F9", "#B8C4D0", "#EEF2F6"), border: "#7F8FA0", text: "#2A3A45", fx: "sheen" },
  { id: "bg_medali_emas", name: "Medali Emas", rarity: "epik", source: { kind: "medal_tier", tier: "gold" }, gradient: g("#FFE27A", "#FFC200", "#FFEFA8"), border: "#B77C00", text: "#4A2F00", fx: "sheen" },
  { id: "bg_medali_berlian", name: "Medali Berlian", rarity: "mitos", source: { kind: "medal_tier", tier: "diamond" }, gradient: "linear-gradient(120deg, #BDF0FF, #FFFFFF, #C9B8FF, #BDF0FF)", border: "#7FD4F5", text: "#123A5C", fx: "holo" },
];

export const BADGE_BG_BY_ID: Record<string, BadgeBgDef> = Object.fromEntries(BADGE_BGS.map((b) => [b.id, b]));

export const DEFAULT_BG_ID = "bg_polos";

/* ───────────────────────── Aturan perolehan ───────────────────────── */

/** Awal yang dimiliki semua anak sejak mula. */
export const STARTER_TITLE_IDS: string[] = TITLES.filter((t) => t.source.kind === "start").map((t) => t.id);
export const STARTER_BG_IDS: string[] = BADGE_BGS.filter((b) => b.source.kind === "start").map((b) => b.id);

export interface BadgeUnlock {
  titleIds?: string[];
  bgIds?: string[];
}

/** Hadiah gelar/latar dari Peti Harta hari ke-`day` (kelipatan 7). */
export function journeyUnlockForDay(day: number): BadgeUnlock {
  const titleIds = JOURNEY_TITLES.filter(([, , , d]) => d === day).map(([k]) => `t_${k}`);
  const bgIds = BADGE_BGS.filter((b) => b.source.kind === "journey" && b.source.day === day).map((b) => b.id);
  return { titleIds, bgIds };
}

/** Hadiah gelar/latar dari klaim medali: gelar medali itu + latar tingkatan (sekali per tingkatan). */
export function medalUnlock(medalId: string, tier: MedalTier): BadgeUnlock {
  return {
    titleIds: [MEDAL_TITLE_ID(medalId)],
    bgIds: BADGE_BGS.filter((b) => b.source.kind === "medal_tier" && b.source.tier === tier).map((b) => b.id),
  };
}

export function titleName(id: string | undefined): string {
  return (id && TITLE_BY_ID[id]?.name) || TITLE_BY_ID[DEFAULT_TITLE_ID].name;
}

/** Deskripsi singkat cara mendapatkan. */
export function sourceLabel(src: BadgeSource): string {
  switch (src.kind) {
    case "start":
      return "Hadiah awal";
    case "shop":
      return `${src.price.toLocaleString("id-ID")} Poin di Butik`;
    case "medal":
      return "Klaim medali di Misi";
    case "medal_tier":
      return "Klaim medali tingkat ini di Misi";
    case "journey":
      return `Peti Harta Hari ke-${src.day}`;
    case "special":
      return src.how;
  }
}

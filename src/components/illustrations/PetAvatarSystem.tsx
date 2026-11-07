"use client";

/**
 * PetAvatarSystem — Multi-Species, 8-Stage Caste & 6-Slot Accessory Avatar Engine.
 * Gaya: Duolingo × Finch Cozy Pastel (outline hangat #3D352E, duotone berlapis).
 *
 * Contoh pakai:
 *   <CustomizablePetAvatar
 *     species="fox"
 *     stage={5}
 *     mood="proud"
 *     customName="Rubi"
 *     equippedAccessories={{ head: "head_top_hat", eyes: "eyes_monocle", vehicle: "vehicle_scooter" }}
 *     className="w-72"
 *   />
 *   <CustomizablePetAvatar species="cat" stage={8} isMysteryLocked />   // siluet rahasia
 *   <AccessoryPreviewIcon accessoryId="vehicle_retro_car" className="w-20" />
 *
 * Urutan layer (belakang → depan):
 *   aura kemakmuran → dekor latar → bayangan → alas/kendaraan (belakang) → ekor →
 *   badan + pakaian kasta → alas/kendaraan (depan) → leher → tangan + item →
 *   kepala + wajah → kacamata → topi → overlay mood → papan nama.
 *
 * Catatan teknis:
 * - Setiap `motion.g` yang berotasi/berskala memakai `transformBox: "fill-box"`.
 * - Semua animasi dihormati preferensi "reduce motion" lewat MotionConfig.
 * - Tidak ada Math.random → aman untuk SSR / hidrasi Next.js.
 */

import { useId, type ReactNode } from "react";
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

export type PetSpecies = "cat" | "capybara" | "fox" | "red_panda";
export type CasteStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type PetMood = "happy" | "proud" | "worried" | "shocked_boros";
export type AccessorySlot = "head" | "eyes" | "neck" | "hand" | "vehicle" | "decor";
export type AccessorySource = "shop" | "path_drop";

export interface AccessoryItem {
  id: string;
  name: string;
  slot: AccessorySlot;
  minStage: CasteStage;
  /** Harga dalam poin. Item `path_drop` tidak dijual (0). */
  pricePoints: number;
  source: AccessorySource;
  description: string;
}

export interface CustomizablePetAvatarProps {
  species: PetSpecies;
  stage: CasteStage;
  mood?: PetMood;
  equippedAccessories?: Partial<Record<AccessorySlot, string>>;
  /** true → tampil sebagai siluet rahasia berkilau dengan lencana ??? */
  isMysteryLocked?: boolean;
  customName?: string;
  className?: string;
}

export interface AccessoryPreviewIconProps {
  accessoryId: string;
  className?: string;
}

/* ═════════════════════════════════════════════════════════════
 *  METADATA
 * ═════════════════════════════════════════════════════════════ */

export const PET_SPECIES_LIST: readonly PetSpecies[] = ["cat", "capybara", "fox", "red_panda"];
export const CASTE_STAGES: readonly CasteStage[] = [1, 2, 3, 4, 5, 6, 7, 8];
export const PET_MOODS: readonly PetMood[] = ["happy", "proud", "worried", "shocked_boros"];
export const ACCESSORY_SLOTS: readonly AccessorySlot[] = ["head", "eyes", "neck", "hand", "vehicle", "decor"];

export const PET_SPECIES_META: Record<PetSpecies, { name: string; defaultName: string; description: string }> = {
  cat: {
    name: "Kucing Krem-Oranye",
    defaultName: "Mochi",
    description: "Kucing krem bertelinga runcing dengan ekor oranye yang melengkung manja.",
  },
  capybara: {
    name: "Kapibara Santai",
    defaultName: "Kapi",
    description: "Kapibara cokelat hangat yang tenang, telinga bundar mungil, dan selalu santai.",
  },
  fox: {
    name: "Rubah Peach",
    defaultName: "Rubi",
    description: "Rubah oranye-peach berpipi putih tebal dengan ekor besar berujung krem.",
  },
  red_panda: {
    name: "Panda Merah",
    defaultName: "Rimo",
    description: "Panda merah bertopeng putih-cokelat dengan ekor belang cincin.",
  },
};

export const CASTE_META: Record<CasteStage, { name: string; description: string; aura: string }> = {
  1: {
    name: "Perantau Kardus",
    description: "Berawal dari sebuah kardus, selembar poncho goni, dan tekad menabung.",
    aura: "Debu kilau tipis",
  },
  2: {
    name: "Penabung Selimut",
    description: "Meringkuk hangat di atas selimut perca sambil rajin mencatat receh.",
    aura: "Cahaya madu lembut",
  },
  3: {
    name: "Pelajar Teliti",
    description: "Duduk di atas tumpukan buku dengan rompi rapi dan dasi mungil.",
    aura: "Kilau bintang pengetahuan",
  },
  4: {
    name: "Barista Perintis",
    description: "Usaha kopi pertama sudah jalan! Celemek, peti kopi, dan aroma rezeki.",
    aura: "Aroma hangat & satu koin melayang",
  },
  5: {
    name: "Manajer Muda",
    description: "Blazer pastel, kursi kantor, dan anggaran yang selalu terkendali.",
    aura: "Cahaya emas & dua koin melayang",
  },
  6: {
    name: "Juragan Kota",
    description: "Mantel zamrud berkancing emas di kursi kulit — langganan rapat besar.",
    aura: "Halo zamrud-emas & tiga koin berputar",
  },
  7: {
    name: "Konglomerat Elit",
    description: "Setelan beludru, sofa mewah, dan tumpukan koin di sisi singgasana.",
    aura: "Sinar emas berputar & empat koin",
  },
  8: {
    name: "Maharaja Berlian",
    description: "Jubah kerajaan, singgasana berlian, dan kemakmuran yang berkilau.",
    aura: "Sinar berlian & berlian berputar",
  },
};

export const SLOT_LABEL: Record<AccessorySlot, string> = {
  head: "Topi & Mahkota",
  eyes: "Kacamata",
  neck: "Aksesoris Leher",
  hand: "Item Tangan",
  vehicle: "Kendaraan / Alas",
  decor: "Dekorasi Latar",
};

/* ═════════════════════════════════════════════════════════════
 *  KATALOG AKSESORIS — 24 item, 4 per slot, minStage 1 → 8
 * ═════════════════════════════════════════════════════════════ */

export const ACCESSORY_CATALOG = [
  /* ───── head ───── */
  {
    id: "head_paper_hat",
    name: "Topi Koran Lipat",
    slot: "head",
    minStage: 1,
    pricePoints: 30,
    source: "shop",
    description: "Topi lipatan koran bekas. Modal pertama para perantau.",
  },
  {
    id: "head_graduation_cap",
    name: "Topi Wisuda Mini",
    slot: "head",
    minStage: 3,
    pricePoints: 180,
    source: "shop",
    description: "Toga mungil dengan tali jumbai emas untuk pelajar yang teliti mencatat.",
  },
  {
    id: "head_top_hat",
    name: "Topi Tinggi Juragan",
    slot: "head",
    minStage: 6,
    pricePoints: 650,
    source: "shop",
    description: "Topi tinggi lavender berpita emas. Wibawa juragan kota langsung naik.",
  },
  {
    id: "head_diamond_crown",
    name: "Mahkota Berlian Maharaja",
    slot: "head",
    minStage: 8,
    pricePoints: 0,
    source: "path_drop",
    description: "Mahkota emas bertabur berlian. Hanya jatuh sebagai hadiah langka di jalur.",
  },

  /* ───── eyes ───── */
  {
    id: "eyes_round_glasses",
    name: "Kacamata Bulat Cendekia",
    slot: "eyes",
    minStage: 2,
    pricePoints: 90,
    source: "shop",
    description: "Bingkai bulat hangat yang bikin catatan keuangan terlihat lebih meyakinkan.",
  },
  {
    id: "eyes_sunglasses",
    name: "Kacamata Hitam Bos Muda",
    slot: "eyes",
    minStage: 4,
    pricePoints: 260,
    source: "shop",
    description: "Lensa gelap berkilau. Dijamin tetap tenang saat tagihan datang.",
  },
  {
    id: "eyes_monocle",
    name: "Monokel Emas Juragan",
    slot: "eyes",
    minStage: 6,
    pricePoints: 0,
    source: "path_drop",
    description: "Monokel berantai emas yang kadang ditemukan di sepanjang jalur kas.",
  },
  {
    id: "eyes_star_shades",
    name: "Kacamata Bintang Berlian",
    slot: "eyes",
    minStage: 8,
    pricePoints: 0,
    source: "path_drop",
    description: "Bingkai bintang bertabur kilau berlian untuk sang maharaja.",
  },

  /* ───── neck ───── */
  {
    id: "neck_bandana",
    name: "Bandana Perantau",
    slot: "neck",
    minStage: 1,
    pricePoints: 40,
    source: "shop",
    description: "Bandana peach berbintik krem, sederhana tapi penuh semangat.",
  },
  {
    id: "neck_bowtie",
    name: "Dasi Kupu-kupu Rapi",
    slot: "neck",
    minStage: 3,
    pricePoints: 150,
    source: "shop",
    description: "Dasi kupu-kupu lavender dengan simpul emas.",
  },
  {
    id: "neck_gold_chain",
    name: "Rantai Emas Manajer",
    slot: "neck",
    minStage: 5,
    pricePoints: 480,
    source: "shop",
    description: "Rantai emas tebal dengan liontin koin mungil.",
  },
  {
    id: "neck_diamond_pendant",
    name: "Liontin Berlian Biru",
    slot: "neck",
    minStage: 8,
    pricePoints: 0,
    source: "path_drop",
    description: "Liontin berlian biru langit yang berkilau tiap kali kamu mencatat.",
  },

  /* ───── hand ───── */
  {
    id: "hand_tin_can",
    name: "Kaleng Koin Receh",
    slot: "hand",
    minStage: 1,
    pricePoints: 35,
    source: "shop",
    description: "Kaleng bekas berisi receh pertama yang berhasil ditabung.",
  },
  {
    id: "hand_boba",
    name: "Boba Taro Dingin",
    slot: "hand",
    minStage: 3,
    pricePoints: 160,
    source: "shop",
    description: "Hadiah kecil untuk dirimu sendiri, tapi cukup sebulan sekali ya.",
  },
  {
    id: "hand_matcha_latte",
    name: "Matcha Latte Hangat",
    slot: "hand",
    minStage: 5,
    pricePoints: 420,
    source: "shop",
    description: "Segelas matcha latte berbusa untuk rapat anggaran yang panjang.",
  },
  {
    id: "hand_gem_scepter",
    name: "Tongkat Permata Maharaja",
    slot: "hand",
    minStage: 8,
    pricePoints: 0,
    source: "path_drop",
    description: "Tongkat emas dengan berlian raksasa. Simbol kedaulatan finansial.",
  },

  /* ───── vehicle ───── */
  {
    id: "vehicle_cardboard_wagon",
    name: "Gerobak Kardus",
    slot: "vehicle",
    minStage: 1,
    pricePoints: 80,
    source: "shop",
    description: "Gerobak kardus beroda empat. Murah, ramah dompet, dan cukup kuat.",
  },
  {
    id: "vehicle_skateboard",
    name: "Skateboard Pastel",
    slot: "vehicle",
    minStage: 3,
    pricePoints: 300,
    source: "shop",
    description: "Papan luncur pastel untuk berangkat kuliah lebih hemat ongkos.",
  },
  {
    id: "vehicle_scooter",
    name: "Skuter Mint",
    slot: "vehicle",
    minStage: 5,
    pricePoints: 900,
    source: "shop",
    description: "Skuter mint yang lincah menembus jalur kota tanpa boros bensin.",
  },
  {
    id: "vehicle_retro_car",
    name: "Mobil Sultan Pastel",
    slot: "vehicle",
    minStage: 7,
    pricePoints: 3000,
    source: "shop",
    description: "Mobil konvertibel retro berwarna pastel. Kendaraan para konglomerat elit.",
  },

  /* ───── decor ───── */
  {
    id: "decor_potted_plant",
    name: "Pot Tanaman Kecil",
    slot: "decor",
    minStage: 1,
    pricePoints: 50,
    source: "shop",
    description: "Tanaman hias yang tumbuh seiring kebiasaan baikmu.",
  },
  {
    id: "decor_bookshelf",
    name: "Rak Buku Mini",
    slot: "decor",
    minStage: 3,
    pricePoints: 220,
    source: "shop",
    description: "Rak kayu mungil berisi buku catatan dan toples koin.",
  },
  {
    id: "decor_balloons",
    name: "Balon Pesta Pastel",
    slot: "decor",
    minStage: 5,
    pricePoints: 0,
    source: "path_drop",
    description: "Balon perayaan yang sesekali jatuh saat kamu menyelesaikan peti mingguan.",
  },
  {
    id: "decor_chandelier",
    name: "Lampu Kristal Berlian",
    slot: "decor",
    minStage: 8,
    pricePoints: 2500,
    source: "shop",
    description: "Lampu gantung kristal yang menebar kilau pelangi ke seluruh ruangan.",
  },
] as const satisfies readonly AccessoryItem[];

export type AccessoryId = (typeof ACCESSORY_CATALOG)[number]["id"];

export const ACCESSORY_BY_ID: Readonly<Record<string, AccessoryItem>> = Object.fromEntries(
  ACCESSORY_CATALOG.map((item) => [item.id, item]),
);

export function getAccessory(id: string): AccessoryItem | undefined {
  return ACCESSORY_BY_ID[id];
}

export function getAccessoriesBySlot(slot: AccessorySlot): AccessoryItem[] {
  return ACCESSORY_CATALOG.filter((item) => item.slot === slot);
}

export function isAccessoryUnlocked(item: AccessoryItem, stage: CasteStage): boolean {
  return stage >= item.minStage;
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

/* ═════════════════════════════════════════════════════════════
 *  SPESIES — anatomi, wajah, animasi
 * ═════════════════════════════════════════════════════════════ */

const SP = {
  cat: { fur: "#FFF1D6", orange: "#FFAB5C", orangeDark: "#F08C34", cream: "#FFFDF7", paw: "#FFF1D6" },
  capybara: { brown: "#C8935A", brownDark: "#A06E3F", light: "#E8C79A", lighter: "#F5E1BF", paw: "#B98350" },
  fox: { orange: "#FF9E6D", orangeDark: "#E57E4C", cream: "#FFF3E0", dark: "#8A5A44", paw: "#8A5A44" },
  panda: { rust: "#E0704A", rustDark: "#C4542F", brown: "#7A3F2A", cream: "#FFF3E0", paw: "#7A3F2A" },
} as const;

type EyeStyle = "round" | "sleepy" | "almond" | "mask";

interface FaceSpec {
  eyeL: Pt;
  eyeR: Pt;
  eyeStyle: EyeStyle;
  noseY: number;
  mouthY: number;
  browY: number;
  cheekY: number;
  cheekDX: number;
  cheekColor: string;
  /** Pergeseran vertikal topi relatif ke kucing. */
  headDY: number;
  /** Skala horizontal pakaian agar pas dengan lebar badan. */
  bodyScaleX: number;
  /** Warna kulit di sekitar mata (untuk kelopak mata). */
  lidColor: string;
  pawColor: string;
  tailBase: Pt;
}

const FACE: Record<PetSpecies, FaceSpec> = {
  cat: {
    eyeL: [165, 208],
    eyeR: [235, 208],
    eyeStyle: "round",
    noseY: 217,
    mouthY: 231,
    browY: 178,
    cheekY: 230,
    cheekDX: 60,
    cheekColor: C.peach,
    headDY: 0,
    bodyScaleX: 1,
    lidColor: SP.cat.fur,
    pawColor: SP.cat.paw,
    tailBase: [262, 318],
  },
  capybara: {
    eyeL: [158, 194],
    eyeR: [242, 194],
    eyeStyle: "sleepy",
    noseY: 222,
    mouthY: 246,
    browY: 168,
    cheekY: 232,
    cheekDX: 72,
    cheekColor: C.peach,
    headDY: 14,
    bodyScaleX: 1.14,
    lidColor: SP.capybara.brown,
    pawColor: SP.capybara.paw,
    tailBase: [270, 330],
  },
  fox: {
    eyeL: [164, 200],
    eyeR: [236, 200],
    eyeStyle: "almond",
    noseY: 238,
    mouthY: 252,
    browY: 172,
    cheekY: 238,
    cheekDX: 62,
    cheekColor: C.peachSoft,
    headDY: 4,
    bodyScaleX: 1,
    lidColor: SP.fox.orange,
    pawColor: SP.fox.paw,
    tailBase: [250, 318],
  },
  red_panda: {
    eyeL: [166, 204],
    eyeR: [234, 204],
    eyeStyle: "mask",
    noseY: 232,
    mouthY: 246,
    browY: 174,
    cheekY: 232,
    cheekDX: 64,
    cheekColor: C.peachSoft,
    headDY: 4,
    bodyScaleX: 1,
    lidColor: SP.panda.brown,
    pawColor: SP.panda.paw,
    tailBase: [256, 320],
  },
};

const BODY_D =
  "M136 296 C136 250 164 232 200 232 C236 232 264 250 264 296 C264 332 238 350 200 350 C162 350 136 332 136 296Z";
const BODY_WIDE_D =
  "M122 302 C122 256 156 236 200 236 C244 236 278 256 278 302 C278 336 246 354 200 354 C154 354 122 336 122 302Z";

/* ───────────────────────── Ear / tail wrappers ───────────────────────── */

type MotionSpec = { animate: TargetAndTransition; transition: Transition };

function earSpec(mood: PetMood, side: "l" | "r"): MotionSpec {
  const s = side === "l" ? -1 : 1;
  switch (mood) {
    case "proud":
      return { animate: { rotate: [0, s * 12, 0] }, transition: loop(0.5) };
    case "worried":
      return { animate: { rotate: [s * 24, s * 21, s * 24] }, transition: loop(0.4) };
    case "shocked_boros":
      return { animate: { rotate: [-s * 3, s * 3, -s * 3], scaleY: [1.1, 1.14, 1.1] }, transition: loop(0.25) };
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

function EarWrap({ side, mood, children }: { side: "l" | "r"; mood: PetMood; children: ReactNode }) {
  const spec = earSpec(mood, side);
  return (
    <motion.g animate={spec.animate} transition={spec.transition} style={fb(side === "l" ? 0.75 : 0.25, 0.95)}>
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

function TailWrap({ mood, children }: { mood: PetMood; children: ReactNode }) {
  const spec = TAIL_RIG[mood];
  return (
    <motion.g animate={spec.animate} transition={spec.transition} style={fb(0.08, 0.92)}>
      {children}
    </motion.g>
  );
}

/* ───────────────────────── Tails ───────────────────────── */

function CatTail({ mood }: { mood: PetMood }) {
  const d = "M262 318 C322 326 342 282 316 250 C302 232 284 238 290 254";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill="none" stroke={INK} strokeWidth={28} strokeLinecap="round" />
      <path d={d} fill="none" stroke={SP.cat.orange} strokeWidth={21} strokeLinecap="round" />
      <path d={d} pathLength={100} fill="none" stroke={SP.cat.cream} strokeWidth={21} strokeLinecap="round" strokeDasharray="13 200" strokeDashoffset={-87} />
      <path d="M296 322 Q322 316 330 296" fill="none" stroke={SP.cat.orangeDark} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
    </TailWrap>
  );
}

function FoxTail({ mood }: { mood: PetMood }) {
  const d =
    "M246 298 C286 286 330 292 346 252 C356 224 340 196 316 178 C319 214 316 250 296 288 C284 312 268 334 250 338Z";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill={SP.fox.orange} />
      <path d="M316 178 C334 192 346 208 344 228 C332 232 322 236 316 240 C319 214 319 196 316 178Z" fill={SP.fox.cream} />
      <path d="M296 288 C284 312 268 334 250 338 C276 330 300 312 312 270 C316 252 318 232 316 214 C312 250 308 270 296 288Z" fill={SP.fox.orangeDark} opacity={0.55} />
      <path d={d} fill="none" {...O} />
      <Hl d="M270 296 Q304 296 326 272" w={3.4} o={0.55} />
    </TailWrap>
  );
}

function PandaTail({ mood }: { mood: PetMood }) {
  const d = "M256 322 C322 342 362 288 340 242 C328 216 306 210 296 222";
  return (
    <TailWrap mood={mood}>
      <path d={d} fill="none" stroke={INK} strokeWidth={50} strokeLinecap="round" />
      <path d={d} fill="none" stroke={SP.panda.rust} strokeWidth={43} strokeLinecap="round" />
      <path d={d} fill="none" stroke={SP.panda.brown} strokeWidth={43} strokeLinecap="butt" strokeDasharray="12 22" strokeDashoffset={-6} opacity={0.9} />
      <path d="M268 326 C322 340 352 296 336 252" fill="none" stroke={C.cream} strokeWidth={3.6} strokeLinecap="round" opacity={0.5} />
    </TailWrap>
  );
}

/* ───────────────────────── Bodies ───────────────────────── */

function Feet({ fill, cx = 170, y = 346, rx = 22 }: { fill: string; cx?: number; y?: number; rx?: number }) {
  return (
    <g>
      <ellipse cx={200 - (200 - cx)} cy={y} rx={rx} ry={12} fill={fill} {...O} strokeWidth={3} />
      <ellipse cx={200 + (200 - cx)} cy={y} rx={rx} ry={12} fill={fill} {...O} strokeWidth={3} />
      <path
        d={`M${cx - 6} ${y + 3} V${y + 8} M${cx + 4} ${y + 3} V${y + 8} M${400 - cx - 4} ${y + 3} V${y + 8} M${400 - cx + 6} ${y + 3} V${y + 8}`}
        fill="none"
        {...O25}
        opacity={0.5}
      />
    </g>
  );
}

function CatBody() {
  return (
    <g>
      <path d={BODY_D} fill={SP.cat.fur} />
      <path d="M139 296 C139 266 152 250 166 243 C158 268 158 302 170 330 C152 324 139 314 139 296Z" fill={SP.cat.orange} />
      <path d="M262 288 C260 268 252 254 240 246 C246 266 244 290 238 306 C252 304 262 298 262 288Z" fill={SP.cat.orange} opacity={0.9} />
      <ellipse cx={202} cy={314} rx={31} ry={33} fill={SP.cat.cream} />
      <path d={BODY_D} fill="none" {...O} />
      <Feet fill={SP.cat.paw} />
    </g>
  );
}

function CapybaraBody() {
  return (
    <g>
      <path d={BODY_WIDE_D} fill={SP.capybara.brown} />
      <path d="M200 238 Q252 238 272 280 Q278 300 274 320 Q250 258 200 252 Q150 258 126 320 Q122 300 128 280 Q148 238 200 238Z" fill={SP.capybara.brownDark} opacity={0.4} />
      <ellipse cx={200} cy={318} rx={42} ry={32} fill={SP.capybara.light} />
      <g stroke={SP.capybara.brownDark} strokeWidth={3} strokeLinecap="round" opacity={0.55}>
        <path d="M146 288 l-5 6 M156 304 l-6 5 M138 314 l-5 4 M254 288 l5 6 M244 304 l6 5 M262 314 l5 4" />
      </g>
      <path d={BODY_WIDE_D} fill="none" {...O} />
      <Feet fill={SP.capybara.paw} cx={160} rx={22} y={349} />
    </g>
  );
}

function FoxBody() {
  const body =
    "M138 298 C138 252 166 234 200 234 C234 234 262 252 262 298 C262 334 236 350 200 350 C164 350 138 334 138 298Z";
  return (
    <g>
      <path d={body} fill={SP.fox.orange} />
      <path d="M174 242 Q200 262 226 242 Q240 290 216 334 Q200 346 184 334 Q160 290 174 242Z" fill={SP.fox.cream} />
      <path d="M262 290 C262 270 252 254 238 246 C246 268 244 294 236 316 C252 312 262 304 262 290Z" fill={SP.fox.orangeDark} opacity={0.55} />
      <path d={body} fill="none" {...O} />
      <Feet fill={SP.fox.paw} />
    </g>
  );
}

function PandaBody() {
  return (
    <g>
      <path d={BODY_D} fill={SP.panda.rust} />
      <path d="M170 244 Q200 262 230 244 Q252 290 230 336 Q200 348 170 336 Q148 290 170 244Z" fill={SP.panda.brown} />
      <path d="M262 288 C260 268 252 254 240 246 C246 266 244 290 238 306 C252 304 262 298 262 288Z" fill={SP.panda.rustDark} opacity={0.6} />
      <path d={BODY_D} fill="none" {...O} />
      <Feet fill={SP.panda.paw} />
    </g>
  );
}

/* ───────────────────────── Heads (telinga + kepala + tanda) ───────────────────────── */

function CatHead({ mood }: { mood: PetMood }) {
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <path d="M128 172 Q114 120 136 98 Q166 108 180 140Z" fill={SP.cat.orange} {...O} />
        <path d="M138 152 Q132 124 142 114 Q158 124 166 140Z" fill={C.peachSoft} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <path d="M272 172 Q286 120 264 98 Q234 108 220 140Z" fill={SP.cat.fur} {...O} />
        <path d="M262 152 Q268 124 258 114 Q242 124 234 140Z" fill={C.peachSoft} />
      </EarWrap>
      <path d="M116 206 C116 150 150 128 200 128 C250 128 284 150 284 206 C284 246 250 270 200 270 C150 270 116 246 116 206Z" fill={SP.cat.fur} />
      <path d="M121 180 C126 146 156 130 200 130 C244 130 274 146 279 180 C252 160 226 154 200 160 C174 154 148 160 121 180Z" fill={SP.cat.orange} />
      <ellipse cx={200} cy={236} rx={31} ry={21} fill={SP.cat.cream} />
      <g fill="none" stroke={SP.cat.orangeDark} strokeWidth={5} strokeLinecap="round">
        <path d="M188 132 Q192 144 187 153" />
        <path d="M200 131 V150" />
        <path d="M212 132 Q208 144 213 153" />
      </g>
      <path d="M116 206 C116 150 150 128 200 128 C250 128 284 150 284 206 C284 246 250 270 200 270 C150 270 116 246 116 206Z" fill="none" {...O} />
    </g>
  );
}

function CapybaraHead({ mood }: { mood: PetMood }) {
  const head =
    "M118 212 C116 166 148 142 200 142 C252 142 284 166 282 212 C281 250 252 276 200 276 C148 276 119 250 118 212Z";
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <circle cx={140} cy={156} r={15} fill={SP.capybara.brown} {...O} />
        <circle cx={140} cy={158} r={7.5} fill={SP.capybara.brownDark} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <circle cx={260} cy={156} r={15} fill={SP.capybara.brown} {...O} />
        <circle cx={260} cy={158} r={7.5} fill={SP.capybara.brownDark} />
      </EarWrap>
      <path d={head} fill={SP.capybara.brown} />
      <path d="M150 156 Q200 134 250 156 Q200 148 150 156Z" fill={SP.capybara.brownDark} opacity={0.5} />
      <path d="M146 230 Q146 204 200 204 Q254 204 254 230 Q254 270 200 274 Q146 270 146 230Z" fill={SP.capybara.light} {...O} strokeWidth={3} />
      <path d="M160 220 Q168 212 184 210" fill="none" stroke={SP.capybara.lighter} strokeWidth={4} strokeLinecap="round" />
      <g fill={SP.capybara.brownDark} opacity={0.5}>
        <circle cx={166} cy={238} r={2} />
        <circle cx={172} cy={246} r={2} />
        <circle cx={234} cy={238} r={2} />
        <circle cx={228} cy={246} r={2} />
      </g>
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function FoxHead({ mood }: { mood: PetMood }) {
  const head =
    "M118 204 C120 158 152 134 200 134 C248 134 280 158 282 204 L292 228 L262 238 C250 262 226 276 200 278 C174 276 150 262 138 238 L108 228Z";
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <path d="M126 178 Q104 106 140 80 Q172 100 186 148Z" fill={SP.fox.orange} {...O} />
        <path d="M138 164 Q124 118 142 98 Q160 114 170 152Z" fill={SP.fox.cream} />
        <path d="M141 82 Q156 92 163 107 Q148 99 130 106 Q126 92 141 82Z" fill={SP.fox.dark} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <path d="M274 178 Q296 106 260 80 Q228 100 214 148Z" fill={SP.fox.orange} {...O} />
        <path d="M262 164 Q276 118 258 98 Q240 114 230 152Z" fill={SP.fox.cream} />
        <path d="M259 82 Q244 92 237 107 Q252 99 270 106 Q274 92 259 82Z" fill={SP.fox.dark} />
      </EarWrap>
      <path d={head} fill={SP.fox.orange} />
      <path d="M122 214 Q146 206 168 226 Q184 240 200 240 Q216 240 232 226 Q254 206 278 214 L286 228 L262 238 C250 262 226 276 200 278 C174 276 150 262 138 238 L114 228Z" fill={SP.fox.cream} />
      <path d="M180 140 Q200 150 220 140 Q212 160 200 172 Q188 160 180 140Z" fill={SP.fox.orangeDark} opacity={0.45} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

function PandaHead({ mood }: { mood: PetMood }) {
  const head =
    "M114 206 C114 152 150 132 200 132 C250 132 286 152 286 206 C286 248 252 272 200 272 C148 272 114 248 114 206Z";
  return (
    <g>
      <EarWrap side="l" mood={mood}>
        <circle cx={138} cy={150} r={27} fill={SP.panda.rust} {...O} />
        <ellipse cx={138} cy={152} rx={15} ry={16} fill={SP.panda.cream} />
      </EarWrap>
      <EarWrap side="r" mood={mood}>
        <circle cx={262} cy={150} r={27} fill={SP.panda.rust} {...O} />
        <ellipse cx={262} cy={152} rx={15} ry={16} fill={SP.panda.cream} />
      </EarWrap>
      <path d={head} fill={SP.panda.rust} />
      <path d="M118 214 C118 188 140 184 158 202 C168 224 152 254 128 246 C120 238 118 226 118 214Z" fill={SP.panda.cream} />
      <path d="M282 214 C282 188 260 184 242 202 C232 224 248 254 272 246 C280 238 282 226 282 214Z" fill={SP.panda.cream} />
      <ellipse cx={200} cy={240} rx={34} ry={26} fill={SP.panda.cream} />
      <ellipse cx={170} cy={168} rx={9} ry={6} fill={SP.panda.cream} transform="rotate(-14 170 168)" />
      <ellipse cx={230} cy={168} rx={9} ry={6} fill={SP.panda.cream} transform="rotate(14 230 168)" />
      <ellipse cx={166} cy={205} rx={17} ry={19} fill={SP.panda.brown} transform="rotate(8 166 205)" />
      <ellipse cx={234} cy={205} rx={17} ry={19} fill={SP.panda.brown} transform="rotate(-8 234 205)" />
      <path d="M158 220 Q154 236 146 246 M242 220 Q246 236 254 246" fill="none" stroke={SP.panda.brown} strokeWidth={6} strokeLinecap="round" />
      <path d="M200 140 V158" stroke={SP.panda.rustDark} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <path d={head} fill="none" {...O} />
    </g>
  );
}

/* ───────────────────────── Face ───────────────────────── */

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

function Eyes({ species, mood }: { species: PetSpecies; mood: PetMood }) {
  const spec = FACE[species];
  const pts: [Pt, "l" | "r"][] = [
    [spec.eyeL, "l"],
    [spec.eyeR, "r"],
  ];

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
            <polygon points={starPoints(x, y, 19, 8.5)} fill={C.honey} {...O3} />
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
            <circle cx={x} cy={y} r={17} fill={C.cream} {...O3} />
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
        <g key={side}>
          <EyeShape style={spec.eyeStyle} cx={x} cy={y} side={side} />
          {mood === "worried" && <ellipse cx={x} cy={y + 12} rx={7} ry={2.6} fill={C.sky} opacity={0.7} />}
        </g>
      ))}
    </Blink>
  );
}

function Brows({ species, mood }: { species: PetSpecies; mood: PetMood }) {
  const { eyeL, eyeR, browY } = FACE[species];
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
  return null;
}

function Nose({ species }: { species: PetSpecies }) {
  const y = FACE[species].noseY;
  switch (species) {
    case "capybara":
      return (
        <g fill={INK}>
          <ellipse cx={187} cy={y} rx={3.4} ry={4.6} />
          <ellipse cx={213} cy={y} rx={3.4} ry={4.6} />
          <circle cx={186} cy={y - 1.4} r={1} fill={C.cream} />
          <circle cx={212} cy={y - 1.4} r={1} fill={C.cream} />
        </g>
      );
    case "fox":
      return (
        <g>
          <ellipse cx={200} cy={y} rx={10} ry={7} fill={INK} />
          <ellipse cx={197} cy={y - 2.4} rx={3.4} ry={1.8} fill={C.cream} opacity={0.85} />
        </g>
      );
    case "red_panda":
      return <path d={`M191 ${y - 3} Q200 ${y - 8} 209 ${y - 3} Q206 ${y + 6} 200 ${y + 8} Q194 ${y + 6} 191 ${y - 3}Z`} fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
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

function Mouth({ species, mood, uid }: { species: PetSpecies; mood: PetMood; uid: string }) {
  const y = FACE[species].mouthY;
  const cx = 200;
  const capy = species === "capybara";

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
      return capy ? (
        <path d={`M${cx - 15} ${y - 1} Q${cx} ${y + 10} ${cx + 15} ${y - 1}`} fill="none" {...O} strokeWidth={3} />
      ) : (
        <path d={`M${cx - 18} ${y - 1} Q${cx - 9} ${y + 11} ${cx} ${y - 1} Q${cx + 9} ${y + 11} ${cx + 18} ${y - 1}`} fill="none" {...O} strokeWidth={3} />
      );
  }
}

function Cheeks({ species, mood }: { species: PetSpecies; mood: PetMood }) {
  const { cheekY, cheekDX, cheekColor } = FACE[species];
  const o = mood === "happy" || mood === "proud" ? 0.75 : mood === "worried" ? 0.3 : 0;
  return (
    <g fill={cheekColor}>
      {[200 - cheekDX, 200 + cheekDX].map((x) => (
        <motion.ellipse
          key={x}
          cx={x}
          cy={cheekY}
          rx={15}
          ry={9}
          animate={{ opacity: [o * 0.8, o, o * 0.8] }}
          transition={loop(2)}
        />
      ))}
    </g>
  );
}

function Whiskers({ species }: { species: PetSpecies }) {
  if (species === "cat") {
    return (
      <g fill="none" {...O25} opacity={0.65}>
        <path d="M120 216 L92 210 M120 228 L90 231 M280 216 L308 210 M280 228 L310 231" />
      </g>
    );
  }
  if (species === "fox") {
    return (
      <g fill="none" {...O25} opacity={0.5}>
        <path d="M128 232 L104 230 M280 232 L304 230 M130 244 L108 248 M278 244 L300 248" />
      </g>
    );
  }
  return null;
}

function Face({ species, mood, uid }: { species: PetSpecies; mood: PetMood; uid: string }) {
  return (
    <motion.g style={fb()} initial={{ scale: 0.94 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
      <Whiskers species={species} />
      <Cheeks species={species} mood={mood} />
      <Eyes species={species} mood={mood} />
      <Brows species={species} mood={mood} />
      <Nose species={species} />
      <Mouth species={species} mood={mood} uid={uid} />
    </motion.g>
  );
}

function PetTail({ species, mood }: { species: PetSpecies; mood: PetMood }) {
  switch (species) {
    case "cat":
      return <CatTail mood={mood} />;
    case "fox":
      return <FoxTail mood={mood} />;
    case "red_panda":
      return <PandaTail mood={mood} />;
    default:
      return (
        <TailWrap mood={mood}>
          <ellipse cx={272} cy={336} rx={11} ry={9} fill={SP.capybara.brownDark} {...O} strokeWidth={3} />
        </TailWrap>
      );
  }
}

function PetBody({ species }: { species: PetSpecies }) {
  switch (species) {
    case "cat":
      return <CatBody />;
    case "capybara":
      return <CapybaraBody />;
    case "fox":
      return <FoxBody />;
    default:
      return <PandaBody />;
  }
}

function PetHead({ species, mood }: { species: PetSpecies; mood: PetMood }) {
  switch (species) {
    case "cat":
      return <CatHead mood={mood} />;
    case "capybara":
      return <CapybaraHead mood={mood} />;
    case "fox":
      return <FoxHead mood={mood} />;
    default:
      return <PandaHead mood={mood} />;
  }
}

/* ═════════════════════════════════════════════════════════════
 *  KASTA — alas duduk, pakaian dasar, aura kemakmuran
 * ═════════════════════════════════════════════════════════════ */

const polar = (cx: number, cy: number, r: number, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [Number(f2(cx + r * Math.cos(a))), Number(f2(cy + r * Math.sin(a)))];
};

const K = {
  leather: "#B26B4F",
  leatherDark: "#8A4F38",
  leatherLight: "#CE8A6B",
  velvet: "#9B59D0",
  velvetDark: "#7A3FB0",
  velvetDeep: "#5E2D8C",
  emerald: "#3DBE8B",
  emeraldDark: "#2A9A6D",
  emeraldLight: "#7BE0B6",
  crimson: "#E8576A",
  crimsonDark: "#C73D52",
  burlapDark: "#BE9C6E",
  mint: "#8FE3C8",
  mintDark: "#4FC4A0",
} as const;

const FOX_BODY_D =
  "M138 298 C138 252 166 234 200 234 C234 234 262 252 262 298 C262 334 236 350 200 350 C164 350 138 334 138 298Z";

const BODY_CLIP: Record<PetSpecies, string> = {
  cat: BODY_D,
  capybara: BODY_WIDE_D,
  fox: FOX_BODY_D,
  red_panda: BODY_D,
};

/* ───────────────────────── Alas duduk ───────────────────────── */

interface SeatSpec {
  /** Seberapa tinggi hewan terangkat dari tanah (px viewBox). */
  lift: number;
  back: ReactNode;
  front: ReactNode;
}

const SEAT_CARDBOARD: SeatSpec = {
  lift: 0,
  back: (
    <g>
      <path d="M104 328 L78 292 L126 282 L148 322Z" fill={C.cardboardLight} {...O3} />
      <path d="M296 328 L322 292 L274 282 L252 322Z" fill={C.cardboardLight} {...O3} />
      <path d="M98 322 H302 V358 H98Z" fill={C.cardboardDark} {...O} />
    </g>
  ),
  front: (
    <g>
      <path d="M94 326 H306 L298 366 H102Z" fill={C.cardboard} {...O} />
      <path d="M102 340 H298 M106 354 H294" fill="none" stroke={C.cardboardDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
      <path d="M184 326 H216 V346 H184Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" opacity={0.92} />
      <rect x={122} y={344} width={34} height={16} rx={4} fill={C.peachSoft} {...O2} />
      <path d="M128 350 H150 M128 355 H142" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M252 340 l7 -8 l7 8 M259 332 V352" fill="none" {...O25} opacity={0.65} />
      <Hl d="M104 331 H168" w={3} o={0.6} />
    </g>
  ),
};

const SEAT_BLANKET: SeatSpec = {
  lift: 0,
  back: <ellipse cx={200} cy={354} rx={142} ry={24} fill={C.taroSoft} {...O} />,
  front: (
    <g>
      <path d="M90 348 Q90 322 128 320 Q200 306 272 320 Q310 322 310 348 Q310 366 272 368 H128 Q90 366 90 348Z" fill={C.peach} {...O} />
      <g stroke={INK} strokeWidth={2.4} strokeLinejoin="round">
        <rect x={112} y={336} width={30} height={26} rx={5} fill={C.honey} />
        <rect x={150} y={344} width={30} height={22} rx={5} fill={C.sky} />
        <rect x={220} y={344} width={30} height={22} rx={5} fill={C.matcha} />
        <rect x={258} y={332} width={32} height={28} rx={5} fill={C.taro} />
      </g>
      <path d="M118 342 H136 M156 352 H174 M226 352 H244 M264 340 H284" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="4 4" />
      <path d="M100 366 V374 M116 369 V377 M132 370 V378 M268 370 V378 M284 369 V377 M300 366 V374" fill="none" {...O25} />
      <Hl d="M104 336 Q112 326 138 325" w={3.2} o={0.6} />
    </g>
  ),
};

function Book({ x, y, w, color, band, tilt = 0 }: { x: number; y: number; w: number; color: string; band: string; tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + 6})`}>
      <rect x={x} y={y} width={w} height={12} rx={4} fill={color} {...O3} />
      <rect x={x + w - 18} y={y + 2.5} width={14} height={7} rx={2.5} fill={C.cream} stroke={INK} strokeWidth={1.8} />
      <path d={`M${x + 16} ${y + 1.5} V${y + 10.5} M${x + 24} ${y + 1.5} V${y + 10.5}`} stroke={band} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

const SEAT_BOOKS: SeatSpec = {
  lift: 28,
  back: null,
  front: (
    <g>
      <Book x={98} y={354} w={204} color={C.sky} band={C.honey} />
      <Book x={110} y={342} w={182} color={C.peach} band={C.cream} />
      <Book x={120} y={330} w={156} color={C.matcha} band={C.honey} tilt={-1.2} />
      <Hl d="M108 359 H150" w={2.6} o={0.7} />
    </g>
  ),
};

const SEAT_CRATE: SeatSpec = {
  lift: 24,
  back: (
    <g>
      <path d="M268 366 Q254 340 274 326 L282 318 H310 L318 326 Q340 340 326 366Z" fill={C.burlap} {...O} />
      <path d="M278 320 Q296 326 314 320" fill="none" {...O25} />
      <ellipse cx={297} cy={346} rx={8} ry={11} fill={K.leatherDark} {...O25} transform="rotate(24 297 346)" />
      <path d="M291 338 Q297 346 303 354" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
    </g>
  ),
  front: (
    <g>
      <rect x={106} y={334} width={186} height={32} rx={5} fill={C.wood} {...O} />
      <path d="M108 345 H290 M108 356 H290" fill="none" stroke={C.woodDark} strokeWidth={2.6} opacity={0.7} />
      <rect x={106} y={334} width={16} height={32} rx={4} fill={C.woodDark} {...O3} />
      <rect x={276} y={334} width={16} height={32} rx={4} fill={C.woodDark} {...O3} />
      <circle cx={199} cy={350} r={11} fill={C.cream} {...O25} />
      <ellipse cx={199} cy={350} rx={5} ry={7} fill={K.leatherDark} transform="rotate(24 199 350)" />
      <path d="M196 344 Q199 350 202 356" fill="none" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" />
      <Hl d="M130 339 H176" w={3} o={0.55} />
    </g>
  ),
};

const SEAT_OFFICE: SeatSpec = {
  lift: 28,
  back: (
    <g>
      <path d="M124 338 Q116 262 148 246 H252 Q284 262 276 338Z" fill={C.sky} {...O} />
      <path d="M138 330 Q132 270 156 258 H244 Q268 270 262 330Z" fill={C.skySoft} opacity={0.55} />
      <Hl d="M138 270 Q144 258 164 254" w={3.2} o={0.65} />
    </g>
  ),
  front: (
    <g>
      <path d="M98 308 H124 V330 H98Z" fill={C.skyDark} {...O3} />
      <path d="M276 308 H302 V330 H276Z" fill={C.skyDark} {...O3} />
      <path d="M110 330 H290 V346 Q290 352 282 352 H118 Q110 352 110 346Z" fill={C.sky} {...O} />
      <Hl d="M122 336 H174" w={3} o={0.7} />
      <rect x={192} y={352} width={16} height={8} fill={C.steel} {...O3} />
      <Duo d="M200 360 L132 366 M200 360 L268 366 M200 360 L168 366 M200 360 L232 366" inner={C.steelDark} ow={7} iw={3.4} />
      <g fill={C.wheel} {...O2}>
        <circle cx={128} cy={364} r={5.4} />
        <circle cx={272} cy={364} r={5.4} />
        <circle cx={164} cy={366} r={5} />
        <circle cx={236} cy={366} r={5} />
      </g>
    </g>
  ),
};

const SEAT_ARMCHAIR: SeatSpec = {
  lift: 28,
  back: (
    <g>
      <path d="M108 340 V232 Q108 196 148 190 H252 Q292 196 292 232 V340Z" fill={K.leather} {...O} />
      <path d="M118 332 V236 Q118 206 152 202 H248 Q282 206 282 236 V332Z" fill={K.leatherLight} opacity={0.4} />
      <g fill={C.honey} {...O2}>
        <circle cx={132} cy={262} r={4.2} />
        <circle cx={268} cy={262} r={4.2} />
        <circle cx={134} cy={300} r={4.2} />
        <circle cx={266} cy={300} r={4.2} />
      </g>
      <path d="M132 262 L134 300 M268 262 L266 300" fill="none" stroke={K.leatherDark} strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
      <Hl d="M120 226 Q124 206 150 200" w={3.2} o={0.5} />
    </g>
  ),
  front: (
    <g>
      <path d="M92 300 Q92 274 112 274 Q132 274 132 300 V350 H92Z" fill={K.leather} {...O} />
      <path d="M268 300 Q268 274 288 274 Q308 274 308 300 V350 H268Z" fill={K.leather} {...O} />
      <path d="M104 290 Q104 280 112 280" fill="none" stroke={K.leatherLight} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M296 290 Q296 280 288 280" fill="none" stroke={K.leatherLight} strokeWidth={3.4} strokeLinecap="round" opacity={0.6} />
      <g fill={C.honey} {...O2}>
        <circle cx={102} cy={322} r={3} />
        <circle cx={102} cy={336} r={3} />
        <circle cx={298} cy={322} r={3} />
        <circle cx={298} cy={336} r={3} />
      </g>
      <path d="M126 330 H274 V352 Q274 356 268 356 H132 Q126 356 126 352Z" fill={K.leather} {...O} />
      <Hl d="M138 337 H190" w={3} o={0.45} />
      <path d="M104 350 L98 366 H114 L116 350 M296 350 L302 366 H286 L284 350" fill={C.honey} {...O3} />
    </g>
  ),
};

const SEAT_SOFA: SeatSpec = {
  lift: 30,
  back: (
    <g>
      <path d="M72 340 V252 Q72 220 104 218 H296 Q328 220 328 252 V340Z" fill={K.velvetDark} {...O} />
      <path d="M84 332 V256 Q84 232 108 230 H292 Q316 232 316 256 V332Z" fill={K.velvet} opacity={0.5} />
      <g fill={C.honey} {...O2}>
        <path d="M98 262 l5 6 l-5 6 l-5 -6Z" />
        <path d="M98 300 l5 6 l-5 6 l-5 -6Z" />
        <path d="M302 262 l5 6 l-5 6 l-5 -6Z" />
        <path d="M302 300 l5 6 l-5 6 l-5 -6Z" />
      </g>
      <path d="M98 262 L98 312 M302 262 L302 312" fill="none" stroke={K.velvetDeep} strokeWidth={2.2} opacity={0.5} />
      <Hl d="M84 246 Q86 232 110 230" w={3.2} o={0.5} />
    </g>
  ),
  front: (
    <g>
      <CoinStack x={366} y={366} n={3} />
      <CoinStack x={34} y={366} n={2} />
      <path d="M58 344 V272 Q58 250 82 250 Q106 250 106 272 V348Z" fill={K.velvetDark} {...O} />
      <path d="M294 348 V272 Q294 250 318 250 Q342 250 342 272 V344Z" fill={K.velvetDark} {...O} />
      <Hl d="M68 276 Q70 260 84 258" w={3.2} o={0.55} />
      <path d="M100 326 H300 V350 Q300 356 292 356 H108 Q100 356 100 350Z" fill={K.velvet} {...O} />
      <path d="M104 332 H296" fill="none" stroke={C.honey} strokeWidth={3} strokeLinecap="round" />
      <Hl d="M114 340 H176" w={3} o={0.5} />
      <path d="M72 352 L66 366 H84 L88 352 M328 352 L334 366 H316 L312 352 M126 356 L124 366 H140 L140 356 M274 356 L276 366 H260 L260 356" fill={C.honey} {...O3} />
    </g>
  ),
};

const SEAT_THRONE: SeatSpec = {
  lift: 34,
  back: (
    <g>
      <path d="M68 354 H332 V366 Q332 374 200 374 Q68 374 68 366Z" fill={C.honeySoft} {...O} />
      <path d="M96 346 V152 Q96 122 110 106 L132 122 L150 92 L172 114 L200 70 L228 114 L250 92 L268 122 L290 106 Q304 122 304 152 V346Z" fill={C.honey} {...O} />
      <path d="M110 346 V156 Q110 134 120 122 L134 134 L152 108 L170 128 L200 90 L230 128 L248 108 L266 134 L280 122 Q290 134 290 156 V346Z" fill={K.crimson} {...O25} />
      <path d="M122 340 V164 Q122 146 128 138" fill="none" stroke={C.peachSoft} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      <g transform="translate(200 82)">
        <Diamond s={11} />
      </g>
      <g transform="translate(150 98) scale(0.7)">
        <Diamond s={11} />
      </g>
      <g transform="translate(250 98) scale(0.7)">
        <Diamond s={11} />
      </g>
      <circle cx={110} cy={108} r={6} fill={C.honeySoft} {...O25} />
      <circle cx={290} cy={108} r={6} fill={C.honeySoft} {...O25} />
      <g transform="translate(124 282) scale(0.55)">
        <Diamond s={11} />
      </g>
      <g transform="translate(276 282) scale(0.55)">
        <Diamond s={11} />
      </g>
    </g>
  ),
  front: (
    <g>
      <CoinStack x={42} y={368} n={3} />
      <CoinStack x={358} y={368} n={4} />
      <rect x={78} y={290} width={42} height={58} rx={12} fill={C.honey} {...O} />
      <rect x={280} y={290} width={42} height={58} rx={12} fill={C.honey} {...O} />
      <g transform="translate(99 312) scale(0.7)">
        <Diamond s={11} />
      </g>
      <g transform="translate(301 312) scale(0.7)">
        <Diamond s={11} />
      </g>
      <Hl d="M88 304 Q90 296 102 295" w={3.2} o={0.7} />
      <path d="M104 324 H296 V346 Q296 352 288 352 H112 Q104 352 104 346Z" fill={K.crimson} {...O} />
      <path d="M108 330 H292" fill="none" stroke={C.honey} strokeWidth={3.4} strokeLinecap="round" />
      <Hl d="M120 338 H180" w={3} o={0.5} />
      <Sparkle x={74} y={286} size={7} color={C.cream} delay={0.4} />
      <Sparkle x={326} y={280} size={8} color={C.honeySoft} delay={1.1} />
    </g>
  ),
};

const SEATS: Record<CasteStage, SeatSpec> = {
  1: SEAT_CARDBOARD,
  2: SEAT_BLANKET,
  3: SEAT_BOOKS,
  4: SEAT_CRATE,
  5: SEAT_OFFICE,
  6: SEAT_ARMCHAIR,
  7: SEAT_SOFA,
  8: SEAT_THRONE,
};

/* ───────────────────────── Pakaian dasar kasta ───────────────────────── */

function OutfitBack({ stage }: { stage: CasteStage }) {
  if (stage !== 8) return null;
  return (
    <g>
      <path d="M116 250 Q92 304 104 354 H296 Q308 304 284 250Z" fill={K.crimsonDark} {...O} />
      <path d="M126 262 Q108 306 118 346" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M274 262 Q292 306 282 346" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinecap="round" />
    </g>
  );
}

function OutfitClipped({ stage }: { stage: CasteStage }) {
  switch (stage) {
    case 1:
      return (
        <g>
          <path d="M112 252 H288 V330 H112Z" fill={C.burlap} />
          <path
            d="M112 326 q11 14 22 0 q11 14 22 0 q11 14 22 0 q11 14 22 0 q11 14 22 0 q11 14 22 0 q11 14 22 0 q11 14 22 0 V330 H112Z"
            fill={C.burlap}
            stroke={INK}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <g stroke={K.burlapDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.85}>
            <path d="M142 270 l8 6 M168 262 l8 6 M232 268 l8 6 M252 290 l8 6 M150 296 l8 6 M186 306 l8 6 M214 286 l8 6" />
          </g>
          <rect x={226} y={296} width={26} height={22} rx={4} fill={C.peachSoft} stroke={INK} strokeWidth={2.4} />
          <path d="M231 301 L247 313 M247 301 L231 313" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.75} />
          <path d="M176 250 Q200 270 224 250" fill="none" {...O25} />
          <path d="M200 262 V276" stroke={C.honey} strokeWidth={4} strokeLinecap="round" />
          <Hl d="M130 266 Q144 258 164 258" w={3} o={0.5} />
        </g>
      );
    case 2:
      return (
        <g>
          <path d="M112 250 H288 V338 H112Z" fill={C.peach} />
          <g stroke={C.peachDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.42}>
            {Array.from({ length: 14 }).map((_, i) => (
              <path key={i} d={`M${120 + i * 12.5} 262 V328`} />
            ))}
          </g>
          <rect x={112} y={324} width={176} height={16} fill={C.peachDark} opacity={0.6} />
          <path d="M112 324 H288" stroke={INK} strokeWidth={2.4} />
          <polygon points={starPoints(172, 296, 12, 5.4)} fill={C.honey} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <ellipse cx={200} cy={252} rx={30} ry={11} fill={C.cream} stroke={INK} strokeWidth={2.6} />
          <Hl d="M130 266 Q142 260 160 260" w={3} o={0.5} />
        </g>
      );
    case 3:
      return (
        <g>
          <path d="M112 250 H288 V338 H112Z" fill={C.cream} />
          <path d="M138 246 L196 250 L196 340 H128 Q122 300 138 246Z" fill={C.sky} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M262 246 L204 250 L204 340 H272 Q278 300 262 246Z" fill={C.sky} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M168 250 L200 284 L232 250 L218 246 L200 262 L182 246Z" fill={C.cream} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <g fill={C.honey} stroke={INK} strokeWidth={2}>
            <circle cx={211} cy={290} r={3.6} />
            <circle cx={211} cy={308} r={3.6} />
            <circle cx={211} cy={326} r={3.6} />
          </g>
          <path d="M150 304 H176" stroke={C.skyDark} strokeWidth={3} strokeLinecap="round" />
          <Hl d="M144 270 Q146 290 148 306" w={3} o={0.5} />
        </g>
      );
    case 4:
      return (
        <g>
          <path d="M112 250 H288 V338 H112Z" fill={C.cream} />
          <path d="M166 250 H234 V292 H266 V340 H134 V292 H166Z" fill={C.matcha} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <rect x={176} y={304} width={48} height={26} rx={7} fill={C.matchaDark} stroke={INK} strokeWidth={2.4} />
          <g transform="translate(200 316)">
            <path d="M-9 -6 H7 V4 Q7 9 1 9 H-3 Q-9 9 -9 4Z" fill={C.cream} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
            <path d="M7 -3 Q13 -3 13 2 Q13 6 7 5" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
            <path d="M-3 -9 Q0 -13 -3 -16 M3 -9 Q6 -13 3 -16" fill="none" stroke={C.cream} strokeWidth={1.8} strokeLinecap="round" />
          </g>
          <path d="M134 292 H266" stroke={INK} strokeWidth={2.4} />
          <Hl d="M174 262 V282" w={3} o={0.55} />
        </g>
      );
    case 5:
      return (
        <g>
          <path d="M112 250 H288 V340 H112Z" fill={C.cream} />
          <path d="M122 246 L194 250 L192 342 H116 Q110 296 122 246Z" fill={C.taroSoft} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M278 246 L206 250 L208 342 H284 Q290 296 278 246Z" fill={C.taroSoft} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
          <path d="M166 248 L196 296 L190 262Z M234 248 L204 296 L210 262Z" fill={C.taro} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M194 262 L206 262 L210 304 L200 316 L190 304Z" fill={C.peach} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <g fill={C.honey} stroke={INK} strokeWidth={2}>
            <circle cx={186} cy={324} r={3.6} />
            <circle cx={214} cy={324} r={3.6} />
          </g>
          <path d="M146 288 H168 V300 H146Z" fill={C.peach} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <Hl d="M130 270 Q132 296 134 316" w={3} o={0.55} />
        </g>
      );
    case 6:
      return (
        <g>
          <path d="M112 250 H288 V342 H112Z" fill={K.emerald} />
          <path d="M120 246 L196 252 L194 344 H114 Q106 296 120 246Z" fill={K.emerald} />
          <path d="M280 246 L204 252 L206 344 H286 Q294 296 280 246Z" fill={K.emerald} />
          <path d="M196 252 V344 M204 252 V344" stroke={C.honey} strokeWidth={4} />
          <path d="M120 246 Q108 296 114 344 M280 246 Q292 296 286 344" fill="none" stroke={K.emeraldDark} strokeWidth={8} opacity={0.55} />
          <g fill={C.honey} stroke={INK} strokeWidth={2.2}>
            {[270, 292, 314, 334].map((y) => (
              <g key={y}>
                <circle cx={184} cy={y} r={4.2} />
                <circle cx={216} cy={y} r={4.2} />
              </g>
            ))}
          </g>
          <path d="M142 296 H170 M230 296 H258" stroke={K.emeraldDark} strokeWidth={4} strokeLinecap="round" />
          <path d="M178 250 L200 278 L222 250 Q200 262 178 250Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <Hl d="M132 266 Q128 292 130 318" w={3} o={0.5} />
        </g>
      );
    case 7:
      return (
        <g>
          <path d="M112 250 H288 V342 H112Z" fill={K.velvetDark} />
          <path d="M150 246 L200 300 L250 246 L236 244 L200 276 L164 244Z" fill={C.cream} />
          <path d="M120 246 L186 250 L200 306 L196 344 H112Z" fill={K.velvetDark} />
          <path d="M280 246 L214 250 L200 306 L204 344 H288Z" fill={K.velvetDeep} />
          <path d="M150 246 L200 306 L168 250Z M250 246 L200 306 L232 250Z" fill={K.velvet} stroke={C.honey} strokeWidth={3.4} strokeLinejoin="round" />
          <path d="M196 300 V344 M204 300 V344" stroke={K.velvetDeep} strokeWidth={2} opacity={0.7} />
          <path d="M184 252 Q200 270 216 252 Q214 268 200 280 Q186 268 184 252Z" fill={C.cream} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <g fill={C.honey} stroke={INK} strokeWidth={2}>
            <circle cx={192} cy={322} r={3.8} />
            <circle cx={208} cy={322} r={3.8} />
          </g>
          <path d="M142 292 L162 292 L158 304 L146 304Z" fill={C.sky} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <g fill={C.honeySoft} opacity={0.75}>
            <circle cx={136} cy={324} r={2} />
            <circle cx={252} cy={318} r={2} />
            <circle cx={266} cy={290} r={2} />
            <circle cx={130} cy={274} r={2} />
          </g>
          <Hl d="M128 262 Q126 290 128 316" w={3} o={0.4} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M112 246 H288 V342 H112Z" fill={K.crimson} />
          <path d="M112 246 H188 L200 300 L212 246 H288 V342 H112Z" fill={K.crimson} />
          <path d="M186 246 L200 304 L214 246" fill="none" stroke={C.honey} strokeWidth={4.4} strokeLinejoin="round" />
          <path d="M200 304 V342" stroke={C.honey} strokeWidth={4.4} />
          <path d="M112 320 H288 V344 H112Z" fill={C.cream} />
          <g fill={INK}>
            <ellipse cx={128} cy={332} rx={3.4} ry={5} />
            <ellipse cx={156} cy={334} rx={3.4} ry={5} />
            <ellipse cx={184} cy={332} rx={3.4} ry={5} />
            <ellipse cx={216} cy={334} rx={3.4} ry={5} />
            <ellipse cx={244} cy={332} rx={3.4} ry={5} />
            <ellipse cx={272} cy={334} rx={3.4} ry={5} />
          </g>
          <path d="M112 320 H288" stroke={INK} strokeWidth={2.4} />
          <path d="M112 244 H288 V262 Q200 280 112 262Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <g fill={INK}>
            <ellipse cx={136} cy={254} rx={3} ry={4.4} />
            <ellipse cx={164} cy={262} rx={3} ry={4.4} />
            <ellipse cx={236} cy={262} rx={3} ry={4.4} />
            <ellipse cx={264} cy={254} rx={3} ry={4.4} />
          </g>
          <g transform="translate(200 296)">
            <Diamond s={9} />
          </g>
          <Hl d="M126 276 Q124 300 126 312" w={3} o={0.45} />
        </g>
      );
  }
}

function Outfit({ stage, species, uid }: { stage: CasteStage; species: PetSpecies; uid: string }) {
  const id = `${uid}-clip`;
  return (
    <g>
      <clipPath id={id}>
        <path d={BODY_CLIP[species]} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <OutfitClipped stage={stage} />
      </g>
      <path d={BODY_CLIP[species]} fill="none" {...O} />
    </g>
  );
}

/* ───────────────────────── Aura kemakmuran ───────────────────────── */

interface AuraTone {
  color: string;
  r: number;
  op: number;
}

const AURA_TONE: Record<CasteStage, AuraTone> = {
  1: { color: "#FFE27A", r: 120, op: 0.3 },
  2: { color: "#FFC800", r: 134, op: 0.34 },
  3: { color: "#38B6FF", r: 140, op: 0.3 },
  4: { color: "#FFC800", r: 146, op: 0.38 },
  5: { color: "#FFC800", r: 152, op: 0.44 },
  6: { color: "#8EE04A", r: 158, op: 0.4 },
  7: { color: "#FFC800", r: 166, op: 0.5 },
  8: { color: "#BDE7FF", r: 176, op: 0.62 },
};

function Orbit({
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
      <circle cx={cx} cy={cy} r={r + 20} fill="none" stroke="none" pointerEvents="none" />
      {children}
    </motion.g>
  );
}

function OrbitItems({ cx, cy, r, count, offset = 0, render }: { cx: number; cy: number; r: number; count: number; offset?: number; render: (i: number) => ReactNode }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const [x, y] = polar(cx, cy, r, offset + (360 / count) * i);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {render(i)}
          </g>
        );
      })}
    </>
  );
}

function SpinCoin({ r = 11, delay = 0 }: { r?: number; delay?: number }) {
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

function BobCoin({ x, y, delay = 0, r = 11 }: { x: number; y: number; delay?: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g animate={{ y: [-6, 6, -6] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay }}>
        <SpinCoin r={r} delay={delay} />
      </motion.g>
    </g>
  );
}

function Rays({ cx, cy, R, n, colors, op, dur, reverse = false }: { cx: number; cy: number; R: number; n: number; colors: string[]; op: number; dur: number; reverse?: boolean }) {
  const half = 180 / n / 2.2;
  return (
    <Orbit cx={cx} cy={cy} r={R} dur={dur} reverse={reverse}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (360 / n) * i;
        const [x1, y1] = polar(cx, cy, R, a - half);
        const [x2, y2] = polar(cx, cy, R, a + half);
        return <path key={i} d={`M${cx} ${cy} L${x1} ${y1} L${x2} ${y2}Z`} fill={colors[i % colors.length]} opacity={op} />;
      })}
    </Orbit>
  );
}

function Aura({ stage, uid, cy }: { stage: CasteStage; uid: string; cy: number }) {
  const cx = 200;
  const tone = AURA_TONE[stage];
  const gid = `${uid}-aura`;

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tone.color} stopOpacity={tone.op} />
          <stop offset="62%" stopColor={tone.color} stopOpacity={tone.op * 0.45} />
          <stop offset="100%" stopColor={tone.color} stopOpacity={0} />
        </radialGradient>
      </defs>

      {stage === 7 && <Rays cx={cx} cy={cy} R={176} n={12} colors={[C.honeySoft, C.honey]} op={0.28} dur={46} />}
      {stage === 8 && (
        <>
          <Rays cx={cx} cy={cy} R={190} n={16} colors={[C.skySoft, C.honeySoft]} op={0.42} dur={60} />
          <Rays cx={cx} cy={cy} R={150} n={8} colors={[C.cream]} op={0.35} dur={38} reverse />
        </>
      )}

      <motion.circle
        cx={cx}
        cy={cy}
        r={tone.r}
        fill={`url(#${gid})`}
        style={fb()}
        animate={{ scale: [0.96, 1.05, 0.96] }}
        transition={loop(3.6)}
      />

      {stage === 1 && (
        <>
          <Sparkle x={86} y={178} size={6} color={C.honeySoft} delay={0} />
          <Sparkle x={322} y={150} size={7} color={C.cream} delay={0.7} />
          <Sparkle x={300} y={252} size={5} color={C.honeySoft} delay={1.3} />
        </>
      )}

      {stage === 2 && (
        <>
          <Sparkle x={80} y={170} size={8} color={C.honey} delay={0} />
          <Sparkle x={328} y={140} size={9} color={C.honeySoft} delay={0.6} />
          <Sparkle x={316} y={262} size={6} color={C.cream} delay={1.2} />
          <Sparkle x={96} y={262} size={6} color={C.honey} delay={1.6} />
        </>
      )}

      {stage === 3 && (
        <>
          <Orbit cx={cx} cy={cy} r={128} dur={22}>
            <OrbitItems
              cx={cx}
              cy={cy}
              r={128}
              count={3}
              offset={-70}
              render={(i) => (
                <polygon points={starPoints(0, 0, 11, 4.8)} fill={i % 2 === 0 ? C.honey : C.sky} {...O25} />
              )}
            />
          </Orbit>
          <Sparkle x={74} y={196} size={7} color={C.skySoft} delay={0.3} />
          <Sparkle x={330} y={206} size={7} color={C.cream} delay={1} />
        </>
      )}

      {stage === 4 && (
        <>
          <g fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" opacity={0.85}>
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d={`M${262 + i * 16} 232 q-8 -14 0 -28 q8 -14 0 -28`}
                animate={{ y: [8, -14], opacity: [0, 0.9, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: i * 0.6 }}
              />
            ))}
          </g>
          <BobCoin x={78} y={160} delay={0.2} />
          <Sparkle x={326} y={130} size={8} color={C.honey} delay={0.9} />
          <Sparkle x={92} y={240} size={6} color={C.cream} delay={1.5} />
        </>
      )}

      {stage === 5 && (
        <>
          <BobCoin x={78} y={150} delay={0} />
          <BobCoin x={326} y={124} delay={0.8} />
          <Sparkle x={104} y={92} size={8} color={C.honey} delay={0.3} />
          <Sparkle x={310} y={214} size={7} color={C.honeySoft} delay={1} />
          <Sparkle x={74} y={236} size={6} color={C.cream} delay={1.5} />
        </>
      )}

      {stage === 6 && (
        <>
          <Orbit cx={cx} cy={cy} r={138} dur={30}>
            <circle cx={cx} cy={cy} r={138} fill="none" stroke={C.matchaDark} strokeWidth={3} strokeLinecap="round" strokeDasharray="4 12" opacity={0.7} />
          </Orbit>
          <Orbit cx={cx} cy={cy} r={138} dur={20}>
            <OrbitItems cx={cx} cy={cy} r={138} count={3} offset={-90} render={() => <SpinCoin r={11} />} />
          </Orbit>
          <Sparkle x={92} y={96} size={8} color={C.honey} delay={0.4} />
          <Sparkle x={318} y={290} size={7} color={C.matchaSoft} delay={1.2} />
        </>
      )}

      {stage === 7 && (
        <>
          <Orbit cx={cx} cy={cy} r={142} dur={26}>
            <OrbitItems cx={cx} cy={cy} r={142} count={4} offset={-45} render={() => <SpinCoin r={11} />} />
          </Orbit>
          <Sparkle x={70} y={150} size={9} color={C.honey} delay={0} />
          <Sparkle x={332} y={166} size={9} color={C.cream} delay={0.7} />
          <Sparkle x={300} y={70} size={7} color={C.honeySoft} delay={1.3} />
        </>
      )}

      {stage === 8 && (
        <>
          <Orbit cx={cx} cy={cy} r={150} dur={24} reverse>
            <OrbitItems cx={cx} cy={cy} r={150} count={4} offset={-45} render={() => <Diamond s={11} />} />
          </Orbit>
          <Orbit cx={cx} cy={cy} r={112} dur={34}>
            <OrbitItems cx={cx} cy={cy} r={112} count={3} offset={30} render={(i) => <polygon points={starPoints(0, 0, 9, 4)} fill={i % 2 === 0 ? C.honey : C.cream} {...O2} />} />
          </Orbit>
          <Sparkle x={62} y={120} size={10} color={C.cream} delay={0} />
          <Sparkle x={344} y={140} size={10} color={C.skySoft} delay={0.6} />
          <Sparkle x={330} y={50} size={7} color={C.honeySoft} delay={1.1} />
          <Sparkle x={72} y={60} size={7} color={C.honeySoft} delay={1.6} />
        </>
      )}
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  ILUSTRASI AKSESORIS (satu seni untuk avatar & etalase)
 * ═════════════════════════════════════════════════════════════ */

const NECK_Y: Record<PetSpecies, number> = { cat: 264, capybara: 270, fox: 272, red_panda: 266 };
const eyeHalf = (s: PetSpecies): number => (FACE[s].eyeR[0] - FACE[s].eyeL[0]) / 2;

/* ───────────── Topi (origin = pusat dasar topi, naik ke -y) ───────────── */

function HeadItem({ id }: { id: string }) {
  switch (id) {
    case "head_paper_hat":
      return (
        <g>
          <path d="M-48 2 L-40 -24 L-12 -34 L0 -50 L12 -34 L40 -24 L48 2 Q0 12 -48 2Z" fill="#F4ECD8" {...O} />
          <path d="M-40 -24 L0 -10 L40 -24" fill="none" stroke="#D8CBAE" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-30 -1 Q0 7 30 -1" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeDasharray="7 5" opacity={0.45} />
          <path d="M-22 -19 H-6 M4 -20 H22 M-12 -28 H8" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
          <Hl d="M-8 -42 L-2 -46" w={2.6} o={0.9} />
        </g>
      );
    case "head_graduation_cap":
      return (
        <g>
          <path d="M-32 -16 V2 Q0 16 32 2 V-16Z" fill="#5A4E44" {...O3} />
          <path d="M-54 -22 L0 -40 L54 -22 L0 -4Z" fill="#5A4E44" {...O} />
          <Hl d="M-42 -23 L-10 -33" w={3} o={0.45} />
          <path d="M0 -22 Q30 -18 42 -12 V8" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <path d="M0 -22 Q30 -18 42 -12 V8" fill="none" stroke={C.honey} strokeWidth={3.6} strokeLinecap="round" />
          <path d="M37 6 H47 L49 24 H35Z" fill={C.honey} {...O2} />
          <path d="M39 12 V22 M45 12 V22" stroke={C.honeyDark} strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={0} cy={-22} r={4.6} fill={C.honey} {...O2} />
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

/* ───────────── Kacamata (origin = tengah antara dua mata) ───────────── */

function EyesItem({ id, half }: { id: string; half: number }) {
  switch (id) {
    case "eyes_round_glasses": {
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
    case "eyes_sunglasses":
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
    case "eyes_monocle": {
      const r = 21;
      return (
        <g>
          <circle cx={half} cy={0} r={r} fill={C.skySoft} opacity={0.4} />
          <circle cx={half} cy={0} r={r} fill="none" stroke={INK} strokeWidth={6.6} />
          <circle cx={half} cy={0} r={r} fill="none" stroke={C.honey} strokeWidth={3.4} />
          <path d={`M${half - 12} -8 Q${half - 8} -14 ${half - 1} -15`} fill="none" stroke={C.cream} strokeWidth={2.8} strokeLinecap="round" />
          <path d={`M${half + 6} ${r - 1} Q${half + 30} ${r + 34} ${half + 8} ${r + 66}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${half + 6} ${r - 1} Q${half + 30} ${r + 34} ${half + 8} ${r + 66}`} fill="none" stroke={C.honey} strokeWidth={3} strokeLinecap="round" strokeDasharray="5 4" />
          <Sparkle x={half + 22} y={-18} size={7} color={C.honeySoft} delay={0.2} />
        </g>
      );
    }
    case "eyes_star_shades":
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
    default:
      return null;
  }
}

/* ───────────── Leher (origin = bawah dagu, tengah) ───────────── */

function NeckItem({ id }: { id: string }) {
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
    case "neck_gold_chain":
      return (
        <g>
          <path d="M-48 -2 Q0 58 48 -2" fill="none" stroke={INK} strokeWidth={9.5} strokeLinecap="round" />
          <path d="M-48 -2 Q0 58 48 -2" fill="none" stroke={C.honey} strokeWidth={6} strokeLinecap="round" />
          <path d="M-48 -2 Q0 58 48 -2" fill="none" stroke={C.honeyDark} strokeWidth={6} strokeLinecap="butt" strokeDasharray="3 7" opacity={0.7} />
          <path d="M0 27 V34" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <g transform="translate(0 44)">
            <Coin r={11} />
          </g>
          <Sparkle x={20} y={30} size={6} color={C.cream} delay={0.5} />
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
    default:
      return null;
  }
}

/* ───────────── Item tangan (origin = titik genggam, naik ke -y) ───────────── */

function HandItem({ id }: { id: string }) {
  switch (id) {
    case "hand_tin_can":
      return (
        <g>
          <path d="M-15 -4 V-40 H15 V-4 Q0 4 -15 -4Z" fill={C.steel} {...O3} />
          <path d="M-15 -14 Q0 -8 15 -14 M-15 -28 Q0 -22 15 -28" fill="none" stroke={C.steelDark} strokeWidth={2.4} strokeLinecap="round" />
          <ellipse cx={0} cy={-40} rx={15} ry={5} fill={C.steelDark} {...O3} />
          <ellipse cx={-4} cy={-46} rx={8} ry={3.2} fill={C.honey} {...O2} />
          <ellipse cx={6} cy={-49} rx={7} ry={3} fill={C.honeySoft} {...O2} />
          <rect x={-10} y={-34} width={20} height={14} rx={3} fill={C.cream} stroke={INK} strokeWidth={2} />
          <circle cx={0} cy={-27} r={4.4} fill={C.honey} stroke={INK} strokeWidth={1.8} />
          <Hl d="M-10 -38 V-10" w={2.8} o={0.6} />
        </g>
      );
    case "hand_boba":
      return (
        <g>
          <Duo d="M-1 -30 L12 -96" inner={C.peach} ow={7} iw={3.8} />
          <path d="M-17 -60 H17 L12 -4 Q0 2 -12 -4Z" fill={C.cream} fillOpacity={0.85} {...O3} />
          <path d="M-15 -46 Q0 -42 15 -46 L12.4 -5 Q0 0 -12.4 -5Z" fill={C.taroSoft} />
          <path d="M-15 -46 Q0 -41 15 -46" fill="none" stroke={C.taro} strokeWidth={2.6} strokeLinecap="round" />
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
        </g>
      );
    case "hand_matcha_latte":
      return (
        <g>
          <ellipse cx={0} cy={-2} rx={27} ry={6} fill={C.cream} {...O25} />
          <path d="M20 -34 Q36 -34 36 -22 Q36 -10 18 -14" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <path d="M20 -34 Q36 -34 36 -22 Q36 -10 18 -14" fill="none" stroke={C.cream} strokeWidth={3} strokeLinecap="round" />
          <path d="M-20 -38 H20 V-16 Q20 -4 6 -4 H-6 Q-20 -4 -20 -16Z" fill={C.cream} {...O3} />
          <path d="M-20 -25 H20" stroke={C.matchaSoft} strokeWidth={5} />
          <ellipse cx={0} cy={-38} rx={20} ry={6} fill={C.matcha} {...O25} />
          <path d="M0 -36 l-5 -3.4 q-3 -4.2 2 -5 q3 -0.4 3 2.8 q0 -3.2 3 -2.8 q5 0.8 2 5Z" fill={C.cream} />
          <g fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round">
            {[0, 1].map((i) => (
              <motion.path
                key={i}
                d={`M${-6 + i * 12} -46 q-5 -8 0 -16 q5 -8 0 -16`}
                animate={{ y: [4, -10], opacity: [0, 0.9, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: i * 0.8 }}
              />
            ))}
          </g>
          <Hl d="M-14 -34 V-18" w={3} o={0.7} />
        </g>
      );
    case "hand_gem_scepter":
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
    default:
      return null;
  }
}

/* ───────────── Kendaraan / alas ───────────── */

function Wheel({ cx, cy, r, tire = C.wheel, rim = C.cream }: { cx: number; cy: number; r: number; tire?: string; rim?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={tire} {...O} strokeWidth={r > 14 ? 3.5 : 3} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill={rim} stroke={INK} strokeWidth={2.2} />
      <circle cx={cx} cy={cy} r={r * 0.22} fill={C.honey} stroke={INK} strokeWidth={2} />
      <path d={`M${cx - r * 0.5} ${cy} H${cx + r * 0.5} M${cx} ${cy - r * 0.5} V${cy + r * 0.5}`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" opacity={0.4} />
    </g>
  );
}

const VEHICLE_WAGON: SeatSpec = {
  lift: 12,
  back: (
    <g>
      <path d="M96 346 L44 314" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M96 346 L44 314" fill="none" stroke={C.woodLight} strokeWidth={5} strokeLinecap="round" />
      <circle cx={42} cy={313} r={6} fill={C.peach} {...O3} />
      <path d="M104 328 L82 300 L128 292 L148 324Z" fill={C.cardboardLight} {...O3} />
      <path d="M296 328 L318 300 L272 292 L252 324Z" fill={C.cardboardLight} {...O3} />
      <path d="M100 324 H300 V350 H100Z" fill={C.cardboardDark} {...O} />
    </g>
  ),
  front: (
    <g>
      <path d="M96 334 H304 L298 356 H102Z" fill={C.cardboard} {...O} />
      <path d="M184 334 H216 V352 H184Z" fill={C.cream} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" opacity={0.92} />
      <g transform="translate(144 345)">
        <Coin r={7.5} />
      </g>
      <g transform="translate(256 345)">
        <Coin r={7.5} />
      </g>
      <Hl d="M104 339 H160" w={3} o={0.6} />
      <Wheel cx={132} cy={356} r={10} />
      <Wheel cx={268} cy={356} r={10} />
    </g>
  ),
};

const VEHICLE_SKATE: SeatSpec = {
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
      <Wheel cx={130} cy={363} r={9} tire={C.sky} />
      <Wheel cx={270} cy={363} r={9} tire={C.sky} />
      <Hl d="M80 340 Q84 343 98 343" w={2.8} o={0.7} />
    </g>
  ),
};

const VEHICLE_SCOOTER: SeatSpec = {
  lift: 36,
  back: (
    <g>
      <Wheel cx={92} cy={344} r={22} />
      <Wheel cx={300} cy={344} r={22} />
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
        fill={K.mint}
        {...O}
      />
      <path d="M118 262 Q122 300 130 326" fill="none" stroke={K.mintDark} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <path d="M150 342 H300" stroke={C.cream} strokeWidth={4.4} strokeLinecap="round" opacity={0.85} />
      <Hl d="M114 266 Q116 286 122 302" w={3.4} o={0.7} />
      <path d="M144 322 Q150 316 160 316 H284 Q296 316 300 322Z" fill="#8A5A44" {...O3} />
      <Duo d="M92 252 H138" inner={C.steel} ow={8} iw={4.6} />
      <circle cx={92} cy={252} r={5.4} fill={C.peach} {...O25} />
      <circle cx={138} cy={252} r={5.4} fill={C.peach} {...O25} />
      <circle cx={114} cy={274} r={7.4} fill={C.honey} {...O25} />
      <circle cx={112} cy={272} r={2.4} fill={C.cream} />
      <rect x={112} y={346} width={36} height={8} rx={4} fill={K.mintDark} {...O25} />
    </g>
  ),
};

const VEHICLE_CAR: SeatSpec = {
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

const VEHICLES: Record<string, SeatSpec> = {
  vehicle_cardboard_wagon: VEHICLE_WAGON,
  vehicle_skateboard: VEHICLE_SKATE,
  vehicle_scooter: VEHICLE_SCOOTER,
  vehicle_retro_car: VEHICLE_CAR,
};

/* ───────────── Dekorasi latar (koordinat absolut di artboard) ───────────── */

function DecorItem({ id }: { id: string }) {
  switch (id) {
    case "decor_potted_plant":
      return (
        <g>
          <motion.g style={fb(0.5, 1)} animate={{ rotate: [-3, 3, -3] }} transition={loop(4)}>
            <path d="M58 334 Q38 304 48 266 Q70 296 58 334Z" fill={C.matcha} {...O3} />
            <path d="M58 334 Q80 300 74 262 Q52 290 58 334Z" fill={C.matchaSoft} {...O3} />
            <path d="M58 334 Q56 296 62 246 Q82 286 58 334Z" fill={C.matcha} {...O3} />
            <path d="M58 334 Q58 296 61 252" fill="none" stroke={C.matchaDark} strokeWidth={2.4} strokeLinecap="round" />
            <circle cx={64} cy={242} r={7} fill={C.honey} {...O25} />
            <circle cx={64} cy={242} r={2.8} fill={C.peach} />
          </motion.g>
          <path d="M34 336 H82 L76 366 H40Z" fill={C.peach} {...O} />
          <rect x={30} y={328} width={56} height={13} rx={5} fill={C.peachDark} {...O3} />
          <Hl d="M42 349 L45 360" w={3} o={0.65} />
        </g>
      );
    case "decor_bookshelf":
      return (
        <g>
          <rect x={308} y={214} width={76} height={152} rx={6} fill={C.woodDark} {...O} />
          <rect x={316} y={222} width={60} height={136} rx={3} fill={C.woodLight} stroke={INK} strokeWidth={2.4} />
          <path d="M316 266 H376 M316 312 H376" stroke={INK} strokeWidth={3.4} />
          <g stroke={INK} strokeWidth={2.2} strokeLinejoin="round">
            <rect x={320} y={236} width={9} height={30} rx={2} fill={C.sky} />
            <rect x={330} y={242} width={9} height={24} rx={2} fill={C.peach} />
            <rect x={340} y={234} width={10} height={32} rx={2} fill={C.matcha} />
            <rect x={351} y={246} width={9} height={20} rx={2} fill={C.taro} />
            <rect x={361} y={238} width={10} height={28} rx={2} fill={C.honey} />
            <rect x={320} y={278} width={12} height={34} rx={2} fill={C.taro} />
            <rect x={333} y={284} width={10} height={28} rx={2} fill={C.sky} />
            <rect x={344} y={276} width={10} height={36} rx={2} fill={C.peach} />
          </g>
          <rect x={358} y={290} width={16} height={22} rx={5} fill={C.cream} fillOpacity={0.85} {...O25} />
          <ellipse cx={366} cy={308} rx={5.4} ry={2.4} fill={C.honey} stroke={INK} strokeWidth={1.6} />
          <ellipse cx={366} cy={303} rx={5.4} ry={2.4} fill={C.honeySoft} stroke={INK} strokeWidth={1.6} />
          <path d="M322 352 Q330 330 338 352Z" fill={C.matcha} {...O25} />
          <path d="M336 352 Q346 322 356 352Z" fill={C.matchaSoft} {...O25} />
          <Hl d="M312 226 V256" w={3} o={0.5} />
        </g>
      );
    case "decor_balloons":
      return (
        <g>
          {(
            [
              { x: 76, y: 118, c: C.peach, d: 0, s: "M76 144 Q68 200 86 240 T84 306" },
              { x: 332, y: 96, c: C.sky, d: 0.6, s: "M332 122 Q344 180 322 230 T330 300" },
              { x: 108, y: 64, c: C.honey, d: 1.2, s: "M108 90 Q118 140 100 190 T112 260" },
              { x: 360, y: 168, c: C.taro, d: 1.8, s: "M360 194 Q352 240 366 280 T356 330" },
            ] as const
          ).map((b) => (
            <motion.g key={b.x} animate={{ y: [-5, 5, -5] }} transition={loop(3.4, { delay: b.d })}>
              <path d={b.s} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.65} />
              <motion.g style={fb(0.5, 1)} animate={{ rotate: [-3, 3, -3] }} transition={loop(3.4, { delay: b.d })}>
                <ellipse cx={b.x} cy={b.y} rx={21} ry={26} fill={b.c} {...O} />
                <path d={`M${b.x - 4} ${b.y + 25} L${b.x - 6} ${b.y + 32} H${b.x + 6} L${b.x + 4} ${b.y + 25}Z`} fill={b.c} {...O25} />
                <path d={`M${b.x - 13} ${b.y - 6} Q${b.x - 11} ${b.y - 16} ${b.x - 3} ${b.y - 19}`} fill="none" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round" opacity={0.85} />
              </motion.g>
            </motion.g>
          ))}
        </g>
      );
    case "decor_chandelier":
      return (
        <motion.g style={fb(0.5, 0)} animate={{ rotate: [-1.6, 1.6, -1.6] }} transition={loop(4.4)}>
          <path d="M200 0 V12" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <path d="M200 0 V12" stroke={C.honey} strokeWidth={2.2} strokeLinecap="round" />
          <ellipse cx={200} cy={15} rx={19} ry={6} fill={C.honey} {...O3} />
          <Duo d="M200 19 Q158 20 146 36 M200 19 Q242 20 254 36 M200 19 V42" inner={C.honey} ow={6.4} iw={3.4} />
          <ellipse cx={146} cy={34} rx={6.4} ry={5} fill={C.cream} {...O25} />
          <ellipse cx={254} cy={34} rx={6.4} ry={5} fill={C.cream} {...O25} />
          <ellipse cx={200} cy={42} rx={6.4} ry={5} fill={C.cream} {...O25} />
          <g transform="translate(146 52)">
            <Diamond s={7} />
          </g>
          <g transform="translate(254 52)">
            <Diamond s={7} />
          </g>
          <g transform="translate(174 48)">
            <Diamond s={6} />
          </g>
          <g transform="translate(226 48)">
            <Diamond s={6} />
          </g>
          <g transform="translate(200 58)">
            <Diamond s={8} />
          </g>
          <Sparkle x={166} y={34} size={7} color={C.cream} delay={0} />
          <Sparkle x={236} y={30} size={6} color={C.skySoft} delay={0.9} />
        </motion.g>
      );
    default:
      return null;
  }
}

/* ───────────── Penempatan pada avatar ───────────── */

function HeadLayer({ id, species }: { id: string; species: PetSpecies }) {
  return (
    <g transform={`translate(200 ${138 + FACE[species].headDY})`}>
      <HeadItem id={id} />
    </g>
  );
}

function EyesLayer({ id, species }: { id: string; species: PetSpecies }) {
  return (
    <g transform={`translate(200 ${FACE[species].eyeL[1]})`}>
      <EyesItem id={id} half={eyeHalf(species)} />
    </g>
  );
}

function NeckLayer({ id, species }: { id: string; species: PetSpecies }) {
  return (
    <g transform={`translate(200 ${NECK_Y[species]})`}>
      <NeckItem id={id} />
    </g>
  );
}

function HandLayer({ id }: { id: string }) {
  return (
    <g transform="translate(250 318)">
      <motion.g animate={{ y: [0, -2.5, 0] }} transition={loop(2.4)}>
        <HandItem id={id} />
      </motion.g>
    </g>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  AccessoryPreviewIcon — preview mandiri untuk Shop & Galeri
 * ═════════════════════════════════════════════════════════════ */

const PREVIEW_BOX: Record<string, string> = {
  head_paper_hat: "135 70 130 130",
  head_graduation_cap: "135 66 130 130",
  head_top_hat: "135 52 130 130",
  head_diamond_crown: "135 76 130 130",
  eyes_round_glasses: "112 122 176 176",
  eyes_sunglasses: "112 122 176 176",
  eyes_monocle: "170 176 130 130",
  eyes_star_shades: "112 122 176 176",
  neck_bandana: "140 232 120 120",
  neck_bowtie: "140 230 120 120",
  neck_gold_chain: "140 236 120 120",
  neck_diamond_pendant: "140 236 120 120",
  hand_tin_can: "216 262 68 68",
  hand_boba: "194 212 112 112",
  hand_matcha_latte: "212 252 80 80",
  hand_gem_scepter: "190 180 140 140",
  vehicle_cardboard_wagon: "21 267 300 150",
  vehicle_skateboard: "50 312 300 100",
  vehicle_scooter: "36 214 320 214",
  vehicle_retro_car: "10 240 380 160",
  decor_potted_plant: "-12 232 140 140",
  decor_bookshelf: "261 196 170 170",
  decor_balloons: "36 20 360 330",
  decor_chandelier: "128 -6 144 84",
};

function PreviewArt({ item }: { item: AccessoryItem }) {
  switch (item.slot) {
    case "head":
      return <HeadLayer id={item.id} species="cat" />;
    case "eyes":
      return <EyesLayer id={item.id} species="cat" />;
    case "neck":
      return <NeckLayer id={item.id} species="cat" />;
    case "hand":
      return <HandLayer id={item.id} />;
    case "vehicle": {
      const v = VEHICLES[item.id];
      return v ? (
        <>
          {v.back}
          {v.front}
        </>
      ) : null;
    }
    default:
      return <DecorItem id={item.id} />;
  }
}

export function AccessoryPreviewIcon({ accessoryId, className }: AccessoryPreviewIconProps) {
  const item = getAccessory(accessoryId);

  if (!item) {
    return (
      <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Aksesoris tidak dikenal">
        <title>Aksesoris tidak dikenal</title>
        <circle cx={32} cy={32} r={24} fill={C.taroSoft} {...O} />
        <path d="M24 26 Q24 17 32 17 Q41 17 41 26 Q41 31 35 34 Q32 36 32 40" fill="none" {...O} />
        <circle cx={32} cy={47} r={2.6} fill={INK} />
      </svg>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox={PREVIEW_BOX[item.id] ?? `0 0 ${VB_W} ${VB_H}`}
        className={className}
        role="img"
        aria-label={item.name}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{item.name}</title>
        <PreviewArt item={item} />
      </svg>
    </MotionConfig>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  MOOD, SILUET RAHASIA, PAPAN NAMA, KOMPONEN UTAMA
 * ═════════════════════════════════════════════════════════════ */

const DISPLAY_FONT = 'var(--font-fredoka, "Fredoka"), "Nunito", ui-rounded, system-ui, sans-serif';

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

function Paws({ species, holding }: { species: PetSpecies; holding: boolean }) {
  const fill = FACE[species].pawColor;
  return (
    <g>
      <Paw cx={holding ? 168 : 172} cy={316} fill={fill} />
      {!holding && <Paw cx={228} cy={316} fill={fill} />}
    </g>
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
              <polygon points={starPoints(104 + i * 96, 150 - (i % 2) * 14, 8, 3.6)} fill={i === 1 ? C.peach : C.honey} {...O2} />
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

/* ───────────── Siluet rahasia ───────────── */

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
    <filter
      id={`${uid}-fogblur`}
      filterUnits="userSpaceOnUse"
      x={-40}
      y={200}
      width={VB_W + 80}
      height={220}
    >
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

/* ───────────── Papan nama ───────────── */

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

  const headId = pick("head");
  const eyesId = pick("eyes");
  const neckId = pick("neck");
  const handId = pick("hand");
  const vehicleId = pick("vehicle");
  const decorId = pick("decor");

  const seat: SeatSpec = (vehicleId ? VEHICLES[vehicleId] : undefined) ?? SEATS[stage];
  const lift = seat.lift;

  const speciesMeta = PET_SPECIES_META[species];
  const casteMeta = CASTE_META[stage];
  const name = customName?.trim() || speciesMeta.defaultName;
  const plateLabel = locked ? "???" : name;
  const plateBadge = locked ? "?" : String(stage);

  const ariaLabel = locked
    ? `Siluet rahasia: kasta ke-${stage} belum terbuka`
    : `${name}, ${speciesMeta.name}, kasta ke-${stage} ${casteMeta.name}, suasana ${effMood.replace("_", " ")}`;

  const lower = (
    <PetMotion mood={effMood}>
      <g transform={`translate(0 ${-lift})`}>
        <OutfitBack stage={stage} />
        <PetTail species={species} mood={effMood} />
        <PetBody species={species} />
        <Outfit stage={stage} species={species} uid={uid} />
      </g>
    </PetMotion>
  );

  const upper = (
    <PetMotion mood={effMood}>
      <g transform={`translate(0 ${-lift})`}>
        <Paws species={species} holding={Boolean(handId)} />
        <PetHead species={species} mood={effMood} />
        <Face species={species} mood={effMood} uid={uid} />
        {neckId && <NeckLayer id={neckId} species={species} />}
        {eyesId && <EyesLayer id={eyesId} species={species} />}
        {headId && <HeadLayer id={headId} species={species} />}
        {handId && (
          <>
            <HandLayer id={handId} />
            <Paw cx={250} cy={323} rx={14} ry={12} fill={FACE[species].pawColor} />
          </>
        )}
        {!locked && <MoodOverlay mood={effMood} />}
      </g>
    </PetMotion>
  );

  const scene = (
    <>
      {seat.back}
      {lower}
      {seat.front}
      {upper}
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        className={className}
        role="img"
        aria-label={ariaLabel}
        style={{ overflow: "visible" }}
      >
        <title>{ariaLabel}</title>
        <desc>{locked ? "Karakter ini masih terkunci. Capai kasta ini untuk membukanya." : `${casteMeta.description} Aura: ${casteMeta.aura}.`}</desc>

        {locked ? (
          <>
            <defs>
              <SilhouetteFilter uid={uid} animate={!reduce} />
            </defs>
            <SecretFogBack uid={uid} />
            <ellipse cx={200} cy={369} rx={112 + lift} ry={9} fill={INK} opacity={0.18} />
            <g filter={`url(#${uid}-ghost)`}>{seat.back}</g>
            <g filter={`url(#${uid}-sil)`}>{lower}</g>
            <g filter={`url(#${uid}-ghost)`}>{seat.front}</g>
            <g filter={`url(#${uid}-sil)`}>{upper}</g>
            <SecretFogFront uid={uid} />
            <MysteryBadge />
          </>
        ) : (
          <>
            <Aura stage={stage} uid={uid} cy={232 - lift} />
            {decorId && <DecorItem id={decorId} />}
            <ellipse cx={200} cy={369} rx={112 + lift} ry={9} fill={INK} opacity={0.14} />
            {scene}
          </>
        )}

        <Nameplate label={plateLabel} badge={plateBadge} />
      </svg>
    </MotionConfig>
  );
}

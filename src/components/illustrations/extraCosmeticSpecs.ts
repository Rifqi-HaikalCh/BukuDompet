/**
 * Data 32 item Butik tambahan (16 aura + 16 latar), 2 aura + 2 latar per fase pertumbuhan.
 * Murni data (tanpa JSX) sehingga aman diimpor katalog. Harga mengikuti kurva Butik per fase.
 */
export type ExtraStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ExtraCosmeticSpec {
  id: string;
  name: string;
  slot: "aura" | "background";
  stageRequirement: ExtraStage;
  pricePoints: number;
  description: string;
}

/** Harga aura per fase (sedikit di bawah pakaian), latar sedikit di atasnya. */
const AURA_PRICE: Record<ExtraStage, number> = { 1: 500, 2: 900, 3: 1500, 4: 2400, 5: 3600, 6: 5500, 7: 8500, 8: 14000 };
const BG_PRICE: Record<ExtraStage, number> = { 1: 700, 2: 1200, 3: 2000, 4: 3200, 5: 4800, 6: 7200, 7: 11000, 8: 18000 };

const aura = (id: string, name: string, stage: ExtraStage, description: string): ExtraCosmeticSpec => ({
  id,
  name,
  slot: "aura",
  stageRequirement: stage,
  pricePoints: AURA_PRICE[stage],
  description,
});

const bg = (id: string, name: string, stage: ExtraStage, description: string): ExtraCosmeticSpec => ({
  id,
  name,
  slot: "background",
  stageRequirement: stage,
  pricePoints: BG_PRICE[stage],
  description,
});

export const EXTRA_COSMETIC_SPECS: readonly ExtraCosmeticSpec[] = [
  /* ── AURA ── */
  aura("aura_rainbow_drizzle", "Aura Gerimis Pelangi", 1, "Tetesan hujan pastel jatuh pelan di bawah pelangi mungil."),
  aura("aura_dandelion_seeds", "Aura Biji Dandelion", 1, "Biji dandelion putih melayang tertiup angin sepoi-sepoi."),
  aura("aura_autumn_leaves", "Aura Daun Musim Gugur", 2, "Daun oranye dan merah berguguran lembut di sekeliling pet."),
  aura("aura_sun_rays", "Aura Sinar Mentari", 2, "Sinar emas berputar pelan seperti matahari kecil yang hangat."),
  aura("aura_paw_prints", "Aura Jejak Kaki Mungil", 3, "Jejak kaki lucu muncul dan menghilang membentuk lingkaran."),
  aura("aura_rainbow_ring", "Aura Cincin Pelangi", 3, "Cincin pelangi berputar berlawanan arah di sekitar pet."),
  aura("aura_moon_stars", "Aura Bulan dan Bintang", 4, "Bulan sabit melayang ditemani bintang-bintang yang berkedip."),
  aura("aura_cotton_clouds", "Aura Awan Kapas", 4, "Awan-awan mungil melayang naik turun seperti permen kapas."),
  aura("aura_party_balloons", "Aura Balon Pesta", 5, "Balon warna-warni bergoyang ceria di sekeliling pet."),
  aura("aura_electric_sparks", "Aura Percikan Petir", 5, "Kilatan petir kecil yang berkedip penuh semangat, aman dan tidak menyengat."),
  aura("aura_angel_feathers", "Aura Bulu Malaikat", 6, "Bulu putih lembut jatuh perlahan dari langit."),
  aura("aura_gem_orbit", "Aura Permata Mengorbit", 6, "Permata berkilau mengorbit dalam dua lingkaran berlawanan arah."),
  aura("aura_confetti_party", "Aura Konfeti Pesta", 7, "Konfeti berwarna-warni berhamburan merayakan setiap pencapaian."),
  aura("aura_aurora_ribbons", "Aura Pita Aurora", 7, "Pita cahaya hijau, biru, dan ungu menari bergelombang."),
  aura("aura_crown_halo", "Aura Mahkota Cahaya", 8, "Lingkaran cahaya emas dengan tiga mahkota mungil yang berputar."),
  aura("aura_shooting_comets", "Aura Komet Berlari", 8, "Komet berekor biru berlari melintasi langit di sekitar pet."),

  /* ── LATAR ── */
  bg("bg_meadow_morning", "Padang Rumput Pagi", 1, "Padang hijau dengan bunga bergoyang dan matahari pagi yang cerah."),
  bg("bg_rainy_window", "Jendela Hujan Cozy", 1, "Kamar hangat dengan jendela berembun, tanaman kecil, dan secangkir cokelat panas."),
  bg("bg_bakery_warm", "Toko Roti Hangat", 2, "Rak roti, oven menyala, dan aroma kue yang mengepul."),
  bg("bg_sunflower_field", "Ladang Bunga Matahari", 2, "Bunga matahari raksasa menoleh ke matahari, ditemani lebah."),
  bg("bg_playground", "Taman Bermain", 3, "Perosotan, ayunan yang bergoyang, dan kotak pasir untuk bermain."),
  bg("bg_aquarium_blue", "Akuarium Biru", 3, "Ikan-ikan berenang di antara rumput laut dan gelembung."),
  bg("bg_camping_night", "Perkemahan Malam", 4, "Tenda, api unggun yang menari, dan langit penuh bintang."),
  bg("bg_farm_happy", "Peternakan Ceria", 4, "Lumbung merah, kincir angin berputar, dan tumpukan jerami."),
  bg("bg_autumn_park", "Taman Musim Gugur", 5, "Bangku kayu di bawah pohon oranye dengan daun berguguran."),
  bg("bg_lantern_festival", "Pasar Malam Lampion", 5, "Lampion bergoyang di atas lapak-lapak pasar malam yang meriah."),
  bg("bg_mountain_dawn", "Puncak Gunung Fajar", 6, "Matahari terbit di antara pegunungan bersalju dan kabut tipis."),
  bg("bg_moon_base", "Stasiun Bulan Mungil", 6, "Kubah stasiun di bulan dengan bumi biru berputar di langit."),
  bg("bg_coral_reef", "Dasar Laut Karang", 7, "Karang warna-warni, kawanan ikan, dan ubur-ubur yang berdenyut."),
  bg("bg_fairy_castle", "Kastil Dongeng", 7, "Kastil pastel di bawah pelangi dengan bendera yang berkibar."),
  bg("bg_aurora_lake", "Danau Aurora", 8, "Cahaya aurora menari di atas danau tenang dan pegunungan malam."),
  bg("bg_rainbow_summit", "Puncak Pelangi Emas", 8, "Puncak di atas lautan awan, dipeluk pelangi dan sinar emas."),
];

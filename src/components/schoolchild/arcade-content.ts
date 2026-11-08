/**
 * Bank soal Arcade Sekolah (kelas 3 SD → kelas 5-6 SD). Murni data + pembangun soal deterministik:
 * tidak memakai Math.random; acakan selalu dari seed teks (anak + mode + level + putaran).
 *
 * Versi 5.2: setiap mode punya 5 level. Soal pilihan ganda diambil bergilir dari "kolam level"
 * (level ini + level sebelumnya) memakai `cursor`, jadi soal tidak berulang selama kolam belum habis.
 * Mode hitungan (kembalian, target celengan, deret, jam) dibangkitkan dari aturan per level sehingga
 * angkanya tidak pernah habis.
 */
import { hashString, mulberry32, seededShuffle } from "@/lib/quest-engine";
import type { AnimalId, BiomeGlyphId } from "@/components/illustrations/GlyphCreatures";
import { BANK_EXTRAS, type LevelExtras, type Raw } from "./arcade-bank";

/* ───────────────────────── Tipe ───────────────────────── */

export type ChoiceVisual =
  | { kind: "clock"; hour: number; minute: number }
  | { kind: "silhouette"; animal: AnimalId };

export interface ChoiceItem {
  id: string;
  prompt: string;
  visual?: ChoiceVisual;
  /** Sudah diacak deterministik. */
  options: string[];
  answerIndex: number;
  /** Penjelasan singkat setelah menjawab. */
  explain?: string;
}

/** Konteks pembangunan soal untuk satu ronde. */
export interface BuildCtx {
  /** Benih dasar sesi (tanpa cursor). */
  seed: string;
  /** Level kesulitan 1..5. */
  level: number;
  /** Nomor putaran bank soal pada level ini (naik tiap ronde baru). */
  cursor: number;
}

export const ROUNDS = 5;

/** Ambil `n` anggota berurutan dari kolam yang diacak; tiap putaran penuh kolam diacak ulang. */
function pickWindow<T>(pool: readonly T[], seed: string, cursor: number, n: number): T[] {
  if (pool.length === 0) return [];
  const out: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    const g = cursor * n + i;
    const epoch = Math.floor(g / pool.length);
    const order = seededShuffle(pool.map((_, idx) => idx), `${seed}|e${epoch}`);
    let idx = order[g % pool.length];
    // hindari soal kembar di satu ronde saat melewati batas putaran
    let guard = 0;
    while (used.has(idx) && used.size < pool.length && guard < pool.length) {
      guard += 1;
      idx = order[(g + guard) % pool.length];
    }
    used.add(idx);
    out.push(pool[idx]);
  }
  return out;
}

function fromRaw(modeId: string, raws: readonly Raw[], ctx: BuildCtx): ChoiceItem[] {
  return pickWindow(raws, ctx.seed, ctx.cursor, ROUNDS).map((r, i) => {
    const [prompt, answer, ...wrong] = r;
    const options = seededShuffle([answer, ...wrong], `${ctx.seed}|c${ctx.cursor}|opt|${i}`);
    return {
      id: `${modeId}-L${ctx.level}-${ctx.cursor}-${i}`,
      prompt,
      options,
      answerIndex: options.indexOf(answer),
      explain: `Jawaban yang benar: ${answer}.`,
    };
  });
}

/* ───────────────────────── Bahasa ───────────────────────── */

const ENGLISH: Raw[] = [
  ["Apa arti kata “apple” dalam bahasa Indonesia?", "Apel", "Jeruk", "Pisang"],
  ["Apa arti kata “book”?", "Buku", "Pensil", "Tas"],
  ["Apa arti kata “cat”?", "Kucing", "Anjing", "Burung"],
  ["Apa arti kata “red”?", "Merah", "Biru", "Hijau"],
  ["Apa arti kata “water”?", "Air", "Api", "Angin"],
  ["Apa arti kata “house”?", "Rumah", "Sekolah", "Pasar"],
  ["Apa arti kata “happy”?", "Senang", "Sedih", "Marah"],
  ["Apa arti kata “mother”?", "Ibu", "Ayah", "Kakak"],
  ["Apa arti kata “eat”?", "Makan", "Minum", "Tidur"],
  ["Apa bahasa Inggris dari “biru”?", "Blue", "Black", "Brown"],
];

const ANTONYM: Raw[] = [
  ["Lawan kata “besar” adalah ...", "Kecil", "Tinggi", "Panjang"],
  ["Lawan kata “panas” adalah ...", "Dingin", "Hangat", "Basah"],
  ["Lawan kata “tinggi” adalah ...", "Rendah", "Besar", "Jauh"],
  ["Lawan kata “cepat” adalah ...", "Lambat", "Kuat", "Lincah"],
  ["Lawan kata “terang” adalah ...", "Gelap", "Redup", "Silau"],
  ["Lawan kata “senang” adalah ...", "Sedih", "Gembira", "Riang"],
  ["Lawan kata “jauh” adalah ...", "Dekat", "Lama", "Sempit"],
  ["Lawan kata “kuat” adalah ...", "Lemah", "Berat", "Keras"],
  ["Lawan kata “baru” adalah ...", "Lama", "Bagus", "Bersih"],
  ["Lawan kata “penuh” adalah ...", "Kosong", "Berat", "Banyak"],
];

const SPELLING: Raw[] = [
  ["Mana tulisan yang benar?", "Terima kasih", "Terimakasih", "Terima kasi"],
  ["Mana tulisan yang benar?", "Di rumah", "Dirumah", "Di-rumah"],
  ["Mana tulisan yang benar?", "Ke pasar", "Kepasar", "Ke-pasar"],
  ["Mana tulisan yang benar?", "Mengapa", "Mengapah", "Menggapa"],
  ["Mana tulisan yang benar?", "Nasihat", "Nasehat", "Nasiat"],
  ["Mana tulisan yang benar?", "Kamis", "Kemis", "Khamis"],
  ["Mana tulisan yang benar?", "Sepatu", "Sepatuh", "Sepattu"],
  ["Mana tulisan yang benar?", "Tahun", "Taun", "Tahoen"],
  ["Mana tulisan yang benar?", "Jumat", "Jum'at", "Jumaat"],
  ["Mana tulisan yang benar?", "Silakan", "Silahkan", "Sillakan"],
];

const PROVERB: Raw[] = [
  ["Rajin pangkal ...", "pandai", "kaya", "senang"],
  ["Berakit-rakit ke hulu, berenang-renang ke ...", "tepian", "seberang", "lautan"],
  ["Sedikit demi sedikit, lama-lama menjadi ...", "bukit", "gunung", "sungai"],
  ["Ada gula ada ...", "semut", "lalat", "kucing"],
  ["Tak ada gading yang ...", "tak retak", "tak patah", "tak putih"],
  ["Air beriak tanda ...", "tak dalam", "banyak ikan", "akan hujan"],
  ["Bersatu kita teguh, bercerai kita ...", "runtuh", "sedih", "pergi"],
  ["Hemat pangkal ...", "kaya", "pandai", "sehat"],
  ["Di mana bumi dipijak, di situ langit ...", "dijunjung", "diinjak", "dilihat"],
  ["Sekali merengkuh dayung, dua tiga pulau ...", "terlampaui", "terlihat", "terbang"],
];

/* ───────────────────────── Uang & Logika (bank soal) ───────────────────────── */

const DENOM: Raw[] = [
  ["Uang kertas Rp100.000 berwarna dominan ...", "Merah", "Biru", "Hijau"],
  ["Uang kertas Rp50.000 berwarna dominan ...", "Biru", "Merah", "Ungu"],
  ["Uang kertas Rp20.000 berwarna dominan ...", "Hijau", "Ungu", "Cokelat"],
  ["Uang kertas Rp10.000 berwarna dominan ...", "Ungu", "Hijau", "Biru"],
  ["Uang kertas Rp5.000 berwarna dominan ...", "Cokelat", "Merah", "Kuning"],
  ["Uang kertas Rp2.000 berwarna dominan ...", "Abu-abu", "Merah", "Hijau"],
  ["Dua lembar uang Rp5.000 nilainya sama dengan ...", "Rp10.000", "Rp7.000", "Rp15.000"],
  ["Uang manakah yang nilainya paling besar?", "Rp50.000", "Rp20.000", "Rp10.000"],
  ["Berapa lembar uang Rp2.000 untuk membentuk Rp10.000?", "5 lembar", "4 lembar", "6 lembar"],
  ["Lima koin Rp1.000 nilainya sama dengan ...", "Rp5.000", "Rp500", "Rp50.000"],
];

const COMPARE: Raw[] = [
  ["Roti A: 2 buah Rp8.000. Roti B: 3 buah Rp9.000. Mana yang lebih hemat per buah?", "Roti B", "Roti A", "Sama saja"],
  ["Air minum A: 1 botol Rp3.000. Air minum B: 2 botol Rp7.000. Mana yang lebih hemat per botol?", "Air minum A", "Air minum B", "Sama saja"],
  ["Buku A: 5 buah Rp15.000. Buku B: 4 buah Rp14.000. Mana yang lebih hemat per buku?", "Buku A", "Buku B", "Sama saja"],
  ["Permen A: 10 butir Rp5.000. Permen B: 6 butir Rp4.200. Mana yang lebih hemat per butir?", "Permen A", "Permen B", "Sama saja"],
  ["Jus A: 3 gelas Rp12.000. Jus B: 2 gelas Rp9.000. Mana yang lebih hemat per gelas?", "Jus A", "Jus B", "Sama saja"],
  ["Stiker A: 4 lembar Rp6.000. Stiker B: 3 lembar Rp4.000. Mana yang lebih hemat per lembar?", "Stiker B", "Stiker A", "Sama saja"],
  ["Mainan Rp20.000 diskon 25%. Berapa harga setelah diskon?", "Rp15.000", "Rp18.000", "Rp5.000"],
  ["Uangmu Rp10.000. Buku Rp6.500 dan pensil Rp2.500. Apakah cukup?", "Cukup, sisa Rp1.000", "Tidak cukup", "Cukup, sisa Rp2.000"],
];

const NEED_WANT: Raw[] = [
  ["Nasi untuk makan siang adalah ...", "Kebutuhan", "Keinginan"],
  ["Mainan robot baru adalah ...", "Keinginan", "Kebutuhan"],
  ["Buku tulis untuk sekolah adalah ...", "Kebutuhan", "Keinginan"],
  ["Es krim kedua hari ini adalah ...", "Keinginan", "Kebutuhan"],
  ["Sepatu sekolah yang sudah bolong, beli yang baru adalah ...", "Kebutuhan", "Keinginan"],
  ["Stiker karakter lucu adalah ...", "Keinginan", "Kebutuhan"],
  ["Obat saat sedang sakit adalah ...", "Kebutuhan", "Keinginan"],
  ["Game baru di tablet adalah ...", "Keinginan", "Kebutuhan"],
  ["Air minum bersih adalah ...", "Kebutuhan", "Keinginan"],
  ["Tas baru padahal tas lama masih bagus adalah ...", "Keinginan", "Kebutuhan"],
];

/* ───────────────────────── Empati, Karakter & Emosi ───────────────────────── */

const FEELING: Raw[] = [
  ["Dina kehilangan mainan kesayangannya. Perasaannya ...", "Sedih", "Bangga", "Bersyukur"],
  ["Raka juara lomba lari di sekolah. Perasaannya ...", "Bangga", "Cemas", "Marah"],
  ["Sinta besok ujian tetapi belum belajar. Perasaannya ...", "Cemas", "Senang", "Bangga"],
  ["Adik merusak menara balok milik Budi. Perasaan Budi ...", "Marah", "Bangga", "Bersyukur"],
  ["Lala menerima kado ulang tahun dari temannya. Perasaannya ...", "Senang", "Cemas", "Marah"],
  ["Tono sendirian saat jam istirahat. Perasaannya ...", "Sedih", "Bangga", "Senang"],
  ["Maya dibantu ibu mengerjakan PR. Perasaannya ...", "Bersyukur", "Marah", "Cemas"],
  ["Ardi ditunjuk menjadi ketua kelas. Perasaannya ...", "Bangga", "Sedih", "Marah"],
];

const HONESTY: Raw[] = [
  ["Kamu menemukan uang Rp5.000 di lantai kelas. Apa yang kamu lakukan?", "Menyerahkannya kepada guru", "Memasukkannya ke saku diam-diam", "Membelikan jajan"],
  ["Kamu tidak sengaja memecahkan gelas di rumah. Apa yang kamu lakukan?", "Mengaku kepada ibu", "Menyembunyikan pecahannya", "Menyalahkan adik"],
  ["Kembalian kantin kelebihan Rp2.000. Apa yang kamu lakukan?", "Mengembalikan kelebihannya", "Diam saja dan pergi", "Menyimpannya untuk jajan"],
  ["PR-mu belum selesai. Apa yang sebaiknya kamu katakan kepada guru?", "Jujur bahwa belum selesai", "Bilang buku PR hilang", "Bilang sudah dikumpulkan"],
  ["Temanmu meminjamkan pensil dan patah. Apa yang kamu lakukan?", "Minta maaf dan menggantinya", "Mengembalikan tanpa bilang", "Berpura-pura tidak tahu"],
  ["Kamu menang permainan karena curang tanpa ketahuan. Sebaiknya ...", "Mengakui dan mengulang dengan adil", "Merayakan kemenangan", "Menyuruh teman diam"],
  ["Kamu menemukan dompet temanmu di taman. Sebaiknya ...", "Mengembalikan dompet itu", "Mengambil isinya", "Membiarkannya saja"],
  ["Ibu bertanya siapa yang makan kuenya, ternyata kamu. Jawabanmu ...", "“Aku yang makan, Bu.”", "“Bukan aku.”", "“Mungkin kucing.”"],
];

const SHARE: Raw[] = [
  ["Temanmu tidak membawa bekal. Kamu membawa dua roti. Apa yang kamu lakukan?", "Membagi satu roti untuknya", "Memakan dua-duanya", "Menyembunyikan rotimu"],
  ["Adik ingin bermain mobil-mobilanmu. Apa yang kamu lakukan?", "Bergiliran bermain bersama", "Menyimpannya tinggi-tinggi", "Menyuruhnya pergi"],
  ["Kamu punya lima kue dan ada empat temanmu. Sebaiknya ...", "Membagi rata agar semua kebagian", "Memberi semuanya ke satu teman", "Memakan semuanya sendiri"],
  ["Tetangga baru belum punya teman. Apa yang kamu lakukan?", "Mengajaknya bermain", "Mengabaikannya", "Menertawakannya"],
  ["Uang sakumu berlebih dan temanmu kurang untuk membeli buku. Sebaiknya ...", "Membantu dengan sebagian uang", "Memamerkan uangmu", "Pergi tanpa bicara"],
  ["Ayah pulang lelah. Apa yang bisa kamu bagi?", "Menawarkan segelas air dan pijatan", "Meminta ditemani main game", "Meminta dibelikan mainan"],
  ["Mainanmu sudah banyak dan masih bagus. Teman membutuhkan mainan. Sebaiknya ...", "Meminta izin lalu memberikan satu", "Menyimpan semuanya", "Menjualnya mahal"],
  ["Teman sakit tidak masuk sekolah. Apa yang bisa kamu bagi?", "Mencatatkan pelajaran untuknya", "Tidak peduli", "Mengejeknya"],
];

/* ───────────────────────── Sains & Umum ───────────────────────── */

const NATURE: Raw[] = [
  ["Hewan yang berkembang biak dengan bertelur adalah ...", "Ayam", "Kucing", "Sapi"],
  ["Bagian tumbuhan yang menyerap air dari tanah adalah ...", "Akar", "Daun", "Bunga"],
  ["Planet tempat kita tinggal bernama ...", "Bumi", "Mars", "Venus"],
  ["Hewan pemakan tumbuhan disebut ...", "Herbivora", "Karnivora", "Omnivora"],
  ["Air yang membeku berubah menjadi ...", "Es", "Uap", "Embun"],
  ["Matahari terbit dari arah ...", "Timur", "Barat", "Utara"],
  ["Tumbuhan membuat makanan dengan bantuan ...", "Cahaya matahari", "Cahaya bulan", "Angin"],
  ["Hewan yang bernapas dengan insang adalah ...", "Ikan", "Kucing", "Burung"],
  ["Laba-laba memiliki berapa kaki?", "8", "6", "4"],
  ["Indonesia memiliki dua musim, yaitu ...", "Hujan dan kemarau", "Salju dan panas", "Semi dan gugur"],
];

const WEEKLY: Raw[] = [
  ["Lambang sila pertama Pancasila adalah ...", "Bintang", "Rantai", "Pohon beringin"],
  ["Hari Kemerdekaan Indonesia diperingati pada tanggal ...", "17 Agustus", "28 Oktober", "1 Juni"],
  ["Berapa hasil 7 + 8?", "15", "14", "16"],
  ["Berapa hari dalam satu minggu?", "7 hari", "5 hari", "10 hari"],
  ["Campuran warna merah dan kuning menjadi ...", "Oranye", "Hijau", "Ungu"],
  ["Alat musik tradisional dari Jawa Barat adalah ...", "Angklung", "Sasando", "Tifa"],
  ["Proklamator kemerdekaan Indonesia adalah Soekarno dan ...", "Hatta", "Diponegoro", "Kartini"],
  ["Lagu kebangsaan Indonesia berjudul ...", "Indonesia Raya", "Garuda Pancasila", "Halo-Halo Bandung"],
  ["Berapa hasil 20 − 9?", "11", "12", "10"],
  ["Hewan khas Pulau Komodo adalah ...", "Komodo", "Harimau", "Jerapah"],
];

const SILHOUETTES: { animal: AnimalId; name: string }[] = [
  { animal: "elephant", name: "Gajah" },
  { animal: "giraffe", name: "Jerapah" },
  { animal: "turtle", name: "Kura-kura" },
  { animal: "lion", name: "Singa" },
  { animal: "penguin", name: "Pinguin" },
  { animal: "monkey", name: "Monyet" },
  { animal: "rabbit", name: "Kelinci" },
  { animal: "owl", name: "Burung hantu" },
  { animal: "duck", name: "Bebek" },
  { animal: "bee", name: "Lebah" },
  { animal: "crab", name: "Kepiting" },
  { animal: "dolphin", name: "Lumba-lumba" },
];


/* ───────────────────────── Bank soal dasar (dibagi dua: L1 & L2) ───────────────────────── */

/** Soal dasar dibagi dua: paruh awal → L1, paruh akhir → L2; lalu ditambah soal baru per level. */
function tiered(modeId: string, base: readonly Raw[]): readonly (readonly Raw[])[] {
  const ex: LevelExtras = BANK_EXTRAS[modeId] ?? { l1: [], l2: [], l3: [], l4: [], l5: [] };
  const half = Math.ceil(base.length / 2);
  return [
    [...base.slice(0, half), ...ex.l1],
    [...base.slice(half), ...ex.l2],
    ex.l3,
    ex.l4,
    ex.l5,
  ];
}


/* ───────────────────────── Pembangun soal ───────────────────────── */

const formatRp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const pad2 = (n: number) => String(n).padStart(2, "0");
const rint = (rand: () => number, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const clampLv = (l: number) => Math.min(5, Math.max(1, Math.floor(l) || 1));

/** Tiga pengecoh angka unik yang dekat dengan jawaban benar. */
function numericOptions(answer: number, rand: () => number, steps: number[], fmt: (n: number) => string, min = 0): { options: string[]; answerLabel: string } {
  const set = new Set<number>([answer]);
  const cand = [...steps.map((s) => answer + s), ...steps.map((s) => answer - s)].filter((n) => n >= min && n !== answer);
  const pool = seededShuffle(cand, `${Math.floor(rand() * 1e9)}`);
  for (const c of pool) {
    if (set.size >= 4) break;
    set.add(c);
  }
  let extra = 1;
  while (set.size < 4) {
    set.add(answer + extra * (steps[0] || 1));
    extra += 1;
  }
  return { options: Array.from(set).map(fmt), answerLabel: fmt(answer) };
}

function finishNumeric(id: string, prompt: string, answer: number, rand: () => number, steps: number[], fmt: (n: number) => string, ctx: BuildCtx, i: number, explain: string, min = 0): ChoiceItem {
  const { options, answerLabel } = numericOptions(answer, rand, steps, fmt, min);
  const shuffled = seededShuffle(options, `${ctx.seed}|c${ctx.cursor}|o|${i}`);
  return { id, prompt, options: shuffled, answerIndex: shuffled.indexOf(answerLabel), explain };
}

const SNACKS = ["roti", "susu kotak", "pensil", "penghapus", "jus jeruk", "buku tulis", "kerupuk", "air mineral"];

function buildChange(ctx: BuildCtx): ChoiceItem[] {
  const rand = mulberry32(hashString(`${ctx.seed}|c${ctx.cursor}`));
  const L = clampLv(ctx.level);
  return Array.from({ length: ROUNDS }, (_, i) => {
    const id = `m-change-L${L}-${ctx.cursor}-${i}`;
    if (L === 1) {
      const price = rint(rand, 2, 5) * 1000;
      const pay = price < 5000 ? 5000 : 10000;
      return finishNumeric(id, `Di kantin, jajanmu seharga ${formatRp(price)}. Kamu membayar ${formatRp(pay)}. Berapa uang kembaliannya?`, pay - price, rand, [500, 1000, 2000], formatRp, ctx, i, `${formatRp(pay)} − ${formatRp(price)} = ${formatRp(pay - price)}.`);
    }
    if (L === 2) {
      const price = rint(rand, 4, 18) * 500;
      const pay = price <= 9500 && rand() < 0.5 ? 10000 : 20000;
      return finishNumeric(id, `Di kantin, jajanmu seharga ${formatRp(price)}. Kamu membayar ${formatRp(pay)}. Berapa uang kembaliannya?`, pay - price, rand, [500, 1000, 2000], formatRp, ctx, i, `${formatRp(pay)} − ${formatRp(price)} = ${formatRp(pay - price)}.`);
    }
    if (L === 3) {
      const a = rint(rand, 4, 14) * 500;
      const b = rint(rand, 4, 14) * 500;
      const sum = a + b;
      const pay = sum <= 15000 ? 20000 : 50000;
      const n1 = SNACKS[rint(rand, 0, SNACKS.length - 1)];
      let n2 = SNACKS[rint(rand, 0, SNACKS.length - 1)];
      if (n2 === n1) n2 = SNACKS[(SNACKS.indexOf(n1) + 1) % SNACKS.length];
      return finishNumeric(id, `Kamu membeli ${n1} seharga ${formatRp(a)} dan ${n2} seharga ${formatRp(b)}. Kamu membayar ${formatRp(pay)}. Berapa kembaliannya?`, pay - sum, rand, [500, 1000, 2000, 5000], formatRp, ctx, i, `${formatRp(a)} + ${formatRp(b)} = ${formatRp(sum)}. ${formatRp(pay)} − ${formatRp(sum)} = ${formatRp(pay - sum)}.`);
    }
    if (L === 4) {
      const unit = rint(rand, 2, 8) * 1000;
      const qty = rint(rand, 2, 4);
      const other = rint(rand, 2, 9) * 1000;
      const total = unit * qty + other;
      const pay = total <= 30000 ? 50000 : 100000;
      const n1 = SNACKS[rint(rand, 0, SNACKS.length - 1)];
      return finishNumeric(id, `Kamu membeli ${qty} ${n1} @${formatRp(unit)} dan satu barang lain ${formatRp(other)}. Kamu membayar ${formatRp(pay)}. Berapa kembaliannya?`, pay - total, rand, [1000, 2000, 5000, 10000], formatRp, ctx, i, `${qty} × ${formatRp(unit)} = ${formatRp(unit * qty)}; ditambah ${formatRp(other)} = ${formatRp(total)}. ${formatRp(pay)} − ${formatRp(total)} = ${formatRp(pay - total)}.`);
    }
    const base = rint(rand, 1, 5) * 20000; // 20.000 .. 100.000
    const pct = [10, 20, 25][rint(rand, 0, 2)];
    const net = (base * (100 - pct)) / 100;
    const pay = base <= 40000 ? 50000 : 100000;
    return finishNumeric(id, `Sepatu seharga ${formatRp(base)} diskon ${pct}%. Kamu membayar ${formatRp(pay)}. Berapa kembaliannya?`, pay - net, rand, [1000, 2000, 5000, 10000], formatRp, ctx, i, `Diskon ${pct}% dari ${formatRp(base)} = ${formatRp(base - net)}, jadi harga ${formatRp(net)}. ${formatRp(pay)} − ${formatRp(net)} = ${formatRp(pay - net)}.`);
  });
}

function buildTarget(ctx: BuildCtx): ChoiceItem[] {
  const rand = mulberry32(hashString(`${ctx.seed}|c${ctx.cursor}`));
  const L = clampLv(ctx.level);
  return Array.from({ length: ROUNDS }, (_, i) => {
    const id = `m-target-L${L}-${ctx.cursor}-${i}`;
    if (L === 1) {
      const each = [1000, 2000][rint(rand, 0, 1)];
      const times = rint(rand, 3, 6);
      return finishNumeric(id, `Target celenganmu ${formatRp(each * times)}. Setiap kali menabung kamu memasukkan ${formatRp(each)}. Berapa kali menabung sampai target tercapai?`, times, rand, [1, 2, 3], (n) => `${n} kali`, ctx, i, `${formatRp(each * times)} ÷ ${formatRp(each)} = ${times} kali.`, 1);
    }
    if (L === 2) {
      const each = [2000, 5000, 10000][rint(rand, 0, 2)];
      const times = rint(rand, 3, 10);
      return finishNumeric(id, `Target celenganmu ${formatRp(each * times)}. Setiap kali menabung kamu memasukkan ${formatRp(each)}. Berapa kali menabung sampai target tercapai?`, times, rand, [1, 2, 3], (n) => `${n} kali`, ctx, i, `${formatRp(each * times)} ÷ ${formatRp(each)} = ${times} kali.`, 1);
    }
    if (L === 3) {
      const each = [2000, 5000, 10000][rint(rand, 0, 2)];
      const times = rint(rand, 6, 12);
      const done = rint(rand, 2, times - 2);
      return finishNumeric(id, `Target celenganmu ${formatRp(each * times)} dan sudah terkumpul ${formatRp(each * done)}. Kamu menabung ${formatRp(each)} setiap kali. Berapa kali lagi menabung?`, times - done, rand, [1, 2, 3], (n) => `${n} kali lagi`, ctx, i, `Sisa ${formatRp(each * (times - done))} ÷ ${formatRp(each)} = ${times - done} kali lagi.`, 1);
    }
    if (L === 4) {
      const each = [2500, 4000, 7500, 3000][rint(rand, 0, 3)];
      const days = rint(rand, 8, 20);
      return finishNumeric(id, `Kamu menabung ${formatRp(each)} setiap hari. Berapa hari yang dibutuhkan untuk mengumpulkan ${formatRp(each * days)}?`, days, rand, [1, 2, 4], (n) => `${n} hari`, ctx, i, `${formatRp(each * days)} ÷ ${formatRp(each)} = ${days} hari.`, 1);
    }
    const each = [3000, 4000, 5000][rint(rand, 0, 2)];
    const weeks = rint(rand, 3, 8);
    const perWeek = each * 5;
    return finishNumeric(id, `Kamu menabung ${formatRp(each)} setiap hari sekolah (5 hari per minggu). Berapa minggu untuk mencapai ${formatRp(perWeek * weeks)}?`, weeks, rand, [1, 2, 3], (n) => `${n} minggu`, ctx, i, `Per minggu ${formatRp(each)} × 5 = ${formatRp(perWeek)}. ${formatRp(perWeek * weeks)} ÷ ${formatRp(perWeek)} = ${weeks} minggu.`, 1);
  });
}

function buildSequence(ctx: BuildCtx): ChoiceItem[] {
  const rand = mulberry32(hashString(`${ctx.seed}|c${ctx.cursor}`));
  const L = clampLv(ctx.level);
  return Array.from({ length: ROUNDS }, (_, i) => {
    const id = `m-sequence-L${L}-${ctx.cursor}-${i}`;
    let terms: number[];
    let next: number;
    let rule: string;
    if (L === 1) {
      const start = rint(rand, 1, 9);
      const step = [1, 2, 3, 5][rint(rand, 0, 3)];
      terms = [0, 1, 2, 3].map((k) => start + k * step);
      next = start + 4 * step;
      rule = `Setiap angka ditambah ${step}`;
    } else if (L === 2) {
      if (i % 2 === 1) {
        const start = rint(rand, 1, 4);
        terms = [start, start * 2, start * 4, start * 8];
        next = start * 16;
        rule = "Setiap angka dikali 2";
      } else {
        const start = rint(rand, 1, 9);
        const step = [2, 3, 5, 10][rint(rand, 0, 3)];
        terms = [0, 1, 2, 3].map((k) => start + k * step);
        next = start + 4 * step;
        rule = `Setiap angka ditambah ${step}`;
      }
    } else if (L === 3) {
      if (i % 2 === 0) {
        const step = [3, 4, 5, 6, 10][rint(rand, 0, 4)];
        const start = rint(rand, 40, 90);
        terms = [0, 1, 2, 3].map((k) => start - k * step);
        next = start - 4 * step;
        rule = `Setiap angka dikurangi ${step}`;
      } else {
        const start = rint(rand, 1, 3);
        terms = [start, start * 3, start * 9, start * 27];
        next = start * 81;
        rule = "Setiap angka dikali 3";
      }
    } else if (L === 4) {
      const s = rint(rand, 1, 10);
      const a = rint(rand, 2, 5);
      const b = rint(rand, 6, 9);
      terms = [s, s + a, s + a + b, s + 2 * a + b, s + 2 * a + 2 * b];
      next = s + 3 * a + 2 * b;
      rule = `Pola tambah selang-seling: +${a}, +${b}, +${a}, +${b}, ...`;
    } else {
      const kind = i % 3;
      if (kind === 0) {
        const k0 = rint(rand, 1, 3);
        terms = [k0, k0 + 1, k0 + 2, k0 + 3].map((k) => k * k);
        next = (k0 + 4) * (k0 + 4);
        rule = "Deret bilangan kuadrat (1×1, 2×2, 3×3, ...)";
      } else if (kind === 1) {
        const k0 = rint(rand, 1, 3);
        const tri = (n: number) => (n * (n + 1)) / 2;
        terms = [k0, k0 + 1, k0 + 2, k0 + 3].map(tri);
        next = tri(k0 + 4);
        rule = "Selisih antar-angka bertambah 1 tiap langkah";
      } else {
        const a = rint(rand, 1, 3);
        const b = rint(rand, 2, 4);
        const t3 = a + b;
        const t4 = b + t3;
        const t5 = t3 + t4;
        terms = [a, b, t3, t4, t5];
        next = t4 + t5;
        rule = "Setiap angka adalah jumlah dua angka sebelumnya";
      }
    }
    return finishNumeric(id, `${terms.join(", ")}, ... Angka berikutnya adalah?`, next, rand, [1, 2, 3, 5], String, ctx, i, `${rule}, jadi angka berikutnya ${next}.`, 1);
  });
}

function buildClock(ctx: BuildCtx): ChoiceItem[] {
  const rand = mulberry32(hashString(`${ctx.seed}|c${ctx.cursor}`));
  const L = clampLv(ctx.level);
  const minutePool = L === 1 ? [0] : L === 2 ? [0, 30] : L === 3 ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  return Array.from({ length: ROUNDS }, (_, i) => {
    const hour = rint(rand, 1, 12);
    const minute = minutePool[rint(rand, 0, minutePool.length - 1)];
    const label = (h: number, m: number) => `${pad2(((h - 1 + 12) % 12) + 1)}.${pad2(m)}`;
    const answer = label(hour, minute);
    const set = new Set<string>([answer]);
    if (L >= 4) {
      // pengecoh khas: jarum tertukar, selisih 5 menit, selisih 1 jam
      const swapped = (minute / 5 || 12);
      set.add(label(swapped, ((hour * 5) % 60)));
      set.add(label(hour, (minute + 5) % 60));
      set.add(label(hour + 1, minute));
      set.add(label(hour - 1, minute));
    }
    let guard = 0;
    while (set.size < 4 && guard < 60) {
      guard += 1;
      set.add(label(rint(rand, 1, 12), minutePool[rint(rand, 0, minutePool.length - 1)]));
    }
    const picked = [answer, ...seededShuffle(Array.from(set).filter((v) => v !== answer), `${ctx.seed}|c${ctx.cursor}|w|${i}`).slice(0, 3)];
    const shuffled = seededShuffle(picked, `${ctx.seed}|c${ctx.cursor}|o|${i}`);
    return {
      id: `s-clock-L${L}-${ctx.cursor}-${i}`,
      prompt: "Jam berapa yang ditunjukkan jarum jam ini?",
      visual: { kind: "clock", hour, minute },
      options: shuffled,
      answerIndex: shuffled.indexOf(answer),
      explain: `Jarum pendek di angka ${hour}, jarum panjang di angka ${minute / 5 || 12}: pukul ${answer}.`,
    } satisfies ChoiceItem;
  });
}

const ANIMAL_GROUP: Record<AnimalId, "darat" | "air" | "kecil"> = {
  elephant: "darat",
  giraffe: "darat",
  lion: "darat",
  monkey: "darat",
  rabbit: "darat",
  turtle: "air",
  dolphin: "air",
  crab: "air",
  penguin: "air",
  duck: "air",
  owl: "kecil",
  bee: "kecil",
};

const ANIMAL_HINT: Record<AnimalId, string> = {
  elephant: "Petunjuk: hewan besar berbelalai panjang.",
  giraffe: "Petunjuk: hewan berleher sangat panjang.",
  turtle: "Petunjuk: hewan bercangkang yang berjalan pelan.",
  lion: "Petunjuk: raja hutan yang berumbai di lehernya.",
  penguin: "Petunjuk: burung yang tidak terbang dan suka es.",
  monkey: "Petunjuk: hewan pandai memanjat dan suka pisang.",
  rabbit: "Petunjuk: hewan bertelinga panjang yang suka wortel.",
  owl: "Petunjuk: burung bermata besar yang aktif di malam hari.",
  duck: "Petunjuk: unggas yang pandai berenang dan berbunyi kwek.",
  bee: "Petunjuk: serangga bersayap yang membuat madu.",
  crab: "Petunjuk: hewan bercapit yang berjalan menyamping.",
  dolphin: "Petunjuk: mamalia laut yang pandai melompat.",
};

function buildSilhouette(ctx: BuildCtx): ChoiceItem[] {
  const L = clampLv(ctx.level);
  const picked = pickWindow(SILHOUETTES, ctx.seed, ctx.cursor, ROUNDS);
  const optionCount = L === 1 ? 3 : 4;
  return picked.map((animal, i) => {
    const same = SILHOUETTES.filter((a) => a.name !== animal.name && ANIMAL_GROUP[a.animal] === ANIMAL_GROUP[animal.animal]);
    const other = SILHOUETTES.filter((a) => a.name !== animal.name && ANIMAL_GROUP[a.animal] !== ANIMAL_GROUP[animal.animal]);
    const pool = L >= 4 ? [...seededShuffle(same, `${ctx.seed}|c${ctx.cursor}|s|${i}`), ...seededShuffle(other, `${ctx.seed}|c${ctx.cursor}|x|${i}`)] : seededShuffle([...same, ...other], `${ctx.seed}|c${ctx.cursor}|w|${i}`);
    const wrong = pool.slice(0, optionCount - 1).map((a) => a.name);
    const options = seededShuffle([animal.name, ...wrong], `${ctx.seed}|c${ctx.cursor}|o|${i}`);
    const hint = L <= 2 ? ` ${ANIMAL_HINT[animal.animal]}` : "";
    return {
      id: `s-silhouette-L${L}-${ctx.cursor}-${i}`,
      prompt: `Hewan apa yang bersembunyi di dalam bayangan ini?${hint}`,
      visual: { kind: "silhouette", animal: animal.animal },
      options,
      answerIndex: options.indexOf(animal.name),
      explain: `Itu adalah ${animal.name.toLowerCase()}.`,
    } satisfies ChoiceItem;
  });
}

const RAW_BANK: Record<string, readonly (readonly Raw[])[]> = {
  "l-english": tiered("l-english", ENGLISH),
  "l-antonym": tiered("l-antonym", ANTONYM),
  "l-spelling": tiered("l-spelling", SPELLING),
  "l-proverb": tiered("l-proverb", PROVERB),
  "m-denom": tiered("m-denom", DENOM),
  "m-compare": tiered("m-compare", COMPARE),
  "m-needwant": tiered("m-needwant", NEED_WANT),
  "e-feeling": tiered("e-feeling", FEELING),
  "e-honesty": tiered("e-honesty", HONESTY),
  "e-share": tiered("e-share", SHARE),
  "s-nature": tiered("s-nature", NATURE),
  "s-weekly": tiered("s-weekly", WEEKLY),
};

/** Jumlah soal bank per mode & level (untuk statistik/uji). Mode hitungan dibangkitkan sehingga tidak dihitung. */
export function bankSizes(modeId: string): number[] | null {
  const b = RAW_BANK[modeId];
  return b ? b.map((l) => l.length) : null;
}

/** Kolam soal level L = level L ditambah level sebelumnya (pemanasan), supaya kolam cukup besar. */
function poolFor(bank: readonly (readonly Raw[])[], level: number): Raw[] {
  const L = clampLv(level);
  return [...(L > 1 ? bank[L - 2] : []), ...bank[L - 1]];
}

/** Soal pilihan ganda untuk mode `choice` / `numeric` / `clock` / `silhouette`. */
export function buildChoiceItems(modeId: string, ctx: BuildCtx): ChoiceItem[] {
  switch (modeId) {
    case "m-change":
      return buildChange(ctx);
    case "m-target":
      return buildTarget(ctx);
    case "m-sequence":
      return buildSequence(ctx);
    case "s-clock":
      return buildClock(ctx);
    case "s-silhouette":
      return buildSilhouette(ctx);
    default: {
      const bank = RAW_BANK[modeId];
      return bank ? fromRaw(modeId, poolFor(bank, ctx.level), ctx) : [];
    }
  }
}

/* ───────────────────────── Mode non-pilihan-ganda (bertingkat) ───────────────────────── */

/** Susun kalimat: makin tinggi level, makin panjang kalimatnya (4 → 11 kata). */
const SENTENCE_LEVELS: readonly (readonly (readonly string[])[])[] = [
  [
    ["Aku", "makan", "nasi", "hangat"],
    ["Ibu", "memasak", "sayur", "bayam"],
    ["Kucing", "minum", "susu", "segar"],
    ["Adik", "bermain", "bola", "kaki"],
    ["Ayah", "membaca", "koran", "pagi"],
    ["Burung", "terbang", "di", "langit"],
  ],
  [
    ["Ibu", "memasak", "nasi", "goreng", "di", "dapur"],
    ["Aku", "bermain", "bola", "bersama", "teman"],
    ["Kucing", "itu", "tidur", "di", "atas", "sofa"],
    ["Kami", "pergi", "ke", "sekolah", "setiap", "pagi"],
    ["Ayah", "membaca", "koran", "di", "teras"],
    ["Adik", "menabung", "uang", "di", "celengan"],
    ["Burung", "terbang", "tinggi", "di", "langit", "biru"],
    ["Aku", "membantu", "ibu", "menyapu", "halaman"],
  ],
  [
    ["Kakak", "membantu", "ibu", "membersihkan", "rumah", "setiap", "sore"],
    ["Kami", "belajar", "menabung", "uang", "jajan", "setiap", "hari"],
    ["Nenek", "menanam", "bunga", "mawar", "di", "halaman", "rumah"],
    ["Teman-temanku", "bermain", "layangan", "di", "lapangan", "yang", "luas"],
    ["Guru", "membagikan", "buku", "cerita", "kepada", "semua", "murid"],
    ["Adik", "memasukkan", "koin", "perak", "ke", "dalam", "celengan", "barunya"],
  ],
  [
    ["Setiap", "hari", "Minggu", "keluargaku", "pergi", "berjalan-kaki", "ke", "taman", "kota"],
    ["Aku", "menyisihkan", "sebagian", "uang", "jajan", "untuk", "membeli", "buku", "cerita"],
    ["Pak", "guru", "menjelaskan", "cara", "menghitung", "kembalian", "dengan", "sabar"],
    ["Ibu", "mengajak", "kami", "berbelanja", "sayur", "dan", "buah", "di", "pasar"],
    ["Hujan", "turun", "deras", "sehingga", "kami", "bermain", "di", "dalam", "rumah"],
    ["Kakak", "mengajariku", "mengendarai", "sepeda", "di", "halaman", "sekolah", "yang", "luas"],
  ],
  [
    ["Karena", "rajin", "menabung", "setiap", "minggu", "akhirnya", "aku", "bisa", "membeli", "sepeda", "baru"],
    ["Aku", "selalu", "mencatat", "pengeluaran", "jajan", "agar", "uang", "sakuku", "tidak", "cepat", "habis"],
    ["Setelah", "pulang", "sekolah", "aku", "membantu", "ibu", "menyiram", "tanaman", "di", "kebun", "belakang"],
    ["Teman", "sekelasku", "sangat", "senang", "ketika", "guru", "memberi", "pujian", "atas", "kerja", "kerasnya"],
    ["Walaupun", "hujan", "deras", "kami", "tetap", "berangkat", "sekolah", "dengan", "memakai", "jas", "hujan"],
    ["Kami", "bergotong-royong", "membersihkan", "selokan", "supaya", "air", "hujan", "mengalir", "dengan", "lancar"],
  ],
];

export const SENTENCES_PER_ROUND = 4;

export function buildSentences(ctx: BuildCtx): (readonly string[])[] {
  const pool = SENTENCE_LEVELS[clampLv(ctx.level) - 1];
  return pickWindow(pool, ctx.seed, ctx.cursor, SENTENCES_PER_ROUND);
}

/** 3 Kata Jadi Cerita: kata makin abstrak dan syarat panjang cerita makin tinggi. */
const THREE_WORD_LEVELS: readonly (readonly (readonly [string, string, string])[])[] = [
  [
    ["ayam", "pagi", "nasi"],
    ["ibu", "dapur", "roti"],
    ["kucing", "susu", "sofa"],
    ["bola", "lapangan", "teman"],
    ["hujan", "jendela", "teh"],
    ["bunga", "lebah", "taman"],
  ],
  [
    ["kucing", "hujan", "payung"],
    ["pasar", "apel", "nenek"],
    ["sepeda", "taman", "senja"],
    ["celengan", "mimpi", "bintang"],
    ["buku", "dinosaurus", "kelas"],
    ["laut", "perahu", "kakek"],
    ["roti", "bulan", "teman"],
    ["kupu", "bunga", "pagi"],
  ],
  [
    ["perahu", "pelangi", "nelayan"],
    ["perpustakaan", "hantu", "lampu"],
    ["kebun", "tomat", "kakek"],
    ["balon", "angin", "pesta"],
    ["kereta", "stasiun", "koper"],
    ["sungai", "jembatan", "ikan"],
  ],
  [
    ["petualangan", "peta", "gua"],
    ["robot", "sekolah", "persahabatan"],
    ["hutan", "senter", "malam"],
    ["pelangi", "celengan", "harapan"],
    ["juara", "latihan", "semangat"],
    ["pulau", "harta", "kapal"],
  ],
  [
    ["keberanian", "badai", "mercusuar"],
    ["hemat", "impian", "sepeda"],
    ["kejujuran", "dompet", "sahabat"],
    ["musyawarah", "kampung", "jembatan"],
    ["penemu", "mesin", "kejutan"],
    ["bintang", "teleskop", "rahasia"],
  ],
];

/** Minimal kata cerita per level. */
export const THREEWORD_MIN_BY_LEVEL = [0, 10, 15, 20, 25, 30] as const;

export function pickThreeWords(ctx: BuildCtx): readonly [string, string, string] {
  const pool = THREE_WORD_LEVELS[clampLv(ctx.level) - 1];
  return pickWindow(pool, ctx.seed, ctx.cursor, 1)[0];
}

/** Urutkan kronologi: makin tinggi level, makin banyak langkah (3 → 6). */
export interface OrderStory {
  title: string;
  steps: readonly string[];
}

const ORDER_LEVELS: readonly (readonly OrderStory[])[] = [
  [
    { title: "Mencuci Tangan", steps: ["Membasahi tangan dengan air", "Menggosok tangan dengan sabun", "Membilas dan mengeringkan tangan"] },
    { title: "Menyikat Gigi", steps: ["Mengambil sikat dan pasta gigi", "Menyikat seluruh gigi", "Berkumur sampai bersih"] },
    { title: "Minum Susu", steps: ["Menuang susu ke gelas", "Meminum susu pelan-pelan", "Mencuci gelas yang kosong"] },
    { title: "Memakai Sepatu", steps: ["Mengambil sepatu dan kaus kaki", "Memakai kaus kaki", "Memasang sepatu dan mengikat tali"] },
  ],
  [
    { title: "Menanam Bunga", steps: ["Menyiapkan tanah dan biji", "Menanam biji ke dalam tanah", "Menyiram setiap pagi", "Bunga mekar dengan indah"] },
    { title: "Menabung di Celengan", steps: ["Mengumpulkan uang saku", "Memasukkan koin ke celengan", "Celengan semakin berat", "Membuka celengan untuk membeli sepeda"] },
    { title: "Berangkat Sekolah", steps: ["Bangun tidur dan mandi", "Sarapan bersama keluarga", "Berangkat ke sekolah", "Belajar di dalam kelas"] },
    { title: "Kupu-kupu", steps: ["Telur menetas menjadi ulat", "Ulat makan daun hijau", "Ulat membuat kepompong", "Kupu-kupu keluar dan terbang"] },
    { title: "Turunnya Hujan", steps: ["Matahari memanaskan air laut", "Uap air naik membentuk awan", "Awan menjadi gelap dan berat", "Turunlah hujan ke bumi"] },
    { title: "Membuat Susu Cokelat", steps: ["Menyiapkan gelas dan susu", "Menuang susu ke gelas", "Menambahkan bubuk cokelat", "Mengaduk lalu meminumnya"] },
  ],
  [
    { title: "Membuat Telur Dadar", steps: ["Memecahkan telur ke mangkuk", "Mengocok telur dengan garpu", "Memanaskan minyak di wajan", "Menuang telur ke wajan", "Mengangkat telur saat matang"] },
    { title: "Belanja di Warung", steps: ["Membuat daftar belanjaan", "Membawa uang secukupnya", "Memilih barang yang dibutuhkan", "Membayar di kasir", "Memeriksa uang kembalian"] },
    { title: "Membuat Pesawat Kertas", steps: ["Menyiapkan selembar kertas", "Melipat kertas menjadi dua", "Melipat kedua sudut atas ke tengah", "Melipat sayap di kiri dan kanan", "Menerbangkan pesawat kertas"] },
    { title: "Pergi ke Perpustakaan", steps: ["Memilih buku yang menarik", "Membawa buku ke meja petugas", "Petugas mencatat peminjaman", "Membaca buku di rumah", "Mengembalikan buku tepat waktu"] },
  ],
  [
    { title: "Siklus Air", steps: ["Air laut memanas oleh matahari", "Uap air naik ke langit", "Uap mengembun menjadi awan", "Awan menjatuhkan hujan", "Air hujan mengalir kembali ke sungai dan laut"] },
    { title: "Menabung untuk Sepeda", steps: ["Menentukan harga sepeda yang diinginkan", "Menghitung tabungan tiap minggu", "Menyisihkan uang saku setiap hari", "Mencatat tabungan di buku", "Tabungan cukup lalu membeli sepeda", "Merawat sepeda dengan baik"] },
    { title: "Tumbuhnya Pohon Mangga", steps: ["Biji mangga ditanam di tanah", "Biji berkecambah menjadi tunas", "Tunas tumbuh menjadi pohon muda", "Pohon dewasa berbunga", "Bunga menjadi buah mangga"] },
    { title: "Menyelesaikan Kerja Kelompok", steps: ["Guru membagi kelompok", "Kelompok membagi tugas", "Setiap anggota mengerjakan bagiannya", "Hasil kerja digabungkan", "Kelompok mempresentasikan hasilnya"] },
  ],
  [
    { title: "Membuat Kertas Daur Ulang", steps: ["Mengumpulkan kertas bekas", "Merobek kertas menjadi kecil", "Merendam kertas dalam air", "Menghaluskan menjadi bubur kertas", "Mencetak bubur pada saringan", "Menjemur sampai kering"] },
    { title: "Perjalanan Sebuah Surat", steps: ["Menulis surat dan memasukkannya ke amplop", "Menempelkan perangko", "Memasukkan surat ke kotak pos", "Petugas mengumpulkan surat", "Surat disortir dan diantar kurir", "Surat diterima oleh yang dituju"] },
    { title: "Berjualan Minuman Segar", steps: ["Merencanakan modal dan bahan", "Membeli jeruk, gula, dan gelas", "Membuat minuman", "Menjual di depan rumah", "Menghitung pendapatan dan modal", "Menyisihkan sebagian untung untuk ditabung"] },
    { title: "Memilih Ketua Kelas", steps: ["Guru mengumumkan pemilihan", "Calon-calon mendaftar", "Calon menyampaikan rencananya", "Murid memberikan suara", "Panitia menghitung suara", "Ketua kelas terpilih diumumkan"] },
  ],
];

export const ORDER_STORIES_PER_ROUND = 3;

export function buildOrderStories(ctx: BuildCtx): OrderStory[] {
  const pool = ORDER_LEVELS[clampLv(ctx.level) - 1];
  return pickWindow(pool, ctx.seed, ctx.cursor, Math.min(ORDER_STORIES_PER_ROUND, pool.length));
}

export const MEMORY_SYMBOLS: readonly { id: BiomeGlyphId; label: string }[] = [
  { id: "forest", label: "Hutan" },
  { id: "cactus", label: "Gurun" },
  { id: "blossom", label: "Sakura" },
  { id: "maple", label: "Musim gugur" },
  { id: "snow", label: "Salju" },
  { id: "wave", label: "Laut" },
  { id: "volcano", label: "Gunung api" },
  { id: "island", label: "Pulau" },
];

/** Jumlah pasang kartu per level (indeks = level). */
export const MEMORY_PAIRS_BY_LEVEL = [0, 3, 4, 5, 6, 8] as const;

export const KINDNESS_TASKS: readonly string[] = [
  "Merapikan tempat tidur sendiri",
  "Membantu ibu menyapu lantai",
  "Membawa piring kotor ke dapur",
  "Mencuci gelas bekas minumku",
  "Merapikan sepatu dan tas",
  "Menyiram tanaman di rumah",
  "Membantu adik atau kakak belajar",
  "Mengucapkan terima kasih kepada orang tua",
];

/** Minimal kebaikan yang dicentang per level. */
export const KINDNESS_PASS_BY_LEVEL = [0, 3, 3, 4, 5, 6] as const;

export const THANKS_RECIPIENTS: readonly string[] = ["Ibu", "Ayah", "Guru", "Sahabat", "Kakak atau Adik", "Nenek atau Kakek"];

/** Minimal kata kartu terima kasih per level. */
export const THANKS_MIN_BY_LEVEL = [0, 8, 10, 14, 18, 22] as const;

/** Putaran latihan napas per level. */
export const BREATH_CYCLES_BY_LEVEL = [0, 3, 4, 5, 6, 7] as const;

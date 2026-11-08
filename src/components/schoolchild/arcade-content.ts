/**
 * Bank soal Arcade Sekolah (kelas 3 SD). Murni data + pembangun soal deterministik:
 * tidak memakai Math.random; acakan selalu dari seed teks (anak + mode + tanggal + putaran).
 */
import { hashString, mulberry32, seededShuffle } from "@/lib/quest-engine";
import type { AnimalId, BiomeGlyphId } from "@/components/illustrations/GlyphCreatures";

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

/** [pertanyaan, jawaban benar, ...pilihan salah] */
type Raw = readonly [string, string, ...string[]];

const ROUNDS = 5;

function fromRaw(modeId: string, raws: readonly Raw[], seed: string, explain?: (r: Raw) => string): ChoiceItem[] {
  return seededShuffle(raws, `${seed}|pick`)
    .slice(0, ROUNDS)
    .map((r, i) => {
      const [prompt, answer, ...wrong] = r;
      const options = seededShuffle([answer, ...wrong], `${seed}|opt|${i}`);
      return {
        id: `${modeId}-${i}`,
        prompt,
        options,
        answerIndex: options.indexOf(answer),
        explain: explain ? explain(r) : `Jawaban yang benar: ${answer}.`,
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

/* ───────────────────────── Pembangun soal ───────────────────────── */

const formatRp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const pad2 = (n: number) => String(n).padStart(2, "0");

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

function buildChange(seed: string): ChoiceItem[] {
  const rand = mulberry32(hashString(seed));
  return Array.from({ length: ROUNDS }, (_, i) => {
    const price = (4 + Math.floor(rand() * 15)) * 500; // 2.000 .. 9.000
    const paid = price <= 5000 ? 10000 : 20000 - (price > 9000 ? 0 : 10000 * Math.floor(rand() * 2));
    const pay = paid <= price ? 20000 : paid;
    const change = pay - price;
    const { options, answerLabel } = numericOptions(change, rand, [500, 1000, 2000], formatRp);
    const shuffled = seededShuffle(options, `${seed}|o|${i}`);
    return {
      id: `m-change-${i}`,
      prompt: `Di kantin, jajanmu seharga ${formatRp(price)}. Kamu membayar ${formatRp(pay)}. Berapa uang kembaliannya?`,
      options: shuffled,
      answerIndex: shuffled.indexOf(answerLabel),
      explain: `${formatRp(pay)} − ${formatRp(price)} = ${formatRp(change)}.`,
    };
  });
}

function buildTarget(seed: string): ChoiceItem[] {
  const rand = mulberry32(hashString(seed));
  const per = [2000, 5000, 10000];
  return Array.from({ length: ROUNDS }, (_, i) => {
    const each = per[Math.floor(rand() * per.length)];
    const times = 3 + Math.floor(rand() * 8); // 3..10
    const target = each * times;
    const { options, answerLabel } = numericOptions(times, rand, [1, 2, 3], (n) => `${n} kali`, 1);
    const shuffled = seededShuffle(options, `${seed}|o|${i}`);
    return {
      id: `m-target-${i}`,
      prompt: `Target celenganmu ${formatRp(target)}. Setiap kali menabung kamu memasukkan ${formatRp(each)}. Berapa kali menabung sampai target tercapai?`,
      options: shuffled,
      answerIndex: shuffled.indexOf(answerLabel),
      explain: `${formatRp(target)} ÷ ${formatRp(each)} = ${times} kali.`,
    };
  });
}

function buildSequence(seed: string): ChoiceItem[] {
  const rand = mulberry32(hashString(seed));
  return Array.from({ length: ROUNDS }, (_, i) => {
    const doubling = i % 2 === 1;
    let terms: number[];
    let next: number;
    let rule: string;
    if (doubling) {
      const start = 1 + Math.floor(rand() * 4);
      terms = [start, start * 2, start * 4, start * 8];
      next = start * 16;
      rule = "Setiap angka dikali 2";
    } else {
      const start = 1 + Math.floor(rand() * 9);
      const step = [2, 3, 5, 10][Math.floor(rand() * 4)];
      terms = [start, start + step, start + 2 * step, start + 3 * step];
      next = start + 4 * step;
      rule = `Setiap angka ditambah ${step}`;
    }
    const { options, answerLabel } = numericOptions(next, rand, [1, 2, 5], String, 1);
    const shuffled = seededShuffle(options, `${seed}|o|${i}`);
    return {
      id: `m-sequence-${i}`,
      prompt: `${terms.join(", ")}, ... Angka berikutnya adalah?`,
      options: shuffled,
      answerIndex: shuffled.indexOf(answerLabel),
      explain: `${rule}, jadi angka berikutnya ${next}.`,
    };
  });
}

function buildClock(seed: string): ChoiceItem[] {
  const rand = mulberry32(hashString(seed));
  const minutes = [0, 15, 30, 45];
  return Array.from({ length: ROUNDS }, (_, i) => {
    const hour = 1 + Math.floor(rand() * 12);
    const minute = minutes[Math.floor(rand() * minutes.length)];
    const label = (h: number, m: number) => `${pad2(h)}.${pad2(m)}`;
    const answer = label(hour, minute);
    const set = new Set<string>([answer]);
    let guard = 0;
    while (set.size < 4 && guard < 40) {
      guard += 1;
      const h = 1 + Math.floor(rand() * 12);
      const m = minutes[Math.floor(rand() * minutes.length)];
      set.add(label(h, m));
    }
    const shuffled = seededShuffle(Array.from(set), `${seed}|o|${i}`);
    return {
      id: `s-clock-${i}`,
      prompt: "Jam berapa yang ditunjukkan jarum jam ini?",
      visual: { kind: "clock", hour, minute },
      options: shuffled,
      answerIndex: shuffled.indexOf(answer),
      explain: `Jarum pendek di angka ${hour}, jarum panjang di angka ${minute / 5 || 12}: pukul ${answer}.`,
    };
  });
}

function buildSilhouette(seed: string): ChoiceItem[] {
  const picked = seededShuffle(SILHOUETTES, `${seed}|pick`).slice(0, ROUNDS);
  return picked.map((animal, i) => {
    const wrong = seededShuffle(
      SILHOUETTES.filter((a) => a.name !== animal.name).map((a) => a.name),
      `${seed}|w|${i}`
    ).slice(0, 3);
    const options = seededShuffle([animal.name, ...wrong], `${seed}|o|${i}`);
    return {
      id: `s-silhouette-${i}`,
      prompt: "Hewan apa yang bersembunyi di dalam bayangan ini?",
      visual: { kind: "silhouette", animal: animal.animal },
      options,
      answerIndex: options.indexOf(animal.name),
      explain: `Itu adalah ${animal.name.toLowerCase()}.`,
    };
  });
}

const RAW_BANK: Record<string, readonly Raw[]> = {
  "l-english": ENGLISH,
  "l-antonym": ANTONYM,
  "l-spelling": SPELLING,
  "l-proverb": PROVERB,
  "m-denom": DENOM,
  "m-compare": COMPARE,
  "m-needwant": NEED_WANT,
  "e-feeling": FEELING,
  "e-honesty": HONESTY,
  "e-share": SHARE,
  "s-nature": NATURE,
  "s-weekly": WEEKLY,
};

/** Soal pilihan ganda untuk mode `choice` / `numeric` / `clock` / `silhouette`. */
export function buildChoiceItems(modeId: string, seed: string): ChoiceItem[] {
  switch (modeId) {
    case "m-change":
      return buildChange(seed);
    case "m-target":
      return buildTarget(seed);
    case "m-sequence":
      return buildSequence(seed);
    case "s-clock":
      return buildClock(seed);
    case "s-silhouette":
      return buildSilhouette(seed);
    default: {
      const bank = RAW_BANK[modeId];
      return bank ? fromRaw(modeId, bank, seed) : [];
    }
  }
}

/* ───────────────────────── Mode non-pilihan-ganda ───────────────────────── */

export const SENTENCES: readonly (readonly string[])[] = [
  ["Ibu", "memasak", "nasi", "goreng", "di", "dapur"],
  ["Aku", "bermain", "bola", "bersama", "teman"],
  ["Kucing", "itu", "tidur", "di", "atas", "sofa"],
  ["Kami", "pergi", "ke", "sekolah", "setiap", "pagi"],
  ["Ayah", "membaca", "koran", "di", "teras"],
  ["Adik", "menabung", "uang", "di", "celengan"],
  ["Burung", "terbang", "tinggi", "di", "langit", "biru"],
  ["Aku", "membantu", "ibu", "menyapu", "halaman"],
];

export const THREE_WORDS: readonly (readonly [string, string, string])[] = [
  ["kucing", "hujan", "payung"],
  ["pasar", "apel", "nenek"],
  ["sepeda", "taman", "senja"],
  ["celengan", "mimpi", "bintang"],
  ["buku", "dinosaurus", "kelas"],
  ["laut", "perahu", "kakek"],
  ["roti", "bulan", "teman"],
  ["kupu", "bunga", "pagi"],
];

export const ORDER_STORIES: readonly { title: string; steps: readonly string[] }[] = [
  { title: "Menanam Bunga", steps: ["Menyiapkan tanah dan biji", "Menanam biji ke dalam tanah", "Menyiram setiap pagi", "Bunga mekar dengan indah"] },
  { title: "Menabung di Celengan", steps: ["Mengumpulkan uang saku", "Memasukkan koin ke celengan", "Celengan semakin berat", "Membuka celengan untuk membeli sepeda"] },
  { title: "Berangkat Sekolah", steps: ["Bangun tidur dan mandi", "Sarapan bersama keluarga", "Berangkat ke sekolah", "Belajar di dalam kelas"] },
  { title: "Kupu-kupu", steps: ["Telur menetas menjadi ulat", "Ulat makan daun hijau", "Ulat membuat kepompong", "Kupu-kupu keluar dan terbang"] },
  { title: "Turunnya Hujan", steps: ["Matahari memanaskan air laut", "Uap air naik membentuk awan", "Awan menjadi gelap dan berat", "Turunlah hujan ke bumi"] },
  { title: "Membuat Susu Cokelat", steps: ["Menyiapkan gelas dan susu", "Menuang susu ke gelas", "Menambahkan bubuk cokelat", "Mengaduk lalu meminumnya"] },
];

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

export const THANKS_RECIPIENTS: readonly string[] = ["Ibu", "Ayah", "Guru", "Sahabat", "Kakak atau Adik", "Nenek atau Kakek"];

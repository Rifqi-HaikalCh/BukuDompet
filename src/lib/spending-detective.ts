import { addDaysStr, localDateStr } from "@/lib/dates";
import { scoreableTransactions } from "@/lib/finance/ledger";
import type { MochiMood, MochiStage } from "@/components/illustrations/MochiCompanion";
import type {
  CasteStage,
  GrowthStage,
  PetMood,
  PetSpecies,
} from "@/components/illustrations/PetAvatarSystem";
import {
  GROWTH_STAGE_META,
  PET_SPECIES_CATALOG,
} from "@/components/illustrations/PetAvatarSystem";

/** `saving` = setoran celengan (Versi 5.0). Bukan pengeluaran, jadi tidak pernah dihitung boros. */
export type TransactionType = "income" | "expense" | "saving" | "adjustment";
export type NeedOrWant = "need" | "want" | "income";

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  type: TransactionType;
  category: string;
  need_or_want: NeedOrWant;
  title: string;
  total_amount: number;
  is_itemized: boolean;
  points_earned: number;
  xp_earned: number;
  transaction_date: string; // YYYY-MM-DD
  created_at: string;
  items?: TransactionItem[];
  /* ── Versi 5.6 — semua opsional agar catatan lama tetap valid ── */
  /** Sub-dompet sumber pengeluaran. */
  walletId?: string;
  /** Pemasukan dari anak berstatus `pending_supervisor` sampai dikonfirmasi Supervisor. */
  verificationStatus?: "verified" | "pending_supervisor" | "rejected";
  createdByRole?: "child" | "supervisor";
  /** Terisi bila pengeluaran berasal dari dompet hibah: tidak dihitung dalam laju pembakaran/skor detektif. */
  linkedGrantId?: string;
  /** Patungan/titip bayar teman: tetap mengurangi dompet, tetapi bukan pemborosan pribadi. */
  isReimbursable?: boolean;
  reimbursedAt?: string;
  /** Hanya `type: "adjustment"`: arah selisih kas. */
  adjustmentDirection?: "loss" | "gain";
  claimedAmount?: number;
  verifiedAt?: string;
  verifiedBy?: string;
  createdBy?: string;
}

export const EXPENSE_CATEGORIES: {
  name: string;
  group: "need" | "want";
  color: string;
}[] = [
  { name: "Makan Pokok", group: "need", color: "#58CC02" },
  { name: "Transportasi", group: "need", color: "#38B6FF" },
  { name: "Kuliah/Alat Tulis", group: "need", color: "#CE82FF" },
  { name: "Tagihan", group: "need", color: "#FFC800" },
  { name: "Jajan/Cemilan", group: "want", color: "#FF8B7B" },
  { name: "Kopi/Minuman", group: "want", color: "#E5A400" },
  { name: "Nongkrong", group: "want", color: "#FF4B4B" },
  { name: "Belanja/Hiburan", group: "want", color: "#A552DB" },
  { name: "Lainnya", group: "want", color: "#7A6E65" },
];

export const INCOME_CATEGORIES: {
  name: string;
}[] = [
  { name: "Uang Saku Bulanan" },
  { name: "Bonus Orang Tua / Abang" },
  { name: "Hadiah Tukar Poin Gamifikasi" },
  { name: "Tabungan / Lainnya" },
];

/**
 * Harga Spesies Pet di Butik & Shop (Long-Term Economy — 8 Spesies Kawaii)
 */
export const PET_SPECIES_SHOP_PRICES: Record<PetSpecies, number> = Object.fromEntries(
  PET_SPECIES_CATALOG.map((sp) => [sp.id, sp.pricePoints])
) as Record<PetSpecies, number>;

/**
 * Syarat Buka 8 Fase Pertumbuhan Hidup (Telur Ajaib s/d Sepuh Bijaksana)
 * Nilai pada `GROWTH_STAGE_TARGETS[stage]` adalah syarat untuk NAIK DARI `stage` menuju `stage + 1`.
 * Setiap kali naik fase, `stageXp` dan `stageRecordedDays` direset kembali ke 0!
 */
export const GROWTH_STAGE_TARGETS: Record<
  GrowthStage,
  {
    stage: GrowthStage;
    name: string;
    unlockFromPrevStageXp: number;
    unlockFromPrevStageDays: number;
    nextStageXpTarget: number;
    nextStageDaysTarget: number;
  }
> = {
  1: {
    stage: 1,
    name: GROWTH_STAGE_META[1].name, // Telur Ajaib
    unlockFromPrevStageXp: 0,
    unlockFromPrevStageDays: 0,
    nextStageXpTarget: 350,
    nextStageDaysTarget: 7,
  },
  2: {
    stage: 2,
    name: GROWTH_STAGE_META[2].name, // Bayi Menetas
    unlockFromPrevStageXp: 350,
    unlockFromPrevStageDays: 7,
    nextStageXpTarget: 900,
    nextStageDaysTarget: 14,
  },
  3: {
    stage: 3,
    name: GROWTH_STAGE_META[3].name, // Balita Gembul
    unlockFromPrevStageXp: 900,
    unlockFromPrevStageDays: 14,
    nextStageXpTarget: 1800,
    nextStageDaysTarget: 25,
  },
  4: {
    stage: 4,
    name: GROWTH_STAGE_META[4].name, // Anak Ceria
    unlockFromPrevStageXp: 1800,
    unlockFromPrevStageDays: 25,
    nextStageXpTarget: 3200,
    nextStageDaysTarget: 40,
  },
  5: {
    stage: 5,
    name: GROWTH_STAGE_META[5].name, // Remaja Lincah
    unlockFromPrevStageXp: 3200,
    unlockFromPrevStageDays: 40,
    nextStageXpTarget: 5500,
    nextStageDaysTarget: 60,
  },
  6: {
    stage: 6,
    name: GROWTH_STAGE_META[6].name, // Dewasa Prima
    unlockFromPrevStageXp: 5500,
    unlockFromPrevStageDays: 60,
    nextStageXpTarget: 9000,
    nextStageDaysTarget: 90,
  },
  7: {
    stage: 7,
    name: GROWTH_STAGE_META[7].name, // Master Anggun
    unlockFromPrevStageXp: 9000,
    unlockFromPrevStageDays: 90,
    nextStageXpTarget: 15000,
    nextStageDaysTarget: 120,
  },
  8: {
    stage: 8,
    name: GROWTH_STAGE_META[8].name, // Sepuh Bijaksana
    unlockFromPrevStageXp: 15000,
    unlockFromPrevStageDays: 120,
    nextStageXpTarget: 15000,
    nextStageDaysTarget: 120,
  },
};

export const CASTE_STAGE_TARGETS = GROWTH_STAGE_TARGETS;

const GENERIC_WORDS = new Set([
  "makan",
  "jajan",
  "beli",
  "minum",
  "bayar",
  "uang",
  "item",
  "barang",
  "lain",
  "test",
]);

/**
 * Validasi apakah daftar item memenuhi syarat "Jurnal Rinci" (Versi 3.0 Hardcore Cozy Pacing):
 * - Minimal 2 sub-items valid
 * - Tarif Transaksi Rinci: +10 Poin & +20 Stage XP
 * - Tarif Transaksi Biasa: +5 Poin & +10 Stage XP
 * - Maksimal 3 transaksi berpoin per hari
 */
export function validateItemizedCombo(
  items: { item_name: string; unit_price: number; quantity?: number }[]
): {
  isValidCombo: boolean;
  validItemsCount: number;
  pointsPreview: number;
  xpPreview: number;
  reason?: string;
} {
  const validItems = items.filter((it) => {
    const clean = it.item_name.trim().toLowerCase();
    const price = Number(it.unit_price) || 0;
    if (clean.length < 4 || price <= 0) return false;
    if (GENERIC_WORDS.has(clean)) return false;
    return true;
  });

  if (validItems.length >= 2) {
    return {
      isValidCombo: true,
      validItemsCount: validItems.length,
      pointsPreview: 10,
      xpPreview: 20,
    };
  }

  return {
    isValidCombo: false,
    validItemsCount: validItems.length,
    pointsPreview: 5,
    xpPreview: 10,
    reason:
      items.length < 2
        ? "Tambahkan minimal 2 item rincian untuk mencatat Struk Rinci (+10 Poin & +20 Stage XP)!"
        : "Tulis nama item spesifik (min. 4 huruf, contoh: 'Nasi Goreng', bukan cuma 'Makan').",
  };
}

/**
 * Smart Quick-Split Parser
 */
export function parseSmartQuickSplit(input: string): {
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}[] {
  if (!input.trim()) return [];

  const segments = input
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed: {
    item_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[] = [];

  for (const seg of segments) {
    const priceRegex =
      /^(.*?)\s+(?:(\d+)\s*[xX]\s*)?Rp?\s*(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)?$/i;
    const match = seg.match(priceRegex);

    if (match) {
      let rawName = match[1].trim();
      let qty = match[2] ? parseInt(match[2], 10) : 1;

      const startQtyMatch = rawName.match(/^(\d+)\s*[xX]\s+(.+)$/);
      if (startQtyMatch) {
        qty = parseInt(startQtyMatch[1], 10);
        rawName = startQtyMatch[2].trim();
      }

      const rawNumStr = match[3].replace(/\./g, "").replace(",", ".");
      let num = parseFloat(rawNumStr);
      const suffix = match[4]?.toLowerCase();

      if (suffix === "k" || suffix === "rb" || suffix === "ribu") {
        num = num * 1000;
      } else if (num > 0 && num < 500) {
        num = num * 1000;
      }

      const unitPrice = Math.round(num);
      if (rawName && unitPrice > 0) {
        parsed.push({
          item_name: rawName,
          quantity: qty,
          unit_price: unitPrice,
          subtotal: qty * unitPrice,
        });
      }
    }
  }

  return parsed;
}

export interface MicroLeakFinding {
  keywordOrCategory: string;
  count: number;
  totalSpent: number;
  suggestedCutCount: number;
  potentialSaving: number;
  message: string;
}

export interface SpendingDetectiveReport {
  // Bulanan
  monthlyAllowance: number;
  monthlySavingTarget: number;
  monthlySpendablePool: number;
  totalIncomeThisMonth: number;
  totalSpentThisMonth: number;
  remainingMonthlyPool: number;
  remainingTotalBalanceThisMonth: number;
  daysInMonth: number;
  remainingDaysInMonth: number;

  // Mingguan
  weeklyBudgetAllowance: number;
  totalSpentThisWeek: number;
  remainingWeeklyBudget: number;

  // Harian & Formula 1 (DSSL)
  dssl: number;
  todayTotalSpend: number;
  todayNeedsSpend: number;
  todayWantsSpend: number;
  remainingDailySafeSpend: number;

  // Formula 2: Daily Overburn Index (DOI)
  doi: number;
  walletStatus: "AMAN" | "WASPADA" | "BENGKAK" | "PENTING_TERDETEKSI";
  statusColor: "matcha" | "honey" | "berry" | "sky";
  statusTitle: string;
  statusDescription: string;

  // Formula 3: Bocor Halus Detector (Micro-Leak)
  microLeaks: MicroLeakFinding[];
  smallTxCumulativePercent: number;

  // Category Breakdown
  categoryBreakdown: {
    category: string;
    group: "need" | "want";
      color: string;
    amount: number;
    percentage: number;
  }[];

  // Companion Evolution & Mood
  casteStage: CasteStage;
  mochiStage: MochiStage;
  mochiMood: MochiMood;
  petMood: PetMood;
  mochiSpeech: string;
}

export function getMochiStageFromLevel(level: number): MochiStage {
  if (level >= 19) return 5;
  if (level >= 13) return 4;
  if (level >= 8) return 3;
  if (level >= 4) return 2;
  return 1;
}

export function getLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const xpPerLevel = 120;
  const level = Math.max(1, Math.floor(xp / xpPerLevel) + 1);
  const currentLevelXp = xp % xpPerLevel;
  const nextLevelXp = xpPerLevel;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / nextLevelXp) * 100)
  );
  return { level, currentLevelXp, nextLevelXp, progressPercent };
}

export function analyzeSpendingDetective(params: {
  transactions: TransactionRecord[];
  monthlyBudgetTarget: number;
  monthlySavingTarget: number;
  userLevel: number;
  currentStage?: CasteStage;
  petCustomName?: string;
  isProudComboActive?: boolean;
  referenceDateStr?: string;
}): SpendingDetectiveReport {
  const {
    transactions: rawTransactions,
    monthlyBudgetTarget,
    monthlySavingTarget,
    userLevel,
    currentStage = 1,
    petCustomName = "Mochi",
    isProudComboActive = false,
    referenceDateStr,
  } = params;

  const petName = petCustomName.trim() || "Mochi";
  const transactions = scoreableTransactions(rawTransactions);

  const todayStr = referenceDateStr || localDateStr();
  const todayDate = new Date(todayStr + "T12:00:00");
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();
  const dayOfMonth = todayDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(1, daysInMonth - dayOfMonth + 1);

  const monthPrefix = todayStr.slice(0, 7);

  const sevenDaysAgoStr = addDaysStr(todayStr, -6);

  const monthlyTx = transactions.filter((t) =>
    t.transaction_date.startsWith(monthPrefix)
  );
  const weeklyTx = transactions.filter(
    (t) =>
      t.transaction_date >= sevenDaysAgoStr && t.transaction_date <= todayStr
  );
  const todayTx = transactions.filter((t) => t.transaction_date === todayStr);

  const totalIncomeThisMonth = monthlyTx
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + Number(t.total_amount), 0);

  const effectiveMonthlyAllowance =
    Math.max(monthlyBudgetTarget, totalIncomeThisMonth) || 1800000;

  const monthlySpendablePool = Math.max(
    0,
    effectiveMonthlyAllowance - monthlySavingTarget
  );

  const totalSpentThisMonth = monthlyTx
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Number(t.total_amount), 0);

  const todayExpenses = todayTx.filter((t) => t.type === "expense");
  const todayTotalSpend = todayExpenses.reduce(
    (acc, t) => acc + Number(t.total_amount),
    0
  );
  const todayNeedsSpend = todayExpenses
    .filter((t) => t.need_or_want === "need")
    .reduce((acc, t) => acc + Number(t.total_amount), 0);
  const todayWantsSpend = todayExpenses
    .filter((t) => t.need_or_want === "want")
    .reduce((acc, t) => acc + Number(t.total_amount), 0);

  const spentBeforeToday = Math.max(0, totalSpentThisMonth - todayTotalSpend);
  const remainingPoolAtStartOfDay = Math.max(
    0,
    monthlySpendablePool - spentBeforeToday
  );

  const dssl = Math.max(
    10000,
    Math.round(remainingPoolAtStartOfDay / remainingDaysInMonth)
  );

  const remainingMonthlyPool = Math.max(
    0,
    monthlySpendablePool - totalSpentThisMonth
  );
  const remainingTotalBalanceThisMonth = Math.max(
    0,
    effectiveMonthlyAllowance - totalSpentThisMonth
  );
  const remainingDailySafeSpend = Math.max(0, dssl - todayTotalSpend);

  const weeklyBudgetAllowance = Math.round(monthlySpendablePool / 4);
  const totalSpentThisWeek = weeklyTx
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Number(t.total_amount), 0);
  const remainingWeeklyBudget = Math.max(
    0,
    weeklyBudgetAllowance - totalSpentThisWeek
  );

  const doi = dssl > 0 ? Number((todayTotalSpend / dssl).toFixed(2)) : 0;

  let walletStatus: SpendingDetectiveReport["walletStatus"] = "AMAN";
  let statusColor: SpendingDetectiveReport["statusColor"] = "matcha";
  let statusTitle = "Dompet Aman Terkendali!";
  let statusDescription =
    "Pengeluaran hari ini masih jauh di bawah batas aman harian. Pertahankan!";

  if (doi <= 0.85) {
    walletStatus = "AMAN";
    statusColor = "matcha";
    statusTitle = "Status Normal (Aman Hijau)";
    statusDescription = `Pengeluaran hari ini baru ${Math.round(
      doi * 100
    )}% dari batas aman harian. ${petName} senang banget!`;
  } else if (doi <= 1.15) {
    walletStatus = "WASPADA";
    statusColor = "honey";
    statusTitle = "Status Waspada (Rem Pelan-Pelan)";
    statusDescription = `Kamu sudah memakai ${Math.round(
      doi * 100
    )}% jatah harian. Tahan jajan tambahan sore/malam ini ya!`;
  } else {
    if (todayWantsSpend > 0.4 * todayTotalSpend) {
      walletStatus = "BENGKAK";
      statusColor = "berry";
      statusTitle = "Status Bengkak! (Sirine Detektif Aktif)";
      statusDescription = `Pengeluaran hari ini tembus ${Math.round(
        doi * 100
      )}% batas aman dan didominasi keinginan/jajan!`;
    } else {
      walletStatus = "PENTING_TERDETEKSI";
      statusColor = "sky";
      statusTitle = "Pengeluaran Penting Terdeteksi";
      statusDescription =
        "Hari ini pengeluaran melewati batas harian, tapi mayoritas untuk Kebutuhan Pokok/Kuliah (Bukan Boros!).";
    }
  }

  const weeklyWantsTx = weeklyTx.filter(
    (t) => t.type === "expense" && t.need_or_want === "want"
  );

  const categoryCounts: Record<string, { count: number; total: number }> = {};
  let smallWantsTotal = 0;

  for (const tx of weeklyWantsTx) {
    const amt = Number(tx.total_amount);
    if (amt < 35000) {
      smallWantsTotal += amt;
    }

    const key = tx.category;
    if (!categoryCounts[key]) {
      categoryCounts[key] = { count: 0, total: 0 };
    }
    categoryCounts[key].count += 1;
    categoryCounts[key].total += amt;
  }

  const microLeaks: MicroLeakFinding[] = [];
  for (const [cat, stat] of Object.entries(categoryCounts)) {
    if (stat.count >= 4) {
      const avg = Math.round(stat.total / stat.count);
      const cutCount = 2;
      const saving = avg * cutCount;
      microLeaks.push({
        keywordOrCategory: cat,
        count: stat.count,
        totalSpent: stat.total,
        suggestedCutCount: cutCount,
        potentialSaving: saving,
        message: `Investigasi Detektif ${petName}: Minggu ini kamu sudah beli [${cat}] sebanyak ${
          stat.count
        }x dengan total Rp${stat.total.toLocaleString(
          "id-ID"
        )}. Kalau dikurangi ${cutCount}x saja, kamu bisa hemat Rp${saving.toLocaleString(
          "id-ID"
        )}!`,
      });
    }
  }

  const smallTxCumulativePercent =
    weeklyBudgetAllowance > 0
      ? Math.round((smallWantsTotal / weeklyBudgetAllowance) * 100)
      : 0;

  if (microLeaks.length === 0 && smallTxCumulativePercent >= 30) {
    const saving = Math.round(smallWantsTotal * 0.4);
    microLeaks.push({
      keywordOrCategory: "Jajan Kecil (< Rp35rb)",
      count: weeklyWantsTx.length,
      totalSpent: smallWantsTotal,
      suggestedCutCount: 2,
      potentialSaving: saving,
      message: `Investigasi Detektif ${petName}: Akumulasi jajan kecil (< Rp35.000) minggu ini mencapai ${smallTxCumulativePercent}% dari jatah mingguan (Rp${smallWantsTotal.toLocaleString(
        "id-ID"
      )}). Yuk rem 2x jajan impulsif buat hemat Rp${saving.toLocaleString(
        "id-ID"
      )}!`,
    });
  }

  const catMap: Record<string, number> = {};
  for (const tx of monthlyTx.filter((t) => t.type === "expense")) {
    catMap[tx.category] = (catMap[tx.category] || 0) + Number(tx.total_amount);
  }

  const categoryBreakdown = Object.entries(catMap)
    .map(([category, amount]) => {
      const meta = EXPENSE_CATEGORIES.find((c) => c.name === category) || {
        name: category,
        group: "want" as const,
        color: "#7A6E65",
      };
      return {
        category,
        group: meta.group,
        color: meta.color,
        amount,
        percentage:
          totalSpentThisMonth > 0
            ? Math.round((amount / totalSpentThisMonth) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const mochiStage = Math.min(5, Math.max(1, currentStage || getMochiStageFromLevel(userLevel))) as MochiStage;
  let mochiMood: MochiMood = "happy";
  let petMood: PetMood = "happy";
  let mochiSpeech = `Halo! Aku ${petName}. Catatan kasmu rapi banget hari ini, yuk pertahankan sisa jatah harianmu!`;

  if (isProudComboActive) {
    mochiMood = "proud_combo";
    petMood = "proud";
    mochiSpeech = `STRUK RINCI TERCATAT! ${petName} bangga banget kamu jujur merinci item belanjaan! +10 Poin & +20 Stage XP!`;
  } else if (todayTotalSpend > dssl) {
    if (walletStatus === "BENGKAK") {
      mochiMood = "shocked_boros";
      petMood = "shocked_boros";
      mochiSpeech = `Waduh?! Pengeluaran jajan hari ini lewat batas aman! Detektif ${petName} menyalakan alarm hemat!`;
    } else {
      mochiMood = "worried";
      petMood = "worried";
      mochiSpeech = `Hmm, hari ini ada pengeluaran kebutuhan penting yang lumayan besar. Besok kita bareng ${petName} lebih hemat ya!`;
    }
  } else if (todayTotalSpend >= 0.8 * dssl) {
    mochiMood = "worried";
    petMood = "worried";
    mochiSpeech = `Hati-hati ya, jatah aman harianmu tinggal sedikit lagi. ${petName} ingatkan jangan tergoda jajan sore ini!`;
  } else if (microLeaks.length > 0) {
    mochiMood = "happy";
    petMood = "happy";
    mochiSpeech = `Hari ini aman, tapi Detektif ${petName} mengendus bocor halus di kategori ${microLeaks[0].keywordOrCategory}!`;
  }

  return {
    monthlyAllowance: effectiveMonthlyAllowance,
    monthlySavingTarget,
    monthlySpendablePool,
    totalIncomeThisMonth,
    totalSpentThisMonth,
    remainingMonthlyPool,
    remainingTotalBalanceThisMonth,
    daysInMonth,
    remainingDaysInMonth,
    weeklyBudgetAllowance,
    totalSpentThisWeek,
    remainingWeeklyBudget,
    dssl,
    todayTotalSpend,
    todayNeedsSpend,
    todayWantsSpend,
    remainingDailySafeSpend,
    doi,
    walletStatus,
    statusColor,
    statusTitle,
    statusDescription,
    microLeaks,
    smallTxCumulativePercent,
    categoryBreakdown,
    casteStage: currentStage,
    mochiStage,
    mochiMood,
    petMood,
    mochiSpeech,
  };
}

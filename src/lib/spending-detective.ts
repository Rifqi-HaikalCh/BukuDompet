import type { MochiMood, MochiStage } from "@/components/illustrations/MochiCompanion";

export type TransactionType = "income" | "expense";
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
}

export const EXPENSE_CATEGORIES: {
  name: string;
  group: "need" | "want";
  emoji: string;
  color: string;
}[] = [
  { name: "Makan Pokok", group: "need", emoji: "🍱", color: "#58CC02" },
  { name: "Transportasi", group: "need", emoji: "🚆", color: "#38B6FF" },
  { name: "Kuliah/Alat Tulis", group: "need", emoji: "📚", color: "#CE82FF" },
  { name: "Tagihan", group: "need", emoji: "💡", color: "#FFC800" },
  { name: "Jajan/Cemilan", group: "want", emoji: "🍡", color: "#FF8B7B" },
  { name: "Kopi/Minuman", group: "want", emoji: "🧋", color: "#E5A400" },
  { name: "Nongkrong", group: "want", emoji: "🍕", color: "#FF4B4B" },
  { name: "Belanja/Hiburan", group: "want", emoji: "🛍️", color: "#A552DB" },
  { name: "Lainnya", group: "want", emoji: "✨", color: "#7A6E65" },
];

export const INCOME_CATEGORIES: {
  name: string;
  emoji: string;
}[] = [
  { name: "Uang Saku Bulanan", emoji: "💌" },
  { name: "Bonus Orang Tua / Abang", emoji: "🎁" },
  { name: "Hadiah Tukar Poin Gamifikasi", emoji: "🏆" },
  { name: "Tabungan / Lainnya", emoji: "🪙" },
];

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
 * Validasi apakah daftar item memenuhi syarat "Misi Rinci" (Detailed Itemized Input):
 * - Minimal 2 sub-items
 * - Masing-masing punya harga > 0
 * - Nama item spesifik >= 4 karakter dan bukan kata generik semata ("makan", "jajan", "beli")
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
    // Base +35 Poin | +40 XP, plus +5 Poin per additional item above 2, capped at +50 Poin
    const extraItems = Math.max(0, validItems.length - 2);
    const pointsPreview = Math.min(50, 35 + extraItems * 5);
    return {
      isValidCombo: true,
      validItemsCount: validItems.length,
      pointsPreview,
      xpPreview: 40,
    };
  }

  return {
    isValidCombo: false,
    validItemsCount: validItems.length,
    pointsPreview: 10,
    xpPreview: 15,
    reason:
      items.length < 2
        ? "Tambahkan minimal 2 item rincian untuk mengaktifkan COMBO DETAIL (+35 Poin)!"
        : "Tulis nama item spesifik (min. 4 huruf, contoh: 'Nasi Goreng', bukan cuma 'Makan').",
  };
}

/**
 * Smart Quick-Split Parser
 * Contoh input: "Nasi Goreng 15k, Es Teh 5000, Kerupuk 2x 1500"
 * atau "Nasi Ayam Bakar 18.000, Air Mineral 5rb"
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
    // Match optional quantity like "2x " or "x2" and price at the end like "15k", "15rb", "15.000", "15000"
    const priceRegex = /^(.*?)\s+(?:(\d+)\s*[xX]\s*)?Rp?\s*(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)?$/i;
    const match = seg.match(priceRegex);

    if (match) {
      let rawName = match[1].trim();
      let qty = match[2] ? parseInt(match[2], 10) : 1;

      // Also check if quantity was at the start of rawName like "2x Kerupuk"
      const startQtyMatch = rawName.match(/^(\d+)\s*[xX]\s+(.+)$/);
      if (startQtyMatch) {
        qty = parseInt(startQtyMatch[1], 10);
        rawName = startQtyMatch[2].trim();
      }

      const rawNumStr = match[3].replace(/\./g, "").replace(",", ".");
      let num = parseFloat(rawNumStr);
      const suffix = match[4]?.toLowerCase();

      if (suffix === "k" || suffix === "rb" || suffix === "ribu") {
        // If user wrote 15k -> 15000
        num = num * 1000;
      } else if (num > 0 && num < 500) {
        // Heuristic: in Rupiah, if someone types "Es Teh 5" or "Nasi Goreng 15", treat < 500 as thousands
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
  remainingMonthlyPool: number; // Sisa uang saku yang aman dipakai
  remainingTotalBalanceThisMonth: number; // Total sisa uang termasuk target tabungan
  daysInMonth: number;
  remainingDaysInMonth: number;

  // Mingguan
  weeklyBudgetAllowance: number;
  totalSpentThisWeek: number;
  remainingWeeklyBudget: number;

  // Harian & Formula 1 (DSSL)
  dssl: number; // Dynamic Daily Safe Spend Limit
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
    emoji: string;
    color: string;
    amount: number;
    percentage: number;
  }[];

  // Mochi Companion Evolution & Mood
  mochiStage: MochiStage;
  mochiMood: MochiMood;
  mochiSpeech: string;
}

/**
 * Kalkulasi Level & Stage Mochi berdasarkan Level & Tabungan:
 * Stage 1 (Lv 1-3): Mochi Kardus
 * Stage 2 (Lv 4-7): Mochi Perintis
 * Stage 3 (Lv 8-12): Mochi Manajer
 * Stage 4 (Lv 13-18): Mochi Bos Muda
 * Stage 5 (Lv 19+): Sultan Mochi Jutawan
 */
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
  // Setiap level membutuhkan 120 XP
  const xpPerLevel = 120;
  const level = Math.max(1, Math.floor(xp / xpPerLevel) + 1);
  const currentLevelXp = xp % xpPerLevel;
  const nextLevelXp = xpPerLevel;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));
  return { level, currentLevelXp, nextLevelXp, progressPercent };
}

export function analyzeSpendingDetective(params: {
  transactions: TransactionRecord[];
  monthlyBudgetTarget: number;
  monthlySavingTarget: number;
  userLevel: number;
  isProudComboActive?: boolean;
  referenceDateStr?: string; // YYYY-MM-DD
}): SpendingDetectiveReport {
  const {
    transactions,
    monthlyBudgetTarget,
    monthlySavingTarget,
    userLevel,
    isProudComboActive = false,
    referenceDateStr,
  } = params;

  const todayStr =
    referenceDateStr || new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr + "T12:00:00");
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();
  const dayOfMonth = todayDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDaysInMonth = Math.max(1, daysInMonth - dayOfMonth + 1);

  const monthPrefix = todayStr.slice(0, 7); // YYYY-MM

  // 7-day window start
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setDate(todayDate.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const monthlyTx = transactions.filter((t) =>
    t.transaction_date.startsWith(monthPrefix)
  );
  const weeklyTx = transactions.filter(
    (t) => t.transaction_date >= sevenDaysAgoStr && t.transaction_date <= todayStr
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

  // Spent before today this month so DSSL for today is stable throughout the day
  const spentBeforeToday = Math.max(0, totalSpentThisMonth - todayTotalSpend);
  const remainingPoolAtStartOfDay = Math.max(
    0,
    monthlySpendablePool - spentBeforeToday
  );

  // Formula 1: Dynamic Daily Safe Spend Limit (DSSL)
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

  // Weekly calculation
  const weeklyBudgetAllowance = Math.round(monthlySpendablePool / 4);
  const totalSpentThisWeek = weeklyTx
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Number(t.total_amount), 0);
  const remainingWeeklyBudget = Math.max(
    0,
    weeklyBudgetAllowance - totalSpentThisWeek
  );

  // Formula 2: Daily Overburn Index (DOI)
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
    )}% dari batas aman harian. Mochi senang banget!`;
  } else if (doi <= 1.15) {
    walletStatus = "WASPADA";
    statusColor = "honey";
    statusTitle = "Status Waspada (Rem Pelan-Pelan)";
    statusDescription = `Kamu sudah memakai ${Math.round(
      doi * 100
    )}% jatah harian. Tahan jajan tambahan sore/malam ini ya!`;
  } else {
    // doi > 1.15
    if (todayWantsSpend > 0.4 * todayTotalSpend) {
      walletStatus = "BENGKAK";
      statusColor = "berry";
      statusTitle = "Status Bengkak! (Sirine Detektif Aktif 🚨)";
      statusDescription = `Pengeluaran hari ini tembus ${Math.round(
        doi * 100
      )}% batas aman dan didominasi keinginan/jajan!`;
    } else {
      walletStatus = "PENTING_TERDETEKSI";
      statusColor = "sky";
      statusTitle = "Pengeluaran Penting Terdeteksi 📚";
      statusDescription =
        "Hari ini pengeluaran melewati batas harian, tapi mayoritas untuk Kebutuhan Pokok/Kuliah (Bukan Boros!).";
    }
  }

  // Formula 3: Bocor Halus Detector (Micro-Leak / Latte Factor)
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
        message: `🕵️‍♂️ Investigasi Detektif Mochi: Minggu ini kamu sudah beli [${cat}] sebanyak ${
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
      message: `🕵️‍♂️ Investigasi Detektif Mochi: Akumulasi jajan kecil (< Rp35.000) minggu ini mencapai ${smallTxCumulativePercent}% dari jatah mingguan (Rp${smallWantsTotal.toLocaleString(
        "id-ID"
      )}). Yuk rem 2x jajan impulsif buat hemat Rp${saving.toLocaleString(
        "id-ID"
      )}!`,
    });
  }

  // Category Breakdown for current month expenses
  const catMap: Record<string, number> = {};
  for (const tx of monthlyTx.filter((t) => t.type === "expense")) {
    catMap[tx.category] = (catMap[tx.category] || 0) + Number(tx.total_amount);
  }

  const categoryBreakdown = Object.entries(catMap)
    .map(([category, amount]) => {
      const meta = EXPENSE_CATEGORIES.find((c) => c.name === category) || {
        name: category,
        group: "want" as const,
        emoji: "✨",
        color: "#7A6E65",
      };
      return {
        category,
        group: meta.group,
        emoji: meta.emoji,
        color: meta.color,
        amount,
        percentage:
          totalSpentThisMonth > 0
            ? Math.round((amount / totalSpentThisMonth) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Mochi Companion Mood & Stage
  const mochiStage = getMochiStageFromLevel(userLevel);
  let mochiMood: MochiMood = "happy";
  let mochiSpeech =
    "Meow! Catatan kasmu rapi banget hari ini. Yuk pertahankan sisa jatah harianmu! 🐾✨";

  if (isProudComboActive) {
    mochiMood = "proud_combo";
    mochiSpeech =
      "COMBO DETAIL!! Wah kamu jujur & teliti banget merinci item belanjaan! +Bonus Poin masuk celengan! 🎉🐱";
  } else if (todayTotalSpend > dssl) {
    if (walletStatus === "BENGKAK") {
      mochiMood = "shocked_boros";
      mochiSpeech =
        "Meoww?! 😱 Pengeluaran jajan hari ini lewat batas aman! Detektif Mochi menyalakan alarm hemat!";
    } else {
      mochiMood = "worried";
      mochiSpeech =
        "Hmm, hari ini ada pengeluaran kebutuhan penting yang lumayan besar. Besok kita lebih hemat ya! 📚🐾";
    }
  } else if (todayTotalSpend >= 0.8 * dssl) {
    mochiMood = "worried";
    mochiSpeech =
      "Hati-hati ya, jatah aman harianmu tinggal sedikit lagi. Jangan tergoda kopi atau boba sore ini! 🧋🚫";
  } else if (microLeaks.length > 0) {
    mochiMood = "happy";
    mochiSpeech = `Meow! Hari ini aman, tapi Detektif Mochi mengendus bocor halus di kategori ${microLeaks[0].keywordOrCategory}! 🕵️‍♂️`;
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
    mochiStage,
    mochiMood,
    mochiSpeech,
  };
}

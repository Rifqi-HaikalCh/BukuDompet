/**
 * "Buka Dompet" (V5.6.1): dompet tidak lagi dibuat diam-diam. Anak memilih sendiri — mengikuti rekomendasi sistem
 * atau menyusun manual — lalu hasilnya disimpan sebagai dokumen `sub_wallets` (deterministik, zero-sum).
 * Murni: tanpa React / store.
 */
import { addDaysStr } from "../dates";
import { cycleBounds, cycleStartOf, prevCycleKey } from "./cycle";
import { isCounted, netAmount } from "./ledger";
import { VAULT_WALLET_KEY, WALLET_PRESETS, isAllocatable, walletIdFor } from "./wallets";
import type { FinTx, SubWallet, WalletType } from "./types";

export type OpenVia = "recommendation" | "manual";
export type PlanType = Extract<WalletType, "operational" | "commitment" | "emergency">;

export interface PlanItem {
  /** Kunci preset ("food", …) atau `c-<id>` untuk dompet buatan sendiri. */
  key: string;
  name: string;
  type: PlanType;
  categories: string[];
  allocated: number;
  /** Penjelasan singkat untuk anak: kenapa angka ini dianjurkan. */
  reason?: string;
  custom?: boolean;
}

export const MAX_WALLET_NAME = 40;
export const MAX_CUSTOM_WALLETS = 8;

/** Semua kategori pengeluaran yang dikenal (gabungan kategori preset). */
export const KNOWN_EXPENSE_CATEGORIES: string[] = [...new Set(WALLET_PRESETS.flatMap((p) => p.categories))];

const presetKeyForCategory = (cat: string): string => WALLET_PRESETS.find((p) => p.categories.includes(cat))?.key ?? "fun";
const roundDown = (n: number) => Math.floor(Math.max(0, n) / 1000) * 1000;

export interface Recommendation {
  items: PlanItem[];
  basis: "history" | "default";
  /** Kalimat ringkas untuk header rekomendasi. */
  note: string;
}

/**
 * Rekomendasi sistem. Dengan riwayat ≥ 8 pengeluaran dalam 2 siklus terakhir, 65% bobot mengikuti pembagian
 * pengeluaran nyata dan 35% bobot standar (supaya tidak ada dompet yang kelaparan); selain itu bobot standar.
 * Hanya dompet preset yang BELUM ada yang diusulkan; total alokasi tidak pernah melebihi `free`.
 */
export function recommendWalletPlan(a: { free: number; txs: readonly FinTx[]; userId: string; today: string; startDay: number; existing: readonly SubWallet[] }): Recommendation {
  const have = new Set(a.existing.filter((w) => w.userId === a.userId && !w.archived).map((w) => w.key));
  const presets = WALLET_PRESETS.filter((p) => !have.has(p.key));
  const cur = cycleBounds(a.today, a.startDay);
  const from = cycleStartOf(prevCycleKey(prevCycleKey(cur.key)), a.startDay);
  const to = addDaysStr(cur.start, -1);
  const spendByPreset: Record<string, number> = {};
  let count = 0;
  let total = 0;
  for (const t of a.txs) {
    if (t.user_id !== a.userId || t.type !== "expense" || !isCounted(t) || t.linkedGrantId || t.isReimbursable) continue;
    if (t.transaction_date < from || t.transaction_date > to) continue;
    const n = netAmount(t);
    if (n <= 0) continue;
    count += 1;
    total += n;
    const k = presetKeyForCategory(t.category);
    spendByPreset[k] = (spendByPreset[k] ?? 0) + n;
  }
  const useHistory = count >= 8 && total > 0;
  const nonEmergency = WALLET_PRESETS.filter((p) => p.type !== "emergency");
  const weightSum = nonEmergency.reduce((s, p) => s + p.weight, 0);
  const rawWeight = (key: string): number => {
    const p = WALLET_PRESETS.find((x) => x.key === key)!;
    if (p.type === "emergency" || !useHistory) return p.weight;
    const share = (spendByPreset[key] ?? 0) / total;
    return 0.65 * share * weightSum + 0.35 * p.weight;
  };
  const sum = presets.reduce((s, p) => s + rawWeight(p.key), 0);
  const items: PlanItem[] = presets.map((p) => {
    const w = sum > 0 ? rawWeight(p.key) / sum : 0;
    const pct = Math.round(w * 100);
    let reason: string;
    if (p.type === "emergency") reason = `Disisihkan sekitar ${pct}% untuk kejadian tak terduga.`;
    else if (useHistory) reason = `Sekitar ${Math.round(((spendByPreset[p.key] ?? 0) / total) * 100)}% pengeluaranmu 2 bulan terakhir ada di sini.`;
    else reason = `Pembagian standar sekitar ${pct}%. Makin pas setelah ada riwayat catatan.`;
    if (p.locked) reason += " Terkunci khusus tagihan rutin.";
    return { key: p.key, name: p.name, type: p.type as PlanType, categories: [...p.categories], allocated: roundDown(a.free * w), reason };
  });
  // sisa pembulatan (kelipatan Rp1.000) diberikan ke dompet harian agar uang bulanan terbagi rapat
  const used = items.reduce((s, i) => s + i.allocated, 0);
  const remainder = roundDown(a.free - used);
  const target = items.find((i) => i.key === "food") ?? items.find((i) => i.type === "operational") ?? items[0];
  if (target && remainder > 0) target.allocated += remainder;
  return {
    items,
    basis: useHistory ? "history" : "default",
    note: useHistory ? `Disusun dari ${count} catatan pengeluaranmu dalam 2 siklus terakhir.` : "Belum cukup riwayat, jadi memakai pembagian standar yang aman.",
  };
}

export type PlanCheck = { ok: true } | { ok: false; error: string };

/** Aturan zero-sum + kerapian: nama unik, kategori tidak ganda, total tidak melebihi uang yang belum dibagi. */
export function validateWalletPlan(items: readonly PlanItem[], a: { free: number; existing: readonly SubWallet[]; userId: string }): PlanCheck {
  if (items.length === 0) return { ok: false, error: "Pilih atau buat minimal satu dompet." };
  const live = a.existing.filter((w) => w.userId === a.userId && !w.archived && isAllocatable(w));
  const names = new Set(live.map((w) => w.name.trim().toLowerCase()));
  const cats = new Map<string, string>();
  for (const w of live) for (const c of w.categories) cats.set(c, w.name);
  let customCount = live.filter((w) => w.key.startsWith("c-")).length;
  let total = 0;
  for (const it of items) {
    const name = it.name.trim();
    if (!name) return { ok: false, error: "Setiap dompet butuh nama." };
    if (name.length > MAX_WALLET_NAME) return { ok: false, error: `Nama dompet maksimal ${MAX_WALLET_NAME} huruf.` };
    if (names.has(name.toLowerCase())) return { ok: false, error: `Nama "${name}" sudah dipakai dompet lain.` };
    names.add(name.toLowerCase());
    if (!Number.isInteger(it.allocated) || it.allocated < 0) return { ok: false, error: `Jumlah untuk "${name}" harus bilangan bulat, 0 atau lebih.` };
    if (it.custom) {
      customCount += 1;
      if (customCount > MAX_CUSTOM_WALLETS) return { ok: false, error: `Dompet buatan sendiri maksimal ${MAX_CUSTOM_WALLETS}.` };
      if (it.type === "emergency") return { ok: false, error: "Dompet darurat sudah tersedia sebagai dompet bawaan." };
    }
    for (const c of it.categories) {
      if (!KNOWN_EXPENSE_CATEGORIES.includes(c)) return { ok: false, error: `Kategori "${c}" tidak dikenal.` };
      const owner = cats.get(c);
      if (owner) return { ok: false, error: `Kategori "${c}" sudah dipakai ${owner}. Satu kategori hanya boleh masuk satu dompet.` };
      cats.set(c, name);
    }
    total += it.allocated;
  }
  if (total > a.free) return { ok: false, error: `Total alokasi melebihi uang yang belum dibagi (Rp${Math.max(0, a.free).toLocaleString("id-ID")}).` };
  return { ok: true };
}

/** Dompet baru siap simpan. Brankas Tabungan (tabungan wajib) ikut dibuat bila belum ada. */
export function buildOpenedWallets(a: {
  userId: string;
  items: readonly PlanItem[];
  via: OpenVia;
  cycleKey: string;
  mandatory: number;
  existing: readonly SubWallet[];
  byId: string;
  nowIso: string;
  /** Pembuat sufiks unik untuk dompet buatan sendiri. */
  uid: () => string;
}): SubWallet[] {
  const out: SubWallet[] = [];
  const meta = { openedVia: a.via, openedAt: a.nowIso, openedBy: a.byId, createdAt: a.nowIso, updatedAt: a.nowIso } as const;
  for (const it of a.items) {
    const preset = WALLET_PRESETS.find((p) => p.key === it.key);
    const key = it.custom ? `c-${a.uid()}` : it.key;
    const locked = it.type === "commitment";
    out.push({
      id: walletIdFor(a.userId, key),
      userId: a.userId,
      key,
      name: it.name.trim(),
      type: it.type,
      allocated: Math.round(it.allocated),
      cycleKey: a.cycleKey,
      categories: [...it.categories],
      ...(locked || preset?.locked ? { isLocked: true } : {}),
      ...meta,
    });
  }
  const hasVault = a.existing.some((w) => w.userId === a.userId && w.key === VAULT_WALLET_KEY);
  if (!hasVault) {
    out.push({
      id: walletIdFor(a.userId, VAULT_WALLET_KEY),
      userId: a.userId,
      key: VAULT_WALLET_KEY,
      name: "Brankas Tabungan",
      type: "savings",
      allocated: a.mandatory,
      cycleKey: a.cycleKey,
      categories: [],
      ...meta,
    });
  }
  return out;
}

/** Arsip hanya bila belum ada pemakaian di siklus ini, supaya uang yang sudah terpakai tidak terhitung dua kali. */
export function canArchiveWallet(w: Pick<SubWallet, "type" | "archived">, spentThisCycle: number): PlanCheck {
  if (w.archived) return { ok: false, error: "Dompet ini sudah diarsipkan." };
  if (w.type === "savings") return { ok: false, error: "Brankas Tabungan tidak bisa diarsipkan." };
  if (w.type === "grant") return { ok: false, error: "Dompet kebutuhan darurat selesai lewat penyelesaian, bukan diarsipkan." };
  if (spentThisCycle > 0) return { ok: false, error: "Dompet ini sudah dipakai bulan ini. Geser sisa saldonya dulu, lalu arsipkan bulan depan." };
  return { ok: true };
}

/** Dompet tanpa penanda `openedVia` dibuat otomatis oleh versi sebelumnya. */
export const openedViaOf = (w: Pick<SubWallet, "openedVia">): NonNullable<SubWallet["openedVia"]> => w.openedVia ?? "legacy";

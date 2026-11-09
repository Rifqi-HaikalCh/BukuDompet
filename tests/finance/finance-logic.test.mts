// Uji logika keuangan Versi 5.6 (murni, tanpa database).
// Jalankan: npx tsx tests/finance/finance-logic.test.mts
import assert from "node:assert/strict";
import { cycleBounds, cycleKeyOf, nextCycleKey, prevCycleKey } from "../../src/lib/finance/cycle.ts";
import { validateBudgetInput, budgetChangeWarning, defaultBudgetFor, activeBudgetAt, applyBudgetChange } from "../../src/lib/finance/budget.ts";
import { cycleTotals, recordedCash, scoreableTransactions } from "../../src/lib/finance/ledger.ts";
import {
  makeDefaultWallets, allocateToWallet, unallocatedCash, monthlyCashOf, walletBalance, checkExpense, transferBetween,
  suggestAutoSplit, applyAutoSplit, pickWalletForCategory, rollWalletsToCycle, walletIdFor,
} from "../../src/lib/finance/wallets.ts";
import { findReconcileCandidate, buildSupervisorIncome, verifiedPatch } from "../../src/lib/finance/income.ts";
import { buildGrantRequest, approveGrant, rejectGrant, settleGrant, validateGrantInput } from "../../src/lib/finance/grants.ts";
import { computeClosingFigures, splitSurplus, buildClosing, carriedOverBalance, closingBonusPoints } from "../../src/lib/finance/closing.ts";
import { safeToSpendToday, needsCoolingOff, cancelOutcome, planVaultDip, buildAdjustmentTx, weeklyLeakStats, openFriendDebts } from "../../src/lib/finance/habits.ts";
import { recommendWalletPlan, validateWalletPlan, buildOpenedWallets, canArchiveWallet, openedViaOf, MAX_CUSTOM_WALLETS, type PlanItem } from "../../src/lib/finance/opening.ts";
import type { FinTx, SubWallet, MonthlyClosing } from "../../src/lib/finance/types.ts";

let pass = 0, fail = 0;
const t = (name: string, f: () => void) => {
  try { f(); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  GAGAL", name, "\n   ", (e as Error).message.split("\n").slice(0, 6).join("\n    ")); }
};

const U = "u1", NOW = "2026-11-09T05:00:00.000Z";
const tx = (o: Partial<FinTx> & { id: string }): FinTx => ({
  user_id: U, type: "expense", category: "Makan Pokok", need_or_want: "need", title: "x", total_amount: 10000,
  transaction_date: "2026-11-09", created_at: NOW, ...o,
});

console.log("Siklus");
t("siklus tanggal 1 = bulan kalender", () => {
  const c = cycleBounds("2026-11-09", 1);
  assert.equal(c.key, "2026-11"); assert.equal(c.start, "2026-11-01"); assert.equal(c.end, "2026-11-30");
  assert.equal(c.totalDays, 30); assert.equal(c.daysLeft, 22);
});
t("siklus mulai tgl 25 melewati pergantian bulan & tahun", () => {
  assert.equal(cycleKeyOf("2026-11-24", 25), "2026-10");
  assert.equal(cycleKeyOf("2026-11-25", 25), "2026-11");
  const c = cycleBounds("2027-01-10", 25);
  assert.equal(c.key, "2026-12"); assert.equal(c.start, "2026-12-25"); assert.equal(c.end, "2027-01-24");
  assert.equal(nextCycleKey("2026-12"), "2027-01"); assert.equal(prevCycleKey("2027-01"), "2026-12");
});
t("tanggal mulai di luar 1–28 dijepit", () => { assert.equal(cycleBounds("2026-02-10", 31).start, "2026-01-28"); });

console.log("Anggaran (Fase 3)");
t("tabungan wajib >= anggaran ditolak", () => {
  assert.equal(validateBudgetInput({ monthlyBudget: 1_000_000, mandatorySavingsTarget: 1_000_000, cycleStartDay: 1, rolloverPolicy: "auto_vault" }).ok, false);
  assert.equal(validateBudgetInput({ monthlyBudget: 1_000_000, mandatorySavingsTarget: 1_200_000, cycleStartDay: 1, rolloverPolicy: "auto_vault" }).errors.mandatorySavingsTarget !== undefined, true);
  assert.equal(validateBudgetInput({ monthlyBudget: 1_000_000, mandatorySavingsTarget: 999_999, cycleStartDay: 1, rolloverPolicy: "auto_vault" }).ok, true);
});
t("anggaran 0, tanggal 0/29 ditolak", () => {
  assert.equal(validateBudgetInput({ monthlyBudget: 0, mandatorySavingsTarget: 0, cycleStartDay: 1, rolloverPolicy: "split_choice" }).ok, false);
  assert.equal(validateBudgetInput({ monthlyBudget: 1, mandatorySavingsTarget: 0, cycleStartDay: 0, rolloverPolicy: "split_choice" }).ok, false);
  assert.equal(validateBudgetInput({ monthlyBudget: 1, mandatorySavingsTarget: 0, cycleStartDay: 29, rolloverPolicy: "split_choice" }).ok, false);
});
t("peringatan: anggaran baru < terpakai (bulan ini) menyarankan bulan depan", () => {
  const w = budgetChangeWarning({ scope: "current_month", newBudget: 500_000, spentThisCycle: 700_000 });
  assert.ok(w); assert.equal(w!.recommendedScope, "next_month");
  assert.equal(budgetChangeWarning({ scope: "next_month", newBudget: 500_000, spentThisCycle: 700_000 }), null);
  assert.equal(budgetChangeWarning({ scope: "current_month", newBudget: 800_000, spentThisCycle: 700_000 }), null);
});
t("nilai awal Admin selalu valid (tanpa bagi nol)", () => {
  for (const p of [{}, { monthly_budget_target: 0 }, { monthly_budget_target: 100, monthly_saving_target: 500 }]) {
    const d = defaultBudgetFor(p);
    assert.ok(d.monthlyBudget > 0); assert.ok(d.mandatorySavingsTarget < d.monthlyBudget);
  }
});
t("perubahan 'bulan depan' baru berlaku siklus berikutnya", () => {
  const fb = defaultBudgetFor({ monthly_budget_target: 1_000_000, monthly_saving_target: 200_000 });
  const cfg = applyBudgetChange(undefined, { monthlyBudget: 2_000_000, mandatorySavingsTarget: 300_000, cycleStartDay: 1, rolloverPolicy: "auto_vault", effectiveScope: "next_month" },
    { userId: U, byId: "sv", today: "2026-11-09", nowIso: NOW, fallback: fb });
  assert.equal(activeBudgetAt(cfg, "2026-11-20", fb).monthlyBudget, 1_000_000);
  assert.equal(activeBudgetAt(cfg, "2026-11-20", fb).hasPendingChange, true);
  assert.equal(activeBudgetAt(cfg, "2026-12-01", fb).monthlyBudget, 2_000_000);
  const now = applyBudgetChange(cfg, { monthlyBudget: 1_800_000, mandatorySavingsTarget: 100_000, cycleStartDay: 1, rolloverPolicy: "auto_vault", effectiveScope: "current_month" },
    { userId: U, byId: "sv", today: "2026-11-09", nowIso: NOW, fallback: fb });
  assert.equal(activeBudgetAt(now, "2026-11-09", fb).monthlyBudget, 1_800_000);
});

console.log("Dompet zero-sum (Fase 4.4)");
const mkWallets = () => makeDefaultWallets(U, "2026-11", 200_000, NOW);
t("dompet bawaan lengkap & tabungan terpisah", () => {
  const w = mkWallets();
  assert.equal(w.length, 6);
  assert.deepEqual(w.map((x) => x.type).sort(), ["commitment", "emergency", "operational", "operational", "operational", "savings"]);
  assert.equal(w.find((x) => x.key === "bills")!.isLocked, true);
  assert.equal(pickWalletForCategory("Transportasi", w)!.key, "transport");
  assert.equal(pickWalletForCategory("Tagihan", w)!.key, "bills");
  assert.equal(pickWalletForCategory("Nongkrong", w)!.key, "fun");
});
t("alokasi tidak boleh melebihi uang yang belum dibagi", () => {
  const cash = monthlyCashOf({ monthlyBudget: 1_000_000, incomeInCycle: 1_000_000, carriedOver: 0 });
  let w = mkWallets();
  assert.equal(unallocatedCash({ monthlyCash: cash, mandatorySavingsTarget: 200_000, wallets: w, cycleKey: "2026-11" }), 800_000);
  const r = allocateToWallet(w, walletIdFor(U, "food"), 500_000, { monthlyCash: cash, mandatorySavingsTarget: 200_000, cycleKey: "2026-11", nowIso: NOW });
  assert.ok(r.ok); w = (r as { wallets: SubWallet[] }).wallets;
  assert.equal(unallocatedCash({ monthlyCash: cash, mandatorySavingsTarget: 200_000, wallets: w, cycleKey: "2026-11" }), 300_000);
  const over = allocateToWallet(w, walletIdFor(U, "fun"), 300_001, { monthlyCash: cash, mandatorySavingsTarget: 200_000, cycleKey: "2026-11", nowIso: NOW });
  assert.equal(over.ok, false);
});
t("Bagi Otomatis tidak pernah melebihi sisa", () => {
  const w = mkWallets();
  const split = suggestAutoSplit(799_999, w);
  const total = Object.values(split).reduce((a, b) => a + b, 0);
  assert.ok(total <= 799_999 && total > 600_000);
  const applied = applyAutoSplit(w, split, "2026-11", NOW);
  assert.ok(unallocatedCash({ monthlyCash: 999_999, mandatorySavingsTarget: 200_000, wallets: applied, cycleKey: "2026-11" }) >= 0);
});
t("saldo dompet = alokasi − pengeluaran ber-walletId; hibah & patungan dipisah", () => {
  let w = mkWallets();
  w = allocateToWallet(w, walletIdFor(U, "food"), 100_000, { monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, cycleKey: "2026-11", nowIso: NOW }) .ok ? (allocateToWallet(w, walletIdFor(U, "food"), 100_000, { monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, cycleKey: "2026-11", nowIso: NOW }) as { wallets: SubWallet[] }).wallets : w;
  const food = w.find((x) => x.key === "food")!;
  const txs = [
    tx({ id: "a", walletId: food.id, total_amount: 30_000 }),
    tx({ id: "b", walletId: food.id, total_amount: 20_000, isReimbursable: true }),
    tx({ id: "c", walletId: food.id, total_amount: 15_000, isReimbursable: true, reimbursedAt: NOW }),
    tx({ id: "d", walletId: food.id, total_amount: 99_000, transaction_date: "2026-10-31" }),
  ];
  assert.equal(walletBalance(food, txs, { start: "2026-11-01", end: "2026-11-30" }), 100_000 - 30_000 - 20_000);
});
t("saldo tidak cukup → tahan; dompet komitmen terkunci hanya untuk tagihan", () => {
  let w = mkWallets();
  const mk = (id: string, amt: number) => allocateToWallet(w, id, amt, { monthlyCash: 5_000_000, mandatorySavingsTarget: 0, cycleKey: "2026-11", nowIso: NOW }) as { wallets: SubWallet[] };
  w = mk(walletIdFor(U, "food"), 50_000).wallets;
  w = mk(walletIdFor(U, "bills"), 300_000).wallets;
  const food = w.find((x) => x.key === "food")!, bills = w.find((x) => x.key === "bills")!;
  const c1 = checkExpense({ wallet: food, amount: 60_000, balance: 50_000, category: "Makan Pokok", today: "2026-11-09" });
  assert.deepEqual(c1, { ok: false, code: "insufficient", shortBy: 10_000 });
  assert.equal((checkExpense({ wallet: bills, amount: 10_000, balance: 300_000, category: "Jajan/Cemilan", today: "2026-11-09" }) as { code: string }).code, "locked");
  assert.equal(checkExpense({ wallet: bills, amount: 10_000, balance: 300_000, category: "Tagihan", today: "2026-11-09" }).ok, true);
  const tr = transferBetween({ wallets: w, fromId: bills.id, toId: food.id, amount: 10_000, reason: "butuh", fromBalance: 300_000, today: "2026-11-09", nowIso: NOW });
  assert.equal(tr.ok, false);
  const due = transferBetween({ wallets: w.map((x) => (x.id === bills.id ? { ...x, lockUntil: "2026-11-05" } : x)), fromId: bills.id, toId: food.id, amount: 10_000, reason: "tagihan sudah lunas", fromBalance: 300_000, today: "2026-11-09", nowIso: NOW });
  assert.equal(due.ok, true);
});
t("geser saldo zero-sum & wajib alasan", () => {
  let w = mkWallets();
  w = (allocateToWallet(w, walletIdFor(U, "food"), 100_000, { monthlyCash: 1_000_000, mandatorySavingsTarget: 0, cycleKey: "2026-11", nowIso: NOW }) as { wallets: SubWallet[] }).wallets;
  const before = w.reduce((s, x) => s + (x.type === "savings" ? 0 : x.allocated), 0);
  assert.equal(transferBetween({ wallets: w, fromId: walletIdFor(U, "food"), toId: walletIdFor(U, "fun"), amount: 10_000, reason: "", fromBalance: 100_000, today: "2026-11-09", nowIso: NOW }).ok, false);
  const r = transferBetween({ wallets: w, fromId: walletIdFor(U, "food"), toId: walletIdFor(U, "fun"), amount: 40_000, reason: "ada acara sekolah", fromBalance: 100_000, today: "2026-11-09", nowIso: NOW });
  assert.ok(r.ok);
  const after = (r as { wallets: SubWallet[] }).wallets.reduce((s, x) => s + (x.type === "savings" ? 0 : x.allocated), 0);
  assert.equal(after, before);
});
t("pindah siklus mengecilkan rencana bila uang berkurang", () => {
  let w = mkWallets();
  w = (allocateToWallet(w, walletIdFor(U, "food"), 600_000, { monthlyCash: 1_000_000, mandatorySavingsTarget: 0, cycleKey: "2026-11", nowIso: NOW }) as { wallets: SubWallet[] }).wallets;
  const rolled = rollWalletsToCycle(w, U, "2026-12", 300_000, 100_000, NOW);
  assert.ok(rolled.filter((x) => x.type !== "savings").reduce((s, x) => s + x.allocated, 0) <= 300_000);
  assert.equal(rolled.find((x) => x.type === "savings")!.allocated, 100_000);
});

console.log("Pemasukan dua arah + rekonsiliasi (Fase 4.1)");
const child = (id: string, amt: number, iso: string): FinTx => tx({ id, type: "income", need_or_want: "income", category: "Uang Saku Bulanan", total_amount: amt, createdByRole: "child", verificationStatus: "pending_supervisor", created_at: iso, transaction_date: iso.slice(0, 10) });
t("kiriman Supervisor yang cocok ≤10% dalam 72 jam ditemukan", () => {
  const list = [child("c1", 100_000, "2026-11-07T10:00:00.000Z"), child("c2", 500_000, "2026-11-08T10:00:00.000Z")];
  const m = findReconcileCandidate({ amount: 105_000, nowIso: NOW, userId: U }, list);
  assert.equal(m?.id, "c1");
  assert.equal(findReconcileCandidate({ amount: 130_000, nowIso: NOW, userId: U }, list), null); // >10%
  assert.equal(findReconcileCandidate({ amount: 100_000, nowIso: "2026-11-12T11:00:00.000Z", userId: U }, list), null); // >72 jam
});
t("pilih jumlah persis sama lebih dulu", () => {
  const list = [child("c1", 104_000, "2026-11-08T10:00:00.000Z"), child("c2", 100_000, "2026-11-06T10:00:00.000Z")];
  assert.equal(findReconcileCandidate({ amount: 100_000, nowIso: NOW, userId: U }, list)?.id, "c2");
});
t("verifikasi tidak menggandakan pemasukan", () => {
  const c = child("c1", 100_000, "2026-11-08T10:00:00.000Z");
  const patched = { ...c, ...verifiedPatch(c, 105_000, "sv", NOW) } as FinTx;
  const total = cycleTotals([patched], U, undefined, []).income;
  assert.equal(total, 105_000);
  assert.equal(patched.verificationStatus, "verified");
  // bila Supervisor memilih "bukan yang sama", ada dua pemasukan terpisah
  const sup = buildSupervisorIncome({ id: "s1", userId: U, supervisorId: "sv", amount: 105_000, title: "Kirim", category: "Uang Saku Bulanan", date: "2026-11-09", nowIso: NOW }) as FinTx;
  assert.equal(sup.verificationStatus, "verified"); assert.equal(sup.createdByRole, "supervisor");
  assert.equal(cycleTotals([c, sup], U, undefined, []).income, 205_000);
});
t("pemasukan ditolak tidak dihitung; menunggu dihitung optimistis", () => {
  const rej = { ...child("r", 50_000, "2026-11-08T10:00:00.000Z"), verificationStatus: "rejected" as const };
  assert.equal(cycleTotals([rej], U, undefined, []).income, 0);
  assert.equal(cycleTotals([child("p", 50_000, "2026-11-08T10:00:00.000Z")], U, undefined, []).income, 50_000);
});

console.log("Hibah bertujuan (Fase 4.2) & isolasi anggaran");
const baseGrant = () => buildGrantRequest({ id: "g1", userId: U, title: "Buku Praktikum", category: "Sekolah & Perlengkapan", items: [{ label: "Buku", amount: 80_000 }, { label: "Penggaris", amount: 20_000 }], note: "untuk praktikum", nowIso: NOW });
t("validasi & total otomatis dari rincian", () => {
  assert.equal(validateGrantInput({ title: "ab", category: "", items: [] }).ok, false);
  assert.equal(baseGrant().requestedAmount, 100_000);
});
t("setujui penuh → dompet hibah; sesuaikan butuh catatan; tolak butuh alasan", () => {
  const g = baseGrant();
  const full = approveGrant(g, { approvedAmount: 100_000, note: "", byId: "sv", nowIso: NOW });
  assert.ok(full.ok); assert.equal((full as { wallet?: SubWallet }).wallet?.type, "grant"); assert.equal((full as { wallet?: SubWallet }).wallet?.allocated, 100_000);
  assert.equal(approveGrant(g, { approvedAmount: 70_000, note: "", byId: "sv", nowIso: NOW }).ok, false);
  assert.ok(approveGrant(g, { approvedAmount: 70_000, note: "buku bekas saja", byId: "sv", nowIso: NOW }).ok);
  assert.equal(rejectGrant(g, { reason: " ", byId: "sv", nowIso: NOW }).ok, false);
  const rj = rejectGrant(g, { reason: "belum perlu", byId: "sv", nowIso: NOW });
  assert.ok(rj.ok);
  assert.equal(approveGrant((rj as { grant: typeof g }).grant, { approvedAmount: 1, note: "x", byId: "sv", nowIso: NOW }).ok, false); // sudah diputuskan
});
t("pengeluaran dari dompet hibah tidak masuk laju bulanan & skor detektif", () => {
  const g = approveGrant(baseGrant(), { approvedAmount: 100_000, note: "", byId: "sv", nowIso: NOW }) as { ok: true; grant: ReturnType<typeof baseGrant>; wallet: SubWallet };
  const own = tx({ id: "o", total_amount: 40_000, walletId: walletIdFor(U, "food") });
  const grantTx = tx({ id: "gt", total_amount: 90_000, walletId: g.wallet.id, linkedGrantId: "g1", need_or_want: "want" });
  const totals = cycleTotals([own, grantTx], U, { start: "2026-11-01", end: "2026-11-30" }, [g.wallet]);
  assert.equal(totals.ownSpent, 40_000); assert.equal(totals.grantSpent, 90_000);
  // tanpa linkedGrantId pun, walletId hibah tetap dikenali lewat daftar dompet
  assert.equal(cycleTotals([{ ...grantTx, linkedGrantId: undefined }], U, undefined, [g.wallet]).ownSpent, 0);
  const scored = scoreableTransactions([own, grantTx] as never);
  assert.deepEqual(scored.map((x) => x.id), ["o"]);
  assert.equal(walletBalance(g.wallet, [grantTx], { start: "2026-11-01", end: "2026-11-30" }), 10_000);
});
t("selesaikan hibah: wajib foto struk & pilihan sisa", () => {
  const g = (approveGrant(baseGrant(), { approvedAmount: 100_000, note: "", byId: "sv", nowIso: NOW }) as { grant: ReturnType<typeof baseGrant> }).grant;
  assert.equal(settleGrant(g, { spent: 90_000, nowIso: NOW }).ok, false);
  assert.equal(settleGrant(g, { spent: 90_000, receiptPhoto: "data:image/webp;base64,xx", nowIso: NOW }).ok, false); // sisa 10rb belum dipilih
  const s = settleGrant(g, { spent: 90_000, receiptPhoto: "data:image/webp;base64,xx", leftoverAction: "vault", nowIso: NOW });
  assert.ok(s.ok); assert.equal((s as { leftover: number }).leftover, 10_000);
  assert.equal(settleGrant({ ...g, status: "pending" }, { spent: 0, receiptPhoto: "x", nowIso: NOW }).ok, false);
});

console.log("Tutup buku bulanan (Fase 4.3)");
t("tabungan wajib diamankan dulu, lalu surplus dibagi", () => {
  const f = computeClosingFigures({ monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, ownSpent: 600_000, savedInCycle: 50_000 });
  assert.equal(f.topUp, 150_000); assert.equal(f.mandatorySecured, 200_000); assert.equal(f.mandatoryComplete, true);
  assert.equal(f.surplus, 1_000_000 - 600_000 - 50_000 - 150_000);
});
t("uang tidak cukup untuk tabungan wajib → sebagian & tanpa surplus", () => {
  const f = computeClosingFigures({ monthlyCash: 500_000, mandatorySavingsTarget: 200_000, ownSpent: 450_000, savedInCycle: 0 });
  assert.equal(f.topUp, 50_000); assert.equal(f.mandatoryComplete, false); assert.equal(f.surplus, 0);
  const over = computeClosingFigures({ monthlyCash: 100_000, mandatorySavingsTarget: 20_000, ownSpent: 150_000, savedInCycle: 0 });
  assert.equal(over.topUp, 0); assert.equal(over.surplus, 0);
});
t("kebijakan sisa: auto_vault / auto_carryover / split_choice", () => {
  assert.deepEqual(splitSurplus("auto_vault", 300_000), { savedToVaultAmount: 300_000, rolledOverAmount: 0 });
  assert.deepEqual(splitSurplus("auto_carryover", 300_000), { savedToVaultAmount: 0, rolledOverAmount: 300_000 });
  assert.deepEqual(splitSurplus("split_choice", 300_000, 100_000), { savedToVaultAmount: 100_000, rolledOverAmount: 200_000 });
  assert.deepEqual(splitSurplus("split_choice", 300_000, 900_000), { savedToVaultAmount: 300_000, rolledOverAmount: 0 });
  assert.deepEqual(splitSurplus("split_choice", 300_000, -5), { savedToVaultAmount: 0, rolledOverAmount: 300_000 });
});
t("saldo bawaan masuk siklus berikutnya & muncul sebagai uang bulanan", () => {
  const f = computeClosingFigures({ monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, ownSpent: 500_000, savedInCycle: 200_000 });
  const c: MonthlyClosing = buildClosing({ userId: U, cycleKey: "2026-10", policy: "split_choice", monthlyCash: 1_000_000, mandatorySavingsTarget: 200_000, figures: f, ownSpent: 500_000, split: splitSurplus("split_choice", f.surplus, 100_000), byId: U, nowIso: NOW });
  assert.equal(c.id, `mc-${U}-2026-10`); assert.equal(c.rolledOverAmount, 200_000);
  assert.equal(carriedOverBalance([c], U, "2026-11"), 200_000);
  assert.equal(carriedOverBalance([c], U, "2026-12"), 0);
  assert.equal(monthlyCashOf({ monthlyBudget: 1_000_000, incomeInCycle: 0, carriedOver: 200_000 }), 1_200_000);
  assert.equal(closingBonusPoints(100_000, true), 50 + 20);
  assert.equal(closingBonusPoints(10_000_000, false), 150);
});

console.log("Fitur edukasi (Fase 4.5)");
t("uang aman hari ini = sisa dompet makan / sisa hari", () => {
  assert.equal(safeToSpendToday({ foodWalletBalance: 220_000, daysLeft: 22 }), 10_000);
  assert.equal(safeToSpendToday({ foodWalletBalance: -5_000, daysLeft: 3 }), 0);
  assert.equal(safeToSpendToday({ foodWalletBalance: null, daysLeft: 3 }), null);
});
t("masa tunggu 48 jam: ambang Rp50.000 & bonus hanya setelah masa tunggu", () => {
  assert.equal(needsCoolingOff({ type: "expense", need_or_want: "want", amount: 49_999 }), false);
  assert.equal(needsCoolingOff({ type: "expense", need_or_want: "want", amount: 50_000 }), true);
  assert.equal(needsCoolingOff({ type: "expense", need_or_want: "need", amount: 500_000 }), false);
  const w = { id: "w", userId: U, title: "Sepatu", amount: 300_000, category: "Belanja/Hiburan", need_or_want: "want" as const, createdAt: NOW, coolUntil: "2026-11-11T05:00:00.000Z", status: "cooling" as const, updatedAt: NOW };
  assert.equal(cancelOutcome(w, "2026-11-10T05:00:00.000Z").bonusPoints, 0);
  assert.equal(cancelOutcome(w, "2026-11-11T05:00:01.000Z").bonusPoints > 0, true);
  assert.equal(cancelOutcome({ ...w, bonusAwarded: true }, "2026-11-12T05:00:00.000Z").bonusPoints, 0);
});
t("utang patungan: terbuka sampai diganti", () => {
  const list = [tx({ id: "a", isReimbursable: true }), tx({ id: "b", isReimbursable: true, reimbursedAt: NOW }), tx({ id: "c" })];
  assert.deepEqual(openFriendDebts(list, U).map((x) => x.id), ["a"]);
});
t("Dompet Darurat dipakai dulu; kekurangan dari Brankas = pinjaman internal", () => {
  assert.deepEqual(planVaultDip({ emergencyBalance: 100_000, vaultBalance: 500_000, amount: 80_000 }), { ok: true, fromEmergency: 80_000, fromVault: 0, needsLoan: false });
  assert.deepEqual(planVaultDip({ emergencyBalance: 0, vaultBalance: 500_000, amount: 80_000 }), { ok: true, fromEmergency: 0, fromVault: 80_000, needsLoan: true });
  assert.equal(planVaultDip({ emergencyBalance: 0, vaultBalance: 10_000, amount: 80_000 }).ok, false);
});
t("penyesuaian kas tidak menyentuh skor/streak & menyesuaikan saldo", () => {
  const base = [tx({ id: "i", type: "income", need_or_want: "income", total_amount: 100_000 }), tx({ id: "e", total_amount: 30_000 })];
  assert.equal(recordedCash(base, U, []), 70_000);
  const adj = buildAdjustmentTx({ id: "adj", userId: U, difference: -15_000, date: "2026-11-09", nowIso: NOW }) as FinTx;
  assert.equal(adj.type, "adjustment"); assert.equal(adj.adjustmentDirection, "loss");
  assert.equal(recordedCash([...base, adj], U, []), 55_000);
  assert.equal((adj as unknown as { points_earned: number }).points_earned, 0);
  assert.deepEqual(scoreableTransactions([...base, adj] as never).map((x) => x.id), ["i", "e"]);
  const gain = buildAdjustmentTx({ id: "adj2", userId: U, difference: 5_000, date: "2026-11-09", nowIso: NOW }) as FinTx;
  assert.equal(recordedCash([...base, adj, gain], U, []), 60_000);
  const leak = weeklyLeakStats([...base, adj], U, "2026-11-09");
  assert.equal(leak.lossTotal, 15_000); assert.equal(leak.leakPercent, Math.round((15_000 / 45_000) * 1000) / 10);
});


console.log("Buka Dompet (V5.6.1)");
const OPEN_BASE = { userId: U, today: "2026-11-09", startDay: 1, existing: [] as SubWallet[] };
t("rekomendasi tanpa riwayat: bobot standar, total tidak melebihi uang bebas & kelipatan Rp1.000", () => {
  const r = recommendWalletPlan({ ...OPEN_BASE, free: 1_000_000, txs: [] });
  assert.equal(r.basis, "default"); assert.equal(r.items.length, 5);
  const sum = r.items.reduce((s, i) => s + i.allocated, 0);
  assert.ok(sum <= 1_000_000 && sum >= 1_000_000 - 1_000, "sum " + sum);
  assert.ok(r.items.every((i) => i.allocated % 1000 === 0));
});
t("rekomendasi dengan riwayat: dompet yang paling banyak dipakai mendapat porsi lebih besar", () => {
  const hist: FinTx[] = Array.from({ length: 10 }, (_, i) => tx({ id: "h" + i, category: "Transportasi", total_amount: 20_000, transaction_date: "2026-10-1" + (i % 9) }));
  const r = recommendWalletPlan({ ...OPEN_BASE, free: 1_000_000, txs: hist });
  assert.equal(r.basis, "history");
  const by = Object.fromEntries(r.items.map((i) => [i.key, i.allocated]));
  assert.ok(by.transport > by.fun, "transport harus > fun");
});
t("rekomendasi hanya mengusulkan dompet yang belum ada", () => {
  const have = makeDefaultWallets(U, "2026-11", 0, NOW).filter((w) => w.key === "food" || w.key === "transport");
  const r = recommendWalletPlan({ ...OPEN_BASE, free: 500_000, txs: [], existing: have });
  assert.ok(!r.items.some((i) => i.key === "food" || i.key === "transport"));
});
const item = (o: Partial<PlanItem> & { key: string; name: string }): PlanItem => ({ type: "operational", categories: [], allocated: 0, ...o });
t("validasi: total tidak boleh melebihi uang belum dibagi", () => {
  const v = validateWalletPlan([item({ key: "food", name: "Makan", allocated: 600_000 })], { free: 500_000, existing: [], userId: U });
  assert.equal(v.ok, false);
});
t("validasi: nama ganda & kategori ganda ditolak; kategori tak dikenal ditolak", () => {
  const e = makeDefaultWallets(U, "2026-11", 0, NOW).map((w) => ({ ...w, allocated: 1000 }));
  assert.equal(validateWalletPlan([item({ key: "c-x", name: "dompet transportasi", custom: true })], { free: 1e6, existing: e, userId: U }).ok, false);
  assert.equal(validateWalletPlan([item({ key: "c-x", name: "Hobi", custom: true, categories: ["Transportasi"] })], { free: 1e6, existing: e, userId: U }).ok, false);
  assert.equal(validateWalletPlan([item({ key: "c-x", name: "Hobi", custom: true, categories: ["Ngarang"] })], { free: 1e6, existing: [], userId: U }).ok, false);
  assert.equal(validateWalletPlan([item({ key: "c-x", name: "Hobi", custom: true, categories: [] , type: "emergency" })], { free: 1e6, existing: [], userId: U }).ok, false);
  assert.equal(validateWalletPlan([item({ key: "c-x", name: "Hobi", custom: true, categories: [] })], { free: 1e6, existing: [], userId: U }).ok, true);
});
t("validasi: dompet buatan sendiri dibatasi", () => {
  const many = Array.from({ length: MAX_CUSTOM_WALLETS + 1 }, (_, i) => item({ key: "c-" + i, name: "D" + i, custom: true }));
  assert.equal(validateWalletPlan(many, { free: 1e6, existing: [], userId: U }).ok, false);
});
t("buildOpenedWallets: menandai openedVia, membuat Brankas bila belum ada, id deterministik", () => {
  let n = 0;
  const out = buildOpenedWallets({
    userId: U, items: [item({ key: "food", name: "Dompet Makan & Harian", allocated: 300_000, categories: ["Makan Pokok"] }), item({ key: "c-tmp", name: "Hobi", custom: true, allocated: 50_000 }), item({ key: "bills", name: "Tagihan", type: "commitment", allocated: 10_000, categories: ["Tagihan"] })],
    via: "manual", cycleKey: "2026-11", mandatory: 100_000, existing: [], byId: U, nowIso: NOW, uid: () => "id" + ++n,
  });
  assert.equal(out.length, 4);
  assert.ok(out.every((w) => w.openedVia === "manual" && w.openedBy === U));
  assert.equal(out[0].id, walletIdFor(U, "food")); assert.equal(out[1].key, "c-id1");
  assert.equal(out[2].isLocked, true);
  assert.equal(out[3].type, "savings"); assert.equal(out[3].allocated, 100_000);
  const again = buildOpenedWallets({ userId: U, items: [], via: "manual", cycleKey: "2026-11", mandatory: 100_000, existing: out, byId: U, nowIso: NOW, uid: () => "z" });
  assert.equal(again.length, 0);
});
t("arsip: hanya bila belum dipakai; Brankas & hibah tidak bisa; dompet lama = legacy", () => {
  assert.equal(canArchiveWallet({ type: "operational" }, 0).ok, true);
  assert.equal(canArchiveWallet({ type: "operational" }, 1).ok, false);
  assert.equal(canArchiveWallet({ type: "savings" }, 0).ok, false);
  assert.equal(canArchiveWallet({ type: "grant" }, 0).ok, false);
  assert.equal(canArchiveWallet({ type: "operational", archived: true }, 0).ok, false);
  assert.equal(openedViaOf({}), "legacy"); assert.equal(openedViaOf({ openedVia: "recommendation" }), "recommendation");
});

console.log(`\n${pass} lulus, ${fail} gagal`);
if (fail) process.exit(1);

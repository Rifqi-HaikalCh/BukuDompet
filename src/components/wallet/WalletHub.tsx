"use client";

/**
 * Dompet & Celengan (V5.6.1) — halaman di Jalur Kas. Menggabungkan dompet, celengan/brankas, dan pengajuan
 * kebutuhan darurat dengan urutan sesuai alur pakai: lihat uang aman → atur dompet → menabung → minta bantuan.
 * Semua angka dari `useFinanceContext` (sama dengan Laci Catat dan panel Supervisor).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CozyCard, ChunkyProgressBar, RollingNumber, TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { GrantRequestSheet, GrantSettleSheet } from "@/components/user/GrantRequestSheet";
import { MonthlyClosingModal } from "@/components/user/MonthlyClosingModal";
import { SavingsVaultPanel } from "@/components/user/SavingsVaultModal";
import { WalletIllustration } from "@/components/wallet/WalletIllustration";
import { WalletOpenWizard } from "@/components/wallet/WalletOpenWizard";
import { AllocateSheet, SectionTitle, TransferSheet } from "@/components/wallet/WalletSheets";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useEnsureWallets, useFinanceContext } from "@/lib/use-finance";
import { openFriendDebts, hoursLeft, isCoolingDone } from "@/lib/finance/habits";
import { pendingClosureKey } from "@/lib/finance/closing";
import { isDateInCycle } from "@/lib/finance/cycle";
import { isWalletLocked, WALLET_PRESETS } from "@/lib/finance/wallets";
import { canArchiveWallet, openedViaOf, MAX_CUSTOM_WALLETS } from "@/lib/finance/opening";
import { localDateStr } from "@/lib/dates";
import { fireCozyConfetti, soundEffects } from "@/lib/sound-effects";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { WalletView } from "@/lib/finance/context";
import type { FinTx, GrantRequest } from "@/lib/finance/types";

export type HubTab = "dompet" | "celengan" | "darurat";

const GRANT_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Menunggu Supervisor", tone: "bg-[#FFF3C4] text-[#8A6A00]" },
  disbursed: { label: "Sudah cair", tone: "bg-[#EFFBE6] text-[#46A302]" },
  rejected: { label: "Ditolak", tone: "bg-[#FFF0F0] text-[#C83E2B]" },
  settled: { label: "Selesai", tone: "bg-[#EEF8FF] text-[#1E88E5]" },
};

const VIA_LABEL = { recommendation: "Rekomendasi sistem", manual: "Atur sendiri", legacy: "Dibuat otomatis" } as const;

/** Tiga langkah pengajuan: diajukan → disetujui/cair → selesai. */
function GrantStepper({ status }: { status: string }) {
  const idx = status === "pending" ? 0 : status === "disbursed" ? 1 : status === "settled" ? 2 : 0;
  const rejected = status === "rejected";
  const steps = ["Diajukan", "Cair", "Selesai"];
  return (
    <ol className="flex items-center gap-1.5" aria-label="Tahap pengajuan">
      {steps.map((s, i) => {
        const done = !rejected && i <= idx;
        return (
          <li key={s} className="flex items-center gap-1.5 min-w-0">
            <motion.span
              initial={false}
              animate={{ scale: done && i === idx ? [1, 1.25, 1] : 1 }}
              transition={{ duration: 0.6 }}
              className={cn("w-5 h-5 rounded-full border-2 grid place-items-center text-[10px] font-extrabold", done ? "bg-[#58CC02] border-[#46A302] text-white" : rejected && i === 0 ? "bg-[#FF8B7B] border-[#FF4B4B] text-white" : "bg-white border-[#E6DFD2] text-[#7A6E65]")}
            >
              {rejected && i === 0 ? "✕" : done ? "✓" : i + 1}
            </motion.span>
            <span className="text-[11px] font-bold text-[#7A6E65] truncate">{s}</span>
            {i < steps.length - 1 && <span className={cn("w-4 h-0.5 rounded", done && i < idx ? "bg-[#58CC02]" : "bg-[#E6DFD2]")} />}
          </li>
        );
      })}
    </ol>
  );
}

export function WalletHub({ userId, initialTab = "dompet" }: { userId: string; initialTab?: HubTab }) {
  useEnsureWallets(userId, true);
  const ctx = useFinanceContext(userId);
  const profile = useBukuDompetStore((s) => s.profiles.find((p) => p.id === userId));
  const txs = useBukuDompetStore((s) => s.transactions) as unknown as FinTx[];
  const autoSplit = useFinanceStore((s) => s.autoSplit);
  const archiveWallet = useFinanceStore((s) => s.archiveWallet);
  const wishlistAll = useFinanceStore((s) => s.wishlistItems);
  const grantsAll = useFinanceStore((s) => s.grantRequests);
  const loansAll = useFinanceStore((s) => s.vaultLoans);
  const closings = useFinanceStore((s) => s.monthlyClosings);
  const resolveWishlist = useFinanceStore((s) => s.resolveWishlist);
  const markReimbursed = useFinanceStore((s) => s.markReimbursed);
  const repayLoan = useFinanceStore((s) => s.repayVaultLoan);

  const [tab, setTab] = useState<HubTab>(initialTab);
  const [alloc, setAlloc] = useState<WalletView | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [settle, setSettle] = useState<GrantRequest | null>(null);
  const [closeKey, setCloseKey] = useState<string | null>(null);
  const [archiveAsk, setArchiveAsk] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => new Date().toISOString());
  const [pulse, setPulse] = useState<Record<string, number>>({});
  const prevAlloc = useRef<Record<string, number>>({});

  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date().toISOString()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // koin melompat setiap kali alokasi dompet bertambah
  useEffect(() => {
    if (!ctx) return;
    const next: Record<string, number> = {};
    const bump: string[] = [];
    for (const w of ctx.wallets) {
      next[w.id] = w.allocated;
      const before = prevAlloc.current[w.id];
      if (before !== undefined && w.allocated > before) bump.push(w.id);
    }
    prevAlloc.current = next;
    if (bump.length) {
      soundEffects.coinChime();
      setPulse((p) => {
        const c = { ...p };
        for (const id of bump) c[id] = (c[id] ?? 0) + 1;
        return c;
      });
    }
  }, [ctx]);

  const today = localDateStr();
  const startDay = ctx?.budget.cycleStartDay ?? 1;
  const pendingKey = useMemo(
    () =>
      pendingClosureKey({
        today,
        startDay,
        closings,
        userId,
        hasActivityIn: (key) => txs.some((t) => t.user_id === userId && isDateInCycle(t.transaction_date, key, startDay)),
      }),
    [today, startDay, closings, userId, txs],
  );
  const debts = useMemo(() => openFriendDebts(txs, userId), [txs, userId]);
  const wishlist = wishlistAll.filter((w) => w.userId === userId && w.status === "cooling");
  const grants = grantsAll.filter((g) => g.userId === userId && g.status !== "settled");
  const loans = loansAll.filter((l) => l.userId === userId && l.status === "open");

  if (!ctx || !profile) return null;
  const spentOnGrant = (g: GrantRequest) => ctx.grantWallets.find((w) => w.linkedGrantId === g.id)?.spent ?? 0;

  const hasWallets = ctx.wallets.some((w) => w.type !== "savings") || ctx.wallets.length > 0;
  const elapsed = Math.min(1, Math.max(0, (ctx.cycle.totalDays - ctx.cycle.daysLeft + 1) / Math.max(1, ctx.cycle.totalDays)));
  const customCount = ctx.wallets.filter((w) => w.key.startsWith("c-")).length;
  const canAdd = WALLET_PRESETS.some((p) => !ctx.wallets.some((w) => w.key === p.key)) || customCount < MAX_CUSTOM_WALLETS;
  const livePending = grants.filter((g) => g.status === "pending").length;

  const tabs: { id: HubTab; label: string; icon: GlyphName; badge: number }[] = [
    { id: "dompet", label: "Dompet", icon: "coin", badge: ctx.wallets.filter((w) => w.type !== "savings").length },
    { id: "celengan", label: "Celengan", icon: "piggy", badge: loans.length },
    { id: "darurat", label: "Kebutuhan Darurat", icon: "gift", badge: grants.length },
  ];

  return (
    <section aria-label="Dompet dan celengan" className="space-y-4">
      <MotionConfig reducedMotion="user">
        {pendingKey && (
          <CozyCard tone="honey" className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-extrabold text-[#3D352E]">Saatnya tutup buku</p>
              <p className="text-xs font-bold text-[#7A6E65]">Siklus {pendingKey} belum ditutup. Bagi sisa uangmu dulu.</p>
            </div>
            <TactileButton type="button" variant="honey" size="sm" onClick={() => setCloseKey(pendingKey)}>
              Tutup Buku
            </TactileButton>
          </CozyCard>
        )}

        {/* uang aman hari ini */}
        <CozyCard tone="matcha" className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-display font-extrabold text-[#46A302]">Uang aman hari ini</p>
              {ctx.safeToSpend === null ? (
                <p className="font-display text-xl font-extrabold text-[#3D352E]">—</p>
              ) : (
                <RollingNumber value={ctx.safeToSpend} prefix="Rp" isCurrency className="text-2xl text-[#3D352E]" />
              )}
              <p className="text-[11px] font-bold text-[#7A6E65]">
                {ctx.safeToSpend === null ? "Buka dompet untuk melihat uang aman hari ini." : `Dari saldo Makan dibagi ${ctx.cycle.daysLeft} hari tersisa.`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-[#7A6E65]">Siklus {ctx.cycle.key}</p>
              <p className="text-[11px] font-bold text-[#7A6E65]">{ctx.cycle.daysLeft} hari lagi</p>
            </div>
          </div>
          <ChunkyProgressBar value={Math.min(ctx.totals.ownSpent, ctx.budget.monthlyBudget)} max={Math.max(1, ctx.budget.monthlyBudget)} variant={ctx.burnRatio > 0.9 ? "peach" : "matcha"} label="Terpakai bulan ini" showFraction />
          <p className="text-xs font-bold text-[#3D352E]">
            Belum dialokasikan: <span className="font-display font-extrabold tabular-nums">{formatRupiah(ctx.unallocated)}</span>
          </p>
        </CozyCard>

        {/* tab dalam */}
        <div role="tablist" aria-label="Bagian dompet" className="grid grid-cols-3 gap-2">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  soundEffects.tactileClick();
                  setTab(t.id);
                }}
                className={cn(
                  "relative px-2 py-2.5 rounded-2xl border-2 font-display text-[11px] sm:text-xs font-extrabold cursor-pointer flex flex-col items-center gap-1",
                  on ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302] text-[#3D352E]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]",
                )}
              >
                <GlyphInline name={t.icon} className="w-5 h-5" />
                <span className="leading-tight text-center">{t.label}</span>
                {t.badge > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#FF8B7B] border-2 border-white text-white text-[10px] grid place-items-center">{t.badge}</span>}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === "dompet" && (
            <motion.div key="dompet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {!hasWallets ? (
                <CozyCard tone="white" className="text-center space-y-3">
                  <div className="w-40 mx-auto">
                    <WalletIllustration ratio={0.4} open className="w-full" label="Dompet menunggumu" />
                  </div>
                  <p className="font-display text-base font-extrabold text-[#3D352E]">Yuk, buka dompet pertamamu!</p>
                  <p className="text-xs font-bold text-[#7A6E65]">Bagi uang bulananmu ke beberapa dompet: ikuti rekomendasi sistem atau atur sendiri. Supervisor bisa ikut melihat.</p>
                  <TactileButton type="button" variant="matcha" size="lg" fullWidth onClick={() => setWizardOpen(true)}>
                    <GlyphInline name="plus" /> Buka Dompet
                  </TactileButton>
                </CozyCard>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SectionTitle icon="coin">Dompetku</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      <TactileButton type="button" variant="white" size="sm" disabled={ctx.unallocated <= 0} onClick={() => notify.result(autoSplit(userId), "Uang dibagi", "Belum bisa dibagi")}>
                        <GlyphInline name="wand" /> Bagi Otomatis
                      </TactileButton>
                      <TactileButton type="button" variant="white" size="sm" onClick={() => setTransferOpen(true)}>
                        <GlyphInline name="swap" /> Geser Saldo
                      </TactileButton>
                      {canAdd && (
                        <TactileButton type="button" variant="matcha" size="sm" onClick={() => setWizardOpen(true)}>
                          <GlyphInline name="plus" /> Tambah Dompet
                        </TactileButton>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ctx.wallets.map((w, idx) => {
                      const locked = w.type === "commitment" && isWalletLocked(w, today);
                      const ratio = w.allocated > 0 ? Math.max(0, w.balance) / w.allocated : 0;
                      const frugal = w.type !== "savings" && w.allocated > 0 && w.spent > 0 && w.spent / w.allocated <= elapsed - 0.1;
                      const arch = canArchiveWallet(w, w.spent);
                      return (
                        <motion.div key={w.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 6) * 0.06 }}>
                          <CozyCard tone={w.type === "savings" ? "sky" : "white"} className="space-y-2 h-full">
                            <div className="flex items-start gap-3">
                              <div className="w-20 shrink-0">
                                <WalletIllustration type={w.type} ratio={w.type === "savings" ? 1 : ratio} allocated={w.type === "savings" ? 1 : w.allocated} locked={locked} pulseKey={pulse[w.id] ?? 0} className="w-full" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-display text-sm font-extrabold text-[#3D352E] truncate">{w.name}</span>
                                  {frugal && (
                                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFF3C4] text-[#8A6A00] text-[10px] font-extrabold">
                                      <GlyphInline name="star" className="w-3 h-3" /> Hemat
                                    </motion.span>
                                  )}
                                  {locked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7A6E65]">
                                      <GlyphInline name="lock" className="w-3 h-3" /> Terkunci
                                    </span>
                                  )}
                                </div>
                                <RollingNumber value={w.balance} prefix="Rp" isCurrency className="text-lg text-[#3D352E]" />
                                {w.type !== "savings" && (
                                  <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums">
                                    dari {formatRupiah(w.allocated)} • terpakai {formatRupiah(w.spent)}
                                  </p>
                                )}
                                <p className="text-[10px] font-bold text-[#A39A90]">{VIA_LABEL[openedViaOf(w)]}</p>
                              </div>
                            </div>
                            {w.type !== "savings" ? (
                              <>
                                <ChunkyProgressBar value={Math.min(w.spent, w.allocated)} max={Math.max(1, w.allocated)} variant={w.balance <= 0 ? "peach" : "sky"} />
                                <div className="flex items-center justify-end gap-2">
                                  {archiveAsk === w.id ? (
                                    <>
                                      <span className="text-[11px] font-bold text-[#7A6E65]">Arsipkan dompet ini?</span>
                                      <TactileButton type="button" variant="white" size="sm" onClick={() => setArchiveAsk(null)}>
                                        Batal
                                      </TactileButton>
                                      <TactileButton
                                        type="button"
                                        variant="peach"
                                        size="sm"
                                        onClick={() => {
                                          notify.result(archiveWallet(userId, w.id), "Dompet diarsipkan", "Belum bisa diarsipkan");
                                          setArchiveAsk(null);
                                        }}
                                      >
                                        Ya, Arsipkan
                                      </TactileButton>
                                    </>
                                  ) : (
                                    <>
                                      {arch.ok && w.key !== "food" && (
                                        <button type="button" onClick={() => setArchiveAsk(w.id)} className="text-[11px] font-bold text-[#7A6E65] underline cursor-pointer">
                                          Arsipkan
                                        </button>
                                      )}
                                      <TactileButton type="button" variant="white" size="sm" onClick={() => setAlloc(w)}>
                                        Atur
                                      </TactileButton>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className="text-[11px] font-bold text-[#7A6E65]">Brankas diisi dari tabungan wajib dan sisa uang.</p>
                            )}
                          </CozyCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}

              {debts.length > 0 && (
                <CozyCard tone="peach" className="space-y-2">
                  <SectionTitle icon="users">Utang Patungan Teman</SectionTitle>
                  <p className="text-xs font-bold text-[#7A6E65]">Belum diganti: {formatRupiah(ctx.friendDebt)} (tidak dihitung sebagai boros).</p>
                  <ul className="space-y-2">
                    {debts.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white border-2 border-[#FFCDC6] p-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-display text-xs font-extrabold text-[#3D352E]">{d.title}</p>
                          <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums">{formatRupiah(Number(d.total_amount))}</p>
                        </div>
                        <TactileButton type="button" variant="matcha" size="sm" onClick={() => notify.result(markReimbursed(d.id), "Uang kembali", "Belum bisa")}>
                          Sudah Diganti
                        </TactileButton>
                      </li>
                    ))}
                  </ul>
                </CozyCard>
              )}

              {wishlist.length > 0 && (
                <CozyCard tone="taro" className="space-y-2">
                  <SectionTitle icon="clock">Daftar Tunggu 48 Jam</SectionTitle>
                  <ul className="space-y-2">
                    {wishlist.map((w) => {
                      const done = isCoolingDone(w, now);
                      const left = Math.ceil(hoursLeft(w, now));
                      return (
                        <li key={w.id} className="rounded-2xl bg-white border-2 border-[#E2C6FF] p-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-display text-xs font-extrabold text-[#3D352E]">{w.title}</p>
                            <span className="font-display text-xs font-extrabold tabular-nums text-[#3D352E]">{formatRupiah(w.amount)}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#7A6E65]">{done ? "Masa tunggu selesai. Masih mau beli?" : `Pikirkan lagi ${left} jam. Batal setelah itu dapat bonus.`}</p>
                          <div className="flex gap-2">
                            <TactileButton type="button" variant="matcha" size="sm" disabled={!done} onClick={() => notify.result(resolveWishlist(w.id, "bought"), "Boleh dibeli", "Belum bisa")}>
                              Tetap Beli
                            </TactileButton>
                            <TactileButton
                              type="button"
                              variant="white"
                              size="sm"
                              onClick={() => {
                                const res = resolveWishlist(w.id, "cancelled");
                                if (res.success) fireCozyConfetti("normal");
                                notify.result(res, "Dibatalkan", "Belum bisa");
                              }}
                            >
                              Batal Beli
                            </TactileButton>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CozyCard>
              )}
            </motion.div>
          )}

          {tab === "celengan" && (
            <motion.div key="celengan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {ctx.vault && (
                <CozyCard tone="sky" className="flex items-center gap-3">
                  <div className="w-20 shrink-0">
                    <WalletIllustration type="savings" ratio={1} className="w-full" label="Brankas Tabungan" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-extrabold text-[#3D352E]">Brankas Tabungan</p>
                    <RollingNumber value={ctx.vault.allocated} prefix="Rp" isCurrency className="text-xl text-[#3D352E]" />
                    <p className="text-[11px] font-bold text-[#7A6E65]">Tabungan wajib bulan ini, tidak terhitung sebagai pengeluaran.</p>
                  </div>
                </CozyCard>
              )}
              <SavingsVaultPanel profile={profile} active={tab === "celengan"} />
              {loans.length > 0 && (
                <CozyCard tone="sky" className="space-y-2">
                  <SectionTitle icon="shield_check">Pinjaman dari Celengan</SectionTitle>
                  <ul className="space-y-2">
                    {loans.map((l) => {
                      const left = Math.max(0, l.recoveryTarget - l.recovered);
                      return (
                        <li key={l.id} className="rounded-2xl bg-white border-2 border-[#BCE3FF] p-2.5 space-y-2">
                          <p className="font-display text-xs font-extrabold text-[#3D352E]">{l.reason}</p>
                          {l.needsApproval && !l.approvedBy ? (
                            <p className="text-[11px] font-bold text-[#7A6E65]">Menunggu persetujuan Supervisor.</p>
                          ) : (
                            <>
                              <ChunkyProgressBar value={l.recovered} max={Math.max(1, l.recoveryTarget)} variant="sky" />
                              <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums">
                                Dikembalikan {formatRupiah(l.recovered)} dari {formatRupiah(l.recoveryTarget)}
                              </p>
                              <div className="flex items-end gap-2">
                                <MoneyInput className="flex-1" value={repayAmount[l.id] ?? ""} onChange={(v) => setRepayAmount((p) => ({ ...p, [l.id]: v }))} placeholder={String(left)} />
                                <TactileButton
                                  type="button"
                                  variant="matcha"
                                  size="sm"
                                  onClick={() => {
                                    const res = repayLoan(l.id, toInt(repayAmount[l.id] ?? "") || left);
                                    notify.result(res, "Pinjaman dicicil", "Belum bisa");
                                    if (res.success) setRepayAmount((p) => ({ ...p, [l.id]: "" }));
                                  }}
                                >
                                  Kembalikan
                                </TactileButton>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CozyCard>
              )}
            </motion.div>
          )}

          {tab === "darurat" && (
            <motion.div key="darurat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <CozyCard tone="honey" className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-extrabold text-[#3D352E]">Ajukan kebutuhan darurat diluar uang bulanan</p>
                  <GlyphInline name="gift" className="w-6 h-6 shrink-0" />
                </div>
                <p className="text-xs font-bold text-[#7A6E65]">Untuk keperluan mendadak yang tidak ada di anggaran bulanan (obat, tugas kampus, perbaikan). Uangnya tidak memotong jatah dompetmu.</p>
                <TactileButton type="button" variant="honey" size="md" fullWidth onClick={() => setGrantOpen(true)}>
                  <GlyphInline name="plus" /> Ajukan Sekarang
                </TactileButton>
                {livePending > 0 && <p className="text-[11px] font-extrabold text-[#8A6A00]">{livePending} pengajuan menunggu keputusan Supervisor.</p>}
              </CozyCard>
              {grants.length === 0 ? (
                <p className="text-xs font-bold text-[#7A6E65] text-center">Belum ada pengajuan.</p>
              ) : (
                <ul className="space-y-2">
                  {grants.map((g) => {
                    const st = GRANT_STATUS[g.status] ?? GRANT_STATUS.pending;
                    const wallet = ctx.grantWallets.find((w) => w.linkedGrantId === g.id);
                    return (
                      <li key={g.id}>
                        <CozyCard tone="white" className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-display text-sm font-extrabold text-[#3D352E]">{g.title}</p>
                            <span className={cn("shrink-0 px-2 py-0.5 rounded-full text-[11px] font-extrabold", st.tone)}>{st.label}</span>
                          </div>
                          <GrantStepper status={g.status} />
                          <p className="text-xs font-bold text-[#7A6E65] tabular-nums">
                            Diminta {formatRupiah(g.requestedAmount)}
                            {g.approvedAmount !== undefined ? ` • disetujui ${formatRupiah(g.approvedAmount)}` : ""}
                          </p>
                          {g.status === "rejected" && g.rejectReason && <p className="text-xs font-bold text-[#C83E2B]">{g.rejectReason}</p>}
                          {g.supervisorNote && <p className="text-xs font-bold text-[#7A6E65]">Catatan: {g.supervisorNote}</p>}
                          {g.status === "disbursed" && wallet && (
                            <>
                              <ChunkyProgressBar value={Math.min(wallet.spent, wallet.allocated)} max={Math.max(1, wallet.allocated)} variant="taro" />
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-[#7A6E65]">Sisa {formatRupiah(wallet.balance)}</span>
                                <TactileButton type="button" variant="matcha" size="sm" onClick={() => setSettle(g)}>
                                  Selesaikan
                                </TactileButton>
                              </div>
                            </>
                          )}
                        </CozyCard>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>

      <AllocateSheet userId={userId} wallet={alloc} unallocated={ctx.unallocated} onClose={() => setAlloc(null)} />
      <TransferSheet userId={userId} open={transferOpen} wallets={ctx.wallets} onOpenChange={setTransferOpen} />
      <WalletOpenWizard userId={userId} open={wizardOpen} onOpenChange={setWizardOpen} ctx={ctx} />
      <GrantRequestSheet open={grantOpen} onOpenChange={setGrantOpen} userId={userId} />
      <GrantSettleSheet grant={settle} spent={settle ? spentOnGrant(settle) : 0} onOpenChange={(o) => !o && setSettle(null)} />
      <MonthlyClosingModal open={Boolean(closeKey)} onOpenChange={(o) => !o && setCloseKey(null)} userId={userId} cycleKey={closeKey ?? undefined} />
    </section>
  );
}

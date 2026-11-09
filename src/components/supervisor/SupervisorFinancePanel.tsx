"use client";

/**
 * Panel keuangan Supervisor (V5.6.1) untuk satu anak, urut menurut kebutuhan orang tua:
 * 1) Perlu Tindakan  2) Atur Anggaran  3) Dompet anak (hanya-lihat)  4) Catat Uang Masuk  5) Riwayat tutup buku.
 */
import React, { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CozyCard, ChunkyProgressBar, RollingNumber, TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozySheet } from "@/components/ui/CozySheet";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { BudgetConfigSheet } from "@/components/supervisor/BudgetConfigSheet";
import { AllClearCheck, BudgetExplainer, CycleDays, HowItWorks, SpendMeter, WigglingBell } from "@/components/supervisor/SupervisorVisuals";
import { WalletIllustration, moodOf } from "@/components/wallet/WalletIllustration";
import { useSupervisorInbox } from "@/lib/use-supervisor-inbox";
import { openedViaOf } from "@/lib/finance/opening";
import { fireCozyConfetti, soundEffects } from "@/lib/sound-effects";
import type { WalletView } from "@/lib/finance/context";
import type { ProfileData } from "@/store/useBukuDompetStore";
import type { TransactionRecord } from "@/lib/spending-detective";
import { useFinanceStore, type IncomeDecisionNeeded } from "@/store/useFinanceStore";
import { useFinanceContext, useEnsureWallets } from "@/lib/use-finance";
import { ROLLOVER_POLICIES } from "@/lib/finance/budget";
import { notify } from "@/lib/notify";
import { shortDateLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { GrantRequest } from "@/lib/finance/types";

function isIncomeDecision(r: unknown): r is IncomeDecisionNeeded {
  return Boolean(r) && typeof r === "object" && (r as { needsDecision?: boolean }).needsDecision === true;
}

function GrantDecisionRow({ g }: { g: GrantRequest }) {
  const approve = useFinanceStore((s) => s.approveGrantRequest);
  const reject = useFinanceStore((s) => s.rejectGrantRequest);
  const [amount, setAmount] = useState(String(g.requestedAmount));
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl bg-white border-2 border-[#E6DFD2] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold text-[#3D352E] break-words">{g.title}</p>
          <p className="text-[11px] font-bold text-[#7A6E65]">{g.category} • diminta {formatRupiah(g.requestedAmount)}</p>
        </div>
        <TactileButton type="button" variant="white" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Tutup" : "Tinjau"}
        </TactileButton>
      </div>
      {open && (
        <div className="space-y-3">
          <ul className="space-y-1">
            {g.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-2 text-xs font-bold text-[#3D352E]">
                <span className="truncate">{it.label}</span>
                <span className="tabular-nums shrink-0">{formatRupiah(it.amount)}</span>
              </li>
            ))}
          </ul>
          {g.note && <p className="text-xs font-bold text-[#7A6E65]">Catatan anak: {g.note}</p>}
          {g.proofPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={g.proofPhoto} alt={`Foto pendukung ${g.title}`} className="w-full max-h-56 object-contain rounded-2xl border-2 border-[#E6DFD2] bg-[#F7F3EB]" />
          )}
          <MoneyInput label="Jumlah disetujui (boleh dikurangi)" value={amount} onChange={setAmount} />
          <label className="block">
            <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Catatan / alasan</span>
            <input value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} className={FIELD_CLASS} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <TactileButton type="button" variant="matcha" size="md" onClick={() => act(approve(g.id, toInt(amount), note), "Kebutuhan darurat disetujui")}>
              Setujui
            </TactileButton>
            <TactileButton type="button" variant="peach" size="md" onClick={() => notify.result(reject(g.id, note), "Kebutuhan darurat ditolak", "Belum bisa")}>
              Tolak
            </TactileButton>
          </div>
        </div>
      )}
    </li>
  );
}

/** Notifikasi + konfeti kecil hanya bila aksi Supervisor berhasil. */
function act(res: { success: boolean; message: string }, okTitle: string, failTitle = "Belum bisa") {
  notify.result(res, okTitle, failTitle);
  if (res.success) {
    soundEffects.coinChime();
    fireCozyConfetti("normal");
  }
}

const VIA: Record<string, { label: string; tone: string }> = {
  recommendation: { label: "Rekomendasi sistem", tone: "bg-[#EFFBE6] text-[#2E6F00]" },
  manual: { label: "Diatur sendiri", tone: "bg-[#EEF8FF] text-[#1E88E5]" },
  legacy: { label: "Dibuat otomatis", tone: "bg-[#F7F3EB] text-[#7A6E65]" },
};

const MOOD_TEXT = { happy: "Aman", worried: "Mulai menipis", empty: "Hampir habis", sleepy: "Belum diberi jatah" } as const;
const MOOD_TONE = { happy: "text-[#2E6F00]", worried: "text-[#8A6A00]", empty: "text-[#C83E2B]", sleepy: "text-[#7A6E65]" } as const;

function SectionCard({ id, icon, title, subtitle, aside, children, tint = "white" }: { id?: string; icon: GlyphName; title: string; subtitle?: string; aside?: React.ReactNode; children: React.ReactNode; tint?: "white" | "sky" | "taro" | "honey" }) {
  return (
    <CozyCard id={id} tone={tint} className="space-y-3 scroll-mt-24">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-[#3D352E]">
            <GlyphInline name={icon} className="w-5 h-5 shrink-0" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs font-bold text-[#7A6E65] mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </CozyCard>
  );
}

function ReadOnlyWallet({ w, all, idx }: { w: WalletView; all: WalletView[]; idx: number }) {
  const ratio = w.allocated > 0 ? Math.max(0, w.balance) / w.allocated : 0;
  const mood = w.type === "savings" ? "happy" : moodOf(ratio, w.allocated);
  const via = VIA[openedViaOf(w)];
  const lt = w.lastTransfer;
  const nameOf = (id: string) => all.find((x) => x.id === id)?.name ?? "dompet lain";
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 6) * 0.06 }} className="rounded-2xl bg-[#FFFDF9] border-2 border-[#EFE8DA] p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-16 shrink-0">
          <WalletIllustration type={w.type} ratio={w.type === "savings" ? 1 : ratio} allocated={w.type === "savings" ? 1 : w.allocated} locked={w.type === "commitment" && Boolean(w.isLocked)} className="w-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-display text-sm font-extrabold text-[#3D352E] truncate">{w.name}</p>
          <RollingNumber value={w.balance} prefix="Rp" isCurrency className="text-base text-[#3D352E]" />
          {w.type !== "savings" ? (
            <p className="text-[11px] font-bold text-[#7A6E65] tabular-nums">
              dari {formatRupiah(w.allocated)} • terpakai {formatRupiah(w.spent)}
            </p>
          ) : (
            <p className="text-[11px] font-bold text-[#7A6E65]">Tabungan wajib bulan ini</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {w.type !== "savings" && <span className={cn("text-[10px] font-extrabold", MOOD_TONE[mood])}>{MOOD_TEXT[mood]}</span>}
            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-extrabold", via.tone)}>{via.label}</span>
          </div>
        </div>
      </div>
      {w.type !== "savings" && <ChunkyProgressBar value={Math.min(w.spent, w.allocated)} max={Math.max(1, w.allocated)} variant={w.balance <= 0 ? "peach" : "sky"} />}
      {lt && (
        <p className="text-[11px] font-bold text-[#7A6E65] leading-snug rounded-xl bg-[#F6FBFF] border border-[#DCEBF5] px-2 py-1.5">
          Saldo digeser {formatRupiah(lt.amount)} {lt.toId === w.id ? `dari ${nameOf(lt.fromId)}` : `ke ${nameOf(lt.toId)}`} • “{lt.reason}”
        </p>
      )}
    </motion.li>
  );
}

export function SupervisorFinancePanel({ user }: { user: ProfileData }) {
  useEnsureWallets(user.id, false);
  const ctx = useFinanceContext(user.id);
  const walletsAll = useFinanceStore((s) => s.subWallets);
  const record = useFinanceStore((s) => s.recordSupervisorIncome);
  const resolve = useFinanceStore((s) => s.resolveSupervisorIncome);
  const verify = useFinanceStore((s) => s.verifyChildIncome);
  const rejectIncome = useFinanceStore((s) => s.rejectChildIncome);
  const closingsAll = useFinanceStore((s) => s.monthlyClosings);
  const decideLoan = useFinanceStore((s) => s.decideVaultLoan);
  const { queue, grants, loans, count } = useSupervisorInbox(user.id);

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<{ prompt: string; candidate: TransactionRecord; amount: number; title: string } | null>(null);

  const closings = closingsAll.filter((c) => c.userId === user.id).sort((a, b) => (a.cycleKey < b.cycleKey ? 1 : -1)).slice(0, 3);

  // kabar: dompet yang baru dibuka anak dalam 7 hari terakhir (dikelompokkan per waktu pembukaan)
  const openedNews = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    const groups = new Map<string, { via: string; count: number }>();
    for (const w of walletsAll) {
      if (w.userId !== user.id || w.archived || w.type === "savings" || w.type === "grant" || !w.openedAt || openedViaOf(w) === "legacy") continue;
      if (Date.parse(w.openedAt) < cutoff) continue;
      const g = groups.get(w.openedAt) ?? { via: openedViaOf(w), count: 0 };
      g.count += 1;
      groups.set(w.openedAt, g);
    }
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 2);
  }, [walletsAll, user.id]);

  if (!ctx) return null;
  const policy = ROLLOVER_POLICIES.find((p) => p.id === ctx.budget.rolloverPolicy);
  const spendWallets = ctx.wallets.filter((w) => w.type !== "savings");

  const submitIncome = () => {
    const n = toInt(amount);
    const res = record({ userId: user.id, amount: n, title: title.trim() || undefined });
    if (isIncomeDecision(res)) {
      setPending({ prompt: res.prompt, candidate: res.candidate, amount: n, title: title.trim() });
      return;
    }
    if (!res.success) {
      setErr(res.message);
      return;
    }
    act(res, "Uang masuk tercatat");
    setAmount("");
    setTitle("");
    setErr(null);
    setIncomeOpen(false);
  };

  const decide = (same: boolean) => {
    if (!pending) return;
    const res = resolve({ userId: user.id, amount: pending.amount, title: pending.title || undefined, candidateId: pending.candidate.id, same });
    act(res, same ? "Dikonfirmasi" : "Uang masuk tercatat");
    if (res.success) {
      setPending(null);
      setAmount("");
      setTitle("");
      setErr(null);
      setIncomeOpen(false);
    }
  };

  return (
    <section aria-label={`Keuangan ${user.display_name}`} className="min-w-0">
      <MotionConfig reducedMotion="user">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start min-w-0">
          {/* 1) PERLU TINDAKAN */}
          <div className="lg:col-span-2">
            <SectionCard
              id="perlu-tindakan"
              icon="mailbox"
              title="Perlu Tindakan"
              subtitle={count > 0 ? `${count} hal menunggu keputusan Anda.` : `Tidak ada yang menunggu. ${user.display_name} bisa lanjut dengan tenang.`}
              tint={count > 0 ? "honey" : "white"}
              aside={
                <span className="inline-flex items-center gap-1.5">
                  <WigglingBell active={count > 0} />
                  {count > 0 && (
                    <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="min-w-6 h-6 px-1.5 rounded-full bg-[#FF8B7B] border-2 border-white text-white text-xs font-extrabold grid place-items-center">
                      {count}
                    </motion.span>
                  )}
                </span>
              }
            >
              {count === 0 && openedNews.length === 0 && (
                <div className="flex items-center gap-3">
                  <AllClearCheck />
                  <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Semua beres. Kalau anak mencatat uang masuk, mengajukan kebutuhan darurat, atau meminjam dari celengan, kabarnya muncul di sini.</p>
                </div>
              )}

              {openedNews.map(([at, g]) => (
                <motion.div key={at} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-2xl bg-[#F6FBFF] border-2 border-[#DCEBF5] p-2.5">
                  <div className="w-12 shrink-0">
                    <WalletIllustration ratio={0.9} open className="w-full" label="Dompet baru" />
                  </div>
                  <p className="text-xs font-bold text-[#3D352E] leading-relaxed">
                    {user.display_name} membuka <strong>{g.count} dompet</strong> ({VIA[g.via]?.label.toLowerCase() ?? g.via}) pada {shortDateLabel(at.slice(0, 10))}. Hanya kabar, tidak perlu persetujuan.
                  </p>
                </motion.div>
              ))}

              <AnimatePresence initial={false}>
                {queue.length > 0 && (
                  <motion.div key="queue" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <p className="text-xs font-display font-extrabold text-[#8A6A00]">Konfirmasi pemasukan yang dicatat anak ({queue.length})</p>
                    <ul className="space-y-2">
                      {queue.map((t) => (
                        <li key={t.id} className="rounded-2xl bg-white border-2 border-[#FDE08D] p-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-display text-xs font-extrabold text-[#3D352E]">{t.title}</p>
                            <span className="font-display text-xs font-extrabold tabular-nums text-[#3D352E]">{formatRupiah(Number(t.total_amount))}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#7A6E65]">{shortDateLabel(t.transaction_date)} • dicatat anak, belum diverifikasi</p>
                          <div className="flex gap-2">
                            <TactileButton type="button" variant="matcha" size="sm" onClick={() => act(verify(t.id), "Terverifikasi")}>
                              Benar
                            </TactileButton>
                            <TactileButton type="button" variant="peach" size="sm" onClick={() => notify.result(rejectIncome(t.id), "Ditolak", "Belum bisa")}>
                              Tolak
                            </TactileButton>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                {grants.length > 0 && (
                  <motion.div key="grants" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <p className="text-xs font-display font-extrabold text-[#8A3FC2]">Pengajuan kebutuhan darurat di luar uang bulanan ({grants.length})</p>
                    <ul className="space-y-2">
                      {grants.map((g) => (
                        <GrantDecisionRow key={g.id} g={g} />
                      ))}
                    </ul>
                  </motion.div>
                )}
                {loans.length > 0 && (
                  <motion.div key="loans" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <p className="text-xs font-display font-extrabold text-[#1E88E5]">Pinjam dari celengan ({loans.length})</p>
                    <ul className="space-y-2">
                      {loans.map((l) => (
                        <li key={l.id} className="rounded-2xl bg-white border-2 border-[#BCE3FF] p-2.5 space-y-2">
                          <p className="font-display text-xs font-extrabold text-[#3D352E]">
                            {formatRupiah(l.amount)} — {l.reason}
                          </p>
                          <p className="text-[11px] font-bold text-[#7A6E65]">Harus dikembalikan anak ke celengan.</p>
                          <div className="flex gap-2">
                            <TactileButton type="button" variant="matcha" size="sm" onClick={() => act(decideLoan(l.id, true), "Pinjaman disetujui")}>
                              Setujui
                            </TactileButton>
                            <TactileButton type="button" variant="peach" size="sm" onClick={() => notify.result(decideLoan(l.id, false), "Pinjaman ditolak", "Belum bisa")}>
                              Tolak
                            </TactileButton>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </div>

          {/* 2) ATUR ANGGARAN */}
          <SectionCard
            id="atur-anggaran"
            icon="coin"
            title="Atur Anggaran"
            subtitle={`Tentukan uang bulanan dan tabungan wajib ${user.display_name}. Dompet anak dibagi dari angka ini.`}
            tint="white"
          >
            <BudgetExplainer monthlyCash={ctx.monthlyCash} mandatory={ctx.budget.mandatorySavingsTarget} allocated={ctx.allocated} unallocated={Math.max(0, ctx.unallocated)} />

            <div className="grid grid-cols-2 gap-2">
              {([
                { icon: "money_bag", label: "Uang bulanan", value: ctx.budget.monthlyBudget, hint: "Jatah uang anak sebulan" },
                { icon: "piggy", label: "Tabungan wajib", value: ctx.budget.mandatorySavingsTarget, hint: "Disisihkan dulu ke Brankas" },
                { icon: "receipt", label: "Terpakai siklus ini", value: ctx.totals.ownSpent, hint: "Belanja dari uang bulanan" },
                { icon: "swap", label: "Saldo bawaan", value: ctx.carriedOver, hint: "Sisa dari siklus lalu" },
              ] as { icon: GlyphName; label: string; value: number; hint: string }[]).map((c) => (
                <div key={c.label} className="rounded-2xl bg-[#FFFDF9] border-2 border-[#EFE8DA] p-2.5 min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#7A6E65]">
                    <GlyphInline name={c.icon} className="w-4 h-4 shrink-0" /> <span className="truncate">{c.label}</span>
                  </p>
                  <p className="font-display text-sm font-extrabold tabular-nums text-[#3D352E] truncate">{formatRupiah(c.value)}</p>
                  <p className="text-[10px] font-bold text-[#7A6E65] leading-snug">{c.hint}</p>
                </div>
              ))}
            </div>

            <SpendMeter spent={ctx.totals.ownSpent} budget={ctx.budget.monthlyBudget} />
            <CycleDays totalDays={ctx.cycle.totalDays} daysLeft={ctx.cycle.daysLeft} label={`Siklus ${ctx.cycle.key}, mulai tanggal ${ctx.budget.cycleStartDay}`} />

            <p className="flex items-start gap-2 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] p-2.5 text-[11px] font-bold text-[#7A6E65] leading-relaxed">
              <GlyphInline name="swap" className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Sisa uang akhir siklus: <strong className="text-[#3D352E]">{policy?.label ?? "-"}</strong>.
                {ctx.budget.hasPendingChange ? " Ada perubahan anggaran yang berlaku mulai siklus berikutnya." : ""}
              </span>
            </p>
            <TactileButton type="button" variant="matcha" size="md" fullWidth onClick={() => setBudgetOpen(true)}>
              <GlyphInline name="pencil" /> Atur Anggaran {user.display_name}
            </TactileButton>
          </SectionCard>

          {/* 3) DOMPET ANAK (hanya-lihat) */}
          <SectionCard
            id="dompet-anak"
            icon="coin"
            title={`Dompet ${user.display_name}`}
            subtitle="Hanya-lihat. Anak yang membuka dan mengatur dompetnya sendiri."
            aside={
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F7F3EB] border border-[#E6DFD2] text-[10px] font-extrabold text-[#7A6E65] shrink-0">
                <GlyphInline name="eye" className="w-3.5 h-3.5" /> Hanya lihat
              </span>
            }
          >
            {spendWallets.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#EFE8DA] p-3">
                <div className="w-20 shrink-0">
                  <WalletIllustration ratio={0} allocated={0} className="w-full" label="Belum ada dompet" />
                </div>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
                  {user.display_name} belum membuka dompet. Setelah anggaran diatur, anak akan memilih rekomendasi sistem atau menyusun dompetnya sendiri. Kabarnya muncul di “Perlu Tindakan”.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {ctx.wallets.map((w, i) => (
                  <ReadOnlyWallet key={w.id} w={w} all={ctx.wallets} idx={i} />
                ))}
              </ul>
            )}
            {ctx.grantWallets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-display font-extrabold text-[#8A3FC2]">Dompet kebutuhan darurat aktif</p>
                <ul className="space-y-2">
                  {ctx.grantWallets.map((w, i) => (
                    <ReadOnlyWallet key={w.id} w={w} all={ctx.wallets} idx={i} />
                  ))}
                </ul>
                <p className="text-[11px] font-bold text-[#7A6E65]">Tidak memotong anggaran bulanan.</p>
              </div>
            )}
            <button type="button" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen} className="w-full text-left text-xs font-display font-extrabold text-[#8A3FC2] cursor-pointer">
              {guideOpen ? "Sembunyikan cara kerja" : "Bagaimana dompet bekerja?"}
            </button>
            <AnimatePresence initial={false}>
              {guideOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <HowItWorks />
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* 4) CATAT UANG MASUK */}
          <SectionCard
            id="uang-masuk"
            icon="money_bag"
            title="Catat Uang Masuk"
            subtitle="Kiriman uang saku dari Anda. Bila anak sudah mencatat yang sama dalam 72 jam, Anda ditanya agar tidak dobel."
            aside={
              <TactileButton type="button" variant="white" size="sm" aria-expanded={incomeOpen} onClick={() => setIncomeOpen((v) => !v)}>
                {incomeOpen ? "Tutup" : "Catat"}
              </TactileButton>
            }
          >
            <AnimatePresence initial={false}>
              {incomeOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-3 pt-1">
                    <MoneyInput label="Jumlah" value={amount} onChange={setAmount} />
                    <label className="block">
                      <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Keterangan (opsional)</span>
                      <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Uang saku dari orang tua" className={FIELD_CLASS} />
                    </label>
                    {err && (
                      <p role="alert" className="text-xs font-bold text-[#C83E2B]">
                        {err}
                      </p>
                    )}
                    <TactileButton type="button" variant="matcha" size="md" fullWidth disabled={toInt(amount) <= 0} onClick={submitIncome}>
                      Catat Uang Masuk
                    </TactileButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* 5) RIWAYAT TUTUP BUKU */}
          {closings.length > 0 && (
            <SectionCard icon="calendar" title="Riwayat Tutup Buku" subtitle="Ke mana sisa uang bulan lalu dibawa.">
              <ul className="space-y-1.5">
                {closings.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#FFFDF9] border-2 border-[#EFE8DA] px-2.5 py-2 text-xs font-bold text-[#3D352E]">
                    <span className="font-display font-extrabold">{c.cycleKey}</span>
                    <span className="text-right tabular-nums">
                      ke Brankas {formatRupiah(c.savedToVaultAmount)} • dibawa {formatRupiah(c.rolledOverAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </MotionConfig>

      <CozySheet
        open={Boolean(pending)}
        onOpenChange={(o) => !o && setPending(null)}
        title="Apakah ini kiriman yang sama?"
        description={pending?.prompt ?? ""}
        icon={<GlyphInline name="swap" className="w-7 h-7" />}
        footer={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <TactileButton type="button" variant="matcha" size="lg" onClick={() => decide(true)}>
              Ya, sama
            </TactileButton>
            <TactileButton type="button" variant="white" size="lg" onClick={() => decide(false)}>
              Bukan, catat baru
            </TactileButton>
          </div>
        }
      >
        {pending && (
          <p className="text-sm font-bold text-[#3D352E] leading-relaxed">
            Kamu mencatat {formatRupiah(pending.amount)}. Bila sama, catatan anak ditandai terverifikasi dan saldo tidak bertambah dua kali.
          </p>
        )}
      </CozySheet>

      <BudgetConfigSheet userId={user.id} name={user.display_name} open={budgetOpen} onOpenChange={setBudgetOpen} />
    </section>
  );
}

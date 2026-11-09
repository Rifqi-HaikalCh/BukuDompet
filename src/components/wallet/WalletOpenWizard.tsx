"use client";

/**
 * Wizard "Buka Dompet" (V5.6.1). Anak memilih sendiri: ikuti rekomendasi sistem atau atur manual.
 * Pilihan disimpan lewat `openWallets` (dokumen `sub_wallets` bertanda `openedVia`), sehingga Supervisor
 * bisa melihat cara dompet itu dibuka. Tidak ada angka tersimpan: saldo tetap turunan dari alokasi & transaksi.
 */
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ChunkyProgressBar, CozyCard, TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozySheet } from "@/components/ui/CozySheet";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { WalletIllustration } from "@/components/wallet/WalletIllustration";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { recommendWalletPlan, validateWalletPlan, KNOWN_EXPENSE_CATEGORIES, MAX_CUSTOM_WALLETS, MAX_WALLET_NAME, type OpenVia, type PlanItem, type PlanType } from "@/lib/finance/opening";
import { WALLET_PRESETS, isAllocatable } from "@/lib/finance/wallets";
import { localDateStr } from "@/lib/dates";
import { fireCozyConfetti, soundEffects } from "@/lib/sound-effects";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { FinanceContext } from "@/lib/finance/context";
import type { FinTx } from "@/lib/finance/types";

type Step = "choose" | "plan" | "done";

interface Row {
  key: string;
  name: string;
  type: PlanType;
  categories: string[];
  reason?: string;
  custom?: boolean;
  on: boolean;
  amount: string;
}

const TYPE_LABEL: Record<PlanType, string> = {
  operational: "Harian (boleh dipakai bebas)",
  commitment: "Komitmen rutin (terkunci, untuk tagihan)",
  emergency: "Darurat",
};

const rowFromItem = (i: PlanItem, on: boolean): Row => ({ key: i.key, name: i.name, type: i.type, categories: i.categories, reason: i.reason, custom: i.custom, on, amount: i.allocated > 0 ? String(i.allocated) : "" });

export function WalletOpenWizard({ userId, open, onOpenChange, ctx }: { userId: string; open: boolean; onOpenChange: (o: boolean) => void; ctx: FinanceContext }) {
  const openWallets = useFinanceStore((s) => s.openWallets);
  const allWallets = useFinanceStore((s) => s.subWallets);
  const txs = useBukuDompetStore((s) => s.transactions) as unknown as FinTx[];

  const [step, setStep] = useState<Step>("choose");
  const [via, setVia] = useState<OpenVia>("recommendation");
  const [rows, setRows] = useState<Row[]>([]);
  const [edited, setEdited] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<string[]>([]);

  const free = Math.max(0, ctx.unallocated);
  const rec = useMemo(
    () => recommendWalletPlan({ free, txs, userId, today: localDateStr(), startDay: ctx.budget.cycleStartDay, existing: allWallets }),
    [free, txs, userId, ctx.budget.cycleStartDay, allWallets],
  );
  const owned = useMemo(() => allWallets.filter((w) => w.userId === userId && !w.archived && isAllocatable(w)), [allWallets, userId]);
  const missingPresets = WALLET_PRESETS.filter((p) => !owned.some((w) => w.key === p.key));

  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setRows([]);
    setErr(null);
    setEdited(false);
    setCreated([]);
  }, [open]);

  const total = rows.filter((r) => r.on).reduce((s, r) => s + toInt(r.amount), 0);
  const over = total > free;
  const effectiveVia: OpenVia = via === "recommendation" && edited ? "manual" : via;

  const choose = (v: OpenVia) => {
    soundEffects.tactileClick();
    setVia(v);
    setErr(null);
    setEdited(false);
    if (v === "recommendation") setRows(rec.items.map((i) => rowFromItem(i, true)));
    else
      setRows(
        missingPresets.map((p) => ({ key: p.key, name: p.name, type: p.type as PlanType, categories: [...p.categories], on: false, amount: "" })),
      );
    setStep("plan");
  };

  const patch = (key: string, p: Partial<Row>, touch = true) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
    if (touch) setEdited(true);
    setErr(null);
  };

  const takenByOthers = (key: string): Set<string> => {
    const s = new Set<string>();
    for (const w of owned) for (const c of w.categories) s.add(c);
    for (const r of rows) if (r.on && r.key !== key) for (const c of r.categories) s.add(c);
    return s;
  };

  const customCount = rows.filter((r) => r.custom).length + owned.filter((w) => w.key.startsWith("c-")).length;

  const addCustom = () => {
    soundEffects.tactileClick();
    const key = `custom-${Math.random().toString(36).slice(2, 8)}`;
    setRows((rs) => [...rs, { key, name: "", type: "operational", categories: [], custom: true, on: true, amount: "" }]);
    setEdited(true);
  };

  const submit = () => {
    const items: PlanItem[] = rows
      .filter((r) => r.on)
      .map((r) => ({ key: r.key, name: r.name, type: r.type, categories: r.categories, allocated: toInt(r.amount), reason: r.reason, custom: r.custom }));
    const check = validateWalletPlan(items, { free, existing: allWallets, userId });
    if (!check.ok) {
      setErr(check.error);
      soundEffects.detectiveBuzz();
      return;
    }
    const res = openWallets(userId, effectiveVia, items);
    if (!res.success) {
      setErr(res.message);
      soundEffects.detectiveBuzz();
      return;
    }
    setCreated(items.map((i) => i.name.trim()));
    setStep("done");
    soundEffects.coinChime();
    fireCozyConfetti("combo");
    notify.success("Dompet terbuka", res.message);
  };

  const footer =
    step === "plan" ? (
      <div className="flex gap-2">
        <TactileButton type="button" variant="white" size="lg" onClick={() => setStep("choose")}>
          Kembali
        </TactileButton>
        <TactileButton type="button" variant="matcha" size="lg" fullWidth disabled={!rows.some((r) => r.on) || over} onClick={submit}>
          Buka {rows.filter((r) => r.on).length} Dompet
        </TactileButton>
      </div>
    ) : step === "done" ? (
      <TactileButton type="button" variant="matcha" size="lg" fullWidth onClick={() => onOpenChange(false)}>
        Siap Dipakai!
      </TactileButton>
    ) : undefined;

  return (
    <CozySheet
      open={open}
      onOpenChange={onOpenChange}
      title={step === "done" ? "Dompetmu sudah terbuka!" : "Buka Dompet"}
      description={step === "choose" ? "Pilih cara membagi uang bulananmu. Kamu yang memutuskan." : step === "plan" ? `Uang yang bisa dibagi: ${formatRupiah(free)}` : undefined}
      icon={<GlyphInline name="coin" className="w-7 h-7" />}
      footer={footer}
      maxWidthClass="md:max-w-xl"
    >
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait" initial={false}>
          {step === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-3">
              {free <= 0 ? (
                <CozyCard tone="honey" className="space-y-1">
                  <p className="font-display text-sm font-extrabold text-[#3D352E]">Belum ada uang yang bisa dibagi</p>
                  <p className="text-xs font-bold text-[#7A6E65]">Uang bulananmu sudah habis terbagi atau belum diatur. Minta Supervisor mengatur anggaran, lalu coba lagi.</p>
                </CozyCard>
              ) : (
                <>
                  <button type="button" onClick={() => choose("recommendation")} className="w-full text-left cursor-pointer">
                    <CozyCard tone="matcha" className="flex items-center gap-3">
                      <div className="w-24 shrink-0">
                        <WalletIllustration type="operational" ratio={0.8} open className="w-full" label="Dompet rekomendasi" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-display text-sm font-extrabold text-[#3D352E]">Ikuti Rekomendasi Sistem</p>
                        <p className="text-xs font-bold text-[#7A6E65]">{rec.note}</p>
                        <p className="text-[11px] font-extrabold text-[#46A302]">Cepat • bisa kamu ubah angkanya</p>
                      </div>
                    </CozyCard>
                  </button>
                  <button type="button" onClick={() => choose("manual")} className="w-full text-left cursor-pointer">
                    <CozyCard tone="sky" className="flex items-center gap-3">
                      <div className="w-24 shrink-0">
                        <WalletIllustration type="commitment" ratio={0.5} className="w-full" label="Dompet buatan sendiri" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-display text-sm font-extrabold text-[#3D352E]">Atur Sendiri</p>
                        <p className="text-xs font-bold text-[#7A6E65]">Pilih dompet bawaan yang kamu mau, atau buat dompet baru dengan nama dan kategori sendiri.</p>
                        <p className="text-[11px] font-extrabold text-[#1E88E5]">Bebas • tetap dijaga agar total pas</p>
                      </div>
                    </CozyCard>
                  </button>
                </>
              )}
            </motion.div>
          )}

          {step === "plan" && (
            <motion.div key="plan" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-3">
              <div className="rounded-2xl border-2 border-[#E6DFD2] bg-white p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-display font-extrabold text-[#3D352E]">Terbagi</span>
                  <span className={cn("text-xs font-display font-extrabold tabular-nums", over ? "text-[#C83E2B]" : "text-[#46A302]")}>
                    {formatRupiah(total)} / {formatRupiah(free)}
                  </span>
                </div>
                <ChunkyProgressBar value={Math.min(total, free)} max={Math.max(1, free)} variant={over ? "peach" : "matcha"} />
                <p className="text-[11px] font-bold text-[#7A6E65]">
                  {over ? `Kelebihan ${formatRupiah(total - free)}. Kurangi dulu.` : `Sisa belum terbagi ${formatRupiah(free - total)} (boleh, bisa dibagi nanti).`}
                </p>
                {via === "recommendation" && edited && <p className="text-[11px] font-bold text-[#8A6A00]">Kamu mengubah rekomendasi, jadi dicatat sebagai “atur sendiri”.</p>}
              </div>

              <ul className="space-y-2">
                {rows.map((r, idx) => {
                  const taken = takenByOthers(r.key);
                  return (
                    <motion.li key={r.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 6) * 0.05 }}>
                      <div className={cn("rounded-2xl border-2 p-3 space-y-2", r.on ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302]" : "bg-[#F7F3EB] border-[#E6DFD2]")}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={r.on}
                            aria-label={`Buka ${r.name || "dompet baru"}`}
                            onClick={() => patch(r.key, { on: !r.on }, false)}
                            className={cn("w-11 h-6 rounded-full border-2 shrink-0 relative cursor-pointer transition-colors", r.on ? "bg-[#58CC02] border-[#46A302]" : "bg-white border-[#E6DFD2]")}
                          >
                            <motion.span layout className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#3D352E]", r.on ? "right-0.5" : "left-0.5")} />
                          </button>
                          {r.custom ? (
                            <input
                              value={r.name}
                              maxLength={MAX_WALLET_NAME}
                              onChange={(e) => patch(r.key, { name: e.target.value })}
                              placeholder="Nama dompet, mis. Dompet Hobi"
                              className={cn(FIELD_CLASS, "flex-1")}
                              aria-label="Nama dompet"
                            />
                          ) : (
                            <span className="font-display text-sm font-extrabold text-[#3D352E] min-w-0 truncate">{r.name}</span>
                          )}
                          {r.custom && (
                            <button type="button" aria-label="Hapus dompet ini" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-[#C83E2B] cursor-pointer shrink-0">
                              <GlyphInline name="trash" className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        {r.reason && <p className="text-[11px] font-bold text-[#7A6E65]">{r.reason}</p>}
                        {r.on && (
                          <div className="space-y-2">
                            <MoneyInput label="Jatah bulan ini" value={r.amount} onChange={(v) => patch(r.key, { amount: v })} />
                            {r.custom && (
                              <>
                                <select value={r.type} onChange={(e) => patch(r.key, { type: e.target.value as PlanType })} className={FIELD_CLASS} aria-label="Jenis dompet">
                                  <option value="operational">{TYPE_LABEL.operational}</option>
                                  <option value="commitment">{TYPE_LABEL.commitment}</option>
                                </select>
                                <div>
                                  <p className="text-[11px] font-display font-extrabold text-[#7A6E65] mb-1">Kategori yang masuk dompet ini</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {KNOWN_EXPENSE_CATEGORIES.map((c) => {
                                      const sel = r.categories.includes(c);
                                      const dis = !sel && taken.has(c);
                                      return (
                                        <button
                                          key={c}
                                          type="button"
                                          disabled={dis}
                                          aria-pressed={sel}
                                          onClick={() => patch(r.key, { categories: sel ? r.categories.filter((x) => x !== c) : [...r.categories, c] })}
                                          className={cn(
                                            "px-2.5 py-1 rounded-full border-2 text-[11px] font-extrabold cursor-pointer",
                                            sel ? "bg-[#EFFBE6] border-[#58CC02] text-[#2E6F00]" : "bg-white border-[#E6DFD2] text-[#7A6E65]",
                                            dis && "opacity-40 cursor-not-allowed",
                                          )}
                                        >
                                          {c}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>
                            )}
                            {!r.custom && r.categories.length > 0 && <p className="text-[11px] font-bold text-[#7A6E65]">Untuk: {r.categories.join(", ")}</p>}
                          </div>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              {customCount < MAX_CUSTOM_WALLETS && (
                <TactileButton type="button" variant="white" size="md" fullWidth onClick={addCustom}>
                  <GlyphInline name="plus" /> Buat Dompet Sendiri
                </TactileButton>
              )}
              {err && (
                <p role="alert" className="text-xs font-bold text-[#C83E2B]">
                  {err}
                </p>
              )}
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
              <div className="w-44 mx-auto">
                <WalletIllustration type="operational" ratio={0.9} open pulseKey={1} entrance className="w-full" label="Dompet baru terbuka" />
              </div>
              <p className="font-display text-base font-extrabold text-[#3D352E]">{created.length} dompet siap dipakai</p>
              <ul className="flex flex-wrap justify-center gap-2">
                {created.map((n, i) => (
                  <motion.li
                    key={n + i}
                    initial={{ opacity: 0, scale: 0.6, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.15 + i * 0.1 }}
                    className="px-3 py-1.5 rounded-full bg-[#EFFBE6] border-2 border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]"
                  >
                    {n}
                  </motion.li>
                ))}
              </ul>
              <p className="text-xs font-bold text-[#7A6E65]">Supervisor bisa melihat dompetmu (hanya lihat, tidak bisa mengubah). Catat pengeluaran dan pilih dompetnya.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </CozySheet>
  );
}

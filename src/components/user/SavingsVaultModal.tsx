"use client";

import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Plus, Trash2, Target } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore, isChildRole, type ProfileData } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { PiggyVaultIllustration } from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozySheet } from "@/components/ui/CozySheet";
import { VaultDipCard } from "@/components/user/FinanceHabitCards";
import { TactileButton, CozyCard, ChunkyProgressBar, RollingNumber, formatRupiah } from "@/components/ui/CozyPrimitives";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

const GOAL_CATEGORIES: { name: string; icon: GlyphName }[] = [
  { name: "Mainan & Hobi", icon: "teddy" },
  { name: "Buku & Sekolah", icon: "books" },
  { name: "Gadget", icon: "headphones" },
  { name: "Liburan", icon: "beach" },
  { name: "Hadiah untuk Keluarga", icon: "gift" },
  { name: "Dana Darurat", icon: "lifebuoy" },
  { name: "Sepeda & Olahraga", icon: "bike" },
  { name: "Lainnya", icon: "sparkle" },
];

const QUICK_CHIPS_KID = [1000, 2000, 5000, 10000, 20000];
const QUICK_CHIPS_USER = [10000, 25000, 50000, 100000, 250000];

function digitsOnly(v: string): string {
  return v.replace(/\D/g, "").slice(0, 10);
}

function formatDigits(v: string): string {
  return v ? Number(v).toLocaleString("id-ID") : "";
}

/**
 * Catat Tabungan (User & Anak SD): impian tabungan + setoran ke celengan kaca.
 * Setoran dicatat sebagai transaksi `saving` — bukan pengeluaran, jadi tidak pernah
 * dianggap boros oleh Inspektur Saku.
 */
export function SavingsVaultPanel({ profile, active = true }: { profile: ProfileData; active?: boolean }) {
  const goals = useFamilyStore((s) => s.goals);
  const createGoal = useFamilyStore((s) => s.createGoal);
  const removeGoal = useFamilyStore((s) => s.removeGoal);
  const depositToGoal = useFamilyStore((s) => s.depositToGoal);

  const myGoals = useMemo(
    () => (goals.filter((g) => g.userId === profile.id)),
    [goals, profile]
  );

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [mode, setMode] = useState<"deposit" | "new">("deposit");
  const [name, setName] = useState<string>("");
  const [targetDigits, setTargetDigits] = useState<string>("");
  const [category, setCategory] = useState<string>(GOAL_CATEGORIES[0].name);
  const [amountDigits, setAmountDigits] = useState<string>("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [dropKey, setDropKey] = useState<number>(0);
  const [shaking, setShaking] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  // Pilih impian pertama otomatis; arahkan ke formulir bila belum punya impian.
  useEffect(() => {
    if (!active) return;
    if (myGoals.length === 0) {
      setMode("new");
    } else if (!selectedGoalId || !myGoals.some((g) => g.id === selectedGoalId)) {
      setSelectedGoalId(myGoals[0].id);
      setMode((m) => (m === "new" && myGoals.length === 0 ? "new" : "deposit"));
    }
  }, [active, myGoals, selectedGoalId]);

  const isKid = profile.role === "schoolchild";
  const chips = isKid ? QUICK_CHIPS_KID : QUICK_CHIPS_USER;
  const goal = myGoals.find((g) => g.id === selectedGoalId) ?? null;
  const pct = goal ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
  const remaining = goal ? Math.max(0, goal.targetAmount - goal.savedAmount) : 0;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createGoal({
      userId: profile.id,
      name,
      category,
      targetAmount: Number(targetDigits),
    });
    if (!res.success || !res.goal) {
      soundEffects.detectiveBuzz();
      setNotice({ ok: false, text: res.message });
      return;
    }
    soundEffects.coinChime();
    setNotice({ ok: true, text: `Impian “${res.goal.name}” dibuat. Yuk mulai menabung!` });
    setSelectedGoalId(res.goal.id);
    setName("");
    setTargetDigits("");
    setMode("deposit");
  };

  const handleDeposit = () => {
    if (!goal) return;
    const amt = Number(amountDigits);
    const res = depositToGoal({ userId: profile.id, goalId: goal.id, amount: amt });
    if (!res.success) {
      soundEffects.detectiveBuzz();
      setNotice({ ok: false, text: res.message });
      return;
    }
    soundEffects.coinChime();
    setNotice({ ok: true, text: res.message });
    setAmountDigits("");
    setDropKey((k) => k + 1);
    // Celengan bergetar setelah koin mendarat.
    later(() => setShaking(true), 650);
    later(() => setShaking(false), 1400);
    if (res.completed) {
      later(() => fireCozyConfetti("jackpot"), 700);
    }
  };

  const heroTitle = goal ? goal.name : "Celenganmu masih kosong";
  const segBtn = (on: boolean) =>
    cn(
      "flex-1 px-3 py-2 rounded-xl border-2 text-xs font-display font-extrabold cursor-pointer transition-colors",
      "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
      on ? "bg-white border-[#FFD9D0] border-b-[3px] border-b-[#F2B8AB] text-[#3D352E]" : "bg-transparent border-transparent text-[#7A6E65] hover:bg-white/60"
    );

  return (
    <div className="@container min-w-0">
      <div className="grid grid-cols-1 @2xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4 items-start min-w-0">
        {/* Kiri: celengan babi + ringkasan impian */}
        <CozyCard tone="white" className="space-y-3 min-w-0">
          <div className="relative rounded-2xl bg-[#FFF3EE] border-2 border-[#FFE0D8] px-3 pt-4 pb-2 overflow-hidden">
            <div className="relative w-full max-w-[250px] mx-auto">
              <PiggyVaultIllustration progressPercent={goal ? pct : 0} isShaking={shaking} className="w-full h-auto" />
              {/* Koin jatuh masuk celengan */}
              <MotionConfig reducedMotion="user">
                <AnimatePresence>
                  {dropKey > 0 &&
                    [0, 1, 2].map((i) => (
                      <motion.span
                        key={`${dropKey}-${i}`}
                        aria-hidden="true"
                        initial={{ y: -90, opacity: 0, scale: 0.8 }}
                        animate={{ y: [-90, 8, 28], opacity: [0, 1, 0], scale: [0.8, 1, 0.7] }}
                        transition={{ duration: 0.8, delay: i * 0.14, ease: "easeIn" }}
                        className="pointer-events-none absolute left-1/2 top-0 -ml-3 w-6 h-6 rounded-full bg-[#FFC800] border-2 border-[#3D352E] flex items-center justify-center text-[10px] font-extrabold text-[#4A3500]"
                        style={{ marginLeft: `${(i - 1) * 16 - 12}px` }}
                      >
                        Rp
                      </motion.span>
                    ))}
                </AnimatePresence>
              </MotionConfig>
            </div>
          </div>

          {goal ? (
            <div className="space-y-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-display font-extrabold uppercase tracking-wide text-[#7A6E65]">
                  {goal.category ? `Impian • ${goal.category}` : "Impian"}
                </p>
                <p className="font-display text-lg font-extrabold text-[#3D352E] leading-snug break-words">{heroTitle}</p>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <RollingNumber value={goal.savedAmount} prefix="Rp" isCurrency className="text-2xl text-[#3D352E]" />
                <span className="text-xs font-bold text-[#7A6E65] tabular-nums">dari {formatRupiah(goal.targetAmount)}</span>
              </div>
              <ChunkyProgressBar value={goal.savedAmount} max={goal.targetAmount} variant={pct >= 100 ? "matcha" : "honey"} size="lg" />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] px-3 py-2">
                  <p className="text-[10px] font-display font-extrabold uppercase text-[#8A6A00]">Terkumpul</p>
                  <p className="font-display text-base font-extrabold tabular-nums text-[#4A3500]">{pct}%</p>
                </div>
                <div className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] px-3 py-2 min-w-0">
                  <p className="text-[10px] font-display font-extrabold uppercase text-[#7A6E65]">{pct >= 100 ? "Status" : "Tinggal"}</p>
                  <p className="font-display text-base font-extrabold tabular-nums text-[#3D352E] truncate">{pct >= 100 ? "Tercapai!" : formatRupiah(remaining)}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">
                {pct >= 100 ? "Impian tercapai! Hebat sekali!" : "Setiap setoran membuat si babi makin gembul."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <p className="font-display text-lg font-extrabold text-[#3D352E]">{heroTitle}</p>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Buat impian pertamamu, lalu mulai menabung. Si babi menunggu koin pertamamu!</p>
              </div>
              <ol className="grid grid-cols-3 gap-2 text-center">
                {([
                  { icon: "star", label: "Buat impian" },
                  { icon: "coin", label: "Setor rutin" },
                  { icon: "gift", label: "Raih impian" },
                ] as const).map((st, i) => (
                  <li key={st.label} className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] px-1.5 py-2 space-y-1">
                    <span className="mx-auto w-8 h-8 rounded-xl bg-white border-2 border-[#E6DFD2] grid place-items-center text-lg">
                      <GlyphInline name={st.icon} />
                    </span>
                    <p className="text-[10px] font-display font-extrabold text-[#3D352E] leading-tight">
                      {i + 1}. {st.label}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CozyCard>

        {/* Kanan: pilih impian, setor, atau buat baru */}
        <div className="space-y-3 min-w-0">
          <CozyCard tone="white" className="space-y-3.5 min-w-0">
            {myGoals.length > 0 && (
              <div role="group" aria-label="Mode celengan" className="flex gap-1 p-1 rounded-2xl bg-[#FFF3EE] border-2 border-[#FFE0D8]">
                <button type="button" aria-pressed={mode === "deposit"} className={segBtn(mode === "deposit")} onClick={() => { soundEffects.tactileClick(); setMode("deposit"); setNotice(null); }}>
                  Setor Tabungan
                </button>
                <button type="button" aria-pressed={mode === "new"} className={segBtn(mode === "new")} onClick={() => { soundEffects.tactileClick(); setMode("new"); setNotice(null); }}>
                  + Impian Baru
                </button>
              </div>
            )}

            {mode === "deposit" && myGoals.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-display font-extrabold uppercase text-[#7A6E65]">Pilih impian</p>
                <ul className="flex gap-2 overflow-x-auto pt-0.5 pb-1.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>li]:shrink-0">
                  {myGoals.map((g) => {
                    const on = g.id === selectedGoalId;
                    const done = g.savedAmount >= g.targetAmount;
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            soundEffects.tactileClick();
                            setSelectedGoalId(g.id);
                            setNotice(null);
                          }}
                          className={cn(
                            "px-3 py-2 rounded-2xl border-2 border-b-[3px] text-xs font-display font-extrabold cursor-pointer max-w-[12rem] truncate",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
                            on ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[#F5C84C] text-[#4A3500]" : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#3D352E] hover:bg-[#FFFBEB]"
                          )}
                        >
                          {done && <GlyphInline name="check_circle" className="mr-1" />}
                          {g.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {mode === "new" || myGoals.length === 0 ? (
              <form onSubmit={handleCreate} className="space-y-3">
                <p className="font-display text-sm font-extrabold text-[#3D352E] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#E06353]" aria-hidden="true" /> Buat impian tabungan
                </p>
                <div>
                  <label htmlFor="goal-name" className="block text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                    Nama impian
                  </label>
                  <input
                    id="goal-name"
                    type="text"
                    maxLength={40}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isKid ? "Contoh: Sepeda baru" : "Contoh: Laptop kuliah"}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] focus:border-[#FFC800] focus:outline-none font-display font-extrabold text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="goal-target" className="block text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                    Target nominal (Rp)
                  </label>
                  <input
                    id="goal-target"
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatDigits(targetDigits)}
                    onChange={(e) => setTargetDigits(digitsOnly(e.target.value))}
                    placeholder={isKid ? "250.000" : "8.000.000"}
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] focus:border-[#FFC800] focus:outline-none font-display font-extrabold tabular-nums text-sm"
                  />
                </div>
                <fieldset>
                  <legend className="text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">Kategori</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {GOAL_CATEGORIES.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        aria-pressed={category === c.name}
                        onClick={() => setCategory(c.name)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-display font-extrabold cursor-pointer",
                          category === c.name ? "bg-[#FFFBEB] border-[#FFC800] text-[#4A3500]" : "bg-white border-[#E6DFD2] text-[#3D352E]"
                        )}
                      >
                        <GlyphInline name={c.icon} className="mr-1" /> {c.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <TactileButton type="submit" variant="matcha" size="md" fullWidth>
                  <Plus className="w-4 h-4" aria-hidden="true" /> Simpan Impian
                </TactileButton>
              </form>
            ) : (
              goal && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="deposit-amount" className="block text-xs font-display font-extrabold uppercase text-[#7A6E65] mb-1">
                      Setor berapa? (Rp)
                    </label>
                    <input
                      id="deposit-amount"
                      type="text"
                      inputMode="numeric"
                      value={formatDigits(amountDigits)}
                      onChange={(e) => {
                        setAmountDigits(digitsOnly(e.target.value));
                        setNotice(null);
                      }}
                      placeholder="0"
                      className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] focus:border-[#FFC800] focus:outline-none font-display text-xl font-extrabold tabular-nums"
                    />
                    <ChipScroller label="Nominal setoran cepat" className="mt-2">
                      {chips.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            soundEffects.tactileClick();
                            setAmountDigits(String(c));
                            setNotice(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#FFFBEB] border-2 border-[#FDE08D] text-xs font-display font-extrabold tabular-nums text-[#4A3500] cursor-pointer hover:bg-[#FFF4CE]"
                        >
                          +{c.toLocaleString("id-ID")}
                        </button>
                      ))}
                    </ChipScroller>
                  </div>

                  <TactileButton variant="honey" size="lg" fullWidth disabled={!(Number(amountDigits) > 0)} onClick={handleDeposit}>
                    <CozyIcon name="coin_rupiah" size={22} />
                    Masukkan ke Celengan
                    {Number(amountDigits) > 0 ? ` (${formatRupiah(Number(amountDigits))})` : ""}
                  </TactileButton>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t-2 border-dashed border-[#E6DFD2]">
                    <p className="text-[11px] font-bold text-[#7A6E65] pt-2">Menabung = kebiasaan baik. Tidak dihitung boros ya!</p>
                    {confirmDeleteId === goal.id ? (
                      <span className="inline-flex items-center gap-1.5 shrink-0 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            removeGoal(goal.id);
                            setConfirmDeleteId(null);
                            setSelectedGoalId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FF4B4B] text-white text-[11px] font-display font-extrabold cursor-pointer"
                        >
                          Ya, hapus
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-display font-extrabold cursor-pointer">
                          Batal
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Hapus impian ${goal.name}`}
                        onClick={() => setConfirmDeleteId(goal.id)}
                        className="p-1.5 mt-1.5 rounded-lg text-[#7A6E65] hover:text-[#C83E2B] hover:bg-[#FFF2F0] cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {notice && (
              <p
                role="status"
                className={cn(
                  "text-xs font-extrabold rounded-xl px-3 py-2 border-2",
                  notice.ok ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" : "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]"
                )}
              >
                {notice.text}
              </p>
            )}
          </CozyCard>

          {!isKid && <VaultDipCard userId={profile.id} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Modal Catat Tabungan (dipakai Anak SD dan pintasan cepat). Isinya sama dengan tab Celengan di Jalur Kas:
 * keduanya memakai `SavingsVaultPanel`.
 */
export function SavingsVaultModal() {
  const isOpen = useBukuDompetStore((s) => s.isSavingsModalOpen);
  const setOpen = useBukuDompetStore((s) => s.setSavingsModalOpen);
  const profile = useBukuDompetStore((s) => s.profiles.find((p) => p.id === s.activeProfileId && isChildRole(p.role)));
  if (!profile) return null;
  const isKid = profile.role === "schoolchild";
  return (
    <CozySheet
      open={isOpen}
      onOpenChange={setOpen}
      title="Catat Tabungan"
      description={
        isKid
          ? "Masukkan koin ke celengan kacamu. Menabung itu keren!"
          : "Setor ke celengan impian. Tabungan tidak dihitung sebagai pengeluaran."
      }
      icon={<CozyIcon name="cat_saving" size={30} className="shrink-0" />}
      maxWidthClass="md:max-w-3xl"
    >
      {isOpen && <SavingsVaultPanel profile={profile} />}
    </CozySheet>
  );
}

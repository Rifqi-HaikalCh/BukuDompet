"use client";

import { ChipScroller } from "@/components/ui/ChipScroller";
import { GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Plus, Trash2, Target } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore, isChildRole } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { PiggyVaultIllustration } from "@/components/illustrations/DetectiveAndStoryAssets";
import { CozySheet } from "@/components/ui/CozySheet";
import { TactileButton, ChunkyProgressBar, formatRupiah } from "@/components/ui/CozyPrimitives";
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
export function SavingsVaultModal() {
  const isOpen = useBukuDompetStore((s) => s.isSavingsModalOpen);
  const setOpen = useBukuDompetStore((s) => s.setSavingsModalOpen);
  const profile = useBukuDompetStore((s) =>
    s.profiles.find((p) => p.id === s.activeProfileId && isChildRole(p.role))
  );
  const goals = useFamilyStore((s) => s.goals);
  const createGoal = useFamilyStore((s) => s.createGoal);
  const removeGoal = useFamilyStore((s) => s.removeGoal);
  const depositToGoal = useFamilyStore((s) => s.depositToGoal);

  const myGoals = useMemo(
    () => (profile ? goals.filter((g) => g.userId === profile.id) : []),
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
    if (!isOpen) return;
    if (myGoals.length === 0) {
      setMode("new");
    } else if (!selectedGoalId || !myGoals.some((g) => g.id === selectedGoalId)) {
      setSelectedGoalId(myGoals[0].id);
      setMode((m) => (m === "new" && myGoals.length === 0 ? "new" : "deposit"));
    }
  }, [isOpen, myGoals, selectedGoalId]);

  if (!profile) return null;

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

  return (
    <CozySheet
      open={isOpen}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setNotice(null);
          setConfirmDeleteId(null);
        }
      }}
      title="Catat Tabungan"
      description={
        isKid
          ? "Masukkan koin ke celengan kacamu. Menabung itu keren!"
          : "Setor ke celengan impian. Tabungan tidak dihitung sebagai pengeluaran."
      }
      icon={<CozyIcon name="cat_saving" size={30} className="shrink-0" />}
      maxWidthClass="md:max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
        {/* Kiri: celengan kaca */}
        <div className="flex flex-col items-center gap-3 min-w-0">
          <div className="relative w-full max-w-[260px]">
            <PiggyVaultIllustration
              progressPercent={goal ? pct : 0}
              isShaking={shaking}
              className="w-full h-auto"
            />
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

          {goal ? (
            <div className="w-full space-y-1.5">
              <p className="font-display text-base font-extrabold text-[#3D352E] text-center break-words">
                {goal.name}
              </p>
              <ChunkyProgressBar value={goal.savedAmount} max={goal.targetAmount} variant={pct >= 100 ? "matcha" : "honey"} size="lg" />
              <p className="text-center text-xs font-display font-extrabold tabular-nums text-[#3D352E]">
                {formatRupiah(goal.savedAmount)} / {formatRupiah(goal.targetAmount)} ({pct}%)
              </p>
              <p className="text-center text-xs font-bold text-[#7A6E65]">
                {pct >= 100
                  ? "Impian tercapai! Hebat sekali!"
                  : `Tinggal ${formatRupiah(remaining)} lagi.`}
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold text-[#7A6E65] text-center">
              Buat impian pertamamu dulu supaya celengan mulai terisi.
            </p>
          )}
        </div>

        {/* Kanan: pilih impian / setor / buat baru */}
        <div className="space-y-4 min-w-0">
          {myGoals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-display font-extrabold uppercase text-[#3D352E]">
                Impian tabunganmu
              </p>
              <ul className="flex gap-2 overflow-x-auto pt-0.5 pb-1.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>li]:shrink-0">
                {myGoals.map((g) => {
                  const active = g.id === selectedGoalId && mode === "deposit";
                  const done = g.savedAmount >= g.targetAmount;
                  return (
                    <li key={g.id} className="relative">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          soundEffects.tactileClick();
                          setSelectedGoalId(g.id);
                          setMode("deposit");
                          setNotice(null);
                        }}
                        className={cn(
                          "px-3 py-2 rounded-2xl border-2 border-b-[3px] text-xs font-display font-extrabold cursor-pointer max-w-[12rem] truncate",
                          "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
                          active
                            ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[#F5C84C] text-[#4A3500]"
                            : "bg-white border-[#E6DFD2] border-b-[#D4C9B4] text-[#3D352E] hover:bg-[#FFFBEB]"
                        )}
                      >
                        {done && <GlyphInline name="check_circle" className="mr-1" />}
                        {g.name}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setMode("new");
                      setNotice(null);
                    }}
                    className="px-3 py-2 rounded-2xl border-2 border-dashed border-[#9AD2FF] bg-[#EEF8FF] text-xs font-display font-extrabold text-[#1565C0] cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Impian baru
                  </button>
                </li>
              </ul>
            </div>
          )}

          {mode === "new" || myGoals.length === 0 ? (
            <form onSubmit={handleCreate} className="space-y-3 p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2]">
              <p className="font-display text-sm font-extrabold text-[#3D352E] flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#1565C0]" aria-hidden="true" /> Buat impian tabungan
              </p>
              <div>
                <label htmlFor="goal-name" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white focus:border-[#38B6FF] focus:outline-none font-display font-extrabold text-sm"
                />
              </div>
              <div>
                <label htmlFor="goal-target" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
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
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white focus:border-[#38B6FF] focus:outline-none font-display font-extrabold tabular-nums text-sm"
                />
              </div>
              <fieldset>
                <legend className="text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
                  Kategori
                </legend>
                <ChipScroller label="Kategori impian" watch={category}>
                  {GOAL_CATEGORIES.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      aria-pressed={category === c.name}
                      onClick={() => setCategory(c.name)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl border-2 text-[11px] font-display font-extrabold cursor-pointer",
                        category === c.name
                          ? "bg-[#E3F4FF] border-[#38B6FF] text-[#1565C0]"
                          : "bg-white border-[#E6DFD2] text-[#3D352E]"
                      )}
                    >
                      <GlyphInline name={c.icon} className="mr-1" /> {c.name}
                    </button>
                  ))}
                </ChipScroller>
              </fieldset>
              <TactileButton type="submit" variant="sky" size="md" fullWidth>
                <Plus className="w-4 h-4" aria-hidden="true" /> Simpan Impian
              </TactileButton>
            </form>
          ) : (
            goal && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="deposit-amount" className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1">
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
                    className="w-full px-3.5 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-white focus:border-[#38B6FF] focus:outline-none font-display text-xl font-extrabold tabular-nums"
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

                <TactileButton
                  variant="honey"
                  size="lg"
                  fullWidth
                  disabled={!(Number(amountDigits) > 0)}
                  onClick={handleDeposit}
                >
                  <CozyIcon name="coin_rupiah" size={22} />
                  Masukkan ke Celengan
                  {Number(amountDigits) > 0 ? ` (${formatRupiah(Number(amountDigits))})` : ""}
                </TactileButton>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-[#7A6E65]">
                    Menabung = kebiasaan baik. Tidak dihitung boros ya!
                  </p>
                  {confirmDeleteId === goal.id ? (
                    <span className="inline-flex items-center gap-1.5 shrink-0">
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
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-display font-extrabold cursor-pointer"
                      >
                        Batal
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Hapus impian ${goal.name}`}
                      onClick={() => setConfirmDeleteId(goal.id)}
                      className="p-1.5 rounded-lg text-[#7A6E65] hover:text-[#C83E2B] hover:bg-[#FFF2F0] cursor-pointer shrink-0"
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
                notice.ok
                  ? "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                  : "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]"
              )}
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>
    </CozySheet>
  );
}

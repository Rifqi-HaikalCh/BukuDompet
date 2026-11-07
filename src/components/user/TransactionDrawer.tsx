"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  parseSmartQuickSplit,
  validateItemizedCombo,
} from "@/lib/spending-detective";
import { CozyIcon, CategoryIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export function TransactionDrawer() {
  const {
    isTransactionDrawerOpen,
    setTransactionDrawerOpen,
    addTransaction,
    recordZeroSpendDay,
  } = useBukuDompetStore();

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [inputMode, setInputMode] = useState<"quick" | "detailed">("detailed");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].name);
  const [title, setTitle] = useState<string>("");
  const [quickAmount, setQuickAmount] = useState<string>("");
  const [confirmZeroSpendOpen, setConfirmZeroSpendOpen] =
    useState<boolean>(false);

  // Smart Quick-Split Bar
  const [smartSplitInput, setSmartSplitInput] = useState<string>("");

  // Itemized rows
  const [items, setItems] = useState<
    { item_name: string; quantity: number; unit_price: number }[]
  >([
    { item_name: "Nasi Goreng Spesial", quantity: 1, unit_price: 15000 },
    { item_name: "Es Teh Manis", quantity: 1, unit_price: 5000 },
  ]);

  const handleApplySmartSplit = (rawText: string) => {
    setSmartSplitInput(rawText);
    const parsed = parseSmartQuickSplit(rawText);
    if (parsed.length > 0) {
      setItems(
        parsed.map((p) => ({
          item_name: p.item_name,
          quantity: p.quantity,
          unit_price: p.unit_price,
        }))
      );
      if (!title.trim()) {
        setTitle(parsed.map((p) => p.item_name).slice(0, 2).join(" & "));
      }
      soundEffects.comboStepNote(parsed.length);
    }
  };

  const itemizedTotal = useMemo(() => {
    return items.reduce(
      (sum, it) =>
        sum + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
      0
    );
  }, [items]);

  const comboStatus = useMemo(() => {
    if (inputMode === "quick" || txType === "income") {
      return {
        isValidCombo: false,
        validItemsCount: 0,
        pointsPreview: 10,
        xpPreview: 15,
      };
    }
    return validateItemizedCombo(items);
  }, [items, inputMode, txType]);

  // Play ascending combo note when validItemsCount increases
  const prevValidCountRef = useRef<number>(comboStatus.validItemsCount);
  useEffect(() => {
    if (comboStatus.validItemsCount > prevValidCountRef.current) {
      soundEffects.comboStepNote(comboStatus.validItemsCount);
    }
    prevValidCountRef.current = comboStatus.validItemsCount;
  }, [comboStatus.validItemsCount]);

  const handleAddRow = () => {
    soundEffects.tactileClick();
    setItems((prev) => [
      ...prev,
      { item_name: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    soundEffects.tactileClick();
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (
    idx: number,
    field: "item_name" | "quantity" | "unit_price",
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalAmount =
      inputMode === "detailed" && txType === "expense"
        ? itemizedTotal
        : Number(quickAmount.replace(/\D/g, "")) || 0;

    if (finalAmount <= 0) return;

    const selectedExpCat = EXPENSE_CATEGORIES.find((c) => c.name === category);
    const needOrWant =
      txType === "income" ? "income" : selectedExpCat?.group || "want";

    const finalTitle =
      title.trim() ||
      (inputMode === "detailed" && items.length > 0
        ? items
            .filter((i) => i.item_name.trim())
            .map((i) => i.item_name.trim())
            .slice(0, 2)
            .join(" & ")
        : category);

    const result = addTransaction({
      type: txType,
      category,
      need_or_want: needOrWant,
      title: finalTitle,
      total_amount: finalAmount,
      items:
        inputMode === "detailed" && txType === "expense" ? items : undefined,
    });

    if (result.isCombo) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.coinChime();
      fireCozyConfetti("normal");
    }

    setTitle("");
    setQuickAmount("");
    setSmartSplitInput("");
    setTransactionDrawerOpen(false);
  };

  const executeZeroSpend = () => {
    recordZeroSpendDay();
    soundEffects.comboFanfare();
    fireCozyConfetti("combo");
    setTransactionDrawerOpen(false);
  };

  const comboTierLabel =
    comboStatus.validItemsCount >= 4
      ? "SUPER COMBO +50 Poin!"
      : comboStatus.validItemsCount >= 2
      ? "COMBO RINCI AKTIF! +" + comboStatus.pointsPreview + " Poin"
      : `Rincian ${comboStatus.validItemsCount}/2 menuju Combo!`;

  return (
    <>
      <CozyConfirmModal
        open={confirmZeroSpendOpen}
        onClose={() => setConfirmZeroSpendOpen(false)}
        onConfirm={executeZeroSpend}
        title="Hari Ini Nggak Jajan (Rp0 Spend)?"
        description="Mochi akan mencatat bahwa hari ini kamu berhasil puasa jajan! Api Streak harianmu tetap menyala + kamu mendapat hadiah +25 Poin & +30 XP!"
        confirmLabel="Ya, Klaim Rp0 Hari Ini!"
        confirmVariant="matcha"
        mochiMood="proud_combo"
        badgeText="Master Puasa Jajan"
      />

      <Drawer.Root
        open={isTransactionDrawerOpen}
        onOpenChange={setTransactionDrawerOpen}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/45 z-50 backdrop-blur-[2px]" />
          <Drawer.Content className="bg-[#FFFDF9] border-t-4 border-[#E6DFD2] rounded-t-[36px] fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] flex flex-col focus:outline-none">
            <div className="mx-auto w-14 h-2 rounded-full bg-[#D4C9B4] my-3 shrink-0" />

            <div className="px-4 sm:px-6 pb-8 overflow-y-auto max-w-xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CozyIcon name="plus_record" size={34} />
                  <div>
                    <Drawer.Title className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E]">
                      Catat Jurnal Kas
                    </Drawer.Title>
                    <Drawer.Description className="text-xs sm:text-sm font-bold text-[#7A6E65]">
                      Setiap kejujuran mencatat menghasilkan Poin (1 Poin = Rp1)!
                    </Drawer.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransactionDrawerOpen(false)}
                  className="p-2.5 rounded-2xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] bg-[#F9F4EA] hover:bg-[#FFF2F0] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-[#3D352E]" />
                </button>
              </div>

              {/* Toggle Pengeluaran vs Pemasukan */}
              <div className="grid grid-cols-2 gap-2.5 bg-[#F6F0E4] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setTxType("expense");
                    setCategory(EXPENSE_CATEGORIES[0].name);
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl font-display text-sm sm:text-base font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2",
                    txType === "expense"
                      ? "bg-[#FF8B7B] text-[#3D352E] border-b-[4px] border-b-[#E06353]"
                      : "text-[#7A6E65] hover:text-[#3D352E]"
                  )}
                >
                  <CozyIcon name="cat_snack" size={22} />
                  <span>Pengeluaran</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.tactileClick();
                    setTxType("income");
                    setCategory(INCOME_CATEGORIES[0].name);
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl font-display text-sm sm:text-base font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2",
                    txType === "income"
                      ? "bg-[#58CC02] text-white border-b-[4px] border-b-[#46A302]"
                      : "text-[#7A6E65] hover:text-[#3D352E]"
                  )}
                >
                  <CozyIcon name="cat_income" size={22} />
                  <span>Pemasukan</span>
                </button>
              </div>

              {/* Zero Spend Quick Action */}
              {txType === "expense" && (
                <div className="bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <CozyIcon name="zero_spend" size={32} />
                    <div className="text-xs font-bold text-[#3D352E]">
                      <p className="font-display font-extrabold text-sm">
                        Hari ini hemat & nggak jajan?
                      </p>
                      <p className="text-[#7A6E65]">
                        Jaga api Streak tetap menyala + dapat 25 Poin!
                      </p>
                    </div>
                  </div>
                  <TactileButton
                    variant="matcha"
                    size="sm"
                    onClick={() => setConfirmZeroSpendOpen(true)}
                    className="shrink-0"
                  >
                    <CozyIcon name="zero_spend" size={18} />
                    Hari Ini Rp0 Pengeluaran!
                  </TactileButton>
                </div>
              )}

              {/* Mode Switcher: Catat Kilat vs Misi Rinci */}
              {txType === "expense" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setInputMode("quick");
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl text-left transition-all cursor-pointer border-2",
                      inputMode === "quick"
                        ? "bg-white border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4]"
                        : "bg-[#F6F0E4] border-[#E6DFD2] opacity-75"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-extrabold flex items-center gap-1.5">
                        <CozyIcon name="xp_star" size={18} />
                        Catat Kilat
                      </span>
                      <span className="text-[11px] font-display font-extrabold px-2 py-0.5 rounded-lg bg-[#F6F0E4]">
                        +10 Poin
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[#7A6E65] mt-1">
                      Langsung tulis total pengeluaran.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setInputMode("detailed");
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl text-left transition-all cursor-pointer border-2",
                      inputMode === "detailed"
                        ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[5px] border-b-[#F5C84C]"
                        : "bg-[#F6F0E4] border-[#E6DFD2] opacity-75"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-extrabold text-[#3D352E] flex items-center gap-1.5">
                        <CozyIcon name="combo_sparkle" size={18} animated />
                        Misi Rinci
                      </span>
                      <span className="text-[11px] font-display font-extrabold px-2 py-0.5 rounded-lg bg-[#FFC800]">
                        +35~50 Poin!
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[#7A6E65] mt-1">
                      Rinci minimal 2 item untuk Combo!
                    </p>
                  </button>
                </div>
              )}

              {/* Interactive Combo Meter Bar in Detailed Mode */}
              {txType === "expense" && inputMode === "detailed" && (
                <motion.div
                  key={comboStatus.validItemsCount}
                  animate={
                    comboStatus.isValidCombo
                      ? { scale: [1, 1.02, 1], x: [0, -2, 2, 0] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 space-y-2 transition-colors",
                    comboStatus.validItemsCount >= 4
                      ? "bg-[#F8F0FF] border-[#E2C6FF] border-b-[4px] border-b-[#C99BFF]"
                      : comboStatus.isValidCombo
                      ? "bg-[#FFFBEB] border-[#FDE08D] border-b-[4px] border-b-[#F5C84C]"
                      : "bg-[#F9F4EA] border-[#E6DFD2]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs sm:text-sm font-extrabold text-[#3D352E] flex items-center gap-1.5">
                      <CozyIcon
                        name="combo_sparkle"
                        size={20}
                        animated={comboStatus.isValidCombo}
                      />
                      {comboTierLabel}
                    </span>
                    <span className="font-display font-extrabold tabular-nums text-xs px-2.5 py-0.5 rounded-xl bg-white border border-[#E6DFD2]">
                      +{comboStatus.pointsPreview} Poin • +
                      {comboStatus.xpPreview} XP
                    </span>
                  </div>
                  <ChunkyProgressBar
                    value={Math.min(4, comboStatus.validItemsCount)}
                    max={4}
                    variant={
                      comboStatus.validItemsCount >= 4
                        ? "taro"
                        : comboStatus.isValidCombo
                        ? "honey"
                        : "sky"
                    }
                  />
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Picker with CozyIcons */}
                <div>
                  <label className="block text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65] mb-2">
                    Pilih Kategori{" "}
                    {txType === "expense" ? "(Butuh vs Ingin)" : ""}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(txType === "expense"
                      ? EXPENSE_CATEGORIES
                      : INCOME_CATEGORIES
                    ).map((cat) => {
                      const isSelected = category === cat.name;
                      const isNeed =
                        "group" in cat ? cat.group === "need" : true;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => {
                            soundEffects.tactileClick();
                            setCategory(cat.name);
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-2xl text-xs font-display font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                            isSelected
                              ? isNeed
                                ? "bg-[#58CC02] text-white border-b-[4px] border-b-[#46A302] -translate-y-0.5"
                                : "bg-[#FF8B7B] text-[#3D352E] border-b-[4px] border-b-[#E06353] -translate-y-0.5"
                              : "bg-white text-[#3D352E] border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] hover:bg-[#F9F4EA]"
                          )}
                        >
                          <CategoryIcon category={cat.name} size={20} />
                          <span>{cat.name}</span>
                          {"group" in cat && (
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-lg",
                                cat.group === "need"
                                  ? "bg-[#EFFBE6] text-[#3D352E]"
                                  : "bg-[#FFF2F0] text-[#3D352E]"
                              )}
                            >
                              {cat.group === "need" ? "Butuh" : "Ingin"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Judul / Catatan Singkat */}
                <div>
                  <label className="block text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                    Judul Catatan
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      txType === "expense"
                        ? "Contoh: Makan Siang Kampus / Beli Alat Tulis"
                        : "Contoh: Tambahan Uang Saku Mingguan"
                    }
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white font-bold text-sm focus:outline-none focus:border-[#FFC800]"
                  />
                </div>

                {/* Detailed Itemized Mode vs Quick Mode */}
                {txType === "expense" && inputMode === "detailed" ? (
                  <div className="space-y-3">
                    {/* Smart Quick-Split Bar */}
                    <CozyCard tone="vanilla" className="p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-display font-extrabold text-[#3D352E] flex items-center gap-1.5">
                          <CozyIcon name="combo_sparkle" size={18} />
                          Smart Quick-Split Bar (Ketik Sekaligus, Pecah Otomatis!)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={smartSplitInput}
                        onChange={(e) => handleApplySmartSplit(e.target.value)}
                        placeholder="Ketik: Nasi Goreng 15k, Es Teh 5000, Kerupuk 3rb"
                        className="w-full px-3.5 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[11px] font-bold text-[#7A6E65]">
                          Contoh klik cepat:
                        </span>
                        {[
                          "Nasi Goreng 15k, Es Teh 5k",
                          "Nasi Ayam Bakar 18k, Air Mineral 5k, Kerupuk 3k",
                          "Pulpen Gel 8k, Buku Catatan 15k, Map Plastik 4k, Penggaris 5k",
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleApplySmartSplit(preset)}
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] hover:bg-[#FFC800] cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </CozyCard>

                    {/* Dynamic Item Rows */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                          Rincian Item Belanja ({items.length} Item)
                        </label>
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="text-xs font-display font-extrabold text-[#3D352E] bg-[#EFFBE6] px-3 py-1 rounded-xl border-2 border-[#C3EFA4] border-b-[3px] border-b-[#9EE070] inline-flex items-center gap-1 hover:bg-[#58CC02] hover:text-white transition-colors cursor-pointer"
                        >
                          <CozyIcon name="plus_record" size={16} /> Tambah Baris
                        </button>
                      </div>

                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-white p-2 rounded-2xl border-2 border-[#E6DFD2]"
                        >
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) =>
                              handleItemChange(idx, "item_name", e.target.value)
                            }
                            placeholder={`Nama Item #${idx + 1} (min. 4 huruf)`}
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-[#F9F4EA] text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs font-display font-extrabold text-[#7A6E65]">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={item.unit_price || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "unit_price",
                                  Number(e.target.value)
                                )
                              }
                              placeholder="15000"
                              className="w-24 px-2.5 py-1.5 rounded-xl bg-[#F9F4EA] font-display font-extrabold tabular-nums text-xs sm:text-sm text-[#3D352E] focus:outline-none"
                            />
                          </div>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1.5 rounded-xl bg-[#FFF2F0] text-[#EA2B2B] border border-[#FFCDC6] hover:bg-[#FF4B4B] hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F9F4EA] border-2 border-[#E6DFD2]">
                        <span className="text-xs font-extrabold text-[#7A6E65]">
                          Total Otomatis Rincian:
                        </span>
                        <span className="font-display font-extrabold tabular-nums text-base text-[#3D352E]">
                          {formatRupiah(itemizedTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-display font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                      Nominal Total (Rupiah)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-extrabold text-[#7A6E65]">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                        placeholder="20000"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-white font-display font-extrabold tabular-nums text-lg text-[#3D352E] focus:outline-none focus:border-[#FFC800]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[10000, 15000, 25000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            soundEffects.tactileClick();
                            setQuickAmount(String(amt));
                          }}
                          className="px-3 py-1 rounded-xl border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] bg-[#F9F4EA] hover:bg-[#FFFBEB] font-display font-extrabold tabular-nums text-xs cursor-pointer"
                        >
                          {formatRupiah(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <TactileButton
                  type="submit"
                  variant="matcha"
                  size="lg"
                  fullWidth
                >
                  <CozyIcon name="check_badge" size={22} />
                  Simpan Catatan & Klaim +{comboStatus.pointsPreview} Poin!
                </TactileButton>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

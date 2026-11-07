"use client";

import React, { useState, useMemo } from "react";
import { Drawer } from "vaul";
import {
  Plus,
  Trash2,
  Sparkles,
  Wand2,
  ShieldCheck,
  Coins,
  Zap,
  X,
} from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  parseSmartQuickSplit,
  validateItemizedCombo,
} from "@/lib/spending-detective";
import {
  TactileButton,
  CozyCard,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
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
      soundEffects.tactileClick();
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

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      { item_name: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
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
      txType === "income"
        ? "income"
        : selectedExpCat?.group || "want";

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

    // Reset form & close
    setTitle("");
    setQuickAmount("");
    setSmartSplitInput("");
    setTransactionDrawerOpen(false);
  };

  const handleZeroSpend = () => {
    recordZeroSpendDay();
    soundEffects.comboFanfare();
    fireCozyConfetti("combo");
    setTransactionDrawerOpen(false);
  };

  return (
    <Drawer.Root
      open={isTransactionDrawerOpen}
      onOpenChange={setTransactionDrawerOpen}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/50 z-50 backdrop-blur-[2px]" />
        <Drawer.Content className="bg-[#FFFDF7] border-t-4 border-[#3D352E] rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] flex flex-col focus:outline-none">
          <div className="mx-auto w-14 h-2 rounded-full bg-[#3D352E]/25 my-3 shrink-0" />

          <div className="px-4 sm:px-6 pb-8 overflow-y-auto max-w-xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Drawer.Title className="font-fredoka text-xl sm:text-2xl font-bold text-[#3D352E]">
                  Catat Jurnal Kas ✍️
                </Drawer.Title>
                <Drawer.Description className="text-xs sm:text-sm font-bold text-[#7A6E65]">
                  Setiap kejujuran mencatat menghasilkan Poin (1 Poin = Rp1)!
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={() => setTransactionDrawerOpen(false)}
                className="p-2 rounded-2xl border-2 border-[#3D352E] bg-[#F7F2E7] hover:bg-[#FFE8E5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-[#3D352E]" />
              </button>
            </div>

            {/* Toggle Pengeluaran vs Pemasukan */}
            <div className="grid grid-cols-2 gap-2.5 bg-[#F7F2E7] p-1.5 rounded-2xl border-2 border-[#3D352E]">
              <button
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  setTxType("expense");
                  setCategory(EXPENSE_CATEGORIES[0].name);
                }}
                className={cn(
                  "py-2.5 px-3 rounded-xl font-fredoka text-sm sm:text-base font-bold transition-all cursor-pointer",
                  txType === "expense"
                    ? "bg-[#FF8B7B] text-[#3D352E] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E]"
                    : "text-[#7A6E65] hover:text-[#3D352E]"
                )}
              >
                Pengeluaran 💸
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  setTxType("income");
                  setCategory(INCOME_CATEGORIES[0].name);
                }}
                className={cn(
                  "py-2.5 px-3 rounded-xl font-fredoka text-sm sm:text-base font-bold transition-all cursor-pointer",
                  txType === "income"
                    ? "bg-[#58CC02] text-white border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E]"
                    : "text-[#7A6E65] hover:text-[#3D352E]"
                )}
              >
                Pemasukan 💰
              </button>
            </div>

            {/* Zero Spend Quick Action */}
            {txType === "expense" && (
              <div className="bg-[#E5F9D7] border-2 border-[#3D352E] rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-[#46A302] shrink-0" />
                  <div className="text-xs font-bold text-[#3D352E]">
                    <p className="font-extrabold">Hari ini hemat & nggak jajan?</p>
                    <p className="text-[#7A6E65]">
                      Jaga api Streak tetap menyala + dapat 25 Poin!
                    </p>
                  </div>
                </div>
                <TactileButton
                  variant="matcha"
                  size="sm"
                  onClick={handleZeroSpend}
                  className="shrink-0"
                >
                  Hari Ini Rp0 Pengeluaran! 🛡️
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
                    "p-3 rounded-2xl border-2 border-[#3D352E] text-left transition-all cursor-pointer",
                    inputMode === "quick"
                      ? "bg-[#FFFFFF] shadow-[0_4px_0_0_#3D352E]"
                      : "bg-[#F7F2E7] opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-fredoka text-sm font-bold">
                      ⚡ Catat Kilat
                    </span>
                    <span className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded-lg bg-[#F7F2E7] border border-[#3D352E]">
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
                    "p-3 rounded-2xl border-2 border-[#3D352E] text-left transition-all cursor-pointer",
                    inputMode === "detailed"
                      ? "bg-[#FFF7D6] shadow-[0_4px_0_0_#3D352E]"
                      : "bg-[#F7F2E7] opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-fredoka text-sm font-bold text-[#3D352E]">
                      ✨ Misi Rinci
                    </span>
                    <span className="text-[11px] font-mono-num font-extrabold px-2 py-0.5 rounded-lg bg-[#FFC800] border border-[#3D352E]">
                      +35 Poin!
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#7A6E65] mt-1">
                    Rinci minimal 2 item untuk Combo!
                  </p>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A6E65] mb-2">
                  Pilih Kategori {txType === "expense" ? "(Butuh vs Ingin)" : ""}
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
                          "px-3 py-1.5 rounded-xl border-2 border-[#3D352E] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                          isSelected
                            ? isNeed
                              ? "bg-[#58CC02] text-white shadow-[0_3px_0_0_#3D352E] -translate-y-0.5"
                              : "bg-[#FF8B7B] text-[#3D352E] shadow-[0_3px_0_0_#3D352E] -translate-y-0.5"
                            : "bg-white text-[#3D352E] hover:bg-[#F7F2E7]"
                        )}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                        {"group" in cat && (
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded-md border border-[#3D352E]",
                              cat.group === "need"
                                ? "bg-[#E5F9D7] text-[#3D352E]"
                                : "bg-[#FFE8E5] text-[#3D352E]"
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
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
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
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#3D352E] bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC800]"
                />
              </div>

              {/* Detailed Itemized Mode vs Quick Mode */}
              {txType === "expense" && inputMode === "detailed" ? (
                <div className="space-y-3">
                  {/* Smart Quick-Split Bar */}
                  <CozyCard tone="vanilla" shadowType="warm" className="p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold text-[#3D352E] flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4 text-[#A552DB]" />
                        Smart Quick-Split Bar (Ketik Sekaligus, Pecah Otomatis!)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={smartSplitInput}
                      onChange={(e) => handleApplySmartSplit(e.target.value)}
                      placeholder="Ketik: Nasi Goreng 15k, Es Teh 5000, Kerupuk 3rb"
                      className="w-full px-3.5 py-2 rounded-xl border-2 border-[#3D352E] bg-white text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[11px] font-bold text-[#7A6E65]">
                        Contoh klik cepat:
                      </span>
                      {[
                        "Nasi Goreng 15k, Es Teh 5k",
                        "Nasi Ayam Bakar 18k, Air Mineral 5k, Kerupuk 3k",
                        "Pulpen Gel 8k, Buku Catatan 15k",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleApplySmartSplit(preset)}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF7D6] border border-[#3D352E] hover:bg-[#FFC800] cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </CozyCard>

                  {/* Dynamic Item Rows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-[#7A6E65]">
                        Rincian Item Belanja ({items.length} Item)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="text-xs font-extrabold text-[#3D352E] bg-[#E5F9D7] px-2.5 py-1 rounded-xl border-2 border-[#3D352E] inline-flex items-center gap-1 hover:bg-[#58CC02] hover:text-white transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Baris
                      </button>
                    </div>

                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-white p-2 rounded-2xl border-2 border-[#3D352E]"
                      >
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) =>
                            handleItemChange(idx, "item_name", e.target.value)
                          }
                          placeholder={`Nama Item #${idx + 1} (min. 4 huruf)`}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-[#F7F2E7] text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-mono-num font-bold text-[#7A6E65]">
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
                            className="w-24 px-2.5 py-1.5 rounded-xl bg-[#F7F2E7] font-mono-num text-xs sm:text-sm font-bold text-[#3D352E] focus:outline-none"
                          />
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1.5 rounded-xl bg-[#FFE8E5] text-[#EA2B2B] border border-[#3D352E] hover:bg-[#FF4B4B] hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#F7F2E7] border-2 border-[#3D352E]">
                      <span className="text-xs font-extrabold text-[#7A6E65]">
                        Total Otomatis Rincian:
                      </span>
                      <span className="font-mono-num text-base font-extrabold text-[#3D352E]">
                        {formatRupiah(itemizedTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A6E65] mb-1.5">
                    Nominal Total (Rupiah)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono-num font-extrabold text-[#7A6E65]">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={quickAmount}
                      onChange={(e) => setQuickAmount(e.target.value)}
                      placeholder="20000"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#3D352E] bg-white font-mono-num text-lg font-extrabold text-[#3D352E] focus:outline-none focus:ring-2 focus:ring-[#FFC800]"
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
                        className="px-2.5 py-1 rounded-xl border-2 border-[#3D352E] bg-[#F7F2E7] hover:bg-[#FFF7D6] font-mono-num text-xs font-bold cursor-pointer"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Point Preview Banner */}
              <div
                className={cn(
                  "p-3.5 rounded-2xl border-2 border-[#3D352E] flex items-center justify-between gap-3",
                  comboStatus.isValidCombo ? "bg-[#FFF7D6]" : "bg-[#E0F4FF]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-6 h-6 text-[#E5A400] shrink-0" />
                  <div className="text-xs font-bold">
                    {comboStatus.isValidCombo ? (
                      <>
                        <p className="font-fredoka text-sm font-bold text-[#3D352E]">
                          ✨ Rincian terdeteksi! COMBO DETAIL Aktif!
                        </p>
                        <p className="text-[#7A6E65]">
                          Kamu akan mendapat{" "}
                          <strong className="text-[#3D352E]">
                            +{comboStatus.pointsPreview} Poin (Rp
                            {comboStatus.pointsPreview})
                          </strong>{" "}
                          &{" "}
                          <strong className="text-[#3D352E]">
                            +{comboStatus.xpPreview} XP
                          </strong>
                          !
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-fredoka text-sm font-bold text-[#3D352E]">
                          Hadiah Catatan Kas: +10 Poin (Rp10) & +15 XP
                        </p>
                        <p className="text-[#7A6E65]">
                          {comboStatus.reason ||
                            "Gunakan Misi Rinci (>= 2 item) untuk +35 Poin!"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-[#FFC800] border-2 border-[#3D352E] font-mono-num text-xs font-extrabold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />+
                    {comboStatus.pointsPreview}
                  </span>
                  <span className="px-2 py-1 rounded-xl bg-[#38B6FF] text-white border-2 border-[#3D352E] font-mono-num text-xs font-extrabold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />+{comboStatus.xpPreview}
                  </span>
                </div>
              </div>

              <TactileButton
                type="submit"
                variant="matcha"
                size="lg"
                fullWidth
              >
                Simpan Catatan & Klaim Poin! 🚀
              </TactileButton>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

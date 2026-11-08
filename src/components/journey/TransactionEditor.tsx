"use client";

/**
 * Edit & hapus catatan kas HARI INI (Versi 5.4), dengan dua lapis pengaman agar tidak terjadi tanpa sengaja:
 *  - Edit: lembar form -> "Simpan Perubahan" -> modal konfirmasi yang memperlihatkan nilai sebelum -> sesudah.
 *  - Hapus: modal konfirmasi yang menyebut judul + nominal dan bahwa tindakan ini tidak bisa dibatalkan.
 * Catatan hari sebelumnya, tabungan Celengan, dan pemasukan hasil pencairan Poin dikunci.
 * Poin & XP yang sudah didapat tidak berubah, dan kuota 3 transaksi berpoin per hari tetap terhitung.
 */
import React, { useRef, useState } from "react";
import { GlyphIcon } from "@/components/illustrations/GlyphIcons";
import { CategoryIcon } from "@/components/illustrations/CozyIcons";
import { CozySheet } from "@/components/ui/CozySheet";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionRecord } from "@/lib/spending-detective";
import { TX_TITLE_MAX, transactionLockReason } from "@/lib/transaction-rules";
import { localDateStr } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export function TransactionActions({ tx }: { tx: TransactionRecord }) {
  const activeProfileId = useBukuDompetStore((s) => s.activeProfileId);
  const updateTransaction = useBukuDompetStore((s) => s.updateTransaction);
  const removeTransaction = useBukuDompetStore((s) => s.removeTransaction);

  const [editOpen, setEditOpen] = useState<boolean>(false);
  const savedRef = useRef<boolean>(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(tx.title);
  const [category, setCategory] = useState<string>(tx.category);
  const [amount, setAmount] = useState<string>(String(tx.total_amount));

  const lock = transactionLockReason(tx, activeProfileId, localDateStr());
  // Hanya tampilkan penanda terkunci untuk catatan milik sendiri yang sudah lewat hari.
  if (lock) {
    if (tx.user_id !== activeProfileId || tx.type === "saving") return null;
    return (
      <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#7A6E65]" title={lock}>
        <GlyphIcon name="lock" size={12} /> {tx.id.startsWith("tx-cashout-") ? "Otomatis" : "Terkunci"}
      </p>
    );
  }

  const categories = tx.type === "expense" ? EXPENSE_CATEGORIES.map((c) => c.name) : INCOME_CATEGORIES.map((c) => c.name);
  const amountNum = Number(amount);
  const amountOk = tx.is_itemized || (Number.isFinite(amountNum) && amountNum > 0);
  const titleOk = title.trim().length > 0;
  const changed = title.trim() !== tx.title || category !== tx.category || (!tx.is_itemized && Math.round(amountNum) !== tx.total_amount);

  const openEdit = () => {
    soundEffects.tactileClick();
    setTitle(tx.title);
    setCategory(tx.category);
    setAmount(String(tx.total_amount));
    setEditOpen(true);
  };

  const doSave = () => {
    const res = updateTransaction(tx.id, { title, category, total_amount: tx.is_itemized ? undefined : amountNum });
    if (res.success) {
      notify.success("Catatan diperbarui", `${title.trim()} • ${formatRupiah(tx.is_itemized ? tx.total_amount : Math.round(amountNum))}`);
      savedRef.current = true;
      setEditOpen(false);
    } else {
      notify.warn("Belum bisa disimpan", res.message);
    }
  };

  const doDelete = () => {
    const res = removeTransaction(tx.id);
    if (res.success) notify.success("Catatan dihapus", `${tx.title} sudah dihapus dari hari ini.`);
    else notify.warn("Belum bisa dihapus", res.message);
  };

  const diffLines: string[] = [];
  if (title.trim() !== tx.title) diffLines.push(`Judul: ${tx.title} → ${title.trim()}`);
  if (category !== tx.category) diffLines.push(`Kategori: ${tx.category} → ${category}`);
  if (!tx.is_itemized && Math.round(amountNum) !== tx.total_amount) diffLines.push(`Nominal: ${formatRupiah(tx.total_amount)} → ${formatRupiah(Math.round(amountNum) || 0)}`);

  return (
    <>
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F3EB] border-2 border-[#E6DFD2] border-b-[3px] border-b-[#D4C9B4] active:border-b-[1px] active:translate-y-[2px] font-display text-xs font-extrabold text-[#3D352E] cursor-pointer"
        >
          <GlyphIcon name="pencil" size={13} /> Edit
        </button>
        <button
          type="button"
          onClick={() => {
            soundEffects.tactileClick();
            setConfirmDeleteOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-[#FFCDC6] border-b-[3px] border-b-[#F2A99E] active:border-b-[1px] active:translate-y-[2px] font-display text-xs font-extrabold text-[#C83E2B] cursor-pointer"
        >
          <GlyphIcon name="trash" size={13} /> Hapus
        </button>
        <span className="text-[11px] font-bold text-[#7A6E65]">Bisa diubah sampai hari ini berakhir</span>
      </div>

      <CozySheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Catatan Kas"
        description="Hanya catatan hari ini yang bisa diubah."
        icon={<GlyphIcon name="pencil" size={28} />}
        maxWidthClass="md:max-w-lg"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <TactileButton variant="cream" fullWidth onClick={() => setEditOpen(false)}>
              Batal
            </TactileButton>
            <TactileButton
              variant="matcha"
              fullWidth
              disabled={!titleOk || !amountOk || !changed}
              onClick={() => {
                // Tutup lembar dulu: lembar (drawer modal) mengunci klik di luar dirinya, jadi modal konfirmasi
                // di atasnya tidak akan bisa ditekan. Draf tetap tersimpan; "Batal" di konfirmasi kembali ke lembar.
                setEditOpen(false);
                setConfirmSaveOpen(true);
              }}
            >
              Simpan Perubahan
            </TactileButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor={`tx-title-${tx.id}`} className="block text-xs font-display font-extrabold text-[#3D352E] mb-1">
              Judul
            </label>
            <input
              id={`tx-title-${tx.id}`}
              type="text"
              value={title}
              maxLength={TX_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white text-sm font-bold text-[#3D352E] focus:border-[#38B6FF] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={`tx-amount-${tx.id}`} className="block text-xs font-display font-extrabold text-[#3D352E] mb-1">
              Nominal (Rp)
            </label>
            <input
              id={`tx-amount-${tx.id}`}
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              disabled={tx.is_itemized}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-white font-display text-base font-extrabold tabular-nums text-[#3D352E] focus:border-[#38B6FF] focus:outline-none disabled:bg-[#F7F3EB] disabled:text-[#7A6E65]"
            />
            {tx.is_itemized && (
              <p className="mt-1 text-[11px] font-bold text-[#7A6E65] leading-snug">
                Total catatan rinci dihitung dari sub-item struk, jadi nominalnya dikunci. Hapus lalu catat ulang bila ada sub-item yang salah.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-display font-extrabold text-[#3D352E] mb-1">Kategori</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilih kategori">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => {
                    soundEffects.tactileClick();
                    setCategory(c);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-display text-xs font-extrabold cursor-pointer",
                    category === c ? "bg-[#7ED957] border-[#46A302] text-[#173300]" : "bg-white border-[#E6DFD2] text-[#3D352E] hover:bg-[#FFFDF9]"
                  )}
                >
                  <CategoryIcon category={c} size={18} /> {c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-bold text-[#7A6E65] leading-relaxed rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] px-3 py-2">
            Poin dan XP yang sudah kamu dapat dari catatan ini tidak berubah.
          </p>
        </div>
      </CozySheet>

      <CozyConfirmModal
        open={confirmSaveOpen}
        onClose={() => {
          setConfirmSaveOpen(false);
          // Dibatalkan (atau gagal): kembali ke lembar edit dengan isian yang sama.
          if (!savedRef.current) setEditOpen(true);
          savedRef.current = false;
        }}
        onConfirm={doSave}
        title="Simpan perubahan catatan ini?"
        description={diffLines.length > 0 ? diffLines.join("  •  ") : "Tidak ada yang berubah."}
        confirmLabel="Ya, Simpan"
        confirmVariant="matcha"
        mochiMood="happy"
        badgeText="Setelah hari ini berakhir, catatan terkunci"
      />

      <CozyConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={doDelete}
        title="Hapus catatan ini?"
        description={`"${tx.title}" (${formatRupiah(tx.total_amount)}) akan dihapus dan tidak bisa dikembalikan. Poin dan XP yang sudah didapat tidak ditarik, tetapi kuota 3 catatan berpoin hari ini tetap terhitung.`}
        confirmLabel="Ya, Hapus"
        confirmVariant="berry"
        mochiMood="worried"
        badgeText="Tidak bisa dibatalkan"
      />
    </>
  );
}

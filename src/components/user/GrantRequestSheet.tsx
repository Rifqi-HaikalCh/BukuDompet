"use client";

/**
 * Hibah bertujuan — sisi anak: ajukan permintaan uang untuk keperluan tertentu (dengan rincian + foto rencana),
 * dan selesaikan hibah yang sudah cair dengan foto struk + pilihan sisa uang.
 */
import React, { useRef, useState } from "react";
import { CozySheet } from "@/components/ui/CozySheet";
import { TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { useFinanceStore } from "@/store/useFinanceStore";
import { CHAT_WEBP_OPTIONS, convertImageToWebp } from "@/lib/webp-converter";
import { GRANT_CATEGORIES, itemsTotal } from "@/lib/finance/grants";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { GrantRequest } from "@/lib/finance/types";

interface Row {
  label: string;
  amount: string;
}

function PhotoPicker({ value, onChange, label }: { value: string | undefined; onChange: (v: string | undefined) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-xs font-display font-extrabold text-[#7A6E65]">{label}</p>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setErr(null);
          try {
            const r = await convertImageToWebp(f, CHAT_WEBP_OPTIONS);
            onChange(r.dataUrl);
          } catch (x) {
            setErr((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Foto terpilih" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E6DFD2]" />
          <TactileButton type="button" variant="white" size="sm" onClick={() => onChange(undefined)}>
            Hapus foto
          </TactileButton>
        </div>
      ) : (
        <TactileButton type="button" variant="cream" size="md" disabled={busy} onClick={() => ref.current?.click()}>
          <GlyphInline name="image_plus" /> {busy ? "Memproses foto..." : "Pilih foto"}
        </TactileButton>
      )}
      {err && <p className="text-xs font-bold text-[#C83E2B]">{err}</p>}
    </div>
  );
}

export function GrantRequestSheet({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string }) {
  const submit = useFinanceStore((s) => s.submitGrant);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(GRANT_CATEGORIES[0]);
  const [rows, setRows] = useState<Row[]>([{ label: "", amount: "" }]);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const total = itemsTotal(rows.map((r) => ({ label: r.label, amount: toInt(r.amount) })));

  const reset = () => {
    setTitle("");
    setRows([{ label: "", amount: "" }]);
    setNote("");
    setPhoto(undefined);
    setError(null);
  };

  return (
    <CozySheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ajukan Kebutuhan Darurat"
      description="Untuk keperluan mendesak di luar uang bulanan. Supervisor yang memutuskan, dan uangnya tidak memotong anggaran bulananmu."
      icon={<GlyphInline name="gift" className="w-7 h-7" />}
      footer={
        <TactileButton
          type="button"
          variant="matcha"
          size="lg"
          fullWidth
          onClick={() => {
            const res = submit({
              userId,
              title,
              category,
              items: rows.map((r) => ({ label: r.label, amount: toInt(r.amount) })),
              note,
              proofPhoto: photo,
            });
            if (!res.success) {
              setError(res.message);
              return;
            }
            notify.success("Permintaan terkirim", res.message);
            reset();
            onOpenChange(false);
          }}
        >
          Kirim Permintaan ({formatRupiah(total)})
        </TactileButton>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Untuk apa?</span>
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Buku praktikum semester ini" className={FIELD_CLASS} />
        </label>
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Kategori</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD_CLASS}>
            {GRANT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-xs font-display font-extrabold text-[#7A6E65]">Rincian barang</p>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <input
                  value={r.label}
                  maxLength={60}
                  onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Nama barang"
                  aria-label={`Nama barang ${i + 1}`}
                  className={FIELD_CLASS}
                />
                <MoneyInput value={r.amount} onChange={(v) => setRows((p) => p.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
              </div>
              <button
                type="button"
                aria-label={`Hapus rincian ${i + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((p) => p.filter((_, j) => j !== i))}
                className="p-2.5 rounded-2xl border-2 border-[#E6DFD2] bg-[#F7F3EB] cursor-pointer disabled:opacity-40"
              >
                <GlyphInline name="trash" />
              </button>
            </div>
          ))}
          <TactileButton type="button" variant="white" size="sm" onClick={() => setRows((p) => [...p, { label: "", amount: "" }])}>
            <GlyphInline name="plus" /> Tambah rincian
          </TactileButton>
        </div>
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Catatan untuk Supervisor (opsional)</span>
          <textarea value={note} maxLength={300} rows={3} onChange={(e) => setNote(e.target.value)} className={cn(FIELD_CLASS, "resize-none")} />
        </label>
        <PhotoPicker label="Foto bukti / daftar harga (opsional)" value={photo} onChange={setPhoto} />
        {error && (
          <p role="alert" className="text-xs font-bold text-[#C83E2B]">
            {error}
          </p>
        )}
      </div>
    </CozySheet>
  );
}

export function GrantSettleSheet({ grant, spent, onOpenChange }: { grant: GrantRequest | null; spent: number; onOpenChange: (o: boolean) => void }) {
  const settle = useFinanceStore((s) => s.settleGrantRequest);
  const [photo, setPhoto] = useState<string | undefined>();
  const [action, setAction] = useState<"vault" | "return" | undefined>();
  const [error, setError] = useState<string | null>(null);
  const leftover = grant ? Math.max(0, (grant.approvedAmount ?? 0) - spent) : 0;
  return (
    <CozySheet
      open={Boolean(grant)}
      onOpenChange={onOpenChange}
      title="Selesaikan Pengajuan"
      description={grant ? `${grant.title} • disetujui ${formatRupiah(grant.approvedAmount ?? 0)}` : ""}
      footer={
        <TactileButton
          type="button"
          variant="matcha"
          size="lg"
          fullWidth
          onClick={() => {
            if (!grant) return;
            const res = settle(grant.id, { receiptPhoto: photo, leftoverAction: action });
            if (!res.success) {
              setError(res.message);
              return;
            }
            notify.success("Pengajuan selesai", res.message);
            setPhoto(undefined);
            setAction(undefined);
            setError(null);
            onOpenChange(false);
          }}
        >
          Selesaikan Pengajuan
        </TactileButton>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-bold text-[#3D352E] leading-relaxed">
          Terpakai {formatRupiah(spent)} dari {formatRupiah(grant?.approvedAmount ?? 0)}.{" "}
          {leftover > 0 ? `Sisa ${formatRupiah(leftover)}.` : "Pas tanpa sisa."}
        </p>
        <PhotoPicker label="Foto struk (wajib)" value={photo} onChange={setPhoto} />
        {leftover > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-display font-extrabold text-[#7A6E65]">Sisa uang dipakai untuk apa?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { id: "vault", label: "Masuk Brankas Tabungan", hint: "Jadi tabunganmu sendiri" },
                  { id: "return", label: "Kembalikan ke Supervisor", hint: "Uang dikembalikan" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={action === o.id}
                  onClick={() => setAction(o.id)}
                  className={cn(
                    "p-3 rounded-2xl border-2 text-left cursor-pointer",
                    action === o.id ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302]" : "bg-[#F7F3EB] border-[#E6DFD2]",
                  )}
                >
                  <span className="block font-display text-xs font-extrabold text-[#3D352E]">{o.label}</span>
                  <span className="block text-[11px] font-bold text-[#7A6E65]">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-xs font-bold text-[#C83E2B]">
            {error}
          </p>
        )}
      </div>
    </CozySheet>
  );
}

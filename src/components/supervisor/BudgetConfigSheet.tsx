"use client";

/**
 * Pengaturan anggaran anak (Versi 5.6) — hanya Supervisor. Admin hanya menetapkan nilai awal saat membuat akun.
 * Anggaran, tabungan wajib, tanggal mulai siklus, cara sisa uang dibagi, dan kapan perubahan berlaku.
 */
import React, { useState } from "react";
import { CozySheet } from "@/components/ui/CozySheet";
import { TactileButton, formatRupiah } from "@/components/ui/CozyPrimitives";
import { FIELD_CLASS, MoneyInput, toInt } from "@/components/ui/MoneyInput";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useFinanceContext } from "@/lib/use-finance";
import { ROLLOVER_POLICIES, validateBudgetInput, type BudgetErrors, type BudgetInput, type BudgetWarning } from "@/lib/finance/budget";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function BudgetConfigSheet({ userId, name, open, onOpenChange }: { userId: string; name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const ctx = useFinanceContext(userId);
  const save = useFinanceStore((s) => s.saveBudgetConfig);
  const [budget, setBudget] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [policy, setPolicy] = useState<BudgetInput["rolloverPolicy"] | null>(null);
  const [scope, setScope] = useState<BudgetInput["effectiveScope"]>("next_month");
  const [errors, setErrors] = useState<BudgetErrors>({});
  const [warning, setWarning] = useState<BudgetWarning | null>(null);

  if (!ctx) return null;
  const cur = ctx.budget;
  const input: BudgetInput = {
    monthlyBudget: budget === null ? cur.monthlyBudget : toInt(budget),
    mandatorySavingsTarget: saving === null ? cur.mandatorySavingsTarget : toInt(saving),
    cycleStartDay: day === null ? cur.cycleStartDay : Number(day),
    rolloverPolicy: policy ?? cur.rolloverPolicy,
    effectiveScope: scope,
  };

  const reset = () => {
    setBudget(null);
    setSaving(null);
    setDay(null);
    setPolicy(null);
    setErrors({});
    setWarning(null);
  };

  const submit = (acknowledged: boolean, forceScope?: BudgetInput["effectiveScope"]) => {
    const payload = { ...input, effectiveScope: forceScope ?? input.effectiveScope };
    const v = validateBudgetInput(payload);
    setErrors(v.errors);
    if (!v.ok) return;
    const res = save(userId, payload, { acknowledged });
    if (res.warning) {
      setWarning(res.warning);
      return;
    }
    if (!res.success) {
      setErrors(res.errors ? (res.errors as BudgetErrors) : { monthlyBudget: res.message });
      return;
    }
    notify.success("Anggaran tersimpan", res.message);
    reset();
    onOpenChange(false);
  };

  return (
    <CozySheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={`Anggaran ${name}`}
      description={`Sekarang ${formatRupiah(cur.monthlyBudget)} per bulan • tabungan wajib ${formatRupiah(cur.mandatorySavingsTarget)} • siklus mulai tanggal ${cur.cycleStartDay}.`}
      icon={<GlyphInline name="coin" className="w-7 h-7" />}
      footer={
        warning ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <TactileButton type="button" variant="matcha" size="lg" onClick={() => submit(false, "next_month")}>
              Ganti ke bulan depan
            </TactileButton>
            <TactileButton type="button" variant="white" size="lg" onClick={() => submit(true)}>
              Tetap terapkan
            </TactileButton>
          </div>
        ) : (
          <TactileButton type="button" variant="matcha" size="lg" fullWidth onClick={() => submit(false)}>
            Simpan Anggaran
          </TactileButton>
        )
      }
    >
      <div className="space-y-4">
        {warning && (
          <p role="alert" className="rounded-2xl border-2 border-[#FDE08D] bg-[#FFFBEB] p-3 text-xs font-bold text-[#8A6A00] leading-relaxed">
            {warning.message}
          </p>
        )}
        <div>
          <MoneyInput label="Anggaran bulanan" value={budget ?? String(cur.monthlyBudget)} onChange={setBudget} />
          {errors.monthlyBudget && <p className="mt-1 text-xs font-bold text-[#C83E2B]">{errors.monthlyBudget}</p>}
        </div>
        <div>
          <MoneyInput label="Tabungan wajib per bulan" value={saving ?? String(cur.mandatorySavingsTarget)} onChange={setSaving} />
          {errors.mandatorySavingsTarget && <p className="mt-1 text-xs font-bold text-[#C83E2B]">{errors.mandatorySavingsTarget}</p>}
        </div>
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Siklus mulai tanggal</span>
          <select value={day ?? String(cur.cycleStartDay)} onChange={(e) => setDay(e.target.value)} className={FIELD_CLASS}>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Tanggal {d}
              </option>
            ))}
          </select>
          {errors.cycleStartDay && <p className="mt-1 text-xs font-bold text-[#C83E2B]">{errors.cycleStartDay}</p>}
        </label>
        <div className="space-y-2">
          <p className="text-xs font-display font-extrabold text-[#7A6E65]">Sisa uang akhir bulan</p>
          {ROLLOVER_POLICIES.map((p) => {
            const active = (policy ?? cur.rolloverPolicy) === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPolicy(p.id)}
                className={cn(
                  "w-full p-3 rounded-2xl border-2 text-left cursor-pointer",
                  active ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302]" : "bg-[#F7F3EB] border-[#E6DFD2]",
                )}
              >
                <span className="block font-display text-xs font-extrabold text-[#3D352E]">{p.label}</span>
                <span className="block text-[11px] font-bold text-[#7A6E65]">{p.hint}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2" role="group" aria-label="Kapan berlaku">
          <p className="text-xs font-display font-extrabold text-[#7A6E65]">Mulai berlaku</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "next_month", label: "Bulan depan", hint: "Aman, tidak mengubah bulan berjalan" },
                { id: "current_month", label: "Bulan ini", hint: "Langsung dihitung ulang" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={scope === o.id}
                onClick={() => {
                  setScope(o.id);
                  setWarning(null);
                }}
                className={cn(
                  "p-3 rounded-2xl border-2 text-left cursor-pointer",
                  scope === o.id ? "bg-white border-[#58CC02] border-b-[4px] border-b-[#46A302]" : "bg-[#F7F3EB] border-[#E6DFD2]",
                )}
              >
                <span className="block font-display text-xs font-extrabold text-[#3D352E]">{o.label}</span>
                <span className="block text-[11px] font-bold text-[#7A6E65]">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </CozySheet>
  );
}

"use client";

/**
 * Pasang sekali di cangkang aplikasi anak:
 * - memastikan dompet bawaan ada (hidrasi malas, tidak mengubah saldo);
 * - memberi tahu anak saat Supervisor mencatat uang masuk atau memutuskan pemasukan/hibah/pinjaman.
 */
import { useEffect, useRef } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useEnsureWallets } from "@/lib/use-finance";
import { formatRupiah } from "@/components/ui/CozyPrimitives";
import { notify } from "@/lib/notify";

export function FinanceNotifier({ userId, enabled }: { userId: string; enabled: boolean }) {
  useEnsureWallets(userId, enabled);
  const txs = useBukuDompetStore((s) => s.transactions);
  const grants = useFinanceStore((s) => s.grantRequests);
  const loans = useFinanceStore((s) => s.vaultLoans);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const keys = new Set<string>();
    const fresh: { key: string; title: string; subtitle: string }[] = [];
    const nowMs = Date.now();
    // Data lama yang baru tiba dari sinkronisasi tidak boleh membanjiri toast: hanya kejadian ≤15 menit terakhir.
    const add = (key: string, title: string, subtitle: string, at?: string) => {
      keys.add(key);
      const ms = at ? Date.parse(at) : NaN;
      if (Number.isFinite(ms) && nowMs - ms <= 15 * 60 * 1000) fresh.push({ key, title, subtitle });
    };
    for (const t of txs) {
      if (t.user_id !== userId) continue;
      if (t.type === "income" && t.createdByRole === "supervisor") add(`tx:${t.id}`, "Uang masuk dari Supervisor", `${formatRupiah(Number(t.total_amount))} masuk ke saldomu.`, t.created_at);
      if (t.type === "income" && t.createdByRole === "child" && t.verificationStatus === "verified") add(`ver:${t.id}`, "Pemasukan terkonfirmasi", `${formatRupiah(Number(t.total_amount))} sudah dikonfirmasi Supervisor.`, t.verifiedAt ?? t.created_at);
      if (t.type === "income" && t.createdByRole === "child" && t.verificationStatus === "rejected") add(`rej:${t.id}`, "Pemasukan ditolak", `Catatan ${t.title} tidak dihitung ke saldo.`, t.verifiedAt ?? t.created_at);
    }
    for (const g of grants) {
      if (g.userId !== userId) continue;
      if (g.status === "disbursed") add(`gd:${g.id}`, "Kebutuhan darurat disetujui", `${g.title}: ${formatRupiah(g.approvedAmount ?? 0)} masuk dompet kebutuhan.`, g.decidedAt);
      if (g.status === "rejected") add(`gr:${g.id}`, "Kebutuhan darurat belum disetujui", g.rejectReason || g.title, g.decidedAt);
    }
    for (const l of loans) {
      if (l.userId === userId && l.needsApproval && l.approvedBy) add(`la:${l.id}`, "Pinjaman darurat disetujui", `${formatRupiah(l.amount)} cair. Jangan lupa kembalikan ke Brankas.`, l.updatedAt);
      if (l.userId === userId && l.status === "rejected") add(`lr:${l.id}`, "Pinjaman darurat ditolak", l.reason, l.updatedAt);
    }
    if (seen.current === null) {
      // Muatan pertama: semua yang sudah ada dianggap terlihat, jangan banjiri toast.
      seen.current = keys;
      return;
    }
    const known = seen.current;
    for (const f of fresh) {
      if (known.has(f.key)) continue;
      known.add(f.key);
      notify.info(f.title, f.subtitle);
    }
  }, [enabled, userId, txs, grants, loans]);

  return null;
}

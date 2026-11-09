"use client";

/** Antrean tindakan Supervisor untuk satu anak: konfirmasi pemasukan, kebutuhan darurat, pinjaman celengan. */
import { useMemo } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFinanceStore } from "@/store/useFinanceStore";

export function useSupervisorInbox(userId: string) {
  const txs = useBukuDompetStore((s) => s.transactions);
  const grantsAll = useFinanceStore((s) => s.grantRequests);
  const loansAll = useFinanceStore((s) => s.vaultLoans);
  return useMemo(() => {
    const queue = txs.filter((t) => t.user_id === userId && t.type === "income" && t.verificationStatus === "pending_supervisor");
    const grants = grantsAll.filter((g) => g.userId === userId && g.status === "pending");
    const loans = loansAll.filter((l) => l.userId === userId && l.status === "open" && l.needsApproval && !l.approvedBy);
    return { queue, grants, loans, count: queue.length + grants.length + loans.length };
  }, [txs, grantsAll, loansAll, userId]);
}

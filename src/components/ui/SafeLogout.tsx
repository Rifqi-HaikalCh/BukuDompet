"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { logoutSafely } from "@/lib/sync/client";

interface Problem {
  unsaved: number;
  foreign: number;
  offline: boolean;
}

/**
 * Keluar akun yang tidak menghilangkan data: perubahan terakhir dikirim ke server dulu.
 * Bila ada yang belum bisa tersimpan (offline / ditolak / milik akun lain), pengguna diberi pilihan jelas.
 */
export function useSafeLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const finish = useCallback(() => {
    useBukuDompetStore.getState().logout();
    router.push("/login");
  }, [router]);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const r = await logoutSafely();
      if (r.done) finish();
      else setProblem({ unsaved: r.unsaved, foreign: r.foreign, offline: r.offline });
    } finally {
      setBusy(false);
    }
  }, [finish]);

  const force = useCallback(async () => {
    setProblem(null);
    setBusy(true);
    try {
      await logoutSafely({ force: true });
      finish();
    } finally {
      setBusy(false);
    }
  }, [finish]);

  let description = "";
  if (problem) {
    if (problem.unsaved > 0 || problem.offline) {
      description =
        problem.unsaved > 0
          ? `${problem.unsaved.toLocaleString("id-ID")} perubahan belum sampai ke server${
              problem.offline ? " karena koneksi bermasalah" : ""
            }. Sambungkan internet lalu keluar lagi agar semuanya aman. Jika tetap keluar sekarang, perubahan itu hilang dari perangkat ini.`
          : "Belum bisa memastikan semua catatanmu sudah tersimpan di server karena tidak ada koneksi. Sambungkan internet lalu coba lagi. Jika tetap keluar sekarang, data yang belum tersimpan akan hilang dari perangkat ini.";
    } else {
      description = `Perangkat ini masih menyimpan ${problem.foreign.toLocaleString(
        "id-ID"
      )} data milik akun lain yang tidak bisa diunggah dari akun ini. Masuk sebagai Admin lebih dulu untuk menyimpannya ke server. Jika tetap keluar, data itu dihapus dari perangkat ini.`;
    }
  }

  const overlay = (
    <>
      {busy && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-[#3D352E]/45 backdrop-blur-[2px] p-4"
        >
          <div className="flex items-center gap-3 rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[6px] border-b-[#D4C9B4] px-5 py-4 shadow-xl">
            <span className="w-3 h-3 rounded-full bg-[#58CC02] animate-pulse" aria-hidden="true" />
            <span className="font-display text-sm font-extrabold text-[#3D352E]">Menyimpan perubahan terakhir…</span>
          </div>
        </div>
      )}
      <CozyConfirmModal
        open={problem !== null}
        onClose={() => setProblem(null)}
        onConfirm={force}
        title="Ada data yang belum tersimpan"
        description={description}
        confirmLabel="Tetap Keluar & Hapus"
        cancelLabel="Batal, Tetap Masuk"
        confirmVariant="peach"
        mochiMood="happy"
        badgeText="Jaga Data Kamu"
      />
    </>
  );

  return { run, overlay, busy };
}

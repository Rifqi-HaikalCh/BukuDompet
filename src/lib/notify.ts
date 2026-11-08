/**
 * Notifikasi global (Versi 5.3). Satu antrean untuk Beranda Keluarga, Jalur Kas, Misi, dan Pet.
 * Dipanggil dari mana saja: `notify.success("Judul", "Keterangan")`. Ditampilkan oleh <ToastHost />
 * dari pojok kanan-bawah, meluncur dari kanan ke kiri.
 */
import { create } from "zustand";

export type NotifyTone = "success" | "info" | "warn" | "reward";

export interface NotifyItem {
  id: string;
  tone: NotifyTone;
  title: string;
  subtitle?: string;
  points?: number;
  xp?: number;
  /** Lama tampil (ms). */
  duration: number;
}

interface NotifyState {
  items: NotifyItem[];
  push: (item: Omit<NotifyItem, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

const MAX_VISIBLE = 4;
let counter = 0;

export const useNotifyStore = create<NotifyState>((set, get) => ({
  items: [],
  push: (item) => {
    counter += 1;
    const id = `ntf-${counter}`;
    const next: NotifyItem = { duration: item.tone === "warn" ? 6000 : 4500, ...item, id };
    // Pesan yang sama persis (judul + keterangan) tidak ditumpuk dua kali.
    const dupe = get().items.find((x) => x.title === next.title && x.subtitle === next.subtitle);
    if (dupe) return dupe.id;
    set((s) => ({ items: [...s.items, next].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

function push(tone: NotifyTone, title: string, subtitle?: string, extra?: Partial<NotifyItem>) {
  return useNotifyStore.getState().push({ tone, title, subtitle, ...extra });
}

export const notify = {
  success: (title: string, subtitle?: string) => push("success", title, subtitle),
  info: (title: string, subtitle?: string) => push("info", title, subtitle),
  warn: (title: string, subtitle?: string) => push("warn", title, subtitle),
  reward: (title: string, subtitle?: string, points = 0, xp = 0) => push("reward", title, subtitle, { points, xp }),
  /** Hasil aksi `{success, message}`: hijau bila berhasil, kuning bila gagal. */
  result: (res: { success: boolean; message: string }, successTitle = "Berhasil", failTitle = "Belum bisa") =>
    res.success ? push("success", successTitle, res.message) : push("warn", failTitle, res.message),
};

/**
 * Penanda "perubahan ini datang dari server, bukan dari aksi pengguna".
 * Modul tanpa impor agar bisa dipakai store dan adapter sinkron tanpa impor melingkar.
 */
let applying = 0;
export const isSyncApplying = (): boolean => applying > 0;
export function withSyncApplying<T>(fn: () => T): T {
  applying++;
  try {
    return fn();
  } finally {
    applying--;
  }
}

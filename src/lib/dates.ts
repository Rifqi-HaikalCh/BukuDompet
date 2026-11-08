/**
 * Utilitas tanggal berbasis zona waktu LOKAL perangkat (bukan UTC).
 *
 * Kenapa penting: `new Date().toISOString().split("T")[0]` memakai UTC. Di WIB (UTC+7)
 * tanggalnya baru berganti jam 07.00 pagi, sehingga "hari ini" salah selama 7 jam pertama.
 * Streak ketat (Versi 5.0) bergantung pada pergantian hari yang tepat, jadi semua logika baru
 * memakai fungsi di sini. Format selalu `YYYY-MM-DD`.
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Format objek Date menjadi `YYYY-MM-DD` menurut zona waktu lokal. */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Ubah `YYYY-MM-DD` menjadi Date pukul 12.00 lokal (aman dari pergeseran DST/zona waktu). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return new Date(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/** Tanggal hari ini (lokal) digeser `offsetDays` hari. */
export function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
}

/** Tambah `days` hari ke tanggal `YYYY-MM-DD`. */
export function addDaysStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/** Selisih hari (end - start). Positif jika `endStr` setelah `startStr`. */
export function diffDaysStr(startStr: string, endStr: string): number {
  return Math.round(
    (parseLocalDate(endStr).getTime() - parseLocalDate(startStr).getTime()) /
      86400000
  );
}

/** Awal pekan (Senin) untuk tanggal tertentu — kunci periode misi mingguan. */
export function startOfWeekStr(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const dow = (d.getDay() + 6) % 7; // Senin = 0
  d.setDate(d.getDate() - dow);
  return formatLocalDate(d);
}

/** Daftar tanggal dari `fromStr` sampai `toStr` (inklusif). */
export function dateRangeStr(fromStr: string, toStr: string): string[] {
  const out: string[] = [];
  const total = diffDaysStr(fromStr, toStr);
  for (let i = 0; i <= total; i++) out.push(addDaysStr(fromStr, i));
  return out;
}

/** Label tanggal pendek berbahasa Indonesia, contoh "8 Nov". */
export function shortDateLabel(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

/** Label tanggal panjang berbahasa Indonesia, contoh "Minggu, 8 November 2026". */
export function longDateLabel(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

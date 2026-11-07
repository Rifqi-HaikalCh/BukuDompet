import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format nominal Rupiah ringkas anti-jebol untuk badge/kartu sempit/sel kalender.
 * Contoh:
 * - formatCompactRupiah(1450000) -> "Rp 1,45 Jt"
 * - formatCompactRupiah(25000, { withPrefix: false }) -> "25rb"
 * - formatCompactRupiah(-23000, { withPrefix: false, showSign: true }) -> "-23rb"
 */
export function formatCompactRupiah(
  amount: number,
  options?: { withPrefix?: boolean; showSign?: boolean }
): string {
  const withPrefix = options?.withPrefix ?? true;
  const showSign = options?.showSign ?? false;

  const abs = Math.abs(Math.round(amount));
  const sign = showSign ? (amount < 0 ? "-" : amount > 0 ? "+" : "") : amount < 0 ? "-" : "";
  const prefix = withPrefix ? "Rp " : "";

  if (abs === 0) {
    return withPrefix ? "Rp 0" : "Rp0";
  }

  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
    return `${sign}${prefix}${val}${withPrefix ? " M" : "M"}`;
  }

  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
    return `${sign}${prefix}${val}${withPrefix ? " Jt" : "jt"}`;
  }

  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${sign}${prefix}${val}${withPrefix ? " Rb" : "rb"}`;
  }

  return `${sign}${prefix}${abs.toLocaleString("id-ID")}`;
}

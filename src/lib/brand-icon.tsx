/**
 * Ikon merek BukuDompet (Versi 5.0): jurnal Matcha dengan koin emas bermahkota.
 * Dipakai oleh `app/icon.tsx`, `app/apple-icon.tsx`, dan skrip pembuat favicon.
 * Murni SVG statis (tanpa acak) agar hasil render konsisten di semua ukuran.
 */
import React from "react";

export const BRAND_ICON_SVG_PATHS = {
  tile: "M14 0h36a14 14 0 0 1 14 14v36a14 14 0 0 1-14 14H14A14 14 0 0 1 0 50V14A14 14 0 0 1 14 0Z",
  book: "M17 10h28a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5Z",
  spine: "M17 10h6v41h-6a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5Z",
  ribbon: "M40 10h6v12l-3-2.4L40 22Z",
  crown: "M29 36.5V28l3.4 3.2L35 26l2.6 5.2L41 28v8.5Z",
} as const;

export function BrandIconSvg({ size = 64 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 64 64">
      <path d={BRAND_ICON_SVG_PATHS.tile} fill="#58CC02" />
      <path d="M0 50a14 14 0 0 0 14 14h36a14 14 0 0 0 14-14v-3a14 14 0 0 1-14 14H14A14 14 0 0 1 0 47Z" fill="#46A302" />
      <path d={BRAND_ICON_SVG_PATHS.book} fill="#FFFDF9" />
      <path d={BRAND_ICON_SVG_PATHS.spine} fill="#F2D9A0" />
      <path d={BRAND_ICON_SVG_PATHS.ribbon} fill="#FF4B4B" />
      <rect x="27" y="43" width="16" height="2.6" rx="1.3" fill="#D4C9B4" />
      <circle cx="35" cy="31" r="11" fill="#FFC800" stroke="#E5A400" strokeWidth="2.6" />
      <path d={BRAND_ICON_SVG_PATHS.crown} fill="#A86B00" stroke="#A86B00" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

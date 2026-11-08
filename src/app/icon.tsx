import { ImageResponse } from "next/og";
import { BrandIconSvg } from "@/lib/brand-icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon dinamis: jurnal Matcha dengan koin emas bermahkota. */
export default function Icon() {
  return new ImageResponse(<BrandIconSvg size={64} />, { ...size });
}

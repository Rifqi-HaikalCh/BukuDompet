import { ImageResponse } from "next/og";
import { BrandIconSvg } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ikon layar utama iOS. */
export default function AppleIcon() {
  return new ImageResponse(<BrandIconSvg size={180} />, { ...size });
}

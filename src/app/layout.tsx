import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BukuDompet — Jurnal Kas Petualangan & Detektif Dompet",
  description:
    "Catat uang saku gaya petualangan bersama Mochi si Kucing Celengan! 1 Poin = Rp 1, Misi Rinci, dan Detektif Pengeluaran.",
};

export const viewport: Viewport = {
  themeColor: "#FFFDF9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${outfit.variable} ${plusJakartaSans.variable} antialiased text-[#3D352E] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

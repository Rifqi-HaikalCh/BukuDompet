import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "BukuDompet — Jurnal Kas Petualangan & Detektif Dompet",
  description:
    "Catat uang saku gaya petualangan bersama Mochi si Kucing Celengan! 1 Poin = Rp 1, Misi Rinci, dan Detektif Pengeluaran.",
};

export const viewport: Viewport = {
  themeColor: "#FFFDF7",
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
        className={`${fredoka.variable} ${nunito.variable} ${jetbrainsMono.variable} antialiased bg-[#FFFDF7] text-[#3D352E] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

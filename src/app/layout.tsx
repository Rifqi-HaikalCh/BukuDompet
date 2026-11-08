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
  title: {
    default: "BukuDompet — Jurnal Kas Petualangan Keluarga",
    template: "%s • BukuDompet",
  },
  applicationName: "BukuDompet",
  description:
    "Jurnal kas keluarga bergaya petualangan: catat uang saku, menabung di celengan, rawat pet, kerjakan misi, dan raih medali bersama Beranda Keluarga.",
  keywords: ["BukuDompet", "jurnal kas", "uang saku", "menabung", "literasi keuangan anak", "gamifikasi"],
  authors: [{ name: "BukuDompet" }],
  openGraph: {
    title: "BukuDompet — Jurnal Kas Petualangan Keluarga",
    description: "Catat, menabung, dan bertualang bersama pet kesayangan keluarga.",
    siteName: "BukuDompet",
    locale: "id_ID",
    type: "website",
  },
  appleWebApp: { capable: true, title: "BukuDompet", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#58CC02",
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

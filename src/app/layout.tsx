import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Font dimuat lewat <link> Google Fonts (di peramban), bukan next/font/google. next/font mengunduh font saat
 * build dan gagal total bila respons Google Fonts berubah bentuk atau tidak terjangkau, sehingga seluruh deploy
 * ikut gagal. Dengan <link>, build tidak bergantung pada jaringan; bila font tak termuat, teks memakai system-ui.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap";

const FONT_VARS = {
  "--font-display": "'Outfit', system-ui, sans-serif",
  "--font-sans": "'Plus Jakarta Sans', system-ui, sans-serif",
} as React.CSSProperties;

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body style={FONT_VARS} className="antialiased text-[#3D352E] min-h-screen">
        {children}
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BukuDompet — Jurnal Kas Petualangan",
    short_name: "BukuDompet",
    description: "Jurnal kas keluarga bergaya petualangan: catat, menabung, rawat pet, dan raih medali bersama.",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF9",
    theme_color: "#58CC02",
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

/**
 * Konversi foto unggahan ke WebP di sisi klien (Versi 5.0).
 *
 * Foto digambar ulang ke <canvas> dengan lebar maksimal 960px lalu diekspor sebagai
 * `image/webp` kualitas 0.8, supaya memori localStorage/Supabase hemat.
 * Bila browser tidak mendukung ekspor WebP (mengembalikan PNG), hasilnya ditolak dengan
 * pesan jelas, bukan diam-diam menyimpan PNG besar.
 */

export const WEBP_MAX_WIDTH = 960;
export const WEBP_QUALITY = 0.8;
/** Batas ukuran berkas asli yang diterima sebelum dikompres (10 MB). */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
/** Batas hasil WebP (data URL) agar localStorage tidak penuh (±350 KB). */
export const MAX_OUTPUT_CHARS = 480_000;


export interface WebpResult {
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  /** Perkiraan ukuran hasil dalam byte. */
  outputBytes: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Foto tidak bisa dibaca. Coba foto lain ya."));
    img.src = url;
  });
}

export interface WebpOptions {
  maxWidth?: number;
  quality?: number;
  maxOutputChars?: number;
}

/** Pengaturan hemat untuk foto di Chat Keluarga: lebih kecil dari foto Beranda. */
export const CHAT_WEBP_OPTIONS: Required<WebpOptions> = { maxWidth: 720, quality: 0.72, maxOutputChars: 200_000 };

export async function convertImageToWebp(file: File, options: WebpOptions = {}): Promise<WebpResult> {
  const maxWidth = options.maxWidth ?? WEBP_MAX_WIDTH;
  const quality = options.quality ?? WEBP_QUALITY;
  const maxChars = options.maxOutputChars ?? MAX_OUTPUT_CHARS;
  if (!file.type.startsWith("image/")) {
    throw new Error("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Foto terlalu besar (maksimal 10 MB).");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) throw new Error("Ukuran foto tidak valid.");

    const scale = naturalW > maxWidth ? maxWidth / naturalW : 1;
    const width = Math.max(1, Math.round(naturalW * scale));
    const height = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) {
      throw new Error("Browser ini belum bisa mengompres ke WebP. Coba browser lain.");
    }
    if (dataUrl.length > maxChars) {
      throw new Error("Foto masih terlalu besar setelah dikompres. Pilih foto yang lebih sederhana.");
    }

    const base64Len = dataUrl.length - dataUrl.indexOf(",") - 1;
    return {
      dataUrl,
      width,
      height,
      originalBytes: file.size,
      outputBytes: Math.round((base64Len * 3) / 4),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

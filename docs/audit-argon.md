# Audit Aset Gamifikasi BukuDompet (Argon)

Dokumen ini menggantikan versi sebelumnya (ARG-01..ARG-11) karena sebagian klaimnya tidak terbukti
(mis. "24 item per slot × 6 slot" dan usulan menyeimbangkan label gender 31/27). Semua angka di bawah
diukur ulang pada salinan kerja; nomor baris merujuk ke berkas setelah perbaikan.

> Tidak ada commit dan tidak ada push. Semua perubahan hanya ada di working tree lokal.

## Cara verifikasi

| Pemeriksaan | Alat | Hasil akhir |
|---|---|---|
| Tipe | `npx tsc --noEmit` | 0 error |
| Lint | `npx eslint src` | 0 error, 0 warning |
| Build | `npx next build` (15 halaman statis) | sukses, tanpa warning baru |
| Hidrasi SSR/CSR | render SSR dengan `Math.sin/cos/atan2` diganggu 1 ulp | 0 atribut berisiko |
| Tabrakan visual | render Playwright DPR 2, selisih piksel vs baseline di area mata/alis/pipi/hidung/mulut | 0 mata tertutup; hijab diatur sampai di bawah ambang pipi |
| Konsol | 8 rute di 390px (login, beranda, misi, pet, detektif, hadiah, supervisor, admin) | 0 error, 0 warning, 0 overflow |
| Responsif | `/app/pets` di 360 / 768 / 1280 | `scrollWidth == clientWidth` |
| Performa Butik | CPU 4×, longtask observer | lihat F-09 |
| Data lama | localStorage dengan ID tak dikenal & slot salah | dibersihkan, item sah tetap, idempoten saat reload |

Catatan lingkungan: `next build` di sandbox gagal mengunduh Google Fonts, jadi build dilakukan pada salinan
dengan `layout.tsx` yang ditambal. Tambalan itu **tidak** ikut disalin ke repo.

## Temuan

| ID | Severity | Status | Kategori | Temuan dan bukti |
|---|---|---|---|---|
| F-01 | Blocker | Selesai | Tipe | `merge` persist di store memakai peta migrasi palsu dan `equippedAccessories` pada `OwnedPetInstance` sehingga `tsc` gagal (TS2339, TS2345, TS2353). Diganti `sanitizeProfileAccessories` (`useBukuDompetStore.ts:1394`, dipakai di `:2848`): murni, idempoten, ID lama tidak diubah. |
| F-02 | Blocker | Selesai | Hidrasi | Galat hidrasi `cx="-4.247339220468474"` vs `...476`: sin/cos berbeda digit terakhir antara Node dan Chrome. Hasil trigonometri dibulatkan 2 desimal (`PraiseBadges.tsx:114` `r2`, `AdventureNodes.tsx`, `f2` di `PetAvatarSystem.tsx`). Tes diferensial: 0 kelompok berisiko. |
| F-03 | Tinggi | Selesai | Aset | Kapibara: poni menutup mata dan alis, hijab memotong pipi. Ditambah `FaceSpec.hairLift/hairSquash/hijabScaleX` (`PetAvatarSystem.tsx:753-759`), nilai per spesies (kapibara `:1839-1841`), diterapkan di `headTransform` (`:9636`). |
| F-04 | Tinggi | Selesai | Aset | Hijab hamster, panda merah, beruang susu, fennec, unicorn terlalu sempit/lebar. `hijabScaleX` per spesies (hamster 1.24, panda merah 1.14, beruang susu 1.2, fennec 1.17, unicorn 1.06, kapibara 1.12). Fennec sempat sedikit melewati ambang pipi, diturunkan ke 1.17 dan diukur ulang. |
| F-05 | Sedang | Selesai | Aset | Skala mata sama untuk semua spesies. `FaceSpec.eyeScale` (`:753`), dipakai di `:1042`; fennec dan unicorn 1.15. |
| F-06 | Sedang | Selesai | Aset | Rambut/hijab tampil pada fase telur. `headId` disaring (`:10051`) dan transformasi telur khusus. Lencana "Menetas dulu (Fase 2+)" di kartu Lemari/Butik saat pratinjau Fase 1. |
| F-07 | Sedang | Selesai | Pratinjau | Pratinjau item tipis atau terpotong (kuncir, topi sinterklas, payung, buket, pedang busa, skuter, balon, plester, stiker pipi, janggut, lipstik) dan pakaian terlalu kecil. `PREVIEW_BOX_FIX` (`:9548`) dan kotak pakaian bertingkat. |
| F-08 | Sedang | Selesai | Kontras | Kunang-kunang dan gelembung aura nyaris tak terlihat; bintik wajah terlalu pucat. Warna dan ukuran dinaikkan tanpa warna baru. |
| F-09 | Tinggi | Selesai (sebagian, lihat risiko) | Performa | Butik "Semua Fase" (96 kartu) dengan CPU 4×: frame **1544 ms**, longtask 801/108/90/114 ms. Perbaikan: `LazyAccessoryPreview` (`useInView`, margin 240px), `memo` pada `CustomizablePetAvatar` dan `AccessoryPreviewIcon`, `report` di-memo. Hasil: frame **817 ms**, longtask **322 ms**; tanpa throttle frame 243 ms, hanya satu longtask 69 ms. |
| F-10 | Tinggi | Selesai | Alur | Peti Harta di Peta Jalur memilih pratinjau dengan indeks hari, bukan logika klaim, sehingga item yang tampil bisa berbeda dari yang didapat. Logika dipindah ke fungsi murni `pickPathDropItem` (`src/lib/path-drop.ts`) yang dipakai store saat klaim dan UI untuk prakiraan; item tiap peti dicatat di `pathMilestoneDrops` (opsional). Klaim lama tanpa catatan tetap tampil aman (tanpa ikon item). Teruji di browser: peti hari ke-7 menampilkan Aura Daun Melayang sebelum dan sesudah klaim. |
| F-11 | Sedang | Selesai | Alur | Tombol "Poin Belum Cukup" (aksesori, spesies, perisai es) memanggil aksi tanpa umpan balik. Kini pesan `role="status"` yang bisa ditutup, dihapus saat pindah tab. |
| F-12 | Sedang | Selesai | A11y | Chip filter tanpa `aria-pressed` dan tanpa cincin fokus; tab bukan `tablist`. Komponen `FilterChip`/`GenderChips`, `tablist` dengan panah/Home/End, `tabpanel`, label pada chip fase dan peti. Teruji: panah kanan, End, Home berpindah tab dengan benar. |
| F-13 | Sedang | Selesai | Kontras | Teks putih di atas sky `#38B6FF` dan peach `#FF8B7B` hanya 2,26:1 (dihitung rumus WCAG). Chip aktif memakai teks INK `#3D352E`: 5,32:1 di sky, 5,28:1 di peach, 4,73:1 di taro. Lencana slot (taro `#A552DB` di atas `#F8F0FF` = 3,91:1) dan teks terkunci (`#C83E2B` = 4,60:1; `#7A6E65` = 4,47:1) dinaikkan ke INK / `#8F2A1B` (7,64:1) / `#6B5F56` (5,59:1); teks pil di modal unboxing `#9E6D00` (4,30:1) menjadi `#4A3500` (11,08:1). |
| F-14 | Sedang | Selesai | A11y | Modal unboxing tanpa `role="dialog"`, tanpa Esc, tanpa fokus awal. Ditambah `role="dialog"`, `aria-modal`, `aria-labelledby`, fokus ke tombol aman, Esc menutup (item sudah tersimpan). Teruji: fokus awal "Simpan ke Lemari", Esc menutup. |
| F-15 | Rendah | Selesai | Gaya | Emoji campur dengan ikon di halaman Pet. Diganti `CozyIcon` (`lock_cozy`, `egg_nest`, `check_badge`, `combo_sparkle`, `mystery_box`, `crown_sultan`) dan teks dialog dibersihkan. |
| F-16 | Rendah | Selesai | Standar | Aturan global `transform-box: fill-box` di `globals.css` menggeser elemen SVG tak beranimasi. Dihapus; elemen ber-`transform=` memakai `SVG_ATTR_ORIGIN`. |

### Diperiksa dan tidak berubah (dengan alasan)

- **Label gender.** Tampilan Perempuan 127 item vs Laki-laki 123 item (sudah termasuk netral). Seimbang, tidak perlu pelabelan ulang. Usulan lama 31/27 ditolak.
- **ID item.** Tidak ada ID yang diubah. Katalog 144 item (48 `path_drop`, 96 toko) tetap.
- **Pakaian dan leher.** Tidak ada yang menyentuh area wajah (0 tanda pada uji piksel semua spesies).
- **Tombol putih di atas warna terang pada `TactileButton`.** Gaya global komponen bersama; mengubahnya berdampak ke seluruh aplikasi. Ditunda dan dicatat sebagai rekomendasi.

## Iterasi

**Putaran 1: aset dan fondasi.** Perbaikan F-01 sampai F-08, F-16. Hasil: `tsc` bersih, hidrasi 0 risiko, uji piksel tanpa mata tertutup, kecuali hijab fennec sedikit di atas ambang pipi.

**Putaran 2: halaman Pet dan performa.** F-09, F-11, F-12, F-13, F-15. Uji ulang: build bersih, konsol bersih di 360/768/1280, tab keyboard lolos, performa 1544 ms menjadi 817 ms. Temuan putaran ini: pesan poin kurang menggandakan kalimat ("butuh 1.500 Poin" dua kali), diperbaiki dengan memakai pesan store apa adanya.

**Putaran 3: Peti Harta dan dialog.** F-10, F-14. Uji ulang: klaim peti di browser, Esc, uji localStorage lama (ID tak dikenal `head_hantu_tak_ada` dan `legacy_xyz` dibuang, slot salah dibuang, 8 item sah tetap, aman dimuat dua kali), 8 rute bersih, SSR 0 risiko. Temuan putaran ini: klaim lama tanpa catatan item akan menyembunyikan seluruh peti jika bergantung pada item pratinjau; kini peti selalu tampil dan ikon item bersifat opsional.

## Risiko dan rekomendasi tersisa

1. **Performa belum "mulus" di perangkat lambat.** Pada CPU 4× lebih lambat, filter Butik masih menghabiskan 490 sampai 600 ms per interaksi (longtask 55 sampai 131 ms). Tanpa throttle tidak ada longtask. Saran: virtualisasi grid (mis. `content-visibility: auto` atau paginasi 24 kartu) bila perangkat sasaran memang selemah itu. Belum dilakukan karena belum terbukti perlu.
2. **Pengujian tampilan tidak mencakup semua kombinasi.** 8 spesies × 8 fase × slot diuji berpiksel untuk wajah, pakaian dan leher; kombinasi properti, aura dan latar hanya ditinjau visual per sampel.
3. **Emoji di luar halaman Pet** (peta jalur "Posisi Hari Ini", judul modal unboxing, toast klaim) belum diganti `CozyIcon`.
4. **`TactileButton`** memakai teks putih di atas warna terang (lihat di atas).
5. **Pencerminan `scale(-1 1)`** masih ada di dua ikon kecil (`MochiCompanion.tsx:162`, `CozyIcons.tsx:1054`); sudah ber-`SVG_ATTR_ORIGIN` dan tampil benar, tetapi geometri hasil hitung lebih sesuai standar.
6. **Tidak diuji pada browser selain Chromium**, dan tidak diuji di perangkat sentuh sungguhan.
7. **Klaim peti lama** tanpa `pathMilestoneDrops` tidak menampilkan item yang pernah didapat; hanya teks generik.

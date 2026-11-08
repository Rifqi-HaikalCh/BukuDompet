# Rancangan & Evaluasi Versi 5.1

Dokumen ini merangkum analisis, evaluasi desain, keputusan, dan implementasi untuk 10 poin umpan balik Versi 5.1.

## Prinsip yang dipakai
- **Satu bahasa visual**: semua ikon berasal dari sistem SVG sendiri (GlyphIcons / UiGlyphs / CozyIcons). Tidak ada emoji OS, tidak ada karakter geometris sebagai ikon (▴ ▾ →).
- **Kepadatan rendah, detail di balik ketukan**: kartu hanya memuat gambar, nama, dan satu tombol aksi; keterangan lengkap muncul di modal.
- **Satu baris yang bisa digeser** menggantikan deretan tombol yang membungkus (`ChipScroller`), dengan petunjuk geser dan tombol panah di desktop.
- **Tanpa Math.random**, semua partikel/aura memakai hash deterministik; `MotionConfig reducedMotion="user"` di semua komponen animasi.

## Per poin: masalah → evaluasi → keputusan

| # | Masalah | Alternatif yang dipertimbangkan | Keputusan |
|---|---------|--------------------------------|-----------|
| 1 | Emoji OS & ikon ganda di Arcade Sekolah, Waktu Cerita, tombol | Ganti satu per satu secara manual vs. satu pustaka ikon | Pustaka glyph tunggal + pemindai otomatis karakter emoji/simbol pada kode (hasil akhir 0 temuan di luar komentar) |
| 2 | Tombol kategori/fase/slot membungkus | Dropdown vs. baris geser | Baris geser (`ChipScroller`) untuk Lemari, 8 Fase, Kategori Butik, Kategori Jurnal Kas; panel "Lemari Cepat" 7 slot dengan status terpasang/kosong dan strip koleksi yang bisa digeser |
| 3 | Transfer/tukar poin tidak jelas | Teks peringatan saja vs. animasi | `PointTransferModal`: panggung animasi pengirim → koin terbang → penerima, pengurangan & penambahan saldo ditampilkan eksplisit, bahasa ramah anak |
| 4 | Beranda Keluarga bercampur dengan pemantauan | Tab dalam satu halaman vs. rute terpisah | Tiga rute: `/supervisor/pilih` (pilih anak), `/supervisor` (pantau), `/supervisor/keluarga` (beranda keluarga). Login pertama diarahkan ke halaman pilih anak (karakter pet + nama); tombol "Ganti Anak" tersedia |
| 5 | Supervisor/Admin memakai telur | Telur dengan aksesori vs. persona baru | `PersonaAvatars`: Wali Hangat (supervisor, dua varian warna) dan Abang Penjaga (admin) |
| 6 | Brankas login | Modal tengah vs. panel dari bawah | Panel (bottom drawer) naik dari bawah untuk memasukkan PIN |
| 7 | "Kalender streak & rekap kas" untuk anak SD | Teks saja vs. tampilan menyesuaikan | Judul "Kalender Streak dan Rekap Catatan" + ringkasan harian ramah anak |
| 8 | Aura/latar terlalu sedikit; siluet garis putus-putus muncul saat properti kosong | Menjadikan item drop dijual vs. membuat item baru | **16 aura + 16 latar baru** (2 per fase), semua dijual di Butik; garis putus-putus karpet di "Kamar Polos Hangat" dan "Perpustakaan Kayu" dihapus |
| 9 | Kartu Butik/Lemari terlalu besar | Perkecil teks vs. ubah struktur | `ItemTile` (gambar, nama, 1 tombol) + `ItemDetailModal` untuk detail |
| 10 | Pelindung streak tidak bisa dibeli | Jual 1 jenis vs. paket | Kategori "Pelindung Streak" di Butik dengan 3 paket (1, 3, 7 perisai); 3 perisai gratis per bulan |

## Poin 8 — aset baru
**Aura (16):** Gerimis Pelangi, Biji Dandelion (F1) · Daun Musim Gugur, Sinar Mentari (F2) · Jejak Kaki Mungil, Cincin Pelangi (F3) · Bulan dan Bintang, Awan Kapas (F4) · Balon Pesta, Percikan Petir (F5) · Bulu Malaikat, Permata Mengorbit (F6) · Konfeti Pesta, Pita Aurora (F7) · Mahkota Cahaya, Komet Berlari (F8).

**Latar (16):** Padang Rumput Pagi, Jendela Hujan Cozy (F1) · Toko Roti Hangat, Ladang Bunga Matahari (F2) · Taman Bermain, Akuarium Biru (F3) · Perkemahan Malam, Peternakan Ceria (F4) · Taman Musim Gugur, Pasar Malam Lampion (F5) · Puncak Gunung Fajar, Stasiun Bulan Mungil (F6) · Dasar Laut Karang, Kastil Dongeng (F7) · Danau Aurora, Puncak Pelangi Emas (F8).

Harga mengikuti kurva Butik: aura 500 → 14.000 Poin, latar 700 → 18.000 Poin (fase 1 → 8). Katalog kini 176 item (128 dijual di Butik, 48 drop Peta Jalur Kas).

Berkas: `cosmeticKit.tsx` (perkakas bersama), `ExtraAuras.tsx`, `ExtraBackgrounds.tsx`, `extraCosmeticSpecs.ts` (data, harga, deskripsi).

## Poin 10 — aturan Pelindung Streak
- Tiap awal bulan (tanggal 1) setiap anak otomatis mendapat **3 perisai gratis**. Sisa bulan lalu hangus (tidak ditumpuk).
- Perisai gratis **dipakai lebih dulu**, baru perisai hasil beli.
- Satu hari terlewat memakai satu perisai; **dua hari terlewat butuh dua perisai** (sebelumnya hanya satu hari yang bisa ditutup). Jika perisai kurang, streak putus dan tidak ada perisai yang dipakai.
- Paket Butik: Tunggal 500 Poin (×1), Trio Beku 1.350 Poin (×3), Pekan Aman 2.800 Poin (×7). Perisai hasil beli maksimal 10 supaya tidak ditimbun.
- Profil lama tanpa field baru otomatis dianggap punya jatah penuh (tanpa migrasi).
- Berkas: `lib/streak-shields.ts` (aturan murni), `lib/streak.ts`, `store/useBukuDompetStore.ts`, `components/pets/ShieldShop.tsx`.

## Evaluasi desain & risiko
- **Jumlah perisai** di header dan kalender kini menampilkan total (gratis + beli) supaya angkanya sama dengan yang benar-benar melindungi streak.
- **Perubahan perilaku disengaja**: penutupan lebih dari satu hari terlewat adalah penyesuaian dari aturan "3 perisai per bulan"; tanpa ini jatah 3 tidak bermakna.
- **Perbaikan sampingan**: modal desktop (kalender streak, transaksi, CozySheet) menampilkan strip putih di bawahnya akibat pseudo-elemen bawaan vaul; dinonaktifkan pada layar ≥ 768px.
- **Batasan**: aura pada kartu pratinjau kecil tampak samar karena kanvas penuh diperkecil; di panggung pet tampil jelas. Animasi memakai kerangka gerak yang sama dengan aset lama, jadi beban render per kartu tetap rendah, tetapi 128 kartu Butik dirender bertahap (24 per halaman).

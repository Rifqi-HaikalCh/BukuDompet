# Rancangan Versi 5.3

Dua belas butir perbaikan dari umpan balik Haikal (8 November 2026). Semua teks UI berbahasa Indonesia, semua tampilan responsif (ponsel + desktop), tanpa `Math.random`, tanpa `// TODO`.

## 1. Peringkat Keluarga (desktop rapi)
- Analisis: data peringkat sedikit (2–6 anak) dengan satu angka utama per baris, jadi bentuk terbaik adalah podium untuk 3 teratas + daftar rapat untuk sisanya.
- Lebar kartu ditentukan ruang yang tersedia (ada sidebar), bukan lebar layar, sehingga memakai container query: dua papan berdampingan hanya bila lebar wadah ≥ 56rem; di bawah itu satu papan dengan sakelar "Poin | Streak".
- Kolom angka lebar tetap dan rata kanan; nama tidak pecah ke banyak baris; badge gelar tampil di bawah nama.
- Berkas: `components/family/FamilyLeaderboard.tsx`.

## 2. Cerita Harian di dalam postingan
- Menu/tab "Cerita Harian" dihapus (`FamilyStories.tsx` dihapus).
- Postingan "Adik Kecil telah menulis cerita baru…" kini punya kartu "Cerita Harian" yang bisa dibuka (tombol "Baca Cerita"/"Tutup", animasi tinggi, `aria-expanded`). Cerita dicari lewat `dedupeKey = story:<id>`.
- Berkas: `components/family/FamilyFeed.tsx` (`StoryReader`), `FamilyHome.tsx`.

## 3. Peti terbuka berwarna "terbuka"
- Kartu peti yang sudah diklaim memakai semantik hijau (cahaya dan sinar `OpenedChest` hijau matcha).

## 4. Inspektur Saku tidak dobel
- Tab Peta (dewasa): ringkasan ditampilkan sekali; sidebar tidak mengulang Inspektur Saku di halaman Jalur Kas.
- Tab Celengan anak: satu `KidInvestigation`.
- Tiga kartu angka memakai warna netral; hanya status utama yang berwarna.

## 5. Tombol Catat Kas
- Ikon "+" tidak ganda dan teks "sekarang" dihapus.

## 6. Notifikasi pojok kanan-bawah
- `lib/notify.ts` + `components/ui/ToastHost.tsx`: kartu meluncur dari kanan ke kiri (spring), keluar ke kanan, bilah waktu tipis, maksimal 4 tumpuk, pesan kembar tidak ditumpuk.
- Di ponsel berada di atas bilah menu bawah; menghormati `prefers-reduced-motion`.
- Dipakai di Beranda Keluarga, Jalur Kas, Misi/Medali, Pet, Dompet Poin. Toast hadiah dari store dijembatani lewat `FloatingRewardBanner`.
- Notifikasi sukses yang sudah ditampilkan store tidak diulang di komponen (hanya kegagalan yang ditambahkan).

## 7. Ikon hadiah poin tidak ganda
- Satu ikon pada tombol hadiah.

## 8. Kirim gambar di Chat Keluarga
- Tombol foto + pratinjau sebelum kirim, bisa kirim foto saja atau foto + teks.
- Konversi WebP hemat khusus chat (lebar 720px, kualitas 0.72, maks ±200 KB) lewat `CHAT_WEBP_OPTIONS`.
- Penyimpanan hemat: hanya 12 pesan bergambar terbaru yang menyimpan foto; saat kuota localStorage penuh, foto chat terlama dibuang lebih dulu.
- Ketuk foto untuk memperbesar (Escape/ketuk latar menutup).

## 9. Dompet Poin & Pencairan
- Dua kolom pada wadah ≥ 48rem (saldo + form | riwayat), satu kolom di ponsel.
- Pilihan nominal cepat (1.000 / 2.500 / 5.000 / Semua), hint kekurangan poin.
- Riwayat tiket ringkas satu baris per tiket, ringkasan "Sudah disetujui / Menunggu", filter status, daftar bergulir (maks 22rem) sehingga tidak memanjangkan halaman.
- Pesan hasil lewat notifikasi.

## 10. Mood & Diagnosis Mochi
- Diagnosis kini disampaikan pet lewat gelembung bicara tepat di bawah pet (ekor menunjuk pet): "{Pet} merasa …", teks muncul huruf demi huruf, pet ikut bergoyang saat "bicara", indikator halaman dan tombol "Dengar lagi".
- Topik: Diagnosis, Kabar Dompet, Pertumbuhan, Streak, Awas Bocor Halus.
- Berkas: `components/pets/PetSpeechBubble.tsx`.

## 11. Gelar & Latar Badge
- Teks "Fase n/8" dihapus dari badge/pil (kartu pet, Jalur Kas, shell, postingan pet); yang tampil nama fase saja bila relevan.
- Sistem Gelar (tulisan pengenal) + Latar (efek visual: pola, kilau, aurora, holo, bara, kosmos, radiant) dengan rarity Umum / Langka / Epik / Mitos.
- Cara mendapat: hadiah awal, Butik (Poin), klaim Medali di Misi (gelar medali + latar tingkat), Peti Harta Peta Jalur Kas (gelar di hari ke-7, 21, 35, 49, 63, 77; latar di hari ke-14, 28, 42, 56, 70, 84).
- Koleksi: tab Gelar | Latar, filter status (Milikku/Dijual/Terkunci/Semua) dan rarity, pratinjau langsung, beli/pasang. Akses dari tombol "Ganti" di kartu pet dan kategori "Gelar & Latar" di Butik.
- Dipamerkan di postingan Beranda Keluarga, komentar, peringkat, chat, dan kartu pet.
- Data per profil (`ownedTitleIds`, `ownedBadgeBgIds`, `equippedTitleId`, `equippedBadgeBgId`) bersifat opsional dengan default = hadiah awal, jadi tidak perlu migrasi. Profil demo anak diberi koleksi contoh.
- Berkas: `lib/badge-catalog.ts`, `components/badges/*`, `globals.css` (`.tb*`), `useBukuDompetStore.ts`.

## 12. Modal Kirim Hadiah Poin
- Satu palet krem/putih dengan aksen madu untuk koin; kotak merah/hijau/biru/kuning dihapus; ringkasan jadi satu kartu dua baris.
- Animasi baru: pengirim "melempar" (squash), koin melengkung berputar sepanjang lintasan, riak + percikan kilau di penerima, penerima melompat, "+N" muncul. Mengikuti `prefers-reduced-motion`.

## Keterbatasan yang jujur
- Profil demo yang sudah tersimpan di localStorage pengguna tidak mendapat koleksi contoh Gelar/Latar (hanya instal baru/reset); item bisa dibeli/diperoleh normal.
- Foto chat lama dipangkas otomatis (hanya 12 terbaru) demi kuota penyimpanan lokal.

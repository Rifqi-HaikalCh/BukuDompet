# Rancangan & Evaluasi Versi 5.2

Ringkasan keputusan dan implementasi untuk 11 poin umpan balik Versi 5.2.

## Per poin

| # | Masalah | Keputusan |
|---|---------|-----------|
| 1 | Modal hadiah peti terbuka terlihat dobel | Satu modal saja; lapisan ganda dihapus |
| 2 | Cerita Harian anak SD tidak terbaca di Beranda Keluarga | Tab "Cerita" di Beranda Keluarga (`FamilyStories`), tampil untuk semua anggota keluarga |
| 3 | Arcade tersembunyi di bawah Misi | Menu **Cerita** anak SD kini 3 panel: **Peta, Games, Celengan**. Inspektur Saku digabung ke Celengan. Arcade dicabut dari halaman Misi. Tautan `?tab=games` / `?tab=piggy` didukung |
| 4 | Level, soal baru, simpan progres, batas main | Lihat "Arcade jangka panjang" di bawah |
| 5 | Sound & backsound arcade | Efek: benar (naik nada sesuai beruntun), salah, balik kartu, cocok, mulai, menang, naik level, coba lagi, peringatan waktu. Musik **arcade** 128 BPM (bass, arpeggio, melodi, perkusi) selama tantangan berjalan |
| 6 | Backsound semua halaman | Musik santai menyala saat tombol login ditekan (gestur pengguna) dan mengalir antarhalaman. Halaman login senyap. Pilihan nyala/mati diingat (`bukudompet-bgm`) |
| 7 | Lemari | Dipindah tepat di bawah karakter pet (di atas "Mood & Diagnosis Finansial Mochi"), kata "cepat" dihapus |
| 8 | Leaderboard | Tab "Peringkat" di Beranda Keluarga: Poin terbanyak dan streak terpanjang |
| 9 | Pesan WebP | Dihapus dari Beranda Keluarga (urusan sistem) |
| 10 | Layout menu Supervisor | Sidebar kiri di desktop, bilah bawah di mobile; ikon mata dihapus; tiap menu punya keterangan singkat |
| 11 | Peta Perjalanan Hari ke-N | Lihat "Peta Perjalanan" di bawah |

## Arcade jangka panjang (poin 4)
- **5 level** per game: Pemula, Penjelajah, Petualang, Jagoan, Legenda. Poin 6/8/10/12/15 dan Stage XP 8/10/12/15/18.
- **Naik level**: lulus (>= 60%) 2 ronde di level yang sedang dikejar, atau skor sempurna sekali. Mode partisipasi (napas, kebaikan, kartu terima kasih) hanya naik lewat 2 ronde lulus karena selalu bisa 100%.
- **Bank soal**: puluhan soal per mode pilihan, tersusun naik tingkat per level; generator (hitung, jam, uang) tidak terbatas. Urutan soal diacak deterministik (tanpa `Math.random`). Penunjuk soal (`cursor`) maju tiap ronde baru supaya soal tidak berulang sebelum bank habis, lalu diacak ulang.
- **Simpan progres**: ronde berjalan disimpan tiap soal selesai (`arcadeSessions`). Menutup lembar atau memuat ulang halaman lalu membuka game yang sama menampilkan **"Lanjutkan (sudah n soal)"**. Level tertinggi per game tersimpan di `arcadeProgress`.
- **Batas screen time**: default 8 ronde dan 20 menit per hari. Pewaktu hanya berhitung saat tab terlihat, disimpan tiap 5 detik. Peringatan bunyi di sisa 2 menit. Saat habis, ronde ditutup dengan pesan "Waktu Main Habis" dan progres tetap tersimpan untuk besok. Wali mengatur batas (4-12 ronde, 10-45 menit) dan melihat pemakaian hari ini di panel Pantau.
- **Hadiah & kabar keluarga**: ronde lulus menambah Poin/XP lewat `awardReward` dan membuat kabar di Beranda Keluarga. Maksimal 4 ronde berhadiah per hari; setelah itu tetap naik level tanpa Poin.

## Peta Perjalanan (poin 11)
- `journeyStartDate` = `createdAt` akun (atau catatan paling awal bila lebih awal), dinormalisasi 00:00.
- `todayStep = floor((hari ini - journeyStartDate) / 1 hari) + 1`; pijakan 1..`todayStep + 5`, nomor tidak pernah direset.
- Status: `active_today`, `completed_safe`, `completed_warn`, `missed_frozen`. Popover "Perjalanan Hari ke-{k}" memuat tanggal asli.
- Peti Harta tiap kelipatan 7 hari; Gerbang Transisi Bioma tiap 30 hari; 12 bioma berulang setelah setahun.
- Kotak peta `h-[480px] md:h-[540px] overflow-y-auto` bergulir halus ke "Hari ke-{todayStep}". Header: "Total Perjalananmu: Hari ke-N sejak mulai menggunakan BukuDompet".
- Seed demo mulai 17 hari lalu sehingga hari ini = Hari ke-18 (Hari ke-1 sampai 18 terlihat).

## Evaluasi & batasan
- **Bank soal terbatas**: ±26 soal per mode pilihan; pemakaian harian jauh lebih dari itu akan memutar ulang soal dengan urutan teracak baru.
- **Musik**: peramban memblokir suara otomatis. Musik mulai di tombol login; setelah muat ulang penuh musik menyambung di sentuhan pertama.
- **Cerita Harian anak SD** terbaca oleh seluruh anggota keluarga atas permintaan.
- **Batas main** hanya untuk Games; tidak membatasi bagian aplikasi lain.
- Perbaikan sampingan: musik sempat dimatikan oleh halaman login tepat setelah login berhasil; kini hanya dimatikan saat belum masuk.

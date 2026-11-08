# Versi 5.4 — Perbaikan kecil, keamanan, dan GO LIVE

## 1. Profil karakter anak lebih besar (mobile)
`src/app/supervisor/page.tsx`: kartu avatar di hero Supervisor kini `w-44 h-48` di mobile (tengah, tampil penuh), dan kembali `w-28 h-32` di layar ≥ sm.

## 2. Edit / hapus catatan HARI INI
- Aturan di `src/lib/transaction-rules.ts`; aksi `updateTransaction` / `removeTransaction` di store.
- Hanya pemilik, hanya hari ini. Hari sebelumnya terkunci (chip "Terkunci"). Tabungan dan pemasukan otomatis dari pencairan Poin juga terkunci. Catatan rinci (struk) hanya boleh ganti judul/kategori.
- Anti-curang: Poin/XP tidak ditarik saat hapus, dan hapus mencatat `deletedRewardLedger` sehingga kuota 3 catatan berpoin/hari tidak bisa diulang dengan hapus-catat-hapus.
- Pengaman: edit → modal konfirmasi (nilai sebelum → sesudah); hapus → modal konfirmasi.
- Bug yang ditemukan saat uji dan sudah diperbaiki: modal konfirmasi tidak bisa ditekan di atas lembar edit (drawer modal mengunci klik di luar dirinya). Lembar kini ditutup saat konfirmasi, "Batal" kembali ke lembar dengan isian yang sama; `CozyConfirmModal` juga diberi `pointer-events-auto`.

## 3. Pemeriksaan keamanan (hasil & perbaikan)
- Ditemukan: halaman `/admin` dan `/supervisor` bisa dibuka peran lain lewat alamat atau tombol pintasan; Supervisor bisa berganti ke akun Supervisor lain tanpa PIN dan masuk sebagai anak ("Layar User"). → `AppProviders` kini punya `roles` (admin / supervisor / user+schoolchild), peran lain dialihkan ke rumahnya; pintasan lintas peran dan pengganti supervisor dihapus dari `SupervisorShell`.
- Pesan galat login tidak lagi membocorkan PIN ("Petunjuk demo") dan tidak lagi menyebut panel demo.
- Pendaftaran akun id kini UUID asli (agar sinkron ke `profiles.id`).

## 4. Mode demo diakhiri
Dihapus: panel "Mode Cepat Demo / Masuk Instan" (login), Sandbox / Reset Demo / Uji Streak Padam / Uji Catat Kas (admin), "Pintu Keluarga (Demo Cepat)" dan lencana Simulasi (shell user), aksi store `toggleSandboxMode`, `resetToDemoSeed`, `setColdStreakMode`, seluruh seed transaksi, misi, lencana, penukaran, dan resurrection akun seed pada `merge`.
Penyimpanan lokal naik versi (`bukudompet-v4-storage` → 6, `bukudompet-v5-family` → 2): data demo di perangkat dibuang sekali, lalu aplikasi memakai 12 akun asli. Seed demo di migrasi 001 dan 002 dikomentari.

## 5. 12 akun asli
| # | Username | Nama | Peran | PIN |
|---|---|---|---|---|
| 1 | ekal_admin | Ekal (Admin) | admin | 0000 |
| 2 | bunda_sv | Bunda (Supervisor) | supervisor | 1111 |
| 3 | ayah_sv | Ayah (Supervisor) | supervisor | 1111 |
| 4 | bunda | Bunda | user | 2222 |
| 5 | ayah | Ayah | user | 2222 |
| 6 | tiara | Tiara | user | 1111 |
| 7 | aira | Aira | schoolchild | 1111 |
| 8 | ekal | Ekal | user | 1111 |
| 9 | tania | Tania | user | 1111 |
| 10 | sofia | Sofia | user | 1111 |
| 11 | ekal_sd | Ekal (Anak SD) | schoolchild | 2222 |
| 12 | ekal_sv | Ekal (Supervisor) | supervisor | 3333 |

Masuk dengan mengetik nama (mis. "Ekal"). Bila nama cocok dengan beberapa akun, layar Login meminta memilih peran dulu, lalu PIN.
User dan schoolchild masing-masing 500 Poin (saldo dan total poin). Akun baru memulai di Fase 1 tanpa streak; tidak dinginkan sebelum catatan pertama.

Pengawasan: Ayah & Bunda (Supervisor) → Ayah, Bunda, Tiara, Aira, Tania, Ekal (User) dan Ekal (Anak SD). Ekal (Supervisor) → Sofia, Ekal (User), Ekal (Anak SD).
Asumsi: "Ekal" pada daftar orang tua dibaca sebagai kedua akun Ekal. Ubah di `AWASI_ORANG_TUA` (store) dan blok `supervisor_assignments` di SQL bila hanya satu.

## 6. Database
`supabase/migrations/004_v5_4_go_live.sql`: pratinjau (baca saja) → hapus data demo (transaksi, misi, lencana, penukaran, cerita, tabungan, arcade, feed, chat, penugasan, profil demo) → isi 12 akun + penugasan (tanpa menimpa akun yang sudah ada) → verifikasi. Langkah 4 (hapus semua profil di luar 12 akun) sengaja dikomentari.

## 7. Batasan yang perlu diketahui
- Aplikasi tetap local-first: data tiap perangkat terpisah; Supabase hanya cadangan best-effort. Poin 500 dan akun ada di tiap perangkat dari seed yang sama.
- Login dan penjaga peran berjalan di sisi klien; PIN tersimpan teks biasa (di localStorage dan tabel profiles). Ini cukup untuk keluarga, bukan keamanan tingkat server.
- Admin masih bisa melihat PIN Supervisor di panel manajemen dan berpindah ke tampilan User/Supervisor.
- `syncWithSupabaseIfAvailable` menimpa transaksi lokal dengan 50 baris terbaru dari Supabase tanpa filter pengguna.

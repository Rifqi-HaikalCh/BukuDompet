# Versi 5.5 — Penyimpanan ke database yang benar-benar tersimpan

## 1. Masalah (dilaporkan dari production)
Ubah nama pet, anggaran bulanan, catat kas, dll. tampak berhasil tetapi hanya tersimpan di localStorage; tabel Supabase tidak berubah.

### Akar masalah (hasil audit kode)
1. Aplikasi *local-first*: hanya ±7 aksi yang "menembak dan melupakan" (`fire-and-forget`) ke Supabase, sisanya (profil/pet, anggaran, transaksi, misi, tabungan, cerita, arcade, chat, dst.) **tidak punya jalur ke database sama sekali**.
2. Penulisan yang ada memakai kunci publik (anon) dari browser, galatnya tidak diperiksa (`.then()` tanpa cek `error`), id bukan UUID (ditolak kolom `uuid`), dan tabel tidak punya RLS yang benar. Hasilnya gagal diam-diam, UI tetap "berhasil".
3. PIN akun ada di bundle JS dan repo; siapa pun bisa membaca/menulis database dengan kunci publik.

## 2. Rancangan: "server sebagai satu-satunya pintu"
```
Browser ──(cookie sesi httpOnly)──► /api/* (Next.js, kunci rahasia) ──RPC──► fungsi app_* (SECURITY DEFINER) ──► tabel
```
- Browser tidak punya kunci Supabase. Tabel: RLS aktif + `REVOKE` untuk `anon`/`authenticated`. Fungsi `app_*` hanya bisa dieksekusi `service_role`.
- Login: `/api/auth/login` memeriksa PIN ter-hash (bcrypt/pgcrypto), 6x salah → akun terkunci 10 menit. Sesi = cookie bertanda tangan HMAC (httpOnly, SameSite=Strict, Secure di production, 30 hari) berisi `{uid, ver, exp}`. Ganti PIN / nonaktifkan akun menaikkan `session_ver` → semua sesi lama langsung mati.
- Data: toko dokumen JSONB `sync_docs` (21 koleksi) dengan `rev` per dokumen (konkurensi optimistis), `seq` global (paging tarik), nisan hapus (tombstone), `epoch`, kebijakan tulis per koleksi (`any|admin|owner|owner_sup|profile`) dan cakupan keluarga/privat. Supervisor hanya menerima data anak yang ditugaskan; user hanya datanya sendiri.
- Klien (`src/lib/sync/`): mesin sinkron berbasis **selisih** antara isi store dan "bayangan" yang tersimpan di perangkat. Tidak ada antrean yang bisa hilang: tutup tab, refresh, atau offline lalu online tetap terkirim. Penggabungan 3 arah untuk profil (selisih `points_balance`/`lifetime_points`/`xp` dijumlahkan, bukan ditimpa), gabungan union untuk feed/progres/reminder.
- Keselamatan data: rem penghapusan massal (≥8 dan >50% koleksi ditahan sampai dikonfirmasi), epoch berubah → data lokal diunggah ulang, logout aman (kirim dulu, baru bersihkan, ada konfirmasi bila ada data yang belum tersimpan atau milik akun lain).
- UI: pil status sinkron (Tersimpan / Menyimpan / Offline • N menunggu / Gagal / Perlu masuk lagi / Perubahan tertahan) dengan "Sinkronkan sekarang" dan "Pulihkan dari server". **Tidak ada lagi tampilan "berhasil" yang palsu.**

## 3. Berkas
- `supabase/migrations/005_v5_5_server_sync.sql` (idempoten; jalankan SEKALI di SQL Editor setelah 001–004).
- Server: `src/lib/supabase/admin.ts`, `src/lib/server/{session,db,http}.ts`, `src/app/api/{auth,sync,admin,health}`.
- Klien: `src/lib/sync/*`, `src/components/ui/{SyncStatusPill,SafeLogout,AppProviders}.tsx`, login & admin (daftarkan akun, ubah PIN).
- Dihapus: `src/lib/supabase/client.ts` dan `server.ts` (jalur browser yang tidak aman), kode tulis-diam-diam lama di kedua store, `pin_code` di klien.

## 4. Pengujian (semua lulus)
- `tests/sync/db.test.mjs` — 48 uji di Postgres 16 sungguhan (RLS, kebijakan, login/kunci, rev/konflik, tombstone, epoch, paging).
- `tests/sync/engine.test.mts` — 26 uji mesin sinkron terhadap Postgres sungguhan (offline, konflik 2 perangkat, poin dijumlahkan, rem hapus massal, sesi dicabut, 600 dokumen).
- E2E browser (Playwright, `next start` + supabase-js nyata + Postgres): ganti nama pet, catat kas, budget oleh admin → baris ada di `sync_docs` dan tampil di perangkat kedua; supervisor melihat anak yang dipantau, supervisor/user lain tidak; offline → "Offline • N menunggu" → online otomatis terkirim; keluar mengirim dulu lalu membersihkan data lokal; ganti PIN mengeluarkan sesi lama; 6x PIN salah mengunci akun.
- Temuan E2E yang diperbaiki: akun biasa mengunggah penugasan/profil bawaan → ditolak server → peringatan "perubahan tertahan" palsu. Kini bawaan tidak diunggah dan tidak dihitung sebagai "data akun lain".
- `tsc`, `eslint`, `next build` bersih; bundle klien tidak memuat kunci rahasia maupun PIN.

## 5. Langkah deploy
1. Supabase → SQL Editor: jalankan `005_v5_5_server_sync.sql` (sekali; aman diulang).
2. Vercel → Settings → Environment Variables: `SUPABASE_SECRET_KEY` (server-only), `SESSION_SECRET` (acak ≥ 32 karakter), pertahankan `NEXT_PUBLIC_SUPABASE_URL`. Redeploy.
3. Buka `/api/health` → harus `ok:true`, `migrated:true`.
4. Login pertama di browser yang masih menyimpan data lama: masuk sebagai **ekal_admin** agar data lokal lama terunggah ke server.
5. PIN lama pernah ada di repo/bundle: ganti lewat Admin → "Ubah PIN Akun".

## 6. Batasan yang jujur
- Model keluarga tepercaya: poin/XP dihitung di klien; server hanya menjaga (mis. penurunan poin oleh non-pemilik ditolak), bukan menghitung ulang.
- Konflik diselesaikan "terakhir menang" + penjumlahan selisih untuk poin; bukan CRDT penuh.
- Sinkron berkala (±12 dtk) + saat fokus/online, bukan realtime.
- Tidak ada login offline (PIN diperiksa server).
- Sesi stateless: keluar tidak mencabut token di server, hanya ganti PIN / nonaktifkan akun yang mencabutnya.
- Penguncian akun bisa dipakai orang iseng (tebak PIN) untuk mengunci akun 10 menit.
- Kasus langka: respons hilang + perubahan serentak dapat menggandakan selisih poin sekali.
- Data akun lain yang tertinggal di perangkat non-admin hanya dijaga sampai keluar (pengguna diminta konfirmasi).

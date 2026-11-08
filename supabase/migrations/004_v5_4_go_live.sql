-- ============================================================
-- BukuDompet Versi 5.4 — GO LIVE
-- 1) Hapus SEMUA data demo   2) Daftarkan 12 akun keluarga asli (+500 Poin untuk User & Anak SD)
--
-- CARA PAKAI (Supabase > SQL Editor), jalankan BERURUTAN dan baca hasilnya tiap langkah:
--   LANGKAH 0  : pratinjau (hanya membaca) -> pastikan yang akan dihapus memang data demo.
--   LANGKAH 1-2: hapus demo + isi akun asli (satu transaksi; gagal = batal semua).
--   LANGKAH 3  : verifikasi hasil.
--   LANGKAH 4  : OPSIONAL & SENGAJA DIKOMENTARI — hapus akun uji lain di luar 12 akun asli.
--
-- Aman dijalankan ulang: akun asli yang sudah ada TIDAK ditimpa (poin & PIN yang sudah berjalan tidak direset).
-- JANGAN menjalankan ulang isi 001/002 versi lama yang masih berisi seed demo; seed demo di berkas
-- 001 & 002 pada repo ini sudah dikomentari.
--
-- Catatan: kunci masuk aplikasi adalah username (unik) + PIN. PIN di tabel ini tersimpan apa adanya
-- (teks biasa) mengikuti rancangan aplikasi saat ini; lihat catatan keamanan di docs/rancangan-v5-4.md.
-- ============================================================

-- ------------------------------------------------------------
-- LANGKAH 0 — PRATINJAU (hanya membaca)
-- ------------------------------------------------------------
SELECT id, username, display_name, role
FROM profiles
WHERE id IN (
    '11111111-1111-4111-8111-111111111111', -- Adik Rara
    '11111111-1111-4111-8111-222222222222', -- Adik Bima
    '11111111-1111-4111-8111-333333333333', -- Sepupu Citra
    '11111111-1111-4111-8111-444444444444', -- Adik Kecil (Kelas 3 SD)
    '22222222-2222-4222-8222-222222222222', -- Ayah & Ibu (Orang Tua)
    '22222222-2222-4222-8222-333333333333', -- Bibi Ratna (Wali)
    '99999999-9999-4999-8999-999999999999'  -- Abang (Admin demo)
  )
   OR username IN ('adik', 'bima', 'citra', 'adik_sd', 'orangtua', 'wali', 'abang')
ORDER BY role, username;

-- Profil lain di luar demo & 12 akun asli (kemungkinan akun uji yang kamu daftarkan sendiri):
SELECT id, username, display_name, role, created_at
FROM profiles
WHERE id NOT IN (
    '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-222222222222',
    '11111111-1111-4111-8111-333333333333', '11111111-1111-4111-8111-444444444444',
    '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-333333333333',
    '99999999-9999-4999-8999-999999999999'
  )
  AND id::text NOT LIKE '00000000-0000-4000-8000-0000000000__'
ORDER BY created_at;

-- ------------------------------------------------------------
-- LANGKAH 1 + 2 — HAPUS DEMO, LALU ISI AKUN ASLI (satu transaksi)
-- ------------------------------------------------------------
BEGIN;

-- 1a. Hapus baris turunan lebih dulu secara eksplisit (semua FK juga ON DELETE CASCADE, ini sabuk pengaman).
DO $$
DECLARE
  demo_ids UUID[] := ARRAY[
    '11111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-222222222222'::uuid,
    '11111111-1111-4111-8111-333333333333'::uuid,
    '11111111-1111-4111-8111-444444444444'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-333333333333'::uuid,
    '99999999-9999-4999-8999-999999999999'::uuid
  ];
BEGIN
  DELETE FROM transaction_items
   WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = ANY(demo_ids));
  DELETE FROM transactions        WHERE user_id = ANY(demo_ids);
  DELETE FROM user_missions       WHERE user_id = ANY(demo_ids);
  DELETE FROM user_badges         WHERE user_id = ANY(demo_ids);
  DELETE FROM point_redemptions   WHERE user_id = ANY(demo_ids);
  DELETE FROM daily_stories       WHERE user_id = ANY(demo_ids);
  DELETE FROM savings_goals       WHERE user_id = ANY(demo_ids);
  DELETE FROM arcade_plays        WHERE user_id = ANY(demo_ids);
  DELETE FROM family_chat_messages WHERE author_id = ANY(demo_ids);
  DELETE FROM family_feed_posts   WHERE author_id = ANY(demo_ids);
  DELETE FROM supervisor_assignments
   WHERE supervisor_id = ANY(demo_ids) OR user_id = ANY(demo_ids);

  -- 1b. Terakhir: profil demo itu sendiri (juga yang dikenali lewat username).
  DELETE FROM profiles
   WHERE id = ANY(demo_ids)
      OR username IN ('adik', 'bima', 'citra', 'adik_sd', 'orangtua', 'wali', 'abang');
END $$;

-- 2a. 12 akun asli. Tanpa ON CONFLICT yang menimpa: akun yang sudah ada dibiarkan apa adanya.
INSERT INTO profiles (
  id, username, display_name, role, pin_code, avatar_theme,
  xp, level, current_stage, stage_xp, stage_recorded_days,
  pet_custom_name, active_species, unlocked_species, owned_pets, owned_accessories, equipped_accessories,
  points_balance, lifetime_points,
  current_streak, longest_streak, streak_freeze_count,
  last_recorded_date, monthly_budget_target, monthly_saving_target
) VALUES
  ('00000000-0000-4000-8000-000000000001', 'ekal_admin', 'Ekal (Admin)', 'admin', '0000', 'mochi-boss',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY[]::TEXT[], '{}'::jsonb,
   0, 0, 0, 0, 0, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000002', 'bunda_sv', 'Bunda (Supervisor)', 'supervisor', '1111', 'mochi-parent',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY[]::TEXT[], '{}'::jsonb,
   0, 0, 0, 0, 0, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000003', 'ayah_sv', 'Ayah (Supervisor)', 'supervisor', '1111', 'mochi-parent',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY[]::TEXT[], '{}'::jsonb,
   0, 0, 0, 0, 0, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000004', 'bunda', 'Bunda', 'user', '2222', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000005', 'ayah', 'Ayah', 'user', '2222', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000006', 'tiara', 'Tiara', 'user', '1111', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000007', 'aira', 'Aira', 'schoolchild', '1111', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 150000, 30000),
  ('00000000-0000-4000-8000-000000000008', 'ekal', 'Ekal', 'user', '1111', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000009', 'tania', 'Tania', 'user', '1111', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000010', 'sofia', 'Sofia', 'user', '1111', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 1500000, 300000),
  ('00000000-0000-4000-8000-000000000011', 'ekal_sd', 'Ekal (Anak SD)', 'schoolchild', '2222', 'mochi-cat',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY['head_straw_hat', 'bg_warm_room'], '{}'::jsonb,
   500, 500, 0, 0, 1, CURRENT_DATE - 1, 150000, 30000),
  ('00000000-0000-4000-8000-000000000012', 'ekal_sv', 'Ekal (Supervisor)', 'supervisor', '3333', 'mochi-parent',
   0, 1, 1, 0, 0,
   'Mochi', 'chubby_cat', ARRAY['chubby_cat'],
   jsonb_build_object('chubby_cat', jsonb_build_object('species','chubby_cat','customName','Mochi','currentStage',1,'stageXp',0,'stageRecordedDays',0,'unlockedAt',to_char(CURRENT_DATE,'YYYY-MM-DD'))),
   ARRAY[]::TEXT[], '{}'::jsonb,
   0, 0, 0, 0, 0, CURRENT_DATE - 1, 1500000, 300000)
ON CONFLICT DO NOTHING;

-- 2b. Pengawasan:
--   Ayah & Bunda (Supervisor) -> Ayah, Bunda, Tiara, Aira, Tania, Ekal (User) dan Ekal (Anak SD)
--   Ekal (Supervisor)         -> Sofia, Ekal (User), Ekal (Anak SD)
INSERT INTO supervisor_assignments (supervisor_id, user_id) VALUES
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000007'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000011')
ON CONFLICT (supervisor_id, user_id) DO NOTHING;

COMMIT;

-- ------------------------------------------------------------
-- LANGKAH 3 — VERIFIKASI (hasil yang diharapkan: 12 akun; User & Anak SD masing-masing 500 poin)
-- ------------------------------------------------------------
SELECT username, display_name, role, pin_code, points_balance, lifetime_points
FROM profiles
ORDER BY id;

SELECT sv.display_name AS supervisor, us.display_name AS mengawasi, us.role
FROM supervisor_assignments a
JOIN profiles sv ON sv.id = a.supervisor_id
JOIN profiles us ON us.id = a.user_id
ORDER BY sv.display_name, us.display_name;

-- Harus 0 semua (tidak ada data demo tersisa):
SELECT
  (SELECT COUNT(*) FROM transactions)       AS transaksi,
  (SELECT COUNT(*) FROM user_missions)      AS misi,
  (SELECT COUNT(*) FROM user_badges)        AS lencana,
  (SELECT COUNT(*) FROM point_redemptions)  AS penukaran,
  (SELECT COUNT(*) FROM daily_stories)      AS cerita,
  (SELECT COUNT(*) FROM family_chat_messages) AS chat,
  (SELECT COUNT(*) FROM family_feed_posts)  AS feed;

-- ------------------------------------------------------------
-- LANGKAH 4 — OPSIONAL (dikomentari): hapus semua profil di luar 12 akun asli.
-- Jalankan HANYA bila hasil pratinjau LANGKAH 0 (daftar kedua) berisi akun uji yang memang ingin dibuang.
-- ------------------------------------------------------------
-- DELETE FROM profiles
--  WHERE id::text NOT LIKE '00000000-0000-4000-8000-0000000000__';

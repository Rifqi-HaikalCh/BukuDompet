-- ============================================================
-- BUKUDOMPET DATABASE SCHEMA & REALISTIC SEED DATA (VERSI 3.0)
-- Multi-User RBAC, 8-Stage Caste Economy, Pet Boutique & Assignments
-- Migration: 001_init_bukudompet.sql (Idempotent / Safe for Existing DBs)
-- ============================================================

-- 1. Profiles & Gamification State (Supports Multiple Accounts per Role)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'user')),
  pin_code TEXT NOT NULL DEFAULT '1234',
  avatar_theme TEXT DEFAULT 'mochi-cat',
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  current_stage INT NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),
  stage_xp INT NOT NULL DEFAULT 0,
  stage_recorded_days INT NOT NULL DEFAULT 0,
  pet_custom_name TEXT NOT NULL DEFAULT 'Mochi',
  active_species TEXT NOT NULL DEFAULT 'cat' CHECK (active_species IN ('cat', 'capybara', 'fox', 'red_panda')),
  unlocked_species TEXT[] NOT NULL DEFAULT ARRAY['cat'],
  owned_accessories TEXT[] NOT NULL DEFAULT ARRAY['head_paper_hat'],
  equipped_accessories JSONB NOT NULL DEFAULT '{}'::jsonb,
  points_balance INT NOT NULL DEFAULT 0, -- 1 Point = Rp 1 (Hardcore Cozy Pacing)
  lifetime_points INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  streak_freeze_count INT NOT NULL DEFAULT 1,
  last_recorded_date DATE,
  monthly_budget_target NUMERIC(12,2) NOT NULL DEFAULT 1500000,
  monthly_saving_target NUMERIC(12,2) NOT NULL DEFAULT 300000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Schema Upgrade for Existing Databases (Versi 1.0 / 2.0 -> Versi 3.0)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_stage INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stage_xp INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage_recorded_days INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pet_custom_name TEXT NOT NULL DEFAULT 'Mochi',
  ADD COLUMN IF NOT EXISTS active_species TEXT NOT NULL DEFAULT 'cat',
  ADD COLUMN IF NOT EXISTS unlocked_species TEXT[] NOT NULL DEFAULT ARRAY['cat'],
  ADD COLUMN IF NOT EXISTS owned_accessories TEXT[] NOT NULL DEFAULT ARRAY['head_paper_hat'],
  ADD COLUMN IF NOT EXISTS equipped_accessories JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Supervisor Assignments (Many-to-Many RBAC Mapping between Supervisor and User)
CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supervisor_id, user_id)
);

-- 3. Transactions (Header)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  need_or_want TEXT NOT NULL CHECK (need_or_want IN ('need', 'want', 'income')),
  title TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  is_itemized BOOLEAN NOT NULL DEFAULT FALSE,
  points_earned INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transaction Items (Detailed Breakdown)
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

-- 5. Missions & Challenges (Daily, Weekly, Saving, Budget)
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'saving_challenge', 'budget_challenge')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  reward_points INT NOT NULL,
  reward_xp INT NOT NULL,
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  valid_until DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Achievements & Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  praise_quote TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_code)
);

-- 7. Point Cashout / Redemption Requests (1 Poin = Rp 1)
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points_redeemed INT NOT NULL,
  rupiah_value NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- ============================================================
-- SEED DATA MULTI-USER BUKUDOMPET VERSI 3.0
-- (1 Admin, 2 Supervisor, 3 User dengan Pemetaan Assignment)
-- ============================================================

INSERT INTO profiles (
  id, username, display_name, role, pin_code, avatar_theme,
  xp, level, current_stage, stage_xp, stage_recorded_days,
  pet_custom_name, active_species, unlocked_species, owned_accessories, equipped_accessories,
  points_balance, lifetime_points,
  current_streak, longest_streak, streak_freeze_count,
  last_recorded_date, monthly_budget_target, monthly_saving_target
) VALUES
  -- USER 1: Adik Rara (Stage 2: Penabung Selimut)
  (
    '11111111-1111-4111-8111-111111111111',
    'adik',
    'Adik Rara (Mahasiswi)',
    'user',
    '1111',
    'mochi-cat',
    630,
    6,
    2,
    280,
    6,
    'Mochi',
    'cat',
    ARRAY['cat'],
    ARRAY['head_paper_hat', 'neck_bandana', 'hand_tin_can', 'decor_potted_plant'],
    '{"head":"head_paper_hat","neck":"neck_bandana","decor":"decor_potted_plant"}'::jsonb,
    1850,
    3850,
    6,
    9,
    2,
    CURRENT_DATE,
    1800000,
    350000
  ),
  -- USER 2: Adik Bima (Stage 3: Pelajar Teliti)
  (
    '11111111-1111-4111-8111-222222222222',
    'bima',
    'Adik Bima (SMA)',
    'user',
    '1212',
    'mochi-capybara',
    1450,
    12,
    3,
    420,
    8,
    'Kapi',
    'capybara',
    ARRAY['cat', 'capybara'],
    ARRAY['head_paper_hat', 'head_graduation_cap', 'eyes_round_glasses', 'vehicle_skateboard'],
    '{"head":"head_graduation_cap","eyes":"eyes_round_glasses","vehicle":"vehicle_skateboard"}'::jsonb,
    2400,
    5400,
    10,
    14,
    2,
    CURRENT_DATE,
    1200000,
    250000
  ),
  -- USER 3: Sepupu Citra (Stage 1: Perantau Kardus)
  (
    '11111111-1111-4111-8111-333333333333',
    'citra',
    'Sepupu Citra (Kos Baru)',
    'user',
    '1313',
    'mochi-fox',
    140,
    2,
    1,
    140,
    3,
    'Rubi',
    'cat',
    ARRAY['cat'],
    ARRAY['head_paper_hat', 'hand_tin_can'],
    '{"head":"head_paper_hat","hand":"hand_tin_can"}'::jsonb,
    620,
    620,
    3,
    3,
    1,
    CURRENT_DATE,
    1500000,
    300000
  ),
  -- SUPERVISOR 1: Ayah & Ibu (Memantau Adik Rara & Adik Bima)
  (
    '22222222-2222-4222-8222-222222222222',
    'orangtua',
    'Ayah & Ibu (Orang Tua)',
    'supervisor',
    '2222',
    'mochi-parent',
    0, 1, 1, 0, 0,
    'Mochi', 'cat', ARRAY['cat'], ARRAY[]::TEXT[], '{}'::jsonb,
    0, 0, 0, 0, 0,
    CURRENT_DATE, 1800000, 350000
  ),
  -- SUPERVISOR 2: Bibi Wali (Memantau Sepupu Citra & Adik Rara)
  (
    '22222222-2222-4222-8222-333333333333',
    'wali',
    'Bibi Ratna (Wali Kos)',
    'supervisor',
    '3333',
    'mochi-guardian',
    0, 1, 1, 0, 0,
    'Mochi', 'cat', ARRAY['cat'], ARRAY[]::TEXT[], '{}'::jsonb,
    0, 0, 0, 0, 0,
    CURRENT_DATE, 1500000, 300000
  ),
  -- ADMIN 1: Abang (Admin & Sponsor Poin)
  (
    '99999999-9999-4999-8999-999999999999',
    'abang',
    'Abang (Admin & Sponsor Poin)',
    'admin',
    '9999',
    'mochi-boss',
    3500, 18, 6, 1200, 22,
    'Sultan Mochi', 'red_panda', ARRAY['cat', 'capybara', 'fox', 'red_panda'],
    ARRAY['head_top_hat', 'eyes_monocle', 'vehicle_scooter'],
    '{"head":"head_top_hat","eyes":"eyes_monocle"}'::jsonb,
    50000, 50000, 14, 14, 5,
    CURRENT_DATE, 1800000, 350000
  )
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  pin_code = EXCLUDED.pin_code,
  avatar_theme = EXCLUDED.avatar_theme,
  xp = EXCLUDED.xp,
  level = EXCLUDED.level,
  current_stage = EXCLUDED.current_stage,
  stage_xp = EXCLUDED.stage_xp,
  stage_recorded_days = EXCLUDED.stage_recorded_days,
  pet_custom_name = EXCLUDED.pet_custom_name,
  active_species = EXCLUDED.active_species,
  unlocked_species = EXCLUDED.unlocked_species,
  owned_accessories = EXCLUDED.owned_accessories,
  equipped_accessories = EXCLUDED.equipped_accessories,
  points_balance = EXCLUDED.points_balance,
  lifetime_points = EXCLUDED.lifetime_points,
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  streak_freeze_count = EXCLUDED.streak_freeze_count,
  last_recorded_date = EXCLUDED.last_recorded_date,
  monthly_budget_target = EXCLUDED.monthly_budget_target,
  monthly_saving_target = EXCLUDED.monthly_saving_target;

-- Seed Supervisor Assignments
INSERT INTO supervisor_assignments (supervisor_id, user_id) VALUES
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-222222222222'),
  ('22222222-2222-4222-8222-333333333333', '11111111-1111-4111-8111-333333333333'),
  ('22222222-2222-4222-8222-333333333333', '11111111-1111-4111-8111-111111111111')
ON CONFLICT (supervisor_id, user_id) DO NOTHING;

-- Seed Transactions (Dengan Tarif Ekonomi Jangka Panjang Versi 3.0: Biasa +5 Poin/+10 XP, Rinci +10 Poin/+20 XP)
INSERT INTO transactions (
  id, user_id, type, category, need_or_want, title,
  total_amount, is_itemized, points_earned, xp_earned, transaction_date
) VALUES
  (
    'aaaa0001-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'income', 'Uang Saku Bulanan', 'income',
    'Transfer Uang Saku Bulanan dari Orang Tua',
    1800000, FALSE, 5, 10, CURRENT_DATE - INTERVAL '5 days'
  ),
  (
    'aaaa0002-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Siang Kantin & Air',
    24000, TRUE, 10, 20, CURRENT_DATE - INTERVAL '5 days'
  ),
  (
    'aaaa0003-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Es Kopi Susu Gula Aren',
    19000, FALSE, 5, 10, CURRENT_DATE - INTERVAL '5 days'
  ),
  (
    'aaaa0004-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kuliah/Alat Tulis', 'need',
    'Beli Alat Tulis & Print Tugas',
    31000, TRUE, 10, 20, CURRENT_DATE - INTERVAL '4 days'
  ),
  (
    'aaaa0005-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Kopi Kenangan Mantan',
    22000, FALSE, 5, 10, CURRENT_DATE - INTERVAL '4 days'
  ),
  (
    'aaaa0006-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Malam Warung Pak Kumis',
    23000, TRUE, 10, 20, CURRENT_DATE - INTERVAL '3 days'
  ),
  (
    'aaaa0007-0000-4000-8000-000000000007',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Matcha Latte Dingin',
    21000, FALSE, 5, 10, CURRENT_DATE - INTERVAL '3 days'
  ),
  (
    'aaaa0008-0000-4000-8000-000000000008',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Transportasi', 'need',
    'Naik KRL & Ojek Stasiun',
    18000, TRUE, 10, 20, CURRENT_DATE - INTERVAL '2 days'
  ),
  (
    'aaaa0009-0000-4000-8000-000000000009',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Boba Brown Sugar Fresh Milk',
    24000, FALSE, 5, 10, CURRENT_DATE - INTERVAL '2 days'
  ),
  (
    'aaaa0010-0000-4000-8000-000000000010',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Siang Warteg Bahari',
    22000, TRUE, 10, 20, CURRENT_DATE - INTERVAL '1 day'
  ),
  (
    'aaaa0011-0000-4000-8000-000000000011',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Siang Nasi Goreng & Es Teh',
    23000, TRUE, 10, 20, CURRENT_DATE
  ),
  (
    'aaaa0012-0000-4000-8000-000000000012',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Es Kopi Susu Kampus',
    16000, FALSE, 5, 10, CURRENT_DATE
  )
ON CONFLICT (id) DO UPDATE SET
  points_earned = EXCLUDED.points_earned,
  xp_earned = EXCLUDED.xp_earned;

-- Seed Transaction Items (Idempotent: clear seed items first before re-inserting)
DELETE FROM transaction_items
WHERE transaction_id IN (
  'aaaa0002-0000-4000-8000-000000000002',
  'aaaa0004-0000-4000-8000-000000000004',
  'aaaa0006-0000-4000-8000-000000000006',
  'aaaa0008-0000-4000-8000-000000000008',
  'aaaa0010-0000-4000-8000-000000000010',
  'aaaa0011-0000-4000-8000-000000000011'
);

INSERT INTO transaction_items (transaction_id, item_name, quantity, unit_price, subtotal) VALUES
  ('aaaa0002-0000-4000-8000-000000000002', 'Nasi Ayam Bakar Madu', 1, 18000, 18000),
  ('aaaa0002-0000-4000-8000-000000000002', 'Air Mineral Botol', 1, 6000, 6000),
  ('aaaa0004-0000-4000-8000-000000000004', 'Buku Catatan Bergaris', 1, 15000, 15000),
  ('aaaa0004-0000-4000-8000-000000000004', 'Pulpen Gel Hitam', 2, 5000, 10000),
  ('aaaa0004-0000-4000-8000-000000000004', 'Fotokopi Modul Kuliah', 1, 6000, 6000),
  ('aaaa0006-0000-4000-8000-000000000006', 'Nasi Goreng Spesial', 1, 15000, 15000),
  ('aaaa0006-0000-4000-8000-000000000006', 'Es Teh Manis', 1, 5000, 5000),
  ('aaaa0006-0000-4000-8000-000000000006', 'Kerupuk Kaleng', 1, 3000, 3000),
  ('aaaa0008-0000-4000-8000-000000000008', 'Tiket KRL Commuter', 1, 6000, 6000),
  ('aaaa0008-0000-4000-8000-000000000008', 'Ojek Online Stasiun', 1, 12000, 12000),
  ('aaaa0010-0000-4000-8000-000000000010', 'Nasi Sayur Sop & Telur Dadar', 1, 14000, 14000),
  ('aaaa0010-0000-4000-8000-000000000010', 'Tempe Orek & Perkedel', 1, 5000, 5000),
  ('aaaa0010-0000-4000-8000-000000000010', 'Es Jeruk Peras', 1, 3000, 3000),
  ('aaaa0011-0000-4000-8000-000000000011', 'Nasi Goreng Kampung', 1, 15000, 15000),
  ('aaaa0011-0000-4000-8000-000000000011', 'Es Teh Manis Segar', 1, 5000, 5000),
  ('aaaa0011-0000-4000-8000-000000000011', 'Kerupuk Udang', 1, 3000, 3000);

-- Seed Missions (3 Daily @ +15 Poin & +25 Stage XP, 1 Weekly @ +150 Poin & +120 Stage XP)
INSERT INTO user_missions (
  id, user_id, mission_type, title, description,
  target_value, current_value, reward_points, reward_xp, is_claimed, valid_until
) VALUES
  (
    'bbbb0001-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'daily',
    'Detektif Struk Harian',
    'Catat minimal 1 pengeluaran hari ini dengan rincian 2 sub-item spesifik.',
    1, 1, 15, 25, FALSE, CURRENT_DATE
  ),
  (
    'bbbb0002-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'daily',
    'Rem Pakem Harian',
    'Jaga pengeluaran kategori Keinginan/Jajan hari ini di bawah 50% batas harian.',
    1, 1, 15, 25, FALSE, CURRENT_DATE
  ),
  (
    'bbbb0003-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'daily',
    'Jurnal Disiplin',
    'Catat transaksi harianmu sebelum jam 21:00 WIB.',
    1, 1, 15, 25, FALSE, CURRENT_DATE
  ),
  (
    'bbbb0004-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'weekly',
    'Evaluasi Anggaran Mingguan',
    'Selesaikan 7 hari penuh dengan total pengeluaran di bawah Budget Mingguan.',
    7, 6, 150, 120, FALSE, CURRENT_DATE + INTERVAL '2 days'
  ),
  (
    'bbbb0005-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    'saving_challenge',
    'Disiplin Tabungan Bulanan Rp350.000',
    'Pertahankan sisa uang saku minimal Rp350.000 hingga akhir bulan.',
    350000, 350000, 150, 120, FALSE, CURRENT_DATE + INTERVAL '20 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_points = EXCLUDED.reward_points,
  reward_xp = EXCLUDED.reward_xp;

-- Seed Unlocked Badges
INSERT INTO user_badges (user_id, badge_code, badge_name, praise_quote) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'streak_7',
    'Api Konsistensi',
    'Penabung Ulung: Konsistensimu mencatat 7 hari berturut-turut adalah awal dari kebebasan finansial!'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'detail_master',
    'Juru Tulis Teliti',
    'Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat pet kesayanganmu sangat bangga!'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'budget_guardian',
    'Perisai Dompet',
    'Hebat! Kamu selalu memikirkan kebutuhan utama sebelum keinginan sesaat.'
  )
ON CONFLICT (user_id, badge_code) DO NOTHING;

-- Seed Point Redemptions
INSERT INTO point_redemptions (
  id, user_id, points_redeemed, rupiah_value, status, note, created_at, approved_at
) VALUES
  (
    'cccc0001-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    1000, 1000, 'approved',
    'Tukar poin konsistensi buat tambahan tabungan buku kuliah',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '2 days'
  ),
  (
    'cccc0002-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    1500, 1500, 'pending',
    'Tukar poin rajin mencatat kas buat masuk celengan Mochi!',
    CURRENT_DATE,
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  points_redeemed = EXCLUDED.points_redeemed,
  rupiah_value = EXCLUDED.rupiah_value,
  note = EXCLUDED.note;

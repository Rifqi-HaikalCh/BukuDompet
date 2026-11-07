-- ============================================================
-- BUKUDOMPET DATABASE SCHEMA & REALISTIC SEED DATA
-- Migration: 001_init_bukudompet.sql
-- ============================================================

-- 1. Profiles & Gamification State
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'user')),
  pin_code TEXT NOT NULL DEFAULT '1234',
  avatar_theme TEXT DEFAULT 'mochi-cat',
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  points_balance INT NOT NULL DEFAULT 0, -- 1 Point = Rp 1
  lifetime_points INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  streak_freeze_count INT NOT NULL DEFAULT 1,
  last_recorded_date DATE,
  monthly_budget_target NUMERIC(12,2) NOT NULL DEFAULT 1500000,
  monthly_saving_target NUMERIC(12,2) NOT NULL DEFAULT 300000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Transactions (Header)
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

-- 3. Transaction Items (Detailed Breakdown for Bonus Points)
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

-- 4. Missions & Challenges (Daily, Weekly, Saving, Budget)
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

-- 5. Achievements & Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  praise_quote TEXT NOT NULL, -- Tema pujian untuk penabung
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_code)
);

-- 6. Point Cashout / Redemption Requests (1 Poin = Rp 1)
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
-- SEED DATA REALISTIS BUKUDOMPET
-- ============================================================

-- Seed 3 Built-in Family Profiles (User PIN 1111, Supervisor PIN 2222, Admin PIN 9999)
INSERT INTO profiles (
  id, username, display_name, role, pin_code, avatar_theme,
  xp, level, points_balance, lifetime_points,
  current_streak, longest_streak, streak_freeze_count,
  last_recorded_date, monthly_budget_target, monthly_saving_target
) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'adik',
    'Adik (Pemilik Buku Kas)',
    'user',
    '1111',
    'mochi-cat',
    840,
    8,
    18500,
    28500,
    6,
    9,
    2,
    CURRENT_DATE,
    1800000,
    350000
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'orangtua',
    'Orang Tua (Supervisor)',
    'supervisor',
    '2222',
    'mochi-parent',
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    CURRENT_DATE,
    1800000,
    350000
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'abang',
    'Abang (Admin & Sponsor Poin)',
    'admin',
    '9999',
    'mochi-boss',
    2500,
    15,
    50000,
    50000,
    14,
    14,
    5,
    CURRENT_DATE,
    1800000,
    350000
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Transactions (Bulan berjalan & 7 hari terakhir dengan sub-item rincian)
INSERT INTO transactions (
  id, user_id, type, category, need_or_want, title,
  total_amount, is_itemized, points_earned, xp_earned, transaction_date
) VALUES
  -- Uang Saku Bulanan
  (
    'aaaa0001-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'income', 'Uang Saku Bulanan', 'income',
    'Transfer Uang Saku Bulanan dari Orang Tua',
    1800000, FALSE, 25, 30, CURRENT_DATE - INTERVAL '5 days'
  ),
  -- Hari -5: Makan Siang Kampus & Fotokopi (Itemized)
  (
    'aaaa0002-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Siang Kantin & Air',
    24000, TRUE, 35, 40, CURRENT_DATE - INTERVAL '5 days'
  ),
  (
    'aaaa0003-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Es Kopi Susu Gula Aren',
    19000, FALSE, 10, 15, CURRENT_DATE - INTERVAL '5 days'
  ),
  -- Hari -4: Transport & Kuliah/Alat Tulis (Itemized)
  (
    'aaaa0004-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kuliah/Alat Tulis', 'need',
    'Beli Alat Tulis & Print Tugas',
    31000, TRUE, 40, 40, CURRENT_DATE - INTERVAL '4 days'
  ),
  (
    'aaaa0005-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Kopi Kenangan Mantan',
    22000, FALSE, 10, 15, CURRENT_DATE - INTERVAL '4 days'
  ),
  -- Hari -3: Makan Malam Nasi Goreng & Es Teh (Itemized) + Jajan
  (
    'aaaa0006-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Malam Warung Pak Kumis',
    23000, TRUE, 40, 40, CURRENT_DATE - INTERVAL '3 days'
  ),
  (
    'aaaa0007-0000-4000-8000-000000000007',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Matcha Latte Dingin',
    21000, FALSE, 10, 15, CURRENT_DATE - INTERVAL '3 days'
  ),
  -- Hari -2: Transportasi & Jajan Sore (Itemized)
  (
    'aaaa0008-0000-4000-8000-000000000008',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Transportasi', 'need',
    'Naik KRL & Ojek Stasiun',
    18000, TRUE, 35, 40, CURRENT_DATE - INTERVAL '2 days'
  ),
  (
    'aaaa0009-0000-4000-8000-000000000009',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Boba Brown Sugar Fresh Milk',
    24000, FALSE, 10, 15, CURRENT_DATE - INTERVAL '2 days'
  ),
  -- Hari -1 (Kemarin): Makan Siang Warteg Hemat (Itemized)
  (
    'aaaa0010-0000-4000-8000-000000000010',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Siang Warteg Bahari',
    22000, TRUE, 40, 40, CURRENT_DATE - INTERVAL '1 day'
  ),
  -- Hari Ini: Sarapan & Makan Siang Rinci (Itemized)
  (
    'aaaa0011-0000-4000-8000-000000000011',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Makan Pokok', 'need',
    'Makan Siang Nasi Goreng & Es Teh',
    23000, TRUE, 40, 40, CURRENT_DATE
  ),
  (
    'aaaa0012-0000-4000-8000-000000000012',
    '11111111-1111-4111-8111-111111111111',
    'expense', 'Kopi/Minuman', 'want',
    'Es Kopi Susu Kampus',
    16000, FALSE, 10, 15, CURRENT_DATE
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Transaction Items (Rincian transparan untuk bonus poin & supervisor)
INSERT INTO transaction_items (transaction_id, item_name, quantity, unit_price, subtotal) VALUES
  -- Transaksi aaaa0002
  ('aaaa0002-0000-4000-8000-000000000002', 'Nasi Ayam Bakar Madu', 1, 18000, 18000),
  ('aaaa0002-0000-4000-8000-000000000002', 'Air Mineral Botol', 1, 6000, 6000),
  -- Transaksi aaaa0004
  ('aaaa0004-0000-4000-8000-000000000004', 'Buku Catatan Bergaris', 1, 15000, 15000),
  ('aaaa0004-0000-4000-8000-000000000004', 'Pulpen Gel Hitam', 2, 5000, 10000),
  ('aaaa0004-0000-4000-8000-000000000004', 'Fotokopi Modul Kuliah', 1, 6000, 6000),
  -- Transaksi aaaa0006
  ('aaaa0006-0000-4000-8000-000000000006', 'Nasi Goreng Spesial', 1, 15000, 15000),
  ('aaaa0006-0000-4000-8000-000000000006', 'Es Teh Manis', 1, 5000, 5000),
  ('aaaa0006-0000-4000-8000-000000000006', 'Kerupuk Kaleng', 1, 3000, 3000),
  -- Transaksi aaaa0008
  ('aaaa0008-0000-4000-8000-000000000008', 'Tiket KRL Commuter', 1, 6000, 6000),
  ('aaaa0008-0000-4000-8000-000000000008', 'Ojek Online Stasiun', 1, 12000, 12000),
  -- Transaksi aaaa0010
  ('aaaa0010-0000-4000-8000-000000000010', 'Nasi Sayur Sop & Telur Dadar', 1, 14000, 14000),
  ('aaaa0010-0000-4000-8000-000000000010', 'Tempe Orek & Perkedel', 1, 5000, 5000),
  ('aaaa0010-0000-4000-8000-000000000010', 'Es Jeruk Peras', 1, 3000, 3000),
  -- Transaksi aaaa0011 (Hari Ini)
  ('aaaa0011-0000-4000-8000-000000000011', 'Nasi Goreng Kampung', 1, 15000, 15000),
  ('aaaa0011-0000-4000-8000-000000000011', 'Es Teh Manis Segar', 1, 5000, 5000),
  ('aaaa0011-0000-4000-8000-000000000011', 'Kerupuk Udang', 1, 3000, 3000);

-- Seed Missions (3 Daily, 1 Weekly, 1 Saving Challenge, 1 Budget Challenge)
INSERT INTO user_missions (
  id, user_id, mission_type, title, description,
  target_value, current_value, reward_points, reward_xp, is_claimed, valid_until
) VALUES
  (
    'bbbb0001-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'daily',
    'Detektif Struk',
    'Catat 1 pengeluaran hari ini dengan rincian minimal 2 item spesifik.',
    1, 1, 50, 40, FALSE, CURRENT_DATE
  ),
  (
    'bbbb0002-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'daily',
    'Rem Pakem',
    'Jaga pengeluaran kategori Jajan/Wants hari ini di bawah 50% batas harian.',
    1, 1, 75, 50, FALSE, CURRENT_DATE
  ),
  (
    'bbbb0003-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'daily',
    'Jurnal Jujur',
    'Catat transaksi harianmu sebelum jam 21:00 WIB.',
    1, 1, 30, 25, FALSE, CURRENT_DATE
  ),
  (
    'bbbb0004-0000-4000-8000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'weekly',
    'Pahlawan Anggaran',
    'Selesaikan 7 hari penuh dengan total pengeluaran di bawah Budget Mingguan.',
    7, 6, 1000, 250, FALSE, CURRENT_DATE + INTERVAL '2 days'
  ),
  (
    'bbbb0005-0000-4000-8000-000000000005',
    '11111111-1111-4111-8111-111111111111',
    'saving_challenge',
    'Tabungan Akhir Bulan Rp350.000',
    'Pertahankan sisa uang saku minimal Rp350.000 hingga akhir bulan untuk masuk celengan.',
    350000, 350000, 1500, 300, FALSE, CURRENT_DATE + INTERVAL '20 days'
  ),
  (
    'bbbb0006-0000-4000-8000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    'budget_challenge',
    'Tantangan Kurangi Kopi & Boba',
    'Maksimal jajan minuman manis 3x dalam seminggu agar dompet tetap tebal.',
    3, 2, 500, 150, FALSE, CURRENT_DATE + INTERVAL '4 days'
  )
ON CONFLICT (id) DO NOTHING;

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
    'Kejujuran dan ketelitianmu mencatat setiap rincian struk membuat Mochi sangat bangga!'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'budget_guardian',
    'Perisai Dompet',
    'Hebat! Kamu selalu memikirkan kebutuhan utama sebelum keinginan sesaat.'
  )
ON CONFLICT (user_id, badge_code) DO NOTHING;

-- Seed Point Redemptions (1 Approved, 1 Pending untuk diuji di halaman Admin)
INSERT INTO point_redemptions (
  id, user_id, points_redeemed, rupiah_value, status, note, created_at, approved_at
) VALUES
  (
    'cccc0001-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    10000, 10000, 'approved',
    'Tukar poin buat tambahan beli buku catatan kuliah 📚',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '2 days'
  ),
  (
    'cccc0002-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    15000, 15000, 'pending',
    'Tukar poin rajin mencatat minggu ini buat ditabung ke celengan Mochi! 🐱✨',
    CURRENT_DATE,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

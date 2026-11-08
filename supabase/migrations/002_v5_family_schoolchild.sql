-- ============================================================
-- BukuDompet Versi 5.0 — Anak SD, Cerita Harian, Celengan, Arcade, Beranda Keluarga
-- Aman dijalankan berulang (idempotent) pada database Versi 1.0-4.0 maupun instalasi baru.
-- ============================================================

-- 1. Role baru "schoolchild" (Anak SD Kelas 3) + tipe transaksi "saving" (tabungan bukan pengeluaran)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'supervisor', 'user', 'schoolchild'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'saving'));

-- Mode Streak Padam (Cold Ambience)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_cold_streak_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Cerita harian Anak SD
CREATE TABLE IF NOT EXISTS daily_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('activity', 'school', 'emotion', 'imagination')),
  emotion TEXT CHECK (emotion IN ('happy', 'proud', 'grateful', 'sad', 'angry', 'anxious')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  word_count INT NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_stories_user_date ON daily_stories (user_id, story_date DESC);

-- 3. Tujuan celengan
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals (user_id);

-- 4. Hasil permainan Arcade Sekolah (24 mode)
CREATE TABLE IF NOT EXISTS arcade_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('language', 'money', 'empathy', 'science')),
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0),
  total INT NOT NULL DEFAULT 0 CHECK (total >= 0),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  played_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_arcade_plays_user_date ON arcade_plays (user_id, played_on DESC);

-- 5. Beranda Keluarga & Chat (direset aplikasi tiap 7 hari; tabel ini hanya cadangan opsional)
CREATE TABLE IF NOT EXISTS family_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'user',
  body TEXT NOT NULL DEFAULT '',
  image_webp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Seed Anak SD: Adik Kecil (Kelas 3 SD) di bawah Supervisor Orang Tua
INSERT INTO profiles (
  id, username, display_name, role, pin_code, avatar_theme,
  xp, level, current_stage, stage_xp, stage_recorded_days,
  pet_custom_name, active_species, unlocked_species, owned_pets, owned_accessories, equipped_accessories,
  points_balance, lifetime_points,
  current_streak, longest_streak, streak_freeze_count,
  last_recorded_date, monthly_budget_target, monthly_saving_target
) VALUES (
  '11111111-1111-4111-8111-444444444444',
  'adik_sd',
  'Adik Kecil (Kelas 3 SD)',
  'schoolchild',
  '3333',
  'mochi-cat',
  180, 2, 2, 120, 3,
  'Kumo', 'hamster_cheek', ARRAY['hamster_cheek'],
  '{"hamster_cheek":{"species":"hamster_cheek","customName":"Kumo","currentStage":2,"stageXp":120,"stageRecordedDays":3}}'::jsonb,
  ARRAY['head_straw_hat', 'bg_warm_room'],
  '{"head":"head_straw_hat","background":"bg_warm_room"}'::jsonb,
  90, 90,
  4, 4, 1,
  CURRENT_DATE - 1, 150000, 50000
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  pin_code = EXCLUDED.pin_code;

INSERT INTO supervisor_assignments (supervisor_id, user_id) VALUES
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-444444444444')
ON CONFLICT (supervisor_id, user_id) DO NOTHING;

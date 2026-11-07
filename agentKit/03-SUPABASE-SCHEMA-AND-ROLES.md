# SUPABASE DATABASE SCHEMA & SIMPLE ROLE AUTHENTICATION

## 1. Simple "Family Door" Authentication
No complex OAuth or email verification required. We use a **Profile Selector + 4-Digit PIN Gate** stored in `profiles` table and persisted via a lightweight signed cookie/session.
- **3 Built-in Roles:**
  1. `user` (Adik - Primary recorder, full gamification, can request point cashout).
  2. `supervisor` (Orang Tua - Read-only access to User's financial dashboard, daily itemized feed, Spending Detective insights, and weekly/monthly summaries in a parent-friendly UI).
  3. `admin` (Abang - Full access to everything: can switch between User view and Supervisor view, test recording transactions in sandbox/live mode, set monthly budgets/challenges, and **Approve Point Cashout Requests**).

## 2. PostgreSQL Schema (`supabase/migrations/001_init_bukudompet.sql`)

```sql
-- 1. Profiles & Gamification State
CREATE TABLE profiles (
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
CREATE TABLE transactions (
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
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

-- 4. Missions & Challenges (Daily, Weekly, Saving, Budget)
CREATE TABLE user_missions (
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
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  praise_quote TEXT NOT NULL, -- Tema pujian untuk penabung
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_code)
);

-- 6. Point Cashout / Redemption Requests (1 Poin = Rp 1)
CREATE TABLE point_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points_redeemed INT NOT NULL,
  rupiah_value NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);
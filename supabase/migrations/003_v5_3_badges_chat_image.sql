-- ============================================================
-- BukuDompet Versi 5.3 — Gelar & Latar Badge, foto Chat Keluarga, cerita di postingan
-- OPSIONAL: aplikasi tetap berjalan penuh tanpa migrasi ini (data 5.3 disimpan di localStorage).
-- Aman dijalankan berulang (idempotent).
-- ============================================================

-- 1. Koleksi & pilihan Gelar/Latar badge per profil (default = hadiah awal)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS owned_title_ids TEXT[] NOT NULL DEFAULT ARRAY['t_penabung_cerdas', 't_pemula_ceria'],
  ADD COLUMN IF NOT EXISTS owned_badge_bg_ids TEXT[] NOT NULL DEFAULT ARRAY['bg_polos'],
  ADD COLUMN IF NOT EXISTS equipped_title_id TEXT NOT NULL DEFAULT 't_penabung_cerdas',
  ADD COLUMN IF NOT EXISTS equipped_badge_bg_id TEXT NOT NULL DEFAULT 'bg_polos';

-- 2. Foto (WebP kecil, data URL) pada Chat Keluarga; teks boleh kosong bila hanya foto
ALTER TABLE family_chat_messages
  ADD COLUMN IF NOT EXISTS image_webp TEXT;
ALTER TABLE family_chat_messages
  ALTER COLUMN body SET DEFAULT '';
ALTER TABLE family_chat_messages
  DROP CONSTRAINT IF EXISTS family_chat_messages_body_or_image_check;
ALTER TABLE family_chat_messages
  ADD CONSTRAINT family_chat_messages_body_or_image_check
  CHECK (length(body) > 0 OR image_webp IS NOT NULL);

-- 3. Postingan cerita: tautan ke cerita agar bisa dibaca langsung dari postingan
ALTER TABLE family_feed_posts
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES daily_stories(id) ON DELETE SET NULL;

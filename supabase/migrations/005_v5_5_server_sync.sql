-- ============================================================
-- BukuDompet Versi 5.5 — PENYIMPANAN SERVER (SATU-SATUNYA PINTU)
--
-- Masalah yang diperbaiki:
--   * Perubahan di UI (edit pet, budget, catat kas, dst.) hanya tersimpan di localStorage.
--   * Tulis ke Supabase memakai kunci publik (anon) tanpa RLS: PIN & data bisa dibaca/ditulis siapa saja.
--
-- Rancangan baru:
--   * Semua tabel DITUTUP untuk anon/authenticated (RLS aktif tanpa kebijakan + REVOKE).
--   * Aplikasi hanya bicara ke server Next.js (/api/*), yang memanggil fungsi `app_*` di bawah dengan
--     kunci rahasia (service role). Fungsi-fungsi itu memeriksa PIN, peran, dan hak akses tiap perubahan.
--   * Data game disimpan sebagai dokumen JSON di `sync_docs` (utuh, tanpa field yang hilang),
--     dengan nomor revisi per dokumen untuk mendeteksi konflik antar perangkat.
--   * PIN di-hash (bcrypt via pgcrypto), ada pembatas percobaan salah, dan kolom PIN teks biasa dikosongkan.
--
-- CARA PAKAI: jalankan SELURUH berkas ini sekali di Supabase > SQL Editor (setelah 001-004).
-- Aman dijalankan ulang (idempoten): akun, hash PIN, dan data yang sudah ada tidak ditimpa.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. AKUN: kolom keamanan di tabel `profiles` (tabel akun)
-- ------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_ver INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Hash PIN lama (teks biasa), lalu kosongkan teks biasanya.
UPDATE profiles
   SET pin_hash = crypt(pin_code, gen_salt('bf', 8))
 WHERE pin_hash IS NULL AND pin_code ~ '^[0-9]{4}$';
UPDATE profiles SET pin_code = '' WHERE pin_hash IS NOT NULL AND pin_code <> '';

-- Akun demo lama (bila masih ada) dinonaktifkan agar tidak bisa dipakai masuk.
UPDATE profiles SET is_active = FALSE
 WHERE username IN ('adik', 'bima', 'citra', 'adik_sd', 'orangtua', 'wali', 'abang');

-- ------------------------------------------------------------
-- 2. DOKUMEN SINKRONISASI
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS sync_seq;

CREATE TABLE IF NOT EXISTS sync_docs (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  owner_id UUID,                       -- pemilik dokumen (profil); NULL = milik keluarga
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  rev BIGINT NOT NULL DEFAULT 1,       -- naik 1 tiap perubahan (deteksi konflik)
  seq BIGINT NOT NULL DEFAULT nextval('sync_seq'),  -- urutan global perubahan (penarikan inkremental)
  deleted BOOLEAN NOT NULL DEFAULT FALSE,           -- batu nisan: agar penghapusan sampai ke perangkat lain
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS sync_docs_seq_idx ON sync_docs (seq);
CREATE INDEX IF NOT EXISTS sync_docs_owner_idx ON sync_docs (owner_id, collection);

-- Aturan tiap koleksi (dibaca oleh fungsi di bawah).
--   scope        : family  = terlihat semua akun yang sudah masuk
--                  private = hanya pemilik, Admin, dan Supervisor yang ditugaskan ke pemilik
--   write_policy : any | admin | owner (pemilik/Admin) | owner_sup (pemilik/Admin/Supervisor-nya) | profile
--   owner_kind   : field (owner_key = nama field di data) | keyprefix (bagian id sebelum ':') | none
CREATE TABLE IF NOT EXISTS sync_collections (
  name TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('family', 'private')),
  write_policy TEXT NOT NULL CHECK (write_policy IN ('any', 'admin', 'owner', 'owner_sup', 'profile')),
  owner_kind TEXT NOT NULL CHECK (owner_kind IN ('field', 'keyprefix', 'none')),
  owner_key TEXT
);

INSERT INTO sync_collections (name, scope, write_policy, owner_kind, owner_key) VALUES
  ('profiles',        'family',  'profile',   'field',     'id'),
  ('assignments',     'family',  'admin',     'field',     'userId'),
  ('transactions',    'private', 'owner_sup', 'field',     'user_id'),
  ('missions',        'private', 'owner_sup', 'field',     'user_id'),
  ('badges',          'private', 'owner',     'field',     'user_id'),
  ('redemptions',     'private', 'owner_sup', 'field',     'user_id'),
  ('ledger',          'private', 'owner',     'keyprefix', NULL),
  ('stories',         'private', 'owner',     'field',     'userId'),
  ('goals',           'private', 'owner',     'field',     'userId'),
  ('arcade_plays',    'family',  'owner',     'field',     'userId'),
  ('arcade_progress', 'private', 'owner',     'keyprefix', NULL),
  ('arcade_sessions', 'private', 'owner',     'keyprefix', NULL),
  ('arcade_daily',    'private', 'owner_sup', 'keyprefix', NULL),
  ('arcade_limits',   'private', 'owner_sup', 'keyprefix', NULL),
  ('quest_claims',    'private', 'owner',     'keyprefix', NULL),
  ('medal_claims',    'family',  'owner',     'keyprefix', NULL),
  ('feed_posts',      'family',  'any',       'none',      NULL),
  ('chat',            'family',  'any',       'none',      NULL),
  ('reminders',       'family',  'any',       'none',      NULL),
  ('user_state',      'private', 'owner',     'keyprefix', NULL),
  ('kv',              'family',  'any',       'none',      NULL)
ON CONFLICT (name) DO UPDATE
  SET scope = EXCLUDED.scope, write_policy = EXCLUDED.write_policy,
      owner_kind = EXCLUDED.owner_kind, owner_key = EXCLUDED.owner_key;

-- Penanda "generasi" database: bila tabel dikosongkan, perangkat tahu harus mengirim ulang datanya.
CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO sync_meta (key, value) VALUES ('epoch', gen_random_uuid()::text) ON CONFLICT DO NOTHING;

-- Penugasan Supervisor -> User dari tabel lama dibawa ke dokumen sinkronisasi.
INSERT INTO sync_docs (collection, id, owner_id, data)
SELECT 'assignments', a.supervisor_id::text || ':' || a.user_id::text, a.user_id,
       jsonb_build_object('supervisorId', a.supervisor_id, 'userId', a.user_id)
  FROM supervisor_assignments a
  JOIN profiles s ON s.id = a.supervisor_id AND s.is_active
  JOIN profiles u ON u.id = a.user_id AND u.is_active
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. FUNGSI PEMBANTU
-- ------------------------------------------------------------
-- Memastikan pelaku (dari sesi server) masih akun aktif dengan versi sesi yang sama.
CREATE OR REPLACE FUNCTION app_actor(p_actor UUID, p_ver INT)
RETURNS profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE me profiles;
BEGIN
  SELECT * INTO me FROM profiles WHERE id = p_actor AND is_active AND session_ver = p_ver;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_INVALID'; END IF;
  RETURN me;
END $$;

CREATE OR REPLACE FUNCTION app_is_assigned(p_supervisor UUID, p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM sync_docs a
     WHERE a.collection = 'assignments' AND NOT a.deleted
       AND a.id = p_supervisor::text || ':' || p_user::text
  );
$$;

-- Apakah dokumen terlihat oleh pelaku?
CREATE OR REPLACE FUNCTION app_doc_visible(p_me_id UUID, p_me_role TEXT, p_scope TEXT, p_owner UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_scope = 'family'
      OR p_me_role = 'admin'
      OR p_owner = p_me_id
      OR (p_me_role = 'supervisor' AND p_owner IS NOT NULL AND app_is_assigned(p_me_id, p_owner));
$$;

-- ------------------------------------------------------------
-- 4. LOGIN, PENCARIAN NAMA, AKUN
-- ------------------------------------------------------------
-- Pencarian nama sebelum login: hanya data non-rahasia (tanpa PIN).
CREATE OR REPLACE FUNCTION app_lookup(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE q TEXT := lower(btrim(coalesce(p_name, '')));
BEGIN
  IF q = '' OR length(q) > 40 THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', id, 'username', username, 'display_name', display_name, 'role', role)
                     ORDER BY role, username)
      FROM (
        SELECT id, username, display_name, role FROM profiles
         WHERE is_active
           AND (lower(username) = q OR lower(btrim(split_part(display_name, ' (', 1))) = q)
         ORDER BY role, username LIMIT 8
      ) c
  ), '[]'::jsonb);
END $$;

-- Login: verifikasi PIN di database. 6x salah berturut-turut mengunci akun 10 menit.
CREATE OR REPLACE FUNCTION app_login(p_id UUID, p_username TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE acct profiles;
BEGIN
  IF p_id IS NOT NULL THEN
    SELECT * INTO acct FROM profiles WHERE id = p_id AND is_active FOR UPDATE;
  ELSE
    SELECT * INTO acct FROM profiles WHERE lower(username) = lower(btrim(coalesce(p_username, ''))) AND is_active FOR UPDATE;
  END IF;
  IF NOT FOUND OR acct.pin_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  IF acct.locked_until IS NOT NULL AND acct.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked',
      'retry_after', ceil(extract(epoch FROM (acct.locked_until - now())))::int);
  END IF;
  IF coalesce(p_pin, '') !~ '^[0-9]{4}$' OR acct.pin_hash <> crypt(p_pin, acct.pin_hash) THEN
    IF acct.failed_attempts + 1 >= 6 THEN
      UPDATE profiles SET failed_attempts = 0, locked_until = now() + interval '10 minutes' WHERE id = acct.id;
      RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'retry_after', 600);
    END IF;
    UPDATE profiles SET failed_attempts = failed_attempts + 1 WHERE id = acct.id;
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid', 'attempts_left', 6 - (acct.failed_attempts + 1));
  END IF;
  UPDATE profiles SET failed_attempts = 0, locked_until = NULL WHERE id = acct.id;
  RETURN jsonb_build_object('ok', true, 'id', acct.id, 'username', acct.username,
    'display_name', acct.display_name, 'role', acct.role, 'ver', acct.session_ver);
END $$;

CREATE OR REPLACE FUNCTION app_session(p_actor UUID, p_ver INT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me profiles;
BEGIN
  SELECT * INTO me FROM profiles WHERE id = p_actor AND is_active AND session_ver = p_ver;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  RETURN jsonb_build_object('ok', true, 'id', me.id, 'username', me.username,
    'display_name', me.display_name, 'role', me.role);
END $$;

-- Admin mendaftarkan akun baru.
CREATE OR REPLACE FUNCTION app_create_account(
  p_actor UUID, p_ver INT, p_id UUID, p_username TEXT, p_display TEXT, p_role TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE me profiles; uname TEXT := lower(btrim(coalesce(p_username, '')));
BEGIN
  me := app_actor(p_actor, p_ver);
  IF me.role <> 'admin' THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF uname !~ '^[a-z0-9_]{3,24}$' THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_username'); END IF;
  IF coalesce(p_pin, '') !~ '^[0-9]{4}$' THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_pin'); END IF;
  IF p_role NOT IN ('admin', 'supervisor', 'user', 'schoolchild') THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_role'); END IF;
  IF length(btrim(coalesce(p_display, ''))) NOT BETWEEN 1 AND 40 THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_name'); END IF;
  BEGIN
    INSERT INTO profiles (id, username, display_name, role, pin_code, pin_hash)
    VALUES (coalesce(p_id, gen_random_uuid()), uname, btrim(p_display), p_role, '',
            crypt(p_pin, gen_salt('bf', 8)));
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'username_taken');
  END;
  RETURN jsonb_build_object('ok', true, 'id', (SELECT id FROM profiles WHERE username = uname));
END $$;

-- Admin mengganti PIN akun mana pun. Semua sesi akun itu langsung tidak berlaku.
CREATE OR REPLACE FUNCTION app_set_pin(p_actor UUID, p_ver INT, p_target UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE me profiles; newver INT;
BEGIN
  me := app_actor(p_actor, p_ver);
  IF me.role <> 'admin' THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF coalesce(p_pin, '') !~ '^[0-9]{4}$' THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_pin'); END IF;
  UPDATE profiles
     SET pin_hash = crypt(p_pin, gen_salt('bf', 8)), pin_code = '',
         failed_attempts = 0, locked_until = NULL, session_ver = session_ver + 1
   WHERE id = p_target AND is_active
   RETURNING session_ver INTO newver;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true, 'id', p_target, 'ver', newver);
END $$;

-- ------------------------------------------------------------
-- 5. SINKRONISASI: TARIK PERUBAHAN
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_sync_pull(p_actor UUID, p_ver INT, p_since BIGINT, p_max_bytes INT DEFAULT 1500000)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me profiles; docs JSONB; last_seq BIGINT; has_more BOOLEAN;
BEGIN
  me := app_actor(p_actor, p_ver);
  p_since := greatest(coalesce(p_since, 0), 0);

  WITH vis AS (
    SELECT d.* FROM sync_docs d JOIN sync_collections s ON s.name = d.collection
     WHERE d.seq > p_since AND app_doc_visible(me.id, me.role, s.scope, d.owner_id)
     ORDER BY d.seq LIMIT 500
  ), sized AS (
    SELECT vis.*, sum(octet_length(vis.data::text) + 120) OVER (ORDER BY vis.seq) AS cum FROM vis
  ), pick AS (
    SELECT * FROM sized WHERE cum <= p_max_bytes OR seq = (SELECT min(seq) FROM vis)
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('c', collection, 'i', id, 'r', rev, 's', seq, 'x', deleted,
                                               'd', CASE WHEN deleted THEN NULL ELSE data END) ORDER BY seq), '[]'::jsonb),
         coalesce(max(seq), p_since)
    INTO docs, last_seq FROM pick;

  SELECT EXISTS (
    SELECT 1 FROM sync_docs d JOIN sync_collections s ON s.name = d.collection
     WHERE d.seq > last_seq AND app_doc_visible(me.id, me.role, s.scope, d.owner_id)
  ) INTO has_more;

  RETURN jsonb_build_object(
    'epoch', (SELECT value FROM sync_meta WHERE key = 'epoch'),
    'docs', docs, 'seq', last_seq, 'more', has_more);
END $$;

-- ------------------------------------------------------------
-- 6. SINKRONISASI: KIRIM PERUBAHAN
-- ------------------------------------------------------------
-- op: {c: koleksi, i: id, t: 'u'|'d', b: revisi dasar, d: data}
-- hasil per op: {k, s: ok|conflict|denied|invalid, r: revisi, d/x: dokumen server (konflik/ditolak), m: alasan}
CREATE OR REPLACE FUNCTION app_sync_push(p_actor UUID, p_ver INT, p_ops JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me profiles; op JSONB; results JSONB := '[]'::jsonb; res JSONB;
  c TEXT; i TEXT; t TEXT; base BIGINT; d JSONB;
  spec sync_collections; ex sync_docs; owner UUID; acct profiles; newrev BIGINT; newseq BIGINT;
  field TEXT; denied_field TEXT; has_ex BOOLEAN;
BEGIN
  me := app_actor(p_actor, p_ver);
  IF jsonb_typeof(p_ops) <> 'array' OR jsonb_array_length(p_ops) > 200 THEN RAISE EXCEPTION 'BAD_REQUEST'; END IF;

  PERFORM pg_advisory_xact_lock(7305001);   -- tulis berurutan: urutan seq = urutan commit
  DELETE FROM sync_docs WHERE deleted AND updated_at < now() - interval '60 days';

  FOR op IN SELECT * FROM jsonb_array_elements(p_ops) LOOP
    c := op->>'c'; i := op->>'i'; t := op->>'t';
    base := coalesce((op->>'b')::bigint, 0); d := op->'d';
    res := jsonb_build_object('k', coalesce(c, '') || '/' || coalesce(i, ''));

    BEGIN  -- satu op gagal tidak membatalkan op lain
      SELECT * INTO spec FROM sync_collections WHERE name = c;
      IF NOT FOUND OR i IS NULL OR i = '' OR length(i) > 256 OR t NOT IN ('u', 'd') THEN
        results := results || (res || jsonb_build_object('s', 'invalid', 'm', 'op_tidak_valid'));
        CONTINUE;
      END IF;

      IF c = 'profiles' THEN i := lower(i); END IF;
      SELECT * INTO ex FROM sync_docs WHERE collection = c AND id = i FOR UPDATE;
      has_ex := FOUND;
      denied_field := NULL;

      -- Penghapusan dokumen yang memang tidak ada = selesai.
      IF t = 'd' AND (NOT has_ex OR ex.deleted) THEN
        results := results || (res || jsonb_build_object('s', 'ok', 'r', coalesce(ex.rev, 0)));
        CONTINUE;
      END IF;

      IF t = 'u' THEN
        IF d IS NULL OR jsonb_typeof(d) <> 'object' OR octet_length(d::text) > 1500000 THEN
          results := results || (res || jsonb_build_object('s', 'invalid', 'm', 'data_tidak_valid'));
          CONTINUE;
        END IF;
      END IF;

      -- Pemilik dokumen
      IF t = 'd' THEN
        owner := ex.owner_id;
      ELSIF c = 'profiles' THEN
        BEGIN
          SELECT * INTO acct FROM profiles WHERE id = i::uuid AND is_active;
        EXCEPTION WHEN invalid_text_representation THEN
          results := results || (res || jsonb_build_object('s', 'invalid', 'm', 'id_bukan_uuid'));
          CONTINUE;
        END;
        IF NOT FOUND THEN
          results := results || (res || jsonb_build_object('s', 'denied', 'm', 'akun_tidak_ada'));
          CONTINUE;
        END IF;
        -- Identitas selalu dari tabel akun; PIN tidak pernah masuk dokumen.
        d := (d - 'pin_code' - 'pin_hash') ||
             jsonb_build_object('id', acct.id, 'username', acct.username, 'role', acct.role);
        owner := acct.id;
      ELSIF spec.owner_kind = 'field' THEN
        owner := (d->>spec.owner_key)::uuid;
      ELSIF spec.owner_kind = 'keyprefix' THEN
        owner := split_part(i, ':', 1)::uuid;
      ELSE
        owner := NULL;
      END IF;

      IF spec.scope = 'private' AND owner IS NULL THEN
        results := results || (res || jsonb_build_object('s', 'invalid', 'm', 'pemilik_kosong'));
        CONTINUE;
      END IF;

      -- Hak tulis
      IF NOT (
        CASE spec.write_policy
          WHEN 'any'       THEN TRUE
          WHEN 'profile'   THEN (t = 'u' OR me.role = 'admin')   -- hapus profil: Admin saja
          WHEN 'admin'     THEN me.role = 'admin'
          WHEN 'owner'     THEN me.role = 'admin' OR owner = me.id
          WHEN 'owner_sup' THEN me.role = 'admin' OR owner = me.id
                                OR (me.role = 'supervisor' AND owner IS NOT NULL AND app_is_assigned(me.id, owner))
          ELSE FALSE
        END
      ) THEN
        results := results || (res || jsonb_build_object('s', 'denied', 'm', 'tidak_berhak',
          'd', CASE WHEN has_ex AND NOT ex.deleted THEN ex.data END, 'r', CASE WHEN has_ex THEN ex.rev END));
        CONTINUE;
      END IF;

      -- Pemilik dokumen tidak boleh berpindah tangan (kecuali Admin).
      IF has_ex AND t = 'u' AND ex.owner_id IS DISTINCT FROM owner AND me.role <> 'admin' THEN
        results := results || (res || jsonb_build_object('s', 'denied', 'm', 'pemilik_berubah'));
        CONTINUE;
      END IF;

      -- Profil milik orang lain: poin/XP tidak boleh dikurangi oleh non-pemilik non-Admin.
      IF c = 'profiles' AND t = 'u' AND has_ex AND NOT ex.deleted AND me.id <> acct.id AND me.role <> 'admin' THEN
        FOREACH field IN ARRAY ARRAY['points_balance', 'lifetime_points', 'xp'] LOOP
          IF coalesce((d->>field)::numeric, 0) < coalesce((ex.data->>field)::numeric, 0) THEN
            denied_field := field;
            EXIT;
          END IF;
        END LOOP;
        IF denied_field IS NOT NULL THEN
          results := results || (res || jsonb_build_object('s', 'denied', 'm', 'poin_tidak_boleh_dikurangi',
            'd', ex.data, 'r', ex.rev));
          CONTINUE;
        END IF;
      END IF;

      -- Konflik revisi
      IF has_ex AND ex.rev <> base THEN
        results := results || (res || jsonb_build_object('s', 'conflict', 'r', ex.rev, 'x', ex.deleted,
          'd', CASE WHEN ex.deleted THEN NULL ELSE ex.data END));
        CONTINUE;
      END IF;

      newseq := nextval('sync_seq');
      IF t = 'u' THEN
        IF NOT has_ex THEN
          INSERT INTO sync_docs (collection, id, owner_id, data, rev, seq, updated_by)
          VALUES (c, i, owner, d, 1, newseq, me.id);
          newrev := 1;
        ELSE
          UPDATE sync_docs SET owner_id = owner, data = d, rev = ex.rev + 1, seq = newseq,
                 deleted = FALSE, updated_by = me.id, updated_at = now()
           WHERE collection = c AND id = i;
          newrev := ex.rev + 1;
        END IF;
      ELSE
        UPDATE sync_docs SET data = '{}'::jsonb, rev = ex.rev + 1, seq = newseq,
               deleted = TRUE, updated_by = me.id, updated_at = now()
         WHERE collection = c AND id = i;
        newrev := ex.rev + 1;
      END IF;
      results := results || (res || jsonb_build_object('s', 'ok', 'r', newrev, 'q', newseq));

    EXCEPTION WHEN OTHERS THEN
      results := results || (res || jsonb_build_object('s', 'invalid', 'm', 'galat_data'));
    END;
  END LOOP;

  RETURN jsonb_build_object('results', results,
    'epoch', (SELECT value FROM sync_meta WHERE key = 'epoch'));
END $$;

-- Pemeriksaan kesehatan untuk /api/health (tanpa data pengguna).
CREATE OR REPLACE FUNCTION app_health()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'accounts', (SELECT count(*) FROM profiles WHERE is_active),
    'docs', (SELECT count(*) FROM sync_docs WHERE NOT deleted),
    'epoch', (SELECT value FROM sync_meta WHERE key = 'epoch'));
$$;

-- ------------------------------------------------------------
-- 7. KUNCI AKSES: tutup semua jalur untuk anon / authenticated
-- ------------------------------------------------------------
DO $$
DECLARE r TEXT; f RECORD; roles TEXT[] := ARRAY[]::TEXT[]; rl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN roles := array_append(roles, 'anon'::text); END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN roles := array_append(roles, 'authenticated'::text); END IF;

  -- Tabel baru dan tabel lama: RLS aktif tanpa kebijakan = tertutup; ditambah REVOKE sebagai sabuk kedua.
  FOREACH r IN ARRAY ARRAY['sync_docs', 'sync_collections', 'sync_meta',
      'profiles', 'supervisor_assignments', 'transactions', 'transaction_items', 'user_missions',
      'user_badges', 'point_redemptions', 'daily_stories', 'savings_goals', 'arcade_plays',
      'family_feed_posts', 'family_chat_messages'] LOOP
    IF to_regclass('public.' || r) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r);
      FOREACH rl IN ARRAY roles LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', r, rl);
      END LOOP;
    END IF;
  END LOOP;
  FOREACH rl IN ARRAY roles LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.sync_seq FROM %I', rl);
  END LOOP;

  -- Fungsi app_*: hanya service_role (server kita) yang boleh memanggil.
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'app\_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    FOREACH rl IN ARRAY roles LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', f.sig, rl);
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 8. VERIFIKASI (jalankan manual setelah migrasi)
-- ------------------------------------------------------------
-- a) Semua tabel harus rls_aktif = true:
--    SELECT relname, relrowsecurity AS rls_aktif FROM pg_class
--     WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;
-- b) Tidak ada PIN teks biasa tersisa (harus 0):
--    SELECT count(*) FROM profiles WHERE pin_code <> '';
-- c) Penugasan terbawa (harus 17 untuk daftar keluarga saat ini):
--    SELECT count(*) FROM sync_docs WHERE collection = 'assignments';

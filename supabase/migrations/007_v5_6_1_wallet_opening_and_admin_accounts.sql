-- ============================================================
-- BukuDompet V5.6.1 — Buka Dompet, penjaga dompet, dan kelola akun Admin
-- Jalankan SETELAH 006. Aman dijalankan ulang (idempoten).
--
--   1. Penjaga server untuk koleksi `sub_wallets`: Supervisor hanya boleh menulis dompet hibah
--      (dompet kebutuhan darurat yang ia cairkan). Dompet biasa hanya diatur pemiliknya (anak) atau Admin.
--   2. Tabel `admin_audit` (jejak tindakan Admin; PIN TIDAK PERNAH dicatat).
--   3. Fungsi kelola akun: ubah nama/username, nonaktifkan/aktifkan, hapus permanen (hanya akun nonaktif).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PENJAGA (menggantikan app_guard_v56 dari 006, ditambah aturan sub_wallets)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_guard_v56()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  actor      profiles;
  is_staff   BOOLEAN;
  old_data   JSONB := '{}'::jsonb;
  old_live   BOOLEAN := FALSE;
BEGIN
  IF NEW.updated_by IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO actor FROM profiles WHERE id = NEW.updated_by;
  is_staff := FOUND AND actor.role IN ('admin', 'supervisor');

  IF TG_OP = 'UPDATE' AND NOT OLD.deleted THEN
    old_data := OLD.data;
    old_live := TRUE;
  END IF;

  -- Anggaran & target tabungan wajib: hanya Supervisor (yang ditugaskan, dicek `owner_sup`) atau Admin.
  IF NEW.collection = 'budget_configs' AND NOT is_staff THEN
    RAISE EXCEPTION 'SUPERVISOR_ONLY: anggaran hanya dapat diatur Supervisor';
  END IF;

  -- V5.6.1: dompet anak diatur anak itu sendiri. Supervisor (bukan pemilik) hanya boleh menyentuh
  -- dompet hibah (dibuat saat ia mencairkan pengajuan kebutuhan darurat). Admin tetap boleh (pemeliharaan).
  IF NEW.collection = 'sub_wallets' AND actor.role = 'supervisor'
     AND NEW.owner_id IS DISTINCT FROM actor.id
     AND coalesce(NULLIF(NEW.data->>'type', ''), old_data->>'type', '') <> 'grant' THEN
    RAISE EXCEPTION 'OWNER_ONLY: dompet hanya dapat diatur pemiliknya';
  END IF;

  IF NEW.collection = 'transactions' AND NOT NEW.deleted THEN
    -- Anak tidak boleh menandai catatannya sebagai buatan Supervisor atau sudah terverifikasi.
    IF NOT is_staff THEN
      IF NEW.data->>'createdByRole' = 'supervisor' THEN
        RAISE EXCEPTION 'SUPERVISOR_ONLY: catatan Supervisor tidak boleh dibuat oleh akun lain';
      END IF;
      IF NEW.data->>'verificationStatus' = 'verified'
         AND (NOT old_live OR old_data->>'verificationStatus' IS DISTINCT FROM 'verified') THEN
        RAISE EXCEPTION 'SUPERVISOR_ONLY: hanya Supervisor yang dapat memverifikasi pemasukan';
      END IF;
      -- Pemasukan yang sudah diverifikasi dikunci nominalnya.
      IF old_live AND old_data->>'verificationStatus' = 'verified'
         AND (NEW.data->'total_amount' IS DISTINCT FROM old_data->'total_amount'
              OR NEW.data->>'type' IS DISTINCT FROM old_data->>'type') THEN
        RAISE EXCEPTION 'LOCKED: pemasukan terverifikasi tidak boleh diubah';
      END IF;
    END IF;
  END IF;

  IF NEW.collection = 'grant_requests' AND NOT NEW.deleted AND NOT is_staff THEN
    -- Keputusan, nominal disetujui, dan pencairan adalah wewenang Supervisor.
    IF NEW.data->>'status' IN ('disbursed', 'rejected')
       AND (NOT old_live OR old_data->>'status' IS DISTINCT FROM NEW.data->>'status') THEN
      RAISE EXCEPTION 'SUPERVISOR_ONLY: hanya Supervisor yang dapat memutuskan pengajuan';
    END IF;
    IF old_live AND (NEW.data->'approvedAmount' IS DISTINCT FROM old_data->'approvedAmount'
                     OR NEW.data->'requestedAmount' IS DISTINCT FROM old_data->'requestedAmount')
       AND old_data->>'status' <> 'pending' THEN
      RAISE EXCEPTION 'LOCKED: nominal pengajuan yang sudah diputuskan tidak boleh diubah';
    END IF;
    IF NEW.data->>'status' = 'settled' AND coalesce(old_data->>'status', '') <> 'disbursed'
       AND coalesce(old_data->>'status', '') <> 'settled' THEN
      RAISE EXCEPTION 'INVALID: hanya pengajuan yang sudah dicairkan yang dapat diselesaikan';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_docs_guard_v56 ON sync_docs;
CREATE TRIGGER sync_docs_guard_v56
  BEFORE INSERT OR UPDATE ON sync_docs
  FOR EACH ROW
  WHEN (NEW.collection IN ('budget_configs', 'transactions', 'grant_requests', 'sub_wallets'))
  EXECUTE FUNCTION app_guard_v56();

REVOKE ALL ON FUNCTION app_guard_v56() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 2. JEJAK TINDAKAN ADMIN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor UUID,
  action TEXT NOT NULL,
  target UUID,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb   -- jangan pernah menaruh PIN di sini
);
CREATE INDEX IF NOT EXISTS admin_audit_at_idx ON admin_audit (at DESC);

-- ------------------------------------------------------------
-- 3. KELOLA AKUN (hanya Admin; peran akun TIDAK bisa diubah di sini)
-- ------------------------------------------------------------
-- Ubah nama tampilan & username. Dicerminkan ke dokumen profil agar semua perangkat ikut berubah.
CREATE OR REPLACE FUNCTION app_update_account(p_actor UUID, p_ver INT, p_target UUID, p_display TEXT, p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  me profiles; tgt profiles;
  uname TEXT := lower(btrim(coalesce(p_username, '')));
  dname TEXT := btrim(coalesce(p_display, ''));
BEGIN
  me := app_actor(p_actor, p_ver);
  IF me.role <> 'admin' THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  SELECT * INTO tgt FROM profiles WHERE id = p_target FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF uname !~ '^[a-z0-9_]{3,24}$' THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_username'); END IF;
  IF length(dname) NOT BETWEEN 1 AND 40 THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_name'); END IF;

  BEGIN
    UPDATE profiles SET username = uname, display_name = dname WHERE id = p_target;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'username_taken');
  END;

  PERFORM pg_advisory_xact_lock(7305001);   -- urutan seq = urutan commit, sama seperti app_sync_push
  UPDATE sync_docs
     SET data = data || jsonb_build_object('username', uname, 'display_name', dname),
         rev = rev + 1, seq = nextval('sync_seq'), updated_by = me.id, updated_at = now()
   WHERE collection = 'profiles' AND id = p_target::text AND NOT deleted;

  INSERT INTO admin_audit (actor, action, target, detail)
  VALUES (me.id, 'update_account', p_target,
          jsonb_build_object('from_username', tgt.username, 'to_username', uname,
                             'from_name', tgt.display_name, 'to_name', dname));
  RETURN jsonb_build_object('ok', true, 'id', p_target, 'username', uname, 'display_name', dname);
END $$;

-- Nonaktifkan / aktifkan akun. Menonaktifkan = tidak bisa masuk & semua sesi langsung berakhir; data tetap utuh.
CREATE OR REPLACE FUNCTION app_set_account_active(p_actor UUID, p_ver INT, p_target UUID, p_active BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE me profiles; tgt profiles;
BEGIN
  me := app_actor(p_actor, p_ver);
  IF me.role <> 'admin' THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF p_active IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'bad_request'); END IF;
  IF p_target = me.id THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_protected'); END IF;
  SELECT * INTO tgt FROM profiles WHERE id = p_target FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  IF NOT p_active AND tgt.role = 'admin' AND tgt.is_active
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' AND is_active AND id <> tgt.id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'last_admin');
  END IF;

  UPDATE profiles
     SET is_active = p_active, session_ver = session_ver + 1, failed_attempts = 0, locked_until = NULL
   WHERE id = p_target;

  PERFORM pg_advisory_xact_lock(7305001);
  UPDATE sync_docs
     SET data = data || jsonb_build_object('isActive', p_active),
         rev = rev + 1, seq = nextval('sync_seq'), updated_by = me.id, updated_at = now()
   WHERE collection = 'profiles' AND id = p_target::text AND NOT deleted;

  INSERT INTO admin_audit (actor, action, target, detail)
  VALUES (me.id, CASE WHEN p_active THEN 'activate_account' ELSE 'deactivate_account' END, p_target,
          jsonb_build_object('username', tgt.username, 'role', tgt.role));
  RETURN jsonb_build_object('ok', true, 'id', p_target, 'active', p_active);
END $$;

-- Hapus permanen. Hanya akun yang SUDAH nonaktif, dan Admin harus mengetik ulang username-nya.
-- Semua dokumen milik akun (catatan, dompet, dst.) dijadikan batu nisan; baris profil dihapus.
CREATE OR REPLACE FUNCTION app_delete_account(p_actor UUID, p_ver INT, p_target UUID, p_confirm TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE me profiles; tgt profiles; removed INT;
BEGIN
  me := app_actor(p_actor, p_ver);
  IF me.role <> 'admin' THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  IF p_target = me.id THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_protected'); END IF;
  SELECT * INTO tgt FROM profiles WHERE id = p_target FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF tgt.is_active THEN RETURN jsonb_build_object('ok', false, 'reason', 'must_deactivate_first'); END IF;
  IF lower(btrim(coalesce(p_confirm, ''))) <> lower(tgt.username) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'confirm_mismatch');
  END IF;

  BEGIN
    PERFORM pg_advisory_xact_lock(7305001);
    WITH gone AS (
      UPDATE sync_docs
         SET data = '{}'::jsonb, rev = rev + 1, seq = nextval('sync_seq'),
             deleted = TRUE, updated_by = me.id, updated_at = now()
       WHERE NOT deleted
         AND (owner_id = p_target
              OR (collection = 'assignments'
                  AND (id LIKE p_target::text || ':%' OR id LIKE '%:' || p_target::text)))
      RETURNING 1)
    SELECT count(*) INTO removed FROM gone;
    DELETE FROM profiles WHERE id = p_target;
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'in_use');
  END;

  INSERT INTO admin_audit (actor, action, target, detail)
  VALUES (me.id, 'delete_account', p_target,
          jsonb_build_object('username', tgt.username, 'role', tgt.role, 'docs_removed', removed));
  RETURN jsonb_build_object('ok', true, 'id', p_target, 'docs_removed', removed);
END $$;

-- Daftar jejak tindakan terakhir (tanpa data rahasia) untuk layar Admin.
CREATE OR REPLACE FUNCTION app_admin_audit(p_actor UUID, p_ver INT, p_limit INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE me profiles;
BEGIN
  me := app_actor(p_actor, p_ver);
  IF me.role <> 'admin' THEN RETURN jsonb_build_object('ok', false, 'reason', 'forbidden'); END IF;
  RETURN jsonb_build_object('ok', true, 'rows', coalesce((
    SELECT jsonb_agg(to_jsonb(r) ORDER BY r.at DESC) FROM (
      SELECT a.at, a.action, a.target, a.detail,
             (SELECT username FROM profiles WHERE id = a.actor) AS actor_username
        FROM admin_audit a ORDER BY a.at DESC LIMIT greatest(1, least(coalesce(p_limit, 30), 100))
    ) r
  ), '[]'::jsonb));
END $$;

-- ------------------------------------------------------------
-- 4. KUNCI AKSES (sama seperti 005): tabel baru tertutup, fungsi hanya untuk service_role
-- ------------------------------------------------------------
DO $$
DECLARE f RECORD; roles TEXT[] := ARRAY[]::TEXT[]; rl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN roles := array_append(roles, 'anon'::text); END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN roles := array_append(roles, 'authenticated'::text); END IF;

  ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
  FOREACH rl IN ARRAY roles LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.admin_audit FROM %I', rl);
    EXECUTE format('REVOKE ALL ON SEQUENCE public.admin_audit_id_seq FROM %I', rl);
  END LOOP;

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

INSERT INTO sync_meta (key, value) VALUES ('schema_version', '5.6.1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- BukuDompet 5.6 — Go-Live Refinement
-- Jalankan di Supabase > SQL Editor (aman dijalankan berulang / idempoten).
--
-- Catatan arsitektur: sejak 5.5 semua data aplikasi disimpan sebagai DOKUMEN di `sync_docs`
-- (kolom: collection, id, owner_id, data JSONB, rev, seq, deleted, updated_at). Tidak ada kolom
-- `state_json` / `sync_version`; padanannya adalah `data`, `rev` (naik 1 tiap perubahan) dan `seq`
-- (urutan global yang dipakai perangkat untuk menarik perubahan). Karena itu:
--   • "tabel baru" V5.6 = KOLEKSI baru di `sync_collections`;
--   • "paksa tarik ulang" = menaikkan `rev` + `seq` + `updated_at` pada dokumen yang diubah;
--   • "hapus" = batu nisan (`deleted = TRUE`) agar penghapusan sampai ke perangkat Tiara.
--
-- Isi:
--   1. Pembersihan poin "Uji Alarm" (sisa mode demo) milik user Tiara.
--   2. Koleksi baru: sub_wallets, grant_requests, monthly_closings, wishlist_items,
--      budget_configs, reconciliations, vault_loans.
--   3. Trigger penjaga: hal yang hanya boleh dilakukan Supervisor/Admin ditegakkan di SERVER,
--      bukan hanya di tampilan.
-- ============================================================

SET search_path = public, extensions;

-- ------------------------------------------------------------
-- 1. PEMBERSIHAN POIN "UJI ALARM" — user Tiara
-- ------------------------------------------------------------
-- Tombol uji lama membuat transaksi palsu (judul/kategori/2 item persis di bawah) yang ikut
-- mencetak poin catatan rinci. Hanya transaksi dengan ciri PERSIS itu yang disentuh, sehingga
-- catatan sungguhan Tiara aman. Poin dihitung ulang: GREATEST(0, total - poin yang dicabut).
DO $$
DECLARE
  v_uid     UUID;
  r         RECORD;
  v_removed INT;
BEGIN
  FOR v_uid IN
    SELECT id FROM profiles
     WHERE lower(username) = 'tiara' OR lower(display_name) LIKE '%tiara%'
  LOOP
    v_removed := 0;

    -- 1a. Riwayat poin = poin yang menempel pada dokumen transaksi.
    FOR r IN
      SELECT id, coalesce((data->>'points_earned')::INT, 0) AS pts
        FROM sync_docs
       WHERE collection = 'transactions'
         AND owner_id = v_uid
         AND NOT deleted
         AND data->>'title'    = 'Nongkrong Cafe & Dessert Impulsif'
         AND data->>'category' = 'Nongkrong'
         AND (data->>'total_amount')::NUMERIC = 65000
         AND jsonb_typeof(data->'items') = 'array'
         AND jsonb_array_length(data->'items') = 2
         AND data #>> '{items,0,item_name}' = 'Caramel Macchiato Large'
         AND data #>> '{items,1,item_name}' = 'Croissant Coklat Lumer'
       FOR UPDATE
    LOOP
      v_removed := v_removed + r.pts;
      UPDATE sync_docs
         SET data = '{}'::jsonb, deleted = TRUE, rev = rev + 1,
             seq = nextval('sync_seq'), updated_at = now()
       WHERE collection = 'transactions' AND id = r.id;
    END LOOP;

    -- 1b. Sisa tabel relasional lama (kosong di produksi; dijaga agar aman bila terisi).
    DELETE FROM transaction_items
     WHERE transaction_id IN (
       SELECT id FROM transactions
        WHERE user_id = v_uid AND title = 'Nongkrong Cafe & Dessert Impulsif' AND category = 'Nongkrong');
    DELETE FROM transactions
     WHERE user_id = v_uid AND title = 'Nongkrong Cafe & Dessert Impulsif' AND category = 'Nongkrong';

    -- 1c. Hitung ulang total poin pada dokumen profil, lalu naikkan rev/seq/updated_at
    --     agar perangkat Tiara menarik data bersih dan tidak mengunggah ulang cache lamanya.
    IF v_removed > 0 THEN
      UPDATE sync_docs
         SET data = data || jsonb_build_object(
               'points_balance',  GREATEST(0, coalesce((data->>'points_balance')::INT, 0)  - v_removed),
               'lifetime_points', GREATEST(0, coalesce((data->>'lifetime_points')::INT, 0) - v_removed)),
             rev = rev + 1, seq = nextval('sync_seq'), updated_at = now()
       WHERE collection = 'profiles' AND id = v_uid::TEXT AND NOT deleted;
    END IF;

    RAISE NOTICE 'Tiara %: % poin dicabut', v_uid, v_removed;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. KOLEKSI BARU V5.6
-- ------------------------------------------------------------
--   sub_wallets      Dompet kebutuhan / tabungan / dana khusus (zero-sum)
--   grant_requests   Pengajuan dana tambahan + keputusan Supervisor
--   monthly_closings Tutup buku bulanan (celengan vs bawa ke bulan depan)
--   wishlist_items   Ruang Tunggu Keinginan 48 jam
--   budget_configs   Anggaran bulanan & target tabungan wajib (diatur Supervisor)
--   reconciliations  Cocokkan saldo nyata (selisih "uang tuyul")
--   vault_loans      Pinjaman darurat internal dari Brankas Tabungan
INSERT INTO sync_collections (name, scope, write_policy, owner_kind, owner_key) VALUES
  ('sub_wallets',      'private', 'owner_sup', 'field', 'userId'),
  ('grant_requests',   'private', 'owner_sup', 'field', 'userId'),
  ('monthly_closings', 'private', 'owner_sup', 'field', 'userId'),
  ('wishlist_items',   'private', 'owner',     'field', 'userId'),
  ('budget_configs',   'private', 'owner_sup', 'field', 'userId'),
  ('reconciliations',  'private', 'owner',     'field', 'userId'),
  ('vault_loans',      'private', 'owner_sup', 'field', 'userId')
ON CONFLICT (name) DO UPDATE
  SET scope = EXCLUDED.scope, write_policy = EXCLUDED.write_policy,
      owner_kind = EXCLUDED.owner_kind, owner_key = EXCLUDED.owner_key;

INSERT INTO sync_meta (key, value) VALUES ('schema_version', '5.6')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ------------------------------------------------------------
-- 3. TRIGGER PENJAGA (ditegakkan di server)
-- ------------------------------------------------------------
-- `app_sync_push` sudah mengisi `updated_by` dengan akun pelaku. Pelanggaran membuat satu op
-- ditolak ("galat_data") tanpa membatalkan op lain. Perubahan tanpa pelaku (migrasi/operator DB)
-- tidak dibatasi.
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
  WHEN (NEW.collection IN ('budget_configs', 'transactions', 'grant_requests'))
  EXECUTE FUNCTION app_guard_v56();

-- Fungsi trigger tidak perlu dipanggil dari API.
REVOKE ALL ON FUNCTION app_guard_v56() FROM PUBLIC, anon, authenticated;

-- Muat ulang cache skema PostgREST.
NOTIFY pgrst, 'reload schema';

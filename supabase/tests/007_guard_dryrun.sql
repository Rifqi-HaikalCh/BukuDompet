-- Uji penjaga V5.6.1. JALANKAN SETELAH 007_v5_6_1_wallet_opening_and_admin_accounts.sql.
-- Aman: blok diakhiri error sengaja ("DRYRUN-SELESAI") sehingga SEMUA perubahan uji di-rollback.
-- Hasil ada di pesan error. Semua baris harus berawalan "ok".
DO $$
DECLARE
  kid CONSTANT UUID := '00000000-0000-4000-8000-000000000006';  -- tiara (user)
  sup CONSTANT UUID := '00000000-0000-4000-8000-000000000002';  -- supervisor
  res TEXT[] := '{}';
BEGIN
  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('sub_wallets','t-w1',kid,'{"userId":"x","type":"operational","key":"food"}',kid);
    res := res || 'ok A1 anak membuat dompetnya sendiri'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL A1: ' || SQLERRM); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"allocated":999999}', updated_by = sup WHERE collection = 'sub_wallets' AND id = 't-w1';
    res := res || 'GAGAL A2: supervisor mengubah dompet biasa anak'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok A2 supervisor ditolak mengubah dompet biasa: ' || left(SQLERRM, 40)); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('sub_wallets','t-w2',kid,'{"userId":"x","type":"operational","key":"fun"}',sup);
    res := res || 'GAGAL A3: supervisor membuat dompet biasa untuk anak'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok A3 supervisor ditolak membuat dompet biasa: ' || left(SQLERRM, 40)); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('sub_wallets','t-w3',kid,'{"userId":"x","type":"grant","key":"grant-g1"}',sup);
    res := res || 'ok A4 supervisor boleh mencairkan dompet hibah'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL A4: ' || SQLERRM); END;

  BEGIN
    UPDATE sync_docs SET data = '{}', deleted = TRUE, updated_by = sup WHERE collection = 'sub_wallets' AND id = 't-w1';
    res := res || 'GAGAL A5: supervisor menghapus dompet biasa'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok A5 supervisor ditolak menghapus dompet biasa: ' || left(SQLERRM, 40)); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"archived":true}', updated_by = kid WHERE collection = 'sub_wallets' AND id = 't-w1';
    res := res || 'ok A6 anak mengarsipkan dompetnya'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL A6: ' || SQLERRM); END;

  res := res || ('info tabel admin_audit ada: ' || (to_regclass('public.admin_audit') IS NOT NULL)::text);
  res := res || ('info fungsi akun terpasang: ' || (SELECT count(*) FROM pg_proc WHERE proname IN
      ('app_update_account','app_set_account_active','app_delete_account','app_admin_audit')) || ' dari 4');

  RAISE EXCEPTION E'DRYRUN-SELESAI (semua dibatalkan)\n%', array_to_string(res, E'\n');
END $$;

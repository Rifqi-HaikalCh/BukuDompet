-- Uji trigger penjaga V5.6. JALANKAN SETELAH 006_v5_6_golive_wallets_grants_and_cleanup.sql.
-- Aman: seluruh blok diakhiri error sengaja ("DRYRUN-SELESAI"), sehingga SEMUA perubahan uji
-- di-rollback otomatis. Hasil uji ada di pesan error. Semua baris harus berawalan "ok".
DO $$
DECLARE
  kid CONSTANT UUID := '00000000-0000-4000-8000-000000000006';  -- tiara (user)
  sup CONSTANT UUID := '00000000-0000-4000-8000-000000000002';  -- supervisor
  res TEXT[] := '{}';
  pts RECORD;
  tx_live INT; tx_del INT;
BEGIN
  SELECT data->>'points_balance' AS pb, data->>'lifetime_points' AS lp, rev INTO pts
    FROM sync_docs WHERE collection = 'profiles' AND id = kid::text;
  res := res || ('info profil Tiara: poin=' || pts.pb || ' seumur_hidup=' || pts.lp || ' rev=' || pts.rev);
  SELECT count(*) FILTER (WHERE NOT deleted), count(*) FILTER (WHERE deleted) INTO tx_live, tx_del
    FROM sync_docs WHERE collection = 'transactions' AND owner_id = kid;
  res := res || ('info transaksi Tiara: hidup=' || tx_live || ' batu_nisan=' || tx_del);

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('budget_configs','t-a',kid,'{"userId":"x"}',kid);
    res := res || 'GAGAL A: anak bisa menulis anggaran'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok A anak ditolak menulis anggaran: ' || left(SQLERRM, 40)); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('budget_configs','t-b',kid,'{"userId":"x"}',sup);
    res := res || 'ok B supervisor boleh menulis anggaran'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL B: ' || SQLERRM); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('transactions','t-c1',kid,'{"type":"income","total_amount":100,"verificationStatus":"verified"}',kid);
    res := res || 'GAGAL C1: anak memverifikasi sendiri'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok C1 anak ditolak memverifikasi: ' || left(SQLERRM, 40)); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('transactions','t-c2',kid,'{"type":"income","total_amount":100,"verificationStatus":"pending_supervisor","createdByRole":"child"}',kid);
    res := res || 'ok C2 pemasukan pending_supervisor diterima'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL C2: ' || SQLERRM); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('transactions','t-d',kid,'{"type":"income","total_amount":100,"createdByRole":"supervisor"}',kid);
    res := res || 'GAGAL D: anak menyamar sebagai supervisor'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok D anak ditolak menyamar: ' || left(SQLERRM, 40)); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"verificationStatus":"verified"}', updated_by = sup WHERE collection = 'transactions' AND id = 't-c2';
    res := res || 'ok E1 supervisor memverifikasi'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL E1: ' || SQLERRM); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"total_amount":999999}', updated_by = kid WHERE collection = 'transactions' AND id = 't-c2';
    res := res || 'GAGAL E2: nominal terverifikasi bisa diubah anak'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok E2 nominal terverifikasi terkunci: ' || left(SQLERRM, 40)); END;

  BEGIN
    INSERT INTO sync_docs (collection,id,owner_id,data,updated_by) VALUES ('grant_requests','g1',kid,'{"status":"pending","requestedAmount":500000}',kid);
    res := res || 'ok F1 anak mengajukan dana'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL F1: ' || SQLERRM); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"status":"disbursed","approvedAmount":500000}', updated_by = kid WHERE collection = 'grant_requests' AND id = 'g1';
    res := res || 'GAGAL F2: anak mencairkan sendiri'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok F2 anak ditolak mencairkan: ' || left(SQLERRM, 40)); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"status":"disbursed","approvedAmount":400000}', updated_by = sup WHERE collection = 'grant_requests' AND id = 'g1';
    res := res || 'ok F3 supervisor mencairkan'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL F3: ' || SQLERRM); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"approvedAmount":900000}', updated_by = kid WHERE collection = 'grant_requests' AND id = 'g1';
    res := res || 'GAGAL F4: anak mengubah nominal disetujui'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('ok F4 nominal disetujui terkunci: ' || left(SQLERRM, 40)); END;

  BEGIN
    UPDATE sync_docs SET data = data || '{"status":"settled"}', updated_by = kid WHERE collection = 'grant_requests' AND id = 'g1';
    res := res || 'ok F5 anak menyelesaikan pengajuan'::text;
  EXCEPTION WHEN OTHERS THEN res := res || ('GAGAL F5: ' || SQLERRM); END;

  res := res || ('info koleksi V5.6 terdaftar: '
    || (SELECT count(*) FROM sync_collections WHERE name IN
        ('sub_wallets','grant_requests','monthly_closings','wishlist_items','budget_configs','reconciliations','vault_loans'))
    || ' dari 7');

  RAISE EXCEPTION E'DRYRUN-SELESAI (semua dibatalkan)\n%', array_to_string(res, E'\n');
END $$;

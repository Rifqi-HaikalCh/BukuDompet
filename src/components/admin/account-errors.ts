/** Pesan ramah untuk kode penyebab dari server (fungsi akun Admin). */
export const ACCOUNT_ERRORS: Record<string, string> = {
  username_taken: "Username sudah dipakai. Gunakan username lain.",
  bad_username: "Username hanya boleh huruf kecil, angka, dan garis bawah (3–24 karakter).",
  bad_pin: "PIN harus tepat 4 angka.",
  bad_name: "Nama tampilan wajib diisi (maks. 40 karakter).",
  bad_role: "Peran akun tidak valid.",
  bad_budget: "Anggaran awal harus lebih dari Rp0 dan tabungan wajib harus lebih kecil dari anggaran.",
  bad_request: "Permintaan tidak lengkap. Muat ulang halaman lalu coba lagi.",
  forbidden: "Hanya Admin yang boleh melakukan ini.",
  session_invalid: "Sesimu berakhir. Masuk lagi sebagai Admin.",
  offline: "Tidak bisa tersambung ke server. Periksa internet lalu coba lagi.",
  not_found: "Akun tidak ditemukan.",
  self_protected: "Akun yang sedang Anda pakai tidak bisa dinonaktifkan atau dihapus.",
  last_admin: "Ini satu-satunya Admin aktif. Aktifkan Admin lain dulu sebelum menonaktifkannya.",
  must_deactivate_first: "Nonaktifkan akun ini dulu, baru bisa dihapus permanen.",
  confirm_mismatch: "Username yang diketik tidak sama dengan akun yang akan dihapus.",
  in_use: "Akun ini masih terhubung ke data lain sehingga belum bisa dihapus. Nonaktifkan saja.",
};

export const accountError = (reason?: string): string => (reason && ACCOUNT_ERRORS[reason]) || "Server sedang bermasalah. Coba lagi sebentar lagi.";

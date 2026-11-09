// Menjalankan semua uji BukuDompet dengan satu perintah: npm test
//
//   • Selalu jalan (tanpa jaringan / database): tests/server, tests/finance, tests/sync/crud-push.
//   • Hanya bila BD_TEST_PG diisi (Postgres yang sudah dimigrasi 001–006): tests/sync/db & tests/sync/engine.
//     Contoh: BD_TEST_PG=postgres://postgres:bdtest@localhost:5432/bdtest npm test
//
// Berkas .mts dijalankan dengan `tsx` (diunduh sementara lewat npx, tidak menambah dependensi proyek).
import { spawnSync } from "node:child_process";

const withDb = Boolean(process.env.BD_TEST_PG);

const suites = [
  { name: "Env & galat server", file: "tests/server/env.test.mts", runner: "tsx" },
  { name: "Logika keuangan V5.6", file: "tests/finance/finance-logic.test.mts", runner: "tsx" },
  { name: "CRUD → antrean → server tiruan (+ V5.6)", file: "tests/sync/crud-push.test.mts", runner: "tsx" },
  ...(withDb
    ? [
        { name: "Fungsi database (Postgres)", file: "tests/sync/db.test.mjs", runner: "node" },
        { name: "Mesin sinkron + database (V5.6)", file: "tests/sync/engine.test.mts", runner: "tsx" },
      ]
    : []),
];

const isWin = process.platform === "win32";
let failed = 0;

for (const s of suites) {
  console.log(`\n=== ${s.name} (${s.file}) ===`);
  const cmd = s.runner === "tsx" ? (isWin ? "npx.cmd" : "npx") : process.execPath;
  const args = s.runner === "tsx" ? ["--yes", "tsx", s.file] : [s.file];
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env, shell: isWin });
  if (r.status !== 0) {
    failed++;
    console.error(`GAGAL: ${s.file} (kode ${r.status})`);
  }
}

if (!withDb) {
  console.log("\nCatatan: uji berbasis Postgres dilewati (isi BD_TEST_PG untuk menjalankan engine.test.mts & db.test.mjs).");
}
console.log(failed ? `\n${failed} rangkaian uji gagal.` : "\nSemua rangkaian uji lulus.");
process.exit(failed ? 1 : 0);

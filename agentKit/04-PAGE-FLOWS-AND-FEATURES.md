---

### File 4: `agentKit/04-PAGE-FLOWS-AND-FEATURES.md`

```markdown
# PAGE FLOWS & USER EXPERIENCE BLUEPRINT

## 1. Entry Flow: "Pintu BukuDompet" (`/login`)
- Displays a cozy illustrated header and 3 tactile profile cards:
  1. **Adik (Pemilik Buku Kas)** — Role: `user`
  2. **Orang Tua (Supervisor)** — Role: `supervisor`
  3. **Abang (Admin & Sponsor Poin)** — Role: `admin`
- Clicking a card slides up a `vaul` drawer with a 4-digit tactile PIN pad.
- Default seeded PINs for immediate testing: User (`1111`), Supervisor (`2222`), Admin (`9999`).

## 2. User Flow (`/app` - Mobile-First Adventure Journal)
### Top Sticky HUD:
- **Streak Pill:** Flame icon + current streak days.
- **Point Wallet Pill:** Coin icon + rolling `Rp [points_balance]` (tapping opens the **Tukar Poin Jadi Saldo** modal).
- **Level & XP Ring:** Current level badge.

### Tab 1: Beranda & Jalur Kas (`/app`)
- **Mochi's Cozy Room Widget:** Interactive card at the top showing Mochi's current evolution stage, room decorations, speech bubble with encouraging/detective quotes, and Remaining Daily Safe Spend (`Sisa Jatah Aman Hari Ini: Rp XX.XXX`).
- **Time-Scope Switcher:** Tactile segmented control: `Harian (Jalur Petualangan)` | `Mingguan` | `Bulanan`.
- **The Adventure Track/Path:** 
  - Visual stepping stones representing days of the month.
  - Tapping a stone expands that day's itemized receipts with a celebratory animation.
  - Every 7th stone is a **Weekly Checkpoint Chest** that bounces when ready to claim.

### Central Floating Action Button (`+ Catat Kas` Drawer):
- Opens a fast, joyful Bottom Sheet:
  - Toggle: `Pengeluaran 💸` vs `Pemasukan 💰`
  - **Mode 1: Catat Kilat (Quick Input)** OR **Mode 2: Misi Rinci (+35 Poin Bonus! ✨)**
  - In **Misi Rinci**, user can either add rows (`Nama Item` + `Harga`) OR type in the **Smart Quick-Split Bar** (e.g., `Nasi Goreng 15000, Es Teh 5000`) which auto-populates the itemized rows!
  - Live **Point Preview Banner** at the bottom of the drawer: *"✨ Rincian terdeteksi! Kamu akan mendapat +35 Poin (Rp35) & +40 XP!"*
  - Upon clicking **Simpan Catatan**, trigger Web Audio coin chime, `canvas-confetti`, and floating `+35 Poin` toast.
  - Also includes a **"Hari Ini Nggak Jajan (Rp0 Spend)"** button so the user can keep their Daily Streak alive on zero-spend days!

### Tab 2: Misi & Tantangan (`/app/missions`)
- **Daily & Weekly Missions** with tactile `Klaim Hadiah!` 3D buttons.
- **Saving Challenge & Budget Challenge** tracks (e.g., *"Tantangan Tanpa Boba 7 Hari"*, *"Tabungan Akhir Bulan Rp300.000"*).
- **Mystery Box Gacha:** Shake-to-open chest animation when user has unclaimed Mystery Keys.

### Tab 3: Detektif Kas (`/app/detective`)
- **Spending Detective Report Card:**
  - Shows **Status Dompet** (Aman / Waspada / Bengkak!).
  - **Radar Bocor Halus:** Highlights top repeated small expenses with actionable savings tips.
  - Weekly & Monthly automatic calculation: `Total Pemasukan`, `Total Terpakai`, `Sisa Uang Minggu Ini`, `Sisa Uang Bulan Ini`.

### Tab 4: Koleksi & Tukar Poin (`/app/rewards`)
- **Tukar Poin (1 Poin = Rp1):** User inputs how many points to redeem -> generates a **Golden Cashout Ticket**.
- **Lemari Pujian (Achievement & Badges):** Grid of unlocked badges with heartfelt praise quotes (e.g., *"Penabung Ulung: Konsistensimu mencatat 7 hari berturut-turut adalah awal dari kebebasan finansial!"*).

## 3. Supervisor Flow (`/supervisor` - Parent-Friendly Dashboard)
- **User Selector Dropdown:** Choose which user's cashbook to inspect (defaults to Adik).
- **Kartu Ringkasan Orang Tua (Plain-Language Storytelling):**
  - Big, ultra-readable summary cards: `Sisa Uang Bulan Ini`, `Pengeluaran Hari Ini`, `Pengeluaran Minggu Ini`, and `Skor Kerajinan Mencatat (Streak)`.
- **Jurnal Harian Transparan (What, For What, How Much):**
  - Clean timeline of daily expenses showing the exact sub-items (e.g., instead of just "Makan Rp25.000", parents clearly see: `Nasi Ayam Bakar Rp18.000`, `Air Mineral Rp4.000`, `Kerupuk Rp3.000`).
- **Tombol Apresiasi Orang Tua:** Supervisor can click **"Kirim Stiker Semangat (+50 Poin Bonus)"** once a day to cheer the user on!

## 4. Admin Flow (`/admin` - Command Center & Sandbox)
- **Role View Switcher:** Instant toggle bar at the top to preview the live `User View` or `Supervisor View`, plus a **Sandbox / Simulasi Pencatatan** toggle to test recording transactions and triggering gamification animations without polluting real data (or recording directly if desired).
- **Approval Pencairan Poin (Cashout Queue):** Approve or reject pending point redemption requests from the User (when approved, automatically creates an `income` transaction *"Hadiah Tukar Poin Gamifikasi"* in the user's cashbook).
- **Budget & Challenge Configurator:** Adjust monthly allowance, saving targets, or inject custom bonus missions for the user.
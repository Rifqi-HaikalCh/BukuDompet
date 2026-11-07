# GAMIFICATION MECHANICS, POINT ECONOMY & SPENDING DETECTIVE FORMULA

## 1. Point-to-Rupiah Economy (1 Poin = Rp1)
Points (`poin_balance`) represent real monetary rewards redeemable by the User (Sister) and approved by the Admin/Supervisor.
- **Conversion Rate:** `1 Poin = Rp 1`
- **Anti-Exploit Daily Cap:** A user can earn points from at most **5 transaction inputs per day**. Subsequent transactions still record normally and grant small XP (+5 XP), but 0 Points to prevent artificial transaction splitting.

### Point & XP Earning Matrix:
1. **Basic Transaction Input (Description + Total Amount):** `+10 Poin` | `+15 XP`
2. **Detailed Itemized Input ("Misi Rinci" - At least 2 sub-items with individual prices AND specific item names >= 4 chars, not generic words like "makan", "jajan", "beli"):** 
   - Triggers **"COMBO DETAIL!"** animation.
   - Rewards: `+35 Poin` | `+40 XP` (plus `+5 Poin` per additional item, capped at `+50 Poin` per transaction).
3. **Daily Streak Maintenance (Catat minimal 1 transaksi atau klik tombol "Hari Ini Rp0 Pengeluaran!"):**
   - Daily login/record: `+25 Poin` | `+30 XP`
   - 7-Day Streak Milestone: `+500 Poin` + **1x Mystery Box**
   - 30-Day Streak Milestone: `+3.000 Poin` + **Golden Saver Badge** + **3x Mystery Boxes**
4. **Daily & Weekly Missions (Auto-generated 3 daily, 2 weekly):**
   - *Daily Misi 1:* "Detektif Struk" — Catat 1 pengeluaran dengan rincian minimal 2 item (`+50 Poin`).
   - *Daily Misi 2:* "Rem Pakem" — Pengeluaran kategori *Jajan/Wants* hari ini di bawah 50% batas harian (`+75 Poin`).
   - *Daily Misi 3:* "Jurnal Jujur" — Catat transaksi sebelum jam 21:00 WIB (`+30 Poin`).
   - *Weekly Misi:* "Pahlawan Anggaran" — Selesaikan 7 hari penuh dengan total pengeluaran di bawah Budget Mingguan (`+1.000 Poin`).
5. **Mystery Rewards (Gacha Chests):**
   - Unlocked at Weekly Path Checkpoints or every 500 XP.
   - Drop Table: 60% (`+150 to +300 Poin`), 25% (`+500 Poin`), 10% (`1x Streak Freeze Shield`), 5% (`Jackpot +1.500 Poin!`).

## 2. Virtual Companion: "Mochi si Kucing Celengan" (Zero to Millionaire Evolution)
The companion's state depends on two axes: **User Level (XP)** and **Current Monthly Budget Health (Mood)**.
- **5 Evolution Stages (Based on Level & Total Saved):**
  - **Stage 1 (Lv 1-3) - "Mochi Kardus":** Wearing a newspaper hat, sleeping on a patched cardboard box with an empty tin can.
  - **Stage 2 (Lv 4-7) - "Mochi Perintis":** Wearing a cute knit scarf, sitting on a pastel cushion with a ceramic piggy bank.
  - **Stage 3 (Lv 8-12) - "Mochi Manajer":** Wearing round glasses and a vest, holding a calculator inside a cozy study room with plants.
  - **Stage 4 (Lv 13-18) - "Mochi Bos Muda":** Wearing a pastel blazer, sipping matcha latte next to a glowing safe full of gold coins.
  - **Stage 5 (Lv 19+) - "Sultan Mochi Jutawan":** Wearing a tiny crown and silk cape on a velvet throne with floating golden coins and sparkles.
- **4 Dynamic Mood States (Real-time reaction):**
  - `HAPPY`: Today's spend <= 80% of Daily Safe Limit.
  - `PROUD_COMBO`: Triggered for 5 seconds right after submitting an itemized transaction.
  - `WORRIED`: Today's spend is between 80% and 100% of Daily Safe Limit.
  - `SHOCKED_BOROS`: Today's spend > 100% of Daily Safe Limit (Spending Detective Siren active).

## 3. Spending Detective Mathematical Engine
Every expense category belongs to either `NEEDS` (Makan Pokok, Transportasi, Kuliah/Alat Tulis, Tagihan) or `WANTS` (Jajan/Cemilan, Kopi/Minuman, Nongkrong, Belanja/Hiburan, Lainnya).

### Formula 1: Dynamic Daily Safe Spend Limit (DSSL)
- `Monthly_Spendable_Pool = Monthly_Income_Or_Allowance - Monthly_Saving_Target`
- `Remaining_Pool = Monthly_Spendable_Pool - Total_Spent_This_Month`
- `DSSL = MAX(0, Remaining_Pool / Remaining_Days_In_Month)`

### Formula 2: Bengkak Harian (Daily Overburn Index - DOI)
- `DOI = Today_Total_Spend / DSSL`
- **Status Normal (Hijau):** `DOI <= 0.85`
- **Status Waspada (Kuning):** `0.85 < DOI <= 1.15`
- **Status Bengkak! (Merah - Detective Alert):** `DOI > 1.15` AND `Today_Wants_Spend > (0.4 * Today_Total_Spend)`
  *(Note: If the user spent a lot on `NEEDS` like buying textbooks, the Detective marks it as "Pengeluaran Penting Terdeteksi", NOT "Boros!").*

### Formula 3: Bocor Halus Detector (Micro-Leak / Latte Factor)
- Scans the last 7 days of `transaction_items` and `transactions` in `WANTS` categories.
- **Trigger Condition:** Frequency of a specific `WANTS` subcategory or item keyword >= 4 times in 7 days, OR cumulative small transactions (`< Rp 35.000` each) exceed `30%` of the weekly allowance.
- **Detective Output Card:** *"🕵️‍♂️ Investigasi Detektif Mochi: Minggu ini kamu sudah beli [Kopi/Jajan] sebanyak 5x dengan total Rp95.000. Kalau dikurangi 2x saja, kamu bisa hemat Rp38.000!"*
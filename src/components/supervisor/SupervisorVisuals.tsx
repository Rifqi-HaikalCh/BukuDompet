"use client";

/**
 * Visual penjelas untuk Supervisor (V5.6.1): aliran uang bulanan, lintasan siklus, dan kartu "cara kerja".
 * Bernada tenang (krem, biru muda, lavender) dan seluruh gerak mengikuti preferensi "kurangi gerak".
 */
import React, { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { GlyphInline, type GlyphName } from "@/components/illustrations/GlyphIcons";
import { WalletIllustration } from "@/components/wallet/WalletIllustration";
import { formatRupiah } from "@/components/ui/CozyPrimitives";
import { cn } from "@/lib/utils";

/* ───────────── penjelas anggaran (statis, tanpa animasi) ───────────── */

const INK = "#3D352E";
const ART = { stroke: INK, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function ArtMoneyBag() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden>
      <path d="M14 22 Q5 32 11 40 Q24 47 37 40 Q43 32 34 22Z" fill="#FFC800" {...ART} />
      <path d="M17 22 L15 13 Q24 18 33 13 L31 22Z" fill="#FFE27A" {...ART} />
      <path d="M16 13 Q24 8 32 13" fill="none" {...ART} />
      <text x="24" y="37" textAnchor="middle" fontSize="11" fontWeight="800" fill={INK} fontFamily="inherit">Rp</text>
    </svg>
  );
}

function ArtVault() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden>
      <path d="M33 19 Q36 11 40 18Z" fill="#FF8B7B" {...ART} />
      <rect x="13" y="36" width="6" height="7" rx="2.5" fill="#FF8B7B" {...ART} />
      <rect x="29" y="36" width="6" height="7" rx="2.5" fill="#FF8B7B" {...ART} />
      <ellipse cx="23" cy="29" rx="16" ry="12" fill="#FFB5A8" {...ART} />
      <ellipse cx="39" cy="31" rx="5" ry="4" fill="#FF8B7B" {...ART} />
      <circle cx="33" cy="26" r="1.8" fill={INK} />
      <path d="M17 18 H27" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M8 27 Q3 24 6 20" fill="none" {...ART} />
    </svg>
  );
}

function ArtWallet() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden>
      <rect x="6" y="13" width="36" height="27" rx="7" fill="#A8E87A" {...ART} />
      <path d="M6 22 Q6 13 15 13 H33 Q42 13 42 22Z" fill="#58CC02" {...ART} />
      <rect x="28" y="25" width="14" height="10" rx="5" fill="#FFFDF7" {...ART} />
      <circle cx="34" cy="30" r="2" fill="#FFC800" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

function ArtHourglass() {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden>
      <path d="M15 8 Q15 22 24 25 Q33 22 33 8Z" fill="#FFFDF7" {...ART} />
      <path d="M15 40 Q15 28 24 25 Q33 28 33 40Z" fill="#FFFDF7" {...ART} />
      <path d="M19 38 Q20 31 24 29 Q28 31 29 38Z" fill="#FFC800" />
      <path d="M12 8 H36 M12 40 H36" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Peta aliran uang bulanan untuk orang tua: Uang bulanan → Brankas (tabungan wajib), Dompet anak, Belum dibagi.
 * Statis dan berwarna hangat (madu, matcha, pasir); setiap kotak punya gambar dan penjelasan satu kalimat.
 */
export function BudgetExplainer({ monthlyCash, mandatory, allocated, unallocated }: { monthlyCash: number; mandatory: number; allocated: number; unallocated: number }) {
  const total = Math.max(1, monthlyCash);
  const parts = [
    { id: "save", art: <ArtVault />, label: "Brankas", sub: "Tabungan wajib", value: Math.max(0, mandatory), hint: "Disisihkan lebih dulu, tidak bisa dibelanjakan.", tile: "bg-[#FFFBEB] border-[#FDE08D]", bar: "bg-[#FFC800]" },
    { id: "wallet", art: <ArtWallet />, label: "Dompet anak", sub: "Sudah dibagi", value: Math.max(0, allocated), hint: "Jatah belanja yang dipilih anak.", tile: "bg-[#F1FBE7] border-[#CBEFAA]", bar: "bg-[#58CC02]" },
    { id: "free", art: <ArtHourglass />, label: "Belum dibagi", sub: "Menunggu anak", value: Math.max(0, unallocated), hint: "Anak belum menentukan dompetnya.", tile: "bg-[#F7F3EB] border-[#E6DFD2]", bar: "bg-[#D9CFBE]" },
  ];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#EFE8DA] p-2.5">
        <span className="w-11 h-11 shrink-0"><ArtMoneyBag /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[#7A6E65]">Uang bulanan dari Anda</p>
          <p className="font-display text-lg font-extrabold tabular-nums text-[#3D352E] truncate">{formatRupiah(monthlyCash)}</p>
        </div>
        <span className="ml-auto text-[11px] font-display font-extrabold text-[#7A6E65] shrink-0">dibagi jadi 3 ↓</span>
      </div>

      <div className="flex h-3.5 rounded-full overflow-hidden border-2 border-[#E6DFD2] bg-[#F7F3EB]" role="img" aria-label={`Uang bulanan ${formatRupiah(monthlyCash)} dibagi: ${parts.map((p) => `${p.label} ${formatRupiah(p.value)}`).join(", ")}`}>
        {parts.map((p) => (
          <div key={p.id} className={p.bar} style={{ width: `${Math.min(100, (p.value / total) * 100)}%` }} />
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {parts.map((p) => (
          <li key={p.id} className={cn("rounded-2xl border-2 p-2.5 flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5", p.tile)}>
            <span className="w-10 h-10 shrink-0">{p.art}</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-display font-extrabold text-[#3D352E] leading-tight">{p.label}</span>
              <span className="block font-display text-sm font-extrabold tabular-nums text-[#3D352E]">{formatRupiah(p.value)}</span>
              <span className="block text-[10px] font-bold text-[#7A6E65] leading-snug">{p.hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Seberapa banyak uang bulanan sudah terpakai (statis; hijau aman, madu waspada, persik hampir habis). */
export function SpendMeter({ spent, budget }: { spent: number; budget: number }) {
  const ratio = Math.min(1, Math.max(0, spent) / Math.max(1, budget));
  const pct = Math.round(ratio * 100);
  const tone = ratio > 0.9 ? { bar: "bg-[#FF8B7B]", text: "Hampir habis" } : ratio > 0.7 ? { bar: "bg-[#FFC800]", text: "Mulai menipis" } : { bar: "bg-[#58CC02]", text: "Masih aman" };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-display font-extrabold text-[#3D352E]">Terpakai {pct}% dari uang bulanan</p>
        <span className="text-[11px] font-bold text-[#7A6E65]">{tone.text}</span>
      </div>
      <div className="h-3.5 rounded-full bg-[#F7F3EB] border-2 border-[#E6DFD2] overflow-hidden" role="img" aria-label={`Terpakai ${pct} persen dari uang bulanan`}>
        <div className={cn("h-full", tone.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Hari ke berapa dalam siklus: deretan kotak kecil, satu per hari (statis). */
export function CycleDays({ totalDays, daysLeft, label }: { totalDays: number; daysLeft: number; label: string }) {
  const total = Math.max(1, totalDays);
  const day = Math.min(total, Math.max(1, total - daysLeft + 1));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <GlyphInline name="calendar" className="w-4 h-4 shrink-0" />
        <p className="text-xs font-display font-extrabold text-[#3D352E]">
          Hari ke-{day} dari {total}
          <span className="font-bold text-[#7A6E65]"> • sisa {Math.max(0, daysLeft)} hari</span>
        </p>
      </div>
      <div className="flex gap-[2px]" role="img" aria-label={`Hari ke-${day} dari ${total} dalam siklus`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-3 flex-1 rounded-[3px]", i + 1 < day ? "bg-[#B9AC97]" : i + 1 === day ? "bg-[#FFC800] border border-[#3D352E]" : "bg-[#EFE8DA]")} />
        ))}
      </div>
      <p className="text-[11px] font-bold text-[#7A6E65]">{label}</p>
    </div>
  );
}

/* ───────────── lonceng & centang animasi ───────────── */

export function WigglingBell({ active }: { active: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="inline-grid place-items-center"
      animate={active ? { rotate: [0, -16, 14, -10, 8, 0] } : { rotate: 0 }}
      transition={active ? { duration: 1.1, repeat: Infinity, repeatDelay: 2.2 } : undefined}
      style={{ transformOrigin: "50% 10%" }}
    >
      <GlyphInline name="mailbox" className="w-5 h-5" />
    </motion.span>
  );
}

export function AllClearCheck() {
  return (
    <MotionConfig reducedMotion="user">
      <svg viewBox="0 0 64 64" className="w-16 h-16" aria-hidden>
        <motion.circle cx={32} cy={32} r={26} fill="#EFFBE6" stroke="#3D352E" strokeWidth={3} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 14 }} style={{ transformOrigin: "center" }} />
        <motion.path d="M20 33 L29 42 L45 24" fill="none" stroke="#58CC02" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5 }} />
      </svg>
    </MotionConfig>
  );
}

/* ───────────── cara kerja (3 langkah beranimasi) ───────────── */

const STEPS: { icon: GlyphName; title: string; body: string; visual: "open" | "mood" | "guard" }[] = [
  { icon: "coin", title: "1. Anak membuka dompet", body: "Anak membagi uang bulanannya ke dompet: mengikuti rekomendasi sistem atau menyusun sendiri. Setiap dompet tercatat cara pembukaannya.", visual: "open" },
  { icon: "eye", title: "2. Anda memantau, tidak mengubah", body: "Dompet anak tampil hanya-lihat. Wajah dompet menunjukkan kondisinya: senang = aman, cemas = menipis, pusing = hampir habis.", visual: "mood" },
  { icon: "shield_check", title: "3. Anda memegang kendali", body: "Anggaran, tabungan wajib, kebutuhan darurat, dan pinjaman celengan hanya jadi nyata setelah Anda menyetujuinya.", visual: "guard" },
];

export function HowItWorks() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % STEPS.length), 4500);
    return () => window.clearInterval(t);
  }, [paused]);
  const s = STEPS[i];
  return (
    <MotionConfig reducedMotion="user">
      <div className="rounded-2xl bg-[#FBF7FF] border-2 border-[#E9DDF7] p-3 space-y-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.25 }} className="flex items-center gap-3">
            <div className="w-24 shrink-0 flex items-end justify-center gap-0.5">
              {s.visual === "open" && <WalletIllustration ratio={0.85} open pulseKey={1} className="w-full" label="Dompet baru dibuka" />}
              {s.visual === "mood" && (
                <>
                  <WalletIllustration ratio={0.8} className="w-8" label="Dompet aman" />
                  <WalletIllustration ratio={0.2} className="w-8" label="Dompet menipis" />
                  <WalletIllustration ratio={0.03} className="w-8" label="Dompet hampir habis" />
                </>
              )}
              {s.visual === "guard" && <WalletIllustration type="commitment" ratio={0.6} locked className="w-full" label="Dompet terkunci" />}
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="font-display text-sm font-extrabold text-[#3D352E] flex items-center gap-1.5">
                <GlyphInline name={s.icon} className="w-4 h-4" /> {s.title}
              </p>
              <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">{s.body}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Langkah cara kerja">
          {STEPS.map((_, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Langkah ${k + 1}`} onClick={() => setI(k)} className={cn("h-2 rounded-full cursor-pointer transition-all", k === i ? "w-6 bg-[#CE82FF]" : "w-2 bg-[#E2C6FF]")} />
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}

"use client";

/**
 * Konfirmasi WAJIB sebelum setiap tindakan Admin dikirim ke database (V5.6.1).
 * Modal menampilkan ringkasan apa yang akan berubah, mengunci tombol saat mengirim, dan hanya menutup bila server
 * menjawab berhasil. Bila gagal, pesan galat tampil di dalam modal dan Admin bisa mencoba lagi atau membatalkan.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { TactileButton, type TactileVariant } from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export interface AdminActionResult {
  ok: boolean;
  /** Pesan hasil (berhasil atau galat) yang aman ditampilkan. */
  message?: string;
}

export interface AdminActionSpec {
  title: string;
  description?: string;
  /** Ringkasan perubahan: baris "label → nilai". */
  rows?: { label: string; from?: string; to: string }[];
  confirmLabel?: string;
  variant?: TactileVariant;
  /** Bila diisi, Admin harus mengetik teks ini persis (mis. username) sebelum tombol aktif. */
  typeToConfirm?: string;
  /** Peringatan tebal untuk tindakan yang tidak bisa dibatalkan. */
  danger?: string;
  run: () => Promise<AdminActionResult>;
}

type Ctx = { ask: (spec: AdminActionSpec) => void; busy: boolean };
const AdminActionContext = createContext<Ctx | null>(null);

export function useAdminAction(): Ctx {
  const c = useContext(AdminActionContext);
  if (!c) throw new Error("useAdminAction harus dipakai di dalam <AdminActionProvider>");
  return c;
}

type Phase = "idle" | "sending" | "done" | "error";

export function AdminActionProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpec] = useState<AdminActionSpec | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const closing = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    window.clearTimeout(closing.current);
    setSpec(null);
    setPhase("idle");
    setMessage(null);
    setTyped("");
  }, []);

  const ask = useCallback((s: AdminActionSpec) => {
    window.clearTimeout(closing.current);
    soundEffects.tactileClick();
    setSpec(s);
    setPhase("idle");
    setMessage(null);
    setTyped("");
  }, []);

  const confirm = async () => {
    if (!spec || phase === "sending") return;
    setPhase("sending");
    setMessage(null);
    let res: AdminActionResult;
    try {
      res = await spec.run();
    } catch {
      res = { ok: false, message: "Terjadi galat tak terduga. Coba lagi." };
    }
    if (res.ok) {
      setPhase("done");
      setMessage(res.message ?? "Berhasil disimpan.");
      soundEffects.coinChime();
      closing.current = window.setTimeout(close, 1100);
    } else {
      setPhase("error");
      setMessage(res.message ?? "Belum berhasil. Coba lagi.");
      soundEffects.detectiveBuzz();
    }
  };

  const needType = Boolean(spec?.typeToConfirm);
  const typeOk = !needType || typed.trim().toLowerCase() === spec!.typeToConfirm!.toLowerCase();
  const sending = phase === "sending";
  const value = useMemo(() => ({ ask, busy: sending }), [ask, sending]);

  return (
    <AdminActionContext.Provider value={value}>
      {children}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {spec && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={spec.title}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !sending && phase !== "done" && close()}
                className="fixed inset-0 bg-[#3D352E]/45 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
                className="relative z-10 w-full max-w-md rounded-3xl bg-white border-2 border-[#E6DFD2] border-b-[6px] border-b-[#D4C9B4] p-5 sm:p-6 space-y-4"
              >
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EEF8FF] border border-[#BCE3FF] text-[11px] font-display font-extrabold text-[#1565C0]">
                    Konfirmasi sebelum dikirim ke database
                  </span>
                  <h3 className="font-display text-lg font-extrabold text-[#3D352E] leading-snug">{spec.title}</h3>
                  {spec.description && <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">{spec.description}</p>}
                </div>

                {spec.rows && spec.rows.length > 0 && (
                  <ul className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] divide-y divide-[#E6DFD2]">
                    {spec.rows.map((r) => (
                      <li key={r.label} className="px-3 py-2 flex items-start justify-between gap-3 text-xs">
                        <span className="font-display font-extrabold text-[#7A6E65] shrink-0">{r.label}</span>
                        <span className="text-right font-bold text-[#3D352E] break-words min-w-0">
                          {r.from !== undefined && r.from !== r.to && <span className="text-[#A39A90] line-through mr-1.5">{r.from}</span>}
                          {r.to}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {spec.danger && <p className="rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] p-3 text-xs font-extrabold text-[#C83E2B] leading-relaxed">{spec.danger}</p>}

                {needType && (
                  <label className="block">
                    <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">
                      Ketik <span className="text-[#C83E2B]">{spec.typeToConfirm}</span> untuk melanjutkan
                    </span>
                    <input
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      autoComplete="off"
                      autoCapitalize="none"
                      disabled={sending || phase === "done"}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#E6DFD2] bg-white font-display text-sm font-extrabold text-[#3D352E] focus:outline-none focus:border-[#FF8B7B]"
                    />
                  </label>
                )}

                <AnimatePresence initial={false} mode="wait">
                  {phase !== "idle" && (
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role={phase === "error" ? "alert" : "status"}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border-2 p-2.5 text-xs font-extrabold",
                        phase === "sending" && "bg-[#EEF8FF] border-[#BCE3FF] text-[#1565C0]",
                        phase === "done" && "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]",
                        phase === "error" && "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]",
                      )}
                    >
                      {phase === "sending" && (
                        <>
                          <motion.span aria-hidden className="w-4 h-4 rounded-full border-2 border-[#1565C0] border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                          Mengirim ke database…
                        </>
                      )}
                      {phase === "done" && <>✓ {message}</>}
                      {phase === "error" && <>{message}</>}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-2">
                  <TactileButton type="button" variant="white" size="md" disabled={sending || phase === "done"} onClick={close}>
                    Batal
                  </TactileButton>
                  <TactileButton type="button" variant={spec.variant ?? "matcha"} size="md" disabled={sending || phase === "done" || !typeOk} onClick={() => void confirm()}>
                    {sending ? "Mengirim…" : phase === "error" ? "Coba Lagi" : spec.confirmLabel ?? "Ya, Kirim"}
                  </TactileButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </AdminActionContext.Provider>
  );
}

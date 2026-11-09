"use client";

/**
 * Kelola Akun (CRUD) untuk Admin (V5.6.1). Daftar akun dengan pencarian & filter, ubah nama/username, ganti PIN,
 * nonaktifkan/aktifkan, dan hapus permanen (hanya akun yang sudah nonaktif, dengan mengetik ulang username).
 * Setiap aksi lewat konfirmasi (AdminActionModal) dan ditegakkan ulang di database. Peran akun tidak bisa diubah.
 */
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CozyCard, TactileButton } from "@/components/ui/CozyPrimitives";
import { CozySheet } from "@/components/ui/CozySheet";
import { FIELD_CLASS } from "@/components/ui/MoneyInput";
import { GlyphInline } from "@/components/illustrations/GlyphIcons";
import { useAdminAction } from "@/components/admin/AdminActionModal";
import { accountError } from "@/components/admin/account-errors";
import { adminAuditLog, adminDeleteAccount, adminSetAccountActive, adminSetPin, adminUpdateAccount, type AdminAuditRow } from "@/lib/sync/client";
import { getSessionUser } from "@/lib/sync/session-ref";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/store/useBukuDompetStore";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", supervisor: "Supervisor", user: "User", schoolchild: "Anak SD" };
const ROLE_TONE: Record<string, string> = {
  admin: "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2]",
  supervisor: "bg-[#F8F0FF] text-[#8A3FC2] border-[#E2C6FF]",
  user: "bg-[#EFFBE6] text-[#2E6F00] border-[#C3EFA4]",
  schoolchild: "bg-[#FFFBEB] text-[#8A6A00] border-[#FDE08D]",
};
const ROLE_ORDER = ["admin", "supervisor", "user", "schoolchild"];
const AUDIT_LABEL: Record<string, string> = {
  update_account: "Ubah akun",
  deactivate_account: "Nonaktifkan akun",
  activate_account: "Aktifkan akun",
  delete_account: "Hapus akun",
};

type RoleFilter = "all" | "admin" | "supervisor" | "user" | "schoolchild";
type StatusFilter = "active" | "inactive" | "all";

const UNAME = /^[a-z0-9_]{3,24}$/;

function Initials({ name, role }: { name: string; role: string }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return <span className={cn("w-10 h-10 rounded-2xl border-2 grid place-items-center font-display text-sm font-extrabold shrink-0", ROLE_TONE[role] ?? ROLE_TONE.user)}>{letters}</span>;
}

export function AccountManager({ profiles }: { profiles: ProfileData[] }) {
  const { ask, busy } = useAdminAction();
  const me = getSessionUser()?.id;
  const [query, setQuery] = useState("");
  const [roleF, setRoleF] = useState<RoleFilter>("all");
  const [statusF, setStatusF] = useState<StatusFilter>("active");
  const [editing, setEditing] = useState<ProfileData | null>(null);
  const [eName, setEName] = useState("");
  const [eUser, setEUser] = useState("");
  const [eErr, setEErr] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<ProfileData | null>(null);
  const [pin, setPin] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState<AdminAuditRow[] | null>(null);
  const [auditErr, setAuditErr] = useState<string | null>(null);

  const activeAdmins = profiles.filter((p) => p.role === "admin" && p.isActive !== false).length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .filter((p) => (roleF === "all" ? true : p.role === roleF))
      .filter((p) => (statusF === "all" ? true : statusF === "active" ? p.isActive !== false : p.isActive === false))
      .filter((p) => !q || p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.display_name.localeCompare(b.display_name, "id"));
  }, [profiles, query, roleF, statusF]);

  const loadAudit = async () => {
    setAuditErr(null);
    const r = await adminAuditLog(30);
    if (r.ok) setAudit(r.rows);
    else setAuditErr(accountError(r.reason));
  };
  useEffect(() => {
    if (auditOpen && audit === null) void loadAudit();
  }, [auditOpen, audit]);

  const openEdit = (p: ProfileData) => {
    soundEffects.tactileClick();
    setEditing(p);
    setEName(p.display_name);
    setEUser(p.username);
    setEErr(null);
  };

  const submitEdit = () => {
    if (!editing) return;
    const name = eName.trim();
    const user = eUser.trim().toLowerCase();
    if (!name || name.length > 40) return setEErr("Nama tampilan wajib diisi (maks. 40 karakter).");
    if (!UNAME.test(user)) return setEErr("Username hanya huruf kecil, angka, dan garis bawah (3–24 karakter).");
    if (name === editing.display_name && user === editing.username) return setEErr("Belum ada yang diubah.");
    const target = editing;
    setEditing(null);
    ask({
      title: `Simpan perubahan untuk ${target.display_name}?`,
      description: "Perubahan langsung berlaku di semua perangkat. Peran akun tidak berubah.",
      rows: [
        { label: "Nama tampilan", from: target.display_name, to: name },
        { label: "Username", from: `@${target.username}`, to: `@${user}` },
        { label: "Peran", to: ROLE_LABEL[target.role] ?? target.role },
      ],
      confirmLabel: "Ya, Simpan",
      run: async () => {
        const r = await adminUpdateAccount(target.id, name, user);
        return r.ok ? { ok: true, message: "Akun diperbarui." } : { ok: false, message: accountError(r.reason) };
      },
    });
  };

  const submitPin = () => {
    if (!pinFor || pin.length !== 4) return;
    const target = pinFor;
    const value = pin;
    setPinFor(null);
    setPin("");
    ask({
      title: `Ganti PIN ${target.display_name}?`,
      description: "PIN lama tidak bisa dilihat. Semua sesi akun ini langsung berakhir dan harus masuk lagi dengan PIN baru.",
      rows: [
        { label: "Akun", to: `${target.display_name} (@${target.username})` },
        { label: "PIN baru", to: "••••" },
      ],
      confirmLabel: "Ya, Ganti PIN",
      variant: "sky",
      run: async () => {
        const r = await adminSetPin(target.id, value);
        return r.ok ? { ok: true, message: "PIN diganti. Sesi lama akun itu berakhir." } : { ok: false, message: accountError(r.reason) };
      },
    });
  };

  const toggleActive = (p: ProfileData) => {
    const next = p.isActive === false;
    ask({
      title: next ? `Aktifkan kembali ${p.display_name}?` : `Nonaktifkan ${p.display_name}?`,
      description: next
        ? "Akun bisa masuk lagi memakai username dan PIN-nya."
        : "Akun tidak bisa masuk dan semua sesinya langsung berakhir. Data tetap utuh dan akun bisa diaktifkan lagi kapan saja.",
      rows: [
        { label: "Akun", to: `${p.display_name} (@${p.username})` },
        { label: "Status", from: next ? "Nonaktif" : "Aktif", to: next ? "Aktif" : "Nonaktif" },
      ],
      confirmLabel: next ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      variant: next ? "matcha" : "peach",
      run: async () => {
        const r = await adminSetAccountActive(p.id, next);
        return r.ok ? { ok: true, message: next ? "Akun diaktifkan." : "Akun dinonaktifkan." } : { ok: false, message: accountError(r.reason) };
      },
    });
  };

  const remove = (p: ProfileData) =>
    ask({
      title: `Hapus permanen ${p.display_name}?`,
      description: "Seluruh data milik akun ini (catatan kas, dompet, pengajuan, penugasan) ikut dihapus dari semua perangkat.",
      rows: [{ label: "Akun", to: `${p.display_name} (@${p.username})` }, { label: "Peran", to: ROLE_LABEL[p.role] ?? p.role }],
      danger: "Tindakan ini TIDAK bisa dibatalkan. Bila hanya ingin menghentikan akses, cukup biarkan akun ini nonaktif.",
      typeToConfirm: p.username,
      confirmLabel: "Ya, Hapus Permanen",
      variant: "berry",
      run: async () => {
        const r = await adminDeleteAccount(p.id, p.username);
        return r.ok ? { ok: true, message: "Akun dihapus permanen." } : { ok: false, message: accountError(r.reason) };
      },
    });

  const chip = (on: boolean) =>
    cn("shrink-0 px-3 py-1.5 rounded-xl border-2 text-xs font-display font-extrabold cursor-pointer", on ? "bg-white border-[#38B6FF] border-b-[4px] border-b-[#1E88E5] text-[#3D352E]" : "bg-[#F7F3EB] border-[#E6DFD2] text-[#7A6E65]");

  return (
    <MotionConfig reducedMotion="user">
      <CozyCard tone="white" className="space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">Kelola Akun</h2>
            <p className="text-xs font-bold text-[#7A6E65] leading-relaxed">Ubah data, ganti PIN, nonaktifkan, atau hapus akun. Peran akun tidak bisa diubah.</p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E]">{list.length} akun</span>
        </div>

        <div className="space-y-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau username…" aria-label="Cari akun" className={FIELD_CLASS} />
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter peran">
            {(["all", "user", "schoolchild", "supervisor", "admin"] as RoleFilter[]).map((r) => (
              <button key={r} type="button" aria-pressed={roleF === r} onClick={() => setRoleF(r)} className={chip(roleF === r)}>
                {r === "all" ? "Semua peran" : ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter status">
            {([["active", "Aktif"], ["inactive", "Nonaktif"], ["all", "Semua status"]] as [StatusFilter, string][]).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={statusF === k} onClick={() => setStatusF(k)} className={chip(statusF === k)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <p className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-bold text-[#7A6E65] text-center">Tidak ada akun yang cocok dengan pencarian atau filter ini.</p>
        ) : (
          <ul className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {list.map((p) => {
                const inactive = p.isActive === false;
                const isMe = p.id === me;
                const lastAdmin = p.role === "admin" && !inactive && activeAdmins <= 1;
                return (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} className={cn("rounded-2xl border-2 p-3 space-y-2", inactive ? "bg-[#FBF7F2] border-[#E6DFD2] opacity-80" : "bg-white border-[#E6DFD2]")}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Initials name={p.display_name} role={p.role} />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-extrabold text-[#3D352E] truncate">{p.display_name}</p>
                        <p className="text-[11px] font-bold text-[#7A6E65] truncate">@{p.username}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-extrabold", ROLE_TONE[p.role] ?? ROLE_TONE.user)}>{ROLE_LABEL[p.role] ?? p.role}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-extrabold", inactive ? "bg-[#FFF0F0] text-[#C83E2B]" : "bg-[#EFFBE6] text-[#2E6F00]")}>{inactive ? "Nonaktif" : "Aktif"}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TactileButton type="button" variant="white" size="sm" disabled={busy} onClick={() => openEdit(p)}>
                        <GlyphInline name="pencil" /> Ubah
                      </TactileButton>
                      <TactileButton type="button" variant="white" size="sm" disabled={busy || inactive} onClick={() => { soundEffects.tactileClick(); setPinFor(p); setPin(""); }}>
                        <GlyphInline name="lock" /> PIN
                      </TactileButton>
                      {isMe ? (
                        <span className="text-[11px] font-bold text-[#7A6E65]">Akun yang sedang Anda pakai</span>
                      ) : lastAdmin ? (
                        <span className="text-[11px] font-bold text-[#7A6E65]">Admin aktif terakhir</span>
                      ) : (
                        <>
                          <TactileButton type="button" variant={inactive ? "matcha" : "peach"} size="sm" disabled={busy} onClick={() => toggleActive(p)}>
                            {inactive ? "Aktifkan" : "Nonaktifkan"}
                          </TactileButton>
                          {inactive && (
                            <TactileButton type="button" variant="berry" size="sm" disabled={busy} onClick={() => remove(p)}>
                              <GlyphInline name="trash" /> Hapus
                            </TactileButton>
                          )}
                        </>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        <div className="border-t-2 border-[#E6DFD2] pt-3 space-y-2">
          <button type="button" aria-expanded={auditOpen} onClick={() => setAuditOpen((v) => !v)} className="text-xs font-display font-extrabold text-[#1565C0] cursor-pointer">
            {auditOpen ? "Sembunyikan jejak tindakan Admin" : "Lihat jejak tindakan Admin"}
          </button>
          {auditOpen && (
            <div className="space-y-1.5">
              {auditErr && <p role="alert" className="text-xs font-bold text-[#C83E2B]">{auditErr}</p>}
              {audit === null && !auditErr && <p className="text-xs font-bold text-[#7A6E65]">Memuat…</p>}
              {audit?.length === 0 && <p className="text-xs font-bold text-[#7A6E65]">Belum ada tindakan tercatat.</p>}
              {audit?.map((a, i) => {
                const d = a.detail as Record<string, string | number | undefined>;
                const who = String(d.username ?? d.to_username ?? "");
                return (
                  <p key={i} className="rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] px-2.5 py-1.5 text-[11px] font-bold text-[#3D352E] leading-snug">
                    <span className="font-display font-extrabold">{AUDIT_LABEL[a.action] ?? a.action}</span>
                    {who ? ` @${who}` : ""} • oleh @{a.actor_username ?? "?"} • {new Date(a.at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </CozyCard>

      <CozySheet
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? `Ubah ${editing.display_name}` : "Ubah akun"}
        description="Nama dan username bisa diganti. Peran akun tetap."
        footer={
          <TactileButton type="button" variant="matcha" size="lg" fullWidth onClick={submitEdit}>
            Lanjut ke Konfirmasi
          </TactileButton>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Nama tampilan</span>
            <input value={eName} maxLength={40} onChange={(e) => { setEName(e.target.value); setEErr(null); }} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">Username login</span>
            <input value={eUser} maxLength={24} autoCapitalize="none" onChange={(e) => { setEUser(e.target.value.toLowerCase().replace(/\s+/g, "_")); setEErr(null); }} className={FIELD_CLASS} />
          </label>
          {editing && <p className="text-xs font-bold text-[#7A6E65]">Peran: {ROLE_LABEL[editing.role] ?? editing.role} (tidak bisa diubah)</p>}
          {eErr && <p role="alert" className="text-xs font-bold text-[#C83E2B]">{eErr}</p>}
        </div>
      </CozySheet>

      <CozySheet
        open={Boolean(pinFor)}
        onOpenChange={(o) => !o && (setPinFor(null), setPin(""))}
        title={pinFor ? `Ganti PIN ${pinFor.display_name}` : "Ganti PIN"}
        description="PIN disimpan terenkripsi sehingga PIN lama tidak bisa dilihat."
        footer={
          <TactileButton type="button" variant="sky" size="lg" fullWidth disabled={pin.length !== 4} onClick={submitPin}>
            Lanjut ke Konfirmasi
          </TactileButton>
        }
      >
        <label className="block">
          <span className="block mb-1 text-xs font-display font-extrabold text-[#7A6E65]">PIN baru (4 angka)</span>
          <input value={pin} inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className={FIELD_CLASS} />
        </label>
      </CozySheet>
    </MotionConfig>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { ShieldCheck, User, X, UserPlus } from "@/components/illustrations/UiGlyphs";
import {
  buildRealProfile,
  useBukuDompetStore,
  type ProfileData,
} from "@/store/useBukuDompetStore";
import {
  consumeSessionEndedFlag,
  dropServerSession,
  lookupAccounts,
  serverLogin,
  startSession,
  type Candidate,
  type LoginOutcome,
  type SessionUser,
} from "@/lib/sync/client";
import {
  CustomizablePetAvatar,
} from "@/components/illustrations/PetAvatarSystem";
import { PersonaAvatar, personaVariantFromId } from "@/components/illustrations/PersonaAvatars";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  FloatingRewardBanner,
} from "@/components/ui/CozyPrimitives";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { homePathForRole } from "@/components/ui/AppProviders";
import { SafeVault } from "@/components/login/SafeVault";
import { soundEffects } from "@/lib/sound-effects";
import { cozyBgm } from "@/lib/cozy-bgm";
import { cn } from "@/lib/utils";

function getRoleBadge(role: ProfileData["role"]) {
  switch (role) {
    case "admin":
      return { label: "Admin", cls: "bg-[#E3F4FF] border-[#9AD2FF] text-[#1565C0]" };
    case "supervisor":
      return { label: "Supervisor", cls: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]" };
    case "schoolchild":
      return { label: "Anak SD", cls: "bg-[#FFF2F0] border-[#FFCDC6] text-[#8F2A1B]" };
    default:
      return { label: "User (Buku Kas)", cls: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]" };
  }
}

function shortLabel(display: string): string {
  return display.replace(/\s*\(.*?\)\s*/g, "").trim() || display;
}

/** Pesan ramah untuk tiap kegagalan masuk (PIN divalidasi server). */
function loginErrorMessage(out: Extract<LoginOutcome, { ok: false }>): string {
  switch (out.reason) {
    case "invalid":
      return out.attemptsLeft !== undefined && out.attemptsLeft <= 3
        ? `PIN salah. Sisa ${out.attemptsLeft} percobaan sebelum akun dikunci sementara.`
        : "PIN salah. Silakan periksa kembali.";
    case "locked": {
      const mnt = Math.max(1, Math.ceil((out.retryAfter ?? 600) / 60));
      return `Terlalu banyak PIN salah. Akun dikunci sementara, coba lagi dalam ±${mnt} menit.`;
    }
    case "rate":
      return "Terlalu sering mencoba. Tunggu sebentar lalu coba lagi.";
    case "offline":
      return "Tidak bisa tersambung ke server. Masuk butuh internet — periksa koneksi lalu coba lagi.";
    case "server_not_configured":
      return "Server belum dikonfigurasi. Hubungi Admin untuk memeriksa pengaturan penyimpanan.";
    default:
      return "Server sedang bermasalah. Coba lagi sebentar lagi.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const profiles = useBukuDompetStore((s) => s.profiles);
  const savedProfileIds = useBukuDompetStore((s) => s.savedProfileIds);
  const isLoggedIn = useBukuDompetStore((s) => s.isLoggedIn);
  const currentRole = useBukuDompetStore((s) => s.currentRole);
  const forgetSavedProfile = useBukuDompetStore((s) => s.forgetSavedProfile);
  const triggerActionLoading = useBukuDompetStore((s) => s.triggerActionLoading);

  const savedProfiles = useMemo(
    () =>
      savedProfileIds
        .map((id) => profiles.find((p) => p.id === id))
        .filter((p): p is ProfileData => Boolean(p)),
    [savedProfileIds, profiles]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUsernameForm, setShowUsernameForm] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Beberapa akun boleh memakai nama yang sama (mis. "Ekal" sebagai User, Anak SD, Supervisor, Admin).
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  // Akun hasil pencarian server yang belum punya profil lokal (mis. baru dibuat Admin di perangkat lain).
  const [known, setKnown] = useState<Record<string, Candidate>>({});
  const [lookingUp, setLookingUp] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState<boolean>(false);
  // Perangkat ini masih menyimpan perubahan akun lain yang belum tersimpan: minta persetujuan sebelum dibuang.
  const [pendingConfirm, setPendingConfirm] = useState<{ user: SessionUser; unsaved: number } | null>(null);
  const [confirming, setConfirming] = useState<boolean>(false);

  const [isOpening, setIsOpening] = useState<boolean>(false);
  const openingRef = useRef<boolean>(false);
  const targetPathRef = useRef<string>("/app");

  const selected: ProfileData | null = useMemo(() => {
    if (!selectedId) return null;
    const local = profiles.find((p) => p.id === selectedId);
    if (local) return local;
    const c = known[selectedId];
    return c
      ? buildRealProfile({ id: c.id, username: c.username, display_name: c.display_name, role: c.role })
      : null;
  }, [selectedId, profiles, known]);

  useEffect(() => {
    setSessionEnded(consumeSessionEndedFlag());
  }, []);

  // Sesi permanen: sudah masuk -> langsung ke rumah perannya (kecuali sedang animasi buka brankas).
  useEffect(() => {
    if (isLoggedIn && !openingRef.current) {
      router.replace(homePathForRole(currentRole));
    }
  }, [isLoggedIn, currentRole, router]);

  const handleSelectProfile = (id: string) => {
    soundEffects.tactileClick();
    setSelectedId(id);
    setErrorMsg(null);
    setPinError(null);
    setCandidates([]);
    setShowUsernameForm(false);
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim().toLowerCase();
    if (!clean || lookingUp) return;
    setLookingUp(true);
    setErrorMsg(null);
    // Pencarian akun dilakukan di server (daftar akun asli ada di database, bukan di perangkat).
    const r = await lookupAccounts(clean);
    setLookingUp(false);
    if (!r.ok) {
      soundEffects.detectiveBuzz();
      setErrorMsg(
        r.reason === "offline"
          ? "Tidak bisa tersambung ke server. Masuk butuh internet — periksa koneksi lalu coba lagi."
          : "Server sedang bermasalah. Coba lagi sebentar lagi."
      );
      return;
    }
    const found = r.candidates;
    if (found.length === 0) {
      soundEffects.detectiveBuzz();
      setCandidates([]);
      setErrorMsg("Nama tidak ditemukan. Periksa ejaannya atau minta Admin mendaftarkan akunmu.");
      return;
    }
    setKnown((prev) => ({ ...prev, ...Object.fromEntries(found.map((c) => [c.id, c])) }));
    setUsernameInput("");
    if (found.length === 1) {
      setCandidates([]);
      setPinError(null);
      setSelectedId(found[0].id);
      setShowUsernameForm(false);
      return;
    }
    // Nama kembar: minta pilih peran dulu, baru PIN.
    setCandidates(found);
  };

  const handlePinComplete = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!selected) return false;
      // Cegah efek "sudah masuk" menimpa animasi pintu terbuka.
      openingRef.current = true;
      setPinError(null);
      const out = await serverLogin({ id: selected.id, pin });
      if (!out.ok) {
        openingRef.current = false;
        setPinError(loginErrorMessage(out));
        return false;
      }
      const started = await startSession(out.user);
      if (!started.ok) {
        // Jangan biarkan cookie menggantung bila pengguna batal.
        openingRef.current = false;
        setSelectedId(null);
        setPendingConfirm({ user: out.user, unsaved: started.unsaved });
        return false;
      }
      cozyBgm.start(); // musik latar dimulai saat login berhasil
      targetPathRef.current = started.targetPath;
      setIsOpening(true);
      return true;
    },
    [selected]
  );

  const cancelPending = useCallback(() => {
    setPendingConfirm(null);
    void dropServerSession();
  }, []);

  const confirmDiscard = useCallback(async () => {
    if (!pendingConfirm) return;
    setConfirming(true);
    openingRef.current = true;
    triggerActionLoading(8000);
    const started = await startSession(pendingConfirm.user, { discardOther: true });
    setConfirming(false);
    setPendingConfirm(null);
    if (started.ok) {
      cozyBgm.start();
      router.push(started.targetPath);
    } else {
      openingRef.current = false;
    }
  }, [pendingConfirm, router, triggerActionLoading]);

  const handleOpened = useCallback(() => {
    router.push(targetPathRef.current);
  }, [router]);

  const showSafe = Boolean(selected) && !showUsernameForm;

  return (
    <div className="min-h-screen text-[#3D352E] py-8 px-4 sm:px-6 flex flex-col justify-center overflow-x-hidden">
      <PageTransitionLoader />
      <FloatingRewardBanner />

      <div className="max-w-4xl mx-auto w-full space-y-6">
        <CozyCard
          tone="white"
          className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Kiri: merek + pet */}
          <div className="lg:col-span-5 bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] rounded-3xl p-5 flex flex-col items-center text-center space-y-3 min-w-0">
            <BukuDompetLogo variant="full" size="md" />

            <div className="w-40 h-40 sm:w-44 sm:h-44 bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center p-2">
              <CustomizablePetAvatar
                species="chubby_cat"
                stage={3}
                mood="happy"
                customName="Mochi"
                equippedAccessories={{
                  head: "head_flower_crown",
                  face: "face_blush_stickers",
                  neck: "neck_bandana",
                  outfit: "outfit_knit_sweater",
                }}
                className="w-36 h-36 sm:w-40 sm:h-40"
              />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]">
                <CozyIcon name="coin_rupiah" size={16} />
                Versi 5.5 • Tersimpan di Server
              </span>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">
                Jurnal Kas & Petualangan Finansial
              </h2>
              <p className="text-xs font-bold text-[#3D352E]/85 leading-relaxed">
                Catat kas atau tulis cerita setiap hari, rawat pet kesayanganmu, dan tumbuh
                bersama keluarga!
              </p>
            </div>
          </div>

          {/* Kanan: kartu profil + brankas */}
          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#7A6E65]">
                <CozyIcon name="lock_cozy" size={16} />
                Brankas Masuk Akun
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#3D352E]">
                Siapa yang mau masuk?
              </h1>
              <p className="text-xs sm:text-sm font-bold text-[#7A6E65]">
                Pilih kartu profilmu, lalu panel brankas akan naik dari bawah. Ketuk 4 angka PIN untuk membukanya.
                Sekali masuk, kamu tidak perlu login lagi di perangkat ini.
              </p>
            </div>

            {sessionEnded && !pendingConfirm && (
              <div
                role="status"
                className="p-3 rounded-2xl bg-[#FFFBEB] border-2 border-[#FDE08D] text-xs font-bold text-[#4A3500]"
              >
                Sesimu berakhir (mis. PIN diganti Admin). Masuk lagi untuk melanjutkan — catatan di perangkat ini
                tetap aman dan akan disimpan ke server setelah kamu masuk.
              </div>
            )}

            {pendingConfirm && (
              <div
                role="alertdialog"
                aria-labelledby="pending-title"
                className="p-3.5 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] space-y-2.5"
              >
                <p id="pending-title" className="font-display text-sm font-extrabold text-[#8F2A1B]">
                  Ada data akun lain yang belum tersimpan
                </p>
                <p className="text-xs font-bold text-[#3D352E]/85 leading-relaxed">
                  Perangkat ini masih memegang {pendingConfirm.unsaved.toLocaleString("id-ID")} perubahan milik akun
                  sebelumnya yang belum sampai ke server. Bila kamu lanjut masuk sebagai{" "}
                  {shortLabel(pendingConfirm.user.display_name)}, perubahan itu akan dihapus dari perangkat ini.
                  Untuk menyelamatkannya, batalkan dulu lalu masuk lagi sebagai akun sebelumnya (atau Admin) saat online.
                </p>
                <div className="flex flex-wrap gap-2">
                  <TactileButton type="button" variant="sky" size="md" onClick={cancelPending} disabled={confirming}>
                    Batal
                  </TactileButton>
                  <TactileButton type="button" variant="peach" size="md" onClick={confirmDiscard} disabled={confirming}>
                    {confirming ? "Memproses…" : "Hapus & Masuk"}
                  </TactileButton>
                </div>
              </div>
            )}

            {/* Kartu Profil Tersimpan */}
            {savedProfiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Kartu Profil Tersimpan
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {savedProfiles.map((acc) => {
                    const badge = getRoleBadge(acc.role);
                    const isSel = selectedId === acc.id && !showUsernameForm;
                    return (
                      <li key={acc.id} className="relative min-w-0">
                        <button
                          type="button"
                          onClick={() => handleSelectProfile(acc.id)}
                          aria-pressed={isSel}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 pr-8 rounded-2xl border-2 border-b-[4px] text-left transition-all min-w-0 cursor-pointer",
                            "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]",
                            isSel
                              ? "bg-[#E3F4FF]/70 border-[#38B6FF] border-b-[#1E88E5]"
                              : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] hover:bg-white"
                          )}
                        >
                          <span className="w-14 h-14 shrink-0 rounded-2xl bg-white border-2 border-[#E6DFD2] flex items-center justify-center overflow-hidden">
                            {acc.role === "supervisor" || acc.role === "admin" ? (
                              <PersonaAvatar role={acc.role} variant={personaVariantFromId(acc.id)} size={52} />
                            ) : (
                              <CustomizablePetAvatar
                                species={acc.activeSpecies}
                                stage={acc.currentStage}
                                mood="happy"
                                customName={acc.petCustomName}
                                equippedAccessories={acc.equippedAccessories}
                                className="w-12 h-12"
                              />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-display text-sm font-extrabold text-[#3D352E] truncate">
                              {shortLabel(acc.display_name)}
                            </span>
                            <span
                              className={cn(
                                "inline-block mt-0.5 px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold",
                                badge.cls
                              )}
                            >
                              {badge.label}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus kartu ${shortLabel(acc.display_name)} dari perangkat ini`}
                          title="Hapus kartu dari perangkat ini"
                          onClick={() => {
                            soundEffects.tactileClick();
                            forgetSavedProfile(acc.id);
                            if (selectedId === acc.id) setSelectedId(null);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white border border-[#E6DFD2] text-[#7A6E65] hover:text-[#C83E2B] flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Pilih akun lain via username */}
            {(savedProfiles.length === 0 || showUsernameForm || !selected) && (
              <form
                onSubmit={handleUsernameSubmit}
                className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] space-y-2.5"
              >
                <label
                  htmlFor="login-username"
                  className="block text-xs font-display font-extrabold uppercase text-[#3D352E]"
                >
                  {savedProfiles.length === 0 ? "Username Akunmu" : "Masuk dengan akun lain"}
                </label>
                <div className="flex gap-2 min-w-0">
                  <div className="relative flex-1 min-w-0">
                    <User
                      className="w-4 h-4 text-[#7A6E65] absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      required
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Ketik namamu, contoh: Tiara"
                      className="w-full pl-10 pr-3 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-white focus:border-[#38B6FF] focus:outline-none font-display font-extrabold text-sm text-[#3D352E]"
                    />
                  </div>
                  <TactileButton type="submit" variant="sky" size="md" className="shrink-0" disabled={lookingUp}>
                    {lookingUp ? "Mencari…" : "Lanjut"}
                  </TactileButton>
                </div>
                {errorMsg && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-xl bg-[#FFF2F0] border-2 border-[#FFCDC6] text-xs font-extrabold text-[#8F2A1B] flex items-center gap-2"
                  >
                    <CozyIcon name="warning_siren" size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </form>
            )}

            {candidates.length > 0 && !selected && (
              <div className="space-y-2" role="group" aria-label="Pilih peran akun">
                <p className="text-xs font-display font-extrabold text-[#3D352E]">
                  Ada beberapa akun dengan nama itu. Masuk sebagai siapa?
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidates.map((acc) => {
                    const badge = getRoleBadge(acc.role);
                    return (
                      <li key={acc.id} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => handleSelectProfile(acc.id)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl border-2 border-b-[4px] border-[#E6DFD2] border-b-[#D4C9B4] bg-[#F7F3EB] hover:bg-white text-left min-w-0 cursor-pointer focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#38B6FF]"
                        >
                          <span className="min-w-0">
                            <span className="block font-display text-sm font-extrabold text-[#3D352E] truncate">
                              {shortLabel(acc.display_name)}
                            </span>
                            <span
                              className={cn(
                                "inline-block mt-0.5 px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold",
                                badge.cls
                              )}
                            >
                              {badge.label}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {savedProfiles.length > 0 && !showUsernameForm && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  setShowUsernameForm(true);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-display font-extrabold text-[#1565C0] hover:underline cursor-pointer"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                Masuk dengan akun lain
              </button>
            )}

            {/* Brankas: panel PIN yang naik dari bawah layar (lihat <Drawer.Root> di bawah) */}
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center gap-2.5 text-xs font-bold text-[#7A6E65]">
              <ShieldCheck className="w-4 h-4 text-[#3D352E] shrink-0" aria-hidden="true" />
              <span>
                <em>Pendaftaran akun baru hanya dapat dilakukan oleh Admin</em> melalui menu
                Manajemen Pengguna di Command Center Admin.
              </span>
            </div>
          </div>
        </CozyCard>
      </div>

      {/* Panel brankas PIN: naik dari bawah (Versi 5.1) */}
      <Drawer.Root
        open={showSafe}
        dismissible={!isOpening}
        onOpenChange={(o) => {
          if (!o && !openingRef.current) {
            setSelectedId(null);
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/55 z-50 backdrop-blur-[2px]" />
          <Drawer.Content
            className={cn(
              "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-50 flex flex-col focus:outline-none",
              "bg-[#FFFDF9] border-2 border-b-0 border-[#E6DFD2] rounded-t-[32px] max-h-[94dvh]"
            )}
          >
            <div className="mx-auto w-14 h-2 rounded-full bg-[#D4C9B4] my-2.5 shrink-0" />
            <Drawer.Title className="sr-only">
              {selected ? `Brankas PIN milik ${shortLabel(selected.display_name)}` : "Brankas PIN"}
            </Drawer.Title>
            <Drawer.Description className="sr-only">Ketuk 4 angka PIN untuk masuk ke akunmu.</Drawer.Description>
            <div className="overflow-y-auto overscroll-contain px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 space-y-3">
              {selected && (
                <div className="flex items-center justify-center gap-3">
                  <span className="w-14 h-14 rounded-2xl bg-white border-2 border-[#E6DFD2] flex items-center justify-center overflow-hidden">
                    {selected.role === "supervisor" || selected.role === "admin" ? (
                      <PersonaAvatar role={selected.role} variant={personaVariantFromId(selected.id)} size={52} />
                    ) : (
                      <CustomizablePetAvatar
                        species={selected.activeSpecies}
                        stage={selected.currentStage}
                        mood="happy"
                        customName={selected.petCustomName}
                        equippedAccessories={selected.equippedAccessories}
                        className="w-12 h-12"
                      />
                    )}
                  </span>
                </div>
              )}
              {selected && (
                <SafeVault
                  title={`Brankas milik ${shortLabel(selected.display_name)}`}
                  subtitle={`@${selected.username} • ${getRoleBadge(selected.role).label}`}
                  onComplete={handlePinComplete}
                  onBeforeOpen={() => triggerActionLoading(8000)}
                  onOpened={handleOpened}
                />
              )}
              {selected && pinError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-xl bg-[#FFF2F0] border-2 border-[#FFCDC6] text-xs font-extrabold text-[#8F2A1B] flex items-center gap-2"
                >
                  <CozyIcon name="warning_siren" size={16} />
                  <span>{pinError}</span>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

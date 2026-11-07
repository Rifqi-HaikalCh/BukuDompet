"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, KeyRound, User, Sparkles, ShieldCheck } from "lucide-react";
import {
  useBukuDompetStore,
  type ProfileData,
} from "@/store/useBukuDompetStore";
import {
  CustomizablePetAvatar,
  GROWTH_STAGE_META,
} from "@/components/illustrations/PetAvatarSystem";
import { BukuDompetLogo } from "@/components/illustrations/BukuDompetLogo";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  FloatingRewardBanner,
} from "@/components/ui/CozyPrimitives";
import { PageTransitionLoader } from "@/components/ui/PageTransitionLoader";
import { soundEffects } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { profiles, supervisorAssignments, loginWithCredentials } =
    useBukuDompetStore();

  const [username, setUsername] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoPanelOpen, setDemoPanelOpen] = useState<boolean>(true);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginWithCredentials(username, pinCode);
    if (res.success && res.targetPath) {
      soundEffects.comboFanfare();
      router.push(res.targetPath);
    } else {
      soundEffects.detectiveBuzz();
      setErrorMsg(
        res.message || "Username atau PIN/Password tidak sesuai."
      );
    }
  };

  const handleFillDemoAccount = (acc: ProfileData, autoSubmit = false) => {
    soundEffects.tactileClick();
    setUsername(acc.username);
    setPinCode(acc.pin_code);
    setErrorMsg(null);

    if (autoSubmit) {
      const res = loginWithCredentials(acc.username, acc.pin_code);
      if (res.success && res.targetPath) {
        soundEffects.comboFanfare();
        router.push(res.targetPath);
      }
    }
  };

  const getRoleBadge = (role: ProfileData["role"]) => {
    if (role === "admin") {
      return {
        label: "Admin",
        cls: "bg-[#E3F4FF] border-[#9AD2FF] text-[#1565C0]",
      };
    }
    if (role === "supervisor") {
      return {
        label: "Supervisor",
        cls: "bg-[#FFFBEB] border-[#FDE08D] text-[#4A3500]",
      };
    }
    return {
      label: "User (Buku Kas)",
      cls: "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]",
    };
  };

  return (
    <div className="min-h-screen text-[#3D352E] py-8 px-4 sm:px-6 flex flex-col justify-center overflow-x-hidden">
      <PageTransitionLoader />
      <FloatingRewardBanner />

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Main 2-Column Login Card */}
        <CozyCard
          tone="white"
          className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        >
          {/* Left Column: Brand & Pet Showcase (5 Cols on Desktop) */}
          <div className="lg:col-span-5 bg-[#EFFBE6] border-2 border-[#C3EFA4] border-b-[4px] border-b-[#9EE070] rounded-3xl p-5 flex flex-col items-center text-center space-y-3 min-w-0">
            <BukuDompetLogo variant="full" size="md" />

            <div className="w-44 h-44 bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] flex items-center justify-center p-2">
              <CustomizablePetAvatar
                species="chubby_cat"
                stage={3}
                mood="happy"
                customName="Mochi"
                equippedAccessories={{
                  head: "head_sprout_leaf",
                  face: "face_blush_hearts",
                  neck: "neck_pastel_bib",
                }}
                className="w-40 h-40"
              />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]">
                <CozyIcon name="coin_rupiah" size={16} />
                Versi 4.0 • 8 Fase Pertumbuhan Hidup
              </span>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E]">
                Jurnal Kas & Petualangan Finansial
              </h2>
              <p className="text-xs font-bold text-[#3D352E]/85 leading-relaxed">
                Catat kas harian dengan disiplin, rawat pet kesayanganmu melewati
                8 Fase Pertumbuhan Hidup, dan pantau transparan bersama keluarga!
              </p>
            </div>
          </div>

          {/* Right Column: Credential Login Form (7 Cols on Desktop) */}
          <div className="lg:col-span-7 space-y-5 min-w-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#7A6E65]">
                <CozyIcon name="lock_cozy" size={16} />
                Pintu Masuk Kredensial Akun
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#3D352E]">
                Masuk ke Akun BukuDompet
              </h1>
              <p className="text-xs sm:text-sm font-bold text-[#7A6E65]">
                Masukkan Username dan PIN / Password akun Anda untuk melanjutkan.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1.5">
                  Username Akun
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A6E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Contoh: adik, bima, orangtua, wali, atau abang"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] focus:bg-white focus:border-[#38B6FF] focus:outline-none font-display font-extrabold text-sm text-[#3D352E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-display font-extrabold uppercase text-[#3D352E] mb-1.5">
                  PIN / Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7A6E65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={pinCode}
                    onChange={(e) => {
                      setPinCode(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Masukkan PIN / Password (misal: 1111)"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#E6DFD2] bg-[#FFFDF9] focus:bg-white focus:border-[#38B6FF] focus:outline-none font-display font-extrabold tracking-widest text-sm text-[#3D352E]"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] text-xs font-extrabold text-[#C83E2B] flex items-center gap-2">
                  <CozyIcon name="warning_siren" size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <TactileButton
                type="submit"
                variant="matcha"
                size="lg"
                fullWidth
              >
                <CozyIcon name="lock_cozy" size={20} />
                Masuk ke BukuDompet Sekarang
              </TactileButton>
            </form>

            {/* Strict Notice: No Public Registration */}
            <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#E6DFD2] flex items-center gap-2.5 text-xs font-bold text-[#7A6E65]">
              <ShieldCheck className="w-4 h-4 text-[#3D352E] shrink-0" />
              <span>
                <em>Pendaftaran akun baru hanya dapat dilakukan oleh Admin</em>{" "}
                melalui menu Manajemen Pengguna di Command Center Admin.
              </span>
            </div>
          </div>
        </CozyCard>

        {/* Collapsible Demo Quick-Fill Panel */}
        <CozyCard tone="white" className="p-4 sm:p-5 space-y-3.5">
          <button
            type="button"
            onClick={() => {
              soundEffects.tactileClick();
              setDemoPanelOpen((prev) => !prev);
            }}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-[#E5A400] shrink-0" />
              <span className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate">
                Mode Cepat Demo (Klik untuk isi otomatis akun Admin / Supervisor / User)
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1 shrink-0">
              {profiles.length} Akun Aktif
              {demoPanelOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>

          {demoPanelOpen && (
            <div className="pt-2 border-t border-[#E6DFD2] space-y-3">
              <p className="text-xs font-bold text-[#7A6E65]">
                Klik kartu akun di bawah untuk mengisi <strong>Username & PIN</strong>{" "}
                secara otomatis, atau tekan tombol <strong>Masuk Instan</strong>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {profiles.map((acc) => {
                  const badge = getRoleBadge(acc.role);
                  const assignedUsers =
                    acc.role === "supervisor"
                      ? supervisorAssignments
                          .filter((a) => a.supervisorId === acc.id)
                          .map(
                            (a) =>
                              profiles.find((u) => u.id === a.userId)
                                ?.display_name || ""
                          )
                          .filter(Boolean)
                      : [];

                  const isSelected = username === acc.username;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleFillDemoAccount(acc, false)}
                      className={cn(
                        "p-3.5 rounded-2xl border-2 border-b-[4px] transition-all cursor-pointer flex flex-col justify-between gap-2.5 min-w-0",
                        isSelected
                          ? "bg-[#E3F4FF]/60 border-[#38B6FF] border-b-[#1E88E5]"
                          : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] hover:bg-white"
                      )}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold",
                              badge.cls
                            )}
                          >
                            {badge.label}
                          </span>
                          <span className="font-display text-xs font-extrabold tabular-nums text-[#7A6E65]">
                            PIN: {acc.pin_code}
                          </span>
                        </div>

                        <p className="font-display text-sm font-extrabold text-[#3D352E] truncate">
                          {acc.display_name}
                        </p>
                        <p className="text-[11px] font-bold text-[#7A6E65] truncate">
                          Username:{" "}
                          <span className="text-[#3D352E] font-extrabold">
                            @{acc.username}
                          </span>
                        </p>

                        {acc.role === "user" && (
                          <p className="text-[10px] font-bold text-[#2E6F00] break-words">
                            Pet: {acc.petCustomName} • Fase {acc.currentStage} (
                            {GROWTH_STAGE_META[acc.currentStage]?.name})
                          </p>
                        )}

                        {acc.role === "supervisor" && (
                          <p className="text-[10px] font-bold text-[#4A3500] truncate">
                            Pantau:{" "}
                            {assignedUsers.length > 0
                              ? assignedUsers.join(", ")
                              : "Belum ditugaskan"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFillDemoAccount(acc, false);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#3D352E] hover:bg-[#FFFBEB] cursor-pointer"
                        >
                          Isi Form
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFillDemoAccount(acc, true);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-[#58CC02] border-b-[3px] border-b-[#46A302] text-[11px] font-display font-extrabold text-white hover:bg-[#61DC06] cursor-pointer"
                        >
                          Masuk Instan &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CozyCard>
      </div>
    </div>
  );
}

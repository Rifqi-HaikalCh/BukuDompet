"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "vaul";
import {
  KeyRound,
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Delete,
  ArrowRight,
  X,
} from "lucide-react";
import {
  useBukuDompetStore,
  type UserRole,
} from "@/store/useBukuDompetStore";
import {
  MochiCompanion,
  type MochiStage,
} from "@/components/illustrations/MochiCompanion";
import {
  TactileButton,
  CozyCard,
  FloatingRewardBanner,
} from "@/components/ui/CozyPrimitives";
import { soundEffects } from "@/lib/sound-effects";

const ROLE_CARDS: {
  role: UserRole;
  title: string;
  subtitle: string;
  badge: string;
  defaultPin: string;
  targetPath: string;
  tone: "matcha" | "honey" | "sky";
  mochiStage: MochiStage;
  icon: React.ElementType;
}[] = [
  {
    role: "user",
    title: "Adik (Pemilik Buku Kas)",
    subtitle:
      "Catat pengeluaran harian, pelihara Mochi, selesaikan Misi Rinci, dan tukar Poin jadi uang saku!",
    badge: "Role: User • PIN Demo: 1111",
    defaultPin: "1111",
    targetPath: "/app",
    tone: "matcha",
    mochiStage: 3,
    icon: Sparkles,
  },
  {
    role: "supervisor",
    title: "Orang Tua (Supervisor)",
    subtitle:
      "Pantau cerita keuangan harian, lihat rincian belanja transparan, dan kirim Stiker Semangat (+50 Poin)!",
    badge: "Role: Supervisor • PIN Demo: 2222",
    defaultPin: "2222",
    targetPath: "/supervisor",
    tone: "honey",
    mochiStage: 4,
    icon: HeartHandshake,
  },
  {
    role: "admin",
    title: "Abang (Admin & Sponsor Poin)",
    subtitle:
      "Dashboard kontrol penuh, mode simulasi pencatatan, setujui pencairan Poin (1 Poin = Rp1), & atur budget.",
    badge: "Role: Admin • PIN Demo: 9999",
    defaultPin: "9999",
    targetPath: "/admin",
    tone: "sky",
    mochiStage: 5,
    icon: ShieldCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPin, switchRoleDirect } = useBukuDompetStore();

  const [selectedRoleCard, setSelectedRoleCard] = useState<
    (typeof ROLE_CARDS)[number] | null
  >(null);
  const [pinDigits, setPinDigits] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenRole = (card: (typeof ROLE_CARDS)[number]) => {
    soundEffects.tactileClick();
    setSelectedRoleCard(card);
    setPinDigits("");
    setErrorMsg(null);
  };

  const handleDigitPress = (digit: string) => {
    soundEffects.tactileClick();
    setErrorMsg(null);
    if (pinDigits.length >= 4) return;
    const nextPin = pinDigits + digit;
    setPinDigits(nextPin);

    if (nextPin.length === 4 && selectedRoleCard) {
      const res = loginWithPin(selectedRoleCard.role, nextPin);
      if (res.success) {
        soundEffects.comboFanfare();
        router.push(selectedRoleCard.targetPath);
      } else {
        soundEffects.detectiveBuzz();
        setErrorMsg(res.message || "PIN tidak cocok.");
        setTimeout(() => setPinDigits(""), 450);
      }
    }
  };

  const handleQuickDemoLogin = (card: (typeof ROLE_CARDS)[number]) => {
    soundEffects.comboFanfare();
    switchRoleDirect(card.role);
    router.push(card.targetPath);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#3D352E] py-8 px-4 sm:px-6 flex flex-col justify-between">
      <FloatingRewardBanner />

      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Cozy Illustrated Header */}
        <CozyCard
          tone="vanilla"
          className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-3 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF7D6] border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] text-xs font-extrabold">
              <span>🏠 Pintu Keluarga BukuDompet</span>
              <span>•</span>
              <span className="font-mono-num">1 Poin = Rp 1</span>
            </div>
            <h1 className="font-fredoka text-3xl sm:text-4xl font-bold text-[#3D352E] leading-tight">
              Selamat Datang di Jurnal Kas Petualangan Mochi! 🐾
            </h1>
            <p className="text-sm sm:text-base font-bold text-[#7A6E65]">
              Pilih kartu profilmu di bawah untuk masuk menggunakan PIN 4 angka.
              Dirancang hangat untuk Adik, Orang Tua, dan Abang!
            </p>
          </div>
          <div className="w-36 h-36 sm:w-44 sm:h-44 bg-white rounded-3xl border-2 border-[#3D352E] shadow-[0_4px_0_0_#3D352E] flex items-center justify-center shrink-0">
            <MochiCompanion stage={3} mood="happy" className="w-36 h-36" />
          </div>
        </CozyCard>

        {/* 3 Tactile Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <CozyCard
                key={card.role}
                tone="white"
                className="flex flex-col justify-between gap-4 hover:-translate-y-1 transition-transform"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-xl border-2 border-[#3D352E] text-xs font-mono-num font-extrabold ${
                        card.tone === "matcha"
                          ? "bg-[#E5F9D7]"
                          : card.tone === "honey"
                          ? "bg-[#FFF7D6]"
                          : "bg-[#E0F4FF]"
                      }`}
                    >
                      {card.badge}
                    </span>
                    <Icon className="w-5 h-5 text-[#3D352E]" />
                  </div>

                  <div className="bg-[#F7F2E7] rounded-2xl border-2 border-[#3D352E] py-2 flex justify-center">
                    <MochiCompanion
                      stage={card.mochiStage}
                      mood="happy"
                      className="w-28 h-28"
                    />
                  </div>

                  <div>
                    <h2 className="font-fredoka text-xl font-bold text-[#3D352E]">
                      {card.title}
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-[#7A6E65] mt-1">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <TactileButton
                    variant={card.tone}
                    size="md"
                    fullWidth
                    onClick={() => handleOpenRole(card)}
                  >
                    <KeyRound className="w-4 h-4" /> Buka Pintu PIN
                  </TactileButton>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin(card)}
                    className="w-full py-1.5 text-xs font-extrabold text-[#7A6E65] hover:text-[#3D352E] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Masuk Instan (PIN {card.defaultPin})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CozyCard>
            );
          })}
        </div>
      </div>

      {/* Vaul Drawer with 4-Digit Tactile PIN Pad */}
      <Drawer.Root
        open={Boolean(selectedRoleCard)}
        onOpenChange={(open) => !open && setSelectedRoleCard(null)}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-[#3D352E]/50 z-50 backdrop-blur-[2px]" />
          <Drawer.Content className="bg-[#FFFDF7] border-t-4 border-[#3D352E] rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] flex flex-col focus:outline-none">
            <div className="mx-auto w-14 h-2 rounded-full bg-[#3D352E]/25 my-3 shrink-0" />

            {selectedRoleCard && (
              <div className="px-6 pb-8 max-w-sm mx-auto w-full space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Drawer.Title className="font-fredoka text-xl font-bold text-[#3D352E]">
                      PIN {selectedRoleCard.title.split(" ")[0]} 🔐
                    </Drawer.Title>
                    <Drawer.Description className="text-xs font-bold text-[#7A6E65]">
                      Masukkan 4 angka PIN (Demo: {selectedRoleCard.defaultPin})
                    </Drawer.Description>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRoleCard(null)}
                    className="p-2 rounded-2xl border-2 border-[#3D352E] bg-[#F7F2E7] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 4 PIN Boxes */}
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((idx) => {
                    const filled = idx < pinDigits.length;
                    return (
                      <div
                        key={idx}
                        className={`h-14 rounded-2xl border-2 border-[#3D352E] shadow-[0_3px_0_0_#3D352E] flex items-center justify-center font-mono-num text-2xl font-extrabold transition-all ${
                          filled ? "bg-[#FFC800]" : "bg-white"
                        }`}
                      >
                        {filled ? "●" : ""}
                      </div>
                    );
                  })}
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-2xl bg-[#FFDEDE] border-2 border-[#3D352E] text-center text-xs font-extrabold text-[#EA2B2B]">
                    {errorMsg}
                  </div>
                )}

                {/* Tactile 3D Keypad */}
                <div className="grid grid-cols-3 gap-2.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <TactileButton
                      key={d}
                      variant="white"
                      size="lg"
                      onClick={() => handleDigitPress(d)}
                      className="font-mono-num text-xl"
                    >
                      {d}
                    </TactileButton>
                  ))}
                  <TactileButton
                    variant="honey"
                    size="md"
                    onClick={() => {
                      soundEffects.comboFanfare();
                      const res = loginWithPin(
                        selectedRoleCard.role,
                        selectedRoleCard.defaultPin
                      );
                      if (res.success) {
                        router.push(selectedRoleCard.targetPath);
                      }
                    }}
                    className="text-xs font-extrabold"
                  >
                    Isi {selectedRoleCard.defaultPin}
                  </TactileButton>
                  <TactileButton
                    variant="white"
                    size="lg"
                    onClick={() => handleDigitPress("0")}
                    className="font-mono-num text-xl"
                  >
                    0
                  </TactileButton>
                  <TactileButton
                    variant="peach"
                    size="lg"
                    onClick={() => setPinDigits((p) => p.slice(0, -1))}
                  >
                    <Delete className="w-5 h-5" />
                  </TactileButton>
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

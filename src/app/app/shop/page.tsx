"use client";

import React, { useState } from "react";
import { Lock, Check, Sparkles } from "lucide-react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import {
  CustomizablePetAvatar,
  AccessoryPreviewIcon,
  ACCESSORY_CATALOG,
  ACCESSORY_SLOTS,
  SLOT_LABEL,
  CASTE_META,
  PET_SPECIES_LIST,
  PET_SPECIES_META,
  type AccessoryItem,
  type AccessorySlot,
  type PetSpecies,
} from "@/components/illustrations/PetAvatarSystem";
import { PET_SPECIES_SHOP_PRICES } from "@/lib/spending-detective";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  RollingNumber,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type ShopMainTab = "accessories" | "species";

export default function BoutiqueShopPage() {
  const {
    currentRole,
    activeProfileId,
    monitoredUserId,
    profiles,
    buyAccessory,
    toggleEquipAccessory,
    buyPetSpecies,
    equipPetSpecies,
  } = useBukuDompetStore();

  const userProfile =
    (currentRole === "user"
      ? profiles.find((p) => p.id === activeProfileId && p.role === "user")
      : profiles.find((p) => p.id === monitoredUserId && p.role === "user")) ||
    profiles.find((p) => p.role === "user") ||
    profiles[0];

  const currentStage = userProfile.currentStage || 1;
  const petName = userProfile.petCustomName || "Mochi";

  const [mainTab, setMainTab] = useState<ShopMainTab>("accessories");
  const [selectedSlot, setSelectedSlot] = useState<"all" | AccessorySlot>(
    "all"
  );

  // Confirm Modal States
  const [confirmAccessory, setConfirmAccessory] =
    useState<AccessoryItem | null>(null);
  const [confirmSpecies, setConfirmSpecies] = useState<PetSpecies | null>(null);

  const filteredAccessories =
    selectedSlot === "all"
      ? ACCESSORY_CATALOG
      : ACCESSORY_CATALOG.filter((item) => item.slot === selectedSlot);

  const handleConfirmBuyAccessory = () => {
    if (!confirmAccessory) return;
    const res = buyAccessory(confirmAccessory.id);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("combo");
    } else {
      soundEffects.detectiveBuzz();
    }
    setConfirmAccessory(null);
  };

  const handleConfirmBuySpecies = () => {
    if (!confirmSpecies) return;
    const res = buyPetSpecies(confirmSpecies);
    if (res.success) {
      soundEffects.comboFanfare();
      fireCozyConfetti("jackpot");
    } else {
      soundEffects.detectiveBuzz();
    }
    setConfirmSpecies(null);
  };

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
      {/* Confirm Buy Accessory Modal */}
      <CozyConfirmModal
        open={Boolean(confirmAccessory)}
        onClose={() => setConfirmAccessory(null)}
        onConfirm={handleConfirmBuyAccessory}
        title={
          confirmAccessory
            ? `Beli "${confirmAccessory.name}"?`
            : "Beli Aksesoris?"
        }
        description={
          confirmAccessory
            ? `Kamu akan menukarkan ${confirmAccessory.pricePoints.toLocaleString(
                "id-ID"
              )} Poin untuk membeli properti ${
                SLOT_LABEL[confirmAccessory.slot]
              } ini. Setelah dibeli, aksesoris langsung dipasang pada ${petName}!`
            : ""
        }
        confirmLabel={
          confirmAccessory
            ? `Ya, Beli (${confirmAccessory.pricePoints.toLocaleString(
                "id-ID"
              )} Poin)`
            : "Ya, Beli"
        }
        confirmVariant="matcha"
        badgeText="Butik Kasta BukuDompet"
      />

      {/* Confirm Adopt Species Modal */}
      <CozyConfirmModal
        open={Boolean(confirmSpecies)}
        onClose={() => setConfirmSpecies(null)}
        onConfirm={handleConfirmBuySpecies}
        title={
          confirmSpecies
            ? `Adopsi ${PET_SPECIES_META[confirmSpecies].name}?`
            : "Adopsi Spesies Pet?"
        }
        description={
          confirmSpecies
            ? `Tukarkan ${(
                PET_SPECIES_SHOP_PRICES[confirmSpecies] || 0
              ).toLocaleString("id-ID")} Poin untuk membuka spesies ${
                PET_SPECIES_META[confirmSpecies].name
              }. Karaktermu akan langsung mengikuti Kasta Stage ${currentStage} dan seluruh aksesoris yang sedang dipakai!`
            : ""
        }
        confirmLabel={
          confirmSpecies
            ? `Adopsi Sekarang (${(
                PET_SPECIES_SHOP_PRICES[confirmSpecies] || 0
              ).toLocaleString("id-ID")} Poin)`
            : "Ya, Adopsi"
        }
        confirmVariant="honey"
        badgeText="Target Jangka Panjang"
      />

      {/* 1. Boutique Hero Showcase & Live Fitting Room (Single Soft Pastel Taro Hero Card) */}
      <CozyCard tone="taro" className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
          <div className="min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#A552DB] inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Butik Kasta & Adopsi Pet • Stage {currentStage}/8
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] mt-1 truncate">
              Butik Gaya {petName} ({CASTE_META[currentStage]?.name})
            </h1>
            <p className="text-xs font-bold text-[#7A6E65]">
              Buka kasta lebih tinggi dengan rajin mencatat kas untuk membeli
              kendaraan & properti sultan!
            </p>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-[#FFC800] border-b-[4px] border-b-[#E5A400] text-right shrink-0">
            <span className="text-[10px] font-display font-extrabold uppercase text-[#4A3500] block">
              Saldo Poinmu
            </span>
            <div className="font-display font-extrabold tabular-nums text-base sm:text-lg text-[#4A3500] flex items-center gap-1">
              <CozyIcon name="coin_rupiah" size={18} />
              <RollingNumber
                value={userProfile.points_balance}
                suffix=" Poin"
              />
            </div>
          </div>
        </div>

        {/* Live Fitting Preview */}
        <div className="bg-white rounded-3xl border-2 border-[#E6DFD2] border-b-[4px] border-b-[#D4C9B4] p-4 flex flex-col sm:flex-row items-center gap-4 min-w-0">
          <div className="w-40 h-40 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD2] flex items-center justify-center shrink-0">
            <CustomizablePetAvatar
              species={userProfile.activeSpecies || "cat"}
              stage={currentStage}
              mood="proud"
              customName={petName}
              equippedAccessories={userProfile.equippedAccessories}
              className="w-38 h-38"
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left min-w-0 w-full">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]">
                Kasta Saat Ini: Stage {currentStage} ({CASTE_META[currentStage]?.name})
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-xs font-display font-extrabold text-[#3D352E]">
                Koleksi: {userProfile.ownedAccessories.length} /{" "}
                {ACCESSORY_CATALOG.length} Item
              </span>
            </div>
            <p className="text-xs font-bold text-[#7A6E65]">
              Aksesoris di Butik dikunci berdasarkan <strong>Kasta Stage</strong>{" "}
              agar setiap kenaikan kasta terasa prestisius. Item bertanda{" "}
              <strong>Drop Jalur</strong> hanya bisa diklaim gratis dari batu
              pijakan Checkpoint di Beranda!
            </p>
          </div>
        </div>
      </CozyCard>

      {/* 2. Main Category Switcher (Sky Blue Active Tab) */}
      <div className="grid grid-cols-2 gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]">
        <button
          type="button"
          onClick={() => {
            soundEffects.tactileClick();
            setMainTab("accessories");
          }}
          className={cn(
            "py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer truncate",
            mainTab === "accessories"
              ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
              : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
          )}
        >
          1. Aksesoris & Properti Kasta (24 Item)
        </button>
        <button
          type="button"
          onClick={() => {
            soundEffects.tactileClick();
            setMainTab("species");
          }}
          className={cn(
            "py-2.5 px-3 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all cursor-pointer truncate",
            mainTab === "species"
              ? "bg-[#38B6FF] text-white border-b-[3px] border-b-[#1E88E5]"
              : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
          )}
        >
          2. Adopsi Spesies Pet Baru (4 Hewan)
        </button>
      </div>

      {/* TAB 1: 6-SLOT ACCESSORIES CATALOG */}
      {mainTab === "accessories" && (
        <CozyCard tone="white" className="space-y-4">
          {/* 6-Slot Sub-Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                soundEffects.tactileClick();
                setSelectedSlot("all");
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl font-display text-xs font-extrabold shrink-0 cursor-pointer transition-all border",
                selectedSlot === "all"
                  ? "bg-[#38B6FF] text-white border-[#1E88E5]"
                  : "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
              )}
            >
              Semua Slot (24)
            </button>
            {ACCESSORY_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  soundEffects.tactileClick();
                  setSelectedSlot(slot);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-display text-xs font-extrabold shrink-0 cursor-pointer transition-all border",
                  selectedSlot === slot
                    ? "bg-[#38B6FF] text-white border-[#1E88E5]"
                    : "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white"
                )}
              >
                {SLOT_LABEL[slot]}
              </button>
            ))}
          </div>

          {/* Accessories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAccessories.map((item) => {
              const isOwned = userProfile.ownedAccessories.includes(item.id);
              const isEquipped =
                userProfile.equippedAccessories[item.slot] === item.id;
              const isStageLocked = item.minStage > currentStage;
              const isPathDrop = item.source === "path_drop";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-3xl border-2 border-b-[4px] flex flex-col justify-between gap-3 transition-all min-w-0 overflow-hidden",
                    isEquipped
                      ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
                      : isOwned
                      ? "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                      : isStageLocked
                      ? "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4] opacity-85"
                      : "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                  )}
                >
                  <div className="space-y-2.5 min-w-0">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[10px] font-display font-extrabold uppercase text-[#7A6E65]">
                        {SLOT_LABEL[item.slot]}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-lg border text-[10px] font-display font-extrabold inline-flex items-center gap-1",
                          isStageLocked
                            ? "bg-[#FFF2F0] border-[#FFCDC6] text-[#C83E2B]"
                            : "bg-[#EFFBE6] border-[#C3EFA4] text-[#2E6F00]"
                        )}
                      >
                        {isStageLocked && <Lock className="w-3 h-3" />}
                        Min. Stage {item.minStage}
                      </span>
                    </div>

                    {/* Preview Icon & Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-20 h-20 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD2] flex items-center justify-center shrink-0">
                        <AccessoryPreviewIcon
                          accessoryId={item.id}
                          className="w-18 h-18"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-sm sm:text-base font-extrabold text-[#3D352E] truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs font-bold text-[#7A6E65] line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1">
                    {isOwned ? (
                      <TactileButton
                        variant={isEquipped ? "matcha" : "cream"}
                        size="sm"
                        fullWidth
                        onClick={() => toggleEquipAccessory(item.id)}
                      >
                        <Check className="w-4 h-4" />
                        {isEquipped
                          ? "Sedang Dipakai (Klik Lepas)"
                          : "Pasang Aksesoris (Equip)"}
                      </TactileButton>
                    ) : isStageLocked ? (
                      <div className="w-full py-2 px-3 rounded-2xl bg-[#FFF2F0] border border-[#FFCDC6] text-center font-display text-xs font-extrabold text-[#C83E2B] flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Butuh Kasta Stage {item.minStage} (
                          {CASTE_META[item.minStage].name})
                        </span>
                      </div>
                    ) : isPathDrop ? (
                      <div className="w-full py-2 px-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE08D] text-center font-display text-xs font-extrabold text-[#4A3500]">
                        🎁 Drop Eksklusif Peta Jalur Kas Harian
                      </div>
                    ) : (
                      <TactileButton
                        variant="honey"
                        size="sm"
                        fullWidth
                        onClick={() => setConfirmAccessory(item)}
                      >
                        <CozyIcon name="coin_rupiah" size={16} />
                        Beli ({item.pricePoints.toLocaleString("id-ID")} Poin)
                      </TactileButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CozyCard>
      )}

      {/* TAB 2: PET SPECIES ADOPTION */}
      {mainTab === "species" && (
        <CozyCard tone="white" className="space-y-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] truncate">
                Adopsi Spesies Pet Baru (Target Jangka Panjang)
              </h2>
              <p className="text-xs font-bold text-[#7A6E65]">
                Setiap spesies otomatis mewarisi nama panggilan{" "}
                <strong>{petName}</strong>, Kasta Stage {currentStage}, dan
                aksesoris yang sedang kamu pasang!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PET_SPECIES_LIST.map((sp) => {
              const meta = PET_SPECIES_META[sp];
              const price = PET_SPECIES_SHOP_PRICES[sp];
              const isUnlocked = userProfile.unlockedSpecies.includes(sp);
              const isActive = userProfile.activeSpecies === sp;

              return (
                <div
                  key={sp}
                  className={cn(
                    "p-4 rounded-3xl border-2 border-b-[4px] flex flex-col justify-between gap-3 transition-all min-w-0 overflow-hidden",
                    isActive
                      ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
                      : isUnlocked
                      ? "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                      : "bg-[#F7F3EB] border-[#E6DFD2] border-b-[#D4C9B4]"
                  )}
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-xl bg-white border border-[#E6DFD2] text-[11px] font-display font-extrabold text-[#3D352E]">
                        {price === 0
                          ? "Starter Gratis"
                          : `${price.toLocaleString("id-ID")} Poin`}
                      </span>
                      {isUnlocked ? (
                        <span className="text-xs font-display font-extrabold text-[#2E6F00] inline-flex items-center gap-1">
                          <CozyIcon name="check_badge" size={16} /> Dimiliki
                        </span>
                      ) : (
                        <span className="text-xs font-display font-extrabold text-[#4A3500] bg-[#FFFBEB] px-2 py-0.5 rounded-lg border border-[#FDE08D]">
                          Long-Term Goal
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white border border-[#E6DFD2] py-2 flex items-center justify-center">
                      <CustomizablePetAvatar
                        species={sp}
                        stage={currentStage}
                        mood="happy"
                        customName={petName}
                        equippedAccessories={userProfile.equippedAccessories}
                        className="w-36 h-36"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-display text-base sm:text-lg font-extrabold text-[#3D352E] truncate">
                        {meta.name}
                      </h3>
                      <p className="text-xs font-bold text-[#7A6E65] mt-0.5 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    {isActive ? (
                      <TactileButton variant="matcha" size="sm" fullWidth>
                        <CozyIcon name="check_badge" size={18} />
                        Spesies Aktif Saat Ini
                      </TactileButton>
                    ) : isUnlocked ? (
                      <TactileButton
                        variant="cream"
                        size="sm"
                        fullWidth
                        onClick={() => equipPetSpecies(sp)}
                      >
                        Pilih Spesies Ini
                      </TactileButton>
                    ) : (
                      <TactileButton
                        variant="honey"
                        size="sm"
                        fullWidth
                        onClick={() => setConfirmSpecies(sp)}
                      >
                        <CozyIcon name="coin_rupiah" size={18} />
                        Adopsi ({price.toLocaleString("id-ID")} Poin)
                      </TactileButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CozyCard>
      )}
    </div>
  );
}

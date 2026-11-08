"use client";

import { GlyphIcon, GlyphInline } from "@/components/illustrations/GlyphIcons";
import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Pencil, Check, X, MessageCircleHeart } from "@/components/illustrations/UiGlyphs";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { pickViewedChild } from "@/lib/active-child";
import {
  analyzeSpendingDetective,
  getLevelFromXp,
  GROWTH_STAGE_TARGETS,
} from "@/lib/spending-detective";
import {
  CustomizablePetAvatar,
  GROWTH_STAGE_META,
  GROWTH_STAGES,
  PET_SPECIES_CATALOG,
  ACCESSORY_CATALOG,
  ACCESSORY_BY_ID,
  ACCESSORY_SLOTS,
  SLOT_LABEL,
  ACCESSORY_GENDER_LABEL,
  type AccessoryItem,
  getSpeciesInfo,
  isHairAccessory,
  type AccessoryGender,
  type PetSpecies,
  type GrowthStage,
  type AccessorySlot,
} from "@/components/illustrations/PetAvatarSystem";
import { CozyIcon } from "@/components/illustrations/CozyIcons";
import {
  TactileButton,
  CozyCard,
  ChunkyProgressBar,
  formatRupiah,
} from "@/components/ui/CozyPrimitives";
import { CozyConfirmModal } from "@/components/ui/CozyConfirmModal";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { ShieldShop, ShieldTeaser } from "@/components/pets/ShieldShop";
import { freeShieldsFor, totalShieldsFor, type ShieldPackId } from "@/lib/streak-shields";
import { localDateStr } from "@/lib/dates";
import {
  EquippedSlotsPanel,
  ItemDetailModal,
  ItemTile,
  SLOT_GLYPH,
  type TileAction,
} from "@/components/pets/PetCatalogParts";
import { soundEffects, fireCozyConfetti } from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type PetBoutiqueTab = "wardrobe" | "shop" | "kandang";

/** Filter gender: "female"/"male" juga menampilkan item netral (unisex). */
type GenderFilter = "all" | AccessoryGender;
const GENDER_FILTERS: readonly GenderFilter[] = ["all", "female", "male", "unisex"];
const GENDER_FILTER_LABEL: Record<GenderFilter, string> = {
  all: "Semua Gaya",
  female: ACCESSORY_GENDER_LABEL.female,
  male: ACCESSORY_GENDER_LABEL.male,
  unisex: ACCESSORY_GENDER_LABEL.unisex,
};
function matchesGender(itemGender: AccessoryGender, f: GenderFilter): boolean {
  if (f === "all") return true;
  if (f === "unisex") return itemGender === "unisex";
  return itemGender === f || itemGender === "unisex";
}

/* ───────────────────────── Chip filter & tab aksesibel ───────────────────────── */

type ChipTone = "sky" | "taro" | "peach";

/** Teks gelap (INK) di atas warna terang agar kontras ≥ 4,5:1 (putih di atas sky/peach hanya ±2,3:1). */
const CHIP_ACTIVE: Record<ChipTone, string> = {
  sky: "bg-[#38B6FF] text-[#3D352E] border-[#1E88E5] border-b-[3px]",
  taro: "bg-[#CE82FF] text-[#3D352E] border-[#A552DB] border-b-[3px]",
  peach: "bg-[#FF8B7B] text-[#3D352E] border-[#E5614F] border-b-[3px]",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D352E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9]";

function FilterChip({
  active,
  onClick,
  tone = "sky",
  size = "md",
  dashed = false,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: ChipTone;
  size?: "md" | "sm";
  /** Garis putus-putus untuk fase yang masih terkunci. */
  dashed?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={() => {
        soundEffects.tactileClick();
        onClick();
      }}
      className={cn(
        "rounded-xl font-display font-extrabold border cursor-pointer transition-all inline-flex items-center justify-center gap-1 min-h-8",
        size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]",
        FOCUS_RING,
        active
          ? CHIP_ACTIVE[tone]
          : cn(
              "bg-[#F7F3EB] text-[#3D352E] border-[#E6DFD2] hover:bg-white",
              dashed && "bg-white text-[#7A6E65] border-dashed"
            )
      )}
    >
      {children}
    </button>
  );
}

function GenderChips({
  value,
  onChange,
}: {
  value: GenderFilter;
  onChange: (g: GenderFilter) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65] shrink-0">
        Gaya
      </span>
      <ChipScroller label="Filter gaya item" watch={value} className="flex-1">
        {GENDER_FILTERS.map((g) => (
          <FilterChip
            key={g}
            size="sm"
            tone="peach"
            active={value === g}
            onClick={() => onChange(g)}
          >
            {GENDER_FILTER_LABEL[g]}
          </FilterChip>
        ))}
      </ChipScroller>
    </div>
  );
}

const TAB_DEFS: readonly { id: PetBoutiqueTab; icon: "wardrobe_costume" | "boutique_shop" | "egg_nest" }[] = [
  { id: "wardrobe", icon: "wardrobe_costume" },
  { id: "shop", icon: "boutique_shop" },
  { id: "kandang", icon: "egg_nest" },
];

/** Jumlah item yang dijual di Butik / jatuh dari Peti Harta (dihitung dari katalog, bukan hard-code). */
/** Jumlah kartu yang dirender sekali waktu (sisanya lewat tombol "Tampilkan lebih banyak"). */
const SHOP_PAGE = 24;

const SHOP_ITEM_COUNT = ACCESSORY_CATALOG.filter((a) => a.source === "shop").length;
const PATH_DROP_COUNT = ACCESSORY_CATALOG.length - SHOP_ITEM_COUNT;

function PetsAndBoutiqueContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  const {
    activeProfileId,
    currentRole,
    monitoredUserId,
    profiles,
    transactions,
    equippedTitle,
    isProudComboActive,
    renamePet,
    equipPetSpecies,
    buyPetSpecies,
    buyAccessory,
    toggleEquipAccessory,
    buyStreakFreezeShield,
  } = useBukuDompetStore();

  const userProfile = pickViewedChild({ currentRole, activeProfileId, monitoredUserId, profiles });

  const userTransactions = useMemo(
    () => transactions.filter((t) => t.user_id === userProfile.id),
    [transactions, userProfile.id]
  );

  const activeSpecies: PetSpecies = userProfile.activeSpecies || "chubby_cat";
  const speciesInfo = getSpeciesInfo(activeSpecies);
  const currentStage: GrowthStage = userProfile.currentStage || 1;
  const stageMeta = GROWTH_STAGE_META[currentStage] || GROWTH_STAGE_META[1];
  const stageTarget = GROWTH_STAGE_TARGETS[currentStage];
  const petName = userProfile.petCustomName || speciesInfo.defaultName;
  const levelInfo = getLevelFromXp(userProfile.xp);

  const report = useMemo(
    () =>
      analyzeSpendingDetective({
        transactions: userTransactions,
        monthlyBudgetTarget: userProfile.monthly_budget_target,
        monthlySavingTarget: userProfile.monthly_saving_target,
        userLevel: levelInfo.level,
        currentStage,
        petCustomName: petName,
        isProudComboActive,
      }),
    [
      userTransactions,
      userProfile.monthly_budget_target,
      userProfile.monthly_saving_target,
      levelInfo.level,
      currentStage,
      petName,
      isProudComboActive,
    ]
  );

  // Main Sub-Tab State
  const [activeTab, setActiveTab] = useState<PetBoutiqueTab>(() => {
    if (initialTabParam === "shop") return "shop";
    if (initialTabParam === "kandang" || initialTabParam === "adopt")
      return "kandang";
    return "wardrobe";
  });

  useEffect(() => {
    if (initialTabParam === "shop") setActiveTab("shop");
    else if (initialTabParam === "kandang" || initialTabParam === "adopt")
      setActiveTab("kandang");
    else if (initialTabParam === "wardrobe") setActiveTab("wardrobe");
  }, [initialTabParam]);

  // Wardrobe & Shop Filters
  const [wardrobeSlotFilter, setWardrobeSlotFilter] = useState<
    "all" | AccessorySlot
  >("all");
  const [shopStageFilter, setShopStageFilter] = useState<
    "all" | GrowthStage
  >(currentStage);
  const [shopSlotFilter, setShopSlotFilter] = useState<"all" | "shield" | AccessorySlot>(
    "all"
  );
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  // Sync shop stage filter when active pet changes
  useEffect(() => {
    setShopStageFilter(currentStage);
  }, [currentStage, activeSpecies]);

  // Inline Rename State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(petName);

  // TUGAS 4: Interactive "Cek Kabar & Mood Finansial Pet" State (0 Free XP/Points)
  const [petHopKey, setPetHopKey] = useState<number>(0);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);

  // Preview Growth Stage on Left Stage (defaults to active pet's currentStage)
  const [previewStage, setPreviewStage] = useState<GrowthStage>(currentStage);
  useEffect(() => {
    setPreviewStage(currentStage);
  }, [currentStage, activeSpecies]);

  // Navigasi tab dengan papan ketik (←/→/Home/End) sesuai pola WAI-ARIA
  const tabRefs = useRef<Partial<Record<PetBoutiqueTab, HTMLButtonElement | null>>>({});
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = TAB_DEFS.findIndex((t) => t.id === activeTab);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % TAB_DEFS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + TAB_DEFS.length) % TAB_DEFS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TAB_DEFS.length - 1;
    else return;
    e.preventDefault();
    const target = TAB_DEFS[next].id;
    setActiveTab(target);
    tabRefs.current[target]?.focus();
  };

  // Umpan balik aksi (beli gagal, dll.) — dibacakan pembaca layar lewat role="status"
  const [notice, setNotice] = useState<string | null>(null);

  // Detail item (modal) + paginasi kartu
  const [detail, setDetail] = useState<{ id: string; mode: "wardrobe" | "shop" } | null>(null);
  const [shopVisible, setShopVisible] = useState<number>(SHOP_PAGE);
  const [wardrobeVisible, setWardrobeVisible] = useState<number>(SHOP_PAGE);
  useEffect(() => {
    setShopVisible(SHOP_PAGE);
  }, [shopStageFilter, shopSlotFilter, genderFilter]);
  useEffect(() => {
    setWardrobeVisible(SHOP_PAGE);
  }, [wardrobeSlotFilter, genderFilter]);

  // Confirmation Modal States
  const [confirmBuyItemId, setConfirmBuyItemId] = useState<string | null>(null);
  const [confirmAdoptSpecies, setConfirmAdoptSpecies] =
    useState<PetSpecies | null>(null);

  // Pelindung Streak (jatah gratis bulanan + perisai hasil beli)
  const todayStr = localDateStr(0);
  const shieldFreeLeft = freeShieldsFor(userProfile, todayStr);
  const shieldTotal = totalShieldsFor(userProfile, todayStr);

  const smartDialogues = useMemo(() => {
    const remXp = Math.max(
      0,
      stageTarget.nextStageXpTarget - userProfile.stageXp
    );
    const remDays = Math.max(
      0,
      stageTarget.nextStageDaysTarget - userProfile.stageRecordedDays
    );
    const nextStageName =
      currentStage < 8
        ? GROWTH_STAGE_META[(currentStage + 1) as GrowthStage].name
        : "Sepuh Bijaksana";

    const list: string[] = [
      report.mochiSpeech,
      `Kabar Dompet Hari Ini: Sisa jatah aman harianmu ${formatRupiah(
        report.remainingDailySafeSpend
      )} dari batas ${formatRupiah(report.dssl)} (Status: ${
        report.walletStatus
      }).`,
      currentStage < 8
        ? `Progres Pertumbuhan ${petName}: Saat ini di Fase ${currentStage}/8 (${stageMeta.name}). Butuh ${remXp} Stage XP & ${remDays} hari mencatat lagi untuk tumbuh ke Fase ${
            currentStage + 1
          } (${nextStageName})!`
        : `${petName} sudah mencapai Fase 8 (Sepuh Bijaksana)! Terima kasih sudah konsisten merawat dan mencatat kas setiap hari!`,
      `Konsistensi Api Streak: Kamu sudah mencatat kas ${userProfile.current_streak} hari berturut-turut dan punya ${shieldTotal} Perisai Es pelindung!`,
    ];

    if (report.microLeaks.length > 0) {
      list.push(report.microLeaks[0].message);
    }

    return list;
  }, [
    report.mochiSpeech,
    report.remainingDailySafeSpend,
    report.dssl,
    report.walletStatus,
    report.microLeaks,
    stageTarget,
    userProfile.stageXp,
    userProfile.stageRecordedDays,
    userProfile.current_streak,
    shieldTotal,
    currentStage,
    petName,
    stageMeta.name,
  ]);

  const handleCheckPetMood = () => {
    soundEffects.tactileClick();
    setPetHopKey((k) => k + 1);
    setDialogueIndex((prev) => (prev + 1) % smartDialogues.length);
  };

  const handleSaveName = () => {
    const res = renamePet(nameInput);
    if (res.success) {
      soundEffects.coinChime();
      setIsEditingName(false);
    } else {
      soundEffects.tactileClick();
    }
  };

  // Wardrobe Items (Owned by user)
  const ownedAccessoryItems = useMemo(() => {
    const ownedIds = userProfile.ownedAccessories || [];
    return ACCESSORY_CATALOG.filter((item) => {
      if (!ownedIds.includes(item.id)) return false;
      if (wardrobeSlotFilter !== "all" && item.slot !== wardrobeSlotFilter) {
        return false;
      }
      if (!matchesGender(item.gender, genderFilter)) return false;
      return true;
    });
  }, [userProfile.ownedAccessories, wardrobeSlotFilter, genderFilter]);

  // Boutique Shop Items (STRICTLY source === "shop" per Tugas 6)
  const shopAccessoryItems = useMemo(() => {
    return ACCESSORY_CATALOG.filter((item) => {
      if (item.source !== "shop") return false;
      if (
        shopStageFilter !== "all" &&
        item.stageRequirement !== shopStageFilter
      ) {
        return false;
      }
      if (shopSlotFilter !== "all" && item.slot !== shopSlotFilter) {
        return false;
      }
      if (!matchesGender(item.gender, genderFilter)) return false;
      return true;
    });
  }, [shopStageFilter, shopSlotFilter, genderFilter]);

  const handleBuyShield = (id: ShieldPackId) => {
    const res = buyStreakFreezeShield(id);
    if (res.success) {
      soundEffects.coinChime();
      setNotice(null);
    } else {
      soundEffects.tactileClick();
      setNotice(res.message);
    }
  };

  const pendingBuyItem = confirmBuyItemId
    ? ACCESSORY_BY_ID[confirmBuyItemId]
    : null;
  const pendingAdoptInfo = confirmAdoptSpecies
    ? getSpeciesInfo(confirmAdoptSpecies)
    : null;

  /* ───── Aksi kartu & modal detail (Versi 5.1) ───── */
  const equippedMap = userProfile.equippedAccessories;

  const wardrobeAction = (item: AccessoryItem, long = false): TileAction => {
    const eqId = equippedMap?.[item.slot];
    const isEq = eqId === item.id;
    const other = !!eqId && eqId !== item.id;
    return {
      variant: isEq ? "cream" : other ? "sky" : "matcha",
      label: isEq ? (long ? `Lepas dari ${SLOT_LABEL[item.slot]}` : "Lepas") : other ? (long ? `Tukar ${SLOT_LABEL[item.slot]}` : "Tukar") : long ? "Pasang ke Pet" : "Pasang",
      onClick: () => toggleEquipAccessory(item.id),
    };
  };

  const shopItemState = (item: AccessoryItem) => ({
    owned: userProfile.ownedAccessories.includes(item.id),
    locked: item.stageRequirement > currentStage,
    canAfford: userProfile.points_balance >= item.pricePoints,
  });

  const shopAction = (item: AccessoryItem, long = false): TileAction => {
    const st = shopItemState(item);
    if (st.owned) {
      return {
        variant: "cream",
        label: long ? "Sudah di Lemari (Buka Lemari)" : "Di Lemari",
        onClick: () => {
          setDetail(null);
          setActiveTab("wardrobe");
        },
      };
    }
    if (st.locked) {
      return {
        variant: "cream",
        disabled: true,
        label: (
          <>
            <GlyphIcon name="lock" size={14} /> {long ? `Buka Fase ${item.stageRequirement} Dulu` : `Fase ${item.stageRequirement}`}
          </>
        ),
      };
    }
    return {
      variant: st.canAfford ? "matcha" : "cream",
      label: st.canAfford
        ? long
          ? `Beli & Pasang (${item.pricePoints.toLocaleString("id-ID")} Poin)`
          : "Beli"
        : long
        ? `Poin Belum Cukup (${item.pricePoints.toLocaleString("id-ID")} Poin)`
        : "Kurang Poin",
      onClick: () => {
        if (st.canAfford) {
          setDetail(null);
          setConfirmBuyItemId(item.id);
        } else {
          const res = buyAccessory(item.id);
          setNotice(res.success ? null : res.message);
          setDetail(null);
        }
      },
    };
  };

  const detailItem = detail ? ACCESSORY_BY_ID[detail.id] ?? null : null;
  const detailEquippedId = detailItem ? equippedMap?.[detailItem.slot] : undefined;
  const detailOther = detailItem && detailEquippedId && detailEquippedId !== detailItem.id ? ACCESSORY_BY_ID[detailEquippedId] ?? null : null;
  const detailState = detailItem ? shopItemState(detailItem) : null;

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Confirm Buy Accessory Modal */}
      <CozyConfirmModal
        open={pendingBuyItem !== null}
        onClose={() => setConfirmBuyItemId(null)}
        onConfirm={() => {
          if (!pendingBuyItem) return;
          const res = buyAccessory(pendingBuyItem.id);
          if (res.success) {
            soundEffects.coinChime();
            fireCozyConfetti("combo");
          } else {
            soundEffects.tactileClick();
          }
          setConfirmBuyItemId(null);
        }}
        title={
          pendingBuyItem
            ? `Beli "${pendingBuyItem.name}"?`
            : "Beli Kostum Pet?"
        }
        description={
          pendingBuyItem
            ? `Tukarkan ${pendingBuyItem.pricePoints.toLocaleString(
                "id-ID"
              )} Poin untuk membeli ${pendingBuyItem.name} (Slot: ${
                SLOT_LABEL[pendingBuyItem.slot]
              }) dan langsung memasangnya ke ${petName}?`
            : ""
        }
        confirmLabel={
          pendingBuyItem
            ? `Ya, Beli (${pendingBuyItem.pricePoints.toLocaleString(
                "id-ID"
              )} Poin)`
            : "Ya, Beli"
        }
        confirmVariant="matcha"
        mochiStage={report.mochiStage}
        badgeText="Butik Kostum Pet"
      />

      {/* Confirm Adopt New Pet Egg Modal */}
      <CozyConfirmModal
        open={pendingAdoptInfo !== null}
        onClose={() => setConfirmAdoptSpecies(null)}
        onConfirm={() => {
          if (!pendingAdoptInfo) return;
          const res = buyPetSpecies(pendingAdoptInfo.id);
          if (res.success) {
            soundEffects.comboFanfare();
            fireCozyConfetti("jackpot");
          } else {
            soundEffects.tactileClick();
          }
          setConfirmAdoptSpecies(null);
        }}
        title={
          pendingAdoptInfo
            ? `Adopsi Telur ${pendingAdoptInfo.name}?`
            : "Adopsi Telur Pet?"
        }
        description={
          pendingAdoptInfo
            ? `Tukarkan ${pendingAdoptInfo.pricePoints.toLocaleString(
                "id-ID"
              )} Poin untuk mengadopsi ${
                pendingAdoptInfo.name
              }? Pet baru akan menetas mulai dari Fase 1 (Telur Ajaib — 0 Stage XP & 0 Hari Mencatat) agar kamu bisa merawat pertumbuhannya dari awal!`
            : ""
        }
        confirmLabel={
          pendingAdoptInfo
            ? `Adopsi Telur (${pendingAdoptInfo.pricePoints.toLocaleString(
                "id-ID"
              )} Poin)`
            : "Adopsi"
        }
        confirmVariant="matcha"
        mochiStage={1}
        badgeText="Adopsi Telur Kawaii Baru"
      />


      {/* Detail item: deskripsi, fase, harga, info penggantian */}
      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetail(null)}
        petName={petName}
        locked={detail?.mode === "shop" && !!detailState?.locked}
        equipped={!!detailItem && detailEquippedId === detailItem.id}
        owned={!!detailState?.owned}
        replacing={detail?.mode === "wardrobe" || detailState?.owned ? detailOther : null}
        showPrice={detail?.mode === "shop" && !detailState?.owned}
        balance={userProfile.points_balance}
        hatchFirst={previewStage === 1 && !!detailItem && isHairAccessory(detailItem.id)}
        action={
          detailItem
            ? detail?.mode === "shop" && !detailState?.owned
              ? shopAction(detailItem, true)
              : wardrobeAction(detailItem, true)
            : null
        }
      />

      {/* Top Page Header Banner */}
      <CozyCard tone="white" className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#A552DB]">
              <CozyIcon name="combo_sparkle" size={16} /> Dunia Pet & Butik Terpadu
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#3D352E] leading-snug break-words">
              Panggung Pet, Lemari 7 Slot & Butik 8 Fase Hidup
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#7A6E65] leading-relaxed break-words">
              Rawat pet dari Telur Ajaib hingga Sepuh Bijaksana, padu-padankan
              kostum di panggung kiri, dan belanja item sesuai fase pertumbuhan!
            </p>
          </div>

          {/* User Points Balance Card (Never Truncated per Tugas 1) */}
          <div className="bg-[#FFFBEB] border-2 border-[#FDE08D] border-b-[4px] border-b-[#F5C84C] rounded-2xl p-3.5 flex flex-col items-start gap-1 shrink-0">
            <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
              Saldo Poin Belanja & Tabungan
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <CozyIcon name="coin_rupiah" size={22} />
              <span className="font-display text-xl font-extrabold tabular-nums text-[#4A3500] break-words">
                {userProfile.points_balance.toLocaleString("id-ID")} Poin
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-white border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#2E6F00]">
              Setara {formatRupiah(userProfile.points_balance)}
            </span>
          </div>
        </div>
      </CozyCard>

      {/* TUGAS 6.2: SPLIT-VIEW LAYOUT (Left lg:col-span-5 Sticky Stage + Right lg:col-span-7 Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN (lg:col-span-5 — Sticky Live Pet Stage) ================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4 min-w-0">
          <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
            {/* Pet Name + Inline Edit + Species & Stage Badges */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#EEF8FF] border border-[#BCE3FF] text-xs font-display font-extrabold text-[#1565C0]">
                  Fase {currentStage}/8: {stageMeta.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F8F0FF] border border-[#E2C6FF] text-xs font-display font-extrabold text-[#A552DB] leading-snug break-words">
                  {equippedTitle}
                </span>
              </div>

              {isEditingName ? (
                <div className="inline-flex items-center gap-1.5 bg-[#F7F3EB] border-2 border-[#38B6FF] rounded-2xl px-3 py-1">
                  <input
                    type="text"
                    value={nameInput}
                    maxLength={18}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                    className="w-36 bg-transparent font-display text-base font-extrabold text-[#3D352E] text-center focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="p-1.5 rounded-xl bg-[#58CC02] text-white cursor-pointer"
                    title="Simpan Nama"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 rounded-xl bg-[#E6DFD2] text-[#3D352E] cursor-pointer"
                    title="Batal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h2 className="font-display text-2xl font-extrabold text-[#3D352E] leading-snug break-words">
                    {petName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setNameInput(petName);
                      setIsEditingName(true);
                    }}
                    className="p-1.5 rounded-xl bg-[#F7F3EB] hover:bg-[#FFFBEB] border border-[#E6DFD2] text-[#7A6E65] hover:text-[#3D352E] cursor-pointer transition-colors"
                    title="Ubah Nama Pet"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <p className="text-xs font-bold text-[#7A6E65] leading-snug break-words">
                Spesies: {speciesInfo.name} •{" "}
                {GROWTH_STAGE_META[previewStage].description}
              </p>
            </div>

            {/* Interactive Live Pet Avatar Canvas */}
            <div
              onClick={handleCheckPetMood}
              className="relative rounded-3xl bg-[#FFFDF9] border-2 border-[#E6DFD2] border-b-[5px] border-b-[#D4C9B4] p-4 flex flex-col items-center justify-center cursor-pointer group overflow-hidden"
              title="Ketuk untuk cek kabar & mood finansial Pet!"
            >
              {previewStage !== currentStage && (
                <div className="mb-2 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-display font-extrabold text-[#4A3500]">
                  {previewStage > currentStage ? (
                    <span className="inline-flex items-center gap-1">
                      <CozyIcon name="lock_cozy" size={16} /> Siluet Rahasia Fase {previewStage}:{" "}
                      {GROWTH_STAGE_META[previewStage].name}
                    </span>
                  ) : (
                    <>
                      Pratinjau Wujud Fase {previewStage}: {GROWTH_STAGE_META[previewStage].name}
                    </>
                  )}
                </div>
              )}

              <motion.div
                key={petHopKey}
                initial={{ y: -12, scale: 1.04 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 16 }}
                className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center"
              >
                <CustomizablePetAvatar
                  species={activeSpecies}
                  stage={previewStage}
                  mood={userProfile.isColdStreakMode ? "shivering_cold" : report.petMood}
                  customName={petName}
                  equippedAccessories={userProfile.equippedAccessories}
                  isMysteryLocked={previewStage > currentStage}
                  className="w-full h-full"
                />
              </motion.div>

              {previewStage === 1 && (
                <span className="mt-1 px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] text-[11px] font-bold text-[#4A3500] text-center leading-snug inline-flex items-start gap-1.5">
                  <CozyIcon name="egg_nest" size={18} className="shrink-0" />
                  <span>
                    Catatan: Saat masih Fase 1 (Telur Ajaib), hanya Topi,
                    Properti Alas, Aura, dan Latar yang terlihat. Rambut dan
                    hijab baru tampil setelah menetas (Fase 2+).
                  </span>
                </span>
              )}
            </div>

            {/* TUGAS 4: Meaningful Interaction — "Cek Kabar & Mood Finansial Pet" (Replaces Gimmick Elus/Lempar Koin) */}
            <div className="space-y-2.5">
              <div className="bg-[#F7F3EB] border-2 border-[#E6DFD2] rounded-2xl p-3.5 text-xs sm:text-sm font-bold text-[#3D352E] leading-relaxed break-words">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#2E6F00]">
                    Mood & Diagnosis Finansial {petName}:
                  </span>
                  <span className="text-[10px] font-bold text-[#7A6E65]">
                    Pesan {(dialogueIndex % smartDialogues.length) + 1}/
                    {smartDialogues.length}
                  </span>
                </div>
                <p>&ldquo;{smartDialogues[dialogueIndex % smartDialogues.length]}&rdquo;</p>
              </div>

              <TactileButton
                variant="sky"
                size="sm"
                fullWidth
                onClick={handleCheckPetMood}
              >
                <MessageCircleHeart className="w-4 h-4" />
                <span>Cek Kabar & Mood Finansial {petName}</span>
              </TactileButton>
            </div>

            {/* 8 Fase: baris geser + kartu info (Versi 5.1) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-extrabold text-[#3D352E]">
                  8 Fase Pertumbuhan Hidup
                </span>
                {previewStage !== currentStage && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.tactileClick();
                      setPreviewStage(currentStage);
                    }}
                    className="text-[11px] font-display font-extrabold text-[#1E88E5] underline cursor-pointer shrink-0"
                  >
                    Ke Fase Aktif ({currentStage})
                  </button>
                )}
              </div>
              <ChipScroller label="Fase pertumbuhan" watch={previewStage}>
                {GROWTH_STAGES.map((st) => {
                  const unlocked = st <= currentStage;
                  const isPreview = previewStage === st;
                  const meta = GROWTH_STAGE_META[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      aria-pressed={isPreview}
                      aria-label={
                        unlocked
                          ? `Pratinjau Fase ${st}: ${meta.name}`
                          : `Pratinjau Fase ${st}, terkunci`
                      }
                      onClick={() => {
                        soundEffects.tactileClick();
                        setPreviewStage(st);
                      }}
                      className={cn(
                        "w-[92px] p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5",
                        FOCUS_RING,
                        isPreview
                          ? "bg-[#EEF8FF] border-2 border-[#38B6FF] border-b-[3px] border-b-[#1E88E5] text-[#1565C0]"
                          : unlocked
                          ? "bg-[#F7F3EB] border-[#E6DFD2] text-[#3D352E] hover:bg-white"
                          : "bg-[#F5EFE6] border-[#E6DFD2] text-[#6B5F56]"
                      )}
                    >
                      <span className="font-display text-xs font-extrabold inline-flex items-center gap-1">
                        {!unlocked && <CozyIcon name="lock_cozy" size={14} />}
                        Fase {st}
                        {st === currentStage && <span className="w-1.5 h-1.5 rounded-full bg-[#58CC02]" aria-label="fase aktif" />}
                      </span>
                      <span className="text-[10px] font-bold leading-tight break-words">
                        {unlocked ? meta.name : "???"}
                      </span>
                    </button>
                  );
                })}
              </ChipScroller>
              <div className="rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] px-3 py-2 text-[11px] sm:text-xs font-bold text-[#3D352E] leading-relaxed break-words" aria-live="polite">
                {previewStage <= currentStage ? (
                  <>
                    <strong className="font-display">Fase {previewStage}: {GROWTH_STAGE_META[previewStage].name}</strong>
                    {previewStage === currentStage ? " (fase aktif)" : " (sudah dilewati)"} —{" "}
                    {GROWTH_STAGE_META[previewStage].description}
                  </>
                ) : (
                  <>
                    <strong className="font-display">Fase {previewStage}: siluet rahasia.</strong> Selesaikan Fase {previewStage - 1} (
                    {GROWTH_STAGE_TARGETS[(previewStage - 1) as GrowthStage].nextStageXpTarget} Stage XP &amp;{" "}
                    {GROWTH_STAGE_TARGETS[(previewStage - 1) as GrowthStage].nextStageDaysTarget} hari mencatat) untuk membukanya.
                  </>
                )}
              </div>
            </div>

            {/* Dual Progress Bars for Active Pet's Growth Stage (Reset to 0 at every new stage!) */}
            {currentStage < 8 ? (
              <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] space-y-2.5">
                <p className="text-xs font-display font-extrabold text-[#3D352E] leading-snug break-words">
                  Syarat Tumbuh ke Fase {currentStage + 1} (
                  {GROWTH_STAGE_META[(currentStage + 1) as GrowthStage].name}):
                </p>
                <ChunkyProgressBar
                  value={userProfile.stageXp}
                  max={stageTarget.nextStageXpTarget}
                  variant="sky"
                  label="Stage XP (Direset 0 tiap naik Fase)"
                  showFraction
                />
                <ChunkyProgressBar
                  value={userProfile.stageRecordedDays}
                  max={stageTarget.nextStageDaysTarget}
                  variant="honey"
                  label="Hari Mencatat di Fase Ini"
                  showFraction
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#EFFBE6] border-2 border-[#C3EFA4] text-center font-display text-xs font-extrabold text-[#2E6F00]">
                <span className="inline-flex items-center justify-center gap-1.5">
                  <CozyIcon name="crown_sultan" size={20} /> Fase Puncak (Stage 8: Sepuh Bijaksana) Telah Tercapai!
                </span>
              </div>
            )}

            {/* Lemari Cepat: slot berikon + strip koleksi yang bisa digeser (Versi 5.1) */}
            <EquippedSlotsPanel
              equipped={userProfile.equippedAccessories}
              ownedIds={userProfile.ownedAccessories || []}
              onToggle={(id) => toggleEquipAccessory(id)}
              onOpenItem={(id) => setDetail({ id, mode: "wardrobe" })}
              onGoShop={(slot) => {
                setShopSlotFilter(slot);
                setActiveTab("shop");
              }}
              petName={petName}
              isEggStage={previewStage === 1}
            />
          
          </CozyCard>
        </div>

        {/* ================= RIGHT COLUMN (lg:col-span-7 — 3 Sub-Tabs: Lemari, Butik Shop, Kandang) ================= */}
        <div className="lg:col-span-7 space-y-4 min-w-0">
          {/* Tab utama: Lemari / Butik / Kandang (WAI-ARIA tablist + navigasi panah) */}
          <div
            role="tablist"
            aria-label="Bagian Dunia Pet"
            className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#F7F3EB] p-1.5 rounded-2xl border-2 border-[#E6DFD2]"
            onKeyDown={onTabKeyDown}
          >
            {TAB_DEFS.map((t) => {
              const selected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => {
                    soundEffects.tactileClick();
                    setNotice(null);
                    setActiveTab(t.id);
                  }}
                  className={cn(
                    "py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl font-display text-[11px] sm:text-sm font-extrabold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer transition-all leading-tight text-center",
                    FOCUS_RING,
                    selected
                      ? "bg-[#38B6FF] text-[#3D352E] border-b-[3px] border-b-[#1E88E5]"
                      : "bg-white text-[#3D352E] border border-[#E6DFD2] hover:bg-[#FFFDF9]"
                  )}
                >
                  <CozyIcon name={t.icon} size={22} className="shrink-0" />
                  <span>
                    {t.id === "wardrobe" ? (
                      <>
                        <span className="sm:hidden">Lemari</span>
                        <span className="hidden sm:inline">Lemari Kostum</span> ({userProfile.ownedAccessories.length})
                      </>
                    ) : t.id === "shop" ? (
                      <>
                        <span className="sm:hidden">Butik</span>
                        <span className="hidden sm:inline">Butik Shop</span>
                      </>
                    ) : (
                      <>
                        <span className="sm:hidden">Kandang</span>
                        <span className="hidden sm:inline">Kandang &amp; Adopsi</span> ({userProfile.unlockedSpecies.length}/{PET_SPECIES_CATALOG.length})
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pesan status (beli gagal, dll.) — dibacakan pembaca layar */}
          <div role="status" aria-live="polite" className={notice ? "" : "sr-only"}>
            {notice && (
              <div className="px-4 py-2.5 rounded-2xl bg-[#FFF2F0] border-2 border-[#FFCDC6] text-xs sm:text-sm font-bold text-[#8F2A1B] flex items-start gap-2">
                <span className="flex-1 leading-snug break-words">{notice}</span>
                <button
                  type="button"
                  aria-label="Tutup pesan"
                  onClick={() => setNotice(null)}
                  className={cn("rounded-lg p-0.5 cursor-pointer", FOCUS_RING)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ================= TAB 1: LEMARI KOSTUM (WARDROBE) ================= */}
          {activeTab === "wardrobe" && (
            <CozyCard
              tone="white"
              className="p-4 sm:p-5 space-y-4"
              role="tabpanel"
              id="panel-wardrobe"
              aria-labelledby="tab-wardrobe"
            >
              <div className="space-y-1">
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words flex items-center gap-2">
                  <CozyIcon name="wardrobe_costume" size={28} className="shrink-0" />
                  <span>Lemari Koleksi Kostum & Properti ({ownedAccessoryItems.length} Item)</span>
                </h2>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                  Pilih slot kategori di bawah untuk memadu-padankan pakaian,
                  topi, kacamata, properti, aura, dan latar belakang pada{" "}
                  {petName}.
                </p>
              </div>

              {/* Filter kategori slot (berikon) */}
              <ChipScroller label="Filter slot lemari" watch={wardrobeSlotFilter}>
                <FilterChip
                  active={wardrobeSlotFilter === "all"}
                  onClick={() => setWardrobeSlotFilter("all")}
                >
                  <GlyphIcon name="grid" size={14} /> Semua ({userProfile.ownedAccessories.length})
                </FilterChip>
                {ACCESSORY_SLOTS.map((slot) => (
                  <FilterChip
                    key={slot}
                    active={wardrobeSlotFilter === slot}
                    onClick={() => setWardrobeSlotFilter(slot)}
                  >
                    <GlyphIcon name={SLOT_GLYPH[slot]} size={14} /> {SLOT_LABEL[slot]}
                  </FilterChip>
                ))}
              </ChipScroller>

              {/* Filter gaya: Perempuan / Laki-laki / Netral */}
              <GenderChips value={genderFilter} onChange={setGenderFilter} />

              {ownedAccessoryItems.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-3">
                  <p className="font-display text-base font-extrabold text-[#3D352E]">
                    Belum ada koleksi di kategori slot ini!
                  </p>
                  <p className="text-xs font-bold text-[#7A6E65]">
                    Yuk kunjungi tab Butik Shop atau buka Peti Harta di Peta
                    Jalur Kas Harian untuk mengoleksi item baru!
                  </p>
                  <TactileButton
                    variant="sky"
                    size="sm"
                    onClick={() => setActiveTab("shop")}
                  >
                    <CozyIcon name="boutique_shop" size={20} /> Buka Butik Shop Sekarang
                  </TactileButton>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {ownedAccessoryItems.slice(0, wardrobeVisible).map((item) => (
                      <ItemTile
                        key={item.id}
                        item={item}
                        equipped={userProfile.equippedAccessories?.[item.slot] === item.id}
                        action={wardrobeAction(item)}
                        onOpen={() => setDetail({ id: item.id, mode: "wardrobe" })}
                      />
                    ))}
                  </div>
                  {ownedAccessoryItems.length > wardrobeVisible && (
                    <TactileButton variant="cream" size="sm" fullWidth onClick={() => setWardrobeVisible((n) => n + SHOP_PAGE)}>
                      Tampilkan lebih banyak ({ownedAccessoryItems.length - wardrobeVisible} item lagi)
                    </TactileButton>
                  )}
                </>
              )}
            </CozyCard>
          )}

          {/* ================= TAB 2: BUTIK SHOP (BELI KOSTUM & AURA) ================= */}
          {activeTab === "shop" && (
            <CozyCard
              tone="white"
              className="p-4 sm:p-5 space-y-4"
              role="tabpanel"
              id="panel-shop"
              aria-labelledby="tab-shop"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words flex items-center gap-2">
                    <CozyIcon name="boutique_shop" size={28} className="shrink-0" />
                    <span>Butik Kostum, Properti & Latar ({SHOP_ITEM_COUNT} Item Shop)</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EFFBE6] border border-[#C3EFA4] text-xs font-display font-extrabold text-[#2E6F00]">
                    Fase Aktif {petName}: Fase {currentStage}/8
                  </span>
                </div>
                <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                  Beli kostum sesuai Fase Pertumbuhan {petName}. Item dari Fase
                  di atas Fase {currentStage} masih terkunci dalam Siluet
                  Rahasia. ({PATH_DROP_COUNT} Item Eksklusif Jalur Kas tidak dijual di sini —
                  dapatkan gratis dari Peti Harta Peta Jalur Kas!)
                </p>
              </div>

              {/* Filter fase pertumbuhan (1..8) — satu baris geser */}
              {shopSlotFilter !== "shield" && (
              <div className="space-y-1">
                <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Fase Pertumbuhan
                </span>
                <ChipScroller label="Filter fase Butik" watch={shopStageFilter}>
                  <FilterChip
                    active={shopStageFilter === "all"}
                    onClick={() => setShopStageFilter("all")}
                  >
                    Semua Fase ({SHOP_ITEM_COUNT})
                  </FilterChip>
                  {GROWTH_STAGES.map((st) => {
                    const isUnlocked = st <= currentStage;
                    return (
                      <FilterChip
                        key={st}
                        dashed={!isUnlocked}
                        active={shopStageFilter === st}
                        label={isUnlocked ? `Fase ${st}` : `Fase ${st}, terkunci`}
                        onClick={() => setShopStageFilter(st)}
                      >
                        {!isUnlocked && <CozyIcon name="lock_cozy" size={14} />}
                        Fase {st}
                      </FilterChip>
                    );
                  })}
                </ChipScroller>
              </div>
              )}

              {/* Filter kategori slot (berikon) */}
              <div className="space-y-1">
                <span className="text-[11px] font-display font-extrabold uppercase tracking-wider text-[#7A6E65]">
                  Kategori
                </span>
                <ChipScroller label="Filter slot Butik" watch={shopSlotFilter}>
                  <FilterChip
                    size="sm"
                    tone="taro"
                    active={shopSlotFilter === "all"}
                    onClick={() => setShopSlotFilter("all")}
                  >
                    <GlyphIcon name="grid" size={14} /> Semua
                  </FilterChip>
                  {ACCESSORY_SLOTS.map((slot) => (
                    <FilterChip
                      key={slot}
                      size="sm"
                      tone="taro"
                      active={shopSlotFilter === slot}
                      onClick={() => setShopSlotFilter(slot)}
                    >
                      <GlyphIcon name={SLOT_GLYPH[slot]} size={14} /> {SLOT_LABEL[slot]}
                    </FilterChip>
                  ))}
                  <FilterChip
                    size="sm"
                    tone="sky"
                    active={shopSlotFilter === "shield"}
                    onClick={() => setShopSlotFilter("shield")}
                  >
                    <CozyIcon name="ice_shield" size={16} /> Pelindung Streak
                  </FilterChip>
                </ChipScroller>
              </div>

              {shopSlotFilter === "shield" ? (
                <ShieldShop
                  today={todayStr}
                  freeLeft={shieldFreeLeft}
                  paidCount={userProfile.streak_freeze_count}
                  balance={userProfile.points_balance}
                  onBuy={handleBuyShield}
                />
              ) : (
              <>
              {shopSlotFilter === "all" && (
                <ShieldTeaser freeLeft={shieldFreeLeft} total={shieldTotal} onOpen={() => setShopSlotFilter("shield")} />
              )}

              {/* Filter gaya */}
              <GenderChips value={genderFilter} onChange={setGenderFilter} />

              {shopAccessoryItems.length === 0 ? (
                <div className="p-6 rounded-3xl bg-[#F7F3EB] border-2 border-dashed border-[#D4C9B4] text-center space-y-1">
                  <p className="font-display text-sm font-extrabold text-[#3D352E]">Belum ada item di filter ini.</p>
                  <p className="text-xs font-bold text-[#7A6E65]">Coba ganti fase, kategori, atau gaya. Item Eksklusif Jalur Kas hanya didapat dari Peti Harta.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {shopAccessoryItems.slice(0, shopVisible).map((item) => {
                      const st = shopItemState(item);
                      return (
                        <ItemTile
                          key={item.id}
                          item={item}
                          locked={st.locked}
                          owned={st.owned}
                          price={item.pricePoints}
                          action={shopAction(item, false)}
                          onOpen={() => setDetail({ id: item.id, mode: "shop" })}
                        />
                      );
                    })}
                  </div>
                  {shopAccessoryItems.length > shopVisible && (
                    <TactileButton variant="cream" size="sm" fullWidth onClick={() => setShopVisible((n) => n + SHOP_PAGE)}>
                      Tampilkan lebih banyak ({shopAccessoryItems.length - shopVisible} item lagi)
                    </TactileButton>
                  )}
                </>
              )}
              </>
              )}
            </CozyCard>
          )}

          {/* ================= TAB 3: KANDANG & ADOPSI TELUR PET (8 SPESIES KAWAII) ================= */}
          {activeTab === "kandang" && (
            <div
              className="space-y-4"
              role="tabpanel"
              id="panel-kandang"
              aria-labelledby="tab-kandang"
            >
              <CozyCard tone="white" className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#3D352E] leading-snug break-words">
                    Kandang Pet & Adopsi Telur Baru ({PET_SPECIES_CATALOG.length} Spesies Kawaii)
                  </h2>
                  <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                    Setiap spesies Pet yang kamu adopsi dimulai dari{" "}
                    <strong>Fase 1: Telur Ajaib (0 Stage XP & 0 Hari)</strong>{" "}
                    dan menyimpan progres pertumbuhannya masing-masing secara
                    mandiri!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {PET_SPECIES_CATALOG.map((sp) => {
                    const isUnlocked = userProfile.unlockedSpecies.includes(
                      sp.id
                    );
                    const isActive = activeSpecies === sp.id;
                    const petInstance = userProfile.ownedPets?.[sp.id];
                    const instStage: GrowthStage =
                      petInstance?.currentStage || (isActive ? currentStage : 1);
                    const instMeta = GROWTH_STAGE_META[instStage];
                    const canAfford =
                      userProfile.points_balance >= sp.pricePoints;

                    return (
                      <div
                        key={sp.id}
                        className={cn(
                          "rounded-3xl border-2 border-b-[4px] flex flex-col items-center text-center p-4 gap-2.5 transition-all",
                          isActive
                            ? "bg-[#EFFBE6] border-[#C3EFA4] border-b-[#9EE070]"
                            : isUnlocked
                            ? "bg-white border-[#E6DFD2] border-b-[#D4C9B4]"
                            : "bg-[#FFFDF9] border-[#E6DFD2] border-b-[#D4C9B4]"
                        )}
                      >
                        {/* Avatar Preview: Owned shows its current stage, Unowned shows Cute Preview + Egg Badge */}
                        <div className="relative w-32 h-32 rounded-2xl bg-[#F7F3EB] border-2 border-[#E6DFD2] flex items-center justify-center p-2">
                          <CustomizablePetAvatar
                            species={sp.id}
                            stage={isUnlocked ? instStage : 3}
                            mood="happy"
                            className="w-28 h-28"
                          />
                          <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE08D] text-[10px] font-display font-extrabold text-[#4A3500]">
                            Tier Kawaii <GlyphInline name="star" />{sp.kawaiiTier}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-extrabold text-[#3D352E] leading-snug break-words">
                          {isUnlocked && petInstance?.customName
                            ? `${petInstance.customName} (${sp.name})`
                            : sp.name}
                        </h3>

                        {isUnlocked ? (
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#EEF8FF] border border-[#BCE3FF] text-[11px] font-display font-extrabold text-[#1565C0]">
                              Fase {instStage}/8: {instMeta.name}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#F7F3EB] border border-[#E6DFD2] text-[11px] font-bold text-[#7A6E65]">
                              {petInstance?.stageXp ?? 0} XP •{" "}
                              {petInstance?.stageRecordedDays ?? 0} Hari
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#F8F0FF] border border-[#E2C6FF] text-[11px] font-display font-extrabold text-[#3D352E] inline-flex items-center gap-1">
                            <CozyIcon name="egg_nest" size={14} /> Diadopsi Mulai Fase 1: Telur Ajaib
                          </span>
                        )}

                        <p className="text-xs font-bold text-[#7A6E65] leading-relaxed break-words">
                          {sp.description}
                        </p>

                        {!isUnlocked && (
                          <div className="px-3 py-1 rounded-xl bg-[#FFFBEB] border border-[#FDE08D] font-display text-xs font-extrabold text-[#4A3500] inline-flex items-center gap-1">
                            <CozyIcon name="coin_rupiah" size={16} />
                            <span>
                              {sp.pricePoints === 0
                                ? "Gratis (Starter)"
                                : `${sp.pricePoints.toLocaleString(
                                    "id-ID"
                                  )} Poin`}
                            </span>
                          </div>
                        )}

                        <div className="w-full pt-1 mt-auto">
                          {isActive ? (
                            <TactileButton
                              variant="cream"
                              size="sm"
                              fullWidth
                              disabled
                            >
                              <CozyIcon name="check_badge" size={18} /> Sedang Aktif di Panggung
                            </TactileButton>
                          ) : isUnlocked ? (
                            <TactileButton
                              variant="sky"
                              size="sm"
                              fullWidth
                              onClick={() => {
                                soundEffects.tactileClick();
                                equipPetSpecies(sp.id);
                              }}
                            >
                              Panggil ke Panggung Pet
                            </TactileButton>
                          ) : (
                            <TactileButton
                              variant={canAfford ? "matcha" : "cream"}
                              size="sm"
                              fullWidth
                              onClick={() => {
                                soundEffects.tactileClick();
                                if (canAfford) {
                                  setConfirmAdoptSpecies(sp.id);
                                } else {
                                  const res = buyPetSpecies(sp.id);
                                  setNotice(res.success ? null : res.message);
                                }
                              }}
                            >
                              <CozyIcon name="egg_nest" size={18} /> Adopsi Telur (
                              {sp.pricePoints.toLocaleString("id-ID")} Poin)
                            </TactileButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CozyCard>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PetsAndBoutiquePage() {
  return (
    <Suspense
      fallback={
        <CozyCard tone="white" className="p-8 text-center">
          <p className="font-display text-base font-extrabold text-[#3D352E]">
            Memuat Dunia Pet & Butik...
          </p>
        </CozyCard>
      }
    >
      <PetsAndBoutiqueContent />
    </Suspense>
  );
}

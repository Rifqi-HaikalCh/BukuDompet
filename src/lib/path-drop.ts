import {
  ACCESSORY_CATALOG,
  ACCESSORY_BY_ID,
  type AccessoryItem,
} from "@/components/illustrations/PetAvatarSystem";

/** Semua item eksklusif Peti Harta Peta Jalur Kas (`source === "path_drop"`). */
export const PATH_DROP_ITEMS: readonly AccessoryItem[] = ACCESSORY_CATALOG.filter(
  (it) => it.source === "path_drop"
);

/**
 * Memilih item yang dijatuhkan sebuah Peti Harta. Fungsi murni: store (saat klaim) dan UI (pratinjau
 * peti) memakai fungsi yang sama sehingga tidak mungkin berbeda.
 *
 * Urutan prioritas (sama persis dengan perilaku lama, jadi data lama tetap konsisten):
 * 1. item path_drop yang belum dimiliki dan fasenya <= max(fase pet, 3),
 * 2. item path_drop yang belum dimiliki (fase berapa pun),
 * 3. item katalog apa pun yang belum dimiliki,
 * 4. cadangan: aura daun melayang (agar klaim tak pernah gagal walau lemari sudah penuh).
 */
export function pickPathDropItem(
  ownedIds: readonly string[],
  currentStage: number
): AccessoryItem {
  const owned = new Set(ownedIds);
  const unowned = PATH_DROP_ITEMS.filter((it) => !owned.has(it.id));
  return (
    unowned.find((it) => it.stageRequirement <= Math.max(currentStage, 3)) ||
    unowned[0] ||
    ACCESSORY_CATALOG.find((it) => !owned.has(it.id)) ||
    ACCESSORY_BY_ID["aura_floating_leaves"]
  );
}

/**
 * Simulasi item untuk setiap peti yang belum diklaim, dalam urutan hari: tiap peti "mengambil" satu
 * item sehingga peti berikutnya menampilkan item berbeda. Dipakai hanya untuk pratinjau.
 */
export function previewPathDrops(
  ownedIds: readonly string[],
  currentStage: number,
  unclaimedMilestoneDays: readonly number[]
): Record<number, AccessoryItem> {
  const owned = [...ownedIds];
  const out: Record<number, AccessoryItem> = {};
  for (const day of [...unclaimedMilestoneDays].sort((a, b) => a - b)) {
    const item = pickPathDropItem(owned, currentStage);
    out[day] = item;
    owned.push(item.id);
  }
  return out;
}

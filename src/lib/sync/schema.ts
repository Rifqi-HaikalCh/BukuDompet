"use client";

/**
 * Jembatan antara mesin sinkron (generik) dan kedua store zustand.
 * Setiap koleksi memetakan satu bagian state ke kumpulan dokumen JSON ber-id.
 * Aturan pemilik/visibilitas SEBENARNYA ada di database; `ownerOf` di sini hanya menyaring
 * lebih awal agar perangkat tidak mengirim data milik akun lain.
 */

import { INITIAL_PROFILES, INITIAL_SUPERVISOR_ASSIGNMENTS, useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { canon, type Doc } from "./canon";
import type { CollectionAdapter } from "./engine";
import { getSessionUser } from "./session-ref";
import { withSyncApplying } from "./apply-flag";

type Rec = Record<string, unknown>;
const asDoc = (r: unknown): Doc => r as Doc;

/* ───────────── koleksi berbentuk array rekaman ber-`id` ───────────── */

type OrderMode = "desc" | "asc" | "prepend" | "append";

function arrayAdapter(o: {
  name: string;
  get: () => Rec[];
  set: (next: Rec[]) => void;
  order: OrderMode;
  orderKey?: string;
  ownerOf?: CollectionAdapter["ownerOf"];
  ownerOnly?: boolean;
  shouldPush?: CollectionAdapter["shouldPush"];
  isSeed?: CollectionAdapter["isSeed"];
}): CollectionAdapter {
  const idOf = (r: Rec) => String(r.id);
  const keyOf = (r: Rec) => (o.orderKey && typeof r[o.orderKey] === "string" ? (r[o.orderKey] as string) : "");
  return {
    name: o.name,
    ownerOf: o.ownerOf,
    ownerOnly: o.ownerOnly,
    shouldPush: o.shouldPush,
    isSeed: o.isSeed,
    read: () => o.get().map((r) => [idOf(r), asDoc(r)] as [string, Doc]),
    apply: (ups, dels) => {
      let next = o.get().filter((r) => !dels.has(idOf(r)));
      const present = new Set<string>();
      next = next.map((r) => {
        const id = idOf(r);
        present.add(id);
        return ups.has(id) ? (ups.get(id) as Rec) : r;
      });
      for (const [id, doc] of ups) {
        if (present.has(id)) continue;
        const d = doc as Rec;
        const k = keyOf(d);
        if (o.order === "append" || (o.order !== "prepend" && !k)) {
          if (o.order === "asc" || o.order === "append") next.push(d);
          else next.unshift(d);
        } else if (o.order === "prepend") {
          next.unshift(d);
        } else if (o.order === "desc") {
          const at = next.findIndex((r) => keyOf(r) < k);
          if (at === -1) next.push(d);
          else next.splice(at, 0, d);
        } else {
          let at = next.length;
          while (at > 0 && keyOf(next[at - 1]) > k) at--;
          next.splice(at, 0, d);
        }
        present.add(id);
      }
      o.set(next);
    },
  };
}

/* ───────────── koleksi berbentuk kamus (kunci → nilai) ───────────── */

const wrapCache = new WeakMap<object, Doc>();
const wrap = (v: unknown): Doc => {
  if (typeof v === "object" && v !== null) {
    const hit = wrapCache.get(v);
    if (hit) return hit;
    const w: Doc = { v };
    wrapCache.set(v, w);
    return w;
  }
  return { v };
};

function mapAdapter(o: {
  name: string;
  get: () => Record<string, unknown>;
  set: (next: Record<string, unknown>) => void;
  toId?: (key: string) => string;
  toKey?: (id: string) => string;
  ownerOf?: CollectionAdapter["ownerOf"];
  ownerOnly?: boolean;
}): CollectionAdapter {
  const toId = o.toId ?? ((k: string) => k);
  const toKey = o.toKey ?? ((i: string) => i);
  return {
    name: o.name,
    ownerOf: o.ownerOf,
    ownerOnly: o.ownerOnly,
    read: () => Object.entries(o.get()).map(([k, v]) => [toId(k), wrap(v)] as [string, Doc]),
    apply: (ups, dels) => {
      const next = { ...o.get() };
      for (const id of dels) delete next[toKey(id)];
      for (const [id, doc] of ups) next[toKey(id)] = (doc as { v: unknown }).v;
      o.set(next);
    },
  };
}

/** Kunci arcade memakai `|` (userId|modeId) sedangkan awalan pemilik di database dipisah `:`. */
const pipeToColon = (k: string) => k.replace("|", ":");
const colonToPipe = (i: string) => i.replace(":", "|");
const prefixOwner = (id: string) => id.split(":")[0] || null;
const fieldOwner = (f: string) => (_id: string, d: Doc) => (typeof d[f] === "string" ? (d[f] as string) : null);

/* ───────────── profil bawaan yang belum disentuh tidak perlu diunggah ───────────── */

// Bidang yang diisi otomatis oleh pergantian hari/bulan di tiap perangkat tidak dihitung sebagai "perubahan nyata".
const comparable = (p: unknown) =>
  canon({
    ...(p as Rec),
    createdAt: undefined,
    last_recorded_date: undefined,
    lastStreakCheckDate: undefined,
    free_shield_month: undefined,
    free_shield_left: undefined,
  });
const SEED_PROFILE = new Map(INITIAL_PROFILES.map((p) => [p.id, comparable(p)]));
function isPristineProfile(doc: Doc): boolean {
  return SEED_PROFILE.get(String(doc.id)) === comparable(doc);
}

const SEED_ASSIGNMENTS = new Set(INITIAL_SUPERVISOR_ASSIGNMENTS.map((a) => `${a.supervisorId}:${a.userId}`));

const main = useBukuDompetStore;
const fam = useFamilyStore;
const fin = useFinanceStore;

const RAW_ADAPTERS: CollectionAdapter[] = [
  arrayAdapter({
    name: "profiles",
    get: () => main.getState().profiles as unknown as Rec[],
    set: (profiles) => main.setState({ profiles: profiles as never }),
    order: "append",
    // Profil sendiri selalu boleh. Profil orang lain hanya dikirim oleh admin/supervisor, dan hanya bila sudah ada di server
    // atau benar-benar diubah (hadiah, anggaran, stiker). Akun biasa tidak pernah membuat profil orang lain.
    shouldPush: (id, doc, hasShadow, me) =>
      hasShadow || id === me.id || ((me.role === "admin" || me.role === "supervisor") && !isPristineProfile(doc)),
    // Profil bawaan yang belum pernah diubah bukan "data milik akun lain" yang perlu dikhawatirkan.
    isSeed: (_id, doc) => isPristineProfile(doc),
  }),
  {
    name: "assignments",
    isSeed: (id) => SEED_ASSIGNMENTS.has(id),
    // Penugasan hanya boleh dibuat admin; akun lain cukup menerima dari server (bawaan lokal tidak diunggah).
    shouldPush: (_id, _doc, hasShadow, me) => hasShadow || me.role === "admin",
    read: () =>
      main
        .getState()
        .supervisorAssignments.map((a) => [`${a.supervisorId}:${a.userId}`, a as unknown as Doc] as [string, Doc]),
    apply: (ups, dels) => {
      const key = (a: { supervisorId: string; userId: string }) => `${a.supervisorId}:${a.userId}`;
      const cur = main.getState().supervisorAssignments.filter((a) => !dels.has(key(a)));
      const have = new Set(cur.map(key));
      const add = [...ups.entries()].filter(([id]) => !have.has(id)).map(([, d]) => d as unknown as { supervisorId: string; userId: string });
      const replaced = cur.map((a) => (ups.has(key(a)) ? (ups.get(key(a)) as unknown as typeof a) : a));
      main.setState({ supervisorAssignments: [...replaced, ...add] });
    },
  },
  arrayAdapter({
    name: "transactions",
    get: () => main.getState().transactions as unknown as Rec[],
    set: (v) => main.setState({ transactions: v as never }),
    order: "desc",
    orderKey: "created_at",
    ownerOf: fieldOwner("user_id"),
  }),
  arrayAdapter({
    name: "missions",
    get: () => main.getState().missions as unknown as Rec[],
    set: (v) => main.setState({ missions: v as never }),
    order: "prepend",
    ownerOf: fieldOwner("user_id"),
  }),
  arrayAdapter({
    name: "badges",
    get: () => main.getState().badges as unknown as Rec[],
    set: (v) => main.setState({ badges: v as never }),
    order: "desc",
    orderKey: "unlocked_at",
    ownerOf: fieldOwner("user_id"),
    ownerOnly: true,
  }),
  arrayAdapter({
    name: "redemptions",
    get: () => main.getState().redemptions as unknown as Rec[],
    set: (v) => main.setState({ redemptions: v as never }),
    order: "desc",
    orderKey: "created_at",
    ownerOf: fieldOwner("user_id"),
  }),
  mapAdapter({
    name: "ledger",
    get: () => main.getState().deletedRewardLedger as Record<string, unknown>,
    set: (v) => main.setState({ deletedRewardLedger: v as Record<string, number> }),
    ownerOf: prefixOwner,
    ownerOnly: true,
  }),
  arrayAdapter({
    name: "stories",
    get: () => fam.getState().stories as unknown as Rec[],
    set: (v) => fam.setState({ stories: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
    ownerOnly: true,
  }),
  arrayAdapter({
    name: "goals",
    get: () => fam.getState().goals as unknown as Rec[],
    set: (v) => fam.setState({ goals: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
    ownerOnly: true,
  }),
  arrayAdapter({
    name: "arcade_plays",
    get: () => fam.getState().arcadePlays as unknown as Rec[],
    set: (v) => fam.setState({ arcadePlays: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
    ownerOnly: true,
  }),
  mapAdapter({
    name: "arcade_progress",
    get: () => fam.getState().arcadeProgress as Record<string, unknown>,
    set: (v) => fam.setState({ arcadeProgress: v as never }),
    toId: pipeToColon,
    toKey: colonToPipe,
    ownerOf: prefixOwner,
    ownerOnly: true,
  }),
  mapAdapter({
    name: "arcade_sessions",
    get: () => fam.getState().arcadeSessions as Record<string, unknown>,
    set: (v) => fam.setState({ arcadeSessions: v as never }),
    toId: pipeToColon,
    toKey: colonToPipe,
    ownerOf: prefixOwner,
    ownerOnly: true,
  }),
  mapAdapter({
    name: "arcade_daily",
    get: () => fam.getState().arcadeDaily as Record<string, unknown>,
    set: (v) => fam.setState({ arcadeDaily: v as never }),
    ownerOf: prefixOwner,
  }),
  mapAdapter({
    name: "arcade_limits",
    get: () => fam.getState().arcadeLimits as Record<string, unknown>,
    set: (v) => fam.setState({ arcadeLimits: v as never }),
    ownerOf: prefixOwner,
  }),
  mapAdapter({
    name: "quest_claims",
    get: () => fam.getState().questClaims as Record<string, unknown>,
    set: (v) => fam.setState({ questClaims: v as Record<string, string> }),
    ownerOf: prefixOwner,
    ownerOnly: true,
  }),
  mapAdapter({
    name: "medal_claims",
    get: () => fam.getState().medalClaims as Record<string, unknown>,
    set: (v) => fam.setState({ medalClaims: v as Record<string, string> }),
    ownerOf: prefixOwner,
    ownerOnly: true,
  }),
  arrayAdapter({
    name: "feed_posts",
    get: () => fam.getState().feedPosts as unknown as Rec[],
    set: (v) => fam.setState({ feedPosts: v as never }),
    order: "desc",
    orderKey: "createdAt",
  }),
  arrayAdapter({
    name: "chat",
    get: () => fam.getState().chat as unknown as Rec[],
    set: (v) => fam.setState({ chat: v as never }),
    order: "asc",
    orderKey: "createdAt",
  }),
  arrayAdapter({
    name: "reminders",
    get: () => fam.getState().reminders as unknown as Rec[],
    set: (v) => fam.setState({ reminders: v as never }),
    order: "desc",
    orderKey: "createdAt",
  }),
  /* ── Versi 5.6: keuangan berlapis. Pemilik = `userId`; Supervisor boleh menulis (kecuali koleksi privat anak). ── */
  arrayAdapter({
    name: "budget_configs",
    get: () => fin.getState().budgetConfigs as unknown as Rec[],
    set: (v) => fin.setState({ budgetConfigs: v as never }),
    order: "append",
    ownerOf: fieldOwner("userId"),
  }),
  arrayAdapter({
    name: "sub_wallets",
    get: () => fin.getState().subWallets as unknown as Rec[],
    set: (v) => fin.setState({ subWallets: v as never }),
    order: "append",
    ownerOf: fieldOwner("userId"),
  }),
  arrayAdapter({
    name: "grant_requests",
    get: () => fin.getState().grantRequests as unknown as Rec[],
    set: (v) => fin.setState({ grantRequests: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
  }),
  arrayAdapter({
    name: "monthly_closings",
    get: () => fin.getState().monthlyClosings as unknown as Rec[],
    set: (v) => fin.setState({ monthlyClosings: v as never }),
    order: "desc",
    orderKey: "closedAt",
    ownerOf: fieldOwner("userId"),
  }),
  arrayAdapter({
    name: "vault_loans",
    get: () => fin.getState().vaultLoans as unknown as Rec[],
    set: (v) => fin.setState({ vaultLoans: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
  }),
  arrayAdapter({
    name: "wishlist_items",
    get: () => fin.getState().wishlistItems as unknown as Rec[],
    set: (v) => fin.setState({ wishlistItems: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
    ownerOnly: true,
  }),
  arrayAdapter({
    name: "reconciliations",
    get: () => fin.getState().reconciliations as unknown as Rec[],
    set: (v) => fin.setState({ reconciliations: v as never }),
    order: "desc",
    orderKey: "createdAt",
    ownerOf: fieldOwner("userId"),
    ownerOnly: true,
  }),
  {
    // State per-pengguna yang di store berupa variabel global perangkat: disimpan sebagai satu dokumen milik akun yang masuk.
    name: "user_state",
    ownerOf: prefixOwner,
    ownerOnly: true,
    shouldPush: (_id, _doc, hasShadow, me) => hasShadow || me.role === "user" || me.role === "schoolchild",
    read: () => {
      const u = getSessionUser();
      if (!u) return [];
      const st = main.getState();
      return [
        [u.id, { openedCheckpointWeeks: st.openedCheckpointWeeks, equippedMochiStage: st.equippedMochiStage, equippedTitle: st.equippedTitle }],
      ];
    },
    apply: (ups) => {
      const u = getSessionUser();
      const d = u ? (ups.get(u.id) as Rec | undefined) : undefined;
      if (!d) return;
      main.setState({
        ...(Array.isArray(d.openedCheckpointWeeks) ? { openedCheckpointWeeks: d.openedCheckpointWeeks as number[] } : {}),
        ...("equippedMochiStage" in d ? { equippedMochiStage: (d.equippedMochiStage ?? null) as never } : {}),
        ...(typeof d.equippedTitle === "string" ? { equippedTitle: d.equippedTitle } : {}),
      });
    },
  },
  {
    name: "kv",
    read: () => [["feedCycleStartDate", { v: fam.getState().feedCycleStartDate }]],
    apply: (ups) => {
      const d = ups.get("feedCycleStartDate") as { v?: unknown } | undefined;
      if (d && typeof d.v === "string") fam.setState({ feedCycleStartDate: d.v });
    },
  },
];

/** Bagian state yang disinkronkan — dipakai untuk mendeteksi perubahan lokal tanpa memindai tiap klik UI. */
export function syncedSlicesChanged(): {
  main: (keyof ReturnType<typeof main.getState>)[];
  fam: (keyof ReturnType<typeof fam.getState>)[];
  fin: (keyof ReturnType<typeof fin.getState>)[];
} {
  return {
    main: ["profiles", "supervisorAssignments", "transactions", "missions", "badges", "redemptions", "deletedRewardLedger"],
    fam: [
      "stories", "goals", "arcadePlays", "arcadeProgress", "arcadeSessions", "arcadeDaily", "arcadeLimits",
      "questClaims", "medalClaims", "feedPosts", "chat", "reminders", "feedCycleStartDate",
    ],
    fin: ["budgetConfigs", "subWallets", "grantRequests", "monthlyClosings", "wishlistItems", "reconciliations", "vaultLoans"],
  };
}

/** Semua penerapan dari server ditandai agar efek samping aksi (siaran keluarga, dll.) tidak terpicu olehnya. */
export const ADAPTERS: CollectionAdapter[] = RAW_ADAPTERS.map((a) => ({
  ...a,
  apply: (ups, dels) => withSyncApplying(() => a.apply(ups, dels)),
}));

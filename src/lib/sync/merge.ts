import { isObj, merge3, unionArrays, type Doc, type MergeOpts } from "./canon";

/**
 * Aturan penyelesaian konflik per koleksi (dipanggil saat dua perangkat mengubah dokumen yang sama).
 * Prinsip: tidak ada poin/riwayat yang hilang diam-diam; sisanya aksi terakhir pengguna menang.
 */

const PROFILE_OPTS: MergeOpts = {
  // Saldo, poin seumur hidup dan XP digabung sebagai SELISIH: dua perangkat yang sama-sama menambah
  // poin tidak saling menimpa (basis = versi server terakhir yang diketahui perangkat ini).
  delta: new Set(["points_balance", "lifetime_points", "xp"]),
  max: new Set(["level", "longest_streak", "stageXp", "stageRecordedDays", "streak_freeze_count"]),
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function mergeProfile(base: Doc | undefined, local: Doc, remote: Doc): Doc {
  if (!base) {
    // Tanpa basis (sinkron pertama): pakai dokumen yang paling "maju", lalu satukan koleksi bawaannya.
    const winner = num(local.lifetime_points) > num(remote.lifetime_points) ? local : remote;
    const loser = winner === local ? remote : local;
    const out = { ...(winner as Doc) };
    for (const k of ["ownedAccessories", "unlockedSpecies", "claimedPathMilestones", "ownedTitleIds", "ownedBadgeBgIds", "supervisorCheers"]) {
      const a = winner[k];
      const b = loser[k];
      if (Array.isArray(a) && Array.isArray(b)) out[k] = unionArrays(a, b);
    }
    return out;
  }
  return merge3(base, local, remote, PROFILE_OPTS) as Doc;
}

function mergeFeedPost(local: Doc, remote: Doc): Doc {
  const out: Doc = { ...remote, ...local };
  const l = (k: string) => (Array.isArray(local[k]) ? (local[k] as unknown[]) : []);
  const r = (k: string) => (Array.isArray(remote[k]) ? (remote[k] as unknown[]) : []);
  out.likes = Array.from(new Set([...l("likes"), ...r("likes")]));
  // komentar: per id; hadiah: per (pengirim, waktu) — tidak ada yang hilang
  const byKey = (arr: unknown[], f: (x: Record<string, unknown>) => string) => {
    const m = new Map<string, unknown>();
    for (const x of arr) if (isObj(x)) m.set(f(x), x);
    return [...m.values()];
  };
  out.comments = byKey([...r("comments"), ...l("comments")], (x) => String(x.id ?? JSON.stringify(x))).sort((a, b) =>
    String((a as Doc).createdAt ?? (a as Doc).at ?? "").localeCompare(String((b as Doc).createdAt ?? (b as Doc).at ?? "")),
  );
  out.gifts = byKey([...r("gifts"), ...l("gifts")], (x) => `${x.fromId}|${x.at}|${x.amount}`);
  return out;
}

function mergeProgress(local: Doc, remote: Doc): Doc {
  const lv = isObj(local.v) ? local.v : {};
  const rv = isObj(remote.v) ? remote.v : {};
  const maxMap = (a: unknown, b: unknown) => {
    const out: Record<string, number> = {};
    for (const src of [a, b]) if (isObj(src)) for (const [k, v] of Object.entries(src)) out[k] = Math.max(out[k] ?? 0, num(v));
    return out;
  };
  return {
    v: {
      ...rv,
      ...lv,
      level: Math.max(num(lv.level), num(rv.level)),
      clears: maxMap(lv.clears, rv.clears),
      cursor: maxMap(lv.cursor, rv.cursor),
    },
  };
}

/** Hasil selalu dokumen utuh; jika sama dengan `remote`, tidak ada yang perlu dikirim ulang. */
export function mergeDoc(collection: string, base: Doc | undefined, local: Doc, remote: Doc): Doc {
  switch (collection) {
    case "profiles":
      return mergeProfile(base, local, remote);
    case "feed_posts":
      return mergeFeedPost(local, remote);
    case "arcade_progress":
      return mergeProgress(local, remote);
    case "reminders":
      return { ...remote, ...local, seen: Boolean(local.seen) || Boolean(remote.seen) };
    case "missions":
      return {
        ...remote,
        ...local,
        current_value: Math.max(num(local.current_value), num(remote.current_value)),
        is_claimed: Boolean(local.is_claimed) || Boolean(remote.is_claimed),
      };
    case "redemptions":
      // keputusan Supervisor (disetujui/ditolak) tidak boleh ditimpa salinan "menunggu" yang basi
      return remote.status && remote.status !== "pending" && local.status === "pending" ? remote : local;
    case "user_state": {
      const weeks = unionArrays(
        Array.isArray(local.openedCheckpointWeeks) ? local.openedCheckpointWeeks : [],
        Array.isArray(remote.openedCheckpointWeeks) ? remote.openedCheckpointWeeks : [],
      ) as number[];
      return { ...remote, ...local, openedCheckpointWeeks: [...weeks].sort((a, b) => a - b) };
    }
    case "kv": {
      // perangkat baru memakai nilai bawaannya sendiri: server yang dipercaya; selebihnya tanggal terbaru menang
      if (!base) return remote;
      const a = String(local.v ?? "");
      const b = String(remote.v ?? "");
      return a >= b ? local : remote;
    }
    default:
      return local;
  }
}

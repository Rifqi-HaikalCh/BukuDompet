import { isObj, merge3, unionArrays, type Doc, type MergeOpts } from "./canon";
import { GRANT_RANK } from "../finance/grants";
import { VERIFICATION_RANK } from "../finance/income";

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

/* ───────────── Versi 5.6: keuangan berlapis ───────────── */

const stamp = (d: Doc) => String(d.updatedAt ?? "");
/** Terakhir-menang berdasarkan `updatedAt`; seri → versi server (deterministik di semua perangkat). */
const lww = (local: Doc, remote: Doc): Doc => (stamp(local) > stamp(remote) ? local : remote);

function mergeGrant(local: Doc, remote: Doc): Doc {
  const rl = GRANT_RANK[String(local.status) as keyof typeof GRANT_RANK] ?? 0;
  const rr = GRANT_RANK[String(remote.status) as keyof typeof GRANT_RANK] ?? 0;
  const win = rl !== rr ? (rl > rr ? local : remote) : lww(local, remote);
  const lose = win === local ? remote : local;
  // Foto yang hanya ada di salah satu sisi tidak boleh hilang.
  const out: Doc = { ...win };
  for (const k of ["proofPhoto", "receiptPhoto"]) if (!out[k] && lose[k]) out[k] = lose[k];
  return out;
}

function mergeTransaction(local: Doc, remote: Doc): Doc {
  const rank = (d: Doc) => (typeof d.verificationStatus === "string" ? (VERIFICATION_RANK[d.verificationStatus] ?? -1) : -1);
  const rl = rank(local);
  const rr = rank(remote);
  // Konfirmasi Supervisor (verified) selalu mengalahkan salinan anak yang masih menunggu.
  const win = rl !== rr ? (rl > rr ? local : remote) : local;
  const reimbursedAt = (local.reimbursedAt as string | undefined) ?? (remote.reimbursedAt as string | undefined);
  return reimbursedAt && !win.reimbursedAt ? { ...win, reimbursedAt } : win;
}

function mergeLoan(local: Doc, remote: Doc): Doc {
  const rank = (d: Doc) => (d.status === "open" ? 0 : 1);
  const rl = rank(local);
  const rr = rank(remote);
  const win = rl !== rr ? (rl > rr ? local : remote) : lww(local, remote);
  return {
    ...win,
    recovered: Math.max(num(local.recovered), num(remote.recovered)),
    ...((local.approvedBy ?? remote.approvedBy) ? { approvedBy: local.approvedBy ?? remote.approvedBy } : {}),
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
    case "sub_wallets":
    case "budget_configs":
    case "reconciliations":
      return lww(local, remote);
    case "grant_requests":
      return mergeGrant(local, remote);
    case "transactions":
      return mergeTransaction(local, remote);
    case "monthly_closings":
      // Tutup buku bersifat final: yang lebih dulu ditutup yang berlaku (id deterministik per siklus).
      return String(local.closedAt ?? "") < String(remote.closedAt ?? "") ? local : remote;
    case "wishlist_items": {
      const final = (d: Doc) => (d.status === "cooling" ? 0 : 1);
      return final(local) !== final(remote) ? (final(local) > final(remote) ? local : remote) : lww(local, remote);
    }
    case "vault_loans":
      return mergeLoan(local, remote);
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

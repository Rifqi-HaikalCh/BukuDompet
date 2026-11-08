/**
 * Mesin sinkronisasi BukuDompet v5.5.
 *
 * Prinsip: aplikasi tetap "local-first" (zustand + localStorage), tetapi SETIAP perubahan dipastikan
 * sampai ke database lewat server. Alih-alih mengubah ±60 aksi store, mesin ini membandingkan isi
 * store dengan "bayangan" (versi terakhir yang diketahui server) dan mengirim selisihnya. Dengan
 * begitu antrean otomatis tahan-offline & tahan-reload, dan tidak ada aksi yang terlewat.
 *
 * Mesin ini murni (tanpa React/zustand/fetch) — semua ketergantungan disuntikkan sehingga bisa diuji.
 */

import { hashDoc, resetHashCache, type Doc } from "./canon";
import { mergeDoc } from "./merge";

export const TOMB = "∅";

export interface CollectionAdapter {
  name: string;
  /** Semua dokumen koleksi ini di store saat ini: [id, dokumen]. */
  read(): Array<[string, Doc]>;
  /** Terapkan perubahan dari server ke store (tanpa efek samping aksi). */
  apply(upserts: Map<string, Doc>, deletes: Set<string>): void;
  /** Pemilik dokumen (untuk koleksi berpemilik); null bila tidak berpemilik. */
  ownerOf?(id: string, doc: Doc): string | null;
  /** true bila hanya pemilik/Admin yang boleh menulis (tanpa Supervisor). */
  ownerOnly?: boolean;
  /** true bila dokumen lokal ini hanyalah data bawaan aplikasi (bukan buatan pengguna): kalah oleh penghapusan di server. */
  isSeed?(id: string, doc: Doc): boolean;
  /** Saringan tambahan untuk dokumen yang belum ada di server (mis. jangan unggah profil bawaan yang tak diubah). */
  shouldPush?(id: string, doc: Doc, hasShadow: boolean, me: { id: string; role: string }): boolean;
}

export interface Shadow {
  /** revisi server terakhir yang diketahui */
  r: number;
  /** hash dokumen pada revisi itu (atau TOMB bila dokumen sudah dihapus) */
  h: string;
  /** salinan dokumen (hanya untuk koleksi yang memerlukan merge 3-arah: profil) */
  b?: Doc;
}

export interface BlockedEntry {
  h: string;
  reason: "denied" | "invalid";
  m?: string;
}

export interface Persisted {
  v: 1;
  userId: string | null;
  /** peran akun pemilik keadaan ini (menentukan dokumen mana yang boleh diunggah) */
  role: string | null;
  epoch: string | null;
  cursor: number;
  shadow: Record<string, Shadow>;
  blocked: Record<string, BlockedEntry>;
}

export interface WireDoc {
  c: string;
  i: string;
  r: number;
  s: number;
  x: boolean;
  d: Doc | null;
}
export interface PullResponse {
  epoch: string;
  docs: WireDoc[];
  seq: number;
  more: boolean;
}
export interface WireOp {
  c: string;
  i: string;
  t: "u" | "d";
  b: number;
  d?: Doc;
}
export interface WireResult {
  k: string;
  s: "ok" | "conflict" | "denied" | "invalid";
  r: number | null;
  q?: number | null;
  d?: Doc | null;
  x?: boolean;
  m?: string;
}
export interface PushResponse {
  epoch: string;
  results: WireResult[];
}

export class SyncHttpError extends Error {
  constructor(public status: number, public code = "") {
    super(`HTTP ${status} ${code}`);
  }
}

export interface Transport {
  pull(since: number): Promise<PullResponse>;
  push(ops: WireOp[]): Promise<PushResponse>;
}
export interface PersistIO {
  load(): Persisted | null;
  save(p: Persisted): void;
}

export type Phase = "idle" | "syncing" | "offline" | "error" | "auth";
export interface SyncSnapshot {
  phase: Phase;
  /** perubahan lokal yang belum diterima server */
  pending: number;
  /** perubahan yang ditolak server (butuh perhatian) */
  blocked: number;
  /** dokumen milik akun lain yang tidak boleh diunggah dari akun ini */
  foreign: number;
  /** penghapusan massal yang ditahan demi keamanan */
  held: number;
  lastSyncAt: number | null;
  ready: boolean;
}

export interface EngineDeps {
  adapters: CollectionAdapter[];
  transport: Transport;
  io: PersistIO;
  onSessionInvalid?: () => void;
  now?: () => number;
}

const MAX_BATCH_OPS = 200;
const MAX_BATCH_BYTES = 3_000_000;
const MASS_DELETE_MIN = 8;

const emptyPersisted = (userId: string | null, role: string | null = null): Persisted => ({
  v: 1,
  userId,
  role,
  epoch: null,
  cursor: 0,
  shadow: {},
  blocked: {},
});

const keyOf = (c: string, i: string) => `${c}/${i}`;
const splitKey = (k: string): [string, string] => {
  const n = k.indexOf("/");
  return [k.slice(0, n), k.slice(n + 1)];
};

interface PendingOp {
  key: string;
  c: string;
  i: string;
  t: "u" | "d";
  b: number;
  h: string;
  doc?: Doc;
}

export class SyncEngine {
  private P: Persisted = emptyPersisted(null);
  private snap: SyncSnapshot = {
    phase: "idle",
    pending: 0,
    blocked: 0,
    foreign: 0,
    held: 0,
    lastSyncAt: null,
    ready: false,
  };
  private listeners = new Set<() => void>();
  private running: Promise<void> | null = null;
  private rerun = false;
  private applying = false;
  private force = new Set<string>();
  private needFull = false;
  private allowMass = new Set<string>();
  private adapterMap: Map<string, CollectionAdapter>;
  private errorCount = 0;

  constructor(private deps: EngineDeps) {
    this.adapterMap = new Map(deps.adapters.map((a) => [a.name, a]));
  }

  /* ───────────── status ───────────── */

  getSnapshot = (): SyncSnapshot => this.snap;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private set(patch: Partial<SyncSnapshot>) {
    const next = { ...this.snap, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.snap)) return;
    this.snap = next;
    for (const l of this.listeners) l();
  }
  /** true saat mesin sendiri menulis ke store (agar pemantau perubahan lokal mengabaikannya). */
  isApplying = () => this.applying;
  get userId() {
    return this.P.userId;
  }
  get errorStreak() {
    return this.errorCount;
  }

  /* ───────────── siklus hidup ───────────── */

  private me(): { id: string; role: string } | null {
    return this.P.userId ? { id: this.P.userId, role: this.P.role ?? "user" } : null;
  }

  get role() {
    return this.P.role;
  }

  /** Muat keadaan tersimpan untuk pengguna ini. Keadaan milik pengguna lain dibuang. */
  init(userId: string, role: string): void {
    const loaded = this.deps.io.load();
    this.P = loaded && loaded.v === 1 && loaded.userId === userId ? { ...loaded, role } : emptyPersisted(userId, role);
    this.force.clear();
    this.needFull = false;
    this.allowMass.clear();
    this.set({ ready: true, phase: "idle" });
    this.recount();
  }

  reset(): void {
    this.P = emptyPersisted(null);
    this.deps.io.save(this.P);
    this.set({ ready: false, pending: 0, blocked: 0, foreign: 0, held: 0, phase: "idle", lastSyncAt: null });
  }

  /** Perkiraan jumlah perubahan lokal yang belum terkirim (murah; dipakai pill & konfirmasi keluar). */
  recount(): void {
    if (!this.snap.ready) return;
    const { ops, foreign, held } = this.buildOps();
    this.set({
      pending: ops.length,
      blocked: Object.keys(this.P.blocked).length + held,
      foreign,
      held,
    });
  }

  /** Jalankan satu siklus (tarik → kirim). Panggilan bersamaan digabung. */
  syncNow(): Promise<void> {
    if (!this.snap.ready) return Promise.resolve();
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.rerun = false;
          await this.cycle();
        } while (this.rerun && this.snap.phase !== "auth");
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  /**
   * Pastikan semuanya sudah di server (untuk keluar akun). Mengembalikan sisa yang belum tersimpan:
   * `unsaved` = menunggu/ditolak, `foreign` = milik akun lain (tak bisa diunggah dari akun ini).
   */
  async flush(): Promise<{ ok: boolean; unsaved: number; foreign: number; offline: boolean }> {
    for (let i = 0; i < 4; i++) {
      await this.syncNow();
      this.recount();
      if (this.snap.pending === 0 || this.snap.phase === "offline" || this.snap.phase === "error" || this.snap.phase === "auth") break;
    }
    this.recount();
    const s = this.snap;
    return {
      ok: s.pending === 0 && s.blocked === 0 && s.held === 0 && s.phase === "idle",
      unsaved: s.pending + s.blocked + s.held,
      foreign: s.foreign,
      offline: s.phase === "offline" || s.phase === "error",
    };
  }

  /** Izinkan penghapusan massal yang ditahan, lalu kirim. */
  async allowHeldDeletes(): Promise<void> {
    for (const a of this.deps.adapters) this.allowMass.add(a.name);
    await this.syncNow();
    this.allowMass.clear();
  }

  /** Buang perubahan lokal yang ditolak/ditahan dan pulihkan salinan server. */
  async restoreFromServer(): Promise<void> {
    const { ops, heldKeys } = this.buildOps(true);
    for (const op of ops) if (this.P.shadow[op.key]) this.force.add(op.key);
    for (const k of heldKeys) this.force.add(k);
    for (const k of Object.keys(this.P.blocked)) if (this.P.shadow[k]) this.force.add(k);
    this.P.blocked = {};
    this.needFull = true;
    await this.syncNow();
  }

  /* ───────────── siklus ───────────── */

  private async cycle(): Promise<void> {
    resetHashCache();
    this.set({ phase: "syncing" });
    try {
      await this.pullAll(this.needFull);
      await this.pushAll();
      if (this.needFull) await this.pullAll(true);
      this.errorCount = 0;
      this.set({ phase: "idle", lastSyncAt: (this.deps.now ?? Date.now)() });
    } catch (e) {
      if (e instanceof SyncHttpError && e.status === 401) {
        this.set({ phase: "auth" });
        this.deps.onSessionInvalid?.();
      } else {
        this.errorCount++;
        const offline = !(e instanceof SyncHttpError) || e.status === 0;
        this.set({ phase: offline ? "offline" : "error" });
      }
    } finally {
      this.persist();
      this.recount();
    }
  }

  private persist() {
    try {
      this.deps.io.save(this.P);
    } catch {
      /* penyimpanan penuh: abaikan, siklus berikutnya mencoba lagi */
    }
  }

  /* ───────────── tarik ───────────── */

  private localIndex(): Map<string, Map<string, { doc: Doc; h: string }>> {
    const out = new Map<string, Map<string, { doc: Doc; h: string }>>();
    for (const a of this.deps.adapters) {
      const m = new Map<string, { doc: Doc; h: string }>();
      for (const [id, doc] of a.read()) m.set(id, { doc, h: hashDoc(doc) });
      out.set(a.name, m);
    }
    return out;
  }

  private async pullAll(full: boolean): Promise<void> {
    let since = full ? 0 : this.P.cursor;
    const seen = full ? new Set<string>() : null;
    let restarted = false;
    for (let page = 0; page < 400; page++) {
      const res = await this.deps.transport.pull(since);
      if (this.P.epoch && res.epoch !== this.P.epoch && !restarted) {
        // database dikosongkan/dibuat ulang: anggap semua dokumen lokal belum pernah terkirim
        this.P.epoch = res.epoch;
        this.P.shadow = {};
        this.P.blocked = {};
        this.P.cursor = 0;
        since = 0;
        restarted = true;
        continue;
      }
      if (!this.P.epoch) this.P.epoch = res.epoch;
      this.applyPage(res.docs, seen);
      since = res.seq;
      if (!full) this.P.cursor = res.seq;
      this.persist();
      if (!res.more) break;
    }
    if (full && seen) {
      this.prune(seen);
      this.P.cursor = since;
      this.needFull = false;
    }
  }

  private applyPage(docs: WireDoc[], seen: Set<string> | null): void {
    if (docs.length === 0) return;
    const idx = this.localIndex();
    const ups = new Map<string, Map<string, Doc>>();
    const dels = new Map<string, Set<string>>();
    const up = (c: string, i: string, d: Doc) => {
      if (!ups.has(c)) ups.set(c, new Map());
      ups.get(c)!.set(i, d);
      dels.get(c)?.delete(i);
    };
    const del = (c: string, i: string) => {
      if (!dels.has(c)) dels.set(c, new Set());
      dels.get(c)!.add(i);
      ups.get(c)?.delete(i);
    };

    for (const rd of docs) {
      const adapter = this.adapterMap.get(rd.c);
      if (!adapter) continue;
      const key = keyOf(rd.c, rd.i);
      seen?.add(key);
      const sh = this.P.shadow[key];
      const forced = this.force.has(key);
      if (sh && rd.r <= sh.r && !forced) continue;
      const local = idx.get(rd.c)?.get(rd.i);
      const keepBase = rd.c === "profiles";

      if (rd.x) {
        // Data bawaan (seed) kalah oleh penghapusan di server. Dokumen buatan pengguna yang belum pernah
        // tersinkron, atau diubah setelah tersinkron, dipertahankan dan "dibangkitkan" di siklus kirim berikutnya.
        const unmodified = !local || forced || (sh ? sh.h === local.h : adapter.isSeed?.(rd.i, local.doc) === true);
        if (local && unmodified) del(rd.c, rd.i);
        // bila lokal punya perubahan yang belum terkirim, dokumen "dibangkitkan" pada siklus kirim berikutnya
        this.P.shadow[key] = { r: rd.r, h: TOMB };
        this.force.delete(key);
        if (rd.c === "assignments") this.needFull = true;
        continue;
      }
      const remote = rd.d as Doc;
      const rh = hashDoc(remote);
      if (!local) {
        if (sh && sh.h !== TOMB && !forced) {
          // dihapus lokal (belum terkirim) sementara di server berubah: penghapusan pengguna tetap dikirim
          this.P.shadow[key] = { r: rd.r, h: rh, ...(keepBase ? { b: remote } : {}) };
        } else {
          up(rd.c, rd.i, remote);
          this.P.shadow[key] = { r: rd.r, h: rh, ...(keepBase ? { b: remote } : {}) };
        }
      } else if (local.h === rh) {
        this.P.shadow[key] = { r: rd.r, h: rh, ...(keepBase ? { b: remote } : {}) };
      } else if (forced || (sh && sh.h === local.h)) {
        up(rd.c, rd.i, remote);
        this.P.shadow[key] = { r: rd.r, h: rh, ...(keepBase ? { b: remote } : {}) };
      } else {
        const merged = mergeDoc(rd.c, sh?.b, local.doc, remote);
        if (hashDoc(merged) !== local.h) up(rd.c, rd.i, merged);
        this.P.shadow[key] = { r: rd.r, h: rh, ...(keepBase ? { b: remote } : {}) };
      }
      this.force.delete(key);
      if (rd.c === "assignments") this.needFull = true; // siapa melihat siapa berubah → tarik penuh
    }
    this.writeLocal(ups, dels);
  }

  /** Dokumen yang ada di bayangan tetapi tidak lagi dikirim server (hilang akses) dibuang bila tak diubah lokal. */
  private prune(seen: Set<string>): void {
    const idx = this.localIndex();
    const dels = new Map<string, Set<string>>();
    for (const [key, sh] of Object.entries(this.P.shadow)) {
      if (sh.h === TOMB || seen.has(key)) continue;
      const [c, i] = splitKey(key);
      const local = idx.get(c)?.get(i);
      if (!local) {
        delete this.P.shadow[key];
      } else if (local.h === sh.h) {
        if (!dels.has(c)) dels.set(c, new Set());
        dels.get(c)!.add(i);
        delete this.P.shadow[key];
      } else {
        delete this.P.shadow[key]; // ada perubahan lokal: dikirim ulang sebagai dokumen baru
      }
    }
    this.writeLocal(new Map(), dels);
  }

  private writeLocal(ups: Map<string, Map<string, Doc>>, dels: Map<string, Set<string>>): void {
    const names = new Set([...ups.keys(), ...dels.keys()]);
    if (names.size === 0) return;
    this.applying = true;
    try {
      for (const n of names) this.adapterMap.get(n)?.apply(ups.get(n) ?? new Map(), dels.get(n) ?? new Set());
    } finally {
      this.applying = false;
    }
  }

  /* ───────────── kirim ───────────── */

  private buildOps(ignoreBlocks = false): { ops: PendingOp[]; foreign: number; held: number; heldKeys: string[] } {
    const me = this.me();
    const ops: PendingOp[] = [];
    const heldKeys: string[] = [];
    let foreign = 0;
    let held = 0;
    const shadowByColl = new Map<string, string[]>();
    for (const k of Object.keys(this.P.shadow)) {
      const c = k.slice(0, k.indexOf("/"));
      (shadowByColl.get(c) ?? shadowByColl.set(c, []).get(c)!).push(k);
    }
    const kvCyclePending = (() => {
      const a = this.adapterMap.get("kv");
      if (!a) return false;
      return a.read().some(([id, d]) => id === "feedCycleStartDate" && this.P.shadow[keyOf("kv", id)]?.h !== hashDoc(d));
    })();

    for (const a of this.deps.adapters) {
      const docs = new Map(a.read());
      for (const [id, doc] of docs) {
        const key = keyOf(a.name, id);
        const h = hashDoc(doc);
        const sh = this.P.shadow[key];
        if (sh && sh.h === h) continue;
        const bl = this.P.blocked[key];
        if (!ignoreBlocks && bl && bl.h === h) continue;
        if (!this.mayPush(a, id, doc, sh, me)) {
          if (!a.isSeed?.(id, doc)) foreign++;
          continue;
        }
        ops.push({ key, c: a.name, i: id, t: "u", b: sh ? sh.r : 0, h, doc });
      }
      const dels: PendingOp[] = [];
      for (const key of shadowByColl.get(a.name) ?? []) {
        const sh = this.P.shadow[key];
        const [, id] = splitKey(key);
        if (sh.h === TOMB || docs.has(id)) continue;
        const bl = this.P.blocked[key];
        if (!ignoreBlocks && bl && bl.h === "") continue;
        dels.push({ key, c: a.name, i: id, t: "d", b: sh.r, h: "" });
      }
      if (dels.length) {
        const live = (shadowByColl.get(a.name) ?? []).filter((k) => this.P.shadow[k].h !== TOMB).length;
        const exempt =
          this.allowMass.has(a.name) ||
          (kvCyclePending && (a.name === "feed_posts" || a.name === "chat" || a.name === "reminders"));
        if (!exempt && dels.length >= MASS_DELETE_MIN && dels.length * 2 > live) {
          held += dels.length;
          heldKeys.push(...dels.map((d) => d.key));
        } else ops.push(...dels);
      }
    }
    return { ops, foreign, held, heldKeys };
  }

  private mayPush(a: CollectionAdapter, id: string, doc: Doc, sh: Shadow | undefined, me: { id: string; role: string } | null): boolean {
    if (!me) return false;
    if (a.shouldPush && !a.shouldPush(id, doc, sh !== undefined, me)) return false;
    if (me.role === "admin") return true;
    if (sh) return true; // dokumen yang sudah ada di server: biarkan server yang memutuskan
    const owner = a.ownerOf?.(id, doc) ?? null;
    if (owner && owner !== me.id && (a.ownerOnly || me.role !== "supervisor")) return false;
    return true;
  }

  private async pushAll(): Promise<void> {
    for (let round = 0; round < 6; round++) {
      const { ops } = this.buildOps();
      if (ops.length === 0) return;
      let progressed = false;
      let i = 0;
      while (i < ops.length) {
        const batch: PendingOp[] = [];
        let bytes = 0;
        while (i < ops.length && batch.length < MAX_BATCH_OPS) {
          const size = ops[i].doc ? JSON.stringify(ops[i].doc).length + 120 : 160;
          if (batch.length > 0 && bytes + size > MAX_BATCH_BYTES) break;
          batch.push(ops[i]);
          bytes += size;
          i++;
        }
        const wire: WireOp[] = batch.map((o) => ({ c: o.c, i: o.i, t: o.t, b: o.b, ...(o.doc ? { d: o.doc } : {}) }));
        const res = await this.deps.transport.push(wire);
        if (this.P.epoch && res.epoch && res.epoch !== this.P.epoch) {
          // database berganti di tengah jalan: ulangi dari awal pada siklus berikutnya
          this.P.epoch = res.epoch;
          this.P.shadow = {};
          this.P.blocked = {};
          this.P.cursor = 0;
          this.needFull = true;
          return;
        }
        if (this.applyResults(batch, res.results)) progressed = true;
        this.persist();
      }
      if (!progressed && round > 0) return;
    }
  }

  /** @returns true bila ada kemajuan (minimal satu op diterima/diselesaikan). */
  private applyResults(batch: PendingOp[], results: WireResult[]): boolean {
    let progressed = false;
    const ups = new Map<string, Map<string, Doc>>();
    const dels = new Map<string, Set<string>>();
    const idx = this.localIndex();
    for (let n = 0; n < batch.length; n++) {
      const op = batch[n];
      const res = results[n];
      if (!res) continue;
      const keepBase = op.c === "profiles";
      switch (res.s) {
        case "ok": {
          const r = res.r ?? op.b + 1;
          this.P.shadow[op.key] =
            op.t === "d" ? { r, h: TOMB } : { r, h: op.h, ...(keepBase && op.doc ? { b: op.doc } : {}) };
          delete this.P.blocked[op.key];
          if (op.c === "assignments") this.needFull = true;
          progressed = true;
          break;
        }
        case "conflict": {
          const r = res.r ?? op.b + 1;
          if (res.x || !res.d) {
            this.P.shadow[op.key] = { r, h: TOMB };
          } else if (op.t === "d") {
            // penghapusan pengguna menang atas perubahan dari perangkat lain
            this.P.shadow[op.key] = { r, h: hashDoc(res.d), ...(keepBase ? { b: res.d } : {}) };
          } else {
            const local = idx.get(op.c)?.get(op.i)?.doc;
            const sh = this.P.shadow[op.key];
            // Respons kiriman sebelumnya hilang lalu dikirim ulang: server sudah memuat perubahan kita → jangan digabung lagi
            if (local && hashDoc(local) !== hashDoc(res.d)) {
              const merged = mergeDoc(op.c, sh?.b, local, res.d);
              if (hashDoc(merged) !== hashDoc(local)) {
                if (!ups.has(op.c)) ups.set(op.c, new Map());
                ups.get(op.c)!.set(op.i, merged);
              }
            } // sudah dihapus lokal saat pengiriman berjalan: penghapusan dikirim di putaran berikutnya
            this.P.shadow[op.key] = { r, h: hashDoc(res.d), ...(keepBase ? { b: res.d } : {}) };
          }
          progressed = true;
          break;
        }
        case "denied": {
          const sh = this.P.shadow[op.key];
          if (sh && sh.h !== TOMB) {
            // dokumen ini ada di server dan kita tak berhak mengubahnya: kembalikan ke versi server
            this.force.add(op.key);
            this.needFull = true;
            delete this.P.blocked[op.key];
          } else {
            this.P.blocked[op.key] = { h: op.h, reason: "denied", m: res.m };
          }
          break;
        }
        default:
          this.P.blocked[op.key] = { h: op.h, reason: "invalid", m: res.m };
      }
    }
    this.writeLocal(ups, dels);
    return progressed;
  }
}

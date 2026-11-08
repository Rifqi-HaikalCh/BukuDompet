"use client";

/**
 * Penghubung sisi-browser: transport ke /api/*, penyimpanan keadaan sinkron, siklus otomatis
 * (polling + fokus + online + perubahan lokal), login/boot sesi, dan keluar akun yang aman.
 */

import { useSyncExternalStore } from "react";
import { useBukuDompetStore } from "@/store/useBukuDompetStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import {
  SyncEngine,
  SyncHttpError,
  type Persisted,
  type PullResponse,
  type PushResponse,
  type SyncSnapshot,
  type WireOp,
} from "./engine";
import { ADAPTERS, syncedSlicesChanged } from "./schema";
import { getSessionUser, setSessionUser, type SessionUser } from "./session-ref";

export type { SessionUser } from "./session-ref";
export { getSessionUser } from "./session-ref";

const STORAGE_KEY = "bukudompet-sync-v1";
const ENDED_FLAG = "bd-session-ended";

/* ───────────── jaringan ───────────── */

interface ApiResult<T> {
  status: number;
  json: T | null;
}

async function api<T>(path: string, body?: unknown, timeoutMs = 25_000): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal: ctl.signal,
    });
    let json: T | null = null;
    try {
      json = (await res.json()) as T;
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch {
    throw new TypeError("offline"); // gagal tersambung / timeout → dianggap offline
  } finally {
    window.clearTimeout(timer);
  }
}

async function syncCall<T>(path: string, body: unknown): Promise<T> {
  const r = await api<T>(path, body);
  if (r.status === 401) throw new SyncHttpError(401, "session_invalid");
  if (r.status < 200 || r.status >= 300 || !r.json) throw new SyncHttpError(r.status);
  return r.json;
}

/* ───────────── penyimpanan keadaan sinkron ───────────── */

function loadPersisted(): Persisted | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}
function savePersisted(p: Persisted): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* penuh / diblokir: abaikan */
  }
}

/* ───────────── mesin tunggal ───────────── */

let engine: SyncEngine | null = null;

export function getEngine(): SyncEngine {
  if (!engine) {
    engine = new SyncEngine({
      adapters: ADAPTERS,
      transport: {
        pull: (since) => syncCall<PullResponse>("/api/sync/pull", { since }),
        push: (ops: WireOp[]) => syncCall<PushResponse>("/api/sync/push", { ops }),
      },
      io: { load: loadPersisted, save: savePersisted },
      onSessionInvalid: handleSessionInvalid,
    });
  }
  return engine;
}

const SERVER_SNAPSHOT: SyncSnapshot = {
  phase: "idle",
  pending: 0,
  blocked: 0,
  foreign: 0,
  held: 0,
  lastSyncAt: null,
  ready: false,
  failStreak: 0,
};

/* ───────────── status sambungan akun ke server ─────────────
 * "unbound" = aplikasi terbuka tetapi server TIDAK bisa memastikan siapa penggunanya (server galat / offline)
 * dan perangkat belum punya identitas sinkron. Dalam keadaan ini perubahan hanya tersimpan di perangkat;
 * UI wajib menampilkannya dengan jujur dan mencoba menyambung ulang sendiri. */

export interface BindState {
  status: "unknown" | "bound" | "unbound";
  reason?: "offline" | "server";
  code?: string;
}
const BIND_UNKNOWN: BindState = { status: "unknown" };
let bind: BindState = BIND_UNKNOWN;
const bindListeners = new Set<() => void>();
function setBind(next: BindState): void {
  if (next.status === bind.status && next.reason === bind.reason && next.code === bind.code) return;
  bind = next;
  for (const l of bindListeners) l();
}
export function useBindState(): BindState {
  return useSyncExternalStore(
    (fn) => {
      bindListeners.add(fn);
      return () => bindListeners.delete(fn);
    },
    () => bind,
    () => BIND_UNKNOWN,
  );
}

let bootRetryTimer: number | undefined;
function scheduleBootRetry(): void {
  if (typeof window === "undefined") return;
  window.clearTimeout(bootRetryTimer);
  bootRetryTimer = window.setTimeout(() => {
    if (!useBukuDompetStore.getState().isLoggedIn || bind.status === "bound") return;
    lastBootOk = 0;
    void bootSession();
  }, 15_000);
}
function cancelBootRetry(): void {
  if (typeof window !== "undefined") window.clearTimeout(bootRetryTimer);
}
/** Tombol "Sambungkan sekarang": coba verifikasi sesi lagi tanpa menunggu pengatur waktu. */
export async function retryBind(): Promise<void> {
  lastBootOk = 0;
  await bootSession();
}

/** Status sinkron untuk UI (pill). */
export function useSyncSnapshot(): SyncSnapshot {
  return useSyncExternalStore(
    (fn) => getEngine().subscribe(fn),
    () => getEngine().getSnapshot(),
    () => SERVER_SNAPSHOT,
  );
}

/* ───────────── data lokal ───────────── */

/** Kembalikan kedua store ke keadaan awal (profil bawaan, tanpa catatan). Daftar kartu profil perangkat dipertahankan. */
export function wipeLocalData(): void {
  const main = useBukuDompetStore;
  const keepSaved = main.getState().savedProfileIds;
  main.setState({ ...main.getInitialState(), savedProfileIds: keepSaved, isLoggedIn: false }, true);
  useFamilyStore.setState(useFamilyStore.getInitialState(), true);
}

/* ───────────── siklus otomatis ───────────── */

let stopAuto: (() => void) | null = null;

export function startAutoSync(): void {
  if (stopAuto || typeof window === "undefined") return;
  const eng = getEngine();
  let poll: number | undefined;
  let kickTimer: number | undefined;
  let countTimer: number | undefined;
  let alive = true;

  const delay = () =>
    document.visibilityState === "visible" ? Math.min(60_000, 12_000 * 2 ** Math.min(eng.errorStreak, 3)) : 60_000;
  const loop = () => {
    poll = window.setTimeout(async () => {
      if (!alive) return;
      if (navigator.onLine !== false) await eng.syncNow();
      if (alive) loop();
    }, delay());
  };
  const kick = (ms = 500) => {
    window.clearTimeout(kickTimer);
    kickTimer = window.setTimeout(() => void eng.syncNow(), ms);
  };
  const onLocalChange = () => {
    if (eng.isApplying()) return; // perubahan dari server sendiri
    window.clearTimeout(countTimer);
    countTimer = window.setTimeout(() => eng.recount(), 120);
    kick(600);
  };

  const slices = syncedSlicesChanged();
  const unsubMain = useBukuDompetStore.subscribe((s, prev) => {
    if (slices.main.some((k) => s[k] !== prev[k])) onLocalChange();
  });
  const unsubFam = useFamilyStore.subscribe((s, prev) => {
    if (slices.fam.some((k) => s[k] !== prev[k])) onLocalChange();
  });
  const onOnline = () => kick(100);
  const onVisible = () => {
    if (document.visibilityState === "visible") kick(100);
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  loop();
  kick(0);

  stopAuto = () => {
    alive = false;
    window.clearTimeout(poll);
    window.clearTimeout(kickTimer);
    window.clearTimeout(countTimer);
    unsubMain();
    unsubFam();
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    stopAuto = null;
  };
}

export function stopAutoSync(): void {
  stopAuto?.();
}

/** Sesi dicabut server (PIN diganti / akun dinonaktifkan): berhenti sinkron, kembali ke layar masuk. Data lokal tetap utuh. */
function handleSessionInvalid(): void {
  cancelBootRetry();
  setBind(BIND_UNKNOWN);
  stopAutoSync();
  setSessionUser(null);
  try {
    window.sessionStorage.setItem(ENDED_FLAG, "1");
  } catch {
    /* abaikan */
  }
  useBukuDompetStore.getState().logout();
}

export function consumeSessionEndedFlag(): boolean {
  try {
    const v = window.sessionStorage.getItem(ENDED_FLAG) === "1";
    window.sessionStorage.removeItem(ENDED_FLAG);
    return v;
  } catch {
    return false;
  }
}

/* ───────────── masuk ───────────── */

export interface Candidate {
  id: string;
  username: string;
  display_name: string;
  role: SessionUser["role"];
}

export async function lookupAccounts(name: string): Promise<{ ok: true; candidates: Candidate[] } | { ok: false; reason: "offline" | "error"; code?: string }> {
  try {
    const r = await api<{ candidates?: Candidate[]; code?: string }>("/api/auth/lookup", { name }, 10_000);
    if (r.status !== 200 || !r.json) return { ok: false, reason: "error", code: r.json?.code };
    return { ok: true, candidates: r.json.candidates ?? [] };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

export type LoginOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" | "locked" | "rate" | "offline" | "server_not_configured" | "server_error"; attemptsLeft?: number; retryAfter?: number; code?: string };

export async function serverLogin(args: { id?: string; username?: string; pin: string }): Promise<LoginOutcome> {
  try {
    const r = await api<{
      ok: boolean;
      reason?: string;
      attempts_left?: number;
      retry_after?: number;
      user?: SessionUser;
      code?: string;
    }>("/api/auth/login", args, 15_000);
    if (r.json?.ok && r.json.user) return { ok: true, user: r.json.user };
    const reason = r.json?.reason;
    if (reason === "invalid" || reason === "locked" || reason === "rate" || reason === "server_not_configured") {
      return { ok: false, reason, attemptsLeft: r.json?.attempts_left, retryAfter: r.json?.retry_after, code: r.json?.code };
    }
    return { ok: false, reason: "server_error", code: r.json?.code };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

export type StartResult =
  | { ok: true; targetPath: string }
  | { ok: false; reason: "needs_confirm"; unsaved: number };

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Pasang sesi setelah server menerima PIN: siapkan data lokal, sinkron awal (maks. ±8 dtk), nyalakan sinkron otomatis.
 * Bila perangkat masih menyimpan perubahan akun LAIN yang belum tersimpan, minta konfirmasi dulu (jangan hilang diam-diam).
 */
export async function startSession(user: SessionUser, opts: { discardOther?: boolean } = {}): Promise<StartResult> {
  const eng = getEngine();
  const persisted = loadPersisted();
  if (persisted?.userId && persisted.userId !== user.id) {
    eng.init(persisted.userId, persisted.role ?? "user");
    eng.recount();
    const s = eng.getSnapshot();
    const unsaved = s.pending + s.blocked + s.held + s.foreign;
    if (unsaved > 0 && !opts.discardOther) return { ok: false, reason: "needs_confirm", unsaved };
    stopAutoSync();
    wipeLocalData();
    eng.reset();
  }
  setSessionUser(user);
  const res = useBukuDompetStore.getState().signInVerifiedUser(user);
  eng.init(user.id, user.role);
  setBind({ status: "bound" });
  startAutoSync();
  await Promise.race([eng.syncNow(), wait(8_000)]);
  return { ok: true, targetPath: res.targetPath };
}

/* ───────────── buka aplikasi (sesi sudah ada) ───────────── */

export type BootResult = "ok" | "offline" | "expired";
let lastBootOk = 0;

/**
 * Dipanggil saat halaman ber-sesi dibuka. 401 → sesi habis (kembali ke layar masuk, data lokal utuh);
 * jaringan putus → tetap bekerja lokal dengan identitas terakhir yang sah.
 */
export async function bootSession(): Promise<BootResult> {
  const eng = getEngine();
  if (getSessionUser() && eng.getSnapshot().ready && Date.now() - lastBootOk < 60_000) return "ok";

  let user: SessionUser | null = null;
  let failure: BindState["reason"] = undefined;
  let failCode: string | undefined;
  try {
    const r = await api<{ ok: boolean; user?: SessionUser; code?: string }>("/api/auth/me", undefined, 6_000);
    if (r.status === 401) {
      handleSessionInvalid();
      return "expired";
    }
    if (r.status === 200 && r.json?.ok && r.json.user) user = r.json.user;
    else {
      failure = "server"; // server menjawab tetapi gagal (mis. 503): BUKAN sesi habis
      failCode = r.json?.code;
    }
  } catch {
    failure = "offline"; // offline: lanjut dengan identitas tersimpan bila ada
  }

  const persisted = loadPersisted();
  if (user) {
    if (persisted?.userId && persisted.userId !== user.id) {
      // cookie milik akun lain daripada data di perangkat ini: minta masuk ulang agar tidak tercampur
      handleSessionInvalid();
      return "expired";
    }
    setSessionUser(user);
    eng.init(user.id, user.role);
    setBind({ status: "bound" });
    cancelBootRetry();
    startAutoSync();
    lastBootOk = Date.now();
    return "ok";
  }

  // Tidak bisa memverifikasi (offline / server bermasalah): pakai identitas terakhir yang sah dari sinkron.
  const st = useBukuDompetStore.getState();
  const prof = persisted?.userId
    ? st.profiles.find((p) => p.id === persisted.userId)
    : undefined;
  if (prof) {
    setSessionUser({ id: prof.id, username: prof.username, display_name: prof.display_name, role: prof.role });
    eng.init(prof.id, persisted?.role ?? prof.role);
    setBind({ status: "bound" }); // status sinkron selanjutnya dilaporkan jujur oleh mesin (offline/galat/sesi berakhir)
    startAutoSync();
  } else {
    // Tidak ada identitas sinkron di perangkat ini dan server belum bisa memastikan sesi: JANGAN diam-diam
    // menyimpan lokal saja. Tampilkan peringatan merah dan coba menyambung ulang sendiri.
    setBind({ status: "unbound", reason: failure ?? "server", code: failCode });
    scheduleBootRetry();
  }
  return "offline";
}

/* ───────────── keluar ───────────── */

export type LogoutOutcome =
  | { done: true }
  | { done: false; unsaved: number; foreign: number; offline: boolean };

/**
 * Keluar akun TANPA kehilangan data: kirim dulu semua perubahan. Bila ada yang belum bisa tersimpan
 * (offline / ditolak / milik akun lain), jangan hapus apa pun kecuali pengguna memaksa (`force`).
 */
export async function logoutSafely(opts: { force?: boolean } = {}): Promise<LogoutOutcome> {
  const eng = getEngine();
  if (eng.getSnapshot().ready) {
    const r = await eng.flush();
    if ((!r.ok || r.foreign > 0) && !opts.force) {
      return { done: false, unsaved: r.unsaved, foreign: r.foreign, offline: r.offline };
    }
  } else if (!opts.force) {
    // Belum bisa memastikan apa pun sudah di server (mis. dibuka offline): jangan hapus data tanpa persetujuan.
    return { done: false, unsaved: 0, foreign: 0, offline: true };
  }
  stopAutoSync();
  try {
    await api("/api/auth/logout", {}, 6_000);
  } catch {
    /* offline: cookie kedaluwarsa sendiri; layar masuk tetap meminta PIN */
  }
  setSessionUser(null);
  wipeLocalData();
  eng.reset();
  lastBootOk = 0;
  cancelBootRetry();
  setBind(BIND_UNKNOWN);
  return { done: true };
}

/** Batalkan sesi server tanpa menyentuh data lokal (mis. pengguna membatalkan masuk setelah PIN diterima). */
export async function dropServerSession(): Promise<void> {
  try {
    await api("/api/auth/logout", {}, 6_000);
  } catch {
    /* abaikan */
  }
}

/** Admin: buat akun di server (PIN di-hash di database). */
export async function adminCreateAccount(a: {
  username: string;
  display_name: string;
  role: SessionUser["role"];
  pin: string;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  try {
    const r = await api<{ ok: boolean; id?: string; reason?: string; error?: string }>("/api/admin/accounts", a, 15_000);
    if (r.json?.ok && r.json.id) return { ok: true, id: r.json.id };
    return { ok: false, reason: r.json?.reason ?? r.json?.error ?? "server_error" };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

/** Admin: ganti PIN akun (semua sesi akun itu langsung berakhir). */
export async function adminSetPin(target: string, pin: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const r = await api<{ ok: boolean; reason?: string; error?: string }>("/api/admin/pin", { target, pin }, 15_000);
    return { ok: Boolean(r.json?.ok), reason: r.json?.reason ?? r.json?.error };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

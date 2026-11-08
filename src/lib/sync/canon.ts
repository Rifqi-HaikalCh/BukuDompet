/**
 * Utilitas murni untuk sinkronisasi: JSON kanonik, hash dokumen, dan merge 3-arah.
 * Tanpa dependensi browser/React agar bisa diuji di Node.
 */

export type Doc = Record<string, unknown>;

export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** JSON kanonik: kunci terurut, `undefined` dibuang, sama seperti hasil JSON.stringify → JSON.parse. */
export function canon(v: unknown): string {
  if (v === undefined) return "u";
  if (v === null) return "null";
  switch (typeof v) {
    case "number":
      return Number.isFinite(v) ? String(v) : "null";
    case "string":
      return JSON.stringify(v);
    case "boolean":
      return v ? "true" : "false";
    case "object": {
      if (Array.isArray(v)) {
        let out = "[";
        for (let i = 0; i < v.length; i++) {
          if (i) out += ",";
          out += v[i] === undefined || typeof v[i] === "function" ? "null" : canon(v[i]);
        }
        return out + "]";
      }
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o).sort();
      let out = "{";
      let first = true;
      for (const k of keys) {
        const val = o[k];
        if (val === undefined || typeof val === "function") continue;
        if (!first) out += ",";
        first = false;
        out += JSON.stringify(k) + ":" + canon(val);
      }
      return out + "}";
    }
    default:
      return "null";
  }
}

/** cyrb53: hash 53-bit cepat tanpa dependensi. */
function cyrb53(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

let hashCache = new WeakMap<object, string>();

/** Hapus cache identitas (dipanggil tiap siklus agar mutasi-di-tempat yang tak sengaja pun tertangkap). */
export function resetHashCache(): void {
  hashCache = new WeakMap();
}

export function hashDoc(d: object): string {
  const hit = hashCache.get(d);
  if (hit) return hit;
  const s = canon(d);
  const h = cyrb53(s).toString(36) + "." + s.length.toString(36);
  hashCache.set(d, h);
  return h;
}

export const eq = (a: unknown, b: unknown): boolean => a === b || canon(a) === canon(b);

/** Gabungkan dua array tanpa duplikat: elemen ber-`id` disatukan per id (versi lokal didahulukan). */
export function unionArrays(local: unknown[], remote: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  const keyOf = (x: unknown) => (isObj(x) && typeof x.id === "string" ? "id:" + x.id : "c:" + canon(x));
  for (const x of [...local, ...remote]) {
    const k = keyOf(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

export interface MergeOpts {
  /** Field angka yang digabung sebagai selisih: remote + (lokal − basis). */
  delta: ReadonlySet<string>;
  /** Field angka yang selalu mengambil nilai terbesar. */
  max: ReadonlySet<string>;
}

const NONE: MergeOpts = { delta: new Set(), max: new Set() };

/**
 * Merge 3-arah: bagian yang hanya diubah satu sisi dipakai apa adanya; bila keduanya mengubah,
 * objek digabung per-kunci, array disatukan, angka mengikuti aturan delta/max, sisanya lokal menang
 * (aksi terakhir pengguna di perangkat ini).
 */
export function merge3(base: unknown, local: unknown, remote: unknown, o: MergeOpts = NONE, key = ""): unknown {
  // Delta didahulukan: dua perangkat yang sama-sama +50 menghasilkan nilai sama (550) padahal ada DUA kejadian.
  if (
    o.delta.has(key) &&
    typeof base === "number" &&
    typeof local === "number" &&
    typeof remote === "number" &&
    local !== base &&
    remote !== base
  ) {
    return remote + (local - base);
  }
  if (eq(local, remote)) return local;
  if (base !== undefined && eq(local, base)) return remote;
  if (base !== undefined && eq(remote, base)) return local;
  if (typeof local === "number" && typeof remote === "number") {
    if (o.delta.has(key)) return typeof base === "number" ? remote + (local - base) : Math.max(local, remote);
    if (o.max.has(key)) return Math.max(local, remote);
    return local;
  }
  if (Array.isArray(local) && Array.isArray(remote)) return unionArrays(local, remote);
  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : undefined;
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(b?.[k], local[k], remote[k], o, k);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local === undefined ? remote : local;
}

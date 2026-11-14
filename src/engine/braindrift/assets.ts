// Fetching and decoding the shipped files in public/braindrift/. Works offline (all files are local).
import type { BrainDriftMeta } from './result'

/** Crop shape of every volume: [176, 176, 208] uint8, C order, LIA (axis 0 -> patient left, 1 -> inferior, 2 -> anterior). */
export const NI = 176
export const NJ = 176
export const NK = 208
export const NVOX = NI * NJ * NK

let base = `${import.meta.env.BASE_URL}braindrift/`

/** Override where the module's files live (default: "<app base>braindrift/"). */
export function setAssetBase(url: string) {
  base = url.endsWith('/') ? url : `${url}/`
}
export function assetPath(rel: string): string {
  return base + rel
}
export function assetUrl(rel: string): string {
  return new URL(assetPath(rel), document.baseURI).href
}

/** Gunzips with DecompressionStream when the bytes start with the gzip magic (a dev server may already have decoded them). */
export async function maybeGunzip(buf: Uint8Array): Promise<Uint8Array> {
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return buf
}

export async function fetchBytes(rel: string): Promise<Uint8Array> {
  const res = await fetch(assetUrl(rel))
  if (!res.ok) throw new Error(`braindrift: ${rel} -> HTTP ${res.status}`)
  return maybeGunzip(new Uint8Array(await res.arrayBuffer()))
}

/** A [176,176,208] uint8 volume (crop or segmentation). Throws on a wrong size. */
export async function fetchVolume(rel: string): Promise<Uint8Array> {
  const v = await fetchBytes(rel)
  if (v.length !== NVOX) throw new Error(`braindrift: ${rel} has ${v.length} bytes, expected ${NVOX}`)
  return v
}

export async function fetchF32(rel: string): Promise<Float32Array> {
  const b = await fetchBytes(rel)
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4)
}

let metaPromise: Promise<BrainDriftMeta> | null = null
export function fetchMeta(): Promise<BrainDriftMeta> {
  if (!metaPromise) {
    metaPromise = fetch(assetUrl('meta/braindrift.json')).then((r) => {
      if (!r.ok) throw new Error(`braindrift: meta -> HTTP ${r.status}`)
      return r.json() as Promise<BrainDriftMeta>
    })
    metaPromise.catch(() => (metaPromise = null))
  }
  return metaPromise
}

/** Flat index of voxel (i, j, k) in a C-order [176,176,208] array. */
export function vox(i: number, j: number, k: number): number {
  return (i * NJ + j) * NK + k
}

/** Accepts a user-supplied crop: raw or gzipped bytes of exactly 176*176*208 uint8 (the shipped .u8 / .u8.gz format). */
export async function volumeFromBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const v = await maybeGunzip(bytes)
  if (v.length !== NVOX) {
    throw new Error(
      `braindrift: expected a skull-stripped 1 mm crop of 176x176x208 uint8 voxels (${NVOX} bytes, LIA, C order); got ${v.length}`,
    )
  }
  return v
}

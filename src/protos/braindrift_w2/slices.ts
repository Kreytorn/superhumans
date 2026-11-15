// Canvas painting of real MRI slices and Model B maps (coronal view, radiological convention from engine views.ts).
import { NI, NJ, NK } from '../../engine/braindrift'

export type Rgb = [number, number, number]
export const CLASS_RGB: Rgb[] = [
  [0, 0, 0],
  [92, 214, 255], // ventricles (fluid spaces)
  [205, 218, 236], // cerebral white matter
  [108, 128, 214], // cerebral cortex
  [232, 164, 92], // deep grey matter and other
  [96, 206, 170], // cerebellum and brainstem
]

const idx = (i: number, j: number, k: number) => (i * NJ + j) * NK + k

export interface PaintOpts {
  /** 0 = only the fluid spaces in colour, 1 = full 6-class map */
  map?: number
  /** strength of the MRI (0-1) */
  gain?: number
  /** pre-flight segmentation: voxels that are ventricle now and were not before are drawn white */
  preSeg?: Uint8Array | null
  /** alpha for background voxels */
  bgAlpha?: number
}

/** Paints coronal slice k into an ImageData of NI x NJ (x = patient left on the image left). */
export function paintCoronal(img: ImageData, vol: Uint8Array, seg: Uint8Array | null, k: number, o: PaintOpts = {}) {
  const d = img.data
  const map = o.map ?? 0
  const gain = o.gain ?? 1
  const bgA = o.bgAlpha ?? 0
  for (let y = 0; y < NJ; y++) {
    for (let x = 0; x < NI; x++) {
      const i = NI - 1 - x
      const v = idx(i, y, k)
      const g = vol[v] * gain
      const p = (y * NI + x) * 4
      // cool clinical tint
      let r = g * 0.84
      let gg = g * 0.93
      let b = Math.min(255, g * 1.04 + 6)
      let a = 255
      const c = seg ? seg[v] : 0
      if (c === 1) {
        const [cr, cg, cb] = CLASS_RGB[1]
        const m = 0.78
        r = r * (1 - m) + cr * m
        gg = gg * (1 - m) + cg * m
        b = b * (1 - m) + cb * m
        if (o.preSeg && o.preSeg[v] !== 1) {
          r = 255
          gg = 255
          b = 255
        }
      } else if (c > 1 && map > 0) {
        const [cr, cg, cb] = CLASS_RGB[c]
        const m = 0.42 * map
        r = r * (1 - m) + cr * m
        gg = gg * (1 - m) + cg * m
        b = b * (1 - m) + cb * m
      }
      if (vol[v] < 4 && c === 0) a = Math.round(255 * bgA)
      d[p] = r
      d[p + 1] = gg
      d[p + 2] = b
      d[p + 3] = a
    }
  }
}

/** Highest brain row (smallest j) per image column x on slice k, or -1. */
export function topRows(seg: Uint8Array, k: number): Int16Array {
  const out = new Int16Array(NI).fill(-1)
  for (let x = 0; x < NI; x++) {
    const i = NI - 1 - x
    for (let j = 0; j < NJ; j++) {
      if (seg[idx(i, j, k)] > 0) {
        out[x] = j
        break
      }
    }
  }
  return out
}

/** Slice with the most ventricle voxels. */
export function busiestSlice(seg: Uint8Array): number {
  const n = new Int32Array(NK)
  for (let p = 0; p < NI * NJ; p++) {
    const b = p * NK
    for (let k = 0; k < NK; k++) if (seg[b + k] === 1) n[k]++
  }
  let best = 0
  for (let k = 1; k < NK; k++) if (n[k] > n[best]) best = k
  return best
}

/** Paints sagittal slice i into an ImageData of NK x NJ (anterior on the image left, superior at the top). */
export function paintSagittal(img: ImageData, vol: Uint8Array, seg: Uint8Array | null, i: number, preSeg: Uint8Array | null = null) {
  const d = img.data
  for (let y = 0; y < NJ; y++) {
    for (let x = 0; x < NK; x++) {
      const k = NK - 1 - x
      const v = idx(i, y, k)
      const g = Math.min(255, vol[v] * 1.15)
      const p = (y * NK + x) * 4
      let r = g * 0.84
      let gg = g * 0.93
      let b = Math.min(255, g * 1.04 + 6)
      const c = seg ? seg[v] : 0
      if (c === 1) {
        const m = 0.8
        r = r * (1 - m) + 92 * m
        gg = gg * (1 - m) + 214 * m
        b = b * (1 - m) + 255 * m
        if (preSeg && preSeg[v] !== 1) {
          r = 255
          gg = 255
          b = 255
        }
      }
      d[p] = r
      d[p + 1] = gg
      d[p + 2] = b
      d[p + 3] = vol[v] < 4 && c === 0 ? 0 : 255
    }
  }
}

/** Top brain row per sagittal image column (x = anterior on the left), or -1. */
export function topRowsSagittal(seg: Uint8Array, i: number): Int16Array {
  const out = new Int16Array(NK).fill(-1)
  for (let x = 0; x < NK; x++) {
    const k = NK - 1 - x
    for (let j = 0; j < NJ; j++) {
      if (seg[idx(i, j, k)] > 0) {
        out[x] = j
        break
      }
    }
  }
  return out
}

/** Sagittal plane (i) near the middle with the most ventricle voxels, and that plane's ventricle centroid in image px. */
export function busiestSagittal(seg: Uint8Array): { i: number; cx: number; cy: number } {
  let best = 88
  let bestN = -1
  for (let i = 66; i <= 110; i++) {
    let n = 0
    for (let j = 0; j < NJ; j++) for (let k = 0; k < NK; k++) if (seg[idx(i, j, k)] === 1) n++
    if (n > bestN) {
      bestN = n
      best = i
    }
  }
  let sx = 0
  let sy = 0
  let n = 0
  for (let j = 0; j < NJ; j++)
    for (let k = 0; k < NK; k++)
      if (seg[idx(best, j, k)] === 1) {
        sx += NK - 1 - k
        sy += j
        n++
      }
  return { i: best, cx: n ? sx / n : NK / 2, cy: n ? sy / n : NJ / 2 }
}

/** Coronal slices that contain brain. */
export function brainRange(vol: Uint8Array): [number, number] {
  const has = new Uint8Array(NK)
  for (let p = 0; p < NI * NJ; p++) {
    const b = p * NK
    for (let k = 0; k < NK; k++) if (vol[b + k] > 8) has[k] = 1
  }
  let k0 = 0
  let k1 = NK - 1
  while (k0 < NK - 1 && !has[k0]) k0++
  while (k1 > 0 && !has[k1]) k1--
  return [k0, k1]
}

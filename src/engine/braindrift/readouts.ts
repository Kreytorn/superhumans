// Readouts from Model B's output, exact ports of plan 05 section 4 / bd_flight.py:
//   ventricle mL = count(argmax = 1) x 1 mm3 / 1000;  change % = (post / pre - 1) x 100 (0 when both 0);
//   vertex rise = mean over columns within 10 mm (horizontal) of the pre scan's highest point of (pre top - post top).
import { NI, NK, NVOX } from './assets'

export const COL_RADIUS_MM = 10

/** Voxel counts per class (index 0-5) and per coronal slice for the ventricles. */
export function classCounts(seg: Uint8Array): { perClass: number[]; ventriclePerSlice: Int32Array } {
  const perClass = [0, 0, 0, 0, 0, 0]
  const ventriclePerSlice = new Int32Array(NK)
  for (let v = 0; v < NVOX; v++) {
    const c = seg[v]
    perClass[c]++
    if (c === 1) ventriclePerSlice[v % NK]++
  }
  return { perClass, ventriclePerSlice }
}

/** bd_flight.change_pct: identical counts give exactly 0 (also both 0); a change from 0 is undefined (null). */
export function changePct(post: number, pre: number): number | null {
  if (pre > 0) return (post / pre - 1) * 100
  return post === 0 ? 0 : null
}

/** Highest point of the top surface (smallest j); first in (i, k) row-major order on ties, like numpy nanargmin. */
export function highestPoint(top: Float64Array): { i: number; k: number; j: number } | null {
  let best = Infinity
  let at = -1
  for (let q = 0; q < top.length; q++) {
    const y = top[q]
    if (!Number.isNaN(y) && y < best) {
      best = y
      at = q
    }
  }
  if (at < 0) return null
  return { i: Math.floor(at / NK), k: at % NK, j: best }
}

/** Columns (i, k) within 10 mm of the pre scan's highest point that have a surface; 1 = used. */
export function columnsNearTop(topPre: Float64Array): Uint8Array | null {
  const h = highestPoint(topPre)
  if (!h) return null
  const cols = new Uint8Array(NI * NK)
  for (let i = 0; i < NI; i++) {
    for (let k = 0; k < NK; k++) {
      const d2 = (i - h.i) ** 2 + (k - h.k) ** 2
      if (d2 <= COL_RADIUS_MM * COL_RADIUS_MM && !Number.isNaN(topPre[i * NK + k])) cols[i * NK + k] = 1
    }
  }
  return cols
}

export function measuredRise(
  topPre: Float64Array,
  topPost: Float64Array,
  cols: Uint8Array | null,
): { mm: number | null; columns: number } {
  if (!cols) return { mm: null, columns: 0 }
  let s = 0
  let n = 0
  for (let q = 0; q < cols.length; q++) {
    if (cols[q] && !Number.isNaN(topPost[q])) {
      s += topPre[q] - topPost[q]
      n++
    }
  }
  return n ? { mm: s / n, columns: n } : { mm: null, columns: 0 }
}

/** Percent of a sorted reference at or below x (the bd_pvs.json percentile definition). */
export function percentileAtOrBelow(sorted: number[], x: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (sorted[m] <= x) lo = m + 1
    else hi = m
  }
  return (100 * lo) / sorted.length
}

/** Number of voxels where two segmentations differ. */
export function countDiff(a: Uint8Array, b: Uint8Array): number {
  let n = 0
  for (let v = 0; v < a.length; v++) if (a[v] !== b[v]) n++
  return n
}

/** 1 voxel = 1 mm3 = 0.001 mL. */
export const VOXEL_ML = 1 / 1000

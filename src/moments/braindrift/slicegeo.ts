// Pure 2D helpers for the slice view: where the brain sits, how the MRI is windowed, and the outlines of the model's
// maps on one coronal slice. Image coordinates follow engine/braindrift/views.ts (coronal: x = NI - 1 - i, y = j,
// superior at the top, patient left on the image left). Nothing here touches the DOM.

export const NI = 176
export const NJ = 176
export const NK = 208

/** The square of the coronal image shown in the window, in image pixels (may run past the volume: that is black). */
export interface Crop {
  x0: number
  y0: number
  c: number
}

/** First and last coronal slice that contain brain. */
export function brainRange(seg: Uint8Array): [number, number] {
  const has = new Uint8Array(NK)
  for (let p = 0; p < NI * NJ; p++) {
    const b = p * NK
    for (let k = 0; k < NK; k++) if (seg[b + k]) has[k] = 1
  }
  let k0 = 0
  let k1 = NK - 1
  while (k0 < NK - 1 && !has[k0]) k0++
  while (k1 > 0 && !has[k1]) k1--
  return [k0, k1]
}

/** One square around the whole brain (all slices), with room at the top for the two chips in the window. */
export function cropOf(seg: Uint8Array): Crop {
  let xmin = NI
  let xmax = -1
  let ymin = NJ
  let ymax = -1
  for (let i = 0; i < NI; i++) {
    for (let j = 0; j < NJ; j++) {
      const b = (i * NJ + j) * NK
      let any = false
      for (let k = 0; k < NK; k++)
        if (seg[b + k]) {
          any = true
          break
        }
      if (!any) continue
      const x = NI - 1 - i
      if (x < xmin) xmin = x
      if (x > xmax) xmax = x
      if (j < ymin) ymin = j
      if (j > ymax) ymax = j
    }
  }
  if (xmax < 0) return { x0: 0, y0: 0, c: NI }
  const w = xmax - xmin + 1
  const h = ymax - ymin + 1
  const c = Math.ceil(Math.max(h / 0.85, w / 0.84))
  return { x0: Math.round((xmin + xmax + 1) / 2 - c / 2), y0: Math.round(ymin - 0.115 * c), c }
}

/** Display curve for the MRI: the brain's intensity range with a soft lift in the mid greys (white matter light grey,
 *  as on the mockup's render, not burnt out). */
export function windowLut(vol: Uint8Array, seg: Uint8Array): Uint8Array {
  const hist = new Float64Array(256)
  let n = 0
  for (let v = 0; v < vol.length; v += 3) {
    if (!seg[v]) continue
    hist[vol[v]]++
    n++
  }
  const at = (q: number) => {
    let acc = 0
    for (let x = 0; x < 256; x++) {
      acc += hist[x]
      if (acc >= q * n) return x
    }
    return 255
  }
  const lo = Math.max(0, (n ? at(0.002) : 0) - 8)
  const hi = Math.max(lo + 1, (n ? at(0.998) : 255) + 4)
  const lut = new Uint8Array(256)
  for (let x = 1; x < 256; x++) {
    const g = Math.min(1, Math.max(0, (x - lo) / (hi - lo)))
    lut[x] = Math.round(240 * Math.pow(g, 0.78))
  }
  return lut
}

/** Voxels of one class (or a test) on coronal slice k, as a crop-sized mask (1 = in). */
export function maskAt(crop: Crop, k: number, test: (v: number) => boolean): Uint8Array {
  const { x0, y0, c } = crop
  const m = new Uint8Array(c * c)
  for (let y = 0; y < c; y++) {
    const j = y0 + y
    if (j < 0 || j >= NJ) continue
    for (let x = 0; x < c; x++) {
      const i = NI - 1 - (x0 + x)
      if (i < 0 || i >= NI) continue
      if (test((i * NJ + j) * NK + k)) m[y * c + x] = 1
    }
  }
  return m
}

// marching squares: edge pairs per case (T, R, B, L = 0..3), corners tl=8, tr=4, br=2, bl=1
const CASES: number[][] = [[], [3, 2], [2, 1], [3, 1], [0, 1], [0, 1, 3, 2], [0, 2], [0, 3], [0, 3], [0, 2], [0, 3, 2, 1], [0, 1], [3, 1], [1, 2], [3, 2], []]

/**
 * Outline of a mask as an SVG path in crop pixels (pixel centres at x + 0.5). The mask is softened by one [1 2 1] pass
 * before tracing so the line is smooth, not stair-stepped; pieces under `minArea` square pixels (stray specks) are dropped.
 */
export function outlinePath(mask: Uint8Array, c: number, iso = 0.42, minArea = 3): string {
  const n = c + 2
  const f = new Float32Array(n * n)
  for (let y = 0; y < c; y++) for (let x = 0; x < c; x++) f[(y + 1) * n + x + 1] = mask[y * c + x]
  const g = new Float32Array(n * n)
  for (let y = 1; y < n - 1; y++)
    for (let x = 1; x < n - 1; x++) {
      const o = y * n + x
      g[o] =
        (f[o - n - 1] + 2 * f[o - n] + f[o - n + 1] + 2 * f[o - 1] + 4 * f[o] + 2 * f[o + 1] + f[o + n - 1] + 2 * f[o + n] + f[o + n + 1]) / 16
    }
  const H = (x: number, y: number) => y * n + x
  const V = (x: number, y: number) => n * n + y * n + x
  const adj = new Map<number, number[]>()
  const link = (a: number, b: number) => {
    const la = adj.get(a)
    if (la) la.push(b)
    else adj.set(a, [b])
    const lb = adj.get(b)
    if (lb) lb.push(a)
    else adj.set(b, [a])
  }
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const tl = g[y * n + x] >= iso ? 8 : 0
      const tr = g[y * n + x + 1] >= iso ? 4 : 0
      const br = g[(y + 1) * n + x + 1] >= iso ? 2 : 0
      const bl = g[(y + 1) * n + x] >= iso ? 1 : 0
      const pairs = CASES[tl | tr | br | bl]
      if (!pairs.length) continue
      const e = [H(x, y), V(x + 1, y), H(x, y + 1), V(x, y)]
      for (let q = 0; q < pairs.length; q += 2) link(e[pairs[q]], e[pairs[q + 1]])
    }
  const pt = (id: number): [number, number] => {
    if (id < n * n) {
      const y = Math.floor(id / n)
      const x = id - y * n
      const a = g[y * n + x]
      const b = g[y * n + x + 1]
      const t = b === a ? 0.5 : (iso - a) / (b - a)
      return [x + t - 0.5, y - 0.5]
    }
    const r = id - n * n
    const y = Math.floor(r / n)
    const x = r - y * n
    const a = g[y * n + x]
    const b = g[(y + 1) * n + x]
    const t = b === a ? 0.5 : (iso - a) / (b - a)
    return [x - 0.5, y + t - 0.5]
  }
  const seen = new Set<number>()
  let d = ''
  for (const start of adj.keys()) {
    if (seen.has(start)) continue
    const loop: [number, number][] = []
    let prev = -1
    let cur = start
    for (let guard = 0; guard < 100000; guard++) {
      seen.add(cur)
      loop.push(pt(cur))
      const nb = adj.get(cur)!
      const next = nb[0] !== prev || nb.length < 2 ? nb[0] : nb[1]
      prev = cur
      cur = next
      if (cur === start || seen.has(cur)) break
    }
    if (loop.length < 3) continue
    let area = 0
    for (let q = 0; q < loop.length; q++) {
      const [ax, ay] = loop[q]
      const [bx, by] = loop[(q + 1) % loop.length]
      area += ax * by - bx * ay
    }
    if (Math.abs(area) / 2 < minArea) continue
    d += `M${loop[0][0].toFixed(2)} ${loop[0][1].toFixed(2)}`
    for (let q = 1; q < loop.length; q++) d += `L${loop[q][0].toFixed(2)} ${loop[q][1].toFixed(2)}`
    d += 'Z'
  }
  return d
}

/**
 * Upper outline of the model's brain map on coronal slice k, in crop pixels, as [x, y, x, y, ...] (y = the top edge of
 * the highest brain voxel). Same rule as the 3D view: each column takes the highest surface within 6 mm (skips folds),
 * then a 11-column mean; only the part near the crown is kept.
 */
export function topLine(seg: Uint8Array, k: number, crop: Crop): number[] {
  const tops: number[] = []
  let best = NJ
  for (let x = 0; x < NI; x++) {
    const i = NI - 1 - x
    let top = -1
    for (let j = 0; j < NJ; j++)
      if (seg[(i * NJ + j) * NK + k] > 0) {
        top = j
        break
      }
    tops.push(top)
    if (top >= 0 && top < best) best = top
  }
  const hull: number[] = []
  for (let x = 0; x < NI; x++) {
    let hi = tops[x]
    for (let d = -6; d <= 6 && hi >= 0; d++) {
      const v = tops[x + d]
      if (v !== undefined && v >= 0 && v < hi) hi = v
    }
    hull.push(hi)
  }
  const pts: number[] = []
  for (let x = 0; x < NI; x++) {
    if (hull[x] < 0 || hull[x] > best + 30) continue
    let sum = 0
    let m = 0
    for (let d = -5; d <= 5; d++) {
      const v = hull[x + d]
      if (v !== undefined && v >= 0) {
        sum += v
        m++
      }
    }
    pts.push(x + 0.5 - crop.x0, sum / m - crop.y0)
  }
  return pts
}

export function linePath(pts: number[]): string {
  let d = ''
  for (let q = 0; q < pts.length; q += 2) d += `${q ? 'L' : 'M'}${pts[q].toFixed(2)} ${pts[q + 1].toFixed(2)}`
  return d
}

/** The sliver between two top lines (before above after is a rise), closed for filling. */
export function bandPath(pre: number[], post: number[]): string {
  if (!pre.length || !post.length) return ''
  const back: number[] = []
  for (let q = post.length - 2; q >= 0; q -= 2) back.push(post[q], post[q + 1])
  return `${linePath(pre)}${linePath(back).replace('M', 'L')}Z`
}

/** Catmull-Rom taps for upscaling c samples by F (pixel centres aligned), shared by both axes. */
export function cubicTaps(c: number, F: number): { idx: Int32Array; wt: Float32Array } {
  const n = c * F
  const idx = new Int32Array(n * 4)
  const wt = new Float32Array(n * 4)
  for (let X = 0; X < n; X++) {
    const sx = (X + 0.5) / F - 0.5
    const x0 = Math.floor(sx)
    const t = sx - x0
    const t2 = t * t
    const t3 = t2 * t
    const w = [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2]
    for (let m = 0; m < 4; m++) {
      idx[X * 4 + m] = Math.min(c - 1, Math.max(0, x0 - 1 + m))
      wt[X * 4 + m] = w[m]
    }
  }
  return { idx, wt }
}

/** Separable bicubic upscale of a c x c plane into a cF x cF plane (tmp holds c x cF). */
export function upscale(src: Float32Array, c: number, F: number, taps: { idx: Int32Array; wt: Float32Array }, tmp: Float32Array, dst: Float32Array) {
  const n = c * F
  const { idx, wt } = taps
  for (let y = 0; y < c; y++) {
    const row = y * c
    const out = y * n
    for (let X = 0; X < n; X++) {
      const q = X * 4
      tmp[out + X] = src[row + idx[q]] * wt[q] + src[row + idx[q + 1]] * wt[q + 1] + src[row + idx[q + 2]] * wt[q + 2] + src[row + idx[q + 3]] * wt[q + 3]
    }
  }
  for (let Y = 0; Y < n; Y++) {
    const q = Y * 4
    const a = idx[q] * n
    const b = idx[q + 1] * n
    const cc = idx[q + 2] * n
    const d = idx[q + 3] * n
    const wa = wt[q]
    const wb = wt[q + 1]
    const wc = wt[q + 2]
    const wd = wt[q + 3]
    const out = Y * n
    for (let X = 0; X < n; X++) dst[out + X] = tmp[a + X] * wa + tmp[b + X] * wb + tmp[cc + X] * wc + tmp[d + X] * wd
  }
}

// TrackTrace post-processing, ported 1:1 from work/TrackTrace/vm/tt_common.py (circles, components,
// fit_track_line, mulberry32) and work/ModelExamples/scripts/tracktrace_example.py (softmax, CORAL dose
// bands, lambda). All maths in float64 like the Python reference.

export const CANVAS = 128
/** tt_common.CIRCLE_THR / CIRCLE_MIN_PX: a focus pixel is sigmoid(foci_logit) > 0.5, a circle is >= 3 px. */
export const CIRCLE_THR = 0.5
export const CIRCLE_MIN_PX = 3
/** Shipped line rule (export_manifest.json line_rule.by_source.ionscan): our product rule. */
export const LINE_RULE = { minInliers: 3, minScore: 0.6, nTries: 200, inlierPx: 4.0, seed: 0 } as const

export type Vec2 = [number, number]

export function softmax(z: ArrayLike<number>): number[] {
  let m = -Infinity
  for (let i = 0; i < z.length; i++) m = Math.max(m, z[i])
  const e = Array.from(z, (v) => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / s)
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

/** CORAL reading of the two cumulative dose logits: [1 - s(d0), s(d0) - s(d1), s(d1)] (sham, low, high). */
export function doseFromCum(d0: number, d1: number): number[] {
  const s0 = sigmoid(d0)
  const s1 = sigmoid(d1)
  return [1 - s0, s0 - s1, s1]
}

export function argmax(v: ArrayLike<number>): number {
  let k = 0
  for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i
  return k
}

export interface Component {
  /** Centroid in canvas pixels: row (y) and column (x). */
  row: number
  col: number
  areaPx: number
}

/**
 * 8-connected parts of a 0/1 mask, numbered in raster order of each part's first pixel (as
 * scipy.ndimage.label), keeping parts with >= minPx pixels. Centroid = mean (row, col) of the part.
 */
export function components(mask: Uint8Array, h = CANVAS, w = CANVAS, minPx = 1): Component[] {
  const lab = new Int32Array(h * w)
  const out: Component[] = []
  const stack: number[] = []
  let next = 0
  for (let start = 0; start < h * w; start++) {
    if (!mask[start] || lab[start]) continue
    next++
    lab[start] = next
    stack.push(start)
    let n = 0
    let sr = 0
    let sc = 0
    while (stack.length) {
      const p = stack.pop()!
      const r = (p / w) | 0
      const c = p - r * w
      n++
      sr += r
      sc += c
      for (let dr = -1; dr <= 1; dr++) {
        const rr = r + dr
        if (rr < 0 || rr >= h) continue
        for (let dc = -1; dc <= 1; dc++) {
          const cc = c + dc
          if (cc < 0 || cc >= w || (dr === 0 && dc === 0)) continue
          const q = rr * w + cc
          if (mask[q] && !lab[q]) {
            lab[q] = next
            stack.push(q)
          }
        }
      }
    }
    if (n >= minPx) out.push({ row: sr / n, col: sc / n, areaPx: n })
  }
  return out
}

/** Nucleus mask = x > 0 (exact: preprocessing floors x at 0.02 inside the nucleus). */
export function nucleusMask(x: Float32Array): Uint8Array {
  const m = new Uint8Array(x.length)
  for (let i = 0; i < x.length; i++) m[i] = x[i] > 0 ? 1 : 0
  return m
}

/** Displayed foci: 8-connected parts of (sigmoid(logit) > 0.5) AND nucleus with >= 3 px. */
export function circlesFromLogits(fociLogits: ArrayLike<number>, nuc: Uint8Array): Component[] {
  const m = new Uint8Array(nuc.length)
  for (let i = 0; i < nuc.length; i++) m[i] = nuc[i] && sigmoid(fociLogits[i]) > CIRCLE_THR ? 1 : 0
  return components(m, CANVAS, CANVAS, CIRCLE_MIN_PX)
}

/** Bit-exact JS mulberry32 (tt_common.mulberry32 is its Python twin). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Line angle in degrees [0, 180): 0 = along a row, 90 = along a column. */
export function angleOf(dr: number, dc: number): number {
  const a = ((((Math.atan2(-dr, dc) * 180) / Math.PI) % 180) + 180) % 180
  return a >= 180 - 1e-12 ? 0 : a
}

export interface LineFit {
  /** True when the rule draws the line: inliers >= 3 and score >= 0.6 (our product rule). */
  drawn: boolean
  nFoci: number
  nInliers: number
  /** Per circle (same order as the circles): is it on the line (within 4 px)? */
  inliers: boolean[]
  /** Collinearity score = (inliers / foci) x (1 - lam2 / lam1). */
  score: number
  lam1: number
  lam2: number
  /** Canvas (row, col). null when fewer than 3 foci. */
  center: Vec2 | null
  /** Unit vector (d_row, d_col) along the line. */
  direction: Vec2 | null
  angleDeg: number | null
  /** End points of the inliers projected on the line, canvas (row, col). */
  p0: Vec2 | null
  p1: Vec2 | null
}

/** tt_common.fit_track_line: seeded RANSAC over pairs, then a PCA refit through the inliers. */
export function fitTrackLine(points: Vec2[], rule = LINE_RULE): LineFit {
  const n = points.length
  const res: LineFit = {
    drawn: false, nFoci: n, nInliers: 0, inliers: new Array(n).fill(false), score: 0, lam1: 0, lam2: 0,
    center: null, direction: null, angleDeg: null, p0: null, p1: null,
  }
  if (n < 3) return res
  const nPairs = (n * (n - 1)) / 2
  const pairs: Vec2[] = []
  if (nPairs <= rule.nTries) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j])
  } else {
    const rnd = mulberry32(rule.seed)
    for (let k = 0; k < rule.nTries; k++) {
      const i = Math.floor(rnd() * n)
      let j = Math.floor(rnd() * (n - 1))
      if (j >= i) j += 1
      pairs.push([i, j])
    }
  }
  let bestInl: boolean[] | null = null
  let bestCnt = -1
  let bestSum = Infinity
  for (const [i, j] of pairs) {
    const vr = points[j][0] - points[i][0]
    const vc = points[j][1] - points[i][1]
    const L = Math.hypot(vr, vc)
    if (L < 1e-9) continue
    const nr = -vc / L
    const nc = vr / L
    const inl: boolean[] = []
    let cnt = 0
    let s = 0
    for (let k = 0; k < n; k++) {
      const d = Math.abs((points[k][0] - points[i][0]) * nr + (points[k][1] - points[i][1]) * nc)
      const on = d <= rule.inlierPx
      inl.push(on)
      if (on) {
        cnt++
        s += d
      }
    }
    if (cnt > bestCnt || (cnt === bestCnt && s < bestSum - 1e-9)) {
      bestInl = inl
      bestCnt = cnt
      bestSum = s
    }
  }
  if (!bestInl) bestInl = new Array(n).fill(true)
  const q = points.filter((_, k) => bestInl![k])
  const k = q.length
  let cr = 0
  let cc = 0
  for (const p of q) {
    cr += p[0]
    cc += p[1]
  }
  cr /= k
  cc /= k
  let a = 0
  let d = 0
  let b = 0
  for (const p of q) {
    const dr = p[0] - cr
    const dc = p[1] - cc
    a += dr * dr
    d += dc * dc
    b += dr * dc
  }
  a /= k
  d /= k
  b /= k
  const halfTr = (a + d) / 2
  const disc = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b))
  const lam1 = halfTr + disc
  const lam2 = Math.max(0, halfTr - disc)
  const phi = 0.5 * Math.atan2(2 * b, a - d)
  const dr = Math.cos(phi)
  const dc = Math.sin(phi)
  const score = lam1 > 1e-12 ? (k / n) * (1 - lam2 / lam1) : 0
  let tmin = Infinity
  let tmax = -Infinity
  for (const p of q) {
    const t = (p[0] - cr) * dr + (p[1] - cc) * dc
    tmin = Math.min(tmin, t)
    tmax = Math.max(tmax, t)
  }
  return {
    drawn: k >= rule.minInliers && score >= rule.minScore,
    nFoci: n,
    nInliers: k,
    inliers: bestInl,
    score,
    lam1,
    lam2,
    center: [cr, cc],
    direction: [dr, dc],
    angleDeg: angleOf(dr, dc),
    p0: [cr + tmin * dr, cc + tmin * dc],
    p1: [cr + tmax * dr, cc + tmax * dc],
  }
}

/** Display radius of a circle from its area (tracktrace_example.py): max(3.5, sqrt(area / pi) + 2). */
export function displayRadius(areaPx: number): number {
  return Math.max(3.5, Math.sqrt(areaPx / Math.PI) + 2)
}

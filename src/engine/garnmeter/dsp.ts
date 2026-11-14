// Pure numeric helpers: calibration, windowing, smoothing, zone hold, rank correlation.
// Ported from work/GarnMeter/garn_export.py and work/ModelExamples/scripts/garnmeter_example.py.
import type { ZoneIndex } from './result'

export const FS = 128
export const N_CH = 14
export const WIN = 512
/** Window ends inside each trial, in seconds (plan 06 section 3, demo replay). */
export const WINDOW_ENDS_S = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0]
/** Calibration: baseline samples 0-1,023; reference window for coupling = samples 512-1,023. */
export const BASELINE_LEN = 1024
export const REF_WINDOW_START = 512
export const EMA_ALPHA = 0.3
/** Hold (plan 06 section 9): step up after 4 consecutive windows at/above a tick, down after 8 below. */
export const HOLD_UP = 4
export const HOLD_DOWN = 8
/** Bin Garn means baked into the ONNX graph (plan 06 section 4). */
export const BIN_GARN_MEANS = [0, 0.16666666666666666, 0.39583333333333326, 0.7326388888888888]

/** numpy-style median (even count = mean of the two middle values), in float64. */
export function median(values: ArrayLike<number>): number {
  const a = Float64Array.from(values as ArrayLike<number>).sort()
  const n = a.length
  if (n === 0) return NaN
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2
}

/** sigma_c = 1.4826 * median(|x - median(x)|) per channel over samples [from, from + len). Channel-major input. */
export function madSigma(x: Float32Array, nSamples: number, from = 0, len = BASELINE_LEN): number[] {
  const out: number[] = []
  for (let c = 0; c < N_CH; c++) {
    const seg = x.subarray(c * nSamples + from, c * nSamples + from + len)
    const m = median(seg)
    const dev = new Float64Array(len)
    for (let i = 0; i < len; i++) dev[i] = Math.abs(seg[i] - m)
    out.push(1.4826 * median(dev))
  }
  return out
}

/** Copies windows [14][512] starting at each start sample into one [N,14,512] float32 tensor, divided by sigma (float32 division, as numpy). */
export function buildBatch(x: Float32Array, nSamples: number, starts: number[], sigma: number[]): Float32Array {
  const out = new Float32Array(starts.length * N_CH * WIN)
  const s32 = sigma.map((v) => Math.fround(v))
  starts.forEach((st, b) => {
    if (st < 0 || st + WIN > nSamples) throw new Error(`window ${st}..${st + WIN} is outside the signal (0..${nSamples})`)
    for (let c = 0; c < N_CH; c++) {
      const src = c * nSamples + st
      const dst = (b * N_CH + c) * WIN
      const sc = s32[c]
      for (let t = 0; t < WIN; t++) out[dst + t] = x[src + t] / sc
    }
  })
  return out
}

export function binsFromCum(p: [number, number, number]): [number, number, number, number] {
  return [1 - p[0], p[0] - p[1], p[1] - p[2], p[2]]
}

export function emaSeries(values: number[], alpha = EMA_ALPHA): number[] {
  const out: number[] = []
  let e = NaN
  for (const v of values) {
    e = Number.isNaN(e) ? v : alpha * v + (1 - alpha) * e
    out.push(e)
  }
  return out
}

export function levelOf(g: number, gy: number, gr: number): ZoneIndex {
  return g >= gr ? 2 : g >= gy ? 1 : 0
}

/**
 * EEG zone with the hold of plan 06 section 9, starting at green. The zone steps up after HOLD_UP consecutive
 * windows above the current zone (to the highest tick all of them reached), and steps down after HOLD_DOWN
 * consecutive windows below it (to the highest level any of them reached). Applied to the smoothed garn.
 */
export function holdZones(g: number[], gy: number, gr: number): ZoneIndex[] {
  let z: ZoneIndex = 0
  let up: ZoneIndex[] = []
  let down: ZoneIndex[] = []
  const out: ZoneIndex[] = []
  for (const v of g) {
    const l = levelOf(v, gy, gr)
    up = l > z ? [...up, l] : []
    down = l < z ? [...down, l] : []
    if (up.length >= HOLD_UP) {
      z = Math.min(...up.slice(-HOLD_UP)) as ZoneIndex
      up = []
      down = []
    } else if (down.length >= HOLD_DOWN) {
      z = Math.max(...down.slice(-HOLD_DOWN)) as ZoneIndex
      up = []
      down = []
    }
    out.push(z)
  }
  return out
}

function ranks(a: number[]): number[] {
  const idx = a.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0])
  const r = new Array<number>(a.length)
  for (let i = 0; i < idx.length; ) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg
    i = j + 1
  }
  return r
}

/** Spearman rank correlation with average ranks for ties (as scipy.stats.spearmanr). */
export function spearman(a: number[], b: number[]): number | null {
  if (a.length < 3 || a.length !== b.length) return null
  const ra = ranks(a)
  const rb = ranks(b)
  const ma = ra.reduce((s, v) => s + v, 0) / ra.length
  const mb = rb.reduce((s, v) => s + v, 0) / rb.length
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb)
    da += (ra[i] - ma) ** 2
    db += (rb[i] - mb) ** 2
  }
  return da === 0 || db === 0 ? null : num / Math.sqrt(da * db)
}

export interface CouplingPair {
  a: number
  b: number
  chA: string
  chB: string
  /** Change since the calibration reference: positive = rose, negative = fell. */
  delta: number
}

/** The k electrode pairs whose coupling changed most since the calibration reference (plan 06 section 8). */
export function couplingChange(c: Float32Array, ref: Float32Array, channels: string[], k = 15): CouplingPair[] {
  const pairs: CouplingPair[] = []
  for (let a = 0; a < N_CH; a++)
    for (let b = a + 1; b < N_CH; b++) {
      const d = c[a * N_CH + b] - ref[a * N_CH + b]
      pairs.push({ a, b, chA: channels[a], chB: channels[b], delta: d })
    }
  return pairs.sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta)).slice(0, k)
}

/** Deterministic Gaussian noise (mulberry32 + Box-Muller) for what-if perturbations. */
export function gaussian(seed: number): () => number {
  let s = seed >>> 0
  const u = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u())
}

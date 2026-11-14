// Model B (braindrift_anat.onnx) in the browser: exact port of the r2 browser slice rule
// (work/ModelExamples/scripts/braindrift_example.py `segment`, bd_flight.predict_anat, bd_demo_assets.segment):
//   - coronal slice k = array axis 2 of the LIA crop; only slices whose centre slice has any non-zero voxel are run,
//     every other slice stays background (class 0, P(not background) = 0);
//   - input x[n, c, i, j] = crop[i, j, k - 1 + c] / 255, zeros past the crop edge; float32 [N, 3, 176, 176], N = 8;
//   - padding to 192, ImageNet normalisation and the crop back to 176 are inside the ONNX graph;
//   - output logits [N, 6, 176, 176] -> softmax over the 6 classes -> argmax (colour map, volumes) and
//     P(not background) = 1 - softmax class 0 (top-of-brain surface for the vertex rise).
import { loadModel, runModel, initInference } from '../../lib/infer/client'
import { NI, NJ, NK, NVOX } from './assets'
import { brainSlices } from './views'

export const MODEL_KEY = 'braindrift_anat'
export const MODEL_PATH = 'models/braindrift_anat.onnx'
export const MODEL_BYTES = 16147741
export const MODEL_SHA256 = '4516f08b1d23db813ded77d8f3083f0a8e9bd8b84f5f2bc888182650bc3c0249'
export const BATCH = 8
export const N_CLASSES = 6
const S2 = NI * NJ

export interface SegmentProgress {
  /** Coronal slices finished in this call. */
  slices: number[]
  done: number
  total: number
  /** Argmax so far (same array the result returns; filled slice by slice). */
  seg: Uint8Array
}

export interface SegmentOptions {
  onProgress?: (p: SegmentProgress) => void
  /** Keep the full softmax of these coronal slices (for probability views and parity). */
  keepSoftmaxOf?: number[]
  /** Only run these coronal slices (others stay background). Default: every slice with brain. */
  onlySlices?: number[]
}

export interface SegmentOutput {
  seg: Uint8Array
  /** Per column (i, k): first j from the top where P(not background) >= 0.5, linearly interpolated; NaN if none. */
  top: Float64Array
  slicesRun: number[]
  softmax: Map<number, Float32Array>
  /** Max per-voxel class probability distance from a tie (for "how sure" maps): min over each slice is in sliceMinMargin. */
  sliceMinMargin: Float32Array
  calls: number
  msPerCall: number[]
  ms: number
}

/** Fills the [n, 3, 176, 176] input for coronal slices ks. */
export function buildInput(vol: Uint8Array, ks: number[]): Float32Array {
  const x = new Float32Array(ks.length * 3 * S2)
  for (let n = 0; n < ks.length; n++) {
    for (let c = 0; c < 3; c++) {
      const kk = ks[n] - 1 + c
      if (kk < 0 || kk >= NK) continue
      const o = (n * 3 + c) * S2
      for (let i = 0; i < NI; i++) {
        const rowBase = i * NJ
        for (let j = 0; j < NJ; j++) x[o + rowBase + j] = vol[(rowBase + j) * NK + kk] / 255
      }
    }
  }
  return x
}

let loaded: Promise<{ ms: number }> | null = null
export function loadModelB(path: string): Promise<{ ms: number }> {
  if (!loaded) {
    loaded = (async () => {
      await initInference()
      const r = await loadModel(MODEL_KEY, path)
      return { ms: r.ms }
    })()
    loaded.catch(() => (loaded = null))
  }
  return loaded
}

/** Runs Model B over a crop. Call loadModelB first. */
export async function segmentVolume(vol: Uint8Array, opts: SegmentOptions = {}): Promise<SegmentOutput> {
  if (vol.length !== NVOX) throw new Error(`braindrift: volume must have ${NVOX} voxels`)
  const t0 = performance.now()
  const all = brainSlices(vol)
  const ks = opts.onlySlices ? opts.onlySlices.filter((k) => all.includes(k)) : all
  const seg = new Uint8Array(NVOX)
  const top = new Float64Array(NI * NK).fill(Number.NaN)
  // P(not background) per column, accumulated from the slices as they finish (only the slices that ran can be > 0)
  const pnb = new Float32Array(NI * NJ * NK)
  const keep = new Set(opts.keepSoftmaxOf ?? [])
  const softmax = new Map<number, Float32Array>()
  const sliceMinMargin = new Float32Array(NK).fill(1)
  const msPerCall: number[] = []
  const p = new Float64Array(N_CLASSES)
  for (let b0 = 0; b0 < ks.length; b0 += BATCH) {
    const kb = ks.slice(b0, b0 + BATCH)
    const x = buildInput(vol, kb)
    const r = await runModel(MODEL_KEY, { slices: { type: 'float32', dims: [kb.length, 3, NI, NJ], data: x } })
    msPerCall.push(r.ms)
    const lg = r.outputs.logits.data as Float32Array
    for (let n = 0; n < kb.length; n++) {
      const k = kb[n]
      const sm = keep.has(k) ? new Float32Array(N_CLASSES * S2) : null
      let minMargin = 1
      const base = n * N_CLASSES * S2
      for (let q = 0; q < S2; q++) {
        let mx = -Infinity
        for (let c = 0; c < N_CLASSES; c++) {
          const v = lg[base + c * S2 + q]
          if (v > mx) mx = v
        }
        let sum = 0
        for (let c = 0; c < N_CLASSES; c++) {
          // float32 arithmetic as in numpy: lg - max, exp, / sum
          const e = Math.fround(Math.exp(Math.fround(lg[base + c * S2 + q] - mx)))
          p[c] = e
          sum = Math.fround(sum + e)
        }
        let best = 0
        let bp = -1
        let second = -1
        for (let c = 0; c < N_CLASSES; c++) {
          const pc = Math.fround(p[c] / sum)
          p[c] = pc
          if (pc > bp) {
            second = bp
            bp = pc
            best = c
          } else if (pc > second) second = pc
          if (sm) sm[c * S2 + q] = pc
        }
        const margin = bp - second
        if (margin < minMargin) minMargin = margin
        // q = i * 176 + j  ->  voxel (i, j, k)
        const v = q * NK + k
        seg[v] = best
        pnb[v] = Math.fround(1 - p[0])
      }
      sliceMinMargin[k] = minMargin
      if (sm) softmax.set(k, sm)
    }
    opts.onProgress?.({ slices: kb, done: Math.min(b0 + BATCH, ks.length), total: ks.length, seg })
  }
  // top surface per column (i, k), bd_flight.top_surface
  for (let i = 0; i < NI; i++) {
    for (let k = 0; k < NK; k++) {
      for (let j = 0; j < NJ; j++) {
        const pk = pnb[(i * NJ + j) * NK + k]
        if (pk >= 0.5) {
          if (j === 0) top[i * NK + k] = 0
          else {
            const pm = pnb[(i * NJ + j - 1) * NK + k]
            top[i * NK + k] = j - 1 + (0.5 - pm) / Math.max(pk - pm, 1e-12)
          }
          break
        }
      }
    }
  }
  return { seg, top, slicesRun: ks, softmax, sliceMinMargin, calls: msPerCall.length, msPerCall, ms: performance.now() - t0 }
}

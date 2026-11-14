// TrackTrace engine (STARSTRUCK, model IonScan). Plain TypeScript, no UI.
// Live: IonScan (one 128 x 128 nucleus -> foci map, particle / dose / time, lambda, 202 bag features) and
// the MIL sample model (bag of nucleus features -> whole-sample verdict + attention), both through the
// shared inference worker. Precomputed replays come from the shipped JSON. Ground truth for every port:
// work/ModelExamples/scripts/tracktrace_example.py and work/TrackTrace/vm/tt_common.py.
import { initInference, loadModel, runModel } from '../../lib/infer/client'
import type { EngineInfo, Sample, Timing } from '../types'
import { decide, type ActInput, type CrewInputs, type TrackTraceAct } from './act'
import { fetchJson, fetchNuclei } from './decode'
import {
  CANVAS, argmax, circlesFromLogits, displayRadius, doseFromCum, fitTrackLine, nucleusMask, sigmoid, softmax,
  type Component, type LineFit, type Vec2,
} from './post'
import {
  PARTICLES, type FocusCircle, type NucleusResult, type Truth, type WellNucleus, type WellProgress, type WellResult,
  type WellSummary,
} from './types'

export * from './types'
export { ACT_CAVEATS, SOURCES as ACT_SOURCES } from './act'
export { LINE_RULE, fitTrackLine, mulberry32, softmax, doseFromCum } from './post'

const BASE = 'tracktrace/'
const PX = CANVAS * CANVAS

export const info: EngineInfo = {
  id: 'tracktrace',
  models: [
    { key: 'tt_ionscan', path: BASE + 'models/tracktrace_ionscan.onnx', bytes: 13477095, sha256: 'fa894a6693ea0aff0197cc9c098eb648fd803e90afd5f95208830694a0fb90c2' },
    { key: 'tt_mil', path: BASE + 'models/tracktrace_mil.onnx', bytes: 220229, sha256: 'a656ebb2aadc168250f86b9a80bd46804f65141ceffb145a7bef98c33036513b' },
  ],
  live: true,
  phoneLive: true,
  notes:
    'Single nucleus runs live everywhere (13.5 MB model, 4.36 GFLOP per nucleus). A whole-well scan (583 nuclei) is for a laptop GPU; on phones or without WebGPU use replayWell().',
}

/** Honesty strings, verbatim from plans/01_TrackTrace.md section 11, SCREENS.md section 1 and the LOG. */
export const HONESTY = {
  /** L3 failed: the fallback wording must appear wherever particle bars or the sample verdict are shown. */
  batch: 'The model separates the two exposures, but part of that comes from lab batch; the foci and the sample-level call are what we trust.',
  /** L4 failed: add wherever a 48 h low-dose X-ray result is shown. */
  lowDose48h: 'At 48 hours after a low X-ray dose the cells have repaired; any difference the model still sees there is lab batch.',
  trackLine: 'The track line is a geometric fit through the foci the model found. There is no ground truth for it.',
  lineLabel: 'geometric line fit',
  gallery: 'Chosen by label, not by result: the gallery is not typical accuracy; the test-set numbers are the accuracy.',
  groundAnalog: 'Ground analog: mouse skin-cell nuclei hit by an accelerator beam of iron ions or by X-rays on the ground, not real cosmic rays in astronauts, and not a validated crew assay.',
  fociLabels: "The foci labels come from NASA's original 2016 analysis program, not from hand annotation.",
  heroCaption: 'Iron-ion beam, 600 MeV/n, ground accelerator. Nucleus from a mouse the model never saw.',
  zScale: 'z not to scale',
  doseBands: 'Dose bands are lab bands (sham / low / high), never astronaut doses.',
  letLadder: 'never trained on silicon or argon; exploratory',
  precomputed: 'precomputed',
  precomputedWell: 'precomputed on our GPU',
  wellsStandIn: 'Lab wells stand in for crew samples.',
  heldOut: 'From a mouse the model never saw (held-out test mouse).',
} as const

// ---- shipped data (internal shapes of app/public/tracktrace/*.json) ------------------------------------
interface GalleryNucleus {
  gid: number; id: string; key: string; file: string; offset: number; plate: string; well: string; donor: string
  cond: string; truth: Truth; nfoci2016: number; heatEligible: boolean; pick: string; example: boolean
  ref: { count: number; circles: [number, number, number][]; line: { drawn: boolean; score: number; n_inliers: number; inliers: boolean[] } }
  out: { particle: number[]; dose: number[]; time: number[]; lam: number; count: number }
}
interface Gallery { nuclei: GalleryNucleus[] }
interface LiveWellJson {
  well_id: string; cond: string; file: string; n: number; keys: string[]
  nuclei: { particle: number[][]; dose: number[][]; time: number[][]; lambda: number[]; count: number[]; circles: [number, number][][] }
  mu: number; verdict: { particle: number[]; dose: number[]; time: number[] }; attention: number[]; highlight: number[]
}
interface WellsJson { wells: Omit<WellSummary, 'live'>[] }
export interface Nucleus3DEntry {
  id: string; file: string; bytes: number; hero: boolean; plate: string; well: string; condition: string
  nfoci_2016: number; circle_count: number; line_drawn: boolean; line_score: number; p_heavy: number
}

const LIVE_WELLS: Record<string, { bin: string; json: string }> = {
  P242_G4: { bin: BASE + 'wells/live_P242_G4.f16.bin.gz', json: BASE + 'wells/live_P242_G4.json' },
}

const gallery = () => fetchJson<Gallery>(BASE + 'gallery/gallery.json')
const wellsJson = () => fetchJson<WellsJson>(BASE + 'results/wells_test.json')

async function galleryById(): Promise<Map<string, GalleryNucleus>> {
  const g = await gallery()
  return new Map(g.nuclei.map((n) => [n.id, n]))
}

let backend: Timing['backend'] = 'wasm'
let loaded: Promise<{ ionscanMs: number; milMs: number; backend: string; adapter: string | null }> | null = null

/** Loads both models (and the gallery index). onProgress(fraction 0..1, stage). */
export function load(onProgress?: (fraction: number, stage: string) => void) {
  if (!loaded) {
    loaded = (async () => {
      onProgress?.(0, 'starting inference')
      const env = await initInference()
      backend = env.backend
      onProgress?.(0.05, 'loading IonScan (13.5 MB)')
      const a = await loadModel('tt_ionscan', info.models[0].path)
      onProgress?.(0.9, 'loading sample model')
      const b = await loadModel('tt_mil', info.models[1].path)
      await gallery()
      onProgress?.(1, 'ready')
      return { ionscanMs: a.ms, milMs: b.ms, backend: env.backend, adapter: env.adapter }
    })()
    loaded.catch(() => (loaded = null))
  }
  return loaded
}

/** The 243 held-out gallery nuclei. */
export async function listSamples(): Promise<Sample[]> {
  const g = await gallery()
  return g.nuclei.map((n) => ({
    id: n.id,
    label: `${n.cond} · nucleus ${n.gid + 1}`,
    heldOut: true,
    meta: {
      key: n.key, cond: n.cond, particle: PARTICLES[n.truth.particle], dose: n.truth.dose, time: n.truth.time,
      nfoci2016: n.nfoci2016, example: n.example, pick: n.pick, well: `${n.plate}_${n.well}`, donor: n.donor,
      refCount: n.ref.count, refLine: n.ref.line.drawn,
    },
  }))
}

/** The 34 held-out test wells (precomputed verdicts); `live` = images ship, analyzeWell() can scan it. */
export async function listWells(): Promise<WellSummary[]> {
  const w = await wellsJson()
  return w.wells.map((x) => ({ ...x, live: x.wellId in LIVE_WELLS }))
}

/** The 12 precomputed 3D nuclei (meshes in nuclei3d/<id>.json). */
export async function list3D(): Promise<Nucleus3DEntry[]> {
  const idx = await fetchJson<{ nuclei: Nucleus3DEntry[] }>(BASE + 'nuclei3d/index.json')
  return idx.nuclei
}

/** One 3D nucleus JSON (schema tracktrace.nucleus3d/1: nucleus mesh, foci surface, foci, line2d, line3d, model, projection). */
export function load3D(id: string): Promise<Record<string, unknown>> {
  return fetchJson(BASE + `nuclei3d/${id}.json`)
}

export const loadSummary = () => fetchJson<Record<string, unknown>>(BASE + 'results/summary.json')
export const loadSampleSizeCurve = () => fetchJson<Record<string, unknown>>(BASE + 'results/sample_size_curve.json')
export const loadLetLadder = () => fetchJson<Record<string, unknown>>(BASE + 'nuclei3d/letladder.json')

/** The model input x (128 x 128) of a gallery nucleus, for drawing it before or without running the model. */
export async function sampleImage(sampleId: string): Promise<Float32Array> {
  const n = (await galleryById()).get(sampleId)
  if (!n) throw new Error(`unknown sample ${sampleId}`)
  const all = await fetchNuclei(BASE + 'gallery/' + n.file)
  return all.slice(n.offset * PX, (n.offset + 1) * PX)
}

/** All nucleus images of a live well, [n * 128 * 128], for thumbnails. */
export async function wellImages(wellId: string): Promise<Float32Array> {
  const lw = LIVE_WELLS[wellId]
  if (!lw) throw new Error(`well ${wellId} has no shipped images`)
  return fetchNuclei(lw.bin)
}

// ---- running IonScan ------------------------------------------------------------------------------------
interface RawOut {
  particle: number[]; dose: number[]; time: number[]; lambda: number
  fociLogits: Float32Array; trackDir: Float32Array; bag: Float32Array
}

async function runIonScan(xs: Float32Array, b: number): Promise<{ outs: RawOut[]; ms: number }> {
  await load()
  const data = new Float32Array(xs) // the worker transfers (detaches) the buffer
  const r = await runModel('tt_ionscan', { nucleus: { type: 'float32', dims: [b, 1, CANVAS, CANVAS], data } })
  const o = r.outputs
  const P = o.particle_logits.data as Float32Array
  const D = o.dose_cum_logits.data as Float32Array
  const T = o.time_logits.data as Float32Array
  const C = o.count_lograte.data as Float32Array
  const F = o.foci_logits.data as Float32Array
  const TD = o.track_dir.data as Float32Array
  const BF = o.bag_features.data as Float32Array
  const outs: RawOut[] = []
  for (let i = 0; i < b; i++) {
    outs.push({
      particle: softmax(P.subarray(3 * i, 3 * i + 3)),
      dose: doseFromCum(D[2 * i], D[2 * i + 1]),
      time: softmax(T.subarray(3 * i, 3 * i + 3)),
      lambda: Math.exp(C[i]),
      fociLogits: F.subarray(PX * i, PX * (i + 1)),
      trackDir: TD.subarray(4096 * i, 4096 * (i + 1)),
      bag: BF.subarray(202 * i, 202 * (i + 1)),
    })
  }
  return { outs, ms: r.ms }
}

function toCircles(comps: Component[], line: LineFit, withArea: boolean): FocusCircle[] {
  return comps.map((c, i) => ({
    id: i, row: c.row, col: c.col, x: c.col, y: c.row,
    areaPx: withArea ? c.areaPx : null,
    radiusPx: withArea ? displayRadius(c.areaPx) : 3.5,
    onLine: line.drawn && line.inliers[i],
  }))
}

function nucleusFrom(
  x: Float32Array, o: RawOut, meta: { sampleId: string; key: string; source: NucleusResult['source']; n?: GalleryNucleus }, timing: Timing,
): NucleusResult {
  const nuc = nucleusMask(x)
  const comps = circlesFromLogits(o.fociLogits, nuc)
  const line = fitTrackLine(comps.map((c) => [c.row, c.col] as Vec2))
  const prob = new Float32Array(PX)
  for (let i = 0; i < PX; i++) prob[i] = sigmoid(o.fociLogits[i])
  return {
    sampleId: meta.sampleId, key: meta.key, source: meta.source, x, nucleus: nuc, fociProb: prob,
    trackDir: new Float32Array(o.trackDir), circles: toCircles(comps, line, true), count: comps.length, line,
    probs: { particle: o.particle, dose: o.dose, time: o.time }, lambda: o.lambda, bagFeatures: new Float32Array(o.bag),
    truth: meta.n?.truth ?? null, cond: meta.n?.cond ?? null, nfoci2016: meta.n?.nfoci2016 ?? null, timing,
  }
}

/** Runs IonScan live on one gallery nucleus. */
export async function analyze(sampleId: string): Promise<NucleusResult> {
  return (await analyzeMany([sampleId]))[0]
}

/** Runs IonScan live on several gallery nuclei in batches (timing.ms = per-nucleus share of its batch). */
export async function analyzeMany(sampleIds: string[], batch = 16): Promise<NucleusResult[]> {
  const byId = await galleryById()
  const res: NucleusResult[] = []
  for (let s = 0; s < sampleIds.length; s += batch) {
    const ids = sampleIds.slice(s, s + batch)
    const xs = await Promise.all(ids.map((id) => sampleImage(id)))
    const buf = new Float32Array(ids.length * PX)
    xs.forEach((x, i) => buf.set(x, i * PX))
    const { outs, ms } = await runIonScan(buf, ids.length)
    ids.forEach((id, i) => {
      const n = byId.get(id)!
      res.push(nucleusFrom(xs[i], outs[i], { sampleId: id, key: n.key, source: 'live', n }, { backend, ms: ms / ids.length }))
    })
  }
  return res
}

/**
 * Runs IonScan live on any preprocessed 128 x 128 nucleus x (for example a gallery nucleus the user
 * rotated with transformNucleus()). x must follow the shipped format: 0 outside the nucleus, >= 0.02 inside.
 */
export async function analyzeInput(x: Float32Array, sampleId = 'user'): Promise<NucleusResult> {
  if (x.length !== PX) throw new Error(`expected ${PX} values, got ${x.length}`)
  const { outs, ms } = await runIonScan(x, 1)
  return nucleusFrom(new Float32Array(x), outs[0], { sampleId, key: sampleId, source: 'user' }, { backend, ms })
}

/** The 8 flips / 90-degree rotations IonScan was trained with (augmentation, plan section 3). */
export type Dihedral = 'id' | 'rot90' | 'rot180' | 'rot270' | 'flipH' | 'flipV' | 'transpose' | 'antiTranspose'

export function transformNucleus(x: Float32Array, op: Dihedral): Float32Array {
  const out = new Float32Array(PX)
  const N = CANVAS - 1
  for (let r = 0; r < CANVAS; r++)
    for (let c = 0; c < CANVAS; c++) {
      let rr = r
      let cc = c
      if (op === 'rot90') [rr, cc] = [N - c, r]
      else if (op === 'rot180') [rr, cc] = [N - r, N - c]
      else if (op === 'rot270') [rr, cc] = [c, N - r]
      else if (op === 'flipH') cc = N - c
      else if (op === 'flipV') rr = N - r
      else if (op === 'transpose') [rr, cc] = [c, r]
      else if (op === 'antiTranspose') [rr, cc] = [N - c, N - r]
      out[r * CANVAS + c] = x[rr * CANVAS + cc]
    }
  return out
}

/** Precomputed version of analyze(): stored ONNX CPU outputs, circles and line (no model run). */
export async function replay(sampleId: string): Promise<NucleusResult> {
  const t0 = performance.now()
  const n = (await galleryById()).get(sampleId)
  if (!n) throw new Error(`unknown sample ${sampleId}`)
  const x = await sampleImage(sampleId)
  const comps: Component[] = n.ref.circles.map(([row, col, areaPx]) => ({ row, col, areaPx }))
  const line = fitTrackLine(comps.map((c) => [c.row, c.col] as Vec2))
  return {
    sampleId, key: n.key, source: 'precomputed', x, nucleus: nucleusMask(x), fociProb: null, trackDir: null,
    circles: toCircles(comps, line, true), count: comps.length, line,
    probs: { particle: n.out.particle, dose: n.out.dose, time: n.out.time }, lambda: n.out.lam, bagFeatures: null,
    truth: n.truth, cond: n.cond, nfoci2016: n.nfoci2016, timing: { backend: 'precomputed', ms: performance.now() - t0 },
  }
}

// ---- whole-sample (well) scan -----------------------------------------------------------------------------
async function wellBaseline(wellId: string): Promise<{ mu0: number | null; baselineWell: string | null; truth: Truth | null }> {
  const w = (await wellsJson()).wells.find((x) => x.wellId === wellId)
  return { mu0: w?.mu0 ?? null, baselineWell: w?.baselineWell ?? null, truth: w?.truth ?? null }
}

function topK(v: number[], k: number): number[] {
  return v.map((a, i) => [a, i] as const).sort((p, q) => q[0] - p[0] || p[1] - q[1]).slice(0, k).map((p) => p[1])
}

/** Runs the sample model (MIL) on stacked 202-d bag features [n * 202]. */
export async function runMil(bag: Float32Array, n: number) {
  await load()
  const r = await runModel('tt_mil', { bag: { type: 'float32', dims: [1, n, 202], data: new Float32Array(bag) } })
  const o = r.outputs
  return {
    verdict: {
      particle: softmax(o.particle_logits.data as Float32Array),
      dose: softmax(o.dose_logits.data as Float32Array),
      time: softmax(o.time_logits.data as Float32Array),
    },
    attention: Array.from(o.attention.data as Float32Array),
    ms: r.ms,
  }
}

/** Scans every nucleus of a live well with IonScan, then runs the MIL live. onProgress fires per batch. */
export async function analyzeWell(wellId: string, onProgress?: (p: WellProgress) => void, batch = 16): Promise<WellResult> {
  const lw = LIVE_WELLS[wellId]
  if (!lw) throw new Error(`well ${wellId} is not scannable live; use listWells() verdicts`)
  const [meta, imgs] = await Promise.all([fetchJson<LiveWellJson>(lw.json), fetchNuclei(lw.bin)])
  const n = meta.n
  const nuclei: WellNucleus[] = []
  const bag = new Float32Array(n * 202)
  const t0 = performance.now()
  let modelMs = 0
  for (let s = 0; s < n; s += batch) {
    const b = Math.min(batch, n - s)
    const { outs, ms } = await runIonScan(imgs.subarray(s * PX, (s + b) * PX), b)
    modelMs += ms
    const part: WellNucleus[] = outs.map((o, i) => {
      const x = imgs.subarray((s + i) * PX, (s + i + 1) * PX)
      const comps = circlesFromLogits(o.fociLogits, nucleusMask(x))
      bag.set(o.bag, (s + i) * 202)
      return {
        key: meta.keys[s + i], count: comps.length, circles: comps.map((c) => [c.row, c.col] as [number, number]),
        particle: o.particle, dose: o.dose, time: o.time, lambda: o.lambda,
      }
    })
    nuclei.push(...part)
    onProgress?.({ done: s + b, total: n, start: s, batch: part })
  }
  const scanMs = performance.now() - t0
  const mil = await runMil(bag, n)
  const base = await wellBaseline(wellId)
  return {
    wellId, source: 'live', cond: meta.cond, truth: base.truth, nNuclei: n, nuclei, verdict: mil.verdict,
    attention: mil.attention, highlight: topK(mil.attention, 10), mu: nuclei.reduce((a, x) => a + x.lambda, 0) / n,
    mu0: base.mu0, baselineWell: base.baselineWell,
    timing: { scan: { backend, ms: scanMs }, mil: { backend, ms: mil.ms }, perNucleusMs: modelMs / n },
  }
}

/** Precomputed version of analyzeWell() (PyTorch fp32 outputs on the same bytes): "precomputed on our GPU". */
export async function replayWell(wellId: string): Promise<WellResult> {
  const t0 = performance.now()
  const lw = LIVE_WELLS[wellId]
  if (!lw) throw new Error(`well ${wellId} has no per-nucleus replay; use listWells()`)
  const m = await fetchJson<LiveWellJson>(lw.json)
  const base = await wellBaseline(wellId)
  const nuclei: WellNucleus[] = m.keys.map((key, i) => ({
    key, count: m.nuclei.count[i], circles: m.nuclei.circles[i], particle: m.nuclei.particle[i], dose: m.nuclei.dose[i],
    time: m.nuclei.time[i], lambda: m.nuclei.lambda[i],
  }))
  const ms = performance.now() - t0
  return {
    wellId, source: 'precomputed', cond: m.cond, truth: base.truth, nNuclei: m.n, nuclei, verdict: m.verdict,
    attention: m.attention, highlight: m.highlight, mu: m.mu, mu0: base.mu0, baselineWell: base.baselineWell,
    timing: { scan: { backend: 'precomputed', ms }, mil: { backend: 'precomputed', ms: 0 }, perNucleusMs: 0 },
  }
}

// ---- ACT -------------------------------------------------------------------------------------------------
/**
 * The "what to do next" decision of plan section 9 for a whole sample: a live WellResult, a precomputed
 * WellSummary from listWells(), or any { verdict, mu, mu0 }. crewInputs.mu0 overrides the personal baseline.
 */
export function act(result: ActInput | WellResult | WellSummary, crewInputs?: CrewInputs): TrackTraceAct {
  return decide({ verdict: result.verdict, mu: result.mu, mu0: result.mu0 ?? null }, crewInputs)
}

/** The plan's demo timeline ("Crew member A" = donor-A, lab wells standing in for samples), day by day. */
export const DEMO_TIMELINE = [
  { day: 1, wellId: 'P244_G4', note: 'sham 4 h' },
  { day: 2, wellId: 'P243_G4', note: 'Fe 0.3 Gy 4 h' },
  { day: 3, wellId: 'P242_G4', note: 'Fe 0.82 Gy 4 h (scannable live)' },
  { day: 4, wellId: 'P248_G4', note: 'Fe 0.82 Gy 24 h; mu0 from P250_G4 (sham 24 h)' },
] as const

/** Most likely class names of a probability triple set. */
export function topLabels(p: { particle: number[]; dose: number[]; time: number[] }) {
  return {
    particle: PARTICLES[argmax(p.particle)],
    dose: (['sham', 'low', 'high'] as const)[argmax(p.dose)],
    time: (['4 h', '24 h', '48 h'] as const)[argmax(p.time)],
  }
}

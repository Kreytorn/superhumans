// BrainDrift engine: Model B (2.5D brain map, live in the browser) + precomputed Model A (PVS finder) + the simulated
// flight. Plain TypeScript, no UI. See work/Web/models/braindrift.md for the builder brief.
import type { EngineInfo, Timing } from '../types'
import { initInference } from '../../lib/infer/client'
import { assetPath, fetchMeta, fetchVolume, volumeFromBytes } from './assets'
import { decide } from './act'
import { MODEL_BYTES, MODEL_PATH, MODEL_KEY, MODEL_SHA256, loadModelB, segmentVolume, type SegmentProgress } from './model'
import { changePct, classCounts, columnsNearTop, highestPoint, measuredRise, percentileAtOrBelow } from './readouts'
import type {
  BrainDriftAct,
  BrainDriftResult,
  BrainDriftSample,
  BrainMapResult,
  CrewInputs,
  FlightResult,
  MetaCompare,
  MetaFrame,
  PvsResult,
} from './result'

export * from './result'
export { ACT_CAVEATS, VENTRICLE_HOVER_NOISE, VENTRICLE_HOVER_PRELIMINARY, PVS_HIGH_MM3, VENTRICLE_CHANGE_PCT, VERTEX_RISE_MM } from './act'
export { slice, pixelToVoxel, voxelToPixel, planeSize, brainSlices, type SliceImage, type ViewPlane } from './views'
export { setAssetBase, assetPath, assetUrl, fetchMeta, fetchVolume, volumeFromBytes, NI, NJ, NK } from './assets'
export type { SegmentProgress } from './model'

/** Honesty strings that must appear wherever the matching result is shown (verbatim). */
export const HONESTY = {
  simulationBadge: 'SIMULATION',
  flightFrame: 'Simulated flight: a real brain the model never saw, warped by two published numbers: 2.52 mm upward shift (PNAS 2026, one-year crew) and +10.7% ventricles (Roberts 2019, long-duration flights). Two different cohorts; the shape of the deformation is our choice. Not flight data.',
  middleFrames: 'interpolated for illustration, not a measured time course',
  fieldIsInjected: 'Heat map = the injected simulation field, not a model output.',
  modelB: 'Model B learned FreeSurfer labels on 332 OASIS brains, so it reproduces FreeSurfer; it is not better than FreeSurfer and its labels are not manual.',
  modelBTested: 'Ventricle Dice 0.953 on 40 held-out brains (volume r 0.999).',
  modelA: 'PVS finder (Model A): precomputed on a GPU, too large for the browser. PVS Dice 0.867 on 20 held-out people.',
  modelADisclosure: 'encoder pretrained without labels on 114k public brain MRIs that include these test images',
  pvsBand: 'PVS bands are our own rule (top third of 199 ageing adults aged 36-100, not astronauts), not a clinical cut-off.',
  noDiagnosis: 'Not a diagnosis: it does not detect or diagnose SANS or any disease, and it has not been tested on astronaut, low-field or in-flight scans.',
  noOrbitMri: 'There is no MRI in orbit today: this is a pre/post-flight gate and a reader for future portable MRI.',
  noAlignment: 'Real pre/post scans would first need skull alignment; that step is not built.',
  ventricleReference: "OASIS-1 reference, ages 18-96, includes about 100 people with mild-to-moderate Alzheimer's",
  offlineReplay: 'computed offline by the same model',
} as const

export const info: EngineInfo = {
  id: 'braindrift',
  models: [{ key: MODEL_KEY, path: assetPath(MODEL_PATH), bytes: MODEL_BYTES, sha256: MODEL_SHA256 }],
  live: true,
  phoneLive: false,
  notes:
    'Model B (brain map, 16.1 MB) runs live: about 22-23 calls of 8 coronal slices per brain. Model A (PVS) and the flight frames, field and meshes are precomputed. Phones: replay() (stored segmentations) or analyzeSlice() for a single slice.',
}

let loadMs: number | undefined

/** Loads Model B (the only browser model). */
export async function load(onProgress?: (p: { stage: string; ms?: number }) => void): Promise<{ backend: string; ms: number }> {
  onProgress?.({ stage: 'init' })
  const env = await initInference()
  onProgress?.({ stage: 'model' })
  const r = await loadModelB(assetPath(MODEL_PATH))
  loadMs = r.ms
  onProgress?.({ stage: 'ready', ms: r.ms })
  return { backend: env.backend, ms: r.ms }
}

export async function listSamples(): Promise<BrainDriftSample[]> {
  const m = await fetchMeta()
  const out: BrainDriftSample[] = []
  for (const f of m.flight.frames) {
    out.push({
      id: f.id,
      kind: 'flight',
      label: f.f === 0 ? 'Pre-flight (real held-out brain)' : f.f === 1 ? 'Post-flight (simulated)' : `Simulated, f = ${f.f} (illustration)`,
      heldOut: true,
      meta: { f: f.f, citedNumbers: f.citedNumbers, simulation: f.f > 0, frameLabel: f.label, live: true },
    })
  }
  for (const c of m.compare) {
    out.push({ id: c.id, kind: 'compare', label: c.id === 'brain-small' ? 'Smallest ventricles (test set)' : 'Largest ventricles (test set)', heldOut: true, meta: { role: c.role, live: true } })
  }
  for (const p of m.pvs.samples) {
    out.push({ id: p.id, kind: 'pvs', label: `PVS ${p.role}`, heldOut: true, meta: { role: p.role, live: false, model: 'Model A (precomputed)' } })
  }
  return out
}

async function findSample(id: string): Promise<{ frame?: MetaFrame; compare?: MetaCompare; pvs?: PvsResult }> {
  const m = await fetchMeta()
  const frame = m.flight.frames.find((f) => f.id === id)
  if (frame) return { frame }
  const compare = m.compare.find((c) => c.id === id)
  if (compare) return { compare }
  const p = m.pvs.samples.find((s) => s.id === id)
  if (p) {
    return {
      pvs: {
        kind: 'pvs',
        sampleId: p.id,
        role: p.role,
        modelMm3: p.modelMm3,
        expertMm3: p.expertMm3,
        modelChannels: p.modelChannels,
        expertChannels: p.expertChannels,
        modelBand: p.modelBand,
        expertBand: p.expertBand,
        modelPercentile: p.modelPercentile,
        expertPercentile: p.expertPercentile,
        dice: p.dice,
        bandCutsMm3: m.pvs.bandCutsMm3,
        meshes: p.meshes,
        axial: p.axial,
        live: false,
        timing: { backend: 'precomputed', ms: 0 },
      },
    }
  }
  throw new Error(`braindrift: unknown sample "${id}"`)
}

function median(a: number[]): number {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const h = s.length >> 1
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

async function brainMapFrom(
  sampleId: string,
  volume: Uint8Array,
  seg: Uint8Array,
  extra: Partial<BrainMapResult> & { timing: BrainMapResult['timing']; live: boolean },
): Promise<BrainMapResult> {
  const m = await fetchMeta()
  const { perClass, ventriclePerSlice } = classCounts(seg)
  const ventricleMl = perClass[1] / 1000
  return {
    kind: 'brainmap',
    sampleId,
    volume,
    seg,
    classMl: perClass.map((n) => n / 1000),
    ventricleMl,
    ventricleVoxels: perClass[1],
    ventriclePerSlice,
    ventricleRefPercentile: percentileAtOrBelow(m.reference.ventricles.volumesMlSorted, ventricleMl),
    top: null,
    highest: null,
    slicesRun: [],
    sliceMinMargin: null,
    softmax: new Map(),
    ...extra,
  }
}

export interface AnalyzeOptions {
  onProgress?: (p: SegmentProgress) => void
  /** Keep the full softmax for these coronal slices (probability / uncertainty views). */
  keepSoftmaxOf?: number[]
}

const liveCache = new Map<string, Promise<BrainMapResult>>()

/** Runs Model B live on a crop (sample id or user bytes). */
export async function analyzeBrain(input: string | { id?: string; bytes: Uint8Array }, opts: AnalyzeOptions = {}): Promise<BrainMapResult> {
  await load()
  const env = await initInference()
  let id: string
  let volume: Uint8Array
  let reference: BrainMapResult['reference']
  if (typeof input === 'string') {
    id = input
    const s = await findSample(id)
    const path = s.frame?.volume ?? s.compare?.volume
    if (!path) throw new Error(`braindrift: "${id}" is not a brain crop (Model A PVS results are precomputed; use analyze())`)
    volume = await fetchVolume(path)
    reference = s.frame
      ? { storedVentricleMl: s.frame.storedVentricleMl }
      : { storedVentricleMl: s.compare!.storedVentricleMl, freesurferVentricleMl: s.compare!.freesurferVentricleMl, ventricleDiceVsFreesurfer: s.compare!.ventricleDiceVsFreesurfer }
  } else {
    id = input.id ?? 'user-crop'
    volume = await volumeFromBytes(input.bytes)
  }
  const out = await segmentVolume(volume, { onProgress: opts.onProgress, keepSoftmaxOf: opts.keepSoftmaxOf })
  const result = await brainMapFrom(id, volume, out.seg, {
    top: out.top,
    highest: highestPoint(out.top),
    slicesRun: out.slicesRun,
    sliceMinMargin: out.sliceMinMargin,
    softmax: out.softmax,
    reference,
    live: true,
    timing: { backend: env.backend, ms: out.ms, loadMs, calls: out.calls, msPerCallMedian: median(out.msPerCall) },
  })
  // shipped samples are remembered so analyzeFlight() can reuse the pre scan
  if (typeof input === 'string') liveCache.set(id, Promise.resolve(result))
  return result
}

function cachedBrain(id: string, opts: AnalyzeOptions): Promise<BrainMapResult> {
  let p = liveCache.get(id)
  if (!p) {
    p = analyzeBrain(id, opts)
    liveCache.set(id, p)
    p.catch(() => liveCache.delete(id))
  }
  return p
}

/** Live flight measurement: Model B on the pre frame (f000, cached) and on the chosen frame, then change % and rise. */
export async function analyzeFlight(frameId: string, opts: AnalyzeOptions = {}): Promise<FlightResult> {
  const m = await fetchMeta()
  const frame = m.flight.frames.find((f) => f.id === frameId)
  if (!frame) throw new Error(`braindrift: "${frameId}" is not a flight frame`)
  const preId = m.flight.frames[0].id
  const t0 = performance.now()
  // the pre scan is measured once and cached; the chosen frame always runs live (so onProgress animates every time)
  const pre = await cachedBrain(preId, frameId === preId ? opts : {})
  const post = frameId === preId ? pre : await analyzeBrain(frameId, opts)
  const cols = columnsNearTop(pre.top!)
  const rise = measuredRise(pre.top!, post.top!, cols)
  return {
    kind: 'flight',
    sampleId: frameId,
    f: frame.f,
    badge: 'SIMULATION',
    frameLabel: frame.label,
    citedNumbers: frame.citedNumbers,
    pre,
    post,
    measured: { ventricleChangePct: changePct(post.ventricleVoxels, pre.ventricleVoxels), riseMm: rise.mm, riseColumns: rise.columns },
    injected: { ventricleChangePct: frame.injectedVentricleChangePct, riseMm: frame.injectedRiseMm },
    stored: { ventricleChangePct: frame.storedVentricleChangePct, riseMm: frame.storedRiseMm, ventricleMl: frame.storedVentricleMl },
    riseColumnsMask: cols,
    live: true,
    timing: { backend: post.timing.backend, ms: performance.now() - t0 },
  }
}

/**
 * Runs the real model. Flight frames -> FlightResult (pre f000 + this frame, live); compare brains or user bytes ->
 * BrainMapResult (live); PVS samples -> PvsResult (Model A is precomputed: no browser model exists for it).
 */
export async function analyze(input: string | { id?: string; bytes: Uint8Array }, opts: AnalyzeOptions = {}): Promise<BrainDriftResult> {
  if (typeof input !== 'string') return analyzeBrain(input, opts)
  const s = await findSample(input)
  if (s.pvs) return s.pvs
  if (s.frame) return analyzeFlight(input, opts)
  return analyzeBrain(input, opts)
}

let sliceVol: { path: string; vol: Promise<Uint8Array> } | null = null

/** One coronal slice live (one model call with its two neighbours): cheap enough for scrubbing and for phones. */
export async function analyzeSlice(sampleId: string, k: number): Promise<{ k: number; softmax: Float32Array; seg: Uint8Array; ms: number; backend: string }> {
  await load()
  const env = await initInference()
  const s = await findSample(sampleId)
  const path = s.frame?.volume ?? s.compare?.volume
  if (!path) throw new Error(`braindrift: "${sampleId}" has no crop`)
  // one-entry crop cache: scrubbing calls this once per slice, and each fetch + gunzip of a crop is 6.4 MB
  if (sliceVol?.path !== path) sliceVol = { path, vol: fetchVolume(path) }
  const volume = await sliceVol.vol.catch((e) => {
    sliceVol = null
    throw e
  })
  const out = await segmentVolume(volume, { onlySlices: [k], keepSoftmaxOf: [k] })
  // a slice without brain is not run (browser rule): it is background with probability 1
  const sm = out.softmax.get(k) ?? new Float32Array(6 * 176 * 176).fill(1, 0, 176 * 176)
  // argmax image [176 x 176], index i*176 + j (use views.ts conventions to draw)
  const seg = new Uint8Array(176 * 176)
  for (let q = 0; q < seg.length; q++) seg[q] = out.seg[q * 208 + k]
  return { k, softmax: sm, seg, ms: out.ms, backend: env.backend }
}

/** The same result shapes from stored outputs (no model): for phones and fallbacks. Rise uses the stored value. */
export async function replay(sampleId: string): Promise<BrainDriftResult> {
  const s = await findSample(sampleId)
  if (s.pvs) return s.pvs
  const timing: BrainMapResult['timing'] = { backend: 'precomputed', ms: 0, calls: 0, msPerCallMedian: 0 }
  const t0 = performance.now()
  if (s.compare) {
    const [volume, seg] = await Promise.all([fetchVolume(s.compare.volume), fetchVolume(s.compare.seg)])
    return brainMapFrom(sampleId, volume, seg, {
      live: false,
      timing: { ...timing, ms: performance.now() - t0 },
      reference: { storedVentricleMl: s.compare.storedVentricleMl, freesurferVentricleMl: s.compare.freesurferVentricleMl, ventricleDiceVsFreesurfer: s.compare.ventricleDiceVsFreesurfer },
    })
  }
  const m = await fetchMeta()
  const f0 = m.flight.frames[0]
  const frame = s.frame!
  const [v0, s0, v1, s1] = await Promise.all([fetchVolume(f0.volume), fetchVolume(f0.seg), fetchVolume(frame.volume), fetchVolume(frame.seg)])
  const pre = await brainMapFrom(f0.id, v0, s0, { live: false, timing, reference: { storedVentricleMl: f0.storedVentricleMl } })
  const post = await brainMapFrom(frame.id, v1, s1, { live: false, timing, reference: { storedVentricleMl: frame.storedVentricleMl } })
  const result: FlightResult = {
    kind: 'flight',
    sampleId,
    f: frame.f,
    badge: 'SIMULATION',
    frameLabel: frame.label,
    citedNumbers: frame.citedNumbers,
    pre,
    post,
    measured: { ventricleChangePct: changePct(post.ventricleVoxels, pre.ventricleVoxels), riseMm: frame.storedRiseMm, riseColumns: frame.storedRiseColumns },
    injected: { ventricleChangePct: frame.injectedVentricleChangePct, riseMm: frame.injectedRiseMm },
    stored: { ventricleChangePct: frame.storedVentricleChangePct, riseMm: frame.storedRiseMm, ventricleMl: frame.storedVentricleMl },
    riseColumnsMask: null,
    live: false,
    timing: { backend: 'precomputed', ms: performance.now() - t0 } satisfies Timing,
  }
  return result
}

/** The module's "what to do next" (plan 05 section 9 / SCREENS 5.5). */
export function act(result: BrainDriftResult | null, crewInputs?: CrewInputs): BrainDriftAct {
  return decide(result, crewInputs)
}

/** Drops cached live results (they hold ~14 MB per brain). */
export function clearCache() {
  liveCache.clear()
  sliceVol = null
}

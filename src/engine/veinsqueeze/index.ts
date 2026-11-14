// VeinSqueeze engine: leg-vein compression ultrasound clip in, clot probability (AI second opinion, screening only),
// 32-frame evidence strip and vein-site guess out; plus the precomputed SAM 2 squeeze curve (explanation layer)
// and the NASA VTE ACT card. Pure TypeScript, no UI. Model: veinsqueeze_fold0.onnx (held-out fold-0 model).
import { initInference, loadModel, runModel } from '../../lib/infer/client'
import type { EngineInfo, Timing } from '../types'
import { act, vteScore, SYMPTOM_LABEL, TIERS } from './act'
import { HONESTY_HERO_PAIR, HONESTY_HONEST_ERROR, HONESTY_RESULT, HONESTY_STRIP, HONESTY_USER_INPUT, MEASURED } from './honesty'
import { prepareClip, t32SourceFrames, type GreyFrame } from './prep'
import { SITE_NAME, SITE_ORDER, type EvidenceTick, type ExpertLabel, type Point, type SiteCode, type SqueezeBand, type SqueezeCurve, type VsResult, type VsSample } from './types'

export * from './types'
export * from './honesty'
export { act, vteScore, SYMPTOM_LABEL, TIERS }
export { prepareClip, t32SourceFrames, resizeArea, contentBox, activeMask, rgbaToGrey } from './prep'
export type { GreyFrame } from './prep'
export { extractGreyFrames } from './video'

const MOD = 'veinsqueeze/' // samples.json paths are relative to this folder
const MODEL_KEY = 'veinsqueeze'
const MODEL_PATH = 'veinsqueeze/models/veinsqueeze_fold0.onnx'
const T32_BYTES = 32 * 160 * 160

export const info: EngineInfo = {
  id: 'veinsqueeze',
  models: [
    {
      key: MODEL_KEY,
      path: MODEL_PATH,
      bytes: 19793802,
      sha256: 'f46e70f7ee4bb26d09b2acab47b24f2d0689f0302fa12bf1a64d3a9e9a438af6',
    },
  ],
  live: true,
  phoneLive: false,
  notes:
    'uint8 [1,32,160,160] in; clot_prob, frame_clot_prob, frame_attention, site_prob out. Pre-processing (cast, /255, per-clip z-score) is inside the graph. ' +
    'Shipped as level2:main = "AI second opinion" (screening only). SAM 2 squeeze curves are precomputed explanation layers. ' +
    'phoneLive false: a 20 MB model is a heavy phone download; replay() covers phones.',
}

// ---------------------------------------------------------------- configuration and fetch helpers
let base: string | null = null
/** Base URL that "veinsqueeze/..." paths resolve against. Default: document.baseURI (the app root). */
export function configure(opts: { base?: string }) {
  if (opts.base) base = opts.base
}
const url = (p: string) => new URL(p, base ?? document.baseURI).href

async function fetchJson<T>(p: string): Promise<T> {
  const u = url(p)
  const r = await fetch(u)
  // A missing file comes back from an SPA dev server as index.html with HTTP 200, so reject HTML explicitly; a missing
  // content-type (some static or desktop file servers) is accepted.
  if (!r.ok || (r.headers.get('content-type') ?? '').includes('html')) throw new Error(`${u}: HTTP ${r.status}, not JSON`)
  return (await r.json()) as T
}

/** Fetch bytes; transparently gunzips "*.gz" with the browser's DecompressionStream. */
async function fetchBytes(p: string): Promise<Uint8Array> {
  const r = await fetch(url(p))
  if (!r.ok || (r.headers.get('content-type') ?? '').includes('html')) throw new Error(`${p}: HTTP ${r.status}, not the file`)
  if (p.endsWith('.gz') && r.body) {
    const s = r.body.pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(s).arrayBuffer())
  }
  return new Uint8Array(await r.arrayBuffer())
}

// ---------------------------------------------------------------- samples
interface SamplesFile {
  tau: number
  tauFold0: { sensitivity: number; specificity: number; ppv: number; confusion: Record<string, number> }
  siteOrder: SiteCode[]
  decision: string
  notes: string[]
  credits: string[]
  clips: Array<{
    id: string
    letter: VsSample['letter']
    label: string
    role: string
    slot: string
    heldOut: boolean
    hospital: string
    scannerBrand: string
    expert: { thrombosis: 0 | 1; compressibility: 0 | 1 | 2; site: SiteCode; site_name: string }
    fps: number
    frames: number
    durS: number
    cropWh: [number, number]
    videoWh: [number, number]
    videoScaleXy: [number, number]
    video: string
    t32: string
    pred: string
    sam2: string | null
    sam2Band: SqueezeBand | null
    sam2RMin: number | null
  }>
}

const ROLE_TEXT: Record<string, string> = {
  hero_clot: 'clot clip (hero pair, same patient as Clip B)',
  hero_clean: 'clean clip (hero pair, same patient as Clip A)',
  clot2: 'second clot clip',
  clean2: 'second clean clip, textbook squeeze',
  partial: 'partly blocked vein (partial clot)',
  honest_error: 'one the model gets wrong (false alarm)',
}

let samplesCache: Promise<{ file: SamplesFile; samples: VsSample[] }> | null = null
function samplesData() {
  if (!samplesCache)
    samplesCache = fetchJson<SamplesFile>('veinsqueeze/meta/samples.json').then((file) => ({
      file,
      samples: file.clips.map(
        (c): VsSample => ({
          id: c.id,
          label: c.label,
          heldOut: c.heldOut,
          meta: { role: ROLE_TEXT[c.role] ?? c.role, hospital: c.hospital, scanner: c.scannerBrand, seconds: c.durS },
          letter: c.letter,
          role: c.role,
          hospital: c.hospital,
          scannerBrand: c.scannerBrand,
          expert: toExpert(c.expert),
          fps: c.fps,
          frames: c.frames,
          durS: c.durS,
          cropWh: c.cropWh,
          videoWh: c.videoWh,
          videoScaleXy: c.videoScaleXy,
          urls: { video: url(MOD + c.video), t32: url(MOD + c.t32), pred: url(MOD + c.pred), sam2: c.sam2 ? url(MOD + c.sam2) : null },
          sam2Band: c.sam2Band,
          sam2RMin: c.sam2RMin,
        }),
      ),
    }))
  return samplesCache
}

function toExpert(e: { thrombosis: 0 | 1; compressibility: 0 | 1 | 2; site: SiteCode }): ExpertLabel {
  return { thrombosis: e.thrombosis, compressibility: e.compressibility, site: e.site, siteName: SITE_NAME[e.site] }
}

/** The six shipped demo clips (Clip A-F), all held-out fold-0 patients. No personal data. */
export async function listSamples(): Promise<VsSample[]> {
  return (await samplesData()).samples
}

async function getSample(id: string): Promise<VsSample> {
  const s = (await listSamples()).find((x) => x.id === id || x.letter === id)
  if (!s) throw new Error(`unknown VeinSqueeze sample "${id}"`)
  return s
}

/** The exact stored model input of a sample: uint8 [32*160*160]. */
export async function sampleInput(id: string): Promise<Uint8Array> {
  const s = await getSample(id)
  const b = await fetchBytes(s.urls.t32)
  if (b.length !== T32_BYTES) throw new Error(`t32 has ${b.length} bytes, expected ${T32_BYTES}`)
  return b
}

// ---------------------------------------------------------------- SAM 2 curve (precomputed explanation layer)
interface Sam2File {
  frames: number
  fps: number
  t_s: number[]
  frame_wh: [number, number]
  clicks: { click_frame: number; vein: Point; artery: Point | null }
  pct: number[]
  pct_med5: number[]
  r_min: number
  t_min_frame: number
  t_min_s: number
  band: SqueezeBand
  band_rule: string
  presence_logit: number[]
  outline: Point[][]
  check_frames: number[]
  tag: string
  model_id: string
  video_wh?: [number, number]
  video_scale_xy?: [number, number]
  videos?: { wh: [number, number] }
}

const sam2Cache = new Map<string, Promise<SqueezeCurve>>()
/** Load a SAM 2 squeeze curve from a shipped JSON path (clips: sample.urls.sam2; neck: "veinsqueeze/neck/gillman_sam2.json"). */
export function loadSqueeze(path: string): Promise<SqueezeCurve> {
  let p = sam2Cache.get(path)
  if (!p) {
    p = fetch(new URL(path, base ?? document.baseURI).href)
      .then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
        return r.json() as Promise<Sam2File>
      })
      .then((s) => {
        const sxy = s.video_scale_xy ?? [1, 1]
        const vwh = s.video_wh ?? s.videos?.wh ?? s.frame_wh
        return {
          frames: s.frames,
          fps: s.fps,
          tS: s.t_s,
          pct: s.pct,
          pctMed5: s.pct_med5,
          rMin: s.r_min,
          tMinFrame: s.t_min_frame,
          tMinS: s.t_min_s,
          band: s.band,
          bandRule: s.band_rule,
          presenceLogit: s.presence_logit,
          outlineCrop: s.outline,
          outlineVideo: s.outline.map((poly) => poly.map(([x, y]) => [x * sxy[0], y * sxy[1]] as Point)),
          clicks: { clickFrame: s.clicks.click_frame, vein: s.clicks.vein, artery: s.clicks.artery },
          checkFrames: s.check_frames,
          frameWh: s.frame_wh,
          videoWh: vwh,
          tag: s.tag,
          modelId: s.model_id,
        }
      })
    sam2Cache.set(path, p)
  }
  return p
}

/** Real neck-vein squeeze (Gillman 2010, CC BY 2.0): SAM 2 outline and curve. Demo only, never a model verdict. */
export const NECK = {
  gillman: { json: 'veinsqueeze/neck/gillman_sam2.json', video: 'veinsqueeze/neck/gillman_clip.webm', videoOutlined: 'veinsqueeze/neck/gillman_clip_sam2.webm' },
  segthy: { json: 'veinsqueeze/neck/segthy_area.json', video: 'veinsqueeze/neck/segthy_sweep.webm', videoPlain: 'veinsqueeze/neck/segthy_sweep_plain.webm' },
  metrics: 'veinsqueeze/meta/metrics.json',
} as const
/** Resolve a shipped "veinsqueeze/..." path to an absolute URL. */
export const assetUrl = url

// ---------------------------------------------------------------- model
let loaded: Promise<{ ms: number; backend: Timing['backend'] }> | null = null

/** Loads the 20 MB model (WebGPU first, wasm fallback). onProgress gets 0..1 (download progress is coarse). */
export function load(onProgress?: (p: number) => void): Promise<{ ms: number; backend: Timing['backend'] }> {
  if (!loaded) {
    loaded = (async () => {
      onProgress?.(0)
      const env = await initInference()
      onProgress?.(0.1)
      const r = await loadModel(MODEL_KEY, url(MODEL_PATH))
      onProgress?.(1)
      return { ms: r.ms, backend: env.backend }
    })()
    loaded.catch(() => (loaded = null))
  }
  return loaded
}

interface RawOut {
  clotProb: number
  frameClotProb: number[]
  frameAttention: number[]
  siteProb: number[]
}

async function runRaw(t32: Uint8Array): Promise<{ out: RawOut; timing: Timing }> {
  if (t32.length !== T32_BYTES) throw new Error(`model input must be ${T32_BYTES} bytes`)
  const { backend } = await load()
  const r = await runModel(MODEL_KEY, { frames_u8: { type: 'uint8', dims: [1, 32, 160, 160], data: t32.slice() } })
  const f = (k: string) => Array.from(r.outputs[k].data as Float32Array)
  return {
    out: { clotProb: f('clot_prob')[0], frameClotProb: f('frame_clot_prob'), frameAttention: f('frame_attention'), siteProb: f('site_prob') },
    timing: { backend, ms: r.ms },
  }
}

function build(
  out: RawOut,
  opts: {
    sample: VsSample | null
    mode: VsResult['mode']
    timing: Timing
    tau: number
    squeeze: SqueezeCurve | null
    sourceFrames: number[] | null
    fps: number | null
    timesS?: number[] | null
    cropBox: VsResult['cropBox']
    modelInput: Uint8Array | null
  },
): VsResult {
  const siteProb = Object.fromEntries(SITE_ORDER.map((c, i) => [c, out.siteProb[i]])) as Record<SiteCode, number>
  let top = 0
  for (let i = 1; i < 4; i++) if (out.siteProb[i] > out.siteProb[top]) top = i
  const sf = opts.sourceFrames
  const ticks: EvidenceTick[] = out.frameClotProb.map((p, i) => ({
    index: i,
    clotProb: p,
    attention: out.frameAttention[i],
    sourceFrame: sf ? sf[i] : null,
    tS: sf
      ? opts.squeeze
        ? opts.squeeze.tS[sf[i]]
        : opts.timesS
          ? (opts.timesS[sf[i]] ?? null)
          : opts.fps
            ? sf[i] / opts.fps
            : null
      : null,
  }))
  const honesty: string[] = [...HONESTY_RESULT, HONESTY_STRIP]
  if (opts.sample?.role === 'honest_error') honesty.push(HONESTY_HONEST_ERROR)
  if (opts.sample?.role === 'hero_clot' || opts.sample?.role === 'hero_clean') honesty.push(HONESTY_HERO_PAIR)
  if (!opts.sample) honesty.push(HONESTY_USER_INPUT)
  return {
    sampleId: opts.sample?.id ?? null,
    mode: opts.mode,
    clotProb: out.clotProb,
    tau: opts.tau,
    aboveTau: out.clotProb >= opts.tau,
    ticks,
    frameClotProb: out.frameClotProb,
    frameAttention: out.frameAttention,
    siteProb,
    site: { code: SITE_ORDER[top], name: SITE_NAME[SITE_ORDER[top]], prob: out.siteProb[top] },
    expert: opts.sample?.expert ?? null,
    squeeze: opts.squeeze,
    cropBox: opts.cropBox,
    modelInput: opts.modelInput,
    timing: opts.timing,
    honesty,
  }
}

/**
 * Runs the REAL model in the browser.
 * - analyze("clip-a") / analyze("A"): a shipped clip (its exact stored model input) + its SAM 2 curve.
 * - analyze({ t32 }): any exact uint8 [32,160,160] model input.
 * - analyze({ frames, timesS }): decoded grey frames of a user clip; runs the vs_prep.py port first. For frames from
 *   extractGreyFrames pass its `timesS` (the seek time of each frame), so ticks[i].tS is the real time in the clip.
 *   ticks[i].sourceFrame is then an index into `frames`. Pass `fps` instead only when `frames` holds EVERY frame.
 */
export async function analyze(
  input: string | { t32: Uint8Array; fps?: number } | { frames: GreyFrame[]; fps?: number; timesS?: number[] },
): Promise<VsResult> {
  const { file } = await samplesData()
  if (typeof input === 'string') {
    const s = await getSample(input)
    const [t32, squeeze] = await Promise.all([sampleInput(s.id), s.urls.sam2 ? loadSqueeze(s.urls.sam2) : Promise.resolve(null)])
    const { out, timing } = await runRaw(t32)
    return build(out, { sample: s, mode: 'live', timing, tau: file.tau, squeeze, sourceFrames: t32SourceFrames(s.frames), fps: s.fps, cropBox: null, modelInput: t32 })
  }
  if ('t32' in input) {
    const { out, timing } = await runRaw(input.t32)
    return build(out, { sample: null, mode: 'live', timing, tau: file.tau, squeeze: null, sourceFrames: null, fps: null, cropBox: null, modelInput: input.t32 })
  }
  const prep = prepareClip(input.frames)
  const { out, timing } = await runRaw(prep.t32)
  return build(out, {
    sample: null,
    mode: 'live',
    timing,
    tau: file.tau,
    squeeze: null,
    sourceFrames: prep.sourceFrames,
    fps: input.fps ?? null,
    timesS: input.timesS ?? null,
    cropBox: prep.box,
    modelInput: prep.t32,
  })
}

interface PredFile {
  clot_prob: number
  tau: number
  frame_clot_prob: number[]
  frame_attention: number[]
  site_prob: Record<SiteCode, number>
}

/** Same result shape from the stored Python outputs (onnxruntime CPU, same shipped model). No model download. */
export async function replay(sampleId: string): Promise<VsResult> {
  const { file } = await samplesData()
  const s = await getSample(sampleId)
  const t0 = performance.now()
  const [p, squeeze] = await Promise.all([
    fetchJson<PredFile>(s.urls.pred),
    s.urls.sam2 ? loadSqueeze(s.urls.sam2) : Promise.resolve(null),
  ])
  const out: RawOut = {
    clotProb: p.clot_prob,
    frameClotProb: p.frame_clot_prob,
    frameAttention: p.frame_attention,
    siteProb: SITE_ORDER.map((c) => p.site_prob[c]),
  }
  return build(out, {
    sample: s,
    mode: 'precomputed',
    timing: { backend: 'precomputed', ms: performance.now() - t0 },
    tau: file.tau,
    squeeze,
    sourceFrames: t32SourceFrames(s.frames),
    fps: s.fps,
    cropBox: null,
    modelInput: null,
  })
}

/** Measured headline numbers (DOMAIN.md, LOG.md); use these, never invent others. */
export const measured = MEASURED

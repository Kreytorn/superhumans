// BubbleGrade engine: real Doppler heart audio -> Spencer bubble grade 0-IV, spacewalk alert, bubble map and the
// spectrogram the model saw. Runs the shipped MobileNetV4 ONNX (rotation 4) through the shared inference worker.
// No React, no DOM rendering. See work/Web/models/bubblegrade.md for the builder brief.
import { initInference, loadModel, runModel } from '../../lib/infer/client'
import type { EngineInfo, Sample, Timing } from '../types'
import { decide, HONESTY, type BubbleActDecision, type CrewInputs } from './act'
import {
  CAM_CELLS,
  CHUNK,
  FRAMES,
  FRAME_HOP,
  FRAME_WIN,
  GRADES,
  MEL_BANDS,
  MODEL_BYTES,
  MODEL_KEY,
  MODEL_NAME,
  MODEL_PARTS,
  MODEL_SHA256,
  SAMPLE_RATE,
  TAU,
  TOO_SHORT,
  WIN,
  type GradeLabel,
} from './constants'
import { bubbleMap, clipStats, cutWindows, gradeProbs, melBandCentresHz, parseWav, quantizeLikePrep, stitch, windowStarts } from './dsp'

export * from './act'
export * from './constants'
export { bubbleMap, gradeProbs, melBandCentresHz, parseWav, stitch, windowStarts } from './dsp'

// ---------- asset paths ----------

let assetBase: string = import.meta.env.BASE_URL
/** Base URL the module's files are served under (default: the Vite base). Pages outside the app root set "/". */
export function setAssetBase(base: string) {
  assetBase = base.endsWith('/') ? base : base + '/'
}
export const assetUrl = (rel: string) => new URL(assetBase + rel, document.baseURI).href

async function fetchBytes(rel: string): Promise<ArrayBuffer> {
  const r = await fetch(assetUrl(rel))
  if (!r.ok) throw new Error(`bubblegrade: ${rel} -> HTTP ${r.status}`)
  return r.arrayBuffer()
}
const fetchJson = async <T>(rel: string): Promise<T> => JSON.parse(new TextDecoder().decode(await fetchBytes(rel))) as T

/** .gz -> bytes with the browser's DecompressionStream (skipped when the host already decoded it). */
export async function gunzip(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const u = new Uint8Array(buf)
  if (!(u[0] === 0x1f && u[1] === 0x8b)) return buf
  const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(ds).arrayBuffer()
}

// ---------- info / samples ----------

export const info: EngineInfo = {
  id: 'bubblegrade',
  models: [{ key: MODEL_KEY, path: `bubblegrade/models/${MODEL_NAME}`, bytes: MODEL_BYTES, sha256: MODEL_SHA256 }],
  live: true,
  phoneLive: false,
  notes:
    'One 29.4 MB fp32 ONNX (MobileNetV4-Conv-Medium, rotation 4) served as two parts (.part00 + .part01) that load() joins and checks against the sha256. ' +
    'Live on WebGPU and wasm on laptops; phones use replay() (precomputed outputs of the same model).',
}

export interface BubbleSample extends Sample {
  meta: {
    technicianGrade: GradeLabel
    modelGrade: GradeLabel
    gradedCorrectly: boolean | 'n/a'
    site: string
    durS: number
    /** Minutes after surfacing when recorded; -1 = not in the archive. */
    minutesAfterSurfacing: number
    dcsDive: boolean
    dcsType: string
    heldOutHow: string
    why: string
  }
  /** Path of the 16 kHz mono int16 WAV (relative to the app base). */
  audio: string
}

interface RawSample {
  id: string
  label: string
  heldOut: boolean
  heldOutHow: string
  technicianGrade: number
  site: string
  durS: number
  minutesAfterSurfacing: number | null
  dcs: boolean
  dcsType: string | null
  modelGrade: GradeLabel
  gradedCorrectly: boolean | null
  why: string
  audio: string
}

let samplesCache: BubbleSample[] | null = null
/** The 6 shipped clips (5 grade examples + the DCS-dive clip). All held out from the shipped model's training. */
export async function listSamples(): Promise<BubbleSample[]> {
  if (samplesCache) return samplesCache
  const raw = await fetchJson<{ samples: RawSample[] }>('bubblegrade/samples.json')
  samplesCache = raw.samples.map((s) => ({
    id: s.id,
    label: s.label,
    heldOut: s.heldOut,
    audio: `bubblegrade/${s.audio}`,
    meta: {
      technicianGrade: GRADES[s.technicianGrade],
      modelGrade: s.modelGrade,
      gradedCorrectly: s.gradedCorrectly ?? 'n/a',
      site: s.site,
      durS: s.durS,
      minutesAfterSurfacing: s.minutesAfterSurfacing ?? -1,
      dcsDive: s.dcs,
      dcsType: s.dcsType ?? '',
      heldOutHow: s.heldOutHow,
      why: s.why,
    },
  }))
  return samplesCache
}

// ---------- load ----------

export interface LoadProgress {
  phase: 'download' | 'verify' | 'session' | 'ready'
  loaded: number
  total: number
}

let loaded: Promise<{ backend: 'webgpu' | 'wasm'; adapter: string | null; loadMs: number; sha256Ok: boolean | null }> | null = null

async function download(onProgress?: (p: LoadProgress) => void): Promise<Uint8Array> {
  const total = MODEL_BYTES
  const out = new Uint8Array(total)
  let off = 0
  for (const part of MODEL_PARTS) {
    const r = await fetch(assetUrl(part.path))
    if (!r.ok || !r.body) throw new Error(`bubblegrade: ${part.path} -> HTTP ${r.status}`)
    const reader = r.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (off + value.length > total) throw new Error('bubblegrade: model parts are larger than expected')
      out.set(value, off)
      off += value.length
      onProgress?.({ phase: 'download', loaded: off, total })
    }
  }
  if (off !== total) throw new Error(`bubblegrade: model is ${off} B, expected ${total} B`)
  return out
}

async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Downloads both model parts, joins them, checks the sha256 and opens the onnxruntime session (WebGPU first,
 * wasm fallback; "#?backend=wasm" in the URL forces wasm). Safe to call many times.
 */
export function load(onProgress?: (p: LoadProgress) => void) {
  if (!loaded) {
    loaded = (async () => {
      const env = await initInference()
      const t0 = performance.now()
      const bytes = await download(onProgress)
      onProgress?.({ phase: 'verify', loaded: MODEL_BYTES, total: MODEL_BYTES })
      const hex = await sha256Hex(bytes)
      if (hex !== null && hex !== MODEL_SHA256) throw new Error(`bubblegrade: model sha256 mismatch (${hex})`)
      onProgress?.({ phase: 'session', loaded: MODEL_BYTES, total: MODEL_BYTES })
      const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' }))
      try {
        await loadModel(MODEL_KEY, url)
      } finally {
        URL.revokeObjectURL(url)
      }
      onProgress?.({ phase: 'ready', loaded: MODEL_BYTES, total: MODEL_BYTES })
      return { backend: env.backend, adapter: env.adapter, loadMs: performance.now() - t0, sha256Ok: hex === null ? null : true }
    })()
    loaded.catch(() => {
      loaded = null
    })
  }
  return loaded
}

// ---------- result types ----------

export interface BubbleWindow {
  index: number
  startSample: number
  /** Window covers [t0, t1) seconds of the clip (5 s). */
  t0: number
  t1: number
  tMid: number
  /** P(grade >= I), P(>= II), P(>= III) = A, P(>= IV) for this 5-s window alone. */
  pGe: [number, number, number, number]
  A: number
  E: number
  g: number
  /** 16 raw bubble-map cells (score contribution of each 0.3125-s cell); their mean is the window score s. */
  cam: number[]
  score: number
}

export interface BubbleSpectrogram {
  rows: number
  cols: number
  /** Row-major [rows][cols]; row 0 = lowest mel band (20 Hz end). Values: per-window normalised log-mel (dB - mean) / 20. */
  data: Float32Array
  /** Column c starts at c * frameHopS seconds (10 ms) and spans frameWinS (25 ms). */
  frameHopS: number
  frameWinS: number
  bandCentresHz: number[]
  /** 'model' = the model's own float output; 'uint8' = precomputed, quantised to 256 levels (display only). */
  precision: 'model' | 'uint8'
}

export interface BubbleResult {
  sampleId: string | null
  source: 'live' | 'precomputed'
  sampleRate: number
  nSamples: number
  durS: number
  windows: BubbleWindow[]
  clip: {
    /** Mean over windows of P(grade >= I..IV). */
    pGe: [number, number, number, number]
    /** P(grade = 0..IV) from the cumulative probabilities. */
    pGrade: number[]
    /** Spacewalk alert probability = mean P(grade >= III). */
    A: number
    P4: number
    /** Expected grade 0..4 (gauge needle). */
    E: number
    /** Predicted grade 0..4 = how many clip-level P(>= k) exceed 0.5. */
    g: number
    grade: GradeLabel
    tau: number
    alert: boolean
  }
  /** Alert line: A per window at the window mid time, with tau. */
  alertCurve: { t: number[]; A: number[]; tau: number }
  /** Bubble map on a fixed grid: value k is sigmoid(mean covering cell + b_3) at time k * stepS. */
  bubbleMap: { stepS: number; values: Float32Array; caption: string }
  spectrogram: BubbleSpectrogram | null
  timing: Timing
  /** Breakdown of timing.ms (live only). */
  timingDetail?: { decodeMs: number; inferMs: number; postMs: number; chunks: number }
  input: { kind: 'sample' | 'file' | 'wave'; note: string; truncatedS?: number }
  caveats: string[]
}

// ---------- analyze ----------

export interface AnalyzeOptions {
  /** Multiply the wave by this factor, then clip to [-1, 1] (the model is loudness-invariant up to clipping). */
  gain?: number
  /** Analyse only [startS, endS) of the clip (must stay >= 5 s). */
  startS?: number
  endS?: number
  /** Cap for long dropped files (default 120 s): the rest is ignored and reported in input.truncatedS. */
  maxSeconds?: number
  /** Skip the spectrogram stitching (saves ~1 MB per 10 s). */
  noSpectrogram?: boolean
}

export type AnalyzeInput = string | Blob | ArrayBuffer | { wave: Float32Array; sampleRate: 16000 }

const OFFLINE_CTX = () => globalThis.OfflineAudioContext as typeof OfflineAudioContext | undefined

async function resampleTo16k(ch0: Float32Array, sr: number): Promise<Float32Array> {
  const Ctx = OFFLINE_CTX()
  if (!Ctx) throw new Error('bubblegrade: this browser cannot resample audio (no OfflineAudioContext)')
  const len = Math.max(1, Math.ceil((ch0.length * SAMPLE_RATE) / sr))
  const ctx = new Ctx(1, len, SAMPLE_RATE)
  const buf = ctx.createBuffer(1, ch0.length, sr)
  buf.copyToChannel(ch0 as Float32Array<ArrayBuffer>, 0)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start()
  return (await ctx.startRendering()).getChannelData(0).slice()
}

/** Any audio file -> 16 kHz mono wave the model reads (channel 0, like bg_prep). */
export async function decodeAudio(buf: ArrayBuffer): Promise<{ wave: Float32Array; note: string }> {
  const wav = parseWav(buf)
  if (wav && wav.int16 && wav.sampleRate === SAMPLE_RATE) {
    return { wave: wav.ch0, note: 'WAV 16-bit PCM at 16 kHz: fed exactly as int16 / 32768 (same path as the shipped clips)' + (wav.channels > 1 ? '; channel 0 of ' + wav.channels : '') }
  }
  if (wav) {
    const y = wav.sampleRate === SAMPLE_RATE ? wav.ch0 : await resampleTo16k(wav.ch0, wav.sampleRate)
    return {
      wave: quantizeLikePrep(y),
      note: `WAV ${wav.bits}-bit ${wav.format} at ${wav.sampleRate} Hz, channel 0 of ${wav.channels}` + (wav.sampleRate === SAMPLE_RATE ? '' : ', resampled to 16 kHz by the browser (training used scipy resample_poly; small differences)'),
    }
  }
  const Ctx = OFFLINE_CTX()
  if (!Ctx) throw new Error('bubblegrade: this browser cannot decode audio')
  const ctx = new Ctx(1, 1, SAMPLE_RATE)
  const ab = await ctx.decodeAudioData(buf.slice(0))
  return { wave: quantizeLikePrep(ab.getChannelData(0)), note: `decoded by the browser (${ab.numberOfChannels} ch at ${ab.sampleRate} Hz, channel 0), resampled to 16 kHz by the browser` }
}

let lastSampleWave: { id: string; wave: Float32Array } | null = null
async function sampleWave(id: string): Promise<Float32Array> {
  if (lastSampleWave?.id === id) return lastSampleWave.wave
  const s = (await listSamples()).find((x) => x.id === id)
  if (!s) throw new Error(`bubblegrade: unknown sample "${id}"`)
  const wav = parseWav(await fetchBytes(s.audio))
  if (!wav || !wav.int16 || wav.sampleRate !== SAMPLE_RATE || wav.channels !== 1) throw new Error(`bubblegrade: ${s.audio} is not 16 kHz mono PCM16`)
  lastSampleWave = { id, wave: wav.ch0 }
  return wav.ch0
}

/** Raw model outputs for a 16 kHz wave (all windows, chunked). */
export async function runWave(wave: Float32Array) {
  const starts = windowStarts(wave.length)
  if (!starts.length) throw new Error(TOO_SHORT)
  const n = starts.length
  const p = new Float32Array(n * 4)
  const cam = new Float32Array(n * CAM_CELLS)
  const logmel = new Float32Array(n * MEL_BANDS * FRAMES)
  let inferMs = 0
  let chunks = 0
  for (let i0 = 0; i0 < n; i0 += CHUNK) {
    const st = starts.slice(i0, i0 + CHUNK)
    const t = performance.now()
    const r = await runModel(MODEL_KEY, { wave: { type: 'float32', dims: [st.length, WIN], data: cutWindows(wave, st) } })
    inferMs += performance.now() - t
    chunks++
    p.set(r.outputs.p_spencer_ge.data as Float32Array, i0 * 4)
    cam.set(r.outputs.cam.data as Float32Array, i0 * CAM_CELLS)
    logmel.set(r.outputs.logmel.data as Float32Array, i0 * MEL_BANDS * FRAMES)
  }
  return { starts, p, cam, logmel, inferMs, chunks }
}

function buildResult(args: {
  sampleId: string | null
  source: 'live' | 'precomputed'
  nSamples: number
  starts: number[]
  p: ArrayLike<number>
  cam: ArrayLike<number>
  spectrogram: BubbleSpectrogram | null
  timing: Timing
  timingDetail?: BubbleResult['timingDetail']
  input: BubbleResult['input']
}): BubbleResult {
  const { starts, p, cam } = args
  const n = starts.length
  const windows: BubbleWindow[] = starts.map((s, i) => {
    const pGe = [p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]] as [number, number, number, number]
    const c = Array.from({ length: CAM_CELLS }, (_, j) => cam[i * CAM_CELLS + j])
    const t0 = s / SAMPLE_RATE
    return {
      index: i,
      startSample: s,
      t0,
      t1: t0 + WIN / SAMPLE_RATE,
      tMid: t0 + WIN / SAMPLE_RATE / 2,
      pGe,
      A: pGe[2],
      E: pGe[0] + pGe[1] + pGe[2] + pGe[3],
      g: pGe.filter((v) => v > 0.5).length,
      cam: c,
      score: c.reduce((a, b) => a + b, 0) / CAM_CELLS,
    }
  })
  const { P, E, g } = clipStats(p, n)
  const caveats: string[] = [HONESTY.card, HONESTY.bubbleMap, HONESTY.context]
  if (args.source === 'precomputed') caveats.push(HONESTY.precomputed)
  if (args.sampleId) caveats.push(HONESTY.footer)
  return {
    sampleId: args.sampleId,
    source: args.source,
    sampleRate: SAMPLE_RATE,
    nSamples: args.nSamples,
    durS: args.nSamples / SAMPLE_RATE,
    windows,
    clip: {
      pGe: P as [number, number, number, number],
      pGrade: gradeProbs(P),
      A: P[2],
      P4: P[3],
      E,
      g,
      grade: GRADES[g],
      tau: TAU,
      alert: P[2] >= TAU,
    },
    alertCurve: { t: windows.map((w) => w.tMid), A: windows.map((w) => w.A), tau: TAU },
    bubbleMap: { stepS: 0.05, values: bubbleMap(cam, starts, args.nSamples, 0.05), caption: HONESTY.bubbleMap },
    spectrogram: args.spectrogram,
    timing: args.timing,
    timingDetail: args.timingDetail,
    input: args.input,
    caveats,
  }
}

/**
 * Runs the REAL model. Input: a sample id from listSamples(), a dropped audio file (Blob / ArrayBuffer; WAV read
 * exactly, other formats via the browser decoder), or a 16 kHz wave. Calls load() if needed.
 */
export async function analyze(input: AnalyzeInput, opts: AnalyzeOptions = {}): Promise<BubbleResult> {
  const tAll = performance.now()
  const env = await load()
  let wave: Float32Array
  let kind: BubbleResult['input']['kind']
  let note: string
  let sampleId: string | null = null
  if (typeof input === 'string') {
    wave = await sampleWave(input)
    kind = 'sample'
    sampleId = input
    note = 'shipped clip, 16 kHz mono int16'
  } else if (input instanceof Blob || input instanceof ArrayBuffer) {
    const d = await decodeAudio(input instanceof Blob ? await input.arrayBuffer() : input)
    wave = d.wave
    kind = 'file'
    note = d.note
  } else {
    wave = input.wave
    kind = 'wave'
    note = '16 kHz wave supplied by the caller'
  }
  let truncatedS: number | undefined
  const a = Math.max(0, Math.round((opts.startS ?? 0) * SAMPLE_RATE))
  let b = Math.min(wave.length, opts.endS !== undefined ? Math.round(opts.endS * SAMPLE_RATE) : wave.length)
  const cap = Math.round((opts.maxSeconds ?? (kind === 'sample' ? Infinity : 120)) * SAMPLE_RATE)
  if (b - a > cap) {
    truncatedS = (b - a - cap) / SAMPLE_RATE
    b = a + cap
  }
  if (a > 0 || b < wave.length) {
    wave = wave.subarray(a, b)
    sampleId = null
    note += `; range ${(a / SAMPLE_RATE).toFixed(2)}-${(b / SAMPLE_RATE).toFixed(2)} s`
  }
  if (opts.gain !== undefined && opts.gain !== 1) {
    const g = opts.gain
    const w2 = new Float32Array(wave.length)
    for (let i = 0; i < wave.length; i++) w2[i] = Math.max(-1, Math.min(1, wave[i] * g))
    wave = w2
    sampleId = null
    note += `; gain x${g} then clipped to [-1, 1]`
  }
  if (wave.length < WIN) throw new Error(TOO_SHORT)
  const decodeMs = performance.now() - tAll
  const out = await runWave(wave)
  const tPost = performance.now()
  const spectrogram: BubbleSpectrogram | null = opts.noSpectrogram
    ? null
    : { rows: MEL_BANDS, ...stitch(out.logmel, out.starts), frameHopS: FRAME_HOP / SAMPLE_RATE, frameWinS: FRAME_WIN / SAMPLE_RATE, bandCentresHz: melBandCentresHz(), precision: 'model' }
  const res = buildResult({
    sampleId,
    source: 'live',
    nSamples: wave.length,
    starts: out.starts,
    p: out.p,
    cam: out.cam,
    spectrogram,
    timing: { backend: env.backend, ms: 0 },
    input: { kind, note, truncatedS },
  })
  const postMs = performance.now() - tPost
  res.timing.ms = performance.now() - tAll
  res.timingDetail = { decodeMs, inferMs: out.inferMs, postMs, chunks: out.chunks }
  return res
}

// ---------- replay ----------

interface Precomputed {
  id: string
  nSamples: number
  windowStarts: number[]
  pSpencerGe: number[][]
  cam: number[][]
  spec: { file: string; rows: number; cols: number; lo: number; hi: number }
}

/** Same result shape from the stored PyTorch outputs of the same model (for phones and fallbacks). No model load. */
export async function replay(sampleId: string, opts: { noSpectrogram?: boolean } = {}): Promise<BubbleResult> {
  const t0 = performance.now()
  const pre = await fetchJson<Precomputed>(`bubblegrade/precomputed/${sampleId}.json`)
  let spectrogram: BubbleSpectrogram | null = null
  if (!opts.noSpectrogram) {
    const u8 = new Uint8Array(await gunzip(await fetchBytes(`bubblegrade/${pre.spec.file}`)))
    if (u8.length !== pre.spec.rows * pre.spec.cols) throw new Error('bubblegrade: precomputed spectrogram has the wrong size')
    const data = new Float32Array(u8.length)
    const k = (pre.spec.hi - pre.spec.lo) / 255
    for (let i = 0; i < u8.length; i++) data[i] = pre.spec.lo + u8[i] * k
    spectrogram = { rows: pre.spec.rows, cols: pre.spec.cols, data, frameHopS: FRAME_HOP / SAMPLE_RATE, frameWinS: FRAME_WIN / SAMPLE_RATE, bandCentresHz: melBandCentresHz(), precision: 'uint8' }
  }
  const res = buildResult({
    sampleId,
    source: 'precomputed',
    nSamples: pre.nSamples,
    starts: pre.windowStarts,
    p: pre.pSpencerGe.flat(),
    cam: pre.cam.flat(),
    spectrogram,
    timing: { backend: 'precomputed', ms: 0 },
    input: {
      kind: 'sample',
      note: 'stored PyTorch per-window outputs of the shipped model (showcase.json, r2); spectrogram from an ONNX Runtime CPU run of the same model, quantised to uint8',
    },
  })
  res.timing.ms = performance.now() - t0
  return res
}

// ---------- act ----------

/** The "what to do next" card for a result (plan §9, row A). Symptoms always escalate; the highest tier wins. */
export function act(result: Pick<BubbleResult, 'clip'>, crewInputs?: CrewInputs): BubbleActDecision {
  return decide({ g: result.clip.g, A: result.clip.A, P4: result.clip.P4 }, crewInputs, result.clip.tau)
}

// ---------- self-check ----------

/** Plan §8.1 parity at load: runs one shipped clip live and compares with the stored PyTorch outputs. */
export async function selfCheck(sampleId = 'grade-0') {
  const [live, stored] = await Promise.all([analyze(sampleId, { noSpectrogram: true }), replay(sampleId, { noSpectrogram: true })])
  let maxAbsDiff = 0
  live.windows.forEach((w, i) => w.pGe.forEach((v, k) => (maxAbsDiff = Math.max(maxAbsDiff, Math.abs(v - stored.windows[i].pGe[k])))))
  return { sampleId, backend: live.timing.backend, maxAbsDiff, pass: maxAbsDiff < 1e-3 && live.clip.g === stored.clip.g && live.clip.alert === stored.clip.alert, ms: live.timing.ms }
}

// Garn Meter engine: CorrFuse-EEG (garn.onnx) on 4 s windows of 14-channel EEG -> motion-sickness estimate in Garns.
// Tier C: the crew member's own 1-7 check-in drives the zones; the EEG estimate is shown as experimental only.
// Pre/post-processing ported from work/ModelExamples/scripts/garnmeter_example.py (verified on CPU in r2).
import { initInference, loadModel, runModel } from '../../lib/infer/client'
import type { EngineInfo, Sample, Timing } from '../types'
import { decide, decideTimeline, STRINGS } from './act'
import { assetPath, loadSessionData, loadStoredOutputs, type SessionData } from './data'
import {
  BASELINE_LEN,
  binsFromCum,
  buildBatch,
  emaSeries,
  FS,
  gaussian,
  holdZones,
  madSigma,
  N_CH,
  REF_WINDOW_START,
  spearman,
  WIN,
  WINDOW_ENDS_S,
} from './dsp'
import type { GarnCaptions, GarnCrewInputs, GarnOutputs, GarnResult, GarnTrial, GarnWindow, SigmaCheck } from './result'

export * from './result'
export { couplingChange, type CouplingPair } from './dsp'
export { checkinZone, SOURCES, STRINGS } from './act'
export { setAssetBase, type Card } from './data'

const MODEL_KEY = 'garnmeter/garn'
const MODEL_PATH = 'models/garn.onnx'
const SESSION_ID = 'user19-s3'

export const info: EngineInfo = {
  id: 'garnmeter',
  models: [{ key: MODEL_KEY, path: 'garnmeter/models/garn.onnx', bytes: 522182, sha256: '0a933015d0d5ff234d4f8d4615c3710eabe6d99044596b4f1be8007e4275e828' }],
  live: true,
  phoneLive: true,
  notes:
    'CorrFuse-EEG, 137,852 parameters, 0.52 MB, opset 17. Input eeg float32 [N,14,512] (microvolts / per-channel baseline spread). ' +
    'Outputs p_cum [N,3], garn [N,1], coupling [N,14,14]. Tier C: the check-in drives the zones; the EEG line is experimental.',
}

let loaded: Promise<{ backend: 'webgpu' | 'wasm'; adapter: string | null; loadMs: number }> | null = null

/** Loads the model and the demo session. onProgress(fraction 0-1, what). */
export function load(onProgress?: (f: number, what: string) => void) {
  if (!loaded) {
    loaded = (async () => {
      const t0 = performance.now()
      const env = await initInference()
      onProgress?.(0.02, `inference backend: ${env.backend}`)
      await loadSessionData(onProgress)
      onProgress?.(0.6, 'model')
      await loadModel(MODEL_KEY, assetPath(MODEL_PATH))
      onProgress?.(1, 'ready')
      return { backend: env.backend, adapter: env.adapter, loadMs: performance.now() - t0 }
    })()
    loaded.catch(() => (loaded = null))
  }
  return loaded
}

/** The shipped demo inputs: the whole session, and each of its 27 trials on its own. */
export async function listSamples(): Promise<Sample[]> {
  const { meta } = await loadSessionData()
  const out: Sample[] = [
    {
      id: SESSION_ID,
      label: `${meta.label}: 8 s calibration + 27 VR scenes (224 s)`,
      heldOut: true,
      meta: { trials: meta.trials.length, windows: meta.trials.length * WINDOW_ENDS_S.length, seconds: meta.n_samples / meta.fs },
    },
  ]
  for (const t of meta.trials)
    out.push({
      id: trialId(t.index),
      label: `${meta.label}, trial ${t.index}: ${t.cue} level ${t.level}, reported IDS ${t.ids}`,
      heldOut: true,
      meta: { trial: t.index, cue: t.cue, level: t.level, ids: t.ids, garnReported: t.garn_reported },
    })
  return out
}

function trialId(i: number) {
  return `${SESSION_ID}-t${String(i).padStart(2, '0')}`
}

/** Which trials a sample id covers. */
function trialsOf(d: SessionData, sampleId: string): number[] {
  if (sampleId === SESSION_ID) return d.meta.trials.map((t) => t.index)
  const m = /^user19-s3-t(\d{2})$/.exec(sampleId)
  const i = m ? Number(m[1]) : NaN
  if (!d.meta.trials.some((t) => t.index === i)) throw new Error(`garnmeter: unknown sample ${sampleId}`)
  return [i]
}

interface WindowSpec {
  trial: number
  endS: number
  startSample: number
}

function standardWindows(d: SessionData, trials: number[]): WindowSpec[] {
  const out: WindowSpec[] = []
  for (const ti of trials) {
    const t = d.meta.trials.find((x) => x.index === ti)!
    for (const e of WINDOW_ENDS_S) out.push({ trial: ti, endS: e, startSample: t.start + Math.round(e * FS) - WIN })
  }
  return out
}

function sigmaFor(eeg: Float32Array, n: number, stored: number[] | null): SigmaCheck {
  const computed = madSigma(eeg, n, 0, BASELINE_LEN)
  if (!stored) return { computed, stored: null, maxRelDiff: null, used: 'computed' }
  const maxRelDiff = Math.max(...computed.map((v, i) => Math.abs(v - stored[i]) / stored[i]))
  const used = maxRelDiff > 1e-3 ? 'stored' : 'computed'
  if (used === 'stored') console.warn(`garnmeter: browser sigma differs from stored by ${(maxRelDiff * 100).toFixed(3)}%; using the stored values`)
  return { computed, stored, maxRelDiff, used }
}

function splitOutputs(o: Record<string, { data: unknown; dims: number[] }>, n: number): GarnOutputs[] {
  const p = o.p_cum.data as Float32Array
  const g = o.garn.data as Float32Array
  const c = o.coupling.data as Float32Array
  const out: GarnOutputs[] = []
  for (let i = 0; i < n; i++)
    out.push({ pCum: [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], garn: g[i], coupling: c.slice(i * 196, (i + 1) * 196) })
  return out
}

function captions(d: SessionData, precomputed: boolean, label: string): GarnCaptions {
  return {
    personLabel: label,
    eegLine: STRINGS.eegLine,
    precomputedLabel: precomputed ? STRINGS.precomputedLabel : null,
    playback: STRINGS.playback,
    couplingCaption: STRINGS.couplingCaption,
    garnDefinition: STRINGS.garnDefinition,
    greenCaption: STRINGS.greenCaption,
    context: STRINGS.context,
    resultCard: d.card.result_card_sentence,
    badge: d.card.shipped.badge,
  }
}

/** Assembles the UI-ready result from model outputs (live or stored). */
function assemble(
  d: SessionData,
  sampleId: string,
  label: string,
  specs: WindowSpec[],
  outs: GarnOutputs[],
  baseline: GarnOutputs,
  sigma: SigmaCheck,
  timing: Timing,
  topo: boolean,
): GarnResult {
  const { G_y, G_r } = d.meta.model
  const ema = emaSeries(outs.map((o) => o.garn))
  const zones = holdZones(ema, G_y, G_r)
  const topoMap = new Map(d.topomap.windows.map((w) => [`${w.trial}@${w.end_s}`, w]))
  const windows: GarnWindow[] = specs.map((s, i) => {
    const o = outs[i]
    const tm = topo ? topoMap.get(`${s.trial}@${s.endS}`) : undefined
    return {
      index: i,
      trial: s.trial,
      endS: s.endS,
      startSample: s.startSample,
      pCum: o.pCum,
      pSick: o.pCum[0],
      pBins: binsFromCum(o.pCum),
      garn: o.garn,
      garnEma: ema[i],
      eegZone: zones[i],
      coupling: o.coupling,
      theta: tm ? tm.theta : null,
      gamma: tm ? tm.gamma : null,
    }
  })
  const trials: GarnTrial[] = d.meta.trials.map((t) => {
    const idx = windows.filter((w) => w.trial === t.index).map((w) => w.index)
    const range: [number, number] = idx.length ? [idx[0], idx[idx.length - 1] + 1] : [0, 0]
    const mean = idx.length ? idx.reduce((s, i) => s + windows[i].garn, 0) / idx.length : null
    return { index: t.index, cue: t.cue, level: t.level, ids: t.ids, garnReported: t.garn_reported, start: t.start, length: t.length, windowRange: range, modelGarnMean: mean }
  })
  const scored = trials.filter((t) => t.modelGarnMean !== null)
  const means = scored.map((t) => t.modelGarnMean as number)
  return {
    module: 'garnmeter',
    sampleId,
    label,
    source: timing.backend === 'precomputed' ? 'precomputed' : 'live',
    tier: d.card.tier,
    fs: d.meta.fs,
    channels: d.meta.channels,
    electrodes: d.meta.electrodes,
    sigma,
    baseline,
    windows,
    trials,
    cutoffs: { G_y, G_r },
    session: {
      nWindows: windows.length,
      meanModelGarn: means.length ? means.reduce((s, v) => s + v, 0) / means.length : null,
      spearmanModelVsReported: spearman(means, scored.map((t) => t.ids)),
    },
    timing,
    perWindowMs: windows.length ? timing.ms / (windows.length + 1) : 0,
    captions: captions(d, timing.backend === 'precomputed', label),
  }
}

async function runBatch(x: Float32Array, n: number): Promise<{ outs: GarnOutputs[]; ms: number }> {
  const r = await runModel(MODEL_KEY, { eeg: { type: 'float32', dims: [n, N_CH, WIN], data: x } })
  return { outs: splitOutputs(r.outputs, n), ms: r.ms }
}

export interface AnalyzeOptions {
  /** Windows per model call. Default: all in one call. 1 = the live loop of plan 06 section 8 (batch 1, one call per window). */
  batchSize?: number
  /** Called after each model call with the windows scored so far (for streaming a replay). */
  onProgress?: (done: number, total: number) => void
}

/** Runs the REAL model in this browser on a demo sample: the calibration reference window plus 9 windows per trial. */
export async function analyze(sampleId: string = SESSION_ID, opts: AnalyzeOptions = {}): Promise<GarnResult> {
  const env = await load()
  const d = await loadSessionData()
  const n = d.meta.n_samples
  const trials = trialsOf(d, sampleId)
  const specs = standardWindows(d, trials)
  const sigma = sigmaFor(d.eeg, n, d.meta.sigma_c)
  const sig = sigma.used === 'stored' ? d.meta.sigma_c : sigma.computed
  const starts = [REF_WINDOW_START, ...specs.map((s) => s.startSample)]
  const bs = Math.max(1, Math.min(opts.batchSize ?? starts.length, starts.length))
  const outs: GarnOutputs[] = []
  let ms = 0
  for (let i = 0; i < starts.length; i += bs) {
    const chunk = starts.slice(i, i + bs)
    const r = await runBatch(buildBatch(d.eeg, n, chunk, sig), chunk.length)
    outs.push(...r.outs)
    ms += r.ms
    opts.onProgress?.(Math.max(0, outs.length - 1), specs.length)
  }
  const label = sampleId === SESSION_ID ? d.meta.label : `${d.meta.label}, trial ${trials[0]}`
  return assemble(d, sampleId, label, specs, outs.slice(1), outs[0], sigma, { backend: env.backend, ms }, true)
}

/** Same result shape from the stored PyTorch outputs of the same model (phones, fallbacks). Needs no model download. */
export async function replay(sampleId: string = SESSION_ID): Promise<GarnResult> {
  const t0 = performance.now()
  const [d, stored] = await Promise.all([loadSessionData(), loadStoredOutputs()])
  const trials = new Set(trialsOf(d, sampleId))
  const ws = stored.windows.filter((w) => trials.has(w.trial))
  const specs: WindowSpec[] = ws.map((w) => ({ trial: w.trial, endS: w.end_s, startSample: w.start_sample }))
  const toOut = (w: { p_cum: [number, number, number]; garn: number; coupling: number[][] }): GarnOutputs => ({
    pCum: [w.p_cum[0], w.p_cum[1], w.p_cum[2]],
    garn: w.garn,
    coupling: Float32Array.from(w.coupling.flat()),
  })
  const sigma = sigmaFor(d.eeg, d.meta.n_samples, d.meta.sigma_c)
  const label = sampleId === SESSION_ID ? d.meta.label : `${d.meta.label}, trial ${[...trials][0]}`
  return assemble(d, sampleId, label, specs, ws.map(toOut), toOut(stored.baseline_reference), sigma, { backend: 'precomputed', ms: performance.now() - t0 }, true)
}

export interface Perturbation {
  /** Channel names to set to zero (an electrode that lost contact). */
  mute?: string[]
  /** Multiply the whole window (training augmentation range was 0.8-1.25). */
  gain?: number
  /** Add Gaussian noise of this sigma, in calibrated units (training used 0.05). */
  noise?: number
  seed?: number
}

export interface WindowResult {
  trial: number
  endS: number
  startSample: number
  outputs: GarnOutputs
  pBins: [number, number, number, number]
  timing: Timing
}

/**
 * Runs the real model on ONE window of the demo session ending at any time inside a trial (4.0-8.0 s, any sample),
 * optionally perturbed (what-if). The window never spans two trials, as in training.
 */
export async function analyzeWindow(trial: number, endS: number, perturb: Perturbation = {}): Promise<WindowResult> {
  const env = await load()
  const d = await loadSessionData()
  const t = d.meta.trials.find((x) => x.index === trial)
  if (!t) throw new Error(`garnmeter: no trial ${trial}`)
  const end = Math.round(Math.min(8, Math.max(4, endS)) * FS)
  const start = t.start + end - WIN
  const sigma = sigmaFor(d.eeg, d.meta.n_samples, d.meta.sigma_c)
  const x = buildBatch(d.eeg, d.meta.n_samples, [start], sigma.used === 'stored' ? d.meta.sigma_c : sigma.computed)
  applyPerturbation(x, d.meta.channels, perturb)
  const r = await runBatch(x, 1)
  return { trial, endS: end / FS, startSample: start, outputs: r.outs[0], pBins: binsFromCum(r.outs[0].pCum), timing: { backend: env.backend, ms: r.ms } }
}

function applyPerturbation(x: Float32Array, channels: string[], p: Perturbation) {
  const gain = p.gain ?? 1
  const rnd = p.noise ? gaussian(p.seed ?? 1) : null
  const mute = new Set((p.mute ?? []).map((m) => channels.indexOf(m)).filter((i) => i >= 0))
  const nb = x.length / (N_CH * WIN)
  for (let b = 0; b < nb; b++)
    for (let c = 0; c < N_CH; c++) {
      const o = (b * N_CH + c) * WIN
      for (let i = 0; i < WIN; i++) {
        let v = mute.has(c) ? 0 : x[o + i] * gain
        if (rnd) v += (p.noise as number) * rnd()
        x[o + i] = v
      }
    }
}

/**
 * Runs the real model on your own EEG: channel-major float32 [14][n] in the channel order of result.channels, at 128 Hz,
 * already band-passed 1-45 Hz with a 50 Hz notch (the browser does not filter). The first 1,024 samples (8 s) must be a
 * calm baseline; windows of 4 s are scored every 0.5 s after it. No trial structure, no reported ratings.
 */
export async function analyzeSignal(eeg: Float32Array, opts: { label?: string; stepS?: number } = {}): Promise<GarnResult> {
  const env = await load()
  const d = await loadSessionData()
  if (eeg.length % N_CH) throw new Error('garnmeter: signal length must be 14 x n samples')
  const n = eeg.length / N_CH
  if (n < BASELINE_LEN + WIN) throw new Error('garnmeter: need at least 12 s (8 s calibration + one 4 s window)')
  const sigma = sigmaFor(eeg, n, null)
  if (sigma.computed.some((v) => !(v > 0))) throw new Error('garnmeter: a channel is flat in the calibration (spread 0)')
  const step = Math.max(1, Math.round((opts.stepS ?? 0.5) * FS))
  const specs: WindowSpec[] = []
  for (let st = BASELINE_LEN; st + WIN <= n; st += step) specs.push({ trial: 0, endS: (st + WIN - BASELINE_LEN) / FS, startSample: st })
  const starts = [REF_WINDOW_START, ...specs.map((s) => s.startSample)]
  const r = await runBatch(buildBatch(eeg, n, starts, sigma.computed), starts.length)
  const label = opts.label ?? 'Your EEG'
  const res = assemble(d, 'user-signal', label, specs, r.outs.slice(1), r.outs[0], sigma, { backend: env.backend, ms: r.ms }, false)
  return { ...res, trials: [], session: { ...res.session, meanModelGarn: null, spearmanModelVsReported: null } }
}

/** The "what to do next" decision (plan 06 section 9, Tier C: the check-in drives the zone). */
export function act(result: GarnResult, crewInputs?: GarnCrewInputs) {
  return decide(result, crewInputs)
}

/** One decision after each analysed trial's rating, for scrubbing a session. */
export function actTimeline(result: GarnResult, crew?: Omit<GarnCrewInputs, 'atTrial' | 'checkinIds'>) {
  return decideTimeline(result, crew)
}

/** The demo EEG for drawing traces: channel-major microvolts plus the calibration spread (divide to get model units). */
export async function getSignal() {
  const d = await loadSessionData()
  return { eeg: d.eeg, nSamples: d.meta.n_samples, fs: d.meta.fs, channels: d.meta.channels, sigma: d.meta.sigma_c, trials: d.meta.trials, baseline: d.meta.baseline }
}

/** Result-card numbers (tier, both networks, floor, scene-only reference, pooled ROC curves, cut-offs). */
export async function getCard() {
  return (await loadSessionData()).card
}

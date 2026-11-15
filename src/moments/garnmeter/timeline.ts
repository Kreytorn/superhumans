// The Garn Meter moment as one timeline: a pure function of a clock. frameAt(t, data) returns everything the
// stage draws at time t (ms), so ?t=<ms> shows the exact frame and reduced motion shows frameAt(DURATION).
// r4: model output only. The gauge is the model's own reading; the person's ratings are not on the stage.
import type { GarnResult } from '../../engine/garnmeter'

export type BeatId = 'calibrate' | 'session' | 'focus' | 'read' | 'settle'

/** The beats, in order. `shows` says what each one tells about the model. */
export const BEATS: readonly { id: BeatId; from: number; to: number; shows: string }[] = [
  { id: 'calibrate', from: 0, to: 400, shows: 'the stage opens: the traces make room for the session strip while the 8 s at rest draw in; a band marks each channel\'s spread, which the model divides by' },
  { id: 'session', from: 400, to: 2800, shows: 'the whole recording plays through the model; its reading draws in under the traces, one point per 4 s window, and the gauge follows the smoothed reading' },
  { id: 'focus', from: 2800, to: 3700, shows: 'the view zooms into one scene (the card\'s hero scene, 24)' },
  { id: 'read', from: 3700, to: 5500, shows: 'the model\'s 4 s window slides over that scene (9 positions); the gauge follows each window\'s reading, the scalp map the measured theta power' },
  { id: 'settle', from: 5500, to: 6200, shows: 'the gauge settles on the model\'s reading for the scene: the mean of its 9 windows' },
]
export const DURATION = 6200

/** The scene the moment zooms into when the sample has it: the card's hero subject (user19-s3-t24). */
export const HERO_TRIAL = 24

export interface StageTrial {
  index: number
  start: number
  length: number
  modelGarnMean: number | null
  /** Range into StageData.windows: [w0, w1). */
  w0: number
  w1: number
}
export interface StageWindow {
  trial: number
  /** Absolute sample where the 4 s window ends. */
  end: number
  /** The model's reading for this window (raw output). */
  garn: number
  /** The engine's smoothed reading (exponential moving average over the analysed windows). */
  ema: number
  theta: number[] | null
}
export interface StageData {
  /** Samples in the session. */
  n: number
  /** Samples in the calm baseline at the start. */
  baseline: number
  /** Samples in one model window (4 s). */
  win: number
  trials: StageTrial[]
  windows: StageWindow[]
  /** The scene the moment zooms into. */
  focus: StageTrial
}

/** Plain stage data from an engine result. Nothing is added: every value is the engine's. */
export function stageData(r: GarnResult, nSamples: number, baseline: number, focusIndex: number = HERO_TRIAL): StageData {
  const win = Math.round(4 * r.fs)
  const windows: StageWindow[] = r.windows.map((w) => ({ trial: w.trial, end: w.startSample + win, garn: w.garn, ema: w.garnEma, theta: w.theta }))
  const trials: StageTrial[] = r.trials.map((t) => ({
    index: t.index,
    start: t.start,
    length: t.length,
    modelGarnMean: t.modelGarnMean,
    w0: t.windowRange[0],
    w1: t.windowRange[1],
  }))
  const analysed = trials.filter((t) => t.w1 > t.w0)
  const focus = analysed.find((t) => t.index === focusIndex) ?? analysed[0] ?? trials[0]
  return { n: nSamples, baseline, win, trials, windows, focus }
}

export interface Frame {
  beat: BeatId | 'idle' | 'result'
  /** Sample span the traces show. */
  cam: [number, number]
  /** Traces are drawn in full ink up to this sample; later samples are faint. The reading's thread follows it too. */
  inked: number
  /** Number of thread windows drawn. */
  thread: number
  /** 0-1: the per-channel calibration spread band. */
  sigma: number
  /** The model's current 4 s window, in samples. */
  scan: { start: number; end: number; alpha: number } | null
  /** Scalp map: mix between the measured theta of two windows (a = -1 means the baseline, all zero). */
  scalp: { a: number; b: number; mix: number } | null
  /** The model's reading on the gauge, in Garns. `garn` is where the gauge is drawn (it travels between outputs);
   *  `value` is the engine output it is travelling to, which is the number printed. `kind` says what that value is:
   *  the smoothed reading while the session plays, one window's reading, or the scene's mean. */
  estimate: { garn: number; value: number; alpha: number; kind: 'smoothed' | 'window' | 'scene' } | null
  /** 0-1: the scene's mean drawn on the strip (the settled reading). */
  mean: number
  /** 0-1: the marker on the strip for the scene in view. */
  focusMark: number
  /** 0-1: 0 = the idle stage (traces only, under one sentence); 1 = the traces have made room for the session strip. */
  open: number
  /** The playhead, in samples: the electrode dots on the scalp map and the dots on the traces follow the recording here. */
  now?: number
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const out = (x: number) => 1 - Math.pow(1 - x, 4)

/** The stage before anything ran: the calm baseline, nothing from the model. */
export function idleFrame(baseline: number): Frame {
  return { beat: 'idle', cam: [0, baseline], inked: baseline, thread: 0, sigma: 0, scan: null, scalp: null, estimate: null, mean: 0, focusMark: 0, open: 0 }
}

function countUpTo(d: StageData, sample: number): number {
  let k = 0
  while (k < d.windows.length && d.windows[k].end <= sample) k++
  return k
}

export function beatAt(t: number): BeatId | 'result' {
  for (const b of BEATS) if (t < b.to) return b.id
  return 'result'
}

/** The first beat needs only the recording, not the model: the stage can play it while the model is still answering. */
export const CALIBRATE_END = BEATS[0].to
export function calibrateFrame(t: number, baseline: number): Frame {
  const p = clamp01(t / CALIBRATE_END)
  return { ...idleFrame(baseline), beat: 'calibrate', inked: baseline * p, sigma: clamp01(p * 2.5), open: inOut(p) }
}

/** The scene's settled reading: the engine's mean over its windows. */
export function sceneReading(d: StageData, f: StageTrial = d.focus): number | null {
  if (f.modelGarnMean !== null) return f.modelGarnMean
  return f.w1 > f.w0 ? d.windows[f.w1 - 1].garn : null
}

/** Everything the stage shows at clock time t (ms). Pure: same t and data, same frame. */
export function frameAt(t: number, d: StageData): Frame {
  const N = d.n
  const B = d.baseline
  const f = d.focus
  const nW = f.w1 - f.w0
  const beat = beatAt(Math.max(0, t))
  const fr: Frame = { beat, cam: [0, B], inked: 0, thread: 0, sigma: 0, scan: null, scalp: null, estimate: null, mean: 0, focusMark: 0, open: 1 }
  const prog = (id: BeatId) => {
    const b = BEATS.find((x) => x.id === id)!
    return (t - b.from) / (b.to - b.from)
  }
  const focusCam: [number, number] = [f.start, f.start + f.length]
  const lastW = d.windows[d.windows.length - 1]

  if (beat === 'calibrate') return calibrateFrame(Math.max(0, t), B)
  if (beat === 'session') {
    const p = prog('session')
    const z = inOut(clamp01(p / 0.22))
    fr.cam = [0, B * Math.pow(N / B, z)]
    const s = clamp01((p - 0.06) / 0.9)
    fr.inked = B + (N - B) * (0.8 * s + 0.2 * inOut(s))
    fr.sigma = 1 - clamp01(p / 0.1)
    fr.thread = countUpTo(d, fr.inked)
    if (fr.thread > 0) {
      const k = fr.thread - 1
      const w = d.windows[k]
      const next = d.windows[k + 1]
      const mix = next ? clamp01((fr.inked - w.end) / Math.max(1, next.end - w.end)) : 0
      if (s < 1) {
        fr.scan = { start: w.end - d.win, end: w.end, alpha: 1 }
        // the scalp map fast-forwards through the measured theta of the windows the playhead passes
        fr.scalp = next ? { a: k, b: k + 1, mix } : { a: k, b: k, mix: 1 }
      } else fr.scalp = { a: k, b: k, mix: 1 }
      // the gauge follows the engine's smoothed reading of the latest window (it eases towards the next one)
      const g = next && s < 1 ? w.ema + (next.ema - w.ema) * mix : w.ema
      fr.estimate = { garn: g, value: w.ema, alpha: clamp01(fr.thread / 3), kind: 'smoothed' }
    }
    return fr
  }
  fr.inked = N
  fr.thread = d.windows.length
  if (beat === 'focus') {
    const p = prog('focus')
    const e = inOut(clamp01(p))
    const span = N * Math.pow(f.length / N, e)
    const k = f.length < N ? (1 - span / N) / (1 - f.length / N) : 1
    fr.cam = [f.start * k, f.start * k + span]
    fr.focusMark = clamp01(p * 1.6)
    // the scalp map settles from the end of the recording to the baseline-neutral start of the scene's first window
    if (d.windows.length) fr.scalp = { a: -1, b: d.windows.length - 1, mix: 1 - clamp01(p * 1.4) }
    // the gauge leaves the session's last smoothed reading for the scene's first window
    if (lastW) {
      const first = nW > 0 ? d.windows[f.w0].garn : lastW.ema
      const m = inOut(clamp01((p - 0.35) / 0.65))
      fr.estimate = { garn: lastW.ema + (first - lastW.ema) * m, value: m < 0.5 ? lastW.ema : first, alpha: 1, kind: m < 0.5 ? 'smoothed' : 'window' }
    }
    return fr
  }
  fr.cam = focusCam
  fr.focusMark = 1
  if (nW === 0) return fr
  const last = d.windows[f.w1 - 1]
  if (beat === 'read') {
    const pos = clamp01(prog('read')) * nW
    const i = Math.min(nW - 1, Math.floor(pos))
    const slide = out(clamp01((pos - i) / 0.5))
    const cur = d.windows[f.w0 + i]
    const prev = i > 0 ? d.windows[f.w0 + i - 1] : cur
    const end = prev.end + (cur.end - prev.end) * slide
    fr.scan = { start: end - d.win, end, alpha: i === 0 ? slide : 1 }
    fr.now = end
    fr.scalp = { a: i > 0 ? f.w0 + i - 1 : -1, b: f.w0 + i, mix: slide }
    fr.estimate = { garn: prev.garn + (cur.garn - prev.garn) * slide, value: cur.garn, alpha: 1, kind: 'window' }
    return fr
  }
  // settle and the settled result: the gauge moves from the last window's reading to the scene's mean
  const p = beat === 'settle' ? prog('settle') : 1
  const mean = sceneReading(d) ?? last.garn
  const s = inOut(clamp01(p / 0.6))
  fr.scan = { start: last.end - d.win, end: last.end, alpha: 1 }
  fr.now = last.end
  fr.scalp = { a: f.w1 - 1, b: f.w1 - 1, mix: 1 }
  fr.estimate = { garn: last.garn + (mean - last.garn) * s, value: s < 0.5 ? last.garn : mean, alpha: 1, kind: s < 0.5 ? 'window' : 'scene' }
  fr.mean = s
  return fr
}

/** While the stage rests at idle, the 8 s at rest replay at 1x: only a playhead moves (the electrode dots follow it). */
export function idleAmbient(fr: Frame, baseline: number, fs: number, clock: number): Frame {
  return { ...fr, now: ((clock / 1000) * fs) % baseline }
}

const AMB_HOLD = 1100
const AMB_FADE = 260
/** Once the result has settled, the scene in view keeps replaying at 1x: the model's 4 s window slides from its first
 *  standard position in the scene to its last, rests there and starts again. The scalp map follows the measured theta of
 *  the stored windows it passes. Nothing else changes: the gauge stays on the scene's mean. Pure in `clock`. */
export function resultAmbient(fr: Frame, d: StageData, clock: number): Frame {
  const f = d.focus
  const nW = f.w1 - f.w0
  if (nW < 2 || !fr.scan) return { ...fr, now: fr.scan?.end }
  const first = d.windows[f.w0].end
  const last = d.windows[f.w1 - 1].end
  const fs = d.win / 4
  const travel = ((last - first) / fs) * 1000
  const t = clock % (AMB_HOLD + AMB_FADE + travel)
  if (t < AMB_HOLD) return { ...fr, now: last }
  if (t < AMB_HOLD + AMB_FADE) return { ...fr, now: last, scan: { ...fr.scan, alpha: 1 - (t - AMB_HOLD) / AMB_FADE } }
  const p = (t - AMB_HOLD - AMB_FADE) / travel
  const now = first + (last - first) * p
  let k = 0
  while (k < nW - 2 && d.windows[f.w0 + k + 1].end <= now) k++
  const a = d.windows[f.w0 + k]
  const b = d.windows[f.w0 + k + 1]
  const mix = clamp01((now - a.end) / Math.max(1, b.end - a.end))
  return { ...fr, now, scan: { start: now - d.win, end: now, alpha: clamp01((p * travel) / AMB_FADE) }, scalp: { a: f.w0 + k, b: f.w0 + k + 1, mix } }
}

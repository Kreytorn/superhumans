// The Garn Meter moment as one timeline: a pure function of a clock. frameAt(t, data) returns everything the
// stage draws at time t (ms), so ?t=<ms> shows the exact frame and reduced motion shows frameAt(DURATION).
import type { GarnResult } from '../../engine/garnmeter'
import { checkinZone } from '../../engine/garnmeter'

export type BeatId = 'calibrate' | 'session' | 'focus' | 'read' | 'checkin'

/** The beats, in order. `shows` says what each one tells about the model. */
export const BEATS: readonly { id: BeatId; from: number; to: number; shows: string }[] = [
  { id: 'calibrate', from: 0, to: 400, shows: 'the stage opens: the traces make room for the session strip while the 8 s at rest draw in; a band marks each channel\'s spread, which the model divides by' },
  { id: 'session', from: 400, to: 1200, shows: 'the view zooms out to the whole recording; the grey thread is the model\'s estimate per 4 s window, the bold steps are the person\'s own ratings' },
  { id: 'focus', from: 1200, to: 2300, shows: 'the view zooms into the scene with the worst rating' },
  { id: 'read', from: 2300, to: 4100, shows: 'the model\'s 4 s window slides over that scene (9 positions); the grey tick on the rail is its estimate, the scalp map follows the measured theta power' },
  { id: 'checkin', from: 4100, to: 5000, shows: 'the person\'s own check-in lands on the rail; the dashed bracket is the gap between it and the model, and one line says both values' },
]
export const DURATION = 5000

export interface StageTrial {
  index: number
  start: number
  length: number
  ids: number
  /** Zone of that rating as a check-in (the engine's rule): 0 green, 1 yellow, 2 red. */
  zone: 0 | 1 | 2
  garnReported: number
  modelGarnMean: number | null
  /** Range into StageData.windows: [w0, w1). */
  w0: number
  w1: number
}
export interface StageWindow {
  trial: number
  /** Absolute sample where the 4 s window ends. */
  end: number
  garn: number
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
  /** The scene the moment zooms into: the analysed trial with the highest reported rating (first one on a tie). */
  focus: StageTrial
}

/** Plain stage data from an engine result. Nothing is added: every value is the engine's. */
export function stageData(r: GarnResult, nSamples: number, baseline: number, focusIndex?: number): StageData {
  const win = Math.round(4 * r.fs)
  const windows: StageWindow[] = r.windows.map((w) => ({ trial: w.trial, end: w.startSample + win, garn: w.garn, theta: w.theta }))
  const trials: StageTrial[] = r.trials.map((t) => ({
    index: t.index,
    start: t.start,
    length: t.length,
    ids: t.ids,
    zone: checkinZone(t.ids) ?? 0,
    garnReported: t.garnReported,
    modelGarnMean: t.modelGarnMean,
    w0: t.windowRange[0],
    w1: t.windowRange[1],
  }))
  const analysed = trials.filter((t) => t.w1 > t.w0)
  let focus = analysed[0] ?? trials[0]
  for (const t of analysed) if (t.ids > focus.ids) focus = t
  const wanted = focusIndex !== undefined ? analysed.find((t) => t.index === focusIndex) : undefined
  if (wanted) focus = wanted
  return { n: nSamples, baseline, win, trials, windows, focus }
}

export interface Frame {
  beat: BeatId | 'idle' | 'result'
  /** Sample span the traces show. */
  cam: [number, number]
  /** Traces are drawn in full ink up to this sample; later samples are faint. Thread and ratings follow it too. */
  inked: number
  /** Number of thread windows drawn. */
  thread: number
  /** 0-1: the per-channel calibration spread band. */
  sigma: number
  /** The model's current 4 s window, in samples. */
  scan: { start: number; end: number; alpha: number } | null
  /** Scalp map: mix between the measured theta of two windows (a = -1 means the baseline, all zero). */
  scalp: { a: number; b: number; mix: number } | null
  /** The grey tick on the rail: the model's estimate in Garns. `garn` is where the tick is drawn (it travels between
   *  outputs); `value` is the engine output it is travelling to, which is the number printed beside it. */
  estimate: { garn: number; value: number; alpha: number } | null
  /** 0-1: the check-in handle landing. */
  checkin: number
  /** 0-1: the gap bracket between the estimate and the check-in. */
  gap: number
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
  return { beat: 'idle', cam: [0, baseline], inked: baseline, thread: 0, sigma: 0, scan: null, scalp: null, estimate: null, checkin: 0, gap: 0, focusMark: 0, open: 0 }
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

/** Everything the stage shows at clock time t (ms). Pure: same t and data, same frame. */
export function frameAt(t: number, d: StageData): Frame {
  const N = d.n
  const B = d.baseline
  const f = d.focus
  const nW = f.w1 - f.w0
  const beat = beatAt(Math.max(0, t))
  const fr: Frame = { beat, cam: [0, B], inked: 0, thread: 0, sigma: 0, scan: null, scalp: null, estimate: null, checkin: 0, gap: 0, focusMark: 0, open: 1 }
  const prog = (id: BeatId) => {
    const b = BEATS.find((x) => x.id === id)!
    return (t - b.from) / (b.to - b.from)
  }
  const focusCam: [number, number] = [f.start, f.start + f.length]

  if (beat === 'calibrate') return calibrateFrame(Math.max(0, t), B)
  if (beat === 'session') {
    const p = prog('session')
    const z = inOut(clamp01(p / 0.34))
    fr.cam = [0, B * Math.pow(N / B, z)]
    const s = clamp01((p - 0.1) / 0.88)
    fr.inked = B + (N - B) * (0.75 * s + 0.25 * inOut(s))
    fr.sigma = 1 - clamp01(p / 0.14)
    fr.thread = countUpTo(d, fr.inked)
    if (fr.thread > 0 && s < 1) {
      const k = fr.thread - 1
      const w = d.windows[k]
      fr.scan = { start: w.end - d.win, end: w.end, alpha: 1 }
      // the scalp map fast-forwards through the measured theta of the windows the playhead passes
      const next = d.windows[k + 1]
      const mix = next ? clamp01((fr.inked - w.end) / Math.max(1, next.end - w.end)) : 0
      fr.scalp = next ? { a: k, b: k + 1, mix } : { a: k, b: k, mix: 1 }
    } else if (fr.thread > 0) fr.scalp = { a: fr.thread - 1, b: fr.thread - 1, mix: 1 }
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
    return fr
  }
  fr.cam = focusCam
  fr.focusMark = 1
  if (nW === 0) {
    fr.checkin = beat === 'read' ? 0 : 1
    fr.gap = 0
    return fr
  }
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
    fr.estimate = { garn: prev.garn + (cur.garn - prev.garn) * slide, value: cur.garn, alpha: i === 0 ? slide : 1 }
    return fr
  }
  // checkin and the settled result
  const p = beat === 'checkin' ? prog('checkin') : 1
  const mean = f.modelGarnMean ?? last.garn
  const s = inOut(clamp01(p / 0.3))
  fr.scan = { start: last.end - d.win, end: last.end, alpha: 1 }
  fr.now = last.end
  fr.scalp = { a: f.w1 - 1, b: f.w1 - 1, mix: 1 }
  fr.estimate = { garn: last.garn + (mean - last.garn) * s, value: mean, alpha: 1 }
  fr.checkin = out(clamp01((p - 0.12) / 0.4))
  fr.gap = inOut(clamp01((p - 0.45) / 0.45))
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
 *  the stored windows it passes. Nothing else changes: the tick on the rail stays on the scene's mean. Pure in `clock`. */
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

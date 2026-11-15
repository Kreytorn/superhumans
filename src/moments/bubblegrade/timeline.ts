// BubbleGrade moment: the timeline. A pure function of one clock.
// During the "listen" beat the clock in ms IS the clip time in ms, so the audio element can drive it directly.
// Every value here is read from the engine's BubbleResult; nothing is invented or randomised.
import type { BubbleResult } from '../../engine/bubblegrade'

/** How long the highlight of a new reading lasts, in clock ms. */
export const KICK_MS = 900

/** After the clip ends: playhead and slice bracket leave, the needle rests. */
export const SETTLE_MS = 900
/** How long the heat takes to rise behind the playhead, in clip seconds. */
export const RISE_S = 0.6
/** How long the needle takes to move to each new running grade, in clock ms. */
export const NEEDLE_MS = 600

export type BeatName = 'idle' | 'listen' | 'settle' | 'result'

/** The running clip verdict once the model has heard a whole number of 5-s slices. */
export interface Verdict {
  /** Clip time (s) at which this slice is fully heard (the slice's t1). */
  at: number
  /** Slices heard so far. */
  n: number
  /** Running means over the slices heard so far: expected grade, P(>= III), grade. */
  E: number
  A: number
  g: number
  alert: boolean
  /** What this 5-s slice says on its own: its expected grade and P(grade >= I, II, III, IV). */
  own: { E: number; pGe: number[] }
}

export interface Model {
  durS: number
  totalMs: number
  verdicts: Verdict[]
  /** Clip time when the running alert probability first reached tau (null = never). */
  alertAtS: number | null
  /** The grade range the estimate trace is drawn in: every single-slice and running value fits, snapped to 0.1. */
  zoom: { lo: number; hi: number; zoomed: boolean }
  /** P(grade >= I, II, III, IV) for the whole clip (the engine's clip.pGe). */
  pGeFinal: number[]
  /** Named beats in clock ms, for docs and the harness. */
  beats: { name: string; t0: number; t1: number; shows: string }[]
}

/** Builds the timeline model from a result: the running verdict after each completed 5-s slice. */
export function buildModel(r: BubbleResult): Model {
  const wins = [...r.windows].sort((a, b) => a.t1 - b.t1)
  const sum = [0, 0, 0, 0]
  const verdicts: Verdict[] = wins.map((w, i) => {
    w.pGe.forEach((v, k) => (sum[k] += v))
    const n = i + 1
    const p = sum.map((s) => s / n)
    const last = n === wins.length
    // The last running value is the clip value itself: take the engine's numbers so they match exactly.
    const E = last ? r.clip.E : p[0] + p[1] + p[2] + p[3]
    const A = last ? r.clip.A : p[2]
    const g = last ? r.clip.g : p.filter((v) => v > 0.5).length
    return { at: Math.min(w.t1, r.durS), n, E, A, g, alert: A >= r.clip.tau, own: { E: w.E, pGe: [...w.pGe] } }
  })
  const firstAlert = verdicts.find((v) => v.alert)
  const durMs = r.durS * 1000
  const first = verdicts[0]?.at ?? r.durS
  // Zoom: the smallest 0.1-snapped grade range that holds every reading, at least 0.4 of a grade tall.
  let lo = Infinity
  let hi = -Infinity
  for (const v of verdicts) {
    lo = Math.min(lo, v.E, v.own.E)
    hi = Math.max(hi, v.E, v.own.E)
  }
  if (!verdicts.length) [lo, hi] = [0, 4]
  lo = Math.max(0, Math.floor((lo - 0.04) * 10) / 10)
  hi = Math.min(4, Math.ceil((hi + 0.04) * 10) / 10)
  if (hi - lo < 0.4) {
    if (lo <= 0) hi = 0.4
    else lo = +(hi - 0.4).toFixed(1)
  }
  return {
    zoom: { lo, hi, zoomed: hi - lo < 4 },
    pGeFinal: r.clip.pGe,
    durS: r.durS,
    totalMs: durMs + SETTLE_MS,
    verdicts,
    alertAtS: firstAlert ? firstAlert.at : null,
    beats: [
      { name: 'listen', t0: 0, t1: durMs, shows: 'playhead = clip time; heard sound brightens; heat rises 0.6 s behind it' },
      { name: 'first-slice', t0: first * 1000, t1: first * 1000 + NEEDLE_MS, shows: 'first 5-s slice heard: the needle appears at the grade so far' },
      ...(firstAlert ? [{ name: 'alert', t0: firstAlert.at * 1000, t1: firstAlert.at * 1000, shows: 'running P(grade >= III) reaches tau: the needle fills and its words read "model: alert", once' }] : []),
      { name: 'slices', t0: first * 1000, t1: durMs, shows: 'each further slice moves the needle to the running mean' },
      { name: 'settle', t0: durMs, t1: durMs + SETTLE_MS, shows: 'playhead and bracket leave; needle rests on the clip grade' },
    ],
  }
}

export interface Frame {
  beat: BeatName
  /** Playhead position in clip seconds. */
  clipS: number
  /** 0..1 opacity of the playhead and its time label. */
  playhead: number
  /** The 5-s slice being heard, in clip seconds, and its opacity. */
  slice: { t0: number; t1: number; opacity: number }
  /** Everything left of this clip time has been heard (bright, heat allowed). */
  heardS: number
  /** Needle: eased expected grade 0..4, or null before the first slice is heard. */
  needle: { E: number; g: number; A: number; n: number; opacity: number; alert: boolean } | null
  /** Clip time at which the alert came on, once it has, else null. (Not drawn on the time rail: it is the end of a slice, not a place in the sound.) */
  alertPinS: number | null
  /** 0..1: the settled look (used to quiet the marks that belong to playback). */
  settled: number
  /** 1 at the instant a new slice reading lands, falling to 0 over KICK_MS: the brief highlight of a step. */
  kick: number
}

/** The running expected grade drawn at clock time tMs (the needle's value), or null before the first slice is heard. */
export function runningE(m: Model, tMs: number): number | null {
  let k = -1
  for (let i = 0; i < m.verdicts.length; i++) if (m.verdicts[i].at * 1000 <= tMs + 1e-6) k = i
  if (k < 0) return null
  const v = m.verdicts[k]
  if (k === 0) return v.E
  const p = m.verdicts[k - 1]
  return p.E + (v.E - p.E) * easeOut((tMs - v.at * 1000) / NEEDLE_MS)
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
/** Strong ease-out (quint). */
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 5)

/** The exact frame at clock time tMs. tMs >= model.totalMs is the settled result; tMs < 0 is idle. */
export function frameAt(m: Model, tMs: number): Frame {
  const durMs = m.durS * 1000
  if (tMs < 0) {
    return { beat: 'idle', clipS: 0, playhead: 0, slice: { t0: 0, t1: 0, opacity: 0 }, heardS: 0, needle: null, alertPinS: null, settled: 0, kick: 0 }
  }
  const t = Math.min(tMs, m.totalMs)
  const listening = t < durMs
  const clipS = Math.min(t, durMs) / 1000
  const settled = listening ? 0 : easeOut((t - durMs) / SETTLE_MS)
  const appear = easeOut(t / 240)

  // Needle: glide from the previous running grade to the newest one.
  let needle: Frame['needle'] = null
  let k = -1
  for (let i = 0; i < m.verdicts.length; i++) if (m.verdicts[i].at * 1000 <= t + 1e-6) k = i
  if (k >= 0) {
    const v = m.verdicts[k]
    const prev = k > 0 ? m.verdicts[k - 1] : null
    const u = easeOut((t - v.at * 1000) / NEEDLE_MS)
    needle = {
      E: prev ? prev.E + (v.E - prev.E) * u : v.E,
      g: v.g,
      A: v.A,
      n: v.n,
      opacity: k === 0 ? Math.max(u, settled) : 1,
      alert: m.alertAtS !== null && v.at >= m.alertAtS,
    }
  }
  return {
    beat: t >= m.totalMs ? 'result' : listening ? 'listen' : 'settle',
    clipS,
    playhead: appear * (1 - settled),
    slice: { t0: Math.max(0, clipS - 5), t1: clipS, opacity: appear * (1 - settled) },
    heardS: clipS,
    needle,
    alertPinS: m.alertAtS !== null && clipS >= m.alertAtS ? m.alertAtS : null,
    settled,
    kick: k >= 0 ? 1 - clamp01((t - m.verdicts[k].at * 1000) / KICK_MS) : 0,
  }
}

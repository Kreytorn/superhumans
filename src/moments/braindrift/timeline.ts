// The BrainDrift moment as one timeline: frameAt(t) is a pure function of the clock, so ?t=<ms> shows an exact frame.
// Nothing here touches the DOM, three.js or the engine.

/** Beats in ms. The clock may be held back by real model progress (live mode) but never runs ahead of it. */
export const BEATS = {
  /** The slider travels from before flight to the chosen frame; the stored frames swap in (ventricles swell, top rises). */
  fly: [0, 1500],
  /** The cut closes: the reading plane moves to the back of the head, the brain is whole again. */
  seal: [1500, 2100],
  /** Model B reads the brain slice by slice, back to front; each slice shows its 6-class map, ventricles appear behind it. */
  read: [2100, 5700],
  /** The plane returns to the resting slice; new fluid space, the two top lines and the measured change draw in. */
  compare: [5700, 7000],
} as const

export const END = BEATS.compare[1]
export type BeatName = 'idle' | keyof typeof BEATS | 'result'

export interface Geo {
  /** First and last coronal slice that contains brain (the slices the model runs on). */
  k0: number
  k1: number
  /** The resting slice of the cut. */
  restK: number
}

export interface Frame {
  beat: BeatName
  /** Slider position 0..1 (0 = before flight, 1 = after flight). */
  pos: number
  /** Stored flight frame shown, 0..4. */
  frameIdx: number
  /** Coronal position of the cut plane (voxel k, fractional). */
  cutK: number
  /** 0..1: the model's 6-class map painted on the cut face. */
  map: number
  /** 0..1: ventricles drawn as the model's mark (cut face fill and mesh colour). */
  measured: number
  /** 0..1: new fluid space (ventricle after flight, not before) lifted out. */
  growth: number
  /** 0..1: draw-in of the lines and labels on the specimen. */
  marks: number
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const span = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a))
/** ease-in-out cubic: used where the thing moves across the stage. */
export const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
/** ease-out quart: used where something arrives. */
export const out = (x: number) => 1 - (1 - x) ** 4

export function beatAt(t: number): BeatName {
  if (t <= 0) return 'idle'
  if (t < BEATS.fly[1]) return 'fly'
  if (t < BEATS.seal[1]) return 'seal'
  if (t < BEATS.read[1]) return 'read'
  if (t < END) return 'compare'
  return 'result'
}

/** The whole moment at time t for a run that ends on stored frame `targetIdx` (1..4). */
export function frameAt(t: number, targetIdx: number, geo: Geo): Frame {
  const beat = beatAt(t)
  const target = targetIdx / 4
  const pos = target * inOut(span(t, BEATS.fly))
  const frameIdx = Math.min(targetIdx, Math.round(pos * 4))
  let cutK = geo.restK
  if (beat === 'seal') cutK = geo.restK + (geo.k0 - geo.restK) * inOut(span(t, BEATS.seal))
  else if (beat === 'read') cutK = geo.k0 + (geo.k1 - geo.k0) * span(t, BEATS.read)
  else if (beat === 'compare' || beat === 'result') cutK = geo.k1 + (geo.restK - geo.k1) * inOut(span(t, [BEATS.compare[0], BEATS.compare[0] + 800]))
  const reading = t >= BEATS.read[0]
  const c = span(t, BEATS.compare)
  return {
    beat,
    pos,
    frameIdx,
    cutK,
    map: reading ? 1 - 0.78 * out(clamp01(c * 1.6)) : 0,
    measured: reading ? 1 : 0,
    growth: out(clamp01((c - 0.5) / 0.3)),
    marks: clamp01((c - 0.62) / 0.38),
  }
}

/** While the user drags: the same picture as t = 0, with the slider (and so the stored frame) under the user's hand. */
export function dragFrame(pos: number, geo: Geo): Frame {
  return { beat: 'idle', pos, frameIdx: Math.round(pos * 4), cutK: geo.restK, map: 0, measured: 0, growth: 0, marks: 0 }
}

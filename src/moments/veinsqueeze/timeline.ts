// VeinSqueeze moment, "the wink": one timeline, a pure function of a clock (milliseconds).
// pose(t) says how far every mark has come at time t; index.tsx applies it to real data and nothing else moves.

/** The named beats, in ms. What each one shows about the model is in README.md. */
export const BEATS = {
  /** The press arms: SAM 2's outline (already on the first real frame at rest, labelled "vein") tints, the bet gives way to the chart. */
  outline: { from: 0, to: 450 },
  /** The hold: the real frames scrub from rest to the tightest squeeze; the outline tracks; the curve draws. */
  press: { from: 450, to: 3050 },
  /** The lowest point lands, the rest of the clip's curve follows dimmed, the band word appears. */
  band: { from: 3050, to: 3850 },
  /** Only now: the classifier's clip value ("AI clot chance") fills in per clip. */
  opinion: { from: 3850, to: 5050 },
} as const

export const END = BEATS.opinion.to

export type BeatName = 'rest' | keyof typeof BEATS | 'settled'

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function beatAt(t: number): BeatName {
  if (t <= 0) return 'rest'
  if (t >= END) return 'settled'
  if (t < BEATS.outline.to) return 'outline'
  if (t < BEATS.press.to) return 'press'
  if (t < BEATS.band.to) return 'band'
  return 'opinion'
}

export interface Pose {
  beat: BeatName
  /** 0-1: the outline's tint and the chart arriving (the outline itself is on screen from rest). */
  outline: number
  /** 1-0: the word "vein" inside the outline, visible at rest, gone once the press has started. */
  click: number
  /** 0-1: how far the probe is pressed = how far the real frames have scrubbed from rest to the tightest squeeze. Linear: it is a scrub. */
  press: number
  /** 0-1: the playhead dot on the curve. */
  dot: number
  /** 0-1: the lowest point has landed (ring + its value). */
  landed: number
  /** 0-1: how much of the clip after the lowest point is drawn (dimmed). */
  rest: number
  /** 0-1: the band word. */
  band: number
  /** 0-1: the "AI clot chance" row appears. */
  track: number
  /** 0-1: the bar travels to the classifier's value. */
  fill: number
  /** 0-1: the value itself. */
  value: number
}

export function pose(t: number): Pose {
  const { outline, press, band, opinion } = BEATS
  return {
    beat: beatAt(t),
    outline: easeOut(seg(t, outline.from, outline.to)),
    click: 1 - seg(t, outline.from + 150, outline.to),
    press: seg(t, press.from, press.to),
    dot: seg(t, press.from, press.from + 120),
    landed: easeOut(seg(t, band.from, band.from + 280)),
    rest: easeInOut(seg(t, band.from, band.from + 560)),
    band: easeOut(seg(t, band.from + 200, band.from + 620)),
    track: easeOut(seg(t, opinion.from, opinion.from + 240)),
    fill: easeOut(seg(t, opinion.from + 120, opinion.from + 860)),
    value: easeOut(seg(t, opinion.from + 700, opinion.from + 1040)),
  }
}

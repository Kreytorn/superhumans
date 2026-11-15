// BrainDrift frozen scene: the geometry. Pure maths, no DOM.
//
// Everything is placed from the manifest anchors in the still's own pixels: `focus` is where the fluid starts,
// `up` is "toward the head", `r` sets the scale. Sizes that must read the same on any screen (stroke widths,
// droplet sizes, gaps) are given in screen pixels and turned into still pixels with `k` (screen px per still px),
// which the scene measures. When the subject sits close to an edge of what is visible (the top of a phone, the
// panel on a laptop), the whole column is scaled down so the arrow and its label stay in view.
import type { Anchors } from '../types'

/** One droplet: where it hangs at the end, and how it got there. */
export interface Drop {
  /** Final position, still px. */
  x: number
  y: number
  /** Final position minus start position, still px (the droplet starts at x - dx, y - dy). */
  dx: number
  dy: number
  /** Radius, still px. */
  r: number
  /** Length of its motion trail, still px (0 = none). */
  trail: number
  delay: number
  dur: number
  /** A fine mist particle: a point of light, no trail. */
  mist: boolean
}

export interface DriftLayout {
  /** Screen px per still px. */
  k: number
  /** Unit vector toward the head, and the perpendicular to it (both in still space, y down). */
  ux: number
  uy: number
  px: number
  py: number
  /** Rotation (deg) that turns a shape's local +y onto -up: used to lay the trails behind the droplets. */
  rot: number
  /** The axis: base (faint) to tip (bright), still px. */
  axis: { x0: number; y0: number; x1: number; y1: number }
  /** Open chevron at the tip, as a path in still px. */
  head: string
  /** The head arrives from this far back along the axis, still px. */
  headBack: number
  drops: Drop[]
  /** The label's anchor (still px), and which side of the anchor its text runs: 1 = to the right, -1 = to the left. */
  label: { x: number; y: number; side: 1 | -1 }
  /** Short leader from the arrowhead to the label, still px. */
  lead: { x0: number; y0: number; x1: number; y1: number }
}

export interface Measure {
  w: number
  h: number
  anchors: Anchors
  /** The scene box on screen, relative to the page root: may be larger than the screen (cover). */
  box: { x: number; y: number; w: number; h: number }
  /** The page root (the screen). */
  view: { w: number; h: number }
  /** The label's own size on screen, px. */
  label: { w: number; h: number }
}

/**
 * The droplet column, in units of the subject radius: [across, along-up at the end, radius (screen px at the
 * reference scale), travel along up, start delay (s)]. Across is -1..1 of the column's half-width; along-up 0 is
 * the focus. Hand-placed for a calm, uneven plume that narrows toward the head; nothing sits on the axis itself.
 */
const PLUME: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-0.14, 0.98, 3.2, 1.0, 0.2],
  [0.2, 0.84, 6.0, 0.94, 0.26],
  [-0.36, 0.72, 3.4, 0.9, 0.08],
  [0.42, 0.62, 3.8, 0.86, 0.36],
  [0.12, 0.52, 11.6, 0.74, 0.12],
  [-0.52, 0.46, 6.2, 0.78, 0.3],
  [0.64, 0.34, 3.2, 0.84, 0.05],
  [0.32, 0.22, 8.0, 0.66, 0.4],
  [-0.28, 0.2, 15.0, 0.58, 0.18],
  [0.78, 0.12, 3.6, 0.72, 0.46],
  [-0.76, 0.08, 3.2, 0.76, 0.14],
  [0.48, -0.04, 9.6, 0.52, 0.32],
  [-0.48, -0.1, 4.2, 0.62, 0.48],
  [0.14, -0.2, 6.8, 0.5, 0.42],
  [0.1, 1.18, 2.4, 1.05, 0.3],
  [-0.6, 0.88, 2.8, 0.9, 0.22],
  [0.64, 0.8, 3.0, 0.88, 0.1],
  [-0.12, 0.42, 3.6, 0.8, 0.34],
  [0.94, 0.44, 2.4, 0.76, 0.28],
  [-0.94, 0.32, 2.6, 0.7, 0.4],
  [0.26, -0.34, 3.2, 0.5, 0.5],
  [-0.7, -0.24, 3.0, 0.56, 0.36],
]
/** Fine mist between the droplets: [across, along-up at the end, travel, delay]. */
const MIST: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.04, 1.12, 1.0, 0.28],
  [-0.3, 0.9, 0.96, 0.16],
  [0.42, 0.8, 0.9, 0.34],
  [-0.06, 0.7, 0.92, 0.1],
  [-0.62, 0.62, 0.8, 0.24],
  [0.66, 0.54, 0.86, 0.4],
  [-0.12, 0.4, 0.8, 0.3],
  [0.5, 0.26, 0.76, 0.2],
  [-0.84, 0.3, 0.7, 0.36],
  [0.86, 0.06, 0.66, 0.12],
  [-0.2, -0.22, 0.6, 0.44],
  [0.3, -0.3, 0.56, 0.22],
]

/** Along-up positions of the axis, in units of the subject radius. */
const AXIS_BASE = -0.72
const AXIS_TIP = 1.6
/** Half-width of the droplet column, in units of the subject radius, and how much it narrows as it rises. */
const SPREAD = 0.84
const NARROW = 0.4

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Distance from p along d to the edge of the rectangle (Infinity when d never leaves it that way). */
function toEdge(p: [number, number], d: [number, number], r: { x0: number; y0: number; x1: number; y1: number }) {
  let t = Infinity
  if (d[0] > 1e-6) t = Math.min(t, (r.x1 - p[0]) / d[0])
  if (d[0] < -1e-6) t = Math.min(t, (r.x0 - p[0]) / d[0])
  if (d[1] > 1e-6) t = Math.min(t, (r.y1 - p[1]) / d[1])
  if (d[1] < -1e-6) t = Math.min(t, (r.y0 - p[1]) / d[1])
  return Math.max(0, t)
}

/** The part of the still that is on screen and not under the panel (landscape) or the sheet (portrait), still px. */
function safeArea(m: Measure, k: number) {
  const { view, box } = m
  const portrait = view.h > view.w
  let x0: number
  let x1: number
  let y0: number
  let y1: number
  if (portrait) {
    // the sheet covers the lower 62 %; the wordmark and the imagery mark sit in the top band
    x0 = 16
    x1 = view.w - 16
    y0 = Math.max(66, view.h * 0.078)
    y1 = view.h * 0.38 - 14
  } else {
    // the panel covers the right 58 % (at most 1120 px); the wordmark is top left, the title card bottom left
    const panel = Math.min(view.w * 0.58, 1120)
    x0 = Math.max(24, view.w * 0.025)
    x1 = view.w - panel - 28
    y0 = Math.max(80, view.h * 0.1)
    y1 = view.h * 0.76
  }
  // screen -> still
  return {
    x0: (x0 - box.x) / k,
    x1: (x1 - box.x) / k,
    y0: (y0 - box.y) / k,
    y1: (y1 - box.y) / k,
  }
}

export function layoutDrift(m: Measure): DriftLayout {
  const { w, h, anchors } = m
  const k = m.box.w > 0 ? m.box.w / w : 1
  const s = 1 / k // one screen px, in still px
  const fx = anchors.focus[0] * w
  const fy = anchors.focus[1] * h
  const R0 = Math.max(10 * s, anchors.r * h)

  let ux = anchors.up?.[0] ?? 0
  let uy = anchors.up?.[1] ?? -1
  const n = Math.hypot(ux, uy)
  if (!(n > 1e-6)) {
    ux = 0
    uy = -1
  } else {
    ux /= n
    uy /= n
  }
  // perpendicular, turned so that it points to the right of the screen when it can
  let px = -uy
  let py = ux
  if (px < 0 || (Math.abs(px) < 1e-6 && py < 0)) {
    px = -px
    py = -py
  }

  // Scale the whole column down (it keeps its shape) when the arrow and its label would leave the visible area.
  const safe = safeArea(m, k)
  const room = toEdge([fx, fy], [ux, uy], safe)
  const headR = 10 * s + 0.5 * m.label.h * s
  const R = R0 * clamp((room - headR) / (AXIS_TIP * R0), 0.5, 1)
  // droplets keep the same look whatever the screen: sized from the column as seen on screen
  const sz = clamp((R * k) / 160, 0.6, 1.35)

  const drop = (a: number, f: number, travel: number, delay: number, i: number, rad: number, mist: boolean): Drop => {
    const across = a * SPREAD * R
    const along = f * R
    const x = fx + px * across + ux * along
    const y = fy + py * across + uy * along
    // it started lower and a little wider
    const back = travel * R
    const widen = a * SPREAD * R * NARROW
    return {
      x,
      y,
      dx: ux * back - px * widen,
      dy: uy * back - py * widen,
      r: rad * s,
      trail: mist ? 0 : back * 0.46,
      delay,
      dur: (mist ? 1.6 : 1.4) + 0.08 * ((i * 7) % 5),
      mist,
    }
  }
  const drops: Drop[] = [
    ...MIST.map(([a, f, travel, delay], i) => drop(a, f, travel, delay, i, Math.max(1, 1.25 * sz), true)),
    ...PLUME.map(([a, f, rad, travel, delay], i) => drop(a, f, travel, delay, i, Math.max(1.8, rad * sz), false)),
  ]

  const x0 = fx + ux * AXIS_BASE * R
  const y0 = fy + uy * AXIS_BASE * R
  const x1 = fx + ux * AXIS_TIP * R
  const y1 = fy + uy * AXIS_TIP * R

  // chevron at the tip
  const hl = 15 * s
  const hw = 8.5 * s
  const head = `M${(x1 - ux * hl + px * hw).toFixed(2)} ${(y1 - uy * hl + py * hw).toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}L${(x1 - ux * hl - px * hw).toFixed(2)} ${(y1 - uy * hl - py * hw).toFixed(2)}`

  // The label sits beside the arrowhead, on whichever side it fits; the right-hand side first.
  const gap = 34 * s
  const lw = m.label.w * s
  const lh = m.label.h * s
  const ax = x1 - ux * hl * 0.55
  const ay = y1 - uy * hl * 0.55
  const place = (side: 1 | -1) => {
    // anchor on the axis side of the text block, `gap` away from the axis along the perpendicular
    const cx = ax + px * gap * side
    const cy = ay + py * gap * side
    const right = side * px >= 0
    const left = right ? cx : cx - lw
    const top = cy - lh / 2
    const over =
      Math.max(0, safe.x0 - left) + Math.max(0, left + lw - safe.x1) + Math.max(0, safe.y0 - top) + Math.max(0, top + lh - safe.y1)
    return { cx, cy, left, top, over, side, textSide: (right ? 1 : -1) as 1 | -1 }
  }
  const a = place(1)
  const b = place(-1)
  const pick = a.over <= 0 || a.over <= b.over ? a : b
  // nudge the block back inside when neither side fits whole
  const nx = clamp(pick.left, safe.x0, Math.max(safe.x0, safe.x1 - lw)) - pick.left
  const ny = clamp(pick.top, safe.y0, Math.max(safe.y0, safe.y1 - lh)) - pick.top
  const lx = pick.cx + nx
  const ly = pick.cy + ny

  return {
    k,
    ux,
    uy,
    px,
    py,
    rot: (Math.atan2(ux, -uy) * 180) / Math.PI,
    axis: { x0, y0, x1, y1 },
    head,
    headBack: 16 * s,
    drops,
    label: { x: lx, y: ly, side: pick.textSide },
    lead: {
      x0: ax + px * 9 * s * pick.side,
      y0: ay + py * 9 * s * pick.side,
      x1: lx - px * 7 * s * pick.side,
      y1: ly - py * 7 * s * pick.side,
    },
  }
}

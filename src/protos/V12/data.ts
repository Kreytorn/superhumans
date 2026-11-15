// Take V12 "Suit Cutaway": the six checks, each a window cut through the suit into the body.
// Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
import type { P } from './geom'

const BASE = import.meta.env.BASE_URL

export type Box = [number, number, number, number]

export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  /** where in the body the window opens */
  site: string
  hue: string
  img: string
  /** natural width / height of the image */
  aspect: number
  /** the part of the image the window shows, in image fractions: x, y, width, height */
  crop: [number, number, number, number]
  /** the window on the side-on plate and on the upright (phone) plate, in plate units: x, y, w, h */
  wide: Box
  tall: Box
  /** how the window opens: cut through the suit, through the visor, or a panel lifted off the helmet (exploded view) */
  kind?: 'visor' | 'lifted'
  /** for a lifted panel: where it came from on the helmet, per plate (x, y, w, h) */
  from?: { wide: Box; tall: Box }
  run: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    site: 'Cells',
    hue: '#ff4fb0',
    img: `${BASE}_posters/tracktrace.jpg`,
    aspect: 1.6,
    crop: [0.035, 0.31, 0.27, 0.38],
    wide: [662, 384, 226, 182],
    tall: [384, 790, 232, 176],
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    hue: '#ff8a3c',
    img: `${BASE}_posters/bubblegrade.jpg`,
    aspect: 1.6,
    crop: [0.26, 0.28, 0.6, 0.52],
    wide: [928, 484, 196, 146],
    tall: [500, 562, 196, 148],
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Blood',
    hue: '#ff5d5d',
    img: `${BASE}spikecount/fields/96.png`,
    aspect: 1,
    crop: [0.06, 0.22, 0.86, 0.56],
    wide: [944, 80, 184, 122],
    tall: [116, 556, 172, 136],
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    hue: '#ffe04a',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    aspect: 1.6,
    crop: [0.11, 0.17, 0.33, 0.42],
    wide: [216, 312, 206, 140],
    tall: [304, 1246, 196, 146],
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    hue: '#4fd8ff',
    img: `${BASE}_posters/braindrift.jpg`,
    aspect: 1.6,
    crop: [0.26, 0.08, 0.56, 0.8],
    wide: [1222, 372, 152, 158],
    tall: [372, 300, 178, 150],
    run: 'Fly the brain',
    kind: 'visor',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    hue: '#a995ff',
    // the real poster, dark ink on a pale sheet, tinted once into light traces on a night ground
    img: `${BASE}themes/V12/garnmeter_night.jpg`,
    aspect: 1.6,
    crop: [0.03, 0.03, 0.34, 0.5],
    wide: [1236, 146, 180, 128],
    tall: [626, 232, 216, 150],
    run: 'Play the session',
    kind: 'lifted',
    from: { wide: [1232, 318, 118, 34], tall: [566, 316, 34, 92] },
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkById(id: string): Check | undefined {
  return CHECKS.find((c) => c.id === id)
}

// ------------------------------------------------------------------ the two plates
export interface Plate {
  w: number
  h: number
  /** the figure: rotation (deg), scale, mirrored, and where the hip lands */
  rot: number
  s: number
  mirror: boolean
  hip: P
}
/** Side-on plate (laptops): the astronaut drifts across, rising to the right, looking up. */
export const WIDE: Plate = { w: 1600, h: 1000, rot: 88, s: 1.02, mirror: false, hip: [770, 468] }
/** Upright plate (phones): the astronaut stands up the screen. */
export const TALL: Plate = { w: 1000, h: 1560, rot: -4, s: 1.08, mirror: false, hip: [500, 900] }

export function plateTransform(p: Plate): string {
  return `translate(${p.hip[0]} ${p.hip[1]}) rotate(${p.rot}) scale(${p.mirror ? -p.s : p.s} ${p.s})`
}
export function toPlate(p: Plate, q: P): P {
  const x = (p.mirror ? -q[0] : q[0]) * p.s
  const y = q[1] * p.s
  const a = (p.rot * Math.PI) / 180
  return [p.hip[0] + x * Math.cos(a) - y * Math.sin(a), p.hip[1] + x * Math.sin(a) + y * Math.cos(a)]
}

/** The window's box on a plate: x, y, w, h. */
export function windowBox(c: Check, upright: boolean): Box {
  return upright ? c.tall : c.wide
}

/** The name band at the bottom of each window, in plate units. */
export const BAND = 30
/** The picture inside a window: the window minus a thin lit margin and the name band. */
export function screenBox(c: Check, upright: boolean): Box {
  const [x, y, w, h] = windowBox(c, upright)
  return [x + 5, y + 5, w - 10, h - 10 - BAND]
}

/** Image placement so that a check's crop covers a rectangle. */
export function coverImage(c: Check, x: number, y: number, w: number, h: number): { x: number; y: number; width: number; height: number } {
  const [cx, cy, cw, ch] = c.crop
  const dw = Math.max(w / cw, (c.aspect * h) / ch)
  const dh = dw / c.aspect
  return { x: x + w / 2 - (cx + cw / 2) * dw, y: y + h / 2 - (cy + ch / 2) * dh, width: dw, height: dh }
}

// ------------------------------------------------------------------ view boxes
export type VB = [number, number, number, number]

export function isUpright(vw: number, vh: number): boolean {
  return vw <= 820 || vw / vh < 0.9
}
/** A short laptop window (a real browser at 1440 wide shows about 1440x730). */
export function isShort(vw: number, vh: number): boolean {
  return vh < 800 && !isUpright(vw, vh)
}

/** The whole plate fitted to the window with the window's own shape. */
export function restVB(vw: number, vh: number): VB {
  const a = vw / vh
  if (!isUpright(vw, vh)) {
    const h = Math.max(WIDE.h, WIDE.w / a)
    const w = h * a
    return [WIDE.w / 2 - w / 2, WIDE.h / 2 - h / 2, w, h]
  }
  // upright: the figure spans the width; room above for the title and below for the focus card
  const top = Math.min(150, vh * 0.17)
  const bottom = Math.min(230, vh * 0.27)
  const s = Math.min(vw / 940, (vh - top - bottom) / 1330)
  const w = vw / s
  const h = vh / s
  return [TALL.w / 2 - w / 2, 120 - top / s, w, h]
}

/** Where the module page's stage frame sits in the window (matches v12.css). */
export function stageFrame(vw: number, vh: number): { l: number; t: number; w: number; h: number } {
  if (vw <= 820) return { l: 0, t: vh * 0.26, w: vw, h: vh * 0.62 }
  const pad = vw >= 1100 ? 56 : 28
  const short = isShort(vw, vh)
  const top = short ? 136 : 196
  const bot = short ? 82 : 96
  return { l: pad, t: top, w: vw - pad * 2, h: Math.max(320, vh - top - bot) }
}

/** The view box that brings one window's picture up to the stage frame. */
export function windowVB(c: Check, vw: number, vh: number): VB {
  const b = screenBox(c, isUpright(vw, vh))
  const fr = stageFrame(vw, vh)
  const s = Math.max(fr.w / b[2], fr.h / b[3])
  const w = vw / s
  const h = vh / s
  return [b[0] + b[2] / 2 - (fr.l + fr.w / 2) / s, b[1] + b[3] / 2 - (fr.t + fr.h / 2) / s, w, h]
}

/** Zoom-aware blend of two view boxes: sizes blend as ratios, and the target point travels with the zoom. */
export function mixVB(a: VB, b: VB, e: number, out: VB): VB {
  const w = a[2] * Math.pow(b[2] / a[2], e)
  const h = a[3] * Math.pow(b[3] / a[3], e)
  const near = Math.abs(a[2] - b[2]) < a[2] * 0.04
  const k = near ? 1 - e : (w - b[2]) / (a[2] - b[2])
  const cx = b[0] + b[2] / 2 + (a[0] + a[2] / 2 - b[0] - b[2] / 2) * k
  const cy = b[1] + b[3] / 2 + (a[1] + a[3] / 2 - b[1] - b[3] / 2) * k
  out[0] = cx - w / 2
  out[1] = cy - h / 2
  out[2] = w
  out[3] = h
  return out
}

export function vbString(v: VB): string {
  return `${v[0].toFixed(2)} ${v[1].toFixed(2)} ${v[2].toFixed(2)} ${v[3].toFixed(2)}`
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

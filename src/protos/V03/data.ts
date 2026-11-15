// Take V03 "Cutaway": the six checks, each living in one cut-open room of the ship.
// Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
const BASE = import.meta.env.BASE_URL

/** Plate space: 1600 x 1000 units, the ship's axis runs along y = AX. */
export const AX = 510
export const PLATE_W = 1600
export const PLATE_H = 1000
/** Centre of the habitat ring on the axis, and its true radius. */
export const RING_X = 770
export const RING_R = 362
export const RING_SQUASH = 0.46

export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  /** the room of the ship this check lives in */
  room: string
  /** why it lives there, three words or fewer */
  why: string
  hue: string
  img: string
  /** natural width / height of the image */
  aspect: number
  /** the part of the image the room shows, in image fractions: x, y, width, height */
  crop: [number, number, number, number]
  /** the room, in plate units: x, y, width, height */
  box: [number, number, number, number]
  /** a room that is not a plain rectangle (the glazed nose) */
  poly?: string
  /** name anchor on the upright (phone) plate, in upright plate units: x, baseline y, and the side the text grows to */
  phone: [number, number, 'start' | 'end']
  run: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    room: 'Storm shelter',
    why: 'Cosmic rays',
    hue: '#ff4fb0',
    img: `${BASE}_posters/tracktrace.jpg`,
    aspect: 1.6,
    crop: [0.0, 0.3, 0.3, 0.4],
    box: [884, 424, 232, 172],
    phone: [628, 1035, 'start'],
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    room: 'Airlock',
    why: 'After a spacewalk',
    hue: '#ff8a3c',
    img: `${BASE}_posters/bubblegrade.jpg`,
    aspect: 1.6,
    crop: [0.3, 0.38, 0.42, 0.6],
    box: [915, 640, 170, 148],
    phone: [342, 1133, 'end'],
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    room: 'Lab',
    why: 'The microscope',
    hue: '#ff5d5d',
    img: `${BASE}spikecount/fields/96.png`,
    aspect: 1,
    crop: [0.06, 0.22, 0.86, 0.6],
    box: [440, 422, 228, 176],
    phone: [373, 472, 'end'],
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    room: 'Med bay',
    why: 'The ultrasound bench',
    hue: '#ffe04a',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    aspect: 1.6,
    crop: [0.1, 0.14, 0.37, 0.44],
    box: [660, 758, 220, 166],
    phone: [22, 603, 'start'],
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    room: 'Sleep station',
    why: 'Brain MRI',
    hue: '#4fd8ff',
    img: `${BASE}_posters/braindrift.jpg`,
    aspect: 1.6,
    crop: [0.2, 0.07, 0.6, 0.86],
    box: [665, 96, 210, 166],
    phone: [716, 603, 'start'],
    run: 'Fly the brain',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    room: 'Cupola',
    why: 'Brainwaves',
    hue: '#a995ff',
    // the real poster, dark ink on a pale sheet, tinted once into light traces on a night wall
    img: `${BASE}themes/V03/garnmeter_night.jpg`,
    aspect: 1.6,
    crop: [0.03, 0.02, 0.3, 0.56],
    box: [86, 410, 164, 200],
    poly: '250,410 178,410 114,446 86,510 114,574 178,610 250,610',
    phone: [620, 182, 'start'],
    run: 'Play the session',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkById(id: string): Check | undefined {
  return CHECKS.find((c) => c.id === id)
}

// ------------------------------------------------------------------ view boxes
export type VB = [number, number, number, number]

/** True when the plate is shown upright (bow up): phones and narrow windows. */
export function isUpright(vw: number, vh: number): boolean {
  return vw <= 820 || vw / vh < 0.9
}

/** A side-on rectangle on the upright plate (the drawing is turned a quarter, bow up). */
export function turn(b: VB): VB {
  return [PLATE_H - b[1] - b[3], b[0], b[3], b[2]]
}

/** True for a short laptop window (a real browser at 1440 wide shows about 1440x730): the pages tighten up. */
export function isShort(vw: number, vh: number): boolean {
  return vh < 800 && !isUpright(vw, vh)
}

/** The whole ship, fitted to the window with the window's own shape. */
export function restVB(vw: number, vh: number): VB {
  const a = vw / vh
  if (!isUpright(vw, vh)) {
    // in a short window the plate shrinks a little and moves right, so the title and the readout keep clear space
    const short = isShort(vw, vh)
    const h = Math.max(1000, PLATE_W / a) / (short ? 0.94 : 1)
    const w = h * a
    const shift = short ? (118 * h) / vh : 0
    return [PLATE_W / 2 - w / 2 - shift, PLATE_H / 2 - h / 2, w, h]
  }
  // upright: the ring (860 units across with its two rooms) spans the width; the nose sits under the title
  const top = Math.min(150, vh * 0.16)
  const bottom = Math.min(150, vh * 0.17)
  const s = Math.min(vw / 872, (vh - top - bottom) / 1470)
  const w = vw / s
  const h = vh / s
  return [PLATE_H - AX - w / 2, 86 - top / s, w, h]
}

/** Where the module page's stage frame sits in the window (matches v03.css). */
export function stageFrame(vw: number, vh: number): { l: number; t: number; w: number; h: number } {
  if (vw <= 820) return { l: 0, t: vh * 0.26, w: vw, h: vh * 0.62 }
  const pad = vw >= 1100 ? 56 : 28
  // --m-top and --m-bot in v03.css
  const short = isShort(vw, vh)
  const top = short ? 142 : 206
  const bot = short ? 78 : 92
  return { l: pad, t: top, w: vw - pad * 2, h: Math.max(320, vh - top - bot) }
}

/**
 * A room's wall screen in plate units (side-on): the room less its lit margin and the sill with the nameplate.
 * The cupola's glazing stops above its band on the side-on plate (Ship.tsx draws it).
 */
export function screenRect(c: Check, upright: boolean): VB {
  const [x, y, w, h] = c.box
  if (c.poly) return upright ? [x, y, w, h] : [x, y, w, 126]
  return [x + 9, y + 9, w - 18, upright ? h - 31 : h - 44]
}

/** The view box that brings one room's screen up to fill the stage frame (centred, just inside it). */
export function roomVB(c: Check, vw: number, vh: number): VB {
  const up = isUpright(vw, vh)
  const r = screenRect(c, up)
  const b = up ? turn(r) : r
  const f = stageFrame(vw, vh)
  const s = Math.min(f.w / b[2], f.h / b[3]) * 0.98
  const w = vw / s
  const h = vh / s
  return [b[0] + b[2] / 2 - (f.l + f.w / 2) / s, b[1] + b[3] / 2 - (f.t + f.h / 2) / s, w, h]
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
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Image placement so that a check's crop covers a rectangle. */
export function coverImage(c: Check, x: number, y: number, w: number, h: number): { x: number; y: number; width: number; height: number } {
  const [cx, cy, cw, ch] = c.crop
  const dw = Math.max(w / cw, (c.aspect * h) / ch)
  const dh = dw / c.aspect
  return { x: x + w / 2 - (cx + cw / 2) * dw, y: y + h / 2 - (cy + ch / 2) * dh, width: dw, height: dh }
}

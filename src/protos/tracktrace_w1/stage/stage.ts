// TrackTrace moment: the timeline and the canvas renderer. Everything here is a pure function of
// (scene, t): the same clock value always draws the same frame. No React, no timers.
import type { NucleusResult, WellResult } from '../../../engine/tracktrace'

/** IonScan token grid (32 x 32) and model-input canvas (128 x 128). */
export const G = 32
export const N = 128
const PX = N * N

/** Beat start times in ms. One scan lasts SCAN_LEN; there are eight. (k1: about 1.6 x slower than the first cut, so each beat can be read.) */
export const T = {
  TOKENS: 0,
  SCANS: 700,
  SCAN_LEN: 300,
  FOCI: 3100,
  LINE: 4900,
  NUCLEUS_END: 6100,
  PULLBACK: 6100,
  SAMPLE: 8100,
  VERDICT: 10300,
  END: 11200,
} as const

export type BeatName = 'specimen' | 'tokens' | 'scans' | 'foci' | 'line' | 'pullback' | 'sample' | 'verdict'

/** The named beats: when each runs and what it shows about the model. */
export const BEATS: { name: BeatName; t0: number; t1: number; shows: string }[] = [
  { name: 'specimen', t0: 0, t1: 0, shows: 'the nucleus as the model receives it (its 128 x 128 input)' },
  { name: 'tokens', t0: T.TOKENS, t1: T.SCANS, shows: 'IonScan cuts the image into a 32 x 32 grid of tokens' },
  { name: 'scans', t0: T.SCANS, t1: T.FOCI, shows: 'the eight scans in the real order: rows, columns, then both diagonals, each forward then backward' },
  { name: 'foci', t0: T.FOCI, t1: T.LINE, shows: 'circles land where the foci decoder fired; the count is the number of circles' },
  { name: 'line', t0: T.LINE, t1: T.NUCLEUS_END, shows: 'the geometric line fit, drawn only when the line rule fires' },
  { name: 'pullback', t0: T.PULLBACK, t1: T.SAMPLE, shows: 'the same nucleus becomes one tile among every nucleus of its sample; the lens docks beside them' },
  { name: 'sample', t0: T.SAMPLE, t1: T.VERDICT, shows: 'tiles light in batches of 16 as the stored whole-sample scan replays' },
  { name: 'verdict', t0: T.VERDICT, t1: T.END, shows: 'the ten nuclei the sample model weighted most are ringed; the sample verdict lands' },
]

export function beatAt(t: number): BeatName {
  if (t <= 0) return 'specimen'
  for (let i = BEATS.length - 1; i > 0; i--) if (t >= BEATS[i].t0) return BEATS[i].name
  return 'tokens'
}

/** Screen direction of each scan, in IonScan's internal order (tt_model.S6Scans): 0, 90, 45, 135 degrees, each forward then backward. */
export const SCAN_DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1], [1, 1], [-1, -1],
]

/**
 * Position of token (row i, column j) along its own line in scan k: the step at which that scan reads it.
 * From tt_model.line_tables: 0 deg reads a row with j rising; 90 deg a column with i rising; 45 deg the line
 * i + j = c with j rising (up-right); 135 deg the line j - i = c with i rising (down-right). Backward = reversed.
 */
export function scanStep(k: number, i: number, j: number): number {
  const a = G - 1 - i
  const b = G - 1 - j
  switch (k) {
    case 0: return j
    case 1: return b
    case 2: return i
    case 3: return a
    case 4: return Math.min(j, a)
    case 5: return Math.min(i, b)
    case 6: return Math.min(i, j)
    default: return Math.min(a, b)
  }
}

export interface Colors {
  stage: string
  specimen: string
  ink: string
  ink2: string
  mark: string
  accent: string
}

/** Camera fit of one nucleus: zoom that fills the square, its centre, and its largest radius from that centre (canvas px). */
export interface Fit {
  z: number
  cx: number
  cy: number
  r: number
}

export interface Atlas {
  nuc: HTMLCanvasElement
  dots: HTMLCanvasElement
  ts: number
  cols: number
  n: number
}

export interface Scene {
  W: number
  H: number
  colors: Colors
  annotate: boolean
  touch: boolean
  hero: HTMLCanvasElement | null
  heroTok: HTMLCanvasElement | null
  tok: Float32Array | null
  result: NucleusResult | null
  heat: HTMLCanvasElement | null
  well: WellResult | null
  atlas: Atlas | null
  /** Index of the hero nucleus in its well, or -1 when its well ships no images. */
  wellIndex: number
  /** Camera fit of the hero: zoom that fills the square with the nucleus, and the nucleus centre (canvas px). */
  fit: Fit
  pick: number | null
  pickFit: Fit | null
  /** Live IonScan result for the nucleus under the lens (laptop only); null = draw the stored circle centres. */
  pickResult: NucleusResult | null
  pickImg: HTMLCanvasElement | null
}

export interface Layout {
  pad: number
  foot: number
  /** true = the lens docks in a column left of the sample; false = in a band above it. */
  column: boolean
  hero: { cx: number; cy: number; side: number }
  mosaic: { x: number; y: number; cols: number; rows: number; tile: number } | null
  /** Where the lens rests once the view has pulled back: outside the mosaic, so it hides no nucleus. */
  lens: [number, number]
  loupeR: number
  /** Where the count sits beside the docked lens, and the widest it may be (css px). */
  note: { x: number; y: number; w: number }
  /** The strip under the mosaic that carries the sample sentence. */
  sample: { x: number; w: number }
}

export interface FrameInfo {
  beat: BeatName
  /** 0..7 while a scan runs, else -1. */
  scan: number
  /** Circles landed so far. */
  count: number
  /** Nuclei of the sample read so far. */
  read: number
  /** Note anchor (css px): under the nucleus while it fills the stage, beside the docked lens after the pull-back. */
  noteX: number
  noteY: number
  noteW: number
  noteAlpha: number
  /** '' = centred under the nucleus; 'col' = below the lens, left-aligned; 'band' = right of the lens, vertically centred. */
  dock: '' | 'col' | 'band'
  sampleX: number
  sampleW: number
  /** 'caption' = scan caption, 'count' = spot count. */
  note: 'none' | 'caption' | 'count'
  lineShown: boolean
  /** Sample line (bottom) visibility 0..1. */
  sampleAlpha: number
  verdictShown: boolean
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 4)
const easeInOut = (u: number) => {
  const x = clamp(u)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a))
  return x * x * (3 - 2 * x)
}

export function timelineEnd(sc: Scene): number {
  return sc.well && sc.atlas && sc.wellIndex >= 0 ? T.END : T.NUCLEUS_END
}

export function layout(W: number, H: number, annotate: boolean, n: number): Layout {
  const narrow = W < 600
  const pad = narrow ? 12 : 24
  const foot = annotate ? (narrow ? 104 : 64) : 0
  const aw = W - pad * 2
  const ah = H - pad * 2 - foot
  const side = Math.max(40, Math.min(aw, ah))
  const hero = { cx: W / 2, cy: pad + ah / 2, side }
  const column = W >= 900 && W > H * 1.15
  const gap = narrow ? 12 : 32
  let R: number
  let lens: [number, number]
  let area: { x: number; y: number; w: number; h: number }
  let note: Layout['note']
  if (column) {
    R = clamp(Math.min(W * 0.14, ah * 0.3), 56, 210)
    area = { x: pad + R * 2 + gap, y: pad, w: aw - R * 2 - gap, h: ah }
    // the lens and the count under it sit as one group, centred on the mosaic's height
    lens = [pad + R, annotate ? pad + R + clamp((ah - R * 2 - 215) / 2, 2, 90) : pad + ah / 2]
    note = { x: pad + 4, y: lens[1] + R + 20, w: R * 2 - 4 }
  } else {
    R = clamp(Math.min(W * 0.24, ah * 0.16), 48, 150)
    area = { x: pad, y: pad + R * 2 + gap, w: aw, h: ah - R * 2 - gap }
    lens = [annotate ? pad + R : W / 2, pad + R]
    note = { x: pad + R * 2 + 14, y: pad + R, w: aw - R * 2 - 14 }
  }
  let mosaic: Layout['mosaic'] = null
  if (n > 0) {
    let cols = 1
    let tile = 0
    for (let c = 6; c <= 72; c++) {
      const s = Math.min(area.w / c, area.h / Math.ceil(n / c))
      if (s > tile) { tile = s; cols = c }
    }
    const rows = Math.ceil(n / cols)
    mosaic = { cols, rows, tile, x: area.x + (area.w - cols * tile) / 2, y: area.y + (area.h - rows * tile) / 2 }
  }
  return { pad, foot, column, hero, mosaic, lens, loupeR: R, note, sample: { x: column ? area.x : pad, w: column ? area.w : aw } }
}

/** Idle zoom: the nucleus is scaled up until it bleeds past the stage edges (K x the stage's short side). */
export function idleZoom(L: Layout, fit: Fit, W: number, H: number): number {
  const k = W > H ? 1.25 : 1.55
  return Math.max(fit.z, (k * Math.min(W, H) * N) / (2 * fit.r * L.hero.side))
}

/** Centre of tile i in the settled mosaic. */
export function tileCentre(L: Layout, i: number): [number, number] {
  const m = L.mosaic!
  return [m.x + ((i % m.cols) + 0.5) * m.tile, m.y + (Math.floor(i / m.cols) + 0.5) * m.tile]
}

/** Tile under a stage point, or null. */
export function tileAt(L: Layout, n: number, x: number, y: number): number | null {
  const m = L.mosaic
  if (!m) return null
  const c = Math.floor((x - m.x) / m.tile)
  const r = Math.floor((y - m.y) / m.tile)
  if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return null
  const i = r * m.cols + c
  return i < n ? i : null
}

// ---- images -------------------------------------------------------------------------------------------------
let probe: CanvasRenderingContext2D | null = null
/** Any CSS colour -> [r, g, b]. */
export function rgbOf(css: string): [number, number, number] {
  if (!probe) probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#000'
  probe.fillStyle = css
  probe.fillRect(0, 0, 1, 1)
  const d = probe.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2]]
}

/** 99.6th percentile of the values inside the nucleus (x > 0): the white point of the display stretch. */
export function whitePoint(x: Float32Array, off = 0): number {
  const bins = new Uint32Array(512)
  let n = 0
  for (let p = 0; p < PX; p++) {
    const v = x[off + p]
    if (v > 0) { bins[Math.min(511, (v * 110) | 0)]++; n++ }
  }
  let acc = 0
  for (let b = 0; b < 512; b++) {
    acc += bins[b]
    if (acc >= n * 0.996) return Math.max(0.5, (b + 1) / 110)
  }
  return 4.2
}

const tone = (v: number, hi: number) => 0.05 + 0.95 * Math.pow(Math.min(1, v / hi), 1.45)

/** Zoom and centre that make the nucleus (x > 0) fill the square. */
export function fitOf(x: Float32Array, off = 0): Fit {
  let r0 = N, r1 = -1, c0 = N, c1 = -1
  for (let p = 0; p < PX; p++) {
    if (x[off + p] <= 0) continue
    const r = (p / N) | 0
    const c = p % N
    if (r < r0) r0 = r
    if (r > r1) r1 = r
    if (c < c0) c0 = c
    if (c > c1) c1 = c
  }
  if (r1 < 0) return { z: 1, cx: N / 2, cy: N / 2, r: N / 2 }
  const z = clamp((0.95 * N) / Math.max(r1 - r0 + 1, c1 - c0 + 1), 1, 1.45)
  const cx = (c0 + c1 + 1) / 2
  const cy = (r0 + r1 + 1) / 2
  let d2 = 1
  for (let p = 0; p < PX; p++) {
    if (x[off + p] <= 0) continue
    const dy = ((p / N) | 0) + 0.5 - cy
    const dx = (p % N) + 0.5 - cx
    if (dx * dx + dy * dy > d2) d2 = dx * dx + dy * dy
  }
  return { z, cx, cy, r: Math.sqrt(d2) }
}

/** One nucleus (model input x) as a 128 x 128 image: the specimen colour, opacity = stretched intensity. */
export function nucleusCanvas(x: Float32Array, off: number, rgb: [number, number, number], hi = whitePoint(x, off)): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')!
  const im = ctx.createImageData(N, N)
  for (let p = 0; p < PX; p++) {
    const v = x[off + p]
    im.data[p * 4] = rgb[0]
    im.data[p * 4 + 1] = rgb[1]
    im.data[p * 4 + 2] = rgb[2]
    im.data[p * 4 + 3] = v > 0 ? 255 * tone(v, hi) : 0
  }
  ctx.putImageData(im, 0, 0)
  return c
}

/** Mean of each 4 x 4 patch: the 32 x 32 token view, as an image and as values 0..1. */
export function tokenCanvas(x: Float32Array, rgb: [number, number, number], hi: number): { canvas: HTMLCanvasElement; tok: Float32Array } {
  const tok = new Float32Array(G * G)
  const c = document.createElement('canvas')
  c.width = c.height = G
  const ctx = c.getContext('2d')!
  const im = ctx.createImageData(G, G)
  for (let i = 0; i < G; i++)
    for (let j = 0; j < G; j++) {
      let s = 0
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) s += x[(i * 4 + a) * N + j * 4 + b]
      const v = s / 16
      const q = i * G + j
      tok[q] = Math.min(1, v / hi)
      im.data[q * 4] = rgb[0]
      im.data[q * 4 + 1] = rgb[1]
      im.data[q * 4 + 2] = rgb[2]
      im.data[q * 4 + 3] = v > 0 ? 255 * tone(v, hi) : 0
    }
  ctx.putImageData(im, 0, 0)
  return { canvas: c, tok }
}

/** The foci decoder's probability map (live runs only): the mark colour, opacity = probability. */
export function heatCanvas(prob: Float32Array, rgb: [number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')!
  const im = ctx.createImageData(N, N)
  for (let p = 0; p < PX; p++) {
    im.data[p * 4] = rgb[0]
    im.data[p * 4 + 1] = rgb[1]
    im.data[p * 4 + 2] = rgb[2]
    im.data[p * 4 + 3] = 235 * prob[p]
  }
  ctx.putImageData(im, 0, 0)
  return c
}

/**
 * Every nucleus of the well in one sheet (ts px per tile, 32 per row), plus a second sheet with a dot at each
 * stored circle centre. Built in slices so the first beats never stutter.
 */
export async function buildAtlas(
  imgs: Float32Array, well: WellResult, colors: Colors, tileCss: number, dpr: number, alive: () => boolean,
): Promise<Atlas | null> {
  const n = well.nNuclei
  const ts = Math.round(clamp(tileCss * dpr, 28, 72))
  const cols = 32
  const rows = Math.ceil(n / cols)
  const nuc = document.createElement('canvas')
  const dots = document.createElement('canvas')
  nuc.width = dots.width = cols * ts
  nuc.height = dots.height = rows * ts
  const nctx = nuc.getContext('2d')!
  const dctx = dots.getContext('2d')!
  nctx.imageSmoothingQuality = 'high'
  const rgb = rgbOf(colors.specimen)
  dctx.fillStyle = colors.mark
  const k = ts / N
  const dotR = (clamp(tileCss * 0.04, 0.8, 1.5) * ts) / Math.max(8, tileCss)
  for (let i = 0; i < n; i++) {
    const x0 = (i % cols) * ts
    const y0 = Math.floor(i / cols) * ts
    nctx.drawImage(nucleusCanvas(imgs, i * PX, rgb), x0, y0, ts, ts)
    for (const [row, col] of well.nuclei[i].circles) {
      dctx.beginPath()
      dctx.arc(x0 + (col + 0.5) * k, y0 + (row + 0.5) * k, dotR, 0, Math.PI * 2)
      dctx.fill()
    }
    if (i % 48 === 47) {
      await new Promise((res) => setTimeout(res, 0))
      if (!alive()) return null
    }
  }
  return { nuc, dots, ts, cols, n }
}

// ---- drawing -------------------------------------------------------------------------------------------------
/** The engine's circles (centre and radius from the decoder) and its line (p0 to p1), nothing more. */
function drawMarks(
  ctx: CanvasRenderingContext2D, sc: Scene, r: NucleusResult | null, t: number, left: number, top: number, s: number,
): { count: number; lineShown: boolean } {
  if (!r || t < T.FOCI) return { count: 0, lineShown: false }
  const X = (col: number) => left + (col + 0.5) * s
  const Y = (row: number) => top + (row + 0.5) * s
  const lw = clamp(s * 0.42, 1.25, 3)
  const n = r.circles.length
  const stagger = n > 1 ? Math.min(150, 1000 / (n - 1)) : 0
  const c0 = r.line.center
  const q0 = r.line.p0
  const q1 = r.line.p1
  const lineU = r.line.drawn && c0 && q0 && q1 ? easeOut((t - T.LINE) / 620) : 0
  let count = 0
  ctx.strokeStyle = sc.colors.mark
  ctx.fillStyle = sc.colors.mark
  ctx.lineCap = 'round'
  if (lineU > 0 && c0 && q0 && q1) {
    ctx.globalAlpha = 1
    ctx.lineWidth = lw * 1.5
    ctx.beginPath()
    ctx.moveTo(lerp(X(c0[1]), X(q0[1]), lineU), lerp(Y(c0[0]), Y(q0[0]), lineU))
    ctx.lineTo(lerp(X(c0[1]), X(q1[1]), lineU), lerp(Y(c0[0]), Y(q1[0]), lineU))
    ctx.stroke()
  }
  for (let i = 0; i < n; i++) {
    const c = r.circles[i]
    const u = (t - (T.FOCI + 300 + i * stagger)) / 440
    if (u <= 0) continue
    const e = easeOut(u)
    if (u >= 0.5) count++
    const off = lineU > 0 && !c.onLine
    ctx.globalAlpha = e * (off ? lerp(1, 0.5, lineU) : 1)
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.arc(X(c.x), Y(c.y), c.radiusPx * s * (1 + 0.9 * (1 - e)), 0, Math.PI * 2)
    ctx.stroke()
    if (lineU > 0 && c.onLine) {
      ctx.globalAlpha = lineU
      ctx.beginPath()
      ctx.arc(X(c.x), Y(c.y), Math.max(1.5, lw * 1.1), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  return { count, lineShown: lineU > 0.5 }
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, len: number) {
  const d = Math.hypot(dx, dy)
  const ux = dx / d
  const uy = dy / d
  const hx = x + (ux * len) / 2
  const hy = y + (uy * len) / 2
  const h = len * 0.34
  ctx.beginPath()
  ctx.moveTo(x - (ux * len) / 2, y - (uy * len) / 2)
  ctx.lineTo(hx, hy)
  ctx.moveTo(hx - ux * h - uy * h * 0.8, hy - uy * h + ux * h * 0.8)
  ctx.lineTo(hx, hy)
  ctx.lineTo(hx - ux * h + uy * h * 0.8, hy - uy * h - ux * h * 0.8)
  ctx.stroke()
}

/** Draws the frame at time t (ms) in css px (the caller has already scaled the context by dpr and cleared it). */
export function drawFrame(ctx: CanvasRenderingContext2D, sc: Scene, tIn: number): FrameInfo {
  const { W, H, colors } = sc
  const hasWell = !!(sc.well && sc.atlas && sc.wellIndex >= 0)
  const t = clamp(tIn, 0, hasWell ? T.END : T.NUCLEUS_END)
  const n = hasWell ? sc.well!.nNuclei : 0
  const L = layout(W, H, sc.annotate, n)
  const info: FrameInfo = {
    beat: beatAt(t), scan: -1, count: 0, read: 0, noteX: L.hero.cx, noteY: 0, noteW: 0, noteAlpha: 1, dock: '', note: 'none',
    lineShown: false, sampleAlpha: 0, verdictShown: false, sampleX: L.sample.x, sampleW: L.sample.w,
  }
  ctx.clearRect(0, 0, W, H)
  if (!sc.hero) return info

  const e = hasWell ? easeInOut((t - T.PULLBACK) / (T.SAMPLE - T.PULLBACK)) : 0
  const settled = hasWell && t >= T.END
  const picked = settled && sc.pick !== null && sc.pick !== sc.wellIndex && sc.pickImg ? sc.pick : null
  const lens = L.lens

  // ---- the sample: every nucleus of the well, pulled back from the hero's own tile
  let tileNow: [number, number] = [L.hero.cx, L.hero.cy]
  if (hasWell && e > 0) {
    const m = L.mosaic!
    const at = sc.atlas!
    const well = sc.well!
    const z = Math.exp(lerp(Math.log(L.hero.side / m.tile), 0, e))
    const [fx, fy] = tileCentre(L, sc.wellIndex)
    tileNow = [lerp(L.hero.cx, fx, e), lerp(L.hero.cy, fy, e)]
    const mAlpha = smooth(0, 0.55, e)
    const batches = Math.ceil(n / 16)
    const read = t < T.SAMPLE ? 0 : Math.min(n, Math.floor(clamp((t - T.SAMPLE) / (T.VERDICT - T.SAMPLE - 220)) * batches) * 16)
    info.read = read
    const size = m.tile * z
    const ox = tileNow[0] - fx * z
    const oy = tileNow[1] - fy * z
    ctx.imageSmoothingQuality = 'high'
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = mAlpha * (pass === 0 ? 0.24 : 1)
      for (let i = 0; i < n; i++) {
        const lit = i < read || i === sc.wellIndex
        if (lit !== (pass === 1)) continue
        const x = ox + (m.x + (i % m.cols) * m.tile) * z
        const y = oy + (m.y + Math.floor(i / m.cols) * m.tile) * z
        if (x > W || y > H || x + size < 0 || y + size < 0) continue
        const sx = (i % at.cols) * at.ts
        const sy = Math.floor(i / at.cols) * at.ts
        ctx.drawImage(at.nuc, sx, sy, at.ts, at.ts, x, y, size, size)
        if (lit) ctx.drawImage(at.dots, sx, sy, at.ts, at.ts, x, y, size, size)
      }
    }
    ctx.globalAlpha = 1
    // the batch being read right now
    if (t >= T.SAMPLE && read < n) {
      ctx.strokeStyle = colors.ink
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.7
      for (let i = read; i < Math.min(n, read + 16); i++) {
        ctx.strokeRect(m.x + (i % m.cols) * m.tile + 0.5, m.y + Math.floor(i / m.cols) * m.tile + 0.5, m.tile - 1, m.tile - 1)
      }
      ctx.globalAlpha = 1
    }
    // the ten nuclei the sample model weighted most: all ten, always (the lens rests outside the mosaic)
    if (t >= T.VERDICT) {
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = m.tile < 28 ? 1.5 : 2
      well.highlight.forEach((idx, j) => {
        const u = easeOut((t - T.VERDICT - j * 45) / 420)
        if (u <= 0) return
        const [hx, hy] = tileCentre(L, idx)
        ctx.globalAlpha = u
        ctx.beginPath()
        ctx.arc(hx, hy, m.tile * (0.56 + 0.35 * (1 - u)), 0, Math.PI * 2)
        ctx.stroke()
      })
      ctx.globalAlpha = 1
    }
    info.sampleAlpha = smooth(0.7, 1, e)
    info.verdictShown = t >= T.VERDICT + 200
  }

  // ---- the nucleus: filling the stage, then under the lens
  // tokens: the smooth image gives way to the 32 x 32 grid the model reads, and comes back before the circles
  const tokMix = t <= 0 ? 0 : Math.min(smooth(T.TOKENS, T.SCANS - 100, t), 1 - smooth(T.FOCI, T.FOCI + 520, t))
  // idle: the nucleus bleeds past the stage edges; it eases back to the model's whole input square as the reading starts
  const idleU = 1 - smooth(T.TOKENS, T.SCANS - 100, t)
  let cx = L.hero.cx
  let cy = lerp(L.hero.cy, W > H ? H / 2 : H * 0.56, idleU)
  let side = L.hero.side
  const bottom = L.hero.cy + side / 2
  let clipR = 0
  if (hasWell && e > 0) {
    cx = lerp(L.hero.cx, lens[0], e)
    cy = lerp(L.hero.cy, lens[1], e)
    clipR = lerp(Math.hypot(W, H) * 0.56, L.loupeR, e)
    // callout from the tile to the lens (the stage's own pointer, so it is drawn in ink, not in the model's colour)
    const tc = picked !== null ? tileCentre(L, picked) : tileNow
    const m = L.mosaic!
    const dist = Math.hypot(cx - tc[0], cy - tc[1])
    const half = (m.tile * (picked !== null ? 1 : Math.exp(lerp(Math.log(L.hero.side / m.tile), 0, e)))) / 2
    if (picked !== null) {
      // the first nucleus keeps a faint frame while another one is under the lens
      const hc = tileCentre(L, sc.wellIndex)
      ctx.strokeStyle = colors.ink
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1
      ctx.strokeRect(hc[0] - m.tile / 2, hc[1] - m.tile / 2, m.tile, m.tile)
      ctx.globalAlpha = 1
    }
    if (dist > clipR + 2 && half < 60) {
      ctx.strokeStyle = colors.ink
      ctx.lineWidth = 1.5
      ctx.strokeRect(tc[0] - half, tc[1] - half, half * 2, half * 2)
      const ux = (cx - tc[0]) / dist
      const uy = (cy - tc[1]) / dist
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tc[0] + ux * half * 1.3, tc[1] + uy * half * 1.3)
      ctx.lineTo(cx - ux * clipR, cy - uy * clipR)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, clipR, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = smooth(0, 0.25, e)
    ctx.fillStyle = colors.stage
    ctx.fillRect(cx - clipR, cy - clipR, clipR * 2, clipR * 2)
    ctx.globalAlpha = 1
  }
  // camera: close on the nucleus, easing back to the model's whole input square while it is read
  const fit = picked !== null && sc.pickFit ? sc.pickFit : sc.fit
  const zClose = idleU > 0 ? lerp(fit.z, idleZoom(L, fit, W, H), idleU) : fit.z
  const sHero = (side * lerp(zClose, 1, tokMix)) / N
  const sLens = Math.min((0.92 * L.loupeR) / fit.r, (2.9 * L.loupeR) / N)
  const s = e > 0 ? Math.exp(lerp(Math.log(sHero), Math.log(sLens), e)) : sHero
  const left = cx - lerp(lerp(fit.cx, N / 2, tokMix), fit.cx, e) * s
  const top = cy - lerp(lerp(fit.cy, N / 2, tokMix), fit.cy, e) * s
  side = N * s
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (picked !== null) {
    ctx.drawImage(sc.pickImg!, left, top, side, side)
    const w = sc.well!.nuclei[picked]
    if (sc.pickResult) {
      const mk = drawMarks(ctx, sc, sc.pickResult, T.END, left, top, s)
      info.count = mk.count
      info.lineShown = mk.lineShown
    } else {
      // stored outputs hold each circle's centre only, so a stored nucleus gets the same centre dots as its tile
      ctx.fillStyle = colors.mark
      const dot = clamp(s * 0.9, 2, 4)
      for (const [row, col] of w.circles) {
        ctx.beginPath()
        ctx.arc(left + (col + 0.5) * s, top + (row + 0.5) * s, dot, 0, Math.PI * 2)
        ctx.fill()
      }
      info.count = w.count
    }
    info.note = 'count'
  } else {
    ctx.globalAlpha = 1 - tokMix * 0.9
    ctx.drawImage(sc.hero, left, top, side, side)
    if (tokMix > 0 && sc.heroTok && sc.tok) {
      ctx.imageSmoothingEnabled = false
      ctx.globalAlpha = tokMix
      ctx.drawImage(sc.heroTok, left, top, side, side)
      ctx.imageSmoothingEnabled = true
      const cell = side / G
      ctx.strokeStyle = colors.ink2
      ctx.lineWidth = 1
      ctx.globalAlpha = tokMix * 0.22
      ctx.beginPath()
      for (let g = 0; g <= G; g++) {
        const p = Math.round(g * cell) + 0.5
        ctx.moveTo(left + p, top)
        ctx.lineTo(left + p, top + side)
        ctx.moveTo(left, top + p)
        ctx.lineTo(left + side, top + p)
      }
      ctx.stroke()
      // the eight scans, in the model's order; each line of tokens is read from its own first token.
      // The token being read is lit whatever it holds; behind it the trail's brightness is the input it just read.
      if (t >= T.SCANS && t < T.FOCI) {
        const k = Math.min(7, Math.floor((t - T.SCANS) / T.SCAN_LEN))
        const u = (t - T.SCANS - k * T.SCAN_LEN) / (T.SCAN_LEN - 20)
        const TRAIL = 10
        const head = u * (G - 1 + TRAIL)
        info.scan = k
        ctx.fillStyle = colors.ink
        for (let i = 0; i < G; i++)
          for (let j = 0; j < G; j++) {
            const d = head - scanStep(k, i, j)
            if (d < 0 || d > TRAIL) continue
            const f = 1 - d / TRAIL
            ctx.globalAlpha = d < 1 ? 0.55 + 0.45 * sc.tok[i * G + j] : Math.min(1, f * f * (0.2 + 0.8 * sc.tok[i * G + j]))
            ctx.fillRect(left + j * cell, top + i * cell, cell + 0.5, cell + 0.5)
          }
      }
      // which of the eight scans is running
      if (sc.annotate && t < T.FOCI + 520) {
        const gap = clamp(side / 14, 22, 34)
        const y = bottom + 18
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const kNow = t < T.SCANS ? -1 : Math.min(7, Math.floor((t - T.SCANS) / T.SCAN_LEN))
        for (let k = 0; k < 8; k++) {
          ctx.strokeStyle = k === kNow ? colors.ink : colors.ink2
          ctx.globalAlpha = tokMix * (k === kNow ? 1 : k < kNow ? 0.75 : 0.35)
          arrow(ctx, cx + (k - 3.5) * gap, y, SCAN_DIRS[k][0], SCAN_DIRS[k][1], 13)
        }
      }
      ctx.globalAlpha = 1
      if (tokMix > 0.05) info.note = 'caption'
    }
    ctx.globalAlpha = 1
    // the foci decoder's probability map blooms, then resolves into circles (live runs only)
    if (sc.heat && t >= T.FOCI && t < T.LINE + 220) {
      ctx.globalAlpha = smooth(T.FOCI, T.FOCI + 360, t) * (1 - smooth(T.FOCI + 1000, T.LINE + 220, t))
      ctx.drawImage(sc.heat, left, top, side, side)
      ctx.globalAlpha = 1
    }
    const mk = drawMarks(ctx, sc, sc.result, t, left, top, s)
    info.count = mk.count
    info.lineShown = mk.lineShown
    if (sc.result && (mk.count > 0 || t >= T.LINE)) info.note = 'count'
  }
  if (clipR > 0) {
    ctx.restore()
    ctx.strokeStyle = colors.ink2
    ctx.globalAlpha = smooth(0.3, 0.9, e)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, clipR, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  // the words: under the nucleus while it fills the stage; beside the docked lens once the view has pulled back
  if (e >= 0.5) {
    info.dock = L.column ? 'col' : 'band'
    info.noteX = L.note.x
    info.noteY = L.note.y
    info.noteW = L.note.w
    info.noteAlpha = smooth(0.72, 1, e)
  } else {
    info.noteX = L.hero.cx
    info.noteY = bottom + (info.note === 'caption' ? 34 : 10)
    info.noteAlpha = 1 - smooth(0, 0.3, e)
  }
  return info
}

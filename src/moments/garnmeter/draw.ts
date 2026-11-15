// Canvas drawing for the Garn Meter stage. Everything drawn here is the recording, a measurement or a model output.
// Two instruments stand next to the traces: the scalp map (measured theta) and the Garn gauge (the model's reading).
import type { Frame, StageData } from './timeline'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Layout {
  w: number
  h: number
  portrait: boolean
  /** Under 640 px wide: the two big lines wrap and the legend stacks. */
  narrow: boolean
  /** The scalp map and the dial stand in a column at the right. Otherwise they share a row under the traces. */
  wide: boolean
  pad: number
  /** Small words are on the stage (they get their own rows). */
  notes: boolean
  /** Type and mark scale: 1 on a phone, up to 1.75 on a wide stage, so labels stay readable on a projector. */
  u: number
  /** The column that holds the traces, the strip and the rail (the whole stage when not wide). */
  col: { x: number; w: number }
  /** Left gutter of the traces: the channel names stand there. */
  gutter: number
  /** The traces once the session is playing or settled. */
  traces: Rect
  /** The traces at idle: they also take the room of the session strip, which is not on stage until Play fills it. */
  tracesIdle: Rect
  /** Top-left corner of the row above the traces: their name and time scale, and at idle the one sentence. */
  head: { x: number; y: number }
  /** Font size of the idle sentence. */
  big: number
  /** Top of the row under the traces, where the 4 s window is named. */
  under: number
  strip: Rect
  /** Inside the strip: the y of 1 Garn and of 0 Garn. */
  plot: { top: number; base: number }
  /** Inside the strip, under the plot: the whole recording as a ribbon, cut into its scenes. */
  ribbon: { y: number; h: number }
  /** Where the legend row sits (between the traces and the strip); h is 0 when notes are off. */
  legend: Rect
  /** The two instrument panels. `yIdle` is the panel's top before the session strip is on stage. */
  scalp: Rect & { yIdle: number; hIdle: number }
  dial: Rect & { yIdle: number; hIdle: number }
}
export interface Palette {
  stage: string
  ink: string
  ink2: string
  mark: string
  accent: string
  ok: string
  watch: string
  alert: string
  /** The halo of the traces and the part the model is reading. */
  glow: string
  font: string
  mono: string
  stageRgb: [number, number, number]
  inkRgb: [number, number, number]
  glowRgb: [number, number, number]
  /** The model's reading (the strip's line and the gauge's arc), as rgb for gradients. */
  accentRgb: [number, number, number]
  fieldHi: [number, number, number]
  fieldLo: [number, number, number]
  /** Scalp map at the baseline (no change): a middle tone, so a drop shows as clearly as a rise. */
  fieldMid: [number, number, number]
}
export interface Signal {
  eeg: Float32Array
  nSamples: number
  sigma: number[]
  trials: { index: number; start: number; length: number; cue: string }[]
  baseline: { start: number; length: number }
  /** Samples per second. */
  fs: number
  channels: string[]
  electrodes: Record<string, [number, number]>
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
/** Soft limiter for big artifacts (blinks): linear near zero, bends towards +-lim. Display only. */
const soft = (v: number, lim: number) => lim * Math.tanh(v / lim)
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
const TAU = Math.PI * 2

export function layoutFor(w: number, h: number, notes = true): Layout {
  const pad = clamp(Math.round(Math.min(w, h) * 0.035), 12, 32)
  const portrait = h > w * 1.05
  const narrow = w < 640
  const wide = w >= 860 && !portrait
  const u = notes ? clamp(w / 900, 1, 1.75) : 1
  const gap = Math.round(pad * 0.9)
  const side = wide ? Math.round(clamp(w * 0.3, 236, 440)) : 0
  const col = { x: pad, w: w - pad * 2 - (wide ? side + gap : 0) }
  const big = narrow ? clamp(Math.round(w * 0.05), 17, 20) : Math.round(19 * u)
  const bigLine = Math.round(big * 1.2)
  // r4: no check-in rail. The column ends with the session strip: the model's reading over the whole recording.
  const bottom = h - pad
  // the strip: the Garn plot, then the ribbon of the whole recording, then (with notes) what each block of scenes varied
  const ribbonH = Math.round(clamp(h * 0.03, 13, 26))
  const cueH = notes ? Math.round(12 * u) + 4 : 0
  const stripH = Math.round(clamp(h * (portrait ? 0.24 : 0.32), 120, 320))
  const stripY = bottom - stripH
  const legendRows = narrow ? 2 : 1
  const legendH = notes ? Math.round(16 * u) * legendRows + 2 : 0
  const legend = { x: col.x, y: stripY - 8 - legendH, w: col.w, h: legendH }
  // not wide: the two instruments share a row between the traces and the legend (at idle: at the foot of the stage)
  const instH = wide ? 0 : Math.round(clamp(h * 0.27, 120, 240))
  const instY = legend.y - instH - 8
  const instIdleY = bottom - instH
  const underRow = notes ? Math.round(14 * u) + 8 : 0
  const under = (wide ? legend.y : instY) - underRow
  const tracesBottom = notes ? under - 8 : (wide ? stripY : instY) - gap
  const gutter = notes ? Math.round(narrow ? 27 : 30 * u) : 0
  const head = { x: col.x, y: pad }
  const ty = pad + (notes ? Math.round(15 * u) + 8 : 0)
  const traces = { x: col.x + gutter, y: ty, w: col.w - gutter, h: Math.max(40, tracesBottom - ty) }
  // idle: one sentence (two lines on a phone), then the traces down to the foot of the stage (or the instruments)
  // (the sentence is 64 characters at about 0.52 em each: that gives its line count at this width)
  const sayLines = Math.ceil((64 * big * 0.52) / col.w + 0.15)
  const iy0 = pad + (notes ? bigLine * sayLines + 14 : 0)
  const idleBottom = wide ? bottom : instIdleY - gap
  // a big swing on the top trace may reach most of a row above it: keep that clear of the sentence
  const iy = iy0 + (notes ? Math.round(((idleBottom - iy0) / 14) * 0.55) : 0)
  const tracesIdle = { x: traces.x, y: iy, w: traces.w, h: Math.max(40, idleBottom - iy) }
  // the strip spans the same width as the traces' column: with the whole session in view, a moment sits at the same x in both
  const strip = { x: traces.x, y: stripY, w: traces.w, h: stripH }
  const plotTop = stripY + (notes ? Math.round(16 * u) + 6 : 11)
  const ribbonY = stripY + stripH - cueH - ribbonH
  const plot = { top: plotTop, base: ribbonY - 7 }
  const ribbon = { y: ribbonY, h: ribbonH }
  let scalp: Layout['scalp']
  let dial: Layout['dial']
  if (wide) {
    // the gauge is the hero instrument: it takes about half the height, the scalp map the rest
    const sx = col.x + col.w + gap
    const dialH = Math.round(clamp(h * 0.52, 220, 460))
    dial = { x: sx, y: h - pad - dialH, w: side, h: dialH, yIdle: h - pad - dialH, hIdle: dialH }
    const sh = dial.y - gap - pad
    scalp = { x: sx, y: pad, w: side, h: sh, yIdle: pad, hIdle: sh }
  } else {
    const half = (w - pad * 2 - gap) / 2
    scalp = { x: pad, y: instY, w: half, h: instH, yIdle: instIdleY, hIdle: instH }
    dial = { x: pad + half + gap, y: instY, w: half, h: instH, yIdle: instIdleY, hIdle: instH }
  }
  return { w, h, portrait, narrow, wide, pad, notes, u, col, gutter, traces, tracesIdle, head, big, under, strip, plot, ribbon, legend, scalp, dial }
}

/** y of a Garn value inside the session strip. */
export const stripGarnY = (L: Layout, g: number) => L.plot.base - clamp(g, 0, 1) * (L.plot.base - L.plot.top)
/** x of a sample inside the session strip (the strip always spans the whole recording). */
export const stripSampleX = (L: Layout, nSamples: number, sample: number) => L.strip.x + (sample / nSamples) * L.strip.w
/** Left and right edge, in px, of the model's 4 s window on the traces; null when it is not on stage. */
export function scanPx(L: Layout, sig: Signal, fr: Frame): [number, number] | null {
  if (!fr.scan || fr.scan.alpha <= 0.01) return null
  const r = L.traces
  const s0 = clamp(fr.cam[0], 0, sig.nSamples - 2)
  const s1 = clamp(fr.cam[1], s0 + 2, sig.nSamples)
  const xOf = (s: number) => r.x + ((s - s0) / (s1 - s0)) * r.w
  const a = clamp(xOf(fr.scan.start), r.x, r.x + r.w)
  const b = clamp(xOf(fr.scan.end), r.x, r.x + r.w)
  return b - a > 0.5 ? [a, b] : null
}
/** A round duration whose bar on the traces is at most 180 px (and a quarter of the traces) wide: the time scale. */
export function timeScale(L: Layout, sig: Signal, fr: Frame): { seconds: number; px: number } {
  const span = Math.max(2, fr.cam[1] - fr.cam[0]) / sig.fs
  const pxPerS = L.traces.w / span
  let seconds = 0.5
  const max = Math.min(180 * L.u, L.traces.w * 0.25)
  for (const u of [1, 2, 5, 10, 30, 60]) if (u * pxPerS <= max) seconds = u
  return { seconds, px: seconds * pxPerS }
}

/** Words drawn on the canvas (instrument captions, channel names). */
function word(ctx: CanvasRenderingContext2D, pal: Palette, s: string, x: number, y: number, px: number, o: { color?: string; alpha?: number; align?: CanvasTextAlign; weight?: number; mono?: boolean; base?: CanvasTextBaseline; track?: number } = {}) {
  ctx.font = `${o.weight ?? 500} ${px.toFixed(1)}px ${o.mono ? pal.mono : pal.font}`
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'alphabetic'
  ctx.fillStyle = o.color ?? pal.ink2
  ctx.globalAlpha = o.alpha ?? 1
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = `${(o.track ?? 0) * px}px`
  ctx.fillText(s, x, y)
  if ('letterSpacing' in c) c.letterSpacing = '0px'
  ctx.globalAlpha = 1
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}
// ---------------------------------------------------------------- scalp field (measured theta, interpolated)
const G = 64
const HEAD = 1.18 // head radius in electrode units (farthest electrode sits at 1.0)
export interface Field {
  weights: Float32Array
  inside: Uint8Array
  canvas: HTMLCanvasElement
  img: ImageData
  nCh: number
}
export function makeField(sig: Signal): Field {
  const nCh = sig.channels.length
  const weights = new Float32Array(G * G * nCh)
  const inside = new Uint8Array(G * G)
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      const u = ((i + 0.5) / G) * 2 * HEAD - HEAD
      const v = HEAD - ((j + 0.5) / G) * 2 * HEAD
      inside[j * G + i] = u * u + v * v <= HEAD * HEAD ? 1 : 0
      let sum = 0
      const o = (j * G + i) * nCh
      for (let c = 0; c < nCh; c++) {
        const e = sig.electrodes[sig.channels[c]] ?? [0, 0]
        const d2 = (u - e[0]) ** 2 + (v - e[1]) ** 2
        const wgt = 1 / (d2 + 0.02) ** 1.5
        weights[o + c] = wgt
        sum += wgt
      }
      for (let c = 0; c < nCh; c++) weights[o + c] /= sum
    }
  const canvas = document.createElement('canvas')
  canvas.width = G
  canvas.height = G
  return { weights, inside, canvas, img: new ImageData(G, G), nCh }
}

/** Theta deviation (log10 relative power minus baseline) that reaches full tint. The stored values span about -0.85 to 0.56. */
const THETA_FULL = 0.36

function paintField(f: Field, values: Float32Array | null, pal: Palette) {
  const px = f.img.data
  const [sr, sg, sb] = pal.fieldMid
  for (let p = 0; p < G * G; p++) {
    let v = 0
    if (values) {
      const o = p * f.nCh
      for (let c = 0; c < f.nCh; c++) v += f.weights[o + c] * values[c]
    }
    // two-ended: the baseline is the middle tone, more theta goes to one end, less to the other
    const k = clamp(Math.abs(v) / THETA_FULL, 0, 1)
    const to = v >= 0 ? pal.fieldHi : pal.fieldLo
    px[p * 4] = sr + (to[0] - sr) * k
    px[p * 4 + 1] = sg + (to[1] - sg) * k
    px[p * 4 + 2] = sb + (to[2] - sb) * k
    px[p * 4 + 3] = f.inside[p] ? 255 : 0
  }
  f.canvas.getContext('2d')!.putImageData(f.img, 0, 0)
}

/** The scalp map of measured theta: the field, the head, the 14 electrodes. `pulse` (0-1 per channel) swells each
 *  electrode's halo with its own trace at the playhead; `names` prints the channel names next to the dots. */
export function drawScalp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  pal: Palette,
  sig: Signal,
  field: Field,
  values: Float32Array | null,
  pulse: Float32Array | null = null,
  names = false,
) {
  paintField(field, values, pal)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, TAU)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(field.canvas, cx - r, cy - r, r * 2, r * 2)
  // the head is a dome: its rim falls away from the light
  const shade = ctx.createRadialGradient(cx, cy - r * 0.15, r * 0.35, cx, cy, r)
  shade.addColorStop(0, rgba(pal.stageRgb, 0))
  shade.addColorStop(1, rgba(pal.stageRgb, 0.5))
  ctx.fillStyle = shade
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
  // head outline, nose, ears
  ctx.strokeStyle = pal.ink2
  ctx.lineWidth = clamp(r / 70, 1.25, 2)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.13, cy - r * 0.99)
  ctx.lineTo(cx, cy - r * 1.13)
  ctx.lineTo(cx + r * 0.13, cy - r * 0.99)
  ctx.stroke()
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(cx + s * r * 1.03, cy, r * 0.07, r * 0.19, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : (3 * Math.PI) / 2)
    ctx.stroke()
  }
  // the 14 electrodes: a dot with a dark rim, so it shows on a dark and on a light patch
  const k = r / HEAD
  const dot = clamp(r * 0.038, 1.5, 5)
  sig.channels.forEach((ch, c) => {
    const e = sig.electrodes[ch]
    if (!e) return
    const x = cx + e[0] * k
    const y = cy - e[1] * k
    if (pulse) {
      // a soft light that swells and fades with this channel's own trace at the playhead
      const p = pulse[c]
      const rr = dot + 4 + p * r * 0.2
      const g = ctx.createRadialGradient(x, y, dot * 0.5, x, y, rr)
      g.addColorStop(0, rgba(pal.glowRgb, 0.3 + 0.6 * p))
      g.addColorStop(0.5, rgba(pal.glowRgb, 0.1 + 0.3 * p))
      g.addColorStop(1, rgba(pal.glowRgb, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, rr, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = pal.stage
    ctx.beginPath()
    ctx.arc(x, y, dot + 1.2, 0, TAU)
    ctx.fill()
    ctx.fillStyle = pal.ink
    ctx.beginPath()
    ctx.arc(x, y, dot, 0, TAU)
    ctx.fill()
    if (names) {
      const px = clamp(r * 0.085, 8.5, 13)
      // the name stands under its dot (above it for the two at the back of the head)
      const back = e[1] < -0.7
      word(ctx, pal, ch, x, back ? y - dot - 6 : y + dot + px * 1.15, px, { mono: true, align: 'center', color: pal.ink, alpha: 0.85, weight: 500 })
    }
  })
}

// ---------------------------------------------------------------- the recording: 14 traces
let layer: { key: string; cv: HTMLCanvasElement } | null = null
function drawTraces(ctx: CanvasRenderingContext2D, r: Rect, L: Layout, pal: Palette, sig: Signal, fr: Frame, dpr: number) {
  const nCh = sig.channels.length
  const n = sig.nSamples
  const rowH = r.h / nCh
  const amp = rowH * 0.25
  const lim = rowH * 1.15
  const s0 = clamp(fr.cam[0], 0, n - 2)
  const s1 = clamp(fr.cam[1], s0 + 2, n)
  const span = s1 - s0
  const xOf = (s: number) => r.x + ((s - s0) / span) * r.w
  const spp = span / r.w
  const lw = Math.sqrt(L.u)

  // The part drawn at full light: what the model's 4 s window holds, or at idle the second and a half behind the playhead.
  const zoomed = spp <= 1.5
  let hot: { from: number; to: number; alpha: number; tail: boolean } | null = null
  if (zoomed && fr.scan && fr.scan.alpha > 0.01) hot = { from: fr.scan.start, to: fr.scan.end, alpha: fr.scan.alpha, tail: false }
  // (calibrate has a playhead only while a run waits for the model: the recording keeps playing as at idle)
  else if (zoomed && (fr.beat === 'idle' || fr.beat === 'calibrate') && fr.now !== undefined) hot = { from: fr.now - 1.6 * sig.fs, to: fr.now, alpha: 1, tail: true }

  const path = (from: number, to: number) => {
    ctx.beginPath()
    for (let c = 0; c < nCh; c++) {
      const cy = r.y + rowH * (c + 0.5)
      const base = c * n
      const k = amp / sig.sigma[c]
      const i0 = Math.max(0, Math.floor(from))
      const i1 = Math.min(n - 1, Math.ceil(to))
      for (let i = i0; i <= i1; i++) {
        const y = cy - soft(sig.eeg[base + i] * k, lim)
        if (i === i0) ctx.moveTo(xOf(i), y)
        else ctx.lineTo(xOf(i), y)
      }
    }
  }

  // What does not change from frame to frame while the stage rests (the grid, the names, the traces themselves) is kept
  // on a layer: the resting stage then only redraws the lit part, the playhead and the model's window.
  const main = ctx
  const key = [L.w, L.h, dpr, r.x, r.y, r.w, r.h, s0, s1, fr.inked, fr.sigma, hot ? 1 : 0, pal.ink, pal.ink2, pal.glow, pal.mark, pal.mono].join('|')
  if (!layer) layer = { key: '', cv: document.createElement('canvas') }
  const stale = layer.key !== key
  if (stale) {
    const cw = Math.round(L.w * dpr)
    const ch = Math.round(L.h * dpr)
    if (layer.cv.width !== cw || layer.cv.height !== ch) {
      layer.cv.width = cw
      layer.cv.height = ch
    }
    ctx = layer.cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, L.w, L.h)
    layer.key = key
  }
  if (stale) {
  // a line per second while single seconds are wide enough to read (the bar above the traces gives the scale)
  const pxPerS = (sig.fs / span) * r.w
  if (pxPerS > 36) {
    ctx.strokeStyle = pal.ink2
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.11
    ctx.beginPath()
    for (let s = Math.ceil(s0 / sig.fs); s * sig.fs < s1; s++) {
      const x = Math.round(xOf(s * sig.fs)) + 0.5
      if (x < r.x + 1) continue
      ctx.moveTo(x, r.y - 2)
      ctx.lineTo(x, r.y + r.h + 2)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // calibration: each channel's spread (the model divides by it), drawn as a +-1 spread band over the baseline
  if (fr.sigma > 0.01) {
    const xb = Math.min(r.x + r.w, xOf(sig.baseline.start + sig.baseline.length))
    ctx.globalAlpha = 0.16 * fr.sigma
    ctx.fillStyle = pal.mark
    for (let c = 0; c < nCh; c++) {
      const cy = r.y + rowH * (c + 0.5)
      ctx.fillRect(r.x, cy - amp, Math.max(0, xb - r.x), amp * 2)
    }
    ctx.globalAlpha = 1
  }

  // scene boundaries, once a scene is wide enough to see
  const pxPerTrial = (1024 / span) * r.w
  if (pxPerTrial > 10 && span > 1100) {
    ctx.globalAlpha = 0.14
    ctx.strokeStyle = pal.ink2
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const t of sig.trials) {
      if (t.start <= s0 || t.start >= s1) continue
      const x = Math.round(xOf(t.start)) + 0.5
      ctx.moveTo(x, r.y)
      ctx.lineTo(x, r.y + r.h)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // the channel names, each on its trace's line (the same names stand on the scalp map)
  if (L.gutter > 0) {
    const px = clamp(rowH * 0.6, 7.5, 12.5)
    for (let c = 0; c < nCh; c++) word(ctx, pal, sig.channels[c], r.x - 7, r.y + rowH * (c + 0.5), px, { mono: true, align: 'right', base: 'middle', alpha: 0.9 })
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(r.x, r.y - rowH * 0.7, r.w, r.h + rowH * 1.4)
  ctx.clip()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = pal.ink
  const step = dpr >= 1.5 ? 0.5 : 1
  for (let pass = 0; pass < 2; pass++) {
    // pass 0: inked part, pass 1: the part the playhead has not reached
    const from = pass === 0 ? s0 : Math.max(s0, fr.inked)
    const to = pass === 0 ? Math.min(s1, fr.inked) : s1
    if (to - from < 1) continue
    // a dense overview (many samples per pixel) is drawn lighter, so the whole recording reads as texture, not a wall
    const dense = !zoomed ? clamp(0.92 - 0.1 * Math.log2(spp), 0.4, 0.92) : hot ? 0.55 : 0.9
    ctx.globalAlpha = pass === 0 ? dense : 0.2
    ctx.lineWidth = !zoomed ? step : clamp(rowH / 26, 1, 1.5)
    if (zoomed) {
      // a soft halo first: the traces glow like a scope, they are not hairlines on paper
      if (pass === 0) {
        ctx.strokeStyle = pal.glow
        ctx.globalAlpha = 0.07
        ctx.lineWidth = 4 * lw
        path(from, to)
        ctx.stroke()
        ctx.strokeStyle = pal.ink
        ctx.globalAlpha = dense
        ctx.lineWidth = clamp(rowH / 26, 1, 1.5)
      }
      path(from, to)
    } else {
      ctx.beginPath()
      for (let c = 0; c < nCh; c++) {
        const cy = r.y + rowH * (c + 0.5)
        const base = c * n
        const k = amp / sig.sigma[c]
        const x0 = xOf(from)
        const x1 = xOf(to)
        for (let x = Math.ceil(x0 / step) * step; x < x1; x += step) {
          const a = Math.max(0, Math.floor(s0 + (x - r.x) * spp))
          const b = Math.min(n, Math.ceil(s0 + (x + step - r.x) * spp))
          let lo = Infinity
          let hi = -Infinity
          for (let i = a; i < b; i++) {
            const v = sig.eeg[base + i]
            if (v < lo) lo = v
            if (v > hi) hi = v
          }
          if (lo === Infinity) continue
          const yHi = cy - soft(hi * k, lim)
          const yLo = cy - soft(lo * k, lim)
          ctx.moveTo(x + step / 2, yHi)
          ctx.lineTo(x + step / 2, Math.max(yLo, yHi + step))
        }
      }
    }
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1
  }
  ctx = main
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(layer.cv, 0, 0)
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(r.x, r.y - rowH * 0.7, r.w, r.h + rowH * 1.4)
  ctx.clip()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (hot) {
    const from = Math.max(s0, hot.from)
    const to = Math.min(s1, hot.to, fr.inked)
    if (to - from > 1) {
      const xa = xOf(hot.from)
      const xb = xOf(hot.to)
      const paint = (c: [number, number, number], a: number) => {
        if (!hot.tail) return rgba(c, a)
        const g = ctx.createLinearGradient(xa, 0, xb, 0)
        g.addColorStop(0, rgba(c, 0))
        g.addColorStop(1, rgba(c, a))
        return g
      }
      path(from, to)
      ctx.globalAlpha = hot.alpha
      ctx.strokeStyle = paint(pal.glowRgb, 0.13)
      ctx.lineWidth = 4.5 * lw
      ctx.stroke()
      ctx.strokeStyle = paint(pal.inkRgb, 1)
      ctx.lineWidth = clamp(rowH / 26, 1.05, 1.5)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
  ctx.restore()
  ctx.globalAlpha = 1

  // the playhead: a dot on every trace where the recording is now (the scalp map's electrodes follow the same samples)
  if (zoomed && fr.now !== undefined && fr.now >= s0 && fr.now <= s1 && fr.now <= fr.inked + 1) {
    const x = xOf(fr.now)
    const a = fr.scan ? fr.scan.alpha : 1
    if (fr.beat === 'idle' || fr.beat === 'calibrate') {
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = pal.ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(x) + 0.5, r.y - 4)
      ctx.lineTo(Math.round(x) + 0.5, r.y + r.h + 4)
      ctx.stroke()
    }
    const i = clamp(Math.round(fr.now), 0, n - 1)
    for (let c = 0; c < nCh; c++) {
      const y = r.y + rowH * (c + 0.5) - soft((sig.eeg[c * n + i] * amp) / sig.sigma[c], lim)
      ctx.globalAlpha = 0.22 * a
      ctx.fillStyle = pal.glow
      ctx.beginPath()
      ctx.arc(x, y, 5.5 * lw, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = a
      ctx.fillStyle = pal.ink
      ctx.beginPath()
      ctx.arc(x, y, 2 * lw, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // the model's 4 s window
  if (fr.scan && fr.scan.alpha > 0.01) {
    const a = clamp(xOf(fr.scan.start), r.x, r.x + r.w)
    const b = clamp(xOf(fr.scan.end), r.x, r.x + r.w)
    if (b - a > 0.5) {
      const top = r.y - 4
      const bot = r.y + r.h + 4
      ctx.globalAlpha = 0.1 * fr.scan.alpha
      ctx.fillStyle = pal.mark
      ctx.fillRect(a, top, b - a, bot - top)
      ctx.globalAlpha = fr.scan.alpha
      ctx.strokeStyle = pal.mark
      ctx.lineWidth = 1.5 * lw
      const cap = Math.min(7 * lw, (b - a) / 2)
      ctx.beginPath()
      ctx.moveTo(a + cap, top)
      ctx.lineTo(a, top)
      ctx.lineTo(a, bot)
      ctx.lineTo(a + cap, bot)
      ctx.moveTo(b - cap, top)
      ctx.lineTo(b, top)
      ctx.lineTo(b, bot)
      ctx.lineTo(b - cap, bot)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
}

// ---------------------------------------------------------------- the session strip: the model's reading over time, the recording as a ribbon
/** The whole recording as one bar per 2 px: the channels' mean peak-to-peak swing in that slice, in units of each channel's
 *  spread at rest. A view of the recording, kept per signal and width. */
let ribbonCache: { eeg: Float32Array; cols: number; env: Float32Array } | null = null
function ribbonOf(sig: Signal, cols: number): Float32Array {
  if (ribbonCache && ribbonCache.eeg === sig.eeg && ribbonCache.cols === cols) return ribbonCache.env
  const env = new Float32Array(cols)
  const n = sig.nSamples
  const nCh = sig.channels.length
  let top = 0
  for (let x = 0; x < cols; x++) {
    const a = Math.floor((x / cols) * n)
    const b = Math.max(a + 1, Math.floor(((x + 1) / cols) * n))
    let sum = 0
    for (let c = 0; c < nCh; c++) {
      let lo = Infinity
      let hi = -Infinity
      for (let i = a; i < b; i++) {
        const v = sig.eeg[c * n + i]
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      sum += (hi - lo) / sig.sigma[c]
    }
    env[x] = sum / nCh
    if (env[x] > top) top = env[x]
  }
  // display only: the tallest slice fills the ribbon; a square root keeps the quiet slices visible
  for (let x = 0; x < cols; x++) env[x] = Math.sqrt(env[x] / (top || 1))
  ribbonCache = { eeg: sig.eeg, cols, env }
  return env
}
const CUE_WORDS: Record<string, string> = { Complexity: 'scene complexity', Speed: 'speed', Stereo: 'stereo depth' }

function drawStrip(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, sig: Signal, d: StageData | null, fr: Frame) {
  const r = L.strip
  const lw = Math.sqrt(L.u)
  const xOf = (s: number) => stripSampleX(L, sig.nSamples, s)
  const yOf = (g: number) => stripGarnY(L, g)
  const y0 = yOf(0)
  const y1 = yOf(1)
  const rb = L.ribbon

  // the scenes as cells: every second one a shade lighter, from the 1 Garn line down through the ribbon
  ctx.fillStyle = pal.ink
  sig.trials.forEach((t, i) => {
    ctx.globalAlpha = i % 2 ? 0.05 : 0.022
    ctx.fillRect(xOf(t.start), y1 - 4, xOf(t.start + t.length) - xOf(t.start), rb.y + rb.h - y1 + 4)
  })
  ctx.globalAlpha = 1

  // axes: 0 Garn, and faint lines at 0.5 and 1 Garn
  ctx.strokeStyle = pal.ink2
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.3
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(r.x, Math.round(y1) + 0.5)
  ctx.lineTo(r.x + r.w, Math.round(y1) + 0.5)
  ctx.globalAlpha = 0.2
  ctx.moveTo(r.x, Math.round(yOf(0.5)) + 0.5)
  ctx.lineTo(r.x + r.w, Math.round(yOf(0.5)) + 0.5)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(r.x, Math.round(y0) + 0.5)
  ctx.lineTo(r.x + r.w, Math.round(y0) + 0.5)
  ctx.stroke()
  ctx.globalAlpha = 1

  // the ribbon: the whole recording, lit up to the playhead
  const cols = Math.max(8, Math.floor(r.w / 2))
  const env = ribbonOf(sig, cols)
  const mid = rb.y + rb.h / 2
  const xInk = xOf(fr.inked)
  const fa = d && fr.focusMark > 0.5 ? xOf(d.focus.start) : -1
  const fb = d && fr.focusMark > 0.5 ? xOf(d.focus.start + d.focus.length) : -1
  for (let pass = 0; pass < 3; pass++) {
    // 0: not reached yet, 1: played, 2: the scene in view
    ctx.strokeStyle = pass === 2 ? pal.ink : pal.ink2
    ctx.globalAlpha = pass === 0 ? 0.22 : pass === 1 ? 0.62 : 1
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let i = 0; i < cols; i++) {
      const x = r.x + ((i + 0.5) / cols) * r.w
      const inFocus = x >= fa && x < fb
      const which = inFocus ? 2 : x <= xInk ? 1 : 0
      if (which !== pass) continue
      const hh = Math.max(0.75, (env[i] * rb.h) / 2)
      ctx.moveTo(x, mid - hh)
      ctx.lineTo(x, mid + hh)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // scene cuts through the ribbon, and under it what each block of scenes varied
  ctx.fillStyle = pal.stage
  let cue = ''
  for (const t of sig.trials) {
    const x = Math.round(xOf(t.start))
    ctx.fillRect(x - 1, rb.y - 1, 2, rb.h + 2)
    if (t.cue !== cue) {
      cue = t.cue
      if (L.notes) {
        ctx.fillStyle = pal.ink2
        ctx.globalAlpha = 0.6
        ctx.fillRect(x, rb.y + rb.h + 2, 1, 5 * L.u)
        ctx.globalAlpha = 1
        const next = sig.trials.find((q) => q.start > t.start && q.cue !== t.cue)
        const room = (next ? xOf(next.start) : r.x + r.w) - x - 12
        const full = CUE_WORDS[t.cue] ?? t.cue.toLowerCase()
        ctx.font = `500 ${(10.5 * L.u).toFixed(1)}px ${pal.font}`
        word(ctx, pal, ctx.measureText(full).width <= room ? full : t.cue.toLowerCase(), x + 5, rb.y + rb.h + 3, 10.5 * L.u, { base: 'top' })
        ctx.fillStyle = pal.stage
      }
    }
  }
  if (!d) return

  // the scene in view on the traces: a lit cell with two bright edges (its name tag sits on top; it is the scrubber's handle)
  if (fr.focusMark > 0.01) {
    const a = xOf(d.focus.start)
    const b = xOf(d.focus.start + d.focus.length)
    ctx.globalAlpha = 0.13 * fr.focusMark
    ctx.fillStyle = pal.ink
    ctx.fillRect(a, y1 - 4, b - a, rb.y + rb.h - y1 + 4)
    ctx.globalAlpha = 0.85 * fr.focusMark
    ctx.fillRect(Math.round(a) - 1, y1 - 4, 1.5, rb.y + rb.h - y1 + 6)
    ctx.fillRect(Math.round(b) - 0.5, y1 - 4, 1.5, rb.y + rb.h - y1 + 6)
    ctx.globalAlpha = 1
  }

  // the model's reading, one point per 4 s window (raw output, not smoothed): a lit line with a soft fill under it
  if (fr.thread > 0) {
    const n = Math.min(fr.thread, d.windows.length)
    const line = () => {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const w = d.windows[i]
        if (i === 0) ctx.moveTo(xOf(w.end), yOf(w.garn))
        else ctx.lineTo(xOf(w.end), yOf(w.garn))
      }
    }
    const xa = xOf(d.windows[0].end)
    const xb = xOf(d.windows[n - 1].end)
    line()
    ctx.lineTo(xb, y0)
    ctx.lineTo(xa, y0)
    ctx.closePath()
    const fill = ctx.createLinearGradient(0, y1, 0, y0)
    fill.addColorStop(0, rgba(pal.accentRgb, 0.3))
    fill.addColorStop(1, rgba(pal.accentRgb, 0.02))
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    line()
    ctx.strokeStyle = pal.accent
    ctx.globalAlpha = 0.22
    ctx.lineWidth = 6 * lw
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.lineWidth = 1.6 * lw
    ctx.stroke()
    // while the session plays, a light rides the head of the line
    if (fr.beat === 'session' && n < d.windows.length) {
      const w = d.windows[n - 1]
      const x = xOf(w.end)
      const y = yOf(w.garn)
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14 * lw)
      g.addColorStop(0, rgba(pal.accentRgb, 0.55))
      g.addColorStop(1, rgba(pal.accentRgb, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, 14 * lw, 0, TAU)
      ctx.fill()
      ctx.fillStyle = pal.ink
      ctx.beginPath()
      ctx.arc(x, y, 2.6 * lw, 0, TAU)
      ctx.fill()
    }
  }

  // the scene in view: its stretch of the line lit in ink (up to where the model's window has read), and once settled its mean
  const f = d.focus
  if (fr.focusMark > 0.5 && f.w1 > f.w0) {
    const reach = fr.beat === 'result' || fr.beat === 'settle' || !fr.scan ? Infinity : fr.scan.end + 1
    // the line enters the scene from the window before it, so the lit stretch joins the line
    const i0 = Math.max(0, f.w0 - 1)
    ctx.beginPath()
    let k = 0
    for (let i = i0; i < f.w1; i++) {
      const w = d.windows[i]
      if (i >= f.w0 && w.end > reach) break
      const x = i < f.w0 ? xOf(f.start) : xOf(w.end)
      const y = i < f.w0 ? yOf(w.garn + (d.windows[f.w0].garn - w.garn) * ((f.start - w.end) / Math.max(1, d.windows[f.w0].end - w.end))) : yOf(w.garn)
      if (k++ === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    if (k > 1) {
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.strokeStyle = pal.ink
      ctx.lineWidth = 2.2 * lw
      ctx.stroke()
    }
    const mean = f.modelGarnMean
    if (fr.mean > 0.01 && mean !== null) {
      const a = xOf(f.start)
      const b = xOf(f.start + f.length)
      const y = Math.round(yOf(mean)) + 0.5
      const mid = (a + b) / 2
      const half = ((b - a) / 2 + 5 * lw) * fr.mean
      ctx.strokeStyle = pal.accent
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.3 * fr.mean
      ctx.lineWidth = 8 * lw
      ctx.beginPath()
      ctx.moveTo(mid - half, y)
      ctx.lineTo(mid + half, y)
      ctx.stroke()
      ctx.globalAlpha = fr.mean
      ctx.lineWidth = 3 * lw
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.lineCap = 'butt'
    }
  }
}

// ---------------------------------------------------------------- instruments: panels, the scalp map, the Garn dial
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
function panelRect(p: Rect & { yIdle: number; hIdle: number }, open: number): Rect {
  return { x: p.x, w: p.w, y: lerp(p.yIdle, p.y, open), h: lerp(p.hIdle, p.h, open) }
}
function panel(ctx: CanvasRenderingContext2D, pal: Palette, b: Rect, glowAt: { x: number; y: number; r: number }) {
  const rad = clamp(Math.min(b.w, b.h) * 0.07, 8, 18)
  ctx.save()
  roundRect(ctx, b.x, b.y, b.w, b.h, rad)
  ctx.clip()
  ctx.fillStyle = rgba(pal.inkRgb, 0.03)
  ctx.fillRect(b.x, b.y, b.w, b.h)
  const g = ctx.createRadialGradient(glowAt.x, glowAt.y, glowAt.r * 0.2, glowAt.x, glowAt.y, glowAt.r * 1.9)
  g.addColorStop(0, rgba(pal.glowRgb, 0.13))
  g.addColorStop(1, rgba(pal.glowRgb, 0))
  ctx.fillStyle = g
  ctx.fillRect(b.x, b.y, b.w, b.h)
  ctx.restore()
  roundRect(ctx, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, rad)
  ctx.strokeStyle = rgba(pal.inkRgb, 0.11)
  ctx.lineWidth = 1
  ctx.stroke()
}

let fieldCache: { eeg: Float32Array; field: Field } | null = null
const thetaNow = new Float32Array(64)
const pulseNow = new Float32Array(64)

function drawScalpPanel(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, sig: Signal, d: StageData | null, fr: Frame) {
  const b = panelRect(L.scalp, fr.open)
  const u = L.u
  const small = b.h < 170
  const tp = clamp(b.h * 0.05, 9, 18)
  const titlePx = small ? 10.5 : 11 * u
  const capPx = small ? 10 : 11.5 * u
  const topRow = L.notes ? tp + titlePx + 6 : tp
  const botRow = L.notes ? (small ? capPx + 8 : capPx * 2.9 + 12) : tp
  const r = Math.max(18, Math.min(b.w * 0.41, (b.h - topRow - botRow) / 2.24))
  const cx = b.x + b.w / 2
  const cy = b.y + topRow + (b.h - topRow - botRow) / 2 + r * 0.06
  panel(ctx, pal, b, { x: cx, y: cy, r })

  if (!fieldCache || fieldCache.eeg !== sig.eeg) fieldCache = { eeg: sig.eeg, field: makeField(sig) }
  const nCh = sig.channels.length
  // measured theta of the stored windows the playhead passes (a = -1: the baseline, which is zero by definition)
  let values: Float32Array | null = null
  if (d && fr.scalp) {
    const A = fr.scalp.a >= 0 ? d.windows[fr.scalp.a]?.theta : null
    const B = d.windows[fr.scalp.b]?.theta
    if (B) {
      values = thetaNow.subarray(0, nCh)
      for (let c = 0; c < nCh; c++) values[c] = lerp(A ? A[c] : 0, B[c], fr.scalp.mix)
    }
  }
  // each electrode's halo follows its own trace at the playhead: the mean swing of the last eighth of a second, in spreads
  let pulse: Float32Array | null = null
  if (fr.now !== undefined) {
    pulse = pulseNow.subarray(0, nCh)
    const n = sig.nSamples
    const i1 = clamp(Math.round(fr.now), 0, n - 1)
    const i0 = Math.max(0, i1 - 16)
    for (let c = 0; c < nCh; c++) {
      let s = 0
      for (let i = i0; i <= i1; i++) s += Math.abs(sig.eeg[c * n + i])
      pulse[c] = clamp(s / (i1 - i0 + 1) / sig.sigma[c] / 3, 0, 1)
    }
  }
  // two quiet rings: the map sits in its panel like a dial in a console
  ctx.strokeStyle = pal.ink2
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.16
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.2, 0, TAU)
  ctx.stroke()
  ctx.globalAlpha = 1
  drawScalp(ctx, cx, cy, r, pal, sig, fieldCache.field, values, pulse, L.notes && r >= 84)

  if (!L.notes) return
  const px = b.x + clamp(b.w * 0.06, 8, 20)
  word(ctx, pal, small ? 'THETA VS REST' : 'THETA POWER', px, b.y + tp + titlePx, titlePx, { weight: 600, track: 0.08, color: pal.ink, alpha: 0.9 })
  if (!small) word(ctx, pal, values && d ? (fr.beat === 'session' ? 'whole session' : `scene ${d.focus.index}`) : 'at rest', b.x + b.w - (px - b.x), b.y + tp + titlePx, titlePx, { align: 'right', weight: 500 })
  // key: less ... more than at rest, then what kind of thing this is
  const by = b.y + b.h - tp
  if (small) {
    word(ctx, pal, 'measured, not model output', cx, by, capPx, { align: 'center' })
    return
  }
  word(ctx, pal, 'A measurement, not model output.', cx, by, capPx, { align: 'center' })
  const ky = by - capPx * 1.9
  const kw = Math.min(b.w * 0.2, 80 * u)
  ctx.font = `500 ${capPx.toFixed(1)}px ${pal.font}`
  const wl = ctx.measureText('less').width
  const wr = ctx.measureText('more than at rest').width
  // the key is centred as one group: word, ramp, words
  const kx = cx - (wl + kw + wr + 16) / 2 + wl + 8
  const grad = ctx.createLinearGradient(kx, 0, kx + kw, 0)
  grad.addColorStop(0, rgba(pal.fieldLo, 1))
  grad.addColorStop(0.5, rgba(pal.fieldMid, 1))
  grad.addColorStop(1, rgba(pal.fieldHi, 1))
  ctx.fillStyle = grad
  roundRect(ctx, kx, ky - capPx * 0.42, kw, capPx * 0.62, 3)
  ctx.fill()
  ctx.strokeStyle = rgba(pal.inkRgb, 0.25)
  ctx.lineWidth = 1
  ctx.stroke()
  word(ctx, pal, 'less', kx - 8, ky + capPx * 0.16, capPx, { align: 'right' })
  word(ctx, pal, 'more than at rest', kx + kw + 8, ky + capPx * 0.16, capPx)
}

const A0 = (150 * Math.PI) / 180
const SWEEP = (240 * Math.PI) / 180

/** The Garn gauge: the model's own reading as a lit arc from 0 to its value, with a knob at its end. The number is
 *  always an engine value: the smoothed reading while the session plays, one window's reading while the model's window
 *  slides over the scene in view, then the scene's mean. */
function drawDial(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, d: StageData | null, fr: Frame) {
  const b = panelRect(L.dial, fr.open)
  const u = L.u
  const small = b.h < 170
  const tp = clamp(b.h * 0.05, 9, 18)
  const titlePx = small ? 10.5 : 11 * u
  const topRow = L.notes ? tp + titlePx + 8 : tp
  // the arc spans 240 degrees: it is r tall above the centre and r / 2 below it; under it, one line says what the number is
  const capRow = L.notes && !small ? clamp(b.h * 0.07, 14, 30) : 0
  const th0 = clamp(b.h * 0.05, 6, 16)
  const r = Math.max(20, Math.min(b.w * 0.41, (b.h - topRow - tp - capRow - th0 * 2.4) / 1.6))
  const th = clamp(r * 0.11, 5, 16)
  const cx = b.x + b.w / 2
  const cy = b.y + topRow + th * 1.2 + r + (b.h - topRow - tp - capRow - th * 2.4 - r * 1.5) / 2
  panel(ctx, pal, b, { x: cx, y: cy, r })
  const ang = (g: number) => A0 + clamp(g, 0, 1) * SWEEP
  const arc = (g0: number, g1: number, rr: number) => {
    ctx.beginPath()
    ctx.arc(cx, cy, rr, ang(g0), ang(g1))
    ctx.stroke()
  }
  // the groove, and a thin outer ring for the whole 0-1 Garn scale
  ctx.lineCap = 'round'
  ctx.strokeStyle = pal.ink
  ctx.globalAlpha = 0.08
  ctx.lineWidth = th
  arc(0, 1, r)
  ctx.lineCap = 'butt'
  ctx.strokeStyle = pal.ink2
  ctx.globalAlpha = 0.35
  ctx.lineWidth = Math.max(1, th * 0.12)
  arc(0, 1, r + th * 0.95)
  // ticks every 0.1 Garn inside the groove; longer at 0, 0.5 and 1
  ctx.globalAlpha = 0.7
  ctx.lineWidth = Math.max(1, 1.2 * Math.sqrt(u))
  ctx.beginPath()
  for (let s = 0; s <= 10; s++) {
    const a = ang(s / 10)
    const long = s % 5 === 0
    ctx.moveTo(cx + Math.cos(a) * (r - th * 0.95), cy + Math.sin(a) * (r - th * 0.95))
    ctx.lineTo(cx + Math.cos(a) * (r - th * (long ? 1.85 : 1.4)), cy + Math.sin(a) * (r - th * (long ? 1.85 : 1.4)))
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  // the model's reading: a lit arc from 0 to its value, and a knob at its end
  const est = fr.estimate && fr.estimate.alpha > 0.01 ? fr.estimate : null
  if (est) {
    const g = clamp(est.garn, 0, 1)
    ctx.globalAlpha = est.alpha
    ctx.lineCap = 'round'
    ctx.strokeStyle = pal.accent
    ctx.globalAlpha = 0.2 * est.alpha
    ctx.lineWidth = th * 2.2
    arc(0, g, r)
    ctx.globalAlpha = est.alpha
    ctx.lineWidth = th
    arc(0, g, r)
    const a = ang(g)
    const kx = cx + Math.cos(a) * r
    const ky = cy + Math.sin(a) * r
    const halo = ctx.createRadialGradient(kx, ky, 0, kx, ky, th * 2.2)
    halo.addColorStop(0, rgba(pal.accentRgb, 0.55 * est.alpha))
    halo.addColorStop(1, rgba(pal.accentRgb, 0))
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(kx, ky, th * 2.2, 0, TAU)
    ctx.fill()
    ctx.fillStyle = pal.ink
    ctx.beginPath()
    ctx.arc(kx, ky, th * 0.72, 0, TAU)
    ctx.fill()
    // a fine needle from the hub towards the knob
    ctx.strokeStyle = pal.accent
    ctx.globalAlpha = 0.45 * est.alpha
    ctx.lineWidth = Math.max(1, th * 0.14)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72)
    ctx.lineTo(cx + Math.cos(a) * (r - th * 2), cy + Math.sin(a) * (r - th * 2))
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.lineCap = 'butt'
  }

  // the number: the model's reading in Garns
  const numPx = clamp(r * 0.56, 20, 104)
  word(ctx, pal, est ? est.value.toFixed(2) : '–', cx, cy + numPx * 0.2, numPx, { align: 'center', weight: est ? 600 : 300, color: pal.ink, alpha: est ? 1 : 0.45, track: -0.02 })
  if (!L.notes) return
  const subPx = clamp(r * 0.15, 9.5, 20)
  word(ctx, pal, 'Garn', cx, cy + numPx * 0.2 + subPx * 1.35, subPx, { align: 'center', weight: 500 })
  word(ctx, pal, est ? 'the model reads' : 'no reading yet', cx, cy - numPx * 0.86, clamp(r * 0.125, 9, 17), { align: 'center' })
  // what the number is, under the arc
  if (est && capRow > 0 && d) {
    const f = d.focus
    const what = est.kind === 'scene' ? `scene ${f.index}: mean of its ${f.w1 - f.w0} readings` : est.kind === 'window' ? `scene ${f.index}: one 4 s window` : 'smoothed, as the session plays'
    word(ctx, pal, what, cx, b.y + b.h - tp, clamp(r * 0.12, 10, 16), { align: 'center', color: pal.ink, alpha: 0.8 })
  }
  const px = b.x + clamp(b.w * 0.06, 8, 20)
  word(ctx, pal, small ? 'GARN METER' : 'GARN METER · THE MODEL', px, b.y + tp + titlePx, titlePx, { weight: 600, track: 0.08, color: pal.ink, alpha: 0.9 })
  // ends of the scale
  if (!small) {
    const ex = Math.cos(A0) * (r - th * 2.7)
    const ey = cy + Math.sin(A0) * (r - th * 2.7) + subPx * 0.3
    word(ctx, pal, '0', cx + ex, ey, subPx * 0.86, { align: 'center', mono: true })
    word(ctx, pal, '1', cx - ex, ey, subPx * 0.86, { align: 'center', mono: true })
  }
}

/** The traces' place at this frame: the idle rect, the session rect, or between them while the stage opens. */
export function tracesRect(L: Layout, fr: Frame): Rect {
  const a = L.tracesIdle
  const b = L.traces
  return { x: b.x, w: b.w, y: a.y + (b.y - a.y) * fr.open, h: a.h + (b.h - a.h) * fr.open }
}

/** Draws the whole stage for one frame. `d` is null before the model ran (idle). */
export function drawScene(ctx: CanvasRenderingContext2D, L: Layout, pal: Palette, sig: Signal, d: StageData | null, fr: Frame, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.fillStyle = pal.stage
  ctx.fillRect(0, 0, L.w, L.h)
  // the session strip is on stage only once Play starts to fill it: it fades in as the traces give it room
  const stripOn = clamp((fr.open - 0.5) / 0.5, 0, 1)
  if (stripOn > 0.01) {
    drawStrip(ctx, L, pal, sig, d, fr)
    if (stripOn < 1) {
      ctx.globalAlpha = 1 - stripOn
      ctx.fillStyle = pal.stage
      ctx.fillRect(0, L.strip.y - 6, L.col.x + L.col.w + 2, L.strip.h + 12)
      ctx.globalAlpha = 1
    }
  }
  drawTraces(ctx, tracesRect(L, fr), L, pal, sig, fr, dpr)
  drawScalpPanel(ctx, L, pal, sig, d, fr)
  drawDial(ctx, L, pal, d, fr)
}

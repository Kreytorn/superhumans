// BubbleGrade signature moment: the real Doppler heart sound on a stage, as the picture the model itself read,
// with the model's attention rising on it and the Spencer grade settling beside it. Stage only: no page chrome.
// One clock drives sound and picture (see timeline.ts). Restyle through the --m-* custom properties (README.md).
import '@fontsource-variable/newsreader'
import '@fontsource-variable/geist-mono'
import './moment.css'
import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import * as bubble from '../../engine/bubblegrade'
import type { BubbleActDecision, BubbleResult, GradeLabel } from '../../engine/bubblegrade'
import { buildModel, frameAt, RISE_S, runningE, type Frame, type Model } from './timeline'

export type MomentState = 'idle' | 'running' | 'result' | 'error'

/** What the model has said so far while the clip plays (changes at most once per second of clip). */
export interface BubbleLive {
  clipS: number
  /** 5-s slices fully heard so far. */
  slices: number
  grade: GradeLabel | null
  /** Running expected grade 0..4 and running P(grade >= III). */
  E: number | null
  A: number | null
  alert: boolean
}

export interface BubbleGradeMomentHandle {
  /** Starts the moment from the beginning. Pass sound: true only from a tap handler. */
  run(opts?: { sound?: boolean }): void
  reset(): void
  /** Moves the playhead to a clip time in seconds (the one interaction, also available by drag and arrow keys). */
  seek(clipS: number): void
  setSound(on: boolean): void
  /** Re-reads the --m-* colours after a theme change. */
  restyle(): void
}

export interface BubbleGradeMomentProps {
  /** One of the six shipped clips. Default: the grade III clip. */
  sampleId?: string
  /** auto: the real model on a laptop, stored outputs on a phone or after a failure. */
  mode?: 'auto' | 'live' | 'replay'
  /** Pins the stage (no playback) while set. */
  state?: 'idle' | 'result'
  /** Pins the timeline at this clock time in ms while set. */
  t?: number
  onResult?: (result: BubbleResult, act: BubbleActDecision) => void
  onState?: (state: MomentState) => void
  onLive?: (live: BubbleLive) => void
  /** 0..1 while the model downloads (live mode, first run only), null when done. */
  onLoading?: (fraction: number | null) => void
  /** Clock speed while silent (with sound it is always 1). Default 3. */
  rate?: number
  /** Specimen and model marks only: no scale, no labels, no buttons (posters). */
  bare?: boolean
  className?: string
  style?: CSSProperties
  ref?: Ref<BubbleGradeMomentHandle>
}

// ---------- drawing constants (display choices, not data) ----------

/** Spectrogram value (dB - window mean) / 20 -> brightness 0..1: silent below SPEC_LO, then a soft shoulder so a
 *  quiet bubble hiss and a loud heartbeat thump both keep their detail. */
const SPEC_LO = -0.5
const SPEC_K = 1.6
const SPEC_GAMMA = 1.9
const tone = (v: number) => Math.pow(1 - Math.exp(-SPEC_K * Math.max(0, v - SPEC_LO)), SPEC_GAMMA)
const UP = 4 // vertical upsampling of the 64 mel bands
const DIM = 0.64 // brightness of sound not heard yet
/** Strength of the attention tint where the bubble-map value is 1. One flat colour per column: it says when, never which pitch. */
const HEAT_A = 0.62
/** The playback marks (slice bracket, its label, the time chip) start under the caption row. */
const MARKS_Y = 34

type RGB = [number, number, number]
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const mix = (a: RGB, b: RGB, u: number): RGB => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

function readColor(el: HTMLElement, name: string, fallback: RGB): RGB {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  if (!v) return fallback
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const x = c.getContext('2d', { willReadFrequently: true })
  if (!x) return fallback
  x.fillStyle = '#010203'
  x.fillStyle = v
  x.fillRect(0, 0, 1, 1)
  const d = x.getImageData(0, 0, 1, 1).data
  return d[0] === 1 && d[1] === 2 && d[2] === 3 && !/#010203/i.test(v) ? fallback : [d[0], d[1], d[2]]
}

interface Layout {
  W: number
  H: number
  /** Right gutter: the bubble-grade scale as its own short gauge, with the sound button under it. */
  gutter: number
  tapeW: number
  /** The sound picture ends at the time rail (railY = tapeH). */
  tapeH: number
  railY: number
  /** Height of the attention ridge for a bubble-map value of 1. It rises over the foot of the picture. */
  ridgeH: number
  padTop: number
  padBot: number
  /** Where the sound picture sits in the stage (it used to start at 0, 0). */
  tapeX: number
  tapeY: number
  /** Height of the seconds row under the rail, and of the estimate strip under that (0 = no strip). */
  secH: number
  stripH: number
  /** The chest figure and the grade strengths: a column on the left (sideW) or, on a narrow stage, a band on top (sideH). */
  sideW: number
  sideH: number
  narrow: boolean
}

function layoutFor(W: number, H: number, bare: boolean): Layout {
  const gutter = bare ? 0 : Math.round(clamp(W * 0.075, 86, 112))
  // Under the rail: the second labels.
  const secH = bare ? 0 : 32
  const narrow = W < 700
  let stripH = 0
  let sideW = 0
  let sideH = 0
  if (!bare) {
    stripH = Math.round(clamp(H * 0.21, 96, 176))
    if (narrow) sideH = Math.round(clamp(H * 0.21, 112, 150))
    else sideW = Math.round(clamp(W * 0.215, 204, 310))
    // The sound picture keeps its room: a short stage gives up the figure band first, then the strip.
    if (H - secH - stripH - sideH < 210) sideH = 0
    if (H - secH - stripH - sideH < 190) stripH = 76
    if (H - secH - stripH - sideH < 160) stripH = 0
  }
  const tapeH = H - secH - stripH - sideH
  const ridgeH = Math.round(clamp((tapeH + secH) * 0.17, 44, 136))
  // With a strip, the sound button sits beside it, so the scale only has to stop above the ridge band.
  const padBot = stripH >= 64 ? ridgeH + 18 : Math.max(96, ridgeH + 30)
  return {
    W,
    H,
    gutter,
    tapeW: W - gutter - sideW,
    tapeH,
    railY: tapeH,
    ridgeH,
    // The scale sits between its own heading and the top of the ridge band, so it is not read as the picture's axis.
    padTop: Math.round(clamp(tapeH * 0.11, tapeH < 300 ? 52 : 66, 84)),
    padBot,
    tapeX: sideW,
    tapeY: sideH,
    secH,
    stripH,
    sideW,
    sideH,
    narrow,
  }
}
/** Top and bottom of the plot inside the estimate strip, in px from the strip's top. */
const STRIP_TOP = 34
const STRIP_BOT = 24
const stripYFor = (L: Layout, z: { lo: number; hi: number }, E: number) =>
  L.stripH - STRIP_BOT - ((clamp(E, z.lo, z.hi) - z.lo) / (z.hi - z.lo)) * (L.stripH - STRIP_BOT - STRIP_TOP)

/** The heartbeat rhythm of this recording: loudness of the lowest mel bands per 10-ms column, smoothed, scaled 0..1
 *  between the clip's 15th and 98th percentile. It only drives the pulse of the drawn heart. */
function beatEnvelope(sp: NonNullable<BubbleResult['spectrogram']>): Float32Array {
  const { rows, cols, data } = sp
  const n = Math.min(rows, 16)
  const raw = new Float32Array(cols)
  for (let c = 0; c < cols; c++) {
    let a = 0
    for (let r = 0; r < n; r++) a += data[r * cols + c]
    raw[c] = a / n
  }
  const e = new Float32Array(cols)
  for (let c = 0; c < cols; c++) {
    let a = 0
    let k = 0
    for (let j = Math.max(0, c - 3); j <= Math.min(cols - 1, c + 3); j++, k++) a += raw[j]
    e[c] = a / k
  }
  const sorted = Float32Array.from(e).sort()
  const lo = sorted[Math.floor(cols * 0.15)] ?? 0
  const hi = sorted[Math.floor(cols * 0.98)] ?? 1
  for (let c = 0; c < cols; c++) e[c] = clamp((e[c] - lo) / Math.max(1e-6, hi - lo), 0, 1)
  return e
}
const yForGrade = (L: Layout, E: number) => L.padTop + (1 - E / 4) * (L.tapeH - L.padTop - L.padBot)

/** Renders the spectrogram at its own resolution in ink, and the model's attention as one flat tint per column
 *  (a 1-pixel-high strip: colour = the mark colour, alpha = bubble-map value). The tint carries no pitch information. */
function renderSources(r: BubbleResult, col: { stage: RGB; ink: RGB; mark: RGB; hot: RGB }) {
  const sp = r.spectrogram
  if (!sp) return null
  const { rows, cols, data } = sp
  const h = rows * UP
  const cold = new ImageData(cols, h)
  const heat = new ImageData(cols, 1)
  // Colour ramp: energy 0..1 -> stage..ink.
  const lutC = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) lutC.set(mix(col.stage, col.ink, i / 255), i * 3)
  // Model attention per spectrogram column (bubble-map value at the column's centre time), linear in [0, 1].
  const bm = r.bubbleMap
  for (let c = 0; c < cols; c++) {
    const k = ((c + 0.5) * sp.frameHopS) / bm.stepS
    const k0 = Math.min(bm.values.length - 1, Math.floor(k))
    const k1 = Math.min(bm.values.length - 1, k0 + 1)
    const v = bm.values[k0] + (bm.values[k1] - bm.values[k0]) * (k - k0)
    heat.data[c * 4] = col.mark[0]
    heat.data[c * 4 + 1] = col.mark[1]
    heat.data[c * 4 + 2] = col.mark[2]
    heat.data[c * 4 + 3] = Math.round(clamp(v, 0, 1) * 255)
  }
  const w4 = new Float32Array(4)
  for (let j = 0; j < h; j++) {
    // Output row j is top-down; source row 0 is the lowest band. Catmull-Rom between bands.
    const p = (h - 1 - j + 0.5) / UP - 0.5
    const i0 = Math.floor(p)
    const f = p - i0
    w4[0] = (-f * f * f + 2 * f * f - f) / 2
    w4[1] = (3 * f * f * f - 5 * f * f + 2) / 2
    w4[2] = (-3 * f * f * f + 4 * f * f + f) / 2
    w4[3] = (f * f * f - f * f) / 2
    const r0 = clamp(i0 - 1, 0, rows - 1) * cols
    const r1 = clamp(i0, 0, rows - 1) * cols
    const r2 = clamp(i0 + 1, 0, rows - 1) * cols
    const r3 = clamp(i0 + 2, 0, rows - 1) * cols
    for (let c = 0; c < cols; c++) {
      const v = data[r0 + c] * w4[0] + data[r1 + c] * w4[1] + data[r2 + c] * w4[2] + data[r3 + c] * w4[3]
      const q = (tone(v) * 255) | 0
      const o = (j * cols + c) * 4
      cold.data[o] = lutC[q * 3]
      cold.data[o + 1] = lutC[q * 3 + 1]
      cold.data[o + 2] = lutC[q * 3 + 2]
      cold.data[o + 3] = 255
    }
  }
  const toCanvas = (img: ImageData) => {
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    c.getContext('2d')?.putImageData(img, 0, 0)
    return c
  }
  return { cold: toCanvas(cold), heat: toCanvas(heat) }
}

/** The drawn chest (front view, cut at the neck and the waist). An illustration: it carries no measurement. */
const TORSO =
  'M84 0V20C84 32 72 37 56 42C36 48 22 58 20 78C19 92 24 104 30 114C34 124 35 140 36 158C37 182 42 206 44 250H156C158 206 163 182 164 158C165 140 166 124 170 114C176 104 181 92 180 78C178 58 164 48 144 42C128 37 116 32 116 20V0Z'
const trim = (x: number) => String(+x.toFixed(2))

const isPhone = () => typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700)
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function BubbleGradeMoment(props: BubbleGradeMomentProps) {
  const { sampleId = 'grade-3', mode = 'auto', state: pinState, t: pinT, bare = false, className, style, ref } = props
  const latest = useRef(props)
  latest.current = props

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrubRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const sliceRef = useRef<HTMLSpanElement>(null)
  const needleRef = useRef<HTMLDivElement>(null)
  const verdictRef = useRef<HTMLSpanElement>(null)
  const capRef = useRef<HTMLSpanElement>(null)
  const ghostRef = useRef<HTMLElement>(null)
  const figRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLSpanElement>(null)
  const hintRef = useRef<HTMLSpanElement>(null)

  const [state, setStateRaw] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [sound, setSoundRaw] = useState(false)
  const [loadPct, setLoadPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lit, setLit] = useState<number | null>(null)
  const [source, setSource] = useState<'live' | 'precomputed'>('precomputed')
  const [geom, setGeom] = useState<Layout | null>(null)
  const [durS, setDurS] = useState(0)
  const [say, setSay] = useState('')
  /** The model's alert so far (null before the first slice), the technician's grade, and whether it is revealed. */
  const [alertOn, setAlertOn] = useState<boolean | null>(null)
  const [tech, setTech] = useState<number | null>(null)
  const [truth, setTruth] = useState<'above' | 'below' | null>(null)
  /** The estimate strip's grade range, and the model's P(grade >= I..IV) (the newest slice alone, then the whole clip). */
  const [zoom, setZoom] = useState<Model['zoom'] | null>(null)
  const [odds, setOdds] = useState<{ p: number[]; of: 'slice' | 'clip'; n: number } | null>(null)

  const api = useMemo(() => {
    const S = {
      id: '',
      state: 'idle' as MomentState,
      pre: null as BubbleResult | null,
      live: null as BubbleResult | null,
      result: null as BubbleResult | null,
      model: null as Model | null,
      clock: -1,
      playing: false,
      scrubbing: false,
      raf: 0,
      last: 0,
      token: 0,
      audio: null as HTMLAudioElement | null,
      audioUrl: '',
      audioPending: false,
      pendingAt: 0,
      soundOn: false,
      /** The person switched the sound off with the speaker button: later runs stay silent until they switch it on. */
      muted: false,
      /** This run's sound really started, so it keeps real time even if the sound is switched off part-way. */
      realTime: false,
      /** The technician's grade as a number (-1 until the clip is loaded). */
      tech: -1,
      /** A frame pinned by ?t= (a still, not a pause). */
      framePinned: false,
      paused: false,
      truth: '',
      src: null as { cold: HTMLCanvasElement; heat: HTMLCanvasElement } | null,
      dev: null as { cold: HTMLCanvasElement; heat: HTMLCanvasElement } | null,
      col: { stage: [10, 34, 46] as RGB, ink: [226, 241, 242] as RGB, mark: [255, 143, 58] as RGB, hot: [255, 232, 190] as RGB, accent: [226, 241, 242] as RGB },
      L: null as Layout | null,
      dpr: 1,
      bare: false,
      liveKey: '',
      oddsKey: '',
      /** Heartbeat loudness per spectrogram column (0..1), for the drawn heart's pulse. */
      env: null as Float32Array | null,
      envHop: 0.01,
      beat: '',
      ariaS: -1,
      pinKey: '',
    }

    const root = () => rootRef.current ?? document.createElement('div')

    const setState = (next: MomentState) => {
      if (S.state === next) return
      S.state = next
      setStateRaw(next)
      latest.current.onState?.(next)
    }

    // ----- drawing -----
    const readTokens = () => {
      const el = rootRef.current
      if (!el) return
      S.col = {
        stage: readColor(el, '--_stage', S.col.stage),
        ink: readColor(el, '--_ink', S.col.ink),
        mark: readColor(el, '--_mark', S.col.mark),
        hot: readColor(el, '--_mark-hot', S.col.hot),
        accent: readColor(el, '--_accent', S.col.accent),
      }
    }
    const restyle = () => {
      readTokens()
      const r = S.result ?? S.pre
      S.src = r ? renderSources(r, S.col) : null
      S.dev = null
      layout()
    }

    const layout = () => {
      const el = rootRef.current
      const cv = canvasRef.current
      if (!el || !cv) return
      const W = el.clientWidth
      const H = el.clientHeight
      if (W < 20 || H < 20) return
      const touch = window.matchMedia('(pointer: coarse)').matches
      S.dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2)
      const L = layoutFor(W, H, S.bare)
      S.L = L
      cv.width = Math.round(W * S.dpr)
      cv.height = Math.round(H * S.dpr)
      if (S.src) {
        const tw = Math.max(1, Math.round(L.tapeW * S.dpr))
        const th = Math.max(1, Math.round(L.tapeH * S.dpr))
        const scale = (srcC: HTMLCanvasElement) => {
          const c = document.createElement('canvas')
          c.width = tw
          c.height = th
          const x = c.getContext('2d')
          if (x) {
            x.imageSmoothingEnabled = true
            x.imageSmoothingQuality = 'high'
            x.drawImage(srcC, 0, 0, tw, th)
          }
          return c
        }
        S.dev = { cold: scale(S.src.cold), heat: scale(S.src.heat) }
      }
      setGeom(L)
      paint()
    }

    const frame = (): Frame | null => (S.model ? frameAt(S.model, S.clock) : null)

    const paint = () => {
      const cv = canvasRef.current
      const L = S.L
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx || !L) return
      const d = S.dpr
      const { stage, ink, hot } = S.col
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = css(stage)
      ctx.fillRect(0, 0, cv.width, cv.height)
      const m = S.model
      const f = frame()
      if (!m || !f || !S.dev) return
      const tw = S.dev.cold.width
      const th = S.dev.cold.height
      const xOf = (s: number) => (clamp(s, 0, m.durS) / m.durS) * tw
      // Everything below is drawn in the sound picture's own frame.
      ctx.setTransform(1, 0, 0, 1, Math.round(L.tapeX * d), Math.round(L.tapeY * d))
      paintStrip(ctx, L, m, f, tw, xOf)

      // 1. The sound as the model read it: dim until heard, full once the playhead has passed.
      const xh = xOf(f.heardS)
      ctx.globalAlpha = DIM
      ctx.drawImage(S.dev.cold, 0, 0)
      ctx.globalAlpha = 1
      if (xh >= 1) ctx.drawImage(S.dev.cold, 0, 0, xh, th, 0, 0, xh, th)

      // 2. Model attention: a flat tint per column, strength = bubble-map value, rising 0.6 s behind the playhead.
      const headS = f.heardS + f.settled * RISE_S
      const xHead = xOf(headS)
      const xFull = xOf(headS - RISE_S)
      ctx.globalAlpha = HEAT_A
      if (xFull >= 1) ctx.drawImage(S.dev.heat, 0, 0, xFull, th, 0, 0, xFull, th)
      const strips = 14
      for (let i = 0; i < strips; i++) {
        const xa = Math.floor(xFull + ((xHead - xFull) * i) / strips)
        const xb = Math.floor(xFull + ((xHead - xFull) * (i + 1)) / strips)
        if (xb <= xa || xa < 0) continue
        const u = 1 - (i + 0.5) / strips
        ctx.globalAlpha = HEAT_A * u * u * (3 - 2 * u)
        ctx.drawImage(S.dev.heat, xa, 0, xb - xa, th, xa, 0, xb - xa, th)
      }
      ctx.globalAlpha = 1

      // 3. The attention ridge in the strip under the sound: height = bubble-map value (0..1).
      const base = L.railY * d
      const ridgeH = L.ridgeH * d
      const bm = (S.result ?? S.pre)?.bubbleMap
      if (bm && headS > 0) {
        const pts: [number, number][] = []
        for (let k = 0; k < bm.values.length; k++) {
          const ts = k * bm.stepS
          if (ts > headS) break
          const rise = clamp((headS - ts) / RISE_S, 0, 1)
          pts.push([xOf(ts), base - bm.values[k] * rise * rise * (3 - 2 * rise) * ridgeH])
        }
        if (pts.length > 1) {
          ctx.beginPath()
          ctx.moveTo(pts[0][0], base)
          for (const p of pts) ctx.lineTo(p[0], p[1])
          ctx.lineTo(pts[pts.length - 1][0], base)
          ctx.closePath()
          ctx.fillStyle = css(stage, 0.66)
          ctx.fill()
          ctx.beginPath()
          pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
          ctx.strokeStyle = css(hot)
          ctx.lineWidth = 1.75 * d
          ctx.lineJoin = 'round'
          ctx.stroke()
        }
      }
      if (S.bare) return

      // 4. Time rail: one tick per second (the model's hop), a longer one every 5 s (one slice).
      ctx.fillStyle = css(ink, 0.34)
      ctx.fillRect(0, base, tw, Math.max(1, d))
      for (let s = 0; s <= m.durS; s++) {
        const long = s % 5 === 0
        ctx.fillRect(Math.min(tw - d, Math.round(xOf(s))), base, Math.max(1, d), (long ? 8 : 4) * d)
      }

      // 5. The 5-s slice the model is hearing, and the playhead with its grip.
      const xp = xOf(f.clipS)
      if (f.slice.opacity > 0.01) {
        const xa = xOf(f.slice.t0)
        const y = (14 + MARKS_Y) * d
        ctx.globalAlpha = f.slice.opacity
        ctx.fillStyle = css(ink)
        ctx.fillRect(xa, y, Math.max(0, xp - xa), Math.max(1, 1.25 * d))
        ctx.fillRect(xa, y, Math.max(1, 1.25 * d), 8 * d)
        ctx.globalAlpha = 1
      }
      if (f.playhead > 0.01) {
        ctx.globalAlpha = f.playhead
        ctx.fillStyle = css(ink)
        ctx.fillRect(Math.round(xp - 0.75 * d), 0, Math.max(1, 1.5 * d), base)
        ctx.globalAlpha = 1
      }
      const gx = f.beat === 'idle' ? 0 : xp
      ctx.fillStyle = css(ink, 0.55 + 0.45 * f.playhead)
      ctx.beginPath()
      ctx.arc(clamp(gx, 5 * d, tw - 5 * d), base, 5 * d, 0, Math.PI * 2)
      ctx.fill()
    }

    /** The estimate strip: each slice's own reading as a dot, the running estimate as a line that is the needle's trail.
     *  Its grade axis is zoomed to m.zoom so that small moves can be seen; the gauge keeps the full 0 to IV scale. */
    const paintStrip = (ctx: CanvasRenderingContext2D, L: Layout, m: Model, f: Frame, tw: number, xOf: (s: number) => number) => {
      if (L.stripH <= 0) return
      const d = S.dpr
      const { stage, ink, mark, hot } = S.col
      const sy = (L.railY + L.secH) * d
      const yE = (E: number) => sy + stripYFor(L, m.zoom, E) * d
      ctx.fillStyle = css(mix(stage, ink, 0.05))
      ctx.fillRect(0, sy, tw, L.stripH * d)
      ctx.fillStyle = css(ink, 0.2)
      ctx.fillRect(0, sy, tw, Math.max(1, d))
      // Whole grades inside the zoomed range: dashed lines (their numerals are DOM labels).
      ctx.strokeStyle = css(ink, 0.26)
      ctx.lineWidth = Math.max(1, d)
      ctx.setLineDash([2 * d, 5 * d])
      for (let g = Math.ceil(m.zoom.lo); g <= Math.floor(m.zoom.hi); g++) {
        ctx.beginPath()
        ctx.moveTo(30 * d, Math.round(yE(g)) + 0.5)
        ctx.lineTo(tw, Math.round(yE(g)) + 0.5)
        ctx.stroke()
      }
      ctx.setLineDash([])
      const t = Math.min(S.clock, m.totalMs)
      const first = m.verdicts[0]
      if (!first || t < first.at * 1000) return
      // Each slice's own reading, once that slice has been heard.
      for (const v of m.verdicts) {
        const age = t - v.at * 1000
        if (age < 0) break
        const x = clamp(xOf(v.at), 4 * d, tw - 4 * d)
        const y = yE(v.own.E)
        const pop = clamp(age / 260, 0, 1)
        ctx.fillStyle = css(ink, 0.62)
        ctx.beginPath()
        ctx.arc(x, y, (1.4 + 2.1 * pop) * d, 0, Math.PI * 2)
        ctx.fill()
        if (age < 900) {
          ctx.strokeStyle = css(ink, 0.7 * (1 - age / 900))
          ctx.lineWidth = 1.25 * d
          ctx.beginPath()
          ctx.arc(x, y, (4 + 12 * (age / 900)) * d, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      // The running estimate: exactly the needle's value at every past moment.
      const durMs = m.durS * 1000
      const pts: [number, number][] = []
      for (let tt = first.at * 1000; ; tt += 40) {
        const at = Math.min(tt, t)
        const E = runningE(m, at)
        if (E !== null) pts.push([clamp(xOf(Math.min(at, durMs) / 1000), 0, tw), yE(E)])
        if (tt >= t) break
      }
      const line = (w: number, style: string) => {
        ctx.beginPath()
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
        ctx.strokeStyle = style
        ctx.lineWidth = w * d
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      line(7, css(mark, 0.26))
      line(2.25, css(hot))
      const head = pts[pts.length - 1]
      // The grade locks in: a level line across the strip at the final value.
      if (f.settled > 0) {
        ctx.globalAlpha = f.settled
        ctx.strokeStyle = css(hot, 0.75)
        ctx.lineWidth = Math.max(1, d)
        ctx.beginPath()
        ctx.moveTo(tw * (1 - f.settled), Math.round(head[1]) + 0.5)
        ctx.lineTo(tw, Math.round(head[1]) + 0.5)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      // The head: flashes wide when a new reading lands, and gains a ring when the grade locks.
      const hx = clamp(head[0], 6 * d, tw - 6 * d)
      if (f.kick > 0) {
        ctx.fillStyle = css(mark, 0.5 * f.kick)
        ctx.beginPath()
        ctx.arc(hx, head[1], (6 + 16 * (1 - f.kick)) * d, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = css(hot)
      ctx.beginPath()
      ctx.arc(hx, head[1], 4.5 * d, 0, Math.PI * 2)
      ctx.fill()
      if (f.settled > 0) {
        ctx.strokeStyle = css(hot, f.settled)
        ctx.lineWidth = 1.5 * d
        ctx.beginPath()
        ctx.arc(hx, head[1], (16 - 7 * f.settled) * d, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    /** Moves the DOM annotations and publishes what changed. Runs after every paint. */
    const sync = () => {
      const m = S.model
      const L = S.L
      const f = frame()
      const root = rootRef.current
      if (!m || !L || !f || !root) return
      const xp = (f.clipS / m.durS) * L.tapeW
      // Stopped mid-clip by Space or the arrow keys (not a drag in progress, not a pinned still).
      const paused = S.state === 'running' && !S.playing && !S.scrubbing && !S.framePinned && S.clock >= 0
      if (paused !== S.paused) {
        S.paused = paused
        S.ariaS = -1
      }
      root.dataset.paused = paused ? '1' : '0'
      if (f.beat !== S.beat) {
        S.beat = f.beat
        root.dataset.beat = f.beat
      }
      const t = timeRef.current
      if (t) {
        const flip = xp > L.tapeW - (paused ? 132 : 64)
        t.style.opacity = String(f.playhead)
        t.style.transform = `translate3d(${flip ? xp - 10 : xp + 10}px, ${(flip ? 30 : 8) + MARKS_Y}px, 0) translateX(${flip ? '-100%' : '0'})`
        const txt = (paused ? 'paused at ' : '') + f.clipS.toFixed(1) + ' s'
        if (t.textContent !== txt) t.textContent = txt
      }
      const sl = sliceRef.current
      if (sl) {
        const xa = (f.slice.t0 / m.durS) * L.tapeW
        const wide = xp - xa > 132
        sl.style.opacity = String(wide ? f.slice.opacity : 0)
        sl.style.transform = `translate3d(${xa + 8}px, ${20 + MARKS_Y}px, 0)`
      }
      const nd = needleRef.current
      if (nd) {
        nd.style.opacity = String(f.needle ? f.needle.opacity : 0)
        nd.style.transform = `translate3d(0, ${yForGrade(L, f.needle ? f.needle.E : 0)}px, 0)`
        nd.dataset.alert = f.needle?.alert ? '1' : '0'
      }
      // The needle's own words ride beside it on the picture's edge.
      const vd = verdictRef.current
      if (vd) {
        vd.style.opacity = String(f.needle ? f.needle.opacity : 0)
        vd.style.transform = `translate3d(${L.tapeW - 4}px, ${yForGrade(L, f.needle ? f.needle.E : 0)}px, 0) translate(-100%, -50%)`
      }
      // The technician's grade is shown only once the model has given its own.
      // Its word goes on the side of the numeral away from the needle, so the two never touch.
      const gap = S.tech - m.verdicts[m.verdicts.length - 1].E
      const side = f.settled > 0 ? (gap > 0 && gap < 0.5 ? 'above' : 'below') : ''
      if (side !== S.truth) {
        S.truth = side
        setTruth(side || null)
      }
      if (nd && f.needle) nd.dataset.kick = String(f.needle.n % 2)
      // The estimate strip's words: the running value rides with the trace's head; a hint waits for the first slice.
      const chip = chipRef.current
      if (chip && L.stripH > 0) {
        const y = stripYFor(L, m.zoom, f.needle ? f.needle.E : m.zoom.lo)
        const flip = xp > L.tapeW - 96
        chip.style.opacity = String(f.needle ? f.needle.opacity : 0)
        // Once the grade locks, the chip lifts off the line so the end of the trace stays visible.
        const lift = f.settled > 0 ? 'calc(-100% - 9px)' : '-50%'
        chip.style.transform = `translate3d(${flip ? xp - 4 : xp + 14}px, ${y}px, 0) translate(${flip ? '-100%' : '0'}, ${lift})`
        const txt = f.needle ? (f.settled > 0.5 ? 'final ' : '') + f.needle.E.toFixed(2) : ''
        if (chip.textContent !== txt) chip.textContent = txt
        chip.dataset.kick = f.needle ? String(f.needle.n % 2) : ''
      }
      const hint = hintRef.current
      if (hint) hint.style.opacity = f.needle ? '0' : '1'
      // The drawn chest: the heart beats with this recording's own loudness and warms with the model's attention.
      const fg = figRef.current
      if (fg) {
        const on = f.beat === 'listen' && !reducedMotion()
        const bmap = (S.result ?? S.pre)?.bubbleMap
        const env = S.env
        const beat = on && env ? env[clamp(Math.floor(f.clipS / S.envHop), 0, env.length - 1)] : 0
        const att = on && bmap ? bmap.values[clamp(Math.round(f.clipS / bmap.stepS), 0, bmap.values.length - 1)] : 0
        // Both fade in with the playhead, so nothing glows while the sound is still starting.
        fg.style.setProperty('--beat', (beat * f.playhead).toFixed(3))
        fg.style.setProperty('--att', (clamp(att, 0, 1) * f.playhead).toFixed(3))
      }
      const oKey = f.needle ? `${f.needle.n}:${f.settled > 0 ? 1 : 0}` : 'none'
      if (oKey !== S.oddsKey) {
        S.oddsKey = oKey
        const v = f.needle ? m.verdicts[f.needle.n - 1] : null
        setOdds(!v ? null : f.settled > 0 ? { p: m.pGeFinal, of: 'clip', n: v.n + 1 } : { p: v.own.pGe, of: 'slice', n: v.n })
      }
      const cap = capRef.current
      if (cap) cap.style.opacity = String(clamp((f.heardS + f.settled * RISE_S - 0.9) / 0.6, 0, 1))
      const tenth = Math.round(f.clipS * 10) / 10
      if (tenth !== S.ariaS) {
        S.ariaS = tenth
        root.dataset.clipS = tenth.toFixed(1)
        const sc = scrubRef.current
        if (sc) {
          sc.setAttribute('aria-valuenow', tenth.toFixed(1))
          sc.setAttribute(
            'aria-valuetext',
            `${tenth.toFixed(1)} of ${m.durS.toFixed(1)} seconds` +
              (paused ? ', paused' : '') +
              (f.needle ? `, grade ${bubble.GRADES[f.needle.g]} so far, ${f.needle.alert ? 'alert' : 'no alert'}` : ''),
          )
        }
      }
      const key = f.needle ? `${f.needle.n}:${f.needle.alert ? 1 : 0}` : 'none'
      if (key !== S.liveKey) {
        S.liveKey = key
        root.dataset.alert = f.needle?.alert ? '1' : '0'
        root.dataset.grade = f.needle ? bubble.GRADES[f.needle.g] : ''
        setLit(f.needle ? f.needle.g : null)
        setAlertOn(f.needle ? f.needle.alert : null)
        const v = f.needle ? m.verdicts[f.needle.n - 1] : null
        latest.current.onLive?.({ clipS: f.clipS, slices: v?.n ?? 0, grade: v ? bubble.GRADES[v.g] : null, E: v?.E ?? null, A: v?.A ?? null, alert: !!v && !!f.needle?.alert })
      }
    }

    const draw = () => {
      paint()
      sync()
    }

    // ----- sound -----
    const audio = () => {
      if (!S.audio && S.audioUrl) {
        const a = new Audio()
        a.preload = 'auto'
        a.src = S.audioUrl
        S.audio = a
      }
      return S.audio
    }
    const soundOff = () => {
      S.soundOn = false
      S.audioPending = false
      S.audio?.pause()
      setSoundRaw(false)
    }
    const playAudioAt = (clipS: number) => {
      const a = audio()
      if (!a || !S.model) return soundOff()
      if (clipS >= S.model.durS - 0.05) return
      S.audioPending = true
      S.pendingAt = performance.now()
      try {
        a.currentTime = clipS
      } catch {
        /* metadata not loaded yet: the browser starts at 0 */
      }
      a.play().then(
        () => {
          S.audioPending = false
          S.realTime = true
        },
        // A play() cut short by our own pause (a drag, Space) is not a failure; anything else is: go on silently.
        (e: unknown) => ((e as { name?: string } | null)?.name === 'AbortError' ? void (S.audioPending = false) : soundOff()),
      )
    }

    // ----- clock -----
    const stopLoop = () => {
      S.playing = false
      cancelAnimationFrame(S.raf)
    }
    const finish = () => {
      stopLoop()
      if (!S.model || !S.result) return
      S.clock = S.model.totalMs
      draw()
      setState('result')
      setSay(`Grade ${S.result.clip.grade} on the Spencer scale.` + (S.result.clip.alert ? ' Alert threshold crossed.' : ''))
      latest.current.onResult?.(S.result, bubble.act(S.result))
    }
    const tick = (now: number) => {
      if (!S.playing || !S.model) return
      const dt = Math.min(100, now - S.last)
      S.last = now
      const durMs = S.model.durS * 1000
      const a = S.audio
      const listening = S.clock < durMs
      if (listening && S.soundOn && S.audioPending) {
        // Hold the picture until the sound has really started; after 3 s without it, go on silently.
        if (now - S.pendingAt > 3000) soundOff()
      } else if (listening && S.soundOn && a && !a.paused && !a.ended) S.clock = Math.max(S.clock, a.currentTime * 1000)
      else S.clock += dt * (listening && !S.soundOn && !S.realTime ? Math.max(0.25, latest.current.rate ?? 3) : 1)
      if (S.clock >= S.model.totalMs) return finish()
      draw()
      S.raf = requestAnimationFrame(tick)
    }
    const play = () => {
      if (!S.model) return
      cancelAnimationFrame(S.raf)
      S.playing = true
      S.framePinned = false
      S.last = performance.now()
      setState('running')
      if (S.soundOn) playAudioAt(Math.max(0, S.clock) / 1000)
      S.raf = requestAnimationFrame(tick)
    }

    const useResult = (r: BubbleResult, rebuild: boolean) => {
      S.result = r
      S.model = buildModel(r)
      setZoom(S.model.zoom)
      if (r.spectrogram) {
        S.env = beatEnvelope(r.spectrogram)
        S.envHop = r.spectrogram.frameHopS
      }
      setSource(r.source)
      setDurS(r.durS)
      if (rebuild) {
        S.src = renderSources(r, S.col)
        S.dev = null
        layout()
      }
    }

    const wantsLive = (forPin: boolean) => {
      const m = latest.current.mode ?? 'auto'
      return m === 'live' || (m === 'auto' && !forPin && !isPhone() && bubble.info.live)
    }

    /** Makes sure the result the timeline plays exists: the live model where wanted, the stored outputs otherwise. */
    const ensureResult = async (forPin: boolean): Promise<boolean> => {
      if (!S.pre) return false
      if (S.live || !wantsLive(forPin)) {
        const r = S.live && latest.current.mode !== 'replay' ? S.live : S.pre
        if (S.result !== r) useResult(r, false)
        return true
      }
      const token = S.token
      const id = S.id
      const loading = (f: number | null) => {
        if (token !== S.token) return
        setLoadPct(f)
        latest.current.onLoading?.(f)
      }
      try {
        loading(0)
        await bubble.load((p) => loading(p.total ? p.loaded / p.total : 0))
        const r = await bubble.analyze(id)
        if (token !== S.token) return false
        S.live = r
        useResult(r, true)
      } catch (e) {
        if (token !== S.token) return false
        console.warn('bubblegrade moment: live run failed, showing the stored outputs', e)
        root().dataset.fallback = '1'
        if (S.result !== S.pre) useResult(S.pre, false)
      } finally {
        loading(null)
      }
      return true
    }

    /** Space: stops the clock and the sound where they are; the time chip then reads "paused at". */
    const pause = () => {
      stopLoop()
      S.audio?.pause()
      draw()
    }

    const start = () => {
      S.clock = 0
      S.framePinned = false
      S.realTime = false
      S.liveKey = S.oddsKey = ''
      if (reducedMotion()) {
        if (S.soundOn) playAudioAt(0)
        return finish()
      }
      play()
    }

    const run = (opts?: { sound?: boolean }) => {
      if (!S.pre) return
      stopLoop()
      S.audio?.pause()
      if (opts?.sound !== undefined) {
        // A run asked for with sound stays silent if the person has muted it with the speaker button.
        const on = opts.sound && !S.muted
        S.soundOn = on
        setSoundRaw(on)
      }
      setError(null)
      setState('running')
      if (S.live || !wantsLive(false)) {
        // Synchronous path (phones, repeats): the sound starts inside the tap that asked for it.
        const r = S.live && latest.current.mode !== 'replay' ? S.live : S.pre
        if (S.result !== r) useResult(r, false)
        return start()
      }
      const token = S.token
      S.clock = -1
      draw()
      void ensureResult(false).then((ok) => {
        if (ok && token === S.token && S.state === 'running' && !S.playing) start()
      })
    }

    const reset = () => {
      stopLoop()
      S.audio?.pause()
      S.clock = -1
      S.liveKey = S.oddsKey = ''
      setSay('')
      draw()
      if (S.pre) setState('idle')
    }

    const seek = (clipS: number) => {
      if (!S.model) return
      S.clock = clamp(clipS, 0, S.model.durS) * 1000
      S.framePinned = false
      if (S.state !== 'running') setState('running')
      // While it plays with sound, the sound jumps with the playhead.
      if (S.playing && S.soundOn) playAudioAt(S.clock / 1000)
      draw()
    }

    const setSound = (on: boolean) => {
      S.soundOn = on
      setSoundRaw(on)
      if (!on) return soundOff()
      // Running: the sound joins at the playhead. Paused or pinned mid-clip: play on from there. Otherwise start over.
      if (S.state === 'running' && S.playing && S.model) playAudioAt(Math.max(0, S.clock) / 1000)
      else if (S.state === 'running' && S.model && !S.scrubbing) play()
      else if (S.state !== 'running') run({ sound: true })
    }

    /** Pins the stage at a clock time (Infinity = settled result, -1 = idle). No playback. */
    const pinAt = async (tMs: number) => {
      stopLoop()
      S.audio?.pause()
      S.framePinned = true
      if (tMs < 0) {
        S.clock = -1
        S.liveKey = S.oddsKey = ''
        draw()
        return setState('idle')
      }
      const token = S.token
      if (!(await ensureResult(true)) || token !== S.token || !S.model) return
      S.clock = Math.min(tMs, S.model.totalMs)
      S.liveKey = S.oddsKey = ''
      if (S.clock >= S.model.totalMs) finish()
      else {
        draw()
        setState('running')
      }
    }

    /** Loads the clip's stored picture and outputs: enough for idle, replay and pinned frames. No model download. */
    const loadSample = async (id: string) => {
      const token = ++S.token
      stopLoop()
      S.audio?.pause()
      S.audio = null
      S.id = id
      S.pre = S.live = S.result = S.model = null
      S.src = S.dev = null
      S.clock = -1
      S.liveKey = S.oddsKey = ''
      S.ariaS = -1
      setReady(false)
      setError(null)
      setLit(null)
      setAlertOn(null)
      setOdds(null)
      S.env = null
      setTech(null)
      S.tech = -1
      setSay('')
      try {
        const [samples, pre] = await Promise.all([bubble.listSamples(), bubble.replay(id)])
        if (token !== S.token) return
        const s = samples.find((x) => x.id === id)
        if (!s) throw new Error(`unknown clip "${id}"`)
        S.audioUrl = bubble.assetUrl(s.audio)
        const tg = (bubble.GRADES as readonly string[]).indexOf(s.meta.technicianGrade)
        S.tech = tg
        setTech(tg >= 0 ? tg : null)
        S.pre = pre
        readTokens()
        useResult(pre, true)
        S.state = 'idle'
        setStateRaw('idle')
        draw()
        // A pinned frame (?state=result, ?t=) is on screen before the stage reports ready or any state.
        const { state: ps, t: pt } = latest.current
        S.pinKey = `${id}|${pt}|${ps}|${latest.current.mode ?? 'auto'}`
        if (pt !== undefined) await pinAt(pt)
        else if (ps === 'result') await pinAt(Infinity)
        else latest.current.onState?.('idle')
        if (token === S.token) setReady(true)
      } catch (e) {
        if (token !== S.token) return
        console.error('bubblegrade moment:', e)
        setError('This recording could not be loaded. Check the connection and reload.')
        setState('error')
      }
    }

    const dispose = () => {
      S.token++
      stopLoop()
      S.audio?.pause()
      S.audio = null
    }

    return { S, run, reset, seek, setSound, restyle, layout, draw, play, pause, pinAt, loadSample, dispose, stopLoop, playAudioAt }
  }, [])

  const S = api.S
  S.bare = bare

  useImperativeHandle(ref, () => ({ run: api.run, reset: api.reset, seek: api.seek, setSound: api.setSound, restyle: api.restyle }), [api])

  useEffect(() => {
    void api.loadSample(sampleId)
  }, [api, sampleId])
  useEffect(() => () => api.dispose(), [api])

  // Pins from props (the harness maps ?state= and ?t= onto them).
  useEffect(() => {
    if (!ready) return
    const key = `${sampleId}|${pinT}|${pinState}|${mode}`
    if (S.pinKey === key) return
    S.pinKey = key
    if (pinT !== undefined) void api.pinAt(pinT)
    else if (pinState === 'result') void api.pinAt(Infinity)
    else if (pinState === 'idle') void api.pinAt(-1)
  }, [api, S, ready, pinT, pinState, mode, sampleId])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => api.layout())
    ro.observe(el)
    return () => ro.disconnect()
  }, [api])
  useEffect(() => {
    api.layout()
  }, [api, bare])
  // The strip's and the side panel's elements mount after the first paint of a pinned frame: place them once they exist.
  useEffect(() => {
    api.draw()
  }, [api, zoom, geom])

  // ----- the one interaction: move the playhead -----
  const clipAt = (clientX: number) => {
    const el = scrubRef.current
    if (!el || !S.model) return 0
    const b = el.getBoundingClientRect()
    return clamp((clientX - b.left) / b.width, 0, 1) * S.model.durS
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || (e.pointerType === 'mouse' && e.button !== 0)) return
    if (S.state === 'idle') return api.run({ sound: true })
    if (!S.model) return
    e.currentTarget.setPointerCapture(e.pointerId)
    S.scrubbing = true
    ghost(null)
    api.stopLoop()
    S.audio?.pause()
    api.seek(clipAt(e.clientX))
  }
  // Mouse only: a faint line under the cursor shows where a press will move the playhead.
  const ghost = (x: number | null) => {
    const g = ghostRef.current
    if (!g) return
    g.style.opacity = x === null ? '0' : '1'
    if (x !== null) g.style.transform = `translate3d(${x}px, 0, 0)`
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (S.scrubbing) api.seek(clipAt(e.clientX))
    const show = e.pointerType === 'mouse' && !S.scrubbing && S.state !== 'idle' && S.state !== 'error'
    ghost(show ? e.clientX - e.currentTarget.getBoundingClientRect().left : null)
  }
  const onPointerUp = () => {
    if (!S.scrubbing) return
    S.scrubbing = false
    api.play()
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ready || !S.model) return
    const step = e.shiftKey ? 2 : 0.5
    const now = Math.max(0, Math.min(S.clock, S.model.durS * 1000)) / 1000
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') api.seek(now + step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') api.seek(now - step)
    else if (e.key === 'Home') api.seek(0)
    else if (e.key === 'End') api.seek(S.model.durS)
    else if (e.key === ' ' || e.key === 'Enter') {
      if (S.state === 'running' && S.playing) api.pause()
      else if (S.state === 'running') api.play()
      else api.run({ sound: true })
    } else return
    e.preventDefault()
  }

  const uid = 'bgm' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const cls = ['bgm', className].filter(Boolean).join(' ')
  return (
    <div
      ref={rootRef}
      className={cls}
      style={style}
      data-qa="hero"
      data-ready={ready ? '1' : undefined}
      data-state={state}
      data-source={source}
      data-sound={sound ? '1' : '0'}
      data-bare={bare ? '1' : undefined}
      data-technician={tech !== null ? bubble.GRADES[tech] : undefined}
      role="group"
      aria-label="Doppler heart sound, drawn as the model read it"
    >
      <canvas ref={canvasRef} className="bgm-canvas" aria-hidden="true" />
      {!bare && geom && (
        <>
          {(geom.sideW > 0 || geom.sideH > 0) && (
            <div className="bgm-side" data-narrow={geom.narrow ? '1' : undefined} style={geom.narrow ? { width: geom.W, height: geom.sideH } : { width: geom.sideW, height: geom.H }}>
              <div ref={figRef} className="bgm-fig" role="img" aria-label="Drawing of a chest with the Doppler probe over the heart. AI-generated illustration, not a scan.">
                <svg viewBox="12 0 176 250" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                  <defs>
                    <clipPath id={`${uid}c`}>
                      <path d={TORSO} />
                    </clipPath>
                    <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
                      <stop offset="0.12" stopColor="#fff" />
                      <stop offset="0.68" stopColor="#fff" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <mask id={`${uid}m`}>
                      <rect width="200" height="250" fill={`url(#${uid}f)`} />
                    </mask>
                    <radialGradient id={`${uid}g`}>
                      <stop offset="0" style={{ stopColor: "var(--_mark)", stopOpacity: 0.85 }} />
                      <stop offset="0.45" style={{ stopColor: "var(--_mark)", stopOpacity: 0.3 }} />
                      <stop offset="1" style={{ stopColor: "var(--_mark)", stopOpacity: 0 }} />
                    </radialGradient>
                  </defs>
                  <g mask={`url(#${uid}m)`}>
                    <path className="bgm-fig-body" d={TORSO} />
                    <g clipPath={`url(#${uid}c)`} className="bgm-fig-scan">
                      {Array.from({ length: 41 }, (_, i) => (
                        <path key={i} d={`M0 ${6 + i * 6}H200`} />
                      ))}
                    </g>
                    <g className="bgm-fig-bone">
                      <path d="M100 50C86 45 68 45 52 50M100 50C114 45 132 45 148 50M100 52V132" />
                      <path d="M100 68C84 68 62 74 44 92M100 68C116 68 138 74 156 92M100 86C84 86 60 94 40 114M100 86C116 86 140 94 160 114M100 104C84 105 60 114 40 136M100 104C116 105 140 114 160 136M100 122C86 124 62 134 42 158M100 122C114 124 138 134 158 158" />
                    </g>
                    <path className="bgm-fig-line" d={TORSO} />
                  </g>
                  <g transform="translate(113 106)">
                    <circle className="bgm-fig-glow" r="58" fill={`url(#${uid}g)`} />
                    <g className="bgm-fig-heart">
                      <path d="M-5-15C-7-29 9-33 13-22V-14M4-14C4-21-2-25-9-25" />
                      <path className="bgm-fig-heart-body" d="M0-10C-7-21-25-17-25-3C-25 11-9 20 4 32C14 20 26 10 25-4C24-17 7-21 0-10Z" />
                      <path className="bgm-fig-heart-vein" d="M7-13C12-6 10 4 15 11" />
                    </g>
                    <circle className="bgm-fig-ripple" r="34" />
                    <circle className="bgm-fig-spot" r="34" />
                    <path className="bgm-fig-ticks" d="M0-41V-34M0 34V41M-41 0H-34M34 0H41" />
                    <path className="bgm-fig-lead" d="M41 0H140" />
                  </g>
                </svg>
                <span className="bgm-fig-what">probe over the heart</span>
                <span className="bgm-ai">AI-generated illustration</span>
              </div>
              <div
                className="bgm-odds"
                role="img"
                aria-label={
                  odds
                    ? `Chance the grade is at least, ${odds.of === 'clip' ? 'whole clip' : 'latest 5-second slice'}: ` + [4, 3, 2, 1].map((k) => `${bubble.GRADES[k]} ${Math.round(clamp(odds.p[k - 1], 0, 1) * 100)}%`).join(', ')
                    : 'Chance the grade is at least I, II, III, IV: shown after the first 5 seconds'
                }
              >
                <span className="bgm-odds-head">
                  <span>chance the grade is at least</span>
                  <em>{odds ? (odds.of === 'clip' ? 'whole clip' : geom.narrow ? 'latest slice' : 'latest 5-second slice') : geom.narrow ? 'after 5 s' : 'after the first 5 seconds'}</em>
                </span>
                <ol data-kick={odds ? odds.n % 2 : undefined} data-of={odds?.of}>
                  {[4, 3, 2, 1].map((k) => {
                    const p = odds ? clamp(odds.p[k - 1], 0, 1) : 0
                    return (
                      <li key={k} data-on={p > 0.5 ? '1' : undefined}>
                        <b>{bubble.GRADES[k]}</b>
                        <i>
                          <u style={{ transform: `scaleX(${p.toFixed(4)})` }} />
                          <s style={{ transform: `scaleX(${p.toFixed(4)})` }} />
                        </i>
                      </li>
                    )
                  })}
                </ol>
                <span className="bgm-odds-rule">the grade is the highest bar past the middle line</span>
              </div>
            </div>
          )}
          <div className="bgm-tape" style={{ left: geom.tapeX, top: geom.tapeY, width: geom.tapeW, height: geom.H - geom.tapeY }}>
            <div
              ref={scrubRef}
              className="bgm-scrub"
              style={{ width: geom.tapeW }}
              role="slider"
              tabIndex={0}
              aria-label="Playhead: drag or use the arrow keys to move through the recording"
              aria-valuemin={0}
              aria-valuemax={Number(durS.toFixed(1))}
              aria-valuenow={0}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => ghost(null)}
              onKeyDown={onKeyDown}
            />
            <i ref={ghostRef} className="bgm-ghost" style={{ height: geom.railY }} aria-hidden="true" />
            <span ref={timeRef} className="bgm-time" aria-hidden="true" />
            <span ref={sliceRef} className="bgm-slice" aria-hidden="true">
              5-second slice
            </span>
            {durS > 0 && <span className="bgm-what">heart sound, {durS.toFixed(1)} s</span>}
            <span ref={verdictRef} className="bgm-verdict" aria-hidden="true">
              {alertOn ? 'model: alert' : 'model: no alert'}
            </span>
            <span ref={capRef} className="bgm-cap" style={{ top: geom.railY - geom.ridgeH - 34 }}>
              <i aria-hidden="true" />
              model attention
            </span>
            {durS > 0 &&
              Array.from({ length: Math.floor(durS / 5) + 1 }, (_, i) => i * 5).map((s) => (
                <span key={s} className="bgm-sec" data-qa="tick" data-first={s === 0 ? '1' : undefined} style={{ left: (s / durS) * geom.tapeW, top: geom.railY + 11 }} aria-hidden="true">
                  {s} s
                </span>
              ))}
            {geom.stripH > 0 && zoom && (
              <div className="bgm-strip" data-narrow={geom.tapeW < 560 ? '1' : undefined} style={{ top: geom.railY + geom.secH, height: geom.stripH }} aria-hidden="true">
                <span className="bgm-strip-name">
                  <i data-k="line" />
                  running estimate
                  <i data-k="dot" />
                  each slice alone
                </span>
                {zoom.zoomed && (
                  <span className="bgm-zoomnote" data-qa="tick">
                    zoomed in: grade {trim(zoom.lo)} to {trim(zoom.hi)} of 0 to IV
                  </span>
                )}
                {[0, 1, 2, 3, 4]
                  .filter((g) => g >= zoom.lo && g <= zoom.hi)
                  .map((g) => (
                    <span key={g} className="bgm-gl" data-qa="tick" style={{ top: stripYFor(geom, zoom, g) }}>
                      {bubble.GRADES[g]}
                    </span>
                  ))}
                {/* The zoomed range's own ends, so the axis itself says it is not 0 to IV (left out where a grade numeral sits). */}
                {zoom.zoomed &&
                  [zoom.lo, zoom.hi]
                    .filter((v) => [0, 1, 2, 3, 4].every((g) => g < zoom.lo || g > zoom.hi || Math.abs(stripYFor(geom, zoom, v) - stripYFor(geom, zoom, g)) > 15))
                    .map((v) => (
                      <span key={v} className="bgm-gl" data-end={v === zoom.lo ? 'lo' : 'hi'} data-qa="tick" style={{ top: stripYFor(geom, zoom, v) }}>
                        {trim(v)}
                      </span>
                    ))}
                <span ref={hintRef} className="bgm-hint">
                  the first reading lands after 5 seconds
                </span>
                <span ref={chipRef} className="bgm-chip" />
              </div>
            )}
          </div>
          <div className="bgm-gutter" style={{ top: geom.tapeY, width: geom.gutter, height: geom.H - geom.tapeY }}>
            <span className="bgm-scale-name" style={{ width: geom.gutter }} aria-hidden="true">
              bubble grade
            </span>
            <ol
              className="bgm-scale"
              style={{ width: geom.gutter, height: geom.tapeH, '--_y4': `${yForGrade(geom, 4)}px`, '--_y0': `${yForGrade(geom, 0)}px` } as CSSProperties}
              aria-label="Bubble grade (Spencer scale), 0 to IV"
            >
              {[4, 3, 2, 1, 0].map((k) => (
                <li key={k} data-on={lit === k ? '1' : undefined} data-tech={tech === k && truth ? '1' : undefined} style={{ top: yForGrade(geom, k) }}>
                  <span data-qa="tick">{bubble.GRADES[k]}</span>
                  {tech === k && truth && <em data-side={truth}>technician</em>}
                </li>
              ))}
            </ol>
            {zoom?.zoomed && geom.stripH > 0 && <i className="bgm-zoomband" style={{ top: yForGrade(geom, zoom.hi), height: yForGrade(geom, zoom.lo) - yForGrade(geom, zoom.hi) }} aria-hidden="true" />}
            <div ref={needleRef} className="bgm-needle" style={{ width: geom.gutter }} aria-hidden="true">
              <i />
            </div>
            <button
              type="button"
              className="bgm-sound"
              style={{ right: (geom.gutter - 44) / 2, bottom: geom.stripH >= 64 ? (geom.stripH - 44) / 2 : geom.secH + geom.stripH + 14 }}
              aria-pressed={sound}
              aria-label="Sound"
              disabled={!ready}
              onClick={() => {
                S.muted = sound
                api.setSound(!sound)
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor" />
                {sound ? (
                  <path d="M15.2 9a4.2 4.2 0 0 1 0 6M17.8 6.4a7.9 7.9 0 0 1 0 11.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                ) : (
                  <path d="M15.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </>
      )}
      {loadPct !== null && (
        <div className="bgm-load" role="progressbar" aria-label="Loading the model" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(loadPct * 100)}>
          <i style={{ transform: `scaleX(${clamp(loadPct, 0.02, 1)})` }} />
          <span>Loading the model</span>
        </div>
      )}
      {error && (
        <p className="bgm-error" role="alert">
          {error}
        </p>
      )}
      <span className="bgm-sr" aria-live="polite">
        {say}
      </span>
    </div>
  )
}

export default BubbleGradeMoment

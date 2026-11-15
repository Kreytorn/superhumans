// VeinSqueeze signature moment, "the wink": two real ultrasound clips, one hold.
// Hold = press the probe: the real frames scrub from rest to each clip's tightest squeeze, the SAM 2 outline
// (precomputed explanation layer) tracks the vein, the squeeze curve draws under each clip and ends in its band
// word; only then the classifier's clip value ("AI clot chance", with the alarm mark) appears. Stage only: no title,
// no action card.
// Every mark is read from the engine (VsResult / SqueezeCurve); nothing is invented. Tokens and beats: README.md.
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import './moment.css'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import * as vs from '../../engine/veinsqueeze'
import type { SqueezeCurve, VsActDecision, VsResult, VsSample } from '../../engine/veinsqueeze'
import { BEATS, END, pose } from './timeline'

export { BEATS, END, pose, beatAt } from './timeline'
export type { BeatName, Pose } from './timeline'

export type MomentState = 'idle' | 'running' | 'result' | 'error'
export type MomentMode = 'auto' | 'live' | 'replay'

export interface ClipOutcome {
  sampleId: string
  result: VsResult
  act: VsActDecision
}

export interface VeinSqueezeMomentProps {
  /** Which clip the page is about; its outcome is the one handed to onResult. "clip-a" (default) and "clip-b" show
   *  the same-patient pair A + B, "clip-c" / "clip-d" show C + D (two patients), "clip-e" and "clip-f" show one clip. */
  sampleId?: string
  /** auto: live analyze() on a laptop, replay() on a phone (coarse pointer or narrow window) or when the model fails. */
  mode?: MomentMode
  /** Pin: "result" jumps to the settled result with no animation, "idle" resets. The stage stays usable. */
  state?: 'idle' | 'result'
  /** Pin the timeline at this many ms (0 - END). While set, the stage does not react to input. */
  t?: number
  /** Called when the result settles. `result` and `act` belong to `sampleId`; `all` has one entry per clip on stage. */
  onResult?: (result: VsResult, act: VsActDecision, all: ClipOutcome[]) => void
  onState?: (state: MomentState) => void
  /** Clips decoded, stage usable. */
  onReady?: () => void
  /** Which path the stage will use / used: "live" (the model runs in this browser) or "replay" (stored outputs). */
  onMode?: (mode: 'live' | 'replay') => void
  /** Specimen and marks only: hides every word and the hold control (posters, thumbnails). */
  bare?: boolean
  /** Hold the Space bar anywhere on the page to press (default true). */
  spaceKey?: boolean
  className?: string
  style?: CSSProperties
}

export interface VeinSqueezeMomentHandle {
  /** Plays the whole timeline without a hold (for a page's own button). */
  run(): void
  /** Back to rest. */
  reset(): void
}

const GROUPS: Record<string, string[]> = {
  a: ['clip-a', 'clip-b'],
  b: ['clip-a', 'clip-b'],
  c: ['clip-c', 'clip-d'],
  d: ['clip-c', 'clip-d'],
  e: ['clip-e'],
  f: ['clip-f'],
}
const letterOf = (id?: string) => /([a-f])$/i.exec(id ?? '')?.[1].toLowerCase() ?? 'a'

/** The hold spends most of its time on the last seconds of real clip before the lowest point, where the vein moves. */
const LEAD_S = 1.5
/** Share of the hold that runs through the still part of the clip before that (same real frames, only faster). */
const SKIM = 0.15
/** Hand-check note from the model brief (work/VeinSqueeze/LOG.md): what the lowest point of a clip is when it is not
 *  a squeeze. Clip A: "dip only when the view shifts at 3.4 s". */
const LOWEST_NOTE: Record<string, string> = { 'clip-a': 'view shifts here' }
/** Clips where the word "artery" may follow the vein outline's centre after the first frame: hand-checked on the
 *  frames that it stays on the artery (clip A, whose view shifts as one piece). On every other clip the word is shown
 *  only at rest, at SAM 2's stored artery click, and leaves when the press starts. */
const ARTERY_FOLLOWS: Record<string, boolean> = { 'clip-a': true }
/** The rule the squeeze test rests on (model brief, section 1). */
const RULE_LINE = 'A healthy vein squashes flat when pressed.'

/** 98%, 1.3%, 99.7%: whole numbers in the middle, one decimal near either end, and never a rounded-up 100% or 0%. */
export function formatChance(p: number): string {
  const v = p * 100
  if (v > 99.9) return '>99.9%'
  if (v < 0.1) return '<0.1%'
  return `${v >= 10 && v < 99 ? Math.round(v) : v.toFixed(1)}%`
}

interface Clip {
  sample: VsSample
  squeeze: SqueezeCurve | null
  /** Source frame of each scrub slot, rest -> tightest squeeze (or the whole clip when there is no curve). */
  frameIdx: number[]
  bitmaps: (ImageBitmap | null)[]
  /** SAM 2 outline per slot as a closed path, webm pixels. */
  paths: string[]
  curveMain: string
  curveRest: string
  /** The same two pieces closed down to the chart floor: the soft fill under the curve. */
  areaMain: string
  areaRest: string
  /** Where the crop window is centred (webm pixels): the middle of the outline's travel. */
  center: [number, number]
  /** Where the word "vein" sits at rest: the middle of SAM 2's outline on the first frame (webm pixels). */
  veinLabel: [number, number] | null
  /** Where the word "artery" sits per scrub slot (webm pixels): SAM 2's stored artery click on the first frame, moved
   *  with the middle of the vein outline so it stays on the artery when the view shifts. Null when no artery click. */
  arteryAt: [number, number][] | null
  /** Where the word "start" sits by the dotted start outline (webm pixels), on the side the vein does not move to. */
  startLabel: { x: number; y: number; below: boolean } | null
  /** Which side of the lowest point its value is written on: under the curve to the left, or above its tail to the right. */
  lowSide: 'left' | 'right'
}
interface Scene {
  clips: Clip[]
  yMax: number
}
interface ClipEls {
  box?: HTMLDivElement | null
  svg?: SVGSVGElement | null
  outline?: SVGPathElement | null
  ghost?: SVGPathElement | null
  start?: SVGGElement | null
  click?: SVGGElement | null
  probe?: HTMLElement | null
  head?: HTMLElement | null
  artery?: SVGGElement | null
  expert?: SVGGElement | null
  note?: SVGTSpanElement | null
  grid?: SVGSVGElement | null
  axis?: HTMLElement | null
  bet?: HTMLElement | null
  low?: HTMLElement | null
  alarm?: HTMLElement | null
  tag?: HTMLElement | null
  reveal?: HTMLDivElement | null
  dot?: HTMLElement | null
  ring?: HTMLElement | null
  ticks?: HTMLElement | null
  band?: HTMLElement | null
  op?: HTMLElement | null
  fill?: HTMLElement | null
  value?: HTMLElement | null
}
interface Rect {
  x: number
  y: number
  w: number
  h: number
  r: number
  wx: number
  wy: number
  ww: number
  wh: number
  /** One CSS pixel in webm pixels. */
  u: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Fade a word in; while it is at zero it is truly hidden (not read out, not counted as text). */
function fade(el: HTMLElement | null | undefined, v: number) {
  if (!el) return
  el.style.opacity = String(v)
  el.style.visibility = v > 0 ? 'visible' : 'hidden'
}
const isCoarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Closed Catmull-Rom spline through the polygon's own points (passes through every SAM 2 vertex). */
function closedPath(pts: ReadonlyArray<readonly [number, number]>): string {
  const n = pts.length
  if (n < 3) return ''
  const f = (v: number) => v.toFixed(1)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

function buildClip(sample: VsSample, squeeze: SqueezeCurve | null, slots: number): Clip {
  const endFrame = squeeze ? squeeze.tMinFrame : sample.frames - 1
  // rest -> lowest point, every slot a real frame in clip order. The still part before the last LEAD_S seconds is
  // run through in the first SKIM of the hold, so the vein is moving for most of the press.
  const leadFrame = squeeze ? Math.max(0, Math.round(endFrame - LEAD_S * squeeze.fps)) : 0
  const skim = endFrame > 0 ? Math.min(SKIM, leadFrame / endFrame) : 0
  const frameIdx = Array.from({ length: slots }, (_, k) => {
    const p = k / (slots - 1)
    return Math.round(p < skim ? (p / skim) * leadFrame : leadFrame + ((p - skim) / (1 - skim)) * (endFrame - leadFrame))
  })
  const paths = frameIdx.map((f) => (squeeze ? closedPath(squeeze.outlineVideo[f] ?? []) : ''))
  let center: [number, number] = [sample.videoWh[0] / 2, sample.videoWh[1] / 2]
  let veinLabel: Clip['veinLabel'] = null
  let arteryAt: Clip['arteryAt'] = null
  let startLabel: Clip['startLabel'] = null
  let lowSide: Clip['lowSide'] = 'left'
  if (squeeze) {
    const first = squeeze.outlineVideo[0] ?? []
    const last = squeeze.outlineVideo[endFrame] ?? []
    const mid = (pts: ReadonlyArray<readonly [number, number]>, i: 0 | 1) => pts.reduce((a, p) => a + p[i], 0) / pts.length
    if (first.length > 2) {
      veinLabel = [mid(first, 0), mid(first, 1)]
      const a = squeeze.clicks.artery
      if (a && squeeze.clicks.clickFrame === 0) {
        const ax = a[0] * sample.videoScaleXy[0]
        const ay = a[1] * sample.videoScaleXy[1]
        arteryAt = frameIdx.map((f): [number, number] => {
          const o = squeeze.outlineVideo[f] ?? []
          return o.length > 2 ? [ax + mid(o, 0) - mid(first, 0), ay + mid(o, 1) - mid(first, 1)] : [ax, ay]
        })
      }
    }
    if (first.length > 2 && last.length > 2) {
      const below = mid(last, 1) <= mid(first, 1) // the vein ends higher up: write "start" under the dotted shape
      const edge = first.reduce((a, p) => (below ? (p[1] > a[1] ? p : a) : p[1] < a[1] ? p : a), first[0])
      startLabel = { x: mid(first, 0), y: edge[1], below }
    }
    // a lowest point near the floor of the chart has no room under the curve: write its value above the tail instead
    if (squeeze.rMin < 30 || endFrame / Math.max(1, squeeze.frames - 1) < 0.3) lowSide = 'right'
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const f of frameIdx)
      for (const [x, y] of squeeze.outlineVideo[f] ?? []) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    if (Number.isFinite(x0)) center = [(x0 + x1) / 2, (y0 + y1) / 2]
  }
  return { sample, squeeze, frameIdx, bitmaps: new Array<ImageBitmap | null>(slots).fill(null), paths, curveMain: '', curveRest: '', areaMain: '', areaRest: '', center, veinLabel, arteryAt, startLabel, lowSide }
}

/** The squeeze curve (5-frame median, the series the band was read from) over the whole clip, split at its lowest point. */
function curvePaths(sq: SqueezeCurve, yMax: number): [string, string, string, string] {
  const px = (f: number) => ((f / (sq.frames - 1)) * 1000).toFixed(1)
  const pt = (f: number) => `${px(f)} ${((1 - sq.pctMed5[f] / yMax) * 100).toFixed(2)}`
  let main = ''
  let rest = ''
  for (let f = 0; f <= sq.tMinFrame; f++) main += (f ? 'L' : 'M') + pt(f)
  for (let f = sq.tMinFrame; f < sq.frames; f++) rest += (f > sq.tMinFrame ? 'L' : 'M') + pt(f)
  // the same line closed down to the floor of the chart (the fill under it, nothing new is measured)
  const low = px(sq.tMinFrame)
  return [main, rest, `${main}L${low} 100L0 100Z`, `${rest}L1000 100L${low} 100Z`]
}

function waitFor(el: HTMLMediaElement, ok: string, ms = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer)
      el.removeEventListener(ok, onOk)
      el.removeEventListener('error', onErr)
      fn()
    }
    const onOk = () => done(resolve)
    const onErr = () => done(() => reject(new Error('the clip could not be decoded')))
    const timer = setTimeout(() => done(() => reject(new Error(`the clip timed out waiting for "${ok}"`))), ms)
    el.addEventListener(ok, onOk)
    el.addEventListener('error', onErr)
  })
}

/** Decodes the scrub frames of one clip (real frames of the shipped webm, by seeking), first frame first. */
async function extractFrames(clip: Clip, onFrame: (slot: number, bmp: ImageBitmap) => void, dead: () => boolean) {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = clip.sample.urls.video
  try {
    if (v.readyState < 2) await waitFor(v, 'loadeddata', 15000)
    const fps = clip.squeeze?.fps ?? clip.sample.fps
    let last = -1
    let lastBmp: ImageBitmap | null = null
    for (let k = 0; k < clip.frameIdx.length; k++) {
      if (dead()) return
      const f = clip.frameIdx[k]
      if (f !== last || !lastBmp) {
        const target = Math.min((f + 0.5) / fps, Math.max(0, (v.duration || Infinity) - 0.001))
        if (Math.abs(v.currentTime - target) > 1e-4) {
          const seeked = waitFor(v, 'seeked')
          v.currentTime = target
          await seeked
        }
        lastBmp = await createImageBitmap(v)
        last = f
        onFrame(k, lastBmp)
      } else clip.bitmaps[k] = lastBmp
    }
  } finally {
    v.removeAttribute('src')
    v.load()
  }
}

export const VeinSqueezeMoment = forwardRef<VeinSqueezeMomentHandle, VeinSqueezeMomentProps>(function VeinSqueezeMoment(props, ref) {
  const { sampleId, mode = 'auto', state: pinState, t: pinT, onResult, onState, onReady, onMode, bare = false, spaceKey = true, className, style } = props
  const letter = letterOf(sampleId)
  const groupKey = GROUPS[letter].join(',')
  const pinned = typeof pinT === 'number' && Number.isFinite(pinT)

  const [scene, setScene] = useState<Scene | null>(null)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<MomentState>('idle')
  const [outcomes, setOutcomes] = useState<ClipOutcome[] | null>(null)
  const [usedMode, setUsedMode] = useState<'live' | 'replay' | null>(null)
  const [layout, setLayout] = useState<'row' | 'col'>('row')
  const [holding, setHolding] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [reload, setReload] = useState(0)
  const [seen, setSeen] = useState(false) // a result has settled at least once since the clips loaded

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holdFillRef = useRef<HTMLSpanElement>(null)
  const holdRef = useRef<HTMLButtonElement>(null)
  const els = useRef<ClipEls[]>([])
  const sceneRef = useRef<Scene | null>(null)
  const outcomesRef = useRef<ClipOutcome[] | null>(null)
  const geom = useRef<{ dirty: boolean; version: number; rects: (Rect | null)[]; drawn: string[] }>({ dirty: true, version: 0, rects: [], drawn: [] })
  const clock = useRef({ t: 0, holding: false, auto: false, jump: false, last: 0, upAt: 0, hadResult: false, raf: 0, run: 0 })
  // set on unmount: a model answer or a key release that lands after the stage is gone must not restart the clock
  const gone = useRef(false)
  useEffect(() => {
    gone.current = false
    return () => {
      gone.current = true
      const c = clock.current
      c.run++
      if (c.raf) cancelAnimationFrame(c.raf)
      c.raf = 0
      c.holding = c.auto = c.jump = false
    }
  }, [])
  const queue = useRef<Promise<void>>(Promise.resolve())
  const liveFailed = useRef(false)
  const live = useRef({ ready: false, pinned, phase: 'idle' as MomentState, mode, primary: `clip-${letter}`, cb: { onResult, onState, onReady, onMode } })
  live.current.pinned = pinned
  live.current.mode = mode
  live.current.primary = `clip-${letter}`
  live.current.cb = { onResult, onState, onReady, onMode }

  const setPhaseBoth = useCallback((p: MomentState) => {
    if (live.current.phase === p) return
    live.current.phase = p
    setPhase(p)
    live.current.cb.onState?.(p)
  }, [])

  const wantLive = () => {
    const m = live.current.mode
    if (liveFailed.current) return false
    return m === 'live' || (m === 'auto' && !(isCoarse() || window.innerWidth < 700))
  }

  // ---------------------------------------------------------------- geometry: where each real frame lands on the one canvas
  const measure = useCallback(() => {
    const sc = sceneRef.current
    const canvas = canvasRef.current
    const root = rootRef.current
    const g = geom.current
    if (!sc || !canvas || !root) return
    const cr = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, isCoarse() ? 1.5 : 2)
    const W = Math.max(1, Math.round(cr.width * dpr))
    const H = Math.max(1, Math.round(cr.height * dpr))
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    } else canvas.getContext('2d')?.clearRect(0, 0, W, H)
    const radius = parseFloat(getComputedStyle(root).getPropertyValue('--m-radius')) || 0
    g.rects = sc.clips.map((c, i) => {
      const e = els.current[i]
      const b = e?.box?.getBoundingClientRect()
      if (!e || !b || b.width < 2 || b.height < 2) return null
      const [vw, vh] = c.sample.videoWh
      const ar = b.width / b.height
      // "cover": the largest window of the real frame with the box's shape, centred on the vein's travel
      const ww = ar > vw / vh ? vw : vh * ar
      const wh = ar > vw / vh ? vw / ar : vh
      const wx = clamp(c.center[0] - ww / 2, 0, vw - ww)
      const wy = clamp(c.center[1] - wh / 2, 0, vh - wh)
      const u = ww / b.width // one CSS pixel in webm pixels
      e.svg?.setAttribute('viewBox', `${wx.toFixed(2)} ${wy.toFixed(2)} ${ww.toFixed(2)} ${wh.toFixed(2)}`)
      e.svg?.style.setProperty('--vsq-u', u.toFixed(4))
      if (c.veinLabel) e.click?.setAttribute('transform', `translate(${c.veinLabel[0].toFixed(1)} ${c.veinLabel[1].toFixed(1)}) scale(${u.toFixed(4)})`)
      e.expert?.setAttribute('transform', `translate(${(wx + 12 * u).toFixed(1)} ${(wy + 25 * u).toFixed(1)}) scale(${u.toFixed(4)})`)
      if (c.startLabel) {
        // keep the word inside the picture
        const lx = clamp(c.startLabel.x, wx + 24 * u, wx + ww - 24 * u)
        const ly = clamp(c.startLabel.y + (c.startLabel.below ? 17 : -8) * u, wy + 14 * u, wy + wh - 6 * u)
        e.start?.setAttribute('transform', `translate(${lx.toFixed(1)} ${ly.toFixed(1)}) scale(${u.toFixed(4)})`)
      }
      return { x: (b.left - cr.left) * dpr, y: (b.top - cr.top) * dpr, w: b.width * dpr, h: b.height * dpr, r: radius * dpr, wx, wy, ww, wh, u }
    })
    g.version++
    g.dirty = false
  }, [])

  // ---------------------------------------------------------------- draw(t): the whole stage from the clock and the engine's data
  const draw = useCallback(() => {
    const sc = sceneRef.current
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!sc || !canvas || !root) return
    const g = geom.current
    if (g.dirty) measure()
    const P = pose(clock.current.t)
    root.dataset.beat = P.beat
    root.dataset.press = String(Math.round(P.press * 100))
    if (holdFillRef.current) {
      // the viewer's press: fills while held, lets go as the value lands
      holdFillRef.current.style.transform = `scaleX(${P.press})`
      holdFillRef.current.style.opacity = String(1 - P.value)
    }
    // the same press, as one number for the control's own picture of it and the probe edge on each clip
    const pressed = (P.press * (1 - P.value)).toFixed(3)
    holdRef.current?.style.setProperty('--vsq-press', pressed)
    const ctx = canvas.getContext('2d')
    sc.clips.forEach((c, i) => {
      const e = els.current[i]
      const r = g.rects[i]
      if (!e) return
      const slots = c.frameIdx.length
      const k = Math.round(P.press * (slots - 1))
      let kb = k
      while (kb > 0 && !c.bitmaps[kb]) kb--
      const bmp = c.bitmaps[kb]
      const key = `${kb}:${g.version}`
      if (ctx && r && bmp && g.drawn[i] !== key) {
        const [vw, vh] = c.sample.videoWh
        const sx = bmp.width / vw
        const sy = bmp.height / vh
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(r.x, r.y, r.w, r.h, r.r)
        ctx.clip()
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bmp, r.wx * sx, r.wy * sy, r.ww * sx, r.wh * sy, r.x, r.y, r.w, r.h)
        ctx.restore()
        g.drawn[i] = key
      }
      e.probe?.style.setProperty('--vsq-press', pressed)
      const sq = c.squeeze
      if (sq) {
        const f = c.frameIdx[kb]
        if (e.outline) {
          // at rest the outline is already there (one shape to bet on and to press); the press tints it
          e.outline.setAttribute('d', c.paths[kb])
          e.outline.style.opacity = bmp ? '1' : '0'
          e.outline.style.fillOpacity = String(0.16 * P.outline)
        }
        // the chart is not there until the press starts
        fade(e.ticks, P.outline)
        fade(e.axis, P.outline)
        if (e.grid) {
          e.grid.style.opacity = String(P.outline)
          e.grid.style.visibility = P.outline > 0 ? 'visible' : 'hidden'
        }
        const ghost = Math.min(1, P.press * 5)
        if (e.ghost) e.ghost.style.opacity = String(ghost * 0.7)
        if (e.start) {
          e.start.style.opacity = String(ghost)
          e.start.style.visibility = ghost > 0 ? 'visible' : 'hidden'
        }
        fade(e.low, P.landed)
        if (e.click) {
          e.click.style.opacity = String(P.click)
          e.click.style.visibility = bmp && P.click > 0 ? 'visible' : 'hidden'
        }
        if (e.artery && c.arteryAt && r) {
          const [ax, ay] = c.arteryAt[kb]
          e.artery.setAttribute('transform', `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) scale(${r.u.toFixed(4)})`)
          const av = ARTERY_FOLLOWS[c.sample.id] ? 1 : P.click
          e.artery.style.opacity = String(av)
          e.artery.style.visibility = bmp && av > 0 ? 'visible' : 'hidden'
        }
        if (e.note) {
          e.note.style.fillOpacity = String(P.landed)
          e.note.style.strokeOpacity = String(P.landed)
          e.note.style.visibility = P.landed > 0 ? 'visible' : 'hidden'
        }
        const x = f / (sq.frames - 1)
        const y = 1 - sq.pctMed5[f] / sc.yMax
        const shown = x + (1 - x) * P.rest
        if (e.reveal) {
          e.reveal.style.clipPath = `inset(-40% ${((1 - shown) * 100).toFixed(2)}% -40% -2%)`
          e.reveal.style.visibility = P.dot > 0 ? 'visible' : 'hidden' // no stray line cap at rest
        }
        if (e.head) {
          // the playhead: a hairline through the chart at the frame on screen; it stays, quieter, at the lowest point
          e.head.style.left = `${(x * 100).toFixed(2)}%`
          e.head.style.opacity = String(P.dot * (1 - 0.55 * P.landed))
        }
        if (e.dot) {
          e.dot.style.left = `${(x * 100).toFixed(2)}%`
          e.dot.style.top = `${(y * 100).toFixed(2)}%`
          e.dot.style.opacity = String(P.dot)
        }
        if (e.ring) {
          e.ring.style.opacity = String(P.landed)
          e.ring.style.transform = `scale(${(2.6 - 1.6 * P.landed).toFixed(3)})`
        }
        if (e.band) {
          fade(e.band, P.band)
          e.band.style.transform = `translateY(${((1 - P.band) * 6).toFixed(2)}px)`
        }
      }
      const o = outcomesRef.current?.[i]
      fade(e.op, o ? P.track : 0)
      if (e.fill) e.fill.style.transform = `scaleX(${o ? (o.result.clotProb * P.fill).toFixed(4) : 0})`
      fade(e.value, o ? P.value : 0)
      fade(e.alarm, o ? P.value : 0)
      fade(e.tag, o ? P.value : 0)
      // the answer to the bet: the expert's label lands on each picture with the values
      if (e.expert) {
        const v = o ? P.value : 0
        e.expert.style.opacity = String(v)
        e.expert.style.visibility = v > 0 ? 'visible' : 'hidden'
      }
      // the bet gives way to the chart as the press starts
      fade(e.bet, 1 - P.outline)
    })
  }, [measure])

  // ---------------------------------------------------------------- the clock
  const settle = useCallback(() => {
    const c = clock.current
    c.auto = c.holding = c.jump = false
    c.hadResult = true
    setSeen(true)
    setHolding(false)
    setWaiting(false)
    setPhaseBoth('result')
    const all = outcomesRef.current
    if (!all) return
    const primary = all.find((o) => o.sampleId === live.current.primary) ?? all[0]
    live.current.cb.onResult?.(primary.result, primary.act, all)
  }, [setPhaseBoth])

  const loop = useCallback(
    (now: number) => {
      const c = clock.current
      c.raf = 0
      if (gone.current) return
      const dt = clamp(now - c.last, 0, 64)
      c.last = now
      const has = !!outcomesRef.current
      if (c.jump) {
        if (has) {
          c.t = END
          settle()
        }
      } else if (c.holding || c.auto) {
        let nt = c.t + dt
        // the classifier's value cannot appear before the classifier has answered: the clock waits at the beat's door
        const gated = !has && nt > BEATS.opinion.from
        if (gated) nt = BEATS.opinion.from
        setWaiting(gated)
        if (nt >= BEATS.press.to) c.auto = true // fully pressed: the rest plays on its own
        c.t = Math.min(END, nt)
        if (c.t >= END) settle()
      }
      draw()
      if (c.jump || c.holding || c.auto) c.raf = requestAnimationFrame(loop)
    },
    [draw, settle],
  )
  const kick = useCallback(() => {
    const c = clock.current
    if (c.raf || gone.current) return
    c.last = performance.now()
    c.raf = requestAnimationFrame(loop)
  }, [loop])

  const fail = useCallback(
    (err: unknown) => {
      console.warn('[veinsqueeze moment]', err)
      const c = clock.current
      c.auto = c.holding = c.jump = false
      c.t = 0
      setHolding(false)
      setWaiting(false)
      setPhaseBoth('error')
      draw()
    },
    [draw, setPhaseBoth],
  )

  /** Runs the real model on every clip on stage (one after the other: one shared worker), or reads the stored outputs. */
  const fetchOutcomes = useCallback(() => {
    const sc = sceneRef.current
    if (!sc) return
    const run = ++clock.current.run
    outcomesRef.current = null
    setOutcomes(null)
    queue.current = queue.current.then(async () => {
      if (run !== clock.current.run) return
      let useLive = wantLive()
      let results: VsResult[] | null = null
      if (useLive) {
        try {
          const out: VsResult[] = []
          for (const c of sc.clips) out.push(await vs.analyze(c.sample.id))
          results = out
        } catch (err) {
          console.warn('[veinsqueeze moment] live model failed, falling back to replay', err)
          liveFailed.current = true
          useLive = false
        }
      }
      if (!results) {
        try {
          results = await Promise.all(sc.clips.map((c) => vs.replay(c.sample.id)))
        } catch (err) {
          if (run === clock.current.run) fail(err)
          return
        }
      }
      if (run !== clock.current.run || sceneRef.current !== sc) return
      const all = results.map((r, i) => ({ sampleId: sc.clips[i].sample.id, result: r, act: vs.act(r) }))
      outcomesRef.current = all
      setOutcomes(all)
      setUsedMode(useLive ? 'live' : 'replay')
      kick()
    })
  }, [fail, kick])

  const begin = useCallback(
    (auto: boolean) => {
      const c = clock.current
      const L = live.current
      if (L.phase === 'error' && !L.ready) {
        setReload((n) => n + 1)
        return
      }
      if (!L.ready || L.pinned) return
      if (auto && (c.auto || c.jump)) return
      if (!auto) {
        if (c.holding) return
        c.holding = true
        setHolding(true)
      } else c.auto = true
      if (c.t >= END) c.t = BEATS.press.from // press again: the outline is already there
      if (L.phase !== 'running') {
        fetchOutcomes()
        setPhaseBoth('running')
      }
      if (prefersReduced()) c.jump = true // reduced motion: no scrub, straight to the end state
      kick()
    },
    [fetchOutcomes, kick, setPhaseBoth],
  )

  const release = useCallback(() => {
    const c = clock.current
    if (!c.holding) return
    c.holding = false
    c.upAt = performance.now()
    setHolding(false)
    if (c.auto || c.jump) return
    // letting go, after a tap or a real hold, plays the rest through to the result: a press is never thrown away
    c.auto = true
    kick()
  }, [kick])

  const reset = useCallback(() => {
    const c = clock.current
    c.run++
    if (c.raf) cancelAnimationFrame(c.raf)
    c.raf = 0
    c.t = 0
    c.holding = c.auto = c.jump = c.hadResult = false
    outcomesRef.current = null
    setOutcomes(null)
    setHolding(false)
    setWaiting(false)
    setPhaseBoth('idle')
    draw()
  }, [draw, setPhaseBoth])

  useImperativeHandle(ref, () => ({ run: () => begin(true), reset }), [begin, reset])
  useEffect(() => {
    if (usedMode) live.current.cb.onMode?.(usedMode)
  }, [usedMode])

  // ---------------------------------------------------------------- load: clip list, SAM 2 curves, then the real frames
  useEffect(() => {
    let dead = false
    const made: ImageBitmap[] = []
    const c = clock.current
    live.current.ready = false
    setPhaseBoth('idle')
    setSeen(false)
    setReady(false)
    setProgress(0)
    setOutcomes(null)
    outcomesRef.current = null
    c.t = 0
    c.holding = c.auto = c.jump = c.hadResult = false
    ;(async () => {
      try {
        const samples = await vs.listSamples()
        const picked = groupKey.split(',').map((id) => {
          const s = samples.find((x) => x.id === id)
          if (!s) throw new Error(`unknown clip "${id}"`)
          return s
        })
        const squeezes = await Promise.all(picked.map((s) => (s.urls.sam2 ? vs.loadSqueeze(s.urls.sam2) : Promise.resolve(null))))
        if (dead) return
        const slots = isCoarse() ? 30 : 48
        const clips = picked.map((s, i) => buildClip(s, squeezes[i], slots))
        const top = Math.max(100, ...clips.flatMap((cl) => cl.squeeze?.pctMed5 ?? []))
        // headroom above the start line for the axis title
        const sc: Scene = { clips, yMax: Math.max(150, Math.ceil(top / 10) * 10) }
        for (const cl of clips) if (cl.squeeze) [cl.curveMain, cl.curveRest, cl.areaMain, cl.areaRest] = curvePaths(cl.squeeze, sc.yMax)
        sceneRef.current = sc
        geom.current.dirty = true
        geom.current.drawn = []
        setScene(sc)
        let done = 0
        const total = clips.length * slots
        await Promise.all(
          clips.map((cl) =>
            extractFrames(
              cl,
              (k, bmp) => {
                if (dead) return bmp.close()
                made.push(bmp)
                cl.bitmaps[k] = bmp
                done++
                if (k === 0 || done % 8 === 0) setProgress(done / total)
                if (k === 0) requestAnimationFrame(draw)
              },
              () => dead,
            ),
          ),
        )
        if (dead) return
        live.current.ready = true
        setProgress(1)
        setReady(true)
        draw()
        setUsedMode(wantLive() ? 'live' : 'replay')
        // laptop: fetch the 20 MB model and run it once (its first run compiles shaders) while the viewer is still
        // looking at the bet, so the hold itself stays smooth. This warm-up result is thrown away: what the stage
        // shows always comes from the run the press starts.
        if (wantLive())
          queue.current = queue.current
            .then(() => vs.load())
            .then(() => (dead ? undefined : vs.analyze(clips[0].sample.id)))
            .then(() => undefined)
            .catch((err) => {
              console.warn('[veinsqueeze moment] live model unavailable, using replay', err)
              liveFailed.current = true
              if (!dead) setUsedMode('replay')
            })
      } catch (err) {
        if (!dead) fail(err)
      }
    })()
    return () => {
      dead = true
      c.run++
      if (c.raf) cancelAnimationFrame(c.raf)
      c.raf = 0
      for (const b of made) b.close()
      sceneRef.current = null
    }
  }, [groupKey, reload, draw, fail, setPhaseBoth])

  // "ready" for a page or a test: the clips are decoded and, when a state or a time is pinned, that frame is on screen
  const shownReady = ready && (pinned ? clamp(pinT as number, 0, END) <= 0 || !!outcomes : pinState === 'result' ? seen : true)
  useEffect(() => {
    if (shownReady) live.current.cb.onReady?.()
  }, [shownReady])

  // pins: ?t= and ?state=
  useEffect(() => {
    if (!ready) return
    const c = clock.current
    if (pinned) {
      if (c.raf) cancelAnimationFrame(c.raf)
      c.raf = 0
      c.holding = c.auto = c.jump = false
      c.t = clamp(pinT as number, 0, END)
      if (c.t > 0 && !outcomesRef.current) fetchOutcomes()
      setPhaseBoth(c.t >= END ? 'result' : c.t > 0 ? 'running' : 'idle')
      draw()
    } else if (pinState === 'result') {
      if (live.current.phase !== 'result') {
        c.jump = true
        c.auto = true
        fetchOutcomes()
        setPhaseBoth('running')
        kick()
      }
    } else if (pinState === 'idle') reset()
  }, [ready, pinned, pinT, pinState, draw, fetchOutcomes, kick, reset, setPhaseBoth])

  // a pinned frame is complete once the outcomes are in
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!pinned || !ready) {
      delete root.dataset.pinned
      return
    }
    const t = clamp(pinT as number, 0, END)
    if (t > 0 && !outcomes) return
    draw()
    root.dataset.pinned = '1'
    if (t >= END && outcomes) {
      const primary = outcomes.find((o) => o.sampleId === live.current.primary) ?? outcomes[0]
      live.current.cb.onResult?.(primary.result, primary.act, outcomes)
    }
  }, [pinned, pinT, ready, outcomes, draw])

  // layout: side by side in a wide box, stacked in a tall one; re-measure whenever a frame box changes
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    let raf = 0
    const ro = new ResizeObserver(() => {
      const r = root.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        setLayout(r.width / r.height < 1.05 ? 'col' : 'row')
        // the chart's height is a share of the stage's height (moment.css), so the pictures stay wider than tall
        root.style.setProperty('--vsq-h', `${Math.round(r.height)}px`)
      }
      const solo = sceneRef.current?.clips.length === 1 ? els.current[0]?.box?.getBoundingClientRect().height : 0
      if (solo && solo > 2) root.style.setProperty('--vsq-solo', `${Math.round(solo)}px`)
      else root.style.removeProperty('--vsq-solo')
      geom.current.dirty = true
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0
          draw()
        })
    })
    ro.observe(root)
    for (const e of els.current) if (e?.box) ro.observe(e.box)
    return () => {
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [scene, draw])
  useLayoutEffect(() => {
    geom.current.dirty = true
    draw()
  }, [layout, scene, bare, outcomes, draw])

  // Space bar anywhere = press the probe
  useEffect(() => {
    if (!spaceKey) return
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, select, button, a, summary, [contenteditable], [role="button"], [role="slider"]')
    // only while the stage is what the viewer is looking at: on a long page Space must keep scrolling elsewhere
    const onScreen = () => {
      const r = rootRef.current?.getBoundingClientRect()
      if (!r || r.height <= 0) return false
      return Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0) >= r.height * 0.5
    }
    const down = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.altKey || e.ctrlKey || e.metaKey || interactive(e.target)) return
      if (!clock.current.holding && !onScreen()) return
      e.preventDefault()
      if (!e.repeat) begin(false)
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', release)
    }
  }, [spaceKey, begin, release])

  const elRef = (i: number, key: keyof ClipEls) => (node: Element | null) => {
    const e = (els.current[i] ??= {})
    ;(e as Record<string, Element | null>)[key] = node
  }

  const label =
    phase === 'error'
      ? 'Try again'
      : !ready
        ? 'Loading clips'
        : waiting
          ? 'Reading the clips'
          : holding || phase === 'running'
            ? 'Pressing'
            : phase === 'result'
              ? 'Hold to press again'
              : scene && scene.clips.length === 1
                ? 'Hold to press on the vein'
                : 'Hold to press on both veins'
  const samePatient = letter === 'a' || letter === 'b'
  const heroLabel = !scene
    ? 'Ultrasound clips of leg veins, loading'
    : scene.clips.length > 1
      ? `Two real ultrasound clips of leg veins${samePatient ? ' from the same patient' : ''}, side by side`
      : 'A real ultrasound clip of a leg vein'
  const ticks = [100, 50, 10]
  // the bet, from the expert labels of the clips on stage
  const clots = scene ? scene.clips.filter((c) => c.sample.expert.thrombosis === 1).length : 0
  // "above alarm" is said once, on the row with the highest value (every shipped clip is above the threshold)
  const alarmRow = outcomes ? outcomes.reduce((best, o, i) => (o.result.clotProb > outcomes[best].result.clotProb ? i : best), 0) : -1
  const betLine = !scene ? '' : scene.clips.length === 1 ? 'Does this vein hold a clot?' : clots === 1 ? 'One of these veins has a clot.' : 'Which of these veins holds a clot?'

  return (
    <div
      ref={rootRef}
      className={`vsq${className ? ` ${className}` : ''}`}
      style={style}
      data-state={phase}
      data-ready={shownReady ? '1' : undefined}
      data-layout={layout}
      data-mode={usedMode ?? undefined}
      data-bare={bare ? '1' : undefined}
      data-count={scene?.clips.length ?? 2}
    >
      <canvas ref={canvasRef} className="vsq-canvas" role="img" aria-label={heroLabel} />
      <div className="vsq-pair">
        {scene?.clips.map((c, i) => {
          const sq = c.squeeze
          const o = outcomes?.[i]
          const falseAlarm = c.sample.role === 'honest_error'
          const lowNote = LOWEST_NOTE[c.sample.id]
          return (
            <figure className="vsq-clip" key={c.sample.id} data-clip={c.sample.letter.toLowerCase()}>
              <div className="vsq-frame" data-qa="hero" ref={elRef(i, 'box')}>
                <i className="vsq-probe" ref={elRef(i, 'probe')} aria-hidden="true" />
                <svg className="vsq-marks" ref={elRef(i, 'svg')} preserveAspectRatio="none" aria-hidden="true">
                  {sq && <path className="vsq-ghost" ref={elRef(i, 'ghost')} d={c.paths[0]} style={{ opacity: 0 }} />}
                  {sq && <path className="vsq-outline" ref={elRef(i, 'outline')} style={{ opacity: 0 }} />}
                  {sq && c.startLabel && (
                    <g className="vsq-start" ref={elRef(i, 'start')} style={{ opacity: 0, visibility: 'hidden' }}>
                      <text textAnchor="middle">
                        start
                        {lowNote && (
                          <tspan className="vsq-start-note" x="0" dy={c.startLabel.below ? 16 : -16} ref={elRef(i, 'note')} style={{ visibility: 'hidden' }}>
                            {lowNote}
                          </tspan>
                        )}
                      </text>
                    </g>
                  )}
                  {sq && c.arteryAt && (
                    <g className="vsq-artery" ref={elRef(i, 'artery')} style={{ visibility: 'hidden' }}>
                      <text x="-8" y="4.5">
                        artery
                      </text>
                    </g>
                  )}
                  {sq && c.veinLabel && (
                    <g className="vsq-click" ref={elRef(i, 'click')} style={{ visibility: 'hidden' }}>
                      <text textAnchor="middle" y="4.5">
                        vein
                      </text>
                    </g>
                  )}
                  <g className="vsq-expert" data-clot={c.sample.expert.thrombosis} ref={elRef(i, 'expert')} style={{ opacity: 0, visibility: 'hidden' }}>
                    <text>{c.sample.expert.thrombosis === 1 ? 'Expert: clot' : 'Expert: no clot'}</text>
                  </g>
                </svg>
              </div>
              <div className="vsq-under" data-curve={sq ? '1' : undefined}>
              {sq && (
              <div className="vsq-curve" aria-hidden="true">
                <div className="vsq-ticks" ref={elRef(i, 'ticks')} style={{ opacity: 0, visibility: 'hidden' }}>
                  {sq &&
                    ticks.map((v) => (
                      <span key={v} data-qa="tick" style={{ top: `${(1 - v / scene.yMax) * 100}%` }}>
                        {v === 100 ? 'start' : `${v}%`}
                      </span>
                    ))}
                </div>
                <div className="vsq-plot">
                  {sq && (
                    <>
                      <svg className="vsq-grid" ref={elRef(i, 'grid')} viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ opacity: 0, visibility: 'hidden' }}>
                        {ticks.map((v) => (
                          <line key={v} x1="0" x2="1000" y1={(1 - v / scene.yMax) * 100} y2={(1 - v / scene.yMax) * 100} data-start={v === 100 ? '1' : undefined} />
                        ))}
                      </svg>
                      <div className="vsq-reveal" ref={elRef(i, 'reveal')} style={{ clipPath: 'inset(-40% 100% -40% -2%)' }}>
                        <svg className="vsq-area" viewBox="0 0 1000 100" preserveAspectRatio="none">
                          <path className="vsq-area-rest" d={c.areaRest} />
                          <path d={c.areaMain} />
                        </svg>
                        <svg viewBox="0 0 1000 100" preserveAspectRatio="none">
                          <path className="vsq-line vsq-line-rest" d={c.curveRest} />
                          <path className="vsq-line" d={c.curveMain} />
                        </svg>
                      </div>
                      <i className="vsq-head" ref={elRef(i, 'head')} style={{ opacity: 0 }} />
                      {i === 0 && (
                        <span className="vsq-axis" ref={elRef(i, 'axis')} style={{ opacity: 0, visibility: 'hidden' }}>
                          vein area
                        </span>
                      )}
                      <i className="vsq-dot" ref={elRef(i, 'dot')} data-lowest={Math.round(sq.rMin)} style={{ opacity: 0 }}>
                        <i className="vsq-ring" ref={elRef(i, 'ring')} style={{ opacity: 0 }} />
                        <span className="vsq-low" data-side={c.lowSide} ref={elRef(i, 'low')} style={{ opacity: 0, visibility: 'hidden' }}>
                          <b>{`${Math.round(sq.rMin)}%`}</b>
                          {' of start'}
                        </span>
                      </i>
                    </>
                  )}
                </div>
              </div>
              )}
              <figcaption className="vsq-cap">
                {sq && (
                  <span className="vsq-band" ref={elRef(i, 'band')} style={{ opacity: 0, visibility: 'hidden' }}>
                    {sq.band}
                  </span>
                )}{' '}
                <span className="vsq-op" ref={elRef(i, 'op')} style={{ opacity: 0, visibility: 'hidden' }}>
                  <span className="vsq-op-label">{'AI clot chance '}</span>
                  {o && i === 0 && (
                    <span className="vsq-mode" data-tag="mode">
                      {o.result.mode === 'live' ? 'LIVE' : 'REPLAY'}
                    </span>
                  )}
                  <span className="vsq-op-bar">
                    <span className="vsq-op-track">
                      <i ref={elRef(i, 'fill')} />
                    </span>
                    {o && <i className="vsq-op-tick" data-alarm-at={(o.result.tau * 100).toFixed(2)} style={{ left: `${(o.result.tau * 100).toFixed(3)}%` }} />}
                  </span>
                  <span className="vsq-op-value" ref={elRef(i, 'value')} style={{ opacity: 0, visibility: 'hidden' }}>
                    {o ? formatChance(o.result.clotProb) : ''}
                  </span>
                  {o && i === alarmRow && (
                    <span className="vsq-alarm" data-above={o.result.aboveTau ? '1' : '0'} ref={elRef(i, 'alarm')} style={{ opacity: 0, visibility: 'hidden' }}>
                      <i className="vsq-alarm-mark" />
                      {o.result.aboveTau ? 'above alarm' : 'below alarm'}
                    </span>
                  )}
                  {falseAlarm && (
                    <span className="vsq-tag" title={vs.HONESTY_HONEST_ERROR} ref={elRef(i, 'tag')} style={{ opacity: 0, visibility: 'hidden' }}>
                      False alarm
                    </span>
                  )}
                </span>
              </figcaption>
              <p className="vsq-bet" ref={elRef(i, 'bet')}>
                {i === 0 && <span>{betLine}</span>}
                {i === 0 ? ' ' : ''}
                {/* the rule that explains the button: beside the bet in a tall box, under the second picture in a wide one */}
                <span className={i === 0 ? 'vsq-bet-rule' : undefined}>{RULE_LINE}</span>
              </p>
              </div>
            </figure>
          )
        })}
      </div>
      {phase === 'error' && (
        <p className="vsq-note" role="alert">
          The clips could not be loaded.
        </p>
      )}
      <button
        ref={holdRef}
        type="button"
        className="vsq-hold"
        data-hold=""
        data-qa="primary"
        aria-pressed={holding}
        aria-busy={!ready && phase !== 'error'}
        aria-disabled={pinned || (!ready && phase !== 'error') || undefined}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture?.(e.pointerId)
          begin(false)
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return
          e.preventDefault()
          if (!e.repeat) begin(false)
        }}
        onKeyUp={(e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return
          e.preventDefault()
          release()
        }}
        onBlur={release}
        onClick={(e) => {
          // a click with no pointer and no key behind it (a script, a screen reader): play it through
          if (e.detail === 0 && performance.now() - clock.current.upAt > 400) begin(true)
        }}
      >
        <span className="vsq-hold-fill" ref={holdFillRef} aria-hidden="true" />
        {!ready && phase !== 'error' && <span className="vsq-hold-load" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />}
        {/* the control's own picture of what it does: a probe bar pressing a round vein flat, driven by the same clock */}
        <span className="vsq-hold-icon" aria-hidden="true">
          <i />
        </span>
        <span className="vsq-hold-label">
          {`${label} `}
          {ready && (phase === 'idle' || phase === 'result') && !holding && (
            <kbd className="vsq-key" aria-hidden="true">
              Space
            </kbd>
          )}
        </span>
      </button>
      <p className="vsq-sr" aria-live="polite">
        {phase === 'result' && outcomes && scene
          ? scene.clips
              .map((c, i) => {
                const r = outcomes[i].result
                const low = c.squeeze ? `expert label ${c.sample.expert.thrombosis === 1 ? 'clot' : 'no clot'}; the vein ${c.squeeze.band}, lowest area ${Math.round(c.squeeze.rMin)}% of start${LOWEST_NOTE[c.sample.id] ? ` (${LOWEST_NOTE[c.sample.id]})` : ''}` : 'no outline'
                return `${c.sample.label}: ${low}; AI clot chance ${formatChance(r.clotProb)}, ${r.aboveTau ? 'above' : 'below'} the alarm threshold.${c.sample.role === 'honest_error' ? ` ${vs.HONESTY_HONEST_ERROR}` : ''}`
              })
              .join(' ')
          : ''}
      </p>
    </div>
  )
})

export default VeinSqueezeMoment

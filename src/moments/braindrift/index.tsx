// BrainDrift moment: a real brain, cut open, flown and re-read by Model B. Stage only (no title, number or action card).
// See README.md in this folder for props, tokens and beats.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import * as bd from '../../engine/braindrift'
import type { BrainDriftAct, FlightResult, MetaFrame } from '../../engine/braindrift'
import { BrainScene, loadGlb, type MeshData, type Rgb, type SceneTokens } from './scene'
import { growthFlags } from './growth'
import { BEATS, END, dragFrame, frameAt, inOut, type Frame, type Geo } from './timeline'
import './braindrift.css'

export { BEATS, END, frameAt } from './timeline'
export type MomentState = 'idle' | 'running' | 'result' | 'error'

export interface BrainDriftMomentProps {
  /** A flight frame id: flight-f025, f050, f075 or f100 (default flight-f100, the published numbers). */
  sampleId?: string
  /** auto = the real model on a laptop, stored outputs on a phone or after a failure. */
  mode?: 'auto' | 'live' | 'replay'
  /** Pins the stage: idle, or the settled result with no animation. */
  state?: 'idle' | 'result'
  /** Pins the timeline at this many ms (see BEATS). */
  t?: number
  /** Fires when the measured change lands on the specimen (start of the compare beat). */
  onResult?: (result: FlightResult, act: BrainDriftAct) => void
  onState?: (state: MomentState) => void
  /** Numbers written on the specimen (default true). Set false when the page shows them itself. */
  labels?: boolean
  /** The SIMULATION and LIVE / REPLAY tags (default true). Set false only if the page shows them next to the stage. */
  tags?: boolean
  /** The flight slider (default true). */
  controls?: boolean
  className?: string
  style?: CSSProperties
}

export interface BrainDriftMomentHandle {
  /** Plays the whole moment from before flight to the sample's frame. */
  run: () => void
  reset: () => void
}

const NI = 176
const NJ = 176
const NK = 208
const REST_K = 100
/** The entrance on a natural open (not on a pinned state, not with reduced motion), ms. */
const INTRO_MS = 2600
const DEFAULT_TARGET = 4

interface Store {
  frames: MetaFrame[]
  vols: (Uint8Array | null)[]
  vents: Map<number, MeshData>
  loading: Map<number, Promise<void>>
  preSeg: Uint8Array
  geo: Geo
  lines: Map<number, { pre: number[]; post: number[] }>
}

interface Clock {
  t: number
  startT: number
  last: number
  running: boolean
  target: number
  runId: number
  live: boolean
  result: FlightResult | null
  liveSeg: Uint8Array | null
  frontier: number
  fired: boolean
}

const fmtPct = (v: number | null) => (v === null ? 'n/a' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} %`)
const fmtPut = (v: number) => `+${Math.round(v * 100 + 1e-6) / 100} %`
const fmtMm = (v: number | null) => (v === null ? 'n/a' : `${Math.abs(v).toFixed(1)} mm`)
const fmtPutMm = (v: number) => `${Math.round(v * 100 + 1e-6) / 100} mm`
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Inverse of the fly easing, so a release continues from where the thumb is instead of jumping. */
function flyTimeFor(pos: number, target: number) {
  const y = clamp01(pos / target)
  const x = y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2
  return BEATS.fly[0] + x * (BEATS.fly[1] - BEATS.fly[0])
}

/** Upper outline of the model's brain map on one coronal slice, as [x, y] pairs in mesh mm. */
function topLine(seg: Uint8Array, k: number): number[] {
  const tops: number[] = []
  let best = NJ
  for (let i = 0; i < NI; i++) {
    let top = -1
    for (let j = 0; j < NJ; j++) {
      if (seg[(i * NJ + j) * NK + k] > 0) {
        top = j
        break
      }
    }
    tops.push(top)
    if (top >= 0 && top < best) best = top
  }
  // the outline skips over the folds: each column takes the highest surface within 6 mm of it
  const hull: number[] = []
  for (let i = 0; i < NI; i++) {
    let hi = tops[i]
    for (let d = -6; d <= 6 && hi >= 0; d++) {
      const v = tops[i + d]
      if (v !== undefined && v >= 0 && v < hi) hi = v
    }
    hull.push(hi)
  }
  const pts: number[] = []
  for (let i = 0; i < NI; i++) {
    if (hull[i] < 0 || hull[i] > best + 30) continue
    let sum = 0
    let n = 0
    for (let d = -5; d <= 5; d++) {
      const v = hull[i + d]
      if (v !== undefined && v >= 0) {
        sum += v
        n++
      }
    }
    pts.push(i - 88, 88 - sum / n + 0.5)
  }
  return pts
}

function brainRange(seg: Uint8Array): [number, number] {
  const has = new Uint8Array(NK)
  for (let p = 0; p < NI * NJ; p++) {
    const b = p * NK
    for (let k = 0; k < NK; k++) if (seg[b + k]) has[k] = 1
  }
  let k0 = 0
  let k1 = NK - 1
  while (k0 < NK - 1 && !has[k0]) k0++
  while (k1 > 0 && !has[k1]) k1--
  return [k0, k1]
}

function readTokens(probe: HTMLElement): SceneTokens {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  const rgb = (name: string): Rgb => {
    probe.style.color = `var(${name})`
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#808080'
    ctx.fillStyle = getComputedStyle(probe).color
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }
  return {
    specimen: rgb('--m-specimen'),
    glass: rgb('--m-glass'),
    fluid: rgb('--m-fluid'),
    mark: rgb('--m-mark'),
    mark2: rgb('--m-mark-2'),
    scan: rgb('--m-scan'),
    stage: rgb('--m-stage'),
    glow: rgb('--m-glow'),
    classes: [rgb('--m-class-white'), rgb('--m-class-cortex'), rgb('--m-class-deep'), rgb('--m-class-hind')],
  }
}

export const BrainDriftMoment = forwardRef<BrainDriftMomentHandle, BrainDriftMomentProps>(function BrainDriftMoment(props, ref) {
  const { sampleId, mode = 'auto', state: pinState, t: pinT, labels = true, tags = true, controls = true, className, style } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const flightRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const ventLabelRef = useRef<HTMLDivElement>(null)
  const idleLabelRef = useRef<HTMLDivElement>(null)
  const riseLabelRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const statusBoxRef = useRef<HTMLDivElement>(null)
  const putRef = useRef<HTMLSpanElement>(null)
  const cb = useRef({ onResult: props.onResult, onState: props.onState })
  cb.current = { onResult: props.onResult, onState: props.onState }
  const opt = useRef({ labels, mode, sampleId })
  opt.current = { labels, mode, sampleId }

  const [phase, setPhaseState] = useState<MomentState>('idle')
  const phaseRef = useRef<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<'' | 'live' | 'replay'>('')
  const [shown, setShown] = useState<{ r: FlightResult; a: BrainDriftAct } | null>(null)
  const [error, setError] = useState('')
  const [noGl, setNoGl] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // true while the stage rests at before flight: "Before flight" then has nothing to do and is switched off
  const [atStart, setAtStart] = useState(true)
  const api = useRef<{ enter: () => void; run: () => void; reset: () => void; runTo: (idx: number) => void; drag: (pos: number) => void; release: () => void; touch: () => void; step: (d: number) => void; retoken: () => void; relabel: () => void } | null>(null)

  useImperativeHandle(ref, () => ({ run: () => api.current?.run(), reset: () => api.current?.reset() }), [])

  useEffect(() => {
    const root = rootRef.current!
    const canvas = canvasRef.current!
    let dead = false
    let raf = 0
    let scene: BrainScene | null = null
    let store: Store | null = null
    let dragPos: number | null = null
    let warm: Promise<void> | null = null
    let liveBroken = false
    let overlayKey = ''
    let refKey = -1
    let layoutV = 0
    let keyTimer = 0
    let atStartNow = true
    let idleKey = ''
    let idleEl: HTMLElement | null = null
    let posKey = ''
    let lastDraw = 0
    // the entrance: on a natural open the camera glides in from further out and the brain opens from whole to cut
    let introAt = 0
    let onScreen = true
    // the pre-flight read (the warm-up): shown on the stage when a first release has to wait for it
    let warmSeg: Uint8Array | null = null
    let warmFrontier = -1
    let warmDone = false
    let warmK = 0
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = matchMedia('(pointer: coarse)').matches
    const clock: Clock = { t: 0, startT: 0, last: 0, running: false, target: DEFAULT_TARGET, runId: 0, live: false, result: null, liveSeg: null, frontier: -1, fired: false }

    const setPhase = (p: MomentState) => {
      if (phaseRef.current === p) return
      phaseRef.current = p
      setPhaseState(p)
      cb.current.onState?.(p)
    }
    const fail = (e: unknown) => {
      if (dead) return
      console.error('[braindrift moment]', e)
      clock.running = false
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
    const wantLive = () => {
      const m = opt.current.mode
      if (m === 'replay' || liveBroken) return false
      if (m === 'live') return true
      return !(coarse || window.innerWidth < 700)
    }
    const targetOf = (id: string | undefined) => {
      const i = store ? store.frames.findIndex((f) => f.id === id) : -1
      return i > 0 ? i : DEFAULT_TARGET
    }
    const frameLoaded = (idx: number) => !!store && !!store.vols[idx] && !!scene && scene.hasVent(idx)

    const ensureFrame = (idx: number): Promise<void> => {
      const st = store!
      let p = st.loading.get(idx)
      if (!p) {
        const f = st.frames[idx]
        p = Promise.all([bd.fetchVolume(f.volume), loadGlb(bd.assetUrl(f.ventMesh))]).then(([vol, mesh]) => {
          if (dead) return
          st.vols[idx] = vol
          st.vents.set(idx, mesh)
          scene?.setVent(idx, mesh)
          invalidate()
        })
        st.loading.set(idx, p)
        p.catch(() => st.loading.delete(idx))
      }
      return p
    }

    /** What the pair of readings adds to the picture: where fluid is now and was not before, and the two top outlines. */
    const prepareResult = (idx: number, r: FlightResult) => {
      const st = store!
      const m = st.vents.get(idx)
      // light = fluid here now, not before: each vertex is judged by its own voxel in the pre-flight map (growth.ts)
      if (m && scene) scene.setGrowth(idx, growthFlags(m, r.pre.seg))
      st.lines.set(idx, { pre: topLine(r.pre.seg, st.geo.restK), post: topLine(r.post.seg, st.geo.restK) })
      overlayKey = ''
    }

    const startWarm = () => {
      if (!warm && store) {
        warm = bd
          .load()
          .then(() =>
            bd.analyzeBrain(store!.frames[0].id, {
              onProgress: (p) => {
                if (dead) return
                warmSeg = p.seg
                for (const k of p.slices) if (k > warmFrontier) warmFrontier = k
                if (clock.running && clock.live && !clock.result) {
                  scene?.dirtyFace()
                  invalidate()
                }
              },
            }),
          )
          .then(() => {
            warmDone = true
          })
        warm.catch(() => {
          liveBroken = true
        })
      }
      return warm!
    }

    const analyzeLive = async (idx: number, runId: number): Promise<FlightResult> => {
      await startWarm()
      const r = await bd.analyze(store!.frames[idx].id, {
        onProgress: (p) => {
          if (dead || clock.runId !== runId) return
          clock.liveSeg = p.seg
          for (const k of p.slices) if (k > clock.frontier) clock.frontier = k
          scene?.dirtyFace()
          invalidate()
        },
      })
      if (r.kind !== 'flight') throw new Error('not a flight frame')
      return r
    }

    const fire = () => {
      const r = clock.result
      if (!r || clock.fired) return
      clock.fired = true
      const a = bd.act(r)
      setShown({ r, a })
      cb.current.onResult?.(r, a)
    }

    const gate = () => {
      let g = Infinity
      if (!frameLoaded(clock.target) || (reduced && !clock.result)) g = clock.startT
      if (!clock.result) {
        const geo = store!.geo
        const frac = clock.live ? clamp01((clock.frontier - geo.k0) / (geo.k1 - geo.k0)) : 0
        g = Math.min(g, BEATS.read[0] + frac * (BEATS.read[1] - BEATS.read[0]))
      }
      return g
    }

    const currentFrame = (): Frame => {
      const geo = store!.geo
      if (dragPos !== null) return dragFrame(dragPos, geo)
      return frameAt(clock.t, clock.target, geo)
    }

    /** Where a ventricle label sits and where its leader ends: the edge of the ventricles on the label's side. */
    const placeVent = (el: HTMLElement | null, lead: SVGPathElement, meshIdx: number, small: boolean, dot?: SVGCircleElement | null) => {
      const st = store!
      const sc = scene!
      const W = root.clientWidth
      const H = root.clientHeight
      const wide = W / H > 1.25
      const z = st.geo.restK - 104
      const m = st.vents.get(meshIdx)
      let ax = W / 2
      let ay = H / 2
      if (m) {
        // skipping stray specks (2nd percentile, not the extreme)
        const cand: [number, number][] = []
        for (let v = 0; v < m.position.length; v += 3 * 5) {
          if (m.position[v + 2] > z - 4) continue
          cand.push(sc.project(m.position[v], m.position[v + 1], m.position[v + 2]))
        }
        cand.sort((p, q) => p[0] - q[0])
        if (wide) {
          const pick = cand[Math.floor(cand.length * 0.02)]
          if (pick) [ax, ay] = pick
        } else if (cand.length) {
          // upright stage: the leader ends in the body of the large side chamber on the left, not on a tip
          const n = Math.max(1, Math.floor(cand.length * 0.25))
          let sx = 0
          let sy = 0
          for (let q = 0; q < n; q++) {
            sx += cand[q][0]
            sy += cand[q][1]
          }
          sx /= n
          sy /= n
          // the surface point nearest that middle, so the leader always ends on the chamber itself
          let best = Infinity
          for (let q = 0; q < n; q++) {
            const dd = (cand[q][0] - sx) ** 2 + (cand[q][1] - sy) ** 2
            if (dd < best) {
              best = dd
              ax = cand[q][0]
              ay = cand[q][1]
            }
          }
        }
      }
      const vw = el ? el.offsetWidth : 170
      const vh = el ? el.offsetHeight : 60
      let vx: number
      let vy: number
      let d: string
      if (wide) {
        vx = Math.max(16, sc.rect.x0 - vw - 18)
        vy = small ? ay - vh / 2 + 22 : Math.min(H - vh - 150, Math.max(16, ay - vh / 2 + 34))
        d = `M${(ax + 3).toFixed(1)} ${ay.toFixed(1)}L${(vx + vw + 10).toFixed(1)} ${(vy + (small ? vh / 2 : 18)).toFixed(1)}`
      } else {
        vx = Math.max(16, Math.min(W - vw - 16, ax - 34))
        vy = Math.min(H - vh - 134, Math.max(ay + 44, sc.rect.y1 + 8))
        d = `M${ax.toFixed(1)} ${ay.toFixed(1)}L${(vx + 18).toFixed(1)} ${(vy - 7).toFixed(1)}`
      }
      lead.setAttribute('d', d)
      if (dot) {
        dot.setAttribute('cx', ax.toFixed(1))
        dot.setAttribute('cy', ay.toFixed(1))
      }
      if (el) el.style.transform = `translate(${vx.toFixed(0)}px, ${vy.toFixed(0)}px)`
      return { vx, vy, vw, vh, wide, W }
    }

    const overlay = (f: Frame) => {
      const svg = svgRef.current
      const st = store
      if (!svg || !st || !scene) return
      // before the model has looked, the grey shape carries its name
      const il = idleLabelRef.current
      const idleLead = svg.querySelector<SVGPathElement>('[data-lead="idle"]')!
      const idleDot = svg.querySelector<SVGCircleElement>('[data-dot="idle"]')!
      const idleOn = !!il && (f.beat === 'idle' || f.beat === 'fly')
      const box = statusBoxRef.current
      if (il && (idleKey !== String(layoutV) || idleEl !== il)) {
        idleKey = String(layoutV)
        idleEl = il
        const at = placeVent(il, idleLead, 0, true, idleDot)
        // what the model is doing is said where the name of the fluid spaces stands, one line under it
        if (box) {
          // an upright stage centres the line across its width (it is too long to start under the label there)
          box.style.left = at.wide ? 'auto' : '12px'
          // on a wide stage it stands a little further out: the brain swings towards it while the model reads
          box.style.right = at.wide ? `${(at.W - at.vx - at.vw + 36).toFixed(0)}px` : '12px'
          box.toggleAttribute('data-narrow', !at.wide)
          box.style.top = `${(at.vy + at.vh + 4).toFixed(0)}px`
          box.dataset.at = '1'
        }
      } else if (!il && box && box.dataset.at && !clock.result) {
        box.style.left = box.style.right = box.style.top = ''
        delete box.dataset.at
        box.removeAttribute('data-narrow')
        idleKey = ''
      }
      if (il) il.style.opacity = idleOn ? '1' : '0'
      idleLead.style.opacity = idleDot.style.opacity = idleOn ? '1' : '0'
      const lines = clock.result ? st.lines.get(clock.target) : undefined
      const on = !!lines && f.marks > 0 && dragPos === null
      const vl = ventLabelRef.current
      const rl = riseLabelRef.current
      const preEl = svg.querySelector<SVGPathElement>('[data-line="pre"]')!
      if (!on) {
        // while the brain flies, the before-flight outline stays put so the rise can be seen against it
        const ref = (f.beat === 'idle' || f.beat === 'fly') && f.frameIdx > 0
        if (ref && refKey !== layoutV) {
          refKey = layoutV
          overlayKey = ''
          const pts = topLine(st.preSeg, st.geo.restK)
          let d = ''
          for (let q = 0; q < pts.length; q += 2) {
            const [x, y] = scene.project(pts[q], pts[q + 1], st.geo.restK - 104)
            d += `${q ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
          }
          preEl.setAttribute('d', d)
        }
        svg.style.opacity = '1'
        preEl.style.opacity = ref ? '1' : '0'
        svg.dataset.only = 'pre'
        svg.style.setProperty('--a', '0')
        if (vl) vl.style.opacity = '0'
        if (rl) rl.style.opacity = '0'
        box?.style.setProperty('--gone', '0')
        return
      }
      svg.style.opacity = '1'
      preEl.style.opacity = '1'
      delete svg.dataset.only
      refKey = -1
      const key = `${layoutV}|${clock.target}|${clock.runId}`
      if (key !== overlayKey) {
        overlayKey = key
        const z = st.geo.restK - 104
        const path = (pts: number[]) => {
          let d = ''
          for (let q = 0; q < pts.length; q += 2) {
            const [x, y] = scene!.project(pts[q], pts[q + 1], z)
            d += `${q ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
          }
          return d
        }
        svg.querySelector('[data-line="pre"]')!.setAttribute('d', path(lines!.pre))
        svg.querySelector('[data-line="post"]')!.setAttribute('d', path(lines!.post))
        svg.querySelector('[data-line="glow"]')!.setAttribute('d', path(lines!.post))
        // the rise itself: the sliver between the model's before and after outlines, filled with light
        const back: number[] = []
        for (let q = lines!.post.length - 2; q >= 0; q -= 2) back.push(lines!.post[q], lines!.post[q + 1])
        svg.querySelector('[data-band]')!.setAttribute('d', `${path(lines!.pre)}${path(back).replace('M', 'L')}Z`)
        const W = root.clientWidth
        const H = root.clientHeight
        const wide = W / H > 1.25
        // rise label: hangs off the highest point of the after-flight outline
        let hi = 0
        for (let q = 0; q < lines!.post.length; q += 2) if (lines!.post[q + 1] > lines!.post[hi + 1]) hi = q
        const [rx, ry] = scene.project(lines!.post[hi], lines!.post[hi + 1], z)
        const rlx = Math.min(W - (rl ? rl.offsetWidth : 190) - 14, rx + (wide ? 56 : 24))
        // the whole label stays clear above the brain's highest point
        const rly = Math.max(12, Math.min(ry - 70, scene.rect.y0 - (rl ? rl.offsetHeight : 60) - 6))
        svg.querySelector('[data-lead="rise"]')!.setAttribute('d', `M${rx.toFixed(1)} ${(ry - 5).toFixed(1)}L${(rlx - 8).toFixed(1)} ${(rly + 14).toFixed(1)}`)
        if (rl) rl.style.transform = `translate(${rlx.toFixed(0)}px, ${rly.toFixed(0)}px)`
        // ventricle label: leader to the ventricle point nearest the label's side
        placeVent(vl, svg.querySelector<SVGPathElement>('[data-lead="vent"]')!, clock.target, false)
      }
      const a = clamp01(f.marks / 0.6)
      const b = clamp01((f.marks - 0.3) / 0.7)
      svg.style.setProperty('--a', String(1 - a))
      svg.style.setProperty('--b', String(1 - b))
      if (vl) vl.style.opacity = String(b)
      if (rl) rl.style.opacity = String(b)
      // LIVE / REPLAY hands over from the reading line to the measured number as that number appears
      box?.style.setProperty('--gone', vl ? String(b) : '0')
    }

    const draw = () => {
      const st = store
      if (!st || !scene) return
      const f = currentFrame()
      let idx = f.frameIdx
      while (idx > 0 && !frameLoaded(idx)) idx--
      // a first release can arrive before the model has read the pre-flight scan: that read is then what the stage shows
      const preRead = f.beat === 'read' && clock.live && !clock.result && clock.frontier < st.geo.k0 && !warmDone && !!warmSeg && warmFrontier >= st.geo.k0
      let cut = f.cutK
      // the two scans share slice numbers: repaint when the stage changes from one to the other
      if (preRead !== root.hasAttribute('data-pre-read')) {
        root.toggleAttribute('data-pre-read', preRead)
        scene.dirtyFace()
      }
      if (preRead) {
        idx = 0
        cut = Math.max(st.geo.k0, Math.min(warmFrontier, warmK))
      }
      let intro = 0
      if (introAt) {
        if (dragPos !== null || clock.running) intro = 0
        else intro = 1 - clamp01((performance.now() - introAt) / INTRO_MS)
        if (intro <= 0) {
          introAt = 0
          root.removeAttribute('data-intro')
        }
      }
      // the cut opens from the back of the head to its resting slice in the middle of the entrance
      if (intro > 0 && f.beat === 'idle') cut = st.geo.k0 + (cut - st.geo.k0) * inOut(clamp01((1 - intro) * 1.5 - 0.3))
      const ie = 1 - inOut(1 - intro)
      const k = Math.max(0, Math.min(NK - 1, Math.round(cut)))
      const seg = preRead ? warmSeg : f.measured > 0 ? (clock.result?.post.seg ?? clock.liveSeg) : null
      scene.paintFace({ k, vol: st.vols[idx]!, seg, preSeg: preRead ? null : st.preSeg, map: f.map, measured: f.measured, growth: f.growth })
      // the camera moves only while the model reads: it swings to the side as the brain seals, travels with the
      // reading plane, and is back at its rest pose before any line or label is drawn on the specimen
      const tt = clock.t
      const moving = dragPos === null && tt > BEATS.seal[0] && tt < END
      const sealIn = inOut(clamp01((tt - BEATS.seal[0]) / (BEATS.seal[1] - BEATS.seal[0])))
      const homing = inOut(clamp01((tt - BEATS.compare[0]) / 650))
      const readX = inOut(clamp01((tt - BEATS.read[0]) / (BEATS.read[1] - BEATS.read[0])))
      const away = moving ? sealIn * (1 - homing) : 0
      scene.draw({
        rise: idx / 4,
        ventIdx: idx,
        cutK: cut,
        measured: f.measured,
        growth: f.growth,
        time: reduced ? 0 : performance.now() / 1000,
        scan: Math.max(away, 0.55 * Math.sin(Math.PI * clamp01((1 - intro) * 1.5 - 0.3)) * (intro > 0 ? 1 : 0)),
        daz: away * (0.26 - 0.5 * readX) + ie * 0.62,
        del: away * -0.1 + ie * 0.16,
        dolly: away * (0.05 + 0.05 * Math.sin(Math.PI * readX)) - ie * 0.32,
      })
      overlay(f)
      // the slider follows the clock; under the user's hand it is left alone
      const input = inputRef.current
      if (input && dragPos === null) {
        const v = String(Math.round(f.pos * 100))
        if (input.value !== v) input.value = v
      }
      const posText = String(f.pos)
      if (posKey !== posText) {
        posKey = posText
        flightRef.current?.style.setProperty('--pos', posText)
      }
      const tText = String(Math.round(clock.t))
      if (root.dataset.beat !== f.beat) root.dataset.beat = f.beat
      if (root.dataset.frame !== String(idx)) root.dataset.frame = String(idx)
      if (root.dataset.t !== tText) root.dataset.t = tText
      const resting = f.beat === 'idle' && f.pos === 0
      if (resting !== atStartNow) {
        atStartNow = resting
        setAtStart(resting)
      }
      if (input) {
        const fr = st.frames[Math.round(f.pos * 4)]
        const vt = fr.f === 0 ? 'Before flight' : fr.f === 1 ? 'After flight, simulated' : `Flight ${Math.round(fr.f * 100)} percent, ${bd.HONESTY.middleFrames}`
        if (input.getAttribute('aria-valuetext') !== vt) input.setAttribute('aria-valuetext', vt)
      }
      const put = putRef.current
      if (put) {
        const shownIdx = Math.round(f.pos * 4)
        // in flight the thumb carries what the simulation put in at that frame (at rest the cue line speaks instead)
        const text = (f.beat === 'idle' || f.beat === 'fly') && shownIdx > 0 ? `we put in ${fmtPut(st.frames[shownIdx].injectedVentricleChangePct)}` : ''
        if (put.textContent !== text) put.textContent = text
      }
      const status = statusRef.current
      if (status) {
        let text = ''
        if (f.beat === 'read') {
          const n = st.geo.k1 - st.geo.k0 + 1
          const at = `slice ${Math.max(1, Math.min(n, k - st.geo.k0 + 1))} of ${n}`
          if (preRead) text = `pre-flight scan first: ${at}`
          else if (clock.live && !clock.result && clock.frontier < st.geo.k0 && !warmDone) text = 'loading the model'
          else text = `the AI is mapping ${at}`
        } else if (clock.running && !frameLoaded(clock.target)) text = 'loading the scan'
        if (status.textContent !== text) status.textContent = text
      }
    }

    const tick = (now: number) => {
      raf = 0
      if (dead) return
      if (clock.running) {
        const dt = Math.min(64, Math.max(0, now - clock.last))
        clock.last = now
        clock.t = Math.min(clock.t + dt, gate())
        // the pre-flight read's plane chases the last slice the model finished, at about the pace of the main read
        if (warmFrontier > warmK) warmK = Math.min(warmFrontier, warmK + dt * 0.09)
        if (clock.result && (reduced || clock.t >= END)) clock.t = END
        if (clock.t >= BEATS.compare[0]) fire()
        if (clock.t >= END) {
          clock.running = false
          setPhase('result')
        }
      }
      // at rest the stage keeps breathing (the light drifts, the fluid pulses) at about 30 frames a second, and only
      // while it is on screen; a run or a drag draws every frame
      const ambient = !reduced && onScreen && !document.hidden
      const lazy = ambient && !clock.running && dragPos === null && !introAt
      if (!lazy || now - lastDraw > 30) {
        lastDraw = now
        draw()
      }
      if (clock.running || ambient) raf = requestAnimationFrame(tick)
    }
    function invalidate() {
      lastDraw = 0
      if (!raf && !dead) raf = requestAnimationFrame(tick)
    }

    const start = (targetIdx: number, fromT: number) => {
      if (!store) return
      window.clearTimeout(keyTimer)
      const id = ++clock.runId
      Object.assign(clock, { target: targetIdx, t: fromT, startT: fromT, result: null, fired: false, frontier: store.geo.k0 - 1, liveSeg: null, live: wantLive(), running: true, last: performance.now() })
      dragPos = null
      overlayKey = ''
      warmK = store.geo.k0
      setShown(null)
      setError('')
      setLive(clock.live ? 'live' : 'replay')
      setPhase('running')
      ensureFrame(targetIdx).catch(fail)
      const frameId = store.frames[targetIdx].id
      const done = (r: FlightResult, wasLive: boolean) => {
        if (dead || clock.runId !== id) return
        ensureFrame(targetIdx)
          .then(() => {
            if (dead || clock.runId !== id) return
            prepareResult(targetIdx, r)
            clock.result = r
            clock.live = wasLive
            setLive(wasLive ? 'live' : 'replay')
            invalidate()
          })
          .catch(fail)
      }
      const viaReplay = () =>
        bd.replay(frameId).then((r) => {
          if (r.kind === 'flight') done(r, false)
        })
      if (clock.live) {
        analyzeLive(targetIdx, id)
          .then((r) => done(r, true))
          .catch((e) => {
            console.warn('[braindrift moment] live run failed, replaying stored outputs', e)
            liveBroken = true
            if (clock.runId !== id) return
            clock.live = false
            setLive('replay')
            return viaReplay()
          })
          .catch(fail)
      } else viaReplay().catch(fail)
      invalidate()
    }

    const reset = () => {
      window.clearTimeout(keyTimer)
      clock.runId++
      Object.assign(clock, { t: 0, startT: 0, running: false, result: null, fired: false, liveSeg: null })
      dragPos = null
      setShown(null)
      setLive('')
      setError('')
      setPhase('idle')
      // a reset during the entrance ends it: the stage stands at rest at once
      if (introAt) {
        introAt = 0
        root.removeAttribute('data-intro')
      }
      invalidate()
    }

    const touch = () => {
      if (!store) return
      // the other stored frames arrive on first touch: the target first, then the in-between illustrations.
      // A phone fetches only the target here; an in-between frame is fetched when the thumb reaches it.
      const order = (coarse ? [clock.target, 4] : [clock.target, 4, 2, 1, 3]).filter((v, i, a) => v > 0 && a.indexOf(v) === i)
      order.reduce((p, idx) => p.then(() => ensureFrame(idx)).catch(() => undefined), Promise.resolve())
      if (wantLive()) startWarm().catch(() => undefined)
    }

    api.current = {
      // Enter or Space on the slider: let go of a pending step, measure again at a result, or play the whole moment
      enter: () => {
        if (!store) return
        if (dragPos !== null) {
          window.clearTimeout(keyTimer)
          api.current!.release()
        } else if (!clock.running && clock.result && clock.t >= END) start(clock.target, 0)
        else if (!clock.running && clock.t === 0) start(targetOf(opt.current.sampleId), 0)
      },
      run: () => start(targetOf(opt.current.sampleId), 0),
      reset,
      runTo: (idx) => (idx <= 0 ? reset() : start(idx, 0)),
      touch,
      drag: (pos) => {
        if (!store) return
        if (clock.running || clock.result || clock.t > 0) {
          clock.runId++
          Object.assign(clock, { t: 0, startT: 0, running: false, result: null, fired: false, liveSeg: null })
          setShown(null)
          setLive('')
          setPhase('idle')
        }
        dragPos = clamp01(pos)
        const at = Math.round(dragPos * 4)
        if (at > 0) ensureFrame(at).catch(() => undefined)
        invalidate()
      },
      release: () => {
        if (dragPos === null) return
        const idx = Math.round(dragPos * 4)
        const from = dragPos
        if (idx === 0) reset()
        else start(idx, reduced ? BEATS.fly[1] : flyTimeFor(from, idx / 4))
      },
      step: (d) => {
        if (!store) return
        const cur = dragPos !== null ? Math.round(dragPos * 4) : clock.t > 0 ? clock.target : 0
        const next = Math.max(0, Math.min(4, cur + d))
        touch()
        api.current!.drag(next / 4)
        if (inputRef.current) inputRef.current.value = String(next * 25)
        window.clearTimeout(keyTimer)
        keyTimer = window.setTimeout(() => api.current?.release(), 550)
      },
      relabel: () => {
        overlayKey = ''
        invalidate()
      },
      retoken: () => {
        if (scene && probeRef.current) {
          scene.setTokens(readTokens(probeRef.current))
          invalidate()
        }
      },
    }

    const layout = () => {
      if (!scene) return
      const w = root.clientWidth
      const h = root.clientHeight
      if (w < 2 || h < 2) return
      const wide = w / h > 1.25
      const lab = opt.current.labels
      const ctl = !!flightRef.current
      const pad = wide
        ? { top: Math.max(lab ? (h < 500 ? 70 : 92) : 28, h * 0.08), bottom: ctl ? 124 : Math.max(28, h * 0.08), left: lab ? Math.max(290, w * 0.14) : w * 0.06, right: w * 0.06 }
        : { top: lab ? 110 : 28, bottom: (ctl ? 104 : 24) + (lab ? 92 : 0), left: -20, right: -20 }
      // an upright stage (a phone) lets the glass edge run off the sides and, with labels on, puts the brain at the top of its band
      scene.resize(w, h, Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2), pad, !wide && lab)
      // the light behind the brain, the orbit rings and the floor follow where the brain stands
      const br = scene.rect
      root.style.setProperty('--bx', `${((br.x0 + br.x1) / 2).toFixed(0)}px`)
      root.style.setProperty('--by', `${((br.y0 + br.y1) / 2).toFixed(0)}px`)
      root.style.setProperty('--bw', `${(br.x1 - br.x0).toFixed(0)}px`)
      root.style.setProperty('--bh', `${(br.y1 - br.y0).toFixed(0)}px`)
      layoutV++
      overlayKey = ''
      draw()
    }

    const init = async () => {
      try {
        scene = new BrainScene(canvas)
      } catch (e) {
        console.warn('[braindrift moment] no WebGL', e)
        setNoGl(true)
        setReady(true)
        return
      }
      scene.setTokens(readTokens(probeRef.current!))
      const meta = await bd.fetchMeta()
      const frames = meta.flight.frames
      const [shell, vent0, vol0, seg0] = await Promise.all([
        loadGlb(bd.assetUrl(meta.flight.brainMesh)),
        loadGlb(bd.assetUrl(frames[0].ventMesh)),
        bd.fetchVolume(frames[0].volume),
        bd.fetchVolume(frames[0].seg),
      ])
      if (dead) return
      const [k0, k1] = brainRange(seg0)
      store = {
        frames,
        vols: [vol0, null, null, null, null],
        vents: new Map([[0, vent0]]),
        loading: new Map([[0, Promise.resolve()]]),
        preSeg: seg0,
        geo: { k0, k1, restK: REST_K },
        lines: new Map(),
      }
      scene.setShell(shell)
      scene.setVent(0, vent0)
      clock.target = targetOf(opt.current.sampleId)
      // a pinned frame needs its data before the stage counts as ready
      const pinned = pinT !== undefined ? pinT : pinState === 'result' ? END : null
      if (pinned !== null && pinned > 0) {
        const idx = clock.target
        await ensureFrame(idx)
        let r: FlightResult | null = null
        let wasLive = false
        if (opt.current.mode === 'live') {
          try {
            r = await analyzeLive(idx, clock.runId)
            wasLive = true
          } catch (e) {
            console.warn('[braindrift moment] live run failed, replaying stored outputs', e)
          }
        }
        if (!r) {
          const rr = await bd.replay(frames[idx].id)
          if (rr.kind === 'flight') r = rr
        }
        if (dead || !r) return
        prepareResult(idx, r)
        Object.assign(clock, { result: r, t: pinned, startT: pinned, live: wasLive })
        setLive(wasLive ? 'live' : 'replay')
        if (pinned >= BEATS.compare[0]) fire()
        setPhase(pinned >= END ? 'result' : 'running')
      }
      layout()
      // only on a natural open: a pinned stage (state or t) shows its frame at once
      if (pinState === undefined && pinT === undefined && !reduced) {
        introAt = performance.now()
        root.setAttribute('data-intro', '')
        invalidate()
      }
      setReady(true)
      if (pinned === null && wantLive()) {
        // warm the model while the stage is idle so the first release answers at once
        window.setTimeout(() => !dead && startWarm().catch(() => undefined), 900)
      }
    }
    init().catch(fail)

    const ro = new ResizeObserver(() => layout())
    ro.observe(root)
    const io = new IntersectionObserver((es) => {
      onScreen = es[es.length - 1].isIntersecting
      if (onScreen) invalidate()
    })
    io.observe(root)
    const onVisible = () => !document.hidden && invalidate()
    document.addEventListener('visibilitychange', onVisible)
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => api.current?.retoken()
    scheme.addEventListener('change', onScheme)
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      window.clearTimeout(keyTimer)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      scheme.removeEventListener('change', onScheme)
      api.current = null
      scene?.dispose()
    }
    // the stage is rebuilt only when what it shows is re-pinned or retried
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinState, pinT, sampleId, mode, attempt])

  // restyling: new class or inline tokens repaint the specimen
  useEffect(() => {
    api.current?.retoken()
  }, [className, style])

  // labels need one layout pass after they first render
  useEffect(() => {
    api.current?.relabel()
  }, [shown, labels, ready])

  const r = shown?.r
  const middle = r ? !r.citedNumbers : false
  const poster = `${import.meta.env.BASE_URL}_posters/braindrift.jpg`

  return (
    <div
      ref={rootRef}
      className={`bdm${className ? ` ${className}` : ''}`}
      style={style}
      data-ready={ready ? '1' : undefined}
      data-state={phase}
      data-live={live || undefined}
      data-measured={r && r.measured.ventricleChangePct !== null ? r.measured.ventricleChangePct.toFixed(2) : undefined}
    >
      <span ref={probeRef} className="bdm-probe" aria-hidden="true" />
      {/* light and depth behind the specimen: a glow where the brain stands, two orbit rings and a lit floor */}
      <div className="bdm-atmo" aria-hidden="true">
        <i className="bdm-orbit bdm-orbit-a" />
        <i className="bdm-orbit bdm-orbit-b" />
        <i className="bdm-floor" />
      </div>
      <div className="bdm-hero" data-qa="hero" role="img" aria-label="A real brain MRI, cut open: the fluid spaces (ventricles) the model measured are drawn in colour">
        {noGl ? <img className="bdm-poster" src={poster} alt="" /> : <canvas ref={canvasRef} className="bdm-canvas" />}
        {noGl ? <canvas ref={canvasRef} hidden /> : null}
      </div>

      <svg ref={svgRef} className="bdm-marks" aria-hidden="true">
        <path data-band className="bdm-band" />
        <path data-line="glow" className="bdm-line bdm-line-glow" pathLength={1} />
        <path data-line="pre" className="bdm-line bdm-line-pre" pathLength={1} />
        <path data-line="post" className="bdm-line bdm-line-post" pathLength={1} />
        <path data-lead="rise" className={`bdm-lead${labels ? '' : ' bdm-off'}`} pathLength={1} />
        <path data-lead="vent" className={`bdm-lead${labels ? '' : ' bdm-off'}`} pathLength={1} />
        <path data-lead="idle" className={`bdm-lead-idle${labels ? '' : ' bdm-off'}`} />
        <circle data-dot="idle" r={2.5} className={`bdm-dot-idle${labels ? '' : ' bdm-off'}`} />
      </svg>

      {/* stays mounted through the run (unseen after the fly beat): the reading line is placed from it */}
      {labels && ready && !noGl && phase !== 'error' ? (
        <div ref={idleLabelRef} className="bdm-label bdm-label-idle" aria-hidden={r ? true : undefined}>
          fluid spaces
        </div>
      ) : null}

      {labels && r ? (
        <>
          <div ref={ventLabelRef} className="bdm-label bdm-label-vent">
            <span className="bdm-big">{fmtPct(r.measured.ventricleChangePct)}</span>
            <span className="bdm-cap">
              fluid spaces, as the AI measured
              {tags && live ? (
                <span className="bdm-tag" title={live === 'replay' ? bd.HONESTY.offlineReplay : 'the model is running in this browser'}>
                  {live === 'live' ? 'LIVE' : 'REPLAY'}
                </span>
              ) : null}
            </span>
            <span className="bdm-sub">
              we put in {fmtPut(r.injected.ventricleChangePct)}
              {middle ? ', for illustration' : ', the published figure'}
            </span>
            <span className="bdm-key">
              <i aria-hidden="true" />
              fluid here now, not before
            </span>
          </div>
          <div ref={riseLabelRef} className="bdm-label bdm-label-rise">
            <span className="bdm-mid">{fmtMm(r.measured.riseMm)}</span>
            <span className="bdm-cap">rise at the top of the brain</span>
            <span className="bdm-sub">we put in {fmtPutMm(r.injected.riseMm)}</span>
          </div>
        </>
      ) : null}

      <div ref={statusBoxRef} className="bdm-status" aria-live="polite">
        {tags && live ? (
          <span className="bdm-tag" title={live === 'replay' ? bd.HONESTY.offlineReplay : 'the model is running in this browser'}>
            {live === 'live' ? 'LIVE' : 'REPLAY'}
          </span>
        ) : null}
        <span ref={statusRef} className="bdm-status-text" />
        {!ready && phase !== 'error' ? <span className="bdm-status-text">loading the scan</span> : null}
      </div>

      {phase === 'error' ? (
        <div className="bdm-error" role="alert">
          <p>The scan did not load.</p>
          <p className="bdm-error-detail">{error}</p>
          <button type="button" className="bdm-btn" onClick={() => { setError(''); phaseRef.current = 'idle'; setPhaseState('idle'); cb.current.onState?.('idle'); setReady(false); setAttempt((n) => n + 1) }}>
            Try again
          </button>
        </div>
      ) : null}

      {controls ? (
        <div ref={flightRef} className="bdm-flight" data-middle={phase === 'result' && middle && !labels ? '1' : undefined}>
          <div className="bdm-track">
            <span className="bdm-rail" />
            <span className="bdm-fill" />
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="bdm-tick" style={{ '--i': i / 4 } as CSSProperties} />
            ))}
            <span className="bdm-cue" data-on={ready && !noGl && atStart && phase === 'idle' ? '1' : undefined}>
              <span>Drag to after flight:</span> <span>the AI measures what changed.</span>
            </span>
            <span className="bdm-note">
              <span ref={putRef} className="bdm-note-put" />
              <span className="bdm-note-ill" title={bd.HONESTY.middleFrames}>
                illustration
              </span>
            </span>
            <input
              ref={inputRef}
              className="bdm-range"
              type="range"
              min={0}
              max={100}
              step={1}
              defaultValue={0}
              disabled={!ready || noGl}
              data-qa="primary"
              aria-label="Flight. Drag from before flight to after flight; on release the model measures the brain."
              onPointerDown={() => api.current?.touch()}
              onFocus={() => api.current?.touch()}
              onInput={(e) => api.current?.drag(Number(e.currentTarget.value) / 100)}
              onPointerUp={() => api.current?.release()}
              onPointerCancel={() => api.current?.release()}
              onMouseUp={() => api.current?.release()}
              onTouchEnd={() => api.current?.release()}
              onBlur={() => api.current?.release()}
              onKeyDown={(e) => {
                const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'End' ? 4 : e.key === 'Home' ? -4 : 0
                if (d) {
                  e.preventDefault()
                  api.current?.step(d)
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  api.current?.enter()
                }
              }}
            />
          </div>
          <button
            type="button"
            className="bdm-end bdm-end-a"
            disabled={!ready || noGl || (atStart && phase === 'idle')}
            data-here={ready && atStart && phase === 'idle' ? '1' : undefined}
            onClick={() => {
              api.current?.reset()
              // the button switches itself off at before flight: hand the focus to the slider instead of dropping it
              inputRef.current?.focus({ preventScroll: true })
            }}
          >
            Before flight
          </button>
          <button type="button" className="bdm-end bdm-end-b" disabled={!ready || noGl} onClick={() => { api.current?.touch(); api.current?.runTo(4) }}>
            After flight
            {tags ? (
              <span className="bdm-tag" title={bd.HONESTY.flightFrame}>
                {bd.HONESTY.simulationBadge}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  )
})

export default BrainDriftMoment

// BrainDrift moment, slice view (the default since r4, the owner's pick of the mockup-A picture): one real coronal MRI
// slice of the flight brain in a dark framed scanner window, the fluid spaces (ventricles) outlined in glowing light.
// Same props, ref, root hooks, beats and honesty tags as the 3D view (index.tsx, view="3d"); see README.md.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import * as bd from '../../engine/braindrift'
import type { BrainDriftAct, FlightResult, MetaFrame } from '../../engine/braindrift'
import { BEATS, END, dragFrame, frameAt, inOut, out, type Frame, type Geo } from './timeline'
import { NI, NJ, NK, bandPath, brainRange, cropOf, cubicTaps, linePath, maskAt, outlinePath, topLine, upscale, windowLut, type Crop } from './slicegeo'
import type { BrainDriftMomentHandle, BrainDriftMomentProps, MomentState } from './index'
import './braindrift.css'
import './slice.css'

const REST_K = 100
/** The entrance on a natural open: a quick scan from the back of the head to the resting slice, then the outline lights. */
const INTRO_SCAN_MS = 1250
const INTRO_MS = 2100
const DEFAULT_TARGET = 4

type Rgb = [number, number, number]

interface Store {
  frames: MetaFrame[]
  vols: (Uint8Array | null)[]
  segs: (Uint8Array | null)[]
  loading: Map<number, Promise<void>>
  preSeg: Uint8Array
  geo: Geo
  crop: Crop
  lut: Uint8Array
  /** Outline of each stored frame's ventricles on the resting slice (stored Model B maps). */
  outlines: Map<number, string>
  preTop: string
  /** What one measured pair adds: the measured outlines, the gained fluid, the two top lines. */
  res: { key: number; vent: string; pre: string; preTop: string; top: string; band: string; gain: string } | null
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

function readColors(probe: HTMLElement): { scan: Rgb; classes: Rgb[]; mark2: Rgb } {
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
  const mark = rgb('--m-mark')
  return {
    scan: rgb('--m-scan'),
    mark2: rgb('--m-mark-2'),
    // index = class id: background, ventricles (the mark), white matter, cortex, deep grey, cerebellum and brainstem
    classes: [[0, 0, 0], mark, rgb('--m-class-white'), rgb('--m-class-cortex'), rgb('--m-class-deep'), rgb('--m-class-hind')],
  }
}

type Box<T> = { fn: ((p: T) => void) | null }
function boxed<T>(box: Box<T>): (p: T) => void {
  return (p) => box.fn?.(p)
}

export const BrainSliceMoment = forwardRef<BrainDriftMomentHandle, BrainDriftMomentProps>(function BrainSliceMoment(props, ref) {
  const { sampleId, mode = 'auto', state: pinState, t: pinT, labels = true, tags = true, controls = true, className, style } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const flightRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const putRef = useRef<HTMLSpanElement>(null)
  const chipRef = useRef<HTMLSpanElement>(null)
  const sliceRef = useRef<HTMLSpanElement>(null)
  const cb = useRef({ onResult: props.onResult, onState: props.onState })
  cb.current = { onResult: props.onResult, onState: props.onState }
  const opt = useRef({ labels, mode, sampleId, controls })
  opt.current = { labels, mode, sampleId, controls }

  const [phase, setPhaseState] = useState<MomentState>('idle')
  const phaseRef = useRef<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<'' | 'live' | 'replay'>('')
  const [shown, setShown] = useState<{ r: FlightResult; a: BrainDriftAct } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [crop, setCrop] = useState<Crop | null>(null)
  const api = useRef<{ enter: () => void; run: () => void; reset: () => void; runTo: (idx: number) => void; drag: (pos: number) => void; release: () => void; touch: () => void; step: (d: number) => void; retoken: () => void; relayout: () => void } | null>(null)

  useImperativeHandle(ref, () => ({ run: () => api.current?.run(), reset: () => api.current?.reset() }), [])

  useEffect(() => {
    const root = rootRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const off = document.createElement('canvas')
    const offCtx = off.getContext('2d')!
    let img: ImageData | null = null
    // the slice is coloured at 1 mm, then upscaled bicubically (F x) so the window shows a smooth scan, not blocks
    let up: { F: number; c: number; taps: ReturnType<typeof cubicTaps>; lo: Float32Array[]; tmp: Float32Array; hi: Float32Array[] } | null = null
    let colors = readColors(probeRef.current!)
    let dead = false
    let raf = 0
    let store: Store | null = null
    let dragPos: number | null = null
    let warm: Promise<void> | null = null
    let liveBroken = false
    let keyTimer = 0
    let atStartNow = true
    let posKey = ''
    let paintKey = ''
    let ventKey = ''
    let introAt = 0
    let flareAt = 0
    let lastIdx = 0
    let warmSeg: Uint8Array | null = null
    let warmFrontier = -1
    let warmDone = false
    let warmK = 0
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = matchMedia('(pointer: coarse)').matches
    const boxes: Box<never>[] = []
    const relay = <T,>(fn: (p: T) => void): ((p: T) => void) => {
      const box: Box<T> = { fn }
      boxes.push(box as Box<never>)
      return boxed(box)
    }
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
    const frameLoaded = (idx: number) => !!store && !!store.vols[idx] && !!store.segs[idx]

    const outlineOf = (idx: number) => {
      const st = store!
      let d = st.outlines.get(idx)
      if (d === undefined) {
        const seg = st.segs[idx]!
        d = outlinePath(maskAt(st.crop, st.geo.restK, (v) => seg[v] === 1), st.crop.c)
        st.outlines.set(idx, d)
      }
      return d
    }

    const ensureFrame = (idx: number): Promise<void> => {
      const st = store!
      let p = st.loading.get(idx)
      if (!p) {
        const f = st.frames[idx]
        p = Promise.all([bd.fetchVolume(f.volume), bd.fetchVolume(f.seg)]).then(([vol, seg]) => {
          if (dead) return
          st.vols[idx] = vol
          st.segs[idx] = seg
          invalidate()
        })
        st.loading.set(idx, p)
        p.catch(() => st.loading.delete(idx))
      }
      return p
    }

    /** What the pair of readings adds to the picture: the measured outlines, fluid here now and not before, the top lines. */
    const prepareResult = (r: FlightResult) => {
      const st = store!
      const k = st.geo.restK
      const pre = r.pre.seg
      const post = r.post.seg
      const c = st.crop.c
      // fluid here now, not before: voxels of this slice that are ventricle after and were not before (traced with a
      // lower threshold than the outlines, so one-voxel slivers along an edge stay as a thin crescent of light)
      const gained = maskAt(st.crop, k, (v) => post[v] === 1 && pre[v] !== 1)
      const preTop = topLine(pre, k, st.crop)
      const postTop = topLine(post, k, st.crop)
      st.res = {
        key: clock.runId,
        vent: outlinePath(maskAt(st.crop, k, (v) => post[v] === 1), c),
        pre: outlinePath(maskAt(st.crop, k, (v) => pre[v] === 1), c),
        preTop: linePath(preTop),
        top: linePath(postTop),
        band: bandPath(preTop, postTop),
        gain: outlinePath(gained, c, 0.3, 0.6),
      }
      ventKey = ''
    }

    const startWarm = () => {
      if (!warm && store) {
        const preId = store.frames[0].id
        warm = bd
          .load()
          .then(() =>
            bd.analyzeBrain(preId, {
              onProgress: relay((p) => {
                if (dead) return
                warmSeg = p.seg
                for (const k of p.slices) if (k > warmFrontier) warmFrontier = k
                if (clock.running && clock.live && !clock.result) invalidate()
              }),
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
      const frameId = store!.frames[idx].id
      await startWarm()
      if (dead) throw new Error('stage closed')
      const r = await bd.analyze(frameId, {
        onProgress: relay((p) => {
          if (dead || clock.runId !== runId) return
          clock.liveSeg = p.seg
          for (const k of p.slices) if (k > clock.frontier) clock.frontier = k
          invalidate()
        }),
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

    /** The MRI slice (and, while the model reads, its 6-class map) into the window canvas. */
    const paint = (vol: Uint8Array, k: number, seg: Uint8Array | null, map: number, upTo: number) => {
      const st = store!
      const { x0, y0, c } = st.crop
      const F = Math.max(2, Math.min(coarse ? 3 : 4, Math.ceil(canvas.width / c)))
      if (!up || up.F !== F || up.c !== c) {
        const n = c * F
        up = {
          F,
          c,
          taps: cubicTaps(c, F),
          lo: [new Float32Array(c * c), new Float32Array(c * c), new Float32Array(c * c)],
          tmp: new Float32Array(c * n),
          hi: [new Float32Array(n * n), new Float32Array(n * n), new Float32Array(n * n)],
        }
        img = new ImageData(n, n)
        off.width = off.height = n
      }
      const [R, G, B] = up.lo
      const lut = st.lut
      const [sr, sg, sb] = colors.scan
      const cls = colors.classes
      const useSeg = !!seg && map > 0 && k <= upTo
      for (let y = 0; y < c; y++) {
        const j = y0 + y
        for (let x = 0; x < c; x++) {
          const o = y * c + x
          const i = NI - 1 - (x0 + x)
          if (j < 0 || j >= NJ || i < 0 || i >= NI) {
            R[o] = G[o] = B[o] = 0
            continue
          }
          const v = (i * NJ + j) * NK + k
          const g = lut[vol[v]]
          let r = (g * sr) / 255
          let gg = (g * sg) / 255
          let b = (g * sb) / 255
          if (useSeg) {
            const s = seg![v]
            if (s > 0) {
              const t = cls[s]
              if (s === 1) {
                const a = 0.88 * map
                r += (t[0] - r) * a
                gg += (t[1] - gg) * a
                b += (t[2] - b) * a
              } else {
                const a = 0.5 * map
                const l = 0.3 + (0.85 * g) / 255
                r += (t[0] * l - r) * a
                gg += (t[1] * l - gg) * a
                b += (t[2] * l - b) * a
              }
            }
          }
          R[o] = r
          G[o] = gg
          B[o] = b
        }
      }
      for (let ch = 0; ch < 3; ch++) upscale(up.lo[ch], c, F, up.taps, up.tmp, up.hi[ch])
      const d = img!.data
      const [HR, HG, HB] = up.hi
      for (let p = 0, o = 0; p < HR.length; p++, o += 4) {
        d[o] = HR[p]
        d[o + 1] = HG[p]
        d[o + 2] = HB[p]
        d[o + 3] = 255
      }
      offCtx.putImageData(img!, 0, 0)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, canvas.width, canvas.height)
    }

    const setVar = (el: HTMLElement | SVGElement, name: string, v: number) => {
      const s = v.toFixed(3)
      if (el.style.getPropertyValue(name) !== s) el.style.setProperty(name, s)
    }

    const draw = (now: number) => {
      const st = store
      const svg = svgRef.current
      if (!st || !svg) return
      const f = currentFrame()
      let idx = f.frameIdx
      while (idx > 0 && !frameLoaded(idx)) idx--
      if (idx !== lastIdx) {
        // each stored frame that swaps in flares the glow round the fluid, so the swell is seen, not only measured
        if (!reduced && (f.beat === 'idle' || f.beat === 'fly')) flareAt = now
        lastIdx = idx
      }
      // a first release can arrive before the model has read the pre-flight scan: that read is then what the stage shows
      const preRead = f.beat === 'read' && clock.live && !clock.result && clock.frontier < st.geo.k0 && !warmDone && !!warmSeg && warmFrontier >= st.geo.k0
      if (preRead !== root.hasAttribute('data-pre-read')) root.toggleAttribute('data-pre-read', preRead)
      let cut = f.cutK
      let shownIdx = idx
      // until the live model has finished its first slices (a cold model, a busy laptop), the window keeps the whole
      // resting slice instead of sitting on the near-empty back of the head
      const hold = clock.live && !clock.result && clock.frontier < st.geo.k0 && (f.beat === 'seal' || f.beat === 'read') && !preRead
      if (hold) cut = st.geo.restK
      if (preRead) {
        shownIdx = 0
        cut = Math.max(st.geo.k0, Math.min(warmFrontier, warmK))
      }
      // the entrance: a quick scan from the back of the head to the resting slice, then the outline lights
      let lit = 1
      if (introAt) {
        const e = dragPos !== null || clock.running ? INTRO_MS : now - introAt
        if (e >= INTRO_MS) {
          introAt = 0
          root.removeAttribute('data-intro')
        } else {
          const s = clamp01(e / INTRO_SCAN_MS)
          const from = st.geo.k0 + 24
          // 14 visible steps, like a scanner stepping through the head
          cut = from + (st.geo.restK - from) * Math.round(inOut(s) * 14) / 14
          lit = clamp01((e - INTRO_SCAN_MS - 80) / 650)
        }
      }
      const k = Math.max(0, Math.min(NK - 1, Math.round(cut)))
      const seg = preRead ? warmSeg : f.measured > 0 ? (clock.result?.post.seg ?? clock.liveSeg) : null
      const upTo = preRead ? warmFrontier : clock.result ? NK : clock.live ? clock.frontier : NK
      const vol = st.vols[shownIdx]!
      const pk = `${shownIdx}|${k}|${seg ? (seg === warmSeg ? 'w' : 's') : '-'}|${f.map.toFixed(2)}|${upTo}|${canvas.width}`
      if (pk !== paintKey || (seg && clock.running)) {
        paintKey = pk
        paint(vol, k, seg, f.map, upTo)
      }

      // the outline: stored map of the frame shown while at rest or flying, the measured map from the compare beat on
      const tt = clock.t
      const atRest = dragPos !== null || f.beat === 'idle' || f.beat === 'fly'
      const measuredOn = !atRest && !!st.res && (f.beat === 'compare' || f.beat === 'result') && st.res.key === clock.runId
      const vent = svg.querySelector('[data-vent]') as SVGGElement
      const vk = measuredOn ? `m${st.res!.key}` : `s${idx}`
      if (vk !== ventKey) {
        ventKey = vk
        const dpath = measuredOn ? st.res!.vent : outlineOf(idx)
        for (const p of vent.querySelectorAll('path')) p.setAttribute('d', dpath)
      }
      let ventA = 1
      let draw01 = 1
      let flare = 0
      if (atRest) {
        ventA = lit
        draw01 = lit
        flare = flareAt ? clamp01(1 - (now - flareAt) / 700) : 0
        if (introAt && lit > 0) flare = Math.sin(Math.PI * lit)
      } else if (f.beat === 'seal') {
        ventA = 1 - clamp01((tt - BEATS.seal[0]) / 260)
      } else if (f.beat === 'read') {
        ventA = 0
      } else {
        // back at the resting slice, the measured outline draws in and the glow flares once
        const p = clamp01((tt - BEATS.compare[0] - 640) / 560)
        ventA = measuredOn ? 1 : 0
        draw01 = out(p)
        flare = Math.sin(Math.PI * p)
      }
      setVar(svg, '--vent', ventA)
      setVar(svg, '--draw', 1 - draw01)
      setVar(svg, '--fill', draw01)
      setVar(svg, '--flare', flare)
      // before flight, as a quiet dashed reference: the pre-flight outline and brain top, while flown and at the result
      const refOn = (atRest && idx > 0 && lit >= 1) || (measuredOn && f.marks > 0)
      const refEl = svg.querySelector('[data-ref]') as SVGGElement
      const rk = measuredOn ? `m${st.res!.key}` : 's0'
      if (refEl.dataset.k !== rk) {
        refEl.dataset.k = rk
        refEl.querySelector('[data-ref-vent]')!.setAttribute('d', measuredOn ? st.res!.pre : outlineOf(0))
        refEl.querySelector('[data-ref-top]')!.setAttribute('d', measuredOn ? st.res!.preTop : st.preTop)
      }
      setVar(svg, '--ref', refOn ? (measuredOn ? clamp01(f.marks / 0.5) : 1) : 0)
      // the measured rise: the after-flight top line and the sliver between it and before flight
      const topEl = svg.querySelector('[data-top]') as SVGGElement
      if (measuredOn && topEl.dataset.k !== String(st.res!.key)) {
        topEl.dataset.k = String(st.res!.key)
        topEl.querySelector('[data-top-line]')!.setAttribute('d', st.res!.top)
        topEl.querySelector('[data-band]')!.setAttribute('d', st.res!.band)
      }
      setVar(svg, '--top', measuredOn ? f.marks : 0)
      const gainEl = svg.querySelector('[data-gain]') as SVGPathElement
      if (measuredOn && gainEl.dataset.k !== String(st.res!.key)) {
        gainEl.dataset.k = String(st.res!.key)
        gainEl.setAttribute('d', st.res!.gain)
      }
      setVar(svg, '--gain', measuredOn ? f.growth : 0)
      setVar(root, '--b', measuredOn ? f.marks : 0)
      root.toggleAttribute('data-ref', refOn)

      // the window's own labels: which scan is in it and which slice
      const chip = chipRef.current
      if (chip) {
        const text = shownIdx === 0 ? 'Pre-flight scan, skull-stripped' : shownIdx === 4 ? 'After flight, simulated' : 'Simulated, for illustration'
        if (chip.textContent !== text) chip.textContent = text
      }
      const sl = sliceRef.current
      if (sl) {
        const text = `slice ${k} / ${NK}`
        if (sl.textContent !== text) sl.textContent = text
      }

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
        const at = Math.round(f.pos * 4)
        const text = (f.beat === 'idle' || f.beat === 'fly') && at > 0 ? `we put in ${fmtPut(st.frames[at].injectedVentricleChangePct)}` : ''
        if (put.textContent !== text) put.textContent = text
      }
      const status = statusRef.current
      if (status) {
        let text = ''
        if (f.beat === 'read') {
          const n = st.geo.k1 - st.geo.k0 + 1
          const at = `slice ${Math.max(1, Math.min(n, k - st.geo.k0 + 1))} of ${n}`
          if (preRead) text = `pre-flight scan first: ${at}`
          else if (hold) text = warmDone ? 'the AI starts at the back of the head' : 'loading the model'
          else text = `the AI is mapping ${at}`
        } else if (f.beat === 'seal') text = hold && !warmDone ? 'loading the model' : 'the AI starts at the back of the head'
        else if (clock.running && !frameLoaded(clock.target)) text = 'loading the scan'
        if (status.textContent !== text) status.textContent = text
        // while the thumb flies there is nothing to say yet: the LIVE / REPLAY tag waits for its line instead of standing alone
        status.parentElement?.toggleAttribute('data-empty', !text)
      }
    }

    const tick = (now: number) => {
      raf = 0
      if (dead) return
      if (clock.running) {
        const dt = Math.min(64, Math.max(0, now - clock.last))
        clock.last = now
        clock.t = Math.min(clock.t + dt, gate())
        if (warmFrontier > warmK) warmK = Math.min(warmFrontier, warmK + dt * 0.09)
        if (clock.result && (reduced || clock.t >= END)) clock.t = END
        if (clock.t >= BEATS.compare[0]) fire()
        if (clock.t >= END) {
          clock.running = false
          setPhase('result')
        }
      }
      draw(now)
      const flaring = flareAt > 0 && now - flareAt < 720
      if (clock.running || introAt || flaring) raf = requestAnimationFrame(tick)
    }
    function invalidate() {
      if (!raf && !dead) raf = requestAnimationFrame(tick)
    }

    const start = (targetIdx: number, fromT: number) => {
      if (!store) return
      window.clearTimeout(keyTimer)
      const id = ++clock.runId
      Object.assign(clock, { target: targetIdx, t: fromT, startT: fromT, result: null, fired: false, frontier: store.geo.k0 - 1, liveSeg: null, live: wantLive(), running: true, last: performance.now() })
      dragPos = null
      store.res = null
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
            prepareResult(r)
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

    /** Where the window, the two flanks and the slider stand. A wide stage centres the window with the legend on its
     *  left and the numbers on its right; an upright one (a phone) puts the window on top and both under it. */
    const layout = () => {
      const W = root.clientWidth
      const H = root.clientHeight
      if (W < 2 || H < 2) return
      const lab = opt.current.labels
      const ctl = opt.current.controls
      const wide = W / H > 1.15 && W >= 600
      let wx: number
      let wy: number
      let s: number
      let fx: number
      if (wide) {
        // the window on the left, a column for the legend and the numbers on its right, the slider under the window
        const flightH = ctl ? 128 : 22
        const col = lab ? Math.min(380, Math.max(250, W * 0.33)) : 0
        const gap = lab ? 40 : 0
        s = Math.floor(Math.min(H - 24 - flightH, W - col - gap - 56))
        const group = s + gap + col
        wx = Math.round((W - group) / 2)
        wy = Math.round(Math.max(22, (H - flightH - s) / 2 + 2))
        fx = wx + s / 2
        root.style.setProperty('--sx', `${wx + s + gap}px`)
        root.style.setProperty('--sy', `${wy}px`)
        root.style.setProperty('--sw', `${Math.max(160, Math.min(col, W - (wx + s + gap) - 12)).toFixed(0)}px`)
        root.style.setProperty('--sh', `${s}px`)
        root.style.setProperty('--fw', `${Math.min(540, Math.max(300, s)).toFixed(0)}px`)
      } else {
        const flightH = ctl ? 108 : 14
        const info = lab ? 136 : 0
        s = Math.floor(Math.min(W - 28, H - 16 - flightH - info))
        wx = Math.round((W - s) / 2)
        wy = 16
        fx = W / 2
        root.style.setProperty('--sx', '14px')
        root.style.setProperty('--sy', `${wy + s + 14}px`)
        root.style.setProperty('--sw', `${W - 28}px`)
        root.style.setProperty('--sh', `${info - 8}px`)
        root.style.setProperty('--fw', `${Math.min(520, W - 40)}px`)
      }
      s = Math.max(120, s)
      root.dataset.shape = wide ? 'wide' : 'tall'
      // a small window (a narrow laptop window) has no room for both chips across its top: see slice.css
      root.toggleAttribute('data-small', s < 400)
      root.toggleAttribute('data-tiny', s < 260)
      root.style.setProperty('--wx', `${wx}px`)
      root.style.setProperty('--wy', `${wy}px`)
      root.style.setProperty('--ws', `${s}px`)
      root.style.setProperty('--fx', `${fx.toFixed(0)}px`)
      const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 2)
      const px = Math.round(s * dpr)
      if (canvas.width !== px) {
        canvas.width = canvas.height = px
        paintKey = ''
      }
      draw(performance.now())
    }

    api.current = {
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
      retoken: () => {
        if (!probeRef.current) return
        colors = readColors(probeRef.current)
        paintKey = ''
        invalidate()
      },
      relayout: () => layout(),
    }

    const init = async () => {
      statusRef.current?.parentElement?.removeAttribute('data-empty')
      const meta = await bd.fetchMeta()
      const frames = meta.flight.frames
      const [vol0, seg0] = await Promise.all([bd.fetchVolume(frames[0].volume), bd.fetchVolume(frames[0].seg)])
      if (dead) return
      const [k0, k1] = brainRange(seg0)
      const c = cropOf(seg0)
      store = {
        frames,
        vols: [vol0, null, null, null, null],
        segs: [seg0, null, null, null, null],
        loading: new Map([[0, Promise.resolve()]]),
        preSeg: seg0,
        geo: { k0, k1, restK: REST_K },
        crop: c,
        lut: windowLut(vol0, seg0),
        outlines: new Map(),
        preTop: linePath(topLine(seg0, REST_K, c)),
        res: null,
      }
      setCrop(c)
      clock.target = targetOf(opt.current.sampleId)
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
        prepareResult(r)
        Object.assign(clock, { result: r, t: pinned, startT: pinned, live: wasLive })
        setLive(wasLive ? 'live' : 'replay')
        if (pinned >= BEATS.compare[0]) fire()
        setPhase(pinned >= END ? 'result' : 'running')
      }
      layout()
      if (pinState === undefined && pinT === undefined && !reduced) {
        introAt = performance.now()
        root.setAttribute('data-intro', '')
        invalidate()
      }
      setReady(true)
      if (pinned === null && wantLive()) window.setTimeout(() => !dead && startWarm().catch(() => undefined), 900)
    }
    init().catch(fail)

    const ro = new ResizeObserver(() => layout())
    ro.observe(root)
    const onVisible = () => !document.hidden && invalidate()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      window.clearTimeout(keyTimer)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      api.current = null
      for (const b of boxes) b.fn = null
      clock.result = null
      clock.liveSeg = null
      store = null
      warm = null
      warmSeg = null
      img = null
      up = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinState, pinT, sampleId, mode, attempt])

  useEffect(() => {
    api.current?.retoken()
  }, [className, style])

  useEffect(() => {
    api.current?.relayout()
  }, [labels, controls, ready])

  const r = shown?.r
  const middle = r ? !r.citedNumbers : false
  const liveTag =
    tags && live ? (
      <span className="bdm-tag" title={live === 'replay' ? bd.HONESTY.offlineReplay : 'the model is running in this browser'}>
        {live === 'live' ? 'LIVE' : 'REPLAY'}
      </span>
    ) : null
  const c = crop?.c ?? 176

  return (
    <div
      ref={rootRef}
      className={`bdm bds${className ? ` ${className}` : ''}`}
      style={style}
      data-view="slice"
      data-labels={labels ? undefined : '0'}
      data-ready={ready ? '1' : undefined}
      data-state={phase}
      data-live={live || undefined}
      data-measured={r && r.measured.ventricleChangePct !== null ? r.measured.ventricleChangePct.toFixed(2) : undefined}
    >
      <span ref={probeRef} className="bdm-probe" aria-hidden="true" />
      <div className="bds-atmo" aria-hidden="true" />

      <section className="bds-well" data-qa="hero" role="img" aria-label="A real brain MRI, one slice from front to back of the head: the fluid spaces (ventricles) the AI mapped are outlined in light">
        <div className="bds-well-in">
          <canvas ref={canvasRef} className="bds-canvas" />
          <svg ref={svgRef} className="bds-ov" viewBox={`0 0 ${c} ${c}`} preserveAspectRatio="none" aria-hidden="true">
            <g data-ref className="bds-ref">
              <path data-ref-top />
              <path data-ref-vent />
            </g>
            <g data-top className="bds-top">
              <path data-band className="bds-band" />
              <path data-top-line className="bds-top-line" pathLength={1} />
            </g>
            <g data-vent className="bds-vent">
              <path className="bds-v-glow" />
              <path className="bds-v-fill" />
              <path className="bds-v-line" pathLength={1} />
            </g>
            <path data-gain className="bds-gain" />
          </svg>
        </div>
        <div className="bds-chips" aria-hidden="true">
          <span ref={chipRef} className="bds-chip">
            Pre-flight scan, skull-stripped
          </span>
          <span ref={sliceRef} className="bds-chip bds-chip-mono">
            slice {REST_K} / {NK}
          </span>
        </div>
        <i className="bds-tick bds-tl" />
        <i className="bds-tick bds-tr" />
        <i className="bds-tick bds-bl" />
        <i className="bds-tick bds-br" />
      </section>

      <div className="bds-side">
      {labels ? (
        <div className="bds-legend">
          <span className="bds-key">
            <i className="bds-sw-vent" aria-hidden="true" />
            <span>
              <b>Fluid spaces</b> (ventricles), as the AI maps them
            </span>
          </span>
          <span className="bds-key bds-key-ref">
            <i className="bds-sw-ref" aria-hidden="true" />
            <span>before flight</span>
          </span>
          <span className="bds-key bds-key-gain">
            <i className="bds-sw-gain" aria-hidden="true" />
            <span>fluid here now, not before</span>
          </span>
        </div>
      ) : null}

      <div className="bds-read" aria-live="polite" data-labels={labels ? undefined : '0'}>
        <div className="bdm-status bds-status" data-on={(phase === 'running' && !r) || (!ready && phase !== 'error') ? '1' : undefined}>
          {r ? null : liveTag}
          <span ref={statusRef} className="bdm-status-text" />
          {!ready && phase !== 'error' ? <span className="bdm-status-text">loading the scan</span> : null}
        </div>
        {labels && r ? (
          <div className="bds-nums">
            <div className="bds-num">
              <span className="bds-big">{fmtPct(r.measured.ventricleChangePct)}</span>
              <span className="bds-cap">
                fluid spaces, as the AI measured
                {liveTag}
              </span>
              <span className="bds-sub">
                we put in {fmtPut(r.injected.ventricleChangePct)}
                {middle ? ', for illustration' : ', the published figure'}
              </span>
            </div>
            <div className="bds-num">
              <span className="bds-mid">{fmtMm(r.measured.riseMm)}</span>
              <span className="bds-cap">rise at the top of the brain</span>
              <span className="bds-sub">we put in {fmtPutMm(r.injected.riseMm)}</span>
            </div>
            <span className="bds-key bds-key-gain bds-key-inline">
              <i className="bds-sw-gain" aria-hidden="true" />
              <span>fluid here now, not before</span>
            </span>
          </div>
        ) : null}
      </div>
      </div>

      {phase === 'error' ? (
        <div className="bdm-error" role="alert">
          <p>The scan did not load.</p>
          <p className="bdm-error-detail">{error}</p>
          <button
            type="button"
            className="bdm-btn"
            onClick={() => {
              setError('')
              phaseRef.current = 'idle'
              setPhaseState('idle')
              cb.current.onState?.('idle')
              setReady(false)
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {controls ? (
        <div ref={flightRef} className="bdm-flight bds-flight" data-middle={phase === 'result' && middle && !labels ? '1' : undefined}>
          <div className="bdm-track">
            <span className="bdm-rail" />
            <span className="bdm-fill" />
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="bdm-tick" style={{ '--i': i / 4 } as CSSProperties} />
            ))}
            <span className="bdm-cue" data-on={ready && atStart && phase === 'idle' ? '1' : undefined}>
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
              disabled={!ready}
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
            disabled={!ready || (atStart && phase === 'idle')}
            data-here={ready && atStart && phase === 'idle' ? '1' : undefined}
            onClick={() => {
              api.current?.reset()
              inputRef.current?.focus({ preventScroll: true })
            }}
          >
            Before flight
          </button>
          <button
            type="button"
            className="bdm-end bdm-end-b"
            disabled={!ready}
            onClick={() => {
              api.current?.touch()
              api.current?.runTo(4)
            }}
          >
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

export default BrainSliceMoment

// Garn Meter moment: the stage only. The real 14-channel EEG, the model's marks on it (the 4 s window, the grey
// estimate), the person's own ratings, and one interaction: the 1-7 check-in rail that drives the gauge and act().
// The rail answers before the session is played (the check-in alone sets the zone and the action) and after it.
// At idle the stage is the recording under one sentence; the session strip comes on stage when Play fills it and is then
// a second handle on the specimen: tap or drag it to bring another scene into view.
// No page chrome: the page gets the number and the action through onResult(result, act).
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import './moment.css'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import * as garn from '../../engine/garnmeter'
import type { GarnAct, GarnResult } from '../../engine/garnmeter'
import { loadSessionData } from '../../engine/garnmeter/data'
import { preferBackends } from '../../lib/infer/client'
import { drawScene, garnX, layoutFor, scanPx, stopX, stripSampleX, timeScale, type Layout, type Palette, type RailUi, type Signal } from './draw'
import { CALIBRATE_END, calibrateFrame, DURATION, frameAt, idleAmbient, idleFrame, resultAmbient, stageData, type Frame, type StageData } from './timeline'

export { BEATS, DURATION } from './timeline'
export type MomentState = 'idle' | 'running' | 'result' | 'error'

// This model is tiny: wasm is the faster backend for it (model brief, section 3), so it is asked for first.
preferBackends('garnmeter/garn', ['wasm'])

export interface GarnMomentProps {
  /** Engine sample id. Default: the whole session of the held-out test person ('user19-s3'). A single scene ('user19-s3-t24') also works. */
  sampleId?: string
  /** auto: the real model on a laptop, stored outputs on a phone or when the model fails. */
  mode?: 'auto' | 'live' | 'replay'
  /** Pins the stage: 'idle' = before the action, 'result' = settled, no animation. */
  state?: 'idle' | 'result'
  /** Pins the timeline at this many ms (0 to DURATION). */
  t?: number
  /** Called when the result settles and again after every check-in or scene change, with the engine's decision for that
   *  check-in. A check-in made before the session was played comes with the stored-outputs result: use only `act` then. */
  onResult?: (result: GarnResult, act: GarnAct) => void
  onState?: (state: MomentState) => void
  /** Called once the recording is loaded and the stage shows what the props pin (idle, the result, or the frame at t). */
  onReady?: () => void
  /** Small words on the stage (labels on every mark, scale ends, status word). Default true; false leaves marks only. */
  annotations?: boolean
  className?: string
  style?: CSSProperties
}
export interface GarnMomentHandle {
  /** Runs the model (or the stored outputs) and plays the timeline. */
  run: () => Promise<void>
  /** Back to the idle stage. */
  reset: () => void
  /** Sets the crew check-in (1-7), as a tap on the rail does. Works at idle and once a result is on stage. */
  checkIn: (ids: number) => void
  /** Brings another analysed scene (1-based trial index) into view, as a tap on the session strip does. */
  focusOn: (trial: number) => void
}

const DEFAULT_SAMPLE = 'user19-s3'
const STATUS_WORD: Record<string, string> = { nominal: 'Nominal', watch: 'Watch', caution: 'Caution', warning: 'Warning', critical: 'Critical' }
/** A Garn value from a 1-7 check-in, as printed: 1.0, 0.5, 0.17. */
const saidGarn = (ids: number) => ((ids - 1) / 6).toFixed(2).replace(/0$/, '')

const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const isPhone = () => coarse() || window.innerWidth <= 600
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const clampN = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const setText = (el: HTMLElement | null, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}
/** A label that rides on a mark is on stage only while its mark is (hidden ones are also out of the reading order). */
const showEl = (el: HTMLElement, alpha = 1) => {
  el.style.visibility = 'visible'
  el.style.opacity = String(alpha)
}
const hideEl = (el: HTMLElement) => {
  el.style.opacity = '0'
  el.style.visibility = 'hidden'
}

// One shared worker runs the models: never start a second analyze() before the first returned.
let queue: Promise<unknown> = Promise.resolve()
function compute(sampleId: string, mode: 'auto' | 'live' | 'replay'): Promise<GarnResult> {
  const job = queue.then(async () => {
    const live = mode === 'live' || (mode === 'auto' && !isPhone())
    if (live) {
      try {
        await garn.load()
        return await garn.analyze(sampleId)
      } catch (e) {
        console.warn('garnmeter moment: live model failed, using the stored outputs', e)
      }
    }
    return garn.replay(sampleId)
  })
  queue = job.catch(() => undefined)
  return job
}

let probe: CanvasRenderingContext2D | null = null
function rgb(color: string): [number, number, number] {
  if (!probe) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    probe = c.getContext('2d', { willReadFrequently: true })
  }
  if (!probe) return [128, 128, 128]
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#808080'
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const d = probe.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2]]
}
export function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  const stage = v('--m-stage', '#070a12')
  const ink = v('--m-ink', '#eef1fb')
  const stageRgb = rgb(stage)
  const inkRgb = rgb(ink)
  // the scalp map's middle tone: the same 22 % mix of ink into the stage that moment.css uses for the key
  const fieldMid: [number, number, number] = [0, 1, 2].map((i) => stageRgb[i] + (inkRgb[i] - stageRgb[i]) * 0.22) as [number, number, number]
  const accent = v('--m-accent', '#8fa6ff')
  return {
    stage,
    ink,
    ink2: v('--m-ink-2', '#8f98b3'),
    mark: v('--m-mark', '#8a93ad'),
    accent,
    ok: v('--m-ok', '#2ee6a6'),
    watch: v('--m-watch', '#ffb224'),
    alert: v('--m-alert', '#ff4d5e'),
    glow: v('--m-glow', accent),
    font: v('--m-font', 'ui-sans-serif, sans-serif'),
    mono: v('--m-font-mono', 'ui-monospace, monospace'),
    stageRgb,
    inkRgb,
    glowRgb: rgb(v('--m-glow', accent)),
    fieldHi: rgb(v('--m-field-hi', '#ff6fc4')),
    fieldLo: rgb(v('--m-field-lo', '#31d6f0')),
    fieldMid,
  }
}

export const GarnMoment = forwardRef<GarnMomentHandle, GarnMomentProps>(function GarnMoment(
  { sampleId = DEFAULT_SAMPLE, mode = 'auto', state: pinned, t: pinnedT, onResult, onState, onReady, annotations = true, className, style },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sigRef = useRef<Signal | null>(null)
  const dataRef = useRef<StageData | null>(null)
  const resultRef = useRef<{ key: string; result: GarnResult } | null>(null)
  const storedRef = useRef<{ key: string; job: Promise<GarnResult> } | null>(null)
  const frameRef = useRef<Frame>(idleFrame(1024))
  /** The frame on stage: frameRef, plus the playhead that keeps the resting stage alive (idle and settled result). */
  const shownRef = useRef<Frame>(frameRef.current)
  const ambRef = useRef({ on: false, t0: 0 })
  const saidRef = useRef<RailUi['said']>(null)
  const rippleRef = useRef(0)
  const railDrag = useRef({ on: false, moved: false, x: 0, n: 0 })
  const uiRef = useRef<RailUi>({ handle: null, recorded: null, zone: null })
  const layoutRef = useRef<Layout | null>(null)
  const palRef = useRef<Palette | null>(null)
  const dprRef = useRef(1)
  const rafRef = useRef(0)
  const tweenRef = useRef(0)
  const runRef = useRef(0)
  const cb = useRef({ onResult, onState, onReady })
  cb.current = { onResult, onState, onReady }
  // labels that follow a moving mark are placed frame by frame, next to the canvas draw
  const scaleBarRef = useRef<HTMLElement>(null)
  const scaleTextRef = useRef<HTMLSpanElement>(null)
  const viewRef = useRef<HTMLSpanElement>(null)
  const readsRef = useRef<HTMLSpanElement>(null)
  const eegRef = useRef<HTMLSpanElement>(null)
  const eegNumRef = useRef<HTMLSpanElement>(null)
  const verdictRef = useRef<HTMLSpanElement>(null)
  const verdictNumRef = useRef<HTMLSpanElement>(null)
  const askRef = useRef<HTMLSpanElement>(null)
  const tagRef = useRef<HTMLSpanElement>(null)
  const widthRef = useRef({ reads: 0, eeg: 0, tag: 0 })

  const [ready, setReady] = useState(false)
  const [pinDone, setPinDone] = useState(false)
  const [status, setStatus] = useState<MomentState>('idle')
  const [layout, setLayout] = useState<Layout | null>(null)
  const [checkin, setCheckin] = useState<number | null>(null)
  const [recorded, setRecorded] = useState<number | null>(null)
  const [act, setAct] = useState<GarnAct | null>(null)
  const [source, setSource] = useState<'live' | 'precomputed' | null>(null)
  const [focus, setFocus] = useState<{ index: number; first: number; last: number; of: number } | null>(null)
  const dragRef = useRef(false)
  const hoverRef = useRef<HTMLSpanElement>(null)

  /** Places the labels that ride on moving marks: the time scale, the 4 s window's name, the model's value, the gap, the scene tag. */
  const annotate = useCallback(() => {
    const L = layoutRef.current
    const sig = sigRef.current
    if (!L || !sig || !L.notes) return
    const fr = shownRef.current
    const d = dataRef.current
    const wd = widthRef.current

    const ts = timeScale(L, sig, fr)
    if (scaleBarRef.current) scaleBarRef.current.style.width = `${ts.px.toFixed(1)}px`
    setText(scaleTextRef.current, `${ts.seconds} s`)
    const early = fr.beat === 'idle' || fr.beat === 'calibrate'
    setText(viewRef.current, `Recorded brainwaves, ${early || !d ? 'at rest' : fr.beat === 'session' ? 'whole session' : `scene ${d.focus.index}`}`)

    const reads = readsRef.current
    if (reads) {
      const sp = scanPx(L, sig, fr)
      if (!sp || !fr.scan) hideEl(reads)
      else {
        if (!wd.reads) wd.reads = reads.offsetWidth
        const x = clampN(sp[0], L.traces.x, L.traces.x + L.traces.w - wd.reads)
        reads.style.transform = `translateX(${x.toFixed(1)}px)`
        showEl(reads, fr.scan.alpha)
      }
    }

    // The verdict: one large line above the rail, on stage from the moment the person's check-in lands.
    // Until then the model's value rides on its own tick.
    const verdictOn = fr.estimate !== null && fr.checkin > 0.6
    const verdict = verdictRef.current
    if (verdict) {
      if (!verdictOn || !fr.estimate) hideEl(verdict)
      else {
        setText(verdictNumRef.current, fr.estimate.value.toFixed(2))
        showEl(verdict)
      }
    }
    const ask = askRef.current
    if (ask) {
      if (verdictOn) hideEl(ask)
      else showEl(ask)
    }
    const eeg = eegRef.current
    if (eeg) {
      if (!fr.estimate || fr.estimate.alpha <= 0.01 || verdictOn) hideEl(eeg)
      else {
        setText(eegNumRef.current, fr.estimate.value.toFixed(2))
        if (!wd.eeg) wd.eeg = eeg.offsetWidth
        const x = clampN(garnX(L, fr.estimate.garn) - wd.eeg / 2, 4, L.w - wd.eeg - 4)
        eeg.style.transform = `translateX(${x.toFixed(1)}px)`
        showEl(eeg, fr.estimate.alpha)
      }
    }

    const tag = tagRef.current
    if (tag) {
      if (!d || fr.focusMark < 0.5) hideEl(tag)
      else {
        setText(tag, `scene ${d.focus.index}`)
        if (!wd.tag) wd.tag = tag.offsetWidth
        const mid = stripSampleX(L, sig.nSamples, d.focus.start + d.focus.length / 2)
        const x = clampN(mid - wd.tag / 2, L.strip.x, L.strip.x + L.strip.w - wd.tag)
        tag.style.transform = `translateX(${x.toFixed(1)}px)`
        showEl(tag)
      }
    }
  }, [])

  const render = useCallback(() => {
    const cv = canvasRef.current
    const sig = sigRef.current
    const L = layoutRef.current
    const root = rootRef.current
    if (!cv || !sig || !L || !root) return
    if (!palRef.current) palRef.current = readPalette(root)
    const ctx = cv.getContext('2d')
    if (!ctx) return
    // At rest the recording keeps replaying at 1x: at idle a playhead crosses the 8 s at rest; at the result the model's
    // window crosses the scene in view. Both only move marks that are already on stage (see timeline.ts).
    let fr = frameRef.current
    if (ambRef.current.on) {
      const clock = performance.now() - ambRef.current.t0
      if (fr.beat === 'idle') fr = idleAmbient(fr, sig.baseline.length, sig.fs, clock)
      else if (fr.beat === 'result' && dataRef.current) fr = resultAmbient(fr, dataRef.current, clock)
    }
    shownRef.current = fr
    drawScene(ctx, L, palRef.current, sig, dataRef.current, fr, { ...uiRef.current, said: saidRef.current, ripple: rippleRef.current }, dprRef.current)
    root.dataset.beat = frameRef.current.beat
    // 0 = the idle stage (the sentence over the traces), 1 = the session view (strip, legend and time scale are on stage)
    root.dataset.open = frameRef.current.open > 0.5 ? '1' : '0'
    annotate()
  }, [annotate])

  // size: the canvas follows the root; device pixel ratio capped at 2 (1.5 on touch)
  useEffect(() => {
    const root = rootRef.current
    const cv = canvasRef.current
    if (!root || !cv) return
    const fit = () => {
      const w = Math.max(240, Math.round(root.clientWidth))
      const h = Math.max(240, Math.round(root.clientHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, coarse() ? 1.5 : 2)
      dprRef.current = dpr
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      layoutRef.current = layoutFor(w, h, annotations)
      root.style.setProperty('--gm-u', layoutRef.current.u.toFixed(3))
      widthRef.current = { reads: 0, eeg: 0, tag: 0 }
      palRef.current = readPalette(root)
      setLayout(layoutRef.current)
      render()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
  }, [render, annotations])

  // the recording itself (needed for the idle stage); in live mode the model warms up in the background
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const [s, d] = await Promise.all([garn.getSignal(), loadSessionData()])
        if (dead) return
        sigRef.current = { eeg: s.eeg, nSamples: s.nSamples, sigma: s.sigma, trials: s.trials, baseline: s.baseline, fs: s.fs, channels: s.channels, electrodes: d.meta.electrodes }
        frameRef.current = idleFrame(s.baseline.length)
        render()
        setReady(true)
      } catch (e) {
        console.error('garnmeter moment: the recording did not load', e)
        if (!dead) setStatus('error')
      }
    })()
    return () => {
      dead = true
    }
  }, [render])
  useEffect(() => {
    if (ready && (mode === 'live' || (mode === 'auto' && !isPhone()))) garn.load().catch(() => undefined)
  }, [ready, mode])
  // the labels mount after the first layout: draw once more so they are placed, and again when the fonts are in
  useEffect(() => {
    render()
    let dead = false
    document.fonts?.ready.then(() => {
      if (dead) return
      widthRef.current = { reads: 0, eeg: 0, tag: 0 }
      render()
    })
    return () => {
      dead = true
    }
  }, [layout, ready, render])

  useEffect(() => {
    cb.current.onState?.(status)
  }, [status])

  const getResult = useCallback(async () => {
    const key = `${sampleId}|${mode}`
    if (resultRef.current?.key === key) return resultRef.current.result
    const result = await compute(sampleId, mode)
    resultRef.current = { key, result }
    return result
  }, [sampleId, mode])

  /** A result for a check-in made before the session was played: act() needs one for its tables, not for any EEG value. */
  const storedResult = useCallback(() => {
    if (resultRef.current?.key === `${sampleId}|${mode}`) return Promise.resolve(resultRef.current.result)
    if (storedRef.current?.key !== sampleId) storedRef.current = { key: sampleId, job: garn.replay(sampleId) }
    return storedRef.current.job
  }, [sampleId, mode])

  /** Puts a result on stage (no frame yet): stage data, and the rail starts from the study's own rating for the scene in view. */
  const adopt = useCallback((r: GarnResult) => {
    const sig = sigRef.current
    if (!sig) return null
    const d = stageData(r, sig.nSamples, sig.baseline.length)
    dataRef.current = d
    uiRef.current = { handle: d.focus.ids, recorded: d.focus.ids, zone: garn.checkinZone(d.focus.ids) }
    setSource(r.source)
    setRecorded(d.focus.ids)
    const analysed = d.trials.filter((t) => t.w1 > t.w0)
    setFocus({ index: d.focus.index, first: analysed[0]?.index ?? d.focus.index, last: analysed[analysed.length - 1]?.index ?? d.focus.index, of: d.trials.length })
    return d
  }, [])

  const settle = useCallback(
    (r: GarnResult, d: StageData) => {
      frameRef.current = frameAt(DURATION, d)
      render()
      const a = garn.act(r, { atTrial: d.focus.index })
      setAct(a)
      setCheckin(d.focus.ids)
      setStatus('result')
      cb.current.onResult?.(r, a)
    },
    [render],
  )

  const stop = useCallback(() => {
    runRef.current++
    palRef.current = null // tokens are read again on the next draw, so a restyle shows on the next run or reset
    cancelAnimationFrame(rafRef.current)
    cancelAnimationFrame(tweenRef.current)
  }, [])

  const clearStage = useCallback(() => {
    dataRef.current = null
    uiRef.current = { handle: null, recorded: null, zone: null }
    setAct(null)
    setCheckin(null)
    setRecorded(null)
    setFocus(null)
    setSource(null)
  }, [])

  const reset = useCallback(() => {
    stop()
    clearStage()
    frameRef.current = idleFrame(sigRef.current?.baseline.length ?? 1024)
    setStatus(sigRef.current || !ready ? 'idle' : 'error')
    render()
  }, [clearStage, ready, render, stop])

  /** Shows the frame at clock time t without running the clock (pinned states and reduced motion). */
  const showAt = useCallback(
    async (t: number) => {
      stop()
      const id = runRef.current
      try {
        const r = await getResult()
        if (id !== runRef.current) return
        const d = adopt(r)
        if (!d) return
        if (t >= DURATION) settle(r, d)
        else {
          frameRef.current = frameAt(t, d)
          setAct(null)
          setCheckin(null)
          setStatus('running')
          render()
        }
      } catch (e) {
        console.error('garnmeter moment: no result', e)
        if (id === runRef.current) setStatus('error')
      }
    },
    [adopt, getResult, render, settle, stop],
  )

  const run = useCallback(async () => {
    if (!sigRef.current) return
    if (reducedMotion()) return showAt(DURATION)
    stop()
    const id = runRef.current
    const baseline = sigRef.current.baseline.length
    clearStage()
    frameRef.current = calibrateFrame(0, baseline)
    setStatus('running')
    render()
    // The clock starts at once. The first beat (calibration) needs only the recording, so it plays while the model
    // answers; if the model is slower than that beat, the clock holds at its end and then goes on.
    let got: { r: GarnResult; d: StageData } | null = null
    getResult().then(
      (r) => {
        if (id !== runRef.current) return
        const d = adopt(r)
        if (d) got = { r, d }
      },
      (e) => {
        console.error('garnmeter moment: no result', e)
        if (id === runRef.current) {
          runRef.current++
          setStatus('error')
        }
      },
    )
    let t0 = performance.now()
    const tick = () => {
      if (id !== runRef.current) return
      let t = performance.now() - t0
      if (!got) {
        if (t > CALIBRATE_END) {
          t0 += t - CALIBRATE_END
          t = CALIBRATE_END
        }
        frameRef.current = calibrateFrame(t, baseline)
      } else {
        if (t >= DURATION) return settle(got.r, got.d)
        frameRef.current = frameAt(t, got.d)
      }
      render()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [adopt, clearStage, getResult, render, settle, showAt, stop])

  /** The handle travels to the new stop: the user moved it, so it may move (skipped under reduced motion). */
  const moveHandle = useCallback(
    (n: number) => {
      cancelAnimationFrame(tweenRef.current)
      // from where it is; the first answer starts from the resting handle in the middle of the rail
      const from = uiRef.current.handle ?? (frameRef.current.beat === 'idle' ? 4 : n)
      if (reducedMotion()) {
        uiRef.current.handle = n
        render()
        return
      }
      const t0 = performance.now()
      const step = () => {
        const dt = performance.now() - t0
        const p = Math.min(1, dt / 260)
        const e = 1 - Math.pow(1 - p, 4)
        uiRef.current.handle = from + (n - from) * e
        // a ring leaves the handle as the answer lands
        const q = Math.min(1, dt / 520)
        rippleRef.current = q < 1 ? 1 - Math.pow(1 - q, 3) : 0
        render()
        if (q < 1) tweenRef.current = requestAnimationFrame(step)
      }
      tweenRef.current = requestAnimationFrame(step)
    },
    [render],
  )

  const checkIn = useCallback(
    (ids: number) => {
      const n = Math.min(7, Math.max(1, Math.round(ids)))
      const sig = sigRef.current
      if (status === 'idle' && sig) {
        // Before the session is played there is no EEG on stage: the check-in alone sets the zone and the action.
        frameRef.current = { ...idleFrame(sig.baseline.length), checkin: 1 }
        uiRef.current = { handle: uiRef.current.handle, recorded: null, zone: garn.checkinZone(n) }
        setCheckin(n)
        moveHandle(n)
        const id = runRef.current
        storedResult().then(
          (r) => {
            if (id !== runRef.current) return
            const a = garn.act(r, { checkinIds: n })
            setAct(a)
            cb.current.onResult?.(r, a)
          },
          (e) => console.warn('garnmeter moment: no decision for the check-in', e),
        )
        return
      }
      const r = resultRef.current?.result
      const d = dataRef.current
      if (!r || !d || status !== 'result') return
      const a = garn.act(r, { checkinIds: n, atTrial: d.focus.index })
      setAct(a)
      setCheckin(n)
      cb.current.onResult?.(r, a)
      uiRef.current = { ...uiRef.current, zone: a.checkinZone }
      moveHandle(n)
    },
    [moveHandle, status, storedResult],
  )

  /** Another scene comes into view: the traces pan to it, the rail shows that scene's own rating and the model's estimate for it. */
  const focusOn = useCallback(
    (trialIndex: number) => {
      const r = resultRef.current?.result
      const d = dataRef.current
      if (!r || !d || status !== 'result') return
      const tr = d.trials.find((x) => x.index === trialIndex && x.w1 > x.w0)
      if (!tr || tr.index === d.focus.index) return
      const fromCam = frameRef.current.cam
      const nd = { ...d, focus: tr }
      dataRef.current = nd
      const end = frameAt(DURATION, nd)
      uiRef.current = { handle: tr.ids, recorded: tr.ids, zone: garn.checkinZone(tr.ids) }
      const a = garn.act(r, { atTrial: tr.index })
      setAct(a)
      setCheckin(tr.ids)
      setRecorded(tr.ids)
      setFocus((f) => (f ? { ...f, index: tr.index } : f))
      cb.current.onResult?.(r, a)
      cancelAnimationFrame(tweenRef.current)
      rippleRef.current = 0
      ambRef.current.t0 = performance.now()
      if (reducedMotion()) {
        frameRef.current = end
        render()
        return
      }
      const t0 = performance.now()
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / 340)
        const e = 1 - Math.pow(1 - p, 4)
        frameRef.current = { ...end, cam: [fromCam[0] + (end.cam[0] - fromCam[0]) * e, fromCam[1] + (end.cam[1] - fromCam[1]) * e] }
        render()
        if (p < 1) tweenRef.current = requestAnimationFrame(step)
      }
      tweenRef.current = requestAnimationFrame(step)
    },
    [render, status],
  )

  useImperativeHandle(ref, () => ({ run, reset, checkIn, focusOn }), [run, reset, checkIn, focusOn])

  const sceneAt = (e: PointerEvent<HTMLDivElement>) => {
    const sig = sigRef.current
    const d = dataRef.current
    if (!sig || !d) return
    const box = e.currentTarget.getBoundingClientRect()
    const s = ((e.clientX - box.left) / box.width) * sig.nSamples
    const analysed = d.trials.filter((t) => t.w1 > t.w0)
    if (!analysed.length) return
    let hit = s < analysed[0].start ? analysed[0] : analysed[analysed.length - 1]
    for (const t of analysed) if (s >= t.start && s < t.start + t.length) hit = t
    focusOn(hit.index)
  }
  const onStripKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!focus || status !== 'result') return
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    const next = e.key === 'Home' ? focus.first : e.key === 'End' ? focus.last : Math.min(focus.last, Math.max(focus.first, focus.index + delta))
    if (next === focus.index) return
    e.preventDefault()
    focusOn(next)
  }

  // pinned states: ?state=idle | ?state=result | ?t=<ms>. The stage reports ready only once the pinned state is drawn.
  useEffect(() => {
    if (!ready) return
    let dead = false
    const done = () => {
      if (!dead) setPinDone(true)
    }
    if (pinnedT !== undefined && Number.isFinite(pinnedT)) void showAt(Math.max(0, pinnedT)).then(done)
    else if (pinned === 'result') void showAt(DURATION).then(done)
    else {
      if (pinned === 'idle') reset()
      done()
    }
    return () => {
      dead = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinned, pinnedT, sampleId, mode])
  const exposed = ready && pinDone
  useEffect(() => {
    if (exposed) cb.current.onReady?.()
  }, [exposed])

  useEffect(() => stop, [stop])

  // the resting stage (idle, or the settled result) keeps replaying; a pinned t and reduced motion hold still
  useEffect(() => {
    // (not before the pinned state is on stage: a stage that is still loading its result is left alone)
    const on = exposed && pinnedT === undefined && !reducedMotion() && (status === 'idle' || status === 'result')
    ambRef.current = { on, t0: performance.now() }
    if (!on) return
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      // about 40 frames a second is plenty for a playhead at 1x, and leaves the main thread to the page
      if (!document.hidden && now - last > 24) {
        last = now
        render()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ambRef.current.on = false
    }
  }, [exposed, status, pinnedT, render])

  const railOn = ready && (status === 'idle' || status === 'result')
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!railOn) return
    const cur = checkin ?? 1
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    const next = e.key === 'Home' ? 1 : e.key === 'End' ? 7 : Math.min(7, Math.max(1, cur + delta))
    if (next === checkin || (delta === 0 && e.key !== 'Home' && e.key !== 'End')) return
    e.preventDefault()
    checkIn(next)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-stop="${next}"]`)?.focus()
  }

  const L = layout
  const scenesOn = status === 'result' && act !== null
  const shown = act !== null && checkin !== null && act.checkinIds === checkin
  const hx = L && checkin !== null ? stopX(L, checkin) : 0
  const edge = L ? 60 * L.u : 96
  const wordAlign = !L ? 'mid' : hx < edge ? 'start' : hx > L.w - edge ? 'end' : 'mid'
  const moved = recorded !== null && checkin !== null && checkin !== recorded && status === 'result'
  // whose answer the handle shows: the test person's own rating for the scene in view, or the viewer's once they moved it
  const said = checkin ?? recorded
  // what the dial prints: the check-in in Garns, whose answer it is, and the engine's status word for it
  const dialSaid = shown && act && checkin !== null ? { value: saidGarn(checkin), who: moved || status === 'idle' ? 'you said' : 'the person said', word: STATUS_WORD[act.severity] ?? act.tierName } : null
  saidRef.current = dialSaid
  const dialKey = dialSaid ? `${dialSaid.value}|${dialSaid.who}|${dialSaid.word}` : ''
  useEffect(() => {
    render()
  }, [dialKey, render])
  const seg = L ? (L.rail.x1 - L.rail.x0) / 6 : 48
  return (
    <div
      ref={rootRef}
      className={`gm-root${className ? ` ${className}` : ''}`}
      style={style}
      data-state={status}
      data-ready={exposed ? '1' : undefined}
      data-source={source ?? undefined}
      data-checkin={checkin ?? undefined}
      data-zone={act ? act.zone.toLowerCase() : undefined}
      data-focus={focus && status !== 'idle' ? focus.index : undefined}
      data-notes={annotations ? '1' : '0'}
      data-narrow={L?.narrow ? '1' : undefined}
    >
      <canvas ref={canvasRef} className="gm-canvas" role="img" aria-label="A recording, not live: fourteen brainwave (EEG) traces of one test person, with the model's estimate and the person's own ratings over the session" />
      {L && annotations && (
        <>
          {/* idle: the one sentence that says what the traces are and what Play will show */}
          <span className="gm-say" style={{ left: L.head.x, top: L.head.y, width: L.col.w, fontSize: L.big }}>
            Recorded brainwaves. Can a model tell how sick this person felt?
          </span>
          {/* once playing: the traces' name (what is in view) and a time scale; under them, the name of the 4 s window */}
          <span className="gm-scale" style={{ left: L.head.x, top: L.head.y, width: L.col.w }}>
            <span ref={viewRef} className="gm-view">
              Recorded brainwaves
            </span>
            <span className="gm-scale-bar" data-qa="tick">
              <i ref={scaleBarRef} />
              <span ref={scaleTextRef}>1 s</span>
            </span>
          </span>
          <span ref={readsRef} className="gm-reads" style={{ left: 0, top: L.under }}>
            what the model reads
          </span>

          {/* the two lines of the strip, named: the person's own ratings, and the engine's sentence for the model's estimate
              with where its values come from */}
          <span className="gm-legend" style={{ left: L.legend.x, top: L.legend.y, width: L.legend.w }}>
            <span>
              <i className="gm-key gm-key-own" />
              what the person said
            </span>
            <span>
              <i className="gm-key gm-key-eeg" />
              {source && <b className="gm-tag">{source === 'live' ? 'LIVE' : 'REPLAY'}</b>}
              {garn.STRINGS.eegLine}
            </span>
          </span>

          {/* the session strip: its axis and the scene in view */}
          <span className="gm-axis" data-qa="tick" style={{ left: L.strip.x + 2, top: L.plot.top + 3 }}>
            1 Garn
          </span>
          <span className="gm-axis" data-qa="tick" style={{ left: L.strip.x + 2, top: L.plot.base - Math.round(14 * L.u) - 2 }}>
            0
          </span>
          <span ref={tagRef} className="gm-tag-scene" data-qa="tick" style={{ left: 0, top: L.strip.y }}>
            scene
          </span>

          {/* the rail: the question; at the result one large line with both values takes its place */}
          <span ref={askRef} className="gm-ask" style={{ left: L.rail.x0 - 9 * L.u, top: L.rows.status - 8 - Math.round(L.big * 1.2), fontSize: L.big }}>
            How sick do you feel?
          </span>
          <span ref={verdictRef} className="gm-verdict" style={{ left: L.col.x, width: L.col.w, top: L.rows.big, fontSize: L.big }}>
            <span>
              Brainwave model <span ref={verdictNumRef}>0.00</span>
            </span>
            <i aria-hidden="true"> · </i>
            <b>{said !== null ? `${moved ? 'you' : 'the person'} said ${saidGarn(said)} Garn` : ''}</b>
          </span>
          <span ref={eegRef} className="gm-eeg" style={{ left: 0, top: L.rows.status }}>
            model <span ref={eegNumRef}>0.00</span>
          </span>
          {shown && act && checkin !== null && (
            <span key={act.severity} className={`gm-status gm-status-${wordAlign}`} data-zone={act.zone.toLowerCase()} style={{ left: hx, top: L.rows.status }}>
              <b>{STATUS_WORD[act.severity] ?? act.tierName}</b>
              {status === 'idle' ? ` ${saidGarn(checkin)} Garn` : ''}
            </span>
          )}
          {ready && status === 'idle' && checkin === null && (
            <span className="gm-status gm-status-mid gm-hint" style={{ left: stopX(L, 4), top: L.rows.status }}>
              tap to answer
            </span>
          )}
        </>
      )}
      {L && (
        <div
          className="gm-scenes"
          role="slider"
          aria-label="Scene in view"
          aria-orientation="horizontal"
          aria-valuemin={focus?.first ?? 1}
          aria-valuemax={focus?.last ?? 1}
          aria-valuenow={focus?.index ?? 1}
          aria-valuetext={focus ? `Scene ${focus.index} of ${focus.of}` : 'No scene yet'}
          aria-disabled={!scenesOn || !focus || focus.first === focus.last}
          tabIndex={scenesOn && focus && focus.first !== focus.last ? 0 : -1}
          style={{ left: L.strip.x, top: L.strip.y, width: L.strip.w, height: L.strip.h }}
          onKeyDown={onStripKey}
          onPointerDown={(e) => {
            if (!scenesOn) return
            dragRef.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            sceneAt(e)
          }}
          onPointerMove={(e) => {
            if (dragRef.current) sceneAt(e)
            // mouse only: a faint band shows which scene a click would bring into view
            const sig = sigRef.current
            const h = hoverRef.current
            if (!sig || !h || e.pointerType !== 'mouse' || !scenesOn) return
            const box = e.currentTarget.getBoundingClientRect()
            const s = ((e.clientX - box.left) / box.width) * sig.nSamples
            const tr = sig.trials.find((x) => s >= x.start && s < x.start + x.length)
            h.style.opacity = tr ? '1' : '0'
            if (tr) {
              h.style.left = `${(tr.start / sig.nSamples) * 100}%`
              h.style.width = `${(tr.length / sig.nSamples) * 100}%`
            }
          }}
          onPointerLeave={() => {
            if (hoverRef.current) hoverRef.current.style.opacity = '0'
          }}
          onPointerUp={() => (dragRef.current = false)}
          onPointerCancel={() => (dragRef.current = false)}
        >
          <span ref={hoverRef} className="gm-scene-hover" style={{ top: L.plot.top - 4 - L.strip.y, height: L.plot.base - L.plot.top + 4 }} />
        </div>
      )}
      {L && (
        <div
          className="gm-stops"
          role="radiogroup"
          aria-label="Check-in: how sick do you feel, from 1 (not sick) to 7 (very sick)"
          aria-disabled={!railOn}
          onKeyDown={onKey}
          // the handle can also be dragged along the rail: it snaps from stop to stop, and the dial follows
          onPointerDown={(e) => {
            const stopEl = (e.target as HTMLElement).closest<HTMLElement>('.gm-stop')
            if (!railOn || !stopEl) return
            railDrag.current = { on: true, moved: false, x: e.clientX, n: checkin ?? 0 }
            stopEl.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const g = railDrag.current
            const root = rootRef.current
            if (!g.on || !root) return
            if (!g.moved && Math.abs(e.clientX - g.x) < 8) return
            g.moved = true
            const box = root.getBoundingClientRect()
            const n = clampN(Math.round(1 + ((e.clientX - box.left - L.rail.x0) / (L.rail.x1 - L.rail.x0)) * 6), 1, 7)
            if (n === g.n) return
            g.n = n
            checkIn(n)
          }}
          onPointerUp={() => {
            railDrag.current.on = false
            setTimeout(() => (railDrag.current.moved = false), 0)
          }}
          onPointerCancel={() => {
            railDrag.current.on = false
            railDrag.current.moved = false
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const word = moved && n === recorded ? 'they said' : n === 1 ? 'not sick' : n === 7 ? 'very sick' : null
            return (
              <button
                key={n}
                type="button"
                role="radio"
                className="gm-stop"
                data-stop={n}
                data-qa="tick"
                data-own={moved && n === recorded ? '1' : undefined}
                aria-checked={checkin === n}
                aria-label={`Check-in ${n} of 7, ${((n - 1) / 6).toFixed(2)} Garn`}
                disabled={!railOn}
                tabIndex={railOn && (checkin ?? 1) === n ? 0 : -1}
                style={{ left: stopX(L, n), top: L.rail.y - 24, width: Math.max(44, Math.floor(seg)) }}
                onClick={() => {
                  if (railDrag.current.moved) return
                  checkIn(n)
                }}
              >
                <span className="gm-stop-n">{n}</span>
                {annotations && word && <span className="gm-stop-w">{word}</span>}
              </button>
            )
          })}
        </div>
      )}
      {!ready && status !== 'error' && <span className="gm-wait">Loading the recording</span>}
      {status === 'error' && (
        <div className="gm-error" role="alert">
          The recording did not load.
          <button type="button" onClick={() => (sigRef.current ? void run() : location.reload())}>
            Try again
          </button>
        </div>
      )}
    </div>
  )
})

export default GarnMoment

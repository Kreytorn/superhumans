// Garn Meter moment: the stage only. The real 14-channel EEG, the model's marks on it (the 4 s window), and the
// model's own reading: a line over the whole session and the Garn gauge (r4: model output only, no check-in on stage).
// At idle the stage is the recording under one sentence; Play runs the model over the session and the gauge follows its
// reading. The session strip is then a handle on the specimen: tap or drag it to bring another scene into view.
// No page chrome: the page gets the reading through onResult(result, act, reading).
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import './moment.css'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import * as garn from '../../engine/garnmeter'
import type { GarnAct, GarnResult } from '../../engine/garnmeter'
import { loadSessionData } from '../../engine/garnmeter/data'
import { preferBackends } from '../../lib/infer/client'
import { drawScene, layoutFor, scanPx, stripSampleX, timeScale, type Layout, type Palette, type Signal } from './draw'
import { CALIBRATE_END, calibrateFrame, DURATION, frameAt, idleAmbient, idleFrame, resultAmbient, sceneReading, stageData, type Frame, type StageData } from './timeline'

export { BEATS, DURATION, HERO_TRIAL } from './timeline'
export type MomentState = 'idle' | 'running' | 'result' | 'error'

// This model is tiny: wasm is the faster backend for it (model brief, section 3), so it is asked for first.
preferBackends('garnmeter/garn', ['wasm'])

export interface GarnMomentProps {
  /** Engine sample id. Default: the whole session of the held-out test person ('user19-s3'). A single scene ('user19-s3-t24') also works. */
  sampleId?: string
  /** auto: the real model on a laptop, stored outputs on a phone, when the model fails, or for a run the live model
   *  has not answered within 4 s of the press (a slow first download). */
  mode?: 'auto' | 'live' | 'replay'
  /** Pins the stage: 'idle' = before the action, 'result' = settled, no animation. */
  state?: 'idle' | 'result'
  /** Pins the timeline at this many ms (0 to DURATION). */
  t?: number
  /** Called when the result settles and again after every scene change. `reading` is what the gauge shows: the model's
   *  reading for the scene in view. `act` is the engine's decision for that scene (Tier C: it follows the study's own
   *  rating, not the model); the stage itself no longer shows it. */
  onResult?: (result: GarnResult, act: GarnAct, reading: GarnReading) => void
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
  /** Brings another analysed scene (1-based trial index) into view, as a tap on the session strip does. */
  focusOn: (trial: number) => void
}

/** What the gauge settles on, for the page: the model's reading for the scene in view, and the lines that go with it. */
export interface GarnReading {
  /** The model's reading in Garns (0 = fine, 1 = totally sick): the mean of the scene's 4 s windows. */
  garn: number
  /** The scene (1-based trial index) the reading is for. */
  trial: number
  /** How many 4 s windows the mean is over. */
  windows: number
  /** 'live' = the model ran now in this browser; 'precomputed' = the stored outputs of the same model (REPLAY). */
  source: 'live' | 'precomputed'
  /** Fixed engine lines for a "How do we know?" layer, verbatim. */
  notes: string[]
}

const DEFAULT_SAMPLE = 'user19-s3'
/** How long a run waits for the live model after the press before it plays the stored outputs instead (auto mode). */
const LIVE_WAIT_MS = 4000

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
    accentRgb: rgb(accent),
    fieldHi: rgb(v('--m-field-hi', '#ff6fc4')),
    fieldLo: rgb(v('--m-field-lo', '#31d6f0')),
    fieldMid,
  }
}


/** The reading for the scene in view, and the engine's fixed lines that go with it. */
function readingOf(r: GarnResult, d: StageData): GarnReading | null {
  const garnValue = sceneReading(d)
  if (garnValue === null) return null
  const notes: string[] = [garn.STRINGS.personLabel, garn.STRINGS.garnDefinition, garn.STRINGS.groundAnalog, garn.STRINGS.playback]
  if (r.source === 'precomputed') notes.push(`REPLAY: ${garn.STRINGS.precomputedLabel}.`)
  return { garn: garnValue, trial: d.focus.index, windows: d.focus.w1 - d.focus.w0, source: r.source, notes }
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
  /** The result whose data is on stage (a run that fell back to the stored outputs shows those, not the cached live one). */
  const onStageRef = useRef<GarnResult | null>(null)
  const frameRef = useRef<Frame>(idleFrame(1024))
  /** The frame on stage: frameRef, plus the playhead that keeps the resting stage alive (idle and settled result). */
  const shownRef = useRef<Frame>(frameRef.current)
  const ambRef = useRef({ on: false, t0: 0 })
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
  const tagRef = useRef<HTMLSpanElement>(null)
  const widthRef = useRef({ reads: 0, tag: 0 })

  const [ready, setReady] = useState(false)
  const [pinDone, setPinDone] = useState(false)
  const [status, setStatus] = useState<MomentState>('idle')
  const [layout, setLayout] = useState<Layout | null>(null)
  const [reading, setReading] = useState<GarnReading | null>(null)
  const [source, setSource] = useState<'live' | 'precomputed' | null>(null)
  const [focus, setFocus] = useState<{ index: number; first: number; last: number; of: number } | null>(null)
  const dragRef = useRef(false)
  const hoverRef = useRef<HTMLSpanElement>(null)

  /** Places the labels that ride on moving marks: the time scale, the 4 s window's name, the scene tag. */
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
    drawScene(ctx, L, palRef.current, sig, dataRef.current, fr, dprRef.current)
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
      widthRef.current = { reads: 0, tag: 0 }
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
      widthRef.current = { reads: 0, tag: 0 }
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

  /** Puts a result on stage (no frame yet): stage data for the scene the moment zooms into. */
  const adopt = useCallback((r: GarnResult) => {
    const sig = sigRef.current
    if (!sig) return null
    const d = stageData(r, sig.nSamples, sig.baseline.length)
    dataRef.current = d
    onStageRef.current = r
    setSource(r.source)
    const analysed = d.trials.filter((t) => t.w1 > t.w0)
    setFocus({ index: d.focus.index, first: analysed[0]?.index ?? d.focus.index, last: analysed[analysed.length - 1]?.index ?? d.focus.index, of: d.trials.length })
    return d
  }, [])

  /** Tells the page what the gauge shows (the model's reading for the scene in view). */
  const report = useCallback((r: GarnResult, d: StageData) => {
    const g = readingOf(r, d)
    setReading(g)
    if (g) cb.current.onResult?.(r, garn.act(r, { atTrial: d.focus.index }), g)
  }, [])

  const settle = useCallback(
    (r: GarnResult, d: StageData) => {
      frameRef.current = frameAt(DURATION, d)
      render()
      setStatus('result')
      report(r, d)
    },
    [render, report],
  )

  const stop = useCallback(() => {
    runRef.current++
    palRef.current = null // tokens are read again on the next draw, so a restyle shows on the next run or reset
    cancelAnimationFrame(rafRef.current)
    cancelAnimationFrame(tweenRef.current)
  }, [])

  const clearStage = useCallback(() => {
    dataRef.current = null
    onStageRef.current = null
    setReading(null)
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
          setReading(null)
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
    const take = (r: GarnResult) => {
      if (got || id !== runRef.current) return
      const d = adopt(r)
      if (d) got = { r, d }
    }
    getResult().then(take, (e) => {
      console.error('garnmeter moment: no result', e)
      if (!got && id === runRef.current) {
        runRef.current++
        setStatus('error')
      }
    })
    // A slow first download of the live model (a cold browser on a slow network) never keeps the stage waiting long:
    // after LIVE_WAIT_MS this run plays the stored outputs of the same model, tagged REPLAY; the live model keeps loading
    // and answers the next run. Only in auto mode (an explicit ?mode=live waits for the live model).
    if (mode === 'auto' && !isPhone())
      window.setTimeout(() => {
        if (!got && id === runRef.current) garn.replay(sampleId).then(take, () => undefined)
      }, LIVE_WAIT_MS)
    let t0 = performance.now()
    const pressedAt = t0
    const fs = sigRef.current.fs
    const tick = () => {
      if (id !== runRef.current) return
      let t = performance.now() - t0
      if (!got) {
        if (t > CALIBRATE_END) {
          t0 += t - CALIBRATE_END
          t = CALIBRATE_END
        }
        // while the model is still loading, the recording keeps playing at 1x (a playhead over the 8 s at rest), so
        // the stage never stands still on a slow first load
        const fr = calibrateFrame(t, baseline)
        frameRef.current = t >= CALIBRATE_END ? idleAmbient(fr, baseline, fs, performance.now() - pressedAt) : fr
      } else {
        if (t >= DURATION) return settle(got.r, got.d)
        frameRef.current = frameAt(t, got.d)
      }
      render()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [adopt, clearStage, getResult, mode, render, sampleId, settle, showAt, stop])

  /** Another scene comes into view: the traces pan to it and the gauge moves to the model's reading for it. */
  const focusOn = useCallback(
    (trialIndex: number) => {
      const r = onStageRef.current
      const d = dataRef.current
      if (!r || !d || status !== 'result') return
      const tr = d.trials.find((x) => x.index === trialIndex && x.w1 > x.w0)
      if (!tr || tr.index === d.focus.index) return
      const from = frameRef.current
      const nd = { ...d, focus: tr }
      dataRef.current = nd
      const end = frameAt(DURATION, nd)
      setFocus((f) => (f ? { ...f, index: tr.index } : f))
      report(r, nd)
      cancelAnimationFrame(tweenRef.current)
      ambRef.current.t0 = performance.now()
      const est = end.estimate
      if (reducedMotion() || !est || !from.estimate) {
        frameRef.current = end
        render()
        return
      }
      const g0 = from.estimate.garn
      const t0 = performance.now()
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / 420)
        const e = 1 - Math.pow(1 - p, 4)
        frameRef.current = {
          ...end,
          cam: [from.cam[0] + (end.cam[0] - from.cam[0]) * e, from.cam[1] + (end.cam[1] - from.cam[1]) * e],
          estimate: { ...est, garn: g0 + (est.garn - g0) * e },
          mean: e,
        }
        render()
        if (p < 1) tweenRef.current = requestAnimationFrame(step)
      }
      tweenRef.current = requestAnimationFrame(step)
    },
    [render, report, status],
  )

  useImperativeHandle(ref, () => ({ run, reset, focusOn }), [run, reset, focusOn])

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

  const L = layout
  const scenesOn = status === 'result' && reading !== null
  return (
    <div
      ref={rootRef}
      className={`gm-root${className ? ` ${className}` : ''}`}
      style={style}
      data-state={status}
      data-ready={exposed ? '1' : undefined}
      data-source={source ?? undefined}
      data-reading={reading ? reading.garn.toFixed(2) : undefined}
      data-focus={focus && status !== 'idle' ? focus.index : undefined}
      data-notes={annotations ? '1' : '0'}
      data-narrow={L?.narrow ? '1' : undefined}
    >
      <canvas
        ref={canvasRef}
        className="gm-canvas"
        role="img"
        aria-label="A recording, not live: fourteen brainwave (EEG) traces of one test person, the model's reading over the session, and the Garn gauge with the model's reading"
      />
      {/* what the gauge shows, for screen readers (the gauge itself is drawn on the canvas) */}
      <span className="gm-sr" aria-live="polite">
        {reading ? `The model reads ${reading.garn.toFixed(2)} Garn for scene ${reading.trial}.` : ''}
      </span>
      {L && annotations && (
        <>
          {/* idle: the one sentence that says what the traces are and what Play will show */}
          <span className="gm-say" style={{ left: L.head.x, top: L.head.y, width: L.col.w, fontSize: L.big }}>
            Recorded brainwaves. Can a model read motion sickness in them?
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

          {/* the strip's line, named: the model's reading, where its values come from, and one quiet tag */}
          <span className="gm-legend" style={{ left: L.legend.x, top: L.legend.y, width: L.legend.w }}>
            <span>
              <i className="gm-key gm-key-eeg" />
              {source && <b className="gm-tag">{source === 'live' ? 'LIVE' : 'REPLAY'}</b>}
              the model’s reading, every half second
            </span>
            <span className="gm-exp">experimental model</span>
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

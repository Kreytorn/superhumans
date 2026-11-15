// TrackTrace signature moment: the real nucleus on a stage, IonScan's reading and result animating onto it, and
// one interaction (point at any nucleus of the sample and the lens shows it). Stage only: no title, no chrome.
// One timeline, a pure function of a clock (see stage.ts). Restyle with the --m-* custom properties (README.md).
import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent,
} from 'react'
import * as tt from '../../../engine/tracktrace'
import type { NucleusResult, TrackTraceAct, WellResult, WellSummary } from '../../../engine/tracktrace'
import {
  N, T, buildAtlas, drawFrame, fitOf, heatCanvas, layout, nucleusCanvas, rgbOf, tileAt, timelineEnd,
  tokenCanvas, whitePoint, type Atlas, type BeatName, type Colors, type FrameInfo, type Scene,
} from './stage'
import { POOL_IDS, commit, peekNext } from './pool'
import './moment.css'

export { BEATS, T as BEAT_TIMES } from './stage'
export type { BeatName } from './stage'
export { POOL, POOL_IDS } from './pool'

export type MomentState = 'idle' | 'running' | 'result' | 'error'

export interface MomentBeat {
  beat: BeatName
  /** 0..7 while one of the eight scans runs, else -1. */
  scan: number
  /** Circles landed so far (ends at result.count). */
  count: number
  /** Nuclei of the whole sample read so far. */
  read: number
  /** Whether the track line is on screen. */
  line: boolean
  /** Index of the nucleus under the lens after the result (null = the hero nucleus). */
  picked: number | null
}

export interface TrackTraceMomentProps {
  /**
   * A gallery nucleus id: pins the stage to that nucleus. Left out, every visit and every new run shows the next
   * nucleus of a shuffled pool (POOL in pool.ts), with no repeat until the pool is used up.
   */
  sampleId?: string
  /** Gallery nucleus ids to cycle through instead of the built-in pool (used only when sampleId is left out). */
  pool?: string[]
  /** Show the on-stage "Next nucleus" control (default true; never shown when sampleId, state or t pins the stage). */
  stepper?: boolean
  /** Fires with the id of the nucleus on stage, at mount and whenever it changes. */
  onSample?: (sampleId: string) => void
  /** auto = live IonScan on a laptop, stored outputs on a phone, when pinned, or on failure. */
  mode?: 'auto' | 'live' | 'replay'
  /** Pins the stage: idle = before the action, result = settled result, no animation. */
  state?: 'idle' | 'result'
  /** Pins the timeline at this many ms. */
  t?: number
  /** Fires once per run at the settled result. act is the whole-sample "what to do next" (null if unknown). */
  onResult?: (result: NucleusResult, act: TrackTraceAct | null, well: WellResult | null) => void
  onState?: (state: MomentState) => void
  /** Fires whenever the beat, the landed count or the lens changes, so a page can land its number in step. */
  onBeat?: (beat: MomentBeat) => void
  /** Draw the on-specimen notes (scan caption, count, verdict, LIVE / REPLAY). false = the page writes them. */
  annotate?: boolean
  /** The one line on the idle stage: what pressing will find. '' = none. */
  promise?: string
  /** Tapping the idle specimen starts the run. */
  tapToRun?: boolean
  /** True once the idle specimen (or the pinned frame) is on screen. */
  onReady?: (ready: boolean) => void
  className?: string
  style?: CSSProperties
}

export interface TrackTraceMomentHandle {
  run: () => Promise<void>
  reset: () => void
  /** Steps to the next nucleus of the pool (no-op when a sampleId pins the stage). After a run it reads the new one at once. */
  next: () => void
}

const DEFAULTS: Colors = { stage: '#0b0f12', specimen: '#ece7db', ink: '#f4f2ec', ink2: '#8a9299', mark: '#ff4fb0', accent: '#ffffff' }
const PARTICLE_WORD: Record<string, string> = { sham: 'no radiation', 'X-ray': 'X-rays', Fe: 'iron ion' }
const TIME_WORD: Record<string, string> = { '4 h': 'four hours', '24 h': '24 hours', '48 h': '48 hours' }
const PX = N * N
const PROMISE = 'Find the DNA damage in this cell nucleus, and whether it falls along the straight track of a heavy ion.'

const mq = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches
const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))
/** Swapping nuclei: the old picture fades out for this long before the new one is drawn; then it rests before a run starts. */
const SWAP_OUT = 200
const SWAP_REST = 650

function emptyScene(): Scene {
  return {
    W: 0, H: 0, colors: DEFAULTS, annotate: true, touch: false, hero: null, heroTok: null, tok: null, result: null,
    heat: null, well: null, atlas: null, wellIndex: -1, fit: { z: 1, cx: N / 2, cy: N / 2, r: N / 2 }, pick: null, pickImg: null,
    pickFit: null, pickResult: null,
  }
}

const TrackTraceMoment = forwardRef<TrackTraceMomentHandle, TrackTraceMomentProps>(function TrackTraceMoment(props, ref) {
  const { mode = 'auto', annotate = true, tapToRun = true, stepper = true, promise = PROMISE, className, style } = props
  const pinned = props.state !== undefined || props.t !== undefined
  // which nucleus: a given sampleId pins it; otherwise the next one of the shuffled pool (a pinned frame shows the pool's first)
  const poolSig = (props.pool && props.pool.length ? props.pool : POOL_IDS).join(',')
  const poolIds = useMemo(() => poolSig.split(','), [poolSig])
  const [autoId, setAutoId] = useState(() => peekNext(poolIds))
  const free = props.sampleId === undefined
  const sampleId = props.sampleId ?? (pinned ? poolIds[0] : autoId)
  const canStep = free && !pinned && poolIds.length > 1
  const P = useRef(props)
  P.current = props

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const sampleRef = useRef<HTMLDivElement>(null)
  const S = useRef({
    scene: emptyScene(), dpr: 1, raf: 0, start: 0, t: 0, gen: 0, state: 'idle' as MomentState, live: false,
    x: null as Float32Array | null, imgs: null as Float32Array | null, summary: null as WellSummary | null,
    resultP: null as Promise<NucleusResult> | null, warmP: null as Promise<unknown> | null,
    wellP: null as Promise<void> | null, wellDone: false, holdSince: 0, lastKey: '', fired: false,
    lensWant: null as number | null, lensBusy: false, lensTimer: 0, lensFailed: false, heroP: null as Promise<void> | null,
    id: sampleId, ran: false, pendingRun: false, pendingGen: -1, atlasKey: '', atlas: null as Atlas | null,
  }).current

  const [state, setStateRaw] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [ui, setUi] = useState<FrameInfo | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [, bump] = useState(0)

  const setState = useCallback((s: MomentState) => {
    if (S.state === s) return
    S.state = s
    setStateRaw(s)
    P.current.onState?.(s)
  }, [S])

  const draw = useCallback((t: number) => {
    const cv = canvasRef.current
    if (!cv || !S.scene.W) return
    const ctx = cv.getContext('2d')!
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
    S.t = t
    const info = drawFrame(ctx, S.scene, t)
    const note = noteRef.current
    if (note) {
      // under the nucleus (centred) while it fills the stage; beside the docked lens after the pull-back
      if (note.dataset.dock !== info.dock) {
        note.dataset.dock = info.dock
        note.style.maxWidth = info.dock ? `${Math.round(info.noteW)}px` : ''
      }
      const x = Math.round(info.noteX)
      const y = Math.round(info.noteY)
      note.style.transform =
        info.dock === 'col' ? `translate(${x}px, ${y}px)` : info.dock === 'band' ? `translate(${x}px, ${y}px) translateY(-50%)` : `translate(${x}px, ${y}px) translateX(-50%)`
      note.style.opacity = info.note === 'none' ? '0' : String(info.noteAlpha)
    }
    const sample = sampleRef.current
    if (sample) {
      sample.style.opacity = String(info.sampleAlpha)
      sample.style.left = `${Math.round(info.sampleX)}px`
      sample.style.width = `${Math.round(info.sampleW)}px`
    }
    const key = `${info.beat}|${info.scan}|${info.count}|${info.read}|${info.note}|${info.dock}|${info.lineShown}|${info.verdictShown}|${S.scene.pick}`
    if (key !== S.lastKey) {
      S.lastKey = key
      setUi(info)
      P.current.onBeat?.({ beat: info.beat, scan: info.scan, count: info.count, read: info.read, line: info.lineShown, picked: S.scene.pick })
    }
  }, [S])

  const readColors = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const cs = getComputedStyle(el)
    const v = (name: string, d: string) => cs.getPropertyValue(name).trim() || d
    S.scene.colors = {
      stage: v('--m-stage', DEFAULTS.stage), specimen: v('--m-specimen', DEFAULTS.specimen), ink: v('--m-ink', DEFAULTS.ink),
      ink2: v('--m-ink-2', DEFAULTS.ink2), mark: v('--m-mark', DEFAULTS.mark), accent: v('--m-accent', DEFAULTS.accent),
    }
  }, [S])

  const resize = useCallback(() => {
    const el = rootRef.current
    const cv = canvasRef.current
    if (!el || !cv) return
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return
    S.dpr = Math.min(window.devicePixelRatio || 1, mq('(pointer: coarse)') ? 1.5 : 2)
    S.scene.W = r.width
    S.scene.H = r.height
    cv.width = Math.round(r.width * S.dpr)
    cv.height = Math.round(r.height * S.dpr)
    el.dataset.narrow = r.width < 600 ? '1' : '0'
    draw(S.t)
  }, [S, draw])

  const stop = useCallback(() => {
    cancelAnimationFrame(S.raf)
    S.raf = 0
  }, [S])

  /** On a laptop the lens runs IonScan live on whichever nucleus it rests on (one run at a time, latest wins). */
  const liveLens = useCallback((i: number) => {
    if (!S.imgs || S.scene.result?.source !== 'live') return
    S.lensWant = i
    if (S.lensBusy) return
    S.lensBusy = true
    const gen = S.gen
    void (async () => {
      while (S.lensWant !== null && gen === S.gen) {
        const k: number = S.lensWant
        S.lensWant = null
        if (S.scene.pick !== k || !S.imgs || !S.scene.well) continue
        try {
          const r = await tt.analyzeInput(S.imgs.slice(k * PX, (k + 1) * PX), S.scene.well.nuclei[k].key)
          if (gen === S.gen && S.scene.pick === k) {
            S.scene.pickResult = r
            draw(S.t)
            bump((n) => n + 1)
          }
        } catch {
          // keep the stored circle centres, and say so
          if (gen === S.gen && S.scene.pick === k) {
            S.lensFailed = true
            bump((n) => n + 1)
          }
        }
      }
      S.lensBusy = false
    })()
  }, [S, draw])

  const setPick = useCallback((i: number | null) => {
    const sc = S.scene
    const next = i === sc.wellIndex ? null : i
    if (next === sc.pick) return
    sc.pick = next
    sc.pickResult = null
    S.lensFailed = false
    clearTimeout(S.lensTimer)
    if (next !== null) S.lensTimer = window.setTimeout(() => liveLens(next), sc.touch ? 0 : 90)
    sc.pickImg = next !== null && S.imgs ? nucleusCanvas(S.imgs, next * PX, rgbOf(sc.colors.specimen)) : null
    sc.pickFit = next !== null && S.imgs ? fitOf(S.imgs, next * PX) : null
    setPicked(next)
    draw(S.t)
  }, [S, draw, liveLens])

  /** The nucleus result: live IonScan, or the stored outputs. Falls back to the stored outputs on any failure. */
  const ensureResult = useCallback((gen: number, id: string) => {
    if (S.resultP) return S.resultP
    const stored = () => tt.replay(id)
    const livePath = async () => {
      await S.warmP?.catch(() => undefined)
      await tt.load()
      return tt.analyze(id)
    }
    const p = (S.live
      ? Promise.race([livePath(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('live run timed out')), 20000))]).catch(stored)
      : stored()
    ).then((r) => {
      if (gen !== S.gen) return r
      const sc = S.scene
      sc.result = r
      sc.heat = r.fociProb ? heatCanvas(r.fociProb, rgbOf(sc.colors.mark)) : null
      bump((n) => n + 1)
      return r
    })
    S.resultP = p
    return p
  }, [S])

  const finish = useCallback((gen: number) => {
    if (gen !== S.gen) return
    stop()
    const sc = S.scene
    draw(timelineEnd(sc))
    setState('result')
    if (!S.fired && sc.result) {
      S.fired = true
      let act: TrackTraceAct | null = null
      try {
        act = sc.well ? tt.act(sc.well) : S.summary ? tt.act(S.summary) : null
      } catch {
        act = null
      }
      P.current.onResult?.(sc.result, act, sc.well)
    }
  }, [S, draw, setState, stop])

  const reset = useCallback(() => {
    stop()
    S.resultP = null
    S.fired = false
    S.holdSince = 0
    S.pendingRun = false
    S.pendingGen = -1
    const sc = S.scene
    sc.result = null
    sc.heat = null
    sc.pick = null
    sc.pickImg = null
    sc.pickFit = null
    sc.pickResult = null
    clearTimeout(S.lensTimer)
    setPicked(null)
    draw(0)
    if (sc.hero || S.state === 'running') setState('idle')
  }, [S, draw, setState, stop])

  /** Plays the timeline on the nucleus that is on stage now. */
  const start = useCallback(async (gen: number) => {
    const sc = S.scene
    if (gen !== S.gen || !sc.hero) return
    S.ran = true
    S.pendingGen = -1
    setState('running')
    const rp = ensureResult(gen, S.id)
    rp.catch(() => {
      if (gen !== S.gen) return
      stop()
      setError('The model result could not be loaded. Check the connection and try again.')
      setState('error')
    })
    if (mq('(prefers-reduced-motion: reduce)')) {
      // reduced motion: no playback, the end state
      await rp.catch(() => undefined)
      await Promise.race([S.wellP, new Promise((res) => setTimeout(res, 10000))])
      if ((S.state as MomentState) === 'running') finish(gen)
      return
    }
    S.start = performance.now()
    const frame = (now: number) => {
      if (gen !== S.gen || S.state !== 'running') return
      let t = now - S.start
      // the scans keep reading until the model has answered
      if (!sc.result && t >= T.FOCI) {
        S.start += T.FOCI - T.SCANS
        t -= T.FOCI - T.SCANS
      }
      // hold on the finished nucleus until its sample is ready to pull back to (at most 10 s)
      if (t >= T.NUCLEUS_END && !S.wellDone) {
        if (!S.holdSince) S.holdSince = now
        if (now - S.holdSince < 10000) {
          S.start = now - T.NUCLEUS_END
          t = T.NUCLEUS_END
        }
      }
      if (t >= timelineEnd(sc)) return finish(gen)
      draw(t)
      S.raf = requestAnimationFrame(frame)
    }
    S.raf = requestAnimationFrame(frame)
  }, [S, draw, ensureResult, finish, setState, stop])

  /** Brings the next nucleus of the pool on stage. thenRun = read it as soon as it is there. */
  const advance = useCallback((thenRun: boolean) => {
    if (!canStep) return false
    commit(S.id, poolIds)
    const id = peekNext(poolIds)
    if (id === S.id) return false
    stop()
    S.pendingRun = thenRun
    if (thenRun) setState('running')
    setAutoId(id)
    return true
  }, [S, canStep, poolIds, setState, stop])

  const run = useCallback(async () => {
    if (!S.scene.hero) await S.heroP?.catch(() => undefined)
    if (!S.scene.hero || S.state === 'running') return
    // a nucleus that has been read once makes way for the next one of the pool
    if (S.ran && advance(true)) return
    if (S.state === 'result') reset()
    await start(S.gen)
  }, [S, advance, reset, start])

  const next = useCallback(() => {
    advance(S.state === 'running' || S.state === 'result')
  }, [S, advance])

  useImperativeHandle(ref, () => ({ run, reset, next }), [run, reset, next])

  // the nucleus on stage is used up in the pool's deck; tell the page which one it is
  useEffect(() => {
    if (free && !pinned) commit(sampleId, poolIds)
    P.current.onSample?.(sampleId)
  }, [sampleId, free, pinned, poolIds])
  useEffect(() => {
    if (!poolIds.includes(autoId)) setAutoId(peekNext(poolIds))
  }, [poolIds, autoId])
  useEffect(() => {
    P.current.onReady?.(ready)
  }, [ready])

  // ---- load the specimen (and, behind it, the model and the whole sample)
  useEffect(() => {
    const gen = ++S.gen
    stop()
    const keep = S.scene
    // a swap (another nucleus was on stage): the old picture fades out, the new one fades in; never a hard cut
    const root = rootRef.current
    const reduced = mq('(prefers-reduced-motion: reduce)')
    const swapping = !!keep.hero && !reduced
    const swapAt = performance.now()
    if (swapping && root) root.dataset.swap = '1'
    const pending = S.pendingRun && !pinned
    S.scene = { ...emptyScene(), W: keep.W, H: keep.H, annotate, touch: keep.touch }
    readColors()
    Object.assign(S, {
      resultP: null, warmP: null, wellP: null, wellDone: false, holdSince: 0, fired: false, summary: null, imgs: null, x: null, t: 0,
      lastKey: '', id: sampleId, ran: false, pendingRun: false, pendingGen: pending ? gen : -1,
    })
    if (!pending) setState('idle')
    setReady(false)
    setPicked(null)
    setError('')
    S.live = mode === 'live' || (mode === 'auto' && !pinned && !mq('(pointer: coarse)') && window.innerWidth >= 700)
    const alive = () => gen === S.gen
    S.heroP = (async () => {
      const [x, samples] = await Promise.all([tt.sampleImage(sampleId), tt.listSamples()])
      if (swapping) await sleep(Math.max(0, SWAP_OUT - (performance.now() - swapAt)))
      if (!alive()) return
      const sc = S.scene
      const rgb = rgbOf(sc.colors.specimen)
      const hi = whitePoint(x)
      S.x = x
      sc.hero = nucleusCanvas(x, 0, rgb, hi)
      sc.fit = fitOf(x)
      const tk = tokenCanvas(x, rgb, hi)
      sc.heroTok = tk.canvas
      sc.tok = tk.tok
      resize()
      draw(0)
      root?.removeAttribute('data-swap')
      if (!pinned) setReady(true)
      else bump((n) => n + 1)
      const meta = samples.find((s) => s.id === sampleId)?.meta
      // the whole sample this nucleus came from (only one well ships its images)
      S.wellP = (async () => {
        try {
          const wells = await tt.listWells()
          const w = wells.find((v) => v.wellId === meta?.well) ?? null
          if (!alive()) return
          S.summary = w
          if (!w?.live) return
          const [imgs, well] = await Promise.all([tt.wellImages(w.wellId), tt.replayWell(w.wellId)])
          const idx = well.nuclei.findIndex((nu) => nu.key === meta?.key)
          if (!alive() || idx < 0) return
          const tile = layout(sc.W || 1200, sc.H || 800, sc.annotate, well.nNuclei).mosaic!.tile
          // the sheet of all nuclei is built once and kept while the pool steps through nuclei of the same sample
          const key = `${w.wellId}|${tile.toFixed(2)}|${S.dpr}|${sc.colors.specimen}|${sc.colors.mark}`
          let atlas = S.atlasKey === key ? S.atlas : null
          if (!atlas) {
            atlas = await buildAtlas(imgs, well, sc.colors, tile, S.dpr, alive)
            if (!atlas || !alive()) return
            S.atlasKey = key
            S.atlas = atlas
          }
          S.imgs = imgs
          sc.well = well
          sc.atlas = atlas
          sc.wellIndex = idx
        } catch {
          // no sample view: the timeline ends on the nucleus
        } finally {
          if (alive()) S.wellDone = true
        }
      })()
      if (S.live && !pinned) S.warmP = tt.load().then(() => tt.analyze(sampleId)).catch(() => undefined)
      // "read the next one": the new nucleus rests on stage for a moment, then the reading starts by itself
      if (pending)
        void (async () => {
          if (swapping) await sleep(SWAP_REST)
          if (alive() && S.pendingGen === gen) void start(gen)
        })()
    })()
    S.heroP.catch(() => {
      if (!alive()) return
      root?.removeAttribute('data-swap')
      setError('This nucleus could not be loaded. Check the connection and reload.')
      setState('error')
      setReady(true)
    })
    return () => {
      S.gen++
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleId, mode, pinned])

  // ---- pinned frames: ?state= and ?t=
  const heroReady = !!S.scene.hero
  useEffect(() => {
    if (!pinned || !heroReady) return
    const gen = S.gen
    let off = false
    ;(async () => {
      stop()
      if (props.state === 'idle' || (props.state === undefined && (props.t ?? 0) <= 0)) {
        draw(0)
        setState('idle')
        setReady(true)
        return
      }
      await ensureResult(gen, sampleId)
      await S.wellP
      if (off || gen !== S.gen) return
      const end = timelineEnd(S.scene)
      const t = props.state === 'result' ? end : Math.min(props.t ?? 0, end)
      if (t >= end) finish(gen)
      else {
        draw(t)
        setState('running')
      }
      setReady(true)
    })().catch(() => {
      if (off) return
      setError('The model result could not be loaded. Check the connection and try again.')
      setState('error')
      setReady(true)
    })
    return () => {
      off = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, props.state, props.t, heroReady, sampleId])

  // ---- size, restyle
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => resize())
    ro.observe(el)
    resize()
    return () => ro.disconnect()
  }, [resize])

  useEffect(() => {
    S.scene.annotate = annotate
    readColors()
    draw(S.t)
  }, [S, annotate, className, style, readColors, draw])

  // ---- the one interaction: a lens over any nucleus of the sample
  const hasSample = state === 'result' && !!S.scene.well && S.scene.wellIndex >= 0
  const at = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const sc = S.scene
    return tileAt(layout(sc.W, sc.H, sc.annotate, sc.well?.nNuclei ?? 0), sc.well?.nNuclei ?? 0, e.clientX - r.left, e.clientY - r.top)
  }
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!hasSample) return
    if (e.pointerType !== 'mouse' && e.buttons === 0) return
    S.scene.touch = e.pointerType !== 'mouse'
    const i = at(e)
    if (i !== null || e.pointerType === 'mouse') setPick(i)
  }
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!hasSample) return
    S.scene.touch = e.pointerType !== 'mouse'
    const i = at(e)
    if (i !== null) setPick(i)
  }
  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'n' || e.key === 'N') && canStep && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      next()
      return
    }
    if ((e.key === 'Enter' || e.key === ' ') && state === 'idle' && tapToRun) {
      e.preventDefault()
      void run()
      return
    }
    if (!hasSample) return
    const sc = S.scene
    const n = sc.well!.nNuclei
    const cols = layout(sc.W, sc.H, sc.annotate, n).mosaic!.cols
    const cur = sc.pick ?? sc.wellIndex
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key]
    if (step !== undefined) {
      e.preventDefault()
      sc.touch = false
      setPick(Math.min(n - 1, Math.max(0, cur + step)))
    } else if (e.key === 'Escape') setPick(null)
  }

  // ---- words on the specimen
  const r = S.scene.result
  const well = S.scene.well
  const info = ui
  const liveSession = r?.source === 'live'
  let caption = ''
  let noteSub = ''
  let noteFine = ''
  let noteTag = ''
  if (info?.note === 'caption') {
    caption = 'how IonScan reads every nucleus'
    noteSub = info.scan >= 0 ? `scan ${info.scan + 1} of 8` : 'a 32 × 32 grid'
  } else if (info?.note === 'count') {
    if (picked !== null && well) {
      // the nucleus under the lens: live IonScan on a laptop, the stored outputs otherwise
      const pr = S.scene.pickResult
      noteSub = `nucleus ${picked + 1} of ${well.nNuclei}`
      if (pr?.line.drawn) noteFine = `${pr.line.nInliers} in a straight line, ${tt.HONESTY.lineLabel}`
      noteTag = pr ? `LIVE ${Math.round(pr.timing.ms)} ms` : liveSession && !S.lensFailed ? '' : 'REPLAY'
    } else if (r) {
      if (info.lineShown) {
        noteSub = `${r.line.nInliers} in a straight line`
        noteFine = tt.HONESTY.lineLabel
      } else if (!r.line.drawn && S.t >= T.LINE + 320) noteSub = 'no straight line'
      noteTag = r.source === 'live' ? `LIVE ${Math.round(r.timing.ms)} ms` : 'REPLAY'
    }
  }
  let sampleText = ''
  if (well && info && info.sampleAlpha > 0) {
    if (info.verdictShown) {
      const top = tt.topLabels(well.verdict)
      sampleText = `${well.nNuclei} nuclei read. ${PARTICLE_WORD[top.particle][0].toUpperCase()}${PARTICLE_WORD[top.particle].slice(1)}, ${top.dose} dose band, ${TIME_WORD[top.time]} since exposure.`
    } else sampleText = `reading the whole sample, ${String(info.read).padStart(3, ' ')} of ${well.nNuclei} nuclei`
  }
  const live = picked !== null && well ? `Nucleus ${picked + 1} of ${well.nNuclei}: ${well.nuclei[picked].count} damage spots` : ''

  // the step control: beside the words once there is a result, in the stage corner before
  const stepShown = stepper && canStep && (state === 'idle' || state === 'result' || state === 'error')
  const stepInNote = stepShown && annotate && state === 'result'
  const stepBtn = stepShown ? (
    <button
      type="button"
      className="ttm-next"
      data-qa="next"
      data-at={stepInNote ? 'note' : 'corner'}
      onClick={(e) => {
        e.stopPropagation()
        next()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      Next nucleus
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 8h11M9.5 4l4 4-4 4" />
      </svg>
    </button>
  ) : null

  return (
    <div
      ref={rootRef}
      className={`ttm${className ? ` ${className}` : ''}`}
      style={style}
      data-ready={ready ? '1' : '0'}
      data-state={state}
      data-beat={info?.beat ?? 'specimen'}
      data-count={info?.count ?? 0}
      data-read={info?.read ?? 0}
      data-picked={picked ?? ''}
      data-picked-source={picked === null ? '' : S.scene.pickResult ? 'live' : 'precomputed'}
      data-source={r ? r.source : ''}
      data-line={info?.lineShown ? '1' : '0'}
      data-sample={sampleId}
      data-step={canStep ? '1' : '0'}
      data-tappable={(state === 'idle' && tapToRun) || hasSample ? '1' : '0'}
      tabIndex={0}
      role="group"
      aria-label={
        state === 'idle'
          ? 'A cell nucleus under the microscope. Press Enter to let IonScan read it.'
          : hasSample
            ? 'Every nucleus of the sample. Arrow keys choose the nucleus shown under the lens.'
            : 'A cell nucleus with the damage spots IonScan circled.'
      }
      onClick={() => {
        if (state === 'idle' && tapToRun) void run()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={(e) => {
        if (hasSample && e.pointerType === 'mouse') setPick(null)
      }}
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvasRef} className="ttm-canvas" data-qa="hero" aria-hidden="true" />
      {promise && (
        <p className="ttm-promise" data-on={state === 'idle' && !error ? '1' : '0'} aria-hidden={state !== 'idle'}>
          {promise}
        </p>
      )}
      {annotate && (
        <>
          <div ref={noteRef} className="ttm-note" data-dock="" data-kind={info?.note ?? 'none'} style={{ opacity: 0 }}>
            {caption ? (
              <span className="ttm-note-main">{caption}</span>
            ) : (
              <span className="ttm-note-main">
                <span className="ttm-note-num">{info?.count ?? 0}</span> damage {info?.count === 1 ? 'spot' : 'spots'}
              </span>
            )}
            {noteSub && (
              <span className="ttm-note-sub">
                {noteSub}
                {noteFine && (
                  <>
                    <br />
                    <span className="ttm-note-fine">{noteFine}</span>
                  </>
                )}
              </span>
            )}
            {(noteTag || stepInNote) && (
              <span className="ttm-note-row">
                {noteTag && <span className="ttm-tag">{noteTag}</span>}
                {stepInNote && stepBtn}
              </span>
            )}
          </div>
          <div ref={sampleRef} className="ttm-sample" style={{ opacity: 0 }}>
            <span>{sampleText}</span>
            {sampleText && <span className="ttm-tag">{tt.HONESTY.precomputed}</span>}
            {info?.verdictShown && (
              <>
                <br />
                <span className="ttm-legend">
                  <i className="ttm-ring" aria-hidden="true" />
                  the ten nuclei that weighed most in this call
                </span>
              </>
            )}
          </div>
        </>
      )}
      {stepShown && !stepInNote && stepBtn}
      {error && <div className="ttm-error" role="alert">{error}</div>}
      <div className="ttm-sr" aria-live="polite">{live}</div>
    </div>
  )
})

export default TrackTraceMoment
export { TrackTraceMoment }

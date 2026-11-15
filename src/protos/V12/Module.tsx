// One page for all six checks: we are inside the window. The working stage fills the cutaway panel;
// the suit stays behind it, zoomed to this window, and pans when you move to another one.
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref, type RefObject } from 'react'
import { ArrowLeft, ArrowRight, ArrowsOutSimple, Play } from '@phosphor-icons/react'
import { CLASS_COLOURS, CLASS_NAMES, CLASS_PLAIN, replay, type SpikeResult } from '../../engine/spikecount'
import { CHECKS, easeInOut, isUpright, vbString, windowVB, type Check, type VB } from './data'
import { MOMENTS } from './load'
import { animateVB, prefersReducedMotion, useWindowSize } from './motion'
import { Backdrop, ScreenPoster, Suit } from './Suit'

const TrackTrace = lazy(MOMENTS.tracktrace)
const BubbleGrade = lazy(MOMENTS.bubblegrade)
const VeinSqueeze = lazy(MOMENTS.veinsqueeze)
const BrainDrift = lazy(MOMENTS.braindrift)
const GarnMeter = lazy(MOMENTS.garnmeter)

type State = 'idle' | 'running' | 'result' | 'error'
interface Api {
  run: () => void
  reset: () => void
}
const STATUS: Record<State, string> = { idle: 'Ready', running: 'Model running', result: 'Result in', error: 'Could not run' }

// ------------------------------------------------------------------ SpikeCount: a real field and the stored model outlines
function SpikeStage({ ref, onState }: { ref: Ref<Api>; onState: (s: State) => void }) {
  const [result, setResult] = useState<SpikeResult | null>(null)
  const [shown, setShown] = useState(0)
  const raf = useRef(0)
  const run = useCallback(async () => {
    cancelAnimationFrame(raf.current)
    setShown(0)
    onState('running')
    try {
      const r = await replay('field-96')
      setResult(r)
      const n = r.cells.length
      const t0 = performance.now()
      const step = (now: number) => {
        const k = Math.min(n, Math.floor(((now - t0) / 2600) * n) + 1)
        setShown(k)
        if (k < n) raf.current = requestAnimationFrame(step)
        else onState('result')
      }
      raf.current = requestAnimationFrame(step)
    } catch {
      onState('error')
    }
  }, [onState])
  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setShown(0)
    onState('idle')
  }, [onState])
  useImperativeHandle(ref, () => ({ run: () => void run(), reset }), [run, reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const cells = result ? result.cells.slice(0, shown) : []
  const spiky = cells.filter((c) => /^E[1-4]$/.test(c.className)).length
  const pct = cells.length ? (100 * spiky) / cells.length : 0
  return (
    <div className="v12-spike">
      <div className="v12-spike-photo">
        <img src={`${import.meta.env.BASE_URL}spikecount/fields/96.png`} alt="Microscope photo of red blood cells" />
        <svg viewBox={`0 0 ${result?.width ?? 572} ${result?.height ?? 572}`} aria-hidden="true">
          {cells.map((c) => (
            <polygon key={c.id} points={c.polygon.map((p) => p.join(',')).join(' ')} fill={CLASS_COLOURS[c.className]} stroke={CLASS_COLOURS[c.className]} strokeDasharray={c.border ? '6 5' : undefined} />
          ))}
        </svg>
      </div>
      <div className="v12-spike-read">
        {shown === 0 ? (
          <>
            <span className="v12-spike-tag">Real microscope photo</span>
            <p className="v12-spike-cap">Press “Grade this blood”: every cell gets its outline and its shape grade.</p>
          </>
        ) : (
          <>
            <span className="v12-spike-tag">Replay · stored outputs</span>
            <span className="v12-spike-big">
              {pct.toFixed(1)}
              <small>%</small>
            </span>
            <p className="v12-spike-cap">spiky cells</p>
            <p className="v12-spike-sub">
              {spiky} of {cells.length} cells outlined
            </p>
            <ul className="v12-spike-key">
              {CLASS_NAMES.map((n) => (
                <li key={n}>
                  <i style={{ background: CLASS_COLOURS[n] }} />
                  {CLASS_PLAIN[n]}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function Stage({ id, api, onState }: { id: string; api: RefObject<Api | null>; onState: (s: State) => void }) {
  const bind =
    <H extends { run: (...a: never[]) => unknown; reset: () => void }>(run: (h: H) => void) =>
    (h: H | null) => {
      api.current = h ? { run: () => run(h), reset: () => h.reset() } : null
    }
  switch (id) {
    case 'tracktrace':
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} promise="" className="v12-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} className="v12-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} className="v12-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} className="v12-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} className="v12-fill" />
    default:
      return (
        <SpikeStage
          ref={(h) => {
            api.current = h
          }}
          onState={onState}
        />
      )
  }
}

/** Where the window's picture was when the move ended, in the stage frame's own pixels, so the poster sits exactly there. */
function usePosterBox(frame: RefObject<HTMLElement | null>, check: Check, vw: number, vh: number): string | null {
  const [box, setBox] = useState<string | null>(null)
  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const vb = windowVB(check, vw, vh)
    const k = vw / vb[2]
    const left = r.left + window.scrollX
    const top = r.top + window.scrollY
    setBox(vbString([vb[0] + left / k, vb[1] + top / k, r.width / k, r.height / k]))
  }, [frame, check, vw, vh])
  return box
}

// ------------------------------------------------------------------ the page inside one window
function Page({ check, onReady, vw, vh, upright }: { check: Check; onReady: (id: string) => void; vw: number; vh: number; upright: boolean }) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const prev = CHECKS[(i + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const screen = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLElement>(null)
  const posterBox = usePosterBox(frame, check, vw, vh)
  const [state, setState] = useState<State>('idle')
  const [pending, setPending] = useState(false)
  const onState = useCallback((s: State) => {
    setState(s)
    if (s !== 'idle') setPending(false)
  }, [])
  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => setPending(false), 6000)
    return () => window.clearTimeout(t)
  }, [pending])
  const busy = pending || state === 'running'
  // the stage says when it can run (its own data-ready); until then the window's picture shows, and a press is kept
  const [live, setLive] = useState(check.id === 'spikecount')
  const queued = useRef(false)
  useEffect(() => {
    const el = screen.current
    if (!el || live) return
    const look = () => {
      if (el.querySelector('[data-ready="1"]')) setLive(true)
    }
    const mo = new MutationObserver(look)
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-ready'] })
    look()
    const t = window.setTimeout(() => setLive(true), 15000)
    return () => {
      mo.disconnect()
      window.clearTimeout(t)
    }
  }, [live])
  useEffect(() => {
    if (!live || !queued.current) return
    queued.current = false
    const r = requestAnimationFrame(() => api.current?.run())
    return () => cancelAnimationFrame(r)
  }, [live])
  const run = () => {
    if (busy) return
    setPending(true)
    if (live) api.current?.run()
    else queued.current = true
  }
  const reset = () => {
    queued.current = false
    setPending(false)
    api.current?.reset()
  }
  const [shown, setShown] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    const t = window.setTimeout(() => setShown(true), 650)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (shown && live) onReady(check.id)
  }, [shown, live, check.id, onReady])

  return (
    <div className="v12-m-page" data-state={state}>
      <header className="v12-m-head">
        <div className="v12-m-id">
          <a className="v12-m-back" href={`#/proto/V12/home?from=${check.id}`}>
            <ArrowsOutSimple weight="bold" />
            Whole suit
          </a>
          <p className="v12-m-tag">
            <b>{check.n}</b>
            <i />
            {check.site}
          </p>
          <h1 className="v12-m-name">{check.name}</h1>
        </div>
        <p className="v12-m-sentence">{check.sentence}</p>
        <nav className="v12-m-loc" aria-label="The six windows in the suit">
          <Suit mode="mini" viewBox="96 40 1400 760" current={check.id} title="The suit: press a window to go there" />
          <span className="v12-m-here">
            You are in the <b>{check.site.toLowerCase()}</b>
          </span>
        </nav>
      </header>

      <section ref={frame} className="v12-m-frame" data-m={check.id} aria-label={`${check.name}: the working stage`}>
        <div className="v12-m-screen" ref={screen}>
          {posterBox && <ScreenPoster c={check} upright={upright} viewBox={posterBox} />}
          <div className="v12-m-live" data-on={live ? '1' : undefined}>
            <Suspense fallback={null}>
              <Stage id={check.id} api={api} onState={onState} />
            </Suspense>
          </div>
        </div>
        <i className="v12-m-c" />
        <i className="v12-m-c" />
        <i className="v12-m-c" />
        <i className="v12-m-c" />
      </section>

      <footer className="v12-m-foot">
        <div className="v12-m-actions">
          <button type="button" className="v12-m-run" data-m={check.id} data-busy={busy ? '1' : undefined} aria-disabled={busy || undefined} onClick={run}>
            <Play weight="fill" />
            {busy ? 'Running…' : check.run}
          </button>
          <button type="button" className="v12-m-reset" onClick={reset}>
            Reset
          </button>
          <p className="v12-m-status" data-s={live ? state : 'wait'} aria-live="polite">
            <i />
            {live ? STATUS[state] : 'Warming up'}
          </p>
        </div>
        <nav className="v12-m-pager" aria-label="Previous and next check">
          <a className="v12-m-go" href={`#/proto/V12/${prev.id}`} style={{ ['--h' as string]: prev.hue }}>
            <ArrowLeft weight="bold" />
            <span>
              <small>
                {prev.n} · {prev.site}
              </small>
              <b>{prev.name}</b>
            </span>
          </a>
          <a className="v12-m-go is-next" href={`#/proto/V12/${next.id}`} style={{ ['--h' as string]: next.hue }}>
            <span>
              <small>
                {next.n} · {next.site}
              </small>
              <b>{next.name}</b>
            </span>
            <ArrowRight weight="bold" />
          </a>
        </nav>
      </footer>

      {check.id === 'tracktrace' && (
        <section className="v12-m-arch">
          <figure>
            <div className="v12-m-arch-card">
              <img src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        </section>
      )}
    </div>
  )
}

export default function Module({ check }: { check: Check }) {
  const size = useWindowSize()
  const upright = isUpright(size.w, size.h)
  const reduce = useMemo(prefersReducedMotion, [])
  const target = useMemo<VB>(() => windowVB(check, size.w, size.h), [check, size.w, size.h])
  const [first] = useState(() => vbString(target))
  const suitRef = useRef<SVGSVGElement>(null)
  const backRef = useRef<SVGSVGElement>(null)
  const at = useRef<VB>(target)
  const lastId = useRef(check.id)
  const [readyId, setReadyId] = useState<string | null>(null)

  // moving to another check pans the suit behind the page; a resize just re-seats it
  useLayoutEffect(() => {
    const from = at.current
    at.current = target
    const moved = lastId.current !== check.id
    lastId.current = check.id
    const els = [suitRef.current, backRef.current]
    if (!moved || reduce) {
      const s = vbString(target)
      for (const el of els) el?.setAttribute('viewBox', s)
      return
    }
    return animateVB(els, from, target, 950, easeInOut)
  }, [target, check.id, reduce])

  const onReady = useCallback((id: string) => setReadyId(id), [])

  return (
    <div className="v12 v12-module" data-proto="V12" data-check={check.id} data-ready={readyId === check.id ? '1' : undefined} data-upright={upright ? '1' : undefined} style={{ ['--hue' as string]: check.hue }}>
      <div className="v12-m-plate" aria-hidden="true">
        <div className="v12-ground" />
        <Backdrop viewBox={first} svgRef={backRef} upright={upright} />
        <Suit mode="bg" upright={upright} viewBox={first} svgRef={suitRef} />
        <div className="v12-scrim" />
      </div>
      <Page key={check.id} check={check} onReady={onReady} vw={size.w} vh={size.h} upright={upright} />
      <p className="v12-aimark v12-aimark-m">AI-generated imagery · suit drawn by code</p>
    </div>
  )
}

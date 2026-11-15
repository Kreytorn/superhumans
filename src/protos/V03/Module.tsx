// One page for all six checks: we are inside the room. The working stage is the room's wall screen;
// the plate stays behind it, zoomed to this room, and pans when you move to another one.
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref, type RefObject } from 'react'
import { ArrowLeft, ArrowRight, ArrowsOutSimple, Play } from '@phosphor-icons/react'
import { CLASS_COLOURS, CLASS_NAMES, CLASS_PLAIN, replay, type SpikeResult } from '../../engine/spikecount'
import { CHECKS, easeInOut, isUpright, roomVB, vbString, type Check, type VB } from './data'
import { MOMENTS } from './load'
import { animateVB, prefersReducedMotion, useWindowSize } from './motion'
import { Backdrop, ScreenPoster, Ship } from './Ship'

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
    <div className="v03-spike">
      <div className="v03-spike-photo">
        <img src={`${import.meta.env.BASE_URL}spikecount/fields/96.png`} alt="Microscope photo of red blood cells" />
        <svg viewBox={`0 0 ${result?.width ?? 572} ${result?.height ?? 572}`} aria-hidden="true">
          {cells.map((c) => (
            <polygon key={c.id} points={c.polygon.map((p) => p.join(',')).join(' ')} fill={CLASS_COLOURS[c.className]} stroke={CLASS_COLOURS[c.className]} strokeDasharray={c.border ? '6 5' : undefined} />
          ))}
        </svg>
      </div>
      <div className="v03-spike-read">
        {shown === 0 ? (
          <>
            <span className="v03-spike-tag">Real microscope photo</span>
            <p className="v03-spike-cap">Press “Grade this blood”: every cell gets its outline and its shape grade.</p>
          </>
        ) : (
          <>
            <span className="v03-spike-tag">Replay · stored outputs</span>
            <span className="v03-spike-big">
              {pct.toFixed(1)}
              <small>%</small>
            </span>
            <p className="v03-spike-cap">spiky cells</p>
            <p className="v03-spike-sub">
              {spiky} of {cells.length} cells outlined
            </p>
            <ul className="v03-spike-key">
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
      // the header sentence and the run button already say what the scan finds
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} promise="" className="v03-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} className="v03-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} className="v03-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} className="v03-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} className="v03-fill" />
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

/**
 * Where the room's screen was when the move into the room ended, in the stage frame's own pixels: the view box that
 * maps the frame onto plate units, so the poster sits exactly where the zoom left the specimen.
 */
function usePosterBox(frame: RefObject<HTMLElement | null>, check: Check, vw: number, vh: number): string | null {
  const [box, setBox] = useState<string | null>(null)
  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const vb = roomVB(check, vw, vh)
    const k = vw / vb[2]
    const left = r.left + window.scrollX
    const top = r.top + window.scrollY
    setBox(vbString([vb[0] + left / k, vb[1] + top / k, r.width / k, r.height / k]))
  }, [frame, check, vw, vh])
  return box
}

// ------------------------------------------------------------------ the page inside one room
function Page({ check, onReady, vw, vh, upright }: { check: Check; onReady: (id: string) => void; vw: number; vh: number; upright: boolean }) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const prev = CHECKS[(i + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const screen = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLElement>(null)
  const posterBox = usePosterBox(frame, check, vw, vh)
  const [state, setState] = useState<State>('idle')
  // a press waits here until the stage says it has started (or failed)
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
  // the stage says when it can run (its own data-ready); until then its poster shows, and a press is kept
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
    // a stage that never says so (a failed load) still gets a live button, which then shows its own error
    const t = window.setTimeout(() => setLive(true), 15000)
    return () => {
      mo.disconnect()
      window.clearTimeout(t)
    }
  }, [live])
  useEffect(() => {
    if (!live || !queued.current) return
    queued.current = false
    // one frame for the stage to hand over its controls
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
  // the page counts as settled once its entrance has played and the stage is ready
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
    <div className="v03-m-page" data-state={state}>
      <header className="v03-m-head">
        <div className="v03-m-id">
          <a className="v03-m-back" href={`#/proto/V03/home?from=${check.id}`}>
            <ArrowsOutSimple weight="bold" />
            Whole ship
          </a>
          <p className="v03-m-tag">
            <b>{check.n}</b>
            <i />
            {check.room}
          </p>
          <h1 className="v03-m-name">{check.name}</h1>
        </div>
        <p className="v03-m-sentence">{check.sentence}</p>
        <nav className="v03-m-loc" aria-label="Rooms of the ship">
          <Ship mode="mini" viewBox="40 56 1530 900" current={check.id} title="The ship: press a room to go there" />
          <span className="v03-m-here">
            You are in the <b>{check.room.toLowerCase()}</b>
          </span>
        </nav>
      </header>

      <section ref={frame} className="v03-m-frame" data-m={check.id} aria-label={`${check.name}: the wall screen of the ${check.room.toLowerCase()}`}>
        <div className="v03-m-screen" ref={screen}>
          {/* the room's own screen, where the move left it, until the working stage is ready to fade in over it */}
          {posterBox && <ScreenPoster c={check} upright={upright} viewBox={posterBox} />}
          <div className="v03-m-live" data-on={live ? '1' : undefined}>
            <Suspense fallback={null}>
              <Stage id={check.id} api={api} onState={onState} />
            </Suspense>
          </div>
        </div>
        <i className="v03-m-c" />
        <i className="v03-m-c" />
        <i className="v03-m-c" />
        <i className="v03-m-c" />
      </section>

      <footer className="v03-m-foot">
        <div className="v03-m-actions">
          <button type="button" className="v03-m-run" data-m={check.id} data-busy={busy ? '1' : undefined} aria-disabled={busy || undefined} onClick={run}>
            <Play weight="fill" />
            {busy ? 'Running…' : check.run}
          </button>
          <button type="button" className="v03-m-reset" onClick={reset}>
            Reset
          </button>
          <p className="v03-m-status" data-s={live ? state : 'wait'} aria-live="polite">
            <i />
            {live ? STATUS[state] : 'Warming up'}
          </p>
        </div>
        <nav className="v03-m-pager" aria-label="Previous and next room">
          <a className="v03-m-go" href={`#/proto/V03/${prev.id}`} style={{ ['--h' as string]: prev.hue }}>
            <ArrowLeft weight="bold" />
            <span>
              <small>
                {prev.n} · {prev.room}
              </small>
              <b>{prev.name}</b>
            </span>
          </a>
          <a className="v03-m-go is-next" href={`#/proto/V03/${next.id}`} style={{ ['--h' as string]: next.hue }}>
            <span>
              <small>
                {next.n} · {next.room}
              </small>
              <b>{next.name}</b>
            </span>
            <ArrowRight weight="bold" />
          </a>
        </nav>
      </footer>

      {check.id === 'tracktrace' && (
        <section className="v03-m-arch">
          <figure>
            <div className="v03-m-arch-card">
              <img src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
            </div>
            <figcaption>
              IonScan, our own 3.2 M-parameter network
              <small>AI-generated illustration</small>
            </figcaption>
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
  const target = useMemo<VB>(() => roomVB(check, size.w, size.h), [check, size.w, size.h])
  const [first] = useState(() => vbString(target))
  const shipRef = useRef<SVGSVGElement>(null)
  const backRef = useRef<SVGSVGElement>(null)
  const at = useRef<VB>(target)
  const lastId = useRef(check.id)
  const [readyId, setReadyId] = useState<string | null>(null)

  // moving to another room pans the plate behind the page; a resize just re-seats it
  useLayoutEffect(() => {
    const from = at.current
    at.current = target
    const moved = lastId.current !== check.id
    lastId.current = check.id
    const els = [shipRef.current, backRef.current]
    if (!moved || reduce) {
      const s = vbString(target)
      for (const el of els) el?.setAttribute('viewBox', s)
      return
    }
    return animateVB(els, from, target, 950, easeInOut)
  }, [target, check.id, reduce])

  const onReady = useCallback((id: string) => setReadyId(id), [])

  return (
    <div className="v03 v03-module" data-proto="V03" data-check={check.id} data-ready={readyId === check.id ? '1' : undefined} data-upright={upright ? '1' : undefined} style={{ ['--hue' as string]: check.hue }}>
      <div className="v03-m-plate" aria-hidden="true">
        <div className="v03-ground" />
        <Backdrop viewBox={first} svgRef={backRef} upright={upright} />
        <Ship mode="bg" upright={upright} viewBox={first} svgRef={shipRef} />
        <div className="v03-scrim" />
      </div>
      <Page key={check.id} check={check} onReady={onReady} vw={size.w} vh={size.h} upright={upright} />
      <p className="v03-aimark v03-aimark-m">AI-generated imagery · ship drawn by code</p>
    </div>
  )
}

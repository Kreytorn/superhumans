// MARS "Mission to Mars": the home page is one shot of the flight from Earth to Mars; the six checks are moments on
// the path. Pressing one glides the camera along the path to the ship, time stops, and the check's stage opens.
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowCounterClockwise, ArrowLeft, ArrowRight, Pause, Play } from '@phosphor-icons/react'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import './mars.css'
import type { ProtoProps } from '../../App'
import { navigate } from '../../lib/route'
import { BASE, MOMENTS, type Moment } from './data'
import { createScene, type MarsScene } from './scene'
import type { Act, StageHandle, StageState } from './stages'

const Stage = lazy(() => import('./stages'))

// Where things sit on the still picture that stands in when WebGL is not available (fractions of the screen).
const STILL: [number, number][] = [
  [0.315, 0.756],
  [0.428, 0.714],
  [0.5375, 0.649],
  [0.634, 0.567],
  [0.723, 0.463],
  [0.797, 0.347],
  [0.12, 0.83],
  [0.87, 0.19],
  [0.36, 0.74],
]

export default function Mars({ view, params }: ProtoProps) {
  const forceStill = params.has('still') // ?still=1 shows the picture used when WebGL is not available
  const stop = MOMENTS.findIndex((m) => m.id === view)
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const spots = useRef<(HTMLButtonElement | null)[]>([])
  const earthTag = useRef<HTMLSpanElement>(null)
  const marsTag = useRef<HTMLSpanElement>(null)
  const scene = useRef<MarsScene | null>(null)
  const placed = useRef<MarsScene | null>(null) // the scene that has already been put at its first pose
  const [gl, setGl] = useState<'pending' | 'ok' | 'fail'>('pending')
  const [ready, setReady] = useState(false)
  // where the camera rests: a stop index, null = home, undefined = in flight
  const [at, setAt] = useState<number | null | undefined>(stop >= 0 ? stop : null)

  const place = useCallback((pts: Float32Array | number[]) => {
    for (let i = 0; i < 6; i++) {
      const el = spots.current[i]
      if (!el) continue
      el.style.transform = `translate3d(${pts[i * 3].toFixed(1)}px, ${pts[i * 3 + 1].toFixed(1)}px, 0)`
      el.style.visibility = pts[i * 3 + 2] ? 'visible' : 'hidden'
    }
    const er = pts[27] || 0
    const mr = pts[28] || 0
    if (earthTag.current) earthTag.current.style.transform = `translate3d(${(pts[18] + er * 0.78 + 10).toFixed(1)}px, ${(pts[19] - er * 0.78 - 22).toFixed(1)}px, 0)`
    if (marsTag.current) marsTag.current.style.transform = `translate3d(${(pts[21] + mr + 14).toFixed(1)}px, ${(pts[22] - 7).toFixed(1)}px, 0)`
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const s = forceStill
      ? null
      : createScene(c, {
          onFrame: (pts) => place(pts),
          onSettle: (i) => setAt(i),
          onFirstFrame: () => setReady(true),
        })
    scene.current = s
    if (!s) {
      setGl('fail')
      setReady(true)
      return
    }
    setGl('ok')
    return () => {
      s.dispose()
      scene.current = null
    }
  }, [place, forceStill])

  // no WebGL: a still picture, with the six spots at fixed places
  useEffect(() => {
    if (gl !== 'fail') return
    const put = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const pts = new Array<number>(30).fill(0)
      STILL.forEach(([x, y], i) => {
        pts[i * 3] = x * w
        pts[i * 3 + 1] = y * h
        pts[i * 3 + 2] = 1
      })
      pts[27] = h * 0.2
      pts[28] = h * 0.03
      place(pts)
    }
    put()
    window.addEventListener('resize', put)
    return () => window.removeEventListener('resize', put)
  }, [gl, place])

  useEffect(() => {
    if (gl === 'pending') return
    const target = stop >= 0 ? stop : null
    if (gl === 'fail' || !scene.current) {
      setAt(target)
      return
    }
    // a page opened straight on a check starts there, with no flight
    const instant = placed.current !== scene.current
    placed.current = scene.current
    if (!instant) setAt(undefined)
    scene.current.flyTo(target, instant)
  }, [stop, gl])

  // never leave the picture hidden: if the first frame is slow to report, show the page anyway
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2500)
    return () => window.clearTimeout(t)
  }, [])

  // fetch the stages while the home shot plays, so a check opens the moment the camera arrives
  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => void import('./stages'), 900)
    return () => window.clearTimeout(t)
  }, [ready])

  const home = useCallback(() => navigate('/proto/MARS/home'), [])
  useEffect(() => {
    if (stop < 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') home()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop, home])

  const onMove = (e: ReactPointerEvent) => {
    if (stop >= 0 || e.pointerType === 'touch') return
    scene.current?.pointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
  }

  const isHome = stop < 0
  const open = stop >= 0 && at === stop
  const flying = at === undefined

  return (
    <div className="mars" ref={root} data-ready={ready ? '1' : undefined} data-view={isHome ? 'home' : 'check'} data-gl={gl} data-fly={flying ? 1 : 0} onPointerMove={onMove}>
      <canvas ref={canvas} className="mars-canvas" aria-hidden="true" />
      {gl === 'fail' && (
        <div className="mars-still" aria-hidden="true">
          <i className="mars-still-sun" />
          <i className="mars-still-earth" />
          <i className="mars-still-mars" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 14 78 C 40 78, 70 62, 86 21" />
          </svg>
        </div>
      )}
      <div className="mars-grade" aria-hidden="true" />
      <div className="mars-bars" aria-hidden="true" />

      <div className="mars-hud" inert={!isHome}>
        <p className="mars-word">SuperHumans</p>
        <div className="mars-lede">
          <h1>
            Six AI health checks for astronauts, <em>running in your browser.</em>
          </h1>
          <p>Earth to Mars. Press a moment of the flight.</p>
        </div>
        <span className="mars-body" ref={earthTag}>
          Earth
        </span>
        <span className="mars-body" ref={marsTag}>
          Mars
        </span>
        {MOMENTS.map((m, i) => (
          <button
            key={m.id}
            type="button"
            className="mars-spot"
            data-side={m.side}
            data-id={m.id}
            style={{ ['--i' as string]: i }}
            ref={(el) => {
              spots.current[i] = el
            }}
            onClick={() => navigate(`/proto/MARS/${m.id}`)}
          >
            <i className="mars-spot-dot" aria-hidden="true" />
            <span className="mars-spot-text">
              <small>{m.phase}</small>
              <b>{m.name}</b>
            </span>
          </button>
        ))}
      </div>

      {open && <Module key={MOMENTS[stop].id} m={MOMENTS[stop]} index={stop} onBack={home} />}

      <span className="mars-ai">AI-generated imagery</span>
    </div>
  )
}

function Module({ m, index, onBack }: { m: Moment; index: number; onBack(): void }) {
  const stage = useRef<StageHandle>(null)
  const [state, setState] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const prev = MOMENTS[index - 1]
  const next = MOMENTS[index + 1]
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const onState = useCallback((s: StageState) => setState(s), [])
  const press = () => {
    if (state === 'result') stage.current?.reset()
    else stage.current?.run()
  }

  return (
    <section className="mars-mod" data-state={state} data-id={m.id} aria-label={m.name}>
      <div className="mars-side">
        <div className="mars-side-top">
          <button type="button" className="mars-back" onClick={onBack}>
            <ArrowLeft size={18} weight="bold" />
            Back to the flight
          </button>
          <span className="mars-paused">
            <Pause size={11} weight="fill" />
            Time stopped
          </span>
        </div>
        <div className="mars-title">
          <p className="mars-phase">
            <span>
              {index + 1} of {MOMENTS.length}
            </span>
            {m.phase}
          </p>
          <h2>{m.name}</h2>
          <p className="mars-sentence">{m.line}</p>
          <button type="button" className="mars-run" onClick={press} disabled={state === 'running'}>
            {state === 'result' ? <ArrowCounterClockwise size={18} weight="bold" /> : <Play size={16} weight="fill" />}
            {state === 'running' ? 'Running…' : state === 'result' ? 'Start over' : state === 'error' ? 'Try again' : m.cta}
          </button>
          {act && (
            <div className="mars-act">
              <small>What to do next</small>
              <p>{act.headline}</p>
              <span>{act.whoActs}</span>
            </div>
          )}
        </div>
        <nav className="mars-hop" aria-label="Other moments of the flight">
          {prev ? (
            <button type="button" onClick={() => navigate(`/proto/MARS/${prev.id}`)}>
              <ArrowLeft size={15} weight="bold" />
              <span>
                <small>Earlier</small>
                {prev.name}
              </span>
            </button>
          ) : (
            <i />
          )}
          {next ? (
            <button type="button" className="is-next" onClick={() => navigate(`/proto/MARS/${next.id}`)}>
              <span>
                <small>Later in the flight</small>
                {next.name}
              </span>
              <ArrowRight size={15} weight="bold" />
            </button>
          ) : (
            <i />
          )}
        </nav>
      </div>
      <div className="mars-main">
        <div className="mars-stage">
          <Suspense fallback={<p className="mars-loading">Opening the check…</p>}>
            <Stage id={m.id} ref={stage} onAct={onAct} onState={onState} />
          </Suspense>
        </div>
        {m.id === 'tracktrace' && (
          <figure className="mars-arch">
            <div className="mars-arch-frame">
              <div className="mars-arch-card">
                <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network" />
              </div>
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}

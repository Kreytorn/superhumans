// Prototype HOLE "The black hole" (r3 theme): a black hole with its bent ring of light is the home page; the six
// checks are six lights orbiting in the ring. Pressing one pulls the camera in along the ring while time slows to a
// stop, and the check opens in the stillness. Routes: #/proto/HOLE/home and #/proto/HOLE/<module id>.
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import './hole.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BASE, CHECKS, SITE_LINE, type Check } from './data'
import Scene, { hasWebGL, type HoleCtl } from './Scene'
import Stage, { type Act, type StageHandle, type StageState } from './stages'

const go = (v: string) => {
  window.location.hash = `#/proto/HOLE/${v}`
}

// Where the six lights sit when WebGL is missing and the scene is a still drawing (percent of the screen).
const STILL_SPOTS: [number, number, 'f' | 'b'][] = [
  [24, 49, 'f'],
  [41, 56, 'f'],
  [63, 55, 'f'],
  [78, 47, 'b'],
  [56, 21, 'b'],
  [33, 30, 'b'],
]

export default function Hole({ view, params }: { view: string; params: URLSearchParams }) {
  const idx = CHECKS.findIndex((c) => c.id === view) // -1 on the home view
  // decided once: asking again on every route change would open a new WebGL context each time
  const [webgl, setWebgl] = useState(() => hasWebGL() && params.get('still') !== '1')
  const [pressed, setPressed] = useState<number | null>(null)
  const [arrived, setArrived] = useState(!webgl)
  const [moving, setMoving] = useState(true)
  const [ready, setReady] = useState(!webgl)
  const [hover, setHover] = useState<number | null>(null)
  const target = idx >= 0 ? idx : pressed
  const pressedRef = useRef(pressed)
  pressedRef.current = pressed

  const ctl = useRef<HoleCtl | null>(null)
  if (!ctl.current) {
    ctl.current = {
      target,
      hover: null,
      pointer: [0, 0],
      labels: [],
      clock: null,
      snap: idx >= 0,
      frames: 0,
      pinQuality: params.get('q') === '1',
      onArrive: () => {},
      onFirstFrame: () => {},
      onLost: () => {},
    }
  }
  const c = ctl.current
  if (import.meta.env.DEV) (window as unknown as { __hole?: HoleCtl }).__hole = c
  c.target = target
  c.hover = target == null ? hover : null
  c.onArrive = (i) => {
    setArrived(true)
    setMoving(false)
    if (pressedRef.current === i) go(CHECKS[i].id)
  }
  c.onFirstFrame = () => setReady(true)
  c.onLost = () => {
    setWebgl(false)
    setArrived(true)
    setReady(true)
    if (pressedRef.current != null) go(CHECKS[pressedRef.current].id)
  }

  useEffect(() => {
    if (idx >= 0) setPressed(null)
    else if (webgl) setArrived(false)
  }, [idx, webgl])
  useEffect(() => {
    setMoving(true)
    setHover(null)
  }, [target])

  const press = useCallback(
    (i: number) => {
      if (!webgl) return go(CHECKS[i].id)
      setArrived(false)
      setPressed(i)
    },
    [webgl],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (idx < 0 && pressed == null && e.key >= '1' && e.key <= '6') press(Number(e.key) - 1)
      else if (e.key === 'Escape') {
        // Escape releases time: from an open check, or in the middle of the flight in
        if (idx >= 0) go('home')
        else setPressed(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, pressed, press])

  const phase = target == null ? 'home' : idx >= 0 && arrived ? 'open' : 'fly'

  return (
    <div
      className="hole"
      data-phase={phase}
      data-ready={ready ? '1' : '0'}
      data-webgl={webgl ? '1' : '0'}
      onPointerMove={(e) => {
        c.pointer = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
      }}
    >
      <div className="hole-scene" aria-hidden="true">
        {webgl ? <Scene ctl={c} active={phase !== 'open' || moving} /> : <div className="hole-still" />}
      </div>
      <div className="hole-scrim" aria-hidden="true" />

      <div className="hole-home" inert={phase !== 'home'}>
        <p className="hole-line">
          Far from Earth, time and distance are the enemy. <span>So the crew reads their own bodies.</span>
        </p>

        <nav className="hole-lights" aria-label="The six health checks" key={webgl ? 'live' : 'still'}>
          {CHECKS.map((k, i) => (
            <button
              key={k.id}
              type="button"
              className="hole-light"
              data-side={webgl ? 'f' : STILL_SPOTS[i][2]}
              data-vis={webgl ? '0' : '1'}
              data-hot={hover === i ? '1' : '0'}
              style={webgl ? undefined : { left: `${STILL_SPOTS[i][0]}%`, top: `${STILL_SPOTS[i][1]}%` }}
              ref={(el) => {
                c.labels[i] = webgl ? el : null
              }}
              onClick={() => press(i)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
            >
              <span className="hole-light-ring" />
              <span className="hole-light-tag">
                <span className="hole-light-name">{k.name}</span>
                <span className="hole-light-site">
                  {k.n}
                  <i> · {k.site}</i>
                </span>
              </span>
            </button>
          ))}
        </nav>

        <div className="hole-title">
          <h1>SuperHumans</h1>
          <p>{SITE_LINE}</p>
        </div>
        <p className="hole-hint">
          <span className="hole-hint-dot" /> Press a light
        </p>
      </div>

      <p className="hole-clock" data-stopped={phase === 'open' ? '1' : '0'}>
        <span className="hole-clock-k">Time</span>
        <span className="hole-clock-x">×</span>
        <span
          className="hole-clock-v"
          ref={(el) => {
            c.clock = el
          }}
        >
          {webgl ? '1.00' : '0.00'}
        </span>
      </p>
      <p className="hole-mark">AI-generated imagery</p>

      {phase === 'open' && <Module key={CHECKS[idx].id} check={CHECKS[idx]} index={idx} />}
    </div>
  )
}

function Module({ check, index }: { check: Check; index: number }) {
  const stage = useRef<StageHandle>(null)
  const [state, setState] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const onState = useCallback((s: StageState) => setState(s), [])
  // A stage can ignore a press while its sample is still loading: keep the press and hand it over until it starts.
  // If a stage drops back to rest moments after the press (its sample finished loading), press once more for them.
  const [waiting, setWaiting] = useState(false)
  const pressAt = useRef(0)
  const again = useRef(false)
  const was = useRef<StageState>('idle')
  useEffect(() => {
    if (state !== 'idle') setWaiting(false)
    else if (was.current === 'running' && !again.current && Date.now() - pressAt.current < 6000) {
      again.current = true
      setWaiting(true)
    }
    was.current = state
  }, [state])
  useEffect(() => {
    if (!waiting) return
    let tries = 0
    const t = window.setInterval(() => {
      if (++tries > 14) return setWaiting(false)
      stage.current?.run()
    }, 700)
    return () => window.clearInterval(t)
  }, [waiting])
  const main = () => {
    if (state === 'result' || state === 'error') return stage.current?.reset()
    pressAt.current = Date.now()
    again.current = false
    setWaiting(true)
    stage.current?.run()
  }
  const prev = CHECKS[(index + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(index + 1) % CHECKS.length]

  return (
    <div className="hole-mod" data-state={state} data-id={check.id}>
      <div className="hole-mod-in">
        <header className="hole-head">
          <button type="button" className="hole-back" onClick={() => go('home')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 5 7.5 12l7 7" />
            </svg>
            <span>
              Back
              <small>time resumes</small>
            </span>
          </button>
          <div className="hole-head-text">
            <p className="hole-head-n">
              {check.n} <i>/ 06</i> <b>{check.site}</b>
              <em>Time × 0.00 · stopped</em>
            </p>
            <h2>{check.name}</h2>
            <p className="hole-head-line">{check.line}</p>
          </div>
          <button
            type="button"
            className="hole-run"
            disabled={state === 'running' || waiting}
            onClick={main}
          >
            {state === 'running' ? 'Reading…' : state === 'result' ? 'Start over' : state === 'error' ? 'Try again' : waiting ? 'Starting…' : check.cta}
          </button>
        </header>

        <section className="hole-stage" aria-label={`${check.name}, the working check`}>
          <Stage id={check.id} ref={stage} onAct={onAct} onState={onState} />
        </section>

        <div className="hole-act" data-on={act ? '1' : '0'} aria-live="polite">
          <span className="hole-act-k">What to do next</span>
          <p className="hole-act-h">{act ? act.headline : 'Run the check: it ends in what to do next.'}</p>
          {act && <p className="hole-act-w">{act.whoActs}</p>}
        </div>

        {check.id === 'tracktrace' && (
          <figure className="hole-arch">
            <div className="hole-arch-card">
              <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network, from the microscope image to the damage spots and the ion path" />
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        )}

        <footer className="hole-foot">
          <button type="button" onClick={() => go(prev.id)}>
            <small>Previous light</small>
            <span>
              {prev.n} {prev.name}
            </span>
          </button>
          <button type="button" className="is-home" onClick={() => go('home')}>
            <small>Release time</small>
            <span>Back to the black hole</span>
          </button>
          <button type="button" className="is-next" onClick={() => go(next.id)}>
            <small>Next light</small>
            <span>
              {next.n} {next.name}
            </span>
          </button>
        </footer>
        <p className="hole-mod-mark">The black hole behind this page is AI-generated imagery, drawn live by our own code.</p>
      </div>
    </div>
  )
}

// Prototype HOLE "The black hole" (r3 theme): a black hole with its bent ring of light is the home page; the six
// checks are six lights orbiting in the ring. Pressing one pulls the camera in along the ring while time slows to a
// stop, and the check opens in the stillness. Routes: #/proto/HOLE/home and #/proto/HOLE/<module id>.
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import './hole.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CHECKS, SITE_LINE, type Check } from './data'
import Scene, { hasWebGL, type HoleCtl } from './Scene'
import Stage, { type Act, type StageHandle, type StageState } from './stages'
import StorySection from './story'

// With reduced motion the camera does not fly: each press cuts straight to the check, and Back cuts home.
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  const [drawn, setDrawn] = useState(!webgl)
  const [ready, setReady] = useState(!webgl)
  const [modState, setModState] = useState<StageState>('idle')
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
      snap: idx >= 0 || REDUCED,
      frames: 0,
      pinQuality: params.get('q') === '1',
      calmUntil: 0,
      onArrive: () => {},
      onFirstFrame: () => {},
      onSettled: () => {},
      onLost: () => {},
    }
  }
  const c = ctl.current
  if (import.meta.env.DEV) (window as unknown as { __hole?: HoleCtl }).__hole = c
  if (REDUCED && c.target !== target) c.snap = true
  // leaving an open check: its model may still be busy on the GPU, so the scene comes back at a low scale first
  if (c.target != null && target == null && idx < 0 && arrived) c.calmUntil = performance.now() + 2600
  c.target = target
  c.hover = target == null ? hover : null
  c.onArrive = (i) => {
    setArrived(true)
    setMoving(false)
    if (pressedRef.current === i) go(CHECKS[i].id)
  }
  c.onFirstFrame = () => setDrawn(true)
  c.onSettled = () => setReady(true)
  c.onLost = () => {
    setWebgl(false)
    setArrived(true)
    setDrawn(true)
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
      data-drawn={drawn ? '1' : '0'}
      data-state={phase === 'open' ? modState : params.get('state') === 'result' ? 'result' : 'idle'}
      data-webgl={webgl ? '1' : '0'}
      onPointerMove={(e) => {
        c.pointer = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
      }}
    >
      <div className="hole-scene" aria-hidden="true" data-qa={phase === 'home' ? 'hero' : undefined}>
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
              data-qa={i === 0 && phase === 'home' ? 'primary' : undefined}
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

      {phase === 'open' && <Module key={CHECKS[idx].id} check={CHECKS[idx]} index={idx} onModState={setModState} />}
    </div>
  )
}

function Module({ check, index, onModState }: { check: Check; index: number; onModState(s: StageState): void }) {
  const stage = useRef<StageHandle>(null)
  const [state, setState] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const onState = useCallback(
    (s: StageState) => {
      setState(s)
      onModState(s)
    },
    [onModState],
  )
  useEffect(() => () => onModState('idle'), [onModState])
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
  // When the page closes, free what its stage held: media decoders and canvas memory (the stage's own models stay
  // cached in their engines, shared by every visit).
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    return () => {
      if (!el) return
      window.setTimeout(() => {
        // only a page that has really left the document (React's dev double-mount keeps it attached)
        if (el.isConnected) return
        el.querySelectorAll('video, audio').forEach((m) => {
          const media = m as HTMLMediaElement
          media.pause()
          media.removeAttribute('src')
          media.load()
        })
        el.querySelectorAll('canvas').forEach((cv) => {
          cv.width = 0
          cv.height = 0
        })
      }, 0)
    }
  }, [])
  const prev = CHECKS[(index + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(index + 1) % CHECKS.length]

  return (
    <div className="hole-mod" data-state={state} data-id={check.id} ref={root}>
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
            data-qa="primary"
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

        <button
          type="button"
          className="hole-cue"
          onClick={() => document.getElementById('hole-story')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' })}
        >
          <span>{check.id === 'tracktrace' ? 'The story, and how IonScan reads a nucleus' : 'The story behind this check'}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </button>

        <StorySection id={check.id} />

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

// S1 "Orrery" (r3 one-shot): the six checks are six real specimens in orbit round the one you are looking at.
// Home = the orrery. Module page = the check's working stage in an instrument frame.
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowCounterClockwise, ArrowLeft, ArrowRight, ArrowUpRight, Play } from '@phosphor-icons/react'
import '@fontsource-variable/anybody/wdth.css'
import '@fontsource-variable/hanken-grotesk/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './s1.css'
import type { ProtoProps } from '../../App'
import { navigate } from '../../lib/route'
import { BASE, CHECKS, type Check } from './data'
import type { Act, StageHandle, StageState } from './stages'

const Stage = lazy(() => import('./stages'))
const hrefOf = (view: string) => `#/proto/S1/${view}`
const lensStyle = (c: Check): CSSProperties => ({
  backgroundImage: `url(${BASE}${c.img})`,
  backgroundSize: c.size,
  backgroundPosition: c.pos,
  filter: c.filter,
})

function useReady(delay: number) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    let t = 0
    const go = () => {
      t = window.setTimeout(() => live && setReady(true), delay)
    }
    if (document.fonts?.ready) document.fonts.ready.then(go, go)
    else go()
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [delay])
  return ready
}

function Backdrop() {
  return (
    <div className="s1-bg" aria-hidden="true">
      <i className="s1-bg-dust" />
      <i className="s1-bg-limb" />
      <i className="s1-bg-grain" />
    </div>
  )
}

// ------------------------------------------------------------------------------------------------------------ home
function Home() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const touched = useRef(0)
  const ready = useReady(2100)
  const check = CHECKS[active]

  // The orange arc on the orbit travels to the chosen specimen by the short way round.
  const arc = useRef({ at: 0, deg: 0 })
  if (arc.current.at !== active) {
    const step = ((active - arc.current.at + 9) % 6) - 3
    arc.current = { at: active, deg: arc.current.deg + step * 60 }
  }

  const select = useCallback((i: number) => {
    touched.current = performance.now()
    setActive(((i % CHECKS.length) + CHECKS.length) % CHECKS.length)
  }, [])

  const open = useCallback((i: number) => {
    setActive(i)
    setLeaving(true)
    window.setTimeout(() => navigate(`proto/S1/${CHECKS[i].id}`), 420)
  }, [])

  // The orrery turns the spotlight by itself until someone touches it.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (paused || leaving) return
      if (performance.now() - touched.current < 9000) return
      setActive((a) => (a + 1) % CHECKS.length)
    }, 4200)
    return () => window.clearInterval(t)
  }, [paused, leaving])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        select(active + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        select(active - 1)
      } else if (/^[1-6]$/.test(e.key)) open(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, open, select])

  return (
    <div className="s1-home" data-leaving={leaving ? 1 : 0} data-paused={paused ? 1 : 0} data-ready={ready ? '1' : '0'}>
      <header className="s1-top">
        <a className="s1-brand" href={hrefOf('home')}>
          <i />
          SuperHumans
        </a>
        <span className="s1-top-note">Space Apps 2026 · Istanbul</span>
      </header>

      <section className="s1-copy">
        <h1 className="s1-h1">
          <span>
            <em>Six AI health</em>
          </span>
          <span>
            <em>checks for</em>
          </span>
          <span>
            <em>astronauts.</em>
          </span>
        </h1>
        <p className="s1-live">
          <i />
          Running in your browser
        </p>

        <div className="s1-panel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={check.id}
              className="s1-panel-in"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <p className="s1-idx">
                <b>{check.n}</b>
                <span>/ 06</span>
                <span className="s1-idx-site">{check.site}</span>
              </p>
              <h2 className="s1-name">{check.name}</h2>
              <p className="s1-line">{check.line}</p>
            </motion.div>
          </AnimatePresence>
          <div className="s1-actions">
            <button className="s1-btn" type="button" onClick={() => open(active)}>
              Open the check
              <ArrowUpRight weight="bold" />
            </button>
            <button className="s1-round" type="button" aria-label="Previous check" onClick={() => select(active - 1)}>
              <ArrowLeft weight="bold" />
            </button>
            <button className="s1-round" type="button" aria-label="Next check" onClick={() => select(active + 1)}>
              <ArrowRight weight="bold" />
            </button>
          </div>
        </div>
      </section>

      <section
        className="s1-orrery"
        aria-label="The six checks"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="s1-orrery-in">
          <svg className="s1-rings" viewBox="-500 -500 1000 1000" aria-hidden="true">
            <circle className="r-far" r="980" />
            <circle className="r-far" r="690" />
            <g className="r-spin-rev">
              <circle className="r-ticks" r="402" />
              <circle className="r-ticks-major" r="402" />
            </g>
            <circle className="r-orbit" r="300" />
            <g className="r-spin">
              <circle className="r-arc" r="300" style={{ rotate: `${arc.current.deg - 120}deg` }} />
            </g>
            <g className="r-spin-fast">
              <circle className="r-dash" r="205" />
              <circle className="r-moon" cx="205" cy="0" r="4" />
            </g>
          </svg>

          <button className="s1-core" type="button" onClick={() => open(active)} aria-label={`Open ${check.name}`}>
            <i className="s1-core-glow" />
            <i className="s1-core-rim" />
            <span className="s1-core-disc">
              <AnimatePresence initial={false}>
                <motion.i
                  key={check.id}
                  className="s1-core-img"
                  style={lensStyle(check)}
                  initial={{ opacity: 0, scale: 1.14 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                />
              </AnimatePresence>
              <i className="s1-core-sweep" />
              <i className="s1-core-glass" />
            </span>
            <i className="s1-core-scan" />
            <span className="s1-core-open">
              Open <ArrowUpRight weight="bold" />
            </span>
          </button>

          <div className="s1-orbit">
            {CHECKS.map((c, i) => (
              <div className="s1-arm" key={c.id} style={{ '--i': i } as CSSProperties}>
                <div className="s1-sat-pos">
                  <div className="s1-sat-up">
                    <a
                      className="s1-sat"
                      href={hrefOf(c.id)}
                      data-active={i === active ? 1 : 0}
                      style={{ '--d': `${0.75 + i * 0.09}s` } as CSSProperties}
                      onPointerEnter={(e) => e.pointerType === 'mouse' && select(i)}
                      onFocus={() => select(i)}
                      onClick={(e) => {
                        e.preventDefault()
                        if (i === active || e.detail === 0 || window.matchMedia('(hover: hover)').matches) open(i)
                        else select(i)
                      }}
                    >
                      <span className="s1-sat-disc">
                        <i style={lensStyle(c)} />
                      </span>
                      <span className="s1-sat-label">
                        <b>{c.n}</b>
                        {c.name}
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="s1-foot">
        <span>Real models on real medical data. No server.</span>
        <span className="s1-foot-ai">Backdrop: AI-generated illustration</span>
        <span className="s1-foot-keys">
          <kbd>←</kbd>
          <kbd>→</kbd> turn <kbd>1</kbd>–<kbd>6</kbd> open
        </span>
      </footer>
    </div>
  )
}

// ----------------------------------------------------------------------------------------------------- module page
function ModulePage({ check }: { check: Check }) {
  const i = CHECKS.indexOf(check)
  const prev = CHECKS[(i + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(i + 1) % CHECKS.length]
  const stage = useRef<StageHandle>(null)
  const [st, setSt] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const ready = useReady(1500)
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const stNow = useRef<StageState>('idle')
  const onState = useCallback((s: StageState) => {
    stNow.current = s
    setSt(s)
  }, [])
  // A press always lands: if the stage is still loading its sample, the press is repeated until it starts.
  const [starting, setStarting] = useState(false)
  const retry = useRef(0)
  const runIt = useCallback(() => {
    window.clearInterval(retry.current)
    stage.current?.run()
    setStarting(true)
    let n = 0
    retry.current = window.setInterval(() => {
      if (stNow.current !== 'idle' || ++n > 30) {
        window.clearInterval(retry.current)
        setStarting(false)
        return
      }
      stage.current?.run()
    }, 500)
  }, [])
  useEffect(() => () => window.clearInterval(retry.current), [])

  const running = st === 'running' || (starting && st === 'idle')
  const done = st === 'result'

  return (
    <div className="s1-mod" data-module={check.id} data-state={st} data-ready={ready ? '1' : '0'}>
      <header className="s1-top">
        <a className="s1-back" href={hrefOf('home')}>
          <ArrowLeft weight="bold" />
          All checks
        </a>
        <nav className="s1-dots" aria-label="Checks">
          <a className="s1-dots-arrow" href={hrefOf(prev.id)} aria-label={`Previous check: ${prev.name}`} title={prev.name}>
            <ArrowLeft weight="bold" />
          </a>
          {CHECKS.map((c) => (
            <a key={c.id} className="s1-dot" href={hrefOf(c.id)} data-active={c.id === check.id ? 1 : 0} aria-label={c.name} title={c.name}>
              <i style={lensStyle(c)} />
              <b>{c.n}</b>
            </a>
          ))}
          <a className="s1-dots-arrow" href={hrefOf(next.id)} aria-label={`Next check: ${next.name}`} title={next.name}>
            <ArrowRight weight="bold" />
          </a>
        </nav>
        <a className="s1-brand" href={hrefOf('home')}>
          <i />
          SuperHumans
        </a>
      </header>

      <section className="s1-head">
        <div className="s1-head-l">
          <p className="s1-idx">
            <b>{check.n}</b>
            <span>/ 06</span>
            <span className="s1-idx-site">{check.site}</span>
          </p>
          <h1 className="s1-title">{check.name}</h1>
        </div>
        <div className="s1-head-r">
          <p className="s1-line">{check.line}</p>
          <div className="s1-actions">
            {done ? (
              <button className="s1-btn is-ghost" type="button" onClick={() => stage.current?.reset()}>
                <ArrowCounterClockwise weight="bold" />
                Reset
              </button>
            ) : (
              <button className="s1-btn" type="button" disabled={running} onClick={runIt}>
                <Play weight="fill" />
                {running ? 'Running…' : check.cta}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="s1-stage">
        <i className="s1-corner c-tl" />
        <i className="s1-corner c-tr" />
        <i className="s1-corner c-bl" />
        <i className="s1-corner c-br" />
        <div className="s1-stagebox">
          <Suspense fallback={<p className="s1-loading">Loading the model…</p>}>
            <Stage id={check.id} ref={stage} onAct={onAct} onState={onState} />
          </Suspense>
        </div>
      </section>

      <section className="s1-next" data-on={act ? 1 : 0} aria-live="polite">
        <span className="s1-next-k">What to do next</span>
        {act ? (
          <p className="s1-next-v">
            {act.headline}
            <em>{act.whoActs}</em>
          </p>
        ) : (
          <p className="s1-next-v is-wait">Run the check: it ends in one plain action.</p>
        )}
      </section>

      {check.id === 'tracktrace' && (
        <section className="s1-arch">
          <div className="s1-arch-copy">
            <p className="s1-idx">
              <b>Our own model</b>
            </p>
            <h2>IonScan</h2>
            <p>IonScan, our own 3.2 M-parameter network</p>
          </div>
          <figure className="s1-arch-card">
            <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
          </figure>
        </section>
      )}

      <nav className="s1-pager" aria-label="Previous and next check">
        <a href={hrefOf(prev.id)} className="s1-page is-prev">
          <span className="s1-page-disc">
            <i style={lensStyle(prev)} />
          </span>
          <span className="s1-page-t">
            <small>
              <ArrowLeft weight="bold" /> {prev.n}
            </small>
            {prev.name}
          </span>
        </a>
        <a href={hrefOf(next.id)} className="s1-page is-next">
          <span className="s1-page-t">
            <small>
              {next.n} <ArrowRight weight="bold" />
            </small>
            {next.name}
          </span>
          <span className="s1-page-disc">
            <i style={lensStyle(next)} />
          </span>
        </a>
      </nav>
    </div>
  )
}

export default function S1({ view }: ProtoProps) {
  const root = useRef<HTMLDivElement>(null)
  const check = CHECKS.find((c) => c.id === view)
  useEffect(() => {
    root.current?.scrollTo(0, 0)
  }, [view])
  // A little depth: the orrery and the far dust drift against each other as the pointer moves.
  const onMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !root.current) return
    root.current.style.setProperty('--mx', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3))
    root.current.style.setProperty('--my', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3))
  }, [])
  return (
    <div className="s1" ref={root} data-view={check ? 'module' : 'home'} onPointerMove={onMove}>
      <Backdrop />
      {check ? <ModulePage key={check.id} check={check} /> : <Home />}
    </div>
  )
}

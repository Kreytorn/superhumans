// WORLDS "Six worlds": the home page is one small solar system whose six worlds are our six real samples.
// Pressing a world flies the camera in, stops time and opens that check's working screen; Back pulls out again.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import './worlds.css'
import type { ProtoProps } from '../../App'
import { navigate } from '../../lib/route'
import Scene, { hasWebGL } from './Scene'
import Stage, { type Act, type StageHandle, type StageState } from './stages'
import StorySection from './story'
import { BASE, SITE_LINE, WORLDS, isModule, worldOf, type ModuleId, type World } from './data'

const go = (view: string) => navigate(`proto/WORLDS/${view}`)

export default function Worlds({ view, params }: ProtoProps) {
  const id: ModuleId | null = isModule(view) ? view : null
  // ?still=1 shows the still fallback that appears when WebGL is not available
  const forceStill = params.get('still') === '1'
  const webgl = useMemo(() => !forceStill && hasWebGL(), [forceStill])
  const [arrived, setArrived] = useState<ModuleId | null>(null)
  const [settled, setSettled] = useState(!webgl)
  // data-ready (read by the screenshot tools) follows once the name tags have faded in
  const [ready, setReady] = useState(!webgl)
  useEffect(() => {
    if (!settled || ready) return
    const t = window.setTimeout(() => setReady(true), 1500)
    return () => window.clearTimeout(t)
  }, [settled, ready])
  const [hover, setHover] = useState<ModuleId | null>(null)
  const labels = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!id) setArrived(null)
    setHover(null)
  }, [id])
  // Escape is Back
  useEffect(() => {
    if (!id) return
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') go('home')
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [id])

  const open = !!id && (arrived === id || !webgl)
  const onArrive = useCallback((m: ModuleId) => setArrived(m), [])
  const onReady = useCallback(() => setSettled(true), [])
  const onPick = useCallback((m: ModuleId) => go(m), [])

  return (
    <div
      className="wd-root"
      data-view={id ? 'module' : 'home'}
      data-open={open ? 1 : 0}
      data-gl={webgl ? 1 : 0}
      data-settled={settled ? 1 : 0}
      data-ready={ready && (!id || open) ? 1 : 0}
      // home has nothing to run, so it shows the same view for ?state=idle and ?state=result (test hook only)
      data-state={id ? undefined : params.get('state') === 'result' ? 'result' : 'idle'}
    >
      <div className="wd-scene" aria-hidden="true" data-qa={id ? undefined : 'hero'}>
        {webgl ? <Scene focus={id} hover={hover} frozen={open} labels={labels} onPick={onPick} onHover={setHover} onArrive={onArrive} onReady={onReady} /> : <Still focus={id} />}
      </div>
      <div className="wd-shade" aria-hidden="true" />

      <header className="wd-top">
        <a className="wd-brand" href="#/proto/WORLDS/home">
          <i aria-hidden="true" />
          SuperHumans
        </a>
        <span className="wd-top-note">Six checks. Real data. No server.</span>
      </header>

      <nav className="wd-labels" hidden={!webgl} aria-label="The six health checks">
        {WORLDS.map((w, i) => (
          <button
            key={w.id}
            ref={(el) => {
              labels.current[i] = el
            }}
            className="wd-label"
            data-id={w.id}
            data-qa={i === 0 && !id ? 'primary' : undefined}
            data-hot={hover === w.id ? 1 : 0}
            tabIndex={id ? -1 : 0}
            onClick={() => go(w.id)}
            onPointerEnter={() => setHover(w.id)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(w.id)}
            onBlur={() => setHover(null)}
          >
            <span>
              <b>{w.name}</b>
              <em>{w.kind}</em>
            </span>
          </button>
        ))}
      </nav>

      <section className="wd-hero">
        <h1>
          Six worlds inside
          <br />
          <i>one human body.</i>
        </h1>
        <p>{SITE_LINE}</p>
        <p className="wd-hint">
          <span aria-hidden="true" />
          Every world is one of our real samples. Press one.
        </p>
      </section>

      <span className="wd-mark">AI-generated imagery</span>

      {id && <ModulePage key={id} world={worldOf(id)} open={open} />}
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ module page
function ModulePage({ world, open }: { world: World; open: boolean }) {
  const stage = useRef<StageHandle>(null)
  const [state, setState] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const onState = useCallback((s: StageState) => setState(s), [])
  // Run stays off until the stage has loaded its sample, so the button never does nothing
  const box = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!open) return
    const t0 = performance.now()
    const iv = window.setInterval(() => {
      const el = box.current?.querySelector('[data-ready]')
      if (el?.getAttribute('data-ready') === '1' || performance.now() - t0 > 10000) {
        setLoaded(true)
        window.clearInterval(iv)
      }
    }, 150)
    return () => window.clearInterval(iv)
  }, [open, world.id])
  const idx = WORLDS.findIndex((w) => w.id === world.id)
  const next = WORLDS[(idx + 1) % WORLDS.length]
  const n = String(idx + 1).padStart(2, '0')

  return (
    <div className="wd-page" data-open={open ? 1 : 0} data-id={world.id} data-state={state}>
      <button className="wd-back" onClick={() => go('home')}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Back to the six worlds
      </button>

      <aside className="wd-side">
        <div className="wd-portal" aria-hidden="true" />
        <p className="wd-kicker">
          World {n} <span>/ 06</span> · made from {world.kind}
        </p>
        <h2 className="wd-name">{world.name}</h2>
        <p className="wd-sentence">{world.sentence}</p>
        <div className="wd-actions">
          <button
            className="wd-run"
            data-qa="primary"
            disabled={state === 'running' || !open || !loaded}
            onClick={() => {
              if (state === 'result' || state === 'error') stage.current?.reset()
              window.setTimeout(() => stage.current?.run(), state === 'idle' ? 0 : 60)
            }}
          >
            <i aria-hidden="true" />
            {!loaded ? 'Loading the sample' : state === 'running' ? 'Running' : state === 'result' ? 'Run it again' : 'Run the check'}
          </button>
          <button className="wd-next" onClick={() => go(next.id)}>
            Next world: {next.name}
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7.5 4.5 13 10l-5.500 5.5" />
            </svg>
          </button>
        </div>
        <button
          className="wd-cue"
          onClick={(e) => {
            const page = e.currentTarget.closest('.wd-page')
            const story = page?.querySelector('.wd-story') as HTMLElement | null
            if (page && story) page.scrollTo({ top: story.offsetTop - 24, behavior: 'smooth' })
          }}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4.5 7.5 10 13l5.5-5.5" />
          </svg>
          {world.id === 'tracktrace' ? 'The story, and how IonScan reads a nucleus' : 'The story, and how it works'}
        </button>
      </aside>

      <main className="wd-main">
        <div className="wd-stage" ref={box} data-qa="hero">
          {open && <Stage id={world.id} ref={stage} onAct={onAct} onState={onState} />}
        </div>
        <div className="wd-act" data-show={act ? 1 : 0} aria-live="polite">
          {act ? (
            <>
              <span>What to do next</span>
              <strong>{act.headline}</strong>
              <em>{act.whoActs}</em>
            </>
          ) : (
            <span className="wd-act-idle">{state === 'running' ? 'The model is reading the sample.' : 'Time is stopped. The world is waiting for its check.'}</span>
          )}
        </div>
      </main>
      {open && <StorySection world={world} next={next} onNext={() => go(next.id)} />}
    </div>
  )
}

// ------------------------------------------------------------------------- still fallback (no WebGL available)
const STILL_POS: Record<ModuleId, [number, number, number]> = {
  tracktrace: [47, 40, 9],
  bubblegrade: [72, 52, 11],
  spikecount: [70, 22, 9],
  veinsqueeze: [27, 42, 9],
  braindrift: [84, 74, 14],
  garnmeter: [36, 20, 8],
}

const SUN: [number, number] = [56, 44]
const SQUASH = 0.46

function Still({ focus }: { focus: ModuleId | null }) {
  return (
    <div className="wd-still" data-focus={focus ?? ''}>
      {/* each orbit is the tilted ellipse around the sun that passes through its world, so it holds at any aspect */}
      <svg className="wd-still-orbits" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {WORLDS.map((w) => {
          const [x, y] = STILL_POS[w.id]
          const rx = Math.hypot(x - SUN[0], (y - SUN[1]) / SQUASH)
          return <ellipse key={w.id} cx={SUN[0]} cy={SUN[1]} rx={rx} ry={rx * SQUASH} vectorEffect="non-scaling-stroke" />
        })}
      </svg>
      <i className="wd-still-sun" />
      {WORLDS.map((w, k) => {
        const [x, y, d] = STILL_POS[w.id]
        const [u0, v0, cw, ch] = w.crop
        // unit vector from the world toward the sun: the lit side faces it, the night side looks away
        const lx = SUN[0] - x
        const ly = (SUN[1] - y) * 0.62
        const n = Math.hypot(lx, ly) || 1
        const style = {
          left: `${x}%`,
          top: `${y}%`,
          width: `${d}vmax`,
          '--lx': (lx / n).toFixed(3),
          '--ly': (ly / n).toFixed(3),
          animationDelay: `${-k * 1.3}s`,
        } as CSSProperties
        const img: CSSProperties = {
          backgroundImage: `url(${BASE}${w.image})`,
          backgroundSize: `${100 / cw}% ${100 / ch}%`,
          backgroundPosition: `${cw < 1 ? (u0 / (1 - cw)) * 100 : 0}% ${ch < 1 ? ((1 - v0 - ch) / (1 - ch)) * 100 : 0}%`,
        }
        return (
          <a key={w.id} className="wd-still-world" data-id={w.id} href={`#/proto/WORLDS/${w.id}`} style={style}>
            <i style={img} />
            <b>{w.name}</b>
            <em>{w.kind}</em>
          </a>
        )
      })}
    </div>
  )
}

// Inside a gate: one page design for all six checks. The page is one great slab: the name cut in its lintel,
// the working stage as its lit window, the controls on its sill.
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { ArrowCounterClockwise, ArrowLeft, ArrowRight, Play } from '@phosphor-icons/react'
import { navigate } from '../../lib/route'
import { CHECKS, type Check } from './data'
import { transit, type Flood } from './transit'
import { CLASS_COLOURS, CLASS_NAMES, CLASS_PLAIN, replay, type SpikeResult } from '../../engine/spikecount'

const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const GarnMeter = lazy(() => import('../../moments/garnmeter'))

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
    <div className="v01-spike">
      <div className="v01-spike-photo">
        <img src={`${import.meta.env.BASE_URL}spikecount/fields/96.png`} alt="Microscope photo of red blood cells" />
        <svg viewBox={`0 0 ${result?.width ?? 572} ${result?.height ?? 572}`} aria-hidden="true">
          {cells.map((c) => (
            <polygon key={c.id} points={c.polygon.map((p) => p.join(',')).join(' ')} fill={CLASS_COLOURS[c.className]} stroke={CLASS_COLOURS[c.className]} strokeDasharray={c.border ? '6 5' : undefined} />
          ))}
        </svg>
      </div>
      <div className="v01-spike-read">
        {shown === 0 ? (
          <>
            <span className="v01-tag">Real microscope photo</span>
            <p className="v01-spike-cap">Press “Grade this blood”: every cell gets its outline and its shape grade.</p>
          </>
        ) : (
          <>
            <span className="v01-tag">Replay · stored outputs</span>
            <span className="v01-spike-big">
              {pct.toFixed(1)}
              <small>%</small>
            </span>
            <p className="v01-spike-cap">spiky cells</p>
            <p className="v01-spike-sub">
              {spiky} of {cells.length} cells outlined
            </p>
            <ul className="v01-spike-key">
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

function Stage({ id, api, onState }: { id: string; api: React.RefObject<Api | null>; onState: (s: State) => void }) {
  const bind = <H extends { run: (...a: never[]) => unknown; reset: () => void }>(run: (h: H) => void) => (h: H | null) => {
    api.current = h ? { run: () => run(h), reset: () => h.reset() } : null
  }
  switch (id) {
    case 'tracktrace':
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} className="v01-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} className="v01-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} className="v01-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} className="v01-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} className="v01-fill" />
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

export default function Module({ check, flood }: { check: Check; flood: Flood }) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const [state, setState] = useState<State>('idle')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    // the gate's light that carried us in lets go
    const a = window.setTimeout(() => flood.clear(760), 60)
    const t = window.setTimeout(() => setReady(true), 1000)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(t)
    }
  }, [flood])
  const onState = useCallback((s: State) => setState(s), [])

  // back pulls the camera out of this gate to the hall
  const back = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    transit.from = reduced ? undefined : i
    if (reduced) {
      navigate('proto/V01/home')
      return
    }
    flood.set(check.hue, 1, 240)
    window.setTimeout(() => navigate('proto/V01/home'), 250)
  }

  return (
    <div className="v01 v01-mod" style={{ ['--hue' as string]: check.hue }} data-ready={ready ? '1' : undefined} data-proto="V01" data-state={state}>
      <div className="v01-mod-bg" aria-hidden="true">
        <i className="v01-mod-floor" />
      </div>

      <article className="v01-slab">
        <header className="v01-lintel">
          <a className="v01-btn v01-back" href="#/proto/V01/home" onClick={back}>
            <ArrowLeft weight="bold" />
            <span>The hall</span>
          </a>
          <div className="v01-title">
            <h1>
              <i>{check.n}</i>
              {check.name}
            </h1>
            <p>{check.sentence}</p>
          </div>
          <a className="v01-btn v01-next" href={`#/proto/V01/${next.id}`} style={{ ['--h' as string]: next.hue }}>
            <span>
              <em>Next gate</em>
              {next.name}
            </span>
            <ArrowRight weight="bold" />
          </a>
        </header>

        <section className="v01-window" data-m={check.id} aria-label={`${check.name} stage`}>
          <Suspense fallback={null}>
            <Stage id={check.id} api={api} onState={onState} />
          </Suspense>
        </section>

        <footer className="v01-sill">
          <div className="v01-actions">
            <button type="button" className="v01-run" onClick={() => api.current?.run()}>
              <Play weight="fill" />
              {check.run}
            </button>
            <button type="button" className="v01-btn v01-reset" onClick={() => api.current?.reset()}>
              <ArrowCounterClockwise weight="bold" />
              <span>Reset</span>
            </button>
            <p className="v01-status" data-s={state} aria-live="polite">
              <i />
              {STATUS[state]}
            </p>
          </div>
          <nav className="v01-pips" aria-label="The six gates">
            {CHECKS.map((c) => (
              <a key={c.id} className={`v01-pip${c.id === check.id ? ' is-on' : ''}`} style={{ ['--h' as string]: c.hue }} href={`#/proto/V01/${c.id}`} aria-label={c.name} aria-current={c.id === check.id ? 'page' : undefined} title={c.name}>
                <i />
                <span>{c.n}</span>
              </a>
            ))}
          </nav>
        </footer>
      </article>

      {check.id === 'tracktrace' && (
        <section className="v01-arch">
          <figure>
            <div className="v01-arch-card">
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

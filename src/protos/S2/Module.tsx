// One page design for all six checks: the working stage, large, with its name, its sentence and the way back and onward.
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { ArrowLeft, ArrowRight, Play } from '@phosphor-icons/react'
import { CHECKS, cropStyle, type Check } from './data'
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

const RUN_LABEL: Record<string, string> = {
  tracktrace: 'Scan the nucleus',
  bubblegrade: 'Play the heart sound',
  spikecount: 'Grade this blood',
  veinsqueeze: 'Press the probe',
  braindrift: 'Fly the brain',
  garnmeter: 'Play the session',
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
    <div className="s2-spike">
      <div className="s2-spike-photo">
        <img src={`${import.meta.env.BASE_URL}spikecount/fields/96.png`} alt="Microscope photo of red blood cells" />
        <svg viewBox={`0 0 ${result?.width ?? 572} ${result?.height ?? 572}`} aria-hidden="true">
          {cells.map((c) => (
            <polygon key={c.id} points={c.polygon.map((p) => p.join(',')).join(' ')} fill={CLASS_COLOURS[c.className]} stroke={CLASS_COLOURS[c.className]} strokeDasharray={c.border ? '6 5' : undefined} />
          ))}
        </svg>
      </div>
      <div className="s2-spike-read">
        {shown === 0 ? (
          <>
            <span className="s2-spike-tag">REAL MICROSCOPE PHOTO</span>
            <p className="s2-spike-cap">Press “Grade this blood”: every cell gets its outline and its shape grade.</p>
          </>
        ) : (
          <>
            <span className="s2-spike-tag">REPLAY · STORED OUTPUTS</span>
            <span className="s2-spike-big">
              {pct.toFixed(1)}
              <small>%</small>
            </span>
            <p className="s2-spike-cap">spiky cells</p>
            <p className="s2-spike-sub">
              {spiky} of {cells.length} cells outlined
            </p>
            <ul className="s2-spike-key">
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
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} className="s2-m-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} className="s2-m-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} className="s2-m-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} className="s2-m-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} className="s2-m-fill" />
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

export default function Module({ check }: { check: Check }) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const prev = CHECKS[(i + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const [state, setState] = useState<State>('idle')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    const t = window.setTimeout(() => setReady(true), 900)
    return () => window.clearTimeout(t)
  }, [])
  const onState = useCallback((s: State) => setState(s), [])

  return (
    <div className="s2 s2-module" style={{ ['--hue' as string]: check.hue }} data-ready={ready ? '1' : undefined} data-proto="S2" data-state={state}>
      <div className="s2-m-bg" aria-hidden="true" />
      <header className="s2-top">
        <a className="s2-back" href="#/proto/S2/home">
          <ArrowLeft weight="bold" />
          All checks
        </a>
        <nav className="s2-steps" aria-label="The six checks">
          {CHECKS.map((c) => (
            <a key={c.id} className={`s2-step${c.id === check.id ? ' is-on' : ''}`} style={{ ['--h' as string]: c.hue }} href={`#/proto/S2/${c.id}`} aria-label={c.name} aria-current={c.id === check.id ? 'page' : undefined} title={c.name}>
              {c.n}
            </a>
          ))}
        </nav>
        <a className="s2-next" href={`#/proto/S2/${next.id}`}>
          <em>Next</em>
          {next.name}
          <ArrowRight weight="bold" />
        </a>
      </header>

      <main className="s2-m-main">
        <aside className="s2-m-side">
          <div className="s2-m-head">
            <span className="s2-m-lens" style={cropStyle(check)} aria-hidden="true" />
            <p className="s2-m-kicker">
              {check.n} / 06 · {check.site}
            </p>
            <h1 className="s2-m-name">{check.name}</h1>
            <p className="s2-m-sentence">{check.sentence}</p>
          </div>
          <div className="s2-m-ctl">
            <div className="s2-m-actions">
              <button type="button" className="s2-m-run" onClick={() => api.current?.run()}>
                <Play weight="fill" />
                {RUN_LABEL[check.id]}
              </button>
              <button type="button" className="s2-m-reset" onClick={() => api.current?.reset()}>
                Reset
              </button>
            </div>
            <p className="s2-m-status" data-s={state} aria-live="polite">
              <i />
              {STATUS[state]}
            </p>
          </div>
          <nav className="s2-m-pager" aria-label="Previous and next check">
            <a className="s2-m-page" href={`#/proto/S2/${prev.id}`}>
              <small>← {prev.n}</small>
              <b>{prev.name}</b>
            </a>
            <a className="s2-m-page" href={`#/proto/S2/${next.id}`}>
              <small>{next.n} →</small>
              <b>{next.name}</b>
            </a>
          </nav>
        </aside>

        <section className="s2-m-stage" data-m={check.id} aria-label={`${check.name} stage`}>
          <Suspense fallback={null}>
            <Stage id={check.id} api={api} onState={onState} />
          </Suspense>
        </section>
      </main>

      {check.id === 'tracktrace' && (
        <section className="s2-m-arch">
          <figure>
            <div className="s2-m-arch-card">
              <img src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
            </div>
            <figcaption>
              IonScan, our own 3.2 M-parameter network
              <small>AI-generated illustration</small>
            </figcaption>
          </figure>
        </section>
      )}
      <footer className={`s2-m-foot${check.id === 'tracktrace' ? ' is-tall' : ''}`} />
    </div>
  )
}

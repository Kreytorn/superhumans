// One page design for all six checks: the dive ends inside the body, the real specimen fills the screen, and the working
// stage rises out of it. "Pull back" is always one press away and zooms back out to the person in the window.
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { navigate } from '../../lib/route'
import { CHECKS, type Check } from './data'
import Rail, { type Level } from './Rail'
import { CLASS_COLOURS, CLASS_NAMES, CLASS_PLAIN, replay, type SpikeResult } from '../../engine/spikecount'

const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const GarnMeter = lazy(() => import('../../moments/garnmeter'))

const BASE = import.meta.env.BASE_URL
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

// SpikeCount has no ready stage: a real field and the stored model outlines, drawn one by one.
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
    <div className="v6-spike">
      <button type="button" className="v6-spike-photo" onClick={() => void run()} aria-label="Grade this blood">
        <img src={`${BASE}spikecount/fields/96.png`} alt="Microscope photo of red blood cells" />
        <svg viewBox={`0 0 ${result?.width ?? 572} ${result?.height ?? 572}`} aria-hidden="true">
          {cells.map((c) => (
            <polygon key={c.id} points={c.polygon.map((p) => p.join(',')).join(' ')} fill={CLASS_COLOURS[c.className]} stroke={CLASS_COLOURS[c.className]} strokeDasharray={c.border ? '6 5' : undefined} />
          ))}
        </svg>
      </button>
      <div className="v6-spike-read">
        {shown === 0 ? (
          <>
            <span className="v6-spike-tag">Real microscope photo</span>
            <p className="v6-spike-cap">Press “Grade this blood”: every cell gets its outline and its shape grade.</p>
          </>
        ) : (
          <>
            <span className="v6-spike-tag">Replay · stored outputs</span>
            <span className="v6-spike-big">
              {pct.toFixed(1)}
              <small>%</small>
            </span>
            <p className="v6-spike-cap">spiky cells</p>
            <p className="v6-spike-sub">
              {spiky} of {cells.length} cells outlined
            </p>
            <ul className="v6-spike-key">
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
  const bind =
    <H extends { run: (...a: never[]) => unknown; reset: () => void }>(run: (h: H) => void) =>
    (h: H | null) => {
      api.current = h ? { run: () => run(h), reset: () => h.reset() } : null
    }
  switch (id) {
    case 'tracktrace':
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} className="v6-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} className="v6-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} className="v6-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} className="v6-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} className="v6-fill" />
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
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const [state, setState] = useState<State>('idle')
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const onState = useCallback((s: State) => setState(s), [])
  useEffect(() => {
    window.scrollTo(0, 0)
    const t = window.setTimeout(() => setReady(true), 1100)
    return () => window.clearTimeout(t)
  }, [])

  const pullBack = useCallback(
    (to?: Level) => {
      if (leaving) return
      setLeaving(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      window.setTimeout(() => navigate('proto/V06/home', { from: check.id, to: to && to !== 'body' ? to : undefined }), 320)
    },
    [check.id, leaving],
  )
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pullBack()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [pullBack])

  return (
    <div className={`v6 v6-mod${leaving ? ' is-leaving' : ''}`} style={{ ['--h' as string]: check.hue }} data-proto="V06" data-ready={ready ? '1' : undefined} data-state={state}>
      <div className="v6-mod-bg" aria-hidden="true">
        <img className="v6-mod-bg-wide" src={check.img} alt="" />
        <img className="v6-mod-bg-tall" src={check.imgTall} alt="" />
      </div>
      <div className="v6-mod-shade" aria-hidden="true" />

      <header className="v6-mod-top">
        <button type="button" className="v6-back" onClick={() => pullBack()}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M15 15 5 5M5 12V5h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Pull back
        </button>
        <a className="v6-next" href={`#/proto/V06/${next.id}`} style={{ ['--h' as string]: next.hue }}>
          <small>Next</small>
          <b>{next.name}</b>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </header>

      <main className="v6-mod-main">
        <aside className="v6-mod-side">
          <p className="v6-mod-kicker">
            <b>{check.n}</b> {check.site}
          </p>
          <h1 className="v6-mod-name">{check.name}</h1>
          <p className="v6-mod-sentence">{check.sentence}</p>
          <div className="v6-mod-ctl">
            <button type="button" className="v6-run" data-qa="primary" onClick={() => api.current?.run()}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
              </svg>
              {RUN_LABEL[check.id]}
            </button>
            <button type="button" className="v6-reset" onClick={() => api.current?.reset()}>
              Reset
            </button>
          </div>
          <p className="v6-mod-status" data-s={state} aria-live="polite">
            <i />
            {STATUS[state]}
          </p>
        </aside>

        <section className="v6-mod-stage" data-m={check.id} aria-label={`${check.name} stage`}>
          <Suspense fallback={null}>
            <Stage id={check.id} api={api} onState={onState} />
          </Suspense>
        </section>
      </main>

      {check.id === 'tracktrace' && (
        <section className="v6-arch">
          <figure>
            <div className="v6-arch-card">
              <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        </section>
      )}

      <Rail level={null} focus={i} open={i} onLevel={(l) => pullBack(l)} onPlace={(j) => (j === i ? api.current?.run() : navigate(`proto/V06/${CHECKS[j].id}`))} />
    </div>
  )
}

// One page for all six checks. It opens inside the cluster the camera flew into: the stars have parted and stopped,
// and the check's working stage sits in the gap with its name, its sentence and Back.
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref, type RefObject } from 'react'
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, Play } from '@phosphor-icons/react'
import { CHECKS, type Check } from './data'
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

// SpikeCount: a real microscope field, and the stored model outlines drawn over it in the model's own cell order.
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
        const k = Math.min(n, Math.floor(((now - t0) / 2800) * n) + 1)
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
    <div className="gx-spike">
      <button type="button" className="gx-spike-photo" onClick={() => void run()} aria-label="Grade this blood">
        <img src={`${import.meta.env.BASE_URL}spikecount/fields/96.png`} alt="Microscope photo of red blood cells" />
        <svg viewBox={`0 0 ${result?.width ?? 572} ${result?.height ?? 572}`} aria-hidden="true">
          {cells.map((c) => (
            <polygon key={c.id} points={c.polygon.map((p) => p.join(',')).join(' ')} fill={CLASS_COLOURS[c.className]} stroke={CLASS_COLOURS[c.className]} strokeDasharray={c.border ? '6 5' : undefined} />
          ))}
        </svg>
      </button>
      <div className="gx-spike-read">
        {shown === 0 ? (
          <>
            <span className="gx-tag">Real microscope photo</span>
            <p className="gx-spike-cap">Press the photo: every cell gets its outline and its shape grade.</p>
          </>
        ) : (
          <>
            <span className="gx-tag">Replay · stored outputs</span>
            <span className="gx-spike-big">
              {pct.toFixed(1)}
              <small>%</small>
            </span>
            <p className="gx-spike-cap">spiky cells</p>
            <p className="gx-spike-sub">
              {spiky} of {cells.length} cells outlined
            </p>
            <ul className="gx-spike-key">
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
  const bind = <H extends { run: (...a: never[]) => unknown; reset: () => void }>(run: (h: H) => void) => (h: H | null) => {
    api.current = h ? { run: () => run(h), reset: () => h.reset() } : null
  }
  switch (id) {
    case 'tracktrace':
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} className="gx-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} className="gx-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} className="gx-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} className="gx-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} className="gx-fill" />
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

export default function Module({ check, open, onBack, onGo }: { check: Check; open: boolean; onBack: () => void; onGo: (id: string) => void }) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const [state, setState] = useState<State>('idle')
  // the stage mounts only once the camera has arrived, so the flight stays smooth and the models load after it
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) setMounted(true)
  }, [open])
  const onState = useCallback((s: State) => setState(s), [])

  return (
    <div className={`gx-mod${open ? ' is-open' : ''}`} style={{ ['--hue' as string]: check.hue }} data-m={check.id} data-state={state} inert={!open}>
      <div className="gx-mod-scroll">
        <div className="gx-mod-grid">
          <aside className="gx-mod-side">
            <button type="button" className="gx-back" onClick={onBack}>
              <ArrowLeft weight="bold" />
              Back
            </button>
            <div className="gx-mod-head">
              <p className="gx-mod-kicker">
                <b>{check.n}</b>
                {check.site}
              </p>
              <h1 className="gx-mod-name">{check.name}</h1>
              <p className="gx-mod-sentence">{check.sentence}</p>
              <div className="gx-mod-actions">
                <button type="button" className="gx-run" onClick={() => api.current?.run()}>
                  <Play weight="fill" />
                  {check.run}
                </button>
                <button type="button" className="gx-reset" onClick={() => api.current?.reset()} aria-label="Reset">
                  <ArrowCounterClockwise weight="bold" />
                </button>
              </div>
              <p className="gx-status" data-s={state} aria-live="polite">
                <i />
                {STATUS[state]}
              </p>
            </div>
            <button type="button" className="gx-next" onClick={() => onGo(next.id)}>
              <small>Next cluster</small>
              <span>
                {next.name}
                <ArrowRight weight="bold" />
              </span>
            </button>
          </aside>

          <section className="gx-stage" aria-label={`${check.name} stage`}>
            <Suspense fallback={null}>{mounted && <Stage id={check.id} api={api} onState={onState} />}</Suspense>
          </section>
        </div>

        {check.id === 'tracktrace' && (
          <figure className="gx-arch">
            <div className="gx-arch-frame">
              <div className="gx-arch-card">
                <img src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
              </div>
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}

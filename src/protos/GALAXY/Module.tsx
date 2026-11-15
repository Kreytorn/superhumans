// One page for all six checks. It opens inside the cluster the camera flew into: the stars have parted and stopped,
// and the check's working stage sits in the gap with its name, its sentence and Back.
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowCounterClockwise, Play } from '@phosphor-icons/react'
import { CHECKS, type Check } from './data'
import Story from './Story'

const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const GarnMeter = lazy(() => import('../../moments/garnmeter'))
const SpikeCount = lazy(() => import('../../moments/spikecount'))

type State = 'idle' | 'running' | 'result' | 'error'
interface Api {
  run: () => void
  reset: () => void
}
export type { State }
const STATUS: Record<State, string> = { idle: 'Ready', running: 'Model running', result: 'Result in', error: 'Could not run' }

function Stage({ id, api, onState, pin }: { id: string; api: RefObject<Api | null>; onState: (s: State) => void; pin?: 'idle' | 'result' }) {
  const bind = <H extends { run: (...a: never[]) => unknown; reset: () => void }>(run: (h: H) => void) => (h: H | null) => {
    api.current = h ? { run: () => run(h), reset: () => h.reset() } : null
  }
  switch (id) {
    case 'tracktrace':
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} state={pin} className="gx-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} state={pin} className="gx-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} state={pin} className="gx-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} state={pin} className="gx-fill" />
    case 'garnmeter':
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} state={pin} className="gx-fill" />
    default:
      return <SpikeCount ref={bind((h) => void h.run())} onState={onState} state={pin} className="gx-fill" />
  }
}

export default function Module({
  check,
  open,
  onBack,
  onGo,
  pin,
  onStateChange,
}: {
  check: Check
  open: boolean
  onBack: () => void
  onGo: (id: string) => void
  /** ?state=idle|result pins the stage (the stages then show their stored outputs) */
  pin?: 'idle' | 'result'
  onStateChange?: (s: State) => void
}) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const next = CHECKS[(i + 1) % CHECKS.length]
  const api = useRef<Api | null>(null)
  const [state, setState] = useState<State>('idle')
  // the stage mounts only once the camera has arrived, so the flight stays smooth and the models load after it
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) setMounted(true)
  }, [open])
  const stateRef = useRef<State>('idle')
  const retry = useRef(0)
  const onState = useCallback(
    (s: State) => {
      stateRef.current = s
      setState(s)
      onStateChange?.(s)
    },
    [onStateChange],
  )
  // a press that lands while the stage is still loading its clips or model is kept and tried again until it takes
  const run = useCallback(() => {
    window.clearTimeout(retry.current)
    api.current?.run()
    let n = 0
    const again = () => {
      if (stateRef.current !== 'idle' || ++n > 24) return
      api.current?.run()
      retry.current = window.setTimeout(again, 500)
    }
    retry.current = window.setTimeout(again, 600)
  }, [])
  useEffect(() => () => window.clearTimeout(retry.current), [])

  return (
    <div className={`gx-mod${open ? ' is-open' : ''}`} style={{ ['--hue' as string]: check.hue }} data-m={check.id} data-wide={check.id === 'spikecount' || check.id === 'veinsqueeze' ? '1' : undefined} data-state={state} inert={!open}>
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
                <button type="button" className="gx-run" data-qa="primary" onClick={run}>
                  <Play weight="fill" />
                  {check.run}
                </button>
                <button
                  type="button"
                  className="gx-reset"
                  disabled={state === 'idle'}
                  onClick={() => {
                    window.clearTimeout(retry.current)
                    api.current?.reset()
                  }}
                  aria-label="Reset"
                >
                  <ArrowCounterClockwise weight="bold" />
                </button>
              </div>
              <p className="gx-status" data-s={state} aria-live="polite">
                <i />
                {STATUS[state]}
              </p>
            </div>
            <div className="gx-mod-foot">
            <button type="button" className="gx-more" onClick={() => document.getElementById(`gx-story-${check.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <ArrowDown weight="bold" />
              {check.id === 'tracktrace' ? 'The story, and how IonScan reads' : 'The story, and how it works'}
            </button>
            <button type="button" className="gx-next" onClick={() => onGo(next.id)}>
              <small>Next cluster</small>
              <span>
                {next.name}
                <ArrowRight weight="bold" />
              </span>
            </button>
            </div>
          </aside>

          <section className="gx-stage" aria-label={`${check.name} stage`}>
            <Suspense fallback={null}>{mounted && <Stage id={check.id} api={api} onState={onState} pin={pin} />}</Suspense>
          </section>
        </div>

        <Story check={check} next={next} onBack={onBack} onGo={onGo} />
      </div>
    </div>
  )
}

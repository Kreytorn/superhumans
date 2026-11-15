// DF check page: one design for all six checks. The working stage, large; the check's name and sentence; Back;
// and beside (or under) the stage the one number and the "who acts + one action" sentence the stage reports.
// Every number and sentence in the result panel comes from the stage's onResult at run time.
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './check.css'
import { href, type Mod } from './data'
import type { TrackTraceMomentHandle } from '../../moments/tracktrace'
import type { BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import type { VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import type { BrainDriftMomentHandle } from '../../moments/braindrift'
import type { GarnMomentHandle } from '../../moments/garnmeter'
import type { SpikeHandle } from './check_spike'

// Each stage is its own chunk, fetched only when its page has landed.
const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const Garn = lazy(() => import('../../moments/garnmeter'))
const Spike = lazy(() => import('./check_spike'))

type Phase = 'idle' | 'running' | 'result' | 'error'
export interface Outcome {
  /** The one number (or grade), exactly as the stage's result gives it. */
  big?: string
  bigLabel?: string
  who?: string
  action?: string
  /** Shown only where the stage does not print LIVE / REPLAY itself. */
  source?: 'LIVE' | 'REPLAY'
  /** The decision's fixed honesty lines, verbatim, behind "How do we know?". */
  fine: string[]
}

type Tokens = CSSProperties & Record<`--${string}`, string>
const BASE_TOKENS: Tokens = {
  '--m-stage': '#070A14',
  '--m-ink': '#F1F4FF',
  '--m-ink-2': '#9AA3BF',
  '--m-line': '#3A4266',
  '--m-font': '"Space Grotesk", system-ui, sans-serif',
  '--m-font-mono': '"JetBrains Mono", ui-monospace, Consolas, monospace',
  '--m-radius': '10px',
  width: '100%',
  height: '100%',
}
const TOKENS: Record<string, Tokens> = {
  tracktrace: { ...BASE_TOKENS, '--m-mark': '#FF7A45', '--m-accent': '#FFFFFF', '--m-specimen': '#ECE7DB' },
  bubblegrade: { ...BASE_TOKENS, '--m-stage': '#071421', '--m-mark': '#FF8F3A', '--m-mark-hot': '#FFE8BE', '--m-accent': '#3FD0FF' },
  veinsqueeze: { ...BASE_TOKENS, '--m-mark': '#FFD34D', '--m-accent': '#FF4F7B', aspectRatio: 'auto' },
  braindrift: { ...BASE_TOKENS, '--m-mark': '#5CF2B0', '--m-mark-2': '#F4FFFA', '--m-accent': '#F1F4FF' },
  garnmeter: {
    ...BASE_TOKENS,
    '--m-mark': '#8D97B5',
    '--m-accent': '#FFD34D',
    '--m-ok': '#2EE6A6',
    '--m-watch': '#FFB224',
    '--m-alert': '#FF4D5E',
    '--m-field-hi': '#F1F4FF',
    '--m-field-lo': '#000105',
  },
}

/** What pressing will do, in plain words (no numbers: those come from the stage). */
const BEFORE: Record<string, string> = {
  tracktrace: 'Press to scan this cell nucleus. IonScan circles each DNA-damage spot, then checks whether they line up.',
  bubblegrade: 'Press to play a real heart recording made after a dive. The model listens and grades the bubbles.',
  spikecount: 'Press to outline every red blood cell in this microscope photo and grade the spiky ones.',
  veinsqueeze: 'Hold the control on the stage to press on both veins. A healthy vein squashes flat when pressed.',
  braindrift: 'Drag the slider to after flight, or press the button. The AI maps the brain again and measures what changed.',
  garnmeter: 'Press to play a recorded session, or tap the scale to say how sick you feel. Your own answer decides what to do.',
}
const BUTTON: Record<string, string | null> = {
  tracktrace: 'Scan the nucleus',
  bubblegrade: 'Play the heart sound',
  spikecount: 'Outline the cells',
  veinsqueeze: null,
  braindrift: 'Fly the brain',
  garnmeter: 'Play the session',
}

const BASE = import.meta.env.BASE_URL

const fineOf = (a: unknown): string[] => {
  const c = (a as { caveats?: unknown } | null)?.caveats
  return Array.isArray(c) ? c.filter((x): x is string => typeof x === 'string') : []
}
/** The engines say "self" for the crew member; on screen that is "You". */
const who = (s: string | undefined) => {
  if (!s) return undefined
  const t = s === 'self' ? 'you' : s.startsWith('self,') ? `you${s.slice(4)}` : s
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const acts = (a: { whoActs: string; headline: string } | null | undefined) => (a ? { who: who(a.whoActs), action: a.headline, fine: fineOf(a) } : { fine: [] })

class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <div className="df-check-wait" data-error="1">
          <p>This stage could not start here.</p>
          <a className="df-check-ghost" href={href('home')}>
            Back to the body
          </a>
        </div>
      )
    return this.props.children
  }
}

function Waiting({ label }: { label: string }) {
  return (
    <div className="df-check-wait" aria-live="polite">
      <i aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export default function CheckPage({ mod, live }: { mod: Mod; live: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const tt = useRef<TrackTraceMomentHandle>(null)
  const bg = useRef<BubbleGradeMomentHandle>(null)
  const vs = useRef<VeinSqueezeMomentHandle>(null)
  const bd = useRef<BrainDriftMomentHandle>(null)
  const gm = useRef<GarnMomentHandle>(null)
  const sc = useRef<SpikeHandle>(null)
  const stageRef = useRef<HTMLElement>(null)
  // Every stage marks its root data-ready="1" once its sample is on screen; the main button waits for that.
  const [ready, setReady] = useState(false)
  const id = mod.id

  useEffect(() => {
    if (!live || ready) return
    const iv = window.setInterval(() => {
      if (stageRef.current?.querySelector('[data-ready="1"]')) setReady(true)
    }, 150)
    return () => window.clearInterval(iv)
  }, [live, ready])

  const onPhase = useCallback((s: Phase) => setPhase(s), [])
  const onSpike = useCallback((o: Outcome | null) => setOutcome(o), [])

  const reset = () => {
    setOutcome(null)
    tt.current?.reset()
    bg.current?.reset()
    vs.current?.reset()
    bd.current?.reset()
    gm.current?.reset()
    sc.current?.reset()
    setPhase('idle')
  }
  const press = () => {
    if (phase === 'result' || phase === 'error') return reset()
    if (id === 'tracktrace') tt.current?.run()
    else if (id === 'bubblegrade') bg.current?.run({ sound: true })
    else if (id === 'braindrift') bd.current?.run()
    else if (id === 'garnmeter') void gm.current?.run()
    else if (id === 'spikecount') sc.current?.run()
  }

  let stage: ReactNode = null
  if (live) {
    const style = TOKENS[id] ?? BASE_TOKENS
    if (id === 'tracktrace')
      stage = (
        <TrackTrace
          ref={tt}
          style={style}
          promise=""
          onState={onPhase}
          onResult={(r, a) => setOutcome({ big: String(r.count), bigLabel: 'DNA-damage spots circled in this nucleus', ...acts(a) })}
        />
      )
    else if (id === 'bubblegrade')
      stage = (
        <BubbleGrade
          ref={bg}
          style={style}
          onState={onPhase}
          onResult={(r, a) => setOutcome({ big: String(r.clip.grade), bigLabel: 'bubble grade', source: r.source === 'live' ? 'LIVE' : 'REPLAY', ...acts(a) })}
        />
      )
    else if (id === 'veinsqueeze')
      stage = (
        <VeinSqueeze
          ref={vs}
          style={style}
          onState={onPhase}
          onResult={(r, a) => {
            const done = (big: string) => setOutcome({ big, bigLabel: 'AI clot chance', ...acts(a) })
            // The stage's own formatter, so the page and the stage print the same value.
            import('../../moments/veinsqueeze').then((m) => done(m.formatChance(r.clotProb))).catch(() => done(`${(r.clotProb * 100).toFixed(1)}%`))
          }}
        />
      )
    else if (id === 'braindrift')
      // The stage itself shows its four numbers (measured beside put-in), so the page adds none: only who acts and what to do.
      stage = <BrainDrift ref={bd} style={style} onState={onPhase} onResult={(_r, a) => setOutcome({ ...acts(a) })} />
    else if (id === 'garnmeter')
      stage = (
        <Garn
          ref={gm}
          style={style}
          onState={onPhase}
          onResult={(_r, a) =>
            setOutcome({
              ...(a.checkinIds != null ? { big: String(a.checkinIds), bigLabel: 'of 7 on the check-in: how sick the person said they felt' } : {}),
              ...acts(a),
            })
          }
        />
      )
    else stage = <Spike ref={sc} onState={onPhase} onOutcome={onSpike} />
  }

  const label = BUTTON[id]
  const showButton = phase === 'result' || phase === 'error' || (label !== null && label !== undefined)
  const waiting = !ready && phase === 'idle'
  const buttonText = phase === 'running' ? 'Running' : phase === 'result' ? 'Start over' : phase === 'error' ? 'Try again' : waiting ? 'Loading' : label

  return (
    <div className="df-check" data-ready="1" data-state={phase} data-module={id} style={{ '--mc': mod.color } as CSSProperties}>
      <div className="df-check-in">
        <header className="df-check-head">
          <a className="df-back" href={href('home')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </a>
          <h1 className="df-check-name">{mod.name}</h1>
          <p className="df-check-sent">{mod.sentence}</p>
        </header>

        <div className="df-check-main">
          <section ref={stageRef} className="df-check-stage" aria-label={`${mod.name}: the working stage`}>
            {live ? (
              <StageBoundary>
                <Suspense fallback={<Waiting label="Loading the stage" />}>{stage}</Suspense>
              </StageBoundary>
            ) : (
              <Waiting label="Opening" />
            )}
          </section>

          <aside className="df-check-panel" aria-live="polite">
            <p className="df-check-eyebrow">
              {outcome ? 'Result' : phase === 'running' ? 'Working' : 'What it does'}
              {outcome?.source && <span className="df-check-tag">{outcome.source}</span>}
            </p>
            {phase === 'error' && !outcome ? (
              <p className="df-check-before">This check could not load its sample. Try again.</p>
            ) : outcome ? (
              <div className="df-check-result">
                {outcome.big !== undefined && (
                  <p className="df-check-big">
                    <b>{outcome.big}</b>
                    <span>{outcome.bigLabel}</span>
                  </p>
                )}
                {outcome.who && (
                  <p className="df-check-who">
                    <span>Who acts</span>
                    {outcome.who}
                  </p>
                )}
                {outcome.action && <p className="df-check-action">{outcome.action}</p>}
                {outcome.fine.length > 0 && (
                  <details className="df-check-fine">
                    <summary>How do we know?</summary>
                    <ul>
                      {outcome.fine.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p className="df-check-before">{BEFORE[id]}</p>
            )}
            {showButton && (
              <button type="button" className={`df-check-btn${phase === 'result' ? ' is-quiet' : ''}`} onClick={press} disabled={!live || waiting || phase === 'running'}>
                {buttonText}
              </button>
            )}
          </aside>
        </div>

        {id === 'tracktrace' && (
          <figure className="df-check-arch">
            <div className="df-check-arch-card">
              <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network: the layers a nucleus image passes through" loading="lazy" />
            </div>
            <figcaption>{'IonScan, our own 3.2 M-parameter network'}</figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}

// V10 module page: the zoom has gone through the medallion and the specimen fills the screen; on it the check is set
// as a plate of its own (gold frame, Roman numeral, display-serif name), with the working stage large in a gilt frame.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react'
import TrackTraceMoment, { type TrackTraceMomentHandle } from '../../moments/tracktrace'
import BubbleGradeMoment, { type BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import VeinSqueezeMoment, { type VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import BrainDriftMoment, { type BrainDriftMomentHandle } from '../../moments/braindrift'
import GarnMoment, { type GarnMomentHandle } from '../../moments/garnmeter'
import SpikeCountMoment, { type SpikeCountMomentHandle } from '../../moments/spikecount'
import { BASE, CHECKS, cropStyle, type Check, type ModuleId } from './data'

type StageState = 'idle' | 'running' | 'result' | 'error'
interface Act {
  headline: string
  whoActs: string
}
interface StageHandle {
  run(): void
  reset(): void
}

type Tokens = CSSProperties & Record<`--${string}`, string>
const BASE_TOKENS: Tokens = {
  '--m-stage': '#0a0920',
  '--m-ink': '#f7efdc',
  '--m-ink-2': '#d3c49f',
  '--m-font': "'Fraunces Variable', Georgia, serif",
  '--m-font-mono': "'Geist Mono Variable', ui-monospace, monospace",
}
const TOKENS: Record<ModuleId, Tokens> = {
  tracktrace: { ...BASE_TOKENS, '--m-stage': '#08081a', '--m-mark': '#ffc94d', '--m-accent': '#ffffff', '--m-ink-2': '#b9ab88' },
  bubblegrade: { ...BASE_TOKENS, '--m-stage': '#0b0a22', '--m-mark': '#f2a33c', '--m-mark-hot': '#fff0c8' },
  spikecount: { ...BASE_TOKENS, '--m-stage': '#08081a', '--m-pane': '#060614', '--m-rule': 'rgba(232, 189, 98, 0.22)' },
  veinsqueeze: { ...BASE_TOKENS, '--m-mark': '#ffcf4a', '--m-accent': '#f7efdc', '--m-line': 'rgba(232, 189, 98, 0.26)' },
  braindrift: { ...BASE_TOKENS, '--m-stage': '#090a1e', '--m-mark': '#5cc4f0', '--m-accent': '#f2d58a' },
  garnmeter: {
    ...BASE_TOKENS,
    '--m-mark': '#e8bd62',
    '--m-accent': '#b9a6ff',
    '--m-ok': '#55cf98',
    '--m-watch': '#ffd04a',
    '--m-alert': '#ff6a5a',
    '--m-field-hi': '#fff1c7',
    '--m-field-lo': '#0b0a22',
  },
}
const STATUS: Record<StageState, string> = { idle: 'Ready', running: 'Model running', result: 'Result in', error: 'Could not run' }
const pick = (a: { headline: string; whoActs: string } | null | undefined): Act | null => (a ? { headline: a.headline, whoActs: a.whoActs } : null)

function Stage({ id, ref, onAct, onState }: { id: ModuleId; ref: Ref<StageHandle>; onAct(a: Act | null): void; onState(s: StageState): void }) {
  const tt = useRef<TrackTraceMomentHandle>(null)
  const bg = useRef<BubbleGradeMomentHandle>(null)
  const vs = useRef<VeinSqueezeMomentHandle>(null)
  const bd = useRef<BrainDriftMomentHandle>(null)
  const gm = useRef<GarnMomentHandle>(null)
  const sc = useRef<SpikeCountMomentHandle>(null)
  // the vein stage ignores run() until its clips have loaded, so an early press is kept and played when ready
  const vsReady = useRef(false)
  const vsPending = useRef(false)

  useImperativeHandle(
    ref,
    () => ({
      run() {
        if (id === 'tracktrace') void tt.current?.run()
        else if (id === 'bubblegrade') bg.current?.run({ sound: true })
        else if (id === 'veinsqueeze') {
          if (vsReady.current) void vs.current?.run()
          else vsPending.current = true
        } else if (id === 'braindrift') void bd.current?.run()
        else if (id === 'garnmeter') void gm.current?.run()
        else sc.current?.run()
      },
      reset() {
        onAct(null)
        if (id === 'tracktrace') tt.current?.reset()
        else if (id === 'bubblegrade') bg.current?.reset()
        else if (id === 'veinsqueeze') vs.current?.reset()
        else if (id === 'braindrift') bd.current?.reset()
        else if (id === 'garnmeter') gm.current?.reset()
        else sc.current?.reset()
      },
    }),
    [id, onAct],
  )

  const style = TOKENS[id]
  switch (id) {
    case 'tracktrace':
      return <TrackTraceMoment ref={tt} className="v10-fill" style={style} promise="" onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'bubblegrade':
      return <BubbleGradeMoment ref={bg} className="v10-fill" style={style} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'veinsqueeze':
      return (
        <VeinSqueezeMoment
          ref={vs}
          className="v10-fill"
          style={style}
          onState={onState}
          onResult={(_r, a) => onAct(pick(a))}
          onReady={() => {
            vsReady.current = true
            if (vsPending.current) {
              vsPending.current = false
              void vs.current?.run()
            }
          }}
        />
      )
    case 'braindrift':
      return <BrainDriftMoment ref={bd} className="v10-fill" style={style} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'garnmeter':
      return <GarnMoment ref={gm} className="v10-fill" style={style} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    default:
      return <SpikeCountMoment ref={sc} className="v10-fill" style={style} promise="" onState={onState} onResult={(_r, a) => onAct(pick(a))} />
  }
}

/** Hyphenated words ("DNA-damage") never break across lines. */
function keepJoined(s: string) {
  return s.split(/(\S+-\S+)/).map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{part}</span> : part))
}

export default function Module({ check, index, entered, ghost = false, onReady }: { check: Check; index: number; entered: boolean; ghost?: boolean; onReady(): void }) {
  const stage = useRef<StageHandle>(null)
  const [state, setState] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const onState = useCallback((s: StageState) => setState(s), [])
  const next = CHECKS[(index + 1) % CHECKS.length]
  const ready = useRef(onReady)
  ready.current = onReady
  // The page itself is light and is on screen the moment the zoom lands. The working stage is heavy to start (models,
  // images): it is mounted a beat later, so the zoom and the page's entrance never wait on it.
  const [stageOn, setStageOn] = useState(false)
  useEffect(() => {
    if (ghost || stageOn) return
    const t = window.setTimeout(() => setStageOn(true), entered ? 140 : 0)
    return () => window.clearTimeout(t)
  }, [ghost, stageOn, entered])
  useEffect(() => {
    if (!stageOn) return
    const t = window.setTimeout(() => ready.current(), 1100)
    return () => window.clearTimeout(t)
  }, [stageOn])

  const done = state === 'result' || state === 'error'
  const [cx, cy] = check.crop
  return (
    <div className="v10-mod" data-state={state} data-id={check.id} data-entered={entered ? '1' : '0'}>
      <div className="v10-mod-bg" aria-hidden="true" style={{ backgroundImage: `url(${check.img})`, backgroundPosition: `${cx * 100}% ${cy * 100}%` }} />
      <div className="v10-mod-veil" aria-hidden="true" />
      <div className="v10-mod-frame" aria-hidden="true" />
      <div className="v10-mod-in">
        <header className="v10-bar">
          <a className="v10-back" href="#/proto/V10/home">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 5 7.5 12l7 7" />
            </svg>
            Back to the plate
          </a>
          <nav className="v10-steps" aria-label="The six checks">
            {CHECKS.map((k) => (
              <a key={k.id} href={`#/proto/V10/${k.id}`} className={k.id === check.id ? 'is-on' : undefined} aria-label={k.name} aria-current={k.id === check.id ? 'page' : undefined} title={k.name}>
                <span className="v10-step-img" style={cropStyle(k)} />
                <i>{k.n}</i>
              </a>
            ))}
          </nav>
          <a className="v10-next" href={`#/proto/V10/${next.id}`}>
            <span>Next</span>
            {next.name}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 5l7 7-7 7" />
            </svg>
          </a>
        </header>

        <main className="v10-mod-main">
          <section className="v10-mod-head">
            <p className="v10-kicker">
              <b>{check.n}</b>
              <span aria-hidden="true" />
              {check.site}
            </p>
            <h1 className="v10-mod-name">{check.name}</h1>
            <p className="v10-mod-line">{keepJoined(check.sentence)}</p>
            {/* VeinSqueeze is pressed on the stage itself (hold the probe), which also shows its own state */}
            {check.id !== 'veinsqueeze' && (
              <div className="v10-ctl">
                <button type="button" className="v10-run" data-qa={ghost ? undefined : 'run'} disabled={state === 'running'} onClick={() => (done ? stage.current?.reset() : stage.current?.run())}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {done ? <path d="M5 12a7 7 0 1 0 2.3-5.2M5 4v4h4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M8 5.5v13l11-6.5z" />}
                  </svg>
                  {state === 'running' ? 'Reading…' : done ? 'Start over' : check.run}
                </button>
                <p className="v10-status" data-s={state} aria-live="polite">
                  <i />
                  {STATUS[state]}
                </p>
              </div>
            )}
            <div className="v10-act" data-on={act ? '1' : '0'} aria-live="polite">
              {act && (
                <div className="v10-act-in" key={act.headline}>
                  <span>What to do next</span>
                  <p>{act.headline}</p>
                  <small>{act.whoActs}</small>
                </div>
              )}
            </div>
          </section>

          <section className="v10-frame-st" aria-label={`${check.name}, the working check`}>
            <i className="v10-corner is-tl" aria-hidden="true" />
            <i className="v10-corner is-tr" aria-hidden="true" />
            <i className="v10-corner is-bl" aria-hidden="true" />
            <i className="v10-corner is-br" aria-hidden="true" />
            <div className="v10-stage">{stageOn && <Stage id={check.id} ref={stage} onAct={onAct} onState={onState} />}</div>
          </section>
        </main>

        {check.id === 'tracktrace' && (
          <figure className="v10-arch">
            <div className="v10-arch-card">
              <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network, from the microscope image to the damage spots and the ion path" />
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}

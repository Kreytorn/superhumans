// V04 "Prism Ring": one page design for all six checks. The camera has flown into the chamber; its light is the page.
// The working stage sits large in a prismatic frame, with the check's name, its sentence, and the way back and on.
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import TrackTraceMoment, { type TrackTraceMomentHandle } from '../../moments/tracktrace'
import BubbleGradeMoment, { type BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import VeinSqueezeMoment, { type VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import BrainDriftMoment, { type BrainDriftMomentHandle } from '../../moments/braindrift'
import GarnMoment, { type GarnMomentHandle } from '../../moments/garnmeter'
import { replay, act as spikeAct, type SpikeResult } from '../../engine/spikecount'
import { BASE, CHECKS, type Check, type ModuleId } from './data'

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
  '--m-stage': '#06050e',
  '--m-ink': '#f5f2ff',
  '--m-ink-2': '#a09ac2',
  '--m-font': "'Red Hat Display Variable', system-ui, sans-serif",
  '--m-font-mono': "'Geist Mono Variable', ui-monospace, monospace",
}
const TOKENS: Record<ModuleId, Tokens> = {
  tracktrace: BASE_TOKENS,
  bubblegrade: { ...BASE_TOKENS, '--m-stage': '#070b1c', '--m-ink': '#e6f4ff', '--m-mark': '#ff9a3d', '--m-mark-hot': '#fff0cf' },
  spikecount: BASE_TOKENS,
  // its rule line ("A healthy vein squashes flat...") is set in the quiet colour at full size: keep it light, never dim grey
  veinsqueeze: { ...BASE_TOKENS, '--m-ink-2': '#d2cbf2', '--m-mark': '#ffd23f', '--m-accent': '#4fd0ff', '--m-line': 'rgba(190, 180, 255, 0.22)' },
  braindrift: { ...BASE_TOKENS, '--m-mark': '#4fd0ff', '--m-accent': '#f5f2ff' },
  garnmeter: { ...BASE_TOKENS, '--m-mark': '#8d87ad', '--m-accent': '#9a8cff', '--m-ok': '#46c992', '--m-watch': '#ffd23f', '--m-alert': '#ff5a52', '--m-field-hi': '#f1eeff', '--m-field-lo': '#0c0a1c' },
}
const STATUS: Record<StageState, string> = { idle: 'Ready', running: 'Model running', result: 'Result in', error: 'Could not run' }

const pick = (a: { headline: string; whoActs: string } | null | undefined): Act | null => (a ? { headline: a.headline, whoActs: a.whoActs } : null)

function Stage({ id, ref, onAct, onState }: { id: ModuleId; ref: Ref<StageHandle>; onAct(a: Act | null): void; onState(s: StageState): void }) {
  const tt = useRef<TrackTraceMomentHandle>(null)
  const bg = useRef<BubbleGradeMomentHandle>(null)
  const vs = useRef<VeinSqueezeMomentHandle>(null)
  const bd = useRef<BrainDriftMomentHandle>(null)
  const gm = useRef<GarnMomentHandle>(null)
  const sc = useRef<StageHandle>(null)
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
      // the page's own sentence already says what pressing finds: no second line over the nucleus
      return <TrackTraceMoment ref={tt} className="v04-fill" style={style} promise="" onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'bubblegrade':
      return <BubbleGradeMoment ref={bg} className="v04-fill" style={style} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'veinsqueeze':
      return (
        <VeinSqueezeMoment
          ref={vs}
          className="v04-fill"
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
      return <BrainDriftMoment ref={bd} className="v04-fill" style={style} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'garnmeter':
      return <GarnMoment ref={gm} className="v04-fill" style={style} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    default:
      return <SpikeStage ref={sc} onState={onState} onAct={onAct} />
  }
}

// ---------------------------------------------------------------------------------------------------------------
// SpikeCount: the real microscope photo with the stored outlines of our two models, drawn in a sweep.
const FIELD = 'field-96'
const FIELD_URL = `${BASE}spikecount/fields/96.png`

function SpikeStage({ ref, onState, onAct }: { ref: Ref<StageHandle>; onState(s: StageState): void; onAct(a: Act | null): void }) {
  const [res, setRes] = useState<SpikeResult | null>(null)
  const [phase, setPhase] = useState<StageState>('idle')
  const timer = useRef<number | undefined>(undefined)
  const token = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useImperativeHandle(
    ref,
    () => ({
      run() {
        const mine = ++token.current
        window.clearTimeout(timer.current)
        setRes(null)
        setPhase('running')
        onState('running')
        replay(FIELD)
          .then((r) => {
            if (mine !== token.current) return
            setRes(r)
            timer.current = window.setTimeout(
              () => {
                if (mine !== token.current) return
                setPhase('result')
                onState('result')
                onAct(pick(spikeAct(r)))
              },
              Math.min(3000, r.cells.length * 14) + 700,
            )
          })
          .catch(() => {
            if (mine !== token.current) return
            setPhase('error')
            onState('error')
          })
      },
      reset() {
        token.current++
        window.clearTimeout(timer.current)
        setRes(null)
        setPhase('idle')
        onState('idle')
      },
    }),
    [onAct, onState],
  )

  const cells = useMemo(() => (res ? [...res.cells].sort((a, b) => a.center[0] - b.center[0]) : []), [res])
  const step = cells.length ? Math.min(14, 3000 / cells.length) : 0
  const Wd = res?.width ?? 572
  const Ht = res?.height ?? 572
  const spiky = cells.filter((k) => k.cls >= 1 && k.cls <= 4).length

  return (
    <div className="v04-spike" data-phase={phase}>
      <div className="v04-spike-field">
        <img src={FIELD_URL} alt="Microscope photo of red blood cells" draggable={false} />
        <svg viewBox={`0 0 ${Wd} ${Ht}`} aria-hidden="true">
          {cells.map((k, i) => (
            <polygon
              key={k.id}
              className={k.cls >= 1 && k.cls <= 4 ? 'is-spiky' : undefined}
              points={k.polygon.map((p) => `${p[0]},${p[1]}`).join(' ')}
              pathLength={1}
              style={{ animationDelay: `${Math.round(i * step)}ms` }}
            />
          ))}
        </svg>
        {phase === 'running' && <i className="v04-spike-sweep" aria-hidden="true" />}
      </div>
      <div className="v04-spike-read">
        {!res && <p className="v04-spike-hint">{phase === 'error' ? 'The stored outlines could not be loaded.' : 'A real microscope photo of blood. Press “Grade this blood”: every cell gets its outline, and the spiky ones are counted.'}</p>}
        {res && (
          <>
            <p className="v04-spike-big">
              <b>{res.metrics.n}</b>
              <span>red blood cells outlined</span>
            </p>
            <p className="v04-spike-big is-hot" data-show={phase === 'result' ? 1 : 0}>
              <b>{spiky}</b>
              <span>graded spiky</span>
            </p>
            <ul className="v04-spike-key">
              <li>
                <i className="k-hot" /> spiky
              </li>
              <li>
                <i className="k-ok" /> not spiky
              </li>
            </ul>
            <span className="v04-tag">REPLAY · stored outputs of our two models</span>
          </>
        )}
      </div>
    </div>
  )
}

/** Hyphenated words ("DNA-damage") never break across lines. */
function keepJoined(s: string) {
  return s.split(/(\S+-\S+)/).map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{part}</span> : part))
}

// ---------------------------------------------------------------------------------------------------------------
export default function Module({ check, index, shown, ghost = false, onReady }: { check: Check; index: number; shown: boolean; ghost?: boolean; onReady(): void }) {
  const stage = useRef<StageHandle>(null)
  const [state, setState] = useState<StageState>('idle')
  const [act, setAct] = useState<Act | null>(null)
  const onAct = useCallback((a: Act | null) => setAct(a), [])
  const onState = useCallback((s: StageState) => setState(s), [])
  const next = CHECKS[(index + 1) % CHECKS.length]
  const ready = useRef(onReady)
  ready.current = onReady
  // The page (head and frame) is light and is mounted under the chamber's light at the end of the flight. The working
  // stage is heavy to start (models, images, a first canvas), so it starts only once the light has cleared (80 ms hold
  // + 200 ms fade): the flight and the light never wait on it, and it fades in inside the frame.
  const [stageOn, setStageOn] = useState(shown)
  useEffect(() => {
    if (!shown || stageOn) return
    const t = window.setTimeout(() => setStageOn(true), 300)
    return () => window.clearTimeout(t)
  }, [shown, stageOn])
  useEffect(() => {
    if (!stageOn) return
    const t = window.setTimeout(() => ready.current(), 1000)
    return () => window.clearTimeout(t)
  }, [stageOn])

  const done = state === 'result' || state === 'error'
  return (
    <div className="v04-mod" data-state={state} data-id={check.id} style={{ ['--hue' as string]: check.hue }}>
      <div className="v04-mod-bg" aria-hidden="true">
        <i style={{ backgroundImage: `url(${check.img})` }} />
      </div>
      <div className="v04-mod-in">
        <header className="v04-bar">
          <a className="v04-back" href="#/proto/V04/home">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.5 5 7.5 12l7 7" />
            </svg>
            Back to the ring
          </a>
          <nav className="v04-steps" aria-label="The six checks">
            {CHECKS.map((k) => (
              <a key={k.id} href={`#/proto/V04/${k.id}`} className={k.id === check.id ? 'is-on' : undefined} style={{ ['--h' as string]: k.hue }} aria-label={k.name} aria-current={k.id === check.id ? 'page' : undefined} title={k.name}>
                {k.n}
              </a>
            ))}
          </nav>
          <a className="v04-next" href={`#/proto/V04/${next.id}`}>
            <span>Next chamber</span>
            {next.name}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 5l7 7-7 7" />
            </svg>
          </a>
        </header>

        <section className="v04-head">
          <div className="v04-head-name">
            <p className="v04-kicker">
              <b>{check.n}</b> / 06 <i>{check.site}</i>
            </p>
            <h1>{check.name}</h1>
          </div>
          <p className="v04-sentence">{keepJoined(check.sentence)}</p>
          {/* VeinSqueeze is pressed on the stage itself (hold the probe), which also shows its own state: one control, not two */}
          {check.id !== 'veinsqueeze' && (
            <div className="v04-ctl">
              <p className="v04-status" data-s={state} aria-live="polite">
                <i />
                {STATUS[state]}
              </p>
              <button type="button" className="v04-run" data-qa={ghost ? undefined : 'primary'} disabled={state === 'running'} onClick={() => (done ? stage.current?.reset() : stage.current?.run())}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{done ? <path d="M5 12a7 7 0 1 0 2.3-5.2M5 4v4h4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M8 5.5v13l11-6.5z" />}</svg>
                {state === 'running' ? 'Reading…' : done ? 'Start over' : check.run}
              </button>
            </div>
          )}
        </section>

        <section className="v04-frame" aria-label={`${check.name}, the working check`}>
          <span className="v04-frame-glow" aria-hidden="true" />
          <div className="v04-stage">
            <div className="v04-stage-in">{stageOn && <Stage id={check.id} ref={stage} onAct={onAct} onState={onState} />}</div>
          </div>
        </section>

        {/* what to do next: the space is kept, the words arrive with the result */}
        <div className="v04-act" data-on={act ? '1' : '0'} aria-live="polite">
          {act && (
            <div className="v04-act-mid" key={act.headline}>
              <span>What to do next</span>
              <p>{act.headline}</p>
              <small>{act.whoActs}</small>
            </div>
          )}
        </div>

        {check.id === 'tracktrace' && (
          <figure className="v04-arch">
            <div className="v04-arch-card">
              <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network, from the microscope image to the damage spots and the ion path" />
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        )}
      </div>
    </div>
  )
}

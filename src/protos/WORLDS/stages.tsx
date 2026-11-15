// WORLDS "Six worlds": one wrapper around the five ready stages (src/moments/*) and a small SpikeCount stage,
// so the module page can drive any of them with the same two calls: run() and reset().
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import TrackTraceMoment, { type TrackTraceMomentHandle } from '../../moments/tracktrace'
import BubbleGradeMoment, { type BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import VeinSqueezeMoment, { type VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import BrainDriftMoment, { type BrainDriftMomentHandle } from '../../moments/braindrift'
import GarnMoment, { type GarnMomentHandle } from '../../moments/garnmeter'
import { replay, act as spikeAct, type SpikeResult } from '../../engine/spikecount'
import { BASE, type ModuleId } from './data'

export type StageState = 'idle' | 'running' | 'result' | 'error'
export interface Act {
  headline: string
  whoActs: string
}
export interface StageHandle {
  run(): void
  reset(): void
}
export interface StageProps {
  id: ModuleId
  ref?: Ref<StageHandle>
  onAct(a: Act | null): void
  onState(s: StageState): void
}

type Tokens = CSSProperties & Record<`--${string}`, string>

const BASE_TOKENS: Tokens = {
  '--m-stage': '#070a11',
  '--m-ink': '#f2ede4',
  '--m-ink-2': '#8d949e',
  '--m-font': "'Geist Variable', 'Geist', ui-sans-serif, sans-serif",
  '--m-font-mono': "'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace",
  width: '100%',
  height: '100%',
}
const GARN_TOKENS: Tokens = {
  ...BASE_TOKENS,
  '--m-mark': '#7b858f',
  '--m-accent': '#8fb0ff',
  '--m-ok': '#44c08a',
  '--m-watch': '#e0b040',
  '--m-alert': '#ff6a2b',
  '--m-field-hi': '#f2ede4',
  '--m-field-lo': '#000000',
}
const VEIN_TOKENS: Tokens = { ...BASE_TOKENS, '--m-accent': '#ffb27a', aspectRatio: 'auto' }

const pick = (a: { headline: string; whoActs: string } | null | undefined): Act | null =>
  a ? { headline: a.headline, whoActs: a.whoActs } : null

export default function Stage({ id, ref, onAct, onState }: StageProps) {
  const tt = useRef<TrackTraceMomentHandle>(null)
  const bg = useRef<BubbleGradeMomentHandle>(null)
  const vs = useRef<VeinSqueezeMomentHandle>(null)
  const bd = useRef<BrainDriftMomentHandle>(null)
  const gm = useRef<GarnMomentHandle>(null)
  const sc = useRef<StageHandle>(null)
  // The vein stage ignores run() until its clips have loaded, so an early press is kept and played on ready.
  const vsReady = useRef(false)
  const vsPending = useRef(false)

  useImperativeHandle(
    ref,
    () => ({
      run() {
        if (id === 'tracktrace') tt.current?.run()
        else if (id === 'bubblegrade') bg.current?.run({ sound: true })
        else if (id === 'veinsqueeze') {
          if (vsReady.current) vs.current?.run()
          else vsPending.current = true
        } else if (id === 'braindrift') bd.current?.run()
        else if (id === 'garnmeter') gm.current?.run()
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

  switch (id) {
    case 'tracktrace':
      return <TrackTraceMoment ref={tt} style={BASE_TOKENS} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'bubblegrade':
      return <BubbleGradeMoment ref={bg} style={BASE_TOKENS} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'veinsqueeze':
      return (
        <VeinSqueezeMoment
          ref={vs}
          style={VEIN_TOKENS}
          onState={onState}
          onResult={(_r, a) => onAct(pick(a))}
          onReady={() => {
            vsReady.current = true
            if (vsPending.current) {
              vsPending.current = false
              vs.current?.run()
            }
          }}
        />
      )
    case 'braindrift':
      return <BrainDriftMoment ref={bd} style={BASE_TOKENS} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    case 'garnmeter':
      return <GarnMoment ref={gm} style={GARN_TOKENS} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
    default:
      return <SpikeStage ref={sc} onState={onState} onAct={onAct} />
  }
}

// ---------------------------------------------------------------------------------------------------------------
// SpikeCount: the real microscope field with the stored outlines of our two models (replay), drawn in a sweep.
const FIELD = 'field-96'
const FIELD_URL = `${BASE}spikecount/fields/96.png`

function SpikeStage({ ref, onState, onAct }: { ref?: Ref<StageHandle>; onState(s: StageState): void; onAct(a: Act | null): void }) {
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
              Math.min(3200, r.cells.length * 14) + 700,
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
  const step = cells.length ? Math.min(14, 3200 / cells.length) : 0
  const W = res?.width ?? 572
  const H = res?.height ?? 572
  const spiky = cells.filter((c) => c.cls >= 1 && c.cls <= 4).length

  return (
    <div className="wd-spike" data-phase={phase}>
      <div className="wd-spike-field">
        <img src={res?.imageUrl ?? FIELD_URL} alt="Microscope photo of red blood cells" draggable={false} />
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {cells.map((c, i) => {
            const hot = c.cls >= 1 && c.cls <= 4
            return (
              <polygon
                key={c.id}
                className={hot ? 'wd-cell is-spiky' : 'wd-cell'}
                points={c.polygon.map((p) => `${p[0]},${p[1]}`).join(' ')}
                pathLength={1}
                style={{ animationDelay: `${Math.round(i * step)}ms` }}
              />
            )
          })}
        </svg>
        {phase === 'running' && <i className="wd-spike-sweep" aria-hidden="true" />}
      </div>
      <div className="wd-spike-read">
        {phase === 'idle' && <p className="wd-spike-hint">Outline every red blood cell in this photo, and count the spiky ones.</p>}
        {phase === 'error' && <p className="wd-spike-hint">The stored outlines could not be loaded.</p>}
        {res && (
          <>
            <p className="wd-spike-big">
              <b>{res.metrics.n}</b>
              <span>red blood cells outlined</span>
            </p>
            <p className="wd-spike-big is-hot" data-show={phase === 'result' ? 1 : 0}>
              <b>{spiky}</b>
              <span>graded spiky</span>
            </p>
            <ul className="wd-spike-key">
              <li>
                <i className="k-hot" /> spiky
              </li>
              <li>
                <i className="k-ok" /> not spiky
              </li>
            </ul>
            <span className="wd-tag">REPLAY · stored outputs of our two models</span>
          </>
        )}
      </div>
    </div>
  )
}

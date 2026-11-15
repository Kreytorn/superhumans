// WORLDS "Six worlds": one wrapper around the six ready stages (src/moments/*),
// so the module page can drive any of them with the same two calls: run() and reset().
import { useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react'
import TrackTraceMoment, { type TrackTraceMomentHandle } from '../../moments/tracktrace'
import BubbleGradeMoment, { type BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import VeinSqueezeMoment, { type VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import BrainDriftMoment, { type BrainDriftMomentHandle } from '../../moments/braindrift'
import GarnMoment, { type GarnMomentHandle } from '../../moments/garnmeter'
import SpikeCountMoment, { type SpikeCountMomentHandle } from '../../moments/spikecount'
import type { ModuleId } from './data'

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
const VEIN_TOKENS: Tokens = {
  ...BASE_TOKENS,
  '--m-accent': '#ffb27a',
  aspectRatio: 'auto',
}
const SPIKE_TOKENS: Tokens = {
  ...BASE_TOKENS,
  '--m-stage': '#070a11',
  '--m-pane': '#04060a',
  '--m-size': '14px',
}

const pick = (a: { headline: string; whoActs: string } | null | undefined): Act | null => (a ? { headline: a.headline, whoActs: a.whoActs } : null)

export default function Stage({ id, ref, onAct, onState }: StageProps) {
  const tt = useRef<TrackTraceMomentHandle>(null)
  const bg = useRef<BubbleGradeMomentHandle>(null)
  const vs = useRef<VeinSqueezeMomentHandle>(null)
  const bd = useRef<BrainDriftMomentHandle>(null)
  const gm = useRef<GarnMomentHandle>(null)
  const sc = useRef<SpikeCountMomentHandle>(null)
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
      return <SpikeCountMoment ref={sc} style={SPIKE_TOKENS} onState={onState} onResult={(_r, a) => onAct(pick(a))} />
  }
}

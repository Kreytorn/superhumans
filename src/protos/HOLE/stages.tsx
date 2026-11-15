// HOLE "The black hole": one wrapper around the six shared stages (src/moments/*),
// so the module page can drive any of them with the same two calls: run() and reset().
import { lazy, Suspense, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react'
import type { TrackTraceMomentHandle } from '../../moments/tracktrace'
import type { BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import type { VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import type { BrainDriftMomentHandle } from '../../moments/braindrift'
import type { GarnMomentHandle } from '../../moments/garnmeter'
import type { SpikeCountMomentHandle } from '../../moments/spikecount'
import type { ModuleId } from './data'

// Each stage is fetched only when its check is opened, so the home scene starts fast and stays light.
const TrackTraceMoment = lazy(() => import('../../moments/tracktrace'))
const BubbleGradeMoment = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueezeMoment = lazy(() => import('../../moments/veinsqueeze'))
const BrainDriftMoment = lazy(() => import('../../moments/braindrift'))
const GarnMoment = lazy(() => import('../../moments/garnmeter'))
const SpikeCountMoment = lazy(() => import('../../moments/spikecount'))

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
  '--m-stage': '#050506',
  '--m-ink': '#f6f1e8',
  '--m-ink-2': '#9a948a',
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
const SPIKE_TOKENS: Tokens = { ...BASE_TOKENS, '--m-stage': '#050506', '--m-pane': '#030304', '--m-size': '16px' }
const VEIN_TOKENS: Tokens = { ...BASE_TOKENS, '--m-accent': '#ffb86b', aspectRatio: 'auto' }

const pick = (a: { headline: string; whoActs: string } | null | undefined): Act | null =>
  a ? { headline: a.headline, whoActs: a.whoActs } : null

export default function Stage(props: StageProps) {
  return (
    <Suspense fallback={<div className="hole-stage-wait">Loading the check…</div>}>
      <StageInner {...props} />
    </Suspense>
  )
}

function StageInner({ id, ref, onAct, onState }: StageProps) {
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

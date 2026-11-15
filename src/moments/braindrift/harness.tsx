// Harness for the BrainDrift moment, shown at #/moment/braindrift. The stage fills the viewport; the only extra
// controls are the two a page would own (run, reset) and a one-line readout of what onResult and onState delivered.
//   ?state=idle|result   ?t=<ms>   ?sample=flight-f050   ?mode=auto|live|replay
//   ?poster=1 (specimen and marks only: no text, no slider)   ?labels=0   ?tags=0
import { useRef, useState, type CSSProperties } from 'react'
import '@fontsource-variable/newsreader'
import type { BrainDriftAct, FlightResult } from '../../engine/braindrift'
import { BrainDriftMoment, type BrainDriftMomentHandle, type MomentState } from './index'

export default function Harness({ params }: { params: URLSearchParams }) {
  const ref = useRef<BrainDriftMomentHandle>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [out, setOut] = useState<{ r: FlightResult; a: BrainDriftAct } | null>(null)
  const poster = params.get('poster') === '1'
  const st = params.get('state')
  const pin = poster ? 'result' : st === 'idle' || st === 'result' ? st : undefined
  const tRaw = params.get('t')
  const t = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : undefined
  const modeRaw = params.get('mode')
  const mode = modeRaw === 'live' || modeRaw === 'replay' ? modeRaw : poster ? 'replay' : 'auto'
  const sample = params.get('sample') ?? undefined
  const bare = poster || params.get('bare') === '1'
  const pct = out?.r.measured.ventricleChangePct
  // ?theme=paper proves the restyle path: the same stage with every token overridden from outside
  const paper = params.get('theme') === 'paper'

  return (
    <div data-harness="braindrift" data-harness-state={state} style={{ position: 'fixed', inset: 0, height: '100dvh', background: paper ? '#efece6' : '#0e1114' }}>
      <BrainDriftMoment
        key={`${sample}|${mode}|${pin}|${t}|${paper}`}
        ref={ref}
        style={paper ? PAPER : undefined}
        sampleId={sample}
        mode={mode}
        state={pin}
        t={t}
        labels={!poster && params.get('labels') !== '0'}
        tags={!poster && params.get('tags') !== '0'}
        controls={!poster && params.get('controls') !== '0'}
        onState={(s) => {
          setState(s)
          if (s === 'idle') setOut(null)
        }}
        onResult={(r, a) => setOut({ r, a })}
      />
      {bare ? null : (
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 10,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            font: '12.5px "Instrument Sans Variable", system-ui, sans-serif',
            color: '#929ca4',
          }}
        >
          {/* read by capture.mjs only: kept out of sight so the harness adds no words or numbers to the stage */}
          <span data-harness-out hidden>
            {state}
            {out ? `: ${pct == null ? 'n/a' : pct.toFixed(2)} % measured, ${out.r.live ? 'live' : 'replay'}, ${out.a.whoActs}` : ''}
          </span>
          <button type="button" data-harness-run onClick={() => ref.current?.run()} style={paper ? { ...btn, color: '#15181b' } : btn}>
            Run
          </button>
          <button type="button" data-harness-reset onClick={() => ref.current?.reset()} style={paper ? { ...btn, color: '#15181b' } : btn}>
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

const PAPER = {
  '--m-stage': '#efece6',
  '--m-ink': '#15181b',
  '--m-ink-2': '#626b72',
  '--m-mark': '#0c6fb3',
  '--m-mark-2': '#f2a93b',
  '--m-accent': '#15181b',
  '--m-specimen': '#c9c2b6',
  '--m-glass': '#4a5661',
  '--m-fluid': '#8d98a1',
  '--m-font': '"Newsreader Variable", Georgia, serif',
} as CSSProperties

const btn = {
  minHeight: 32,
  padding: '4px 12px',
  border: '1px solid #4a535b',
  borderRadius: 5,
  background: 'transparent',
  color: '#eef0f1',
  font: 'inherit',
  cursor: 'pointer',
} as const

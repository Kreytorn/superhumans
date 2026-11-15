// Harness for the SpikeCount stage (#/moment/spikecount): the stage fills the viewport, with only the controls
// needed to exercise it. URL: ?state=idle|result  ?t=<ms>  ?sample=field-184  ?mode=auto|live|replay
// ?bare=1 (the two images only, no controls; used for the posters).
import { useRef, useState } from 'react'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import { setParam } from '../../lib/route'
import SpikeCountMoment, { BEAT_TIMES, type MomentState, type SpikeCountMomentHandle } from './index'
import './harness.css'

const SAMPLES = [
  { id: 'field-96', label: 'Day 90' },
  { id: 'field-81', label: 'Day 60' },
  { id: 'field-121', label: 'Day 30' },
  { id: 'field-184', label: 'Preflight' },
]

export default function Harness({ params }: { params: URLSearchParams }) {
  const ref = useRef<SpikeCountMomentHandle>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [answer, setAnswer] = useState('')

  const sample = params.get('sample') ?? 'field-96'
  const modeParam = params.get('mode')
  const mode = modeParam === 'live' || modeParam === 'replay' ? modeParam : 'auto'
  const stateParam = params.get('state')
  const pinState = stateParam === 'idle' || stateParam === 'result' ? stateParam : undefined
  const tParam = params.get('t')
  const pinT = tParam !== null && Number.isFinite(Number(tParam)) ? Number(tParam) : undefined
  const bare = params.get('bare') === '1'

  const unpin = () => {
    if (params.has('state')) setParam('state', undefined)
    if (params.has('t')) setParam('t', undefined)
  }
  const primary = () => {
    if (pinState !== undefined || pinT !== undefined) {
      unpin()
      // the stage reloads unpinned; run once it is idle again
      setTimeout(() => ref.current?.run(), 250)
      return
    }
    if (state === 'running') ref.current?.reset()
    else ref.current?.run()
  }

  return (
    <div className="scm-harness" data-ready={ready ? '1' : '0'} data-state={state} data-bare={bare ? '1' : '0'} data-answer={answer}>
      <SpikeCountMoment
        ref={ref}
        sampleId={sample}
        mode={mode}
        state={pinState}
        t={pinT}
        bare={bare}
        onState={setState}
        onReady={setReady}
        onResult={(r, act) => setAnswer(`${r.metrics.spikyPct.toFixed(1)}% spiky, ${act.tierName}`)}
        className="scm-harness-stage"
      />
      {!bare && (
        <div className="scm-harness-bar">
          <button type="button" className="scm-harness-go" data-qa="primary" onClick={primary} disabled={!ready && state !== 'error'}>
            {state === 'running' ? 'Stop' : state === 'result' ? 'Read it again' : 'Read this sample'}
          </button>
          <div className="scm-harness-samples" role="group" aria-label="Sample">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === sample}
                onClick={() => {
                  unpin()
                  setParam('sample', s.id)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="scm-harness-scrub">
            <span>{pinT !== undefined ? `${pinT} ms` : 'scrub'}</span>
            <input
              type="range"
              min={0}
              max={BEAT_TIMES.END}
              step={50}
              value={pinT ?? (state === 'result' ? BEAT_TIMES.END : 0)}
              aria-label="Timeline, milliseconds"
              onChange={(e) => {
                if (params.has('state')) setParam('state', undefined)
                setParam('t', e.currentTarget.value)
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}

// Harness for the TrackTrace moment (#/moment/tracktrace): the stage fills the viewport, with only the controls
// needed to exercise it. URL: ?state=idle|result  ?t=<ms>  ?sample=nucleus-239 (pins one nucleus)  ?mode=auto|live|replay
// ?annotate=0 (no words on the stage)  ?bare=1 (no controls; used for the posters).
import { useRef, useState } from 'react'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import { setParam } from '../../lib/route'
import TrackTraceMoment, { BEAT_TIMES, type MomentBeat, type MomentState, type TrackTraceMomentHandle } from './index'
import './harness.css'

export default function Harness({ params }: { params: URLSearchParams }) {
  const ref = useRef<TrackTraceMomentHandle>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [answer, setAnswer] = useState('')
  const [onStage, setOnStage] = useState('')

  // ?sample=<id> pins one nucleus; without it the stage deals the next nucleus of its shuffled pool
  const sample = params.get('sample') ?? undefined
  const modeParam = params.get('mode')
  const mode = modeParam === 'live' || modeParam === 'replay' ? modeParam : 'auto'
  const stateParam = params.get('state')
  const pinState = stateParam === 'idle' || stateParam === 'result' ? stateParam : undefined
  const tParam = params.get('t')
  const pinT = tParam !== null && Number.isFinite(Number(tParam)) ? Number(tParam) : undefined
  const bare = params.get('bare') === '1'
  const annotate = params.get('annotate') !== '0'

  const unpin = () => {
    if (params.has('state')) setParam('state', undefined)
    if (params.has('t')) setParam('t', undefined)
  }
  const primary = () => {
    if (pinState !== undefined || pinT !== undefined) {
      unpin()
      // the moment reloads unpinned; run once it is idle again
      setTimeout(() => void ref.current?.run(), 250)
      return
    }
    if (state === 'running') ref.current?.reset()
    else void ref.current?.run()
  }

  return (
    <div className="ttm-harness" data-ready={ready ? '1' : '0'} data-state={state} data-beat={beat?.beat ?? 'specimen'} data-bare={bare ? '1' : '0'} data-answer={answer}>
      <TrackTraceMoment
        ref={ref}
        sampleId={sample}
        mode={mode}
        state={pinState}
        t={pinT}
        annotate={annotate}
        onState={setState}
        onReady={setReady}
        onBeat={setBeat}
        onSample={setOnStage}
        promise="Find the DNA damage in this cell nucleus, and whether it falls along the straight track of a heavy ion."
        onResult={(r, act) => setAnswer(`${r.count} spots${act ? `, ${act.whoActs}` : ''}`)}
        className="ttm-harness-stage"
      />
      {!bare && (
        <div className="ttm-harness-bar">
          <button type="button" className="ttm-harness-go" data-qa="primary" onClick={primary} disabled={!ready && state !== 'error'}>
            {state === 'running' ? 'Stop' : state === 'result' ? 'Read another one' : 'Read this nucleus'}
          </button>
          <span className="ttm-harness-samples" data-qa="tick">{onStage}{sample ? ' (pinned)' : ''}</span>
          <label className="ttm-harness-scrub">
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

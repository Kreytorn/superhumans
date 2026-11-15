// Harness for the SpikeCount stage (#/moment/spikecount): the stage fills the viewport, with one main button under it.
// r4, the owner's note: no scrub bar and no day picker on screen. Tests still pin through the URL:
// ?state=idle|result  ?t=<ms>  ?sample=field-<n> (default field-96)  ?mode=auto|live|replay
// ?bare=1 (the two images only, no controls; used for the posters).
import { useRef, useState } from 'react'
import '@fontsource-variable/schibsted-grotesk'
import '@fontsource-variable/spline-sans-mono'
import { setParam } from '../../lib/route'
import SpikeCountMoment, { type MomentState, type SpikeCountMomentHandle } from './index'
import './harness.css'

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
        </div>
      )}
    </div>
  )
}

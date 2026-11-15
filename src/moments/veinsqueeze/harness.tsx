// Harness for the VeinSqueeze moment, shown at #/moment/veinsqueeze.
// The stage fills the viewport; the thin bar holds only what is needed to exercise it and shows what a page receives.
//   ?state=idle|result   ?t=<ms>   ?sample=clip-a..clip-f   ?mode=auto|live|replay   ?poster=1 (specimen only, no words)
import './harness.css'
import { useEffect, useRef, useState } from 'react'
import * as vs from '../../engine/veinsqueeze'
import { VeinSqueezeMoment, type MomentMode, type MomentState, type VeinSqueezeMomentHandle } from './index'

interface Got {
  mode: 'live' | 'precomputed'
  timing: string
  who: string
  headline: string
  bestCase: boolean
}

export default function Harness({ params }: { params: URLSearchParams }) {
  const stateP = params.get('state')
  const pinState = stateP === 'idle' || stateP === 'result' ? stateP : undefined
  const tRaw = params.get('t')
  const pinT = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : undefined
  const sample = params.get('sample') ?? 'clip-a'
  const modeP = params.get('mode')
  const bare = params.get('poster') === '1'
  const [mode, setMode] = useState<MomentMode>(modeP === 'live' || modeP === 'replay' ? modeP : 'auto')
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [got, setGot] = useState<Got | null>(null)
  const [used, setUsed] = useState<'live' | 'replay' | null>(null)
  const moment = useRef<VeinSqueezeMomentHandle>(null)

  useEffect(() => {
    setReady(false)
    setGot(null)
    setUsed(null)
  }, [sample, mode])
  useEffect(() => {
    if (state === 'idle' || state === 'running') setGot(null)
  }, [state])

  return (
    <div className="vsqh" data-ready={ready ? '1' : undefined} data-state={state} data-bare={bare ? '1' : undefined} data-used={used ?? undefined}>
      {!bare && (
        <div className="vsqh-bar">
          <p className="vsqh-info">
            {(got ? got.bestCase : sample === 'clip-a' || sample === 'clip-b') && <span className="vsqh-tag">Best case</span>}{' '}
            <span className="vsqh-got" data-got={got ? '1' : undefined} data-timing={got?.timing} title={got?.timing}>
              {got ? `${got.who}: ${got.headline}` : ''}
            </span>
          </p>{' '}
          <span className="vsqh-ctl">
          <button type="button" onClick={() => moment.current?.run()}>
            Run
          </button>
          <button type="button" onClick={() => moment.current?.reset()}>
            Reset
          </button>
          <select aria-label="Mode" title="Mode" value={mode} onChange={(e) => setMode(e.target.value as MomentMode)}>
            <option value="auto">auto</option>
            <option value="live">live</option>
            <option value="replay">replay</option>
          </select>
          </span>
        </div>
      )}
      <VeinSqueezeMoment
        key={`${sample}:${mode}`}
        ref={moment}
        sampleId={sample}
        mode={mode}
        state={pinState}
        t={pinT}
        bare={bare}
        onState={setState}
        onReady={() => setReady(true)}
        onMode={setUsed}
        onResult={(r, act) =>
          setGot({
            mode: r.mode,
            timing: r.mode === 'live' ? `${r.timing.backend}, ${Math.round(r.timing.ms)} ms` : 'stored output',
            who: act.whoActs,
            headline: act.headline,
            bestCase: r.honesty.includes(vs.HONESTY_HERO_PAIR),
          })
        }
        className="vsqh-stage"
      />
    </div>
  )
}

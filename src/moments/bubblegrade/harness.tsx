// Harness for the BubbleGrade moment, shown at #/moment/bubblegrade.
// URL: ?state=idle|result  ?t=<clock ms>  ?sample=<clip id>  ?mode=auto|live|replay  ?bare=1 (specimen only)  ?rate=<n>
//      ?poster=1 (whole stage, no bar)  ?theme=paper (a light restyle through the --m-* tokens, to prove the stage can be re-dressed)
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { HarnessProps } from '../../App'
import * as bubble from '../../engine/bubblegrade'
import type { BubbleActDecision, BubbleResult } from '../../engine/bubblegrade'
import BubbleGradeMoment, { type BubbleGradeMomentHandle, type BubbleLive, type MomentState } from './index'

/** A second skin, set only through the documented tokens. */
const PAPER = {
  '--m-stage': '#f1ece1',
  '--m-ink': '#16303d',
  '--m-ink-2': '#5d6f77',
  '--m-mark': '#e2571c',
  '--m-mark-hot': '#7c1d06',
  '--m-accent': '#16303d',
} as CSSProperties

const CLIPS: [string, string][] = [
  ['grade-3', 'Clip: grade III'],
  ['grade-0', 'Clip: grade 0'],
  ['grade-1', 'Clip: grade I'],
  ['grade-2', 'Clip: grade II'],
  ['dcs-dive', 'Clip: dive that ended in DCS'],
  ['grade-4', 'Clip: grade IV (a miss)'],
]

export default function BubbleGradeHarness({ params }: HarnessProps) {
  const ref = useRef<BubbleGradeMomentHandle>(null)
  const pState = params.get('state')
  const pT = params.get('t')
  const pMode = params.get('mode')
  const bare = params.get('bare') === '1'
  // ?poster=1: the whole stage with its labels but without the harness bar (used for the two poster stills).
  const poster = params.get('poster') === '1'
  const rate = Number(params.get('rate')) || undefined
  const mode = pMode === 'live' || pMode === 'replay' ? pMode : 'auto'
  const skin = params.get('theme') === 'paper' ? PAPER : undefined

  const [sample, setSample] = useState(params.get('sample') ?? 'grade-3')
  // The URL pins the stage until a control is used.
  const [pinned, setPinned] = useState(true)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<BubbleLive | null>(null)
  const [done, setDone] = useState<{ r: BubbleResult; act: BubbleActDecision } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setPinned(true)
  }, [pState, pT])

  const pinState = pinned && (pState === 'idle' || pState === 'result') ? pState : undefined
  const pinT = pinned && pT !== null && Number.isFinite(Number(pT)) ? Number(pT) : undefined

  let read = 'Press to hear what the model hears.'
  let tag = ''
  if (state === 'error') read = 'The recording did not load.'
  else if (state === 'result' && done) {
    tag = done.r.source === 'live' ? 'LIVE' : 'REPLAY'
    read = `Grade ${done.r.clip.grade}. ${done.act.headline}`
  } else if (state === 'running' && loading) read = 'Loading the model, 29 MB, once.'
  else if (state === 'running') read = live?.grade ? `Grade ${live.grade} so far, ${live.slices} of its 5-second slices heard.` : 'Listening to the first 5 seconds.'

  return (
    <div className="bgh" style={skin} data-ready={ready ? '1' : undefined} data-state={state} data-bare={bare ? '1' : undefined} data-poster={poster ? '1' : undefined}>
      <BubbleGradeMoment
        ref={ref}
        sampleId={sample}
        mode={mode}
        state={pinState}
        t={pinT}
        rate={rate}
        bare={bare}
        onState={(s) => {
          setState(s)
          // The first state the stage reports means its picture (idle or a pinned frame) is on screen.
          if (s !== 'error') setReady(true)
          if (s === 'idle') {
            setDone(null)
            setLive(null)
          }
        }}
        onLive={setLive}
        onLoading={(f) => setLoading(f !== null)}
        onResult={(r, act) => setDone({ r, act })}
      />
      {!bare && !poster && (
        <div className="bgh-bar">
          <button
            type="button"
            data-qa="primary"
            disabled={!ready}
            onClick={() => {
              setPinned(false)
              // The tap starts the sound too: hearing it is the moment. The speaker button mutes.
              ref.current?.run({ sound: true })
            }}
          >
            {state === 'result' ? 'Listen again' : 'Listen for bubbles'}
          </button>
          <button
            type="button"
            data-qa="reset"
            disabled={!ready || state === 'idle'}
            onClick={() => {
              setPinned(false)
              ref.current?.reset()
            }}
          >
            Reset
          </button>
          <select
            aria-label="Recording"
            data-qa="sample"
            value={sample}
            onChange={(e) => {
              setPinned(false)
              setReady(false)
              setSample(e.target.value)
            }}
          >
            {CLIPS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <p className="bgh-read" data-qa="readout" aria-live="polite">
            {tag && <b data-qa="tag">{tag}</b>}
            {read}
            {state === 'result' && done ? ` ${bubble.HONESTY.card}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

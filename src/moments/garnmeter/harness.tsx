// Harness for the Garn Meter moment (#/moment/garnmeter): the stage filling the viewport and only the controls
// needed to exercise it. ?state=idle|result  ?t=<ms>  ?sample=<id>  ?mode=auto|live|replay  ?bare=1 (marks only, for posters)
// ?skin=light (a second set of tokens, to show that the stage restyles; the stage is dark by default)
import { useEffect, useRef, useState } from 'react'
import * as garn from '../../engine/garnmeter'
import type { GarnAct, GarnResult } from '../../engine/garnmeter'
import GarnMoment, { type GarnMomentHandle, type GarnReading, type MomentState } from './index'
import { GarnScalp } from './scalp'
import './harness.css'

export default function GarnHarness({ params }: { params: URLSearchParams }) {
  const ref = useRef<GarnMomentHandle>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [out, setOut] = useState<{ result: GarnResult; act: GarnAct; reading: GarnReading } | null>(null)
  const [how, setHow] = useState(false)

  const pinned = params.get('state')
  const tRaw = params.get('t')
  const t = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : undefined
  const mode = params.get('mode')
  const bare = params.get('bare') === '1'
  const light = params.get('skin') === 'light'

  // mobile baseline for a full-screen stage: no rubber-band scroll behind it
  useEffect(() => {
    const prev = document.documentElement.style.overscrollBehavior
    document.documentElement.style.overscrollBehavior = 'none'
    return () => {
      document.documentElement.style.overscrollBehavior = prev
    }
  }, [])
  useEffect(() => {
    if (!how) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHow(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [how])

  const played = out && state === 'result' ? out.result : null
  return (
    <div className={`gmh-root${light ? ' gmh-light' : ''}`} data-ready={ready ? '1' : undefined} data-state={state} data-bare={bare ? '1' : undefined}>
      {!bare && (
        <div className="gmh-bar">
          <button
            type="button"
            className="gmh-play"
            data-qa="primary"
            disabled={!ready || state === 'running'}
            onClick={() => {
              setOut(null)
              void ref.current?.run()
            }}
          >
            {state === 'result' ? 'Play again' : state === 'running' ? 'Playing' : 'Play the recording'}
          </button>
          {(state !== 'idle' || out) && (
            <button type="button" className="gmh-reset" onClick={() => { setOut(null); ref.current?.reset() }}>
              Reset
            </button>
          )}
          <button type="button" className="gmh-reset gmh-how" aria-expanded={how} aria-controls="gmh-how" onClick={() => setHow((v) => !v)}>
            How do we know?
          </button>
          {how && (
            <div id="gmh-how" className="gmh-sheet" role="region" aria-label="How do we know?">
              <p>{garn.STRINGS.personLabel}. {garn.STRINGS.groundAnalog}</p>
              <p>
                {played
                  ? played.source === 'live'
                    ? `The model answered all ${played.session.nWindows} windows in ${Math.round(played.timing.ms)} ms in this browser. `
                    : `The model's line is ${garn.STRINGS.precomputedLabel}. `
                  : 'Pressing play gets the model\'s answer for the whole recording at once. '}
                The animation then plays that finished answer. {garn.STRINGS.playback}
              </p>
              <p>{garn.STRINGS.garnDefinition}</p>
              {played && <p>{played.captions.resultCard}</p>}
              {played && <GarnScalp result={played} />}
              <button type="button" className="gmh-close" onClick={() => setHow(false)}>
                Close
              </button>
            </div>
          )}
        </div>
      )}
      <div className="gmh-stage" data-qa="hero">
        <GarnMoment
          ref={ref}
          sampleId={params.get('sample') ?? undefined}
          mode={mode === 'live' || mode === 'replay' ? mode : 'auto'}
          state={pinned === 'idle' || pinned === 'result' ? pinned : undefined}
          t={t}
          annotations={!bare}
          className={bare ? 'gmh-bare' : undefined}
          onState={setState}
          onReady={() => setReady(true)}
          onResult={(result, act, reading) => setOut({ result, act, reading })}
        />
      </div>
      {!bare && (
        <p className="gmh-out" data-qa="readout" aria-live="polite">
          {out && state !== 'running' ? `The model reads ${out.reading.garn.toFixed(2)} Garn for scene ${out.reading.trial}.` : ''}
        </p>
      )}
    </div>
  )
}

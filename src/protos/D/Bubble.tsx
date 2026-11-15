// The bubbles check (BubbleGrade). The ready BubbleGrade moment is the stage: a full-width band cut in the drape.
// One press plays the real heart Doppler clip aloud (sound only after that tap) and runs the model on it
// (live on a laptop, stored outputs on a phone); the grade settles as the clip is heard.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import * as bubble from '../../engine/bubblegrade'
import type { BubbleActDecision, BubbleResult } from '../../engine/bubblegrade'
import BubbleGradeMoment, { type BubbleGradeMomentHandle, type BubbleLive, type MomentState } from '../../moments/bubblegrade'
import { byId, hrefOf, type Level } from './data'
import { fitWord, isPhone, useViewport } from './fit'
import { FitWord, HowLayer, Mark } from './pieces'
import type { ViewProps } from './index'
import './bubble.css'

const SAMPLE = 'grade-3'
const CHECK = byId('bubblegrade')!
const SENTENCE = 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.'

/** The site's status word and the one action for the engine's tier (words from the BubbleGrade card and act.ts). */
function actFor(tier: number): { level: Level; alert: boolean; who: string; action: string } {
  if (tier >= 3) return { level: 'surgeon', alert: true, who: 'Flight surgeon', action: 'plan the return to a hyperbaric care site.' }
  if (tier === 2) return { level: 'medic', alert: true, who: 'Crew medic', action: 'end the spacewalk and return to the airlock.' }
  if (tier === 1) return { level: 'you', alert: true, who: 'You', action: 'cut lower-body work and re-grade every 15 minutes.' }
  return { level: 'you', alert: false, who: 'You', action: 'continue the spacewalk.' }
}

export function Bubble({ params, fonts, onStatus }: ViewProps) {
  const { desktop, u, vw } = useViewport()
  const phone = useMemo(() => isPhone(), [])
  const ref = useRef<BubbleGradeMomentHandle>(null)
  const stage = useRef<HTMLDivElement>(null)

  // ?state=idle | result and ?t=<ms> pin the moment; the first press lets go of the pin
  const query = params.toString()
  const [unpinned, setUnpinned] = useState(false)
  useEffect(() => setUnpinned(false), [query])
  const want = params.get('state')
  const tRaw = params.get('t')
  const pinState = !unpinned && (want === 'idle' || want === 'result') ? want : undefined
  const pinT = !unpinned && tRaw !== null && Number.isFinite(Number(tRaw)) ? Math.max(0, Number(tRaw)) : undefined
  const modeParam = params.get('mode')
  const mode = phone || modeParam === 'replay' ? 'replay' : modeParam === 'live' ? 'live' : 'auto'

  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<BubbleLive | null>(null)
  const [done, setDone] = useState<{ r: BubbleResult; act: BubbleActDecision } | null>(null)
  const [loading, setLoading] = useState(false)
  const [how, setHow] = useState(false)

  // on a laptop the model is fetched on entering the check (or after 8 s the view counts as ready anyway), so Play answers at once
  const waitWarm = useRef(mode !== 'replay' && pinState === undefined && pinT === undefined).current
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    if (!waitWarm) return
    let on = true
    const doneWarm = () => on && setWarm(true)
    const cap = window.setTimeout(doneWarm, 8000)
    bubble.load().then(doneWarm, doneWarm)
    return () => {
      on = false
      window.clearTimeout(cap)
    }
  }, [waitWarm])
  const pageReady = fonts && ready && (!waitWarm || warm)
  useEffect(() => onStatus({ ready: pageReady, state }), [pageReady, state, onStatus])

  const onState = useCallback((s: MomentState) => {
    setState(s)
    // the first state the stage reports means its picture (idle or a pinned frame) is on screen
    if (s !== 'error') setReady(true)
    if (s === 'idle') {
      setDone(null)
      setLive(null)
    }
  }, [])
  const onResult = useCallback((r: BubbleResult, act: BubbleActDecision) => setDone({ r, act }), [])
  const onLoading = useCallback((f: number | null) => setLoading(f !== null), [])

  const running = state === 'running'
  const press = () => {
    setUnpinned(true)
    if (running) ref.current?.reset()
    // the tap starts the sound too: hearing it is the moment
    else ref.current?.run({ sound: true })
  }

  const settled = state === 'result' && done !== null
  const grade = settled ? done.r.clip.grade : running ? (live?.grade ?? null) : null
  const technician = settled ? (stage.current?.querySelector<HTMLElement>('[data-technician]')?.dataset.technician ?? '') : ''
  const act = settled ? actFor(done.act.tier) : null
  const heroText = `Grade ${grade ?? '0'} of IV`
  const heroSize = desktop ? 88 * u : 50
  const heroTarget = desktop ? 560 * u : vw - 32
  const heroFit = useMemo(() => (fonts ? fitWord('Grade III of IV', 800, heroSize, heroTarget) : null), [fonts, heroSize, heroTarget])
  const label = running ? 'Stop' : state === 'result' ? 'Play it again' : 'Play the heart sound'
  const note = state === 'error' ? '' : running && loading ? 'Loading the model, once.' : running && !grade ? 'Listening to the first 5 seconds.' : ''

  return (
    <div className="drp-sheet drp-check drp-bg" data-shape="band" data-res={grade ? '1' : '0'}>
      <div className="drp-win">
        <div className="drp-stage" ref={stage}>
          <BubbleGradeMoment ref={ref} sampleId={SAMPLE} mode={mode} state={pinState} t={pinT} onState={onState} onLive={setLive} onLoading={onLoading} onResult={onResult} style={{ height: '100%' }} />
        </div>
        {!desktop && (
          <a className="drp-back" href={hrefOf('home')}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            All six
          </a>
        )}
      </div>

      <div className="drp-col">
        {desktop && (
          <a className="drp-back" href={hrefOf('home')}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            All six checks
          </a>
        )}
        <FitWord as="h1" className="drp-name" text={CHECK.name} weight={800} size={desktop ? 100 * u : 64} target={desktop ? 380 * u : Math.min(250, vw - 120)} ready={fonts} />
        <div className="drp-slot">
          <p className={`drp-sentence${grade ? ' drp-out' : ''}`}>{SENTENCE}</p>
          <p
            className={`drp-hero drp-fit${grade ? '' : ' drp-out'}`}
            data-qa="answer"
            aria-live={settled ? 'polite' : 'off'}
            style={{ fontWeight: 800, fontSize: heroFit ? heroFit.size : heroSize, fontVariationSettings: `"wdth" ${heroFit ? heroFit.wdth : 100}` }}
          >
            {heroText}
          </p>
          <p className={`drp-compare${grade ? '' : ' drp-out'}`} data-qa="compare">
            {settled ? (technician ? (technician === done.r.clip.grade ? `the human technician also heard ${technician}` : `the human technician heard ${technician}`) : 'the model’s grade for the whole clip') : 'so far, as the clip plays'}
            {settled && (
              <span className="drp-tag" data-qa="mode">
                {done.r.source === 'live' ? 'LIVE' : 'REPLAY'}
              </span>
            )}
          </p>
        </div>
        <div className="drp-bar">
          <button type="button" className="drp-btn" data-qa="primary" disabled={!ready && state !== 'error'} onClick={press}>
            {label}
          </button>
          <button type="button" className="drp-link drp-how-link" aria-expanded={how} onClick={() => setHow(true)}>
            How do we know?
          </button>
        </div>
        {state === 'error' && (
          <p className="drp-err" role="alert">
            The recording did not load. Check the connection, then press the button again.
          </p>
        )}
        {note && (
          <p className="drp-err" data-qa="stage" role="status">
            {note}
          </p>
        )}
        <p className={`drp-act${act ? '' : ' drp-hide'}`} data-qa="act">
          {act && <Mark level={act.level} colour={act.alert && act.level === 'you' ? 'var(--amber)' : undefined} />}
          <b>{act ? act.who : ''}:</b> {act ? act.action : ''}
        </p>
      </div>

      <HowLayer open={how} onClose={() => setHow(false)}>
        <BubbleHow done={done} />
      </HowLayer>
    </div>
  )
}

// ------------------------------------------------------------------ layer two
function BubbleHow({ done }: { done: { r: BubbleResult; act: BubbleActDecision } | null }) {
  const H = bubble.HONESTY
  const live = done && done.r.source === 'live' ? done.r.timing : null
  return (
    <>
      <section>
        <h3>A warning, not a diagnosis</h3>
        <p>{H.card}</p>
        <p className="drp-fine">Symptoms move the decision at once: joint pain, itching or a mild rash call the crew medic and end the spacewalk; numbness, weakness or breathing trouble call the flight surgeon.</p>
      </section>

      <section>
        <h3>This recording</h3>
        <p>15.7 seconds of real heart Doppler sound from a diver after a dive, never heard in training. It is a diver&rsquo;s recording, not an astronaut&rsquo;s.</p>
        <p>The tint on the sound picture shows {H.bubbleMap}.</p>
        <p className="drp-fine" data-qa="run-note">
          {live ? `This run happened in your browser just now: ${(live.ms / 1000).toFixed(2)} s on ${live.backend === 'webgpu' ? 'WebGPU' : 'WebAssembly'}.` : `What you see here is a stored result, ${H.precomputed}.`}
        </p>
      </section>

      <section>
        <h3>On 6,826 recordings from 310 divers</h3>
        <p>Always scored on divers it never heard. It flags 87% of high-bubble recordings (grade III-IV) at 70% specificity; alert AUROC 0.892 (0.868-0.914); grade agreement with the technicians: QWK 0.657.</p>
        <p className="drp-fine">Is it cheating? Rules that read only the recording length (0.72), the loudness (0.68) or every recording circumstance (0.80) do worse than the model&rsquo;s 0.89.</p>
      </section>

      <section>
        <h3>What it misses</h3>
        <p>Grade IV is mostly heard as III: on our grade IV example the technician heard IV and the model said III.</p>
        <p className="drp-fine">A test on 30 modern-probe recordings failed (28 of 30 flagged), so we make no claim for modern probes. A grade I clip can still alert: the alert is tuned to miss few high-bubble clips.</p>
      </section>

      <section>
        <h3>Who acts</h3>
        <ul className="drp-ladder">
          <li>
            <Mark level="you" colour="var(--green)" />
            <span>
              <b>You:</b> continue; on an alert, cut lower-body work and re-grade every 15 minutes.
            </span>
          </li>
          <li>
            <Mark level="medic" colour="var(--green)" />
            <span>
              <b>Crew medic:</b> end the spacewalk and return to the airlock.
            </span>
          </li>
          <li>
            <Mark level="surgeon" colour="var(--green)" />
            <span>
              <b>Flight surgeon:</b> decided from symptoms, never from sound alone.
            </span>
          </li>
        </ul>
        <p className="drp-fine">The grade-to-action mapping is our product rule. On this clip the model’s alert is on, so the crew member acts.</p>
      </section>

      <section>
        <h3>What this is not</h3>
        <p>{H.context}</p>
        <p className="drp-fine">{H.footer}</p>
      </section>

      <section>
        <h3>Inside</h3>
        <p className="drp-fine">One 29 MB model runs in your browser over the clip in 5-second slices. Data: Blogg et al. 2026 (the clips are GPL-3.0-or-later). Runtime: onnxruntime-web (MIT).</p>
      </section>
    </>
  )
}

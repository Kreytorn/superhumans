// Prototype A "Viewbox": the BubbleGrade check. The moment (src/moments/bubblegrade) is the film, restyled only
// through its --m-* custom properties (bg.css). This file writes the words around it: the film's edge print, the
// answer column and what sits behind "How do we know?". Sound starts only from the press on the main button.
// The film is the moment's bare stage (the sound picture and the model's marks only), so the page writes the words;
// ?gauge=1 hangs the moment's full stage instead (its own gauge, labels, playhead to drag and speaker button).
//   ?state=idle | result   ?t=<ms> pins the moment's clock   ?replay=1 forces stored outputs
import './bg.css'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as bg from '../../engine/bubblegrade'
import BubbleGradeMoment, { type BubbleGradeMomentHandle, type BubbleLive, type MomentState } from '../../moments/bubblegrade'
import { setParam } from '../../lib/route'
import { STATUS_WORD, type StatusKind } from './content'
import { Mark, Tag } from './parts'
import type { TrackView } from './track'

/** First-layer strings (work/Web/cards/bubblegrade.md). */
export const BUBBLE = {
  sample: 'grade-3',
  sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
  action: 'Play the heart sound',
  running: 'Listening',
  again: 'Play again',
  specimen: 'a diver’s heart',
}

/** Who acts and the one action, per tier of the engine's decision (0 continue, 1 alert, 2 end the spacewalk, 3 flight surgeon). */
const TIER: { who: StatusKind; text: string }[] = [
  { who: 'you', text: 'Continue the spacewalk.' },
  { who: 'you', text: 'Cut lower-body work and re-grade every 15 minutes.' },
  { who: 'medic', text: 'End the spacewalk and return to the airlock.' },
  { who: 'surgeon', text: 'Return for hyperbaric care.' },
]

interface Settled {
  r: bg.BubbleResult
  act: bg.BubbleActDecision
}

export function useBubble({ active, params, phone, coarse }: { active: boolean; params: URLSearchParams; phone: boolean; coarse: boolean }): TrackView {
  const ref = useRef<BubbleGradeMomentHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<BubbleLive | null>(null)
  const [loading, setLoading] = useState<number | null>(null)
  const [res, setRes] = useState<Settled | null>(null)
  const [technician, setTechnician] = useState<string | null>(null)
  const [clipS, setClipS] = useState('0.0')
  const [sound, setSound] = useState(false)
  const [durS, setDurS] = useState<number | null>(null)

  const stateParam = params.get('state')
  const pinState = stateParam === 'idle' || stateParam === 'result' ? stateParam : undefined
  const tRaw = params.get('t')
  const pinT = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : undefined
  const pinned = pinState !== undefined || pinT !== undefined
  // a phone shows the stored outputs (the moment's replay mode); a laptop runs the model live
  const mode: 'auto' | 'replay' = phone || coarse || params.get('replay') === '1' ? 'replay' : 'auto'

  useEffect(() => {
    if (active) return
    setPhase('idle')
    setReady(false)
    setLive(null)
    setLoading(null)
    setRes(null)
  }, [active])

  // the moment marks its root data-ready once the stored sound picture is drawn, and names the technician's grade there
  useEffect(() => {
    if (!active) return
    const el = stageRef.current?.querySelector<HTMLElement>('.bgm')
    if (!el) return
    const read = () => {
      setReady(el.dataset.ready === '1')
      setTechnician(el.dataset.technician || null)
      setClipS(el.dataset.clipS ?? '0.0')
      setSound(el.dataset.sound === '1')
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-ready', 'data-technician', 'data-clip-s', 'data-sound'] })
    return () => mo.disconnect()
  }, [active])

  // the clip's length, from the stored outputs
  useEffect(() => {
    if (!active) return
    let off = false
    bg.replay(BUBBLE.sample)
      .then((r) => !off && setDurS(r.durS))
      .catch(() => undefined)
    return () => {
      off = true
    }
  }, [active])

  const onState = useCallback((s: MomentState) => {
    setPhase(s)
    if (s === 'running') {
      setRes(null)
      setLive(null)
    }
  }, [])
  const onResult = useCallback((r: bg.BubbleResult, act: bg.BubbleActDecision) => setRes({ r, act }), [])

  // the one press: the clip is heard from here on (sound never starts before it), and the model reads the whole clip
  const press = () => {
    if (pinned) {
      setParam('state', undefined)
      setParam('t', undefined)
      setPhase('idle')
      setRes(null)
      setLive(null)
      setTimeout(() => ref.current?.run({ sound: true }), 300)
      return
    }
    if (phase === 'running') return
    ref.current?.run({ sound: true })
  }

  if (!active) return { film: null, answer: null, foot: null, below: null, how: null, phase: 'idle', ready: false, source: undefined }

  const settled = phase === 'result' && !!res
  const grade = res ? res.r.clip.grade : phase === 'running' ? (live?.grade ?? null) : null
  const liveRun = res ? res.r.source === 'live' : mode === 'auto' && !pinned
  const tier = res ? TIER[Math.min(res.act.tier, 3)] : null
  const same = !!res && technician === res.r.clip.grade

  const full = params.get('gauge') === '1'
  const dur = durS !== null ? `${durS.toFixed(1)} s` : ''
  let edge: ReactNode = (
    <>
      {BUBBLE.specimen}
      {dur ? <span className="vb-tt-wide">, {dur}</span> : null}
    </>
  )
  if (phase === 'error') edge = 'The heart sound did not load. Press the button again.'
  else if (phase === 'running') edge = loading !== null ? `loading the model, ${Math.round(loading * 100)}%` : `${clipS} s${dur ? ` of ${dur}` : ''}`

  const film = (
    <>
      <div className="vb-bg-stage" ref={stageRef}>
        <BubbleGradeMoment ref={ref} sampleId={BUBBLE.sample} mode={mode} state={pinState} t={pinT} bare={!full} onState={onState} onResult={onResult} onLive={setLive} onLoading={setLoading} className="vb-bg-fill" />
      </div>
      <p className="vb-edge vb-tt-edge">
        <Tag film>{liveRun ? 'LIVE' : 'REPLAY'}</Tag>{' '}
        <span className="vb-tt-edge-text">
          {full || phase === 'error' ? null : (
            <>
              <span className="vb-tt-key">
                <i className="vb-bg-swatch" aria-hidden="true" />
                model attention
              </span>{' '}
            </>
          )}
          <span className="vb-tt-key" aria-live="off">
            {edge}
          </span>
        </span>
        {!full && phase !== 'idle' && phase !== 'error' ? (
          <button type="button" className="vb-tt-down vb-bg-mute" aria-pressed={sound} aria-label={sound ? 'Sound is on: turn it off' : 'Sound is off: turn it on'} onClick={() => ref.current?.setSound(!sound)}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M2.5 6.75h3L9.5 3.5v11L5.5 11.25h-3z" fill="currentColor" />
              {sound ? <path d="M12 6.2a4 4 0 0 1 0 5.6M14 4a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.5" /> : <path d="M12 6.5l4 5M16 6.5l-4 5" fill="none" stroke="currentColor" strokeWidth="1.5" />}
            </svg>
          </button>
        ) : null}
      </p>
    </>
  )

  const button = (
    <button type="button" className="vb-btn" data-qa="primary" data-quiet={phase === 'result' ? 1 : undefined} aria-disabled={phase === 'running' && !pinned} onClick={press}>
      {phase === 'result' ? BUBBLE.again : phase === 'running' ? BUBBLE.running : BUBBLE.action}
    </button>
  )
  const buttonInFoot = phone && phase === 'result'
  const answer = (
    <>
      <h1 className="vb-sentence vb-tt-sentence">{BUBBLE.sentence}</h1>
      {buttonInFoot ? null : button}
      <div className="vb-result vb-tt-result" aria-live="polite">
        {grade ? (
          <p className="vb-number">
            <span className="vb-hero-unit">Grade</span> <span className="vb-hero">{grade}</span> <span className="vb-hero-unit">{settled ? 'of IV' : 'so far'}</span>{' '}
            <br />
            <span className="vb-compare" data-on={settled && technician ? 1 : 0}>
              {same ? `The human technician also heard ${technician}.` : `The human technician heard ${technician ?? ''}.`}
            </span>
          </p>
        ) : null}
        {settled && tier ? (
          <p className="vb-act" data-on="1">
            <Mark kind={tier.who} /> <span className="vb-status">{STATUS_WORD[tier.who]}</span>{' '}
            <br />
            <span className="vb-act-text">{tier.text}</span>
          </p>
        ) : null}
      </div>
    </>
  )

  return { film, answer, foot: buttonInFoot ? button : null, below: null, how: <HowBubble res={res} technician={technician} />, phase, ready, source: phase === 'idle' ? undefined : liveRun ? 'live' : 'replay' }
}

/** Behind "How do we know?": the evidence and the honesty strings, word for word from the engine. */
function HowBubble({ res, technician }: { res: Settled | null; technician: string | null }) {
  const live = res?.r.source === 'live'
  return (
    <div className="vb-how-list">
      <section>
        <h3>A warning, not a diagnosis</h3>
        <p>{bg.HONESTY.card}</p>
        <p>Symptoms outrank the grade at once: joint pain, itching or a mild rash call the crew medic and end the spacewalk; numbness, weakness or breathing trouble call the flight surgeon.</p>
      </section>

      <section>
        <h3>This recording</h3>
        <p>15.7 seconds of real heart Doppler sound from a diver after a dive, never heard in training. It is a diver’s recording, not an astronaut’s.</p>
        {res ? (
          <p>
            The model heard grade {res.r.clip.grade}
            {technician ? `; the human technician heard ${technician}` : ''}.
          </p>
        ) : null}
        <p>{live ? 'This run: the model ran in this browser.' : `Shown from stored outputs: ${bg.HONESTY.precomputed}.`}</p>
      </section>

      <section>
        <h3>The tint on the sound picture</h3>
        <p>It shows {bg.HONESTY.bubbleMap}. Nothing is counted, located or sized.</p>
      </section>

      <section>
        <h3>Tested on divers it never heard</h3>
        <p>6,826 recordings from 310 divers, always scored on divers it never heard. It flags 87% of high-bubble (grade III-IV) recordings at 70% specificity; alert AUROC 0.892 (0.868-0.914); grade agreement QWK 0.657.</p>
        <p>Is it cheating? Rules that read only the recording length (0.72), the loudness (0.68) or all the recording circumstances (0.80) sit next to the model’s 0.89.</p>
      </section>

      <section>
        <h3>What it misses</h3>
        <p>Grade IV is mostly heard as III: on our grade IV clip the technician heard IV and the model III. A test on 30 modern-probe recordings failed (28 of 30 flagged), so we make no modern-probe claim.</p>
        <p>A grade I clip can still alert: the alert is tuned to miss few high-bubble clips.</p>
      </section>

      {res ? (
        <section>
          <h3>Why this action</h3>
          <p>{res.act.headline}</p>
          <ul>
            {res.act.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="vb-quiet">Trigger: {res.act.trigger}. The grade-to-action mapping is our product rule.</p>
          <p className="vb-quiet">Sources: {res.act.sources.map((s) => s.label).join('; ')}.</p>
        </section>
      ) : null}

      <section>
        <h3>What this is not</h3>
        <p>{bg.HONESTY.context}</p>
        <p>{bg.HONESTY.footer}</p>
        <p className="vb-quiet">Data: Blogg et al. 2026 (the clips are GPL-3.0-or-later). Model by team SuperHumans with an AI assistant (Claude); onnxruntime-web (MIT).</p>
      </section>
    </div>
  )
}

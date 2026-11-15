// The heart-bubble check (BubbleGrade). The BubbleGrade moment is the stage, printed on the same cut paper: the
// heart sound in ink, the model's attention in blue pencil. This file adds the paper around it: the sentence,
// the one press (sound starts only with that tap), the grade on its leader, and who acts.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Person } from '@phosphor-icons/react/dist/csr/Person'
import * as bubble from '../../engine/bubblegrade'
import type { BubbleActDecision, BubbleResult } from '../../engine/bubblegrade'
import BubbleGradeMoment, { type BubbleGradeMomentHandle, type BubbleLive, type MomentState } from '../../moments/bubblegrade'
import { setParam } from '../../lib/route'
import { route, type Status } from './data'
import { Layer, Mark, Tag } from './parts'
import type { ViewProps } from './Spike'
import './track.css'
import './bubble.css'

const SAMPLE = 'grade-3'
const QUESTION = 'Bubbles, or no bubbles? Press play and listen along with the model.'

/** Who acts and one action, as a sentence, per tier of the engine's decision. */
const ACT: { status: Status; who: string; line: string }[] = [
  { status: 'you', who: 'You', line: 'continue the spacewalk.' },
  { status: 'you', who: 'You', line: 'cut lower-body work and re-grade every 15 minutes.' },
  { status: 'medic', who: 'Crew medic', line: 'end the spacewalk and return to the airlock.' },
  { status: 'surgeon', who: 'Flight surgeon', line: 'decides on treatment and an early return.' },
]

/** The stage in this direction's colours, set only through the moment's documented tokens. */
const SKIN = {
  '--m-stage': '#faf8f4',
  '--m-ink': '#1d1b19',
  '--m-ink-2': '#655f58',
  '--m-mark': '#2148f0',
  '--m-mark-hot': '#12279a',
  '--m-accent': '#1d1b19',
  '--m-font': "'Instrument Sans Variable', sans-serif",
  '--m-font-mono': "'Instrument Sans Variable', sans-serif",
} as CSSProperties

const isPhone = () => matchMedia('(pointer: coarse)').matches || window.innerWidth < 820

export function Bubble({ params, report }: ViewProps) {
  const pState = params.get('state')
  const pT = params.get('t')
  const layer = params.get('layer') === 'how'
  // The URL pins the stage (?state=, ?t=) until the press.
  const [pinned, setPinned] = useState(true)
  useEffect(() => setPinned(true), [pState, pT])
  const pinState = pinned && (pState === 'idle' || pState === 'result') ? pState : undefined
  const pinT = pinned && pT !== null && Number.isFinite(Number(pT)) ? Number(pT) : undefined
  // A phone replays the stored outputs of the same model; a laptop runs the model live.
  const [mode] = useState<'auto' | 'replay'>(() => (isPhone() || params.get('replay') === '1' ? 'replay' : 'auto'))

  const moment = useRef<BubbleGradeMomentHandle>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<BubbleLive | null>(null)
  const [done, setDone] = useState<{ r: BubbleResult; act: BubbleActDecision } | null>(null)
  const [loading, setLoading] = useState(false)
  const [fontsOk, setFontsOk] = useState(false)

  useEffect(() => {
    let on = true
    Promise.all([document.fonts.load('600 40px "Bricolage Grotesque Variable"'), document.fonts.load('500 16px "Instrument Sans Variable"')])
      .catch(() => null)
      .then(() => on && setFontsOk(true))
    return () => {
      on = false
    }
  }, [])

  const isReady = ready && fontsOk
  useEffect(() => report(isReady, phase), [isReady, phase, report])

  const running = phase === 'running'
  const press = () => {
    setPinned(false)
    if (running && !pinned) return moment.current?.reset()
    // the tap starts the sound too: hearing it is the moment (the speaker button on the stage mutes it)
    moment.current?.run({ sound: true })
  }

  const grade = phase === 'result' && done ? done.r.clip.grade : running ? (live?.grade ?? null) : null
  const technician = stage.current?.querySelector('[data-technician]')?.getAttribute('data-technician') ?? ''
  const tag = done && phase === 'result' ? (done.r.source === 'live' ? 'LIVE' : 'REPLAY') : ''
  const act = phase === 'result' && done ? done.act : null
  const actRow = act ? ACT[Math.min(3, Math.max(0, act.tier))] : null
  const label = running ? (loading ? 'Loading the model' : 'Stop') : phase === 'result' ? 'Play again' : phase === 'error' ? 'Try again' : 'Play the heart sound'

  const actLine = actRow && (
    <p className="pb-act">
      <Mark status={actRow.status} size={15} />
      <span>
        <b>{actRow.who}:</b> {actRow.line} <em>{bubble.HONESTY.card}</em>
      </span>
    </p>
  )

  return (
    <>
      <div className="pb-stage pbt-stage pbb-stage" ref={stage} style={SKIN}>
        <BubbleGradeMoment
          ref={moment}
          sampleId={SAMPLE}
          mode={mode}
          state={pinState}
          t={pinT}
          onState={(s) => {
            setPhase(s)
            // the first state the stage reports means its picture is on screen
            setReady(true)
            if (s === 'idle') {
              setDone(null)
              setLive(null)
            }
          }}
          onLive={setLive}
          onLoading={(f) => setLoading(f !== null)}
          onResult={(r, a) => setDone({ r, act: a })}
          className="pbt-moment"
        />
        {/* a paper tab along the plate's lower edge: who acts (laptop; on a phone it follows the grade) */}
        <div className="pbt-band pb-wide">{actLine}</div>
      </div>

      <section className="pb-paper pb-check pb-track" data-phase={phase}>
        <a className="pb-back" href={route('home')}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          <Person size={20} weight="fill" aria-hidden="true" />
          <span>Body</span>
        </a>
        <h1 className="pb-say pbb-say">After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.</h1>

        <p className="pb-bet pbt-q" data-show={phase === 'idle' ? '1' : '0'} aria-hidden={phase !== 'idle'}>
          {QUESTION}
        </p>

        <button type="button" className={`pb-btn${phase === 'result' || running ? ' is-quiet' : ''}`} data-qa="primary" onClick={press} aria-busy={running && loading}>
          {label}
        </button>

        {phase === 'error' && <p className="pb-error">The recording could not be played. Check the connection, then try again.</p>}

        <div className="pbt-answer" data-show={grade ? '1' : '0'} role="status">
          {grade && (
            <>
              <div className="pb-hero-row">
                <p className="pb-hero-num">
                  <span className="pbb-word">Grade</span> {grade}{' '}
                  <span>
                    of IV
                    {tag && <Tag>{tag}</Tag>}
                  </span>
                </p>
                <span className="pb-leader" aria-hidden="true" />
              </div>
              <p className="pbt-cmp">
                {phase === 'result' ? (
                  technician && <span>{technician === grade ? `the human technician also heard ${technician}` : `the human technician heard ${technician}`}</span>
                ) : (
                  <span>so far, still listening</span>
                )}
              </p>
            </>
          )}
        </div>
        <div className="pbt-below pb-narrow">{actLine}</div>

        <div className="pbt-foot">
          <button type="button" className="pb-how-btn" aria-haspopup="dialog" aria-expanded={layer} onClick={() => setParam('layer', 'how')}>
            How do we know?
          </button>
        </div>
      </section>

      <Layer open={layer} onClose={() => setParam('layer', undefined)}>
        <BubbleHow done={done} />
      </Layer>
    </>
  )
}

// ------------------------------------------------------------------ "How do we know?"
function BubbleHow({ done }: { done: { r: BubbleResult; act: BubbleActDecision } | null }) {
  return (
    <div className="pb-how-body">
      <section>
        <h3>A warning, not a diagnosis</h3>
        <p>{bubble.HONESTY.card}</p>
        <p>Symptoms move the decision at once: joint pain, itching or a mild rash call the crew medic and end the spacewalk; numbness, weakness or breathing trouble call the flight surgeon.</p>
      </section>
      <section>
        <h3>The sound and the blue tint</h3>
        <p>15.7 seconds of real heart Doppler sound from a diver after a dive, never heard in training. It is a diver’s recording, not an astronaut’s.</p>
        <p>The picture is the exact sound picture the model looked at. The blue tint shows {bubble.HONESTY.bubbleMap}. Nothing is counted, located or sized.</p>
        {done && done.r.source !== 'live' && <p>This run is {bubble.HONESTY.precomputed}.</p>}
      </section>
      <section>
        <h3>How well it works</h3>
        <p>6,826 recordings from 310 divers, always scored on divers it never heard: it flags 87% of high-bubble (grade III-IV) recordings at 70% specificity; alert AUROC 0.892 (0.868-0.914); grade agreement QWK 0.657.</p>
        <p>Is it cheating? Rules that read only recording length (0.72), loudness (0.68) or all recording circumstances (0.80) sit next to the model’s 0.89.</p>
      </section>
      <section>
        <h3>What it misses</h3>
        <p>Grade IV is mostly heard as III: on our grade IV example the technician heard IV and the model III. A test on 30 modern-probe recordings failed (28 of 30 flagged), so we make no modern-probe claim.</p>
        <p>A grade I clip can still alert: the alert is tuned to miss few high-bubble clips.</p>
      </section>
      <section>
        <h3>Who acts</h3>
        {done && <p>Why this step: {done.act.trigger}</p>}
        <ul className="pb-ladder">
          {ACT.map((a, i) => (
            <li key={i} className={i === 3 ? 'is-grey' : undefined}>
              <Mark status={a.status} />
              <span>
                <b>{a.who}.</b> {i === 0 ? 'Grade 0 or I, no alert: ' : i === 1 ? 'Grade II or III, or the alert: ' : i === 2 ? 'Grade IV likely, or a mild symptom: ' : 'A serious symptom only, never the model alone: '}
                {a.line}
              </span>
            </li>
          ))}
        </ul>
        <p>The grade-to-action mapping is our own product rule.</p>
        {done && done.act.sources.length > 0 && <p className="pb-src">Sources: {done.act.sources.map((s) => s.label).join('; ')}.</p>}
      </section>
      <section>
        <h3>Where it stands</h3>
        <p>{bubble.HONESTY.context}</p>
        <p>{bubble.HONESTY.footer}</p>
      </section>
      <section>
        <h3>Data and credits</h3>
        <p className="pb-src">Recordings: Blogg et al. 2026 (the clips are GPL-3.0-or-later). Model by team SuperHumans with an AI assistant (Claude). No NASA logos or insignia are used.</p>
      </section>
    </div>
  )
}

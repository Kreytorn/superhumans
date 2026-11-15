// Prototype A "Viewbox": the TrackTrace check. The moment (src/moments/tracktrace) is the film, restyled only through
// its --m-* custom properties (tt.css). This file writes the words around it: the film's edge print, the answer
// column, the IonScan print one scroll step below, and what sits behind "How do we know?".
//   ?state=idle | result   ?t=<ms> pins the moment's timeline   ?replay=1 forces stored outputs
import './tt.css'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as tt from '../../engine/tracktrace'
import TrackTraceMoment, { BEATS, type MomentBeat, type MomentState, type TrackTraceMomentHandle } from '../../moments/tracktrace'
import { setParam } from '../../lib/route'
import { STATUS_WORD, type StatusKind } from './content'
import { Mark, Tag } from './parts'

const BASE = import.meta.env.BASE_URL
const FIGURE = `${BASE}tracktrace/ionscan_architecture.svg`

/** First-layer strings (work/Web/cards/tracktrace.md). */
export const TRACK = {
  sample: 'nucleus-238',
  sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
  action: 'Scan this nucleus',
  running: 'IonScan is reading',
  again: 'Scan again',
  caption: 'how IonScan reads every nucleus',
  figure: 'IonScan, our own 3.19 M-parameter network. It reads every nucleus as a 32 × 32 grid, along four directions, each both ways: like a particle detector integrating hits along a path.',
}

/** Who acts and the one action, per tier of the engine's whole-sample decision. */
const TIER: Record<tt.TierName, { who: StatusKind; text: string }> = {
  ORANGE: { who: 'surgeon', text: 'Postpone the spacewalk and review this sample with the ground radiation team.' },
  YELLOW: { who: 'medic', text: 'Cross-check the onboard dosimeters and move to the most-shielded area.' },
  GREEN: { who: 'you', text: 'Log this sample to your dose record; nothing else.' },
}

const ORDER = BEATS.map((b) => b.name)
const spots = (n: number) => `${n} damage ${n === 1 ? 'spot' : 'spots'}`

interface Settled {
  r: tt.NucleusResult
  act: tt.TrackTraceAct | null
  well: tt.WellResult | null
}

export interface TrackView {
  /** inside the open film: the stage and its edge print */
  film: ReactNode
  /** the answer column, between the wordmark and the foot */
  answer: ReactNode
  /** an extra control for the foot (phone, after the result) */
  foot: ReactNode
  /** the IonScan print, one scroll step below the first viewport */
  below: ReactNode
  how: ReactNode
  phase: MomentState
  ready: boolean
  source: 'live' | 'replay' | undefined
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
  </svg>
)

export function useTrack({ active, params, phone, coarse, reduced }: { active: boolean; params: URLSearchParams; phone: boolean; coarse: boolean; reduced: boolean }): TrackView {
  const ref = useRef<TrackTraceMomentHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const belowRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [res, setRes] = useState<Settled | null>(null)
  const [nasa, setNasa] = useState<number | null>(null)
  const [src, setSrc] = useState({ run: '', picked: '' })
  const [zoom, setZoom] = useState(false)

  const stateParam = params.get('state')
  const pinState = stateParam === 'idle' || stateParam === 'result' ? stateParam : undefined
  const tRaw = params.get('t')
  const pinT = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : undefined
  const pinned = pinState !== undefined || pinT !== undefined
  // a phone shows the stored outputs (the moment's replay mode); a laptop runs IonScan live
  const mode: 'auto' | 'replay' = phone || coarse || params.get('replay') === '1' ? 'replay' : 'auto'

  useEffect(() => {
    if (active) return
    setPhase('idle')
    setReady(false)
    setBeat(null)
    setRes(null)
    setSrc({ run: '', picked: '' })
  }, [active])

  // NASA's own count for this nucleus (stored with the gallery), so the comparison can land with the last circle
  useEffect(() => {
    if (!active) return
    let off = false
    tt.replay(TRACK.sample)
      .then((r) => !off && setNasa(r.nfoci2016))
      .catch(() => undefined)
    return () => {
      off = true
    }
  }, [active])

  // the moment says on its root whether what it shows was computed now or stored; the edge print's tag follows it
  useEffect(() => {
    if (!active) return
    const el = stageRef.current?.querySelector<HTMLElement>('.ttm')
    if (!el) return
    const read = () => {
      const run = el.dataset.source ?? ''
      const picked = el.dataset.pickedSource ?? ''
      setSrc((s) => (s.run === run && s.picked === picked ? s : { run, picked }))
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-source', 'data-picked-source'] })
    return () => mo.disconnect()
  }, [active])

  const onState = useCallback((s: MomentState) => {
    setPhase(s)
    if (s === 'running') setRes(null)
  }, [])
  const onResult = useCallback((r: tt.NucleusResult, act: tt.TrackTraceAct | null, well: tt.WellResult | null) => setRes({ r, act, well }), [])

  const press = () => {
    if (pinned) {
      // a pinned page: let go of the pin, then run once the moment is idle again
      setParam('state', undefined)
      setParam('t', undefined)
      setPhase('idle')
      setRes(null)
      setBeat(null)
      setTimeout(() => void ref.current?.run(), 300)
      return
    }
    if (phase === 'running') return
    void ref.current?.run()
  }
  const toFigure = () => belowRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })

  const empty: TrackView = { film: null, answer: null, foot: null, below: null, how: null, phase: 'idle', ready: false, source: undefined }
  if (!active) return empty

  // ---- what is on screen now
  const beatName = beat?.beat ?? 'specimen'
  const reached = (b: (typeof ORDER)[number]) => ORDER.indexOf(beatName) >= ORDER.indexOf(b)
  const settled = phase === 'result' && !!res
  const count = res ? res.r.count : (beat?.count ?? 0)
  const showNumber = settled || (phase === 'running' && count > 0)
  const nasaCount = res?.r.nfoci2016 ?? nasa
  const showCompare = nasaCount !== null && (settled || (phase === 'running' && reached('line')))
  const lineOn = res ? res.r.line.drawn : !!beat?.line
  const well = res?.well ?? null
  const picked = settled && well && beat?.picked != null ? beat.picked : null
  const liveRun = res ? res.r.source === 'live' : src.run ? src.run === 'live' : mode === 'auto' && !pinned
  const tagWord = picked !== null ? (src.picked === 'live' ? 'LIVE' : 'REPLAY') : liveRun ? 'LIVE' : 'REPLAY'
  const tier = res?.act?.tierRef ? TIER[res.act.tierRef] : null

  const lineKey = (
    <span className="vb-tt-key">
      <i className="vb-tt-line" aria-hidden="true" />
      {tt.HONESTY.lineLabel}
    </span>
  )
  let edge: ReactNode = null
  let edgeTag: ReactNode = null
  if (phase === 'error') edge = 'This nucleus did not load. Press the button again.'
  else if (picked !== null && well) edge = `nucleus ${picked + 1} of ${well.nNuclei}: ${spots(well.nuclei[picked].count)}`
  else if (settled) {
    edge = (
      <>
        {lineOn ? lineKey : <span className="vb-tt-key">no straight line</span>}{' '}
        {well ? (
          <>
            <span className="vb-tt-key vb-tt-wide">
              <i className="vb-tt-ring" aria-hidden="true" />
              ten weighed most{' '}
            </span>
            <span className="vb-tt-key">{well.nNuclei} nuclei</span>{' '}
          </>
        ) : null}
      </>
    )
    edgeTag = well ? <Tag film>{tt.HONESTY.precomputed}</Tag> : null
  } else if (phase === 'running') {
    if (beatName === 'sample' || beatName === 'verdict') {
      edge = <span className="vb-tt-key">reading the whole sample: {beat?.read ?? 0} nuclei </span>
      edgeTag = <Tag film>{tt.HONESTY.precomputed}</Tag>
    } else if (reached('foci') && count > 0)
      edge = (
        <>
          <span className="vb-tt-key">{spots(count)}</span> {lineOn ? lineKey : null}
        </>
      )
    else
      edge = (
        <>
          <span className="vb-tt-key">{TRACK.caption}</span>{' '}
          <span className="vb-tt-key vb-tt-dim">
            {beat && beat.scan >= 0 ? (
              <>
                <span className="vb-tt-wide">scan </span>
                {beat.scan + 1} of 8
              </>
            ) : (
              '32 × 32 grid'
            )}
          </span>
        </>
      )
  }

  const film = (
    <>
      <div className="vb-tt-stage" ref={stageRef}>
        <div className="vb-tt-fill">
          <TrackTraceMoment
            ref={ref}
            sampleId={TRACK.sample}
            mode={mode}
            state={pinState}
            t={pinT}
            annotate={false}
            promise=""
            onState={onState}
            onReady={setReady}
            onBeat={setBeat}
            onResult={onResult}
          />
        </div>
      </div>
      <p className="vb-edge vb-tt-edge" aria-live="polite">
        <Tag film>{tagWord}</Tag>{' '}
        {phase === 'idle' ? (
          <button type="button" className="vb-tt-down" data-cap="1" onClick={toFigure}>
            {TRACK.caption} <Arrow />
          </button>
        ) : (
          <>
            <span className="vb-tt-edge-text">
              {edge}
              {edgeTag}
            </span>
            <button type="button" className="vb-tt-down" aria-label="IonScan, our own model: its architecture is one step below" onClick={toFigure}>
              <Arrow />
            </button>
          </>
        )}
      </p>
    </>
  )

  const button = (
    <button type="button" className="vb-btn" data-qa="primary" data-quiet={phase === 'result' ? 1 : undefined} aria-disabled={phase === 'running' && !pinned} onClick={press}>
      {phase === 'result' ? TRACK.again : phase === 'running' ? TRACK.running : TRACK.action}
    </button>
  )
  const buttonInFoot = phone && phase === 'result'
  const answer = (
    <>
      <h1 className="vb-sentence vb-tt-sentence">{TRACK.sentence}</h1>
      {buttonInFoot ? null : button}
      <div className="vb-result vb-tt-result" aria-live="polite">
        {showNumber ? (
          <p className="vb-number">
            <span className="vb-hero">{count}</span> <span className="vb-hero-unit">damage {count === 1 ? 'spot' : 'spots'}</span>{' '}
            <br />
            <span className="vb-compare" data-on={showCompare ? 1 : 0}>
              NASA’s own count: {nasaCount ?? ''}
            </span>
          </p>
        ) : null}
        {settled && res.act ? (
          <p className="vb-act" data-on="1">
            <Mark kind={tier ? tier.who : 'nodata'} /> <span className="vb-status">{tier ? STATUS_WORD[tier.who] : 'No call'}</span>{' '}
            <br />
            <span className="vb-act-text">{tier ? tier.text : res.act.headline}</span>
          </p>
        ) : null}
      </div>
    </>
  )

  const below = (
    <section className="vb-tt-below" ref={belowRef} data-zoom={zoom ? 1 : undefined} aria-label="IonScan, the model behind this check">
      <button type="button" className="vb-tt-sheet" aria-pressed={zoom} aria-label={zoom ? 'The IonScan architecture diagram: back to its first size' : 'The IonScan architecture diagram: enlarge it'} onClick={() => setZoom((z) => !z)}>
        <img src={FIGURE} width="501" height="484" alt="Diagram of IonScan: a stack of convolutions, IonScan blocks that scan the token grid in four directions, attention, and a decoder that returns the map of damage spots." />
      </button>
      <p className="vb-tt-figcap">{TRACK.figure}</p>
    </section>
  )

  return {
    film,
    answer,
    foot: buttonInFoot ? button : null,
    below,
    how: <HowTrack res={res} nasa={nasa} />,
    phase,
    ready,
    source: phase === 'idle' ? undefined : liveRun ? 'live' : 'replay',
  }
}

/** Behind "How do we know?": the evidence and the honesty strings, word for word from the engine. */
function HowTrack({ res, nasa }: { res: Settled | null; nasa: number | null }) {
  const [stored, setStored] = useState<{ r: tt.NucleusResult; act: tt.TrackTraceAct | null; n: number } | null>(null)
  useEffect(() => {
    let off = false
    Promise.all([tt.replay(TRACK.sample), tt.replayWell('P242_G4')])
      .then(([r, well]) => !off && setStored({ r, act: tt.act(well), n: well.nNuclei }))
      .catch(() => undefined)
    return () => {
      off = true
    }
  }, [])
  const r = res?.r ?? stored?.r ?? null
  const act = res?.act ?? stored?.act ?? null
  const n = res?.well?.nNuclei ?? stored?.n ?? null
  const nasaCount = r?.nfoci2016 ?? nasa
  const live = res?.r.source === 'live'
  const tier = act?.tierRef ? TIER[act.tierRef] : null
  return (
    <div className="vb-how-list">
      <section>
        <h3>This nucleus</h3>
        <p>{tt.HONESTY.heroCaption}</p>
        {r ? (
          <p>
            IonScan circled {r.count} damage spots here{nasaCount !== null ? `; NASA’s own count is ${nasaCount}` : ''}. {tt.HONESTY.fociLabels}
          </p>
        ) : null}
        <p>{live && res ? `This run: IonScan ran in this browser in ${Math.round(res.r.timing.ms)} ms.` : `Shown from stored outputs: ${tt.HONESTY.precomputed}.`}</p>
      </section>

      <section>
        <h3>Tested on 16,801 nuclei it never saw</h3>
        <p>They come from 3 mice the model never saw (34 samples). Its spot counts follow NASA’s: rank correlation 0.954; spot-finding F1 0.920.</p>
        <p>Per nucleus its guess of the particle is weak: macro-F1 0.674, next to a MobileNetV4 baseline at 0.678.</p>
      </section>

      <section>
        <h3>The line</h3>
        <p>{tt.HONESTY.trackLine}</p>
        <p>
          The rule: at least {tt.LINE_RULE.minInliers} circles in line and a score of {tt.LINE_RULE.minScore} or more.{r ? ` This nucleus scores ${r.line.score.toFixed(3)}.` : ''} An X-ray nucleus with 8 scattered spots scores 0.375 and gets no line; another iron-ion nucleus scores 0.597 and, honestly, gets no line either.
        </p>
        <p>The eight scans show the order IonScan reads in. They never show a direction it found.</p>
      </section>

      <section>
        <h3>The whole sample{n ? `: ${n} nuclei` : ''}</h3>
        <p>
          One nucleus never decides. A second, small model reads every nucleus of the sample and makes one call; the ten white rings mark the nuclei that weighed most. Here that scan is {tt.HONESTY.precomputedWell}.
        </p>
        <p>On the 34 test samples the whole-sample call names the right particle 97% of the time, the dose band 88% and the time since exposure 95%.</p>
        <p>{tt.HONESTY.batch}</p>
        <p className="vb-quiet">
          {tt.HONESTY.wellsStandIn} {tt.HONESTY.doseBands}
        </p>
      </section>

      {act ? (
        <section>
          <h3>Why the {tier ? STATUS_WORD[tier.who].toLowerCase() : 'call'}</h3>
          <p>{act.headline}</p>
          <ul>
            {act.actions.slice(1).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <ul className="vb-greyed">
            <li>
              {act.redRow.tierName}: {act.redRow.reason}
            </li>
          </ul>
          <p className="vb-quiet">Trigger: {act.trigger}.</p>
          {tt.ACT_CAVEATS.map((c) => (
            <p key={c} className="vb-quiet">
              {c}
            </p>
          ))}
          <p className="vb-quiet">Sources: {act.sources.map((s) => s.label).join('; ')}.</p>
        </section>
      ) : null}

      <section>
        <h3>What this is not</h3>
        <p>{tt.HONESTY.groundAnalog}</p>
        <p>{tt.HONESTY.gallery}</p>
      </section>

      <section>
        <h3>IonScan, our own model</h3>
        <p>3.19 M parameters. It cuts the image into a 32 × 32 grid and reads it along 4 directions, each both ways (8 scans), with a selective state-space memory, “like a particle detector integrating hits along a path”, then attention.</p>
        <p className="vb-quiet">
          Data: NASA BPS Microscopy, 77,177 mouse skin-cell nuclei (NASA OSDR OSD-366, Penninckx et al. 2019); the 16,801 test nuclei were held out. Model by team SuperHumans with an AI assistant (Claude); onnxruntime-web (MIT).
        </p>
      </section>
    </div>
  )
}

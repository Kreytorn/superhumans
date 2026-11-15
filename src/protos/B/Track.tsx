// The cosmic-ray check (TrackTrace). The TrackTrace moment is the stage, printed like a specimen plate: the
// nucleus in ink on cut paper, what IonScan drew in blue pencil. This file adds only the paper around it:
// the sentence, the one press, the number on its leader, who acts, and the IonScan figure one scroll below.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown'
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Person } from '@phosphor-icons/react/dist/csr/Person'
import * as tt from '../../engine/tracktrace'
import type { NucleusResult, TrackTraceAct, WellResult } from '../../engine/tracktrace'
import TrackTraceMoment, { type MomentBeat, type MomentState, type TrackTraceMomentHandle } from '../../moments/tracktrace'
import { SCAN_DIRS } from '../../moments/tracktrace/stage'
import { setParam } from '../../lib/route'
import { publicUrl, route, type Status } from './data'
import { Layer, Mark, Tag } from './parts'
import type { ViewProps } from './Spike'
import './track.css'

const SAMPLE = 'nucleus-238'
const QUESTION = 'How many DNA breaks are in this nucleus? Do they fall on one straight line?'

/** Who acts and one action, as a sentence, per tier of the engine's decision (0 quiet, 1 crew medic, 2 flight surgeon). */
const ACT: { status: Status; who: string; line: string }[] = [
  { status: 'you', who: 'You', line: 'log this sample to your dose record; nothing else.' },
  { status: 'medic', who: 'Crew medic', line: 'cross-check the onboard dosimeters and move the crew to the most-shielded area.' },
  { status: 'surgeon', who: 'Flight surgeon', line: 'postpone the spacewalk and review this sample with the ground radiation team.' },
]
const PARTICLE_WORD: Record<string, string> = { sham: 'no radiation', 'X-ray': 'X-rays', Fe: 'an iron ion' }
const AFTER_SCANS = new Set(['foci', 'line', 'pullback', 'sample', 'verdict'])

const isPhone = () => matchMedia('(pointer: coarse)').matches || window.innerWidth < 820

interface Landed {
  result: NucleusResult
  act: TrackTraceAct | null
  well: WellResult | null
}

export function Track({ params, report }: ViewProps) {
  const stateParam = params.get('state')
  const pinState = stateParam === 'idle' || stateParam === 'result' ? stateParam : undefined
  const tRaw = params.get('t')
  const pinT = tRaw !== null && Number.isFinite(Number(tRaw)) ? Number(tRaw) : undefined
  const pinned = pinState !== undefined || pinT !== undefined
  const layer = params.get('layer') === 'how'
  // A phone replays the stored outputs; a laptop runs IonScan live (the moment falls back to the stored ones by itself).
  const [mode] = useState<'auto' | 'replay'>(() => (isPhone() || params.get('replay') === '1' ? 'replay' : 'auto'))

  const moment = useRef<TrackTraceMomentHandle>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [landed, setLanded] = useState<Landed | null>(null)
  const [stored, setStored] = useState<NucleusResult | null>(null)
  const [source, setSource] = useState({ hero: '', lens: '' })
  const [fontsOk, setFontsOk] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([document.fonts.load('600 40px "Bricolage Grotesque Variable"'), document.fonts.load('500 16px "Instrument Sans Variable"')])
      .catch(() => null)
      .then(() => live && setFontsOk(true))
    // the stored outputs of this nucleus: NASA's own count and the line, known before the model answers
    tt.replay(SAMPLE)
      .then((r) => live && setStored(r))
      .catch(() => null)
    return () => {
      live = false
    }
  }, [])

  // The moment says on its own root where the numbers under the lens come from; mirror that into the tag.
  useEffect(() => {
    const el = stage.current?.querySelector('.ttm')
    if (!el) return
    const read = () => {
      const hero = el.getAttribute('data-source') ?? ''
      const lens = el.getAttribute('data-picked-source') ?? ''
      setSource((s) => (s.hero === hero && s.lens === lens ? s : { hero, lens }))
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-source', 'data-picked-source'] })
    return () => mo.disconnect()
  }, [])

  const isReady = ready && fontsOk
  useEffect(() => report(isReady, phase), [isReady, phase, report])

  const onState = useCallback((s: MomentState) => {
    setPhase(s)
    if (s === 'running' || s === 'idle') setLanded(null)
  }, [])
  const onResult = useCallback((result: NucleusResult, act: TrackTraceAct | null, well: WellResult | null) => setLanded({ result, act, well }), [])

  const press = () => {
    if (pinned) {
      // a pinned view (?state=, ?t=) lets go of its pin, reloads the nucleus and then reads it
      setLanded(null)
      setBeat(null)
      setPhase('idle')
      if (params.has('state')) setParam('state', undefined)
      if (params.has('t')) setParam('t', undefined)
      window.setTimeout(() => void moment.current?.run(), 250)
      return
    }
    if (phase === 'error') moment.current?.reset()
    void moment.current?.run()
  }

  // ---- what the paper says, in step with the stage
  const running = phase === 'running'
  const b = phase === 'idle' ? null : beat
  const scanning = running && !!b && (b.beat === 'tokens' || b.beat === 'scans')
  const scan = b?.scan ?? -1
  const counted = !!b && (AFTER_SCANS.has(b.beat) || phase === 'result')
  const hero = landed?.result ?? stored
  const well = landed?.well ?? null
  const picked = phase === 'result' && well && b && b.picked !== null ? b.picked : null
  const count = picked !== null && well ? well.nuclei[picked].count : phase === 'result' && landed ? landed.result.count : (b?.count ?? 0)
  const lineOn = picked === null && !!b?.line && !!hero?.line.drawn
  const noLine = picked === null && counted && !!hero && !hero.line.drawn && (phase === 'result' || (!!b && b.beat !== 'foci'))
  const tag = picked !== null ? (source.lens === 'live' ? 'LIVE' : 'REPLAY') : source.hero === 'live' ? 'LIVE' : source.hero ? 'REPLAY' : ''
  const reading = running && !!b && b.beat === 'sample' && b.read > 0
  const act = landed?.act ?? null
  const actRow = act ? ACT[Math.min(2, Math.max(0, act.tier))] : null
  const nCells = well?.nNuclei ?? 583

  const actLine = actRow && act && (
    <p className="pb-act">
      <Mark status={actRow.status} size={15} />
      <span>
        <b>{actRow.who}:</b> {act.tierRef === null ? act.headline : actRow.line}
      </span>
    </p>
  )
  const sampleLine = reading ? (
    <p className="pbt-sample">
      Reading the whole sample: {b.read} of {nCells} cells
    </p>
  ) : landed && well ? (
    <p className="pbt-sample">
      {nCells} cells read. <i className="pbt-ring" aria-hidden="true" />
      The ten ringed weighed most. <Tag>{tt.HONESTY.precomputed}</Tag>
    </p>
  ) : null

  const arch = useRef<HTMLElement>(null)
  const toArch = () => {
    // an in-page jump: focus follows, so a keyboard or screen-reader user lands on the figure too
    arch.current?.focus({ preventScroll: true })
    arch.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  const label = running ? 'IonScan is reading' : phase === 'result' ? 'Scan again' : phase === 'error' ? 'Try again' : 'Scan this nucleus'

  return (
    <>
      <div className="pb-stage pbt-stage" ref={stage}>
        <TrackTraceMoment
          ref={moment}
          sampleId={SAMPLE}
          mode={mode}
          state={pinState}
          t={pinT}
          annotate={false}
          promise=""
          onState={onState}
          onReady={setReady}
          onBeat={setBeat}
          onResult={onResult}
          className="pbt-moment"
        />
        {/* the caption for the eight scans sits on the plate while they run: reading order only, never a found direction */}
        <p className="pbt-cap" data-show={scanning ? '1' : '0'} aria-hidden={!scanning}>
          {scanning && (
            <>
              <b>how IonScan reads every nucleus</b>
              <span className="pbt-scans">
                {SCAN_DIRS.map(([dx, dy], k) => (
                  <svg key={k} viewBox="-8 -8 16 16" width="16" height="16" data-on={k === scan ? '1' : k < scan ? '2' : '0'} aria-hidden="true">
                    <g transform={`rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}>
                      <path d="M-6 0H6M2 -4L6 0L2 4" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  </svg>
                ))}
              </span>
            </>
          )}
        </p>
        {/* a paper tab along the plate's lower edge: the whole sample decides who acts (laptop; on a phone it follows the number) */}
        <div className="pbt-band pb-wide">
          {actLine}
          {sampleLine}
        </div>
      </div>

      <section className="pb-paper pb-check pb-track" data-phase={phase}>
        <a className="pb-back" href={route('home')}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          <Person size={20} weight="fill" aria-hidden="true" />
          <span>Body</span>
        </a>
        <h1 className="pb-say pb-say-two">
          <span>IonScan circles every DNA-damage spot.</span> <span>When they line up, it draws a heavy ion’s path.</span>
        </h1>

        {/* the question; the press right under it; the answer hangs off the plate on a leader */}
        <p className="pb-bet pbt-q" data-show={phase === 'idle' ? '1' : '0'} aria-hidden={phase !== 'idle'}>
          {QUESTION}
        </p>

        <button type="button" className={`pb-btn${phase === 'result' ? ' is-quiet' : ''}`} data-qa="primary" onClick={press} disabled={running && !pinned} aria-busy={running}>
          {label}
        </button>

        {phase === 'error' && <p className="pb-error">This nucleus could not be read. Check the connection, then try again.</p>}

        <div className="pbt-answer" data-show={counted ? '1' : '0'} role="status">
          {counted && (
            <>
              <div className="pb-hero-row">
                <p className="pb-hero-num">
                  {count}{' '}
                  <span>
                    damage {count === 1 ? 'spot' : 'spots'}
                    {tag && <Tag>{tag}</Tag>}
                  </span>
                </p>
                <span className="pb-leader" aria-hidden="true" />
              </div>
              <p className="pbt-cmp">
                {picked !== null ? (
                  <span>
                    nucleus {picked + 1} of {nCells}, under the lens
                  </span>
                ) : (
                  <>
                    {hero && hero.nfoci2016 !== null && <span>NASA’s own count: {hero.nfoci2016}</span>}
                    {lineOn && hero && (
                      <span className="pbt-line">
                        <i className="pbt-pencil" aria-hidden="true" />
                        {hero.line.nInliers} in a straight line <em>{tt.HONESTY.lineLabel}</em>
                      </span>
                    )}
                    {noLine && <span className="pbt-line">no straight line</span>}
                  </>
                )}
              </p>
            </>
          )}
        </div>
        <div className="pbt-below pb-narrow">
          {actLine}
          {sampleLine}
        </div>

        <div className="pbt-foot">
          <button type="button" className="pb-how-btn" aria-haspopup="dialog" aria-expanded={layer} onClick={() => setParam('layer', 'how')}>
            How do we know?
          </button>
          {/* the network itself is one scroll step below, in the open */}
          <button type="button" className="pb-how-btn pbt-down" onClick={toArch}>
            Inside IonScan
            <ArrowDown size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* one scroll step below: IonScan itself, in the open */}
      <section className="pbt-arch" aria-label="The IonScan network" ref={arch} tabIndex={-1}>
        <h2 className="pbt-arch-say">IonScan, our own 3.2{' '}M‑parameter network.</h2>
        <figure className="pbt-arch-fig">
          <div className="pbt-arch-crop">
          <img
            src={publicUrl('tracktrace/ionscan_architecture.svg')}
            alt="Diagram of the IonScan network: the image becomes a grid of tokens, IonScan blocks read it along four directions both ways, attention pools it, and a decoder returns the map of damage spots. Marked as an AI-generated diagram."
            width={501}
            height={484}
            decoding="async"
            draggable={false}
          />
          </div>
        </figure>
      </section>

      <Layer open={layer} onClose={() => setParam('layer', undefined)}>
        <TrackHow landed={landed} stored={stored} />
      </Layer>
    </>
  )
}

// ------------------------------------------------------------------ "How do we know?"
function TrackHow({ landed, stored }: { landed: Landed | null; stored: NucleusResult | null }) {
  const r = landed?.result ?? stored
  const act = landed?.act ?? null
  const well = landed?.well ?? null
  const top = well ? tt.topLabels(well.verdict) : null
  return (
    <div className="pb-how-body">
      <section>
        <h3>The nucleus</h3>
        <p>{tt.HONESTY.heroCaption}</p>
        <p>{tt.HONESTY.groundAnalog}</p>
        <p>It is printed dark on light here: the darker the ink, the brighter that spot was under the microscope.</p>
      </section>
      <section>
        <h3>The count</h3>
        {r && (
          <p>
            IonScan circled {r.count} damage spots in this nucleus{r.nfoci2016 !== null ? `; NASA’s own count is ${r.nfoci2016}` : ''}. Each circle is one peak of the model’s spot map; the number is the number of circles.
          </p>
        )}
        <p>Tested on 16,801 nuclei from 3 mice it never saw (34 samples): its spot counts follow NASA’s (rank correlation 0.954; spot-finding F1 0.920).</p>
        <p>{tt.HONESTY.fociLabels}</p>
      </section>
      <section>
        <h3>The line</h3>
        <p>{tt.HONESTY.trackLine}</p>
        <p>
          The rule: at least {tt.LINE_RULE.minInliers} circles in line and a score of {tt.LINE_RULE.minScore} or more.{r ? ` This nucleus scores ${r.line.score.toFixed(3)}.` : ''} An X-ray nucleus from the same test set scores 0.375, so it
          gets no line; one iron-ion nucleus scores 0.597 and honestly gets no line either.
        </p>
      </section>
      <section>
        <h3>How IonScan reads</h3>
        <p>
          IonScan is our own network, 3.19 M parameters. It cuts the image into a 32 × 32 grid and reads it along 4 directions, each both ways (8 scans), with a selective state-space memory, like a particle detector integrating hits along a
          path, then attention. The scans on the plate show its reading order only; they do not find a direction.
        </p>
        <p>It builds on selective state-space scans (Gu &amp; Dao, 2023; Dao &amp; Gu, 2024) and the SUGAR-ReGLU feed-forward (Horuz et al., 2025). The diagram under the plate is AI-generated.</p>
        <p>Per nucleus its guess of the particle is weak: macro-F1 0.674, next to a MobileNetV4 baseline at 0.678. The spots and the whole-sample call are what to trust.</p>
      </section>
      <section>
        <h3>The whole sample</h3>
        {well && top && (
          <p>
            All {well.nNuclei} nuclei of this sample were read, and a second small model made one call for the sample: {PARTICLE_WORD[top.particle] ?? top.particle}, {top.dose} lab dose band, {top.time} since exposure. The ten ringed nuclei
            are the ones it weighed most. This scan is {tt.HONESTY.precomputedWell}.
          </p>
        )}
        <p>Whole-sample call on the 34 test samples: right particle 97%, dose band 88%, time since exposure 95%.</p>
        <p>{tt.HONESTY.batch}</p>
        <p>
          {tt.HONESTY.wellsStandIn} {tt.HONESTY.doseBands}
        </p>
      </section>
      <section>
        <h3>Who acts</h3>
        <p>The whole sample decides it, never one nucleus. Every trigger is our own product rule, fixed before testing.</p>
        {act && <p>Why this step: {act.trigger}</p>}
        <ul className="pb-ladder">
          <li>
            <Mark status="you" />
            <span>
              <b>You.</b> The sample looks unexposed: log it to your dose record.
            </span>
          </li>
          <li>
            <Mark status="medic" />
            <span>
              <b>Crew medic.</b> Exposed, low lab dose band: cross-check the onboard dosimeters; crew to the most-shielded area.
            </span>
          </li>
          <li>
            <Mark status="surgeon" />
            <span>
              <b>Flight surgeon.</b> Exposed, high lab dose band, or damage that is not repairing: review with the ground radiation team; postpone the spacewalk.
            </span>
          </li>
          <li className="is-grey">
            <Mark status="abort" />
            <span>
              <b>Abort.</b> Always greyed: this check never fires it.
            </span>
          </li>
        </ul>
        {act && act.sources.length > 0 && <p className="pb-src">Sources: {act.sources.map((s) => s.label).join('; ')}.</p>}
      </section>
      <section>
        <h3>Why this nucleus</h3>
        <p>{tt.HONESTY.gallery}</p>
      </section>
      <section>
        <h3>Data and credits</h3>
        <p className="pb-src">
          NASA BPS Microscopy, 77,177 mouse skin-cell nuclei (NASA OSDR OSD-366, Penninckx et al. 2019), of which the 16,801 test nuclei were held out. A ground analog, not a crew test. Models by team SuperHumans with an AI assistant
          (Claude). The IonScan diagram is AI-generated. No NASA logos or insignia are used.
        </p>
      </section>
    </div>
  )
}

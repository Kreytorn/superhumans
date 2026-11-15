// The radiation check (TrackTrace), the flagship. The ready TrackTrace moment is the stage inside the window;
// every word sits on the drape and lands in step with the moment's beats. One press runs IonScan (live on a
// laptop, stored outputs on a phone). One scroll step below: the IonScan architecture figure, in the open.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft } from '@phosphor-icons/react'
import * as tt from '../../engine/tracktrace'
import type { NucleusResult, TrackTraceAct, WellResult } from '../../engine/tracktrace'
import TrackTraceMoment, { type MomentBeat, type MomentState, type TrackTraceMomentHandle } from '../../moments/tracktrace'
import { byId, hrefOf, type Level } from './data'
import { fitWord, isPhone, prefersReducedMotion, useViewport } from './fit'
import { FitWord, HowLayer, Mark } from './pieces'
import type { ViewProps } from './index'
import './track.css'

const SAMPLE = 'nucleus-238'
const CHECK = byId('tracktrace')!
const SENTENCE = 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.'
const AFTER_SCANS = new Set(['foci', 'line', 'pullback', 'sample', 'verdict'])
const AFTER_FOCI = new Set(['line', 'pullback', 'sample', 'verdict'])

/** The site's status word and the one action for the engine's tier (words from the TrackTrace card and act.ts). */
function actFor(a: TrackTraceAct | null): { level: Level; who: string; action: string } | null {
  if (!a) return null
  if (a.tier >= 2) return { level: 'surgeon', who: 'Flight surgeon', action: 'postpone the spacewalk and review this sample with the ground radiation team.' }
  if (a.tier === 1) return { level: 'medic', who: 'Crew medic', action: 'cross-check the onboard dosimeters and move the crew to the most-shielded area.' }
  if (a.tierRef === 'GREEN') return { level: 'you', who: 'You', action: 'log this sample to your dose record; nothing else.' }
  return { level: 'none', who: 'Nobody yet', action: 'no rule fires for this sample.' }
}

const spots = (n: number) => `${n} damage ${n === 1 ? 'spot' : 'spots'}`

export function Track({ params, fonts, onStatus }: ViewProps) {
  const { desktop, u, vw } = useViewport()
  const phone = useMemo(() => isPhone(), [])
  const ref = useRef<TrackTraceMomentHandle>(null)
  const stage = useRef<HTMLDivElement>(null)
  const ion = useRef<HTMLElement>(null)

  // ?state=idle | result and ?t=<ms> pin the moment; the first press lets go of the pin
  const query = params.toString()
  const [unpinned, setUnpinned] = useState(false)
  useEffect(() => setUnpinned(false), [query])
  const want = params.get('state')
  const tRaw = params.get('t')
  const pinState = !unpinned && (want === 'idle' || want === 'result') ? want : undefined
  const pinT = !unpinned && tRaw !== null && Number.isFinite(Number(tRaw)) ? Math.max(0, Number(tRaw)) : undefined
  const pinned = pinState !== undefined || pinT !== undefined
  // ?mode=replay shows the stored outputs on a laptop too; a phone always does
  const modeParam = params.get('mode')
  const mode = phone || modeParam === 'replay' ? 'replay' : modeParam === 'live' ? 'live' : 'auto'
  // on a laptop the idle view counts as ready once IonScan is loaded (or after 8 s), so the first press answers fast
  const waitWarm = useRef(mode !== 'replay' && !pinned).current
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    if (!waitWarm) return
    let on = true
    const done = () => on && setWarm(true)
    const cap = window.setTimeout(done, 8000)
    tt.load().then(() => window.setTimeout(done, 1200), done)
    return () => {
      on = false
      window.clearTimeout(cap)
    }
  }, [waitWarm])

  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [res, setRes] = useState<{ result: NucleusResult; act: TrackTraceAct | null; well: WellResult | null } | null>(null)
  const [stored, setStored] = useState<NucleusResult | null>(null)
  const [src, setSrc] = useState<{ run: string; lens: string }>({ run: '', lens: '' })
  const [how, setHow] = useState(false)

  // the stored outputs give the words that land in step (NASA's count, how many spots sit in line) before the run settles
  useEffect(() => {
    let live = true
    tt.replay(SAMPLE)
      .then((r) => live && setStored(r))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  // the moment says on its root whether what it shows is a live run or the stored outputs
  useEffect(() => {
    const root = stage.current?.querySelector<HTMLElement>('.ttm')
    if (!root) return
    const read = () => {
      const next = { run: root.dataset.source ?? '', lens: root.dataset.pickedSource ?? '' }
      setSrc((p) => (p.run === next.run && p.lens === next.lens ? p : next))
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(root, { attributes: true, attributeFilter: ['data-source', 'data-picked-source'] })
    return () => mo.disconnect()
  }, [])

  const pageReady = fonts && ready && (!waitWarm || warm)
  useEffect(() => onStatus({ ready: pageReady, state }), [pageReady, state, onStatus])

  const press = useCallback(() => {
    if (state === 'running' && !pinned) return
    setRes(null)
    if (pinned) {
      setUnpinned(true)
      // the moment reloads without the pin; run once it is idle again
      window.setTimeout(() => void ref.current?.run(), 250)
      return
    }
    void ref.current?.run()
  }, [state, pinned])

  const onResult = useCallback((result: NucleusResult, act: TrackTraceAct | null, well: WellResult | null) => setRes({ result, act, well }), [])
  const onState = useCallback((s: MomentState) => {
    setState(s)
    if (s !== 'result') setRes(null)
  }, [])

  const settled = state === 'result' && res !== null
  const running = state === 'running'
  const known = res?.result ?? stored
  const b = beat?.beat ?? 'specimen'
  const well = res?.well ?? null
  const picked = settled && well && beat && beat.picked !== null && well.nuclei[beat.picked] ? beat.picked : null

  // the answer: the circles landed so far, then the settled count; under the lens, that cell's own count
  const count = picked !== null && well ? well.nuclei[picked].count : settled ? res.result.count : (beat?.count ?? 0)
  const showAnswer = settled || (running && AFTER_SCANS.has(b))
  const showCompare = settled || (running && AFTER_FOCI.has(b))
  const lineDrawn = settled ? res.result.line.drawn : !!beat?.line
  const showLine = picked === null && known !== null && (settled || (running && AFTER_FOCI.has(b) && (lineDrawn || !known.line.drawn)))
  const liveRun = (res?.result.source ?? src.run) === 'live'
  const runTag = liveRun ? 'LIVE' : 'REPLAY'
  const lensTag = src.lens === 'live' ? 'LIVE' : liveRun ? '' : 'REPLAY'
  const act = settled ? actFor(res.act) : null

  // one fit for every count, so the phrase never re-sets itself while the number changes
  const heroSize = desktop ? 88 * u : 50
  const heroTarget = desktop ? 482 * u : vw - 32
  const heroFit = useMemo(() => (fonts ? fitWord('88 damage spots', 800, heroSize, heroTarget) : null), [fonts, heroSize, heroTarget])

  const scanning = running && (b === 'tokens' || b === 'scans')
  const sampling = running && (b === 'pullback' || b === 'sample' || b === 'verdict') && (beat?.read ?? 0) > 0
  const label = running ? 'Scanning…' : state === 'result' ? 'Scan again' : 'Scan this nucleus'

  return (
    <>
      <div className="drp-fold">
        <div className="drp-sheet drp-check drp-tt" data-shape="bleed" data-res={showAnswer ? '1' : '0'} data-beat={b}>
          <div className="drp-win">
            <div className="drp-stage" ref={stage}>
              <TrackTraceMoment
                ref={ref}
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
              />
            </div>
            {scanning && (
              <p className="drp-tab drp-celltab" data-qa="caption" role="status">
                how IonScan reads every nucleus<span className="drp-quiet">{beat && beat.scan >= 0 ? `scan ${beat.scan + 1} of 8` : 'a 32 × 32 grid'}</span>
              </p>
            )}
            {sampling && (
              <p className="drp-tab drp-celltab" data-qa="caption" role="status">
                reading the whole sample<span className="drp-quiet">{beat ? beat.read : 0} cells</span>
              </p>
            )}
            {!desktop && settled && well && picked === null && (
              <p className="drp-tab drp-touchtab" data-qa="hint">
                touch any cell
              </p>
            )}
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
            <FitWord as="h1" className="drp-name" text={CHECK.name} weight={800} size={desktop ? 100 * u : 64} target={desktop ? 420 * u : Math.min(270, vw - 110)} ready={fonts} />
            <div className="drp-slot">
              <p className={`drp-sentence${showAnswer ? ' drp-out' : ''}`}>{SENTENCE}</p>
              <p
                className={`drp-tab drp-hero drp-fit${showAnswer ? '' : ' drp-out'}`}
                data-qa="answer"
                aria-live={settled ? 'polite' : 'off'}
                style={{ fontWeight: 800, fontSize: heroFit ? heroFit.size : heroSize, fontVariationSettings: `"wdth" ${heroFit ? heroFit.wdth : 100}` }}
              >
                {spots(count)}
              </p>
              <p className={`drp-compare${showCompare && known ? '' : ' drp-out'}`} data-qa="compare">
                {picked !== null && well ? `cell ${picked + 1} of ${well.nNuclei}` : `NASA’s own count: ${known && known.nfoci2016 !== null ? known.nfoci2016 : ''}`}
                {(picked !== null ? lensTag : runTag) && (
                  <span className="drp-tag" data-qa="mode">
                    {picked !== null ? lensTag : runTag}
                  </span>
                )}
              </p>
            </div>
            <div className="drp-bar">
              <button type="button" className="drp-btn" data-qa="primary" disabled={running && !pinned} aria-busy={running} onClick={press}>
                {label}
              </button>
              <button type="button" className="drp-link drp-how-link" aria-expanded={how} onClick={() => setHow(true)}>
                How do we know?
              </button>
            </div>
            {state === 'error' && (
              <p className="drp-err" role="alert">
                The result did not load. Check the connection, then press the button again.
              </p>
            )}
            <p className={`drp-line2${showLine ? '' : ' drp-hide'}`} data-qa="line">
              {known && known.line.drawn ? (
                <>
                  {known.line.nInliers} in a straight line<span className="drp-quiet">{tt.HONESTY.lineLabel}</span>
                </>
              ) : (
                'no straight line'
              )}
            </p>
            <p className={`drp-act${act ? '' : ' drp-hide'}`} data-qa="act">
              {act && <Mark level={act.level} />}
              <b>{act ? act.who : ''}:</b> {act ? act.action : ''}
              <span className="drp-tag">{tt.HONESTY.precomputed}</span>
            </p>
            <p className={`drp-legend${settled && well ? '' : ' drp-hide'}`}>
              <i className="drp-ring" aria-hidden="true" />
              the ten cells that weighed most in this call
            </p>
            {desktop && (
              <button
                type="button"
                className="drp-link drp-cue"
                onClick={() => ion.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })}
              >
                Inside IonScan
                <ArrowDown size={16} weight="bold" aria-hidden="true" />
              </button>
            )}
          </div>

          <HowLayer open={how} onClose={() => setHow(false)}>
            <TrackHow result={res?.result ?? null} stored={stored} act={res?.act ?? null} well={well} />
          </HowLayer>
        </div>
      </div>

      <section className="drp-ion" ref={ion} aria-labelledby="drp-ion-title">
        <div className="drp-ion-words">
          <h2 id="drp-ion-title">
            <FitWord className="drp-ion-title" text="IonScan" weight={800} size={desktop ? 100 * u : 56} target={desktop ? 420 * u : Math.min(250, vw - 120)} ready={fonts} />
          </h2>
          <p className="drp-ion-cap">Our own 3.19 M-parameter network. It reads every nucleus as a 32 × 32 grid, eight ways.</p>
        </div>
        <figure className="drp-ion-fig">
          <img
            src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`}
            width={501}
            height={484}
            loading="lazy"
            alt="Diagram of the IonScan network. Left: convolutions, IonScan blocks on a 32 by 32 and a 16 by 16 token grid, attention, then four outputs, with a decoder that returns the damage-spot map. Right: one IonScan block, with scans along four directions and a direction gate. Marked as an AI-generated diagram."
          />
        </figure>
      </section>
    </>
  )
}

// ------------------------------------------------------------------ layer two
function TrackHow({ result, stored, act, well }: { result: NucleusResult | null; stored: NucleusResult | null; act: TrackTraceAct | null; well: WellResult | null }) {
  const H = tt.HONESTY
  const r = result ?? stored
  const live = result && result.source === 'live' ? result.timing : null
  return (
    <>
      <section>
        <h3>This nucleus</h3>
        <p>{H.heroCaption}</p>
        {r && (
          <p>
            IonScan circled {r.count} damage spots; NASA&rsquo;s 2016 analysis program counted {r.nfoci2016}.
          </p>
        )}
        <p className="drp-fine" data-qa="run-note">
          {live ? `This run happened in your browser just now: ${Math.round(live.ms)} ms on ${live.backend === 'webgpu' ? 'WebGPU' : 'WebAssembly'}.` : `What you see here is a stored result, ${H.precomputed}.`}
        </p>
      </section>

      <section>
        <h3>On 16,801 nuclei it never saw</h3>
        <p>Three mice kept out of training, 34 samples. Its spot counts follow NASA&rsquo;s: rank correlation 0.954; spot-finding F1 0.920.</p>
        <p className="drp-fine">{H.fociLabels}</p>
      </section>

      <section>
        <h3>The line</h3>
        <p>{H.trackLine}</p>
        <p className="drp-fine">
          It is drawn only when at least {tt.LINE_RULE.minInliers} circles sit in line and the score is {tt.LINE_RULE.minScore} or more.{r ? ` This nucleus scores ${r.line.score.toFixed(3)}.` : ''} The X-ray nucleus scores 0.375: no line. One iron
          nucleus scores 0.597, so it honestly gets no line. The eight scans show how IonScan reads, never a direction it found.
        </p>
      </section>

      <section>
        <h3>The whole sample decides</h3>
        <p>
          {well ? `All ${well.nNuclei} cells of this sample were read` : 'Every cell of the sample is read'}, {H.precomputedWell}. On the 34 test samples the sample call names the right particle 97% of the time, the dose band 88%, the time since exposure
          95%.
        </p>
        <p>{H.batch}</p>
        <p className="drp-fine">Per nucleus the particle guess is weak: macro-F1 0.674, next to a MobileNetV4 baseline at 0.678.</p>
        <p className="drp-fine">
          {H.wellsStandIn} {H.doseBands}
        </p>
      </section>

      <section>
        <h3>Who acts</h3>
        <ul className="drp-ladder">
          <li>
            <Mark level="you" colour="var(--green)" />
            <span>
              <b>You:</b> log the sample to your dose record.
            </span>
          </li>
          <li>
            <Mark level="medic" colour="var(--green)" />
            <span>
              <b>Crew medic:</b> cross-check the onboard dosimeters; crew to the most-shielded area.
            </span>
          </li>
          <li>
            <Mark level="surgeon" colour="var(--green)" />
            <span>
              <b>Flight surgeon:</b> postpone the spacewalk; review with the ground radiation team; confirm with a blood draw.
            </span>
          </li>
          <li data-off="1">
            <Mark level="abort" colour="var(--green)" />
            <span>
              <b>Abort:</b> never fired by this check.
            </span>
          </li>
        </ul>
        <p className="drp-fine">
          Every trigger is our product rule.{act && act.tier >= 2 ? ' Why this step: the whole-sample call says irradiated, and its lab dose band is high or the damage is not repairing.' : ''}
          {act && act.sources.length > 0 ? ` Sources: ${act.sources.map((s) => s.label).join('; ')}.` : ''}
        </p>
      </section>

      <section>
        <h3>What this is not</h3>
        <p>{H.groundAnalog}</p>
        <p className="drp-fine">{H.gallery}</p>
      </section>

      <section>
        <h3>Inside</h3>
        <p className="drp-fine">
          IonScan cuts the image into a 32 × 32 grid and reads it along 4 directions, each both ways, with a selective state-space memory, like a particle detector integrating hits along a path, then attention. 3.19 M parameters. Data: NASA BPS
          Microscopy, 77,177 mouse skin-cell nuclei (NASA OSDR OSD-366, Penninckx et al. 2019). Runtime: onnxruntime-web (MIT).
        </p>
      </section>
    </>
  )
}

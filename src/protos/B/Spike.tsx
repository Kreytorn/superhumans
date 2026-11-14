// The blood check. The microscope photo is the stage; one press runs the two real models (stored outputs on a
// phone or after a failure) and the result is drawn in the model's own cell order.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Person } from '@phosphor-icons/react/dist/csr/Person'
import * as spike from '../../engine/spikecount'
import type { SpikeResult, TimelineStep } from '../../engine/spikecount'
import { setParam } from '../../lib/route'
import { BLOOD_PHOTO, SAMPLE, route, type Status } from './data'
import { Cells, Key, Layer, Mark, PENCIL, StatusLadder, STEP, Swatch, Tag, cellsEnd } from './parts'

type Phase = 'idle' | 'running' | 'result' | 'error'
export interface ViewProps {
  params: URLSearchParams
  report: (ready: boolean, state: Phase) => void
}

const ACT: { status: Status; who: string; line: string }[] = [
  { status: 'you', who: 'You', line: 'log the trend; nothing else.' },
  { status: 'you', who: 'You', line: 're-sample the next day with clean prep.' },
  { status: 'medic', who: 'Crew medic', line: 'run the blood tests for red-cell breakdown.' },
]

const QUESTION = 'How many red cells are in this photo? And how many are spiky?'

const timeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

let warm: Promise<unknown> | null = null
let warmDone = false
let pressed = false
/** A laptop runs the real models; a phone (coarse pointer or a narrow screen) replays stored outputs. */
export const canRunLive = () => !(matchMedia('(pointer: coarse)').matches || window.innerWidth < 820)
/** Loads both models and runs them once on another photo, so the press itself goes straight to reading. Safe to call many times. */
export function prewarm() {
  warm ??= spike
    .load()
    .then(() => (pressed ? null : spike.analyze('field-184', { polygons: false }))) // a press that is already waiting goes first
    .then(() => {
      warmDone = true
    })
    .catch(() => null)
  return warm
}
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const pct1 = (v: number) => v.toFixed(1)

export function Spike({ params, report }: ViewProps) {
  const forced = params.get('state')
  const pinRaw = params.get('t')
  const pin = pinRaw !== null && Number.isFinite(Number(pinRaw)) ? Number(pinRaw) : null
  const layer = params.get('layer') === 'how'
  const canLive = useMemo(() => canRunLive() && params.get('replay') !== '1', []) // eslint-disable-line react-hooks/exhaustive-deps

  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<SpikeResult | null>(null)
  const [t, setT] = useState(0)
  const [busy, setBusy] = useState('')
  const [photoOk, setPhotoOk] = useState(false)
  const [fontsOk, setFontsOk] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  // The illustrative mission: four stored photos, chained by the engine. step = which one is on the stage (null = this photo).
  const [past, setPast] = useState<{ results: SpikeResult[]; steps: TimelineStep[] } | null>(null)
  const [step, setStep] = useState<number | null>(null)
  const run = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    let live = true
    document.fonts.ready.then(() => live && setFontsOk(true))
    return () => {
      live = false
      cancelAnimationFrame(raf.current)
      run.current++
    }
  }, [])

  // States by URL: ?state=result is the settled result, ?t=<ms> pins the drawing clock (both from stored outputs).
  useEffect(() => {
    if (forced !== 'result' && pin === null) {
      if (forced === 'idle') {
        run.current++
        cancelAnimationFrame(raf.current)
        setPhase('idle')
        setResult(null)
        setT(0)
        setPicked(null)
        setStep(null)
      }
      return
    }
    const id = ++run.current
    cancelAnimationFrame(raf.current)
    spike
      .replay(SAMPLE)
      .then((r) => {
        if (run.current !== id) return
        const end = cellsEnd(r.cells.length) + 800
        setResult(r)
        setT(pin === null || pin >= end ? Infinity : pin)
        setPhase(pin === null || pin >= end ? 'result' : 'running')
      })
      .catch(() => run.current === id && setPhase('error'))
  }, [forced, pin])

  // On a laptop the models load as soon as the check opens (Home starts them even earlier), so the press itself is quick.
  // The two models are this view's assets: on a laptop the view calls itself ready once they are warm (8 s at most).
  const needWarm = canLive && forced !== 'result' && pin === null
  const [warmOk, setWarmOk] = useState(warmDone)
  useEffect(() => {
    if (!needWarm) return
    let live = true
    const done = () => live && setWarmOk(true)
    void prewarm().then(done)
    const cap = window.setTimeout(done, 8000)
    return () => {
      live = false
      clearTimeout(cap)
    }
  }, [needWarm])

  const hasResult = result !== null
  useEffect(() => {
    if (!hasResult || past) return
    let live = true
    spike
      .runTimeline('replay')
      .then((results) => {
        for (const r of results) if (r.imageUrl) new Image().src = r.imageUrl
        if (live) setPast({ results, steps: spike.timeline(results) })
      })
      .catch(() => null)
    return () => {
      live = false
    }
  }, [hasResult, past])

  const ready = photoOk && fontsOk && (forced !== 'result' && pin === null ? !needWarm || warmOk : result !== null || phase === 'error')
  useEffect(() => report(ready, phase), [ready, phase, report])

  // Draws a finished result on the drawing clock: outlines in cell order, then the comparison, then the action.
  const play = useCallback((r: SpikeResult, id: number) => {
    if (reducedMotion()) {
      setT(Infinity)
      setPhase('result')
      return
    }
    const end = cellsEnd(r.cells.length) + 800
    const t0 = performance.now()
    setPhase('running')
    setT(0)
    const tick = () => {
      if (run.current !== id) return
      const now = performance.now() - t0
      if (now >= end) {
        setT(Infinity)
        setPhase('result')
        return
      }
      setT(now)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [])

  const grade = useCallback(async () => {
    const id = ++run.current
    cancelAnimationFrame(raf.current)
    setPhase('running')
    setResult(null)
    setT(0)
    setPicked(null)
    setStep(null)
    setBusy(canLive && !warmDone ? 'Loading the two models' : 'Reading the photo')
    let r: SpikeResult | null = null
    if (canLive) {
      try {
        pressed = true
        if (warm) await warm
        await timeout(spike.load(), 45000)
        if (run.current === id) setBusy('Reading the photo')
        r = await timeout(spike.analyze(SAMPLE), 30000)
      } catch {
        r = null
      }
    }
    if (!r) {
      try {
        r = await spike.replay(SAMPLE)
      } catch {
        if (run.current === id) {
          setPhase('error')
          setBusy('')
        }
        return
      }
    }
    if (run.current !== id) return
    setResult(r)
    setBusy('')
    play(r, id)
  }, [canLive, play])

  const last = spike.TIMELINE.length - 1
  const old = step !== null && step < last && past && phase === 'result' ? { r: past.results[step], d: past.steps[step].decision } : null
  const cells = result?.cells ?? []
  const n = cells.length
  const end = cellsEnd(n)
  const drawn = !result ? 0 : t === Infinity ? n : Math.min(n, Math.floor(t / STEP) + 1)
  const spikySoFar = useMemo(() => cells.slice(0, drawn).filter((c) => c.cls >= 1 && c.cls <= 4).length, [cells, drawn])
  const pct = !result ? 0 : t === Infinity ? result.metrics.spikyPct : drawn ? (spikySoFar / drawn) * 100 : 0
  const showCompare = !!result && t >= end + 120
  const showAct = !!result && t >= end + 480
  const decision = useMemo(() => (result ? spike.act(result) : null), [result])
  const act = ACT[Math.min((old ? old.d.tier : decision?.tier) ?? 0, 2)]
  const before = spike.DEFAULT_BASELINES.model.spikyPct
  const sourceTag = old ? 'REPLAY' : result ? (result.source === 'live' ? 'LIVE' : 'REPLAY') : canLive ? 'LIVE' : 'REPLAY'
  const shownPct = old ? old.r.metrics.spikyPct : pct
  const shownCount = old ? old.r.cells.length : drawn
  const selected = old ? step! : last
  const mission = useMemo(
    () =>
      spike.TIMELINE.map((s, i) => ({
        label: s.label,
        pct: i === spike.TIMELINE.length - 1 && result ? result.metrics.spikyPct : (spike.FIELDS.find((f) => f.field === s.field)?.modelSpikyPct ?? 0),
      })),
    [result],
  )

  const buttonLabel = phase === 'running' ? (busy ? 'Reading' : 'Drawing') : phase === 'result' ? 'Grade again' : phase === 'error' ? 'Try again' : 'Grade this blood'
  const countLine = (
    <>
      {shownCount} cells outlined<span data-show={showCompare || old ? '1' : '0'}>; on average 4.6 points from an expert’s count.</span>
    </>
  )
  const actLine = (
    <>
      <Mark status={act.status} size={16} />
      <span>
        <b>{act.who}:</b> {act.line}
      </span>
    </>
  )

  return (
    <>
      <div className="pb-stage" data-qa="hero">
        <img className="pb-photo" src={old?.r.imageUrl ?? BLOOD_PHOTO()} alt="Microscope photo of red blood cells" draggable={false} onLoad={() => setPhotoOk(true)} onError={() => setPhotoOk(true)} />
        {result && <Cells key={old ? step : 'now'} cells={old ? old.r.cells : cells} t={old ? Infinity : t} picked={picked} onPick={setPicked} pickLabel={(c) => spike.CLASS_PLAIN[c.className]} />}
        {/* the photo's corner: the key to the model's marks once they are drawn, and where the result comes from */}
        <p className="pb-stage-tag">
          {result && <Key />}
          <Tag>{sourceTag}</Tag>
        </p>
        {/* the wait is said on the photo itself, where the result is about to be drawn */}
        <p className="pb-wait" role="status" data-show={phase === 'running' && busy ? '1' : '0'}>
          {busy}
        </p>
        {/* on a phone the number sits on a paper tab on the photo's lower edge, as on Home */}
        <p className="pb-plate pb-narrow" data-show={result ? '1' : '0'}>
          <b>{pct1(shownPct)}%</b> spiky
          <span data-show={showCompare || old ? '1' : '0'}>
            {`; ${pct1(before)}% before flight `}
            <Tag>Illustrative</Tag>
          </span>
        </p>
      </div>

      <section className="pb-paper pb-check">
        <a className="pb-back" href={route('home')}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          <Person size={20} weight="fill" aria-hidden="true" />
          <span>Body</span>
        </a>
        <h1 className="pb-say pb-say-two">
          <span>Every red blood cell, outlined.</span> <span>The spiky ones, counted.</span>
        </h1>
        {/* the question, then its answer in the same place */}
        <div className="pb-slot">
          <p className="pb-bet pb-wide" data-show={result ? '0' : '1'}>
            {QUESTION}
          </p>
          {/* on a phone the question stays while it is being answered on the photo, then gives way to who acts */}
          <p className="pb-bet pb-narrow" data-show={showAct ? '0' : '1'}>
            {QUESTION}
          </p>
          {result && <p className="pb-count pb-wide">{countLine}</p>}
          {result && (
            <p className="pb-act pb-narrow" role="status" data-show={showAct ? '1' : '0'}>
              {actLine}
            </p>
          )}
        </div>

        <button type="button" className={`pb-btn${phase === 'result' ? ' is-quiet' : ''}`} data-qa="primary" onClick={grade} disabled={phase === 'running'} aria-busy={phase === 'running'}>
          {buttonLabel}
        </button>

        {phase === 'error' && <p className="pb-error">The photo could not be read. Check the connection, then try again.</p>}

        <div className="pb-answer" data-show={result ? '1' : '0'}>
          <div className="pb-hero-row">
            <p className="pb-hero-num">
              {pct1(shownPct)}%{' '}
              <span>
                <Swatch spiky /> spiky
              </span>
            </p>
            <span className="pb-leader" aria-hidden="true" />
          </div>
          <div className="pb-cmp" data-show={showCompare ? '1' : '0'}>
            <p className="pb-cmp-line">
              {pct1(before)}% before flight <Tag>Illustrative</Tag>
            </p>
            <figure className="pb-chart" aria-label={`Spiky cells across an illustrative mission: ${mission.map((m) => `${m.label} ${pct1(m.pct)}%`).join(', ')}`}>
              <svg viewBox="0 0 232 52" aria-hidden="true">
                <line x1="0" y1="48.5" x2="232" y2="48.5" stroke="#1D1B19" strokeWidth="1" />
                <polyline fill="none" stroke="#1D1B19" strokeWidth="1" points={mission.map((m, i) => `${29 + i * 58},${46 - (m.pct / 70) * 42}`).join(' ')} />
                {mission.map((m, i) => (
                  <circle key={m.label} cx={29 + i * 58} cy={46 - (m.pct / 70) * 42} r={i === selected ? 5 : 3.5} fill={PENCIL} stroke={i === selected ? '#1D1B19' : '#E8E4DC'} strokeWidth="1.5" />
                ))}
              </svg>
              <div className="pb-ticks">
                {mission.map((m, i) => (
                  <button
                    key={m.label}
                    type="button"
                    data-qa="tick"
                    aria-pressed={i === selected}
                    aria-label={i === last ? `${m.label}: this photo. Press to draw it again` : `${m.label}: show that photo`}
                    disabled={!past || phase !== 'result'}
                    onClick={() => {
                      setPicked(null)
                      if (i !== selected) setStep(i === last ? null : i)
                      else if (old) setStep(null)
                      else if (result) {
                        cancelAnimationFrame(raf.current)
                        play(result, ++run.current)
                      }
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </figure>
          </div>
          <p className="pb-act" role="status" data-show={showAct ? '1' : '0'}>
            {actLine}
          </p>
        </div>
        {result && <p className="pb-count pb-narrow">{countLine}</p>}

        <button type="button" className="pb-how-btn" aria-haspopup="dialog" aria-expanded={layer} onClick={() => setParam('layer', 'how')}>
          How do we know?
        </button>
      </section>

      <Layer open={layer} onClose={() => setParam('layer', undefined)}>
        <SpikeHow result={result} decision={decision} status={result ? act.status : undefined} />
      </Layer>
    </>
  )
}

// ------------------------------------------------------------------ "How do we know?"
interface EvidenceRow {
  field: number
  expert_spiky_pct: number
  pred_spiky_pct: number
}

function SpikeHow({ result, decision, status }: { result: SpikeResult | null; decision: ReturnType<typeof spike.act> | null; status?: Status }) {
  const [rows, setRows] = useState<EvidenceRow[] | null>(null)
  const [table, setTable] = useState<number[][] | null>(null)
  useEffect(() => {
    let live = true
    spike.ASSETS.evidence()
      .then((e) => live && setRows((e as { fields: EvidenceRow[] }).fields))
      .catch(() => live && setRows([]))
    spike.ASSETS.confusion()
      .then((c) => live && setTable((c as { main_end_to_end_matched: number[][] }).main_end_to_end_matched))
      .catch(() => live && setTable([]))
    return () => {
      live = false
    }
  }, [])
  const row = spike.FIELDS.find((f) => f.field === 96)!
  const modelPct = result?.metrics.spikyPct ?? row.modelSpikyPct
  const expertPct = result?.expert?.spikyPct ?? row.expertSpikyPct
  const adv = result?.metrics.advancedPct ?? 37.7358
  const a0 = spike.DEFAULT_BASELINES.model.advancedPct
  const xy = (v: number) => 30 + (v / 100) * 220
  const names = ['Disc', 'Spiky 1', 'Spiky 2', 'Spiky 3', 'Spiky 4', 'Cup']
  return (
    <div className="pb-how-body">
      <section>
        <h3>The photo</h3>
        <p>{spike.HONESTY.heldOut}</p>
        <p>
          On this photo the expert counted {pct1(expertPct)}% spiky cells; the model counted {pct1(modelPct)}%.
          {result && result.source === 'live' ? ` This run took ${Math.round(result.timing.total.ms)} ms on ${result.timing.total.backend === 'webgpu' ? 'the graphics chip' : 'the processor'}, in this browser.` : ''}
          {result && result.source === 'precomputed' ? ` Shown from stored outputs, ${spike.HONESTY.precomputed}.` : ''}
        </p>
      </section>

      <section>
        <h3>Over 152 photos it never saw</h3>
        <p>Its count follows the expert's (r 0.933) and misses by 4.57 points on average. Cell outlines F1 0.948; spiky-or-not balanced accuracy 0.888.</p>
        <figure className="pb-scatter">
          <svg viewBox="0 0 270 280" role="img" aria-label="Scatter of 152 held-out photos: the expert's spiky percentage against the model's">
            <rect x="30" y="20" width="220" height="220" fill="#FAF8F4" stroke="#CFC9BE" />
            <line x1="30" y1="240" x2="250" y2="20" stroke="#1D1B19" strokeWidth="1" />
            {(rows ?? []).map((r) => (
              <circle key={r.field} cx={xy(r.expert_spiky_pct)} cy={270 - 10 - xy(r.pred_spiky_pct)} r={r.field === 96 ? 5 : 2.6} fill={r.field === 96 ? 'none' : PENCIL} fillOpacity="0.75" stroke={r.field === 96 ? '#1D1B19' : 'none'} strokeWidth="1.5" />
            ))}
            {[0, 50, 100].map((v) => (
              <g key={v} className="pb-axis">
                <text x={xy(v)} y="256" textAnchor="middle" data-qa="tick">
                  {v}
                </text>
                <text x="24" y={270 - 10 - xy(v) + 4} textAnchor="end" data-qa="tick">
                  {v}
                </text>
              </g>
            ))}
            <text className="pb-axis" x="140" y="274" textAnchor="middle" data-qa="tick">
              expert count, % spiky
            </text>
          </svg>
          <figcaption>Each dot is one photo: across, the expert's count; up, the model's. On the line they agree. The ring is this photo.</figcaption>
        </figure>
        {table && table.length === 6 && (
          <figure className="pb-table">
            <table>
              <caption>Each cell's shape: the expert's call (rows) against the model's (columns), in cells.</caption>
              <thead>
                <tr>
                  <td />
                  {names.map((nm) => (
                    <th key={nm} scope="col">
                      {nm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => {
                  const sum = r.reduce((a, b) => a + b, 0) || 1
                  return (
                    <tr key={names[i]}>
                      <th scope="row">{names[i]}</th>
                      {r.map((v, j) => (
                        <td key={j} style={{ background: `rgb(33 72 240 / ${(0.85 * v) / sum})`, color: v / sum > 0.5 ? '#FAF8F4' : '#1D1B19' }}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </figure>
        )}
      </section>

      <section>
        <h3>Why the crew medic</h3>
        <p>
          Advanced cells (grades 2 to 4) are {pct1(adv)}%, over the trigger of {pct1(a0 + spike.ACT_MARGIN_PP)}%: your own preflight {pct1(a0)}% plus our {spike.ACT_MARGIN_PP}-point margin.
        </p>
        <p>{spike.HONESTY.ourRule}</p>
        <StatusLadder current={status} />
        <p>The two top steps are greyed and never fired by the model. {spike.HONESTY.noCure}.</p>
        {decision && <p className="pb-src">Sources for this step: {decision.sources.map((s) => s.label).join('; ')}.</p>}
      </section>

      <section>
        <h3>The mission line</h3>
        <p>Preflight 5.2%, Day 30 14.8%, Day 60 44.7%, Day 90 58.5%.</p>
        <p>
          {spike.HONESTY.timeline}. {spike.HONESTY.oneFieldOneSample}
        </p>
      </section>

      <section>
        <h3>What this is not</h3>
        <p>{spike.HONESTY.data}</p>
        <p>{spike.HONESTY.notDiagnosis}</p>
        <p>It over-calls a few cells on healthy blood (5.2% where the expert saw 0%), which is why the comparison is your own preflight sample.</p>
      </section>

      <section>
        <h3>Skylab</h3>
        <p>On Skylab, NASA counted spiky red cells by hand on an electron microscope: under 1% before flight, up to about 7% late in flight. A different microscope and preparation, so the two are never drawn on one axis.</p>
        <p className="pb-src">Kimzey 1975, Skylab M115 (NTRS 19750006315).</p>
      </section>

      <section>
        <h3>The models</h3>
        <p>Two networks run in this browser, with no server: a 12 MB outliner and a 34 MB grader. A phone shows stored outputs from the same two models, marked REPLAY.</p>
        <p className="pb-src">
          Data: RedTell, Sadafi et al. 2023, CC BY 4.0. Models fine-tuned from MobileNetV4 (Qin et al. 2024; timm weights, Apache-2.0). Runtime: onnxruntime-web (MIT). Built with AI assistance (Claude).
        </p>
      </section>
    </div>
  )
}

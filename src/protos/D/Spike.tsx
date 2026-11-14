// The blood check. One press runs the real outliner and grader (laptop) or the stored result (phone, or on
// any failure); the outlines then draw on the photo in the model's own cell order and the number counts with them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { ArrowLeft } from '@phosphor-icons/react'
import * as spike from '../../engine/spikecount'
import type { SpikeActDecision, SpikeResult, TimelineStep } from '../../engine/spikecount'
import { byId, hrefOf, type Level } from './data'
import { fitWord, isPhone, prefersReducedMotion, useViewport } from './fit'
import { DRAW_MS, Field, FitWord, HowLayer, Mark, STEP_MS, type FieldApi } from './pieces'
import type { ViewProps, ViewState } from './index'

const SAMPLE = 'field-96'
const CHECK = byId('spikecount')!
const COMPARE_AT = 180 // ms after the last outline closes
const ACT_AT = 480
const END_AT = 600

/** The site's status word and the one action, for the engine's tier (words from the SpikeCount card and act.ts). */
function actFor(d: SpikeActDecision): { level: Level; who: string; action: string } {
  if (d.tier >= 2) return { level: 'medic', who: 'Crew medic', action: 'run the blood tests for red-cell breakdown.' }
  if (d.tier === 1) return { level: 'you', who: 'You', action: 're-sample tomorrow with clean prep.' }
  return { level: 'you', who: 'You', action: 'log the trend; nothing else.' }
}

const isSpiky = (cls: number) => cls >= 1 && cls <= 4
const drawEnd = (n: number) => Math.max(0, n - 1) * STEP_MS + DRAW_MS
const closedAt = (t: number, n: number) => Math.min(n, Math.max(0, Math.floor((t - DRAW_MS) / STEP_MS) + 1))

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => {
        window.clearTimeout(id)
        resolve(v)
      },
      (e) => {
        window.clearTimeout(id)
        reject(e)
      },
    )
  })
}

export function Spike({ params, fonts, onStatus }: ViewProps) {
  const { desktop, u, vw } = useViewport()
  const reduced = prefersReducedMotion()
  const want = params.get('state')
  const pinRaw = params.get('t')
  const pinned = pinRaw !== null && Number.isFinite(Number(pinRaw)) ? Math.max(0, Number(pinRaw)) : null
  const phone = useMemo(() => isPhone(), [])

  const [status, setStatus] = useState<ViewState>('idle')
  const [booted, setBooted] = useState(false)
  const [result, setResult] = useState<SpikeResult | null>(null)
  const [mode, setMode] = useState<'LIVE' | 'REPLAY'>(phone || pinned !== null ? 'REPLAY' : 'LIVE')
  const [stageText, setStageText] = useState('Starting the models…')
  const [t, setT] = useState<number | null>(0)
  const [closed, setClosed] = useState(0)
  const [beat, setBeat] = useState(0) // 0 outlines, 1 + comparison, 2 + who acts
  const [imageDone, setImageDone] = useState(false)
  const [how, setHow] = useState(false)
  const [mission, setMission] = useState<{ field: number; result: SpikeResult } | null>(null)
  const [shut, setShut] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  const api = useRef<FieldApi>(null)
  const raf = useRef(0)
  const current = useRef<Promise<void> | null>(null)
  const alive = useRef(true)
  const warm = useRef<Promise<void> | null>(null)
  const warmState = useRef<'no' | 'going' | 'ok' | 'failed'>('no')
  const [warmUi, setWarmUi] = useState<'going' | 'ok' | 'failed'>('going')
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const stored = useRef<Promise<SpikeResult> | null>(null)
  const runNo = useRef(0)
  const isSettled = useRef(false)
  const liveLater = useRef<SpikeResult | null>(null)

  const onProgress = useCallback((p: { stage: string }) => {
    if (warmState.current !== 'going') return
    setStageText(p.stage === 'outliner' ? 'Loading the outliner…' : p.stage === 'grader' ? 'Loading the grader…' : 'Starting the models…')
  }, [])

  /** Entering the check loads both models and runs them once on another photo, so the press itself is quick. */
  const startWarm = useCallback(() => {
    if (!warm.current) {
      warmState.current = 'going'
      warm.current = spike
        .load(onProgress)
        .then(() => spike.analyze('field-184'))
        .then(
          () => {
            warmState.current = 'ok'
            if (alive.current) setWarmUi('ok')
          },
          () => {
            warmState.current = 'failed'
            if (alive.current) setWarmUi('failed')
          },
        )
    }
    return warm.current
  }, [onProgress])
  /** The real model on this photo; runs are queued so two never overlap on one session. */
  const analyzeLive = useCallback(() => {
    const p = chain.current.then(() => withTimeout(spike.analyze(SAMPLE), 30000))
    chain.current = p.catch(() => undefined)
    return p
  }, [])
  const storedResult = useCallback(() => {
    if (!stored.current) {
      const p = spike.replay(SAMPLE)
      stored.current = p
      p.catch(() => {
        if (stored.current === p) stored.current = null
      })
    }
    return stored.current
  }, [])

  const applyTime = useCallback((time: number, n: number) => {
    const end = drawEnd(n)
    setClosed(closedAt(time, n))
    setBeat(time >= end + ACT_AT ? 2 : time >= end + COMPARE_AT ? 1 : 0)
  }, [])

  const settle = useCallback((r: SpikeResult) => {
    setT(null)
    setClosed(r.cells.length)
    setBeat(2)
    setStatus('result')
  }, [])

  const runOnce = useCallback(
    async (opts: { settle?: boolean } = {}) => {
      const id = ++runNo.current
      cancelAnimationFrame(raf.current)
      isSettled.current = false
      liveLater.current = null
      setMission(null)
      setPicked(null)
      setStatus('running')
      setResult(null)
      setClosed(0)
      setBeat(0)
      setT(0)
      /** The live result replaces the stored one once the stored outlines have finished drawing. */
      const applyLive = (lr: SpikeResult) => {
        liveLater.current = null
        setPicked(null)
        setResult(lr)
        setClosed(lr.cells.length)
        setMode('LIVE')
      }
      let r: SpikeResult | null = null
      let live = false
      if (!phone && (opts.settle || warmState.current === 'ok')) {
        // the models are warm: the press runs them on this photo
        setStageText('Outlining and grading…')
        try {
          await withTimeout(startWarm(), 40000)
          r = await analyzeLive()
          live = true
        } catch {
          r = null // any model failure: fall back to the stored result and say REPLAY
        }
      } else if (!phone && warmState.current !== 'failed') {
        // pressed while the models are still loading: the stored outlines draw at once (REPLAY),
        // and the live result takes their place (LIVE) when the models land
        setStageText('Reading the stored result…')
        startWarm()
          .then(() => (warmState.current === 'ok' ? analyzeLive() : Promise.reject(new Error('models'))))
          .then((lr) => {
            if (!alive.current || runNo.current !== id) return
            if (isSettled.current) applyLive(lr)
            else liveLater.current = lr
          })
          .catch(() => undefined)
      } else {
        setStageText('Reading the stored result…')
      }
      if (!r) {
        try {
          r = await storedResult()
        } catch {
          r = null
        }
      }
      if (!alive.current) return
      if (!r) {
        setStatus('error')
        return
      }
      const res = r
      setResult(res)
      setMode(live ? 'LIVE' : 'REPLAY')
      const finish = () => {
        settle(res)
        isSettled.current = true
        if (liveLater.current) applyLive(liveLater.current)
      }
      if (opts.settle || reduced) return finish()
      const n = res.cells.length
      const end = drawEnd(n) + END_AT
      const t0 = performance.now()
      const tick = () => {
        const now = performance.now() - t0
        if (now >= end) return finish()
        api.current?.draw(now)
        applyTime(now, n)
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    },
    [phone, reduced, startWarm, analyzeLive, storedResult, applyTime, settle],
  )
  /** One run at a time: a second press (or a second mount in dev) joins the run that is already going. */
  const run = useCallback(
    (opts: { settle?: boolean } = {}) => {
      if (!current.current)
        current.current = runOnce(opts).finally(() => {
          current.current = null
        })
      return current.current
    },
    [runOnce],
  )

  // boot: a pinned frame (?t=), the settled result (?state=result), or the quiet idle view
  useEffect(() => {
    alive.current = true
    if (pinned !== null) {
      spike
        .replay(SAMPLE)
        .then((r) => {
          if (!alive.current) return
          const n = r.cells.length
          setResult(r)
          setMode('REPLAY')
          if (pinned >= drawEnd(n) + END_AT) settle(r)
          else {
            setT(pinned)
            applyTime(pinned, n)
            setStatus('running')
          }
        })
        .catch(() => alive.current && setStatus('error'))
        .finally(() => alive.current && setBooted(true))
    } else if (want === 'result') {
      run({ settle: true }).finally(() => alive.current && setBooted(true))
    } else {
      setBooted(true)
      storedResult().catch(() => undefined) // fetched now, so a press never waits on the network
      if (!phone) startWarm()
    }
    return () => {
      alive.current = false
      cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On a laptop the idle view counts as ready once the models are warm (or after 8 s, so a slow network never blocks it).
  const [waited, setWaited] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setWaited(true), 8000)
    return () => window.clearTimeout(id)
  }, [])
  const idleBoot = pinned === null && want !== 'result'
  const ready = fonts && booted && imageDone && (phone || !idleBoot || warmUi !== 'going' || waited)
  useEffect(() => onStatus({ ready, state: status }), [ready, status, onStatus])

  const decision = useMemo(() => (result ? spike.act(result) : null), [result])
  const act = decision ? actFor(decision) : null
  const n = result ? result.cells.length : 0
  const spikySoFar = result ? result.cells.slice(0, closed).filter((c) => isSpiky(c.cls)).length : 0
  const pct = closed > 0 ? (100 * spikySoFar) / closed : 0
  const settled = status === 'result'
  const heroText = `${pct.toFixed(1)}% spiky`
  const hasRes = result !== null && closed > 0

  // the hero number is set like the names: fitted by the width axis from the words to the edge of the sample
  const heroSize = desktop ? 88 * u : 52
  const heroTarget = desktop ? 526 * u : vw - 32 // on a laptop the phrase runs from the margin to the edge of the photo
  const heroFit = useMemo(() => (fonts ? fitWord(settled ? heroText : '00.0% spiky', 800, heroSize, heroTarget) : null), [fonts, settled, heroText, heroSize, heroTarget])

  const hero = (
    <p className={`drp-tab drp-hero drp-fit${hasRes && !(how && desktop) ? '' : ' drp-hide'}`} data-qa="answer" aria-live={settled ? 'polite' : 'off'} style={{ fontWeight: 800, fontSize: heroFit ? heroFit.size : heroSize, fontVariationSettings: `"wdth" ${heroFit ? heroFit.wdth : 100}` }}>
      {heroText}
    </p>
  )

  // the mission stepper inside "How do we know?" re-cuts the window to a stored photo
  const recut = useCallback(
    (next: { field: number; result: SpikeResult } | null) => {
      if (reduced) return setMission(next)
      setShut(true)
      window.setTimeout(() => {
        if (!alive.current) return
        setMission(next)
        setShut(false)
      }, 240)
    },
    [reduced],
  )
  const pickStep = useCallback(
    (field: number) => {
      spike
        .replay(`field-${field}`)
        .then((r) => alive.current && recut({ field, result: r }))
        .catch(() => undefined)
    },
    [recut],
  )
  const closeHow = useCallback(() => {
    setHow(false)
    if (mission) recut(null)
  }, [mission, recut])

  const fieldNo = mission ? mission.field : 96
  const cells = mission ? mission.result.cells : result ? result.cells : null
  const label = status === 'running' ? 'Grading…' : settled ? 'Grade again' : 'Grade this blood'
  // the corner tag says what the outlines on screen are; before the first press it says whether the press will be live
  const tag = mission ? 'REPLAY' : status === 'idle' && !phone && pinned === null ? (warmUi === 'ok' ? 'LIVE' : warmUi === 'failed' ? 'REPLAY' : 'Loading model') : mode

  return (
    <div className="drp-sheet drp-check drp-spike" data-shape="square" data-res={hasRes ? '1' : '0'}>
      <div className="drp-win" data-qa="hero">
        <div className="drp-stage" data-shut={shut ? '1' : '0'} data-field={fieldNo}>
          <Field
            key={fieldNo}
            url={spike.ASSETS.url(`fields/${fieldNo}.png`)}
            cells={cells}
            t={mission ? null : t}
            api={mission ? undefined : api}
            label={`${CHECK.specimen}${cells ? '' : ' (not graded yet)'}`}
            onImage={() => setImageDone(true)}
            picked={settled && !mission ? picked : null}
            onPick={settled && !mission ? setPicked : undefined}
          />
        </div>
        {settled && !mission && result && (
          <p className="drp-tab drp-celltab" data-qa="cell-note" aria-live="polite">
            {picked === null || !result.cells[picked] ? 'Press a cell to name its shape' : `Cell ${picked + 1} of ${n}: ${spike.CLASS_PLAIN[result.cells[picked].className]}`}
          </p>
        )}
        {status === 'running' && !hasRes && (
          <p className="drp-tab drp-celltab" data-qa="stage" role="status">
            {stageText}
          </p>
        )}
        <span className="drp-tab drp-tab-tr drp-tag" data-qa="mode">
          {tag}
        </span>
        {!desktop && (
          <a className="drp-back" href={hrefOf('home')}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            All six
          </a>
        )}
        {desktop && hero}
      </div>

      <div className="drp-col">
        {desktop && (
          <a className="drp-back" href={hrefOf('home')}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            All six checks
          </a>
        )}
        <FitWord as="h1" className="drp-name" text={CHECK.name} weight={800} size={desktop ? 100 * u : 64} target={desktop ? 360 * u : Math.min(250, vw - 120)} ready={fonts} />
        <p className="drp-sentence">{CHECK.sentence}</p>
        <div className="drp-bar">
          <button type="button" className="drp-btn" data-qa="primary" disabled={status === 'running'} aria-busy={status === 'running'} onClick={() => run()}>
            {label}
          </button>
          <button type="button" className="drp-link drp-how-link" aria-expanded={how} onClick={() => setHow(true)}>
            How do we know?
          </button>
        </div>
        {status === 'error' && (
          <p className="drp-err" role="alert">
            The result did not load. Check the connection, then press the button again.
          </p>
        )}
        {!desktop && hero}
        <p className={`drp-count${hasRes ? '' : ' drp-hide'}`}>
          <span>
            of {settled ? n : closed} cells outlined
          </span>
          <span className="drp-key">
            <i data-fill="1" aria-hidden="true" />
            spiky
          </span>
          <span className="drp-key">
            <i aria-hidden="true" />
            not spiky
          </span>
        </p>
        <p className={`drp-compare${hasRes && beat >= 1 ? '' : ' drp-hide'}`}>
          {decision ? decision.inputs.s0.toFixed(1) : '0.0'}% before flight<span className="drp-tag">Illustrative</span>
        </p>
        <p className={`drp-act${hasRes && beat >= 2 && act ? '' : ' drp-hide'}`} data-qa="act">
          {act && <Mark level={act.level} />}
          <b>{act ? act.who : ''}:</b> {act ? act.action : ''}
        </p>
      </div>

      <HowLayer open={how} onClose={closeHow}>
        <SpikeHow result={result} missionField={mission ? mission.field : null} onStep={pickStep} decision={decision} />
      </HowLayer>
    </div>
  )
}

// ------------------------------------------------------------------ layer two
const SHAPES = ['disc', 'spiky 1', 'spiky 2', 'spiky 3', 'spiky 4', 'cup']
interface EvidenceRow {
  field: number
  expert_spiky_pct: number
  pred_spiky_pct: number
}

function SpikeHow({ result, decision, missionField, onStep }: { result: SpikeResult | null; decision: SpikeActDecision | null; missionField: number | null; onStep: (field: number) => void }) {
  const [steps, setSteps] = useState<TimelineStep[] | null>(null)
  const [rows, setRows] = useState<EvidenceRow[] | null>(null)
  const [stored, setStored] = useState<SpikeResult | null>(null)
  const [table, setTable] = useState<number[][] | null>(null)
  useEffect(() => {
    let live = true
    spike
      .runTimeline('replay')
      .then((rs) => {
        if (!live) return
        setSteps(spike.timeline(rs))
        setStored(rs[rs.length - 1])
      })
      .catch(() => undefined)
    spike.ASSETS.evidence()
      .then((e) => live && setRows((e as { fields: EvidenceRow[] }).fields))
      .catch(() => undefined)
    spike.ASSETS.confusion()
      .then((c) => live && setTable((c as { main_end_to_end_matched: number[][] }).main_end_to_end_matched))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  const r = result ?? stored
  const d = decision ?? (stored ? spike.act(stored) : null)
  const H = spike.HONESTY
  const liveRun = result && result.source === 'live' ? result.timing.total : null
  const picked = steps?.find((s) => s.field === missionField) ?? null
  const x = scaleLinear().domain([0, 100]).range([34, 290])
  const y = scaleLinear().domain([0, 100]).range([266, 10])
  const trigger = d ? d.inputs.a0 + d.inputs.marginPp : 0

  return (
    <>
      <section>
        <h3>On this photo</h3>
        {r && r.expert ? (
          <p>
            The expert counted {r.expert.spikyPct.toFixed(1)}% spiky cells; the model counted {r.metrics.spikyPct.toFixed(1)}%. {H.heldOut}
          </p>
        ) : (
          <p>{H.heldOut}</p>
        )}
        <p className="drp-fine" data-qa="run-note">
          {liveRun ? `This run happened in your browser just now: ${(liveRun.ms / 1000).toFixed(2)} s on ${liveRun.backend === 'webgpu' ? 'WebGPU' : 'WebAssembly'}.` : `What you see here is a stored result, ${H.precomputed}.`}
        </p>
      </section>

      <section>
        <h3>On 152 photos it never saw</h3>
        <p>It lands about 4.6 points from the expert count (average miss 4.57 points, r 0.933). Cell outlines: F1 0.948. Spiky or not: balanced accuracy 0.888.</p>
        {rows && (
          <svg className="drp-scatter" viewBox="0 0 300 300" role="img" aria-label="Scatter of 152 photos: the expert's spiky percentage across, the model's up. The dots follow the diagonal.">
            <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} stroke="var(--green)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(0)} stroke="var(--green)" strokeWidth="1.5" />
            <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(100)} stroke="var(--green)" strokeWidth="1.5" />
            {rows.map((p) => (
              <circle key={p.field} cx={x(p.expert_spiky_pct)} cy={y(p.pred_spiky_pct)} r="2.6" fill="var(--green)" fillOpacity="0.5" />
            ))}
            {r && r.expert && <circle cx={x(r.expert.spikyPct)} cy={y(r.metrics.spikyPct)} r="7" fill="none" stroke="var(--green)" strokeWidth="2.5" />}
            {[0, 50, 100].map((v) => (
              <text key={`x${v}`} data-qa="tick" x={x(v)} y={282} textAnchor="middle">
                {v}%
              </text>
            ))}
            {[50, 100].map((v) => (
              <text key={`y${v}`} data-qa="tick" x={28} y={y(v) + 4} textAnchor="end">
                {v}%
              </text>
            ))}
            <text x={x(100)} y={297} textAnchor="end">
              expert count
            </text>
            <text x={x(0) + 6} y={y(100) + 4}>
              model count
            </text>
          </svg>
        )}
        <p className="drp-fine">Each dot is one photo. The ring is this one.</p>
        {table && (
          <table className="drp-table">
            <caption>Cell by cell: the expert's shape (rows) against the model's (columns)</caption>
            <thead>
              <tr>
                <td />
                {SHAPES.map((n) => (
                  <th key={n} scope="col">
                    {n.replace('spiky ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={SHAPES[i]}>
                  <th scope="row">{SHAPES[i]}</th>
                  {row.map((v, j) => (
                    <td key={j} data-hit={i === j ? '1' : '0'}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {d && (
        <section>
          <h3>{d.tier >= 2 ? 'Why the crew medic' : 'Why you'}</h3>
          {d.tier >= 2 && d.inputs.advancedPct >= trigger ? (
            <p>
              Advanced cells (grades 2-4) are {d.inputs.advancedPct.toFixed(1)}%, over the trigger of {trigger.toFixed(1)}% (own preflight {d.inputs.a0.toFixed(1)}% plus our {d.inputs.marginPp}-point margin).
            </p>
          ) : (
            <p>
              Spiky cells are {d.inputs.spikyPct.toFixed(1)}% against a trigger of {(d.inputs.s0 + d.inputs.marginPp).toFixed(1)}% (own preflight {d.inputs.s0.toFixed(1)}% plus our {d.inputs.marginPp}-point margin).
            </p>
          )}
          <p className="drp-fine">{H.ourRule}</p>
        </section>
      )}

      <section>
        <h3>The mission, step by step</h3>
        <p className="drp-fine">{H.timeline}. {H.oneFieldOneSample}</p>
        <div className="drp-steps" role="group" aria-label="Mission step shown in the window">
          {spike.TIMELINE.map((s) => {
            const row = spike.FIELDS.find((f) => f.field === s.field)
            return (
              <button key={s.field} type="button" className="drp-step" aria-pressed={missionField === s.field} onClick={() => onStep(s.field)}>
                {s.label}
                <span>{row ? `${row.modelSpikyPct.toFixed(1)}%` : ''}</span>
              </button>
            )
          })}
        </div>
        <p data-qa="step-note">
          {picked
            ? `${picked.label}: ${picked.metrics.spikyPct.toFixed(1)}% spiky of ${picked.metrics.n} cells. ${actFor(picked.decision).who} ${actFor(picked.decision).who === 'You' ? 'act' : 'acts'}. The window shows this stored photo.`
            : 'Press a step: the window re-cuts to that stored photo. Each step is compared with your own preflight sample, never a fixed number.'}
        </p>
      </section>

      <section>
        <h3>Who acts</h3>
        <ul className="drp-ladder">
          <li>
            <Mark level="you" colour="var(--green)" />
            <span>
              <b>You:</b> log the trend, or re-sample tomorrow with clean prep.
            </span>
          </li>
          <li>
            <Mark level="medic" colour="var(--green)" />
            <span>
              <b>Crew medic:</b> run the blood tests for red-cell breakdown.
            </span>
          </li>
          <li data-off="1">
            <Mark level="surgeon" colour="var(--green)" />
            <span>
              <b>Flight surgeon:</b> protect the landing. Decided from the medic&rsquo;s lab results, never from a photo.
            </span>
          </li>
          <li data-off="1">
            <Mark level="abort" colour="var(--green)" />
            <span>
              <b>Abort:</b> early return. Never fired by the model.
            </span>
          </li>
        </ul>
        <p className="drp-fine">
          {H.noCure}.{d ? ` Sources: ${d.sources.map((s) => s.label).join(', ')}.` : ''}
        </p>
      </section>

      <section>
        <h3>What this is not</h3>
        <p>{H.data}</p>
        <p>{H.notDiagnosis}</p>
        <p className="drp-fine">It over-calls a few cells on healthy blood (5.2% where the expert saw 0%), which is why the comparison is your own preflight sample.</p>
        <p className="drp-fine">On Skylab these cells were counted by hand on an electron microscope: under 1% before flight, up to about 7% late in flight. A different microscope, so the two are never drawn on one axis.</p>
      </section>

      <section>
        <h3>Inside</h3>
        <p className="drp-fine">Two models run in your browser: a 12 MB outliner and a 34 MB grader. Data: RedTell (Sadafi et al. 2023, CC BY 4.0). Model design: MobileNetV4, weights from timm (Apache-2.0). Runtime: onnxruntime-web (MIT).</p>
      </section>
    </>
  )
}

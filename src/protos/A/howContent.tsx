// Prototype A "Viewbox": what sits behind "How do we know?". Evidence and honesty strings come from the engine.
import { useEffect, useState } from 'react'
import * as spike from '../../engine/spikecount'
import { CHECKS, SPIKE, STATUS_LADDER, STATUS_WORD } from './content'
import { Mark, Tag } from './parts'

const f1 = (x: number) => x.toFixed(1)

interface EvidenceRow {
  field: number
  expert_spiky_pct: number
  pred_spiky_pct: number
}

/** The 152 held-out photos: the expert's spiky % against the model's. One dot is one photo. */
function Scatter({ rows, mark }: { rows: EvidenceRow[]; mark: number | null }) {
  const S = 300
  const m = { l: 40, r: 12, t: 12, b: 38 }
  const w = S - m.l - m.r
  const h = S - m.t - m.b
  const x = (v: number) => m.l + (v / 100) * w
  const y = (v: number) => m.t + h - (v / 100) * h
  const here = rows.find((r) => r.field === mark)
  return (
    <svg className="vb-chart" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Scatter of 152 photos: the expert's spiky percentage against the model's. The dots follow the diagonal.">
      <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} className="vb-chart-diag" />
      <path d={`M${x(0)},${y(100)}V${y(0)}H${x(100)}`} className="vb-chart-axis" />
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <text data-qa="tick" x={x(v)} y={y(0) + 16} textAnchor="middle" className="vb-chart-tick">{v}</text>
          <text data-qa="tick" x={x(0) - 8} y={y(v) + 4} textAnchor="end" className="vb-chart-tick">{v}</text>
        </g>
      ))}
      <text x={x(50)} y={S - 4} textAnchor="middle" className="vb-chart-label">expert count, % spiky</text>
      <text transform={`translate(11 ${y(50)}) rotate(-90)`} textAnchor="middle" className="vb-chart-label">model, % spiky</text>
      {rows.map((r) => (
        <circle key={r.field} cx={x(r.expert_spiky_pct)} cy={y(r.pred_spiky_pct)} r="2.6" className="vb-chart-dot" />
      ))}
      {here ? <circle cx={x(here.expert_spiky_pct)} cy={y(here.pred_spiky_pct)} r="6.5" className="vb-chart-here" /> : null}
    </svg>
  )
}

export function HowSpike({ res, live, onStep }: { res: spike.SpikeResult; live: boolean; onStep?: (field: number, label: string) => void }) {
  const d = spike.act(res)
  const [rows, setRows] = useState<EvidenceRow[] | null>(null)
  const [steps, setSteps] = useState<spike.TimelineStep[] | null>(null)
  const [step, setStep] = useState(3)
  useEffect(() => {
    let off = false
    spike.ASSETS.evidence()
      .then((e) => !off && setRows((e as { fields: EvidenceRow[] }).fields))
      .catch(() => !off && setRows([]))
    spike
      .runTimeline('replay')
      .then((r) => !off && setSteps(spike.timeline(r)))
      .catch(() => !off && setSteps([]))
    return () => {
      off = true
    }
  }, [])
  const trigger = d.inputs.a0 + d.inputs.marginPp
  const cur = steps?.[step]
  return (
    <div className="vb-how-list">
      <section>
        <h3>This photo</h3>
        <p>{spike.HONESTY.heldOut}</p>
        {res.expert ? (
          <p>
            On this photo the expert counted {f1(res.expert.spikyPct)}% spiky cells; the model counted {f1(res.metrics.spikyPct)}%.
          </p>
        ) : null}
        <p>{live ? `This run: both models ran in this browser in ${Math.round(res.timing.total.ms)} ms.` : `Shown from stored outputs: ${spike.HONESTY.precomputed}.`}</p>
      </section>

      <section>
        <h3>Tested on 152 photos it never saw</h3>
        <p>Its spiky percentage follows the expert’s (r 0.933), with an average miss of 4.57 points. Cell outlines: F1 0.948. Spiky or not, cell by cell: balanced accuracy 0.888.</p>
        {rows === null ? <p className="vb-quiet">Loading the 152 photos.</p> : rows.length ? <Scatter rows={rows} mark={res.field} /> : <p className="vb-quiet">The chart data did not load.</p>}
        {rows?.length ? <p className="vb-quiet">One dot is one photo. The ring is the photo on screen.</p> : null}
      </section>

      <section>
        <h3>Why the {STATUS_WORD[SPIKE.who[Math.min(d.tier, 2)]].toLowerCase()}</h3>
        <p>
          Advanced cells (grades 2 to 4) are {f1(d.inputs.advancedPct)}% of this photo. The trigger is {f1(trigger)}%: your own preflight sample ({f1(d.inputs.a0)}%) plus our {d.inputs.marginPp}-point margin.
        </p>
        <p>{spike.HONESTY.ourRule}</p>
      </section>

      <section>
        <h3>
          A mission in four samples <Tag>Illustrative</Tag>
        </h3>
        {steps === null ? (
          <p className="vb-quiet">Loading the four samples.</p>
        ) : steps.length ? (
          <>
            <div className="vb-steps" role="group" aria-label="Mission samples">
              {steps.map((s, i) => (
                <button key={s.label} type="button" className="vb-step" aria-pressed={i === step} onClick={() => {
                    setStep(i)
                    onStep?.(s.field, s.label)
                  }}
                >
                  <span className="vb-step-bar" style={{ height: `${Math.max(3, s.metrics.spikyPct * 0.7)}px` }} />
                  {s.label}
                </button>
              ))}
            </div>
            {cur ? (
              <p className="vb-step-read" aria-live="polite">
                <b>{f1(cur.metrics.spikyPct)}% spiky</b> at {cur.label.toLowerCase()}. <Mark kind={SPIKE.who[Math.min(cur.decision.tier, 2)]} /> {STATUS_WORD[SPIKE.who[Math.min(cur.decision.tier, 2)]]}: {SPIKE.act[Math.min(cur.decision.tier, 2)]}
              </p>
            ) : null}
          </>
        ) : (
          <p className="vb-quiet">The four samples did not load.</p>
        )}
        <p className="vb-quiet">
          Press a sample to hang its photo on the film. {spike.HONESTY.timeline}. {spike.HONESTY.oneFieldOneSample}
        </p>
      </section>

      <section>
        <h3>What happens next</h3>
        <ul>
          {d.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <ul className="vb-greyed">
          {d.nextSteps.map((n) => (
            <li key={n.tier}>
              {n.tierName}: {n.headline}
            </li>
          ))}
        </ul>
        <p className="vb-quiet">The two greyed steps are never fired by the model. {spike.HONESTY.noCure}.</p>
        <p className="vb-quiet">Sources: {d.sources.map((s) => s.label).join('; ')}.</p>
      </section>

      <section>
        <h3>What this is not</h3>
        <p>{spike.HONESTY.data}</p>
        <p>{spike.HONESTY.notDiagnosis}</p>
      </section>

      <section>
        <h3>Skylab counted these by hand</h3>
        <p>On Skylab, NASA counted spiky red cells by hand on an electron microscope: under 1% before flight, up to about 7% late in flight. That was a different microscope and method, so those numbers sit beside ours and never on one axis.</p>
      </section>

      <section>
        <h3>Where it misses</h3>
        <p>It over-calls a few cells on healthy blood: {f1(spike.DEFAULT_BASELINES.model.spikyPct)}% where the expert saw 0%. That is why the comparison is your own preflight sample, not a fixed limit.</p>
      </section>

      <section>
        <h3>The models</h3>
        <p>Two models run in the browser, with no server: a 12 MB outliner and a 34 MB grader. On a phone the stored outputs are shown, marked REPLAY.</p>
        <p className="vb-quiet">Credits: RedTell (Sadafi et al. 2023, CC BY 4.0); MobileNetV4 (Qin et al. 2024) with timm weights (Apache-2.0); onnxruntime-web (MIT).</p>
      </section>
    </div>
  )
}

export function HowHome() {
  return (
    <div className="vb-how-list">
      <section>
        <h3>
          The crew state <Tag>Illustrative</Tag>
        </h3>
        <p>The crew state on this page is a scripted demo: five checks quiet, one asking. Every specimen is real research data, never astronaut data.</p>
      </section>
      <section>
        <h3>The six checks</h3>
        <ul className="vb-proofs">
          {CHECKS.map((c) => (
            <li key={c.id}>
              <b>{c.name}.</b> {c.proof}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Where it runs</h3>
        <p>The models run in your browser, with no server. On a phone four checks show stored outputs, marked REPLAY.</p>
      </section>
      <section>
        <h3>The four status words</h3>
        <ul className="vb-ladder">
          {STATUS_LADDER.map((s) => (
            <li key={s.kind} data-kind={s.kind}>
              <Mark kind={s.kind} /> <b>{STATUS_WORD[s.kind]}.</b> {s.text}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>The blood photo</h3>
        <p>{spike.HONESTY.data}</p>
      </section>
      <section>
        <h3>Credits and AI use</h3>
        <p className="vb-quiet">This site was built with an AI coding assistant (Claude). Every dataset, library and font is credited with its licence in the project’s credits file.</p>
      </section>
    </div>
  )
}

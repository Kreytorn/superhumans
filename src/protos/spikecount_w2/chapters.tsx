// The scroll story below the first screen: the problem (with real cells and a drawn 3D cell), Skylab as history,
// an illustrative four-sample mission (stored outputs of our models), then the two networks and how well they did.
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { replay, HONESTY, type SpikeResult } from '../../engine/spikecount'
import { COLOURS, SHORT } from './palette'

const Cell3D = lazy(() => import('./cell3d'))
const BASE = import.meta.env.BASE_URL
const A = (p: string) => `${BASE}spikecount/${p}`

interface StripJson {
  cells: { file: string; class_name: string; severity: number }[]
}
interface TimelineJson {
  label: string
  steps: { label: string; field: number; image: string; model: { n: number; spiky_pct: number; tier: number; tier_name: string } }[]
}
interface GalleryJson {
  classes: Record<string, { file: string }[]>
}
interface EvidenceJson {
  headline: { field_spiky_r: number; field_spiky_mae_pp: number; outliner_f1_iou50: number; spiky_vs_not_balanced_acc: number }
  fields: { expert_spiky_pct: number; pred_spiky_pct: number }[]
}

function useJson<T>(url: string): T | null {
  const [v, setV] = useState<T | null>(null)
  useEffect(() => {
    let on = true
    fetch(url)
      .then((r) => r.json() as Promise<T>)
      .then((j) => on && setV(j))
      .catch(() => {})
    return () => {
      on = false
    }
  }, [url])
  return v
}

// Content is always visible (a presenter may jump anywhere); it only fades up once on first paint.
const Reveal = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
  <div className={`scw2-rv ${className ?? ''}`} style={{ animationDelay: `${delay}s` }}>
    {children}
  </div>
)

function Outlined({ r, mono }: { r: SpikeResult; mono?: boolean }) {
  return (
    <svg viewBox={`0 0 ${r.width} ${r.height}`} aria-hidden="true">
      {r.cells.map((c) => (
        <polygon
          key={c.id}
          points={c.polygon.map((q) => `${q[0]},${q[1]}`).join(' ')}
          fill={mono ? 'none' : COLOURS[c.cls]}
          fillOpacity={c.cls >= 1 && c.cls <= 4 ? 0.32 : 0.12}
          stroke={mono ? '#eaf6ff' : COLOURS[c.cls]}
          strokeWidth={mono ? 1.6 : 2}
          strokeDasharray={c.border ? '5 4' : undefined}
        />
      ))}
    </svg>
  )
}

export function Chapters() {
  const strip = useJson<StripJson>(A('strip.json'))
  const tl = useJson<TimelineJson>(A('timeline.json'))
  const gal = useJson<GalleryJson>(A('gallery.json'))
  const ev = useJson<EvidenceJson>(A('evidence.json'))
  const [mission, setMission] = useState<Record<number, SpikeResult>>({})

  useEffect(() => {
    if (!tl) return
    let on = true
    Promise.all(tl.steps.map((s) => replay(`field-${s.field}`).catch(() => null))).then((rs) => {
      if (!on) return
      const m: Record<number, SpikeResult> = {}
      rs.forEach((r, i) => r && (m[tl.steps[i].field] = r))
      setMission(m)
    })
    return () => {
      on = false
    }
  }, [tl])

  const stripCells = strip ? strip.cells.filter((_, i) => i % 4 === 0 || i === strip.cells.length - 1) : []
  const r96 = mission[96]

  return (
    <div className="scw2-story" id="scw2-story">
      {/* 1 the problem */}
      <section className="scw2-ch scw2-ch-problem">
        <div className="scw2-ch-bg" style={{ backgroundImage: `url(${A('fields/96.png')})` }} aria-hidden="true" />
        <Reveal className="scw2-ch-num">01 · The problem</Reveal>
        <div className="scw2-problem">
          <Reveal className="scw2-problem-txt">
            <h2>
              In orbit, the body destroys <b>54%</b> more red blood cells.
            </h2>
            <p className="scw2-src">Trudel et al. 2022, Nature Medicine</p>
            <p className="scw2-lede">
              Some red cells also change shape. The smooth disc puckers, then grows spikes, until it is a ball of fine thorns. Under a microscope that shape can be
              counted.
            </p>
            <p className="scw2-quiet">{HONESTY.noCure} (Trudel 2022; Ottawa Hospital 2022).</p>
          </Reveal>
          <Reveal className="scw2-cell3d" delay={0.15}>
            <Suspense fallback={<div className="scw2-cell3d-wait" />}>
              <Cell3D />
            </Suspense>
          </Reveal>
        </div>

        <Reveal className="scw2-strip-wrap">
          <div className="scw2-strip-head">
            <span>Real cells, sorted from smooth disc to ball of spikes</span>
            <span>{HONESTY.gaugeLabel}</span>
          </div>
          <div className="scw2-strip" role="list">
            {stripCells.map((c, i) => (
              <figure key={c.file} role="listitem" style={{ ['--i' as string]: i }}>
                <img src={A(c.file)} alt={`${c.class_name} cell`} />
                <figcaption>{c.severity.toFixed(1)}</figcaption>
              </figure>
            ))}
          </div>
          <div className="scw2-strip-axis" aria-hidden="true">
            <i />
          </div>
          <p className="scw2-cap">Expert-outlined cells from the RedTell lab-blood set: examples of the shapes, not live output.</p>
        </Reveal>
      </section>

      {/* 2 Skylab, as history only */}
      <section className="scw2-ch scw2-ch-sky">
        <Reveal className="scw2-sky">
          <span className="scw2-sky-year">1973</span>
          <div>
            <span className="scw2-ch-num">02 · It has been seen before</span>
            <h2>On Skylab, NASA counted these cells by hand.</h2>
            <p className="scw2-lede">
              On an electron microscope: under 1% before flight, up to about 7% late in flight, and back under 1% within hours of landing.
            </p>
            <p className="scw2-src">Kimzey 1975, Skylab M115 (NTRS 19750006315). History only: a different microscope and preparation, never compared with our numbers.</p>
            <p className="scw2-sky-now">This counts them in the browser.</p>
          </div>
        </Reveal>
      </section>

      {/* 3 an illustrative mission */}
      <section className="scw2-ch scw2-ch-mission">
        <Reveal className="scw2-ch-num">03 · A mission, four blood samples</Reveal>
        <Reveal>
          <h2 className="scw2-h2">Same check, every month. The tier moves when the shapes do.</h2>
        </Reveal>
        <div className="scw2-mission">
          {tl?.steps.map((s, i) => {
            const r = mission[s.field]
            return (
              <Reveal key={s.field} className={`scw2-ms tier-${s.model.tier}`} delay={i * 0.1}>
                <div className="scw2-ms-img">
                  <img src={A(s.image)} alt={`${s.label}: microscope field ${s.field}`} />
                  {r && <Outlined r={r} />}
                </div>
                <div className="scw2-ms-meta">
                  <span className="scw2-ms-day">{s.label}</span>
                  <span className="scw2-ms-pct">
                    {s.model.spiky_pct.toFixed(1)}
                    <small>% spiky</small>
                  </span>
                  <span className="scw2-ms-tier">{s.model.tier_name}</span>
                </div>
              </Reveal>
            )
          })}
        </div>
        <p className="scw2-cap center">
          {tl?.label ?? HONESTY.timeline}. {HONESTY.oneFieldOneSample} Stored outputs of our models ({HONESTY.precomputed}).
        </p>
      </section>

      {/* 4 the work behind it */}
      <section className="scw2-ch scw2-ch-work">
        <Reveal className="scw2-ch-num">04 · The work behind it</Reveal>
        <Reveal>
          <h2 className="scw2-h2">Two small networks, one after the other.</h2>
        </Reveal>
        <div className="scw2-pipe">
          <Reveal className="scw2-pipe-step">
            <div className="scw2-pipe-img">
              <img src={A('fields/96.png')} alt="The input photo" />
            </div>
            <span className="scw2-pipe-k">Input</span>
            <h3>One grey photo</h3>
            <p>572 x 572 pixels, x100 light microscope.</p>
          </Reveal>
          <Reveal className="scw2-pipe-step" delay={0.1}>
            <div className="scw2-pipe-img">
              <img src={A('fields/96.png')} alt="" className="dim" />
              {r96 && <Outlined r={r96} mono />}
            </div>
            <span className="scw2-pipe-k">Outliner · 12 MB</span>
            <h3>Draws every cell's edge</h3>
            <p>A U-Net built on MobileNetV4.</p>
          </Reveal>
          <Reveal className="scw2-pipe-step" delay={0.2}>
            <div className="scw2-pipe-gal">
              {gal &&
                ['Disc', 'E1', 'E2', 'E3', 'E4', 'Cup'].map((k, ci) => (
                  <div key={k} className="scw2-gal-col">
                    {(gal.classes[k] ?? []).slice(0, 3).map((g) => (
                      <img key={g.file} src={A(g.file)} alt={`${SHORT[ci]} example`} style={{ outlineColor: COLOURS[ci] }} />
                    ))}
                    <span style={{ color: COLOURS[ci] }}>{SHORT[ci]}</span>
                  </div>
                ))}
            </div>
            <span className="scw2-pipe-k">Grader · 34 MB</span>
            <h3>Names each cell's shape</h3>
            <p>Six shapes: disc, spiky grades 1 to 4, cup.</p>
          </Reveal>
        </div>

        {ev && (
          <div className="scw2-proof">
            <Reveal className="scw2-proof-nums">
              <span className="scw2-ch-num">On 152 photos it never saw</span>
              <div className="scw2-stat">
                <b>{ev.headline.field_spiky_mae_pp.toFixed(2)}</b>
                <span>points: the average miss on a photo's spiky %</span>
              </div>
              <div className="scw2-stat">
                <b>{ev.headline.field_spiky_r.toFixed(3)}</b>
                <span>correlation with the expert count</span>
              </div>
              <div className="scw2-stat">
                <b>{ev.headline.outliner_f1_iou50.toFixed(3)}</b>
                <span>outline match with the experts (F1)</span>
              </div>
            </Reveal>
            <Reveal className="scw2-scatter" delay={0.1}>
              <svg viewBox="0 0 320 320" role="img" aria-label="Expert spiky percent against model spiky percent, 152 held-out photos">
                {[0, 25, 50, 75, 100].map((v) => (
                  <g key={v}>
                    <line x1={40 + v * 2.6} x2={40 + v * 2.6} y1={20} y2={280} className="grid" />
                    <line x1={40} x2={300} y1={280 - v * 2.6} y2={280 - v * 2.6} className="grid" />
                    <text x={40 + v * 2.6} y={298} data-qa="tick" textAnchor="middle">
                      {v}
                    </text>
                    <text x={32} y={284 - v * 2.6} data-qa="tick" textAnchor="end">
                      {v}
                    </text>
                  </g>
                ))}
                <line x1={40} y1={280} x2={300} y2={20} className="diag" />
                {ev.fields.map((f, i) => (
                  <circle key={i} cx={40 + f.expert_spiky_pct * 2.6} cy={280 - f.pred_spiky_pct * 2.6} r={3.6} />
                ))}
                <text x={170} y={316} textAnchor="middle" className="axis">
                  expert spiky %
                </text>
                <text x={10} y={150} textAnchor="middle" className="axis" transform="rotate(-90 10 150)">
                  model spiky %
                </text>
              </svg>
            </Reveal>
          </div>
        )}

        <div className="scw2-honest">
          <p>{HONESTY.data}</p>
          <p>{HONESTY.notDiagnosis}</p>
          <p>{HONESTY.ourRule}</p>
          <p className="scw2-credits">
            Data: RedTell, Sadafi et al. 2023, Front Physiol (CC BY 4.0). Models: MobileNetV4 (Qin et al. 2024) with timm weights (Apache-2.0), segmentation_models_pytorch
            (MIT), run by onnxruntime-web (MIT). 3D cell: drawn in code (AI-generated illustration). Built with AI help, disclosed.
          </p>
        </div>
      </section>
    </div>
  )
}

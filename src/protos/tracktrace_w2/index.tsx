// TrackTrace, free version w2 ("museum wall"): the working check on the first screen, then a walk-through wall of
// real specimens, a 3D nucleus, the repair data and how IonScan reads. Every result on screen comes from the engine.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource-variable/big-shoulders'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as tt from '../../engine/tracktrace'
import type { NucleusResult, TrackTraceAct, WellResult } from '../../engine/tracktrace'
import TrackTraceMoment, { type MomentBeat, type MomentState, type TrackTraceMomentHandle } from './moment'
import Nucleus3D from './Nucleus3D'
import Scans from './Scans'
import Story from './Story'
import { N, paintNucleus } from './paint'
import './w2.css'

const SENTENCE = "IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion's path."
const HERO = 'nucleus-238'
const PICKS = ['nucleus-238', 'nucleus-239', 'nucleus-241', 'nucleus-240', 'nucleus-242']
const PARTICLE_WORD = ['no radiation', 'X-rays', 'iron ion']
const BASE = import.meta.env.BASE_URL

interface Summary {
  headline: { test_mice: number; test_nuclei: number; foci_count_spearman_vs_nasa: number; foci_f1: number; sample_verdict: { particle: number; n_wells: number } }
  repair_curve: { hours: number[]; fe_0_82Gy: number[]; xray_1Gy: number[] }
  model_facts: { ionscan_params: number }
}
interface Ladder { label: string; rungs: { rung: string; examples: { x_u8_png_b64: string }[] }[] }

/** One real nucleus with the stored circles (and line, if the rule fired) drawn over it. */
function Specimen({ r, marks = true }: { r: NucleusResult | null; marks?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (r && cv.current) paintNucleus(cv.current, r.x)
  }, [r])
  return (
    <span className="w2-spec">
      <canvas ref={cv} width={N} height={N} aria-hidden="true" />
      {r && marks && (
        <svg viewBox={`0 0 ${N} ${N}`} aria-hidden="true">
          {r.line.drawn && r.line.p0 && r.line.p1 && <line x1={r.line.p0[1]} y1={r.line.p0[0]} x2={r.line.p1[1]} y2={r.line.p1[0]} className="w2-spec-line" />}
          {r.circles.map((c) => (
            <circle key={c.id} cx={c.x} cy={c.y} r={c.radiusPx} className="w2-spec-ring" />
          ))}
        </svg>
      )}
    </span>
  )
}

/** The whole sample as a wall of its real nuclei. */
function Wall({ onCount }: { onCount: (n: number) => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let dead = false
    const el = cv.current
    if (!el) return
    const start = () => {
      tt.wellImages('P242_G4')
        .then((buf) => {
          if (dead) return
          const n = Math.floor(buf.length / (N * N))
          onCount(n)
          const cols = 53
          const rows = Math.ceil(n / cols)
          const T = 40
          el.width = cols * T
          el.height = rows * T
          const ctx = el.getContext('2d')
          if (!ctx) return
          const tmp = document.createElement('canvas')
          let i = 0
          const step = () => {
            if (dead) return
            const end = Math.min(n, i + 36)
            for (; i < end; i++) {
              paintNucleus(tmp, buf, i * N * N)
              ctx.drawImage(tmp, (i % cols) * T + 2, Math.floor(i / cols) * T + 2, T - 4, T - 4)
            }
            if (i < n) requestAnimationFrame(step)
          }
          step()
        })
        .catch(() => undefined)
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect()
        start()
      }
    }, { rootMargin: '900px' })
    io.observe(el)
    return () => {
      dead = true
      io.disconnect()
    }
  }, [onCount])
  return <canvas className="w2-wall-cv" ref={cv} role="img" aria-label="Every nucleus of one real sample, side by side" />
}

function RepairChart({ d }: { d: Summary['repair_curve'] }) {
  const W = 560
  const H = 330
  const L = 44
  const R = 132
  const T = 22
  const B = 40
  const P = 64
  const xs = (h: number) => L + P + ((h - d.hours[0]) / (d.hours[d.hours.length - 1] - d.hours[0])) * (W - L - R - P)
  const top = Math.ceil(Math.max(...d.fe_0_82Gy, ...d.xray_1Gy))
  const ys = (v: number) => T + (1 - v / top) * (H - T - B)
  const path = (v: number[]) => v.map((y, i) => `${i ? 'L' : 'M'}${xs(d.hours[i]).toFixed(1)},${ys(y).toFixed(1)}`).join(' ')
  const series = [
    { k: 'fe', name: 'iron ion', v: d.fe_0_82Gy },
    { k: 'xr', name: 'X-rays', v: d.xray_1Gy },
  ]
  return (
    <svg className="w2-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mean damage spots per nucleus at 4, 24 and 48 hours after exposure, iron ion versus X-rays">
      {Array.from({ length: top + 1 }, (_, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={ys(i)} y2={ys(i)} className="w2-chart-grid" />
          <text x={L - 10} y={ys(i) + 4} textAnchor="end" className="w2-chart-tick" data-qa="tick">{i}</text>
        </g>
      ))}
      {d.hours.map((h) => (
        <text key={h} x={xs(h)} y={H - 12} textAnchor="middle" className="w2-chart-tick" data-qa="tick">{h} h</text>
      ))}
      {series.map((s) => (
        <g key={s.k} data-k={s.k}>
          <path d={path(s.v)} className="w2-chart-line" />
          {s.v.map((y, i) => (
            <g key={i}>
              <circle cx={xs(d.hours[i])} cy={ys(y)} r={5} className="w2-chart-dot" />
              {i < s.v.length - 1 && <text x={xs(d.hours[i]) + (i === 0 ? -12 : s.k === 'fe' ? 10 : 0)} y={ys(y) + (i === 0 ? 5 : s.k === 'fe' ? -12 : 22)} textAnchor={i === 0 ? 'end' : s.k === 'fe' ? 'start' : 'middle'} className="w2-chart-val">{y}</text>}
            </g>
          ))}
          <text x={W - R + 14} y={ys(s.v[s.v.length - 1]) + (s.k === 'fe' ? -4 : 14)} className="w2-chart-name">{s.name} <tspan className="w2-chart-val">{s.v[s.v.length - 1]}</tspan></text>
        </g>
      ))}
    </svg>
  )
}

export default function TrackTraceW2({ params }: { view: string; params: URLSearchParams }) {
  const pin = params.get('state')
  const pinned = pin === 'idle' || pin === 'result' ? pin : undefined
  const [sampleId, setSampleId] = useState(HERO)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [res, setRes] = useState<NucleusResult | null>(null)
  const [actRes, setActRes] = useState<TrackTraceAct | null>(null)
  const [well, setWell] = useState<WellResult | null>(null)
  const [picks, setPicks] = useState<Record<string, NucleusResult>>({})
  const [summary, setSummary] = useState<Summary | null>(null)
  const [ladder, setLadder] = useState<Ladder | null>(null)
  const [wallN, setWallN] = useState(0)
  const moment = useRef<TrackTraceMomentHandle>(null)
  const ghost = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let dead = false
    Promise.all(PICKS.map((id) => tt.replay(id).catch(() => null))).then((rs) => {
      if (dead) return
      const o: Record<string, NucleusResult> = {}
      rs.forEach((r, i) => { if (r) o[PICKS[i]] = r })
      setPicks(o)
    })
    tt.loadSummary().then((s) => !dead && setSummary(s as unknown as Summary)).catch(() => undefined)
    tt.loadLetLadder().then((l) => !dead && setLadder(l as unknown as Ladder)).catch(() => undefined)
    return () => { dead = true }
  }, [])

  useEffect(() => {
    const r = picks[HERO]
    if (r && ghost.current) paintNucleus(ghost.current, r.x)
  }, [picks])

  const onResult = useCallback((r: NucleusResult, a: TrackTraceAct | null, w: WellResult | null) => {
    setRes(r)
    setActRes(a)
    setWell(w)
  }, [])
  const onState = useCallback((s: MomentState) => {
    setState(s)
    if (s === 'idle' || s === 'running') { setRes(null); setActRes(null) }
  }, [])

  const scan = () => {
    const m = moment.current
    if (!m) return
    if (state === 'result') m.reset()
    void m.run()
  }
  const pick = (id: string) => {
    if (id === sampleId) return
    setRes(null)
    setActRes(null)
    setBeat(null)
    setState('idle')
    setReady(false)
    setSampleId(id)
  }
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const count = res ? res.count : beat ? beat.count : 0
  const shown = state === 'result' && !!res
  const lineWords = res ? (res.line.drawn ? `${res.line.nInliers} in a straight line` : 'no straight line') : ''
  const srcTag = res ? (res.source === 'live' ? `LIVE ${Math.round(res.timing.ms)} ms` : 'REPLAY') : ''
  const fmt = useMemo(() => new Intl.NumberFormat('en-US'), [])
  const xr = picks['nucleus-241']
  const fe = picks['nucleus-239']
  const pct = (v: number) => `${Math.round(v * 100)}%`

  return (
    <div className="w2" data-ready={ready ? '1' : '0'} data-state={state}>
      <div className="w2-bg" aria-hidden="true">
        <canvas className="w2-ghost" ref={ghost} width={N} height={N} />
        <div className="w2-ion"><i /></div>
        <div className="w2-grain" />
      </div>

      <header className="w2-top">
        <span className="w2-brand">SuperHumans<i>check 01 · cells · radiation</i></span>
        <nav aria-label="On this page">
          <button type="button" onClick={() => go('w2-check')}>The check</button>
          <button type="button" onClick={() => go('w2-problem')}>The problem</button>
          <button type="button" onClick={() => go('w2-work')}>IonScan</button>
        </nav>
      </header>

      <section className="w2-hero" id="w2-check">
        <div className="w2-left">
          <div className="w2-title-wrap">
            <h1 className="w2-title"><span>Track</span><span className="w2-title-2">Trace</span></h1>
            <p className="w2-sentence">{SENTENCE}</p>
          </div>

          <div className="w2-go">
            <button type="button" className="w2-scan-btn" data-qa="primary" onClick={scan} disabled={!ready || state === 'running' || !!pinned}>
              <span className="w2-scan-dot" aria-hidden="true" />
              {state === 'running' ? 'IonScan is reading…' : state === 'result' ? 'Scan again' : 'Scan this nucleus'}
            </button>
            <span className="w2-go-note">Runs our own model, IonScan, in this browser.</span>
          </div>

          <div className="w2-out" data-on={shown ? '1' : '0'} aria-live="polite">
            <div className="w2-read">
              {state === 'idle' ? <span className="w2-ring" aria-hidden="true" /> : <span className="w2-num">{count}</span>}
              <span className="w2-read-words">
                <b>damage spots circled</b>
                {shown && res ? (
                  <>
                    <span>NASA’s own count: {res.nfoci2016} <span className="w2-tag">{srcTag}</span></span>
                    <span>{lineWords}{res.line.drawn ? <em> · {tt.HONESTY.lineLabel}</em> : null}</span>
                  </>
                ) : (
                  <span className="w2-quiet">{state === 'running' ? 'eight scans, then the circles land' : 'press Scan to find them'}</span>
                )}
              </span>
            </div>
            <div className="w2-act" data-sev={shown && actRes ? actRes.severity : 'none'}>
              <span className="w2-act-k">
                What to do next
              </span>
              {shown && actRes ? (
                <>
                  <p className="w2-act-line">{actRes.headline}</p>
                  <span className="w2-act-tier">{actRes.tierName}</span>
                  <span className="w2-act-src">from the whole sample{well ? `, ${fmt.format(well.nuclei.length)} nuclei` : ''} · {tt.HONESTY.precomputed}</span>
                </>
              ) : (
                <p className="w2-act-line w2-quiet">The whole sample decides, never one nucleus.</p>
              )}
            </div>
          </div>
        </div>

        <div className="w2-right">
          <div className="w2-stage" data-qa="hero">
            <i className="w2-corner" data-c="tl" /><i className="w2-corner" data-c="tr" /><i className="w2-corner" data-c="bl" /><i className="w2-corner" data-c="br" />
            <TrackTraceMoment
              key={sampleId}
              ref={moment}
              sampleId={sampleId}
              state={pinned}
              promise=""
              onResult={onResult}
              onState={onState}
              onBeat={setBeat}
              onReady={setReady}
            />
          </div>
          <div className="w2-strip">
            <span className="w2-strip-k">Real nuclei.<br />Pick one.</span>
            {PICKS.map((id) => {
              const r = picks[id] ?? null
              const word = r && r.truth ? PARTICLE_WORD[r.truth.particle] : ''
              return (
                <button type="button" key={id} className="w2-pick" aria-pressed={id === sampleId} onClick={() => pick(id)} aria-label={`Show ${id}${word ? ', ' + word : ''}`}>
                  <Specimen r={r} marks={false} />
                  <span className="w2-pick-l">{word}</span>
                </button>
              )
            })}
            <span className="w2-strip-note">{tt.HONESTY.heroCaption}</span>
          </div>
        </div>
        <button type="button" className="w2-down" onClick={() => go('w2-problem')}>The story behind it <span aria-hidden="true">↓</span></button>
      </section>

      <section className="w2-sec" id="w2-problem">
        <div className="w2-chap"><span>01</span>The problem</div>
        <p className="w2-story-h">From a cosmic ray <em>to one glowing spot.</em></p>
        <Story hero={picks[HERO] ?? null} wallN={wallN} />
        <h2 className="w2-h2">X-rays scatter their damage. A heavy ion, the kind in cosmic rays, leaves it in a <em>straight line.</em></h2>

        <div className="w2-row w2-row-a">
          <figure className="w2-card w2-card-3d">
            <Nucleus3D />
            <figcaption>
              <b>One real nucleus, in 3D</b>
              <span>The glowing knots are its bright damage spots. The thin line is the path fitted through them. Drag to turn it.</span>
              <span className="w2-fine">{tt.HONESTY.lineLabel} · {tt.HONESTY.zScale}</span>
            </figcaption>
          </figure>

          <div className="w2-duel">
            <figure className="w2-card w2-duel-card" data-k="xr">
              <Specimen r={xr ?? null} />
              <figcaption>
                <span className="w2-duel-k">X-rays</span>
                <b>{xr ? `${xr.count} spots` : ' '}</b>
                <span>{xr ? (xr.line.drawn ? `${xr.line.nInliers} in a straight line` : 'scattered, no straight line') : ''}</span>
              </figcaption>
            </figure>
            <figure className="w2-card w2-duel-card" data-k="fe">
              <Specimen r={fe ?? null} />
              <figcaption>
                <span className="w2-duel-k">Iron ion</span>
                <b>{fe ? `${fe.count} spots` : ' '}</b>
                <span>{fe ? (fe.line.drawn ? `${fe.line.nInliers} in a straight line` : 'no straight line') : ''}</span>
              </figcaption>
            </figure>
            <p className="w2-fine w2-duel-note">Circles and line as IonScan drew them ({tt.HONESTY.precomputed}). {tt.HONESTY.gallery}</p>
          </div>
        </div>

        <div className="w2-row w2-row-b">
          <figure className="w2-card w2-card-chart">
            <figcaption>
              <b>Iron-ion damage is slower to repair</b>
              <span>Mean damage spots per nucleus after exposure. NASA’s counts: data, not model output.</span>
            </figcaption>
            {summary && <RepairChart d={summary.repair_curve} />}
          </figure>
          <figure className="w2-card w2-card-ladder">
            <figcaption>
              <b>From X-rays to heavier ions</b>
              <span>Real nuclei after each beam, as pictures only.</span>
            </figcaption>
            <div className="w2-ladder">
              {(ladder?.rungs ?? []).map((g) => (
                <div className="w2-rung" key={g.rung}>
                  <div className="w2-rung-pics">
                    {g.examples.slice(0, 2).map((e, i) => (
                      <img key={i} src={`data:image/png;base64,${e.x_u8_png_b64}`} alt="" loading="lazy" />
                    ))}
                  </div>
                  <span>{{ 'X-ray': 'X-rays', Si: 'silicon', Ar: 'argon', Fe: 'iron' }[g.rung] ?? g.rung}</span>
                </div>
              ))}
            </div>
            <span className="w2-fine">{ladder ? ladder.label : ''}</span>
          </figure>
        </div>

        <div className="w2-wall">
          <Wall onCount={setWallN} />
          <div className="w2-wall-words">
            <b>{wallN ? fmt.format(wallN) : ' '}</b>
            <span>nuclei in one sample. The whole sample decides what to do next, never one nucleus.</span>
            <i className="w2-fine">{tt.HONESTY.wellsStandIn}</i>
          </div>
        </div>
      </section>

      <section className="w2-sec" id="w2-work">
        <div className="w2-chap"><span>02</span>The work behind it</div>
        <h2 className="w2-h2">IonScan reads every nucleus <em>eight times.</em></h2>
        <p className="w2-lede">It cuts the image into a 32 × 32 grid and reads it along 4 directions, each both ways, with a memory that works like a particle detector integrating hits along a path.</p>

        <Scans x={picks[HERO]?.x ?? null} />
        <p className="w2-fine w2-scans-note">how IonScan reads every nucleus · reading order only, on the real nucleus above</p>

        <div className="w2-row w2-row-c">
          <figure className="w2-arch">
            <div className="w2-arch-card">
              <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network" />
              <span className="w2-ai">AI-generated illustration</span>
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
          <div className="w2-proof">
            {summary && (
              <>
                <div className="w2-stat"><b>{fmt.format(summary.model_facts.ionscan_params)}</b><span>parameters, designed and trained by us</span></div>
                <div className="w2-stat"><b>{fmt.format(summary.headline.test_nuclei)}</b><span>test nuclei from {summary.headline.test_mice} mice it never saw</span></div>
                <div className="w2-stat"><b>{summary.headline.foci_count_spearman_vs_nasa}</b><span>rank correlation of its spot counts with NASA’s</span></div>
                <div className="w2-stat"><b>{pct(summary.headline.sample_verdict.particle)}</b><span>right particle, whole-sample call on {summary.headline.sample_verdict.n_wells} test samples</span></div>
              </>
            )}
            <p className="w2-fine">{tt.HONESTY.batch}</p>
            <p className="w2-fine">{tt.HONESTY.groundAnalog} {tt.HONESTY.fociLabels}</p>
            <p className="w2-fine">Data: NASA BPS Microscopy and NASA OSDR OSD-366 (Penninckx et al. 2019). Models by team SuperHumans with an AI assistant (Claude).</p>
          </div>
        </div>
        <button type="button" className="w2-back" onClick={() => go('w2-check')}>Back to the check <span aria-hidden="true">↑</span></button>
      </section>
    </div>
  )
}

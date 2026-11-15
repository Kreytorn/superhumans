// braindrift_w2 (FREE, rich): BrainDrift as a film title over a wall of real MRI slices, then a museum-wall story.
// Every number and map on screen comes from the engine (moment stage, replay(), act(), fetchMeta(), HONESTY).
import { useEffect, useRef, useState } from 'react'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as bd from '../../engine/braindrift'
import type { BrainDriftAct, BrainDriftMeta, BrainMapResult, FlightResult } from '../../engine/braindrift'
import { BrainDriftMoment, type BrainDriftMomentHandle, type MomentState } from '../../moments/braindrift'
import { brainRange, busiestSagittal, busiestSlice, CLASS_RGB, paintCoronal, paintSagittal, topRows, topRowsSagittal } from './slices'
import './w2.css'

interface ProtoProps {
  view: string
  params: URLSearchParams
}

const SENTENCE = 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.'
const NI = bd.NI
const NJ = bd.NJ
const fmt = (x: number, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const signed = (x: number, d = 2) => `${x >= 0 ? '+' : '−'}${fmt(Math.abs(x), d)}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Citation {
  id: string
  ref: string
  quote: string
}

/** One canvas painted from a real volume (and the model's map). */
function Slice({ vol, seg, k, map = 0, preSeg, bgAlpha = 0, className, label }: { vol: Uint8Array; seg: Uint8Array | null; k: number; map?: number; preSeg?: Uint8Array | null; bgAlpha?: number; className?: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const img = ctx.createImageData(NI, NJ)
    paintCoronal(img, vol, seg, k, { map, preSeg, bgAlpha, gain: 1.15 })
    ctx.putImageData(img, 0, 0)
  }, [vol, seg, k, map, preSeg, bgAlpha])
  return <canvas ref={ref} width={NI} height={NJ} className={className} role="img" aria-label={label} />
}

/** Wall of real coronal slices behind the title: the pre-flight brain, back to front, with Model B's fluid spaces. */
function Wall({ flight }: { flight: FlightResult | null }) {
  if (!flight) return <div className="bw2-wall" aria-hidden="true" />
  const [k0, k1] = brainRange(flight.pre.volume)
  const n = 24
  const ks = Array.from({ length: n }, (_, q) => Math.round(k0 + 6 + ((k1 - k0 - 12) * q) / (n - 1)))
  return (
    <div className="bw2-wall" aria-hidden="true">
      <div className="bw2-wall-plane">
        {ks.map((k, q) => (
          <figure key={k} className="bw2-tile" style={{ ['--q' as string]: q }}>
            <Slice vol={flight.pre.volume} seg={flight.pre.seg} k={k} label="" className="bw2-tile-cv" />
            <figcaption data-qa="tick">{String(k).padStart(3, '0')}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

/** Blink comparator: the same real slice before and after the simulated flight, alternating. */
function Blink({ flight }: { flight: FlightResult }) {
  const [k, setK] = useState(100)
  const [after, setAfter] = useState(true)
  const [blink, setBlink] = useState(true)
  const zoomRef = useRef<HTMLCanvasElement>(null)
  const [k0, k1] = brainRange(flight.pre.volume)
  useEffect(() => {
    if (!blink) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const id = window.setInterval(() => setAfter((a) => !a), 900)
    return () => window.clearInterval(id)
  }, [blink])
  const r = after ? flight.post : flight.pre
  // zoom on the top of the brain: rows around the highest point, both top outlines drawn
  useEffect(() => {
    const c = zoomRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const src = document.createElement('canvas')
    src.width = NI
    src.height = NJ
    const sctx = src.getContext('2d')!
    const img = sctx.createImageData(NI, NJ)
    paintCoronal(img, r.volume, r.seg, k, { preSeg: after ? flight.pre.seg : null })
    sctx.putImageData(img, 0, 0)
    const tp = topRows(flight.pre.seg, k)
    const tq = topRows(flight.post.seg, k)
    let best = NJ
    for (const v of tp) if (v >= 0 && v < best) best = v
    const y0 = Math.max(0, best - 8)
    const x0 = 28
    const w = 120
    const h = 40
    const s = c.width / w
    ctx.imageSmoothingEnabled = true
    ctx.fillStyle = '#04070c'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(src, x0, y0, w, h, 0, 0, c.width, c.height)
    const line = (t: Int16Array, col: string, dash: number[]) => {
      ctx.beginPath()
      let on = false
      for (let x = x0; x < x0 + w; x++) {
        const v = t[x]
        if (v < 0 || v > y0 + h) {
          on = false
          continue
        }
        const px = (x - x0 + 0.5) * s
        const py = (v - y0) * s
        if (on) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
        on = true
      }
      ctx.setLineDash(dash)
      ctx.strokeStyle = col
      ctx.lineWidth = 2
      ctx.stroke()
    }
    line(tp, 'rgba(255,190,120,0.95)', [6, 5])
    line(tq, 'rgba(240,250,255,0.95)', [])
  }, [r, k, after, flight])
  return (
    <div className="bw2-blink">
      <div className="bw2-blink-main">
        <Slice vol={r.volume} seg={r.seg} k={k} preSeg={after ? flight.pre.seg : null} label={`Coronal slice ${k}, ${after ? 'after the simulated flight' : 'before flight'}, with the model's fluid spaces`} className="bw2-blink-cv" />
        <span className={`bw2-blink-state${after ? ' is-after' : ''}`}>{after ? 'After flight' : 'Before flight'}</span>
        <span className="bw2-sim">{bd.HONESTY.simulationBadge}</span>
      </div>
      <div className="bw2-blink-side">
        <div className="bw2-zoom">
          <canvas ref={zoomRef} width={600} height={200} role="img" aria-label="Top of the brain, enlarged: before outline dashed, after outline solid" />
          <span className="bw2-zoom-cap">Top of the brain, enlarged 4×</span>
        </div>
        <ul className="bw2-key">
          <li><i className="k-pre" /> top before flight</li>
          <li><i className="k-post" /> top after flight</li>
          <li><i className="k-vent" /> fluid spaces, as the model maps them</li>
          <li><i className="k-new" /> fluid here now, not before</li>
        </ul>
        <div className="bw2-blink-ctl" role="group" aria-label="Blink comparator">
          <button type="button" className={blink ? 'on' : ''} aria-pressed={blink} onClick={() => setBlink((b) => !b)}>
            {blink ? 'Blinking' : 'Blink'}
          </button>
          <button type="button" className={!blink && !after ? 'on' : ''} aria-pressed={!blink && !after} onClick={() => { setBlink(false); setAfter(false) }}>Before</button>
          <button type="button" className={!blink && after ? 'on' : ''} aria-pressed={!blink && after} onClick={() => { setBlink(false); setAfter(true) }}>After</button>
        </div>
        {flight.measured.ventricleChangePct !== null && (
          <div className="bw2-blink-read">
            <div>
              <b>{signed(flight.measured.ventricleChangePct)}%</b>
              <span>fluid spaces, measured by the AI</span>
            </div>
            <div>
              <b className="put">+{flight.injected.ventricleChangePct}%</b>
              <span>what we put in (Roberts 2019)</span>
            </div>
          </div>
        )}
        <label className="bw2-range">
          <span>Slice {k}, back to front</span>
          <input type="range" min={k0} max={k1} value={k} onChange={(e) => setK(Number(e.target.value))} aria-label="Coronal slice" />
        </label>
      </div>
    </div>
  )
}

/** Side view of the real brain, before and after the simulated flight, cross-fading; both top outlines drawn from the model's maps. */
function SideView({ flight }: { flight: FlightResult }) {
  const preRef = useRef<HTMLCanvasElement>(null)
  const postRef = useRef<HTMLCanvasElement>(null)
  const [geo, setGeo] = useState<{ pre: string; post: string; hx: number; hy: number; cx: number; cy: number } | null>(null)
  useEffect(() => {
    const { i, cx, cy } = busiestSagittal(flight.pre.seg)
    const paint = (c: HTMLCanvasElement | null, r: BrainMapResult, pre: Uint8Array | null) => {
      const ctx = c?.getContext('2d')
      if (!c || !ctx) return
      const img = ctx.createImageData(bd.NK, NJ)
      paintSagittal(img, r.volume, r.seg, i, pre)
      ctx.putImageData(img, 0, 0)
    }
    paint(preRef.current, flight.pre, null)
    paint(postRef.current, flight.post, flight.pre.seg)
    // outline over the folds: each column takes the highest surface within 6 mm, then a light average
    const path = (t: Int16Array) => {
      let best = NJ
      for (const v of t) if (v >= 0 && v < best) best = v
      const n = t.length
      const hull = new Float32Array(n).fill(-1)
      for (let x = 0; x < n; x++) {
        if (t[x] < 0) continue
        let hi = t[x]
        for (let q = -6; q <= 6; q++) {
          const v = t[x + q]
          if (v !== undefined && v >= 0 && v < hi) hi = v
        }
        hull[x] = hi
      }
      let d = ''
      let on = false
      for (let x = 0; x < n; x++) {
        if (hull[x] < 0 || hull[x] > best + 30) {
          on = false
          continue
        }
        let sum = 0
        let c = 0
        for (let q = -4; q <= 4; q++) {
          const v = hull[x + q]
          if (v !== undefined && v >= 0) {
            sum += v
            c++
          }
        }
        d += `${on ? 'L' : 'M'}${x + 0.5} ${(sum / c).toFixed(2)}`
        on = true
      }
      return d
    }
    const tp = topRowsSagittal(flight.pre.seg, i)
    const tq = topRowsSagittal(flight.post.seg, i)
    let hx = 0
    let hy = NJ
    for (let x = 0; x < tq.length; x++) if (tq[x] >= 0 && tq[x] < hy) [hx, hy] = [x, tq[x]]
    setGeo({ pre: path(tp), post: path(tq), hx, hy, cx, cy })
  }, [flight])
  const W = bd.NK
  return (
    <figure className="bw2-side">
      <div className="bw2-side-img">
        <canvas ref={preRef} width={W} height={NJ} className="bw2-side-cv" role="img" aria-label="Real brain MRI, side view, before flight" />
        <canvas ref={postRef} width={W} height={NJ} className="bw2-side-cv bw2-side-post" role="img" aria-label="The same brain after the simulated flight" />
        {geo && (
          <svg className="bw2-side-svg" viewBox={`0 0 ${W} ${NJ}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={geo.pre} className="bw2-side-pre" />
            <path d={geo.post} className="bw2-side-postl" />
          </svg>
        )}
        {geo && (
          <>
            <span className="bw2-side-lab bw2-side-lab-top" style={{ left: `${(geo.hx / W) * 100}%`, top: `${(geo.hy / NJ) * 100}%` }}>
              <i /> the top rises
            </span>
            <span className="bw2-side-lab bw2-side-lab-vent" style={{ left: `${(geo.cx / W) * 100}%`, top: `${(geo.cy / NJ) * 100}%` }}>
              <i /> fluid spaces swell
            </span>
          </>
        )}
        <span className="bw2-sim bw2-side-sim">{bd.HONESTY.simulationBadge}</span>
      </div>
      <figcaption>
        Real MRI, side view: before and after the simulated flight, fading into each other. Outlines: top before (dashed) and after (solid), from the model&rsquo;s maps.
      </figcaption>
    </figure>
  )
}

/** Two real test brains at the same scale: the smallest and the largest fluid spaces. */
function Range({ small, large }: { small: BrainMapResult | null; large: BrainMapResult | null }) {
  const one = (r: BrainMapResult | null, name: string) =>
    r ? (
      <figure className="bw2-pair-fig">
        <Slice vol={r.volume} seg={r.seg} k={busiestSlice(r.seg)} map={1} label={`${name}: a real test brain with the model's 6-class map`} className="bw2-pair-cv" />
        <figcaption>
          <b>{fmt(r.ventricleMl, 2)} mL</b>
          <span>{name}, measured by Model B</span>
          {r.reference?.freesurferVentricleMl !== undefined && <em>FreeSurfer reference {fmt(r.reference.freesurferVentricleMl, 1)} mL</em>}
        </figcaption>
      </figure>
    ) : (
      <figure className="bw2-pair-fig is-loading" />
    )
  return (
    <div className="bw2-pair">
      {one(small, 'Smallest in the test set')}
      {one(large, 'Largest in the test set')}
    </div>
  )
}

function Legend() {
  const names = ['', 'fluid spaces (ventricles)', 'cerebral white matter', 'cerebral cortex', 'deep grey matter and other', 'cerebellum and brainstem']
  return (
    <ul className="bw2-legend">
      {[1, 2, 3, 4, 5].map((c) => (
        <li key={c}>
          <i style={{ background: `rgb(${CLASS_RGB[c].join(',')})` }} />
          {names[c]}
        </li>
      ))}
    </ul>
  )
}

export default function BrainDriftW2({ params }: ProtoProps) {
  const pinned = params.get('state') === 'result' ? 'result' : params.get('state') === 'idle' ? 'idle' : undefined
  const modeParam = params.get('mode')
  const mode = modeParam === 'live' || modeParam === 'replay' ? modeParam : 'auto'
  const stage = useRef<BrainDriftMomentHandle>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [stageReady, setStageReady] = useState(false)
  const [res, setRes] = useState<{ r: FlightResult; a: BrainDriftAct } | null>(null)
  const [flight, setFlight] = useState<FlightResult | null>(null)
  const [small, setSmall] = useState<BrainMapResult | null>(null)
  const [large, setLarge] = useState<BrainMapResult | null>(null)
  const [meta, setMeta] = useState<BrainDriftMeta | null>(null)
  const [pvsView, setPvsView] = useState<'model' | 'expert'>('model')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      const [f, m] = await Promise.all([bd.replay('flight-f100'), bd.fetchMeta()])
      if (dead) return
      if (f.kind === 'flight') setFlight(f)
      setMeta(m)
      const [s, l] = await Promise.all([bd.replay('brain-small'), bd.replay('brain-large')])
      if (dead) return
      if (s.kind === 'brainmap') setSmall(s)
      if (l.kind === 'brainmap') setLarge(l)
    })().catch(() => {})
    return () => {
      dead = true
    }
  }, [])

  // the stage's own ready flag
  useEffect(() => {
    const el = rootRef.current?.querySelector('.bdm')
    if (!el) return
    const check = () => setStageReady(el.getAttribute('data-ready') === '1')
    check()
    const mo = new MutationObserver(check)
    mo.observe(el, { attributes: true, attributeFilter: ['data-ready'] })
    return () => mo.disconnect()
  }, [])

  const ready = stageReady && !!flight && (pinned !== 'result' || !!res)
  const pageState = res && state !== 'running' ? 'result' : state
  const citations = (meta?.flight as unknown as { citations?: Citation[] })?.citations ?? []
  const m = meta?.metrics as
    | { modelB: { nTest: number; ventricleDiceShown: number; volumePearsonR: number; params: number; onnxMb: number }; modelA: { nTest: number; pvsDiceShown: number; params: number } }
    | undefined
  const check40 = (meta?.flight as unknown as { check40?: { n: number; ventricleChangeMaePp: number; riseMaeMm: number } })?.check40
  const repeat = meta?.realScanRepeatability as { consecutiveDayAbsChangePct?: { p95: number } } | undefined
  const pvs = meta?.pvs.samples.find((s) => s.id === 'pvs-high')
  const a = res?.a
  const rows = a ? a.rows.filter((row) => row.tier > 0) : []

  const scrollToStory = () => rootRef.current?.querySelector('#bw2-story')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div ref={rootRef} className="bw2" data-ready={ready ? '1' : undefined} data-state={pageState}>
      {/* ───────────── first screen ───────────── */}
      <section className="bw2-hero">
        <Wall flight={flight} />
        <div className="bw2-veil" aria-hidden="true" />
        <header className="bw2-top">
          <a className="bw2-back" href="#/">
            <span aria-hidden="true">←</span> All checks
          </a>
          <span className="bw2-crumb">Check 05 of 06 · Brain MRI</span>
        </header>

        <div className="bw2-copy">
          <p className="bw2-kicker">
            <span className="bw2-dot" aria-hidden="true" /> Brain · fluid shift
          </p>
          <h1 className="bw2-title" aria-label="BrainDrift">
            <span className="bw2-t1">Brain</span>
            <span className="bw2-t2">
              Drift
              <svg className="bw2-dim" viewBox="0 0 14 60" preserveAspectRatio="none" aria-hidden="true">
                <path d="M7 2 V58 M2 2 H12 M2 58 H12 M3 9 L7 2 L11 9" />
              </svg>
            </span>
          </h1>
          <p className="bw2-sentence">{SENTENCE}</p>
          <div className="bw2-actions">
            <button type="button" className="bw2-btn bw2-btn-main" onClick={() => stage.current?.run()} disabled={state === 'running'}>
              <span className="bw2-btn-ring" aria-hidden="true" />
              {state === 'running' ? 'The AI is reading…' : res ? 'Fly it again' : 'Fly the brain'}
            </button>
            <button type="button" className="bw2-btn bw2-btn-ghost" onClick={() => { stage.current?.reset(); setRes(null) }} disabled={!res && state !== 'result'}>
              Back to before flight
            </button>
          </div>

        </div>

          <div className={`bw2-act${a ? ' is-on' : ''}`} aria-live="polite">
          {a ? (
            <>
              <p className="bw2-act-k">
                What to do next <span className={`bw2-who sev-${a.severity}`}>{cap(a.whoActs)}</span>
                <span className="bw2-tier">{a.tierName}</span>
              </p>
              <p className="bw2-act-h">{cap(a.headline.replace(/^Tier [^:]+:\s*/, ''))}</p>
              {rows.length > 1 && (
                <ul className="bw2-act-rows">
                  {rows.slice(1, 3).map((row) => (
                    <li key={row.tierName}>{cap(row.actions[0])}</li>
                  ))}
                </ul>
              )}
              <p className="bw2-act-note">{bd.ACT_CAVEATS[3]}</p>
            </>
          ) : (
            <div className="bw2-act-idle">
              {flight && (
                <div className="bw2-strip" aria-hidden="true">
                  {[70, 85, 100, 115, 130].map((k) => (
                    <Slice key={k} vol={flight.pre.volume} seg={flight.pre.seg} k={k} label="" className="bw2-strip-cv" />
                  ))}
                </div>
              )}
              <p>
                <b>A real brain MRI the model never saw.</b> Fly it: the model maps it again and tells the ground team what to do.
              </p>
            </div>
          )}
        </div>

        <div className="bw2-stage">
          <BrainDriftMoment
            ref={stage}
            sampleId="flight-f100"
            mode={mode}
            state={pinned}
            onState={(s) => setState(s)}
            onResult={(r, act) => setRes({ r, a: act })}
          />
        </div>

        <button type="button" className="bw2-cue" onClick={scrollToStory}>
          Why the brain drifts <span aria-hidden="true">↓</span>
        </button>
      </section>

      {/* ───────────── the story ───────────── */}
      <section id="bw2-story" className="bw2-story">
        <div className="bw2-ch1">
          <div className="bw2-chapter">
            <p className="bw2-num">01 · The problem</p>
            <h2 className="bw2-h2">
              The brain <em>rises.</em> Its fluid spaces <em>swell.</em>
            </h2>
          </div>
          {flight ? <SideView flight={flight} /> : <div className="bw2-side is-loading" />}
        </div>

        <div className="bw2-plaques">
          {citations.map((c) => (
            <figure key={c.id} className="bw2-plaque">
              <span className="bw2-plaque-n">{c.id === 'PNAS2026' ? '2.52 mm' : '+10.7%'}</span>
              <blockquote>“{c.quote.replace(/^long-duration ISS flights "resulted in/, 'Long-duration ISS flights resulted in').replace(/"$/, '')}”</blockquote>
              <figcaption>{c.ref}</figcaption>
            </figure>
          ))}
          <figure className="bw2-plaque bw2-plaque-dark">
            <span className="bw2-plaque-n bw2-plaque-zero">0</span>
            <blockquote>{bd.HONESTY.noOrbitMri}</blockquote>
            <figcaption>MRI scanners in orbit today</figcaption>
          </figure>
        </div>

        <div className="bw2-chapter">
          <p className="bw2-num">02 · See it</p>
          <h3 className="bw2-h3">One real brain, before and after a simulated flight, blinking.</h3>
          <p className="bw2-lede">{bd.HONESTY.flightFrame}</p>
        </div>
        {flight ? <Blink flight={flight} /> : <div className="bw2-blink is-loading" />}

        <div className="bw2-chapter">
          <p className="bw2-num">03 · Scale</p>
          <h3 className="bw2-h3">Fluid spaces differ a lot between people. The model reads both ends.</h3>
          <p className="bw2-lede">{bd.HONESTY.ventricleReference}.</p>
        </div>
        <Range small={small} large={large} />
        <Legend />

        <div className="bw2-chapter">
          <p className="bw2-num">04 · Smaller still</p>
          <h3 className="bw2-h3">Fluid channels around tiny brain vessels, found by our second model.</h3>
        </div>
        {pvs && (
          <div className="bw2-pvs">
            <div className="bw2-pvs-img">
              <img src={bd.assetUrl(pvsView === 'model' ? pvs.axial.model : pvs.axial.expert)} alt={`Twelve real axial MRI slices with perivascular spaces marked by the ${pvsView === 'model' ? 'model' : 'expert'}`} />
            </div>
            <div className="bw2-pvs-side">
              <p className="bw2-pvs-n">{(pvsView === 'model' ? pvs.modelChannels : pvs.expertChannels).toLocaleString('en-US')}</p>
              <p className="bw2-pvs-l">channels marked by {pvsView === 'model' ? 'Model A' : 'the expert'} in this person</p>
              <div className="bw2-seg" role="group" aria-label="Who marked the channels">
                <button type="button" aria-pressed={pvsView === 'model'} className={pvsView === 'model' ? 'on' : ''} onClick={() => setPvsView('model')}>Model A</button>
                <button type="button" aria-pressed={pvsView === 'expert'} className={pvsView === 'expert' ? 'on' : ''} onClick={() => setPvsView('expert')}>Expert</button>
              </div>
              <p className="bw2-fine">Agreement with the expert for this person: Dice {fmt(pvs.dice, 3)}.</p>
              <p className="bw2-fine">{bd.HONESTY.modelA} Its {bd.HONESTY.modelADisclosure}.</p>
              <p className="bw2-fine">{bd.HONESTY.pvsBand}</p>
            </div>
          </div>
        )}

        <div className="bw2-chapter">
          <p className="bw2-num">05 · The work</p>
          <h3 className="bw2-h3">A brain map that runs in your browser.</h3>
        </div>
        {flight && (
          <ol className="bw2-pipe">
            <li>
              <Slice vol={flight.pre.volume} seg={null} k={100} label="A real MRI slice" className="bw2-pipe-cv" />
              <b>MRI</b>
              <span>176 × 176 × 208 voxels, 1 mm</span>
            </li>
            <li className="bw2-pipe-model">
              <div className="bw2-chip">
                <b>Model B</b>
                <span>2.5D U-Net, MobileNetV4 encoder</span>
                {m && <span>{(m.modelB.params / 1e6).toFixed(2)} M parameters · {m.modelB.onnxMb} MB</span>}
              </div>
            </li>
            <li>
              <Slice vol={flight.pre.volume} seg={flight.pre.seg} k={100} map={1} label="The model's 6-class map of the same slice" className="bw2-pipe-cv" />
              <b>6-class map</b>
              <span>every voxel, slice by slice</span>
            </li>
            <li>
              <div className="bw2-pipe-num">
                <b>{fmt(flight.pre.ventricleMl, 2)} → {fmt(flight.post.ventricleMl, 2)} mL</b>
                {flight.measured.ventricleChangePct !== null && <span>{signed(flight.measured.ventricleChangePct)}% fluid spaces · we put in +{flight.injected.ventricleChangePct}%</span>}
                {flight.measured.riseMm !== null && <span>{fmt(flight.measured.riseMm, 2)} mm rise · we put in {fmt(flight.injected.riseMm, 2)} mm</span>}
              </div>
              <b>Before vs after</b>
              <span>then the action rules</span>
            </li>
          </ol>
        )}
        {m && (
          <div className="bw2-stats">
            <div>
              <b>{m.modelB.ventricleDiceShown}</b>
              <span>fluid-space Dice on {m.modelB.nTest} held-out brains</span>
            </div>
            <div>
              <b>{m.modelB.volumePearsonR.toFixed(3)}</b>
              <span>volume correlation, same brains</span>
            </div>
            {check40 && (
              <div>
                <b>{check40.ventricleChangeMaePp.toFixed(2)} pp</b>
                <span>mean error on the simulated change, {check40.n} brains</span>
              </div>
            )}
            {repeat?.consecutiveDayAbsChangePct && (
              <div>
                <b>{repeat.consecutiveDayAbsChangePct.p95.toFixed(1)}%</b>
                <span>day-to-day noise on real repeat scans (95th percentile)</span>
              </div>
            )}
          </div>
        )}
        <div className="bw2-honest">
          <p>{bd.HONESTY.modelB}</p>
          <p>{bd.HONESTY.noDiagnosis}</p>
          <p>{bd.HONESTY.noAlignment}</p>
        </div>
        <footer className="bw2-credits">
          Data: OASIS-1 (Marcus 2007) with neurite-oasis labels (Hoopes 2021), OASIS Data Use Terms · OpenNeuro ds005595 (Chai et al., CC0) · OpenNeuro ds000239 (Maclaren 2014, CC0). Models: MobileNetV4 via timm (Apache-2.0) · nnU-Net ResEnc (Isensee) · OpenMind pretraining (Wald et al. 2025, CC-BY-4.0) · HD-BET (Apache-2.0). Runtime: onnxruntime-web (MIT), three.js (MIT). Simulation numbers: PNAS 2026, Roberts 2019 AJNR.
        </footer>
      </section>
    </div>
  )
}

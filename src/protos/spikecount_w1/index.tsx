// spikecount_w1 "Inside the drop": the SpikeCount check as a place. A slow 3D river of red cells runs behind the whole
// screen (drawn, marked as an illustration); in front of it the real microscope photo sits on a tilting glass plate.
// One press runs both real models (live on a laptop, stored outputs on a phone); a scan line then crosses the photo
// and each cell's outline appears the moment the line reaches it, in the grader's colour. Below: the story.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import '@fontsource-variable/unbounded/wght.css'
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import { flushSync } from 'react-dom'
import './w1.css'
import type { ProtoProps } from '../../App'
import * as spike from '../../engine/spikecount'
import type { SpikeCell, SpikeResult, TimelineStep } from '../../engine/spikecount'

const Bloodstream = lazy(() => import('./scene').then((m) => ({ default: m.Bloodstream })))
const ShapeCell = lazy(() => import('./scene').then((m) => ({ default: m.ShapeCell })))

const FIELD = 'field-96'
const IMG = spike.ASSETS.url('fields/96.png')
const SENTENCE = 'Every red blood cell, outlined. The spiky ones, counted.'
const DRAW_MS = 4200
/** how far past its top edge (photo pixels) the scan line travels while one outline is being drawn; matches w1.css */
const TAIL = 120

type Cls = spike.ClassName
const KEYS: Cls[] = ['Disc', 'E1', 'E2', 'E3', 'E4', 'Cup']
const COL: Record<Cls, string> = { Disc: '#8fdcff', E1: '#ffe066', E2: '#ffa648', E3: '#ff6a4d', E4: '#ff2f6d', Cup: '#c7a4ff' }
const SHORT: Record<Cls, string> = { Disc: 'Smooth disc', E1: 'Spiky 1', E2: 'Spiky 2', E3: 'Spiky 3', E4: 'Spiky 4', Cup: 'Cup shape' }
const GRADE_NOTE = ['A smooth disc with a dimple on each side.', 'Grade 1: a few bumps on the rim.', 'Grade 2: more spikes, the disc starts to round up.', 'Grade 3: a rounder body, spikes all over.', 'Grade 4: a ball of fine spikes.']
const isSpiky = (c: { cls: number }) => c.cls >= 1 && c.cls <= 4
const pts = (p: [number, number][]) => p.map((q) => `${q[0]},${q[1]}`).join(' ')
const cvar = (c: string) => ({ ['--c' as string]: c }) as CSSProperties
const f1 = (n: number) => n.toFixed(1)

interface Evidence {
  headline: { field_spiky_r: number; field_spiky_mae_pp: number; outliner_f1_iou50: number; spiky_vs_not_balanced_acc: number }
  fields: { expert_spiky_pct: number; pred_spiky_pct: number }[]
}
type Phase = 'idle' | 'running' | 'drawing' | 'result' | 'error'

export default function SpikeCountW1({ params }: ProtoProps) {
  const forced = params.get('state')
  const [phase, setPhase] = useState<Phase>('idle')
  const [res, setRes] = useState<SpikeResult | null>(null)
  const [drawn, setDrawn] = useState(0)
  const [note, setNote] = useState('')
  const [hover, setHover] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [ev, setEv] = useState<Evidence | null>(null)
  const [mission, setMission] = useState<{ steps: TimelineStep[]; results: SpikeResult[] } | null>(null)
  const [grade, setGrade] = useState(0)
  const [steps, setSteps] = useState(false)
  const [layers, setLayers] = useState<spike.SpikeLayers | null>(null)
  const [xray, setXray] = useState(false)
  const [guess, setGuess] = useState(25)
  const [guessed, setGuessed] = useState(false)
  const plate = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const story = useRef<HTMLElement>(null)
  const token = useRef(0)
  const raf = useRef(0)
  const small = useMemo(() => typeof window !== 'undefined' && (window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches), [])
  const canLive = !small && params.get('mode') !== 'replay'

  // Cells in the order the scan line meets them (top edge of each outline), which is the model's own cell order.
  const order = useMemo(() => {
    if (!res) return [] as { c: SpikeCell; top: number; d: string }[]
    return res.cells
      .map((c) => ({ c, top: c.polygon.reduce((m, p) => Math.min(m, p[1]), Infinity), d: pts(c.polygon) }))
      .sort((a, b) => a.top - b.top || a.c.id - b.c.id)
  }, [res])

  const run = useCallback(
    async (instant = false) => {
      const mine = ++token.current
      cancelAnimationFrame(raf.current)
      setHover(null)
      setSteps(false)
      setDrawn(0)
      setRes(null)
      setPhase('running')
      plate.current?.style.setProperty('--scan', '0')
      plate.current?.style.setProperty('--sweep', '0')
      const started = performance.now()
      let r: SpikeResult
      try {
        if (canLive && !instant) {
          setNote('Loading the outliner and the grader')
          // Loading plus both models get 15 s in all; past that the stored outputs of the same models are shown (tagged REPLAY).
          const liveRun = async () => {
            await spike.load((p) => {
              if (mine === token.current && p.stage !== 'ready') setNote(p.stage === 'grader' ? 'Loading the grader (34 MB)' : 'Loading the outliner (12 MB)')
            })
            if (mine === token.current) setNote('Both models are reading the photo')
            return spike.analyze(FIELD)
          }
          r = await Promise.race([liveRun(), new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('timeout')), 15000))])
          if (mine !== token.current) return
          if (r.layers) setLayers(r.layers)
        } else {
          setNote('Reading the stored outlines')
          r = await spike.replay(FIELD)
        }
      } catch {
        try {
          r = await spike.replay(FIELD)
        } catch {
          if (mine === token.current) setPhase('error')
          return
        }
      }
      if (mine !== token.current) return
      if (instant) {
        setRes(r)
        setDrawn(r.cells.length)
        plate.current?.style.setProperty('--scan', '1')
        plate.current?.style.setProperty('--sweep', '9999')
        setPhase('result')
        return
      }
      const wait = Math.max(0, 650 - (performance.now() - started))
      await new Promise((ok) => window.setTimeout(ok, wait))
      if (mine !== token.current) return
      setRes(r)
      setPhase('drawing')
      const tops = r.cells.map((c) => c.polygon.reduce((m, p) => Math.min(m, p[1]), Infinity)).sort((a, b) => a - b)
      const t0 = performance.now()
      let last = -1
      const tick = (now: number) => {
        if (mine !== token.current) return
        const p = Math.min(1, (now - t0) / DRAW_MS)
        // One clock for everything: the line's height, each outline (CSS reads --sweep) and the counters.
        const y = p * (r.height + TAIL)
        plate.current?.style.setProperty('--sweep', p >= 1 ? '9999' : y.toFixed(1))
        plate.current?.style.setProperty('--scan', Math.min(1, y / r.height).toFixed(4))
        let n = 0
        while (n < tops.length && tops[n] <= y) n++
        if (p >= 1) n = tops.length
        if (n !== last) {
          last = n
          flushSync(() => setDrawn(n))
        }
        if (p < 1) raf.current = requestAnimationFrame(tick)
        else setPhase('result')
      }
      raf.current = requestAnimationFrame(tick)
    },
    [canLive],
  )

  const reset = useCallback(() => {
    token.current++
    cancelAnimationFrame(raf.current)
    setRes(null)
    setDrawn(0)
    setHover(null)
    setSteps(false)
    setPhase('idle')
  }, [])

  useEffect(() => {
    let alive = true
    spike.ASSETS.evidence()
      .then((e) => alive && setEv(e as Evidence))
      .catch(() => undefined)
    spike
      .runTimeline('replay')
      .then((rs) => alive && setMission({ steps: spike.timeline(rs), results: rs }))
      .catch(() => undefined)
    const img = new Image()
    img.src = IMG
    const done = () => alive && window.setTimeout(() => alive && setReady(true), 350)
    img.decode().then(done, done)
    if (forced === 'result') void run(true)
    if (canLive)
      window.setTimeout(() => {
        // warm both models (download, shader compile) so the press itself is quick; keep the outliner's own maps of this photo
        if (alive)
          spike
            .analyze(FIELD, { polygons: false })
            .then((w) => alive && w.layers && setLayers(w.layers))
            .catch(() => undefined)
      }, 900)
    return () => {
      alive = false
      token.current++
      cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = order.slice(0, drawn)
  const counts = useMemo(() => {
    const o: Record<Cls, number> = { Disc: 0, E1: 0, E2: 0, E3: 0, E4: 0, Cup: 0 }
    for (let i = 0; i < drawn && i < order.length; i++) o[order[i].c.className]++
    return o
  }, [order, drawn])
  const nSpiky = counts.E1 + counts.E2 + counts.E3 + counts.E4
  const pct = shown.length ? (nSpiky / shown.length) * 100 : 0
  const decision = useMemo(() => (res && phase === 'result' ? spike.act(res) : null), [res, phase])
  // At rest after a run, the loupe shows the grader's surest grade-4 cell (whole, not cut by the edge); pointing picks another.
  const autoPick = useMemo(() => {
    if (!res || phase !== 'result') return null
    const inner = (c: SpikeCell) => c.center[0] > 120 && c.center[0] < 452 && c.center[1] > 110 && c.center[1] < 400
    const pool0 = res.cells.filter((c) => !c.border && isSpiky(c))
    const pool = pool0.some(inner) ? pool0.filter(inner) : pool0
    const best = (pool.filter((c) => c.className === 'E4').length ? pool.filter((c) => c.className === 'E4') : pool).sort((a, b) => b.confidence - a.confidence)[0]
    return best?.id ?? null
  }, [res, phase])
  const focusId = hover ?? autoPick
  const hov = focusId === null ? null : (order.find((o) => o.c.id === focusId)?.c ?? null)
  const loupe = useMemo(() => {
    if (!hov) return null
    const [cx, cy] = hov.center
    const rc = hov.polygon.reduce((m, p) => Math.max(m, Math.hypot(p[0] - cx, p[1] - cy)), 0)
    const R = 92
    const side = cx < 286 ? 1 : -1
    const lx = Math.min(572 - R - 10, Math.max(R + 10, cx + side * (rc + R + 46)))
    const ly = Math.min(572 - R - 44, Math.max(R + 10, cy - 30))
    const ang = Math.atan2(ly - cy, lx - cx)
    const w = Math.max(18, rc * 1.5)
    // the magnified window stays inside the photo, so the lens never shows past its edge
    const vx = Math.min(572 - 2 * w, Math.max(0, cx - w))
    const vy = Math.min(572 - 2 * w, Math.max(0, cy - w))
    return { cx, cy, rc, R, lx, ly, w, vx, vy, a: [cx + Math.cos(ang) * (rc + 6), cy + Math.sin(ang) * (rc + 6)], b: [lx - Math.cos(ang) * R, ly - Math.sin(ang) * R] }
  }, [hov])
  const st = phase === 'drawing' ? 'running' : phase
  const live = res?.source === 'live'
  const maxCount = Math.max(1, ...KEYS.map((k) => counts[k]))

  const tilt = (e: RPointerEvent<HTMLDivElement>) => {
    if (small) return
    const b = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - b.left) / b.width - 0.5
    const y = (e.clientY - b.top) / b.height - 0.5
    e.currentTarget.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`)
    e.currentTarget.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`)
  }
  const untilt = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--ry', '0deg')
    e.currentTarget.style.setProperty('--rx', '0deg')
  }

  return (
    <div className="sw1" data-state={st} data-phase={phase} data-ready={ready ? '1' : '0'}>
      <div className="sw1-bg" aria-hidden="true">
        <Suspense fallback={null}>
          <Bloodstream spikyShare={pct / 100} count={small ? 50 : 130} scroller={scroller} />
        </Suspense>
      </div>
      <div className="sw1-veil" aria-hidden="true" />

      <div className="sw1-scroll" ref={scroller}>
        <header className="sw1-top">
          <span className="sw1-brand">SuperHumans</span>
          <span className="sw1-crumb">Check 03 · Blood</span>
          <button type="button" className="sw1-toplink" onClick={() => story.current?.scrollIntoView({ behavior: 'smooth' })}>
            The story <span aria-hidden="true">↓</span>
          </button>
        </header>

        <section className="sw1-hero">
          <div className="sw1-left">
            <h1 className="sw1-name">SpikeCount</h1>
            <p className="sw1-sentence">{SENTENCE}</p>

            {phase === 'idle' && (
              <div className="sw1-idle">
                <button type="button" className="sw1-go" data-qa="primary" onClick={() => void run()}>
                  <span className="sw1-go-dot" aria-hidden="true" />
                  Grade this blood
                </button>
                <p className="sw1-bet">How many red cells are in this photo, and how many are spiky? Take a guess, then press.</p>
                <label className="sw1-guess">
                  <span>
                    Your guess <b>{guess}%</b> spiky
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={guess}
                    style={{ ['--g' as string]: `${guess}%` } as CSSProperties}
                    aria-label="Your guess of the share of spiky cells"
                    onChange={(e) => {
                      setGuess(Number(e.target.value))
                      setGuessed(true)
                    }}
                  />
                </label>
              </div>
            )}
            {phase === 'running' && (
              <div className="sw1-wait" role="status">
                <span className="sw1-spin" aria-hidden="true" />
                {note}
              </div>
            )}
            {phase === 'error' && (
              <div className="sw1-wait" role="alert">
                The check could not run.{' '}
                <button type="button" className="sw1-link" onClick={() => void run()}>
                  Try again
                </button>
              </div>
            )}

            {(phase === 'drawing' || phase === 'result') && res && (
              <div className="sw1-read">
                <p className="sw1-big" aria-live="polite">
                  <b>{f1(pct)}</b>
                  <i>%</i>
                  <span>spiky</span>
                </p>
                <p className="sw1-counts">
                  <span>
                    <b>{shown.length}</b> cells outlined
                  </span>
                  <span className="is-hot">
                    <b>{nSpiky}</b> spiky
                  </span>
                </p>
                {decision && (
                  <>
                    {guessed && <p className="sw1-guessed">Your guess was {guess}%.</p>}
                    <p className="sw1-before">
                      <b>{f1(decision.inputs.s0)}%</b> before flight <em>Illustrative</em>
                    </p>
                    <div className="sw1-act">
                      <span className="sw1-act-k">What to do next</span>
                      <strong className="sw1-act-tier">{decision.tierName}</strong>
                      <p className="sw1-act-h">{decision.headline}</p>
                      <p className="sw1-act-why">
                        Advanced cells (grades 2 to 4) are {f1(decision.inputs.advancedPct)}%, over the trigger of {f1(decision.inputs.a0 + decision.inputs.marginPp)}% (own preflight{' '}
                        {f1(decision.inputs.a0)}% plus our {decision.inputs.marginPp}-point margin).
                      </p>
                      {steps && (
                        <ol className="sw1-act-steps">
                          {decision.actions.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ol>
                      )}
                      <div className="sw1-act-row">
                        <button type="button" className="sw1-link" aria-expanded={steps} onClick={() => setSteps((s) => !s)}>
                          {steps ? 'Hide the steps' : `Show the ${decision.actions.length} steps`}
                        </button>
                        <button type="button" className="sw1-link" onClick={reset}>
                          Run again
                        </button>
                      </div>
                    </div>
                    <ul className="sw1-trust">
                      {res.expert && (
                        <li>
                          <b>{f1(res.expert.spikyPct)}%</b>
                          <span>the expert's own count on this photo</span>
                        </li>
                      )}
                      {ev && (
                        <li>
                          <b>{ev.headline.field_spiky_mae_pp.toFixed(1)} pts</b>
                          <span>average miss on {ev.fields.length} photos it never saw</span>
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="sw1-stage" onPointerMove={tilt} onPointerLeave={untilt}>
            <div className="sw1-plate" ref={plate} data-qa="hero">
              <img src={res?.imageUrl ?? IMG} alt="Microscope photo of red blood cells, field 96" draggable={false} />
              {layers && <SeenMap layers={layers} className="sw1-xray" data-on={xray && phase === 'result' ? 1 : 0} />}
              <div className="sw1-tint" aria-hidden="true" />
              <svg className="sw1-cells" viewBox="0 0 572 572" role="img" aria-label={res ? `${shown.length} cell outlines drawn` : 'No outlines yet'}>
                {order.map((o) => (
                  <polygon
                    key={o.c.id}
                    points={o.d}
                    pathLength={1}
                    className={`sw1-cell${isSpiky(o.c) ? ' hot' : ''}${o.c.border ? ' cut' : ''}${focusId === o.c.id ? ' pick' : ''}`}
                    style={{ ...cvar(COL[o.c.className]), ['--top' as string]: o.top.toFixed(1) } as CSSProperties}
                    onPointerEnter={() => phase === 'result' && setHover(o.c.id)}
                    onClick={() => phase === 'result' && setHover(o.c.id)}
                  />
                ))}
              </svg>
              {hov && loupe && (
                <svg className="sw1-loupe" viewBox="0 0 572 572" aria-hidden="true" key={hov.id} style={cvar(COL[hov.className])}>
                  <defs>
                    <clipPath id="sw1-lclip">
                      <circle cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
                    </clipPath>
                  </defs>
                  <circle className="sw1-l-target" cx={loupe.cx} cy={loupe.cy} r={loupe.rc + 6} />
                  <line className="sw1-l-wire" x1={loupe.a[0]} y1={loupe.a[1]} x2={loupe.b[0]} y2={loupe.b[1]} />
                  <g className="sw1-l-lens">
                    <circle className="sw1-l-bg" cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
                    <g clipPath="url(#sw1-lclip)">
                      <svg x={loupe.lx - loupe.R} y={loupe.ly - loupe.R} width={loupe.R * 2} height={loupe.R * 2} viewBox={`${loupe.vx} ${loupe.vy} ${loupe.w * 2} ${loupe.w * 2}`}>
                        <image className="sw1-l-img" href={res?.imageUrl ?? IMG} x="0" y="0" width="572" height="572" />
                        <polygon className="sw1-l-poly" points={pts(hov.polygon)} />
                      </svg>
                      <circle className="sw1-l-glass" cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
                    </g>
                    <circle className="sw1-l-ring" cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
                    <circle className="sw1-l-ring2" cx={loupe.lx} cy={loupe.ly} r={loupe.R + 7} />
                    {[0, 90, 180, 270].map((d) => (
                      <line
                        key={d}
                        className="sw1-l-tick"
                        x1={loupe.lx + Math.cos((d * Math.PI) / 180) * (loupe.R + 3)}
                        y1={loupe.ly + Math.sin((d * Math.PI) / 180) * (loupe.R + 3)}
                        x2={loupe.lx + Math.cos((d * Math.PI) / 180) * (loupe.R + 13)}
                        y2={loupe.ly + Math.sin((d * Math.PI) / 180) * (loupe.R + 13)}
                      />
                    ))}
                    <rect className="sw1-l-pill" x={loupe.lx - 74} y={loupe.ly + loupe.R + 12} width="148" height="26" rx="13" />
                    <text className="sw1-l-label" x={loupe.lx} y={loupe.ly + loupe.R + 30} textAnchor="middle">
                      {SHORT[hov.className]} · {Math.round(hov.confidence * 100)}%
                    </text>
                  </g>
                </svg>
              )}
              <i className="sw1-scan" aria-hidden="true" />
              <div className="sw1-frame" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <span className="sw1-tag-l">
                Field 96 <i>· x100 light microscope </i>· never seen in training
              </span>
              {res && <span className={`sw1-tag-r${live ? ' live' : ''}`}>{live ? 'LIVE' : 'REPLAY'}</span>}
              {layers && phase === 'result' && (
                <button type="button" className="sw1-xbtn" aria-pressed={xray} onClick={() => setXray((v) => !v)}>
                  <span className="sw1-xbtn-dot" aria-hidden="true" />
                  {xray ? 'Back to the photo' : "See what the outliner sees"}
                </button>
              )}
            </div>
            <p className="sw1-cap">
              {xray && layers && phase === 'result'
                ? "The outliner's own maps of this photo, computed live in this browser: edges red, insides blue."
                : res
                ? live
                  ? `Both models ran in this browser in ${Math.round(res.timing.total.ms)} ms (${res.timing.total.backend}).`
                  : `Replay: ${spike.HONESTY.precomputed}.`
                : 'A real photo of lab blood. Nothing is drawn on it until the models run.'}
            </p>
          </div>

          <aside className="sw1-rail">
            <h2 className="sw1-rail-h">The grader's six shapes</h2>
            <ul className="sw1-shapes">
              {KEYS.map((k) => (
                <li key={k} style={cvar(COL[k])} data-zero={counts[k] === 0 ? 1 : 0}>
                  <img src={spike.ASSETS.url(`gallery/${k}_02.png`)} alt="" loading="lazy" />
                  <span className="sw1-shape-n">{SHORT[k]}</span>
                  <b>{res ? counts[k] : ''}</b>
                  <i style={{ transform: `scaleX(${res ? counts[k] / maxCount : 0})` }} />
                </li>
              ))}
            </ul>
            <p className="sw1-rail-note">Thumbnails: real example cells, graded by experts.</p>
            <div className="sw1-probe" data-on={hov ? 1 : 0}>
              {hov ? (
                <>
                  <span className="sw1-probe-k">{hover === null ? `The grader's surest call · cell ${hov.id}` : `Cell ${hov.id} · the grader's six scores`}</span>
                  <strong style={{ color: COL[hov.className] }}>{spike.CLASS_PLAIN[hov.className]}</strong>
                  <ul>
                    {KEYS.map((k, i) => (
                      <li key={k} style={cvar(COL[k])}>
                        <span>{k}</span>
                        <i style={{ transform: `scaleX(${hov.probs[i]})` }} />
                        <em>{Math.round(hov.probs[i] * 100)}%</em>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <span className="sw1-probe-k">{phase === 'result' ? 'Point at any cell to see how sure the grader is.' : 'After the run, point at any cell.'}</span>
              )}
            </div>
          </aside>
          <span className="sw1-mark">Drifting 3D cells in the background: AI-generated illustration</span>
          <button type="button" className="sw1-cue" onClick={() => story.current?.scrollIntoView({ behavior: 'smooth' })}>
            Why blood, and how it works <span aria-hidden="true">↓</span>
          </button>
        </section>

        {/* ------------------------------------------------------------------ the story */}
        <section className="sw1-story" ref={story}>
          <div className="sw1-ch sw1-ch1">
            <div className="sw1-ch-text">
              <span className="sw1-no">01 · The problem</span>
              <h2>
                In orbit, the body destroys <b>54% more</b> red blood cells.
              </h2>
              <p>
                That is about 3 million every second (a hospital press-release figure). {spike.HONESTY.noCure}.
              </p>
              <p className="sw1-src">Trudel et al., Nature Medicine, 2022 · The Ottawa Hospital, 2022</p>
              <div className="sw1-sky">
                <span className="sw1-sky-y">1973</span>
                <p>
                  On Skylab, NASA counted spiky red cells by hand on an electron microscope: under 1% before flight, up to about 7% late in flight, back under 1% within 2 to 3 hours of re-entry.
                  <small>History only: a different microscope and preparation, so never compared with our numbers. Skylab M115; Barrett 1983.</small>
                </p>
              </div>
            </div>
            <div className="sw1-morph">
              <div className="sw1-morph-view">
                <Suspense fallback={null}>
                  <ShapeCell grade={grade} />
                </Suspense>
                <span className="sw1-ai">AI-generated illustration</span>
              </div>
              <div className="sw1-morph-ctl" role="group" aria-label="Cell shape">
                {['Disc', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'].map((l, i) => (
                  <button key={l} type="button" aria-pressed={grade === i} style={cvar(COL[KEYS[i]])} onClick={() => setGrade(i)}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="sw1-morph-note">{GRADE_NOTE[grade]}</p>
              <div className="sw1-real">
                {Array.from({ length: 8 }, (_, i) => (
                  <img key={`${grade}-${i}`} src={spike.ASSETS.url(`gallery/${KEYS[grade]}_${String(i).padStart(2, '0')}.png`)} alt="" loading="lazy" />
                ))}
                <span>Real cells of this shape under the microscope</span>
              </div>
            </div>
          </div>

          <div className="sw1-ch sw1-strip">
            <span className="sw1-no">02 · From disc to spiky ball</span>
            <h2>Sixty real cells, sorted by how spiky they are.</h2>
            <div className="sw1-strip-row">
              {Array.from({ length: 60 }, (_, i) => (
                <img key={i} src={spike.ASSETS.url(`strip/${String(i).padStart(2, '0')}.png`)} alt="" loading="lazy" />
              ))}
            </div>
            <div className="sw1-strip-bar">
              <span>smooth disc</span>
              <i />
              <span>ball of spikes</span>
            </div>
            <p className="sw1-src">{spike.HONESTY.gaugeLabel}</p>
          </div>

          <div className="sw1-ch sw1-mission">
            <span className="sw1-no">03 · One mission, four photos</span>
            <h2>The same check at four points of a mission.</h2>
            <div className="sw1-mis-row">
              {mission?.steps.map((s, i) => {
                const r = mission.results[i]
                return (
                  <figure key={s.label} data-tier={s.decision.tier}>
                    <div className="sw1-mis-img">
                      <img src={r.imageUrl ?? ''} alt={`Microscope field for ${s.label}`} loading="lazy" />
                      <div className="sw1-tint" aria-hidden="true" />
                      <svg viewBox="0 0 572 572" aria-hidden="true">
                        {r.cells.map((c) => (
                          <polygon key={c.id} points={pts(c.polygon)} className={isSpiky(c) ? 'hot' : ''} style={cvar(COL[c.className])} />
                        ))}
                      </svg>
                    </div>
                    <figcaption>
                      <span>{s.label}</span>
                      <b>
                        {f1(s.metrics.spikyPct)}
                        <i>% spiky</i>
                      </b>
                      <em>{s.decision.tierName}</em>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
            <p className="sw1-src">
              {spike.HONESTY.timeline}. {spike.HONESTY.oneFieldOneSample}
            </p>
          </div>

          <div className="sw1-ch sw1-tri">
            <span className="sw1-no">04 · Inside the check</span>
            <h2>One photo, three ways of seeing it.</h2>
            <div className="sw1-tri-row" data-n={layers ? 3 : 2}>
              <figure>
                <div className="sw1-tri-img">
                  <img src={IMG} alt="The microscope photo the check reads" loading="lazy" />
                </div>
                <figcaption>
                  <b>1 · The photo</b>
                  <span>What the microscope gives: one grey field, nothing marked.</span>
                </figcaption>
              </figure>
              {layers && (
                <figure>
                  <div className="sw1-tri-img is-seen">
                    <SeenMap layers={layers} className="sw1-tri-canvas" />
                  </div>
                  <figcaption>
                    <b>2 · What the outliner sees</b>
                    <span>Its own output on this photo, computed in your browser: red for cell edges, blue for cell inside.</span>
                  </figcaption>
                </figure>
              )}
              <figure>
                <div className="sw1-tri-img">
                  <img src={IMG} alt="" loading="lazy" />
                  <svg viewBox="0 0 572 572" aria-hidden="true">
                    {(mission?.results[3]?.cells ?? []).map((c) => (
                      <polygon key={c.id} points={pts(c.polygon)} className={isSpiky(c) ? 'hot' : ''} style={cvar(COL[c.className])} />
                    ))}
                  </svg>
                </div>
                <figcaption>
                  <b>{layers ? '3' : '2'} · What the grader decides</b>
                  <span>One outline per cell, coloured by the shape the grader names.</span>
                </figcaption>
              </figure>
            </div>
          </div>

          <div className="sw1-ch sw1-work">
            <div className="sw1-work-l">
              <span className="sw1-no">05 · The work behind it</span>
              <h2>Two small networks, built to run in a browser.</h2>
              <ol className="sw1-pipe">
                <li>
                  <b>The photo</b>
                  <span>One grey microscope field of a blood smear.</span>
                </li>
                <li>
                  <b>Outliner · 12 MB</b>
                  <span>Marks every pixel as background, cell or edge, then draws one outline per cell.</span>
                </li>
                <li>
                  <b>Grader · 34 MB</b>
                  <span>Names each cell's shape: disc, spiky grade 1 to 4, or cup.</span>
                </li>
                <li>
                  <b>Your own baseline</b>
                  <span>The spiky share is compared with your preflight sample plus a 10-point margin.</span>
                </li>
              </ol>
              <ul className="sw1-honest">
                <li>{spike.HONESTY.heldOut}</li>
                <li>{spike.HONESTY.data}</li>
                <li>{spike.HONESTY.notDiagnosis}</li>
                <li>{spike.HONESTY.ourRule}</li>
              </ul>
              <p className="sw1-src">Models: MobileNetV4 (Qin et al. 2024, timm weights, Apache-2.0) · Data: RedTell (Sadafi et al. 2023, CC BY 4.0) · onnxruntime-web (MIT)</p>
            </div>
            <div className="sw1-work-r">
              {ev && (
                <>
                  <svg className="sw1-scatter" viewBox="-34 -10 254 244" role="img" aria-label="Expert spiky percent against model spiky percent for 152 held-out photos">
                    <rect x="0" y="0" width="200" height="200" />
                    <line x1="0" y1="200" x2="200" y2="0" />
                    {[0, 50, 100].map((v) => (
                      <g key={v}>
                        <text x={v * 2} y="216" textAnchor="middle" data-qa="tick">
                          {v}
                        </text>
                        <text x="-8" y={200 - v * 2 + 4} textAnchor="end" data-qa="tick">
                          {v}
                        </text>
                      </g>
                    ))}
                    {ev.fields.map((f, i) => (
                      <circle key={i} cx={f.expert_spiky_pct * 2} cy={200 - f.pred_spiky_pct * 2} r="2.6" />
                    ))}
                    <text x="100" y="232" textAnchor="middle" className="ax">
                      expert count, % spiky
                    </text>
                    <text x="-26" y="100" textAnchor="middle" className="ax" transform="rotate(-90 -26 100)">
                      model, % spiky
                    </text>
                  </svg>
                  <div className="sw1-nums">
                    <p>
                      <b>{ev.fields.length}</b>
                      <span>photos the model never saw</span>
                    </p>
                    <p>
                      <b>{ev.headline.field_spiky_mae_pp.toFixed(1)}</b>
                      <span>points average miss from the expert count</span>
                    </p>
                    <p>
                      <b>{ev.headline.field_spiky_r.toFixed(2)}</b>
                      <span>correlation with the expert</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <footer className="sw1-foot">
            <button type="button" className="sw1-go ghost" onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to the check <span aria-hidden="true">↑</span>
            </button>
            <span className="sw1-mark">Drifting 3D cells in the background: AI-generated illustration</span>
          </footer>
        </section>
      </div>
    </div>
  )
}

// The outliner's own three-plane output (background, cell inside, cell edge) painted as light: edges glow red, insides blue.
function SeenMap({ layers, className, ...rest }: { layers: spike.SpikeLayers; className: string; 'data-on'?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const N = 572
    const P = N * N
    const pp = layers.pixelProbs
    const off = document.createElement('canvas')
    off.width = N
    off.height = N
    const octx = off.getContext('2d')
    const ctx = cv.getContext('2d')
    if (!octx || !ctx) return
    const img = octx.createImageData(N, N)
    const d = img.data
    for (let i = 0; i < P; i++) {
      const inner = pp[P + i]
      const edge = pp[2 * P + i]
      d[i * 4] = Math.min(255, edge * 255 + inner * 16)
      d[i * 4 + 1] = Math.min(255, edge * 84 + inner * 58)
      d[i * 4 + 2] = Math.min(255, edge * 64 + inner * 150)
      d[i * 4 + 3] = 255
    }
    octx.putImageData(img, 0, 0)
    cv.width = N
    cv.height = N
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, N, N)
    ctx.filter = 'blur(6px)'
    ctx.globalAlpha = 0.9
    ctx.drawImage(off, 0, 0)
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(off, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
  }, [layers])
  return <canvas ref={ref} className={className} aria-hidden="true" {...rest} />
}

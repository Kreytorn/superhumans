// TrackTrace W1 ("inside the beamline"), the parts that more than one page shows: the first screen (one WebGL room
// behind the page, the hero nucleus as a 3D hologram, the working stage in an instrument window, the count rail and
// "What to do next") and section 01, "The problem". Used by #/proto/tracktrace_w1/home (./index.tsx) and by the DF
// TrackTrace check page (../DF/pages/tracktrace.tsx). Every result on screen is the engine's output.
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as tt from '../../engine/tracktrace'
import type { NucleusResult, TrackTraceAct, WellResult } from '../../engine/tracktrace'
import TrackTraceMoment, { type MomentBeat, type MomentState, type TrackTraceMomentHandle } from './stage'
import { createScene, type Nucleus3D, type SceneHandle } from './scene'
import { HERO, HERO_3D, LINE, XRAY, tierOf } from './ids'
import ReviewLine, { reviewOf } from '../../components/ReviewLine'
import './w1.css'

const SENTENCE = 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.'

// ---- a real gallery nucleus with the engine's stored circles and line -------------------------------------
function drawNucleus(g: CanvasRenderingContext2D, x: Float32Array, off: number, S: number, tint: [number, number, number]) {
  const N = 128
  const vals: number[] = []
  for (let i = 0; i < N * N; i += 3) if (x[off + i] > 0) vals.push(x[off + i])
  vals.sort((a, b) => a - b)
  const hi = vals.length ? vals[Math.floor(vals.length * 0.997)] : 1
  const c = document.createElement('canvas')
  c.width = c.height = N
  const cg = c.getContext('2d')!
  const im = cg.createImageData(N, N)
  for (let i = 0; i < N * N; i++) {
    const v = Math.min(1, x[off + i] / hi)
    const k = Math.pow(v, 0.85)
    im.data[i * 4] = tint[0] * k
    im.data[i * 4 + 1] = tint[1] * k
    im.data[i * 4 + 2] = tint[2] * k
    im.data[i * 4 + 3] = x[off + i] > 0 ? 255 : 0
  }
  cg.putImageData(im, 0, 0)
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(c, 0, 0, S, S)
}

function NucleusView({ id, marks, name }: { id: string; marks: boolean; name: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [r, setR] = useState<NucleusResult | null>(null)
  useEffect(() => {
    let off = false
    tt.replay(id).then((x) => !off && setR(x)).catch(() => undefined)
    return () => {
      off = true
    }
  }, [id])
  useEffect(() => {
    const c = ref.current
    if (!c || !r) return
    const S = 560
    const k = S / 128
    c.width = c.height = S
    const g = c.getContext('2d')!
    g.clearRect(0, 0, S, S)
    drawNucleus(g, r.x, 0, S, [226, 236, 244])
    if (!marks) return
    g.lineWidth = 3
    g.strokeStyle = '#ff4fb0'
    g.shadowColor = 'rgba(255,79,176,0.9)'
    g.shadowBlur = 14
    if (r.line.drawn && r.line.p0 && r.line.p1) {
      g.beginPath()
      g.moveTo((r.line.p0[1] + 0.5) * k, (r.line.p0[0] + 0.5) * k)
      g.lineTo((r.line.p1[1] + 0.5) * k, (r.line.p1[0] + 0.5) * k)
      g.stroke()
    }
    for (const ci of r.circles) {
      g.beginPath()
      g.arc((ci.x + 0.5) * k, (ci.y + 0.5) * k, Math.max(11, (ci.radiusPx ?? 2) * k + 6), 0, Math.PI * 2)
      g.stroke()
    }
  }, [r, marks])
  return (
    <figure className="w1-nuc">
      <div className="w1-nuc-pic">
        <canvas ref={ref} aria-label={`Microscope image of one cell nucleus, ${name}`} role="img" />
      </div>
      <figcaption>
        <b>{name}</b>
        {r && marks && (
          <span>
            {r.count} damage spots · {r.line.drawn ? `${r.line.nInliers} in a straight line` : 'no straight line'}
          </span>
        )}
        {r && !marks && <span>Real microscope image, held-out mouse</span>}
      </figcaption>
    </figure>
  )
}

// ---- a band of real nuclei from the hero's sample ----------------------------------------------------------
function SampleBand() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    let off = false
    const timer = setTimeout(() => {
      tt.wellImages('P242_G4')
        .then((all) => {
          const c = ref.current
          if (off || !c) return
          const total = Math.floor(all.length / (128 * 128))
          const COLS = 26
          const ROWS = 2
          const T = 112
          c.width = COLS * T
          c.height = ROWS * T
          const g = c.getContext('2d')!
          const tile = document.createElement('canvas')
          tile.width = tile.height = T
          const tg = tile.getContext('2d')!
          for (let i = 0; i < COLS * ROWS && i < total; i++) {
            tg.clearRect(0, 0, T, T)
            drawNucleus(tg, all, i * 128 * 128, T, [205, 226, 244])
            g.drawImage(tile, (i % COLS) * T, Math.floor(i / COLS) * T)
          }
          setN(total)
        })
        .catch(() => undefined)
    }, 900)
    return () => {
      off = true
      clearTimeout(timer)
    }
  }, [])
  return (
    <div className="w1-band" data-on={n ? '1' : '0'}>
      <div className="w1-band-run">
        <canvas ref={ref} role="img" aria-label="Real nuclei from the hero's sample" />
      </div>
      <p className="w1-band-cap">
        <b>{n || '…'}</b> nuclei in one sample. Every one a real microscope image; a few of them shown here.
      </p>
    </div>
  )
}

// ---- four beams, real nuclei (letladder.json example images; pictures only, never a result) ---------------
interface Rung {
  rung: string
  condition: { name: string }
  examples: { key: string; x_u8_png_b64: string }[]
}
const RUNG_NAME: Record<string, string> = { 'X-ray': 'X-rays', Si: 'Silicon ions', Ar: 'Argon ions', Fe: 'Iron ions' }
function IonLadder() {
  const [rungs, setRungs] = useState<Rung[]>([])
  useEffect(() => {
    let off = false
    const timer = setTimeout(() => {
      tt.loadLetLadder()
        .then((j) => !off && setRungs(((j as { rungs?: Rung[] }).rungs ?? []).filter((r) => r.examples?.length)))
        .catch(() => undefined)
    }, 1200)
    return () => {
      off = true
      clearTimeout(timer)
    }
  }, [])
  return (
    <div className="w1-ladder4" data-on={rungs.length ? '1' : '0'}>
      <div className="w1-ladder4-head">
        <h3>Space sends more than iron.</h3>
        <p>Real nuclei from four ground beams: X-rays, then lighter to heavier ions. Pictures only: {tt.HONESTY.letLadder}.</p>
      </div>
      <div className="w1-ladder4-row">
        {rungs.map((r, k) => (
          <figure key={r.rung} className="w1-rung" style={{ ['--k' as string]: k }}>
            <div className="w1-rung-pics">
              {r.examples.slice(0, 4).map((e) => (
                <img key={e.key} src={`data:image/png;base64,${e.x_u8_png_b64}`} alt="" />
              ))}
            </div>
            <figcaption>
              <b>{RUNG_NAME[r.rung] ?? r.rung}</b>
              <span>{r.condition?.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

// ---- repair curve (real lab data from results/summary.json, not model output) -----------------------------
interface Repair {
  hours: number[]
  fe_0_82Gy: number[]
  xray_1Gy: number[]
}
function RepairChart() {
  const [d, setD] = useState<Repair | null>(null)
  useEffect(() => {
    let off = false
    tt.loadSummary().then((s) => !off && setD((s as { repair_curve?: Repair }).repair_curve ?? null)).catch(() => undefined)
    return () => {
      off = true
    }
  }, [])
  if (!d) return <div className="w1-chart" />
  const W = 560
  const H = 400
  const L = 62
  const R = 138
  const T = 26
  const B = 44
  const max = Math.max(...d.fe_0_82Gy, ...d.xray_1Gy) * 1.12
  const X = (h: number) => L + ((h - d.hours[0]) / (d.hours[d.hours.length - 1] - d.hours[0])) * (W - L - R)
  const Y = (v: number) => H - B - (v / max) * (H - T - B)
  const path = (v: number[]) => v.map((y, i) => `${i ? 'L' : 'M'}${X(d.hours[i]).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')
  const series: { name: string; v: number[]; cls: string }[] = [
    { name: 'Iron ion', v: d.fe_0_82Gy, cls: 'fe' },
    { name: 'X-rays', v: d.xray_1Gy, cls: 'xr' },
  ]
  const last = d.hours.length - 1
  return (
    <figure className="w1-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mean damage spots per nucleus over time, iron ion against X-rays">
        <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} className="ax" />
        {d.hours.map((h) => (
          <g key={h}>
            <line x1={X(h)} x2={X(h)} y1={T} y2={Y(0)} className="grid" />
            <text x={X(h)} y={H - 16} textAnchor="middle" className="tick" data-qa="tick">{h} h</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.cls} className={s.cls}>
            <path d={path(s.v)} className="ln" pathLength={1} />
            {s.v.map((y, i) => (
              <g key={i}>
                <circle cx={X(d.hours[i])} cy={Y(y)} r={5} className="pt" />
                {i === 0 && (
                  <text x={X(d.hours[i]) - 12} y={Y(y) + 5} textAnchor="end" className="val" data-qa="tick">{y.toFixed(2)}</text>
                )}
                {i > 0 && i < last && (
                  <text x={X(d.hours[i]) + (s.cls === 'fe' ? 10 : -10)} y={Y(y) + (s.cls === 'fe' ? -12 : 24)} textAnchor={s.cls === 'fe' ? 'start' : 'end'} className="val" data-qa="tick">{y.toFixed(2)}</text>
                )}
              </g>
            ))}
            <text x={X(d.hours[last]) + 14} y={Y(s.v[last]) + (s.cls === 'fe' ? -4 : 14)} className="lab">{s.name} {s.v[last].toFixed(2)}</text>
          </g>
        ))}
      </svg>
      <figcaption>Mean damage spots per nucleus after exposure. The study’s own counts, from NASA’s open data: data, not model output.</figcaption>
    </figure>
  )
}

// ---- a drawn diagram of what happens in the cell (illustration, marked as such) ---------------------------
function CellDiagram() {
  const helix = (y0: number, ph: number) =>
    Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${20 + i * 6.5},${(y0 + Math.sin(i * 0.42 + ph) * 16).toFixed(1)}`).join(' ')
  return (
    <figure className="w1-diagram">
      <div className="w1-steps">
        <div className="w1-step">
          <svg viewBox="0 0 300 190" aria-hidden="true">
            <ellipse cx="150" cy="98" rx="104" ry="68" className="cell" />
            <ellipse cx="150" cy="98" rx="62" ry="42" className="nucleus" />
            <line x1="14" y1="160" x2="286" y2="30" className="ion" />
            <circle r="5" className="ionhead">
              <animateMotion dur="2.6s" repeatCount="indefinite" path="M14,160 L286,30" />
            </circle>
          </svg>
          <b>1 · A heavy ion crosses the cell</b>
          <p>It does not scatter. It goes straight through the nucleus.</p>
        </div>
        <div className="w1-step">
          <svg viewBox="0 0 300 190" aria-hidden="true">
            <path d={helix(96, 0)} className="dna" />
            <path d={helix(96, Math.PI)} className="dna" />
            {Array.from({ length: 13 }, (_, i) => {
              const x = 30 + i * 19.5
              const k = ((x - 20) / 6.5) * 0.42
              return i === 6 ? null : <line key={i} x1={x} x2={x} y1={96 + Math.sin(k) * 16} y2={96 + Math.sin(k + Math.PI) * 16} className="rung" />
            })}
            <rect x="140" y="62" width="14" height="68" className="gap" />
            <circle cx="147" cy="96" r="26" className="repair" />
            <circle cx="147" cy="96" r="9" className="repair-core" />
          </svg>
          <b>2 · DNA breaks along its way</b>
          <p>At each break a repair protein piles up into a bright spot.</p>
        </div>
        <div className="w1-step">
          <svg viewBox="0 0 300 190" aria-hidden="true">
            <ellipse cx="150" cy="98" rx="112" ry="72" className="nucleus" />
            <line x1="70" y1="142" x2="232" y2="52" className="fit" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <circle cx={78 + i * 37} cy={138 - i * 20.5} r="5" className="spot" />
                <circle cx={78 + i * 37} cy={138 - i * 20.5} r="12" className="ring" style={{ animationDelay: `${i * 0.18}s` }} />
              </g>
            ))}
          </svg>
          <b>3 · The spots line up</b>
          <p>Under the microscope the row of spots is the ion’s track.</p>
        </div>
      </div>
      <span className="w1-mark">AI-generated illustration</span>
    </figure>
  )
}

// ---- section 01: the problem ---------------------------------------------------------------------------------
export const ProblemSection = memo(function ProblemSection() {
  const [marks, setMarks] = useState(false)
  return (
    <section className="w1-sec" id="w1-problem">
      <header className="w1-sec-head">
        <span className="w1-num">01</span>
        <div>
          <span className="w1-k">The problem</span>
          <h2>Out there, radiation flies straight through you.</h2>
          <p className="w1-lede">
            Cosmic rays carry heavy ions, such as iron. X-rays leave damage here and there. A heavy ion leaves it in a line.
          </p>
        </div>
      </header>
      <CellDiagram />
      <SampleBand />
      <div className="w1-bet">
        <div className="w1-bet-head">
          <h3>Two cells. One met X-rays, one met an iron ion. Which one?</h3>
          <button type="button" className="w1-btn ghost" aria-pressed={marks} onClick={() => setMarks((m) => !m)}>
            {marks ? 'Hide what IonScan found' : 'Show what IonScan found'}
          </button>
        </div>
        <div className="w1-pair">
          <NucleusView id={XRAY} marks={marks} name={marks ? 'X-rays' : 'Cell A'} />
          <NucleusView id={LINE} marks={marks} name={marks ? 'Iron ion' : 'Cell B'} />
          <div className="w1-repair">
            <h3>The cell repairs itself. After an iron ion, more slowly.</h3>
            <RepairChart />
          </div>
        </div>
        <p className="w1-fine">{tt.HONESTY.gallery} Stored outputs of IonScan: precomputed. {tt.HONESTY.trackLine}</p>
      </div>
      <IonLadder />
    </section>
  )
})

// ---- the first screen ------------------------------------------------------------------------------------------
export interface W1RoomProps {
  /** ?state= pin for tests and stills. The first press lets go of it and runs the stage. */
  pin?: 'idle' | 'result'
  /** false = lay the screen out, but start neither the WebGL room nor the stage yet (DF: until its zoom has landed). */
  live?: boolean
  /** The nucleus on stage at first (default: the iron-ion hero). */
  sample?: string
  /** The bar across the top of the first screen. */
  top?: ReactNode
  /** Everything under the first screen. Pass a stable element (useMemo): the stage's beats re-render this screen often. */
  after?: ReactNode
  /** The button under the first screen that glides to section 01. */
  onCue: () => void
  /** Its words (default "The story behind it"; the DF page says "The problem, and the model", like every DF check). */
  cue?: string
  onState?: (s: MomentState) => void
  /** True once the stage's specimen (or its pinned frame) is on screen. */
  onReady?: (ready: boolean) => void
  /** The whole sample's "what to do next" after each run (null until a run has settled). */
  onAct?: (act: TrackTraceAct | null) => void
  className?: string
}

export function W1Room({ pin, live = true, sample: first = HERO, top, after, onCue, cue = 'The story behind it', onState: tellState, onReady: tellReady, onAct, className }: W1RoomProps) {
  const [pinned, setPinned] = useState(pin)
  const [sample, setSample] = useState(first)
  const [mState, setMState] = useState<MomentState>('idle')
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [result, setResult] = useState<NucleusResult | null>(null)
  const [act, setAct] = useState<TrackTraceAct | null>(null)
  const [well, setWell] = useState<WellResult | null>(null)
  const [ready, setReady] = useState(false)
  const [slices, setSlices] = useState<number | null>(null)
  const stage = useRef<TrackTraceMomentHandle>(null)
  const glHost = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  /** A press on a pinned stage lets go of the pin; the run starts once the stage has its nucleus on screen again. */
  const runNext = useRef(false)

  // The room gets a fresh canvas each time it starts and drops it when it stops, so its WebGL context is handed
  // back at once (a page opened many times never runs out of contexts) and a lost context is never left on screen.
  useEffect(() => {
    const host = glHost.current
    if (!live || !host) return
    const c = document.createElement('canvas')
    c.className = 'w1-gl'
    c.setAttribute('aria-hidden', 'true')
    host.appendChild(c)
    let h: SceneHandle | null = null
    try {
      h = createScene(c, { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches })
    } catch {
      c.remove()
      return
    }
    sceneRef.current = h
    h.setSlot(slotRef.current)
    let off = false
    tt.load3D(HERO_3D)
      .then((j) => {
        if (off || !h) return
        const n = j as unknown as Nucleus3D & { frame: { n_slices?: number } }
        h.setNucleus(n)
        setSlices(n.frame.n_slices ?? null)
      })
      .catch(() => undefined)
    return () => {
      off = true
      h?.dispose()
      sceneRef.current = null
      c.remove()
    }
  }, [live])

  const isHero = sample === HERO
  const running = mState === 'running'
  const done = mState === 'result'
  const count = done ? (result?.count ?? 0) : running ? (beat?.count ?? 0) : 0
  const lineOn = done ? !!result?.line.drawn : running ? !!beat?.line : false
  useEffect(() => {
    sceneRef.current?.setPhase({
      hot: isHero && (done || (running && count > 0)) ? 1 : 0,
      scan: running ? (beat?.scan ?? -1) : -1,
      count: isHero ? count : 0,
      line: isHero && lineOn,
    })
  }, [isHero, done, running, count, lineOn, beat?.scan])

  useEffect(() => {
    tellState?.(mState)
  }, [tellState, mState])
  useEffect(() => {
    tellReady?.(ready)
    if (ready && runNext.current) {
      runNext.current = false
      void stage.current?.run()
    }
  }, [tellReady, ready])
  useEffect(() => {
    onAct?.(act)
  }, [onAct, act])

  const onResult = useCallback((r: NucleusResult, a: TrackTraceAct | null, w: WellResult | null) => {
    setResult(r)
    setAct(a)
    setWell(w)
  }, [])
  const onState = useCallback((s: MomentState) => {
    setMState(s)
    if (s === 'idle' || s === 'running') setResult(null)
  }, [])
  const pick = (id: string) => {
    if (id === sample) return
    runNext.current = false
    setPinned(undefined)
    setSample(id)
    setResult(null)
    setBeat(null)
    setMState('idle')
  }
  const press = () => {
    if (running) return
    if (pinned) {
      runNext.current = true
      setPinned(undefined)
      return
    }
    void stage.current?.run()
  }
  const tier = tierOf(done ? act : null)
  const tag = result ? (result.source === 'live' ? `LIVE ${Math.round(result.timing.ms)} ms` : 'REPLAY') : ''

  return (
    <div className={`w1${className ? ` ${className}` : ''}`} data-ready={ready ? '1' : '0'} data-state={mState} data-sample={sample} data-line={lineOn ? '1' : '0'}>
      <div ref={glHost} className="w1-gl-host" aria-hidden="true" />
      <div className="w1-vignette" aria-hidden="true" />

      {top}

      <main className="w1-first" id="w1-check">
        <div className="w1-left">
          <span className="w1-k">Check 1 of 6 · Radiation · Cells</span>
          <h1>TrackTrace</h1>
          <p className="w1-sentence">{SENTENCE}</p>
          <div className="w1-actions">
            <button type="button" className="w1-btn" data-qa="primary" data-busy={running ? '1' : '0'} disabled={running || !live} onClick={press}>
              <span className="w1-btn-dot" aria-hidden="true" />
              {running ? 'IonScan is reading' : done ? 'Scan again' : 'Scan this nucleus'}
            </button>
            <div className="w1-seg" role="radiogroup" aria-label="Which nucleus">
              <button type="button" role="radio" aria-checked={sample === HERO} onClick={() => pick(HERO)}>Iron ion</button>
              <button type="button" role="radio" aria-checked={sample === XRAY} onClick={() => pick(XRAY)}>X-rays</button>
            </div>
          </div>
          <div className="w1-holo" data-dim={isHero ? '0' : '1'}>
            <div className="w1-holo-slot" ref={slotRef} />
            <span className="w1-holo-tl" aria-hidden="true" />
            <span className="w1-holo-br" aria-hidden="true" />
            <p className="w1-holo-cap">
              <b>The iron-ion nucleus in 3D</b>
              <span>
                rebuilt from its {slices ?? ''} image slices · {tt.HONESTY.zScale}
                {isHero && lineOn ? ` · ${tt.HONESTY.lineLabel}` : ''}
              </span>
            </p>
          </div>
        </div>

        <div className="w1-right">
          <div className="w1-window">
            <span className="w1-corner tl" aria-hidden="true" />
            <span className="w1-corner tr" aria-hidden="true" />
            <span className="w1-corner bl" aria-hidden="true" />
            <span className="w1-corner br" aria-hidden="true" />
            {live ? (
              <TrackTraceMoment
                key={sample}
                ref={stage}
                sampleId={sample}
                state={pinned}
                promise="Press Scan and watch IonScan read this nucleus."
                onResult={onResult}
                onState={onState}
                onBeat={setBeat}
                onReady={setReady}
              />
            ) : (
              <div className="w1-window-wait" aria-hidden="true" />
            )}
            <span className="w1-window-tag">{isHero ? tt.HONESTY.heroCaption : 'X-ray beam, ground lab. Nucleus from a mouse the model never saw.'}</span>
          </div>

          <div className="w1-rail" data-on={done && result ? '1' : '0'} data-tier={tier ?? 'NONE'} aria-live="polite">
            <div className="w1-rail-count">
              <span className="w1-k">Damage spots in this nucleus</span>
              <div className="w1-vs">
                <div>
                  <b>{done || (running && count > 0) ? count : '–'}</b>
                  <i>IonScan{tag ? ` · ${tag}` : ''}</i>
                </div>
                <div className="nasa">
                  <b>{done && result && result.nfoci2016 !== null ? Math.round(result.nfoci2016) : '–'}</b>
                  <i>Count in NASA’s dataset</i>
                </div>
              </div>
            </div>
            <div className="w1-rail-act">
              <span className="w1-k">What to do next</span>
              {done && act ? (
                <>
                  <p className="w1-act-line">{act.headline}</p>
                  <p className="w1-act-sub">
                    <em>{act.tierName}</em>
                    {well ? ` · ${well.nuclei.length} cells in this sample decide it` : ' · the whole sample decides it'} · {tt.HONESTY.precomputed}
                  </p>
                  <ReviewLine review={reviewOf(act.whoActs)} className="is-after" color="var(--mc, var(--tier))" />
                </>
              ) : (
                <p className="w1-act-quiet">{running ? 'Reading the nucleus, then its whole sample.' : 'One press. The whole sample decides; the action lands here.'}</p>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="w1-cue" onClick={onCue}>
          {cue} <span aria-hidden="true">↓</span>
        </button>
      </main>

      {after}
    </div>
  )
}

// TrackTrace, free version W1 ("inside the beamline"): the check as a place. One WebGL room behind the whole page
// (straight streaks of light, soft discs, the hero nucleus as a 3D hologram from the shipped stack), the working
// stage in an instrument window, and a walk-through below. Every result on screen is the engine's output.
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as tt from '../../engine/tracktrace'
import type { NucleusResult, TrackTraceAct, WellResult } from '../../engine/tracktrace'
import TrackTraceMoment, { type MomentBeat, type MomentState, type TrackTraceMomentHandle } from './stage'
import { G, scanStep } from './stage/stage'
import { createScene, type Nucleus3D, type SceneHandle } from './scene'
import './w1.css'

const HERO = 'nucleus-238'
const XRAY = 'nucleus-241'
const LINE = 'nucleus-239'
const HERO_3D = 'P242_G4_003_003'
const SENTENCE = 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.'
const base = import.meta.env.BASE_URL

type Tier = 'GREEN' | 'YELLOW' | 'ORANGE' | null
const tierOf = (a: TrackTraceAct | null): Tier => (a ? a.tierRef : null)
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
      <figcaption>Mean damage spots per nucleus after exposure. NASA’s own counts from the lab study: data, not model output.</figcaption>
    </figure>
  )
}

// ---- the eight scans, in the real order (scanStep from the stage: rows, columns, both diagonals, each both ways)
const SCAN_NAMES = ['rows →', 'rows ←', 'columns ↓', 'columns ↑', 'diagonal ↗', 'diagonal ↙', 'diagonal ↘', 'diagonal ↖']
function EightScans() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [active, setActive] = useState(0)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let raf = 0
    let off = false
    let tok: Float32Array | null = null
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    tt.sampleImage(HERO)
      .then((x) => {
        const t = new Float32Array(G * G)
        let mx = 0
        for (let i = 0; i < G; i++)
          for (let j = 0; j < G; j++) {
            let s = 0
            for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) s += x[(i * 4 + a) * 128 + j * 4 + b]
            t[i * G + j] = s / 16
            mx = Math.max(mx, s / 16)
          }
        for (let i = 0; i < t.length; i++) t[i] = Math.pow(t[i] / (mx || 1), 0.7)
        if (!off) tok = t
      })
      .catch(() => undefined)
    const DUR = 1150
    const t0 = performance.now()
    let lastK = -1
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const r = c.getBoundingClientRect()
      if (r.bottom < 0 || r.top > innerHeight || !tok) return
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const narrow = r.width < 520
      const COLS = narrow ? 2 : 4
      const ROWS = 8 / COLS
      const gap = 14
      const tw = (r.width - gap * (COLS - 1)) / COLS
      const w = Math.round(r.width * dpr)
      const h = Math.round((tw * ROWS + gap * (ROWS - 1)) * dpr)
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, r.width, r.height)
      const el = reduced ? DUR * 8 - 1 : (performance.now() - t0) % (DUR * 9)
      const k = Math.min(7, Math.floor(el / DUR))
      const p = el >= DUR * 8 ? 1 : (el - k * DUR) / DUR
      if (k !== lastK) {
        lastK = k
        setActive(k)
      }
      const cell = tw / G
      for (let s = 0; s < 8; s++) {
        const ox = (s % COLS) * (tw + gap)
        const oy = Math.floor(s / COLS) * (tw + gap)
        const prog = s < k ? 1 : s === k ? p : 0
        const front = prog * (G + 3)
        g.fillStyle = s === k ? 'rgba(143,214,255,0.07)' : 'rgba(143,214,255,0.03)'
        g.fillRect(ox, oy, tw, tw)
        for (let i = 0; i < G; i++)
          for (let j = 0; j < G; j++) {
            const st = scanStep(s, i, j)
            const v = tok[i * G + j]
            const d = front - st
            let a = 0.05 + 0.06 * v
            let col = '143,214,255'
            if (d >= 0) {
              a = 0.1 + 0.9 * v
              col = '226,238,248'
              if (d < 2.5 && s === k && prog < 1) {
                a = 1
                col = '255,255,255'
              }
            }
            g.fillStyle = `rgba(${col},${a.toFixed(3)})`
            g.fillRect(ox + j * cell + 0.5, oy + i * cell + 0.5, cell - 1, cell - 1)
          }
        g.strokeStyle = s === k ? 'rgba(143,214,255,0.75)' : 'rgba(143,214,255,0.16)'
        g.lineWidth = 1
        g.strokeRect(ox + 0.5, oy + 0.5, tw - 1, tw - 1)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      off = true
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <figure className="w1-scans">
      <canvas ref={ref} role="img" aria-label="The eight scans of IonScan over its 32 by 32 grid" />
      <ol className="w1-scan-names">
        {SCAN_NAMES.map((n, i) => (
          <li key={n} data-on={i === active ? '1' : '0'}>
            <i>{i + 1}</i>
            {n}
          </li>
        ))}
      </ol>
      <figcaption>How IonScan reads every nucleus. The scans show reading order, not a found direction.</figcaption>
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

// ---- four samples, four days: the engine's act() on the plan's demo timeline -----------------------------
function Timeline() {
  const [rows, setRows] = useState<{ day: number; act: TrackTraceAct; n: number }[]>([])
  useEffect(() => {
    let off = false
    tt.listWells()
      .then((wells) => {
        const out: { day: number; act: TrackTraceAct; n: number }[] = []
        for (const d of tt.DEMO_TIMELINE) {
          const w = wells.find((x) => x.wellId === d.wellId)
          if (w) out.push({ day: d.day, act: tt.act(w), n: w.nNuclei })
        }
        if (!off) setRows(out)
      })
      .catch(() => undefined)
    return () => {
      off = true
    }
  }, [])
  return (
    <ol className="w1-days">
      {rows.map((r) => (
        <li key={r.day} data-tier={tierOf(r.act) ?? 'NONE'}>
          <span className="w1-day">Day {r.day}</span>
          <b>{r.act.tierName.split(':')[0]}</b>
          <em>{r.act.whoActs}</em>
          <p>{r.act.headline}</p>
        </li>
      ))}
    </ol>
  )
}

// ---- the walk-through below the first screen ------------------------------------------------------------------
interface Headline {
  test_mice: number
  test_nuclei: number
  foci_count_spearman_vs_nasa: number
  foci_f1: number
  sample_verdict: { particle: number; dose: number; time: number; n_wells: number }
}
const Story = memo(function Story({ act }: { act: TrackTraceAct | null }) {
  const [marks, setMarks] = useState(false)
  const [head, setHead] = useState<Headline | null>(null)
  useEffect(() => {
    let off = false
    tt.loadSummary().then((s) => !off && setHead((s as { headline?: Headline }).headline ?? null)).catch(() => undefined)
    return () => {
      off = true
    }
  }, [])
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <div className="w1-story">
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

      <section className="w1-sec" id="w1-ionscan">
        <header className="w1-sec-head">
          <span className="w1-num">02</span>
          <div>
            <span className="w1-k">The work behind the check</span>
            <h2>IonScan reads every nucleus eight times.</h2>
            <p className="w1-lede">
              It cuts the image into a 32 × 32 grid and reads it along four directions, each both ways, with a selective memory: like a
              particle detector adding up hits along a path. Then attention.
            </p>
          </div>
        </header>
        <div className="w1-work">
          <div className="w1-work-left">
          <EightScans />
          {head && (
            <div className="w1-proof">
              <div>
                <b>{head.test_nuclei.toLocaleString('en-US')}</b>
                <span>test nuclei from {head.test_mice} mice it never saw</span>
              </div>
              <div>
                <b>{head.foci_count_spearman_vs_nasa.toFixed(3)}</b>
                <span>rank correlation of its spot counts with NASA’s</span>
              </div>
              <div>
                <b>{head.foci_f1.toFixed(3)}</b>
                <span>spot-finding F1 against NASA’s 2016 labels</span>
              </div>
              <div>
                <b>{pct(head.sample_verdict.particle)}</b>
                <span>
                  right particle for a whole sample ({head.sample_verdict.n_wells} test samples; dose band {pct(head.sample_verdict.dose)}, time{' '}
                  {pct(head.sample_verdict.time)})
                </span>
              </div>
            </div>
          )}
          </div>
          <figure className="w1-arch">
            <div className="w1-arch-card">
              <img src={`${base}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        </div>
        <p className="w1-fine">
          {tt.HONESTY.batch} {tt.HONESTY.fociLabels} {tt.HONESTY.groundAnalog}
        </p>
      </section>

      <section className="w1-sec" id="w1-next">
        <header className="w1-sec-head">
          <span className="w1-num">03</span>
          <div>
            <span className="w1-k">What to do next</span>
            <h2>A count becomes a decision.</h2>
            <p className="w1-lede">The whole sample decides, never one nucleus. Four samples on four days, as the engine calls them:</p>
          </div>
        </header>
        <Timeline />
        {act && (
          <div className="w1-ladder" data-tier={tierOf(act) ?? 'NONE'}>
            <div className="w1-ladder-main">
              <span className="w1-k">This sample</span>
              <h3>{act.tierName}</h3>
              <ul>
                {act.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p className="w1-fine">Why: {act.trigger}</p>
            </div>
            <div className="w1-ladder-red">
              <span className="w1-k">Never fired by TrackTrace</span>
              <h3>{act.redRow.tierName}</h3>
              <p className="w1-fine">{act.redRow.reason}</p>
            </div>
          </div>
        )}
        <p className="w1-fine">
          {tt.HONESTY.wellsStandIn} {tt.HONESTY.doseBands} Every trigger is our own product rule. The sample verdicts are {tt.HONESTY.precomputedWell}.
        </p>
        <p className="w1-credit">
          Data: NASA BPS Microscopy benchmark, from NASA OSDR study OSD-366 (Penninckx et al. 2019). Models by team SuperHumans with an AI
          assistant (Claude).
        </p>
      </section>
    </div>
  )
})

// ---- the screen ----------------------------------------------------------------------------------------------
export default function TrackTraceW1({ params }: { view: string; params: URLSearchParams }) {
  const ps = params.get('state')
  const pin = ps === 'result' || ps === 'idle' ? ps : undefined
  const [sample, setSample] = useState(HERO)
  const [mState, setMState] = useState<MomentState>('idle')
  const [beat, setBeat] = useState<MomentBeat | null>(null)
  const [result, setResult] = useState<NucleusResult | null>(null)
  const [act, setAct] = useState<TrackTraceAct | null>(null)
  const [well, setWell] = useState<WellResult | null>(null)
  const [ready, setReady] = useState(false)
  const [slices, setSlices] = useState<number | null>(null)
  const [nav, setNav] = useState<string | null>(null)
  const stage = useRef<TrackTraceMomentHandle>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    let h: SceneHandle | null = null
    try {
      h = createScene(c, { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches })
    } catch {
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
    }
  }, [])

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
    setSample(id)
    setResult(null)
    setBeat(null)
    setMState('idle')
  }
  const press = () => {
    if (running) return
    void stage.current?.run()
  }
  const tier = tierOf(done ? act : null)
  const tag = result ? (result.source === 'live' ? `LIVE ${Math.round(result.timing.ms)} ms` : 'REPLAY') : ''

  return (
    <div className="w1" data-ready={ready ? '1' : '0'} data-state={mState} data-sample={sample} data-line={lineOn ? '1' : '0'}>
      <canvas ref={canvasRef} className="w1-gl" aria-hidden="true" />
      <div className="w1-vignette" aria-hidden="true" />

      <header className="w1-top">
        <span className="w1-brand">
          SuperHumans <i>/</i> TrackTrace
        </span>
        <nav aria-label="On this page">
          {(
            [
              ['w1-problem', 'The problem'],
              ['w1-ionscan', 'IonScan'],
              ['w1-next', 'What to do next'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={nav === id ? 'location' : undefined}
              onClick={() => {
                setNav(id)
                go(id)
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="w1-first" id="w1-check">
        <div className="w1-left">
          <span className="w1-k">Check 1 of 6 · Radiation · Cells</span>
          <h1>TrackTrace</h1>
          <p className="w1-sentence">{SENTENCE}</p>
          <div className="w1-actions">
            <button type="button" className="w1-btn" data-qa="primary" data-busy={running ? '1' : '0'} disabled={running} onClick={press}>
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
            <TrackTraceMoment
              key={sample}
              ref={stage}
              sampleId={sample}
              state={pin}
              promise="Press Scan and watch IonScan read this nucleus."
              onResult={onResult}
              onState={onState}
              onBeat={setBeat}
              onReady={setReady}
            />
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
                  <i>NASA’s own count</i>
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
                </>
              ) : (
                <p className="w1-act-quiet">{running ? 'Reading the nucleus, then its whole sample.' : 'One press. The whole sample decides; the action lands here.'}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="w1-cue"
          onClick={() => {
            setNav('w1-problem')
            go('w1-problem')
          }}
        >
          The story behind it <span aria-hidden="true">↓</span>
        </button>
      </main>

      <Story act={act} />
    </div>
  )
}

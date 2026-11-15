// TrackTrace, free version W1 ("inside the beamline"): the check as a place. One WebGL room behind the whole page
// (straight streaks of light, soft discs, the hero nucleus as a 3D hologram from the shipped stack), the working
// stage in an instrument window, and a walk-through below. Every result on screen is the engine's output.
// The first screen and section 01 live in ./room.tsx (the DF TrackTrace page shows them too); sections 02 and 03 are here.
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as tt from '../../engine/tracktrace'
import type { TrackTraceAct } from '../../engine/tracktrace'
import { G, scanStep } from './stage/stage'
import { HERO, tierOf } from './ids'
import { ProblemSection, W1Room } from './room'

const base = import.meta.env.BASE_URL
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
      <ProblemSection />

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
  const [act, setAct] = useState<TrackTraceAct | null>(null)
  const [nav, setNav] = useState<string | null>(null)
  const story = useMemo(() => <Story act={act} />, [act])
  const top = (
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
  )
  return (
    <W1Room
      pin={pin}
      top={top}
      after={story}
      onAct={setAct}
      onCue={() => {
        setNav('w1-problem')
        go('w1-problem')
      }}
    />
  )
}

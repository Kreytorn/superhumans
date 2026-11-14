// TrackTrace screen, first version (r2): real held-out nuclei from NASA BPS microscopy, with MOCK spots
// (simple spot finder) and the geometric track-line fit, until IonScan's ONNX arrives from T1.
// Auto-plays (attract mode) so it is alive when a juror walks up. Arrows step, Space pauses.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActBand, type Tier } from '../../components/ActBand'
import { StatusBar } from '../../components/StatusBar'
import { useKeys } from '../../lib/keys'
import './tracktrace.css'

interface Item {
  index: number
  id: string
  well: string
  condition: string
  particle_label: 'Fe' | 'X-ray' | 'sham'
  mock_circles_rc: [number, number][]
  mock_line: { n_foci: number; n_inliers: number; score: number; drawn: boolean; p0: [number, number] | null; p1: [number, number] | null }
}
interface Gallery {
  shape: [number, number, number]
  items: Item[]
}

const S = 128
const CYCLE_MS = 6500

// ACT tiers, verbatim names and actions from SCREENS.md §1.5 (plan 01 §9).
const TIERS: Tier[] = [
  {
    id: 'green',
    name: 'GREEN: self-care',
    color: 'green',
    bars: 1,
    who: 'Self',
    action: 'Log the sample to the personal dose record',
    steps: ['Keep ALARA habits: sleep in the shielded crew quarters', 'Limit time in low-shielded modules'],
    sources: ['ALARA, NASA-STD-3001 V1 4029 via OCHMO-TB-020'],
  },
  {
    id: 'yellow',
    name: 'YELLOW: crew medical officer',
    color: 'yellow',
    bars: 2,
    who: 'Crew medical officer',
    action: 'Cross-check the onboard physical dosimeters',
    steps: ['Crew moves to the most-shielded area', 'Symptom watch for nausea, vomiting, fatigue'],
    sources: ['Expedition 8 shelter, Oct 2003', 'Orion stowage shelter'],
  },
  {
    id: 'orange',
    name: 'ORANGE: flight surgeon + ground radiation team',
    color: 'orange',
    bars: 4,
    who: 'Flight surgeon + Space Radiation Analysis Group',
    action: 'Terminate or postpone the EVA',
    steps: [
      'Protection is very high if the EVA ends within 2 h',
      'Update the career-dose record',
      'Confirmatory blood draw for chromosome (FISH) biodosimetry',
    ],
    sources: ['OCHMO-TB-020', 'George & Cucinotta, NASA', 'NASA-funded mouse study'],
  },
  {
    id: 'red',
    name: 'RED: abort / evacuate',
    color: 'red',
    bars: 5,
    who: 'Ground',
    action: 'Abort the EVA and the mission; return for treatment',
    steps: [],
    sources: ['OCHMO-TB-020 Rev G'],
    greyed: 'never triggered',
  },
]

// MOCK: until IonScan + the sample model run, the tier follows the lab label of the well (plan 01 §9 rule shape).
function mockTier(it: Item): { id: string; trigger: string } {
  if (it.particle_label === 'sham') return { id: 'green', trigger: 'P(sham) ≥ 0.5' }
  if (it.condition.startsWith('Fe 0.3')) return { id: 'yellow', trigger: 'P(sham) < 0.5, dose band low' }
  return { id: 'orange', trigger: 'P(sham) < 0.5, dose band high' }
}

function particleWords(it: Item) {
  if (it.particle_label === 'Fe') return 'Iron ions (Fe-56), the cosmic-ray stand-in'
  if (it.particle_label === 'X-ray') return 'X-rays, ordinary radiation'
  return 'No radiation (sham control)'
}

// Hot LUT in the TrackTrace accent family: black -> red -> orange -> pale yellow.
function lut(t: number): [number, number, number] {
  const r = Math.min(1, t * 1.7)
  const g = Math.max(0, Math.min(1, t * 1.55 - 0.42))
  const b = Math.max(0, Math.min(1, t * 2.4 - 1.55))
  return [r * 255, g * 230, b * 200]
}

function paint(canvas: HTMLCanvasElement, px: Uint8Array) {
  canvas.width = S
  canvas.height = S
  const g = canvas.getContext('2d')
  if (!g) return
  const img = g.createImageData(S, S)
  const vals: number[] = []
  for (let i = 0; i < px.length; i++) if (px[i] > 0) vals.push(px[i])
  vals.sort((a, b) => a - b)
  const hi = vals.length ? vals[Math.floor(vals.length * 0.997)] : 247
  const lo = vals.length ? vals[Math.floor(vals.length * 0.05)] : 0
  for (let i = 0; i < px.length; i++) {
    const v = px[i]
    const o = i * 4
    if (v === 0) {
      img.data[o + 3] = 0
      continue
    }
    const t = Math.pow(Math.max(0, Math.min(1, (v - lo) / Math.max(1, hi - lo))), 0.9)
    const [r, gg, b] = lut(0.12 + 0.88 * t)
    img.data[o] = r
    img.data[o + 1] = gg
    img.data[o + 2] = b
    img.data[o + 3] = 255
  }
  g.putImageData(img, 0, 0)
}

function Nucleus({ px, className }: { px: Uint8Array; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) paint(ref.current, px)
  }, [px])
  return <canvas ref={ref} className={className} />
}

// Showcase order: nuclei whose spots line up first, then the rest, iron before X-ray before sham.
function attractOrder(items: Item[]) {
  const rank = (it: Item) => (it.mock_line.drawn ? 0 : 10) + (it.particle_label === 'Fe' ? 0 : it.particle_label === 'X-ray' ? 1 : 2) - Math.min(it.mock_circles_rc.length, 6) * 0.01
  return [...items].sort((a, b) => rank(a) - rank(b)).map((it) => it.index)
}

export function TrackTrace() {
  const [gal, setGal] = useState<Gallery | null>(null)
  const [pixels, setPixels] = useState<Uint8Array | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [sel, setSel] = useState(0)
  const [auto, setAuto] = useState(true)
  const [shown, setShown] = useState(0)
  const pauseUntil = useRef(0)

  useEffect(() => {
    Promise.all([
      fetch('tracktrace/mock/gallery_mock.json').then((r) => r.json() as Promise<Gallery>),
      fetch('tracktrace/mock/gallery_mock.u8').then((r) => r.arrayBuffer()),
    ])
      .then(([g, buf]) => {
        setGal(g)
        setPixels(new Uint8Array(buf))
        setSel(attractOrder(g.items)[0])
      })
      .catch((e) => setErr(String(e)))
  }, [])

  const order = useMemo(() => (gal ? attractOrder(gal.items) : []), [gal])
  const px = useCallback((i: number) => (pixels ? pixels.subarray(i * S * S, (i + 1) * S * S) : new Uint8Array(S * S)), [pixels])

  const step = useCallback(
    (d: number) => {
      if (!order.length) return
      const k = order.indexOf(sel)
      setSel(order[(k + d + order.length) % order.length])
    },
    [order, sel],
  )

  useEffect(() => {
    if (!auto || !order.length) return
    const t = setInterval(() => {
      if (performance.now() < pauseUntil.current) return
      step(1)
    }, CYCLE_MS)
    return () => clearInterval(t)
  }, [auto, order, step])

  // Count-up of circled spots, revealed in step with the circle animation.
  const it = gal?.items[sel]
  const nC = it?.mock_circles_rc.length ?? 0
  useEffect(() => {
    setShown(0)
    if (!nC) return
    const timers = Array.from({ length: nC }, (_, k) => setTimeout(() => setShown(k + 1), 950 + k * 140))
    return () => timers.forEach(clearTimeout)
  }, [sel, nC])

  const pick = (i: number) => {
    setSel(i)
    pauseUntil.current = performance.now() + 25000
  }
  useKeys({
    ArrowRight: () => {
      step(1)
      pauseUntil.current = performance.now() + 25000
    },
    ArrowLeft: () => {
      step(-1)
      pauseUntil.current = performance.now() + 25000
    },
    ' ': () => setAuto((a) => !a),
  })

  if (err) return <div className="tt-error">Could not load the nuclei: {err}</div>
  if (!gal || !pixels || !it) return <div className="tt-loading">Loading nuclei…</div>

  const tier = mockTier(it)
  const line = it.mock_line
  const wells = Array.from(new Set(gal.items.map((g) => g.well)))

  return (
    <div className="tt">
      <StatusBar module="01 TrackTrace" mode="MOCK" />
      <main className="tt-main">
        <section className="tt-left">
          <p className="tt-tag">
            <span className="tt-tag-rule" />
            01 TRACKTRACE
          </p>
          <h1 className="tt-title">Cosmic-ray hits, traced</h1>
          <p className="tt-story">Each bright dot is a broken spot in the cell's DNA. Heavy ions often leave them in a straight line.</p>

          <div className="tt-hero">
            <span className="tt-hero-num tnum">{shown}</span>
            <span className="tt-hero-unit">
              damage spots
              <br />
              circled
            </span>
          </div>

          <dl className="tt-facts">
            <div>
              <dt>Track line</dt>
              <dd>
                {line.drawn ? (
                  <>
                    straight, score <span className="tnum">{line.score.toFixed(2)}</span>
                  </>
                ) : (
                  'none: spots are scattered'
                )}
                <span className="tt-sub">geometric line fit, our product rule</span>
              </dd>
            </div>
            <div>
              <dt>Sample</dt>
              <dd>
                {particleWords(it)}
                <span className="tt-sub">
                  lab well <span className="mono">{it.well}</span>, {it.condition}
                </span>
              </dd>
            </div>
          </dl>

          <div className="tt-mock">
            <b>MOCK</b> Spots come from a simple spot finder for now. IonScan, our state-space model, replaces it when its training finishes.
          </div>
        </section>

        <section className="tt-center">
          <figure className="tt-well">
            <span className="tt-corner tl" />
            <span className="tt-corner tr" />
            <span className="tt-corner bl" />
            <span className="tt-corner br" />
            <div className="tt-stage" key={sel}>
              <Nucleus px={px(sel)} className="tt-img" />
              <div className="tt-sweep" />
              <svg className="tt-overlay" viewBox={`0 0 ${S} ${S}`} aria-label={`${nC} spots circled`}>
                {line.drawn && line.p0 && line.p1 && (
                  <line
                    className="tt-line"
                    x1={line.p0[1]}
                    y1={line.p0[0]}
                    x2={line.p1[1]}
                    y2={line.p1[0]}
                    style={{ animationDelay: `${950 + nC * 140 + 150}ms` }}
                  />
                )}
                {it.mock_circles_rc.map(([r, c], k) => (
                  <circle key={k} className="tt-circle" cx={c} cy={r} r={4.6} style={{ animationDelay: `${950 + k * 140}ms` }} />
                ))}
              </svg>
              <span className="tt-id mono">{it.id}</span>
            </div>
            <figcaption className="tt-caption">
              {it.particle_label === 'Fe'
                ? 'Iron-ion beam, 600 MeV/n, ground accelerator. Nucleus from a mouse the model never saw.'
                : it.particle_label === 'X-ray'
                  ? 'X-ray beam, ground lab. Nucleus from a mouse the model never saw.'
                  : 'Sham control: handled the same way, never irradiated. Nucleus from a mouse the model never saw.'}
            </figcaption>
          </figure>
        </section>

        <section className="tt-right">
          <div className="tt-right-head">
            <span>Held-out nuclei</span>
            <span className="tt-auto mono">{auto ? 'auto-play on (space)' : 'paused (space)'}</span>
          </div>
          {wells.map((w) => {
            const row = gal.items.filter((g) => g.well === w)
            return (
              <div className="tt-row" key={w}>
                <div className="tt-row-label">
                  <span className={`tt-dot p-${row[0].particle_label === 'X-ray' ? 'xray' : row[0].particle_label.toLowerCase()}`} />
                  {row[0].condition}
                </div>
                <div className="tt-thumbs">
                  {row.map((g) => (
                    <button key={g.index} className={`tt-thumb ${g.index === sel ? 'on' : ''}`} onClick={() => pick(g.index)} aria-label={g.id}>
                      <Nucleus px={px(g.index)} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </main>

      <footer className="tt-act">
        <ActBand
          tiers={TIERS}
          activeId={tier.id}
          trigger={tier.trigger}
          ourRule
          fixedLine="Lab grays are never converted into astronaut doses. Example tier from the lab label (MOCK) until the model is wired in."
        />
      </footer>
      <p className="tt-credit">
        Nuclei: NASA BPS Microscopy Benchmark (no use restrictions) and OSDR OSD-366. Render: team SuperHumans (code written with AI assistance).
        <span className="ai-mark">AI-generated background</span>
      </p>
    </div>
  )
}

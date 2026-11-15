// V10 home: one engraved plate. The crew member stands in a circle and a square (two poses, the Renaissance study
// of proportion) drawn in gold line work; the circle is an orbit. Six lights on the body, six medallions on the
// orbit holding the checks' real specimen images. Line work is static SVG; the slow turning rings and the sheen are
// their own layers, moved only by transform, so the heavy figure is painted once.
import { memo, useMemo, type CSSProperties } from 'react'
import fig from './figure.json'
import { CHECKS, SITE_LINE, cropStyle } from './data'
import { NAVEL, onEllipse, type Geo } from './geometry'

interface Line {
  d: string
  top: number
  len: number
  k?: number
}
const FIG = fig as unknown as { levels: number; a: { outline: Line[]; hatch: Line[] }; b: { outline: Line[]; hatch: Line[] }; aura: Line[] }

const RAD = Math.PI / 180
type Vars = CSSProperties & Record<`--${string}`, string | number>

// --------------------------------------------------------------------------------------------- the engraved figure
// Thousandths of a body unit, origin at the navel, y down: crown at about -720, feet at +1030.
const delayOf = (top: number, base: number, span: number) => Math.round(base + ((top + 760) / 1800) * span)

const Figure = memo(function Figure({ g }: { g: Geo }) {
  const k = g.s / 1000
  const lv = FIG.levels
  return (
    <svg className="v10-fig" width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} aria-hidden="true">
      <defs>
        <linearGradient id="v10-gold-fig" gradientUnits="userSpaceOnUse" x1="-500" y1="-760" x2="420" y2="1060">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset="0.38" stopColor="#f1c869" />
          <stop offset="0.72" stopColor="#d99a3e" />
          <stop offset="1" stopColor="#a7631f" />
        </linearGradient>
      </defs>
      <g transform={`translate(${g.cx} ${g.cy}) scale(${k})`}>
        {/* the body hides whatever passes behind it (the square, the planet's path) */}
        {FIG.a.outline.map((l, i) => (
          <path key={`f${i}`} className="v10-fig-fill" d={l.d} />
        ))}
        {FIG.aura.map((l, i) => (
          <path key={`u${i}`} className="v10-l v10-aura" d={l.d} pathLength={1} style={{ '--dl': '1500ms', '--du': '1100ms' } as Vars} />
        ))}
        {FIG.b.hatch.map((l, i) => (
          <path key={`bh${i}`} className="v10-l v10-bh" d={l.d} pathLength={1} style={{ '--dl': `${delayOf(l.top, 1050, 650)}ms`, '--du': '800ms', strokeWidth: 0.45 + (1 - (l.k ?? 0) / lv) * 0.45 } as Vars} />
        ))}
        {FIG.b.outline.map((l, i) => (
          <path key={`bo${i}`} className="v10-l v10-bo" d={l.d} pathLength={1} style={{ '--dl': `${delayOf(l.top, 950, 500)}ms`, '--du': '1000ms' } as Vars} />
        ))}
        {FIG.a.hatch.map((l, i) => (
          <path key={`ah${i}`} className="v10-l v10-ah" d={l.d} pathLength={1} style={{ '--dl': `${delayOf(l.top, 620, 700)}ms`, '--du': '760ms', strokeWidth: 0.5 + (1 - (l.k ?? 0) / lv) * 0.8 } as Vars} />
        ))}
        {FIG.a.outline.map((l, i) => (
          <path key={`ao${i}`} className="v10-l v10-ao" d={l.d} pathLength={1} style={{ '--dl': '420ms', '--du': '1300ms' } as Vars} />
        ))}
      </g>
    </svg>
  )
})

// --------------------------------------------------------------------------------------------- rings, square, path
const Rings = memo(function Rings({ g }: { g: Geo }) {
  const { cx, cy, R, s, W, H } = g
  // Vitruvian square: crown to sole, as wide as the reach of the level arms
  const top = cy - (1.765 - NAVEL) * s
  const bot = cy + (NAVEL + 0.012) * s
  const half = (bot - top) / 2 + 0.02 * s
  const sqTicks: string[] = []
  for (let q = 1; q < 8; q++) {
    const t = q / 8
    const y = top + (bot - top) * t
    const x = cx - half + 2 * half * t
    const L = q === 4 ? 9 : 5
    sqTicks.push(`M${cx - half} ${y}h${L}M${cx + half} ${y}h${-L}M${x} ${top}v${L}M${x} ${bot}v${-L}`)
  }
  // fine graduation just outside the orbit (ornament, no numbers)
  const ticks: string[] = []
  for (let a = 0; a < 360; a += 2.5) {
    const long = a % 15 === 0
    const r0 = R + 18, r1 = R + (long ? 26 : 22)
    const sn = Math.sin(a * RAD), cs = Math.cos(a * RAD)
    ticks.push(`M${(cx + r0 * sn).toFixed(1)} ${(cy - r0 * cs).toFixed(1)}L${(cx + r1 * sn).toFixed(1)} ${(cy - r1 * cs).toFixed(1)}`)
  }
  // the planet's path: a tilted ellipse, a double line with cross-hatching between
  const rx = R * 1.17, ry = R * 0.29, rot = 25
  const band = (o: number) => {
    const pts: string[] = []
    for (let t = 0; t <= 360; t += 3) {
      const [x, y] = onEllipse(g, rx + o, ry + o * (ry / rx), rot, t * RAD)
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    return `M${pts.join('L')}Z`
  }
  const hatch: string[] = []
  for (let t = 0; t < 360; t += 2.4) {
    const [x0, y0] = onEllipse(g, rx - 3, ry - 3 * (ry / rx), rot, t * RAD)
    const [x1, y1] = onEllipse(g, rx + 3, ry + 3 * (ry / rx), rot, (t + 1.6) * RAD)
    hatch.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`)
  }
  const inset = g.tall ? 10 : 14
  return (
    <svg className="v10-rings" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id="v10-gold" gradientUnits="userSpaceOnUse" x1={cx - R} y1={cy - R} x2={cx + R} y2={cy + R}>
          <stop offset="0" stopColor="#ffe9b0" />
          <stop offset="0.5" stopColor="#e2b25a" />
          <stop offset="1" stopColor="#a86c24" />
        </linearGradient>
        <radialGradient id="v10-halo" gradientUnits="userSpaceOnUse" cx={cx} cy={cy - R * 0.15} r={R * 1.25}>
          <stop offset="0" stopColor="#3a2f7a" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#221c55" stopOpacity="0.25" />
          <stop offset="1" stopColor="#120f33" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the plate's frame */}
      <g className="v10-frame">
        <rect className="v10-d" x={inset} y={inset} width={W - 2 * inset} height={H - 2 * inset} pathLength={1} />
        <rect className="v10-d v10-frame-in" x={inset + 6} y={inset + 6} width={W - 2 * inset - 12} height={H - 2 * inset - 12} pathLength={1} />
        {[
          [inset, inset],
          [W - inset, inset],
          [inset, H - inset],
          [W - inset, H - inset],
        ].map(([x, y], i) => (
          <path key={i} className="v10-frame-c" d={`M${x - 4} ${y}L${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}Z`} />
        ))}
      </g>
      <circle className="v10-halo" cx={cx} cy={cy} r={R * 1.25} fill="url(#v10-halo)" />
      <g className="v10-geo">
        <circle className="v10-d v10-orbit-in" cx={cx} cy={cy} r={R - 9} pathLength={1} />
        <circle className="v10-d v10-orbit" cx={cx} cy={cy} r={R} pathLength={1} />
        <circle className="v10-d v10-orbit-out" cx={cx} cy={cy} r={R + 26} pathLength={1} />
        <path className="v10-ticks" d={ticks.join('')} />
        {!g.tall && (
          <g className="v10-band">
            <path className="v10-d" d={band(-3)} pathLength={1} />
            <path className="v10-d" d={band(3)} pathLength={1} />
            <path className="v10-band-h" d={hatch.join('')} />
          </g>
        )}
        <rect className="v10-d v10-square" x={cx - half} y={top} width={2 * half} height={bot - top} pathLength={1} />
        <path className="v10-square-t" d={sqTicks.join('')} />
        {/* the navel, centre of the circle */}
        <circle className="v10-navel" cx={cx} cy={cy} r={2.2} />
      </g>
    </svg>
  )
})

/** Slow rings that turn (each its own layer, moved by transform only). */
function Turning({ g }: { g: Geo }) {
  const { cx, cy, R, W, H } = g
  const seg: string[] = []
  for (let a = 0; a < 360; a += 6) {
    const r0 = R + 7, r1 = R + 12
    const a0 = a * RAD, a1 = (a + 3) * RAD
    seg.push(
      `M${(cx + r0 * Math.sin(a0)).toFixed(1)} ${(cy - r0 * Math.cos(a0)).toFixed(1)}A${r0} ${r0} 0 0 1 ${(cx + r0 * Math.sin(a1)).toFixed(1)} ${(cy - r0 * Math.cos(a1)).toFixed(1)}L${(cx + r1 * Math.sin(a1)).toFixed(1)} ${(cy - r1 * Math.cos(a1)).toFixed(1)}A${r1} ${r1} 0 0 0 ${(cx + r1 * Math.sin(a0)).toFixed(1)} ${(cy - r1 * Math.cos(a0)).toFixed(1)}Z`,
    )
  }
  const origin = { transformOrigin: `${cx}px ${cy}px` }
  return (
    <>
      <svg className="v10-turn v10-turn-a" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={origin} aria-hidden="true">
        <circle className="v10-turn-line" cx={cx} cy={cy} r={R + 7} />
        <circle className="v10-turn-line" cx={cx} cy={cy} r={R + 12} />
        <path className="v10-turn-seg" d={seg.join('')} />
      </svg>
      <svg className="v10-turn v10-turn-b" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={origin} aria-hidden="true">
        <circle className="v10-turn-dots" cx={cx} cy={cy} r={R + 33} />
        <circle className="v10-turn-dash" cx={cx} cy={cy} r={R - 20} />
      </svg>
    </>
  )
}

// --------------------------------------------------------------------------------------------- links and the ray
function Links({ g, lit }: { g: Geo; lit: number | null }) {
  const tt = CHECKS.findIndex((c) => c.id === 'tracktrace')
  // TrackTrace's ray: a straight line through the cell and its medallion, run on past both ends
  const p = g.pts[tt], m = g.med[tt]
  const dx = m.x - p.x, dy = m.y - p.y
  const L = Math.hypot(dx, dy)
  const ux = dx / L, uy = dy / L
  const back = g.R * 0.82 // past the cell, towards the head of the plate
  const fwd = g.tall ? g.R * 0.2 : g.H // on past the medallion to the frame
  const x0 = p.x - ux * back, y0 = p.y - uy * back
  const x1 = m.x + ux * fwd, y1 = m.y + uy * fwd
  return (
    <svg className="v10-links" width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} aria-hidden="true">
      <defs>
        <linearGradient id="v10-ray" gradientUnits="userSpaceOnUse" x1={x0} y1={y0} x2={m.x + ux * g.R * 0.5} y2={m.y + uy * g.R * 0.5}>
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff6dc" stopOpacity="0.95" />
          <stop offset="0.8" stopColor="#ffe3a0" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </linearGradient>
        <filter id="v10-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {!g.tall &&
        CHECKS.map((c, i) =>
          c.id === 'tracktrace' ? null : (
            <line
              key={c.id}
              className="v10-link"
              data-lit={lit === i ? '1' : '0'}
              x1={g.pts[i].x}
              y1={g.pts[i].y}
              x2={g.med[i].x - (g.med[i].x - g.pts[i].x) * (g.md / 2 + 4) / Math.hypot(g.med[i].x - g.pts[i].x, g.med[i].y - g.pts[i].y)}
              y2={g.med[i].y - (g.med[i].y - g.pts[i].y) * (g.md / 2 + 4) / Math.hypot(g.med[i].x - g.pts[i].x, g.med[i].y - g.pts[i].y)}
            />
          ),
        )}
      {!g.tall && (
        <g className="v10-ray" data-lit={lit === tt ? '1' : '0'}>
          <line className="v10-ray-glow" x1={x0} y1={y0} x2={x1} y2={y1} stroke="url(#v10-ray)" filter="url(#v10-glow)" />
          <line className="v10-ray-core" x1={x0} y1={y0} x2={x1} y2={y1} stroke="url(#v10-ray)" pathLength={1} />
        </g>
      )}
      {/* the cell the ray crosses */}
      <g className="v10-cell" transform={`translate(${p.x} ${p.y})`}>
        <circle r={g.tall ? 6 : 9} />
        <circle r={g.tall ? 2.5 : 3.6} className="v10-cell-n" />
      </g>
    </svg>
  )
}

// --------------------------------------------------------------------------------------------- the plate
export interface PlateProps {
  g: Geo
  intro: boolean
  lit: number | null
  setLit: (i: number | null) => void
  press: (i: number) => void
  onPreload: () => void
  buttons: React.RefObject<(HTMLButtonElement | null)[]>
}

export default function Plate({ g, intro, lit, setLit, press, onPreload, buttons }: PlateProps) {
  const litCheck = lit != null ? CHECKS[lit] : null
  const order = useMemo(() => CHECKS.map((_, i) => i), [])
  const titleStyle: Vars = { '--ts': `${g.titleSize}px`, top: g.titleTop }
  return (
    <div className="v10-plate" data-intro={intro ? '1' : '0'} data-lit={lit != null ? '1' : '0'} style={{ '--md': `${g.md}px` } as Vars}>
      <div className="v10-art">
        <Rings g={g} />
        <Turning g={g} />
        <Figure g={g} />
        <Links g={g} lit={lit} />
      </div>

      {/* the six lights on the body: pointer targets (the medallions are the keyboard stops) */}
      {order.map((i) => (
        <div
          key={`pt${i}`}
          className="v10-pt"
          data-id={CHECKS[i].id}
          data-lit={lit === i ? '1' : '0'}
          style={{ left: g.pts[i].x, top: g.pts[i].y, '--i': i } as Vars}
          onPointerEnter={(e) => {
            onPreload()
            if (e.pointerType === 'mouse') setLit(i)
          }}
          onPointerLeave={() => setLit(null)}
          onClick={() => press(i)}
        >
          <i />
        </div>
      ))}

      <nav className="v10-meds" aria-label="The six health checks">
        {order.map((i) => {
          const c = CHECKS[i]
          return (
            <button
              key={c.id}
              ref={(el) => {
                buttons.current[i] = el
              }}
              type="button"
              className="v10-med"
              data-side={g.side[i]}
              data-lit={lit === i ? '1' : '0'}
              data-qa={c.id === 'tracktrace' ? 'primary' : undefined}
              aria-label={`${c.name}: ${c.sentence}`}
              style={{ left: g.med[i].x, top: g.med[i].y, '--i': i } as Vars}
              onClick={() => press(i)}
              onPointerEnter={(e) => {
                onPreload()
                if (e.pointerType === 'mouse') setLit(i)
              }}
              onPointerLeave={() => setLit(null)}
              onFocus={() => {
                onPreload()
                setLit(i)
              }}
              onBlur={() => setLit(null)}
            >
              <span className="v10-med-disc">
                <span className="v10-med-img" style={cropStyle(c)} />
              </span>
              <span className="v10-med-label">
                <i>{c.n}</i>
                <b>{c.name}</b>
              </span>
            </button>
          )
        })}
      </nav>

      <header className="v10-head" style={titleStyle}>
        <h1 className="v10-title">SuperHumans</h1>
        <p className="v10-line">{SITE_LINE}</p>
      </header>

      {!g.tall && (
        <>
          <p className="v10-hint" data-off={litCheck ? '1' : '0'}>
            <span aria-hidden="true" />
            Choose a light on the body
          </p>
          <div className="v10-read" data-side={lit != null ? g.side[lit] : 'l'} data-on={litCheck ? '1' : '0'} aria-live="polite">
            {litCheck && (
              <div key={litCheck.id} className="v10-read-in">
                <p className="v10-read-k">
                  {litCheck.n} <span>·</span> {litCheck.site}
                </p>
                <p className="v10-read-name">{litCheck.name}</p>
                <p className="v10-read-line">{litCheck.sentence}</p>
                <p className="v10-read-go">Press to look closer</p>
              </div>
            )}
          </div>
        </>
      )}
      <p className="v10-mark">AI-generated imagery</p>
    </div>
  )
}

// Station / BubbleGrade: the frozen scene at the airlock's spacewalk hatch (about 2.4 s).
// A thin gauge ring closes round the hatch and fills (the airlock at pressure), then drains (the pressure drops
// before the spacewalk); its ticks go dark as it passes; a few ice specks puff out of the hatch seam and freeze
// in place. An illustration of the story, not data: no numerals, no readings.
//
// Everything is placed from the manifest anchors in the still's own pixels (focus, r), so it lines up with
// whatever still the render pipeline ships. Motion is CSS keyframes with fill-mode both (transform, opacity and
// stroke-dashoffset only), so the shell's "end" state shows the held last frame at once. scene.css holds the
// keyframes; the T constants below must match its percentages.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { SceneSvg } from '../kit'
import type { SceneProps } from '../types'
import './scene.css'

/** Timeline in ms from the scene's start (the arc and head keyframes in scene.css are written for these). */
const T = {
  track: 80,
  fillAt: 140,
  fillMs: 520,
  drainAt: 820,
  drainMs: 1300,
  labelAt: 700,
  speckAt: 900,
  done: 2420,
}
/** The share of the ring still lit when the pressure has dropped. */
const LEFT = 0.07
/** Easings of the fill and the drain, as cubic-bezier control points (same as in scene.css). */
const FILL: Bezier = [0.45, 0, 0.2, 1]
const DRAIN: Bezier = [0.3, 0.45, 0.25, 1]
const TICKS = 60

type Bezier = [number, number, number, number]
type Pt = [number, number]

/** Time share (0..1) at which a CSS cubic-bezier easing reaches the progress y. */
function timeAt(e: Bezier, y: number): number {
  if (y <= 0) return 0
  if (y >= 1) return 1
  const coord = (s: number, a: number, b: number) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (coord(mid, e[1], e[3]) < y) lo = mid
    else hi = mid
  }
  return coord((lo + hi) / 2, e[0], e[2])
}

/** The ice specks: angle on the hatch seam (deg, 0 = right, clockwise), how far out they freeze (x hatch
 *  radius), a small sideways drift (deg), start offset, travel time and size. Fixed, so every run is the same. */
const SPECKS = [
  { a: -66, out: 1.42, tw: 5, t: 0, dur: 980, s: 1 },
  { a: -31, out: 1.6, tw: -4, t: 120, dur: 1040, s: 0.78 },
  { a: 6, out: 1.36, tw: 6, t: 50, dur: 940, s: 1.12 },
  { a: 39, out: 1.54, tw: -6, t: 210, dur: 1000, s: 0.7 },
  { a: 72, out: 1.31, tw: 4, t: 150, dur: 960, s: 0.9 },
  { a: 131, out: 1.47, tw: 5, t: 240, dur: 1000, s: 0.74 },
  { a: 198, out: 1.39, tw: -5, t: 170, dur: 980, s: 0.95 },
  { a: 236, out: 1.56, tw: 4, t: 260, dur: 1020, s: 0.66 },
]

/** Three lines through (x, y) at 60 degree steps from `rot`: a six-armed star of arm length L. */
function star(x: number, y: number, L: number, rot: number): string {
  let d = ''
  for (let i = 0; i < 3; i++) {
    const a = ((rot + i * 60) * Math.PI) / 180
    const c = Math.cos(a) * L
    const s = Math.sin(a) * L
    d += `M${(x - c).toFixed(1)} ${(y - s).toFixed(1)}L${(x + c).toFixed(1)} ${(y + s).toFixed(1)}`
  }
  return d
}

/** Where the label may sit on the screen (outside the panel, the wordmark and the scene title). */
function freeArea(vw: number, vh: number) {
  const edge = Math.min(48, Math.max(20, vw * 0.029))
  if (vw >= vh) {
    const panel = Math.min(vw * 0.58, 1120)
    return { x0: edge, y0: edge + 48, x1: vw - panel - 24, y1: vh - edge - Math.min(140, vh * 0.17) }
  }
  return { x0: 14, y0: edge + 44, x1: vw - 14, y1: vh * 0.38 - 12 }
}

/** The label's three sizes: two lines; two lines with the second wrapped; one short line. */
type Form = 'wide' | 'narrow' | 'compact'

interface Place {
  /** Leader from the ring out to the label, in still pixels. */
  line: Pt[]
  /** The label's anchor point as a share of the box, and how the label hangs from it. */
  at: Pt
  align: 'top' | 'bottom' | 'left' | 'right'
  form: Form
}

export default function Scene({ w, h, anchors, variant, play, onDone }: SceneProps) {
  const uid = 'bgs' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const fx = anchors.focus[0] * w
  const fy = anchors.focus[1] * h
  const rr = Math.max(8, anchors.r * h)
  const R = rr * 1.16

  // k = still pixels per screen pixel, so strokes and gaps keep the same on-screen size at every scale.
  const [k, setK] = useState(() => (typeof window === 'undefined' ? 1 : Math.max(0.5, w / Math.max(320, window.innerWidth))))
  const [form, setForm] = useState<Form>('wide')
  const [place, setPlace] = useState<Place | null>(null)
  const [tick, setTick] = useState(0)

  // Watch the box: its size gives k; any change re-places the label.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const read = () => {
      const bw = el.clientWidth
      if (bw > 0) setK(w / bw)
      setForm('wide')
      setTick((t) => t + 1)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    window.addEventListener('resize', read)
    // The shell slides the frame (a transform transition) when a check opens on a portrait screen: place
    // again once it has landed.
    const slider = el.closest<HTMLElement>('.st-box')
    const landed = (e: TransitionEvent) => {
      if (e.target === slider && e.propertyName === 'transform') read()
    }
    slider?.addEventListener('transitionend', landed)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', read)
      slider?.removeEventListener('transitionend', landed)
    }
  }, [w])

  const tickOut = 5 * k + 13 * k // ring -> outer end of the long ticks

  // Place the label: the first spot round the ring where it fits on screen. If none does, the narrow
  // (two-line) label is tried, then the compact one (a single short line on a short leader), then the best
  // partial fit of that.
  useLayoutEffect(() => {
    const el = rootRef.current
    const lab = labelRef.current
    if (!el || !lab) return
    const seen = el.getBoundingClientRect()
    if (seen.width < 4) return
    // Where the frame is going, not where a slide has got to: the shell writes the target as the box's
    // translate3d. Falls back to what is on screen.
    const slide = el.closest<HTMLElement>('.st-box')?.style.transform.match(/translate3d\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/)
    const box = { left: slide ? Number(slide[1]) : seen.left, top: slide ? Number(slide[2]) : seen.top, width: seen.width }
    const s = box.width / w
    const lw = lab.offsetWidth
    const lh = lab.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const free = freeArea(vw, vh)
    const cx = box.left + fx * s
    const cy = box.top + fy * s
    const compact = form === 'compact'
    // The compact line hangs straight off the ring, like an instrument's legend: no leader.
    const lead = compact ? 0 : 22
    const gap = compact ? 6 : 8
    const r0 = (R + tickOut) * s + (compact ? 0 : 7)
    const order =
      vw >= vh
        ? [-90, -62, -118, 90, -32, -148, 32, 148, 0, 180]
        : compact
          ? [90, -90, 64, 116, 38, 142, 0, 180]
          : [38, 142, 0, 180, 64, 116, -38, -142, 90, -90]
    let best: { p: Place; fit: number; rect: [number, number, number, number]; s: number } | null = null
    for (const deg of order) {
      const a = (deg * Math.PI) / 180
      const dx = Math.cos(a)
      const dy = Math.sin(a)
      const p0: Pt = [cx + dx * r0, cy + dy * r0]
      const p1: Pt = [p0[0] + dx * lead, p0[1] + dy * lead]
      let p2: Pt = p1
      let rect: [number, number, number, number]
      let align: Place['align']
      if (Math.abs(dx) < 0.3) {
        align = dy < 0 ? 'bottom' : 'top'
        rect = dy < 0 ? [p1[0] - lw / 2, p1[1] - gap - lh, lw, lh] : [p1[0] - lw / 2, p1[1] + gap, lw, lh]
      } else {
        const side = dx > 0 ? 1 : -1
        p2 = [p1[0] + side * (compact ? 8 : 16), p1[1]]
        align = side > 0 ? 'left' : 'right'
        rect = side > 0 ? [p2[0] + gap, p2[1] - lh / 2, lw, lh] : [p2[0] - gap - lw, p2[1] - lh / 2, lw, lh]
      }
      const ix = Math.max(0, Math.min(rect[0] + rect[2], free.x1) - Math.max(rect[0], free.x0))
      const iy = Math.max(0, Math.min(rect[1] + rect[3], free.y1) - Math.max(rect[1], free.y0))
      const fit = (ix * iy) / Math.max(1, rect[2] * rect[3])
      const toStill = (q: Pt): Pt => [(q[0] - box.left) / s, (q[1] - box.top) / s]
      const anchorScreen: Pt =
        align === 'bottom' ? [p1[0], p1[1] - gap] : align === 'top' ? [p1[0], p1[1] + gap] : align === 'left' ? [p2[0] + gap, p2[1]] : [p2[0] - gap, p2[1]]
      const st = toStill(anchorScreen)
      const p: Place = {
        line: lead > 0 ? (p2 === p1 ? [p0, p1] : [p0, p1, p2]).map(toStill) : [],
        at: [st[0] / w, st[1] / h],
        align,
        form,
      }
      if (fit > 0.999) {
        best = { p, fit, rect, s }
        break
      }
      if (!best || fit > best.fit + 0.02) best = { p, fit, rect, s }
    }
    if (!best) return
    if (best.fit < 0.999 && form !== 'compact') {
      setForm(form === 'wide' ? 'narrow' : 'compact')
      return
    }
    if (best.fit < 0.999) {
      // Nothing fits whole: slide the label back inside the free area rather than off the screen.
      const [rx, ry, rw, rh] = best.rect
      const sx = rw <= free.x1 - free.x0 ? Math.min(Math.max(rx, free.x0), free.x1 - rw) - rx : 0
      const sy = rh <= free.y1 - free.y0 ? Math.min(Math.max(ry, free.y0), free.y1 - rh) - ry : 0
      best.p.at = [best.p.at[0] + sx / best.s / w, best.p.at[1] + sy / best.s / h]
    }
    setPlace((old) =>
      old &&
      old.align === best.p.align &&
      old.form === best.p.form &&
      Math.abs(old.at[0] - best.p.at[0]) < 1e-4 &&
      Math.abs(old.at[1] - best.p.at[1]) < 1e-4
        ? old
        : best.p,
    )
  }, [tick, form, k, w, h, fx, fy, R, tickOut, variant])

  // Tell the shell when the story has landed, so the panel opens on the held frame.
  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, T.done)
    return () => window.clearTimeout(t)
  }, [play, onDone])

  const ticks = useMemo(() => {
    const out: { d: string; major: boolean; on: number; off: number | null }[] = []
    for (let i = 0; i < TICKS; i++) {
      const f = i / TICKS
      const a = f * Math.PI * 2 - Math.PI / 2
      const major = i % 5 === 0
      const r1 = R + 5 * k
      const r2 = r1 + (major ? 13 : 6) * k
      const c = Math.cos(a)
      const sn = Math.sin(a)
      out.push({
        d: `M${(fx + c * r1).toFixed(1)} ${(fy + sn * r1).toFixed(1)}L${(fx + c * r2).toFixed(1)} ${(fy + sn * r2).toFixed(1)}`,
        major,
        on: T.fillAt + T.fillMs * timeAt(FILL, f),
        off: f < LEFT ? null : T.drainAt + T.drainMs * timeAt(DRAIN, (1 - f) / (1 - LEFT)),
      })
    }
    return out
  }, [R, k, fx, fy])

  const ring = `M${fx} ${fy - R}A${R} ${R} 0 1 1 ${fx} ${fy + R}A${R} ${R} 0 1 1 ${fx} ${fy - R}`
  const centre: CSSProperties = { transformOrigin: `${fx}px ${fy}px` }
  // The frame dims round the hatch (time has stopped; the eye goes to the hatch), so thin light, the ice and
  // the label read on bright hull metal. Screen pixels = still pixels / k.
  const px = (still: number) => `${(still / k).toFixed(1)}px`
  const iris: CSSProperties = {
    background: `radial-gradient(circle at ${((fx / w) * 100).toFixed(3)}% ${((fy / h) * 100).toFixed(3)}%, rgba(3,5,7,0) ${px(rr * 0.9)}, rgba(3,5,7,0.46) ${px(rr * 1.1)}, rgba(3,5,7,0.56) ${px(rr * 2.1)}, rgba(3,5,7,0.66) ${px(rr * 4.2)})`,
  }

  return (
    <div ref={rootRef} className="stbgs-scene" data-variant={variant}>
      <div className="stbgs-iris" style={iris} />
      <SceneSvg w={w} h={h} className="stbgs-sv">
        <defs>
          <radialGradient id={`${uid}shade`}>
            <stop offset="0" stopColor="#030507" stopOpacity="0.62" />
            <stop offset="0.55" stopColor="#030507" stopOpacity="0.25" />
            <stop offset="1" stopColor="#030507" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}warm`}>
            <stop offset="0" stopColor="#ffd9a3" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#ffb45a" stopOpacity="0.4" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}ice`}>
            <stop offset="0" stopColor="#f4f9ff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#bcd6f2" stopOpacity="0.32" />
            <stop offset="1" stopColor="#8fb3d9" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The hatch seal: a warm glow while the airlock holds pressure, gone once it has dropped. */}
        <g className="stbgs-seam">
          <circle cx={fx} cy={fy} r={rr} strokeWidth={22 * k} opacity={0.1} />
          <circle cx={fx} cy={fy} r={rr} strokeWidth={7 * k} opacity={0.16} />
        </g>

        {/* The gauge: a faint track, its ticks, and the lit arc that fills and then drains. */}
        <circle className="stbgs-track" cx={fx} cy={fy} r={R} strokeWidth={1.1 * k} />
        <g className="stbgs-ticks-dim">
          {ticks.map((t, i) => (
            <path key={i} d={t.d} strokeWidth={(t.major ? 1.4 : 1) * k} />
          ))}
        </g>
        <g className="stbgs-ticks-lit">
          {ticks.map((t, i) => (
            <g key={i} className="stbgs-tick-on" style={{ animationDelay: `${t.on.toFixed(0)}ms` }}>
              <path
                className={t.off === null ? undefined : 'stbgs-tick-off'}
                d={t.d}
                strokeWidth={(t.major ? 2 : 1.4) * k}
                style={t.off === null ? undefined : { animationDelay: `${t.off.toFixed(0)}ms` }}
              />
            </g>
          ))}
        </g>
        <g className="stbgs-arc">
          <path d={ring} pathLength={1} strokeWidth={18 * k} opacity={0.06} />
          <path d={ring} pathLength={1} strokeWidth={6 * k} opacity={0.2} />
          <path d={ring} pathLength={1} strokeWidth={2 * k} />
        </g>
        <g className="stbgs-head" style={centre}>
          <g className="stbgs-head-in">
            <circle cx={fx} cy={fy - R} r={13 * k} fill={`url(#${uid}warm)`} />
            <circle cx={fx} cy={fy - R} r={2.8 * k} fill="#fff4e2" />
          </g>
        </g>

        {/* The leader to the label. */}
        {place && place.line.length > 1 && (
          <polyline
            className="stbgs-lead"
            points={place.line.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')}
            pathLength={1}
            strokeWidth={1.1 * k}
          />
        )}

        {/* Ice: specks puff out of the seam, slow down and stop dead, then catch the light. */}
        {SPECKS.map((p, i) => {
          const a0 = (p.a * Math.PI) / 180
          const a1 = ((p.a + p.tw) * Math.PI) / 180
          const x0 = fx + Math.cos(a0) * rr * 0.99
          const y0 = fy + Math.sin(a0) * rr * 0.99
          const x1 = fx + Math.cos(a1) * rr * p.out
          const y1 = fy + Math.sin(a1) * rr * p.out
          // Speck size follows the hatch's size on screen (a small hatch on a phone gets small ice).
          const z = p.s * k * Math.min(1.1, Math.max(0.5, rr / k / 170))
          const at = T.speckAt + p.t
          return (
            <g
              key={i}
              className="stbgs-speck"
              style={{ '--dx': `${(x0 - x1).toFixed(1)}px`, '--dy': `${(y0 - y1).toFixed(1)}px`, animationDelay: `${at}ms`, animationDuration: `${p.dur}ms` } as CSSProperties}
            >
              <g className="stbgs-speck-in" style={{ animationDelay: `${at}ms` }}>
                <circle cx={x1} cy={y1} r={12 * z} fill={`url(#${uid}shade)`} />
                <circle cx={x1} cy={y1} r={9 * z} fill={`url(#${uid}ice)`} />
                <circle cx={x1} cy={y1} r={2.1 * z} className="stbgs-speck-core" />
                {/* the glint as it freezes: six arms, the shape of an ice crystal */}
                <g className="stbgs-glint" style={{ animationDelay: `${at + p.dur - 120}ms`, transformOrigin: `${x1}px ${y1}px` }}>
                  <path d={star(x1, y1, 10 * z, 0)} strokeWidth={0.95 * k} />
                  <path d={star(x1, y1, 4.2 * z, 30)} strokeWidth={0.75 * k} opacity={0.55} />
                </g>
              </g>
            </g>
          )
        })}
      </SceneSvg>

      <div
        className="stbgs-tag"
        data-align={place?.align ?? 'bottom'}
        data-form={form}
        data-placed={place && place.form === form ? 1 : 0}
        style={place ? { left: `${(place.at[0] * 100).toFixed(3)}%`, top: `${(place.at[1] * 100).toFixed(3)}%` } : undefined}
      >
        <div ref={labelRef} className="stbgs-tag-in">
          {form !== 'compact' && <span className="stbgs-tag-k">Airlock</span>}
          <span className="stbgs-tag-v">Pressure dropping</span>
        </div>
      </div>
    </div>
  )
}

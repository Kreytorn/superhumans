// Station, spikecount: the frozen scene over the still of the lab module.
// The lit window becomes a microscope lens: a thin amber ring locks on the window (anchors.focus, radius
// anchors.r), the lens opens into a loupe, and inside it a real microscope field of lab blood comes into
// focus, blurred to sharp. A short label is engraved along the rim. An illustration of the story: no numbers.
// Only transform, opacity and stroke-dashoffset move, all as CSS animations with fill-mode both, so the
// shell's "end" state shows the last frame at once. The loupe's size and place come from the room the screen
// leaves beside the panel (or above the phone sheet): where the window sits too near an edge, the lens opens
// on the window and glides into the open space beside it, so it stays whole while the panel is open.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { SceneProps } from '../types'
import { FIELD_URL, preloadField } from './field'
import './scene.css'

preloadField()

/** The scene asks the shell to open the panel this long after it starts (the shell's own limit is 2.5 s). */
const DONE_MS = 2250
/** The lens grows to this many times the subject's radius, and at least to this share of the screen's short side. */
const GROW_MAX = 2.4
const LOUPE_MIN = 0.2
const LABEL = 'A blood sample under the lens'
const LABEL_SHORT = 'Under the lens'
/** Screen px kept between the lens and the edges, the panel and the words on the frame. */
const EDGE = 16
const PANEL_GAP = 28
const BEZEL = 13
const LABEL_ROOM = 32

interface Geo {
  /** screen px per still px */
  k: number
  /** final lens radius and centre, in still px */
  R: number
  cx: number
  cy: number
  /** the label goes on the lower arc (when the room above the lens is short) */
  low: boolean
}

/** lo..hi, or the middle of the range when it is empty */
const within = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))

/**
 * Where and how big the lens opens: up to GROW_MAX x the subject, centred on it when the room allows, never
 * over the panel (right of a landscape screen, lower part of a portrait one), the wordmark at the top or the
 * shell's title in the lower left. Measured in screen px from the page itself, returned in still px.
 */
function measure(el: HTMLElement, w: number, fx: number, fy: number, r0: number): Geo | null {
  const box = el.getBoundingClientRect()
  if (!(box.width > 1) || !(w > 0)) return null
  const k = box.width / w
  const root = el.closest<HTMLElement>('.st')
  const rr = root ? root.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  const vw = rr.width
  const vh = rr.height
  const ox = box.left - rr.left
  const oy = box.top - rr.top
  const sx = ox + fx * k
  const sy = oy + fy * k
  const sheet = root?.dataset.layout ? root.dataset.layout === 'sheet' : vh > vw
  const panel = root?.querySelector<HTMLElement>('.st-panel') ?? null
  const card = root?.querySelector<HTMLElement>('.st-card') ?? null
  const mark = root?.querySelector<HTMLElement>('.st-mark') ?? null

  // the free part of the screen, never outside the picture itself
  const left = Math.max(EDGE, ox + EDGE)
  let top = Math.max(EDGE, oy + EDGE)
  let bottom = Math.min(vh - EDGE, oy + box.height - EDGE)
  let right = Math.min(vw - EDGE, ox + box.width - EDGE)
  if (sheet) bottom = Math.min(bottom, (panel?.offsetHeight ? panel.offsetTop : vh * 0.38) - 14)
  else right = Math.min(right, (panel?.offsetWidth ? panel.offsetLeft : vw - Math.min(vw * 0.58, 1120)) - PANEL_GAP)
  if (mark?.offsetHeight) top = Math.max(top, mark.offsetTop + mark.offsetHeight + 6)
  if (!sheet && card?.offsetHeight) bottom = Math.min(bottom, card.offsetTop - 14)

  const r0px = r0 * k
  // big enough to show cells even where the window is small on screen (a phone), never past the free room
  const want = Math.min(r0px * 5, Math.max(r0px * GROW_MAX, Math.min(vw, vh) * LOUPE_MIN))
  const fitW = (right - left - 2 * BEZEL) / 2
  const fitH = (bottom - top - LABEL_ROOM - BEZEL) / 2
  const R = Math.max(r0px, Math.min(want, fitW, fitH))
  const cx = within(sx, left + BEZEL + R, right - BEZEL - R)
  // the label sits on the upper arc, unless the lens can stay nearer the window with it on the lower one
  const up = within(sy, top + LABEL_ROOM + R, bottom - BEZEL - R)
  const down = within(sy, top + BEZEL + R, bottom - LABEL_ROOM - R)
  const low = Math.abs(down - sy) + 0.5 < Math.abs(up - sy)
  const cy = low ? down : up
  return { k, R: R / k, cx: (cx - ox) / k, cy: (cy - oy) / k, low }
}

const pct = (v: number) => `${(v * 100).toFixed(4)}%`

export default function Scene({ w, h, anchors, play, onDone }: SceneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [geo, setGeo] = useState<Geo | null>(null)
  const fx = anchors.focus[0] * w
  const fy = anchors.focus[1] * h
  const r0 = Math.max(2, anchors.r * h)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const g = measure(el, w, fx, fy, r0)
      if (!g) return
      setGeo((o) => (o && o.low === g.low && Math.abs(o.k - g.k) < 1e-4 && Math.abs(o.R - g.R) < 0.5 && Math.abs(o.cx - g.cx) < 0.5 && Math.abs(o.cy - g.cy) < 0.5 ? o : g))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    window.addEventListener('resize', read)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', read)
    }
  }, [w, fx, fy, r0])

  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, DONE_MS)
    return () => window.clearTimeout(t)
  }, [play, onDone])

  return (
    <div ref={ref} className="spk-scene">
      {geo && <Lens uid={uid} w={w} h={h} fx={fx} fy={fy} r0={r0} g={geo} />}
    </div>
  )
}

function Lens({ uid, w, h, fx, fy, r0, g }: { uid: string; w: number; h: number; fx: number; fy: number; r0: number; g: Geo }) {
  const { k, R, cx, cy, low } = g
  // u = one screen pixel, in still pixels: strokes and type keep their screen size on any still and any screen.
  const u = 1 / k
  const s0 = Math.min(1, r0 / R)
  // It opens on the window: the start pose is the window's own place and size.
  const svgFrom: CSSProperties = {
    transformOrigin: `${cx}px ${cy}px`,
    ['--s0' as string]: s0,
    ['--tx' as string]: `${(fx - cx).toFixed(2)}px`,
    ['--ty' as string]: `${(fy - cy).toFixed(2)}px`,
  }
  const htmlFrom: CSSProperties = {
    left: pct((cx - R) / w),
    top: pct((cy - R) / h),
    width: pct((2 * R) / w),
    height: pct((2 * R) / h),
    ['--s0' as string]: s0,
    ['--dx' as string]: pct((fx - cx) / (2 * R)),
    ['--dy' as string]: pct((fy - cy) / (2 * R)),
  }

  // The engraved label: on the upper arc it reads over the top; on the lower arc its letters stand inside it.
  const fs = 11.5 * u
  const rl = low ? R + 15 * u + fs * 0.74 : R + 16 * u
  const fits = (s: string) => (s.length * fs * 0.8) / rl <= 2.0
  const label = (fits(LABEL) ? LABEL : LABEL_SHORT).toUpperCase()
  const arc = low ? `M ${cx - rl} ${cy} A ${rl} ${rl} 0 0 0 ${cx + rl} ${cy}` : `M ${cx - rl} ${cy} A ${rl} ${rl} 0 0 1 ${cx + rl} ${cy}`

  const shadeR = R * 1.55
  const glowR = R + 30 * u
  const ticks = Array.from({ length: 72 }, (_, i) => (i * Math.PI) / 36)
  // three marks on the rim; the label owns the fourth side
  const marks = low ? [0, Math.PI, -Math.PI / 2] : [0, Math.PI / 2, Math.PI]

  return (
    <>
      <svg className="spk-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-shade`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={shadeR}>
            <stop offset={0} stopColor="#030507" stopOpacity={0.55} />
            <stop offset={R / shadeR} stopColor="#030507" stopOpacity={0.5} />
            <stop offset={1} stopColor="#030507" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${uid}-glow`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={glowR}>
            <stop offset={(R - 6 * u) / glowR} stopColor="#ffb45a" stopOpacity={0} />
            <stop offset={R / glowR} stopColor="#ffb45a" stopOpacity={0.3} />
            <stop offset={1} stopColor="#ffb45a" stopOpacity={0} />
          </radialGradient>
          <path id={`${uid}-arc`} d={arc} />
        </defs>
        {/* under the lens: a soft dark halo that lifts it off the frame */}
        <g className="spk-grow" style={svgFrom}>
          <circle className="spk-shade" cx={cx} cy={cy} r={shadeR} fill={`url(#${uid}-shade)`} />
        </g>
      </svg>

      <div className="spk-lens" style={htmlFrom}>
        <div className="spk-lens-in">
          <img className="spk-lens-blur" src={FIELD_URL} alt="" draggable={false} />
          <img className="spk-lens-sharp" src={FIELD_URL} alt="" draggable={false} />
          <i className="spk-lens-glass" />
        </div>
      </div>

      <svg className="spk-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
        <g className="spk-grow" style={svgFrom}>
          <circle className="spk-glow" cx={cx} cy={cy} r={glowR} fill={`url(#${uid}-glow)`} />
          <circle className="spk-ring spk-ring--soft" cx={cx} cy={cy} r={R} pathLength={1} strokeWidth={6 * u} transform={`rotate(-90 ${cx} ${cy})`} />
          <circle className="spk-ring" cx={cx} cy={cy} r={R} pathLength={1} strokeWidth={1.4 * u} transform={`rotate(-90 ${cx} ${cy})`} />
          <g className="spk-bezel">
            <circle cx={cx} cy={cy} r={R + 7.5 * u} strokeWidth={u} />
            {ticks.map((a) => (
              <line
                key={a}
                x1={cx + Math.cos(a) * (R + 2.5 * u)}
                y1={cy + Math.sin(a) * (R + 2.5 * u)}
                x2={cx + Math.cos(a) * (R + 5.5 * u)}
                y2={cy + Math.sin(a) * (R + 5.5 * u)}
                strokeWidth={u}
              />
            ))}
            {marks.map((a) => (
              <line
                key={a}
                className="spk-mark"
                x1={cx + Math.cos(a) * (R - 6 * u)}
                y1={cy + Math.sin(a) * (R - 6 * u)}
                x2={cx + Math.cos(a) * (R + 11 * u)}
                y2={cy + Math.sin(a) * (R + 11 * u)}
                strokeWidth={1.4 * u}
              />
            ))}
          </g>
          <circle className="spk-glint spk-glint--soft" cx={cx} cy={cy} r={R} pathLength={1} strokeWidth={7 * u} />
          <circle className="spk-glint" cx={cx} cy={cy} r={R} pathLength={1} strokeWidth={2 * u} />
        </g>
        <g className="spk-label" style={svgFrom}>
          <text fontSize={fs} strokeWidth={3.2 * u}>
            <textPath href={`#${uid}-arc`} startOffset="50%" textAnchor="middle">
              {label}
            </textPath>
          </text>
        </g>
      </svg>
    </>
  )
}

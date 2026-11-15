// Garn Meter, the frozen scene: the observation window (the cupola), the ringed planet behind it.
// A luminous horizon, the planet's lit edge, sweeps round the window as if the planet tumbled past the glass,
// slows, and freezes. Then a short caption names it and leaves, and the frame holds still.
//
// Drawn in the still's own pixels from the manifest anchors (focus, r), so it lines up with whatever still the
// render pipeline delivers. Every moving part is an HTML layer animated by CSS on transform and opacity only:
// the picture inside each layer is painted once and the GPU turns it, so it stays smooth on integrated graphics
// and on phones. All animations use fill-mode both, so the shell's "end" state shows the last frame at once.
import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { SceneProps } from '../types'
import './scene.css'

/** Proportions, in units of the subject's radius R (anchors.r times the still's height). */
const RET = 1.2 // the reticle round the window
const HZ_D = 1.42 // the horizon's nearest point to the window centre
const HZ_RC = 3.2 // the planet's curvature: the horizon is part of a circle this big
const HZ_HALF = 1.3 // half the visible length of the horizon (its ends fade out)
const LAYER = 2.3 // half the side of a horizon layer (room for its glow)
/** The panel opens just after the freeze has landed (the shell would open it at 2.5 s anyway). */
const DONE_MS = 2400
/** Trailing copies of the horizon while it spins fast: delay (s) and strength. They fade as it slows. */
const ECHOES = [
  { d: 0.04, o: 0.66 },
  { d: 0.085, o: 0.42 },
  { d: 0.13, o: 0.24 },
]

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`

export default function Scene({ w, h, anchors, variant, play, onDone }: SceneProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fx = anchors.focus[0] * w
  const fy = anchors.focus[1] * h
  const R = Math.max(anchors.r, 0.02) * h

  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, DONE_MS)
    return () => window.clearTimeout(t)
  }, [play, onDone])

  // The caption stays inside the visible frame: on a narrow screen it breaks into two lines, and if it still
  // does not fit it slides in from the edge. Measured once per size (and when the fonts arrive), written
  // straight to the element, no re-render.
  const capRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = capRef.current
    if (!el) return
    const M = 16
    const fit = () => {
      const view = (el.closest('.st-film') ?? document.documentElement).getBoundingClientRect()
      el.style.setProperty('--gn-cap-dx', '0px')
      el.dataset.wrap = '0'
      let b = el.getBoundingClientRect()
      if (b.right > view.right - M || b.left < view.left + M) {
        el.dataset.wrap = '1'
        b = el.getBoundingClientRect()
      }
      let dx = 0
      if (b.right > view.right - M) dx = view.right - M - b.right
      if (b.left + dx < view.left + M) dx = view.left + M - b.left
      el.style.setProperty('--gn-cap-dx', `${dx.toFixed(1)}px`)
    }
    fit()
    let live = true
    document.fonts?.ready.then(() => live && fit())
    window.addEventListener('resize', fit)
    return () => {
      live = false
      window.removeEventListener('resize', fit)
    }
  }, [w, h, anchors, variant])

  // Where the horizon comes to rest: its brightest point faces the open side of the frame. On a landscape
  // frame that is the lower right (where the panel opens, and where the planet is in the render); on a
  // portrait frame, the right (the sheet covers the lower part). The turn itself is in scene.css
  // (gn-spin-w ends at -60 deg, gn-spin-t at -90 deg: the horizon is drawn below the window, at 90 deg).
  const restDeg = variant === 'tall' ? 0 : 30 // screen angle of the bright point: 0 = right, 90 = down
  const dir = [Math.cos((restDeg * Math.PI) / 180), Math.sin((restDeg * Math.PI) / 180)]

  // A square layer centred on the window, in % of the scene box (which has the still's aspect ratio).
  const square = (half: number): CSSProperties => ({
    left: pct(fx - half, w),
    top: pct(fy - half, h),
    width: pct(2 * half, w),
    height: pct(2 * half, h),
  })

  const B = LAYER * R
  const view = `${-B} ${-B} ${2 * B} ${2 * B}`
  const cy = HZ_D * R + HZ_RC * R // centre of the planet's circle, below the window in the layer's own frame
  const ids = { fade: `gnf${uid}`, mask: `gnm${uid}`, soft: `gns${uid}`, wide: `gnw${uid}`, tight: `gnt${uid}`, bloom: `gnb${uid}` }
  const ring = HZ_RC * R

  // Time stops: the frame dims round the window, so the light reads over the bright rings. A circle of 2.6 R
  // on the screen: an ellipse in % of the box, whose aspect is the still's.
  const scrimR = 2.6 * R
  const scrim = `radial-gradient(ellipse ${pct(scrimR, w)} ${pct(scrimR, h)} at ${pct(fx, w)} ${pct(fy, h)}, rgba(3,5,7,0) 0%, rgba(3,5,7,0) 38%, rgba(3,5,7,0.4) 68%, rgba(3,5,7,0.52) 100%)`

  // The reticle: the hotspot's lock-on mark, grown round the whole window.
  const rr = RET * R
  const RB = rr * 1.2
  const ticks = [0, 90, 180, 270].map((a) => {
    const c = Math.cos((a * Math.PI) / 180)
    const s = Math.sin((a * Math.PI) / 180)
    return `M${(c * rr * 1.04).toFixed(1)} ${(s * rr * 1.04).toFixed(1)}L${(c * rr * 1.15).toFixed(1)} ${(s * rr * 1.15).toFixed(1)}`
  })
  const minor: string[] = []
  for (let a = 0; a < 360; a += 6) {
    if (a % 90 === 0) continue
    const c = Math.cos((a * Math.PI) / 180)
    const s = Math.sin((a * Math.PI) / 180)
    minor.push(`M${(c * rr * 1.035).toFixed(1)} ${(s * rr * 1.035).toFixed(1)}L${(c * rr * 1.065).toFixed(1)} ${(s * rr * 1.065).toFixed(1)}`)
  }

  // The caption: beside the horizon's bright point on a landscape frame, under the window on a portrait one.
  const tall = variant === 'tall'
  const apex = HZ_D * R
  const cap = tall ? { x: fx, y: fy + (RET * 1.32) * R } : { x: fx + dir[0] * (apex + 0.1 * R), y: fy + dir[1] * (apex + 0.1 * R) }

  return (
    <div className="gn-scene" data-variant={variant}>
      {/* Shared paint for the horizon layers: the fade at its ends, three blurs (painted once per layer), the bloom. */}
      <svg className="gn-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={ids.fade} gradientUnits="userSpaceOnUse" x1={-HZ_HALF * R} y1="0" x2={HZ_HALF * R} y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.16" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.84" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={ids.mask} maskUnits="userSpaceOnUse" x={-B} y={-B} width={2 * B} height={2 * B}>
            <rect x={-HZ_HALF * R} y={-B} width={2 * HZ_HALF * R} height={2 * B} fill={`url(#${ids.fade})`} />
          </mask>
          {/* Filter regions in the layers' own space, so a blur never works on more than one layer's area. */}
          <filter id={ids.soft} filterUnits="userSpaceOnUse" x={-B} y={-B} width={2 * B} height={2 * B}>
            <feGaussianBlur stdDeviation={(0.022 * R).toFixed(2)} />
          </filter>
          <filter id={ids.wide} filterUnits="userSpaceOnUse" x={-B} y={-B} width={2 * B} height={2 * B}>
            <feGaussianBlur stdDeviation={(0.07 * R).toFixed(2)} />
          </filter>
          <filter id={ids.tight} filterUnits="userSpaceOnUse" x={-B} y={-B} width={2 * B} height={2 * B}>
            <feGaussianBlur stdDeviation={(0.012 * R).toFixed(2)} />
          </filter>
          <radialGradient id={ids.bloom}>
            <stop offset="0" stopColor="#ffd9a3" stopOpacity="0.7" />
            <stop offset="0.4" stopColor="#ffb45a" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="gn-scrim" style={{ backgroundImage: scrim }} />

      {/* The reticle closes round the window, the way a hotspot locks on. */}
      <div className="gn-ret" style={square(RB)}>
        <svg viewBox={`${-RB} ${-RB} ${2 * RB} ${2 * RB}`} width="100%" height="100%" aria-hidden="true" focusable="false">
          <circle className="gn-ret-ring" r={rr} pathLength={100} strokeDasharray="21 4" strokeDashoffset="23" vectorEffect="non-scaling-stroke" />
          <path className="gn-ret-minor" d={minor.join('')} vectorEffect="non-scaling-stroke" />
          <path className="gn-ret-tick" d={ticks.join('')} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* Motion: fading copies that trail the horizon while it turns fast. */}
      {ECHOES.map((e, i) => (
        <div key={i} className="gn-echo" style={{ ...square(B), opacity: e.o }}>
          <div className="gn-hz gn-hz--echo" style={{ animationDelay: `${e.d}s, ${e.d}s` }}>
            <svg viewBox={view} width="100%" height="100%" aria-hidden="true" focusable="false">
              <g mask={`url(#${ids.mask})`}>
                <circle className="gn-hz-air" cx="0" cy={cy} r={ring + 0.035 * R} strokeWidth={0.1 * R} filter={`url(#${ids.soft})`} />
                <circle className="gn-hz-core" cx="0" cy={cy} r={ring} vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
          </div>
        </div>
      ))}

      {/* The horizon itself: the planet's lit edge, its glow on the window side, the dim planet beyond it. */}
      <div className="gn-hz-wrap" style={square(B)}>
        <div className="gn-hz gn-hz--main">
          <svg viewBox={view} width="100%" height="100%" aria-hidden="true" focusable="false">
            <g mask={`url(#${ids.mask})`}>
              {/* a dark channel under the light, so it reads over bright metal and rings */}
              <circle className="gn-hz-shade" cx="0" cy={cy} r={ring} strokeWidth={0.3 * R} filter={`url(#${ids.wide})`} />
              <circle className="gn-hz-body" cx="0" cy={cy} r={ring - 0.14 * R} strokeWidth={0.28 * R} filter={`url(#${ids.wide})`} />
              <circle className="gn-hz-air" cx="0" cy={cy} r={ring + 0.035 * R} strokeWidth={0.12 * R} filter={`url(#${ids.soft})`} />
              <circle className="gn-hz-hot" cx="0" cy={cy} r={ring} strokeWidth={0.05 * R} filter={`url(#${ids.tight})`} />
              <circle className="gn-hz-core" cx="0" cy={cy} r={ring} vectorEffect="non-scaling-stroke" />
            </g>
            <circle className="gn-hz-bloom" cx="0" cy={apex} r={0.55 * R} fill={`url(#${ids.bloom})`} />
          </svg>
        </div>
      </div>

      {/* Time stops: the frozen edge flares once (its own layer, set at the resting angle) and a ring leaves the window. */}
      <div className="gn-flash" style={square(B)}>
        <svg viewBox={view} width="100%" height="100%" aria-hidden="true" focusable="false">
          <g mask={`url(#${ids.mask})`}>
            <circle className="gn-flash-line" cx="0" cy={cy} r={ring} vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
      </div>
      <div className="gn-pulse" style={square(rr)} />

      <div ref={capRef} className={`gn-cap${tall ? ' gn-cap--under' : ''}`} style={{ left: pct(cap.x, w), top: pct(cap.y, h) }}>
        <p className="gn-cap-in">
          {!tall && <i className="gn-cap-lead" />}
          <span className="gn-cap-text">
            <span>The planet spins</span> <span>past the glass</span>
          </span>
        </p>
      </div>
    </div>
  )
}

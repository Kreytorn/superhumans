// Station / TrackTrace, the frozen scene. A heavy ion crosses the frame in one straight line and goes through
// the crew module's hull: it draws in fast (a white-hot core in a thin warm halo), flashes where it meets the
// hull, throws a few sparks that slow down and hang frozen when time stops, and the hit gets circled the way
// IonScan circles a damage spot. Then the line holds, faint.
//
// Drawn in the still's own pixels from the manifest anchors: the path runs from `a` toward `b` (extended to the
// frame edges, a particle does not stop) and meets the hull where it passes `focus`. Every move is a CSS
// animation of transform, opacity or a stroke offset with fill-mode both, so the shell's "end" state shows the
// held last frame at once. No filters, no blend modes, nothing that keeps running on the last frame.
// An illustration of the story, not data: no numbers, no words.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { SceneSvg } from '../kit'
import type { Anchors, SceneProps } from '../types'
import './scene.css'

type P2 = [number, number]
type Vars = CSSProperties & Record<`--${string}`, string>

/** Scene clock (ms from the start): the ion enters the frame at T_IN and crosses all of it in CROSS. */
const T_IN = 320
const CROSS = 190
/** The last spark stops at most this long after the hit (see debris()); then the panel may open. */
const SETTLE = 1910
/** ...but never later than this, inside the shell's 2.5 s. */
const T_DONE_MAX = 2440
/** Screen px per still px until the box has been measured (a 1440 x 900 screen showing a 1920 x 1080 frame). */
const K0 = 0.83

/** Small seeded generator, so the sparks freeze in the same places on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Geo {
  /** Where the path comes in, just outside the frame edge. */
  S: P2
  /** Length of the visible path across the frame, and its direction in degrees. */
  len: number
  deg: number
  /** Distance from S to the impact, along the path. */
  hit: number
  /** The impact on the hull: `focus` projected onto the straight path. */
  P: P2
  /** The subject's radius in still px. */
  R: number
}

function geometry(w: number, h: number, an: Anchors): Geo {
  const F: P2 = [an.focus[0] * w, an.focus[1] * h]
  // Without a and b: a plain diagonal through the focus.
  const A: P2 = an.a ? [an.a[0] * w, an.a[1] * h] : [F[0] - w, F[1] - w * 0.7]
  const B: P2 = an.b ? [an.b[0] * w, an.b[1] * h] : [F[0] + w, F[1] + w * 0.7]
  let dx = B[0] - A[0]
  let dy = B[1] - A[1]
  const n = Math.hypot(dx, dy) || 1
  dx /= n
  dy /= n
  // The whole chord of the line across the frame, a little past each edge so neither end ever shows.
  const m = 0.04 * Math.max(w, h)
  let t0 = -Infinity
  let t1 = Infinity
  const clip = (p: number, d: number, lo: number, hi: number) => {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) t0 = t1 = 0
      return
    }
    const ta = (lo - p) / d
    const tb = (hi - p) / d
    t0 = Math.max(t0, Math.min(ta, tb))
    t1 = Math.min(t1, Math.max(ta, tb))
  }
  clip(A[0], dx, -m, w + m)
  clip(A[1], dy, -m, h + m)
  if (!(t1 > t0)) {
    t0 = 0
    t1 = n
  }
  const tp = Math.min(t1, Math.max(t0, (F[0] - A[0]) * dx + (F[1] - A[1]) * dy))
  return {
    S: [A[0] + dx * t0, A[1] + dy * t0],
    len: t1 - t0,
    deg: (Math.atan2(dy, dx) * 180) / Math.PI,
    hit: tp - t0,
    P: [A[0] + dx * tp, A[1] + dy * tp],
    R: Math.max(8, an.r * h),
  }
}

interface Bit {
  /** Direction relative to the ion's path, degrees. */
  deg: number
  /** How far it flies before it hangs, still px. */
  d: number
  dur: number
  at: number
  /** Length of its motion streak and size of its head, screen px. */
  tail: number
  size: number
  /** Brightness it keeps when frozen. */
  rest: number
  cold: boolean
}

/**
 * The debris thrown off the hit. `R` is the radius of what was hit (the manifest's r), `cap` the farthest a
 * piece may fly (still px), so a large subject never sprays across the whole frame.
 */
function debris(R: number, cap: number, hitAt: number): { sparks: Bit[]; dust: Bit[] } {
  const rnd = seeded(238)
  const far = (v: number) => Math.min(cap, v)
  const sparks: Bit[] = []
  // Half of it goes on the way the ion was going (a cone forward); the rest bursts out round the sides.
  // When time stops they are still moving a little, so each keeps a short streak: a burst caught in a still.
  for (let i = 0; i < 14; i++) {
    const forward = i < 7
    const side = rnd() < 0.5 ? -1 : 1
    sparks.push({
      deg: forward ? (rnd() - 0.5) * 90 : side * (55 + rnd() * 125),
      d: far(R * (forward ? 0.85 + rnd() * 1.45 : 0.6 + rnd() * 0.8)),
      dur: 1300 + rnd() * 560,
      at: hitAt + rnd() * 45,
      tail: forward ? 34 + rnd() * 40 : 20 + rnd() * 20,
      size: 1.4 + rnd() * 1.1,
      rest: 0.7 + rnd() * 0.3,
      cold: false,
    })
  }
  const dust: Bit[] = []
  for (let i = 0; i < 18; i++) {
    dust.push({
      deg: rnd() * 360,
      d: far(R * (0.35 + rnd() * 1.4)),
      dur: 1100 + rnd() * 700,
      at: hitAt + 20 + rnd() * 70,
      tail: 0,
      size: 0.7 + rnd() * 0.6,
      rest: 0.3 + rnd() * 0.4,
      cold: rnd() < 0.45,
    })
  }
  return { sparks, dust }
}

const f1 = (v: number) => v.toFixed(1)
const f2 = (v: number) => v.toFixed(2)

export default function Scene({ w, h, anchors, play, onDone }: SceneProps) {
  // Line widths are set in screen px, so they read the same on a laptop and a phone: measure the box.
  const boxRef = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(K0)
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const read = () => {
      const W = el.getBoundingClientRect().width
      if (W > 1) setK(Math.min(4, Math.max(0.15, W / w)))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])

  const fx = anchors.focus[0]
  const fy = anchors.focus[1]
  const ax = anchors.a?.[0]
  const ay = anchors.a?.[1]
  const bx = anchors.b?.[0]
  const by = anchors.b?.[1]
  const r = anchors.r
  const g = useMemo(
    () =>
      geometry(w, h, {
        focus: [fx, fy],
        r,
        a: ax !== undefined && ay !== undefined ? [ax, ay] : undefined,
        b: bx !== undefined && by !== undefined ? [bx, by] : undefined,
      }),
    [w, h, fx, fy, r, ax, ay, bx, by],
  )
  const hitAt = Math.round(T_IN + (CROSS * g.hit) / Math.max(1, g.len))

  // Tell the shell once the last spark has stopped, so the panel opens on the held frame.
  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, Math.min(T_DONE_MAX, hitAt + SETTLE))
    return () => window.clearTimeout(t)
  }, [play, onDone, hitAt])

  /** n screen px, in still px. */
  const px = (n: number) => n / k
  const cap = px(190)
  const bits = useMemo(() => debris(g.R, cap, hitAt), [g.R, cap, hitAt])

  // The anchors' r is the size of what was hit (a window): the circle closes just outside it.
  const ringR = Math.min(px(110), Math.max(px(24), g.R * 1.2))
  // Spark streaks are sized for a hit about 65 px across on screen (a laptop); on a small picture they shorten.
  const tailK = Math.min(1, Math.max(0.45, (g.R * k) / 65))
  const vars: Vars = {
    '--in': `${T_IN}ms`,
    '--cross': `${CROSS}ms`,
    '--hit': `${hitAt}ms`,
    '--len': `${f1(g.len)}px`,
  }
  // The frame lights up for an instant round the hit (a plain layer, so only its opacity moves).
  const blink: CSSProperties = {
    background: `radial-gradient(circle at ${f2((g.P[0] / w) * 100)}% ${f2((g.P[1] / h) * 100)}%, rgba(255, 222, 178, 0.5), rgba(255, 180, 90, 0.16) 14%, rgba(255, 180, 90, 0) 42%)`,
  }

  return (
    <div ref={boxRef} className="stt-scene" style={vars}>
      <i className="stt-blink" style={blink} />
      <SceneSvg w={w} h={h}>
        <defs>
          {/* across a band: clear at both edges, lit along the middle (a glow without a filter) */}
          <linearGradient id="stt-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffb45a" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffc98a" stopOpacity="1" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="stt-flash">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.16" stopColor="#fff4e2" stopOpacity="0.95" />
            <stop offset="0.42" stopColor="#ffc47c" stopOpacity="0.42" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="stt-ember">
            <stop offset="0" stopColor="#fff3df" stopOpacity="1" />
            <stop offset="0.3" stopColor="#ffcf94" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="stt-head">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.4" stopColor="#ffe3bd" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
          </radialGradient>
          {/* the film's lens: a thin cold anamorphic streak across the flash */}
          <radialGradient id="stt-flare">
            <stop offset="0" stopColor="#f2f7ff" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#cddff3" stopOpacity="0.4" />
            <stop offset="1" stopColor="#8fb3d9" stopOpacity="0" />
          </radialGradient>
          {/* a spark's motion streak: bright at its head (right), gone at its tail */}
          <linearGradient id="stt-tail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffb45a" stopOpacity="0" />
            <stop offset="0.65" stopColor="#ffcf94" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fff6ea" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* the ion's path, in its own frame: x runs along the path from where it comes in, y across it */}
        <g transform={`translate(${f1(g.S[0])} ${f1(g.S[1])}) rotate(${f2(g.deg)})`}>
          <g className="stt-draw">
            <rect className="stt-glow" x={0} y={-px(22)} width={g.len} height={px(44)} fill="url(#stt-band)" />
            <rect className="stt-halo" x={0} y={-px(5.5)} width={g.len} height={px(11)} fill="url(#stt-band)" />
            <rect className="stt-trail" x={0} y={-px(0.65)} width={g.len} height={px(1.3)} />
            <rect className="stt-core" x={0} y={-px(1.15)} width={g.len} height={px(2.3)} />
          </g>
          <g className="stt-head">
            <ellipse cx={-px(40)} cy={0} rx={px(48)} ry={px(3.4)} fill="url(#stt-head)" />
            <circle r={px(2.6)} fill="#ffffff" />
          </g>
          {/* what the hull throws off, flying on and slowing to a stop */}
          <g transform={`translate(${f1(g.hit)} 0)`}>
            {bits.dust.map((b, i) => (
              <g key={`d${i}`} transform={`rotate(${f1(b.deg)})`}>
                <circle
                  className="stt-dust"
                  r={px(b.size)}
                  fill={b.cold ? '#d6e4f3' : '#ffd9a8'}
                  style={{ '--d': `${f1(b.d)}px`, '--dur': `${Math.round(b.dur)}ms`, '--at': `${Math.round(b.at)}ms`, '--rest': f2(b.rest) } as Vars}
                />
              </g>
            ))}
            {bits.sparks.map((b, i) => (
              <g key={`s${i}`} transform={`rotate(${f1(b.deg)})`}>
                <g className="stt-spark" style={{ '--d': `${f1(b.d)}px`, '--dur': `${Math.round(b.dur)}ms`, '--at': `${Math.round(b.at)}ms`, '--rest': f2(b.rest) } as Vars}>
                  <rect className="stt-spark-tail" x={-px(b.tail * tailK)} y={-px(0.75)} width={px(b.tail * tailK)} height={px(1.5)} fill="url(#stt-tail)" />
                  {b.size > 2 && <circle className="stt-spark-dot" r={px(b.size * 3.2)} fill="url(#stt-ember)" fillOpacity={0.5} />}
                  <circle className="stt-spark-dot" r={px(b.size)} fill="#fff4e4" />
                </g>
              </g>
            ))}
          </g>
        </g>

        {/* the hit itself, upright on the screen: the flash, the lens streak, the ember, and the circle */}
        <g transform={`translate(${f1(g.P[0])} ${f1(g.P[1])})`}>
          <ellipse className="stt-flare" rx={Math.max(g.R * 5, px(280))} ry={px(2.6)} fill="url(#stt-flare)" />
          <circle className="stt-flash" r={Math.min(px(170), Math.max(g.R * 1.6, px(64)))} fill="url(#stt-flash)" />
          <circle className="stt-ember" r={px(13)} fill="url(#stt-ember)" />
          <g transform={`rotate(${f2(g.deg + 180)})`}>
            {/* a dark edge under the lit line, so the circle reads on a bright window as well as on the dark hull */}
            <circle className="stt-ring stt-ring--shade" r={ringR} pathLength={1} strokeWidth={px(4.5)} />
            <circle className="stt-ring stt-ring--glow" r={ringR} pathLength={1} strokeWidth={px(6)} />
            <circle className="stt-ring" r={ringR} pathLength={1} strokeWidth={px(1.6)} />
          </g>
        </g>
      </SceneSvg>
    </div>
  )
}

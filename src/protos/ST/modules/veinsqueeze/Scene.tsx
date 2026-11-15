// Station, VeinSqueeze: the frozen scene. "A clot is a vein that won't squash."
// The probe sits on the subject (the med bay) and an ultrasound fan opens below it. Inside, two veins drawn as soft
// rings are pressed from above at the same moment: the open vein squashes flat, the clotted one stays round. Then
// everything holds still. An illustration of the story, not data: no numbers; the two words come from the sentence.
//
// Placed only from the manifest anchors (focus; r as a lower bound for the size), so it lines up with any still.
// Everything moves with CSS keyframes (fill-mode both): the shell's "end" state shows the last frame at once.
// Only transform, opacity and stroke-dashoffset animate; nothing runs after the last frame.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { SceneSvg } from '../kit'
import type { Anchors, SceneProps, VariantName } from '../types'
import './scene.css'

/** The drawing has finished by then; the panel may open. */
const DONE_MS = 2400
const DEG = Math.PI / 180

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const n1 = (v: number) => v.toFixed(1)
type Vars = CSSProperties & Record<`--${string}`, string>

/**
 * Where everything sits, in the still's own pixels. The probe sits on the subject (focus) and the picture opens
 * below it, down to a floor: the shell's title on wide frames, the phone's sheet on tall ones. U is the drawing's
 * unit: as large as that room allows (a share of the frame's short side, never smaller than the subject); only
 * where the room is too small does the drawing rise above the subject instead of shrinking further.
 */
/** The drawing's proportions, in U. Tall frames (phones) are short of height and have width to spare: there the fan
 *  opens wider and shallower with the veins further apart, so it is drawn larger in the same height. */
const SHAPE = {
  // th: half the fan's opening (deg) · depth: its far edge · dv: the veins' depth · sep: their distance from the
  // middle · pad, lift: half a pad's length, and how far above it comes in · word: gap under a vein to its word ·
  // near / far: depth bands of tissue grain · layers: faint tissue layers · ticks: the depth scale on the edge
  wide: { th: 42, depth: 2.3, dv: 1.45, sep: 0.46, pad: 0.32, lift: 0.14, word: 0.19, near: [0.3, 0.8], far: [2.14, 2.28], layers: [0.56, 2.2], ticks: [0.7, 1.1, 1.5, 1.9] },
  tall: { th: 52, depth: 2.1, dv: 1.24, sep: 0.55, pad: 0.3, lift: 0.1, word: 0.15, near: [0.3, 0.66], far: null, layers: [0.5], ticks: [0.6, 1.0, 1.4, 1.8] },
} as const

function plan(w: number, h: number, a: Anchors, variant: VariantName) {
  const tall = variant === 'tall'
  const S = SHAPE[variant]
  const base = Math.min(w, h)
  const th = S.th * DEG
  const fy = a.focus[1] * h
  const floor = (tall ? 0.375 : 0.84) * h
  const want = clamp(a.r * h, (tall ? 0.17 : 0.16) * base, 0.22 * base)
  const U = Math.max(0.1 * base, Math.min(want, (floor - fy) / S.depth))
  const r0 = 0.24 * U // the probe face
  const r1 = S.depth * U
  const halfW = r1 * Math.sin(th)
  const m = 0.04 * base
  const ax = clamp(a.focus[0] * w, halfW + m, w - halfW - m)
  const ay = clamp(Math.min(fy, floor - r1), 0.06 * h, h - r1 - m)
  const P = (rho: number, phi: number) => `${n1(ax + rho * Math.sin(phi))} ${n1(ay + rho * Math.cos(phi))}`

  // left edge down, the far arc, right edge up: drawn in that order as the fan opens
  const edge = `M${P(r0, -th)}L${P(r1, -th)}A${n1(r1)} ${n1(r1)} 0 0 0 ${P(r1, th)}L${P(r0, th)}`
  const fill = `${edge}A${n1(r0)} ${n1(r0)} 0 0 1 ${P(r0, -th)}Z`
  const face = `M${P(r0, -th)}A${n1(r0)} ${n1(r0)} 0 0 0 ${P(r0, th)}`

  // Tissue, as on an ultrasound image: grain, dense under the probe and deep below the veins, sparse at the sides,
  // and two faint layers running across (all clipped to the fan). Seeded, so it is the same picture every time.
  // The band the veins, pads and words use stays clear. Depths and offsets in U from the apex.
  let seed = 0x5eed
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const grain = ['', '', '']
  const tanTh = Math.tan(th)
  const top = S.near[1] // the veins' band starts here...
  const bottom = S.far ? S.far[0] : S.depth // ...and ends here
  const clear = S.sep + 0.47 // and this far from the middle it is kept clear of grain
  for (let i = 0, made = 0; i < 900 && made < (tall ? 150 : 190); i++) {
    const band = rnd()
    const d =
      band < 0.55
        ? S.near[0] + rnd() * (S.near[1] - S.near[0])
        : band < 0.8 && S.far
          ? S.far[0] + rnd() * (S.far[1] - S.far[0])
          : top + rnd() * (bottom - top)
    const x = (rnd() * 2 - 1) * d * tanTh
    if (d > top - 0.02 && d < bottom && Math.abs(x) < clear) continue
    if (Math.hypot(x, d) > S.depth - 0.04) continue
    const len = 0.02 + 0.08 * rnd() * rnd()
    grain[Math.min(2, Math.floor(rnd() * 3))] += `M${n1(ax + x * U)} ${n1(ay + d * U)}h${n1(len * U)}`
    made++
  }
  const dash = (...k: number[]) => k.map((v) => n1(v * U)).join(' ')
  const patterns = [dash(0.34, 0.05, 0.12, 0.08, 0.5, 0.06), dash(0.22, 0.07, 0.46, 0.05, 0.16, 0.09)]
  const layers = S.layers.map((d, i) => ({ y: ay + d * U, dash: patterns[i % 2], o: i ? 0.28 : 0.34, x1: ax - halfW, x2: ax + halfW }))
  // a quiet depth scale on the right edge (no numbers)
  const ticks = S.ticks.map((rho) => {
    const x = ax + rho * U * Math.sin(th)
    const y = ay + rho * U * Math.cos(th)
    const t = 0.085 * U
    return { x1: x, y1: y, x2: x + t * Math.cos(th), y2: y - t * Math.sin(th) }
  })

  // the two veins, side by side
  const R = 0.27 * U
  const cy = ay + S.dv * U
  const gap = 0.22 * U // between a pad and its vein before the press
  const squash = 0.2 // the open vein ends this flat (share of its height), pressed onto its far wall
  const veins = [
    { cx: ax - S.sep * U, clot: false, travel: 2 * R * (1 - squash) + gap },
    { cx: ax + S.sep * U, clot: true, travel: gap },
  ]
  // the clot's inner texture: a few fixed specks (an illustration; the same every time)
  const specks = [
    [-0.34, -0.22, 0.07],
    [0.18, -0.4, 0.05],
    [0.38, 0.12, 0.06],
    [-0.12, 0.3, 0.05],
    [0.02, -0.02, 0.04],
    [-0.42, 0.18, 0.04],
    [0.3, 0.42, 0.04],
  ].map(([x, y, s]) => ({ x: x * R, y: y * R - R, s: s * R }))
  return { U, ax, ay, r0, r1, th, edge, fill, face, grain, layers, ticks, R, cy, gap, squash, veins, specks, pad: S.pad * U, lift: S.lift * U, word: cy + R + S.word * U }
}

/** One CSS pixel in still pixels, so hairlines stay hairlines on a phone and on a projector. */
function useStillPx(w: number, h: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(() => (typeof window === 'undefined' ? 1 : Math.max(window.innerWidth / w, window.innerHeight / h)))
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const read = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) setK(width / w)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])
  return [ref, (cssPx: number) => cssPx / k] as const
}

export default function Scene({ w, h, anchors, variant, play, onDone }: SceneProps) {
  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, DONE_MS)
    return () => window.clearTimeout(t)
  }, [play, onDone])

  const [boxRef, px] = useStillPx(w, h)
  const g = useMemo(() => plan(w, h, anchors, variant), [w, h, anchors, variant])
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clip = `vsqs-fan-${uid}`
  const shade = `vsqs-shade-${uid}`
  const beam = `vsqs-beam-${uid}`
  const at = (x: number, y: number): CSSProperties => ({ left: `${((x / w) * 100).toFixed(3)}%`, top: `${((y / h) * 100).toFixed(3)}%` })

  return (
    <div ref={boxRef} className="vsqs" data-variant={variant}>
      <SceneSvg w={w} h={h}>
        <defs>
          <clipPath id={clip}>
            <path d={g.fill} />
          </clipPath>
          {/* the picture darkens with depth, as an ultrasound image does */}
          <linearGradient id={shade} gradientUnits="userSpaceOnUse" x1="0" y1={n1(g.ay)} x2="0" y2={n1(g.ay + g.r1)}>
            <stop offset="0" stopColor="#030507" stopOpacity="0.5" />
            <stop offset="0.55" stopColor="#030507" stopOpacity="0.74" />
            <stop offset="1" stopColor="#030507" stopOpacity="0.86" />
          </linearGradient>
          <radialGradient id={beam} gradientUnits="userSpaceOnUse" cx={n1(g.ax)} cy={n1(g.ay)} r={n1(g.r1)}>
            <stop offset="0" stopColor="#8fb3d9" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#8fb3d9" stopOpacity="0.07" />
            <stop offset="1" stopColor="#8fb3d9" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* the picture: dark glass in the shape of the beam, so the light lines read over a bright hull */}
        <path className="vsqs-fill" d={g.fill} fill={`url(#${shade})`} />
        <path className="vsqs-beam" d={g.fill} fill={`url(#${beam})`} />
        <g className="vsqs-tissue" clipPath={`url(#${clip})`}>
          {g.layers.map((l, i) => (
            <line
              key={`l${i}`}
              x1={n1(l.x1)}
              x2={n1(l.x2)}
              y1={n1(l.y)}
              y2={n1(l.y)}
              strokeWidth={px(1.1)}
              strokeDasharray={l.dash}
              style={{ '--o': String(l.o), animationDelay: `${(0.3 + i * 0.22).toFixed(2)}s` } as Vars}
            />
          ))}
          {g.grain.map((d, i) => (
            <path key={`g${i}`} d={d} strokeWidth={px(1.5)} style={{ '--o': ['0.26', '0.42', '0.64'][i], animationDelay: `${(0.28 + i * 0.08).toFixed(2)}s` } as Vars} />
          ))}
        </g>
        <path className="vsqs-edge vsqs-edge--halo" d={g.edge} pathLength={1} strokeWidth={px(8)} />
        <path className="vsqs-edge" d={g.edge} pathLength={1} strokeWidth={px(1.4)} />
        <g className="vsqs-ticks" strokeWidth={px(1.2)}>
          {g.ticks.map((t, i) => (
            <line key={i} x1={n1(t.x1)} y1={n1(t.y1)} x2={n1(t.x2)} y2={n1(t.y2)} />
          ))}
        </g>
        {/* the beam that sweeps the picture open, once */}
        <g transform={`translate(${n1(g.ax)} ${n1(g.ay)})`}>
          <g className="vsqs-sweep" style={{ '--th': `${(g.th / DEG).toFixed(1)}deg` } as Vars}>
            <line className="vsqs-sweep-halo" x1="0" y1={n1(g.r0)} x2="0" y2={n1(g.r1)} strokeWidth={px(9)} />
            <line x1="0" y1={n1(g.r0)} x2="0" y2={n1(g.r1)} strokeWidth={px(1.6)} />
          </g>
        </g>
        {/* the probe face: where the press comes from */}
        <path className="vsqs-face vsqs-face--halo" d={g.face} strokeWidth={px(12)} />
        <path className="vsqs-face" d={g.face} strokeWidth={px(2.5)} />

        {g.veins.map((v) => (
          <g key={v.clot ? 'clot' : 'open'} transform={`translate(${n1(v.cx)} ${n1(g.cy)})`}>
            <g className="vsqs-vein" data-clot={v.clot ? 1 : undefined}>
              {/* the press scales round the vein's far wall (its bottom), where it is pressed against */}
              <g transform={`translate(0 ${n1(g.R)})`}>
                <g className={v.clot ? 'vsqs-hold' : 'vsqs-squash'} style={{ '--sq': String(g.squash) } as Vars}>
                  <ellipse className={v.clot ? 'vsqs-clot' : 'vsqs-lumen'} cx="0" cy={n1(-g.R)} rx={n1(g.R)} ry={n1(g.R)} />
                  {v.clot && g.specks.map((s, i) => <circle key={i} className="vsqs-speck" cx={n1(s.x)} cy={n1(s.y)} r={n1(s.s)} />)}
                  <ellipse className="vsqs-ring vsqs-ring--halo" cx="0" cy={n1(-g.R)} rx={n1(g.R)} ry={n1(g.R)} />
                  <ellipse className="vsqs-ring" cx="0" cy={n1(-g.R)} rx={n1(g.R)} ry={n1(g.R)} />
                </g>
              </g>
            </g>
            {v.clot && (
              <g className="vsqs-echo">
                <circle r={n1(g.R)} />
              </g>
            )}
          </g>
        ))}
        {/* the pads press inside the picture: clipped to the fan */}
        <g clipPath={`url(#${clip})`}>
          {g.veins.map((v) => (
            <g key={v.clot ? 'pad-clot' : 'pad-open'} transform={`translate(${n1(v.cx)} ${n1(g.cy - g.R - g.gap)})`}>
              <g className="vsqs-pad-in" style={{ '--lift': `${n1(-g.lift)}px` } as Vars}>
                <g
                  className={v.clot ? 'vsqs-push' : 'vsqs-press'}
                  style={{ '--gap': `${n1(g.gap)}px`, '--travel': `${n1(v.travel)}px`, '--give': `${n1(0.1 * g.R)}px` } as Vars}
                >
                  <line className="vsqs-pad vsqs-pad--halo" x1={n1(-g.pad)} x2={n1(g.pad)} y1="0" y2="0" strokeWidth={px(12)} />
                  <line className="vsqs-pad" x1={n1(-g.pad)} x2={n1(g.pad)} y1="0" y2="0" strokeWidth={px(2.75)} />
                </g>
              </g>
            </g>
          ))}
        </g>
      </SceneSvg>
      {g.veins.map((v) => (
        <p key={v.clot ? 'w-clot' : 'w-open'} className="vsqs-word" data-clot={v.clot ? 1 : undefined} style={at(v.cx, g.word)}>
          {v.clot ? 'Clot' : 'Vein'}
        </p>
      ))}
    </div>
  )
}

// BrainDrift's frozen scene (Station): in the zero-g core, fluid drifts toward the head.
// Beads of fluid rise from the subject along the manifest's `up`, slow down and hang frozen, each catching the
// light as it stops; one thin amber axis with an arrowhead runs the same way, and a short label stands at its
// head. Everything is placed from the manifest anchors (drift.ts), in the still's own pixels, so it lines up with
// whatever still the render ships. Two layers: the light (glows, trails) is screen-blended into the film; the
// cores are drawn plainly on top so they keep their edge on a bright hull.
// Motion is CSS keyframes only (transform, opacity, stroke offsets) with fill-mode both: when the shell sets the
// scene box to "end" (deep link, skip, reduced motion, panel open) every piece jumps to its held frame.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { SceneSvg } from '../kit'
import type { SceneProps } from '../types'
import { layoutDrift, type DriftLayout } from './drift'
import './scene.css'

/** The last droplet stops at about 2.2 s; the held frame then stands a moment before the panel is asked for. */
const DONE_MS = 2350

type Vars = CSSProperties & Record<`--${string}`, string>
const px = (v: number) => `${v.toFixed(2)}px`
const f2 = (v: number) => v.toFixed(2)

export default function Scene({ w, h, anchors, play, onDone }: SceneProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLParagraphElement>(null)
  const [lay, setLay] = useState<DriftLayout | null>(null)
  const uid = `bd${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  // Measure where the box is on screen (it can be larger than the screen) and lay the column out from the anchors.
  useLayoutEffect(() => {
    const root = rootRef.current
    const label = labelRef.current
    if (!root || !label) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return
      const page = root.closest('.st')
      const v = page ? page.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      const next = layoutDrift({
        w,
        h,
        anchors,
        box: { x: r.left - v.left, y: r.top - v.top, w: r.width, h: r.height },
        view: { w: v.width, h: v.height },
        label: { w: label.offsetWidth, h: label.offsetHeight },
      })
      setLay((old) => (old && JSON.stringify(old) === JSON.stringify(next) ? old : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(label)
    return () => ro.disconnect()
  }, [w, h, anchors])

  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, DONE_MS)
    return () => window.clearTimeout(t)
  }, [play, onDone])

  const motion = (d: DriftLayout['drops'][number]): Vars => ({
    '--sx': px(-d.dx),
    '--sy': px(-d.dy),
    '--delay': `${d.delay.toFixed(2)}s`,
    '--dur': `${d.dur.toFixed(2)}s`,
  })

  return (
    <div ref={rootRef} className="stbd-scene" data-on={lay ? '1' : undefined}>
      {lay && (
        <>
          {/* the light: added to the film */}
          <SceneSvg w={w} h={h} className="stbd-light">
            <defs>
              <linearGradient id={`${uid}-axis`} gradientUnits="userSpaceOnUse" x1={lay.axis.x0} y1={lay.axis.y0} x2={lay.axis.x1} y2={lay.axis.y1}>
                <stop offset="0" stopColor="#ffb45a" stopOpacity="0" />
                <stop offset="0.3" stopColor="#ffb45a" stopOpacity="0.32" />
                <stop offset="0.7" stopColor="#ffc47c" stopOpacity="0.75" />
                <stop offset="1" stopColor="#ffe2b8" stopOpacity="1" />
              </linearGradient>
              <radialGradient id={`${uid}-halo`}>
                <stop offset="0" stopColor="#fff3e2" stopOpacity="0.5" />
                <stop offset="0.3" stopColor="#ffd9a8" stopOpacity="0.2" />
                <stop offset="1" stopColor="#ffb45a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${uid}-trail`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4f7fb" stopOpacity="0.55" />
                <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line className="stbd-axis stbd-axis-glow" x1={lay.axis.x0} y1={lay.axis.y0} x2={lay.axis.x1} y2={lay.axis.y1} pathLength={1} stroke={`url(#${uid}-axis)`} />
            {lay.drops.map((d, i) => (
              <g key={i} transform={`translate(${f2(d.x)} ${f2(d.y)})`}>
                <g className="stbd-drop" style={motion(d)}>
                  {d.trail > 0 && (
                    <g transform={`rotate(${f2(lay.rot)})`}>
                      <rect className="stbd-trail" x={-d.r * 0.7} y={0} width={d.r * 1.4} height={d.trail} rx={d.r * 0.7} fill={`url(#${uid}-trail)`} />
                    </g>
                  )}
                  <circle className={d.mist ? 'stbd-haze' : 'stbd-halo'} r={d.mist ? d.r * 4 : d.r * 2.8 + 6 / lay.k} fill={`url(#${uid}-halo)`} />
                </g>
              </g>
            ))}
            <path className="stbd-head stbd-head-glow" d={lay.head} style={{ '--hx': px(-lay.ux * lay.headBack), '--hy': px(-lay.uy * lay.headBack) } as Vars} />
          </SceneSvg>

          {/* the cores: drawn plainly, so they keep their edge on a bright hull */}
          <SceneSvg w={w} h={h} className="stbd-ink">
            <defs>
              {/* a bead of liquid: clear in the middle, bright at its edge, a warm caustic low on the far side */}
              <radialGradient id={`${uid}-bead`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#eef3f9" stopOpacity="0.34" />
                <stop offset="0.62" stopColor="#eef3f9" stopOpacity="0.42" />
                <stop offset="0.88" stopColor="#f7fafd" stopOpacity="0.86" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
              </radialGradient>
              <radialGradient id={`${uid}-caustic`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#fff1dc" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${uid}-dot`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="0.55" stopColor="#fbf6ee" stopOpacity="0.9" />
                <stop offset="1" stopColor="#ffe2b8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line className="stbd-axis stbd-axis-core" x1={lay.axis.x0} y1={lay.axis.y0} x2={lay.axis.x1} y2={lay.axis.y1} pathLength={1} stroke={`url(#${uid}-axis)`} />
            {lay.drops.map((d, i) => {
              // under about 3 px a bead is a point of light; above it, it shows its body
              const body = !d.mist && d.r * lay.k >= 3
              return (
                <g key={i} transform={`translate(${f2(d.x)} ${f2(d.y)})`}>
                  <g className="stbd-drop" style={motion(d)}>
                    {body ? (
                      // stretched along its path while it moves, it settles round as it stops
                      <g transform={`rotate(${f2(lay.rot)})`}>
                        <g className="stbd-wobble">
                          <g transform={`rotate(${f2(-lay.rot)})`}>
                            <circle className="stbd-bead" r={d.r} fill={`url(#${uid}-bead)`} />
                            <circle cx={d.r * 0.22} cy={d.r * 0.3} r={d.r * 0.5} fill={`url(#${uid}-caustic)`} />
                            <circle className="stbd-glint" cx={-d.r * 0.34} cy={-d.r * 0.38} r={Math.max(d.r * 0.2, 0.9 / lay.k)} />
                          </g>
                        </g>
                      </g>
                    ) : (
                      <circle className="stbd-bead" r={d.r} fill={`url(#${uid}-dot)`} />
                    )}
                  </g>
                </g>
              )
            })}
            <path className="stbd-head stbd-head-core" d={lay.head} style={{ '--hx': px(-lay.ux * lay.headBack), '--hy': px(-lay.uy * lay.headBack) } as Vars} />
            <line className="stbd-lead" x1={lay.lead.x0} y1={lay.lead.y0} x2={lay.lead.x1} y2={lay.lead.y1} pathLength={1} />
          </SceneSvg>
        </>
      )}
      <p
        ref={labelRef}
        className="stbd-label"
        data-side={lay?.label.side === -1 ? 'l' : 'r'}
        style={
          lay
            ? ({
                left: `${((lay.label.x / w) * 100).toFixed(3)}%`,
                top: `${((lay.label.y / h) * 100).toFixed(3)}%`,
                '--lx': px(lay.label.side * -10),
              } as Vars)
            : undefined
        }
      >
        Fluid drifts
        <br />
        toward the head
      </p>
    </div>
  )
}

// Station: the stand-in frozen scene every check starts with, so the page runs before the real scenes exist.
// It only uses the manifest anchors: a ring closes round the subject; with `a` and `b` (tracktrace) a bright
// streak crosses the frame through it; with `up` (braindrift) three marks drift that way.
// Everything is a CSS animation with fill-mode both, so the shell's "end" state shows the last frame at once.
import { useEffect } from 'react'
import { SceneSvg } from '../kit'
import type { SceneProps } from '../types'
import './stub.css'

export function StubScene({ w, h, anchors, play, onDone }: SceneProps) {
  const fx = anchors.focus[0] * w
  const fy = anchors.focus[1] * h
  const r = anchors.r * h
  const a = anchors.a
  const b = anchors.b
  const up = anchors.up
  // Stroke widths are in still pixels: scale them so they read the same on a 1080-wide and a 1920-wide still.
  const u = Math.min(w, h) / 1080

  useEffect(() => {
    if (!play) return
    const t = window.setTimeout(onDone, 2300)
    return () => window.clearTimeout(t)
  }, [play, onDone])

  return (
    <SceneSvg w={w} h={h} className="st-stub">
      <circle className="st-stub-ring" cx={fx} cy={fy} r={r} pathLength={1} strokeWidth={1.5 * u} />
      <circle className="st-stub-echo" cx={fx} cy={fy} r={r} strokeWidth={1 * u} style={{ transformOrigin: `${fx}px ${fy}px` }} />
      {a && b && (
        <>
          <line className="st-stub-trail" x1={a[0] * w} y1={a[1] * h} x2={b[0] * w} y2={b[1] * h} strokeWidth={1.25 * u} />
          <line className="st-stub-streak" x1={a[0] * w} y1={a[1] * h} x2={b[0] * w} y2={b[1] * h} pathLength={1} strokeWidth={5 * u} />
          <circle className="st-stub-hit" cx={fx} cy={fy} r={10 * u} style={{ transformOrigin: `${fx}px ${fy}px` }} />
        </>
      )}
      {up &&
        [0, 1, 2].map((i) => (
          <line
            key={i}
            className="st-stub-drift"
            x1={fx + (i - 1) * r * 0.42}
            y1={fy}
            x2={fx + (i - 1) * r * 0.42 + up[0] * r * 0.3}
            y2={fy + up[1] * r * 0.3}
            strokeWidth={2 * u}
            style={{ ['--ux' as string]: `${up[0] * r * 0.9}px`, ['--uy' as string]: `${up[1] * r * 0.9}px`, animationDelay: `${0.5 + i * 0.18}s` }}
          />
        ))}
    </SceneSvg>
  )
}

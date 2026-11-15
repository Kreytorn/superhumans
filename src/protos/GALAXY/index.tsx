// Take GALAXY, "The body as a galaxy": the crew member is a slowly turning star map of a person; the six checks are
// bright clusters inside it. Pressing one flies the camera in, the stars part, time stops, and that check opens.
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './galaxy.css'
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CHECKS, SITE_LINE, checkIndex } from './data'
import type { GalaxyScene } from './Scene'
import { drawStill } from './still'

const Module = lazy(() => import('./Module'))
const go = (v: string) => {
  window.location.hash = `#/proto/GALAXY/${v}`
}

export default function Galaxy({ view, params }: { view: string; params: URLSearchParams }) {
  const idx = checkIndex(view)
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<GalaxyScene | null>(null)
  const spotEls = useRef<(HTMLButtonElement | null)[]>([])
  const labelEls = useRef<(HTMLButtonElement | null)[]>([])
  const lineEls = useRef<(SVGPathElement | null)[]>([])
  const anchors = useRef<Float32Array>(new Float32Array(12))
  const first = useRef(true)
  const idxRef = useRef(idx)
  const [hover, setHover] = useState(-1)
  const [arrived, setArrived] = useState(idx)
  const [ready, setReady] = useState(false)
  const [still, setStill] = useState(false)

  const measure = useCallback(() => {
    const a = anchors.current
    CHECKS.forEach((c, i) => {
      const el = labelEls.current[i]
      if (!el) return
      const r = el.getBoundingClientRect()
      a[i * 2] = c.side === 'l' ? r.right + 14 : r.left - 14
      a[i * 2 + 1] = r.top + Math.min(r.height * 0.5, 22)
    })
  }, [])

  const place = useCallback((xy: Float32Array) => {
    const a = anchors.current
    for (let i = 0; i < 6; i++) {
      const x = xy[i * 2], y = xy[i * 2 + 1]
      const s = spotEls.current[i]
      if (s) s.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`
      const l = lineEls.current[i]
      if (l) {
        const ax = a[i * 2], ay = a[i * 2 + 1]
        const left = CHECKS[i].side === 'l'
        const dx = x - ax, dy = y - ay
        const len = Math.hypot(dx, dy) || 1
        // stop the line at the ring round the cluster
        const ex = x - (dx / len) * 15, ey = y - (dy / len) * 15
        const run = Math.max(0, Math.min(Math.abs(dx) - Math.abs(dy) * 0.9 - 14, Math.abs(dx) * 0.6))
        const kx = ax + (left ? run : -run)
        l.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)}L${kx.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`)
      }
    }
  }, [])

  // the scene lives for as long as this take is on screen; home and the six pages share it
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let dead = false
    const touch = window.matchMedia('(pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let flat = false
    const fallback = () => {
      if (dead) return
      flat = true
      setStill(true)
      measure()
      place(drawStill(cv))
      setReady(true)
    }
    const onSize = () => {
      measure()
      if (scene.current) scene.current.resize()
      else if (flat) place(drawStill(cv))
    }
    if (params.get('nogl') === '1') fallback()
    else
      import('./Scene')
        .then(({ GalaxyScene }) => {
          if (dead) return
          const s = new GalaxyScene(cv, {
            touch,
            reduced,
            onFrame: place,
            onArrive: (f) => {
              setArrived(f)
              setReady(true)
            },
          })
          scene.current = s
          measure()
          if (idxRef.current >= 0) s.setFocus(idxRef.current, true)
          else window.setTimeout(() => !dead && setReady(true), reduced ? 300 : 2900)
        })
        .catch(fallback)
    window.addEventListener('resize', onSize)
    void document.fonts?.ready.then(() => !dead && onSize())
    return () => {
      dead = true
      window.removeEventListener('resize', onSize)
      scene.current?.dispose()
      scene.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a route change is a flight
  useLayoutEffect(() => {
    idxRef.current = idx
    if (first.current) {
      first.current = false
      return
    }
    setHover(-1)
    if (scene.current) {
      scene.current.setHover(-1)
      scene.current.setFocus(idx)
      setArrived(-2)
    } else setArrived(idx)
  }, [idx])

  useEffect(() => {
    scene.current?.setHover(hover)
  }, [hover])

  // keys 1-6 open a check, Escape goes back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (idx < 0 && e.key >= '1' && e.key <= '6') go(CHECKS[Number(e.key) - 1].id)
      else if (idx >= 0 && e.key === 'Escape') go('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  const home = idx < 0
  const open = idx >= 0 && arrived === idx
  const hot = hover >= 0 ? CHECKS[hover] : null

  return (
    <div ref={root} className={`gx${home ? ' is-home' : ' is-in'}${open ? ' is-open' : ''}${still ? ' is-still' : ''}`} data-proto="GALAXY" data-ready={ready && ((home && arrived === -1) || open) ? '1' : undefined} data-view={view}>
      <canvas ref={canvas} className="gx-canvas" aria-hidden="true" />
      <div className="gx-veil" aria-hidden="true" />

      <div className="gx-home" aria-hidden={!home} inert={!home}>
        <svg className="gx-lines" aria-hidden="true">
          {CHECKS.map((c, i) => (
            <path
              key={c.id}
              ref={(el) => {
                lineEls.current[i] = el
              }}
              className={hover === i ? 'is-hot' : undefined}
              style={{ ['--hue' as string]: c.hue }}
            />
          ))}
        </svg>

        {CHECKS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            ref={(el) => {
              spotEls.current[i] = el
            }}
            className={`gx-spot${hover === i ? ' is-hot' : ''}`}
            style={{ ['--hue' as string]: c.hue, ['--d' as string]: `${i * -0.5}s` }}
            aria-label={`Open ${c.name}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(-1)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(-1)}
            onClick={() => go(c.id)}
          >
            <i />
          </button>
        ))}

        {CHECKS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            ref={(el) => {
              labelEls.current[i] = el
            }}
            className={`gx-label gx-label-${c.side} gx-label-${c.id}${hover === i ? ' is-hot' : ''}${hover >= 0 && hover !== i ? ' is-dim' : ''}`}
            style={{ ['--hue' as string]: c.hue }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(-1)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(-1)}
            onClick={() => go(c.id)}
          >
            <span className="gx-label-name">{c.name}</span>
            <span className="gx-label-site">
              <b>{c.n}</b>
              {c.site}
            </span>
          </button>
        ))}

        <header className="gx-title">
          <h1>SuperHumans</h1>
          <p>{SITE_LINE}</p>
        </header>

        <p className="gx-top">A star map of one crew member</p>

        <p className={`gx-hint${hot ? ' is-hot' : ''}`} style={hot ? { ['--hue' as string]: hot.hue } : undefined} aria-live="polite">
          {hot ? (
            <>
              <b>{hot.name}</b>
              {hot.sentence}
            </>
          ) : (
            <>
              <b>Six bright clusters</b>
              Press one to fly in.
            </>
          )}
        </p>
      </div>

      {idx >= 0 && (
        <Suspense fallback={null}>
          <Module key={CHECKS[idx].id} check={CHECKS[idx]} open={open} onBack={() => go('home')} onGo={go} />
        </Suspense>
      )}

      <p className="gx-ai">AI-generated imagery · drawn by code</p>
    </div>
  )
}

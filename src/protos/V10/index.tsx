// Prototype V10 "Vitruvian Astronaut": the whole screen is one engraved plate in gold on indigo. The crew member stands
// in a circle and a square (the Renaissance study of proportion, redrawn for space: the circle is an orbit); six lights
// on the body open the six checks. Pressing one zooms through its medallion until the specimen fills the screen, and
// that becomes the check's page. Routes: #/proto/V10/home and #/proto/V10/<module id>.
import '@fontsource/gloock/400.css'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/geist-mono'
import './v10.css'
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BASE, CHECKS, RING_ORDER, checkIndex, type Check } from './data'
import { layout, type Geo } from './geometry'
import Plate from './Home'

// The check's page (with its six heavy working stages) is its own chunk, fetched once the plate has settled, and
// again (a no-op once loaded) on hover, focus or press.
const loadModule = () => import('./Module')
const Module = lazy(loadModule)
const preload = () => {
  void loadModule().catch(() => {})
}
const go = (v: string) => {
  window.location.hash = `#/proto/V10/${v}`
}

const ZOOM_MS = 900 // press to page
const BACK_MS = 760
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Where the specimen and its round window are at progress e (0 = the medallion, 1 = the whole screen). */
function lensAt(g: Geo, c: Check, i: number, e: number) {
  const { W, H, md } = g
  const m = g.med[i]
  const [kx, ky, d] = c.crop
  const a = c.aspect
  const w0 = md / d
  const w1 = Math.max(W, H * a)
  const h1 = w1 / a
  // the end frame is exactly CSS "cover" with background-position kx% ky%, as on the check's page
  const ex = (W - w1) * kx + kx * w1
  const ey = (H - h1) * ky + ky * h1
  const zoom = Math.pow(w1 / w0, e)
  const w = w0 * zoom
  const ax = m.x + (ex - m.x) * e
  const ay = m.y + (ey - m.y) * e
  const diag = Math.max(Math.hypot(ax, ay), Math.hypot(W - ax, ay), Math.hypot(ax, H - ay), Math.hypot(W - ax, H - ay)) + 4
  const r0 = md / 2
  const r = r0 * Math.pow(diag / r0, Math.pow(e, 1.35))
  return { left: ax - kx * w, top: ay - (ky * w) / a, w, h: w / a, ax, ay, r, zoom }
}

function useViewport() {
  const [s, set] = useState(() => [window.innerWidth, window.innerHeight] as const)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => set([window.innerWidth, window.innerHeight]))
    }
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', on)
    }
  }, [])
  return s
}

export default function V10({ view }: { view: string; params: URLSearchParams }) {
  const idx = checkIndex(view) // -1 on the home view
  const [W, H] = useViewport()
  const g = useMemo(() => layout(W, H), [W, H])
  const gRef = useRef(g)
  gRef.current = g
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // the plate engraves itself on the first visit only
  const [intro] = useState(() => idx < 0 && !reduced)
  const [lit, setLit] = useState<number | null>(null)
  const [homeReady, setHomeReady] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [flying, setFlying] = useState<number | null>(null)
  const [entered, setEntered] = useState<number | null>(null)
  const [returning, setReturning] = useState<number | null>(null)
  const [lastIdx, setLastIdx] = useState(idx)
  const scene = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLDivElement>(null)
  const lensImg = useRef<HTMLImageElement>(null)
  const lensRim = useRef<HTMLDivElement>(null)
  const lensVeil = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const raf = useRef(0)

  // the route left a check's page for the plate: zoom back out through that check's medallion
  if (lastIdx !== idx) {
    setLastIdx(idx)
    if (idx < 0 && lastIdx >= 0 && !reduced) setReturning(lastIdx)
    if (idx >= 0 && flying == null) setEntered(null)
  }

  // ---- the lens: one fixed layer, moved by hand each frame (no re-render while it flies)
  const paint = useCallback((i: number, e: number, veil: number) => {
    const el = lens.current, img = lensImg.current, rim = lensRim.current, v = lensVeil.current, sc = scene.current
    if (!el || !img || !rim || !v) return
    const geo = gRef.current
    const f = lensAt(geo, CHECKS[i], i, e)
    el.style.visibility = 'visible'
    el.style.clipPath = `circle(${f.r.toFixed(1)}px at ${f.ax.toFixed(1)}px ${f.ay.toFixed(1)}px)`
    img.style.transform = `translate(${f.left.toFixed(1)}px, ${f.top.toFixed(1)}px)`
    img.style.width = `${f.w.toFixed(1)}px`
    img.style.height = `${f.h.toFixed(1)}px`
    rim.style.transform = `translate(${(f.ax - f.r).toFixed(1)}px, ${(f.ay - f.r).toFixed(1)}px)`
    rim.style.width = rim.style.height = `${(2 * f.r).toFixed(1)}px`
    rim.style.opacity = String(Math.max(0, 1 - e * 1.6))
    v.style.opacity = String(veil)
    if (sc) {
      const m = geo.med[i]
      sc.style.transformOrigin = `${m.x}px ${m.y}px`
      sc.style.transform = `scale(${f.zoom.toFixed(4)})`
    }
  }, [])
  const hideLens = useCallback(() => {
    const el = lens.current
    if (el) {
      el.style.visibility = 'hidden'
      el.style.opacity = '1'
    }
    if (lensRim.current) lensRim.current.style.opacity = '0'
    if (scene.current) scene.current.style.transform = ''
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const press = useCallback(
    (i: number) => {
      preload()
      if (flying != null) return
      if (reduced) return go(CHECKS[i].id)
      setFlying(i)
      setLit(i)
      if (lensImg.current) lensImg.current.src = CHECKS[i].img
      const t0 = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ZOOM_MS)
        paint(i, ease(t), 0)
        if (t < 1) raf.current = requestAnimationFrame(step)
        else {
          setEntered(i)
          go(CHECKS[i].id)
        }
      }
      raf.current = requestAnimationFrame(step)
    },
    [flying, reduced, paint],
  )

  // ---- landed on the page: the lens (identical to the page's ground) fades away over the page as it comes in
  useEffect(() => {
    if (idx < 0 || flying == null) return
    const el = lens.current
    let t = 0
    const t0 = performance.now()
    const step = (now: number) => {
      t = Math.min(1, (now - t0) / 420)
      if (el) el.style.opacity = String(1 - t)
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        hideLens()
        setFlying(null)
        setLit(null)
      }
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [idx, flying, hideLens])

  // ---- back from a page: start fully zoomed in (under the page's veil) and pull back out to the plate
  useLayoutEffect(() => {
    if (returning == null) return
    const i = returning
    if (lensImg.current) lensImg.current.src = CHECKS[i].img
    paint(i, 1, 0.84)
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / BACK_MS)
      const e = 1 - ease(t)
      paint(i, e, 0.84 * Math.max(0, 1 - t * 2.2))
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        hideLens()
        setReturning(null)
        buttons.current[i]?.focus({ preventScroll: true })
      }
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [returning, paint, hideLens])

  // ---- the plate has settled: the picture can be taken, and the page's code is fetched
  useEffect(() => {
    if (idx >= 0) return
    const t = window.setTimeout(() => setHomeReady(true), intro && !homeReady ? 2550 : 60)
    return () => window.clearTimeout(t)
    // the intro runs once; later visits settle at once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])
  useEffect(() => {
    if (homeReady) preload()
  }, [homeReady])
  useEffect(() => {
    if (idx < 0) setPageReady(false)
  }, [idx])

  // ---- keys: arrows step round the orbit, 1 to 6 open a check, Escape goes back to the plate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (idx >= 0) {
        if (e.key === 'Escape') go('home')
        return
      }
      if (flying != null || returning != null) return
      if (e.key >= '1' && e.key <= '6') return press(Number(e.key) - 1)
      const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown'
      const bwd = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
      if (!fwd && !bwd) return
      const order = g.tall ? CHECKS.map((_, i) => i) : RING_ORDER
      const cur = order.indexOf(buttons.current.findIndex((b) => b === document.activeElement))
      const at = cur < 0 ? (fwd ? 0 : order.length - 1) : (cur + (fwd ? 1 : -1) + order.length) % order.length
      buttons.current[order[at]]?.focus()
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, flying, returning, press, g.tall])

  const phase = idx >= 0 ? 'page' : flying != null ? 'fly' : returning != null ? 'back' : 'home'
  const ready = idx >= 0 ? pageReady && flying == null : homeReady && phase === 'home'
  const check = idx >= 0 ? CHECKS[idx] : null

  return (
    <div
      className="v10"
      data-phase={phase}
      data-ready={ready ? '1' : '0'}
      data-tall={g.tall ? '1' : '0'}
      data-reduced={reduced ? '1' : '0'}
      style={{ ['--paper' as string]: `url(${BASE}themes/V10/paper.png)` }}
    >
      <div className="v10-ground" aria-hidden="true" />
      {idx < 0 && (
        <div className="v10-scene" ref={scene} inert={phase !== 'home'}>
          <Plate g={g} intro={intro} lit={phase === 'home' || phase === 'fly' ? lit : null} setLit={setLit} press={press} onPreload={preload} buttons={buttons} />
        </div>
      )}
      <div className="v10-sheen" aria-hidden="true" />

      {check && (
        <Suspense
          fallback={
            <div className="v10-mod">
              <div className="v10-mod-bg" style={{ backgroundImage: `url(${check.img})`, backgroundPosition: `${check.crop[0] * 100}% ${check.crop[1] * 100}%` }} />
              <div className="v10-mod-veil" />
            </div>
          }
        >
          <Module key={check.id} check={check} index={idx} entered={entered === idx} onReady={() => setPageReady(true)} />
        </Suspense>
      )}

      <div className="v10-lens" ref={lens} aria-hidden="true">
        <img ref={lensImg} alt="" draggable={false} />
        <div className="v10-lens-veil" ref={lensVeil} />
      </div>
      <div className="v10-lens-rim-wrap" aria-hidden="true">
        <div className="v10-lens-rim" ref={lensRim} />
      </div>
    </div>
  )
}

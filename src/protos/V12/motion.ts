// View-box moves (the zoom into a window, the pan between windows) and the plate's small life, on one clock.
import { useEffect, useState } from 'react'
import { CHECKS, mixVB, screenBox, vbString, type VB } from './data'
import { rayLine } from './Suit'

/**
 * Moves the view box of one or more drawings from a to b. Returns a cancel function.
 * A frame counts for at most 50 ms of the move, so a busy main thread slows the move instead of skipping it;
 * but the move never trails the clock by more than 350 ms, so a throttled window still ends it on time.
 */
export function animateVB(
  els: (SVGSVGElement | null)[],
  a: VB,
  b: VB,
  ms: number,
  ease: (t: number) => number,
  done?: () => void,
  progress?: (t: number) => void,
): () => void {
  const out: VB = [0, 0, 0, 0]
  let raf = 0
  let first = 0
  let last = 0
  let spent = 0
  const step = (now: number) => {
    if (!first) first = now
    if (last) spent = Math.max(spent + Math.min(50, now - last), now - first - 350)
    last = now
    const t = Math.min(1, spent / ms)
    const s = vbString(mixVB(a, b, ease(t), out))
    for (const el of els) el?.setAttribute('viewBox', s)
    progress?.(t)
    if (t < 1) raf = requestAnimationFrame(step)
    else done?.()
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

export function useWindowSize(): { w: number; h: number } {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setSize((s) => (s.w === window.innerWidth && s.h === window.innerHeight ? s : { w: window.innerWidth, h: window.innerHeight })))
    }
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', on)
    }
  }, [])
  return size
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

const RAY_MS = 700
const RAY_TAIL = 0.22
const SCAN_ORDER = ['braindrift', 'bubblegrade', 'veinsqueeze', 'garnmeter', 'spikecount']

/**
 * The plate's life, started once the drawing has settled: the astronaut drifts (a slow few-unit sway),
 * a heavy ion streaks down its track through the suit every 4 to 5 s and lights the TrackTrace window,
 * and every 5 s a scan line sweeps down one other window. The sheet behind shifts a little against the pointer.
 * About 24 frames a second, 60 while the ion is in flight; nothing runs while the tab is hidden.
 */
export function startLife(root: HTMLElement, upright: boolean): () => void {
  const q = <T extends Element>(s: string) => root.querySelector<T>(s)
  // the drift moves the whole drawing as one composited layer, so the SVG is not repainted for it
  const float = q<HTMLElement>('.v12-stage')
  const ray = q<SVGGElement>('.v12-svg-home .v12-ray')
  const rayLines = ray ? Array.from(ray.querySelectorAll('line')) : []
  const rayGrad = q<SVGLinearGradientElement>('#v12-home-ray')
  const sheet = q<HTMLElement>('.v12-parallax')
  const win = (id: string) => q<SVGAElement>(`.v12-svg-home [data-win="${id}"]`)
  const [x0, y0, x1, y1] = rayLine(upright)
  const tt = screenBox(CHECKS[0], upright)
  const hitAt = (tt[1] + tt[3] / 2 - y0) / (y1 - y0)

  let raf = 0
  let last = 0
  let px = 0
  let py = 0
  let tx = 0
  let ty = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    tx = (e.clientX / window.innerWidth - 0.5) * -18
    ty = (e.clientY / window.innerHeight - 0.5) * -12
  }
  root.addEventListener('pointermove', onMove, { passive: true })

  const timers = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }
  const pulse = (el: Element | null, cls: string, ms: number) => {
    if (!el) return
    el.classList.remove(cls)
    void (el as SVGGraphicsElement).getBBox?.()
    el.classList.add(cls)
    later(() => el.classList.remove(cls), ms)
  }

  const start = performance.now()
  let rayAt = -1
  let hit = true
  let nextRay = start + 1200
  let rays = 0
  const drawRay = (now: number) => {
    if (rayAt < 0 || !ray) return false
    const p = (now - rayAt) / RAY_MS
    if (p >= 1) {
      ray.style.opacity = '0'
      rayAt = -1
      return false
    }
    const head = Math.min(1, p * (1 + RAY_TAIL))
    const tail = Math.max(0, head - RAY_TAIL)
    const hx = (x0 + (x1 - x0) * head).toFixed(1)
    const hy = (y0 + (y1 - y0) * head).toFixed(1)
    const qx = (x0 + (x1 - x0) * tail).toFixed(1)
    const qy = (y0 + (y1 - y0) * tail).toFixed(1)
    for (const l of rayLines) {
      l.setAttribute('x1', qx)
      l.setAttribute('y1', qy)
      l.setAttribute('x2', hx)
      l.setAttribute('y2', hy)
    }
    if (rayGrad) {
      rayGrad.setAttribute('x1', qx)
      rayGrad.setAttribute('y1', qy)
      rayGrad.setAttribute('x2', hx)
      rayGrad.setAttribute('y2', hy)
    }
    ray.style.opacity = '1'
    if (!hit && head >= hitAt) {
      hit = true
      pulse(win('tracktrace'), 'is-hit', 900)
    }
    return true
  }

  let scanN = 0
  const scan = () => {
    pulse(win(SCAN_ORDER[scanN % SCAN_ORDER.length]), 'is-scan', 1700)
    scanN += 1
    later(scan, 5000)
  }
  later(scan, 2600)

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (now >= nextRay && rayAt < 0) {
      rayAt = now
      hit = false
      rays += 1
      nextRay = now + 4200 + ((rays * 389) % 900)
    }
    const flying = drawRay(now)
    if (!flying && now - last < 40) return
    last = now
    const t = (now - start) / 1000
    if (float) {
      // weightless: a slow sway of a few pixels, starting from rest
      const k = Math.min(1, t / 3)
      const sx = Math.sin(t * 0.42) * 4 * k
      const sy = Math.sin(t * 0.31) * 5 * k
      float.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0)`
    }
    px += (tx - px) * 0.1
    py += (ty - py) * 0.1
    if (sheet) sheet.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`
  }
  const onVis = () => {
    cancelAnimationFrame(raf)
    if (!document.hidden) raf = requestAnimationFrame(frame)
  }
  document.addEventListener('visibilitychange', onVis)
  raf = requestAnimationFrame(frame)
  return () => {
    cancelAnimationFrame(raf)
    for (const id of timers) window.clearTimeout(id)
    timers.clear()
    if (ray) ray.style.opacity = '0'
    if (float) float.style.transform = ''
    for (const el of root.querySelectorAll('.is-hit, .is-scan')) el.classList.remove('is-hit', 'is-scan')
    document.removeEventListener('visibilitychange', onVis)
    root.removeEventListener('pointermove', onMove)
  }
}

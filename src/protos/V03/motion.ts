// View-box moves (the zoom into a room, the pan between rooms) and the plate's small life, on one clock.
import { useEffect, useState } from 'react'
import { CHECKS, mixVB, vbString, type VB } from './data'

/**
 * Moves the view box of one or more drawings from a to b. Returns a cancel function.
 * A frame counts for at most 50 ms of the move, so a busy main thread slows the move down
 * instead of skipping it to its end (the move is always seen); but the move never trails the clock by more
 * than 350 ms, so a throttled window (a few frames a second) still ends it on time.
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

/**
 * Cosmic rays cross the plate through these rooms in turn, each on its own path in plate units [x0, y0, x1, y1],
 * set so that no ray runs through the title or the readout on the left (x < 530 above y 335 and below y 705).
 * The cupola's ray is the shallow one along the ship; the phone plate leaves it out (it would run under the title).
 */
const RAYS: [string, [number, number, number, number]][] = [
  ['spikecount', [522, -140, 676, 1140]],
  ['tracktrace', [1080, -140, 920, 1140]],
  ['braindrift', [650, 1140, 840, -140]],
  ['garnmeter', [-700, 413, 1740, 706]],
  ['bubblegrade', [1180, -140, 950, 1140]],
  ['veinsqueeze', [820, 1140, 640, -140]],
]
/** A scan line sweeps down these screens in turn. */
const SCAN_ORDER = ['tracktrace', 'veinsqueeze', 'braindrift', 'spikecount', 'bubblegrade']
/** A ray takes 600 ms to cross; its streak is this share of the crossing long. */
const RAY_MS = 600
const RAY_TAIL = 0.24

/**
 * The plate's life, started once the plate has settled: the ring turns, the engine plume pulses (0.7 to 1 over
 * 2.4 s), a cosmic ray crosses the hull every 3 to 4 s (the first 1.5 s in) and lights the room it passes through,
 * and every 6 s a scan line sweeps down one lit screen. The sheet behind the ship shifts a little against the pointer.
 * About 20 frames a second, 60 while a ray is in flight; nothing runs while the tab is hidden.
 */
export function startLife(root: HTMLElement): () => void {
  const q = <T extends Element>(s: string) => root.querySelector<T>(s)
  const spins = Array.from(root.querySelectorAll<SVGGElement>('.v03-svg-home .v03-spin'))
  const plumes = q<SVGGElement>('.v03-svg-home .v03-plumes')
  const burn = q<SVGEllipseElement>('.v03-svg-home .v03-burn')
  const ray = q<SVGGElement>('.v03-svg-home .v03-ray')
  const rayLines = ray ? Array.from(ray.querySelectorAll('line')) : []
  const rayGrad = q<SVGLinearGradientElement>('#v03-home-ray')
  const sheet = q<HTMLElement>('.v03-parallax')
  const room = (id: string) => q<SVGAElement>(`.v03-svg-home [data-room="${id}"]`)

  let raf = 0
  let last = 0
  let px = 0
  let py = 0
  let tx = 0
  let ty = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    tx = (e.clientX / window.innerWidth - 0.5) * -22
    ty = (e.clientY / window.innerHeight - 0.5) * -16
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
  /** Restarts a one-shot CSS animation on a room by taking its class off and putting it back. */
  const pulse = (el: Element | null, cls: string, ms: number) => {
    if (!el) return
    el.classList.remove(cls)
    void (el as SVGGraphicsElement).getBBox?.()
    el.classList.add(cls)
    later(() => el.classList.remove(cls), ms)
  }

  // ---- the ray in flight: a line through the target room's centre, from beyond one edge of the plate to the other
  const start = performance.now()
  let rayN = 0
  let nextRay = start + 1500
  let rayAt = -1
  let hitAt = 0
  let hitDone = true
  let hitId = ''
  const A = [0, 0]
  const B = [0, 0]
  const rays = root.dataset.upright ? RAYS.filter(([id]) => id !== 'garnmeter') : RAYS
  const launch = (now: number) => {
    const [id, [x0, y0, x1, y1]] = rays[rayN % rays.length]
    const c = CHECKS.find((k) => k.id === id) ?? CHECKS[0]
    A[0] = x0
    A[1] = y0
    B[0] = x1
    B[1] = y1
    // the share of the path at which the head reaches the room's centre (along the path's longer axis)
    const cx = c.box[0] + c.box[2] / 2
    const cy = c.box[1] + c.box[3] / 2
    hitAt = Math.abs(y1 - y0) > Math.abs(x1 - x0) ? (cy - y0) / (y1 - y0) : (cx - x0) / (x1 - x0)
    hitDone = false
    hitId = id
    rayAt = now
    rayN += 1
    nextRay = now + 3000 + ((rayN * 389) % 1000)
  }
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
    const hx = (A[0] + (B[0] - A[0]) * head).toFixed(1)
    const hy = (A[1] + (B[1] - A[1]) * head).toFixed(1)
    const qx = (A[0] + (B[0] - A[0]) * tail).toFixed(1)
    const qy = (A[1] + (B[1] - A[1]) * tail).toFixed(1)
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
    if (!hitDone && head >= hitAt) {
      hitDone = true
      pulse(room(hitId), 'is-hit', 900)
    }
    return true
  }

  // ---- a scan line down one lit screen every 6 s (a CSS animation; the class restarts it)
  let scanN = 0
  const scan = () => {
    pulse(room(SCAN_ORDER[scanN % SCAN_ORDER.length]), 'is-scan', 1700)
    scanN += 1
    later(scan, 6000)
  }
  later(scan, 3200)

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (now >= nextRay && rayAt < 0) launch(now)
    const flying = drawRay(now)
    if (!flying && now - last < 48) return
    last = now
    const t = (now - start) / 1000
    const a = (t * 2.6) % 360
    for (const s of spins) s.setAttribute('transform', `rotate(${a.toFixed(2)})`)
    const beat = Math.sin((t * Math.PI * 2) / 2.4)
    if (plumes) plumes.style.opacity = (0.85 + 0.15 * beat).toFixed(3)
    if (burn) burn.style.opacity = (0.8 + 0.2 * beat).toFixed(3)

    px += (tx - px) * 0.12
    py += (ty - py) * 0.12
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
    for (const el of root.querySelectorAll('.is-hit, .is-scan')) el.classList.remove('is-hit', 'is-scan')
    document.removeEventListener('visibilitychange', onVis)
    root.removeEventListener('pointermove', onMove)
  }
}

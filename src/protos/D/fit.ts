// Fits a word to a column with the font's own width axis (Anybody, wdth 60-140). Never CSS scaling:
// when the axis runs out, the type gets smaller instead.
import { useEffect, useState, useSyncExternalStore } from 'react'

export const WDTH_MIN = 60
export const WDTH_MAX = 140

let probe: HTMLSpanElement | null = null
const cache = new Map<string, number>()

function ensureProbe(): HTMLSpanElement {
  if (!probe || !probe.isConnected) {
    probe = document.createElement('span')
    probe.className = 'drp-probe'
    probe.setAttribute('aria-hidden', 'true')
    ;(document.querySelector('.drp') ?? document.body).appendChild(probe)
  }
  return probe
}

/** Rendered width in px of `text` at this weight, size and width-axis value. */
export function widthAt(text: string, weight: number, sizePx: number, wdth: number): number {
  const key = `${text}|${weight}|${sizePx.toFixed(2)}|${wdth.toFixed(2)}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const p = ensureProbe()
  p.style.fontSize = `${sizePx}px`
  p.style.fontWeight = String(weight)
  p.style.fontVariationSettings = `"wdth" ${wdth}`
  p.textContent = text
  const w = p.getBoundingClientRect().width
  cache.set(key, w)
  return w
}

export interface Fit {
  wdth: number
  size: number
}

/** The width-axis value (and, only if the axis runs out, a smaller size) that sets `text` to `target` px. */
export function fitWord(text: string, weight: number, sizePx: number, target: number): Fit {
  if (!(target > 0) || !(sizePx > 0)) return { wdth: 100, size: sizePx }
  const narrow = widthAt(text, weight, sizePx, WDTH_MIN)
  if (narrow > target) return { wdth: WDTH_MIN, size: (sizePx * target) / narrow }
  if (widthAt(text, weight, sizePx, WDTH_MAX) <= target) return { wdth: WDTH_MAX, size: sizePx }
  let lo = WDTH_MIN
  let hi = WDTH_MAX
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2
    if (widthAt(text, weight, sizePx, mid) > target) hi = mid
    else lo = mid
  }
  return { wdth: Math.round(lo * 10) / 10, size: sizePx }
}

export function clearFitCache() {
  cache.clear()
}

/** True once both families are loaded (or after 2.5 s, so a slow font never blocks the page). */
export function useFonts(): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let live = true
    const done = () => {
      if (!live) return
      clearFitCache()
      setOk(true)
    }
    const fonts = document.fonts
    const timer = window.setTimeout(done, 2500)
    Promise.all([
      fonts.load('800 64px "Anybody Variable"', 'Blood 58.5%'),
      fonts.load('300 64px "Anybody Variable"', 'Blood'),
      fonts.load('500 16px "Hanken Grotesk Variable"', 'Blood'),
      fonts.load('700 16px "Hanken Grotesk Variable"', 'Blood'),
    ])
      .then(() => fonts.ready)
      .then(done, done)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [])
  return ok
}

const DESKTOP = '(min-width: 821px) and (min-aspect-ratio: 1/1) and (min-height: 540px)'

function subscribeViewport(cb: () => void) {
  const mq = window.matchMedia(DESKTOP)
  mq.addEventListener('change', cb)
  window.addEventListener('resize', cb)
  return () => {
    mq.removeEventListener('change', cb)
    window.removeEventListener('resize', cb)
  }
}

/** The poster layout (true) or the phone layout (false), plus one design pixel in CSS px. */
export function useViewport(): { desktop: boolean; u: number; vw: number } {
  const key = useSyncExternalStore(subscribeViewport, () => `${window.matchMedia(DESKTOP).matches ? 1 : 0}|${window.innerWidth}|${window.innerHeight}`)
  const [d, w, h] = key.split('|').map(Number)
  const desktop = d === 1
  return { desktop, u: desktop ? Math.min(w / 1440, h / 900) : 1, vw: w }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Phones (coarse pointer or the narrow layout) get stored outputs. */
export function isPhone(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || !window.matchMedia(DESKTOP).matches
}

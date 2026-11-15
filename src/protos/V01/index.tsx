// Take V01, "The Hall of Six Gates": six colossal doorways of light on a polished black floor, each holding a real
// specimen. Pressing one glides through it; its page is the inside of that gate.
import '@fontsource-variable/big-shoulders'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import './v01.css'
import { lazy, Suspense, useMemo, useRef } from 'react'
import Home from './Home'
import { checkById } from './data'
import type { Flood } from './transit'

const Module = lazy(() => import('./Module'))

export default function V01({ view }: { view: string; params: URLSearchParams }) {
  const check = checkById(view)
  const floodRef = useRef<HTMLDivElement>(null)
  const flood = useMemo<Flood>(
    () => ({
      set: (hue, amount, ms = 0) => {
        const el = floodRef.current
        if (!el) return
        el.style.setProperty('--hue', hue)
        el.style.transition = ms ? `opacity ${ms}ms ease` : 'none'
        el.style.opacity = String(amount)
      },
      clear: (ms = 700) => {
        const el = floodRef.current
        if (!el) return
        el.style.transition = `opacity ${ms}ms cubic-bezier(0.3, 0, 0.2, 1)`
        el.style.opacity = '0'
      },
    }),
    [],
  )
  return (
    <>
      {check ? (
        <Suspense fallback={<div className="v01 v01-mod" />}>
          <Module key={check.id} check={check} flood={flood} />
        </Suspense>
      ) : (
        <Home flood={flood} />
      )}
      <div className="v01-flood" ref={floodRef} aria-hidden="true" />
    </>
  )
}

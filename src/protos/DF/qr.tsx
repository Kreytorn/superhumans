// DF's QR end screen (r4): #/proto/DF/qr. One big QR code for the public site, the address in text and the team
// name, on DF's sky (stars, the ISS sunrise, the aurora). For the pitch's last slide and for judges' phones.
// The QR is a static SVG made once with segno (public/qr/superhumans_qr.svg; decoded back to the exact address
// with OpenCV before it shipped), so this screen works offline and makes no outside request.
// Reached from the home's top-right "QR" link (desktop), the phone home's footer, the credits page, or the Q key on
// the home. Escape goes back to the body.
import { useEffect, useRef, useState } from 'react'
import './qr.css'
import { MODS, href } from './data'
import { initSky } from './figure'
import { initAurora } from './sky'

/** The published site and its code. Also used by the credits page. */
export const SITE_URL = 'https://kreytorn.github.io/superhumans/'
export const REPO_URL = 'https://github.com/Kreytorn/superhumans'
const BASE = import.meta.env.BASE_URL
/** The QR's width in modules, quiet zone included (version 3 = 29 modules, plus 4 on each side). */
const QR_MODULES = 37

export function useReducedMotion() {
  const [reduce] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  return reduce
}

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/** Escape on these screens flies back to the body. */
export function useEscapeHome() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) window.location.hash = href('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** DF's sky as a fixed backdrop: sparse stars, the real ISS sunrise along the bottom, the aurora over both.
 *  The photo and the aurora's limb are placed as on the home, so the light sits on the planet's edge. */
export function SpaceBackdrop({ still, slow = false }: { still: boolean; slow?: boolean }) {
  const starRef = useRef<HTMLCanvasElement>(null)
  const aurRef = useRef<HTMLCanvasElement>(null)
  const vp = useViewport()
  const narrow = vp.w < 760
  const base = (vp.w * 9) / 16
  // on a narrow screen the photo is taller than its width allows, so it is cropped at the sides (cover)
  const ph = Math.max(base, narrow ? vp.h * 0.42 : 0)
  const pTop = 0.93 * vp.h - 0.64 * ph

  useEffect(() => {
    const sky = starRef.current ? initSky(starRef.current, 17000) : null
    if (!sky) return
    sky.size()
    sky.draw(0, true)
  }, [vp])

  useEffect(() => {
    const aur = aurRef.current ? initAurora(aurRef.current) : null
    if (!aur) return
    const zoom = ph / base
    const limb: [number, number, number] = [0.5 + (0.42 - 0.5) * zoom, 1 - (pTop + 0.61 * ph) / vp.h, ((0.1 * (ph / vp.h)) / 0.1764) * zoom * zoom]
    aur.size(vp.w, vp.h)
    aur.draw(40, limb)
    if (still) return
    let raf = 0
    let last = 0
    const gap = slow ? 90 : 40
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < gap) return
      last = now
      aur.draw(40 + now / 1000, limb)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [vp, still, slow, ph, base, pTop])

  return (
    <div className="df-xs-sky" aria-hidden="true">
      <canvas ref={starRef} className="df-sky" />
      <div className="df-photo" style={{ top: pTop, height: ph }} />
      <canvas ref={aurRef} className="df-aur" />
      <div className="df-vignette" />
    </div>
  )
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export default function QrEnd({ params }: { params: URLSearchParams }) {
  const reduce = useReducedMotion()
  const pinned = params.get('state') === 'result'
  const vp = useViewport()
  const [ready, setReady] = useState(false)
  useEscapeHome()

  // a whole number of screen px per module keeps every square crisp
  const narrow = vp.w < 760
  const target = narrow ? Math.min(vp.w - 72, 340) : Math.min(vp.h * 0.6, vp.w * 0.36, 600)
  const px = Math.max(4, Math.floor(target / QR_MODULES)) * QR_MODULES

  return (
    <div className={`df df-xs df-qr${reduce || pinned ? ' is-still' : ''}`} data-view="qr" data-ready={ready ? '1' : undefined} data-state={pinned ? 'result' : 'idle'}>
      <SpaceBackdrop still={reduce || pinned} />
      <div className="df-xs-scroll">
        <div className="df-qr-page">
          <nav className="df-xs-bar" aria-label="Site">
            <a className="df-back" href={href('home')} data-qa="primary">
              <BackIcon />
              Back to the body
            </a>
            <a className="df-xs-link" href={href('credits')}>
              Credits
            </a>
          </nav>
          <main className="df-qr-main">
            <div className="df-qr-text">
              <h1 className="df-qr-word">SuperHumans</h1>
              <p className="df-qr-tag">Six AI health checks for astronauts, running in your browser.</p>
              <p className="df-qr-kicker">Scan to open it on your phone</p>
              <a className="df-qr-url" href={SITE_URL}>
                <span>kreytorn.github.io</span>
                <span>/superhumans</span>
              </a>
              <p className="df-qr-team">
                <span className="df-qr-dots" aria-hidden="true">
                  {MODS.map((m) => (
                    <i key={m.id} style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
                  ))}
                </span>
                Team SuperHumans · NASA Space Apps Challenge 2026 · Istanbul
              </p>
            </div>
            <figure className="df-qr-card" data-qa="hero" style={{ width: px + 28, height: px + 28 }}>
              <img
                src={`${BASE}qr/superhumans_qr.svg`}
                width={px}
                height={px}
                alt={`QR code that opens ${SITE_URL}`}
                draggable={false}
                onLoad={() => setReady(true)}
                onError={() => setReady(true)}
              />
              <i className="df-qr-tick tl" />
              <i className="df-qr-tick tr" />
              <i className="df-qr-tick bl" />
              <i className="df-qr-tick br" />
            </figure>
          </main>
        </div>
      </div>
    </div>
  )
}

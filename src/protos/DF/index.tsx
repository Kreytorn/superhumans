// DF: the old "Deep Field" mockup (work/App/mockups/A/home.html) made real.
//   #/proto/DF/home          the glass crew figure with six callouts, a window of real samples, and the sky
//   #/proto/DF/<module id>   the check's page; opening one flies into that place on the body, Back flies out again
// One tree stays mounted for both views, so the zoom has no hard cut: the scene scales toward the chosen body spot,
// the words dim and blur away, a glow in the check's colour fills the view, and the check's page resolves out of it.
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from 'react'
import './df.css'
// the credits page's styles, plus the home's two small links and the "Credits" link at the end of every check
import './credits.css'
import { ASK, MODS, QUIET, href, type Mod } from './data'
import posterUrl from './body_poster.webp'
import { END, eout, fitCam, initFigure, initSky, project, settled, stateAt, type FigState } from './figure'
import { initAurora } from './sky'

interface Props {
  view: string
  params: URLSearchParams
}
/** What a check page reports to the root (mirrors CheckStatus in ./check.tsx). */
interface CheckStatus {
  id: string
  ready: boolean
  phase: 'idle' | 'running' | 'result' | 'error'
}
interface CheckProps {
  mod: Mod
  /** True once the zoom has landed: only then may the heavy stage mount and load models. */
  live: boolean
  /** ?state=result on a check's address: its stage opens on the finished result. */
  pin?: 'result'
  /** ?sample=<nucleus id> on TrackTrace's address: the stage shows that nucleus (the presenter can pin any). */
  sample?: string
  onStatus?: (s: CheckStatus) => void
}

// The real check page lives in ./check.tsx; until that file exists a plain page stands in for it.
const checkLoader = import.meta.glob<{ default: ComponentType<CheckProps> }>('./check.tsx')['./check.tsx']
const RealCheck = checkLoader ? lazy(checkLoader) : null
// Quiet screens beside the home (r4): #/proto/DF/credits (credits and AI use), #/proto/DF/qr (the QR end screen)
// and #/proto/DF/licences (the data of each check and its licence, in plain words).
const Credits = lazy(() => import('./credits'))
const QrEnd = lazy(() => import('./qr'))
const Licences = lazy(() => import('./licences'))
const SCREENS: Record<string, typeof Credits> = { credits: Credits, qr: QrEnd, licences: Licences }
/** Set once the home has played its reveal: coming back from the credits or the QR screen skips it. */
let homeSeen = false

/** The figure camera's zoom during a flight: factor z about stage point (x, y). */
type FigZoom = { z: number; x: number; y: number; dx: number; dy: number; view: StageRect }
/** A rectangle in the figure's stage px. */
type StageRect = { L: number; T: number; W: number; H: number }
/** Where the figure and its callout columns sit. Desktop: viewport px. Phone: a 780x1064 stage scaled by s. */
interface Geom {
  phone: boolean
  vw: number
  vh: number
  s: number
  W: number
  H: number
  cx: number
  top: number
  bottom: number
  glX: number
  glW: number
  LX: number
  RX: number
  hit: number
  /** Callout scale: 1 = the mockup's sizes (figure 856 px tall). */
  k: number
  /** Type scale of the left column: 1 = the mockup's 1920x1080 stage. */
  u: number
  colW: number
}
function calcGeom(): Geom {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const phone = vw < 760 || vw / vh < 1.1
  if (phone) {
    const s = Math.min(vw, 560) / 780
    return { phone, vw, vh, s, W: 780, H: 1064, cx: 390, top: 64, bottom: 952, glX: 0, glW: 780, LX: 236, RX: 544, hit: 46, k: 1, u: 1, colW: 0 }
  }
  const u = Math.min(vw / 1920, vh / 1080)
  const top = Math.round(vh * 0.07)
  const bottom = Math.round(vh * 0.925)
  const fh = bottom - top
  const k = fh / 856
  const cx = Math.round(Math.min(vw * 0.7, vw - 40 * u - 450 * k))
  const LX = cx - 202 * k
  const RX = cx + 168 * k
  const colW = Math.max(300, Math.min(720 * u, LX - 290 * k - 116 * u))
  return { phone, vw, vh, s: 1, W: vw, H: vh, cx, top, bottom, glX: Math.round(cx - 0.4 * fh), glW: Math.round(0.8 * fh), LX, RX, hit: 30 * k, k, u, colW }
}
/** Callout row (stage px) of a check. */
const rowY = (g: Geom, m: Mod) => (g.phone ? m.ayP : g.top + (m.ay - 112) * g.k)

const STAR = 'M0 -8C.9 -2.2 2.2 -.9 8 0C2.2 .9 .9 2.2 0 8C-.9 2.2 -2.2 .9 -8 0C-2.2 -.9 -.9 -2.2 0 -8Z'
/** The callouts finish fading in a little after the figure's own reveal. */
const READY_MS = END + 500
/** If the shader has not drawn by then (it compiles slowly on some laptops), its still poster stands in for it. */
const GRACE_MS = 300
/** The poster (body_poster.webp) is the 1440x900 home's figure box: 616 x 900 px around a figure 770 px tall
 *  whose head top is at y 63; as fractions of the figure height it is placed the same way at any size. */
const PST = { x: -0.4, y: -63 / 770, w: 0.8, h: 900 / 770 }
const BASE = import.meta.env.BASE_URL
/** A real sample still of each check: its result poster, or for SpikeCount a real microscope field. */
const stillOf = (m: Mod) => (m.id === 'spikecount' ? `${BASE}spikecount/fields/96.png` : `${BASE}_posters/${m.id}.jpg`)
/** Every poster is drawn on a dark ground now (Garn Meter too), so none is shown inverted. */
const stillClass = (_m: Mod) => ""
/** The window starts on the check that asks for attention, then goes round in pitch order. */
const ASK_INDEX = Math.max(0, MODS.findIndex((m) => m.ask))

const mc = (color: string, extra?: CSSProperties) => ({ '--mc': color, ...extra }) as CSSProperties
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function useGeom() {
  const [g, setG] = useState(calcGeom)
  useEffect(() => {
    const on = () => setG(calcGeom())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return g
}

function useReducedMotion() {
  const [reduce] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  return reduce
}

/** Sparse stars, the orbital sunrise (a real NASA photo) and the aurora shader over it. */
function Backdrop({ g, still, slowRef, farRef }: { g: Geom; still: boolean; slowRef: RefObject<boolean>; farRef: RefObject<HTMLDivElement | null> }) {
  const starRef = useRef<HTMLCanvasElement>(null)
  const aurRef = useRef<HTMLCanvasElement>(null)
  // the photo is as wide as the viewport; its limb (64 % down the picture) sits just under the figure's feet
  const ph = (g.vw * 9) / 16
  const pTop = 0.93 * g.vh - 0.64 * ph
  const limbX = 0.42
  const limbY = g.phone ? 0.03 : 1 - (pTop + 0.61 * ph) / g.vh
  const limbC = g.phone ? 0.05 : (0.1 * (ph / g.vh)) / 0.1764

  useEffect(() => {
    const sky = starRef.current ? initSky(starRef.current, 17000) : null
    if (!sky) return
    sky.size()
    sky.draw(0, true)
  }, [g.vw, g.vh])

  useEffect(() => {
    const aur = aurRef.current ? initAurora(aurRef.current) : null
    if (!aur) return
    aur.size(g.vw, g.vh)
    const limb: [number, number, number] = [limbX, limbY, limbC]
    aur.draw(40, limb)
    if (still) return
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < (slowRef.current ? 120 : 40)) return
      last = now
      aur.draw(40 + now / 1000, limb)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [g.vw, g.vh, limbY, limbC, still, slowRef])

  return (
    <>
      <canvas ref={starRef} className="df-sky" aria-hidden="true" />
      {!g.phone && (
        <div className="df-far" ref={farRef} aria-hidden="true">
          <div className="df-photo" style={{ top: pTop, height: ph }} />
        </div>
      )}
      <canvas ref={aurRef} className="df-aur" aria-hidden="true" />
    </>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-10 -10 20 20" aria-hidden="true">
      <path d={STAR} fill="currentColor" />
      <circle r="1.6" fill="#fff" />
    </svg>
  )
}

function AiMark() {
  return (
    <div className="df-ai">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z" fill="currentColor" />
        <path d="M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3Z" fill="currentColor" />
      </svg>
      AI-generated illustration
    </div>
  )
}

function State({ ask }: { ask?: boolean }) {
  return ask ? (
    <span className="df-st ask">{ASK}</span>
  ) : (
    <span className="df-st">
      <i className="df-lamp" />
      {QUIET}
    </span>
  )
}

function Summary() {
  return (
    <p className="df-sum">
      <span>
        <i className="df-lamp" />
        Five are quiet.
      </span>
      <span>
        <i className="df-lamp ask" />
        One asks for the crew medic.
      </span>
    </p>
  )
}

interface HotProps {
  hot: number
  setHot: (i: number) => void
}
const hotHandlers = (i: number, setHot: (i: number) => void) => ({
  onPointerEnter: () => setHot(i),
  onPointerLeave: () => setHot(-1),
  onFocus: () => setHot(i),
  onBlur: () => setHot(-1),
})

/** The WebGL glass figure plus the SVG layer of body spots and leader lines. Each body spot is a link to its check. */
function Figure({
  g,
  still,
  intro,
  pausedRef,
  hot,
  setHot,
  onReady,
  zoomRef,
}: HotProps & { g: Geom; still: boolean; intro: boolean; pausedRef: RefObject<boolean>; onReady: () => void; zoomRef: RefObject<FigZoom | null> }) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const gRefs = useRef<(SVGGElement | null)[]>([])
  const readyRef = useRef(onReady)
  const startRef = useRef<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLImageElement>(null)
  /** True once the poster has stood in: the shader then never replays the reveal, it takes over the still body. */
  const restRef = useRef(false)
  /** When the shader first drew after the poster (its slow sway starts there). */
  const liveRef = useRef(0)

  useEffect(() => {
    readyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const fig = initFigure(cv)
    const cam = fitCam(g.cx, g.top, g.bottom)
    // poster states on the wrapper: '' waiting, 'poster' standing in, 'fade' cross-fading to the canvas, 'gl' live
    const wrap = wrapRef.current
    const poster = posterRef.current
    let mode = wrap?.dataset.p ?? ''
    let live = false
    let fadeTimer = 0
    const setMode = (m: string) => {
      mode = m
      if (wrap) wrap.dataset.p = m
      if (m === 'poster') restRef.current = true
    }
    const goLive = (now: number) => {
      if (live) return
      live = true
      if (restRef.current && !liveRef.current) liveRef.current = now
      if (mode === 'poster') {
        setMode('fade')
        fadeTimer = window.setTimeout(() => setMode('gl'), 700)
      } else if (mode !== 'fade') setMode('gl')
    }
    if (!fig) setMode('poster')
    // the poster's own reveal: cut at the scan line's height, like the shader's reveal from the feet up
    const pTop = g.top + PST.y * (g.bottom - g.top)
    const clipPoster = (rev: number, rot: number) => {
      if (!poster) return
      const c = rev <= -0.05 ? 'inset(0 0 100% 0)' : rev < 1.8 ? `inset(${Math.max(0, project(cam, [0, rev, 0], rot)[1] - pTop).toFixed(1)}px 0 0 0)` : ''
      if (poster.style.clipPath !== c) poster.style.clipPath = c
    }
    const els = MODS.map((_, i) => {
      const el = gRefs.current[i]
      return {
        lead: el?.querySelector<SVGPathElement>('.df-lead') ?? null,
        end: el?.querySelector<SVGCircleElement>('.df-end') ?? null,
        hs: el?.querySelector<SVGAElement>('.df-hs') ?? null,
      }
    })
    const place = (st: FigState) => {
      MODS.forEach((m, i) => {
        const { lead, end, hs } = els[i]
        if (!lead || !end || !hs) return
        const ay = rowY(g, m)
        const [sx, sy] = project(cam, m.org, st.rot)
        const dy = Math.abs(ay - sy)
        const ex = m.side === 'l' ? g.LX + 16 * g.k : g.RX - 16 * g.k
        const bx = m.side === 'l' ? Math.max(sx - dy, ex + 12 * g.k) : Math.min(sx + dy, ex - 12 * g.k)
        lead.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}L${bx.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${ay.toFixed(1)}`)
        lead.setAttribute('stroke-dashoffset', (1 - eout(st.ld[i])).toFixed(3))
        end.setAttribute('cx', ex.toFixed(1))
        end.setAttribute('cy', ay.toFixed(1))
        end.style.opacity = st.ld[i] >= 1 ? '1' : '0'
        const u = st.hs[i]
        hs.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${((0.4 + 0.6 * eout(u)) * g.k).toFixed(3)})`)
        hs.style.opacity = Math.min(1, u * 2).toFixed(3)
      })
    }
    const render = (st: FigState, now: number) => {
      let fs = st
      if (restRef.current) {
        // after the poster: the body as the poster shows it (lit, still), swaying only once the shader has it
        fs = settled(liveRef.current ? now - liveRef.current : 0, liveRef.current > 0 && !pausedRef.current)
        fs.rev = Math.min(fs.rev, st.rev)
        st = { ...st, rot: fs.rot }
        clipPoster(fs.rev, fs.rot)
      }
      if (fig?.draw(fs, cam)) goLive(now)
      place(st)
    }
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    cv.style.left = `${g.glX}px`
    cv.style.width = `${g.glW}px`
    fig?.resize(g.glW * g.s * dpr, g.H * g.s * dpr, g.glW, g.glX, dpr)
    // During the flight into a check the camera itself moves in (sharp, with the finer cell detail the shader adds
    // at close range), on a canvas widened to the whole stage; the page counter-scales it against the scene's zoom.
    let wide = ''
    let lastZoom = ''
    const widen = (v: StageRect | null) => {
      const key = v ? `${v.L} ${v.T} ${v.W} ${v.H}` : ''
      if (key === wide) return
      wide = key
      if (v) {
        cv.style.left = `${v.L}px`
        cv.style.top = `${v.T}px`
        cv.style.width = `${v.W}px`
        cv.style.height = `${v.H}px`
        fig?.resize(v.W * g.s * dpr, v.H * g.s * dpr, v.W, v.L, dpr)
      } else {
        cv.style.left = `${g.glX}px`
        cv.style.top = '0px'
        cv.style.width = `${g.glW}px`
        cv.style.height = `${g.H}px`
        cv.style.transform = ''
        fig?.resize(g.glW * g.s * dpr, g.H * g.s * dpr, g.glW, g.glX, dpr)
      }
    }
    const zoomed = () => {
      const zm = zoomRef.current
      if (!zm || zm.z <= 1.001) {
        if (wide) {
          widen(null)
          lastZoom = ''
          return false
        }
        return null
      }
      widen(zm.view)
      const key = `${zm.z.toFixed(4)} ${zm.x.toFixed(1)} ${zm.y.toFixed(1)} ${zm.dx.toFixed(1)} ${zm.dy.toFixed(1)}`
      if (key === lastZoom) return true
      lastZoom = key
      const Z = zm.z
      // the scene's zoom (scale Z about the spot, then the slide toward the centre) done by the camera; y has no
      // canvas offset in the shader, so the canvas top goes into the principal point
      const drew = fig?.draw(settled(1e7, false), {
        f: cam.f * Z,
        f0: cam.f0,
        ppx: zm.x + (cam.ppx - zm.x) * Z + zm.dx,
        ppy: zm.y + (cam.ppy - zm.y) * Z + zm.dy - zm.view.T,
      })
      if (drew) goLive(performance.now())
      return true
    }
    let ready = false
    const markReady = () => {
      if (ready) return
      ready = true
      readyRef.current()
    }
    let raf = 0
    const cleanup = () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fadeTimer)
      if (mode === 'fade') setMode('gl')
    }
    if (still) {
      // the poster shows the still body at once; the shader replaces it as soon as it has drawn
      const st = stateAt(1e6, false)
      const tryDraw = (now: number) => {
        render(st, now)
        if (live || !fig) return
        if (!mode) setMode('poster')
        raf = requestAnimationFrame(tryDraw)
      }
      tryDraw(performance.now())
      markReady()
      return cleanup
    }
    if (startRef.current === null) startRef.current = intro ? performance.now() : -1e7
    const start = startRef.current
    const mountAt = performance.now()
    // no intro to play (the page opened on a check): the poster can stand in at once
    if (!intro && !live && !mode && fig) setMode('poster')
    let lastDraw = 0
    let drawn = false
    // A slow GPU (frames over 120 ms apart, three in a row) gets a lighter canvas, so the reveal still plays.
    let prevNow = 0
    let slowFrames = 0
    // The page is usable even if the reveal crawls: the body spots and callouts are links from the start.
    const readyTimer = window.setTimeout(markReady, READY_MS + 1500)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      // only frames the shader drew count (while it compiles, slow frames are not its fault)
      if (live && prevNow && now - prevNow > 120 && !wide) slowFrames++
      else slowFrames = 0
      prevNow = now
      if (slowFrames >= 3 && dpr > 0.5) {
        slowFrames = 0
        dpr = Math.max(0.5, dpr * 0.6)
        fig?.resize(g.glW * g.s * dpr, g.H * g.s * dpr, g.glW, g.glX, dpr)
        drawn = false
      }
      if (!live && !mode && now - mountAt > GRACE_MS) setMode('poster')
      const zs = zoomed()
      if (zs) return
      if (zs === false) drawn = false
      const paused = pausedRef.current
      if (paused && drawn && live) return
      const ms = paused ? 1e7 : now - start
      if (ms < END) {
        render(stateAt(ms, false), now)
      } else if (now - lastDraw > 33 || !drawn || !live) {
        render(settled(ms - END, !paused), now)
        if (ms > READY_MS) markReady()
      } else return
      lastDraw = now
      drawn = true
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cleanup()
      window.clearTimeout(readyTimer)
    }
  }, [g, still, intro, pausedRef, zoomRef])

  const fh = g.bottom - g.top

  return (
    <>
      <div className="df-glw" ref={wrapRef}>
        <img
          ref={posterRef}
          className="df-poster"
          src={posterUrl}
          alt=""
          draggable={false}
          style={{ left: g.cx + PST.x * fh, top: g.top + PST.y * fh, width: PST.w * fh, height: PST.h * fh }}
        />
        <canvas ref={cvRef} className="df-gl" style={{ left: g.glX, width: g.glW, height: g.H }} aria-hidden="true" />
      </div>
      <svg className="df-fig" viewBox={`0 0 ${g.W} ${g.H}`} width={g.W} height={g.H} aria-label="Crew body map: six checks">
        {MODS.map((m, i) => (
          <g
            key={m.id}
            ref={(el) => {
              gRefs.current[i] = el
            }}
            className={hot === i ? 'is-hot' : undefined}
            style={mc(m.color)}
          >
            <path className="df-lead" fill="none" strokeWidth={2 * g.k} strokeLinecap="round" pathLength={1} strokeDasharray={1} />
            <circle className="df-end" r={3 * g.k} />
            <a className="df-hs" data-id={m.id} href={href(m.id)} aria-label={`Open ${m.name}`} {...hotHandlers(i, setHot)}>
              <circle className="df-hit" r={g.hit / g.k} />
              <g className="df-hl">
                <circle className="f" r={34} fillOpacity={0.16} />
                <circle className="s" r={24} fill="none" strokeWidth={2} />
              </g>
              <circle className="f" r={16} fillOpacity={0.14} />
              <circle className="df-ring s" r={18} fill="none" strokeWidth={1.5} strokeOpacity={0.6} />
              <path className="f" d={STAR} transform="scale(.875)" />
              <circle r={1.8} fill="#FFFFFF" />
            </a>
          </g>
        ))}
      </svg>
    </>
  )
}

function Callouts({ g, hot, setHot }: HotProps & { g: Geom }) {
  return (
    <>
      {MODS.map((m, i) => {
        const pos: CSSProperties = m.side === 'l' ? { right: g.W - g.LX } : { left: g.RX }
        return (
          <a
            key={m.id}
            href={href(m.id)}
            className={`df-lab ${m.side}${hot === i ? ' is-hot' : ''}`}
            style={{ ...mc(m.color), ...pos, top: rowY(g, m) - (g.phone ? 16 : 17 * g.k), '--d': `${2050 + i * 170}ms` } as CSSProperties}
            {...hotHandlers(i, setHot)}
          >
            {g.phone ? (
              <span className="df-lab-name">
                {m.ask && m.side === 'r' && <i className="df-lamp ask" />}
                {m.name}
                {m.ask && m.side === 'l' && <i className="df-lamp ask" />}
              </span>
            ) : (
              <>
                <span className="df-lab-name">{m.name}</span>
                <span className="df-lab-hook">{m.hook}</span>
                <State ask={m.ask} />
              </>
            )}
          </a>
        )
      })}
    </>
  )
}

/** The site's QR (made once with segno, decoded back to https://kreytorn.github.io/superhumans/; white quiet zone inside). */
const SITE_QR = `${BASE}qr/superhumans_qr.svg`

/** The instrument window: a large real sample of one check, with its name and sentence, and a strip of all six.
 *  At rest (qr) the same frame holds the site's QR instead, and opens the full-screen QR when clicked. */
function SampleWindow({ shown, hot, setHot, primary, qr }: HotProps & { shown: number; primary: boolean; qr: boolean }) {
  const m = MODS[shown]
  return (
    <section className="df-win" style={mc(qr ? '#8FB8FF' : m.color)} aria-label="Real samples of the six checks">
      <a
        className={`df-win-frame${qr ? ' is-qr' : ''}`}
        data-qa={primary ? 'primary' : undefined}
        href={href(qr ? 'qr' : m.id)}
        {...(qr ? {} : hotHandlers(shown, setHot))}
      >
        {/* the link's name comes from what is on screen (no aria-label), so it always contains the visible words */}
        <span className="df-wq" aria-hidden={qr ? undefined : true}>
          <span className="df-wq-box">
            <span className="df-wq-tile">
              <img src={SITE_QR} alt="QR code to this site" draggable={false} decoding="async" />
              <i className="df-tick tl" />
              <i className="df-tick tr" />
              <i className="df-tick bl" />
              <i className="df-tick br" />
            </span>
          </span>
          <span className="df-wq-line">Scan to open it on your phone</span>
          <span className="df-wq-url">
            kreytorn.github.io<b>/superhumans</b>
          </span>
        </span>
        <span className="df-win-head" aria-hidden={qr || undefined}>
          <StarIcon />
          <span className="df-win-name">{m.name}</span>
          <State ask={m.ask} />
          <span className="df-win-tag">Real sample</span>
        </span>
        <span className="df-win-view" aria-hidden={qr || undefined}>
          {MODS.map((x, i) => (
            <img key={x.id} src={stillOf(x)} alt="" className={`${stillClass(x)}${i === shown ? ' on' : ''}`} draggable={false} decoding="async" />
          ))}
          <i className="df-tick tl" />
          <i className="df-tick tr" />
          <i className="df-tick bl" />
          <i className="df-tick br" />
          <span className="df-win-open">
            Open
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <span className="df-win-sent" aria-hidden={qr || undefined}>
          {m.sentence}
        </span>
      </a>
      <div className="df-strip">
        <p className="df-strip-head">
          <i className="df-lamp breathe" />
          Six checks, running on this device
        </p>
        <div className="df-thumbs">
          {MODS.map((x, i) => (
            <a key={x.id} href={href(x.id)} className={`df-thumb${!qr && i === shown ? ' on' : ''}${hot === i ? ' is-hot' : ''}`} style={mc(x.color)} aria-label={`Open ${x.name}`} title={x.name} {...hotHandlers(i, setHot)}>
              <img src={stillOf(x)} alt="" className={stillClass(x)} draggable={false} decoding="async" />
              <i className={`df-lamp${x.ask ? ' ask' : ''}`} />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Stand-in check page, used only while ./check.tsx is missing or still loading. */
function StubCheck({ mod }: CheckProps) {
  return (
    <main className="df-mod" style={mc(mod.color)}>
      <a className="df-back" href={href('home')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </a>
      <div className="df-mod-body">
        <StarIcon className="df-mod-star" />
        <h1 className="df-mod-name">{mod.name}</h1>
        <p className="df-mod-sent">{mod.sentence}</p>
      </div>
    </main>
  )
}
function Check(props: CheckProps) {
  if (!RealCheck) return <StubCheck {...props} />
  return (
    <Suspense fallback={<StubCheck {...props} />}>
      <RealCheck {...props} />
    </Suspense>
  )
}

const PHOTO_CREDIT = 'Photo: NASA / Chris Williams (ISS), public domain'
/** A spot on screen (viewport px) and, when known, the same spot in the figure's stage px. */
type Origin = { x: number; y: number; st?: { x: number; y: number; k: number; view: StageRect } }
type LayerStyle = Partial<Record<'transform' | 'transformOrigin' | 'opacity' | 'filter' | 'visibility' | 'pointerEvents', string>>
const setStyle = (el: HTMLElement | null, st: LayerStyle) => {
  if (el) Object.assign(el.style, st)
}

/** The QR glyph of the home's small "QR" link. */
function QrGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
    </svg>
  )
}

/** The home's links to the data and licences, the credits and the QR end screen (which the Q key on the home also opens). */
function SiteLinks({ className }: { className: string }) {
  return (
    <nav className={className} aria-label="About this site">
      <a href={href('licences')}>Data and licences</a>
      <a href={href('credits')}>Credits and AI use</a>
      <a href={href('qr')} aria-keyshortcuts="Q" title="QR code to this site (key Q)">
        <QrGlyph />
        QR code
      </a>
    </nav>
  )
}

export default function DF(props: Props) {
  const Screen = Object.hasOwn(SCREENS, props.view) ? SCREENS[props.view] : null
  if (Screen) {
    return (
      <Suspense fallback={<div className="df" />}>
        <Screen params={props.params} />
      </Suspense>
    )
  }
  return <DFHome {...props} />
}

function DFHome({ view, params }: Props) {
  const reduce = useReducedMotion()
  const still = reduce || params.get('state') === 'result'
  const g = useGeom()
  const mod = MODS.find((m) => m.id === view) ?? null

  const rootRef = useRef<HTMLDivElement>(null)
  const farRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const uiRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  /** Zoom position: 0 = home, 1 = inside a check. */
  const z = useRef(mod ? 1 : 0)
  const raf = useRef(0)
  const origin = useRef<Origin | null>(null)
  const zoomRef = useRef<FigZoom | null>(null)
  const pausedRef = useRef(!!mod)
  const fadeOnly = useRef(reduce)
  const [intro] = useState(!mod && !homeSeen)
  useEffect(() => {
    homeSeen = true
  }, [])
  const [page, setPage] = useState<Mod | null>(mod)
  const pageNow = useRef<Mod | null>(mod)
  const [landed, setLanded] = useState(!!mod)
  const [away, setAway] = useState(!!mod)
  const [hot, setHotRaw] = useState(-1)
  /** The last check that was hot: the window keeps its sample while the QR fades back in. */
  const [rest, setRest] = useState(ASK_INDEX)
  /** True while the window shows the site's QR (its resting state on a wide screen). */
  const [qr, setQr] = useState(true)
  const [figReady, setFigReady] = useState(false)
  const onFigReady = useCallback(() => setFigReady(true), [])
  /** The open check's own status: the root reports ready (and its phase) only once that page's stage is on screen. */
  const [chk, setChk] = useState<CheckStatus | null>(null)
  const onStatus = useCallback((s: CheckStatus) => setChk((p) => (p && p.id === s.id && p.ready === s.ready && p.phase === s.phase ? p : s)), [])

  const setHot = useCallback((i: number) => {
    if (pausedRef.current) return
    setHotRaw(i)
    if (i >= 0) {
      setRest(i)
      setQr(false)
    }
  }, [])

  // at rest the window shows the site's QR, so the room can scan it while the talk starts. A hot check swaps its
  // sample in; when nothing is hot the QR comes back after a short grace, so the pointer can cross from a callout
  // into the window (which then keeps that check hot) without the sample vanishing on the way.
  useEffect(() => {
    if (hot >= 0 || qr) return
    const id = window.setTimeout(() => setQr(true), 500)
    return () => window.clearTimeout(id)
  }, [hot, qr])

  /** Paints the zoom at position v: every layer is a pure function of it, so it can stop and turn round anywhere. */
  const apply = useCallback((v: number) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const o = origin.current ?? { x: vw / 2, y: vh / 2 }
    const home = v <= 0.0005
    const there = v >= 0.9995
    const seen = there ? 'hidden' : 'visible'
    if (fadeOnly.current) {
      setStyle(sceneRef.current, { transform: '', filter: '', opacity: String(1 - v), visibility: seen, pointerEvents: home ? '' : 'none' })
      setStyle(uiRef.current, { transform: '', filter: '', opacity: String(1 - v), visibility: seen })
      setStyle(farRef.current, { transform: '', opacity: String(1 - 0.7 * v) })
      setStyle(glowRef.current, { opacity: '0' })
      zoomRef.current = null
      setStyle(pageRef.current, { transform: '', filter: '', opacity: String(v), visibility: home ? 'hidden' : 'visible', pointerEvents: there ? 'auto' : 'none' })
      return
    }
    const fall = Math.pow(v, 2.2)
    const sc = Math.exp(Math.log(9) * fall)
    const mv = ss(0, 1, v)
    const tx = (vw / 2 - o.x) * mv
    const ty = (vh / 2 - o.y) * mv
    const org = `${o.x.toFixed(1)}px ${o.y.toFixed(1)}px`
    setStyle(
      sceneRef.current,
      home
        ? { transform: '', filter: '', opacity: '1', visibility: 'visible', pointerEvents: '' }
        : {
            transformOrigin: org,
            transform: `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${sc.toFixed(4)})`,
            filter: `blur(${(ss(0.55, 0.97, v) * 3).toFixed(2)}px) brightness(${(1 + 0.45 * ss(0.25, 0.85, v)).toFixed(3)})`,
            opacity: (1 - ss(0.6, 0.97, v)).toFixed(3),
            visibility: seen,
            pointerEvents: 'none',
          },
    )
    setStyle(
      uiRef.current,
      home
        ? { transform: '', filter: '', opacity: '1', visibility: 'visible' }
        : {
            transformOrigin: org,
            transform: `translate3d(${(tx * 1.4).toFixed(1)}px,${(ty * 1.4).toFixed(1)}px,0) scale(${(1 + 2.4 * Math.pow(v, 1.7)).toFixed(4)})`,
            filter: `blur(${(ss(0, 0.3, v) * 7).toFixed(2)}px)`,
            opacity: (1 - ss(0.02, 0.36, v)).toFixed(3),
            visibility: v > 0.4 ? 'hidden' : 'visible',
          },
    )
    setStyle(
      farRef.current,
      home
        ? { transform: '', opacity: '1' }
        : { transformOrigin: org, transform: `translate3d(${(tx * 0.22).toFixed(1)}px,${(ty * 0.22).toFixed(1)}px,0) scale(${(1 + 0.32 * fall).toFixed(4)})`, opacity: (1 - 0.72 * ss(0.3, 1, v)).toFixed(3) },
    )
    // the figure: drawn by its own camera at this zoom, so it stays sharp; its canvas cancels the scene's scale
    const cv = sceneRef.current?.querySelector<HTMLCanvasElement>('.df-gl') ?? null
    if (cv) {
      if (!home && o.st) {
        const { k, view } = o.st
        zoomRef.current = { z: sc, x: o.st.x, y: o.st.y, dx: tx / k, dy: ty / k, view }
        cv.style.transformOrigin = `${(o.st.x - view.L).toFixed(1)}px ${(o.st.y - view.T).toFixed(1)}px`
        cv.style.transform = `scale(${(1 / sc).toFixed(5)}) translate(${(-tx / k).toFixed(1)}px,${(-ty / k).toFixed(1)}px)`
      } else {
        zoomRef.current = null
        cv.style.transform = ''
      }
    }
    const gx = o.x + (vw / 2 - o.x) * mv
    const gy = o.y + (vh / 2 - o.y) * mv
    setStyle(glowRef.current, {
      transform: `translate3d(${gx.toFixed(1)}px,${gy.toFixed(1)}px,0) scale(${(0.1 + 1.9 * fall).toFixed(4)})`,
      opacity: (ss(0.16, 0.6, v) * (1 - ss(0.72, 1, v)) * 0.95).toFixed(3),
    })
    setStyle(pageRef.current, {
      transform: there ? '' : `scale(${(1.1 - 0.1 * ss(0.5, 1, v)).toFixed(4)})`,
      filter: there ? '' : `blur(${((1 - ss(0.6, 1, v)) * 8).toFixed(2)}px)`,
      opacity: ss(0.58, 1, v).toFixed(3),
      visibility: v < 0.5 ? 'hidden' : 'visible',
      pointerEvents: v > 0.95 ? 'auto' : 'none',
    })
  }, [])

  const animateTo = useCallback(
    (target: number) => {
      cancelAnimationFrame(raf.current)
      const from = z.current
      const dist = Math.abs(target - from)
      const done = () => {
        z.current = target
        apply(target)
        if (target === 1) setLanded(true)
        else {
          origin.current = null
          pageNow.current = null
          setPage(null)
          setLanded(false)
          setAway(false)
        }
      }
      if (dist < 0.001) {
        done()
        return
      }
      const dur = (fadeOnly.current ? 240 : target > from ? 1080 : 940) * dist
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        if (p >= 1) {
          done()
          return
        }
        z.current = from + (target - from) * p
        apply(z.current)
        raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    },
    [apply],
  )

  /** Where the check's body spot is on screen right now (viewport px), with the scene's own zoom taken off,
   *  and the same spot in the figure's stage px. On a phone the list sits under the body, so the body spot is
   *  scrolled into view first: the flight then goes into the body, not the middle of the screen. */
  const measure = useCallback((id: string): Origin => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const centre = { x: vw / 2, y: vh / 2 }
    const scene = sceneRef.current
    if (!scene) return centre
    const prev = scene.style.transform
    scene.style.transform = 'none'
    const cv = scene.querySelector<HTMLCanvasElement>('.df-gl')
    const cvPrev = cv?.style.transform ?? ''
    if (cv) cv.style.transform = 'none'
    const spot = () => scene.querySelector(`.df-hs[data-id="${id}"]`)?.getBoundingClientRect()
    let r = spot()
    if (r && r.width > 0 && scene.scrollHeight > scene.clientHeight + 4 && (r.top < 56 || r.bottom > vh - 56)) {
      scene.scrollTop += r.top + r.height / 2 - vh * 0.42
      r = spot()
    }
    let out: Origin = centre
    if (r && r.width > 0) {
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      if (x >= 0 && x <= vw && y >= 0 && y <= vh) {
        out = { x, y }
        const cr = cv?.getBoundingClientRect()
        if (cv && cr && cr.width > 0 && cv.offsetWidth > 0) {
          const k = cr.width / cv.offsetWidth
          // the stage's own origin on screen, and the whole viewport in stage px (what the widened canvas covers)
          const ox = cr.left - cv.offsetLeft * k
          const oy = cr.top - cv.offsetTop * k
          const view = { L: Math.floor(-ox / k), T: Math.floor(-oy / k), W: Math.ceil(vw / k) + 2, H: Math.ceil(vh / k) + 2 }
          out.st = { x: (x - ox) / k, y: (y - oy) / k, k, view }
        }
      }
    }
    if (cv) cv.style.transform = cvPrev
    scene.style.transform = prev
    return out
  }, [])

  useLayoutEffect(() => {
    fadeOnly.current = still
    const target = MODS.find((m) => m.id === view) ?? null
    if (target) {
      if (z.current < 0.02 || !origin.current) origin.current = measure(target.id)
      pausedRef.current = true
      pageNow.current = target
      setPage(target)
      setAway(true)
      setHotRaw(-1)
      animateTo(1)
    } else {
      if (!origin.current && pageNow.current) origin.current = measure(pageNow.current.id)
      pausedRef.current = false
      animateTo(0)
    }
    return () => cancelAnimationFrame(raf.current)
  }, [view, still, animateTo, measure])

  // dev only: window.__dfZoom(id, 0..1) freezes the zoom at one position, for frame checks
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __dfZoom?: (id: string, v: number) => void }
    w.__dfZoom = (id, v) => {
      const m = MODS.find((x) => x.id === id)
      if (!m) return
      cancelAnimationFrame(raf.current)
      if (!origin.current || z.current < 0.02) origin.current = measure(id)
      pausedRef.current = true
      pageNow.current = m
      setPage(m)
      z.current = v
      apply(v)
    }
    return () => {
      delete w.__dfZoom
    }
  }, [apply, measure])

  // the layout changed under a finished zoom: repaint it for the new viewport
  useLayoutEffect(() => {
    apply(z.current)
  }, [g, apply])

  useEffect(() => {
    if (!mod) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) window.location.hash = href('home')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mod])

  // on the home, the Q key opens the QR end screen (for the pitch's last slide)
  useEffect(() => {
    if (mod) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'q') return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      window.location.hash = href('qr')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mod])

  const shown = hot >= 0 ? hot : rest
  const chkNow = mod && chk && chk.id === mod.id ? chk : null
  const ready = mod ? landed && !!chkNow?.ready : figReady
  const pin = mod && params.get('state') === 'result' ? 'result' : undefined
  const sampleParam = params.get('sample') ?? ''
  const sample = mod?.id === 'tracktrace' && /^nucleus-\d+$/.test(sampleParam) ? sampleParam : undefined
  const cls = `df${g.phone ? ' is-phone' : ''}${still ? ' is-still' : ''}${intro ? '' : ' no-intro'}`
  const vars = { '--u': `${g.u}px`, '--k': `${g.k}px` } as CSSProperties

  return (
    <div ref={rootRef} className={cls} style={vars} data-ready={ready ? '1' : undefined} data-state={mod ? chkNow?.phase : still ? 'result' : 'idle'} data-view={mod ? mod.id : 'home'} data-landed={landed ? '1' : undefined}>
      <Backdrop g={g} still={still} slowRef={pausedRef} farRef={farRef} />
      <div className="df-vignette" />
      {g.phone ? (
        <div className="df-scroll" ref={sceneRef} inert={away || undefined}>
          <header className="df-phead">
            <h1 className="df-wordmark">SuperHumans</h1>
            <p className="df-tagline">Six AI health checks for astronauts, running in your browser.</p>
            <Summary />
          </header>
          <div className="df-pwrap" style={{ height: g.H * g.s }}>
            <div className="df-pstage" style={{ transform: `scale(${g.s})` }}>
              <div className="df-photo" />
              <Figure key="phone" g={g} still={still} intro={intro} pausedRef={pausedRef} hot={hot} setHot={setHot} onReady={onFigReady} zoomRef={zoomRef} />
              <Callouts g={g} hot={hot} setHot={setHot} />
              <AiMark />
            </div>
          </div>
          <ul className="df-list" aria-label="The six checks">
            {MODS.map((m, i) => (
              <li key={m.id}>
                <a className={`df-row${hot === i ? ' is-hot' : ''}`} href={href(m.id)} style={mc(m.color)} {...hotHandlers(i, setHot)}>
                  <img className={`df-row-still ${stillClass(m)}`} src={stillOf(m)} alt="" draggable={false} decoding="async" />
                  <span>
                    <span className="df-row-name">{m.name}</span>
                    <span className="df-row-hook">{m.hook}</span>
                    {m.ask && <State ask />}
                  </span>
                  <span className="df-row-end">
                    {!m.ask && <State />}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="df-credit">{PHOTO_CREDIT}</p>
          <SiteLinks className="df-pfoot" />
        </div>
      ) : (
        <>
          <div className="df-scene" ref={sceneRef} inert={away || undefined}>
            <Figure key="desk" g={g} still={still} intro={intro} pausedRef={pausedRef} hot={hot} setHot={setHot} onReady={onFigReady} zoomRef={zoomRef} />
          </div>
          <main className="df-ui" ref={uiRef} inert={away || undefined}>
            <div className="df-col" style={{ width: g.colW }}>
              <h1 className="df-wordmark">SuperHumans</h1>
              <p className="df-tagline">Six AI health checks for astronauts, running in your browser.</p>
              <Summary />
              <SampleWindow shown={shown} hot={hot} setHot={setHot} primary={!mod} qr={qr && hot < 0} />
            </div>
            <Callouts g={g} hot={hot} setHot={setHot} />
            <AiMark />
            <p className="df-credit">{PHOTO_CREDIT}</p>
            <SiteLinks className="df-topnav" />
          </main>
        </>
      )}
      <div className="df-glow" ref={glowRef} style={mc(page?.color ?? '#8FB8FF')} aria-hidden="true" />
      <div className="df-page" ref={pageRef}>
        {page && <Check key={page.id} mod={page} live={landed} pin={page.id === mod?.id ? pin : undefined} sample={page.id === mod?.id ? sample : undefined} onStatus={onStatus} />}
      </div>
    </div>
  )
}

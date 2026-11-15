// Home: the glass figure before the planet's lit limb. Six organ lights are the six checks; pressing one dives into it.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { navigate, setParam } from '../../lib/route'
import { CHECKS, SITE_LINE, cropStyle } from './data'
import { GlassScene, ORGANS, bodyMatrix, lookAt, project, toBodyDir, toWorld, vec, type Frame, type V3 } from './scene'
import { preload } from './preload'

const BASE = import.meta.env.BASE_URL
const DIVE_MS = 1150
const D_END = 0.4 // how close the camera gets to an organ, in metres
const STILL_T = 2.6 // the moment the fallback stills were shot at
const RAY_DIR = vec.norm([0.55, -0.8, 0.22]) // the cosmic ray's path through the body (world space)
const RAY_FIRST = 1.15
const RAY_EVERY = 7.5

/** Told to the module page so it can open out of the organ's light. */
export const arrival: { id: string | null } = { id: null }

interface Layout {
  dist: number
  fl: number
  /** the camera looks straight ahead from this height, so the figure sits above or below the centre of the view */
  eye: number
  planet: V3
  sunX: number
  yaw: number
}
// tangent-space numbers: the view is 0.24 tall either side of its centre
const WIDE: Layout = { dist: 4.3, fl: 4.165, eye: -0.035, planet: [-0.725, -2.405, 2.4], sunX: -0.15, yaw: -0.5 }
const TALL: Layout = { dist: 7.4, fl: 4.165, eye: -0.235, planet: [-0.36, -1.607, 1.6], sunX: -0.062, yaw: -0.5 }
const LEAN = -0.33
const ROLL = 0.05

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
const easeInOut = (x: number) => {
  const u = clamp01(x)
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** The name as a white-on-black picture of the view at half size, placed exactly where the page draws it. */
function wordMask(word: HTMLElement, base: HTMLElement, rootBox: DOMRect, w: number, h: number): HTMLCanvasElement {
  const k = 0.5
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(w * k))
  c.height = Math.max(2, Math.round(h * k))
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, c.width, c.height)
  const cs = getComputedStyle(word)
  const size = parseFloat(cs.fontSize)
  ctx.font = `${cs.fontWeight} expanded ${size * k}px ${cs.fontFamily}`
  const spacing = parseFloat(cs.letterSpacing)
  if (Number.isFinite(spacing)) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing * k}px`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  const r = word.getBoundingClientRect()
  const b = base.getBoundingClientRect()
  ctx.fillText(word.textContent ?? '', (r.left - rootBox.left) * k, (b.bottom - rootBox.top) * k)
  return c
}

export default function Home({ from, still }: { from: string | null; still: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLHeadingElement>(null)
  const wordBase = useRef<HTMLElement>(null)
  const spots = useRef<(HTMLButtonElement | null)[]>([])
  const fromIdx = CHECKS.findIndex((c) => c.id === from)
  const [focus, setFocus] = useState(fromIdx >= 0 ? fromIdx : 0)
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState(true)
  const [diving, setDiving] = useState<number | null>(fromIdx >= 0 ? fromIdx : null)
  const ctl = useRef({ focus: fromIdx >= 0 ? fromIdx : 0, hover: -1, touched: 0, reduce: false, dive: null as null | { i: number; t0: number; out: boolean; ui: boolean } })

  useEffect(() => {
    const el = root.current!
    const host = holder.current!
    const c = ctl.current
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    c.reduce = reduce
    const coarse = matchMedia('(pointer: coarse)').matches
    const lite = coarse || window.innerWidth < 700
    c.dive = fromIdx >= 0 && !reduce ? { i: fromIdx, t0: performance.now(), out: true, ui: false } : null
    if (fromIdx >= 0 && reduce) setDiving(null)

    // the canvas is made here, not in JSX: a context that was lost on unmount can never be asked for again
    const canvas = document.createElement('canvas')
    canvas.className = 'v02-gl'
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)
    let scene: GlassScene | null = null
    try {
      scene = new GlassScene(canvas, lite)
    } catch (err) {
      console.warn('[V02] WebGL scene unavailable, showing the still:', err)
      setLive(false)
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      scene = null
      setLive(false)
    }
    canvas.addEventListener('webglcontextlost', onLost)

    let w = 0
    let h = 0
    let L = WIDE
    let scale = 1
    let textOn = 0
    const sun: [number, number] = [0, 0]
    const size = () => {
      w = el.clientWidth
      h = el.clientHeight
      if (!w || !h) return
      L = w / h < 0.8 ? TALL : WIDE
      const dx = L.sunX - L.planet[0]
      sun[0] = L.sunX
      sun[1] = L.planet[1] + Math.sqrt(L.planet[2] * L.planet[2] - dx * dx) + 0.0025
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const ratio = (w * h * dpr * dpr > 1.75e6 ? 1 : dpr) * scale
      scene?.resize(Math.round(w * ratio), Math.round(h * ratio))
      fitWord()
    }
    // the name spans the view; the same letters go to the shader so the glass can bend them
    let fontOk = false
    const fitWord = () => {
      const wd = word.current
      const bs = wordBase.current
      if (!wd || !bs || !w) return
      const probe = document.createElement('canvas').getContext('2d')
      if (probe) {
        probe.font = `800 expanded 100px "Archivo Variable"`
        ;(probe as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-3px'
        const per = probe.measureText('SuperHumans').width / 100
        const room = w - (L === TALL ? 40 : 2 * Math.max(40, Math.min(72, w * 0.05)))
        if (per > 0) wd.style.fontSize = `${(room / per).toFixed(1)}px`
      }
      el.style.setProperty('--wb', `${Math.round(wd.getBoundingClientRect().bottom - el.getBoundingClientRect().top)}px`)
      if (scene && fontOk) {
        scene.setText(wordMask(wd, bs, el.getBoundingClientRect(), w, h))
        textOn = 1
      }
    }
    const ro = new ResizeObserver(size)
    ro.observe(el)
    size()
    document.fonts
      .load('800 100px "Archivo Variable"')
      .then(() => document.fonts.ready)
      .then(() => {
        fontOk = true
        fitWord()
      })
      .catch(() => {})

    // pointer: the figure turns a little toward it
    let tx = 0, ty = 0, px = 0, py = 0
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !w) return
      tx = (e.clientX / w) * 2 - 1
      ty = (e.clientY / h) * 2 - 1
    }
    el.addEventListener('pointermove', onMove)

    const org = new Float32Array(6)
    const sw = new Float32Array(6).fill(1)
    const frame: Frame = {
      cam: lookAt([0, 0, 4], [0, 0, 0], L.fl),
      b: bodyMatrix(0, 0, 0),
      bob: [0, 0, 0],
      t: 0,
      org: new Float32Array(6),
      sw: new Float32Array(6),
      planet: L.planet,
      sun,
      rayA: [0, 0, 0],
      rayB: [0, 0, 0],
      ray: [0, 0, 0],
      textOn: 0,
      expo: 1,
    }
    const skipIntro = reduce || fromIdx >= 0 || still
    const t0 = performance.now()
    let last = t0
    let raf = 0
    let frames = 0
    let isReady = false
    let lastU = -1
    let slow = 0, slowN = 0

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      if (document.hidden || !w) {
        last = now
        return
      }
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      const t = (now - t0) / 1000
      const frozen = still || !scene
      const tm = frozen ? STILL_T : reduce ? STILL_T : skipIntro ? t + STILL_T : t

      // dive: u runs 0 (the whole figure) to 1 (inside the organ's light)
      let u = 0
      let di = -1
      const d = c.dive
      if (d) {
        const k = clamp01((now - d.t0) / DIVE_MS)
        di = d.i
        u = d.out ? 1 - k : k
        if (d.out && k > 0.45 && !d.ui) {
          d.ui = true
          setDiving(null)
        }
        if (k >= 1) {
          if (d.out) {
            c.dive = null
            setParam('from', undefined)
          } else {
            cancelAnimationFrame(raf)
            arrival.id = CHECKS[d.i].id
            navigate(`proto/V02/${CHECKS[d.i].id}`)
            return
          }
        }
      }
      const en = skipIntro ? 1 : easeOut(t / 1.6)

      // the figure: drifting, slowly turning, a little toward the pointer
      px += (tx - px) * (1 - Math.exp(-dt * 2.5))
      py += (ty - py) * (1 - Math.exp(-dt * 2.5))
      const drift = frozen || reduce ? 0 : 1
      const yaw = L.yaw + drift * (0.15 * Math.sin((tm - STILL_T) * 0.17) + px * 0.24)
      const b = bodyMatrix(yaw, LEAN + drift * (0.03 * Math.sin((tm - STILL_T) * 0.23) + py * 0.06), ROLL + drift * 0.025 * Math.sin((tm - STILL_T) * 0.19))
      frame.b = b
      frame.bob[1] = drift * 0.014 * Math.sin((tm - STILL_T) * 0.6)

      // the camera: home, or on its way into an organ
      let roX = 0, roY = L.eye, roZ = L.dist * (1 + 0.13 * (1 - en))
      let tgX = 0, tgY = L.eye, tgZ = 0
      if (di >= 0 && u > 0) {
        const ow = toWorld(b, ORGANS[di], frame.bob)
        const e = easeInOut(u)
        const vx = roX - ow[0], vy = roY - ow[1], vz = roZ - ow[2]
        const d0 = Math.hypot(vx, vy, vz)
        const k = (d0 * Math.pow(D_END / d0, e)) / d0
        roX = ow[0] + vx * k
        roY = ow[1] + vy * k
        roZ = ow[2] + vz * k
        const a = easeOut(u * 1.5)
        tgX += (ow[0] - tgX) * a
        tgY += (ow[1] - tgY) * a
        tgZ += (ow[2] - tgZ) * a
      }
      const cam = lookAt([roX, roY, roZ], [tgX, tgY, tgZ], L.fl)
      frame.cam = cam

      // the lanterns: the one in focus swells and brightens; on a dive its light takes the screen
      const hot = c.hover >= 0 ? c.hover : c.focus
      for (let i = 0; i < 6; i++) {
        const on = skipIntro ? 1 : clamp01((t - 0.4 - i * 0.11) / 0.5)
        let o = (i === hot ? 2.3 : 0.92) * on
        let s = i === hot ? 1.36 : 1
        if (di >= 0) {
          if (i === di) {
            o = 2.3 + 10 * u * u
            s = 1.36 + 2.8 * u * u
          } else o *= 1 - 0.85 * u
        }
        const k = 1 - Math.exp(-dt * (di >= 0 ? 40 : 7))
        org[i] += (o - org[i]) * k
        sw[i] += (s - sw[i]) * k
        frame.org[i] = org[i]
        frame.sw[i] = sw[i]
      }
      const ph = (tm * 1.05) % 1
      const beat = frozen || reduce ? 0.3 : Math.exp(-ph * 9) + (ph > 0.2 ? 0.55 * Math.exp(-(ph - 0.2) * 9) : 0)
      frame.org[1] *= 1 + 0.4 * beat
      frame.sw[1] *= 1 + 0.15 * beat

      // the cosmic ray: now and then it streaks straight through the body and leaves a glow where it crossed
      const rb = toBodyDir(b, RAY_DIR)
      const p0 = ORGANS[0]
      for (let i = 0; i < 3; i++) {
        frame.rayA[i] = p0[i] - rb[i] * 1.05
        frame.rayB[i] = p0[i] + rb[i] * 1.05
      }
      if (tm < RAY_FIRST) {
        frame.ray[0] = 0
        frame.ray[1] = 0
        frame.ray[2] = 0
      } else {
        const tc = frozen || reduce ? 1.2 : (tm - RAY_FIRST) % RAY_EVERY
        frame.ray[0] = clamp01(tc / 0.42)
        frame.ray[1] = tc < 0.42 ? 1 : Math.exp(-(tc - 0.42) / 0.9)
        frame.ray[2] = (0.2 + 0.85 * Math.exp(-Math.max(tc - 0.2, 0) / 2.6)) * smooth(0.12, 0.42, tc)
        if (tm - RAY_FIRST > RAY_EVERY) frame.ray[2] = Math.max(frame.ray[2], 0.2)
        if (tc > 0.2) frame.org[0] *= 1 + 1.2 * Math.exp(-(tc - 0.2) / 1.7)
      }

      frame.t = tm
      frame.planet = L.planet
      frame.textOn = textOn * (1 - smooth(0.05, 0.4, u))
      frame.expo = (0.1 + 0.9 * en) * (1 + 0.5 * u)
      scene?.draw(frame)
      frames++

      // the six buttons follow their organs
      for (let i = 0; i < 6; i++) {
        const s = spots.current[i]
        if (!s) continue
        const p = project(cam, toWorld(b, ORGANS[i], frame.bob), w, h)
        s.style.transform = `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0)`
      }
      if (u !== lastU) {
        lastU = u
        el.style.setProperty('--dive', u.toFixed(3))
      }
      if (!isReady && frames >= 3 && (skipIntro || t > 1.75) && !(c.dive && c.dive.out)) {
        isReady = true
        setReady(true)
      }
      // a slow machine gets a smaller canvas instead of a slide show
      if (isReady && scene && !c.dive && scale > 0.55) {
        slow += dt
        if (++slowN >= 40) {
          if (slow / slowN > 0.045) {
            scale *= 0.8
            size()
          }
          slow = 0
          slowN = 0
        }
      }
    }
    raf = requestAnimationFrame(step)

    const cycle = window.setInterval(() => {
      if (reduce || still || c.dive || c.hover >= 0 || document.hidden || performance.now() - c.touched < 9000 || performance.now() - t0 < 6000) return
      c.focus = (c.focus + 1) % CHECKS.length
      setFocus(c.focus)
    }, 5200)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(cycle)
      ro.disconnect()
      el.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('webglcontextlost', onLost)
      scene?.dispose()
      scene = null
      canvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hot = useCallback((i: number) => {
    const c = ctl.current
    c.hover = i
    c.touched = performance.now()
    if (i >= 0) preload(CHECKS[i].id)
    if (i >= 0 && !c.dive) {
      c.focus = i
      setFocus(i)
    }
  }, [])

  const dive = useCallback((i: number) => {
    const c = ctl.current
    if (c.dive) return
    preload(CHECKS[i].id)
    if (c.reduce) {
      arrival.id = null
      navigate(`proto/V02/${CHECKS[i].id}`)
      return
    }
    c.focus = i
    setFocus(i)
    c.dive = { i, t0: performance.now(), out: false, ui: true }
    setDiving(i)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length === 1 && e.key >= '1' && e.key <= '6') dive(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dive])

  const cur = CHECKS[focus]
  const bind = (i: number) => ({
    onPointerEnter: () => hot(i),
    onPointerLeave: () => hot(-1),
    onFocus: () => hot(i),
    onBlur: () => hot(-1),
    onClick: () => dive(i),
  })
  const tile = (i: number) => {
    const c = CHECKS[i]
    return (
      <button key={c.id} type="button" className={`v02-tile${i === focus ? ' is-hot' : ''}`} style={{ ['--c' as string]: c.hue }} tabIndex={-1} aria-label={`Open ${c.name}`} {...bind(i)}>
        <span className="v02-tile-img" style={cropStyle(c)} />
        <span className="v02-tile-name">{c.name}</span>
      </button>
    )
  }

  return (
    <div
      ref={root}
      className={`v02 v02-home${still ? ' is-still' : ''}`}
      data-proto="V02"
      data-ready={ready ? '1' : undefined}
      data-live={live ? '1' : '0'}
      data-diving={diving !== null ? '1' : undefined}
      style={{ ['--c' as string]: cur.hue } as CSSProperties}
    >
      <h1 ref={word} className="v02-word">
        SuperHumans
        <i ref={wordBase} aria-hidden="true" />
      </h1>
      <div ref={holder} className="v02-holder">
        {!live && (
          <picture>
            <source media="(max-aspect-ratio: 4/5)" srcSet={`${BASE}themes/V02/still_tall.jpg`} />
            <img className="v02-still" src={`${BASE}themes/V02/still_wide.jpg`} alt="" />
          </picture>
        )}
      </div>

      <div className="v02-ui">
        <p className="v02-line">{SITE_LINE}</p>

        <div className="v02-spots">
          {CHECKS.map((c, i) => (
            <button
              key={c.id}
              ref={(n) => {
                spots.current[i] = n
              }}
              type="button"
              className={`v02-spot${i === focus ? ' is-hot' : ''}`}
              data-side={c.side}
              data-organ={c.id}
              data-qa={i === 0 ? 'primary' : undefined}
              style={{ ['--c' as string]: c.hue }}
              aria-label={`${c.name}: ${c.organ}. Open this check.`}
              {...bind(i)}
            >
              <span className="v02-ring" />
              <span className="v02-tag">{c.name}</span>
            </button>
          ))}
        </div>

        <aside className="v02-focus" aria-live="polite">
          <div key={cur.id} className="v02-focus-in">
            <button type="button" className="v02-slide" tabIndex={-1} aria-label={`Open ${cur.name}`} onClick={() => dive(focus)}>
              <span style={cropStyle(cur)} />
            </button>
            <p className="v02-kick">
              {cur.n} <b>/ 06</b> · {cur.organ}
            </p>
            <h2 className="v02-name">{cur.name}</h2>
            <p className="v02-sent">{cur.sentence}</p>
            <button type="button" className="v02-go" tabIndex={-1} onClick={() => dive(focus)}>
              Dive in
              <ArrowRight weight="bold" />
            </button>
          </div>
        </aside>

        <nav className="v02-dock v02-dock-l" aria-label="Checks one to three">
          {[0, 1, 2].map(tile)}
        </nav>
        <nav className="v02-dock v02-dock-r" aria-label="Checks four to six">
          {[3, 4, 5].map(tile)}
        </nav>
        <p className="v02-hint">Press a light inside the glass</p>
        <span className="v02-ai">AI-generated imagery</span>
      </div>

      <div className="v02-veil" aria-hidden="true">
        <i />
        <span style={cropStyle(cur)} />
      </div>
    </div>
  )
}

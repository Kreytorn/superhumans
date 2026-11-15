// Home: one continuous zoom. Opens on a glowing chest, pulls back through body, window, ship and planet, then settles
// on the person in the ship's great round window. Six lit places on the body are the way in; pressing one dives through
// the skin until the real specimen fills the screen, which becomes that check's page.
import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../../lib/route'
import { CHECKS, SITE_LINE, hexRgb, type V3 } from './data'
import {
  L_BODY, L_CLOSE, L_REST, L_SHIP, L_SPACE, add, camOf, clamp01, cross, diveKey, easeIO, keyAt, lerp, makeWorld, mul, norm, project, railPos, smooth, sunAt, type Cam, type Key,
} from './camera'
import { Renderer, type Frame } from './gl'
import Rail, { type Level } from './Rail'

const BASE = import.meta.env.BASE_URL
const T_HOLD = 700
const T_OUT = 3900
const T_SPACE = 4700
const T_BACK = 6700
const STOPS = [L_CLOSE, L_BODY, L_REST, L_SHIP, L_SPACE]
const LEVEL_L: Record<Level, number> = { space: L_SPACE, ship: L_SHIP, body: L_REST }
const LN_NEAR0 = Math.log(1.5e4)
const LN_NEAR1 = Math.log(4e4)
const LN_FAR0 = Math.log(25)
const LN_FAR1 = Math.log(400)

const sine = (u: number) => (1 - Math.cos(Math.PI * clamp01(u))) / 2
function introL(ms: number) {
  if (ms < T_HOLD) return L_CLOSE
  if (ms < T_OUT) return lerp(L_CLOSE, L_SPACE, sine((ms - T_HOLD) / (T_OUT - T_HOLD)))
  if (ms < T_SPACE) return L_SPACE - 0.06 * smooth((ms - T_OUT) / (T_SPACE - T_OUT))
  return lerp(L_SPACE - 0.06, L_REST, sine((ms - T_SPACE) / (T_BACK - T_SPACE)))
}
function beatAt(t: number) {
  const ph = (t % 1.12) / 1.12
  const b = (c: number, w: number) => Math.exp(-(((ph - c) / w) ** 2))
  return b(0.07, 0.05) + 0.55 * b(0.25, 0.06)
}
function levelOf(L: number): Level {
  if (L > (L_SHIP + L_SPACE) / 2) return 'space'
  if (L > (L_REST + L_SHIP) / 2) return 'ship'
  return 'body'
}

type Mode = 'intro' | 'free' | 'fly' | 'dive' | 'ret' | 'freeze'

/** Load a check page's code before the dive ends, so the specimen hands over to the page without a gap. */
const STAGES: Record<string, () => Promise<unknown>> = {
  tracktrace: () => import('../../moments/tracktrace'),
  bubblegrade: () => import('../../moments/bubblegrade'),
  veinsqueeze: () => import('../../moments/veinsqueeze'),
  braindrift: () => import('../../moments/braindrift'),
  garnmeter: () => import('../../moments/garnmeter'),
}
function warm(id?: string) {
  void import('./Module').catch(() => {})
  if (id && STAGES[id]) void STAGES[id]().catch(() => {})
}

export default function Home({ params }: { params: URLSearchParams }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const placeRefs = useRef<(HTMLButtonElement | null)[]>([])
  const markRef = useRef<HTMLSpanElement>(null)
  const bloomRef = useRef<HTMLDivElement>(null)
  const fromId = params.get('from')
  const fromIdx = fromId ? CHECKS.findIndex((c) => c.id === fromId) : -1
  const [ui, setUi] = useState(0)
  const [focus, setFocus] = useState(fromIdx >= 0 ? fromIdx : 0)
  const [hot, setHot] = useState(-1)
  const [level, setLevel] = useState<Level | null>(null)
  const [placesOn, setPlacesOn] = useState(false)
  const [ready, setReady] = useState(false)
  const [still, setStill] = useState(false)
  const [bloom, setBloom] = useState(fromIdx)
  const [phone, setPhone] = useState(false)
  const [zoomTo, setZoomTo] = useState<{ l: Level | null; n: number }>({ l: null, n: 0 })
  const ctl = useRef<{ dive: (i: number) => void; fly: (L: number) => void; hot: (i: number) => void; focus: (i: number) => void } | null>(null)
  const touched = useRef(0)
  const focusRef = useRef(focus)
  const hotRef = useRef(hot)
  focusRef.current = focus
  hotRef.current = hot

  useEffect(() => {
    const root = rootRef.current!
    const host = hostRef.current!
    let reduce = false
    try {
      reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      /* no media queries */
    }
    let W = root.clientWidth || innerWidth
    let H = root.clientHeight || innerHeight
    const isPhone = W < 700
    setPhone(isPhone)
    const qpc = params.get('pc')
    const world = makeWorld(isPhone, { pc: qpc ? qpc.split(',').map(Number) : undefined, rho: params.get('rho') ? Number(params.get('rho')) : undefined })
    const keys = world.keys
    const canvas = document.createElement('canvas')
    canvas.className = 'v6-gl'
    canvas.setAttribute('aria-hidden', 'true')
    host.appendChild(canvas)
    let R: Renderer | null = null
    try {
      R = new Renderer(
        canvas,
        world,
        CHECKS.map((c) => c.pos),
        CHECKS.map((c) => hexRgb(c.hue)),
        isPhone,
      )
      R.resize(W, H)
    } catch (e) {
      console.warn('V06: WebGL2 unavailable, showing the still', e)
      R = null
      setStill(true)
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      if (R) R.lost = true
      setStill(true)
    }
    canvas.addEventListener('webglcontextlost', onLost)

    // ---------------------------------------------------------------- state
    const qL = params.get('L')
    const qDive = params.get('dive')
    const qDu = params.get('du')
    const qHot = params.get('hot')
    const qTo = params.get('to') as Level | null
    const skipIntro = reduce || params.get('intro') === '0' || !R
    const s = {
      mode: 'intro' as Mode,
      t0: performance.now(),
      L: L_CLOSE,
      Lgoal: L_REST,
      fly: { L0: 0, L1: 0, t0: 0, dur: 1 },
      dive: { i: 0, from: keys[2] as Key, t0: 0, dur: 1000, u: 0 },
      ox: 0,
      oy: 0,
      tox: 0,
      toy: 0,
      hot: -1,
      focus: fromIdx >= 0 ? fromIdx : 0,
      pl: new Float32Array(6),
      last: performance.now(),
      readyAt: 0,
      frames: 0,
      level: null as Level | null,
      placesOn: false,
      ui: 0,
      afterRet: qTo && LEVEL_L[qTo] !== undefined ? LEVEL_L[qTo] : null,
    }
    const fr: Frame = { t: 0, beat: 0, wave: 1, pl: s.pl, near: 1, far: 0, expo: 1, sun: world.sun }
    const cam: Cam = camOf(keys[0], W, H)

    const setUiPhase = (n: number) => {
      if (s.ui !== n) {
        s.ui = n
        setUi(n)
      }
    }
    const markReady = (delay = 0) => {
      if (!s.readyAt) s.readyAt = performance.now() + delay
    }
    const fly = (L1: number) => {
      if (s.mode === 'dive' || s.mode === 'ret') return
      s.fly = { L0: s.L, L1, t0: performance.now(), dur: reduce ? 1 : Math.min(2600, 700 + 120 * Math.abs(L1 - s.L)) }
      s.mode = 'fly'
      s.Lgoal = L1
      setUiPhase(2)
    }
    const skip = () => {
      if (s.mode !== 'intro') return
      fly(L_REST)
      s.fly.dur = reduce ? 1 : 1000
    }
    const curKey = (): Key => keyAt(keys, s.L)
    const dive = (i: number) => {
      if (s.mode === 'dive' || s.mode === 'ret' || i < 0 || i > 5) return
      const from = s.mode === 'intro' ? keys[2] : curKey()
      s.dive = { i, from, t0: performance.now(), dur: reduce ? 1 : 950 + 80 * Math.max(0, from.L - L_REST), u: 0 }
      s.mode = 'dive'
      s.focus = i
      setFocus(i)
      setBloom(i)
      root.dataset.diving = '1'
      warm(CHECKS[i].id)
    }
    const setHotI = (i: number) => {
      s.hot = i
      if (i >= 0) {
        s.focus = i
        setFocus(i)
      }
      setHot(i)
    }
    const setFocusI = (i: number) => {
      s.focus = i
      setFocus(i)
    }
    ctl.current = { dive, fly, hot: setHotI, focus: setFocusI }

    if (fromIdx >= 0) {
      s.mode = 'ret'
      s.dive = { i: fromIdx, from: keys[2], t0: performance.now(), dur: reduce ? 1 : 1150, u: 1 }
      setUiPhase(2)
    } else if (params.get('it') !== null) {
      const ms = Number(params.get('it'))
      s.mode = 'freeze'
      s.L = introL(ms)
      setUiPhase(ms >= T_BACK ? 2 : ms > T_OUT - 200 ? 1 : 0)
      markReady(700)
    } else if (qL !== null) {
      s.mode = 'freeze'
      s.L = Number(qL)
      setUiPhase(Number(params.get('ui') ?? 2))
      markReady(700)
    } else if (qDive !== null) {
      s.mode = 'freeze'
      s.dive = { i: Number(qDive), from: keys[2], t0: 0, dur: 1, u: Number(qDu ?? 0.5) }
      setBloom(Number(qDive))
      setUiPhase(2)
      markReady(700)
    } else if (skipIntro) {
      s.mode = 'free'
      s.L = L_REST
      setUiPhase(2)
      markReady(250)
    }
    if (qHot !== null) setHotI(Number(qHot))

    // ---------------------------------------------------------------- frame
    let raf = 0
    let odd = false
    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      if (document.hidden) return
      const dt = Math.min(100, Math.max(0, now - s.last)) || 0
      s.last = now
      let key: Key
      let bloomU = -1
      if (s.mode === 'intro') {
        if (s.frames === 0) s.t0 = now
        const ms = now - s.t0
        s.L = introL(ms)
        if (ms > T_OUT - 200) setUiPhase(Math.max(s.ui, 1))
        if (ms >= T_BACK) {
          s.mode = 'free'
          s.L = L_REST
          s.Lgoal = L_REST
          setUiPhase(2)
          markReady(350)
        }
        key = curKey()
      } else if (s.mode === 'fly') {
        const u = (now - s.fly.t0) / s.fly.dur
        s.L = lerp(s.fly.L0, s.fly.L1, sine(u))
        if (u >= 1) {
          s.mode = 'free'
          s.L = s.fly.L1
          s.Lgoal = s.L
          markReady(300)
        }
        key = curKey()
      } else if (s.mode === 'free') {
        s.L += (s.Lgoal - s.L) * (1 - Math.exp(-dt / 140))
        key = curKey()
      } else if (s.mode === 'dive' || s.mode === 'ret' || (s.mode === 'freeze' && qDive !== null)) {
        let u = s.dive.u
        if (s.mode === 'dive') u = clamp01((now - s.dive.t0) / s.dive.dur)
        if (s.mode === 'ret') u = 1 - clamp01((now - s.dive.t0) / s.dive.dur)
        s.dive.u = u
        const c = CHECKS[s.dive.i]
        key = diveKey(s.dive.from, c.pos, c.out, W, H, u)
        s.L = key.L
        bloomU = s.mode === 'ret' ? clamp01((u - 0.62) / 0.38) : clamp01((u - 0.7) / 0.3)
        if (s.mode === 'dive' && u >= 1 && !root.dataset.left) {
          root.dataset.left = '1'
          navigate(`proto/V06/${c.id}`)
        }
        if (s.mode === 'ret' && u <= 0) {
          s.mode = 'free'
          s.L = L_REST
          s.Lgoal = L_REST
          delete root.dataset.diving
          setBloom(-1)
          if (s.afterRet !== null && Math.abs(s.afterRet - L_REST) > 0.01) fly(s.afterRet)
          else markReady(300)
          key = keys[2]
        }
      } else {
        key = curKey()
      }

      // a little mouse-driven orbit round the rest view
      s.ox += (s.tox - s.ox) * (1 - Math.exp(-dt / 400))
      s.oy += (s.toy - s.oy) * (1 - Math.exp(-dt / 400))
      const ow = s.mode === 'free' || s.mode === 'fly' ? Math.exp(-(((s.L - L_REST) / 1.3) ** 2)) : 0
      if (ow > 0.01 && !reduce) {
        const rr = norm(cross([0, 1, 0], key.dir))
        key = { ...key, dir: norm(add(add(key.dir, mul(rr, s.ox * 0.06 * ow)), [0, -s.oy * 0.04 * ow, 0])) }
      }
      camOf(key, W, H, cam)

      // places light up; the hot one most
      const placeW = 1 - smooth((s.L - (L_REST + 0.9)) / 1.4)
      for (let i = 0; i < 6; i++) {
        let target = (i === s.hot ? 2.1 : i === s.focus && s.ui >= 2 ? 1.15 : 0.62) * placeW
        if (s.mode === 'dive' || s.mode === 'ret') target = i === s.dive.i ? 2.3 : 0.15
        if (s.mode === 'intro') target = 0.62 * placeW * smooth((now - s.t0 - T_SPACE) / 1500 + (s.L < L_BODY ? 1 : 0))
        s.pl[i] += (target - s.pl[i]) * (1 - Math.exp(-dt / 120))
        if (!Number.isFinite(s.pl[i])) s.pl[i] = target
      }
      const t = now / 1000
      fr.t = t
      fr.beat = reduce ? 0.4 : beatAt(t)
      fr.wave = reduce ? 1 : Math.min(1, ((t % 1.12) / 1.12) * 1.6)
      fr.near = 1 - smooth((s.L - LN_NEAR0) / (LN_NEAR1 - LN_NEAR0))
      fr.far = smooth((s.L - LN_FAR0) / (LN_FAR1 - LN_FAR0))
      fr.sun = sunAt(world, s.L)
      const settled = s.mode === 'free' && Math.abs(s.Lgoal - s.L) < 1e-3 && Math.abs(s.tox - s.ox) < 1e-3 && Math.abs(s.toy - s.oy) < 1e-3
      odd = !odd
      if (R && !R.lost && (!settled || odd || s.frames < 4)) {
        R.draw(cam, fr)
        if (s.frames > 2) R.adapt(settled ? dt / 2 : dt)
      }
      s.frames++

      // DOM that follows the camera
      const on = (s.mode === 'free' || s.mode === 'fly' || s.mode === 'freeze') && s.L < L_REST + 1.1 && s.ui >= 2
      if (on !== s.placesOn) {
        s.placesOn = on
        setPlacesOn(on)
      }
      for (let i = 0; i < 6; i++) {
        const el = placeRefs.current[i]
        if (!el) continue
        const [x, y, z] = project(cam, CHECKS[i].pos as V3)
        const vis = z > 0.05 && x > -40 && x < W + 40 && y > -40 && y < H + 40
        el.style.transform = vis ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)` : 'translate3d(-200px, -200px, 0)'
      }
      if (markRef.current && s.mode !== 'dive') markRef.current.style.top = `${(railPos(s.L) * 100).toFixed(2)}%`
      const lv = s.mode === 'dive' ? null : levelOf(s.L)
      if (lv !== s.level) {
        s.level = lv
        setLevel(lv)
      }
      if (bloomRef.current) {
        const b = bloomRef.current
        if (bloomU < 0) b.style.opacity = '0'
        else {
          const [x, y] = project(cam, CHECKS[s.dive.i].pos as V3)
          const e = easeIO(bloomU)
          b.style.opacity = '1'
          b.style.clipPath = `circle(${(e * 110).toFixed(2)}% at ${((x / W) * 100).toFixed(1)}% ${((y / H) * 100).toFixed(1)}%)`
          b.style.setProperty('--b', e.toFixed(3))
        }
      }
      if (s.readyAt && now >= s.readyAt && root.dataset.ready !== '1') {
        root.dataset.ready = '1'
        setReady(true)
      }
    }
    raf = requestAnimationFrame(step)

    // ---------------------------------------------------------------- input
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (s.mode === 'intro') return skip()
      if (s.mode === 'dive' || s.mode === 'ret' || s.mode === 'freeze') return
      const k = e.deltaMode === 1 ? 0.06 : e.deltaMode === 2 ? 1 : 0.0024
      if (s.mode === 'fly') s.mode = 'free'
      s.Lgoal = Math.min(L_SPACE, Math.max(L_CLOSE, s.Lgoal + e.deltaY * k))
      touched.current = performance.now()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (s.mode === 'intro') {
        if (e.key !== 'Tab') e.preventDefault()
        return skip()
      }
      if (s.mode === 'dive' || s.mode === 'ret') return
      touched.current = performance.now()
      const k = e.key
      if (k >= '1' && k <= '6') return dive(Number(k) - 1)
      const L = s.mode === 'fly' ? s.fly.L1 : s.Lgoal
      if (k === 'ArrowUp' || k === 'PageUp' || k === '-') {
        e.preventDefault()
        const n = STOPS.find((x) => x > L + 0.05)
        if (n !== undefined) fly(n)
      } else if (k === 'ArrowDown' || k === 'PageDown' || k === '+' || k === '=') {
        e.preventDefault()
        const n = [...STOPS].reverse().find((x) => x < L - 0.05)
        if (n !== undefined) fly(n)
      } else if (k === 'Escape') fly(L_REST)
    }
    const pts = new Map<number, [number, number]>()
    let pinch0 = 0
    let pinchL = 0
    const onDown = (e: PointerEvent) => {
      if (s.mode === 'intro') {
        skip()
        return
      }
      touched.current = performance.now()
      if (e.pointerType === 'touch') {
        pts.set(e.pointerId, [e.clientX, e.clientY])
        if (pts.size === 2) {
          const [a, b] = [...pts.values()]
          pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1])
          pinchL = s.Lgoal
        }
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        s.tox = (e.clientX / W - 0.5) * 2
        s.toy = (e.clientY / H - 0.5) * 2
      } else if (pts.has(e.pointerId)) {
        pts.set(e.pointerId, [e.clientX, e.clientY])
        if (pts.size === 2 && pinch0 > 0 && s.mode !== 'dive' && s.mode !== 'ret') {
          const [a, b] = [...pts.values()]
          const d = Math.hypot(a[0] - b[0], a[1] - b[1])
          if (s.mode === 'fly') s.mode = 'free'
          s.Lgoal = Math.min(L_SPACE, Math.max(L_CLOSE, pinchL - Math.log(d / pinch0) * 2.2))
        }
      }
    }
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch0 = 0
    }
    const onResize = () => {
      W = root.clientWidth || innerWidth
      H = root.clientHeight || innerHeight
      R?.resize(W, H)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    root.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      root.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('webglcontextlost', onLost)
      R?.dispose()
      canvas.remove()
      ctl.current = null
    }
    // the scene is built once per visit; params are read at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // after a quiet spell the focus walks through the six checks, so every real specimen gets its turn
  useEffect(() => {
    if (!ready) return
    touched.current = performance.now()
    const w = window.setTimeout(() => warm(), 1200)
    const id = window.setInterval(() => {
      if (performance.now() - touched.current < 9000 || document.hidden) return
      if (!ctl.current || hotRef.current >= 0) return
      ctl.current.focus((focusRef.current + 1) % 6)
    }, 4800)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(w)
    }
  }, [ready])

  const onHover = useCallback((i: number) => {
    touched.current = performance.now()
    ctl.current?.hot(i)
  }, [])
  const onLeave = useCallback(() => ctl.current?.hot(-1), [])
  const go = useCallback((i: number) => ctl.current?.dive(i), [])
  const c = CHECKS[focus]
  const bc = bloom >= 0 ? CHECKS[bloom] : null

  return (
    <div className={`v6 v6-home${phone ? ' is-phone' : ''}`} ref={rootRef} data-proto="V06" data-ui={ui} data-state="idle" data-ready={ready ? '1' : undefined}>
      <div className="v6-host" ref={hostRef}>
        {still && <img className="v6-still" src={`${BASE}themes/V06/${phone ? 'still_390' : 'still_1440'}.jpg`} alt="" />}
      </div>
      <div className="v6-shade" aria-hidden="true" />

      <header className="v6-head">
        <h1 className="v6-title">
          Super<em>Humans</em>
        </h1>
        <p className="v6-line">{SITE_LINE}</p>
      </header>

      <div className={`v6-places${placesOn ? ' is-on' : ''}`} inert={!placesOn}>
        {CHECKS.map((k, i) => (
          <button
            key={k.id}
            type="button"
            ref={(el) => {
              placeRefs.current[i] = el
            }}
            className={`v6-place${hot === i ? ' is-hot' : ''}${focus === i ? ' is-focus' : ''}`}
            style={{ ['--h' as string]: k.hue }}
            aria-label={`${k.name}: ${k.site}. Go inside`}
            data-qa={i === 0 ? 'primary' : undefined}
            onPointerEnter={() => onHover(i)}
            onPointerLeave={onLeave}
            onFocus={() => onHover(i)}
            onBlur={onLeave}
            onClick={() => go(i)}
          >
            <span className="v6-place-ring" aria-hidden="true" />
            <span className="v6-place-tag" aria-hidden="true">
              {k.name}
            </span>
          </button>
        ))}
      </div>

      <section className="v6-focus" style={{ ['--h' as string]: c.hue }} aria-live="polite" onPointerEnter={() => (touched.current = performance.now())}>
        <button type="button" className="v6-focus-img" onClick={() => go(focus)} aria-label={`Go inside ${c.name}`}>
          {CHECKS.map((k, i) => (
            <img key={k.id} src={phone ? k.img : k.imgTall} alt="" className={i === focus ? 'is-on' : undefined} />
          ))}
        </button>
        <div className="v6-focus-text">
          <p className="v6-focus-kicker">
            <b>{c.n}</b> {c.site}
          </p>
          <h2 className="v6-focus-name">{c.name}</h2>
          <p className="v6-focus-sentence">{c.sentence}</p>
          <button type="button" className="v6-go" onClick={() => go(focus)}>
            Go inside
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      <Rail
        markRef={markRef}
        level={level}
        focus={focus}
        onLevel={(l) => {
          touched.current = performance.now()
          setZoomTo((z) => ({ l, n: z.n + 1 }))
          ctl.current?.fly(LEVEL_L[l])
        }}
        onPlace={go}
        onHover={onHover}
      />

      <p className="v6-ai">AI-generated imagery</p>
      <p className="v6-sr" aria-live="polite" data-n={zoomTo.n}>
        {zoomTo.l ? `Zooming to ${zoomTo.l}` : ''}
      </p>

      <div className="v6-bloom" ref={bloomRef} aria-hidden="true" style={bc ? { ['--h' as string]: bc.hue } : undefined}>
        {bc && <img src={phone ? bc.imgTall : bc.img} alt="" />}
      </div>
    </div>
  )
}

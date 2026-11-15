// Home: the whole plate. Six windows are cut through the suit; pressing one zooms the drawing into it.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { navigate } from '../../lib/route'
import { CHECKS, SITE_LINE, checkById, easeInOut, isUpright, restVB, vbString, windowBox, windowVB, type Check } from './data'
import { loadModule, preloadMoment } from './load'
import { animateVB, prefersReducedMotion, startLife, useWindowSize } from './motion'
import { Backdrop, Suit } from './Suit'

/** The draw-on ends at about 1.6 s (v12.css); the settled frame is the whole plate, every window lit. */
const INTRO_MS = 1700
/** Dev only: `?slow=4` plays the move four times slower, so it can be filmed frame by frame. */
const SLOW = Math.max(1, Number(new URLSearchParams(location.hash.split('?')[1] ?? '').get('slow')) || 1)
const MOVE_MS = 1000 * SLOW
const LAND_MS = 250 * SLOW

/** The nearest window in the direction of an arrow key. */
function neighbour(from: Check, key: string, upright: boolean): Check {
  const dirv = key === 'ArrowRight' ? [1, 0] : key === 'ArrowLeft' ? [-1, 0] : key === 'ArrowDown' ? [0, 1] : [0, -1]
  const a = windowBox(from, upright)
  const cx = a[0] + a[2] / 2
  const cy = a[1] + a[3] / 2
  let best: Check | null = null
  let score = Infinity
  for (const c of CHECKS) {
    if (c.id === from.id) continue
    const b = windowBox(c, upright)
    const dx = b[0] + b[2] / 2 - cx
    const dy = b[1] + b[3] / 2 - cy
    const along = dx * dirv[0] + dy * dirv[1]
    if (along < 20) continue
    const acrossD = Math.abs(dx * dirv[1]) + Math.abs(dy * dirv[0])
    const s = along + acrossD * 1.6
    if (s < score) {
      score = s
      best = c
    }
  }
  if (best) return best
  const i = CHECKS.findIndex((c) => c.id === from.id)
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1
  return CHECKS[(i + step + CHECKS.length) % CHECKS.length]
}

export default function Home({ from }: { from: string | null }) {
  const size = useWindowSize()
  const upright = isUpright(size.w, size.h)
  const rest = useMemo(() => restVB(size.w, size.h), [size.w, size.h])
  const reduce = useMemo(prefersReducedMotion, [])
  const cameFrom = useMemo(() => (from ? checkById(from) : undefined), [from])
  const intro = !cameFrom && !reduce

  const [sel, setSel] = useState<string>(cameFrom?.id ?? 'tracktrace')
  const [hot, setHot] = useState(false)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const root = useRef<HTMLDivElement>(null)
  const suitRef = useRef<SVGSVGElement>(null)
  const backRef = useRef<SVGSVGElement>(null)
  const cancelMove = useRef<(() => void) | null>(null)
  const stopLife = useRef<(() => void) | null>(null)
  const busy = useRef(false)
  const downSel = useRef(sel)
  const selRef = useRef(sel)
  selRef.current = sel

  // the real specimen pictures must be in before the plate counts as settled
  useEffect(() => {
    let alive = true
    let left = CHECKS.length
    const done = () => {
      left -= 1
      if (left <= 0 && alive) setLoaded(true)
    }
    for (const c of CHECKS) {
      const im = new Image()
      im.onload = done
      im.onerror = done
      im.src = c.img
    }
    const t = window.setTimeout(() => alive && setLoaded(true), 4000)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [])

  // coming back from a window, the view pulls out of it
  useLayoutEffect(() => {
    if (!cameFrom || reduce) return
    const a = windowVB(cameFrom, window.innerWidth, window.innerHeight)
    const b = restVB(window.innerWidth, window.innerHeight)
    const s = vbString(a)
    suitRef.current?.setAttribute('viewBox', s)
    backRef.current?.setAttribute('viewBox', s)
    busy.current = true
    cancelMove.current = animateVB([suitRef.current, backRef.current], a, b, 1050, easeInOut, () => {
      busy.current = false
      setSettled(true)
    })
    return () => cancelMove.current?.()
  }, [cameFrom, reduce])

  useEffect(() => {
    if (cameFrom && !reduce) return
    const t = window.setTimeout(() => setSettled(true), intro ? INTRO_MS : 60)
    return () => window.clearTimeout(t)
  }, [cameFrom, reduce, intro])

  useEffect(() => {
    if (reduce || !settled || !root.current) return
    stopLife.current = startLife(root.current, upright)
    return () => stopLife.current?.()
  }, [reduce, upright, settled])

  const enter = useCallback(
    (c: Check) => {
      if (busy.current) return
      busy.current = true
      setSel(c.id)
      setHot(false)
      setLeaving(c.id)
      const go = () => navigate(`proto/V12/${c.id}`)
      if (reduce) {
        go()
        return
      }
      stopLife.current?.()
      const w = window.innerWidth
      const h = window.innerHeight
      // the page code is fetched ahead; the move starts once it is in (or after 500 ms at most),
      // and the route changes only when it is in, so the zoom never ends on a blank screen
      const page = loadModule()
      const stage = preloadMoment(c.id)
      let started = false
      let alive = true
      let stopMove: (() => void) | null = null
      const el = root.current
      const start = () => {
        if (started || !alive) return
        started = true
        stopMove = animateVB(
          [suitRef.current, backRef.current],
          restVB(w, h),
          windowVB(c, w, h),
          MOVE_MS,
          easeInOut,
          () => {
            const cap = new Promise((r) => window.setTimeout(r, 600))
            const land = () => alive && go()
            page.then(() => Promise.race([stage, cap])).then(land, land)
          },
          (t) => {
            if (!el) return
            if (t >= 0.55) el.dataset.bandfade = '1'
            if (t >= 1 - LAND_MS / MOVE_MS) el.dataset.landing = '1'
          },
        )
      }
      page.then(start, start)
      const t = window.setTimeout(start, 500)
      cancelMove.current = () => {
        alive = false
        window.clearTimeout(t)
        stopMove?.()
      }
    },
    [reduce],
  )
  useEffect(() => () => cancelMove.current?.(), [])
  // the module page and the window in focus load once the plate has settled
  useEffect(() => {
    if (!settled) return
    void loadModule().catch(() => null)
  }, [settled])
  useEffect(() => {
    if (!settled) return
    const t = window.setTimeout(() => void preloadMoment(sel), 150)
    return () => window.clearTimeout(t)
  }, [settled, sel])

  const onPress = useCallback(
    (c: Check, e: MouseEvent | KeyboardEvent) => {
      e.preventDefault()
      // a phone has no hover: the first tap brings a window into focus, the second goes in
      const touch = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches
      if (touch && e.type === 'click' && downSel.current !== c.id) {
        setSel(c.id)
        setHot(true)
        return
      }
      enter(c)
    },
    [enter],
  )
  const onPoint = useCallback((id: string, on: boolean) => {
    if (busy.current) return
    if (on) setSel(id)
    setHot(on)
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.key.startsWith('Arrow') || busy.current) return
    const cur = checkById(selRef.current) ?? CHECKS[0]
    const next = neighbour(cur, e.key, upright)
    e.preventDefault()
    root.current?.querySelector<SVGAElement>(`.v12-svg-home [data-win="${next.id}"]`)?.focus({ preventScroll: true })
  }

  const check = checkById(sel) ?? CHECKS[0]
  const ready = settled && loaded
  const vb = useMemo(() => vbString(rest), [rest])
  // the names in the windows never fall under 13 px on screen
  const bandFs = upright ? 11.5 / (size.w / rest[2]) : Math.max(17, 13 / (size.w / rest[2]))

  return (
    <div
      ref={root}
      className="v12 v12-home"
      data-proto="V12"
      data-ready={ready ? '1' : undefined}
      data-state="idle"
      data-intro={intro ? '1' : '0'}
      data-return={cameFrom ? '1' : undefined}
      data-dim={hot && !leaving ? '1' : undefined}
      data-leaving={leaving ?? undefined}
      data-upright={upright ? '1' : undefined}
      style={{ ['--hue' as string]: check.hue, ['--band-fs' as string]: `${bandFs.toFixed(2)}px` }}
      onKeyDown={onKeyDown}
      onPointerDownCapture={() => {
        downSel.current = selRef.current
      }}
    >
      <div className="v12-ground" aria-hidden="true" />
      <div className="v12-parallax" aria-hidden="true">
        <Backdrop viewBox={vb} svgRef={backRef} upright={upright} />
      </div>
      <div className="v12-stage" data-qa="hero">
        <Suit mode="home" upright={upright} viewBox={vb} svgRef={suitRef} active={sel} onPress={onPress} onPoint={onPoint} title="An astronaut, cut away: six windows into the body, one health check in each" />
      </div>

      <header className="v12-title">
        <h1 aria-label="SuperHumans">
          <span aria-hidden="true">
            Super<b>Humans</b>
          </span>
        </h1>
        <p className="v12-site">{SITE_LINE}</p>
      </header>

      <section className="v12-focus-block" aria-live="polite">
        <div className="v12-fb" key={check.id}>
          <p className="v12-fb-tag">
            <b>{check.n}</b>
            <i />
            {check.site}
          </p>
          <h2 className="v12-fb-name">{check.name}</h2>
          <p className="v12-fb-sentence">{check.sentence}</p>
        </div>
        <button type="button" className="v12-enter" onClick={() => enter(check)} onPointerEnter={() => void preloadMoment(check.id)} onFocus={() => void preloadMoment(check.id)}>
          Open {check.name}
          <ArrowRight weight="bold" />
        </button>
      </section>

      <p className="v12-aimark">AI-generated imagery · suit drawn by code</p>
    </div>
  )
}

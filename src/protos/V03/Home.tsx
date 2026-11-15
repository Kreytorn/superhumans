// Home: the whole plate. Six rooms are cut open and lit; pressing one zooms the drawing into it.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { navigate } from '../../lib/route'
import { CHECKS, SITE_LINE, checkById, easeInOut, isUpright, restVB, roomVB, vbString, type Check } from './data'
import { loadModule, preloadMoment } from './load'
import { animateVB, prefersReducedMotion, startLife, useWindowSize } from './motion'
import { Backdrop, Ship } from './Ship'

/** The draw-on ends at about 1.5 s (v03.css); the settled frame is the full plate. */
const INTRO_MS = 1800
/** The move into a room, and its last part, in which the plate fades and leaves the room's screen alone. */
const MOVE_MS = 1000
const LAND_MS = 250

/** The nearest room in the direction of an arrow key (side-on plate). */
function neighbour(from: Check, key: string): Check {
  const dir = key === 'ArrowRight' ? [1, 0] : key === 'ArrowLeft' ? [-1, 0] : key === 'ArrowDown' ? [0, 1] : [0, -1]
  const cx = from.box[0] + from.box[2] / 2
  const cy = from.box[1] + from.box[3] / 2
  let best: Check | null = null
  let score = Infinity
  for (const c of CHECKS) {
    if (c.id === from.id) continue
    const dx = c.box[0] + c.box[2] / 2 - cx
    const dy = c.box[1] + c.box[3] / 2 - cy
    const along = dx * dir[0] + dy * dir[1]
    if (along < 20) continue
    const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0])
    const s = along + across * 1.6
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
  const shipRef = useRef<SVGSVGElement>(null)
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

  // entrance: the ship draws itself; or, coming back from a room, the view pulls out of it
  useLayoutEffect(() => {
    if (!cameFrom || reduce) return
    const a = roomVB(cameFrom, window.innerWidth, window.innerHeight)
    const b = restVB(window.innerWidth, window.innerHeight)
    const s = vbString(a)
    shipRef.current?.setAttribute('viewBox', s)
    backRef.current?.setAttribute('viewBox', s)
    busy.current = true
    cancelMove.current = animateVB([shipRef.current, backRef.current], a, b, 1050, easeInOut, () => {
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

  // the plate's life (rays, scans, the ring) starts once the drawing has settled
  useEffect(() => {
    if (reduce || !settled || !root.current) return
    stopLife.current = startLife(root.current)
    return () => stopLife.current?.()
  }, [reduce, upright, settled])

  const enter = useCallback(
    (c: Check) => {
      if (busy.current) return
      busy.current = true
      setSel(c.id)
      setHot(false)
      setLeaving(c.id)
      const go = () => navigate(`proto/V03/${c.id}`)
      if (reduce) {
        go()
        return
      }
      stopLife.current?.()
      const w = window.innerWidth
      const h = window.innerHeight
      // the page code is fetched ahead (below); the move starts once it is in, or after 600 ms at most,
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
          [shipRef.current, backRef.current],
          restVB(w, h),
          roomVB(c, w, h),
          MOVE_MS,
          easeInOut,
          () => {
            const cap = new Promise((r) => window.setTimeout(r, 700))
            const land = () => alive && go()
            page.then(() => Promise.race([stage, cap])).then(land, land)
          },
          (t) => {
            // the nameplates stay until 60% of the move, then the room's lights go down round its screen;
            // over the last 250 ms everything but the screen fades out and the page takes over from it
            if (!el) return
            if (t >= 0.6) el.dataset.sillfade = '1'
            if (t >= 1 - LAND_MS / MOVE_MS) el.dataset.landing = '1'
          },
        )
      }
      page.then(start, start)
      const t = window.setTimeout(start, 600)
      cancelMove.current = () => {
        alive = false
        window.clearTimeout(t)
        stopMove?.()
      }
    },
    [reduce],
  )
  useEffect(() => () => cancelMove.current?.(), [])
  // have the room page and the room in focus ready once the plate has settled, so the zoom lands without a blank beat
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
      // a phone has no hover: the first tap brings a room into focus, the second goes in
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
    let key = e.key
    if (upright) key = { ArrowUp: 'ArrowLeft', ArrowDown: 'ArrowRight', ArrowLeft: 'ArrowDown', ArrowRight: 'ArrowUp' }[key] ?? key
    const next = neighbour(cur, key)
    e.preventDefault()
    root.current?.querySelector<SVGAElement>(`.v03-svg-home [data-room="${next.id}"]`)?.focus({ preventScroll: true })
  }

  const check = checkById(sel) ?? CHECKS[0]
  const ready = settled && loaded
  const vb = useMemo(() => vbString(rest), [rest])
  // the nameplates never fall under 13 px on screen: in a short window the plate is drawn smaller, so the type grows in plate units
  const sillFs = Math.max(18, 13 / (size.w / rest[2]))

  return (
    <div
      ref={root}
      className="v03 v03-home"
      data-proto="V03"
      data-ready={ready ? '1' : undefined}
      data-state="idle"
      data-intro={intro ? '1' : '0'}
      data-return={cameFrom ? '1' : undefined}
      data-dim={hot && !leaving ? '1' : undefined}
      data-leaving={leaving ?? undefined}
      data-upright={upright ? '1' : undefined}
      style={{ ['--hue' as string]: check.hue, ['--sill-fs' as string]: `${sillFs.toFixed(2)}px` }}
      onKeyDown={onKeyDown}
      onPointerDownCapture={() => {
        downSel.current = selRef.current
      }}
    >
      <div className="v03-ground" aria-hidden="true" />
      <div className="v03-parallax" aria-hidden="true">
        <Backdrop viewBox={vb} svgRef={backRef} upright={upright} />
      </div>
      <div className="v03-stage" data-qa="hero">
        <Ship mode="home" upright={upright} viewBox={vb} svgRef={shipRef} active={sel} onPress={onPress} onPoint={onPoint} title="The ship, cut open: six rooms, one health check in each" />
      </div>

      <header className="v03-title">
        <h1 aria-label="SuperHumans">
          <span className="v03-t-line" aria-hidden="true">
            SUPER
          </span>
          <span className="v03-t-fill" aria-hidden="true">
            HUMANS
          </span>
        </h1>
        <p className="v03-site">{SITE_LINE}</p>
      </header>

      <section className="v03-readout" aria-live="polite">
        <div className="v03-ro" key={check.id}>
          <p className="v03-ro-tag">
            <b>{check.n}</b>
            <i />
            {check.room}
          </p>
          <h2 className="v03-ro-name">{check.name}</h2>
          <p className="v03-ro-sentence">{check.sentence}</p>
        </div>
        <div className="v03-ro-act">
          <button type="button" className="v03-enter" onClick={() => enter(check)} onPointerEnter={() => void preloadMoment(check.id)} onFocus={() => void preloadMoment(check.id)}>
            Enter the {check.room.toLowerCase()}
            <ArrowRight weight="bold" />
          </button>
        </div>
      </section>

      <p className="v03-aimark">AI-generated imagery · ship drawn by code</p>
    </div>
  )
}

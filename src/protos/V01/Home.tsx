// The home: the hall fills the screen. Each gate is a real button that follows its slab on screen.
import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../../lib/route'
import { CHECKS, SITE_LINE } from './data'
import { Hall } from './hall'
import { transit, type Flood } from './transit'

// fetch a gate's page code while the visitor is still looking at the gate, so the light lets go on time
const preloaded = new Set<string>()
function preload(id: string) {
  if (preloaded.has(id)) return
  preloaded.add(id)
  const load: Record<string, () => Promise<unknown>> = {
    page: () => import('./Module'),
    tracktrace: () => import('../../moments/tracktrace'),
    bubblegrade: () => import('../../moments/bubblegrade'),
    veinsqueeze: () => import('../../moments/veinsqueeze'),
    braindrift: () => import('../../moments/braindrift'),
    garnmeter: () => import('../../moments/garnmeter'),
  }
  load[id]?.().catch(() => preloaded.delete(id))
}

const smooth = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

export default function Home({ flood }: { flood: Flood }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const hallRef = useRef<Hall | null>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const lastRects = useRef(new Float32Array(24).fill(-1))
  const [still, setStill] = useState(false)
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<number | null>(null)
  const [tour, setTour] = useState<number | null>(null)
  const [leaving, setLeaving] = useState<number | null>(null)
  const leavingRef = useRef<number | null>(null)
  // the gate we are coming back from (read once, so a double-run effect in dev still sees it)
  const fromRef = useRef(transit.from)
  const reduced = useRef(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)

  const focus = leaving ?? user ?? tour

  // the scene
  useEffect(() => {
    const stage = stageRef.current
    const root = rootRef.current
    if (!stage || !root) return
    const from = fromRef.current
    transit.from = undefined
    let hall: Hall | null = null
    const onRects = (r: Float32Array) => {
      const last = lastRects.current
      for (let i = 0; i < 6; i++) {
        const b = btnRefs.current[i]
        if (!b) continue
        const o = i * 4
        if (Math.abs(r[o] - last[o]) < 0.2 && Math.abs(r[o + 1] - last[o + 1]) < 0.2 && Math.abs(r[o + 2] - last[o + 2]) < 0.2 && Math.abs(r[o + 3] - last[o + 3]) < 0.2) continue
        last[o] = r[o]
        last[o + 1] = r[o + 1]
        last[o + 2] = r[o + 2]
        last[o + 3] = r[o + 3]
        b.style.transform = `translate3d(${r[o].toFixed(1)}px, ${r[o + 1].toFixed(1)}px, 0)`
        b.style.width = `${r[o + 2].toFixed(1)}px`
        b.style.height = `${r[o + 3].toFixed(1)}px`
        b.style.setProperty('--fs', `${Math.min(25, Math.max(10.5, r[o + 2] * 0.118)).toFixed(1)}px`)
      }
    }
    try {
      hall = new Hall({
        container: stage,
        checks: CHECKS,
        reduced: reduced.current,
        from,
        onRects,
        onReady: () => setReady(true),
        onLost: () => setStill(true),
      })
    } catch {
      setStill(true)
      setReady(true)
    }
    hallRef.current = hall
    if (import.meta.env.DEV) {
      // dev check only: the film script holds the glide at chosen points to look at it frame by frame
      ;(window as unknown as { __v01?: unknown }).__v01 = {
        pose: (i: number, t: number) => {
          root.classList.add('is-leaving')
          hall?.pose(i, t)
          flood.set(CHECKS[i].hue, smooth(0.52, 0.98, t))
        },
      }
    }
    if (from !== undefined) flood.clear(900)
    const ro = new ResizeObserver(() => hall?.resize())
    ro.observe(stage)
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      hall?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    root.addEventListener('pointermove', onMove)
    return () => {
      ro.disconnect()
      root.removeEventListener('pointermove', onMove)
      hall?.dispose()
      hallRef.current = null
      lastRects.current.fill(-1)
    }
  }, [flood])

  // when nobody points at a gate, the hall shows them one by one
  useEffect(() => {
    if (reduced.current || user !== null || leaving !== null || !ready) return
    let i = tour
    const id = window.setTimeout(
      () => {
        i = i === null ? 0 : i + 1
        setTour(i > 5 ? null : i)
      },
      tour === null ? 6500 : 3600,
    )
    return () => window.clearTimeout(id)
  }, [tour, user, leaving, ready])

  useEffect(() => {
    hallRef.current?.setFocus(focus)
  }, [focus])

  useEffect(() => {
    if (ready) preload('page')
  }, [ready])
  useEffect(() => {
    if (user !== null) preload(CHECKS[user].id)
  }, [user])

  const enter = useCallback(
    (i: number) => {
      if (leavingRef.current !== null) return
      leavingRef.current = i
      setLeaving(i)
      const c = CHECKS[i]
      preload('page')
      preload(c.id)
      const go = () => navigate(`proto/V01/${c.id}`)
      const hall = hallRef.current
      if (!hall || reduced.current) {
        flood.set(c.hue, 1, 0)
        go()
        return
      }
      hall.flyTo(i, (t) => flood.set(c.hue, smooth(0.52, 0.98, t)), go)
    },
    [flood],
  )

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const phone = window.innerWidth / window.innerHeight < 0.8
    let j = -1
    if (e.key === 'ArrowRight') j = (i + 1) % 6
    else if (e.key === 'ArrowLeft') j = (i + 5) % 6
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') j = phone ? (i + 3) % 6 : e.key === 'ArrowUp' ? (i + 5) % 6 : (i + 1) % 6
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = 5
    if (j < 0) return
    e.preventDefault()
    btnRefs.current[j]?.focus()
  }

  const now = focus === null ? null : CHECKS[focus]
  return (
    <div
      ref={rootRef}
      className={`v01 v01-home${still ? ' is-still' : ''}${leaving !== null ? ' is-leaving' : ''}${ready ? ' is-ready' : ''}`}
      data-proto="V01"
      data-ready={ready ? '1' : undefined}
      data-focus={focus ?? undefined}
      style={{ ['--hue' as string]: now?.hue ?? '#cfd8ff' }}
    >
      <div className="v01-stage" ref={stageRef} />
      <h1 className="v01-name">SuperHumans</h1>

      <nav className="v01-gates" aria-label="The six checks">
        {CHECKS.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => {
              btnRefs.current[i] = el
            }}
            type="button"
            className={`v01-gate${focus === i ? ' is-on' : focus !== null ? ' is-dim' : ''}`}
            style={{ ['--hue' as string]: c.hue }}
            data-qa={i === 0 ? 'primary' : undefined}
            aria-label={`${c.name}: ${c.sentence}`}
            onClick={() => enter(i)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setUser(i)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setUser((u) => (u === i && document.activeElement !== e.currentTarget ? null : u))}
            onFocus={() => setUser(i)}
            onBlur={() => setUser((u) => (u === i ? null : u))}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={`v01-gate-img${c.invert ? ' is-invert' : ''}`} style={{ backgroundImage: `url(${c.img})`, backgroundPosition: `${c.at[0] * 100}% ${c.at[1] * 100}%` }} aria-hidden="true" />
            <span className="v01-gate-label" aria-hidden="true">
              <i>{c.n}</i>
              <b>{c.name}</b>
            </span>
          </button>
        ))}
      </nav>

      <div className="v01-readout" aria-live="polite">
        {now ? (
          <div className="v01-now" key={now.id}>
            <p className="v01-now-name">
              <i>{now.n}</i>
              {now.name}
            </p>
            <p className="v01-now-sentence">{now.sentence}</p>
          </div>
        ) : (
          <div className="v01-now" key="site">
            <p className="v01-site">{SITE_LINE}</p>
            <p className="v01-hint">Choose a gate</p>
          </div>
        )}
      </div>

      <p className="v01-aimark">AI-generated imagery</p>
    </div>
  )
}

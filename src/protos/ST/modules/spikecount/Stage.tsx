// Station, spikecount: the working check (the panel body).
// The real microscope field, large, in a dark well. One press runs both real models in this browser: the
// outliner draws every red cell, the grader names its shape. A phone replays their stored output (same models)
// and says so. Then a scan line crosses the photo from top to bottom, the model's own cell order, and each
// outline lights up as the line reaches it: amber for the cells the grader calls spiky (grades 1-4), a cold
// hairline for the rest, dashed where the photo's edge cuts a cell. The share of spiky cells counts up with the
// outlines and lands on the model's number. At rest a loupe shows one cell with the grader's call; point at,
// tap or arrow through any other. Numbers come only from the engine at run time (work/Web/models/spikecount.md).
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import * as spike from '../../../../engine/spikecount'
import type { SpikeCell, SpikeResult } from '../../../../engine/spikecount'
import { pickAct, useStageControls } from '../kit'
import type { StageProps } from '../types'
import { FIELD, FIELD_URL, preloadField } from './field'
import './stage.css'

preloadField()

/** The scan line's trip down the photo, and one outline drawing itself. */
const SWEEP_MS = 2800
const TRACE_MS = 520
/** A live run that takes longer than this falls back to the stored result. */
const LIVE_LIMIT_MS = 20000
/** So does a press while the models (45.7 MB) are still coming in after this long (a slow connection, a busy
 *  laptop): the stored result is shown at once, and the models go on loading for the next press. */
const LOAD_LIMIT_MS = 12000
/** The field photo is N x N pixels (the engine's own size, also given in every result). */
const N = spike.W

type Phase = 'idle' | 'load' | 'read' | 'draw' | 'result' | 'error'

const SHAPE: Record<spike.ClassName, string> = {
  Disc: 'Normal disc',
  E1: 'Spiky, grade 1',
  E2: 'Spiky, grade 2',
  E3: 'Spiky, grade 3',
  E4: 'Spiky, grade 4',
  Cup: 'Cup-shaped',
}

const isSpiky = (c: SpikeCell) => c.cls >= 1 && c.cls <= 4
const pts = (p: [number, number][]) => p.map((q) => `${q[0]},${q[1]}`).join(' ')
const f1 = (n: number) => n.toFixed(1)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const sleep = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms))

function withLimit<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((ok, no) => {
    const t = window.setTimeout(() => no(new Error('timeout')), ms)
    p.then(
      (v) => {
        window.clearTimeout(t)
        ok(v)
      },
      (e: unknown) => {
        window.clearTimeout(t)
        no(e)
      },
    )
  })
}

/** Phones replay the stored result (the engine says the 45.7 MB of models are too heavy for them). */
function phoneLike() {
  if (typeof window === 'undefined') return true
  return window.innerWidth < 760 || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)
}

function reducedMotion(el: Element | null) {
  const m = el?.closest('.st')?.getAttribute('data-motion')
  if (m) return m === 'reduced'
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function inPolygon(x: number, y: number, p: [number, number][]) {
  let inside = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i]
    const [xj, yj] = p[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

interface Lit {
  c: SpikeCell
  d: string
  /** when the scan line reaches the cell's top edge, ms after the sweep starts */
  at: number
}

/** Where the loupe for one cell goes, in field pixels. */
function loupeFor(c: SpikeCell) {
  const [cx, cy] = c.center
  const rc = c.polygon.length ? Math.max(...c.polygon.map((p) => Math.hypot(p[0] - cx, p[1] - cy))) : 24
  const R = Math.round(N * 0.165)
  const side = cx < N / 2 ? 1 : -1
  const lx = clamp(cx + side * (rc + 30 + R), R + 10, N - R - 10)
  const ly = clamp(cy - 12, R + 10, N - R - 10)
  const a = Math.atan2(ly - cy, lx - cx)
  const wv = Math.max(26, rc * 1.7)
  return {
    cx,
    cy,
    rc,
    R,
    lx,
    ly,
    vb: `${cx - wv} ${cy - wv} ${2 * wv} ${2 * wv}`,
    wire: [cx + Math.cos(a) * (rc + 7), cy + Math.sin(a) * (rc + 7), lx - Math.cos(a) * (R + 3), ly - Math.sin(a) * (R + 3)],
    /** the caption goes under the loupe when there is room, else over it */
    below: ly + R + 84 < N,
    /** and it lines up with the loupe's outer edge, so it grows toward the middle of the photo */
    right: lx > N / 2,
  }
}

export default function Stage({ ref, layout, active, pinned, onState, onAct, onReady }: StageProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLElement>(null)
  const ofRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [res, setRes] = useState<SpikeResult | null>(null)
  const [note, setNote] = useState('')
  const [instant, setInstant] = useState(false)
  const live = useMemo(() => !phoneLike(), [])
  /** what this run is: the real models now, or their stored output */
  const [mode, setMode] = useState<'live' | 'replay'>(live ? 'live' : 'replay')
  /** the cell under the loupe: null = the stage's own pick, -1 = none */
  const [pick, setPick] = useState<number | null>(null)
  const token = useRef(0)
  const raf = useRef(0)
  const busy = useRef(false)
  const told = useRef(false)

  const ready = useCallback(() => {
    if (told.current) return
    told.current = true
    onReady()
  }, [onReady])

  const settle = useCallback(
    (r: SpikeResult, mine: number) => {
      if (mine !== token.current) return
      busy.current = false
      setPhase('result')
      onState('result')
      onAct(pickAct(spike.act(r)))
    },
    [onState, onAct],
  )

  const run = async (now = false) => {
    if (busy.current) return // the panel repeats a press until the check reports running: one press
    busy.current = true
    const mine = ++token.current
    cancelAnimationFrame(raf.current)
    setPick(null)
    setRes(null)
    setInstant(now)
    if (!now) onState('running')
    const t0 = performance.now()
    let r: SpikeResult | null = null
    setMode(live && !now ? 'live' : 'replay')
    if (live && !now) {
      try {
        setPhase('load')
        setNote('Loading the outliner · 12 MB')
        await withLimit(
          spike.load((p) => {
            if (mine === token.current && p.stage === 'grader') setNote('Loading the grader · 34 MB')
          }),
          LOAD_LIMIT_MS,
        )
        if (mine !== token.current) return
        setPhase('read')
        setNote('Both models are reading the photo')
        r = await withLimit(spike.analyze(FIELD), LIVE_LIMIT_MS)
      } catch {
        r = null
      }
      if (mine !== token.current) return
    }
    if (!r) {
      setMode('replay')
      setPhase('read')
      setNote('Reading the stored result')
      try {
        r = await spike.replay(FIELD)
      } catch {
        if (mine !== token.current) return
        busy.current = false
        setPhase('error')
        onState('error')
        return
      }
      if (mine !== token.current) return
    }
    if (!now) {
      // a replay answers at once: let the reading line be seen for a beat
      const wait = 650 - (performance.now() - t0)
      if (wait > 0) await sleep(wait)
      if (mine !== token.current) return
    }
    const flat = now || reducedMotion(rootRef.current)
    setRes(r)
    if (flat) {
      setInstant(true)
      settle(r, mine)
    } else setPhase('draw')
  }

  const reset = () => {
    token.current++
    busy.current = false
    cancelAnimationFrame(raf.current)
    setRes(null)
    setPick(null)
    setInstant(false)
    setPhase('idle')
    onState('idle')
  }

  const pin = useStageControls(ref, pinned, { run: () => void run(), reset }, onAct)

  // ?state=result: the stored result at once, no sweep.
  useEffect(() => {
    if (pin === 'result') void run(true)
    return () => {
      // (also undoes the first pass of React's development double mount, so the second can run)
      token.current++
      busy.current = false
      cancelAnimationFrame(raf.current)
    }
    // Runs once: the pin is read when the stage mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On a laptop the models load as soon as the panel is open, so the press itself is quick.
  useEffect(() => {
    if (!active || !live) return
    const t = window.setTimeout(() => {
      spike
        .load()
        .then(() => spike.analyze(FIELD, { polygons: false }))
        .catch(() => undefined)
    }, 400)
    return () => window.clearTimeout(t)
  }, [active, live])

  // Strokes are given in screen pixels: --u is one screen pixel in the photo's own pixels.
  useLayoutEffect(() => {
    const el = fieldRef.current
    const root = rootRef.current
    if (!el || !root) return
    const set = () => {
      const wpx = el.getBoundingClientRect().width
      if (wpx > 0) root.style.setProperty('--u', (N / wpx).toFixed(4))
    }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cells in the order the scan line meets them (each outline's top edge): the model's own label order.
  const lit = useMemo<Lit[]>(() => {
    if (!res) return []
    const h = res.height || N
    return res.cells
      .map((c) => {
        const top = c.polygon.length ? Math.min(...c.polygon.map((p) => p[1])) : c.center[1] - 20
        return { c, d: pts(c.polygon), top }
      })
      .sort((a, b) => a.top - b.top || a.c.id - b.c.id)
      .map((o) => ({ c: o.c, d: o.d, at: (clamp(o.top, 0, h) / h) * SWEEP_MS }))
  }, [res])

  // The counters, written straight to the page (no React render per frame).
  const paint = useCallback((n: number, sp: number) => {
    if (pctRef.current) pctRef.current.textContent = n ? f1((sp / n) * 100) : '0.0'
    if (ofRef.current) ofRef.current.textContent = `${sp} of ${n} cells`
  }, [])

  useLayoutEffect(() => {
    if (!res) return
    if (phase === 'result') paint(res.metrics.n, res.cells.filter(isSpiky).length)
    else if (phase === 'draw') paint(0, 0)
  }, [phase, res, paint])

  // The sweep: the counters follow the outlines as they light up, then the result settles.
  useEffect(() => {
    if (phase !== 'draw' || !res) return
    const mine = token.current
    const ats = lit.map((o) => o.at)
    const spikyUpTo = [0]
    for (const o of lit) spikyUpTo.push(spikyUpTo[spikyUpTo.length - 1] + (isSpiky(o.c) ? 1 : 0))
    const t0 = performance.now()
    let last = -1
    const tick = (now: number) => {
      if (mine !== token.current) return
      const t = now - t0
      let n = 0
      while (n < ats.length && ats[n] <= t) n++
      if (n !== last) {
        last = n
        paint(n, spikyUpTo[n])
      }
      if (t < SWEEP_MS + TRACE_MS * 0.6) raf.current = requestAnimationFrame(tick)
      else settle(res, mine)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [phase, res, lit, paint, settle])

  useEffect(() => {
    if (phase === 'result' && instant) ready()
  }, [phase, instant, ready])

  // ------------------------------------------------------------------------------------------- the loupe
  const autoPick = useMemo(() => {
    if (!res) return null
    const inner = (c: SpikeCell) => c.center[0] > 130 && c.center[0] < N - 130 && c.center[1] > 120 && c.center[1] < N - 150
    const pool0 = res.cells.filter((c) => !c.border && isSpiky(c))
    const pool = pool0.some(inner) ? pool0.filter(inner) : pool0
    const top = pool.filter((c) => c.cls === 4)
    return [...(top.length ? top : pool)].sort((a, b) => b.confidence - a.confidence)[0]?.id ?? null
  }, [res])
  const atRest = phase === 'result' && !!res
  const shownId = !atRest ? null : pick === null ? autoPick : pick === -1 ? null : pick
  const shown = shownId === null || !res ? null : (res.cells.find((c) => c.id === shownId) ?? null)
  const loupe = useMemo(() => (shown ? loupeFor(shown) : null), [shown])

  const cellAt = (e: { clientX: number; clientY: number }): SpikeCell | null => {
    const el = fieldRef.current
    if (!el || !res) return null
    const b = el.getBoundingClientRect()
    const x = ((e.clientX - b.left) / b.width) * N
    const y = ((e.clientY - b.top) / b.height) * N
    let best: SpikeCell | null = null
    let bd = Infinity
    for (const c of res.cells) {
      if (c.polygon.length > 2 && inPolygon(x, y, c.polygon)) return c
      const d = Math.hypot(c.center[0] - x, c.center[1] - y)
      if (d < bd) {
        bd = d
        best = c
      }
    }
    return best
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!atRest || e.pointerType !== 'mouse') return
    const c = cellAt(e)
    if (c && c.id !== shownId) setPick(c.id)
  }
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!atRest) return
    const c = cellAt(e)
    if (!c) return
    // A press on the cell under the loupe puts the loupe away; anywhere else brings it to that cell.
    setPick(c.id === shownId && e.detail > 0 ? -1 : c.id)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!atRest || !lit.length) return
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    const i = lit.findIndex((o) => o.c.id === shownId)
    let next = -1
    if (step) next = i < 0 ? (step > 0 ? 0 : lit.length - 1) : (i + step + lit.length) % lit.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = lit.length - 1
    if (next < 0) return
    e.preventDefault()
    setPick(lit[next].c.id)
  }

  // ------------------------------------------------------------------------------------------- the words
  const spikyN = res ? res.cells.filter(isSpiky).length : 0
  const decision = useMemo(() => (res && phase === 'result' ? spike.act(res) : null), [res, phase])
  const seconds = res?.source === 'live' ? res.timing.total.ms / 1000 : null
  const source =
    seconds !== null ? `Both models ran in this browser in ${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s` : spike.HONESTY.precomputed
  const counting = phase === 'draw' || phase === 'result'
  const waiting = phase === 'load' || phase === 'read'
  const cut = (c: SpikeCell) => c.border

  return (
    <div className="spk-stage" ref={rootRef} data-phase={phase} data-instant={instant ? 1 : 0} data-layout={layout} data-mode={mode}>
      <div className="spk-in">
      <div className="spk-well">
        <div
          ref={fieldRef}
          className="spk-field"
          data-qa="hero"
          tabIndex={atRest ? 0 : undefined}
          role={atRest ? 'group' : undefined}
          aria-label={atRest ? 'The outlined cells. Point at a cell, or use the arrow keys, to see the grader’s call for it.' : undefined}
          onPointerMove={atRest ? onMove : undefined}
          onClick={atRest ? onClick : undefined}
          onKeyDown={atRest ? onKey : undefined}
        >
          <img className="spk-photo" src={FIELD_URL} alt="Microscope photo of red blood cells from lab blood" draggable={false} onLoad={pin === 'result' ? undefined : ready} onError={ready} />
          <i className="spk-tint" aria-hidden="true" />
          {res && (
            <svg className="spk-cells" viewBox={`0 0 ${N} ${N}`} aria-hidden="true">
              <g className="spk-calm">
                {lit
                  .filter((o) => !isSpiky(o.c))
                  .map((o) => (
                    <polygon
                      key={o.c.id}
                      className={cut(o.c) ? 'spk-cell is-cut' : 'spk-cell'}
                      points={o.d}
                      pathLength={cut(o.c) ? undefined : 1}
                      style={{ ['--at' as string]: `${Math.round(o.at)}ms` } as CSSProperties}
                    />
                  ))}
              </g>
              <g className="spk-hot">
                {lit.filter((o) => isSpiky(o.c)).map((o) => (
                  <polygon
                    key={`g${o.c.id}`}
                    className={cut(o.c) ? 'spk-cell spk-halo is-cut' : 'spk-cell spk-halo'}
                    points={o.d}
                    pathLength={cut(o.c) ? undefined : 1}
                    style={{ ['--at' as string]: `${Math.round(o.at)}ms` } as CSSProperties}
                  />
                ))}
                {lit.filter((o) => isSpiky(o.c)).map((o) => (
                  <polygon
                    key={o.c.id}
                    className={cut(o.c) ? 'spk-cell is-cut' : 'spk-cell'}
                    points={o.d}
                    pathLength={cut(o.c) ? undefined : 1}
                    style={{ ['--at' as string]: `${Math.round(o.at)}ms` } as CSSProperties}
                  />
                ))}
              </g>
            </svg>
          )}
          {phase === 'draw' && <i className="spk-scan" aria-hidden="true" />}
          {loupe && shown && (
            <svg className="spk-loupe" viewBox={`0 0 ${N} ${N}`} aria-hidden="true" key={shown.id} data-hot={isSpiky(shown) ? 1 : 0}>
              <defs>
                <clipPath id={`${uid}-lc`}>
                  <circle cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
                </clipPath>
              </defs>
              <circle className="spk-l-target" cx={loupe.cx} cy={loupe.cy} r={loupe.rc + 6} />
              <line className="spk-l-wire" x1={loupe.wire[0]} y1={loupe.wire[1]} x2={loupe.wire[2]} y2={loupe.wire[3]} />
              <g className="spk-l-lens">
                <circle className="spk-l-back" cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
                <g clipPath={`url(#${uid}-lc)`}>
                  <svg x={loupe.lx - loupe.R} y={loupe.ly - loupe.R} width={loupe.R * 2} height={loupe.R * 2} viewBox={loupe.vb}>
                    <image href={FIELD_URL} x={0} y={0} width={N} height={N} />
                    <polygon className="spk-l-poly" points={pts(shown.polygon)} />
                  </svg>
                </g>
                <circle className="spk-l-ring" cx={loupe.lx} cy={loupe.ly} r={loupe.R} />
              </g>
            </svg>
          )}
          {loupe && shown && (
            <p
              className="spk-chip"
              data-hot={isSpiky(shown) ? 1 : 0}
              data-below={loupe.below ? 1 : 0}
              style={{
                ...(loupe.right ? { right: `${((N - loupe.lx - loupe.R) / N) * 100}%` } : { left: `${((loupe.lx - loupe.R) / N) * 100}%` }),
                top: `${((loupe.below ? loupe.ly + loupe.R : loupe.ly - loupe.R) / N) * 100}%`,
              }}
              aria-live="polite"
            >
              <b>{SHAPE[shown.className]}</b>
              <span>{Math.round(shown.confidence * 100)}% sure</span>
            </p>
          )}
        </div>
      </div>

      <div className="spk-read">
        <div className="spk-read-top">
          {phase === 'idle' && (
            <>
              <p className="spk-k">
                Lab blood<span className="spk-wide"> · light microscope</span>
              </p>
              <p className="spk-q">How many red cells are in this photo? And how many are spiky?</p>
            </>
          )}
          {waiting && (
            <>
              <p className="spk-k spk-k--on">
                <i className="spk-dot" aria-hidden="true" />
                {mode === 'live' ? 'Live, in this browser' : 'Replay'}
              </p>
              <p className="spk-note">{note}</p>
            </>
          )}
          {phase === 'error' && <p className="spk-note">The check could not run. Press the button to try again.</p>}
          {counting && res && (
            <div className="spk-num">
              <p className="spk-k">Spiky cells</p>
              <p className="spk-big">
                <b ref={pctRef} />
                <i>%</i>
              </p>
              <p className="spk-of">
                <span ref={ofRef} />
              </p>
            </div>
          )}
        </div>

        {counting && res && (
          <div className="spk-base" data-on={decision ? 1 : 0}>
            <p className="spk-k">Before flight</p>
            <p className="spk-mid">
              {decision ? f1(decision.inputs.s0) : ''}
              <i>%</i>
            </p>
            <p className="spk-tag">Illustrative</p>
          </div>
        )}

        <div className="spk-read-end">
          {counting && res && (
            <ul className="spk-key" aria-label="Outline colours">
              <li className="is-hot">Spiky</li>
              <li>Not spiky</li>
            </ul>
          )}
          {phase === 'result' && res ? (
            <p className="spk-src spk-wide">
              <b>{seconds !== null ? 'Live' : 'Replay'}</b> {source}
            </p>
          ) : (
            !counting && (
              <>
                <p className="spk-src spk-wide">{spike.HONESTY.heldOut}</p>
                <p className="spk-k spk-narrow">Never seen in training</p>
              </>
            )
          )}
          {atRest && <p className="spk-hint">{live ? 'Point at any cell' : 'Tap any cell'}</p>}
        </div>
      </div>
      </div>
      {/* the small phone sheet: the same line, one row under the photo */}
      {phase === 'result' && res && (
        <p className="spk-foot spk-narrow">
          <b>{seconds !== null ? 'Live' : 'Replay'}</b> {source}
        </p>
      )}
      <span className="spk-sr" aria-live="polite">
        {phase === 'result' && res ? `${spikyN} of ${res.metrics.n} cells graded spiky, ${f1(res.metrics.spikyPct)} percent.` : ''}
      </span>
    </div>
  )
}

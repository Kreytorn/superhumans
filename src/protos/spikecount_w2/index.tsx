// spikecount_w2 "Specimen 96": SpikeCount as a film title sequence. One huge real microscope field; one press runs
// the two real models (live on a laptop, stored replay on a phone); a scan line sweeps down the photo and every cell
// is outlined and coloured the moment the line reaches it, in the model's own cell order, with the counter in step.
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { motion } from 'motion/react'
import { ArrowCounterClockwise, ArrowDown, Play } from '@phosphor-icons/react'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/big-shoulders/wght.css'
import '@fontsource-variable/hanken-grotesk/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './w2.css'
import type { ProtoProps } from '../../App'
import { act, analyze, load, replay, HONESTY, CLASS_NAMES, type SpikeResult, type SpikeCell, type SpikeActDecision } from '../../engine/spikecount'
import { Chapters } from './chapters'
import { COLOURS, SHORT } from './palette'

const BASE = import.meta.env.BASE_URL
const FIELD = 'field-96'
const FIELD_URL = `${BASE}spikecount/fields/96.png`
const SIZE = 572
const SCAN_MS = 3400 // scan line top to bottom
const DRAW_MS = 460 // each cell: outline and fill arrive together in this window
const EYE_MS = 900 // the outliner's edge map fades in before the scan

const GALLERY = ['Disc_00.png', 'E1_00.png', 'E2_00.png', 'E3_00.png', 'E4_00.png', 'Cup_00.png']
const isSpiky = (c: number) => c >= 1 && c <= 4

type Phase = 'idle' | 'loading' | 'drawing' | 'result' | 'error'

interface Timed {
  cell: SpikeCell
  at: number // ms after the scan starts when the line reaches this cell's top row
  top: number
}

function useClock(running: boolean, pinned: number | null) {
  const [t, setT] = useState(0)
  const start = useRef(0)
  useEffect(() => {
    if (pinned !== null) {
      setT(pinned)
      return
    }
    if (!running) return
    start.current = performance.now()
    let raf = 0
    const tick = () => {
      setT(performance.now() - start.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, pinned])
  return t
}

function edgeCanvas(r: SpikeResult): string | null {
  const L = r.layers
  if (!L) return null
  const n = r.width * r.height
  const c = document.createElement('canvas')
  c.width = r.width
  c.height = r.height
  const g = c.getContext('2d')
  if (!g) return null
  const img = g.createImageData(r.width, r.height)
  for (let i = 0; i < n; i++) {
    const edge = L.pixelProbs[2 * n + i]
    const inner = L.pixelProbs[n + i]
    img.data[i * 4] = 40 + 200 * inner
    img.data[i * 4 + 1] = 200 * edge + 30 * inner
    img.data[i * 4 + 2] = 255 * edge + 60 * inner
    img.data[i * 4 + 3] = Math.min(255, 255 * edge + 70 * inner)
  }
  g.putImageData(img, 0, 0)
  return c.toDataURL()
}

export default function SpikeCountW2({ params }: ProtoProps) {
  const wantResult = params.get('state') === 'result'
  const pinnedT = params.has('t') ? Number(params.get('t')) : null
  const [phase, setPhase] = useState<Phase>('idle')
  const [res, setRes] = useState<SpikeResult | null>(null)
  const [decision, setDecision] = useState<SpikeActDecision | null>(null)
  const [eye, setEye] = useState<string | null>(null)
  const [showEye, setShowEye] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [ready, setReady] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [skip, setSkip] = useState(false)
  const token = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const canLive = useMemo(() => {
    if (params.get('replay') === '1') return false
    if (typeof window === 'undefined') return false
    return window.innerWidth > 700 && !window.matchMedia('(pointer: coarse)').matches
  }, [params])

  // laptops: load both models and warm them on another field while the screen is idle, so the press is instant
  const warm = useRef<Promise<boolean> | null>(null)
  useEffect(() => {
    if (!canLive || wantResult) return
    const id = window.setTimeout(() => {
      warm.current ??= load()
        .then(() => analyze('field-184'))
        .then(() => true)
        .catch(() => false)
    }, 900)
    return () => window.clearTimeout(id)
  }, [canLive, wantResult])

  const run = useCallback(
    async (instant = false) => {
      const mine = ++token.current
      setPicked(null)
      setRes(null)
      setDecision(null)
      setEye(null)
      setShowEye(false)
      setSkip(instant)
      setPhase('loading')
      setLoadPct(0)
      let r: SpikeResult | null = null
      if (canLive) {
        try {
          warm.current ??= load((p) => mine === token.current && setLoadPct(p.totalBytes ? p.loadedBytes / p.totalBytes : 0))
            .then(() => true)
            .catch(() => false)
          const ok = await Promise.race([warm.current, new Promise<boolean>((res) => setTimeout(() => res(false), instant ? 12000 : 6000))])
          if (ok) r = await analyze(FIELD)
        } catch {
          r = null
        }
      }
      if (!r) {
        try {
          r = await replay(FIELD)
        } catch {
          if (mine === token.current) setPhase('error')
          return
        }
      }
      if (mine !== token.current) return
      setRes(r)
      setDecision(act(r))
      const e = edgeCanvas(r)
      setEye(e)
      setPhase('drawing')
    },
    [canLive],
  )

  // timed cells: when the scan line (top -> bottom) reaches a cell's top row, that cell is drawn
  const timed: Timed[] = useMemo(() => {
    if (!res) return []
    return res.cells
      .map((cell) => {
        const top = Math.max(0, Math.min(...cell.polygon.map((p) => p[1])))
        return { cell, top, at: (top / res.height) * SCAN_MS }
      })
      .sort((a, b) => a.at - b.at || a.cell.id - b.cell.id)
  }, [res])

  const lead = res?.layers && !skip ? EYE_MS : 0
  const total = lead + SCAN_MS + DRAW_MS
  const clock = useClock(phase === 'drawing' && !skip, pinnedT)
  const t = skip || phase === 'result' ? total + 1 : pinnedT ?? clock
  const scanT = t - lead

  useEffect(() => {
    if (phase === 'drawing' && (skip || t >= total)) {
      setPhase('result')
    }
  }, [phase, t, total, skip])

  useEffect(() => {
    if (phase === 'drawing' && res?.layers && !skip) setShowEye(t < lead + SCAN_MS * 0.6)
    if (phase === 'result') setShowEye(false)
  }, [phase, t, lead, res, skip])

  // test hooks
  useEffect(() => {
    if (wantResult) {
      void run(true)
    } else setReady(true)
    return () => {
      token.current++
    }
  }, [wantResult, run])
  useEffect(() => {
    if (wantResult && phase === 'result') {
      const id = window.setTimeout(() => setReady(true), 900)
      return () => window.clearTimeout(id)
    }
  }, [wantResult, phase])

  const drawn = timed.filter((x) => scanT >= x.at)
  const nDrawn = drawn.length
  const spikyDrawn = drawn.filter((x) => isSpiky(x.cell.cls)).length
  const done = phase === 'result'
  const pct = done && res ? res.metrics.spikyPct : nDrawn ? (100 * spikyDrawn) / nDrawn : 0
  const scanY = Math.max(0, Math.min(1, scanT / SCAN_MS))

  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0, 0]
    for (const x of drawn) c[x.cell.cls]++
    return c
  }, [drawn])

  const specimens = useMemo(
    () =>
      res
        ? [0, 1, 2, 3, 4, 5]
            .map(
              (k) =>
                res.cells
                  .filter((c) => {
                    if (c.cls !== k || c.border) return false
                    const xs = c.polygon.map((q) => q[0])
                    const ys = c.polygon.map((q) => q[1])
                    return Math.min(...xs) > 10 && Math.min(...ys) > 10 && Math.max(...xs) < res.width - 10 && Math.max(...ys) < res.height - 10
                  })
                  .sort((a, b) => b.confidence - a.confidence)[0],
            )
            .filter((c): c is SpikeCell => !!c)
        : [],
    [res],
  )

  const reset = () => {
    token.current++
    setPhase('idle')
    setRes(null)
    setDecision(null)
    setEye(null)
    setPicked(null)
  }

  const onFieldClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (!res || phase !== 'result') return
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * res.width
    const y = ((e.clientY - box.top) / box.height) * res.height
    let best = -1
    let bd = Infinity
    res.cells.forEach((c, i) => {
      const d = (c.center[0] - x) ** 2 + (c.center[1] - y) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    })
    setPicked(bd < 40 * 40 ? best : null)
  }
  const pickedCell = res && picked !== null ? res.cells[picked] : null

  const live = res?.source === 'live'
  const tag = res ? (live ? `LIVE · ${res.timing.total.backend.toUpperCase()} · ${Math.round(res.timing.total.ms)} ms` : `REPLAY · ${HONESTY.precomputed}`) : canLive ? 'LIVE · in this browser' : 'REPLAY on phones'

  const scrollDown = () => {
    rootRef.current?.querySelector('#scw2-story')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="scw2" ref={rootRef} data-ready={ready ? '1' : '0'} data-state={phase === 'loading' || phase === 'drawing' ? 'running' : phase}>
      <div className="scw2-aurora" aria-hidden="true" />
      <header className="scw2-top">
        <span className="scw2-brand">
          SuperHumans <i>/</i> Check 03 of 06
        </span>
        <button type="button" className="scw2-ghost scw2-top-r" onClick={scrollDown}>
          The story <ArrowDown size={14} />
        </button>
      </header>

      <section className="scw2-hero">
        {/* the specimen */}
        <div className="scw2-stage" data-qa="hero" data-phase={phase}>
          <div className="scw2-glow" style={{ backgroundImage: `url(${FIELD_URL})` }} aria-hidden="true" />
          <div className="scw2-field">
            <img src={FIELD_URL} alt="Microscope photo of red blood cells, field 96, never seen in training" draggable={false} />
            {eye && <img className="scw2-eye" src={eye} alt="" aria-hidden="true" data-on={showEye ? 1 : 0} />}
            <svg viewBox={`0 0 ${res?.width ?? SIZE} ${res?.height ?? SIZE}`} onClick={onFieldClick} aria-label="Cell outlines from the model">
              <defs>
                <filter id="scw2-bloom" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {timed.map(({ cell, at }) => {
                const p = Math.max(0, Math.min(1, (scanT - at) / DRAW_MS))
                if (p <= 0) return null
                const col = COLOURS[cell.cls]
                const sel = pickedCell?.id === cell.id
                return (
                  <polygon
                    key={cell.id}
                    points={cell.polygon.map((q) => `${q[0]},${q[1]}`).join(' ')}
                    pathLength={1}
                    fill={col}
                    fillOpacity={p * (isSpiky(cell.cls) ? 0.34 : 0.16)}
                    stroke={col}
                    strokeOpacity={0.35 + 0.65 * p}
                    strokeWidth={sel ? 3.2 : 1.7}
                    strokeDasharray={cell.border ? '0.02 0.012' : '1'}
                    strokeDashoffset={cell.border ? 0 : 1 - p}
                    filter="url(#scw2-bloom)"
                  />
                )
              })}
              {pickedCell && (
                <circle cx={pickedCell.center[0]} cy={pickedCell.center[1]} r={Math.sqrt(pickedCell.area / Math.PI) + 12} className="scw2-ring" />
              )}
            </svg>
            {(phase === 'drawing') && scanY > 0 && scanY < 1 && (
              <div className="scw2-scan" style={{ top: `${scanY * 100}%` }} aria-hidden="true">
                <span>{nDrawn} cells</span>
              </div>
            )}
            {phase === 'loading' && (
              <div className="scw2-load" aria-live="polite">
                <i style={{ transform: `scaleX(${Math.max(0.04, loadPct)})` }} />
                <span>{canLive ? `Loading both models · 12 MB + 34 MB${loadPct > 0 ? ` · ${Math.round(loadPct * 100)}%` : ''}` : 'Reading stored outputs'}</span>
              </div>
            )}
            {showEye && <span className="scw2-eye-tag">Outliner: what the network sees</span>}
            <div className="scw2-reticle" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="scw2-plate">
              <span>Field 96</span>
              <span>x100 light microscope · never seen in training</span>
            </div>
            <span className={`scw2-tag ${live ? 'is-live' : ''}`}>{tag}</span>
            {done && (
              <button type="button" className="scw2-ghost scw2-redo" onClick={reset}>
                <ArrowCounterClockwise size={15} /> Run again
              </button>
            )}
          </div>
          {pickedCell && (
            <div className="scw2-cellcard" role="status">
              <b style={{ color: COLOURS[pickedCell.cls] }}>{SHORT[pickedCell.cls]}</b>
              <span>{Math.round(pickedCell.confidence * 100)}% sure</span>
              <div className="scw2-probs">
                {pickedCell.probs.map((p, k) => (
                  <span key={k} title={CLASS_NAMES[k]}>
                    <i style={{ height: `${Math.max(3, p * 100)}%`, background: COLOURS[k] }} />
                    <em>{CLASS_NAMES[k]}</em>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* the title column */}
        <div className="scw2-col">
          <p className="scw2-kicker">
            <span>03</span> Blood check
          </p>
          <h1 className="scw2-name">SpikeCount</h1>
          <p className="scw2-line">
            Every red blood cell, <em>outlined.</em> The spiky ones, <em className="hot">counted.</em>
          </p>

          {phase === 'idle' || phase === 'error' || phase === 'loading' ? (
            <>
            <div className="scw2-idle">
              <p className="scw2-bet">
                How many red cells are in this photo? How many are spiky? <em>Guess, then press.</em>
              </p>
              <div className="scw2-shapes">
                {GALLERY.map((g, k) => (
                  <figure key={g}>
                    <img src={`${BASE}spikecount/gallery/${g}`} alt={`${SHORT[k]} example cell`} style={{ borderColor: COLOURS[k] }} />
                    <figcaption style={{ color: COLOURS[k] }}>{SHORT[k]}</figcaption>
                  </figure>
                ))}
              </div>
              <span className="scw2-shapes-k">The six shapes the grader tells apart · real cells</span>
            </div>
            <div className="scw2-cta">
              <button type="button" className="scw2-btn" data-qa="primary" onClick={() => void run(false)} disabled={phase === 'loading'}>
                <span className="scw2-btn-ring" aria-hidden="true">
                  <Play weight="fill" size={22} />
                </span>
                {phase === 'loading' ? 'Grading…' : 'Grade this blood'}
              </button>
              <p className="scw2-note">
                Two neural networks, running {canLive ? 'in this browser' : 'as a stored replay on phones'}: one outlines every cell, one grades its shape.
              </p>
              {phase === 'error' && <p className="scw2-note is-err">The outlines could not be loaded. Press again.</p>}
            </div>
            </>
          ) : (
            <div className="scw2-read">
              <div className="scw2-big">
                <span className="scw2-num" aria-label={`${pct.toFixed(1)} percent spiky`}>
                  {pct.toFixed(1)}
                  <small>%</small>
                </span>
                <span className="scw2-numlab">
                  spiky
                  <b>
                    {done ? res?.cells.filter((c) => isSpiky(c.cls)).length : spikyDrawn} of {done ? res?.metrics.n : nDrawn} cells
                  </b>
                  {decision && (
                    <span className="scw2-base" data-on={done ? 1 : 0}>
                      <i>{decision.inputs.s0.toFixed(1)}%</i> before flight <em>Illustrative</em>
                    </span>
                  )}
                </span>
              </div>
              <div className="scw2-bar" aria-hidden="true">
                {counts.map((n, k) => (n ? <i key={k} style={{ flexGrow: n, background: COLOURS[k] }} /> : null))}
              </div>
              <ul className="scw2-key">
                {SHORT.map((s, k) => (
                  <li key={k} data-qa="tick">
                    <i style={{ background: COLOURS[k] }} />
                    {s} <b>{counts[k]}</b>
                  </li>
                ))}
              </ul>

            </div>
          )}
          {done && decision && res && (
            <motion.div className="scw2-band" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
              <div className={`scw2-act tier-${decision.tier}`}>
                <span className="scw2-act-k">Next · {decision.tierName}</span>
                <p className="scw2-act-h">{decision.headline}</p>
                <p className="scw2-act-why">
                  Advanced cells (grades 2 to 4) {decision.inputs.advancedPct.toFixed(1)}%; trigger {(decision.inputs.a0 + decision.inputs.marginPp).toFixed(1)}% (own preflight{' '}
                  {decision.inputs.a0.toFixed(1)}% + our 10-point margin). Our product rule.
                </p>
              </div>
              <div className="scw2-specs">
                <span className="scw2-specs-k">Close-ups from this photo: one of each shape it found</span>
                <div className="scw2-specs-row">
                  {specimens.map((c) => {
                    const xs = c.polygon.map((q) => q[0])
                    const ys = c.polygon.map((q) => q[1])
                    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
                    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
                    const box = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 16
                    const W = res.width
                    const H = res.height
                    return (
                      <figure key={c.id}>
                        <div
                          className="scw2-spec"
                          style={{
                            backgroundImage: `url(${FIELD_URL})`,
                            backgroundSize: `${(W / box) * 100}% ${(H / box) * 100}%`,
                            backgroundPosition: `${((cx - box / 2) / (W - box)) * 100}% ${((cy - box / 2) / (H - box)) * 100}%`,
                            borderColor: COLOURS[c.cls],
                          }}
                        />
                        <figcaption>
                          <b style={{ color: COLOURS[c.cls] }}>{SHORT[c.cls]}</b>
                          <span>{Math.round(c.confidence * 100)}% sure</span>
                        </figcaption>
                      </figure>
                    )
                  })}
                </div>
              </div>
              <p className="scw2-tap">Tap any cell in the photo to see its six grades.</p>
            </motion.div>
          )}
        </div>
      </section>

      <Chapters />
    </div>
  )
}

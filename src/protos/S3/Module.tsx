// S3 "Eclipse": the one module page, used for all six checks. The stage is the real moment component, restyled
// only through its --m-* tokens; SpikeCount (no ready stage) draws the engine's stored outlines on the real field.
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { ArrowClockwise, ArrowLeft, ArrowRight, ArrowCounterClockwise, Play } from '@phosphor-icons/react'
import { CHECKS, type Check } from './data'
import { Go } from './shared'

const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const GarnMeter = lazy(() => import('../../moments/garnmeter'))

const EASE = [0.16, 1, 0.3, 1] as const
type StageState = 'idle' | 'running' | 'result' | 'error'
interface Handle {
  run: (opts?: { sound?: boolean }) => unknown
  reset: () => void
}

function headlineOf(act: unknown): string | null {
  if (act && typeof act === 'object' && 'headline' in act) {
    const h = (act as { headline?: unknown }).headline
    return typeof h === 'string' && h ? h : null
  }
  return null
}

// plain colours: the stages read these into their canvases
const TOKENS: Record<string, Record<string, string>> = {
  tracktrace: { '--m-stage': '#05070b', '--m-ink': '#f3f1ec', '--m-ink-2': '#8a93a1', '--m-mark': '#ff4fb0', '--m-accent': '#ffffff' },
  bubblegrade: { '--m-stage': '#06141c', '--m-ink': '#e6f1f2', '--m-ink-2': '#8a9aa3', '--m-mark': '#ff8f3a', '--m-mark-hot': '#ffe8be' },
  veinsqueeze: { '--m-stage': '#05070b', '--m-ink': '#f3f1ec', '--m-ink-2': '#9aa1a8', '--m-mark': '#ffd84a', '--m-accent': '#ffd84a', '--m-radius': '10px' },
  braindrift: { '--m-stage': '#05070b', '--m-ink': '#f3f1ec', '--m-ink-2': '#8f99a6', '--m-mark': '#5cb6ff', '--m-accent': '#f3f1ec' },
  garnmeter: {
    '--m-stage': '#05070b',
    '--m-ink': '#eceef2',
    '--m-ink-2': '#8a93a1',
    '--m-mark': '#7c8594',
    '--m-accent': '#a79bff',
    '--m-ok': '#44c08a',
    '--m-watch': '#e0b040',
    '--m-alert': '#ff6f5b',
    '--m-field-hi': '#eceef2',
    '--m-field-lo': '#000000',
  },
}
const FONTS = { '--m-font': "'Geist Variable', ui-sans-serif, system-ui, sans-serif", '--m-font-mono': "'Geist Mono Variable', ui-monospace, monospace" }

// ------------------------------------------------------------------ SpikeCount stage (engine replay)
interface SpikeView {
  cells: { id: number; pts: string; cls: number; colour: string }[]
  spikyPct: number
  headline: string | null
  legend: { name: string; colour: string; n: number }[]
  source: string
}

function SpikeStage({ state, onState, onAct, bind }: { state: StageState; onState: (s: StageState) => void; onAct: (h: string | null) => void; bind: (h: Handle | null) => void }) {
  const [view, setView] = useState<SpikeView | null>(null)
  const [shown, setShown] = useState(0)
  const raf = useRef(0)
  const reduced = !!useReducedMotion()

  useEffect(() => {
    let on = true
    import('../../engine/spikecount')
      .then(async (m) => {
        const r = await m.replay('field-96')
        const a = m.act(r)
        const legend = m.CLASS_NAMES.map((k) => ({ name: m.CLASS_PLAIN[k], colour: m.CLASS_COLOURS[k], n: r.metrics.counts[k] })).filter((l) => l.n > 0)
        if (!on) return
        setView({
          cells: r.cells.map((c) => ({ id: c.id, pts: c.polygon.map((p) => `${p[0]},${p[1]}`).join(' '), cls: c.cls, colour: m.CLASS_COLOURS[c.className] })),
          spikyPct: r.metrics.spikyPct,
          headline: headlineOf(a),
          legend,
          source: r.source === 'live' ? 'LIVE' : 'REPLAY',
        })
      })
      .catch(() => on && onState('error'))
    return () => {
      on = false
    }
  }, [onState])

  const run = useCallback(() => {
    if (!view) return
    cancelAnimationFrame(raf.current)
    onAct(null)
    onState('running')
    const n = view.cells.length
    if (reduced) {
      setShown(n)
      onState('result')
      onAct(view.headline)
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(n, Math.floor((now - t0) / 42))
      setShown(k)
      if (k < n) raf.current = requestAnimationFrame(step)
      else {
        onState('result')
        onAct(view.headline)
      }
    }
    setShown(0)
    raf.current = requestAnimationFrame(step)
  }, [view, onAct, onState, reduced])

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setShown(0)
    onAct(null)
    onState('idle')
  }, [onAct, onState])

  useEffect(() => {
    bind({ run, reset })
    return () => bind(null)
  }, [bind, run, reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const n = view?.cells.length ?? 0
  const spikyShown = view ? view.cells.slice(0, shown).filter((c) => c.cls >= 1 && c.cls <= 4).length : 0
  const done = state === 'result'
  return (
    <div className="s3-spike" data-state={state}>
      <button type="button" className="s3-spike-field" data-qa="hero" onClick={() => (state === 'idle' ? run() : undefined)} aria-label="Outline the cells in this blood photo">
        <img src={CHECKS[2].lensImg} alt="Microscope photo of red blood cells" draggable={false} />
        <svg viewBox="0 0 572 572" aria-hidden="true">
          {view?.cells.slice(0, shown).map((c) => (
            <polygon key={c.id} points={c.pts} style={{ stroke: c.colour, fill: c.colour }} data-spiky={c.cls >= 1 && c.cls <= 4 ? '1' : undefined} />
          ))}
        </svg>
        {state === 'idle' ? <span className="s3-spike-hint">Press to outline every cell</span> : null}
      </button>
      <div className="s3-spike-read">
        <p className="s3-mono s3-spike-tag">
          <i />
          {view ? view.source : 'loading'} · stored model outputs
        </p>
        <p className="s3-spike-big">
          <NumberFlow value={shown} />
          <span>{n ? `of ${n} cells outlined` : 'cells outlined'}</span>
        </p>
        <p className="s3-spike-big s3-spike-second" data-on={shown > 0 ? '1' : undefined}>
          <NumberFlow value={done && view ? Math.round(view.spikyPct * 10) / 10 : shown ? Math.round((spikyShown / shown) * 1000) / 10 : 0} suffix="%" />
          <span>{done ? 'spiky cells' : 'spiky, so far'}</span>
        </p>
        <ul className="s3-spike-legend" data-on={done ? '1' : undefined}>
          {view?.legend.map((l) => (
            <li key={l.name}>
              <i style={{ background: l.colour }} />
              <b>{l.n}</b> {l.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ the page
export default function Module({ check }: { check: Check }) {
  const reduced = !!useReducedMotion()
  const idx = CHECKS.indexOf(check)
  const prev = CHECKS[(idx + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(idx + 1) % CHECKS.length]
  const [state, setState] = useState<StageState>('idle')
  const [headline, setHeadline] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const handle = useRef<Handle | null>(null)

  useEffect(() => {
    setState('idle')
    setHeadline(null)
    setReady(false)
    const id = window.setTimeout(() => setReady(true), 1800)
    return () => window.clearTimeout(id)
  }, [check.id])

  const bind = useCallback((h: Handle | null) => {
    handle.current = h
  }, [])
  const onState = useCallback((s: StageState) => setState(s), [])
  const onAct = useCallback((h: string | null) => setHeadline(h), [])
  const onResult = useCallback((_r: unknown, act: unknown) => setHeadline(headlineOf(act)), [])
  const run = () => {
    if (state === 'result') setHeadline(null)
    handle.current?.run({ sound: true })
  }
  const reset = () => {
    handle.current?.reset()
    setHeadline(null)
  }

  // the stages declare their tokens on their own root, so ours go on that root too (inline wins)
  const stageStyle = { ...TOKENS[check.id], ...FONTS, '--tint': check.tint } as CSSProperties
  const fill = { width: '100%', height: '100%', aspectRatio: 'auto', ...TOKENS[check.id], ...FONTS } as CSSProperties
  let stage: React.ReactNode
  switch (check.id) {
    case 'tracktrace':
      stage = <TrackTrace ref={bind} onState={onState} onResult={onResult} className="s3-moment" style={fill} />
      break
    case 'bubblegrade':
      stage = <BubbleGrade ref={bind} onState={onState} onResult={onResult} className="s3-moment" style={fill} />
      break
    case 'veinsqueeze':
      stage = <VeinSqueeze ref={bind} onState={onState} onResult={onResult} className="s3-moment" style={fill} />
      break
    case 'braindrift':
      stage = <BrainDrift ref={bind} onState={onState} onResult={onResult} className="s3-moment" style={fill} />
      break
    case 'garnmeter':
      stage = <GarnMeter ref={bind} onState={onState} onResult={onResult} className="s3-moment" style={fill} />
      break
    default:
      stage = <SpikeStage state={state} onState={onState} onAct={onAct} bind={bind} />
  }

  const rise = (delay: number) => ({
    initial: reduced ? (false as const) : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, delay, ease: EASE },
  })

  return (
    <div className="s3 s3-mod" data-ready={ready ? '1' : undefined} data-check={check.id} style={{ '--tint': check.tint } as CSSProperties}>
      <div className="s3-grain" aria-hidden="true" />
      <div className="s3-limb" aria-hidden="true" />
      <header className="s3-nav">
        <Go to="home" className="s3-brand" aria-label="SuperHumans, home">
          <span className="s3-brand-mark" aria-hidden="true" />
          SuperHumans
        </Go>
        <nav className="s3-dots" aria-label="The six checks">
          {CHECKS.map((c) => (
            <Go key={c.id} to={c.id} className="s3-dotlink" data-active={c.id === check.id ? '1' : undefined} aria-label={c.name} title={c.name} style={{ '--tint': c.tint } as CSSProperties}>
              <span className="s3-mono">{c.no}</span>
            </Go>
          ))}
        </nav>
        <Go to="home" className="s3-btn s3-btn-line s3-back">
          <ArrowLeft weight="bold" />
          All six checks
        </Go>
      </header>

      <main className="s3-mod-main" key={check.id}>
        <div className="s3-mod-head">
          <motion.div {...rise(0.05)}>
            <p className="s3-mono s3-row-kicker">
              <b>{check.no}</b> / 06 · {check.site}
              {idx === 0 ? <span className="s3-flag">Flagship</span> : null}
            </p>
            <h1 className="s3-mod-name">{check.name}</h1>
          </motion.div>
          <motion.p className="s3-mod-line" {...rise(0.16)}>
            {check.line}
          </motion.p>
        </div>

        <motion.section className="s3-stage" style={stageStyle} aria-label={`${check.name}, working stage`} {...rise(0.24)}>
          <div className="s3-stage-box">
            <Suspense fallback={<div className="s3-stage-wait s3-mono">Loading the stage</div>}>{stage}</Suspense>
          </div>
          <div className="s3-stage-bar">
            <div className="s3-stage-btns">
              <button type="button" className="s3-btn s3-btn-solid" onClick={run} data-state={state}>
                {state === 'result' ? <ArrowClockwise weight="bold" /> : <Play weight="fill" />}
                {state === 'result' ? 'Run again' : state === 'running' ? 'Running' : 'Run the check'}
              </button>
              <button type="button" className="s3-btn s3-btn-quiet" onClick={reset} disabled={state === 'idle'}>
                <ArrowCounterClockwise weight="bold" />
                Reset
              </button>
            </div>
            <p className="s3-next" data-on={headline ? '1' : undefined} aria-live="polite">
              <span className="s3-mono">What to do next</span>
              <span className="s3-next-line">{headline ?? 'Run the check to see it.'}</span>
            </p>
          </div>
        </motion.section>

        {check.id === 'tracktrace' ? (
          <motion.figure
            className="s3-arch"
            initial={reduced ? false : { opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <figcaption>
              <p className="s3-mono s3-row-kicker">The model behind it</p>
              <h2 className="s3-arch-h">
                IonScan, our own <em>3.2 M-parameter</em> network
              </h2>
            </figcaption>
            <div className="s3-arch-card">
              <img src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`} alt="Architecture figure of IonScan" loading="lazy" />
            </div>
            <span className="s3-ai-mark">AI-generated illustration</span>
          </motion.figure>
        ) : null}

        <nav className="s3-pager" aria-label="Previous and next check">
          <Go to={prev.id} className="s3-pager-link" style={{ '--tint': prev.tint } as CSSProperties}>
            <span className="s3-mono">
              <ArrowLeft weight="bold" /> Previous · {prev.no}
            </span>
            <span className="s3-pager-name">{prev.name}</span>
          </Go>
          <Go to={next.id} className="s3-pager-link s3-pager-next" style={{ '--tint': next.tint } as CSSProperties}>
            <span className="s3-mono">
              Next · {next.no} <ArrowRight weight="bold" />
            </span>
            <span className="s3-pager-name">{next.name}</span>
          </Go>
        </nav>
      </main>
    </div>
  )
}

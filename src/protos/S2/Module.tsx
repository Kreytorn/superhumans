// One page design for all six checks: the working stage, large, with its name, its sentence, what to do next
// and the way back and onward; below the first screen, the problem and its story, then how the check works.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Play } from '@phosphor-icons/react'
import { CHECKS, cropStyle, type Check } from './data'
import { SCANS, STORIES } from './story'
import type { ActDecision } from '../../engine/types'

const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const SpikeCount = lazy(() => import('../../moments/spikecount'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const GarnMeter = lazy(() => import('../../moments/garnmeter'))

type State = 'idle' | 'running' | 'result' | 'error'
interface Api {
  run: () => void
  reset: () => void
}

const RUN_LABEL: Record<string, string> = {
  tracktrace: 'Scan the nucleus',
  bubblegrade: 'Play the heart sound',
  spikecount: 'Grade this blood',
  veinsqueeze: 'Press the probe',
  braindrift: 'Fly the brain',
  garnmeter: 'Play the session',
}
const STATUS: Record<State, string> = { idle: 'Ready', running: 'Model running', result: 'Result in', error: 'Could not run' }

/** The status word: who acts, in two words at most, from the engine's own "who acts". */
function whoWord(who: string): string {
  const w = who.toLowerCase()
  if (w.startsWith('self') || w.startsWith('you')) return 'You'
  if (w.startsWith('crew medical officer')) return 'Crew medic'
  const head = who.split(/ with | and |,|\(/)[0].trim()
  return head.charAt(0).toUpperCase() + head.slice(1)
}

function Stage({ id, api, onState, onAct }: { id: string; api: React.RefObject<Api | null>; onState: (s: State) => void; onAct: (a: ActDecision | null) => void }) {
  const bind = <H extends { run: (...a: never[]) => unknown; reset: () => void }>(run: (h: H) => void) => (h: H | null) => {
    api.current = h ? { run: () => run(h), reset: () => h.reset() } : null
  }
  const done = (_r: unknown, a: ActDecision | null) => onAct(a)
  switch (id) {
    case 'tracktrace':
      return <TrackTrace ref={bind((h) => void h.run())} onState={onState} onResult={done} className="s2-m-fill" />
    case 'bubblegrade':
      return <BubbleGrade ref={bind((h) => h.run({ sound: true }))} onState={onState} onResult={done} className="s2-m-fill" />
    case 'spikecount':
      return <SpikeCount ref={bind((h) => void h.run())} onState={onState} onResult={done} className="s2-m-fill" />
    case 'veinsqueeze':
      return <VeinSqueeze ref={bind((h) => void h.run())} onState={onState} onResult={done} className="s2-m-fill" />
    case 'braindrift':
      return <BrainDrift ref={bind((h) => void h.run())} onState={onState} onResult={done} className="s2-m-fill" />
    default:
      return <GarnMeter ref={bind((h) => void h.run())} onState={onState} onResult={done} className="s2-m-fill" />
  }
}

/** IonScan's eight scans over a small grid, in the real order; a lit token runs each path. */
function ScanGrid({ dir, back }: { dir: 'r' | 'c' | 'd' | 'a'; back: boolean }) {
  const N = 6
  const s = 12
  const cells: { x: number; y: number }[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ x, y })
  // the reading path as a polyline through cell centres
  const order: [number, number][] = []
  if (dir === 'r') for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) order.push([x, y])
  if (dir === 'c') for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) order.push([x, y])
  if (dir === 'd') for (let k = 0; k < 2 * N - 1; k++) for (let y = 0; y < N; y++) { const x = k - y; if (x >= 0 && x < N) order.push([x, y]) }
  if (dir === 'a') for (let k = 0; k < 2 * N - 1; k++) for (let y = 0; y < N; y++) { const x = N - 1 - (k - y); if (x >= 0 && x < N && k - y >= 0) order.push([x, y]) }
  if (back) order.reverse()
  const pts = order.map(([x, y]) => `${x * s + s / 2},${y * s + s / 2}`).join(' ')
  return (
    <svg viewBox={`0 0 ${N * s} ${N * s}`} aria-hidden="true">
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x * s + 1.5} y={c.y * s + 1.5} width={s - 3} height={s - 3} rx={2} />
      ))}
      <polyline points={pts} pathLength={100} />
    </svg>
  )
}

export default function Module({ check }: { check: Check }) {
  const i = CHECKS.findIndex((c) => c.id === check.id)
  const prev = CHECKS[(i + CHECKS.length - 1) % CHECKS.length]
  const next = CHECKS[(i + 1) % CHECKS.length]
  const story = STORIES[check.id]
  const api = useRef<Api | null>(null)
  const storyRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<State>('idle')
  const [act, setAct] = useState<ActDecision | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    const t = window.setTimeout(() => setReady(true), 900)
    return () => window.clearTimeout(t)
  }, [])
  const onState = useCallback((s: State) => {
    setState(s)
    if (s === 'idle' || s === 'running') setAct(null)
  }, [])
  const onAct = useCallback((a: ActDecision | null) => setAct(a), [])
  const toStory = () => storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="s2 s2-module" style={{ ['--hue' as string]: check.hue }} data-band={check.id === 'spikecount' ? '1' : undefined} data-ready={ready ? '1' : undefined} data-proto="S2" data-state={state}>
      <div className="s2-m-bg" aria-hidden="true" />
      <header className="s2-top">
        <a className="s2-back" href="#/proto/S2/home">
          <ArrowLeft weight="bold" />
          All checks
        </a>
        <nav className="s2-steps" aria-label="The six checks">
          {CHECKS.map((c) => (
            <a key={c.id} className={`s2-step${c.id === check.id ? ' is-on' : ''}`} style={{ ['--h' as string]: c.hue }} href={`#/proto/S2/${c.id}`} aria-label={c.name} aria-current={c.id === check.id ? 'page' : undefined} title={c.name}>
              {c.n}
            </a>
          ))}
        </nav>
        <a className="s2-next" href={`#/proto/S2/${next.id}`}>
          <em>Next</em>
          {next.name}
          <ArrowRight weight="bold" />
        </a>
      </header>

      <main className="s2-m-main">
        <aside className="s2-m-side">
          <div className="s2-m-head">
            <span className="s2-m-lens" style={cropStyle(check)} aria-hidden="true" />
            <p className="s2-m-kicker">
              {check.n} / 06 · {check.site}
            </p>
            <h1 className="s2-m-name">{check.name}</h1>
            <p className="s2-m-sentence">{check.sentence}</p>
          </div>
          <div className="s2-m-ctl">
            <div className="s2-m-actions">
              <button type="button" className="s2-m-run" data-qa="primary" onClick={() => api.current?.run()}>
                <Play weight="fill" />
                {RUN_LABEL[check.id]}
              </button>
              <button type="button" className="s2-m-reset" onClick={() => api.current?.reset()}>
                Reset
              </button>
            </div>
          </div>
          <div className={`s2-m-act${act ? ' is-on' : ''}`} data-sev={act?.severity} aria-live="polite">
            <p className="s2-m-status" data-s={state}>
              <i />
              {STATUS[state]}
            </p>
            {act ? (
              <>
                <p className="s2-m-act-k">What to do next</p>
                <p className="s2-m-act-who">{whoWord(act.whoActs)}</p>
                <p className="s2-m-act-line">{act.headline}</p>
              </>
            ) : (
              <>
                <p className="s2-m-act-k">What to do next</p>
                <p className="s2-m-act-wait">Lands here when the check ends.</p>
              </>
            )}
          </div>
          <button type="button" className="s2-m-more" onClick={toStory}>
            <ArrowDown weight="bold" />
            Why it matters, how it works
          </button>
          <nav className="s2-m-pager" aria-label="Previous and next check">
            <a className="s2-m-page" href={`#/proto/S2/${prev.id}`}>
              <small>← {prev.n}</small>
              <b>{prev.name}</b>
            </a>
            <a className="s2-m-page" href={`#/proto/S2/${next.id}`}>
              <small>{next.n} →</small>
              <b>{next.name}</b>
            </a>
          </nav>
        </aside>

        <section className="s2-m-stage" data-m={check.id} data-qa="hero" aria-label={`${check.name} stage`}>
          <Suspense fallback={null}>
            <Stage id={check.id} api={api} onState={onState} onAct={onAct} />
          </Suspense>
        </section>
      </main>

      {story && (
        <section className="s2-story" ref={storyRef} aria-label={`${check.name}: the problem and how the check works`}>
          <div className="s2-story-hero">
            <figure className={`s2-story-img${check.id === 'spikecount' ? ' is-square' : ''}`}>
              <img src={story.img} alt={story.imgAlt} loading="lazy" />
              <figcaption>{story.imgCap}</figcaption>
            </figure>
            <div className="s2-story-text">
              <p className="s2-story-k">The problem</p>
              <h2 className="s2-story-title">{story.title}</h2>
              {story.story.map((p) => (
                <p key={p} className="s2-story-p">
                  {p}
                </p>
              ))}
              <p className="s2-story-hook">{story.hook}</p>
            </div>
          </div>

          {check.id === 'tracktrace' ? (
            <div className="s2-ion">
              <div className="s2-ion-head">
                <p className="s2-story-k">How IonScan reads a nucleus</p>
                <h2 className="s2-ion-title">Eight scans over one grid.</h2>
                <p className="s2-story-p">
                  It cuts the nucleus into a 32 x 32 grid and reads it along four directions, each both ways, with a selective state-space memory: like a particle detector integrating hits along a path. Then attention. The scans show how it reads, never a found direction.
                </p>
              </div>
              <ol className="s2-scans">
                {SCANS.map((sc, k) => (
                  <li key={sc.name} style={{ ['--k' as string]: k }}>
                    <ScanGrid dir={sc.dir} back={sc.back} />
                    <span>
                      <b>{k + 1}</b>
                      {sc.name}
                    </span>
                  </li>
                ))}
              </ol>
              <ol className="s2-steps-list is-tt">
                {story.how.slice(2).map((h, k) => (
                  <li key={h}>
                    <b>{String(k + 3).padStart(2, '0')}</b>
                    {h}
                  </li>
                ))}
              </ol>
              <figure className="s2-m-arch">
                <div className="s2-m-arch-card">
                  <img src={`${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" />
                  <small className="s2-m-arch-mark">AI-generated illustration</small>
                </div>
                <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
              </figure>
            </div>
          ) : (
            <div className="s2-how">
              <p className="s2-story-k">How the check works</p>
              <ol className="s2-steps-list">
                {story.how.map((h, k) => (
                  <li key={h}>
                    <b>{String(k + 1).padStart(2, '0')}</b>
                    {h}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <details className="s2-know">
            <summary>How do we know?</summary>
            <ul>
              {story.know.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </details>

          <nav className="s2-story-next" aria-label="Next check">
            <a href={`#/proto/S2/${next.id}`} style={{ ['--h' as string]: next.hue }}>
              <span className="s2-story-next-lens" style={cropStyle(next)} aria-hidden="true" />
              <span>
                <small>Next check · {next.n}</small>
                <b>{next.name}</b>
              </span>
              <ArrowRight weight="bold" />
            </a>
          </nav>
        </section>
      )}
    </div>
  )
}

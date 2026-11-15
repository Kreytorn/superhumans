// DF check page: one design for all six checks. The working stage, large; the check's name and sentence; Back;
// and beside (or under) the stage the one number and the "who acts + one action" sentence the stage reports.
// Every number and sentence in the result panel comes from the stage's onResult at run time.
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import './check.css'
import { href, type Mod } from './data'
import type { TrackTraceMomentHandle } from '../../moments/tracktrace'
import type { BubbleGradeMomentHandle } from '../../moments/bubblegrade'
import type { VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import type { BrainDriftMomentHandle } from '../../moments/braindrift'
import type { GarnMomentHandle } from '../../moments/garnmeter'
import type { SpikeCountMomentHandle } from '../../moments/spikecount'
import { HONESTY_BANDS, HONESTY_HELD_OUT, HONESTY_HERO_PAIR, HONESTY_SQUEEZE, HONESTY_STRIP } from '../../engine/veinsqueeze/honesty'
import StorySection from './story'
import ReviewLine, { reviewOf, type Review } from '../../components/ReviewLine'

// Each stage is its own chunk, fetched only when its page has landed.
const TrackTrace = lazy(() => import('../../moments/tracktrace'))
const BubbleGrade = lazy(() => import('../../moments/bubblegrade'))
const VeinSqueeze = lazy(() => import('../../moments/veinsqueeze'))
const BrainDrift = lazy(() => import('../../moments/braindrift'))
const Garn = lazy(() => import('../../moments/garnmeter'))
const Spike = lazy(() => import('../../moments/spikecount'))

type Phase = 'idle' | 'running' | 'result' | 'error'
/** What the page tells the DF root: its stage is on screen (or failed), and the stage's phase. */
export interface CheckStatus {
  id: string
  ready: boolean
  phase: Phase
}
export interface Outcome {
  /** The one number (or grade), exactly as the stage's result gives it. */
  big?: string
  bigLabel?: string
  who?: string
  action?: string
  /** Shown only where the stage does not print LIVE / REPLAY itself. */
  source?: 'LIVE' | 'REPLAY'
  /** The decision's fixed honesty lines, verbatim, behind "How do we know?". */
  fine: string[]
  /** A short tag the stage asks the page to show (VeinSqueeze: "Best case"), with its sentence. */
  flag?: { tag: string; line: string }
  /** One fixed honesty line shown in the open with the action (BubbleGrade). */
  note?: string
  /** r4: who reviews the AI's reading (from the engine's whoActs; Garn Meter: experimental). Shown under the result. */
  review?: Review
}

type Tokens = CSSProperties & Record<`--${string}`, string>
const BASE_TOKENS: Tokens = {
  '--m-stage': '#070A14',
  '--m-ink': '#F1F4FF',
  '--m-ink-2': '#9AA3BF',
  '--m-line': '#3A4266',
  '--m-font': '"Space Grotesk", system-ui, sans-serif',
  '--m-font-mono': '"JetBrains Mono", ui-monospace, Consolas, monospace',
  '--m-radius': '10px',
  width: '100%',
  height: '100%',
}
const TOKENS: Record<string, Tokens> = {
  tracktrace: { ...BASE_TOKENS, '--m-mark': '#FF7A45', '--m-accent': '#FFFFFF', '--m-specimen': '#ECE7DB' },
  bubblegrade: { ...BASE_TOKENS, '--m-stage': '#071421', '--m-mark': '#FF8F3A', '--m-mark-hot': '#FFE8BE', '--m-accent': '#3FD0FF' },
  veinsqueeze: { ...BASE_TOKENS, '--m-mark': '#FFD34D', '--m-accent': '#FF4F7B', aspectRatio: 'auto' },
  spikecount: { ...BASE_TOKENS, '--m-stage': '#070A14', '--m-pane': '#04060C', '--m-rule': '#2A3150', '--m-size': '16px' },
  braindrift: { ...BASE_TOKENS, '--m-mark': '#5CF2B0', '--m-mark-2': '#F4FFFA', '--m-accent': '#F1F4FF' },
  garnmeter: {
    ...BASE_TOKENS,
    '--m-mark': '#8D97B5',
    '--m-accent': '#FFD34D',
    '--m-ok': '#2EE6A6',
    '--m-watch': '#FFB224',
    '--m-alert': '#FF4D5E',
    '--m-field-hi': '#F1F4FF',
    '--m-field-lo': '#000105',
  },
}

/** What pressing will do, in plain words (no numbers: those come from the stage). */
const BEFORE: Record<string, string> = {
  tracktrace: 'Press to scan this cell nucleus. IonScan circles each DNA-damage spot, then checks whether they line up.',
  bubblegrade: 'Press to play a real heart recording made after a dive. The model listens and grades the bubbles.',
  spikecount: 'Press to outline every red blood cell in this microscope photo and grade the spiky ones.',
  veinsqueeze: 'Hold the control on the stage to press on both veins. Then the AI reads each clip and gives its clot chance.',
  braindrift: 'Drag the slider to after flight, or press the button. The AI maps the brain again and measures what changed.',
  garnmeter: 'Press to play a recorded brainwave session through the model. The gauge shows its reading, in Garns.',
}
const BUTTON: Record<string, string | null> = {
  tracktrace: 'Scan the nucleus',
  bubblegrade: 'Play the heart sound',
  spikecount: 'Outline the cells',
  veinsqueeze: null,
  braindrift: 'Fly the brain',
  garnmeter: 'Play the session',
}

/** Engine honesty lines, verbatim (engine/tracktrace HONESTY.batch, engine/bubblegrade HONESTY.card). */
const TT_BATCH = 'The model separates the two exposures, but part of that comes from lab batch; the foci and the sample-level call are what we trust.'
const BG_CARD = 'A bubble is a warning; symptoms are the diagnosis.'

const fineOf = (a: unknown): string[] => {
  const c = (a as { caveats?: unknown } | null)?.caveats
  return Array.isArray(c) ? c.filter((x): x is string => typeof x === 'string') : []
}
/** The engines say "self" for the crew member; on screen that is "You". */
const who = (s: string | undefined) => {
  if (!s) return undefined
  const t = s === 'self' ? 'you' : s.startsWith('self,') ? `you${s.slice(4)}` : s
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const acts = (a: { whoActs: string; headline: string } | null | undefined) =>
  a ? { who: who(a.whoActs), action: a.headline, fine: fineOf(a), review: reviewOf(a.whoActs) } : { fine: [] }

class StageBoundary extends Component<{ children: ReactNode; onFail?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail?.()
  }
  render() {
    if (this.state.failed)
      return (
        <div className="df-check-wait" data-error="1">
          <p>This stage could not start here.</p>
          <a className="df-check-ghost" href={href('home')}>
            Back to the body
          </a>
        </div>
      )
    return this.props.children
  }
}

function Waiting({ label }: { label: string }) {
  return (
    <div className="df-check-wait" aria-live="polite">
      <i aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export interface CheckPageProps {
  mod: Mod
  live: boolean
  pin?: 'result'
  sample?: string
  onStatus?: (s: CheckStatus) => void
}

// r4: a check may have its own page in ./pages/<module id>.tsx (same props, same duties: report onStatus, mark
// data-ready / data-state on its root, mount heavy work only when live). Without one, the standard page below is used.
const PAGE_LOADERS = import.meta.glob<{ default: ComponentType<CheckPageProps> }>('./pages/*.tsx')
const PAGES: Record<string, ComponentType<CheckPageProps>> = Object.fromEntries(
  Object.entries(PAGE_LOADERS).map(([k, load]) => [k.slice('./pages/'.length, -'.tsx'.length), lazy(load)]),
)

export default function CheckPage(props: CheckPageProps) {
  const Own = PAGES[props.mod.id]
  if (!Own) return <StandardCheck {...props} />
  return (
    <Suspense fallback={<Waiting label="Opening" />}>
      <Own {...props} />
    </Suspense>
  )
}

function StandardCheck({ mod, live, pin, sample, onStatus }: CheckPageProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  // ?state=result pins the stage on its finished result (tests, stills); the first press lets go of the pin
  const [pinned, setPinned] = useState<'result' | undefined>(pin)
  const [broken, setBroken] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const tt = useRef<TrackTraceMomentHandle>(null)
  const bg = useRef<BubbleGradeMomentHandle>(null)
  const vs = useRef<VeinSqueezeMomentHandle>(null)
  const bd = useRef<BrainDriftMomentHandle>(null)
  const gm = useRef<GarnMomentHandle>(null)
  const sc = useRef<SpikeCountMomentHandle>(null)
  const stageRef = useRef<HTMLElement>(null)
  // Every stage marks its root data-ready="1" once its sample is on screen; the main button waits for that.
  const [ready, setReady] = useState(false)
  const id = mod.id

  useEffect(() => {
    if (!live || ready) return
    const iv = window.setInterval(() => {
      if (stageRef.current?.querySelector('[data-ready="1"]')) setReady(true)
    }, 150)
    return () => window.clearInterval(iv)
  }, [live, ready])

  const onPhase = useCallback((s: Phase) => setPhase(s), [])
  const onFail = useCallback(() => {
    setBroken(true)
    setPhase('error')
  }, [])
  // the page counts as ready once its stage is on screen (its main control is live then), or once it failed
  const shown = live && (ready || broken || phase === 'error')
  useEffect(() => {
    onStatus?.({ id, ready: shown, phase })
  }, [onStatus, id, shown, phase])

  /** "The problem, and how it works": glide down to the story and hand it the focus (keyboard and screen readers land there too).
   *  Only the page itself scrolls (scrollIntoView would also move the clipped layers around it). */
  const toStory = (e: MouseEvent<HTMLButtonElement>) => {
    const page = e.currentTarget.closest<HTMLElement>('.df-check')
    const story = page?.querySelector<HTMLElement>('.df-story')
    if (!page || !story) return
    keep.current.userUntil = performance.now() + 2000
    page.scrollTo({ top: page.scrollTop + story.getBoundingClientRect().top - page.getBoundingClientRect().top - 24, behavior: 'smooth' })
    story.querySelector<HTMLElement>('.df-story-h[tabindex]')?.focus({ preventScroll: true })
  }

  // The page stays where the presenter left it. It never scrolls sideways, and whatever scroll it picked up during the
  // flight is dropped on landing. From a press on the main button or the stage until 3 s after the run, it moves only
  // for the presenter's own scrolling (wheel, a touch drag, scroll keys, the scrollbar) or the story button; any other
  // scroll (a stage, a focus, the browser bringing something into view) is put back.
  const pageRef = useRef<HTMLDivElement>(null)
  const keep = useRef({ top: 0, settled: 0, restoreTo: null as number | null, userUntil: 0, armedUntil: 0, running: false, drag: false, moved: false })
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const K = keep.current
    const now = () => performance.now()
    const user = (ms = 900) => {
      K.userUntil = Math.max(K.userUntil, now() + ms)
    }
    let settleTimer = 0
    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0
      const t = now()
      if (K.drag || t < K.userUntil) {
        K.top = K.settled = el.scrollTop
        user(250) // a scroll that keeps going (momentum, a smooth glide) keeps its window open
      } else if (K.running || t < K.armedUntil) {
        if (Math.abs(el.scrollTop - K.top) > 1) el.scrollTop = K.top
      } else {
        // idle: a scroll from elsewhere is accepted, but only counts as where the page rests once it has held 400 ms
        K.top = el.scrollTop
        window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(() => {
          if (Math.abs(el.scrollTop - K.top) <= 1) K.settled = K.top
        }, 400)
      }
    }
    const onWheel = () => user()
    const onTouchMove = () => {
      K.moved = true
      user()
    }
    const onTouchEnd = () => {
      if (K.moved) user(1500)
      K.moved = false
    }
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as Element | null)?.closest?.('button, input, select, textarea, [role="slider"], [role="button"]')
      if (SCROLL_KEYS.has(e.key) && !tag) user()
    }
    const onDown = (e: PointerEvent) => {
      const tgt = e.target as Element | null
      // the scrollbar belongs to the page element itself
      if (tgt === el) {
        K.drag = true
        return
      }
      // a press on the stage or a main button arms the guard from where the page is now; if something moved the page
      // in the moment just before the press (a tool bringing the button into view), it goes back once the press is done
      if (tgt?.closest?.('.df-check-stage, .df-check-btn')) {
        const t = now()
        K.restoreTo = t >= K.userUntil && Math.abs(el.scrollTop - K.settled) > 1 ? K.settled : null
        K.top = el.scrollTop
        K.armedUntil = t + 4000
      }
    }
    const onClick = (e: Event) => {
      const back = K.restoreTo
      K.restoreTo = null
      if (back === null || !(e.target as Element | null)?.closest?.('.df-check-stage, .df-check-btn')) return
      requestAnimationFrame(() => {
        K.top = K.settled = back
        el.scrollTop = back
      })
    }
    const onUp = () => {
      if (K.drag) user(600)
      K.drag = false
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('keydown', onKey)
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('click', onClick, true)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('click', onClick, true)
      window.clearTimeout(settleTimer)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
  useEffect(() => {
    const K = keep.current
    if (phase === 'running') K.running = true
    else if (K.running) {
      K.running = false
      K.armedUntil = Math.max(K.armedUntil, performance.now() + 3000)
    }
  }, [phase])
  useEffect(() => {
    if (!live || !pageRef.current) return
    keep.current.top = keep.current.settled = 0
    pageRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [live])

  const reset = () => {
    setPinned(undefined)
    setOutcome(null)
    tt.current?.reset()
    bg.current?.reset()
    vs.current?.reset()
    bd.current?.reset()
    gm.current?.reset()
    sc.current?.reset()
    setPhase('idle')
  }
  const press = () => {
    const K = keep.current
    const t = performance.now()
    if (t >= K.armedUntil && pageRef.current) K.top = pageRef.current.scrollTop
    K.armedUntil = Math.max(K.armedUntil, t + 4000)
    if (phase === 'result' || phase === 'error' || pinned) return reset()
    if (id === 'tracktrace') tt.current?.run()
    else if (id === 'bubblegrade') bg.current?.run({ sound: true })
    else if (id === 'braindrift') bd.current?.run()
    else if (id === 'garnmeter') void gm.current?.run()
    else if (id === 'spikecount') sc.current?.run()
  }

  let stage: ReactNode = null
  if (live) {
    const style = TOKENS[id] ?? BASE_TOKENS
    if (id === 'tracktrace')
      stage = (
        <TrackTrace
          ref={tt}
          style={style}
          state={pinned}
          sampleId={sample}
          promise=""
          onState={onPhase}
          onResult={(r, a) => {
            const o = acts(a)
            setOutcome({ big: String(r.count), bigLabel: 'DNA-damage spots circled in this nucleus', ...o, fine: [...o.fine, TT_BATCH] })
          }}
        />
      )
    else if (id === 'bubblegrade')
      stage = (
        <BubbleGrade
          ref={bg}
          style={style}
          state={pinned}
          onState={onPhase}
          onResult={(r, a) => setOutcome({ big: String(r.clip.grade), bigLabel: 'bubble grade', source: r.source === 'live' ? 'LIVE' : 'REPLAY', ...acts(a), note: BG_CARD })}
        />
      )
    else if (id === 'veinsqueeze')
      stage = (
        <VeinSqueeze
          ref={vs}
          style={style}
          state={pinned}
          mode={pinned ? 'replay' : undefined}
          onState={onPhase}
          onResult={(r, a) => {
            const o = acts(a)
            // r4: "How do we know?" without repeats: the caption of a per-frame strip this page never shows is left out,
            // and so are the act's second alarm-threshold line and second doses line (each said already, verbatim).
            const hon = (Array.isArray(r.honesty) ? r.honesty : []).filter((h) => h !== HONESTY_STRIP)
            const said = (start: string) => [...hon, ...o.fine].filter((x) => x.startsWith(start)).length > 1
            const extra = o.fine.filter((c) => !((c.startsWith('Alarm threshold ') && said('Alarm threshold ')) || (c.startsWith('Doses are shown') && said('Doses are '))))
            const fine = [...new Set([...hon, HONESTY_SQUEEZE, HONESTY_BANDS, HONESTY_HELD_OUT, ...extra])]
            const flag = hon.includes(HONESTY_HERO_PAIR) ? { tag: 'Best case', line: HONESTY_HERO_PAIR } : undefined
            const done = (big: string) => setOutcome({ big, bigLabel: 'AI clot chance', ...o, fine, flag })
            // The stage's own formatter, so the page and the stage print the same value.
            import('../../moments/veinsqueeze').then((m) => done(m.formatChance(r.clotProb))).catch(() => done(`${(r.clotProb * 100).toFixed(1)}%`))
          }}
        />
      )
    else if (id === 'braindrift')
      // The stage itself shows its four numbers (measured beside put-in), so the page adds none: only who acts and what to do.
      // The stage can leave its result by itself (a new drag on its slider, its own "Before flight" button): the panel
      // then lets go of the old result too, so it never shows an action for a scan that is no longer on screen.
      stage = (
        <BrainDrift
          ref={bd}
          style={style}
          state={pinned}
          onState={(s) => {
            onPhase(s)
            if (s === 'idle' || s === 'running') setOutcome(null)
          }}
          onResult={(_r, a) => {
            const o = acts(a)
            // two engine lines in plain words: "the ACT" is our internal name for the action card, LBNP an abbreviation
            const plain = (f: string) =>
              f.replace('which is why prevention and selection are the ACT.', 'which is why the action is prevention and crew selection.').replace('in-flight LBNP', 'in-flight lower-body negative pressure (LBNP)')
            setOutcome({ ...o, fine: o.fine.map(plain) })
          }}
        />
      )
    else if (id === 'garnmeter')
      stage = (
        <Garn
          ref={gm}
          style={style}
          state={pinned}
          onState={onPhase}
          // Only the model's own reading (r4, the owner's ruling). Tier C: the engine sends no alert on it, so no one acts.
          onResult={(_r, _a, g) =>
            setOutcome({
              big: g.garn.toFixed(2),
              bigLabel: `Garn, the model’s reading for scene ${g.trial}. 0 is fine, 1 is totally sick.`,
              action: 'A reading only, not used for alerts.',
              fine: g.notes,
              review: { kind: 'experimental' },
            })
          }
        />
      )
    // The SpikeCount stage prints its own number, LIVE / REPLAY tag and next step, so the page adds no panel.
    else stage = <Spike ref={sc} style={style} state={pinned} sampleId={sample} promise="" onState={onPhase} onResult={(_r, a) => setOutcome({ ...acts(a) })} />
  }

  const label = BUTTON[id]
  const showButton = phase === 'result' || phase === 'error' || (label !== null && label !== undefined)
  const waiting = !ready && phase === 'idle'
  const buttonText = phase === 'running' ? 'Running' : phase === 'result' ? 'Start over' : phase === 'error' ? 'Try again' : waiting ? 'Loading' : label

  return (
    <div ref={pageRef} className="df-check" data-ready={shown ? '1' : undefined} data-state={phase} data-module={id} style={{ '--mc': mod.color } as CSSProperties}>
      <div className="df-check-in">
        <header className="df-check-head">
          <a className="df-back" href={href('home')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </a>
          <h1 className="df-check-name">{mod.name}</h1>
          <p className="df-check-sent">{mod.sentence}</p>
          {id === 'spikecount' && showButton && (
            <button type="button" data-qa="primary" className={`df-check-btn is-head${phase === 'result' ? ' is-quiet' : ''}`} onClick={press} disabled={!live || waiting || phase === 'running'}>
              {buttonText}
            </button>
          )}
          {/* r4: on a phone Garn Meter's tall stage pushes its panel button below the first screen; a copy sits up here (narrow screens only, check.css) */}
          {id === 'garnmeter' && showButton && (
            <button type="button" className={`df-check-btn is-head is-narrow${phase === 'result' ? ' is-quiet' : ''}`} onClick={press} disabled={!live || waiting || phase === 'running'}>
              {buttonText}
            </button>
          )}
        </header>

        <div className="df-check-main">
          <section ref={stageRef} className="df-check-stage" aria-label={`${mod.name}: the working stage`}>
            {live ? (
              <StageBoundary onFail={onFail}>
                <Suspense fallback={<Waiting label="Loading the stage" />}>{stage}</Suspense>
              </StageBoundary>
            ) : (
              <Waiting label="Opening" />
            )}
          </section>

          {id !== 'spikecount' && (
          <aside className="df-check-panel" aria-live="polite">
            <p className="df-check-eyebrow">
              {outcome ? 'Result' : phase === 'running' ? 'Working' : 'What it does'}
              {outcome?.source && <span className="df-check-tag">{outcome.source}</span>}
              {outcome?.flag && (
                <span className="df-check-tag is-flag" title={outcome.flag.line}>
                  {outcome.flag.tag}
                </span>
              )}
            </p>
            {phase === 'error' && !outcome ? (
              <p className="df-check-before">This check could not load its sample. Try again.</p>
            ) : outcome ? (
              <div className="df-check-result">
                {outcome.big !== undefined && (
                  <p className="df-check-big">
                    <b>{outcome.big}</b>
                    <span>{outcome.bigLabel}</span>
                  </p>
                )}
                {outcome.who && (
                  <p className="df-check-who">
                    <span>Who acts</span>
                    {outcome.who.split(' (')[0]}
                    {outcome.who.includes(' (') && <small>({outcome.who.split(' (').slice(1).join(' (')}</small>}
                  </p>
                )}
                {outcome.action && <p className="df-check-action">{outcome.action}</p>}
                {outcome.note && <p className="df-check-note">{outcome.note}</p>}
                {outcome.review && <ReviewLine review={outcome.review} />}
                {outcome.fine.length > 0 && (
                  <details className="df-check-fine">
                    <summary>How do we know?</summary>
                    <ul>
                      {outcome.fine.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              phase !== 'running' && <p className="df-check-before">{BEFORE[id]}</p>
            )}
            {showButton && (
              <button type="button" data-qa="primary" className={`df-check-btn${phase === 'result' ? ' is-quiet' : ''}`} onClick={press} disabled={!live || waiting || phase === 'running'}>
                {buttonText}
              </button>
            )}
          </aside>
          )}
        </div>

        <button type="button" className="df-check-more" onClick={toStory}>
          The problem, and the model
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <StorySection mod={mod} />
      </div>
    </div>
  )
}

// Station: the working panel. Smoked glass over the frozen frame: on a landscape screen it sits on the
// right, on a portrait one it is a sheet over the lower part. The frame is the shell's (Back, previous and
// next, the check's name and sentence, the main button, the "what to do next" line); the module's Stage
// fills the body.
import { Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { ArrowCounterClockwise, ArrowLeft, CaretLeft, CaretRight, Play } from '@phosphor-icons/react'
import { Boundary } from './lib/Boundary'
import type { PanelLayout, StageAct, StageHandle, StageState } from './modules/types'
import { CHECKS, neighbour, type Check, type StageComponent } from './registry'

export interface PanelHandle {
  focusPrimary(): void
  focusBack(): void
}

interface Props {
  ref?: Ref<PanelHandle>
  check: Check | null
  open: boolean
  layout: PanelLayout
  pinned: 'idle' | 'result' | null
  hrefFor(view: string): string
  /** The stage's state, mirrored on the page root as data-state. Must be a stable function. */
  onState(state: StageState): void
  /** The panel has opened and its stage is drawn (or 2.5 s have passed). Must be a stable function. */
  onReady(): void
}

/** How long the open transition takes; the stage is told it is `active` after it. */
const OPEN_MS = 560
/** A closed panel keeps its stage this long (the close transition), then lets it go. */
const KEEP_MS = 460
const READY_CAP_MS = 2500
/** A pinned result (?state=result) is what a test or a screenshot came for, and some stages need a few seconds
 *  to draw it (stored results to fetch, frames to decode): the page waits for it this long before it says it is
 *  settled anyway. (A pinned idle is the stage's first picture: the normal cap.) */
const PINNED_CAP_MS = 8000

export function Panel({ ref, check, open, layout, pinned, hrefFor, onState, onReady }: Props) {
  const [shown, setShown] = useState<Check | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const [mount, setMount] = useState(0)
  // The stage component is picked once per mount: the plain one when its chunk is already in (it draws in the
  // panel's first frame), else the lazy wrapper.
  const [StageComp, setStageComp] = useState<{ for: number; C: StageComponent } | null>(null)
  if (shown && (!StageComp || StageComp.for !== mount)) setStageComp({ for: mount, C: shown.stage() })
  const [active, setActive] = useState(false)
  const [state, setState] = useState<StageState>('idle')
  const [failed, setFailed] = useState(false)
  const [act, setAct] = useState<StageAct | null>(null)
  const [starting, setStarting] = useState(false)
  const [tall, setTall] = useState(false)
  const stage = useRef<StageHandle>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const back = useRef<HTMLAnchorElement>(null)
  const stateNow = useRef<StageState>('idle')
  const retry = useRef(0)
  /** Times "Load it again" has fetched this check's stage once more since it last drew. */
  const reloads = useRef(0)
  // drawn = the stage said its idle picture is up; opened = the open transition is over; told = reported.
  const flags = useRef({ drawn: false, opened: false, told: false })
  // Read when a panel opens (not an effect dependency: a later change of the address must not reopen it).
  const pinnedNow = useRef(pinned)
  pinnedNow.current = pinned

  // Every opening gets a fresh stage, also for the check that was open a moment ago.
  if (open && check && !wasOpen) {
    setWasOpen(true)
    setShown(check)
    setMount((m) => m + 1)
    setState('idle')
    setFailed(false)
    setAct(null)
    setStarting(false)
    setActive(false)
    setTall(false)
  } else if (!open && wasOpen) setWasOpen(false)

  useImperativeHandle(ref, () => ({
    focusPrimary: () => primary.current?.focus({ preventScroll: true }),
    focusBack: () => back.current?.focus({ preventScroll: true }),
  }))

  const tellReady = useCallback(() => {
    if (flags.current.told) return
    flags.current.told = true
    onReady()
  }, [onReady])

  useEffect(() => {
    if (!open) {
      setActive(false)
      const t = window.setTimeout(() => setShown(null), KEEP_MS)
      return () => window.clearTimeout(t)
    }
    stateNow.current = 'idle'
    flags.current = { drawn: false, opened: false, told: false }
    onState('idle')
    const opened = window.setTimeout(() => {
      flags.current.opened = true
      setActive(true)
      if (flags.current.drawn) tellReady()
    }, OPEN_MS)
    const cap = window.setTimeout(tellReady, pinnedNow.current === 'result' ? PINNED_CAP_MS : READY_CAP_MS)
    return () => {
      window.clearTimeout(opened)
      window.clearTimeout(cap)
      window.clearInterval(retry.current)
    }
  }, [open, mount, onState, tellReady])

  const onStageState = useCallback(
    (s: StageState) => {
      stateNow.current = s
      setState(s)
      onState(s)
      // A pinned result that has landed is the picture the address asked for: the page is settled with it,
      // whether or not the stage has called onReady yet.
      if (s === 'result' && pinnedNow.current === 'result' && !flags.current.drawn) {
        flags.current.drawn = true
        if (flags.current.opened) tellReady()
      }
    },
    [onState, tellReady],
  )
  const onStageReady = useCallback(() => {
    reloads.current = 0
    flags.current.drawn = true
    if (flags.current.opened) tellReady()
  }, [tellReady])
  const shownId = shown?.id
  useEffect(() => {
    reloads.current = 0
  }, [shownId])
  // A stage may ask for a tall phone sheet once it runs (StageProps.onTall); the handle still toggles it.
  const onStageTall = useCallback((t: boolean) => setTall(!!t), [])

  // A press always lands: while the stage is still loading, the press is repeated until the check starts.
  const run = () => {
    window.clearInterval(retry.current)
    if (failed) {
      // The module did not load or crashed (a dropped connection, usually): the same button fetches it again.
      // If that fails too, the page is loaded again at this address, because a browser can keep a failed
      // module fetch cached for the life of the page.
      if (reloads.current > 0) {
        window.location.reload()
        return
      }
      reloads.current++
      shown?.retry('stage')
      setFailed(false)
      setState('idle')
      setMount((m) => m + 1)
      return
    }
    stage.current?.run()
    setStarting(true)
    let n = 0
    retry.current = window.setInterval(() => {
      if (stateNow.current !== 'idle' || ++n > 24) {
        window.clearInterval(retry.current)
        setStarting(false)
        return
      }
      stage.current?.run()
    }, 500)
  }
  const reset = () => {
    window.clearInterval(retry.current)
    setStarting(false)
    setAct(null)
    stage.current?.reset()
  }

  const running = !failed && (state === 'running' || (starting && state === 'idle'))
  const prev = shown ? neighbour(shown.id, -1) : null
  const next = shown ? neighbour(shown.id, 1) : null

  return (
    <>
      {/* The smoked glass is a layer of its own (see st.css): it feathers into the frame and is not repainted
          while the stage animates. */}
      <i className="st-glass" data-open={open ? 1 : 0} data-tall={tall ? 1 : 0} aria-hidden="true" />
      <section
        className="st-panel"
        data-open={open ? 1 : 0}
        data-stage={running ? 'running' : state}
        data-tall={tall ? 1 : 0}
        aria-label={shown ? `${shown.name}, the check for ${shown.label.toLowerCase()}` : undefined}
        inert={!open}
      >
        {shown && prev && next && (
          <>
            {layout === 'sheet' && (
              <button
                type="button"
                className="st-grab"
                aria-expanded={tall}
                aria-label={tall ? 'Make the panel smaller' : 'Make the panel taller'}
                onClick={() => setTall((t) => !t)}
              >
                <i />
              </button>
            )}
            <header className="st-bar">
              <a ref={back} className="st-back" href={hrefFor('home')}>
                <ArrowLeft aria-hidden="true" />
                <span>Station</span>
              </a>
              <nav className="st-steps" aria-label="Other checks">
                <a className="st-step" href={hrefFor(prev.id)} aria-label={`Previous check: ${prev.name}`} title={prev.name}>
                  <CaretLeft aria-hidden="true" />
                </a>
                <span className="st-ticks" aria-hidden="true">
                  {CHECKS.map((c) => (
                    <i key={c.id} data-on={c.id === shown.id ? 1 : 0} />
                  ))}
                </span>
                <a className="st-step" href={hrefFor(next.id)} aria-label={`Next check: ${next.name}`} title={next.name}>
                  <CaretRight aria-hidden="true" />
                </a>
              </nav>
            </header>

            <div className="st-head">
              <div className="st-head-text">
                <p className="st-head-label">{shown.label}</p>
                <h1 className="st-head-name">{shown.name}</h1>
                <p className="st-head-line">{shown.sentence}</p>
              </div>
              <div className="st-cta">
                {state === 'result' && !failed ? (
                  <button ref={primary} type="button" className="st-btn st-btn--quiet" data-qa="primary" onClick={reset}>
                    <ArrowCounterClockwise aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                ) : (
                  <button ref={primary} type="button" className="st-btn" data-qa="primary" disabled={running} onClick={run}>
                    {failed ? <ArrowCounterClockwise aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}
                    <span>{failed ? 'Load it again' : running ? 'Running' : state === 'error' ? 'Try again' : shown.cta}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="st-frame">
              <div className="st-stage" data-active={active ? 1 : 0}>
                <Boundary
                  key={mount}
                  onError={() => {
                    setFailed(true)
                    onStageState('error')
                    tellReady()
                  }}
                  fallback={
                    <div className="st-stage-note">
                      <p>This check could not be loaded.</p>
                    </div>
                  }
                >
                  <Suspense fallback={<div className="st-stage-note" data-wait="1" />}>
                    {StageComp && (
                      <StageComp.C
                        ref={stage}
                        id={shown.id}
                        layout={layout}
                        active={active}
                        pinned={pinned}
                        onState={onStageState}
                        onAct={setAct}
                        onReady={onStageReady}
                        onTall={onStageTall}
                      />
                    )}
                  </Suspense>
                </Boundary>
              </div>
            </div>

            <footer className="st-act" data-on={act ? 1 : 0} aria-live="polite">
              <span className="st-act-k">What to do next</span>
              {act && (
                <p className="st-act-v">
                  <b>{act.whoActs}</b>
                  <span>{act.headline}</span>
                </p>
              )}
            </footer>
          </>
        )}
      </section>
    </>
  )
}

// Station / TrackTrace, the panel body. The ready-made TrackTrace moment (src/moments/tracktrace: IonScan
// reading a real cell nucleus, live on a laptop, its stored outputs on a phone) restyled only through its
// --m-* tokens into the film's light: the nucleus in cold white, IonScan's own marks (circles, the line, the
// spots on every nucleus of the sample) in the warm amber of the lit windows.
//
// The owner's hard rule: the IonScan architecture figure on a white card in a thin frame, captioned "IonScan, our
// own 3.2 M-parameter network", in view without a click. On a laptop panel it stands in its own column beside
// the moment, and a press on the card shows it large over the stage (Close or Esc puts it back). On a phone's
// sheet there is no width for that: it follows the moment, and the caption row's arrow scrolls it in and back.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowsOut, X } from '@phosphor-icons/react'
import TrackTraceMoment, { type MomentState, type TrackTraceMomentHandle } from '../../../../moments/tracktrace'
import { AMBER, MOMENT_TOKENS, pickAct, useStageControls } from '../kit'
import type { PanelLayout, StageProps } from '../types'
import './stage.css'

const FIGURE = `${import.meta.env.BASE_URL}tracktrace/ionscan_architecture.svg`
const FIGURE_ALT =
  'The IonScan architecture: the network that reads the nucleus image, with its eight scans along four directions, the damage-spot map and the four outputs.'

type Tokens = CSSProperties & Record<`--${string}`, string>

/** The moment's palette (read once, when a nucleus loads; a constant, so it never has to remount). */
const TOKENS: Tokens = {
  ...MOMENT_TOKENS,
  // the nucleus, cold white like the hull in shadow
  '--m-specimen': '#e2eaf4',
  // only what IonScan drew: the circles, the line, the dots on every nucleus of the sample
  '--m-mark': AMBER,
  // the rings on the ten nuclei the sample model weighed most, and the stage's focus ring
  '--m-accent': '#e8eef5',
}

/**
 * Below this height the moment's whole-sample view (583 nuclei after the pull-back) shrinks to a strip: a phone's
 * sheet at its first height, a short laptop. There the stage reads one nucleus whose run ends on the nucleus
 * itself: nucleus-239, iron ions, a held-out sample (its pool entry in src/moments/tracktrace/pool.ts).
 */
const ROOM_PX = 400
const SHORT_STAGE_NUCLEUS = 'nucleus-239'

/**
 * The moment's own "Next nucleus" pill sits in its result note. Beside a small lens (a wide but short stage) that
 * note grows past the top of the stage, so the pill is shown only where the moment's layout has room for it: its
 * column layout, a narrow stage, or a stage this tall. Without it the main button still moves on: every new
 * scan reads the next nucleus of the pool.
 */
const STEPPER_MIN_H = 500

/** A body at least this wide (a laptop panel; also the 662 px body of a 1280 x 720 projector, where the figure
 *  would otherwise sit below the fold behind a click) gives the figure its own column beside the moment. */
const COLUMNS_MIN_W = 620
/** The caption row under the moment when the figure follows it (phone sheet, narrow panel). */
const CAP_H = 56

interface Plan {
  /** The figure in its own column beside the moment (else it follows the moment). */
  cols: boolean
  /** That column's width, px. */
  figW: number
  /** With the column: the moment's box height, px (kept under its width; see planFor). */
  momentH: number
  /** Tall enough for the whole-sample view. */
  roomy: boolean
  stepper: boolean
}

function planFor(layout: PanelLayout, bodyW: number, bodyH: number): Plan {
  const cols = layout === 'side' && bodyW >= COLUMNS_MIN_W
  // As wide as it can be while the moment's box stays landscape: in a portrait box the moment zooms its idle
  // nucleus further (1.55 x instead of 1.25 x the short side) and the 128 px image turns blocky.
  const figW = cols ? Math.round(Math.min(300, Math.max(220, bodyW - bodyH - 2))) : 0
  const w = cols ? bodyW - figW - 1 : bodyW
  // Where the column cannot be narrow enough for that, the moment's box is kept a little shorter than it is wide;
  // the strip it leaves is the same black as the stage, so nothing shows.
  const momentH = cols ? Math.floor(Math.min(bodyH, w - 1)) : 0
  const h = cols ? momentH : layout === 'sheet' ? bodyH : bodyH - CAP_H
  // the same tests the moment's own layout makes (src/moments/tracktrace/stage.ts, layout())
  const narrow = w < 600
  const column = w >= 900 && w > h * 1.15
  return { cols, figW, momentH, roomy: h >= ROOM_PX, stepper: column || narrow || h >= STEPPER_MIN_H }
}

function Caption() {
  return (
    <span className="stt-cap-text">
      <b>IonScan</b>, our own <span className="stt-nb">3.2 M-parameter</span> network
    </span>
  )
}

export default function Stage({ ref, layout, pinned, onState, onAct, onReady }: StageProps) {
  const moment = useRef<TrackTraceMomentHandle>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const figRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [atFigure, setAtFigure] = useState(false)
  const [zoom, setZoom] = useState(false)

  // Measured before the first paint (the stage is fresh on every opening of the panel). The figure column follows
  // later size changes; which nucleus the moment reads and its pill stay as first measured, so no run is swapped.
  const [plan, setPlan] = useState<Plan | null>(null)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const next = planFor(layout, r.width, r.height)
      setPlan((old) =>
        !old
          ? next
          : old.cols === next.cols && old.figW === next.figW && old.momentH === next.momentH
            ? old
            : { ...next, roomy: old.roomy, stepper: old.stepper },
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [layout])

  const pin = useStageControls(
    ref,
    pinned,
    {
      run: () => void moment.current?.run(),
      reset: () => moment.current?.reset(),
    },
    onAct,
  )

  // A new reading (the main button, or "Next nucleus" after a result) clears the last "what to do next".
  const onMomentState = useCallback(
    (s: MomentState) => {
      if (s === 'running') onAct(null)
      onState(s)
    },
    [onAct, onState],
  )

  // Figure after the moment: the panel body scrolls, and the caption's arrow follows which way it can go.
  const bodyOf = () => (rootRef.current?.closest('.st-stage') as HTMLElement | null) ?? rootRef.current?.parentElement ?? null
  const cols = !!plan?.cols
  useEffect(() => {
    const body = bodyOf()
    if (!body || cols) return
    // The figure counts as reached once its caption has come up to the top of the body.
    const on = () => setAtFigure(!!figRef.current && body.scrollTop >= figRef.current.offsetTop - 24)
    on()
    body.addEventListener('scroll', on, { passive: true })
    return () => body.removeEventListener('scroll', on)
  }, [cols])

  const toggleScroll = () => {
    const body = bodyOf()
    const fig = figRef.current
    if (!body || !fig) return
    const reduce = !!rootRef.current?.closest('[data-motion="reduced"]')
    const top = atFigure ? 0 : body.scrollTop + fig.getBoundingClientRect().top - body.getBoundingClientRect().top - body.clientTop
    body.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }

  // The large figure: focus goes to its Close button, and back to the card when it closes.
  const wasZoom = useRef(false)
  useEffect(() => {
    if (zoom) closeRef.current?.focus({ preventScroll: true })
    else if (wasZoom.current) cardRef.current?.focus({ preventScroll: true })
    wasZoom.current = zoom
  }, [zoom])
  const onZoomKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // the shell leaves a key alone once it is handled here
      e.preventDefault()
      setZoom(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className="stt"
      data-layout={layout}
      data-cols={cols ? 1 : 0}
      style={plan?.cols ? ({ '--stt-figw': `${plan.figW}px` } as Tokens) : undefined}
    >
      {/* while the figure is shown large, what lies under it can be neither pressed nor reached by Tab */}
      <div className="stt-moment" inert={zoom} style={plan?.cols ? { height: plan.momentH } : undefined}>
        {plan && (
          <TrackTraceMoment
            ref={moment}
            sampleId={plan.roomy ? undefined : SHORT_STAGE_NUCLEUS}
            stepper={plan.stepper}
            state={pin}
            promise=""
            style={TOKENS}
            onState={onMomentState}
            onResult={(_result, act) => onAct(pickAct(act))}
            onReady={(ok) => ok && onReady()}
          />
        )}
      </div>

      {plan &&
        (cols ? (
          <figure className="stt-fig" inert={zoom}>
            <button
              ref={cardRef}
              type="button"
              className="stt-card-go"
              aria-label="Show the IonScan network large"
              aria-expanded={zoom}
              onClick={() => setZoom(true)}
            >
              <span className="stt-frame">
                <span className="stt-card">
                  <img src={FIGURE} width={501} height={484} decoding="async" draggable={false} alt={FIGURE_ALT} />
                </span>
              </span>
              <span className="stt-card-hint" aria-hidden="true">
                <ArrowsOut />
              </span>
            </button>
            <figcaption className="stt-cap">
              <Caption />
            </figcaption>
          </figure>
        ) : (
          <figure ref={figRef} className="stt-fig">
            <figcaption className="stt-cap">
              <Caption />
              <button
                type="button"
                className="stt-cap-go"
                data-up={atFigure ? 1 : 0}
                aria-label={atFigure ? 'Back to the nucleus' : 'Show the IonScan network'}
                title={atFigure ? 'Back to the nucleus' : 'Show the network'}
                onClick={toggleScroll}
              >
                <ArrowDown aria-hidden="true" />
              </button>
            </figcaption>
            <div className="stt-frame">
              <div className="stt-card">
                <img src={FIGURE} width={501} height={484} decoding="async" draggable={false} alt={FIGURE_ALT} />
              </div>
            </div>
          </figure>
        ))}

      {zoom && (
        <div className="stt-zoom" role="dialog" aria-label="IonScan, our own 3.2 M-parameter network" onKeyDown={onZoomKey}>
          <img src={FIGURE} width={501} height={484} draggable={false} alt={FIGURE_ALT} />
          <button ref={closeRef} type="button" className="stt-zoom-close" onClick={() => setZoom(false)}>
            <X aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>
      )}
    </div>
  )
}

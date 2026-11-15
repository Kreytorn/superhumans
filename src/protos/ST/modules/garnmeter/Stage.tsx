// Garn Meter, the panel body: the ready-made moment (src/moments/garnmeter) in the film's palette, through its
// tokens only. On a laptop it runs the real model (CorrFuse-EEG) in the browser; on a phone it plays the stored
// outputs of the same model (the moment chooses). A pinned ?state=result is drawn from the stored outputs at
// once (tagged REPLAY); the first press lets go of the pin and the real model runs.
// Below the moment, where the panel has the height for it (phone sheet, big screens): "How do we know?", the
// lines the moment's README asks an embedding page to carry, all verbatim from the engine (STRINGS, captions)
// or measured at run time. On a 1440 x 900 laptop the moment needs the whole body, so the row stays out.
// On a phone the moment needs more height than the sheet has, so the body scrolls; during a run the view
// follows the story: the traces while the model reads, then the rail where the check-in lands.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Info, X } from '@phosphor-icons/react'
import * as garn from '../../../../engine/garnmeter'
import type { GarnResult } from '../../../../engine/garnmeter'
import GarnMoment, { type GarnMomentHandle, type MomentState } from '../../../../moments/garnmeter'
import { AMBER, MOMENT_TOKENS, pickAct, useStageControls } from '../kit'
import type { StageProps } from '../types'
import './stage.css'

// The film's palette as the Garn Meter's tokens. The three zone colours carry meaning (each also has its own
// shape on the stage), so they stay green / amber / red, softened to sit in the film.
const TOKENS = {
  ...MOMENT_TOKENS,
  '--m-ink-2': '#9aa6b3',
  '--m-mark': '#9aa6b3', // what the model drew: a quiet grey ("the grey line" in How do we know?)
  '--m-accent': '#8fb3d9', // the person's own ratings: the film's cold blue
  '--m-glow': AMBER, // the light in the traces and the instruments: the lit windows
  '--m-ok': '#5fbf8f',
  '--m-watch': AMBER,
  '--m-alert': '#ff6b3d',
  '--m-field-hi': '#ffc983', // scalp map: more theta than at rest (warm) ...
  '--m-field-lo': '#6f93c4', // ... less (cold)
} as CSSProperties

/** The moment lays itself out without overlaps from about 525 px of height; the notes row takes 44 more. */
const ROOM_FOR_NOTES = 575

/** The nearest ancestor that scrolls vertically (the panel body), if any. */
function scroller(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p
  }
  return null
}

export default function Stage({ ref, layout, active, pinned, onState, onAct, onReady }: StageProps) {
  const moment = useRef<GarnMomentHandle>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const howBtn = useRef<HTMLButtonElement>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [out, setOut] = useState<GarnResult | null>(null)
  const [how, setHow] = useState(false)

  // The real model loads once the panel has opened (heavy work waits for `active`), or at the first press.
  const [warm, setWarm] = useState(active)
  const runWhenWarm = useRef(false)
  useEffect(() => {
    if (active) setWarm(true)
  }, [active])

  const pin = useStageControls(
    ref,
    pinned,
    {
      run: () => {
        setHow(false)
        if (!warm) {
          runWhenWarm.current = true
          setWarm(true)
          return
        }
        void moment.current?.run()
      },
      reset: () => {
        setHow(false)
        moment.current?.reset()
      },
    },
    onAct,
  )
  useEffect(() => {
    if (!warm || !runWhenWarm.current) return
    runWhenWarm.current = false
    void moment.current?.run()
  }, [warm])

  // auto = the real model on a laptop, the stored outputs on a phone; replay until the panel is open, and for
  // a pinned result (drawn at once).
  const mode = pin === 'result' || !warm ? 'replay' : 'auto'

  // Phone, and a short landscape panel: the body scrolls. Bring the top (traces) or the end (the verdict and the
  // rail) into view. Where the body does not scroll, nothing moves.
  const follow = useCallback(
    (where: 'top' | 'end') => {
      const box = scroller(rootRef.current)
      if (!box) return
      const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
      box.scrollTo({ top: where === 'top' ? 0 : box.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    },
    [],
  )

  const onMomentState = useCallback(
    (s: MomentState) => {
      setState(s)
      onState(s)
      // a settled result (also a pinned one) is read at the rail
      if (s === 'result') requestAnimationFrame(() => follow('end'))
    },
    [onState, follow],
  )

  // While it plays, the view follows the story: the traces while the model reads, then the rail where it lands.
  useEffect(() => {
    const root = rootRef.current?.querySelector<HTMLElement>('.gm-root')
    if (!root) return
    let last = root.dataset.beat ?? ''
    const mo = new MutationObserver(() => {
      const beat = root.dataset.beat ?? ''
      if (beat === last) return
      const was = last
      last = beat
      if (beat === 'calibrate' || (beat === 'idle' && was !== '')) follow('top')
      else if (beat === 'read') follow('end')
    })
    mo.observe(root, { attributes: true, attributeFilter: ['data-beat'] })
    return () => mo.disconnect()
  }, [follow])

  // "How do we know?" gets its own row only where the moment keeps enough height: always on the phone sheet
  // (its body scrolls), on a landscape panel only when the body is tall enough (a projector, a big screen).
  const [room, setRoom] = useState(layout === 'sheet')
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (layout === 'sheet') {
      setRoom(true)
      return
    }
    const read = () => setRoom(el.clientHeight >= ROOM_FOR_NOTES)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [layout])
  useEffect(() => {
    if (!room) setHow(false)
  }, [room])

  // The notes cover the moment from its top: on a scrolled phone sheet, bring that top into view.
  useEffect(() => {
    if (how && layout === 'sheet') scroller(rootRef.current)?.scrollTo({ top: 0 })
  }, [how, layout])

  const closeHow = () => {
    setHow(false)
    howBtn.current?.focus({ preventScroll: true })
  }
  // Esc inside the stage closes the notes first (the shell leaves a prevented key alone).
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !how) return
    e.preventDefault()
    closeHow()
  }

  // The session's own result (a check-in made before playing comes with the stored one: not "how the run was made").
  const played = state === 'result' ? out : null

  return (
    <div ref={rootRef} className="gn-stage" data-layout={layout} data-how={how ? 1 : 0} onKeyDown={onKey}>
      <div className="gn-moment">
        <GarnMoment
          ref={moment}
          mode={mode}
          state={pin}
          style={TOKENS}
          onState={onMomentState}
          onResult={(result, act) => {
            setOut(result)
            onAct(pickAct(act))
          }}
          onReady={onReady}
        />
      </div>

      {room && (
        <div className="gn-foot">
          <button
            ref={howBtn}
            type="button"
            className="gn-how-btn"
            aria-expanded={how}
            aria-controls="gn-how"
            onClick={() => setHow((v) => !v)}
          >
            <Info aria-hidden="true" />
            <span>How do we know?</span>
          </button>
        </div>
      )}

      {room && how && (
        <div id="gn-how" className="gn-how" role="region" aria-label="How do we know?">
          <div className="gn-how-in">
            <p className="gn-how-k">How do we know?</p>
            <p>
              {garn.STRINGS.personLabel}. {garn.STRINGS.groundAnalog}
            </p>
            <p>
              {played
                ? played.source === 'live'
                  ? `The model answered all ${played.session.nWindows} windows in ${Math.round(played.timing.ms)} ms, in this browser. `
                  : `The grey line is ${garn.STRINGS.precomputedLabel}. `
                : 'Play gets the model’s answer for the whole recording at once. '}
              The animation then plays that finished answer. {garn.STRINGS.playback}
            </p>
            <p>{garn.STRINGS.garnDefinition}</p>
            {played && <p className="gn-how-card">{played.captions.resultCard}</p>}
          </div>
          <button type="button" className="gn-how-x" aria-label="Close" onClick={closeHow}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

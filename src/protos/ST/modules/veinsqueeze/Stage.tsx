// Station, VeinSqueeze: the working check in the panel. The ready-made moment ("the wink": two real leg-vein
// ultrasound clips of one patient, one hold) restyled to the film through its --m-* tokens only, plus the one tag
// its README leaves to the page: "Best case" beside the pair (the full sentence is the engine's HONESTY_HERO_PAIR).
// Laptop: the moment runs the real model live; phone: it shows the stored result (it decides that itself).
// It mounts with the panel: the slide-in is a compositor transition, and the moment fetches its 20 MB model only
// after its clips are decoded (about 2 s later), so the heavy work starts once the panel is open.
import { useCallback, useRef, type CSSProperties } from 'react'
import VeinSqueezeMoment, { type VeinSqueezeMomentHandle } from '../../../../moments/veinsqueeze'
import { HONESTY_HERO_PAIR } from '../../../../engine/veinsqueeze'
import { AMBER, MOMENT_TOKENS, pickAct, useStageControls } from '../kit'
import type { StageProps, StageState } from '../types'
import './stage.css'

type Tokens = CSSProperties & Record<`--${string}`, string>

/** The film palette on the moment: cold white words, the model's marks in the quiet blue, the viewer's press in
 *  amber, hairline frames with square corners. aspect-ratio auto: the panel body gives the moment its size. */
const FILM: Tokens = {
  ...MOMENT_TOKENS,
  '--m-ink-2': '#a9b5c2',
  '--m-line': 'rgba(232, 238, 245, 0.16)',
  '--m-mark': '#8fb3d9',
  '--m-accent': AMBER,
  '--m-radius': '2px',
  aspectRatio: 'auto',
}
/** A laptop: the two real clips side by side are the picture; their curves take a little less of the height. */
const SIDE: Tokens = { ...FILM, '--m-pad': '18px', '--m-gap': '16px', '--m-chart-h': '124px' }
/** A phone: the two clips stacked (stage.css gives the moment a tall box); a lower chart leaves the pictures more. */
const SHEET: Tokens = { ...FILM, '--m-pad': '8px', '--m-gap': '8px', '--m-chart-h': '52px' }

export default function Stage({ ref, layout, pinned, onState, onAct, onReady, onTall }: StageProps) {
  const moment = useRef<VeinSqueezeMomentHandle>(null)
  /** The moment ignores run() until its clips are decoded: an early press is kept and played then. */
  const ready = useRef(false)
  const waiting = useRef(false)
  const phase = useRef<StageState>('idle')
  // Phone: once the check runs, the sheet is pulled up so both clips and their curves are in view (stage.css sizes
  // the moment to fill it); Reset lets it back down to the frozen frame. Never on mount (the story is seen first).
  const sheet = layout === 'sheet'
  const tall = useRef({ sheet, onTall })
  tall.current = { sheet, onTall }
  const askTall = useCallback((t: boolean) => {
    if (tall.current.sheet) tall.current.onTall?.(t)
  }, [])

  const pin = useStageControls(
    ref,
    pinned,
    {
      run: () => {
        askTall(true)
        const m = moment.current
        if (m && phase.current === 'error') {
          // after a failed load the moment's own run() loads the clips again; the press waits for them
          m.run()
          if (!ready.current) waiting.current = true
        } else if (m && ready.current) m.run()
        else waiting.current = true
      },
      reset: () => {
        waiting.current = false
        askTall(false)
        moment.current?.reset()
      },
    },
    onAct,
  )

  const pinNow = useRef(pin)
  pinNow.current = pin
  const handleState = useCallback(
    (s: StageState) => {
      // the moment's own hold control starts a run too (a pinned address runs by itself: no ask then)
      if (s === 'running' && phase.current !== 'running' && !pinNow.current) askTall(true)
      phase.current = s
      onState(s)
    },
    [onState, askTall],
  )
  const handleReady = useCallback(() => {
    ready.current = true
    onReady()
    if (waiting.current) {
      waiting.current = false
      moment.current?.run()
    }
  }, [onReady])

  return (
    <div className="vsqst" data-layout={layout}>
      <div className="vsqst-top">
        <span className="vsqst-tag" title={HONESTY_HERO_PAIR}>
          Best case
        </span>
      </div>
      <div className="vsqst-body">
        <VeinSqueezeMoment
          ref={moment}
          state={pin}
          // A pinned result is the stored one (a test address); a press lets go of the pin and runs live again.
          mode={pin === 'result' ? 'replay' : 'auto'}
          style={layout === 'sheet' ? SHEET : SIDE}
          onState={handleState}
          onResult={(_result, act) => onAct(pickAct(act))}
          onReady={handleReady}
        />
      </div>
    </div>
  )
}

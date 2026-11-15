// BrainDrift stage (Station): the ready-made moment (src/moments/braindrift) in the panel, restyled into the film
// through its tokens only. A real brain MRI, cut open: drag the slider or press the panel's button and Model B
// re-reads the flown brain. On a laptop it runs live in the browser, on a phone it replays the stored outputs; the
// moment decides and tags it LIVE or REPLAY.
//
// Where the moment's own labels have no room (the phone sheet, a short laptop panel) they are switched off, and
// this file prints the same run-time numbers beside the brain, measured next to put in, with the colour key the
// moment's README asks a page to give in that case.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import BrainDriftMoment, { type BrainDriftMomentHandle, type MomentState } from '../../../../moments/braindrift'
import type { BrainDriftAct, FlightResult } from '../../../../engine/braindrift'
import { AMBER, MOMENT_TOKENS, pickAct, useStageControls } from '../kit'
import type { StageProps, StageState } from '../types'
import { brainRect, fmtMm, fmtPct, fmtPut, fmtPutMm, roomy, type Rect } from './readout'
import './stage.css'

type Tokens = CSSProperties & Record<`--${string}`, string>

/**
 * The film palette as the moment's tokens: the well of the panel, cold white, the amber of the lit windows for the
 * viewer's own hand (the slider), and a cold blue, quieter than the moment's own cyan, for what the model drew.
 */
const FILM: Tokens = {
  ...MOMENT_TOKENS,
  '--m-accent': AMBER,
  '--m-mark': '#8ec3ec',
  '--m-mark-2': '#f4f8fc',
  '--m-glow': '#8fb3d9',
  '--m-fluid': '#6f7b86',
  '--m-specimen': '#d8d0c3',
  '--m-glass': '#c9d3dc',
}
/** The same, for a stage under the moment's 300 px design minimum (the phone sheet). */
const FILM_COMPACT: Tokens = { ...FILM, minHeight: 0 }

export default function Stage({ ref, layout, active, pinned, onState, onAct, onReady }: StageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const moment = useRef<BrainDriftMomentHandle>(null)
  const last = useRef<StageState>('idle')
  const told = useRef(false)
  const retry = useRef(0)

  // The moment's labels need room; below that this stage prints the numbers itself.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const read = () => setSize((s) => (s && s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const full = size ? roomy(size.w, size.h) : layout === 'side'

  // Heavy work (WebGL, 4 MB of scan) waits until the panel has finished opening, so the opening stays smooth.
  const [go, setGo] = useState(active || pinned !== null)
  useEffect(() => {
    if (active) setGo(true)
  }, [active])

  const [result, setResult] = useState<FlightResult | null>(null)

  const tellReady = useCallback(() => {
    if (told.current) return
    told.current = true
    onReady()
  }, [onReady])

  // A press always lands: the moment ignores run() until its scan has loaded, so keep trying until it runs.
  const stop = () => window.clearInterval(retry.current)
  const tryRun = () => {
    moment.current?.run()
    return last.current === 'running'
  }
  const pin = useStageControls(
    ref,
    pinned,
    {
      run: () => {
        stop()
        if (tryRun()) return
        let n = 0
        retry.current = window.setInterval(() => {
          if (tryRun() || ++n > 75) stop()
        }, 200)
      },
      reset: () => {
        stop()
        setResult(null)
        moment.current?.reset()
      },
    },
    onAct,
  )
  useEffect(() => stop, [])

  const onMomentState = useCallback(
    (s: MomentState) => {
      last.current = s
      if (s === 'idle' || s === 'running') {
        setResult(null)
        onAct(null)
      }
      if (s === 'error') tellReady()
      onState(s)
    },
    [onState, onAct, tellReady],
  )
  const onMomentResult = useCallback(
    (r: FlightResult, a: BrainDriftAct) => {
      setResult(r)
      onAct(pickAct(a))
    },
    [onAct],
  )

  // Switching between the moment's labels and this stage's readout mounts a fresh moment: report the stage as idle.
  const mode = full ? 'full' : 'compact'
  const lastMode = useRef(mode)
  useEffect(() => {
    if (lastMode.current === mode) return
    lastMode.current = mode
    stop()
    setResult(null)
    if (last.current !== 'idle') {
      last.current = 'idle'
      onAct(null)
      onState('idle')
    }
  }, [mode, onAct, onState])

  // Watch the moment's root: when it says it is drawn, the panel may count the stage as ready; in compact mode,
  // where it says the brain stands places the readout beside it. Its slider is the stage's own control: the page's
  // main action stays the panel's button, so the slider gives up the `primary` test mark.
  const [brain, setBrain] = useState<Rect | null>(null)
  const mounted = go && !!size
  useLayoutEffect(() => {
    if (!mounted) return
    const el = rootRef.current?.querySelector<HTMLElement>('.bdm')
    if (!el) return
    el.querySelector('[data-qa="primary"]')?.removeAttribute('data-qa')
    const look = () => {
      if (el.getAttribute('data-ready') === '1') tellReady()
      const b = brainRect(el)
      setBrain((o) => (o && b && Math.abs(o.x0 - b.x0) + Math.abs(o.y0 - b.y0) + Math.abs(o.x1 - b.x1) + Math.abs(o.y1 - b.y1) < 1 ? o : b))
    }
    look()
    const mo = new MutationObserver(look)
    mo.observe(el, { attributes: true, attributeFilter: ['data-ready', 'style'] })
    return () => mo.disconnect()
  }, [mounted, mode, tellReady])

  return (
    <div ref={rootRef} className="stbd-stage" data-mode={mode}>
      {mounted && (
        <BrainDriftMoment
          key={mode}
          ref={moment}
          state={pin}
          labels={full}
          style={full ? FILM : FILM_COMPACT}
          onState={onMomentState}
          onResult={onMomentResult}
        />
      )}
      {!full && result && brain && size && <Readout result={result} brain={brain} w={size.w} h={Math.max(size.h, 280)} />}
    </div>
  )
}

/**
 * The measured numbers next to what the simulation put in, in the two free sides beside the brain: the fluid
 * spaces on the left with the key to the light colour, the rise of the brain's top on the right (where it is).
 */
function Readout({ result, brain, w, h }: { result: FlightResult; brain: Rect; w: number; h: number }) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const left = Math.max(0, brain.x0)
  const right = Math.max(0, w - brain.x1)
  const large = Math.min(left, right) >= 150
  const note = result.citedNumbers ? 'the published figure' : 'for illustration'
  // Between the moment's LIVE / REPLAY tag (top left) and its slider (the lowest 108 px): the fluid spaces level
  // with the middle of the brain, the rise level with its top.
  useLayoutEffect(() => {
    const place = (el: HTMLDivElement | null, want: number) => {
      if (!el) return
      const hh = el.offsetHeight
      el.style.top = `${Math.round(Math.max(44, Math.min(h - 108 - hh, want - hh / 2)))}px`
    }
    place(leftRef.current, (brain.y0 + brain.y1) / 2)
    place(rightRef.current, brain.y0 + (rightRef.current?.offsetHeight ?? 0) / 2)
  })
  return (
    <div className="stbd-read" data-size={large ? 'l' : 's'} aria-live="polite">
      <div ref={leftRef} className="stbd-read-block" data-side="l" style={{ width: Math.max(80, left - 16) }}>
        <span className="stbd-read-big">{fmtPct(result.measured.ventricleChangePct)}</span>
        <span className="stbd-read-cap">fluid spaces</span>
        <span className="stbd-read-sub" title={note}>
          <span>we put in</span> <b>{fmtPut(result.injected.ventricleChangePct)}</b>
        </span>
        <span className="stbd-read-key">
          <i aria-hidden="true" /> <span>fluid here</span> <span>now, not before</span>
        </span>
      </div>
      <div ref={rightRef} className="stbd-read-block" data-side="r" style={{ width: Math.max(80, right - 16) }}>
        <span className="stbd-read-mid">{fmtMm(result.measured.riseMm)}</span>
        <span className="stbd-read-cap">rise at the top of the brain</span>
        <span className="stbd-read-sub">
          <span>we put in</span> <b>{fmtPutMm(result.injected.riseMm)}</b>
        </span>
      </div>
    </div>
  )
}

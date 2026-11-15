// Station / BubbleGrade: the panel body, the working check.
// The ready-made moment (src/moments/bubblegrade) draws the real Doppler heart sound as the picture the model
// read, with the model's attention rising on it; it runs the real model on a laptop and the stored outputs on a
// phone. It is embedded bare (the picture and the model's own marks) and restyled only through its --m-* tokens.
// Round it this stage keeps the film's instrument look: a caption, the playhead and a time rail, the model-
// attention key, and the grade read out large. Every number and word on it comes from the moment or the engine
// at run time (grade, alert, technician grade, clip length, LIVE / REPLAY) or from work/Web/models/bubblegrade.md.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { SpeakerSimpleHigh, SpeakerSimpleSlash } from '@phosphor-icons/react'
import BubbleGradeMoment, { type BubbleGradeMomentHandle, type BubbleLive, type MomentState } from '../../../../moments/bubblegrade'
import * as bubble from '../../../../engine/bubblegrade'
import { AMBER, MOMENT_TOKENS, pickAct, useStageControls } from '../kit'
import type { StageProps } from '../types'
import './stage.css'

/** The hero clip (work/Web/cards/bubblegrade.md): a diver's heart Doppler recording, held out from training. */
const SAMPLE = 'grade-3'
/** The model hears 5-second slices: its first reading lands once the first slice has been heard. */
const SLICE_S = 5

/** The film palette as the moment's tokens: the well's black and cold white sound; the model's own marks (its
 *  attention tint and ridge) in the quiet cold blue, so the window amber stays for what is alive: the alert. */
const TOKENS = {
  ...MOMENT_TOKENS,
  '--m-stage': '#05070a',
  '--m-ink': '#e8eef5',
  '--m-mark': '#8fb3d9',
  '--m-mark-hot': '#e2eefb',
  '--m-accent': AMBER,
  minHeight: 0,
} as CSSProperties

type Grade = (typeof bubble.GRADES)[number]
interface Final {
  grade: Grade
  alert: boolean
  source: 'live' | 'precomputed'
}

const isCoarse = () => typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700)

export default function Stage({ ref, layout, active, pinned, onState, onAct, onReady }: StageProps) {
  const moment = useRef<BubbleGradeMomentHandle>(null)
  const wellRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const gripRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const waitRef = useRef<HTMLElement>(null)

  const [mState, setMState] = useState<MomentState>('idle')
  const stateNow = useRef<MomentState>('idle')
  const [beat, setBeat] = useState('idle')
  const [live, setLive] = useState<BubbleLive | null>(null)
  const [final, setFinal] = useState<Final | null>(null)
  const [source, setSource] = useState<'live' | 'precomputed'>('precomputed')
  const [clip, setClip] = useState<{ durS: number; tech: Grade } | null>(null)
  const [muted, setMuted] = useState(false)
  const mutedNow = useRef(false)
  const told = useRef(false)

  const momentRoot = () => wellRef.current?.querySelector<HTMLElement>('.bgm') ?? null

  // ------------------------------------------------------------------------------------- the panel's buttons
  const run = useCallback(() => {
    // The shell repeats run() until the check reports running: repeats are one press.
    if (stateNow.current === 'running') return
    moment.current?.run({ sound: !mutedNow.current })
  }, [])
  const reset = useCallback(() => moment.current?.reset(), [])
  const pin = useStageControls(ref, pinned, { run, reset }, onAct)

  // ------------------------------------------------------------------------------- what the moment reports
  const onMomentState = useCallback(
    (s: MomentState) => {
      stateNow.current = s
      setMState(s)
      if (s !== 'result') setFinal(null)
      onState(s)
    },
    [onState],
  )
  const onResult = useCallback(
    (r: bubble.BubbleResult, act: bubble.BubbleActDecision) => {
      setFinal({ grade: r.clip.grade, alert: r.clip.alert, source: r.source })
      onAct(pickAct(act))
    },
    [onAct],
  )

  // The clip's length and the technician's grade, from the engine's sample list.
  useEffect(() => {
    let alive = true
    bubble.listSamples().then(
      (list) => {
        const s = list.find((x) => x.id === SAMPLE)
        if (alive && s) setClip({ durS: s.meta.durS, tech: s.meta.technicianGrade })
      },
      () => {},
    )
    return () => {
      alive = false
    }
  }, [])

  // On a laptop the real model is fetched as soon as the panel is open, so the first press starts at once.
  useEffect(() => {
    if (!active || pinned || isCoarse() || !bubble.info.live) return
    const t = window.setTimeout(() => void bubble.load().catch(() => {}), 600)
    return () => window.clearTimeout(t)
  }, [active, pinned])

  // The moment paints its own default colour until its clip has loaded: have it read the film tokens at once.
  useEffect(() => {
    moment.current?.restyle()
  }, [])

  // The moment's own attributes drive the playhead, the clock and the tags. The playhead is written straight to
  // the DOM (no React render per frame).
  const [loaded, setLoaded] = useState(false)
  const durRef = useRef(0)
  durRef.current = clip?.durS ?? 0
  useEffect(() => {
    const el = momentRoot()
    if (!el) return
    const read = () => {
      const t = Number(el.dataset.clipS ?? 0)
      const d = durRef.current
      const p = d > 0 ? Math.min(1, Math.max(0, t / d)) : 0
      const tf = `translate3d(${(p * 100).toFixed(3)}%, 0, 0)`
      if (headRef.current) headRef.current.style.transform = tf
      if (gripRef.current) gripRef.current.style.transform = tf
      if (timeRef.current) timeRef.current.textContent = t.toFixed(1)
      if (waitRef.current) waitRef.current.style.transform = `scaleX(${Math.min(1, t / SLICE_S).toFixed(4)})`
      setBeat(el.dataset.beat ?? 'idle')
      setSource(el.dataset.source === 'live' ? 'live' : 'precomputed')
      if (el.dataset.ready === '1') {
        setLoaded(true)
        if (!told.current) {
          told.current = true
          onReady()
        }
      }
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-clip-s', 'data-beat', 'data-source', 'data-ready', 'data-state'] })
    return () => mo.disconnect()
  }, [onReady, clip])

  // A run asked for with sound that the person has since muted stays silent once the clip starts.
  useEffect(() => {
    if (beat !== 'listen' || !muted) return
    if (momentRoot()?.dataset.sound === '1') moment.current?.setSound(false)
  }, [beat, muted])

  const toggleSound = () => {
    const next = !muted
    mutedNow.current = next
    setMuted(next)
    // While the clip plays the sound follows at once; otherwise the choice holds for the next run.
    if (stateNow.current === 'running' && momentRoot()?.dataset.beat === 'listen') moment.current?.setSound(!next)
  }

  // ------------------------------------------------------------------------------------------- the readout
  const running = mState === 'running'
  const playing = running && (beat === 'listen' || beat === 'settle')
  const done = mState === 'result' && final
  const grade: Grade | null = done ? final.grade : running ? (live?.grade ?? null) : null
  const alert = done ? final.alert : running ? !!live?.alert : false
  const shownSource = done ? final.source : source
  const listening = playing && grade === null
  const dur = clip ? clip.durS : 0
  const ticks = dur > 0 ? Array.from({ length: Math.floor(dur) + 1 }, (_, i) => i) : []
  const sheet = layout === 'sheet'
  const showSrc = done || playing

  // ---------------------------------------------------------------------------------------------- pieces
  const numeral =
    grade !== null ? (
      <span key={grade} className="stbg-num">
        {grade}
      </span>
    ) : (
      // A dim dash in the numeral's own face, so "of IV" keeps its baseline when the grade lands.
      <span className="stbg-num stbg-num--none" aria-hidden="true">
        –
      </span>
    )
  const status = listening ? (
    <p className="stbg-wait">
      <span>Listening</span>
      <i>
        <b ref={waitRef} />
      </i>
    </p>
  ) : grade !== null ? (
    <p className="stbg-alert">
      <i aria-hidden="true" />
      <span>{alert ? 'Model: alert' : 'Model: no alert'}</span>
    </p>
  ) : (
    <p className="stbg-hint">{running ? 'Starting' : sheet ? 'First reading at 5 s' : 'First reading after 5 s of sound'}</p>
  )
  // Kept in the layout from the start (hidden until the result), so nothing moves when it lands.
  const tech = (
    <p className="stbg-tech" data-on={done ? 1 : 0} aria-hidden={done ? undefined : true}>
      <span>Technician</span>
      <b>{clip?.tech ?? ''}</b>
    </p>
  )
  const src = (
    <p className="stbg-src" data-src={shownSource} data-on={showSrc ? 1 : 0} title={shownSource === 'live' ? 'The real model, running in this browser' : bubble.HONESTY.precomputed}>
      <span>{shownSource === 'live' ? 'Live' : 'Replay'}</span>
      {!sheet && <em>{shownSource === 'live' ? 'running in this browser' : bubble.HONESTY.precomputed}</em>}
    </p>
  )
  const sound = (
    <button type="button" className="st-btn st-btn--quiet stbg-sound" aria-pressed={!muted} aria-label={sheet ? (muted ? 'Sound off' : 'Sound on') : undefined} onClick={toggleSound}>
      {muted ? <SpeakerSimpleSlash aria-hidden="true" /> : <SpeakerSimpleHigh aria-hidden="true" />}
      {!sheet && <span>{muted ? 'Sound off' : 'Sound on'}</span>}
    </button>
  )
  const key = (
    <p className="stbg-key">
      <i aria-hidden="true" />
      <span>Model attention</span>
      {!sheet && <em>where the model heard bubble-like sound</em>}
    </p>
  )

  return (
    <div className="stbg" data-layout={layout} data-state={mState} data-playing={playing ? 1 : 0} data-alert={alert ? 1 : 0} data-loaded={loaded ? 1 : 0}>
      <div className="stbg-cap">
        <span className="stbg-cap-what">Diver’s heart sound</span>
        <span className="stbg-cap-time">
          <span className="stbg-cap-now" data-on={playing ? 1 : 0}>
            <span ref={timeRef}>0.0</span>
            <i>/</i>
          </span>
          {dur > 0 ? `${dur.toFixed(1)} s` : ''}
        </span>
        {sheet && src}
        {sheet && sound}
      </div>

      <div className="stbg-well" ref={wellRef}>
        <div className="stbg-pic">
          <BubbleGradeMoment
            ref={moment}
            sampleId={SAMPLE}
            bare
            state={pin}
            style={TOKENS}
            onState={onMomentState}
            onLive={setLive}
            onResult={onResult}
          />
        </div>
        <div className="stbg-head" ref={headRef} aria-hidden="true">
          <i />
        </div>
        <span className="stbg-corner" data-c="tl" aria-hidden="true" />
        <span className="stbg-corner" data-c="tr" aria-hidden="true" />
        <span className="stbg-corner" data-c="bl" aria-hidden="true" />
        <span className="stbg-corner" data-c="br" aria-hidden="true" />
        {sheet && key}
      </div>

      <div className="stbg-rail" aria-hidden="true">
        <div className="stbg-rail-line">
          {ticks.map((s) => (
            <i key={s} data-long={s % 5 === 0 ? 1 : 0} style={{ left: `${((s / dur) * 100).toFixed(3)}%` }} />
          ))}
        </div>
        {ticks
          .filter((s) => s % 5 === 0)
          .map((s) => (
            <span key={s} className="stbg-sec" data-first={s === 0 ? 1 : 0} style={{ left: `${((s / dur) * 100).toFixed(3)}%` }} data-qa="tick">
              {s} s
            </span>
          ))}
        <div className="stbg-grip" ref={gripRef}>
          <i />
        </div>
      </div>

      {!sheet && key}

      {sheet ? (
        <div className="stbg-read" data-has={grade !== null ? 1 : 0} aria-live="polite">
          <div className="stbg-read-num">{numeral}</div>
          <p className="stbg-read-lab">
            <span>Grade</span>
            <span>of IV</span>
          </p>
          <i className="stbg-read-sep" aria-hidden="true" />
          <div className="stbg-read-st">
            {status}
            {tech}
          </div>
        </div>
      ) : (
        <div className="stbg-read" data-has={grade !== null ? 1 : 0}>
          <div className="stbg-read-main" aria-live="polite">
            <p className="stbg-read-k">Bubble grade</p>
            <div className="stbg-read-num">
              {numeral}
              <span className="stbg-of">of IV</span>
            </div>
            {status}
          </div>
          {tech}
          <div className="stbg-read-foot">
            {src}
            {sound}
          </div>
        </div>
      )}
    </div>
  )
}

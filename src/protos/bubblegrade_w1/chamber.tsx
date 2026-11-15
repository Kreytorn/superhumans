// BubbleGrade w1, the first screen: "the listening chamber". The real heart recording becomes a landscape you stand inside.
// Shared by #/proto/bubblegrade_w1/home (index.tsx) and DF's BubbleGrade page (protos/DF/pages/bubblegrade.tsx).
// Every number on screen is read from the engine result for the chosen clip (app/src/engine/bubblegrade).
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import '@fontsource-variable/syne'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import * as bubble from '../../engine/bubblegrade'
import type { BubbleResult, BubbleSample, CrewInputs, SymptomTypeI, SymptomTypeII } from '../../engine/bubblegrade'
import { createChamber, type Chamber } from './scene'
import ReviewLine, { reviewOf } from '../../components/ReviewLine'
import './w1.css'

const SENTENCE = 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.'
export const CLIPS = ['grade-0', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'dcs-dive'] as const
export const isClip = (id: string | null | undefined): id is (typeof CLIPS)[number] => !!id && (CLIPS as readonly string[]).includes(id)
const isPhone = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700
const CHIPS_I: SymptomTypeI[] = [bubble.SYMPTOMS_TYPE_I[0], bubble.SYMPTOMS_TYPE_I[2]]
const CHIPS_II: SymptomTypeII[] = [bubble.SYMPTOMS_TYPE_II[0], bubble.SYMPTOMS_TYPE_II[4]]

export type ChamberPhase = 'idle' | 'running' | 'result'
/** What the chamber tells its page: its clip is on screen, the phase, a failed load, and the result's source and grade. */
export interface ChamberReport {
  ready: boolean
  phase: ChamberPhase
  error: boolean
  source: string
  grade: string
}

export interface ListeningChamberProps {
  /** The clip on screen (one of CLIPS); the page owns it so its own sections can follow it. */
  clip: string
  onClip: (id: string) => void
  /** 'result' opens on the finished result; the first press on play lets go of it. */
  pin?: string | null
  /** False while the page is still flying in: the WebGL landscape and the clip data wait for it. */
  live?: boolean
  /** The control at top-left (W1: "All checks"; DF: its Back to the body). */
  back: ReactNode
  onReport?: (r: ChamberReport) => void
  /** The "why bubbles" cue at the bottom of the screen. */
  onCue?: () => void
  /** Its words (default "Why bubbles, and how we built it"; the DF page says "The problem, and the model", like every DF check). */
  cue?: string
  /** Called inside the play press (W1 scrolls its page to the top there). */
  onPlay?: () => void
}

// the last 4 s before the playhead: loudness of the real recording (line) over the model's attention (amber)
function drawScope(cv: HTMLCanvasElement | null, lv: Float32Array | null, att: Float32Array, stepS: number, s: number) {
  if (!cv || !lv) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = Math.round(cv.clientWidth * dpr)
  const H = Math.round(cv.clientHeight * dpr)
  if (!W || !H) return
  if (cv.width !== W || cv.height !== H) {
    cv.width = W
    cv.height = H
  }
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const span = 4
  const n = Math.min(240, Math.round(W / (2 * dpr)))
  const bw = W / n
  for (let i = 0; i < n; i++) {
    const t = s - span + (span * (i + 0.5)) / n
    if (t < 0) continue
    const a = att[Math.min(att.length - 1, Math.floor(t / stepS))] ?? 0
    const v = lv[Math.min(lv.length - 1, Math.floor(t / 0.01))] ?? 0
    const h = Math.max(1, v * H * 0.9)
    ctx.fillStyle = `rgba(255,154,61,${0.1 + 0.8 * a * a})`
    ctx.fillRect(i * bw, H - h, Math.max(1, bw - dpr), h)
  }
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const t = s - span + (span * (i + 0.5)) / n
    if (t < 0) continue
    const v = lv[Math.min(lv.length - 1, Math.floor(t / 0.01))] ?? 0
    const y = H - Math.max(1, v * H * 0.9)
    if (i === 0 || s - span + (span * (i - 0.5)) / n < 0) ctx.moveTo(i * bw, y)
    else ctx.lineTo(i * bw, y)
  }
  ctx.strokeStyle = 'rgba(190,240,255,0.95)'
  ctx.lineWidth = 1.4 * dpr
  ctx.shadowColor = 'rgba(63,208,255,0.9)'
  ctx.shadowBlur = 8 * dpr
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  ctx.fillRect(W - 2 * dpr, 0, 2 * dpr, H)
}

function statusWord(who: string) {
  if (who.startsWith('self')) return 'You'
  if (who.startsWith('crew medical')) return 'Crew medic'
  if (who.startsWith('flight surgeon')) return 'Flight surgeon'
  return who
}

export default function ListeningChamber({ clip, onClip, pin, live = true, back, onReport, onCue, cue = 'Why bubbles, and how we built it', onPlay }: ListeningChamberProps) {
  const sampleId = clip
  const [samples, setSamples] = useState<BubbleSample[]>([])
  const [stored, setStored] = useState<BubbleResult | null>(null)
  const [live_, setLive] = useState<BubbleResult | null>(null)
  const [phase, setPhase] = useState<ChamberPhase>('idle')
  const [heard, setHeard] = useState(0)
  const [loading, setLoading] = useState<number | null>(null)
  const [sound, setSound] = useState(true)
  const [crew, setCrew] = useState<CrewInputs>({})
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chamberRef = useRef<Chamber | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLCanvasElement>(null)
  const loudRef = useRef<HTMLSpanElement>(null)
  const attRef = useRef<HTMLSpanElement>(null)
  const attWordRef = useRef<HTMLElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLElement>(null)
  const storedRef = useRef<BubbleResult | null>(null)
  const levelRef = useRef<Float32Array | null>(null)
  const phaseRef = useRef<ChamberPhase>('idle')
  const heardRef = useRef(0)
  const sampleRef = useRef(sampleId)
  const pinRef = useRef(pin)
  const clock = useRef({ t0: 0 })
  const pointer = useRef({ x: 0, y: 0 })
  const liveQueue = useRef<Promise<void>>(Promise.resolve())
  const liveDead = useRef(false)

  const goPhase = useCallback((p: ChamberPhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  useEffect(() => {
    bubble.listSamples().then(setSamples).catch(() => {})
  }, [])

  // the stored outputs of the same model: the picture the idle screen shows, and the phone / fallback result
  useEffect(() => {
    if (!live) return
    let dead = false
    sampleRef.current = sampleId
    audioRef.current?.pause()
    if (phaseRef.current === 'running') goPhase('idle')
    setLive(null)
    setCrew({})
    bubble
      .replay(sampleId)
      .then((r) => {
        if (dead) return
        storedRef.current = r
        const sp = r.spectrogram
        if (sp) {
          const lv = new Float32Array(sp.cols)
          let lo = Infinity
          let hi = -Infinity
          for (let c = 0; c < sp.cols; c++) {
            let m = 0
            for (let row = 0; row < sp.rows; row++) m += sp.data[row * sp.cols + c]
            lv[c] = m / sp.rows
            if (lv[c] < lo) lo = lv[c]
            if (lv[c] > hi) hi = lv[c]
          }
          for (let c = 0; c < sp.cols; c++) lv[c] = (lv[c] - lo) / Math.max(1e-6, hi - lo)
          levelRef.current = lv
        }
        chamberRef.current?.setData(sp, r.bubbleMap)
        setStored(r)
        const end = pinRef.current === 'result'
        heardRef.current = end ? r.windows.length : 0
        setHeard(heardRef.current)
        goPhase(end ? 'result' : 'idle')
        setFailed(false)
        setReady(true)
      })
      .catch((e) => {
        if (dead) return
        console.warn('bubblegrade_w1: stored outputs failed', e)
        setFailed(true)
      })
    return () => {
      dead = true
    }
  }, [sampleId, live, goPhase])

  // the chamber and its one clock (only once the page has landed: the landscape is the heavy part)
  useEffect(() => {
    if (!live) return
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas) return
    let chamber: Chamber
    try {
      chamber = createChamber(canvas)
    } catch (e) {
      console.warn('bubblegrade_w1: no WebGL', e)
      return
    }
    chamberRef.current = chamber
    if (storedRef.current) chamber.setData(storedRef.current.spectrogram, storedRef.current.bubbleMap)
    // layout size, not the on-screen box: a page that is still being scaled in would report a scaled box
    const fit = () => chamber.resize(Math.max(2, canvas.clientWidth), Math.max(2, canvas.clientHeight), Math.min(window.devicePixelRatio || 1, 1.75))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    // scrolled out of sight: the clock keeps running, the landscape stops drawing
    let onScreen = true
    const io = section
      ? new IntersectionObserver((es) => {
          onScreen = es[es.length - 1]?.isIntersecting ?? true
        })
      : null
    if (section) io?.observe(section)
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const st = storedRef.current
      let head = 0
      let level = 0
      let att = 0
      let mode: 0 | 1 | 2 = 0
      if (st) {
        const dur = st.durS
        if (phaseRef.current === 'running') {
          const a = audioRef.current
          const now = performance.now()
          if (a && !a.paused && a.currentTime > 0) clock.current.t0 = now - a.currentTime * 1000
          let s = (now - clock.current.t0) / 1000
          if (s >= dur) s = dur
          head = s / dur
          mode = 1
          const lv = levelRef.current
          if (lv) level = lv[Math.min(lv.length - 1, Math.floor(s / 0.01))]
          const bm = st.bubbleMap
          att = bm.values[Math.min(bm.values.length - 1, Math.floor(s / bm.stepS))] ?? 0
          let n = 0
          for (const w of st.windows) if (w.t1 <= s + 1e-3) n++
          if (n !== heardRef.current) {
            heardRef.current = n
            setHeard(n)
          }
          if (timeRef.current) timeRef.current.textContent = s.toFixed(1)
          if (loudRef.current) loudRef.current.style.transform = `scaleX(${Math.max(0.02, level)})`
          if (attRef.current) attRef.current.style.transform = `scaleX(${Math.max(0.02, att)})`
          if (attWordRef.current) attWordRef.current.textContent = att >= 0.62 ? 'high' : att >= 0.3 ? 'rising' : 'low'
          const first = st.windows[0]?.t1 ?? 5
          if (ringRef.current) ringRef.current.style.setProperty('--p', String(Math.min(1, s / first)))
          if (countRef.current) countRef.current.textContent = Math.max(0, first - s).toFixed(1)
          drawScope(scopeRef.current, levelRef.current, bm.values, bm.stepS, s)
          if (railRef.current) railRef.current.style.transform = `scaleX(${head})`
          if (s >= dur) {
            heardRef.current = st.windows.length
            setHeard(st.windows.length)
            phaseRef.current = 'result'
            setPhase('result')
          }
        } else if (phaseRef.current === 'result') {
          head = 1
          mode = 2
          att = st.clip.alert ? 1 : 0
          if (railRef.current) railRef.current.style.transform = 'scaleX(1)'
        } else if (railRef.current) railRef.current.style.transform = 'scaleX(0)'
      }
      if (onScreen) chamber.frame({ head, level, att, mode, px: pointer.current.x, py: pointer.current.y })
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io?.disconnect()
      chamber.dispose()
      chamberRef.current = null
    }
  }, [live])

  // leaving the page stops the sound
  useEffect(() => {
    const a = audioRef.current
    return () => a?.pause()
  }, [])

  const runLive = useCallback((id: string) => {
    if (liveDead.current) return
    liveQueue.current = liveQueue.current.then(async () => {
      try {
        setLoading((v) => v ?? 0)
        await bubble.load((p) => setLoading(p.total ? Math.min(1, p.loaded / p.total) : 0))
        const r = await bubble.analyze(id)
        if (sampleRef.current === id) setLive(r)
      } catch (e) {
        console.warn('bubblegrade_w1: live run failed, showing the stored outputs', e)
        liveDead.current = true
      } finally {
        setLoading(null)
      }
    })
  }, [])

  const stop = useCallback(() => {
    audioRef.current?.pause()
    heardRef.current = 0
    setHeard(0)
    goPhase('idle')
  }, [goPhase])

  // the one press: the sound starts inside this tap, and the same press runs the model on the whole clip
  const run = useCallback(() => {
    if (!storedRef.current) return
    if (phaseRef.current === 'running') return stop()
    const a = audioRef.current
    const wasPinned = pinRef.current === 'result'
    pinRef.current = undefined
    setCrew({})
    heardRef.current = 0
    setHeard(0)
    clock.current.t0 = performance.now()
    if (a) {
      a.muted = !sound
      try {
        a.currentTime = 0
      } catch {
        /* not loaded yet */
      }
      a.play().catch(() => {})
    }
    goPhase('running')
    onPlay?.()
    if (!isPhone() && !wasPinned) runLive(sampleRef.current)
  }, [sound, stop, goPhase, runLive, onPlay])

  const pick = useCallback(
    (id: string) => {
      if (id === sampleRef.current) return
      audioRef.current?.pause()
      heardRef.current = 0
      setHeard(0)
      goPhase('idle')
      onClip(id)
    },
    [goPhase, onClip],
  )

  // the clip picker is one radio group: arrows move the choice (and the focus) along it
  const onClipKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = CLIPS.indexOf(sampleRef.current as (typeof CLIPS)[number])
    const next = CLIPS[(i + step + CLIPS.length) % CLIPS.length]
    pick(next)
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('.bgw1-clip')
    btns[CLIPS.indexOf(next)]?.focus()
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = !sound
  }, [sound])

  const res = live_ && live_.sampleId === sampleId ? live_ : stored
  const sample = samples.find((s) => s.id === sampleId)
  const decision = useMemo(() => (res && phase === 'result' ? bubble.act(res, crew) : null), [res, phase, crew])

  // what the slices heard so far say (running mean, exactly as the clip grade is built)
  const so = useMemo(() => {
    if (!res) return null
    if (phase === 'result') return { E: res.clip.E, g: res.clip.g, A: res.clip.A, alert: res.clip.alert }
    const ws = res.windows.slice(0, heard)
    if (!ws.length) return null
    const m = [0, 0, 0, 0]
    for (const w of ws) for (let k = 0; k < 4; k++) m[k] += w.pGe[k] / ws.length
    return { E: m[0] + m[1] + m[2] + m[3], g: m.filter((p) => p > 0.5).length, A: m[2], alert: m[2] >= res.clip.tau }
  }, [res, phase, heard])

  const source = res?.source ?? ''
  const grade = phase === 'result' ? (res?.clip.grade ?? '') : ''
  useEffect(() => {
    onReport?.({ ready, phase, error: failed, source, grade })
  }, [onReport, ready, phase, failed, source, grade])

  const tech = sample?.meta.technicianGrade
  const isLive = res?.source === 'live'
  const dur = stored?.durS ?? 0
  const sev = decision?.severity ?? 'nominal'
  const toggle = <T extends string>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v])

  return (
    <section
      ref={sectionRef}
      className="bgw1-chamber"
      data-phase={phase}
      data-alert={so?.alert ? '1' : '0'}
      data-sev={sev}
      onPointerMove={(e) => {
        pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
        pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
      }}
    >
      <audio ref={audioRef} src={bubble.assetUrl(`bubblegrade/clips/${sampleId}.wav`)} preload="auto" />
      <canvas ref={canvasRef} className="bgw1-canvas" data-qa="hero" aria-label="The heart recording drawn as a landscape: height is loudness, the amber tint is model attention" role="img" />
      <div className="bgw1-shade" aria-hidden="true" />

      <header className="bgw1-top">
        {back}
        <span className="bgw1-crumb">SuperHumans <i>/</i> check 02 of 06 <i>/</i> heart</span>
        <span className="bgw1-prov">
          <b />
          <span>Real diver recording<em>, never heard in training</em></span>
        </span>
      </header>

      <div className="bgw1-title">
        <p className="bgw1-eyebrow">Heart Doppler sound <i /> <span>after the airlock closes</span></p>
        <h1>
          Bubble<em>Grade</em>
        </h1>
        <p className="bgw1-sentence">{SENTENCE}</p>
        <div className="bgw1-clips" role="radiogroup" aria-label="Six real clips, named by the technician's grade" onKeyDown={onClipKey}>
          <span className="bgw1-clips-k">Technician heard</span>
          {CLIPS.map((id) => {
            const s = samples.find((x) => x.id === id)
            const label = id === 'dcs-dive' ? 'Bends dive' : (s?.meta.technicianGrade ?? ['0', 'I', 'II', 'III', 'IV'][Number(id.slice(-1))] ?? id.slice(-1))
            return (
              <button
                key={id}
                type="button"
                className="bgw1-clip"
                role="radio"
                aria-checked={id === sampleId}
                tabIndex={id === sampleId ? 0 : -1}
                onClick={() => pick(id)}
                title={s ? `${s.label}, ${s.meta.durS.toFixed(1)} s, ${s.meta.site}` : id}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <aside className="bgw1-gauge" aria-live="polite">
        <div className="bgw1-gauge-head">
          <span className="bgw1-k">Bubble grade</span>
          {isLive && phase !== 'idle' ? (
            <span className="bgw1-tag is-live" title={`Model run in this browser: ${res?.timing.backend}, ${Math.round(res?.timing.ms ?? 0)} ms`}>
              <b />LIVE <small>{res?.timing.backend} {Math.round(res?.timing.ms ?? 0)} ms</small>
            </span>
          ) : loading !== null && phase === 'running' ? (
            <span className="bgw1-tag is-load" title="Loading the model into this browser">
              <b />
              {loading < 0.999 ? `LOADING MODEL ${Math.round(loading * 100)}%` : 'STARTING MODEL'}
            </span>
          ) : phase !== 'idle' ? (
            <span className="bgw1-tag" title={bubble.HONESTY.precomputed}>REPLAY</span>
          ) : (
            <span className="bgw1-tag is-quiet">STANDING BY</span>
          )}
        </div>
        <div className="bgw1-grade" data-on={so ? '1' : '0'} data-final={phase === 'result' ? '1' : '0'}>
          {!so && phase === 'running' ? (
            <span className="bgw1-ring" ref={ringRef} aria-hidden="true">
              <span>
                <b ref={countRef}>5.0</b>
                <i>s</i>
              </span>
            </span>
          ) : (
            <span className="bgw1-numeral" key={so ? bubble.GRADES[so.g] : 'none'}>{so ? bubble.GRADES[so.g] : '?'}</span>
          )}
          <span className="bgw1-of">
            <b>of IV</b>
            <i>{phase === 'result' ? 'Spencer scale' : so ? 'so far' : phase === 'running' ? 'until the first verdict' : 'press play'}</i>
          </span>
        </div>
        <div className="bgw1-scale" aria-hidden="true">
          <div className="bgw1-scale-track">
            <div className="bgw1-needle" style={{ left: `${((so?.E ?? 0) / 4) * 100}%`, opacity: so ? 1 : 0 }} />
            {bubble.GRADES.map((g, i) => (
              <span key={g} className="bgw1-stop" data-lit={so && so.g === i ? '1' : '0'} data-tech={phase === 'result' && tech === g ? '1' : '0'} style={{ left: `${(i / 4) * 100}%` }}>
                <b>{g}</b>
              </span>
            ))}
          </div>
        </div>
        <p className="bgw1-verdict">
          {failed && !stored
            ? 'This clip could not load here.'
            : phase === 'result' && res && tech
              ? tech === res.clip.grade
                ? `The human technician also heard ${tech}.`
                : `A miss: the human technician heard ${tech}.`
              : phase === 'running'
                ? 'The model hears five seconds at a time.'
                : 'A technician graded this clip by ear. So will the model.'}
        </p>
        <div className="bgw1-slices">
          <div className="bgw1-slices-bars" aria-hidden="true">
            {(res?.windows ?? []).map((w, i) => (
              <i key={i} data-on={i < heard || phase === 'result' ? '1' : '0'} data-alert={w.A >= (res?.clip.tau ?? 1) ? '1' : '0'} style={{ height: `${10 + (w.E / 4) * 90}%` }} />
            ))}
          </div>
          <p>
            <span>each 5-second slice, on its own</span>
            <b data-alert={so?.alert ? '1' : '0'}>{so ? (so.alert ? 'model: alert' : 'model: no alert') : ''}</b>
          </p>
        </div>
      </aside>

      <div className="bgw1-deck">
        <div className="bgw1-act" data-show={decision ? '1' : '0'} data-sev={sev}>
          {decision ? (
            <>
              <div className="bgw1-act-who">
                <span className="bgw1-mark" aria-hidden="true">
                  {sev === 'nominal' ? (
                    <svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m7.5 12.4 3 3 6-6.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 3.2 22 20.5H2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 10v5M12 17.6v.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
                  )}
                </span>
                <strong>{statusWord(decision.whoActs)}</strong>
              </div>
              <p className="bgw1-act-line">{decision.headline}</p>
              <p className="bgw1-act-sub">
                <span>{decision.tierName}</span>
                <i>{bubble.HONESTY.card}</i>
              </p>
              <ReviewLine review={reviewOf(decision.whoActs)} className="is-after" color="var(--mc, var(--cyan))" />
              <div className="bgw1-symptoms" role="group" aria-label="Symptom checklist: symptoms always win over bubbles">
                <span>Any symptoms?</span>
                {CHIPS_I.map((s) => (
                  <button key={s} type="button" aria-pressed={!!crew.typeI?.includes(s)} onClick={() => setCrew((c) => ({ ...c, typeI: toggle(c.typeI, s) }))}>{s}</button>
                ))}
                {CHIPS_II.map((s) => (
                  <button key={s} type="button" aria-pressed={!!crew.typeII?.includes(s)} onClick={() => setCrew((c) => ({ ...c, typeII: toggle(c.typeII, s) }))}>{s}</button>
                ))}
              </div>
            </>
          ) : phase === 'running' ? (
            <div className="bgw1-console">
              <p className="bgw1-console-k">
                <b />
                Listening now <span>last 4 s of the recording</span>
              </p>
              <canvas ref={scopeRef} className="bgw1-scope" aria-hidden="true" />
              <div className="bgw1-meters">
                <p>
                  <span>loudness</span>
                  <span className="bgw1-meter"><span ref={loudRef} /></span>
                </p>
                <p title={bubble.HONESTY.bubbleMap}>
                  <span>model attention</span>
                  <span className="bgw1-meter is-amber"><span ref={attRef} /></span>
                  <em ref={attWordRef}>low</em>
                </p>
              </div>
            </div>
          ) : (
            <p className="bgw1-act-wait">
              This landscape is a heartbeat: {dur ? `${dur.toFixed(1)} seconds` : 'a few seconds'} of real Doppler sound. Press play to hear it and grade it.
            </p>
          )}
        </div>

        <div className="bgw1-play-wrap">
          <button type="button" className="bgw1-play" data-qa="primary" data-phase={phase} onClick={run} disabled={!stored} aria-label={phase === 'running' ? 'Stop' : phase === 'result' ? 'Play the heart sound again' : 'Play the heart sound'}>
            <span className="bgw1-play-ring" aria-hidden="true" />
            <span className="bgw1-play-ring r2" aria-hidden="true" />
            {phase === 'running' ? (
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M8.2 4.6v14.8L20 12Z" fill="currentColor" /></svg>
            )}
          </button>
          <div className="bgw1-play-meta">
            <strong>{phase === 'running' ? 'Listening' : phase === 'result' ? 'Play it again' : 'Play the heart sound'}</strong>
            <span>
              <span ref={timeRef}>{phase === 'result' ? dur.toFixed(1) : '0.0'}</span> / {dur.toFixed(1)} s
            </span>
            <div className="bgw1-rail"><div ref={railRef} /></div>
          </div>
          <button type="button" className="bgw1-sound" aria-pressed={sound} onClick={() => setSound((v) => !v)} aria-label={sound ? 'Sound on: tap to mute' : 'Sound off: tap to unmute'} title={sound ? 'Sound on' : 'Sound off'}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4Z" fill="currentColor" />
              {sound ? <path d="M15.2 8.6a4.8 4.8 0 0 1 0 6.8M17.8 6a8.4 8.4 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : <path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
            </svg>
          </button>
        </div>

        <div className="bgw1-legend">
          <p><i className="sw-h" />height: loudness of the real recording</p>
          <p><i className="sw-d" />near: high pitch <span>/</span> far: low pitch</p>
          <p title={bubble.HONESTY.bubbleMap}><i className="sw-a" />amber: model attention</p>
          <p><i className="sw-o" />sphere: the sound under the playhead</p>
        </div>
      </div>

      {onCue && (
        <button type="button" className="bgw1-cue" onClick={onCue}>
          {cue}
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </section>
  )
}

// Garn Meter, free take W1 "The horizon tilts": the check as a place. A hologram head wears 14 rings of real
// recorded brainwaves (one turn = the 4 s the model reads). The ring plane is the gauge: only the crew check-in tilts it.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as garn from '../../engine/garnmeter'
import type { Card, GarnAct, GarnResult, GarnTrial } from '../../engine/garnmeter'
import { preferBackends } from '../../lib/infer/client'
import { createScene, type SceneHandle } from './scene'
import { GarnScalp } from '../../moments/garnmeter/scalp'
import './w1.css'

preferBackends('garnmeter/garn', ['wasm'])

const SENTENCE = "Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn't work yet."
const SESSION = 'user19-s3'
const LIVE_LIMIT_MS = 9000
const ZONE = ['green', 'yellow', 'red'] as const
const CUE: Record<string, string> = { Complexity: 'scene complexity', Speed: 'speed', Stereo: 'stereo depth' }
type Status = 'idle' | 'loading' | 'running' | 'result'
interface Sig {
  eeg: Float32Array
  nSamples: number
  sigma: number[]
}

const fmtG = (g: number) => (g >= 0.995 ? '1.0' : g <= 0.005 ? '0' : g.toFixed(2))
const gOf = (ids: number) => (ids - 1) / 6

export default function GarnW1({ params }: { view: string; params: URLSearchParams }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const [status, setStatus] = useState<Status>('idle')
  const [ready, setReady] = useState(false)
  const [sig, setSig] = useState<Sig | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [stored, setStored] = useState<GarnResult | null>(null)
  const [live, setLive] = useState<GarnResult | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [checkin, setCheckin] = useState<number | null>(null)
  const [modelNow, setModelNow] = useState<number | null>(null)
  const [screenTask, setScreenTask] = useState(false)
  const [prom, setProm] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')

  const result = live ?? stored
  const trial: GarnTrial | null = result && focus !== null ? (result.trials.find((t) => t.index === focus) ?? null) : null
  const ran = status === 'result' && live !== null
  const ids = checkin ?? (ran && trial ? trial.ids : null)
  const decision: GarnAct | null = useMemo(() => {
    if (!result || ids === null) return null
    const crew = { screenTaskRunning: screenTask, promethazineGiven: prom }
    return checkin !== null ? garn.act(result, { ...crew, checkinIds: checkin, atTrial: focus ?? undefined }) : garn.act(result, { ...crew, atTrial: focus ?? undefined })
  }, [result, ids, checkin, focus, screenTask, prom])
  const zone = decision ? (decision.tier as 0 | 1 | 2) : null
  const g = ids !== null ? gOf(ids) : null

  // scene + data on mount
  useEffect(() => {
    const sc = createScene(canvasRef.current!, viewRef.current!)
    sceneRef.current = sc
    let dead = false
    ;(async () => {
      try {
        const s = await garn.getSignal()
        if (dead) return
        sc.setSignal(s.eeg, s.nSamples, s.sigma)
        setSig({ eeg: s.eeg, nSamples: s.nSamples, sigma: s.sigma })
        setCard(await garn.getCard())
        const r = await garn.replay(SESSION)
        if (dead) return
        sc.setElectrodes(r.channels.map((c) => r.electrodes[c]))
        setStored(r)
      } catch (e) {
        console.warn('garn w1: data load failed', e)
      }
      if (!dead) setReady(true)
    })()
    return () => {
      dead = true
      sc.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setGarn(g ?? 0, zone)
    rootRef.current?.style.setProperty('--tilt', `${-(g ?? 0) * 13}deg`)
  }, [g, zone])

  const run = useCallback(async (instant = false) => {
    if (busy.current) return
    busy.current = true
    setStatus('loading')
    setCheckin(null)
    setModelNow(null)
    setLive(null)
    let r: GarnResult
    try {
      // the real model, with a time limit: on a slow or busy machine the stored outputs of the same model play instead (tag REPLAY)
      const liveRun = (async () => {
        await garn.load((_f, what) => setLoadMsg(what))
        return garn.analyze(SESSION)
      })()
      liveRun.catch(() => {})
      r = await Promise.race([liveRun, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('live model timed out')), instant ? 45000 : LIVE_LIMIT_MS))])
    } catch (e) {
      console.warn('garn w1: live model failed, replaying stored outputs', e)
      r = await garn.replay(SESSION)
    }
    const worst = r.trials.reduce((a, b) => (b.ids > a.ids ? b : a))
    const wins = r.windows.slice(worst.windowRange[0], worst.windowRange[1])
    setFocus(worst.index)
    setStatus('running')
    const sc = sceneRef.current
    const T = instant ? 0 : 4600
    const t0 = performance.now()
    let last = -1
    await new Promise<void>((res) => {
      const tick = () => {
        const p = T ? Math.min(1, (performance.now() - t0) / T) : 1
        const s = p * 8
        sc?.setPlayhead(worst.start + Math.round(s * r.fs))
        if (clockRef.current) clockRef.current.textContent = `${s.toFixed(1)} s`
        const w = wins.filter((x) => x.endS <= s + 1e-6).pop()
        if (w && w.index !== last) {
          last = w.index
          setModelNow(w.garn)
          sc?.pulse()
        }
        if (p < 1) requestAnimationFrame(tick)
        else res()
      }
      tick()
    })
    if (!instant) await new Promise((res) => setTimeout(res, 350))
    setLive(r)
    setModelNow(worst.modelGarnMean)
    setStatus('result')
    busy.current = false
  }, [])

  // pinned state for screenshots: ?state=result
  const pinned = params.get('state')
  useEffect(() => {
    if (ready && pinned === 'result' && status === 'idle') void run(true)
  }, [ready, pinned, status, run])

  const [settled, setSettled] = useState(false)
  useEffect(() => {
    setSettled(false)
    if (!ready) return
    if (pinned === 'result' && status !== 'result') return
    if (status === 'loading' || status === 'running') return
    const id = setTimeout(() => setSettled(true), status === 'result' ? 2600 : 700)
    return () => clearTimeout(id)
  }, [ready, status, pinned])

  const pickScene = (t: GarnTrial) => {
    if (!live || status !== 'result') return
    setFocus(t.index)
    setCheckin(null)
    setModelNow(t.modelGarnMean)
    sceneRef.current?.setPlayhead(t.start + t.length)
    sceneRef.current?.pulse()
  }
  const tapCheckin = (n: number) => {
    if (status === 'loading' || status === 'running') return
    if (focus === null && result) setFocus(result.trials.reduce((a, b) => (b.ids > a.ids ? b : a)).index)
    setCheckin(n)
    sceneRef.current?.pulse()
  }

  const zoneName = zone !== null ? ZONE[zone] : 'none'
  const personWord = checkin !== null ? 'your check-in' : 'the check-in'
  const strip = live && status === 'result' ? live : null

  return (
    <div ref={rootRef} className="gw1" data-ready={settled ? '1' : '0'} data-state={status === 'loading' ? 'running' : status} data-zone={zoneName}>
      <section className="gw1-stage">
        <div className="gw1-sky" aria-hidden="true">
          <i className="gw1-limb" />
          <i className="gw1-haze" />
        </div>
        <div className="gw1-view" ref={viewRef} data-qa="hero">
          <canvas ref={canvasRef} className="gw1-canvas" role="img" aria-label="A head drawn in points, wearing 14 rings of recorded brainwaves" />
          <span className="gw1-ai">AI-generated illustration · the brainwaves are real recordings</span>
        </div>
        <div className="gw1-vig" aria-hidden="true" />

        <header className="gw1-top">
          <a className="gw1-brand" href="#/">
            SuperHumans
          </a>
          <span className="gw1-crumb">Check 06 · head / inner ear</span>
          <span className="gw1-tag">
            <i /> recorded session
          </span>
        </header>

        <div className="gw1-left">
          <h1 className="gw1-title">
            Garn
            <br />
            Meter
          </h1>
          <p className="gw1-sentence">{SENTENCE}</p>
          <div className="gw1-cta">
            <button className="gw1-play" data-qa="primary" onClick={() => void run(false)} disabled={status === 'loading' || status === 'running'}>
              <span className="gw1-play-ic" aria-hidden="true" />
              {status === 'idle' ? 'Run the check' : status === 'result' ? 'Run again' : status === 'loading' ? 'Loading the model' : 'Reading brainwaves'}
            </button>
            <a className="gw1-more" href="#gw1-story" onClick={(e) => (e.preventDefault(), document.getElementById('gw1-story')?.scrollIntoView({ behavior: 'smooth' }))}>
              The story <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="gw1-live" aria-live="polite">
            {status === 'loading' && <>{loadMsg || 'starting'}…</>}
            {status === 'running' && trial && (
              <>
                Scene {trial.index} · {CUE[trial.cue]} level {trial.level} · <span ref={clockRef}>0.0 s</span>
              </>
            )}
            {status === 'result' && trial && live && (
              <>
                Scene {trial.index} of {live.trials.length} · {CUE[trial.cue]} level {trial.level}
              </>
            )}
            {status === 'idle' && <>8 seconds of brainwaves, 14 channels. One press.</>}
          </p>
        </div>

        <p className="gw1-ringnote">
          <b>14 rings = 14 electrodes.</b> One turn of the ring is the 4 seconds the model reads.
        </p>

        <aside className={`gw1-right ${g !== null ? 'on' : ''}`}>
          <div className="gw1-eyebrow">Crew check-in drives the gauge</div>
          <div className="gw1-num">
            <span className="gw1-big">{g !== null ? fmtG(g) : '?'}</span>
            <span className="gw1-unit">
              Garn
              <small>{ids !== null ? `from ${personWord} (${ids} of 7)` : 'no check-in yet'}</small>
            </span>
          </div>
          <div className="gw1-scale" role="img" aria-label={g !== null ? `Gauge at ${fmtG(g)} Garn` : 'Gauge, no check-in yet'}>
            <div className="gw1-track">
              <i className="z0" />
              <i className="z1" />
              <i className="z2" />
              {g !== null && <b className="gw1-knob" style={{ left: `${g * 100}%` }} />}
              {modelNow !== null && (
                <em className="gw1-tick" style={{ left: `${Math.min(1, modelNow) * 100}%` }}>
                  <span>model {modelNow.toFixed(2)}</span>
                </em>
              )}
            </div>
            <div className="gw1-ends">
              <span>0 · fine</span>
              <span>1 Garn · totally sick</span>
            </div>
          </div>
          <p className="gw1-model">
            {modelNow !== null && result ? (
              <>
                <span className="gw1-chip">{(live ?? result).source === 'live' ? 'LIVE' : 'REPLAY'}</span>
                Brainwave model read <b>{modelNow.toFixed(2)}</b>
                <small>{garn.STRINGS.eegLine}</small>
              </>
            ) : (
              <small>The brainwave model's reading appears here when you run the check.</small>
            )}
          </p>
          <div className="gw1-act" data-zone={zoneName}>
            <div className="gw1-eyebrow">What to do next</div>
            {decision ? (
              <>
                <h2>{decision.headline}</h2>
                <p className="gw1-who">
                  <i /> {decision.tierName} · {decision.whoActs}
                </p>
                <ol>
                  {decision.actions.slice(0, 2).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
                {decision.actions.length > 2 && (
                  <a className="gw1-act-more" href="#gw1-s4" onClick={(e) => (e.preventDefault(), document.getElementById('gw1-s4')?.scrollIntoView({ behavior: 'smooth' }))}>
                    All {decision.actions.length} steps and their sources ↓
                  </a>
                )}
                {decision.tier === 1 && (
                  <button className="gw1-sw" aria-pressed={screenTask} onClick={() => setScreenTask((x) => !x)}>
                    <i /> A screen or VR task is running
                  </button>
                )}
                {decision.tier === 2 && (
                  <button className="gw1-sw" aria-pressed={prom} onClick={() => setProm((x) => !x)}>
                    <i /> Promethazine was given
                  </button>
                )}
              </>
            ) : (
              <p className="gw1-quiet">Quiet until someone checks in.</p>
            )}
          </div>
        </aside>

        <div className="gw1-rail" role="group" aria-label="How sick do you feel? 1 to 7">
          <span className="gw1-q">How sick do you feel?</span>
          <div className="gw1-stops">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} className={`z${garn.checkinZone(n)}`} aria-pressed={ids === n} onClick={() => tapCheckin(n)} disabled={status === 'loading' || status === 'running'}>
                {n}
              </button>
            ))}
          </div>
          <span className="gw1-q2">{checkin !== null ? 'you answered' : ran ? 'the person answered · tap to answer yourself' : 'tap to answer'}</span>
        </div>

        <div className={`gw1-strip ${strip ? 'on' : ''}`}>
          <div className="gw1-strip-h">
            <span>
              <i className="k-bar" /> what the person said after each scene
            </span>
            <span>
              <i className="k-dot" /> what the brainwave model read
            </span>
            <span className="gw1-strip-hint">{strip ? 'tap a scene' : 'fills when you run the check'}</span>
          </div>
          <div className="gw1-cells">
            {(result?.trials ?? Array.from({ length: 27 }, () => null)).map((t, i) => {
              const tt = strip ? (t as GarnTrial) : null
              return (
                <button
                  key={i}
                  className={`gw1-cell ${tt ? `z${garn.checkinZone(tt.ids)}` : ''} ${tt && tt.index === focus ? 'cur' : ''}`}
                  disabled={!tt}
                  aria-pressed={!!tt && tt.index === focus}
                  aria-label={tt ? `Scene ${tt.index}: the person said ${tt.ids} of 7, the brainwave model read ${(tt.modelGarnMean ?? 0).toFixed(2)}` : `Scene ${i + 1}`}
                  onClick={() => tt && pickScene(tt)}
                >
                  {tt && <i className="bar" style={{ height: `${8 + tt.garnReported * 92}%` }} />}
                  {tt && tt.modelGarnMean !== null && <i className="dot" style={{ bottom: `${8 + tt.modelGarnMean * 92}%` }} />}
                  <span>{i + 1}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <Story r={result} card={card} sig={sig} isLive={live !== null} />
    </div>
  )
}

// ---------------------------------------------------------------- the walk-through below the first screen

const Story = memo(function Story({ r, card, sig, isLive }: { r: GarnResult | null; card: Card | null; sig: Sig | null; isLive: boolean }) {
  const wallRef = useRef<HTMLCanvasElement>(null)
  const dur = sig ? sig.nSamples / 128 : 224

  // the whole session as one picture: 14 channels, coloured by what the person said after each scene
  useEffect(() => {
    const cv = wallRef.current
    if (!cv || !sig || !r) return
    const W = 1400
    const rowH = 20
    cv.width = W
    cv.height = rowH * 14
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, W, cv.height)
    const cols = ['#58f0b4', '#ffc857', '#ff4d6d']
    const per = sig.nSamples / W
    for (let x = 0; x < W; x++) {
      const s0 = Math.floor(x * per)
      const s1 = Math.max(s0 + 1, Math.floor((x + 1) * per))
      const tr = r.trials.find((t) => s0 >= t.start && s0 < t.start + t.length)
      const z = tr ? garn.checkinZone(tr.ids) : null
      ctx.strokeStyle = z === null || z === undefined ? '#62d8ff' : cols[z]
      for (let k = 0; k < 14; k++) {
        let lo = Infinity
        let hi = -Infinity
        const off = k * sig.nSamples
        for (let s = s0; s < s1; s++) {
          const val = sig.eeg[off + s] / sig.sigma[k]
          if (val < lo) lo = val
          if (val > hi) hi = val
        }
        const cy = k * rowH + rowH / 2
        const y0 = cy - Math.tanh(hi / 6) * rowH * 0.62
        const y1 = cy - Math.tanh(lo / 6) * rowH * 0.62
        ctx.globalAlpha = 0.34 + Math.min(0.66, (hi - lo) / 14)
        ctx.beginPath()
        ctx.moveTo(x + 0.5, y0)
        ctx.lineTo(x + 0.5, Math.max(y1, y0 + 0.8))
        ctx.stroke()
      }
    }
  }, [sig, r])

  const wolf = useMemo(() => {
    if (!r) return null
    const n = r.windows.length
    const any = r.windows.filter((w) => w.eegZone >= 1).length
    const red = r.windows.filter((w) => w.eegZone === 2).length
    const fa = r.trials.filter((t) => t.ids === 1 && t.modelGarnMean !== null).sort((a, b) => (b.modelGarnMean ?? 0) - (a.modelGarnMean ?? 0))[0]
    const worst = r.trials.reduce((a, b) => (b.ids > a.ids ? b : a))
    return { n, any: Math.round((any / n) * 100), red: Math.round((red / n) * 100), fa, worst }
  }, [r])

  const acts = useMemo(() => (r ? [1, 3, 7].map((n) => garn.act(r, { checkinIds: n })) : []), [r])
  // 588 person-missions as a sunflower disc; 419 glow (NASA MEDPRAT ICL97). Which dot glows is a stable shuffle, not data.
  const crew = useMemo(() => {
    const order = Array.from({ length: 588 }, (_, i) => i).sort((a, b) => ((a * 2654435761) % 4093) - ((b * 2654435761) % 4093))
    const lit = new Set(order.slice(0, 419))
    return Array.from({ length: 588 }, (_, i) => {
      const r = 262 * Math.sqrt((i + 0.5) / 588)
      const th = i * 2.399963
      return { i, x: +(r * Math.cos(th)).toFixed(1), y: +(r * Math.sin(th)).toFixed(1), on: lit.has(i) }
    })
  }, [])
  const roc = card?.pooled_roc_ids_ge2
  const rocRows: [string, string, string][] = [
    ['scene_settings_only', 'What was on screen (no brain at all)', '#ffc857'],
    ['eegnet', 'EEGNet (standard small EEG net)', '#b9a4ff'],
    ['corrfuse_eeg', 'CorrFuse-EEG (ours, shipped)', '#62d8ff'],
    ['bandpower_floor', 'Band-power floor', '#6c7a92'],
  ]
  const path = (k: string) => {
    const c = roc?.[k]
    if (!c) return ''
    return c.fpr.map((f, i) => `${i ? 'L' : 'M'}${(f * 300).toFixed(1)},${(300 - c.tpr[i] * 300).toFixed(1)}`).join('')
  }

  return (
    <div className="gw1-story" id="gw1-story">
      <section className="gw1-s gw1-s1">
        <div className="gw1-s-txt">
          <span className="gw1-no">01 · The problem</span>
          <h2>
            <em>7 in 10</em> got space sick.
          </h2>
          <p className="gw1-lead">{garn.STRINGS.context}</p>
          <p className="gw1-src">Source: NASA MEDPRAT clinical finding form ICL97. Each dot is one person-mission.</p>
        </div>
        <figure className="gw1-crew">
          <svg viewBox="-300 -300 600 600" role="img" aria-label="588 dots, one per person-mission; 419 glow: they had space motion sickness">
            <defs>
              <radialGradient id="gw1-crew-glow">
                <stop offset="0" stopColor="#ff4d6d" stopOpacity="0.32" />
                <stop offset="0.55" stopColor="#ff4d6d" stopOpacity="0.07" />
                <stop offset="1" stopColor="#ff4d6d" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle r="292" fill="url(#gw1-crew-glow)" />
            <circle r="276" className="orbit" />
            <circle r="236" className="orbit o2" />
            <g className="spin">
              {crew.map((d) => (
                <circle key={d.i} cx={d.x} cy={d.y} r={d.on ? 5.6 : 4.4} className={d.on ? 'on' : ''} style={{ animationDelay: `${(d.i * 37) % 3600}ms` }} />
              ))}
            </g>
          </svg>
          <figcaption>
            <span>
              <i className="on" /> 419 had space motion sickness
            </span>
            <span>
              <i /> 169 did not
            </span>
          </figcaption>
        </figure>
      </section>

      <section className="gw1-s gw1-s2">
        <div className="gw1-s-txt">
          <span className="gw1-no">02 · The unit</span>
          <h2>
            It has a unit: the <em>Garn</em>.
          </h2>
          <p className="gw1-lead">Astronaut folklore, named after Senator Jake Garn. Not an official or clinical NASA unit. One Garn is totally sick.</p>
        </div>
        <div className="gw1-unitfig">
          <div className="gw1-ladder">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className={`z${garn.checkinZone(n)}`} style={{ ['--h' as string]: `${14 + gOf(n) * 86}%` }}>
                <b>{fmtG(gOf(n))}</b>
                <i />
                <span>{n}</span>
              </div>
            ))}
          </div>
          <div className="gw1-ladder-x">
            <span>the study's 1 to 7 discomfort score</span>
            <span>Garn = (score − 1) / 6</span>
          </div>
          <blockquote>
            “{garn.STRINGS.greenCaption}”<cite>NASA JSC oral history · folklore, not a clinical scale</cite>
          </blockquote>
          <p className="gw1-src">{garn.STRINGS.garnDefinition}</p>
        </div>
      </section>

      <section className="gw1-s gw1-s3">
        <div className="gw1-s-head">
          <span className="gw1-no">03 · The experiment</span>
          <h2>
            Can a headset read it from brainwaves? <em>We tried.</em>
          </h2>
        </div>
        <figure className="gw1-wall">
          <figcaption>
            <b>The whole recorded session.</b> 14 channels, {Math.round(dur)} seconds, 27 scenes. Colour is what the person said after each scene.
          </figcaption>
          <div className="gw1-wall-in">
            <canvas ref={wallRef} />
            {r && (
              <>
                <div className="gw1-zrow" aria-hidden="true">
                  <label>the check-in</label>
                  <div>
                    {r.trials.map((t) => (
                      <i key={t.index} className={`z${garn.checkinZone(t.ids)}`} style={{ left: `${(t.start / 128 / dur) * 100}%`, width: `${(t.length / 128 / dur) * 100}%` }} />
                    ))}
                  </div>
                </div>
                <div className="gw1-zrow" aria-hidden="true">
                  <label>if brainwaves drove the alarm</label>
                  <div>
                    {r.windows.map((w) => (
                      <i key={w.index} className={`z${w.eegZone}`} style={{ left: `${((w.startSample / 128 + 3.5) / dur) * 100}%`, width: `${(0.5 / dur) * 100 + 0.02}%` }} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </figure>
        {r && (
          <div className="gw1-scalp">
            <div className="gw1-scalp-fig">
              <GarnScalp result={r} size={220} />
            </div>
            <div className="gw1-scalp-txt">
              <h3>Where the headset listens.</h3>
              <p>14 electrodes across the forehead, temples and back of the head. Each one is a ring on the stage above; the model reads all 14 at once, 4 seconds at a time.</p>
            </div>
          </div>
        )}
        <div className="gw1-find">
          {wolf && (
            <>
              <div>
                <strong>{wolf.any}%</strong>
                <span>
                  of the {wolf.n} windows, the brainwave alarm would be yellow or red ({wolf.red}% red). It would cry wolf.
                </span>
              </div>
              {wolf.fa && (
                <div>
                  <strong>{(wolf.fa.modelGarnMean ?? 0).toFixed(2)}</strong>
                  <span>
                    Garn: the model's highest reading, in scene {wolf.fa.index}. The person felt fine ({wolf.fa.ids} of 7). A false alarm.
                  </span>
                </div>
              )}
              <div>
                <strong>{(wolf.worst.modelGarnMean ?? 0).toFixed(2)}</strong>
                <span>
                  Garn: what it read in scene {wolf.worst.index}, the sickest moment ({wolf.worst.ids} of 7, {fmtG(wolf.worst.garnReported)} Garn).
                </span>
              </div>
            </>
          )}
        </div>
        <div className="gw1-roc">
          <svg viewBox="-34 -10 354 344" role="img" aria-label="ROC curves of four models on new people">
            <rect x="0" y="0" width="300" height="300" className="fr" />
            {[75, 150, 225].map((q) => (
              <g key={q} className="gr">
                <line x1={q} y1="0" x2={q} y2="300" />
                <line x1="0" y1={q} x2="300" y2={q} />
              </g>
            ))}
            <line x1="0" y1="300" x2="300" y2="0" className="coin" />
            <text x="208" y="112" className="coin-t" transform="rotate(-45 208 112)" data-qa="tick">
              coin flip
            </text>
            {rocRows
              .slice()
              .reverse()
              .map(([k, , col]) => (
                <path key={k} d={path(k)} stroke={col} className={k === 'corrfuse_eeg' ? 'main' : ''} />
              ))}
            <text x="150" y="326" className="ax" data-qa="tick">
              false alarms →
            </text>
            <text x="-18" y="150" className="ax" transform="rotate(-90 -18 150)" data-qa="tick">
              sick moments caught →
            </text>
          </svg>
          <div className="gw1-roc-txt">
            <h3>On people it never saw, the brainwave model is close to a coin flip.</h3>
            <ul>
              {rocRows.map(([k, label, col]) => (
                <li key={k}>
                  <i style={{ background: col }} />
                  <b>{roc?.[k] ? roc[k].auroc.toFixed(2) : ''}</b>
                  {label}
                </li>
              ))}
            </ul>
            <p className="gw1-src">
              0.5 is a coin flip, 1.0 is perfect. What the person was looking at tells more than their brainwaves. {card?.result_card_sentence}
            </p>
          </div>
        </div>
      </section>

      <section className="gw1-s gw1-s4" id="gw1-s4">
        <div className="gw1-s-head">
          <span className="gw1-no">04 · The decision</span>
          <h2>
            So the app <em>asks you</em>, and says what to do.
          </h2>
        </div>
        <div className="gw1-cards">
          {acts.map((a, i) => (
            <article key={a.tierName} className={`z${a.tier}`}>
              <header>
                <i />
                <b>{a.tierName}</b>
                <span>check-in {['1', '2 to 3', '4 to 7'][i]} of 7</span>
              </header>
              <h3>{a.headline}</h3>
              <p className="who">{a.whoActs}</p>
              <ol>
                {a.actions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
              <footer>{a.sources.map((s) => s.label).join(' · ')}</footer>
            </article>
          ))}
        </div>
        <p className="gw1-src">{garn.STRINGS.neverDoses} Every trigger level is our product rule.</p>
      </section>

      <section className="gw1-s gw1-s5">
        <div className="gw1-s-head">
          <span className="gw1-no">05 · The work behind it</span>
          <h2>A real model, a real test, an honest answer.</h2>
        </div>
        <div className="gw1-pipe">
          <div>
            <b>14 × 512</b>
            <span>channels × samples: 4 seconds of headset EEG</span>
          </div>
          <div>
            <b>÷ rest</b>
            <span>each channel scaled by its spread in 8 calm seconds</span>
          </div>
          <div className="hot">
            <b>CorrFuse-EEG</b>
            <span>{card ? card.shipped.badge.split(' · ').slice(1).join(' · ') : ''}</span>
          </div>
          <div>
            <b>P(score ≥ 2, 3, 5)</b>
            <span>three ordered probabilities</span>
          </div>
          <div>
            <b>Garn estimate</b>
            <span>shown, never used for alerts</span>
          </div>
        </div>
        <ul className="gw1-facts">
          <li>{garn.STRINGS.groundAnalog}</li>
          <li>
            {garn.STRINGS.personLabel}: never in training. {garn.STRINGS.playback}
          </li>
          <li>
            {r && isLive && r.source === 'live'
              ? `Ran in this browser just now: ${r.session.nWindows} windows in ${r.timing.ms.toFixed(0)} ms (${r.timing.backend}).`
              : `Figures on this page before you press Run: ${garn.STRINGS.precomputedLabel}.`}{' '}
            The gauge never follows the model; it moves only on a check-in.
          </li>
          <li>
            Data: Ozkan, Uyan &amp; Celikcan 2023 and Uyan &amp; Celikcan 2024 (Displays). Guidance: NASA OCHMO-MTB-004, NASA HSRB urinary-retention risk record. The scalp positions and rings are a drawing; the
            brainwaves are measurements.
          </li>
        </ul>
      </section>
    </div>
  )
})

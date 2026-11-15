// VeinSqueeze, free version w1: "inside the vein". The first screen is the working check (the existing stage, sized
// wide with a tall curve) floating in a live shader of a vessel that flattens while the probe is held. Below it the
// presenter walks through the story (real neck-vein clips) and the work behind the check (all six clips, the numbers).
// Every result on screen comes from app/src/engine/veinsqueeze at run time.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import * as vs from '../../engine/veinsqueeze'
import type { SqueezeCurve, VsActDecision, VsResult, VsSample } from '../../engine/veinsqueeze'
import { VeinSqueezeMoment, formatChance, type ClipOutcome, type MomentState, type VeinSqueezeMomentHandle } from '../../moments/veinsqueeze'
import { Tunnel } from './Tunnel'
import './w1.css'

const SENTENCE = 'A clot is a vein that won’t squash.' // card: 5-second sentence (on screen)

interface Props {
  view: string
  params: URLSearchParams
}

// ------------------------------------------------------------------ small pieces
function curvePath(c: SqueezeCurve, w: number, h: number, top: number): string {
  const n = c.pctMed5.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w
    const y = h - (Math.min(c.pctMed5[i], top) / top) * h
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

/** A looping real clip that only plays while it is on screen. */
function Clip({ src, className, onVideo }: { src: string; className?: string; onVideo?: (v: HTMLVideoElement | null) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.15 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return (
    <video
      ref={(v) => {
        ref.current = v
        onVideo?.(v)
      }}
      className={className}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
    />
  )
}

/** The real neck clip with its stored SAM 2 curve; the cursor and the number follow the video frame. */
function NeckSqueeze() {
  const [curve, setCurve] = useState<SqueezeCurve | null>(null)
  const video = useRef<HTMLVideoElement | null>(null)
  const cursor = useRef<SVGGElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let on = true
    vs.loadSqueeze(vs.NECK.gillman.json).then((c) => on && setCurve(c)).catch(() => {})
    return () => {
      on = false
    }
  }, [])
  const W = 600
  const H = 150
  const TOP = 120
  useEffect(() => {
    if (!curve) return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const v = video.current
      if (!v) return
      const f = Math.max(0, Math.min(curve.frames - 1, Math.round(v.currentTime * curve.fps)))
      const pct = curve.pctMed5[f]
      const x = (f / (curve.frames - 1)) * W
      const y = H - (Math.min(pct, TOP) / TOP) * H
      cursor.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
      if (num.current) num.current.textContent = `${Math.round(pct)}%`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [curve])
  const yOf = (p: number) => H - (p / TOP) * H
  return (
    <figure className="vw1-neck">
      <div className="vw1-neck-frame">
        <Clip src={vs.assetUrl(vs.NECK.gillman.videoOutlined)} onVideo={(v) => (video.current = v)} />
        <span className="vw1-chip vw1-chip-on">Real clip · neck vein</span>
      </div>
      <div className="vw1-neck-read">
        <div className="vw1-neck-now">
          <span className="vw1-neck-num" ref={num}>
            100%
          </span>
          <span className="vw1-neck-unit">of its starting area, this frame</span>
        </div>
        <svg className="vw1-neck-plot" viewBox={`-4 -8 ${W + 8} ${H + 16}`} preserveAspectRatio="none" role="img" aria-label="Vein area against its start, from the stored SAM 2 outline">
          <line x1="0" x2={W} y1={yOf(100)} y2={yOf(100)} className="vw1-rule vw1-rule-start" />
          <line x1="0" x2={W} y1={yOf(50)} y2={yOf(50)} className="vw1-rule" />
          <line x1="0" x2={W} y1={yOf(10)} y2={yOf(10)} className="vw1-rule" />
          {curve && (
            <>
              <path d={`${curvePath(curve, W, H, TOP)}L${W} ${H}L0 ${H}Z`} className="vw1-area" />
              <path d={curvePath(curve, W, H, TOP)} className="vw1-curve" vectorEffect="non-scaling-stroke" />
              <g ref={cursor}>
                <circle r="9" className="vw1-cursor-ring" />
                <circle r="4" className="vw1-cursor" />
              </g>
            </>
          )}
        </svg>
        <div className="vw1-neck-ticks" aria-hidden="true">
          <span>start</span>
          <span>50%</span>
          <span>10%</span>
        </div>
        {curve && (
          <p className="vw1-neck-band">
            <b>{curve.band}</b>
            <span>
              lowest point {Math.round(curve.rMin)}% at {curve.tMinS.toFixed(1)} s
            </span>
          </p>
        )}
      </div>
      <figcaption>{vs.HONESTY_NECK_GILLMAN}</figcaption>
    </figure>
  )
}

/** Drawn cross-section: the probe presses, the healthy vein flattens, the clotted one keeps its shape. */
function PressDiagram() {
  const one = (x: number, clot: boolean) => (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="40" width="330" height="250" rx="14" className="vw1-d-tissue" />
      <g className="vw1-d-layers">
        <path d="M0 96 C80 86 240 108 330 94" />
        <path d="M0 132 C90 120 230 146 330 130" />
        <path d="M0 246 C110 234 220 258 330 244" />
      </g>
      <g className="vw1-d-probe">
        <rect x="105" y="-18" width="120" height="58" rx="10" />
        <rect x="118" y="34" width="94" height="10" rx="5" className="vw1-d-face" />
        <g className="vw1-d-beam">
          <path d="M122 44 L60 290 L270 290 L208 44 Z" />
        </g>
      </g>
      <circle cx="236" cy="186" r="26" className="vw1-d-artery" />
      <text x="236" y="190" className="vw1-d-in">
        artery
      </text>
      <g className={clot ? 'vw1-d-vein vw1-d-vein-clot' : 'vw1-d-vein'}>
        <ellipse cx="140" cy="186" rx="46" ry="40" className="vw1-d-wall" />
        {clot && <path d="M106 186 C106 160 126 152 146 156 C170 160 180 176 176 192 C172 212 150 220 130 216 C114 212 106 202 106 186 Z" className="vw1-d-clot" />}
      </g>
      <text x="165" y="322" className="vw1-d-label">
        {clot ? 'Clot inside: it stays round' : 'Healthy: it squashes flat'}
      </text>
    </g>
  )
  return (
    <figure className="vw1-diagram">
      <svg viewBox="-10 -30 720 370" role="img" aria-label="Drawing: an ultrasound probe presses on two veins. The healthy vein flattens, the vein with a clot stays round.">
        {one(0, false)}
        {one(370, true)}
      </svg>
      <span className="vw1-ai-mark">AI-generated illustration</span>
    </figure>
  )
}

interface WallItem {
  sample: VsSample
  result: VsResult
}

/** All six shipped clips with the stored model output and the expert label of each. */
function ClipWall() {
  const [items, setItems] = useState<WallItem[]>([])
  useEffect(() => {
    let on = true
    ;(async () => {
      const samples = await vs.listSamples()
      const out: WallItem[] = []
      for (const sample of samples) out.push({ sample, result: await vs.replay(sample.id) })
      if (on) setItems(out)
    })().catch(() => {})
    return () => {
      on = false
    }
  }, [])
  return (
    <div className="vw1-wall">
      {items.map(({ sample, result }) => {
        const clot = sample.expert.thrombosis === 1
        const wrong = sample.role === 'honest_error'
        return (
          <figure key={sample.id} className="vw1-tile" data-clot={clot ? 1 : 0} data-wrong={wrong ? 1 : 0}>
            <div className="vw1-tile-frame">
              <Clip src={sample.urls.video} />
              <span className="vw1-tile-letter">{sample.letter}</span>
              <span className="vw1-chip vw1-chip-on">Expert: {clot ? 'clot' : 'no clot'}</span>
            </div>
            {result.squeeze ? (
              <svg className="vw1-tile-plot" viewBox="0 -4 200 48" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" x2="200" y1={40 - (100 / 130) * 40} y2={40 - (100 / 130) * 40} className="vw1-rule vw1-rule-start" />
                <path d={curvePath(result.squeeze, 200, 40, 130)} className="vw1-curve" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : (
              <div className="vw1-tile-plot vw1-tile-noplot">no outline for this clip</div>
            )}
            <figcaption>
              <span className="vw1-tile-ai">
                <b>{formatChance(result.clotProb)}</b>
                <i>AI clot chance</i>
              </span>
              <span className="vw1-tile-band">{wrong ? 'False alarm' : (result.squeeze?.band ?? '')}</span>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

interface Cheat {
  main: number
  floor: number
  pairMain: number
  pairFloor: number
}

function useCheat(): Cheat | null {
  const [c, setC] = useState<Cheat | null>(null)
  useEffect(() => {
    let on = true
    fetch(vs.assetUrl(vs.NECK.metrics))
      .then((r) => r.json())
      .then((m: { models?: Record<string, { philips_auc?: number; pair_auc?: number }> }) => {
        const main = m.models?.main
        const f1 = m.models?.F1
        if (on && main?.philips_auc && f1?.philips_auc && main.pair_auc && f1.pair_auc)
          setC({ main: main.philips_auc, floor: f1.philips_auc, pairMain: main.pair_auc, pairFloor: f1.pair_auc })
      })
      .catch(() => {})
    return () => {
      on = false
    }
  }, [])
  return c
}

function Bar({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  // AUC axis from 0.5 (a coin flip) to 1.0
  const w = Math.max(0, Math.min(1, (value - 0.5) / 0.5)) * 100
  return (
    <div className="vw1-bar" data-strong={strong ? 1 : 0}>
      <span className="vw1-bar-label">{label}</span>
      <span className="vw1-bar-track">
        <i style={{ width: `${w}%` }} />
      </span>
      <b>{value.toFixed(3)}</b>
    </div>
  )
}

// ------------------------------------------------------------------ the page
export default function VeinSqueezeW1({ params }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<VeinSqueezeMomentHandle>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [outcome, setOutcome] = useState<{ result: VsResult; act: VsActDecision; all: ClipOutcome[] } | null>(null)
  const alarmRef = useRef(0)
  const pin = params.get('state')
  const pinState = pin === 'idle' || pin === 'result' ? pin : undefined
  const sampleId = params.get('sample') ?? 'clip-a'
  const m = params.get('mode')
  const mode = m === 'live' || m === 'replay' ? m : 'auto'
  const cheat = useCheat()

  const press = useCallback(() => {
    const el = root.current?.querySelector('.vsq')
    return el ? Math.min(1, Number(el.getAttribute('data-press') ?? 0) / 100) : 0
  }, [])
  const alarm = useCallback(() => alarmRef.current, [])

  const onResult = useCallback((result: VsResult, act: VsActDecision, all: ClipOutcome[]) => {
    setOutcome({ result, act, all })
  }, [])
  const onState = useCallback((s: MomentState) => {
    setState(s)
    if (s !== 'result') setOutcome((o) => (s === 'idle' ? null : o))
  }, [])
  useEffect(() => {
    alarmRef.current = outcome && state === 'result' && outcome.act.tier >= 3 ? 1 : 0
  }, [outcome, state])

  const shown = state === 'result' && outcome ? outcome : null
  const honesty = useMemo(() => {
    const lines = new Set<string>()
    // the strip caption describes a strip this page does not draw, so it is left out here
    const base = shown ? shown.result.honesty : vs.HONESTY_RESULT
    for (const l of base) if (l !== vs.HONESTY_STRIP) lines.add(l)
    lines.add(vs.HONESTY_HERO_PAIR)
    lines.add(vs.HONESTY_HELD_OUT)
    lines.add(`${vs.HONESTY_SQUEEZE}.`)
    lines.add(vs.HONESTY_BANDS)
    lines.add(vs.HONESTY_HONEST_ERROR)
    const hasTau = [...lines].some((l) => l.startsWith('Alarm threshold'))
    for (const l of shown?.act.caveats ?? vs.HONESTY_ACT) if (!(hasTau && l.startsWith('Alarm threshold'))) lines.add(l)
    return [...lines]
  }, [shown])

  const tierWord = shown ? shown.act.tierName.split(',')[0] : ''

  return (
    <div className="vw1" ref={root} data-ready={ready ? '1' : undefined} data-state={state} data-tier={shown ? shown.act.tier : undefined}>
      <Tunnel className="vw1-tunnel" press={press} alarm={alarm} />
      <div className="vw1-veil" aria-hidden="true" />
      <span className="vw1-bg-mark">Background: AI-generated illustration</span>

      {/* ------------------------------------------------ first screen: the check */}
      <section className="vw1-hero">
        <header className="vw1-head">
          <div className="vw1-id">
            <a className="vw1-back" href="#/">
              <span aria-hidden="true">←</span> All checks
            </a>
            <h1>
              Vein<em>Squeeze</em>
            </h1>
            <p className="vw1-sentence">{SENTENCE}</p>
          </div>

          <aside className="vw1-act" data-on={shown ? 1 : 0} aria-live="polite">
            <span className="vw1-act-kicker">What to do next</span>
            {shown ? (
              <>
                <p className="vw1-act-line">{shown.act.headline}</p>
                <p className="vw1-act-meta">
                  <span className="vw1-tier" data-tier={shown.act.tier}>
                    <i aria-hidden="true" />
                    {tierWord}
                  </span>
                  <span>Who acts: {shown.act.whoActs}</span>
                  <span className="vw1-chip" title={vs.HONESTY_HERO_PAIR}>
                    Best case
                  </span>
                </p>
              </>
            ) : (
              <p className="vw1-act-wait">Hold the button to press the probe on both veins. The next step lands here.</p>
            )}
          </aside>
        </header>

        <div className="vw1-stage" data-qa="hero">
          <VeinSqueezeMoment
            ref={stage}
            sampleId={sampleId}
            mode={mode}
            state={pinState}
            onResult={onResult}
            onState={onState}
            onReady={() => setReady(true)}
            className="vw1-moment"
          />
        </div>

        <a className="vw1-down" href="#vw1-story" onClick={(e) => { e.preventDefault(); root.current?.querySelector('#vw1-story')?.scrollIntoView({ behavior: 'smooth' }) }}>
          Why this matters in space <span aria-hidden="true">↓</span>
        </a>
      </section>

      {/* ------------------------------------------------ the story */}
      <section className="vw1-story" id="vw1-story">
        <div className="vw1-year" aria-hidden="true">
          2019
        </div>
        <div className="vw1-story-lead">
          <span className="vw1-kicker">The problem</span>
          <h2>
            The first clot ever found in space was in a <em>neck vein</em>, on the ISS.
          </h2>
          <p>It was confirmed with exactly this test: press on the vein with the ultrasound probe and watch whether it squashes.</p>
          <span className="vw1-src">JAMA Network Open, 2019</span>
        </div>

        <div className="vw1-beats">
          <article className="vw1-beat">
            <span className="vw1-beat-n">01</span>
            <h3>This is that vein.</h3>
            <div className="vw1-beat-media">
              <Clip src={vs.assetUrl(vs.NECK.segthy.video)} />
              <span className="vw1-chip vw1-chip-on">Real scan · healthy volunteer</span>
            </div>
            <p className="vw1-fine">
              {vs.HONESTY_NECK_SEGTHY[1]} {vs.HONESTY_NECK_SEGTHY[0]}
            </p>
          </article>

          <article className="vw1-beat vw1-beat-wide">
            <span className="vw1-beat-n">02</span>
            <h3>The test is a press.</h3>
            <PressDiagram />
            <p className="vw1-fine">The crew holds the probe. The radiologists who read the scan are on the ground.</p>
          </article>
        </div>

        <article className="vw1-beat vw1-beat-full">
          <span className="vw1-beat-n">03</span>
          <h3>A real neck vein, pressed flat.</h3>
          <NeckSqueeze />
        </article>
      </section>

      {/* ------------------------------------------------ the work */}
      <section className="vw1-work">
        <div className="vw1-work-lead">
          <span className="vw1-kicker">The work behind the check</span>
          <h2>
            Six clips the model never trained on. <em>One it gets wrong.</em>
          </h2>
        </div>
        <ClipWall />

        <div className="vw1-facts">
          <div>
            <b>2,341</b>
            <span>leg-vein clips</span>
          </div>
          <div>
            <b>594</b>
            <span>patients</span>
          </div>
          <div>
            <b>5</b>
            <span>European hospitals</span>
          </div>
          <div>
            <b>32</b>
            <span>frames read per clip</span>
          </div>
          <div>
            <b>9.9 M</b>
            <span>parameters, in your browser</span>
          </div>
        </div>

        <div className="vw1-proof">
          <div className="vw1-cheat">
            <h3>Did it cheat?</h3>
            {cheat ? (
              <>
                <p className="vw1-fine">Within one scanner brand (AUC, 0.5 is a coin flip)</p>
                <Bar label="Our model, reading the pixels" value={cheat.main} strong />
                <Bar label="Scanner, hospital and vein site alone" value={cheat.floor} />
                <p className="vw1-fine">Two veins of the same patient</p>
                <Bar label="Our model" value={cheat.pairMain} strong />
                <Bar label="Vein site alone" value={cheat.pairFloor} />
                <p className="vw1-fine">On same-patient pairs the vein site alone is ahead of the model. Shown, never hidden.</p>
              </>
            ) : (
              <p className="vw1-fine">Loading the measured numbers.</p>
            )}
          </div>
          <div className="vw1-know">
            <h3>How do we know?</h3>
            <ul>
              {honesty.map((l) => (
                <li key={l}>{l}</li>
              ))}
              <li>Every shipped clip is above the alarm threshold, the clean vein B included.</li>
            </ul>
          </div>
        </div>

        <p className="vw1-credits">
          Data: ThrombUS+ (Zenodo 17659415, CC BY 4.0). Neck clip: Gillman et al. 2010, Scand J Trauma Resusc Emerg Med 18:39 (CC BY 2.0). Neck scan: SegThy, Krönke et al., PLOS ONE 2022 (CC BY
          4.0). Outlines: SAM 2.1 (Meta, Apache-2.0). Encoder: MobileNetV4 via timm (Apache-2.0). Background and press drawing: AI-generated illustration. Code written with Claude (AI).
        </p>
        <button type="button" className="vw1-top" onClick={() => { root.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          Back to the check <span aria-hidden="true">↑</span>
        </button>
      </section>
    </div>
  )
}

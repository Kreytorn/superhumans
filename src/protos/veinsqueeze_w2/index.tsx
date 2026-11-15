// VeinSqueeze, free version w2: "sonar title sequence". The first screen is the working check (the existing stage,
// wide pictures, tall curves) under a film-title header, over a live ultrasound fan that sweeps the dark.
// Below it a museum wall the presenter walks through: the problem in orbit (diagram + two real neck-vein clips),
// the squeeze test itself (diagram), all six held-out clips with the engine's own readouts, and what the model sees.
// Every result on screen comes from app/src/engine/veinsqueeze at run time (analyze / replay / act / sampleInput).
import { useCallback, useEffect, useRef, useState } from 'react'
import '@fontsource-variable/big-shoulders'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as vs from '../../engine/veinsqueeze'
import type { SqueezeCurve, VsActDecision, VsResult, VsSample } from '../../engine/veinsqueeze'
import {
  VeinSqueezeMoment,
  formatChance,
  type ClipOutcome,
  type MomentState,
  type VeinSqueezeMomentHandle,
} from '../../moments/veinsqueeze'
import { Sonar } from './Sonar'
import './w2.css'

const SENTENCE = 'A clot is a vein that won’t squash.' // card: 5-second sentence (on screen)
const RULE = 'A healthy vein squashes flat when pressed.' // model brief, section 1 (same line the stage uses)

interface Props {
  view: string
  params: URLSearchParams
}

// ------------------------------------------------------------------ helpers
function curvePath(values: number[], w: number, h: number, top: number): string {
  const n = values.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = (i / Math.max(1, n - 1)) * w
    const y = h - (Math.max(0, Math.min(values[i], top)) / top) * h
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

/** A looping real clip: it gets its source only when it nears the screen (keeps the stage's own fetches first) and
 *  only plays while it is on screen. */
function Clip({ src, label, onVideo }: { src: string; label: string; onVideo?: (v: HTMLVideoElement | null) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const v = ref.current
    onVideo?.(v)
    if (!v) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true)
          void v.play().catch(() => {})
        } else v.pause()
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [onVideo])
  useEffect(() => {
    const v = ref.current
    if (near && v) void v.play().catch(() => {})
  }, [near])
  return <video ref={ref} src={near ? src : undefined} muted loop playsInline autoPlay={near} preload="none" aria-label={label} />
}

/** Neck clip with its SAM 2 curve; the cursor follows the video's real time. */
function NeckPanel() {
  const [curve, setCurve] = useState<SqueezeCurve | null>(null)
  const [t, setT] = useState(0)
  const vRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    let on = true
    vs.loadSqueeze(vs.NECK.gillman.json).then((c) => on && setCurve(c)).catch(() => {})
    return () => {
      on = false
    }
  }, [])
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = vRef.current
      if (v && !v.paused) setT(v.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const onVideo = useCallback((v: HTMLVideoElement | null) => {
    vRef.current = v
  }, [])
  const W = 600
  const H = 150
  const dur = curve ? curve.tS[curve.tS.length - 1] || 1 : 1
  const cx = Math.min(1, t / dur) * W
  let idx = 0
  if (curve) {
    while (idx < curve.tS.length - 1 && curve.tS[idx + 1] <= t) idx++
  }
  const cur = curve ? curve.pctMed5[idx] : null
  return (
    <figure className="w2-neck">
      <div className="w2-neck-media">
        <Clip src={vs.assetUrl(vs.NECK.gillman.videoOutlined)} label="Real neck vein squeezed by the ultrasound probe" onVideo={onVideo} />
        <span className="w2-chip">Neck vein · real clip</span>
      </div>
      <div className="w2-neck-chart">
        <div className="w2-neck-read">
          <span className="w2-mono">vein area, SAM 2 outline</span>
          <b>{cur == null ? '–' : `${Math.round(cur)}%`}</b>
          <span className="w2-mono">of start</span>
        </div>
        {curve && (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" x2={W} y1={H - H / 1.1} y2={H - H / 1.1} className="w2-rule" />
            <path d={`${curvePath(curve.pctMed5, W, H, 110)}L${W} ${H}L0 ${H}Z`} className="w2-area" />
            <path d={curvePath(curve.pctMed5, W, H, 110)} className="w2-line" />
            <line x1={cx} x2={cx} y1="0" y2={H} className="w2-cursor" />
          </svg>
        )}
        <figcaption>{vs.HONESTY_NECK_GILLMAN}</figcaption>
      </div>
    </figure>
  )
}

/** The squeeze test as a cross-section: probe presses, healthy vein flattens, clotted vein stays round. */
function SqueezeDiagram({ clot }: { clot: boolean }) {
  return (
    <figure className={`w2-diag ${clot ? 'is-clot' : 'is-open'}`}>
      <svg viewBox="0 0 320 260" role="img" aria-label={clot ? 'Clotted vein stays round under the probe' : 'Healthy vein squashes flat under the probe'}>
        <defs>
          <radialGradient id={`w2-tis-${clot}`} cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#1b2b33" />
            <stop offset="1" stopColor="#070c10" />
          </radialGradient>
          <filter id={`w2-speck-${clot}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="2" seed={clot ? 4 : 9} />
            <feColorMatrix values="0 0 0 0 0.75  0 0 0 0 0.9  0 0 0 0 0.95  0 0 0 1.6 -0.75" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <pattern id="w2-clotpat" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="#ff8a6e" />
            <circle cx="6" cy="6" r="1.1" fill="#ffb59f" />
          </pattern>
        </defs>
        <rect x="10" y="60" width="300" height="190" rx="18" fill={`url(#w2-tis-${clot})`} stroke="rgba(120,240,255,.18)" />
        <rect x="10" y="60" width="300" height="190" rx="18" fill="#fff" filter={`url(#w2-speck-${clot})`} opacity=".35" />
        <g className="w2-probe">
          <rect x="95" y="6" width="130" height="44" rx="10" fill="#d9eef2" />
          <rect x="105" y="50" width="110" height="10" rx="3" fill="#62f4ff" />
          <path d="M160 60 L160 70" stroke="#62f4ff" strokeWidth="2" />
        </g>
        <g className="w2-skin">
          <path d="M10 70 Q160 70 310 70" stroke="rgba(214,236,240,.5)" strokeWidth="2" fill="none" />
        </g>
        <circle cx="230" cy="160" r="30" className="w2-artery" />
        <text x="230" y="214" textAnchor="middle" className="w2-svgtxt">artery</text>
        <g className="w2-vein">
          <ellipse cx="110" cy="160" rx="42" ry="40" className="w2-veinwall" />
          {clot && <ellipse cx="110" cy="160" rx="34" ry="32" fill="url(#w2-clotpat)" opacity=".9" />}
        </g>
        <text x="110" y="226" textAnchor="middle" className="w2-svgtxt">{clot ? 'vein with clot' : 'healthy vein'}</text>
      </svg>
      <figcaption>
        <b>{clot ? 'Stays round' : 'Squashes flat'}</b>
        <span>{clot ? 'The clot keeps it from squashing.' : RULE}</span>
      </figcaption>
    </figure>
  )
}

/** Floating-crew body diagram: fluid shifts toward the head; neck vein and leg vein marked. */
function BodyDiagram() {
  return (
    <figure className="w2-body">
      <svg viewBox="0 0 300 520" role="img" aria-label="Body diagram: fluid shifts toward the head in weightlessness">
        <defs>
          <linearGradient id="w2-bodyfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#62f4ff" stopOpacity=".34" />
            <stop offset=".55" stopColor="#62f4ff" stopOpacity=".08" />
            <stop offset="1" stopColor="#62f4ff" stopOpacity=".02" />
          </linearGradient>
          <radialGradient id="w2-hot" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ff7a59" stopOpacity=".95" />
            <stop offset="1" stopColor="#ff7a59" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="w2-float">
          <g className="w2-limbs">
            <path d="M118 132 L78 176 L54 132" />
            <path d="M182 132 L222 176 L246 132" />
            <path d="M136 268 L116 368 L134 470" />
            <path d="M164 268 L184 368 L166 470" />
          </g>
          <g className="w2-limbs-core">
            <path d="M118 132 L78 176 L54 132" />
            <path d="M182 132 L222 176 L246 132" />
            <path d="M136 268 L116 368 L134 470" />
            <path d="M164 268 L184 368 L166 470" />
          </g>
          <path className="w2-torso" d="M108 128 Q150 112 192 128 Q190 170 182 200 Q176 232 178 264 Q150 282 122 264 Q124 232 118 200 Q110 170 108 128 Z" fill="url(#w2-bodyfill)" />
          <circle className="w2-torso" cx="150" cy="68" r="31" fill="url(#w2-bodyfill)" />
          <line x1="150" y1="99" x2="150" y2="114" className="w2-torso" />
          {/* neck vein */}
          <circle cx="141" cy="110" r="30" fill="url(#w2-hot)" className="w2-pulse" />
          <path d="M142 98 L140 124" className="w2-jug" />
          {/* leg vein */}
          <path d="M132 282 L115 368 L130 458" className="w2-legv" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d="M0 18 L0 -14 M-8 -4 L0 -14 L8 -4" className="w2-arrow" style={{ animationDelay: `${i * 0.55}s` }} transform={`translate(${i % 2 ? 168 : 132} ${250 - i * 30})`} />
          ))}
          <text x="174" y="104" className="w2-svgtxt w2-hotlabel">neck vein</text>
          <text x="22" y="400" className="w2-svgtxt">leg vein</text>
        </g>
      </svg>
      <span className="w2-mark">AI-generated illustration</span>
    </figure>
  )
}

/** What the model sees: the 32 stored input frames of a clip, with the model's attention under each. */
function ModelEyes({ sampleId, attention }: { sampleId: string; attention: number[] | null }) {
  const cRef = useRef<HTMLCanvasElement | null>(null)
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let on = true
    vs.sampleInput(sampleId)
      .then((bytes) => {
        const c = cRef.current
        if (!on || !c) return
        const S = 160
        const cols = 8
        c.width = S * cols
        c.height = S * 4
        const ctx = c.getContext('2d')
        if (!ctx) return
        const img = ctx.createImageData(S, S)
        for (let f = 0; f < 32; f++) {
          const off = f * S * S
          for (let i = 0; i < S * S; i++) {
            const g = bytes[off + i]
            img.data[i * 4] = g * 0.82
            img.data[i * 4 + 1] = g * 0.97
            img.data[i * 4 + 2] = g
            img.data[i * 4 + 3] = 255
          }
          ctx.putImageData(img, (f % cols) * S, Math.floor(f / cols) * S)
        }
        setOk(true)
      })
      .catch(() => {})
    return () => {
      on = false
    }
  }, [sampleId])
  const maxA = attention ? Math.max(...attention) : 1
  return (
    <div className="w2-eyes">
      <div className="w2-eyes-grid">
        <canvas ref={cRef} aria-label="The 32 frames the model reads, 160 by 160 pixels each" data-ok={ok ? '1' : '0'} />
        {attention && (
          <div className="w2-eyes-att" aria-hidden="true">
            {attention.map((a, i) => (
              <span key={i} style={{ ['--a' as string]: (a / maxA).toFixed(3) }} />
            ))}
          </div>
        )}
      </div>
      <p className="w2-mono w2-eyes-cap">
        Clip A as the model receives it: 32 frames, 160 × 160, grey. Glow under each frame: {vs.HONESTY_STRIP}.
      </p>
    </div>
  )
}

// ------------------------------------------------------------------ page
export default function VeinSqueezeW2({ params }: Props) {
  const pinned = params.get('state')
  const pinState = pinned === 'result' || pinned === 'idle' ? pinned : undefined
  const stageRef = useRef<VeinSqueezeMomentHandle | null>(null)
  const [state, setState] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const [act, setAct] = useState<VsActDecision | null>(null)
  const [hero, setHero] = useState<VsResult | null>(null)
  const [samples, setSamples] = useState<VsSample[]>([])
  const [wall, setWall] = useState<Record<string, VsResult>>({})

  useEffect(() => {
    let on = true
    vs.listSamples()
      .then(async (list) => {
        if (!on) return
        setSamples(list)
        const out: Record<string, VsResult> = {}
        for (const s of list) {
          try {
            out[s.id] = await vs.replay(s.id)
          } catch {
            /* a missing stored output leaves that tile without numbers */
          }
        }
        if (on) setWall(out)
      })
      .catch(() => {})
    return () => {
      on = false
    }
  }, [])

  const onResult = useCallback((r: VsResult, a: VsActDecision, _all: ClipOutcome[]) => {
    setHero(r)
    setAct(a)
  }, [])
  const onState = useCallback((s: MomentState) => {
    setState(s)
    if (s === 'idle') setAct(null)
  }, [])
  const onReady = useCallback(() => setReady(true), [])

  const settled = state === 'result' && act
  const attA = wall['clip-a']?.frameAttention ?? null

  return (
    <div className="w2-root" data-ready={ready ? '1' : '0'} data-state={state}>
      <Sonar active={state === 'running'} />

      {/* ---------------------------------------------------------- first screen */}
      <section className="w2-first">
        <header className="w2-head">
          <div className="w2-titleblock">
            <div className="w2-toprow">
              <a className="w2-back" href="#/">
                <span aria-hidden="true">←</span> All checks
              </a>
              <p className="w2-eyebrow">
                Check 04 <i /> Leg vein <i /> Ultrasound
              </p>
            </div>
            <h1 className="w2-title">
              Vein<span>Squeeze</span>
            </h1>
          </div>
          <p className="w2-sentence">{SENTENCE}</p>
          <aside className={`w2-act ${settled ? 'is-on' : ''}`} aria-live="polite">
            <p className="w2-act-k">What to do next</p>
            {settled && act ? (
              <>
                <p className="w2-act-h">{act.headline}</p>
                <p className="w2-act-who">
                  <span className={`w2-dot sev-${act.severity}`} />
                  {act.tierName}
                  <span className="w2-tag">Best case</span>
                </p>
              </>
            ) : (
              <p className="w2-act-wait">
                Hold to press the probe on both veins. The answer lands after the squeeze.
              </p>
            )}
          </aside>
        </header>

        <div className="w2-stage-wrap" data-qa="hero">
          <span className="w2-corner tl" />
          <span className="w2-corner tr" />
          <span className="w2-corner bl" />
          <span className="w2-corner br" />
          <VeinSqueezeMoment
            ref={stageRef}
            className="w2-stage"
            sampleId="clip-a"
            state={pinState}
            onResult={onResult}
            onState={onState}
            onReady={onReady}
          />
        </div>
        <a className="w2-scrollcue" href="#w2-story" onClick={(e) => { e.preventDefault(); document.getElementById('w2-story')?.scrollIntoView({ behavior: 'smooth' }) }}>
          Why this matters in orbit <span aria-hidden="true">↓</span>
        </a>
      </section>

      {/* ---------------------------------------------------------- 01 the problem */}
      <section className="w2-sec w2-story" id="w2-story">
        <div className="w2-sec-num">01</div>
        <p className="w2-kicker">The problem</p>
        <h2>In weightlessness, fluid shifts toward the head.</h2>
        <div className="w2-story-grid">
          <div className="w2-story-copy">
            <div className="w2-stat">
              <b>6<small>of</small>11</b>
              <p>ISS crew had stagnant or reversed blood flow in a neck vein, around flight day 50.</p>
            </div>
            <div className="w2-stat is-hot">
              <b>1</b>
              <p>had a clot. It was found in flight in 2019, and confirmed with this same squeeze test.</p>
            </div>
            <p className="w2-src">Marshall-Goebel et al., JAMA Network Open, 2019.</p>
          </div>
          <BodyDiagram />
          <NeckPanel />
        </div>
      </section>

      {/* ---------------------------------------------------------- 02 the test */}
      <section className="w2-sec w2-test">
        <div className="w2-sec-num">02</div>
        <p className="w2-kicker">The test</p>
        <h2>
          Press with the probe.
          <br />
          Watch the vein.
        </h2>
        <div className="w2-diags">
          <SqueezeDiagram clot={false} />
          <SqueezeDiagram clot />
          <span className="w2-mark">AI-generated illustration</span>
        </div>
        <div className="w2-segthy">
          <div className="w2-segthy-media">
            <Clip src={vs.assetUrl(vs.NECK.segthy.video)} label="Healthy neck vein, slice by slice, with an expert outline" />
          </div>
          <div>
            <p className="w2-kicker">The vein from the 2019 case</p>
            <p className="w2-segthy-txt">{vs.HONESTY_NECK_SEGTHY[1]}</p>
            <p className="w2-mono">{vs.HONESTY_NECK_SEGTHY[0]}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- 03 the wall */}
      <section className="w2-sec w2-wall">
        <div className="w2-sec-num">03</div>
        <p className="w2-kicker">Six real clips</p>
        <h2>Patients the model never saw.</h2>
        <div className="w2-tiles">
          {samples.map((s) => {
            const r = wall[s.id]
            const clot = s.expert.thrombosis === 1
            return (
              <figure key={s.id} className={`w2-tile ${clot ? 'is-clot' : 'is-clean'}`}>
                <div className="w2-tile-media">
                  <Clip src={s.urls.video} label={`Clip ${s.letter}, real leg-vein ultrasound`} />
                  <span className="w2-tile-letter">{s.letter}</span>
                  {s.letter === 'F' && <span className="w2-tile-flag">False alarm</span>}
                </div>
                <figcaption>
                  <div className="w2-tile-row">
                    <span className="w2-mono">Expert</span>
                    <b>{clot ? 'clot' : 'no clot'}</b>
                  </div>
                  <div className="w2-tile-row">
                    <span className="w2-mono">AI clot chance</span>
                    <b className="w2-tile-ai">{r ? formatChance(r.clotProb) : '–'}</b>
                  </div>
                  <div className="w2-tile-bar">
                    <span style={{ width: r ? `${Math.max(1.5, r.clotProb * 100)}%` : '0%' }} />
                  </div>
                  <div className="w2-tile-row">
                    <span className="w2-mono">Squeeze</span>
                    <b>{s.sam2Band ?? 'no curve'}</b>
                  </div>
                </figcaption>
              </figure>
            )
          })}
        </div>
        <p className="w2-note">{vs.HONESTY_HELD_OUT} {vs.HONESTY_HONEST_ERROR}</p>
      </section>

      {/* ---------------------------------------------------------- 04 the work */}
      <section className="w2-sec w2-work">
        <div className="w2-sec-num">04</div>
        <p className="w2-kicker">The work behind it</p>
        <h2>What the model sees.</h2>
        <div className="w2-work-grid">
        <ModelEyes sampleId="clip-a" attention={attA} />
        <ol className="w2-pipe">
          <li>
            <span className="w2-mono">Data</span>
            <b>2,341 clips</b>
            <p>ThrombUS+ leg-vein ultrasound, 594 patients, 5 European hospitals (CC BY 4.0).</p>
          </li>
          <li>
            <span className="w2-mono">Model</span>
            <b>9.9 M parameters</b>
            <p>MobileNetV4 frame encoder plus a 2-block temporal transformer, run in this browser.</p>
          </li>
          <li>
            <span className="w2-mono">Explanation</span>
            <b>SAM 2 outline</b>
            <p>{vs.HONESTY_SQUEEZE}. {vs.HONESTY_BANDS}</p>
          </li>
        </ol>
        </div>
        <details className="w2-know">
          <summary>How do we know?</summary>
          <ul>
            {(hero?.honesty ?? vs.HONESTY_RESULT).map((h) => (
              <li key={h}>{h}</li>
            ))}
            {vs.HONESTY_ACT.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </details>
        <p className="w2-credits">
          Data: ThrombUS+ (Zenodo 17659415, CC BY 4.0) · neck clip: Gillman et al. 2010 (CC BY 2.0) · SegThy (Krönke et
          al. 2022, CC BY 4.0) · SAM 2.1 (Meta, Apache-2.0) · MobileNetV4 via timm (Apache-2.0) · onnxruntime-web · code
          written with Claude (AI).
        </p>
        <button type="button" className="w2-top" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); stageRef.current?.reset() }}>
          Back to the check
        </button>
      </section>
    </div>
  )
}

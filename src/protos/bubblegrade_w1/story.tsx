// Below the chamber: the problem as a short picture story, the six real clips, then the work behind the check.
// Numbers come from app/public/bubblegrade/meta.json and the engine's stored outputs at run time.
import { useEffect, useRef, useState } from 'react'
import * as bubble from '../../engine/bubblegrade'
import sunrise from './earth_sunrise_iss074e0409626.jpg'
import type { BubbleResult, BubbleSample } from '../../engine/bubblegrade'

interface Meta {
  n_clips: number
  n_divers: number
  headline: { alert_auroc: number; sens_tau: number; spec_tau: number }
  floors: { duration: { alert_auroc: number }; loudness: { alert_auroc: number }; nuisance: { alert_auroc: number } }
}

interface DivePoint {
  minutesAfterSurfacing: number
  site: string
  technicianGrade: number
  E: number
  g: number
}
interface Dive {
  nClips: number
  nTimes: number
  points: DivePoint[]
}

// one diver after one dive: the technician's grades and the model's expected grade, every clip, out of fold
function DiveCurve({ d }: { d: Dive }) {
  const W = 1200
  const H = 420
  const L = 70
  const R = 30
  const T = 30
  const B = 64
  const tMax = Math.max(...d.points.map((p) => p.minutesAfterSurfacing))
  const x = (m: number) => L + (m / (tMax * 1.04)) * (W - L - R)
  const y = (g: number) => T + (1 - g / 4) * (H - T - B)
  const times = [...new Set(d.points.map((p) => p.minutesAfterSurfacing))].sort((a, b) => a - b)
  const mean = (m: number, k: 'E' | 'technicianGrade') => {
    const ps = d.points.filter((p) => p.minutesAfterSurfacing === m)
    return ps.reduce((a, p) => a + p[k], 0) / ps.length
  }
  const line = (k: 'E' | 'technicianGrade') => times.map((m, i) => `${i ? 'L' : 'M'} ${x(m).toFixed(1)} ${y(mean(m, k)).toFixed(1)}`).join(' ')
  const area = `${line('E')} L ${x(times[times.length - 1]).toFixed(1)} ${y(0)} L ${x(times[0]).toFixed(1)} ${y(0)} Z`
  const ticks = [0, 60, 120, 180, 240, 300].filter((m) => m <= tMax * 1.04)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bgw1-dive-svg" role="img" aria-label="Technician grades and model grades for one diver's recordings, by minutes after surfacing">
      <defs>
        <linearGradient id="bgw1-dive-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff9a3d" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ff9a3d" stopOpacity="0" />
        </linearGradient>
      </defs>
      {['0', 'I', 'II', 'III', 'IV'].map((g, i) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(i)} y2={y(i)} stroke="#78d2f0" strokeOpacity={i ? 0.1 : 0.3} />
          <text x={L - 18} y={y(i) + 7} textAnchor="end" className="t-g" data-qa="tick">{g}</text>
        </g>
      ))}
      {ticks.map((m) => (
        <text key={m} x={x(m)} y={H - B + 30} textAnchor="middle" className="t-k" data-qa="tick">{m === 0 ? 'surfacing' : `${m} min`}</text>
      ))}
      <path d={area} fill="url(#bgw1-dive-fill)" className="bgw1-dive-area" />
      <path d={line('technicianGrade')} fill="none" stroke="#e9f7fb" strokeOpacity="0.55" strokeWidth="1.6" strokeDasharray="5 6" />
      <path d={line('E')} fill="none" stroke="#ff9a3d" strokeWidth="3" className="bgw1-dive-line" pathLength={1} />
      {d.points.map((p, i) => {
        const j = ((i * 7) % 11) / 10 - 0.5
        return (
          <g key={i}>
            <circle cx={x(p.minutesAfterSurfacing) + j * 14} cy={y(p.technicianGrade)} r="6" fill="none" stroke="#e9f7fb" strokeOpacity="0.55" strokeWidth="1.4" />
            <circle cx={x(p.minutesAfterSurfacing) + j * 14} cy={y(p.E)} r="4" fill="#ff9a3d" opacity="0.85" className="bgw1-dive-dot" style={{ animationDelay: `${(p.minutesAfterSurfacing / tMax) * 1.6}s` }} />
          </g>
        )
      })}
    </svg>
  )
}

/** Phone width (the same break as w1.css): the drawing then shows fewer, larger labels. */
function useCompact() {
  const q = '(max-width: 700px)'
  const [on, setOn] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setOn(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return on
}

const VEIN = 'M 40 262 C 240 262, 300 168, 500 176 S 760 268, 912 214'
const BUBBLES = [
  { r: 5, dur: 11, begin: -1 },
  { r: 8, dur: 13, begin: -4 },
  { r: 4, dur: 9, begin: -6 },
  { r: 10, dur: 14, begin: -8 },
  { r: 6, dur: 10, begin: -2.5 },
  { r: 7, dur: 12, begin: -10 },
  { r: 4, dur: 8.5, begin: -5 },
  { r: 9, dur: 15, begin: -12 },
  { r: 5, dur: 10.5, begin: -7.5 },
]

function Strip({ r }: { r: BubbleResult }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const sp = r.spectrogram
    if (!cv || !sp) return
    const W = Math.min(900, sp.cols)
    const H = sp.rows
    cv.width = W
    cv.height = H
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(W, H)
    const bm = r.bubbleMap
    for (let x = 0; x < W; x++) {
      const c0 = Math.floor((x / W) * sp.cols)
      const c1 = Math.max(c0 + 1, Math.floor(((x + 1) / W) * sp.cols))
      const a = Math.min(1, (bm.values[Math.min(bm.values.length - 1, Math.floor((c0 * sp.frameHopS) / bm.stepS))] ?? 0) * 1.1)
      for (let y = 0; y < H; y++) {
        let m = -9
        for (let c = c0; c < c1 && c < sp.cols; c++) m = Math.max(m, sp.data[(H - 1 - y) * sp.cols + c])
        const v = Math.max(0, Math.min(1, (m + 1.6) / 4.6))
        const e = v * v
        // night -> teal -> pale; the amber wash is the bubble map (one strength per moment, no pitch meaning)
        let R = 4 + e * 150
        let G = 14 + v * 150 + e * 90
        let B = 24 + v * 190 + e * 40
        R = R + (255 - R) * a * (0.25 + 0.55 * v)
        G = G + (140 - G) * a * 0.35
        B = B * (1 - a * 0.55)
        const i = (y * W + x) * 4
        img.data[i] = R
        img.data[i + 1] = G
        img.data[i + 2] = B
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [r])
  return <canvas ref={ref} className="bgw1-strip-cv" role="img" aria-label="The sound picture the model read, with its attention in amber" />
}

/** Section 01, the problem: the ISS photo, the airlock-to-heart drawing, four beats and the card's honesty line.
 *  Also the second screen of DF's BubbleGrade page. On a phone the drawing keeps its full width (no sideways scroll)
 *  and shows fewer, larger labels. */
export function Problem() {
  const compact = useCompact()
  return (
    <section className="bgw1-sec bgw1-problem">
      <p className="bgw1-sec-k">01 <i /> The problem</p>
      <figure className="bgw1-orbit">
        <img src={sunrise} alt="Sunrise over the Earth's edge, photographed from the International Space Station" loading="lazy" />
        <figcaption>Sunrise from the International Space Station. Photo: NASA, public domain.</figcaption>
      </figure>
      <h2 className="bgw1-over">
        Open the airlock, and your blood can <em>fizz</em>.
      </h2>
      <div className="bgw1-fig">
        <svg viewBox="0 0 1200 380" role="img" aria-label="Illustration: pressure drops at the airlock, dissolved gas turns into bubbles, the veins carry them to the heart, and a Doppler probe hears them">
          <defs>
            <linearGradient id="bgw1-vein" x1="0" x2="1">
              <stop offset="0" stopColor="#0c3a4e" />
              <stop offset="0.3" stopColor="#0f5069" />
              <stop offset="1" stopColor="#1a2f55" />
            </linearGradient>
            <radialGradient id="bgw1-heart" cx="0.45" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#ff9a5a" stopOpacity="0.95" />
              <stop offset="0.6" stopColor="#d2443c" stopOpacity="0.7" />
              <stop offset="1" stopColor="#5a1830" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="bgw1-bub" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="0.35" stopColor="#9be8ff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#3fd0ff" stopOpacity="0.05" />
            </radialGradient>
            <filter id="bgw1-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>

          {/* pressure line: cabin, then the suit */}
          <path d="M 40 62 H 300 C 322 62, 318 112, 340 112 H 1160" fill="none" stroke="#3fd0ff" strokeWidth="2" strokeOpacity="0.85" />
          <path d="M 40 62 H 300 C 322 62, 318 112, 340 112 H 1160 V 140 H 40 Z" fill="#3fd0ff" opacity="0.06" />
          <line x1="320" y1="34" x2="320" y2="330" stroke="#e6f6fa" strokeOpacity="0.28" strokeDasharray="3 7" />
          {compact ? (
            <>
              <text x="40" y="50" className="t-k t-c">CABIN</text>
              <text x="356" y="98" className="t-k t-c">SUIT: LOWER PRESSURE</text>
              <text x="332" y="368" className="t-k t-c t-w">AIRLOCK OPENS</text>
            </>
          ) : (
            <>
              <text x="40" y="46" className="t-k">CABIN PRESSURE</text>
              <text x="356" y="98" className="t-k">SUIT PRESSURE: LOWER</text>
              <text x="332" y="346" className="t-k t-w">AIRLOCK OPENS</text>
            </>
          )}

          {/* the vein */}
          <path d={VEIN} fill="none" stroke="#3fd0ff" strokeOpacity="0.14" strokeWidth="78" strokeLinecap="round" filter="url(#bgw1-glow)" />
          <path d={VEIN} fill="none" stroke="url(#bgw1-vein)" strokeWidth="58" strokeLinecap="round" />
          <path d={VEIN} fill="none" stroke="#04121b" strokeWidth="48" strokeLinecap="round" />
          <path d={VEIN} fill="none" stroke="#5fd9ff" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="2 14" className="bgw1-flow" />
          {/* dissolved gas: small specks, before the drop */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle key={`d${i}`} r="1.8" fill="#9be8ff" opacity="0.7">
              <animateMotion dur={`${10 + (i % 3)}s`} begin={`${-i * 1.37}s`} repeatCount="indefinite" path={VEIN} keyPoints="0;0.27" keyTimes="0;1" calcMode="linear" />
              <animate attributeName="opacity" values="0;0.8;0.8;0" keyTimes="0;0.15;0.8;1" dur={`${10 + (i % 3)}s`} begin={`${-i * 1.37}s`} repeatCount="indefinite" />
            </circle>
          ))}
          {/* bubbles: after the drop, growing as they travel */}
          {BUBBLES.map((b, i) => (
            <g key={`b${i}`}>
              <circle r={b.r} fill="url(#bgw1-bub)" stroke="#bff1ff" strokeOpacity="0.85" strokeWidth="1.1" transform={`translate(0 ${((i * 37) % 30) - 15})`}>
                <animateMotion dur={`${b.dur}s`} begin={`${b.begin}s`} repeatCount="indefinite" path={VEIN} keyPoints="0.27;1" keyTimes="0;1" calcMode="linear" />
                <animate attributeName="r" values={`0.5;${b.r};${b.r * 1.25}`} keyTimes="0;0.3;1" dur={`${b.dur}s`} begin={`${b.begin}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.93;1" dur={`${b.dur}s`} begin={`${b.begin}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
          {compact ? (
            <text x="440" y="302" className="t-k t-c">BUBBLES</text>
          ) : (
            <>
              <text x="76" y="318" className="t-k">GAS, DISSOLVED IN THE BODY</text>
              <text x="470" y="250" className="t-k">BUBBLES RIDE THE VEINS</text>
            </>
          )}

          {/* the heart and the probe */}
          <g className="bgw1-heartbeat" style={{ transformOrigin: '990px 210px' }}>
            <circle cx="990" cy="210" r="120" fill="#ff7a4a" opacity="0.16" filter="url(#bgw1-glow)" />
            <path d="M 990 300 C 890 236, 880 160, 928 136 C 958 122, 982 140, 990 162 C 998 140, 1022 122, 1052 136 C 1100 160, 1090 236, 990 300 Z" fill="url(#bgw1-heart)" stroke="#ffb48a" strokeOpacity="0.8" strokeWidth="1.6" />
          </g>
          <g>
            <rect x="1084" y="150" width="76" height="30" rx="15" fill="#0b1c28" stroke="#e6f6fa" strokeOpacity="0.75" strokeWidth="1.4" transform="rotate(24 1122 165)" />
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${1078 - i * 16} ${150 - i * 4} q -14 22 0 46`} fill="none" stroke="#3fd0ff" strokeWidth="2" strokeLinecap="round" className="bgw1-ping" style={{ animationDelay: `${i * 0.22}s` }} />
            ))}
            {compact ? (
              <>
                <text x="1062" y="90" className="t-k t-c">PROBE</text>
                <text x="930" y="354" className="t-k t-c">THE HEART</text>
              </>
            ) : (
              <>
                <text x="1058" y="124" className="t-k">DOPPLER PROBE</text>
                <text x="948" y="330" className="t-k">THE HEART</text>
              </>
            )}
          </g>
        </svg>
        <span className="bgw1-ai">AI-generated illustration</span>
      </div>
      <ol className="bgw1-beats">
        <li>
          <b>1</b>
          <h3>Pressure drops</h3>
          <p>A spacesuit runs at a lower pressure than the cabin. Going outside is like a diver coming up.</p>
        </li>
        <li>
          <b>2</b>
          <h3>Gas leaves the blood</h3>
          <p>Gas that was dissolved in the body can come out as bubbles, the way a soda fizzes when it is opened.</p>
        </li>
        <li>
          <b>3</b>
          <h3>The heart hears it</h3>
          <p>The veins carry them to the heart. A Doppler probe on the chest turns them into sound: chirps over the steady whoosh.</p>
        </li>
        <li>
          <b>4</b>
          <h3>A grade, then an action</h3>
          <p>A technician grades that sound from 0 to IV. BubbleGrade grades it the same way, and says what to do next.</p>
        </li>
      </ol>
      <p className="bgw1-quote">{bubble.HONESTY.card}</p>
    </section>
  )
}

export default function Story({ samples, current, onPick }: { samples: BubbleSample[]; current: string; onPick: (id: string) => void }) {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [clips, setClips] = useState<BubbleResult[]>([])
  const [dive, setDive] = useState<Dive | null>(null)

  useEffect(() => {
    fetch(bubble.assetUrl('bubblegrade/meta.json'))
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {})
    fetch(bubble.assetUrl('bubblegrade/dive_curve.json'))
      .then((r) => r.json())
      .then(setDive)
      .catch(() => {})
    let dead = false
    ;(async () => {
      const out: BubbleResult[] = []
      for (const id of ['grade-0', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'dcs-dive']) {
        try {
          out.push(await bubble.replay(id))
          if (!dead) setClips([...out])
        } catch {
          /* a missing clip only leaves a gap */
        }
      }
    })()
    return () => {
      dead = true
    }
  }, [])

  const pct = (x: number) => `${Math.round(x * 100)}%`
  const hero = clips.find((c) => c.sampleId === current) ?? clips.find((c) => c.sampleId === 'grade-3')
  const bars = meta
    ? [
        { k: 'A rule that reads only the clip length', v: meta.floors.duration.alert_auroc, own: false },
        { k: 'A rule that reads only loudness', v: meta.floors.loudness.alert_auroc, own: false },
        { k: 'A rule that reads every recording circumstance', v: meta.floors.nuisance.alert_auroc, own: false },
        { k: 'BubbleGrade, listening to the sound', v: meta.headline.alert_auroc, own: true },
      ]
    : []

  return (
    <div className="bgw1-story" id="story">
      <Problem />

      <section className="bgw1-sec bgw1-wall">
        <p className="bgw1-sec-k">02 <i /> The evidence</p>
        <h2>
          Six real heartbeats. <em>Look</em> at the difference.
        </h2>
        <p className="bgw1-lede">Each strip is the sound picture the model read, low pitch at the bottom. Amber is where it heard bubble-like sound. Tap one to load it in the chamber.</p>
        <div className="bgw1-strips">
          {clips.map((r) => {
            const s = samples.find((x) => x.id === r.sampleId)
            const tech = s?.meta.technicianGrade ?? ''
            const miss = tech !== r.clip.grade
            return (
              <button key={r.sampleId} type="button" className="bgw1-strip" aria-pressed={r.sampleId === current} data-miss={miss ? '1' : '0'} onClick={() => r.sampleId && onPick(r.sampleId)}>
                <span className="bgw1-strip-g">
                  <b>{r.clip.grade}</b>
                  <i>model</i>
                </span>
                <span className="bgw1-strip-pic">
                  <Strip r={r} />
                </span>
                <span className="bgw1-strip-meta">
                  <strong>{r.sampleId === 'dcs-dive' ? 'From a dive that ended in the bends' : <>Technician heard <span className="bgw1-g">{tech}</span></>}</strong>
                  <span>
                    {r.sampleId === 'dcs-dive' ? `technician ${tech}, model ${r.clip.grade}` : miss ? `a miss: the model says ${r.clip.grade}` : 'the model agrees'} <i>/</i> {r.durS.toFixed(1)} s <i>/</i> {r.clip.alert ? 'alert' : 'no alert'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="bgw1-note">{bubble.HONESTY.footer} Amber shows {bubble.HONESTY.bubbleMap}.</p>
      </section>

      {dive ? (
        <section className="bgw1-sec bgw1-dive">
          <p className="bgw1-sec-k">03 <i /> After the dive</p>
          <h2>
            Bubbles come and go. <em>Listen again</em>.
          </h2>
          <p className="bgw1-lede">
            One diver, after one dive: {dive.nClips} recordings over {dive.nTimes} check times. Rings are what the technician heard; amber dots are what the model heard in
            each recording, scored on a diver it never heard. That is why the check says to re-grade.
          </p>
          <div className="bgw1-dive-fig" tabIndex={0} role="region" aria-label="One diver after one dive: technician and model grades over time">
            <DiveCurve d={dive} />
            <div className="bgw1-dive-key">
              <span><i className="k-t" />technician, by ear</span>
              <span><i className="k-m" />BubbleGrade (expected grade)</span>
              <span>A diver after a dive, not a spacewalk.</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bgw1-sec bgw1-work">
        <p className="bgw1-sec-k">04 <i /> The work behind it</p>
        <h2>
          Trained on divers. Tested on divers it <em>never heard</em>.
        </h2>
        <div className="bgw1-stats">
          <div>
            <b>{meta ? meta.n_clips.toLocaleString('en-US') : '···'}</b>
            <span>real Doppler recordings, digitised from the tapes of diving trials</span>
          </div>
          <div>
            <b>{meta ? meta.n_divers : '···'}</b>
            <span>divers; every score comes from divers the model never heard</span>
          </div>
          <div>
            <b>{meta ? pct(meta.headline.sens_tau) : '···'}</b>
            <span>of high-bubble recordings (grade III to IV) flagged, at {meta ? pct(meta.headline.spec_tau) : '···'} specificity</span>
          </div>
        </div>

        <div className="bgw1-two">
          <div className="bgw1-pipe">
            <h3>From sound to a decision, inside this browser</h3>
            <ol>
              <li>
                <b>Sound</b>
                <span>Doppler audio from a probe over the heart, cut into 5-second slices</span>
              </li>
              <li>
                <b>Picture</b>
                <span>each slice becomes a sound picture with 64 pitch bands</span>
              </li>
              <li>
                <b>Network</b>
                <span>a MobileNetV4 image network that we fine-tuned to grade those pictures</span>
              </li>
              <li>
                <b>Grade</b>
                <span>0 to IV for the clip, an alert, and the next step for the crew</span>
              </li>
            </ol>
            {hero ? (
              <figure className="bgw1-poster">
                <span className="bgw1-poster-pic">
                  <Strip r={hero} />
                </span>
                <span className="bgw1-poster-slices" aria-label="Each 5-second slice's own grade">
                  {hero.windows.map((w, i) => (
                    <i key={i} data-alert={w.A >= hero.clip.tau ? '1' : '0'}>
                      {bubble.GRADES[w.g]}
                    </i>
                  ))}
                </span>
                <figcaption>The clip in the chamber, as the network reads it. Below: each 5-second slice's own grade, one slice every second.</figcaption>
              </figure>
            ) : null}
          </div>
          <div className="bgw1-cheat">
            <h3>Is it cheating?</h3>
            <p>Could a shortcut do as well without listening? We built the shortcuts and scored them the same way (1.0 is perfect, 0.5 is a coin flip).</p>
            <div className="bgw1-bars">
              {bars.map((b) => (
                <div key={b.k} className="bgw1-bar" data-own={b.own ? '1' : '0'}>
                  <span>{b.k}</span>
                  <div>
                    <i style={{ width: `${((b.v - 0.5) / 0.5) * 100}%` }} />
                  </div>
                  <b>{b.v.toFixed(2)}</b>
                </div>
              ))}
            </div>
            <ul className="bgw1-honest">
              <li>{bubble.HONESTY.context}</li>
              <li>Diver data, not astronaut data. The grade IV clip above is shown as a miss on purpose.</li>
            </ul>
          </div>
        </div>
        <p className="bgw1-credits">
          Recordings: Blogg et al. 2026, open Doppler archive (Zenodo 16877955), GPL-3.0-or-later. Network: MobileNetV4-Conv-Medium, ImageNet weights from timm, fine-tuned by SuperHumans. Action steps cite NASA OCHMO-TB-037 and Conkin et al. 2017. Sunrise photo: NASA ISS crew photograph iss074e0409626, public domain. The heart-and-vein drawing is an AI-generated illustration.
        </p>
      </section>
    </div>
  )
}

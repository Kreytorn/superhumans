// HOLE "The black hole": the scroll section below each check's first screen. The problem and its story with real
// imagery first, then briefly how the check works. TrackTrace goes deepest (the eight scans and the IonScan figure).
// Every word and number here comes from work/Web/cards/<module>.md and work/Web/models/<module>.md.
import './story.css'
import neckPoster from './neck_poster.jpg'
import { useEffect, useRef, useState } from 'react'
import { BASE, type ModuleId } from './data'

interface Fact {
  v: string
  k: string
}
interface Story {
  kicker: string
  head: string
  body: string[]
  media: { kind: 'img' | 'video' | 'pair'; src: string; alt: string; caption: string }
  facts: Fact[]
  howHead: string
  how: { t: string; d: string }[]
  note: string
}

const STORIES: Record<ModuleId, Story> = {
  tracktrace: {
    kicker: 'The problem · radiation',
    head: 'A heavy ion leaves a line of broken DNA.',
    body: [
      'Cosmic rays include heavy ions, like iron. Where one crosses a cell nucleus, the DNA breaks, and a repair protein piles up on every break. Each pile glows as a bright spot.',
      'When the spots line up, that line is the ion’s path. In a cell hit by X-rays the spots lie scattered.',
    ],
    media: {
      kind: 'pair',
      src: '',
      alt: 'Two real cell nuclei: one hit by an iron-ion beam, one by X-rays',
      caption: 'Two real nuclei from mice the model never saw. Left: iron-ion beam, 600 MeV/n, ground accelerator. Right: X-rays.',
    },
    facts: [
      { v: '77,177', k: 'mouse-cell nuclei in NASA’s BPS Microscopy set (OSDR OSD-366)' },
      { v: '16,801', k: 'test nuclei from 3 mice the model never saw' },
      { v: '0.954', k: 'rank correlation of its spot counts with NASA’s own count' },
    ],
    howHead: 'How IonScan reads a nucleus: eight scans.',
    how: [
      { t: 'Cut into a grid', d: 'The 128 × 128 image of one nucleus becomes a 32 × 32 grid.' },
      {
        t: 'Read it eight ways',
        d: 'Four directions, each both ways. A selective state-space memory runs along every scan, like a particle detector integrating hits along a path.',
      },
      { t: 'Attention, then a map', d: 'Attention follows, and a decoder paints a map of where the damage spots are.' },
      {
        t: 'Circles, then the line',
        d: 'Each circle is one peak of that map. The line is a straight fit through the circles, drawn only when at least 3 line up with a score of 0.6 or more.',
      },
    ],
    note: 'The track line is a geometric fit through the foci the model found. There is no ground truth for it.',
  },
  bubblegrade: {
    kicker: 'The problem · decompression',
    head: 'After a spacewalk, gas bubbles in the blood can cause the bends.',
    body: [
      'A Doppler probe over the heart turns passing bubbles into sound. A technician listens and grades them from 0 to IV, the scale used in NASA’s decompression chamber trials.',
      'BubbleGrade listens to the same sound and gives the grade.',
    ],
    media: {
      kind: 'img',
      src: '_posters/bubblegrade.jpg',
      alt: 'The heart sound as a picture, with the model’s heat where it heard bubble-like sound',
      caption: 'Real heart Doppler sound from a diver after a dive, never heard in training.',
    },
    facts: [
      { v: '6,826', k: 'recordings from 310 divers, always scored on divers it never heard' },
      { v: '87%', k: 'of high-bubble recordings (grade III-IV) flagged, at 70% specificity' },
    ],
    howHead: 'How it listens.',
    how: [
      { t: 'Slice the sound', d: 'It hears the clip in 5-second slices, as a picture of the sound.' },
      { t: 'Grade each slice', d: 'Each slice gets its chance of grade III or more, against a fixed alert line.' },
      { t: 'One grade', d: 'The grade comes from the average over slices. The heat shows where it heard bubble-like sound.' },
    ],
    note: 'A bubble is a warning; symptoms are the diagnosis. NASA does not use Doppler on astronauts during real spacewalks today; it is used in ground chamber trials.',
  },
  spikecount: {
    kicker: 'The problem · blood',
    head: 'In orbit, astronauts destroy 54% more red blood cells.',
    body: [
      'That figure is from Trudel 2022 (Nature Medicine). On Skylab, NASA counted spiky red cells by hand on an electron microscope: under 1% before flight, up to about 7% late in flight.',
      'SpikeCount outlines every red cell in a light-microscope photo and grades its shape, in the browser. Skylab is history here, not a comparison: a different microscope and preparation.',
    ],
    media: {
      kind: 'img',
      src: '_posters/spikecount.jpg',
      alt: 'A real blood photo with every red cell outlined and coloured by its shape',
      caption: 'Lab blood from healthy donors (RedTell DSE set, Sadafi et al. 2023, CC BY 4.0), not astronaut blood.',
    },
    facts: [
      { v: '0.948', k: 'cell outline F1, on photos it never saw' },
      { v: '0.933', k: 'correlation of its spiky % with the expert’s, over 152 held-out photos' },
    ],
    howHead: 'How it counts.',
    how: [
      { t: 'Outline', d: 'The outliner draws an outline around every red cell.' },
      { t: 'Grade', d: 'The grader names each cell’s shape: a smooth disc, spiky from a few bumps to a ball of fine spikes, or a cup.' },
      { t: 'Count', d: 'Spiky % is spiky cells over all cells, compared with the crew member’s own preflight sample.' },
    ],
    note: 'This does not diagnose space anemia or measure hemolysis.',
  },
  veinsqueeze: {
    kicker: 'The problem · blood clots',
    head: 'In 2019 a clot was found in a neck vein on the ISS.',
    body: [
      'It was confirmed with this same press test. Press the probe: a healthy vein squashes flat, while a vein filled with a clot stays round.',
      'VeinSqueeze reads the clip of that press as an AI second opinion.',
    ],
    media: {
      kind: 'video',
      src: 'veinsqueeze/neck/gillman_clip_sam2.webm',
      alt: 'A real ultrasound clip of a neck vein squeezed flat by the probe, outlined',
      caption: 'A real neck vein squeezed flat by the probe (published ICU clip, no clot), outlined by the same SAM 2 step, not a model verdict.',
    },
    facts: [
      { v: '2,341', k: 'leg-vein clips from 594 patients in 5 European hospitals' },
      { v: '91%', k: 'of clot clips caught on held-out patients, at specificity 0.23' },
    ],
    howHead: 'How it reads the press.',
    how: [
      { t: 'Read 32 frames', d: 'A model reads 32 grey frames of the clip and gives a clot chance.' },
      { t: 'Outline the vein', d: 'Separately, SAM 2 outlines the vein in every frame and draws the squeeze curve.' },
      { t: 'Second opinion', d: 'The clot chance sets what to do next; the curve is supporting evidence only.' },
    ],
    note: 'AI second opinion, screening only: not a diagnosis. Trained on leg-vein ultrasound (ThrombUS+, 5 European hospitals); not tested on neck veins or on astronauts.',
  },
  braindrift: {
    kicker: 'The problem · the brain',
    head: 'On long missions the brain rises in the skull and its fluid spaces swell.',
    body: [
      'Published numbers: +10.7% fluid spaces after long-duration flights (Roberts 2019), and a 2.52 mm upward shift (PNAS 2026, one-year crew).',
      'There is no MRI in orbit today: this is a pre/post-flight gate and a reader for future portable MRI.',
    ],
    media: {
      kind: 'img',
      src: '_posters/braindrift.jpg',
      alt: 'A real brain MRI coloured by the model into its tissue groups',
      caption: 'A real brain the model never saw, warped by the two published numbers. Simulation, not flight data.',
    },
    facts: [
      { v: '0.953', k: 'ventricle Dice on 40 held-out brains' },
      { v: '1.03', k: 'percentage points: its average miss on the simulated change, 40 brains' },
    ],
    howHead: 'How it measures.',
    how: [
      { t: 'Colour every point', d: 'The model colours every point of the brain as one of 6 classes.' },
      { t: 'Measure', d: 'From that map it measures the fluid spaces and the height of the brain’s top.' },
      { t: 'Compare', d: 'Before against after: the change in fluid space and how far the top rose.' },
    ],
    note: 'Not a diagnosis: it does not detect or diagnose SANS or any disease, and it has not been tested on astronaut, low-field or in-flight scans.',
  },
  garnmeter: {
    kicker: 'The problem · space sickness',
    head: 'About 7 in 10 shuttle-era flyers had space motion sickness.',
    body: [
      'That is 419 of 588 person-missions; it usually fades within 3-4 days. Astronaut folklore measures it in Garns, after Senator Jake Garn: 1 Garn is totally sick.',
      'Can a headset read it from brainwaves? We tried. On new people it is close to a coin flip, so the app asks you instead.',
    ],
    media: {
      kind: 'img',
      src: '_posters/garnmeter.jpg',
      alt: 'Real recorded brainwaves with the model’s estimate and the Garn gauge',
      caption: 'Real 14-channel brainwaves from a VR-sickness study: a ground study, not astronauts and not weightlessness.',
    },
    facts: [
      { v: '0.54', k: 'AUROC of the brainwave model on new people (0.5 is a coin flip)' },
      { v: '0.75', k: 'what the scene settings alone tell: the scene, not the brain, carries the signal' },
    ],
    howHead: 'How it works.',
    how: [
      { t: 'Read 4 seconds', d: 'A small state-space network reads 4 seconds of 14-channel brainwaves and estimates Garns.' },
      { t: 'Ask the person', d: 'The gauge and what to do next follow the crew member’s own 1-7 check-in.' },
      { t: 'Translate', d: 'Garns are our translation of the 1-7 discomfort score: (score − 1) / 6.' },
    ],
    note: 'The app suggests; it never doses.',
  },
}

export default function StorySection({ id }: { id: ModuleId }) {
  const s = STORIES[id]
  return (
    <section className="hole-story" id="hole-story" aria-label="The story behind this check">
      <div className="hole-story-top">
        <div className="hole-story-text">
          <p className="hole-kicker">{s.kicker}</p>
          <h3>{s.head}</h3>
          {s.body.map((b) => (
            <p key={b} className="hole-story-p">
              {b}
            </p>
          ))}
        </div>
        <figure className="hole-story-media">
          <div className="hole-story-frame">
            {s.media.kind === 'pair' ? (
              <NucleusPair />
            ) : s.media.kind === 'img' ? (
              <img src={`${BASE}${s.media.src}`} alt={s.media.alt} loading="lazy" draggable={false} />
            ) : (
              <video src={`${BASE}${s.media.src}`} aria-label={s.media.alt} poster={neckPoster} muted loop autoPlay playsInline preload="auto" />
            )}
          </div>
          <figcaption>{s.media.caption}</figcaption>
        </figure>
      </div>

      <div className="hole-facts" data-n={s.facts.length}>
        {s.facts.map((f) => (
          <p key={f.v}>
            <b>{f.v}</b>
            <span>{f.k}</span>
          </p>
        ))}
      </div>

      <div className="hole-how" data-deep={id === 'tracktrace' ? '1' : '0'}>
        <p className="hole-kicker is-ice">How the check works</p>
        <h3>{s.howHead}</h3>
        {id === 'tracktrace' && <ScanFigure />}
        <ol className="hole-steps" data-n={s.how.length}>
          {s.how.map((h, i) => (
            <li key={h.t}>
              <i>{String(i + 1).padStart(2, '0')}</i>
              <b>{h.t}</b>
              <span>{h.d}</span>
            </li>
          ))}
        </ol>
        {id === 'tracktrace' && (
          <figure className="hole-arch">
            <div className="hole-arch-card">
              <img
                src={`${BASE}tracktrace/ionscan_architecture.svg`}
                alt="Diagram of the IonScan network, from the microscope image to the damage spots and the ion path"
                loading="lazy"
              />
              <span className="hole-arch-mark">AI-generated illustration</span>
            </div>
            <figcaption>
              IonScan, our own 3.2 M-parameter network
              <small>3.19 M parameters</small>
            </figcaption>
          </figure>
        )}
        <p className="hole-note">{s.note}</p>
      </div>
    </section>
  )
}

// The eight scans: a 32 x 32 grid read along 0°, 45°, 90° and 135°, each both ways. Drawn by our code; it shows how
// IonScan reads, never what it found.
const DIRS = [0, 45, 90, 135]
function ScanFigure() {
  const n = 32
  const S = 320
  const c = S / n
  const lines: string[] = []
  for (let i = 0; i <= n; i++) {
    lines.push(`M${i * c} 0V${S}`, `M0 ${i * c}H${S}`)
  }
  return (
    <figure className="hole-scan" aria-label="IonScan reads a 32 by 32 grid in four directions, each both ways: eight scans">
      <div className="hole-scan-row">
        {DIRS.map((d, k) => (
          <div key={d} className="hole-scan-cell" style={{ ['--k' as string]: k }}>
            <svg viewBox={`-8 -8 ${S + 16} ${S + 16}`} aria-hidden="true">
              <rect x="0" y="0" width={S} height={S} className="g-bg" />
              <path d={lines.join('')} className="g-grid" />
              <g transform={`rotate(${-d} ${S / 2} ${S / 2})`}>
                <clipPath id={`hole-clip-${d}`}>
                  <rect x="0" y="0" width={S} height={S} transform={`rotate(${d} ${S / 2} ${S / 2})`} />
                </clipPath>
                <g clipPath={`url(#hole-clip-${d})`}>
                  {Array.from({ length: 11 }, (_, r) => {
                    const y = -S * 0.2 + (r * S * 1.4) / 10
                    return (
                      <g key={r}>
                        <line x1={-S * 0.2} x2={S * 1.2} y1={y} y2={y} className="g-row" />
                        <line x1={-S * 0.2} x2={S * 1.2} y1={y} y2={y} className={r % 2 ? 'g-b' : 'g-f'} style={{ animationDelay: `${-r * 0.17}s` }} />
                      </g>
                    )
                  })}
                </g>
                <path d={`M${S * 0.2} ${S / 2}H${S * 0.8}`} className="g-arrow" />
                <path d={`M${S * 0.74} ${S / 2 - 12}L${S * 0.82} ${S / 2}L${S * 0.74} ${S / 2 + 12}`} className="g-arrow" />
                <path d={`M${S * 0.26} ${S / 2 - 12}L${S * 0.18} ${S / 2}L${S * 0.26} ${S / 2 + 12}`} className="g-arrow" />
              </g>
            </svg>
            <span>
              {d}° <i>both ways</i>
            </span>
          </div>
        ))}
      </div>
      <figcaption>
        how IonScan reads every nucleus: a 32 × 32 grid, 4 directions × 2 ways = <b>8 scans</b>
      </figcaption>
      <span className="hole-scan-mark">AI-generated illustration</span>
    </figure>
  )
}

// Two real held-out nuclei from the engine's own gallery, drawn with a plain grey stretch: the hero hit by an iron
// ion (nucleus-238) and the X-ray contrast (nucleus-241). No model output is drawn here.
const PAIR = [
  { id: 'nucleus-238', label: 'Iron ion' },
  { id: 'nucleus-241', label: 'X-rays' },
]
function NucleusPair() {
  const refs = useRef<(HTMLCanvasElement | null)[]>([])
  const [ok, setOk] = useState(true)
  useEffect(() => {
    let live = true
    import('../../engine/tracktrace')
      .then(async (tt) => {
        for (let k = 0; k < PAIR.length; k++) {
          const x = await tt.sampleImage(PAIR[k].id)
          const cv = refs.current[k]
          if (!live || !cv) return
          const sorted = Float32Array.from(x).sort()
          const lo = sorted[Math.floor(sorted.length * 0.01)]
          const hi = sorted[Math.floor(sorted.length * 0.997)] || 1
          const img = new ImageData(128, 128)
          for (let i = 0; i < x.length; i++) {
            const v = Math.max(0, Math.min(1, (x[i] - lo) / Math.max(1e-6, hi - lo)))
            const g = Math.round(Math.pow(v, 0.85) * 255)
            img.data[i * 4] = g
            img.data[i * 4 + 1] = Math.round(g * 0.96)
            img.data[i * 4 + 2] = Math.round(g * 0.9)
            img.data[i * 4 + 3] = 255
          }
          cv.getContext('2d')?.putImageData(img, 0, 0)
        }
      })
      .catch(() => live && setOk(false))
    return () => {
      live = false
    }
  }, [])
  if (!ok) return <img src={`${BASE}_posters/tracktrace.jpg`} alt="A real cell nucleus with its damage spots circled" />
  return (
    <div className="hole-pair">
      {PAIR.map((p, k) => (
        <div key={p.id}>
          <canvas
            width={128}
            height={128}
            ref={(el) => {
              refs.current[k] = el
            }}
          />
          <span>{p.label}</span>
        </div>
      ))}
    </div>
  )
}

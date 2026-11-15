// The scroll section below each check's first screen: the problem and its story with real imagery first, then briefly
// how the check works. Every line comes from work/Web/cards/<id>.md or work/Web/models/<id>.md; no number is made up here.
import './story.css'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import type { Check } from './data'

const BASE = import.meta.env.BASE_URL

interface Step {
  t: string
  d: string
}
interface Fact {
  big: string
  d: string
}
interface Tale {
  kicker: string
  title: string
  body: string[]
  picture: ReactNode
  caption: string
  howTitle: string
  steps: Step[]
  facts: Fact[]
  honest: string
}

const poster = (id: string, alt: string) => <img src={`${BASE}_posters/${id}.jpg`} alt={alt} loading="lazy" decoding="async" />

const CELLS: [string, string][] = [
  ['Disc', 'smooth disc'],
  ['E1', 'grade 1'],
  ['E2', 'grade 2'],
  ['E3', 'grade 3'],
  ['E4', 'grade 4'],
  ['Cup', 'cup'],
]

const TALES: Record<string, Tale> = {
  tracktrace: {
    kicker: 'Radiation',
    title: 'A heavy ion leaves a line of broken DNA.',
    body: [
      'Cosmic radiation includes heavy ions. Where one crosses a cell nucleus, it breaks the DNA along its straight path.',
      'The cell piles a repair protein onto every break, and each pile glows under the microscope as a bright spot. When the spots line up, the line is the ion’s path.',
    ],
    picture: poster('tracktrace', 'One lab sample of mouse-cell nuclei with the hero nucleus enlarged, its damage spots circled and joined by a line'),
    caption: 'One real lab sample, 583 nuclei, hit by an iron-ion beam on the ground. The enlarged nucleus comes from a mouse the model never saw.',
    howTitle: 'How IonScan reads a nucleus in eight scans',
    steps: [
      { t: 'A 32 × 32 grid', d: 'It cuts the 128 × 128 nucleus image into a 32 × 32 grid of pieces.' },
      { t: 'Eight scans', d: 'It reads the grid along rows, columns, then both diagonals, each forward then backward.' },
      { t: 'A memory along the path', d: 'A selective state-space memory carries what it saw, like a particle detector integrating hits along a path. Then attention.' },
      { t: 'Circles, then a line', d: 'Each peak of its spot map becomes a circle. A straight line is fitted only when at least 3 circles line up.' },
    ],
    facts: [
      { big: '0.954', d: 'rank correlation between its spot counts and NASA’s own, on 16,801 nuclei from 3 mice it never saw' },
      { big: '77,177', d: 'mouse skin-cell nuclei in NASA’s BPS Microscopy set (NASA OSDR OSD-366), the set it was trained and tested on' },
    ],
    honest: 'A ground analog on mouse cells, not a crew test. The track line is a geometric fit through the spots the model found; there is no ground truth for it.',
  },
  bubblegrade: {
    kicker: 'Spacewalks',
    title: 'Bubbles in the blood cause the bends.',
    body: [
      'After a spacewalk, gas bubbles in the blood can cause the bends.',
      'A Doppler probe over the heart makes the passing bubbles audible. A trained technician grades what they hear on the Spencer scale, 0 to IV: the scale used in NASA’s decompression chamber trials. BubbleGrade listens the same way.',
    ],
    picture: poster('bubblegrade', 'The heart sound drawn as the spectrogram the model reads, with its running grade'),
    caption: 'A real Doppler clip, drawn as the spectrogram the model hears, with its running grade below.',
    howTitle: 'How it grades a heartbeat',
    steps: [
      { t: '5-second slices', d: 'It hears the clip in 5-second slices, as a spectrogram.' },
      { t: 'A grade per slice', d: 'For each slice it gives the chance that the grade is at least I, II, III and IV.' },
      { t: 'The spacewalk alert', d: 'The slices are averaged into one clip grade, and an alert when grade III or above is likely.' },
    ],
    facts: [
      { big: '6,826', d: 'real Doppler recordings from 310 divers trained it: diver data, not astronaut data' },
      { big: '87%', d: 'of grade III-IV clips flagged, at 70% specificity, on divers it never heard' },
    ],
    honest: 'It does not diagnose or rule out the bends. Grade IV is mostly read as III, so symptoms, not the model, drive the red step.',
  },
  spikecount: {
    kicker: 'Space anemia',
    title: 'In orbit, astronauts destroy 54% more red blood cells.',
    body: [
      'That is space anemia (Trudel 2022, Nature Medicine).',
      'In the 1970s, NASA’s Skylab experiment M115 counted spiky red cells by hand, on an electron microscope. SpikeCount outlines and grades every cell in an ordinary light-microscope photo.',
    ],
    picture: (
      <div className="gx-cells">
        {CELLS.map(([k, label]) => (
          <figure key={k}>
            <img src={`${BASE}spikecount/gallery/${k}_00.png`} alt={`A real red blood cell, ${label}`} loading="lazy" decoding="async" />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </div>
    ),
    caption: 'Real red cells from the RedTell set (Sadafi et al. 2023), one per shape: from a smooth disc to a ball of fine spikes, plus a cup.',
    howTitle: 'How it grades a drop of blood',
    steps: [
      { t: 'Outline', d: 'The outliner draws an outline around every red cell in the photo.' },
      { t: 'Grade', d: 'The grader names each cell’s shape: a smooth disc, spiky grade 1 to 4, or a cup.' },
      { t: 'Count', d: 'The field’s spiky % comes from those grades and is compared with the astronaut’s own preflight sample.' },
    ],
    facts: [
      { big: '0.933', d: 'correlation between its field spiky % and the experts’, on fields it never saw' },
      { big: '~5,700', d: 'expert-graded cells trained it: healthy-donor research blood, not astronaut blood' },
    ],
    honest: 'It does not diagnose space anemia or measure red-cell loss. Our spiky % cannot be compared with Skylab’s: a different microscope and preparation.',
  },
  veinsqueeze: {
    kicker: 'Blood clots',
    title: 'The first clot found in space was confirmed by a squeeze.',
    body: [
      'In 2019, a clot was found in a crew member’s neck vein on the ISS. It was confirmed with exactly this test (JAMA Netw Open 2019).',
      'Press the ultrasound probe: a healthy vein squashes flat, a clotted one stays round.',
    ],
    picture: (
      <div className="gx-clips">
        <figure>
          <video src={`${BASE}veinsqueeze/clips/clip_A.webm`} muted loop autoPlay playsInline preload="metadata" aria-label="Ultrasound clip: the vein stays round under pressure" />
          <figcaption>Stays round</figcaption>
        </figure>
        <figure>
          <video src={`${BASE}veinsqueeze/clips/clip_B.webm`} muted loop autoPlay playsInline preload="metadata" aria-label="Ultrasound clip: the vein squeezes flat under pressure" />
          <figcaption>Squeezes flat</figcaption>
        </figure>
      </div>
    ),
    caption: 'Two real leg-vein clips from the same patient: with a clot, and clean. Best case, not a typical result.',
    howTitle: 'How it reads a squeeze',
    steps: [
      { t: '32 frames', d: 'It reads 32 grey frames of a leg-vein compression clip.' },
      { t: 'A clot probability', d: 'It gives the chance of a clot, and a strip of where in the clip it looked.' },
      { t: 'The squeeze curve', d: 'SAM 2, Meta’s general video model, outlines the vein in every frame. Its area is the curve: it explains, it does not decide.' },
    ],
    facts: [
      { big: '2,341', d: 'leg-vein clips from 594 patients in 5 European hospitals (ThrombUS+) trained it' },
      { big: 'Screening', d: 'only: shipped as an AI second opinion, never a diagnosis' },
    ],
    honest: 'Tested on leg veins, not neck veins, and never on astronauts. It does not replace a radiologist.',
  },
  braindrift: {
    kicker: 'The brain',
    title: 'On long missions, the brain rises in the skull.',
    body: [
      'Long missions push the brain upward in the skull and swell its fluid spaces.',
      'No astronaut scans are public. So BrainDrift flies a real brain in simulation: a held-out MRI warped by two published numbers, then measured by the model.',
    ],
    picture: poster('braindrift', 'A real brain MRI in 3D with its fluid spaces lit in blue'),
    caption: 'A real brain MRI, its fluid-filled ventricles lit in blue.',
    howTitle: 'How it measures the drift',
    steps: [
      { t: 'Every voxel', d: 'The model colours every voxel of a brain MRI into 6 classes.' },
      { t: 'Two measures', d: 'From them it measures the ventricle volume and the height of the top of the brain.' },
      { t: 'Before and after', d: 'On a before and after pair it reads the ventricle change in % and the rise in mm.' },
    ],
    facts: [
      { big: '0.953', d: 'ventricle overlap (Dice) with FreeSurfer’s labels, on 40 held-out brains' },
      { big: '4.1%', d: 'day-to-day ventricle noise (95th percentile) in real repeat scans of 3 adults, 40 scans each' },
    ],
    honest: 'The flight is a simulation. It does not detect or diagnose any disease, and was never tested on astronaut or in-flight scans.',
  },
  garnmeter: {
    kicker: 'Space sickness',
    title: 'About 7 in 10 shuttle-era flyers got space sick.',
    body: [
      'That is 419 of 588 person-missions with space motion sickness. It usually fades within 3-4 days.',
      'The Garn is astronaut folklore, named after Senator Jake Garn: not an official or clinical NASA unit. 0 is fine, 1 is totally sick.',
    ],
    picture: poster('garnmeter', 'Fourteen EEG traces, the Garn reading over the session and a scalp map'),
    caption: 'Test person USER19, session 3: real 14-channel EEG from a person the model never saw in training.',
    howTitle: 'How it reads space sickness',
    steps: [
      { t: 'The check-in', d: 'The crew member says how they feel, 1 to 7. That drives the green, yellow or red zone.' },
      { t: 'The brainwaves', d: 'A small state-space model reads 4 s of 14-channel EEG and estimates Garns.' },
      { t: 'The honest part', d: 'On people it never saw, the EEG barely beat a coin flip. So the check-in, not the EEG, drives alerts.' },
    ],
    facts: [
      { big: '0.54', d: 'AUROC of the EEG model on 32 people it never saw; 0.5 is a coin flip' },
      { big: '33', d: 'people in a VR-sickness study gave the data: a ground study, not astronauts, not weightlessness' },
    ],
    honest: 'The app suggests; it never doses. It does not predict vomiting.',
  },
}

// IonScan's eight scans, in the real order: rows, columns, then both diagonals, each forward then backward.
const SCANS: { name: string; d: [number, number] }[] = [
  { name: 'rows →', d: [1, 0] },
  { name: 'rows ←', d: [-1, 0] },
  { name: 'columns ↓', d: [0, 1] },
  { name: 'columns ↑', d: [0, -1] },
  { name: 'diagonal ↘', d: [1, 1] },
  { name: 'diagonal ↖', d: [-1, -1] },
  { name: 'diagonal ↙', d: [-1, 1] },
  { name: 'diagonal ↗', d: [1, -1] },
]

function ScanGrid({ d, i }: { d: [number, number]; i: number }) {
  const S = 96
  const g = 8
  const step = S / g
  const lines: string[] = []
  // four parallel passes across the grid in this scan's direction, each clipped to the square
  const diag = d[0] !== 0 && d[1] !== 0
  const len = Math.hypot(d[0], d[1])
  const ux = d[0] / len, uy = d[1] / len
  const nx = -uy, ny = ux
  const h = S / 2 - 8
  for (const o of [-30, -10, 10, 30]) {
    const half = (diag ? h * Math.SQRT2 - Math.abs(o) : h) - 4
    const cx = S / 2 + nx * o, cy = S / 2 + ny * o
    lines.push(`M${(cx - ux * half).toFixed(1)} ${(cy - uy * half).toFixed(1)}L${(cx + ux * half).toFixed(1)} ${(cy + uy * half).toFixed(1)}`)
  }
  return (
    <svg viewBox={`0 0 ${S} ${S}`} aria-hidden="true" style={{ ['--i' as string]: i }}>
      {Array.from({ length: g + 1 }, (_, k) => (
        <g key={k}>
          <line x1={k * step} y1={0} x2={k * step} y2={S} />
          <line x1={0} y1={k * step} x2={S} y2={k * step} />
        </g>
      ))}
      <g className="gx-scan-beams">
        {lines.map((p, k) => (
          <path key={k} d={p} className="gx-scan-beam" markerEnd="url(#gx-arrow)" />
        ))}
      </g>
    </svg>
  )
}

function Scans() {
  return (
    <div className="gx-scans">
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <marker id="gx-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>
      </svg>
      <ol>
        {SCANS.map((s, i) => (
          <li key={s.name}>
            <ScanGrid d={s.d} i={i} />
            <span>
              <b>{i + 1}</b>
              {s.name}
            </span>
          </li>
        ))}
      </ol>
      <p className="gx-scans-cap">How IonScan reads every nucleus: the eight scans in their real order. They show how it reads, not what it found.</p>
    </div>
  )
}

export default function Story({ check, next, onBack, onGo }: { check: Check; next: Check; onBack: () => void; onGo: (id: string) => void }) {
  const tale = TALES[check.id]
  if (!tale) return null
  const deep = check.id === 'tracktrace'
  return (
    <div className={`gx-story${deep ? ' is-deep' : ''}`} id={`gx-story-${check.id}`}>
      <section className="gx-tale">
        <div className="gx-tale-text">
          <p className="gx-kicker">
            <b>The problem</b>
            {tale.kicker}
          </p>
          <h2>{tale.title}</h2>
          {tale.body.map((p) => (
            <p key={p} className="gx-tale-body">
              {p}
            </p>
          ))}
        </div>
        <figure className="gx-tale-pic">
          <div className="gx-tale-frame">{tale.picture}</div>
          <figcaption>{tale.caption}</figcaption>
        </figure>
      </section>

      <section className="gx-how">
        <p className="gx-kicker">
          <b>How it works</b>
          {check.name}
        </p>
        <h2>{tale.howTitle}</h2>
        <ol className={`gx-steps n${tale.steps.length}`}>
          {tale.steps.map((s, i) => (
            <li key={s.t}>
              <span className="gx-step-n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>

        {deep && (
          <>
            <Scans />
            <figure className="gx-arch">
              <div className="gx-arch-frame">
                <div className="gx-arch-card">
                  <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Architecture diagram of the IonScan network" loading="lazy" />
                </div>
              </div>
              <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
            </figure>
          </>
        )}

        <div className="gx-facts">
          {tale.facts.map((f) => (
            <p key={f.big}>
              <b>{f.big}</b>
              <span>{f.d}</span>
            </p>
          ))}
        </div>
        <p className="gx-honest">{tale.honest}</p>
      </section>

      <nav className="gx-story-nav" aria-label="More checks">
        <button type="button" className="gx-story-back" onClick={onBack}>
          <ArrowLeft weight="bold" />
          All six checks
        </button>
        <button type="button" className="gx-story-next" onClick={() => onGo(next.id)} style={{ ['--hue' as string]: next.hue }}>
          <small>Next check</small>
          <span>
            {next.name}
            <ArrowRight weight="bold" />
          </span>
        </button>
      </nav>
    </div>
  )
}

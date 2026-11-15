// DF check page, second screen: scroll below the stage for the problem and its story (real imagery first),
// then briefly how the check works. TrackTrace goes deepest: IonScan's eight scans and its architecture figure.
// Words and numbers come from work/Web/cards/<module>.md and work/Web/models/<module>.md only.
import type { CSSProperties } from 'react'
import './story.css'
import { MODS, href, type Mod } from './data'
import ArchSection from './arch'

const BASE = import.meta.env.BASE_URL

interface Story {
  /** Real imagery: a result still from the stage, or a real microscope field. */
  img: string
  imgAlt: string
  imgCap: string
  kicker: string
  head: string
  body: string[]
  /** Where the story's context line comes from (shown small). */
  src?: string
  steps: { t: string; d: string }[]
  /** One trust number with what it means, from the model brief. */
  stat: { n: string; d: string }
  /** The fixed line that keeps the stat honest. */
  limit: string
}

const STORIES: Record<string, Story> = {
  tracktrace: {
    img: `${BASE}_posters/tracktrace.jpg`,
    imgAlt: 'A real cell nucleus under the microscope with the DNA-damage spots IonScan circled, beside its whole sample',
    imgCap: 'Real microscope image, real model output.',
    kicker: 'The problem',
    head: 'Cosmic rays carry heavy ions. One can leave a straight line of DNA breaks.',
    body: [
      'Each bright spot in a nucleus is a place where a repair protein piles up on a broken DNA strand. IonScan, our own model, circles every spot and counts them.',
      'When the spots line up, a geometric rule draws the line: the straight path of a heavy ion, the kind in cosmic rays.',
    ],
    src: 'Ground analog: mouse skin-cell nuclei hit by an accelerator beam of iron ions or by X-rays on the ground, not real cosmic rays in astronauts, and not a validated crew assay.',
    steps: [],
    stat: { n: '0.954', d: 'rank correlation between its spot counts and NASA’s, on 16,801 nuclei from 3 mice it never saw' },
    limit: 'The foci labels come from NASA’s original 2016 analysis program, not from hand annotation.',
  },
  bubblegrade: {
    img: `${BASE}_posters/bubblegrade.jpg`,
    imgAlt: 'The heart sound as a picture, with the parts the model heard as bubble-like tinted',
    imgCap: 'A real heart Doppler recording from a diver, as the model heard it.',
    kicker: 'The problem',
    head: 'After a spacewalk, gas bubbles in the blood can cause the bends.',
    body: [
      'A probe over the heart hears the bubbles as streaks of sound. A technician grades them by ear on a scale of 0 to IV.',
      'BubbleGrade listens to the same sound and gives the grade.',
    ],
    src: 'NASA does not use Doppler on astronauts during real spacewalks today; it is used in ground chamber trials.',
    steps: [
      { t: 'Listen in slices', d: 'It hears the clip in 5-second slices.' },
      { t: 'Grade each slice', d: 'For each slice, the chance the grade is at least I, II, III and IV.' },
      { t: 'One grade, one alert', d: 'The slices average into the clip’s grade, and an alert when grade III or more is likely.' },
    ],
    stat: { n: '0.892', d: 'AUROC of the spacewalk alert, on 6,826 recordings from 310 divers it never heard' },
    limit: 'Diver data, not astronaut data. A bubble is a warning; symptoms are the diagnosis.',
  },
  spikecount: {
    img: `${BASE}spikecount/fields/96.png`,
    imgAlt: 'A real microscope photo of red blood cells, many of them spiky',
    imgCap: 'A real x100 microscope photo of lab blood, never seen in training.',
    kicker: 'The problem',
    head: 'In orbit, astronauts destroy 54% more red blood cells.',
    body: [
      'On Skylab, NASA counted spiky red cells by hand on an electron microscope: the share rose in flight and fell back within hours of re-entry.',
      'SpikeCount counts them on a light-microscope photo and compares the share with the astronaut’s own sample from before flight.',
    ],
    src: 'Trudel 2022, Nature Medicine; Skylab M115 (NTRS 19750006315).',
    steps: [
      { t: 'Outline', d: 'The outliner draws an outline around every red cell.' },
      { t: 'Grade the shape', d: 'The grader names each one: a smooth disc, spiky from E1 to E4, or a cup.' },
      { t: 'Compare', d: 'The spiky share of the photo, against the crew member’s own preflight sample.' },
    ],
    stat: { n: '0.933', d: 'correlation between its spiky % and the expert’s, on photos it never saw' },
    limit: 'Trained on healthy-donor research blood, not astronaut blood. It does not diagnose space anemia.',
  },
  veinsqueeze: {
    img: `${BASE}_posters/veinsqueeze.jpg`,
    imgAlt: 'Two real leg-vein ultrasound clips side by side with the vein outlined',
    imgCap: 'Two real leg-vein ultrasound clips from one patient the model never trained on.',
    kicker: 'The problem',
    head: 'The first clot found in space was confirmed with this squeeze test.',
    body: [
      'Press a probe on a vein: a healthy vein squashes flat, a clot-filled vein stays round.',
      'VeinSqueeze reads leg-vein ultrasound clips and gives an AI second opinion, for screening only.',
    ],
    src: 'ISS, 2019, in a neck vein (JAMA Netw Open 2019). VeinSqueeze was trained on leg veins, not neck veins.',
    steps: [
      { t: 'Outline the vein', d: 'SAM 2 outlines the vein in every frame; the curve is its area against the start.' },
      { t: 'A second opinion', d: 'A separate model reads 32 frames of the clip and gives a clot chance.' },
      { t: 'Kept apart', d: 'The curve explains what you see; it never feeds the AI number or the next step.' },
    ],
    stat: { n: '0.785', d: 'AUC over 594 patients, each scored by a model that never trained on them' },
    limit: 'Shipped as an AI second opinion, screening only. It does not replace a radiologist.',
  },
  braindrift: {
    img: `${BASE}_posters/braindrift.jpg`,
    imgAlt: 'One slice of a real brain MRI in a dark scanner window, the fluid spaces the AI mapped outlined in glowing green',
    imgCap: 'One real brain MRI the model never saw, before flight, mapped by the AI.',
    kicker: 'The problem',
    head: 'Long missions push the brain upward and swell its fluid spaces.',
    body: [
      'No astronaut scans exist in public. So we take one real brain MRI, before flight, and the same brain after a simulated long flight.',
      'BrainDrift maps both and measures what changed: the fluid spaces, and how far the top of the brain rose.',
    ],
    steps: [
      { t: 'Fly it', d: 'Dragging steps through five stored frames of the simulation.' },
      { t: 'Map it', d: 'On release the model colours every point of the brain as one of 6 classes.' },
      { t: 'Measure it', d: 'Fluid-space volume and the brain’s top, after against before.' },
    ],
    stat: { n: '0.953', d: 'overlap (Dice) of its fluid-space map with the reference labels, on 40 brains it never saw' },
    limit: 'The swelling is a simulation we put in, not flight data. It does not diagnose any disease.',
  },
  garnmeter: {
    img: `${BASE}_posters/garnmeter.jpg`,
    imgAlt: 'Recorded brainwaves, the model’s reading under them, and the Garn gauge',
    imgCap: 'Real 14-channel brainwaves from a VR-sickness study, played back.',
    kicker: 'The problem',
    head: 'About 7 in 10 shuttle-era flyers had space motion sickness.',
    body: [
      'That is 419 of 588 person-missions; it usually fades within 3-4 days.',
      'Garn Meter reads 4 seconds of brainwaves from a 14-channel headset, every half second, and gives its reading in Garns: 0 is fine, 1 is totally sick. It is an experimental model.',
    ],
    src: 'NASA MEDPRAT ICL97. The Garn is folklore, not an official unit.',
    steps: [],
    stat: { n: '32', d: 'people it learned from: 2,592 brainwave trials from a VR-sickness study' },
    limit: 'Tested in a VR-sickness study on the ground, not on astronauts or in weightlessness.',
  },
}

/** IonScan's eight scans in the real order: rows, columns, then both diagonals, each forward then backward. */
const SCANS: { name: string; a: [number, number, number, number] }[] = [
  { name: 'rows', a: [8, 50, 92, 50] },
  { name: 'rows, back', a: [92, 50, 8, 50] },
  { name: 'columns', a: [50, 8, 50, 92] },
  { name: 'columns, back', a: [50, 92, 50, 8] },
  { name: 'diagonal', a: [10, 90, 90, 10] },
  { name: 'diagonal, back', a: [90, 10, 10, 90] },
  { name: 'other diagonal', a: [10, 10, 90, 90] },
  { name: 'other diagonal, back', a: [90, 90, 10, 10] },
]

function ScanTile({ a, i }: { a: [number, number, number, number]; i: number }) {
  const [x0, y0, x1, y1] = a
  const n = 7
  const cells = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push(<circle key={`${r}-${c}`} cx={8 + c * 14} cy={8 + r * 14} r="1.6" />)
  // Parallel reading lines in the tile's direction: the one arrow says which way each line is read.
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const ox = (-dy / len) * 22
  const oy = (dx / len) * 22
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={{ '--i': i } as CSSProperties}>
      <g className="dots">{cells}</g>
      {[-1, 1].map((k) => (
        <line key={k} className="ghost" x1={x0 + ox * k} y1={y0 + oy * k} x2={x1 + ox * k} y2={y1 + oy * k} />
      ))}
      <line className="beam" x1={x0} y1={y0} x2={x1} y2={y1} pathLength={1} />
      <path className="head" d={`M ${x1} ${y1} l ${(-dx / len) * 12 + (-dy / len) * 7} ${(-dy / len) * 12 + (dx / len) * 7} M ${x1} ${y1} l ${(-dx / len) * 12 - (-dy / len) * 7} ${(-dy / len) * 12 - (dx / len) * 7}`} />
    </svg>
  )
}

function IonScanDeep() {
  return (
    <section className="df-story-deep" aria-labelledby="df-ionscan-h">
      <p className="df-story-kicker">How it works</p>
      <h2 id="df-ionscan-h" className="df-story-h">How IonScan reads a nucleus in eight scans</h2>
      <div className="df-story-scan">
        <div className="df-story-scan-text">
          <ol className="df-story-steps is-deep">
            <li>
              <b>A grid of tokens</b>
              <span>It cuts the 128 x 128 image into a 32 x 32 grid.</span>
            </li>
            <li>
              <b>Eight scans</b>
              <span>It reads the grid along 4 directions, each both ways, with a selective state-space memory: like a particle detector integrating hits along a path.</span>
            </li>
            <li>
              <b>Then attention</b>
              <span>Attention and a decoder give one map of spots. Each circle is one peak of that map; the count is the number of circles.</span>
            </li>
            <li>
              <b>A line only when they line up</b>
              <span>At least 3 circles in line and a fit score of 0.6 or more. The scans show how it reads, never a found direction.</span>
            </li>
          </ol>
        </div>
        <figure className="df-story-scan-fig">
          <div className="df-story-scan-grid">
            {SCANS.map((s, i) => (
              <div key={s.name} className="df-story-scan-tile">
                <ScanTile a={s.a} i={i} />
                <span>
                  <em>{i + 1}</em> {s.name}
                </span>
              </div>
            ))}
          </div>
          <figcaption>
            how IonScan reads every nucleus <span className="df-story-mark">AI-generated diagram</span>
          </figcaption>
        </figure>
      </div>

      <figure className="df-story-arch">
        <div className="df-story-arch-card">
          <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network: the layers a nucleus image passes through, and one IonScan block with its four scan directions" loading="lazy" />
        </div>
        <figcaption>
          <b>IonScan, our own 3.2 M-parameter network</b>
          <span>The track line is a geometric fit through the foci the model found. There is no ground truth for it.</span>
        </figcaption>
      </figure>
    </section>
  )
}

export default function StorySection({ mod }: { mod: Mod }) {
  const s = STORIES[mod.id]
  if (!s) return null
  const deep = mod.id === 'tracktrace'
  return (
    <div className={`df-story${deep ? ' is-deep' : ''}`}>
      <section className="df-story-problem" aria-labelledby={`df-story-${mod.id}`}>
        <figure className="df-story-img">
          <img src={s.img} alt={s.imgAlt} loading="lazy" decoding="async" />
          <figcaption>{s.imgCap}</figcaption>
        </figure>
        <div className="df-story-text">
          <p className="df-story-kicker">{s.kicker}</p>
          <h2 id={`df-story-${mod.id}`} className="df-story-h" tabIndex={-1}>
            {s.head}
          </h2>
          {s.body.map((p) => (
            <p key={p} className="df-story-p">
              {p}
            </p>
          ))}
          {s.src && <p className="df-story-src">{s.src}</p>}
        </div>
      </section>

      {/* r4: the step cards ("How it works") are gone; the check's architecture figure takes their place. */}
      {deep ? <IonScanDeep /> : <ArchSection id={mod.id} />}

      <section className="df-story-trust" aria-label="How well it works">
        <p className="df-story-stat">
          <b>{s.stat.n}</b>
          <span>{s.stat.d}</span>
        </p>
        <p className="df-story-limit">{s.limit}</p>
      </section>

      <NextNav mod={mod} />
    </div>
  )
}

/** The end of every check page: back to the body, or on to the next check. Also used by the pages in ./pages/. */
export function NextNav({ mod }: { mod: Mod }) {
  const i = MODS.findIndex((m) => m.id === mod.id)
  const next = MODS[(i + 1) % MODS.length]
  return (
    <nav className="df-story-next" aria-label="More checks">
      <a className="df-story-home" href={href('home')}>
        Back to the body
      </a>
      <a className="df-story-credits" href={href('credits')}>
        Credits
      </a>
      <a className="df-story-go" href={href(next.id)} style={{ '--nc': next.color } as CSSProperties}>
        <span>Next check</span>
        <b>{next.name}</b>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </nav>
  )
}

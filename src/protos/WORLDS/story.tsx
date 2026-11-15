// WORLDS "Six worlds": the scroll section under every check page. First the problem and its story with a real
// picture, then briefly how the check works. TrackTrace goes deepest (IonScan's eight scans and its figure).
// Every line here comes from work/Web/cards/<module>.md or work/Web/models/<module>.md.
import type { MouseEvent, ReactNode } from 'react'
import './story.css'
import { BASE, type ModuleId, type World } from './data'

interface Story {
  image: string
  imageAlt: string
  imageCaption: string
  headline: ReactNode
  body: string[]
  source: string
  how: { t: string; d: string }[]
}

const STORIES: Record<ModuleId, Story> = {
  tracktrace: {
    image: '_posters/tracktrace.jpg',
    imageAlt: 'A cell nucleus with its DNA-damage spots circled and a straight line through them',
    imageCaption: 'The whole sample: 583 real mouse-cell nuclei hit by an iron-ion beam on the ground, one of them enlarged.',
    headline: (
      <>
        Two cells. One was hit by X&#8209;rays, one by an iron ion, <i>the heavy kind in cosmic rays.</i>
      </>
    ),
    body: ['Every bright spot is a DNA double-strand break, where the repair protein 53BP1 piles up.', 'The AI circles every break, and where the breaks line up, that line is the ion’s path.'],
    source: 'Data: NASA BPS Microscopy, 77,177 mouse skin-cell nuclei (NASA OSDR OSD-366), hit on the ground by an accelerator beam. A ground analog, not a crew test.',
    how: [
      {
        t: 'Grid',
        d: 'IonScan cuts the nucleus image into a 32 x 32 grid of tokens.',
      },
      {
        t: 'Eight scans',
        d: 'It reads the grid along 4 directions, each both ways: rows, columns, then both diagonals.',
      },
      {
        t: 'Memory',
        d: 'A selective state-space memory carries each scan along, like a particle detector integrating hits along a path. Then attention.',
      },
      {
        t: 'Circles',
        d: 'Each circle is one peak of the model’s spot map above 0.5. The count is the number of circles.',
      },
      {
        t: 'Track',
        d: 'When at least 3 circles line up with a score of 0.6 or more, a straight geometric fit draws the ion’s path.',
      },
    ],
  },
  bubblegrade: {
    image: '_posters/bubblegrade.jpg',
    imageAlt: 'The spectrogram of a heart Doppler recording with the model’s bubble map',
    imageCaption: '15.7 s of real heart Doppler sound from a diver after a dive, never heard in training.',
    headline: (
      <>
        After a spacewalk, gas bubbles in the blood <i>can cause the bends.</i>
      </>
    ),
    body: [
      'A probe over the heart turns blood flow into sound, and the bubbles can be heard and seen as streaks.',
      'They are graded on the Spencer scale, 0 to IV: the scale a Doppler technician uses in NASA’s decompression chamber trials.',
    ],
    source: 'Trained on 6,826 real Doppler recordings from 310 divers (Blogg et al. 2026 open archive). Diver data, not astronaut data.',
    how: [
      {
        t: 'Listen',
        d: 'The sound becomes the spectrogram you see: the exact picture the model looks at.',
      },
      {
        t: 'Slice',
        d: 'It hears the clip in 5-second slices and gives each slice its chance of grade I, II, III and IV.',
      },
      {
        t: 'Grade',
        d: 'The slices are averaged into one grade and a spacewalk alert.',
      },
    ],
  },
  spikecount: {
    image: 'spikecount/fields/96.png',
    imageAlt: 'A light-microscope photo of red blood cells, some smooth and some spiky',
    imageCaption: 'A real x100 microscope photo of lab blood, never seen in training.',
    headline: (
      <>
        In orbit, astronauts destroy <i>54% more red blood cells.</i>
      </>
    ),
    body: ['On Skylab, NASA counted spiky red cells by hand on an electron microscope.', 'This counts them in the browser.'],
    source: 'Trudel 2022, Nature Medicine. Trained on about 5,700 expert-graded cells from the RedTell dataset (Sadafi et al. 2023, CC BY 4.0): healthy-donor research blood, not astronaut blood.',
    how: [
      {
        t: 'Outline',
        d: 'The outliner draws an outline around every red cell in the photo.',
      },
      {
        t: 'Grade',
        d: 'The grader names each cell’s shape: a smooth disc, spiky from E1 to E4, or a cup.',
      },
      {
        t: 'Count',
        d: 'The share of spiky cells (grades 1 to 4) is the field’s number.',
      },
    ],
  },
  veinsqueeze: {
    image: '_posters/veinsqueeze.jpg',
    imageAlt: 'Two leg-vein ultrasound clips side by side with their squeeze curves',
    imageCaption: 'Two real leg-vein ultrasound clips: two veins of one patient the model never trained on.',
    headline: (
      <>
        A clot is a vein <i>that won’t squash.</i>
      </>
    ),
    body: [
      'The first clot found in space, on the ISS in 2019 in a neck vein, was confirmed with exactly this squeeze test.',
      'Press, and the healthy vein squeezes while the clotted one stays round.',
    ],
    source: 'JAMA Netw Open 2019. Trained on ThrombUS+ (CC BY 4.0): 2,341 clips of leg veins from 594 patients in 5 European hospitals.',
    how: [
      {
        t: 'Press',
        d: 'The clip is the real recorded press of the probe on the vein.',
      },
      {
        t: 'Outline',
        d: 'SAM 2, Meta’s video model, outlines the vein in every frame; the curve is its area.',
      },
      {
        t: 'Second opinion',
        d: 'Our model reads 32 frames of the clip and gives its clot chance.',
      },
    ],
  },
  braindrift: {
    image: '_posters/braindrift.jpg',
    imageAlt: 'Slices of a brain MRI coloured by the model',
    imageCaption: 'One real brain MRI the model never saw, before flight and after a simulated long flight.',
    headline: (
      <>
        On long missions the brain rises in the skull <i>and its fluid spaces swell.</i>
      </>
    ),
    body: ['No astronaut scans exist in public.', 'So the flight is a simulation: a real brain the model never saw, warped by two published numbers, then measured by the model.'],
    source: 'Trained on 332 OASIS-1 brain MRIs with automatic FreeSurfer-derived labels. Not tested on astronaut or in-flight scans.',
    how: [
      {
        t: 'Colour',
        d: 'The model colours every point of the brain as one of 6 classes.',
      },
      {
        t: 'Measure',
        d: 'It measures the fluid spaces and the height of the brain’s top.',
      },
      {
        t: 'Compare',
        d: 'After against before: how much the fluid spaces grew, and how far the top rose.',
      },
    ],
  },
  garnmeter: {
    image: '_posters/garnmeter.jpg',
    imageAlt: 'Fourteen channels of real brainwaves with the Garn gauge',
    imageCaption: 'Real 14-channel brainwaves from a VR-sickness study, from a scene the person then rated 7 of 7.',
    headline: (
      <>
        Space sickness has a unit: <i>the Garn.</i>
      </>
    ),
    body: [
      'It is named after Senator Jake Garn. One Garn is totally sick.',
      'Can a headset read it from your brainwaves? We tried. On new people it is close to a coin flip, so the app asks you instead.',
    ],
    source: 'Real brainwaves from 33 people in a VR-sickness study at Hacettepe University. A ground analog, not astronauts.',
    how: [
      {
        t: 'Read',
        d: 'The model reads 4 seconds of 14-channel brainwaves and estimates Garns, 0 (fine) to 1 (totally sick).',
      },
      {
        t: 'Test',
        d: 'On 32 people it never saw it scored AUROC 0.54: an honest negative result.',
      },
      {
        t: 'Ask',
        d: 'So your own 1 to 7 check-in sets the zone and what to do next.',
      },
    ],
  },
}

const CELLS: [string, string][] = [
  ['Disc', 'smooth disc'],
  ['E1', 'E1, a few bumps'],
  ['E2', 'E2'],
  ['E3', 'E3'],
  ['E4', 'E4'],
  ['Cup', 'cup'],
]

/** IonScan's eight scans, in its own order: 0, 90, 45, 135 degrees, each forward then backward. */
const SCANS: { name: string; deg: number; back: boolean }[] = [
  { name: 'Rows', deg: 0, back: false },
  { name: 'Rows', deg: 0, back: true },
  { name: 'Columns', deg: 90, back: false },
  { name: 'Columns', deg: 90, back: true },
  { name: 'Diagonal', deg: 45, back: false },
  { name: 'Diagonal', deg: 45, back: true },
  { name: 'Other diagonal', deg: 135, back: false },
  { name: 'Other diagonal', deg: 135, back: true },
]

function ScanTile({ deg, back, k }: { deg: number; back: boolean; k: number }) {
  // three scan lines through a small grid, rotated to the scan's direction; the dash runs the way the scan reads
  const rot = deg + (back ? 180 : 0)
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <pattern id={`wd-g${k}`} width="12.5" height="12.5" patternUnits="userSpaceOnUse">
          <path d="M12.5 0V12.5H0" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
        </pattern>
        <clipPath id={`wd-c${k}`}>
          <rect x="0" y="0" width="100" height="100" rx="6" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="6" fill={`url(#wd-g${k})`} stroke="rgba(255,255,255,0.22)" />
      <g clipPath={`url(#wd-c${k})`} transform={`rotate(${rot} 50 50)`}>
        {[-26, 0, 26].map((o) => (
          <line key={o} className="wd-scan-line" x1="-30" y1={50 + o} x2="130" y2={50 + o} style={{ animationDelay: `${k * 0.18}s` }} />
        ))}
        <path d="M70 50 l-14 -9 v18 z" className="wd-scan-head" />
      </g>
    </svg>
  )
}

export default function StorySection({ world, next, onNext }: { world: World; next: World; onNext(): void }) {
  const s = STORIES[world.id]
  const deep = world.id === 'tracktrace'
  const toTop = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.closest('.wd-page')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <section className="wd-story" data-deep={deep ? 1 : 0} aria-label={`The story behind ${world.name}`}>
      <div className="wd-story-lead">
        <figure className="wd-story-fig">
          <div className="wd-story-img">
            <img src={`${BASE}${s.image}`} alt={s.imageAlt} loading="lazy" draggable={false} />
          </div>
          <figcaption>{s.imageCaption}</figcaption>
        </figure>
        <div className="wd-story-text">
          <p className="wd-story-kick">
            <b>01</b> The problem
          </p>
          <h3>{s.headline}</h3>
          {s.body.map((p) => (
            <p key={p} className="wd-story-body">
              {p}
            </p>
          ))}
          <p className="wd-story-src">{s.source}</p>
        </div>
      </div>

      {world.id === 'spikecount' && (
        <figure className="wd-cells">
          <ul>
            {CELLS.map(([c, label]) => (
              <li key={c}>
                <img src={`${BASE}spikecount/gallery/${c}_00.png`} alt={`A real red blood cell graded ${label}`} loading="lazy" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <figcaption>Real cells from the RedTell dataset, one per shape, as the experts graded them: a smooth disc, spiky from E1 to E4, and a cup.</figcaption>
        </figure>
      )}

      <div className="wd-how">
        <p className="wd-story-kick">
          <b>02</b> {deep ? 'How IonScan reads a nucleus' : 'How the check works'}
        </p>
        <ol data-n={s.how.length}>
          {s.how.map((h, i) => (
            <li key={h.t}>
              <span className="wd-how-n">{String(i + 1).padStart(2, '0')}</span>
              <b>{h.t}</b>
              <span className="wd-how-d">{h.d}</span>
            </li>
          ))}
        </ol>
      </div>

      {deep && (
        <>
          <figure className="wd-scans">
            <div className="wd-scans-grid">
              {SCANS.map((sc, k) => (
                <div key={k} className="wd-scan">
                  <ScanTile deg={sc.deg} back={sc.back} k={k} />
                  <span>
                    <b>{k + 1}</b> {sc.name}, {sc.back ? 'backward' : 'forward'}
                  </span>
                </div>
              ))}
            </div>
            <figcaption>How IonScan reads every nucleus: eight scans over its 32 x 32 grid, in the model’s own order.</figcaption>
            <span className="wd-ai-mark">AI-generated illustration</span>
          </figure>

          <div className="wd-stats">
            <p>
              <b>0.954</b>
              <span>rank correlation between its spot counts and NASA’s, on 16,801 nuclei from 3 mice it never saw</span>
            </p>
            <p>
              <b>3.19 M</b>
              <span>parameters, trained by us</span>
            </p>
          </div>

          <figure className="wd-arch">
            <div className="wd-arch-frame">
              <div className="wd-arch-card">
                <img src={`${BASE}tracktrace/ionscan_architecture.svg`} alt="Diagram of the IonScan network, layer by layer" loading="lazy" />
                <span className="wd-ai-mark is-dark">AI-generated illustration</span>
              </div>
            </div>
            <figcaption>IonScan, our own 3.2 M-parameter network</figcaption>
          </figure>
        </>
      )}

      <div className="wd-story-end">
        <button className="wd-story-top" onClick={toTop}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4.5 12.5 10 7l5.5 5.5" />
          </svg>
          Back to the check
        </button>
        <button className="wd-story-next" onClick={onNext}>
          <span>Next world</span>
          <b>{next.name}</b>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
          </svg>
        </button>
      </div>
    </section>
  )
}

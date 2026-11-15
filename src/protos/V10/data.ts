// V10 "Vitruvian Astronaut": the six checks in pitch order, where each one lights on the body and where its medallion
// sits on the orbit. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
export const BASE = import.meta.env.BASE_URL

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface Check {
  id: ModuleId
  /** pitch order as a Roman numeral (ornament) */
  n: string
  name: string
  sentence: string
  site: string
  img: string
  /** image width / height */
  aspect: number
  /** the round crop shown in the medallion: centre (x, y as shares of the image) and diameter as a share of its width */
  crop: [number, number, number]
  /** where its light sits on the body: body units, x to the viewer's right, y up from the feet (navel at 1.03) */
  point: [number, number]
  /** where its medallion sits on the orbit: degrees clockwise from the top */
  angle: number
  /** the main button on the check's page */
  run: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: 'I',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    site: 'Cells',
    img: `${BASE}_posters/tracktrace.jpg`,
    aspect: 1.6,
    crop: [0.147, 0.5, 0.235],
    point: [-0.33, 1.418],
    angle: -142,
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: 'II',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    img: `${BASE}_posters/bubblegrade.jpg`,
    aspect: 1.6,
    crop: [0.6, 0.52, 0.34],
    point: [0.052, 1.33],
    angle: 94,
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: 'III',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Blood',
    img: `${BASE}spikecount/fields/96.png`,
    aspect: 1,
    crop: [0.5, 0.5, 0.62],
    point: [-0.6, 1.42],
    angle: -94,
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: 'IV',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    aspect: 1.6,
    crop: [0.272, 0.39, 0.25],
    point: [0.105, 0.72],
    angle: 142,
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: 'V',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    img: `${BASE}_posters/braindrift.jpg`,
    aspect: 1.6,
    crop: [0.5, 0.47, 0.5],
    point: [-0.012, 1.69],
    angle: -36,
    run: 'Fly the brain',
  },
  {
    id: 'garnmeter',
    n: 'VI',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    img: `${BASE}_posters/garnmeter.jpg`,
    aspect: 1.6,
    crop: [0.855, 0.326, 0.25],
    point: [0.07, 1.625],
    angle: 36,
    run: 'Play the session',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkIndex(id: string): number {
  return CHECKS.findIndex((c) => c.id === id)
}

/** Medallion background for a round crop, sized by the CSS variable --md (the medallion's diameter). */
export function cropStyle(c: Check): { backgroundImage: string; backgroundSize: string; backgroundPosition: string } {
  const [cx, cy, d] = c.crop
  const k = 1 / d // image width in medallion diameters
  return {
    backgroundImage: `url(${c.img})`,
    backgroundSize: `calc(var(--md) * ${k.toFixed(4)}) auto`,
    backgroundPosition: `calc(var(--md) * ${(0.5 - cx * k).toFixed(4)}) calc(var(--md) * ${(0.5 - (cy * k) / c.aspect).toFixed(4)})`,
  }
}

/** The order round the ring, clockwise from the top (for the arrow keys). */
export const RING_ORDER: number[] = CHECKS.map((c, i) => [((c.angle % 360) + 360) % 360, i] as const)
  .sort((a, b) => a[0] - b[0])
  .map(([, i]) => i)

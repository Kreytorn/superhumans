// The six checks, in pitch order. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
const BASE = import.meta.env.BASE_URL

export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  site: string
  /** accent light for this check's lens, hotspot and page */
  hue: string
  /** image for the lens, with a square crop in image fractions (x, y of the top-left corner, side as a share of the width) */
  img: string
  aspect: number
  crop: [number, number, number]
  invert?: boolean
  /** body site on the figure (figure space: x right, y up, feet at -1, crown at +1) */
  spot: [number, number, number]
  /** where the lens floats, in the same space */
  lens: [number, number, number]
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    site: 'Cells',
    hue: '#ff4fb0',
    img: `${BASE}_posters/tracktrace.jpg`,
    aspect: 1.6,
    crop: [0.012, 0.275, 0.272],
    spot: [-0.215, 0.6, 0.06],
    lens: [-0.98, 0.5, 0.25],
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    hue: '#ff9a4a',
    img: `${BASE}_posters/bubblegrade.jpg`,
    aspect: 1.6,
    crop: [0.3, 0.19, 0.5],
    spot: [0.05, 0.47, 0.11],
    lens: [0.98, 0.42, 0.2],
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Blood',
    hue: '#ff6b5e',
    img: `${BASE}spikecount/fields/96.png`,
    aspect: 1,
    crop: [0.08, 0.2, 0.74],
    spot: [-0.325, 0.12, 0.02],
    lens: [-0.92, -0.22, 0.35],
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    hue: '#ffd84a',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    aspect: 1.6,
    crop: [0.085, 0.13, 0.4],
    spot: [0.1, -0.2, 0.07],
    lens: [0.9, -0.36, 0.35],
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    hue: '#5cc4f0',
    img: `${BASE}_posters/braindrift_portrait.jpg`,
    aspect: 0.75,
    crop: [0.0, 0.14, 1.0],
    spot: [0.0, 0.9, 0.06],
    lens: [-0.66, 1.08, 0.1],
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    hue: '#9db4ff',
    img: `${BASE}_posters/garnmeter.jpg`,
    aspect: 1.6,
    crop: [0.02, 0.02, 0.37],
    spot: [0.095, 0.84, 0.0],
    lens: [0.7, 1.04, 0.1],
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkById(id: string): Check | undefined {
  return CHECKS.find((c) => c.id === id)
}

/** CSS for a square crop of a check's image as a background. */
export function cropStyle(c: Check): { backgroundImage: string; backgroundSize: string; backgroundPosition: string; filter?: string } {
  const [x, y, s] = c.crop
  const sy = s * c.aspect // side as a share of the height
  const px = s >= 1 ? 0 : (x / (1 - s)) * 100
  const py = sy >= 1 ? 0 : (y / (1 - sy)) * 100
  return {
    backgroundImage: `url(${c.img})`,
    backgroundSize: `${100 / s}% ${100 / sy}%`,
    backgroundPosition: `${px}% ${py}%`,
    ...(c.invert ? { filter: 'invert(1) hue-rotate(180deg) brightness(0.92)' } : {}),
  }
}

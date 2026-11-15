// The six checks, in pitch order. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
// The order here is also the order of the organ lights in scene.ts (ORGANS) and of the shader's uOrg / uSw arrays.
const BASE = import.meta.env.BASE_URL

export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  /** the organ that carries this check inside the glass figure */
  organ: string
  /** the lantern colour of that organ (the shader holds the same six colours) */
  hue: string
  /** square crop of a real result image: x, y of the top-left corner and the side, as shares of the width */
  img: string
  aspect: number
  crop: [number, number, number]
  invert?: boolean
  /** which side of its light the name tag sits on */
  side: 'l' | 'r'
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    organ: 'Cosmic ray',
    hue: '#ff5cb8',
    img: `${BASE}_posters/tracktrace.jpg`,
    aspect: 1.6,
    crop: [0.012, 0.275, 0.272],
    side: 'r',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    organ: 'Heart',
    hue: '#ff9447',
    img: `${BASE}_posters/bubblegrade.jpg`,
    aspect: 1.6,
    crop: [0.3, 0.19, 0.5],
    side: 'r',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    organ: 'Blood',
    hue: '#ff5a5f',
    img: `${BASE}spikecount/fields/96.png`,
    aspect: 1,
    crop: [0.08, 0.2, 0.74],
    side: 'l',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    organ: 'Leg vein',
    hue: '#ffd257',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    aspect: 1.6,
    crop: [0.085, 0.13, 0.4],
    side: 'r',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    organ: 'Brain',
    hue: '#5cc8ff',
    img: `${BASE}_posters/braindrift_portrait.jpg`,
    aspect: 0.75,
    crop: [0.0, 0.14, 1.0],
    side: 'r',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    organ: 'Inner ear',
    hue: '#a99cff',
    img: `${BASE}_posters/garnmeter.jpg`,
    aspect: 1.6,
    crop: [0.02, 0.02, 0.37],
    invert: true,
    side: 'r',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkById(id: string): Check | undefined {
  return CHECKS.find((c) => c.id === id)
}

/** CSS for a square crop of a check's real image as a background. */
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

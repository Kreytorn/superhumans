// The six checks, in pitch order. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
const BASE = import.meta.env.BASE_URL

export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  /** the gate's light */
  hue: string
  /** real specimen image hung inside the gate */
  img: string
  /** image width / height */
  aspect: number
  /** where the tall window looks at the image: centre x and centre y, 0..1 (y from the top) */
  at: [number, number]
  /** how far the window zooms into the image (1 = as much as fits) */
  zoom?: number
  /** brightness lift for a dark specimen (1 = as it is) */
  boost?: number
  /** how much of the image is repainted in the gate's hue (grey specimens), 0..1 */
  tint: number
  /** light specimen on a pale ground: shown inverted so it glows */
  invert?: boolean
  /** words on the run button of the page */
  run: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    hue: '#ff4fb0',
    img: `${BASE}_posters/tracktrace_portrait.jpg`,
    aspect: 0.75,
    at: [0.5, 0.4],
    zoom: 1.18,
    boost: 1.7,
    tint: 0,
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    hue: '#ff9a3c',
    img: `${BASE}_posters/bubblegrade_portrait.jpg`,
    aspect: 0.75,
    // the heart-sound picture and its attention trace, clear of the poster's labels
    at: [0.6, 0.44],
    zoom: 1.3,
    tint: 0,
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    hue: '#ff4d4d',
    img: `${BASE}spikecount/fields/96.png`,
    aspect: 1,
    at: [0.3, 0.5],
    tint: 0.72,
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    hue: '#ffd23f',
    img: `${BASE}_posters/veinsqueeze_portrait.jpg`,
    aspect: 0.75,
    at: [0.5, 0.5],
    tint: 0.16,
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    hue: '#4cc9ff',
    img: `${BASE}_posters/braindrift_portrait.jpg`,
    aspect: 0.75,
    at: [0.5, 0.5],
    tint: 0,
    run: 'Fly the brain',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    hue: '#a58cff',
    img: `${BASE}_posters/garnmeter_portrait.jpg`,
    aspect: 0.75,
    // the bright right half of the recorded brainwaves (the poster is light lines on a dark ground)
    at: [0.72, 0.25],
    zoom: 1.9,
    tint: 0.62,
    run: 'Play the session',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkById(id: string): Check | undefined {
  return CHECKS.find((c) => c.id === id)
}

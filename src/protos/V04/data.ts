// V04 "Prism Ring": the six checks in pitch order. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
export const BASE = import.meta.env.BASE_URL

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface Check {
  id: ModuleId
  n: string
  name: string
  sentence: string
  site: string
  /** the chamber's own light */
  hue: string
  /** specimen image for a wide chamber window, and its crop (x0, y0, x1, y1 as shares of the image, from the top-left) */
  img: string
  crop: [number, number, number, number]
  /** the same for an upright window (phones) */
  imgTall: string
  cropTall: [number, number, number, number]
  /** flip a light image to a dark one, keeping its colours */
  invert?: boolean
  /** where the chamber sits on the ring, degrees round from the camera's side */
  at: number
  atTall: number
  /** the main button on the check's page */
  run: string
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
    crop: [0.0, 0.2, 0.62, 0.82],
    imgTall: `${BASE}_posters/tracktrace_portrait.jpg`,
    cropTall: [0.083, 0, 0.917, 1],
    at: 33,
    atTall: 42,
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    hue: '#ff9a3d',
    img: `${BASE}_posters/bubblegrade.jpg`,
    crop: [0, 0, 1, 1],
    imgTall: `${BASE}_posters/bubblegrade_portrait.jpg`,
    cropTall: [0.083, 0, 0.917, 1],
    at: 56,
    atTall: 61,
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Blood',
    hue: '#ff5a52',
    img: `${BASE}spikecount/fields/96.png`,
    crop: [0, 0.2, 1, 0.825],
    imgTall: `${BASE}spikecount/fields/96.png`,
    cropTall: [0.19, 0, 0.815, 1],
    at: 80,
    atTall: 83,
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    hue: '#ffd23f',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    crop: [0, 0, 1, 1],
    imgTall: `${BASE}_posters/veinsqueeze_portrait.jpg`,
    cropTall: [0.083, 0, 0.917, 1],
    at: 108,
    atTall: 108,
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    hue: '#4fd0ff',
    img: `${BASE}_posters/braindrift.jpg`,
    crop: [0.1, 0.1, 0.9, 0.9],
    imgTall: `${BASE}_posters/braindrift_portrait.jpg`,
    cropTall: [0.083, 0, 0.917, 1],
    at: 140,
    atTall: 136,
    run: 'Fly the brain',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    hue: '#9a8cff',
    img: `${BASE}_posters/garnmeter.jpg`,
    crop: [0, 0, 1, 1],
    imgTall: `${BASE}_posters/garnmeter_portrait.jpg`,
    cropTall: [0.083, 0, 0.917, 1],
    at: 174,
    atTall: 165,
    run: 'Play the session',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkIndex(id: string): number {
  return CHECKS.findIndex((c) => c.id === id)
}

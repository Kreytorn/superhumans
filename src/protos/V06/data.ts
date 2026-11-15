// The six checks, in pitch order. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
const BASE = import.meta.env.BASE_URL

export type V3 = [number, number, number]

export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  site: string
  /** light colour of this place on the body, its page and its rail stop */
  hue: string
  /** real specimen image: landscape (1.6:1) and portrait (0.75:1) */
  img: string
  imgTall: string
  /** place on the body (body space, metres: x = the person's left, y up, z forward, hips at 0) */
  pos: V3
  /** outward direction the camera dives along */
  out: V3
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    site: 'A cell',
    hue: '#ff5fb4',
    img: `${BASE}_posters/tracktrace.jpg`,
    imgTall: `${BASE}_posters/tracktrace_portrait.jpg`,
    pos: [0.185, 0.488, 0.035],
    out: [0.55, 0.45, 0.7],
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    hue: '#ff7a3d',
    img: `${BASE}_posters/bubblegrade.jpg`,
    imgTall: `${BASE}_posters/bubblegrade_portrait.jpg`,
    pos: [0.06, 0.37, 0.085],
    out: [0.25, 0.1, 1],
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Forearm blood',
    hue: '#ff4655',
    img: `${BASE}_posters/spikecount.jpg`,
    imgTall: `${BASE}_posters/spikecount_portrait.jpg`,
    pos: [-0.292, 0.355, 0.235],
    out: [-0.5, 0.35, 0.8],
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    hue: '#ffc23d',
    img: `${BASE}_posters/veinsqueeze.jpg`,
    imgTall: `${BASE}_posters/veinsqueeze_portrait.jpg`,
    pos: [0.118, -0.16, 0.2],
    out: [0.3, 0.55, 0.8],
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    hue: '#4fc8ff',
    img: `${BASE}_posters/braindrift.jpg`,
    imgTall: `${BASE}_posters/braindrift_portrait.jpg`,
    pos: [-0.02, 0.785, 0.06],
    out: [-0.1, 0.8, 0.6],
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    hue: '#a48dff',
    img: `${BASE}_posters/garnmeter.jpg`,
    imgTall: `${BASE}_posters/garnmeter_portrait.jpg`,
    pos: [0.072, 0.7, 0.02],
    out: [1, 0.1, 0.35],
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkById(id: string): Check | undefined {
  return CHECKS.find((c) => c.id === id)
}

export function hexRgb(h: string): V3 {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

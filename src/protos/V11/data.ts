// V11 "Crystal Human": the six checks in pitch order, and where each jewel sits in the crystal body.
// Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
import { ANCHOR } from './body'

export const BASE = import.meta.env.BASE_URL

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface Check {
  id: ModuleId
  n: string
  name: string
  sentence: string
  site: string
  hue: string
  /** specimen crop for the jewel (a 900 x 1200 portrait): x0, y0, x1, y1 as shares from the top-left, shaped like the
   *  hexagon (as tall as 1.155 times its width) */
  img: string
  crop: [number, number, number, number]
  /** wide image for the page's background */
  wide: string
  /** jewel centre in the body's own frame (pelvis at the origin, metres) and its width across the flats */
  at: [number, number, number]
  size: number
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
    img: `${BASE}_posters/tracktrace_portrait.jpg`,
    crop: [0.333, 0.0, 0.667, 0.289],
    wide: `${BASE}_posters/tracktrace.jpg`,
    at: ANCHOR.tracktrace,
    size: 0.29,
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    hue: '#ff9a3d',
    img: `${BASE}_posters/bubblegrade_portrait.jpg`,
    crop: [0.25, 0.3, 0.9, 0.863],
    wide: `${BASE}_posters/bubblegrade.jpg`,
    at: ANCHOR.bubblegrade,
    size: 0.21,
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Blood',
    hue: '#ff5a52',
    img: `${BASE}_posters/spikecount_portrait.jpg`,
    crop: [0.255, 0.53, 0.745, 0.954],
    wide: `${BASE}_posters/spikecount.jpg`,
    at: ANCHOR.spikecount,
    size: 0.2,
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    hue: '#ffd23f',
    img: `${BASE}_posters/veinsqueeze_portrait.jpg`,
    crop: [0.42, 0.114, 0.68, 0.339],
    wide: `${BASE}_posters/veinsqueeze.jpg`,
    at: ANCHOR.veinsqueeze,
    size: 0.19,
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    hue: '#4fd0ff',
    img: `${BASE}_posters/braindrift_portrait.jpg`,
    crop: [0.17, 0.3, 0.77, 0.82],
    wide: `${BASE}_posters/braindrift.jpg`,
    at: ANCHOR.braindrift,
    size: 0.17,
    run: 'Fly the brain',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    hue: '#9a8cff',
    img: `${BASE}_posters/garnmeter_portrait.jpg`,
    crop: [0.6, 0.472, 0.878, 0.712],
    wide: `${BASE}_posters/garnmeter.jpg`,
    at: ANCHOR.garnmeter,
    size: 0.14,
    run: 'Play the session',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

/** CSS for showing a check's jewel crop in a box of w x h px: the crop's width fills the box, centred on the crop. */
export function cropCss(c: Check, w: number, h: number) {
  const [x0, y0, x1, y1] = c.crop
  const bw = w / (x1 - x0)
  const bh = (bw * 1200) / 900
  return {
    backgroundImage: `url(${c.img})`,
    backgroundSize: `${bw.toFixed(1)}px ${bh.toFixed(1)}px`,
    backgroundPosition: `${(-x0 * bw).toFixed(1)}px ${(h / 2 - ((y0 + y1) / 2) * bh).toFixed(1)}px`,
  }
}

export function checkIndex(id: string): number {
  return CHECKS.findIndex((c) => c.id === id)
}

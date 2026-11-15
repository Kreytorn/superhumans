// HOLE "The black hole": the six checks, their on-screen sentence and how each real result still is cropped into a round lens.
export const BASE = import.meta.env.BASE_URL

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface Check {
  id: ModuleId
  n: string
  name: string
  site: string
  line: string
  cta: string
  img: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    site: 'Cells · radiation',
    line: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    cta: 'Scan the nucleus',
    img: '_posters/tracktrace_portrait.jpg',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    site: 'Heart',
    line: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    cta: 'Play the heart sound',
    img: '_posters/bubblegrade.jpg',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    site: 'Blood',
    line: 'Every red blood cell, outlined. The spiky ones, counted.',
    cta: 'Grade this blood',
    img: 'spikecount/fields/96.png',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    site: 'Leg vein',
    line: 'A clot is a vein that won’t squash.',
    cta: 'Press on the veins',
    img: '_posters/veinsqueeze.jpg',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    site: 'Brain',
    line: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    cta: 'Fly the brain',
    img: '_posters/braindrift.jpg',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    site: 'Inner ear',
    line: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    cta: 'Play the brainwaves',
    img: '_posters/garnmeter.jpg',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

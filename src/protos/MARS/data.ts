// MARS "Mission to Mars": the six checks as moments of the flight, in the order a crew would meet them.
export const BASE = import.meta.env.BASE_URL

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface Moment {
  id: ModuleId
  /** plain phase name of the journey */
  phase: string
  name: string
  line: string
  cta: string
  /** where the label sits around its spot on the home scene */
  side: 'up' | 'down'
}

export const MOMENTS: Moment[] = [
  {
    id: 'garnmeter',
    phase: 'First days in zero-g',
    name: 'Garn Meter',
    line: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    cta: 'Play the brainwaves',
    side: 'down',
  },
  {
    id: 'bubblegrade',
    phase: 'First spacewalk',
    name: 'BubbleGrade',
    line: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    cta: 'Play the heart sound',
    side: 'down',
  },
  {
    id: 'veinsqueeze',
    phase: 'Weeks of floating',
    name: 'VeinSqueeze',
    line: 'A clot is a vein that won’t squash.',
    cta: 'Press on the veins',
    side: 'down',
  },
  {
    id: 'spikecount',
    phase: 'Months in',
    name: 'SpikeCount',
    line: 'Every red blood cell, outlined. The spiky ones, counted.',
    cta: 'Grade this blood',
    side: 'down',
  },
  {
    id: 'tracktrace',
    phase: 'Deep space',
    name: 'TrackTrace',
    line: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    cta: 'Scan the nucleus',
    side: 'up',
  },
  {
    id: 'braindrift',
    phase: 'The long haul',
    name: 'BrainDrift',
    line: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    cta: 'Fly the brain',
    side: 'up',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

// The six checks, in pitch order. Sentences are the "5-second sentence (on screen)" lines of work/Web/cards.
export interface Check {
  id: string
  n: string
  name: string
  sentence: string
  site: string
  /** the colour of this check's star cluster */
  hue: string
  /** cluster centre on the figure (x right, y up; feet at -1, crown at +1) */
  spot: [number, number, number]
  /** which side of the figure the name sits on */
  side: 'l' | 'r'
  run: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    n: '01',
    name: 'TrackTrace',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    site: 'Every cell',
    hue: '#ff5fb4',
    spot: [-0.165, 0.565, 0.05],
    side: 'l',
    run: 'Scan the nucleus',
  },
  {
    id: 'bubblegrade',
    n: '02',
    name: 'BubbleGrade',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    site: 'Heart',
    hue: '#ff9d52',
    spot: [0.045, 0.47, 0.06],
    side: 'r',
    run: 'Play the heart sound',
  },
  {
    id: 'spikecount',
    n: '03',
    name: 'SpikeCount',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    site: 'Blood',
    hue: '#ff6a5c',
    spot: [-0.325, 0.15, 0.01],
    side: 'l',
    run: 'Grade this blood',
  },
  {
    id: 'veinsqueeze',
    n: '04',
    name: 'VeinSqueeze',
    sentence: 'A clot is a vein that won’t squash.',
    site: 'Leg vein',
    hue: '#ffd95a',
    spot: [0.108, -0.36, 0.0],
    side: 'r',
    run: 'Press the probe',
  },
  {
    id: 'braindrift',
    n: '05',
    name: 'BrainDrift',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    site: 'Brain',
    hue: '#62d0ff',
    spot: [-0.005, 0.915, 0.0],
    side: 'l',
    run: 'Fly the brain',
  },
  {
    id: 'garnmeter',
    n: '06',
    name: 'Garn Meter',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    site: 'Inner ear',
    hue: '#a9b6ff',
    spot: [0.074, 0.835, 0.0],
    side: 'r',
    run: 'Play the session',
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function checkIndex(id: string): number {
  return CHECKS.findIndex((c) => c.id === id)
}

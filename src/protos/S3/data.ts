// S3 "Eclipse": the six checks, their on-screen sentence (from work/Web/cards) and how each real image is cropped.

export interface Crop {
  /** image aspect (width / height) */
  ar: number
  /** focus point as a fraction of the image */
  cx: number
  cy: number
  /** image width as a multiple of the frame width */
  s: number
}

export interface Check {
  id: string
  no: string
  name: string
  site: string
  line: string
  /** plain hex: also fed to the shader */
  tint: string
  /** image inside the round lens */
  lensImg: string
  lens: Crop
  /** image on the wide plate (16:10) */
  plateImg: string
  plate: Crop
  /** light source image: shown inverted on the dark page */
  invert?: boolean
}

const base = import.meta.env.BASE_URL

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    no: '01',
    name: 'TrackTrace',
    site: 'cells (radiation)',
    line: "IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion's path.",
    tint: '#ff4fb0',
    lensImg: `${base}_posters/tracktrace.jpg`,
    lens: { ar: 1.6, cx: 0.147, cy: 0.5, s: 3.5 },
    plateImg: `${base}_posters/tracktrace.jpg`,
    plate: { ar: 1.6, cx: 0.5, cy: 0.5, s: 1 },
  },
  {
    id: 'bubblegrade',
    no: '02',
    name: 'BubbleGrade',
    site: 'heart',
    line: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    tint: '#ff9240',
    lensImg: `${base}_posters/bubblegrade.jpg`,
    lens: { ar: 1.6, cx: 0.5, cy: 0.5, s: 1.7 },
    plateImg: `${base}_posters/bubblegrade.jpg`,
    plate: { ar: 1.6, cx: 0.5, cy: 0.5, s: 1 },
  },
  {
    id: 'spikecount',
    no: '03',
    name: 'SpikeCount',
    site: 'blood',
    line: 'Every red blood cell, outlined. The spiky ones, counted.',
    tint: '#3fd3f4',
    lensImg: `${base}spikecount/fields/96.png`,
    lens: { ar: 1, cx: 0.5, cy: 0.5, s: 1.16 },
    plateImg: `${base}spikecount/fields/96.png`,
    plate: { ar: 1, cx: 0.5, cy: 0.46, s: 1 },
  },
  {
    id: 'veinsqueeze',
    no: '04',
    name: 'VeinSqueeze',
    site: 'leg vein',
    line: "A clot is a vein that won't squash.",
    tint: '#ffd84a',
    lensImg: `${base}_posters/veinsqueeze.jpg`,
    lens: { ar: 1.6, cx: 0.28, cy: 0.37, s: 2.5 },
    plateImg: `${base}_posters/veinsqueeze.jpg`,
    plate: { ar: 1.6, cx: 0.5, cy: 0.5, s: 1 },
  },
  {
    id: 'braindrift',
    no: '05',
    name: 'BrainDrift',
    site: 'brain',
    line: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    tint: '#5cb6ff',
    lensImg: `${base}_posters/braindrift_portrait.jpg`,
    lens: { ar: 0.75, cx: 0.5, cy: 0.5, s: 1.12 },
    plateImg: `${base}_posters/braindrift.jpg`,
    plate: { ar: 1.6, cx: 0.5, cy: 0.5, s: 1 },
  },
  {
    id: 'garnmeter',
    no: '06',
    name: 'Garn Meter',
    site: 'head / inner ear',
    line: "Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn't work yet.",
    tint: '#a79bff',
    lensImg: `${base}_posters/garnmeter.jpg`,
    lens: { ar: 1.6, cx: 0.36, cy: 0.33, s: 2.3 },
    plateImg: `${base}_posters/garnmeter.jpg`,
    plate: { ar: 1.6, cx: 0.5, cy: 0.5, s: 1 },
    invert: true,
  },
]

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** In-app navigation with a view transition where the browser has one. */
export function href(view: string) {
  return `#/proto/S3/${view}`
}

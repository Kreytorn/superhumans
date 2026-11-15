// WORLDS "Six worlds": the six checks, each one a world made from one of our real samples.
export const BASE = import.meta.env.BASE_URL

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface World {
  id: ModuleId
  name: string
  /** what the world is made from, in plain words */
  kind: string
  sentence: string
  /** real sample used as the world's texture (path under public/) */
  image: string
  /** crop of the image in texture coordinates: u0, v0 (from the bottom), width, height */
  crop: [number, number, number, number]
  orbit: number
  size: number
  /** radius used to frame the world when the camera flies in */
  focusR: number
  /** each world swings slowly along its orbit around the angle a0, so the composed view never falls apart; speed is the swing rate */
  speed: number
  a0: number
  /** height above the orbital plane */
  lift: number
  tint: [number, number, number]
  base: [number, number, number]
  rim: [number, number, number]
  glow: number
  /** below 1 lifts the dim parts of the sample */
  gamma?: number
  invert?: boolean
  rot?: boolean
  pulse?: number
  /** true: spins like a banded planet; false: sways around its facing side */
  spins?: boolean
}

const D = Math.PI / 180

export const WORLDS: World[] = [
  {
    id: 'tracktrace',
    name: 'TrackTrace',
    kind: 'a cell nucleus',
    sentence: "IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion's path.",
    image: '_posters/tracktrace.jpg',
    crop: [0.0219, 0.3, 0.25, 0.4],
    orbit: 4.0,
    size: 1.15,
    focusR: 1.15,
    speed: 0.085,
    a0: 152 * D,
    lift: 0.15,
    tint: [0.86, 1.0, 1.06],
    base: [0.012, 0.05, 0.075],
    rim: [0.35, 0.85, 1.0],
    glow: 2.2,
  },
  {
    id: 'bubblegrade',
    name: 'BubbleGrade',
    kind: 'a heart sound',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    image: '_posters/bubblegrade.jpg',
    crop: [0.04, 0.2, 0.92, 0.76],
    orbit: 6.5,
    size: 1.25,
    focusR: 2.3,
    speed: 0.062,
    a0: 352 * D,
    lift: -0.1,
    tint: [1.08, 0.98, 0.9],
    base: [0.02, 0.012, 0.008],
    rim: [1.0, 0.72, 0.42],
    glow: 0.15,
    rot: true,
    spins: true,
  },
  {
    id: 'spikecount',
    name: 'SpikeCount',
    kind: 'red blood cells',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    image: 'spikecount/fields/96.png',
    crop: [0, 0, 1, 1],
    orbit: 8.6,
    size: 1.5,
    focusR: 1.55,
    speed: 0.05,
    a0: 99 * D,
    lift: 0.2,
    tint: [1, 0.62, 0.55],
    base: [0, 0, 0],
    rim: [1, 0.5, 0.42],
    glow: 0,
  },
  {
    id: 'veinsqueeze',
    name: 'VeinSqueeze',
    kind: 'a vein ultrasound',
    sentence: "A clot is a vein that won't squash.",
    image: '_posters/veinsqueeze.jpg',
    crop: [0.0338, 0.31, 0.42, 0.672],
    orbit: 10.2,
    size: 1.2,
    focusR: 1.2,
    speed: 0.057,
    a0: 174 * D,
    lift: -0.2,
    tint: [0.95, 1.02, 1.1],
    base: [0.01, 0.014, 0.022],
    rim: [0.62, 0.74, 0.95],
    glow: 0.5,
    gamma: 0.85,
  },
  {
    id: 'braindrift',
    name: 'BrainDrift',
    kind: 'a brain MRI',
    sentence: 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.',
    image: '_posters/braindrift.jpg',
    crop: [0.2125, 0.045, 0.575, 0.92],
    orbit: 11.7,
    size: 1.65,
    focusR: 1.65,
    speed: 0.045,
    a0: 62 * D,
    lift: 0.1,
    tint: [1.12, 1.1, 1.06],
    base: [0.075, 0.09, 0.125],
    rim: [0.8, 0.9, 1.0],
    glow: 0.55,
    gamma: 0.62,
  },
  {
    id: 'garnmeter',
    name: 'Garn Meter',
    kind: 'brainwaves',
    sentence: "Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn't work yet.",
    image: '_posters/garnmeter.jpg',
    crop: [0.03, 0.385, 0.36, 0.585],
    orbit: 13.2,
    size: 1.15,
    focusR: 1.15,
    speed: 0.04,
    a0: 222 * D,
    lift: -0.1,
    tint: [0.62, 0.72, 1.25],
    base: [0.03, 0.02, 0.09],
    rim: [0.6, 0.55, 1.0],
    glow: 0.9,
    invert: true,
    pulse: 0.3,
    spins: true,
  },
]

export const isModule = (v: string): v is ModuleId => WORLDS.some((w) => w.id === v)
export const worldOf = (id: ModuleId): World => WORLDS.find((w) => w.id === id) as World

export const SITE_LINE = 'Six AI health checks for astronauts, running in your browser.'

// Prototype B "Body Map": the six checks, where each one sits on the figure, and what its stage shows.
// Sentences: work/Web/research/06_clarity_jury.md section 4 (TrackTrace uses its card's sentence: the data is a
// mouse-cell nucleus, so "an astronaut's cell" would be untrue). Home evidence lines: work/Web/cards/<module>.md.

export type CheckId = 'garnmeter' | 'braindrift' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'tracktrace'
export type Status = 'you' | 'medic' | 'surgeon' | 'abort'

export interface Check {
  id: CheckId
  /** plain name of the body site, as a judge would say it */
  name: string
  /** "Open the <short> check" */
  short: string
  /** site on the figure, in the figure's 270 x 560 drawing space */
  site: [number, number]
  status: Status
  /** what the specimen is, for alt text and the placeholder */
  specimen: string
  sentence: string
  /** Home "How do we know?": the real data it reads and one honest result */
  evidence: string
  /** a real still under public/ to use until the poster exists */
  fallback?: string
}

export const FIG_W = 270
export const FIG_H = 560
/** centre of label row i (six equal rows down the figure) */
export const rowY = (i: number) => (FIG_H / 6) * (i + 0.5)

export const CHECKS: Check[] = [
  {
    id: 'garnmeter',
    name: 'Space sickness',
    short: 'space sickness',
    site: [120, 17],
    status: 'you',
    specimen: 'Brainwaves',
    sentence:
      'Space sickness is measured in Garns; the app asks how you feel, tells you what to do, and openly shows that reading it from brainwaves doesn’t work yet.',
    evidence:
      'Real 14-channel brainwaves from a VR-sickness study. 1.0 Garn, from the check-in (7 of 7); the brainwave model read 0.08, so the check-in drives it.',
  },
  {
    id: 'braindrift',
    name: 'Brain',
    short: 'brain',
    site: [120, 50],
    status: 'you',
    specimen: 'Brain MRI',
    sentence:
      'In space the brain floats up and its fluid spaces swell; drag the slider, and the AI measures a real brain changing as if it had flown.',
    evidence: 'One real brain MRI, flown in simulation. +9.20% fluid spaces, measured by the AI; we put in +10.7%.',
    fallback: 'braindrift/pvs/pvs-mid_axial_model.webp',
  },
  {
    id: 'bubblegrade',
    name: 'Heart bubbles',
    short: 'heart',
    site: [132, 152],
    status: 'you',
    specimen: 'Heart sound',
    sentence: 'After a spacewalk, the app listens to the heart and hears the bubbles that cause the bends.',
    evidence: 'Real heart Doppler sound from a diver after a dive. Grade III of IV; the human technician also heard III.',
  },
  {
    id: 'spikecount',
    name: 'Blood',
    short: 'blood',
    site: [185, 210],
    status: 'medic',
    specimen: 'Blood photo',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    evidence: 'A real microscope photo of lab blood. 58.5% spiky; the expert counted 53.8%.',
  },
  {
    id: 'veinsqueeze',
    name: 'Leg vein',
    short: 'leg vein',
    site: [100, 352],
    status: 'you',
    specimen: 'Vein ultrasound',
    sentence: 'A clot is a vein that won’t squash: press, and a healthy vein winks shut while a clotted one stays round.',
    evidence:
      'Two real leg-vein ultrasound clips from one patient the model never trained on. The vein with a clot stayed open at 64% of its starting area; the other vein: 43%, partly closed.',
  },
  {
    id: 'tracktrace',
    name: 'Cosmic rays',
    short: 'cosmic ray',
    site: [140, 470],
    status: 'you',
    specimen: 'Cell nucleus',
    sentence:
      'IonScan, our own model, circles every DNA-damage spot in a cell nucleus; when the spots line up, it draws the line: the straight path of a heavy ion, the kind in cosmic rays.',
    evidence:
      'A real microscope image of one mouse-cell nucleus hit by an iron-ion beam on the ground. 8 damage spots; NASA’s own count: 7.',
  },
]

export const checkById = (id: string) => CHECKS.find((c) => c.id === id)

/** the word beside a body site: what that check is saying right now */
export const STATUS_WORD: Record<Status, string> = {
  you: 'Quiet',
  medic: 'Crew medic',
  surgeon: 'Flight surgeon',
  abort: 'Abort',
}

const BASE = import.meta.env.BASE_URL
export const publicUrl = (rel: string) => new URL(BASE + rel, document.baseURI).href
export const BLOOD_PHOTO = () => publicUrl('spikecount/fields/96.png')
export const SAMPLE = 'field-96'

export const route = (view: string) => `#/proto/B/${view}`

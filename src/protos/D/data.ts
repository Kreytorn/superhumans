// The six checks, in pitch order. Words come from work/Web/cards and work/Web/research/06_clarity_jury.md section 4.
export type CheckId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'
export type Level = 'you' | 'medic' | 'surgeon' | 'abort' | 'none'
export type Shape = 'square' | 'tall' | 'band'

export interface Check {
  id: CheckId
  /** the plain name set in the fitted display face */
  name: string
  /** the check's name in the pitch */
  product: string
  /** what the specimen is, for alt text */
  specimen: string
  /** the check's one sentence */
  sentence: string
  /** the proportions its own view cuts */
  shape: Shape
  /** the cut on Home, in % of the stage: left, top, width, height */
  rect: [number, number, number, number]
  /** one line for Home's "How do we know?": the real data it reads and one honest result (from the check's card) */
  evidence: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    name: 'Radiation',
    product: 'TrackTrace',
    specimen: 'Mouse-cell nuclei under a microscope, with the DNA-damage spots the model circled',
    sentence: 'The AI circled every DNA break in a cell, and when the breaks lined up, that line was the path of a cosmic ray.',
    shape: 'square',
    rect: [12, 0, 76, 76],
    evidence: 'Real microscope images of mouse-cell nuclei. On one X-ray nucleus it circled 8 damage spots; NASA’s own count: 7.',
  },
  {
    id: 'bubblegrade',
    name: 'Bubbles',
    product: 'BubbleGrade',
    specimen: 'A picture of heart Doppler sound from a diver, with the bubble map',
    sentence: 'After a spacewalk, the app listens to the heart and hears the bubbles that cause the bends.',
    shape: 'band',
    rect: [0, 0, 100, 62.5],
    evidence: 'Real heart Doppler sound from divers. On this clip: grade III of IV; the human technician also heard III.',
  },
  {
    id: 'spikecount',
    name: 'Blood',
    product: 'SpikeCount',
    specimen: 'A microscope photo of lab blood with every red cell outlined',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    shape: 'square',
    rect: [0, 0, 100, 100],
    evidence: 'Real microscope photos of lab blood. On this photo: 58.5% spiky; the expert counted 53.8%.',
  },
  {
    id: 'veinsqueeze',
    name: 'Veins',
    product: 'VeinSqueeze',
    specimen: 'A leg-vein ultrasound frame with the vein outlined',
    sentence: 'A clot is a vein that won’t squash: press, and a healthy vein winks shut while a clotted one stays round.',
    shape: 'tall',
    rect: [0, 0, 63, 84],
    evidence: 'Two real leg-vein ultrasound clips from one patient. The clotted vein stayed open at 64% of its starting area; the other closed to 43%.',
  },
  {
    id: 'braindrift',
    name: 'Brain',
    product: 'BrainDrift',
    specimen: 'A brain MRI with its fluid spaces mapped',
    sentence: 'In space the brain floats up and its fluid spaces swell; drag the slider, and the AI measures a real brain changing as if it had flown.',
    shape: 'tall',
    rect: [37, 0, 63, 84],
    evidence: 'One real brain MRI, flown in simulation. The AI measured +9.20% fluid spaces; we put in +10.7%.',
  },
  {
    id: 'garnmeter',
    name: 'Nausea',
    product: 'Garn Meter',
    specimen: 'Fourteen channels of brainwaves from a VR-sickness study',
    sentence: 'Space sickness is measured in Garns; the app asks how you feel, tells you what to do, and openly shows that reading it from brainwaves doesn’t work yet.',
    shape: 'band',
    rect: [0, 21.5, 100, 62.5],
    evidence: 'Real brainwaves from a VR-sickness study. The check-in said 1.0 Garn (7 of 7); the brainwave model read 0.08, so the check-in drives it.',
  },
]

export const ASKING: CheckId = 'spikecount'
export const byId = (id: string): Check | undefined => CHECKS.find((c) => c.id === id)
export const hrefOf = (id: CheckId | 'home') => `#/proto/D/${id}`

/** Poster stills made during the night (settled results, specimen only). */
export function posterUrl(id: CheckId, portrait: boolean): string {
  return `${import.meta.env.BASE_URL}_posters/${id}${portrait ? '_portrait' : ''}.jpg`
}

/** Site-wide status words: who acts. One alert colour on screen at a time. */
export const STATUS: Record<Level, { word: string; calls: string }> = {
  you: { word: 'You', calls: 'quiet, routine' },
  medic: { word: 'Crew medic', calls: 'the crew medical officer acts' },
  surgeon: { word: 'Flight surgeon', calls: 'the flight surgeon acts' },
  abort: { word: 'Abort', calls: 'always greyed; our data never fires it' },
  none: { word: 'No data', calls: 'nothing measured yet' },
}

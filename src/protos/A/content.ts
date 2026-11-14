// Prototype A "Viewbox": the words. Every sentence comes from work/Web/cards/ or research/06_clarity_jury.md section 4.
export type CheckId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'
export type StatusKind = 'you' | 'medic' | 'surgeon' | 'abort'

export interface Check {
  id: CheckId
  name: string
  /** what the specimen is, in plain words (home card) */
  specimen: string
  /** what it checks, in three plain words or fewer (under its film on Home) */
  what: string
  /** the one sentence a judge repeats (clarity jury, section 4) */
  sentence: string
  /** one line for Home's "How do we know?" list: the real data it reads and its one honest result */
  proof: string
}

export const CHECKS: Check[] = [
  {
    id: 'tracktrace',
    name: 'TrackTrace',
    specimen: 'A cell nucleus',
    what: 'cosmic-ray damage',
    // The jury sentence says "an astronaut's cell"; the specimen is a mouse-cell nucleus, so that phrase is corrected here.
    sentence: 'The AI circled every DNA break in a cell nucleus, and when the breaks lined up, that line was the path of a cosmic ray.',
    proof: 'Mouse-cell nuclei hit by an iron-ion beam on the ground; its spot counts agree with NASA’s own counts (rank correlation 0.954).',
  },
  {
    id: 'bubblegrade',
    name: 'BubbleGrade',
    specimen: 'A heart-sound picture',
    what: 'spacewalk bubbles',
    sentence: 'After a spacewalk, the app listens to the heart and hears the bubbles that cause the bends.',
    proof: 'Heart Doppler recordings from divers after a dive: 6,826 recordings from 310 divers; it flags 87 of every 100 high-bubble recordings.',
  },
  {
    id: 'spikecount',
    name: 'SpikeCount',
    specimen: 'A blood photo',
    what: 'spiky blood cells',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    proof: 'Microscope photos of lab blood it never saw in training; about 4.6 points from the expert count.',
  },
  {
    id: 'veinsqueeze',
    name: 'VeinSqueeze',
    specimen: 'A vein ultrasound',
    what: 'clots in a vein',
    sentence: 'A clot is a vein that won’t squash: press, and a healthy vein winks shut while a clotted one stays round.',
    proof: 'Leg-vein ultrasound clips from a patient the model never trained on, shown as an AI second opinion: a best case, not a typical result.',
  },
  {
    id: 'braindrift',
    name: 'BrainDrift',
    specimen: 'A brain MRI',
    what: 'brain fluid shift',
    sentence: 'In space the brain floats up and its fluid spaces swell; drag the slider, and the AI measures a real brain changing as if it had flown.',
    proof: 'One real brain MRI the model never saw, flown in simulation: we put in +10.7% and the AI measures +9.20%.',
  },
  {
    id: 'garnmeter',
    name: 'Garn Meter',
    specimen: 'Brainwaves',
    what: 'space sickness',
    sentence: 'Space sickness is measured in Garns; the app asks how you feel, tells you what to do, and openly shows that reading it from brainwaves doesn’t work yet.',
    proof: 'Real 14-channel brainwaves from a VR-sickness study; the check-in drives the alert, and the brainwave model is shown as not working yet.',
  },
]

export const checkById = (id: string) => CHECKS.find((c) => c.id === id)

export const SITE = {
  sentence: 'Six AI health checks for astronauts, running in your browser.',
  state: 'Five are quiet. One asks for the crew medic.',
  openBlood: 'Open the blood check',
  how: 'How do we know?',
  /** the word under a film that is not asking for anyone (the headline's own word) */
  quiet: 'Quiet',
  comingLine: 'A preview film: this check arrives in the complete build.',
  runBlood: 'Run the blood check',
}

export const STATUS_WORD: Record<StatusKind, string> = { you: 'You', medic: 'Crew medic', surgeon: 'Flight surgeon', abort: 'Abort' }

/** SpikeCount first-layer strings (spikecount card). */
export const SPIKE = {
  sample: 'field-96',
  action: 'Grade this blood',
  again: 'Grade again',
  /** plain action sentence per engine tier (0 Green, 1 Self-care, 2 Crew Medical Officer) */
  act: ['Log the trend; nothing else.', 'Take a fresh sample tomorrow, with clean prep.', 'Run the blood tests for red-cell breakdown.'],
  who: ['you', 'you', 'medic'] as StatusKind[],
}

/** The four status words and who each one calls (site card). */
export const STATUS_LADDER: { kind: StatusKind; text: string }[] = [
  { kind: 'you', text: 'Quiet or routine: you handle it yourself.' },
  { kind: 'medic', text: 'The crew member trained as medical officer acts on board.' },
  { kind: 'surgeon', text: 'The flight surgeon on the ground decides.' },
  { kind: 'abort', text: 'Early return. Always greyed: our data never fires it.' },
]

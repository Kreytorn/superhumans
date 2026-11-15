// The scroll story under each check: the problem first, then briefly how the check works, then "How do we know?".
// Every line comes from work/Web/cards/<id>.md or work/Web/models/<id>.md. No new numbers.
const BASE = import.meta.env.BASE_URL

export interface Story {
  /** the problem, one headline */
  title: string
  /** the problem and its story, two or three short sentences */
  story: string[]
  /** one line that lands the story */
  hook: string
  /** real imagery for the story */
  img: string
  imgAlt: string
  imgCap: string
  /** how the check works, in steps */
  how: string[]
  /** "How do we know?" lines */
  know: string[]
}

export const STORIES: Record<string, Story> = {
  tracktrace: {
    title: 'Where the DNA breaks line up, a heavy ion went through.',
    story: [
      'Each bright spot in a cell nucleus is a DNA break, where the repair protein 53BP1 piles up.',
      'X-rays scatter their spots. An iron ion, the heavy kind in cosmic rays, leaves them in a straight line.',
    ],
    hook: 'These are real mouse-cell nuclei from NASA’s own microscopy data, hit by an iron-ion beam on a ground accelerator.',
    img: `${BASE}_posters/tracktrace_portrait.jpg`,
    imgAlt: 'A nucleus with its circled spots above the grid of its whole sample',
    imgCap: 'Real result: one nucleus, then its whole sample',
    how: [
      'Cut the nucleus into a 32 x 32 grid.',
      'Read the grid eight times: rows, columns and both diagonals, each forward then backward.',
      'Circle every DNA-damage spot the model finds.',
      'When at least 3 circles line up, draw a straight line through them.',
      'The whole sample, never one nucleus, decides what to do next.',
    ],
    know: [
      'Tested on 16,801 nuclei from 3 mice it never saw: its spot counts follow NASA’s (rank correlation 0.954; spot-finding F1 0.920).',
      'Whole-sample call on the 34 test samples: right particle 97%, dose band 88%, time since exposure 95%.',
      'The model separates the two exposures, but part of that comes from lab batch; the foci and the sample-level call are what we trust.',
      'The track line is a geometric fit through the foci the model found. There is no ground truth for it.',
      'Lab wells stand in for crew samples. A ground analog on mouse cells, not a crew test.',
      'Data: NASA BPS Microscopy, 77,177 mouse skin-cell nuclei (NASA OSDR OSD-366).',
    ],
  },
  bubblegrade: {
    title: 'After a spacewalk, gas bubbles in the blood cause the bends.',
    story: [
      'With a Doppler probe over the heart, the bubbles can be heard.',
      'A technician grades them on the Spencer scale, 0 to IV, the scale used in NASA’s decompression chamber trials. BubbleGrade does that listening.',
    ],
    hook: 'The clip on this page is a real diver’s heart recording, never heard in training.',
    img: `${BASE}_posters/bubblegrade_portrait.jpg`,
    imgAlt: 'The heart sound drawn as the picture the model reads',
    imgCap: 'Real result: the heart sound as the model reads it',
    how: [
      'Hear the clip in 5-second slices.',
      'For each slice, give the chance the grade is at least I, II, III and IV.',
      'Average the slices into one grade and a spacewalk alert.',
    ],
    know: [
      'Trained on 6,826 real Doppler recordings from 310 divers (Blogg et al. 2026 open archive). Diver data, not astronaut data.',
      'On divers it never heard: spacewalk alert AUROC 0.892; it flags 87% of grade III-IV clips at 70% specificity.',
      'Weak spot: grade IV is mostly predicted as III.',
    ],
  },
  spikecount: {
    title: 'In orbit, astronauts destroy 54% more red blood cells.',
    story: [
      'On Skylab, NASA counted spiky red cells by hand on an electron microscope: under 1% before flight, up to about 7% late in flight.',
      'SpikeCount outlines every cell in a light-microscope photo and counts the spiky ones, in the browser.',
    ],
    hook: 'Skylab is history only: a different microscope, never compared with our numbers.',
    img: `${BASE}spikecount/fields/96.png`,
    imgAlt: 'Microscope photo of red blood cells',
    imgCap: 'Real microscope photo, never seen in training',
    how: [
      'The outliner draws an outline around every red cell.',
      'The grader names each cell’s shape: a smooth disc, spiky grade 1 to 4, or a cup.',
      'Spiky cells over all cells gives the field’s spiky %, compared with the crew member’s own preflight sample.',
    ],
    know: [
      'Every field on screen was never seen in training.',
      'Over 152 held-out photos: r 0.933, average miss 4.57 points, cell outlines F1 0.948.',
      'Lab blood from healthy donors (RedTell DSE set, Sadafi et al. 2023, CC BY 4.0), not astronaut blood.',
      'This does not diagnose space anemia or measure hemolysis.',
    ],
  },
  veinsqueeze: {
    title: 'In 2019, a clot was found in space.',
    story: [
      'The first clot found in space, in a neck vein on the ISS, was confirmed with this same squeeze test.',
      'Press with the probe: a healthy vein squashes flat, a clot-filled vein stays round.',
    ],
    hook: 'Two real leg-vein ultrasound clips, two veins of one patient the model never trained on.',
    img: `${BASE}_posters/veinsqueeze_portrait.jpg`,
    imgAlt: 'Two ultrasound frames with the vein outlined',
    imgCap: 'Real ultrasound, the vein outlined',
    how: [
      'SAM 2 outlines the vein in every frame.',
      'The squeeze curve is that outline’s area against its start.',
      'A separate model reads 32 frames and gives the AI clot chance. The curve never feeds it.',
    ],
    know: [
      'Trained on ThrombUS+: 2,341 leg-vein clips from 594 patients in 5 European hospitals (CC BY 4.0).',
      'Pooled AUC 0.785; within one scanner brand 0.720; same-patient pairs 0.606.',
      'So it ships as an AI second opinion, screening only.',
    ],
  },
  braindrift: {
    title: 'On long missions, the brain moves up.',
    story: [
      'Long missions push the brain upward in the skull and swell its fluid spaces.',
      'No astronaut scans are public. So we put the published change into a real brain the AI had never seen, and let it measure.',
    ],
    hook: 'Drag to fly it: the swelling is what we put in; the measuring is the model’s.',
    img: `${BASE}_posters/braindrift_portrait.jpg`,
    imgAlt: 'A cut-away brain with its fluid spaces in blue',
    imgCap: 'Real MRI, the fluid spaces the model mapped',
    how: [
      'Drag: the picture steps through five stored frames of the simulated flight.',
      'The model colours every point of the brain as one of 6 classes.',
      'It compares the fluid-space volume after against before, and how far the top of the brain rose.',
    ],
    know: [
      'Ventricle Dice 0.953 on 40 held-out brains.',
      'Flight simulation on 40 held-out brains: the ventricle change is off by 1.03 points on average.',
      'Nothing here was trained or tested on astronaut, low-field or in-flight scans.',
    ],
  },
  garnmeter: {
    title: 'Space sickness has a unit: the Garn.',
    story: [
      'It is named after Senator Jake Garn. One Garn is totally sick.',
      'Can a headset read it from your brainwaves? We tried. On new people it is close to a coin flip, so the app asks you instead.',
    ],
    hook: 'An honest negative result, shown openly.',
    img: `${BASE}_posters/garnmeter_portrait.jpg`,
    imgAlt: 'Recorded brainwaves, a scalp map and the Garn dial',
    imgCap: 'Real recorded brainwaves, played back',
    how: [
      'The traces are real recorded brainwaves, 14 channels, played back.',
      'After the first 4 seconds, the model gives one estimate every half second.',
      'The gauge moves only on your own check-in, 1 to 7.',
    ],
    know: [
      'Real EEG from 33 people in a VR-sickness study at Hacettepe University. A ground analog, not astronauts.',
      'On 32 people it never saw: AUROC 0.54; a standard small EEG net: 0.56. Tier C, an honest negative result.',
      'Scene settings alone: 0.75. The scene, not the brain, carries the signal.',
    ],
  },
}

/** IonScan's eight scans, in the real order: rows, columns, both diagonals, each forward then backward. */
export const SCANS: { name: string; dir: 'r' | 'c' | 'd' | 'a'; back: boolean }[] = [
  { name: 'Rows', dir: 'r', back: false },
  { name: 'Rows, back', dir: 'r', back: true },
  { name: 'Columns', dir: 'c', back: false },
  { name: 'Columns, back', dir: 'c', back: true },
  { name: 'Diagonal', dir: 'd', back: false },
  { name: 'Diagonal, back', dir: 'd', back: true },
  { name: 'Other diagonal', dir: 'a', back: false },
  { name: 'Other diagonal, back', dir: 'a', back: true },
]

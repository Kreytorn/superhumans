// The six checks in pitch order. The order is also the order of the organ glows in the figure shader (uOrg[0..5]).
// org = organ point in body space (metres); side / ay = callout column and row on the 1920x1080 stage;
// ayP = callout row on the phone stage (780x1040).
export interface Mod {
  id: string
  name: string
  hook: string
  sentence: string
  color: string
  org: [number, number, number]
  side: 'l' | 'r'
  ay: number
  ayP: number
  /** The one check that asks for attention; every other check is quiet. */
  ask?: boolean
}

export const MODS: Mod[] = [
  {
    id: 'tracktrace',
    name: 'TrackTrace',
    hook: 'Cosmic-ray hits, traced',
    sentence: 'IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.',
    color: '#FF7A45',
    org: [-0.192, 1.405, 0.02],
    side: 'l',
    ay: 318,
    ayP: 262,
  },
  {
    id: 'bubblegrade',
    name: 'BubbleGrade',
    hook: 'Hearing bubbles in blood',
    sentence: 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.',
    color: '#3FD0FF',
    org: [0.028, 1.3, 0.04],
    side: 'r',
    ay: 404,
    ayP: 340,
  },
  {
    id: 'spikecount',
    name: 'SpikeCount',
    hook: 'Every red cell, graded by shape',
    sentence: 'Every red blood cell, outlined. The spiky ones, counted.',
    color: '#B78CFF',
    org: [-0.247, 0.995, 0.016],
    side: 'l',
    ay: 566,
    ayP: 452,
    ask: true,
  },
  {
    id: 'veinsqueeze',
    name: 'VeinSqueeze',
    hook: 'A clot won’t squash',
    sentence: 'A clot is a vein that won’t squash.',
    color: '#FF4F7B',
    org: [0.088, 0.72, 0.03],
    side: 'r',
    ay: 654,
    ayP: 628,
  },
  {
    id: 'braindrift',
    name: 'BrainDrift',
    hook: 'The brain’s fluid spaces',
    sentence: 'In flight the brain rises and its fluid spaces swell.',
    color: '#5CF2B0',
    org: [0, 1.695, 0],
    side: 'l',
    ay: 124,
    ayP: 104,
  },
  {
    id: 'garnmeter',
    name: 'Garn Meter',
    hook: 'Space sickness, in Garns',
    sentence: 'Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.',
    color: '#FFD34D',
    org: [0.082, 1.6, -0.006],
    side: 'r',
    ay: 196,
    ayP: 168,
  },
]

export const QUIET = 'Quiet'
export const ASK = 'Asks for the crew medic'
export const href = (view: string) => `#/proto/DF/${view}`

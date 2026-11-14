// The six modules in pitch order. Names and roles from SCREENS.md (pitch-order table).
export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

export interface ModuleInfo {
  id: ModuleId
  index: number
  name: string
  callsign: string
  hook: string
  role: 'main' | 'side'
}

export const MODULES: ModuleInfo[] = [
  { id: 'tracktrace', index: 1, name: 'TrackTrace', callsign: 'TRK', hook: 'Cosmic-ray hits, traced', role: 'main' },
  { id: 'bubblegrade', index: 2, name: 'BubbleGrade', callsign: 'BUB', hook: 'Hearing bubbles in blood', role: 'main' },
  { id: 'spikecount', index: 3, name: 'SpikeCount', callsign: 'SPK', hook: 'Spots space anemia', role: 'main' },
  { id: 'veinsqueeze', index: 4, name: 'VeinSqueeze', callsign: 'VEN', hook: 'Catching silent space clots', role: 'side' },
  { id: 'braindrift', index: 5, name: 'BrainDrift', callsign: 'BRN', hook: 'The floating brain', role: 'side' },
  { id: 'garnmeter', index: 6, name: 'Garn Meter', callsign: 'GRN', hook: 'Space sickness, in Garns', role: 'side' },
]

export const moduleById = (id: string) => MODULES.find((m) => m.id === id)

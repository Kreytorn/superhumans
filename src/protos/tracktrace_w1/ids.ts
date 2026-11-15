// TrackTrace W1: the nuclei it shows and the tier helper, shared by ./room.tsx and ./index.tsx.
import type { TrackTraceAct } from '../../engine/tracktrace'

/** The iron-ion hero (clearest track line), the X-ray nucleus, the "which one?" iron-ion nucleus, the hero's 3D stack. */
export const HERO = 'nucleus-238'
export const XRAY = 'nucleus-241'
export const LINE = 'nucleus-239'
export const HERO_3D = 'P242_G4_003_003'

export type Tier = 'GREEN' | 'YELLOW' | 'ORANGE' | null
export const tierOf = (a: TrackTraceAct | null): Tier => (a ? a.tierRef : null)

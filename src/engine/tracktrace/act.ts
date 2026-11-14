// TrackTrace ACT: plans/01_TrackTrace.md section 9 and work/App/SCREENS.md section 1.5, implemented exactly
// as the Python reference tt_mil.act_tier_ref (work/TrackTrace/vm/tt_mil.py). Tiers are evaluated from the
// top; the highest one whose trigger holds is shown. RED is never triggered by TrackTrace.
import type { ActDecision, Source } from '../types'

export type TierName = 'GREEN' | 'YELLOW' | 'ORANGE'

export interface SampleVerdict {
  /** Probabilities [sham, X-ray, Fe]. */
  particle: number[]
  /** Lab dose band probabilities [sham, low, high]. */
  dose: number[]
  /** Time since exposure probabilities [4 h, 24 h, 48 h]. */
  time: number[]
}

/** What act() needs: a whole-sample verdict and mu (mean model-estimated foci per nucleus). */
export interface ActInput {
  verdict: SampleVerdict
  mu: number
  /** mu of the same crew member's sham baseline sample at the same time point (null = unknown). */
  mu0?: number | null
}

/** Inputs the crew can change to see the decision move. */
export interface CrewInputs {
  /** Override mu0 (personal sham baseline). null = no baseline on file. */
  mu0?: number | null
}

export interface TrackTraceAct extends ActDecision {
  /** Python-reference tier name, or null when no trigger holds (P(sham) < 0.5 but dose band "sham"). */
  tierRef: TierName | null
  /** P(Fe) >= 0.5 adds "1 HZE-type hit pattern" to the crew member's ledger (UI; our product rule). */
  ledgerHit: boolean
  /** The values every trigger was evaluated on. */
  inputs: { pSham: number; pFe: number; doseBand: 'sham' | 'low' | 'high'; timeBand: '4 h' | '24 h' | '48 h'; mu: number; mu0: number | null; notRepairing: boolean }
  /** The RED row, always shown greyed out: never triggered by TrackTrace. */
  redRow: { tierName: string; greyed: true; reason: string; actions: string[]; limits: string; sources: Source[] }
}

const DOSE = ['sham', 'low', 'high'] as const
const TIME = ['4 h', '24 h', '48 h'] as const

export const SOURCES = {
  tb020: { label: 'OCHMO-TB-020 Rev G (NASA radiation protection technical brief)', ref: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf' },
  fish: { label: 'George & Cucinotta, NASA JSC: NASA implemented a FISH biodosimetry program for long-duration crew', ref: 'https://ntrs.nasa.gov/citations/20040088718' },
  penninckx: { label: 'NASA-funded mouse study: persistent foci at 24 h linked to radiosensitivity (Penninckx et al.)', ref: 'https://ntrs.nasa.gov/api/citations/20180002122/downloads/20180002122.pdf' },
  exp8: { label: 'Expedition 8 shelter, Oct 2003; Orion stowage shelter (act_1.md section 3, cited there, not re-verified)', ref: 'https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/' },
  alara: { label: 'ALARA, NASA-STD-3001 Vol 1 4029 via OCHMO-TB-020', ref: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf' },
} satisfies Record<string, Source>

/** Fixed lines that accompany every TrackTrace ACT card. */
export const ACT_CAVEATS = [
  'All tier triggers (the 0.5 cut-offs and the 2x ratio) are our product rule, fixed before testing and never tuned on test data.',
  'Ground analog: mouse skin-cell nuclei hit by an accelerator beam on the ground; lab wells stand in for crew samples.',
  'Dose bands are lab bands (sham / low / high), never astronaut doses. Lab grays are never converted into millisieverts.',
]

const RED_ROW: TrackTraceAct['redRow'] = {
  tierName: 'RED: abort / evacuate',
  greyed: true,
  reason: 'Never triggered by TrackTrace. Our training data stops at 1 Gy of lab dose; we cannot recognise acute-radiation-syndrome doses. This escalation path belongs to onboard dosimetry.',
  actions: ['Abort the EVA and the mission; return for treatment'],
  limits: '250 mSv per solar particle event and 600 mSv career (OCHMO-TB-020 Rev G)',
  sources: [SOURCES.tb020],
}

export function decide(input: ActInput, crew?: CrewInputs): TrackTraceAct {
  const { verdict, mu } = input
  const mu0 = crew && 'mu0' in crew ? (crew.mu0 ?? null) : (input.mu0 ?? null)
  const pSham = verdict.particle[0]
  const pFe = verdict.particle[2]
  const band = argmax3(verdict.dose)
  const tmax = argmax3(verdict.time)
  const ledgerHit = pFe >= 0.5
  const notRepairing = (tmax === 1 || tmax === 2) && mu0 !== null && mu >= 2 * mu0
  const inputs = { pSham, pFe, doseBand: DOSE[band], timeBand: TIME[tmax], mu, mu0, notRepairing }
  const pct = (p: number) => `${(100 * p).toFixed(0)}%`
  const base = { ourRule: true, caveats: ACT_CAVEATS, ledgerHit, inputs, redRow: RED_ROW }

  if ((pSham < 0.5 && band === 2) || notRepairing) {
    const why: string[] = []
    if (pSham < 0.5 && band === 2) why.push(`P(sham) ${pct(pSham)} < 50% and the most likely lab dose band is "high"`)
    if (notRepairing)
      why.push(`most likely time ${TIME[tmax]} and mu ${mu.toFixed(2)} >= 2 x mu0 ${mu0!.toFixed(2)} ("damage not repairing")`)
    return {
      ...base,
      tier: 2,
      tierName: 'ORANGE: flight surgeon + ground radiation team',
      tierRef: 'ORANGE',
      severity: 'warning',
      whoActs: 'flight surgeon with the ground radiation team (Space Radiation Analysis Group)',
      headline: 'Flight surgeon and the ground radiation team review this sample; terminate or postpone the EVA.',
      actions: [
        'Flight surgeon with the Space Radiation Analysis Group',
        'Terminate or postpone the EVA (dosimetry-driven protection is very high if the EVA ends within 2 h)',
        'Update the career-dose record',
        'Confirmatory blood draw for chromosome (FISH) biodosimetry',
      ],
      trigger: why.join('; or '),
      sources: [SOURCES.tb020, SOURCES.fish, SOURCES.penninckx],
    }
  }
  if (pSham < 0.5 && band === 1) {
    return {
      ...base,
      tier: 1,
      tierName: 'YELLOW: crew medical officer',
      tierRef: 'YELLOW',
      severity: 'caution',
      whoActs: 'crew medical officer',
      headline: 'Crew medical officer cross-checks the onboard dosimeters; crew moves to the most-shielded area.',
      actions: [
        'CMO cross-checks the onboard physical dosimeters',
        'Crew moves to the most-shielded area',
        'Symptom watch for nausea, vomiting, fatigue',
      ],
      trigger: `P(sham) ${pct(pSham)} < 50% and the most likely lab dose band is "low"`,
      sources: [SOURCES.exp8],
    }
  }
  if (pSham >= 0.5) {
    return {
      ...base,
      tier: 0,
      tierName: 'GREEN: self-care',
      tierRef: 'GREEN',
      severity: 'nominal',
      whoActs: 'self',
      headline: 'Log the sample to the personal dose record and keep ALARA habits.',
      actions: [
        'Log the sample to the personal dose record',
        'Keep ALARA habits (sleep in the shielded crew quarters, limit time in low-shielded modules)',
      ],
      trigger: `P(sham) ${pct(pSham)} >= 50% and no higher trigger`,
      sources: [SOURCES.alara],
    }
  }
  // tt_mil.act_tier_ref returns None here: no row of the plan's table holds.
  return {
    ...base,
    tier: 0,
    tierName: 'No tier: no trigger holds',
    tierRef: null,
    severity: 'watch',
    whoActs: 'nobody (no rule fires)',
    headline: 'No ACT rule fires: the sample is not called sham, yet its most likely lab dose band is "sham".',
    actions: [],
    trigger: `P(sham) ${pct(pSham)} < 50% but the most likely lab dose band is "sham"; no tier of plan section 9 holds`,
    sources: [],
  }
}

function argmax3(v: number[]): number {
  let k = 0
  for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i
  return k
}

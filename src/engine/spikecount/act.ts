// "What to do next" for SpikeCount: plan 03 section 9 (tiers), SCREENS section 3.5 (card), with the source-check
// outcome of work/SpikeCount/verify_act.md (gauge renamed, Crew-11 "not anemia" cut, WHO 2011 Table 1 cited
// directly). Tier logic and the margin M are OUR PRODUCT RULE; the actions and reference numbers are cited.
import type { ActDecision, Severity, Source } from '../types'
import { actTier } from './pipeline'

export const ACT_MARGIN_PP = 10 // metrics.json act.margin_pp = ceil(2 x OOF MAE 4.57 pp); our product rule

export const TIER_NAMES = ['Green', 'Self-care', 'Crew Medical Officer', 'Flight surgeon', 'Ground / evacuation']

const S = {
  m115: { label: 'Kimzey 1975, Skylab M115', ref: 'https://ntrs.nasa.gov/citations/19750006315' },
  trudel: {
    label: 'Trudel 2022, Nature Medicine',
    ref: 'doi:10.1038/s41591-021-01637-7 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8799460/)',
  },
  shahin: { label: 'Shahin 2020, Ann Biomed Eng', ref: 'Shahin, Louati, Trudel, Ann Biomed Eng 48:1540 (2020)' },
  zwart: { label: 'Zwart 2013, AJCN', ref: 'Zwart, Morgan, Smith, Am J Clin Nutr 98:217-223 (2013)' },
  smithZwart: {
    label: 'Smith/Zwart, NASA',
    ref: 'NASA ISS Science blog, "Ironing Out Nutrition\'s Bell-Shaped Curve" (2015)',
  },
  artifact: {
    label: 'LibreTexts / The Blood Project',
    ref: 'LibreTexts, A Laboratory Guide to Clinical Hematology, "Echinocytes (Burr Cells)"; thebloodproject.com, "What is a burr cell"',
  },
  aafp: {
    label: 'AAFP 2018',
    ref: 'Phillips & Henderson, Am Fam Physician 98:354 (2018), https://www.aafp.org/pubs/afp/issues/2018/0915/p354.html',
  },
  rhealth: { label: 'rHEALTH, Nat Commun 2024', ref: 'doi:10.1038/s41467-024-46483-6' },
  csa: { label: 'CSA Bio-Analyzer', ref: 'https://directory.eoportal.org/other-space-activities/iss-bio-monitor-bio-analyzer' },
  hemocue: { label: 'NASA HemoCue demo', ref: 'NTRS 20210000516' },
  surgeons: {
    label: 'NASA "Flight Surgeons" page',
    ref: 'https://www.nasa.gov/directorates/esdmd/hhp/flight-surgeons/',
  },
  who: { label: 'WHO 2011, Table 1', ref: 'WHO/NMH/NHD/MNM/11.1, https://iris.who.int/handle/10665/85839' },
  npr: { label: 'NPR, 15 Jan 2026', ref: 'https://www.npr.org/2026/01/15/nx-s1-5677647/nasa-spacex-crew-11-splashdown-return' },
  spacecom: {
    label: 'Space.com, Jan 2026',
    ref: 'https://space.com/space-exploration/international-space-station/spacex-crew-11-astronauts-return-to-earth-after-1st-ever-medical-evacuation-of-iss',
  },
  ohri: { label: 'Ottawa Hospital 2022', ref: 'https://ohri.ca/en/newsroom/being-space-destroys-more-red-blood-cells' },
} satisfies Record<string, Source>

/** Fixed lines that must accompany the decision wherever it is shown (verbatim). */
export const ACT_CAVEATS = [
  'There is no proven drug or countermeasure for space hemolysis yet (Trudel 2022; Ottawa Hospital 2022).',
  'The thresholds in the action card are our product rules; the actions come from NASA and clinical practice.',
  'One field stands in for one sample here. A real sample is one blood draw with at least 200 graded cells, about 5 fields (our product rule).',
  'Lab blood from healthy donors (RedTell), not astronaut blood. This does not diagnose space anemia or measure hemolysis.',
  'The Spike severity score (0-4, our scale) is shown and trended but never triggers a tier.',
]

interface TierText {
  whoActs: string
  severity: Severity
  headline: string
  actions: string[]
  sources: Source[]
}

export const TIER_TEXT: TierText[] = [
  {
    whoActs: 'self',
    severity: 'nominal',
    headline: 'Log the trend; nothing else.',
    actions: ['Log the trend; nothing else.'],
    sources: [S.m115],
  },
  {
    whoActs: 'self',
    severity: 'watch',
    headline: 'More spiky cells, but early-stage (E1), the reversible type: self-care steps.',
    actions: [
      'Re-sample the next day with clean prep, to rule out an EDTA or glass artifact.',
      'Collect a MARROW-style breath sample (on waking; 20-s breath hold; discard the first 400 mL; fill the 750 mL bag; plus an ambient-air canister).',
      'Eat the full calorie ration.',
      'Do not self-start iron: iron and ferritin already rise in flight.',
      'Keep prescribed exercise, knowing it does not stop hemolysis.',
    ],
    sources: [S.trudel, S.shahin, S.zwart, S.smithZwart, S.artifact],
  },
  {
    whoActs: 'crew medical officer',
    severity: 'caution',
    headline: 'The Crew Medical Officer runs the hemolysis panel.',
    actions: [
      'The CMO draws blood for the hemolysis panel (CBC, reticulocytes, LDH, haptoglobin, unconjugated bilirubin) on the onboard analyzers, or spins and freezes serum for return.',
      'Screen for non-space causes (kidney, liver, PK deficiency).',
      'Raise it at the weekly Private Medical Conference.',
    ],
    sources: [S.aafp, S.trudel, S.rhealth, S.csa, S.hemocue, S.surgeons],
  },
  {
    whoActs: 'flight surgeon',
    severity: 'warning',
    headline: 'Protect the landing (next step; from the CMO lab panel, never from images).',
    actions: [
      'Trigger (lab panel, not the model): Hb < 13 g/dL (men) / < 12 g/dL (women, non-pregnant), or Hb falling despite in-flight hemoconcentration, or depleted haptoglobin.',
      'Re-plan high-exertion tasks and the first surface EVAs; landing-day help; post-landing Hb checks until recovery.',
    ],
    sources: [S.who, S.trudel],
  },
  {
    whoActs: 'ground team',
    severity: 'critical',
    headline: 'Early return (text only; never triggered by the model).',
    actions: [
      'Trigger: rapid or unexplained hemolysis, symptomatic anemia, or signs of intravascular hemolysis beyond what the onboard workup can handle.',
      'Early return. Precedent: the Crew-11 medical evacuation (Jan 2026); the cause has not been disclosed.',
      'Postflight follow-up and a gap before the next mission.',
    ],
    sources: [S.npr, S.spacecom, S.trudel, S.m115],
  },
]

export interface CrewInputs {
  /** Personal baseline: the astronaut's own preflight sample. Default: the shipped timeline's Preflight step. */
  baseline?: { spikyPct: number; advancedPct: number; label?: string }
  /** The previous sample's tier and spiky % (enables "both tier 1 and spiky rising"). */
  previous?: { tier: number; spikyPct: number } | null
  /** The astronaut ticks "fatigue / short of breath on exertion". */
  symptom?: boolean
  /** Margin M in pp; default 10 (metrics.json). Changing it is a what-if on OUR rule, label it so. */
  marginPp?: number
}

export interface SpikeActDecision extends ActDecision {
  /** the numbers the rule saw */
  inputs: {
    spikyPct: number
    advancedPct: number
    s0: number
    a0: number
    marginPp: number
    baselineLabel: string
    previous: { tier: number; spikyPct: number } | null
    symptom: boolean
  }
  /** distance to each trigger in pp: threshold minus value; 0 or below = that trigger has fired (the rule uses >=) */
  headroomPp: { spiky: number; advanced: number }
  /** tiers 3-4, always shown greyed as the next steps; the model never triggers them */
  nextSteps: { tier: number; tierName: string; whoActs: string; headline: string; actions: string[]; sources: Source[] }[]
}

const f1 = (x: number) => x.toFixed(1)

export function decide(spikyPct: number, advancedPct: number, crew: CrewInputs, defaultBaseline: { spikyPct: number; advancedPct: number; label: string }): SpikeActDecision {
  const b = crew.baseline ?? defaultBaseline
  const s0 = b.spikyPct
  const a0 = b.advancedPct
  const M = crew.marginPp ?? ACT_MARGIN_PP
  const prev = crew.previous ?? null
  const symptom = !!crew.symptom
  const tier = actTier(spikyPct, advancedPct, s0, a0, M, prev ? [prev.tier, prev.spikyPct] : null, symptom)
  const why: string[] = []
  const sT = s0 + M
  const aT = a0 + M
  if (tier === 2) {
    if (advancedPct >= aT) why.push(`advanced % ${f1(advancedPct)} >= baseline ${f1(a0)} + M ${f1(M)} = ${f1(aT)}`)
    if (symptom) why.push('the astronaut ticked "fatigue / short of breath on exertion"')
    if (advancedPct < aT && !symptom && prev)
      why.push(`previous and current sample both tier 1 and spiky % rose (${f1(prev.spikyPct)} -> ${f1(spikyPct)})`)
  } else if (tier === 1) {
    why.push(`spiky % ${f1(spikyPct)} >= baseline ${f1(s0)} + M ${f1(M)} = ${f1(sT)}, advanced % ${f1(advancedPct)} < ${f1(aT)}`)
  } else {
    why.push(`spiky % ${f1(spikyPct)} < ${f1(sT)} and advanced % ${f1(advancedPct)} < ${f1(aT)} (baseline ${f1(s0)} / ${f1(a0)} + M ${f1(M)})`)
  }
  const t = TIER_TEXT[tier]
  return {
    tier,
    tierName: TIER_NAMES[tier],
    severity: t.severity,
    whoActs: t.whoActs,
    headline: t.headline,
    actions: t.actions,
    trigger: `${TIER_NAMES[tier]}: ${why.join('; ')}. Baseline: ${b.label ?? 'personal preflight sample'}.`,
    ourRule: true,
    sources: t.sources,
    caveats: ACT_CAVEATS,
    inputs: { spikyPct, advancedPct, s0, a0, marginPp: M, baselineLabel: b.label ?? 'personal preflight sample', previous: prev, symptom },
    headroomPp: { spiky: sT - spikyPct, advanced: aT - advancedPct },
    nextSteps: [3, 4].map((k) => ({
      tier: k,
      tierName: TIER_NAMES[k],
      whoActs: TIER_TEXT[k].whoActs,
      headline: TIER_TEXT[k].headline,
      actions: TIER_TEXT[k].actions,
      sources: TIER_TEXT[k].sources,
    })),
  }
}

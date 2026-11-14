// BrainDrift ACT: plan 05 section 9 and SCREENS section 5.5, row for row. Every trigger value is OUR PRODUCT RULE,
// built from published magnitudes; none is a clinical standard. There is no MRI in orbit today (Kramer 2020), so this
// is a pre/post-flight gate on Earth and a reader for future portable MRI.
import type { Severity, Source } from '../types'
import type { ActRow, BrainDriftAct, BrainDriftResult, CrewInputs } from './result'

export const PVS_HIGH_MM3 = 4340.7
export const PVS_LOW_MID_MM3 = 2409.0
export const VENTRICLE_CHANGE_PCT = 5.0
export const VERTEX_RISE_MM = 1.0

const SRC = {
  barisano: { label: 'Barisano 2022 PNAS', ref: 'PNAS 119(17):e2120439119, https://pmc.ncbi.nlm.nih.gov/articles/PMC9169932/' },
  braslet: { label: 'NASA NTRS 20150021483 (Braslet)', ref: 'https://ntrs.nasa.gov/api/citations/20150021483/downloads/20150021483.pdf' },
  eye2024: { label: 'Eye 2024 review (glasses)', ref: 'https://doi.org/10.1038/s41433-024-03124-y' },
  brunstetter: { label: 'Brunstetter, NASA 2022', ref: 'NASA NTRS 20220018416, "SANS Overview and Telemedicine"' },
  roberts2019: { label: 'Roberts 2019 AJNR', ref: 'AJNR 40(11):1878-1885, doi 10.3174/ajnr.A6249' },
  kramer2020: { label: 'Kramer 2020 Radiology', ref: 'Radiology 295(3):640-648, doi 10.1148/radiol.2020191413' },
  mcgregor2023: { label: 'McGregor 2023 Sci Rep', ref: 'https://www.nature.com/articles/s41598-023-33331-8' },
  pnas2026: { label: 'PNAS 2026', ref: 'Wang ... Seidler, PNAS 123(3), doi 10.1073/pnas.2505682122' },
  frontNeurol2023: { label: 'Front Neurol 2023', ref: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10641777/' },
  hearon2022: { label: 'Hearon 2022 JAMA Ophthalmol', ref: 'JAMA Ophthalmol 140(1):59-65, doi 10.1001/jamaophthalmol.2021.5200' },
  lawley2020: { label: 'Lawley 2020', ref: 'research/materialhunt/act_2.md (Tier 3 row)' },
  eye2026: { label: 'Eye 2026 consensus', ref: 'doi 10.1038/s41433-026-04651-6' },
  act2: { label: 'act_2.md', ref: 'research/materialhunt/act_2.md' },
} satisfies Record<string, Source>

/** Fixed caveats on the ACT card (plan section 9, verbatim). */
export const ACT_CAVEATS = [
  'No countermeasure has been proven in flight to stop the brain shift.',
  'Brief in-flight LBNP did not change optic nerve head shape (Pardon 2022).',
  'The only definitive fix is return to Earth, and a Mars crew has no early return (NASA 2022), which is why prevention and selection are the ACT.',
  'All trigger values are our product rules built from published magnitudes; none is a clinical standard.',
  'There is no MRI in orbit today (Kramer 2020), so this is a pre/post-flight gate on Earth and a reader for future portable MRI.',
]

/** Hover-only line on the ventricle readout (plan 11: never spoken, labelled "preliminary, small group"). */
export const VENTRICLE_HOVER_PRELIMINARY =
  'Preliminary, small group: astronauts who developed SANS had smaller ventricle growth (6.5% vs 12.8%, 12 astronauts; Roberts 2019 AJNR via act_2.md).'
/** Hover line allowed by the real repeat-scan check (bd_realcheck.json act_rule). */
export const VENTRICLE_HOVER_NOISE = 'Our day-to-day noise on real repeat scans: 4.1% (95th percentile).'

const STANDARD_SCHEDULE = 'Standard schedule: onboard SANS exams around flight day 30, flight day 90 and 30 days before return'

function pvsRows(band: 'low' | 'mid' | 'high', mm3: number | null, who: string): ActRow[] {
  const val = mm3 === null ? `PVS band ${band}` : `PVS ${mm3.toFixed(1)} mm3, band ${band}`
  if (band !== 'high') {
    return [
      {
        tier: 0,
        tierName: 'Standard schedule',
        severity: 'nominal',
        whoActs: 'crew medical officer',
        readout: `PVS band (${who})`,
        trigger: `${val}: mid or low (below 4,340.7 mm3)`,
        actions: [STANDARD_SCHEDULE],
        ourRule: true,
        sources: [SRC.brunstetter],
      },
    ]
  }
  const trig = `${val}: high band, >= 4,340.7 mm3 (top third of the HCP-A reference: ageing adults aged 36-100, not astronauts; our product rule)`
  return [
    {
      tier: 1,
      tierName: 'Tier 1, astronaut self-care',
      severity: 'watch',
      whoActs: 'self',
      readout: `PVS band (${who})`,
      trigger: trig,
      actions: [
        'Fluid-shift countermeasures: LBNP ("vacuum pants", Russian Chibis)',
        'Thigh cuffs (Russian Braslet)',
        'Avoid heavy breath-hold (Valsalva) lifts on ARED (a hypothesis)',
        'Daily Amsler-grid near-vision check',
        'Plus-lens "space anticipation glasses" if near vision blurs',
      ],
      ourRule: true,
      sources: [SRC.barisano, SRC.braslet, SRC.eye2024],
      hover: ['Barisano 2022 PNAS: NASA astronauts who developed SANS had larger white-matter PVS both before and after flight (an association).'],
    },
    {
      tier: 2,
      tierName: 'Tier 2, crew medical officer',
      severity: 'caution',
      whoActs: 'crew medical officer',
      readout: `PVS band (${who})`,
      trigger: trig,
      actions: [
        'Pull the onboard SANS exam forward (OCT, fundus photo, ocular ultrasound, tonometry, visual acuity / Amsler) instead of waiting for the scheduled one',
        'Downlink the results',
      ],
      ourRule: true,
      sources: [SRC.brunstetter],
    },
    {
      tier: 4,
      tierName: 'Tier 4d',
      severity: 'watch',
      whoActs: 'ground team',
      readout: `PVS band (${who})`,
      trigger: trig,
      actions: ['Flag for Mars crew-selection review'],
      ourRule: true,
      sources: [SRC.act2, SRC.barisano],
    },
  ]
}

function ventricleRows(pct: number | null): ActRow[] {
  if (pct === null) return []
  const v = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  if (pct >= VENTRICLE_CHANGE_PCT) {
    const trig = `Ventricle change ${v} >= +5.0% (about half the long-duration mean of +10.7%; our product rule)`
    const hover = [VENTRICLE_HOVER_NOISE, VENTRICLE_HOVER_PRELIMINARY]
    return [
      {
        tier: 4,
        tierName: 'Tier 4b',
        severity: 'caution',
        whoActs: 'ground team',
        readout: 'Ventricle change (pre vs post scan)',
        trigger: trig,
        actions: ['Serial MRI follow-up after landing'],
        ourRule: true,
        sources: [SRC.roberts2019, SRC.kramer2020],
        hover: [...hover, 'Kramer 2020 Radiology: summated brain and CSF volume still up 28 mL at 360 days.'],
      },
      {
        tier: 4,
        tierName: 'Tier 4c, re-flight clock',
        severity: 'caution',
        whoActs: 'ground team',
        readout: 'Ventricle change (pre vs post scan)',
        trigger: trig,
        actions: ['Earliest next long mission 3 years after landing, so the ventricles can recover'],
        ourRule: true,
        sources: [SRC.mcgregor2023, SRC.roberts2019],
        hover: [
          'McGregor 2023 Sci Rep: crew with less than 3 years between flights "showed little to no enlargement" of the lateral and third ventricles; intervals under 3 years "may not allow sufficient time for the ventricles to fully recover".',
        ],
      },
    ]
  }
  return [
    {
      tier: 0,
      tierName: 'No flag',
      severity: 'nominal',
      whoActs: 'ground team',
      readout: 'Ventricle change (pre vs post scan)',
      trigger: `Ventricle change ${v} < +5.0%`,
      actions: ['No flag; routine post-flight imaging'],
      ourRule: true,
      sources: [],
      hover: [VENTRICLE_HOVER_NOISE],
    },
  ]
}

function riseRows(mm: number | null): ActRow[] {
  if (mm === null || mm < VERTEX_RISE_MM) return []
  return [
    {
      tier: 4,
      tierName: 'Tier 4a, post-landing',
      severity: 'caution',
      whoActs: 'ground team',
      readout: 'Vertex rise (pre vs post scan)',
      trigger: `Vertex rise ${mm.toFixed(2)} mm >= 1.0 mm (our product rule)`,
      actions: ['Balance-risk flag', 'Vestibular rehab', 'Fall precautions'],
      ourRule: true,
      sources: [SRC.pnas2026, SRC.frontNeurol2023],
      hover: [
        'PNAS 2026: "Larger posterior insula translations were correlated with greater postflight balance declines": an association, and our vertex measure is not the insula.',
      ],
    },
  ]
}

function crewRows(c: CrewInputs): ActRow[] {
  const rows: ActRow[] = []
  if (c.blurredNearVision || c.headache) {
    const what = [c.blurredNearVision ? 'new blurred near vision' : null, c.headache ? 'headache' : null].filter(Boolean).join(' and ')
    rows.push({
      tier: 2,
      tierName: 'Tier 2, crew medical officer',
      severity: 'caution',
      whoActs: 'crew medical officer',
      readout: 'Symptoms (app checklist, not a model output)',
      trigger: `Symptom checklist: ${what}`,
      actions: [
        'Pull the onboard SANS exam forward (OCT, fundus photo, ocular ultrasound, tonometry, visual acuity / Amsler) instead of waiting for the scheduled one',
        'Downlink the results',
      ],
      ourRule: false,
      sources: [SRC.act2, SRC.brunstetter],
    })
  }
  if ((c.discEdemaFrisenGrade ?? 0) >= 1) {
    rows.push({
      tier: 3,
      tierName: 'Tier 3, flight surgeon',
      severity: 'warning',
      whoActs: 'flight surgeon',
      readout: 'Exam result (not a model output)',
      trigger: `Optic disc edema, Frisen grade ${c.discEdemaFrisenGrade} (>= 1, the NASA SANS finding)`,
      actions: [
        'Grade it',
        'Escalate countermeasures (longer nightly LBNP; the UT Southwestern LBNP sleeping bag cut choroid swelling in a 3-day bed-rest model)',
        'Refractive correction',
        'Acetazolamide/topiramate only as a last resort, no consensus',
      ],
      ourRule: false,
      sources: [SRC.hearon2022, SRC.lawley2020, SRC.eye2026],
    })
  }
  return rows
}

const SEV_ORDER: Severity[] = ['nominal', 'watch', 'caution', 'warning', 'critical']

/** The "what to do next" decision for a result, optionally combined with crew inputs (checklist, exam, PVS band). */
export function decide(result: BrainDriftResult | null, crew: CrewInputs = {}): BrainDriftAct {
  const rows: ActRow[] = []
  if (result?.kind === 'pvs') rows.push(...pvsRows(result.modelBand, result.modelMm3, 'Model A, precomputed'))
  else if (crew.pvsBand) rows.push(...pvsRows(crew.pvsBand, null, 'crew input'))
  if (result?.kind === 'flight') {
    rows.push(...ventricleRows(result.measured.ventricleChangePct))
    rows.push(...riseRows(result.measured.riseMm))
  }
  rows.push(...crewRows(crew))

  const caveats = [...ACT_CAVEATS]
  if (result?.kind === 'flight') {
    caveats.unshift('SIMULATION: the pre/post pair is a real held-out brain warped by two published numbers from two different cohorts; it is not flight data.')
    if (!result.citedNumbers) caveats.unshift('This frame is interpolated for illustration, not a measured time course.')
  }
  if (result?.kind === 'brainmap') {
    caveats.unshift('A single scan has no ACT trigger: ventricle change and vertex rise need a pre and a post scan of the same brain.')
  }

  const fired = rows.filter((r) => r.tier > 0)
  if (!fired.length) {
    const base = rows[0]
    return {
      tier: 0,
      tierName: base?.tierName ?? 'No flag',
      severity: 'nominal',
      whoActs: base?.whoActs ?? 'self',
      headline: base ? base.actions[0] : 'No ACT trigger for this result.',
      actions: rows.flatMap((r) => r.actions),
      trigger: rows.length ? rows.map((r) => r.trigger).join('; ') : 'No readout that feeds a section-9 row.',
      ourRule: rows.some((r) => r.ourRule),
      sources: dedupe(rows.flatMap((r) => r.sources)),
      caveats,
      rows,
    }
  }
  // primary = most severe; ties go to the lower tier number (who acts first)
  const primary = [...fired].sort((a, b) => SEV_ORDER.indexOf(b.severity) - SEV_ORDER.indexOf(a.severity) || a.tier - b.tier)[0]
  return {
    tier: primary.tier,
    tierName: primary.tierName,
    severity: primary.severity,
    whoActs: primary.whoActs,
    headline: `${primary.tierName}: ${primary.actions[0]}`,
    actions: fired.flatMap((r) => r.actions.map((a) => `${r.tierName}: ${a}`)),
    trigger: fired.map((r) => r.trigger).join('; '),
    ourRule: fired.some((r) => r.ourRule),
    sources: dedupe(fired.flatMap((r) => r.sources)),
    caveats,
    rows,
  }
}

function dedupe(s: Source[]): Source[] {
  const seen = new Set<string>()
  return s.filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true)))
}

// BubbleGrade ACT decision: plans/02_BubbleGrade.md §9 and work/App/SCREENS.md §2.5, verbatim.
// Tier actions are copied from research/materialhunt/act_6.md with its sources. The grade-to-tier mapping is our
// app's logic (act_6 says so). The highest triggered tier wins.
import type { ActDecision, Severity, Source } from '../types'
import { GRADES, TAU } from './constants'

export const SYMPTOMS_TYPE_I = ['joint or muscle pain', 'itching', 'mild rash'] as const
export const SYMPTOMS_TYPE_II = [
  'numbness',
  'weakness',
  'cognitive problems',
  'inner-ear problems',
  'cough or shortness of breath',
  'mottled skin',
] as const
export const BTA_UNRESOLVED = 'symptoms do not resolve with BTA pressure'

export type SymptomTypeI = (typeof SYMPTOMS_TYPE_I)[number]
export type SymptomTypeII = (typeof SYMPTOMS_TYPE_II)[number]

/** What the crew ticks on the symptom checklist. */
export interface CrewInputs {
  typeI?: SymptomTypeI[]
  typeII?: SymptomTypeII[]
  /** "symptoms do not resolve with BTA pressure" */
  unresolvedWithBTA?: boolean
}

/** The model numbers the card reads (plan §9: g, A with tau, P4). */
export interface ActModelInputs {
  /** Predicted grade 0..4 (how many clip-level P(>= k) exceed 0.5). */
  g: number
  /** Spacewalk alert probability A = mean P(grade >= III). */
  A: number
  /** P4 = mean P(grade >= IV). */
  P4: number
}

export const S: Record<string, Source> = {
  ochmo: { label: 'OCHMO-TB-037', ref: 'NASA OCHMO-TB-037 Rev D, Decompression Sickness (DCS) Risk Mitigation. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf' },
  conkin2017: { label: 'Conkin et al. 2017', ref: 'Conkin et al. 2017, DCS and VGE after ambulation at 4.3 psia. https://www.nasa.gov/wp-content/uploads/2023/03/conkin-dcs-vge-ambulation-2017.pdf' },
  wg2026: { label: 'NASA OCHMO DCS/VTE/PFO working group 2026', ref: 'NASA OCHMO, Risks of DCS and VTE during Spaceflight and PFO Implications. https://www.nasa.gov/organizations/ochmo/risks-of-decompression-sickness-and-venous-thromboembolism-during-spaceflight-and-patent-foramen-ovale-implications/' },
  eat34: { label: 'NASA Exploration Atmosphere Tests 3 & 4 (NTRS 20240013238)', ref: 'Garbino et al., NASA Exploration Atmosphere Tests 3 & 4. https://ntrs.nasa.gov/citations/20240013238' },
  ntrs20140012830: { label: 'NTRS 20140012830', ref: 'Conkin et al., 8.2 psia / 34% O2 prebreathe validation proposal (grade IV acceptance limit). https://ntrs.nasa.gov/citations/20140012830' },
  gernhardt2013: { label: 'Gernhardt et al. 2013 ch. 5.4', ref: 'Gernhardt, Dervay, Waligora, Fitzpatrick, Conkin (2013), Extravehicular Activities, ch. 5.4, Principles of Clinical Medicine for Space Flight. https://nasa.gov/wp-content/uploads/2023/03/gernhardt-eva-ops-chp-5.4-2013.pdf' },
  emu: { label: 'EMU Hardware Data Book Rev V', ref: 'NASA EMU Hardware Data Book Rev V (Bends Treatment Adapter, Item 491). https://www.nasa.gov/wp-content/uploads/2017/02/esoc-13_rev._v_emu_hardware_data_book_jsc-e-daa-tn55224.pdf' },
  dan: { label: 'US Navy Diving Manual via DAN', ref: 'DAN / Alert Diver, US Navy Treatment Table 6. https://alertdiver.eu/en_US/articles/relieving-the-pressure/' },
}

/** Fixed honesty lines (verbatim, plan §8.3, §9, §11 and SCREENS §2.2). */
export const HONESTY = {
  card: 'A bubble is a warning; symptoms are the diagnosis.',
  bubbleMap: 'where the model heard bubble-like sound (model attention, not measured bubble times)',
  footer: 'Example clips chosen as clear cases; full results on 6,826 clips are in the panels.',
  context: 'NASA does not use Doppler on astronauts during real spacewalks today; it is used in ground chamber trials.',
  tooShort: 'needs at least 5 seconds of Doppler audio',
  precomputed: 'precomputed by the same model',
} as const

const TIER_NAMES = [
  '0 Green: continue',
  '1 Amber: SPACEWALK ALERT',
  '2 Red: end the EVA (Crew Medical Officer + Mission Control)',
  '3 Flight surgeon / evacuation',
] as const

const TIER: {
  severity: Severity
  whoActs: string
  headline: string
  actions: string[]
  sources: Source[]
  sourceNote: string
}[] = [
  {
    severity: 'nominal',
    whoActs: 'self',
    headline: 'Continue the EVA.',
    actions: [
      'Continue the EVA.',
      'Keep drinking from the in-suit drink bag.',
      'Do not take painkillers to push through joint aches (they can mask DCS).',
    ],
    sources: [S.conkin2017, S.ochmo, S.wg2026],
    sourceNote:
      'Mapping: our product rule. Grade 0 has about 98% negative predictive value (Conkin et al. 2017). Hydration: OCHMO-TB-037. Painkillers: NASA OCHMO DCS/VTE/PFO working group 2026',
  },
  {
    severity: 'caution',
    whoActs: 'self, reporting to the IV crewmember / Mission Control',
    headline: 'Cut lower-body workload, report, re-grade every 15 min.',
    actions: [
      'Cut lower-body workload (leg-heavy work and walking grow bubbles).',
      'Report to the IV crewmember / Mission Control.',
      'Re-grade every 15 min.',
    ],
    sources: [S.ochmo, S.conkin2017, S.eat34],
    sourceNote:
      'tau = highest threshold flagging >= 90% of grade III-IV validation clips: our product rule. Workload lever: OCHMO-TB-037; walking raised VGE: Conkin 2017; 15-min cadence: NASA Exploration Atmosphere Tests 3 & 4 (NTRS 20240013238)',
  },
  {
    severity: 'warning',
    whoActs: 'crew medical officer + Mission Control',
    headline: 'End the EVA and return to the airlock.',
    actions: [
      'Report a "cuff class" DCS number from the forearm checklist.',
      'Terminate the EVA, safe the worksite, return to the airlock.',
      'During repress keep the suit 4.3 psi above cabin on 100% O2.',
      'If symptoms persist: Bends Treatment Adapter, 7.5-8.0 psi above cabin, O2 up to 2 h after symptoms resolve.',
      'The CMO runs the NASA DCS neuro exam.',
      'After suit-off: fluids (12.1 L of saline aboard ISS) and O2 by mask.',
      'Next EVA: longer prebreathe.',
    ],
    sources: [S.ntrs20140012830, S.conkin2017, S.gernhardt2013, S.emu, S.ochmo],
    sourceNote:
      "P4 >= 0.5 as the trigger: our product rule, anchored to NASA's <= 20% grade IV acceptance limit (NTRS 20140012830) and grade IV's ~50% positive predictive value (Conkin 2017). Actions: Gernhardt et al. 2013 ch. 5.4; EMU Hardware Data Book Rev V; OCHMO-TB-037",
  },
  {
    severity: 'critical',
    whoActs: 'flight surgeon',
    headline: 'Deorbit to a designated hyperbaric care site.',
    actions: [
      'Deorbit to a designated hyperbaric care site per flight rules; on Earth, US Navy Treatment Table 6.',
      'No EVA until the NASA Aerospace Medical Board clears the crewmember.',
    ],
    sources: [S.ochmo, S.gernhardt2013, S.dan],
    sourceNote:
      'Symptom-triggered, not model-triggered. Symptom lists: OCHMO-TB-037. Actions: Gernhardt 2013; OCHMO-TB-037; US Navy Diving Manual via DAN',
  },
]

export const INFO_CARD = {
  title: 'After any DCS event',
  lines: [
    '1 Type I episode resolved by repress: another EVA possible within 72 h.',
    '2 Type I episodes on one mission: no EVA until Earth.',
    'Any Type II: no EVA until Board clearance.',
  ],
  sources: [S.gernhardt2013],
}

/** One rule that fired, so a screen can show every reason, not only the winning one. */
export interface Trigger {
  tier: number
  what: string
  /** True when this trigger's threshold is our own product rule, not a cited standard. */
  ourRule: boolean
}

export interface BubbleActDecision extends ActDecision {
  /** Every trigger that fired (highest tier wins). */
  triggers: Trigger[]
  /** The plan's source column for the winning tier, verbatim. */
  sourceNote: string
  /** Shown after tier 2 or 3 (plan §9). */
  infoCard?: typeof INFO_CARD
  /** The tau the alert was compared with. */
  tau: number
}

const fmt = (x: number) => (x < 0.001 ? x.toExponential(1) : x.toFixed(3))

/** Plan §9 (row A, the shipped row): the highest triggered tier wins. */
export function decide(m: ActModelInputs, crew: CrewInputs = {}, tau = TAU): BubbleActDecision {
  const t1 = crew.typeI ?? []
  const t2 = crew.typeII ?? []
  const triggers: Trigger[] = []
  if (t2.length) triggers.push({ tier: 3, what: `Type II symptom ticked: ${t2.join(', ')}`, ourRule: false })
  if (crew.unresolvedWithBTA) triggers.push({ tier: 3, what: `ticked: ${BTA_UNRESOLVED}`, ourRule: false })
  if (m.P4 >= 0.5) triggers.push({ tier: 2, what: `P(grade >= IV) = ${fmt(m.P4)} >= 0.5 (grade IV more likely than not)`, ourRule: true })
  if (t1.length) triggers.push({ tier: 2, what: `Type I symptom ticked: ${t1.join(', ')}`, ourRule: false })
  if (m.A >= tau) triggers.push({ tier: 1, what: `spacewalk alert: P(grade >= III) = ${fmt(m.A)} >= tau ${fmt(tau)}`, ourRule: true })
  if (m.g === 2 || m.g === 3) triggers.push({ tier: 1, what: `predicted grade ${GRADES[m.g]}`, ourRule: true })
  if (!triggers.length)
    triggers.push({ tier: 0, what: `predicted grade ${GRADES[m.g]} (<= I), P(grade >= III) = ${fmt(m.A)} < tau ${fmt(tau)}, no symptoms ticked`, ourRule: true })
  const tier = Math.max(...triggers.map((t) => t.tier))
  const fired = triggers.filter((t) => t.tier === tier)
  const d = TIER[tier]
  return {
    tier,
    tierName: TIER_NAMES[tier],
    severity: d.severity,
    whoActs: d.whoActs,
    headline: d.headline,
    actions: d.actions,
    trigger: fired.map((t) => t.what).join('; '),
    ourRule: fired.some((t) => t.ourRule),
    sources: d.sources,
    sourceNote: d.sourceNote,
    caveats: [HONESTY.card, 'The grade-to-tier mapping is our app\'s logic, not a NASA standard.', HONESTY.context],
    triggers,
    infoCard: tier >= 2 ? INFO_CARD : undefined,
    tau,
  }
}

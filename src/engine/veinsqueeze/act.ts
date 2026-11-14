// VeinSqueeze ACT card: plan §9 (plans/04_VeinSqueeze.md) with the L3 PDF-check outcome
// (work/VeinSqueeze/verify_chunk_7.md): serial-scan interval cut, RED neuro trigger = headache + (focal deficit
// OR new seizure), "early return" and "signs of pulmonary embolism" labelled our product rule.
import type { Severity, Source } from '../types'
import { HONESTY_ACT, MEASURED, SRC } from './honesty'
import type { ActOptions, CrewInputs, FiredTrigger, ScoreItem, SymptomKey, VsActDecision, VsResult } from './types'

export const SYMPTOM_LABEL: Record<SymptomKey, string> = {
  persistentHeadache: 'persistent headache',
  focalNeuroDeficit: 'focal neurological deficit',
  newSeizure: 'new seizure',
  faceEyelidSwelling: 'face or eyelid swelling beyond normal space puffiness',
  nasalCongestion: 'nasal congestion',
  hearingLoss: 'hearing loss',
  facialAsymmetry: 'facial asymmetry',
  gripAsymmetry: 'grip-strength asymmetry',
  alteredMentalStatus: 'altered mental status',
  neckVeinSwelling: 'neck-vein swelling',
  peSigns: 'signs of pulmonary embolism',
}

/** Symptoms of the in-flight case listed in SP-2026 p. 29; with the AI flag any one of them triggers RED. */
const RED_WITH_AI: SymptomKey[] = [
  'persistentHeadache',
  'faceEyelidSwelling',
  'nasalCongestion',
  'hearingLoss',
  'facialAsymmetry',
  'gripAsymmetry',
  'alteredMentalStatus',
]

export const TIERS = [
  { tier: 0, tierName: 'GREEN, self-care', severity: 'nominal', whoActs: 'self' },
  { tier: 1, tierName: 'GREEN, increased monitoring', severity: 'watch', whoActs: 'self' },
  { tier: 2, tierName: 'YELLOW, crew medical officer', severity: 'caution', whoActs: 'crew medical officer' },
  { tier: 3, tierName: 'ORANGE, flight surgeon', severity: 'warning', whoActs: 'flight surgeon' },
  { tier: 4, tierName: 'RED, emergency / ground-directed', severity: 'critical', whoActs: 'flight surgeon and ground team' },
] as const satisfies readonly { tier: number; tierName: string; severity: Severity; whoActs: string }[]

const SELF_CARE = [
  "Self-scan the neck vein on NASA's schedule: flight day 30, flight day 60 and 6 weeks before return.",
  'Drink enough water.',
  'Log neck-vein swelling, face or eyelid swelling beyond normal space puffiness, and headache.',
]

const ACTIONS: Record<number, { headline: string; actions: string[]; sources: Source[] }> = {
  0: {
    headline: 'Keep the routine: scan on schedule, hydrate, log symptoms.',
    actions: SELF_CARE,
    sources: [SRC.sp2026('p. 25'), SRC.sp2025('p. 23, p. 27, p. 28')],
  },
  1: {
    headline: 'Monitor more closely: rescan in 14 days (our product rule).',
    actions: [
      ...SELF_CARE,
      "Rescan sooner: in 14 days (our product rule; NASA says 'increased monitoring' without an interval).",
      'Optional LBNP session (lower body negative pressure): improved jugular flow in 10 of 17 sessions in 2019; it can cause fainting, so use it with medical monitoring.',
    ],
    sources: [SRC.sp2026('p. 5, p. 25'), SRC.jama2019, SRC.ourRule('14-day rescan')],
  },
  2: {
    headline: 'Crew medical officer repeats the scan and uplinks it.',
    actions: [
      'The crew medical officer repeats the scan and the compression test and uplinks the clip to the ground.',
      'If confirmed: preventive apixaban 2.5 mg twice daily per NASA protocol; the flight surgeon approves.',
      'Stop it 24 h before a high-risk EVA and 48 h before landing.',
    ],
    sources: [SRC.sp2026('p. 5, p. 8'), SRC.sp2025('p. 28')],
  },
  3: {
    headline: 'Possible clot: repeat the compression scan now and uplink to ground radiologists.',
    actions: [
      'Repeat the compression scan of the same vein now and uplink it to ground radiologists (in 2019, two independent radiologists confirmed the clot).',
      'If confirmed: treatment-dose anticoagulation per NASA protocol (apixaban 10 mg twice daily for 7 days, then 5 mg twice daily; or enoxaparin).',
      'Reduce exercise intensity; no shoulder harness on the T2 treadmill.',
      'Consider delaying EVAs.',
      'Serial ultrasounds read by radiologists on the ground.',
      'Stop the anticoagulant 48 h before landing.',
    ],
    sources: [SRC.sp2025('p. 23, p. 27, p. 28'), SRC.sp2026('p. 8'), SRC.jama2019],
  },
  4: {
    headline: 'Emergency: the flight surgeon directs care now.',
    actions: [
      'The flight surgeon directs care.',
      "The ISS cannot image the brain's venous sinuses (that needs MR or CT venography).",
      'Early return to Earth for imaging if it cannot be managed on board (our product rule).',
    ],
    sources: [SRC.sp2026('p. 29-31'), SRC.sp2025('p. 27'), SRC.ourRule('early return')],
  },
}

/** NASA VTE score from crew inputs (SP-2026 p. 5). Family history, thrombophilia and hormones are not scored (plan §9). */
export function vteScore(crew: CrewInputs = {}): { score: number; band: string; items: ScoreItem[]; notEntered: string[] } {
  const p5 = SRC.sp2026('p. 5')
  const items: ScoreItem[] = []
  const notEntered: string[] = []
  const fg = crew.flowGrade
  items.push({
    label: 'Stasis or retrograde neck-vein flow (flow grade 3 or 4)',
    points: fg === 3 || fg === 4 ? 4 : 0,
    entered: fg !== undefined,
    source: p5,
  })
  if (fg === undefined) notEntered.push('flow grade')
  const age = crew.ageBand
  items.push({ label: 'Age over 40 (+1) / over 50 (+2)', points: age === 'over 50' ? 2 : age === '41-50' ? 1 : 0, entered: age !== undefined, source: p5 })
  if (age === undefined) notEntered.push('age band')
  items.push({ label: 'Non-O blood type', points: crew.bloodType === 'non-O' ? 1 : 0, entered: crew.bloodType !== undefined, source: p5 })
  if (crew.bloodType === undefined) notEntered.push('blood type')
  items.push({
    label: 'D-dimer rise of 60% or more over the in-flight baseline',
    points: crew.ddimerRise60 ? 2 : 0,
    entered: crew.ddimerRise60 !== undefined,
    source: p5,
    note: 'A 2026 NASA proposal, not routine practice (NASA/SP-20260005258/REV1, p. 7).',
  })
  if (crew.ddimerRise60 === undefined) notEntered.push('D-dimer')
  const score = items.reduce((s, i) => s + i.points, 0)
  const band =
    score <= 1
      ? '1 point or less = no additional action'
      : score <= 3
        ? '2-3 points = increased monitoring'
        : score <= 6
          ? '4-6 points = prophylactic apixaban'
          : 'more than 6 points = clinical assessment'
  return { score, band, items, notEntered }
}

/**
 * The module's "what to do next". The highest triggered tier wins. With aiInput 'model' the AI flag is
 * clotProb >= tau (our product rule, screening only); with 'expert' the shipped expert label drives it instead
 * (plan §9 "what the crew would do" mode, for demos); with 'none' only crew inputs count.
 */
export function act(result: VsResult | null, crew: CrewInputs = {}, opts: ActOptions = {}): VsActDecision {
  const aiInput = opts.aiInput ?? (result ? 'model' : 'none')
  let aiFlag = false
  let aiLabel = 'no scan result used'
  if (aiInput === 'model' && result) {
    aiFlag = result.clotProb >= result.tau
    aiLabel = `AI second opinion (screening only): ${(result.clotProb * 100).toFixed(1)}% chance of clot, ${aiFlag ? 'at or above' : 'below'} the ${(result.tau * 100).toFixed(2)}% alarm threshold (our product rule)`
  } else if (aiInput === 'expert') {
    if (!result?.expert) throw new Error('aiInput "expert" needs a shipped sample with an expert label')
    aiFlag = result.expert.thrombosis === 1
    aiLabel = `Expert label (ThrombUS+ annotation), not the AI: ${aiFlag ? 'clot' : 'no clot'}`
  }
  const s = crew.symptoms ?? {}
  const { score, band, items, notEntered } = vteScore(crew)
  const p5 = SRC.sp2026('p. 5')
  const fired: FiredTrigger[] = []
  const aiWord = aiInput === 'expert' ? 'expert label: clot' : 'AI flag (clot chance at or above our alarm threshold, screening only)'

  if (s.persistentHeadache && (s.focalNeuroDeficit || s.newSeizure))
    fired.push({
      tier: 4,
      text: `Headache with ${s.focalNeuroDeficit ? 'a focal neurological deficit' : 'a new seizure'}: consider a brain venous-sinus clot.`,
      ourRule: false,
      sources: [SRC.sp2026('p. 31')],
    })
  const redSyms = RED_WITH_AI.filter((k) => s[k])
  if (aiFlag && redSyms.length)
    fired.push({
      tier: 4,
      text: `${aiWord} plus ${redSyms.map((k) => SYMPTOM_LABEL[k]).join(', ')}.`,
      ourRule: aiInput === 'model',
      sources: [SRC.sp2026('p. 29'), ...(aiInput === 'model' ? [SRC.ourRule('alarm threshold tau')] : [])],
    })
  if (s.peSigns)
    fired.push({ tier: 4, text: 'Signs of pulmonary embolism.', ourRule: true, sources: [SRC.ourRule('pulmonary-embolism trigger')] })
  if (aiFlag)
    fired.push({
      tier: 3,
      text: `Possible clot: vein not compressing (${aiWord}).`,
      ourRule: aiInput === 'model',
      sources: [SRC.sp2025('p. 27'), ...(aiInput === 'model' ? [SRC.ourRule('alarm threshold tau')] : [])],
    })
  if (score > 6) fired.push({ tier: 3, text: `NASA VTE score ${score} (more than 6 = clinical assessment).`, ourRule: false, sources: [p5] })
  if (score >= 4 && score <= 6) fired.push({ tier: 2, text: `NASA VTE score ${score} (4-6 = prophylactic apixaban).`, ourRule: false, sources: [p5] })
  if (score >= 2 && score <= 3) fired.push({ tier: 1, text: `NASA VTE score ${score} (2-3 = increased monitoring).`, ourRule: false, sources: [p5] })
  if (!fired.length)
    fired.push({
      tier: 0,
      text: `NASA VTE score ${score} (1 point or less = no additional action; 0 points treated the same is our reading)${aiInput === 'none' ? '' : ' and no clot flag'}.`,
      ourRule: aiInput === 'model',
      sources: [p5, ...(aiInput === 'model' ? [SRC.ourRule('alarm threshold tau')] : [])],
    })

  const tier = Math.max(...fired.map((f) => f.tier))
  const t = TIERS[tier]
  const winning = fired.filter((f) => f.tier === tier)
  const a = ACTIONS[tier]
  const squeeze = result?.squeeze
  const caveats: string[] = [...HONESTY_ACT]
  if (aiInput === 'model')
    caveats.push(
      `Alarm threshold ${(MEASURED.tau * 100).toFixed(2)}% (our product rule): on held-out patients it catches ${Math.round(MEASURED.tauFold0Sensitivity * 100)}% of clot clips at specificity ${MEASURED.tauFold0Specificity.toFixed(2)}.`,
    )
  if (aiInput === 'expert') caveats.push('Demo mode: the expert label stands in for the AI ("what the crew would do").')
  if (crew.ddimerRise60 !== undefined) caveats.push('D-dimer item: a 2026 NASA proposal, not routine practice.')
  if (tier >= 2) caveats.push('Doses are shown as NASA writes them, per NASA protocol; the flight surgeon decides.')

  return {
    tier,
    tierName: t.tierName,
    severity: t.severity,
    whoActs: t.whoActs,
    headline: a.headline,
    actions: a.actions,
    trigger: winning.map((f) => f.text).join(' '),
    ourRule: winning.some((f) => f.ourRule) || tier === 1,
    sources: dedupe([...winning.flatMap((f) => f.sources), ...a.sources]),
    caveats,
    score,
    scoreBand: band,
    scoreItems: items,
    aiInput,
    aiFlag,
    aiLabel,
    fired,
    squeezeEvidence: squeeze
      ? `Squeeze curve (SAM 2, supporting evidence only): lowest ${squeeze.rMin.toFixed(0)}% of start at ${squeeze.tMinS.toFixed(1)} s = "${squeeze.band}" (our product rule).`
      : null,
    notEntered,
  }
}

function dedupe(src: Source[]): Source[] {
  const seen = new Set<string>()
  return src.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
}

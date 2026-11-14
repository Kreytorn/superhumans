// "What to do next" for Garn Meter: plan 06 section 9 and SCREENS section 6.5, Tier C (section 10).
import type { Severity, Source } from '../types'
import type { GarnAct, GarnCrewInputs, GarnResult, ZoneIndex } from './result'
import { ZONE_NAMES } from './result'

export const SOURCES = {
  stevenson: {
    label: 'Stevenson, NASA JSC oral history (folklore, not a clinical scale)',
    ref: 'NASA JSC oral history of Robert E. Stevenson, quoted at https://en.wikipedia.org/wiki/Space_adaptation_syndrome; checked in research/materialhunt/verify/chunk_3.md',
  },
  cdms: {
    label: 'Uyan & Celikcan 2024, CDMS closed loop',
    ref: 'Displays 2024, DOI 10.1016/j.displa.2024.102704; https://graphics.cs.hacettepe.edu.tr/CDMS/ (via research/materialhunt/datasets/rank12.md)',
  },
  headMovement: {
    label: 'Slow head movements: our product rule',
    ref: 'Listed among sensorimotor countermeasures in research/03 section 6, no primary source attached',
  },
  ochmo: {
    label: 'NASA OCHMO-MTB-004, Space Adaptation Sickness',
    ref: 'https://www.nasa.gov/wp-content/uploads/2025/09/ochmo-mtb-004-space-adaptation-sickness-sas.pdf (via research/06 section 3.17)',
  },
  hsrb: {
    label: 'NASA HSRB urinary-retention risk record',
    ref: 'https://www.nasa.gov/wp-content/uploads/2025/09/hsrb-urinary-retention-risk-risk-record-web.pdf (via research/03, Urinary Retention row)',
  },
  medprat: {
    label: 'NASA MEDPRAT/IMM Clinical Finding Form ICL97',
    ref: 'NASA MEDPRAT/IMM Clinical Finding Form "ICL97 Space Adaptation - Space Motion Sickness"; checked in research/materialhunt/verify/chunk_3.md',
  },
} satisfies Record<string, Source>

/** Fixed honesty strings (verbatim from plan 06 sections 8-11, SCREENS section 6, LOG final summary). */
export const STRINGS = {
  personLabel: 'Test person USER19, session 3',
  eegLine: 'experimental EEG estimate, AUROC 0.54 on new people, not used for alerts',
  precomputedLabel: 'precomputed by the same model',
  playback: 'Trials play back to back; in the real session they started about 12 s apart, because the rating was spoken in between.',
  couplingCaption: "Model coupling: correlation of the model's learned per-channel features, compared with calibration. Not brain connectivity.",
  garnDefinition: "Garns are our translation of the study's 1-7 discomfort score: (score − 1) / 6.",
  greenCaption: "NASA's Robert Stevenson: most flyers get to maybe a tenth of a Garn",
  context: 'About 7 in 10 shuttle-era flyers (419 of 588 person-missions) had space motion sickness; it usually fades within 3-4 days.',
  tierC: 'Tier C: only the check-in drives the zones (green = IDS 1, yellow = IDS 2-3, red = IDS ≥ 4). Our product rule.',
  neverDoses: 'The app suggests; it never doses.',
  groundAnalog: 'Trained on VR-sickness EEG from a study at Hacettepe University (a ground analog). Not tested on astronauts, in microgravity or on space motion sickness itself.',
} as const

const SEVERITY: Record<ZoneIndex, Severity> = { 0: 'nominal', 1: 'watch', 2: 'warning' }

/** Check-in zone, Tier C table: IDS 1 green, 2-3 yellow, >= 4 red (our product rule). */
export function checkinZone(ids: number | null): ZoneIndex | null {
  if (ids === null || !Number.isFinite(ids)) return null
  return ids >= 4 ? 2 : ids >= 2 ? 1 : 0
}

export function decide(result: GarnResult, crew: GarnCrewInputs = {}): GarnAct {
  const analysed = result.trials.filter((t) => t.windowRange[1] > t.windowRange[0])
  const at = crew.atTrial ?? (analysed.length ? analysed[analysed.length - 1].index : undefined)
  const trial = at !== undefined ? result.trials.find((t) => t.index === at) : undefined
  let ids: number | null = null
  let checkinSource: GarnAct['checkinSource'] = 'none'
  if (crew.checkinIds !== undefined) {
    ids = Math.min(7, Math.max(1, Math.round(crew.checkinIds)))
    checkinSource = 'crew'
  } else if (trial) {
    ids = trial.ids
    checkinSource = 'replay'
  }
  const cz = checkinZone(ids)
  // EEG state at the end of that trial; none if that trial was not analysed; the last window when there are no trials (own signal).
  const lastW = trial
    ? trial.windowRange[1] > trial.windowRange[0]
      ? result.windows[trial.windowRange[1] - 1]
      : undefined
    : result.windows[result.windows.length - 1]
  const eegZone = lastW ? lastW.eegZone : null
  const eegDrives = result.tier !== 'C'
  // Tier A/B: the higher of the two. Tier C: the check-in only.
  const zone = (eegDrives ? Math.max(cz ?? 0, eegZone ?? 0) : (cz ?? 0)) as ZoneIndex
  const gy = result.cutoffs.G_y.toFixed(3)
  const gr = result.cutoffs.G_r.toFixed(3)

  const checkinText = ids === null ? 'No check-in yet' : `Check-in IDS ${ids} (${((ids - 1) / 6).toFixed(2)} Garn)${checkinSource === 'replay' ? ` reported after trial ${trial?.index}` : ''}`
  const eegText = lastW
    ? `EEG estimate ${lastW.garnEma.toFixed(3)} Garn smoothed (cut-offs ${gy} / ${gr}); ${eegDrives ? 'drives the zone with the hold' : 'reported only, not used for alerts'}`
    : 'no EEG window'
  const caveats: string[] = [STRINGS.eegLine, STRINGS.tierC, STRINGS.garnDefinition, STRINGS.groundAnalog]
  const base = { zone: ZONE_NAMES[zone], checkinIds: ids, checkinSource, checkinZone: cz, eeg: { garnEma: lastW?.garnEma ?? null, zone: eegZone, drivesZone: eegDrives }, ourRule: true }

  if (zone === 0) {
    return {
      ...base,
      tier: 0,
      tierName: 'Green',
      severity: SEVERITY[0],
      whoActs: 'no one (keep logging)',
      headline: 'Keep logging.',
      actions: ['Keep logging.'],
      trigger: `${checkinText}${ids === null ? '' : ': IDS 1 is green'}. ${eegText}.`,
      sources: [SOURCES.stevenson],
      caveats: [STRINGS.greenCaption, ...caveats],
    }
  }
  if (zone === 1) {
    const task =
      crew.screenTaskRunning === false
        ? null
        : crew.screenTaskRunning
          ? 'Pause the screen or VR task, or lower its visual motion (speed, stereo depth, scene complexity).'
          : 'If a screen or VR task is running, pause it or lower its visual motion (speed, stereo depth, scene complexity).'
    return {
      ...base,
      tier: 1,
      tierName: 'Yellow',
      severity: SEVERITY[1],
      whoActs: 'astronaut (self-care)',
      headline: 'Self-care: confirm with a check-in, ease the visual motion, move the head slowly.',
      actions: ['Prompt a 1-tap check-in (IDS 1-7) that confirms or overrides the EEG.', ...(task ? [task] : []), 'Keep head movements slow.'],
      trigger: `${checkinText}: IDS 2-3 is yellow. ${eegText}.`,
      sources: [SOURCES.cdms, SOURCES.headMovement],
      caveats,
    }
  }
  return {
    ...base,
    tier: 2,
    tierName: 'Red',
    severity: SEVERITY[2],
    whoActs: 'crew medical officer and flight surgeon',
    headline: 'Notify the crew medical officer.',
    actions: [
      'Notify the crew medical officer (CMO) with the Garn trace and the check-ins.',
      'The CMO decides on anti-nausea medication. Promethazine is NASA\'s treatment ("up to 90% initial response"). The app suggests; it never doses.',
      'Flag "no EVA scheduling while red". NASA already schedules EVAs after 72 h.',
      crew.promethazineGiven
        ? 'Promethazine was given: check for urinary retention (promethazine triples the risk).'
        : 'If promethazine is given, add a reminder to check for urinary retention.',
    ],
    trigger: `${checkinText}: IDS ≥ 4 is red. ${eegText}.`,
    sources: [SOURCES.ochmo, SOURCES.hsrb],
    caveats: [STRINGS.neverDoses, ...caveats],
  }
}

/** One decision after every analysed trial's rating, in order (for scrubbing the session). */
export function decideTimeline(result: GarnResult, crew: Omit<GarnCrewInputs, 'atTrial' | 'checkinIds'> = {}): GarnAct[] {
  return result.trials.filter((t) => t.windowRange[1] > t.windowRange[0]).map((t) => decide(result, { ...crew, atTrial: t.index }))
}

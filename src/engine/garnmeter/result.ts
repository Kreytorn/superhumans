// Result types of the Garn Meter engine. Everything here is plain data a screen can draw.
import type { ActDecision, Timing } from '../types'

/** Zone index: 0 = green, 1 = yellow, 2 = red (plan 06 section 9). */
export type ZoneIndex = 0 | 1 | 2
export type ZoneName = 'Green' | 'Yellow' | 'Red'
export const ZONE_NAMES: readonly ZoneName[] = ['Green', 'Yellow', 'Red']

export type Cue = 'Complexity' | 'Speed' | 'Stereo'

/** One trial (one VR scene) of the demo session, with the person's own rating after it. */
export interface GarnTrial {
  /** 1-based position in the session, in the order shown. */
  index: number
  cue: Cue
  level: number
  /** The study's 1-7 discomfort score the person reported after this trial (IDS). */
  ids: number
  /** Reported Garn = (IDS - 1) / 6 (our product rule). */
  garnReported: number
  /** Absolute start sample of the trial in the session signal (128 Hz). */
  start: number
  /** Samples in the trial (1,024 = 8 s). */
  length: number
  /** Indices into result.windows: [first, last + 1). Empty for trials outside the analysed range. */
  windowRange: [number, number]
  /** Mean of the model's raw garn over this trial's windows (null when the trial was not analysed). */
  modelGarnMean: number | null
}

/** One 4 s window the model scored. */
export interface GarnWindow {
  /** Position in result.windows. */
  index: number
  /** 1-based trial index. */
  trial: number
  /** Window end, seconds from the trial start (4.0, 4.5, ... 8.0 in the standard replay). */
  endS: number
  /** Absolute first sample of the window in the session signal. */
  startSample: number
  /** Model output: P(IDS >= 2), P(IDS >= 3), P(IDS >= 5); monotone. */
  pCum: [number, number, number]
  /** P(IDS >= 2) = pCum[0]. */
  pSick: number
  /** Bin probabilities derived from pCum: {IDS 1}, {IDS 2}, {IDS 3-4}, {IDS 5-7}. */
  pBins: [number, number, number, number]
  /** Model output: expected Garn, 0-1. */
  garn: number
  /** garn smoothed with an exponential moving average, alpha 0.3, over the analysed windows in order. */
  garnEma: number
  /** Zone the EEG estimate alone would give (smoothed garn, cut-offs, 4-up / 8-down hold). Tier C: reported only, never an alert. */
  eegZone: ZoneIndex
  /** Model output: 14 x 14 coupling, row-major (196 values). Hidden in the app in Tier C (plan 06 section 10). */
  coupling: Float32Array
  /** Measurement, not model output: theta (4-8 Hz) log10 relative power minus baseline, per channel. Null for user input. */
  theta: number[] | null
  /** Measurement, not model output: gamma (30-45 Hz) log10 relative power minus baseline, per channel. Null for user input. */
  gamma: number[] | null
}

export interface GarnOutputs {
  pCum: [number, number, number]
  garn: number
  coupling: Float32Array
}

export interface SigmaCheck {
  /** Per-channel MAD spread computed in the browser from the baseline samples 0-1,023. */
  computed: number[]
  /** The 14 values stored with the demo (from Python). Null for user input. */
  stored: number[] | null
  /** Largest relative difference between computed and stored. */
  maxRelDiff: number | null
  /** Which values the model input was divided by. */
  used: 'computed' | 'stored'
}

export interface GarnResult {
  module: 'garnmeter'
  sampleId: string
  label: string
  /** 'live' = the real model ran now in this browser; 'precomputed' = replay of the stored outputs of the same model. */
  source: 'live' | 'precomputed'
  /** Shipped tier: 'C' means the check-in, not the EEG, drives the zones. */
  tier: 'A' | 'B' | 'C'
  fs: number
  channels: string[]
  /** 2-D electrode positions (x right, y nose-up), farthest electrode at 1.0. */
  electrodes: Record<string, [number, number]>
  sigma: SigmaCheck
  /** Model outputs on the calibration reference window (baseline samples 512-1,023). */
  baseline: GarnOutputs
  windows: GarnWindow[]
  trials: GarnTrial[]
  cutoffs: { G_y: number; G_r: number }
  session: {
    nWindows: number
    /** Mean of the per-trial model means over analysed trials. */
    meanModelGarn: number | null
    /** Spearman rank correlation between the per-trial model mean and the reported IDS (needs >= 3 trials). Measured on this replay. */
    spearmanModelVsReported: number | null
  }
  timing: Timing
  /** Mean model time per window for this call (ms). */
  perWindowMs: number
  /** Fixed strings that must accompany the result wherever it is shown. */
  captions: GarnCaptions
}

export interface GarnCaptions {
  personLabel: string
  eegLine: string
  precomputedLabel: string | null
  playback: string
  couplingCaption: string
  garnDefinition: string
  greenCaption: string
  context: string
  resultCard: string
  badge: string
}

/** Inputs the crew gives the ACT logic. */
export interface GarnCrewInputs {
  /** The astronaut's own 1-tap check-in on the study's 1-7 scale (IDS). Overrides the replayed rating. */
  checkinIds?: number
  /** Decide at the moment right after this trial's rating (1-based). Default: the last analysed trial. */
  atTrial?: number
  /** Is a screen or VR task running? Changes the yellow action wording. */
  screenTaskRunning?: boolean
  /** Has the crew medical officer given promethazine? Adds the urinary-retention reminder at red. */
  promethazineGiven?: boolean
}

export interface GarnAct extends ActDecision {
  zone: ZoneName
  /** The check-in the decision used (null = no check-in yet). */
  checkinIds: number | null
  /** Where that check-in came from. */
  checkinSource: 'crew' | 'replay' | 'none'
  /** Zone from the check-in alone. */
  checkinZone: ZoneIndex | null
  /** The EEG estimate at that moment, reported only (Tier C: never drives the zone). */
  eeg: { garnEma: number | null; zone: ZoneIndex | null; drivesZone: boolean }
}

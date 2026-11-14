// VeinSqueeze result types. Every number here comes from the real model, the stored Python outputs or
// the shipped SAM 2 JSON; nothing is mocked.
import type { ActDecision, Sample, Source, Timing } from '../types'

export type SiteCode = 'CFV' | 'FV' | 'GS' | 'PV'

/** The four leg-vein sites the model was trained to tell apart, in the model's output order. */
export const SITE_ORDER: readonly SiteCode[] = ['CFV', 'FV', 'GS', 'PV'] as const

export const SITE_NAME: Record<SiteCode, string> = {
  CFV: 'common femoral vein',
  FV: 'femoral vein',
  GS: 'great saphenous vein',
  PV: 'popliteal vein',
}

/** Expert annotation from ThrombUS+ (shown next to the AI, never produced by it). */
export interface ExpertLabel {
  /** 1 = clot, 0 = no clot. */
  thrombosis: 0 | 1
  /** 0 = vein does not squeeze, 1 = squeezes partly, 2 = squeezes fully. */
  compressibility: 0 | 1 | 2
  site: SiteCode
  siteName: string
}

/** One demo clip as shipped (Clip A-F). No patient data. */
export interface VsSample extends Sample {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  /** Showcase role from vs_pick.py: hero_clot, hero_clean, clot2, clean2, partial, honest_error. */
  role: string
  /** Hospital code (FR1, GR1, GR2, IT1, LT1) and scanner brand ("Philips" or "other"). */
  hospital: string
  scannerBrand: string
  expert: ExpertLabel
  fps: number
  /** Frames in the original clip (the webm has all of them). */
  frames: number
  durS: number
  /** Content-cropped frame size in source pixels (the SAM 2 outline's coordinate system). */
  cropWh: [number, number]
  /** Size of the shipped webm (<= 360 px high). */
  videoWh: [number, number]
  /** Multiply crop-pixel x, y by these to get webm pixels. */
  videoScaleXy: [number, number]
  /** URLs (absolute) of the shipped files. */
  urls: { video: string; t32: string; pred: string; sam2: string | null }
  /** SAM 2 squeeze band of the hand-checked curve, null when the clip failed the hand check (Clip F). */
  sam2Band: SqueezeBand | null
  sam2RMin: number | null
}

/** Our product rule: r_min <= 10% closed fully, 10-50% partly closed, > 50% stayed open. */
export type SqueezeBand = 'closed fully' | 'partly closed' | 'stayed open'

export type Point = [number, number]

/** SAM 2 squeeze curve: an explanation layer, not the classifier. One value per ORIGINAL video frame. */
export interface SqueezeCurve {
  frames: number
  fps: number
  /** Seconds of each original frame. */
  tS: number[]
  /** Vein area as % of its starting area (median of frames 0-4), raw and after a 5-frame median filter. */
  pct: number[]
  pctMed5: number[]
  rMin: number
  tMinFrame: number
  tMinS: number
  band: SqueezeBand
  bandRule: string
  /** SAM 2 presence logit per frame (high = SAM 2 is confident the object is present). */
  presenceLogit: number[]
  /** Vein outline polygon per original frame, in content-cropped source pixels (x right, y down). */
  outlineCrop: Point[][]
  /** The same outline in pixels of the shipped webm. */
  outlineVideo: Point[][]
  /** Prompt clicks on frame `clickFrame` (crop pixels): vein = positive, artery = negative. */
  clicks: { clickFrame: number; vein: Point; artery: Point | null }
  /** Frames shown on the hand-check sheet (Claude checked the outline sat on the vein). */
  checkFrames: number[]
  frameWh: [number, number]
  videoWh: [number, number]
  tag: string
  modelId: string
}

/** One of the 32 frames the model reads. */
export interface EvidenceTick {
  /** 0-31. */
  index: number
  /** Per-frame clot score (sigmoid of the per-frame logit before pooling). Not a per-frame diagnosis. */
  clotProb: number
  /** Pooling weight: how much the clip verdict relied on this frame. The 32 values sum to 1. */
  attention: number
  /** Shipped clip: which original video frame this is. User input: index into the `frames` passed to analyze().
   *  Null for a bare t32 input. */
  sourceFrame: number | null
  /** Seconds into the clip (null when unknown: pass timesS or fps with user frames). */
  tS: number | null
}

/** UI-ready result of one VeinSqueeze run (live or precomputed). */
export interface VsResult {
  sampleId: string | null
  /** 'live' = the model ran now in the browser; 'precomputed' = stored Python output (onnxruntime CPU). */
  mode: 'live' | 'precomputed'
  /** Chance the vein holds a clot, 0-1. */
  clotProb: number
  /** Our product rule alarm threshold. */
  tau: number
  /** clotProb >= tau: "possible clot: vein not compressing" (screening only). */
  aboveTau: boolean
  ticks: EvidenceTick[]
  /** Raw arrays, model order. */
  frameClotProb: number[]
  frameAttention: number[]
  siteProb: Record<SiteCode, number>
  site: { code: SiteCode; name: string; prob: number }
  /** Expert label of a shipped clip (null for user input). */
  expert: ExpertLabel | null
  /** Hand-checked SAM 2 curve, when the clip has one (Clips A-E). */
  squeeze: SqueezeCurve | null
  /** For user input: the content box found by the vs_prep.py rule, in source pixels [x0, y0, x1, y1]. */
  cropBox: [number, number, number, number] | null
  /** The exact uint8 [32,160,160] model input (useful to draw "what the model sees"). */
  modelInput: Uint8Array | null
  timing: Timing
  /** Fixed lines that must accompany this result wherever it is shown. */
  honesty: string[]
}

export type AgeBand = '40 or under' | '41-50' | 'over 50'

/** Entered by crew, not measured by AI. Missing fields score 0 and are listed as "not entered". */
export interface CrewInputs {
  /** Doppler flow grade 1-4 of the neck vein; 3 = stagnant, 4 = retrograde (act_3.md). */
  flowGrade?: 1 | 2 | 3 | 4
  ageBand?: AgeBand
  bloodType?: 'O' | 'non-O'
  /** In-flight D-dimer rise >= 60% over the in-flight baseline (a 2026 NASA proposal, not routine). */
  ddimerRise60?: boolean
  symptoms?: Partial<Record<SymptomKey, boolean>>
}

export type SymptomKey =
  | 'persistentHeadache'
  | 'focalNeuroDeficit'
  | 'newSeizure'
  | 'faceEyelidSwelling'
  | 'nasalCongestion'
  | 'hearingLoss'
  | 'facialAsymmetry'
  | 'gripAsymmetry'
  | 'alteredMentalStatus'
  | 'neckVeinSwelling'
  | 'peSigns'

export interface ScoreItem {
  label: string
  points: number
  entered: boolean
  source: Source
  note?: string
}

export interface FiredTrigger {
  tier: number
  text: string
  ourRule: boolean
  sources: Source[]
}

export interface VsActDecision extends ActDecision {
  /** NASA VTE score from the crew inputs. */
  score: number
  scoreBand: string
  scoreItems: ScoreItem[]
  /** What drove the AI side of the card: the model (screening only), the expert label (demo "what the crew would do" mode) or nothing. */
  aiInput: 'model' | 'expert' | 'none'
  aiFlag: boolean
  aiLabel: string
  /** Every trigger that fired (the highest tier wins). */
  fired: FiredTrigger[]
  /** Squeeze band shown as supporting evidence only; never changes the tier. */
  squeezeEvidence: string | null
  notEntered: string[]
}

export interface ActOptions {
  /** 'model' (default) uses clotProb vs tau; 'expert' uses the shipped expert label instead (plan §9 fallback mode). */
  aiInput?: 'model' | 'expert' | 'none'
}

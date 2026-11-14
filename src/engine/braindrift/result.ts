// Result types of the BrainDrift engine (UI-ready, no rendering).
import type { ActDecision, Sample, Timing } from '../types'

export type SampleKind = 'flight' | 'compare' | 'pvs'

export interface BrainDriftSample extends Sample {
  kind: SampleKind
}

export const CLASS_NAMES = [
  'background',
  'ventricles',
  'cerebral white matter',
  'cerebral cortex',
  'deep grey matter and other',
  'cerebellum and brainstem',
] as const

/** Model B on one brain crop (live or replayed). Volumes are [176,176,208] uint8, C order, LIA. */
export interface BrainMapResult {
  kind: 'brainmap'
  sampleId: string
  /** The input crop (for drawing; see views.ts for slices in image pixel coordinates). */
  volume: Uint8Array
  /** Class id 0-5 per voxel (argmax). */
  seg: Uint8Array
  /** mL per class (index = class id); 1 voxel = 1 mm3. */
  classMl: number[]
  ventricleMl: number
  ventricleVoxels: number
  /** Ventricle voxels per coronal slice k (a curve along the front-back axis). */
  ventriclePerSlice: Int32Array
  /** Percent of the 414-brain OASIS reference at or below this ventricle volume. */
  ventricleRefPercentile: number
  /** Top-of-brain surface j per column (i, k) (index i*208+k), sub-voxel; NaN = no brain. Null on replay (needs probabilities). */
  top: Float64Array | null
  highest: { i: number; k: number; j: number } | null
  /** Coronal slices the model ran on (those with brain). */
  slicesRun: number[]
  /** Smallest top-1 minus top-2 probability per coronal slice (1 when not run): low = a borderline voxel exists. Null on replay. */
  sliceMinMargin: Float32Array | null
  /** Softmax [6, 176, 176] (index c*176*176 + i*176 + j) for requested coronal slices. */
  softmax: Map<number, Float32Array>
  /** Reference numbers for this sample when we have them (stored model run, FreeSurfer label volume). */
  reference?: { storedVentricleMl?: number; freesurferVentricleMl?: number; ventricleDiceVsFreesurfer?: number }
  live: boolean
  timing: Timing & { loadMs?: number; calls: number; msPerCallMedian: number }
}

/** A pre/post pair measured by Model B (the flight simulator). */
export interface FlightResult {
  kind: 'flight'
  sampleId: string
  f: number
  /** Fixed badge: the pair is a simulation, never flight data. */
  badge: 'SIMULATION'
  frameLabel: string
  /** Only f = 0 and f = 1 carry cited numbers; the middle frames are illustration. */
  citedNumbers: boolean
  pre: BrainMapResult
  post: BrainMapResult
  measured: { ventricleChangePct: number | null; riseMm: number | null; riseColumns: number }
  injected: { ventricleChangePct: number; riseMm: number }
  /** Values the Python pipeline stored for this frame (bd_flight.json). */
  stored: { ventricleChangePct: number; riseMm: number; ventricleMl: number }
  /** Columns (i, k) used for the rise (1 = used), index i*208+k. */
  riseColumnsMask: Uint8Array | null
  live: boolean
  timing: Timing
}

/** Model A (PVS finder) result: precomputed on the GPU VM, never run in the browser. */
export interface PvsResult {
  kind: 'pvs'
  sampleId: string
  role: string
  modelMm3: number
  expertMm3: number
  modelChannels: number
  expertChannels: number
  modelBand: 'low' | 'mid' | 'high'
  expertBand: 'low' | 'mid' | 'high'
  modelPercentile: number
  expertPercentile: number
  dice: number
  bandCutsMm3: [number, number]
  meshes: { model: string; expert: string; shell: string }
  axial: {
    model: string
    expert: string
    widthPx: number
    heightPx: number
    levelsMmBelowTop: number[]
    /** Tile n (row-major, 0 = highest level) starts at x0 = (n % cols) * (width + gap), y0 = floor(n / cols) * (height + gap). */
    tilePx?: { width: number; height: number; gap: number; cols: number; rows: number }
  }
  live: false
  timing: Timing
}

export type BrainDriftResult = BrainMapResult | FlightResult | PvsResult

export interface CrewInputs {
  /** App checklist (not a model output): new blurred near vision. */
  blurredNearVision?: boolean
  /** App checklist (not a model output): new headache. */
  headache?: boolean
  /** Eye exam result (not a model output): optic disc edema Frisen grade (0 = none). */
  discEdemaFrisenGrade?: number
  /** PVS band from a pre-flight scan, to combine with a flight result. */
  pvsBand?: 'low' | 'mid' | 'high'
}

export interface ActRow {
  tier: number
  tierName: string
  severity: ActDecision['severity']
  whoActs: string
  readout: string
  trigger: string
  actions: string[]
  ourRule: boolean
  sources: ActDecision['sources']
  /** Hover-only lines (never a headline). */
  hover?: string[]
}

export interface BrainDriftAct extends ActDecision {
  /** Every row of plan section 9 that fired, in table order. */
  rows: ActRow[]
}

// ---- shape of public/braindrift/meta/braindrift.json (fields the engine reads)
export interface MetaFrame {
  id: string
  f: number
  label: string
  citedNumbers: boolean
  volume: string
  seg: string
  ventMesh: string
  injectedVentricleChangePct: number
  injectedRiseMm: number
  storedVentricleMl: number
  storedVentricleChangePct: number
  storedRiseMm: number
  storedRiseColumns: number
}
export interface MetaCompare {
  id: string
  role: string
  volume: string
  seg: string
  ventMesh: string
  freesurferVentricleMl: number
  storedVentricleMl: number
  ventricleDiceVsFreesurfer: number
}
export interface MetaPvs {
  id: string
  role: string
  modelMm3: number
  expertMm3: number
  modelChannels: number
  expertChannels: number
  modelBand: 'low' | 'mid' | 'high'
  expertBand: 'low' | 'mid' | 'high'
  modelPercentile: number
  expertPercentile: number
  dice: number
  meshes: { model: string; expert: string; shell: string }
  axial: {
    model: string
    expert: string
    widthPx: number
    heightPx: number
    levelsMmBelowTop: number[]
    /** Tile n (row-major, 0 = highest level) starts at x0 = (n % cols) * (width + gap), y0 = floor(n / cols) * (height + gap). */
    tilePx?: { width: number; height: number; gap: number; cols: number; rows: number }
  }
}
export interface BrainDriftMeta {
  /** brainMesh: frame-0 brain surface with the injected-field attribute _DISP_MM (SIMULATION). */
  flight: { frames: MetaFrame[]; brainMesh: string; fieldFile: { path: string; units: string; maxMm: number } }
  compare: MetaCompare[]
  pvs: { samples: MetaPvs[]; bandCutsMm3: [number, number] }
  reference: { pvs: { volumesMm3Sorted: number[] }; ventricles: { volumesMlSorted: number[] } }
  [k: string]: unknown
}

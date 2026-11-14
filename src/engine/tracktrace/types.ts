// Result shapes of the TrackTrace engine. All geometry is in pixels of the 128 x 128 model-input canvas
// (the image you draw): row = y (down), col = x (right). Pixel centres sit at integer coordinates.
import type { Timing } from '../types'
import type { LineFit } from './post'
import type { SampleVerdict } from './act'

export type { LineFit, Vec2 } from './post'
export type { SampleVerdict, ActInput, CrewInputs, TrackTraceAct, TierName } from './act'

export const PARTICLES = ['sham', 'X-ray', 'Fe'] as const
export const DOSE_BANDS = ['sham', 'low', 'high'] as const
export const TIMES = ['4 h', '24 h', '48 h'] as const

/** NASA's label for a nucleus or well (indices into PARTICLES / DOSE_BANDS / TIMES). */
export interface Truth {
  particle: number
  dose: number
  time: number
}

export interface FocusCircle {
  /** Index in the circle list (raster order of the part's first pixel). */
  id: number
  row: number
  col: number
  /** Same point as (x, y) for drawing: x = col, y = row. */
  x: number
  y: number
  /** Pixels in the focus part; null when only centroids were stored (well replay). */
  areaPx: number | null
  /** Suggested drawing radius in canvas px: max(3.5, sqrt(area / pi) + 2) (3.5 when area is unknown). */
  radiusPx: number
  /** On the fitted track line (an inlier of the line fit). */
  onLine: boolean
}

export interface NucleusProbs {
  /** [sham, X-ray, Fe]: softmax(particle_logits). */
  particle: number[]
  /** Lab dose band [sham, low, high]: CORAL [1 - s(d0), s(d0) - s(d1), s(d1)]. */
  dose: number[]
  /** [4 h, 24 h, 48 h]: softmax(time_logits). Means nothing for a sham nucleus. */
  time: number[]
}

export interface NucleusResult {
  sampleId: string
  /** Lab coordinate key plate_well_field_nucleus (not personal data). */
  key: string
  source: 'live' | 'precomputed' | 'user'
  /** Model input x (log of intensity relative to the nucleus median; 0 outside), 128 x 128 row-major. */
  x: Float32Array
  /** 1 inside the nucleus (x > 0). */
  nucleus: Uint8Array
  /** Per-pixel focus probability sigmoid(foci_logits), 128 x 128; null on replay. */
  fociProb: Float32Array | null
  /**
   * Direction-gate weights, layout [4, 32, 32] = (direction 0/45/90/135 deg, row, col) at 1/4 canvas
   * resolution: value [d * 1024 + r * 32 + c]. Not shown as a result: check C1 failed.
   */
  trackDir: Float32Array | null
  circles: FocusCircle[]
  /** Displayed foci count = number of circles. */
  count: number
  line: LineFit
  probs: NucleusProbs
  /** Model mean foci lambda = exp(count_lograte). Feeds the sample mu; NOT the displayed count. */
  lambda: number
  /** 202 bag features (input to the sample model); null on replay. */
  bagFeatures: Float32Array | null
  /** NASA label and NASA 2016-pipeline foci count; null for user input. */
  truth: Truth | null
  cond: string | null
  nfoci2016: number | null
  timing: Timing
}

export interface WellNucleus {
  key: string
  count: number
  /** Circle centroids (row, col) in canvas px. */
  circles: [number, number][]
  particle: number[]
  dose: number[]
  time: number[]
  lambda: number
}

export interface WellResult {
  wellId: string
  source: 'live' | 'precomputed'
  cond: string
  truth: Truth | null
  nNuclei: number
  nuclei: WellNucleus[]
  /** MIL verdict: softmax of the 3 whole-sample heads. */
  verdict: SampleVerdict
  /** MIL attention per nucleus (sums to 1), same order as nuclei. */
  attention: number[]
  /** Indices of the 10 nuclei with the highest attention. */
  highlight: number[]
  /** Mean lambda over the well (the ACT mu). */
  mu: number
  /** Personal sham baseline mu0 (same donor's sham well at the same time point), from wells_test.json. */
  mu0: number | null
  baselineWell: string | null
  timing: { scan: Timing; mil: Timing; perNucleusMs: number }
}

/** One of the 34 held-out test wells with its precomputed MIL verdict. */
export interface WellSummary {
  wellId: string
  plate: string
  well: string
  donor: string
  exp: string
  cond: string
  truth: Truth
  nNuclei: number
  verdict: SampleVerdict
  meanProbs: SampleVerdict
  mu: number
  baselineWell: string | null
  mu0: number | null
  actTierRef: 'GREEN' | 'YELLOW' | 'ORANGE' | null
  hzeLedgerHitRef: boolean
  topAttention: { key: string; attention: number }[]
  /** True when the whole well's images ship, so analyzeWell() can scan it live. */
  live: boolean
}

export interface WellProgress {
  done: number
  total: number
  /** Results of the batch that just finished (indices start..start+batch.length-1). */
  start: number
  batch: WellNucleus[]
}

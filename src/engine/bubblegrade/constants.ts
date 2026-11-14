// BubbleGrade constants. Every number here is copied from the shipped files, not chosen here:
// work/BubbleGrade/results/assets/bubble_meta.json, export/parity.json and plans/02_BubbleGrade.md §3, §4, §8.1.

export const SAMPLE_RATE = 16000
/** One model window: 5.0 s at 16 kHz. */
export const WIN = 80000
/** Window hop for clips: 1.0 s (plan §3). */
export const HOP = 16000
/** STFT hop inside the model (10 ms) and frames per window. */
export const FRAME_HOP = 160
export const FRAME_WIN = 400
export const FRAMES = 498
export const MEL_BANDS = 64
export const MEL_FMIN_HZ = 20
export const MEL_FMAX_HZ = 8000
/** Bubble-map cells per window and their length (5 s / 16). */
export const CAM_CELLS = 16
export const CAM_CELL_S = 0.3125

/** Shipped model = rotation 4. Alert threshold tau on mean P(grade >= III) (our product rule, plan §9). */
export const TAU = 0.0853833860717713
/** Ordinal thresholds b_1..b_4: P(grade >= k) = sigmoid(s + b_k). */
export const THRESHOLDS = [-0.5280466079711914, -1.6268460750579834, -2.7752747535705566, -5.790671348571777] as const
export const GRADES = ['0', 'I', 'II', 'III', 'IV'] as const
export type GradeLabel = (typeof GRADES)[number]

export const MODEL_KEY = 'bubblegrade'
export const MODEL_NAME = 'bubblegrade_mnv4m_r4.onnx'
export const MODEL_BYTES = 29417960
export const MODEL_SHA256 = '8aae1890974a258e6178cb0b6dca371e2e779f035c75ff0af0e4d17abd43e67c'
/** The model ships as two parts (each <= 16 MiB) so any static host can serve it; load() joins them. */
export const MODEL_PARTS = [
  { path: 'bubblegrade/models/bubblegrade_mnv4m_r4.onnx.part00', bytes: 16777216 },
  { path: 'bubblegrade/models/bubblegrade_mnv4m_r4.onnx.part01', bytes: 12640744 },
] as const

/** Windows per onnxruntime call. Windows are independent, so chunking does not change any output. */
export const CHUNK = 16
/** Plan §8.1: a dropped file shorter than 5.0 s is refused with this text. */
export const TOO_SHORT = 'needs at least 5 seconds of Doppler audio'

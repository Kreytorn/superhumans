// Messages between the main thread and the inference worker.

export type Backend = 'webgpu' | 'wasm'

export type TensorType = 'float32' | 'uint8' | 'int64' | 'int32'

export interface WireTensor {
  type: TensorType
  dims: number[]
  data: Float32Array | Uint8Array | BigInt64Array | Int32Array
}

export interface EnvInfo {
  /** The page-wide first choice: 'webgpu' when an adapter was found and wasm was not forced. One model can still run on wasm (see ModelStatus). */
  backend: Backend
  adapter: string | null
  threads: number
  isolated: boolean
  ortVersion: string
}

/** What one loaded model really runs on. */
export interface ModelStatus {
  key: string
  /** The backend this model's session uses right now. */
  backend: Backend
  /** True when the first-choice backend failed and the model was moved to another one. */
  fellBack: boolean
  /** Why it fell back (the first backend's error), in plain text. */
  reason?: string
}

export type Request =
  | { id: number; kind: 'init'; forceWasm: boolean }
  // `url` or `bytes` (one of them). `backends` is the order to try; wasm is always the last resort.
  // `testFail` is a test hook: it fakes a WebGPU failure at session creation or at the first run.
  | { id: number; kind: 'load'; key: string; url?: string; bytes?: ArrayBuffer; backends?: Backend[]; testFail?: 'create' | 'run' }
  | { id: number; kind: 'run'; key: string; feeds: Record<string, WireTensor> }
  | { id: number; kind: 'release'; key: string }

export type Response =
  | { id: number; ok: true; kind: 'init'; env: EnvInfo }
  | { id: number; ok: true; kind: 'load'; key: string; ms: number; inputs: string[]; outputs: string[]; backend: Backend; fellBack: boolean; reason?: string }
  | { id: number; ok: true; kind: 'run'; ms: number; outputs: Record<string, WireTensor>; backend: Backend; fellBack: boolean; reason?: string }
  | { id: number; ok: true; kind: 'release' }
  | { id: number; ok: false; error: string }

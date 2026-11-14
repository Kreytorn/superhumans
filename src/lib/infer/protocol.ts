// Messages between the main thread and the inference worker.

export type Backend = 'webgpu' | 'wasm'

export type TensorType = 'float32' | 'uint8' | 'int64' | 'int32'

export interface WireTensor {
  type: TensorType
  dims: number[]
  data: Float32Array | Uint8Array | BigInt64Array | Int32Array
}

export interface EnvInfo {
  backend: Backend
  adapter: string | null
  threads: number
  isolated: boolean
  ortVersion: string
}

export type Request =
  | { id: number; kind: 'init'; forceWasm: boolean }
  | { id: number; kind: 'load'; key: string; url: string }
  | { id: number; kind: 'run'; key: string; feeds: Record<string, WireTensor> }
  | { id: number; kind: 'release'; key: string }

export type Response =
  | { id: number; ok: true; kind: 'init'; env: EnvInfo }
  | { id: number; ok: true; kind: 'load'; key: string; ms: number; inputs: string[]; outputs: string[] }
  | { id: number; ok: true; kind: 'run'; ms: number; outputs: Record<string, WireTensor> }
  | { id: number; ok: true; kind: 'release' }
  | { id: number; ok: false; error: string }

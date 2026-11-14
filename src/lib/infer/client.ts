// Promise wrapper around the inference worker. One worker, many sessions (one per model key).
import type { EnvInfo, Request, Response, WireTensor } from './protocol'

export type { Backend, EnvInfo, WireTensor } from './protocol'

type Ok = Extract<Response, { ok: true }>
type Pending = { resolve: (r: Ok) => void; reject: (e: Error) => void }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()
let envPromise: Promise<EnvInfo> | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'infer' })
    worker.onmessage = (ev: MessageEvent<Response>) => {
      const p = pending.get(ev.data.id)
      if (!p) return
      pending.delete(ev.data.id)
      if (ev.data.ok) p.resolve(ev.data as Ok)
      else p.reject(new Error(ev.data.error))
    }
  }
  return worker
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

function call<K extends Request['kind']>(
  req: DistributiveOmit<Extract<Request, { kind: K }>, 'id'>,
  transfer: Transferable[] = [],
): Promise<Extract<Ok, { kind: K }>> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (r: Ok) => void, reject })
    getWorker().postMessage({ ...req, id } as Request, transfer)
  })
}

/** Starts the worker and picks the backend once. `?backend=wasm` in the URL forces wasm. */
export function initInference(): Promise<EnvInfo> {
  if (!envPromise) {
    const forceWasm = new URLSearchParams(location.hash.split('?')[1] ?? '').get('backend') === 'wasm'
    envPromise = call<'init'>({ kind: 'init', forceWasm }).then((r) => r.env)
  }
  return envPromise
}

/** Loads a model from a path relative to the app (e.g. "spikecount/models/spike_outliner.onnx"). */
export async function loadModel(key: string, path: string) {
  await initInference()
  const url = new URL(path, document.baseURI).href
  return call<'load'>({ kind: 'load', key, url })
}

export async function runModel(key: string, feeds: Record<string, WireTensor>) {
  const transfer = Object.values(feeds).map((t) => t.data.buffer as ArrayBuffer)
  return call<'run'>({ kind: 'run', key, feeds }, transfer)
}

export async function releaseModel(key: string) {
  await call<'release'>({ kind: 'release', key })
}

// Promise wrapper around the inference worker. One worker, many sessions (one per model key).
//
// What callers can rely on (r3):
//  - initInference() picks the page-wide first choice once (WebGPU when there is an adapter, else wasm).
//    "?backend=wasm" forces wasm; it is read from the query string and from the hash ("#?backend=wasm", "#/route?backend=wasm").
//  - loadModel(key, source, options?) keeps the old call form loadModel(key, path). New, all optional:
//      source   a path or URL, or the model bytes (ArrayBuffer, typed array or Blob)
//      backends the order to try for this model, e.g. ['wasm']; wasm is always the last resort
//      onProgress byte-level download progress (the file is then fetched here instead of inside the worker)
//  - If WebGPU fails for one model (creating the session, or later while running), that model moves to wasm by itself.
//    The reply of loadModel and runModel carries the backend really used; modelStatus(key) gives it at any time.
//  - Relative paths resolve against the app root (Vite's base), not against the page, so pages under a
//    sub-path such as /parity/ need no <base href="/">. Absolute URLs and blob: URLs pass through untouched.
import type { Backend, EnvInfo, ModelStatus, Request, Response, WireTensor } from './protocol'

export type { Backend, EnvInfo, ModelStatus, WireTensor } from './protocol'

type Ok = Extract<Response, { ok: true }>
type Pending = { resolve: (r: Ok) => void; reject: (e: Error) => void }

let worker: Worker | null = null
let workerSpoke = false
let nextId = 1
const pending = new Map<number, Pending>()
let envPromise: Promise<EnvInfo> | null = null
let envNow: EnvInfo | null = null

const statuses = new Map<string, ModelStatus>()
const wishes = new Map<string, Backend[]>()
const listeners = new Set<(s: ModelStatus) => void>()

function getWorker(): Worker {
  if (!worker) {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'infer' })
    w.onmessage = (ev: MessageEvent<Response>) => {
      workerSpoke = true
      const p = pending.get(ev.data.id)
      if (!p) return
      pending.delete(ev.data.id)
      if (ev.data.ok) p.resolve(ev.data as Ok)
      else p.reject(new Error(ev.data.error))
    }
    w.onerror = (ev: ErrorEvent) => {
      // Only a worker that never answered counts as dead (its script failed to start). Fail what is waiting
      // instead of hanging forever, and let the next call start a fresh worker.
      if (workerSpoke || worker !== w) return
      const err = new Error(`inference worker failed to start${ev.message ? `: ${ev.message}` : ''}`)
      for (const p of pending.values()) p.reject(err)
      pending.clear()
      w.terminate()
      worker = null
      envPromise = null
      envNow = null
    }
    worker = w
    workerSpoke = false
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
    try {
      getWorker().postMessage({ ...req, id } as Request, transfer)
    } catch (e) {
      pending.delete(id)
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

/** True when the page URL asks for wasm: "?backend=wasm" in the query string or after a "?" in the hash. */
export function wasmForced(): boolean {
  const asks = (q: string) => new URLSearchParams(q).get('backend') === 'wasm'
  const i = location.hash.indexOf('?')
  return asks(location.search) || (i >= 0 && asks(location.hash.slice(i + 1)))
}

/** Starts the worker and picks the backend once. `?backend=wasm` in the URL forces wasm. */
export function initInference(): Promise<EnvInfo> {
  if (!envPromise) {
    const p = call<'init'>({ kind: 'init', forceWasm: wasmForced() }).then((r) => {
      envNow = r.env
      return r.env
    })
    envPromise = p
    p.catch(() => {
      if (envPromise === p) envPromise = null
    })
  }
  return envPromise
}

/** A path relative to the app root (e.g. "spikecount/models/x.onnx") as a full URL. Works from pages under a sub-path. */
export function appUrl(path: string): string {
  const root = new URL(import.meta.env.BASE_URL, document.baseURI)
  return new URL(path, root).href
}

export interface DownloadProgress {
  /** Bytes received so far. */
  loaded: number
  /** Total bytes, or null when the server did not say and no `totalBytes` was given. */
  total: number | null
  /** loaded / total, 0..1, or null when the total is unknown. */
  fraction: number | null
}

export interface LoadOptions {
  /** Order of backends to try for this model, e.g. ['wasm']. Default: WebGPU, then wasm. wasm is always the last resort. */
  backends?: Backend[]
  /** Byte-level download progress. Only used when `source` is a path or URL. */
  onProgress?: (p: DownloadProgress) => void
  /** The file size if known (from a manifest), for servers that send no Content-Length. */
  totalBytes?: number
  signal?: AbortSignal
  /** Test hook: fake a WebGPU failure when the session is created or on its first run. */
  testFail?: 'create' | 'run'
}

export type ModelSource = string | ArrayBuffer | ArrayBufferView | Blob

async function download(url: string, opts: LoadOptions): Promise<ArrayBuffer> {
  const r = await fetch(url, { signal: opts.signal })
  if (!r.ok) throw new Error(`model download failed: HTTP ${r.status} for ${url}`)
  const header = Number(r.headers.get('content-length'))
  // A compressed transfer reports the compressed size, which does not match the bytes we count.
  const plain = !r.headers.get('content-encoding')
  const total = opts.totalBytes ?? (plain && Number.isFinite(header) && header > 0 ? header : null)
  const tell = (loaded: number) => opts.onProgress?.({ loaded, total, fraction: total ? Math.min(1, loaded / total) : null })
  tell(0)
  if (!r.body) {
    const buf = await r.arrayBuffer()
    tell(buf.byteLength)
    return buf
  }
  const reader = r.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    tell(loaded)
  }
  const out = new Uint8Array(loaded)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out.buffer
}

function remember(s: ModelStatus) {
  const old = statuses.get(s.key)
  statuses.set(s.key, s)
  if (!old || old.backend !== s.backend || old.fellBack !== s.fellBack) for (const f of listeners) f(s)
}

/**
 * Loads a model into the worker under `key`.
 * `source` is a path relative to the app (e.g. "spikecount/models/spike_outliner.onnx"), any URL, or the model bytes.
 * Bytes you pass in are copied, so your buffer stays usable.
 * The third argument is optional: LoadOptions, or just a backend order such as ['wasm'].
 */
export async function loadModel(key: string, source: ModelSource, options: LoadOptions | Backend[] = {}) {
  const opts: LoadOptions = Array.isArray(options) ? { backends: options } : options
  await initInference()
  const backends = opts.backends ?? wishes.get(key)
  const base = { kind: 'load' as const, key, backends, testFail: opts.testFail }
  let r: Extract<Ok, { kind: 'load' }>
  if (typeof source === 'string') {
    const url = appUrl(source)
    if (opts.onProgress) {
      const bytes = await download(url, opts)
      r = await call<'load'>({ ...base, bytes }, [bytes])
    } else r = await call<'load'>({ ...base, url })
  } else {
    let bytes: ArrayBuffer
    if (source instanceof Blob) bytes = await source.arrayBuffer()
    else if (ArrayBuffer.isView(source)) bytes = (source.buffer as ArrayBuffer).slice(source.byteOffset, source.byteOffset + source.byteLength)
    else bytes = source.slice(0)
    opts.onProgress?.({ loaded: bytes.byteLength, total: bytes.byteLength, fraction: 1 })
    r = await call<'load'>({ ...base, bytes }, [bytes])
  }
  remember({ key, backend: r.backend, fellBack: r.fellBack, reason: r.reason })
  return r
}

/** Runs a loaded model. The reply's `backend` is the one really used for this run. */
export async function runModel(key: string, feeds: Record<string, WireTensor>) {
  const transfer = Object.values(feeds).map((t) => t.data.buffer as ArrayBuffer)
  const r = await call<'run'>({ kind: 'run', key, feeds }, transfer)
  remember({ key, backend: r.backend, fellBack: r.fellBack, reason: r.reason })
  return r
}

export async function releaseModel(key: string) {
  await call<'release'>({ kind: 'release', key })
  statuses.delete(key)
}

/**
 * Sets the backend order for a model key before its engine loads it (the engines call loadModel(key, path)
 * without options). Pass null to clear. Example: preferBackends('garnmeter/garn', ['wasm']).
 */
export function preferBackends(key: string, backends: Backend[] | null) {
  if (backends?.length) wishes.set(key, [...backends])
  else wishes.delete(key)
}

/** What a loaded model really runs on, or null if it is not loaded. */
export function modelStatus(key: string): ModelStatus | null {
  return statuses.get(key) ?? null
}

/** Every loaded model with its real backend. */
export function modelStatuses(): ModelStatus[] {
  return [...statuses.values()]
}

/** Calls back when a model is loaded or moves to another backend. Returns the function that stops it. */
export function onModelStatus(f: (s: ModelStatus) => void): () => void {
  listeners.add(f)
  return () => {
    listeners.delete(f)
  }
}

/** The environment if initInference() has finished, else null (no waiting). */
export function inferenceEnv(): EnvInfo | null {
  return envNow
}

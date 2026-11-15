/// <reference lib="webworker" />
// Inference worker: onnxruntime-web, WebGPU first, wasm fallback. All model files are local.
//
// Hardening (r3):
//  - Requests are handled strictly one at a time, in arrival order (two modules loading or running at once is safe).
//  - Per model: if the session cannot be created on WebGPU, it is created on wasm instead.
//  - Per model: if a run fails on WebGPU, the model is rebuilt on wasm and the same run is repeated once.
//  - Every load and run reply says which backend the model really used.
import * as ort from 'onnxruntime-web/webgpu'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url'
import type { Backend, EnvInfo, Request, Response, WireTensor } from './protocol'

type Source = { url: string } | { bytes: Uint8Array }

interface Entry {
  session: ort.InferenceSession
  backend: Backend
  fellBack: boolean
  reason?: string
  /** Where to rebuild the session from if WebGPU fails at run time. Null once the model is on wasm. */
  source: Source | null
  /** Test hook: fail the next WebGPU run once. */
  testFailRun?: boolean
}

const scope = self as unknown as DedicatedWorkerGlobalScope
const entries = new Map<string, Entry>()
let backend: Backend = 'wasm'
/** Set when the GPU device is lost: later loads skip WebGPU. */
let gpuLost = false
let lostWatched = false

function reply(msg: Response, transfer: Transferable[] = []) {
  scope.postMessage(msg, transfer)
}

const text = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function init(forceWasm: boolean): Promise<EnvInfo> {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl }
  // onnxruntime prints its C++ warnings (e.g. "Some nodes were not assigned to the preferred execution providers")
  // through console.error; only real errors should reach the console.
  ort.env.logLevel = 'error'
  const isolated = scope.crossOriginIsolated === true
  const cores = navigator.hardwareConcurrency || 2
  ort.env.wasm.numThreads = isolated ? Math.max(1, Math.min(4, Math.floor(cores / 2))) : 1
  let adapter: GPUAdapter | null = null
  if (!forceWasm && 'gpu' in navigator && navigator.gpu) {
    try {
      adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
    } catch {
      adapter = null
    }
  }
  backend = adapter ? 'webgpu' : 'wasm'
  const info = adapter?.info
  return {
    backend,
    adapter: info ? [info.vendor, info.architecture, info.description].filter(Boolean).join(' ') || 'unknown' : null,
    threads: ort.env.wasm.numThreads ?? 1,
    isolated,
    ortVersion: ort.env.versions?.web ?? 'unknown',
  }
}

/** The GPU device onnxruntime created, or null. onnxruntime silently drops WebGPU when it cannot start it, so we check. */
async function gpuDevice(): Promise<GPUDevice | null> {
  try {
    const d = await Promise.race([
      Promise.resolve((ort.env.webgpu as { device?: unknown }).device),
      new Promise<null>((r) => setTimeout(() => r(null), 2000)),
    ])
    return d && typeof d === 'object' ? (d as GPUDevice) : null
  } catch {
    return null
  }
}

function watchLost(d: GPUDevice) {
  if (lostWatched) return
  lostWatched = true
  d.lost
    ?.then(() => {
      gpuLost = true
    })
    .catch(() => {})
}

/** The order to try for one model: the caller's wish, limited to what this page has, always ending in wasm. */
function plan(wish: Backend[] | undefined): Backend[] {
  const gpuOk = backend === 'webgpu' && !gpuLost
  const want: Backend[] = wish?.length ? wish : ['webgpu', 'wasm']
  const out: Backend[] = []
  for (const b of want) {
    if (b === 'webgpu' && !gpuOk) continue
    if ((b === 'webgpu' || b === 'wasm') && !out.includes(b)) out.push(b)
  }
  if (!out.includes('wasm')) out.push('wasm')
  return out
}

function create(source: Source, b: Backend): Promise<ort.InferenceSession> {
  const eps = b === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm']
  // logSeverityLevel 3 = errors only (the session's own logger; env.logLevel covers the global one)
  const opts: ort.InferenceSession.SessionOptions = { executionProviders: eps, graphOptimizationLevel: 'all', logSeverityLevel: 3 }
  return 'bytes' in source ? ort.InferenceSession.create(source.bytes, opts) : ort.InferenceSession.create(source.url, opts)
}

async function load(req: Extract<Request, { kind: 'load' }>): Promise<Entry> {
  const order = plan(req.backends)
  let source: Source
  if (req.bytes) source = { bytes: new Uint8Array(req.bytes) }
  else if (req.url && order[0] === 'webgpu' && /^(blob|data):/i.test(req.url)) {
    // A blob URL may be revoked right after load: keep the bytes so a later WebGPU failure can still rebuild on wasm.
    const r = await fetch(req.url)
    if (!r.ok) throw new Error(`model ${req.key}: HTTP ${r.status}`)
    source = { bytes: new Uint8Array(await r.arrayBuffer()) }
  } else if (req.url) source = { url: req.url }
  else throw new Error(`model ${req.key}: no url and no bytes`)

  const errors: string[] = []
  for (const b of order) {
    try {
      if (b === 'webgpu' && req.testFail === 'create') throw new Error('test hook: forced WebGPU create failure')
      const session = await create(source, b)
      let real: Backend = b
      if (b === 'webgpu') {
        const d = await gpuDevice()
        if (d) watchLost(d)
        else {
          real = 'wasm'
          errors.push('webgpu: onnxruntime could not start WebGPU')
        }
      }
      const fellBack = real !== order[0]
      return { session, backend: real, fellBack, reason: fellBack ? errors.join(' | ') : undefined, source: real === 'webgpu' ? source : null, testFailRun: req.testFail === 'run' }
    } catch (e) {
      errors.push(`${b}: ${text(e)}`)
    }
  }
  throw new Error(`model ${req.key} could not be loaded (${errors.join(' | ')})`)
}

function toOrt(t: WireTensor): ort.Tensor {
  return new ort.Tensor(t.type, t.data, t.dims)
}

function fromOrt(t: ort.Tensor): WireTensor {
  return { type: t.type as WireTensor['type'], dims: [...t.dims], data: t.data as WireTensor['data'] }
}

async function run(req: Extract<Request, { kind: 'run' }>) {
  const e = entries.get(req.key)
  if (!e) throw new Error(`model ${req.key} is not loaded`)
  const feeds: Record<string, ort.Tensor> = {}
  for (const [k, v] of Object.entries(req.feeds)) feeds[k] = toOrt(v)
  let t0 = performance.now()
  let out: ort.InferenceSession.OnnxValueMapType
  try {
    if (e.testFailRun && e.backend === 'webgpu') {
      e.testFailRun = false
      throw new Error('test hook: forced WebGPU run failure')
    }
    out = await e.session.run(feeds)
  } catch (err) {
    // A caller mistake (a missing input) fails the same way on wasm: do not rebuild for that.
    const namesOk = e.session.inputNames.every((n) => n in feeds)
    if (e.backend !== 'webgpu' || !e.source || !namesOk) throw err
    let wasm: ort.InferenceSession
    try {
      wasm = await create(e.source, 'wasm')
    } catch {
      throw err
    }
    t0 = performance.now()
    try {
      out = await wasm.run(feeds)
    } catch {
      // wasm fails too: the fault is in the request, not in WebGPU. Keep the model where it was.
      await wasm.release().catch(() => {})
      throw err
    }
    const old = e.session
    e.session = wasm
    e.backend = 'wasm'
    e.fellBack = true
    e.reason = `webgpu run failed: ${text(err)}`
    e.source = null
    old.release().catch(() => {})
  }
  const ms = performance.now() - t0
  const outputs: Record<string, WireTensor> = {}
  const transfer: Transferable[] = []
  for (const [k, v] of Object.entries(out)) {
    const w = fromOrt(v)
    outputs[k] = w
    transfer.push(w.data.buffer as ArrayBuffer)
  }
  reply({ id: req.id, ok: true, kind: 'run', ms, outputs, backend: e.backend, fellBack: e.fellBack, reason: e.reason }, transfer)
}

async function handle(req: Request) {
  try {
    if (req.kind === 'init') {
      reply({ id: req.id, ok: true, kind: 'init', env: await init(req.forceWasm) })
    } else if (req.kind === 'load') {
      const t0 = performance.now()
      const e = await load(req)
      entries
        .get(req.key)
        ?.session.release()
        .catch(() => {})
      entries.set(req.key, e)
      const s = e.session
      reply({ id: req.id, ok: true, kind: 'load', key: req.key, ms: performance.now() - t0, inputs: [...s.inputNames], outputs: [...s.outputNames], backend: e.backend, fellBack: e.fellBack, reason: e.reason })
    } else if (req.kind === 'run') {
      await run(req)
    } else if (req.kind === 'release') {
      const e = entries.get(req.key)
      entries.delete(req.key)
      await e?.session.release().catch(() => {})
      reply({ id: req.id, ok: true, kind: 'release' })
    }
  } catch (e) {
    reply({ id: req.id, ok: false, error: text(e) })
  }
}

// One request at a time: onnxruntime-web does not support overlapping session work in one worker.
let queue: Promise<void> = Promise.resolve()
scope.onmessage = (ev: MessageEvent<Request>) => {
  const req = ev.data
  queue = queue.then(() => handle(req))
}

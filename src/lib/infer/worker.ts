/// <reference lib="webworker" />
// Inference worker: onnxruntime-web, WebGPU first, wasm fallback. All model files are local.
import * as ort from 'onnxruntime-web/webgpu'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url'
import type { Backend, EnvInfo, Request, Response, WireTensor } from './protocol'

const scope = self as unknown as DedicatedWorkerGlobalScope
const sessions = new Map<string, ort.InferenceSession>()
let backend: Backend = 'wasm'

function reply(msg: Response, transfer: Transferable[] = []) {
  scope.postMessage(msg, transfer)
}

async function init(forceWasm: boolean): Promise<EnvInfo> {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl }
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

function toOrt(t: WireTensor): ort.Tensor {
  return new ort.Tensor(t.type, t.data, t.dims)
}

function fromOrt(t: ort.Tensor): WireTensor {
  return { type: t.type as WireTensor['type'], dims: [...t.dims], data: t.data as WireTensor['data'] }
}

scope.onmessage = async (ev: MessageEvent<Request>) => {
  const req = ev.data
  try {
    if (req.kind === 'init') {
      reply({ id: req.id, ok: true, kind: 'init', env: await init(req.forceWasm) })
    } else if (req.kind === 'load') {
      const t0 = performance.now()
      const eps = backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm']
      const s = await ort.InferenceSession.create(req.url, { executionProviders: eps, graphOptimizationLevel: 'all' })
      sessions.get(req.key)?.release()
      sessions.set(req.key, s)
      reply({ id: req.id, ok: true, kind: 'load', key: req.key, ms: performance.now() - t0, inputs: [...s.inputNames], outputs: [...s.outputNames] })
    } else if (req.kind === 'run') {
      const s = sessions.get(req.key)
      if (!s) throw new Error(`model ${req.key} is not loaded`)
      const feeds: Record<string, ort.Tensor> = {}
      for (const [k, v] of Object.entries(req.feeds)) feeds[k] = toOrt(v)
      const t0 = performance.now()
      const out = await s.run(feeds)
      const ms = performance.now() - t0
      const outputs: Record<string, WireTensor> = {}
      const transfer: Transferable[] = []
      for (const [k, v] of Object.entries(out)) {
        const w = fromOrt(v)
        outputs[k] = w
        transfer.push(w.data.buffer as ArrayBuffer)
      }
      reply({ id: req.id, ok: true, kind: 'run', ms, outputs }, transfer)
    } else if (req.kind === 'release') {
      await sessions.get(req.key)?.release()
      sessions.delete(req.key)
      reply({ id: req.id, ok: true, kind: 'release' })
    }
  } catch (e) {
    reply({ id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}

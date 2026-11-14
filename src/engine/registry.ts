// One thin, uniform handle per module, for callers that want to treat the six engines alike
// (a shared loading bar, a home screen, a sample picker). Nothing inside the engines changes:
// analyze(), replay() and act() keep their own signatures and are reached through `handle.engine`.
//
//   import { modules, registry } from '../engine/registry'
//   await registry.spikecount.load((fraction, label) => bar.set(fraction, label))
//   const samples = await registry.spikecount.listSamples()          // a Promise for all six
//   const r = await registry.spikecount.engine.analyze(samples[0].id)
//   const status = statusFrom('spikecount', registry.spikecount.engine.act(r))   // see ./status.ts
//
// Importing this file imports all six engines' code (no model is downloaded until load()).
import { modelStatus, preferBackends, type Backend, type ModelStatus } from '../lib/infer/client'
import * as braindrift from './braindrift'
import * as bubblegrade from './bubblegrade'
import * as garnmeter from './garnmeter'
import * as spikecount from './spikecount'
import * as tracktrace from './tracktrace'
import type { EngineInfo, ModuleId, Sample } from './types'
import * as veinsqueeze from './veinsqueeze'

export const engines = { tracktrace, bubblegrade, spikecount, veinsqueeze, braindrift, garnmeter }
export type Engines = typeof engines

/** Uniform loading progress: a fraction 0..1 that never goes backwards, and a short plain label. */
export type LoadProgress = (fraction: number, label: string) => void

export interface LoadResult {
  /** What the module's models really run on: 'wasm' only when every model is on wasm. */
  backend: Backend
  /** True when at least one model had to leave its first-choice backend. */
  fellBack: boolean
  /** Per model: key, real backend, and why it fell back. */
  models: ModelStatus[]
  /** Wall time of this load() call in ms (near 0 when already loaded). */
  ms: number
}

export interface ModuleHandle<K extends ModuleId = ModuleId> {
  id: K
  /** Display name, as written on screen. */
  name: string
  /** The engine's own info (models, bytes, live, notes). */
  info: EngineInfo
  /** True when the live model is light enough for a phone; otherwise phones use engine.replay(). */
  phoneLive: boolean
  /** Loads the module's models. Safe to call many times. */
  load(onProgress?: LoadProgress): Promise<LoadResult>
  /** The shipped demo inputs. */
  listSamples(): Promise<Sample[]>
  /** The real backend of each loaded model right now (empty before load()). */
  backends(): ModelStatus[]
  /** The module's own engine: analyze(), replay(), act() and its extras, unchanged. */
  engine: Engines[K]
}

// Garn Meter's model is tiny and runs about 5-14x faster per window on wasm than on WebGPU (models/README.md
// section 5), so its model key asks for wasm first. This only sets the order loadModel tries; the engine is
// untouched. Its own `timing.backend` still reports the page-wide choice: use handle.backends() for the truth.
for (const m of garnmeter.info.models) preferBackends(m.key, ['wasm'])

const clamp = (f: number) => (Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : 0)

function statusesOf(info: EngineInfo): ModelStatus[] {
  return info.models.map((m) => modelStatus(m.key)).filter((s): s is ModelStatus => s !== null)
}

function handle<K extends ModuleId>(
  id: K,
  name: string,
  engine: Engines[K],
  info: EngineInfo,
  /** Calls the engine's own load() and translates its progress shape to (fraction, label). */
  run: (tell: LoadProgress) => Promise<unknown>,
  list: () => Sample[] | Promise<Sample[]>,
): ModuleHandle<K> {
  return {
    id,
    name,
    info,
    phoneLive: info.phoneLive,
    engine,
    async load(onProgress) {
      const t0 = performance.now()
      let top = 0
      const tell: LoadProgress = (f, label) => {
        top = Math.max(top, clamp(f))
        onProgress?.(top, label)
      }
      tell(0, 'Starting')
      await run(tell)
      tell(1, 'Ready')
      const models = statusesOf(info)
      return {
        backend: models.length && models.every((s) => s.backend === 'wasm') ? 'wasm' : models.length ? 'webgpu' : 'wasm',
        fellBack: models.some((s) => s.fellBack),
        models,
        ms: performance.now() - t0,
      }
    },
    listSamples: async () => list(),
    backends: () => statusesOf(info),
  }
}

export const registry: { [K in ModuleId]: ModuleHandle<K> } = {
  // TrackTrace: load(onProgress(fraction, stage)) already has the shared shape.
  tracktrace: handle('tracktrace', 'TrackTrace', tracktrace, tracktrace.info, (tell) => tracktrace.load((f, stage) => tell(f, f >= 1 ? 'Ready' : stage)), tracktrace.listSamples),

  // BubbleGrade: { phase: download | verify | session | ready, loaded, total } in bytes.
  bubblegrade: handle(
    'bubblegrade',
    'BubbleGrade',
    bubblegrade,
    bubblegrade.info,
    (tell) =>
      bubblegrade.load((p) => {
        if (p.phase === 'download') tell(0.9 * (p.total ? p.loaded / p.total : 0), 'Downloading model')
        else if (p.phase === 'verify') tell(0.92, 'Checking model')
        else if (p.phase === 'session') tell(0.95, 'Starting model')
        else tell(1, 'Ready')
      }),
    bubblegrade.listSamples,
  ),

  // SpikeCount: { stage: init | outliner | grader | ready, loadedBytes, totalBytes }; listSamples() is synchronous.
  spikecount: handle(
    'spikecount',
    'SpikeCount',
    spikecount,
    spikecount.info,
    (tell) =>
      spikecount.load((p) => {
        const f = p.totalBytes ? p.loadedBytes / p.totalBytes : 0
        if (p.stage === 'init') tell(0, 'Starting')
        else if (p.stage === 'outliner') tell(Math.max(0.02, f), 'Loading the cell outliner')
        else if (p.stage === 'grader') tell(f, 'Loading the shape grader')
        else tell(1, 'Ready')
      }),
    spikecount.listSamples,
  ),

  // VeinSqueeze: a bare number that jumps 0, 0.1, 1.
  veinsqueeze: handle('veinsqueeze', 'VeinSqueeze', veinsqueeze, veinsqueeze.info, (tell) => veinsqueeze.load((p) => tell(p, p >= 1 ? 'Ready' : p > 0 ? 'Loading model' : 'Starting')), veinsqueeze.listSamples),

  // BrainDrift: { stage: init | model | ready, ms }.
  braindrift: handle(
    'braindrift',
    'BrainDrift',
    braindrift,
    braindrift.info,
    (tell) => braindrift.load((p) => (p.stage === 'ready' ? tell(1, 'Ready') : p.stage === 'model' ? tell(0.1, 'Loading model') : tell(0, 'Starting'))),
    braindrift.listSamples,
  ),

  // Garn Meter: load(onProgress(fraction, what)) already has the shared shape.
  garnmeter: handle('garnmeter', 'Garn Meter', garnmeter, garnmeter.info, (tell) => garnmeter.load((f, what) => tell(f, f >= 1 ? 'Ready' : what)), garnmeter.listSamples),
}

/** The six handles in pitch order. */
export const modules: ModuleHandle[] = [registry.tracktrace, registry.bubblegrade, registry.spikecount, registry.veinsqueeze, registry.braindrift, registry.garnmeter]

export function getModule<K extends ModuleId>(id: K): ModuleHandle<K> {
  return registry[id]
}

/**
 * Loads several modules one after another with one shared progress bar. Each module's share of the bar is
 * its model size. Default: all six. A module that fails does not stop the rest; it comes back under `failed`.
 */
export async function loadAll(onProgress?: (fraction: number, label: string, id: ModuleId) => void, ids: ModuleId[] = modules.map((m) => m.id)) {
  const size = (id: ModuleId) => registry[id].info.models.reduce((s, m) => s + m.bytes, 0) || 1
  const total = ids.reduce((s, id) => s + size(id), 0)
  let done = 0
  const loaded: Partial<Record<ModuleId, LoadResult>> = {}
  const failed: Partial<Record<ModuleId, string>> = {}
  for (const id of ids) {
    const h = registry[id]
    try {
      loaded[id] = await h.load((f, label) => onProgress?.((done + f * size(id)) / total, `${h.name}: ${label}`, id))
    } catch (e) {
      failed[id] = e instanceof Error ? e.message : String(e)
    }
    done += size(id)
    onProgress?.(done / total, `${h.name}: ${failed[id] ? 'failed' : 'Ready'}`, id)
  }
  return { loaded, failed }
}

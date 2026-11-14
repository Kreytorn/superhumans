// Shared shapes for the six model engines. An engine is pure TypeScript with no UI: it loads a
// module's ONNX models through src/lib/infer/client.ts, prepares inputs, runs the real model and
// turns the outputs into data a screen can draw. Each module's engine lives in src/engine/<module>/.

export type ModuleId = 'tracktrace' | 'bubblegrade' | 'spikecount' | 'veinsqueeze' | 'braindrift' | 'garnmeter'

/** One ONNX file an engine loads. `path` is relative to the app base (e.g. "spikecount/spike_outliner.onnx"). */
export interface ModelFile {
  key: string
  path: string
  bytes: number
  sha256?: string
}

export interface EngineInfo {
  id: ModuleId
  models: ModelFile[]
  /** True when analyze() runs the real model in the browser (false = replay of precomputed outputs only). */
  live: boolean
  /** True when the live path is light enough for a phone. */
  phoneLive: boolean
  notes?: string
}

/** A demo input the module ships. ids are stable, URL-safe and contain no personal data. */
export interface Sample {
  id: string
  label: string
  /** Never seen in training. */
  heldOut: boolean
  meta?: Record<string, string | number | boolean>
}

/** Shared severity scale for the "what to do next" decision, independent of colours. */
export type Severity = 'nominal' | 'watch' | 'caution' | 'warning' | 'critical'

/** A citation: a short label shown inline and a full reference (URL, DOI or document id). */
export interface Source {
  label: string
  ref: string
}

/** The module's "what to do next" (ACT) decision for one result. */
export interface ActDecision {
  /** The module's own tier index, 0 = nothing to do. */
  tier: number
  /** Tier name, verbatim from the module plan. */
  tierName: string
  severity: Severity
  /** Who acts, in plain words: "self", "crew medical officer", "flight surgeon", "ground team". */
  whoActs: string
  /** One plain action line. */
  headline: string
  actions: string[]
  /** Why this tier fired, in plain words with the numbers that triggered it. */
  trigger: string
  /** True when the threshold is our own product rule rather than a cited standard. */
  ourRule: boolean
  sources: Source[]
  /** Fixed honesty lines that must accompany this decision wherever it is shown. */
  caveats?: string[]
}

export interface Timing {
  backend: 'webgpu' | 'wasm' | 'precomputed'
  ms: number
}

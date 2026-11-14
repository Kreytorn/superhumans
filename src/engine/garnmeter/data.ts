// Fetching and decoding of the shipped files in public/garnmeter/. Works offline (all files are local).
import type { Cue } from './result'

let base = `${import.meta.env.BASE_URL}garnmeter/`

/** Override where the module's files live (default: "<app base>garnmeter/"). */
export function setAssetBase(url: string) {
  base = url.endsWith('/') ? url : `${url}/`
}
export function assetPath(rel: string): string {
  return base + rel
}
function assetUrl(rel: string): string {
  return new URL(assetPath(rel), document.baseURI).href
}

/** Fetches bytes; gunzips with DecompressionStream when the payload starts with the gzip magic (a server may already have decoded it). */
export async function fetchBytes(rel: string): Promise<Uint8Array> {
  const res = await fetch(assetUrl(rel))
  if (!res.ok) throw new Error(`garnmeter: ${rel} -> HTTP ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return buf
}

export async function fetchJson<T>(rel: string): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await fetchBytes(rel))) as T
}

export interface SessionMeta {
  label: string
  fs: number
  channels: string[]
  n_samples: number
  sigma_c: number[]
  baseline: { start: number; length: number; reference_window: [number, number] }
  trials: { index: number; start: number; length: number; cue: Cue; level: number; ids: number; garn_reported: number }[]
  windows: { length: number; per_trial_end_s: number[] }
  electrodes: Record<string, [number, number]>
  model: { G_y: number; G_r: number; tier: 'A' | 'B' | 'C'; bin_garn_means: number[] }
  playback_note: string
}

export interface StoredOutputs {
  n_windows: number
  windows: { trial: number; end_s: number; start_sample: number; p_cum: [number, number, number]; garn: number; coupling: number[][] }[]
  baseline_reference: { p_cum: [number, number, number]; garn: number; coupling: number[][] }
}

export interface Topomap {
  channels: string[]
  bands: Record<string, [number, number]>
  method: string
  windows: { trial: number; end_s: number; theta: number[]; gamma: number[] }[]
}

export interface Card {
  tier: 'A' | 'B' | 'C'
  shipped: { net: string; label: string; params: number; badge: string; choice_reason: string }
  result_card_sentence: string
  tier_b_line: string
  notes: string[]
  cutoffs: { G_y: number; G_r: number; rule: string; yellow: Record<string, number | string>; red: Record<string, number | string>; n_trials: number }
  bin_garn_means: number[]
  networks: Record<'corrfuse_eeg' | 'eegnet', { M1: number; M1_lo: number; M1_hi: number; M2: number; M3: number; M4: number; M2_per_person_sorted: number[] }>
  floor: { M1: number; M1_lo: number; M1_hi: number; M2: number }
  scene_settings_only: { M1: number; M1_lo: number; M1_hi: number; M2: number }
  pooled_roc_ids_ge2: Record<string, { auroc: number; fpr: number[]; tpr: number[] }>
  oof_garn_by_ids_corrfuse: Record<string, { n: number; q10: number; q25: number; median: number; q75: number; q90: number; mean: number }>
  demo_person: { label: string; n_trials_all_sessions: number; auroc_ids_ge2: number; spearman_garn_vs_ids: number; auroc_session3: number }
  coverage: { people: number; trials: number }
}

export interface SessionData {
  meta: SessionMeta
  /** Channel-major [14][n_samples], microvolts after band-pass, notch and resampling. */
  eeg: Float32Array
  card: Card
  topomap: Topomap
}

let dataPromise: Promise<SessionData> | null = null
let outputsPromise: Promise<StoredOutputs> | null = null

export function loadSessionData(onProgress?: (f: number, what: string) => void): Promise<SessionData> {
  if (!dataPromise) {
    dataPromise = (async () => {
      onProgress?.(0.05, 'session metadata')
      const [meta, card, topomap] = await Promise.all([
        fetchJson<SessionMeta>('demo/session.json'),
        fetchJson<Card>('card.json'),
        fetchJson<Topomap>('precomputed/topomap.json.gz'),
      ])
      onProgress?.(0.2, 'EEG recording')
      const bytes = await fetchBytes('demo/session_eeg.bin')
      const eeg = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
      if (eeg.length !== meta.channels.length * meta.n_samples) throw new Error('garnmeter: EEG size does not match session.json')
      return { meta, eeg, card, topomap }
    })()
    dataPromise.catch(() => (dataPromise = null))
  }
  return dataPromise
}

export function loadStoredOutputs(): Promise<StoredOutputs> {
  if (!outputsPromise) {
    outputsPromise = fetchJson<StoredOutputs>('precomputed/outputs.json.gz')
    outputsPromise.catch(() => (outputsPromise = null))
  }
  return outputsPromise
}

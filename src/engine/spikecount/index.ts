// SpikeCount engine ("RedShift: in-flight hemolysis surveillance"). Pure TypeScript, no UI.
// Live path: grey 572x572 field -> standardize + reflect pad -> outliner ONNX -> argmax -> postprocess_cells ->
// 96x96 crops -> grader ONNX -> per-cell class + severity -> field metrics. Replay path: precomputed/<field>.json.
import { initInference, loadModel, runModel } from '../../lib/infer/client'
import type { EngineInfo, Sample, Timing } from '../types'
import { ACT_MARGIN_PP, ACT_CAVEATS, TIER_NAMES, decide, type CrewInputs, type SpikeActDecision } from './act'
import { assetUrl, decodeGrey, fetchJson, fitField, setAssetBase, type FittedField, type GreyImage } from './assets'
import { cellPolygon } from './contour'
import {
  CLASS_NAMES,
  CROP,
  H,
  HP,
  W,
  WP,
  argmax,
  argmaxPixels,
  cellGeometry,
  cellSeverity,
  cropCells,
  fieldMetrics,
  postprocessCells,
  standardizePad,
  type CellGeom,
  type ClassName,
  type FieldMetrics,
} from './pipeline'
import { FIELDS, SHOWCASE_ORDER, TIMELINE } from './samples'

export { setAssetBase, decodeGrey, fitField }
export { CLASS_NAMES, H, W, ACT_MARGIN_PP, TIER_NAMES, ACT_CAVEATS, FIELDS, TIMELINE, SHOWCASE_ORDER }
export type { ClassName, FieldMetrics, CrewInputs, SpikeActDecision, GreyImage, FittedField }
export * as pipeline from './pipeline'

const OUTLINER = { key: 'spikecount/outliner', path: 'spikecount/models/spike_outliner.onnx', bytes: 11627994 }
const GRADER = { key: 'spikecount/grader', path: 'spikecount/models/spike_grader.onnx', bytes: 34054967 }
const GRADER_CHUNK = 64

export const info: EngineInfo = {
  id: 'spikecount',
  models: [
    { key: OUTLINER.key, path: OUTLINER.path, bytes: OUTLINER.bytes, sha256: 'af5cc526914f3c27c4622913f52993242fca6f92cad8b3bc9762cdf49a7d67c9' },
    { key: GRADER.key, path: GRADER.path, bytes: GRADER.bytes, sha256: 'e869aca5a7f8cee76da9da5963ea7fc741c5de80cddc604449f08e1496e806bd' },
  ],
  live: true,
  phoneLive: false,
  notes:
    '45.7 MB of fp32 models; one field = 1 outliner run (about 7.1 GMAC) + 1 grader run per batch of cells (about 0.61 GMAC per cell). Phones: use replay().',
}

/** Verbatim strings that must appear wherever a result is shown (see work/Web/models/spikecount.md). */
export const HONESTY = {
  gaugeLabel: 'Spike severity score (0-4, our scale)',
  heldOut: 'Every field on screen was never seen in training.',
  data: 'Lab blood from healthy donors (RedTell DSE set, Sadafi et al. 2023, CC BY 4.0), not astronaut blood.',
  notDiagnosis: 'This does not diagnose space anemia or measure hemolysis.',
  timeline: 'Illustrative: lab blood fields from different donors, not one astronaut',
  oneFieldOneSample: 'One field stands in for one sample.',
  precomputed: 'precomputed with the same model',
  ourRule: 'The thresholds in the action card are our product rules; the actions come from NASA and clinical practice.',
  noCure: 'There is no proven drug or countermeasure for space hemolysis yet',
  userInput: 'Your own image: the models were trained only on RedTell x100 light-microscope fields (572 x 572 grey); results on other images are not validated.',
  accuracy: 'Held-out accuracy (5 folds by field, 152 fields): field spiky % r 0.933, MAE 4.57 pp; outliner F1 0.948; spiky-vs-not balanced accuracy 0.888.',
} as const

/** Reference palette from the r2 mockups (same order as CLASS_NAMES). Builders may restyle. */
export const CLASS_COLOURS: Record<ClassName, string> = {
  Disc: '#5CC8FF',
  E1: '#F2D45C',
  E2: '#FF9F43',
  E3: '#FF5C5C',
  E4: '#C7254E',
  Cup: '#E68AFF',
}

export const CLASS_PLAIN: Record<ClassName, string> = {
  Disc: 'normal disc',
  E1: 'spiky grade 1 (a few bumps)',
  E2: 'spiky grade 2',
  E3: 'spiky grade 3',
  E4: 'spiky grade 4 (ball of fine spikes)',
  Cup: 'cup-shaped, not spiky',
}

// ------------------------------------------------------------------ types
export type OutlineSource = 'model' | 'expert'

export interface SpikeCell {
  /** 1..K in label order (model outlines) or the expert cell id */
  id: number
  /** outline [[x, y], ...] in image pixels (pixel centres at integers), implicitly closed */
  polygon: [number, number][]
  /** integer crop centre [x, y] */
  center: [number, number]
  /** [x0, y0, x1, y1], end exclusive (null in replay of model outlines: not stored) */
  bbox: [number, number, number, number] | null
  area: number
  /** cut by the photo edge (draw dashed) */
  border: boolean
  /** grader probabilities, order CLASS_NAMES */
  probs: number[]
  cls: number
  className: ClassName
  /** continuous 0-4 per-cell severity (Disc..E4 weighted, Cup excluded) */
  severity: number
  /** top probability and top-1 minus top-2 gap (near 0 = borderline cell) */
  confidence: number
  margin: number
  /** annotator class for this cell (expert outlines only; -1 = unknown) */
  expertCls?: number
}

export interface SpikeLayers {
  /** standardized field z [572*572] (grader input source; reuse with gradeCells) */
  z: Float32Array
  /** per-pixel argmax [572*572]: 0 background, 1 interior, 2 edge */
  pixelClass: Uint8Array
  /** outliner softmax [3*572*572] (background, interior, edge planes) */
  pixelProbs: Float32Array
  /** cell label map [572*572]: 0 none, else cell id (expert: 255 = not annotated) */
  labelMap: Int32Array | Uint8Array
}

export interface SpikeTiming {
  total: Timing
  decodeMs: number
  outlinerMs: number
  postMs: number
  graderMs: number
}

export interface SpikeResult {
  module: 'spikecount'
  /** "field-<n>" for shipped samples, null for user input */
  sampleId: string | null
  field: number | null
  heldOut: boolean
  source: 'live' | 'precomputed'
  outlines: OutlineSource
  width: number
  height: number
  /** URL of the field image for shipped samples (null for user input; draw from layers.z or your own blob) */
  imageUrl: string | null
  cells: SpikeCell[]
  /** field numbers from the model's grades on these outlines */
  metrics: FieldMetrics
  /** the annotators' own numbers for this field ("Grades: expert"), null for user input */
  expert: FieldMetrics | null
  /** live only */
  layers: SpikeLayers | null
  /** user input only */
  input: { fit: FittedField['fit']; sourceSize: [number, number]; convertedToGrey: boolean } | null
  timing: SpikeTiming
  /** strings to show next to the result (verbatim) */
  honesty: string[]
}

// ------------------------------------------------------------------ loading
let loaded: Promise<{ backend: 'webgpu' | 'wasm'; adapter: string | null; loadMs: number }> | null = null

export interface LoadProgress {
  stage: 'init' | 'outliner' | 'grader' | 'ready'
  loadedBytes: number
  totalBytes: number
}

/** Loads both models (one shared worker). Safe to call many times. */
export function load(onProgress?: (p: LoadProgress) => void) {
  if (!loaded) {
    loaded = (async () => {
      const total = OUTLINER.bytes + GRADER.bytes
      const t0 = performance.now()
      onProgress?.({ stage: 'init', loadedBytes: 0, totalBytes: total })
      const env = await initInference()
      onProgress?.({ stage: 'outliner', loadedBytes: 0, totalBytes: total })
      await loadModel(OUTLINER.key, assetUrl('models/spike_outliner.onnx'))
      onProgress?.({ stage: 'grader', loadedBytes: OUTLINER.bytes, totalBytes: total })
      await loadModel(GRADER.key, assetUrl('models/spike_grader.onnx'))
      onProgress?.({ stage: 'ready', loadedBytes: total, totalBytes: total })
      return { backend: env.backend, adapter: env.adapter, loadMs: performance.now() - t0 }
    })()
    loaded.catch(() => {
      loaded = null
    })
  }
  return loaded
}

// ------------------------------------------------------------------ samples
const fieldOf = (id: string) => {
  const m = /^field-(\d+)$/.exec(id)
  const f = m ? Number(m[1]) : NaN
  if (!FIELDS.some((r) => r.field === f)) throw new Error(`spikecount: unknown sample ${id}`)
  return f
}

export function listSamples(): Sample[] {
  const order = [...SHOWCASE_ORDER, ...FIELDS.filter((r) => !r.showcase).map((r) => r.field)]
  return order.map((f) => {
    const r = FIELDS.find((x) => x.field === f)!
    return {
      id: `field-${f}`,
      label: r.role ? `Field ${f} (${r.role})` : `Field ${f}`,
      heldOut: true,
      meta: {
        field: f,
        showcase: r.showcase,
        role: r.role ?? '',
        timeline: r.timeline ?? '',
        image: assetUrl(`fields/${f}.png`),
        expertCells: r.expertN,
        expertSpikyPct: r.expertSpikyPct,
        expertAdvancedPct: r.expertAdvancedPct,
        modelCells: r.modelN,
        modelSpikyPct: r.modelSpikyPct,
      },
    }
  })
}

// ------------------------------------------------------------------ live inference helpers
async function runOutliner(x: Float32Array): Promise<{ probs: Float32Array; ms: number }> {
  const r = await runModel(OUTLINER.key, { image: { type: 'float32', dims: [1, 1, HP, WP], data: x } })
  return { probs: r.outputs.pixel_probs.data as Float32Array, ms: r.ms }
}

/** Grades cells of any label map (model, expert or a hand-drawn mask) on the standardized field z. */
export async function gradeCells(z: Float32Array, lab: Int32Array | Uint8Array, geoms: CellGeom[]): Promise<{ probs: Float32Array; ms: number }> {
  const out = new Float32Array(geoms.length * 6)
  let ms = 0
  for (let i = 0; i < geoms.length; i += GRADER_CHUNK) {
    const g = geoms.slice(i, i + GRADER_CHUNK)
    const crops = cropCells(z, lab, g)
    const r = await runModel(GRADER.key, { cells: { type: 'float32', dims: [g.length, 3, CROP, CROP], data: crops } })
    out.set(r.outputs.cell_probs.data as Float32Array, i * 6)
    ms += r.ms
  }
  return { probs: out, ms }
}

interface ExpertJson {
  cells: Record<string, { cls: number; name: string; border: boolean }>
  expert: { n: number; spiky_pct: number; advanced_pct: number; severity: number; counts: Record<ClassName, number> }
}

const fromPy = (m: { n: number; spiky_pct: number; advanced_pct: number; severity: number; counts: Record<ClassName, number> }): FieldMetrics => ({
  n: m.n,
  spikyPct: m.spiky_pct,
  advancedPct: m.advanced_pct,
  severity: m.severity,
  counts: { ...m.counts },
})

const expertCache = new Map<number, Promise<{ map: Uint8Array; json: ExpertJson }>>()
function loadExpert(f: number) {
  let p = expertCache.get(f)
  if (!p) {
    p = Promise.all([decodeGrey(assetUrl(`expert/${f}.png`)), fetchJson<ExpertJson>(`expert/${f}.json`)]).then(([img, json]) => ({ map: img.data, json }))
    p.catch(() => expertCache.delete(f))
    expertCache.set(f, p)
  }
  return p
}

function makeCell(lab: Int32Array | Uint8Array, g: CellGeom, probs: ArrayLike<number>, withPolygon = true): SpikeCell {
  const p = Array.from(probs)
  const cls = argmax(p)
  const sorted = [...p].sort((a, b) => b - a)
  return {
    id: g.id,
    polygon: withPolygon ? cellPolygon(lab, g) : [],
    center: [g.centerRC[1], g.centerRC[0]],
    bbox: [g.bbox.x0, g.bbox.y0, g.bbox.x1, g.bbox.y1],
    area: g.area,
    border: g.border,
    probs: p,
    cls,
    className: CLASS_NAMES[cls],
    severity: cellSeverity(p),
    confidence: sorted[0],
    margin: sorted[0] - sorted[1],
  }
}

function honestyFor(r: { source: 'live' | 'precomputed'; field: number | null }): string[] {
  const h: string[] = [HONESTY.gaugeLabel, HONESTY.data, HONESTY.notDiagnosis]
  if (r.field !== null) h.push(HONESTY.heldOut)
  else h.push(HONESTY.userInput)
  if (r.source === 'precomputed') h.push(HONESTY.precomputed)
  return h
}

export interface AnalyzeOptions {
  /** "model" (default): the outliner draws the cells. "expert": the annotators' outlines, graded live by our grader. */
  outlines?: OutlineSource
  /** skip polygon tracing (faster; the label map in layers still has the exact geometry) */
  polygons?: boolean
}

export type AnalyzeInput = string | Blob | GreyImage

/**
 * Runs the REAL models in the browser on a shipped sample ("field-184"), a dropped image file (Blob/File) or a
 * grey image. User images become 572 x 572 by fitField (centre crop at native scale; upscale only if smaller).
 */
export async function analyze(input: AnalyzeInput, opts: AnalyzeOptions = {}): Promise<SpikeResult> {
  const t0 = performance.now()
  const env = await load()
  const outlines = opts.outlines ?? 'model'
  let field: number | null = null
  let grey: Uint8Array
  let inputInfo: SpikeResult['input'] = null
  if (typeof input === 'string') {
    field = fieldOf(input)
    grey = (await decodeGrey(assetUrl(`fields/${field}.png`))).data
  } else {
    const img = input instanceof Blob ? await decodeGrey(input) : input
    const fitted = fitField(img)
    grey = fitted.data
    inputInfo = { fit: fitted.fit, sourceSize: fitted.sourceSize, convertedToGrey: !!img.converted }
  }
  if (outlines === 'expert' && field === null) throw new Error('spikecount: expert outlines exist only for shipped samples')
  const tDecode = performance.now()
  const { z, x } = standardizePad(grey)
  const seg = await runOutliner(x)
  const tSeg = performance.now()
  const { am, p } = argmaxPixels(seg.probs)
  let lab: Int32Array | Uint8Array
  let geoms: CellGeom[]
  let expertJson: ExpertJson | null = null
  if (outlines === 'expert') {
    const e = await loadExpert(field!)
    expertJson = e.json
    lab = e.map
    const ids = Object.keys(e.json.cells).map(Number).sort((a, b) => a - b)
    geoms = cellGeometry(lab, ids)
  } else {
    lab = postprocessCells(am)
    geoms = cellGeometry(lab)
    if (field !== null) expertJson = (await loadExpert(field)).json
  }
  const tPost = performance.now()
  const graded = geoms.length ? await gradeCells(z, lab, geoms) : { probs: new Float32Array(0), ms: 0 }
  const tGrade = performance.now()
  const cells = geoms.map((g, i) => {
    const c = makeCell(lab, g, graded.probs.subarray(i * 6, i * 6 + 6), opts.polygons !== false)
    if (outlines === 'expert' && expertJson) {
      c.expertCls = expertJson.cells[String(g.id)]?.cls ?? -1
      c.border = expertJson.cells[String(g.id)]?.border ?? c.border
    }
    return c
  })
  const tEnd = performance.now()
  return {
    module: 'spikecount',
    sampleId: field === null ? null : `field-${field}`,
    field,
    heldOut: field !== null,
    source: 'live',
    outlines,
    width: W,
    height: H,
    imageUrl: field === null ? null : assetUrl(`fields/${field}.png`),
    cells,
    metrics: fieldMetrics(cells.map((c) => c.cls)),
    expert: expertJson ? fromPy(expertJson.expert) : null,
    layers: { z, pixelClass: am, pixelProbs: p, labelMap: lab },
    input: inputInfo,
    timing: {
      total: { backend: env.backend, ms: tEnd - t0 },
      decodeMs: tDecode - t0,
      outlinerMs: tSeg - tDecode,
      postMs: tPost - tSeg + (tEnd - tGrade),
      graderMs: tGrade - tPost,
    },
    honesty: honestyFor({ source: 'live', field }),
  }
}

// ------------------------------------------------------------------ replay (precomputed, phone-safe)
interface PrecomputedJson {
  cells: { id: number; polygon: [number, number][]; probs: number[]; cls: number; severity: number; border: boolean; area: number; center: [number, number] }[]
  metrics: { n: number; spiky_pct: number; advanced_pct: number; severity: number; counts: Record<ClassName, number> }
  expert_outlines: { cells: { id: number; probs: number[]; cls: number; severity: number }[] }
  expert: ExpertJson['expert']
}

const preCache = new Map<number, Promise<PrecomputedJson>>()
export function loadPrecomputed(f: number) {
  let p = preCache.get(f)
  if (!p) {
    p = fetchJson<PrecomputedJson>(`precomputed/${f}.json`)
    p.catch(() => preCache.delete(f))
    preCache.set(f, p)
  }
  return p
}

/** Same result shape from the Python run of the same models (probabilities stored at 4 decimals). No ONNX needed. */
export async function replay(sampleId: string, opts: AnalyzeOptions = {}): Promise<SpikeResult> {
  const t0 = performance.now()
  const field = fieldOf(sampleId)
  const outlines = opts.outlines ?? 'model'
  const pre = await loadPrecomputed(field)
  let cells: SpikeCell[]
  if (outlines === 'expert') {
    const e = await loadExpert(field)
    const geo = cellGeometry(
      e.map,
      pre.expert_outlines.cells.map((c) => c.id),
    )
    cells = pre.expert_outlines.cells.map((c, i) => {
      const cell = makeCell(e.map, geo[i], c.probs, opts.polygons !== false)
      cell.expertCls = e.json.cells[String(c.id)]?.cls ?? -1
      cell.border = e.json.cells[String(c.id)]?.border ?? cell.border
      return cell
    })
  } else {
    cells = pre.cells.map((c) => {
      const sorted = [...c.probs].sort((a, b) => b - a)
      return {
        id: c.id,
        polygon: c.polygon,
        center: [c.center[1], c.center[0]] as [number, number],
        bbox: null,
        area: c.area,
        border: c.border,
        probs: c.probs,
        cls: c.cls,
        className: CLASS_NAMES[c.cls],
        severity: c.severity,
        confidence: sorted[0],
        margin: sorted[0] - sorted[1],
      }
    })
  }
  return {
    module: 'spikecount',
    sampleId,
    field,
    heldOut: true,
    source: 'precomputed',
    outlines,
    width: W,
    height: H,
    imageUrl: assetUrl(`fields/${field}.png`),
    cells,
    metrics: fieldMetrics(cells.map((c) => c.cls)),
    expert: fromPy(pre.expert),
    layers: null,
    input: null,
    timing: { total: { backend: 'precomputed', ms: performance.now() - t0 }, decodeMs: 0, outlinerMs: 0, postMs: 0, graderMs: 0 },
    honesty: honestyFor({ source: 'precomputed', field }),
  }
}

// ------------------------------------------------------------------ ACT
/** Model baselines of the shipped timeline's Preflight step (timeline.json, field 184). */
export const DEFAULT_BASELINES: Record<OutlineSource | 'expert_grades', { spikyPct: number; advancedPct: number; label: string }> = {
  model: { spikyPct: 5.1948, advancedPct: 2.5974, label: 'Preflight field 184, model outlines + model grades' },
  expert: { spikyPct: 5.9701, advancedPct: 1.4925, label: 'Preflight field 184, expert outlines + model grades' },
  expert_grades: { spikyPct: 0, advancedPct: 0, label: 'Preflight field 184, expert grades' },
}

/**
 * The "what to do next" decision (plan 03 section 9; our product rule). Without crew inputs the baseline is the
 * shipped Preflight step for the same outline source, with no previous sample and no symptom.
 * Pass grades: "expert" to decide on the annotators' numbers instead of the model's.
 */
export function act(result: SpikeResult, crewInputs: CrewInputs = {}, grades: 'model' | 'expert' = 'model'): SpikeActDecision {
  const m = grades === 'expert' && result.expert ? result.expert : result.metrics
  const base = grades === 'expert' ? DEFAULT_BASELINES.expert_grades : DEFAULT_BASELINES[result.outlines]
  return decide(m.spikyPct, m.advancedPct, crewInputs, base)
}

export interface TimelineStep {
  label: string
  day: number | null
  field: number
  metrics: FieldMetrics
  decision: SpikeActDecision
}

/**
 * Chains the mission timeline exactly like s5_demo.tier_series: S0/A0 = the first step's own numbers, and each
 * step passes (tier, spiky %) on as "previous". Feed it four results (live or replayed) in TIMELINE order.
 */
export function timeline(results: SpikeResult[], opts: { grades?: 'model' | 'expert'; symptomAt?: number; marginPp?: number } = {}): TimelineStep[] {
  const pick = (r: SpikeResult) => (opts.grades === 'expert' && r.expert ? r.expert : r.metrics)
  const b = pick(results[0])
  let prev: { tier: number; spikyPct: number } | null = null
  return results.map((r, i) => {
    const m = pick(r)
    const d = decide(m.spikyPct, m.advancedPct, { baseline: { spikyPct: b.spikyPct, advancedPct: b.advancedPct, label: `${TIMELINE[0].label} (field ${results[0].field ?? 'input'})` }, previous: prev, symptom: opts.symptomAt === i, marginPp: opts.marginPp }, DEFAULT_BASELINES.model)
    prev = { tier: d.tier, spikyPct: m.spikyPct }
    const step = TIMELINE[i] ?? { label: `Step ${i + 1}`, day: null, field: r.field ?? -1 }
    return { label: step.label, day: step.day, field: r.field ?? -1, metrics: m, decision: d }
  })
}

/** Convenience: the four timeline fields, live (analyze) or replayed. */
export async function runTimeline(mode: 'live' | 'replay' = 'replay', outlines: OutlineSource = 'model'): Promise<SpikeResult[]> {
  const out: SpikeResult[] = []
  for (const s of TIMELINE) out.push(mode === 'live' ? await analyze(`field-${s.field}`, { outlines }) : await replay(`field-${s.field}`, { outlines }))
  return out
}

// ------------------------------------------------------------------ shipped extras (precomputed media)
export const ASSETS = {
  manifest: () => fetchJson<unknown>('manifest.json'),
  evidence: () => fetchJson<unknown>('evidence.json'),
  confusion: () => fetchJson<unknown>('confusion.json'),
  gallery: () => fetchJson<unknown>('gallery.json'),
  strip: () => fetchJson<unknown>('strip.json'),
  timeline: () => fetchJson<unknown>('timeline.json'),
  showcase: () => fetchJson<unknown>('showcase.json'),
  url: assetUrl,
}

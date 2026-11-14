// Browser parity test 8 (plan 03 section 6): the engine vs the stored Python onnxruntime-CPU outputs.
// Opened by app/parity/spikecount.html; "#?backend=wasm" forces wasm; "&all=1" adds all 31 fields.
import { initInference } from '../../lib/infer/client'
import { assetUrl, decodeGrey, fetchGz, fetchJson } from './assets'
import { analyze, gradeCells, load, replay, runTimeline, timeline, type SpikeResult } from './index'
import { H, W, argmaxPixels, cellGeometry, postprocessCells, standardizePad, unpadPlane, HP, WP } from './pipeline'
import { runModel } from '../../lib/infer/client'

interface Case {
  name: string
  maxAbsDiff: number
  tol: number
  pass: boolean
  ms: number
  detail?: string
}

interface RefCell {
  id: number
  center: [number, number]
  area?: number
  cls: number
  probs: number[]
}

interface ParityJson {
  n_cells: number
  classes: number[]
  cells: RefCell[]
  expert_outlines: { n_cells: number; classes: number[]; cells: RefCell[] }
}

const out = document.getElementById('out')!
const cases: Case[] = []
const notes: string[] = []
const hash = new URLSearchParams(location.hash.split('?')[1] ?? '')
const ALL = hash.get('all') === '1'
const log = (s: string) => {
  out.textContent += s + '\n'
}

/** Probability tolerance: the reference is fp32 ORT CPU, stored at 6 (parity) or 4 (precomputed) decimals. */
function tolFor(backend: string, decimals: number) {
  const store = 0.5 * 10 ** -decimals
  return (backend === 'webgpu' ? 1e-3 : 1e-4) + store
}

/**
 * Compares cells in id order. Count, centres and areas must match exactly. A class may differ only when the
 * reference itself is a near tie (top-2 gap < 2 x tol), which is reported as borderline.
 */
function compareCells(
  name: string,
  got: { center: [number, number]; area: number; cls: number; probs: ArrayLike<number> }[],
  ref: RefCell[],
  tol: number,
  ms: number,
  geometry = true,
): Case {
  const issues: string[] = []
  if (got.length !== ref.length) {
    return { name, maxAbsDiff: Infinity, tol, pass: false, ms, detail: `cell count ${got.length} vs ${ref.length}` }
  }
  let maxd = 0
  let geomBad = 0
  let clsBad = 0
  let borderline = 0
  for (let i = 0; i < ref.length; i++) {
    const g = got[i]
    const r = ref[i]
    if (geometry && (g.center[0] !== r.center[0] || g.center[1] !== r.center[1] || (r.area !== undefined && g.area !== r.area))) geomBad++
    for (let k = 0; k < 6; k++) maxd = Math.max(maxd, Math.abs(g.probs[k] - r.probs[k]))
    if (g.cls !== r.cls) {
      const s = [...r.probs].sort((a, b) => b - a)
      if (s[0] - s[1] < 2 * tol) borderline++
      else clsBad++
    }
  }
  if (geomBad) issues.push(`${geomBad} cells with different centre/area`)
  if (clsBad) issues.push(`${clsBad} cells with a different class`)
  if (borderline) issues.push(`${borderline} borderline class flips (reference near tie)`)
  return {
    name,
    maxAbsDiff: maxd,
    tol,
    pass: geomBad === 0 && clsBad === 0 && maxd <= tol,
    ms,
    detail: `${ref.length} cells, classes ${ref.length - clsBad - borderline}/${ref.length} identical${issues.length ? '; ' + issues.join('; ') : ''}`,
  }
}

function shoelace(p: [number, number][]) {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i]
    const [x2, y2] = p[(i + 1) % p.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a) / 2
}

;(async () => {
  try {
    const env = await initInference()
    const l = await load()
    log(`backend ${env.backend} (${env.adapter ?? 'no adapter'}), models loaded in ${l.loadMs.toFixed(0)} ms`)
    const backend = env.backend

    // ---- 1-2: PNG decode + standardize_pad vs the stored Python input tensor; 3-6: models + post-processing
    for (const f of [96, 184]) {
      const ref = await fetchJson<ParityJson>(`parity/${f}.json`)
      const bin = new Float32Array(await fetchGz(`parity/${f}.bin.gz`))
      let t = performance.now()
      const img = await decodeGrey(assetUrl(`fields/${f}.png`))
      const { x } = standardizePad(img.data)
      let d = 0
      for (let i = 0; i < bin.length; i++) d = Math.max(d, Math.abs(x[i] - bin[i]))
      cases.push({ name: `standardize_pad field ${f} (PNG -> tensor)`, maxAbsDiff: d, tol: 1e-5, pass: d <= 1e-5 && img.width === W && img.height === H, ms: performance.now() - t })

      // models on the exact Python input
      t = performance.now()
      const z = unpadPlane(bin)
      const r = await runModel('spikecount/outliner', { image: { type: 'float32', dims: [1, 1, HP, WP], data: bin.slice() } })
      const segMs = performance.now() - t
      const { am } = argmaxPixels(r.outputs.pixel_probs.data as Float32Array)
      let nInt = 0
      let nEdge = 0
      for (let i = 0; i < am.length; i++) {
        if (am[i] === 1) nInt++
        else if (am[i] === 2) nEdge++
      }
      const lab = postprocessCells(am)
      const geoms = cellGeometry(lab)
      const g = await gradeCells(z, lab, geoms)
      const got = geoms.map((ge, i) => {
        const p = g.probs.subarray(i * 6, i * 6 + 6)
        let k = 0
        for (let j = 1; j < 6; j++) if (p[j] > p[k]) k = j
        return { center: ge.centerRC, area: ge.area, cls: k, probs: p }
      })
      const c = compareCells(`field ${f}: outliner -> postprocess_cells -> grader (model outlines)`, got, ref.cells, tolFor(backend, 6), performance.now() - t)
      const pj = ref as unknown as { n_interior_px: number; n_edge_px: number }
      // the outliner's per-pixel argmax must match Python exactly (pixel counts are part of the pass rule)
      if (nInt !== pj.n_interior_px || nEdge !== pj.n_edge_px) c.pass = false
      c.detail += `; interior px ${nInt} vs ${pj.n_interior_px}, edge px ${nEdge} vs ${pj.n_edge_px}; outliner ${segMs.toFixed(0)} ms, grader ${g.ms.toFixed(0)} ms`
      cases.push(c)
      log(`${c.name}: ${c.pass ? 'pass' : 'FAIL'} ${c.detail}`)

      // grader on the expert outlines
      t = performance.now()
      const ex = await decodeGrey(assetUrl(`expert/${f}.png`))
      const eg = cellGeometry(ex.data, ref.expert_outlines.cells.map((cc) => cc.id))
      const ge = await gradeCells(z, ex.data, eg)
      const gotE = eg.map((gg, i) => {
        const p = ge.probs.subarray(i * 6, i * 6 + 6)
        let k = 0
        for (let j = 1; j < 6; j++) if (p[j] > p[k]) k = j
        return { center: gg.centerRC, area: gg.area, cls: k, probs: p }
      })
      const ce = compareCells(`field ${f}: grader on expert outlines`, gotE, ref.expert_outlines.cells, tolFor(backend, 6), performance.now() - t)
      cases.push(ce)
      log(`${ce.name}: ${ce.pass ? 'pass' : 'FAIL'} ${ce.detail}`)
    }

    // ---- 7: the public analyze() on the 4 timeline fields vs precomputed/<f>.json, then the ACT tiers
    const t7 = performance.now()
    const live = await runTimeline('live')
    for (const r of live) {
      const pre = await fetchJson<{ cells: RefCell[] }>(`precomputed/${r.field}.json`)
      const got = r.cells.map((c) => ({ center: [c.center[1], c.center[0]] as [number, number], area: c.area, cls: c.cls, probs: c.probs }))
      const c = compareCells(`analyze(field-${r.field}) vs precomputed`, got, pre.cells, tolFor(backend, 4), r.timing.total.ms)
      c.detail += `; total ${r.timing.total.ms.toFixed(0)} ms (outliner ${r.timing.outlinerMs.toFixed(0)}, grader ${r.timing.graderMs.toFixed(0)}, post ${r.timing.postMs.toFixed(0)})`
      cases.push(c)
      log(`${c.name}: ${c.pass ? 'pass' : 'FAIL'} ${c.detail}`)
    }
    const tl = await fetchJson<{ steps: { model: { tier: number; spiky_pct: number } }[] }>('timeline.json')
    const tiersGot = timeline(live).map((s) => s.decision.tier)
    const tiersRef = tl.steps.map((s) => s.model.tier)
    const spikyDiff = Math.max(...live.map((r, i) => Math.abs(r.metrics.spikyPct - tl.steps[i].model.spiky_pct)))
    cases.push({
      name: 'ACT tiers on the live timeline vs timeline.json (model)',
      maxAbsDiff: spikyDiff,
      tol: 1e-3,
      pass: tiersGot.join() === tiersRef.join() && spikyDiff <= 1e-3,
      ms: performance.now() - t7,
      detail: `tiers ${tiersGot.join(',')} vs ${tiersRef.join(',')}; maxAbsDiff = spiky % difference`,
    })

    // ---- 8: polygons (equivalent, not bit-identical): relative area of each outline vs Python's polygon
    const t8 = performance.now()
    let worst = 0
    let nPoly = 0
    for (const r of live) {
      const pre = await fetchJson<{ cells: { polygon: [number, number][] }[] }>(`precomputed/${r.field}.json`)
      r.cells.forEach((c, i) => {
        const a = shoelace(c.polygon)
        const b = shoelace(pre.cells[i].polygon)
        worst = Math.max(worst, Math.abs(a - b) / Math.max(b, 1))
        nPoly++
      })
    }
    cases.push({ name: 'outline polygons vs Python polygons (relative area)', maxAbsDiff: worst, tol: 0.05, pass: worst <= 0.05, ms: performance.now() - t8, detail: `${nPoly} polygons` })

    // ---- 9: replay() reproduces the stored metrics
    const t9 = performance.now()
    const rp: SpikeResult = await replay('field-96')
    const pre96 = await fetchJson<{ metrics: { spiky_pct: number; n: number } }>('precomputed/96.json')
    const dr = Math.abs(rp.metrics.spikyPct - pre96.metrics.spiky_pct)
    cases.push({ name: 'replay(field-96) metrics', maxAbsDiff: dr, tol: 1e-3, pass: dr <= 1e-3 && rp.metrics.n === pre96.metrics.n, ms: performance.now() - t9 })

    // ---- 10: the user-input path (a dropped file) on the same PNG gives the same cells as the sample path
    const t10 = performance.now()
    const blob = await (await fetch(assetUrl('fields/121.png'))).blob()
    const rb = await analyze(blob, { polygons: false })
    const r121 = live[1]
    let db = rb.cells.length === r121.cells.length ? 0 : Infinity
    if (db === 0) rb.cells.forEach((c, i) => c.probs.forEach((p, k) => (db = Math.max(db, Math.abs(p - r121.cells[i].probs[k])))))
    cases.push({ name: 'analyze(Blob of fields/121.png) vs analyze("field-121")', maxAbsDiff: db, tol: 1e-6, pass: db <= 1e-6 && rb.input?.fit === 'exact', ms: performance.now() - t10, detail: `fit ${rb.input?.fit}` })

    // ---- optional: every shipped field end to end
    if (ALL) {
      const { listSamples } = await import('./index')
      for (const s of listSamples()) {
        const r = await analyze(s.id, { polygons: false })
        const pre = await fetchJson<{ cells: RefCell[] }>(`precomputed/${r.field}.json`)
        const got = r.cells.map((c) => ({ center: [c.center[1], c.center[0]] as [number, number], area: c.area, cls: c.cls, probs: c.probs }))
        const c = compareCells(`all: analyze(${s.id})`, got, pre.cells, tolFor(backend, 4), r.timing.total.ms)
        cases.push(c)
        log(`${c.name}: ${c.pass ? 'pass' : 'FAIL'} ${c.detail}`)
      }
    }

    notes.push(
      'Tolerances: probabilities 1e-3 on WebGPU and 1e-4 on wasm plus half the storage rounding of the reference (6 decimals in parity/*.json, 4 in precomputed/*.json). Counts, centres, areas, classes and ACT tiers must match exactly; a class flip is excused only when the reference top-2 gap is below 2 x tol (reported as borderline).',
      'Polygons are traced in TypeScript (marching squares + Douglas-Peucker 1.0 px), equivalent to skimage find_contours + approximate_polygon but not bit-identical, so they are checked by enclosed area (5%).',
    )
    const report = { backend, adapter: env.adapter, loadMs: l.loadMs, cases, notes }
    ;(window as unknown as { __parity: unknown }).__parity = report
    log(JSON.stringify(report, null, 2))
    document.body.dataset.parity = cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e), stack: (e as Error).stack, cases, notes }
    log(String(e))
    document.body.dataset.parity = 'error'
  }
})()

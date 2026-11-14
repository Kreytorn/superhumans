// BrainDrift parity: the browser engine vs the stored Python outputs.
// References: flight_f000/f100_seg + brain-small_seg (stored Model B argmax, bd_flight / bd_demo_assets, torch fp32),
// meta/braindrift.json (stored ventricle mL, change %, rise mm, rise columns from bd_flight.json), and
// parity/ref_* (onnxruntime CPU in Python, r3: softmax of coronal slice 104 of f000; top-surface heights of f000, f100).
import { initInference } from '../../lib/infer/client'
import { fetchF32, fetchVolume, fetchMeta, NI, NK } from './assets'
import { act, analyzeBrain, analyzeFlight, analyzeSlice, load, replay } from './index'
import type { FlightResult } from './result'
import { countDiff } from './readouts'

type Case = { name: string; maxAbsDiff: number; tol: number; pass: boolean; ms: number; note?: string }
const out = document.getElementById('out')!
const cases: Case[] = []
function add(name: string, diff: number, tol: number, ms: number, note?: string) {
  cases.push({ name, maxAbsDiff: diff, tol, pass: Number.isFinite(diff) && diff <= tol, ms: Math.round(ms), note })
  out.textContent = JSON.stringify(cases, null, 2)
}

function topDiff(a: Float64Array, ref: Float32Array): { max: number; nanMismatch: number } {
  let max = 0
  let nanMismatch = 0
  for (let q = 0; q < NI * NK; q++) {
    const r = ref[q] < 0 ? Number.NaN : ref[q]
    if (Number.isNaN(r) !== Number.isNaN(a[q])) nanMismatch++
    else if (!Number.isNaN(r)) max = Math.max(max, Math.abs(a[q] - r))
  }
  return { max, nanMismatch }
}

;(async () => {
  try {
    const env = await initInference()
    const l = await load()
    const meta = await fetchMeta()
    const [f0, f1] = [meta.flight.frames[0], meta.flight.frames[4]]

    // 1-4: live flight pair (pre f000 + post f100), softmax of slice 104 kept for case 1
    let t = performance.now()
    const pre = await analyzeBrain(f0.id, { keepSoftmaxOf: [104] })
    const preMs = performance.now() - t
    const refSm = await fetchF32('parity/ref_f000_k104_softmax.f32')
    const sm = pre.softmax.get(104)!
    let d = 0
    for (let q = 0; q < refSm.length; q++) d = Math.max(d, Math.abs(sm[q] - refSm[q]))
    add('f000 slice 104 softmax vs Python ORT CPU (max abs prob)', d, 1e-3, preMs)

    const segRef0 = await fetchVolume(f0.seg)
    add('f000 argmax: fraction of voxels differing from stored seg', countDiff(pre.seg, segRef0) / segRef0.length, 1e-3, 0, 'plan gate: >= 99.9% same argmax')
    add('f000 ventricle voxels vs stored (17,476)', Math.abs(pre.ventricleVoxels - Math.round(f0.storedVentricleMl * 1000)), 5, 0, '5 voxels = 0.005 mL: borderline voxels only')

    const topRef0 = await fetchF32('parity/ref_f000_top.f32')
    const td0 = topDiff(pre.top!, topRef0)
    add('f000 top-surface height vs Python ORT CPU (max abs, voxels)', td0.max, 0.02, 0, `NaN pattern mismatches: ${td0.nanMismatch}`)
    add('f000 top-surface NaN pattern mismatches', td0.nanMismatch, 0, 0)

    t = performance.now()
    const fl = (await analyzeFlight(f1.id)) as FlightResult
    const postMs = performance.now() - t
    const segRef1 = await fetchVolume(f1.seg)
    add('f100 argmax: fraction of voxels differing from stored seg', countDiff(fl.post.seg, segRef1) / segRef1.length, 1e-3, postMs)
    add('f100 ventricle voxels vs stored (19,083)', Math.abs(fl.post.ventricleVoxels - Math.round(f1.storedVentricleMl * 1000)), 5, 0)
    const topRef1 = await fetchF32('parity/ref_f100_top.f32')
    const td1 = topDiff(fl.post.top!, topRef1)
    add('f100 top-surface height vs Python ORT CPU (max abs, voxels)', td1.max, 0.02, 0, `NaN pattern mismatches: ${td1.nanMismatch}`)
    add('flight ventricle change % vs stored 9.1955 (abs pp)', Math.abs((fl.measured.ventricleChangePct ?? NaN) - f1.storedVentricleChangePct), 0.05, 0)
    add('flight vertex rise mm vs stored 2.3676 (abs mm)', Math.abs((fl.measured.riseMm ?? NaN) - f1.storedRiseMm), 0.005, 0)
    add('flight rise columns vs stored 317 (exact)', Math.abs(fl.measured.riseColumns - f1.storedRiseColumns), 0, 0)

    const a = act(fl)
    const tiers = a.rows.filter((r) => r.tier > 0).map((r) => r.tierName).join(' | ')
    const want = 'Tier 4b | Tier 4c, re-flight clock | Tier 4a, post-landing'
    add('ACT tiers at f100 (exact)', tiers === want ? 0 : 1, 0, 0, tiers)

    // 5: a second held-out brain (smallest ventricles)
    t = performance.now()
    const small = await analyzeBrain('brain-small')
    const smMs = performance.now() - t
    const segRefS = await fetchVolume('compare/brain-small_seg.u8.gz')
    add('brain-small argmax: fraction differing from stored seg', countDiff(small.seg, segRefS) / segRefS.length, 1e-3, smMs)
    add('brain-small ventricle mL vs stored 10.99 (abs mL)', Math.abs(small.ventricleMl - 10.987), 0.005, 0)

    // 5b: the largest-ventricle brain (stored 162,049 voxels; independent Python ORT CPU run r3 also gives 162,049)
    t = performance.now()
    const large = await analyzeBrain('brain-large')
    const lgMs = performance.now() - t
    const segRefL = await fetchVolume('compare/brain-large_seg.u8.gz')
    add('brain-large argmax: fraction differing from stored seg', countDiff(large.seg, segRefL) / segRefL.length, 1e-3, lgMs)
    add('brain-large ventricle voxels vs stored (162,049)', Math.abs(large.ventricleVoxels - 162049), 5, 0)

    // 5c: the single-slice path (analyzeSlice runs only slice 104 with its two neighbours) vs the same reference
    t = performance.now()
    const one = await analyzeSlice(f0.id, 104)
    let d1 = 0
    for (let q = 0; q < refSm.length; q++) d1 = Math.max(d1, Math.abs(one.softmax[q] - refSm[q]))
    add('analyzeSlice f000 k=104 softmax vs Python ORT CPU (max abs prob)', d1, 1e-3, performance.now() - t)
    let argOk = 0
    for (let q = 0; q < 176 * 176; q++) if (one.seg[q] === segRef0[q * NK + 104]) argOk++
    add('analyzeSlice f000 k=104 argmax: fraction differing from stored seg', 1 - argOk / (176 * 176), 1e-3, 0)
    const empty = await analyzeSlice(f0.id, 0)
    let bg = 0
    for (let q = 0; q < 176 * 176; q++) bg = Math.max(bg, Math.abs(empty.softmax[q] - 1))
    add('analyzeSlice on a slice without brain: P(background) = 1', bg, 0, 0)

    // 6: replay path (no model) reproduces the stored numbers exactly
    t = performance.now()
    const rp = (await replay(f1.id)) as FlightResult
    add('replay f100 ventricle change % vs stored (abs pp)', Math.abs((rp.measured.ventricleChangePct ?? NaN) - f1.storedVentricleChangePct), 1e-3, performance.now() - t)

    const report = {
      backend: env.backend,
      adapter: env.adapter,
      threads: env.threads,
      isolated: env.isolated,
      loadMs: Math.round(l.ms),
      cases,
      notes: {
        brainMs: { f000: Math.round(preMs), f100: Math.round(postMs), brainSmall: Math.round(smMs), brainLarge: Math.round(lgMs) },
        calls: pre.timing.calls,
        msPerCallMedian: Math.round(pre.timing.msPerCallMedian),
        ventricleMl: { f000: pre.ventricleMl, f100: fl.post.ventricleMl, brainSmall: small.ventricleMl },
        measured: fl.measured,
        diffVoxels: { f000: countDiff(pre.seg, segRef0), f100: countDiff(fl.post.seg, segRef1), brainSmall: countDiff(small.seg, segRefS) },
        act: { tier: a.tierName, severity: a.severity, whoActs: a.whoActs },
      },
    }
    ;(window as unknown as { __parity: unknown }).__parity = report
    out.textContent = JSON.stringify(report, null, 2)
    document.body.dataset.parity = cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e), stack: (e as Error).stack, cases }
    out.textContent = String(e)
    document.body.dataset.parity = 'error'
  }
})()

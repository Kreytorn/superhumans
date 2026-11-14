// Parity test: the browser engine vs the stored PyTorch outputs (work/GarnMeter/out/garn_demo_outputs.json).
// Run: node scripts/parity.mjs garnmeter --port 5196 [--wasm]
import { initInference } from '../../lib/infer/client'
import { analyze, analyzeWindow, act, actTimeline, load, replay, listSamples } from './index'
import { loadStoredOutputs, loadSessionData } from './data'
import { emaSeries, holdZones, levelOf } from './dsp'

// Python reference (scipy.stats.spearmanr of per-trial mean garn vs IDS on the stored outputs, garnmeter_example.py).
const REF_SPEARMAN = 0.025549320461715756

interface Case {
  name: string
  maxAbsDiff: number
  tol: number
  pass: boolean
  ms: number
}

const out = document.getElementById('out')!
const cases: Case[] = []
const notes: string[] = []
const add = (name: string, diff: number, tol: number, ms = 0) => cases.push({ name, maxAbsDiff: diff, tol, pass: diff <= tol, ms })
const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]))
  return a.length === b.length ? m : Infinity
}

;(async () => {
  try {
    const env = await initInference()
    const l = await load()
    const [stored, d, samples] = await Promise.all([loadStoredOutputs(), loadSessionData(), listSamples()])
    notes.push(`samples: ${samples.length} (session + 27 trials), none with personal data`)

    // 1. Full session, one batch (243 windows + the calibration reference window).
    const t0 = performance.now()
    const r = await analyze('user19-s3')
    const wallMs = performance.now() - t0
    const refP = stored.windows.flatMap((w) => w.p_cum)
    const refG = stored.windows.map((w) => w.garn)
    add('session p_cum (243 x 3)', maxDiff(r.windows.flatMap((w) => w.pCum), refP), 1e-4, r.timing.ms)
    add('session garn (243)', maxDiff(r.windows.map((w) => w.garn), refG), 1e-4, r.timing.ms)
    add('session coupling (243 x 196)', maxDiff(r.windows.flatMap((w) => [...w.coupling]), stored.windows.flatMap((w) => w.coupling.flat())), 1e-3, r.timing.ms)
    add('baseline reference p_cum + garn', maxDiff([...r.baseline.pCum, r.baseline.garn], [...stored.baseline_reference.p_cum, stored.baseline_reference.garn]), 1e-4)
    add('baseline reference coupling', maxDiff(r.baseline.coupling, stored.baseline_reference.coupling.flat()), 1e-3)
    add('calibration sigma, relative diff vs Python (plan rule 0.1%)', r.sigma.maxRelDiff ?? Infinity, 1e-3)
    notes.push(`session: model ${r.timing.ms.toFixed(1)} ms for 244 windows in one call (${r.perWindowMs.toFixed(3)} ms/window), wall ${wallMs.toFixed(1)} ms incl. input prep; sigma used: ${r.sigma.used}`)

    // 2. Derived values: per-trial means, session Spearman (Python reference), EEG zone trace with the hold.
    const refMeans = Array.from({ length: 27 }, (_, i) => refG.slice(i * 9, i * 9 + 9).reduce((s, v) => s + v, 0) / 9)
    add('per-trial mean garn (27)', maxDiff(r.trials.map((t) => t.modelGarnMean ?? NaN), refMeans), 1e-4)
    add('session Spearman (model trial mean vs reported IDS)', Math.abs((r.session.spearmanModelVsReported ?? NaN) - REF_SPEARMAN), 1e-9)
    const { G_y, G_r } = d.meta.model
    const refEma = emaSeries(refG)
    const refZones = holdZones(refEma, G_y, G_r)
    const zoneMis = r.windows.filter((w, i) => w.eegZone !== refZones[i]).length
    add('EEG zone trace with hold (243, discrete; reported only in Tier C)', zoneMis, 0)
    const margin = Math.min(...refEma.map((v) => Math.min(Math.abs(v - G_y), Math.abs(v - G_r))))
    const levelMis = r.windows.filter((w, i) => levelOf(w.garnEma, G_y, G_r) !== levelOf(refEma[i], G_y, G_r)).length
    notes.push(`closest smoothed garn to a cut-off: ${margin.toExponential(2)} Garn; raw level mismatches ${levelMis}`)

    // 3. Replay (stored outputs) must give the same result shape and the same decisions.
    const rp = await replay('user19-s3')
    add('replay garn vs stored', maxDiff(rp.windows.map((w) => w.garn), refG), 1e-6, rp.timing.ms)
    const tlLive = actTimeline(r).map((a) => a.tierName)
    const tlRep = actTimeline(rp).map((a) => a.tierName)
    add('ACT timeline live vs replay (27, discrete)', tlLive.filter((t, i) => t !== tlRep[i]).length, 0)
    const expected = d.meta.trials.map((t) => (t.ids >= 4 ? 'Red' : t.ids >= 2 ? 'Yellow' : 'Green'))
    add('ACT timeline vs Tier C table on reported IDS (27, discrete)', tlLive.filter((t, i) => t !== expected[i]).length, 0)
    const overrides = [1, 2, 3, 4, 7].map((ids) => act(r, { checkinIds: ids }).tierName).join(',')
    add('ACT crew check-in override 1/2/3/4/7 -> Green,Yellow,Yellow,Red,Red', overrides === 'Green,Yellow,Yellow,Red,Red' ? 0 : 1, 0)
    notes.push(`timeline: ${tlLive.join(' ')}; replay decode ${rp.timing.ms.toFixed(1)} ms`)

    // 4. The live loop of plan 06 section 8: batch 1, one call per window (trial 24, the sickest, IDS 7).
    const t24 = await analyze('user19-s3-t24', { batchSize: 1 })
    const ref24 = stored.windows.filter((w) => w.trial === 24)
    add('live loop batch 1, trial 24 garn (9)', maxDiff(t24.windows.map((w) => w.garn), ref24.map((w) => w.garn)), 1e-4, t24.timing.ms / 10)
    add('live loop batch 1, trial 24 p_cum (9 x 3)', maxDiff(t24.windows.flatMap((w) => w.pCum), ref24.flatMap((w) => w.p_cum)), 1e-4, t24.timing.ms / 10)
    notes.push(`batch-1 loop: ${(t24.timing.ms / 10).toFixed(2)} ms per window (model time, 10 calls)`)
    const off = act(t24, { atTrial: 7 })
    add('ACT at a trial outside a single-trial result: replay IDS, no EEG', off.tierName === 'Red' && off.eeg.garnEma === null ? 0 : 1, 0)
    const zy = r.windows.filter((x) => x.eegZone >= 1).length / r.windows.length
    const zr = r.windows.filter((x) => x.eegZone === 2).length / r.windows.length
    notes.push(`eegZone (with hold) yellow-or-red ${(zy * 100).toFixed(1)}%, red ${(zr * 100).toFixed(1)}% of windows`)

    // 5. Single window at an arbitrary scrub position, and a what-if perturbation runs.
    const w = await analyzeWindow(24, 8.0)
    add('analyzeWindow(24, 8.0 s) garn', Math.abs(w.outputs.garn - ref24[8].garn), 1e-4, w.timing.ms)
    const muted = await analyzeWindow(24, 8.0, { mute: ['O1', 'O2'] })
    notes.push(`what-if: muting O1+O2 on trial 24 @8 s moves garn ${w.outputs.garn.toFixed(4)} -> ${muted.outputs.garn.toFixed(4)}`)

    const report = { backend: env.backend, adapter: env.adapter, threads: env.threads, isolated: env.isolated, ortVersion: env.ortVersion, loadMs: l.loadMs, cases, notes }
    ;(window as unknown as { __parity: unknown }).__parity = report
    out.textContent = JSON.stringify(report, null, 2)
    document.body.dataset.parity = cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e), stack: (e as Error).stack, cases, notes }
    out.textContent = String(e)
    document.body.dataset.parity = 'error'
  }
})()

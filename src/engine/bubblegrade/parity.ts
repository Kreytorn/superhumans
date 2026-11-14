// BubbleGrade parity page (app/parity/bubblegrade.html). Runs the engine on the 6 shipped clips and compares with
// the stored Python outputs: PyTorch per-window p and cam (showcase.json, r2), the bubble map computed in Python from
// those, and the stitched log-mel spectrogram from an ONNX Runtime CPU run (2 clips). Discrete outputs must match exactly.
import { initInference } from '../../lib/infer/client'
import { act, analyze, bubbleMap, gunzip, listSamples, load, parseWav, replay, setAssetBase, TOO_SHORT, windowStarts } from './index'

interface RefClip {
  id: string
  nSamples: number
  windowStarts: number[]
  pSpencerGe: number[][]
  cam: number[][]
  clipP: number[]
  clipE: number
  clipG: number
  alert: boolean
  heat: number[]
  specCols: number
  logmelFile?: string
}

// Tolerances. p: plan §8.1 (< 1e-3). cam: raw logits in about [-9, +3] whose mean is the score, so 1e-2 absolute keeps
// any sigmoid(cam + b3) within 2.5e-3; logmel: normalised dB/20 in about [-2.5, 2.5] (5e-3 = 0.1 dB). Heat from the
// live cam is a sigmoid of a cam mean, so 2.5e-3. Port-only checks (no model): exact or float64 rounding (1e-6).
async function analyzeWave(id: string): Promise<Float32Array> {
  const s = (await listSamples()).find((x) => x.id === id)!
  return parseWav(await (await fetch('/' + s.audio)).arrayBuffer())!.ch0
}

async function resampleForTest(x: Float32Array, sr: number): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.ceil((x.length * sr) / 16000), sr)
  const b = ctx.createBuffer(1, x.length, 16000)
  b.copyToChannel(x as Float32Array<ArrayBuffer>, 0)
  const src = ctx.createBufferSource()
  src.buffer = b
  src.connect(ctx.destination)
  src.start()
  return (await ctx.startRendering()).getChannelData(0).slice()
}

function wavFloat32Stereo(x: Float32Array, sr: number): ArrayBuffer {
  const n = x.length
  const buf = new ArrayBuffer(44 + n * 8)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 8, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * 8, true); v.setUint16(32, 8, true); v.setUint16(34, 32, true); w(36, 'data'); v.setUint32(40, n * 8, true)
  for (let i = 0; i < n; i++) {
    v.setFloat32(44 + i * 8, x[i], true)
    v.setFloat32(48 + i * 8, x[i], true)
  }
  return buf
}

const TOL = { p: 1e-3, cam: 1e-2, logmel: 5e-3, heatLive: 2.5e-3, heatPort: 1e-6, E: 4e-3 }

type Case = { name: string; maxAbsDiff: number; tol: number; pass: boolean; ms: number }
const out = document.getElementById('out')!
const cases: Case[] = []
const notes: string[] = []
const add = (name: string, d: number, tol: number, ms = 0) => cases.push({ name, maxAbsDiff: d, tol, pass: d <= tol, ms })
const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  if (a.length !== b.length) return Infinity
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]))
  return m
}

;(async () => {
  try {
    setAssetBase('/')
    const env = await initInference()
    const ref = (await (await fetch('/bubblegrade/parity/reference.json')).json()) as { tau: number; clips: RefClip[] }
    const l = await load()
    notes.push(`model sha256 check: ${l.sha256Ok === null ? 'skipped (no crypto.subtle)' : 'ok'}`)
    for (const c of ref.clips) {
      // port-only checks
      add(`${c.id} windowStarts (exact)`, JSON.stringify(windowStarts(c.nSamples)) === JSON.stringify(c.windowStarts) ? 0 : 1, 0)
      add(`${c.id} bubble map port on stored cam`, maxDiff(bubbleMap(c.cam.flat(), c.windowStarts, c.nSamples), c.heat), TOL.heatPort)
      // live model
      await analyze(c.id, { noSpectrogram: true }) // warm-up (first WebGPU run compiles shaders)
      const r = await analyze(c.id)
      const p = r.windows.flatMap((w) => w.pGe)
      const cam = r.windows.flatMap((w) => w.cam)
      add(`${c.id} p_spencer_ge (${r.windows.length} windows)`, maxDiff(p, c.pSpencerGe.flat()), TOL.p, r.timingDetail!.inferMs)
      add(`${c.id} cam`, maxDiff(cam, c.cam.flat()), TOL.cam)
      add(`${c.id} clip E`, Math.abs(r.clip.E - c.clipE), TOL.E)
      add(`${c.id} grade g + alert (exact)`, r.clip.g === c.clipG && r.clip.alert === c.alert ? 0 : 1, 0)
      add(`${c.id} bubble map live`, maxDiff(r.bubbleMap.values, c.heat), TOL.heatLive)
      notes.push(`${c.id}: margins |A - tau| ${Math.abs(r.clip.A - ref.tau).toFixed(4)}, min |P_k - 0.5| ${Math.min(...r.clip.pGe.map((v) => Math.abs(v - 0.5))).toFixed(4)}; total ${r.timing.ms.toFixed(0)} ms, infer ${r.timingDetail!.inferMs.toFixed(0)} ms`)
      if (c.logmelFile) {
        const buf = await gunzip(await (await fetch('/bubblegrade/' + c.logmelFile)).arrayBuffer())
        const refSpec = new Float32Array(buf)
        add(`${c.id} stitched logmel [64x${c.specCols}] vs ORT CPU`, r.spectrogram!.cols === c.specCols ? maxDiff(r.spectrogram!.data, refSpec) : Infinity, TOL.logmel)
      }
      // replay path returns the stored numbers in the same shape
      const rp = await replay(c.id)
      add(`${c.id} replay == stored`, Math.max(maxDiff(rp.windows.flatMap((w) => w.pGe), c.pSpencerGe.flat()), rp.clip.g === c.clipG ? 0 : 1), 1e-7, rp.timing.ms)
    }
    // User-input paths. (a) a dropped 16 kHz PCM16 WAV must give exactly the shipped-clip result.
    const base = await analyze('grade-3', { noSpectrogram: true })
    const s3 = (await listSamples()).find((s) => s.id === 'grade-3')!
    const wavBytes = await (await fetch('/' + s3.audio)).arrayBuffer()
    const dropped = await analyze(new Blob([wavBytes], { type: 'audio/wav' }), { noSpectrogram: true })
    add('dropped 16 kHz PCM16 WAV == sample path', maxDiff(dropped.windows.flatMap((w) => w.pGe), base.windows.flatMap((w) => w.pGe)), 0)
    // (b) loudness invariance (plan §3 step 4, gate L4): gain x0.25 without clipping leaves p unchanged
    const quiet = await analyze('grade-3', { gain: 0.25, noSpectrogram: true })
    add('gain x0.25 leaves p unchanged (L4)', maxDiff(quiet.windows.flatMap((w) => w.pGe), base.windows.flatMap((w) => w.pGe)), TOL.p)
    // (c) a 44.1 kHz stereo float WAV goes through the browser resampler: smoke only, reported in notes
    const up = await resampleForTest(await analyzeWave("grade-3"), 44100)
    const r44 = await analyze(new Blob([wavFloat32Stereo(up, 44100)]), { noSpectrogram: true })
    notes.push(`44.1 kHz stereo float WAV of grade-3 (browser resampled twice): grade ${r44.clip.grade} vs ${base.clip.grade}, |dA| ${Math.abs(r44.clip.A - base.clip.A).toFixed(4)}, |dE| ${Math.abs(r44.clip.E - base.clip.E).toFixed(3)} (${r44.input.note})`)
    // (d) too-short input is refused with the plan's text
    let refused = ''
    try {
      await analyze({ wave: new Float32Array(79999), sampleRate: 16000 })
    } catch (e) {
      refused = String(e instanceof Error ? e.message : e)
    }
    add(`4.99 s refused with "${TOO_SHORT}"`, refused === TOO_SHORT ? 0 : 1, 0)
    // ACT: expected tiers from plan §9 for the stored clip values, plus crew inputs
    const want: Record<string, number> = { 'grade-0': 0, 'grade-1': 1, 'grade-2': 1, 'grade-3': 1, 'grade-4': 1, 'dcs-dive': 1 }
    let bad = 0
    for (const c of ref.clips) {
      const rp = await replay(c.id, { noSpectrogram: true })
      if (act(rp).tier !== want[c.id]) bad++
      if (act(rp, { typeI: ['joint or muscle pain'] }).tier !== 2) bad++
      if (act(rp, { typeII: ['numbness'] }).tier !== 3) bad++
      if (act(rp, { unresolvedWithBTA: true }).tier !== 3) bad++
    }
    add('act tiers (6 clips x 4 crew inputs, exact)', bad, 0)
    // timing: one more run of the longest clip
    const t = await analyze('grade-2')
    notes.push(`grade-2 (18.1 s, 15 windows): total ${t.timing.ms.toFixed(0)} ms, infer ${t.timingDetail!.inferMs.toFixed(0)} ms in ${t.timingDetail!.chunks} call(s)`)
    // timing: one 5-s window (the rolling-buffer case), median of 5 runs after one warm-up
    const one = (await analyzeWave('grade-3')).slice(0, 80000)
    await analyze({ wave: one, sampleRate: 16000 }, { noSpectrogram: true })
    const ones: number[] = []
    for (let i = 0; i < 5; i++) ones.push((await analyze({ wave: one, sampleRate: 16000 }, { noSpectrogram: true })).timingDetail!.inferMs)
    ones.sort((a, b) => a - b)
    notes.push(`one 5-s window: infer median ${ones[2].toFixed(0)} ms (min ${ones[0].toFixed(0)}, max ${ones[4].toFixed(0)}, 5 runs)`)
    const report = { backend: env.backend, adapter: env.adapter, threads: env.threads, isolated: env.isolated, loadMs: l.loadMs, cases, notes }
    ;(window as unknown as { __parity: unknown }).__parity = report
    out.textContent = JSON.stringify(report, null, 2)
    document.body.dataset.parity = cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e), cases, notes }
    out.textContent = String(e) + '\n' + JSON.stringify(cases, null, 2)
    document.body.dataset.parity = 'error'
  }
})()

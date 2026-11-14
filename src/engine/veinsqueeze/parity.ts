// VeinSqueeze parity page: runs the engine on the six shipped model inputs and compares with onnxruntime CPU
// (Python, parity_ref.json) and with the stored clip_<k>_pred.json; checks the vs_prep.py port against cv2 on
// synthetic clips; checks a few ACT scenarios. Reports through window.__parity and body[data-parity].
import { initInference } from '../../lib/infer/client'
import ref from './parity_ref.json'
import { act, activeMask, analyze, assetUrl, configure, extractGreyFrames, load, prepareClip, replay, type GreyFrame } from './index'

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
const add = (name: string, d: number, tol: number, ms = 0) => cases.push({ name, maxAbsDiff: d, tol, pass: d <= tol, ms })
const maxDiff = (a: number[], b: number[]) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0)

// Tolerances. The browser runs the same fp32 maths as onnxruntime CPU but with different kernels (WebGPU shaders
// or wasm SIMD), so outputs differ by float rounding only.
// - clot_prob (the number on screen and the alarm input): 1e-3, the SCREENS.md §4.3 contract. Measured: WebGPU
//   5.8e-6, wasm 1.3e-4.
// - frame_clot_prob: 1e-2. Each of the 32 per-frame scores is a sigmoid of ONE frame's logit (no averaging), so
//   kernel rounding shows up most here; the VM export saw 9.3e-3 on this output between two correct
//   implementations (export_report.json, fp16-storage ONNX vs rounded PyTorch). Measured: WebGPU 3.7e-4,
//   wasm 5.0e-3. It only colours the 32-tick strip.
// - frame_attention 1e-3; site_prob 2e-3 (shown as whole percent; wasm measured 1.03e-3).
// Discrete results (alarm above tau, site argmax, ACT tier, prep box and bytes) must match exactly.
const TOL = { clot: 1e-3, frame: 1e-2, att: 1e-3, site: 2e-3 }

function synth(T: number, W: number, H: number, box: number[]): GreyFrame[] {
  const [bx0, by0, bx1, by1] = box
  const frames: GreyFrame[] = []
  for (let t = 0; t < T; t++) {
    const d = new Uint8Array(W * H)
    const cx = bx0 + 30 + ((t * 3) % 60)
    const cy = by0 + 40
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let v = 40 + ((x * 7 + y * 13 + t * 29 + ((x * y) % 23) * 3) % 150)
        if ((x - cx) ** 2 + (y - cy) ** 2 < 400) v = 10
        const inside = x >= bx0 && x < bx1 && y >= by0 && y < by1
        if (!inside) v = x >= 2 && x < 12 && y >= 2 && y < 8 ? 200 : 0
        d[y * W + x] = v
      }
    frames.push({ width: W, height: H, data: d })
  }
  return frames
}

async function sha256(b: Uint8Array) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', b.slice().buffer))
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('')
}

;(async () => {
  try {
    configure({ base: new URL('../', location.href).href })
    const env = await initInference()
    const l = await load()
    const tAll = performance.now()
    const runMs: number[] = []
    for (const k of ['A', 'B', 'C', 'D', 'E', 'F'] as const) {
      const r = await analyze(k)
      runMs.push(r.timing.ms)
      const py = (ref.clips as Record<string, Record<string, number[]>>)[k]
      add(`clip_${k}:clot_prob vs ORT-CPU`, Math.abs(r.clotProb - py.clot_prob[0]), TOL.clot, r.timing.ms)
      add(`clip_${k}:frame_clot_prob vs ORT-CPU`, maxDiff(r.frameClotProb, py.frame_clot_prob), TOL.frame)
      add(`clip_${k}:frame_attention vs ORT-CPU`, maxDiff(r.frameAttention, py.frame_attention), TOL.att)
      add(`clip_${k}:site_prob vs ORT-CPU`, maxDiff(Object.values(r.siteProb), py.site_prob), TOL.site)
      const rp = await replay(k)
      add(`clip_${k}:clot_prob vs stored pred.json`, Math.abs(r.clotProb - rp.clotProb), TOL.clot)
      add(`clip_${k}:above_tau and site argmax match stored`, (r.aboveTau !== rp.aboveTau ? 1 : 0) + (r.site.code !== rp.site.code ? 1 : 0), 0)
      if (k === 'A' && !r.squeeze) throw new Error('clip A should carry a SAM 2 curve')
    }
    notes.push(`6 live runs in ${(performance.now() - tAll).toFixed(0)} ms incl. fetch; model run ms: ${runMs.map((m) => m.toFixed(0)).join(', ')}`)
    const warm: number[] = []
    for (let i = 0; i < 5; i++) warm.push((await analyze('A')).timing.ms)
    notes.push(`warm runs clip A (ms): ${warm.map((m) => m.toFixed(1)).join(', ')}`)

    // vs_prep.py port (content box + cv2.INTER_AREA) on synthetic clips
    for (const c of ref.prep) {
      const t0 = performance.now()
      const p = prepareClip(synth(c.T, c.W, c.H, c.box))
      const ms = performance.now() - t0
      const boxDiff = p.box.reduce((m, v, i) => Math.max(m, Math.abs(v - c.foundBox[i])), 0)
      const sampled = Uint8Array.from(atob(c.sampled_b64), (ch) => ch.charCodeAt(0))
      let d = 0
      let n = 0
      for (let i = 0; i < sampled.length; i++) {
        const e = Math.abs(p.t32[i * c.stride] - sampled[i])
        if (e) n++
        d = Math.max(d, e)
      }
      const sums = c.frameSums.reduce((m, s, f) => {
        let a = 0
        for (let i = f * 25600; i < (f + 1) * 25600; i++) a += p.t32[i]
        return Math.max(m, Math.abs(a - s))
      }, 0)
      const exact = (await sha256(p.t32)) === c.sha256
      add(`prep:${c.name} box`, boxDiff, 0, ms)
      add(`prep:${c.name} pixels (max grey-level diff)`, d, 0)
      add(`prep:${c.name} all 819,200 bytes identical to cv2 (sha256)`, exact ? 0 : 1, 0)
      notes.push(`prep ${c.name}: sha256 ${exact ? 'identical' : 'differs'}; sampled mismatches ${n}/${sampled.length}; max frame-sum diff ${sums}`)
      if (c.model) {
        const r = await analyze({ frames: synth(c.T, c.W, c.H, c.box) })
        add(`prep:${c.name} end-to-end clot_prob vs ORT-CPU(cv2 prep)`, Math.abs(r.clotProb - c.model.clot_prob[0]), TOL.clot, r.timing.ms)
      }
    }

    // content_box() active mask at the std threshold: integer noise whose per-pixel std is often exactly 2.0, so
    // only numpy's float32 order of operations decides "> 2" (reference: vs_prep.py's numpy expression).
    {
      const m = ref.prepMask
      const fr: GreyFrame[] = []
      for (let t = 0; t < m.T; t++) {
        const d = new Uint8Array(m.W * m.H)
        for (let y = 0; y < m.H; y++)
          for (let x = 0; x < m.W; x++)
            d[y * m.W + x] = ((x * 31 + y * 17) % 200) + 20 + ((x * 3 + y * 5 + t * 11 + ((x * y) % 13)) % 7) - 3
        fr.push({ width: m.W, height: m.H, data: d })
      }
      const act = activeMask(fr)
      const n = act.reduce((a, v) => a + v, 0)
      add(`prep:${m.name} active pixels (count diff)`, Math.abs(n - m.active), 0)
      add(`prep:${m.name} mask identical to numpy float32 (sha256)`, (await sha256(act)) === m.sha256 ? 0 : 1, 0)
    }

    // User-video path smoke test: decode the shipped (re-encoded, downscaled) clip_A.webm and clip_B.webm in the
    // browser and run the vs_prep.py port + model. No exact reference exists for webm input, so this only checks
    // that the path runs and reports how close it lands to the stored DICOM-based result (note, not a case).
    for (const k of ['A', 'B']) {
      const t0 = performance.now()
      const v = await extractGreyFrames(assetUrl(`veinsqueeze/clips/clip_${k}.webm`), 64)
      const r = await analyze({ frames: v.frames, timesS: v.timesS })
      const st = await replay(k)
      add(`video:clip_${k}.webm decodes and runs (64 frames)`, v.frames.length === 64 && r.ticks.length === 32 ? 0 : 1, 0, performance.now() - t0)
      const tt = r.ticks.map((x) => x.tS ?? NaN)
      const timesOk = tt.every((t, i) => Number.isFinite(t) && t >= 0 && t <= v.durationS && (i === 0 || t > tt[i - 1]))
      add(`video:clip_${k}.webm tick times real, rising, inside the clip`, timesOk ? 0 : 1, 0)
      notes.push(
        `video path clip_${k}.webm: ${v.width}x${v.height}, box ${r.cropBox?.join(',')}, clot_prob ${r.clotProb.toFixed(4)} (stored from DICOM ${st.clotProb.toFixed(4)}), site ${r.site.code} (stored ${st.site.code}), ${(performance.now() - t0).toFixed(0)} ms incl. decode`,
      )
    }

    // ACT scenarios (logic, exact)
    const A = await replay('A')
    const B = await replay('B')
    const tier = (n: string, got: number, want: number) => add(`act:${n}`, Math.abs(got - want), 0)
    tier('clip A, no crew input -> ORANGE (AI flag)', act(A).tier, 3)
    tier('clip B (0.0127 >= tau) -> ORANGE (screening alarm)', act(B).tier, 3)
    tier('clip B expert mode, score 0 -> GREEN self-care', act(B, {}, { aiInput: 'expert' }).tier, 0)
    tier('expert clean, non-O + 41-50 -> GREEN monitoring', act(B, { bloodType: 'non-O', ageBand: '41-50' }, { aiInput: 'expert' }).tier, 1)
    tier('expert clean, flow grade 3 -> YELLOW', act(B, { flowGrade: 3 }, { aiInput: 'expert' }).tier, 2)
    tier('flow 4 + over 50 + non-O -> ORANGE (score 7)', act(B, { flowGrade: 4, ageBand: 'over 50', bloodType: 'non-O' }, { aiInput: 'expert' }).tier, 3)
    tier('headache + new seizure -> RED', act(null, { symptoms: { persistentHeadache: true, newSeizure: true } }).tier, 4)
    tier('new seizure alone, no AI -> not RED', act(null, { symptoms: { newSeizure: true } }).tier, 0)
    tier('AI flag + hearing loss -> RED', act(A, { symptoms: { hearingLoss: true } }).tier, 4)
    tier('PE signs -> RED (our product rule)', act(null, { symptoms: { peSigns: true } }).tier, 4)

    const report = {
      backend: env.backend,
      adapter: env.adapter,
      threads: env.threads,
      isolated: env.isolated,
      ortVersion: env.ortVersion,
      loadMs: l.ms,
      cases,
      notes,
    }
    ;(window as unknown as { __parity: unknown }).__parity = report
    out.textContent = JSON.stringify(report, null, 2)
    document.body.dataset.parity = cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e), stack: (e as Error).stack, cases, notes }
    out.textContent = String(e)
    document.body.dataset.parity = 'error'
  }
})()

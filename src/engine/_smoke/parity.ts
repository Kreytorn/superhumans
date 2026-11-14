// Smoke test for the parity harness: the 314-byte self-test model, expected y = 0.50295424 (Python ORT CPU).
import { initInference, loadModel, runModel } from '../../lib/infer/client'

const EXPECTED = 0.50295424
const out = document.getElementById('out')!
;(async () => {
  try {
    const env = await initInference()
    const l = await loadModel('smoke', '/_selftest/tiny.onnx')
    const x = new Float32Array(64 * 64)
    for (let i = 0; i < x.length; i++) x[i] = (i % 7) / 7
    const r = await runModel('smoke', { x: { type: 'float32', dims: [1, 1, 64, 64], data: x } })
    const y = (r.outputs.y.data as Float32Array)[0]
    const diff = Math.abs(y - EXPECTED)
    const report = { backend: env.backend, adapter: env.adapter, threads: env.threads, isolated: env.isolated, loadMs: l.ms, cases: [{ name: 'tiny', maxAbsDiff: diff, tol: 1e-4, pass: diff < 1e-4, ms: r.ms }] }
    ;(window as unknown as { __parity: unknown }).__parity = report
    out.textContent = JSON.stringify(report, null, 2)
    document.body.dataset.parity = report.cases.every((c) => c.pass) ? 'pass' : 'fail'
  } catch (e) {
    ;(window as unknown as { __parity: unknown }).__parity = { error: String(e) }
    out.textContent = String(e)
    document.body.dataset.parity = 'error'
  }
})()

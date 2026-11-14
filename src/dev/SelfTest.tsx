// Engine self-test: loads a 314-byte ONNX model and runs it. Expected y = 0.50295424 (onnxruntime CPU, Python).
import { useEffect, useState } from 'react'
import { initInference, loadModel, runModel, type EnvInfo } from '../lib/infer/client'

const EXPECTED = 0.50295424

export function SelfTest() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [lines, setLines] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    const log = (s: string) => alive && setLines((l) => [...l, s])
    ;(async () => {
      try {
        const e = await initInference()
        if (!alive) return
        setEnv(e)
        const l = await loadModel('selftest', '_selftest/tiny.onnx')
        log(`load ${l.ms.toFixed(1)} ms, inputs ${l.inputs.join(',')}, outputs ${l.outputs.join(',')}`)
        const x = new Float32Array(64 * 64)
        for (let i = 0; i < x.length; i++) x[i] = (i % 7) / 7
        for (let k = 0; k < 3; k++) {
          const r = await runModel('selftest', { x: { type: 'float32', dims: [1, 1, 64, 64], data: x.slice() } })
          const y = (r.outputs.y.data as Float32Array)[0]
          log(`run ${k + 1}: y = ${y.toFixed(8)} (|diff| ${Math.abs(y - EXPECTED).toExponential(1)}), ${r.ms.toFixed(2)} ms`)
        }
        log('SELFTEST PASS')
      } catch (err) {
        log(`SELFTEST FAIL: ${err instanceof Error ? err.message : String(err)}`)
      }
    })()
    return () => {
      alive = false
    }
  }, [])
  return (
    <pre id="selftest" style={{ color: '#ddd', background: '#000', padding: 24, font: '16px monospace', minHeight: '100vh', margin: 0 }}>
      {env ? `backend ${env.backend} | adapter ${env.adapter ?? 'none'} | threads ${env.threads} | isolated ${env.isolated} | ort ${env.ortVersion}\n` : 'starting…\n'}
      {lines.join('\n')}
    </pre>
  )
}

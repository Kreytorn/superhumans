// Always-visible status bar (PLAYBOOK §1.6). Backend comes from the real engine probe; the external-request
// counter counts only resources whose origin differs from this app's origin (PLAYBOOK §6).
import { useEffect, useState } from 'react'
import { initInference, type EnvInfo } from '../lib/infer/client'
import './status.css'

function countExternal() {
  return performance
    .getEntriesByType('resource')
    .filter((e) => {
      try {
        return new URL(e.name).origin !== location.origin
      } catch {
        return false
      }
    }).length
}

export function StatusBar({ module, mode }: { module: string; mode: 'MOCK' | 'LIVE' | 'REPLAY' }) {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [ext, setExt] = useState(0)
  useEffect(() => {
    initInference().then(setEnv).catch(() => setEnv(null))
    const t = setInterval(() => setExt(countExternal()), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="status">
      <span className="status-word">SuperHumans</span>
      <span className="status-seg">{module}</span>
      <span className="status-seg">Crew member A</span>
      <span className={`status-pill mode-${mode.toLowerCase()}`}>
        <i className="lamp" />
        {mode}
        <span className="status-pill-sep mono">{env ? (env.backend === 'webgpu' ? 'WebGPU' : 'wasm') : '…'}</span>
      </span>
      <span className="status-seg status-right tnum">External requests since start: {ext}</span>
    </header>
  )
}

// Canvas paint for the Garn Room: the room's light is the real recording (14 channels of the scene in view, played at
// 1x), and every scene on the wall is a close-up of its own 8 s of brainwaves. Display only: no model output here.
import { useEffect, useRef } from 'react'
import type { GarnTrial } from '../../engine/garnmeter'

export interface Sig {
  eeg: Float32Array
  nSamples: number
  sigma: number[]
  trials: { index: number; start: number; length: number }[]
}

const FS = 128
const CH = 14
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
/** Soft limiter so a big artefact bends instead of crossing the room. */
const soft = (v: number) => Math.tanh(v / 2.2) * 2.2

// zone -1 = no check-in yet, 0 green, 1 yellow, 2 red: [left hue, right hue]
const HUES: Record<number, [number, number]> = { [-1]: [192, 262], 0: [168, 205], 1: [36, 330], 2: [330, 352] }

export function Aurora({ sig, trial, zone }: { sig: Sig | null; trial: { start: number; length: number } | null; zone: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const zoneRef = useRef(zone)
  zoneRef.current = zone
  useEffect(() => {
    const cv = ref.current
    if (!cv || !sig) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const start = trial ? trial.start : 0
    const len = trial ? trial.length : 1024
    const span = 4 * FS // 4 s across the room
    let raf = 0
    let last = 0
    const t0 = performance.now()
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 33) return
      last = now
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const [h1, h2] = HUES[zoneRef.current] ?? HUES[-1]
      const off = reduced() ? 0 : Math.floor(((now - t0) / 1000) * FS) % len
      const step = Math.max(1, Math.floor(span / w))
      const px = w / span
      const amp = (h / CH) * 0.7
      for (let c = 0; c < CH; c++) {
        const y0 = h * (0.1 + (0.82 * c) / (CH - 1))
        const base = c * sig.nSamples + start
        const s = sig.sigma[c] || 1
        const g = ctx.createLinearGradient(0, 0, w, 0)
        g.addColorStop(0, `hsla(${h1}, 90%, 62%, 0)`)
        g.addColorStop(0.25, `hsla(${h1}, 90%, 62%, 1)`)
        g.addColorStop(0.8, `hsla(${h2}, 95%, 64%, 1)`)
        g.addColorStop(1, `hsla(${h2}, 95%, 64%, 0)`)
        ctx.beginPath()
        for (let i = 0; i < span; i += step) {
          // a short moving average (1/16 s) so the room's light reads as waves, not grain
          let acc = 0
          for (let q = 0; q < 8; q++) acc += sig.eeg[base + ((off + i + q) % len)]
          const v = soft(acc / 8 / s) * 1.6
          const x = i * px
          const y = y0 - v * amp
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = g
        ctx.globalAlpha = 0.05
        ctx.lineWidth = 6
        ctx.stroke()
        ctx.globalAlpha = 0.22
        ctx.lineWidth = 1.1
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      if (reduced()) cancelAnimationFrame(raf)
    }
    raf = requestAnimationFrame(draw)
    const vis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [sig, trial])
  return <canvas ref={ref} className="g2-aurora" aria-hidden="true" />
}

export function SceneTile({ t, sig, zone, onClick }: { t: GarnTrial; sig: Sig | null; zone: string; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !sig) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = cv.clientWidth || 100
    const h = cv.clientHeight || 120
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // a close-up: the middle 1 s of this scene's own recording, five of the 14 channels (AF3, FC5, O1, O2, AF4)
    const n = FS
    const from = t.start + Math.floor((t.length - n) / 2)
    const show = [0, 3, 6, 7, 13]
    show.forEach((c, r) => {
      const y0 = h * (0.12 + (0.76 * r) / (show.length - 1))
      const base = c * sig.nSamples + from
      const s = sig.sigma[c] || 1
      const amp = (h / show.length) * 0.42
      ctx.beginPath()
      for (let k = 0; k < n; k++) {
        const x = (k / (n - 1)) * w
        const y = y0 - soft(sig.eeg[base + k] / s) * amp
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(232,236,255,0.75)'
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }, [sig, t])
  const said = (t.ids - 1) / 6
  const model = t.modelGarnMean
  return (
    <button
      type="button"
      className={`g2-tile z-${zone}`}
      onClick={onClick}
      aria-label={`Scene ${t.index}: the person said ${t.ids} of 7${model !== null ? `; the model read ${model.toFixed(2)} Garn` : ''}. Put it on the stage.`}
    >
      <canvas ref={ref} aria-hidden="true" />
      <span className="g2-tile-gauge" aria-hidden="true">
        <i style={{ height: `${Math.max(4, said * 100)}%` }} />
        {model !== null && <b style={{ bottom: `${Math.min(100, model * 100)}%` }} />}
      </span>
      <span className="g2-tile-n">{t.ids}</span>
      <span className="g2-tile-s">
        {t.index}
      </span>
    </button>
  )
}

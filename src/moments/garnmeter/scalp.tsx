// The scalp map of measured theta power, for a "How do we know?" layer. It is a measurement, not model output,
// so it is not on the stage. It shows the last 4 s window of the scene the moment zooms into (or of `trial`).
import { useEffect, useRef, useState } from 'react'
import * as garn from '../../engine/garnmeter'
import type { GarnResult } from '../../engine/garnmeter'
import { loadSessionData } from '../../engine/garnmeter/data'
import { drawScalp, makeField, type Signal } from './draw'
import { readPalette } from './index'
import { stageData } from './timeline'

export function GarnScalp({ result, trial, size = 104 }: { result: GarnResult; trial?: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [scene, setScene] = useState<number | null>(null)
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const [s, meta] = await Promise.all([garn.getSignal(), loadSessionData()])
        const cv = ref.current
        const ctx = cv?.getContext('2d')
        if (dead || !cv || !ctx) return
        const sig: Signal = { eeg: s.eeg, nSamples: s.nSamples, sigma: s.sigma, trials: s.trials, baseline: s.baseline, fs: s.fs, channels: s.channels, electrodes: meta.meta.electrodes }
        const d = stageData(result, s.nSamples, s.baseline.length, trial)
        const theta = d.windows[d.focus.w1 - 1]?.theta
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        cv.width = cv.height = Math.round(size * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, size, size)
        drawScalp(ctx, size / 2, size / 2 + size * 0.03, size * 0.42, readPalette(cv), sig, makeField(sig), theta ? Float32Array.from(theta) : null)
        setScene(d.focus.index)
      } catch (e) {
        console.warn('garnmeter scalp map: the recording did not load', e)
      }
    })()
    return () => {
      dead = true
    }
  }, [result, trial, size])
  return (
    <div className="gm-scalp">
      <canvas ref={ref} style={{ width: size, height: size }} role="img" aria-label="Scalp map of measured theta power at the 14 electrodes" />
      <div>
        Theta power at the 14 electrodes{scene !== null ? `, scene ${scene}` : ''}. A measurement, not model output.
        <div className="gm-ramp">
          <span>less</span>
          <i />
          <span>more than at rest</span>
        </div>
      </div>
    </div>
  )
}

export default GarnScalp

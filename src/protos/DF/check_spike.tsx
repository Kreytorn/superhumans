// SpikeCount stage for the DF check page: a real microscope field with the stored outlines of our two models
// (replay(): stored outputs, tagged REPLAY by the page) drawn over it in a left-to-right sweep.
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { act as spikeAct, CLASS_COLOURS, replay, type SpikeResult } from '../../engine/spikecount'
import type { Outcome } from './check'

type Phase = 'idle' | 'running' | 'result' | 'error'
export interface SpikeHandle {
  run(): void
  reset(): void
}

const FIELD = 'field-96'
const FIELD_URL = `${import.meta.env.BASE_URL}spikecount/fields/96.png`
const DRAW_MS = 1500

export default function SpikeStage({ ref, onState, onOutcome }: { ref?: Ref<SpikeHandle>; onState(s: Phase): void; onOutcome(o: Outcome | null): void }) {
  const [res, setRes] = useState<SpikeResult | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<number | undefined>(undefined)
  const token = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useImperativeHandle(
    ref,
    () => ({
      run() {
        const mine = ++token.current
        setPhase('running')
        onState('running')
        replay(FIELD)
          .then((r) => {
            if (mine !== token.current) return
            setRes(r)
            timer.current = window.setTimeout(() => {
              if (mine !== token.current) return
              const a = spikeAct(r)
              const w = a.whoActs === 'self' ? 'You' : a.whoActs.charAt(0).toUpperCase() + a.whoActs.slice(1)
              setPhase('result')
              onState('result')
              onOutcome({
                big: `${r.metrics.spikyPct.toFixed(0)}%`,
                bigLabel: `spiky cells, of ${r.metrics.n} red blood cells outlined`,
                who: w,
                action: a.headline,
                source: 'REPLAY',
                fine: [...r.honesty, ...(Array.isArray((a as { caveats?: string[] }).caveats) ? ((a as { caveats?: string[] }).caveats ?? []) : [])],
              })
            }, DRAW_MS + 700)
          })
          .catch(() => {
            if (mine !== token.current) return
            setPhase('error')
            onState('error')
          })
      },
      reset() {
        token.current++
        window.clearTimeout(timer.current)
        setRes(null)
        setPhase('idle')
        onState('idle')
        onOutcome(null)
      },
    }),
    [onOutcome, onState],
  )

  const cells = useMemo(() => (res ? [...res.cells].sort((a, b) => a.center[0] - b.center[0]) : []), [res])
  const step = cells.length ? DRAW_MS / cells.length : 0
  const W = res?.width ?? 572
  const H = res?.height ?? 572

  return (
    <div className="df-check-spike" data-phase={phase} data-ready="1">
      <div className="df-check-spike-field">
        <img src={res?.imageUrl ?? FIELD_URL} alt="Microscope photo of red blood cells" draggable={false} />
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {cells.map((c, i) => {
            const spiky = c.cls >= 1 && c.cls <= 4
            return (
              <polygon
                key={c.id}
                className={spiky ? 'is-spiky' : undefined}
                points={c.polygon.map((p) => `${p[0]},${p[1]}`).join(' ')}
                pathLength={1}
                style={{ stroke: CLASS_COLOURS[c.className], fill: spiky ? CLASS_COLOURS[c.className] : 'none', animationDelay: `${Math.round(i * step)}ms` }}
              />
            )
          })}
        </svg>
        {phase === 'running' && <i className="df-check-spike-sweep" aria-hidden="true" />}
      </div>
      <ul className="df-check-spike-key" aria-label="Colour key">
        <li>
          <i style={{ background: CLASS_COLOURS.Disc }} />
          smooth disc
        </li>
        <li>
          <i style={{ background: `linear-gradient(90deg, ${CLASS_COLOURS.E1}, ${CLASS_COLOURS.E2}, ${CLASS_COLOURS.E3}, ${CLASS_COLOURS.E4})` }} />
          spiky, mild to advanced
        </li>
        <li>
          <i style={{ background: CLASS_COLOURS.Cup }} />
          cup shape
        </li>
      </ul>
    </div>
  )
}

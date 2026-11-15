// Station: small helpers for the six check modules. Shell-owned; use them, do not edit them
// (ask for a change in work/Station/LOG.md). modules/README.md shows how they fit together.
import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import type { StageAct, StageHandle } from './types'

type Tokens = CSSProperties & Record<`--${string}`, string>

/**
 * The film palette, written as the --m-* tokens the ready-made moments (src/moments/*) read, plus the size
 * that makes a moment fill the panel body. Plain colour values on purpose: some moments read them into a canvas.
 * Spread it and add the tokens your own moment needs: style={{ ...MOMENT_TOKENS, '--m-accent': '#ffb45a' }}.
 */
export const MOMENT_TOKENS: Tokens = {
  '--m-stage': '#05070a',
  '--m-ink': '#e8eef5',
  '--m-ink-2': '#8f9ba8',
  '--m-font': "'Instrument Sans Variable', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
  '--m-font-mono': "'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace",
  width: '100%',
  height: '100%',
}

/** The amber of the lit windows, for a moment's --m-accent when that token means "the viewer's own action". */
export const AMBER = '#ffb45a'

/** Engine decisions carry more than the panel prints; this keeps the two fields it shows. */
export function pickAct(a: { headline: string; whoActs: string } | null | undefined): StageAct | null {
  return a ? { headline: a.headline, whoActs: a.whoActs } : null
}

/**
 * Connects the panel's two buttons and the ?state= pin to anything with run() and reset().
 * Returns the pin to hand on as a moment's `state` prop ('idle', 'result' or undefined). A pinned moment
 * ignores input, so the first press of a panel button lets go of the pin and then does what was asked.
 */
export function useStageControls(
  ref: Ref<StageHandle> | undefined,
  pinned: 'idle' | 'result' | null,
  stage: { run(): void; reset(): void },
  onAct: (act: StageAct | null) => void,
): 'idle' | 'result' | undefined {
  const [pin, setPin] = useState(pinned)
  const todo = useRef<'run' | 'reset' | null>(null)
  const latest = useRef(stage)
  latest.current = stage

  useImperativeHandle(
    ref,
    () => ({
      run() {
        if (pin) {
          todo.current = 'run'
          setPin(null)
        } else latest.current.run()
      },
      reset() {
        onAct(null)
        if (pin) {
          todo.current = 'reset'
          setPin(null)
        } else latest.current.reset()
      },
    }),
    [pin, onAct],
  )

  useEffect(() => {
    if (pin || !todo.current) return
    const what = todo.current
    todo.current = null
    if (what === 'run') latest.current.run()
    else latest.current.reset()
  }, [pin])

  return pin ?? undefined
}

/**
 * An SVG that fills the scene box with the still's own pixel grid: (0,0) is the still's top-left corner and
 * (w,h) its bottom-right, so manifest anchors times w and h are coordinates in here.
 */
export function SceneSvg({ w, h, className, children }: { w: number; h: number; className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
    >
      {children}
    </svg>
  )
}

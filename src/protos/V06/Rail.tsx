// The scale rail: Space, Ship, Body, then the six places. Shows where the camera is on the zoom; every stop is a button.
import type { Ref } from 'react'
import { CHECKS } from './data'

export type Level = 'space' | 'ship' | 'body'
export const LEVELS: { id: Level; label: string; at: number }[] = [
  { id: 'space', label: 'Space', at: 0 },
  { id: 'ship', label: 'Ship', at: 0.42 },
  { id: 'body', label: 'Body', at: 0.82 },
]

interface Props {
  markRef?: Ref<HTMLSpanElement>
  /** nearest level, lit */
  level: Level | null
  /** the place in focus (home) or open (module page) */
  focus: number
  open?: number
  onLevel: (l: Level) => void
  onPlace: (i: number) => void
  onHover?: (i: number) => void
}

export default function Rail({ markRef, level, focus, open = -1, onLevel, onPlace, onHover }: Props) {
  return (
    <nav className="v6-rail" aria-label="Zoom: from space to the body">
      <div className="v6-rail-track">
        <span className="v6-rail-line" aria-hidden="true" />
        {LEVELS.map((l) => (
          <button key={l.id} type="button" className={`v6-rail-lvl${level === l.id ? ' is-on' : ''}`} style={{ top: `${l.at * 100}%` }} onClick={() => onLevel(l.id)} aria-label={`Zoom to ${l.label}`}>
            <span>{l.label}</span>
            <i aria-hidden="true" />
          </button>
        ))}
        <span className="v6-rail-mark" ref={markRef} aria-hidden="true" style={open >= 0 ? { top: '100%' } : undefined} />
      </div>
      <ol className="v6-rail-places">
        {CHECKS.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              className={`v6-rail-place${focus === i ? ' is-focus' : ''}${open === i ? ' is-open' : ''}`}
              style={{ ['--h' as string]: c.hue }}
              onClick={() => onPlace(i)}
              onPointerEnter={() => onHover?.(i)}
              onFocus={() => onHover?.(i)}
              aria-label={open === i ? `${c.name}, open now` : `Go into ${c.name}`}
              aria-current={open === i ? 'page' : undefined}
            >
              <span>{c.name}</span>
              <i aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

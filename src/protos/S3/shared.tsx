// S3 "Eclipse": pieces both pages use (navigation with a view transition, the cropped real image, the blood-cell outlines).
import { useEffect, useState, type AnchorHTMLAttributes, type CSSProperties, type MouseEvent, type ReactNode, type Ref } from 'react'
import { flushSync } from 'react-dom'
import { href, type Check } from './data'

export function go(view: string) {
  const apply = () => {
    location.hash = href(view)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    window.scrollTo(0, 0)
  }
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (d.startViewTransition && !reduced) d.startViewTransition(() => flushSync(apply))
  else apply()
}

export function Go({ to, children, onClick, ...rest }: { to: string; children: ReactNode; ref?: Ref<HTMLAnchorElement> } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      href={href(to)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        go(to)
      }}
    >
      {children}
    </a>
  )
}

export interface CellLite {
  id: number
  pts: string
  cls: number
}

let spikeP: Promise<CellLite[]> | null = null
/** Outlines of field 96 from the engine's stored model outputs (replay: no model download). */
export function loadSpikeCells(): Promise<CellLite[]> {
  spikeP ??= import('../../engine/spikecount').then(async (m) => {
    const r = await m.replay('field-96')
    return r.cells.map((c) => ({ id: c.id, pts: c.polygon.map((p) => `${p[0]},${p[1]}`).join(' '), cls: c.cls }))
  })
  return spikeP
}

export function useSpikeCells(): CellLite[] | null {
  const [cells, setCells] = useState<CellLite[] | null>(null)
  useEffect(() => {
    let on = true
    loadSpikeCells()
      .then((c) => on && setCells(c))
      .catch(() => {})
    return () => {
      on = false
    }
  }, [])
  return cells
}

/** One real image, cropped to its subject, inside a round lens (1:1) or a wide plate (16:10). */
export function Specimen({ check, kind, cells, eager }: { check: Check; kind: 'lens' | 'plate'; cells?: CellLite[] | null; eager?: boolean }) {
  const c = kind === 'lens' ? check.lens : check.plate
  const ca = kind === 'lens' ? 1 : 1.6
  const k = (c.s * ca) / c.ar
  const style: CSSProperties = {
    width: `${c.s * 100}%`,
    height: `${k * 100}%`,
    left: `${(0.5 - c.cx * c.s) * 100}%`,
    top: `${(0.5 - c.cy * k) * 100}%`,
  }
  return (
    <span className="s3-spec" style={style} data-invert={check.invert ? '1' : undefined}>
      <img src={kind === 'lens' ? check.lensImg : check.plateImg} alt="" draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      {check.id === 'spikecount' && cells ? (
        <svg viewBox="0 0 572 572" preserveAspectRatio="none" aria-hidden="true">
          {cells.map((cell) => (
            <polygon key={cell.id} points={cell.pts} data-spiky={cell.cls >= 1 && cell.cls <= 4 ? '1' : undefined} />
          ))}
        </svg>
      ) : null}
    </span>
  )
}

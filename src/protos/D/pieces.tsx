// Shared pieces of prototype D: the status mark, a width-fitted word, the blood field with its outlines,
// and the "How do we know?" layer shell.
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react'
import { line, curveCatmullRomClosed } from 'd3-shape'
import { X } from '@phosphor-icons/react'
import type { SpikeCell } from '../../engine/spikecount'
import type { Level } from './data'
import { fitWord, type Fit } from './fit'

// ------------------------------------------------------------------ status mark: a word plus a shape
const MARK_COLOUR: Record<Level, string> = { you: 'var(--ink)', medic: 'var(--amber)', surgeon: 'var(--red)', abort: 'var(--off)', none: 'var(--quiet)' }

/** One shape per level, never letters: hollow ring = you; filled disc = crew medic; filled diamond = flight surgeon;
 *  filled square = abort (always grey); dashed ring = no data. */
export function Mark({ level, colour }: { level: Level; colour?: string }) {
  const c = colour ?? MARK_COLOUR[level]
  return (
    <svg className="drp-mark" data-level={level} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(level === 'you' || level === 'none') && <circle cx="12" cy="12" r="8.5" fill="none" stroke={c} strokeWidth="3" strokeDasharray={level === 'none' ? '4 3.5' : undefined} />}
      {level === 'medic' && <circle cx="12" cy="12" r="11.5" fill={c} />}
      {level === 'surgeon' && <path d="M12 0.5 23.5 12 12 23.5 0.5 12Z" fill={c} />}
      {level === 'abort' && <rect x="2" y="2" width="20" height="20" fill={c} />}
    </svg>
  )
}

// ------------------------------------------------------------------ a word fitted with the width axis
export function FitWord({ text, weight, size, target, ready, as = 'span', className, style }: { text: string; weight: number; size: number; target: number; ready: boolean; as?: 'span' | 'h1'; className?: string; style?: CSSProperties }) {
  const fit: Fit | null = useMemo(() => (ready ? fitWord(text, weight, size, target) : null), [ready, text, weight, size, target])
  const Tag = as
  return (
    <Tag
      className={`drp-fit${className ? ' ' + className : ''}`}
      data-fit={fit ? '1' : '0'}
      style={{ ...style, fontWeight: weight, fontSize: fit ? fit.size : size, fontVariationSettings: `"wdth" ${fit ? fit.wdth : 100}` }}
    >
      {text}
    </Tag>
  )
}

// ------------------------------------------------------------------ the blood field
export const STEP_MS = 40 // one cell starts every 40 ms, in the model's own cell order
export const DRAW_MS = 240 // an outline takes 240 ms to close
const FILL = [0, 0.38, 0.46, 0.54, 0.62, 0] // Disc, E1..E4, Cup: only spiky cells fill, stronger by grade

export interface FieldApi {
  /** ms since the outlines started; null = everything settled */
  draw(t: number | null): void
}

const toPath = line<[number, number]>()
  .x((p) => p[0])
  .y((p) => p[1])
  .curve(curveCatmullRomClosed.alpha(0.5))

/** The whole 572 x 572 photo with the model's outlines over it, in one SVG so they can never drift apart. */
/** With onPick, a press anywhere picks the nearest cell and the arrow keys step through the cells in the model's order. */
export function Field({ url, cells, t, api, label, onImage, picked = null, onPick }: { url: string; cells: SpikeCell[] | null; t: number | null; api?: Ref<FieldApi>; label: string; onImage?: (ok: boolean) => void; picked?: number | null; onPick?: (i: number | null) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const groups = useRef<(SVGGElement | null)[]>([])
  const lens = useRef<number[]>([])
  const last = useRef<number | null>(t)
  const [px, setPx] = useState(0.75) // image pixels per CSS pixel

  // The load event of an SVG <image> is not dependable: on the published site (pictures come through the
  // service worker) it is sometimes never sent, and the view would wait for ever. An HTML image watches the same URL.
  const onImageRef = useRef(onImage)
  onImageRef.current = onImage
  useEffect(() => {
    let live = true
    const im = new Image()
    im.onload = () => live && onImageRef.current?.(true)
    im.onerror = () => live && onImageRef.current?.(false)
    im.src = url
    return () => {
      live = false
    }
  }, [url])

  useLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const side = Math.max(r.width, r.height)
      if (side > 0) setPx(572 / side)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const paths = useMemo(() => (cells ?? []).map((c) => (c.polygon.length > 2 ? (toPath(c.polygon) ?? '') : '')), [cells])

  const draw = (time: number | null) => {
    last.current = time
    const list = cells ?? []
    for (let i = 0; i < list.length; i++) {
      const g = groups.current[i]
      if (!g) continue
      const p = time === null ? 1 : Math.min(1, Math.max(0, (time - i * STEP_MS) / DRAW_MS))
      const top = g.lastElementChild as SVGPathElement | null
      if (p <= 0) {
        g.style.visibility = 'hidden'
        continue
      }
      g.style.visibility = 'visible'
      if (p >= 1) {
        g.style.strokeDasharray = list[i].border ? `${5 * px} ${4 * px}` : 'none'
        g.style.strokeDashoffset = '0'
        if (top) top.style.fillOpacity = String(FILL[list[i].cls] ?? 0)
      } else {
        const L = lens.current[i] || 1
        g.style.strokeDasharray = `${L} ${L}`
        g.style.strokeDashoffset = String(L * (1 - p))
        if (top) top.style.fillOpacity = '0'
      }
    }
  }

  useImperativeHandle(api, () => ({ draw }))

  useLayoutEffect(() => {
    lens.current = (cells ?? []).map((_, i) => {
      const path = groups.current[i]?.lastElementChild as SVGPathElement | null
      try {
        return path ? path.getTotalLength() : 1
      } catch {
        return 1
      }
    })
    draw(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, t, px])

  const can = !!onPick && !!cells && cells.length > 0
  const press = (e: MouseEvent<SVGSVGElement>) => {
    const el = svg.current
    const m = el?.getScreenCTM()
    if (!can || !el || !m || !cells) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    let best = 0
    let bestD = Infinity
    cells.forEach((c, i) => {
      const d = (c.center[0] - p.x) ** 2 + (c.center[1] - p.y) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    onPick?.(best)
  }
  const keys = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!can || !cells) return
    const n = cells.length
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onPick?.(picked === null ? 0 : (picked + 1) % n)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPick?.(picked === null ? n - 1 : (picked + n - 1) % n)
    else if (e.key === 'Escape' && picked !== null) onPick?.(null)
    else return
    e.preventDefault()
  }
  const pick = can && picked !== null ? paths[picked] : null

  return (
    <svg
      ref={svg}
      className="drp-field"
      viewBox="-0.5 -0.5 572 572"
      preserveAspectRatio="xMidYMid slice"
      role={can ? 'group' : 'img'}
      aria-label={can ? `${label}. Press a cell, or use the arrow keys, to name its shape.` : label}
      tabIndex={can ? 0 : undefined}
      data-pickable={can ? '1' : '0'}
      data-picked={picked ?? ''}
      onClick={can ? press : undefined}
      onKeyDown={can ? keys : undefined}
    >
      <image href={url} x="-0.5" y="-0.5" width="572" height="572" preserveAspectRatio="none" onLoad={() => onImage?.(true)} onError={() => onImage?.(false)} />
      <g data-cells={cells ? cells.length : 0}>
        {(cells ?? []).map((c, i) => (
          <g
            key={c.id}
            ref={(el) => {
              groups.current[i] = el
            }}
            style={{ visibility: 'hidden' }}
          >
            <path className="drp-keyline" d={paths[i]} strokeWidth={4 * px} />
            <path className="drp-line" d={paths[i]} strokeWidth={2 * px} />
          </g>
        ))}
      </g>
      {pick && (
        <g>
          <path className="drp-keyline" d={pick} strokeWidth={8 * px} />
          <path className="drp-line" d={pick} strokeWidth={5 * px} />
        </g>
      )}
    </svg>
  )
}

// ------------------------------------------------------------------ "How do we know?" layer
/** The drape turned over: a bone panel over the words (laptop) or a bottom sheet (phone). The window stays exposed. */
export function HowLayer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="drp-how"
      aria-labelledby="drp-how-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        // a press on the backdrop (outside the panel) closes it
        const d = ref.current
        if (!d || e.target !== d) return
        const r = d.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
      }}
    >
      {open && (
        <>
          <div className="drp-how-head">
            <h2 id="drp-how-title">How do we know?</h2>
            <button type="button" className="drp-close" aria-label="Close" onClick={onClose}>
              <X size={22} weight="bold" />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  )
}

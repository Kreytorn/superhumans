// Shared pieces of prototype B: the status mark, the paper figure, the model's pencil marks on the cells,
// the poster of another check, and the "How do we know?" layer.
import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react/dist/csr/X'
import type { SpikeCell } from '../../engine/spikecount'
import { CHECKS, FIG_H, FIG_W, publicUrl, rowY, type Check, type CheckId, type Status } from './data'

export const INK = '#1D1B19'
export const PENCIL = '#2148F0'
export const PAPER_FIG = '#FAF8F4'
const STATUS_COLOUR: Record<Status, string> = { you: INK, medic: '#A86400', surgeon: '#BF2A1E', abort: '#A8A199' }
const BARS: Record<Status, number> = { you: 0, medic: 1, surgeon: 2, abort: 3 }

/** A status is a shape plus a word: hollow ring = you, ring + 1 bar = crew medic, + 2 = flight surgeon, + 3 = abort. */
export function Mark({ status, size = 14 }: { status: Status; size?: number }) {
  const bars = BARS[status]
  const w = 14 + bars * 5 + (bars ? 2 : 0)
  return (
    <svg className="pb-mark" width={(w * size) / 14} height={size} viewBox={`0 0 ${w} 14`} aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke={STATUS_COLOUR[status]} strokeWidth="2" />
      {Array.from({ length: bars }, (_, i) => (
        <rect key={i} x={15.5 + i * 5} y="1" width="2.6" height="12" fill={STATUS_COLOUR[status]} />
      ))}
    </svg>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="pb-tag">{children}</span>
}

/** One outline as the model draws it: hatched = a spiky cell, empty = a normal one. */
export function Swatch({ spiky }: { spiky: boolean }) {
  return (
    <svg className="pb-swatch" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" fill={PAPER_FIG} />
      {spiky && <path d="M2.1 9.1 9.1 2.1M3.8 12.2 12.2 3.8M6.9 13.9 13.9 6.9" stroke={PENCIL} strokeWidth="1.2" fill="none" />}
      <circle cx="8" cy="8" r="6" fill="none" stroke={PENCIL} strokeWidth="2" />
    </svg>
  )
}

/** The key to the model's marks, read as one short line. */
export function Key() {
  return (
    <span className="pb-key">
      <Swatch spiky /> Spiky
      <span className="pb-key-gap" />
      <Swatch spiky={false} /> Normal
    </span>
  )
}

// ------------------------------------------------------------------ the figure
// Overlapping shapes: stroked together and then filled together, they read as one continuous cut-paper silhouette.
const BODY = (
  <>
    <circle cx="120" cy="48" r="34" />
    <rect x="107" y="72" width="26" height="40" />
    <rect x="40" y="98" width="160" height="62" rx="30" />
    <rect x="40" y="120" width="30" height="196" rx="15" />
    <rect x="170" y="120" width="30" height="196" rx="15" />
    <rect x="80" y="98" width="80" height="222" rx="26" />
    <rect x="80" y="270" width="38" height="282" rx="19" />
    <rect x="122" y="270" width="38" height="282" rx="19" />
  </>
)

/** The cut-paper pictogram with one leader per check. Site buttons and labels are HTML, laid over and beside it. */
export function Figure({ active }: { active: CheckId | null }) {
  return (
    <svg className="pb-fig" viewBox={`0 0 ${FIG_W} ${FIG_H}`} aria-hidden="true">
      <g fill={PAPER_FIG} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" className="pb-fig-edge">
        {BODY}
      </g>
      <g fill={PAPER_FIG}>{BODY}</g>
      {/* cosmic rays have no organ of their own: one straight line passing through the body, the ring where it crosses */}
      <line x1="206" y1="427" x2="38" y2="536" stroke={INK} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {CHECKS.map((c, i) => (
        <path
          key={c.id}
          className={`pb-lead${active === c.id || c.status !== 'you' ? ' is-on' : ''}`}
          d={`M${c.site[0]} ${c.site[1]} L252 ${rowY(i)} L${FIG_W} ${rowY(i)}`}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

/** The status ring drawn on the body site itself (ring centred on the site, bars to its right). */
export function SiteMark({ status }: { status: Status }) {
  const bars = BARS[status]
  return (
    <svg className="pb-site-mark" width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
      <circle r="5.5" fill={PAPER_FIG} stroke={STATUS_COLOUR[status]} strokeWidth="2.2" />
      {Array.from({ length: bars }, (_, i) => (
        <rect key={i} x={9 + i * 5} y="-6.5" width="2.8" height="13" fill={STATUS_COLOUR[status]} />
      ))}
    </svg>
  )
}

// ------------------------------------------------------------------ the model's marks on the cells
export const STEP = 26
export const DRAW = 260
export const HATCH = 160
/** when the last cell's outline and hatching are complete, in ms on the drawing clock */
export const cellsEnd = (n: number) => Math.max(0, n - 1) * STEP + DRAW + HATCH

const HATCH_GAP = [0, 13, 9.5, 7, 4.5] // screen px between hatch lines for spiky grades 1-4: denser by grade

const CellMark = memo(function CellMark({ d, cls, p, f, w, picked, onPick }: { d: string; cls: number; p: number; f: number; w: number; picked: boolean; onPick?: () => void }) {
  const spiky = cls >= 1 && cls <= 4
  const done = p >= 1
  const common = { d, fill: 'none', vectorEffect: 'non-scaling-stroke' as const, pathLength: done ? undefined : 1, strokeDasharray: done ? undefined : '1', strokeDashoffset: done ? undefined : 1 - p, strokeLinejoin: 'round' as const }
  return (
    <g className={`pb-cell${picked ? ' is-picked' : ''}`} onClick={onPick ? (e) => { e.stopPropagation(); onPick() } : undefined}>
      {spiky && f > 0 && <path d={d} fill={`url(#pb-h${cls})`} opacity={f} />}
      <path {...common} stroke={PAPER_FIG} strokeWidth={picked ? w + 4 : w + 2} />
      <path {...common} stroke={PENCIL} strokeWidth={picked ? w + 1.5 : w} />
      {onPick && <path d={d} fill="transparent" />}
    </g>
  )
})

interface CellsProps {
  cells: SpikeCell[]
  /** ms on the drawing clock; Infinity = settled */
  t: number
  picked?: number | null
  onPick?: (i: number | null) => void
  pickLabel?: (c: SpikeCell) => string
}

/** Outlines in the model's own cell order; spiky cells hatched, denser by grade. Same crop as the photo (cover). */
export function Cells({ cells, t, picked = null, onPick, pickLabel }: CellsProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 900, h: 900 })
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const read = () => setBox({ w: el.clientWidth || 900, h: el.clientHeight || 900 })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = Math.max(box.w, box.h) / 572
  // pencil weight in screen px: 2.5 on a phone, heavier on a laptop stage so it carries on a projector
  const w = Math.max(2.5, Math.min(3.6, Math.max(box.w, box.h) / 250))
  const paths = useMemo(() => cells.map((c) => c.polygon.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z'), [cells])
  const canPick = !!onPick && t === Infinity
  const onKey = (e: KeyboardEvent) => {
    if (!canPick || !cells.length) return
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step) {
      e.preventDefault()
      onPick?.(picked === null ? 0 : (picked + step + cells.length) % cells.length)
    } else if (e.key === 'Escape' && picked !== null) {
      e.preventDefault()
      onPick?.(null)
    }
  }
  const pc = picked !== null ? cells[picked] : null
  const px = pc ? (box.w - 572 * scale) / 2 + (pc.center[0] + 0.5) * scale : 0
  const py = pc ? (box.h - 572 * scale) / 2 + (pc.center[1] + 0.5) * scale : 0
  return (
    <div className="pb-cells" ref={wrap}>
      <svg
        viewBox="-0.5 -0.5 572 572"
        preserveAspectRatio="xMidYMid slice"
        tabIndex={canPick ? 0 : undefined}
        role={canPick ? 'group' : 'img'}
        aria-label={canPick ? `${cells.length} outlined cells. Press a cell, or use the arrow keys, to read its shape.` : `${cells.length} cells outlined by the model`}
        onKeyDown={onKey}
        onClick={canPick ? () => onPick?.(null) : undefined}
      >
        <defs>
          {[1, 2, 3, 4].map((g) => {
            const s = (HATCH_GAP[g] * (w / 2.5)) / scale
            return (
              <pattern key={g} id={`pb-h${g}`} patternUnits="userSpaceOnUse" width={s} height={s} patternTransform="rotate(-45)">
                <line x1="0" y1={s / 2} x2={s} y2={s / 2} stroke={PENCIL} strokeWidth={(0.52 * w) / scale} />
              </pattern>
            )
          })}
        </defs>
        {cells.map((c, i) => {
          const start = i * STEP
          if (t < start) return null
          const p = t === Infinity ? 1 : Math.min(1, Math.round(((t - start) / DRAW) * 50) / 50)
          const f = t === Infinity ? 1 : Math.max(0, Math.min(1, Math.round(((t - start - DRAW * 0.6) / HATCH) * 20) / 20))
          return <CellMark key={c.id} d={paths[i]} cls={c.cls} p={p} f={f} w={w} picked={picked === i} onPick={canPick ? () => onPick?.(picked === i ? null : i) : undefined} />
        })}
      </svg>
      {pc && pickLabel && (
        <p className="pb-pick" role="status" style={{ left: Math.max(84, Math.min(box.w - 84, px)), top: Math.max(40, py - Math.sqrt(pc.area / Math.PI) * scale - 10) }}>
          {pickLabel(pc)}
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ posters of the other five checks
interface Resolved {
  url: string | null
  bg: string
  /** false = the picture runs to its edges, so it fills the stage instead of sitting on a ground */
  flat: boolean
}
const posterCache = new Map<CheckId, Promise<Resolved>>()
const posterNow = new Map<CheckId, Resolved>()

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => (img.naturalWidth > 1 ? resolve(img) : reject(new Error('empty image')))
    img.onerror = () => reject(new Error('no image'))
    img.src = url
  })
}

/** Corner colours of a poster: a flat ground is shown whole on that ground; a full-bleed picture fills the stage. */
function ground(img: HTMLImageElement): { bg: string; flat: boolean } {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 2
    const g = c.getContext('2d', { willReadFrequently: true })!
    const w = img.naturalWidth
    const h = img.naturalHeight
    const px = [
      [0, 0],
      [w - 12, 0],
      [0, h - 12],
      [w - 12, h - 12],
    ].map(([x, y]) => {
      g.drawImage(img, x, y, 12, 12, 0, 0, 2, 2)
      return Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3))
    })
    const spread = Math.max(...[0, 1, 2].map((k) => Math.max(...px.map((q) => q[k])) - Math.min(...px.map((q) => q[k]))))
    return { bg: `rgb(${px[0][0]} ${px[0][1]} ${px[0][2]})`, flat: spread < 28 }
  } catch {
    return { bg: '#101312', flat: true }
  }
}

/** The poster when it exists (they arrive during the night), else a real still of that check, else nothing. */
export function resolvePoster(c: Check): Promise<Resolved> {
  let p = posterCache.get(c.id)
  if (!p) {
    p = (async () => {
      const tries = [`_posters/${c.id}_portrait.jpg`, `_posters/${c.id}.jpg`, ...(c.fallback ? [c.fallback] : [])]
      for (const rel of tries) {
        try {
          const img = await loadImage(publicUrl(rel))
          return { url: img.src, ...ground(img) }
        } catch {
          /* try the next one */
        }
      }
      return { url: null, bg: PAPER_FIG, flat: true }
    })()
    p.then((r) => posterNow.set(c.id, r))
    posterCache.set(c.id, p)
  }
  return p
}

export function usePoster(c: Check | null | undefined): Resolved | undefined {
  const [, bump] = useState(0)
  useEffect(() => {
    if (!c || posterNow.has(c.id)) return
    let live = true
    resolvePoster(c).then(() => live && bump((n) => n + 1))
    return () => {
      live = false
    }
  }, [c])
  return c ? posterNow.get(c.id) : undefined
}

export function Poster({ check, onReady }: { check: Check; onReady?: () => void }) {
  const r = usePoster(check)
  useEffect(() => {
    if (r) onReady?.()
  }, [r, onReady])
  if (!r) return <div className="pb-poster" />
  if (!r.url)
    return (
      <div className="pb-poster pb-poster-none">
        <p>{check.specimen}</p>
      </div>
    )
  return (
    <div className={`pb-poster${r.flat ? '' : ' is-bleed'}`} style={{ background: r.bg }}>
      <img src={r.url} alt={`${check.specimen}: a real sample with the model's result drawn on it`} draggable={false} />
    </div>
  )
}

// ------------------------------------------------------------------ the second layer
export function Layer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
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
      className="pb-how"
      aria-labelledby="pb-how-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="pb-how-in">
        <header className="pb-how-head">
          <h2 id="pb-how-title">How do we know?</h2>
          <button type="button" className="pb-icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
        </header>
        {open ? children : null}
      </div>
    </dialog>
  )
}

/** The four status words and who each one calls (same on every view). */
export function StatusLadder({ current }: { current?: Status }) {
  const rows: [Status, string, string][] = [
    ['you', 'You', 'Quiet or routine: you handle it yourself.'],
    ['medic', 'Crew medic', 'The crew medical officer on board runs the next test.'],
    ['surgeon', 'Flight surgeon', 'The doctor on the ground decides. Our models never fire this step by themselves.'],
    ['abort', 'Abort', 'Early return. Always greyed: our data never fires it.'],
  ]
  return (
    <ul className="pb-ladder">
      {rows.map(([s, word, line]) => (
        <li key={s} className={s === 'abort' || s === 'surgeon' ? 'is-grey' : undefined} aria-current={current === s ? 'true' : undefined}>
          <Mark status={s} />
          <span>
            <b>{word}.</b> {line}
          </span>
        </li>
      ))}
    </ul>
  )
}

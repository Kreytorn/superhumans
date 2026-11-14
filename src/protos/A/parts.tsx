// Prototype A "Viewbox": small parts (status mark, tag, a film's still with fallbacks, the model's marks, the dialog).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CLASS_PLAIN, type SpikeCell } from '../../engine/spikecount'
import { checkById, type CheckId, type StatusKind } from './content'

const BASE = import.meta.env.BASE_URL

/**
 * Status is a word plus a shape; colour only on the mark. The ring fills as the call goes up the ladder:
 * hollow (you), a core (crew medic), solid (flight surgeon), solid and struck through (abort).
 */
export function Mark({ kind }: { kind: StatusKind | 'nodata' }) {
  return (
    <svg className="vb-mark" data-kind={kind} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill={kind === 'surgeon' || kind === 'abort' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeDasharray={kind === 'nodata' ? '3 2.5' : undefined} />
      {kind === 'medic' ? <circle cx="8" cy="8" r="2.75" fill="currentColor" /> : null}
      {kind === 'abort' ? <rect x="3.5" y="7" width="9" height="2" className="vb-mark-cut" /> : null}
    </svg>
  )
}

/** The key for the outlines on the blood film: a filled swatch is a spiky cell, an empty one a smooth cell (same hue). */
export function Swatch({ spiky }: { spiky: boolean }) {
  return <span className="vb-swatch" data-spiky={spiky ? 1 : 0} aria-hidden="true" />
}

export function Tag({ children, film }: { children: ReactNode; film?: boolean }) {
  return <span className={film ? 'vb-tag vb-tag--film' : 'vb-tag'}>{children}</span>
}

// ---------------------------------------------------------------- stills
const blood = (field: number) => `${BASE}spikecount/fields/${field}.png`
/** Real stills to fall back on while a poster has not been made yet. */
const FALLBACK_IMG: Partial<Record<CheckId, string>> = { braindrift: `${BASE}braindrift/pvs/pvs-mid_axial_model.webp` }

async function gunzipMaybe(raw: ArrayBuffer): Promise<ArrayBuffer> {
  const head = new Uint8Array(raw, 0, 2)
  if (head[0] !== 0x1f || head[1] !== 0x8b) return raw
  return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
}

/** BubbleGrade fallback: the stored picture of the heart sound (64 mel bands by time), drawn as it is. */
async function drawHeartSound(c: HTMLCanvasElement) {
  const r = await fetch(`${BASE}bubblegrade/precomputed/grade-3.spec.u8.gz`)
  if (!r.ok) throw new Error('no spectrogram')
  const u8 = new Uint8Array(await gunzipMaybe(await r.arrayBuffer()))
  const rows = 64
  const cols = Math.floor(u8.length / rows)
  c.width = cols
  c.height = rows
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const img = ctx.createImageData(cols, rows)
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const v = u8[(rows - 1 - y) * cols + x]
      const i = (y * cols + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
}

/** TrackTrace fallback: one real nucleus (128 x 128) from the held-out gallery, as the model sees it. */
async function drawNucleus(c: HTMLCanvasElement) {
  const tt = await import('../../engine/tracktrace')
  const x = await tt.sampleImage('nucleus-238')
  let lo = Infinity
  let hi = -Infinity
  for (const v of x) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const img = ctx.createImageData(128, 128)
  for (let i = 0; i < 128 * 128; i++) {
    const v = Math.round((255 * (x[i] - lo)) / (hi - lo || 1))
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

function CanvasStill({ draw, onDone, onFail }: { draw: (c: HTMLCanvasElement) => Promise<void>; onDone: () => void; onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let off = false
    if (ref.current)
      draw(ref.current)
        .then(() => !off && onDone())
        .catch(() => !off && onFail())
    return () => {
      off = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <canvas ref={ref} className="vb-still" />
}

/** Where a film hangs: a tall slat (Home on a laptop), a wide band (Home on a phone), or pulled open. */
export type Frame = 'slat' | 'band' | 'open'
interface Crop {
  /** which poster: l = 1600 x 1000, p = 900 x 1200 */
  src: 'l' | 'p'
  /** the part of the poster this frame may show, in poster pixels: x0, y0, x1, y1. The frame is always filled from inside it. */
  rect: [number, number, number, number]
  /** a micrograph has no "up": turn it a quarter so a vertical track runs along a wide band */
  turn?: boolean
}
const POSTER = { l: [1600, 1000], p: [900, 1200] } as const
/**
 * Each film shows the specimen and what the model drew on it, never the whole poster: one nucleus with its circles
 * and track line (not the mosaic of nuclei), the brainwave traces (not the chart under them), one ultrasound frame.
 */
const CROPS: Record<Exclude<CheckId, 'spikecount'>, Record<Frame, Crop>> = {
  tracktrace: {
    slat: { src: 'l', rect: [180, 310, 380, 690] },
    band: { src: 'l', rect: [140, 310, 420, 690], turn: true },
    open: { src: 'l', rect: [32, 270, 492, 730] },
  },
  bubblegrade: {
    slat: { src: 'l', rect: [600, 300, 900, 1000] },
    band: { src: 'l', rect: [500, 760, 1100, 1000] },
    open: { src: 'l', rect: [300, 0, 1300, 1000] },
  },
  veinsqueeze: {
    slat: { src: 'l', rect: [330, 150, 570, 650] },
    band: { src: 'l', rect: [230, 290, 670, 480] },
    open: { src: 'l', rect: [80, 40, 780, 780] },
  },
  braindrift: {
    slat: { src: 'l', rect: [560, 150, 1010, 880] },
    band: { src: 'l', rect: [420, 330, 1180, 640] },
    open: { src: 'l', rect: [330, 60, 1270, 940] },
  },
  garnmeter: {
    slat: { src: 'l', rect: [140, 25, 420, 600] },
    band: { src: 'l', rect: [60, 60, 560, 330] },
    open: { src: 'l', rect: [40, 25, 790, 600] },
  },
}
/** CSS variables that size and place a poster so the frame is filled from inside the crop (see .vb-still--crop). */
function cropVars(c: Crop): CSSProperties {
  const [W, H] = POSTER[c.src]
  const [x0, y0, x1, y1] = c.rect
  const rw = x1 - x0
  const rh = y1 - y0
  return { '--kx': W / (c.turn ? rh : rw), '--ky': W / (c.turn ? rw : rh), '--cx': (x0 + x1) / 2 / W, '--cy': (y0 + y1) / 2 / H, '--ar': W / H } as CSSProperties
}

/**
 * The picture on a film. Posters (settled results) live in public/_posters/: use the cropped poster when it is there,
 * otherwise a real asset of that check, otherwise the film base with the check's name.
 * With a frame, the picture sits in its own window (the blood photo passes none: it fills its square).
 */
export function Still({ id, frame, onReady, field = 96 }: { id: CheckId; frame?: Frame; onReady?: (id: CheckId) => void; field?: number }) {
  const crop = id === 'spikecount' ? null : CROPS[id][frame ?? 'open']
  const urls = crop
    ? [`${BASE}_posters/${id}${crop.src === 'p' ? '_portrait' : ''}.jpg`, `${BASE}_posters/${id}${crop.src === 'p' ? '' : '_portrait'}.jpg`, FALLBACK_IMG[id]].filter((u): u is string => !!u)
    : [blood(field)]
  // ?noposters=1 skips the posters, to check the fallbacks while the posters exist
  const [i, setI] = useState(() => (id !== 'spikecount' && location.hash.includes('noposters=1') ? 2 : 0))
  const [blank, setBlank] = useState(false)
  const done = () => onReady?.(id)
  let pic: ReactNode
  if (i < urls.length)
    pic = (
      <img
        className={crop && i === 0 ? 'vb-still vb-still--crop' : 'vb-still'}
        data-id={id}
        data-turn={crop?.turn && i === 0 ? 1 : undefined}
        style={crop && i === 0 ? cropVars(crop) : undefined}
        src={urls[i]}
        alt=""
        draggable={false}
        onLoad={done}
        onError={() => setI(i + 1)}
      />
    )
  else if (!blank && (id === 'bubblegrade' || id === 'tracktrace'))
    pic = <CanvasStill draw={id === 'bubblegrade' ? drawHeartSound : drawNucleus} onDone={done} onFail={() => { setBlank(true); done() }} />
  else if (!blank && id === 'veinsqueeze')
    pic = <video className="vb-still" src={`${BASE}veinsqueeze/clips/clip_A.webm`} muted playsInline preload="metadata" onLoadedData={done} onError={() => { setBlank(true); done() }} />
  else pic = <BlankStill id={id} onReady={done} />
  return frame ? <span className="vb-win">{pic}</span> : pic
}

function BlankStill({ id, onReady }: { id: CheckId; onReady: () => void }) {
  useEffect(() => {
    onReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <span className="vb-still vb-still--blank">{checkById(id)?.specimen}</span>
}

// ---------------------------------------------------------------- what the model drew
/**
 * One outline per cell, in the model's own cell order, all in the one model colour. A smooth cell is a thin outline
 * only; a spiky cell has a heavier outline and is filled, deeper by grade (1 to 4). The film edge carries the key.
 */
export function Marks({ cells, drawn, picked, onPick }: { cells: SpikeCell[]; drawn: number; picked?: number | null; onPick?: (i: number | null) => void }) {
  return (
    <svg className="vb-marks" viewBox="0 0 572 572" aria-hidden="true">
      {cells.map((c, i) => {
        const pts = c.polygon.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(' ')
        const spiky = c.cls >= 1 && c.cls <= 4
        return (
          <g key={c.id} className="vb-cell" data-on={i < drawn ? 1 : 0} data-spiky={spiky ? 1 : 0} data-picked={picked === i ? 1 : undefined}>
            <polygon className="vb-cell-key" points={pts} />
            <polygon
              className="vb-cell-line"
              points={pts}
              fillOpacity={spiky ? 0.3 + 0.06 * c.cls : 0}
              onPointerEnter={onPick && i < drawn ? () => onPick(i) : undefined}
              onPointerDown={onPick && i < drawn ? () => onPick(i) : undefined}
            />
          </g>
        )
      })}
    </svg>
  )
}

/**
 * The loupe: the real pixels of one cell, magnified, with the grader's top shape for it in plain words.
 * Positions are percentages of the photo, so it needs no measuring.
 */
export function Loupe({ cell, field = 96 }: { cell: SpikeCell; field?: number }) {
  const span = Math.min(220, Math.max(56, Math.sqrt(cell.area) * 1.9)) // image pixels across the glass
  const [cx, cy] = cell.center
  const pos = (c: number) => Math.max(0, Math.min(100, ((c - span / 2) / (572 - span)) * 100))
  const r = Math.sqrt(cell.area / Math.PI)
  const below = cy < 250 // the glass needs room above the cell, most of all on a phone
  return (
    <div className="vb-loupe" data-below={below ? 1 : undefined} style={{ left: `clamp(84px, ${(cx / 572) * 100}%, calc(100% - 84px))`, top: `${((below ? cy + r + 10 : cy - r - 10) / 572) * 100}%` }}>
      <span className="vb-loupe-glass" style={{ backgroundImage: `url(${blood(field)})`, backgroundSize: `${(572 / span) * 100}%`, backgroundPosition: `${pos(cx)}% ${pos(cy)}%` }} />
      <span className="vb-loupe-name">{CLASS_PLAIN[cell.className]}</span>
    </div>
  )
}

// ---------------------------------------------------------------- the second layer
export function How({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
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
      className="vb-how"
      aria-labelledby="vb-how-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="vb-how-body">
        <header className="vb-how-head">
          <h2 id="vb-how-title">How do we know?</h2>
          <button type="button" className="vb-how-close" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        </header>
        {open ? children : null}
      </div>
    </dialog>
  )
}

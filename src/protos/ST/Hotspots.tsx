// Station: the six hotspots that ride on the station. Their positions come from the render's track, one
// entry per loop frame; `apply(frame)` writes them straight to the DOM (no React render per frame).
import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref, type RefObject } from 'react'
import type { Box } from './lib/cover'
import type { Track } from './lib/manifest'
import type { CheckId } from './modules/types'
import { CHECKS } from './registry'

export interface HotspotsHandle {
  /** Moves every hotspot to where the track puts it on this loop frame. */
  apply(frame: number): void
  /** Where a hotspot is now, in px of the cover box. */
  point(id: CheckId): { x: number; y: number } | null
  focus(id: CheckId): void
  /** Moves keyboard focus to the next (1) or previous (-1) hotspot. */
  step(dir: 1 | -1): void
}

interface Props {
  ref?: Ref<HotspotsHandle>
  track: Track | null
  boxRef: RefObject<Box | null>
  /** The hotspot that was pressed and is being flown to. */
  pressed: CheckId | null
  /** The hotspot whose name and sentence are shown (hover, keyboard focus, or pinned). */
  reveal: CheckId | null
  /** true while the hotspots are the page's main action (home). The first one then carries data-qa="primary". */
  primary: boolean
  hrefFor(view: string): string
  onReveal(id: CheckId | null, how: 'pointer' | 'focus'): void
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Shape {
  for: Track | null
  /** the middle of the hotspots' reach across the frame (0..1): the station's middle, roughly */
  midX: number
  /** per hotspot (pitch order): true when it does not move over the loop (the hub, the airlock) */
  still: boolean[]
}

function shapeOf(t: Track): Shape {
  let lo = 1
  let hi = 0
  const still = CHECKS.map((c) => {
    const xs = t.x[c.id] ?? []
    const ys = t.y[c.id] ?? []
    let x0 = 1
    let x1 = 0
    let y0 = 1
    let y1 = 0
    for (let i = 0; i < xs.length; i++) {
      x0 = Math.min(x0, xs[i])
      x1 = Math.max(x1, xs[i])
      y0 = Math.min(y0, ys[i] ?? 0)
      y1 = Math.max(y1, ys[i] ?? 0)
    }
    lo = Math.min(lo, x0)
    hi = Math.max(hi, x1)
    return xs.length > 0 && x1 - x0 < 0.006 && y1 - y0 < 0.006
  })
  return { for: t, midX: hi > lo ? (lo + hi) / 2 : 0.5, still }
}

/**
 * The page's own words that sit on the frame, as boxes in px of the film box (with a little air round them): the
 * wordmark, the AI mark, and the lower block, from the top of its taller form (a check's label, name and
 * sentence, shown on hover) down to the hint, as wide as its widest line. Read once per box, not per frame.
 */
function wordsOn(root: Element | null, box: Box): [number, number, number, number][] {
  if (!root) return []
  const out: [number, number, number, number][] = []
  const add = (l: number, t: number, r: number, b: number, pad = 8) => {
    if (r > l && b > t) out.push([l - box.x - pad, t - box.y - pad, r - box.x + pad, b - box.y + pad])
  }
  for (const sel of ['.st-mark', '.st-ai[data-at="right"]']) {
    const r = root.querySelector(sel)?.getBoundingClientRect()
    if (r) add(r.left, r.top, r.right, r.bottom)
  }
  const site = root.querySelector('.st-siteline')?.getBoundingClientRect()
  const hint = root.querySelector('.st-hint')?.getBoundingClientRect()
  const label = root.querySelector('.st-lower-label')?.getBoundingClientRect()
  const line = root.querySelector('.st-lower-line')?.getBoundingClientRect()
  if (site && hint) add(site.left, Math.min(site.top, label?.top ?? site.top), Math.max(site.right, line?.right ?? 0), hint.bottom)
  return out
}

export function Hotspots({ ref, track, boxRef, pressed, reveal, primary, hrefFor, onReveal }: Props) {
  const els = useRef<(HTMLAnchorElement | null)[]>([])
  const pos = useRef<({ x: number; y: number } | null)[]>([])
  const side = useRef<string[]>([])
  const seen = useRef<number[]>([])
  const trackRef = useRef(track)
  const frameRef = useRef(0)
  const shape = useRef<Shape>({ for: null, midX: 0.5, still: [] })
  /** each label's width (leader line + words), measured once per box */
  const tagW = useRef<number[]>([])
  const widthsFor = useRef<Box | null>(null)
  /** each ring's size on this frame (the track's s) */
  const scaleNow = useRef<number[]>([])
  /** the page's own words on the frame (wordmark, AI mark, the lower block), in px of the box, measured once per
   *  box with the label widths: a label fades rather than lie on them (REVIEW_LEAD 8) */
  const words = useRef<[number, number, number, number][]>([])
  /** the hotspot that is aimed at (hover, focus, pinned): its label is placed first and never fades */
  const aimed = useRef(-1)
  aimed.current = CHECKS.findIndex((c) => c.id === reveal)

  const apply = (frame: number) => {
    frameRef.current = frame
    const box = boxRef.current
    const t = trackRef.current
    if (!box || !t) return
    const f = Math.min(Math.max(0, frame), t.frames - 1)
    for (let i = 0; i < CHECKS.length; i++) {
      const el = els.current[i]
      if (!el) continue
      const id = CHECKS[i].id
      const x = t.x[id]?.[f]
      const y = t.y[id]?.[f]
      if (x === undefined || y === undefined) {
        el.style.visibility = 'hidden'
        pos.current[i] = null
        continue
      }
      const px = x * box.w
      const py = y * box.h
      pos.current[i] = { x: px, y: py }
      el.style.visibility = ''
      el.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`
      const s = clamp(t.s[id]?.[f] ?? 1, 0.6, 1.4)
      scaleNow.current[i] = s
      el.style.setProperty('--s', s.toFixed(3))
      const v = (t.v[id]?.[f] ?? 1) ? 1 : 0
      if (seen.current[i] !== v) {
        seen.current[i] = v
        el.dataset.v = String(v)
      }
    }
    placeLabels(box)
  }

  // The labels, once per frame, from positions only (the label widths are measured once per box, so nothing
  // here reads layout). Text must never run into text or into another point:
  // 1. Side: a moving point's label points outward, away from the middle of the station, so labels stay off
  //    the hub. A point that does not move (the hub, the airlock) turns its label away from its nearest
  //    neighbour. A side without room on screen gives way to the other. Switches have slack (no flicker).
  // 2. Overlap: in order (the aimed point, then points in view, then points behind the station, each in pitch
  //    order), a label that would cross a label already placed or another point's ring fades out until it is
  //    clear; its point stays. Hover and focus always show it (st.css).
  const placeLabels = (box: Box) => {
    const t = trackRef.current
    if (!t) return
    if (shape.current.for !== t) shape.current = shapeOf(t)
    if (widthsFor.current !== box) {
      widthsFor.current = box
      for (let i = 0; i < CHECKS.length; i++) {
        const tag = els.current[i]?.querySelector<HTMLElement>('.st-spot-tag')
        if (tag && tag.offsetWidth > 0) tagW.current[i] = tag.offsetWidth
      }
      words.current = wordsOn(els.current[0]?.closest('.st') ?? null, box)
    }
    const { midX, still } = shape.current
    const cx = midX * box.w
    const edge = 6
    const gapOf = (i: number) => 10 * (scaleNow.current[i] ?? 1) + 8
    const sides: ('l' | 'r')[] = []
    for (let i = 0; i < CHECKS.length; i++) {
      const p = pos.current[i]
      if (!p) continue
      const sx = box.x + p.x
      const w = tagW.current[i] ?? 130
      const was = (side.current[i] ?? 'r') as 'l' | 'r'
      let want: 'l' | 'r' = was
      if (still[i]) {
        let near: number | null = null
        for (let j = 0; j < CHECKS.length; j++) {
          const q = pos.current[j]
          if (j === i || !q) continue
          const dx = q.x - p.x
          if (Math.abs(q.y - p.y) < 60 && Math.abs(dx) < w + 40 && (near === null || Math.abs(dx) < Math.abs(near))) near = dx
        }
        if (near !== null) want = near > 0 ? 'l' : 'r'
      } else if (p.x < cx - 12) want = 'l'
      else if (p.x > cx + 12) want = 'r'
      const fits = (s: 'l' | 'r') => (s === 'l' ? sx - gapOf(i) - w > edge : sx + gapOf(i) + w < box.vw - edge)
      if (!fits(want) && fits(want === 'l' ? 'r' : 'l')) want = want === 'l' ? 'r' : 'l'
      sides[i] = want
    }

    const order = CHECKS.map((_, i) => i).sort((a, b) => {
      const rank = (i: number) => (i === aimed.current ? 0 : seen.current[i] === 0 ? 2 : 1)
      return rank(a) - rank(b) || a - b
    })
    const placed: [number, number, number, number][] = []
    for (const i of order) {
      const el = els.current[i]
      const p = pos.current[i]
      if (!el || !p) continue
      const s = sides[i] ?? 'r'
      if (side.current[i] !== s) {
        side.current[i] = s
        el.dataset.side = s
      }
      const w = tagW.current[i] ?? 130
      const x0 = s === 'r' ? p.x + gapOf(i) : p.x - gapOf(i) - w
      const r: [number, number, number, number] = [x0, p.y - 9, x0 + w, p.y + 9]
      let hit = false
      for (const o of placed) if (r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]) hit = true
      for (const o of words.current) if (r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]) hit = true
      for (let j = 0; j < CHECKS.length && !hit; j++) {
        const q = pos.current[j]
        if (j === i || !q) continue
        if (r[0] < q.x + 15 && r[2] > q.x - 15 && r[1] < q.y + 15 && r[3] > q.y - 15) hit = true
      }
      const quiet = hit && i !== aimed.current ? '1' : '0'
      if (el.dataset.quiet !== quiet) el.dataset.quiet = quiet
      if (quiet === '0') placed.push(r)
    }
  }

  useImperativeHandle(ref, () => ({
    apply,
    point(id) {
      return pos.current[CHECKS.findIndex((c) => c.id === id)] ?? null
    },
    focus(id) {
      els.current[CHECKS.findIndex((c) => c.id === id)]?.focus({ preventScroll: true })
    },
    step(dir) {
      const at = els.current.findIndex((el) => el === document.activeElement)
      const next = at < 0 ? (dir === 1 ? 0 : CHECKS.length - 1) : (at + dir + CHECKS.length) % CHECKS.length
      els.current[next]?.focus({ preventScroll: true })
    },
  }))

  useEffect(() => {
    trackRef.current = track
    apply(frameRef.current)
  })
  // Where the mouse last really moved to. A point that the turning station slides under a pointer resting on the
  // screen (after Back, say) gets a pointerenter at that same place: it is not being aimed at, so it does not
  // reveal its check or slow the station (its own hover look still shows, and a press still opens it).
  const lastMove = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const on = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') lastMove.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', on, { passive: true, capture: true })
    return () => window.removeEventListener('pointermove', on, { capture: true })
  }, [])
  const aimedByMove = (e: { clientX: number; clientY: number }) => {
    const m = lastMove.current
    return !m || Math.abs(m.x - e.clientX) >= 1 || Math.abs(m.y - e.clientY) >= 1
  }
  // The label widths are measured again once the real fonts are in.
  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => {
      if (!live) return
      widthsFor.current = null
      apply(frameRef.current)
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Away from home the points can be neither focused nor pressed: a point that kept keyboard focus while hidden
  // would take the key meant for the film (Space to skip a scene would open that point's check instead).
  return (
    <nav className="st-hot" aria-label="Health checks, placed on the station" inert={!primary}>
      {CHECKS.map((c, i) => (
        <a
          key={c.id}
          ref={(el) => {
            els.current[i] = el
          }}
          className="st-spot"
          href={hrefFor(c.id)}
          data-id={c.id}
          data-qa={i === 0 && primary ? 'primary' : undefined}
          data-on={reveal === c.id ? 1 : 0}
          data-pressed={pressed === c.id ? 1 : 0}
          aria-label={`${c.label}: open ${c.name}`}
          draggable={false}
          style={{ '--d': `${(i * 0.53).toFixed(2)}s` } as CSSProperties}
          onPointerEnter={(e) => e.pointerType === 'mouse' && aimedByMove(e) && onReveal(c.id, 'pointer')}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onReveal(null, 'pointer')}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && onReveal(c.id, 'focus')}
          onBlur={() => onReveal(null, 'focus')}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault()
              e.currentTarget.click()
            }
          }}
        >
          <span className="st-spot-ring" aria-hidden="true">
            <i className="st-spot-pulse" />
            <svg className="st-spot-ret" viewBox="-28 -28 56 56">
              <circle r="21" pathLength="100" strokeDasharray="17 8" strokeDashoffset="21" />
              <path d="M0-27v6M0 27v-6M-27 0h6M27 0h-6" />
            </svg>
          </span>
          <span className="st-spot-tag" aria-hidden="true">
            <i className="st-spot-lead" />
            <span className="st-spot-label">{c.label}</span>
          </span>
        </a>
      ))}
    </nav>
  )
}

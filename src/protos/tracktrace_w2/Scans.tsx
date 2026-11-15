// How IonScan reads every nucleus: the real 32 x 32 token grid, read along 4 directions, each both ways (8 scans).
// Shows reading order only. It never shows a found direction.
import { useEffect, useRef } from 'react'
import { tokens } from './paint'

const G = 32

function orders(): Int16Array[] {
  const idx = (r: number, c: number) => r * G + c
  const rows: number[] = []
  const cols: number[] = []
  const diag: number[] = []
  const anti: number[] = []
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) rows.push(idx(r, c))
  for (let c = 0; c < G; c++) for (let r = 0; r < G; r++) cols.push(idx(r, c))
  for (let s = 0; s <= 2 * (G - 1); s++) for (let r = 0; r < G; r++) { const c = s - r; if (c >= 0 && c < G) diag.push(idx(r, c)) }
  for (let s = -(G - 1); s <= G - 1; s++) for (let r = 0; r < G; r++) { const c = r - s; if (c >= 0 && c < G) anti.push(idx(r, c)) }
  const out: Int16Array[] = []
  for (const o of [rows, cols, diag, anti]) {
    out.push(Int16Array.from(o))
    out.push(Int16Array.from(o.slice().reverse()))
  }
  return out
}

export const SCAN_NAMES = ['rows, forward', 'rows, backward', 'columns, forward', 'columns, backward', 'diagonal, forward', 'diagonal, backward', 'other diagonal, forward', 'other diagonal, backward']
const ARROWS = ['→', '←', '↓', '↑', '↘', '↖', '↙', '↗']

export default function Scans({ x }: { x: Float32Array | null }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([])
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!x) return
    const tok = tokens(x)
    const ord = orders()
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true })
    if (wrap.current) io.observe(wrap.current)
    const CELL = 6
    const PERIOD = 3600
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (!visible) return
      for (let k = 0; k < 8; k++) {
        const cv = refs.current[k]
        if (!cv) continue
        if (cv.width !== G * CELL) { cv.width = G * CELL; cv.height = G * CELL }
        const ctx = cv.getContext('2d')
        if (!ctx) continue
        ctx.clearRect(0, 0, cv.width, cv.height)
        const p = still ? 0.62 : ((now + k * (PERIOD / 8)) % PERIOD) / (PERIOD * 0.8)
        const headPos = Math.min(1, p) * G * G
        const o = ord[k]
        for (let i = 0; i < G * G; i++) {
          const id = o[i]
          const r = (id / G) | 0
          const c = id % G
          const v = tok[id]
          const read = i < headPos
          const near = headPos - i
          let a = 0.13 + v * 0.34
          let col = '150,150,255'
          if (read) {
            a = 0.12 + v * 0.88
            col = '255,238,226'
            if (near < 46) { a = Math.min(1, a + (1 - near / 46) * 0.75); col = near < 12 ? '255,255,255' : '255,120,196' }
          }
          ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`
          ctx.fillRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1)
        }
      }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [x])

  return (
    <div className="w2-scans" ref={wrap}>
      {SCAN_NAMES.map((n, k) => (
        <figure className="w2-scan" key={n}>
          <canvas ref={(el) => { refs.current[k] = el }} aria-hidden="true" />
          <figcaption>
            <span className="w2-scan-n">{k + 1}</span>
            <span className="w2-scan-arrow" aria-hidden="true">{ARROWS[k]}</span>
            <span className="w2-scan-name">{n}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

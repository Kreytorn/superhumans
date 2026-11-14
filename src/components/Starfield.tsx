// Deck-style night sky: nebula radials + a seeded starfield on one canvas. Drawn by our code (AI-assisted),
// so the screen carries the "AI-generated background" mark (PLAYBOOK §7).
import { useEffect, useRef } from 'react'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Starfield({ tint = 'rgba(70,60,170,.22)' }: { tint?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const draw = () => {
      const w = (c.width = Math.round(c.clientWidth * Math.min(devicePixelRatio, 1.5)))
      const h = (c.height = Math.round(c.clientHeight * Math.min(devicePixelRatio, 1.5)))
      const g = c.getContext('2d')
      if (!g) return
      g.clearRect(0, 0, w, h)
      const neb = (x: number, y: number, r: number, col: string) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r)
        gr.addColorStop(0, col)
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, w, h)
      }
      neb(w * 0.75, h * 0.22, w * 0.55, tint)
      neb(w * 0.12, h * 0.9, w * 0.45, 'rgba(20,90,140,.16)')
      const rnd = mulberry32(7)
      const cols = ['255,255,255', '195,214,255', '210,225,255', '255,240,214']
      const n = Math.round((w * h) / 5200)
      for (let i = 0; i < n; i++) {
        const x = rnd() * w
        const y = rnd() * h
        const big = rnd() < 0.06
        const r = (big ? 1.1 + rnd() * 1.2 : 0.4 + rnd() * 0.5) * (w / 1920)
        g.fillStyle = `rgba(${cols[i % 4]},${big ? 0.75 + rnd() * 0.2 : 0.25 + rnd() * 0.3})`
        g.beginPath()
        g.arc(x, y, Math.max(r, 0.5), 0, Math.PI * 2)
        g.fill()
      }
      const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,.55)')
      g.fillStyle = v
      g.fillRect(0, 0, w, h)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [tint])
  return <canvas ref={ref} aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />
}

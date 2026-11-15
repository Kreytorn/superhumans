// Backdrop: a giant ultrasound sector fan drawn in the dark, with speckle and a slow sweeping scan line.
// Decorative only (aria-hidden); it brightens while the probe is held.
import { useEffect, useRef } from 'react'

export function Sonar({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let speckle: HTMLCanvasElement | null = null
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)

    const build = () => {
      w = c.clientWidth
      h = c.clientHeight
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
      // speckle texture once per size
      const s = document.createElement('canvas')
      s.width = Math.round(w / 3)
      s.height = Math.round(h / 3)
      const sc = s.getContext('2d')
      if (sc) {
        const img = sc.createImageData(s.width, s.height)
        let seed = 7
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
        for (let i = 0; i < s.width * s.height; i++) {
          const v = rnd()
          const g = v > 0.82 ? 120 + rnd() * 135 : v * 50
          img.data[i * 4] = g * 0.55
          img.data[i * 4 + 1] = g * 0.95
          img.data[i * 4 + 2] = g
          img.data[i * 4 + 3] = 255
        }
        sc.putImageData(img, 0, 0)
      }
      speckle = s
    }
    build()
    const ro = new ResizeObserver(build)
    ro.observe(c)

    let raf = 0
    let glow = 0
    const t0 = performance.now()
    const draw = (now: number) => {
      const t = (now - t0) / 1000
      glow += ((activeRef.current ? 1 : 0) - glow) * 0.06
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const ax = w * 0.5
      const ay = -h * 0.55
      const R0 = h * 0.62
      const R1 = h * 2.05
      const half = 0.62
      const a0 = Math.PI / 2 - half
      const a1 = Math.PI / 2 + half
      // fan body with speckle
      ctx.save()
      ctx.beginPath()
      ctx.arc(ax, ay, R1, a0, a1)
      ctx.arc(ax, ay, R0, a1, a0, true)
      ctx.closePath()
      ctx.clip()
      if (speckle) {
        ctx.globalAlpha = 0.16 + glow * 0.12
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(speckle, 0, 0, w, h)
      }
      ctx.globalAlpha = 1
      // depth falloff
      const g = ctx.createRadialGradient(ax, ay, R0, ax, ay, R1)
      g.addColorStop(0, 'rgba(4,7,12,0)')
      g.addColorStop(1, 'rgba(4,7,12,0.92)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      // sweeping scan line
      const sw = reduce ? 0.5 : (Math.sin(t * 0.35) + 1) / 2
      const ang = a0 + (a1 - a0) * sw
      const lg = ctx.createLinearGradient(ax, ay, ax + Math.cos(ang) * R1, ay + Math.sin(ang) * R1)
      lg.addColorStop(0, 'rgba(98,244,255,0)')
      lg.addColorStop(0.4, `rgba(98,244,255,${0.1 + glow * 0.15})`)
      lg.addColorStop(1, 'rgba(98,244,255,0)')
      ctx.strokeStyle = lg
      ctx.lineWidth = 60
      ctx.beginPath()
      ctx.moveTo(ax + Math.cos(ang) * R0, ay + Math.sin(ang) * R0)
      ctx.lineTo(ax + Math.cos(ang) * R1, ay + Math.sin(ang) * R1)
      ctx.stroke()
      ctx.restore()
      // depth arcs and edges
      ctx.strokeStyle = 'rgba(98,244,255,0.10)'
      ctx.lineWidth = 1
      for (let k = 0; k < 7; k++) {
        const r = R0 + ((R1 - R0) * k) / 6
        ctx.beginPath()
        ctx.arc(ax, ay, r, a0, a1)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(98,244,255,0.22)'
      ctx.beginPath()
      ctx.moveTo(ax + Math.cos(a0) * R0, ay + Math.sin(a0) * R0)
      ctx.lineTo(ax + Math.cos(a0) * R1, ay + Math.sin(a0) * R1)
      ctx.moveTo(ax + Math.cos(a1) * R0, ay + Math.sin(a1) * R0)
      ctx.lineTo(ax + Math.cos(a1) * R1, ay + Math.sin(a1) * R1)
      ctx.stroke()
      // travelling pulse ring
      if (!reduce) {
        const p = (t * 0.22) % 1
        ctx.strokeStyle = `rgba(98,244,255,${0.18 * (1 - p) + glow * 0.2})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(ax, ay, R0 + (R1 - R0) * p, a0, a1)
        ctx.stroke()
        raf = requestAnimationFrame(draw)
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="w2-sonar" aria-hidden="true" />
}

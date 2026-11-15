// The still used when WebGL is not available: the same star map, drawn once on a 2D canvas.
import { buildBody } from './body'
import { CHECKS } from './data'

/** Draws the figure and returns the six cluster positions (x, y in CSS px), in the same order as CHECKS. */
export function drawStill(canvas: HTMLCanvasElement): Float32Array {
  const r = canvas.getBoundingClientRect()
  const w = Math.max(1, r.width), h = Math.max(1, r.height)
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const xy = new Float32Array(12)
  const g = canvas.getContext('2d')
  const port = w / h < 0.8
  const cx = w * (port ? 0.5 : 0.585)
  const cy = h * (port ? 0.55 : 0.5)
  const s = port ? Math.min(h * 0.3, w * 0.95) : h * 0.37
  const yaw = 0.3
  const co = Math.cos(yaw), si = Math.sin(yaw)
  const proj = (x: number, y: number, z: number): [number, number, number] => [cx + (x * co + z * si) * s, cy - y * s, -x * si + z * co]
  CHECKS.forEach((c, i) => {
    const p = proj(...c.spot)
    xy[i * 2] = p[0]
    xy[i * 2 + 1] = p[1]
  })
  if (!g) return xy
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7)
  bg.addColorStop(0, '#0d1638')
  bg.addColorStop(0.5, '#060916')
  bg.addColorStop(1, '#02030a')
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  g.globalCompositeOperation = 'lighter'
  const cloud = buildBody(42000)
  for (let i = 0; i < cloud.count; i++) {
    const kind = cloud.data[i * 4 + 1]
    if (kind > 2.5) continue
    const [x, y] = proj(cloud.position[i * 3], cloud.position[i * 3 + 1], cloud.position[i * 3 + 2])
    const nz = -cloud.normal[i * 3] * si + cloud.normal[i * 3 + 2] * co
    const big = cloud.data[i * 4 + 3] > 2
    if (kind > 1.5) {
      g.fillStyle = CHECKS[Math.round(cloud.data[i * 4 + 2])].hue
      g.globalAlpha = 0.5
    } else {
      g.fillStyle = cloud.data[i * 4] > 0.9 ? '#ffd0a0' : '#a8c4ff'
      g.globalAlpha = kind > 0.5 ? 0.14 : 0.08 + 0.6 * Math.pow(1 - Math.abs(nz), 2.4)
    }
    const d = big ? 2.2 : 1.1
    g.fillRect(x - d / 2, y - d / 2, d, d)
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  return xy
}

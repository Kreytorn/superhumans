// Where everything on the plate sits, in screen pixels, from the window size. One function, so the SVG line work,
// the buttons and the zoom all agree to the pixel.
import { CHECKS } from './data'

export const NAVEL = 1.03 // body units: feet at 0, crown at about 1.75; the circle is centred on the navel
const RAD = Math.PI / 180

export interface Geo {
  W: number
  H: number
  tall: boolean
  cx: number
  cy: number
  /** radius of the orbit (the Vitruvian circle) */
  R: number
  /** pixels per body unit */
  s: number
  /** medallion diameter */
  md: number
  /** the title's font size and the top of the title block */
  titleSize: number
  titleTop: number
  /** medallion centres (on the orbit on a wide screen, in a grid under the plate on a tall one) */
  med: { x: number; y: number }[]
  /** the six lights on the body */
  pts: { x: number; y: number }[]
  /** the label sits to the left or right of its medallion (wide), or under it (tall) */
  side: ('l' | 'r' | 'b')[]
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function layout(W: number, H: number): Geo {
  const tall = W < 700 || W / H < 0.95
  let R: number, cx: number, cy: number, md: number, titleSize: number, titleTop: number
  const med: { x: number; y: number }[] = []
  const side: ('l' | 'r' | 'b')[] = []
  if (!tall) {
    const top = clamp(H * 0.155, 96, 150)
    const pad = 34 // the outer rings reach this far past the orbit
    const labelW = 216
    const mdGuess = clamp(H * 0.125, 82, 122)
    R = Math.min((H - top - 20) / 2 - pad, W / 2 - mdGuess / 2 - 24 - labelW - 34)
    md = clamp(R * 0.34, 78, 122)
    cx = W / 2
    cy = top + pad + R
    titleSize = clamp(H * 0.071, 40, 66)
    titleTop = clamp(H * 0.03, 16, 30)
    for (const c of CHECKS) {
      med.push({ x: cx + R * Math.sin(c.angle * RAD), y: cy - R * Math.cos(c.angle * RAD) })
      side.push(c.angle < 0 ? 'l' : 'r')
    }
  } else {
    titleSize = clamp(W * 0.105, 34, 52)
    titleTop = 24
    const top = titleTop + titleSize * 1.05 + 62
    // the grid of medallions under the plate takes two rows
    const cellW = (W - 32) / 3
    md = clamp(cellW - 34, 64, 92)
    const gridH = 2 * (md + 50)
    R = Math.min(W / 2 - 22, (H - top - gridH - 40) / 2)
    cx = W / 2
    cy = top + R + 8
    const gridTop = cy + R + 26
    CHECKS.forEach((_, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      med.push({ x: 16 + cellW * (col + 0.5), y: gridTop + row * (md + 50) + md / 2 })
      side.push('b')
    })
  }
  const s = R / NAVEL
  const pts = CHECKS.map((c) => ({ x: cx + c.point[0] * s, y: cy - (c.point[1] - NAVEL) * s }))
  return { W, H, tall, cx, cy, R, s, md, titleSize, titleTop, med, pts, side }
}

/** A point on an ellipse centred on the orbit, turned by rot degrees (for the planet's path). */
export function onEllipse(g: Geo, rx: number, ry: number, rot: number, t: number): [number, number] {
  const x = rx * Math.cos(t), y = ry * Math.sin(t)
  const c = Math.cos(rot * RAD), s = Math.sin(rot * RAD)
  return [g.cx + x * c - y * s, g.cy + x * s + y * c]
}

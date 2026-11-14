// Cell outline polygons from a label map, the same recipe as s5_demo.outline_polygon:
// bbox window padded by 1 -> iso-contour at 0.5 (marching squares; on a binary mask every vertex sits half-way
// between two pixel centres) -> longest contour -> Douglas-Peucker with tolerance 1.0 px -> [[x, y], ...] in image
// pixels (pixel centres at integer coordinates), 1 decimal, closing point dropped.
// Equivalent to skimage find_contours + approximate_polygon, not bit-identical (start vertex and saddle
// handling can differ), so polygons are for drawing; counts, areas and centres come from the label map.
import { W, type CellGeom } from './pipeline'

export type Pt = [number, number]

export const POLY_TOL = 1.0

function dpSimplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts.slice()
  const keep = new Uint8Array(pts.length)
  keep[0] = 1
  keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = pts[a]
    const [bx, by] = pts[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    let best = -1
    let bi = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]
      const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * (px - ax) - dx * (py - ay)) / len
      if (d > best) {
        best = d
        bi = i
      }
    }
    if (bi >= 0 && best > tol) {
      keep[bi] = 1
      stack.push([a, bi], [bi, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

/** Outline of cell `id` inside its bbox. Returns [] when the cell has no pixels. */
export function cellPolygon(lab: Int32Array | Uint8Array, g: CellGeom, tol = POLY_TOL): Pt[] {
  if (g.area === 0) return []
  const { y0, y1, x0, x1 } = g.bbox
  const h = y1 - y0 + 2
  const w = x1 - x0 + 2
  const m = new Uint8Array(h * w)
  for (let r = y0; r < y1; r++)
    for (let c = x0; c < x1; c++) if (lab[r * W + c] === g.id) m[(r - y0 + 1) * w + (c - x0 + 1)] = 1
  // edge points keyed on a doubled grid: (2r+dr, 2c+dc); each point gets its two neighbours
  const adj = new Map<number, number[]>()
  const key = (r2: number, c2: number) => r2 * (2 * w + 2) + c2
  const link = (a: number, b: number) => {
    const la = adj.get(a)
    if (la) la.push(b)
    else adj.set(a, [b])
    const lb = adj.get(b)
    if (lb) lb.push(a)
    else adj.set(b, [a])
  }
  for (let r = 0; r < h - 1; r++) {
    for (let c = 0; c < w - 1; c++) {
      const tl = m[r * w + c]
      const tr = m[r * w + c + 1]
      const bl = m[(r + 1) * w + c]
      const br = m[(r + 1) * w + c + 1]
      const cs = (tl << 3) | (tr << 2) | (br << 1) | bl
      if (cs === 0 || cs === 15) continue
      const T = key(2 * r, 2 * c + 1)
      const B = key(2 * r + 2, 2 * c + 1)
      const L = key(2 * r + 1, 2 * c)
      const R = key(2 * r + 1, 2 * c + 2)
      switch (cs) {
        case 1: case 14: link(L, B); break // prettier-ignore
        case 2: case 13: link(B, R); break // prettier-ignore
        case 3: case 12: link(L, R); break // prettier-ignore
        case 4: case 11: link(T, R); break // prettier-ignore
        case 6: case 9: link(T, B); break // prettier-ignore
        case 7: case 8: link(L, T); break // prettier-ignore
        case 5: link(T, R); link(L, B); break // saddle (tr, bl foreground): corners kept apart // prettier-ignore
        case 10: link(L, T); link(B, R); break // saddle (tl, br foreground) // prettier-ignore
      }
    }
  }
  // walk loops, keep the longest
  const seen = new Set<number>()
  let bestLoop: number[] = []
  for (const start of adj.keys()) {
    if (seen.has(start)) continue
    const loop: number[] = [start]
    seen.add(start)
    let prev = -1
    let cur = start
    for (;;) {
      // marching squares on a zero-padded binary mask: every edge point has exactly two neighbours
      const nb = adj.get(cur)!
      const nxt = nb[0] === prev ? nb[1] : nb[0]
      if (nxt === start || seen.has(nxt)) break
      seen.add(nxt)
      loop.push(nxt)
      prev = cur
      cur = nxt
    }
    if (loop.length > bestLoop.length) bestLoop = loop
  }
  const stride = 2 * w + 2
  const pts: Pt[] = bestLoop.map((k) => {
    const r2 = Math.floor(k / stride)
    const c2 = k - r2 * stride
    return [c2 / 2 - 1 + x0, r2 / 2 - 1 + y0]
  })
  if (pts.length) pts.push(pts[0])
  const s = dpSimplify(pts, tol)
  if (s.length > 1 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1]) s.pop()
  return s.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])
}


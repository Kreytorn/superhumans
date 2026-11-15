// Dev-only: builds the engraved figure of V10 from a real body shape and writes src/protos/V10/figure.json.
//   node src/protos/V10/_tools/build-figure.mjs
// The body is the signed-distance figure of the old mockup (work/App/mockups/A/home.html: smooth unions of
// ellipsoids and round cones), ported to JavaScript, with arms and legs that turn about the shoulder and hip.
// Two poses (arms level and legs together; arms raised and legs apart) are seen from the front. For each we take
//   - the silhouette field  f(x, y) = min over z of body(x, y, z)  (negative inside), whose zero line is the outline;
//   - the front-surface height  h(x, y)  by sphere tracing, whose iso-lines are the engraver's form lines (they run
//     along each limb and bunch up at the edges, like hatching on an old print).
// Iso-lines come from marching squares, are joined into polylines, simplified, and written as SVG path data in
// thousandths of a body unit, origin at the navel (the centre of the circle), y down.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { abs, max, min, sqrt, sign, cos, sin, PI, round, hypot } = Math
const HERE = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------------------------------------- SDF
function smin(a, b, k) {
  const h = max(k - abs(a - b), 0) / k
  return min(a, b) - h * h * k * 0.25
}
function sdEll(px, py, pz, rx, ry, rz) {
  const ax = px / rx, ay = py / ry, az = pz / rz
  const k0 = sqrt(ax * ax + ay * ay + az * az)
  const bx = px / (rx * rx), by = py / (ry * ry), bz = pz / (rz * rz)
  const k1 = sqrt(bx * bx + by * by + bz * bz)
  return k1 === 0 ? -min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}
function sdCap(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az
  const bax = bx - ax, bay = by - ay, baz = bz - az
  let h = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)
  h = h < 0 ? 0 : h > 1 ? 1 : h
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h
  return sqrt(dx * dx + dy * dy + dz * dz) - r
}
function sdRC(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2
  const pax = px - ax, pay = py - ay, paz = pz - az
  const y = pax * bax + pay * bay + paz * baz, z = y - l2
  const xvx = pax * l2 - bax * y, xvy = pay * l2 - bay * y, xvz = paz * l2 - baz * y
  const x2 = xvx * xvx + xvy * xvy + xvz * xvz, y2 = y * y * l2, z2 = z * z * l2, k = sign(rr) * rr * rr * x2
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
}

// hand in its own frame: wrist W, axis down the hand, palm turned medial-forward
const HW = [0.262, 0.872, 0.014]
const HA = [0.0475, -0.9881, 0.1463]
const HN = [-0.7966, 0.0498, 0.6026]
const HX = [-0.6026, -0.1462, -0.7843]
function finger(lx, ly, lz, x, L, r) {
  const p0 = [x, 0.094, 0], p1 = [x * 1.06, 0.094 + 0.52 * L, 0.008], p2 = [x * 1.1, 0.094 + 0.93 * L, 0.024]
  return min(sdCap(lx, ly, lz, ...p0, ...p1, r), sdCap(lx, ly, lz, ...p1, ...p2, r * 0.86))
}
function hand(qx, qy, qz) {
  const vx = qx - HW[0], vy = qy - HW[1], vz = qz - HW[2]
  const lx = vx * HX[0] + vy * HX[1] + vz * HX[2]
  const ly = vx * HA[0] + vy * HA[1] + vz * HA[2]
  const lz = vx * HN[0] + vy * HN[1] + vz * HN[2]
  let d = sdEll(lx, ly - 0.048, lz, 0.039, 0.052, 0.0155)
  d = smin(d, sdEll(lx + 0.024, ly - 0.034, lz - 0.009, 0.017, 0.032, 0.016), 0.012)
  // fingers held together (a closed, calm hand reads better in line than four separate fingers)
  let f = finger(lx, ly, lz, -0.022, 0.074, 0.0094)
  f = min(f, finger(lx, ly, lz, -0.0074, 0.082, 0.0096))
  f = min(f, finger(lx, ly, lz, 0.0076, 0.077, 0.0092))
  f = min(f, finger(lx, ly, lz, 0.0215, 0.062, 0.0082))
  d = smin(d, f, 0.012)
  const t = min(sdCap(lx, ly, lz, -0.034, 0.03, 0.012, -0.052, 0.066, 0.03, 0.0105), sdCap(lx, ly, lz, -0.052, 0.066, 0.03, -0.05, 0.096, 0.046, 0.009))
  return smin(d, t, 0.01)
}

const S = [0.19, 1.415] // shoulder pivot
const H = [0.086, 0.93] // hip pivot
function pose(armDeg, legDeg) {
  const a = (armDeg * PI) / 180, dl = (armDeg * 0.45 * PI) / 180, l = (legDeg * PI) / 180
  return { ca: cos(a), sa: sin(a), cd: cos(dl), sd: sin(dl), cl: cos(l), sl: sin(l) }
}
// rest arm hangs about 7 degrees out; +83 makes it level, +105 raises it about 22 degrees above level
const POSE_A = pose(83, -4)
const POSE_B = pose(100, 13)

function body(x, y, z, P) {
  const qx = abs(x)
  // head (no face detail: no nose, no brow)
  let d = sdEll(x, y - 1.652, z + 0.004, 0.076, 0.098, 0.094)
  d = smin(d, sdEll(x, y - 1.59, z - 0.018, 0.06, 0.062, 0.062), 0.04)
  d = smin(d, sdEll(x, y - 1.549, z - 0.034, 0.03, 0.024, 0.028), 0.03)
  d = smin(d, sdEll(qx - 0.075, y - 1.622, z + 0.006, 0.011, 0.028, 0.017), 0.01)
  // neck, shoulders, torso
  d = smin(d, sdRC(x, y, z, 0, 1.47, -0.015, 0, 1.575, -0.01, 0.054, 0.048), 0.035)
  d = smin(d, sdRC(qx, y, z, 0.02, 1.495, -0.03, 0.165, 1.448, -0.02, 0.052, 0.046), 0.05)
  d = smin(d, sdEll(x, y - 1.318, z + 0.004, 0.15, 0.168, 0.1), 0.06)
  d = smin(d, sdEll(qx - 0.068, y - 1.352, z - 0.036, 0.074, 0.058, 0.046), 0.05)
  d = smin(d, sdEll(x, y - 1.135, z - 0.006, 0.122, 0.15, 0.09), 0.07)
  d = smin(d, sdEll(x, y - 0.975, z + 0.004, 0.146, 0.105, 0.096), 0.06)
  d = smin(d, sdEll(qx - 0.066, y - 0.93, z + 0.045, 0.078, 0.09, 0.07), 0.04)
  // deltoid turns half as far as the arm
  {
    const sx = qx - S[0], sy = y - S[1]
    const dx = S[0] + sx * P.cd + sy * P.sd, dy = S[1] - sx * P.sd + sy * P.cd
    d = smin(d, sdEll(dx - 0.188, dy - 1.408, z + 0.006, 0.056, 0.072, 0.06), 0.04)
  }
  // arm, turned about the shoulder
  {
    const sx = qx - S[0], sy = y - S[1]
    const ax = S[0] + sx * P.ca + sy * P.sa, ay = S[1] - sx * P.sa + sy * P.ca
    let a = sdRC(ax, ay, z, 0.198, 1.4, -0.01, 0.228, 1.135, -0.022, 0.046, 0.035)
    a = smin(a, sdEll(ax - 0.208, ay - 1.27, z, 0.04, 0.085, 0.042), 0.03)
    a = smin(a, sdRC(ax, ay, z, 0.23, 1.128, -0.02, 0.262, 0.878, 0.012, 0.037, 0.024), 0.02)
    a = smin(a, sdEll(ax - 0.238, ay - 1.052, z + 0.008, 0.037, 0.07, 0.035), 0.025)
    a = smin(a, hand(ax, ay, z), 0.012)
    d = smin(d, a, 0.03)
  }
  // leg, turned about the hip
  const hx = qx - H[0], hy = y - H[1]
  const lx = H[0] + hx * P.cl + hy * P.sl, ly = H[1] - hx * P.sl + hy * P.cl
  let g = sdRC(lx, ly, z, 0.086, 0.925, 0, 0.118, 0.5, 0.006, 0.081, 0.051)
  g = smin(g, sdEll(lx - 0.101, ly - 0.755, z - 0.024, 0.069, 0.15, 0.07), 0.04)
  g = smin(g, sdEll(lx - 0.118, ly - 0.488, z - 0.02, 0.046, 0.052, 0.046), 0.025)
  g = smin(g, sdRC(lx, ly, z, 0.118, 0.48, -0.002, 0.142, 0.085, -0.014, 0.047, 0.028), 0.03)
  g = smin(g, sdEll(lx - 0.124, ly - 0.355, z + 0.024, 0.05, 0.105, 0.052), 0.04)
  const ft = max(sdRC(lx, ly, z, 0.146, 0.042, -0.03, 0.166, 0.03, 0.105, 0.04, 0.028), -ly)
  g = smin(g, ft, 0.03)
  return smin(d, g, 0.04)
}

// ---------------------------------------------------------------------------------------------------------- fields
const NAVEL = 1.03 // centre of the circle (body units; feet at 0, crown at about 1.75)
const G = 0.0036 // grid step
const X0 = -0.98, X1 = 0.98, Y0 = -0.03, Y1 = 1.82
const NX = Math.ceil((X1 - X0) / G) + 1, NY = Math.ceil((Y1 - Y0) / G) + 1
const gx = (i) => X0 + i * G
const gy = (j) => Y0 + j * G

function fields(P) {
  const f = new Float32Array(NX * NY) // silhouette field
  const h = new Float32Array(NX * NY) // front height (NaN where the ray misses)
  const ZS = []
  for (let z = -0.14; z <= 0.18; z += 0.016) ZS.push(z)
  for (let j = 0; j < NY; j++) {
    const y = gy(j)
    for (let i = 0; i < NX; i++) {
      const x = gx(i)
      // silhouette: coarse samples in depth, then a golden-section refine round the best
      let best = 1e9, bz = 0
      for (const z of ZS) {
        const v = body(x, y, z, P)
        if (v < best) (best = v), (bz = z)
      }
      if (best < 0.06) {
        let a = bz - 0.016, b = bz + 0.016
        const gr = 0.618034
        let c = b - gr * (b - a), e = a + gr * (b - a)
        let fc = body(x, y, c, P), fe = body(x, y, e, P)
        for (let k = 0; k < 14; k++) {
          if (fc < fe) (b = e), (e = c), (fe = fc), (c = b - gr * (b - a)), (fc = body(x, y, c, P))
          else (a = c), (c = e), (fc = fe), (e = a + gr * (b - a)), (fe = body(x, y, e, P))
        }
        best = min(best, fc, fe)
      }
      f[j * NX + i] = best
      // front surface: march from the viewer towards -z
      let hz = NaN
      if (best < 0.002) {
        let z = 0.22
        for (let k = 0; k < 64 && z > -0.22; k++) {
          const v = body(x, y, z, P)
          if (v < 0.00025) {
            hz = z
            break
          }
          z -= max(v * 0.85, 0.0004)
        }
      }
      h[j * NX + i] = hz
    }
  }
  return { f, h }
}

// ---------------------------------------------------------------------------------------------------------- contours
// v0 = (i, j), v1 = (i+1, j), v2 = (i+1, j+1), v3 = (i, j+1); edges e0 = v0v1, e1 = v1v2, e2 = v3v2, e3 = v0v3
const TABLE = {
  1: [[0, 3]], 2: [[0, 1]], 3: [[1, 3]], 4: [[1, 2]], 6: [[0, 2]], 7: [[2, 3]], 8: [[2, 3]], 9: [[0, 2]],
  11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]],
}
function contour(field, level, cellOk) {
  const segs = []
  const pt = new Map()
  const edgeKey = (i, j, e) => (e === 0 ? `h${i},${j}` : e === 1 ? `v${i + 1},${j}` : e === 2 ? `h${i},${j + 1}` : `v${i},${j}`)
  const edgePoint = (i, j, e) => {
    const key = edgeKey(i, j, e)
    if (pt.has(key)) return key
    let ax, ay, bx, by
    if (e === 0) (ax = i), (ay = j), (bx = i + 1), (by = j)
    else if (e === 1) (ax = i + 1), (ay = j), (bx = i + 1), (by = j + 1)
    else if (e === 2) (ax = i), (ay = j + 1), (bx = i + 1), (by = j + 1)
    else (ax = i), (ay = j), (bx = i), (by = j + 1)
    const va = field[ay * NX + ax], vb = field[by * NX + bx]
    const t = (level - va) / (vb - va)
    pt.set(key, [gx(ax + (bx - ax) * t), gy(ay + (by - ay) * t)])
    return key
  }
  for (let j = 0; j < NY - 1; j++)
    for (let i = 0; i < NX - 1; i++) {
      const v0 = field[j * NX + i], v1 = field[j * NX + i + 1], v2 = field[(j + 1) * NX + i + 1], v3 = field[(j + 1) * NX + i]
      if (Number.isNaN(v0) || Number.isNaN(v1) || Number.isNaN(v2) || Number.isNaN(v3)) continue
      const c = (v0 > level ? 1 : 0) | (v1 > level ? 2 : 0) | (v2 > level ? 4 : 0) | (v3 > level ? 8 : 0)
      if (c === 0 || c === 15) continue
      if (cellOk && !cellOk(i, j)) continue
      let pairs = TABLE[c]
      if (c === 5 || c === 10) {
        const above = (v0 + v1 + v2 + v3) / 4 > level
        pairs = (c === 5) === above ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]]
      }
      for (const [a, b] of pairs) segs.push([edgePoint(i, j, a), edgePoint(i, j, b)])
    }
  // join segments that share an edge point into polylines
  const adj = new Map()
  segs.forEach(([a, b], k) => {
    for (const key of [a, b]) {
      if (!adj.has(key)) adj.set(key, [])
      adj.get(key).push(k)
    }
  })
  const used = new Uint8Array(segs.length)
  const lines = []
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue
    used[k] = 1
    const chain = [segs[k][0], segs[k][1]]
    for (const dir of [1, -1]) {
      for (;;) {
        const end = dir === 1 ? chain[chain.length - 1] : chain[0]
        const next = (adj.get(end) || []).find((s) => !used[s])
        if (next === undefined) break
        used[next] = 1
        const [a, b] = segs[next]
        const other = a === end ? b : a
        if (dir === 1) chain.push(other)
        else chain.unshift(other)
      }
    }
    const closed = chain.length > 3 && chain[0] === chain[chain.length - 1]
    lines.push({ pts: chain.map((key) => pt.get(key)), closed })
  }
  return lines
}

function chaikin(pts, closed, n = 1) {
  let p = pts
  for (let it = 0; it < n; it++) {
    const q = []
    const m = p.length
    if (!closed) q.push(p[0])
    for (let k = 0; k < (closed ? m - 1 : m - 1); k++) {
      const a = p[k], b = p[k + 1]
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]])
    }
    if (!closed) q.push(p[m - 1])
    else q.push(q[0])
    p = q
  }
  return p
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  const n = pts.length
  // a closed loop has no chord to measure from: split it in two halves first
  if (pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1]) {
    const m = n >> 1
    return [...rdp(pts.slice(0, m + 1), eps).slice(0, -1), ...rdp(pts.slice(m), eps)]
  }
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay, L = hypot(dx, dy) || 1e-9
    let dm = 0, im = -1
    for (let k = a + 1; k < b; k++) {
      const d = abs((pts[k][0] - ax) * dy - (pts[k][1] - ay) * dx) / L
      if (d > dm) (dm = d), (im = k)
    }
    if (dm > eps && im > 0) {
      keep[im] = 1
      stack.push([a, im], [im, b])
    }
  }
  return pts.filter((_, k) => keep[k])
}
const len = (pts) => pts.reduce((s, p, k) => (k ? s + hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0)

// SVG path in thousandths of a body unit, origin at the navel, y down; relative steps keep it short
function toPath(pts) {
  const P = pts.map(([x, y]) => [round(x * 1000), round((NAVEL - y) * 1000)])
  let s = `M${P[0][0]} ${P[0][1]}l`
  const parts = []
  for (let k = 1; k < P.length; k++) {
    const dx = P[k][0] - P[k - 1][0], dy = P[k][1] - P[k - 1][1]
    if (dx === 0 && dy === 0) continue
    parts.push(`${dx}${dy < 0 ? '' : ' '}${dy}`)
  }
  if (!parts.length) return null
  // between pairs, a minus sign is its own separator
  return s + parts.map((p, k) => (k && !p.startsWith('-') ? ' ' + p : p)).join('')
}

function lines(field, level, cellOk, minLen, eps = 0.0007) {
  const out = []
  for (const l of contour(field, level, cellOk)) {
    if (len(l.pts) < minLen) continue
    const sm = rdp(chaikin(l.pts, l.closed, 1), eps)
    const d = toPath(sm)
    if (!d) continue
    // where the engraver's hand starts (the topmost point), for the order of the draw-on
    let top = Infinity
    for (const p of sm) top = min(top, (NAVEL - p[1]) * 1000)
    out.push({ d, top: round(top), len: round(len(sm) * 1000) })
  }
  return out
}

// ---------------------------------------------------------------------------------------------------------- build
const t0 = Date.now()
const A = fields(POSE_A)
console.log('pose A', Date.now() - t0, 'ms', NX, 'x', NY)
const B = fields(POSE_B)
console.log('pose B', Date.now() - t0, 'ms')

const at = (F, i, j) => F[j * NX + i]
const cornersAll = (F, i, j, test) => test(at(F, i, j)) && test(at(F, i + 1, j)) && test(at(F, i + 1, j + 1)) && test(at(F, i, j + 1))
const outsideA = (m) => (i, j) => cornersAll(A.f, i, j, (v) => v > m)

const LEVELS = []
for (let z = -0.052; z <= 0.14; z += 0.0085) LEVELS.push(+z.toFixed(4))

const out = {
  navel: NAVEL,
  note: 'Generated by _tools/build-figure.mjs from the signed-distance body of work/App/mockups/A/home.html. Units: thousandths of a body unit (feet at 0, crown about 1.75), origin at the navel, y down.',
  a: { outline: lines(A.f, 0, null, 0.02), hatch: [] },
  b: { outline: lines(B.f, 0, outsideA(0.006), 0.02), hatch: [] },
  aura: lines(A.f, 0.022, null, 0.05, 0.0012),
}
LEVELS.forEach((lv, k) => {
  for (const l of lines(A.h, lv, (i, j) => gy(j) > 0.085 && cornersAll(A.f, i, j, (v) => v < -0.0022), 0.012)) out.a.hatch.push({ ...l, k })
  for (const l of lines(B.h, lv, (i, j) => gy(j) > 0.15 && cornersAll(A.f, i, j, (v) => v > 0.008) && cornersAll(B.f, i, j, (v) => v < -0.0022), 0.012)) out.b.hatch.push({ ...l, k })
})
out.levels = LEVELS.length
const file = join(HERE, '..', 'figure.json')
writeFileSync(file, JSON.stringify(out))
const size = JSON.stringify(out).length
console.log('done', Date.now() - t0, 'ms;', 'a.outline', out.a.outline.length, 'a.hatch', out.a.hatch.length, 'b.outline', out.b.outline.length, 'b.hatch', out.b.hatch.length, 'aura', out.aura.length, 'bytes', size)

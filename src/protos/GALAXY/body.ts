// A standing human as a signed-distance shape (capsules and ellipsoids, smoothly joined), and the point sampler
// that turns it into a star map: a dense shell, a thinner interior, a halo, six clusters, a spiral disc and far dust.
// Space: x right, y up, feet at -1, crown at +1, the figure faces +z.
import { CHECKS } from './data'

type Prim =
  | { k: 'c'; a: [number, number, number]; b: [number, number, number]; ra: number; rb: number; zs: number }
  | { k: 'e'; c: [number, number, number]; r: [number, number, number] }

const cap = (a: [number, number, number], b: [number, number, number], ra: number, rb: number, zs = 1): Prim => ({ k: 'c', a, b, ra, rb, zs })
const ell = (c: [number, number, number], r: [number, number, number]): Prim => ({ k: 'e', c, r })

function limb(s: number): Prim[] {
  return [
    // arm, hand
    cap([0.215 * s, 0.632, 0], [0.285 * s, 0.33, -0.012], 0.05, 0.038),
    cap([0.285 * s, 0.33, -0.012], [0.335 * s, 0.045, 0.03], 0.039, 0.025),
    ell([0.35 * s, -0.045, 0.042], [0.028, 0.07, 0.02]),
    // thigh, shin, calf, foot
    cap([0.088 * s, 0.03, 0], [0.104 * s, -0.43, 0.004], 0.086, 0.052),
    cap([0.104 * s, -0.43, 0.004], [0.108 * s, -0.9, -0.012], 0.05, 0.03),
    ell([0.108 * s, -0.6, -0.024], [0.047, 0.125, 0.052]),
    cap([0.108 * s, -0.955, -0.02], [0.126 * s, -0.972, 0.105], 0.036, 0.026),
  ]
}

const PRIMS: Prim[] = [
  ell([0, 0.878, 0.008], [0.086, 0.112, 0.098]), // head
  ell([0, 0.812, 0.03], [0.062, 0.07, 0.07]), // jaw
  cap([0, 0.7, -0.004], [0, 0.79, 0.004], 0.047, 0.043), // neck
  cap([-0.16, 0.64, 0], [0.16, 0.64, 0], 0.062, 0.062, 1.2), // shoulders
  ell([0, 0.515, 0.006], [0.178, 0.16, 0.108]), // chest
  cap([0, 0.47, 0], [0, 0.25, 0.004], 0.142, 0.118, 1.5), // waist
  ell([0, 0.1, 0], [0.166, 0.125, 0.104]), // hips
  ...limb(-1),
  ...limb(1),
]

const K = 0.035 // smooth-join radius
const dists = new Float32Array(PRIMS.length)

function primDist(p: Prim, x: number, y: number, z: number): number {
  if (p.k === 'e') {
    const qx = (x - p.c[0]) / p.r[0]
    const qy = (y - p.c[1]) / p.r[1]
    const qz = (z - p.c[2]) / p.r[2]
    const l = Math.sqrt(qx * qx + qy * qy + qz * qz)
    return (l - 1) * Math.min(p.r[0], p.r[1], p.r[2])
  }
  const ax = p.a[0], ay = p.a[1], az = p.a[2]
  const bx = p.b[0] - ax, by = p.b[1] - ay, bz = p.b[2] - az
  const px = x - ax, py = y - ay, pz = z - az
  let t = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const dx = px - bx * t, dy = py - by * t, dz = (pz - bz * t) * p.zs
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.ra + (p.rb - p.ra) * t)
}

/** Distance to the body surface (negative inside); `owner` is the index of the nearest part. */
let owner = 0
export function bodySdf(x: number, y: number, z: number): number {
  let m = 1e9
  for (let i = 0; i < PRIMS.length; i++) {
    const d = primDist(PRIMS[i], x, y, z)
    dists[i] = d
    if (d < m) {
      m = d
      owner = i
    }
  }
  // exponential smooth minimum over the parts close to the nearest one
  let s = 0
  for (let i = 0; i < PRIMS.length; i++) {
    const e = (dists[i] - m) / K
    if (e < 6) s += Math.exp(-e * 4)
  }
  return m - (K / 4) * Math.log(s)
}

function primBox(p: Prim): [number, number, number, number, number, number] {
  const g = 0.03
  if (p.k === 'e') return [p.c[0] - p.r[0] - g, p.c[1] - p.r[1] - g, p.c[2] - p.r[2] - g, p.c[0] + p.r[0] + g, p.c[1] + p.r[1] + g, p.c[2] + p.r[2] + g]
  const r = Math.max(p.ra, p.rb) + g
  return [Math.min(p.a[0], p.b[0]) - r, Math.min(p.a[1], p.b[1]) - r, Math.min(p.a[2], p.b[2]) - r, Math.max(p.a[0], p.b[0]) + r, Math.max(p.a[1], p.b[1]) + r, Math.max(p.a[2], p.b[2]) + r]
}

// A small seeded generator, so the figure is the same person on every load.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Cloud {
  count: number
  position: Float32Array
  normal: Float32Array
  /** x: random seed 0-1, y: kind (0 body, 1 halo, 2 cluster star, 3 cluster glow, 4 ray), z: cluster index or -1, w: size multiplier */
  data: Float32Array
}

/** The cosmic ray's straight path through the figure: start point and unit direction (figure space). */
export const RAY_A: [number, number, number] = [CHECKS[0].spot[0] - 0.74 * 0.9, CHECKS[0].spot[1] + 0.64 * 0.9, CHECKS[0].spot[2] - 0.2 * 0.9]
export const RAY_D: [number, number, number] = (() => {
  const v = [0.74, -0.64, 0.2]
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l] as [number, number, number]
})()

export function buildBody(total: number): Cloud {
  const R = rng(20261115)
  const gauss = () => {
    const u = Math.max(R(), 1e-6)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * R())
  }
  const nCluster = Math.round(total * 0.022)
  const nBody = total - nCluster * 6 - 6 - 900
  const position = new Float32Array(total * 3)
  const normal = new Float32Array(total * 3)
  const data = new Float32Array(total * 4)
  let n = 0
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, kind: number, cl: number, size: number) => {
    position[n * 3] = x
    position[n * 3 + 1] = y
    position[n * 3 + 2] = z
    normal[n * 3] = nx
    normal[n * 3 + 1] = ny
    normal[n * 3 + 2] = nz
    data[n * 4] = R()
    data[n * 4 + 1] = kind
    data[n * 4 + 2] = cl
    data[n * 4 + 3] = size
    n++
  }

  // --- the figure: each part's box is sampled in proportion to its volume; a point counts once, for its nearest part
  const boxes = PRIMS.map(primBox)
  const cum: number[] = []
  let vol = 0
  for (const b of boxes) {
    vol += (b[3] - b[0]) * (b[4] - b[1]) * (b[5] - b[2])
    cum.push(vol)
  }
  const e = 0.004
  let guard = 0
  while (n < nBody && guard++ < 6_000_000) {
    const u = R() * vol
    let i = 0
    while (cum[i] < u) i++
    const b = boxes[i]
    const x = b[0] + R() * (b[3] - b[0])
    const y = b[1] + R() * (b[4] - b[1])
    const z = b[2] + R() * (b[5] - b[2])
    const d = bodySdf(x, y, z)
    if (d > 0 || owner !== i) continue
    // a bright shell and a thinner interior
    if (d < -0.02 && R() > 0.3) continue
    let nx = bodySdf(x + e, y, z) - d
    let ny = bodySdf(x, y + e, z) - d
    let nz = bodySdf(x, y, z + e) - d
    const l = Math.hypot(nx, ny, nz) || 1
    nx /= l
    ny /= l
    nz /= l
    if (R() < 0.14) {
      // halo: dust lifted off the skin
      const h = -Math.log(Math.max(R(), 1e-4)) * 0.035 - d
      put(x + nx * h, y + ny * h, z + nz * h, nx, ny, nz, 1, -1, 0.8 + R() * 0.8)
    } else {
      const big = R() < 0.03 ? 2.2 + R() * 1.6 : 0.75 + R() * 0.7
      put(x, y, z, nx, ny, nz, 0, -1, big)
    }
  }

  // --- six clusters, each in the shape of what its check reads
  CHECKS.forEach((c, ci) => {
    const [sx, sy, sz] = c.spot
    for (let j = 0; j < nCluster; j++) {
      let x = 0, y = 0, z = 0
      const t = R()
      if (c.id === 'tracktrace') {
        // damage spots strung along the ray's straight line through the body: a row of small knots on a faint thread
        const knot = R() < 0.72
        const k = Math.floor(R() * 9)
        const s = knot ? -0.05 + k * 0.058 + (k % 3) * 0.006 : (t - 0.12) * 0.56
        const w = knot ? 0.0075 : 0.0025
        x = sx + RAY_D[0] * s + gauss() * w
        y = sy + RAY_D[1] * s + gauss() * w
        z = sz + RAY_D[2] * s + gauss() * w
      } else if (c.id === 'bubblegrade') {
        const r = 0.05 * Math.cbrt(R())
        const th = Math.acos(2 * R() - 1), ph = 6.2831853 * R()
        x = sx + r * Math.sin(th) * Math.cos(ph) * 0.95
        y = sy + r * Math.cos(th) * 1.1
        z = sz + r * Math.sin(th) * Math.sin(ph) * 0.8
      } else if (c.id === 'spikecount') {
        // blood along the forearm
        const s = (t - 0.5) * 0.3
        x = sx - s * 0.17 + gauss() * 0.009
        y = sy + s * 0.98 + gauss() * 0.006
        z = sz - s * 0.12 + gauss() * 0.009
      } else if (c.id === 'veinsqueeze') {
        // one vein down the leg, with a knot where the clot would sit
        const s = (t - 0.5) * 0.62
        const w = 0.006 + 0.022 * Math.exp(-s * s * 220)
        x = sx + 0.012 * Math.sin(s * 16) + gauss() * w
        y = sy + s + gauss() * 0.004
        z = sz + 0.02 + gauss() * w
      } else if (c.id === 'braindrift') {
        const r = Math.cbrt(R())
        const th = Math.acos(2 * R() - 1), ph = 6.2831853 * R()
        x = sx + r * 0.066 * Math.sin(th) * Math.cos(ph)
        y = sy + r * 0.052 * Math.cos(th)
        z = sz + r * 0.078 * Math.sin(th) * Math.sin(ph)
        // the two halves
        x += x > sx ? 0.004 : -0.004
      } else {
        // inner ear: a small coil
        const a = t * 15.5
        const r = 0.004 + 0.02 * t
        x = sx + gauss() * 0.004
        y = sy + r * Math.sin(a) + gauss() * 0.003
        z = sz + r * Math.cos(a) + gauss() * 0.003
        x += 0.01 * (t - 0.5)
      }
      put(x, y, z, 0, 0, 1, 2, ci, R() < 0.08 ? 2.4 + R() * 1.5 : 0.8 + R() * 0.9)
    }
    put(sx, sy, sz, 0, 0, 1, 3, ci, 1)
  })

  // --- the ray itself: a thin line of points far past the figure on both sides
  for (let j = 0; j < 900; j++) {
    const s = -1.6 + (j / 899) * 4.6
    put(RAY_A[0] + RAY_D[0] * s, RAY_A[1] + RAY_D[1] * s, RAY_A[2] + RAY_D[2] * s, 0, 0, 1, 4, s, 1)
  }
  return { count: n, position: position.subarray(0, n * 3), normal: normal.subarray(0, n * 3), data: data.subarray(0, n * 4) }
}

/** A tilted spiral disc under the feet (two arms and a bright core) and sparse far dust for depth. */
export function buildDisc(nDisc: number, nDust: number): Cloud {
  const R = rng(77)
  const total = nDisc + nDust
  const position = new Float32Array(total * 3)
  const normal = new Float32Array(total * 3)
  const data = new Float32Array(total * 4)
  for (let i = 0; i < nDisc; i++) {
    const u = R()
    const r = 0.22 + 2.8 * Math.pow(u, 1.25)
    const arm = Math.floor(R() * 2) * Math.PI
    const loose = R() < 0.22
    const spread = loose ? R() * 6.2831853 : (R() - 0.5) * (R() - 0.5) * 2.0
    const a = arm + Math.log(r + 0.25) * 3.1 + spread
    const lift = (R() - 0.5) * 0.05 * (1 + 1.5 * Math.exp(-r * 2.2))
    position[i * 3] = Math.cos(a) * r
    position[i * 3 + 1] = lift
    position[i * 3 + 2] = Math.sin(a) * r
    data[i * 4] = R()
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = r
    data[i * 4 + 3] = (R() < 0.02 ? 2.6 : 0.7 + R() * 0.8) * (loose ? 0.7 : 1)
  }
  for (let i = nDisc; i < total; i++) {
    const r = 2.2 + 5.5 * R()
    const th = Math.acos(2 * R() - 1), ph = 6.2831853 * R()
    position[i * 3] = r * Math.sin(th) * Math.cos(ph)
    position[i * 3 + 1] = r * Math.cos(th) * 0.55
    position[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph) - 1.5
    data[i * 4] = R()
    data[i * 4 + 1] = 1
    data[i * 4 + 2] = r
    data[i * 4 + 3] = 0.8 + R() * 1.8
  }
  return { count: total, position, normal, data }
}

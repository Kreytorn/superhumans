// V11 "Crystal Human": the body, built once at load. A signed-distance human (smooth unions of ellipsoids and tapered
// capsules) in a weightless pose, meshed with surface nets, then cut into gem facets: the surface is split into
// patches round evenly spread seed points, each patch is pressed toward its own plane, and every triangle takes its
// patch's flat normal. The edges between patches are kept for the shader; the edges inside a patch are hidden.

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const addS = (a: V3, b: V3, s: number): V3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]
const nrm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// ------------------------------------------------------------------------------------------------- the pose
// Frame: pelvis at the origin, y up, z toward the viewer, x to the figure's left (the viewer's right).
// The scene turns the figure about 55 degrees, so it is seen nearly side-on, facing the star; its right side is near.
const SHO_R: V3 = [-0.19, 0.45, 0.0]
const SHO_L: V3 = [0.19, 0.45, 0.0]
// the near (right) arm floats back and down, a leap's trailing arm: its forearm reads clear of the body
const ELB_R = addS(SHO_R, nrm([-0.2, -0.82, -0.42]), 0.28)
const WRI_R = addS(ELB_R, nrm([-0.12, -0.5, -0.86]), 0.25)
const HAN_R = addS(WRI_R, nrm([-0.08, -0.4, -0.91]), 0.13)
// the far (left) arm reaches forward and up, toward the star
const ELB_L = addS(SHO_L, nrm([0.22, 0.5, 0.84]), 0.28)
const WRI_L = addS(ELB_L, nrm([0.16, 0.66, 0.73]), 0.25)
const HAN_L = addS(WRI_L, nrm([0.12, 0.7, 0.7]), 0.13)
// legs: the near one long, the far one drawn up
const HIP_R: V3 = [-0.09, -0.05, 0.0]
const HIP_L: V3 = [0.09, -0.05, 0.0]
const KNE_R = addS(HIP_R, nrm([-0.06, -0.8, 0.6]), 0.43)
const SHIN_R = nrm([-0.02, -0.9, -0.43])
const ANK_R = addS(KNE_R, SHIN_R, 0.41)
const TOE_R = addS(ANK_R, nrm([-0.02, -0.72, 0.69]), 0.19)
const KNE_L = addS(HIP_L, nrm([0.08, -0.45, 0.89]), 0.43)
const SHIN_L = nrm([0.03, -0.96, -0.27])
const ANK_L = addS(KNE_L, SHIN_L, 0.41)
const TOE_L = addS(ANK_L, nrm([0.02, -0.6, 0.8]), 0.19)
// back of each calf: the shin direction turned a quarter toward the back
const CALF_R = addS(addS(KNE_R, SHIN_R, 0.13), nrm([0, -SHIN_R[2], SHIN_R[1]]), 0.022)
const CALF_L = addS(addS(KNE_L, SHIN_L, 0.13), nrm([0, -SHIN_L[2], SHIN_L[1]]), 0.022)

const mid = (a: V3, b: V3, t = 0.5): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Where the six jewels sit, in the body's own frame: on the crown, at the ear, the heart, the middle of the trailing
 *  forearm (blood), the middle of the near calf (leg vein), and the belly (the cell crossed by the ion's track). */
export const ANCHOR = {
  braindrift: [0, 0.81, 0.08] as V3,
  garnmeter: [-0.05, 0.66, 0.0] as V3,
  bubblegrade: [0.03, 0.38, 0.1] as V3,
  spikecount: mid(ELB_R, WRI_R, 0.55),
  veinsqueeze: addS(mid(KNE_R, ANK_R, 0.5), nrm([0, -SHIN_R[2], SHIN_R[1]]), 0.01),
  tracktrace: [0, 0.07, 0.11] as V3,
}

interface Cone {
  ax: number
  ay: number
  az: number
  bx: number
  by: number
  bz: number
  inv: number
  r1: number
  r2: number
}
const cone = (a: V3, b: V3, r1: number, r2: number): Cone => {
  const d = sub(b, a)
  return { ax: a[0], ay: a[1], az: a[2], bx: d[0], by: d[1], bz: d[2], inv: 1 / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]), r1, r2 }
}
function dCone(x: number, y: number, z: number, c: Cone) {
  const px = x - c.ax
  const py = y - c.ay
  const pz = z - c.az
  let h = (px * c.bx + py * c.by + pz * c.bz) * c.inv
  h = h < 0 ? 0 : h > 1 ? 1 : h
  const dx = px - c.bx * h
  const dy = py - c.by * h
  const dz = pz - c.bz * h
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (c.r1 + (c.r2 - c.r1) * h)
}
function dEll(x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
  const px = (x - cx) / rx
  const py = (y - cy) / ry
  const pz = (z - cz) / rz
  const k0 = Math.sqrt(px * px + py * py + pz * pz)
  const k1 = Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry) + (pz * pz) / (rz * rz))
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

const C = {
  shoulders: cone([-0.165, 0.46, -0.005], [0.165, 0.46, -0.005], 0.056, 0.056),
  neck: cone([0, 0.48, -0.01], [0, 0.6, 0.04], 0.052, 0.047),
  // arms with the body's own volume (about 1.6 times the old upper arm, 1.5 times the old forearm)
  uArmR: cone(SHO_R, ELB_R, 0.08, 0.06),
  fArmR: cone(ELB_R, WRI_R, 0.058, 0.042),
  handR: cone(WRI_R, HAN_R, 0.04, 0.032),
  uArmL: cone(SHO_L, ELB_L, 0.08, 0.06),
  fArmL: cone(ELB_L, WRI_L, 0.058, 0.042),
  handL: cone(WRI_L, HAN_L, 0.04, 0.032),
  thighR: cone(HIP_R, KNE_R, 0.088, 0.056),
  shinR: cone(KNE_R, ANK_R, 0.054, 0.034),
  calfR: cone(CALF_R, addS(CALF_R, SHIN_R, 0.14), 0.05, 0.036),
  footR: cone(ANK_R, TOE_R, 0.037, 0.026),
  thighL: cone(HIP_L, KNE_L, 0.088, 0.056),
  shinL: cone(KNE_L, ANK_L, 0.054, 0.034),
  calfL: cone(CALF_L, addS(CALF_L, SHIN_L, 0.14), 0.05, 0.036),
  footL: cone(ANK_L, TOE_L, 0.037, 0.026),
}

/** Spheres that hold the figure (centre and radius, own frame, with a margin for the cut and the shards), for framing
 *  the camera before the body is cut and for finding its outline on screen. */
export const SPHERES: [number, number, number, number][] = [
  [0, 0.712, 0.065, 0.118],
  [0, 0.79, 0.04, 0.08],
  [0, 0.355, 0.028, 0.18],
  [0, 0.17, 0.012, 0.14],
  [0, 0, 0, 0.16],
  [-0.24, 0.46, 0, 0.09],
  [0.24, 0.46, 0, 0.09],
  ...Object.values(C).flatMap((c): [number, number, number, number][] => {
    const s: [number, number, number, number][] = []
    for (let t = 0; t <= 1.001; t += 0.25) s.push([c.ax + c.bx * t, c.ay + c.by * t, c.az + c.bz * t, c.r1 + (c.r2 - c.r1) * t + 0.015])
    return s
  }),
]

/** The body's signed distance (metres; negative inside). No face, no fingers: a smooth figure to cut as a gem. */
export function sdf(x: number, y: number, z: number): number {
  let d = dEll(x, y, z, 0, 0, 0.0, 0.158, 0.11, 0.105)
  d = smin(d, dEll(x, y, z, 0, 0.17, 0.012, 0.128, 0.13, 0.09), 0.07)
  d = smin(d, dEll(x, y, z, 0, 0.355, 0.028, 0.16, 0.168, 0.106), 0.07)
  d = smin(d, dCone(x, y, z, C.shoulders), 0.06)
  d = smin(d, dCone(x, y, z, C.neck), 0.04)
  let h = dEll(x, y, z, 0, 0.712, 0.065, 0.088, 0.108, 0.099)
  h = smin(h, dEll(x, y, z, 0, 0.652, 0.1, 0.062, 0.05, 0.062), 0.04)
  d = smin(d, h, 0.035)
  // arms
  let a = dEll(x, y, z, SHO_R[0] - 0.012, SHO_R[1] - 0.01, SHO_R[2], 0.08, 0.088, 0.082)
  a = smin(a, dCone(x, y, z, C.uArmR), 0.03)
  a = smin(a, dCone(x, y, z, C.fArmR), 0.03)
  a = smin(a, dCone(x, y, z, C.handR), 0.025)
  d = smin(d, a, 0.045)
  a = dEll(x, y, z, SHO_L[0] + 0.012, SHO_L[1] - 0.01, SHO_L[2], 0.08, 0.088, 0.082)
  a = smin(a, dCone(x, y, z, C.uArmL), 0.03)
  a = smin(a, dCone(x, y, z, C.fArmL), 0.03)
  a = smin(a, dCone(x, y, z, C.handL), 0.025)
  d = smin(d, a, 0.045)
  // legs
  let g = dCone(x, y, z, C.thighR)
  g = smin(g, dCone(x, y, z, C.shinR), 0.035)
  g = smin(g, dCone(x, y, z, C.calfR), 0.03)
  g = smin(g, dCone(x, y, z, C.footR), 0.025)
  d = smin(d, g, 0.055)
  g = dCone(x, y, z, C.thighL)
  g = smin(g, dCone(x, y, z, C.shinL), 0.035)
  g = smin(g, dCone(x, y, z, C.calfL), 0.03)
  g = smin(g, dCone(x, y, z, C.footL), 0.025)
  d = smin(d, g, 0.055)
  return d
}

function grad(x: number, y: number, z: number, out: V3): V3 {
  const e = 0.0015
  out[0] = sdf(x + e, y, z) - sdf(x - e, y, z)
  out[1] = sdf(x, y + e, z) - sdf(x, y - e, z)
  out[2] = sdf(x, y, z + e) - sdf(x, y, z - e)
  const l = Math.hypot(out[0], out[1], out[2]) || 1
  out[0] /= l
  out[1] /= l
  out[2] /= l
  return out
}

// small seeded random, so the cut is the same on every load
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface BodyMesh {
  /** non-indexed triangles */
  position: Float32Array
  /** each facet's flat normal */
  normal: Float32Array
  /** barycentric corners; an edge inside a facet carries 1 in its slot so it never draws */
  bary: Float32Array
  /** per facet: random, growth delay (0 at the core, 1 at the far tips), a second random */
  facet: Float32Array
  /** true barycentric corners, for shading from the facet's edge to its centre */
  corner: Float32Array
  /** the smooth surface normal at each corner, for the glow round the figure */
  smooth: Float32Array
  /** the shards: per instance a 4x4 matrix, then seed, taper, tip, delay */
  shardMatrix: Float32Array
  shardSeed: Float32Array
  shards: number
  /** bounding box of the body, own frame */
  min: V3
  max: V3
  /** edges with a facet on one side only (holes in the cut) */
  open: number
  ms: number
}

export function buildBody(fine = 0.02): BodyMesh {
  const t0 = performance.now()
  const min: V3 = [-0.4, -1.0, -0.58]
  const max: V3 = [0.42, 0.92, 0.72]
  const h = fine
  const nx = Math.ceil((max[0] - min[0]) / h) + 1
  const ny = Math.ceil((max[1] - min[1]) / h) + 1
  const nz = Math.ceil((max[2] - min[2]) / h) + 1
  const val = new Float32Array(nx * ny * nz)
  const id = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  // coarse pass first: far from the surface a whole block takes one sign
  const B = 4
  for (let k0 = 0; k0 < nz; k0 += B)
    for (let j0 = 0; j0 < ny; j0 += B)
      for (let i0 = 0; i0 < nx; i0 += B) {
        const cx = min[0] + (i0 + B / 2) * h
        const cy = min[1] + (j0 + B / 2) * h
        const cz = min[2] + (k0 + B / 2) * h
        const dc = sdf(cx, cy, cz)
        const far = Math.abs(dc) > h * B * 1.0
        for (let k = k0; k < Math.min(nz, k0 + B); k++)
          for (let j = j0; j < Math.min(ny, j0 + B); j++)
            for (let i = i0; i < Math.min(nx, i0 + B); i++) val[id(i, j, k)] = far ? dc : sdf(min[0] + i * h, min[1] + j * h, min[2] + k * h)
      }

  // surface nets: one vertex per cell that the surface crosses
  const cx = nx - 1
  const cy = ny - 1
  const cz = nz - 1
  const cell = new Int32Array(cx * cy * cz).fill(-1)
  const cid = (i: number, j: number, k: number) => i + cx * (j + cy * k)
  const pos: number[] = []
  const EDGES = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]
  const cv = new Float32Array(8)
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        let neg = 0
        for (let c = 0; c < 8; c++) {
          const v = val[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]
          cv[c] = v
          if (v < 0) neg++
        }
        if (neg === 0 || neg === 8) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [a, b] of EDGES) {
          const va = cv[a]
          const vb = cv[b]
          if (va < 0 === vb < 0) continue
          const t = va / (va - vb)
          sx += (a & 1) + ((b & 1) - (a & 1)) * t
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t
          sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t
          n++
        }
        cell[cid(i, j, k)] = pos.length / 3
        pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h)
      }
  const nv = pos.length / 3
  const P = new Float32Array(pos)
  // faces: one quad per grid edge that crosses the surface
  const quads: number[] = []
  for (let k = 1; k < cz; k++)
    for (let j = 1; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        const a = val[id(i, j, k)] < 0
        if (a === val[id(i + 1, j, k)] < 0) continue
        const q = [cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)]]
        if (q.some((x) => x < 0)) continue
        quads.push(...(a ? q : [q[3], q[2], q[1], q[0]]))
      }
  for (let k = 1; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 1; i < cx; i++) {
        const a = val[id(i, j, k)] < 0
        if (a === val[id(i, j + 1, k)] < 0) continue
        const q = [cell[cid(i - 1, j, k - 1)], cell[cid(i - 1, j, k)], cell[cid(i, j, k)], cell[cid(i, j, k - 1)]]
        if (q.some((x) => x < 0)) continue
        quads.push(...(a ? q : [q[3], q[2], q[1], q[0]]))
      }
  for (let k = 0; k < cz; k++)
    for (let j = 1; j < cy; j++)
      for (let i = 1; i < cx; i++) {
        const a = val[id(i, j, k)] < 0
        if (a === val[id(i, j, k + 1)] < 0) continue
        const q = [cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)]]
        if (q.some((x) => x < 0)) continue
        quads.push(...(a ? q : [q[3], q[2], q[1], q[0]]))
      }

  // settle every vertex onto the true surface, and take its normal
  const N = new Float32Array(nv * 3)
  const g: V3 = [0, 0, 0]
  for (let v = 0; v < nv; v++) {
    let x = P[v * 3]
    let y = P[v * 3 + 1]
    let z = P[v * 3 + 2]
    const d = sdf(x, y, z)
    grad(x, y, z, g)
    x -= g[0] * d
    y -= g[1] * d
    z -= g[2] * d
    P[v * 3] = x
    P[v * 3 + 1] = y
    P[v * 3 + 2] = z
    grad(x, y, z, g)
    N[v * 3] = g[0]
    N[v * 3 + 1] = g[1]
    N[v * 3 + 2] = g[2]
  }
  // how thick the body is under each vertex (the radius of the limb or trunk there)
  const thick = new Float32Array(nv)
  for (let v = 0; v < nv; v++) {
    let best = 0
    for (let t = 0.016; t < 0.2; t += 0.016) {
      const d = -sdf(P[v * 3] - N[v * 3] * t, P[v * 3 + 1] - N[v * 3 + 1] * t, P[v * 3 + 2] - N[v * 3 + 2] * t)
      if (d > best) best = d
      else if (d < best - 0.01) break
    }
    thick[v] = Math.max(0.02, best)
  }

  // triangles: each quad split along its shorter diagonal
  const tris: number[] = []
  const d2 = (a: number, b: number) => (P[a * 3] - P[b * 3]) ** 2 + (P[a * 3 + 1] - P[b * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[b * 3 + 2]) ** 2
  for (let q = 0; q < quads.length; q += 4) {
    const [a, b, c, d] = [quads[q], quads[q + 1], quads[q + 2], quads[q + 3]]
    if (d2(a, c) <= d2(b, d)) tris.push(a, b, c, a, c, d)
    else tris.push(a, b, d, b, c, d)
  }
  const nt = tris.length / 3

  // facet seeds: spread over the surface, closer together where the body is thin
  const rand = rng(11)
  const order = Array.from({ length: nv }, (_, i) => i)
  for (let i = nv - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const radius = (v: number) => Math.min(0.075, Math.max(0.03, thick[v] * 0.68))
  const HS = 0.09
  const key = (x: number, y: number, z: number) => `${Math.floor(x / HS)},${Math.floor(y / HS)},${Math.floor(z / HS)}`
  const hashSeeds = new Map<string, number[]>()
  const seeds: number[] = []
  const near = (x: number, y: number, z: number, fn: (s: number) => void) => {
    const ix = Math.floor(x / HS)
    const iy = Math.floor(y / HS)
    const iz = Math.floor(z / HS)
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++) {
          const l = hashSeeds.get(`${ix + a},${iy + b},${iz + c}`)
          if (l) for (const s of l) fn(s)
        }
  }
  for (const v of order) {
    const r = radius(v)
    let ok = true
    near(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], (s) => {
      if (!ok) return
      const rr = Math.max(r, radius(s))
      if (d2(v, s) < rr * rr && N[v * 3] * N[s * 3] + N[v * 3 + 1] * N[s * 3 + 1] + N[v * 3 + 2] * N[s * 3 + 2] > -0.2) ok = false
    })
    if (!ok) continue
    seeds.push(v)
    const k = key(P[v * 3], P[v * 3 + 1], P[v * 3 + 2])
    const l = hashSeeds.get(k)
    if (l) l.push(v)
    else hashSeeds.set(k, [v])
  }
  const seedIndex = new Map<number, number>()
  seeds.forEach((s, i) => seedIndex.set(s, i))
  // every vertex joins its nearest seed that faces the same way
  const owner = new Int32Array(nv)
  for (let v = 0; v < nv; v++) {
    let best = Infinity
    let who = -1
    near(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], (s) => {
      const r = radius(s)
      const dot = N[v * 3] * N[s * 3] + N[v * 3 + 1] * N[s * 3 + 1] + N[v * 3 + 2] * N[s * 3 + 2]
      const m = d2(v, s) / (r * r) + 2.2 * (1 - dot)
      if (m < best) {
        best = m
        who = seedIndex.get(s)!
      }
    })
    owner[v] = who
  }
  // The gem: one vertex per seed, one flat triangle wherever three seeds' patches meet (the dual of the patches).
  // Each vertex sits on the surface at its patch's centre, nudged out a little so the flat facets keep the volume.
  const nf = seeds.length
  const V = new Float64Array(nf * 3)
  const cnt = new Int32Array(nf)
  for (let v = 0; v < nv; v++) {
    const f = owner[v]
    if (f < 0) continue
    V[f * 3] += P[v * 3]
    V[f * 3 + 1] += P[v * 3 + 1]
    V[f * 3 + 2] += P[v * 3 + 2]
    cnt[f]++
  }
  const VN = new Float32Array(nf * 3)
  for (let f = 0; f < nf; f++) {
    let x = V[f * 3] / Math.max(1, cnt[f])
    let y = V[f * 3 + 1] / Math.max(1, cnt[f])
    let z = V[f * 3 + 2] / Math.max(1, cnt[f])
    for (let it = 0; it < 2; it++) {
      const d = sdf(x, y, z)
      grad(x, y, z, g)
      x -= g[0] * d
      y -= g[1] * d
      z -= g[2] * d
    }
    grad(x, y, z, g)
    const out = 0.12 * thick[seeds[f]]
    V[f * 3] = x + g[0] * out
    V[f * 3 + 1] = y + g[1] * out
    V[f * 3 + 2] = z + g[2] * out
    VN[f * 3] = g[0]
    VN[f * 3 + 1] = g[1]
    VN[f * 3 + 2] = g[2]
  }
  const seen = new Set<number>()
  const T: number[] = []
  for (let t = 0; t < nt; t++) {
    let a = owner[tris[t * 3]]
    let b = owner[tris[t * 3 + 1]]
    let c = owner[tris[t * 3 + 2]]
    if (a < 0 || b < 0 || c < 0 || a === b || b === c || a === c) continue
    const lo = Math.min(a, b, c)
    const hi = Math.max(a, b, c)
    const mid = a + b + c - lo - hi
    const k = (lo * nf + mid) * nf + hi
    if (seen.has(k)) continue
    seen.add(k)
    // wind it outward
    const ux = V[b * 3] - V[a * 3]
    const uy = V[b * 3 + 1] - V[a * 3 + 1]
    const uz = V[b * 3 + 2] - V[a * 3 + 2]
    const wx = V[c * 3] - V[a * 3]
    const wy = V[c * 3 + 1] - V[a * 3 + 1]
    const wz = V[c * 3 + 2] - V[a * 3 + 2]
    const nx = uy * wz - uz * wy
    const ny = uz * wx - ux * wz
    const nz = ux * wy - uy * wx
    const ox = VN[a * 3] + VN[b * 3] + VN[c * 3]
    const oy = VN[a * 3 + 1] + VN[b * 3 + 1] + VN[c * 3 + 1]
    const oz = VN[a * 3 + 2] + VN[b * 3 + 2] + VN[c * 3 + 2]
    if (nx * ox + ny * oy + nz * oz < 0) [b, c] = [c, b]
    T.push(a, b, c)
  }
  const nT = T.length / 3
  const TN = new Float32Array(nT * 3)
  for (let t = 0; t < nT; t++) {
    const [a, b, c] = [T[t * 3], T[t * 3 + 1], T[t * 3 + 2]]
    const ux = V[b * 3] - V[a * 3]
    const uy = V[b * 3 + 1] - V[a * 3 + 1]
    const uz = V[b * 3 + 2] - V[a * 3 + 2]
    const wx = V[c * 3] - V[a * 3]
    const wy = V[c * 3 + 1] - V[a * 3 + 1]
    const wz = V[c * 3 + 2] - V[a * 3 + 2]
    const n = nrm([uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx])
    TN[t * 3] = n[0]
    TN[t * 3 + 1] = n[1]
    TN[t * 3 + 2] = n[2]
  }
  // an edge between two facets that are nearly one plane is not drawn: the cut reads as larger faces
  const edges = new Map<number, number[]>()
  for (let t = 0; t < nT; t++)
    for (let e = 0; e < 3; e++) {
      const p = T[t * 3 + ((e + 1) % 3)]
      const q = T[t * 3 + ((e + 2) % 3)]
      const k = Math.min(p, q) * nf + Math.max(p, q)
      const l = edges.get(k)
      if (l) l.push(t)
      else edges.set(k, [t])
    }
  let open = 0
  for (const l of edges.values()) if (l.length === 1) open++

  // growth: from the core of the body outward
  const core: V3 = [0, 0.14, 0.05]
  let far = 0
  const fd = new Float32Array(nT)
  for (let t = 0; t < nT; t++) {
    let x = 0
    let y = 0
    let z = 0
    for (let c = 0; c < 3; c++) {
      x += V[T[t * 3 + c] * 3] / 3
      y += V[T[t * 3 + c] * 3 + 1] / 3
      z += V[T[t * 3 + c] * 3 + 2] / 3
    }
    fd[t] = Math.hypot(x - core[0], y - core[1], z - core[2])
    if (fd[t] > far) far = fd[t]
  }
  const fr = rng(5)
  const position = new Float32Array(nT * 9)
  const normal = new Float32Array(nT * 9)
  const bary = new Float32Array(nT * 9)
  const facet = new Float32Array(nT * 9)
  const corner = new Float32Array(nT * 9)
  const smooth = new Float32Array(nT * 9)
  for (let t = 0; t < nT; t++) {
    const h = fr()
    for (let c = 0; c < 3; c++) {
      const v = T[t * 3 + c]
      const o = t * 9 + c * 3
      position[o] = V[v * 3]
      position[o + 1] = V[v * 3 + 1]
      position[o + 2] = V[v * 3 + 2]
      smooth[o] = VN[v * 3]
      smooth[o + 1] = VN[v * 3 + 1]
      smooth[o + 2] = VN[v * 3 + 2]
      normal[o] = TN[t * 3]
      normal[o + 1] = TN[t * 3 + 1]
      normal[o + 2] = TN[t * 3 + 2]
      for (let e = 0; e < 3; e++) {
        const p = T[t * 3 + ((e + 1) % 3)]
        const q = T[t * 3 + ((e + 2) % 3)]
        const l = edges.get(Math.min(p, q) * nf + Math.max(p, q))!
        const nb = l.length === 2 ? (l[0] === t ? l[1] : l[0]) : -1
        const flat = nb >= 0 && TN[t * 3] * TN[nb * 3] + TN[t * 3 + 1] * TN[nb * 3 + 1] + TN[t * 3 + 2] * TN[nb * 3 + 2] > 0.975
        bary[o + e] = e === c || flat ? 1 : 0
      }
      facet[o] = h
      facet[o + 1] = fd[t] / far
      facet[o + 2] = h * 0.5 + 0.5 * fr()
      corner[o + c] = 1
    }
  }

  // shards: a frost of slim crystals on the shoulders, along the spine and on the crown
  const sr = rng(23)
  const sm: number[] = []
  const ss: number[] = []
  const target = 170
  let tries = 0
  while (ss.length / 4 < target && tries++ < 40000) {
    const v = Math.floor(sr() * nv)
    const x = P[v * 3]
    const y = P[v * 3 + 1]
    const z = P[v * 3 + 2]
    const n: V3 = [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]]
    let w = 0.006
    let len = 0.04
    if (y > 0.4 && y < 0.6 && Math.abs(x) > 0.1 && Math.abs(x) < 0.28 && n[1] > 0.1) {
      w = 1
      len = 0.06
    } else if (y > 0.77 && n[1] > 0.35) {
      w = 0.8
      len = 0.045
    } else if (z < -0.03 && Math.abs(x) < 0.07 && y > 0.05 && y < 0.6 && n[2] < -0.5) {
      w = 0.7
      len = 0.045
    }
    if (sr() > w) continue
    const k = sr()
    const L = len * (0.35 + 0.8 * k * k)
    const wd = 0.006 + 0.009 * sr()
    // lean each shard a little off the normal, up and back, like frost blown by a wind
    const dir = nrm([n[0] + (sr() - 0.5) * 0.7, n[1] + (sr() - 0.2) * 0.6, n[2] + (sr() - 0.65) * 0.6])
    const up = Math.abs(dir[1]) < 0.9 ? ([0, 1, 0] as V3) : ([1, 0, 0] as V3)
    const bx = nrm([up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]])
    const bz: V3 = [dir[1] * bx[2] - dir[2] * bx[1], dir[2] * bx[0] - dir[0] * bx[2], dir[0] * bx[1] - dir[1] * bx[0]]
    const ox = x - dir[0] * 0.012
    const oy = y - dir[1] * 0.012
    const oz = z - dir[2] * 0.012
    // column-major 4x4: x axis, y axis (the shard's length), z axis, origin
    sm.push(bx[0] * wd, bx[1] * wd, bx[2] * wd, 0, dir[0] * L, dir[1] * L, dir[2] * L, 0, bz[0] * wd, bz[1] * wd, bz[2] * wd, 0, ox, oy, oz, 1)
    const dd = Math.hypot(x - core[0], y - core[1], z - core[2]) / far
    ss.push(sr(), 0.25 + 0.4 * sr(), 0.18 + 0.25 * sr(), dd)
  }

  return {
    position,
    normal,
    bary,
    facet,
    corner,
    smooth,
    shardMatrix: new Float32Array(sm),
    shardSeed: new Float32Array(ss),
    shards: ss.length / 4,
    min: [0, 1, 2].map((e) => {
      let m = Infinity
      for (let f = 0; f < nf; f++) m = Math.min(m, V[f * 3 + e])
      return m
    }) as V3,
    max: [0, 1, 2].map((e) => {
      let m = -Infinity
      for (let f = 0; f < nf; f++) m = Math.max(m, V[f * 3 + e])
      return m
    }) as V3,
    open,
    ms: performance.now() - t0,
  }
}

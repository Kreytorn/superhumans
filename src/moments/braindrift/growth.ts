// Which parts of an after-flight ventricle surface are "fluid here now, not before"? Pure, no DOM (also run by the
// audit script in work/Web/shots/moment-braindrift/fixed/).
// A vertex is judged by the voxel it belongs to: the point just inside the surface, read in the pre-flight map.
// It is light only where that point was not ventricle before flight. No neighbourhood count: a thin piece that
// already existed stays the measured colour.

const NI = 176
const NJ = 176
const NK = 208

export interface GrowthMesh {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array
}

/** Share of ventricle (class 1) in the pre-flight map around a point in voxel units, blended over the 8 nearest voxels. */
function wasVentricle(pre: Uint8Array, i: number, j: number, k: number): number {
  const i0 = Math.floor(i)
  const j0 = Math.floor(j)
  const k0 = Math.floor(k)
  if (i0 < 0 || j0 < 0 || k0 < 0 || i0 >= NI - 1 || j0 >= NJ - 1 || k0 >= NK - 1) return 0
  const fi = i - i0
  const fj = j - j0
  const fk = k - k0
  let s = 0
  for (let a = 0; a < 2; a++) {
    for (let b = 0; b < 2; b++) {
      for (let c = 0; c < 2; c++) {
        if (pre[((i0 + a) * NJ + j0 + b) * NK + k0 + c] === 1) s += (a ? fi : 1 - fi) * (b ? fj : 1 - fj) * (c ? fk : 1 - fk)
      }
    }
  }
  return s
}

/** Per-vertex flag, 0 = was ventricle before flight, 1 = fluid here now, not before. */
export function growthFlags(m: GrowthMesh, pre: Uint8Array): Float32Array {
  const n = m.position.length / 3
  const grow = new Float32Array(n)
  for (let v = 0; v < n; v++) {
    const x = m.position[v * 3] - 0.6 * m.normal[v * 3]
    const y = m.position[v * 3 + 1] - 0.6 * m.normal[v * 3 + 1]
    const z = m.position[v * 3 + 2] - 0.6 * m.normal[v * 3 + 2]
    const was = wasVentricle(pre, x + 88, 88 - y, z + 104)
    grow[v] = 1 - Math.min(1, Math.max(0, (was - 0.25) / 0.5))
  }
  // the 1 mm voxel grid would show as stripes: the flag is relaxed along the surface (an edge moves about 1 mm).
  // A piece keeps its own average, so a small piece that already existed cannot turn light this way.
  const sum = new Float32Array(n)
  const cnt = new Uint16Array(n)
  for (let pass = 0; pass < 5; pass++) {
    sum.fill(0)
    cnt.fill(0)
    for (let q = 0; q < m.index.length; q += 3) {
      const a = m.index[q]
      const b = m.index[q + 1]
      const c = m.index[q + 2]
      const s = grow[a] + grow[b] + grow[c]
      sum[a] += s
      sum[b] += s
      sum[c] += s
      cnt[a] += 3
      cnt[b] += 3
      cnt[c] += 3
    }
    for (let v = 0; v < n; v++) if (cnt[v]) grow[v] = sum[v] / cnt[v]
  }
  return grow
}

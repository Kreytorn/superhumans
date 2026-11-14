// Line-for-line port of the canonical SpikeCount pre/post-processing in work/SpikeCount/vm/spike_common.py
// (standardize, standardize_pad, unpad, postprocess_cells, cell_centers, crop_cells, cell_severity,
// field_metrics, act_tier) plus the cell geometry of s5_demo.cell_geometry. Pure functions, no I/O.

export const H = 572
export const W = 572
export const PAD = 2 // 572 -> 576 (divisible by 32)
export const HP = H + 2 * PAD
export const WP = W + 2 * PAD
export const CROP = 96
export const MIN_SEED_PX = 50
export const MIN_CELL_PX = 300
export const CLASS_NAMES = ['Disc', 'E1', 'E2', 'E3', 'E4', 'Cup'] as const
export type ClassName = (typeof CLASS_NAMES)[number]
export const SPIKY = [1, 2, 3, 4]
export const ADVANCED = [2, 3, 4]

/** uint8 [572*572] -> float32 z = (x - mean) / max(std, 1.0), float64 statistics over all pixels (numpy std, ddof 0). */
export function standardize(img: Uint8Array): Float32Array {
  const n = img.length
  let s = 0
  for (let i = 0; i < n; i++) s += img[i]
  const m = s / n
  let v = 0
  for (let i = 0; i < n; i++) {
    const d = img[i] - m
    v += d * d
  }
  const sd = Math.max(Math.sqrt(v / n), 1.0)
  const z = new Float32Array(n)
  for (let i = 0; i < n; i++) z[i] = (img[i] - m) / sd
  return z
}

/** numpy "reflect" index (edge pixel not repeated). */
function reflect(i: number, n: number): number {
  if (i < 0) return -i
  if (i >= n) return 2 * (n - 1) - i
  return i
}

/** z float32 [572*572] -> float32 [1,1,576,576] with 2-px numpy-"reflect" padding. */
export function padReflect(z: Float32Array): Float32Array {
  const out = new Float32Array(HP * WP)
  for (let r = 0; r < HP; r++) {
    const sr = reflect(r - PAD, H) * W
    const o = r * WP
    for (let c = 0; c < WP; c++) out[o + c] = z[sr + reflect(c - PAD, W)]
  }
  return out
}

export function standardizePad(img: Uint8Array): { z: Float32Array; x: Float32Array } {
  const z = standardize(img)
  return { z, x: padReflect(z) }
}

/** [576*576] padded plane -> [572*572] (drop 2 px per side). */
export function unpadPlane(a: Float32Array, offset = 0): Float32Array {
  const out = new Float32Array(H * W)
  for (let r = 0; r < H; r++) {
    const s = offset + (r + PAD) * WP + PAD
    out.set(a.subarray(s, s + W), r * W)
  }
  return out
}

/** outliner output [1,3,576,576] -> unpadded probabilities [3,572,572] and per-pixel argmax (first max wins). */
export function argmaxPixels(probs: Float32Array): { am: Uint8Array; p: Float32Array } {
  const plane = HP * WP
  const p = new Float32Array(3 * H * W)
  for (let k = 0; k < 3; k++) p.set(unpadPlane(probs, k * plane), k * H * W)
  const am = new Uint8Array(H * W)
  const n = H * W
  for (let i = 0; i < n; i++) {
    const a = p[i]
    const b = p[n + i]
    const c = p[2 * n + i]
    let k = 0
    let best = a
    if (b > best) {
      k = 1
      best = b
    }
    if (c > best) k = 2
    am[i] = k
  }
  return { am, p }
}

/**
 * Per-pixel argmax (0 bg, 1 interior, 2 edge) -> Int32 label map (0 none, 1..K).
 * 1. 4-neighbour groups of interior pixels, numbered in raster order of their first pixel; < 50 px dropped, renumbered.
 * 2. Grow 2 synchronous rounds: unlabelled interior/edge pixels take the LARGEST 4-neighbour label.
 * 3. Cells < 300 px dropped, renumbered in label order.
 */
export function postprocessCells(am: Uint8Array): Int32Array {
  const n = H * W
  let lab = new Int32Array(n)
  // connected components (raster-order BFS == scipy.ndimage.label numbering)
  const queue = new Int32Array(n)
  let next = 0
  const sizes: number[] = [0]
  for (let i = 0; i < n; i++) {
    if (am[i] !== 1 || lab[i] !== 0) continue
    next++
    let qh = 0
    let qt = 0
    queue[qt++] = i
    lab[i] = next
    while (qh < qt) {
      const j = queue[qh++]
      const r = (j / W) | 0
      const c = j - r * W
      if (r > 0) {
        const t = j - W
        if (am[t] === 1 && lab[t] === 0) {
          lab[t] = next
          queue[qt++] = t
        }
      }
      if (r < H - 1) {
        const t = j + W
        if (am[t] === 1 && lab[t] === 0) {
          lab[t] = next
          queue[qt++] = t
        }
      }
      if (c > 0) {
        const t = j - 1
        if (am[t] === 1 && lab[t] === 0) {
          lab[t] = next
          queue[qt++] = t
        }
      }
      if (c < W - 1) {
        const t = j + 1
        if (am[t] === 1 && lab[t] === 0) {
          lab[t] = next
          queue[qt++] = t
        }
      }
    }
    sizes.push(qt)
  }
  // drop seeds under 50 px, renumber in order
  let remap = new Int32Array(next + 1)
  let k = 0
  for (let l = 1; l <= next; l++) if (sizes[l] >= MIN_SEED_PX) remap[l] = ++k
  for (let i = 0; i < n; i++) lab[i] = remap[lab[i]]
  // grow 2 synchronous rounds
  for (let round = 0; round < 2; round++) {
    const prev = lab
    const cur = new Int32Array(prev)
    for (let i = 0; i < n; i++) {
      if (prev[i] !== 0 || (am[i] !== 1 && am[i] !== 2)) continue
      const r = (i / W) | 0
      const c = i - r * W
      let nb = 0
      if (r > 0 && prev[i - W] > nb) nb = prev[i - W]
      if (r < H - 1 && prev[i + W] > nb) nb = prev[i + W]
      if (c > 0 && prev[i - 1] > nb) nb = prev[i - 1]
      if (c < W - 1 && prev[i + 1] > nb) nb = prev[i + 1]
      if (nb > 0) cur[i] = nb
    }
    lab = cur
  }
  // drop cells under 300 px, renumber
  const cnt = new Int32Array(k + 1)
  for (let i = 0; i < n; i++) cnt[lab[i]]++
  remap = new Int32Array(k + 1)
  let k2 = 0
  for (let l = 1; l <= k; l++) if (cnt[l] >= MIN_CELL_PX) remap[l] = ++k2
  for (let i = 0; i < n; i++) lab[i] = remap[lab[i]]
  return lab
}

export interface CellGeom {
  id: number
  /** integer crop centre [row, col] = floor(mean + 0.5) */
  centerRC: [number, number]
  area: number
  /** bounding box, rows [y0, y1), cols [x0, x1) */
  bbox: { y0: number; y1: number; x0: number; x1: number }
  /** bbox touches the photo edge (s5_demo.cell_geometry rule) */
  border: boolean
}

/** Geometry of the given ids (default 1..max) of a label map. Ids with no pixels get area 0. */
export function cellGeometry(lab: Int32Array | Uint8Array, ids?: number[]): CellGeom[] {
  // expert maps are uint8 with 255 = "not annotated"; model label maps are int32
  const ignore = lab instanceof Uint8Array ? 255 : -1
  let maxId = 0
  for (let i = 0; i < lab.length; i++) if (lab[i] > maxId && lab[i] !== ignore) maxId = lab[i]
  const m = maxId + 1
  const sy = new Float64Array(m)
  const sx = new Float64Array(m)
  const cnt = new Float64Array(m)
  const y0 = new Int32Array(m).fill(H)
  const y1 = new Int32Array(m).fill(-1)
  const x0 = new Int32Array(m).fill(W)
  const x1 = new Int32Array(m).fill(-1)
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const l = lab[r * W + c]
      if (l === 0 || l >= m) continue
      sy[l] += r
      sx[l] += c
      cnt[l]++
      if (r < y0[l]) y0[l] = r
      if (r > y1[l]) y1[l] = r
      if (c < x0[l]) x0[l] = c
      if (c > x1[l]) x1[l] = c
    }
  }
  const list = ids ?? Array.from({ length: maxId }, (_, i) => i + 1)
  return list.map((id) => {
    if (id >= m || cnt[id] === 0)
      return { id, centerRC: [0, 0], area: 0, bbox: { y0: 0, y1: 0, x0: 0, x1: 0 }, border: false }
    const b = { y0: y0[id], y1: y1[id] + 1, x0: x0[id], x1: x1[id] + 1 }
    return {
      id,
      centerRC: [Math.floor(sy[id] / cnt[id] + 0.5), Math.floor(sx[id] / cnt[id] + 0.5)],
      area: cnt[id],
      bbox: b,
      border: b.y0 === 0 || b.x0 === 0 || b.y1 === H || b.x1 === W,
    }
  })
}

/**
 * z float32 [572*572] (standardized, unpadded), label map -> float32 [N,3,96,96].
 * Window rows [cy-48, cy+48), cols [cx-48, cx+48); outside the image = 0. ch0 z, ch1 z*mask, ch2 2*mask-1.
 */
export function cropCells(z: Float32Array, lab: Int32Array | Uint8Array, geoms: CellGeom[]): Float32Array {
  const plane = CROP * CROP
  const out = new Float32Array(geoms.length * 3 * plane)
  const half = CROP / 2
  geoms.forEach((g, i) => {
    const [cy, cx] = g.centerRC
    const base = i * 3 * plane
    // ch2 defaults to -1 (mask 0) everywhere, including outside the image
    out.fill(-1, base + 2 * plane, base + 3 * plane)
    const ya = cy - half
    const xa = cx - half
    const sy0 = Math.max(ya, 0)
    const sy1 = Math.min(ya + CROP, H)
    const sx0 = Math.max(xa, 0)
    const sx1 = Math.min(xa + CROP, W)
    for (let r = sy0; r < sy1; r++) {
      const o = (r - ya) * CROP - xa
      for (let c = sx0; c < sx1; c++) {
        const v = z[r * W + c]
        const mk = lab[r * W + c] === g.id ? 1 : 0
        const t = o + c
        out[base + t] = v
        out[base + plane + t] = v * mk
        out[base + 2 * plane + t] = 2 * mk - 1
      }
    }
  })
  return out
}

/** [6] probabilities -> continuous 0-4 severity: sum p_k*k over Disc..E4 / sum of those 5. */
export function cellSeverity(p: ArrayLike<number>): number {
  let num = 0
  let den = 0
  for (let k = 0; k < 5; k++) {
    num += p[k] * k
    den += p[k]
  }
  return num / Math.max(den, 1e-12)
}

/** First maximum wins (numpy argmax). */
export function argmax(p: ArrayLike<number>): number {
  let k = 0
  for (let i = 1; i < p.length; i++) if (p[i] > p[k]) k = i
  return k
}

export interface FieldMetrics {
  n: number
  spikyPct: number
  advancedPct: number
  /** mean grade over Disc..E4 cells (Cup excluded); "Spike severity score (0-4, our scale)" */
  severity: number
  counts: Record<ClassName, number>
}

/** Per-cell classes (0..5; negatives ignored) -> field numbers. Cup counts in the % denominators, not in severity. */
export function fieldMetrics(classes: ArrayLike<number>): FieldMetrics {
  const counts = { Disc: 0, E1: 0, E2: 0, E3: 0, E4: 0, Cup: 0 } as Record<ClassName, number>
  let n = 0
  let sp = 0
  let adv = 0
  let gsum = 0
  let gn = 0
  for (let i = 0; i < classes.length; i++) {
    const c = classes[i]
    if (c < 0) continue
    n++
    counts[CLASS_NAMES[c]]++
    if (c >= 1 && c <= 4) sp++
    if (c >= 2 && c <= 4) adv++
    if (c <= 4) {
      gsum += c
      gn++
    }
  }
  if (n === 0) return { n: 0, spikyPct: 0, advancedPct: 0, severity: 0, counts }
  return { n, spikyPct: (100 * sp) / n, advancedPct: (100 * adv) / n, severity: gn ? gsum / gn : 0, counts }
}

/**
 * ACT tier (plan 03 section 9; tier logic and margin are OUR PRODUCT RULE). prev = [prevTier, prevSpiky] or null.
 * 0 Green; 1 Self-care (spiky >= S0+M and advanced < A0+M); 2 CMO (advanced >= A0+M, or both tier 1 with spiky
 * rising, or symptom ticked). Tiers 3-4 are never triggered by the model.
 */
export function actTier(
  spiky: number,
  adv: number,
  s0: number,
  a0: number,
  margin: number,
  prev: [number, number] | null = null,
  symptom = false,
): number {
  const base = spiky >= s0 + margin && adv < a0 + margin ? 1 : 0
  if (adv >= a0 + margin || symptom) return 2
  if (base === 1 && prev !== null && prev[0] === 1 && spiky > prev[1]) return 2
  return base
}

// Port of vs_prep.py (work/VeinSqueeze/vm/vs_prep.py) for user clips: grey conversion, content box,
// 64 evenly spaced frames, cv2.INTER_AREA resize to 160 x 160, then the model's 32 frames (0, 2, ..., 62).
// The shipped demo clips do NOT go through this: their exact model input ships as clip_<k>_t32.bin.

export const SIZE = 160
export const T_CACHE = 64
export const T_MODEL = 32
const STD_FRAMES = 32
export const PREP_CFG = { stdThr: 2.0, activeFrac: 0.1, minBoxFrac: 0.25 } as const

/** One decoded grey frame (uint8, row-major). */
export interface GreyFrame {
  width: number
  height: number
  data: Uint8Array
}

/** numpy's round(): round half to even. */
export function roundHalfEven(x: number): number {
  const r = Math.round(x)
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r
}

/** np.linspace(0, n - 1, num).round().astype(int). */
export function linspaceRound(n: number, num: number): number[] {
  const out: number[] = []
  if (num === 1) return [0]
  const step = (n - 1) / (num - 1)
  for (let i = 0; i < num; i++) out.push(roundHalfEven(i === num - 1 ? n - 1 : i * step))
  return out
}

/** t32 index -> original frame index for a clip of `frames` frames (vs_prep: 64 frames, the model takes 0::2). */
export function t32SourceFrames(frames: number): number[] {
  return linspaceRound(frames, T_CACHE).filter((_, i) => i % 2 === 0)
}

/** RGBA pixels -> grey uint8 exactly like _to_grey: (R + G + B + 1) // 3. */
export function rgbaToGrey(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): GreyFrame {
  const n = width * height
  const data = new Uint8Array(n)
  for (let i = 0, j = 0; i < n; i++, j += 4) data[i] = Math.floor((rgba[j] + rgba[j + 1] + rgba[j + 2] + 1) / 3)
  return { width, height, data }
}

/**
 * Active-pixel mask of content_box(): numpy's float32 `stack(...).astype(float32).std(0) > 2`, replicated step by
 * step in float32 (sum, mean, squared deviations summed frame by frame, divide, sqrt) so that pixels whose std sits
 * right at the threshold flip exactly as they do in vs_prep.py.
 */
export function activeMask(frames: GreyFrame[]): Uint8Array {
  const T = frames.length
  const { width: W, height: H } = frames[0]
  const idx = [...new Set(linspaceRound(T, STD_FRAMES))]
  const n = idx.length
  const N = W * H
  const mean = new Float32Array(N) // integer sums (<= 32 * 255) are exact in float32
  for (const i of idx) {
    const d = frames[i].data
    for (let p = 0; p < N; p++) mean[p] += d[p]
  }
  for (let p = 0; p < N; p++) mean[p] = mean[p] / n
  const acc = new Float32Array(N) // each Float32Array store rounds to float32, like numpy's float32 ufuncs
  for (const i of idx) {
    const d = frames[i].data
    for (let p = 0; p < N; p++) {
      const dv = Math.fround(d[p] - mean[p])
      acc[p] += Math.fround(dv * dv)
    }
  }
  const active = new Uint8Array(N)
  for (let p = 0; p < N; p++) active[p] = Math.fround(Math.sqrt(Math.fround(acc[p] / n))) > PREP_CFG.stdThr ? 1 : 0
  return active
}

/** content_box(): per-pixel std over up to 32 evenly spaced frames, active = std > 2, keep rows/cols > 10% active. */
export function contentBox(frames: GreyFrame[]): { y0: number; y1: number; x0: number; x1: number; frac: number; full: boolean } {
  const { width: W, height: H } = frames[0]
  const active = activeMask(frames)
  const rowCnt = new Int32Array(H)
  const colCnt = new Int32Array(W)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (active[y * W + x]) {
        rowCnt[y]++
        colCnt[x]++
      }
    }
  }
  let y0 = -1, y1 = -1, x0 = -1, x1 = -1
  for (let y = 0; y < H; y++) if (rowCnt[y] / W > PREP_CFG.activeFrac) { if (y0 < 0) y0 = y; y1 = y + 1 }
  for (let x = 0; x < W; x++) if (colCnt[x] / H > PREP_CFG.activeFrac) { if (x0 < 0) x0 = x; x1 = x + 1 }
  if (y0 < 0 || x0 < 0) return { y0: 0, y1: H, x0: 0, x1: W, frac: 0, full: true }
  const frac = ((y1 - y0) * (x1 - x0)) / (H * W)
  if (frac < PREP_CFG.minBoxFrac) return { y0: 0, y1: H, x0: 0, x1: W, frac, full: true }
  return { y0, y1, x0, x1, frac, full: false }
}

/** cvRound / saturate_cast<uchar>(float): round half to even, clamp 0-255. */
function satU8(v: number): number {
  const r = Math.round(v)
  const e = Math.abs(v - Math.trunc(v)) === 0.5 && r % 2 !== 0 ? r - 1 : r
  return e < 0 ? 0 : e > 255 ? 255 : e
}

interface Tab { di: number; si: number; alpha: number }

/** OpenCV computeResizeAreaTab (alpha stored as float32). */
function areaTab(ssize: number, dsize: number, scale: number): Tab[] {
  const tab: Tab[] = []
  for (let dx = 0; dx < dsize; dx++) {
    const fsx1 = dx * scale
    const fsx2 = fsx1 + scale
    const cellWidth = Math.min(scale, ssize - fsx1)
    let sx1 = Math.ceil(fsx1)
    let sx2 = Math.floor(fsx2)
    sx2 = Math.min(sx2, ssize - 1)
    sx1 = Math.min(sx1, sx2)
    if (sx1 - fsx1 > 1e-3) tab.push({ di: dx, si: sx1 - 1, alpha: Math.fround((sx1 - fsx1) / cellWidth) })
    for (let sx = sx1; sx < sx2; sx++) tab.push({ di: dx, si: sx, alpha: Math.fround(1.0 / cellWidth) })
    if (fsx2 - sx2 > 1e-3) tab.push({ di: dx, si: sx2, alpha: Math.fround(Math.min(Math.min(fsx2 - sx2, 1), cellWidth) / cellWidth) })
  }
  return tab
}

/**
 * cv2.resize(src, (dw, dh), interpolation=cv2.INTER_AREA) for a single-channel uint8 image, downscaling only
 * (both scales >= 1). Integer scales take OpenCV's fast path; other scales the generic area path with float32
 * accumulation. Upscaling (crop smaller than 160 px) falls back to a plain bilinear resize (documented gap).
 */
export function resizeArea(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const dst = new Uint8Array(dw * dh)
  const scaleX = 1 / (dw / sw)
  const scaleY = 1 / (dh / sh)
  if (scaleX < 1 || scaleY < 1) return resizeBilinear(src, sw, sh, dw, dh)
  const ix = Math.round(scaleX), iy = Math.round(scaleY)
  if (Math.abs(scaleX - ix) < Number.EPSILON && Math.abs(scaleY - iy) < Number.EPSILON) {
    const area = ix * iy
    const fscale = Math.fround(1 / area)
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        let s = 0
        for (let dy = 0; dy < iy; dy++) {
          const row = (y * iy + dy) * sw + x * ix
          for (let dx = 0; dx < ix; dx++) s += src[row + dx]
        }
        dst[y * dw + x] = ix === 2 && iy === 2 ? (s + 2) >> 2 : satU8(Math.fround(s * fscale))
      }
    }
    return dst
  }
  const xtab = areaTab(sw, dw, scaleX)
  const ytab = areaTab(sh, dh, scaleY)
  const buf = new Float32Array(dw)
  const sum = new Float32Array(dw)
  let prevDy = ytab[0].di
  for (let j = 0; j < ytab.length; j++) {
    const beta = ytab[j].alpha
    const dy = ytab[j].di
    const row = ytab[j].si * sw
    buf.fill(0)
    for (let k = 0; k < xtab.length; k++) {
      const t = xtab[k]
      buf[t.di] = Math.fround(buf[t.di] + Math.fround(src[row + t.si] * t.alpha))
    }
    if (dy !== prevDy) {
      const o = prevDy * dw
      for (let x = 0; x < dw; x++) {
        dst[o + x] = satU8(sum[x])
        sum[x] = Math.fround(beta * buf[x])
      }
      prevDy = dy
    } else {
      for (let x = 0; x < dw; x++) sum[x] = Math.fround(sum[x] + Math.fround(beta * buf[x]))
    }
  }
  const o = prevDy * dw
  for (let x = 0; x < dw; x++) dst[o + x] = satU8(sum[x])
  return dst
}

function resizeBilinear(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const dst = new Uint8Array(dw * dh)
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(Math.max((y + 0.5) * (sh / dh) - 0.5, 0), sh - 1)
    const y0 = Math.floor(fy), y1 = Math.min(y0 + 1, sh - 1), wy = fy - y0
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(Math.max((x + 0.5) * (sw / dw) - 0.5, 0), sw - 1)
      const x0 = Math.floor(fx), x1 = Math.min(x0 + 1, sw - 1), wx = fx - x0
      const v =
        (src[y0 * sw + x0] * (1 - wx) + src[y0 * sw + x1] * wx) * (1 - wy) +
        (src[y1 * sw + x0] * (1 - wx) + src[y1 * sw + x1] * wx) * wy
      dst[y * dw + x] = satU8(v)
    }
  }
  return dst
}

function cropFrame(f: GreyFrame, x0: number, y0: number, x1: number, y1: number): Uint8Array {
  const w = x1 - x0, h = y1 - y0
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) out.set(f.data.subarray((y0 + y) * f.width + x0, (y0 + y) * f.width + x1), y * w)
  return out
}

/** Whole vs_prep.py path: all decoded frames of a clip -> exact uint8 [32,160,160] model input + its crop box. */
export function prepareClip(frames: GreyFrame[]): {
  t32: Uint8Array
  box: [number, number, number, number]
  fullFrame: boolean
  sourceFrames: number[]
} {
  if (frames.length === 0) throw new Error('no frames')
  const { width: W, height: H } = frames[0]
  for (const f of frames) if (f.width !== W || f.height !== H) throw new Error('frames differ in size')
  const b = contentBox(frames)
  const samp = linspaceRound(frames.length, T_CACHE)
  const t32 = new Uint8Array(T_MODEL * SIZE * SIZE)
  const used: number[] = []
  for (let k = 0; k < T_CACHE; k += 2) {
    const i = samp[k]
    used.push(i)
    const c = cropFrame(frames[i], b.x0, b.y0, b.x1, b.y1)
    t32.set(resizeArea(c, b.x1 - b.x0, b.y1 - b.y0, SIZE, SIZE), (k / 2) * SIZE * SIZE)
  }
  return { t32, box: [b.x0, b.y0, b.x1, b.y1], fullFrame: b.full, sourceFrames: used }
}

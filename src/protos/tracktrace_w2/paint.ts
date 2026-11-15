// Draws a real nucleus (the model's 128 x 128 input x) as a glowing specimen: transparent outside the nucleus.
export const N = 128

export function whitePoint(x: Float32Array | ArrayLike<number>, from = 0, len = N * N): number {
  const vals: number[] = []
  for (let i = 0; i < len; i += 3) {
    const v = x[from + i]
    if (v > 0) vals.push(v)
  }
  if (!vals.length) return 1
  vals.sort((a, b) => a - b)
  return vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.997))] || 1
}

/** Violet shadows, warm-white highlights. */
export function paintNucleus(cv: HTMLCanvasElement, x: Float32Array | ArrayLike<number>, from = 0): void {
  cv.width = N
  cv.height = N
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(N, N)
  const wp = whitePoint(x, from)
  const d = img.data
  for (let i = 0; i < N * N; i++) {
    const raw = x[from + i]
    if (!(raw > 0)) continue
    const g = Math.min(1, raw / wp)
    d[i * 4] = 255 * Math.pow(g, 1.25)
    d[i * 4 + 1] = 240 * Math.pow(g, 1.5)
    d[i * 4 + 2] = 255 * (0.34 * Math.pow(g, 0.55) + 0.62 * Math.pow(g, 1.5))
    d[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

/** 32 x 32 token brightness (mean of each 4 x 4 patch), 0..1. */
export function tokens(x: Float32Array): Float32Array {
  const wp = whitePoint(x)
  const t = new Float32Array(32 * 32)
  for (let r = 0; r < 32; r++)
    for (let c = 0; c < 32; c++) {
      let s = 0
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) s += x[(r * 4 + dy) * N + c * 4 + dx]
      t[r * 32 + c] = Math.min(1, s / 16 / wp)
    }
  return t
}

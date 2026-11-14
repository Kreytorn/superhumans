// Pre- and post-processing ported from the CPU reference runner work/ModelExamples/scripts/bubblegrade_example.py
// and work/BubbleGrade/vm/bg_run.py (windows_of) / bg_prep.py (channel 0, int16 rounding). Pure functions.
import {
  CAM_CELLS,
  CAM_CELL_S,
  FRAMES,
  FRAME_HOP,
  HOP,
  MEL_BANDS,
  MEL_FMAX_HZ,
  MEL_FMIN_HZ,
  SAMPLE_RATE,
  THRESHOLDS,
  WIN,
} from './constants'

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

/** bg_run.windows_of: 5-s windows with a 1-s hop, plus one end-aligned window when the rest is not whole seconds. */
export function windowStarts(n: number): number[] {
  if (n < WIN) return []
  const st: number[] = []
  for (let s = 0; s <= n - WIN; s += HOP) st.push(s)
  if ((n - WIN) % HOP !== 0) st.push(n - WIN)
  return st
}

/** Cuts the windows out of a 16 kHz wave into one [n, 80000] batch. */
export function cutWindows(wave: Float32Array, starts: number[]): Float32Array {
  const out = new Float32Array(starts.length * WIN)
  starts.forEach((s, i) => out.set(wave.subarray(s, s + WIN), i * WIN))
  return out
}

/**
 * Spectrogram stitching (plan §8.1): window 0's 498 frames, then from each later window only the frames
 * after the previous window's end. `logmel` is [n, 64, 498] row-major; returns row-major [64][cols].
 */
export function stitch(logmel: Float32Array, starts: number[]): { cols: number; data: Float32Array } {
  const take: number[] = []
  let have = 0
  for (const s of starts) {
    const f0 = Math.floor(s / FRAME_HOP)
    take.push(Math.max(0, have - f0))
    have = f0 + FRAMES
  }
  const cols = take.reduce((a, k) => a + (FRAMES - Math.min(k, FRAMES)), 0)
  const data = new Float32Array(MEL_BANDS * cols)
  let c0 = 0
  starts.forEach((_, i) => {
    const k = Math.min(take[i], FRAMES)
    const w = FRAMES - k
    for (let r = 0; r < MEL_BANDS; r++) {
      const src = (i * MEL_BANDS + r) * FRAMES + k
      data.set(logmel.subarray(src, src + w), r * cols + c0)
    }
    c0 += w
  })
  return { cols, data }
}

/**
 * Bubble map (plan §8.1): cell j of a window covers [start + j*0.3125 s, start + (j+1)*0.3125 s); the value at a
 * time point is the mean of all covering cells, shown as sigmoid(value + b_3). Grid 0, step, 2*step, ... < duration.
 */
export function bubbleMap(cam: ArrayLike<number>, starts: number[], nSamples: number, stepS = 0.05): Float32Array {
  const dur = nSamples / SAMPLE_RATE
  const len = Math.ceil(dur / stepS - 1e-9)
  const acc = new Float64Array(len)
  const cnt = new Float64Array(len)
  // same float64 grid as np.arange(0, dur, step)
  const tg = new Float64Array(len)
  for (let k = 0; k < len; k++) tg[k] = k * stepS
  starts.forEach((s, i) => {
    const t0 = s / SAMPLE_RATE
    for (let j = 0; j < CAM_CELLS; j++) {
      const a = t0 + j * CAM_CELL_S
      const b = t0 + (j + 1) * CAM_CELL_S
      const v = cam[i * CAM_CELLS + j]
      const k0 = Math.max(0, Math.floor(a / stepS) - 1)
      for (let k = k0; k < len && tg[k] < b; k++) {
        if (tg[k] >= a) {
          acc[k] += v
          cnt[k] += 1
        }
      }
    }
  })
  const out = new Float32Array(len)
  for (let k = 0; k < len; k++) out[k] = sigmoid(acc[k] / Math.max(cnt[k], 1) + THRESHOLDS[2])
  return out
}

/** Clip values (plan §4): mean over windows of each P(>= k); E = sum; g = how many exceed 0.5. */
export function clipStats(p: ArrayLike<number>, nWin: number) {
  const P = [0, 0, 0, 0]
  for (let i = 0; i < nWin; i++) for (let k = 0; k < 4; k++) P[k] += p[i * 4 + k]
  for (let k = 0; k < 4; k++) P[k] /= nWin
  const E = P[0] + P[1] + P[2] + P[3]
  const g = P.filter((v) => v > 0.5).length
  return { P, E, g }
}

/** P(grade = k) for k = 0..IV from the cumulative P(>= k). */
export function gradeProbs(P: number[]): number[] {
  return [1 - P[0], P[0] - P[1], P[1] - P[2], P[2] - P[3], P[3]]
}

/** Centre frequency (Hz) of each of the 64 HTK mel filters, 20-8000 Hz, row 0 = lowest. */
export function melBandCentresHz(): number[] {
  const mel = (f: number) => 2595 * Math.log10(1 + f / 700)
  const hz = (m: number) => 700 * (10 ** (m / 2595) - 1)
  const lo = mel(MEL_FMIN_HZ)
  const hi = mel(MEL_FMAX_HZ)
  return Array.from({ length: MEL_BANDS }, (_, k) => hz(lo + ((hi - lo) * (k + 1)) / (MEL_BANDS + 1)))
}

export interface DecodedWav {
  sampleRate: number
  channels: number
  bits: number
  format: 'pcm' | 'float'
  /** Channel 0 as written in the file (int16 only for 16-bit PCM). */
  int16?: Int16Array
  /** Channel 0 as float in [-1, 1]. */
  ch0: Float32Array
}

/** Minimal RIFF/WAVE reader (PCM 8/16/24/32-bit, IEEE float 32/64, WAVE_FORMAT_EXTENSIBLE). Returns null if not a WAV. */
export function parseWav(buf: ArrayBuffer): DecodedWav | null {
  const v = new DataView(buf)
  if (buf.byteLength < 12) return null
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3))
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null
  let o = 12
  let fmt: { code: number; ch: number; sr: number; bits: number; align: number } | null = null
  while (o + 8 <= buf.byteLength) {
    const id = tag(o)
    const size = v.getUint32(o + 4, true)
    const body = o + 8
    if (id === 'fmt ') {
      let code = v.getUint16(body, true)
      if (code === 0xfffe && size >= 26) code = v.getUint16(body + 24, true)
      fmt = { code, ch: v.getUint16(body + 2, true), sr: v.getUint32(body + 4, true), align: v.getUint16(body + 12, true), bits: v.getUint16(body + 14, true) }
    } else if (id === 'data' && fmt) {
      const end = Math.min(buf.byteLength, body + size)
      const n = Math.floor((end - body) / fmt.align)
      const bps = fmt.bits / 8
      const ch0 = new Float32Array(n)
      let int16: Int16Array | undefined
      if (fmt.code === 1 && fmt.bits === 16) {
        int16 = new Int16Array(n)
        for (let i = 0; i < n; i++) {
          const x = v.getInt16(body + i * fmt.align, true)
          int16[i] = x
          ch0[i] = x / 32768
        }
      } else if (fmt.code === 1) {
        for (let i = 0; i < n; i++) {
          const p = body + i * fmt.align
          if (bps === 1) ch0[i] = (v.getUint8(p) - 128) / 128
          else if (bps === 3) ch0[i] = ((v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16)) as number) / 8388608
          else if (bps === 4) ch0[i] = v.getInt32(p, true) / 2147483648
          else return null
        }
      } else if (fmt.code === 3) {
        for (let i = 0; i < n; i++) {
          const p = body + i * fmt.align
          ch0[i] = bps === 8 ? v.getFloat64(p, true) : v.getFloat32(p, true)
        }
      } else return null
      return { sampleRate: fmt.sr, channels: fmt.ch, bits: fmt.bits, format: fmt.code === 3 ? 'float' : 'pcm', int16, ch0 }
    }
    o = body + size + (size & 1)
  }
  return null
}

/** bg_prep's last step: clip to [-1, 1], round(y * 32767) to int16; the model then reads int16 / 32768. */
export function quantizeLikePrep(y: Float32Array): Float32Array {
  const out = new Float32Array(y.length)
  for (let i = 0; i < y.length; i++) {
    const c = Math.max(-1, Math.min(1, y[i]))
    out[i] = Math.round(c * 32767) / 32768
  }
  return out
}

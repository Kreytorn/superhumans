// Asset helpers: URLs relative to the app base, JSON, .gz (DecompressionStream) and exact grey PNG decoding.
import { H, W } from './pipeline'

let base = `${import.meta.env.BASE_URL}spikecount/`

/** Where "spikecount/" lives. Default: Vite's BASE_URL + "spikecount/" (works from nested pages in dev). */
export function setAssetBase(b: string) {
  base = b.endsWith('/') ? b : b + '/'
}

export function assetUrl(rel: string): string {
  return new URL(base + rel, document.baseURI).href
}

export async function fetchJson<T>(rel: string): Promise<T> {
  const r = await fetch(assetUrl(rel))
  if (!r.ok) throw new Error(`spikecount: ${rel} -> HTTP ${r.status}`)
  return (await r.json()) as T
}

/** Fetches a .gz file and inflates it. If a host already removed the gzip layer, the bytes are used as they are. */
export async function fetchGz(rel: string): Promise<ArrayBuffer> {
  const r = await fetch(assetUrl(rel))
  if (!r.ok) throw new Error(`spikecount: ${rel} -> HTTP ${r.status}`)
  const buf = await r.arrayBuffer()
  const b = new Uint8Array(buf, 0, Math.min(2, buf.byteLength))
  if (b[0] !== 0x1f || b[1] !== 0x8b) return buf
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

export interface GreyImage {
  width: number
  height: number
  data: Uint8Array
  /** true when the source had colour and was converted to grey (luma 0.299/0.587/0.114, our choice) */
  converted: boolean
}

/** Decodes any browser-decodable image to 8-bit grey without colour management. Grey PNGs decode exactly. */
export async function decodeGrey(src: Blob | string): Promise<GreyImage> {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const w = bmp.width
  const h = bmp.height
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null
  if (typeof OffscreenCanvas !== 'undefined') {
    ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })
  } else {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    ctx = c.getContext('2d', { willReadFrequently: true })
  }
  if (!ctx) throw new Error('spikecount: no 2D canvas for image decoding')
  ctx.drawImage(bmp, 0, 0)
  bmp.close()
  const rgba = ctx.getImageData(0, 0, w, h).data
  const data = new Uint8Array(w * h)
  let converted = false
  for (let i = 0; i < w * h; i++) {
    const r = rgba[4 * i]
    const g = rgba[4 * i + 1]
    const b = rgba[4 * i + 2]
    if (r === g && g === b) data[i] = r
    else {
      converted = true
      data[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    }
  }
  return { width: w, height: h, data, converted }
}

export interface FittedField {
  data: Uint8Array
  /** what was done to make a 572 x 572 field */
  fit: 'exact' | 'center-crop' | 'upscaled-and-cropped'
  sourceSize: [number, number]
}

/**
 * Makes a 572 x 572 field from any grey image: exact size passes through; larger images are centre-cropped at
 * native scale (cell size is a real cue, so no downscaling); smaller ones are upscaled (bilinear) until the short
 * side is 572, then centre-cropped. Our own convention for user input; the models only ever saw 572 x 572 fields.
 */
export function fitField(img: GreyImage): FittedField {
  const { width: w, height: h, data } = img
  if (w === W && h === H) return { data, fit: 'exact', sourceSize: [w, h] }
  let src = data
  let sw = w
  let sh = h
  let fit: FittedField['fit'] = 'center-crop'
  if (w < W || h < H) {
    const s = Math.max(W / w, H / h)
    sw = Math.ceil(w * s)
    sh = Math.ceil(h * s)
    src = new Uint8Array(sw * sh)
    for (let y = 0; y < sh; y++) {
      const fy = Math.min(Math.max((y + 0.5) / s - 0.5, 0), h - 1)
      const y0 = Math.floor(fy)
      const y1 = Math.min(y0 + 1, h - 1)
      const ty = fy - y0
      for (let x = 0; x < sw; x++) {
        const fx = Math.min(Math.max((x + 0.5) / s - 0.5, 0), w - 1)
        const x0 = Math.floor(fx)
        const x1 = Math.min(x0 + 1, w - 1)
        const tx = fx - x0
        const v =
          (1 - ty) * ((1 - tx) * data[y0 * w + x0] + tx * data[y0 * w + x1]) +
          ty * ((1 - tx) * data[y1 * w + x0] + tx * data[y1 * w + x1])
        src[y * sw + x] = Math.round(v)
      }
    }
    fit = 'upscaled-and-cropped'
  }
  const oy = Math.floor((sh - H) / 2)
  const ox = Math.floor((sw - W) / 2)
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) out.set(src.subarray((y + oy) * sw + ox, (y + oy) * sw + ox + W), y * W)
  return { data: out, fit, sourceSize: [w, h] }
}

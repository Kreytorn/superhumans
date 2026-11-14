// Asset loading for TrackTrace: fetch relative to the app base, gunzip with the browser's
// DecompressionStream, decode little-endian float16 nuclei to float32.

const cache = new Map<string, Promise<unknown>>()

export function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href
}

export function fetchJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(assetUrl(path)).then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
        return r.json()
      }),
    )
    // A failed fetch must not stay cached forever (a retry after a network hiccup would fail again).
    cache.get(path)!.catch(() => cache.delete(path))
  }
  return cache.get(path) as Promise<T>
}

async function gunzip(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('gzip')
  const stream = new Blob([buf]).stream().pipeThrough(ds)
  return new Response(stream).arrayBuffer()
}

function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1
  const e = (h >> 10) & 0x1f
  const f = h & 0x3ff
  if (e === 0) return s * f * 2 ** -24
  if (e === 31) return f ? NaN : s * Infinity
  return s * (1 + f / 1024) * 2 ** (e - 15)
}

const HALF = (() => {
  const t = new Float32Array(65536)
  for (let i = 0; i < 65536; i++) t[i] = halfToFloat(i)
  return t
})()

/** All nuclei of one .f16.bin.gz file as one Float32Array [n * 128 * 128] (row-major per nucleus). */
export function fetchNuclei(path: string): Promise<Float32Array> {
  const key = `f16:${path}`
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const r = await fetch(assetUrl(path))
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
        const raw = await r.arrayBuffer()
        // Some servers already strip the gzip layer (Content-Encoding); detect the magic bytes.
        const head = new Uint8Array(raw, 0, 2)
        const bytes = head[0] === 0x1f && head[1] === 0x8b ? await gunzip(raw) : raw
        const u16 = new Uint16Array(bytes)
        const out = new Float32Array(u16.length)
        for (let i = 0; i < u16.length; i++) out[i] = HALF[u16[i]]
        return out
      })(),
    )
    cache.get(key)!.catch(() => cache.delete(key))
  }
  return cache.get(key) as Promise<Float32Array>
}

// Dev-only: writes app/public/themes/V10/paper.png, a small seamless grain for the indigo plate (laid on with
// soft-light, so mid grey changes nothing and only the grain shows).  node src/protos/V10/_tools/build-paper.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const N = 256
let seed = 1234567
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296)

// periodic value noise
function lattice(n) {
  const g = new Float32Array(n * n)
  for (let k = 0; k < g.length; k++) g[k] = rnd()
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y)
    const fx = x - xi, fy = y - yi
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const at = (i, j) => g[((j % n) + n) % n * n + (((i % n) + n) % n)]
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
}
const oct = [lattice(4), lattice(8), lattice(16), lattice(32), lattice(64)]
const v = new Float32Array(N * N)
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    let s = 0, w = 0.5, tw = 0
    oct.forEach((f, k) => {
      const n = 4 << k
      s += f((x / N) * n, (y / N) * n) * w
      tw += w
      w *= 0.55
    })
    v[y * N + x] = (s / tw - 0.5) * 0.55 + (rnd() - 0.5) * 0.32 // cloud plus fine grain
  }
// a few long, faint fibres (wrapped, so the tile stays seamless)
for (let f = 0; f < 70; f++) {
  let x = rnd() * N, y = rnd() * N
  let a = rnd() * Math.PI * 2
  const L = 20 + rnd() * 60, s = (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 0.18)
  for (let t = 0; t < L; t++) {
    a += (rnd() - 0.5) * 0.25
    x += Math.cos(a)
    y += Math.sin(a)
    const k = ((Math.floor(y) % N) + N) % N * N + (((Math.floor(x) % N) + N) % N)
    v[k] += s
  }
}
const raw = Buffer.alloc(N * (N * 3 + 1))
for (let y = 0; y < N; y++) {
  raw[y * (N * 3 + 1)] = 0
  for (let x = 0; x < N; x++) {
    const g = Math.max(0, Math.min(255, Math.round(128 + v[y * N + x] * 128)))
    const o = y * (N * 3 + 1) + 1 + x * 3
    raw[o] = raw[o + 1] = raw[o + 2] = g
  }
}
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0)
ihdr.writeUInt32BE(N, 4)
ihdr[8] = 8
ihdr[9] = 2
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
const dir = join(HERE, '..', '..', '..', '..', 'public', 'themes', 'V10')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'paper.png'), png)
console.log('paper.png', png.length, 'bytes')

// The one camera of the zoom. Position = target + distance * direction; the distance moves in log space (L = ln metres),
// so the pull back from a chest to a planet is one exponential move across real scale steps.
import type { V3 } from './data'

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const norm = (a: V3): V3 => mul(a, 1 / Math.hypot(a[0], a[1], a[2]))
export const lerp = (a: number, b: number, s: number) => a + (b - a) * s
export const lerp3 = (a: V3, b: V3, s: number): V3 => [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2], b[2], s)]
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const smooth = (x: number) => {
  const u = clamp01(x)
  return u * u * (3 - 2 * u)
}
export const easeIO = (x: number) => {
  const u = clamp01(x)
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
const DEG = Math.PI / 180
export const yawPitch = (yaw: number, pitch: number): V3 => [Math.cos(pitch * DEG) * Math.sin(yaw * DEG), Math.sin(pitch * DEG), Math.cos(pitch * DEG) * Math.cos(yaw * DEG)]

export const BODY_C: V3 = [0, 0.05, 0.12]
export const SHIP_C: V3 = [0, 0, -27]
export const WINDOW_C: V3 = [0, 0, 0.78]

/** One stop on the zoom: target, direction from target to camera, where the target sits on screen, vertical field of view. */
export interface Key {
  L: number
  T: V3
  dir: V3
  ax: number
  ay: number
  fov: number
  /** screen up; the outer zoom rolls so the planet ends up below the ship */
  up: V3
}

export interface Cam {
  co: V3
  cf: V3
  cr: V3
  cu: V3
  f: number
  pp: [number, number]
  L: number
}

export const L_CLOSE = Math.log(0.4)
export const L_BODY = Math.log(2.3)
export const L_REST = Math.log(7.4)
export const L_SHIP = Math.log(170)
export const L_SPACE = Math.log(2.4e6)

export interface World {
  sun: V3
  sunFar: V3
  pc: V3 // planet centre, km
  pr: number // planet radius, km
  keys: Key[]
}

/** The rest view's basis decides where the planet and sun sit, so the settled frame always shows the lit curve. */
export function makeWorld(phone: boolean, tune?: { pc?: number[]; rho?: number }): World {
  const restDir = norm(yawPitch(phone ? 18 : 27, phone ? 6 : 7))
  const f = mul(restDir, -1)
  const r = norm(cross(f, [0, 1, 0]))
  const u = cross(r, f)
  const k = tune?.pc ?? (phone ? [0.7, -0.1, -0.8] : [0.7, -0.2, -0.8])
  const c = norm(add(add(mul(f, k[0]), mul(r, k[1])), mul(u, k[2])))
  const pr = 3000
  const dist = pr / Math.sin((tune?.rho ?? 46) * DEG)
  const pc = mul(c, dist)
  const fperp = norm(sub(f, mul(c, dot(f, c))))
  const sun = norm(add(add(mul(c, 0.5), mul(fperp, 0.85)), mul(u, 0.12)))
  // space: far out on the rest camera's side, raised until the ship sits a little above the planet's lit curve
  const upR = mul(c, -1)
  const side = norm(yawPitch(phone ? 62 : 70, 8))
  const t0 = norm(sub(side, mul(c, dot(side, c))))
  const Dsp = Math.exp(L_SPACE) / 1000
  const P = mul(c, dist)
  const sep = (e: number) => {
    const sd = norm(add(mul(t0, Math.cos(e)), mul(upR, Math.sin(e))))
    const C = mul(sd, Dsp)
    const toP = sub(P, C)
    const lp = Math.hypot(toP[0], toP[1], toP[2])
    const th = Math.acos(Math.max(-1, Math.min(1, dot(mul(sd, -1), mul(toP, 1 / lp)))))
    return { gap: th - Math.asin(Math.min(1, pr / lp)), sd }
  }
  // raising the camera above the ship brings the ship down towards the limb on screen
  let lo = 0
  let hi = 1.3
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (sep(mid).gap > (phone ? 9 : 7) * DEG) lo = mid
    else hi = mid
  }
  const spaceDir = sep((lo + hi) / 2).sd
  const eS = (lo + hi) / 2
  const nTop = norm(sub(mul(upR, Math.cos(eS)), mul(t0, Math.sin(eS))))
  const sunFar = norm(add(mul(spaceDir, -0.95), mul(nTop, 0.32)))
  const shipDir = norm(yawPitch(phone ? 40 : 50, 16))
  const Y: V3 = [0, 1, 0]
  const keys: Key[] = [
    { L: L_CLOSE, T: [0.1, 0.47, 0.07], dir: norm(yawPitch(30, 16)), ax: 0.5, ay: 0.5, fov: 42, up: Y },
    { L: L_BODY, T: BODY_C, dir: norm(yawPitch(18, 5)), ax: 0.5, ay: 0.5, fov: 36, up: Y },
    { L: L_REST, T: BODY_C, dir: restDir, ax: phone ? 0.5 : 0.63, ay: phone ? 0.45 : 0.5, fov: phone ? 25 : 25, up: Y },
    { L: L_SHIP, T: SHIP_C, dir: shipDir, ax: 0.5, ay: phone ? 0.46 : 0.5, fov: 30, up: Y },
    { L: L_SPACE, T: SHIP_C, dir: spaceDir, ax: phone ? 0.5 : 0.6, ay: phone ? 0.36 : 0.4, fov: 38, up: upR },
  ]
  return { sun, sunFar, pc, pr, keys }
}

/** The sun drifts with the zoom (nobody can tell): near views keep the rest light, the far view lights the planet's top. */
export function sunAt(w: World, L: number): V3 {
  return norm(lerp3(w.sun, w.sunFar, smooth((L - L_SHIP - 1.5) / (L_SPACE - L_SHIP - 3))))
}

export function keyAt(keys: Key[], L: number): Key {
  if (L <= keys[0].L) return { ...keys[0], L }
  const last = keys[keys.length - 1]
  if (L >= last.L) return { ...last, L }
  let i = 0
  while (i < keys.length - 2 && L > keys[i + 1].L) i++
  const a = keys[i]
  const b = keys[i + 1]
  const s = smooth((L - a.L) / (b.L - a.L))
  return mixKey(a, b, s, L)
}

export function mixKey(a: Key, b: Key, s: number, L = lerp(a.L, b.L, s)): Key {
  return { L, T: lerp3(a.T, b.T, s), dir: norm(lerp3(a.dir, b.dir, s)), ax: lerp(a.ax, b.ax, s), ay: lerp(a.ay, b.ay, s), fov: lerp(a.fov, b.fov, s), up: norm(lerp3(a.up, b.up, s)) }
}

/** Camera for a key in a W x H (CSS px) view. Portrait views keep the horizontal extent. */
export function camOf(k: Key, W: number, H: number, out?: Cam): Cam {
  const D = Math.exp(k.L)
  const co = add(k.T, mul(k.dir, D))
  const cf = mul(k.dir, -1)
  const cr = norm(cross(cf, k.up))
  const cu = cross(cr, cf)
  const ref = Math.min(H, W * 1.15)
  const f = ref / 2 / Math.tan((k.fov * DEG) / 2)
  const c = out ?? ({} as Cam)
  c.co = co
  c.cf = cf
  c.cr = cr
  c.cu = cu
  c.f = f
  c.pp = [k.ax * W, k.ay * H]
  c.L = k.L
  return c
}

/** Screen position (CSS px) and depth of a world point. */
export function project(c: Cam, p: V3): [number, number, number] {
  const v = sub(p, c.co)
  const z = dot(v, c.cf)
  return [c.pp[0] + (c.f * dot(v, c.cr)) / z, c.pp[1] - (c.f * dot(v, c.cu)) / z, z]
}

/** The dive: from wherever the camera is to a few centimetres above one place on the skin. The camera keeps its
 *  heading until it is inside the cabin (it passes through the window), then turns to face the place. */
export function diveKey(from: Key, place: V3, out: V3, W: number, H: number, u: number): Key {
  const c0 = camOf(from, W, H)
  const co = c0.co
  const d0 = Math.hypot(co[0] - place[0], co[1] - place[1], co[2] - place[2])
  const dir0 = norm(sub(co, place))
  const [sx, sy] = project(c0, place)
  const dir1 = norm(add(norm(out), mul(dir0, 0.6)))
  const e = easeIO(u)
  const eo = easeOut(u * 1.25)
  const L = lerp(Math.log(d0), Math.log(0.022), e)
  const w = smooth((Math.log(0.55) - L) / (Math.log(0.55) - Math.log(0.03)))
  return {
    L,
    T: place,
    dir: norm(lerp3(dir0, dir1, w)),
    ax: lerp(sx / W, 0.5, eo),
    ay: lerp(sy / H, 0.5, eo),
    fov: lerp(from.fov, 46, e),
    up: from.up,
  }
}

/** Where on the scale rail (0 top = Space, 1 = Body) a zoom level sits. */
export function railPos(L: number): number {
  const stops: [number, number][] = [
    [L_SPACE, 0],
    [L_SHIP, 0.42],
    [L_REST, 0.82],
    [L_CLOSE, 1],
  ]
  if (L >= stops[0][0]) return 0
  for (let i = 0; i < stops.length - 1; i++) {
    const [la, pa] = stops[i]
    const [lb, pb] = stops[i + 1]
    if (L <= la && L >= lb) return lerp(pa, pb, (la - L) / (la - lb))
  }
  return 1
}

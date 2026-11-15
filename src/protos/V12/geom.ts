// The astronaut, drawn by code: a rigged spacesuit seen from the front, in a relaxed weightless pose.
// Local frame: the figure upright, y down, origin between the hips, 1000 units = standing height.
// Everything here is built once into path strings; Suit.tsx places it on the plate with one transform.
export type P = [number, number]

const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]]
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]]
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k]
const len = (a: P) => Math.hypot(a[0], a[1])
const unit = (a: P): P => mul(a, 1 / (len(a) || 1))
/** a quarter turn clockwise on screen (y down) */
const perp = (a: P): P => [-a[1], a[0]]
const f = (n: number) => (Math.round(n * 10) / 10).toString()
const pt = (p: P) => `${f(p[0])},${f(p[1])}`
const K = 0.5523

/** A direction measured from straight down; side -1 turns it out to the figure's right (screen left), +1 to its left. */
const dir = (deg: number, side: number): P => [side * Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)]
const at = (o: P, deg: number, l: number, side: number): P => add(o, mul(dir(deg, side), l))

/** A padded suit segment: a tapered tube with rounded ends and a slight outward puff on both sides. */
function tube(a: P, b: P, ra: number, rb: number, puff = 0.1): string {
  const d = unit(sub(b, a))
  const n = perp(d)
  const L = len(sub(b, a))
  const pr = puff * (ra + rb) * 0.5
  const A0 = add(a, mul(n, ra))
  const A1 = add(b, mul(n, rb))
  const B1 = sub(b, mul(n, rb))
  const B0 = sub(a, mul(n, ra))
  const tipB = add(b, mul(d, rb))
  const tipA = sub(a, mul(d, ra))
  return [
    `M${pt(A0)}`,
    `C${pt(add(add(A0, mul(d, L / 3)), mul(n, pr)))} ${pt(add(sub(A1, mul(d, L / 3)), mul(n, pr)))} ${pt(A1)}`,
    `C${pt(add(A1, mul(d, K * rb)))} ${pt(add(tipB, mul(n, K * rb)))} ${pt(tipB)}`,
    `C${pt(sub(tipB, mul(n, K * rb)))} ${pt(add(B1, mul(d, K * rb)))} ${pt(B1)}`,
    `C${pt(sub(sub(B1, mul(d, L / 3)), mul(n, pr)))} ${pt(sub(add(B0, mul(d, L / 3)), mul(n, pr)))} ${pt(B0)}`,
    `C${pt(sub(B0, mul(d, K * ra)))} ${pt(sub(tipA, mul(n, K * ra)))} ${pt(tipA)}`,
    `C${pt(add(tipA, mul(n, K * ra)))} ${pt(sub(A0, mul(d, K * ra)))} ${pt(A0)}Z`,
  ].join('')
}

/** A line across a tube at share t of its length, bowed a little along the tube (a ring seen from the front). */
function across(a: P, b: P, ra: number, rb: number, t: number, bow: number, over = 0): string {
  const d = unit(sub(b, a))
  const n = perp(d)
  const c = add(a, mul(sub(b, a), t))
  const r = ra + (rb - ra) * t + over
  const p0 = add(c, mul(n, r))
  const p1 = sub(c, mul(n, r))
  return `M${pt(p0)}Q${pt(add(c, mul(d, bow)))} ${pt(p1)}`
}

/** Fabric lines running along a tube at the given shares of its half-width (the layers of the suit's skin). */
function along(a: P, b: P, ra: number, rb: number, shares: number[], inset = 0.8): string {
  const d = unit(sub(b, a))
  const n = perp(d)
  let s = ''
  for (const k of shares) {
    const p0 = add(add(a, mul(d, ra * inset)), mul(n, ra * k))
    const p1 = add(sub(b, mul(d, rb * inset)), mul(n, rb * k))
    const m = add(mul(add(p0, p1), 0.5), mul(n, (ra + rb) * 0.06 * Math.sign(k)))
    s += `M${pt(p0)}Q${pt(m)} ${pt(p1)}`
  }
  return s
}

/** Maps a shape drawn in its own frame (x along `ax`, y a quarter turn clockwise from it) into the figure. */
function framed(o: P, ax: P, flip = 1) {
  const x = unit(ax)
  const y = mul(perp(x), flip)
  return (u: number, v: number): P => add(o, add(mul(x, u), mul(y, v)))
}
const ell = (c: P, rx: number, ry: number) => `M${f(c[0] - rx)},${f(c[1])}a${rx},${ry} 0 1 0 ${2 * rx},0a${rx},${ry} 0 1 0 ${-2 * rx},0Z`

// ------------------------------------------------------------------ the pose
export const HELMET: P = [0, -506]
export const HELMET_R = 128
export const NECK: P = [0, -380]

export interface Limb {
  a: P
  b: P
  c: P
  d: P
  r: [number, number, number, number]
  side: number
}
function limb(o: P, side: number, l1: number, a1: number, l2: number, a2: number, l3: number, a3: number, r: [number, number, number, number]): Limb {
  const b = at(o, a1, l1, side)
  const c = at(b, a2, l2, side)
  const d = at(c, a3, l3, side)
  return { a: o, b, c, d, r, side }
}

// arms float up and out with the elbows bent; legs hang loose, one knee drawn up a little (the body's own resting posture)
export const ARM_R = limb([-176, -284], -1, 166, 52, 150, 172, 84, 186, [46, 42, 38, 34])
export const ARM_L = limb([176, -284], 1, 160, 30, 146, 168, 84, 186, [46, 42, 38, 34])
export const LEG_R = limb([-84, 16], -1, 248, 9, 236, -3, 0, 0, [66, 58, 50, 44])
export const LEG_L = limb([84, 16], 1, 230, 17, 232, -10, 0, 0, [66, 58, 50, 44])

// ------------------------------------------------------------------ parts
/** The boot from the front: the toe comes towards us, the sole a dark band at the bottom. */
function boot(L: Limb) {
  const fr = framed(L.c, sub(L.c, L.b), 1)
  const p = (u: number, v: number) => pt(fr(u, v))
  const outline =
    `M${p(-14, -50)}C${p(10, -58)} ${p(40, -60)} ${p(62, -54)}C${p(96, -46)} ${p(112, -26)} ${p(112, 0)}` +
    `C${p(112, 26)} ${p(96, 46)} ${p(62, 54)}C${p(40, 60)} ${p(10, 58)} ${p(-14, 50)}Z`
  const detail =
    `M${p(-6, -52)}C${p(-2, -20)} ${p(-2, 20)} ${p(-6, 52)}` + // ankle ring
    `M${p(6, -55)}C${p(10, -20)} ${p(10, 20)} ${p(6, 55)}` +
    `M${p(92, -40)}C${p(102, -14)} ${p(102, 14)} ${p(92, 40)}` + // sole edge
    `M${p(60, -50)}C${p(74, -20)} ${p(74, 20)} ${p(60, 50)}` // toe cap
  return { outline, detail }
}

/** The glove: palm towards us, fingers relaxed and a little curled, the thumb on the inner side. */
function glove(L: Limb) {
  const fr = framed(L.c, sub(L.d, L.c), L.side)
  const p = (u: number, v: number) => pt(fr(u, v))
  const outline =
    `M${p(-4, -36)}C${p(22, -40)} ${p(58, -38)} ${p(80, -30)}C${p(102, -22)} ${p(114, -6)} ${p(112, 12)}` +
    `C${p(110, 28)} ${p(96, 36)} ${p(80, 32)}C${p(66, 28)} ${p(60, 22)} ${p(50, 30)}C${p(36, 40)} ${p(14, 40)} ${p(-4, 36)}Z`
  const thumb = `M${p(16, 32)}C${p(28, 56)} ${p(52, 64)} ${p(66, 54)}C${p(76, 46)} ${p(68, 36)} ${p(54, 34)}`
  const detail =
    `M${p(58, -32)}C${p(72, -18)} ${p(76, 2)} ${p(70, 20)}` +
    `M${p(86, -26)}C${p(98, -12)} ${p(100, 8)} ${p(94, 24)}` +
    `M${p(-2, -40)}L${p(-2, 40)}M${p(8, -41)}L${p(8, 41)}`
  return { outline: outline + thumb, solid: outline + `M${p(16, 32)}C${p(28, 56)} ${p(52, 64)} ${p(66, 54)}C${p(76, 46)} ${p(68, 36)} ${p(54, 34)}Z`, detail }
}

function armParts(L: Limb) {
  const [r0, r1, r2] = L.r
  const upper = tube(L.a, L.b, r0, r1, 0.12)
  const fore = tube(L.b, L.c, r1 * 0.96, r2, 0.1)
  const g = glove(L)
  const detail =
    across(L.a, L.b, r0, r1, 0.3, 6, 3) +
    across(L.a, L.b, r0, r1, 0.36, 6, 3) + // the arm bearing
    across(L.b, L.c, r1, r2, 0.16, 7) +
    across(L.b, L.c, r1, r2, 0.25, 7) +
    across(L.b, L.c, r1, r2, 0.34, 7) + // elbow convolutes
    across(L.b, L.c, r1, r2, 0.93, 4, 5) + // wrist ring
    along(L.a, L.b, r0, r1, [-0.5, 0.48]) +
    along(L.b, L.c, r1, r2, [0.52, -0.5], 0.9)
  return { solid: upper + fore + g.solid, outline: upper + fore + g.outline, detail: detail + g.detail }
}

function legParts(L: Limb) {
  const [r0, r1, r2] = L.r
  const thigh = tube(L.a, L.b, r0, r1, 0.12)
  const shin = tube(L.b, L.c, r1 * 0.96, r2, 0.1)
  const b = boot(L)
  const detail =
    across(L.a, L.b, r0, r1, 0.16, 7, 3) +
    across(L.a, L.b, r0, r1, 0.21, 7, 3) + // thigh bearing
    across(L.b, L.c, r1, r2, 0.08, 8) +
    across(L.b, L.c, r1, r2, 0.16, 8) +
    across(L.b, L.c, r1, r2, 0.24, 8) + // knee convolutes
    along(L.a, L.b, r0, r1, [-0.52, 0.5]) +
    along(L.b, L.c, r1, r2, [-0.5, 0.48], 0.9)
  return { solid: thigh + shin + b.outline, outline: thigh + shin + b.outline, detail: detail + b.detail }
}

/** Hard upper torso from the front: broad shoulders, the arm bearings, narrowing to the waist. */
const HUT =
  'M-90,-384C-132,-386 -184,-372 -204,-332C-220,-300 -214,-246 -194,-210C-176,-176 -164,-150 -156,-118' +
  'L156,-118C164,-150 176,-176 194,-210C214,-246 220,-300 204,-332C184,-372 132,-386 90,-384Z'
const HUT_DETAIL =
  ell([-176, -284], 36, 60) + ell([-176, -284], 26, 48) + ell([176, -284], 36, 60) + ell([176, -284], 26, 48) +
  'M-112,-226C-60,-212 60,-212 112,-226' + // lower edge of the chest plate
  'M0,-226V-130'
const WAIST = 'M-160,-120C-60,-108 60,-108 160,-120L160,-92C60,-80 -60,-80 -160,-92Z'
const BRIEF = 'M-156,-94L156,-94C162,-46 154,4 132,40C104,76 44,82 0,70C-44,82 -104,76 -132,40C-154,4 -162,-46 -156,-94Z'
const BRIEF_DETAIL = 'M0,-84V60M-120,-40C-80,-26 -40,-22 -6,-24M120,-40C80,-26 40,-22 6,-24'
/** The life-support pack, behind: its top and sides show past the shoulders. */
const PACK = 'M-152,-476H152Q178,-476 178,-450V-176Q178,-150 152,-150H-152Q-178,-150 -178,-176V-450Q-178,-476 -152,-476Z'
const PACK_DETAIL = 'M-178,-448H178M-140,-476V-448M140,-476V-448M-100,-476V-448M100,-476V-448'
/** The display and control unit on the chest. */
const DCM = 'M-84,-350H-14Q-2,-350 -2,-338V-250Q-2,-238 -14,-238H-84Q-96,-238 -96,-250V-338Q-96,-350 -84,-350Z'
const DCM_DETAIL = 'M-84,-338h70v34h-70Z' + ell([-66, -280], 9, 9) + ell([-34, -280], 9, 9) + 'M-84,-258h70'
/** The hose from the chest unit round to the pack. */
const HOSE = 'M-96,-300C-128,-300 -150,-318 -160,-346C-166,-362 -172,-372 -182,-378'
const NECKRING = ell(NECK, 96, 20)
const NECK_INNER = ell(NECK, 82, 13)

function arcPt(c: P, rx: number, ry: number, deg: number): P {
  const a = (deg * Math.PI) / 180
  return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry]
}
const HELMET_BUBBLE = ell(HELMET, HELMET_R, HELMET_R)
/** The visor assembly's hood over the top and sides of the bubble. */
const EVVA = (() => {
  const r = HELMET_R + 9
  const s = arcPt(HELMET, r, r, 168)
  const e = arcPt(HELMET, r, r, 12)
  return `M${pt(s)}A${r},${r} 0 0 1 ${pt(e)}C${f(HELMET[0] + 118)},${f(HELMET[1] + 70)} ${f(HELMET[0] + 96)},${f(HELMET[1] + 92)} ${f(HELMET[0] + 70)},${f(HELMET[1] + 96)}L${f(HELMET[0] - 70)},${f(HELMET[1] + 96)}C${f(HELMET[0] - 96)},${f(HELMET[1] + 92)} ${f(HELMET[0] - 118)},${f(HELMET[1] + 70)} ${pt(s)}Z`
})()
/** The gold visor, dark and glossy. */
const VISOR = (() => {
  const [x, y] = HELMET
  return `M${x - 104},${y - 10}C${x - 104},${y - 82} ${x - 60},${y - 108} ${x},${y - 108}C${x + 60},${y - 108} ${x + 104},${y - 82} ${x + 104},${y - 10}C${x + 104},${y + 52} ${x + 64},${y + 82} ${x},${y + 82}C${x - 64},${y + 82} ${x - 104},${y + 52} ${x - 104},${y - 10}Z`
})()
const VISOR_GLINT = (() => {
  const [x, y] = HELMET
  return `M${x + 30},${y + 64}C${x + 60},${y + 54} ${x + 82},${y + 30} ${x + 90},${y}`
})()
const VISOR_GLINT2 = (() => {
  const [x, y] = HELMET
  return `M${x + 92},${y - 16}L${x + 92},${y - 26}`
})()
/** Lamps on both sides of the hood. */
const LAMPS = (() => {
  const [x, y] = HELMET
  const lamp = (cx: number) => `M${cx - 18},${y - 112}h36q8,0 8,8v54q0,8 -8,8h-36q-8,0 -8,-8v-54q0,-8 8,-8Z`
  return lamp(x - 124) + lamp(x + 124)
})()
const LAMP_DETAIL = (() => {
  const [x, y] = HELMET
  const d = (cx: number) => `M${cx - 18},${y - 92}h36M${cx - 18},${y - 80}h36M${cx - 14},${y - 112}v-6h28v6`
  return d(x - 124) + d(x + 124)
})()

const armR = armParts(ARM_R)
const armL = armParts(ARM_L)
const legR = legParts(LEG_R)
const legL = legParts(LEG_L)

export interface Layer {
  id: string
  solid: string
  line: string
  detail: string
  far?: boolean
}

/** Back to front. */
export const LAYERS: Layer[] = [
  { id: 'pack', solid: PACK, line: PACK, detail: PACK_DETAIL, far: true },
  { id: 'legs', solid: legR.solid + legL.solid, line: legR.outline + legL.outline, detail: legR.detail + legL.detail },
  { id: 'torso', solid: BRIEF + HUT, line: BRIEF + HUT, detail: WAIST + HUT_DETAIL + BRIEF_DETAIL },
  { id: 'dcm', solid: DCM, line: DCM, detail: DCM_DETAIL },
  { id: 'arms', solid: armR.solid + armL.solid, line: armR.outline + armL.outline, detail: armR.detail + armL.detail },
  { id: 'helmet', solid: HELMET_BUBBLE + NECKRING, line: HELMET_BUBBLE + NECKRING, detail: NECK_INNER + LAMP_DETAIL },
]

export const HELMET_PARTS = { evva: EVVA, visor: VISOR, glint: VISOR_GLINT, glint2: VISOR_GLINT2, lamp: LAMPS, bubble: HELMET_BUBBLE }
export const HOSE_PATH = HOSE
export const JOINTS = { ARM_R, ARM_L, LEG_R, LEG_L }

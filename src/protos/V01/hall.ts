// The Hall of Six Gates: one plain three.js scene. A polished black floor ruled with light, six colossal slabs
// in a shallow arc, each a doorway holding a real specimen image, a planet's edge above, and the name standing far off.
// No post-processing: glow is additive geometry, the mirror is the gates drawn again under the floor.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Check } from './data'

const SLAB_W = 14
const SLAB_H = 30
const SLAB_D = 3
const WIN_W = 10
const WIN_H = 25
const WIN_Z = -0.9
const N = 6

interface GatePlace {
  x: number
  y: number
  z: number
}
interface Layout {
  phone: boolean
  fov: number
  cam: [number, number, number]
  look: [number, number, number]
  gates: GatePlace[]
  /** point the gates turn their faces to */
  face: [number, number]
  name: { y: number; z: number; w: number }
  arc: [number, number, number]
  figureZ: number
}

function layoutFor(aspect: number): Layout {
  if (aspect < 0.8) {
    // phone: two rows of three, the back row on a terrace many storeys up
    return {
      phone: true,
      fov: 50,
      cam: [0, 3.2, 0],
      look: [0, 3.2 + 17.6, -100],
      gates: [
        { x: -15.4, y: 0, z: -112 },
        { x: 0, y: 0, z: -112 },
        { x: 15.4, y: 0, z: -112 },
        { x: -17.4, y: 43, z: -152 },
        { x: 0, y: 43, z: -152 },
        { x: 17.4, y: 43, z: -152 },
      ],
      face: [0, 200],
      name: { y: 196, z: -320, w: 140 },
      arc: [0, -0.38, 0.9],
      figureZ: -62,
    }
  }
  const fov = aspect >= 1.6 ? 40 : Math.min(64, (2 * Math.atan(0.5824 / aspect) * 180) / Math.PI)
  return {
    phone: false,
    fov,
    cam: [0, 3.2, 0],
    look: [0, 3.2 + 14.56, -100],
    gates: [
      { x: -36.1, y: 0, z: -77 },
      { x: -24.6, y: 0, z: -90.5 },
      { x: -11.6, y: 0, z: -109 },
      { x: 11.6, y: 0, z: -109 },
      { x: 24.6, y: 0, z: -90.5 },
      { x: 36.1, y: 0, z: -77 },
    ],
    face: [0, 34],
    name: { y: 141, z: -320, w: 268 },
    arc: [0, -0.83, 1.15],
    figureZ: -72,
  }
}

// ---------------------------------------------------------------- shaders
const COMMON = /* glsl */ `
uniform vec3 uCam;
uniform float uTime;
uniform float uHaze;
uniform vec3 uArc;
uniform float uGlobal;
const vec3 WARM = vec3(0.66, 0.10, 0.36);
const vec3 MID = vec3(0.30, 0.13, 0.52);
const vec3 COOL = vec3(0.07, 0.27, 0.70);
vec3 hazeHue(vec3 d) {
  float az = clamp(d.x / max(0.08, -d.z) * 1.5, -1.0, 1.0);
  return az < 0.0 ? mix(MID, WARM, -az) : mix(MID, COOL, az);
}
vec3 hazeColor(vec3 d) {
  return (vec3(0.004, 0.005, 0.012) + hazeHue(d) * 0.30) * uGlobal;
}
float hazeF(float dist) {
  return 1.0 - exp(-dist * uHaze);
}
// the far end of the hall, lost in its own light: a wide glow and a hot core at the vanishing point
vec3 farGlow(vec3 d) {
  float az = d.x / max(0.08, -d.z);
  return step(0.0, -d.z) * vec3(0.52, 0.36, 0.95) * exp(-az * az * 9.0) * 0.34;
}
vec3 farCore(vec3 d) {
  float az = d.x / max(0.08, -d.z);
  return step(0.0, -d.z) * vec3(0.95, 0.84, 1.0) * (exp(-az * az * 160.0) * 0.30 + exp(-az * az * 30.0) * 0.10);
}
vec3 skyColor(vec3 d) {
  float el = max(d.y, 0.0);
  vec3 col = vec3(0.004, 0.005, 0.012) + hazeHue(d) * (0.27 * exp(-el * 10.0) + 0.03 * exp(-el * 3.4));
  // the planet's edge: one huge soft arc
  float fwd = step(0.0, -d.z);
  vec2 p = d.xy / max(0.08, -d.z);
  float r = length(p - uArc.xy) - uArc.z;
  float core = exp(-abs(r) * 320.0);
  float inner = exp(min(r, 0.0) * 20.0) * step(r, 0.0);
  float outer = exp(-max(r, 0.0) * 15.0) * step(0.0, r);
  float wide = exp(-max(r, 0.0) * 4.0) * step(0.0, r);
  vec3 arcCol = mix(vec3(1.0, 0.42, 0.74), vec3(0.36, 0.72, 1.0), smoothstep(-0.5, 0.5, p.x));
  arcCol = mix(arcCol, vec3(0.80, 0.66, 1.0), exp(-p.x * p.x * 14.0) * 0.7);
  float crown = 0.55 + 0.45 * exp(-p.x * p.x * 3.0);
  col *= 1.0 - 0.5 * smoothstep(0.0, -0.3, r) * fwd;
  col += fwd * crown * (mix(vec3(1.0), arcCol, 0.25) * core * 1.2 + arcCol * (inner * 0.34 + outer * 0.5 + wide * 0.03));
  col += farGlow(d) * exp(-el * 13.0) + farCore(d) * exp(-el * 48.0);
  return col * uGlobal;
}
`

const VERT_WORLD = /* glsl */ `
varying vec3 vWorld;
varying vec3 vObj;
varying vec3 vN;
varying vec2 vUv;
void main() {
  vUv = uv;
  vObj = position;
  vN = normal;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const MIRROR = /* glsl */ `
float mirrorFade(float y) {
  return y < 0.0 ? exp(y * 0.09) * 0.9 : 1.0;
}
`

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
${COMMON}
void main() {
  vec3 d = normalize(vWorld - uCam);
  vec3 col = d.y < 0.0 ? vec3(0.0) : skyColor(d);
  gl_FragColor = vec4(col, 1.0);
}
`

const FLOOR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform vec4 uGate[6];
uniform vec3 uGateCol[6];
uniform float uGateI[6];
uniform float uCell;
${COMMON}
vec2 gridLines(vec2 g) {
  vec2 fw = fwidth(g);
  vec2 gd = abs(fract(g - 0.5) - 0.5);
  vec2 ln = 1.0 - smoothstep(vec2(0.0), fw * 1.3, gd);
  return ln * (1.0 - smoothstep(0.1, 0.4, fw));
}
void main() {
  vec3 V = vWorld - uCam;
  float dist = length(V);
  vec3 dir = V / dist;
  // the light each doorway throws on the floor
  vec3 spill = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec2 rel = vWorld.xz - uGate[i].xy;
    vec2 n = uGate[i].zw;
    float v = dot(rel, n);
    float u = dot(rel, vec2(n.y, -n.x));
    float vv = max(v, 0.0);
    float w = 5.0 + vv * 0.12;
    float soft = 0.5 + vv * 0.2;
    float m = 1.0 - smoothstep(w - soft * 0.4, w + soft, abs(u));
    float fall = exp(-vv / 26.0) * smoothstep(-1.4, 0.4, v);
    float wide = exp(-(u * u) / (140.0 + vv * vv * 0.5)) * exp(-vv / 46.0) * smoothstep(-8.0, 3.0, v) * 0.13;
    spill += uGateCol[i] * uGateI[i] * (m * fall + wide);
  }
  vec2 g = vWorld.xz / uCell;
  vec2 l1 = gridLines(g);
  vec2 l4 = gridLines(g / 4.0);
  // lines that run into the hall carry the grid; the cross rules stay quiet
  float fine = l1.x * 0.30 + l1.y * 0.07;
  float major = l4.x * 0.62 + l4.y * 0.26;
  vec3 col = vec3(0.002, 0.003, 0.007);
  col += spill * 0.34;
  vec3 lineCol = vec3(0.42, 0.50, 0.86) * 0.30 + spill * 1.25;
  col += lineCol * (fine + major) * exp(-dist * 0.005);
  // polished: mirror of the sky here, the mirrored gates come through the blend
  float cosT = clamp(-dir.y, 0.0, 1.0);
  float F = pow(1.0 - cosT, 4.0);
  float R = mix(0.34, 0.9, F);
  col += skyColor(vec3(dir.x, -dir.y, dir.z)) * R * 0.9;
  float f = hazeF(dist);
  // the floor runs on into the same light the sky holds at the horizon, so the hall has no back wall
  col = mix(col * uGlobal, hazeColor(dir) + (farGlow(dir) + farCore(dir)) * uGlobal, f);
  gl_FragColor = vec4(col, R * (1.0 - f));
}
`

const WINDOW_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec4 uCrop;
uniform vec3 uCol;
uniform float uGain;
uniform float uTint;
uniform float uInvert;
uniform float uBoost;
uniform float uOn;
${COMMON}
${MIRROR}
void main() {
  vec3 c = texture2D(uMap, uCrop.xy + vUv * uCrop.zw).rgb;
  if (uInvert > 0.5) {
    c = 1.0 - c;
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    c = (mx + mn) - c;
  }
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 graded = uCol * pow(l, 0.9) * 1.35 + vec3(pow(l, 2.2)) * 0.7;
  c = mix(c, graded, uTint) * uBoost;
  float edge = min(min(vUv.x, 1.0 - vUv.x) * ${WIN_W.toFixed(1)}, min(vUv.y, 1.0 - vUv.y) * ${WIN_H.toFixed(1)});
  float rim = exp(-edge * 1.9);
  c = c * (0.62 + 0.5 * uGain) + uCol * (0.045 + rim * 0.42) * uGain;
  // a soft shoulder, so a bright specimen keeps its detail when its gate is lit up
  vec3 over = max(c - 0.78, 0.0);
  c = min(c, 0.78) + over / (1.0 + over * 2.4);
  c *= uOn;
  vec3 V = vWorld - uCam;
  float dist = length(V);
  c = mix(c, hazeColor(V / dist), hazeF(dist) * 0.45);
  gl_FragColor = vec4(c * mirrorFade(vWorld.y), 1.0);
}
`

const FRAME_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vObj;
varying vec3 vN;
uniform vec3 uCol;
uniform float uGain;
uniform float uOn;
${COMMON}
${MIRROR}
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
void main() {
  vec3 p = vObj;
  vec3 n = vN;
  vec3 col = vec3(0.013, 0.015, 0.024);
  float lit = uGain * uOn;
  // cladding seams, one every storey
  float sy = abs(fract(p.y / 2.5) - 0.5);
  float seam = 1.0 - smoothstep(0.0, fwidth(p.y / 2.5) * 1.5, 0.5 - sy);
  float d = sdBox(p.xy - vec2(0.0, ${(WIN_H / 2).toFixed(2)}), vec2(${(WIN_W / 2).toFixed(2)}, ${(WIN_H / 2).toFixed(2)}));
  float fd = fwidth(d);
  float eo = min(${(SLAB_W / 2).toFixed(1)} - abs(p.x), ${SLAB_H.toFixed(1)} - p.y);
  float feo = fwidth(eo);
  if (n.z > 0.5) {
    float strip = 1.0 - smoothstep(0.05, 0.11 + fd * 1.5, d);
    float glow = exp(-d * 1.25) * 0.30 + exp(-d * 0.35) * 0.07;
    col += uCol * lit * (glow + strip * 1.1);
    col += vec3(1.0) * strip * lit * 0.25;
    col += uCol * lit * seam * 0.10 * exp(-d * 0.4);
    col += vec3(0.10, 0.12, 0.2) * seam * 0.16;
    col *= 0.82 + 0.18 * smoothstep(${SLAB_H.toFixed(1)}, 0.0, p.y);
    col += vec3(0.5, 0.58, 0.9) * (1.0 - smoothstep(0.0, feo * 1.6, eo)) * 0.16;
  } else if ((abs(n.x) > 0.5 && abs(p.x) < ${(WIN_W / 2 + 0.02).toFixed(2)}) || (n.y < -0.5 && p.y < ${(WIN_H + 0.02).toFixed(2)} && p.y > 1.0)) {
    // the reveal: lit by the window it holds
    float depth = clamp((p.z - (${WIN_Z.toFixed(2)})) / ${(SLAB_D / 2 - WIN_Z).toFixed(2)}, 0.0, 1.0);
    col += uCol * lit * mix(0.95, 0.30, depth);
    col += vec3(1.0) * lit * 0.20 * (1.0 - depth);
  } else {
    col += vec3(0.08, 0.09, 0.16) * 0.25 + vec3(0.10, 0.12, 0.2) * seam * 0.10;
  }
  vec3 V = vWorld - uCam;
  float dist = length(V);
  col = mix(col * uGlobal, hazeColor(V / dist), hazeF(dist));
  gl_FragColor = vec4(col * mirrorFade(vWorld.y), 1.0);
}
`

const HALO_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
uniform vec3 uCol;
uniform float uGain;
uniform float uOn;
${MIRROR}
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
void main() {
  float d = sdBox(vObj.xy, vec2(${(WIN_W / 2).toFixed(2)}, ${(WIN_H / 2).toFixed(2)}));
  float dd = max(d, 0.0);
  float g = exp(-dd * 0.6) * 0.34 + exp(-dd * 0.17) * 0.09;
  g *= d > 0.0 ? 1.0 : 0.22;
  vec2 q = abs(vUv - 0.5) * 2.0;
  g *= (1.0 - smoothstep(0.6, 1.0, q.x)) * (1.0 - smoothstep(0.6, 1.0, q.y));
  gl_FragColor = vec4(uCol * g * uGain * uGain * uOn * mirrorFade(vWorld.y), 1.0);
}
`

const SHAFT_VERT = /* glsl */ `
attribute float aK;
varying vec2 vUv;
varying float vK;
void main() {
  vUv = uv;
  vK = aK;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const SHAFT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying float vK;
uniform vec3 uCol;
uniform float uGain;
uniform float uOn;
uniform float uTime;
void main() {
  float qx = abs(vUv.x - 0.5) * 2.0;
  float mx = 1.0 - smoothstep(0.3, 1.0, qx);
  float my = (1.0 - smoothstep(0.45, 1.0, vUv.y)) * (0.55 + 0.45 * (1.0 - vUv.y));
  float n = 0.72 + 0.28 * sin(vUv.x * 11.0 + uTime * 0.23 + vK * 7.0) * sin(vUv.y * 6.0 - uTime * 0.17 + vK * 3.0);
  float a = mx * my * n * (1.0 - vK * 0.72) * 0.13;
  gl_FragColor = vec4(uCol * a * uGain * uGain * uOn, 1.0);
}
`

const MOTE_VERT = /* glsl */ `
attribute float aSeed;
attribute float aBase;
attribute vec3 aCol;
uniform float uTime;
uniform float uPx;
varying vec3 vCol;
varying float vA;
void main() {
  vec3 p = position;
  float t = uTime * (0.22 + aSeed * 0.3);
  float y = mod(p.y + t * 0.8, 27.0);
  p.y = y + 0.4 + aBase;
  p.x += sin(t * 0.7 + aSeed * 40.0) * 1.6;
  p.z += cos(t * 0.5 + aSeed * 17.0) * 1.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = 0.07 + 0.17 * fract(aSeed * 7.13);
  gl_PointSize = max(1.2, s * uPx / -mv.z);
  vCol = aCol;
  vA = (0.3 + 0.7 * fract(aSeed * 3.7)) * smoothstep(0.0, 4.0, y) * (1.0 - smoothstep(19.0, 27.0, y));
}
`
const MOTE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vCol;
varying float vA;
uniform float uOnAll;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, d));
  gl_FragColor = vec4((vCol * 0.8 + 0.2) * a * a * vA * uOnAll * 1.25, 1.0);
}
`

const NAME_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uOn;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  // feet of the letters sink into the haze
  float fade = 0.62 + 0.38 * smoothstep(0.2, 0.75, vUv.y);
  gl_FragColor = vec4(c * fade * uOn, 1.0);
}
`

const FIGURE_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNv;
varying vec3 vVv;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vNv = normalize(normalMatrix * normal);
  vVv = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`
const FIGURE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNv;
varying vec3 vVv;
${COMMON}
${MIRROR}
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNv), normalize(vVv))), 2.2);
  vec3 col = vec3(0.012, 0.014, 0.022) + vec3(0.85, 0.9, 1.0) * rim * 0.75;
  gl_FragColor = vec4(col * uGlobal * mirrorFade(vWorld.y * 6.0), 1.0);
}
`

// ---------------------------------------------------------------- helpers
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

function nameTexture(): THREE.CanvasTexture {
  const W = 2048
  const H = 352
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const word = 'SUPERHUMANS'
  const family = '"Big Shoulders Variable", "Arial Narrow", Impact, sans-serif'
  const track = 0.075
  let fs = 300
  const widthAt = (size: number) => {
    ctx.font = `800 ${size}px ${family}`
    let w = 0
    for (const ch of word) w += ctx.measureText(ch).width
    return w + track * size * (word.length - 1)
  }
  fs = (fs * (W - 120)) / widthAt(fs)
  fs = Math.min(fs, 330)
  const total = widthAt(fs)
  ctx.font = `800 ${fs}px ${family}`
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText('H')
  const cap = m.actualBoundingBoxAscent
  const base = H / 2 + cap / 2
  const draw = () => {
    let x = (W - total) / 2
    for (const ch of word) {
      ctx.fillText(ch, x, base)
      x += ctx.measureText(ch).width + track * fs
    }
  }
  ctx.shadowColor = 'rgba(140, 165, 255, 0.8)'
  ctx.shadowBlur = 60
  ctx.fillStyle = 'rgba(190, 205, 255, 0.4)'
  draw()
  ctx.shadowBlur = 7
  ctx.shadowColor = 'rgba(255, 255, 255, 0.55)'
  const grad = ctx.createLinearGradient(0, base - cap, 0, base)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(1, '#cfd8ff')
  ctx.fillStyle = grad
  draw()
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 4
  return tex
}

function frameGeometry(): THREE.BufferGeometry {
  const side = (SLAB_W - WIN_W) / 2
  const left = new THREE.BoxGeometry(side, SLAB_H, SLAB_D).translate(-(WIN_W + side) / 2, SLAB_H / 2, 0)
  const right = new THREE.BoxGeometry(side, SLAB_H, SLAB_D).translate((WIN_W + side) / 2, SLAB_H / 2, 0)
  const top = new THREE.BoxGeometry(WIN_W, SLAB_H - WIN_H, SLAB_D).translate(0, (SLAB_H + WIN_H) / 2, 0)
  const g = mergeGeometries([left, right, top])
  left.dispose()
  right.dispose()
  top.dispose()
  return g
}

function shaftGeometry(): THREE.BufferGeometry {
  const zs = [2.2, 5, 9, 14.5, 21]
  const pos: number[] = []
  const uv: number[] = []
  const k: number[] = []
  const idx: number[] = []
  zs.forEach((z, i) => {
    const kk = i / (zs.length - 1)
    const w = (WIN_W + z * 0.75) / 2
    const h = WIN_H + z * 0.25
    const o = i * 4
    pos.push(-w, 0, z, w, 0, z, w, h, z, -w, h, z)
    uv.push(0, 0, 1, 0, 1, 1, 0, 1)
    k.push(kk, kk, kk, kk)
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aK', new THREE.Float32BufferAttribute(k, 1))
  g.setIndex(idx)
  return g
}

function figureGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const add = (g: THREE.BufferGeometry, x: number, y: number, z: number, rz = 0) => {
    if (rz) g.rotateZ(rz)
    g.translate(x, y, z)
    parts.push(g)
  }
  add(new THREE.CapsuleGeometry(0.1, 0.7, 3, 10), -0.12, 0.46, 0, -0.03)
  add(new THREE.CapsuleGeometry(0.1, 0.7, 3, 10), 0.12, 0.46, 0, 0.03)
  add(new THREE.BoxGeometry(0.19, 0.1, 0.32), -0.13, 0.05, -0.04)
  add(new THREE.BoxGeometry(0.19, 0.1, 0.32), 0.13, 0.05, -0.04)
  add(new THREE.CapsuleGeometry(0.2, 0.34, 3, 12), 0, 1.2, 0)
  add(new THREE.BoxGeometry(0.5, 0.15, 0.25), 0, 1.45, 0)
  add(new THREE.BoxGeometry(0.36, 0.5, 0.17), 0, 1.25, 0.21)
  add(new THREE.CapsuleGeometry(0.075, 0.54, 3, 8), -0.31, 1.1, 0, -0.07)
  add(new THREE.CapsuleGeometry(0.075, 0.54, 3, 8), 0.31, 1.1, 0, 0.07)
  add(new THREE.SphereGeometry(0.22, 16, 12), 0, 1.76, 0)
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))
  parts.forEach((p) => p.dispose())
  return merged
}

// ---------------------------------------------------------------- the hall
export interface HallOptions {
  /** the scene makes its own canvas inside this element and removes it again */
  container: HTMLElement
  checks: Check[]
  reduced: boolean
  /** start close to this gate and pull back to the hall */
  from?: number
  /** six rectangles on screen, [x, y, w, h] each, in CSS pixels */
  onRects: (rects: Float32Array) => void
  onReady: () => void
  onLost: () => void
}

interface Gate {
  group: THREE.Group
  mirror: THREE.Group
  uniforms: { uGain: { value: number }; uOn: { value: number }; uCol: { value: THREE.Color } }
  gain: number
  normal: THREE.Vector2
}

export class Hall {
  private renderer: THREE.WebGLRenderer
  private canvas: HTMLCanvasElement
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(40, 1.6, 0.5, 4000)
  private shared: Record<string, { value: unknown }>
  private floorU: { uGate: { value: THREE.Vector4[] }; uGateCol: { value: THREE.Color[] }; uGateI: { value: number[] } }
  private gates: Gate[] = []
  private disposables: { dispose: () => void }[] = []
  private sky: THREE.Mesh
  private nameMesh: THREE.Mesh
  private nameU = { uMap: { value: null as THREE.Texture | null }, uOn: { value: 0 } }
  private figure: THREE.Group
  private terrace: THREE.Group
  private motes: THREE.Points
  private moteU = { uTime: { value: 0 }, uPx: { value: 1000 }, uOnAll: { value: 0 } }
  private moteLocal: Float32Array
  private layout: Layout
  private rects = new Float32Array(N * 4)
  private raf = 0
  private running = false
  private disposed = false
  private t0 = performance.now()
  private last = performance.now()
  private frames = 0
  private ready = false
  private texLeft = 0
  private focus: number | null = null
  private pointer = new THREE.Vector2()
  private drift = new THREE.Vector2()
  private fly: { i: number; start: number; dur: number; from: number; to: number; onProgress?: (t: number) => void; onDone?: () => void } | null = null
  private flyT = 0
  private flyGate = 0
  private introStart: number
  private opts: HallOptions
  private tmp = new THREE.Vector3()
  private tmpA = new THREE.Vector3()
  private tmpB = new THREE.Vector3()
  private w = 1
  private h = 1

  constructor(opts: HallOptions) {
    this.opts = opts
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    this.canvas = canvas
    opts.container.appendChild(canvas)
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    } catch (err) {
      canvas.remove()
      throw err
    }
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.layout = layoutFor(1.6)
    this.introStart = opts.reduced || opts.from !== undefined ? -1e9 : performance.now()

    this.shared = {
      uCam: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uHaze: { value: 0.0030 },
      uArc: { value: new THREE.Vector3(0, -0.8, 1.15) },
      uGlobal: { value: 0 },
    }

    // sky
    const skyGeo = new THREE.SphereGeometry(1800, 32, 16)
    const skyMat = new THREE.ShaderMaterial({ vertexShader: VERT_WORLD, fragmentShader: SKY_FRAG, uniforms: { ...this.shared }, side: THREE.BackSide, depthTest: false, depthWrite: false })
    this.sky = new THREE.Mesh(skyGeo, skyMat)
    this.sky.renderOrder = -20
    this.sky.frustumCulled = false
    this.scene.add(this.sky)
    this.disposables.push(skyGeo, skyMat)

    // floor
    this.floorU = {
      uGate: { value: Array.from({ length: N }, () => new THREE.Vector4()) },
      uGateCol: { value: opts.checks.map((c) => new THREE.Color(c.hue)) },
      uGateI: { value: new Array<number>(N).fill(0) },
    }
    const floorGeo = new THREE.PlaneGeometry(3600, 3600).rotateX(-Math.PI / 2)
    const floorMat = new THREE.ShaderMaterial({
      vertexShader: VERT_WORLD,
      fragmentShader: FLOOR_FRAG,
      uniforms: { ...this.shared, ...this.floorU, uCell: { value: 7 } },
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.SrcAlphaFactor,
      depthWrite: true,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.z = -1200
    floor.renderOrder = -5
    this.scene.add(floor)
    this.disposables.push(floorGeo, floorMat)

    // gates
    const frameGeo = frameGeometry()
    const winGeo = new THREE.PlaneGeometry(WIN_W, WIN_H).translate(0, WIN_H / 2, WIN_Z)
    const haloGeo = new THREE.PlaneGeometry(SLAB_W * 3.4, SLAB_H * 2.1)
    const shaftGeo = shaftGeometry()
    this.disposables.push(frameGeo, winGeo, haloGeo, shaftGeo)
    const loader = new THREE.TextureLoader()
    const winAspect = WIN_W / WIN_H
    this.texLeft = opts.checks.length
    opts.checks.forEach((c) => {
      const col = new THREE.Color(c.hue)
      const uniforms = { uGain: { value: 1 }, uOn: { value: 0 }, uCol: { value: col } }
      const tex = loader.load(
        c.img,
        () => {
          this.texLeft--
        },
        undefined,
        () => {
          this.texLeft--
        },
      )
      tex.colorSpace = THREE.NoColorSpace
      tex.anisotropy = 4
      this.disposables.push(tex)
      const zoom = c.zoom ?? 1
      const sx = Math.min(1, winAspect / c.aspect) / zoom
      const sy = Math.min(1, c.aspect / winAspect) / zoom
      const ox = Math.min(1 - sx, Math.max(0, c.at[0] - sx / 2))
      const oy = Math.min(1 - sy, Math.max(0, 1 - c.at[1] - sy / 2))
      const winMat = new THREE.ShaderMaterial({
        vertexShader: VERT_WORLD,
        fragmentShader: WINDOW_FRAG,
        uniforms: { ...this.shared, ...uniforms, uMap: { value: tex }, uCrop: { value: new THREE.Vector4(ox, oy, sx, sy) }, uTint: { value: c.tint }, uInvert: { value: c.invert ? 1 : 0 }, uBoost: { value: c.boost ?? 1 } },
        side: THREE.DoubleSide,
      })
      const frameMat = new THREE.ShaderMaterial({ vertexShader: VERT_WORLD, fragmentShader: FRAME_FRAG, uniforms: { ...this.shared, ...uniforms }, side: THREE.DoubleSide })
      const haloMat = new THREE.ShaderMaterial({ vertexShader: VERT_WORLD, fragmentShader: HALO_FRAG, uniforms: { ...uniforms }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      const shaftMat = new THREE.ShaderMaterial({ vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG, uniforms: { ...uniforms, uTime: this.shared.uTime }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      this.disposables.push(winMat, frameMat, haloMat, shaftMat)

      const build = (mirror: boolean) => {
        const g = new THREE.Group()
        const frame = new THREE.Mesh(frameGeo, frameMat)
        const win = new THREE.Mesh(winGeo, winMat)
        const halo = new THREE.Mesh(haloGeo, haloMat)
        halo.position.set(0, WIN_H / 2, SLAB_D / 2 + 0.25)
        halo.renderOrder = mirror ? -8 : 2
        g.add(frame, win, halo)
        if (!mirror) {
          const shaft = new THREE.Mesh(shaftGeo, shaftMat)
          shaft.renderOrder = 3
          g.add(shaft)
        } else g.scale.y = -1
        this.scene.add(g)
        return g
      }
      this.gates.push({ group: build(false), mirror: build(true), uniforms, gain: 1, normal: new THREE.Vector2(0, 1) })
    })

    // the name, standing far off
    const nameGeo = new THREE.PlaneGeometry(1, 1)
    const nameMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: NAME_FRAG,
      uniforms: this.nameU,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.nameMesh = new THREE.Mesh(nameGeo, nameMat)
    this.nameMesh.renderOrder = -4
    this.nameMesh.visible = false
    this.scene.add(this.nameMesh)
    this.disposables.push(nameGeo, nameMat)
    const drawName = () => {
      if (this.disposed) return
      this.nameU.uMap.value?.dispose()
      this.nameU.uMap.value = nameTexture()
      this.nameMesh.visible = true
    }
    const fonts = document.fonts
    if (fonts?.load) fonts.load('800 120px "Big Shoulders Variable"', 'SUPERHUMANS').then(drawName, drawName)
    else drawName()

    // one small figure, for scale
    const figGeo = figureGeometry()
    const figMat = new THREE.ShaderMaterial({ vertexShader: FIGURE_VERT, fragmentShader: FIGURE_FRAG, uniforms: { ...this.shared }, side: THREE.DoubleSide })
    this.figure = new THREE.Group()
    const fig = new THREE.Mesh(figGeo, figMat)
    const figMirror = new THREE.Mesh(figGeo, figMat)
    figMirror.scale.y = -1
    this.figure.add(fig, figMirror)
    this.scene.add(this.figure)
    this.disposables.push(figGeo, figMat)

    // the terrace the back row stands on (phone layout only)
    this.terrace = new THREE.Group()
    const terGeo = new THREE.BoxGeometry(400, 43, 60).translate(0, 21.5, -30)
    const terMat = new THREE.ShaderMaterial({
      vertexShader: VERT_WORLD,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorld; varying vec3 vObj; varying vec3 vN;
        ${COMMON}
        ${MIRROR}
        void main(){
          vec3 col = vec3(0.012, 0.014, 0.024);
          float sy = abs(fract(vObj.y / 2.5) - 0.5);
          float seam = 1.0 - smoothstep(0.0, fwidth(vObj.y / 2.5) * 1.5, 0.5 - sy);
          col += vec3(0.10, 0.12, 0.2) * seam * 0.16;
          float lip = 1.0 - smoothstep(0.0, 0.5, 43.0 - vObj.y);
          col += vec3(0.6, 0.66, 1.0) * lip * 0.5 * step(0.5, vN.z);
          vec3 V = vWorld - uCam; float dist = length(V);
          col = mix(col * uGlobal, hazeColor(V / dist), hazeF(dist));
          gl_FragColor = vec4(col * mirrorFade(vWorld.y), 1.0);
        }`,
      uniforms: { ...this.shared },
      side: THREE.DoubleSide,
    })
    const ter = new THREE.Mesh(terGeo, terMat)
    const terMirror = new THREE.Mesh(terGeo, terMat)
    terMirror.scale.y = -1
    this.terrace.add(ter, terMirror)
    this.terrace.visible = false
    this.scene.add(this.terrace)
    this.disposables.push(terGeo, terMat)

    // motes drifting through the light
    const perGate = 70
    const count = perGate * N
    this.moteLocal = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const mcol = new Float32Array(count * 3)
    let s = 7
    const rnd = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    for (let i = 0; i < count; i++) {
      const gi = Math.floor(i / perGate)
      const v = 1.5 + rnd() * rnd() * 30
      this.moteLocal[i * 3] = (rnd() - 0.5) * (WIN_W + v * 0.5)
      this.moteLocal[i * 3 + 1] = rnd() * 27
      this.moteLocal[i * 3 + 2] = v
      seed[i] = rnd()
      const c = this.floorU.uGateCol.value[gi]
      mcol[i * 3] = c.r
      mcol[i * 3 + 1] = c.g
      mcol[i * 3 + 2] = c.b
    }
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    moteGeo.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(count), 1))
    moteGeo.setAttribute('aCol', new THREE.BufferAttribute(mcol, 3))
    const moteMat = new THREE.ShaderMaterial({ vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, uniforms: this.moteU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    this.motes = new THREE.Points(moteGeo, moteMat)
    this.motes.frustumCulled = false
    this.motes.renderOrder = 4
    this.scene.add(this.motes)
    this.disposables.push(moteGeo, moteMat)

    canvas.addEventListener('webglcontextlost', this.onContextLost)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
    if (opts.from !== undefined) {
      this.flyGate = opts.from
      this.flyT = 0.74
      this.fly = { i: opts.from, start: performance.now(), dur: 1350, from: 0.74, to: 0 }
    }
    this.start()
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    this.stop()
    this.opts.onLost()
  }
  private onVisibility = () => {
    if (document.hidden) this.stop()
    else this.start()
  }

  private start() {
    if (this.running || this.disposed) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }
  private stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  resize() {
    const w = Math.max(1, this.opts.container.clientWidth)
    const h = Math.max(1, this.opts.container.clientHeight)
    this.w = w
    this.h = h
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    this.layout = layoutFor(aspect)
    const L = this.layout
    this.camera.aspect = aspect
    this.camera.fov = L.fov
    this.camera.updateProjectionMatrix()
    this.moteU.uPx.value = (h * this.renderer.getPixelRatio()) / (2 * Math.tan((L.fov * Math.PI) / 360))
    ;(this.shared.uArc.value as THREE.Vector3).set(L.arc[0], L.arc[1], L.arc[2])
    const pos = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute
    const baseY = this.motes.geometry.getAttribute('aBase') as THREE.BufferAttribute
    const perGate = pos.count / N
    this.gates.forEach((g, i) => {
      const p = L.gates[i]
      const nx = L.face[0] - p.x
      const nz = L.face[1] - p.z
      const len = Math.hypot(nx, nz)
      g.normal.set(nx / len, nz / len)
      const yaw = Math.atan2(nx, nz)
      g.group.position.set(p.x, p.y, p.z)
      g.group.rotation.y = yaw
      g.group.updateMatrixWorld(true)
      g.mirror.position.set(p.x, 0, p.z)
      g.mirror.rotation.y = yaw
      g.mirror.visible = p.y === 0
      // on the terrace the doorway's light falls on the terrace top, not on the hall floor
      this.floorU.uGate.value[i].set(p.x + (nx / len) * (SLAB_D / 2), p.z + (nz / len) * (SLAB_D / 2), nx / len, nz / len)
      for (let k = i * perGate; k < (i + 1) * perGate; k++) {
        this.tmp.set(this.moteLocal[k * 3], 0, this.moteLocal[k * 3 + 2]).applyMatrix4(g.group.matrixWorld)
        pos.setXYZ(k, this.tmp.x, this.moteLocal[k * 3 + 1], this.tmp.z)
        baseY.setX(k, p.y)
      }
    })
    pos.needsUpdate = true
    baseY.needsUpdate = true
    this.nameMesh.position.set(0, L.name.y, L.name.z)
    this.nameMesh.scale.set(L.name.w, (L.name.w * 352) / 2048, 1)
    this.figure.position.set(0, 0, L.figureZ)
    this.terrace.visible = L.phone
    this.terrace.position.set(0, 0, -139)
  }

  setFocus(i: number | null) {
    this.focus = i
  }
  /** pointer in -1..1 on both axes */
  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  /** dev check only: hold the camera at point t (0..1) of the glide into gate i */
  pose(i: number, t: number) {
    this.fly = null
    this.flyGate = i
    this.focus = i
    this.flyT = t
  }

  /** glide down the hall and through gate i; onProgress gets 0..1 */
  flyTo(i: number, onProgress: (t: number) => void, onDone: () => void) {
    if (this.fly && this.fly.to === 1) return
    this.flyGate = i
    this.focus = i
    this.fly = { i, start: performance.now(), dur: 1150, from: this.flyT, to: 1, onProgress, onDone }
  }

  private tick = () => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)
    // one clock for the frame and for the press, so the glide always starts where it was asked to
    const now = performance.now()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const time = (now - this.t0) / 1000
    const L = this.layout
    const reduced = this.opts.reduced
    this.shared.uTime.value = reduced ? 0 : time
    this.moteU.uTime.value = reduced ? 3 : time

    // entrance: the hall comes on, gates from the centre outward
    const it = (now - this.introStart) / 1000
    this.shared.uGlobal.value = clamp01(it / 0.9)
    this.nameU.uOn.value = easeOut(clamp01((it - 0.7) / 1.1))
    this.moteU.uOnAll.value = clamp01((it - 0.8) / 1.2)

    // press move
    let done: (() => void) | undefined
    if (this.fly) {
      const f = this.fly
      const k = clamp01((now - f.start) / f.dur)
      this.flyT = f.from + (f.to - f.from) * (f.to === 1 ? k : easeOut(k))
      f.onProgress?.(this.flyT)
      if (k >= 1) {
        done = f.onDone
        this.fly = null
      }
    }

    // gate light
    const anyFocus = this.focus !== null
    const lerp = 1 - Math.exp(-dt * 7)
    this.gates.forEach((g, i) => {
      const order = L.phone ? (i % 3 === 1 ? 0 : 1) + (i > 2 ? 1 : 0) : Math.abs(i - 2.5) - 0.5
      const on = clamp01((it - 0.25 - order * 0.22) / 0.55)
      // a short stutter as each doorway catches
      const flick = on > 0 && on < 1 ? 0.75 + 0.25 * Math.sin(on * 28) : 1
      g.uniforms.uOn.value = easeOut(on) * flick
      const target = anyFocus ? (this.focus === i ? 1.55 : 0.62) : 1
      g.gain += (target - g.gain) * lerp
      const breathe = reduced ? 1 : 1 + 0.035 * Math.sin(time * 0.9 + i * 1.7)
      g.uniforms.uGain.value = g.gain * breathe
      this.floorU.uGateI.value[i] = g.uniforms.uOn.value * Math.pow(g.gain, 1.8) * breathe * (L.gates[i].y === 0 ? 1 : 0)
    })

    // camera: rest pose, a slow drift, one gentle parallax, and the glide
    this.drift.x += (this.pointer.x - this.drift.x) * (1 - Math.exp(-dt * 2.6))
    this.drift.y += (this.pointer.y - this.drift.y) * (1 - Math.exp(-dt * 2.6))
    const sway = reduced ? 0 : Math.sin(time * 0.17) * 0.5
    const back = reduced ? 0 : (1 - easeOut(clamp01(it / 2.2))) * 16
    const A = this.tmpA.set(L.cam[0] + this.drift.x * 2.6 + sway, L.cam[1] - this.drift.y * 0.45 - back * 0.05, L.cam[2] + back)
    const B = this.tmpB.set(L.look[0] + this.drift.x * 1.1, L.look[1] - this.drift.y * 0.9, L.look[2])
    if (this.flyT > 0) {
      const g = this.gates[this.flyGate]
      const p = L.gates[this.flyGate]
      const e = easeInOut(this.flyT)
      const e2 = easeOut(clamp01(this.flyT * 1.5))
      const endX = p.x + g.normal.x * (SLAB_D / 2 + 1.2)
      const endZ = p.z + g.normal.y * (SLAB_D / 2 + 1.2)
      A.set(A.x + (endX - A.x) * e, A.y + (p.y + 10.5 - A.y) * e, A.z + (endZ - A.z) * e)
      B.set(B.x + (p.x - g.normal.x * 20 - B.x) * e2, B.y + (p.y + 11 - B.y) * e2, B.z + (p.z - g.normal.y * 20 - B.z) * e2)
    }
    this.camera.position.copy(A)
    this.camera.lookAt(B)
    this.camera.updateMatrixWorld()
    ;(this.shared.uCam.value as THREE.Vector3).copy(A)
    this.sky.position.copy(A)

    this.renderer.render(this.scene, this.camera)
    this.project()

    this.frames++
    if (!this.ready && this.texLeft <= 0 && this.nameMesh.visible && this.frames > 3 && it > 2.3 && !this.fly) {
      this.ready = true
      this.opts.onReady()
    }
    done?.()
  }

  private project() {
    const r = this.rects
    for (let i = 0; i < N; i++) {
      const m = this.gates[i].group.matrixWorld
      let x0 = 1e9
      let y0 = 1e9
      let x1 = -1e9
      let y1 = -1e9
      let behind = false
      for (let c = 0; c < 4; c++) {
        this.tmp.set(c & 1 ? SLAB_W / 2 : -SLAB_W / 2, c & 2 ? SLAB_H : 0, SLAB_D / 2).applyMatrix4(m).project(this.camera)
        if (this.tmp.z > 1) behind = true
        const x = (this.tmp.x * 0.5 + 0.5) * this.w
        const y = (-this.tmp.y * 0.5 + 0.5) * this.h
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
      if (behind) {
        r[i * 4] = -9999
        r[i * 4 + 1] = -9999
        r[i * 4 + 2] = 0
        r[i * 4 + 3] = 0
      } else {
        r[i * 4] = x0
        r[i * 4 + 1] = y0
        r[i * 4 + 2] = x1 - x0
        r[i * 4 + 3] = y1 - y0
      }
    }
    this.opts.onRects(r)
  }

  dispose() {
    this.disposed = true
    this.stop()
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.nameU.uMap.value?.dispose()
    this.disposables.forEach((d) => d.dispose())
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }
}

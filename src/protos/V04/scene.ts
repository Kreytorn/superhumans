// V04 "Prism Ring": the ring-world, drawn live with three.js. One instanced mesh of faceted glass crystals round a
// wide band, six chambers that show the real specimen images, a small fierce star, and the camera that flies the band.
import * as THREE from 'three'
import { CHECKS } from './data'

export interface RingCtl {
  /** the six DOM buttons that track the chambers on screen */
  buttons: (HTMLElement | null)[]
  /** the outline drawn round each chamber on hover and focus */
  outlines: (SVGPolygonElement | null)[]
  pointer: [number, number]
  /** the sheet of chamber light that covers the screen at the end of a flight */
  flash: HTMLElement | null
  /** the camera is at the chamber's window (the last quarter second of the flight): time to open the page under the light */
  onNear(i: number): void
  onArrive(i: number): void
  /** the camera is back at the wide view after leaving a chamber */
  onHome(): void
  onReady(): void
  onFail(): void
}

export interface RingOptions {
  tall: boolean
  reduced: boolean
  /** camera override for tuning: px,py,pz,tx,ty,tz,roll,fov */
  cam?: string | null
  /** chamber places override for tuning: six angles in degrees */
  at?: string | null
  /** start inside this chamber (a check's page was opened directly) */
  startAt: number | null
  /** for pictures of the flight: stop it at this share of the way (0 to 1) */
  hold?: number | null
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The ring. Axis = world Y. The band is a shallow cone, so its inner face leans toward the camera's side.
const R = 160
const W = 30
const BETA = 0.3
const CW = 40 // chamber window, along the ring
const CH = 25 // and across it
const TAU = Math.PI * 2
const SB = Math.sin(BETA)
const CB = Math.cos(BETA)

/** Point on the band: angle th round the ring, s across the band, e above its inner face. */
function band(th: number, s: number, e: number, out: THREE.Vector3): THREE.Vector3 {
  const c = Math.cos(th)
  const sn = Math.sin(th)
  const r = R + s * SB - e * CB
  return out.set(c * r, s * CB + e * SB, sn * r)
}
function axes(th: number, t: THREE.Vector3, w: THREE.Vector3, n: THREE.Vector3) {
  const c = Math.cos(th)
  const sn = Math.sin(th)
  t.set(-sn, 0, c)
  w.set(c * SB, CB, sn * SB)
  n.set(-c * CB, SB, -sn * CB)
}
const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const smooth = (x: number) => x * x * (3 - 2 * x)
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = smooth(x - xi)
  const fy = smooth(y - yi)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

// ---------------------------------------------------------------------------------------------------------------
// Shaders. Colours are written as display values (no colour management in the renderer).
const FILM = /* glsl */ `
vec3 film(float t) {
  // thin-film colours: cyan, violet, magenta, gold, then pearl back to cyan (gold straight to cyan would pass through olive)
  t = fract(t) * 5.0;
  vec3 c0 = vec3(0.16, 0.90, 1.00);
  vec3 c1 = vec3(0.50, 0.40, 1.00);
  vec3 c2 = vec3(1.00, 0.20, 0.74);
  vec3 c3 = vec3(1.00, 0.72, 0.24);
  vec3 c4 = vec3(1.00, 0.93, 0.95);
  float f = smoothstep(0.0, 1.0, fract(t));
  if (t < 1.0) return mix(c0, c1, f);
  if (t < 2.0) return mix(c1, c2, f);
  if (t < 3.0) return mix(c2, c3, f);
  if (t < 4.0) return mix(c3, c4, f);
  return mix(c4, c0, f);
}
`
const CHAMBER_UNIFORMS = /* glsl */ `
uniform vec3 uChPos[6];
uniform vec3 uChCol[6];
uniform float uChPow[6];
`

const crystalVert = /* glsl */ `
attribute vec3 aBary;
attribute vec2 aTop;   // x: 1 on the top ring and the tip, y: 1 on the tip
attribute vec4 aSeed;  // hash, taper, tip height, chamber index + 1
attribute float aAng;
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying float vAng;
varying vec3 vUp;
void main() {
  vec3 p = position;
  p.xz *= mix(1.0, aSeed.y, aTop.x);
  p.y += aTop.y * aSeed.z;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vBary = aBary;
  vSeed = aSeed;
  vAng = aAng;
  vUp = normalize(mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const crystalFrag = /* glsl */ `
precision highp float;
uniform vec3 uCam;
uniform float uTime;
uniform float uIgnite;
uniform float uClip;
${CHAMBER_UNIFORMS}
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying float vAng;
varying vec3 vUp;
${FILM}
void main() {
  vec3 toCam = uCam - vW;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  N = normalize(mix(N, vUp, smoothstep(150.0, 320.0, dist) * 0.75));
  vec3 L = normalize(-vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float ndl = max(dot(N, L), 0.0);
  float fres = pow(1.0 - ndv, 2.4);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 140.0);

  float ft = ndv * 0.85 + vSeed.x * 0.46 + vAng * 3.0 + uTime * 0.012;
  vec3 fc = film(ft);
  // close to the camera the crystals read as dark glass with lit edges, not as filled blocks
  float near = 1.0 - smoothstep(22.0, 75.0, dist);
  // dim gold on a big near face reads as khaki: near faces keep to cyan, violet and magenta
  vec3 fcf = mix(fc, film(fract(ft) * 0.44), smoothstep(0.0, 0.35, near));
  vec3 glass = mix(vec3(0.034, 0.020, 0.095), vec3(0.012, 0.062, 0.090), vSeed.x);
  glass = mix(glass, vec3(0.062, 0.036, 0.13), near * 0.6);
  vec3 col = glass * (0.30 + 1.25 * ndl) * (1.0 - 0.2 * near);
  col += fcf * (0.11 * ndl * (1.0 - 0.7 * near) + 0.80 * fres * (1.0 - 0.3 * near));
  col += vec3(1.0, 0.97, 0.92) * spec * 3.2;

  vec3 fw = fwidth(vBary);
  vec3 a3 = smoothstep(vec3(0.0), fw * 1.2, vBary);
  float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
  edge *= 1.0 - 0.55 * smoothstep(120.0, 330.0, dist);
  float run = pow(max(0.0, sin(vAng * 6.2832 * 7.0 - uTime * 0.5 + vSeed.x * 1.6)), 12.0);
  float tw = pow(max(0.0, sin(uTime * (0.5 + vSeed.x) + vSeed.x * 60.0)), 40.0);
  col += fc * edge * (0.50 + 1.05 * near + 1.7 * run);
  col += fc * (run * 0.10 + tw * 0.85);

  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    float d2 = dot(dv, dv);
    float a = uChPow[i] / (1.0 + d2 * 0.006);
    col += uChCol[i] * a * (0.22 + 0.78 * max(dot(N, dv * inversesqrt(d2)), 0.0)) * (0.5 + 0.9 * edge);
  }
  int ci = int(vSeed.w + 0.5) - 1;
  if (ci >= 0) {
    vec3 hc = uChCol[ci];
    col += hc * (0.20 + 0.9 * fres + 1.3 * edge) * (0.55 + 0.75 * uChPow[ci]);
  }
  col *= uIgnite;
  col = 1.0 - exp(-col * 1.2);
  // during a flight, crystals right at the lens dissolve instead of filling the screen with flat faces
  if (uClip > 0.0) {
    float dh = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (dh > smoothstep(uClip * 0.4, uClip, dist)) discard;
  }
  gl_FragColor = vec4(col, 1.0);
}
`

const bandVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const baseFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIgnite;
${CHAMBER_UNIFORMS}
varying vec2 vUv;
varying vec3 vW;
${FILM}
void main() {
  vec3 fc = film(vUv.x * 3.0 + 0.18 + uTime * 0.012);
  float run = pow(max(0.0, sin(vUv.x * 6.2832 * 7.0 - uTime * 0.5)), 6.0);
  vec3 col = fc * (0.20 + 0.45 * run);
  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    col += uChCol[i] * uChPow[i] * 0.5 / (1.0 + dot(dv, dv) * 0.004);
  }
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`
const auraFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIgnite;
uniform float uGain;
${CHAMBER_UNIFORMS}
varying vec2 vUv;
varying vec3 vW;
${FILM}
void main() {
  float x = (vUv.y - 0.5) * 2.0;
  float a = exp(-x * x * 5.5);
  a *= a;
  vec3 col = film(vUv.x * 3.0 + 0.1 + uTime * 0.012) * 0.55;
  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    col += uChCol[i] * uChPow[i] * 2.2 / (1.0 + dot(dv, dv) * 0.0016);
  }
  gl_FragColor = vec4(col * a * uGain * uIgnite, 1.0);
}
`
const floorFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIgnite;
${CHAMBER_UNIFORMS}
varying vec2 vUv;
varying vec3 vW;
${FILM}
void main() {
  float r = length(vW.xz);
  float a = smoothstep(${(R - 105).toFixed(1)}, ${(R - 30).toFixed(1)}, r) * (1.0 - smoothstep(${(R - 26).toFixed(1)}, ${(R - 13).toFixed(1)}, r));
  a = a * a;
  float ang = atan(vW.z, vW.x) / 6.2832;
  vec3 col = film(ang * 3.0 + 0.1 + uTime * 0.012) * 0.07;
  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    col += uChCol[i] * uChPow[i] * 0.5 / (1.0 + dot(dv, dv) * 0.0011);
  }
  gl_FragColor = vec4(col * a * uIgnite, 1.0);
}
`
const railFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
varying vec3 vW;
${FILM}
void main() {
  vec3 col = mix(vec3(1.0), film(vUv.x * 3.0 + 0.3 + uTime * 0.012), 0.55) * 1.15;
  float run = pow(max(0.0, sin(vUv.x * 6.2832 * 7.0 - uTime * 0.5)), 8.0);
  gl_FragColor = vec4(col * (0.75 + 0.6 * run) * uIgnite, 1.0);
}
`

const panelVert = /* glsl */ `
varying vec2 vP;
varying vec3 vW;
void main() {
  vP = position.xy / vec2(${CW.toFixed(1)}, ${CH.toFixed(1)});
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const panelFrag = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec4 uCrop;
uniform vec4 uM;
uniform vec3 uHue;
uniform float uFlare;
uniform float uInvert;
uniform float uIgnite;
uniform float uTime;
varying vec2 vP;
varying vec3 vW;
void main() {
  // window in the middle, a lit frame round it
  vec2 fr = vec2(0.022 * ${(CH / CW).toFixed(4)}, 0.022);
  vec2 q = vP / (1.0 - 2.0 * fr);
  vec2 iuv = vec2(dot(uM.xy, q), dot(uM.zw, q)) + 0.5;
  float inside = step(abs(q.x), 0.5) * step(abs(q.y), 0.5);
  vec2 tuv = vec2(mix(uCrop.x, uCrop.z, iuv.x), 1.0 - mix(uCrop.w, uCrop.y, iuv.y));
  vec3 img = texture2D(uTex, tuv).rgb;
  if (uInvert > 0.5) {
    float mx = max(img.r, max(img.g, img.b));
    float mn = min(img.r, min(img.g, img.b));
    img = img + (1.0 - mx - mn);
    img = pow(max(img, 0.0), vec3(1.25));
  }
  float e = min(0.5 - abs(q.x), 0.5 - abs(q.y));
  vec3 col = img * (1.06 + 0.22 * uFlare) + uHue * 0.02;
  col += uHue * (0.16 + 0.34 * uFlare) * exp(-max(e, 0.0) * 22.0);
  vec3 frame = mix(uHue, vec3(1.0), 0.45) * (1.05 + 0.9 * uFlare);
  col = mix(frame, col, inside);
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`

const billVert = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += (uv - 0.5) * uSize;
  gl_Position = projectionMatrix * mv;
}
`
const starFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
${FILM}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float flick = 0.94 + 0.06 * sin(uTime * 2.3) * sin(uTime * 1.7 + 1.0);
  float core = smoothstep(0.034, 0.016, r);
  float halo = 0.0026 / (r * r + 0.0018);
  float wide = exp(-r * 4.2) * 0.42;
  float sx = exp(-abs(p.y) * 150.0) * exp(-abs(p.x) * 2.6);
  float sx2 = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 5.5) * 0.22;
  float sy = exp(-abs(p.x) * 190.0) * exp(-abs(p.y) * 7.0) * 0.5;
  vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  float sd = (exp(-abs(d.y) * 230.0) + exp(-abs(d.x) * 230.0)) * exp(-r * 9.0) * 0.35;
  float ring = exp(-pow((r - 0.30) / 0.012, 2.0)) * 0.10 + exp(-pow((r - 0.47) / 0.02, 2.0)) * 0.045;
  vec3 col = vec3(1.0, 0.98, 0.95) * core * 4.0;
  col += vec3(0.86, 0.88, 1.0) * halo * flick;
  col += vec3(0.50, 0.36, 0.95) * wide * flick;
  col += vec3(0.50, 0.80, 1.0) * (sx * 1.9 + sx2) * flick;
  col += vec3(0.85, 0.80, 1.0) * (sy + sd);
  col += film(atan(p.y, p.x) / 6.2832 + r * 1.5 + 0.1) * ring;
  col *= smoothstep(1.0, 0.55, r) * uIgnite;
  gl_FragColor = vec4(col, 1.0);
}
`
const haloFrag = /* glsl */ `
precision highp float;
uniform vec3 uHue;
uniform float uFlare;
uniform float uIgnite;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float g = exp(-r * r * 4.0) * 0.16;
  float sx = exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 3.2) * uFlare * 0.8;
  vec3 col = uHue * (g * (0.35 + 1.6 * uFlare) + sx) + vec3(1.0) * sx * 0.35;
  gl_FragColor = vec4(col * smoothstep(1.0, 0.6, r) * uIgnite, 1.0);
}
`
const beamVert = /* glsl */ `
varying float vT;
varying vec3 vN;
varying vec3 vW;
void main() {
  vT = uv.y;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const beamFrag = /* glsl */ `
precision highp float;
uniform vec3 uCam;
uniform vec3 uHue;
uniform float uFlare;
uniform float uTime;
uniform float uIgnite;
varying float vT;
varying vec3 vN;
varying vec3 vW;
void main() {
  float rim = pow(abs(dot(normalize(vN), normalize(uCam - vW))), 2.0);
  float flow = 0.55 + 0.45 * sin(vT * 90.0 - uTime * 9.0);
  float a = (0.07 + 0.93 * uFlare) * rim * mix(1.0, flow, 0.5 * uFlare);
  a *= smoothstep(0.0, 0.02, vT) * (0.35 + 0.65 * smoothstep(1.0, 0.0, vT));
  vec3 col = mix(uHue, vec3(1.0), 0.25 * uFlare) * a * 1.5;
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`
const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}
`
const skyFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uStar;
uniform float uIgnite;
varying vec3 vDir;
float hsh(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hsh(i), hsh(i + vec3(1, 0, 0)), f.x), mix(hsh(i + vec3(0, 1, 0)), hsh(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(hsh(i + vec3(0, 0, 1)), hsh(i + vec3(1, 0, 1)), f.x), mix(hsh(i + vec3(0, 1, 1)), hsh(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
void main() {
  vec3 d = normalize(vDir);
  float n1 = vn(d * 1.25 + vec3(0.0, uTime * 0.004, 3.0));
  float n2 = vn(d * 2.6 + n1 * 1.8 + 7.0);
  float n3 = vn(d * 5.2 - n2 * 1.2);
  // deep colour: ultraviolet above, teal-black below
  vec3 col = mix(vec3(0.006, 0.030, 0.042), vec3(0.050, 0.014, 0.115), smoothstep(-0.55, 0.55, d.y + (n1 - 0.5) * 0.9));
  col *= 0.55 + 0.75 * n1;
  // a few broad folds of faint light
  float fold = smoothstep(0.42, 0.92, n2) * (0.45 + 0.55 * n3);
  col += fold * fold * mix(vec3(0.22, 0.05, 0.36), vec3(0.03, 0.22, 0.30), smoothstep(0.3, 0.75, n1)) * 0.55;
  float fold2 = smoothstep(0.55, 1.0, vn(d * 1.7 + vec3(11.0, 2.0, uTime * 0.003) + n2));
  col += fold2 * fold2 * vec3(0.30, 0.12, 0.10) * 0.22;
  // the star lights the dark round it
  float sd = max(dot(d, normalize(uStar)), 0.0);
  col += vec3(0.20, 0.12, 0.42) * pow(sd, 5.0) * 0.55 + vec3(0.35, 0.40, 0.75) * pow(sd, 48.0) * 0.35;
  // a handful of far suns, not a wallpaper
  vec3 g = d * 150.0;
  vec3 id = floor(g);
  float h = hsh(id);
  float pt = smoothstep(0.30, 0.0, length(fract(g) - 0.5)) * step(0.9972, h);
  col += pt * mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.8, 0.9), fract(h * 91.0)) * (0.35 + 0.65 * fract(h * 37.0));
  col *= uIgnite;
  col += (hsh(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 200.0;
  gl_FragColor = vec4(col, 1.0);
}
`

// ---------------------------------------------------------------------------------------------------------------
interface Pose {
  th: number // angle round the ring
  rho: number // distance from the axis
  y: number
  quat: THREE.Quaternion
  fov: number
}

function crystalGeometry(): THREE.BufferGeometry {
  // a four-sided crystal: square foot from -0.5 to 0.5, height 0 to 1, a tip above the top face
  const pos: number[] = []
  const bary: number[] = []
  const top: number[] = []
  const B: [number, number][] = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ]
  const v = (x: number, y: number, z: number, b: [number, number, number], t: [number, number]) => {
    pos.push(x, y, z)
    bary.push(...b)
    top.push(...t)
  }
  for (let k = 0; k < 4; k++) {
    const a = B[k]
    const b = B[(k + 1) % 4]
    // side quad a0 b0 b1 a1 (0 = foot, 1 = top); wound to face outward
    v(b[0], 0, b[1], [1, 1, 0], [0, 0])
    v(a[0], 0, a[1], [0, 1, 0], [0, 0])
    v(a[0], 1, a[1], [0, 1, 1], [1, 0])
    v(b[0], 0, b[1], [1, 0, 1], [0, 0])
    v(a[0], 1, a[1], [0, 1, 1], [1, 0])
    v(b[0], 1, b[1], [0, 0, 1], [1, 0])
    // top facet: a1 b1 tip
    v(b[0], 1, b[1], [1, 0, 0], [1, 0])
    v(a[0], 1, a[1], [0, 1, 0], [1, 0])
    v(0, 1, 0, [0, 0, 1], [1, 1])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aBary', new THREE.Float32BufferAttribute(bary, 3))
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 2))
  return g
}

function stripGeometry(seg: number, s0: number, s1: number, e: number): THREE.BufferGeometry {
  const pos = new Float32Array((seg + 1) * 2 * 3)
  const uv = new Float32Array((seg + 1) * 2 * 2)
  const idx: number[] = []
  const p = new THREE.Vector3()
  for (let i = 0; i <= seg; i++) {
    const th = (i / seg) * TAU
    band(th, s0, e, p).toArray(pos, i * 6)
    band(th, s1, e, p).toArray(pos, i * 6 + 3)
    uv.set([i / seg, 0, i / seg, 1], i * 4)
    if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

function railGeometry(seg: number, s: number, e: number, rad: number): THREE.BufferGeometry {
  // a thin six-sided tube along one edge of the band
  const sides = 5
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const c = new THREE.Vector3()
  const t = new THREE.Vector3()
  const w = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i <= seg; i++) {
    const th = (i / seg) * TAU
    band(th, s, e, c)
    axes(th, t, w, n)
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU
      pos.push(c.x + (w.x * Math.cos(a) + n.x * Math.sin(a)) * rad, c.y + (w.y * Math.cos(a) + n.y * Math.sin(a)) * rad, c.z + (w.z * Math.cos(a) + n.z * Math.sin(a)) * rad)
      uv.push(i / seg, k / sides)
      if (i < seg) {
        const a0 = i * sides + k
        const a1 = i * sides + ((k + 1) % sides)
        idx.push(a0, a0 + sides, a1, a1, a0 + sides, a1 + sides)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

export class RingScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(60, 1, 0.5, 5000)
  private disposables: { dispose(): void }[] = []
  private raf = 0
  private running = false
  private active = true
  private last = 0
  private time = 0
  private w = 1
  private h = 1
  private dpr = 1
  private slow = 0
  private frames = 0

  private common = { uTime: { value: 0 }, uIgnite: { value: 0 }, uClip: { value: 0 }, uCam: { value: new THREE.Vector3() } }
  private chPos = Array.from({ length: 6 }, () => new THREE.Vector3())
  private chCol = CHECKS.map((c) => new THREE.Vector3(parseInt(c.hue.slice(1, 3), 16) / 255, parseInt(c.hue.slice(3, 5), 16) / 255, parseInt(c.hue.slice(5, 7), 16) / 255))
  private chPow = [0, 0, 0, 0, 0, 0]
  private flare = [0, 0, 0, 0, 0, 0]
  private panelMats: THREE.ShaderMaterial[] = []
  private haloMats: THREE.ShaderMaterial[] = []
  private beamMats: THREE.ShaderMaterial[] = []
  private beams: THREE.Mesh[] = []
  private corners: THREE.Vector3[][] = []
  private upVec: THREE.Vector3[] = []
  private theta: number[] = []

  private home!: Pose
  private homePos = new THREE.Vector3()
  private homeRight = new THREE.Vector3()
  private homeUp = new THREE.Vector3()
  private ends: Pose[] = []
  private from!: Pose
  private to!: Pose
  private k = 1
  private dur = 1
  /** wall-clock start of the flight and of the opening (ms): a slow GPU drops frames, never time */
  private t0 = 0
  private introT0 = 0
  private safety = 0
  private target: number | null = null
  private arrived = true
  private near = true
  private hover: number | null = null
  private intro = 0
  private introDur = 1.4
  private ready = false
  private loaded = 0
  private px = 0
  private py = 0
  private homeW = 1
  private lost = false

  private v = new THREE.Vector3()
  private q = new THREE.Quaternion()
  private xs = [0, 0, 0, 0]
  private ys = [0, 0, 0, 0]

  private host: HTMLElement
  private ctl: RingCtl
  private opt: RingOptions

  constructor(host: HTMLElement, ctl: RingCtl, opt: RingOptions) {
    this.host = host
    this.ctl = ctl
    this.opt = opt
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false })
    this.renderer = renderer
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.setClearColor(0x04030c, 1)
    this.dpr = Math.min(window.devicePixelRatio || 1, opt.tall ? 1.35 : 1.5)
    renderer.setPixelRatio(this.dpr)
    renderer.domElement.className = 'v04-canvas'
    host.appendChild(renderer.domElement)
    renderer.domElement.addEventListener('webglcontextlost', this.onLost)

    this.build()
    this.poses()
    this.resize()

    this.target = opt.startAt
    if (opt.startAt != null) {
      this.from = this.to = this.ends[opt.startAt]
      this.intro = 1
    } else {
      this.from = this.to = this.home
      if (opt.reduced) this.intro = 1
    }
    this.k = 1
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVis)
  }

  // ------------------------------------------------------------------------------------------------- the world
  private mat(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: THREE.ShaderMaterialParameters = {}) {
    const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...this.common, ...uniforms }, ...extra })
    this.disposables.push(m)
    return m
  }
  private chamberUniforms() {
    return { uChPos: { value: this.chPos }, uChCol: { value: this.chCol }, uChPow: { value: this.chPow } }
  }

  private build() {
    const { scene, opt } = this
    const add = { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true } as const
    const t = new THREE.Vector3()
    const w = new THREE.Vector3()
    const n = new THREE.Vector3()
    const p = new THREE.Vector3()

    // where the six chambers sit
    const ats = opt.at ? opt.at.split(',').map(Number) : []
    for (let i = 0; i < 6; i++) {
      const c = CHECKS[i]
      const at = Number.isFinite(ats[i]) ? ats[i] : opt.tall ? c.atTall : c.at
      this.theta[i] = Math.PI / 2 + (at * Math.PI) / 180
      band(this.theta[i], 0, 3.2, this.chPos[i])
    }

    // the dark
    const skyGeo = new THREE.IcosahedronGeometry(1800, 3)
    this.disposables.push(skyGeo)
    const sky = new THREE.Mesh(skyGeo, this.mat(skyVert, skyFrag, { uStar: { value: new THREE.Vector3(0, 0, -1) } }, { side: THREE.BackSide, depthWrite: false, depthTest: false }))
    sky.frustumCulled = false
    sky.renderOrder = -10
    scene.add(sky)
    this.skyMat = sky.material as THREE.ShaderMaterial

    // the band's floor of light under the crystals
    const baseGeo = stripGeometry(360, -W / 2, W / 2, -0.05)
    this.disposables.push(baseGeo)
    scene.add(new THREE.Mesh(baseGeo, this.mat(bandVert, baseFrag, this.chamberUniforms(), { side: THREE.DoubleSide })))

    // the crystals
    const geo = crystalGeometry()
    this.disposables.push(geo)
    const cellT = 4.7
    const nA = Math.round((TAU * R) / cellT)
    const nW = 6
    const cw = W / nW
    const list: { th: number; s: number; lt: number; lw: number; hgt: number; seed: number; taper: number; tip: number; ch: number; tiltA: number; tiltB: number }[] = []
    const inChamber = (th: number, s: number, mt: number, ms: number) => {
      for (let i = 0; i < 6; i++) {
        let d = th - this.theta[i]
        d = Math.atan2(Math.sin(d), Math.cos(d)) * R
        if (Math.abs(d) < CW / 2 + mt && Math.abs(s) < CH / 2 + ms) return i
      }
      return -1
    }
    for (let ia = 0; ia < nA; ia++) {
      for (let iw = 0; iw < nW; iw++) {
        const th0 = ((ia + 0.5) / nA) * TAU
        const s0 = -W / 2 + (iw + 0.5) * cw
        if (inChamber(th0, s0, cellT * 0.5 + 0.9, cw * 0.5 + 0.2) >= 0) continue
        const near = inChamber(th0, s0, cellT * 1.6, cw * 1.2)
        const hsh = hash(ia, iw)
        const dist = vnoise(ia * 0.13, iw * 0.55 + 4.0)
        const ridge = vnoise(ia * 0.045 + 9.0, iw * 0.3)
        const edgeRow = iw === 0 || iw === nW - 1
        const parts: [number, number, number, number][] = hsh < 0.3 ? [[0, 0, 1, 1]] : hsh < 0.62 ? [[-0.25, -0.25, 0.5, 0.5], [0.25, -0.25, 0.5, 0.5], [-0.25, 0.25, 0.5, 0.5], [0.25, 0.25, 0.5, 0.5]] : hsh < 0.81 ? [[-0.25, 0, 0.5, 1], [0.25, 0, 0.5, 1]] : [[0, -0.25, 1, 0.5], [0, 0.25, 1, 0.5]]
        parts.forEach((pt, k) => {
          const sd = hash(ia * 7 + k, iw * 13 + k * 3)
          let hgt = 0.7 + 1.5 * sd * sd
          if (dist > 0.6) hgt += (dist - 0.6) * 15 * (0.35 + 0.65 * sd)
          if (ridge > 0.66) hgt += (ridge - 0.66) * 9
          if (edgeRow) hgt += 1.2 + 3.4 * sd
          if (near >= 0) hgt = 1.6 + 1.6 * sd
          const spire = sd > 0.93 && pt[2] < 1 ? 1 : 0
          if (spire) hgt += 5 + 6 * hash(ia + k, iw)
          list.push({
            th: th0 + (pt[0] * cellT) / R,
            s: s0 + pt[1] * cw,
            lt: pt[2] * cellT * (spire ? 0.5 : 0.93),
            lw: pt[3] * cw * (spire ? 0.5 : 0.93),
            hgt,
            seed: sd,
            taper: spire ? 0.12 : 0.55 + 0.38 * hash(ia + 31 * k, iw + 5),
            tip: spire ? 0.12 : (0.08 + 0.5 * hash(ia + 3, iw * 7 + k)) / Math.max(hgt, 1),
            ch: 0,
            tiltA: (hash(ia + k * 5, iw + 11) - 0.5) * (spire ? 0.5 : 0.22),
            tiltB: (hash(ia + 17, iw + k * 9) - 0.5) * (spire ? 0.5 : 0.22),
          })
        })
      }
    }
    // each chamber's setting: four long bars of its own colour
    for (let i = 0; i < 6; i++) {
      const th = this.theta[i]
      const bar = (dth: number, s: number, lt: number, lw: number, seed: number) => list.push({ th: th + dth, s, lt, lw, hgt: 4.2, seed, taper: 0.62, tip: 0.14, ch: i + 1, tiltA: 0, tiltB: 0 })
      bar(0, CH / 2 + 1.25, CW + 5.2, 2.5, 0.2)
      bar(0, -CH / 2 - 1.25, CW + 5.2, 2.5, 0.7)
      bar((CW / 2 + 1.3) / R, 0, 2.6, CH, 0.45)
      bar(-(CW / 2 + 1.3) / R, 0, 2.6, CH, 0.9)
    }
    const count = list.length
    const mesh = new THREE.InstancedMesh(geo, this.mat(crystalVert, crystalFrag, this.chamberUniforms(), { side: THREE.DoubleSide }), count)
    const seeds = new Float32Array(count * 4)
    const angs = new Float32Array(count)
    const m = new THREE.Matrix4()
    const rot = new THREE.Matrix4()
    const sc = new THREE.Vector3()
    const e = new THREE.Euler()
    const z = new THREE.Vector3()
    list.forEach((c, i) => {
      axes(c.th, t, w, n)
      band(c.th, c.s, 0, p)
      z.copy(w).negate()
      m.makeBasis(t, n, z)
      rot.makeRotationFromEuler(e.set(c.tiltA, 0, c.tiltB))
      m.multiply(rot)
      m.scale(sc.set(c.lt, c.hgt, c.lw))
      m.setPosition(p)
      mesh.setMatrixAt(i, m)
      seeds.set([c.seed, c.taper, c.tip, c.ch], i * 4)
      angs[i] = c.th / TAU
    })
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    geo.setAttribute('aAng', new THREE.InstancedBufferAttribute(angs, 1))
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    scene.add(mesh)

    // two rails of light along the band's edges
    for (const s of [-W / 2 - 0.4, W / 2 + 0.4]) {
      const g = railGeometry(360, s, 0.5, 0.42)
      this.disposables.push(g)
      scene.add(new THREE.Mesh(g, this.mat(bandVert, railFrag, {})))
    }

    // the band's glow in the dark round it
    const auraGeo = stripGeometry(180, -W * 1.9, W * 1.9, -1.2)
    this.disposables.push(auraGeo)
    const aura = new THREE.Mesh(auraGeo, this.mat(bandVert, auraFrag, { ...this.chamberUniforms(), uGain: { value: 0.2 } }, { ...add, side: THREE.DoubleSide }))
    aura.renderOrder = 2
    scene.add(aura)
    const floorGeo = new THREE.RingGeometry(R - 106, R + 14, 160, 1)
    floorGeo.rotateX(-Math.PI / 2)
    this.disposables.push(floorGeo)
    const floor = new THREE.Mesh(floorGeo, this.mat(bandVert, floorFrag, this.chamberUniforms(), { ...add, side: THREE.DoubleSide }))
    floor.renderOrder = 1
    scene.add(floor)

    // the star
    const quad = new THREE.PlaneGeometry(1, 1)
    this.disposables.push(quad)
    const star = new THREE.Mesh(quad, this.mat(billVert, starFrag, { uSize: { value: 250 } }, { ...add, depthTest: true }))
    star.frustumCulled = false
    star.renderOrder = 5
    scene.add(star)

    // the six chambers
    const panelGeo = new THREE.PlaneGeometry(CW, CH)
    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true)
    this.disposables.push(panelGeo, beamGeo)
    const loader = new THREE.TextureLoader()
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy()
    for (let i = 0; i < 6; i++) {
      const c = CHECKS[i]
      const th = this.theta[i]
      axes(th, t, w, n)
      const tex = loader.load(
        opt.tall ? c.imgTall : c.img,
        () => this.loaded++,
        undefined,
        () => this.loaded++,
      )
      tex.anisotropy = Math.min(8, maxAniso)
      tex.minFilter = THREE.LinearMipmapLinearFilter
      this.disposables.push(tex)
      const crop = opt.tall ? c.cropTall : c.crop
      const pm = this.mat(panelVert, panelFrag, {
        uTex: { value: tex },
        uCrop: { value: new THREE.Vector4(...crop) },
        uM: { value: new THREE.Vector4(1, 0, 0, 1) },
        uHue: { value: this.chCol[i] },
        uFlare: { value: 0 },
        uInvert: { value: c.invert ? 1 : 0 },
      })
      const panel = new THREE.Mesh(panelGeo, pm)
      panel.matrixAutoUpdate = false
      panel.matrix.makeBasis(t, w, n).setPosition(band(th, 0, 0.9, p))
      panel.matrixWorldNeedsUpdate = true
      scene.add(panel)
      this.panelMats.push(pm)

      this.corners[i] = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([a, b]) => band(th + (a * CW * 0.5) / R, b * CH * 0.5, 0.9, new THREE.Vector3()))
      this.upVec[i] = new THREE.Vector3()

      const hm = this.mat(billVert, haloFrag, { uSize: { value: 120 }, uHue: { value: this.chCol[i] }, uFlare: { value: 0 } }, { ...add, depthTest: false })
      const halo = new THREE.Mesh(quad, hm)
      halo.position.copy(this.chPos[i])
      halo.frustumCulled = false
      halo.renderOrder = 4
      scene.add(halo)
      this.haloMats.push(hm)

      const bm = this.mat(beamVert, beamFrag, { uHue: { value: this.chCol[i] }, uFlare: { value: 0 } }, { ...add, side: THREE.DoubleSide })
      const beam = new THREE.Mesh(beamGeo, bm)
      const a = band(th, 0, 4.5, new THREE.Vector3())
      beam.position.copy(a).multiplyScalar(0.5)
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().negate().normalize())
      beam.scale.set(0.5, a.length(), 0.5)
      beam.renderOrder = 3
      scene.add(beam)
      this.beamMats.push(bm)
      this.beams.push(beam)
    }
  }
  private skyMat!: THREE.ShaderMaterial

  // ------------------------------------------------------------------------------------------------- the camera
  private poses() {
    const { opt } = this
    // the wide view: just inside the band, near its edge, looking across the ring
    let c = opt.tall ? [0, 34, 144, -48, -1, 72, -70, 104] : [0, 34, 144, -60, -19, 83, -6, 70]
    if (opt.cam) {
      const a = opt.cam.split(',').map(Number)
      if (a.length === 8 && a.every((x) => Number.isFinite(x))) c = a
    }
    const pos = new THREE.Vector3(c[0], c[1], c[2])
    const tgt = new THREE.Vector3(c[3], c[4], c[5])
    const m = new THREE.Matrix4().lookAt(pos, tgt, new THREE.Vector3(0, 1, 0))
    const quat = new THREE.Quaternion().setFromRotationMatrix(m)
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (c[6] * Math.PI) / 180))
    this.home = { th: Math.atan2(pos.z, pos.x), rho: Math.hypot(pos.x, pos.z), y: pos.y, quat, fov: c[7] }
    this.homePos.copy(pos)
    this.homeRight.set(1, 0, 0).applyQuaternion(quat)
    this.homeUp.set(0, 1, 0).applyQuaternion(quat)

    // which way is up for each window, so every image reads upright from the wide view
    const cam = this.camera
    cam.position.copy(pos)
    cam.quaternion.copy(quat)
    cam.fov = c[7]
    cam.aspect = opt.tall ? 0.46 : 1.6
    cam.updateProjectionMatrix()
    cam.updateMatrixWorld(true)
    const t = new THREE.Vector3()
    const w = new THREE.Vector3()
    const n = new THREE.Vector3()
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const fovEnd = opt.tall ? 50 : 42
    for (let i = 0; i < 6; i++) {
      const th = this.theta[i]
      axes(th, t, w, n)
      const along = opt.tall ? t : w
      band(th, 0, 1, a).project(cam)
      band(th, 0, 1, b).addScaledVector(along, 4).project(cam)
      const sign = b.y >= a.y ? 1 : -1
      const up = this.upVec[i].copy(along).multiplyScalar(sign)
      this.panelMats[i].uniforms.uM.value.set(...(opt.tall ? (sign > 0 ? [0, -1, 1, 0] : [0, 1, -1, 0]) : sign > 0 ? [1, 0, 0, 1] : [-1, 0, 0, -1]))
      // the end of the flight: inside the window, the image filling the screen
      const tanV = Math.tan((fovEnd * Math.PI) / 360)
      const cover = opt.tall ? Math.max(CW / 2 / tanV, CH / 2 / (tanV * 0.46)) : Math.max(CH / 2 / tanV, CW / 2 / (tanV * 1.6))
      const d = cover * 0.56
      const e = band(th, 0, d, new THREE.Vector3())
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(e, band(th, 0, 0, a), up))
      this.ends[i] = { th, rho: Math.hypot(e.x, e.z), y: e.y, quat: q, fov: fovEnd }
    }
  }

  setTarget(i: number | null, snap = false) {
    // the page opens while the camera is still flying into this chamber: let it finish the flight
    if (i === this.target && (!snap || !this.arrived)) return
    const cur = this.current()
    this.from = { ...cur, quat: cur.quat.clone() }
    this.to = i == null ? this.home : this.ends[i]
    const dth = Math.abs(this.to.th - cur.th)
    this.dur = i == null ? 0.85 + dth * 0.1 : 0.8 + dth * 0.1
    this.k = snap || this.opt.reduced ? 1 : 0
    this.t0 = performance.now()
    this.target = i
    this.arrived = snap
    this.near = snap || i == null
    if (this.ctl.flash && i != null && !snap) this.ctl.flash.style.opacity = '0'
    // never wait on frames to finish a move: if the loop is starved, arrive on time anyway
    window.clearTimeout(this.safety)
    if (!snap && this.opt.hold == null) this.safety = window.setTimeout(() => this.arrive(), (this.k >= 1 ? 0 : this.dur * 1000) + 250)
    if (snap && i != null) this.ctl.onArrive(i)
    this.wake()
  }
  private arrive() {
    if (this.arrived) return
    this.arrived = true
    this.k = 1
    if (this.target != null && !this.near) {
      this.near = true
      this.ctl.onNear(this.target)
    }
    if (this.target != null) this.ctl.onArrive(this.target)
    else this.ctl.onHome()
  }
  setHover(i: number | null) {
    this.hover = i
  }
  setActive(on: boolean) {
    this.active = on
    if (on) this.wake()
  }

  private cur: Pose = { th: 0, rho: 0, y: 0, quat: new THREE.Quaternion(), fov: 60 }
  private current(): Pose {
    const { from, to, cur: out } = this
    const e = ease(this.k)
    const hug = Math.sin(Math.PI * e)
    const span = Math.min(1, Math.abs(to.th - from.th) / 0.9)
    out.th = from.th + (to.th - from.th) * e
    out.rho = from.rho + (to.rho - from.rho) * e
    const into = this.target != null
    if (into) {
      // flying in: the camera hugs the band, the crystals rush past
      out.rho += (R - 13 - out.rho) * hug * 0.55 * span
      out.y = from.y + (to.y - from.y) * e - hug * 6 * span
    } else {
      // flying out: it backs off the band at once and rises, then sweeps home, never skimming the crystals
      const away = Math.sin(Math.PI * easeOut(this.k))
      out.rho += (R - 80 - out.rho) * away * 0.55 * span
      out.y = from.y + (to.y - from.y) * e + away * 20 * span
    }
    // on the way out the camera turns to the wide view early, so it looks along the ring, not into the band
    out.quat.copy(from.quat).slerp(to.quat, ease(Math.min(1, this.k * (into ? 1.12 : 1.8))))
    out.fov = from.fov + (to.fov - from.fov) * e + hug * 10 * span
    return out
  }

  // ------------------------------------------------------------------------------------------------- the loop
  start() {
    this.running = true
    this.wake()
  }
  private wake() {
    if (!this.running || this.raf || this.lost || document.hidden) return
    this.last = 0
    this.raf = requestAnimationFrame(this.tick)
  }
  private onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else this.wake()
  }
  private onLost = (e: Event) => {
    e.preventDefault()
    this.lost = true
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.ctl.onFail()
  }
  private resize = () => {
    const w = this.host.clientWidth || window.innerWidth
    const h = this.host.clientHeight || window.innerHeight
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.wake()
  }

  private tick = (now: number) => {
    this.raf = 0
    if (!this.running || this.lost) return
    const flying = this.k < 1
    // a check's page covers the scene: draw nothing until the way back starts
    if (!this.active && !flying && this.ready) return
    this.raf = requestAnimationFrame(this.tick)
    const delta = this.last ? (now - this.last) / 1000 : 0.016
    this.last = now
    // the clamped step only smooths (flare, parallax); the opening and the flight run on the wall clock
    const dt = Math.min(delta, 0.05)
    this.time += dt
    const { opt, ctl, camera } = this
    const wall = performance.now()

    // the opening: the ring lights up and the camera settles (its clock starts once the first frame is drawn)
    if (this.intro < 1) {
      if (!this.introT0) this.introT0 = this.frames > 0 ? wall : 0
      if (this.introT0) this.intro = Math.min(1, (wall - this.introT0) / 1000 / this.introDur)
    }
    const ie = easeOut(this.intro)
    this.common.uTime.value = this.time
    this.common.uIgnite.value = 0.25 + 0.75 * easeOut(Math.min(1, this.intro * 1.6))

    if (this.k < 1) this.k = Math.min(1, (wall - this.t0) / 1000 / this.dur)
    if (opt.hold != null && this.k > opt.hold) this.k = opt.hold
    this.common.uClip.value = this.k < 1 ? (this.target == null ? 10 : 2.5) : 0
    const pose = this.current()
    const atHome = this.target == null
    this.homeW += ((atHome ? ease(this.k) : 1 - ease(Math.min(1, this.k * 2.5))) - this.homeW) * Math.min(1, dt * 6)
    const hw = this.homeW
    this.px += (ctl.pointer[0] - this.px) * Math.min(1, dt * 2.4)
    this.py += (ctl.pointer[1] - this.py) * Math.min(1, dt * 2.4)

    camera.position.set(Math.cos(pose.th) * pose.rho, pose.y, Math.sin(pose.th) * pose.rho)
    camera.quaternion.copy(pose.quat)
    const drift = opt.reduced ? 0 : 1
    const ox = hw * (this.px * 3.4 + drift * Math.sin(this.time * 0.13) * 1.3) - (1 - ie) * 16
    const oy = hw * (-this.py * 2.2 + drift * Math.sin(this.time * 0.09 + 1.3) * 0.9) + (1 - ie) * 9
    camera.position.addScaledVector(this.homeRight, ox).addScaledVector(this.homeUp, oy)
    // a slight turn against the shift keeps the far ring steady while the near band slides
    this.q.setFromAxisAngle(this.v.set(0, 1, 0), hw * (this.px * 0.022 - (1 - ie) * 0.16))
    camera.quaternion.multiply(this.q)
    this.q.setFromAxisAngle(this.v.set(1, 0, 0), hw * (this.py * 0.014 + (1 - ie) * 0.05))
    camera.quaternion.multiply(this.q)
    const fov = pose.fov + (1 - ie) * 5
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
    this.common.uCam.value.copy(camera.position)
    this.skyMat.uniforms.uStar.value.copy(camera.position).negate()

    // hover and focus: the chamber flares and its beam reaches the star
    const hot = this.target != null ? this.target : this.hover
    for (let i = 0; i < 6; i++) {
      const goal = hot === i ? 1 : 0
      this.flare[i] += (goal - this.flare[i]) * Math.min(1, dt * 7)
      const f = this.flare[i]
      const breathe = 0.3 + 0.05 * Math.sin(this.time * 0.8 + i * 1.9)
      this.chPow[i] = breathe + 1.1 * f
      this.panelMats[i].uniforms.uFlare.value = f
      this.haloMats[i].uniforms.uFlare.value = f
      this.haloMats[i].uniforms.uSize.value = 105 + 55 * f
      this.beamMats[i].uniforms.uFlare.value = f
      const bw = 0.42 + 1.0 * f
      this.beams[i].scale.x = bw
      this.beams[i].scale.z = bw
    }

    this.renderer.render(this.scene, camera)
    this.frames++
    this.place()
    if (ctl.flash && this.target != null && this.k < 1) {
      // the chamber's light rises over the last 0.2 s of the flight only
      const left = this.dur * (1 - this.k)
      const f = Math.max(0, Math.min(1, 1 - left / 0.2))
      ctl.flash.style.opacity = (f * f * (3 - 2 * f)).toFixed(3)
      // just before it: the page mounts under the light, so nothing is left to load when the light clears
      if (!this.near && left <= 0.26 && opt.hold == null) {
        this.near = true
        ctl.onNear(this.target)
      }
    }

    if (!this.ready && this.loaded >= 6 && this.intro >= 1 && this.frames > 2) {
      this.ready = true
      ctl.onReady()
    }
    if (!this.arrived && this.k >= 1) {
      window.clearTimeout(this.safety)
      this.arrive()
    }

    // slow machine: lower the render scale, never raise it
    if (this.intro >= 1 && delta > 0.03) {
      if (++this.slow > 24 && this.dpr > 0.8) {
        this.slow = 0
        this.dpr = Math.max(0.75, this.dpr * 0.82)
        this.renderer.setPixelRatio(this.dpr)
        this.renderer.setSize(this.w, this.h, false)
      }
    } else if (this.slow > 0) this.slow--
  }

  /** Puts each DOM button over its chamber, and draws the chamber's outline for hover and focus. */
  private place() {
    const { ctl, camera, w, h, v } = this
    const inv = camera.matrixWorldInverse
    for (let i = 0; i < 6; i++) {
      const el = ctl.buttons[i]
      if (!el) continue
      let ok = true
      let x0 = 1e9
      let y0 = 1e9
      let x1 = -1e9
      let y1 = -1e9
      for (let k = 0; k < 4; k++) {
        v.copy(this.corners[i][k]).applyMatrix4(inv)
        if (v.z > -1) {
          ok = false
          break
        }
        v.applyMatrix4(camera.projectionMatrix)
        const x = (v.x * 0.5 + 0.5) * w
        const y = (-v.y * 0.5 + 0.5) * h
        this.xs[k] = x
        this.ys[k] = y
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
      if (ok && (x1 < -20 || x0 > w + 20 || y1 < -20 || y0 > h + 20)) ok = false
      // a chamber the camera is inside or right in front of is not a button: it would cover the whole screen
      if (ok && (x1 - x0 > w * 1.5 || y1 - y0 > h * 1.5)) ok = false
      // compared with the element itself: the buttons are new each time the home mounts again
      const vis = ok ? '1' : '0'
      if (el.dataset.vis !== vis) el.dataset.vis = vis
      if (!ok) continue
      // generous hit area: never smaller than a fingertip
      const pad = Math.max(6, (56 - Math.min(x1 - x0, y1 - y0)) / 2)
      const bx = x0 - pad
      const by = y0 - pad
      const s = el.style
      s.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`
      s.width = `${(x1 - x0 + pad * 2).toFixed(1)}px`
      s.height = `${(y1 - y0 + pad * 2).toFixed(1)}px`
      // on a phone the name sits beside the chamber: keep it on screen when the chamber runs off the bottom
      if (this.opt.tall) s.setProperty('--ty', `${Math.min((y1 - y0) / 2 + pad, h - 58 - by).toFixed(1)}px`)
      const poly = ctl.outlines[i]
      if (poly) {
        let pts = ''
        for (let k = 0; k < 4; k++) pts += `${(this.xs[k] - bx).toFixed(1)},${(this.ys[k] - by).toFixed(1)} `
        poly.setAttribute('points', pts)
      }
    }
  }

  dispose() {
    this.running = false
    window.clearTimeout(this.safety)
    cancelAnimationFrame(this.raf)
    this.raf = 0
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.onVis)
    const el = this.renderer.domElement
    el.removeEventListener('webglcontextlost', this.onLost)
    for (const d of this.disposables) d.dispose()
    this.scene.clear()
    this.renderer.dispose()
    try {
      this.renderer.forceContextLoss()
    } catch {
      /* already gone */
    }
    el.remove()
  }
}

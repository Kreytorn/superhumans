// V11 "Crystal Human": the scene, drawn live with three.js. A human figure cut from prismatic crystal floats weightless
// before a fierce white star. Six jewels inside the crystal hold the six checks' real specimen images; a heavy ion's
// straight track crosses the TrackTrace jewel. Pressing a jewel flies the camera into the crystal and into the jewel.
import * as THREE from 'three'
import { CHECKS } from './data'
import { loadBody } from './bodyload'
import { SPHERES, type BodyMesh } from './body'

export interface CrystalCtl {
  /** the six DOM buttons that track the jewels on screen */
  buttons: (HTMLElement | null)[]
  pointer: [number, number]
  /** the jewel's light that rises at the end of a flight */
  flash: HTMLElement | null
  onArrive(i: number): void
  onHome(): void
  onReady(): void
  onFail(): void
}

export interface CrystalOptions {
  tall: boolean
  reduced: boolean
  /** start inside this jewel (a check's page was opened directly) */
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

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const hex = (h: string) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)

/** the figure's turn: nearly side-on, facing the star, leaning toward it */
const BASE_ROT = new THREE.Euler(0.2, 0.95, 0, 'YXZ')
/** the gem inside each jewel's square: its half-width as a share of the square's half-size */
const GEM = 0.56
const JEWEL_QUAD = 1 / GEM

// ---------------------------------------------------------------------------------------------------------------
// Shaders. Colours are written as display values (no colour management in the renderer).
const FILM = /* glsl */ `
vec3 film(float t) {
  // thin-film colours: cyan, violet, magenta, gold, then pearl back to cyan
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
const JEWEL_UNIFORMS = /* glsl */ `
uniform vec3 uJPos[6];
uniform vec3 uJCol[6];
uniform float uJPow[6];
`

const bodyVert = /* glsl */ `
attribute vec3 aBary;
attribute vec3 aFacet;
attribute vec3 aCorner;
varying vec3 vW;
varying vec3 vN;
varying vec3 vBary;
varying vec3 vFacet;
varying vec3 vCorner;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vBary = aBary;
  vFacet = aFacet;
  vCorner = aCorner;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const bodyFrag = /* glsl */ `
precision highp float;
uniform vec3 uCam;
uniform vec3 uStar;
uniform float uTime;
uniform float uIgnite;
uniform float uGrow;
uniform float uSheen;
uniform float uFly;
${JEWEL_UNIFORMS}
varying vec3 vW;
varying vec3 vN;
varying vec3 vBary;
varying vec3 vFacet;
varying vec3 vCorner;
${FILM}
void main() {
  // 0 on the facet's edges, 1 at its centre
  float cen = clamp(min(min(vCorner.x, vCorner.y), vCorner.z) * 3.0, 0.0, 1.0);
  float g = uGrow - vFacet.y * 0.9;
  if (g < 0.0) discard;
  float front = 1.0 - smoothstep(0.0, 0.14, g);
  vec3 toCam = uCam - vW;
  vec3 V = normalize(toCam);
  vec3 N = normalize(vN);
  float sd = dot(N, V);
  if (sd < 0.0) N = -N;
  float ndv = abs(sd);
  vec3 L = normalize(uStar - vW);
  float ndl = max(dot(N, L), 0.0);
  float fres = pow(1.0 - ndv, 2.3);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 110.0);
  // starlight through the crystal: strongest where the star sits right behind the facet
  float thru = pow(max(dot(-V, L), 0.0), 40.0);

  vec3 fw = fwidth(vBary);
  vec3 a3 = smoothstep(vec3(0.0), fw * 0.95, vBary);
  float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
  float run = pow(max(0.0, sin(dot(vW, vec3(0.55, 1.0, 0.25)) * 7.0 - uTime * 1.2 + vFacet.x * 1.5)), 14.0);
  float tw = pow(max(0.0, sin(uTime * (0.45 + vFacet.x * 0.9) + vFacet.x * 70.0)), 40.0);

  float ft = ndv * 0.9 + vFacet.x * 0.6 + vW.y * 0.22 + uTime * 0.014;
  vec3 fc = film(ft);
  vec3 col;
  if (uSheen > 0.5) {
    // the glass in front of a jewel: only its edges and glints, so the jewel reads as inside the crystal
    float near = 0.0;
    for (int i = 0; i < 6; i++) {
      vec3 dv = uJPos[i] - vW;
      near = max(near, uJPow[i] * 2.0 / (1.0 + dot(dv, dv) * 160.0));
    }
    col = (fc * edge * 0.45 + vec3(1.0) * spec * 1.2 + fc * fres * 0.25) * clamp(near, 0.0, 1.0);
    // only in flight: at rest the pictures in the jewels stay clean
    gl_FragColor = vec4(col * uIgnite * (1.0 - front) * uFly, 1.0);
    return;
  }
  // each flat facet mirrors a different part of a dark studio: the star, a ring of thin-film light, a violet sky
  // above and a teal floor below. Neighbouring facets catch different things, which is what makes a gem sparkle.
  vec3 R = reflect(-V, N);
  float sR = max(dot(R, L), 0.0);
  vec3 vc = film(fract(ft) * 0.8);
  vec3 env = vec3(1.0, 0.97, 0.94) * (pow(sR, 70.0) * 3.5 + pow(sR, 12.0) * 0.2);
  // fire: near the star's reflection a facet splits the light into colour
  env += film(fract(vFacet.x * 2.0 + sR * 1.5 + uTime * 0.02) * 0.8) * pow(sR, 4.0) * 0.7;
  // a ring of coloured light in the studio: only some facets face it, and those flash in full colour
  float band = exp(-pow((R.y - 0.05 + 0.35 * sin(R.x * 2.3 + R.z * 1.7 + vFacet.x * 2.0)) * 6.0, 2.0));
  env += film(fract(R.x * 0.35 + R.z * 0.3 + vFacet.x * 0.6 + uTime * 0.01) * 0.8) * band * 1.5 * step(0.35, fract(vFacet.x * 7.31));
  // and a few facets glow with colour from inside, whatever the angle
  env += vc * step(0.86, vFacet.z) * 0.35;
  // three coloured lights stand round the studio: cyan up front, magenta low on the right, gold above. A flat facet
  // that mirrors one flashes in its full colour; as the figure turns, the flashes move from facet to facet.
  float jit = (vFacet.z - 0.5) * 0.05;
  float fC = smoothstep(0.89 + jit, 0.91 + jit, dot(R, normalize(vec3(-0.55, 0.42, 0.72))));
  float fM = smoothstep(0.89 + jit, 0.91 + jit, dot(R, normalize(vec3(0.62, -0.38, 0.68))));
  float fG = smoothstep(0.9 + jit, 0.92 + jit, dot(R, normalize(vec3(0.25, 0.9, 0.35))));
  vec3 flashC = vec3(0.08, 0.72, 1.0) * fC + vec3(1.0, 0.1, 0.58) * fM + vec3(1.0, 0.7, 0.08) * fG;
  // dark glass: deep ultraviolet or teal, deeper at each facet's centre (light passes through there)
  vec3 glass = mix(vec3(0.060, 0.012, 0.165), vec3(0.004, 0.070, 0.125), smoothstep(0.3, 0.7, vFacet.x));
  col = glass * (1.25 - 0.75 * cen) * (0.8 + 0.5 * ndl);
  col += env * (0.1 + 0.9 * fres);
  // the flash fills the facet, brightest at its centre, with the cut line a shade lighter
  col += flashC * (0.75 + 0.45 * cen + 0.3 * edge);
  // the star behind the figure rims it in white light, and shines through where it sits right behind
  col += mix(vec3(0.78, 0.88, 1.0), vc, 0.45) * pow(1.0 - ndv, 5.0) * smoothstep(0.1, 0.7, dot(N, L)) * 1.6;
  col += mix(vec3(0.75, 0.82, 1.0), vc, 0.5) * thru * 0.4;
  col += vec3(1.0, 0.97, 0.92) * spec * 2.4;
  // the cut lines, in prism colours, with glints of light running along them
  col += vc * edge * (0.09 + 2.2 * run) * (0.6 + 0.8 * vFacet.z);
  col += vc * tw * 0.9;
  for (int i = 0; i < 6; i++) {
    vec3 dv = uJPos[i] - vW;
    float a = uJPow[i] / (1.0 + dot(dv, dv) * 38.0);
    col += uJCol[i] * a * (0.26 + 1.1 * edge + 0.5 * fres);
  }
  col += mix(vec3(1.0), fc, 0.4) * front * (0.5 + 2.5 * edge);
  col *= uIgnite;
  col = 1.0 - exp(-col * 1.25);
  gl_FragColor = vec4(col, 1.0);
}
`

const glowVert = /* glsl */ `
attribute vec3 aSmooth;
uniform float uPush;
varying vec3 vW;
varying vec3 vS;
void main() {
  vec4 wp = modelMatrix * vec4(position + aSmooth * uPush, 1.0);
  vW = wp.xyz;
  vS = normalize(mat3(modelMatrix) * aSmooth);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const glowFrag = /* glsl */ `
precision highp float;
uniform vec3 uCam;
uniform vec3 uStar;
uniform float uIgnite;
uniform float uGrow;
uniform float uTime;
varying vec3 vW;
varying vec3 vS;
${FILM}
void main() {
  vec3 V = normalize(uCam - vW);
  float r = 1.0 - abs(dot(normalize(vS), V));
  float a = pow(r, 3.0) * smoothstep(1.0, 0.7, r);
  float toward = smoothstep(-0.4, 0.8, dot(normalize(vS), normalize(uStar - vW)));
  vec3 col = mix(film(vW.y * 0.35 + uTime * 0.01 + 0.05), vec3(0.85, 0.9, 1.0), toward * 0.6) * a * (0.1 + 0.3 * toward);
  gl_FragColor = vec4(col * uIgnite * smoothstep(0.6, 1.2, uGrow), 1.0);
}
`

const shardVert = /* glsl */ `
attribute vec3 aBary;
attribute vec2 aTop;   // x: 1 on the top ring and the tip, y: 1 on the tip
attribute vec4 aSeed;  // hash, taper, tip height, growth delay
uniform float uGrow;
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying vec3 vUp;
void main() {
  vec3 p = position;
  p.xz *= mix(1.0, aSeed.y, aTop.x);
  p.y += aTop.y * aSeed.z;
  p.y *= smoothstep(aSeed.w * 0.9 + 0.05, aSeed.w * 0.9 + 0.35, uGrow);
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vBary = aBary;
  vSeed = aSeed;
  vUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
const shardFrag = /* glsl */ `
precision highp float;
uniform vec3 uCam;
uniform vec3 uStar;
uniform float uTime;
uniform float uIgnite;
${JEWEL_UNIFORMS}
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying vec3 vUp;
${FILM}
void main() {
  vec3 V = normalize(uCam - vW);
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(uStar - vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 80.0);
  vec3 fc = film(ndv * 0.8 + vSeed.x * 0.7 + uTime * 0.02);
  vec3 fw = fwidth(vBary);
  vec3 a3 = smoothstep(vec3(0.0), fw * 1.2, vBary);
  float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
  float tw = pow(max(0.0, sin(uTime * (0.6 + vSeed.x) + vSeed.x * 50.0)), 30.0);
  vec3 col = vec3(0.05, 0.03, 0.12) + fc * (0.25 + 0.9 * fres) + fc * edge * 0.9 + vec3(1.0) * spec * 2.4 + fc * tw * 1.2;
  // brighter toward the tip, like light running out along the crystal
  col *= 0.7 + 0.6 * clamp(dot(vUp, normalize(vW - uCam)) * -0.5 + 0.5, 0.0, 1.0);
  for (int i = 0; i < 6; i++) {
    vec3 dv = uJPos[i] - vW;
    col += uJCol[i] * uJPow[i] * 0.6 / (1.0 + dot(dv, dv) * 60.0);
  }
  col *= uIgnite;
  col = 1.0 - exp(-col * 1.2);
  gl_FragColor = vec4(col, 1.0);
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
  float core = smoothstep(0.022, 0.009, r);
  float halo = 0.0011 / (r * r + 0.0009);
  float wide = exp(-r * 4.6) * 0.34;
  float sx = exp(-abs(p.y) * 260.0) * exp(-abs(p.x) * 2.7);
  float sx2 = exp(-abs(p.y) * 46.0) * exp(-abs(p.x) * 4.5) * 0.2;
  float sy = exp(-abs(p.x) * 300.0) * exp(-abs(p.y) * 6.5) * 0.45;
  vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  float sd = (exp(-abs(d.y) * 320.0) + exp(-abs(d.x) * 320.0)) * exp(-r * 10.0) * 0.32;
  float ring = exp(-pow((r - 0.22) / 0.01, 2.0)) * 0.08 + exp(-pow((r - 0.36) / 0.016, 2.0)) * 0.035;
  vec3 col = vec3(1.0, 0.98, 0.95) * core * 4.0;
  col += vec3(0.86, 0.88, 1.0) * halo * flick;
  col += vec3(0.48, 0.34, 0.95) * wide * flick;
  col += vec3(0.55, 0.82, 1.0) * (sx * 1.9 + sx2) * flick;
  col += vec3(0.85, 0.80, 1.0) * (sy + sd);
  col += film(atan(p.y, p.x) / 6.2832 + r * 1.5 + 0.1) * ring;
  col *= smoothstep(1.0, 0.55, r) * uIgnite;
  gl_FragColor = vec4(col, 1.0);
}
`
const auraFrag = /* glsl */ `
precision highp float;
uniform float uIgnite;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.y *= 0.62;
  float r = length(p);
  float a = exp(-r * r * 5.0) * smoothstep(1.0, 0.6, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  vec3 col = mix(vec3(0.05, 0.30, 0.42), vec3(0.42, 0.16, 0.62), vUv.y) * a * 0.16;
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`

const jewelFrag = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec4 uCrop;
uniform vec3 uHue;
uniform float uFlare;
uniform float uShow;
uniform float uDim;
uniform float uCut;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
float sdHex(vec2 p, float r) {
  // pointy at top and bottom
  p = abs(p.yx);
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
float h1(float n) { return fract(sin(n * 91.7) * 43758.5); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float R = ${GEM.toFixed(3)};
  float d = sdHex(p, R);
  // one screen pixel, in these units
  float px = max(fwidth(p.x), 1e-4);
  float inside = 1.0 - smoothstep(-px, px, d);
  // a narrow bevel of six facets just inside the rim: each lifts and bends the picture a little
  float bev = clamp(px * 7.0, R * 0.06, R * 0.16);
  float ring = smoothstep(-bev - px, -bev + px, d);
  float ang = atan(p.y, p.x);
  float sec = floor((ang + 3.14159) / 1.0472);
  vec2 off = vec2(cos(sec * 1.0472 + 0.5), sin(sec * 1.0472 + 0.5)) * 0.035 * ring;
  vec2 pp = p * (1.0 - 0.06 * ring) + off;
  // the picture fills the gem: its box is the crop, which is shaped like the hexagon
  vec2 q = vec2(pp.x / (2.0 * R), pp.y / (2.3094 * R)) + 0.5;
  vec2 tuv = vec2(mix(uCrop.x, uCrop.z, q.x), 1.0 - mix(uCrop.y, uCrop.w, 1.0 - q.y));
  vec3 img = texture2D(uTex, tuv).rgb;
  img = clamp((img - 0.5) * 1.1 + 0.54, 0.0, 1.0) * (1.0 + 0.14 * uFlare);
  float shade = 0.92 + 0.34 * h1(sec + 3.0) + 0.08 * sin(uTime * 0.7 + sec * 2.0);
  vec3 col = mix(img, img * shade + uHue * 0.1, ring);
  // in flight the gem's cut shows over the picture: the table's rim and the spokes out to the corners
  if (uCut > 0.001) {
    float dt = sdHex(p, R * 0.64);
    float crown = smoothstep(-px, px, dt);
    float lt = 1.0 - smoothstep(0.0, px * 1.6, abs(dt));
    float sp = 0.0;
    for (int k = 0; k < 6; k++) {
      float a = 1.5708 + float(k) * 1.0472;
      vec2 dir = vec2(cos(a), sin(a));
      float along = dot(p, dir);
      float perp = abs(p.x * dir.y - p.y * dir.x);
      sp = max(sp, (1.0 - smoothstep(0.0, px * 1.4, perp)) * step(0.0, along) * crown);
    }
    col = mix(col, col * (0.8 + 0.3 * h1(sec + 3.0)) + uHue * 0.15, crown * 0.6 * uCut);
    col += mix(uHue, vec3(1.0), 0.5) * max(lt * 0.75, sp * 0.55) * uCut;
  }
  // the rim: about 3 px of the jewel's colour, white-hot on hover
  float rw = 1.6 * px;
  float rim = 1.0 - smoothstep(rw - px * 0.8, rw + px * 0.8, abs(d + rw));
  col = mix(col, mix(uHue, vec3(1.0), 0.18 + 0.55 * uFlare) * (1.12 + 0.3 * uFlare), rim);
  // a glint that sweeps across now and then
  float sweep = fract(uTime * 0.09 + h1(uHue.r * 7.0 + uHue.g));
  float gl = exp(-pow((p.x + p.y * 0.6) - (sweep * 5.0 - 2.5), 2.0) * 80.0);
  col += vec3(1.0) * gl * 0.16 * inside * (1.0 - uCut);
  // light round the gem: a tight glow of about 12 px, wider on hover
  float o = max(d, 0.0) / px;
  float glow = exp(-o / 4.5) * (0.85 + 0.4 * uFlare) + exp(-o / 15.0) * (0.22 + 0.5 * uFlare);
  float sx = exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 2.2) * uFlare * 1.1;
  float fade = smoothstep(1.0, 0.82, max(abs(p.x), abs(p.y)));
  vec3 halo = (uHue * glow + mix(uHue, vec3(1.0), 0.5) * sx) * fade;
  float a = inside * uShow;
  vec3 outc = col * a * uDim + halo * uShow * mix(1.0, uDim, 0.6) * (1.0 - inside);
  gl_FragColor = vec4(outc * uIgnite, a);
}
`

const lineVert = /* glsl */ `
attribute float aT;
attribute float aS;
uniform vec3 uA;
uniform vec3 uB;
uniform vec2 uRes;
uniform float uW0;
uniform float uW1;
varying float vT;
varying float vS;
void main() {
  vec3 P = mix(uA, uB, aT);
  vec4 c0 = projectionMatrix * viewMatrix * vec4(P, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(P + (uB - uA) * 0.002, 1.0);
  vec2 s0 = c0.xy / c0.w;
  vec2 s1 = c1.xy / c1.w;
  vec2 dd = (s1 - s0) * uRes;
  vec2 d = length(dd) > 1e-6 ? normalize(dd) : vec2(1.0, 0.0);
  vec2 n = vec2(-d.y, d.x);
  float w = mix(uW0, uW1, aT);
  c0.xy += n * aS * w / uRes * 2.0 * c0.w;
  gl_Position = c0;
  vT = aT;
  vS = aS;
}
`
const beamFrag = /* glsl */ `
precision highp float;
uniform vec3 uHue;
uniform float uFlare;
uniform float uTime;
uniform float uIgnite;
varying float vT;
varying float vS;
void main() {
  float core = exp(-vS * vS * 9.0);
  float flow = 0.6 + 0.4 * sin(vT * 40.0 - uTime * 8.0);
  float a = core * (0.4 + 0.6 * flow) * smoothstep(0.0, 0.06, vT) * (0.25 + 0.75 * smoothstep(1.0, 0.2, vT));
  vec3 col = mix(uHue, vec3(1.0), core * 0.45) * a * uFlare * 1.3;
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`
const rayFrag = /* glsl */ `
precision highp float;
uniform vec3 uHue;
uniform float uFlare;
uniform float uShow;
uniform float uTime;
uniform float uIgnite;
varying float vT;
varying float vS;
void main() {
  float core = exp(-vS * vS * 14.0);
  float soft = exp(-vS * vS * 2.2) * 0.35;
  float ends = smoothstep(0.0, 0.22, vT) * smoothstep(1.0, 0.78, vT);
  float pulse = exp(-pow(fract(vT - uTime * 0.35) - 0.5, 2.0) * 90.0) * 0.8;
  vec3 col = (vec3(1.0, 0.92, 0.98) * core * (1.1 + pulse) + uHue * (soft + core * 0.5)) * ends;
  float grow = smoothstep(uShow * 1.4 - 0.4, uShow * 1.4 - 0.4 + 0.08, abs(vT - 0.5) * 2.0);
  gl_FragColor = vec4(col * (1.0 - grow) * (0.85 + 0.6 * uFlare) * uIgnite, 1.0);
}
`
// the starlight that falls on the figure, and the colours it leaves by on the other side
const shaftFrag = /* glsl */ `
precision highp float;
uniform float uIgnite;
uniform float uGain;
uniform float uTime;
varying float vT;
varying float vS;
void main() {
  float shimmer = 0.88 + 0.12 * sin(vT * 30.0 - uTime * 2.0);
  float across = exp(-vS * vS * 2.6);
  float along = smoothstep(0.05, 0.7, vT) * smoothstep(1.0, 0.93, vT);
  gl_FragColor = vec4(vec3(0.82, 0.86, 1.0) * across * along * uGain * shimmer * uIgnite, 1.0);
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
uniform vec3 uStarDir;
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
  vec3 col = mix(vec3(0.006, 0.026, 0.040), vec3(0.048, 0.012, 0.112), smoothstep(-0.55, 0.55, d.y + (n1 - 0.5) * 0.9));
  col *= 0.55 + 0.75 * n1;
  // a few broad folds of faint light
  float fold = smoothstep(0.42, 0.92, n2) * (0.45 + 0.55 * n3);
  col += fold * fold * mix(vec3(0.22, 0.05, 0.36), vec3(0.03, 0.22, 0.30), smoothstep(0.3, 0.75, n1)) * 0.55;
  float fold2 = smoothstep(0.55, 1.0, vn(d * 1.7 + vec3(11.0, 2.0, uTime * 0.003) + n2));
  col += fold2 * fold2 * vec3(0.30, 0.12, 0.10) * 0.2;
  // the star lights the dark round it
  float sd = max(dot(d, normalize(uStarDir)), 0.0);
  col += vec3(0.20, 0.10, 0.42) * pow(sd, 40.0) * 0.5 + vec3(0.35, 0.40, 0.75) * pow(sd, 400.0) * 0.4;
  // a handful of far suns, not a wallpaper
  vec3 g = d * 150.0;
  vec3 id = floor(g);
  float h = hsh(id);
  float pt = smoothstep(0.30, 0.0, length(fract(g) - 0.5)) * step(0.9975, h);
  col += pt * mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.8, 0.9), fract(h * 91.0)) * (0.35 + 0.65 * fract(h * 37.0));
  col *= uIgnite;
  col += (hsh(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 200.0;
  gl_FragColor = vec4(col, 1.0);
}
`

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
    v(b[0], 0, b[1], [1, 1, 0], [0, 0])
    v(a[0], 0, a[1], [0, 1, 0], [0, 0])
    v(a[0], 1, a[1], [0, 1, 1], [1, 0])
    v(b[0], 0, b[1], [1, 0, 1], [0, 0])
    v(a[0], 1, a[1], [0, 1, 1], [1, 0])
    v(b[0], 1, b[1], [0, 0, 1], [1, 0])
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

function lineGeometry(seg: number): THREE.BufferGeometry {
  const t: number[] = []
  const s: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= seg; i++) {
    t.push(i / seg, i / seg)
    s.push(-1, 1)
    if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1))
  g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1))
  // three needs a position attribute to count vertices
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(t.length * 3).fill(0), 3))
  g.setIndex(idx)
  return g
}

interface Pose {
  pos: THREE.Vector3
  tgt: THREE.Vector3
  /** where the target sits on screen, as shares of width and height */
  cx: number
  cy: number
  fov: number
}
const copyPose = (p: Pose): Pose => ({ pos: p.pos.clone(), tgt: p.tgt.clone(), cx: p.cx, cy: p.cy, fov: p.fov })

export class CrystalScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.01, 400)
  private group = new THREE.Group()
  private disposables: { dispose(): void }[] = []
  private raf = 0
  private running = false
  private active = true
  private last = 0
  private time = 0
  private swayT = 0
  private w = 1
  private h = 1
  private dpr = 1
  private slow = 0
  private frames = 0
  private lost = false
  private disposed = false

  private common = { uTime: { value: 0 }, uIgnite: { value: 0 }, uCam: { value: new THREE.Vector3() }, uStar: { value: new THREE.Vector3(3, 2, -9) }, uGrow: { value: 0 }, uFly: { value: 0 } }
  private jPos = Array.from({ length: 6 }, () => new THREE.Vector3())
  private jCol = CHECKS.map((c) => hex(c.hue))
  private jPow = [0, 0, 0, 0, 0, 0]
  private flare = [0, 0, 0, 0, 0, 0]
  private jLocal = CHECKS.map((c) => new THREE.Vector3(...c.at))
  private jewelMats: THREE.ShaderMaterial[] = []
  private jewels: THREE.Mesh[] = []
  private beamMats: THREE.ShaderMaterial[] = []
  private rayMat!: THREE.ShaderMaterial
  private shaftIn!: THREE.ShaderMaterial
  private bodyMats: THREE.ShaderMaterial[] = []
  private skyMat!: THREE.ShaderMaterial
  private star!: THREE.Mesh
  private aura!: THREE.Mesh
  private bodyIn = false
  private frozen = false
  private sheen: THREE.Mesh | null = null
  private loaded = 0

  private home!: Pose
  private from!: Pose
  private to!: Pose
  private cur: Pose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), cx: 0.5, cy: 0.5, fov: 30 }
  private k = 1
  private dur = 1
  private t0 = 0
  private safety = 0
  private target: number | null = null
  private arrived = true
  private landed = 0
  private hover: number | null = null
  private intro = 0
  private introT0 = 0
  private introDur = 1.15
  private ready = false
  private px = 0
  private py = 0
  private homeW = 1

  private v = new THREE.Vector3()
  private v2 = new THREE.Vector3()
  private right = new THREE.Vector3()
  private up = new THREE.Vector3()
  private vis: string[] = ['', '', '', '', '', '']
  /** the names' column: its right edge, and each name's height (px) */
  private colX = 0
  private cardMax = 0
  private labelY = [0, 0, 0, 0, 0, 0]

  private host: HTMLElement
  private ctl: CrystalCtl
  private opt: CrystalOptions

  constructor(host: HTMLElement, ctl: CrystalCtl, opt: CrystalOptions) {
    this.host = host
    this.ctl = ctl
    this.opt = opt
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false })
    this.renderer = renderer
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.setClearColor(0x04030c, 1)
    this.dpr = Math.min(window.devicePixelRatio || 1, opt.tall ? 1.35 : 1.5)
    renderer.setPixelRatio(this.dpr)
    renderer.domElement.className = 'v11-canvas'
    host.appendChild(renderer.domElement)
    renderer.domElement.addEventListener('webglcontextlost', this.onLost)

    this.group.quaternion.setFromEuler(BASE_ROT)
    this.scene.add(this.group)
    this.build()
    this.resize()

    this.target = opt.startAt
    // the page shows a still of this very frame underneath until the live scene is ready, so the figure starts
    // whole (no growing in): the canvas fades in over its own picture
    this.intro = 1
    this.from = this.to = opt.startAt != null ? this.endPose(opt.startAt) : this.home
    this.k = 1
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVis)
    loadBody()
      .then((b) => {
        if (!this.disposed) this.addBody(b)
      })
      .catch(() => this.ctl.onFail())
  }

  // ------------------------------------------------------------------------------------------------- the world
  private mat(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>, extra: THREE.ShaderMaterialParameters = {}) {
    const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...this.common, ...uniforms }, ...extra })
    this.disposables.push(m)
    return m
  }
  private jewelUniforms() {
    return { uJPos: { value: this.jPos }, uJCol: { value: this.jCol }, uJPow: { value: this.jPow } }
  }

  private build() {
    const { scene } = this
    const add = { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true } as const

    const skyGeo = new THREE.IcosahedronGeometry(60, 3)
    this.disposables.push(skyGeo)
    this.skyMat = this.mat(skyVert, skyFrag, { uStarDir: { value: new THREE.Vector3(0.3, 0.2, -1) } }, { side: THREE.BackSide, depthWrite: false, depthTest: false })
    const sky = new THREE.Mesh(skyGeo, this.skyMat)
    sky.frustumCulled = false
    sky.renderOrder = -10
    scene.add(sky)

    const quad = new THREE.PlaneGeometry(1, 1)
    this.disposables.push(quad)
    this.star = new THREE.Mesh(quad, this.mat(billVert, starFrag, { uSize: { value: 15 } }, { ...add, depthTest: true }))
    this.star.frustumCulled = false
    this.star.renderOrder = -5
    scene.add(this.star)

    this.aura = new THREE.Mesh(quad, this.mat(billVert, auraFrag, { uSize: { value: 4.2 } }, { ...add, depthTest: true }))
    this.aura.frustumCulled = false
    this.aura.renderOrder = -4
    scene.add(this.aura)

    // the six jewels, drawn over the glass, then the glass's edges drawn over them
    const loader = new THREE.TextureLoader()
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy()
    CHECKS.forEach((c, i) => {
      const tex = loader.load(
        c.img,
        () => this.loaded++,
        undefined,
        () => this.loaded++,
      )
      tex.anisotropy = Math.min(8, maxAniso)
      tex.minFilter = THREE.LinearMipmapLinearFilter
      this.disposables.push(tex)
      const m = this.mat(
        billVert,
        jewelFrag,
        {
          uTex: { value: tex },
          uCrop: { value: new THREE.Vector4(...c.crop) },
          uHue: { value: this.jCol[i] },
          uFlare: { value: 0 },
          uShow: { value: 0 },
          uCut: { value: 0 },
          uDim: { value: 1 },
          uSize: { value: c.size * JEWEL_QUAD },
        },
        { transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor },
      )
      const j = new THREE.Mesh(quad, m)
      j.position.copy(this.jLocal[i])
      j.frustumCulled = false
      j.renderOrder = 4 + (i === 0 ? 0.5 : 0)
      this.group.add(j)
      this.jewels.push(j)
      this.jewelMats.push(m)
    })

    // a heavy ion's straight track through the TrackTrace jewel, and the beams that reach the star on hover
    const lg = lineGeometry(48)
    this.disposables.push(lg)
    this.rayMat = this.mat(lineVert, rayFrag, { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uRes: { value: new THREE.Vector2(1, 1) }, uW0: { value: 9 }, uW1: { value: 9 }, uHue: { value: this.jCol[0] }, uFlare: { value: 0 }, uShow: { value: 0 } }, { ...add, depthTest: false, side: THREE.DoubleSide })
    const ray = new THREE.Mesh(lg, this.rayMat)
    ray.frustumCulled = false
    ray.renderOrder = 3
    scene.add(ray)
    this.shaftIn = this.mat(lineVert, shaftFrag, { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uRes: { value: new THREE.Vector2(1, 1) }, uW0: { value: 4 }, uW1: { value: 70 }, uGain: { value: 0.1 } }, { ...add, depthTest: true, side: THREE.DoubleSide })
    const sh = new THREE.Mesh(lg, this.shaftIn)
    sh.frustumCulled = false
    sh.renderOrder = -3
    scene.add(sh)
    for (let i = 0; i < 6; i++) {
      const bm = this.mat(lineVert, beamFrag, { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uRes: { value: new THREE.Vector2(1, 1) }, uW0: { value: 14 }, uW1: { value: 3 }, uHue: { value: this.jCol[i] }, uFlare: { value: 0 } }, { ...add, depthTest: false, side: THREE.DoubleSide })
      const b = new THREE.Mesh(lg, bm)
      b.frustumCulled = false
      b.renderOrder = 2
      scene.add(b)
      this.beamMats.push(bm)
    }
  }

  private addBody(b: BodyMesh) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(b.position, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(b.normal, 3))
    geo.setAttribute('aBary', new THREE.BufferAttribute(b.bary, 3))
    geo.setAttribute('aFacet', new THREE.BufferAttribute(b.facet, 3))
    geo.setAttribute('aCorner', new THREE.BufferAttribute(b.corner, 3))
    this.disposables.push(geo)
    const body = new THREE.Mesh(geo, this.mat(bodyVert, bodyFrag, { ...this.jewelUniforms(), uSheen: { value: 0 } }, { side: THREE.DoubleSide }))
    body.frustumCulled = false
    this.group.add(body)
    const sheen = new THREE.Mesh(geo, this.mat(bodyVert, bodyFrag, { ...this.jewelUniforms(), uSheen: { value: 1 } }, { side: THREE.FrontSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))
    sheen.frustumCulled = false
    sheen.renderOrder = 6
    sheen.visible = false
    this.sheen = sheen
    this.group.add(sheen)
    this.bodyMats.push(body.material as THREE.ShaderMaterial, sheen.material as THREE.ShaderMaterial)

    // a soft glow round the figure's outline: the back of a slightly larger shell, brightest at its rim
    geo.setAttribute('aSmooth', new THREE.BufferAttribute(b.smooth, 3))
    const glow = new THREE.Mesh(geo, this.mat(glowVert, glowFrag, { uPush: { value: 0.022 } }, { side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))
    glow.frustumCulled = false
    glow.renderOrder = 1
    this.group.add(glow)

    const sg = crystalGeometry()
    sg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(b.shardSeed, 4))
    this.disposables.push(sg)
    const shards = new THREE.InstancedMesh(sg, this.mat(shardVert, shardFrag, this.jewelUniforms(), { side: THREE.DoubleSide }), b.shards)
    shards.instanceMatrix.array.set(b.shardMatrix)
    shards.instanceMatrix.needsUpdate = true
    shards.frustumCulled = false
    this.group.add(shards)
    this.bodyIn = true
    this.wake()
  }

  // ------------------------------------------------------------------------------------------------- the camera
  /** Frames the figure: its box fills a share of the screen height (and width on a phone), centred where the layout wants it. */
  private frame() {
    const { opt, camera } = this
    const q = new THREE.Quaternion().setFromEuler(BASE_ROT)
    const mn = new THREE.Vector3(Infinity, Infinity, Infinity)
    const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
    for (const [x, y, z, r] of SPHERES) {
      this.v.set(x, y, z).applyQuaternion(q)
      mn.min(this.v2.copy(this.v).subScalar(r))
      mx.max(this.v2.copy(this.v).addScalar(r))
    }
    const ctr = mn.clone().add(mx).multiplyScalar(0.5)
    const aspect = this.w / this.h
    const fov = 30
    const t = Math.tan((fov * Math.PI) / 360)
    const fH = opt.tall ? 0.62 : 0.86
    const fW = opt.tall ? 0.66 : 0.6
    const dH = (mx.y - mn.y) / 2 / fH / t
    const dW = (mx.x - mn.x) / 2 / fW / (t * aspect)
    const dist = Math.max(dH, dW) + (mx.z - ctr.z) * 0.4
    const pos = ctr.clone().add(this.v.set(0, 0, dist))
    this.home = { pos, tgt: ctr, cx: opt.tall ? 0.645 : 0.535, cy: opt.tall ? 0.63 : 0.5, fov }
    // the star sits at a fixed place on screen, far behind the figure, just beyond the reaching hand
    camera.fov = fov
    camera.aspect = aspect
    this.applyPose(this.home)
    const sx = opt.tall ? 0.86 : 0.775
    const sy = opt.tall ? 0.34 : 0.13
    this.v.set(sx * 2 - 1, -(sy * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize()
    const star = this.common.uStar.value.copy(camera.position).addScaledVector(this.v, 16)
    this.star.position.copy(star)
    this.skyMat.uniforms.uStarDir.value.copy(star).sub(ctr)
    this.aura.position.copy(ctr).addScaledVector(this.v.set(0, 0, -1), 0.6)
    this.layout(q)
  }

  /** The names stand in one column on the figure's left, right-aligned a little clear of its outline, each at its
   *  jewel's height (spread apart where two would touch). Worked out once per size, at the figure's resting pose. */
  private layout(q: THREE.Quaternion) {
    const { camera, w, h } = this
    const ys: number[] = []
    for (let i = 0; i < 6; i++) {
      this.v.copy(this.jLocal[i]).applyQuaternion(q).project(camera)
      ys.push((-this.v.y * 0.5 + 0.5) * h)
    }
    const lo = Math.min(...ys) - 40
    const hi = Math.max(...ys) + 40
    let left = Infinity
    for (const [x, y, z, r] of SPHERES) {
      this.v.set(x, y, z).applyQuaternion(q)
      this.v2.copy(this.v).addScaledVector(this.right.set(1, 0, 0).applyQuaternion(camera.quaternion), r).project(camera)
      this.v.project(camera)
      const sx = (this.v.x * 0.5 + 0.5) * w
      const sy = (-this.v.y * 0.5 + 0.5) * h
      const sr = Math.abs((this.v2.x * 0.5 + 0.5) * w - sx)
      if (sy + sr < lo || sy - sr > hi) continue
      left = Math.min(left, sx - sr)
    }
    // the slow turn swings the outline a little: keep clear of its widest reach
    this.colX = Math.max(this.opt.tall ? 112 : 200, left - (this.opt.tall ? 6 : 30))
    const gap = this.opt.tall ? 30 : Math.max(40, h * 0.052)
    const order = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0])
    const out = order.map((o) => o[0])
    for (let k = 1; k < out.length; k++) out[k] = Math.max(out[k], out[k - 1] + gap)
    const top = this.opt.tall ? h * 0.3 : 34
    if (out[0] < top) {
      const d = top - out[0]
      for (let k = 0; k < out.length; k++) out[k] += d
    }
    for (let k = out.length - 2; k >= 0; k--) out[k] = Math.min(out[k], out[k + 1] - gap)
    order.forEach((o, k) => (this.labelY[o[1]] = out[k]))
    // a card never opens over the title below the names
    const title = this.host.parentElement?.querySelector('.v11-title')?.getBoundingClientRect()
    this.cardMax = this.opt.tall || !title ? h - 18 : title.top - 14
  }

  private endPose(i: number): Pose {
    const c = CHECKS[i]
    this.group.updateMatrixWorld()
    const J = this.v2.copy(this.jLocal[i]).applyMatrix4(this.group.matrixWorld).clone()
    const from = this.home.pos
    const dir = from.clone().sub(J).normalize()
    const t = Math.tan((this.home.fov * Math.PI) / 360)
    const aspect = this.w / this.h
    // close enough that the jewel's table covers the screen
    const table = c.size * 1.3 * 0.64
    const d = Math.min(table / (2 * t * aspect), (table * 1.15) / (2 * t)) * 0.92
    return { pos: J.clone().addScaledVector(dir, d), tgt: J, cx: 0.5, cy: 0.5, fov: this.home.fov }
  }

  private applyPose(p: Pose) {
    const { camera } = this
    camera.position.copy(p.pos)
    camera.up.set(0, 1, 0)
    camera.lookAt(p.tgt)
    camera.fov = p.fov
    camera.setViewOffset(this.w, this.h, -(p.cx - 0.5) * this.w, -(p.cy - 0.5) * this.h, this.w, this.h)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }

  setTarget(i: number | null, snap = false) {
    if (i === this.target && !snap) return
    this.from = copyPose(this.current())
    this.to = i == null ? this.home : this.endPose(i)
    this.dur = i == null ? 1.0 : 0.95
    this.k = snap || this.opt.reduced ? 1 : 0
    this.t0 = performance.now()
    this.target = i
    this.arrived = snap
    this.landed = 0
    if (this.ctl.flash && i != null && !snap) this.ctl.flash.style.opacity = '0'
    window.clearTimeout(this.safety)
    if (!snap && this.opt.hold == null) this.safety = window.setTimeout(() => this.arrive(), (this.k >= 1 ? 0 : this.dur * 1000) + 250)
    this.wake()
  }
  private arrive() {
    if (this.arrived) return
    this.arrived = true
    this.landed = performance.now()
    this.k = 1
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

  private current(): Pose {
    const { from, to, cur } = this
    const e = ease(this.k)
    cur.pos.lerpVectors(from.pos, to.pos, e)
    cur.tgt.lerpVectors(from.tgt, to.tgt, ease(Math.min(1, this.k * 1.25)))
    cur.cx = from.cx + (to.cx - from.cx) * e
    cur.cy = from.cy + (to.cy - from.cy) * e
    // a little wider in the middle of the move: the feel of speed
    cur.fov = from.fov + (to.fov - from.fov) * e + Math.sin(Math.PI * e) * 7
    return cur
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
    this.frame()
    for (const m of [this.rayMat, this.shaftIn, ...this.beamMats]) m.uniforms.uRes.value.set(w, h)
    if (this.target != null && this.arrived) this.from = this.to = this.endPose(this.target)
    else if (this.target == null && this.k >= 1) this.from = this.to = this.home
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
    const dt = Math.min(delta, 0.05)
    // nothing drifts until the scene is shown: its first visible frame is the still picture under it
    const live = this.ready && !this.frozen
    if (live) this.time += dt
    const { opt, ctl, camera } = this
    const wall = performance.now()

    // the opening: the crystal grows from the core out once the body is cut and the first frame is drawn
    if (this.intro < 1 && this.bodyIn) {
      if (!this.introT0) this.introT0 = this.frames > 0 ? wall : 0
      if (this.introT0) this.intro = Math.min(1, (wall - this.introT0) / 1000 / this.introDur)
    }
    const grown = this.bodyIn ? (opt.reduced || this.opt.startAt != null ? 1.3 : 0) : 0
    const ie = easeOut(this.intro)
    this.common.uTime.value = this.time
    this.common.uIgnite.value = 0.35 + 0.65 * easeOut(Math.min(1, this.intro * 1.8 + (this.bodyIn ? 0.1 : 0)))
    this.common.uGrow.value = Math.max(grown, this.bodyIn ? this.intro * 1.3 : 0)
    // the jewels appear as the growth reaches them
    const grow = this.common.uGrow.value

    if (this.k < 1) this.k = Math.min(1, (wall - this.t0) / 1000 / this.dur)
    if (opt.hold != null && this.target != null && this.k > opt.hold) this.k = opt.hold
    const atHome = this.target == null
    this.homeW += ((atHome ? ease(this.k) : 1 - ease(Math.min(1, this.k * 2.5))) - this.homeW) * Math.min(1, dt * 6)
    const hw = this.homeW
    const fly = clamp01(1 - hw)
    this.common.uFly.value = fly
    // drawn while the still is still showing too, so its shader is compiled before anyone presses
    if (this.sheen) this.sheen.visible = fly > 0.002 || !this.ready
    // the figure turns slowly while nobody is flying
    if (atHome && this.k >= 1 && !opt.reduced && live) this.swayT += dt
    const sw = this.swayT
    this.group.quaternion.setFromEuler(BASE_ROT)
    this.group.rotateY(0.2 * Math.sin(sw * 0.21) + (1 - ie) * 0.35)
    this.group.rotateZ(0.025 * Math.sin(sw * 0.33 + 1.0))
    this.group.position.set(0, 0.018 * Math.sin(sw * 0.4), 0)
    this.group.updateMatrixWorld()

    if (live) {
      this.px += (ctl.pointer[0] - this.px) * Math.min(1, dt * 2.4)
      this.py += (ctl.pointer[1] - this.py) * Math.min(1, dt * 2.4)
    }
    const pose = this.current()
    this.applyPose(pose)
    // the mouse orbits the camera a little round the figure; the opening pulls in from a little further back
    const drift = opt.reduced ? 0 : 1
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    const dist = camera.position.distanceTo(pose.tgt)
    camera.position.addScaledVector(this.right, hw * dist * (this.px * 0.09 + drift * Math.sin(this.time * 0.13) * 0.012))
    camera.position.addScaledVector(this.up, hw * dist * (-this.py * 0.05 + drift * Math.sin(this.time * 0.09 + 1.3) * 0.008))
    camera.position.addScaledVector(this.v.copy(camera.position).sub(pose.tgt).normalize(), hw * (1 - ie) * dist * 0.14)
    camera.lookAt(pose.tgt)
    camera.updateMatrixWorld()
    this.common.uCam.value.copy(camera.position)

    // jewels: where they are, how bright, and which one flares
    const hot = this.target != null ? this.target : this.hover
    for (let i = 0; i < 6; i++) {
      this.jPos[i].copy(this.jLocal[i]).applyMatrix4(this.group.matrixWorld)
      const goal = hot === i ? 1 : 0
      this.flare[i] += (goal - this.flare[i]) * Math.min(1, dt * 8)
      const f = this.flare[i]
      const show = clamp01((grow - (i === 0 ? 0.05 : 0.3)) / 0.35)
      const breathe = 0.55 + 0.08 * Math.sin(this.time * 0.9 + i * 1.7)
      this.jPow[i] = (breathe + 1.1 * f) * show
      const m = this.jewelMats[i].uniforms
      m.uFlare.value = f
      m.uShow.value = show
      m.uDim.value = hot != null && hot !== i && this.target == null ? 0.62 : 1
      m.uCut.value = fly
      // a hovered jewel swells a little; its card shows the picture large
      m.uSize.value = CHECKS[i].size * JEWEL_QUAD * (1 + 0.12 * f * hw) * (0.6 + 0.4 * easeOut(show))
      this.jewels[i].renderOrder = 4 + f + (i === 0 ? 0.01 : 0)
      const bm = this.beamMats[i].uniforms
      bm.uFlare.value = f * hw
      bm.uA.value.copy(this.jPos[i])
      bm.uB.value.copy(this.common.uStar.value)
    }
    // the ion's track: fixed on screen at a steep angle through the TrackTrace jewel
    const J = this.jPos[0]
    const len = 0.7
    this.v.copy(this.right).multiplyScalar(Math.cos(1.16)).addScaledVector(this.up, Math.sin(1.16))
    this.rayMat.uniforms.uA.value.copy(J).addScaledVector(this.v, -len)
    this.rayMat.uniforms.uB.value.copy(J).addScaledVector(this.v, len)
    this.rayMat.uniforms.uShow.value = clamp01((grow - 0.1) / 0.6)
    this.rayMat.uniforms.uFlare.value = this.flare[0]
    this.rayMat.uniforms.uW0.value = this.rayMat.uniforms.uW1.value = Math.max(6, this.h * 0.011)
    // starlight in from the star to the chest, and out the back of the figure split into colour
    const chest = this.v2.copy(this.jPos[1])
    const k1 = this.h / 900
    this.shaftIn.uniforms.uA.value.copy(this.common.uStar.value)
    this.shaftIn.uniforms.uB.value.copy(chest)
    this.shaftIn.uniforms.uW1.value = 80 * k1
    this.shaftIn.uniforms.uGain.value = 0.2 * hw

    this.renderer.render(this.scene, camera)
    this.frames++
    this.place()
    // a short light as the camera enters the jewel: it rises over the last 0.14 s and is gone 0.25 s after landing,
    // whether or not the page has appeared yet (the jewel's picture fills the screen meanwhile)
    if (ctl.flash && this.target != null) {
      if (this.k < 1) {
        const f = clamp01(1 - (this.dur * (1 - this.k)) / 0.14)
        ctl.flash.style.opacity = (0.5 * f * f * (3 - 2 * f)).toFixed(3)
      } else if (this.landed) ctl.flash.style.opacity = (0.5 * clamp01(1 - (wall - this.landed) / 250)).toFixed(3)
    }

    if (!this.ready && this.bodyIn && this.loaded >= 6 && this.intro >= 1 && this.frames > 2) {
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

  /** Puts each DOM button over its jewel, its name in the column on the figure's left, and a leader between them. */
  private place() {
    const { ctl, camera, w, h, v } = this
    // the open card's span: names it would half cover step out of sight
    const ch = 300
    const hot = this.target == null ? this.hover : null
    const cc = hot != null ? Math.max(ch / 2 + 18, Math.min(this.cardMax - ch / 2, this.labelY[hot])) : 0
    for (let i = 0; i < 6; i++) {
      const el = ctl.buttons[i]
      if (!el) continue
      const c = CHECKS[i]
      v.copy(this.jPos[i]).project(camera)
      let ok = v.z < 1 && v.z > -1
      const x = (v.x * 0.5 + 0.5) * w
      const y = (-v.y * 0.5 + 0.5) * h
      // the jewel's size on screen (half its width across the flats)
      v.copy(this.jPos[i]).addScaledVector(this.right, c.size * 0.5).project(camera)
      const r = Math.abs((v.x * 0.5 + 0.5) * w - x)
      if (ok && (x < -40 || x > w + 40 || y < -40 || y > h + 40 || r > w * 0.4)) ok = false
      const vis = ok ? '1' : '0'
      if (this.vis[i] !== vis) {
        this.vis[i] = vis
        el.dataset.vis = vis
      }
      if (!ok) continue
      const lx = this.colX - x
      const ly = this.labelY[i] - y
      // the leader: from just right of the name to the jewel's rim
      const ax = this.colX + 2
      const ay = this.labelY[i]
      const dx = x - ax
      const dy = y - ay
      const len = Math.hypot(dx, dy) - r * 1.08 - 3
      const s = r * 2.3
      const st = el.style
      st.transform = `translate3d(${(x - s / 2).toFixed(1)}px, ${(y - s / 2).toFixed(1)}px, 0)`
      st.width = st.height = `${s.toFixed(1)}px`
      st.setProperty('--gw', `${(r * 2.4 + 16).toFixed(1)}px`)
      st.setProperty('--lx', `${lx.toFixed(1)}px`)
      st.setProperty('--ly', `${ly.toFixed(1)}px`)
      st.setProperty('--ll', `${Math.max(0, len).toFixed(1)}px`)
      st.setProperty('--la', `${Math.atan2(dy, dx).toFixed(4)}rad`)
      // the card opens on the name's side, kept on screen and clear of the title
      st.setProperty('--cy', `${(Math.max(ch / 2 + 18, Math.min(this.cardMax - ch / 2, ay)) - y).toFixed(1)}px`)
      const under = hot != null && hot !== i && !this.opt.tall && Math.abs(this.labelY[i] - cc) < ch / 2 + 22 ? '1' : '0'
      if (el.dataset.under !== under) el.dataset.under = under
    }
  }

  /** For the still picture: stop all drift at the resting pose. */
  freeze() {
    this.frozen = true
    this.swayT = 0
    this.time = 0
    this.px = this.py = 0
  }
  /** For the still picture: each jewel's place and button size, and its name's place, as shares of the screen. */
  spots(): number[][] {
    const r3 = (x: number) => Math.round(x * 1000) / 1000
    return this.jPos.map((p, i) => {
      this.v.copy(p).project(this.camera)
      const x = this.v.x * 0.5 + 0.5
      this.v2.copy(p).addScaledVector(this.right, CHECKS[i].size * 0.5).project(this.camera)
      const r = Math.abs((this.v2.x - this.v.x) * 0.5) * this.w
      return [r3(x), r3(-this.v.y * 0.5 + 0.5), r3((r * 2.3) / this.h), r3(this.colX / this.w), r3(this.labelY[i] / this.h)]
    })
  }

  dispose() {
    this.disposed = true
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

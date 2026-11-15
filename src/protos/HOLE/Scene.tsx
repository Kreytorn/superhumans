// HOLE "The black hole": one full-screen fragment shader that bends light around a black hole (our own code),
// plus the small simulation that flies the camera, slows time and tells the page where the six lights are on screen.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

/** Shared, mutable link between the page (DOM) and the scene (WebGL). */
export interface HoleCtl {
  /** Index of the light the camera should be at, or null for the wide home view. */
  target: number | null
  hover: number | null
  pointer: [number, number]
  labels: (HTMLElement | null)[]
  clock: HTMLElement | null
  /** Start already arrived (a module route opened directly). */
  snap: boolean
  /** Frames drawn so far (read by the dev scripts to see that a stopped scene really is still). */
  frames: number
  /** Pin the render scale (screenshots): no automatic lowering. */
  pinQuality: boolean
  /** Until this time (performance.now) the scene draws at a low render scale: a check's model may still be busy on the GPU. */
  calmUntil: number
  onArrive(i: number): void
  /** The first move has come to rest (the page's data-ready). */
  onSettled(): void
  onFirstFrame(): void
  /** The WebGL context was lost and could not be rebuilt: show the still drawing. */
  onLost(): void
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

const N_L = 6
const R_L = 8.2 // orbit radius of the six lights, in Schwarzschild radii
const OMEGA = 0.045 // their angular speed at full time, rad/s
const TAN = Math.tan((19 * Math.PI) / 180) // half of the vertical field of view
const R_BOUND = 15
const K0 = 0.03 // step = K0 + K1 * r, the same rule in the shader and in solveImage()
const K1 = 0.09

const vert = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const frag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform vec3 uCam, uRight, uUp, uFwd;
uniform float uTan, uTime, uReal, uHot;
uniform vec3 uLp[6];   // light in the disc plane: x, z, strength
uniform float uLa[6];  // its angle on the orbit
uniform vec4 uLs[6];   // its first image on screen: x, y (buffer px), size px, strength

#define R_IN 2.9
#define R_OUT 12.5
#define R_BOUND ${R_BOUND.toFixed(1)}
#define HAZE_K 3.4

float hsh(vec3 p) {
  p = fract(p * vec3(0.2137, 0.3391, 0.1723) + 0.137);
  p += dot(p, p.zxy + 23.71);
  return fract((p.x + p.y) * p.z * 3.1);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hsh(i), hsh(i + vec3(1, 0, 0)), f.x), mix(hsh(i + vec3(0, 1, 0)), hsh(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(hsh(i + vec3(0, 0, 1)), hsh(i + vec3(1, 0, 1)), f.x), mix(hsh(i + vec3(0, 1, 1)), hsh(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}

// Streaks of the disc: long along the orbit, fine across it.
float lanes(float rr, float a) {
  vec2 cs = vec2(cos(a), sin(a));
  float n1 = vnoise(vec3(cs * 2.4, rr * 1.7));
  float n2 = vnoise(vec3(cs * 3.1 + 11.0, rr * 8.5));
  float n3 = vnoise(vec3(cs * 1.3 + 5.0, rr * 17.0));
  return 0.5 * n1 + 0.28 * n2 + 0.36 * n3;
}

vec4 disc(vec3 hp, vec3 v, float rr) {
  float u = (rr - R_IN) / (R_OUT - R_IN);
  float ang = atan(hp.z, hp.x);
  float om = 2.4 * pow(rr, -1.5);
  const float T = 10.0;
  float ph1 = fract(uTime / T), ph2 = fract(uTime / T + 0.5);
  float w1 = 1.0 - abs(2.0 * ph1 - 1.0);
  float g = mix(lanes(rr, ang - om * T * (ph2 - 0.5)), lanes(rr, ang - om * T * (ph1 - 0.5)), w1);
  float edge = smoothstep(0.0, 0.035, u) * (1.0 - smoothstep(0.5, 1.0, u));
  float dens = edge * (0.16 + 1.9 * g * g * g * 1.6);
  float I = dens * pow(R_IN / rr, 1.9) * 3.4;
  // the side turning toward us is brighter and whiter, the side turning away dimmer and redder
  vec3 tang = normalize(vec3(-hp.z, 0.0, hp.x));
  float beta = sqrt(0.5 / rr);
  float D = sqrt(1.0 - beta * beta) / (1.0 - beta * dot(tang, -normalize(v)));
  float boost = mix(1.0, D * D * D, 0.7);
  vec3 c = mix(vec3(1.0, 0.93, 0.82), vec3(1.0, 0.58, 0.22), smoothstep(0.0, 0.3, u));
  c = mix(c, vec3(0.78, 0.22, 0.05), smoothstep(0.28, 0.95, u));
  c *= mix(vec3(1.0, 0.78, 0.6), vec3(0.94, 0.99, 1.1), smoothstep(0.75, 1.35, D));
  return vec4(c * I * boost, clamp(dens * 0.85, 0.0, 0.9));
}

vec3 sky(vec3 d) {
  vec3 c = vec3(0.0);
  vec2 s = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
  for (int l = 0; l < 2; l++) {
    float cs = l == 0 ? 0.021 : 0.052;
    vec2 g = s / cs;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float fl = float(l) * 7.0;
    float h = hsh(vec3(id, 1.0 + fl));
    vec2 off = (vec2(hsh(vec3(id, 3.0 + fl)), hsh(vec3(id, 5.0 + fl))) - 0.5) * 0.7;
    float dd = length((f - off) * vec2(cos(s.y), 1.0)) * cs;
    float size = l == 0 ? 0.0011 : 0.0017;
    float star = smoothstep(size, 0.0, dd);
    float mag = pow(hsh(vec3(id, 9.0 + fl)), 7.0);
    vec3 tint = mix(vec3(1.0, 0.84, 0.68), vec3(0.74, 0.85, 1.0), hsh(vec3(id, 13.0 + fl)));
    c += step(0.87, h) * star * (0.10 + 1.7 * mag) * tint;
  }
  float n = vnoise(d * 2.1 + 3.0) * vnoise(d * 5.3 - 1.0);
  float band = smoothstep(0.55, 0.0, abs(d.y + 0.25 * d.x - 0.12));
  c += vec3(0.006, 0.009, 0.020) * smoothstep(0.14, 0.6, n) * (0.15 + 0.85 * band);
  return c;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 rd = normalize(uFwd + p.x * uTan * uRight + p.y * uTan * uUp);
  vec3 pos = uCam;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  float glow = 0.0;
  bool live = true;
  bool eaten = false;

  float b = dot(pos, rd);
  float c0 = dot(pos, pos) - R_BOUND * R_BOUND;
  if (c0 > 0.0) {
    float q = b * b - c0;
    if (q < 0.0 || b > 0.0) live = false;
    else pos += rd * (-b - sqrt(q));
  }
  vec3 vel = rd;
  if (live) {
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);
    float ea = exp(-HAZE_K * abs(pos.y));
    float rPrev = length(pos);
    vec3 vPrev = vel;
    for (int i = 0; i < STEPS; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      if (r < 1.0) { eaten = true; break; }
      if (r2 > R_BOUND * R_BOUND * 1.02 && dot(pos, vel) > 0.0) {
        // leave at one exact radius, so neighbouring rays agree on the sky they see
        vel = mix(vPrev, vel, clamp((R_BOUND * 1.01 - rPrev) / max(r - rPrev, 1e-4), 0.0, 1.0));
        break;
      }
      rPrev = r;
      vPrev = vel;
      float dt = ${K0.toFixed(2)} + ${K1.toFixed(2)} * r;
      // light near a non-spinning black hole: pulled toward it by 1.5 h^2 / r^5 (h = its angular momentum)
      vel -= 1.5 * h2 * pos / (r2 * r2 * r) * dt;
      vec3 np = pos + vel * dt;
      float ya = abs(pos.y), yb = abs(np.y);
      float eb = exp(-HAZE_K * yb);
      float seg;
      if (pos.y * np.y < 0.0) {
        seg = (2.0 - ea - eb) / (HAZE_K * (ya + yb) + 1e-4);
        vec3 hp = mix(pos, np, ya / (ya + yb));
        float rr = length(hp.xz);
        vec3 add = vec3(0.0);
        float hang = atan(hp.z, hp.x);
        float lane = exp(-pow((rr - ${R_L.toFixed(1)}) / 0.085, 2.0));
        for (int k = 0; k < 6; k++) {
          vec2 dl = hp.xz - uLp[k].xy;
          float fall = 1.0 / (1.0 + dot(dl, dl) / 0.09);
          // the light, and the short trail it leaves along its orbit
          float back = mod(uLa[k] - hang + 6.2831853, 6.2831853);
          float tail = lane * exp(-back * 4.2) * step(back, 1.6);
          add += vec3(0.62, 0.84, 1.0) * uLp[k].z * (fall * fall * 5.0 + tail * 1.5);
        }
        col += trans * add;
        if (rr > R_IN && rr < R_OUT) {
          vec4 dc = disc(hp, vel, rr);
          col += trans * dc.rgb;
          trans *= 1.0 - dc.a;
        }
      } else {
        float dy = yb - ya;
        seg = abs(dy) < 1e-3 ? ea : (ea - eb) / (HAZE_K * dy);
      }
      float rm = length(0.5 * (pos.xz + np.xz));
      glow += trans * seg * dt * smoothstep(R_IN * 0.85, R_IN * 1.3, rm) * pow(R_IN / max(rm, R_IN), 2.6) * (1.0 - smoothstep(R_OUT * 0.55, R_OUT, rm));
      ea = eb;
      pos = np;
    }
  }
  col += glow * vec3(1.0, 0.6, 0.27) * 0.26;
  if (!eaten) col += trans * sky(normalize(vel));

  // the six lights: a round glow and a thin lens streak at each light's first (bent) image
  for (int k = 0; k < 6; k++) {
    vec4 L = uLs[k];
    float hot = 1.0 - step(0.5, abs(uHot - float(k)));
    float s = L.z * (1.0 + 0.45 * hot);
    vec2 dq = gl_FragCoord.xy - L.xy;
    float d2 = dot(dq, dq) / (s * s);
    float core = exp(-d2 * 2.4);
    float halo = pow(1.0 / (1.0 + d2), 1.7);
    float streak = exp(-abs(dq.y) / (0.15 * s)) / (1.0 + pow(abs(dq.x) / (3.6 * s), 3.0));
    col += L.w * (1.0 + 1.2 * hot) * (vec3(1.0) * core * 2.4 + vec3(0.5, 0.78, 1.0) * (halo * 0.55 + streak * 0.5));
  }

  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(0.4545));
  float vig = 1.0 - 0.22 * dot(p * vec2(0.55, 0.8), p * vec2(0.55, 0.8));
  col *= clamp(vig, 0.0, 1.0);
  col += (hsh(vec3(gl_FragCoord.xy, fract(uReal) * 91.0)) - 0.5) / 160.0;
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * Where a light in the disc plane appears: the same stepping as the shader, in the plane through camera, hole and
 * light, with a bisection on the launch angle. Returns the unit direction (from the camera) of the first image.
 */
function solveImage(cam: THREE.Vector3, L: THREE.Vector3, steps: number, out: THREE.Vector3): boolean {
  const d = cam.length()
  const ex = _a.copy(cam).multiplyScalar(1 / d)
  const ey = _b.copy(L).addScaledVector(ex, -L.dot(ex))
  const eyLen = ey.length()
  if (eyLen < 1e-5) return false
  ey.multiplyScalar(1 / eyLen)
  const lx = L.dot(ex)
  const ly = eyLen
  const rL = Math.hypot(lx, ly)
  const ldx = lx / rL
  const ldy = ly / rL
  const straight = Math.atan2(ly, d - lx)
  let lo = 0
  let hi = Math.min(Math.PI - 0.01, straight + 0.7)
  for (let it = 0; it < 22; it++) {
    const al = 0.5 * (lo + hi)
    if (side(d, al, ldx, ldy, rL, steps) > 0) hi = al
    else lo = al
  }
  const al = 0.5 * (lo + hi)
  out.copy(ex).multiplyScalar(-Math.cos(al)).addScaledVector(ey, Math.sin(al))
  return true
}
/** +1: the ray passes outside the light (or escapes first); -1: inside it (or falls in). */
function side(d: number, al: number, ldx: number, ldy: number, rL: number, steps: number): number {
  let px = d
  let py = 0
  let vx = -Math.cos(al)
  let vy = Math.sin(al)
  if (d > R_BOUND) {
    const b = px * vx
    const q = b * b - (d * d - R_BOUND * R_BOUND)
    if (q < 0 || b > 0) return 1
    const t = -b - Math.sqrt(q)
    px += vx * t
    py += vy * t
  }
  const h = px * vy - py * vx
  const h2 = h * h
  for (let i = 0; i < steps; i++) {
    const r2 = px * px + py * py
    const r = Math.sqrt(r2)
    if (r < 1) return -1
    if (r2 > R_BOUND * R_BOUND * 1.02 && px * vx + py * vy > 0) return 1
    const dt = K0 + K1 * r
    const k = (1.5 * h2 * dt) / (r2 * r2 * r)
    vx -= k * px
    vy -= k * py
    const nx = px + vx * dt
    const ny = py + vy * dt
    const s0 = ldx * py - ldy * px
    const s1 = ldx * ny - ldy * nx
    if (s0 < 0 && s1 >= 0 && nx * ldx + ny * ldy > 0) {
      const f = s0 / (s0 - s1)
      const hx = px + (nx - px) * f
      const hy = py + (ny - py) * f
      return hx * ldx + hy * ldy > rL ? 1 : -1
    }
    px = nx
    py = ny
  }
  return -1
}

interface Pose {
  dist: number
  az: number
  el: number
  roll: number
  look: THREE.Vector3
}
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _l = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const wrap = (x: number) => ((((x + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI

function Rig({ ctl, steps }: { ctl: HoleCtl; steps: number }) {
  const { gl, size, setDpr } = useThree()
  const uniforms = useMemo(
    () => ({
      uRes: { value: new THREE.Vector2(1, 1) },
      uCam: { value: new THREE.Vector3() },
      uRight: { value: new THREE.Vector3() },
      uUp: { value: new THREE.Vector3() },
      uFwd: { value: new THREE.Vector3() },
      uTan: { value: TAN },
      uTime: { value: 0 },
      uReal: { value: 0 },
      uHot: { value: -1 },
      uLp: { value: Array.from({ length: N_L }, () => new THREE.Vector3()) },
      uLs: { value: Array.from({ length: N_L }, () => new THREE.Vector4()) },
      uLa: { value: [0, 0, 0, 0, 0, 0] },
    }),
    [],
  )
  const sim = useRef({
    t: 40,
    theta: 0.42,
    real: 0,
    k: 1,
    dur: 1,
    target: undefined as number | null | undefined,
    from: { dist: 31, az: Math.PI / 2, el: 0.15, roll: -0.09, look: new THREE.Vector3() } as Pose,
    cur: { dist: 31, az: Math.PI / 2, el: 0.15, roll: -0.09, look: new THREE.Vector3() } as Pose,
    want: { dist: 31, az: Math.PI / 2, el: 0.15, roll: -0.09, look: new THREE.Vector3() } as Pose,
    tsFrom: 1,
    tsBase: 1,
    hoverF: 1,
    homeW: 1,
    px: 0,
    py: 0,
    arrived: false,
    first: true,
    // frame-time watch for the automatic render scale
    acc: 0,
    n: 0,
    warm: 0,
    dpr: 0,
    clock: '',
    last: 0,
    intro: false,
    good: 0,
    raises: 0,
    dpr0: 0,
    calm: false,
    settled: false,
    dx: [0, 0, 0, 0, 0, 0],
  })
  const buf = useMemo(() => new THREE.Vector2(), [])

  useFrame(() => {
    const s = sim.current
    ctl.frames++
    // our own wall clock: one honest frame time, whatever the render loop mode is
    const now = performance.now()
    const delta = s.last ? (now - s.last) / 1000 : 0.016
    s.last = now
    const dt = Math.min(delta, 0.05)
    const aspect = size.width / Math.max(1, size.height)
    const tall = aspect < 0.8

    // a change of target starts a new flight from wherever the camera is now
    if (ctl.target !== s.target) {
      const first = s.target === undefined
      s.from = { ...s.cur, look: s.cur.look.clone() }
      s.tsFrom = s.tsBase
      s.dur = ctl.target == null ? (first ? 3.8 : 2.1) : s.target == null || first ? 2.7 : 1.5
      s.k = ctl.snap ? 1 : 0
      s.intro = first && !ctl.snap
      if (ctl.snap) s.tsFrom = 0
      ctl.snap = false
      s.target = ctl.target
      s.arrived = false
    }
    // the flight keeps to wall time even when frames are slow (a model may still be busy on the same GPU)
    s.k = Math.min(1, s.k + Math.min(delta, 0.3) / s.dur)
    const e = ease(s.k)
    s.tsBase = s.target != null ? s.tsFrom * (1 - e) * (1 - e) : s.tsFrom + (1 - s.tsFrom) * e
    const hoverGoal = ctl.hover != null && s.target == null ? 0.22 : 1
    s.hoverF += (hoverGoal - s.hoverF) * Math.min(1, dt * 5)
    const ts = s.tsBase * s.hoverF
    s.t += dt * ts
    s.theta += dt * ts * OMEGA
    s.real += dt

    // desired pose
    const w = s.want
    if (s.target == null) {
      w.dist = tall ? 7.7 / (TAN * aspect) : Math.max(28, 10.6 / (TAN * aspect))
      w.az = Math.PI / 2
      w.el = 0.105
      w.roll = tall ? -0.62 : -0.09
      w.look.set(0, -w.dist * (tall ? 0.028 : 0.05), 0)
    } else {
      const th = s.theta + (s.target * Math.PI * 2) / N_L
      w.dist = 12.6
      w.az = th - 0.55
      w.el = 0.085
      w.roll = 0.16
      w.look.set(Math.cos(th) * R_L * 0.55, -0.35, Math.sin(th) * R_L * 0.55)
    }
    if (s.intro) {
      // opening move: the camera drifts in from far out and above
      s.intro = false
      s.from = { dist: w.dist * 1.9, az: w.az - 0.55, el: 0.34, roll: w.roll - 0.3, look: new THREE.Vector3(0, 0, 0) }
    }
    const c = s.cur
    c.dist = s.from.dist + (w.dist - s.from.dist) * e
    c.el = s.from.el + (w.el - s.from.el) * e
    c.roll = s.from.roll + (w.roll - s.from.roll) * e
    c.az = s.from.az + wrap(w.az - s.from.az) * e
    c.look.copy(s.from.look).lerp(w.look, e)
    if (s.k >= 1) c.az = wrap(c.az)

    // the pointer leans the wide view a little; a slow drift keeps it alive
    s.homeW += ((s.target == null ? 1 : 0) - s.homeW) * Math.min(1, dt * 2.5)
    s.px += (ctl.pointer[0] - s.px) * Math.min(1, dt * 2.2)
    s.py += (ctl.pointer[1] - s.py) * Math.min(1, dt * 2.2)
    const az = c.az + s.homeW * (s.px * 0.11 + 0.035 * Math.sin(s.real * 0.11))
    const el = c.el + s.homeW * (-s.py * 0.045 + 0.012 * Math.sin(s.real * 0.07 + 1.0))

    const cam = uniforms.uCam.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(c.dist)
    const fwd = uniforms.uFwd.value.copy(c.look).sub(cam).normalize()
    const right = uniforms.uRight.value.crossVectors(fwd, UP).normalize()
    const up = uniforms.uUp.value.crossVectors(right, fwd)
    if (c.roll !== 0) {
      right.applyAxisAngle(fwd, c.roll)
      up.applyAxisAngle(fwd, c.roll)
    }

    gl.getDrawingBufferSize(buf)
    uniforms.uRes.value.copy(buf)
    uniforms.uTime.value = s.t
    uniforms.uReal.value = s.real
    uniforms.uHot.value = s.target != null ? s.target : ctl.hover != null ? ctl.hover : -1

    const scale = buf.y / Math.max(1, size.height)
    for (let i = 0; i < N_L; i++) {
      const th = s.theta + (i * Math.PI * 2) / N_L
      _l.set(Math.cos(th) * R_L, 0, Math.sin(th) * R_L)
      const pulse = 0.9 + 0.1 * Math.sin(s.t * 1.3 + i * 1.7)
      uniforms.uLp.value[i].set(_l.x, _l.z, pulse)
      uniforms.uLa.value[i] = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      let shown = false
      let x = 0
      let y = 0
      if (solveImage(cam, _l, steps, _dir)) {
        const z = _dir.dot(fwd)
        if (z > 0.05) {
          x = size.width / 2 + (_dir.dot(right) / z / TAN) * (size.height / 2)
          y = size.height / 2 - (_dir.dot(up) / z / TAN) * (size.height / 2)
          shown = true
        }
      }
      const reach = _a.copy(_l).sub(cam).length()
      const px = Math.min(46, (size.height / 900) * 7.5 * (28 / reach) * (tall ? 1.5 : 1))
      uniforms.uLs.value[i].set(x * scale, (size.height - y) * scale, px * scale, shown ? pulse : 0)
      const el2 = ctl.labels[i]
      if (el2) {
        el2.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        // keep the name on screen when its light is near an edge
        const half = tall ? 58 : 98
        const dx = Math.round(Math.min(Math.max(x, half), size.width - half) - x)
        if (s.dx[i] !== dx) {
          s.dx[i] = dx
          el2.style.setProperty('--dx', `${dx}px`)
        }
        const front = _l.x * cam.x + _l.z * cam.z > 0 ? 'f' : 'b'
        if (el2.dataset.side !== front) el2.dataset.side = front
        const vis = shown && x > -40 && x < size.width + 40 ? '1' : '0'
        if (el2.dataset.vis !== vis) el2.dataset.vis = vis
      }
    }

    if (ctl.clock) {
      const txt = ts > 0.995 ? '1.00' : ts < 0.005 ? '0.00' : ts.toFixed(2)
      if (txt !== s.clock) {
        s.clock = txt
        ctl.clock.textContent = txt
      }
    }
    if (s.first) {
      s.first = false
      ctl.onFirstFrame()
    }
    // settled: the opening move (or a snapped view) has come to rest, so the lights hold still and can be pressed
    if (!s.settled && s.k >= 1) {
      s.settled = true
      ctl.onSettled()
    }
    if (s.target != null && s.k >= 1 && !s.arrived) {
      s.arrived = true
      ctl.onArrive(s.target)
    }

    // right after Back a check's model can still hold the GPU: draw at a low scale for a moment, then return smoothly
    if (!ctl.pinQuality) {
      if (s.dpr === 0) s.dpr = s.dpr0 = gl.getPixelRatio()
      const calm = now < ctl.calmUntil
      if (calm !== s.calm) {
        s.calm = calm
        setDpr(calm ? Math.min(s.dpr, 0.55) : s.dpr)
        s.warm = 0
        s.acc = 0
        s.n = 0
      }
    }
    // automatic render scale: only ever lowers, so a slow laptop settles on a smooth picture
    if (!ctl.pinQuality && !s.calm) {
      if (s.warm < 12) s.warm++
      else {
        s.acc += delta
        s.n++
        if (s.n >= 20) {
          const avg = s.acc / s.n
          s.acc = 0
          s.n = 0
          if (avg > 0.024 && s.dpr > 0.62) {
            s.dpr = Math.max(0.6, s.dpr * (avg > 0.045 ? 0.66 : 0.82))
            setDpr(s.dpr)
            s.warm = 10
            s.good = 0
          } else if (avg < 0.0175 && s.dpr < s.dpr0 && s.raises < 3) {
            // a passing hiccup should not cost sharpness for good: climb back, a few times at most
            if (++s.good >= 4) {
              s.good = 0
              s.raises++
              s.dpr = Math.min(s.dpr0, s.dpr * 1.22)
              setDpr(s.dpr)
              s.warm = 10
            }
          } else s.good = 0
        }
      }
    }
  })

  return (
    <mesh frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        defines={{ STEPS: steps }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function Scene({ ctl, active }: { ctl: HoleCtl; active: boolean }) {
  const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  const cap = touch ? 1.5 : 2
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, cap)
  // Browsers drop the oldest WebGL context when a page opens too many (the checks have canvases of their own):
  // if ours is dropped, build a fresh one where the camera already is; after a few tries, fall back to the still.
  const [gen, setGen] = useState(0)
  return (
    <Canvas
      key={gen}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          window.setTimeout(() => {
            if (gen >= 4) return ctl.onLost()
            ctl.snap = ctl.target != null
            setGen(gen + 1)
          }, 60)
        })
      }}
      className="hole-canvas"
      dpr={dpr}
      frameloop={hidden ? 'never' : active ? 'always' : 'demand'}
      flat
      gl={{ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }}
    >
      <Rig ctl={ctl} steps={touch ? 84 : 112} />
    </Canvas>
  )
}

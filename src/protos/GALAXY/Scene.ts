// The whole home page is this one scene: a person drawn as about a hundred thousand stars, standing on a spiral disc.
// Plain three.js with our own shaders: additive point sprites, no post-processing passes, so it stays smooth on integrated graphics.
import * as THREE from 'three'
import { buildBody, buildDisc, RAY_A, RAY_D } from './body'
import { CHECKS } from './data'

const BODY_VERT = /* glsl */ `
attribute vec3 aNormal;
attribute vec4 aData;
uniform float uTime, uScale, uPart, uDim, uRayHead, uBeat, uMaxPt, uForm;
uniform vec3 uCam, uAxis, uRayA, uRayD;
uniform vec3 uHue[6];
uniform vec3 uSpot[6];
uniform float uHot[6];
varying vec3 vCol;
varying float vA;
void main() {
  float seed = aData.x, kind = aData.y, cl = aData.z;
  float ph = seed * 6.2831853;
  vec3 p = position;
  vec3 col = vec3(0.0);
  float a = 0.0;
  float world = 0.0059 * aData.w;
  float glow = 0.0;
  vec3 pink = vec3(1.0, 0.36, 0.72);

  if (kind < 1.5) {
    // the figure and its halo: breathe along the skin, twinkle
    float amp = kind < 0.5 ? 0.0035 : 0.014;
    p += aNormal * amp * sin(uTime * (0.5 + seed) + ph * 7.0);
    vec3 cool = mix(vec3(0.50, 0.42, 1.0), vec3(0.36, 0.70, 1.0), smoothstep(-1.0, 0.9, position.y + 0.25 * sin(ph * 3.0)));
    vec3 warm = vec3(1.0, 0.78, 0.55);
    col = seed > 0.93 ? warm : mix(cool, vec3(0.80, 0.90, 1.0), pow(fract(seed * 13.7), 3.0));
    // cells lit by the ray that just passed, fading
    vec3 r = position - uRayA;
    float t = dot(r, uRayD);
    float dl = length(r - uRayD * t);
    float behind = uRayHead - t;
    glow = step(0.0, behind) * exp(-behind * 0.3) * exp(-dl * dl / 0.0011);
  } else if (kind < 2.5) {
    int ci = int(cl + 0.5);
    vec3 c0 = uSpot[ci];
    vec3 d = p - c0;
    if (ci == 1) d *= 1.0 + 0.2 * uBeat;
    if (ci == 5) {
      float an = uTime * 0.7;
      d.yz = mat2(cos(an), -sin(an), sin(an), cos(an)) * d.yz;
    }
    p = c0 + d + 0.0035 * vec3(sin(uTime * 1.3 + ph * 11.0), cos(uTime * 1.1 + ph * 17.0), sin(uTime * 0.9 + ph * 5.0));
    col = mix(uHue[ci], vec3(1.0), aData.w > 2.0 ? 0.45 : 0.0);
    a = (ci == 1 ? 0.2 : ci == 5 ? 0.2 : ci == 4 ? 0.3 : ci == 0 ? 0.42 : ci == 3 ? 0.17 : 0.2) * (1.0 + (ci == 1 || ci == 5 ? 0.9 : 1.6) * uHot[ci]);
    if (ci == 2 || ci == 3) a *= 0.8 + 0.45 * sin(p.y * 46.0 + uTime * 3.2 + (ci == 3 ? 1.5 : 0.0));
    if (ci == 4) a *= 0.7 + 0.5 * sin(uTime * (2.0 + seed * 5.0) + ph * 3.0);
    if (ci == 0) a *= 0.75 + 0.9 * exp(-max(uRayHead - 0.9, 0.0) * 0.35) * step(0.9, uRayHead);
    a *= 1.0 - 0.55 * uDim * (1.0 - uHot[ci]);
    world *= 1.3 + 0.5 * uHot[ci];
  } else if (kind < 3.5) {
    int ci = int(cl + 0.5);
    col = uHue[ci];
    a = 0.05 + 0.1 * uHot[ci] + (ci == 1 ? 0.05 * uBeat : 0.0);
    a *= 1.0 - 0.6 * uDim * (1.0 - uHot[ci]);
    world = 0.2 + 0.1 * uHot[ci];
  } else {
    // the cosmic ray: a thin streak with a white head
    float behind = uRayHead - cl;
    a = step(0.0, behind) * exp(-behind * 1.7) * 2.4;
    col = mix(pink, vec3(1.0), exp(-behind * 7.0));
    world = 0.008 + 0.02 * exp(-behind * 14.0);
  }

  // at first load the stars are a loose, flat cloud that swirls in and settles into the person
  float fm = smoothstep(seed * 0.5, seed * 0.5 + 0.5, uForm);
  if (kind < 2.5 && fm < 1.0) {
    vec3 rnd = normalize(vec3(sin(ph * 12.9898), 0.5 * cos(ph * 78.233), sin(ph * 37.719)));
    vec3 far = rnd * (1.1 + 2.7 * fract(seed * 91.7));
    far.y = far.y * 0.45 + p.y * 0.35;
    vec3 q = mix(far, p, fm);
    float an = (1.0 - fm) * (2.2 + 2.4 * fract(seed * 5.3));
    q.xz = mat2(cos(an), -sin(an), sin(an), cos(an)) * q.xz;
    p = q;
  }

  vec4 wp = modelMatrix * vec4(p, 1.0);
  if (kind < 1.5) {
    vec3 wn = normalize(mat3(modelMatrix) * aNormal);
    vec3 v = normalize(uCam - wp.xyz);
    float rim = 1.0 - abs(dot(wn, v));
    float tw = 0.8 + 0.35 * sin(uTime * (0.8 + seed * 2.6) + ph * 13.0);
    float neb = 0.5 + 0.5 * sin(position.y * 8.0 + 1.4 * sin(position.x * 13.0 + position.z * 9.0) - uTime * 0.55);
    a = (kind < 0.5 ? 0.035 + 0.95 * pow(rim, 2.6) : 0.13) * tw * (0.5 + 0.95 * neb * neb);
    if (aData.w > 2.0) { a = max(a, 0.4) * 1.5; col = mix(col, vec3(1.0), 0.6); }
    a *= 1.0 - 0.5 * uDim;
    col = mix(col, pink, clamp(glow * 1.4, 0.0, 1.0));
    a += glow * 2.4;
  }

  // the points part round the line the camera flies along
  vec3 rel = wp.xyz - uCam;
  float al = dot(rel, uAxis);
  vec3 perp = rel - uAxis * al;
  float pd = length(perp) + 1e-5;
  wp.xyz += (perp / pd) * uPart * 0.085 * exp(-pd * pd / 0.02) * smoothstep(0.0, 0.12, al);

  vec4 mv = viewMatrix * wp;
  float px = world * uScale / max(-mv.z, 0.02);
  if (kind > 2.5 && kind < 3.5) {
    gl_PointSize = min(px, uMaxPt);
  } else {
    a *= min(1.0, px * px / 2.2);
    a *= min(1.0, pow(6.0 / max(px, 0.001), 1.15));
    gl_PointSize = clamp(px, 1.5, min(uMaxPt, 56.0));
  }
  a *= kind < 2.5 ? 0.5 + 0.5 * fm : smoothstep(0.85, 1.0, uForm);
  vCol = col;
  vA = a * step(0.02, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

const DISC_VERT = /* glsl */ `
attribute vec4 aData;
uniform float uTime, uScale, uDim, uMaxPt, uForm;
varying vec3 vCol;
varying float vA;
void main() {
  float seed = aData.x, kind = aData.y, r = aData.z;
  vec3 p = position;
  float a;
  vec3 col;
  float world = 0.011 * aData.w;
  if (kind < 0.5) {
    // the arms turn faster near the core, like a real disc
    float an = uTime * 0.085 / (0.35 + r);
    float c = cos(an), s = sin(an);
    p.xz = mat2(c, -s, s, c) * p.xz;
    vec3 core = vec3(1.0, 0.84, 0.66);
    vec3 arm = vec3(0.46, 0.60, 1.0);
    vec3 rimc = vec3(0.72, 0.42, 0.95);
    col = mix(core, arm, smoothstep(0.1, 0.9, r));
    col = mix(col, rimc, smoothstep(1.3, 2.9, r) * fract(seed * 7.3));
    a = (0.05 + 0.2 * aData.y * 0.0 + 0.16 * smoothstep(0.25, 0.7, r)) * (0.75 + 0.35 * sin(uTime * (0.6 + seed * 2.0) + seed * 40.0));
    a *= 1.0 - smoothstep(2.3, 3.0, r);
  } else {
    p.x += 0.05 * sin(uTime * 0.05 + seed * 30.0);
    col = mix(vec3(0.45, 0.55, 0.9), vec3(0.9, 0.75, 0.7), step(0.8, seed));
    a = 0.14 + 0.2 * step(0.93, seed);
    world = 0.02 * aData.w;
  }
  a *= (1.0 - 0.35 * uDim) * smoothstep(0.15, 1.0, uForm);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float px = world * uScale / max(-mv.z, 0.02);
  a *= min(1.0, px * px / 2.2);
  a *= min(1.0, pow(5.0 / max(px, 0.001), 1.5));
  gl_PointSize = clamp(px, 1.5, min(uMaxPt, 48.0));
  vCol = col;
  vA = a * step(0.02, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

const POINT_FRAG = /* glsl */ `
precision mediump float;
varying vec3 vCol;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  float f = exp(-r2 * 4.0) - 0.018;
  if (f <= 0.0) discard;
  gl_FragColor = vec4(vCol * vA * f, 1.0);
}
`

const SKY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uAspect, uClose;
uniform vec2 uC;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = mat2(1.6, -1.2, 1.2, 1.6) * p + 11.7;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 p = vUv - uC;
  p.x *= uAspect;
  float r = length(p);
  vec3 col = vec3(0.010, 0.013, 0.030);
  // a soft light behind the figure
  col += vec3(0.07, 0.12, 0.34) * exp(-r * r * 4.2) * 0.62;
  col += vec3(0.20, 0.10, 0.30) * exp(-pow(length(p * vec2(0.55, 1.6) + vec2(0.0, 0.52)), 2.0) * 5.0) * 0.5;
  // faint dust lanes drifting across, never dots
  vec2 q = p * 1.5 + vec2(uTime * 0.008, -uTime * 0.003);
  float n = fbm(q + 0.9 * fbm(q * 1.6 + 3.1));
  float lane = exp(-pow((p.y + p.x * 0.42 - 0.04) * 1.7, 2.0));
  col += vec3(0.16, 0.09, 0.34) * pow(n, 2.4) * lane * 1.5;
  col += vec3(0.03, 0.17, 0.26) * pow(noise(q * 1.1 + 7.3) * 0.62 + n * 0.3, 3.0) * 0.9;
  col *= 1.0 - 0.15 * uClose;
  vec2 e = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= 1.0 - 0.6 * smoothstep(0.35, 1.15, length(e));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Pose {
  pos: THREE.Vector3
  look: THREE.Vector3
  shift: number
}

export interface SceneOptions {
  touch: boolean
  reduced: boolean
  /** called every drawn frame with x, y (CSS px) for each of the six clusters */
  onFrame: (xy: Float32Array) => void
  /** called when the camera has arrived (inside a cluster or back home) */
  onArrive: (focus: number) => void
}

export class GalaxyScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60)
  private body: THREE.Points
  private disc: THREE.Points
  private bodyU: Record<string, THREE.IUniform>
  private discU: Record<string, THREE.IUniform>
  private skyU: Record<string, THREE.IUniform>
  private raf = 0
  private last = 0
  private time = 0
  private w = 1
  private h = 1
  private dpr = 1
  private maxDpr: number
  private focus = -1
  private hover = -1
  private hot = new Float32Array(6)
  private dim = 0
  private p = 1 // flight progress
  private dur = 1.7
  private close = 0
  private closeFrom = 0
  private from: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: 0 }
  private cur: Pose = { pos: new THREE.Vector3(0, 0.4, 5.3), look: new THREE.Vector3(), shift: 0 }
  private mouse = new THREE.Vector2()
  private mouseS = new THREE.Vector2()
  private xy = new Float32Array(12)
  private spots = CHECKS.map((c) => new THREE.Vector3(...c.spot))
  private tmp = new THREE.Vector3()
  private tmp2 = new THREE.Vector3()
  private settled = false
  private slow = 0
  private frames = 0
  private disposed = false
  /** dev only: `?ray=1.2` in the address pins the cosmic ray's head at that point of its path */
  private rayPin: number | null = null
  private form = 0
  private opts: SceneOptions
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions) {
    this.canvas = canvas
    this.opts = opts
    this.maxDpr = opts.touch ? 1.5 : 2
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: false })
    this.renderer.setClearColor(0x03040a, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    const gl = this.renderer.getContext()
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array
    const maxPt = range ? range[1] : 64

    // sky
    const skyGeo = new THREE.BufferGeometry()
    skyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    this.skyU = { uTime: { value: 0 }, uAspect: { value: 1 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uClose: { value: 0 } }
    const sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyU, depthTest: false, depthWrite: false }))
    sky.frustumCulled = false
    sky.renderOrder = -2
    this.scene.add(sky)

    const total = opts.touch ? 62000 : 104000
    const cloud = buildBody(total)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(cloud.position, 3))
    geo.setAttribute('aNormal', new THREE.BufferAttribute(cloud.normal, 3))
    geo.setAttribute('aData', new THREE.BufferAttribute(cloud.data, 4))
    this.bodyU = {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uPart: { value: 0 },
      uDim: { value: 0 },
      uRayHead: { value: -5 },
      uBeat: { value: 0 },
      uForm: { value: 1 },
      uMaxPt: { value: maxPt },
      uCam: { value: new THREE.Vector3() },
      uAxis: { value: new THREE.Vector3(0, 0, -1) },
      uRayA: { value: new THREE.Vector3(...RAY_A) },
      uRayD: { value: new THREE.Vector3(...RAY_D) },
      uHue: { value: CHECKS.map((c) => new THREE.Color(c.hue).convertLinearToSRGB()) },
      uSpot: { value: this.spots },
      uHot: { value: this.hot },
    }
    const pts = { transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }
    this.body = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: POINT_FRAG, uniforms: this.bodyU, ...pts }))
    this.body.frustumCulled = false
    this.scene.add(this.body)

    const dc = buildDisc(opts.touch ? 12000 : 22000, opts.touch ? 1400 : 2600)
    const dgeo = new THREE.BufferGeometry()
    dgeo.setAttribute('position', new THREE.BufferAttribute(dc.position, 3))
    dgeo.setAttribute('aData', new THREE.BufferAttribute(dc.data, 4))
    this.discU = { uTime: { value: 0 }, uScale: { value: 1 }, uDim: { value: 0 }, uMaxPt: { value: maxPt }, uForm: { value: 1 } }
    this.disc = new THREE.Points(dgeo, new THREE.ShaderMaterial({ vertexShader: DISC_VERT, fragmentShader: POINT_FRAG, uniforms: this.discU, ...pts }))
    this.disc.frustumCulled = false
    this.disc.position.y = -1.03
    this.disc.renderOrder = -1
    this.scene.add(this.disc)

    const pin = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ray')
    if (pin !== null && pin !== '') this.rayPin = Number(pin)
    if (opts.reduced) this.form = 1
    this.resize()
    this.homePose(this.cur)
    document.addEventListener('visibilitychange', this.onVis)
    window.addEventListener('pointermove', this.onMove, { passive: true })
    this.start()
  }

  private onVis = () => {
    if (document.hidden) cancelAnimationFrame(this.raf)
    else this.start()
  }
  private onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    this.mouse.set((e.clientX / this.w) * 2 - 1, (e.clientY / this.h) * 2 - 1)
    if (this.settled && this.focus < 0) this.start()
  }

  private start() {
    cancelAnimationFrame(this.raf)
    if (this.disposed) return
    this.last = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  private get portrait() {
    return this.w / this.h < 0.8
  }

  private homePose(out: Pose) {
    const port = this.portrait
    const d = port ? 7.3 : 4.95
    out.pos.set(this.mouseS.x * 0.34, 0.42 - this.mouseS.y * 0.16, d)
    out.look.set(0, port ? 0.16 : -0.03, 0)
    out.shift = port ? 0 : 0.085
  }

  private spotPose(i: number, out: Pose) {
    const s = this.tmp.copy(this.spots[i]).applyMatrix4(this.body.matrixWorld)
    // come in from the front, a little off the straight line, so the cluster has depth
    const dir = this.tmp2.set(s.x * 0.5, 0.12, 1).normalize()
    out.look.copy(s)
    out.pos.copy(s).addScaledVector(dir, 0.46)
    out.shift = 0
  }

  setHover(i: number) {
    this.hover = i
    if (this.settled && this.focus < 0) this.start()
  }

  /** -1 flies home; 0-5 flies into that cluster. `jump` lands at once (a page opened straight on a check). */
  setFocus(i: number, jump = false) {
    if (i === this.focus && !jump) return
    this.from.pos.copy(this.cur.pos)
    this.from.look.copy(this.cur.look)
    this.from.shift = this.cur.shift
    this.closeFrom = this.close
    const between = this.focus >= 0 && i >= 0
    this.focus = i
    this.dur = this.opts.reduced ? 0.01 : i < 0 ? 1.35 : between ? 2.0 : 1.75
    this.p = jump ? 1 : 0
    if (jump) this.form = 1
    this.settled = false
    this.start()
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr)
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.w, this.h, false)
    this.camera.aspect = this.w / this.h
    this.skyU.uAspect.value = this.w / this.h
    const scale = (this.h * this.dpr * 0.5) / Math.tan((this.camera.fov * Math.PI) / 360)
    this.bodyU.uScale.value = scale
    this.discU.uScale.value = scale
    if (this.settled) this.start()
  }

  private tick = (now: number) => {
    if (this.disposed) return
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016
    // if frames run slow, give up resolution before smoothness
    if (this.last) {
      this.frames++
      if (now - this.last > 21) this.slow++
      if (this.frames >= 50) {
        if (this.slow > 19 && this.maxDpr > 1) {
          this.maxDpr = Math.max(1, this.maxDpr - 0.5)
          this.resize()
        }
        this.frames = 0
        this.slow = 0
      }
    }
    this.last = now

    // flight
    if (this.p < 1) this.p = Math.min(1, this.p + dt / this.dur)
    const e = ease(this.p)
    const target = this.focus >= 0 ? 1 : 0
    this.close = this.closeFrom + (target - this.closeFrom) * e
    // between two checks the camera backs out a little on the way
    const arc = this.focus >= 0 && this.closeFrom > 0.5 ? Math.sin(Math.PI * e) : 0

    // time stops as the camera closes in
    const flow = this.opts.reduced ? 0 : 1 - Math.min(1, this.close * 1.15) + arc * 0.3
    this.time += dt * Math.max(0, flow)
    const t = this.time
    this.mouseS.lerp(this.mouse, Math.min(1, dt * 2.2))

    this.body.rotation.y = this.opts.reduced ? 0.18 : 0.5 * Math.sin(t * 0.21)
    this.body.updateMatrixWorld()

    const to = this.poseTo
    if (this.focus >= 0) this.spotPose(this.focus, to)
    else this.homePose(to)
    this.cur.pos.lerpVectors(this.from.pos, to.pos, e)
    this.cur.look.lerpVectors(this.from.look, to.look, Math.min(1, e * 1.25))
    this.cur.shift = this.from.shift + (to.shift - this.from.shift) * e
    if (arc > 0) this.cur.pos.z += arc * 1.1
    this.camera.position.copy(this.cur.pos)
    this.camera.lookAt(this.cur.look)
    this.camera.setViewOffset(this.w, this.h, -this.cur.shift * this.w, 0, this.w, this.h)
    this.camera.updateMatrixWorld()

    // uniforms
    if (this.form < 1) this.form = Math.min(1, this.form + dt / 2.8)
    const formed = 1 - Math.pow(1 - this.form, 2.4)
    this.bodyU.uForm.value = formed
    this.discU.uForm.value = formed
    const beatT = (t * 1.05) % 1
    this.bodyU.uTime.value = t
    this.bodyU.uBeat.value = Math.exp(-beatT * 9) + 0.6 * Math.exp(-Math.pow((beatT - 0.28) * 9, 2))
    this.bodyU.uRayHead.value = this.rayPin ?? -1.9 + ((t + 5.9) % 7) * 3.4
    this.bodyU.uPart.value = Math.max(0, Math.min(1, (this.close - 0.4) / 0.6)) * (1 - arc * 0.7)
    ;(this.bodyU.uCam.value as THREE.Vector3).copy(this.camera.position)
    ;(this.bodyU.uAxis.value as THREE.Vector3).copy(this.cur.look).sub(this.camera.position).normalize()
    const k = Math.min(1, dt * 7)
    for (let i = 0; i < 6; i++) {
      const want = i === this.hover || i === this.focus ? 1 : 0
      this.hot[i] += (want - this.hot[i]) * k
    }
    this.dim += ((this.hover >= 0 && this.focus < 0 ? 1 : 0) - this.dim) * k
    this.bodyU.uDim.value = this.dim
    this.discU.uDim.value = this.dim
    this.discU.uTime.value = t
    this.skyU.uTime.value = t
    this.skyU.uClose.value = this.close

    // where the six clusters are on screen, and the figure's centre for the sky light
    for (let i = 0; i < 6; i++) {
      const v = this.tmp.copy(this.spots[i]).applyMatrix4(this.body.matrixWorld).project(this.camera)
      this.xy[i * 2] = (v.x * 0.5 + 0.5) * this.w
      this.xy[i * 2 + 1] = (-v.y * 0.5 + 0.5) * this.h
    }
    const c = this.tmp.set(0, 0.1, 0).project(this.camera)
    ;(this.skyU.uC.value as THREE.Vector2).set(c.x * 0.5 + 0.5, c.y * 0.5 + 0.5)

    this.renderer.render(this.scene, this.camera)
    this.opts.onFrame(this.xy)

    if (this.p >= 1 && !this.settled) {
      this.settled = true
      this.opts.onArrive(this.focus)
    }
    // inside a check time has stopped: draw nothing more until Back
    const idle = this.settled && this.focus >= 0 && Math.abs(this.hot[this.focus] - 1) < 0.01
    if (!idle) this.raf = requestAnimationFrame(this.tick)
  }
  private poseTo: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: 0 }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    document.removeEventListener('visibilitychange', this.onVis)
    window.removeEventListener('pointermove', this.onMove)
    this.body.geometry.dispose()
    ;(this.body.material as THREE.Material).dispose()
    this.disc.geometry.dispose()
    ;(this.disc.material as THREE.Material).dispose()
    this.renderer.dispose()
  }
}

// braindrift_w1 hero scene: a holographic brain inside a scanner bore. Everything drawn is a shipped file or a Model B
// output: flight_brain.glb (shell; its _DISP_MM attribute is the injected SIMULATION field), flight_vent_fXXX.glb
// (Model B ventricle surfaces), and the scan plane, which shows real MRI voxels tinted by the model's class map.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export const NI = 176
export const NJ = 176
export const NK = 208
const WIDTH: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

export interface MeshData {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array
  disp: Float32Array | null
}

/** Minimal .glb reader for the shipped meshes (one primitive, plain accessors, no compression). */
export async function loadGlb(url: string): Promise<MeshData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const dv = new DataView(buf)
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error(`${url} is not a .glb`)
  const jsonLen = dv.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)))
  const bin = 20 + jsonLen + 8
  const prim = json.meshes[0].primitives[0]
  const bytes = (idx: number) => {
    const a = json.accessors[idx]
    const bv = json.bufferViews[a.bufferView]
    const off = bin + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0)
    const size = a.componentType === 5121 ? 1 : a.componentType === 5123 ? 2 : 4
    return { a, data: buf.slice(off, off + a.count * WIDTH[a.type] * size) }
  }
  const f32 = (idx: number) => new Float32Array(bytes(idx).data)
  const ix = bytes(prim.indices)
  const index = ix.a.componentType === 5125 ? new Uint32Array(ix.data) : Uint32Array.from(new Uint16Array(ix.data))
  const at = prim.attributes
  return { position: f32(at.POSITION), normal: f32(at.NORMAL), index, disp: at._DISP_MM !== undefined ? f32(at._DISP_MM) : null }
}

export function toGeometry(m: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(m.position, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3))
  g.setAttribute('aDisp', new THREE.BufferAttribute(m.disp ?? new Float32Array(m.position.length / 3), 1))
  g.setIndex(new THREE.BufferAttribute(m.index, 1))
  return g
}

const HOLO_VERT = /* glsl */ `
attribute float aDisp;
uniform float uF;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vD;
void main(){
  vec3 p = position;
  p.y += aDisp * uF;            // injected upward shift, true to scale (mm)
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vP = p; vD = aDisp;
  gl_Position = projectionMatrix * mv;
}`
const HOLO_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uF, uScanZ, uScan, uHeat, uGain, uMaxMm, uCut;
uniform vec3 uCol, uRim;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vD;
vec3 inferno(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 a = vec3(0.10, 0.02, 0.30), b = vec3(0.85, 0.20, 0.35), c = vec3(1.0, 0.62, 0.12), d = vec3(1.0, 0.96, 0.62);
  return t < 0.4 ? mix(a, b, t / 0.4) : t < 0.75 ? mix(b, c, (t - 0.4) / 0.35) : mix(c, d, (t - 0.75) / 0.25);
}
void main(){
  float ndv = abs(dot(normalize(vN + vec3(1e-5)), normalize(vV)));
  float fr = pow(clamp(1.0 - ndv, 0.0, 1.0), 2.4);
  float lines = 0.72 + 0.28 * sin(vP.y * 1.9 - uTime * 1.6);
  float h = uHeat * uF * smoothstep(0.25, 1.0, vD / uMaxMm);
  vec3 col = mix(uCol, inferno(vD / uMaxMm) * 1.5, h);
  float a = (0.035 + fr * 0.62) * lines * (1.0 + h * 1.2);
  float band = uScan * exp(-abs(vP.z - uScanZ) * 0.22);
  col = mix(col, uRim, clamp(band, 0.0, 1.0));
  a += band * 0.55;
  a *= 1.0 - uCut * smoothstep(0.0, 6.0, vP.z - uScanZ);
  gl_FragColor = vec4(col * a * uGain, 1.0);
}`

const VENT_VERT = /* glsl */ `
uniform float uLift;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
  gl_Position = projectionMatrix * mv;
}`
const VENT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uDeep, uCol, uRim; uniform float uGlow, uTime;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec3 n = normalize(vN + vec3(1e-5));
  float l = 0.5 + 0.5 * dot(n, normalize(vec3(0.25, 0.85, 0.45)));
  float fr = pow(clamp(1.0 - abs(dot(n, normalize(vV))), 0.0, 1.0), 2.0);
  float pulse = 0.92 + 0.08 * sin(uTime * 2.2 + vP.y * 0.12);
  vec3 col = mix(uDeep, uCol, l * l) * pulse + uRim * fr * (0.55 + uGlow * 0.6);
  gl_FragColor = vec4(col * (0.8 + uGlow * 0.5), 1.0);
}`

const DUST_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime, uPx;
varying float vA;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uTime * (5.0 + aSeed * 9.0) + 190.0, 380.0) - 190.0;   // drifting toward the head
  p.x += sin(uTime * 0.3 + aSeed * 40.0) * 5.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (1.2 + aSeed * 2.6) * (520.0 / -mv.z);
  vA = (0.25 + 0.75 * aSeed) * (1.0 - smoothstep(120.0, 190.0, abs(p.y)));
}`
const DUST_FRAG = /* glsl */ `
precision highp float;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * a * a * vA * 0.55, 1.0);
}`

/** Class tints of the model's map (ventricles are the hero colour). Index = class id. */
export const CLASS_RGB: [number, number, number][] = [
  [0, 0, 0],
  [70, 222, 255], // ventricles
  [214, 220, 255], // cerebral white matter
  [126, 108, 255], // cerebral cortex
  [255, 164, 92], // deep grey matter and other
  [64, 214, 170], // cerebellum and brainstem
]

/**
 * Paints coronal slice k into an RGBA buffer (row = j, superior at the top; column = i).
 * seg = Model B class map (null: plain MRI); preSeg marks "fluid here now, not before" in white.
 */
export function paintSlice(out: Uint8ClampedArray, k: number, vol: Uint8Array, seg: Uint8Array | null, preSeg: Uint8Array | null) {
  for (let j = 0; j < NJ; j++) {
    for (let i = 0; i < NI; i++) {
      const vi = (i * NJ + j) * NK + k
      const v = vol[vi]
      const c = seg ? seg[vi] : 0
      const o = (j * NI + i) * 4
      if (v < 10 && !c) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0
        continue
      }
      if (!seg || !c) {
        out[o] = v * 0.78
        out[o + 1] = Math.min(255, v * 0.96)
        out[o + 2] = Math.min(255, v * 1.2)
        out[o + 3] = seg ? 120 : 235
        continue
      }
      const rgb = CLASS_RGB[c]
      if (c === 1) {
        const gained = preSeg !== null && preSeg[vi] !== 1
        out[o] = gained ? 255 : rgb[0]
        out[o + 1] = gained ? 255 : rgb[1]
        out[o + 2] = gained ? 255 : rgb[2]
        out[o + 3] = 255
        continue
      }
      const m = 0.22 + 0.78 * (v / 255)
      out[o] = rgb[0] * m
      out[o + 1] = rgb[1] * m
      out[o + 2] = rgb[2] * m
      out[o + 3] = 240
    }
  }
}

export interface HeroOptions {
  shellUrl: string
  ventUrls: string[]
  maxMm: number
  onReady?: () => void
  onError?: (e: unknown) => void
}

export class HeroScene {
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 10, 4000)
  private rig = new THREE.Group()
  private shellMat: THREE.ShaderMaterial
  private ventMat: THREE.ShaderMaterial
  private dustMat: THREE.ShaderMaterial
  private vents: (THREE.Mesh | null)[] = []
  private plane: THREE.Mesh
  private planeTex: THREE.DataTexture
  private planeFrame: THREE.LineLoop
  private scanRing: THREE.Mesh
  private rings: THREE.Mesh[] = []
  private raf = 0
  private t0 = performance.now()
  private running = true
  private disposed = false
  private ro: ResizeObserver
  private drag = { on: false, x: 0, y: 0, yaw: 0, pitch: 0 }
  private w = 1
  private h = 1
  /** View centre shift as a fraction of the width (the brain sits right of the text column). */
  shiftX = 0
  shiftY = 0
  /** State driven by the page. */
  f = 0
  fTarget = 0
  frame = 0
  planeK = 104
  planeKTarget = 104
  planeAlpha = 1
  heat = 1
  glow = 0
  scan = 0
  idleSweep = true
  /** Screen-space anchors (CSS px in the canvas box) for HTML labels; called every frame. */
  onPins: ((pins: { vent: [number, number]; plane: [number, number] }) => void) | null = null
  private pv = new THREE.Vector3()
  private toScreen(x: number, y: number, z: number): [number, number] {
    this.pv.set(x, y, z).applyMatrix4(this.rig.matrixWorld).project(this.camera)
    return [(this.pv.x * 0.5 + 0.5) * this.w, (-this.pv.y * 0.5 + 0.5) * this.h]
  }
  /** Called when the plane crosses to a new integer slice: the page repaints the texture buffer. */
  onSlice: ((k: number, buf: Uint8ClampedArray) => void) | null = null
  readonly buf = new Uint8ClampedArray(NI * NJ * 4)
  private lastK = -1
  dirty = true
  fx = true
  cut = 0.78

  private canvas: HTMLCanvasElement
  private opts: HeroOptions

  constructor(canvas: HTMLCanvasElement, opts: HeroOptions) {
    this.canvas = canvas
    this.opts = opts
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }))
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    r.setClearColor(0x02040a, 1)
    // the composer renders to a float target, so the additive hologram can sum past 1: tone-map it instead of clipping to white
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1.05
    this.scene.add(this.rig)

    this.shellMat = new THREE.ShaderMaterial({
      vertexShader: HOLO_VERT,
      fragmentShader: HOLO_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uF: { value: 0 },
        uScanZ: { value: 0 },
        uScan: { value: 0 },
        uHeat: { value: 1 },
        uGain: { value: 1 },
        uCut: { value: 0.8 },
        uMaxMm: { value: opts.maxMm },
        uCol: { value: new THREE.Color(0x3f8dff) },
        uRim: { value: new THREE.Color(0xbfeaff) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    this.ventMat = new THREE.ShaderMaterial({
      vertexShader: VENT_VERT,
      fragmentShader: VENT_FRAG,
      uniforms: {
        uLift: { value: 0 },
        uTime: { value: 0 },
        uGlow: { value: 0 },
        uDeep: { value: new THREE.Color(0x06273f) },
        uCol: { value: new THREE.Color(0x2fc8f5) },
        uRim: { value: new THREE.Color(0xc8f6ff) },
      },
    })

    // scan plane: the real MRI slice, tinted by the model's map
    this.planeTex = new THREE.DataTexture(this.buf, NI, NJ, THREE.RGBAFormat)
    this.planeTex.magFilter = THREE.LinearFilter
    this.planeTex.minFilter = THREE.LinearFilter
    this.planeTex.colorSpace = THREE.SRGBColorSpace
    const pg = new THREE.PlaneGeometry(NI, NJ)
    const uv = pg.getAttribute('uv') as THREE.BufferAttribute
    for (let n = 0; n < uv.count; n++) uv.setY(n, 1 - uv.getY(n)) // row 0 (superior) at the top
    this.plane = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: this.planeTex, transparent: true, side: THREE.DoubleSide, depthWrite: true, alphaTest: 0.3, toneMapped: false }))
    this.plane.renderOrder = 1
    this.rig.add(this.plane)
    const fg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-88, -88, 0), new THREE.Vector3(88, -88, 0), new THREE.Vector3(88, 88, 0), new THREE.Vector3(-88, 88, 0)])
    this.planeFrame = new THREE.LineLoop(fg, new THREE.LineBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.rig.add(this.planeFrame)

    // scanner bore: fixed rings and one that travels with the plane
    const ringMat = (c: number, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })
    for (const [z, rad, o] of [
      [-150, 168, 0.4],
      [-75, 160, 0.5],
      [0, 156, 0.6],
      [75, 160, 0.5],
      [150, 168, 0.4],
    ] as const) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.45, 6, 200), ringMat(0x2f6dff, o))
      m.position.z = z
      this.rings.push(m)
      this.rig.add(m)
      // tick marks round each ring
      const ticks: number[] = []
      for (let n = 0; n < 72; n++) {
        const a = (n / 72) * Math.PI * 2
        const r1 = rad + 2
        const r2 = rad + (n % 6 === 0 ? 9 : 5)
        ticks.push(Math.cos(a) * r1, Math.sin(a) * r1, z, Math.cos(a) * r2, Math.sin(a) * r2, z)
      }
      const tg = new THREE.BufferGeometry()
      tg.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3))
      this.rig.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0x4f8dff, transparent: true, opacity: o * 0.8, blending: THREE.AdditiveBlending, depthWrite: false })))
    }
    this.scanRing = new THREE.Mesh(new THREE.TorusGeometry(126, 0.6, 6, 200), ringMat(0x8fe4ff, 0.7))
    this.rig.add(this.scanRing)

    // motes drifting toward the head
    const N = 1400
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let n = 0; n < N; n++) {
      const a = Math.random() * Math.PI * 2
      const rr = 70 + Math.pow(Math.random(), 0.7) * 420
      pos[n * 3] = Math.cos(a) * rr
      pos[n * 3 + 1] = Math.random() * 380 - 190
      pos[n * 3 + 2] = Math.sin(a) * rr
      seed[n] = Math.random()
    }
    const dg = new THREE.BufferGeometry()
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    dg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    this.dustMat = new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: { uTime: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const dust = new THREE.Points(dg, this.dustMat)
    dust.frustumCulled = false
    this.scene.add(dust)

    this.composer = new EffectComposer(r)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.55, 0.62)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
    this.bindPointer()
    void this.loadMeshes()
    this.loop()
  }

  private async loadMeshes() {
    try {
      const shell = await loadGlb(this.opts.shellUrl)
      if (this.disposed) return
      const sm = new THREE.Mesh(toGeometry(shell), this.shellMat)
      sm.renderOrder = 2
      sm.frustumCulled = false
      this.rig.add(sm)
      const v0 = await loadGlb(this.opts.ventUrls[0])
      if (this.disposed) return
      this.setVent(0, v0)
      this.opts.onReady?.()
      // the other frames arrive in the background
      this.opts.ventUrls.forEach((u, n) => {
        if (n === 0) return
        loadGlb(u)
          .then((m) => !this.disposed && this.setVent(n, m))
          .catch(() => {})
      })
    } catch (e) {
      this.opts.onError?.(e)
    }
  }

  private setVent(n: number, m: MeshData) {
    const mesh = new THREE.Mesh(toGeometry(m), this.ventMat)
    mesh.visible = false
    this.vents[n] = mesh
    this.rig.add(mesh)
  }

  private bindPointer() {
    const c = this.canvas
    c.addEventListener('pointerdown', (e) => {
      this.drag.on = true
      this.drag.x = e.clientX
      this.drag.y = e.clientY
    })
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
  }
  private onMove = (e: PointerEvent) => {
    if (!this.drag.on) return
    this.drag.yaw += (e.clientX - this.drag.x) * 0.006
    this.drag.pitch = Math.max(-0.6, Math.min(0.6, this.drag.pitch + (e.clientY - this.drag.y) * 0.004))
    this.drag.x = e.clientX
    this.drag.y = e.clientY
  }
  private onUp = () => {
    this.drag.on = false
  }

  private resize() {
    const w = Math.max(1, this.canvas.clientWidth)
    const h = Math.max(1, this.canvas.clientHeight)
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setRunning(on: boolean) {
    if (on === this.running) return
    this.running = on
    if (on) this.loop()
  }

  private loop = () => {
    if (this.disposed || !this.running) return
    this.raf = requestAnimationFrame(this.loop)
    const t = (performance.now() - this.t0) / 1000
    // ease the flight amount and the plane
    this.f += (this.fTarget - this.f) * 0.07
    if (this.idleSweep) this.planeKTarget = 104 + Math.sin(t * 0.42) * 62
    this.planeK += (this.planeKTarget - this.planeK) * (this.idleSweep ? 0.06 : 0.16)
    const k = Math.max(0, Math.min(NK - 1, Math.round(this.planeK)))
    if (k !== this.lastK || this.dirty) {
      this.lastK = k
      this.dirty = false
      this.onSlice?.(k, this.buf)
      this.planeTex.needsUpdate = true
    }
    const z = this.planeK - 104
    this.plane.position.z = z
    this.planeFrame.position.z = z
    this.scanRing.position.z = z
    ;(this.plane.material as THREE.MeshBasicMaterial).opacity = this.planeAlpha
    const su = this.shellMat.uniforms
    su.uTime.value = t
    su.uF.value = this.f
    su.uScanZ.value = z
    su.uScan.value += (this.scan - su.uScan.value) * 0.1
    su.uHeat.value = this.heat
    su.uGain.value = this.fx ? 0.62 : 1
    su.uCut.value += (this.cut - su.uCut.value) * 0.08
    this.ventMat.uniforms.uTime.value = t
    this.ventMat.uniforms.uGlow.value += (this.glow - this.ventMat.uniforms.uGlow.value) * 0.08
    this.dustMat.uniforms.uTime.value = t
    this.dustMat.uniforms.uPx.value = this.renderer.getPixelRatio()
    // nearest loaded ventricle frame
    let show = this.frame
    while (show > 0 && !this.vents[show]) show--
    this.vents.forEach((m, n) => m && (m.visible = n === show))
    // camera: slow drift, plus the user's drag
    const portrait = this.camera.aspect < 0.9
    const dist = portrait ? 760 : 510
    const yaw = 0.62 + Math.sin(t * 0.16) * 0.2 + this.drag.yaw
    const pitch = 0.2 + Math.sin(t * 0.11) * 0.04 + this.drag.pitch
    if (!this.drag.on) {
      this.drag.yaw *= 0.995
      this.drag.pitch *= 0.99
    }
    this.camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist)
    this.camera.lookAt(0, 4, 0)
    if (this.shiftX || this.shiftY) this.camera.setViewOffset(this.w, this.h, -this.shiftX * this.w, -this.shiftY * this.h, this.w, this.h)
    else this.camera.clearViewOffset()
    this.rings.forEach((m, n) => (m.rotation.z = t * 0.05 * (n % 2 ? 1 : -1)))
    if (this.onPins) {
      this.camera.updateMatrixWorld()
      this.rig.updateMatrixWorld()
      this.onPins({ vent: this.toScreen(-14, 12, -6), plane: this.toScreen(-86, -86, z) })
    }
    if (this.fx) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
    })
    this.planeTex.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}

// ------------------------------------------------------------------ small viewer for the scroll section

export interface MiniItem {
  url: string
  kind: 'glass' | 'glow' | 'solid'
  color: number
  x?: number
  group?: string
}

/** A small auto-rotating viewer for shipped meshes (ventricle surfaces, the PVS web inside its glass brain). */
export class MiniViewer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(28, 1, 10, 4000)
  private rig = new THREE.Group()
  private raf = 0
  private disposed = false
  private running = false
  private groups = new Map<string, THREE.Object3D[]>()
  private pivots: THREE.Group[] = []
  private ro: ResizeObserver
  private t0 = performance.now()
  private mats: THREE.ShaderMaterial[] = []

  private canvas: HTMLCanvasElement
  private dist: number
  private spin: number

  constructor(canvas: HTMLCanvasElement, items: MiniItem[], dist = 520, spin = 0.25) {
    this.canvas = canvas
    this.dist = dist
    this.spin = spin
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setClearColor(0x000000, 0)
    this.scene.add(this.rig)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
    for (const it of items) void this.add(it)
  }

  async add(it: MiniItem) {
    try {
      const m = await loadGlb(it.url)
      if (this.disposed) return
      let mat: THREE.Material
      if (it.kind === 'solid') {
        const sm = new THREE.ShaderMaterial({
          vertexShader: VENT_VERT,
          fragmentShader: VENT_FRAG,
          uniforms: { uLift: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0.5 }, uDeep: { value: new THREE.Color(0x06273f) }, uCol: { value: new THREE.Color(it.color) }, uRim: { value: new THREE.Color(0xd8f8ff) } },
        })
        this.mats.push(sm)
        mat = sm
      } else if (it.kind === 'glass') {
        const sm = new THREE.ShaderMaterial({
          vertexShader: HOLO_VERT,
          fragmentShader: HOLO_FRAG,
          uniforms: { uTime: { value: 0 }, uF: { value: 0 }, uScanZ: { value: 0 }, uScan: { value: 0 }, uHeat: { value: 0 }, uGain: { value: 0.55 }, uCut: { value: 0 }, uMaxMm: { value: 1 }, uCol: { value: new THREE.Color(it.color) }, uRim: { value: new THREE.Color(0xffffff) } },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
        this.mats.push(sm)
        mat = sm
      } else {
        mat = new THREE.MeshBasicMaterial({ color: it.color, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false })
      }
      const geo = toGeometry(m)
      if (it.kind === 'solid') {
        // each specimen turns in place about its own centre
        geo.computeBoundingBox()
        const c = new THREE.Vector3()
        geo.boundingBox?.getCenter(c)
        geo.translate(-c.x, -c.y, -c.z)
      }
      const mesh = new THREE.Mesh(geo, mat)
      mesh.frustumCulled = false
      const pivot = new THREE.Group()
      pivot.position.x = it.x ?? 0
      pivot.add(mesh)
      this.pivots.push(pivot)
      this.rig.add(pivot)
      if (it.group) {
        const g = this.groups.get(it.group) ?? []
        g.push(mesh)
        this.groups.set(it.group, g)
      }
    } catch {
      /* a missing mesh leaves the stage empty; the caption still stands */
    }
  }

  /** Shows one named group and hides the other named groups. */
  show(group: string) {
    this.groups.forEach((list, name) => list.forEach((o) => (o.visible = name === group)))
  }
  has(group: string) {
    return this.groups.has(group)
  }

  private resize() {
    const w = Math.max(1, this.canvas.clientWidth)
    const h = Math.max(1, this.canvas.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setRunning(on: boolean) {
    if (on === this.running) return
    this.running = on
    if (on) this.loop()
  }

  private loop = () => {
    if (this.disposed || !this.running) return
    this.raf = requestAnimationFrame(this.loop)
    const t = (performance.now() - this.t0) / 1000
    for (const m of this.mats) m.uniforms.uTime.value = t
    for (const p of this.pivots) p.rotation.y = 0.5 + t * this.spin
    const d = this.camera.aspect < 1 ? this.dist * 1.35 : this.dist
    this.camera.position.set(0, d * 0.16, d)
    this.camera.lookAt(0, -18, 0)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.())
    this.renderer.dispose()
  }
}

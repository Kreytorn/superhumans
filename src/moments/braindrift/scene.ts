// three.js stage for the BrainDrift moment: a cut-away brain. Everything drawn here is a shipped file or a model output:
//   shell  = flight_brain.glb (frame-0 brain surface; its _DISP_MM attribute lifts it by the injected upward shift)
//   vents  = flight_vent_fXXX.glb (Model B's ventricle surface of each stored frame)
//   face   = one coronal slice of the real crop, with Model B's class map painted on it
// Light: a drifting key, a cool rim and cavity shadow on the solid half; the fluid spaces are lit from inside and
// carry two added glow shells; the near half is a hologram shell whose 4 mm slices light as the model reads them.
import * as THREE from 'three'

export interface MeshData {
  position: Float32Array
  normal: Float32Array
  index: Uint32Array
  disp: Float32Array | null
}

const NI = 176
const NJ = 176
const NK = 208
const WIDTH: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }

/** Minimal .glb reader for the shipped meshes (one primitive, plain accessors, no compression). */
export async function loadGlb(url: string): Promise<MeshData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`braindrift moment: ${url} -> HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const dv = new DataView(buf)
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error(`braindrift moment: ${url} is not a .glb`)
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

export type Rgb = [number, number, number]
export interface SceneTokens {
  specimen: Rgb
  glass: Rgb
  fluid: Rgb
  mark: Rgb
  mark2: Rgb
  scan: Rgb
  stage: Rgb
  /** Colour of the light the stage gives off (rim light, glow round the fluid, lit slices). Falls back to mark. */
  glow?: Rgb
  /** Tints of classes 2..5 on the cut face (white matter, cortex, deep grey, cerebellum and brainstem). */
  classes: [Rgb, Rgb, Rgb, Rgb]
}

// One vertex stage for every surface. uInflate pushes a copy of a surface out along its normals (the glow shells).
const VERT = /* glsl */ `
attribute float aDisp;
attribute float aGrow;
uniform float uRise;
uniform float uInflate;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying float vGrow;
varying vec3 vW;
varying vec3 vON;
void main() {
  vec3 p = position + normal * uInflate;
  p.y += aDisp * uRise;
  vZ = p.z;
  vW = p;
  vGrow = aGrow;
  vON = normal;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`

// The solid half: a wet, sculpted surface. Folds fall into shadow (a cavity term from the mesh itself), a cool rim
// light comes from behind, and the edge where the reading plane meets the surface glows.
const SHELL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uRimCol;
uniform vec3 uLight;
uniform float uCutZ;
uniform float uSpec;
uniform float uScan;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying vec3 vW;
varying vec3 vON;
void main() {
  if (vZ < uCutZ) discard;
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  vec3 l = normalize(uLight);
  float d = clamp((dot(n, l) + 0.08) / 1.08, 0.0, 1.0);
  d = d * d * (3.0 - 2.0 * d);
  float cav = dot(normalize(vON), normalize(vW - vec3(0.0, -6.0, 0.0)));
  float ao = mix(0.1, 1.0, smoothstep(0.3, 0.97, cav));
  ao *= ao;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  vec3 col = mix(uShadow, uColor * 0.74, (0.03 + 0.97 * d) * ao);
  col += uSpec * pow(max(dot(n, normalize(l + v)), 0.0), 54.0) * ao;
  // cool light from behind: on the turned-away side and along every edge
  col += uRimCol * (pow(1.0 - ndv, 2.4) * 0.42 + (1.0 - d) * 0.05 * ao);
  float edge = 1.0 - smoothstep(0.0, 1.5, vZ - uCutZ);
  col += uRimCol * edge * (0.1 + 1.3 * uScan);
  if (!gl_FrontFacing) col = mix(uShadow, uColor, 0.12);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`

// The ventricles: lit from inside. Brightest where the eye looks straight into the body, a thin bright skin at the
// edge, and a slow pulse that travels up through the fluid.
const VENT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uShadow;
uniform vec3 uLight;
uniform float uCutZ;
uniform float uGrowth;
uniform float uRim;
uniform float uSpec;
uniform float uGlow;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying float vGrow;
varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 l = normalize(uLight);
  float d = clamp((dot(n, l) + 0.4) / 1.4, 0.0, 1.0);
  d = d * d * (3.0 - 2.0 * d);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  // the second colour is drawn only as a rim: the band of the surface that meets the cut slice
  float rimBand = uRim > 0.0 ? 1.0 - smoothstep(uRim * 0.55, uRim, abs(vZ - uCutZ)) : 1.0;
  vec3 base = mix(uColor, uColor2, smoothstep(0.15, 0.85, vGrow) * uGrowth * rimBand);
  float pulse = 0.5 + 0.5 * sin(uTime * 1.5 - vW.y * 0.09);
  vec3 col = mix(uShadow, base, 0.12 + 0.88 * d);
  // light from inside: a soft core that pulses, and a bright skin where the surface turns away
  // (unmeasured fluid stays unlit: the light comes on when the model has measured it)
  float g = uGlow * uGlow;
  col += base * pow(ndv, 2.0) * (0.06 + 0.26 * g) * (0.75 + 0.5 * pulse);
  col += mix(base, vec3(1.0), 0.55) * pow(1.0 - ndv, 2.6) * (0.05 + 0.8 * g);
  col += uSpec * g * pow(max(dot(n, normalize(l + v)), 0.0), 40.0);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`

// The glow round the ventricles: the same surface pushed outward, drawn from the inside and added to the picture.
const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uCutZ;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
void main() {
  // only the fluid in front of the scan slice gives off light (what lies behind it is hidden in the solid half)
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(ndv, 2.4) * uStrength * (1.0 - smoothstep(-4.0, 3.0, vZ - uCutZ));
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`

// The near half: a hologram shell. Its slices are drawn as one contour every 4 mm; while the model reads, each
// contour lights as the reading plane passes it and then fades.
const GLASS_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uGlow;
uniform vec3 uLight;
uniform float uCutZ;
uniform float uAlpha;
uniform float uRead;
uniform float uDone;
uniform float uTime;
uniform sampler2D uFace;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying vec3 vW;
void main() {
  if (vZ > uCutZ) discard;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float f = pow(1.0 - abs(dot(n, v)), 2.2);
  float lit = clamp(dot(n, normalize(uLight)) * 0.5 + 0.5, 0.0, 1.0);
  float a = (0.008 + 0.3 * f * f) * (0.5 + 0.5 * lit);
  float w = fwidth(vZ);
  float dz = abs(fract(vZ * 0.25) - 0.5) * 4.0;
  float stripe = (1.0 - smoothstep(0.22, 0.4 + w, dz)) * (1.0 - smoothstep(1.1, 2.6, w));
  float behind = uCutZ - vZ;
  float trail = exp(-behind / 20.0);
  // once the model has read every slice, the contours keep a steady trace of that read
  float s = stripe * (0.06 + 0.06 * uDone + uRead * (0.12 + 0.85 * trail)) * (0.22 + 0.78 * f);
  // a slow shimmer runs along the contours at rest
  s *= 0.8 + 0.2 * sin(uTime * 0.9 + vZ * 0.12);
  vec3 col = mix(uColor, uGlow, clamp(0.35 + 0.65 * uRead * trail + stripe * 0.4, 0.0, 1.0));
  a = (a + s) * uAlpha;
  // where this fragment lies in front of the scan slice the glass steps back, so nothing is drawn across the scan
  vec3 ray = vW - cameraPosition;
  vec2 hit = cameraPosition.xy + ray.xy * ((uCutZ - cameraPosition.z) / ray.z);
  vec2 uv = vec2(hit.x + 88.5, hit.y + 87.5) / 176.0;
  float over = uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0 ? texture2D(uFace, uv).a : 0.0;
  a *= 1.0 - 0.92 * smoothstep(0.1, 0.9, over);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`

// The fluid seen through the tissue: the part of the ventricle surface that lies inside the solid half (behind the
// scan slice) is added as a soft light, so the measured fluid glows from inside the brain instead of vanishing.
const XRAY_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uCutZ;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying vec3 vW;
void main() {
  if (vZ < uCutZ + 0.6) discard;
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // deeper inside the solid half the light is softer
  float depth = exp(-(vZ - uCutZ) / 38.0);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.5 - vW.y * 0.09);
  // mostly the silhouette: an outline of light through the tissue, not a wash over the slice
  float a = (0.08 + 0.92 * pow(1.0 - ndv, 2.6)) * uStrength * (0.35 + 0.65 * depth) * pulse;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`

// The reading frame: a thin instrument frame of light round the reading plane, with millimetre ticks and lit corners.
// It exists only while the model reads (uA), and travels with the plane.
const FRAME_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uSize;
uniform float uA;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * uSize;
  vec2 d = min(p, uSize - p);
  float m = min(d.x, d.y);
  float w = max(fwidth(p.x), fwidth(p.y));
  float line = 1.0 - smoothstep(0.35, 0.35 + 1.5 * w, m);
  float corner = step(max(d.x, d.y), 12.0);
  float tx = abs(fract(p.x / 10.0 + 0.5) - 0.5) * 10.0;
  float ty = abs(fract(p.y / 10.0 + 0.5) - 0.5) * 10.0;
  float tick = (step(d.y, 3.5) * (1.0 - smoothstep(0.2, 0.2 + 1.5 * w, tx)) + step(d.x, 3.5) * (1.0 - smoothstep(0.2, 0.2 + 1.5 * w, ty)));
  float glow = exp(-m / 4.0) * 0.1 * (0.3 + 0.7 * corner);
  float sweep = exp(-abs(vUv.y - fract(uTime * 0.55)) * 60.0) * step(2.0, m) * 0.10;
  float a = (line * (0.12 + 0.88 * corner) + min(tick, 1.0) * 0.3 + glow + sweep + 0.012) * uA;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`

// The scan slice: the real pixels, with a lit outline and, while the model reads, a line of light crossing it.
const FACE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const FACE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uEdge;
uniform float uScan;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.02) discard;
  vec3 col = t.rgb;
  float e = t.a * (1.0 - t.a) * 4.0;
  col += uEdge * e * (0.42 + 0.7 * uScan);
  float sweep = 1.0 - smoothstep(0.0, 0.035, abs(vUv.y - fract(uTime * 0.55)));
  col += uEdge * sweep * 0.22 * uScan;
  gl_FragColor = vec4(col, t.a);
  #include <colorspace_fragment>
}`

function col(c: Rgb) {
  return new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace)
}
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

export interface DrawParams {
  /** Flight fraction of the stored frame shown (0, 0.25 ... 1): lifts the shell by the injected shift. */
  rise: number
  ventIdx: number
  cutK: number
  measured: number
  growth: number
  /** Seconds, for the slow light: the pulse in the fluid, the shimmer on the shell, the drifting key light. */
  time?: number
  /** 0..1: the model is reading (the cut edge and the read slices light up). */
  scan?: number
  /** Camera offsets from the rest pose (radians, and a fraction of the distance). Labels are placed at the rest pose. */
  daz?: number
  del?: number
  dolly?: number
}

export interface FacePaint {
  k: number
  vol: Uint8Array
  seg: Uint8Array | null
  preSeg: Uint8Array | null
  map: number
  measured: number
  growth: number
}

export class BrainScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(19, 1, 10, 4000)
  /** Projected bounds of the brain in CSS px (set by resize). */
  rect = { x0: 0, y0: 0, x1: 0, y1: 0 }
  private w = 1
  private h = 1
  private az0 = 0
  private el0 = 0
  private dist0 = 900
  private shellPos: Float32Array | null = null
  private far: THREE.Mesh | null = null
  private glassBack: THREE.Mesh | null = null
  private glassFront: THREE.Mesh | null = null
  private vent: THREE.Mesh
  private halos: THREE.Mesh[] = []
  private xray: THREE.Mesh
  private frame: THREE.Mesh
  private vents = new Map<number, THREE.BufferGeometry>()
  private face: THREE.Mesh
  private faceTex: THREE.DataTexture
  private faceData = new Uint8Array(NI * NJ * 4)
  private faceKey = ''
  private mask = new Uint8Array(NI * NJ)
  private grey = new Uint8Array(NI * NJ)
  private depth = new Uint8Array(NI * NJ)
  private queue = new Int32Array(NI * NJ)
  private lut = new Float32Array(256)
  private tokens: SceneTokens | null = null
  private light = new THREE.Vector3(0.5, 0.78, 0.62).normalize()
  private tmp = new THREE.Vector3()
  /** The swell, made visible: each time a new stored frame swaps in, the light round the fluid flares and settles. */
  private lastVent = -1
  private kickAt = -10

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    for (let g = 0; g < 256; g++) this.lut[g] = Math.min(1, Math.max(0, (g / 255 - 0.02) / 0.8)) ** 0.78
    this.faceTex = new THREE.DataTexture(this.faceData, NI, NJ, THREE.RGBAFormat)
    this.faceTex.colorSpace = THREE.SRGBColorSpace
    this.faceTex.magFilter = THREE.LinearFilter
    this.faceTex.minFilter = THREE.LinearFilter
    this.face = new THREE.Mesh(
      new THREE.PlaneGeometry(NI, NJ),
      // blended, not alpha-tested: the slice edge is a soft ramp instead of 1 mm stair-steps
      new THREE.ShaderMaterial({
        vertexShader: FACE_VERT,
        fragmentShader: FACE_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: { uMap: { value: this.faceTex }, uEdge: { value: new THREE.Color(0, 0, 0) }, uScan: { value: 0 }, uTime: { value: 0 } },
      }),
    )
    this.face.renderOrder = 1
    this.face.position.set(-0.5, 0.5, 0)
    this.scene.add(this.face)
    this.vent = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: VENT_FRAG,
        side: THREE.DoubleSide,
        uniforms: {
          uColor: { value: new THREE.Color(1, 1, 1) },
          uColor2: { value: new THREE.Color(1, 1, 1) },
          uShadow: { value: new THREE.Color(0, 0, 0) },
          uLight: { value: this.light },
          uCutZ: { value: 0 },
          uGrowth: { value: 0 },
          uRim: { value: 0 },
          uSpec: { value: 0.28 },
          uGlow: { value: 0 },
          uTime: { value: 0 },
          uRise: { value: 0 },
          uInflate: { value: 0 },
        },
      }),
    )
    this.vent.visible = false
    this.scene.add(this.vent)
    // two glow shells: a tight bright one and a wide faint one
    for (const [inflate, strength] of [
      [2.2, 0.3],
      [6.5, 0.15],
    ]) {
      const halo = new THREE.Mesh(
        this.vent.geometry,
        new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: HALO_FRAG,
          side: THREE.FrontSide,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uStrength: { value: strength }, uCutZ: { value: 0 }, uRise: { value: 0 }, uInflate: { value: inflate } },
        }),
      )
      halo.userData.strength = strength
      halo.renderOrder = 1.5
      halo.visible = false
      this.halos.push(halo)
      this.scene.add(halo)
    }
    this.xray = new THREE.Mesh(
      this.vent.geometry,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: XRAY_FRAG,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uStrength: { value: 0 }, uCutZ: { value: 0 }, uTime: { value: 0 }, uRise: { value: 0 }, uInflate: { value: 0 } },
      }),
    )
    this.xray.renderOrder = 4
    this.xray.visible = false
    this.scene.add(this.xray)
    this.frame = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: FACE_VERT,
        fragmentShader: FRAME_FRAG,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uSize: { value: new THREE.Vector2(1, 1) }, uA: { value: 0 }, uTime: { value: 0 } },
      }),
    )
    this.frame.renderOrder = 5
    this.frame.visible = false
    this.scene.add(this.frame)
  }

  private shell() {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: SHELL_FRAG,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(1, 1, 1) },
        uShadow: { value: new THREE.Color(0, 0, 0) },
        uRimCol: { value: new THREE.Color(0, 0, 0) },
        uLight: { value: this.light },
        uCutZ: { value: 0 },
        uSpec: { value: 0.2 },
        uScan: { value: 0 },
        uRise: { value: 0 },
        uInflate: { value: 0 },
      },
    })
  }

  private glass(side: THREE.Side, alpha: number) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: GLASS_FRAG,
      side,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(1, 1, 1) },
        uGlow: { value: new THREE.Color(1, 1, 1) },
        uLight: { value: this.light },
        uCutZ: { value: 0 },
        uFace: { value: this.faceTex },
        uAlpha: { value: alpha },
        uRead: { value: 0 },
        uDone: { value: 0 },
        uTime: { value: 0 },
        uRise: { value: 0 },
        uInflate: { value: 0 },
      },
    })
  }

  private geometry(m: MeshData) {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(m.position, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3))
    const n = m.position.length / 3
    g.setAttribute('aDisp', new THREE.BufferAttribute(m.disp ?? new Float32Array(n), 1))
    g.setAttribute('aGrow', new THREE.BufferAttribute(new Float32Array(n), 1))
    g.setIndex(new THREE.BufferAttribute(m.index, 1))
    return g
  }

  setShell(m: MeshData) {
    const g = this.geometry(m)
    this.shellPos = m.position
    this.far = new THREE.Mesh(g, this.shell())
    this.glassBack = new THREE.Mesh(g, this.glass(THREE.BackSide, 0.3))
    this.glassBack.renderOrder = 2
    this.glassFront = new THREE.Mesh(g, this.glass(THREE.FrontSide, 1))
    this.glassFront.renderOrder = 3
    this.scene.add(this.far, this.glassBack, this.glassFront)
    // the reading frame: the brain's bounds across the coronal plane plus room for the rise and a margin
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (let q = 0; q < m.position.length; q += 3) {
      const x = m.position[q]
      const y = m.position[q + 1]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    const fw = x1 - x0 + 10
    const fh = y1 - y0 + 12
    this.frame.scale.set(fw, fh, 1)
    this.frame.position.set((x0 + x1) / 2, (y0 + y1) / 2 + 1.5, 0)
    ;(this.frame.material as THREE.ShaderMaterial).uniforms.uSize.value.set(fw, fh)
    if (this.tokens) this.setTokens(this.tokens)
  }

  hasVent(idx: number) {
    return this.vents.has(idx)
  }

  setVent(idx: number, m: MeshData) {
    this.vents.set(idx, this.geometry(m))
  }

  /** Per-vertex flag on a ventricle surface: 1 where it lies outside the pre-flight ventricles (new fluid space). */
  setGrowth(idx: number, grow: Float32Array) {
    const g = this.vents.get(idx)
    if (!g) return
    g.setAttribute('aGrow', new THREE.BufferAttribute(grow, 1))
  }

  setTokens(t: SceneTokens) {
    this.tokens = t
    this.faceKey = ''
    const glow = t.glow ?? t.mark
    if (this.far) {
      const u = (this.far.material as THREE.ShaderMaterial).uniforms
      u.uColor.value = col(t.specimen)
      // shadows fall towards the stage colour with a little of the glow in them, never to flat black
      u.uShadow.value = col(mixRgb(mixRgb(mixRgb(t.specimen, [0, 0, 0], 0.88), t.stage, 0.3), glow, 0.07))
      u.uRimCol.value = col(glow)
      for (const m of [this.glassBack!, this.glassFront!]) {
        const g = (m.material as THREE.ShaderMaterial).uniforms
        g.uColor.value = col(t.glass)
        g.uGlow.value = col(glow)
      }
    }
    ;(this.face.material as THREE.ShaderMaterial).uniforms.uEdge.value = col(glow)
    ;(this.frame.material as THREE.ShaderMaterial).uniforms.uColor.value = col(glow)
    const v = (this.vent.material as THREE.ShaderMaterial).uniforms
    v.uColor2.value = col(t.mark2)
  }

  resize(w: number, h: number, dpr: number, pad: { top: number; right: number; bottom: number; left: number }, alignTop = false) {
    this.w = w
    this.h = h
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    const s = Math.min(1, Math.max(0, (aspect - 0.7) / 0.8))
    const e = s * s * (3 - 2 * s)
    const az = THREE.MathUtils.degToRad(16 + 22 * e)
    this.az0 = az
    const el = THREE.MathUtils.degToRad(27 - 5 * e)
    this.el0 = el
    const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
    const cam = this.camera
    cam.aspect = aspect
    cam.clearViewOffset()
    const safeW = Math.max(40, w - pad.left - pad.right)
    const safeH = Math.max(40, h - pad.top - pad.bottom)
    let dist = 900
    const p = this.shellPos
    for (let pass = 0; pass < 3; pass++) {
      this.dist0 = dist
      cam.position.copy(dir).multiplyScalar(dist)
      cam.lookAt(0, 0, 0)
      cam.updateProjectionMatrix()
      cam.updateMatrixWorld(true)
      let x0 = Infinity
      let x1 = -Infinity
      let y0 = Infinity
      let y1 = -Infinity
      if (p) {
        for (let q = 0; q < p.length; q += 3 * 7) {
          this.tmp.set(p[q], p[q + 1] + 1.3, p[q + 2]).project(cam)
          if (this.tmp.x < x0) x0 = this.tmp.x
          if (this.tmp.x > x1) x1 = this.tmp.x
          if (this.tmp.y < y0) y0 = this.tmp.y
          if (this.tmp.y > y1) y1 = this.tmp.y
        }
      } else {
        x0 = y0 = -0.5
        x1 = y1 = 0.5
      }
      const pw = ((x1 - x0) / 2) * w
      const ph = ((y1 - y0) / 2) * h
      const k = Math.max(pw / safeW, ph / safeH)
      if (pass < 2) {
        dist *= k
        continue
      }
      // centre the projected bounds in the safe area by shifting the view window
      const cx = ((x0 + x1) / 2) * 0.5 * w + w / 2
      const cy = (-(y0 + y1) / 2) * 0.5 * h + h / 2
      const dx = cx - (pad.left + safeW / 2)
      const dy = cy - (pad.top + (alignTop ? ph / 2 : safeH / 2))
      cam.setViewOffset(w, h, dx, dy, w, h)
      cam.updateProjectionMatrix()
      this.rect = { x0: cx - pw / 2 - dx, x1: cx + pw / 2 - dx, y0: cy - ph / 2 - dy, y1: cy + ph / 2 - dy }
    }
  }

  /** Scene point (glTF mm) -> stage CSS px. */
  project(x: number, y: number, z: number): [number, number] {
    this.tmp.set(x, y, z).project(this.camera)
    return [(this.tmp.x * 0.5 + 0.5) * this.w, (-this.tmp.y * 0.5 + 0.5) * this.h]
  }

  /** Paints the cut face: the real slice, then what Model B says about each voxel of it. */
  paintFace(f: FacePaint) {
    const t = this.tokens
    if (!t) return
    const q = (x: number) => Math.round(x * 24)
    const key = `${f.k}|${q(f.map)}|${q(f.measured)}|${q(f.growth)}|${f.seg ? 1 : 0}`
    if (key === this.faceKey) return
    this.faceKey = key
    const { vol, seg, preSeg } = f
    const d = this.faceData
    const k = f.k
    const classA = [0, 0, 0.86, 0.86, 0.86, 0.86]
    for (let i = 0; i < NI; i++) {
      for (let j = 0; j < NJ; j++) {
        const v = (i * NJ + j) * NK + k
        const g = vol[v]
        const c = seg ? seg[v] : 0
        const pc = preSeg ? preSeg[v] : 0
        const o = ((NJ - 1 - j) * NI + i) * 4
        this.grey[o >> 2] = g
        if (!(g > 0 || c > 0 || pc > 0)) {
          d[o] = d[o + 1] = d[o + 2] = d[o + 3] = 0
          continue
        }
        const lum = this.lut[g]
        let r = t.scan[0] * lum
        let gg = t.scan[1] * lum
        let b = t.scan[2] * lum
        if (c === 1 && f.measured > 0) {
          let m = t.mark
          if (f.growth > 0 && pc !== 1) m = mixRgb(t.mark, t.mark2, f.growth)
          const a = 0.94 * f.measured
          r += (m[0] - r) * a
          gg += (m[1] - gg) * a
          b += (m[2] - b) * a
        } else if (c >= 2 && f.map > 0) {
          const m = t.classes[c - 2]
          const a = classA[c] * f.map
          r += (m[0] - r) * a
          gg += (m[1] - gg) * a
          b += (m[2] - b) * a
        }
        d[o] = r
        d[o + 1] = gg
        d[o + 2] = b
        d[o + 3] = 255
      }
    }
    this.softenEdge()
    this.faceTex.needsUpdate = true
  }

  /**
   * The outline of the slice. The crop's own edge is a rim of near-black voxels (fluid around the brain) plus a few
   * stray ones: the rim is peeled up to 3 mm, pieces under 40 voxels go, and the edge gets a soft alpha ramp.
   * Only the outline changes; no voxel inside it is altered.
   */
  private softenEdge() {
    const d = this.faceData
    const { mask, grey, depth, queue } = this
    const N = NI * NJ
    let head = 0
    let tail = 0
    for (let p = 0; p < N; p++) {
      mask[p] = d[p * 4 + 3] ? 1 : 0
      depth[p] = 0
      if (!mask[p]) queue[tail++] = p
    }
    const DARK = 40
    const PEEL = 3
    const near = (p: number, fn: (q: number) => void) => {
      const x = p % NI
      if (x > 0) fn(p - 1)
      if (x < NI - 1) fn(p + 1)
      if (p >= NI) fn(p - NI)
      if (p < N - NI) fn(p + NI)
    }
    while (head < tail) {
      const p = queue[head++]
      const dp = depth[p]
      if (dp >= PEEL) continue
      near(p, (q) => {
        if (mask[q] === 1 && grey[q] < DARK) {
          mask[q] = 0
          depth[q] = dp + 1
          queue[tail++] = q
        }
      })
    }
    // stray pieces: flood each kept region, drop the small ones (mask 2 = visited and kept)
    for (let p = 0; p < N; p++) {
      if (mask[p] !== 1) continue
      head = 0
      tail = 0
      queue[tail++] = p
      mask[p] = 2
      while (head < tail) {
        near(queue[head++], (q) => {
          if (mask[q] === 1) {
            mask[q] = 2
            queue[tail++] = q
          }
        })
      }
      if (tail < 40) for (let q = 0; q < tail; q++) mask[queue[q]] = 0
    }
    // colour bleeds two voxels outward so the soft edge carries the slice's own tone, never black
    for (let pass = 0; pass < 2; pass++) {
      tail = 0
      for (let p = 0; p < N; p++) {
        if (mask[p]) continue
        let r = 0
        let g = 0
        let b = 0
        let n = 0
        near(p, (q) => {
          if (mask[q]) {
            r += d[q * 4]
            g += d[q * 4 + 1]
            b += d[q * 4 + 2]
            n++
          }
        })
        if (n) {
          d[p * 4] = r / n
          d[p * 4 + 1] = g / n
          d[p * 4 + 2] = b / n
          queue[tail++] = p
        }
      }
      for (let q = 0; q < tail; q++) mask[queue[q]] = 3
    }
    // alpha: a 3 x 3 blur of the kept outline
    for (let p = 0; p < N; p++) {
      const x = p % NI
      if (x === 0 || x === NI - 1 || p < NI || p >= N - NI) {
        d[p * 4 + 3] = 0
        continue
      }
      let a = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (mask[p + dy * NI + dx] === 2) a += (dx ? 1 : 2) * (dy ? 1 : 2)
        }
      }
      d[p * 4 + 3] = a * 16 > 255 ? 255 : a * 16
    }
  }

  /** Forces the next paintFace to repaint (new data under the same key, e.g. live slices arriving). */
  dirtyFace() {
    this.faceKey = ''
  }

  draw(p: DrawParams) {
    const t = this.tokens
    if (!t) return
    const time = p.time ?? 0
    const scan = p.scan ?? 0
    // the camera leaves its rest pose only while the model reads; the view window set by resize stays
    const cam = this.camera
    const az = this.az0 + (p.daz ?? 0)
    const el = this.el0 + (p.del ?? 0)
    cam.position.set(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(this.dist0 * (1 - (p.dolly ?? 0)))
    cam.lookAt(0, 0, 0)
    cam.updateMatrixWorld(true)
    // the key light drifts slowly, so the wet surface is never quite still
    this.light.set(0.62 + 0.2 * Math.sin(time * 0.33), 0.72, 0.34 + 0.1 * Math.cos(time * 0.33)).normalize()
    const cutZ = p.cutK - 104
    this.face.position.z = cutZ
    const fu = (this.face.material as THREE.ShaderMaterial).uniforms
    fu.uScan.value = scan
    fu.uTime.value = time
    if (this.far) {
      const u = (this.far.material as THREE.ShaderMaterial).uniforms
      // the far half ends a hair behind the face so the two never fight for the same depth
      u.uCutZ.value = cutZ + 0.35
      u.uRise.value = p.rise
      u.uScan.value = scan
      for (const m of [this.glassBack!, this.glassFront!]) {
        const g = (m.material as THREE.ShaderMaterial).uniforms
        g.uCutZ.value = cutZ
        g.uRise.value = p.rise
        g.uRead.value = scan
        g.uDone.value = p.measured
        g.uTime.value = time
      }
    }
    this.frame.position.z = cutZ
    const fr = (this.frame.material as THREE.ShaderMaterial).uniforms
    fr.uA.value = scan
    fr.uTime.value = time
    this.frame.visible = scan > 0.01
    const geo = this.vents.get(p.ventIdx)
    if (geo) {
      const glow = t.glow ?? t.mark
      const body = mixRgb(t.fluid, t.mark, p.measured)
      this.vent.geometry = geo
      this.vent.visible = true
      const u = (this.vent.material as THREE.ShaderMaterial).uniforms
      u.uColor.value = col(body)
      u.uShadow.value = col(mixRgb(mixRgb(body, [0, 0, 0], 0.8), t.stage, 0.2))
      u.uGrowth.value = p.growth
      // light = fluid here now, not before, shown where the surface meets the slice (3 mm band), not over the whole surface
      u.uCutZ.value = cutZ
      u.uRim.value = 3
      u.uGlow.value = 0.3 + 0.7 * p.measured
      u.uTime.value = time
      if (this.lastVent !== p.ventIdx) {
        if (this.lastVent >= 0 && time > 0) this.kickAt = time
        this.lastVent = p.ventIdx
      }
      const kick = time > 0 ? Math.exp(-Math.max(0, time - this.kickAt) * 2.6) : 0
      const breathe = 1 + 0.16 * Math.sin(time * 1.5) + 1.6 * kick
      for (const h of this.halos) {
        h.geometry = geo
        h.visible = true
        const hu = (h.material as THREE.ShaderMaterial).uniforms
        hu.uColor.value = col(mixRgb(t.fluid, glow, p.measured))
        hu.uStrength.value = (h.userData.strength as number) * (0.3 + 0.7 * p.measured) * breathe
        hu.uCutZ.value = cutZ
      }
      // measured fluid behind the slice glows through the tissue; unmeasured fluid gives off only a trace
      this.xray.geometry = geo
      this.xray.visible = true
      const xu = (this.xray.material as THREE.ShaderMaterial).uniforms
      xu.uColor.value = col(mixRgb(t.fluid, glow, p.measured))
      xu.uStrength.value = 0.03 + 0.1 * p.measured + 0.16 * p.measured * scan + 0.12 * kick
      xu.uCutZ.value = cutZ
      xu.uTime.value = time
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) (m.material as THREE.Material).dispose()
    })
    for (const g of this.vents.values()) g.dispose()
    this.far?.geometry.dispose()
    this.face.geometry.dispose()
    this.faceTex.dispose()
    this.renderer.dispose()
  }
}

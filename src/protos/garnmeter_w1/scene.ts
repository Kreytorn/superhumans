// Garn Meter, immersive take: a point-cloud head wearing 14 rings of real recorded brainwaves.
// Each ring is one EEG channel; one turn of the ring is the 4 s (512 samples) the model reads.
// The ring plane is the gauge: it tilts and the dust swirls with the crew check-in (Garn), never with the EEG estimate.
import * as THREE from 'three'

export interface SceneHandle {
  setSignal(eeg: Float32Array, nSamples: number, sigma: number[]): void
  setElectrodes(pos: [number, number][]): void
  /** Sample index where the shown 4 s window ends. null = idle loop over the calm baseline. */
  setPlayhead(end: number | null): void
  /** Check-in Garn 0..1 and zone (null = no check-in yet). */
  setGarn(g: number, zone: 0 | 1 | 2 | null): void
  pulse(): void
  resize(): void
  dispose(): void
}

const N = 512
const CH = 14
const R0 = 1.12
const DR = 0.078
const HEAD_Y = 0.42
const PLANE_Y = HEAD_Y - 1.42
const HEAD_S = 1.2

const PROFILE: [number, number, number, number][] = [
  // y, half width, front depth, back depth
  [-1.3, 0.34, 0.24, 0.4],
  [-1.05, 0.31, 0.22, 0.37],
  [-0.84, 0.31, 0.24, 0.36],
  [-0.72, 0.4, 0.56, 0.4],
  [-0.56, 0.5, 0.68, 0.48],
  [-0.36, 0.58, 0.7, 0.62],
  [-0.15, 0.63, 0.71, 0.74],
  [0.05, 0.67, 0.72, 0.82],
  [0.24, 0.7, 0.74, 0.86],
  [0.44, 0.69, 0.71, 0.86],
  [0.62, 0.64, 0.64, 0.8],
  [0.8, 0.54, 0.54, 0.68],
  [0.95, 0.4, 0.4, 0.5],
  [1.05, 0.2, 0.2, 0.26],
  [1.09, 0.0, 0.0, 0.0],
]

function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
}

function profileAt(y: number): [number, number, number] {
  const P = PROFILE
  let i = 0
  while (i < P.length - 2 && y > P[i + 1][0]) i++
  const a = P[Math.max(0, i - 1)]
  const b = P[i]
  const c = P[i + 1]
  const d = P[Math.min(P.length - 1, i + 2)]
  const t = Math.min(1, Math.max(0, (y - b[0]) / (c[0] - b[0])))
  return [Math.max(0, cr(a[1], b[1], c[1], d[1], t)), Math.max(0, cr(a[2], b[2], c[2], d[2], t)), Math.max(0, cr(a[3], b[3], c[3], d[3], t))]
}

/** Point on the head surface at height y and azimuth th (0 = nose, +x = the person's left on screen right). */
function headPoint(y: number, th: number, out: THREE.Vector3) {
  const [w, f, b] = profileAt(y)
  const s = Math.sin(th)
  const c = Math.cos(th)
  let x = w * s
  let z = c >= 0 ? f * c : b * c
  const a = Math.abs(Math.atan2(s, c))
  z += 0.3 * Math.exp(-((a / 0.17) ** 2)) * Math.exp(-(((y + 0.13) / 0.14) ** 2)) * (1 - 0.6 * Math.exp(-(((y + 0.24) / 0.05) ** 2))) // nose
  z += 0.07 * Math.exp(-((a / 0.5) ** 2)) * Math.exp(-(((y - 0.16) / 0.07) ** 2)) // brow
  z += 0.13 * Math.exp(-((a / 0.34) ** 2)) * Math.exp(-(((y + 0.68) / 0.09) ** 2)) // chin
  z -= 0.09 * Math.exp(-(((a - 0.4) / 0.18) ** 2)) * Math.exp(-(((y - 0.04) / 0.08) ** 2)) // eye sockets
  z += 0.05 * Math.exp(-((a / 0.3) ** 2)) * Math.exp(-(((y + 0.42) / 0.06) ** 2)) // lips
  x += Math.sign(s) * 0.075 * Math.exp(-(((a - 1.72) / 0.16) ** 2)) * Math.exp(-(((y + 0.03) / 0.17) ** 2)) // ears
  return out.set(x, y, z)
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _c = new THREE.Vector3()
const _d = new THREE.Vector3()
/** True surface normal by finite differences, so the nose, brow and chin catch the rim light. */
function surfNormal(y: number, th: number, p: THREE.Vector3, out: THREE.Vector3) {
  headPoint(y + 0.012, th, _a)
  headPoint(y - 0.012, th, _b)
  headPoint(y, th + 0.02, _c)
  headPoint(y, th - 0.02, _d)
  _a.sub(_b)
  _c.sub(_d)
  out.crossVectors(_c, _a)
  if (out.lengthSq() < 1e-10) out.set(p.x, 0.5, p.z)
  out.normalize()
  if (out.x * p.x + out.z * p.z + out.y * (y - 0.1) * 0.3 < 0) out.negate()
  return out
}

const ZONE_COL = [new THREE.Color('#58f0b4'), new THREE.Color('#ffc857'), new THREE.Color('#ff4d6d')]
const IDLE_COL = new THREE.Color('#62d8ff')

export function createScene(canvas: HTMLCanvasElement, host: HTMLElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80)
  const add = THREE.AdditiveBlending

  // ---- head (points on stacked contours)
  const head = new THREE.Group()
  head.position.y = HEAD_Y
  head.scale.setScalar(HEAD_S)
  scene.add(head)
  const hp: number[] = []
  const hn: number[] = []
  const v = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const SL = 78
  for (let i = 0; i < SL; i++) {
    const y = -1.3 + (2.39 * i) / (SL - 1)
    const [w] = profileAt(y)
    const n = Math.max(10, Math.round(150 * (w / 0.7)))
    for (let j = 0; j < n; j++) {
      const th = (j / n) * Math.PI * 2 + (i % 2) * (Math.PI / n)
      headPoint(y, th, v)
      hp.push(v.x, v.y, v.z)
      surfNormal(y, th, v, v2)
      hn.push(v2.x, v2.y, v2.z)
    }
  }
  // meridians, so the face reads as a drawn hologram and not a cloud
  for (let m = 0; m < 20; m++) {
    const th = (m / 20) * Math.PI * 2
    for (let i = 0; i < 230; i++) {
      const y = -1.3 + (2.39 * i) / 229
      headPoint(y, th, v)
      hp.push(v.x, v.y, v.z)
      surfNormal(y, th, v, v2)
      hn.push(v2.x, v2.y, v2.z)
    }
  }
  const headGeo = new THREE.BufferGeometry()
  headGeo.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3))
  headGeo.setAttribute('normal0', new THREE.Float32BufferAttribute(hn, 3))
  const headMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: add,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uColor: { value: new THREE.Color('#9fe8ff') }, uTint: { value: IDLE_COL.clone() } },
    vertexShader: `
      attribute vec3 normal0; uniform float uTime; uniform float uPx; varying float vA; varying float vScan;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal0);
        vec3 vd = normalize(-mv.xyz);
        float d = dot(n, vd);
        float rim = pow(1.0 - abs(d), 2.4);
        float facing = smoothstep(-0.5, 0.35, d);
        float sy = mix(-1.5, 1.25, fract(uTime * 0.16));
        vScan = exp(-pow((position.y - sy) / 0.07, 2.0));
        vA = ((0.07 + 1.25 * rim) * mix(0.16, 1.0, facing) + vScan * 0.75) * smoothstep(-1.32, -0.92, position.y);
        gl_PointSize = uPx * (1.7 + 1.6 * vScan) * (7.2 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uTint; varying float vA; varying float vScan;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, r) * vA;
        gl_FragColor = vec4(mix(uColor, uTint, 0.35) + vScan * 0.4, a);
      }`,
  })
  head.add(new THREE.Points(headGeo, headMat))

  // ---- electrodes
  const elPos = new Float32Array(CH * 3)
  const elAmp = new Float32Array(CH)
  const elAz = new Float32Array(CH)
  const elGeo = new THREE.BufferGeometry()
  elGeo.setAttribute('position', new THREE.BufferAttribute(elPos, 3))
  elGeo.setAttribute('amp', new THREE.BufferAttribute(elAmp, 1))
  const elMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: add,
    uniforms: { uPx: { value: 1 }, uTint: { value: IDLE_COL.clone() } },
    vertexShader: `
      attribute float amp; uniform float uPx; varying float vAmp;
      void main(){ vAmp = amp; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uPx * (13.0 + 22.0 * amp) * (7.2 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uTint; varying float vAmp;
      void main(){ float r = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(0.34, 0.14, r); float halo = pow(max(0.0, 1.0 - r), 2.2);
        float ring = smoothstep(0.08, 0.0, abs(r - 0.62)) * 0.5;
        vec3 c = mix(uTint, vec3(1.0), core * 0.85);
        gl_FragColor = vec4(c, core + halo * (0.35 + 0.65 * vAmp) + ring); }`,
  })
  const elPoints = new THREE.Points(elGeo, elMat)
  elPoints.visible = false
  head.add(elPoints)

  // ---- tilting world: rings + polar grid
  const tilt = new THREE.Group()
  tilt.position.y = PLANE_Y
  scene.add(tilt)

  const ringPos: Float32Array[] = []
  const ringCol: Float32Array[] = []
  const curPos: Float32Array[] = []
  const curCol: Float32Array[] = []
  const ringGeo: THREE.BufferGeometry[] = []
  const curGeo: THREE.BufferGeometry[] = []
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: add, depthWrite: false })
  const curMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: add, depthWrite: false, side: THREE.DoubleSide })
  const idx: number[] = []
  for (let j = 0; j < N; j++) {
    const a = j * 2
    const b = ((j + 1) % N) * 2
    idx.push(a, a + 1, b, b, a + 1, b + 1)
  }
  for (let k = 0; k < CH; k++) {
    const p = new Float32Array(N * 3)
    const c = new Float32Array(N * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    const line = new THREE.LineLoop(g, lineMat)
    line.frustumCulled = false
    tilt.add(line)
    ringPos.push(p)
    ringCol.push(c)
    ringGeo.push(g)
    const cp = new Float32Array(N * 6)
    const cc = new Float32Array(N * 6)
    const cg = new THREE.BufferGeometry()
    cg.setAttribute('position', new THREE.BufferAttribute(cp, 3))
    cg.setAttribute('color', new THREE.BufferAttribute(cc, 3))
    cg.setIndex(idx)
    const mesh = new THREE.Mesh(cg, curMat)
    mesh.frustumCulled = false
    tilt.add(mesh)
    curPos.push(cp)
    curCol.push(cc)
    curGeo.push(cg)
  }

  // write head: where the newest sample lands
  const whGeo = new THREE.BufferGeometry()
  whGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  const whMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: add, depthWrite: false })
  const wh = new THREE.Line(whGeo, whMat)
  wh.frustumCulled = false
  tilt.add(wh)

  // polar grid of the tilting horizon
  const gp: number[] = []
  const gc: number[] = []
  const GR0 = R0 + CH * DR + 0.18
  const fade = (r: number) => 0.26 * Math.max(0, 1 - (r - GR0) / 12) ** 2.2
  const radii = [GR0, GR0 + 0.5, GR0 + 1.2, GR0 + 2.1, GR0 + 3.3, GR0 + 4.9, GR0 + 7, GR0 + 9.6]
  for (const r of radii) {
    const a = fade(r) + (r === GR0 ? 0.25 : 0)
    for (let i = 0; i < 160; i++) {
      const t0 = (i / 160) * Math.PI * 2
      const t1 = ((i + 1) / 160) * Math.PI * 2
      gp.push(r * Math.sin(t0), 0, r * Math.cos(t0), r * Math.sin(t1), 0, r * Math.cos(t1))
      gc.push(a, a, a, a, a, a)
    }
  }
  for (let s = 0; s < 48; s++) {
    const th = (s / 48) * Math.PI * 2
    const major = s % 4 === 0
    const steps = 14
    for (let i = 0; i < steps; i++) {
      const ra = GR0 + ((major ? 11 : 0.22) * i) / steps
      const rb = GR0 + ((major ? 11 : 0.22) * (i + 1)) / steps
      const a0 = major ? fade(ra) * 0.8 : 0.4
      const a1 = major ? fade(rb) * 0.8 : 0.4
      gp.push(ra * Math.sin(th), 0, ra * Math.cos(th), rb * Math.sin(th), 0, rb * Math.cos(th))
      gc.push(a0, a0, a0, a1, a1, a1)
    }
  }
  const gridGeo = new THREE.BufferGeometry()
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3))
  gridGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3))
  const gridMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: add, depthWrite: false, color: IDLE_COL.clone() })
  tilt.add(new THREE.LineSegments(gridGeo, gridMat))

  // level reference: the horizon the body expects (never tilts)
  const lv: number[] = []
  const LR = GR0 - 0.09
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * Math.PI * 2
    lv.push(LR * Math.sin(t), 0, LR * Math.cos(t))
  }
  const lvGeo = new THREE.BufferGeometry()
  lvGeo.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3))
  const lvMat = new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, dashSize: 0.07, gapSize: 0.09, depthWrite: false })
  const level = new THREE.Line(lvGeo, lvMat)
  level.computeLineDistances()
  level.position.y = PLANE_Y
  scene.add(level)

  // leads: electrode -> its ring
  const leadPos = new Float32Array(CH * 6)
  const leadCol = new Float32Array(CH * 6)
  const leadGeo = new THREE.BufferGeometry()
  leadGeo.setAttribute('position', new THREE.BufferAttribute(leadPos, 3))
  leadGeo.setAttribute('color', new THREE.BufferAttribute(leadCol, 3))
  const leads = new THREE.LineSegments(leadGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: add, depthWrite: false }))
  leads.frustumCulled = false
  leads.visible = false
  scene.add(leads)

  // dust that swirls faster as the Garn climbs
  const DN = 1700
  const dp = new Float32Array(DN * 3)
  const ds = new Float32Array(DN)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  for (let i = 0; i < DN; i++) {
    const r = 1.4 + Math.pow(rnd(), 1.4) * 9
    const t = rnd() * Math.PI * 2
    dp[i * 3] = r * Math.sin(t)
    dp[i * 3 + 1] = (rnd() - 0.5) * (1.2 + r * 0.55)
    dp[i * 3 + 2] = r * Math.cos(t)
    ds[i] = rnd()
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3))
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(ds, 1))
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: add,
    uniforms: { uSwirl: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uTint: { value: IDLE_COL.clone() }, uGarn: { value: 0 } },
    vertexShader: `
      attribute float seed; uniform float uSwirl; uniform float uTime; uniform float uPx; uniform float uGarn; varying float vA;
      void main(){
        float r = length(position.xz);
        float ang = uSwirl * (3.2 / (r + 0.6)) + seed * 0.3;
        float c = cos(ang), s = sin(ang);
        vec3 p = vec3(c * position.x + s * position.z, position.y + sin(uTime * (0.2 + seed) + seed * 40.0) * (0.05 + 0.25 * uGarn), -s * position.x + c * position.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = (0.25 + 0.75 * seed) * smoothstep(11.0, 3.0, r) * (0.55 + 0.45 * uGarn);
        gl_PointSize = uPx * (1.2 + 2.6 * seed * seed) * (7.2 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uTint; varying float vA;
      void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(mix(vec3(0.8, 0.92, 1.0), uTint, 0.5), smoothstep(0.5, 0.0, r) * vA * 0.7); }`,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  dust.position.y = HEAD_Y - 0.4
  scene.add(dust)

  // ---- state
  let eeg: Float32Array | null = null
  let nSamples = 0
  let sigma: number[] = []
  let playhead: number | null = null
  let shownEnd = N * 2
  let garnT = 0
  let garn = 0
  let zone: 0 | 1 | 2 | null = null
  let pulse = 0
  let th0 = 0.55
  let swirl = 0
  let narrow = false
  const tint = IDLE_COL.clone()
  const tintT = IDLE_COL.clone()
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  const tmpC = new THREE.Color()

  function writeRings(end: number) {
    if (!eeg) return
    const e = Math.max(N, Math.min(nSamples, Math.round(end)))
    const boost = 1 + pulse * 0.9
    for (let k = 0; k < CH; k++) {
      const p = ringPos[k]
      const c = ringCol[k]
      const cp = curPos[k]
      const cc = curCol[k]
      const r = R0 + k * DR
      const off = k * nSamples + e - N
      const sg = sigma[k] || 1
      const kk = 0.55 + 0.45 * (k / (CH - 1))
      for (let j = 0; j < N; j++) {
        const th = th0 - ((N - 1 - j) / N) * Math.PI * 2
        const val = eeg[off + j] / sg
        const d = Math.tanh(val / 3.2) * 0.13
        const x = r * Math.sin(th)
        const z = r * Math.cos(th)
        const age = j / (N - 1)
        const a = (0.16 + 0.84 * age * age) * boost * kk
        const hot = j > N - 14 ? (j - (N - 14)) / 14 : 0
        const j3 = j * 3
        p[j3] = x
        p[j3 + 1] = d
        p[j3 + 2] = z
        c[j3] = tint.r * a + hot * 0.7
        c[j3 + 1] = tint.g * a + hot * 0.7
        c[j3 + 2] = tint.b * a + hot * 0.7
        const j6 = j * 6
        cp[j6] = x
        cp[j6 + 1] = d
        cp[j6 + 2] = z
        cp[j6 + 3] = x
        cp[j6 + 4] = 0
        cp[j6 + 5] = z
        const ca = a * (0.1 + Math.min(1, Math.abs(d) * 9) * 0.22)
        cc[j6] = tint.r * ca
        cc[j6 + 1] = tint.g * ca
        cc[j6 + 2] = tint.b * ca
        cc[j6 + 3] = 0
        cc[j6 + 4] = 0
        cc[j6 + 5] = 0
      }
      ringGeo[k].attributes.position.needsUpdate = true
      ringGeo[k].attributes.color.needsUpdate = true
      curGeo[k].attributes.position.needsUpdate = true
      curGeo[k].attributes.color.needsUpdate = true
      elAmp[k] = Math.min(1, Math.abs(eeg[off + N - 1] / sg) / 3)
    }
    elGeo.attributes.amp.needsUpdate = true
    const w = whGeo.attributes.position.array as Float32Array
    w[0] = (R0 - 0.07) * Math.sin(th0)
    w[2] = (R0 - 0.07) * Math.cos(th0)
    w[3] = (R0 + (CH - 1) * DR + 0.07) * Math.sin(th0)
    w[5] = (R0 + (CH - 1) * DR + 0.07) * Math.cos(th0)
    whGeo.attributes.position.needsUpdate = true
  }

  function resize() {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    narrow = w / h < 1.05
    camera.fov = narrow ? 50 : 36
    camera.updateProjectionMatrix()
    const px = (h / 900) * dpr * (narrow ? 0.9 : 1)
    headMat.uniforms.uPx.value = px
    elMat.uniforms.uPx.value = px
    dustMat.uniforms.uPx.value = px
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  const onMove = (ev: PointerEvent) => {
    mouse.x = (ev.clientX / window.innerWidth) * 2 - 1
    mouse.y = (ev.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onMove)

  const clock = new THREE.Clock()
  let raf = 0
  let visible = true
  const io = new IntersectionObserver((es) => (visible = es[0]?.isIntersecting ?? true))
  io.observe(host)
  const wp = new THREE.Vector3()

  function frame() {
    raf = requestAnimationFrame(frame)
    if (!visible) return
    const dt = Math.min(0.05, clock.getDelta())
    const t = clock.elapsedTime
    garn += (garnT - garn) * (1 - Math.exp(-dt * 2.4))
    pulse *= Math.exp(-dt * 5)
    tintT.copy(zone === null ? IDLE_COL : ZONE_COL[zone])
    tint.lerp(tintT, 1 - Math.exp(-dt * 3))
    swirl += dt * (0.05 + garn * 1.15)
    th0 += dt * (0.05 + garn * 0.1)

    // the horizon: level at 0 Garn, tipped and precessing at 1 Garn
    tilt.rotation.z = -garn * 0.42 + garn * 0.07 * Math.sin(t * 0.83)
    tilt.rotation.x = garn * 0.2 * Math.sin(t * 0.57 + 1.0) + garn * 0.1
    lvMat.opacity = 0.5 * Math.min(1, garn * 4)

    if (eeg) {
      if (playhead === null) shownEnd = N + ((t * 128) % N)
      else shownEnd = playhead
      writeRings(shownEnd)
      // leads
      tilt.updateMatrixWorld()
      head.updateMatrixWorld()
      for (let k = 0; k < CH; k++) {
        wp.set(elPos[k * 3], elPos[k * 3 + 1], elPos[k * 3 + 2]).applyMatrix4(head.matrixWorld)
        leadPos[k * 6] = wp.x
        leadPos[k * 6 + 1] = wp.y
        leadPos[k * 6 + 2] = wp.z
        const r = R0 + k * DR
        wp.set(r * Math.sin(elAz[k]), 0, r * Math.cos(elAz[k])).applyMatrix4(tilt.matrixWorld)
        leadPos[k * 6 + 3] = wp.x
        leadPos[k * 6 + 4] = wp.y
        leadPos[k * 6 + 5] = wp.z
        const a = 0.1 + 0.34 * elAmp[k]
        tmpC.copy(tint).multiplyScalar(a)
        leadCol[k * 6] = tmpC.r
        leadCol[k * 6 + 1] = tmpC.g
        leadCol[k * 6 + 2] = tmpC.b
        leadCol[k * 6 + 3] = tmpC.r * 0.25
        leadCol[k * 6 + 4] = tmpC.g * 0.25
        leadCol[k * 6 + 5] = tmpC.b * 0.25
      }
      leadGeo.attributes.position.needsUpdate = true
      leadGeo.attributes.color.needsUpdate = true
    }

    headMat.uniforms.uTime.value = t
    ;(headMat.uniforms.uTint.value as THREE.Color).copy(tint)
    ;(elMat.uniforms.uTint.value as THREE.Color).copy(tint)
    ;(dustMat.uniforms.uTint.value as THREE.Color).copy(tint)
    gridMat.color.copy(tint)
    dustMat.uniforms.uSwirl.value = swirl
    dustMat.uniforms.uTime.value = t
    dustMat.uniforms.uGarn.value = garn
    head.rotation.y = -1.32 + Math.sin(t * 0.21) * 0.16 + mouse.sx * 0.25

    mouse.sx += (mouse.x - mouse.sx) * 0.04
    mouse.sy += (mouse.y - mouse.sy) * 0.04
    const dist = narrow ? 9.2 : 8.3
    const az = Math.sin(t * 0.13) * 0.1 + mouse.sx * 0.16
    const el = 0.24 - mouse.sy * 0.06
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, HEAD_Y - 0.5 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
    camera.lookAt(0, HEAD_Y - (narrow ? 0.45 : 0.62), 0)
    camera.rotation.z += garn * 0.035 * Math.sin(t * 0.4)
    renderer.render(scene, camera)
  }
  frame()

  return {
    setSignal(e, n, s) {
      eeg = e
      nSamples = n
      sigma = s
    },
    setElectrodes(pos) {
      for (let k = 0; k < Math.min(CH, pos.length); k++) {
        const [x, y] = pos[k]
        const r = Math.hypot(x, y)
        const phi = r * 1.36
        const hy = 0.2 + Math.cos(phi) * 0.8
        const th = Math.atan2(x, y)
        headPoint(Math.min(0.97, hy), th, v)
        elPos[k * 3] = v.x * 1.03
        elPos[k * 3 + 1] = v.y + 0.01
        elPos[k * 3 + 2] = v.z * 1.03
        elAz[k] = th - 0.5
      }
      elGeo.attributes.position.needsUpdate = true
      elPoints.visible = true
      leads.visible = true
    },
    setPlayhead(end) {
      playhead = end
    },
    setGarn(g, z) {
      garnT = g
      zone = z
    },
    pulse() {
      pulse = 1
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
      })
      for (const m of [headMat, elMat, lineMat, curMat, whMat, gridMat, lvMat, dustMat]) m.dispose()
      renderer.dispose()
    },
  }
}

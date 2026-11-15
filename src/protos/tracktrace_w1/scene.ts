// The room the check lives in: one WebGL scene behind the whole page.
// - straight streaks of light crossing in depth (the theme: heavy ions fly straight) and soft out-of-focus discs
// - the hero nucleus as a hologram, built from the shipped 3D file (nuclei3d/P242_G4_003_003.json): the nucleus
//   outline extruded through the slices, the marching-cubes surface of the bright spots, the eight stored spot
//   positions and the stored 3D line fit (p0 to p1, never further). z is 3 px per slice: "z not to scale".
import * as THREE from 'three'

export interface Nucleus3D {
  frame: { centre: number[] }
  nucleus: { outline: number[] | number[][]; z0: number; z1: number; vertices: number[]; faces: number[] }
  foci_surface: { vertices: number[]; faces: number[] }
  foci: { id: number; xyz: number[] }[]
  line3d: { p0: number[]; p1: number[] } | null
  projection: { png_b64: string; origin_rc: number[]; size_hw: number[] }
}

export interface Phase {
  /** 0 = quiet, 1 = result on. */
  hot: number
  /** 0..7 while one of the eight scans runs, else -1. */
  scan: number
  /** How many of the stored spot markers are lit. */
  count: number
  line: boolean
}

export interface SceneHandle {
  setSlot(el: HTMLElement | null): void
  setNucleus(n: Nucleus3D): void
  setPhase(p: Phase): void
  dispose(): void
}

const STREAKS = 150
const SPAN = 46
const SCAN_ANGLES = [0, 180, 270, 90, 45, 225, 315, 135]

const streakVert = /* glsl */ `
  attribute vec3 aOrigin;
  attribute vec3 aDir;
  attribute vec4 aParams; // speed, phase, length, width px
  attribute vec2 aCorner; // x 0..1 along the tail, y -1..1 across
  uniform float uTime;
  uniform vec2 uRes;
  varying vec2 vC;
  varying float vFade;
  void main() {
    float t = fract(uTime * aParams.x + aParams.y);
    vec3 head = aOrigin + aDir * (t * ${SPAN.toFixed(1)} - ${(SPAN / 2).toFixed(1)});
    vec3 tail = head - aDir * aParams.z;
    vec4 cH = projectionMatrix * viewMatrix * vec4(head, 1.0);
    vec4 cT = projectionMatrix * viewMatrix * vec4(tail, 1.0);
    vec4 c = mix(cH, cT, aCorner.x);
    vec2 d = (cH.xy / max(cH.w, 0.001) - cT.xy / max(cT.w, 0.001)) * uRes;
    d = normalize(d + vec2(0.0001));
    vec2 n = vec2(-d.y, d.x);
    c.xy += n * aCorner.y * aParams.w * 2.0 / uRes * c.w;
    gl_Position = c;
    vC = aCorner;
    vFade = sin(3.14159 * t);
  }
`
const streakFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uGain;
  varying vec2 vC;
  varying float vFade;
  void main() {
    float along = pow(1.0 - vC.x, 2.4);
    float across = 1.0 - vC.y * vC.y;
    float a = along * across * across * vFade * uGain;
    gl_FragColor = vec4(uColor * a, a);
  }
`

const bokehVert = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.07 * (0.5 + aSeed.x) + aSeed.y * 6.28) * 0.9;
    p.y += cos(uTime * 0.05 * (0.5 + aSeed.y) + aSeed.z * 6.28) * 0.7;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (18.0 + aSeed.z * 70.0) * uScale / -mv.z;
    vA = 0.05 + 0.11 * aSeed.x;
  }
`
const bokehFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float disc = smoothstep(1.0, 0.86, r);
    float rim = smoothstep(0.62, 0.92, r) * disc;
    float a = (disc * 0.55 + rim * 0.75) * vA;
    gl_FragColor = vec4(uColor * a, a);
  }
`

const holoVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  void main() {
    vL = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const scanGlsl = /* glsl */ `
  uniform vec2 uScanDir;
  uniform float uScanPos;
  uniform float uScanOn;
  float scanBand(vec3 l) {
    float d = dot(l.xy, uScanDir) - uScanPos;
    return exp(-d * d / 60.0) * uScanOn;
  }
`
const shellFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uHot;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  ${scanGlsl}
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
    float a = 0.035 + f * (0.34 + 0.12 * uHot) + scanBand(vL) * 0.55;
    gl_FragColor = vec4(uColor * a, a);
  }
`
const fociFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uCold;
  uniform vec3 uHotColor;
  uniform float uHot;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vL;
  ${scanGlsl}
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float s = dot(n, v) < 0.0 ? -1.0 : 1.0;
    float nv = abs(dot(n, v));
    float rim = pow(1.0 - nv, 3.2);
    float diff = 0.5 + 0.5 * dot(n * s, normalize(vec3(0.35, 0.85, 0.4)));
    diff = diff * diff;
    vec3 cold = mix(vec3(0.10, 0.17, 0.25), uCold, diff);
    vec3 hotc = mix(vec3(0.42, 0.0, 0.24), vec3(1.0, 0.2, 0.62), diff);
    vec3 col = mix(cold, hotc, uHot) + mix(vec3(0.6, 0.85, 1.0), vec3(1.0, 0.78, 0.92), uHot) * rim * 0.4;
    col += vec3(0.8, 0.95, 1.0) * scanBand(vL) * 0.9;
    gl_FragColor = vec4(col, 1.0);
  }
`

function glowTexture(inner: string, ring = false): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  if (ring) {
    g.strokeStyle = inner
    g.lineWidth = 7
    g.beginPath()
    g.arc(64, 64, 46, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = inner
    g.beginPath()
    g.arc(64, 64, 5, 0, Math.PI * 2)
    g.fill()
  } else {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, inner)
    gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.22)'))
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createScene(canvas: HTMLCanvasElement, opts: { reduced: boolean }): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  camera.position.set(0, 0, 10)
  const HALF = Math.tan((20 * Math.PI) / 180) * 10
  const res = new THREE.Vector2(1, 1)
  const disposables: { dispose(): void }[] = []

  // ---- straight streaks -------------------------------------------------------------------------------
  const rnd = (() => {
    let s = 7
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  const sg = new THREE.BufferGeometry()
  const aOrigin = new Float32Array(STREAKS * 4 * 3)
  const aDir = new Float32Array(STREAKS * 4 * 3)
  const aParams = new Float32Array(STREAKS * 4 * 4)
  const aCorner = new Float32Array(STREAKS * 4 * 2)
  const idx = new Uint16Array(STREAKS * 6)
  const main = new THREE.Vector3(0.74, -0.38, 0.56).normalize()
  for (let i = 0; i < STREAKS; i++) {
    const d = new THREE.Vector3()
    if (rnd() < 0.72) d.copy(main).add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.34)).normalize()
    else d.set(rnd() - 0.5, rnd() - 0.5, (rnd() - 0.5) * 0.8).normalize()
    const o = [(rnd() - 0.5) * 30, (rnd() - 0.5) * 18, -16 + rnd() * 20]
    const near = o[2] > -2
    const p = [0.018 + rnd() * 0.05, rnd(), 1.6 + rnd() * 5.5, near ? 1.1 + rnd() * 1.5 : 0.7 + rnd() * 0.8]
    const corners = [0, -1, 0, 1, 1, -1, 1, 1]
    for (let v = 0; v < 4; v++) {
      aOrigin.set(o, (i * 4 + v) * 3)
      aDir.set([d.x, d.y, d.z], (i * 4 + v) * 3)
      aParams.set(p, (i * 4 + v) * 4)
      aCorner.set([corners[v * 2], corners[v * 2 + 1]], (i * 4 + v) * 2)
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6)
  }
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAKS * 4 * 3), 3))
  sg.setAttribute('aOrigin', new THREE.BufferAttribute(aOrigin, 3))
  sg.setAttribute('aDir', new THREE.BufferAttribute(aDir, 3))
  sg.setAttribute('aParams', new THREE.BufferAttribute(aParams, 4))
  sg.setAttribute('aCorner', new THREE.BufferAttribute(aCorner, 2))
  sg.setIndex(new THREE.BufferAttribute(idx, 1))
  const streakMat = new THREE.ShaderMaterial({
    vertexShader: streakVert, fragmentShader: streakFrag, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uRes: { value: res }, uColor: { value: new THREE.Color('#9fd4ff') }, uGain: { value: 0.62 } },
  })
  const streaks = new THREE.Mesh(sg, streakMat)
  streaks.frustumCulled = false
  streaks.renderOrder = 0
  scene.add(streaks)
  disposables.push(sg, streakMat)

  // ---- soft discs ----------------------------------------------------------------------------------------
  const BOKEH = 70
  const bg = new THREE.BufferGeometry()
  const bp = new Float32Array(BOKEH * 3)
  const bs = new Float32Array(BOKEH * 3)
  for (let i = 0; i < BOKEH; i++) {
    bp.set([(rnd() - 0.5) * 26, (rnd() - 0.5) * 15, -14 + rnd() * 17], i * 3)
    bs.set([rnd(), rnd(), rnd()], i * 3)
  }
  bg.setAttribute('position', new THREE.BufferAttribute(bp, 3))
  bg.setAttribute('aSeed', new THREE.BufferAttribute(bs, 3))
  const bokehMat = new THREE.ShaderMaterial({
    vertexShader: bokehVert, fragmentShader: bokehFrag, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uColor: { value: new THREE.Color('#5fa8e8') } },
  })
  const bokeh = new THREE.Points(bg, bokehMat)
  bokeh.frustumCulled = false
  scene.add(bokeh)
  disposables.push(bg, bokehMat)

  // ---- the hologram ---------------------------------------------------------------------------------------
  const holo = new THREE.Group() // placed on the slot
  const tilt = new THREE.Group()
  const spin = new THREE.Group()
  holo.add(tilt)
  tilt.add(spin)
  holo.visible = false
  scene.add(holo)
  const scanU = { uScanDir: { value: new THREE.Vector2(1, 0) }, uScanPos: { value: 0 }, uScanOn: { value: 0 } }
  const hotU = { value: 0 }
  const glowTex = glowTexture('rgba(140,205,255,0.5)')
  const ringTex = glowTexture('rgba(255,79,176,1)', true)
  const hotGlowTex = glowTexture('rgba(255,120,200,0.8)')
  disposables.push(glowTex, ringTex, hotGlowTex)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0.55 }))
  halo.scale.set(330, 330, 1)
  halo.renderOrder = 1
  holo.add(halo)
  const markers: THREE.Sprite[] = []
  let lineMesh: THREE.Mesh | null = null
  let pulse: THREE.Sprite | null = null
  let lineA = new THREE.Vector3()
  let lineB = new THREE.Vector3()
  let radius = 70

  function setNucleus(n: Nucleus3D) {
    while (spin.children.length) spin.remove(spin.children[0])
    markers.length = 0
    const cx = n.frame.centre[0]
    const cy = n.frame.centre[1]
    const zm = (n.nucleus.z0 + n.nucleus.z1) / 2
    const tx = (x: number, y: number, z: number): [number, number, number] => [x - cx, -(y - cy), z - zm]
    const conv = (flat: number[]) => {
      const out = new Float32Array(flat.length)
      for (let i = 0; i < flat.length; i += 3) out.set(tx(flat[i], flat[i + 1], flat[i + 2]), i)
      return out
    }
    // shell
    const shellG = new THREE.BufferGeometry()
    shellG.setAttribute('position', new THREE.BufferAttribute(conv(n.nucleus.vertices), 3))
    shellG.setIndex(n.nucleus.faces)
    shellG.computeVertexNormals()
    const shellM = new THREE.ShaderMaterial({
      vertexShader: holoVert, fragmentShader: shellFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, uniforms: { uColor: { value: new THREE.Color('#8fd6ff') }, uHot: hotU, ...scanU },
    })
    const shell = new THREE.Mesh(shellG, shellM)
    shell.renderOrder = 4
    spin.add(shell)
    disposables.push(shellG, shellM)
    // contour stack: the outline once per slice
    const flatOutline = (Array.isArray(n.nucleus.outline[0]) ? (n.nucleus.outline as number[][]).flat() : (n.nucleus.outline as number[]))
    const pts = flatOutline.length / 2
    let r2 = 0
    const SL = 9
    const lp = new Float32Array(SL * pts * 2 * 3)
    for (let s = 0; s < SL; s++) {
      const z = n.nucleus.z0 + ((n.nucleus.z1 - n.nucleus.z0) * s) / (SL - 1)
      for (let i = 0; i < pts; i++) {
        const j = (i + 1) % pts
        const a = tx(flatOutline[i * 2], flatOutline[i * 2 + 1], z)
        const b = tx(flatOutline[j * 2], flatOutline[j * 2 + 1], z)
        lp.set(a, (s * pts + i) * 6)
        lp.set(b, (s * pts + i) * 6 + 3)
        r2 = Math.max(r2, a[0] * a[0] + a[1] * a[1])
      }
    }
    radius = Math.sqrt(r2) || 70
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    const lm = new THREE.LineBasicMaterial({ color: '#a8e0ff', transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
    const loops = new THREE.LineSegments(lg, lm)
    loops.renderOrder = 5
    spin.add(loops)
    disposables.push(lg, lm)
    // the real projection under the stack
    const img = new Image()
    img.onload = () => {
      const tex = new THREE.Texture(img)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      const [r0, c0] = n.projection.origin_rc
      const [h, w] = n.projection.size_hw
      const pg = new THREE.PlaneGeometry(w, h)
      const pm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: '#d8efff' })
      const plane = new THREE.Mesh(pg, pm)
      const c = tx(c0 - 0.5 + w / 2, r0 - 0.5 + h / 2, n.nucleus.z0 - 9)
      plane.position.set(c[0], c[1], c[2])
      plane.renderOrder = 2
      spin.add(plane)
      disposables.push(tex, pg, pm)
    }
    img.src = 'data:image/png;base64,' + n.projection.png_b64
    // bright-spot surface
    const fg = new THREE.BufferGeometry()
    fg.setAttribute('position', new THREE.BufferAttribute(conv(n.foci_surface.vertices), 3))
    fg.setIndex(n.foci_surface.faces)
    fg.computeVertexNormals()
    const fm = new THREE.ShaderMaterial({
      vertexShader: holoVert, fragmentShader: fociFrag, side: THREE.DoubleSide,
      uniforms: { uCold: { value: new THREE.Color('#8fb4cc') }, uHotColor: { value: new THREE.Color('#ff4fb0') }, uHot: hotU, ...scanU },
    })
    const fmesh = new THREE.Mesh(fg, fm)
    fmesh.renderOrder = 3
    spin.add(fmesh)
    disposables.push(fg, fm)
    // stored spot markers
    for (const f of n.foci) {
      const m = new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 })
      const s = new THREE.Sprite(m)
      const p = tx(f.xyz[0], f.xyz[1], f.xyz[2])
      s.position.set(p[0], p[1], p[2])
      s.scale.set(0.01, 0.01, 1)
      s.renderOrder = 7
      spin.add(s)
      markers.push(s)
      disposables.push(m)
    }
    // stored 3D line fit, p0 to p1 only
    lineMesh = null
    pulse = null
    if (n.line3d) {
      lineA = new THREE.Vector3(...tx(n.line3d.p0[0], n.line3d.p0[1], n.line3d.p0[2]))
      lineB = new THREE.Vector3(...tx(n.line3d.p1[0], n.line3d.p1[1], n.line3d.p1[2]))
      const len = lineA.distanceTo(lineB)
      const cg = new THREE.CylinderGeometry(0.75, 0.75, len, 8, 1, true)
      const cm = new THREE.MeshBasicMaterial({ color: '#ff6cc0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })
      lineMesh = new THREE.Mesh(cg, cm)
      lineMesh.position.copy(lineA).add(lineB).multiplyScalar(0.5)
      lineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lineB.clone().sub(lineA).normalize())
      lineMesh.renderOrder = 6
      spin.add(lineMesh)
      const pmat = new THREE.SpriteMaterial({ map: hotGlowTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 })
      pulse = new THREE.Sprite(pmat)
      pulse.scale.set(26, 26, 1)
      pulse.renderOrder = 8
      spin.add(pulse)
      disposables.push(cg, cm, pmat)
    }
    holo.visible = true
  }

  // ---- loop -------------------------------------------------------------------------------------------------
  let slot: HTMLElement | null = null
  let phase: Phase = { hot: 0, scan: -1, count: 0, line: false }
  let hot = 0
  let lineOn = 0
  let scanOn = 0
  let scanStart = 0
  let lastScan = -1
  let raf = 0
  let W = 0
  let H = 0
  const t0 = performance.now()
  const markerK = new Float32Array(32)
  // the judge's pointer leans the hologram a little: the room answers
  let px = 0
  let py = 0
  let ex = 0
  let ey = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    px = (e.clientX / Math.max(1, innerWidth)) * 2 - 1
    py = (e.clientY / Math.max(1, innerHeight)) * 2 - 1
  }
  if (!opts.reduced) addEventListener('pointermove', onMove, { passive: true })

  function size() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === W && h === H) return
    W = w
    H = h
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    res.set(w, h)
    bokehMat.uniforms.uScale.value = h / 90
  }

  function frame() {
    raf = requestAnimationFrame(frame)
    if (document.hidden) return
    size()
    const now = performance.now()
    const time = opts.reduced ? 12 : (now - t0) / 1000
    streakMat.uniforms.uTime.value = time
    bokehMat.uniforms.uTime.value = time
    // seat the hologram on its slot
    if (slot && holo.children.length) {
      const r = slot.getBoundingClientRect()
      const cr = canvas.getBoundingClientRect()
      const on = r.bottom > cr.top - 80 && r.top < cr.bottom + 80 && r.width > 10
      holo.visible = on && spin.children.length > 0
      if (on) {
        const nx = ((r.left + r.width / 2 - cr.left) / cr.width) * 2 - 1
        const ny = -(((r.top + r.height / 2 - cr.top) / cr.height) * 2 - 1)
        const upp = (2 * HALF) / cr.height
        holo.position.set(nx * HALF * camera.aspect, ny * HALF, 0)
        const sc = (Math.min(r.width * 0.92, r.height * 1.2) * 0.5 * upp) / radius
        holo.scale.setScalar(sc)
      }
    }
    ex += (px - ex) * 0.05
    ey += (py - ey) * 0.05
    tilt.rotation.x = -0.9 + Math.sin(time * 0.21) * 0.07 + ey * 0.22
    tilt.rotation.y = Math.sin(time * 0.17) * 0.1 + ex * 0.32
    spin.rotation.z = opts.reduced ? 0.5 : time * 0.16 + 0.5
    // phase easing
    hot += (phase.hot - hot) * 0.06
    hotU.value = hot
    lineOn += ((phase.line ? 1 : 0) - lineOn) * 0.08
    if (phase.scan !== lastScan) {
      lastScan = phase.scan
      scanStart = now
      if (phase.scan >= 0) {
        const a = (SCAN_ANGLES[phase.scan % 8] * Math.PI) / 180
        scanU.uScanDir.value.set(Math.cos(a), Math.sin(a))
      }
    }
    scanOn += ((phase.scan >= 0 ? 1 : 0) - scanOn) * 0.2
    scanU.uScanOn.value = scanOn
    scanU.uScanPos.value = -radius + Math.min(1, (now - scanStart) / 175) * radius * 2
    for (let i = 0; i < markers.length; i++) {
      const target = i < phase.count ? 1 : 0
      markerK[i] += (target - markerK[i]) * 0.14
      const k = markerK[i]
      const s = 15 * (0.6 + 0.4 * k) * (1 + 0.06 * Math.sin(time * 2.4 + i))
      markers[i].scale.set(s, s, 1)
      markers[i].material.opacity = k
    }
    if (lineMesh) (lineMesh.material as THREE.MeshBasicMaterial).opacity = lineOn * 0.95
    if (pulse) {
      const u = opts.reduced ? 0.5 : (time * 0.55) % 1
      pulse.position.lerpVectors(lineA, lineB, u)
      pulse.material.opacity = lineOn * Math.sin(Math.PI * u)
    }
    halo.material.opacity = 0.42 + 0.25 * hot
    halo.scale.setScalar(radius * 4.6)
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    setSlot(el) {
      slot = el
    },
    setNucleus,
    setPhase(p) {
      phase = p
    },
    dispose() {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove)
      for (const d of disposables) d.dispose()
      renderer.dispose()
      // hand the context back now (a page opened many times must not use up the browser's WebGL contexts)
      renderer.forceContextLoss()
    },
  }
}

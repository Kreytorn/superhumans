// The listening chamber: the clip's real log-mel picture (the model's own input) drawn as a ridged landscape.
// Height and brightness = the stored spectrogram value; the amber tint = the model's bubble map (attention).
// Nothing here is counted or located: the orb only follows the loudness of the column under the playhead.
import * as THREE from 'three'
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'

const TW = 512 // texture columns (time)
const ROWS = 64 // mel bands
const COLS = 400 // drawn columns
export const WORLD_W = 16
const DEPTH = 7.5

const VERT = /* glsl */ `
uniform sampler2D uSpec; uniform sampler2D uMap;
uniform float uHead; uniform float uTime; uniform float uLag; uniform float uLift;
attribute vec2 aUv;
varying float vS; varying float vHeard; varying float vAtt; varying vec2 vUv; varying float vFog;
void main(){
  vUv = aUv;
  float s = texture2D(uSpec, aUv).r;
  float heard = 1.0 - smoothstep(uHead - 0.004, uHead + 0.004, aUv.x);
  float att = texture2D(uMap, vec2(aUv.x, 0.5)).r;
  float attOn = 1.0 - smoothstep(uHead - uLag - 0.012, uHead - uLag + 0.012, aUv.x);
  vAtt = att * attOn;
  float e = pow(s, 1.8);
  float swell = 0.5 + 0.5 * sin(aUv.x * 26.0 - uTime * 0.9 + aUv.y * 7.0);
  float h = e * mix(0.40 + 0.14 * swell, 1.0, heard) * 2.9 * uLift;
  h += vAtt * vAtt * e * 0.7;
  h += exp(-abs(aUv.x - uHead) * 70.0) * e * 0.5 * step(0.0005, uHead) * step(uHead, 0.9995);
  vec3 p = vec3((aUv.x - 0.5) * ${WORLD_W.toFixed(1)}, h, -(1.0 - aUv.y) * ${DEPTH.toFixed(1)});
  vS = s; vHeard = heard;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFog = smoothstep(5.0, 19.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`

const FRAG_LINE = /* glsl */ `
uniform float uHead; uniform vec3 uCold; uniform vec3 uHot; uniform vec3 uAmber;
varying float vS; varying float vHeard; varying float vAtt; varying vec2 vUv; varying float vFog;
void main(){
  float e = pow(vS, 1.4);
  vec3 c = mix(uCold * 0.66, mix(uCold, uHot, e), vHeard);
  c = mix(c, uAmber * (0.5 + 1.0 * e), clamp(vAtt * vAtt * 1.05, 0.0, 0.92));
  float live = step(0.0005, uHead) * step(uHead, 0.9995);
  c += vec3(1.0, 0.94, 0.82) * exp(-abs(vUv.x - uHead) * 110.0) * 1.5 * live;
  float a = (0.22 + 0.78 * e) * mix(0.72, 1.0, vHeard);
  a *= 1.0 - vFog;
  a *= smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x);
  gl_FragColor = vec4(c * a, 1.0);
}`

const FRAG_FILL = /* glsl */ `
uniform vec3 uBg; uniform vec3 uCold; uniform vec3 uAmber;
varying float vS; varying float vHeard; varying float vAtt; varying vec2 vUv; varying float vFog;
void main(){
  float e = pow(vS, 1.6);
  vec3 c = uBg * 1.25 + uCold * e * 0.16 * (0.35 + 0.65 * vHeard) + uAmber * vAtt * vAtt * (0.05 + 0.2 * e);
  gl_FragColor = vec4(mix(c, uBg, vFog), 1.0);
}`

const ORB_VERT = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uPx;
attribute float aSeed;
varying float vA;
void main(){
  vec3 n = normalize(position);
  float w = sin(n.x * 5.0 + uTime * 0.7 + aSeed * 6.283) * sin(n.y * 6.0 - uTime * 0.5) * sin(n.z * 4.0 + uTime * 0.3);
  float r = 1.0 + w * (0.05 + 0.22 * uLevel) + uLevel * 0.2 * aSeed;
  vec4 mv = modelViewMatrix * vec4(n * r * 1.9, 1.0);
  vA = 0.35 + 0.65 * smoothstep(-0.2, 1.0, n.z);
  gl_PointSize = uPx * (1.4 + 2.6 * aSeed * (0.5 + uLevel)) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const ORB_FRAG = /* glsl */ `
uniform vec3 uCold; uniform vec3 uAmber; uniform float uAtt; uniform float uLevel;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 c = mix(uCold, uAmber, smoothstep(0.3, 0.62, uAtt));
  gl_FragColor = vec4(c * a * vA * (0.45 + 0.8 * uLevel), 1.0);
}`

const HALO_FRAG = /* glsl */ `
uniform vec3 uCold; uniform vec3 uAmber; uniform float uAtt; uniform float uLevel; uniform float uTime;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float core = exp(-d * d * 7.0) * (0.10 + 0.26 * uLevel);
  float ring = exp(-pow((d - 0.42 - 0.1 * uLevel) * 16.0, 2.0)) * (0.07 + 0.2 * uLevel);
  float ring2 = exp(-pow((d - fract(uTime * 0.16) * 0.95) * 22.0, 2.0)) * 0.07 * (1.0 - fract(uTime * 0.16));
  vec3 c = mix(uCold, uAmber, smoothstep(0.3, 0.62, uAtt));
  gl_FragColor = vec4(c * (core + ring + ring2), 1.0);
}`

export interface ChamberFrame {
  /** Fraction of the clip heard, 0..1 (0 = idle, 1 = settled). */
  head: number
  /** Loudness of the column under the playhead, 0..1 (from the spectrogram). */
  level: number
  /** Bubble-map value under the playhead, 0..1. */
  att: number
  /** 0 idle, 1 running, 2 result. */
  mode: 0 | 1 | 2
  /** Pointer, -1..1. */
  px: number
  py: number
}

export function createChamber(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  const bg = new THREE.Color('#02070c')
  renderer.setClearColor(bg, 1)
  const scene = new THREE.Scene()
  scene.background = bg
  const camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 80)
  camera.position.set(0, 4.4, 9.5)

  const specData = new Uint8Array(TW * ROWS)
  const specTex = new THREE.DataTexture(specData, TW, ROWS, THREE.RedFormat, THREE.UnsignedByteType)
  specTex.minFilter = specTex.magFilter = THREE.LinearFilter
  specTex.wrapS = specTex.wrapT = THREE.ClampToEdgeWrapping
  const mapData = new Uint8Array(TW)
  const mapTex = new THREE.DataTexture(mapData, TW, 1, THREE.RedFormat, THREE.UnsignedByteType)
  mapTex.minFilter = mapTex.magFilter = THREE.LinearFilter

  const cold = new THREE.Color('#2aa9d8')
  const hot = new THREE.Color('#c9f6ff')
  const amber = new THREE.Color('#ff8a2e')
  const shared = {
    uSpec: { value: specTex },
    uMap: { value: mapTex },
    uHead: { value: 0 },
    uTime: { value: 0 },
    uLag: { value: 0.03 },
    uLift: { value: 1 },
    uCold: { value: cold },
    uHot: { value: hot },
    uAmber: { value: amber },
    uBg: { value: bg },
  }

  // ridgelines: one line per mel band
  const lv = new Float32Array(ROWS * COLS * 4)
  let k = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      lv[k++] = c / COLS
      lv[k++] = r / (ROWS - 1)
      lv[k++] = (c + 1) / COLS
      lv[k++] = r / (ROWS - 1)
    }
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('aUv', new THREE.BufferAttribute(lv, 2))
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((lv.length / 2) * 3), 3))
  const lineMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG_LINE, uniforms: shared, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
  const lines = new THREE.LineSegments(lineGeo, lineMat)
  lines.frustumCulled = false
  scene.add(lines)

  // dark skin under the lines, so near ridges hide far ones
  const FC = 200
  const fv = new Float32Array((FC + 1) * ROWS * 2)
  k = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= FC; c++) {
      fv[k++] = c / FC
      fv[k++] = r / (ROWS - 1)
    }
  const fi: number[] = []
  for (let r = 0; r < ROWS - 1; r++)
    for (let c = 0; c < FC; c++) {
      const a = r * (FC + 1) + c
      const b = a + 1
      const d = a + FC + 1
      fi.push(a, b, d, b, d + 1, d)
    }
  const fillGeo = new THREE.BufferGeometry()
  fillGeo.setAttribute('aUv', new THREE.BufferAttribute(fv, 2))
  fillGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((fv.length / 2) * 3), 3))
  fillGeo.setIndex(fi)
  const fillMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG_FILL, uniforms: shared, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2 })
  const fill = new THREE.Mesh(fillGeo, fillMat)
  fill.frustumCulled = false
  scene.add(fill)

  // playhead: a sheet of light across every band
  const sheetMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float uOn; void main(){ float a = pow(1.0 - vUv.y, 2.2) * 0.5 * uOn * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.7, vUv.x); gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * a, 1.0); }',
    uniforms: { uOn: { value: 0 } },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
  })
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, 4.2), sheetMat)
  sheet.rotation.y = Math.PI / 2
  sheet.position.set(0, 2.1, -DEPTH / 2)
  scene.add(sheet)

  // the orb: a beating body made of points; it swells with the loudness of the real recording
  const N = 5200
  const op = new Float32Array(N * 3)
  const os = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const th = i * 2.399963
    op[i * 3] = Math.cos(th) * rad
    op[i * 3 + 1] = y
    op[i * 3 + 2] = Math.sin(th) * rad
    os[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1
    if (os[i] < 0) os[i] += 1
  }
  const orbUniforms = { uTime: shared.uTime, uLevel: { value: 0 }, uAtt: { value: 0 }, uPx: { value: 30 }, uCold: shared.uCold, uAmber: shared.uAmber }
  const orbGeo = new THREE.BufferGeometry()
  orbGeo.setAttribute('position', new THREE.BufferAttribute(op, 3))
  orbGeo.setAttribute('aSeed', new THREE.BufferAttribute(os, 1))
  const orb = new THREE.Points(orbGeo, new THREE.ShaderMaterial({ vertexShader: ORB_VERT, fragmentShader: ORB_FRAG, uniforms: orbUniforms, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  orb.frustumCulled = false
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: HALO_FRAG,
      uniforms: orbUniforms,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  )
  const orbGroup = new THREE.Group()
  orbGroup.add(halo, orb)
  orbGroup.position.set(0, 4.6, -13.5)
  scene.add(orbGroup)

  // slow dust, for depth
  const DN = 900
  const dp = new Float32Array(DN * 3)
  for (let i = 0; i < DN; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 30
    dp[i * 3 + 1] = Math.random() * 9
    dp[i * 3 + 2] = -Math.random() * 22 + 6
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#6fd6ff', size: 0.035, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }))
  scene.add(dust)

  let composer: EffectComposer | null = null
  try {
    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType })
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 1.15, luminanceThreshold: 0.2, luminanceSmoothing: 0.35, mipmapBlur: true, radius: 0.72 })))
  } catch {
    composer = null
  }

  let aspect = 1.6
  const cam = { x: 0, y: 4.4, z: 9.5, tx: 0, ty: 2.2, tz: -3.2 }
  let level = 0
  let att = 0
  let last = performance.now()

  return {
    setData(spec: { rows: number; cols: number; data: Float32Array } | null, map: { values: Float32Array } | null) {
      if (spec) {
        // normalise to this clip's own range so quiet and loud clips both fill the height
        let lo = Infinity
        let hi = -Infinity
        for (let i = 0; i < spec.data.length; i += 7) {
          const v = spec.data[i]
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
        lo = Math.max(lo, -2.5)
        hi = Math.min(Math.max(hi, lo + 0.5), 3.5)
        for (let r = 0; r < ROWS; r++) {
          const sr = Math.min(spec.rows - 1, Math.round((r / (ROWS - 1)) * (spec.rows - 1)))
          for (let c = 0; c < TW; c++) {
            const c0 = Math.floor((c / TW) * spec.cols)
            const c1 = Math.max(c0 + 1, Math.floor(((c + 1) / TW) * spec.cols))
            let m = -Infinity
            for (let x = c0; x < c1 && x < spec.cols; x++) m = Math.max(m, spec.data[sr * spec.cols + x])
            specData[r * TW + c] = Math.max(0, Math.min(255, Math.round(((m - lo) / (hi - lo)) * 255)))
          }
        }
        const row = new Uint8Array(TW)
        for (let r = 0; r < ROWS; r++) {
          row.set(specData.subarray(r * TW, (r + 1) * TW))
          for (let c = 1; c < TW - 1; c++) specData[r * TW + c] = (row[c - 1] + 2 * row[c] + row[c + 1]) >> 2
        }
        specTex.needsUpdate = true
      }
      if (map) {
        const n = map.values.length
        for (let c = 0; c < TW; c++) mapData[c] = Math.round(Math.max(0, Math.min(1, map.values[Math.min(n - 1, Math.floor((c / TW) * n))])) * 255)
        mapTex.needsUpdate = true
      }
    },
    resize(w: number, h: number, dpr: number) {
      aspect = w / Math.max(1, h)
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      composer?.setSize(w, h)
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      orbUniforms.uPx.value = 34 * dpr * (h / 900)
    },
    frame(f: ChamberFrame) {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      shared.uTime.value += dt
      const t = shared.uTime.value
      shared.uHead.value = f.head
      level += (f.level - level) * Math.min(1, dt * 14)
      att += (f.att - att) * Math.min(1, dt * 5)
      orbUniforms.uLevel.value = f.mode === 1 ? level : 0.12 + 0.1 * Math.sin(t * 1.3) ** 2
      orbUniforms.uAtt.value = att
      const on = f.mode === 1 ? 1 : 0
      sheetMat.uniforms.uOn.value += (on - sheetMat.uniforms.uOn.value) * Math.min(1, dt * 6)
      const hx = (f.head - 0.5) * WORLD_W
      sheet.position.x = hx

      // camera: wide when quiet, riding beside the playhead while it listens
      const narrow = aspect < 0.9
      let gx = 0
      let gy = narrow ? 5.0 : 4.3
      let gz = narrow ? 11.5 : 10.4
      let gty = narrow ? 1.5 : f.mode === 0 ? 2.0 : 2.5
      let gtx = 0
      if (f.mode === 1) {
        gx = hx * (narrow ? 0.95 : 0.34)
        gy = narrow ? 4.2 : 3.6
        gz = narrow ? 9.4 : 9.0
        gty = narrow ? 1.4 : 2.2
        gtx = hx * (narrow ? 0.95 : 0.42)
      } else if (narrow) {
        gx = Math.sin(t * 0.16) * 5.4
        gtx = gx
      } else {
        gx = Math.sin(t * 0.11) * 0.7
      }
      gx += f.px * 0.55
      gy += -f.py * 0.3
      const e = Math.min(1, dt * 1.7)
      cam.x += (gx - cam.x) * e
      cam.y += (gy - cam.y) * e
      cam.z += (gz - cam.z) * e
      cam.tx += (gtx - cam.tx) * e
      cam.ty += (gty - cam.ty) * e
      camera.position.set(cam.x, cam.y, cam.z)
      camera.lookAt(cam.tx, cam.ty, cam.tz)
      orbGroup.position.x = cam.tx * 0.55 + (narrow ? 0 : 2.3)
      halo.lookAt(camera.position)
      orb.rotation.y = t * 0.07
      dust.rotation.y = Math.sin(t * 0.03) * 0.12
      dust.position.y = Math.sin(t * 0.1) * 0.2
      if (composer) composer.render(dt)
      else renderer.render(scene, camera)
    },
    dispose() {
      composer?.dispose()
      lineGeo.dispose()
      fillGeo.dispose()
      orbGeo.dispose()
      dustGeo.dispose()
      specTex.dispose()
      mapTex.dispose()
      renderer.dispose()
    },
  }
}

export type Chamber = ReturnType<typeof createChamber>

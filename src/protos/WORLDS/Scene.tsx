// WORLDS "Six worlds": one small solar system, drawn by code. Every world wears one of our real samples as its
// surface, lit by one sun. Pressing a world stops time, flies the camera to it and turns it to face the viewer.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { replay } from '../../engine/spikecount'
import { BASE, WORLDS, type ModuleId } from './data'

export interface SceneProps {
  focus: ModuleId | null
  hover: ModuleId | null
  /** the module page is open: draw only on demand */
  frozen: boolean
  labels: RefObject<(HTMLButtonElement | null)[]>
  onPick(id: ModuleId): void
  onHover(id: ModuleId | null): void
  onArrive(id: ModuleId): void
  onReady(): void
}

const FOV = 36
const FOV_TAN = Math.tan((FOV / 2) * (Math.PI / 180))
const SPIKE = 2 // index of the blood-cell belt
const FIELD_SIDE = 2.7 // world units across the microscope photo when the belt becomes the real sample

// ---------------------------------------------------------------------------------------------------- shaders
const NOISE = /* glsl */ `
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<3;i++){ s += a*vnoise(p); p = p*2.03+vec2(7.1,3.7); a *= .5; } return s; }
`

const WORLD_VERT = /* glsl */ `
varying vec3 vPosL; varying vec3 vNw; varying vec3 vWp;
void main(){
  vPosL = position;
  vNw = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWp = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

// The sample is projected straight through the globe (front and back), so the side that faces you is the real picture.
const WORLD_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform vec4 uCrop;
uniform float uRot, uInvert, uReal, uTime, uPulse, uGlow, uHover, uAlpha, uGamma;
uniform vec3 uTint, uBase, uRim;
varying vec3 vPosL; varying vec3 vNw; varying vec3 vWp;
void main(){
  vec3 pl = normalize(vPosL);
  vec2 q = mix(pl.xy, pl.yx, uRot);
  vec2 uv = uCrop.xy + (q*0.5+0.5)*uCrop.zw;
  vec3 tex = texture2D(uMap, uv).rgb;
  tex = mix(tex, 1.-tex, uInvert);
  vec3 raw = tex;
  tex = pow(tex, vec3(uGamma));
  float lum = dot(tex, vec3(.299,.587,.114));
  vec3 N = normalize(vNw);
  vec3 L = normalize(-vWp);
  vec3 V = normalize(cameraPosition - vWp);
  vec3 Lc = normalize(L + V*0.85);
  float ndl = dot(N, Lc);
  float day = smoothstep(-0.25, 0.75, ndl);
  float term = smoothstep(-0.2, 0.5, dot(N, L));
  float fres = pow(1.-max(dot(N,V),0.), 2.4);
  float pulse = 1. + uPulse*sin(uTime*2.6 - pl.x*6.);
  vec3 surf = (uBase + tex*uTint) * pulse;
  vec3 lit = surf*(0.07 + 1.12*day)*(0.72+0.28*term) + tex*uTint*lum*lum*uGlow*pulse + uRim*fres*(0.14+0.95*term);
  vec3 col = mix(lit, mix(tex, raw, 0.6) + uBase*0.4, uReal);
  col += uRim*fres*0.3*uReal;
  col *= 1. + 0.16*uHover;
  gl_FragColor = vec4(col, uAlpha);
}`

const RING_VERT = /* glsl */ `
varying vec2 vP; varying vec3 vWp;
void main(){ vP = position.xy; vec4 wp = modelMatrix*vec4(position,1.); vWp = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`

// The rings are the real spectrogram of the heart sound: time runs around the planet, pitch runs outward.
const RING_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform float uIn, uOut, uR, uReal, uAlpha; uniform vec3 uCenter;
varying vec2 vP; varying vec3 vWp;
void main(){
  float r = length(vP); float t = (r-uIn)/(uOut-uIn);
  float ang = atan(vP.y, vP.x)/6.2831853 + 0.5;
  float u = abs(fract(ang*2.)*2.-1.);
  vec3 tex = texture2D(uMap, vec2(0.03+0.94*u, 0.2+0.76*t)).rgb;
  float lum = dot(tex, vec3(.3333));
  float edge = smoothstep(0., .05, t)*smoothstep(1., .93, t);
  float gap = 1. - 0.9*smoothstep(0.035, 0.012, abs(t-0.6));
  vec3 d = normalize(-vWp); vec3 oc = uCenter - vWp; float pr = dot(oc, d);
  float miss = sqrt(max(dot(oc,oc) - pr*pr, 0.));
  float shade = pr > 0. ? smoothstep(uR*0.88, uR*1.06, miss) : 1.;
  shade = mix(shade, 1., uReal);
  vec3 col = tex*1.25*(0.12 + 0.88*shade);
  gl_FragColor = vec4(col, edge*gap*(0.3+0.7*lum)*0.95*uAlpha);
}`

const BG_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy, 0.9999, 1.); }`
// The dark is not empty: a faint web of warm filaments, like tissue seen from far inside.
const BG_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uSun; uniform float uAspect, uTime, uDim;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = (vUv-0.5)*vec2(uAspect,1.);
  vec2 s = (uSun-0.5)*vec2(uAspect,1.);
  float d = length(p-s);
  vec3 col = vec3(0.010,0.014,0.026);
  col += vec3(0.62,0.24,0.10)*exp(-d*3.4)*0.42;
  col += vec3(0.20,0.05,0.10)*exp(-d*1.25)*0.42;
  vec2 q = (p-s)*1.5 + vec2(uTime*0.006, -uTime*0.004);
  float w = fbm(q*1.3+2.7);
  float n = fbm(q + w*1.15);
  float ridge = pow(1.-abs(n*2.-1.), 6.);
  float reach = smoothstep(1.5, 0.15, d);
  float ridge2 = pow(1.-abs(fbm(q*2.3 - w*0.8 + 9.)*2.-1.), 9.);
  col += vec3(0.46,0.11,0.13)*ridge*0.42*reach;
  col += vec3(0.20,0.07,0.16)*ridge2*0.3*reach;
  col += vec3(0.025,0.05,0.11)*n*0.8;
  col *= 1. - 0.42*dot(p,p);
  col *= uDim;
  col += (hash21(gl_FragCoord.xy)-0.5)/200.;
  gl_FragColor = vec4(max(col,0.), 1.);
}`

const SUN_FRAG = /* glsl */ `
precision highp float;
uniform float uTime, uAlpha; varying vec3 vPosL; varying vec3 vNw; varying vec3 vWp;
${NOISE}
void main(){
  vec3 pl = normalize(vPosL);
  float g = fbm(pl.xy*3.4 + pl.z*1.9 + vec2(uTime*0.05, 0.));
  g += 0.5*fbm(pl.zy*8. + pl.x*3.1 - vec2(0., uTime*0.08));
  vec3 V = normalize(cameraPosition - vWp);
  float mu = max(dot(normalize(vNw), V), 0.);
  vec3 col = mix(vec3(1.0,0.46,0.16), vec3(1.0,0.93,0.74), smoothstep(0.45,1.15,g));
  col *= 0.72 + 0.5*pow(mu, 0.6);
  gl_FragColor = vec4(col*1.15, uAlpha);
}`

const GLOW_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`
const GLOW_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uPower, uCore; varying vec2 vUv;
void main(){
  float d = length(vUv-0.5)*2.;
  float a = exp(-d*d*uCore) + 0.22*exp(-d*3.2);
  a *= smoothstep(1., 0.55, d);
  gl_FragColor = vec4(uColor*a*uPower, 1.);
}`

const CELL_VERT = /* glsl */ `
attribute vec4 aRect; attribute float aSize; attribute vec3 aHome; attribute float aSeed;
uniform float uReal, uPx, uBoost, uTime;
varying vec4 vRect;
void main(){
  vec3 drift = position + vec3(sin(uTime*0.31+aSeed*6.3), cos(uTime*0.23+aSeed*9.1), sin(uTime*0.27+aSeed*4.7))*0.14;
  vec3 p = mix(drift, aHome, uReal);
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = aSize*mix(uBoost,1.,uReal)*uPx/-mv.z;
  vRect = aRect;
}`
// Each point is one real red blood cell, cut out of the microscope photo and lit like a tiny moon.
const CELL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform vec3 uLight; uniform float uReal, uDim, uShade;
varying vec4 vRect;
void main(){
  vec2 c = gl_PointCoord*2.-1.; float r2 = dot(c,c); if(r2 > 1.) discard;
  vec2 uv = vRect.xy + vec2(gl_PointCoord.x, 1.-gl_PointCoord.y)*vRect.zw;
  vec3 tex = texture2D(uMap, uv).rgb;
  vec3 n = vec3(c.x, -c.y, sqrt(1.-r2));
  float ndl = clamp(dot(n, normalize(uLight + vec3(0.,0.,1.05)))*0.9+0.2, 0., 1.);
  // the cell's own rim (membrane and spikes) from the photo's local contrast, so a far cell still reads as a real cell
  vec2 px = vRect.zw*0.035;
  float gx = dot(texture2D(uMap, uv+vec2(px.x,0.)).rgb - texture2D(uMap, uv-vec2(px.x,0.)).rgb, vec3(0.333));
  float gy = dot(texture2D(uMap, uv+vec2(0.,px.y)).rgb - texture2D(uMap, uv-vec2(0.,px.y)).rgb, vec3(0.333));
  float edge = smoothstep(0.02, 0.12, length(vec2(gx,gy)));
  float l = dot(tex, vec3(0.333));
  vec3 body = clamp((l-0.47)*1.9+0.46, 0.04, 1.2)*vec3(1.12,0.4,0.36)*(0.66+0.5*ndl);
  vec3 lit = (body + edge*vec3(1.05,0.78,0.66)*(0.5+0.55*ndl))*uShade;
  vec3 col = mix(lit, tex, uReal);
  float a = smoothstep(1., mix(0.78,0.9,uReal), r2);
  gl_FragColor = vec4(col, a*uDim);
}`

const FIELD_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform float uReal; varying vec2 vUv;
void main(){
  vec2 c = abs(vUv-0.5)*2.; float box = max(c.x, c.y);
  float corner = length(max(c-0.9, 0.));
  float a = smoothstep(0.1, 0.085, corner)*step(box, 1.);
  gl_FragColor = vec4(texture2D(uMap, vUv).rgb, a*uReal);
}`

// ------------------------------------------------------------------------------------------------- the build
interface Built {
  root: THREE.Group
  groups: THREE.Group[]
  mats: (THREE.ShaderMaterial | null)[]
  halos: THREE.Mesh[]
  orbits: THREE.LineLoop[]
  ring: THREE.ShaderMaterial
  ringMesh: THREE.Mesh
  sun: THREE.ShaderMaterial
  sunMesh: THREE.Mesh
  sunGlow: THREE.Mesh
  dust: THREE.PointsMaterial
  bg: THREE.ShaderMaterial
  cells: THREE.ShaderMaterial
  cellPoints: THREE.Points
  belt: THREE.ShaderMaterial
  beltPoints: THREE.Points
  field: THREE.ShaderMaterial
  loaded: { done: boolean }
  dispose(): void
}

function glowMesh(color: [number, number, number], power: number, core: number, size: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: { uColor: { value: new THREE.Vector3(...color) }, uPower: { value: power }, uCore: { value: core } },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  )
  m.renderOrder = 2
  return m
}

function build(): Built {
  const loaded = { done: false }
  const mgr = new THREE.LoadingManager()
  mgr.onLoad = () => {
    loaded.done = true
  }
  mgr.onError = () => {
    loaded.done = true
  }
  const loader = new THREE.TextureLoader(mgr)
  const tex = (path: string) => {
    const t = loader.load(BASE + path)
    t.colorSpace = THREE.NoColorSpace
    t.anisotropy = 4
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    return t
  }
  const root = new THREE.Group()
  const disposables: { dispose(): void }[] = []

  // backdrop
  const bg = new THREE.ShaderMaterial({
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    uniforms: { uSun: { value: new THREE.Vector2(0.6, 0.55) }, uAspect: { value: 1.6 }, uTime: { value: 0 }, uDim: { value: 1 } },
    depthTest: false,
    depthWrite: false,
  })
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bg)
  bgMesh.frustumCulled = false
  bgMesh.renderOrder = -10
  root.add(bgMesh)

  // the sun
  const sphere = new THREE.SphereGeometry(1, 64, 48)
  disposables.push(sphere)
  const sun = new THREE.ShaderMaterial({ vertexShader: WORLD_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } }, transparent: true })
  const sunMesh = new THREE.Mesh(sphere, sun)
  sunMesh.scale.setScalar(1.25)
  root.add(sunMesh)
  const sunGlow = glowMesh([1.0, 0.56, 0.24], 0.95, 7, 13)
  root.add(sunGlow)

  // dust in the orbital plane, so the system has depth
  const dustN = 220
  const dustPos = new Float32Array(dustN * 3)
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < dustN; i++) {
    const r = 2.2 + Math.pow(rnd(), 0.7) * 15
    const a = rnd() * Math.PI * 2
    dustPos[i * 3] = Math.cos(a) * r
    dustPos[i * 3 + 1] = (rnd() - 0.5) * 0.9 * (0.3 + r * 0.06)
    dustPos[i * 3 + 2] = Math.sin(a) * r
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({ color: 0xffc9a0, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false })
  root.add(new THREE.Points(dustGeo, dustMat))
  const dust = dustMat
  disposables.push(dustGeo, dustMat)

  const groups: THREE.Group[] = []
  const mats: (THREE.ShaderMaterial | null)[] = []
  const halos: THREE.Mesh[] = []
  const orbits: THREE.LineLoop[] = []
  let ring!: THREE.ShaderMaterial
  let ringMesh!: THREE.Mesh
  let fieldTex!: THREE.Texture

  WORLDS.forEach((w, i) => {
    // orbit line
    const pts: number[] = []
    for (let k = 0; k < 220; k++) {
      const a = (k / 220) * Math.PI * 2
      pts.push(Math.cos(a) * w.orbit, 0, Math.sin(a) * w.orbit)
    }
    const og = new THREE.BufferGeometry()
    og.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const om = new THREE.LineBasicMaterial({ color: 0xc9d6ee, transparent: true, opacity: 0.12, depthWrite: false })
    const line = new THREE.LineLoop(og, om)
    root.add(line)
    orbits.push(line)
    disposables.push(og, om)

    const g = new THREE.Group()
    root.add(g)
    groups.push(g)
    const map = tex(w.image)
    if (i === SPIKE) {
      fieldTex = map
      mats.push(null)
      const halo = glowMesh(w.rim, 0.0, 3, 1)
      halo.visible = false
      halos.push(halo)
      return
    }
    const mat = new THREE.ShaderMaterial({
      vertexShader: WORLD_VERT,
      fragmentShader: WORLD_FRAG,
      uniforms: {
        uMap: { value: map },
        uCrop: { value: new THREE.Vector4(...w.crop) },
        uRot: { value: w.rot ? 1 : 0 },
        uInvert: { value: w.invert ? 1 : 0 },
        uReal: { value: 0 },
        uTime: { value: 0 },
        uPulse: { value: w.pulse ?? 0 },
        uGlow: { value: w.glow },
        uHover: { value: 0 },
        uAlpha: { value: 1 },
        uGamma: { value: w.gamma ?? 1 },
        uTint: { value: new THREE.Vector3(...w.tint) },
        uBase: { value: new THREE.Vector3(...w.base) },
        uRim: { value: new THREE.Vector3(...w.rim) },
      },
      transparent: true,
    })
    const mesh = new THREE.Mesh(sphere, mat)
    mesh.scale.setScalar(w.size)
    g.add(mesh)
    mats.push(mat)
    disposables.push(mat, map)
    const halo = glowMesh(w.rim, 0.2, 5, w.size * 4.4)
    root.add(halo)
    halos.push(halo)
    if (w.id === 'bubblegrade') {
      const rin = w.size * 1.32
      const rout = w.size * 2.2
      ring = new THREE.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        uniforms: {
          uMap: { value: map },
          uIn: { value: rin },
          uOut: { value: rout },
          uR: { value: w.size },
          uReal: { value: 0 },
          uAlpha: { value: 1 },
          uCenter: { value: new THREE.Vector3() },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      ringMesh = new THREE.Mesh(new THREE.RingGeometry(rin, rout, 160, 1), ring)
      ringMesh.rotation.x = -Math.PI / 2
      ringMesh.renderOrder = 1
      g.add(ringMesh)
      disposables.push(ring, ringMesh.geometry)
    }
  })

  // the blood-cell belt: a dense drifting clump (the pressable world) and a sparse belt along its whole orbit
  const cellUniforms = (dim: number) => ({
    uMap: { value: fieldTex },
    uLight: { value: new THREE.Vector3(0, 0, 1) },
    uReal: { value: 0 },
    uPx: { value: 800 },
    uBoost: { value: 2.35 },
    uTime: { value: 0 },
    uDim: { value: 1 },
    uShade: { value: dim },
  })
  const cells = new THREE.ShaderMaterial({ vertexShader: CELL_VERT, fragmentShader: CELL_FRAG, uniforms: cellUniforms(1), transparent: true, depthWrite: false })
  const belt = new THREE.ShaderMaterial({ vertexShader: CELL_VERT, fragmentShader: CELL_FRAG, uniforms: cellUniforms(0.8), transparent: true, depthWrite: false })
  const cellPoints = new THREE.Points(new THREE.BufferGeometry(), cells)
  const beltPoints = new THREE.Points(new THREE.BufferGeometry(), belt)
  cellPoints.frustumCulled = false
  beltPoints.frustumCulled = false
  groups[SPIKE].add(cellPoints)
  root.add(beltPoints)
  const field = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: FIELD_FRAG,
    uniforms: { uMap: { value: fieldTex }, uReal: { value: 0 } },
    transparent: true,
    depthWrite: false,
  })
  const fieldMesh = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_SIDE, FIELD_SIDE), field)
  fieldMesh.position.z = -0.02
  groups[SPIKE].add(fieldMesh)
  disposables.push(cells, belt, field, fieldMesh.geometry, fieldTex)

  // Until the stored outlines arrive, cut the photo into a plain grid of windows; then use the real cell positions.
  const fill = (boxes: { cx: number; cy: number; r: number }[], W: number, H: number) => {
    const n = boxes.length
    const pos = new Float32Array(n * 3)
    const home = new Float32Array(n * 3)
    const rect = new Float32Array(n * 4)
    const size = new Float32Array(n)
    const sd = new Float32Array(n)
    boxes.forEach((b, k) => {
      const a = rnd() * Math.PI * 2
      const rr = Math.pow(rnd(), 0.5) * 2.2
      pos[k * 3] = Math.cos(a) * rr * 1.22
      pos[k * 3 + 1] = (rnd() - 0.5) * 1.1
      pos[k * 3 + 2] = Math.sin(a) * rr * 0.75
      home[k * 3] = (b.cx / W - 0.5) * FIELD_SIDE
      home[k * 3 + 1] = -(b.cy / H - 0.5) * FIELD_SIDE
      home[k * 3 + 2] = 0
      rect.set([(b.cx - b.r) / W, 1 - (b.cy + b.r) / H, (2 * b.r) / W, (2 * b.r) / H], k * 4)
      size[k] = ((2 * b.r) / W) * FIELD_SIDE
      sd[k] = rnd()
    })
    const geo = cellPoints.geometry
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3))
    geo.setAttribute('aRect', new THREE.BufferAttribute(rect, 4))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1))
    // the sparse belt reuses the same cells, spread along the whole orbit
    const m = 84
    const bp = new Float32Array(m * 3)
    const br = new Float32Array(m * 4)
    const bs = new Float32Array(m)
    const bd = new Float32Array(m)
    const R = WORLDS[SPIKE].orbit
    for (let k = 0; k < m; k++) {
      const b = boxes[k % n]
      const a = rnd() * Math.PI * 2
      const r = R + (rnd() - 0.5) * 1.1
      bp.set([Math.cos(a) * r, (rnd() - 0.5) * 0.5, Math.sin(a) * r], k * 3)
      br.set([(b.cx - b.r) / W, 1 - (b.cy + b.r) / H, (2 * b.r) / W, (2 * b.r) / H], k * 4)
      bs[k] = ((2 * b.r) / W) * FIELD_SIDE * (0.45 + rnd() * 0.45)
      bd[k] = rnd()
    }
    const bg2 = beltPoints.geometry
    bg2.setAttribute('position', new THREE.BufferAttribute(bp, 3))
    bg2.setAttribute('aHome', new THREE.BufferAttribute(bp.slice(), 3))
    bg2.setAttribute('aRect', new THREE.BufferAttribute(br, 4))
    bg2.setAttribute('aSize', new THREE.BufferAttribute(bs, 1))
    bg2.setAttribute('aSeed', new THREE.BufferAttribute(bd, 1))
  }
  const grid: { cx: number; cy: number; r: number }[] = []
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) grid.push({ cx: 60 + x * 90, cy: 60 + y * 90, r: 34 })
  fill(grid, 572, 572)
  let alive = true
  replay('field-96')
    .then((r) => {
      if (!alive || !r.cells.length) return
      const boxes = r.cells
        .filter((c) => !c.border)
        .map((c) => {
          let rad = 0
          for (const p of c.polygon) rad = Math.max(rad, Math.hypot(p[0] - c.center[0], p[1] - c.center[1]))
          return { cx: c.center[0], cy: c.center[1], r: rad + 2 }
        })
        .filter((b) => b.r > 8 && b.r < 70)
      if (boxes.length > 8) fill(boxes, r.width, r.height)
    })
    .catch(() => undefined)

  return {
    root,
    groups,
    mats,
    halos,
    orbits,
    ring,
    ringMesh,
    sun,
    sunMesh,
    sunGlow,
    dust,
    bg,
    cells,
    cellPoints,
    belt,
    beltPoints,
    field,
    loaded,
    dispose() {
      alive = false
      disposables.forEach((d) => d.dispose())
      cellPoints.geometry.dispose()
      beltPoints.geometry.dispose()
    },
  }
}

// ---------------------------------------------------------------------------------------------- camera poses
interface Pose {
  pos: THREE.Vector3
  quat: THREE.Quaternion
}
const ZERO = new THREE.Vector3()
const UP_Y = new THREE.Vector3(0, 1, 0)
const UP_X = new THREE.Vector3(1, 0, 0)
const _m = new THREE.Matrix4()
const _r = new THREE.Vector3()
const _u = new THREE.Vector3()

/** The camera looks along -dir at P from `dist` away, then slides sideways so P lands at (ndcX, ndcY). */
function setPose(out: Pose, P: THREE.Vector3, dir: THREE.Vector3, dist: number, ndcX: number, ndcY: number, up: THREE.Vector3, aspect: number) {
  _m.lookAt(dir, ZERO, up)
  out.quat.setFromRotationMatrix(_m)
  _r.set(1, 0, 0).applyQuaternion(out.quat)
  _u.set(0, 1, 0).applyQuaternion(out.quat)
  const hh = dist * FOV_TAN
  out.pos
    .copy(P)
    .addScaledVector(dir, dist)
    .addScaledVector(_r, -ndcX * hh * aspect)
    .addScaledVector(_u, -ndcY * hh)
}

/** Where a world is on its orbit: a full circle around the sun, inner worlds faster (angular speed ~ r^-1.5, as in a real system). */
const angleOf = (w: { a0: number; orbit: number }, _i: number, t: number) => w.a0 + t * (1.05 / Math.pow(w.orbit, 1.5))
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function System({ focus, hover, labels, onPick, onHover, onArrive, onReady }: SceneProps) {
  const { camera, size, gl, invalidate } = useThree()
  const coarse = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const b = useMemo(build, [])
  useEffect(() => () => b.dispose(), [b])
  useEffect(() => {
    gl.setClearColor(0x04060a, 1)
  }, [gl])

  const focusIdx = focus ? WORLDS.findIndex((w) => w.id === focus) : -1
  const hoverIdx = hover ? WORLDS.findIndex((w) => w.id === hover) : -1
  const live = useRef({ focusIdx, hoverIdx, onArrive, onReady })
  live.current = { focusIdx, hoverIdx, onArrive, onReady }

  const s = useRef({
    t: 0,
    clock: 0,
    speed: focusIdx >= 0 ? 0 : 1,
    real: WORLDS.map((_, i): number => (i === focusIdx ? 1 : 0)),
    hov: WORLDS.map(() => 0),
    prevFocus: focusIdx,
    flyT: 1,
    flyDur: 1.9,
    from: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() } as Pose,
    goal: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() } as Pose,
    home: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() } as Pose,
    first: true,
    solo: 0,
    px: 0,
    py: 0,
    arrived: -2,
    ready: false,
    frames: 0,
  })

  // a change of focus or size must be drawn even when the loop is on demand
  useEffect(() => {
    invalidate()
  }, [focusIdx, size.width, size.height, invalidate])

  const tmp = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      e: new THREE.Euler(),
      tilt: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0, 0.3)),
      face: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.36, 0, 0)),
      sunNdc: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((state, dtRaw) => {
    const st = s.current
    const { focusIdx: fi, hoverIdx: hi } = live.current
    const dt = Math.min(dtRaw, 0.05)
    const aspect = size.width / size.height
    const portrait = aspect < 0.85
    st.clock += dt

    // time stops while a world is open
    st.speed += ((fi >= 0 ? 0 : 1) - st.speed) * (1 - Math.exp(-dt * 3.5))
    if (st.speed < 0.002) st.speed = 0
    st.t += dt * st.speed

    // home pose
    const elev = (portrait ? 36 : 23) * (Math.PI / 180)
    const ws = portrait ? 1.2 : 1
    // the view leans a little with the pointer, so the system reads as a real space
    const lean = fi < 0 && !coarse ? 1 : 0
    st.px += (state.pointer.x * lean - st.px) * (1 - Math.exp(-dt * 2.2))
    st.py += (state.pointer.y * lean - st.py) * (1 - Math.exp(-dt * 2.2))
    const el2 = elev - st.py * 0.035
    const az = -st.px * 0.07
    tmp.dir.set(Math.sin(az) * Math.cos(el2), Math.sin(el2), Math.cos(az) * Math.cos(el2))
    const dist = portrait ? 66 : 30.5 * Math.max(1, 1.5 / aspect)
    setPose(st.home, ZERO, tmp.dir, dist, portrait ? -0.08 : 0.14, portrait ? -0.22 : 0.2, portrait ? UP_X : UP_Y, aspect)

    // worlds on their orbits
    WORLDS.forEach((w, i) => {
      const g = b.groups[i]
      const a = angleOf(w, i, st.t)
      g.position.set(Math.cos(a) * w.orbit, w.lift, Math.sin(a) * w.orbit)
      g.scale.setScalar(ws)
      if (i === SPIKE) b.beltPoints.rotation.y = 0.012 * st.t
    })

    // where the camera wants to be
    if (fi >= 0) {
      const w = WORLDS[fi]
      const P = b.groups[fi].position
      tmp.dir.copy(st.home.pos).sub(P)
      tmp.dir.y = Math.max(tmp.dir.y, 2) * 0.55
      tmp.dir.normalize()
      let frac: number, nx: number, ny: number
      if (size.width < 900) {
        frac = Math.min(0.2, (size.width * 0.5) / size.height)
        nx = 0
        ny = 1 - (2 * 168) / size.height
      } else {
        const col = Math.min(460, Math.max(340, size.width * 0.3))
        frac = Math.min(0.34, (col * 0.74) / size.height)
        nx = ((48 + col / 2) / size.width) * 2 - 1
        ny = 1 - 2 * 0.3
      }
      const d = (w.focusR * ws) / (frac * FOV_TAN)
      setPose(st.goal, P, tmp.dir, d, nx, ny, UP_Y, aspect)
    } else {
      st.goal.pos.copy(st.home.pos)
      st.goal.quat.copy(st.home.quat)
    }

    if (st.first) {
      st.first = false
      st.flyT = 1
      if (fi < 0 && !reduced) {
        // opening move: arrive from high above and settle into the home view
        tmp.v.set(-0.42, 0.78, 0.46).normalize()
        setPose(st.from, ZERO, tmp.v, dist * 1.75, 0, 0, portrait ? UP_X : UP_Y, aspect)
        st.flyT = 0
        st.flyDur = 2.7
        camera.position.copy(st.from.pos)
        camera.quaternion.copy(st.from.quat)
      } else {
        camera.position.copy(st.goal.pos)
        camera.quaternion.copy(st.goal.quat)
      }
    } else if (fi !== st.prevFocus) {
      st.from.pos.copy(camera.position)
      st.from.quat.copy(camera.quaternion)
      st.flyT = 0
      st.flyDur = fi >= 0 ? 1.9 : 1.6
      st.arrived = -2
    }
    st.prevFocus = fi
    if (st.flyT < 1) {
      if (b.loaded.done || fi >= 0) st.flyT = Math.min(1, st.flyT + dt / st.flyDur)
      const k = ease(st.flyT)
      camera.position.lerpVectors(st.from.pos, st.goal.pos, k)
      camera.quaternion.slerpQuaternions(st.from.quat, st.goal.quat, k)
    } else {
      camera.position.copy(st.goal.pos)
      camera.quaternion.copy(st.goal.quat)
    }
    camera.updateMatrixWorld()

    // each world: spin, turn to face the camera when chosen, and become the plain real sample
    // the rest of the system stays in view for most of the flight, then leaves the chosen world alone
    const soloGoal = fi >= 0 ? smooth(0.5, 0.97, st.flyT) : 0
    st.solo = st.frames < 2 ? soloGoal : st.solo + (soloGoal - st.solo) * (1 - Math.exp(-dt * 7))
    if (Math.abs(soloGoal - st.solo) < 0.002) st.solo = soloGoal
    const others = 1 - st.solo
    const alphaOf = (k: number) => Math.max(others, smooth(0, 0.25, st.real[k]))
    b.sun.uniforms.uAlpha.value = others
    b.sun.depthWrite = others > 0.97
    b.sunMesh.visible = others > 0.015
    ;(b.sunGlow.material as THREE.ShaderMaterial).uniforms.uPower.value = 0.95 * (0.12 + 0.88 * others)
    b.dust.opacity = 0.5 * others
    WORLDS.forEach((w, i) => {
      const g = b.groups[i]
      const on = fi === i
      st.real[i] = Math.min(1, Math.max(0, st.real[i] + (on ? dt / 1.85 : -dt / 1.1)))
      st.hov[i] += ((hi === i && fi < 0 ? 1 : 0) - st.hov[i]) * (1 - Math.exp(-dt * 9))
      const turn = smooth(0.12, 0.85, st.real[i])
      const real = smooth(0.55, 1, st.real[i])
      if (w.spins) {
        tmp.e.set(0, w.a0 + st.t * 0.16, 0)
        tmp.q.setFromEuler(tmp.e).premultiply(tmp.tilt)
      } else if (i === SPIKE) {
        tmp.e.set(0.25, -angleOf(w, i, st.t) + Math.PI / 2, 0)
        tmp.q.setFromEuler(tmp.e)
      } else {
        tmp.e.set(0.1 * Math.sin(st.t * 0.21 + i), 0.12 + 0.42 * Math.sin(st.t * 0.17 + i * 2.1), 0.06)
        tmp.q.setFromEuler(tmp.e)
      }
      tmp.q2.copy(fi === i ? st.goal.quat : camera.quaternion)
      if (w.id === 'bubblegrade') tmp.q2.multiply(tmp.face)
      g.quaternion.slerpQuaternions(tmp.q, tmp.q2, turn)

      const mat = b.mats[i]
      if (mat) {
        mat.uniforms.uReal.value = real
        mat.uniforms.uTime.value = st.t
        mat.uniforms.uHover.value = st.hov[i]
        const al = alphaOf(i)
        mat.uniforms.uAlpha.value = al
        mat.depthWrite = al > 0.97
        g.visible = al > 0.015
      }
      const halo = b.halos[i]
      if (halo.visible) {
        halo.position.copy(g.position)
        halo.scale.setScalar(ws)
        halo.quaternion.copy(camera.quaternion)
        ;(halo.material as THREE.ShaderMaterial).uniforms.uPower.value = (0.16 + 0.2 * st.hov[i] + 0.1 * real) * alphaOf(i)
      }
      ;(b.orbits[i].material as THREE.LineBasicMaterial).opacity = (0.1 + 0.26 * st.hov[i]) * others
      if (w.id === 'bubblegrade') {
        b.ring.uniforms.uReal.value = real
        b.ring.uniforms.uAlpha.value = alphaOf(i)
        b.ring.uniforms.uCenter.value.copy(g.position)
      }
      if (i === SPIKE) {
        const px = (size.height * gl.getPixelRatio()) / (2 * FOV_TAN)
        for (const m of [b.cells, b.belt]) {
          m.uniforms.uPx.value = px
          m.uniforms.uTime.value = st.t
        }
        b.cells.uniforms.uReal.value = smooth(0.15, 0.9, st.real[i])
        b.cells.uniforms.uDim.value = alphaOf(i)
        b.belt.uniforms.uDim.value = others
        b.cells.uniforms.uBoost.value = (2.35 + 0.35 * st.hov[i]) * ws
        b.field.uniforms.uReal.value = smooth(0.78, 1, st.real[i])
        // light direction for the cells, in view space
        tmp.v.copy(g.position).negate().normalize().transformDirection(camera.matrixWorldInverse)
        b.cells.uniforms.uLight.value.copy(tmp.v)
        b.belt.uniforms.uLight.value.copy(tmp.v)
      }

      // the name tag follows its world
      const el = labels.current?.[i]
      if (el) {
        tmp.p.copy(g.position).project(camera)
        const depth = tmp.v.copy(g.position).sub(camera.position).length()
        const rPx = (((i === SPIKE ? 1.25 : w.size) * ws) / (depth * FOV_TAN)) * (size.height / 2)
        const x = (tmp.p.x * 0.5 + 0.5) * size.width
        const y = (-tmp.p.y * 0.5 + 0.5) * size.height + rPx + 12
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      }
    })

    // sun and backdrop
    b.sun.uniforms.uTime.value = st.clock
    b.sunGlow.quaternion.copy(camera.quaternion)
    const beat = 1 + 0.035 * Math.pow(Math.max(0, Math.sin(st.t * 1.9)), 6)
    b.sunGlow.scale.setScalar(beat)
    tmp.sunNdc.set(0, 0, 0).project(camera)
    b.bg.uniforms.uSun.value.set(tmp.sunNdc.x * 0.5 + 0.5, tmp.sunNdc.y * 0.5 + 0.5)
    b.bg.uniforms.uAspect.value = aspect
    b.bg.uniforms.uTime.value = st.t
    b.bg.uniforms.uDim.value = 0.66 + 0.34 * others

    // tell the page: the scene is drawn, and the fly-in has landed
    st.frames++
    if (!st.ready && b.loaded.done && st.frames > 4 && (st.flyT >= 1 || fi >= 0)) {
      st.ready = true
      live.current.onReady()
    }
    if (fi >= 0 && st.flyT >= 1 && st.real[fi] >= 1 && st.solo >= 1 && st.arrived !== fi && st.ready) {
      st.arrived = fi
      live.current.onArrive(WORLDS[fi].id)
    }
    // on demand (module page open): keep drawing until everything has settled
    if (fi >= 0 && (st.flyT < 1 || st.real[fi] < 1 || !st.ready || st.solo < 1 || st.real.some((r, k) => k !== fi && r > 0))) invalidate()
  })

  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  return (
    <>
      <primitive object={b.root} />
      {WORLDS.map((w, i) => (
        <HitSphere
          key={w.id}
          target={b.groups[i]}
          radius={(i === SPIKE ? 1.7 : w.size) * 1.25}
          disabled={focusIdx >= 0}
          onPick={() => onPick(w.id)}
          onOver={() => onHover(w.id)}
          onOut={() => onHover(null)}
        />
      ))}
    </>
  )
}

function HitSphere({ target, radius, disabled, onPick, onOver, onOut }: { target: THREE.Group; radius: number; disabled: boolean; onPick(): void; onOver(): void; onOut(): void }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    ref.current?.position.copy(target.position)
  })
  return (
    <mesh
      ref={ref}
      onClick={(e) => {
        if (disabled) return
        e.stopPropagation()
        document.body.style.cursor = ''
        onPick()
      }}
      onPointerOver={(e) => {
        if (disabled) return
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        onOver()
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
        onOut()
      }}
    >
      <sphereGeometry args={[radius, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  )
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Scene(p: SceneProps) {
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const [hidden, setHidden] = useState(() => document.hidden)
  useEffect(() => {
    const f = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])
  return (
    <Canvas
      flat
      linear
      dpr={[1, touch ? 1.5 : 2]}
      frameloop={hidden ? 'never' : p.frozen ? 'demand' : 'always'}
      camera={{ fov: FOV, near: 0.1, far: 300, position: [0, 11, 26] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <System {...p} />
      {/* one cheap, real glow: only what is brighter than the threshold blooms (the sun, lit rims, the bright spots) */}
      <EffectComposer multisampling={touch ? 0 : 4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.88} luminanceSmoothing={0.2} radius={0.74} resolutionScale={touch ? 0.35 : 0.5} />
      </EffectComposer>
    </Canvas>
  )
}

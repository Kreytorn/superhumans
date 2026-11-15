// The home scene: a figure drawn in light above a planet's sunrise, with the six real specimens floating round it as lenses.
// Everything here is cheap on purpose (one figure, six textured discs, a few lines) so it stays smooth on an integrated GPU.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Billboard, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { CHECKS, type Check } from './data'

// ------------------------------------------------------------------ the figure (stacked cross-sections)
type Key = number[] // [y, ...values]
function sample(keys: Key[], y: number): number[] | null {
  if (y > keys[0][0] || y < keys[keys.length - 1][0]) return null
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (y <= a[0] && y >= b[0]) {
      let t = (a[0] - y) / (a[0] - b[0] || 1)
      t = t * t * (3 - 2 * t)
      return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t)
    }
  }
  return null
}

const SEG = 40
const DY = 0.0265

interface Ring {
  x: number
  y: number
  z: number
  rx: number
  rz: number
}

function figureParts(): Ring[][] {
  const ys: number[] = []
  for (let y = 0.992; y >= -1.0; y -= DY) ys.push(y)
  const parts: Ring[][] = []
  // head (an ellipsoid with a narrower jaw)
  const head: Ring[] = []
  for (const y of ys) {
    const d = (y - 0.868) / 0.134
    if (Math.abs(d) >= 1) continue
    const s = Math.sqrt(1 - d * d)
    const jaw = d < 0 ? 1 + d * 0.16 : 1
    head.push({ x: 0, y, z: 0.012, rx: 0.099 * s * jaw, rz: 0.115 * s })
  }
  parts.push(head)
  // neck + torso: [y, rx, rz]
  const torso: Key[] = [
    [0.76, 0.05, 0.054],
    [0.71, 0.056, 0.058],
    [0.682, 0.13, 0.076],
    [0.64, 0.208, 0.1],
    [0.53, 0.196, 0.127],
    [0.39, 0.156, 0.103],
    [0.23, 0.18, 0.117],
    [0.11, 0.186, 0.122],
    [0.055, 0.15, 0.108],
  ]
  const t: Ring[] = []
  for (const y of ys) {
    const v = sample(torso, y)
    if (v) t.push({ x: 0, y, z: 0, rx: v[0], rz: v[1] })
  }
  parts.push(t)
  // arms: [y, cx, rx, rz]
  const arm: Key[] = [
    [0.668, 0.226, 0.018, 0.03],
    [0.62, 0.252, 0.054, 0.06],
    [0.46, 0.283, 0.05, 0.053],
    [0.335, 0.3, 0.04, 0.042],
    [0.23, 0.314, 0.041, 0.04],
    [0.085, 0.332, 0.027, 0.023],
    [0.02, 0.339, 0.031, 0.02],
    [-0.085, 0.345, 0.012, 0.012],
  ]
  // legs and feet: [y, cx, rx, rz, cz]
  const leg: Key[] = [
    [0.1, 0.097, 0.09, 0.106, 0],
    [-0.1, 0.098, 0.081, 0.092, 0],
    [-0.4, 0.089, 0.055, 0.06, 0],
    [-0.57, 0.087, 0.06, 0.067, -0.008],
    [-0.9, 0.08, 0.033, 0.039, 0],
    [-0.955, 0.082, 0.043, 0.082, 0.04],
    [-1.0, 0.083, 0.046, 0.106, 0.055],
  ]
  for (const side of [-1, 1]) {
    const a: Ring[] = []
    const l: Ring[] = []
    for (const y of ys) {
      const v = sample(arm, y)
      if (v) a.push({ x: side * v[0], y, z: 0, rx: v[1], rz: v[2] })
      const w = sample(leg, y)
      if (w) l.push({ x: side * w[0], y, z: w[3], rx: w[1], rz: w[2] })
    }
    parts.push(a, l)
  }
  return parts
}

function buildFigure() {
  const parts = figureParts()
  const pos: number[] = []
  const nor: number[] = []
  const tri: number[] = []
  const lin: number[] = []
  for (const rings of parts) {
    const base = pos.length / 3
    rings.forEach((r, i) => {
      for (let j = 0; j < SEG; j++) {
        const a = (j / SEG) * Math.PI * 2
        const c = Math.cos(a)
        const s = Math.sin(a)
        pos.push(r.x + r.rx * c, r.y, r.z + r.rz * s)
        const nx = c / Math.max(r.rx, 1e-3)
        const nz = s / Math.max(r.rz, 1e-3)
        const n = Math.hypot(nx, nz) || 1
        nor.push(nx / n, 0, nz / n)
        const p = base + i * SEG + j
        const q = base + i * SEG + ((j + 1) % SEG)
        lin.push(p, q)
        if (i < rings.length - 1) tri.push(p, q, p + SEG, q, q + SEG, p + SEG)
      }
    })
  }
  const mk = (index: number[]) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setIndex(index)
    return g
  }
  return { fill: mk(tri), lines: mk(lin) }
}

const FIG_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vY = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const FIG_LINE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uDim;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float top = -1.05 + uReveal * 2.2;
    if (vY > top) discard;
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
    float facing = step(0.0, dot(vN, vV));
    float scanY = -1.1 + mod(uTime * 0.42, 3.4);
    float scan = smoothstep(0.16, 0.0, abs(vY - scanY));
    float edge = smoothstep(0.12, 0.0, top - vY) * (1.0 - step(0.999, uReveal));
    vec3 deep = vec3(0.16, 0.36, 1.0);
    vec3 ice = vec3(0.62, 0.86, 1.0);
    vec3 c = mix(deep, ice, f) * (0.16 + 0.95 * f) * mix(0.42, 1.0, facing);
    c += ice * scan * 0.55;
    c += vec3(0.9, 0.97, 1.0) * edge * 1.4;
    gl_FragColor = vec4(c * uDim, 1.0);
    #include <colorspace_fragment>
  }
`
const FIG_FILL_FRAG = /* glsl */ `
  uniform float uReveal;
  uniform float uDim;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float top = -1.05 + uReveal * 2.2;
    if (vY > top) discard;
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    vec3 c = vec3(0.18, 0.42, 1.0) * f * 0.42;
    gl_FragColor = vec4(c * uDim, 1.0);
    #include <colorspace_fragment>
  }
`

const LENS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const LENS_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec4 uCrop;
  uniform float uInvert;
  uniform float uGain;
  uniform vec3 uHue;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    // a slight magnifier bulge, so the disc reads as glass and not as a sticker
    vec2 q = 0.5 + (vUv - 0.5) * (0.86 + 0.14 * r * r);
    vec2 uv = vec2(uCrop.x + q.x * uCrop.z, 1.0 - (uCrop.y + (1.0 - q.y) * uCrop.w));
    vec3 c = texture2D(uTex, uv).rgb;
    if (uInvert > 0.5) c = (1.0 - c) * vec3(0.72, 0.84, 1.0);
    c *= mix(0.32, 1.0, smoothstep(1.02, 0.3, r)) * uGain;
    c += uHue * smoothstep(0.86, 1.0, r) * 0.5;
    c += vec3(0.07) * smoothstep(0.8, 0.0, length(p - vec2(-0.42, 0.5)));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`

const PLANET_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const PLANET_FRAG = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 5.0);
    float sun = exp(-pow(distance(vW.xy, uSun.xy) / 1.5, 2.0));
    vec3 c = vec3(0.004, 0.008, 0.02);
    c += vec3(0.12, 0.34, 1.0) * f * (0.5 + 1.2 * sun);
    c += vec3(1.0, 0.82, 0.62) * pow(f, 1.6) * sun * 1.5;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    float d = max(0.0, -dot(normalize(vN), normalize(vV)));
    float i = pow(clamp(d / 0.3, 0.0, 1.0), 2.4);
    float sun = exp(-pow(distance(vW.xy, uSun.xy) / 1.7, 2.0));
    vec3 c = vec3(0.1, 0.32, 1.0) * i * (0.3 + 1.3 * sun);
    c += vec3(1.0, 0.78, 0.55) * pow(i, 3.0) * sun * 1.1;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`

function rotY(p: [number, number, number], a: number): [number, number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]
}

export type LabelRefs = React.RefObject<(HTMLElement | null)[]>

interface SceneProps {
  labels: LabelRefs
  active: string | null
  featured: string
  leaving: string | null
  onActive: (id: string | null) => void
  onOpen: (id: string) => void
  onSettled: () => void
  reduced: boolean
}

const LENS_R = 0.205

function Lens({ check, wide, k, active, featured, reduced, labels, onActive, onOpen }: { check: Check; wide: boolean; k: number; active: string | null; featured: string; reduced: boolean; labels: LabelRefs; onActive: (id: string | null) => void; onOpen: (id: string) => void }) {
  const tex = useLoader(THREE.TextureLoader, check.img)
  const group = useRef<THREE.Group>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  const uniforms = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const [x, y, s] = check.crop
    return {
      uTex: { value: tex },
      uCrop: { value: new THREE.Vector4(x, y, s, s * check.aspect) },
      uInvert: { value: check.invert ? 1 : 0 },
      uGain: { value: 1 },
      uHue: { value: new THREE.Color(check.hue) },
    }
  }, [tex, check])
  const pos = useMemo<[number, number, number]>(() => (wide ? check.lens : [check.lens[0] * 0.63, check.lens[1] * 0.98 + (check.lens[1] > 0.9 ? 0.1 : 0), check.lens[2]]), [wide, check])
  const r = wide ? LENS_R : 0.15
  const isOn = active === check.id
  const feat = featured === check.id
  const born = useRef<number | null>(null)
  const anchor = useMemo(() => new THREE.Vector3(), [])
  const dim = active !== null && !isOn
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    g.position.set(pos[0], pos[1] + Math.sin(t * 0.6 + k * 1.7) * 0.018, pos[2])
    if (born.current === null) born.current = t
    // each lens swings in after the figure has started to draw
    const e = reduced ? 1 : Math.min(1, Math.max(0, (t - born.current - 0.55 - k * 0.13) / 0.6))
    const appear = 1 - Math.pow(1 - e, 3)
    const target = (isOn ? 1.14 : feat ? 1.06 : 1) * Math.max(0.001, appear)
    const sc = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 9)
    g.scale.setScalar(sc)
    g.rotation.y = state.pointer.x * 0.22 - pos[0] * 0.1
    g.rotation.x = -state.pointer.y * 0.16
    if (mat.current) {
      const u = mat.current.uniforms.uGain
      u.value += ((dim ? 0.42 : isOn || feat ? 1.18 : 0.92) - u.value) * Math.min(1, dt * 8)
    }
    if (ring.current) ring.current.opacity += ((isOn || feat ? 1 : dim ? 0.25 : 0.55) - ring.current.opacity) * Math.min(1, dt * 8)
    // the page's own label follows the lens: project the point just under the disc to screen pixels
    const el = labels.current[k]
    if (el) {
      anchor.set(0, -r * 1.2, 0)
      g.localToWorld(anchor).project(state.camera)
      const x = (anchor.x * 0.5 + 0.5) * state.size.width
      const y = (-anchor.y * 0.5 + 0.5) * state.size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`
    }
  })
  return (
    <group ref={group} position={pos} scale={reduced ? 1 : 0.001}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          onActive(check.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onActive(null)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(check.id)
        }}
      >
        <circleGeometry args={[r, 72]} />
        <shaderMaterial ref={mat} vertexShader={LENS_VERT} fragmentShader={LENS_FRAG} uniforms={uniforms} />
      </mesh>
      <mesh>
        <ringGeometry args={[r * 1.0, r * 1.022, 96]} />
        <meshBasicMaterial ref={ring} color={new THREE.Color(check.hue).multiplyScalar(1.9)} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, k]}>
        <ringGeometry args={[r * 1.13, r * 1.137, 96, 1, 0, Math.PI * 1.25]} />
        <meshBasicMaterial color="#9fc2ff" transparent opacity={0.34} toneMapped={false} />
      </mesh>
    </group>
  )
}

function World({ active, featured, leaving, labels, onActive, onOpen, onSettled, reduced }: SceneProps) {
  const { viewport, size, camera } = useThree()
  const wide = size.width / size.height > 1.15
  const fig = useMemo(buildFigure, [])
  const figure = useRef<THREE.Group>(null)
  const root = useRef<THREE.Group>(null)
  const start = useRef<number | null>(null)
  const settled = useRef(false)
  const mkUni = () => ({ uTime: { value: 0 }, uReveal: { value: reduced ? 1 : 0 }, uDim: { value: 1 } })
  const uniLine = useMemo(mkUni, [reduced])
  const uniFill = useMemo(mkUni, [reduced])
  const lineMat = useRef<THREE.ShaderMaterial>(null)
  const fillMat = useRef<THREE.ShaderMaterial>(null)
  const sun = useMemo(() => ({ uSun: { value: new THREE.Vector3(1.6, -1.2, 0) } }), [])

  // leader lines (body site -> lens) and cosmic-ray streaks share one buffer each, refreshed per frame
  const leaders = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(CHECKS.length * 6), 3))
    const col = new Float32Array(CHECKS.length * 6)
    CHECKS.forEach((c, i) => {
      const k = new THREE.Color(c.hue)
      col.set([k.r * 1.5, k.g * 1.5, k.b * 1.5, k.r * 0.25, k.g * 0.25, k.b * 0.25], i * 6)
    })
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    return g
  }, [])
  const RAYS = 5
  const rays = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RAYS * 6), 3))
    const col = new Float32Array(RAYS * 6)
    for (let i = 0; i < RAYS; i++) col.set([1.5, 0.9, 1.3, 0, 0, 0], i * 6)
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    const seeds = Array.from({ length: RAYS }, (_, i) => {
      const a = -1.05 - ((i * 0.37) % 0.4)
      return { ox: -0.1 + ((i * 1.93) % 2.7), oy: 2.4 + ((i * 0.71) % 1.2), z: -2.4 + ((i * 0.83) % 1.8), dx: Math.cos(a), dy: Math.sin(a), speed: 2.6 + ((i * 0.57) % 1.6), phase: i * 3.1, span: 13 + ((i * 2.3) % 9) }
    })
    return { g, seeds }
  }, [])
  const dust = useMemo(() => {
    const n = 110
    const p = new Float32Array(n * 3)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) p.set([(rnd() - 0.5) * 11, (rnd() - 0.35) * 5.2, -2 - rnd() * 5], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])

  const zoom = useRef(0)
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (start.current === null) start.current = t
    const since = t - start.current
    const reveal = reduced ? 1 : Math.min(1, Math.max(0, (since - 0.15) / 1.7))
    for (const m of [lineMat.current, fillMat.current]) {
      if (!m) continue
      m.uniforms.uTime.value = reduced ? 1.2 : t
      m.uniforms.uReveal.value = reveal
    }
    if (!settled.current && (reduced || since > 2.1)) {
      settled.current = true
      onSettled()
    }
    const off = wide ? viewport.width * 0.185 : 0
    if (root.current) root.current.position.x = off
    const sway = reduced ? 0.3 : Math.sin(t * 0.22) * 0.42 + state.pointer.x * 0.3
    if (figure.current) figure.current.rotation.y = sway
    // leaders
    const lp = leaders.attributes.position as THREE.BufferAttribute
    CHECKS.forEach((c, i) => {
      const a = rotY(c.spot, sway)
      const lx = wide ? c.lens[0] : c.lens[0] * 0.63
      const ly = wide ? c.lens[1] : c.lens[1] * 0.98 + (c.lens[1] > 0.9 ? 0.1 : 0)
      const r = (wide ? LENS_R : 0.15) * 1.02
      const dx = a[0] - lx
      const dy = a[1] - ly
      const d = Math.hypot(dx, dy) || 1
      lp.setXYZ(i * 2, a[0], a[1], a[2])
      lp.setXYZ(i * 2 + 1, lx + (dx / d) * r, ly + (dy / d) * r, c.lens[2])
    })
    lp.needsUpdate = true
    // cosmic rays
    const rp = rays.g.attributes.position as THREE.BufferAttribute
    rays.seeds.forEach((s, i) => {
      const u = reduced ? 3 + i : (t * s.speed + s.phase) % s.span
      const hx = s.ox + s.dx * u
      const hy = s.oy + s.dy * u
      rp.setXYZ(i * 2, hx, hy, s.z)
      rp.setXYZ(i * 2 + 1, hx - s.dx * 0.55, hy - s.dy * 0.55, s.z)
    })
    rp.needsUpdate = true
    // camera: a little parallax, and a push toward the chosen lens on the way out
    zoom.current += ((leaving ? 1 : 0) - zoom.current) * Math.min(1, dt * 4.5)
    const target = leaving ? CHECKS.find((c) => c.id === leaving) : undefined
    const tx = target ? off + target.lens[0] * (wide ? 1 : 0.63) : 0
    const ty = target ? target.lens[1] : 0
    const z = zoom.current
    const px = reduced ? 0 : state.pointer.x * 0.16
    const py = reduced ? 0 : state.pointer.y * 0.08
    camera.position.set(px * (1 - z) + tx * z, 0.04 + py * (1 - z) + ty * z, 5.9 - z * 3.6)
    camera.lookAt(tx * z, 0.02 + ty * z, 0)
  })

  return (
    <>
      <color attach="background" args={['#02040a']} />
      <points geometry={dust}>
        <pointsMaterial size={0.022} color="#9fb6e8" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
      </points>
      {/* the planet under the crew member's feet, with the sunrise on its limb */}
      <group position={[0.6, -8.62, -1.6]}>
        <mesh>
          <sphereGeometry args={[7.5, 96, 48]} />
          <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={sun} />
        </mesh>
        <mesh scale={1.045}>
          <sphereGeometry args={[7.5, 96, 48]} />
          <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={ATMO_FRAG} uniforms={sun} side={THREE.BackSide} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <lineSegments geometry={rays.g} frustumCulled={false} visible={!reduced}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <group ref={root} position={[0, wide ? -0.06 : -0.02, 0]}>
        <group ref={figure}>
          <mesh geometry={fig.fill} frustumCulled={false}>
            <shaderMaterial ref={fillMat} vertexShader={FIG_VERT} fragmentShader={FIG_FILL_FRAG} uniforms={uniFill} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <lineSegments geometry={fig.lines} frustumCulled={false}>
            <shaderMaterial ref={lineMat} vertexShader={FIG_VERT} fragmentShader={FIG_LINE_FRAG} uniforms={uniLine} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </lineSegments>
          {CHECKS.map((c) => (
            <group key={c.id} position={c.spot}>
              <mesh>
                <sphereGeometry args={[0.017, 16, 12]} />
                <meshBasicMaterial color={new THREE.Color(c.hue).multiplyScalar(2.4)} toneMapped={false} />
              </mesh>
              <Billboard>
                <mesh scale={featured === c.id ? 1.8 : 1}>
                  <ringGeometry args={[0.034, 0.039, 40]} />
                  <meshBasicMaterial color={new THREE.Color(c.hue).multiplyScalar(1.5)} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
                </mesh>
                <mesh
                  onPointerOver={(e) => {
                    e.stopPropagation()
                    onActive(c.id)
                    document.body.style.cursor = 'pointer'
                  }}
                  onPointerOut={() => {
                    onActive(null)
                    document.body.style.cursor = ''
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen(c.id)
                  }}
                >
                  <circleGeometry args={[0.075, 20]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              </Billboard>
            </group>
          ))}
        </group>
        {/* the pad the figure stands on */}
        <group position={[0, -1.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.6, 0.607, 128]} />
            <meshBasicMaterial color="#7fb2ff" transparent opacity={0.75} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.82, 0.824, 128, 1, 0.4, 4.6]} />
            <meshBasicMaterial color="#5a86e0" transparent opacity={0.4} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.6, 64]} />
            <meshBasicMaterial color="#1d3f9a" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <lineSegments geometry={leaders} frustumCulled={false}>
          <lineBasicMaterial vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </lineSegments>
        {CHECKS.map((c, i) => (
          <Lens key={c.id} check={c} wide={wide} k={i} active={active} featured={featured} reduced={reduced} labels={labels} onActive={onActive} onOpen={onOpen} />
        ))}
      </group>
    </>
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

export default function Scene(props: SceneProps) {
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1))
  useEffect(() => () => void (document.body.style.cursor = ''), [])
  return (
    <Canvas className="s2-canvas" flat dpr={dpr} camera={{ fov: 28, position: [0, 0.04, 5.9], near: 0.1, far: 60 }} gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}>
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <World {...props} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.42} luminanceSmoothing={0.3} radius={0.72} />
        <Noise opacity={0.045} />
        <Vignette eskil={false} offset={0.22} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  )
}

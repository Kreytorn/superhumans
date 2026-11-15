// spikecount_w1: the 3D layer. Two pieces, both DRAWN illustrations (the page marks them "AI-generated illustration"):
//   Bloodstream: a slow river of red cells behind the whole screen; the share of spiky cells follows the model's result.
//   ShapeCell:   one cell that morphs from a smooth disc to a spiky ball (grades 0..4) for the story section.
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Per grade (0 disc, 1..4 spiky): how round the body is, spike height, spike count, spike sharpness.
const ROUND = [0, 0.28, 0.55, 0.85, 1]
const AMP = [0, 0.1, 0.17, 0.23, 0.17]
const COUNT = [0, 12, 20, 30, 54]
const SHARP = [1, 26, 44, 80, 170]

function fib(n: number): number[] {
  const out: number[] = []
  const g = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    out.push(Math.cos(g * i) * r, y, Math.sin(g * i) * r)
  }
  return out
}

// Half thickness of a biconcave disc at radius r (0..1): the classic Evans and Fung red-cell profile.
const discY = (r: number) => {
  const r2 = r * r
  return 0.5 * Math.sqrt(Math.max(0, 1 - r2)) * (0.207 + 2.003 * r2 - 1.123 * r2 * r2)
}

function fillShape(grade: number, unit: ArrayLike<number>, out: Float32Array) {
  const s = ROUND[grade]
  const amp = AMP[grade]
  const k = SHARP[grade]
  const spikes = fib(COUNT[grade])
  for (let i = 0; i < unit.length; i += 3) {
    const x = unit[i]
    const y = unit[i + 1]
    const z = unit[i + 2]
    const r = Math.min(1, Math.hypot(x, z))
    const dy = Math.sign(y) * discY(r)
    let m = 0
    for (let j = 0; j < spikes.length; j += 3) {
      const d = x * spikes[j] + y * spikes[j + 1] + z * spikes[j + 2]
      if (d > 0.5) m = Math.max(m, Math.pow(d, k))
    }
    const e = amp * m
    out[i] = x * (1 - s) + x * 0.8 * s + x * e
    out[i + 1] = dy * (1 - s) + y * 0.8 * s + y * e
    out[i + 2] = z * (1 - s) + z * 0.8 * s + z * e
  }
}

function shapeGeometry(grade: number, wSeg: number, hSeg: number) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg)
  const pos = g.attributes.position as THREE.BufferAttribute
  const unit = Float32Array.from(pos.array as Float32Array)
  fillShape(grade, unit, pos.array as Float32Array)
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

function cellMaterial(colour: string, emissive: string) {
  return new THREE.MeshStandardMaterial({ color: colour, emissive, roughness: 0.38, metalness: 0.05 })
}

// ---------------------------------------------------------------------------------------------- Bloodstream
interface StreamProps {
  /** 0..1 share of the cells drawn spiky (the model's spiky % once it has run, else 0) */
  spikyShare: number
  count: number
  scroller: RefObject<HTMLElement | null>
}

function Stream({ spikyShare, count, scroller }: StreamProps) {
  const discs = useRef<THREE.InstancedMesh>(null)
  const spikies = useRef<THREE.InstancedMesh>(null)
  const discGeo = useMemo(() => shapeGeometry(0, 40, 26), [])
  const spikeGeo = useMemo(() => shapeGeometry(3, 56, 40), [])
  const discMat = useMemo(() => cellMaterial('#7d1220', '#1c0306'), [])
  const spikeMat = useMemo(() => cellMaterial('#b3202c', '#3a0508'), [])
  const seed = useMemo(() => {
    const r = (i: number, k: number) => {
      const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
      return v - Math.floor(v)
    }
    return Array.from({ length: count }, (_, i) => ({
      x: (r(i, 1) - 0.5) * 44,
      y: (r(i, 2) - 0.5) * 22,
      z: -22 + r(i, 3) * 24,
      s: 0.75 + r(i, 4) * 0.9,
      ax: new THREE.Vector3(r(i, 5) - 0.5, r(i, 6) - 0.5, r(i, 7) - 0.5).normalize(),
      w: 0.08 + r(i, 8) * 0.22,
      ph: r(i, 9) * 6.28,
      v: 0.25 + r(i, 10) * 0.45,
      rank: r(i, 11),
      mix: 0,
    }))
  }, [count])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const scroll = (scroller.current?.scrollTop ?? 0) * 0.004
    const cam = state.camera
    cam.position.x += (pointer.current.x * 1.1 - cam.position.x) * 0.04
    cam.position.y += (-pointer.current.y * 0.7 - scroll - cam.position.y) * 0.06
    cam.lookAt(cam.position.x * 0.4, cam.position.y, -8)
    const a = discs.current
    const b = spikies.current
    if (!a || !b) return
    for (let i = 0; i < seed.length; i++) {
      const c = seed[i]
      const target = c.rank < spikyShare ? 1 : 0
      c.mix += (target - c.mix) * Math.min(1, d * 2.2)
      const x = ((((c.x + t * c.v + 22) % 44) + 44) % 44) - 22
      // wrap vertically round the camera so the stream never runs out while the page scrolls
      const y = ((((c.y - cam.position.y + 11) % 22) + 22) % 22) - 11 + cam.position.y + Math.sin(t * 0.3 + c.ph) * 0.5
      dummy.position.set(x, y, c.z)
      dummy.quaternion.setFromAxisAngle(c.ax, c.ph + t * c.w)
      dummy.scale.setScalar(c.s * (1 - c.mix))
      dummy.updateMatrix()
      a.setMatrixAt(i, dummy.matrix)
      dummy.scale.setScalar(c.s * 0.92 * c.mix)
      dummy.updateMatrix()
      b.setMatrixAt(i, dummy.matrix)
    }
    a.instanceMatrix.needsUpdate = true
    b.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <fog attach="fog" args={['#05060a', 7, 32]} />
      <ambientLight intensity={0.34} color="#ff9aa0" />
      <directionalLight position={[-8, 6, -14]} intensity={5.2} color="#ff5a3c" />
      <directionalLight position={[10, -4, 6]} intensity={1.1} color="#7fc8ff" />
      <pointLight position={[6, 1, 2]} intensity={60} distance={30} color="#ffd9c8" />
      <instancedMesh ref={discs} args={[discGeo, discMat, count]} frustumCulled={false} />
      <instancedMesh ref={spikies} args={[spikeGeo, spikeMat, count]} frustumCulled={false} />
    </>
  )
}

export function Bloodstream(props: StreamProps) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 46, near: 0.1, far: 60 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <Stream {...props} />
    </Canvas>
  )
}

// ---------------------------------------------------------------------------------------------- ShapeCell
function Morph({ grade }: { grade: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => new THREE.SphereGeometry(1, 120, 80), [])
  const unit = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo])
  const target = useMemo(() => new Float32Array(unit.length), [unit])
  const moving = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    fillShape(grade, unit, target)
    if (first.current) {
      first.current = false
      ;(geo.attributes.position.array as Float32Array).set(target)
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()
    } else moving.current = 1.4
  }, [grade, unit, target, geo])

  useFrame((state, dt) => {
    const m = mesh.current
    if (!m) return
    const t = state.clock.elapsedTime
    m.rotation.y = t * 0.35
    m.rotation.x = 0.55 + Math.sin(t * 0.4) * 0.18
    if (moving.current > 0) {
      moving.current -= dt
      const arr = geo.attributes.position.array as Float32Array
      const k = Math.min(1, dt * 7)
      for (let i = 0; i < arr.length; i++) arr[i] += (target[i] - arr[i]) * k
      if (moving.current <= 0) arr.set(target)
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()
    }
  })

  return (
    <mesh ref={mesh} geometry={geo} scale={1.55}>
      <meshPhysicalMaterial color="#c21f2e" emissive="#3a0408" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.35} />
    </mesh>
  )
}

export function ShapeCell({ grade }: { grade: number }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5.2], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} color="#ffb0b0" />
      <directionalLight position={[-4, 5, 4]} intensity={3.4} color="#fff0e6" />
      <directionalLight position={[5, -3, -4]} intensity={4.5} color="#ff4a3a" />
      <pointLight position={[3, 2, 4]} intensity={18} color="#8fd8ff" />
      <Morph grade={grade} />
    </Canvas>
  )
}

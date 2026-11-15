// A drawn 3D red cell that morphs from a smooth biconcave disc to a ball of fine spikes (an illustration, not data).
// Shape: Evans-Fung disc profile and a sphere with Fibonacci-spaced spikes, blended per vertex on the CPU.
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SPIKES = 46

function fib(n: number) {
  const out: THREE.Vector3[] = []
  const g = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    out.push(new THREE.Vector3(Math.cos(g * i) * r, y, Math.sin(g * i) * r))
  }
  return out
}

function Cell({ morph }: { morph: { current: number } }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { geo, disc, ball } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 160, 120)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const n = pos.count
    const disc = new Float32Array(n * 3)
    const ball = new Float32Array(n * 3)
    const dirs = fib(SPIKES)
    const v = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).normalize()
      // biconcave disc (Evans-Fung thickness), radius 1.45
      const rho = Math.min(1, Math.hypot(v.x, v.z))
      const h = Math.sqrt(Math.max(0, 1 - rho * rho)) * (0.207 + 2.003 * rho * rho - 1.123 * rho ** 4)
      const R = 1.22
      disc[i * 3] = v.x * R
      disc[i * 3 + 1] = Math.sign(v.y) * 0.5 * h * R
      disc[i * 3 + 2] = v.z * R
      // spiky ball (echinocyte-like)
      let s = 0
      for (const d of dirs) s += Math.pow(Math.max(0, v.dot(d)), 90)
      const rr = 0.92 + 0.36 * Math.min(1, s)
      ball[i * 3] = v.x * rr
      ball[i * 3 + 1] = v.y * rr
      ball[i * 3 + 2] = v.z * rr
    }
    return { geo, disc, ball }
  }, [])

  const last = useRef(-1)
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    m.rotation.y += dt * 0.35
    m.rotation.x = 0.55 + Math.sin(performance.now() / 4000) * 0.12
    const k = morph.current
    if (Math.abs(k - last.current) < 0.002) return
    last.current = k
    const e = k * k * (3 - 2 * k)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length; i++) arr[i] = disc[i] + (ball[i] - disc[i]) * e
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <mesh ref={mesh} geometry={geo}>
      <meshPhysicalMaterial color="#b3122e" roughness={0.38} metalness={0.05} clearcoat={0.7} clearcoatRoughness={0.3} sheen={1} sheenColor="#ff7a8a" emissive="#3a0010" />
    </mesh>
  )
}

function Driver({ morph, ctl, t0 }: { morph: { current: number }; ctl: { current: { auto: boolean; val: number } }; t0: { current: number } }) {
  useFrame(() => {
    if (ctl.current.auto) {
      const t = (performance.now() - t0.current) / 1000
      morph.current = 0.5 - 0.5 * Math.cos((t / 7) * Math.PI * 2)
    } else morph.current = ctl.current.val / 100
  })
  return null
}

export default function Cell3D() {
  const [val, setVal] = useState(0)
  const [auto, setAuto] = useState(true)
  const morph = useRef(0)
  const t0 = useRef(performance.now())

  const ctl = useRef({ auto: true, val: 0 })
  ctl.current = { auto, val }

  const label = val < 15 ? 'Smooth disc' : val < 60 ? 'Puckered, a few bumps' : 'Ball of fine spikes'

  return (
    <div className="scw2-c3">
      <Canvas camera={{ position: [0, 0, 5.1], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} color="#ffe6e0" />
        <directionalLight position={[-4, -2, -3]} intensity={3.2} color="#5cc8ff" />
        <pointLight position={[0, -3, 2]} intensity={6} color="#ff2e63" />
        <Driver morph={morph} ctl={ctl} t0={t0} />
        <Cell morph={morph} />
      </Canvas>
      <div className="scw2-c3-ui">
        <label htmlFor="scw2-morph">{auto ? 'Drag to reshape the cell' : label}</label>
        <input
          id="scw2-morph"
          type="range"
          min={0}
          max={100}
          value={val}
          aria-valuetext={label}
          onChange={(e) => {
            setAuto(false)
            setVal(Number(e.target.value))
          }}
        />
        <div className="scw2-c3-ends">
          <span>Disc</span>
          <span>Spiky ball</span>
        </div>
      </div>
      <span className="scw2-ai">AI-generated illustration</span>
    </div>
  )
}

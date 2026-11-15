// One real nucleus in 3D (shipped mesh: nucleus shell, marching-cubes surface of the bright spots, fitted line).
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import * as tt from '../../engine/tracktrace'

interface Mesh3D {
  frame: { centre: number[] }
  nucleus: { vertices: number[]; faces: number[]; outline: number[][]; z0: number; z1: number }
  foci_surface: { vertices: number[]; faces: number[] }
  foci: { xyz: number[] }[]
  line3d: { p0: number[]; p1: number[]; beam_in: number[]; beam_out: number[] } | null
  line2d: { drawn: boolean }
}

export default function Nucleus3D({ id = 'P242_G4_003_003' }: { id?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false
    let raf = 0
    let cleanup = () => {}
    tt.load3D(id)
      .then((raw) => {
        if (dead) return
        const m = raw as unknown as Mesh3D
        const W = el.clientWidth || 600
        const H = el.clientHeight || 480
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        renderer.setSize(W, H)
        renderer.setClearColor(0x000000, 0)
        el.appendChild(renderer.domElement)
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(32, W / H, 1, 2000)
        camera.position.set(-78, 104, 282)
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.set(0, -26, 0)
        controls.enableZoom = false
        controls.enablePan = false
        controls.enableDamping = true
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.9

        // image frame: x = column, y = row (down), z = slice. Flip y, stretch nothing.
        const g = new THREE.Group()
        const c = m.frame.centre
        g.scale.set(1, -1, 1.6)
        g.position.set(-c[0], c[1], -c[2] * 1.6)
        const tilt = new THREE.Group()
        tilt.rotation.x = -1.02
        tilt.add(g)
        scene.add(tilt)

        const geoOf = (v: number[], f: number[]) => {
          const geo = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
          geo.setIndex(f)
          geo.computeVertexNormals()
          return geo
        }
        const shellGeo = geoOf(m.nucleus.vertices, m.nucleus.faces)
        const shell = new THREE.Mesh(
          shellGeo,
          new THREE.MeshBasicMaterial({ color: 0x6f6cff, transparent: true, opacity: 0.012, side: THREE.DoubleSide, depthWrite: false }),
        )
        g.add(shell)
        for (const z of [m.nucleus.z0, m.nucleus.z1, (m.nucleus.z0 + m.nucleus.z1) / 2]) {
          const pts = m.nucleus.outline.map((p) => new THREE.Vector3(p[0], p[1], z))
          const loop = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x8f8cff, transparent: true, opacity: z === (m.nucleus.z0 + m.nucleus.z1) / 2 ? 0.18 : 0.5 }),
          )
          g.add(loop)
        }
        const fociGeo = geoOf(m.foci_surface.vertices, m.foci_surface.faces)
        const foci = new THREE.Mesh(
          fociGeo,
          new THREE.MeshStandardMaterial({ color: 0xff8fca, emissive: 0xff2f9c, emissiveIntensity: 0.5, roughness: 0.38, metalness: 0.15, side: THREE.DoubleSide, transparent: true, opacity: 0.78, depthWrite: false }),
        )
        g.add(foci)
        scene.add(new THREE.AmbientLight(0x8890ff, 0.7))
        const key = new THREE.DirectionalLight(0xffffff, 2.6)
        key.position.set(120, 200, 160)
        scene.add(key)

        let head: THREE.Mesh | null = null
        let a: THREE.Vector3 | null = null
        let b: THREE.Vector3 | null = null
        if (m.line3d && m.line2d.drawn) {
          const p0 = new THREE.Vector3(...(m.line3d.p0 as [number, number, number]))
          const p1 = new THREE.Vector3(...(m.line3d.p1 as [number, number, number]))
          g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.85, 10, false), new THREE.MeshBasicMaterial({ color: 0xffd09a })))
          a = new THREE.Vector3(...(m.line3d.beam_in as [number, number, number]))
          b = new THREE.Vector3(...(m.line3d.beam_out as [number, number, number]))
          head = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }))
          g.add(head)
        }

        const composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.42, 0.5, 0.62)
        composer.addPass(bloom)
        composer.addPass(new OutputPass())

        const t0 = performance.now()
        const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
        if (still) controls.autoRotate = false
        let visible = true
        const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true })
        io.observe(el)
        const tick = () => {
          raf = requestAnimationFrame(tick)
          if (!visible) return
          const t = (performance.now() - t0) / 1000
          if (head && a && b) {
            const k = still ? 0.5 : (t % 2.6) / 1.5
            head.visible = k <= 1
            head.position.lerpVectors(a, b, Math.min(1, k))
          }
          controls.update()
          composer.render()
        }
        tick()
        const onResize = () => {
          const w = el.clientWidth
          const h = el.clientHeight
          if (!w || !h) return
          renderer.setSize(w, h)
          composer.setSize(w, h)
          camera.aspect = w / h
          camera.updateProjectionMatrix()
        }
        const ro = new ResizeObserver(onResize)
        ro.observe(el)
        cleanup = () => {
          io.disconnect()
          ro.disconnect()
          controls.dispose()
          shellGeo.dispose()
          fociGeo.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
        if (dead) cleanup()
      })
      .catch(() => setOk(false))
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      cleanup()
    }
  }, [id])

  return (
    <div className="w2-3d" ref={host} role="img" aria-label="A real cell nucleus in 3D with its bright damage spots and the fitted straight line">
      {!ok && <p className="w2-3d-fail">3D view unavailable on this device.</p>}
    </div>
  )
}

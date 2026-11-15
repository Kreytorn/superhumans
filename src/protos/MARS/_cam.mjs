// Dev-only: random search for a home camera that frames Sun, Earth, Mars and the path as intended.
import * as THREE from 'three'
const DEG = Math.PI / 180
const STOPS = [0.075, 0.185, 0.32, 0.48, 0.66, 0.865]
function run(PHI1deg, aspect, want) {
  const PHI0 = 80 * DEG, PHI1 = PHI1deg * DEG
  const pp = (s) => { const phi = PHI0 + (PHI1 - PHI0) * s; const e = s * s * (3 - 2 * s); const r = 100 + 52 * (0.3 * s + 0.7 * e); return new THREE.Vector3(Math.cos(phi) * r, 0, Math.sin(phi) * r) }
  const earth = pp(0), mars = pp(1), sun = new THREE.Vector3()
  const cam = new THREE.PerspectiveCamera(32, aspect, 0.1, 5000)
  const pr = (v) => { const t = v.clone().project(cam); return [t.x * 0.5 + 0.5, -t.y * 0.5 + 0.5, t.z] }
  let best = null
  const rnd = (a, b) => a + Math.random() * (b - a)
  for (let i = 0; i < 400000; i++) {
    const c = [rnd(-120, 220), rnd(4, 120), rnd(60, 330)], t = [rnd(-20, 140), rnd(-40, 20), rnd(-80, 90)], fov = rnd(want.fov[0], want.fov[1])
    cam.position.set(...c); cam.fov = fov; cam.lookAt(...t); cam.updateProjectionMatrix(); cam.updateMatrixWorld()
    const S = pr(sun), E = pr(earth), M = pr(mars)
    if (S[2] > 1 || E[2] > 1 || M[2] > 1) continue
    let cost = (S[0] - want.S[0]) ** 2 + (S[1] - want.S[1]) ** 2 + (E[0] - want.E[0]) ** 2 + (E[1] - want.E[1]) ** 2 + (M[0] - want.M[0]) ** 2 + (M[1] - want.M[1]) ** 2
    const dE = cam.position.distanceTo(earth)
    const er = 13 / dE / Math.tan(fov * DEG / 2) * 0.5 // radius as a fraction of height
    cost += 2 * (er - want.er) ** 2
    let ok = true
    for (const s of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) { const p = pr(pp(s)); if (p[2] > 1 || p[0] < 0.04 || p[0] > want.maxX || p[1] < 0.08 || p[1] > want.maxY) { ok = false; break } }
    if (!ok) continue
    if (!best || cost < best.cost) best = { cost, c, t, fov, S, E, M, er, stops: STOPS.map((s) => pr(pp(s)).slice(0, 2).map((x) => +x.toFixed(3))) }
  }
  const f = (a) => a.map((x) => +x.toFixed(2))
  if (!best) return console.log(PHI1deg, aspect, 'none')
  console.log(JSON.stringify({ PHI1deg, aspect, cost: +best.cost.toFixed(4), c: f(best.c), t: f(best.t), fov: +best.fov.toFixed(1), S: f(best.S), E: f(best.E), M: f(best.M), er: +best.er.toFixed(3), stops: best.stops }))
}
const tall = { S: [0.2, 0.4], E: [0.26, 0.8], M: [0.78, 0.36], er: 0.1, fov: [44, 80], maxX: 0.9, maxY: 0.9 }
run(0, 0.462, tall)
run(0, 0.462, { ...tall, S: [0.16, 0.45], E: [0.3, 0.82], M: [0.74, 0.33], er: 0.12 })

// S3 "Eclipse": the corona. One fragment shader, one job: the light that spills round the specimen lens.
// The canvas sits under the lens and is screen-blended, so black adds nothing. A CSS glow stands in if WebGL is missing.
import { useEffect, useRef } from 'react'

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uC;
uniform float uR;
uniform float uT;
uniform vec3 uTint;
uniform float uPow;
uniform vec2 uPtr;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return s;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 q = (px - uC) / uR;
  float d = length(q);
  vec2 n = q / max(d, 0.0001);
  vec2 L = normalize(vec2(-0.74, -0.62) + uPtr * 0.35);
  float lit = dot(n, L);
  float bias = smoothstep(-1.0, 1.0, lit);
  float o = max(d - 1.0, 0.0);
  // streamers: noise sampled on a seamless ring (no seam at the angle wrap), drifting outwards
  vec2 ring = n * 3.0;
  float flow = uT * 0.04;
  float st = fbm(ring * 1.3 + vec2(d * 0.7 - flow, flow * 0.5));
  float rays = fbm(ring * 4.5 + vec2(3.1, d * 0.5 - flow * 1.6));
  float fine = fbm(ring * 11.0 + vec2(uT * 0.03, d * 1.8 - uT * 0.1));
  float halo = exp(-o * 3.8) * (0.2 + 0.8 * bias);
  float streak = exp(-o * 1.9) * smoothstep(0.36, 0.86, st) * (0.12 + 0.88 * bias * bias) * 0.8;
  float ray = exp(-o * 2.7) * pow(rays, 3.0) * bias * 2.1;
  float hair = exp(-o * 5.0) * pow(fine, 2.0) * bias * 0.9;
  float rim = exp(-abs(d - 1.0) * 95.0) * (0.25 + 2.4 * pow(bias, 2.5));
  float bead = exp(-abs(d - 1.0) * 30.0) * pow(max(lit, 0.0), 16.0) * 2.2;
  float outside = smoothstep(0.985, 1.0, d);
  vec3 hot = vec3(1.0, 0.95, 0.88);
  vec3 col = uTint * (halo * 0.46 + streak + ray + hair) * outside;
  col += hot * (rim + bead + pow(halo, 4.0) * 0.5 * bias) * outside;
  col += vec3(0.07, 0.11, 0.26) * exp(-o * 0.62) * (0.25 + 0.75 * bias) * 0.5 * outside;
  col *= uPow;
  col += (hash(px + fract(uT)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`

export interface CoronaProps {
  /** element whose box is the lens (a circle) */
  lens: React.RefObject<HTMLElement | null>
  tint: [number, number, number]
  still?: boolean
}

export default function Corona({ lens, tint, still }: CoronaProps) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const tintRef = useRef(tint)
  tintRef.current = tint

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
    if (!gl) {
      canvas.dataset.off = '1'
      return
    }
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.dataset.off = '1'
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (name: string) => gl.getUniformLocation(prog, name)
    const uRes = u('uRes')
    const uC = u('uC')
    const uR = u('uR')
    const uT = u('uT')
    const uTint = u('uTint')
    const uPow = u('uPow')
    const uPtr = u('uPtr')

    let raf = 0
    let visible = true
    let lost = false
    const start = performance.now()
    const cur: [number, number, number] = [...tintRef.current]
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
    let dpr = 1
    const coarse = window.matchMedia('(pointer: coarse)').matches

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.1 : 1.5)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    const draw = (now: number) => {
      if (lost) return
      resize()
      const cr = canvas.getBoundingClientRect()
      const lr = lens.current?.getBoundingClientRect()
      const t = (now - start) / 1000
      const target = tintRef.current
      for (let i = 0; i < 3; i++) cur[i] += (target[i] - cur[i]) * (still ? 1 : 0.06)
      ptr.x += (ptr.tx - ptr.x) * 0.05
      ptr.y += (ptr.ty - ptr.y) * 0.05
      gl.uniform2f(uRes, canvas.width, canvas.height)
      if (lr) {
        gl.uniform2f(uC, (lr.left - cr.left + lr.width / 2) * dpr, (lr.top - cr.top + lr.height / 2) * dpr)
        gl.uniform1f(uR, (lr.width / 2) * dpr)
      }
      gl.uniform1f(uT, still ? 12 : t)
      gl.uniform3f(uTint, cur[0], cur[1], cur[2])
      const k = still ? 1 : Math.min(1, t / 2.2)
      gl.uniform1f(uPow, k * k * (3 - 2 * k))
      gl.uniform2f(uPtr, ptr.x, ptr.y)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.dataset.on = '1'
    }
    const loop = (now: number) => {
      draw(now)
      if (visible && !document.hidden && !still) raf = requestAnimationFrame(loop)
      else raf = 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) kick()
    })
    io.observe(canvas)
    let last = 0
    const onMove = (e: PointerEvent) => {
      if (e.timeStamp - last < 30) return
      last = e.timeStamp
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onVis = () => kick()
    const onLost = (e: Event) => {
      e.preventDefault()
      lost = true
      canvas.dataset.off = '1'
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', kick)
    document.addEventListener('visibilitychange', onVis)
    canvas.addEventListener('webglcontextlost', onLost)
    kick()
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', kick)
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('webglcontextlost', onLost)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [lens, still])

  return <canvas ref={ref} className="s3-corona" aria-hidden="true" />
}

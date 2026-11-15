// "Inside the vein": a full-screen fragment shader (plain WebGL, no library). The viewer floats in a vessel while
// cells stream past; the press value of the real stage (0..1) flattens the vessel around them.
// It is an illustration, not data: the page marks it "AI-generated illustration".
import { useEffect, useRef } from 'react'

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uPress; uniform float uGain; uniform float uAlarm;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 4; i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= .5; } return s; }
// one layer of drifting cells in (angle, depth) space
float cells(float a, float z, float flow, float cols, float seed, out float shade){
  vec2 g = vec2(a/6.2831853*cols, z*1.9 + flow);
  vec2 id = floor(g); vec2 f = fract(g) - .5;
  float h = hash(id + seed);
  vec2 off = (vec2(hash(id + seed + 3.1), hash(id + seed + 7.7)) - .5)*.46;
  vec2 q = (f - off)*vec2(1., 1.5);
  float d = length(q);
  float sz = .13 + .1*hash(id + seed + 1.7);
  shade = .45 + .55*smoothstep(0., sz*.75, d);            // the dimple of a red cell
  return step(.52, h)*smoothstep(sz, sz - .05, d);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
  uv.y += .03;
  float t = uT;
  // slow sway, as if drifting
  uv += .012*vec2(sin(t*.31), cos(t*.23));
  // the squeeze: the vessel flattens top to bottom and spreads a little sideways
  vec2 p = vec2(uv.x/(1. + uPress*.22), uv.y*(1. + uPress*1.9));
  float r = length(p);
  float a = atan(p.y, p.x);
  float z = .42/(r + .035);
  float flow = t*.42;
  vec2 ring = vec2(cos(a), sin(a));
  // the wall: soft folds, and fine streaks that run with the flow
  float w = fbm(vec2(ring.x*2.6 + z*1.5 + flow*.7, ring.y*2.6 - z*.9 + flow*.35));
  float streak = fbm(vec2(ring.x*7. + ring.y*5., z*.55 + flow*1.4));
  float ribs = .5 + .5*sin(z*8. + flow*4.5 + w*4.5);
  float wall = pow(w, 1.4)*1.25 + streak*.35 + ribs*ribs*.22;
  float near = smoothstep(.05, 1., r);
  vec3 cFar = vec3(.04, .025, .13);
  vec3 cMid = vec3(.34, .035, .14);
  vec3 cNear = vec3(.78, .11, .1);
  vec3 col = mix(cFar, cMid, smoothstep(.0, .45, near));
  col = mix(col, cNear, smoothstep(.4, 1., near)*.8);
  col *= .22 + 1.35*wall;
  // wet highlights along the folds
  float spec = pow(max(0., ribs*w*1.9 - .5), 3.)*near;
  col += vec3(1., .6, .5)*spec*.7;
  // cells, three depths
  float fade = smoothstep(.05, .3, r);
  float s1; float c1 = cells(a + .2*sin(z*.7), z, flow*3.2, 18., 0., s1);
  float s2; float c2 = cells(a + 1.3, z*.55, flow*1.9, 11., 40., s2);
  float s3; float c3 = cells(a + 2.1, z*.3, flow*1.2, 6., 90., s3);
  col = mix(col, vec3(.95, .2, .16)*s1*(.4 + .9*near), c1*fade*.85);
  col = mix(col, vec3(1., .28, .2)*s2*(.5 + .8*near), c2*fade*smoothstep(.2, .6, r)*.85);
  col = mix(col, vec3(1., .34, .24)*s3*(.55 + .6*near), c3*smoothstep(.45, .9, r)*.7);
  // light at the far end; it warms when the alarm has fired
  vec3 glow = mix(vec3(.45, .5, 1.), vec3(1., .62, .25), uAlarm);
  col += glow*.11/(r*r*9. + .08)*(1. - uPress*.5);
  // vignette, grain
  vec2 v = gl_FragCoord.xy/uRes - .5;
  col *= 1. - dot(v, v)*.9;
  col += (hash(gl_FragCoord.xy + t) - .5)*.022;
  gl_FragColor = vec4(max(col, 0.)*uGain, 1.);
}`

export interface TunnelProps {
  /** returns the press, 0..1, read every frame */
  press: () => number
  /** 0..1, warms the light when the result is an alarm */
  alarm: () => number
  /** brightness */
  gain?: number
  className?: string
}

export function Tunnel({ press, alarm, gain = 1, className }: TunnelProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef({ press, alarm, gain })
  live.current = { press, alarm, gain }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) {
      console.warn('vw1 tunnel: no webgl')
      return
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('vw1 tunnel shader', gl.getShaderInfoLog(s))
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = u('uRes'), uT = u('uT'), uPress = u('uPress'), uGain = u('uGain'), uAlarm = u('uAlarm')

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let p = 0
    let al = 0
    let last = 0
    const t0 = performance.now()
    const size = () => {
      // half resolution: the model shares this GPU
      const k = Math.min(1, 900 / Math.max(canvas.clientWidth, 1)) * 0.75
      const w = Math.max(2, Math.round(canvas.clientWidth * k))
      const h = Math.max(2, Math.round(canvas.clientHeight * k))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 30) return // about 30 frames a second is plenty behind the stage
      last = now
      size()
      p += (live.current.press() - p) * 0.16
      al += (live.current.alarm() - al) * 0.05
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uT, reduce ? 12 : (now - t0) / 1000)
      gl.uniform1f(uPress, p)
      gl.uniform1f(uAlarm, al)
      gl.uniform1f(uGain, live.current.gain)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf) // the context is kept: in development React mounts twice on the same canvas
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}

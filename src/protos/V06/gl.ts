// Thin WebGL2 wrapper for the one shader. No per-frame allocation; adaptive render scale for integrated graphics.
import { FRAG, VERT } from './shader'
import type { Cam, World } from './camera'
import type { V3 } from './data'

const UNI = ['uRes', 'uS', 'uCo', 'uCf', 'uCr', 'uCu', 'uF', 'uPP', 'uT', 'uBeat', 'uWave', 'uPl', 'uPlPos', 'uPlCol', 'uSun', 'uPc', 'uPr', 'uNear', 'uFar', 'uExpo', 'uZero', 'uSteps'] as const

export interface Frame {
  t: number
  beat: number
  wave: number
  pl: Float32Array // 6 intensities
  near: number
  far: number
  expo: number
  sun: V3
}

export class Renderer {
  gl: WebGL2RenderingContext
  prog: WebGLProgram
  buf: WebGLBuffer
  u: Record<(typeof UNI)[number], WebGLUniformLocation | null>
  scale = 1
  maxScale = 1
  minScale = 0.5
  cssW = 1
  cssH = 1
  lost = false
  private ft = 16
  private plPos = new Float32Array(18)
  private plCol = new Float32Array(18)
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, world: World, plPos: number[][], plCol: number[][], phone: boolean) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })
    if (!gl) throw new Error('no webgl2')
    this.gl = gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const prog = gl.createProgram()!
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, FRAG)
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    this.prog = prog
    gl.useProgram(prog)
    this.buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    this.u = Object.fromEntries(UNI.map((n) => [n, gl.getUniformLocation(prog, n)])) as Renderer['u']
    plPos.forEach((p, i) => this.plPos.set(p, i * 3))
    plCol.forEach((c, i) => this.plCol.set(c, i * 3))
    gl.uniform3fv(this.u.uPlPos, this.plPos)
    gl.uniform3fv(this.u.uPlCol, this.plCol)
    gl.uniform3fv(this.u.uSun, world.sun)
    gl.uniform3fv(this.u.uPc, world.pc)
    gl.uniform1f(this.u.uPr, world.pr)
    gl.uniform1i(this.u.uZero, 0)
    gl.uniform1i(this.u.uSteps, phone ? 110 : 140)
    const dpr = 1.25
    const pdpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.maxScale = phone ? pdpr : dpr
    this.minScale = phone ? 0.5 : 0.55
    this.scale = phone ? Math.min(pdpr, 1.1) : Math.min(dpr, 1)
  }

  resize(w: number, h: number) {
    this.cssW = w
    this.cssH = h
    const W = Math.max(1, Math.round(w * this.scale))
    const H = Math.max(1, Math.round(h * this.scale))
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W
      this.canvas.height = H
    }
    this.gl.viewport(0, 0, W, H)
  }

  /** Feed the measured frame time. Frames are vsync-capped, so: drop a step when frames run long, and after a calm
   *  spell try one step up again (backing off for longer each time a raise fails). */
  private calm = 0
  private wait = 1500
  adapt(dt: number) {
    this.ft = this.ft * 0.85 + Math.min(dt, 100) * 0.15
    let s = this.scale
    if (this.ft > 24 && s > this.minScale) {
      s = Math.max(this.minScale, s - 0.1)
      this.calm = 0
      this.wait = Math.min(12000, this.wait * 2)
      this.ft = 17
    } else if (this.ft < 18.5) {
      this.calm += dt
      if (this.calm > this.wait && s < this.maxScale) {
        s = Math.min(this.maxScale, s + 0.1)
        this.calm = 0
      }
    } else this.calm = 0
    if (s !== this.scale) {
      this.scale = s
      this.resize(this.cssW, this.cssH)
    }
  }

  draw(c: Cam, fr: Frame) {
    if (this.lost) return
    const gl = this.gl
    const u = this.u
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height)
    gl.uniform1f(u.uS, this.canvas.width / this.cssW)
    gl.uniform3f(u.uCo, c.co[0], c.co[1], c.co[2])
    gl.uniform3f(u.uCf, c.cf[0], c.cf[1], c.cf[2])
    gl.uniform3f(u.uCr, c.cr[0], c.cr[1], c.cr[2])
    gl.uniform3f(u.uCu, c.cu[0], c.cu[1], c.cu[2])
    gl.uniform1f(u.uF, c.f)
    gl.uniform2f(u.uPP, c.pp[0], c.pp[1])
    gl.uniform1f(u.uT, fr.t)
    gl.uniform1f(u.uBeat, fr.beat)
    gl.uniform1f(u.uWave, fr.wave)
    gl.uniform1fv(u.uPl, fr.pl)
    gl.uniform1f(u.uNear, fr.near)
    gl.uniform1f(u.uFar, fr.far)
    gl.uniform1f(u.uExpo, fr.expo)
    gl.uniform3f(u.uSun, fr.sun[0], fr.sun[1], fr.sun[2])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose() {
    const gl = this.gl
    gl.deleteBuffer(this.buf)
    gl.deleteProgram(this.prog)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

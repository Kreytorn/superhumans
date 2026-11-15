// The sky behind the figure: faint nebular light, aurora-like curtains rising from the planet's limb, the limb's
// airglow, and a few out-of-focus dust motes catching the sun. One small fragment shader, drawn at a third of the
// viewport resolution (everything in it is soft) and at a low frame rate, so it stays cheap on integrated graphics.
// It is blended over the page with "screen", so black adds nothing. Drawn by AI-written code.

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uT;uniform vec3 uLimb;
out vec4 o;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float wav(float x,float t){return .5+.24*sin(x*1.7+t*.11)+.16*sin(x*3.9-t*.07+1.3)+.1*sin(x*7.3+t*.05+4.1);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=vec2(uv.x*asp,uv.y);float t=uT;
  /* the limb: a shallow arc, highest at uLimb.x */
  float dx=uv.x-uLimb.x;float h=uLimb.y-uLimb.z*dx*dx;float alt=uv.y-h;
  vec3 col=vec3(0.);
  /* nebular light: slow warped waves (no lattice noise, so no seams), indigo to violet, very low contrast */
  vec2 q=p*vec2(1.5,1.9)+vec2(t*.008,-t*.005);
  float w=.5+.5*sin(q.x*1.9+1.6*sin(q.y*1.3+t*.021)+.6)*sin(q.y*1.7+1.5*sin(q.x*1.1-t*.016)+2.1);
  float w2=.5+.5*sin(q.x*3.3-q.y*2.1+1.2*sin(q.y*2.4+t*.03));
  float neb=smoothstep(.42,1.,w)*(.55+.45*w2);
  vec3 nebCol=mix(vec3(.10,.19,.48),vec3(.42,.17,.54),w2);
  col+=nebCol*neb*.30*smoothstep(-.1,.35,alt);
  /* aurora curtains: a slow wide envelope times fine vertical rays, falling off with height above the limb */
  float x=uv.x*asp;
  float band=wav(x*2.3+.7,t);
  float rays=.5+.5*sin(x*52.+2.6*sin(x*6.1+t*.19)+t*.23);
  float rays2=.5+.5*sin(x*17.-t*.12+1.9*sin(x*2.7-t*.05));
  float curtain=smoothstep(.40,.84,band)*(.28+.44*rays*rays2+.28*rays2);
  float fall=exp(-max(alt,0.)*(6.4-3.4*band))*smoothstep(-.015,.035,alt);
  vec3 aur=mix(vec3(.16,.95,.62),vec3(.46,.30,.98),smoothstep(0.,.34,alt));
  col+=aur*curtain*fall*.6;
  /* airglow: a thin bright skin on the limb and a wide soft one above it, breathing slowly */
  float breathe=.8+.2*sin(t*.23);
  col+=vec3(.36,.78,.92)*exp(-abs(alt)*85.)*.17*breathe;
  col+=vec3(.42,.36,.92)*exp(-max(alt,0.)*8.)*.055*breathe*smoothstep(-.02,.02,alt);
  /* dust motes: sparse soft discs in two depths, drifting, brighter toward the sun */
  for(int L=0;L<2;L++){
    float fl=float(L);float sc=mix(8.,15.,fl);
    vec2 g=p*sc+vec2(t*(.03+.02*fl),t*.011*(1.+fl));
    vec2 id=floor(g),f=fract(g)-.5;float r=hash(id+fl*7.3);
    vec2 off=(vec2(hash(id+1.7),hash(id+5.1))-.5)*.66;
    float d=length(f-off),size=mix(.035,.12,r*r);
    float tw=.55+.45*sin(t*(.35+r)+r*40.);
    float m=(1.-smoothstep(size*.2,size,d))*step(.74,r)*tw;
    float sun=.35+.65*(1.-smoothstep(.1,1.1,length(vec2((uv.x-.66)*asp,uv.y-h))));
    col+=vec3(1.,.87,.68)*m*.2*sun*smoothstep(-.02,.06,alt);
  }
  col+=(hash(gl_FragCoord.xy+fract(t)*91.7)-.5)*(1.6/255.);
  o=vec4(max(col,0.),1.);
}
`

export interface Aurora {
  /** Sets the backing size from the viewport (a third of it). */
  size(vw: number, vh: number): void
  /** limb = [x of the highest point (0..1), its height from the bottom (0..1), curvature]. */
  draw(seconds: number, limb: [number, number, number]): void
}

const cache = new WeakMap<HTMLCanvasElement, Aurora | null>()

export function initAurora(cv: HTMLCanvasElement): Aurora | null {
  if (cache.has(cv)) return cache.get(cv) ?? null
  const made = make(cv)
  cache.set(cv, made)
  return made
}

function make(cv: HTMLCanvasElement): Aurora | null {
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
  } catch {
    gl = null
  }
  if (!gl) return null
  const g = gl
  try {
    const sh = (type: number, src: string) => {
      const s = g.createShader(type)
      if (!s) throw new Error('no shader')
      g.shaderSource(s, src)
      g.compileShader(s)
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s) ?? 'shader error')
      return s
    }
    const prog = g.createProgram()
    if (!prog) throw new Error('no program')
    g.attachShader(prog, sh(g.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'))
    g.attachShader(prog, sh(g.FRAGMENT_SHADER, FS))
    g.linkProgram(prog)
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog) ?? 'link error')
    g.useProgram(prog)
    const buf = g.createBuffer()
    g.bindBuffer(g.ARRAY_BUFFER, buf)
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW)
    const loc = g.getAttribLocation(prog, 'p')
    g.enableVertexAttribArray(loc)
    g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0)
    const uRes = g.getUniformLocation(prog, 'uRes')
    const uT = g.getUniformLocation(prog, 'uT')
    const uLimb = g.getUniformLocation(prog, 'uLimb')
    return {
      size(vw, vh) {
        cv.width = Math.max(160, Math.round(vw / 3))
        cv.height = Math.max(120, Math.round(vh / 3))
        g.viewport(0, 0, cv.width, cv.height)
      },
      draw(seconds, limb) {
        g.uniform2f(uRes, cv.width, cv.height)
        g.uniform1f(uT, seconds)
        g.uniform3f(uLimb, limb[0], limb[1], limb[2])
        g.drawArrays(g.TRIANGLES, 0, 3)
      },
    }
  } catch (err) {
    console.error(err)
    return null
  }
}

// The glass crew figure and the sky, ported from work/App/mockups/A/home.html.
// The figure is a signed-distance body raymarched in WebGL2 (fresnel glass, cross-contour slices, rim light,
// six organ glows, floor ring). It is drawn by AI-written code, so the page carries an "AI-generated illustration" mark.

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uS;uniform float uDpr;uniform vec2 uOff;
uniform vec3 uCo;uniform vec3 uCf;uniform vec3 uCr;uniform vec3 uCu;
uniform float uF;uniform vec2 uPP;uniform float uRot;uniform float uRev;uniform float uT;uniform float uBeat;uniform float uZoom;
uniform float uOrg[6];
/* always 0: loops start here so the D3D compiler cannot unroll them (each unrolled step would copy the whole body) */
uniform int uZ;
out vec4 o;

float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float sdEll(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float sdRC(vec3 p,vec3 a,vec3 b,float r1,float r2){
  vec3 ba=b-a;float l2=dot(ba,ba),rr=r1-r2,a2=l2-rr*rr,il2=1./l2;
  vec3 pa=p-a;float y=dot(pa,ba),z=y-l2;vec3 xv=pa*l2-ba*y;float x2=dot(xv,xv),y2=y*y*l2,z2=z*z*l2,k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-r2;
  if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1;}

/* hand in its own frame: wrist W, axis down the hand, palm turned medial-forward */
const vec3 HW=vec3(.262,.872,.014);
const vec3 HA=vec3(.0475,-.9881,.1463);
const vec3 HN=vec3(-.7966,.0498,.6026);
const vec3 HX=vec3(-.6026,-.1462,-.7843);
float finger(vec3 l,float x,float L,float r){
  vec3 p0=vec3(x,.094,0.),p1=vec3(x*1.06,.094+.52*L,.008),p2=vec3(x*1.1,.094+.93*L,.024);
  return min(sdCap(l,p0,p1,r),sdCap(l,p1,p2,r*.86));}
float hand(vec3 q){
  vec3 v=q-HW,l=vec3(dot(v,HX),dot(v,HA),dot(v,HN));
  float d=sdEll(l-vec3(.0,.048,0.),vec3(.039,.052,.0155));
  d=smin(d,sdEll(l-vec3(-.024,.034,.009),vec3(.017,.032,.016)),.012);
  float f=finger(l,-.026,.074,.0084);
  f=min(f,finger(l,-.0086,.082,.0088));
  f=min(f,finger(l,.0088,.077,.0083));
  f=min(f,finger(l,.025,.062,.0073));
  d=smin(d,f,.009);
  float t=min(sdCap(l,vec3(-.034,.03,.012),vec3(-.052,.066,.03),.0105),sdCap(l,vec3(-.052,.066,.03),vec3(-.05,.096,.046),.009));
  return smin(d,t,.01);}

/* legs, slightly apart (q = body point mirrored to x >= 0); alone it is also the floor contact, since nothing else comes near the floor */
float legs(vec3 q){
  float g=sdRC(q,vec3(.086,.925,0.),vec3(.118,.50,.006),.081,.051);
  g=smin(g,sdEll(q-vec3(.101,.755,.024),vec3(.069,.15,.07)),.04);
  g=smin(g,sdEll(q-vec3(.118,.488,.020),vec3(.046,.052,.046)),.025);
  g=smin(g,sdRC(q,vec3(.118,.48,-.002),vec3(.142,.085,-.014),.047,.028),.03);
  g=smin(g,sdEll(q-vec3(.124,.355,-.024),vec3(.050,.105,.052)),.04);
  float ft=max(sdRC(q,vec3(.146,.042,-.03),vec3(.172,.026,.15),.040,.026),-q.y);
  g=smin(g,ft,.03);
  return g;}
float body(vec3 p){
  vec3 q=vec3(abs(p.x),p.y,p.z);
  /* head */
  float d=sdEll(p-vec3(0.,1.652,-.004),vec3(.076,.098,.094));
  d=smin(d,sdEll(p-vec3(0.,1.590,.022),vec3(.060,.062,.064)),.04);
  d=smin(d,sdEll(p-vec3(0.,1.549,.040),vec3(.030,.024,.030)),.03);
  d=smin(d,sdEll(p-vec3(0.,1.618,.088),vec3(.011,.024,.016)),.012);
  d=smin(d,sdEll(q-vec3(.075,1.622,-.006),vec3(.011,.028,.017)),.01);
  /* neck, shoulders, torso */
  d=smin(d,sdRC(p,vec3(0.,1.47,-.015),vec3(0.,1.575,-.01),.054,.048),.035);
  d=smin(d,sdRC(q,vec3(.02,1.495,-.03),vec3(.165,1.448,-.02),.052,.046),.05);
  d=smin(d,sdEll(p-vec3(0.,1.318,-.004),vec3(.150,.168,.100)),.06);
  d=smin(d,sdEll(q-vec3(.068,1.352,.050),vec3(.074,.058,.052)),.05);
  d=smin(d,sdEll(p-vec3(0.,1.135,.006),vec3(.122,.150,.090)),.07);
  d=smin(d,sdEll(p-vec3(0.,.975,-.004),vec3(.146,.105,.096)),.06);
  d=smin(d,sdEll(q-vec3(.066,.93,-.045),vec3(.078,.09,.07)),.04);
  /* arms */
  d=smin(d,sdEll(q-vec3(.188,1.408,-.006),vec3(.056,.072,.060)),.04);
  float a=sdRC(q,vec3(.198,1.40,-.01),vec3(.228,1.135,-.022),.046,.035);
  a=smin(a,sdEll(q-vec3(.208,1.27,0.),vec3(.040,.085,.042)),.03);
  a=smin(a,sdRC(q,vec3(.230,1.128,-.020),vec3(.262,.878,.012),.037,.024),.02);
  a=smin(a,sdEll(q-vec3(.238,1.052,-.008),vec3(.037,.07,.035)),.025);
  a=smin(a,hand(q),.012);
  d=smin(d,a,.03);
  return smin(d,legs(q),.04);}

/* tetrahedral normal (corners +--, --+, -+-, +++), as a loop so the body is compiled once here, not four times */
vec3 nrm(vec3 p){vec3 n=vec3(0.);
  for(int i=uZ;i<4;i++){vec3 e=vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))*2.-1.;n+=e*body(p+e*.0007);}
  return normalize(n);}

float pglow(vec3 ro,vec3 rd,vec3 c,float r){vec3 v=c-ro;float t=max(dot(v,rd),0.);float d=length(v-rd*t);return exp(-d*d/(r*r));}
float sglow(vec3 ro,vec3 rd,vec3 a,vec3 b,float r){ /* exact ray-to-segment distance */
  vec3 v=b-a,w=ro-a;float bb=dot(rd,v),cc=dot(v,v),dd=dot(rd,w),ee=dot(v,w);
  float s=clamp((ee-bb*dd)/max(cc-bb*bb,1e-9),0.,1.);vec3 c=a+v*s;float t=max(dot(c-ro,rd),0.);vec3 e=ro+rd*t-c;return exp(-dot(e,e)/(r*r));}
/* cells drifting down the vessel; only seen once the camera dives in */
float cells(vec3 ro,vec3 rd,vec3 a,vec3 b,float r,float ph){float g=0.;for(int i=uZ;i<16;i++){float u=fract((float(i)+ph)/16.);g+=pglow(ro,rd,mix(a,b,u)+vec3(.0025*sin(float(i)*2.3),0.,.0025*cos(float(i)*1.7)),r)*sin(3.1416*u);}return g;}

void main(){
  vec2 sp=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uS+uOff;
  vec3 rd=normalize(uCf*uF+uCr*(sp.x-uPP.x)-uCu*(sp.y-uPP.y)),ro=uCo;
  float c=cos(uRot),s=sin(uRot);mat3 W2B=mat3(c,0.,s,0.,1.,0.,-s,0.,c);
  vec3 rob=W2B*ro,rdb=W2B*rd;
  /* bounding box in body space */
  vec3 bmin=vec3(-.40,-.02,-.26),bmax=vec3(.40,1.80,.26);
  vec3 iv=1./rdb,t0=(bmin-rob)*iv,t1=(bmax-rob)*iv,tn=min(t0,t1),tf=max(t0,t1);
  float tN=max(max(tn.x,tn.y),max(tn.z,0.)),tF=min(min(tf.x,tf.y),tf.z);
  float pixAng=1./(uF*uS);
  float t=tN,dmin=1e9,ymin=0.;bool hit=false;
  if(tF>tN){
    /* up to 150 march steps, then 3 full steps onto the surface after a hit, in one loop so the body is compiled once */
    int k=0;
    for(int i=uZ;i<153;i++){
      vec3 p=rob+rdb*t;float d=body(p);
      if(hit){t+=d;if(++k==3)break;continue;}
      if(i>=150)break;
      float dp=d/(t*pixAng);if(dp<dmin){dmin=dp;ymin=p.y;}
      if(d<.00007*t){hit=true;continue;}
      t+=d*.86;if(t>tF)break;
    }
  }
  vec3 pb=rob+rdb*t;
  /* derivatives taken in uniform control flow */
  const vec3 SN=vec3(0.,.8762,.4819);
  float sl=dot(pb,SN),fwS=max(fwidth(sl),1e-6);
  float tp=ro.y/max(-rd.y,1e-4);vec3 fp=ro+rd*tp;float fr=length(fp.xz),fwR=max(fwidth(fr),1e-6);
  float hw=max(1.15*uS,1.0*uDpr);

  vec3 L=vec3(0.);float cov=0.;
  const vec3 ACC=vec3(.561,.722,1.),RIM=vec3(.812,.878,1.);
  bool shown=hit&&pb.y<uRev;
  if(shown){
    vec3 n=nrm(pb);float ndv=clamp(dot(n,-rdb),0.,1.),fres=pow(1.-ndv,2.2);
    /* glass: faint fill, fresnel edge */
    L+=ACC*(.035+.30*fres);cov=.34;
    /* cross-contours: tilted slices, >= 12 px apart, fading toward the silhouette */
    float sp2=.040,gap=sp2/fwS,dl=abs(fract(sl/sp2+.5)-.5)*sp2/fwS;
    float ln=(1.-smoothstep(hw-.6,hw+.8,dl))*smoothstep(10.*uS,14.*uS,gap)*smoothstep(.12,.62,ndv);
    /* soft key light from above-left so the volume reads; it also lights the contours */
    float key=max(dot(n,normalize(vec3(-.5,.8,.6))),0.);
    L+=ACC*ln*(.2+.28*key);
    L+=ACC*.07*key;
    /* scan line while revealing */
    L+=vec3(.9,.95,1.)*(1.-smoothstep(0.,.006,abs(pb.y-uRev)))*step(uRev,1.79);
    /* inner rim: last px inside the edge */
    L+=RIM*smoothstep(.86,.985,1.-ndv)*.55;
  }
  /* bright rim just outside the silhouette (closest approach of the ray) */
  if(!hit&&ymin<uRev){float rim=1.-smoothstep(hw*.9,hw*2.3,dmin);L+=RIM*rim*.9;cov=max(cov,rim*.6);}

  /* organs: faint glows inside the glass, in module accents (pitch order) */
  if(shown){
    float beat=1.+.18*uBeat;
    float g;
    g=0.;for(int k=uZ;k<5;k++){vec3 off=vec3(.012*cos(float(k)*2.4),.012*sin(float(k)*1.7),.008*sin(float(k)*3.1));g+=pglow(rob,rdb,vec3(-.192,1.405,.012)+off,.0085);}
    g=min(g,1.2)+.35*pglow(rob,rdb,vec3(-.192,1.405,.012),.032);
    L+=vec3(1.,.478,.271)*g*.55*uOrg[0];
    g=pglow(rob,rdb,vec3(.028,1.30,.035),.034*beat)*.8+.3*pglow(rob,rdb,vec3(.028,1.30,.035),.07);
    L+=vec3(.247,.816,1.)*g*.6*uOrg[1];
    vec3 va=vec3(-.236,1.085,.006),vb=vec3(-.258,.905,.022);
    g=sglow(rob,rdb,va,vb,.0075)*.8+.32*sglow(rob,rdb,va,vb,.028);
    g+=cells(rob,rdb,va,vb,.0042,uT*1.4)*.9*smoothstep(2.,7.,uZoom);
    L+=vec3(.718,.549,1.)*g*.6*uOrg[2];
    g=max(sglow(rob,rdb,vec3(.074,.86,.03),vec3(.098,.62,.026),.0065),sglow(rob,rdb,vec3(.098,.62,.026),vec3(.112,.47,-.02),.0065))*.8;
    g+=.3*sglow(rob,rdb,vec3(.074,.86,.03),vec3(.112,.47,-.02),.028);
    L+=vec3(1.,.31,.482)*g*.48*uOrg[3];
    g=pglow(rob,rdb,vec3(0.,1.69,-.004),.048)*.7+.25*pglow(rob,rdb,vec3(0.,1.69,-.004),.08);
    L+=vec3(.361,.949,.69)*g*.55*uOrg[4];
    g=pglow(rob,rdb,vec3(.078,1.600,-.006),.012)+.3*pglow(rob,rdb,vec3(.078,1.600,-.006),.03);
    L+=vec3(1.,.827,.302)*g*.6*uOrg[5];
  }

  /* floor: thin orbit ring, dashed outer ring, soft disc; dimmed behind the glass */
  if(rd.y<0.&&fr<1.1){
    float behind=(hit&&t<tp*1.0001&&shown)?.35:1.;
    float r1=1.-smoothstep(hw-.6,hw+.8,abs(fr-.44)/fwR);
    float ang=atan(fp.z,fp.x)/6.2831853;
    float r2=(1.-smoothstep(hw-.8,hw+.6,abs(fr-.58)/fwR))*step(.45,fract(ang*96.));
    float disc=exp(-fr*fr/.10)*.10;
    float cont=0.;
    if(fr<.5){vec3 fb=W2B*fp,pf=fb+vec3(0.,.004,0.);cont=exp(-max(legs(vec3(abs(pf.x),pf.y,pf.z)),0.)/.012)*.35*step(fb.y,uRev+.01);}
    float rev=smoothstep(-.05,.05,uRev);
    L+=ACC*(r1*.55+r2*.28+disc+cont)*behind*rev;
    cov=max(cov,(r1*.4+disc)*behind*rev);
  }
  float a=clamp(max(max(L.r,L.g),L.b),0.,1.);
  L=min(L,vec3(a));
  o=vec4(L,max(a,cov));
}
`

/* ---------------- camera (shared by the shader and the hotspot overlay) ---------------- */
export type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const nrm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2])
  return [a[0] / l, a[1] / l, a[2] / l]
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

const CO: V3 = [0, 1.3, 7.4]
const TG: V3 = [0, 0.89, 0]
const CF = nrm(sub(TG, CO))
const CR = nrm(cross(CF, [0, 1, 0]))
const CU = cross(CR, CF)

export interface Cam {
  f: number
  ppx: number
  ppy: number
  /** The focal length of the fitted (un-zoomed) view. */
  f0: number
}

/** Fits the camera so the top of the head lands on stage y = top and the floor on y = bottom, centred on x = cx. */
export function fitCam(cx: number, top: number, bottom: number): Cam {
  const v1 = sub([0, 1.752, 0], CO)
  const v2 = sub([0, 0, 0.02], CO)
  const a = dot(v1, CU) / dot(v1, CF)
  const b = dot(v2, CU) / dot(v2, CF)
  const f = (bottom - top) / (a - b)
  return { f, f0: f, ppx: cx, ppy: top + f * a }
}

const toWorld = (p: V3, rot: number): V3 => {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]
}

/** Body-space point -> stage pixels. */
export function project(cam: Cam, p: V3, rot: number): [number, number] {
  const v = sub(toWorld(p, rot), CO)
  const z = dot(v, CF)
  return [cam.ppx + (cam.f * dot(v, CR)) / z, cam.ppy - (cam.f * dot(v, CU)) / z]
}

/* ---------------- one clock drives the reveal ---------------- */
export interface FigState {
  t: number
  rot: number
  beat: number
  rev: number
  org: number[]
  hs: number[]
  ld: number[]
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const eio = (u: number) => {
  u = clamp01(u)
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}
export const eout = (u: number) => {
  u = clamp01(u)
  return 1 - Math.pow(1 - u, 3)
}
const REV0 = 150
const REV1 = 1650
const IGN = 1700
const STEP = 170
export const END = 3400
export const REV1_MS = REV1
const ROT0 = 0.16

/** The figure at ms after load: scan-line reveal from the feet up, then the six organs light in pitch order. */
export function stateAt(ms: number, live: boolean): FigState {
  const st: FigState = { t: ms, rot: ROT0, beat: 0, rev: -0.06 + 1.92 * eio((ms - REV0) / (REV1 - REV0)), org: [], hs: [], ld: [] }
  for (let i = 0; i < 6; i++) {
    const t0 = IGN + i * STEP
    st.org.push(eout((ms - t0) / 450))
    st.hs.push(clamp01((ms - t0 - 120) / 380))
    st.ld.push(clamp01((ms - t0 - 240) / 500))
  }
  if (live) {
    st.rot = ROT0 + 0.16 * Math.sin(((ms / 1000) * 2 * Math.PI) / 40)
    const ph = ((ms / 1000) * 1.1) % 1
    st.beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(ph - 0.18, 0) * 9) * (ph > 0.18 ? 1 : 0)
  }
  return st
}

/** The settled figure; when live it sways slowly and the heart glow beats. */
export function settled(ms: number, live: boolean): FigState {
  const s = stateAt(1e6, false)
  s.t = ms
  if (live) {
    const l = stateAt(ms, true)
    s.rot = l.rot
    s.beat = l.beat
  }
  return s
}

/* ---------------- WebGL2 ---------------- */
export interface FigureGL {
  /** Sets the backing size: the canvas shows stageW stage px across, starting at stage x = offX. */
  resize(pxW: number, pxH: number, stageW: number, offX: number, dpr: number): void
  /** Draws one frame; false while the shader is still compiling (or failed), so nothing was drawn. */
  draw(st: FigState, cam: Cam): boolean
}

const figCache = new WeakMap<HTMLCanvasElement, FigureGL | null>()
export function initFigure(cv: HTMLCanvasElement): FigureGL | null {
  if (figCache.has(cv)) return figCache.get(cv) ?? null
  const made = makeFigure(cv)
  figCache.set(cv, made)
  return made
}

function makeFigure(cv: HTMLCanvasElement): FigureGL | null {
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  } catch {
    gl = null
  }
  if (!gl) return null
  const g = gl
  const U: Record<string, WebGLUniformLocation | null> = {}
  let prog: WebGLProgram | null = null
  // The raymarched figure is a big shader; some drivers take many seconds to compile it. With
  // KHR_parallel_shader_compile the page keeps running and the figure appears once the program is ready.
  const par = g.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null
  let pending = false
  let failed = false
  const t0 = performance.now()
  performance.mark('df-fig-compile')
  const shaders: WebGLShader[] = []
  const finish = () => {
    if (!prog) throw new Error('no program')
    for (const s of shaders) if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s) ?? 'shader error')
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog) ?? 'link error')
    g.useProgram(prog)
    const buf = g.createBuffer()
    g.bindBuffer(g.ARRAY_BUFFER, buf)
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW)
    const loc = g.getAttribLocation(prog, 'p')
    g.enableVertexAttribArray(loc)
    g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0)
    for (const n of ['uRes', 'uS', 'uDpr', 'uOff', 'uCo', 'uCf', 'uCr', 'uCu', 'uF', 'uPP', 'uRot', 'uRev', 'uT', 'uBeat', 'uZoom', 'uOrg', 'uZ'])
      U[n] = g.getUniformLocation(prog, n)
  }
  /** True when the program can draw now. */
  const usable = () => {
    if (failed) return false
    if (!pending) return true
    // after 6 s stop waiting and finish it in place (some drivers never report completion on their own)
    if (prog && par && performance.now() - t0 < 6000 && !g.getProgramParameter(prog, par.COMPLETION_STATUS_KHR)) {
      // the compile runs only once the commands reach the GPU process
      g.flush()
      return false
    }
    if (performance.now() - t0 >= 6000) performance.mark('df-fig-forced')
    pending = false
    try {
      finish()
      performance.mark('df-fig-ready')
      return true
    } catch (err) {
      console.warn(err)
      failed = true
      return false
    }
  }
  try {
    const sh = (type: number, src: string) => {
      const s = g.createShader(type)
      if (!s) throw new Error('no shader')
      g.shaderSource(s, src)
      g.compileShader(s)
      shaders.push(s)
      return s
    }
    prog = g.createProgram()
    if (!prog) throw new Error('no program')
    g.attachShader(prog, sh(g.VERTEX_SHADER, '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'))
    g.attachShader(prog, sh(g.FRAGMENT_SHADER, FS))
    g.linkProgram(prog)
    g.flush()
    if (par) pending = true
    else finish()
  } catch (err) {
    console.error(err)
    return null
  }
  let drewOnce = false
  let sc = 1
  let dprNow = 1
  let off = 0
  return {
    resize(pxW, pxH, stageW, offX, dpr) {
      cv.width = Math.max(1, Math.round(pxW))
      cv.height = Math.max(1, Math.round(pxH))
      sc = cv.width / stageW
      dprNow = dpr
      off = offX
      g.viewport(0, 0, cv.width, cv.height)
    },
    draw(st, cam) {
      if (!usable()) return false
      g.uniform2f(U.uRes, cv.width, cv.height)
      g.uniform1f(U.uS, sc)
      g.uniform1f(U.uDpr, dprNow)
      g.uniform2f(U.uOff, off, 0)
      g.uniform3fv(U.uCo, CO)
      g.uniform3fv(U.uCf, CF)
      g.uniform3fv(U.uCr, CR)
      g.uniform3fv(U.uCu, CU)
      g.uniform1f(U.uF, cam.f)
      g.uniform2f(U.uPP, cam.ppx, cam.ppy)
      g.uniform1f(U.uRot, st.rot)
      g.uniform1f(U.uRev, st.rev)
      g.uniform1f(U.uT, st.t / 1000)
      g.uniform1f(U.uBeat, st.beat)
      g.uniform1f(U.uZoom, cam.f / cam.f0)
      g.uniform1fv(U.uOrg, st.org)
      g.uniform1i(U.uZ, 0)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.drawArrays(g.TRIANGLES, 0, 3)
      if (!drewOnce) {
        drewOnce = true
        performance.mark('df-fig-drawn')
      }
      return true
    },
  }
}

/* ---------------- starfield (seeded, sparse, no streaks) ---------------- */
function rng(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
interface Star {
  x: number
  y: number
  r: number
  a: number
  c: string
  ph: number
  tw: number
}
export interface Sky {
  size(): void
  draw(t: number, still: boolean): void
}
export function initSky(cv: HTMLCanvasElement, per = 6800): Sky | null {
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  let stars: Star[] = []
  let W = 0
  let H = 0
  let dpr = 1
  const cols = ['255,255,255', '208,224,255', '255,238,212', '190,210,255']
  return {
    size() {
      dpr = Math.min(devicePixelRatio || 1, 1.5)
      W = cv.width = Math.round(innerWidth * dpr)
      H = cv.height = Math.round(innerHeight * dpr)
      const R = rng(20261114)
      const n = Math.round((innerWidth * innerHeight) / per)
      stars = []
      for (let i = 0; i < n; i++) {
        const b = Math.pow(R(), 3)
        stars.push({ x: R(), y: R(), r: 0.35 + b * 1.15, a: 0.22 + R() * 0.55, c: cols[(R() * cols.length) | 0], ph: R() * 6.28, tw: 0.0004 + R() * 0.0016 })
      }
    },
    draw(t, still) {
      ctx.clearRect(0, 0, W, H)
      for (const s of stars) {
        const a = s.a * (still ? 1 : 0.72 + 0.28 * Math.sin(t * s.tw + s.ph))
        const r = s.r * dpr
        const x = s.x * W
        const y = s.y * H
        if (r > 1.1) {
          ctx.fillStyle = `rgba(${s.c},${(a * 0.12).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(x, y, r * 2.6, 0, 6.283)
          ctx.fill()
        }
        ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 6.283)
        ctx.fill()
      }
    },
  }
}

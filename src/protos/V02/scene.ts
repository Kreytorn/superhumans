// The Glass Body scene: one full-screen WebGL2 fragment shader. A signed-distance human figure in the weightless
// "neutral body posture" is raymarched as thick glass (fresnel rim, a refracted ray through the body, tint that deepens
// with thickness, six organ lights accumulated along the ray inside) before the lit limb of a planet whose sky is
// computed in the same shader, so the refraction costs no texture. Drawn by code: the page carries an AI mark.

export type V3 = [number, number, number]
export type M3 = [number, number, number, number, number, number, number, number, number] // row-major

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => mul(a, 1 / Math.hypot(a[0], a[1], a[2]))
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const vec = { sub, add, mul, dot, cross, norm, mix }

// ---------------------------------------------------------------- the figure's joints (body space, metres, y up, z forward)
const S: V3 = [0.198, 1.4, 0.0] // shoulder
const E: V3 = [0.318, 1.205, 0.15] // elbow: arms float forward and out
const W: V3 = [0.262, 1.262, 0.395] // wrist
const HA = norm([-0.18, -0.24, 0.95]) // hand axis
const THUMB: V3 = [-0.45, 0.85, 0]
const HX = mul(norm(sub(THUMB, mul(HA, dot(THUMB, HA)))), -1)
const HN = cross(HX, HA) // palm normal: inward and down
const TIP = add(W, mul(HA, 0.19))
const H: V3 = [0.09, 0.925, 0.0] // hip
const K: V3 = [0.135, 0.6, 0.265] // knee: hips and knees bent
const A: V3 = [0.15, 0.195, 0.165] // ankle
const CALF = add(mix(K, A, 0.3), [0, 0, -0.022])
const HEEL = add(A, [0, -0.03, -0.015])
const TOE = add(A, [0.02, -0.11, 0.16])
const BC: V3 = [0, 0.93, 0.15] // the point of the body that sits at the world origin

// The two sides are not mirror images: the shader shifts the arm and the leg a little per side. These undo that for the
// near side (x > 0), so a point given on the mirrored limb lands on the limb as drawn.
const armTrue = (q: V3): V3 => [q[0], q[1] - 0.022, q[2] + 0.02]
const legTrue = (q: V3): V3 => {
  const lf = 1 - smooth(0.45, 0.88, q[1])
  return [q[0], q[1] + 0.02 * lf, q[2] - 0.045 * lf]
}

// organ lights, in the order of data.ts
const P_TT: V3 = [-0.012, 1.1, 0.03] // where the cosmic ray crossed (abdomen)
const P_BG: V3 = [0.03, 1.315, 0.045] // heart
const P_SC0 = armTrue(mix(E, W, 0.1))
const P_SC1 = armTrue(mix(E, W, 0.94)) // forearm vessel
const P_VS0 = legTrue(add(mix(H, K, 0.55), [-0.012, 0, -0.012]))
const P_VS1 = legTrue(add(K, [-0.008, -0.02, -0.03]))
const P_VS2 = legTrue(add(mix(K, A, 0.66), [0, 0, -0.016])) // leg vein
const P_BD: V3 = [0, 1.672, 0.028] // brain
const P_GM: V3 = [0.064, 1.628, 0.012] // inner ear

/** Where each check's button sits (body space). */
export const ORGANS: V3[] = [P_TT, P_BG, mix(P_SC0, P_SC1, 0.5), mix(P_VS1, P_VS2, 0.5), P_BD, P_GM]

const g = (v: V3) => `vec3(${v.map((x) => x.toFixed(5)).join(',')})`

const FRAG = (lite: boolean) => `#version 300 es
precision highp float;
${lite ? '#define LITE' : ''}
#define STEPS 56
#define INNER 11
uniform vec2 uRes;
uniform vec3 uRo,uF,uR,uU;
uniform float uFl;
uniform mat3 uW2B;
uniform vec3 uBob;
uniform float uT;
uniform vec3 uOrgA,uOrgB;
uniform vec3 uSwA,uSwB;
uniform vec3 uPl;
uniform vec2 uSun;
uniform vec3 uRayA,uRayB;
uniform vec3 uRay;
uniform sampler2D uText;
uniform float uTextOn;
uniform float uExpo;
out vec4 o;
#define ZERO int(min(uT,0.))

const vec3 S=${g(S)},E=${g(E)},W=${g(W)},TIP=${g(TIP)};
const vec3 HA=${g(HA)},HX=${g(HX)},HN=${g(HN)};
const vec3 H=${g(H)},K=${g(K)},A=${g(A)},CALF=${g(CALF)},HEEL=${g(HEEL)},TOE=${g(TOE)};
const vec3 BC=${g(BC)};
const vec3 P_TT=${g(P_TT)},P_BG=${g(P_BG)},P_SC0=${g(P_SC0)},P_SC1=${g(P_SC1)};
const vec3 P_VS0=${g(P_VS0)},P_VS1=${g(P_VS1)},P_VS2=${g(P_VS2)},P_BD=${g(P_BD)},P_GM=${g(P_GM)};
const vec3 C_TT=vec3(1.,.20,.60),C_BG=vec3(1.,.40,.10),C_SC=vec3(1.,.10,.13),C_VS=vec3(1.,.70,.13),C_BD=vec3(.16,.60,1.),C_GM=vec3(.72,.36,1.);
const vec3 SUN=vec3(1.,.86,.62);
const vec3 AQUA=vec3(.26,.82,.70);
const float IOR=1.36;
const vec3 ABSORB=vec3(3.,.9,1.3);
const float TEXTZ=.42;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float sdEll(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1e-5);}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float sdRC(vec3 p,vec3 a,vec3 b,float r1,float r2){
  vec3 ba=b-a;float l2=dot(ba,ba),rr=r1-r2,a2=l2-rr*rr,il2=1./l2;
  vec3 pa=p-a;float y=dot(pa,ba),z=y-l2;vec3 xv=pa*l2-ba*y;float x2=dot(xv,xv),y2=y*y*l2,z2=z*z*l2,k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-r2;
  if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1;}

float hand(vec3 q){
  vec3 v=q-W,l=vec3(dot(v,HX),dot(v,HA),dot(v,HN));
  float d=sdEll(l-vec3(0.,.048,0.),vec3(.039,.052,.0165));
  d=smin(d,sdEll(l-vec3(-.024,.034,.009),vec3(.017,.032,.016)),.012);
  /* the fingers as one soft relaxed mitten: separate fingers only sparkle as noise at this size */
  d=smin(d,sdEll(l-vec3(0.,.122,.016),vec3(.035,.05,.0155)),.02);
  float t=min(sdCap(l,vec3(-.034,.03,.012),vec3(-.052,.066,.03),.0108),sdCap(l,vec3(-.052,.066,.03),vec3(-.05,.096,.046),.0094));
  return smin(d,t,.01);}
float torso(vec3 p,vec3 q){
  float d=sdEll(p-vec3(0.,1.655,.035),vec3(.076,.098,.092));
  d=smin(d,sdEll(p-vec3(0.,1.596,.058),vec3(.058,.062,.062)),.04);
  d=smin(d,sdRC(p,vec3(0.,1.46,0.),vec3(0.,1.585,.022),.054,.047),.035);
  d=smin(d,sdRC(q,vec3(.02,1.495,-.012),vec3(.165,1.452,-.004),.052,.046),.05);
  d=smin(d,sdEll(p-vec3(0.,1.318,.004),vec3(.150,.168,.100)),.06);
  d=smin(d,sdEll(q-vec3(.068,1.352,.056),vec3(.074,.058,.050)),.05);
  d=smin(d,sdEll(p-vec3(0.,1.135,.010),vec3(.122,.150,.090)),.07);
  d=smin(d,sdEll(p-vec3(0.,.975,0.),vec3(.146,.105,.096)),.06);
  d=smin(d,sdEll(q-vec3(.066,.93,-.045),vec3(.078,.09,.07)),.04);
  d=smin(d,sdEll(q-vec3(.188,1.408,0.),vec3(.056,.072,.060)),.04);
  return d;}
float arm(vec3 q){
  float a=sdRC(q,S,E,.047,.037);
  a=smin(a,sdRC(q,E,W,.039,.025),.02);
  return smin(a,hand(q),.012);}
float leg(vec3 q){
  float l=sdRC(q,H,K,.083,.053);
  l=smin(l,sdRC(q,K,A,.050,.030),.035);
  l=smin(l,sdEll(q-CALF,vec3(.046,.09,.050)),.04);
  return smin(l,sdRC(q,HEEL,TOE,.036,.024),.03);}
/* the figure; each limb is skipped while its bounding capsules are farther than what is already found */
float body(vec3 p){
  float sx=p.x<0.?-1.:1.;
  vec3 q=vec3(abs(p.x),p.y,p.z);
  float d=torso(p,q);
  vec3 qa=q;qa.y+=sx*.022;qa.z-=sx*.02;
  float ba=min(sdCap(qa,S,E,.095),sdCap(qa,E,TIP,.085));
  if(ba<d+.03)d=smin(d,arm(qa),.03);
  vec3 ql=q;float lf=1.-smoothstep(.45,.88,p.y);ql.z+=sx*.045*lf;ql.y-=sx*.02*lf;
  float bl=min(min(sdCap(ql,H,K,.11),sdCap(ql,K,A,.085)),sdCap(ql,A,TOE,.065));
  if(bl<d+.04)d=smin(d,leg(ql),.04);
  return d;}
/* a loop the compiler cannot unroll, so body() is inlined once here instead of four times */
vec3 nrm(vec3 p){vec3 n=vec3(0.);
  for(int i=ZERO;i<4;i++){vec3 e=.5773*(2.*vec3(float(((i+3)>>1)&1),float((i>>1)&1),float(i&1))-1.);n+=e*body(p+e*.0014);}
  return normalize(n);}

/* the sky: deep dark, the lit limb of a great planet, the sun just behind its rim. s is in tangent space of the home view */
vec3 sky(vec3 rd,out float cov){
  vec2 s=rd.xy/max(-rd.z,.15);
  vec2 q=s-uPl.xy;float d=length(q)-uPl.z;
  vec2 e=s-uSun;float ds=length(e);
  float near=exp(-ds*ds/.10),near2=exp(-ds*ds/.010);
  cov=1.-smoothstep(-.0011,.0011,d);
  float dp=max(d,0.),di=max(-d,0.);
  vec3 lineC=mix(vec3(.08,.62,.50),vec3(1.,.90,.70),clamp(near2*.9+near*.12,0.,1.));
  /* outside the limb */
  vec3 co=vec3(.0005,.0013,.0017)+vec3(.0,.0030,.0034)*exp(-dp/.5);
  co+=vec3(.012,.16,.14)*exp(-dp/.10)*(.04+.55*near);
  co+=lineC*exp(-dp/.017)*(.07+1.0*near);
  co+=lineC*exp(-dp/.0034)*(.40+3.2*near);
  co+=SUN*(8.*exp(-ds/.0055)+1.3*exp(-ds/.028)+.20*exp(-ds/.13));
  vec2 nn=normalize(uSun-uPl.xy),tg=vec2(-nn.y,nn.x);
  co+=SUN*.55*exp(-abs(dot(e,nn))/.0032)*exp(-abs(dot(e,tg))/.20);
  vec2 gs=s*64.,id=floor(gs),f=fract(gs)-.5;
  float hs=hash(id);
  vec2 jt=(vec2(hash(id+7.3),hash(id+13.7))-.5)*.7;
  co+=vec3(.70,.86,.92)*step(.972,hs)*exp(-dot(f-jt,f-jt)*1100.)*(.25+.75*hash(id+3.1))*.55;
  /* the planet's night side: a lit crescent that fades into the dark (the terminator), faint cloud bands */
  float bands=.80+.20*sin((s.y*.9+s.x*.42)*74.+2.6*sin(s.x*11.+s.y*5.));
  vec3 ci=vec3(.0004,.0012,.0014);
  ci+=vec3(.022,.34,.27)*exp(-di/.026)*(.07+1.25*near)*bands;
  ci+=vec3(.006,.085,.075)*exp(-di/.15)*(.04+.50*near);
  ci+=SUN*(.55*exp(-ds/.018)+.07*exp(-ds/.09))*exp(-di/.022);
  vec3 c=mix(co,ci,cov);
  c+=lineC*exp(-abs(d)/.0011)*(.5+3.5*near);
  return c;}

float pg(vec3 ro,vec3 rd,vec3 c,float r,float tm){vec3 v=c-ro;float t=clamp(dot(v,rd),0.,tm);vec3 e=v-rd*t;return exp(-dot(e,e)/(r*r));}
float eg(vec3 ro,vec3 rd,vec3 c,vec3 r,float tm){vec3 v=(c-ro)/r,d=rd/r;float t=clamp(dot(v,d)/dot(d,d),0.,tm);vec3 e=v-d*t;return exp(-dot(e,e));}
/* squared distance between a ray and a segment, and where along the segment */
vec2 sgd(vec3 ro,vec3 rd,vec3 a,vec3 b,float tm){
  vec3 v=b-a,w=ro-a;float bb=dot(rd,v),cc=dot(v,v),dd=dot(rd,w),ee=dot(v,w);
  float sN=clamp((ee-bb*dd)/max(cc-bb*bb,1e-7),0.,1.);
  vec3 c=a+v*sN;float t=clamp(dot(c-ro,rd),0.,tm);vec3 e=ro+rd*t-c;return vec2(dot(e,e),sN);}
float segd2(vec3 p,vec3 a,vec3 b){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);vec3 e=pa-ba*h;return dot(e,e);}
float rayProf(float sN){
  float tr=step(sN,uRay.x)*exp(-(uRay.x-sN)/.42)*uRay.y;
  return (tr+uRay.z)*smoothstep(0.,.28,sN)*(1.-smoothstep(.72,1.,sN));}
vec3 rayGlow(vec2 l){return (vec3(1.,.74,.88)*exp(-l.x/3.2e-5)+C_TT*.30*exp(-l.x/7e-4))*rayProf(l.y);}

/* the six lanterns, accumulated along the ray inside the glass */
vec3 organs(vec3 ro,vec3 rd,float tm){
  vec3 L=vec3(0.);float v;
  /* where the cosmic ray crossed: a small hot star */
  v=pg(ro,rd,P_TT,.012*uSwA.x,tm)+.2*pg(ro,rd,P_TT,.036*uSwA.x,tm);
  L+=C_TT*v*2.*uOrgA.x;
  L+=rayGlow(sgd(ro,rd,uRayA,uRayB,tm))*1.5;
  /* the heart */
  v=pg(ro,rd,P_BG,.021*uSwA.y,tm)+.2*pg(ro,rd,P_BG,.05*uSwA.y,tm);
  L+=C_BG*v*1.8*uOrgA.y;
  /* the forearm vessel, cells flowing along it */
  vec2 l=sgd(ro,rd,P_SC0,P_SC1,tm);float w2=uSwA.z*uSwA.z;
  L+=C_SC*(exp(-l.x/(2.4e-5*w2))*(.55+.55*sin(l.y*34.-uT*5.))+.13*exp(-l.x/(2.6e-4*w2)))*2.1*uOrgA.z;
  /* the leg vein */
  float dv=min(sgd(ro,rd,P_VS0,P_VS1,tm).x,sgd(ro,rd,P_VS1,P_VS2,tm).x);w2=uSwB.x*uSwB.x;
  L+=C_VS*(exp(-dv/(2.6e-5*w2))+.13*exp(-dv/(2.8e-4*w2)))*1.9*uOrgB.x;
  /* the brain: two soft lobes */
  vec3 rb=vec3(.021,.025,.033)*uSwB.y;
  v=eg(ro,rd,P_BD+vec3(.019,0.,0.),rb,tm)+eg(ro,rd,P_BD-vec3(.019,0.,0.),rb,tm);
  v=min(v,1.)+.16*pg(ro,rd,P_BD,.06*uSwB.y,tm);
  L+=C_BD*v*2.2*uOrgB.y;
  /* the inner ear */
  v=pg(ro,rd,P_GM,.014*uSwB.z,tm)+.3*pg(ro,rd,P_GM,.034*uSwB.z,tm);
  L+=C_GM*v*3.2*uOrgB.z;
  return L;}
/* their soft glow on the inner surface of the glass */
vec3 caustic(vec3 p){
  vec3 L=C_TT*uOrgA.x*exp(-dot(p-P_TT,p-P_TT)/.004);
  L+=C_BG*uOrgA.y*exp(-dot(p-P_BG,p-P_BG)/.006);
  L+=C_SC*uOrgA.z*exp(-segd2(p,P_SC0,P_SC1)/.0011);
  L+=C_VS*uOrgB.x*exp(-min(segd2(p,P_VS0,P_VS1),segd2(p,P_VS1,P_VS2))/.0015);
  L+=C_BD*uOrgB.y*exp(-dot(p-P_BD,p-P_BD)/.004);
  L+=C_GM*uOrgB.z*exp(-dot(p-P_GM,p-P_GM)/.0012);
  return L;}

void main(){
  vec2 s=(2.*gl_FragCoord.xy-uRes)/uRes.y;
  vec3 rd=normalize(uF*uFl+uR*s.x+uU*s.y);
  float cov,c2;
  vec3 col=sky(rd,cov);
  float alpha=cov;
  float dsun=length(rd.xy/max(-rd.z,.15)-uSun);
  vec3 rob=uW2B*(uRo-uBob)+BC,rdb=uW2B*rd;
  vec3 rs=mix(rdb,vec3(1e-5),lessThan(abs(rdb),vec3(1e-5)));
  vec3 bmin=vec3(-.47,0.,-.25),bmax=vec3(.47,1.80,.71);
  vec3 iv=1./rs,t0=(bmin-rob)*iv,t1=(bmax-rob)*iv,tn=min(t0,t1),tf=max(t0,t1);
  float tN=max(max(tn.x,tn.y),max(tn.z,0.)),tF=min(min(tf.x,tf.y),tf.z);
  float pix=2./(uFl*uRes.y);
  float t=tN,dmin=1e9,dl=1.;bool hit=false;
  if(tF>tN){
    for(int i=ZERO;i<STEPS;i++){
      float d=body(rob+rdb*t);dl=d;
      dmin=min(dmin,d/(t*pix));
      if(d<.0005*t){hit=true;break;}
      t+=d*.92;if(t>tF)break;
    }
    /* a ray that ran out of steps while grazing a crease still counts, or creases show pin holes */
    if(!hit&&t<tF&&dl<.004)hit=true;
  }
  if(hit){
    vec3 p1=rob+rdb*t,n1=nrm(p1);
    float ndv=clamp(dot(n1,-rdb),0.,1.);
    float fr=.035+.965*pow(1.-ndv,4.5);
    vec3 refl=sky(reflect(rdb,n1)*uW2B,c2);
    /* the ray bends in, crosses the glass, bends out */
    vec3 r2=refract(rdb,n1,1./IOR);
    vec3 pin=p1-n1*.006;float th=0.;
    for(int i=ZERO;i<INNER;i++){float d=-body(pin+r2*th);if(d<.0015)break;th+=max(d,.008);if(th>.8)break;}
    vec3 p2=pin+r2*th,n2=nrm(p2);
    vec3 r3=refract(r2,-n2,IOR);
    if(dot(r3,r3)<.5)r3=reflect(r2,-n2);
    vec3 r3w=r3*uW2B;
    /* the bent view, mixed with a little of the straight one: clear glass, and sharp creases do not speckle */
    vec3 tr=mix(sky(r3w,c2),col,.34);
    /* the name behind the figure, seen bent through the glass (only where the bend is gentle, so it never scatters) */
    if(uTextOn>0.&&r3w.z<-.08){
      vec3 pw=(p2-BC)*uW2B+uBob;
      vec3 hp=pw+r3w*((-TEXTZ-pw.z)/min(r3w.z,-.08));
      vec3 v=hp-uRo;float zc=max(dot(v,uF),.01);
      vec2 uv=vec2(dot(v,uR)*uRes.y/uRes.x,dot(v,uU))*uFl/zc*.5+.5;
      float dev=length((uv-gl_FragCoord.xy/uRes)*vec2(uRes.x/uRes.y,1.));
      float ok=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.)*(1.-smoothstep(.025,.07,dev));
      tr+=vec3(.30,.36,.34)*textureLod(uText,clamp(uv,0.,1.),0.).r*uTextOn*ok;
    }
    vec3 T=exp(-ABSORB*th);
    float tm=th+.03;
    vec3 lamp=organs(pin,r2,tm);
    vec3 cau=caustic(p1)*.07+caustic(p2)*.05;
    /* light held in the thickness of the glass, warmer toward the sun */
    float sunN=exp(-dsun/.24);
    vec3 hold=(vec3(.05,.42,.34)*(.03+.22*sunN)+SUN*.12*sunN)*(1.-exp(-th*6.));
    /* the hard rim on the sun's side, a cool rim all round, a sharp sun glint, planet-shine from below */
    vec3 toSun=uW2B*normalize(vec3(uSun,-1.2));
    float sside=smoothstep(-.2,.75,dot(n1,toSun));
    float edge=pow(1.-ndv,3.);
    float sp=max(dot(reflect(rdb,n1),toSun),0.);
    vec3 rim=AQUA*edge*.34+SUN*edge*sside*(1.5+2.4*sunN)+SUN*(pow(sp,260.)*5.+pow(sp,24.)*.12);
    float shine=max(dot(n1,uW2B*vec3(-.30,-.88,-.36))*.5+.5,0.);
    vec3 fill=vec3(.03,.30,.25)*shine*shine*.045;
    col=tr*T*(1.-fr)+refl*fr+rim+fill+hold+lamp+cau;
    alpha=1.;
  }else{
    float rimc=1.-smoothstep(.15,1.6,dmin);
    col+=(AQUA*.30+SUN*1.3*exp(-dsun/.22))*rimc;
    alpha=max(alpha,rimc*.75);
    col+=rayGlow(sgd(rob,rdb,uRayA,uRayB,30.))*.8;
  }
  col=min(max(col,vec3(0.)),vec3(12.)); /* D3D max/min drop a NaN, so a bad sample can never blank the figure */
  col=1.-exp(-col*1.55*uExpo);
  col=pow(col,vec3(.4545));
  col+=(hash(gl_FragCoord.xy+fract(uT)*61.)-.5)/255.;
  o=vec4(col,alpha);
}`

const VERT = `#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`

const UNIFORMS = ['uRes', 'uRo', 'uF', 'uR', 'uU', 'uFl', 'uW2B', 'uBob', 'uT', 'uOrgA', 'uOrgB', 'uSwA', 'uSwB', 'uPl', 'uSun', 'uRayA', 'uRayB', 'uRay', 'uText', 'uTextOn', 'uExpo'] as const
type UName = (typeof UNIFORMS)[number]

export interface Cam {
  ro: V3
  f: V3
  r: V3
  u: V3
  fl: number
}
export interface Frame {
  cam: Cam
  /** body-to-world rotation (row-major) and the body's drift */
  b: M3
  bob: V3
  t: number
  org: Float32Array
  sw: Float32Array
  planet: V3
  sun: [number, number]
  rayA: V3
  rayB: V3
  ray: V3
  textOn: number
  expo: number
}

export function lookAt(ro: V3, target: V3, fl: number): Cam {
  const f = norm(sub(target, ro))
  const r = norm(cross(f, [0, 1, 0]))
  return { ro, f, r, u: cross(r, f), fl }
}

/** Body-to-world rotation: turn (yaw), then roll, then lean back. */
export function bodyMatrix(yaw: number, lean: number, roll: number): M3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cz = Math.cos(roll), sz = Math.sin(roll), cx = Math.cos(lean), sx = Math.sin(lean)
  // Ry * Rz * Rx
  const a: M3 = [cy * cz, -cy * sz, sy, sz, cz, 0, -sy * cz, sy * sz, cy]
  return [a[0], a[1] * cx + a[2] * sx, -a[1] * sx + a[2] * cx, a[3], a[4] * cx + a[5] * sx, -a[4] * sx + a[5] * cx, a[6], a[7] * cx + a[8] * sx, -a[7] * sx + a[8] * cx]
}
export function toWorld(b: M3, p: V3, bob: V3): V3 {
  const x = p[0] - BC[0], y = p[1] - BC[1], z = p[2] - BC[2]
  return [b[0] * x + b[1] * y + b[2] * z + bob[0], b[3] * x + b[4] * y + b[5] * z + bob[1], b[6] * x + b[7] * y + b[8] * z + bob[2]]
}
/** A world direction or offset in body space. */
export function toBodyDir(b: M3, v: V3): V3 {
  return [b[0] * v[0] + b[3] * v[1] + b[6] * v[2], b[1] * v[0] + b[4] * v[1] + b[7] * v[2], b[2] * v[0] + b[5] * v[1] + b[8] * v[2]]
}
export function toBody(b: M3, p: V3, bob: V3): V3 {
  return add(toBodyDir(b, sub(p, bob)), BC)
}
/** World point to CSS pixels in a view of w x h. */
export function project(cam: Cam, p: V3, w: number, h: number): [number, number, number] {
  const v = sub(p, cam.ro)
  const z = dot(v, cam.f)
  const k = (cam.fl / Math.max(z, 0.01)) * (h / 2)
  return [w / 2 + dot(v, cam.r) * k, h / 2 - dot(v, cam.u) * k, z]
}

export class GlassScene {
  private gl: WebGL2RenderingContext
  private prog: WebGLProgram
  private buf: WebGLBuffer
  private vao: WebGLVertexArrayObject
  private tex: WebGLTexture
  private u = {} as Record<UName, WebGLUniformLocation | null>
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, lite: boolean) {
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
    if (!gl) throw new Error('no WebGL2')
    this.gl = gl
    this.canvas = canvas
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader failed')
      return s
    }
    const prog = gl.createProgram()!
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, FRAG(lite))
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed')
    this.prog = prog
    gl.useProgram(prog)
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    this.buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const n of UNIFORMS) this.u[n] = gl.getUniformLocation(prog, n)
    this.tex = gl.createTexture()!
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(this.u.uText, 0)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
  }

  /** The name as a white-on-black picture of the whole view; the glass samples it for the bent letters. */
  setText(src: HTMLCanvasElement) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  }

  resize(w: number, h: number) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.gl.viewport(0, 0, w, h)
  }

  draw(f: Frame) {
    const gl = this.gl, u = this.u, c = f.cam
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height)
    gl.uniform3f(u.uRo, c.ro[0], c.ro[1], c.ro[2])
    gl.uniform3f(u.uF, c.f[0], c.f[1], c.f[2])
    gl.uniform3f(u.uR, c.r[0], c.r[1], c.r[2])
    gl.uniform3f(u.uU, c.u[0], c.u[1], c.u[2])
    gl.uniform1f(u.uFl, c.fl)
    // the world-to-body matrix is the transpose of b; GLSL reads columns, so b's rows go in as they are
    gl.uniformMatrix3fv(u.uW2B, false, f.b)
    gl.uniform3f(u.uBob, f.bob[0], f.bob[1], f.bob[2])
    gl.uniform1f(u.uT, f.t)
    gl.uniform3f(u.uOrgA, f.org[0], f.org[1], f.org[2])
    gl.uniform3f(u.uOrgB, f.org[3], f.org[4], f.org[5])
    gl.uniform3f(u.uSwA, f.sw[0], f.sw[1], f.sw[2])
    gl.uniform3f(u.uSwB, f.sw[3], f.sw[4], f.sw[5])
    gl.uniform3f(u.uPl, f.planet[0], f.planet[1], f.planet[2])
    gl.uniform2f(u.uSun, f.sun[0], f.sun[1])
    gl.uniform3f(u.uRayA, f.rayA[0], f.rayA[1], f.rayA[2])
    gl.uniform3f(u.uRayB, f.rayB[0], f.rayB[1], f.rayB[2])
    gl.uniform3f(u.uRay, f.ray[0], f.ray[1], f.ray[2])
    gl.uniform1f(u.uTextOn, f.textOn)
    gl.uniform1f(u.uExpo, f.expo)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose() {
    const gl = this.gl
    gl.deleteTexture(this.tex)
    gl.deleteBuffer(this.buf)
    gl.deleteVertexArray(this.vao)
    gl.deleteProgram(this.prog)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

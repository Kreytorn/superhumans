const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./Module-Deonyzcr.js","./rolldown-runtime-XKyaHtl9.js","./index-D3qVPW5J.js","./index-CvU9-K1k.css","./ArrowLeft.es-DYYiPEul.js","./IconBase.es-DBEeWzR9.js","./ArrowRight.es-BSy5iAHK.js","./Play.es-ChymBqjc.js","./spikecount-DVce7RGm.js","./client-CD6l6M49.js","./tracktrace-B3Z8TVj3.js","./tracktrace-CFLwFIW8.js","./tracktrace-B8tYtE4W.css","./bubblegrade-BmPWx0Me.js","./bubblegrade-Ty8Jirxm.js","./bubblegrade-BG81yi9O.css","./newsreader-In2980oI.css","./geist-mono-C5knphS1.css","./veinsqueeze-CMLEZ5tp.js","./honesty-D1yHS4ET.js","./veinsqueeze-BJSarZNv.css","./instrument-sans-BkCNIqpb.css","./braindrift-D2wCYiXR.js","./braindrift-DFimSZpn.js","./three.module-DS1lwPcu.js","./braindrift-B_i9pn98.css","./garnmeter-1cT-Z-yF.js","./garnmeter-DB8lqCrR.css","./spline-sans-mono-BSXwSnXg.css"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";/* empty css             *//* empty css                   */import{i as n,n as r,r as i,s as a,t as o}from"./index-D3qVPW5J.js";import{t as s}from"./ArrowRight.es-BSy5iAHK.js";var c=t(a(),1),l=`./`,u=[{id:`tracktrace`,n:`01`,name:`TrackTrace`,sentence:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,organ:`Cosmic ray`,hue:`#ff5cb8`,img:`${l}_posters/tracktrace.jpg`,aspect:1.6,crop:[.012,.275,.272],side:`r`},{id:`bubblegrade`,n:`02`,name:`BubbleGrade`,sentence:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,organ:`Heart`,hue:`#ff9447`,img:`${l}_posters/bubblegrade.jpg`,aspect:1.6,crop:[.3,.19,.5],side:`r`},{id:`spikecount`,n:`03`,name:`SpikeCount`,sentence:`Every red blood cell, outlined. The spiky ones, counted.`,organ:`Blood`,hue:`#ff5a5f`,img:`${l}spikecount/fields/96.png`,aspect:1,crop:[.08,.2,.74],side:`l`},{id:`veinsqueeze`,n:`04`,name:`VeinSqueeze`,sentence:`A clot is a vein that won’t squash.`,organ:`Leg vein`,hue:`#ffd257`,img:`${l}_posters/veinsqueeze.jpg`,aspect:1.6,crop:[.085,.13,.4],side:`r`},{id:`braindrift`,n:`05`,name:`BrainDrift`,sentence:`In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.`,organ:`Brain`,hue:`#5cc8ff`,img:`${l}_posters/braindrift_portrait.jpg`,aspect:.75,crop:[0,.14,1],side:`r`},{id:`garnmeter`,n:`06`,name:`Garn Meter`,sentence:`Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.`,organ:`Inner ear`,hue:`#a99cff`,img:`${l}_posters/garnmeter.jpg`,aspect:1.6,crop:[.02,.02,.37],invert:!0,side:`r`}],d=`Six AI health checks for astronauts, running in your browser.`;function ee(e){return u.find(t=>t.id===e)}function f(e){let[t,n,r]=e.crop,i=r*e.aspect,a=r>=1?0:t/(1-r)*100,o=i>=1?0:n/(1-i)*100;return{backgroundImage:`url(${e.img})`,backgroundSize:`${100/r}% ${100/i}%`,backgroundPosition:`${a}% ${o}%`,...e.invert?{filter:`invert(1) hue-rotate(180deg) brightness(0.92)`}:{}}}var p=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],m=(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],h=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],g=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],_=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],v=e=>h(e,1/Math.hypot(e[0],e[1],e[2])),y=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n],b=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)},x={sub:p,add:m,mul:h,dot:g,cross:_,norm:v,mix:y},S=[.198,1.4,0],C=[.318,1.205,.15],w=[.262,1.262,.395],T=v([-.18,-.24,.95]),E=[-.45,.85,0],D=h(v(p(E,h(T,g(E,T)))),-1),O=_(D,T),k=m(w,h(T,.19)),A=[.09,.925,0],j=[.135,.6,.265],M=[.15,.195,.165],te=m(y(j,M,.3),[0,0,-.022]),N=m(M,[0,-.03,-.015]),P=m(M,[.02,-.11,.16]),F=[0,.93,.15],I=e=>[e[0],e[1]-.022,e[2]+.02],L=e=>{let t=1-b(.45,.88,e[1]);return[e[0],e[1]+.02*t,e[2]-.045*t]},R=[-.012,1.1,.03],z=[.03,1.315,.045],B=I(y(C,w,.1)),V=I(y(C,w,.94)),H=L(m(y(A,j,.55),[-.012,0,-.012])),U=L(m(j,[-.008,-.02,-.03])),W=L(m(y(j,M,.66),[0,0,-.016])),ne=[0,1.672,.028],G=[.064,1.628,.012],re=[R,z,y(B,V,.5),y(U,W,.5),ne,G],K=e=>`vec3(${e.map(e=>e.toFixed(5)).join(`,`)})`,ie=e=>`#version 300 es
precision highp float;
${e?`#define LITE`:``}
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

const vec3 S=${K(S)},E=${K(C)},W=${K(w)},TIP=${K(k)};
const vec3 HA=${K(T)},HX=${K(D)},HN=${K(O)};
const vec3 H=${K(A)},K=${K(j)},A=${K(M)},CALF=${K(te)},HEEL=${K(N)},TOE=${K(P)};
const vec3 BC=${K(F)};
const vec3 P_TT=${K(R)},P_BG=${K(z)},P_SC0=${K(B)},P_SC1=${K(V)};
const vec3 P_VS0=${K(H)},P_VS1=${K(U)},P_VS2=${K(W)},P_BD=${K(ne)},P_GM=${K(G)};
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
}`,q=`#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`,ae=[`uRes`,`uRo`,`uF`,`uR`,`uU`,`uFl`,`uW2B`,`uBob`,`uT`,`uOrgA`,`uOrgB`,`uSwA`,`uSwB`,`uPl`,`uSun`,`uRayA`,`uRayB`,`uRay`,`uText`,`uTextOn`,`uExpo`];function oe(e,t,n){let r=v(p(t,e)),i=v(_(r,[0,1,0]));return{ro:e,f:r,r:i,u:_(i,r),fl:n}}function se(e,t,n){let r=Math.cos(e),i=Math.sin(e),a=Math.cos(n),o=Math.sin(n),s=Math.cos(t),c=Math.sin(t),l=[r*a,-r*o,i,o,a,0,-i*a,i*o,r];return[l[0],l[1]*s+l[2]*c,-l[1]*c+l[2]*s,l[3],l[4]*s+l[5]*c,-l[4]*c+l[5]*s,l[6],l[7]*s+l[8]*c,-l[7]*c+l[8]*s]}function ce(e,t,n){let r=t[0]-F[0],i=t[1]-F[1],a=t[2]-F[2];return[e[0]*r+e[1]*i+e[2]*a+n[0],e[3]*r+e[4]*i+e[5]*a+n[1],e[6]*r+e[7]*i+e[8]*a+n[2]]}function le(e,t){return[e[0]*t[0]+e[3]*t[1]+e[6]*t[2],e[1]*t[0]+e[4]*t[1]+e[7]*t[2],e[2]*t[0]+e[5]*t[1]+e[8]*t[2]]}function ue(e,t,n,r){let i=p(t,e.ro),a=g(i,e.f),o=e.fl/Math.max(a,.01)*(r/2);return[n/2+g(i,e.r)*o,r/2-g(i,e.u)*o,a]}var J=class{gl;prog;buf;vao;tex;u={};canvas;constructor(e,t){let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:`high-performance`});if(!n)throw Error(`no WebGL2`);this.gl=n,this.canvas=e;let r=(e,t)=>{let r=n.createShader(e);if(n.shaderSource(r,t),n.compileShader(r),!n.getShaderParameter(r,n.COMPILE_STATUS))throw Error(n.getShaderInfoLog(r)??`shader failed`);return r},i=n.createProgram(),a=r(n.VERTEX_SHADER,q),o=r(n.FRAGMENT_SHADER,ie(t));if(n.attachShader(i,a),n.attachShader(i,o),n.linkProgram(i),n.deleteShader(a),n.deleteShader(o),!n.getProgramParameter(i,n.LINK_STATUS))throw Error(n.getProgramInfoLog(i)??`link failed`);this.prog=i,n.useProgram(i),this.vao=n.createVertexArray(),n.bindVertexArray(this.vao),this.buf=n.createBuffer(),n.bindBuffer(n.ARRAY_BUFFER,this.buf),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),n.STATIC_DRAW);let s=n.getAttribLocation(i,`p`);n.enableVertexAttribArray(s),n.vertexAttribPointer(s,2,n.FLOAT,!1,0,0);for(let e of ae)this.u[e]=n.getUniformLocation(i,e);this.tex=n.createTexture(),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,this.tex),n.texImage2D(n.TEXTURE_2D,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.uniform1i(this.u.uText,0),n.disable(n.DEPTH_TEST),n.disable(n.BLEND)}setText(e){let t=this.gl;t.bindTexture(t.TEXTURE_2D,this.tex),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,e),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!1)}resize(e,t){(this.canvas.width!==e||this.canvas.height!==t)&&(this.canvas.width=e,this.canvas.height=t),this.gl.viewport(0,0,e,t)}draw(e){let t=this.gl,n=this.u,r=e.cam;t.uniform2f(n.uRes,this.canvas.width,this.canvas.height),t.uniform3f(n.uRo,r.ro[0],r.ro[1],r.ro[2]),t.uniform3f(n.uF,r.f[0],r.f[1],r.f[2]),t.uniform3f(n.uR,r.r[0],r.r[1],r.r[2]),t.uniform3f(n.uU,r.u[0],r.u[1],r.u[2]),t.uniform1f(n.uFl,r.fl),t.uniformMatrix3fv(n.uW2B,!1,e.b),t.uniform3f(n.uBob,e.bob[0],e.bob[1],e.bob[2]),t.uniform1f(n.uT,e.t),t.uniform3f(n.uOrgA,e.org[0],e.org[1],e.org[2]),t.uniform3f(n.uOrgB,e.org[3],e.org[4],e.org[5]),t.uniform3f(n.uSwA,e.sw[0],e.sw[1],e.sw[2]),t.uniform3f(n.uSwB,e.sw[3],e.sw[4],e.sw[5]),t.uniform3f(n.uPl,e.planet[0],e.planet[1],e.planet[2]),t.uniform2f(n.uSun,e.sun[0],e.sun[1]),t.uniform3f(n.uRayA,e.rayA[0],e.rayA[1],e.rayA[2]),t.uniform3f(n.uRayB,e.rayB[0],e.rayB[1],e.rayB[2]),t.uniform3f(n.uRay,e.ray[0],e.ray[1],e.ray[2]),t.uniform1f(n.uTextOn,e.textOn),t.uniform1f(n.uExpo,e.expo),t.drawArrays(t.TRIANGLES,0,3)}dispose(){let e=this.gl;e.deleteTexture(this.tex),e.deleteBuffer(this.buf),e.deleteVertexArray(this.vao),e.deleteProgram(this.prog),e.getExtension(`WEBGL_lose_context`)?.loseContext()}},Y=()=>o(()=>import(`./Module-Deonyzcr.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9]),import.meta.url),de={tracktrace:()=>o(()=>import(`./tracktrace-B3Z8TVj3.js`).then(e=>e.n),__vite__mapDeps([10,1,2,3,11,9,12]),import.meta.url),bubblegrade:()=>o(()=>import(`./bubblegrade-BmPWx0Me.js`).then(e=>e.n),__vite__mapDeps([13,1,2,3,14,9,15,16,17]),import.meta.url),veinsqueeze:()=>o(()=>import(`./veinsqueeze-CMLEZ5tp.js`).then(e=>e.r),__vite__mapDeps([18,1,2,3,9,19,20,21,17]),import.meta.url),braindrift:()=>o(()=>import(`./braindrift-D2wCYiXR.js`).then(e=>e.n),__vite__mapDeps([22,1,2,3,23,9,24,25,21,17]),import.meta.url),garnmeter:()=>o(()=>import(`./garnmeter-1cT-Z-yF.js`).then(e=>e.n),__vite__mapDeps([26,1,2,3,9,27,28]),import.meta.url),spikecount:()=>o(()=>import(`./spikecount-DVce7RGm.js`).then(e=>e.d),__vite__mapDeps([8,1,9]),import.meta.url)},X=new Set;function fe(e){X.has(e)||(X.add(e),Y().catch(()=>X.delete(e)),de[e]?.().catch(()=>X.delete(e)))}var Z=r(),pe=`./`,me=1150,he=.4,Q=2.6,ge=x.norm([.55,-.8,.22]),_e=1.15,ve=7.5,ye={id:null},be={dist:4.3,fl:4.165,eye:-.035,planet:[-.725,-2.405,2.4],sunX:-.15,yaw:-.5},xe={dist:7.4,fl:4.165,eye:-.235,planet:[-.36,-1.607,1.6],sunX:-.062,yaw:-.5},Se=-.33,Ce=.05,$=e=>e<0?0:e>1?1:e,we=e=>1-(1-$(e))**3,Te=e=>{let t=$(e);return t<.5?4*t*t*t:1-(-2*t+2)**3/2},Ee=(e,t,n)=>{let r=$((n-e)/(t-e));return r*r*(3-2*r)};function De(e,t,n,r,i){let a=.5,o=document.createElement(`canvas`);o.width=Math.max(2,Math.round(r*a)),o.height=Math.max(2,Math.round(i*a));let s=o.getContext(`2d`);s.fillStyle=`#000`,s.fillRect(0,0,o.width,o.height);let c=getComputedStyle(e),l=parseFloat(c.fontSize);s.font=`${c.fontWeight} expanded ${l*a}px ${c.fontFamily}`;let u=parseFloat(c.letterSpacing);Number.isFinite(u)&&(s.letterSpacing=`${u*a}px`),s.textBaseline=`alphabetic`,s.fillStyle=`#fff`;let d=e.getBoundingClientRect(),ee=t.getBoundingClientRect();return s.fillText(e.textContent??``,(d.left-n.left)*a,(ee.bottom-n.top)*a),o}function Oe({from:e,still:t}){let r=(0,c.useRef)(null),a=(0,c.useRef)(null),o=(0,c.useRef)(null),l=(0,c.useRef)(null),ee=(0,c.useRef)([]),p=u.findIndex(t=>t.id===e),[m,h]=(0,c.useState)(p>=0?p:0),[g,_]=(0,c.useState)(!1),[v,y]=(0,c.useState)(!0),[b,x]=(0,c.useState)(p>=0?p:null),S=(0,c.useRef)({focus:p>=0?p:0,hover:-1,touched:0,reduce:!1,dive:null});(0,c.useEffect)(()=>{let e=r.current,s=a.current,c=S.current,d=matchMedia(`(prefers-reduced-motion: reduce)`).matches;c.reduce=d;let f=matchMedia(`(pointer: coarse)`).matches||window.innerWidth<700;c.dive=p>=0&&!d?{i:p,t0:performance.now(),out:!0,ui:!1}:null,p>=0&&d&&x(null);let m=document.createElement(`canvas`);m.className=`v02-gl`,m.setAttribute(`aria-hidden`,`true`),s.appendChild(m);let g=null;try{g=new J(m,f)}catch(e){console.warn(`[V02] WebGL scene unavailable, showing the still:`,e),y(!1)}let v=e=>{e.preventDefault(),g=null,y(!1)};m.addEventListener(`webglcontextlost`,v);let b=0,C=0,w=be,T=1,E=0,D=[0,0],O=()=>{if(b=e.clientWidth,C=e.clientHeight,!b||!C)return;w=b/C<.8?xe:be;let t=w.sunX-w.planet[0];D[0]=w.sunX,D[1]=w.planet[1]+Math.sqrt(w.planet[2]*w.planet[2]-t*t)+.0025;let n=Math.min(window.devicePixelRatio||1,1.25),r=(b*C*n*n>175e4?1:n)*T;g?.resize(Math.round(b*r),Math.round(C*r)),A()},k=!1,A=()=>{let t=o.current,n=l.current;if(!t||!n||!b)return;let r=document.createElement(`canvas`).getContext(`2d`);if(r){r.font=`800 expanded 100px "Archivo Variable"`,r.letterSpacing=`-3px`;let e=r.measureText(`SuperHumans`).width/100,n=b-(w===xe?40:2*Math.max(40,Math.min(72,b*.05)));e>0&&(t.style.fontSize=`${(n/e).toFixed(1)}px`)}e.style.setProperty(`--wb`,`${Math.round(t.getBoundingClientRect().bottom-e.getBoundingClientRect().top)}px`),g&&k&&(g.setText(De(t,n,e.getBoundingClientRect(),b,C)),E=1)},j=new ResizeObserver(O);j.observe(e),O(),document.fonts.load(`800 100px "Archivo Variable"`).then(()=>document.fonts.ready).then(()=>{k=!0,A()}).catch(()=>{});let M=0,te=0,N=0,P=0,F=e=>{e.pointerType===`mouse`&&b&&(M=e.clientX/b*2-1,te=e.clientY/C*2-1)};e.addEventListener(`pointermove`,F);let I=new Float32Array(6),L=new Float32Array(6).fill(1),R={cam:oe([0,0,4],[0,0,0],w.fl),b:se(0,0,0),bob:[0,0,0],t:0,org:new Float32Array(6),sw:new Float32Array(6),planet:w.planet,sun:D,rayA:[0,0,0],rayB:[0,0,0],ray:[0,0,0],textOn:0,expo:1},z=d||p>=0||t,B=performance.now(),V=B,H=0,U=0,W=!1,ne=-1,G=0,K=0,ie=r=>{if(H=requestAnimationFrame(ie),document.hidden||!b){V=r;return}let a=Math.min(.25,(r-V)/1e3);V=r;let o=(r-B)/1e3,s=t||!g,l=s||d?Q:z?o+Q:o,f=0,p=-1,m=c.dive;if(m){let e=$((r-m.t0)/me);if(p=m.i,f=m.out?1-e:e,m.out&&e>.45&&!m.ui&&(m.ui=!0,x(null)),e>=1){if(m.out)c.dive=null,n(`from`,void 0);else{cancelAnimationFrame(H),ye.id=u[m.i].id,i(`proto/V02/${u[m.i].id}`);return}}}let h=z?1:we(o/1.6);N+=(M-N)*(1-Math.exp(-a*2.5)),P+=(te-P)*(1-Math.exp(-a*2.5));let v=s||d?0:1,y=se(w.yaw+v*(.15*Math.sin((l-Q)*.17)+N*.24),Se+v*(.03*Math.sin((l-Q)*.23)+P*.06),Ce+v*.025*Math.sin((l-Q)*.19));R.b=y,R.bob[1]=v*.014*Math.sin((l-Q)*.6);let S=0,D=w.eye,k=w.dist*(1+.13*(1-h)),A=0,j=w.eye,F=0;if(p>=0&&f>0){let e=ce(y,re[p],R.bob),t=Te(f),n=S-e[0],r=D-e[1],i=k-e[2],a=Math.hypot(n,r,i),o=a*(he/a)**+t/a;S=e[0]+n*o,D=e[1]+r*o,k=e[2]+i*o;let s=we(f*1.5);A+=(e[0]-A)*s,j+=(e[1]-j)*s,F+=(e[2]-F)*s}let q=oe([S,D,k],[A,j,F],w.fl);R.cam=q;let ae=c.hover>=0?c.hover:c.focus;for(let e=0;e<6;e++){let t=z?1:$((o-.4-e*.11)/.5),n=(e===ae?2.3:.92)*t,r=e===ae?1.36:1;p>=0&&(e===p?(n=2.3+10*f*f,r=1.36+2.8*f*f):n*=1-.85*f);let i=1-Math.exp(-a*(p>=0?40:7));I[e]+=(n-I[e])*i,L[e]+=(r-L[e])*i,R.org[e]=I[e],R.sw[e]=L[e]}let J=l*1.05%1,Y=s||d?.3:Math.exp(-J*9)+(J>.2?.55*Math.exp(-(J-.2)*9):0);R.org[1]*=1+.4*Y,R.sw[1]*=1+.15*Y;let de=le(y,ge),X=re[0];for(let e=0;e<3;e++)R.rayA[e]=X[e]-de[e]*1.05,R.rayB[e]=X[e]+de[e]*1.05;if(l<_e)R.ray[0]=0,R.ray[1]=0,R.ray[2]=0;else{let e=s||d?1.2:(l-_e)%ve;R.ray[0]=$(e/.42),R.ray[1]=e<.42?1:Math.exp(-(e-.42)/.9),R.ray[2]=(.2+.85*Math.exp(-Math.max(e-.2,0)/2.6))*Ee(.12,.42,e),l-_e>ve&&(R.ray[2]=Math.max(R.ray[2],.2)),e>.2&&(R.org[0]*=1+1.2*Math.exp(-(e-.2)/1.7))}R.t=l,R.planet=w.planet,R.textOn=E*(1-Ee(.05,.4,f)),R.expo=(.1+.9*h)*(1+.5*f),g?.draw(R),U++;for(let e=0;e<6;e++){let t=ee.current[e];if(!t)continue;let n=ue(q,ce(y,re[e],R.bob),b,C);t.style.transform=`translate3d(${n[0].toFixed(1)}px,${n[1].toFixed(1)}px,0)`}f!==ne&&(ne=f,e.style.setProperty(`--dive`,f.toFixed(3))),!W&&U>=3&&(z||o>1.75)&&!(c.dive&&c.dive.out)&&(W=!0,_(!0)),W&&g&&!c.dive&&T>.55&&(G+=a,++K>=40&&(G/K>.045&&(T*=.8,O()),G=0,K=0))};H=requestAnimationFrame(ie);let q=window.setInterval(()=>{d||t||c.dive||c.hover>=0||document.hidden||performance.now()-c.touched<9e3||performance.now()-B<6e3||(c.focus=(c.focus+1)%u.length,h(c.focus))},5200);return()=>{cancelAnimationFrame(H),window.clearInterval(q),j.disconnect(),e.removeEventListener(`pointermove`,F),m.removeEventListener(`webglcontextlost`,v),g?.dispose(),g=null,m.remove()}},[]);let C=(0,c.useCallback)(e=>{let t=S.current;t.hover=e,t.touched=performance.now(),e>=0&&fe(u[e].id),e>=0&&!t.dive&&(t.focus=e,h(e))},[]),w=(0,c.useCallback)(e=>{let t=S.current;t.dive||(fe(u[e].id),t.reduce?(ye.id=null,i(`proto/V02/${u[e].id}`)):(t.focus=e,h(e),t.dive={i:e,t0:performance.now(),out:!1,ui:!0},x(e)))},[]);(0,c.useEffect)(()=>{let e=e=>{e.ctrlKey||e.metaKey||e.altKey||e.key.length===1&&e.key>=`1`&&e.key<=`6`&&w(Number(e.key)-1)};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[w]);let T=u[m],E=e=>({onPointerEnter:()=>C(e),onPointerLeave:()=>C(-1),onFocus:()=>C(e),onBlur:()=>C(-1),onClick:()=>w(e)}),D=e=>{let t=u[e];return(0,Z.jsxs)(`button`,{type:`button`,className:`v02-tile${e===m?` is-hot`:``}`,style:{"--c":t.hue},tabIndex:-1,"aria-label":`Open ${t.name}`,...E(e),children:[(0,Z.jsx)(`span`,{className:`v02-tile-img`,style:f(t)}),(0,Z.jsx)(`span`,{className:`v02-tile-name`,children:t.name})]},t.id)};return(0,Z.jsxs)(`div`,{ref:r,className:`v02 v02-home${t?` is-still`:``}`,"data-proto":`V02`,"data-ready":g?`1`:void 0,"data-live":v?`1`:`0`,"data-diving":b===null?void 0:`1`,style:{"--c":T.hue},children:[(0,Z.jsxs)(`h1`,{ref:o,className:`v02-word`,children:[`SuperHumans`,(0,Z.jsx)(`i`,{ref:l,"aria-hidden":`true`})]}),(0,Z.jsx)(`div`,{ref:a,className:`v02-holder`,children:!v&&(0,Z.jsxs)(`picture`,{children:[(0,Z.jsx)(`source`,{media:`(max-aspect-ratio: 4/5)`,srcSet:`${pe}themes/V02/still_tall.jpg`}),(0,Z.jsx)(`img`,{className:`v02-still`,src:`${pe}themes/V02/still_wide.jpg`,alt:``})]})}),(0,Z.jsxs)(`div`,{className:`v02-ui`,children:[(0,Z.jsx)(`p`,{className:`v02-line`,children:d}),(0,Z.jsx)(`div`,{className:`v02-spots`,children:u.map((e,t)=>(0,Z.jsxs)(`button`,{ref:e=>{ee.current[t]=e},type:`button`,className:`v02-spot${t===m?` is-hot`:``}`,"data-side":e.side,"data-organ":e.id,"data-qa":t===0?`primary`:void 0,style:{"--c":e.hue},"aria-label":`${e.name}: ${e.organ}. Open this check.`,...E(t),children:[(0,Z.jsx)(`span`,{className:`v02-ring`}),(0,Z.jsx)(`span`,{className:`v02-tag`,children:e.name})]},e.id))}),(0,Z.jsx)(`aside`,{className:`v02-focus`,"aria-live":`polite`,children:(0,Z.jsxs)(`div`,{className:`v02-focus-in`,children:[(0,Z.jsx)(`button`,{type:`button`,className:`v02-slide`,tabIndex:-1,"aria-label":`Open ${T.name}`,onClick:()=>w(m),children:(0,Z.jsx)(`span`,{style:f(T)})}),(0,Z.jsxs)(`p`,{className:`v02-kick`,children:[T.n,` `,(0,Z.jsx)(`b`,{children:`/ 06`}),` · `,T.organ]}),(0,Z.jsx)(`h2`,{className:`v02-name`,children:T.name}),(0,Z.jsx)(`p`,{className:`v02-sent`,children:T.sentence}),(0,Z.jsxs)(`button`,{type:`button`,className:`v02-go`,tabIndex:-1,onClick:()=>w(m),children:[`Dive in`,(0,Z.jsx)(s,{weight:`bold`})]})]},T.id)}),(0,Z.jsx)(`nav`,{className:`v02-dock v02-dock-l`,"aria-label":`Checks one to three`,children:[0,1,2].map(D)}),(0,Z.jsx)(`nav`,{className:`v02-dock v02-dock-r`,"aria-label":`Checks four to six`,children:[3,4,5].map(D)}),(0,Z.jsx)(`p`,{className:`v02-hint`,children:`Press a light inside the glass`}),(0,Z.jsx)(`span`,{className:`v02-ai`,children:`AI-generated imagery`})]}),(0,Z.jsxs)(`div`,{className:`v02-veil`,"aria-hidden":`true`,children:[(0,Z.jsx)(`i`,{}),(0,Z.jsx)(`span`,{style:f(T)})]})]})}var ke=e({default:()=>je}),Ae=(0,c.lazy)(Y);function je({view:e,params:t}){let n=ee(e);if(!n)return(0,Z.jsx)(Oe,{from:t.get(`from`),still:t.get(`still`)===`1`});let r=(0,Z.jsx)(`div`,{className:`v02 v02-module`,style:{"--c":n.hue},children:(0,Z.jsxs)(`div`,{className:`v02-veil v02-hold`,"aria-hidden":`true`,children:[(0,Z.jsx)(`i`,{}),(0,Z.jsx)(`span`,{style:f(n)})]})});return(0,Z.jsx)(c.Suspense,{fallback:r,children:(0,Z.jsx)(Ae,{check:n},n.id)})}export{je as default,f as i,ye as n,u as r,ke as t};
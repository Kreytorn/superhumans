const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./check-DmtCOP9j.js","./rolldown-runtime-XKyaHtl9.js","./index-CXFNwQMY.js","./index-CvU9-K1k.css","./honesty-D1yHS4ET.js","./check-CxneGGHz.css","./credits-Dhh-ySRC.js","./qr-BetPjNBy.js","./qr-D_QzCtB9.css"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";import{n,s as r,t as i}from"./index-CXFNwQMY.js";var a=t(r(),1),o=[{id:`tracktrace`,name:`TrackTrace`,hook:`Cosmic-ray hits, traced`,sentence:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,color:`#FF7A45`,org:[-.192,1.405,.02],side:`l`,ay:318,ayP:262},{id:`bubblegrade`,name:`BubbleGrade`,hook:`Hearing bubbles in blood`,sentence:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,color:`#3FD0FF`,org:[.028,1.3,.04],side:`r`,ay:404,ayP:340},{id:`spikecount`,name:`SpikeCount`,hook:`Every red cell, graded by shape`,sentence:`Every red blood cell, outlined. The spiky ones, counted.`,color:`#B78CFF`,org:[-.247,.995,.016],side:`l`,ay:566,ayP:452,ask:!0},{id:`veinsqueeze`,name:`VeinSqueeze`,hook:`A clot won’t squash`,sentence:`A clot is a vein that won’t squash.`,color:`#FF4F7B`,org:[.088,.72,.03],side:`r`,ay:654,ayP:628},{id:`braindrift`,name:`BrainDrift`,hook:`The brain’s fluid spaces`,sentence:`In flight the brain rises and its fluid spaces swell.`,color:`#5CF2B0`,org:[0,1.695,0],side:`l`,ay:124,ayP:104},{id:`garnmeter`,name:`Garn Meter`,hook:`Space sickness, in Garns`,sentence:`Space sickness, in Garns: an experimental model reads it from brainwaves.`,color:`#FFD34D`,org:[.082,1.6,-.006],side:`r`,ay:196,ayP:168}],s=`Quiet`,c=`Asks for the crew medic`,l=e=>`#/proto/DF/${e}`,u=`#version 300 es
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
`,d=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],f=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],p=e=>{let t=Math.hypot(e[0],e[1],e[2]);return[e[0]/t,e[1]/t,e[2]/t]},m=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],h=[0,1.3,7.4],g=p(d([0,.89,0],h)),_=p(m(g,[0,1,0])),v=m(_,g);function y(e,t,n){let r=d([0,1.752,0],h),i=d([0,0,.02],h),a=f(r,v)/f(r,g),o=f(i,v)/f(i,g),s=(n-t)/(a-o);return{f:s,f0:s,ppx:e,ppy:t+s*a}}var b=(e,t)=>{let n=Math.cos(t),r=Math.sin(t);return[n*e[0]+r*e[2],e[1],-r*e[0]+n*e[2]]};function x(e,t,n){let r=d(b(t,n),h),i=f(r,g);return[e.ppx+e.f*f(r,_)/i,e.ppy-e.f*f(r,v)/i]}var S=e=>e<0?0:e>1?1:e,C=e=>(e=S(e),e<.5?4*e*e*e:1-(-2*e+2)**3/2),w=e=>(e=S(e),1-(1-e)**3),T=150,E=1700,D=170,O=3400,k=.16;function A(e,t){let n={t:e,rot:k,beat:0,rev:-.06+1.92*C((e-T)/1500),org:[],hs:[],ld:[]};for(let t=0;t<6;t++){let r=E+t*D;n.org.push(w((e-r)/450)),n.hs.push(S((e-r-120)/380)),n.ld.push(S((e-r-240)/500))}if(t){n.rot=k+.16*Math.sin(e/1e3*2*Math.PI/40);let t=e/1e3*1.1%1;n.beat=Math.exp(-t*9)+.5*Math.exp(-Math.max(t-.18,0)*9)*(t>.18)}return n}function j(e,t){let n=A(1e6,!1);if(n.t=e,t){let t=A(e,!0);n.rot=t.rot,n.beat=t.beat}return n}var M=new WeakMap;function ee(e){if(M.has(e))return M.get(e)??null;let t=te(e);return M.set(e,t),t}function te(e){let t=null;try{t=e.getContext(`webgl2`,{premultipliedAlpha:!0,antialias:!1,alpha:!0})}catch{t=null}if(!t)return null;let n=t,r={},i=null,a=n.getExtension(`KHR_parallel_shader_compile`),o=!1,s=!1,c=performance.now();performance.mark(`df-fig-compile`);let l=[],d=()=>{if(!i)throw Error(`no program`);for(let e of l)if(!n.getShaderParameter(e,n.COMPILE_STATUS))throw Error(n.getShaderInfoLog(e)??`shader error`);if(!n.getProgramParameter(i,n.LINK_STATUS))throw Error(n.getProgramInfoLog(i)??`link error`);n.useProgram(i);let e=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,e),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),n.STATIC_DRAW);let t=n.getAttribLocation(i,`p`);n.enableVertexAttribArray(t),n.vertexAttribPointer(t,2,n.FLOAT,!1,0,0);for(let e of[`uRes`,`uS`,`uDpr`,`uOff`,`uCo`,`uCf`,`uCr`,`uCu`,`uF`,`uPP`,`uRot`,`uRev`,`uT`,`uBeat`,`uZoom`,`uOrg`,`uZ`])r[e]=n.getUniformLocation(i,e)},f=()=>{if(s)return!1;if(!o)return!0;if(i&&a&&performance.now()-c<6e3&&!n.getProgramParameter(i,a.COMPLETION_STATUS_KHR))return n.flush(),!1;performance.now()-c>=6e3&&performance.mark(`df-fig-forced`),o=!1;try{return d(),performance.mark(`df-fig-ready`),!0}catch(e){return console.warn(e),s=!0,!1}};try{let e=(e,t)=>{let r=n.createShader(e);if(!r)throw Error(`no shader`);return n.shaderSource(r,t),n.compileShader(r),l.push(r),r};if(i=n.createProgram(),!i)throw Error(`no program`);n.attachShader(i,e(n.VERTEX_SHADER,`#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`)),n.attachShader(i,e(n.FRAGMENT_SHADER,u)),n.linkProgram(i),n.flush(),a?o=!0:d()}catch(e){return console.error(e),null}let p=!1,m=1,y=1,b=0;return{resize(t,r,i,a,o){e.width=Math.max(1,Math.round(t)),e.height=Math.max(1,Math.round(r)),m=e.width/i,y=o,b=a,n.viewport(0,0,e.width,e.height)},draw(t,i){return f()?(n.uniform2f(r.uRes,e.width,e.height),n.uniform1f(r.uS,m),n.uniform1f(r.uDpr,y),n.uniform2f(r.uOff,b,0),n.uniform3fv(r.uCo,h),n.uniform3fv(r.uCf,g),n.uniform3fv(r.uCr,_),n.uniform3fv(r.uCu,v),n.uniform1f(r.uF,i.f),n.uniform2f(r.uPP,i.ppx,i.ppy),n.uniform1f(r.uRot,t.rot),n.uniform1f(r.uRev,t.rev),n.uniform1f(r.uT,t.t/1e3),n.uniform1f(r.uBeat,t.beat),n.uniform1f(r.uZoom,i.f/i.f0),n.uniform1fv(r.uOrg,t.org),n.uniform1i(r.uZ,0),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),n.drawArrays(n.TRIANGLES,0,3),p||(p=!0,performance.mark(`df-fig-drawn`)),!0):!1}}}function N(e){return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function P(e,t=6800){let n=e.getContext(`2d`);if(!n)return null;let r=[],i=0,a=0,o=1,s=[`255,255,255`,`208,224,255`,`255,238,212`,`190,210,255`];return{size(){o=Math.min(devicePixelRatio||1,1.5),i=e.width=Math.round(innerWidth*o),a=e.height=Math.round(innerHeight*o);let n=N(20261114),c=Math.round(innerWidth*innerHeight/t);r=[];for(let e=0;e<c;e++){let e=n()**3;r.push({x:n(),y:n(),r:.35+e*1.15,a:.22+n()*.55,c:s[n()*s.length|0],ph:n()*6.28,tw:4e-4+n()*.0016})}},draw(e,t){n.clearRect(0,0,i,a);for(let s of r){let r=s.a*(t?1:.72+.28*Math.sin(e*s.tw+s.ph)),c=s.r*o,l=s.x*i,u=s.y*a;c>1.1&&(n.fillStyle=`rgba(${s.c},${(r*.12).toFixed(3)})`,n.beginPath(),n.arc(l,u,c*2.6,0,6.283),n.fill()),n.fillStyle=`rgba(${s.c},${r.toFixed(3)})`,n.beginPath(),n.arc(l,u,c,0,6.283),n.fill()}}}}var F=`#version 300 es
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
`,I=new WeakMap;function L(e){if(I.has(e))return I.get(e)??null;let t=R(e);return I.set(e,t),t}function R(e){let t=null;try{t=e.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`})}catch{t=null}if(!t)return null;let n=t;try{let t=(e,t)=>{let r=n.createShader(e);if(!r)throw Error(`no shader`);if(n.shaderSource(r,t),n.compileShader(r),!n.getShaderParameter(r,n.COMPILE_STATUS))throw Error(n.getShaderInfoLog(r)??`shader error`);return r},r=n.createProgram();if(!r)throw Error(`no program`);if(n.attachShader(r,t(n.VERTEX_SHADER,`#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`)),n.attachShader(r,t(n.FRAGMENT_SHADER,F)),n.linkProgram(r),!n.getProgramParameter(r,n.LINK_STATUS))throw Error(n.getProgramInfoLog(r)??`link error`);n.useProgram(r);let i=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,i),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),n.STATIC_DRAW);let a=n.getAttribLocation(r,`p`);n.enableVertexAttribArray(a),n.vertexAttribPointer(a,2,n.FLOAT,!1,0,0);let o=n.getUniformLocation(r,`uRes`),s=n.getUniformLocation(r,`uT`),c=n.getUniformLocation(r,`uLimb`);return{size(t,r){e.width=Math.max(160,Math.round(t/3)),e.height=Math.max(120,Math.round(r/3)),n.viewport(0,0,e.width,e.height)},draw(t,r){n.uniform2f(o,e.width,e.height),n.uniform1f(s,t),n.uniform3f(c,r[0],r[1],r[2]),n.drawArrays(n.TRIANGLES,0,3)}}}catch(e){return console.error(e),null}}var z=new URL(`body_poster-Cc1YcKR4.webp`,import.meta.url).href,B=e({default:()=>we}),V=n(),H=Object.assign({"./check.tsx":()=>i(()=>import(`./check-DmtCOP9j.js`).then(e=>e.t),__vite__mapDeps([0,1,2,3,4,5]),import.meta.url)})[`./check.tsx`],U=H?(0,a.lazy)(H):null,ne=(0,a.lazy)(()=>i(()=>import(`./credits-Dhh-ySRC.js`),__vite__mapDeps([6,1,2,3,7,8]),import.meta.url)),W=(0,a.lazy)(()=>i(()=>import(`./qr-BetPjNBy.js`),__vite__mapDeps([7,1,2,3,8]),import.meta.url)),G=!1;function K(){let e=window.innerWidth,t=window.innerHeight,n=e<760||e/t<1.1;if(n)return{phone:n,vw:e,vh:t,s:Math.min(e,560)/780,W:780,H:1064,cx:390,top:64,bottom:952,glX:0,glW:780,LX:236,RX:544,hit:46,k:1,u:1,colW:0};let r=Math.min(e/1920,t/1080),i=Math.round(t*.07),a=Math.round(t*.925),o=a-i,s=o/856,c=Math.round(Math.min(e*.7,e-40*r-450*s)),l=c-202*s,u=c+168*s,d=Math.max(300,Math.min(720*r,l-290*s-116*r));return{phone:n,vw:e,vh:t,s:1,W:e,H:t,cx:c,top:i,bottom:a,glX:Math.round(c-.4*o),glW:Math.round(.8*o),LX:l,RX:u,hit:30*s,k:s,u:r,colW:d}}var re=(e,t)=>e.phone?t.ayP:e.top+(t.ay-112)*e.k,q=`M0 -8C.9 -2.2 2.2 -.9 8 0C2.2 .9 .9 2.2 0 8C-.9 2.2 -2.2 .9 -8 0C-2.2 -.9 -.9 -2.2 0 -8Z`,ie=O+500,ae=300,J={x:-.4,y:-63/770,w:.8,h:900/770},oe=`./`,Y=e=>e.id===`spikecount`?`${oe}spikecount/fields/96.png`:`${oe}_posters/${e.id}.jpg`,se=e=>``,ce=Math.max(0,o.findIndex(e=>e.ask)),X=(e,t)=>({"--mc":e,...t}),Z=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)};function le(){let[e,t]=(0,a.useState)(K);return(0,a.useEffect)(()=>{let e=()=>t(K());return window.addEventListener(`resize`,e),()=>window.removeEventListener(`resize`,e)},[]),e}function ue(){let[e]=(0,a.useState)(()=>{try{return window.matchMedia(`(prefers-reduced-motion: reduce)`).matches}catch{return!1}});return e}function de({g:e,still:t,slowRef:n,farRef:r}){let i=(0,a.useRef)(null),o=(0,a.useRef)(null),s=e.vw*9/16,c=.93*e.vh-.64*s,l=e.phone?.03:1-(c+.61*s)/e.vh,u=e.phone?.05:.1*(s/e.vh)/.1764;return(0,a.useEffect)(()=>{let e=i.current?P(i.current,17e3):null;e&&(e.size(),e.draw(0,!0))},[e.vw,e.vh]),(0,a.useEffect)(()=>{let r=o.current?L(o.current):null;if(!r)return;r.size(e.vw,e.vh);let i=[.42,l,u];if(r.draw(40,i),t)return;let a=0,s=0,c=e=>{a=requestAnimationFrame(c),e-s<(n.current?120:40)||(s=e,r.draw(40+e/1e3,i))};return a=requestAnimationFrame(c),()=>cancelAnimationFrame(a)},[e.vw,e.vh,l,u,t,n]),(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`canvas`,{ref:i,className:`df-sky`,"aria-hidden":`true`}),!e.phone&&(0,V.jsx)(`div`,{className:`df-far`,ref:r,"aria-hidden":`true`,children:(0,V.jsx)(`div`,{className:`df-photo`,style:{top:c,height:s}})}),(0,V.jsx)(`canvas`,{ref:o,className:`df-aur`,"aria-hidden":`true`})]})}function fe({className:e}){return(0,V.jsxs)(`svg`,{className:e,viewBox:`-10 -10 20 20`,"aria-hidden":`true`,children:[(0,V.jsx)(`path`,{d:q,fill:`currentColor`}),(0,V.jsx)(`circle`,{r:`1.6`,fill:`#fff`})]})}function pe(){return(0,V.jsxs)(`div`,{className:`df-ai`,children:[(0,V.jsxs)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:[(0,V.jsx)(`path`,{d:`M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z`,fill:`currentColor`}),(0,V.jsx)(`path`,{d:`M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3Z`,fill:`currentColor`})]}),`AI-generated illustration`]})}function me({ask:e}){return e?(0,V.jsx)(`span`,{className:`df-st ask`,children:c}):(0,V.jsxs)(`span`,{className:`df-st`,children:[(0,V.jsx)(`i`,{className:`df-lamp`}),s]})}function he(){return(0,V.jsxs)(`p`,{className:`df-sum`,children:[(0,V.jsxs)(`span`,{children:[(0,V.jsx)(`i`,{className:`df-lamp`}),`Five are quiet.`]}),(0,V.jsxs)(`span`,{children:[(0,V.jsx)(`i`,{className:`df-lamp ask`}),`One asks for the crew medic.`]})]})}var Q=(e,t)=>({onPointerEnter:()=>t(e),onPointerLeave:()=>t(-1),onFocus:()=>t(e),onBlur:()=>t(-1)});function ge({g:e,still:t,intro:n,pausedRef:r,hot:i,setHot:s,onReady:c,zoomRef:u}){let d=(0,a.useRef)(null),f=(0,a.useRef)([]),p=(0,a.useRef)(c),m=(0,a.useRef)(null),h=(0,a.useRef)(null),g=(0,a.useRef)(null),_=(0,a.useRef)(!1),v=(0,a.useRef)(0);(0,a.useEffect)(()=>{p.current=c},[c]),(0,a.useEffect)(()=>{let i=d.current;if(!i)return;let a=ee(i),s=y(e.cx,e.top,e.bottom),c=h.current,l=g.current,b=c?.dataset.p??``,S=!1,C=0,T=e=>{b=e,c&&(c.dataset.p=e),e===`poster`&&(_.current=!0)},E=e=>{S||(S=!0,_.current&&!v.current&&(v.current=e),b===`poster`?(T(`fade`),C=window.setTimeout(()=>T(`gl`),700)):b!==`fade`&&T(`gl`))};a||T(`poster`);let D=e.top+J.y*(e.bottom-e.top),k=(e,t)=>{if(!l)return;let n=e<=-.05?`inset(0 0 100% 0)`:e<1.8?`inset(${Math.max(0,x(s,[0,e,0],t)[1]-D).toFixed(1)}px 0 0 0)`:``;l.style.clipPath!==n&&(l.style.clipPath=n)},M=o.map((e,t)=>{let n=f.current[t];return{lead:n?.querySelector(`.df-lead`)??null,end:n?.querySelector(`.df-end`)??null,hs:n?.querySelector(`.df-hs`)??null}}),te=t=>{o.forEach((n,r)=>{let{lead:i,end:a,hs:o}=M[r];if(!i||!a||!o)return;let c=re(e,n),[l,u]=x(s,n.org,t.rot),d=Math.abs(c-u),f=n.side===`l`?e.LX+16*e.k:e.RX-16*e.k,p=n.side===`l`?Math.max(l-d,f+12*e.k):Math.min(l+d,f-12*e.k);i.setAttribute(`d`,`M${l.toFixed(1)} ${u.toFixed(1)}L${p.toFixed(1)} ${c.toFixed(1)}L${f.toFixed(1)} ${c.toFixed(1)}`),i.setAttribute(`stroke-dashoffset`,(1-w(t.ld[r])).toFixed(3)),a.setAttribute(`cx`,f.toFixed(1)),a.setAttribute(`cy`,c.toFixed(1)),a.style.opacity=t.ld[r]>=1?`1`:`0`;let m=t.hs[r];o.setAttribute(`transform`,`translate(${l.toFixed(1)} ${u.toFixed(1)}) scale(${((.4+.6*w(m))*e.k).toFixed(3)})`),o.style.opacity=Math.min(1,m*2).toFixed(3)})},N=(e,t)=>{let n=e;_.current&&(n=j(v.current?t-v.current:0,v.current>0&&!r.current),n.rev=Math.min(n.rev,e.rev),e={...e,rot:n.rot},k(n.rev,n.rot)),a?.draw(n,s)&&E(t),te(e)},P=Math.min(window.devicePixelRatio||1,1.5);i.style.left=`${e.glX}px`,i.style.width=`${e.glW}px`,a?.resize(e.glW*e.s*P,e.H*e.s*P,e.glW,e.glX,P);let F=``,I=``,L=t=>{let n=t?`${t.L} ${t.T} ${t.W} ${t.H}`:``;n!==F&&(F=n,t?(i.style.left=`${t.L}px`,i.style.top=`${t.T}px`,i.style.width=`${t.W}px`,i.style.height=`${t.H}px`,a?.resize(t.W*e.s*P,t.H*e.s*P,t.W,t.L,P)):(i.style.left=`${e.glX}px`,i.style.top=`0px`,i.style.width=`${e.glW}px`,i.style.height=`${e.H}px`,i.style.transform=``,a?.resize(e.glW*e.s*P,e.H*e.s*P,e.glW,e.glX,P)))},R=()=>{let e=u.current;if(!e||e.z<=1.001)return F?(L(null),I=``,!1):null;L(e.view);let t=`${e.z.toFixed(4)} ${e.x.toFixed(1)} ${e.y.toFixed(1)} ${e.dx.toFixed(1)} ${e.dy.toFixed(1)}`;if(t===I)return!0;I=t;let n=e.z;return a?.draw(j(1e7,!1),{f:s.f*n,f0:s.f0,ppx:e.x+(s.ppx-e.x)*n+e.dx,ppy:e.y+(s.ppy-e.y)*n+e.dy-e.view.T})&&E(performance.now()),!0},z=!1,B=()=>{z||(z=!0,p.current())},V=0,H=()=>{cancelAnimationFrame(V),window.clearTimeout(C),b===`fade`&&T(`gl`)};if(t){let e=A(1e6,!1),t=n=>{N(e,n),!S&&a&&(b||T(`poster`),V=requestAnimationFrame(t))};return t(performance.now()),B(),H}m.current===null&&(m.current=n?performance.now():-1e7);let U=m.current,ne=performance.now();!n&&!S&&!b&&a&&T(`poster`);let W=0,G=!1,K=0,q=0,oe=window.setTimeout(B,ie+1500),Y=t=>{V=requestAnimationFrame(Y),S&&K&&t-K>120&&!F?q++:q=0,K=t,q>=3&&P>.5&&(q=0,P=Math.max(.5,P*.6),a?.resize(e.glW*e.s*P,e.H*e.s*P,e.glW,e.glX,P),G=!1),!S&&!b&&t-ne>ae&&T(`poster`);let n=R();if(n)return;n===!1&&(G=!1);let i=r.current;if(i&&G&&S)return;let o=i?1e7:t-U;if(o<3400)N(A(o,!1),t);else if(t-W>33||!G||!S)N(j(o-O,!i),t),o>ie&&B();else return;W=t,G=!0};return V=requestAnimationFrame(Y),()=>{H(),window.clearTimeout(oe)}},[e,t,n,r,u]);let b=e.bottom-e.top;return(0,V.jsxs)(V.Fragment,{children:[(0,V.jsxs)(`div`,{className:`df-glw`,ref:h,children:[(0,V.jsx)(`img`,{ref:g,className:`df-poster`,src:z,alt:``,draggable:!1,style:{left:e.cx+J.x*b,top:e.top+J.y*b,width:J.w*b,height:J.h*b}}),(0,V.jsx)(`canvas`,{ref:d,className:`df-gl`,style:{left:e.glX,width:e.glW,height:e.H},"aria-hidden":`true`})]}),(0,V.jsx)(`svg`,{className:`df-fig`,viewBox:`0 0 ${e.W} ${e.H}`,width:e.W,height:e.H,"aria-label":`Crew body map: six checks`,children:o.map((t,n)=>(0,V.jsxs)(`g`,{ref:e=>{f.current[n]=e},className:i===n?`is-hot`:void 0,style:X(t.color),children:[(0,V.jsx)(`path`,{className:`df-lead`,fill:`none`,strokeWidth:2*e.k,strokeLinecap:`round`,pathLength:1,strokeDasharray:1}),(0,V.jsx)(`circle`,{className:`df-end`,r:3*e.k}),(0,V.jsxs)(`a`,{className:`df-hs`,"data-id":t.id,href:l(t.id),"aria-label":`Open ${t.name}`,...Q(n,s),children:[(0,V.jsx)(`circle`,{className:`df-hit`,r:e.hit/e.k}),(0,V.jsxs)(`g`,{className:`df-hl`,children:[(0,V.jsx)(`circle`,{className:`f`,r:34,fillOpacity:.16}),(0,V.jsx)(`circle`,{className:`s`,r:24,fill:`none`,strokeWidth:2})]}),(0,V.jsx)(`circle`,{className:`f`,r:16,fillOpacity:.14}),(0,V.jsx)(`circle`,{className:`df-ring s`,r:18,fill:`none`,strokeWidth:1.5,strokeOpacity:.6}),(0,V.jsx)(`path`,{className:`f`,d:q,transform:`scale(.875)`}),(0,V.jsx)(`circle`,{r:1.8,fill:`#FFFFFF`})]})]},t.id))})]})}function _e({g:e,hot:t,setHot:n}){return(0,V.jsx)(V.Fragment,{children:o.map((r,i)=>{let a=r.side===`l`?{right:e.W-e.LX}:{left:e.RX};return(0,V.jsx)(`a`,{href:l(r.id),className:`df-lab ${r.side}${t===i?` is-hot`:``}`,style:{...X(r.color),...a,top:re(e,r)-(e.phone?16:17*e.k),"--d":`${2050+i*170}ms`},...Q(i,n),children:e.phone?(0,V.jsxs)(`span`,{className:`df-lab-name`,children:[r.ask&&r.side===`r`&&(0,V.jsx)(`i`,{className:`df-lamp ask`}),r.name,r.ask&&r.side===`l`&&(0,V.jsx)(`i`,{className:`df-lamp ask`})]}):(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`span`,{className:`df-lab-name`,children:r.name}),(0,V.jsx)(`span`,{className:`df-lab-hook`,children:r.hook}),(0,V.jsx)(me,{ask:r.ask})]})},r.id)})})}function ve({shown:e,hot:t,setHot:n,primary:r}){let i=o[e];return(0,V.jsxs)(`section`,{className:`df-win`,style:X(i.color),"aria-label":`Real samples of the six checks`,children:[(0,V.jsxs)(`a`,{className:`df-win-frame`,"data-qa":r?`primary`:void 0,href:l(i.id),...Q(e,n),children:[(0,V.jsxs)(`span`,{className:`df-win-head`,children:[(0,V.jsx)(fe,{}),(0,V.jsx)(`span`,{className:`df-win-name`,children:i.name}),(0,V.jsx)(me,{ask:i.ask}),(0,V.jsx)(`span`,{className:`df-win-tag`,children:`Real sample`})]}),(0,V.jsxs)(`span`,{className:`df-win-view`,children:[o.map((t,n)=>(0,V.jsx)(`img`,{src:Y(t),alt:``,className:`${se(t)}${n===e?` on`:``}`,draggable:!1,decoding:`async`},t.id)),(0,V.jsx)(`i`,{className:`df-tick tl`}),(0,V.jsx)(`i`,{className:`df-tick tr`}),(0,V.jsx)(`i`,{className:`df-tick bl`}),(0,V.jsx)(`i`,{className:`df-tick br`}),(0,V.jsxs)(`span`,{className:`df-win-open`,children:[`Open`,(0,V.jsx)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:(0,V.jsx)(`path`,{d:`M5 12h14M13 6l6 6-6 6`,fill:`none`,stroke:`currentColor`,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`})})]})]}),(0,V.jsx)(`span`,{className:`df-win-sent`,children:i.sentence})]}),(0,V.jsxs)(`div`,{className:`df-strip`,children:[(0,V.jsxs)(`p`,{className:`df-strip-head`,children:[(0,V.jsx)(`i`,{className:`df-lamp breathe`}),`Six checks, running on this device`]}),(0,V.jsx)(`div`,{className:`df-thumbs`,children:o.map((r,i)=>(0,V.jsxs)(`a`,{href:l(r.id),className:`df-thumb${i===e?` on`:``}${t===i?` is-hot`:``}`,style:X(r.color),"aria-label":`Open ${r.name}`,title:r.name,...Q(i,n),children:[(0,V.jsx)(`img`,{src:Y(r),alt:``,className:se(r),draggable:!1,decoding:`async`}),(0,V.jsx)(`i`,{className:`df-lamp${r.ask?` ask`:``}`})]},r.id))})]})]})}function ye({mod:e}){return(0,V.jsxs)(`main`,{className:`df-mod`,style:X(e.color),children:[(0,V.jsxs)(`a`,{className:`df-back`,href:l(`home`),children:[(0,V.jsx)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:(0,V.jsx)(`path`,{d:`M15 5l-7 7 7 7`,fill:`none`,stroke:`currentColor`,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`})}),`Back`]}),(0,V.jsxs)(`div`,{className:`df-mod-body`,children:[(0,V.jsx)(fe,{className:`df-mod-star`}),(0,V.jsx)(`h1`,{className:`df-mod-name`,children:e.name}),(0,V.jsx)(`p`,{className:`df-mod-sent`,children:e.sentence})]})]})}function be(e){return U?(0,V.jsx)(a.Suspense,{fallback:(0,V.jsx)(ye,{...e}),children:(0,V.jsx)(U,{...e})}):(0,V.jsx)(ye,{...e})}var xe=`Photo: NASA / Chris Williams (ISS), public domain`,$=(e,t)=>{e&&Object.assign(e.style,t)};function Se(){return(0,V.jsxs)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:[(0,V.jsx)(`path`,{d:`M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z`,fill:`none`,stroke:`currentColor`,strokeWidth:`2`,strokeLinejoin:`round`}),(0,V.jsx)(`path`,{d:`M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z`,fill:`currentColor`})]})}function Ce({className:e}){return(0,V.jsxs)(`nav`,{className:e,"aria-label":`About this site`,children:[(0,V.jsx)(`a`,{href:l(`credits`),children:`Credits and AI use`}),(0,V.jsxs)(`a`,{href:l(`qr`),"aria-keyshortcuts":`Q`,title:`QR code to this site (key Q)`,children:[(0,V.jsx)(Se,{}),`QR code`]})]})}function we(e){if(e.view===`credits`||e.view===`qr`){let t=e.view===`qr`?W:ne;return(0,V.jsx)(a.Suspense,{fallback:(0,V.jsx)(`div`,{className:`df`}),children:(0,V.jsx)(t,{params:e.params})})}return(0,V.jsx)(Te,{...e})}function Te({view:e,params:t}){let n=ue(),r=n||t.get(`state`)===`result`,i=le(),s=o.find(t=>t.id===e)??null,c=(0,a.useRef)(null),u=(0,a.useRef)(null),d=(0,a.useRef)(null),f=(0,a.useRef)(null),p=(0,a.useRef)(null),m=(0,a.useRef)(null),h=(0,a.useRef)(+!!s),g=(0,a.useRef)(0),_=(0,a.useRef)(null),v=(0,a.useRef)(null),y=(0,a.useRef)(!!s),b=(0,a.useRef)(n),[x]=(0,a.useState)(!s&&!G);(0,a.useEffect)(()=>{G=!0},[]);let[S,C]=(0,a.useState)(s),w=(0,a.useRef)(s),[T,E]=(0,a.useState)(!!s),[D,O]=(0,a.useState)(!!s),[k,A]=(0,a.useState)(-1),[j,M]=(0,a.useState)(ce),[ee,te]=(0,a.useState)(!1),N=(0,a.useCallback)(()=>te(!0),[]),[P,F]=(0,a.useState)(null),I=(0,a.useCallback)(e=>F(t=>t&&t.id===e.id&&t.ready===e.ready&&t.phase===e.phase?t:e),[]),L=(0,a.useCallback)(e=>{y.current||(A(e),e>=0&&M(e))},[]);(0,a.useEffect)(()=>{if(D||k>=0||r||i.phone)return;let e=window.setInterval(()=>M(e=>(e+1)%o.length),5200);return()=>window.clearInterval(e)},[D,k,r,i.phone]);let R=(0,a.useCallback)(e=>{let t=window.innerWidth,n=window.innerHeight,r=_.current??{x:t/2,y:n/2},i=e<=5e-4,a=e>=.9995,o=a?`hidden`:`visible`;if(b.current){$(d.current,{transform:``,filter:``,opacity:String(1-e),visibility:o,pointerEvents:i?``:`none`}),$(f.current,{transform:``,filter:``,opacity:String(1-e),visibility:o}),$(u.current,{transform:``,opacity:String(1-.7*e)}),$(p.current,{opacity:`0`}),v.current=null,$(m.current,{transform:``,filter:``,opacity:String(e),visibility:i?`hidden`:`visible`,pointerEvents:a?`auto`:`none`});return}let s=e**2.2,c=Math.exp(Math.log(9)*s),l=Z(0,1,e),h=(t/2-r.x)*l,g=(n/2-r.y)*l,y=`${r.x.toFixed(1)}px ${r.y.toFixed(1)}px`;$(d.current,i?{transform:``,filter:``,opacity:`1`,visibility:`visible`,pointerEvents:``}:{transformOrigin:y,transform:`translate3d(${h.toFixed(1)}px,${g.toFixed(1)}px,0) scale(${c.toFixed(4)})`,filter:`blur(${(Z(.55,.97,e)*3).toFixed(2)}px) brightness(${(1+.45*Z(.25,.85,e)).toFixed(3)})`,opacity:(1-Z(.6,.97,e)).toFixed(3),visibility:o,pointerEvents:`none`}),$(f.current,i?{transform:``,filter:``,opacity:`1`,visibility:`visible`}:{transformOrigin:y,transform:`translate3d(${(h*1.4).toFixed(1)}px,${(g*1.4).toFixed(1)}px,0) scale(${(1+2.4*e**1.7).toFixed(4)})`,filter:`blur(${(Z(0,.3,e)*7).toFixed(2)}px)`,opacity:(1-Z(.02,.36,e)).toFixed(3),visibility:e>.4?`hidden`:`visible`}),$(u.current,i?{transform:``,opacity:`1`}:{transformOrigin:y,transform:`translate3d(${(h*.22).toFixed(1)}px,${(g*.22).toFixed(1)}px,0) scale(${(1+.32*s).toFixed(4)})`,opacity:(1-.72*Z(.3,1,e)).toFixed(3)});let x=d.current?.querySelector(`.df-gl`)??null;if(x){if(!i&&r.st){let{k:e,view:t}=r.st;v.current={z:c,x:r.st.x,y:r.st.y,dx:h/e,dy:g/e,view:t},x.style.transformOrigin=`${(r.st.x-t.L).toFixed(1)}px ${(r.st.y-t.T).toFixed(1)}px`,x.style.transform=`scale(${(1/c).toFixed(5)}) translate(${(-h/e).toFixed(1)}px,${(-g/e).toFixed(1)}px)`}else v.current=null,x.style.transform=``}let S=r.x+(t/2-r.x)*l,C=r.y+(n/2-r.y)*l;$(p.current,{transform:`translate3d(${S.toFixed(1)}px,${C.toFixed(1)}px,0) scale(${(.1+1.9*s).toFixed(4)})`,opacity:(Z(.16,.6,e)*(1-Z(.72,1,e))*.95).toFixed(3)}),$(m.current,{transform:a?``:`scale(${(1.1-.1*Z(.5,1,e)).toFixed(4)})`,filter:a?``:`blur(${((1-Z(.6,1,e))*8).toFixed(2)}px)`,opacity:Z(.58,1,e).toFixed(3),visibility:e<.5?`hidden`:`visible`,pointerEvents:e>.95?`auto`:`none`})},[]),z=(0,a.useCallback)(e=>{cancelAnimationFrame(g.current);let t=h.current,n=Math.abs(e-t),r=()=>{h.current=e,R(e),e===1?E(!0):(_.current=null,w.current=null,C(null),E(!1),O(!1))};if(n<.001){r();return}let i=(b.current?240:e>t?1080:940)*n,a=performance.now(),o=n=>{let s=Math.min(1,(n-a)/i);s>=1?r():(h.current=t+(e-t)*s,R(h.current),g.current=requestAnimationFrame(o))};g.current=requestAnimationFrame(o)},[R]),B=(0,a.useCallback)(e=>{let t=window.innerWidth,n=window.innerHeight,r={x:t/2,y:n/2},i=d.current;if(!i)return r;let a=i.style.transform;i.style.transform=`none`;let o=i.querySelector(`.df-gl`),s=o?.style.transform??``;o&&(o.style.transform=`none`);let c=()=>i.querySelector(`.df-hs[data-id="${e}"]`)?.getBoundingClientRect(),l=c();l&&l.width>0&&i.scrollHeight>i.clientHeight+4&&(l.top<56||l.bottom>n-56)&&(i.scrollTop+=l.top+l.height/2-n*.42,l=c());let u=r;if(l&&l.width>0){let e=l.left+l.width/2,r=l.top+l.height/2;if(e>=0&&e<=t&&r>=0&&r<=n){u={x:e,y:r};let i=o?.getBoundingClientRect();if(o&&i&&i.width>0&&o.offsetWidth>0){let a=i.width/o.offsetWidth,s=i.left-o.offsetLeft*a,c=i.top-o.offsetTop*a,l={L:Math.floor(-s/a),T:Math.floor(-c/a),W:Math.ceil(t/a)+2,H:Math.ceil(n/a)+2};u.st={x:(e-s)/a,y:(r-c)/a,k:a,view:l}}}}return o&&(o.style.transform=s),i.style.transform=a,u},[]);(0,a.useLayoutEffect)(()=>{b.current=r;let t=o.find(t=>t.id===e)??null;return t?((h.current<.02||!_.current)&&(_.current=B(t.id)),y.current=!0,w.current=t,C(t),O(!0),A(-1),z(1)):(!_.current&&w.current&&(_.current=B(w.current.id)),y.current=!1,z(0)),()=>cancelAnimationFrame(g.current)},[e,r,z,B]),(0,a.useEffect)(()=>{},[R,B]),(0,a.useLayoutEffect)(()=>{R(h.current)},[i,R]),(0,a.useEffect)(()=>{if(!s)return;let e=e=>{e.key===`Escape`&&!e.defaultPrevented&&(window.location.hash=l(`home`))};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[s]),(0,a.useEffect)(()=>{if(s)return;let e=e=>{if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.key.toLowerCase()!==`q`)return;let t=e.target;t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))||(window.location.hash=l(`qr`))};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[s]);let H=k>=0?k:j,U=s&&P&&P.id===s.id?P:null,ne=s?T&&!!U?.ready:ee,W=s&&t.get(`state`)===`result`?`result`:void 0,K=t.get(`sample`)??``,re=s?.id===`tracktrace`&&/^nucleus-\d+$/.test(K)?K:void 0,q=`df${i.phone?` is-phone`:``}${r?` is-still`:``}${x?``:` no-intro`}`,ie={"--u":`${i.u}px`,"--k":`${i.k}px`};return(0,V.jsxs)(`div`,{ref:c,className:q,style:ie,"data-ready":ne?`1`:void 0,"data-state":s?U?.phase:r?`result`:`idle`,"data-view":s?s.id:`home`,"data-landed":T?`1`:void 0,children:[(0,V.jsx)(de,{g:i,still:r,slowRef:y,farRef:u}),(0,V.jsx)(`div`,{className:`df-vignette`}),i.phone?(0,V.jsxs)(`div`,{className:`df-scroll`,ref:d,inert:D||void 0,children:[(0,V.jsxs)(`header`,{className:`df-phead`,children:[(0,V.jsx)(`h1`,{className:`df-wordmark`,children:`SuperHumans`}),(0,V.jsx)(`p`,{className:`df-tagline`,children:`Six AI health checks for astronauts, running in your browser.`}),(0,V.jsx)(he,{})]}),(0,V.jsx)(`div`,{className:`df-pwrap`,style:{height:i.H*i.s},children:(0,V.jsxs)(`div`,{className:`df-pstage`,style:{transform:`scale(${i.s})`},children:[(0,V.jsx)(`div`,{className:`df-photo`}),(0,V.jsx)(ge,{g:i,still:r,intro:x,pausedRef:y,hot:k,setHot:L,onReady:N,zoomRef:v},`phone`),(0,V.jsx)(_e,{g:i,hot:k,setHot:L}),(0,V.jsx)(pe,{})]})}),(0,V.jsx)(`ul`,{className:`df-list`,"aria-label":`The six checks`,children:o.map((e,t)=>(0,V.jsx)(`li`,{children:(0,V.jsxs)(`a`,{className:`df-row${k===t?` is-hot`:``}`,href:l(e.id),style:X(e.color),...Q(t,L),children:[(0,V.jsx)(`img`,{className:`df-row-still ${se(e)}`,src:Y(e),alt:``,draggable:!1,decoding:`async`}),(0,V.jsxs)(`span`,{children:[(0,V.jsx)(`span`,{className:`df-row-name`,children:e.name}),(0,V.jsx)(`span`,{className:`df-row-hook`,children:e.hook}),e.ask&&(0,V.jsx)(me,{ask:!0})]}),(0,V.jsxs)(`span`,{className:`df-row-end`,children:[!e.ask&&(0,V.jsx)(me,{}),(0,V.jsx)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:(0,V.jsx)(`path`,{d:`M9 5l7 7-7 7`,fill:`none`,stroke:`currentColor`,strokeWidth:`2`,strokeLinecap:`round`,strokeLinejoin:`round`})})]})]})},e.id))}),(0,V.jsx)(`p`,{className:`df-credit`,children:xe}),(0,V.jsx)(Ce,{className:`df-pfoot`})]}):(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`div`,{className:`df-scene`,ref:d,inert:D||void 0,children:(0,V.jsx)(ge,{g:i,still:r,intro:x,pausedRef:y,hot:k,setHot:L,onReady:N,zoomRef:v},`desk`)}),(0,V.jsxs)(`main`,{className:`df-ui`,ref:f,inert:D||void 0,children:[(0,V.jsxs)(`div`,{className:`df-col`,style:{width:i.colW},children:[(0,V.jsx)(`h1`,{className:`df-wordmark`,children:`SuperHumans`}),(0,V.jsx)(`p`,{className:`df-tagline`,children:`Six AI health checks for astronauts, running in your browser.`}),(0,V.jsx)(he,{}),(0,V.jsx)(ve,{shown:H,hot:k,setHot:L,primary:!s})]}),(0,V.jsx)(_e,{g:i,hot:k,setHot:L}),(0,V.jsx)(pe,{}),(0,V.jsx)(`p`,{className:`df-credit`,children:xe}),(0,V.jsx)(Ce,{className:`df-topnav`})]})]}),(0,V.jsx)(`div`,{className:`df-glow`,ref:p,style:X(S?.color??`#8FB8FF`),"aria-hidden":`true`}),(0,V.jsx)(`div`,{className:`df-page`,ref:m,children:S&&(0,V.jsx)(be,{mod:S,live:T,pin:S.id===s?.id?W:void 0,sample:S.id===s?.id?re:void 0,onStatus:I},S.id)})]})}export{l as a,we as default,o as i,L as n,P as r,B as t};
const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./tracktrace-WAOxe9XG.js","./rolldown-runtime-XKyaHtl9.js","./index-C4hP4w5Z.js","./index-CvU9-K1k.css","./tracktrace-CYRqtgKz.js","./client-BYaCa7FH.js","./tracktrace-B8tYtE4W.css","./bubblegrade-CKFylMn3.js","./bubblegrade-BRiExi_q.js","./bubblegrade-BG81yi9O.css","./newsreader-In2980oI.css","./geist-mono-C5knphS1.css","./veinsqueeze-1DnIucJj.js","./veinsqueeze-D_tz-ele.css","./instrument-sans-BkCNIqpb.css","./braindrift-D6BB-MO3.js","./braindrift-Jx2KAqI4.js","./three.module-D8PUL0DB.js","./braindrift-DTcTzCBc.css","./garnmeter-v7eB3-HK.js","./garnmeter-DSGix8Yy.css","./spline-sans-mono-BSXwSnXg.css"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-XKyaHtl9.js";/* empty css                  *//* empty css              *//* empty css                   */import{Et as t,Tt as n,wt as r}from"./three.module-D8PUL0DB.js";/* empty css                   */import{n as i,s as a,t as o}from"./index-C4hP4w5Z.js";import{a as s,r as c,t as l}from"./react-three-fiber.esm-CsuHGihb.js";import{l as u,o as d}from"./spikecount-_DubC85x.js";var f=e(a(),1),p=[{id:`tracktrace`,n:`01`,name:`TrackTrace`,site:`Cells · radiation`,line:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,cta:`Scan the nucleus`,img:`_posters/tracktrace_portrait.jpg`},{id:`bubblegrade`,n:`02`,name:`BubbleGrade`,site:`Heart`,line:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,cta:`Play the heart sound`,img:`_posters/bubblegrade.jpg`},{id:`spikecount`,n:`03`,name:`SpikeCount`,site:`Blood`,line:`Every red blood cell, outlined. The spiky ones, counted.`,cta:`Grade this blood`,img:`spikecount/fields/96.png`},{id:`veinsqueeze`,n:`04`,name:`VeinSqueeze`,site:`Leg vein`,line:`A clot is a vein that won’t squash.`,cta:`Press on the veins`,img:`_posters/veinsqueeze.jpg`},{id:`braindrift`,n:`05`,name:`BrainDrift`,site:`Brain`,line:`In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.`,cta:`Fly the brain`,img:`_posters/braindrift.jpg`},{id:`garnmeter`,n:`06`,name:`Garn Meter`,site:`Inner ear`,line:`Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.`,cta:`Play the brainwaves`,img:`_posters/garnmeter.jpg`}],m=`Six AI health checks for astronauts, running in your browser.`,h=i();function g(){try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}var _=6,v=8.2,y=.045,b=Math.tan(19*Math.PI/180),x=15,S=.03,C=.09,w=`
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`,T=`
precision highp float;
uniform vec2 uRes;
uniform vec3 uCam, uRight, uUp, uFwd;
uniform float uTan, uTime, uReal, uHot;
uniform vec3 uLp[6];   // light in the disc plane: x, z, strength
uniform float uLa[6];  // its angle on the orbit
uniform vec4 uLs[6];   // its first image on screen: x, y (buffer px), size px, strength

#define R_IN 2.9
#define R_OUT 12.5
#define R_BOUND ${x.toFixed(1)}
#define HAZE_K 3.4

float hsh(vec3 p) {
  p = fract(p * vec3(0.2137, 0.3391, 0.1723) + 0.137);
  p += dot(p, p.zxy + 23.71);
  return fract((p.x + p.y) * p.z * 3.1);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hsh(i), hsh(i + vec3(1, 0, 0)), f.x), mix(hsh(i + vec3(0, 1, 0)), hsh(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(hsh(i + vec3(0, 0, 1)), hsh(i + vec3(1, 0, 1)), f.x), mix(hsh(i + vec3(0, 1, 1)), hsh(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}

// Streaks of the disc: long along the orbit, fine across it.
float lanes(float rr, float a) {
  vec2 cs = vec2(cos(a), sin(a));
  float n1 = vnoise(vec3(cs * 2.4, rr * 1.7));
  float n2 = vnoise(vec3(cs * 3.1 + 11.0, rr * 8.5));
  float n3 = vnoise(vec3(cs * 1.3 + 5.0, rr * 17.0));
  return 0.5 * n1 + 0.28 * n2 + 0.36 * n3;
}

vec4 disc(vec3 hp, vec3 v, float rr) {
  float u = (rr - R_IN) / (R_OUT - R_IN);
  float ang = atan(hp.z, hp.x);
  float om = 2.4 * pow(rr, -1.5);
  const float T = 10.0;
  float ph1 = fract(uTime / T), ph2 = fract(uTime / T + 0.5);
  float w1 = 1.0 - abs(2.0 * ph1 - 1.0);
  float g = mix(lanes(rr, ang - om * T * (ph2 - 0.5)), lanes(rr, ang - om * T * (ph1 - 0.5)), w1);
  float edge = smoothstep(0.0, 0.035, u) * (1.0 - smoothstep(0.5, 1.0, u));
  float dens = edge * (0.16 + 1.9 * g * g * g * 1.6);
  float I = dens * pow(R_IN / rr, 1.9) * 3.4;
  // the side turning toward us is brighter and whiter, the side turning away dimmer and redder
  vec3 tang = normalize(vec3(-hp.z, 0.0, hp.x));
  float beta = sqrt(0.5 / rr);
  float D = sqrt(1.0 - beta * beta) / (1.0 - beta * dot(tang, -normalize(v)));
  float boost = mix(1.0, D * D * D, 0.7);
  vec3 c = mix(vec3(1.0, 0.93, 0.82), vec3(1.0, 0.58, 0.22), smoothstep(0.0, 0.3, u));
  c = mix(c, vec3(0.78, 0.22, 0.05), smoothstep(0.28, 0.95, u));
  c *= mix(vec3(1.0, 0.78, 0.6), vec3(0.94, 0.99, 1.1), smoothstep(0.75, 1.35, D));
  return vec4(c * I * boost, clamp(dens * 0.85, 0.0, 0.9));
}

vec3 sky(vec3 d) {
  vec3 c = vec3(0.0);
  vec2 s = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
  for (int l = 0; l < 2; l++) {
    float cs = l == 0 ? 0.021 : 0.052;
    vec2 g = s / cs;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float fl = float(l) * 7.0;
    float h = hsh(vec3(id, 1.0 + fl));
    vec2 off = (vec2(hsh(vec3(id, 3.0 + fl)), hsh(vec3(id, 5.0 + fl))) - 0.5) * 0.7;
    float dd = length((f - off) * vec2(cos(s.y), 1.0)) * cs;
    float size = l == 0 ? 0.0011 : 0.0017;
    float star = smoothstep(size, 0.0, dd);
    float mag = pow(hsh(vec3(id, 9.0 + fl)), 7.0);
    vec3 tint = mix(vec3(1.0, 0.84, 0.68), vec3(0.74, 0.85, 1.0), hsh(vec3(id, 13.0 + fl)));
    c += step(0.87, h) * star * (0.10 + 1.7 * mag) * tint;
  }
  float n = vnoise(d * 2.1 + 3.0) * vnoise(d * 5.3 - 1.0);
  float band = smoothstep(0.55, 0.0, abs(d.y + 0.25 * d.x - 0.12));
  c += vec3(0.006, 0.009, 0.020) * smoothstep(0.14, 0.6, n) * (0.15 + 0.85 * band);
  return c;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 rd = normalize(uFwd + p.x * uTan * uRight + p.y * uTan * uUp);
  vec3 pos = uCam;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  float glow = 0.0;
  bool live = true;
  bool eaten = false;

  float b = dot(pos, rd);
  float c0 = dot(pos, pos) - R_BOUND * R_BOUND;
  if (c0 > 0.0) {
    float q = b * b - c0;
    if (q < 0.0 || b > 0.0) live = false;
    else pos += rd * (-b - sqrt(q));
  }
  vec3 vel = rd;
  if (live) {
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);
    float ea = exp(-HAZE_K * abs(pos.y));
    float rPrev = length(pos);
    vec3 vPrev = vel;
    for (int i = 0; i < STEPS; i++) {
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      if (r < 1.0) { eaten = true; break; }
      if (r2 > R_BOUND * R_BOUND * 1.02 && dot(pos, vel) > 0.0) {
        // leave at one exact radius, so neighbouring rays agree on the sky they see
        vel = mix(vPrev, vel, clamp((R_BOUND * 1.01 - rPrev) / max(r - rPrev, 1e-4), 0.0, 1.0));
        break;
      }
      rPrev = r;
      vPrev = vel;
      float dt = ${S.toFixed(2)} + ${C.toFixed(2)} * r;
      // light near a non-spinning black hole: pulled toward it by 1.5 h^2 / r^5 (h = its angular momentum)
      vel -= 1.5 * h2 * pos / (r2 * r2 * r) * dt;
      vec3 np = pos + vel * dt;
      float ya = abs(pos.y), yb = abs(np.y);
      float eb = exp(-HAZE_K * yb);
      float seg;
      if (pos.y * np.y < 0.0) {
        seg = (2.0 - ea - eb) / (HAZE_K * (ya + yb) + 1e-4);
        vec3 hp = mix(pos, np, ya / (ya + yb));
        float rr = length(hp.xz);
        vec3 add = vec3(0.0);
        float hang = atan(hp.z, hp.x);
        float lane = exp(-pow((rr - ${v.toFixed(1)}) / 0.085, 2.0));
        for (int k = 0; k < 6; k++) {
          vec2 dl = hp.xz - uLp[k].xy;
          float fall = 1.0 / (1.0 + dot(dl, dl) / 0.09);
          // the light, and the short trail it leaves along its orbit
          float back = mod(uLa[k] - hang + 6.2831853, 6.2831853);
          float tail = lane * exp(-back * 4.2) * step(back, 1.6);
          add += vec3(0.62, 0.84, 1.0) * uLp[k].z * (fall * fall * 5.0 + tail * 1.5);
        }
        col += trans * add;
        if (rr > R_IN && rr < R_OUT) {
          vec4 dc = disc(hp, vel, rr);
          col += trans * dc.rgb;
          trans *= 1.0 - dc.a;
        }
      } else {
        float dy = yb - ya;
        seg = abs(dy) < 1e-3 ? ea : (ea - eb) / (HAZE_K * dy);
      }
      float rm = length(0.5 * (pos.xz + np.xz));
      glow += trans * seg * dt * smoothstep(R_IN * 0.85, R_IN * 1.3, rm) * pow(R_IN / max(rm, R_IN), 2.6) * (1.0 - smoothstep(R_OUT * 0.55, R_OUT, rm));
      ea = eb;
      pos = np;
    }
  }
  col += glow * vec3(1.0, 0.6, 0.27) * 0.26;
  if (!eaten) col += trans * sky(normalize(vel));

  // the six lights: a round glow and a thin lens streak at each light's first (bent) image
  for (int k = 0; k < 6; k++) {
    vec4 L = uLs[k];
    float hot = 1.0 - step(0.5, abs(uHot - float(k)));
    float s = L.z * (1.0 + 0.45 * hot);
    vec2 dq = gl_FragCoord.xy - L.xy;
    float d2 = dot(dq, dq) / (s * s);
    float core = exp(-d2 * 2.4);
    float halo = pow(1.0 / (1.0 + d2), 1.7);
    float streak = exp(-abs(dq.y) / (0.15 * s)) / (1.0 + pow(abs(dq.x) / (3.6 * s), 3.0));
    col += L.w * (1.0 + 1.2 * hot) * (vec3(1.0) * core * 2.4 + vec3(0.5, 0.78, 1.0) * (halo * 0.55 + streak * 0.5));
  }

  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(0.4545));
  float vig = 1.0 - 0.22 * dot(p * vec2(0.55, 0.8), p * vec2(0.55, 0.8));
  col *= clamp(vig, 0.0, 1.0);
  col += (hsh(vec3(gl_FragCoord.xy, fract(uReal) * 91.0)) - 0.5) / 160.0;
  gl_FragColor = vec4(col, 1.0);
}
`;function E(e,t,n,r){let i=e.length(),a=O.copy(e).multiplyScalar(1/i),o=k.copy(t).addScaledVector(a,-t.dot(a)),s=o.length();if(s<1e-5)return!1;o.multiplyScalar(1/s);let c=t.dot(a),l=s,u=Math.hypot(c,l),d=c/u,f=l/u,p=Math.atan2(l,i-c),m=0,h=Math.min(Math.PI-.01,p+.7);for(let e=0;e<22;e++){let e=.5*(m+h);D(i,e,d,f,u,n)>0?h=e:m=e}let g=.5*(m+h);return r.copy(a).multiplyScalar(-Math.cos(g)).addScaledVector(o,Math.sin(g)),!0}function D(e,t,n,r,i,a){let o=e,s=0,c=-Math.cos(t),l=Math.sin(t);if(e>x){let t=o*c,n=t*t-(e*e-225);if(n<0||t>0)return 1;let r=-t-Math.sqrt(n);o+=c*r,s+=l*r}let u=o*l-s*c,d=u*u;for(let e=0;e<a;e++){let e=o*o+s*s,t=Math.sqrt(e);if(t<1)return-1;if(e>229.5&&o*c+s*l>0)return 1;let a=S+C*t,u=1.5*d*a/(e*e*t);c-=u*o,l-=u*s;let f=o+c*a,p=s+l*a,m=n*s-r*o,h=n*p-r*f;if(m<0&&h>=0&&f*n+p*r>0){let e=m/(m-h),t=o+(f-o)*e,a=s+(p-s)*e;return t*n+a*r>i?1:-1}o=f,s=p}return-1}var O=new n,k=new n,A=new n,j=new n,M=new n(0,1,0),N=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,P=e=>((e+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;function F({ctl:e,steps:i}){let{gl:a,size:o,setDpr:l}=s(),u=(0,f.useMemo)(()=>({uRes:{value:new r(1,1)},uCam:{value:new n},uRight:{value:new n},uUp:{value:new n},uFwd:{value:new n},uTan:{value:b},uTime:{value:0},uReal:{value:0},uHot:{value:-1},uLp:{value:Array.from({length:_},()=>new n)},uLs:{value:Array.from({length:_},()=>new t)},uLa:{value:[0,0,0,0,0,0]}}),[]),d=(0,f.useRef)({t:40,theta:.42,real:0,k:1,dur:1,target:void 0,from:{dist:31,az:Math.PI/2,el:.15,roll:-.09,look:new n},cur:{dist:31,az:Math.PI/2,el:.15,roll:-.09,look:new n},want:{dist:31,az:Math.PI/2,el:.15,roll:-.09,look:new n},tsFrom:1,tsBase:1,hoverF:1,homeW:1,px:0,py:0,arrived:!1,first:!0,acc:0,n:0,warm:0,dpr:0,clock:``,last:0,intro:!1,good:0,raises:0,dpr0:0,dx:[0,0,0,0,0,0]}),p=(0,f.useMemo)(()=>new r,[]);return c(()=>{let t=d.current;e.frames++;let r=performance.now(),s=t.last?(r-t.last)/1e3:.016;t.last=r;let c=Math.min(s,.05),f=o.width/Math.max(1,o.height),m=f<.8;if(e.target!==t.target){let n=t.target===void 0;t.from={...t.cur,look:t.cur.look.clone()},t.tsFrom=t.tsBase,t.dur=e.target==null?n?3.8:2.1:t.target==null||n?2.7:1.5,t.k=+!!e.snap,t.intro=n&&!e.snap,e.snap&&(t.tsFrom=0),e.snap=!1,t.target=e.target,t.arrived=!1}t.k=Math.min(1,t.k+Math.min(s,.3)/t.dur);let h=N(t.k);t.tsBase=t.target==null?t.tsFrom+(1-t.tsFrom)*h:t.tsFrom*(1-h)*(1-h);let g=e.hover!=null&&t.target==null?.22:1;t.hoverF+=(g-t.hoverF)*Math.min(1,c*5);let x=t.tsBase*t.hoverF;t.t+=c*x,t.theta+=c*x*y,t.real+=c;let S=t.want;if(t.target==null)S.dist=m?7.7/(b*f):Math.max(28,10.6/(b*f)),S.az=Math.PI/2,S.el=.105,S.roll=m?-.62:-.09,S.look.set(0,-S.dist*(m?.028:.05),0);else{let e=t.theta+t.target*Math.PI*2/_;S.dist=12.6,S.az=e-.55,S.el=.085,S.roll=.16,S.look.set(Math.cos(e)*v*.55,-.35,Math.sin(e)*v*.55)}t.intro&&(t.intro=!1,t.from={dist:S.dist*1.9,az:S.az-.55,el:.34,roll:S.roll-.3,look:new n(0,0,0)});let C=t.cur;C.dist=t.from.dist+(S.dist-t.from.dist)*h,C.el=t.from.el+(S.el-t.from.el)*h,C.roll=t.from.roll+(S.roll-t.from.roll)*h,C.az=t.from.az+P(S.az-t.from.az)*h,C.look.copy(t.from.look).lerp(S.look,h),t.k>=1&&(C.az=P(C.az)),t.homeW+=(+(t.target==null)-t.homeW)*Math.min(1,c*2.5),t.px+=(e.pointer[0]-t.px)*Math.min(1,c*2.2),t.py+=(e.pointer[1]-t.py)*Math.min(1,c*2.2);let w=C.az+t.homeW*(t.px*.11+.035*Math.sin(t.real*.11)),T=C.el+t.homeW*(-t.py*.045+.012*Math.sin(t.real*.07+1)),D=u.uCam.value.set(Math.cos(T)*Math.cos(w),Math.sin(T),Math.cos(T)*Math.sin(w)).multiplyScalar(C.dist),k=u.uFwd.value.copy(C.look).sub(D).normalize(),F=u.uRight.value.crossVectors(k,M).normalize(),I=u.uUp.value.crossVectors(F,k);C.roll!==0&&(F.applyAxisAngle(k,C.roll),I.applyAxisAngle(k,C.roll)),a.getDrawingBufferSize(p),u.uRes.value.copy(p),u.uTime.value=t.t,u.uReal.value=t.real,u.uHot.value=t.target==null?e.hover==null?-1:e.hover:t.target;let L=p.y/Math.max(1,o.height);for(let n=0;n<_;n++){let r=t.theta+n*Math.PI*2/_;j.set(Math.cos(r)*v,0,Math.sin(r)*v);let a=.9+.1*Math.sin(t.t*1.3+n*1.7);u.uLp.value[n].set(j.x,j.z,a),u.uLa.value[n]=(r%(Math.PI*2)+Math.PI*2)%(Math.PI*2);let s=!1,c=0,l=0;if(E(D,j,i,A)){let e=A.dot(k);e>.05&&(c=o.width/2+A.dot(F)/e/b*(o.height/2),l=o.height/2-A.dot(I)/e/b*(o.height/2),s=!0)}let d=O.copy(j).sub(D).length(),f=Math.min(46,o.height/900*7.5*(28/d)*(m?1.5:1));u.uLs.value[n].set(c*L,(o.height-l)*L,f*L,s?a:0);let p=e.labels[n];if(p){p.style.transform=`translate3d(${c.toFixed(1)}px, ${l.toFixed(1)}px, 0)`;let e=m?58:98,r=Math.round(Math.min(Math.max(c,e),o.width-e)-c);t.dx[n]!==r&&(t.dx[n]=r,p.style.setProperty(`--dx`,`${r}px`));let i=j.x*D.x+j.z*D.z>0?`f`:`b`;p.dataset.side!==i&&(p.dataset.side=i);let a=s&&c>-40&&c<o.width+40?`1`:`0`;p.dataset.vis!==a&&(p.dataset.vis=a)}}if(e.clock){let n=x>.995?`1.00`:x<.005?`0.00`:x.toFixed(2);n!==t.clock&&(t.clock=n,e.clock.textContent=n)}if(t.first&&(t.first=!1,e.onFirstFrame()),t.target!=null&&t.k>=1&&!t.arrived&&(t.arrived=!0,e.onArrive(t.target)),!e.pinQuality){if(t.dpr===0&&(t.dpr=t.dpr0=a.getPixelRatio()),t.warm<12)t.warm++;else if(t.acc+=s,t.n++,t.n>=20){let e=t.acc/t.n;t.acc=0,t.n=0,e>.024&&t.dpr>.62?(t.dpr=Math.max(.6,t.dpr*(e>.045?.66:.82)),l(t.dpr),t.warm=10,t.good=0):e<.0175&&t.dpr<t.dpr0&&t.raises<3?++t.good>=4&&(t.good=0,t.raises++,t.dpr=Math.min(t.dpr0,t.dpr*1.22),l(t.dpr),t.warm=10):t.good=0}}}),(0,h.jsxs)(`mesh`,{frustumCulled:!1,children:[(0,h.jsx)(`bufferGeometry`,{children:(0,h.jsx)(`bufferAttribute`,{attach:`attributes-position`,args:[new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3]})}),(0,h.jsx)(`shaderMaterial`,{vertexShader:w,fragmentShader:T,uniforms:u,defines:{STEPS:i},depthTest:!1,depthWrite:!1})]})}function I({ctl:e,active:t}){let n=(0,f.useMemo)(()=>typeof window<`u`&&window.matchMedia(`(pointer: coarse)`).matches,[]),[r,i]=(0,f.useState)(()=>typeof document<`u`&&document.hidden);(0,f.useEffect)(()=>{let e=()=>i(document.hidden);return document.addEventListener(`visibilitychange`,e),()=>document.removeEventListener(`visibilitychange`,e)},[]);let a=n?1.5:2,o=Math.min(typeof window<`u`&&window.devicePixelRatio||1,a),[s,c]=(0,f.useState)(0);return(0,h.jsx)(l,{onCreated:({gl:t})=>{t.domElement.addEventListener(`webglcontextlost`,t=>{t.preventDefault(),window.setTimeout(()=>{if(s>=4)return e.onLost();e.snap=e.target!=null,c(s+1)},60)})},className:`hole-canvas`,dpr:o,frameloop:r?`never`:t?`always`:`demand`,flat:!0,gl:{antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:`high-performance`},children:(0,h.jsx)(F,{ctl:e,steps:n?84:112})},s)}var L=(0,f.lazy)(()=>o(()=>import(`./tracktrace-WAOxe9XG.js`).then(e=>e.n),__vite__mapDeps([0,1,2,3,4,5,6]),import.meta.url)),R=(0,f.lazy)(()=>o(()=>import(`./bubblegrade-CKFylMn3.js`).then(e=>e.n),__vite__mapDeps([7,1,2,3,8,5,9,10,11]),import.meta.url)),z=(0,f.lazy)(()=>o(()=>import(`./veinsqueeze-1DnIucJj.js`).then(e=>e.r),__vite__mapDeps([12,1,2,3,5,13,14,11]),import.meta.url)),B=(0,f.lazy)(()=>o(()=>import(`./braindrift-D6BB-MO3.js`).then(e=>e.n),__vite__mapDeps([15,1,2,3,16,5,17,18,14,11]),import.meta.url)),V=(0,f.lazy)(()=>o(()=>import(`./garnmeter-v7eB3-HK.js`).then(e=>e.n),__vite__mapDeps([19,1,2,3,5,20,21]),import.meta.url)),H={"--m-stage":`#050506`,"--m-ink":`#f6f1e8`,"--m-ink-2":`#9a948a`,"--m-font":`'Geist Variable', 'Geist', ui-sans-serif, sans-serif`,"--m-font-mono":`'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace`,width:`100%`,height:`100%`},U={...H,"--m-mark":`#7b858f`,"--m-accent":`#8fb0ff`,"--m-ok":`#44c08a`,"--m-watch":`#e0b040`,"--m-alert":`#ff6a2b`,"--m-field-hi":`#f2ede4`,"--m-field-lo":`#000000`},W={...H,"--m-accent":`#ffb86b`,aspectRatio:`auto`},G=e=>e?{headline:e.headline,whoActs:e.whoActs}:null;function K(e){return(0,h.jsx)(f.Suspense,{fallback:(0,h.jsx)(`div`,{className:`hole-stage-wait`,children:`Loading the check…`}),children:(0,h.jsx)(q,{...e})})}function q({id:e,ref:t,onAct:n,onState:r}){let i=(0,f.useRef)(null),a=(0,f.useRef)(null),o=(0,f.useRef)(null),s=(0,f.useRef)(null),c=(0,f.useRef)(null),l=(0,f.useRef)(null),u=(0,f.useRef)(!1),d=(0,f.useRef)(!1);switch((0,f.useImperativeHandle)(t,()=>({run(){e===`tracktrace`?i.current?.run():e===`bubblegrade`?a.current?.run({sound:!0}):e===`veinsqueeze`?u.current?o.current?.run():d.current=!0:e===`braindrift`?s.current?.run():e===`garnmeter`?c.current?.run():l.current?.run()},reset(){n(null),e===`tracktrace`?i.current?.reset():e===`bubblegrade`?a.current?.reset():e===`veinsqueeze`?o.current?.reset():e===`braindrift`?s.current?.reset():e===`garnmeter`?c.current?.reset():l.current?.reset()}}),[e,n]),e){case`tracktrace`:return(0,h.jsx)(L,{ref:i,style:H,onState:r,onResult:(e,t)=>n(G(t))});case`bubblegrade`:return(0,h.jsx)(R,{ref:a,style:H,onState:r,onResult:(e,t)=>n(G(t))});case`veinsqueeze`:return(0,h.jsx)(z,{ref:o,style:W,onState:r,onResult:(e,t)=>n(G(t)),onReady:()=>{u.current=!0,d.current&&(d.current=!1,o.current?.run())}});case`braindrift`:return(0,h.jsx)(B,{ref:s,style:H,onState:r,onResult:(e,t)=>n(G(t))});case`garnmeter`:return(0,h.jsx)(V,{ref:c,style:U,onState:r,onResult:(e,t)=>n(G(t))});default:return(0,h.jsx)(X,{ref:l,onState:r,onAct:n})}}var J=`field-96`,Y=`./spikecount/fields/96.png`;function X({ref:e,onState:t,onAct:n}){let[r,i]=(0,f.useState)(null),[a,o]=(0,f.useState)(`idle`),s=(0,f.useRef)(void 0),c=(0,f.useRef)(0);(0,f.useEffect)(()=>()=>window.clearTimeout(s.current),[]),(0,f.useImperativeHandle)(e,()=>({run(){let e=++c.current;o(`running`),t(`running`),u(J).then(r=>{e===c.current&&(i(r),s.current=window.setTimeout(()=>{e===c.current&&(o(`result`),t(`result`),n(G(d(r))))},Math.min(3200,r.cells.length*14)+700))}).catch(()=>{e===c.current&&(o(`error`),t(`error`))})},reset(){c.current++,window.clearTimeout(s.current),i(null),o(`idle`),t(`idle`)}}),[n,t]);let l=(0,f.useMemo)(()=>r?[...r.cells].sort((e,t)=>e.center[0]-t.center[0]):[],[r]),p=l.length?Math.min(14,3200/l.length):0,m=r?.width??572,g=r?.height??572,_=l.filter(e=>e.cls>=1&&e.cls<=4).length;return(0,h.jsxs)(`div`,{className:`hole-spike`,"data-phase":a,children:[(0,h.jsxs)(`div`,{className:`hole-spike-field`,children:[(0,h.jsx)(`img`,{src:r?.imageUrl??Y,alt:`Microscope photo of red blood cells`,draggable:!1}),(0,h.jsx)(`svg`,{viewBox:`0 0 ${m} ${g}`,"aria-hidden":`true`,children:l.map((e,t)=>{let n=e.cls>=1&&e.cls<=4;return(0,h.jsx)(`polygon`,{className:n?`hole-cell is-spiky`:`hole-cell`,points:e.polygon.map(e=>`${e[0]},${e[1]}`).join(` `),pathLength:1,style:{animationDelay:`${Math.round(t*p)}ms`}},e.id)})}),a===`running`&&(0,h.jsx)(`i`,{className:`hole-spike-sweep`,"aria-hidden":`true`})]}),(0,h.jsxs)(`div`,{className:`hole-spike-read`,children:[a===`idle`&&(0,h.jsx)(`p`,{className:`hole-spike-hint`,children:`Outline every red blood cell in this photo, and count the spiky ones.`}),a===`error`&&(0,h.jsx)(`p`,{className:`hole-spike-hint`,children:`The stored outlines could not be loaded.`}),r&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsxs)(`p`,{className:`hole-spike-big`,children:[(0,h.jsx)(`b`,{children:r.metrics.n}),(0,h.jsx)(`span`,{children:`red blood cells outlined`})]}),(0,h.jsxs)(`p`,{className:`hole-spike-big is-hot`,"data-show":+(a===`result`),children:[(0,h.jsx)(`b`,{children:_}),(0,h.jsx)(`span`,{children:`graded spiky`})]}),(0,h.jsxs)(`ul`,{className:`hole-spike-key`,children:[(0,h.jsxs)(`li`,{children:[(0,h.jsx)(`i`,{className:`k-hot`}),` spiky`]}),(0,h.jsxs)(`li`,{children:[(0,h.jsx)(`i`,{className:`k-ok`}),` not spiky`]})]}),(0,h.jsx)(`span`,{className:`hole-tag`,children:`REPLAY · stored outputs of our two models`})]})]})]})}var Z=e=>{window.location.hash=`#/proto/HOLE/${e}`},Q=[[24,49,`f`],[41,56,`f`],[63,55,`f`],[78,47,`b`],[56,21,`b`],[33,30,`b`]];function $({view:e,params:t}){let n=p.findIndex(t=>t.id===e),[r,i]=(0,f.useState)(()=>g()&&t.get(`still`)!==`1`),[a,o]=(0,f.useState)(null),[s,c]=(0,f.useState)(!r),[l,u]=(0,f.useState)(!0),[d,_]=(0,f.useState)(!r),[v,y]=(0,f.useState)(null),b=n>=0?n:a,x=(0,f.useRef)(a);x.current=a;let S=(0,f.useRef)(null);S.current||={target:b,hover:null,pointer:[0,0],labels:[],clock:null,snap:n>=0,frames:0,pinQuality:t.get(`q`)===`1`,onArrive:()=>{},onFirstFrame:()=>{},onLost:()=>{}};let C=S.current;C.target=b,C.hover=b==null?v:null,C.onArrive=e=>{c(!0),u(!1),x.current===e&&Z(p[e].id)},C.onFirstFrame=()=>_(!0),C.onLost=()=>{i(!1),c(!0),_(!0),x.current!=null&&Z(p[x.current].id)},(0,f.useEffect)(()=>{n>=0?o(null):r&&c(!1)},[n,r]),(0,f.useEffect)(()=>{u(!0),y(null)},[b]);let w=(0,f.useCallback)(e=>{if(!r)return Z(p[e].id);c(!1),o(e)},[r]);(0,f.useEffect)(()=>{let e=e=>{e.metaKey||e.ctrlKey||e.altKey||(n<0&&a==null&&e.key>=`1`&&e.key<=`6`?w(Number(e.key)-1):e.key===`Escape`&&(n>=0?Z(`home`):o(null)))};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[n,a,w]);let T=b==null?`home`:n>=0&&s?`open`:`fly`;return(0,h.jsxs)(`div`,{className:`hole`,"data-phase":T,"data-ready":d?`1`:`0`,"data-webgl":r?`1`:`0`,onPointerMove:e=>{C.pointer=[e.clientX/window.innerWidth*2-1,e.clientY/window.innerHeight*2-1]},children:[(0,h.jsx)(`div`,{className:`hole-scene`,"aria-hidden":`true`,children:r?(0,h.jsx)(I,{ctl:C,active:T!==`open`||l}):(0,h.jsx)(`div`,{className:`hole-still`})}),(0,h.jsx)(`div`,{className:`hole-scrim`,"aria-hidden":`true`}),(0,h.jsxs)(`div`,{className:`hole-home`,inert:T!==`home`,children:[(0,h.jsxs)(`p`,{className:`hole-line`,children:[`Far from Earth, time and distance are the enemy. `,(0,h.jsx)(`span`,{children:`So the crew reads their own bodies.`})]}),(0,h.jsx)(`nav`,{className:`hole-lights`,"aria-label":`The six health checks`,children:p.map((e,t)=>(0,h.jsxs)(`button`,{type:`button`,className:`hole-light`,"data-side":r?`f`:Q[t][2],"data-vis":r?`0`:`1`,"data-hot":v===t?`1`:`0`,style:r?void 0:{left:`${Q[t][0]}%`,top:`${Q[t][1]}%`},ref:e=>{C.labels[t]=r?e:null},onClick:()=>w(t),onPointerEnter:e=>e.pointerType===`mouse`&&y(t),onPointerLeave:()=>y(e=>e===t?null:e),onFocus:()=>y(t),onBlur:()=>y(e=>e===t?null:e),children:[(0,h.jsx)(`span`,{className:`hole-light-ring`}),(0,h.jsxs)(`span`,{className:`hole-light-tag`,children:[(0,h.jsx)(`span`,{className:`hole-light-name`,children:e.name}),(0,h.jsxs)(`span`,{className:`hole-light-site`,children:[e.n,(0,h.jsxs)(`i`,{children:[` · `,e.site]})]})]})]},e.id))},r?`live`:`still`),(0,h.jsxs)(`div`,{className:`hole-title`,children:[(0,h.jsx)(`h1`,{children:`SuperHumans`}),(0,h.jsx)(`p`,{children:m})]}),(0,h.jsxs)(`p`,{className:`hole-hint`,children:[(0,h.jsx)(`span`,{className:`hole-hint-dot`}),` Press a light`]})]}),(0,h.jsxs)(`p`,{className:`hole-clock`,"data-stopped":T===`open`?`1`:`0`,children:[(0,h.jsx)(`span`,{className:`hole-clock-k`,children:`Time`}),(0,h.jsx)(`span`,{className:`hole-clock-x`,children:`×`}),(0,h.jsx)(`span`,{className:`hole-clock-v`,ref:e=>{C.clock=e},children:r?`1.00`:`0.00`})]}),(0,h.jsx)(`p`,{className:`hole-mark`,children:`AI-generated imagery`}),T===`open`&&(0,h.jsx)(ee,{check:p[n],index:n},p[n].id)]})}function ee({check:e,index:t}){let n=(0,f.useRef)(null),[r,i]=(0,f.useState)(`idle`),[a,o]=(0,f.useState)(null),s=(0,f.useCallback)(e=>o(e),[]),c=(0,f.useCallback)(e=>i(e),[]),[l,u]=(0,f.useState)(!1),d=(0,f.useRef)(0),m=(0,f.useRef)(!1),g=(0,f.useRef)(`idle`);(0,f.useEffect)(()=>{r===`idle`?g.current===`running`&&!m.current&&Date.now()-d.current<6e3&&(m.current=!0,u(!0)):u(!1),g.current=r},[r]),(0,f.useEffect)(()=>{if(!l)return;let e=0,t=window.setInterval(()=>{if(++e>14)return u(!1);n.current?.run()},700);return()=>window.clearInterval(t)},[l]);let _=()=>{if(r===`result`||r===`error`)return n.current?.reset();d.current=Date.now(),m.current=!1,u(!0),n.current?.run()},v=p[(t+p.length-1)%p.length],y=p[(t+1)%p.length];return(0,h.jsx)(`div`,{className:`hole-mod`,"data-state":r,"data-id":e.id,children:(0,h.jsxs)(`div`,{className:`hole-mod-in`,children:[(0,h.jsxs)(`header`,{className:`hole-head`,children:[(0,h.jsxs)(`button`,{type:`button`,className:`hole-back`,onClick:()=>Z(`home`),children:[(0,h.jsx)(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:(0,h.jsx)(`path`,{d:`M14.5 5 7.5 12l7 7`})}),(0,h.jsxs)(`span`,{children:[`Back`,(0,h.jsx)(`small`,{children:`time resumes`})]})]}),(0,h.jsxs)(`div`,{className:`hole-head-text`,children:[(0,h.jsxs)(`p`,{className:`hole-head-n`,children:[e.n,` `,(0,h.jsx)(`i`,{children:`/ 06`}),` `,(0,h.jsx)(`b`,{children:e.site}),(0,h.jsx)(`em`,{children:`Time × 0.00 · stopped`})]}),(0,h.jsx)(`h2`,{children:e.name}),(0,h.jsx)(`p`,{className:`hole-head-line`,children:e.line})]}),(0,h.jsx)(`button`,{type:`button`,className:`hole-run`,disabled:r===`running`||l,onClick:_,children:r===`running`?`Reading…`:r===`result`?`Start over`:r===`error`?`Try again`:l?`Starting…`:e.cta})]}),(0,h.jsx)(`section`,{className:`hole-stage`,"aria-label":`${e.name}, the working check`,children:(0,h.jsx)(K,{id:e.id,ref:n,onAct:s,onState:c})}),(0,h.jsxs)(`div`,{className:`hole-act`,"data-on":a?`1`:`0`,"aria-live":`polite`,children:[(0,h.jsx)(`span`,{className:`hole-act-k`,children:`What to do next`}),(0,h.jsx)(`p`,{className:`hole-act-h`,children:a?a.headline:`Run the check: it ends in what to do next.`}),a&&(0,h.jsx)(`p`,{className:`hole-act-w`,children:a.whoActs})]}),e.id===`tracktrace`&&(0,h.jsxs)(`figure`,{className:`hole-arch`,children:[(0,h.jsx)(`div`,{className:`hole-arch-card`,children:(0,h.jsx)(`img`,{src:`./tracktrace/ionscan_architecture.svg`,alt:`Diagram of the IonScan network, from the microscope image to the damage spots and the ion path`})}),(0,h.jsx)(`figcaption`,{children:`IonScan, our own 3.2 M-parameter network`})]}),(0,h.jsxs)(`footer`,{className:`hole-foot`,children:[(0,h.jsxs)(`button`,{type:`button`,onClick:()=>Z(v.id),children:[(0,h.jsx)(`small`,{children:`Previous light`}),(0,h.jsxs)(`span`,{children:[v.n,` `,v.name]})]}),(0,h.jsxs)(`button`,{type:`button`,className:`is-home`,onClick:()=>Z(`home`),children:[(0,h.jsx)(`small`,{children:`Release time`}),(0,h.jsx)(`span`,{children:`Back to the black hole`})]}),(0,h.jsxs)(`button`,{type:`button`,className:`is-next`,onClick:()=>Z(y.id),children:[(0,h.jsx)(`small`,{children:`Next light`}),(0,h.jsxs)(`span`,{children:[y.n,` `,y.name]})]})]}),(0,h.jsx)(`p`,{className:`hole-mod-mark`,children:`The black hole behind this page is AI-generated imagery, drawn live by our own code.`})]})})}export{$ as default};
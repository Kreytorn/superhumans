const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./tracktrace-DOgVAT34.js","./rolldown-runtime-XKyaHtl9.js","./index-CXFNwQMY.js","./index-CvU9-K1k.css","./tracktrace-CFLwFIW8.js","./client-CD6l6M49.js","./tracktrace-B8tYtE4W.css","./bubblegrade-EIh7Mj5X.js","./bubblegrade-Ty8Jirxm.js","./bubblegrade-BG81yi9O.css","./newsreader-In2980oI.css","./geist-mono-C5knphS1.css","./veinsqueeze-DTTuI81I.js","./honesty-D1yHS4ET.js","./veinsqueeze-BJSarZNv.css","./instrument-sans-BkCNIqpb.css","./braindrift-HRrvTp97.js","./braindrift-DFimSZpn.js","./three.module-DS1lwPcu.js","./braindrift-B_i9pn98.css","./garnmeter-Bn3bVOQi.js","./garnmeter-DB8lqCrR.css","./spline-sans-mono-BSXwSnXg.css","./Module-CS_muvlX.js","./spikecount-DVce7RGm.js"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";/* empty css            *//* empty css                   *//* empty css                        *//* empty css                   */import{n,r,s as i,t as a}from"./index-CXFNwQMY.js";var o=t(i(),1),s=`./`,c=[{id:`tracktrace`,n:`01`,name:`TrackTrace`,sentence:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,site:`A cell`,hue:`#ff5fb4`,img:`${s}_posters/tracktrace.jpg`,imgTall:`${s}_posters/tracktrace_portrait.jpg`,pos:[.185,.488,.035],out:[.55,.45,.7]},{id:`bubblegrade`,n:`02`,name:`BubbleGrade`,sentence:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,site:`Heart`,hue:`#ff7a3d`,img:`${s}_posters/bubblegrade.jpg`,imgTall:`${s}_posters/bubblegrade_portrait.jpg`,pos:[.06,.37,.085],out:[.25,.1,1]},{id:`spikecount`,n:`03`,name:`SpikeCount`,sentence:`Every red blood cell, outlined. The spiky ones, counted.`,site:`Forearm blood`,hue:`#ff4655`,img:`${s}_posters/spikecount.jpg`,imgTall:`${s}_posters/spikecount_portrait.jpg`,pos:[-.292,.355,.235],out:[-.5,.35,.8]},{id:`veinsqueeze`,n:`04`,name:`VeinSqueeze`,sentence:`A clot is a vein that won’t squash.`,site:`Leg vein`,hue:`#ffc23d`,img:`${s}_posters/veinsqueeze.jpg`,imgTall:`${s}_posters/veinsqueeze_portrait.jpg`,pos:[.118,-.16,.2],out:[.3,.55,.8]},{id:`braindrift`,n:`05`,name:`BrainDrift`,sentence:`In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.`,site:`Brain`,hue:`#4fc8ff`,img:`${s}_posters/braindrift.jpg`,imgTall:`${s}_posters/braindrift_portrait.jpg`,pos:[-.02,.785,.06],out:[-.1,.8,.6]},{id:`garnmeter`,n:`06`,name:`Garn Meter`,sentence:`Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.`,site:`Inner ear`,hue:`#a48dff`,img:`${s}_posters/garnmeter.jpg`,imgTall:`${s}_posters/garnmeter_portrait.jpg`,pos:[.072,.7,.02],out:[1,.1,.35]}],l=`Six AI health checks for astronauts, running in your browser.`;function u(e){return c.find(t=>t.id===e)}function d(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}var f=n(),p=[{id:`space`,label:`Space`,at:0},{id:`ship`,label:`Ship`,at:.42},{id:`body`,label:`Body`,at:.82}];function m({markRef:e,level:t,focus:n,open:r=-1,onLevel:i,onPlace:a,onHover:o}){return(0,f.jsxs)(`nav`,{className:`v6-rail`,"aria-label":`Zoom: from space to the body`,children:[(0,f.jsxs)(`div`,{className:`v6-rail-track`,children:[(0,f.jsx)(`span`,{className:`v6-rail-line`,"aria-hidden":`true`}),p.map(e=>(0,f.jsxs)(`button`,{type:`button`,className:`v6-rail-lvl${t===e.id?` is-on`:``}`,style:{top:`${e.at*100}%`},onClick:()=>i(e.id),"aria-label":`Zoom to ${e.label}`,children:[(0,f.jsx)(`span`,{children:e.label}),(0,f.jsx)(`i`,{"aria-hidden":`true`})]},e.id)),(0,f.jsx)(`span`,{className:`v6-rail-mark`,ref:e,"aria-hidden":`true`,style:r>=0?{top:`100%`}:void 0})]}),(0,f.jsx)(`ol`,{className:`v6-rail-places`,children:c.map((e,t)=>(0,f.jsx)(`li`,{children:(0,f.jsxs)(`button`,{type:`button`,className:`v6-rail-place${n===t?` is-focus`:``}${r===t?` is-open`:``}`,style:{"--h":e.hue},onClick:()=>a(t),onPointerEnter:()=>o?.(t),onFocus:()=>o?.(t),"aria-label":r===t?`${e.name}, open now`:`Go into ${e.name}`,"aria-current":r===t?`page`:void 0,children:[(0,f.jsx)(`span`,{children:e.name}),(0,f.jsx)(`i`,{"aria-hidden":`true`})]})},e.id))})]})}var h=(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],g=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],_=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],v=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],y=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],b=e=>_(e,1/Math.hypot(e[0],e[1],e[2])),x=(e,t,n)=>e+(t-e)*n,S=(e,t,n)=>[x(e[0],t[0],n),x(e[1],t[1],n),x(e[2],t[2],n)],C=e=>e<0?0:e>1?1:e,w=e=>{let t=C(e);return t*t*(3-2*t)},T=e=>{let t=C(e);return t<.5?4*t*t*t:1-(-2*t+2)**3/2},E=e=>1-(1-C(e))**3,D=Math.PI/180,O=(e,t)=>[Math.cos(t*D)*Math.sin(e*D),Math.sin(t*D),Math.cos(t*D)*Math.cos(e*D)],k=[0,.05,.12],ee=[0,0,-27],A=Math.log(.4),te=Math.log(2.3),j=Math.log(7.4),M=Math.log(170),N=Math.log(24e5);function ne(e,t){let n=b(O(e?18:27,e?6:7)),r=_(n,-1),i=b(y(r,[0,1,0])),a=y(i,r),o=t?.pc??(e?[.7,-.1,-.8]:[.7,-.2,-.8]),s=b(h(h(_(r,o[0]),_(i,o[1])),_(a,o[2]))),c=3e3,l=c/Math.sin((t?.rho??46)*D),u=_(s,l),d=b(g(r,_(s,v(r,s)))),f=b(h(h(_(s,.5),_(d,.85)),_(a,.12))),p=_(s,-1),m=b(O(e?62:70,8)),x=b(g(m,_(s,v(m,s)))),S=Math.exp(N)/1e3,C=_(s,l),w=e=>{let t=b(h(_(x,Math.cos(e)),_(p,Math.sin(e)))),n=_(t,S),r=g(C,n),i=Math.hypot(r[0],r[1],r[2]);return{gap:Math.acos(Math.max(-1,Math.min(1,v(_(t,-1),_(r,1/i)))))-Math.asin(Math.min(1,c/i)),sd:t}},T=0,E=1.3;for(let t=0;t<40;t++){let t=(T+E)/2;w(t).gap>(e?9:7)*D?T=t:E=t}let ne=w((T+E)/2).sd,re=(T+E)/2,ie=b(g(_(p,Math.cos(re)),_(x,Math.sin(re)))),ae=b(h(_(ne,-.95),_(ie,.32))),P=b(O(e?40:50,16)),F=[0,1,0];return{sun:f,sunFar:ae,pc:u,pr:c,keys:[{L:A,T:[.1,.47,.07],dir:b(O(30,16)),ax:.5,ay:.5,fov:42,up:F},{L:te,T:k,dir:b(O(18,5)),ax:.5,ay:.5,fov:36,up:F},{L:j,T:k,dir:n,ax:e?.5:.63,ay:e?.45:.5,fov:25,up:F},{L:M,T:ee,dir:P,ax:.5,ay:e?.46:.5,fov:30,up:F},{L:N,T:ee,dir:ne,ax:e?.5:.6,ay:e?.36:.4,fov:38,up:p}]}}function re(e,t){return b(S(e.sun,e.sunFar,w((t-M-1.5)/(N-M-3))))}function ie(e,t){if(t<=e[0].L)return{...e[0],L:t};let n=e[e.length-1];if(t>=n.L)return{...n,L:t};let r=0;for(;r<e.length-2&&t>e[r+1].L;)r++;let i=e[r],a=e[r+1];return ae(i,a,w((t-i.L)/(a.L-i.L)),t)}function ae(e,t,n,r=x(e.L,t.L,n)){return{L:r,T:S(e.T,t.T,n),dir:b(S(e.dir,t.dir,n)),ax:x(e.ax,t.ax,n),ay:x(e.ay,t.ay,n),fov:x(e.fov,t.fov,n),up:b(S(e.up,t.up,n))}}function P(e,t,n,r){let i=Math.exp(e.L),a=h(e.T,_(e.dir,i)),o=_(e.dir,-1),s=b(y(o,e.up)),c=y(s,o),l=Math.min(n,t*1.15)/2/Math.tan(e.fov*D/2),u=r??{};return u.co=a,u.cf=o,u.cr=s,u.cu=c,u.f=l,u.pp=[e.ax*t,e.ay*n],u.L=e.L,u}function F(e,t){let n=g(t,e.co),r=v(n,e.cf);return[e.pp[0]+e.f*v(n,e.cr)/r,e.pp[1]-e.f*v(n,e.cu)/r,r]}function oe(e,t,n,r,i,a){let o=P(e,r,i),s=o.co,c=Math.hypot(s[0]-t[0],s[1]-t[1],s[2]-t[2]),l=b(g(s,t)),[u,d]=F(o,t),f=b(h(b(n),_(l,.6))),p=T(a),m=E(a*1.25),v=x(Math.log(c),Math.log(.022),p);return{L:v,T:t,dir:b(S(l,f,w((Math.log(.55)-v)/(Math.log(.55)-Math.log(.03))))),ax:x(u/r,.5,m),ay:x(d/i,.5,m),fov:x(e.fov,46,p),up:e.up}}function se(e){let t=[[N,0],[M,.42],[j,.82],[A,1]];if(e>=t[0][0])return 0;for(let n=0;n<t.length-1;n++){let[r,i]=t[n],[a,o]=t[n+1];if(e<=r&&e>=a)return x(i,o,(r-e)/(r-a))}return 1}var I=`#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }`,ce=`#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uS;
uniform vec3 uCo;
uniform vec3 uCf;
uniform vec3 uCr;
uniform vec3 uCu;
uniform float uF;
uniform vec2 uPP;
uniform float uT;
uniform float uBeat;
uniform float uWave;
uniform float uPl[6];
uniform vec3 uPlPos[6];
uniform vec3 uPlCol[6];
uniform vec3 uSun;
uniform vec3 uPc;
uniform float uPr;
uniform float uNear;
uniform float uFar;
uniform float uExpo;
uniform int uZero;
uniform int uSteps;
out vec4 o;

const float ZN = .78;
const float RW = 1.12;
const float RH = 1.6;
const vec3 BC = vec3(0., .05, .12);
const vec3 HEART = vec3(.05, .372, .045);
const vec3 WARM = vec3(1., .5, .22);

float hash1(vec3 p){ p = fract(p * .1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
float hash2(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  float a = hash1(i), b = hash1(i + vec3(1,0,0)), c = hash1(i + vec3(0,1,0)), d = hash1(i + vec3(1,1,0));
  float e = hash1(i + vec3(0,0,1)), g = hash1(i + vec3(1,0,1)), h = hash1(i + vec3(0,1,1)), k = hash1(i + vec3(1,1,1));
  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z);
}

float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1. / l2;
  vec3 pa = p - a; float y = dot(pa, ba), z = y - l2; vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2, k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float sdCylZ(vec3 p, float r, float z0, float z1){
  vec2 d = vec2(length(p.xy) - r, abs(p.z - (z0 + z1) * .5) - (z1 - z0) * .5);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.));
}
float sdRCylZ(vec3 p, float r, float z0, float z1, float rr){
  vec2 d = vec2(length(p.xy) - r + rr, abs(p.z - (z0 + z1) * .5) - (z1 - z0) * .5 + rr);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - rr;
}
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }

float gEps = .001;
float sdCapB(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }

/* the person, weightless: arms float forward at chest height, hips and knees bent, feet pointed. No face.
   Head, arms and legs sit inside cheap bounds and are only built in detail when the point is near them. */
float sdBody(vec3 p){
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = sdEll(p - vec3(0., .395, 0.), vec3(.152, .16, .1));
  d = smin(d, sdRC(q, vec3(.02, .528, -.02), vec3(.165, .49, -.016), .054, .049), .05);
  d = smin(d, sdEll(q - vec3(.067, .426, .05), vec3(.07, .057, .05)), .05);
  d = smin(d, sdEll(p - vec3(0., .2, .008), vec3(.122, .145, .088)), .07);
  d = smin(d, sdEll(p - vec3(0., .035, -.005), vec3(.142, .105, .095)), .06);
  d = smin(d, sdEll(q - vec3(.068, -.005, -.045), vec3(.075, .085, .07)), .04);
  float hb = length(p - vec3(0., .67, .03)) - .19;
  if (hb < d + .03) {
    float h = sdEll(p - vec3(0., .712, .036), vec3(.081, .101, .095));
    h = smin(h, sdEll(p - vec3(0., .65, .072), vec3(.055, .052, .056)), .045);
    h = smin(h, sdEll(q - vec3(.08, .7, .028), vec3(.012, .026, .018)), .012);
    h = smin(h, sdRC(p, vec3(0., .545, -.006), vec3(0., .652, .03), .056, .047), .04);
    d = smin(d, h, .04);
  } else d = min(d, hb);
  float ab = sdCapB(q, vec3(.2, .45, 0.), vec3(.275, .39, .43), .12);
  if (ab < d + .03) {
    float a = sdEll(q - vec3(.182, .47, -.003), vec3(.057, .065, .06));
    a = smin(a, sdRC(q, vec3(.19, .465, 0.), vec3(.292, .336, .135), .047, .036), .03);
    a = smin(a, sdRC(q, vec3(.292, .336, .135), vec3(.272, .402, .366), .037, .026), .02);
    a = smin(a, sdRC(q, vec3(.272, .402, .366), vec3(.262, .41, .47), .029, .018), .022);
    d = smin(d, a, .03);
  } else d = min(d, ab);
  float lb = min(sdCapB(q, vec3(.09, -.03, 0.), vec3(.118, -.278, .305), .11), sdCapB(q, vec3(.118, -.278, .305), vec3(.136, -.66, .2), .085));
  if (lb < d + .03) {
    float g = sdRC(q, vec3(.088, -.03, 0.), vec3(.118, -.275, .305), .083, .053);
    g = smin(g, sdRC(q, vec3(.118, -.28, .305), vec3(.13, -.612, .15), .052, .031), .03);
    g = smin(g, sdRC(q, vec3(.13, -.612, .15), vec3(.143, -.712, .246), .034, .021), .025);
    d = smin(d, g, .045);
  } else d = min(d, lb);
  return d;
}

/* the ship: a long dark hull, the great round window in its nose, a spine, radiators, a tank and an engine bell */
float sdShip(vec3 p, out float m){
  float outer = sdRCylZ(p, RH, -15., ZN, .22);
  float inner = sdCylZ(p, RH - .13, -3.4, ZN - .2);
  float r = length(p.xy);
  float bore = max(r - RW, abs(p.z - ZN) - .5);
  float d = max(max(outer, -inner), -bore);
  m = 2.;
  float s = length(vec2(length(p.xy) - RH, abs(p.z + 8.5) - 3.)) - .08;
  if (p.z < -12.5 + gEps * 4.) {
    /* the long body behind the cabin, only built when the point is back there */
    s = min(s, sdRC(p, vec3(0., 0., -15.), vec3(0., 0., -19.5), RH * .9, .62));
    s = min(s, sdCylZ(p, .5, -60., -16.));
    s = min(s, sdRCylZ(p, 1.35, -51., -41., .55));
    s = min(s, sdRC(p, vec3(0., 0., -60.), vec3(0., 0., -64.5), .5, 1.45));
    float rad = sdBox(p - vec3(0., 0., -29.5), vec3(7.2, .03, 6.));
    if (rad < min(d, s)) { m = 5.; return rad; }
  } else s = min(s, p.z + 13.56);
  if (s < d) { d = s; m = 3.; }
  return d;
}

float gBody;
float gRim = 1.;
float map(vec3 p, out float m){
  float ds = sdShip(p, m);
  float db = sdCapB(p, vec3(0., -.62, .15), vec3(0., .7, .06), .47);
  if (db < .05) db = sdBody(p);
  gBody = db;
  if (db < ds) { m = 1.; return db; }
  return ds;
}
/* normals as a loop the compiler cannot unroll: one inlined copy of each distance function, so compiles stay fast */
vec3 tap(int i){ return .5773 * (2. * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.); }
vec3 nrmB(vec3 p, float e){
  vec3 n = vec3(0.);
  for (int i = uZero; i < 4; i++) { vec3 k = tap(i); n += k * sdBody(p + k * e); }
  return normalize(n);
}
vec3 nrmS(vec3 p, float e){
  vec3 n = vec3(0.); float m;
  for (int i = uZero; i < 4; i++) { vec3 k = tap(i); n += k * sdShip(p + k * e, m); }
  return normalize(n);
}

vec2 isph(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c; float b = dot(oc, rd); float h = b * b - dot(oc, oc) + r * r;
  if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(-b - h, -b + h);
}

vec3 atmos(float sl){
  float lit = smoothstep(-.42, .08, sl);
  vec3 dusk = vec3(1., .42, .14), day = vec3(.22, .56, 1.);
  return mix(dusk, day, smoothstep(-.12, .5, sl)) * lit;
}
/* soft cell nuclei under the skin: nearest-point noise, three steps per axis */
float cells(vec3 p){
  vec3 i = floor(p), f = fract(p); float d = 1.;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(hash1(i + g), hash1(i + g + 17.3), hash1(i + g + 41.9));
    vec3 r = g + o - f; d = min(d, dot(r, r));
  }
  return d;
}
float fbm(vec3 p){ return .55 * vnoise(p) + .28 * vnoise(p * 2.1 + 3.1) + .17 * vnoise(p * 4.3 + 7.7); }

vec3 sky(vec3 roK, vec3 rd){
  vec3 col = vec3(.0007, .0009, .002);
  /* a few faint stars, no wallpaper */
  vec3 sp = rd * 140.; vec3 id = floor(sp); float hs = hash1(id);
  if (hs > .9962) {
    vec3 c = (id + .5 + (vec3(hash1(id + 1.), hash1(id + 2.), hash1(id + 3.)) - .5) * .7) / 140.;
    float a = length(cross(rd, normalize(c))) * uF;
    col += vec3(.75, .82, 1.) * exp(-a * a * 1.1) * (hs - .9962) * 260. * .45;
  }
  vec3 oc = roK - uPc; float b = dot(oc, rd); float c = dot(oc, oc) - uPr * uPr; float h = b * b - c;
  float H = uPr * .0035;
  float fwd = pow(max(dot(rd, uSun), 0.), 10.);
  if (h > 0. && -b - sqrt(h) > 0.) {
    float t = -b - sqrt(h); vec3 n = (oc + rd * t) / uPr;
    float sl = dot(n, uSun), mu = clamp(dot(n, -rd), 0., 1.);
    float cl = fbm(n * 14. + vec3(0., 0., uT * .002));
    float bands = smoothstep(.55, .85, cl);
    vec3 surf = mix(vec3(.003, .014, .04), vec3(.42, .48, .56), bands * .5);
    float day = smoothstep(-.04, .4, sl);
    col = surf * day * 1.4 + vec3(.0012, .0016, .004);
    /* the thin lit air seen edge-on near the limb */
    col += atmos(sl) * (pow(1. - mu, 26.) * 1.3 + pow(1. - mu, 5.) * .06) * (1. + 2.5 * fwd);
  } else if (-b > 0.) {
    vec3 cp = oc - rd * b;
    float alt = length(cp) - uPr;
    float sl = dot(normalize(cp), uSun);
    float a0 = max(alt, 0.);
    col += atmos(sl) * (exp(-a0 / H) * 1.3 + exp(-a0 / (H * 7.)) * .06) * (1. + 2.5 * fwd);
  }
  return col;
}

/* the lit air only, for the window glass reflection */
vec3 airOnly(vec3 roK, vec3 rd){
  vec3 oc = roK - uPc; float b = dot(oc, rd);
  if (-b <= 0.) return vec3(0.);
  vec3 cp = oc - rd * b; float alt = length(cp) - uPr;
  return atmos(dot(normalize(cp), uSun)) * exp(-abs(alt) / (uPr * .02)) * .8;
}

vec3 shadeBody(vec3 p, vec3 n, vec3 rd){
  float ndv = clamp(dot(n, -rd), 0., 1.);
  vec3 Lk = normalize(vec3(.35, .85, .45));
  float wrap = clamp((dot(n, Lk) + .7) / 1.7, 0., 1.);
  float th = 0., aoD = 0.;
  for (int i = uZero; i < 2; i++) { float v = sdBody(p + n * (i == 0 ? -.045 : .06)); if (i == 0) th = v; else aoD = v; }
  float thin = clamp(1. + th / .045, 0., 1.);
  /* warmth falls off from the core: golden chest, copper limbs, deep red hands and feet */
  vec3 cp = p - vec3(0., .3, .04); float cd = dot(cp, cp);
  float core = exp(-cd / .16);
  float far = smoothstep(.08, .5, cd);
  vec3 lit = mix(vec3(1., .46, .16), vec3(.8, .2, .07), far);
  lit = mix(lit, vec3(.72, .15, .05), (1. - gRim) * .7);
  vec3 sss = mix(vec3(.07, .004, .002), lit, smoothstep(.05, 1., wrap));
  vec3 col = sss * (.05 + .4 * wrap * wrap) * mix(.55, 1., gRim);
  vec3 hp = p - HEART; float hd = length(hp);
  float heart = exp(-hd * hd / .005) * (.3 + 1.3 * uBeat);
  /* each beat sends a soft wave of light out from the heart, under the skin */
  float wave = exp(-pow((hd - uWave * 1.25) / .08, 2.)) * (1. - uWave) * (1. - uWave);
  col += vec3(1., .36, .08) * (heart * .7 + core * .26 * mix(.35, 1., gRim) * (.8 + .4 * uBeat) + thin * thin * .14 * (1. - far * .5));
  col += vec3(1., .58, .22) * wave * .5;
  /* up close the skin shows its cells, faintly lit from below */
  if (gRim < .99) {
    float ce = cells(p * 42.);
    col += vec3(1., .4, .12) * exp(-ce * 4.) * (1. - gRim) * .16 * (.6 + .8 * uBeat);
    col *= mix(1., .86 + .14 * smoothstep(.05, .45, ce), 1. - gRim);
  }
  float ao = clamp(.3 + .7 * aoD / .06, 0., 1.);
  col *= mix(.4, 1., ao);
  float fr = pow(1. - ndv, 2.4);
  vec3 Lc = normalize(uSun * .5 + normalize(uPc) * .8);
  col += vec3(.16, .42, 1.) * fr * (.15 + .85 * clamp(dot(n, Lc) * .5 + .5, 0., 1.)) * 1.5 * gRim;
  /* a thin warm skin of light just inside the outline */
  col += vec3(1., .5, .2) * smoothstep(.55, .8, 1. - ndv) * (1. - smoothstep(.8, .95, 1. - ndv)) * .12;
  for (int i = 0; i < 6; i++) {
    vec3 dp = p - uPlPos[i]; float d2 = dot(dp, dp);
    col += (uPlCol[i] + vec3(.35) * exp(-d2 / .00012)) * uPl[i] * (exp(-d2 / .00035) * 1.8 + exp(-d2 / .004) * .3);
  }
  return col;
}

vec3 shadeShip(vec3 p, vec3 n, vec3 rd, float m, float t){
  float r = length(p.xy);
  float px = t / uF;
  vec3 pd = normalize(uPc);
  float bounce = clamp(dot(n, pd) * .5 + .5, 0., 1.); bounce *= bounce * bounce;
  float sd = max(dot(n, uSun), 0.);
  float spec = pow(max(dot(reflect(rd, n), uSun), 0.), 140.) * .3;
  float fr = pow(1. - clamp(dot(n, -rd), 0., 1.), 5.);
  if (m < 2.5 && r < RH - .07 && p.z < ZN - .16 && p.z > -3.45) {
    /* inside the cabin: dark and warm, lit only by the person */
    vec3 q = p - vec3(0., .2, .05);
    float li = 1. / (1. + dot(q, q) * 1.5);
    float rib = 1. - smoothstep(.0, .025 + px, abs(fract(p.z / .55) - .5) * .55);
    float cr = 1. - smoothstep(.0, .025 + px, abs(fract(r / .32) - .5) * .32);
    float back = step(.5, n.z);
    vec3 c = vec3(.045, .014, .007) * li * li;
    c += WARM * li * li * (rib * (1. - back) + cr * back) * .2;
    return c;
  }
  if (m < 2.5 && r < RW + .02 && abs(n.z) < .6 && p.z > ZN - .26 && p.z < ZN + .02) {
    /* the window's bore: lit warm from inside, a bright lip at the glass */
    float k = smoothstep(ZN - .26, ZN, p.z);
    vec3 c = WARM * mix(.2, .025, k);
    c += vec3(1., .7, .42) * (1. - smoothstep(0., .006 + px, ZN - p.z)) * .45;
    c += vec3(1., .5, .2) * (1. - smoothstep(0., .006 + px, p.z - (ZN - .2))) * .3;
    return c;
  }
  vec3 base = vec3(.016, .018, .023);
  float seam = 0.;
  if (m < 3.5) {
    float ring = abs(fract(p.z / 1.7) - .5) * 1.7;
    float ang = atan(p.y, p.x) / 6.2831853 * 16.;
    float lon = abs(fract(ang) - .5) * (6.2831853 * r / 16.);
    seam = (1. - smoothstep(0., .012 + px, ring)) + (1. - smoothstep(0., .012 + px, lon)) * step(n.z * n.z, .5);
    /* faint panel-to-panel tone so the hull reads as metal, not plastic */
    base *= .8 + .4 * hash1(floor(vec3(ang, p.z / 1.7, 0.)));
  }
  if (m > 4.5) {
    float g = abs(fract(p.x / .9) - .5) * .9;
    seam = (1. - smoothstep(0., .02 + px, g)) * .7;
    base = vec3(.012, .011, .009);
    spec *= .25;
  }
  vec3 col = base * (.25 + 4. * sd * vec3(1., .9, .78) + 1.5 * bounce * vec3(.3, .55, 1.));
  col *= 1. - .5 * seam;
  col += vec3(1., .9, .75) * spec * .55 + vec3(.3, .5, 1.) * fr * .1;
  /* the sun behind the ship draws its outline */
  float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.) * smoothstep(-.2, .6, dot(n, uSun) + dot(rd, uSun) * .5);
  col += vec3(1., .86, .7) * rim * (m > 4.5 ? .03 : .22) + vec3(.25, .45, .9) * bounce * .012;
  /* warm spill from the window onto the nose */
  if (p.z > ZN - .3 && m < 2.5) {
    float e = max(r - RW, 0.);
    col += (vec3(1., .42, .14) * exp(-e / .1) * .13 + vec3(1., .66, .38) * exp(-e / (.004 + px)) * .3) * smoothstep(.2, .9, n.z);
  }
  return col;
}

vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

void main(){
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uS;
  vec3 rd = normalize(uCf * uF + uCr * (sp.x - uPP.x) - uCu * (sp.y - uPP.y));
  vec3 ro = uCo;
  vec3 col = vec3(0.);
  bool hit = false; float m = 0.; float t = 1e9;
  float pixAng = 1. / uF;
  float bMin = 1e9, bT = 0.;
  if (uNear > .001) {
    vec2 bs = isph(ro, rd, vec3(0., 0., -27.), 42.);
    if (bs.y > 0.) {
      float tt = max(bs.x, 0.), tmax = bs.y;
      for (int i = uZero; i < uSteps; i++) {
        vec3 p = ro + rd * tt; float mm;
        gEps = .45 * tt * pixAng + 1e-5;
        float d = map(p, mm);
        float bpx = gBody / (tt * pixAng);
        if (bpx < bMin) { bMin = bpx; bT = tt; }
        if (d < .45 * tt * pixAng + 1e-5) { hit = true; m = mm; t = tt; break; }
        tt += d * .92;
        if (tt > tmax) break;
      }
    }
  }
  /* what is behind the person: ship or sky */
  if (hit && m > 1.5) {
    vec3 p = ro + rd * t;
    col = shadeShip(p, nrmS(p, max(.0006, .5 * t * pixAng)), rd, m, t);
  } else if (!hit) {
    col = sky(ro * .001, rd);
  }
  /* the person, shaded once: a hit, or the soft edge of a near miss */
  float wB = 0.; float tB = 0.;
  if (hit && m < 1.5) { wB = 1.; tB = t; }
  else if (bMin < 1.6 && bT < t) { wB = (1. - smoothstep(0., 1.6, bMin)) * .85; tB = bT; }
  if (wB > 0.) {
    vec3 p = ro + rd * tB;
    gRim = clamp(tB / 2.5, .2, 1.);
    col = mix(col, shadeBody(p, nrmB(p, max(.0006, .5 * tB * pixAng)), rd), wB);
  }
  if (uNear > .001) {
    /* the window glass: a faint sheen when seen from outside */
    if (ro.z > ZN && rd.z < 0.) {
      float tg = (ZN - ro.z) / rd.z; vec3 g = ro + rd * tg;
      if (tg < t && length(g.xy) < RW) {
        float f = .03 + .5 * pow(1. - abs(rd.z), 5.);
        vec3 rr = reflect(rd, vec3(0., 0., 1.));
        col += airOnly(ro * .001, rr) * f + vec3(.5, .7, 1.) * f * .02;
      }
    }
    /* warm air round the person, so the window glows */
    vec3 v = BC - ro; float tb = dot(v, rd);
    if (tb > 0.) { vec3 e = v - rd * min(tb, t); float d2 = dot(e, e); col += WARM * (exp(-d2 / .35) * .035 + exp(-d2 / 1.6) * .012) * uNear; }
    /* the six places, glowing through the skin */
    for (int i = 0; i < 6; i++) {
      vec3 w = uPlPos[i] - ro; float tp = dot(w, rd);
      if (tp > 0. && tp < t + .04) {
        vec3 e = w - rd * tp; float d2 = dot(e, e);
        float r1 = max(.011, 2.2 * tp * pixAng);
        col += uPlCol[i] * uPl[i] * (exp(-d2 / (r1 * r1)) * .9 + exp(-d2 / .0036) * .16) * uNear;
      }
    }
    /* navigation lights */
    vec3 nl[3] = vec3[3](vec3(-7.2, 0., -24.), vec3(7.2, 0., -24.), vec3(0., 0., -64.6));
    vec3 nc[3] = vec3[3](vec3(1., .15, .1), vec3(.2, 1., .45), vec3(1.));
    for (int i = 0; i < 3; i++) {
      vec3 w = nl[i] - ro; float tp = dot(w, rd);
      if (tp > 0. && tp < t + .5) {
        float a = length(w - rd * tp) / tp * uF;
        float blink = i == 2 ? step(.9, fract(uT * .7)) : .55 + .45 * step(.5, fract(uT * .5 + float(i) * .5));
        col += nc[i] * exp(-a * a * .5) * blink * .9 * uNear;
      }
    }
  }
  /* far away the window is one warm point */
  if (uFar > .001) {
    vec3 w = vec3(0., 0., ZN) - ro; float tw = dot(w, rd);
    if (tw > 0.) { float a = length(w - rd * tw) / tw * uF; col += vec3(1., .6, .3) * (exp(-a * a * .3) * 2.2 + exp(-a * .25) * .12) * uFar; }
  }
  col *= uExpo;
  vec2 uv = sp / (uRes / uS);
  col *= 1. - .32 * dot(uv - .5, uv - .5);
  col = aces(col * 1.15);
  col = pow(col, vec3(1. / 2.2));
  col += (hash2(gl_FragCoord.xy + fract(uT) * 91.) - .5) / 180.;
  o = vec4(col, 1.);
}`,L=[`uRes`,`uS`,`uCo`,`uCf`,`uCr`,`uCu`,`uF`,`uPP`,`uT`,`uBeat`,`uWave`,`uPl`,`uPlPos`,`uPlCol`,`uSun`,`uPc`,`uPr`,`uNear`,`uFar`,`uExpo`,`uZero`,`uSteps`],le=class{gl;prog;buf;u;scale=1;maxScale=1;minScale=.5;cssW=1;cssH=1;lost=!1;ft=16;plPos=new Float32Array(18);plCol=new Float32Array(18);canvas;constructor(e,t,n,r,i){this.canvas=e;let a=e.getContext(`webgl2`,{antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:`high-performance`,preserveDrawingBuffer:!1});if(!a)throw Error(`no webgl2`);this.gl=a;let o=(e,t)=>{let n=a.createShader(e);if(a.shaderSource(n,t),a.compileShader(n),!a.getShaderParameter(n,a.COMPILE_STATUS))throw Error(a.getShaderInfoLog(n)??`shader`);return n},s=a.createProgram(),c=o(a.VERTEX_SHADER,I),l=o(a.FRAGMENT_SHADER,ce);if(a.attachShader(s,c),a.attachShader(s,l),a.linkProgram(s),!a.getProgramParameter(s,a.LINK_STATUS))throw Error(a.getProgramInfoLog(s)??`link`);a.deleteShader(c),a.deleteShader(l),this.prog=s,a.useProgram(s),this.buf=a.createBuffer(),a.bindBuffer(a.ARRAY_BUFFER,this.buf),a.bufferData(a.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),a.STATIC_DRAW);let u=a.getAttribLocation(s,`p`);a.enableVertexAttribArray(u),a.vertexAttribPointer(u,2,a.FLOAT,!1,0,0),this.u=Object.fromEntries(L.map(e=>[e,a.getUniformLocation(s,e)])),n.forEach((e,t)=>this.plPos.set(e,t*3)),r.forEach((e,t)=>this.plCol.set(e,t*3)),a.uniform3fv(this.u.uPlPos,this.plPos),a.uniform3fv(this.u.uPlCol,this.plCol),a.uniform3fv(this.u.uSun,t.sun),a.uniform3fv(this.u.uPc,t.pc),a.uniform1f(this.u.uPr,t.pr),a.uniform1i(this.u.uZero,0),a.uniform1i(this.u.uSteps,i?110:140);let d=Math.min(window.devicePixelRatio||1,1.5);this.maxScale=i?d:1.25,this.minScale=i?.5:.55,this.scale=i?Math.min(d,1.1):1}resize(e,t){this.cssW=e,this.cssH=t;let n=Math.max(1,Math.round(e*this.scale)),r=Math.max(1,Math.round(t*this.scale));(this.canvas.width!==n||this.canvas.height!==r)&&(this.canvas.width=n,this.canvas.height=r),this.gl.viewport(0,0,n,r)}calm=0;wait=1500;adapt(e){this.ft=this.ft*.85+Math.min(e,100)*.15;let t=this.scale;this.ft>24&&t>this.minScale?(t=Math.max(this.minScale,t-.1),this.calm=0,this.wait=Math.min(12e3,this.wait*2),this.ft=17):this.ft<18.5?(this.calm+=e,this.calm>this.wait&&t<this.maxScale&&(t=Math.min(this.maxScale,t+.1),this.calm=0)):this.calm=0,t!==this.scale&&(this.scale=t,this.resize(this.cssW,this.cssH))}draw(e,t){if(this.lost)return;let n=this.gl,r=this.u;n.uniform2f(r.uRes,this.canvas.width,this.canvas.height),n.uniform1f(r.uS,this.canvas.width/this.cssW),n.uniform3f(r.uCo,e.co[0],e.co[1],e.co[2]),n.uniform3f(r.uCf,e.cf[0],e.cf[1],e.cf[2]),n.uniform3f(r.uCr,e.cr[0],e.cr[1],e.cr[2]),n.uniform3f(r.uCu,e.cu[0],e.cu[1],e.cu[2]),n.uniform1f(r.uF,e.f),n.uniform2f(r.uPP,e.pp[0],e.pp[1]),n.uniform1f(r.uT,t.t),n.uniform1f(r.uBeat,t.beat),n.uniform1f(r.uWave,t.wave),n.uniform1fv(r.uPl,t.pl),n.uniform1f(r.uNear,t.near),n.uniform1f(r.uFar,t.far),n.uniform1f(r.uExpo,t.expo),n.uniform3f(r.uSun,t.sun[0],t.sun[1],t.sun[2]),n.drawArrays(n.TRIANGLES,0,3)}dispose(){let e=this.gl;e.deleteBuffer(this.buf),e.deleteProgram(this.prog),e.getExtension(`WEBGL_lose_context`)?.loseContext()}},ue=`./`,R=700,z=3900,de=4700,fe=6700,pe=[A,te,j,M,N],me={space:N,ship:M,body:j},he=Math.log(15e3),ge=Math.log(4e4),_e=Math.log(25),ve=Math.log(400),ye=e=>(1-Math.cos(Math.PI*C(e)))/2;function be(e){return e<R?A:e<z?x(A,N,ye((e-R)/3200)):e<de?N-.06*w((e-z)/800):x(N-.06,j,ye((e-de)/2e3))}function xe(e){let t=e%1.12/1.12,n=(e,n)=>Math.exp(-(((t-e)/n)**2));return n(.07,.05)+.55*n(.25,.06)}function Se(e){return e>(M+N)/2?`space`:e>(j+M)/2?`ship`:`body`}var B={tracktrace:()=>a(()=>import(`./tracktrace-DOgVAT34.js`).then(e=>e.n),__vite__mapDeps([0,1,2,3,4,5,6]),import.meta.url),bubblegrade:()=>a(()=>import(`./bubblegrade-EIh7Mj5X.js`).then(e=>e.n),__vite__mapDeps([7,1,2,3,8,5,9,10,11]),import.meta.url),veinsqueeze:()=>a(()=>import(`./veinsqueeze-DTTuI81I.js`).then(e=>e.r),__vite__mapDeps([12,1,2,3,5,13,14,15,11]),import.meta.url),braindrift:()=>a(()=>import(`./braindrift-HRrvTp97.js`).then(e=>e.n),__vite__mapDeps([16,1,2,3,17,5,18,19,15,11]),import.meta.url),garnmeter:()=>a(()=>import(`./garnmeter-Bn3bVOQi.js`).then(e=>e.n),__vite__mapDeps([20,1,2,3,5,21,22]),import.meta.url)};function Ce(e){a(()=>import(`./Module-CS_muvlX.js`),__vite__mapDeps([23,1,2,3,24,5]),import.meta.url).catch(()=>{}),e&&B[e]&&B[e]().catch(()=>{})}function V({params:e}){let t=(0,o.useRef)(null),n=(0,o.useRef)(null),i=(0,o.useRef)([]),a=(0,o.useRef)(null),s=(0,o.useRef)(null),u=e.get(`from`),p=u?c.findIndex(e=>e.id===u):-1,[g,v]=(0,o.useState)(0),[S,E]=(0,o.useState)(p>=0?p:0),[D,O]=(0,o.useState)(-1),[k,ee]=(0,o.useState)(null),[M,ae]=(0,o.useState)(!1),[I,ce]=(0,o.useState)(!1),[L,R]=(0,o.useState)(!1),[z,B]=(0,o.useState)(p),[V,we]=(0,o.useState)(!1),[H,U]=(0,o.useState)({l:null,n:0}),W=(0,o.useRef)(null),G=(0,o.useRef)(0),Te=(0,o.useRef)(S),K=(0,o.useRef)(D);Te.current=S,K.current=D,(0,o.useEffect)(()=>{let o=t.current,l=n.current,u=!1;try{u=matchMedia(`(prefers-reduced-motion: reduce)`).matches}catch{}let f=o.clientWidth||innerWidth,m=o.clientHeight||innerHeight,g=f<700;we(g);let S=e.get(`pc`),D=ne(g,{pc:S?S.split(`,`).map(Number):void 0,rho:e.get(`rho`)?Number(e.get(`rho`)):void 0}),k=D.keys,M=document.createElement(`canvas`);M.className=`v6-gl`,M.setAttribute(`aria-hidden`,`true`),l.appendChild(M);let I=null;try{I=new le(M,D,c.map(e=>e.pos),c.map(e=>d(e.hue)),g),I.resize(f,m)}catch(e){console.warn(`V06: WebGL2 unavailable, showing the still`,e),I=null,R(!0)}let L=e=>{e.preventDefault(),I&&(I.lost=!0),R(!0)};M.addEventListener(`webglcontextlost`,L);let ue=e.get(`L`),z=e.get(`dive`),V=e.get(`du`),H=e.get(`hot`),U=e.get(`to`),Te=u||e.get(`intro`)===`0`||!I,K={mode:`intro`,t0:performance.now(),L:A,Lgoal:j,fly:{L0:0,L1:0,t0:0,dur:1},dive:{i:0,from:k[2],t0:0,dur:1e3,u:0},ox:0,oy:0,tox:0,toy:0,hot:-1,focus:p>=0?p:0,pl:new Float32Array(6),last:performance.now(),readyAt:0,frames:0,level:null,placesOn:!1,ui:0,afterRet:U&&me[U]!==void 0?me[U]:null},q={t:0,beat:0,wave:1,pl:K.pl,near:1,far:0,expo:1,sun:D.sun},J=P(k[0],f,m),Y=e=>{K.ui!==e&&(K.ui=e,v(e))},X=(e=0)=>{K.readyAt||=performance.now()+e},Z=e=>{K.mode!==`dive`&&K.mode!==`ret`&&(K.fly={L0:K.L,L1:e,t0:performance.now(),dur:u?1:Math.min(2600,700+120*Math.abs(e-K.L))},K.mode=`fly`,K.Lgoal=e,Y(2))},Ee=()=>{K.mode===`intro`&&(Z(j),K.fly.dur=u?1:1e3)},Q=()=>ie(k,K.L),De=e=>{if(K.mode===`dive`||K.mode===`ret`||e<0||e>5)return;let t=K.mode===`intro`?k[2]:Q();K.dive={i:e,from:t,t0:performance.now(),dur:u?1:950+80*Math.max(0,t.L-j),u:0},K.mode=`dive`,K.focus=e,E(e),B(e),o.dataset.diving=`1`,Ce(c[e].id)},Oe=e=>{K.hot=e,e>=0&&(K.focus=e,E(e)),O(e)};if(W.current={dive:De,fly:Z,hot:Oe,focus:e=>{K.focus=e,E(e)}},p>=0)K.mode=`ret`,K.dive={i:p,from:k[2],t0:performance.now(),dur:u?1:1150,u:1},Y(2);else if(e.get(`it`)!==null){let t=Number(e.get(`it`));K.mode=`freeze`,K.L=be(t),Y(t>=fe?2:+(t>3700)),X(700)}else ue===null?z===null?Te&&(K.mode=`free`,K.L=j,Y(2),X(250)):(K.mode=`freeze`,K.dive={i:Number(z),from:k[2],t0:0,dur:1,u:Number(V??.5)},B(Number(z)),Y(2),X(700)):(K.mode=`freeze`,K.L=Number(ue),Y(Number(e.get(`ui`)??2)),X(700));H!==null&&Oe(Number(H));let ke=0,Ae=!1,je=e=>{if(ke=requestAnimationFrame(je),document.hidden)return;let t=Math.min(100,Math.max(0,e-K.last))||0;K.last=e;let n,l=-1;if(K.mode===`intro`){K.frames===0&&(K.t0=e);let t=e-K.t0;K.L=be(t),t>3700&&Y(Math.max(K.ui,1)),t>=fe&&(K.mode=`free`,K.L=j,K.Lgoal=j,Y(2),X(350)),n=Q()}else if(K.mode===`fly`){let t=(e-K.fly.t0)/K.fly.dur;K.L=x(K.fly.L0,K.fly.L1,ye(t)),t>=1&&(K.mode=`free`,K.L=K.fly.L1,K.Lgoal=K.L,X(300)),n=Q()}else if(K.mode===`free`)K.L+=(K.Lgoal-K.L)*(1-Math.exp(-t/140)),n=Q();else if(K.mode===`dive`||K.mode===`ret`||K.mode===`freeze`&&z!==null){let t=K.dive.u;K.mode===`dive`&&(t=C((e-K.dive.t0)/K.dive.dur)),K.mode===`ret`&&(t=1-C((e-K.dive.t0)/K.dive.dur)),K.dive.u=t;let i=c[K.dive.i];n=oe(K.dive.from,i.pos,i.out,f,m,t),K.L=n.L,l=K.mode===`ret`?C((t-.62)/.38):C((t-.7)/.3),K.mode===`dive`&&t>=1&&!o.dataset.left&&(o.dataset.left=`1`,r(`proto/V06/${i.id}`)),K.mode===`ret`&&t<=0&&(K.mode=`free`,K.L=j,K.Lgoal=j,delete o.dataset.diving,B(-1),K.afterRet!==null&&Math.abs(K.afterRet-j)>.01?Z(K.afterRet):X(300),n=k[2])}else n=Q();K.ox+=(K.tox-K.ox)*(1-Math.exp(-t/400)),K.oy+=(K.toy-K.oy)*(1-Math.exp(-t/400));let d=K.mode===`free`||K.mode===`fly`?Math.exp(-(((K.L-j)/1.3)**2)):0;if(d>.01&&!u){let e=b(y([0,1,0],n.dir));n={...n,dir:b(h(h(n.dir,_(e,K.ox*.06*d)),[0,-K.oy*.04*d,0]))}}P(n,f,m,J);let p=1-w((K.L-(j+.9))/1.4);for(let n=0;n<6;n++){let r=(n===K.hot?2.1:n===K.focus&&K.ui>=2?1.15:.62)*p;(K.mode===`dive`||K.mode===`ret`)&&(r=n===K.dive.i?2.3:.15),K.mode===`intro`&&(r=.62*p*w((e-K.t0-de)/1500+ +(K.L<te))),K.pl[n]+=(r-K.pl[n])*(1-Math.exp(-t/120)),Number.isFinite(K.pl[n])||(K.pl[n]=r)}let g=e/1e3;q.t=g,q.beat=u?.4:xe(g),q.wave=u?1:Math.min(1,g%1.12/1.12*1.6),q.near=1-w((K.L-he)/(ge-he)),q.far=w((K.L-_e)/(ve-_e)),q.sun=re(D,K.L);let v=K.mode===`free`&&Math.abs(K.Lgoal-K.L)<.001&&Math.abs(K.tox-K.ox)<.001&&Math.abs(K.toy-K.oy)<.001;Ae=!Ae,I&&!I.lost&&(!v||Ae||K.frames<4)&&(I.draw(J,q),K.frames>2&&I.adapt(v?t/2:t)),K.frames++;let S=(K.mode===`free`||K.mode===`fly`||K.mode===`freeze`)&&K.L<j+1.1&&K.ui>=2;S!==K.placesOn&&(K.placesOn=S,ae(S));for(let e=0;e<6;e++){let t=i.current[e];if(!t)continue;let[n,r,a]=F(J,c[e].pos),o=a>.05&&n>-40&&n<f+40&&r>-40&&r<m+40;t.style.transform=o?`translate3d(${n.toFixed(1)}px, ${r.toFixed(1)}px, 0)`:`translate3d(-200px, -200px, 0)`}a.current&&K.mode!==`dive`&&(a.current.style.top=`${(se(K.L)*100).toFixed(2)}%`);let E=K.mode===`dive`?null:Se(K.L);if(E!==K.level&&(K.level=E,ee(E)),s.current){let e=s.current;if(l<0)e.style.opacity=`0`;else{let[t,n]=F(J,c[K.dive.i].pos),r=T(l);e.style.opacity=`1`,e.style.clipPath=`circle(${(r*110).toFixed(2)}% at ${(t/f*100).toFixed(1)}% ${(n/m*100).toFixed(1)}%)`,e.style.setProperty(`--b`,r.toFixed(3))}}K.readyAt&&e>=K.readyAt&&o.dataset.ready!==`1`&&(o.dataset.ready=`1`,ce(!0))};ke=requestAnimationFrame(je);let Me=e=>{if(e.preventDefault(),K.mode===`intro`)return Ee();if(K.mode===`dive`||K.mode===`ret`||K.mode===`freeze`)return;let t=e.deltaMode===1?.06:e.deltaMode===2?1:.0024;K.mode===`fly`&&(K.mode=`free`),K.Lgoal=Math.min(N,Math.max(A,K.Lgoal+e.deltaY*t)),G.current=performance.now()},Ne=e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(K.mode===`intro`)return e.key!==`Tab`&&e.preventDefault(),Ee();if(K.mode===`dive`||K.mode===`ret`)return;G.current=performance.now();let t=e.key;if(t>=`1`&&t<=`6`)return De(Number(t)-1);let n=K.mode===`fly`?K.fly.L1:K.Lgoal;if(t===`ArrowUp`||t===`PageUp`||t===`-`){e.preventDefault();let t=pe.find(e=>e>n+.05);t!==void 0&&Z(t)}else if(t===`ArrowDown`||t===`PageDown`||t===`+`||t===`=`){e.preventDefault();let t=[...pe].reverse().find(e=>e<n-.05);t!==void 0&&Z(t)}else t===`Escape`&&Z(j)},$=new Map,Pe=0,Fe=0,Ie=e=>{if(K.mode===`intro`)Ee();else if(G.current=performance.now(),e.pointerType===`touch`&&($.set(e.pointerId,[e.clientX,e.clientY]),$.size===2)){let[e,t]=[...$.values()];Pe=Math.hypot(e[0]-t[0],e[1]-t[1]),Fe=K.Lgoal}},Le=e=>{if(e.pointerType===`mouse`)K.tox=(e.clientX/f-.5)*2,K.toy=(e.clientY/m-.5)*2;else if($.has(e.pointerId)&&($.set(e.pointerId,[e.clientX,e.clientY]),$.size===2&&Pe>0&&K.mode!==`dive`&&K.mode!==`ret`)){let[e,t]=[...$.values()],n=Math.hypot(e[0]-t[0],e[1]-t[1]);K.mode===`fly`&&(K.mode=`free`),K.Lgoal=Math.min(N,Math.max(A,Fe-Math.log(n/Pe)*2.2))}},Re=e=>{$.delete(e.pointerId),$.size<2&&(Pe=0)},ze=()=>{f=o.clientWidth||innerWidth,m=o.clientHeight||innerHeight,I?.resize(f,m)};return o.addEventListener(`wheel`,Me,{passive:!1}),window.addEventListener(`keydown`,Ne),o.addEventListener(`pointerdown`,Ie),window.addEventListener(`pointermove`,Le),window.addEventListener(`pointerup`,Re),window.addEventListener(`pointercancel`,Re),window.addEventListener(`resize`,ze),()=>{cancelAnimationFrame(ke),o.removeEventListener(`wheel`,Me),window.removeEventListener(`keydown`,Ne),o.removeEventListener(`pointerdown`,Ie),window.removeEventListener(`pointermove`,Le),window.removeEventListener(`pointerup`,Re),window.removeEventListener(`pointercancel`,Re),window.removeEventListener(`resize`,ze),M.removeEventListener(`webglcontextlost`,L),I?.dispose(),M.remove(),W.current=null}},[]),(0,o.useEffect)(()=>{if(!I)return;G.current=performance.now();let e=window.setTimeout(()=>Ce(),1200),t=window.setInterval(()=>{performance.now()-G.current<9e3||document.hidden||!W.current||K.current>=0||W.current.focus((Te.current+1)%6)},4800);return()=>{window.clearInterval(t),window.clearTimeout(e)}},[I]);let q=(0,o.useCallback)(e=>{G.current=performance.now(),W.current?.hot(e)},[]),J=(0,o.useCallback)(()=>W.current?.hot(-1),[]),Y=(0,o.useCallback)(e=>W.current?.dive(e),[]),X=c[S],Z=z>=0?c[z]:null;return(0,f.jsxs)(`div`,{className:`v6 v6-home${V?` is-phone`:``}`,ref:t,"data-proto":`V06`,"data-ui":g,"data-state":`idle`,"data-ready":I?`1`:void 0,children:[(0,f.jsx)(`div`,{className:`v6-host`,ref:n,children:L&&(0,f.jsx)(`img`,{className:`v6-still`,src:`${ue}themes/V06/${V?`still_390`:`still_1440`}.jpg`,alt:``})}),(0,f.jsx)(`div`,{className:`v6-shade`,"aria-hidden":`true`}),(0,f.jsxs)(`header`,{className:`v6-head`,children:[(0,f.jsxs)(`h1`,{className:`v6-title`,children:[`Super`,(0,f.jsx)(`em`,{children:`Humans`})]}),(0,f.jsx)(`p`,{className:`v6-line`,children:l})]}),(0,f.jsx)(`div`,{className:`v6-places${M?` is-on`:``}`,inert:!M,children:c.map((e,t)=>(0,f.jsxs)(`button`,{type:`button`,ref:e=>{i.current[t]=e},className:`v6-place${D===t?` is-hot`:``}${S===t?` is-focus`:``}`,style:{"--h":e.hue},"aria-label":`${e.name}: ${e.site}. Go inside`,"data-qa":t===0?`primary`:void 0,onPointerEnter:()=>q(t),onPointerLeave:J,onFocus:()=>q(t),onBlur:J,onClick:()=>Y(t),children:[(0,f.jsx)(`span`,{className:`v6-place-ring`,"aria-hidden":`true`}),(0,f.jsx)(`span`,{className:`v6-place-tag`,"aria-hidden":`true`,children:e.name})]},e.id))}),(0,f.jsxs)(`section`,{className:`v6-focus`,style:{"--h":X.hue},"aria-live":`polite`,onPointerEnter:()=>G.current=performance.now(),children:[(0,f.jsx)(`button`,{type:`button`,className:`v6-focus-img`,onClick:()=>Y(S),"aria-label":`Go inside ${X.name}`,children:c.map((e,t)=>(0,f.jsx)(`img`,{src:V?e.img:e.imgTall,alt:``,className:t===S?`is-on`:void 0},e.id))}),(0,f.jsxs)(`div`,{className:`v6-focus-text`,children:[(0,f.jsxs)(`p`,{className:`v6-focus-kicker`,children:[(0,f.jsx)(`b`,{children:X.n}),` `,X.site]}),(0,f.jsx)(`h2`,{className:`v6-focus-name`,children:X.name}),(0,f.jsx)(`p`,{className:`v6-focus-sentence`,children:X.sentence}),(0,f.jsxs)(`button`,{type:`button`,className:`v6-go`,onClick:()=>Y(S),children:[`Go inside`,(0,f.jsx)(`svg`,{viewBox:`0 0 20 20`,"aria-hidden":`true`,children:(0,f.jsx)(`path`,{d:`M4 10h11M11 5l5 5-5 5`,fill:`none`,stroke:`currentColor`,strokeWidth:`1.8`,strokeLinecap:`round`,strokeLinejoin:`round`})})]})]})]}),(0,f.jsx)(m,{markRef:a,level:k,focus:S,onLevel:e=>{G.current=performance.now(),U(t=>({l:e,n:t.n+1})),W.current?.fly(me[e])},onPlace:Y,onHover:q}),(0,f.jsx)(`p`,{className:`v6-ai`,children:`AI-generated imagery`}),(0,f.jsx)(`p`,{className:`v6-sr`,"aria-live":`polite`,"data-n":H.n,children:H.l?`Zooming to ${H.l}`:``}),(0,f.jsx)(`div`,{className:`v6-bloom`,ref:s,"aria-hidden":`true`,style:Z?{"--h":Z.hue}:void 0,children:Z&&(0,f.jsx)(`img`,{src:V?Z.imgTall:Z.img,alt:``})})]})}var we=e({default:()=>U}),H=(0,o.lazy)(()=>a(()=>import(`./Module-CS_muvlX.js`),__vite__mapDeps([23,1,2,3,24,5]),import.meta.url));function U({view:e,params:t}){let n=u(e);if(!n)return(0,f.jsx)(V,{params:t});let r=(0,f.jsx)(`div`,{className:`v6 v6-mod`,style:{"--h":n.hue},children:(0,f.jsxs)(`div`,{className:`v6-mod-bg is-hold`,"aria-hidden":`true`,children:[(0,f.jsx)(`img`,{className:`v6-mod-bg-wide`,src:n.img,alt:``}),(0,f.jsx)(`img`,{className:`v6-mod-bg-tall`,src:n.imgTall,alt:``})]})});return(0,f.jsx)(o.Suspense,{fallback:r,children:(0,f.jsx)(H,{check:n},n.id)})}export{U as default,m as n,c as r,we as t};
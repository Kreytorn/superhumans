const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./body-BwIFaOya.js","./rolldown-runtime-XKyaHtl9.js","./Module-D4vORXKq.js","./index-CRJJ4hgL.js","./index-CvU9-K1k.css","./tracktrace-BL1p5DA6.js","./tracktrace-CFLwFIW8.js","./client-CD6l6M49.js","./tracktrace-B8tYtE4W.css","./bubblegrade-ChMKdRfK.js","./bubblegrade-Ty8Jirxm.js","./bubblegrade-BG81yi9O.css","./newsreader-In2980oI.css","./geist-mono-C5knphS1.css","./veinsqueeze-DrNiLRxY.js","./honesty-D1yHS4ET.js","./veinsqueeze-BJSarZNv.css","./instrument-sans-BkCNIqpb.css","./braindrift-BBdRfueC.js","./braindrift-DFimSZpn.js","./three.module-DS1lwPcu.js","./braindrift-B_i9pn98.css","./garnmeter-El8jPOhG.js","./garnmeter-DB8lqCrR.css","./spline-sans-mono-BSXwSnXg.css","./spikecount-DVce7RGm.js"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";/* empty css             *//* empty css                        *//* empty css                   */import{n,s as r,t as i}from"./index-CRJJ4hgL.js";import{n as a,t as o}from"./body-BwIFaOya.js";import{$ as s,At as c,D as l,E as u,L as d,O as f,Ot as p,R as m,S as h,W as g,Z as _,b as v,bt as y,ft as b,kt as x,nt as S,o as C,pt as w,s as T,t as E,w as D}from"./three.module-DS1lwPcu.js";var O=t(r(),1),k=[{id:`tracktrace`,n:`01`,name:`TrackTrace`,sentence:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,site:`Cells`,hue:`#ff4fb0`,img:`./_posters/tracktrace_portrait.jpg`,crop:[.333,0,.667,.289],wide:`./_posters/tracktrace.jpg`,at:o.tracktrace,size:.29,run:`Scan the nucleus`},{id:`bubblegrade`,n:`02`,name:`BubbleGrade`,sentence:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,site:`Heart`,hue:`#ff9a3d`,img:`./_posters/bubblegrade_portrait.jpg`,crop:[.25,.3,.9,.863],wide:`./_posters/bubblegrade.jpg`,at:o.bubblegrade,size:.21,run:`Play the heart sound`},{id:`spikecount`,n:`03`,name:`SpikeCount`,sentence:`Every red blood cell, outlined. The spiky ones, counted.`,site:`Blood`,hue:`#ff5a52`,img:`./_posters/spikecount_portrait.jpg`,crop:[.255,.53,.745,.954],wide:`./_posters/spikecount.jpg`,at:o.spikecount,size:.2,run:`Grade this blood`},{id:`veinsqueeze`,n:`04`,name:`VeinSqueeze`,sentence:`A clot is a vein that won’t squash.`,site:`Leg vein`,hue:`#ffd23f`,img:`./_posters/veinsqueeze_portrait.jpg`,crop:[.42,.114,.68,.339],wide:`./_posters/veinsqueeze.jpg`,at:o.veinsqueeze,size:.19,run:`Press the probe`},{id:`braindrift`,n:`05`,name:`BrainDrift`,sentence:`In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.`,site:`Brain`,hue:`#4fd0ff`,img:`./_posters/braindrift_portrait.jpg`,crop:[.17,.3,.77,.82],wide:`./_posters/braindrift.jpg`,at:o.braindrift,size:.17,run:`Fly the brain`},{id:`garnmeter`,n:`06`,name:`Garn Meter`,sentence:`Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.`,site:`Inner ear`,hue:`#9a8cff`,img:`./_posters/garnmeter_portrait.jpg`,crop:[.6,.472,.878,.712],wide:`./_posters/garnmeter.jpg`,at:o.garnmeter,size:.14,run:`Play the session`}],ee=`Six AI health checks for astronauts, running in your browser.`;function A(e,t,n){let[r,i,a,o]=e.crop,s=t/(a-r),c=s*1200/900;return{backgroundImage:`url(${e.img})`,backgroundSize:`${s.toFixed(1)}px ${c.toFixed(1)}px`,backgroundPosition:`${(-r*s).toFixed(1)}px ${(n/2-(i+o)/2*c).toFixed(1)}px`}}function te(e){return k.findIndex(t=>t.id===e)}var j=null;function M(){return j||(j=new Promise((e,t)=>{let n=()=>i(()=>import(`./body-BwIFaOya.js`).then(e=>e.r).then(t=>e(t.buildBody())),__vite__mapDeps([0,1]),import.meta.url).catch(t);try{let t=new Worker(new URL(new URL(`body.worker-BgJ-d5_s.js`,import.meta.url).href,``+import.meta.url),{type:`module`}),r=window.setTimeout(()=>{t.terminate(),n()},6e3);t.onmessage=n=>{window.clearTimeout(r),t.terminate(),e(n.data)},t.onerror=()=>{window.clearTimeout(r),t.terminate(),n()},t.postMessage(0)}catch{n()}}),j)}function N(){try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}var P=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,F=e=>1-(1-e)**3,I=e=>e<0?0:e>1?1:e,L=e=>new x(parseInt(e.slice(1,3),16)/255,parseInt(e.slice(3,5),16)/255,parseInt(e.slice(5,7),16)/255),R=new v(.2,.95,0,`YXZ`),z=.56,B=1/z,V=`
vec3 film(float t) {
  // thin-film colours: cyan, violet, magenta, gold, then pearl back to cyan
  t = fract(t) * 5.0;
  vec3 c0 = vec3(0.16, 0.90, 1.00);
  vec3 c1 = vec3(0.50, 0.40, 1.00);
  vec3 c2 = vec3(1.00, 0.20, 0.74);
  vec3 c3 = vec3(1.00, 0.72, 0.24);
  vec3 c4 = vec3(1.00, 0.93, 0.95);
  float f = smoothstep(0.0, 1.0, fract(t));
  if (t < 1.0) return mix(c0, c1, f);
  if (t < 2.0) return mix(c1, c2, f);
  if (t < 3.0) return mix(c2, c3, f);
  if (t < 4.0) return mix(c3, c4, f);
  return mix(c4, c0, f);
}
`,H=`
uniform vec3 uJPos[6];
uniform vec3 uJCol[6];
uniform float uJPow[6];
`,U=`
attribute vec3 aBary;
attribute vec3 aFacet;
attribute vec3 aCorner;
varying vec3 vW;
varying vec3 vN;
varying vec3 vBary;
varying vec3 vFacet;
varying vec3 vCorner;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vBary = aBary;
  vFacet = aFacet;
  vCorner = aCorner;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,W=`
precision highp float;
uniform vec3 uCam;
uniform vec3 uStar;
uniform float uTime;
uniform float uIgnite;
uniform float uGrow;
uniform float uSheen;
uniform float uFly;
${H}
varying vec3 vW;
varying vec3 vN;
varying vec3 vBary;
varying vec3 vFacet;
varying vec3 vCorner;
${V}
void main() {
  // 0 on the facet's edges, 1 at its centre
  float cen = clamp(min(min(vCorner.x, vCorner.y), vCorner.z) * 3.0, 0.0, 1.0);
  float g = uGrow - vFacet.y * 0.9;
  if (g < 0.0) discard;
  float front = 1.0 - smoothstep(0.0, 0.14, g);
  vec3 toCam = uCam - vW;
  vec3 V = normalize(toCam);
  vec3 N = normalize(vN);
  float sd = dot(N, V);
  if (sd < 0.0) N = -N;
  float ndv = abs(sd);
  vec3 L = normalize(uStar - vW);
  float ndl = max(dot(N, L), 0.0);
  float fres = pow(1.0 - ndv, 2.3);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 110.0);
  // starlight through the crystal: strongest where the star sits right behind the facet
  float thru = pow(max(dot(-V, L), 0.0), 40.0);

  vec3 fw = fwidth(vBary);
  vec3 a3 = smoothstep(vec3(0.0), fw * 0.95, vBary);
  float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
  float run = pow(max(0.0, sin(dot(vW, vec3(0.55, 1.0, 0.25)) * 7.0 - uTime * 1.2 + vFacet.x * 1.5)), 14.0);
  float tw = pow(max(0.0, sin(uTime * (0.45 + vFacet.x * 0.9) + vFacet.x * 70.0)), 40.0);

  float ft = ndv * 0.9 + vFacet.x * 0.6 + vW.y * 0.22 + uTime * 0.014;
  vec3 fc = film(ft);
  vec3 col;
  if (uSheen > 0.5) {
    // the glass in front of a jewel: only its edges and glints, so the jewel reads as inside the crystal
    float near = 0.0;
    for (int i = 0; i < 6; i++) {
      vec3 dv = uJPos[i] - vW;
      near = max(near, uJPow[i] * 2.0 / (1.0 + dot(dv, dv) * 160.0));
    }
    col = (fc * edge * 0.45 + vec3(1.0) * spec * 1.2 + fc * fres * 0.25) * clamp(near, 0.0, 1.0);
    // only in flight: at rest the pictures in the jewels stay clean
    gl_FragColor = vec4(col * uIgnite * (1.0 - front) * uFly, 1.0);
    return;
  }
  // each flat facet mirrors a different part of a dark studio: the star, a ring of thin-film light, a violet sky
  // above and a teal floor below. Neighbouring facets catch different things, which is what makes a gem sparkle.
  vec3 R = reflect(-V, N);
  float sR = max(dot(R, L), 0.0);
  vec3 vc = film(fract(ft) * 0.8);
  vec3 env = vec3(1.0, 0.97, 0.94) * (pow(sR, 70.0) * 3.5 + pow(sR, 12.0) * 0.2);
  // fire: near the star's reflection a facet splits the light into colour
  env += film(fract(vFacet.x * 2.0 + sR * 1.5 + uTime * 0.02) * 0.8) * pow(sR, 4.0) * 0.7;
  // a ring of coloured light in the studio: only some facets face it, and those flash in full colour
  float band = exp(-pow((R.y - 0.05 + 0.35 * sin(R.x * 2.3 + R.z * 1.7 + vFacet.x * 2.0)) * 6.0, 2.0));
  env += film(fract(R.x * 0.35 + R.z * 0.3 + vFacet.x * 0.6 + uTime * 0.01) * 0.8) * band * 1.5 * step(0.35, fract(vFacet.x * 7.31));
  // and a few facets glow with colour from inside, whatever the angle
  env += vc * step(0.86, vFacet.z) * 0.35;
  // three coloured lights stand round the studio: cyan up front, magenta low on the right, gold above. A flat facet
  // that mirrors one flashes in its full colour; as the figure turns, the flashes move from facet to facet.
  float jit = (vFacet.z - 0.5) * 0.05;
  float fC = smoothstep(0.89 + jit, 0.91 + jit, dot(R, normalize(vec3(-0.55, 0.42, 0.72))));
  float fM = smoothstep(0.89 + jit, 0.91 + jit, dot(R, normalize(vec3(0.62, -0.38, 0.68))));
  float fG = smoothstep(0.9 + jit, 0.92 + jit, dot(R, normalize(vec3(0.25, 0.9, 0.35))));
  vec3 flashC = vec3(0.08, 0.72, 1.0) * fC + vec3(1.0, 0.1, 0.58) * fM + vec3(1.0, 0.7, 0.08) * fG;
  // dark glass: deep ultraviolet or teal, deeper at each facet's centre (light passes through there)
  vec3 glass = mix(vec3(0.060, 0.012, 0.165), vec3(0.004, 0.070, 0.125), smoothstep(0.3, 0.7, vFacet.x));
  col = glass * (1.25 - 0.75 * cen) * (0.8 + 0.5 * ndl);
  col += env * (0.1 + 0.9 * fres);
  // the flash fills the facet, brightest at its centre, with the cut line a shade lighter
  col += flashC * (0.75 + 0.45 * cen + 0.3 * edge);
  // the star behind the figure rims it in white light, and shines through where it sits right behind
  col += mix(vec3(0.78, 0.88, 1.0), vc, 0.45) * pow(1.0 - ndv, 5.0) * smoothstep(0.1, 0.7, dot(N, L)) * 1.6;
  col += mix(vec3(0.75, 0.82, 1.0), vc, 0.5) * thru * 0.4;
  col += vec3(1.0, 0.97, 0.92) * spec * 2.4;
  // the cut lines, in prism colours, with glints of light running along them
  col += vc * edge * (0.09 + 2.2 * run) * (0.6 + 0.8 * vFacet.z);
  col += vc * tw * 0.9;
  for (int i = 0; i < 6; i++) {
    vec3 dv = uJPos[i] - vW;
    float a = uJPow[i] / (1.0 + dot(dv, dv) * 38.0);
    col += uJCol[i] * a * (0.26 + 1.1 * edge + 0.5 * fres);
  }
  col += mix(vec3(1.0), fc, 0.4) * front * (0.5 + 2.5 * edge);
  col *= uIgnite;
  col = 1.0 - exp(-col * 1.25);
  gl_FragColor = vec4(col, 1.0);
}
`,ne=`
attribute vec3 aSmooth;
uniform float uPush;
varying vec3 vW;
varying vec3 vS;
void main() {
  vec4 wp = modelMatrix * vec4(position + aSmooth * uPush, 1.0);
  vW = wp.xyz;
  vS = normalize(mat3(modelMatrix) * aSmooth);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,re=`
precision highp float;
uniform vec3 uCam;
uniform vec3 uStar;
uniform float uIgnite;
uniform float uGrow;
uniform float uTime;
varying vec3 vW;
varying vec3 vS;
${V}
void main() {
  vec3 V = normalize(uCam - vW);
  float r = 1.0 - abs(dot(normalize(vS), V));
  float a = pow(r, 3.0) * smoothstep(1.0, 0.7, r);
  float toward = smoothstep(-0.4, 0.8, dot(normalize(vS), normalize(uStar - vW)));
  vec3 col = mix(film(vW.y * 0.35 + uTime * 0.01 + 0.05), vec3(0.85, 0.9, 1.0), toward * 0.6) * a * (0.1 + 0.3 * toward);
  gl_FragColor = vec4(col * uIgnite * smoothstep(0.6, 1.2, uGrow), 1.0);
}
`,ie=`
attribute vec3 aBary;
attribute vec2 aTop;   // x: 1 on the top ring and the tip, y: 1 on the tip
attribute vec4 aSeed;  // hash, taper, tip height, growth delay
uniform float uGrow;
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying vec3 vUp;
void main() {
  vec3 p = position;
  p.xz *= mix(1.0, aSeed.y, aTop.x);
  p.y += aTop.y * aSeed.z;
  p.y *= smoothstep(aSeed.w * 0.9 + 0.05, aSeed.w * 0.9 + 0.35, uGrow);
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vBary = aBary;
  vSeed = aSeed;
  vUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,G=`
precision highp float;
uniform vec3 uCam;
uniform vec3 uStar;
uniform float uTime;
uniform float uIgnite;
${H}
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying vec3 vUp;
${V}
void main() {
  vec3 V = normalize(uCam - vW);
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(uStar - vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 80.0);
  vec3 fc = film(ndv * 0.8 + vSeed.x * 0.7 + uTime * 0.02);
  vec3 fw = fwidth(vBary);
  vec3 a3 = smoothstep(vec3(0.0), fw * 1.2, vBary);
  float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
  float tw = pow(max(0.0, sin(uTime * (0.6 + vSeed.x) + vSeed.x * 50.0)), 30.0);
  vec3 col = vec3(0.05, 0.03, 0.12) + fc * (0.25 + 0.9 * fres) + fc * edge * 0.9 + vec3(1.0) * spec * 2.4 + fc * tw * 1.2;
  // brighter toward the tip, like light running out along the crystal
  col *= 0.7 + 0.6 * clamp(dot(vUp, normalize(vW - uCam)) * -0.5 + 0.5, 0.0, 1.0);
  for (int i = 0; i < 6; i++) {
    vec3 dv = uJPos[i] - vW;
    col += uJCol[i] * uJPow[i] * 0.6 / (1.0 + dot(dv, dv) * 60.0);
  }
  col *= uIgnite;
  col = 1.0 - exp(-col * 1.2);
  gl_FragColor = vec4(col, 1.0);
}
`,K=`
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += (uv - 0.5) * uSize;
  gl_Position = projectionMatrix * mv;
}
`,q=`
precision highp float;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
${V}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float flick = 0.94 + 0.06 * sin(uTime * 2.3) * sin(uTime * 1.7 + 1.0);
  float core = smoothstep(0.022, 0.009, r);
  float halo = 0.0011 / (r * r + 0.0009);
  float wide = exp(-r * 4.6) * 0.34;
  float sx = exp(-abs(p.y) * 260.0) * exp(-abs(p.x) * 2.7);
  float sx2 = exp(-abs(p.y) * 46.0) * exp(-abs(p.x) * 4.5) * 0.2;
  float sy = exp(-abs(p.x) * 300.0) * exp(-abs(p.y) * 6.5) * 0.45;
  vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  float sd = (exp(-abs(d.y) * 320.0) + exp(-abs(d.x) * 320.0)) * exp(-r * 10.0) * 0.32;
  float ring = exp(-pow((r - 0.22) / 0.01, 2.0)) * 0.08 + exp(-pow((r - 0.36) / 0.016, 2.0)) * 0.035;
  vec3 col = vec3(1.0, 0.98, 0.95) * core * 4.0;
  col += vec3(0.86, 0.88, 1.0) * halo * flick;
  col += vec3(0.48, 0.34, 0.95) * wide * flick;
  col += vec3(0.55, 0.82, 1.0) * (sx * 1.9 + sx2) * flick;
  col += vec3(0.85, 0.80, 1.0) * (sy + sd);
  col += film(atan(p.y, p.x) / 6.2832 + r * 1.5 + 0.1) * ring;
  col *= smoothstep(1.0, 0.55, r) * uIgnite;
  gl_FragColor = vec4(col, 1.0);
}
`,J=`
precision highp float;
uniform float uIgnite;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.y *= 0.62;
  float r = length(p);
  float a = exp(-r * r * 5.0) * smoothstep(1.0, 0.6, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0);
  vec3 col = mix(vec3(0.05, 0.30, 0.42), vec3(0.42, 0.16, 0.62), vUv.y) * a * 0.16;
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`,ae=`
precision highp float;
uniform sampler2D uTex;
uniform vec4 uCrop;
uniform vec3 uHue;
uniform float uFlare;
uniform float uShow;
uniform float uDim;
uniform float uCut;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
float sdHex(vec2 p, float r) {
  // pointy at top and bottom
  p = abs(p.yx);
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
float h1(float n) { return fract(sin(n * 91.7) * 43758.5); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float R = ${z.toFixed(3)};
  float d = sdHex(p, R);
  // one screen pixel, in these units
  float px = max(fwidth(p.x), 1e-4);
  float inside = 1.0 - smoothstep(-px, px, d);
  // a narrow bevel of six facets just inside the rim: each lifts and bends the picture a little
  float bev = clamp(px * 7.0, R * 0.06, R * 0.16);
  float ring = smoothstep(-bev - px, -bev + px, d);
  float ang = atan(p.y, p.x);
  float sec = floor((ang + 3.14159) / 1.0472);
  vec2 off = vec2(cos(sec * 1.0472 + 0.5), sin(sec * 1.0472 + 0.5)) * 0.035 * ring;
  vec2 pp = p * (1.0 - 0.06 * ring) + off;
  // the picture fills the gem: its box is the crop, which is shaped like the hexagon
  vec2 q = vec2(pp.x / (2.0 * R), pp.y / (2.3094 * R)) + 0.5;
  vec2 tuv = vec2(mix(uCrop.x, uCrop.z, q.x), 1.0 - mix(uCrop.y, uCrop.w, 1.0 - q.y));
  vec3 img = texture2D(uTex, tuv).rgb;
  img = clamp((img - 0.5) * 1.1 + 0.54, 0.0, 1.0) * (1.0 + 0.14 * uFlare);
  float shade = 0.92 + 0.34 * h1(sec + 3.0) + 0.08 * sin(uTime * 0.7 + sec * 2.0);
  vec3 col = mix(img, img * shade + uHue * 0.1, ring);
  // in flight the gem's cut shows over the picture: the table's rim and the spokes out to the corners
  if (uCut > 0.001) {
    float dt = sdHex(p, R * 0.64);
    float crown = smoothstep(-px, px, dt);
    float lt = 1.0 - smoothstep(0.0, px * 1.6, abs(dt));
    float sp = 0.0;
    for (int k = 0; k < 6; k++) {
      float a = 1.5708 + float(k) * 1.0472;
      vec2 dir = vec2(cos(a), sin(a));
      float along = dot(p, dir);
      float perp = abs(p.x * dir.y - p.y * dir.x);
      sp = max(sp, (1.0 - smoothstep(0.0, px * 1.4, perp)) * step(0.0, along) * crown);
    }
    col = mix(col, col * (0.8 + 0.3 * h1(sec + 3.0)) + uHue * 0.15, crown * 0.6 * uCut);
    col += mix(uHue, vec3(1.0), 0.5) * max(lt * 0.75, sp * 0.55) * uCut;
  }
  // the rim: about 3 px of the jewel's colour, white-hot on hover
  float rw = 1.6 * px;
  float rim = 1.0 - smoothstep(rw - px * 0.8, rw + px * 0.8, abs(d + rw));
  col = mix(col, mix(uHue, vec3(1.0), 0.18 + 0.55 * uFlare) * (1.12 + 0.3 * uFlare), rim);
  // a glint that sweeps across now and then
  float sweep = fract(uTime * 0.09 + h1(uHue.r * 7.0 + uHue.g));
  float gl = exp(-pow((p.x + p.y * 0.6) - (sweep * 5.0 - 2.5), 2.0) * 80.0);
  col += vec3(1.0) * gl * 0.16 * inside * (1.0 - uCut);
  // light round the gem: a tight glow of about 12 px, wider on hover
  float o = max(d, 0.0) / px;
  float glow = exp(-o / 4.5) * (0.85 + 0.4 * uFlare) + exp(-o / 15.0) * (0.22 + 0.5 * uFlare);
  float sx = exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 2.2) * uFlare * 1.1;
  float fade = smoothstep(1.0, 0.82, max(abs(p.x), abs(p.y)));
  vec3 halo = (uHue * glow + mix(uHue, vec3(1.0), 0.5) * sx) * fade;
  float a = inside * uShow;
  vec3 outc = col * a * uDim + halo * uShow * mix(1.0, uDim, 0.6) * (1.0 - inside);
  gl_FragColor = vec4(outc * uIgnite, a);
}
`,Y=`
attribute float aT;
attribute float aS;
uniform vec3 uA;
uniform vec3 uB;
uniform vec2 uRes;
uniform float uW0;
uniform float uW1;
varying float vT;
varying float vS;
void main() {
  vec3 P = mix(uA, uB, aT);
  vec4 c0 = projectionMatrix * viewMatrix * vec4(P, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(P + (uB - uA) * 0.002, 1.0);
  vec2 s0 = c0.xy / c0.w;
  vec2 s1 = c1.xy / c1.w;
  vec2 dd = (s1 - s0) * uRes;
  vec2 d = length(dd) > 1e-6 ? normalize(dd) : vec2(1.0, 0.0);
  vec2 n = vec2(-d.y, d.x);
  float w = mix(uW0, uW1, aT);
  c0.xy += n * aS * w / uRes * 2.0 * c0.w;
  gl_Position = c0;
  vT = aT;
  vS = aS;
}
`,oe=`
precision highp float;
uniform vec3 uHue;
uniform float uFlare;
uniform float uTime;
uniform float uIgnite;
varying float vT;
varying float vS;
void main() {
  float core = exp(-vS * vS * 9.0);
  float flow = 0.6 + 0.4 * sin(vT * 40.0 - uTime * 8.0);
  float a = core * (0.4 + 0.6 * flow) * smoothstep(0.0, 0.06, vT) * (0.25 + 0.75 * smoothstep(1.0, 0.2, vT));
  vec3 col = mix(uHue, vec3(1.0), core * 0.45) * a * uFlare * 1.3;
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`,se=`
precision highp float;
uniform vec3 uHue;
uniform float uFlare;
uniform float uShow;
uniform float uTime;
uniform float uIgnite;
varying float vT;
varying float vS;
void main() {
  float core = exp(-vS * vS * 14.0);
  float soft = exp(-vS * vS * 2.2) * 0.35;
  float ends = smoothstep(0.0, 0.22, vT) * smoothstep(1.0, 0.78, vT);
  float pulse = exp(-pow(fract(vT - uTime * 0.35) - 0.5, 2.0) * 90.0) * 0.8;
  vec3 col = (vec3(1.0, 0.92, 0.98) * core * (1.1 + pulse) + uHue * (soft + core * 0.5)) * ends;
  float grow = smoothstep(uShow * 1.4 - 0.4, uShow * 1.4 - 0.4 + 0.08, abs(vT - 0.5) * 2.0);
  gl_FragColor = vec4(col * (1.0 - grow) * (0.85 + 0.6 * uFlare) * uIgnite, 1.0);
}
`,ce=`
precision highp float;
uniform float uIgnite;
uniform float uGain;
uniform float uTime;
varying float vT;
varying float vS;
void main() {
  float shimmer = 0.88 + 0.12 * sin(vT * 30.0 - uTime * 2.0);
  float across = exp(-vS * vS * 2.6);
  float along = smoothstep(0.05, 0.7, vT) * smoothstep(1.0, 0.93, vT);
  gl_FragColor = vec4(vec3(0.82, 0.86, 1.0) * across * along * uGain * shimmer * uIgnite, 1.0);
}
`,le=`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}
`,ue=`
precision highp float;
uniform float uTime;
uniform vec3 uStarDir;
uniform float uIgnite;
varying vec3 vDir;
float hsh(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vn(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hsh(i), hsh(i + vec3(1, 0, 0)), f.x), mix(hsh(i + vec3(0, 1, 0)), hsh(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(hsh(i + vec3(0, 0, 1)), hsh(i + vec3(1, 0, 1)), f.x), mix(hsh(i + vec3(0, 1, 1)), hsh(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
void main() {
  vec3 d = normalize(vDir);
  float n1 = vn(d * 1.25 + vec3(0.0, uTime * 0.004, 3.0));
  float n2 = vn(d * 2.6 + n1 * 1.8 + 7.0);
  float n3 = vn(d * 5.2 - n2 * 1.2);
  // deep colour: ultraviolet above, teal-black below
  vec3 col = mix(vec3(0.006, 0.026, 0.040), vec3(0.048, 0.012, 0.112), smoothstep(-0.55, 0.55, d.y + (n1 - 0.5) * 0.9));
  col *= 0.55 + 0.75 * n1;
  // a few broad folds of faint light
  float fold = smoothstep(0.42, 0.92, n2) * (0.45 + 0.55 * n3);
  col += fold * fold * mix(vec3(0.22, 0.05, 0.36), vec3(0.03, 0.22, 0.30), smoothstep(0.3, 0.75, n1)) * 0.55;
  float fold2 = smoothstep(0.55, 1.0, vn(d * 1.7 + vec3(11.0, 2.0, uTime * 0.003) + n2));
  col += fold2 * fold2 * vec3(0.30, 0.12, 0.10) * 0.2;
  // the star lights the dark round it
  float sd = max(dot(d, normalize(uStarDir)), 0.0);
  col += vec3(0.20, 0.10, 0.42) * pow(sd, 40.0) * 0.5 + vec3(0.35, 0.40, 0.75) * pow(sd, 400.0) * 0.4;
  // a handful of far suns, not a wallpaper
  vec3 g = d * 150.0;
  vec3 id = floor(g);
  float h = hsh(id);
  float pt = smoothstep(0.30, 0.0, length(fract(g) - 0.5)) * step(0.9975, h);
  col += pt * mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.8, 0.9), fract(h * 91.0)) * (0.35 + 0.65 * fract(h * 37.0));
  col *= uIgnite;
  col += (hsh(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 200.0;
  gl_FragColor = vec4(col, 1.0);
}
`;function de(){let e=[],t=[],n=[],r=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],i=(r,i,a,o,s)=>{e.push(r,i,a),t.push(...o),n.push(...s)};for(let e=0;e<4;e++){let t=r[e],n=r[(e+1)%4];i(n[0],0,n[1],[1,1,0],[0,0]),i(t[0],0,t[1],[0,1,0],[0,0]),i(t[0],1,t[1],[0,1,1],[1,0]),i(n[0],0,n[1],[1,0,1],[0,0]),i(t[0],1,t[1],[0,1,1],[1,0]),i(n[0],1,n[1],[0,0,1],[1,0]),i(n[0],1,n[1],[1,0,0],[1,0]),i(t[0],1,t[1],[0,1,0],[1,0]),i(0,1,0,[0,0,1],[1,1])}let a=new T;return a.setAttribute(`position`,new h(e,3)),a.setAttribute(`aBary`,new h(t,3)),a.setAttribute(`aTop`,new h(n,2)),a}function fe(e){let t=[],n=[],r=[];for(let i=0;i<=e;i++)t.push(i/e,i/e),n.push(-1,1),i<e&&r.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);let i=new T;return i.setAttribute(`aT`,new h(t,1)),i.setAttribute(`aS`,new h(n,1)),i.setAttribute(`position`,new h(Array(t.length*3).fill(0),3)),i.setIndex(r),i}var pe=e=>({pos:e.pos.clone(),tgt:e.tgt.clone(),cx:e.cx,cy:e.cy,fov:e.fov}),me=class{renderer;scene=new b;camera=new _(30,1,.01,400);group=new D;disposables=[];raf=0;running=!1;active=!0;last=0;time=0;swayT=0;w=1;h=1;dpr=1;slow=0;frames=0;lost=!1;disposed=!1;common={uTime:{value:0},uIgnite:{value:0},uCam:{value:new x},uStar:{value:new x(3,2,-9)},uGrow:{value:0},uFly:{value:0}};jPos=Array.from({length:6},()=>new x);jCol=k.map(e=>L(e.hue));jPow=[0,0,0,0,0,0];flare=[0,0,0,0,0,0];jLocal=k.map(e=>new x(...e.at));jewelMats=[];jewels=[];beamMats=[];rayMat;shaftIn;bodyMats=[];skyMat;star;aura;bodyIn=!1;frozen=!1;sheen=null;loaded=0;home;from;to;cur={pos:new x,tgt:new x,cx:.5,cy:.5,fov:30};k=1;dur=1;t0=0;safety=0;target=null;arrived=!0;landed=0;hover=null;intro=0;introT0=0;introDur=1.15;ready=!1;px=0;py=0;homeW=1;v=new x;v2=new x;right=new x;up=new x;vis=[``,``,``,``,``,``];colX=0;cardMax=0;labelY=[0,0,0,0,0,0];host;ctl;opt;constructor(e,t,n){this.host=e,this.ctl=t,this.opt=n;let r=new E({antialias:!0,alpha:!1,powerPreference:`high-performance`,stencil:!1});this.renderer=r,r.outputColorSpace=m,r.setClearColor(262924,1),this.dpr=Math.min(window.devicePixelRatio||1,n.tall?1.35:1.5),r.setPixelRatio(this.dpr),r.domElement.className=`v11-canvas`,e.appendChild(r.domElement),r.domElement.addEventListener(`webglcontextlost`,this.onLost),this.group.quaternion.setFromEuler(R),this.scene.add(this.group),this.build(),this.resize(),this.target=n.startAt,this.intro=1,this.from=this.to=n.startAt==null?this.home:this.endPose(n.startAt),this.k=1,window.addEventListener(`resize`,this.resize),document.addEventListener(`visibilitychange`,this.onVis),M().then(e=>{this.disposed||this.addBody(e)}).catch(()=>this.ctl.onFail())}mat(e,t,n,r={}){let i=new w({vertexShader:e,fragmentShader:t,uniforms:{...this.common,...n},...r});return this.disposables.push(i),i}jewelUniforms(){return{uJPos:{value:this.jPos},uJCol:{value:this.jCol},uJPow:{value:this.jPow}}}build(){let{scene:e}=this,t={blending:2,depthWrite:!1,transparent:!0},n=new u(60,3);this.disposables.push(n),this.skyMat=this.mat(le,ue,{uStarDir:{value:new x(.3,.2,-1)}},{side:1,depthWrite:!1,depthTest:!1});let r=new g(n,this.skyMat);r.frustumCulled=!1,r.renderOrder=-10,e.add(r);let i=new s(1,1);this.disposables.push(i),this.star=new g(i,this.mat(K,q,{uSize:{value:15}},{...t,depthTest:!0})),this.star.frustumCulled=!1,this.star.renderOrder=-5,e.add(this.star),this.aura=new g(i,this.mat(K,J,{uSize:{value:4.2}},{...t,depthTest:!0})),this.aura.frustumCulled=!1,this.aura.renderOrder=-4,e.add(this.aura);let a=new y,o=this.renderer.capabilities.getMaxAnisotropy();k.forEach((e,t)=>{let n=a.load(e.img,()=>this.loaded++,void 0,()=>this.loaded++);n.anisotropy=Math.min(8,o),n.minFilter=d,this.disposables.push(n);let r=this.mat(K,ae,{uTex:{value:n},uCrop:{value:new c(...e.crop)},uHue:{value:this.jCol[t]},uFlare:{value:0},uShow:{value:0},uCut:{value:0},uDim:{value:1},uSize:{value:e.size*B}},{transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:201,blendDst:205}),s=new g(i,r);s.position.copy(this.jLocal[t]),s.frustumCulled=!1,s.renderOrder=4+(t===0?.5:0),this.group.add(s),this.jewels.push(s),this.jewelMats.push(r)});let l=fe(48);this.disposables.push(l),this.rayMat=this.mat(Y,se,{uA:{value:new x},uB:{value:new x},uRes:{value:new p(1,1)},uW0:{value:9},uW1:{value:9},uHue:{value:this.jCol[0]},uFlare:{value:0},uShow:{value:0}},{...t,depthTest:!1,side:2});let f=new g(l,this.rayMat);f.frustumCulled=!1,f.renderOrder=3,e.add(f),this.shaftIn=this.mat(Y,ce,{uA:{value:new x},uB:{value:new x},uRes:{value:new p(1,1)},uW0:{value:4},uW1:{value:70},uGain:{value:.1}},{...t,depthTest:!0,side:2});let m=new g(l,this.shaftIn);m.frustumCulled=!1,m.renderOrder=-3,e.add(m);for(let n=0;n<6;n++){let r=this.mat(Y,oe,{uA:{value:new x},uB:{value:new x},uRes:{value:new p(1,1)},uW0:{value:14},uW1:{value:3},uHue:{value:this.jCol[n]},uFlare:{value:0}},{...t,depthTest:!1,side:2}),i=new g(l,r);i.frustumCulled=!1,i.renderOrder=2,e.add(i),this.beamMats.push(r)}}addBody(e){let t=new T;t.setAttribute(`position`,new C(e.position,3)),t.setAttribute(`normal`,new C(e.normal,3)),t.setAttribute(`aBary`,new C(e.bary,3)),t.setAttribute(`aFacet`,new C(e.facet,3)),t.setAttribute(`aCorner`,new C(e.corner,3)),this.disposables.push(t);let n=new g(t,this.mat(U,W,{...this.jewelUniforms(),uSheen:{value:0}},{side:2}));n.frustumCulled=!1,this.group.add(n);let r=new g(t,this.mat(U,W,{...this.jewelUniforms(),uSheen:{value:1}},{side:0,blending:2,transparent:!0,depthWrite:!1}));r.frustumCulled=!1,r.renderOrder=6,r.visible=!1,this.sheen=r,this.group.add(r),this.bodyMats.push(n.material,r.material),t.setAttribute(`aSmooth`,new C(e.smooth,3));let i=new g(t,this.mat(ne,re,{uPush:{value:.022}},{side:1,blending:2,transparent:!0,depthWrite:!1}));i.frustumCulled=!1,i.renderOrder=1,this.group.add(i);let a=de();a.setAttribute(`aSeed`,new l(e.shardSeed,4)),this.disposables.push(a);let o=new f(a,this.mat(ie,G,this.jewelUniforms(),{side:2}),e.shards);o.instanceMatrix.array.set(e.shardMatrix),o.instanceMatrix.needsUpdate=!0,o.frustumCulled=!1,this.group.add(o),this.bodyIn=!0,this.wake()}frame(){let{opt:e,camera:t}=this,n=new S().setFromEuler(R),r=new x(1/0,1/0,1/0),i=new x(-1/0,-1/0,-1/0);for(let[e,t,o,s]of a)this.v.set(e,t,o).applyQuaternion(n),r.min(this.v2.copy(this.v).subScalar(s)),i.max(this.v2.copy(this.v).addScalar(s));let o=r.clone().add(i).multiplyScalar(.5),s=this.w/this.h,c=Math.tan(30*Math.PI/360),l=e.tall?.62:.86,u=e.tall?.66:.6,d=(i.y-r.y)/2/l/c,f=(i.x-r.x)/2/u/(c*s),p=Math.max(d,f)+(i.z-o.z)*.4,m=o.clone().add(this.v.set(0,0,p));this.home={pos:m,tgt:o,cx:e.tall?.645:.535,cy:e.tall?.63:.5,fov:30},t.fov=30,t.aspect=s,this.applyPose(this.home);let h=e.tall?.86:.775,g=e.tall?.34:.13;this.v.set(h*2-1,-(g*2-1),.5).unproject(t).sub(t.position).normalize();let _=this.common.uStar.value.copy(t.position).addScaledVector(this.v,16);this.star.position.copy(_),this.skyMat.uniforms.uStarDir.value.copy(_).sub(o),this.aura.position.copy(o).addScaledVector(this.v.set(0,0,-1),.6),this.layout(n)}layout(e){let{camera:t,w:n,h:r}=this,i=[];for(let n=0;n<6;n++)this.v.copy(this.jLocal[n]).applyQuaternion(e).project(t),i.push((-this.v.y*.5+.5)*r);let o=Math.min(...i)-40,s=Math.max(...i)+40,c=1/0;for(let[i,l,u,d]of a){this.v.set(i,l,u).applyQuaternion(e),this.v2.copy(this.v).addScaledVector(this.right.set(1,0,0).applyQuaternion(t.quaternion),d).project(t),this.v.project(t);let a=(this.v.x*.5+.5)*n,f=(-this.v.y*.5+.5)*r,p=Math.abs((this.v2.x*.5+.5)*n-a);f+p<o||f-p>s||(c=Math.min(c,a-p))}this.colX=Math.max(this.opt.tall?112:200,c-(this.opt.tall?6:30));let l=this.opt.tall?30:Math.max(40,r*.052),u=i.map((e,t)=>[e,t]).sort((e,t)=>e[0]-t[0]),d=u.map(e=>e[0]);for(let e=1;e<d.length;e++)d[e]=Math.max(d[e],d[e-1]+l);let f=this.opt.tall?r*.3:34;if(d[0]<f){let e=f-d[0];for(let t=0;t<d.length;t++)d[t]+=e}for(let e=d.length-2;e>=0;e--)d[e]=Math.min(d[e],d[e+1]-l);u.forEach((e,t)=>this.labelY[e[1]]=d[t]);let p=this.host.parentElement?.querySelector(`.v11-title`)?.getBoundingClientRect();this.cardMax=this.opt.tall||!p?r-18:p.top-14}endPose(e){let t=k[e];this.group.updateMatrixWorld();let n=this.v2.copy(this.jLocal[e]).applyMatrix4(this.group.matrixWorld).clone(),r=this.home.pos.clone().sub(n).normalize(),i=Math.tan(this.home.fov*Math.PI/360),a=this.w/this.h,o=t.size*1.3*.64,s=Math.min(o/(2*i*a),o*1.15/(2*i))*.92;return{pos:n.clone().addScaledVector(r,s),tgt:n,cx:.5,cy:.5,fov:this.home.fov}}applyPose(e){let{camera:t}=this;t.position.copy(e.pos),t.up.set(0,1,0),t.lookAt(e.tgt),t.fov=e.fov,t.setViewOffset(this.w,this.h,-(e.cx-.5)*this.w,-(e.cy-.5)*this.h,this.w,this.h),t.updateProjectionMatrix(),t.updateMatrixWorld()}setTarget(e,t=!1){(e!==this.target||t)&&(this.from=pe(this.current()),this.to=e==null?this.home:this.endPose(e),this.dur=e==null?1:.95,this.k=t||this.opt.reduced?1:0,this.t0=performance.now(),this.target=e,this.arrived=t,this.landed=0,this.ctl.flash&&e!=null&&!t&&(this.ctl.flash.style.opacity=`0`),window.clearTimeout(this.safety),!t&&this.opt.hold==null&&(this.safety=window.setTimeout(()=>this.arrive(),(this.k>=1?0:this.dur*1e3)+250)),this.wake())}arrive(){this.arrived||(this.arrived=!0,this.landed=performance.now(),this.k=1,this.target==null?this.ctl.onHome():this.ctl.onArrive(this.target))}setHover(e){this.hover=e}setActive(e){this.active=e,e&&this.wake()}current(){let{from:e,to:t,cur:n}=this,r=P(this.k);return n.pos.lerpVectors(e.pos,t.pos,r),n.tgt.lerpVectors(e.tgt,t.tgt,P(Math.min(1,this.k*1.25))),n.cx=e.cx+(t.cx-e.cx)*r,n.cy=e.cy+(t.cy-e.cy)*r,n.fov=e.fov+(t.fov-e.fov)*r+Math.sin(Math.PI*r)*7,n}start(){this.running=!0,this.wake()}wake(){!this.running||this.raf||this.lost||document.hidden||(this.last=0,this.raf=requestAnimationFrame(this.tick))}onVis=()=>{document.hidden?(cancelAnimationFrame(this.raf),this.raf=0):this.wake()};onLost=e=>{e.preventDefault(),this.lost=!0,cancelAnimationFrame(this.raf),this.raf=0,this.ctl.onFail()};resize=()=>{let e=this.host.clientWidth||window.innerWidth,t=this.host.clientHeight||window.innerHeight;this.w=e,this.h=t,this.renderer.setSize(e,t,!1),this.frame();for(let n of[this.rayMat,this.shaftIn,...this.beamMats])n.uniforms.uRes.value.set(e,t);this.target!=null&&this.arrived?this.from=this.to=this.endPose(this.target):this.target==null&&this.k>=1&&(this.from=this.to=this.home),this.wake()};tick=e=>{if(this.raf=0,!this.running||this.lost)return;let t=this.k<1;if(!this.active&&!t&&this.ready)return;this.raf=requestAnimationFrame(this.tick);let n=this.last?(e-this.last)/1e3:.016;this.last=e;let r=Math.min(n,.05),i=this.ready&&!this.frozen;i&&(this.time+=r);let{opt:a,ctl:o,camera:s}=this,c=performance.now();this.intro<1&&this.bodyIn&&(this.introT0||=this.frames>0?c:0,this.introT0&&(this.intro=Math.min(1,(c-this.introT0)/1e3/this.introDur)));let l=this.bodyIn&&(a.reduced||this.opt.startAt!=null)?1.3:0,u=F(this.intro);this.common.uTime.value=this.time,this.common.uIgnite.value=.35+.65*F(Math.min(1,this.intro*1.8+(this.bodyIn?.1:0))),this.common.uGrow.value=Math.max(l,this.bodyIn?this.intro*1.3:0);let d=this.common.uGrow.value;this.k<1&&(this.k=Math.min(1,(c-this.t0)/1e3/this.dur)),a.hold!=null&&this.target!=null&&this.k>a.hold&&(this.k=a.hold);let f=this.target==null;this.homeW+=((f?P(this.k):1-P(Math.min(1,this.k*2.5)))-this.homeW)*Math.min(1,r*6);let p=this.homeW,m=I(1-p);this.common.uFly.value=m,this.sheen&&(this.sheen.visible=m>.002||!this.ready),f&&this.k>=1&&!a.reduced&&i&&(this.swayT+=r);let h=this.swayT;this.group.quaternion.setFromEuler(R),this.group.rotateY(.2*Math.sin(h*.21)+(1-u)*.35),this.group.rotateZ(.025*Math.sin(h*.33+1)),this.group.position.set(0,.018*Math.sin(h*.4),0),this.group.updateMatrixWorld(),i&&(this.px+=(o.pointer[0]-this.px)*Math.min(1,r*2.4),this.py+=(o.pointer[1]-this.py)*Math.min(1,r*2.4));let g=this.current();this.applyPose(g);let _=+!a.reduced;this.right.set(1,0,0).applyQuaternion(s.quaternion),this.up.set(0,1,0).applyQuaternion(s.quaternion);let v=s.position.distanceTo(g.tgt);s.position.addScaledVector(this.right,p*v*(this.px*.09+_*Math.sin(this.time*.13)*.012)),s.position.addScaledVector(this.up,p*v*(-this.py*.05+_*Math.sin(this.time*.09+1.3)*.008)),s.position.addScaledVector(this.v.copy(s.position).sub(g.tgt).normalize(),p*(1-u)*v*.14),s.lookAt(g.tgt),s.updateMatrixWorld(),this.common.uCam.value.copy(s.position);let y=this.target==null?this.hover:this.target;for(let e=0;e<6;e++){this.jPos[e].copy(this.jLocal[e]).applyMatrix4(this.group.matrixWorld);let t=+(y===e);this.flare[e]+=(t-this.flare[e])*Math.min(1,r*8);let n=this.flare[e],i=I((d-(e===0?.05:.3))/.35),a=.55+.08*Math.sin(this.time*.9+e*1.7);this.jPow[e]=(a+1.1*n)*i;let o=this.jewelMats[e].uniforms;o.uFlare.value=n,o.uShow.value=i,o.uDim.value=y!=null&&y!==e&&this.target==null?.62:1,o.uCut.value=m,o.uSize.value=k[e].size*B*(1+.12*n*p)*(.6+.4*F(i)),this.jewels[e].renderOrder=4+n+(e===0?.01:0);let s=this.beamMats[e].uniforms;s.uFlare.value=n*p,s.uA.value.copy(this.jPos[e]),s.uB.value.copy(this.common.uStar.value)}let b=this.jPos[0];this.v.copy(this.right).multiplyScalar(Math.cos(1.16)).addScaledVector(this.up,Math.sin(1.16)),this.rayMat.uniforms.uA.value.copy(b).addScaledVector(this.v,-.7),this.rayMat.uniforms.uB.value.copy(b).addScaledVector(this.v,.7),this.rayMat.uniforms.uShow.value=I((d-.1)/.6),this.rayMat.uniforms.uFlare.value=this.flare[0],this.rayMat.uniforms.uW0.value=this.rayMat.uniforms.uW1.value=Math.max(6,this.h*.011);let x=this.v2.copy(this.jPos[1]),S=this.h/900;if(this.shaftIn.uniforms.uA.value.copy(this.common.uStar.value),this.shaftIn.uniforms.uB.value.copy(x),this.shaftIn.uniforms.uW1.value=80*S,this.shaftIn.uniforms.uGain.value=.2*p,this.renderer.render(this.scene,s),this.frames++,this.place(),o.flash&&this.target!=null){if(this.k<1){let e=I(1-this.dur*(1-this.k)/.14);o.flash.style.opacity=(.5*e*e*(3-2*e)).toFixed(3)}else this.landed&&(o.flash.style.opacity=(.5*I(1-(c-this.landed)/250)).toFixed(3))}!this.ready&&this.bodyIn&&this.loaded>=6&&this.intro>=1&&this.frames>2&&(this.ready=!0,o.onReady()),!this.arrived&&this.k>=1&&(window.clearTimeout(this.safety),this.arrive()),this.intro>=1&&n>.03?++this.slow>24&&this.dpr>.8&&(this.slow=0,this.dpr=Math.max(.75,this.dpr*.82),this.renderer.setPixelRatio(this.dpr),this.renderer.setSize(this.w,this.h,!1)):this.slow>0&&this.slow--};place(){let{ctl:e,camera:t,w:n,h:r,v:i}=this,a=this.target==null?this.hover:null,o=a==null?0:Math.max(168,Math.min(this.cardMax-150,this.labelY[a]));for(let s=0;s<6;s++){let c=e.buttons[s];if(!c)continue;let l=k[s];i.copy(this.jPos[s]).project(t);let u=i.z<1&&i.z>-1,d=(i.x*.5+.5)*n,f=(-i.y*.5+.5)*r;i.copy(this.jPos[s]).addScaledVector(this.right,l.size*.5).project(t);let p=Math.abs((i.x*.5+.5)*n-d);u&&(d<-40||d>n+40||f<-40||f>r+40||p>n*.4)&&(u=!1);let m=u?`1`:`0`;if(this.vis[s]!==m&&(this.vis[s]=m,c.dataset.vis=m),!u)continue;let h=this.colX-d,g=this.labelY[s]-f,_=this.colX+2,v=this.labelY[s],y=d-_,b=f-v,x=Math.hypot(y,b)-p*1.08-3,S=p*2.3,C=c.style;C.transform=`translate3d(${(d-S/2).toFixed(1)}px, ${(f-S/2).toFixed(1)}px, 0)`,C.width=C.height=`${S.toFixed(1)}px`,C.setProperty(`--gw`,`${(p*2.4+16).toFixed(1)}px`),C.setProperty(`--lx`,`${h.toFixed(1)}px`),C.setProperty(`--ly`,`${g.toFixed(1)}px`),C.setProperty(`--ll`,`${Math.max(0,x).toFixed(1)}px`),C.setProperty(`--la`,`${Math.atan2(b,y).toFixed(4)}rad`),C.setProperty(`--cy`,`${(Math.max(168,Math.min(this.cardMax-150,v))-f).toFixed(1)}px`);let w=a!=null&&a!==s&&!this.opt.tall&&Math.abs(this.labelY[s]-o)<172?`1`:`0`;c.dataset.under!==w&&(c.dataset.under=w)}}freeze(){this.frozen=!0,this.swayT=0,this.time=0,this.px=this.py=0}spots(){let e=e=>Math.round(e*1e3)/1e3;return this.jPos.map((t,n)=>{this.v.copy(t).project(this.camera);let r=this.v.x*.5+.5;this.v2.copy(t).addScaledVector(this.right,k[n].size*.5).project(this.camera);let i=Math.abs((this.v2.x-this.v.x)*.5)*this.w;return[e(r),e(-this.v.y*.5+.5),e(i*2.3/this.h),e(this.colX/this.w),e(this.labelY[n]/this.h)]})}dispose(){this.disposed=!0,this.running=!1,window.clearTimeout(this.safety),cancelAnimationFrame(this.raf),this.raf=0,window.removeEventListener(`resize`,this.resize),document.removeEventListener(`visibilitychange`,this.onVis);let e=this.renderer.domElement;e.removeEventListener(`webglcontextlost`,this.onLost);for(let e of this.disposables)e.dispose();this.scene.clear(),this.renderer.dispose();try{this.renderer.forceContextLoss()}catch{}e.remove()}},he=e({default:()=>$}),X=n(),Z=()=>i(()=>import(`./Module-D4vORXKq.js`),__vite__mapDeps([2,1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]),import.meta.url),ge=(0,O.lazy)(Z),_e=window.innerWidth<700||window.innerWidth/window.innerHeight<.8;new Image().src=`./themes/V11/${_e?`still_tall`:`still`}.jpg`;var ve=Promise.race([Promise.all([document.fonts.load(`800 54px 'Syne Variable'`),document.fonts.load(`500 18px 'Red Hat Display Variable'`)]),new Promise(e=>window.setTimeout(e,1200))]).catch(()=>{}),Q=e=>{window.location.hash=`#/proto/V11/${e}`},ye=[[.536,.451,.155,.324,.451],[.552,.308,.112,.324,.309],[.411,.389,.107,.324,.387],[.499,.751,.102,.324,.751],[.561,.104,.093,.324,.105],[.527,.168,.076,.324,.169]],be=[[.646,.606,.075,.307,.611],[.673,.537,.054,.307,.537],[.438,.577,.052,.307,.575],[.584,.751,.049,.307,.751],[.688,.44,.044,.307,.441],[.632,.471,.036,.307,.476]];function xe(){let[e,t]=(0,O.useState)(()=>[window.innerWidth,window.innerHeight]);return(0,O.useEffect)(()=>{let e=()=>t([window.innerWidth,window.innerHeight]);return window.addEventListener(`resize`,e),()=>window.removeEventListener(`resize`,e)},[]),e}function Se([e,t,n,r,i],a,o,s){let c=s?a/390:o/900,l=s?a:1440*c,u=s?844*c:o,d=s?0:.535*(a-l),f=s?.63*(o-u):0,p=d+e*l,m=f+t*u,h=n*u,g=h/2.3,_=d+r*l+2,v=f+i*u,y=p-_,b=m-v;return{transform:`translate3d(${p-h/2}px, ${m-h/2}px, 0)`,width:`${h}px`,height:`${h}px`,"--gw":`${g*2.4+16}px`,"--lx":`${_-2-p}px`,"--ly":`${v-m}px`,"--ll":`${Math.max(0,Math.hypot(y,b)-g*1.08-3)}px`,"--la":`${Math.atan2(b,y)}rad`,"--cy":`${Math.max(168,Math.min(s?o-168:o-.086*o-120-164,v))-m}px`}}function $({view:e,params:t}){let n=te(e),[r]=(0,O.useState)(()=>window.innerWidth<700||window.innerWidth/window.innerHeight<.8),[i]=(0,O.useState)(()=>window.matchMedia(`(prefers-reduced-motion: reduce)`).matches),[a,o]=(0,O.useState)(()=>t.get(`still`)!==`1`&&N()),[s,c]=(0,O.useState)(!1),[l,u]=(0,O.useState)(!1);(0,O.useEffect)(()=>{let e=!0;return ve.then(()=>e&&u(!0)),()=>{e=!1}},[]);let[d,f]=(0,O.useState)(!1),[p,m]=(0,O.useState)(null),[h,g]=(0,O.useState)(null),[_,v]=(0,O.useState)(!1),[y,b]=(0,O.useState)(n),x=(0,O.useRef)(null),S=(0,O.useRef)(null),C=(0,O.useRef)(null),w=(0,O.useRef)(p);w.current=p;let T=t.get(`bare`)===`1`,[E,D]=xe(),j=(0,O.useRef)(null);j.current||={buttons:[],pointer:[0,0],flash:null,onArrive:()=>{},onHome:()=>{},onReady:()=>{},onFail:()=>{}};let M=j.current;M.onArrive=e=>{w.current===e&&Q(k[e].id)},M.onHome=()=>v(!1),M.onReady=()=>c(!0),M.onFail=()=>o(!1),(0,O.useEffect)(()=>{if(!a||!x.current)return;let e;try{M.flash=S.current,e=new me(x.current,M,{tall:r,reduced:i,startAt:n>=0?n:null,hold:t.get(`hold`)?Number(t.get(`hold`)):null})}catch{o(!1);return}return C.current=e,window.__v11=e,e.setActive(n<0),e.start(),()=>{e.dispose(),C.current=null}},[a]);let P=n>=0?n:p;(0,O.useEffect)(()=>{let e=C.current;e&&(e.setActive(n<0),e.setTarget(P,n>=0))},[P,n]),(0,O.useEffect)(()=>{C.current?.setHover(P==null?h:null)},[h,P]),(0,O.useEffect)(()=>{m(null),g(null)},[n]),y!==n&&(b(n),n<0&&y>=0&&a&&v(!0));let F=(0,O.useCallback)(e=>{if(!C.current||i)return Q(k[e].id);m(e)},[i]);(0,O.useEffect)(()=>{let e=e=>{if(!(e.metaKey||e.ctrlKey||e.altKey)){if(n>=0)e.key===`Escape`&&Q(`home`);else if(!(p!=null||_)){if(e.key>=`1`&&e.key<=`6`)F(Number(e.key)-1);else if(e.key===`ArrowRight`||e.key===`ArrowUp`||e.key===`ArrowLeft`||e.key===`ArrowDown`){let t=e.key===`ArrowRight`||e.key===`ArrowDown`?1:-1,n=M.buttons.findIndex(e=>e===document.activeElement),r=n<0?(h??(t>0?-1:0))+t:n+t;M.buttons[(r+6)%6]?.focus(),e.preventDefault()}}}};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[n,p,_,F,h,M]),(0,O.useEffect)(()=>{if(!s&&a)return;let e=window.setTimeout(()=>{Z();let e=[...k.map(e=>e.wide),`./tracktrace/ionscan_architecture.svg`,`./spikecount/fields/96.png`];for(let t of e){let e=new Image;e.src=t}for(let e of[`./tracktrace/gallery/gallery.json`,`./tracktrace/gallery/gallery_P242_G4.f16.bin.gz`])fetch(e).catch(()=>{})},500);return()=>window.clearTimeout(e)},[s,a]);let I=n>=0?n:p,L=n>=0,R=L?`open`:p==null?_?`back`:`home`:`fly`,z=L?d:!a||s,B=P==null?h==null?null:k[h]:k[P],V=r?be:ye;return(0,X.jsxs)(`div`,{className:`v11`,"data-phase":R,"data-ready":z?`1`:`0`,"data-webgl":a?`1`:`0`,"data-tall":r?`1`:`0`,"data-scene":s?`1`:`0`,"data-font":l?`1`:`0`,"data-bare":T?`1`:`0`,"data-lit":B&&R===`home`?`1`:`0`,style:{"--hue":B?.hue??`#b9a8ff`},onPointerMove:e=>{e.pointerType===`mouse`&&(M.pointer=[e.clientX/window.innerWidth*2-1,e.clientY/window.innerHeight*2-1])},children:[(0,X.jsx)(`div`,{className:`v11-scene`,ref:x,"aria-hidden":`true`,children:(0,X.jsx)(`div`,{className:`v11-still`,style:{backgroundImage:`url(./themes/V11/${r?`still_tall`:`still`}.jpg)`}})}),(0,X.jsx)(`div`,{className:`v11-veil`,"aria-hidden":`true`}),(0,X.jsxs)(`div`,{className:`v11-home`,inert:R!==`home`,children:[(0,X.jsx)(`nav`,{className:`v11-jewels`,"aria-label":`The six health checks`,children:k.map((e,t)=>(0,X.jsxs)(`button`,{type:`button`,className:`v11-ch`,"data-vis":a?`0`:`1`,"data-hot":h===t?`1`:`0`,"data-qa":t===0?`primary`:void 0,"aria-describedby":`v11-say-${e.id}`,style:{"--h":e.hue,...a?null:Se(V[t],E,D,r)},ref:e=>{M.buttons[t]=e},onClick:()=>F(t),onPointerEnter:e=>e.pointerType===`mouse`&&g(t),onPointerLeave:()=>g(e=>e===t?null:e),onFocus:()=>g(t),onBlur:()=>g(e=>e===t?null:e),children:[(0,X.jsx)(`span`,{className:`v11-ch-ring`,"aria-hidden":`true`,children:(0,X.jsx)(`svg`,{viewBox:`-4 -4 108 123.47`,children:(0,X.jsx)(`polygon`,{points:`50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87`})})}),(0,X.jsx)(`span`,{className:`v11-ch-lead`,"aria-hidden":`true`}),(0,X.jsxs)(`span`,{className:`v11-ch-tag`,children:[(0,X.jsx)(`b`,{children:e.name}),` `,(0,X.jsx)(`i`,{children:e.n})]}),(0,X.jsxs)(`span`,{className:`v11-card`,"aria-hidden":`true`,children:[(0,X.jsx)(`span`,{className:`v11-card-img`,style:A(e,300,176)}),(0,X.jsxs)(`span`,{className:`v11-card-txt`,children:[(0,X.jsxs)(`span`,{className:`v11-card-name`,children:[e.name,` `,(0,X.jsx)(`i`,{children:e.n})]}),(0,X.jsx)(`span`,{className:`v11-card-line`,children:e.sentence})]})]})]},e.id))}),(0,X.jsx)(`div`,{className:`v11-say`,children:k.map(e=>(0,X.jsx)(`span`,{id:`v11-say-${e.id}`,children:e.sentence},e.id))}),(0,X.jsxs)(`header`,{className:`v11-title`,children:[(0,X.jsxs)(`h1`,{children:[`Super`,(0,X.jsx)(`span`,{children:`Humans`})]}),(0,X.jsxs)(`div`,{className:`v11-read`,children:[(0,X.jsx)(`p`,{className:`v11-line`,children:ee}),r&&B&&R===`home`&&(0,X.jsx)(`div`,{className:`v11-focus`,children:(0,X.jsx)(`p`,{className:`v11-focus-line`,children:B.sentence})},B.id)]})]})]}),(0,X.jsx)(`p`,{className:`v11-mark`,children:`AI-generated imagery`}),(0,X.jsx)(`div`,{className:`v11-flash`,ref:S,"data-out":R===`fly`?`0`:`1`,"aria-hidden":`true`}),I!=null&&I>=0&&(0,X.jsx)(O.Suspense,{fallback:null,children:(0,X.jsx)(ge,{check:k[I],index:I,shown:L,onReady:f},k[I].id)})]})}export{$ as default,k as n,he as t};
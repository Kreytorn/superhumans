const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./Module-NI7bUQTP.js","./rolldown-runtime-XKyaHtl9.js","./index-CXFNwQMY.js","./index-CvU9-K1k.css","./tracktrace-DOgVAT34.js","./tracktrace-CFLwFIW8.js","./client-CD6l6M49.js","./tracktrace-B8tYtE4W.css","./bubblegrade-EIh7Mj5X.js","./bubblegrade-Ty8Jirxm.js","./bubblegrade-BG81yi9O.css","./newsreader-In2980oI.css","./geist-mono-C5knphS1.css","./veinsqueeze-DTTuI81I.js","./honesty-D1yHS4ET.js","./veinsqueeze-BJSarZNv.css","./instrument-sans-BkCNIqpb.css","./braindrift-HRrvTp97.js","./braindrift-DFimSZpn.js","./three.module-DS1lwPcu.js","./braindrift-B_i9pn98.css","./garnmeter-Bn3bVOQi.js","./garnmeter-DB8lqCrR.css","./spline-sans-mono-BSXwSnXg.css","./spikecount-DVce7RGm.js"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";/* empty css             *//* empty css                        *//* empty css                   */import{n,s as r,t as i}from"./index-CXFNwQMY.js";import{$ as a,At as o,D as s,E as c,L as l,O as u,R as d,S as f,U as p,W as m,Z as h,b as g,bt as _,ft as v,h as y,kt as b,lt as x,nt as S,o as C,pt as w,s as T,t as E}from"./three.module-DS1lwPcu.js";var D=t(r(),1),O=[{id:`tracktrace`,n:`01`,name:`TrackTrace`,sentence:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,site:`Cells`,hue:`#ff4fb0`,img:`./_posters/tracktrace.jpg`,crop:[0,.2,.62,.82],imgTall:`./_posters/tracktrace_portrait.jpg`,cropTall:[.083,0,.917,1],at:33,atTall:42,run:`Scan the nucleus`},{id:`bubblegrade`,n:`02`,name:`BubbleGrade`,sentence:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,site:`Heart`,hue:`#ff9a3d`,img:`./_posters/bubblegrade.jpg`,crop:[0,0,1,1],imgTall:`./_posters/bubblegrade_portrait.jpg`,cropTall:[.083,0,.917,1],at:56,atTall:61,run:`Play the heart sound`},{id:`spikecount`,n:`03`,name:`SpikeCount`,sentence:`Every red blood cell, outlined. The spiky ones, counted.`,site:`Blood`,hue:`#ff5a52`,img:`./spikecount/fields/96.png`,crop:[0,.2,1,.825],imgTall:`./spikecount/fields/96.png`,cropTall:[.19,0,.815,1],at:80,atTall:83,run:`Grade this blood`},{id:`veinsqueeze`,n:`04`,name:`VeinSqueeze`,sentence:`A clot is a vein that won’t squash.`,site:`Leg vein`,hue:`#ffd23f`,img:`./_posters/veinsqueeze.jpg`,crop:[0,0,1,1],imgTall:`./_posters/veinsqueeze_portrait.jpg`,cropTall:[.083,0,.917,1],at:108,atTall:108,run:`Press the probe`},{id:`braindrift`,n:`05`,name:`BrainDrift`,sentence:`In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.`,site:`Brain`,hue:`#4fd0ff`,img:`./_posters/braindrift.jpg`,crop:[.1,.1,.9,.9],imgTall:`./_posters/braindrift_portrait.jpg`,cropTall:[.083,0,.917,1],at:140,atTall:136,run:`Fly the brain`},{id:`garnmeter`,n:`06`,name:`Garn Meter`,sentence:`Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.`,site:`Inner ear`,hue:`#9a8cff`,img:`./_posters/garnmeter.jpg`,crop:[0,0,1,1],imgTall:`./_posters/garnmeter_portrait.jpg`,cropTall:[.083,0,.917,1],at:174,atTall:165,run:`Play the session`}];function k(e){return O.findIndex(t=>t.id===e)}function ee(){try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}var A=160,j=30,M=.3,N=40,P=25,F=Math.PI*2,I=Math.sin(M),L=Math.cos(M);function R(e,t,n,r){let i=Math.cos(e),a=Math.sin(e),o=A+t*I-n*L;return r.set(i*o,t*L+n*I,a*o)}function z(e,t,n,r){let i=Math.cos(e),a=Math.sin(e);t.set(-a,0,i),n.set(i*I,L,a*I),r.set(-i*L,I,-a*L)}var B=(e,t)=>{let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)},V=e=>e*e*(3-2*e);function te(e,t){let n=Math.floor(e),r=Math.floor(t),i=V(e-n),a=V(t-r),o=B(n,r),s=B(n+1,r),c=B(n,r+1),l=B(n+1,r+1);return o+(s-o)*i+(c-o)*a+(o-s-c+l)*i*a}var H=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,U=e=>1-(1-e)**3,W=`
vec3 film(float t) {
  // thin-film colours: cyan, violet, magenta, gold, then pearl back to cyan (gold straight to cyan would pass through olive)
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
`,G=`
uniform vec3 uChPos[6];
uniform vec3 uChCol[6];
uniform float uChPow[6];
`,ne=`
attribute vec3 aBary;
attribute vec2 aTop;   // x: 1 on the top ring and the tip, y: 1 on the tip
attribute vec4 aSeed;  // hash, taper, tip height, chamber index + 1
attribute float aAng;
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying float vAng;
varying vec3 vUp;
void main() {
  vec3 p = position;
  p.xz *= mix(1.0, aSeed.y, aTop.x);
  p.y += aTop.y * aSeed.z;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vBary = aBary;
  vSeed = aSeed;
  vAng = aAng;
  vUp = normalize(mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,re=`
precision highp float;
uniform vec3 uCam;
uniform float uTime;
uniform float uIgnite;
uniform float uClip;
${G}
varying vec3 vW;
varying vec3 vBary;
varying vec4 vSeed;
varying float vAng;
varying vec3 vUp;
${W}
void main() {
  vec3 toCam = uCam - vW;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  N = normalize(mix(N, vUp, smoothstep(150.0, 320.0, dist) * 0.75));
  vec3 L = normalize(-vW);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float ndl = max(dot(N, L), 0.0);
  float fres = pow(1.0 - ndv, 2.4);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 140.0);

  float ft = ndv * 0.85 + vSeed.x * 0.46 + vAng * 3.0 + uTime * 0.012;
  vec3 fc = film(ft);
  // close to the camera the crystals read as dark glass with lit edges, not as filled blocks
  float near = 1.0 - smoothstep(22.0, 75.0, dist);
  // dim gold on a big near face reads as khaki: near faces keep to cyan, violet and magenta
  vec3 fcf = mix(fc, film(fract(ft) * 0.44), smoothstep(0.0, 0.35, near));
  vec3 glass = mix(vec3(0.034, 0.020, 0.095), vec3(0.012, 0.062, 0.090), vSeed.x);
  glass = mix(glass, vec3(0.062, 0.036, 0.13), near * 0.6);
  vec3 col = glass * (0.30 + 1.25 * ndl) * (1.0 - 0.2 * near);
  col += fcf * (0.11 * ndl * (1.0 - 0.7 * near) + 0.80 * fres * (1.0 - 0.3 * near));
  col += vec3(1.0, 0.97, 0.92) * spec * 3.2;

  vec3 fw = fwidth(vBary);
  vec3 a3 = smoothstep(vec3(0.0), fw * 1.2, vBary);
  float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
  edge *= 1.0 - 0.55 * smoothstep(120.0, 330.0, dist);
  float run = pow(max(0.0, sin(vAng * 6.2832 * 7.0 - uTime * 0.5 + vSeed.x * 1.6)), 12.0);
  float tw = pow(max(0.0, sin(uTime * (0.5 + vSeed.x) + vSeed.x * 60.0)), 40.0);
  col += fc * edge * (0.50 + 1.05 * near + 1.7 * run);
  col += fc * (run * 0.10 + tw * 0.85);

  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    float d2 = dot(dv, dv);
    float a = uChPow[i] / (1.0 + d2 * 0.006);
    col += uChCol[i] * a * (0.22 + 0.78 * max(dot(N, dv * inversesqrt(d2)), 0.0)) * (0.5 + 0.9 * edge);
  }
  int ci = int(vSeed.w + 0.5) - 1;
  if (ci >= 0) {
    vec3 hc = uChCol[ci];
    col += hc * (0.20 + 0.9 * fres + 1.3 * edge) * (0.55 + 0.75 * uChPow[ci]);
  }
  col *= uIgnite;
  col = 1.0 - exp(-col * 1.2);
  // during a flight, crystals right at the lens dissolve instead of filling the screen with flat faces
  if (uClip > 0.0) {
    float dh = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (dh > smoothstep(uClip * 0.4, uClip, dist)) discard;
  }
  gl_FragColor = vec4(col, 1.0);
}
`,K=`
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,ie=`
precision highp float;
uniform float uTime;
uniform float uIgnite;
${G}
varying vec2 vUv;
varying vec3 vW;
${W}
void main() {
  vec3 fc = film(vUv.x * 3.0 + 0.18 + uTime * 0.012);
  float run = pow(max(0.0, sin(vUv.x * 6.2832 * 7.0 - uTime * 0.5)), 6.0);
  vec3 col = fc * (0.20 + 0.45 * run);
  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    col += uChCol[i] * uChPow[i] * 0.5 / (1.0 + dot(dv, dv) * 0.004);
  }
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`,ae=`
precision highp float;
uniform float uTime;
uniform float uIgnite;
uniform float uGain;
${G}
varying vec2 vUv;
varying vec3 vW;
${W}
void main() {
  float x = (vUv.y - 0.5) * 2.0;
  float a = exp(-x * x * 5.5);
  a *= a;
  vec3 col = film(vUv.x * 3.0 + 0.1 + uTime * 0.012) * 0.55;
  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    col += uChCol[i] * uChPow[i] * 2.2 / (1.0 + dot(dv, dv) * 0.0016);
  }
  gl_FragColor = vec4(col * a * uGain * uIgnite, 1.0);
}
`,oe=`
precision highp float;
uniform float uTime;
uniform float uIgnite;
${G}
varying vec2 vUv;
varying vec3 vW;
${W}
void main() {
  float r = length(vW.xz);
  float a = smoothstep(${55 .toFixed(1)}, ${130 .toFixed(1)}, r) * (1.0 - smoothstep(${134 .toFixed(1)}, ${147 .toFixed(1)}, r));
  a = a * a;
  float ang = atan(vW.z, vW.x) / 6.2832;
  vec3 col = film(ang * 3.0 + 0.1 + uTime * 0.012) * 0.07;
  for (int i = 0; i < 6; i++) {
    vec3 dv = uChPos[i] - vW;
    col += uChCol[i] * uChPow[i] * 0.5 / (1.0 + dot(dv, dv) * 0.0011);
  }
  gl_FragColor = vec4(col * a * uIgnite, 1.0);
}
`,se=`
precision highp float;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
varying vec3 vW;
${W}
void main() {
  vec3 col = mix(vec3(1.0), film(vUv.x * 3.0 + 0.3 + uTime * 0.012), 0.55) * 1.15;
  float run = pow(max(0.0, sin(vUv.x * 6.2832 * 7.0 - uTime * 0.5)), 8.0);
  gl_FragColor = vec4(col * (0.75 + 0.6 * run) * uIgnite, 1.0);
}
`,ce=`
varying vec2 vP;
varying vec3 vW;
void main() {
  vP = position.xy / vec2(${N.toFixed(1)}, ${P.toFixed(1)});
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,le=`
precision highp float;
uniform sampler2D uTex;
uniform vec4 uCrop;
uniform vec4 uM;
uniform vec3 uHue;
uniform float uFlare;
uniform float uInvert;
uniform float uIgnite;
uniform float uTime;
varying vec2 vP;
varying vec3 vW;
void main() {
  // window in the middle, a lit frame round it
  vec2 fr = vec2(0.022 * ${(P/N).toFixed(4)}, 0.022);
  vec2 q = vP / (1.0 - 2.0 * fr);
  vec2 iuv = vec2(dot(uM.xy, q), dot(uM.zw, q)) + 0.5;
  float inside = step(abs(q.x), 0.5) * step(abs(q.y), 0.5);
  vec2 tuv = vec2(mix(uCrop.x, uCrop.z, iuv.x), 1.0 - mix(uCrop.w, uCrop.y, iuv.y));
  vec3 img = texture2D(uTex, tuv).rgb;
  if (uInvert > 0.5) {
    float mx = max(img.r, max(img.g, img.b));
    float mn = min(img.r, min(img.g, img.b));
    img = img + (1.0 - mx - mn);
    img = pow(max(img, 0.0), vec3(1.25));
  }
  float e = min(0.5 - abs(q.x), 0.5 - abs(q.y));
  vec3 col = img * (1.06 + 0.22 * uFlare) + uHue * 0.02;
  col += uHue * (0.16 + 0.34 * uFlare) * exp(-max(e, 0.0) * 22.0);
  vec3 frame = mix(uHue, vec3(1.0), 0.45) * (1.05 + 0.9 * uFlare);
  col = mix(frame, col, inside);
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`,ue=`
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += (uv - 0.5) * uSize;
  gl_Position = projectionMatrix * mv;
}
`,de=`
precision highp float;
uniform float uTime;
uniform float uIgnite;
varying vec2 vUv;
${W}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float flick = 0.94 + 0.06 * sin(uTime * 2.3) * sin(uTime * 1.7 + 1.0);
  float core = smoothstep(0.034, 0.016, r);
  float halo = 0.0026 / (r * r + 0.0018);
  float wide = exp(-r * 4.2) * 0.42;
  float sx = exp(-abs(p.y) * 150.0) * exp(-abs(p.x) * 2.6);
  float sx2 = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 5.5) * 0.22;
  float sy = exp(-abs(p.x) * 190.0) * exp(-abs(p.y) * 7.0) * 0.5;
  vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  float sd = (exp(-abs(d.y) * 230.0) + exp(-abs(d.x) * 230.0)) * exp(-r * 9.0) * 0.35;
  float ring = exp(-pow((r - 0.30) / 0.012, 2.0)) * 0.10 + exp(-pow((r - 0.47) / 0.02, 2.0)) * 0.045;
  vec3 col = vec3(1.0, 0.98, 0.95) * core * 4.0;
  col += vec3(0.86, 0.88, 1.0) * halo * flick;
  col += vec3(0.50, 0.36, 0.95) * wide * flick;
  col += vec3(0.50, 0.80, 1.0) * (sx * 1.9 + sx2) * flick;
  col += vec3(0.85, 0.80, 1.0) * (sy + sd);
  col += film(atan(p.y, p.x) / 6.2832 + r * 1.5 + 0.1) * ring;
  col *= smoothstep(1.0, 0.55, r) * uIgnite;
  gl_FragColor = vec4(col, 1.0);
}
`,fe=`
precision highp float;
uniform vec3 uHue;
uniform float uFlare;
uniform float uIgnite;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float g = exp(-r * r * 4.0) * 0.16;
  float sx = exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 3.2) * uFlare * 0.8;
  vec3 col = uHue * (g * (0.35 + 1.6 * uFlare) + sx) + vec3(1.0) * sx * 0.35;
  gl_FragColor = vec4(col * smoothstep(1.0, 0.6, r) * uIgnite, 1.0);
}
`,pe=`
varying float vT;
varying vec3 vN;
varying vec3 vW;
void main() {
  vT = uv.y;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,me=`
precision highp float;
uniform vec3 uCam;
uniform vec3 uHue;
uniform float uFlare;
uniform float uTime;
uniform float uIgnite;
varying float vT;
varying vec3 vN;
varying vec3 vW;
void main() {
  float rim = pow(abs(dot(normalize(vN), normalize(uCam - vW))), 2.0);
  float flow = 0.55 + 0.45 * sin(vT * 90.0 - uTime * 9.0);
  float a = (0.07 + 0.93 * uFlare) * rim * mix(1.0, flow, 0.5 * uFlare);
  a *= smoothstep(0.0, 0.02, vT) * (0.35 + 0.65 * smoothstep(1.0, 0.0, vT));
  vec3 col = mix(uHue, vec3(1.0), 0.25 * uFlare) * a * 1.5;
  gl_FragColor = vec4(col * uIgnite, 1.0);
}
`,he=`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}
`,ge=`
precision highp float;
uniform float uTime;
uniform vec3 uStar;
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
  vec3 col = mix(vec3(0.006, 0.030, 0.042), vec3(0.050, 0.014, 0.115), smoothstep(-0.55, 0.55, d.y + (n1 - 0.5) * 0.9));
  col *= 0.55 + 0.75 * n1;
  // a few broad folds of faint light
  float fold = smoothstep(0.42, 0.92, n2) * (0.45 + 0.55 * n3);
  col += fold * fold * mix(vec3(0.22, 0.05, 0.36), vec3(0.03, 0.22, 0.30), smoothstep(0.3, 0.75, n1)) * 0.55;
  float fold2 = smoothstep(0.55, 1.0, vn(d * 1.7 + vec3(11.0, 2.0, uTime * 0.003) + n2));
  col += fold2 * fold2 * vec3(0.30, 0.12, 0.10) * 0.22;
  // the star lights the dark round it
  float sd = max(dot(d, normalize(uStar)), 0.0);
  col += vec3(0.20, 0.12, 0.42) * pow(sd, 5.0) * 0.55 + vec3(0.35, 0.40, 0.75) * pow(sd, 48.0) * 0.35;
  // a handful of far suns, not a wallpaper
  vec3 g = d * 150.0;
  vec3 id = floor(g);
  float h = hsh(id);
  float pt = smoothstep(0.30, 0.0, length(fract(g) - 0.5)) * step(0.9972, h);
  col += pt * mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.8, 0.9), fract(h * 91.0)) * (0.35 + 0.65 * fract(h * 37.0));
  col *= uIgnite;
  col += (hsh(vec3(gl_FragCoord.xy, 1.0)) - 0.5) / 200.0;
  gl_FragColor = vec4(col, 1.0);
}
`;function _e(){let e=[],t=[],n=[],r=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],i=(r,i,a,o,s)=>{e.push(r,i,a),t.push(...o),n.push(...s)};for(let e=0;e<4;e++){let t=r[e],n=r[(e+1)%4];i(n[0],0,n[1],[1,1,0],[0,0]),i(t[0],0,t[1],[0,1,0],[0,0]),i(t[0],1,t[1],[0,1,1],[1,0]),i(n[0],0,n[1],[1,0,1],[0,0]),i(t[0],1,t[1],[0,1,1],[1,0]),i(n[0],1,n[1],[0,0,1],[1,0]),i(n[0],1,n[1],[1,0,0],[1,0]),i(t[0],1,t[1],[0,1,0],[1,0]),i(0,1,0,[0,0,1],[1,1])}let a=new T;return a.setAttribute(`position`,new f(e,3)),a.setAttribute(`aBary`,new f(t,3)),a.setAttribute(`aTop`,new f(n,2)),a}function ve(e,t,n,r){let i=new Float32Array((e+1)*2*3),a=new Float32Array((e+1)*2*2),o=[],s=new b;for(let c=0;c<=e;c++){let l=c/e*F;R(l,t,r,s).toArray(i,c*6),R(l,n,r,s).toArray(i,c*6+3),a.set([c/e,0,c/e,1],c*4),c<e&&o.push(c*2,c*2+1,c*2+2,c*2+1,c*2+3,c*2+2)}let c=new T;return c.setAttribute(`position`,new C(i,3)),c.setAttribute(`uv`,new C(a,2)),c.setIndex(o),c}function ye(e,t,n,r){let i=[],a=[],o=[],s=new b,c=new b,l=new b,u=new b;for(let d=0;d<=e;d++){let f=d/e*F;R(f,t,n,s),z(f,c,l,u);for(let t=0;t<5;t++){let n=t/5*F;if(i.push(s.x+(l.x*Math.cos(n)+u.x*Math.sin(n))*r,s.y+(l.y*Math.cos(n)+u.y*Math.sin(n))*r,s.z+(l.z*Math.cos(n)+u.z*Math.sin(n))*r),a.push(d/e,t/5),d<e){let e=d*5+t,n=d*5+(t+1)%5;o.push(e,e+5,n,n,e+5,n+5)}}}let d=new T;return d.setAttribute(`position`,new f(i,3)),d.setAttribute(`uv`,new f(a,2)),d.setIndex(o),d}var q=class{renderer;scene=new v;camera=new h(60,1,.5,5e3);disposables=[];raf=0;running=!1;active=!0;last=0;time=0;w=1;h=1;dpr=1;slow=0;frames=0;common={uTime:{value:0},uIgnite:{value:0},uClip:{value:0},uCam:{value:new b}};chPos=Array.from({length:6},()=>new b);chCol=O.map(e=>new b(parseInt(e.hue.slice(1,3),16)/255,parseInt(e.hue.slice(3,5),16)/255,parseInt(e.hue.slice(5,7),16)/255));chPow=[0,0,0,0,0,0];flare=[0,0,0,0,0,0];panelMats=[];haloMats=[];beamMats=[];beams=[];corners=[];upVec=[];theta=[];home;homePos=new b;homeRight=new b;homeUp=new b;ends=[];from;to;k=1;dur=1;t0=0;introT0=0;safety=0;target=null;arrived=!0;near=!0;hover=null;intro=0;introDur=1.4;ready=!1;loaded=0;px=0;py=0;homeW=1;lost=!1;v=new b;q=new S;xs=[0,0,0,0];ys=[0,0,0,0];host;ctl;opt;constructor(e,t,n){this.host=e,this.ctl=t,this.opt=n;let r=new E({antialias:!0,alpha:!1,powerPreference:`high-performance`,stencil:!1});this.renderer=r,r.outputColorSpace=d,r.setClearColor(262924,1),this.dpr=Math.min(window.devicePixelRatio||1,n.tall?1.35:1.5),r.setPixelRatio(this.dpr),r.domElement.className=`v04-canvas`,e.appendChild(r.domElement),r.domElement.addEventListener(`webglcontextlost`,this.onLost),this.build(),this.poses(),this.resize(),this.target=n.startAt,n.startAt==null?(this.from=this.to=this.home,n.reduced&&(this.intro=1)):(this.from=this.to=this.ends[n.startAt],this.intro=1),this.k=1,window.addEventListener(`resize`,this.resize),document.addEventListener(`visibilitychange`,this.onVis)}mat(e,t,n,r={}){let i=new w({vertexShader:e,fragmentShader:t,uniforms:{...this.common,...n},...r});return this.disposables.push(i),i}chamberUniforms(){return{uChPos:{value:this.chPos},uChCol:{value:this.chCol},uChPow:{value:this.chPow}}}build(){let{scene:e,opt:t}=this,n={blending:2,depthWrite:!1,transparent:!0},r=new b,i=new b,d=new b,f=new b,h=t.at?t.at.split(`,`).map(Number):[];for(let e=0;e<6;e++){let n=O[e],r=Number.isFinite(h[e])?h[e]:t.tall?n.atTall:n.at;this.theta[e]=Math.PI/2+r*Math.PI/180,R(this.theta[e],0,3.2,this.chPos[e])}let v=new c(1800,3);this.disposables.push(v);let S=new m(v,this.mat(he,ge,{uStar:{value:new b(0,0,-1)}},{side:1,depthWrite:!1,depthTest:!1}));S.frustumCulled=!1,S.renderOrder=-10,e.add(S),this.skyMat=S.material;let C=ve(360,-15,j/2,-.05);this.disposables.push(C),e.add(new m(C,this.mat(K,ie,this.chamberUniforms(),{side:2})));let w=_e();this.disposables.push(w);let T=4.7,E=Math.round(F*A/T),D=j/6,k=[],ee=(e,t,n,r)=>{for(let i=0;i<6;i++){let a=e-this.theta[i];if(a=Math.atan2(Math.sin(a),Math.cos(a))*A,Math.abs(a)<N/2+n&&Math.abs(t)<P/2+r)return i}return-1};for(let e=0;e<E;e++)for(let t=0;t<6;t++){let n=(e+.5)/E*F,r=-15+(t+.5)*D;if(ee(n,r,3.25,2.7)>=0)continue;let i=ee(n,r,T*1.6,D*1.2),a=B(e,t),o=te(e*.13,t*.55+4),s=te(e*.045+9,t*.3),c=t===0||t===5;(a<.3?[[0,0,1,1]]:a<.62?[[-.25,-.25,.5,.5],[.25,-.25,.5,.5],[-.25,.25,.5,.5],[.25,.25,.5,.5]]:a<.81?[[-.25,0,.5,1],[.25,0,.5,1]]:[[0,-.25,1,.5],[0,.25,1,.5]]).forEach((a,l)=>{let u=B(e*7+l,t*13+l*3),d=.7+1.5*u*u;o>.6&&(d+=(o-.6)*15*(.35+.65*u)),s>.66&&(d+=(s-.66)*9),c&&(d+=1.2+3.4*u),i>=0&&(d=1.6+1.6*u);let f=+(u>.93&&a[2]<1);f&&(d+=5+6*B(e+l,t)),k.push({th:n+a[0]*T/A,s:r+a[1]*D,lt:a[2]*T*(f?.5:.93),lw:a[3]*D*(f?.5:.93),hgt:d,seed:u,taper:f?.12:.55+.38*B(e+31*l,t+5),tip:f?.12:(.08+.5*B(e+3,t*7+l))/Math.max(d,1),ch:0,tiltA:(B(e+l*5,t+11)-.5)*(f?.5:.22),tiltB:(B(e+17,t+l*9)-.5)*(f?.5:.22)})})}for(let e=0;e<6;e++){let t=this.theta[e],n=(n,r,i,a,o)=>k.push({th:t+n,s:r,lt:i,lw:a,hgt:4.2,seed:o,taper:.62,tip:.14,ch:e+1,tiltA:0,tiltB:0});n(0,13.75,45.2,2.5,.2),n(0,-25/2-1.25,45.2,2.5,.7),n(21.3/A,0,2.6,P,.45),n(-21.3/A,0,2.6,P,.9)}let M=k.length,I=new u(w,this.mat(ne,re,this.chamberUniforms(),{side:2}),M),L=new Float32Array(M*4),V=new Float32Array(M),H=new p,U=new p,W=new b,G=new g,q=new b;k.forEach((e,t)=>{z(e.th,r,i,d),R(e.th,e.s,0,f),q.copy(i).negate(),H.makeBasis(r,d,q),U.makeRotationFromEuler(G.set(e.tiltA,0,e.tiltB)),H.multiply(U),H.scale(W.set(e.lt,e.hgt,e.lw)),H.setPosition(f),I.setMatrixAt(t,H),L.set([e.seed,e.taper,e.tip,e.ch],t*4),V[t]=e.th/F}),w.setAttribute(`aSeed`,new s(L,4)),w.setAttribute(`aAng`,new s(V,1)),I.instanceMatrix.needsUpdate=!0,I.frustumCulled=!1,e.add(I);for(let t of[-15.4,15.4]){let n=ye(360,t,.5,.42);this.disposables.push(n),e.add(new m(n,this.mat(K,se,{})))}let be=ve(180,-57,j*1.9,-1.2);this.disposables.push(be);let J=new m(be,this.mat(K,ae,{...this.chamberUniforms(),uGain:{value:.2}},{...n,side:2}));J.renderOrder=2,e.add(J);let Y=new x(54,174,160,1);Y.rotateX(-Math.PI/2),this.disposables.push(Y);let X=new m(Y,this.mat(K,oe,this.chamberUniforms(),{...n,side:2}));X.renderOrder=1,e.add(X);let Z=new a(1,1);this.disposables.push(Z);let Q=new m(Z,this.mat(ue,de,{uSize:{value:250}},{...n,depthTest:!0}));Q.frustumCulled=!1,Q.renderOrder=5,e.add(Q);let $=new a(N,P),xe=new y(1,1,1,10,1,!0);this.disposables.push($,xe);let Se=new _,Ce=this.renderer.capabilities.getMaxAnisotropy();for(let a=0;a<6;a++){let s=O[a],c=this.theta[a];z(c,r,i,d);let u=Se.load(t.tall?s.imgTall:s.img,()=>this.loaded++,void 0,()=>this.loaded++);u.anisotropy=Math.min(8,Ce),u.minFilter=l,this.disposables.push(u);let p=t.tall?s.cropTall:s.crop,h=this.mat(ce,le,{uTex:{value:u},uCrop:{value:new o(...p)},uM:{value:new o(1,0,0,1)},uHue:{value:this.chCol[a]},uFlare:{value:0},uInvert:{value:+!!s.invert}}),g=new m($,h);g.matrixAutoUpdate=!1,g.matrix.makeBasis(r,i,d).setPosition(R(c,0,.9,f)),g.matrixWorldNeedsUpdate=!0,e.add(g),this.panelMats.push(h),this.corners[a]=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([e,t])=>R(c+e*N*.5/A,t*P*.5,.9,new b)),this.upVec[a]=new b;let _=this.mat(ue,fe,{uSize:{value:120},uHue:{value:this.chCol[a]},uFlare:{value:0}},{...n,depthTest:!1}),v=new m(Z,_);v.position.copy(this.chPos[a]),v.frustumCulled=!1,v.renderOrder=4,e.add(v),this.haloMats.push(_);let y=this.mat(pe,me,{uHue:{value:this.chCol[a]},uFlare:{value:0}},{...n,side:2}),x=new m(xe,y),S=R(c,0,4.5,new b);x.position.copy(S).multiplyScalar(.5),x.quaternion.setFromUnitVectors(new b(0,1,0),S.clone().negate().normalize()),x.scale.set(.5,S.length(),.5),x.renderOrder=3,e.add(x),this.beamMats.push(y),this.beams.push(x)}}skyMat;poses(){let{opt:e}=this,t=e.tall?[0,34,144,-48,-1,72,-70,104]:[0,34,144,-60,-19,83,-6,70];if(e.cam){let n=e.cam.split(`,`).map(Number);n.length===8&&n.every(e=>Number.isFinite(e))&&(t=n)}let n=new b(t[0],t[1],t[2]),r=new b(t[3],t[4],t[5]),i=new p().lookAt(n,r,new b(0,1,0)),a=new S().setFromRotationMatrix(i);a.multiply(new S().setFromAxisAngle(new b(0,0,1),t[6]*Math.PI/180)),this.home={th:Math.atan2(n.z,n.x),rho:Math.hypot(n.x,n.z),y:n.y,quat:a,fov:t[7]},this.homePos.copy(n),this.homeRight.set(1,0,0).applyQuaternion(a),this.homeUp.set(0,1,0).applyQuaternion(a);let o=this.camera;o.position.copy(n),o.quaternion.copy(a),o.fov=t[7],o.aspect=e.tall?.46:1.6,o.updateProjectionMatrix(),o.updateMatrixWorld(!0);let s=new b,c=new b,l=new b,u=new b,d=new b,f=e.tall?50:42;for(let t=0;t<6;t++){let n=this.theta[t];z(n,s,c,l);let r=e.tall?s:c;R(n,0,1,u).project(o),R(n,0,1,d).addScaledVector(r,4).project(o);let i=d.y>=u.y?1:-1,a=this.upVec[t].copy(r).multiplyScalar(i);this.panelMats[t].uniforms.uM.value.set(...e.tall?i>0?[0,-1,1,0]:[0,1,-1,0]:i>0?[1,0,0,1]:[-1,0,0,-1]);let m=Math.tan(f*Math.PI/360),h=R(n,0,(e.tall?Math.max(N/2/m,P/2/(m*.46)):Math.max(P/2/m,N/2/(m*1.6)))*.56,new b),g=new S().setFromRotationMatrix(new p().lookAt(h,R(n,0,0,u),a));this.ends[t]={th:n,rho:Math.hypot(h.x,h.z),y:h.y,quat:g,fov:f}}}setTarget(e,t=!1){if(e===this.target&&(!t||!this.arrived))return;let n=this.current();this.from={...n,quat:n.quat.clone()},this.to=e==null?this.home:this.ends[e];let r=Math.abs(this.to.th-n.th);this.dur=e==null?.85+r*.1:.8+r*.1,this.k=t||this.opt.reduced?1:0,this.t0=performance.now(),this.target=e,this.arrived=t,this.near=t||e==null,this.ctl.flash&&e!=null&&!t&&(this.ctl.flash.style.opacity=`0`),window.clearTimeout(this.safety),!t&&this.opt.hold==null&&(this.safety=window.setTimeout(()=>this.arrive(),(this.k>=1?0:this.dur*1e3)+250)),t&&e!=null&&this.ctl.onArrive(e),this.wake()}arrive(){this.arrived||(this.arrived=!0,this.k=1,this.target!=null&&!this.near&&(this.near=!0,this.ctl.onNear(this.target)),this.target==null?this.ctl.onHome():this.ctl.onArrive(this.target))}setHover(e){this.hover=e}setActive(e){this.active=e,e&&this.wake()}cur={th:0,rho:0,y:0,quat:new S,fov:60};current(){let{from:e,to:t,cur:n}=this,r=H(this.k),i=Math.sin(Math.PI*r),a=Math.min(1,Math.abs(t.th-e.th)/.9);n.th=e.th+(t.th-e.th)*r,n.rho=e.rho+(t.rho-e.rho)*r;let o=this.target!=null;if(o)n.rho+=(147-n.rho)*i*.55*a,n.y=e.y+(t.y-e.y)*r-i*6*a;else{let i=Math.sin(Math.PI*U(this.k));n.rho+=(80-n.rho)*i*.55*a,n.y=e.y+(t.y-e.y)*r+i*20*a}return n.quat.copy(e.quat).slerp(t.quat,H(Math.min(1,this.k*(o?1.12:1.8)))),n.fov=e.fov+(t.fov-e.fov)*r+i*10*a,n}start(){this.running=!0,this.wake()}wake(){!this.running||this.raf||this.lost||document.hidden||(this.last=0,this.raf=requestAnimationFrame(this.tick))}onVis=()=>{document.hidden?(cancelAnimationFrame(this.raf),this.raf=0):this.wake()};onLost=e=>{e.preventDefault(),this.lost=!0,cancelAnimationFrame(this.raf),this.raf=0,this.ctl.onFail()};resize=()=>{let e=this.host.clientWidth||window.innerWidth,t=this.host.clientHeight||window.innerHeight;this.w=e,this.h=t,this.renderer.setSize(e,t,!1),this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.wake()};tick=e=>{if(this.raf=0,!this.running||this.lost)return;let t=this.k<1;if(!this.active&&!t&&this.ready)return;this.raf=requestAnimationFrame(this.tick);let n=this.last?(e-this.last)/1e3:.016;this.last=e;let r=Math.min(n,.05);this.time+=r;let{opt:i,ctl:a,camera:o}=this,s=performance.now();this.intro<1&&(this.introT0||=this.frames>0?s:0,this.introT0&&(this.intro=Math.min(1,(s-this.introT0)/1e3/this.introDur)));let c=U(this.intro);this.common.uTime.value=this.time,this.common.uIgnite.value=.25+.75*U(Math.min(1,this.intro*1.6)),this.k<1&&(this.k=Math.min(1,(s-this.t0)/1e3/this.dur)),i.hold!=null&&this.k>i.hold&&(this.k=i.hold),this.common.uClip.value=this.k<1?this.target==null?10:2.5:0;let l=this.current(),u=this.target==null;this.homeW+=((u?H(this.k):1-H(Math.min(1,this.k*2.5)))-this.homeW)*Math.min(1,r*6);let d=this.homeW;this.px+=(a.pointer[0]-this.px)*Math.min(1,r*2.4),this.py+=(a.pointer[1]-this.py)*Math.min(1,r*2.4),o.position.set(Math.cos(l.th)*l.rho,l.y,Math.sin(l.th)*l.rho),o.quaternion.copy(l.quat);let f=+!i.reduced,p=d*(this.px*3.4+f*Math.sin(this.time*.13)*1.3)-(1-c)*16,m=d*(-this.py*2.2+f*Math.sin(this.time*.09+1.3)*.9)+(1-c)*9;o.position.addScaledVector(this.homeRight,p).addScaledVector(this.homeUp,m),this.q.setFromAxisAngle(this.v.set(0,1,0),d*(this.px*.022-(1-c)*.16)),o.quaternion.multiply(this.q),this.q.setFromAxisAngle(this.v.set(1,0,0),d*(this.py*.014+(1-c)*.05)),o.quaternion.multiply(this.q);let h=l.fov+(1-c)*5;Math.abs(o.fov-h)>.01&&(o.fov=h,o.updateProjectionMatrix()),o.updateMatrixWorld(),this.common.uCam.value.copy(o.position),this.skyMat.uniforms.uStar.value.copy(o.position).negate();let g=this.target==null?this.hover:this.target;for(let e=0;e<6;e++){let t=+(g===e);this.flare[e]+=(t-this.flare[e])*Math.min(1,r*7);let n=this.flare[e],i=.3+.05*Math.sin(this.time*.8+e*1.9);this.chPow[e]=i+1.1*n,this.panelMats[e].uniforms.uFlare.value=n,this.haloMats[e].uniforms.uFlare.value=n,this.haloMats[e].uniforms.uSize.value=105+55*n,this.beamMats[e].uniforms.uFlare.value=n;let a=.42+1*n;this.beams[e].scale.x=a,this.beams[e].scale.z=a}if(this.renderer.render(this.scene,o),this.frames++,this.place(),a.flash&&this.target!=null&&this.k<1){let e=this.dur*(1-this.k),t=Math.max(0,Math.min(1,1-e/.2));a.flash.style.opacity=(t*t*(3-2*t)).toFixed(3),!this.near&&e<=.26&&i.hold==null&&(this.near=!0,a.onNear(this.target))}!this.ready&&this.loaded>=6&&this.intro>=1&&this.frames>2&&(this.ready=!0,a.onReady()),!this.arrived&&this.k>=1&&(window.clearTimeout(this.safety),this.arrive()),this.intro>=1&&n>.03?++this.slow>24&&this.dpr>.8&&(this.slow=0,this.dpr=Math.max(.75,this.dpr*.82),this.renderer.setPixelRatio(this.dpr),this.renderer.setSize(this.w,this.h,!1)):this.slow>0&&this.slow--};place(){let{ctl:e,camera:t,w:n,h:r,v:i}=this,a=t.matrixWorldInverse;for(let o=0;o<6;o++){let s=e.buttons[o];if(!s)continue;let c=!0,l=1e9,u=1e9,d=-1e9,f=-1e9;for(let e=0;e<4;e++){if(i.copy(this.corners[o][e]).applyMatrix4(a),i.z>-1){c=!1;break}i.applyMatrix4(t.projectionMatrix);let s=(i.x*.5+.5)*n,p=(-i.y*.5+.5)*r;this.xs[e]=s,this.ys[e]=p,l=Math.min(l,s),u=Math.min(u,p),d=Math.max(d,s),f=Math.max(f,p)}c&&(d<-20||l>n+20||f<-20||u>r+20)&&(c=!1),c&&(d-l>n*1.5||f-u>r*1.5)&&(c=!1);let p=c?`1`:`0`;if(s.dataset.vis!==p&&(s.dataset.vis=p),!c)continue;let m=Math.max(6,(56-Math.min(d-l,f-u))/2),h=l-m,g=u-m,_=s.style;_.transform=`translate3d(${h.toFixed(1)}px, ${g.toFixed(1)}px, 0)`,_.width=`${(d-l+m*2).toFixed(1)}px`,_.height=`${(f-u+m*2).toFixed(1)}px`,this.opt.tall&&_.setProperty(`--ty`,`${Math.min((f-u)/2+m,r-58-g).toFixed(1)}px`);let v=e.outlines[o];if(v){let e=``;for(let t=0;t<4;t++)e+=`${(this.xs[t]-h).toFixed(1)},${(this.ys[t]-g).toFixed(1)} `;v.setAttribute(`points`,e)}}}dispose(){this.running=!1,window.clearTimeout(this.safety),cancelAnimationFrame(this.raf),this.raf=0,window.removeEventListener(`resize`,this.resize),document.removeEventListener(`visibilitychange`,this.onVis);let e=this.renderer.domElement;e.removeEventListener(`webglcontextlost`,this.onLost);for(let e of this.disposables)e.dispose();this.scene.clear(),this.renderer.dispose();try{this.renderer.forceContextLoss()}catch{}e.remove()}},be=e({default:()=>Se}),J=n(),Y=()=>i(()=>import(`./Module-NI7bUQTP.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]),import.meta.url),X=(0,D.lazy)(Y),Z=()=>{Y().catch(()=>{})},Q=e=>{window.location.hash=`#/proto/V04/${e}`},$=[[12,62,22],[27,38,17],[43,24,14],[58,17,11.5],[72,19,10],[84,27,9]];function xe(e){let[t,n,r,i]=e.crop,a=1/(r-t),o=1/(i-n);return{backgroundImage:`url(${e.img})`,backgroundSize:`${a*100}% ${o*100}%`,backgroundPosition:`${r-t>=1?0:t/(1-(r-t))*100}% ${i-n>=1?0:n/(1-(i-n))*100}%`,filter:e.invert?`invert(1) hue-rotate(180deg)`:void 0}}function Se({view:e,params:t}){let n=k(e),[r]=(0,D.useState)(()=>window.innerWidth<700||window.innerWidth/window.innerHeight<.8),[i]=(0,D.useState)(()=>window.matchMedia(`(prefers-reduced-motion: reduce)`).matches),[a,o]=(0,D.useState)(()=>t.get(`still`)!==`1`&&ee()),[s,c]=(0,D.useState)(!1),[l,u]=(0,D.useState)(!1),[d,f]=(0,D.useState)(null),[p,m]=(0,D.useState)(null),[h,g]=(0,D.useState)(!1),[_,v]=(0,D.useState)(!1),[y,b]=(0,D.useState)(null),[x,S]=(0,D.useState)(n),C=(0,D.useRef)(null),w=(0,D.useRef)(null),T=(0,D.useRef)(null),E=(0,D.useRef)(d);E.current=d;let A=(0,D.useRef)(null);A.current||={buttons:[],outlines:[],pointer:[0,0],flash:null,onNear:()=>{},onArrive:()=>{},onHome:()=>{},onReady:()=>{},onFail:()=>{}};let j=A.current;j.onNear=e=>{E.current===e&&(v(!0),b(e),Q(O[e].id))},j.onArrive=()=>v(!1),j.onHome=()=>{g(!1),v(!1)},j.onReady=()=>c(!0),j.onFail=()=>o(!1),(0,D.useEffect)(()=>{if(!a||!C.current)return;let e;try{j.flash=w.current,e=new q(C.current,j,{tall:r,reduced:i,cam:t.get(`cam`),at:t.get(`at`),startAt:n>=0?n:null,hold:t.get(`hold`)?Number(t.get(`hold`)):null})}catch{o(!1);return}return T.current=e,e.setActive(n<0),e.start(),()=>{e.dispose(),T.current=null}},[a]);let M=n>=0?n:d;(0,D.useEffect)(()=>{let e=T.current;e&&(e.setActive(n<0),e.setTarget(M,n>=0))},[M,n]),(0,D.useEffect)(()=>{T.current?.setHover(M==null?p:null)},[p,M]),(0,D.useEffect)(()=>{f(null),m(null),u(!1),n<0&&v(!1)},[n]),x!==n&&(S(n),n<0&&x>=0&&a&&g(!0));let N=(0,D.useCallback)(e=>{if(Z(),!T.current||i)return Q(O[e].id);g(!1),f(e)},[i]);(0,D.useEffect)(()=>{let e=e=>{if(!(e.metaKey||e.ctrlKey||e.altKey)){if(n>=0)e.key===`Escape`&&Q(`home`);else if(d==null){if(e.key>=`1`&&e.key<=`6`)N(Number(e.key)-1);else if(h)return;else if(e.key===`ArrowRight`||e.key===`ArrowUp`||e.key===`ArrowLeft`||e.key===`ArrowDown`){let t=e.key===`ArrowRight`||e.key===`ArrowUp`?1:-1,n=j.buttons.findIndex(e=>e===document.activeElement),r=n<0?(p??(t>0?-1:0))+t:n+t;j.buttons[(r+6)%6]?.focus(),e.preventDefault()}}}};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[n,d,h,N,p,j]);let P=n>=0?_?`land`:`open`:d==null?h?`back`:`home`:`fly`,F=n>=0?l&&!_:!a||s&&P===`home`;(0,D.useEffect)(()=>{F&&n<0&&Z()},[F,n]);let I=(0,D.useRef)(!1),[L,R]=(0,D.useState)(!1);(0,D.useEffect)(()=>{!F||n>=0||I.current||(I.current=!0,Y().then(()=>R(!0),()=>{}))},[F,n]),(0,D.useEffect)(()=>{if(!L)return;let e=window.setTimeout(()=>R(!1),900);return()=>window.clearTimeout(e)},[L]);let z=M==null?p==null?null:O[p]:O[M];return(0,J.jsxs)(`div`,{className:`v04`,"data-phase":P,"data-ready":F?`1`:`0`,"data-webgl":a?`1`:`0`,"data-tall":r?`1`:`0`,"data-via":n>=0&&n===y?`fly`:void 0,"data-lit":z&&P===`home`?`1`:`0`,style:{"--hue":z?.hue??`#b9a8ff`},onPointerMove:e=>{e.pointerType===`mouse`&&(j.pointer=[e.clientX/window.innerWidth*2-1,e.clientY/window.innerHeight*2-1])},children:[(0,J.jsx)(`div`,{className:`v04-scene`,ref:C,"aria-hidden":`true`,children:!a&&(0,J.jsx)(`div`,{className:`v04-still`})}),(0,J.jsx)(`div`,{className:`v04-veil`,"aria-hidden":`true`}),n<0&&(0,J.jsxs)(`div`,{className:`v04-home`,inert:P!==`home`&&P!==`back`,children:[(0,J.jsx)(`nav`,{className:`v04-chambers`,"aria-label":`The six health checks`,children:O.map((e,t)=>(0,J.jsxs)(`button`,{type:`button`,className:`v04-ch`,"data-vis":a?`0`:`1`,"data-hot":p===t?`1`:`0`,"data-tag":a&&!r?t===0?`side`:t===1||t===3?`top`:void 0:void 0,"data-qa":t===0?`primary`:void 0,"aria-label":`${e.name}: ${e.sentence}`,style:{"--h":e.hue,...a?null:{left:`${$[t][0]}%`,top:`${$[t][1]}%`,width:`${$[t][2]*1.6}vmin`,height:`${$[t][2]}vmin`}},ref:e=>{j.buttons[t]=e},onClick:()=>N(t),onPointerEnter:e=>{Z(),e.pointerType===`mouse`&&m(t)},onPointerLeave:()=>m(e=>e===t?null:e),onFocus:()=>{Z(),m(t)},onBlur:()=>m(e=>e===t?null:e),children:[a?(0,J.jsx)(`svg`,{className:`v04-ch-ring`,"aria-hidden":`true`,children:(0,J.jsx)(`polygon`,{ref:e=>{j.outlines[t]=e}})}):(0,J.jsx)(`span`,{className:`v04-ch-img`,style:xe(e)}),(0,J.jsxs)(`span`,{className:`v04-ch-tag`,children:[(0,J.jsx)(`i`,{children:e.n}),(0,J.jsx)(`b`,{children:e.name})]})]},e.id))}),(0,J.jsxs)(`header`,{className:`v04-title`,children:[(0,J.jsxs)(`h1`,{children:[(0,J.jsx)(`span`,{children:`Super`}),(0,J.jsx)(`span`,{children:`Humans`})]}),(0,J.jsxs)(`div`,{className:`v04-read`,children:[(0,J.jsx)(`p`,{className:`v04-line`,children:`Six AI health checks for astronauts, running in your browser.`}),z&&P===`home`&&(0,J.jsxs)(`div`,{className:`v04-focus`,children:[(0,J.jsxs)(`p`,{className:`v04-focus-name`,children:[(0,J.jsx)(`i`,{children:z.n}),z.name]}),(0,J.jsx)(`p`,{className:`v04-focus-line`,children:z.sentence})]},z.id)]})]}),(0,J.jsxs)(`p`,{className:`v04-hint`,children:[(0,J.jsx)(`span`,{}),` Press a chamber to fly in`]})]}),L&&n<0&&d==null&&(0,J.jsx)(`div`,{className:`v04-ghost`,"aria-hidden":`true`,inert:!0,children:(0,J.jsx)(D.Suspense,{fallback:null,children:(0,J.jsx)(X,{check:O[0],index:0,shown:!1,ghost:!0,onReady:()=>{}})})}),(0,J.jsx)(`p`,{className:`v04-mark`,children:`AI-generated imagery`}),(0,J.jsx)(`div`,{className:`v04-flash`,ref:w,"data-out":P===`fly`||P===`land`?`0`:`1`,"aria-hidden":`true`}),n>=0&&(0,J.jsx)(D.Suspense,{fallback:(0,J.jsx)(`div`,{className:`v04-mod`,style:{"--hue":O[n].hue},children:(0,J.jsx)(`div`,{className:`v04-mod-bg`,"aria-hidden":`true`})}),children:(0,J.jsx)(X,{check:O[n],index:n,shown:P===`open`,onReady:()=>u(!0)},O[n].id)})]})}export{Se as default,O as n,be as t};
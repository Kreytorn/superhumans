const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./Module-BvcBqXaa.js","./rolldown-runtime-XKyaHtl9.js","./index-D3qVPW5J.js","./index-CvU9-K1k.css","./ArrowCounterClockwise.es-3hsoM7rg.js","./IconBase.es-DBEeWzR9.js","./ArrowLeft.es-DYYiPEul.js","./ArrowRight.es-BSy5iAHK.js","./Play.es-ChymBqjc.js","./spikecount-DVce7RGm.js","./client-CD6l6M49.js","./tracktrace-B3Z8TVj3.js","./tracktrace-CFLwFIW8.js","./tracktrace-B8tYtE4W.css","./bubblegrade-BmPWx0Me.js","./bubblegrade-Ty8Jirxm.js","./bubblegrade-BG81yi9O.css","./newsreader-In2980oI.css","./geist-mono-C5knphS1.css","./veinsqueeze-CMLEZ5tp.js","./honesty-D1yHS4ET.js","./veinsqueeze-BJSarZNv.css","./instrument-sans-BkCNIqpb.css","./braindrift-D2wCYiXR.js","./braindrift-DFimSZpn.js","./three.module-DS1lwPcu.js","./braindrift-B_i9pn98.css","./garnmeter-1cT-Z-yF.js","./garnmeter-DB8lqCrR.css","./spline-sans-mono-BSXwSnXg.css"])))=>i.map(i=>d[i]);
import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";/* empty css                      *//* empty css                        *//* empty css                   */import{n,r,s as i,t as a}from"./index-D3qVPW5J.js";import{$ as o,At as s,Ot as c,R as l,S as u,W as d,Z as f,a as p,bt as m,c as h,et as g,f as _,ft as v,kt as y,l as b,mt as x,o as S,pt as C,s as w,t as ee,w as T}from"./three.module-DS1lwPcu.js";var E=t(i(),1),D=`./`,O=[{id:`tracktrace`,n:`01`,name:`TrackTrace`,sentence:`IonScan circles every DNA-damage spot. When they line up, it draws a heavy ion’s path.`,hue:`#ff4fb0`,img:`${D}_posters/tracktrace_portrait.jpg`,aspect:.75,at:[.5,.4],zoom:1.18,boost:1.7,tint:0,run:`Scan the nucleus`},{id:`bubblegrade`,n:`02`,name:`BubbleGrade`,sentence:`After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.`,hue:`#ff9a3c`,img:`${D}_posters/bubblegrade_portrait.jpg`,aspect:.75,at:[.6,.44],zoom:1.3,tint:0,run:`Play the heart sound`},{id:`spikecount`,n:`03`,name:`SpikeCount`,sentence:`Every red blood cell, outlined. The spiky ones, counted.`,hue:`#ff4d4d`,img:`${D}spikecount/fields/96.png`,aspect:1,at:[.3,.5],tint:.72,run:`Grade this blood`},{id:`veinsqueeze`,n:`04`,name:`VeinSqueeze`,sentence:`A clot is a vein that won’t squash.`,hue:`#ffd23f`,img:`${D}_posters/veinsqueeze_portrait.jpg`,aspect:.75,at:[.5,.5],tint:.16,run:`Press the probe`},{id:`braindrift`,n:`05`,name:`BrainDrift`,sentence:`In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.`,hue:`#4cc9ff`,img:`${D}_posters/braindrift_portrait.jpg`,aspect:.75,at:[.5,.5],tint:0,run:`Fly the brain`},{id:`garnmeter`,n:`06`,name:`Garn Meter`,sentence:`Space sickness, in Garns. You say how you feel; reading it from brainwaves doesn’t work yet.`,hue:`#a58cff`,img:`${D}_posters/garnmeter_portrait.jpg`,aspect:.75,at:[.72,.25],zoom:1.9,tint:.62,run:`Play the session`}],k=`Six AI health checks for astronauts, running in your browser.`;function A(e){return O.find(t=>t.id===e)}var j={from:void 0};function M(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new w;c.morphTargetsRelative=s;let l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0,p=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let t in d.morphAttributes){if(!i.has(t))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;if(d.morphAttributes[t].length!==e[0].morphAttributes[t].length)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have the same number of morph targets for the "`+t+`" morph attribute.`),null;o[t]===void 0&&(o[t]=[]),o[t].push(d.morphAttributes[t]),p++}if(p!==i.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of morph attributes.`),null;if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=N(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=N(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function N(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new S(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}var P=14,F=30,I=3,L=10,R=25,z=-.9,B=6;function te(e){return e<.8?{phone:!0,fov:50,cam:[0,3.2,0],look:[0,20.8,-100],gates:[{x:-15.4,y:0,z:-112},{x:0,y:0,z:-112},{x:15.4,y:0,z:-112},{x:-17.4,y:43,z:-152},{x:0,y:43,z:-152},{x:17.4,y:43,z:-152}],face:[0,200],name:{y:196,z:-320,w:140},arc:[0,-.38,.9],figureZ:-62}:{phone:!1,fov:e>=1.6?40:Math.min(64,2*Math.atan(.5824/e)*180/Math.PI),cam:[0,3.2,0],look:[0,17.76,-100],gates:[{x:-36.1,y:0,z:-77},{x:-24.6,y:0,z:-90.5},{x:-11.6,y:0,z:-109},{x:11.6,y:0,z:-109},{x:24.6,y:0,z:-90.5},{x:36.1,y:0,z:-77}],face:[0,34],name:{y:141,z:-320,w:268},arc:[0,-.83,1.15],figureZ:-72}}var V=`
uniform vec3 uCam;
uniform float uTime;
uniform float uHaze;
uniform vec3 uArc;
uniform float uGlobal;
const vec3 WARM = vec3(0.66, 0.10, 0.36);
const vec3 MID = vec3(0.30, 0.13, 0.52);
const vec3 COOL = vec3(0.07, 0.27, 0.70);
vec3 hazeHue(vec3 d) {
  float az = clamp(d.x / max(0.08, -d.z) * 1.5, -1.0, 1.0);
  return az < 0.0 ? mix(MID, WARM, -az) : mix(MID, COOL, az);
}
vec3 hazeColor(vec3 d) {
  return (vec3(0.004, 0.005, 0.012) + hazeHue(d) * 0.30) * uGlobal;
}
float hazeF(float dist) {
  return 1.0 - exp(-dist * uHaze);
}
// the far end of the hall, lost in its own light: a wide glow and a hot core at the vanishing point
vec3 farGlow(vec3 d) {
  float az = d.x / max(0.08, -d.z);
  return step(0.0, -d.z) * vec3(0.52, 0.36, 0.95) * exp(-az * az * 9.0) * 0.34;
}
vec3 farCore(vec3 d) {
  float az = d.x / max(0.08, -d.z);
  return step(0.0, -d.z) * vec3(0.95, 0.84, 1.0) * (exp(-az * az * 160.0) * 0.30 + exp(-az * az * 30.0) * 0.10);
}
vec3 skyColor(vec3 d) {
  float el = max(d.y, 0.0);
  vec3 col = vec3(0.004, 0.005, 0.012) + hazeHue(d) * (0.27 * exp(-el * 10.0) + 0.03 * exp(-el * 3.4));
  // the planet's edge: one huge soft arc
  float fwd = step(0.0, -d.z);
  vec2 p = d.xy / max(0.08, -d.z);
  float r = length(p - uArc.xy) - uArc.z;
  float core = exp(-abs(r) * 320.0);
  float inner = exp(min(r, 0.0) * 20.0) * step(r, 0.0);
  float outer = exp(-max(r, 0.0) * 15.0) * step(0.0, r);
  float wide = exp(-max(r, 0.0) * 4.0) * step(0.0, r);
  vec3 arcCol = mix(vec3(1.0, 0.42, 0.74), vec3(0.36, 0.72, 1.0), smoothstep(-0.5, 0.5, p.x));
  arcCol = mix(arcCol, vec3(0.80, 0.66, 1.0), exp(-p.x * p.x * 14.0) * 0.7);
  float crown = 0.55 + 0.45 * exp(-p.x * p.x * 3.0);
  col *= 1.0 - 0.5 * smoothstep(0.0, -0.3, r) * fwd;
  col += fwd * crown * (mix(vec3(1.0), arcCol, 0.25) * core * 1.2 + arcCol * (inner * 0.34 + outer * 0.5 + wide * 0.03));
  col += farGlow(d) * exp(-el * 13.0) + farCore(d) * exp(-el * 48.0);
  return col * uGlobal;
}
`,H=`
varying vec3 vWorld;
varying vec3 vObj;
varying vec3 vN;
varying vec2 vUv;
void main() {
  vUv = uv;
  vObj = position;
  vN = normal;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`,U=`
float mirrorFade(float y) {
  return y < 0.0 ? exp(y * 0.09) * 0.9 : 1.0;
}
`,ne=`
precision highp float;
varying vec3 vWorld;
${V}
void main() {
  vec3 d = normalize(vWorld - uCam);
  vec3 col = d.y < 0.0 ? vec3(0.0) : skyColor(d);
  gl_FragColor = vec4(col, 1.0);
}
`,re=`
precision highp float;
varying vec3 vWorld;
uniform vec4 uGate[6];
uniform vec3 uGateCol[6];
uniform float uGateI[6];
uniform float uCell;
${V}
vec2 gridLines(vec2 g) {
  vec2 fw = fwidth(g);
  vec2 gd = abs(fract(g - 0.5) - 0.5);
  vec2 ln = 1.0 - smoothstep(vec2(0.0), fw * 1.3, gd);
  return ln * (1.0 - smoothstep(0.1, 0.4, fw));
}
void main() {
  vec3 V = vWorld - uCam;
  float dist = length(V);
  vec3 dir = V / dist;
  // the light each doorway throws on the floor
  vec3 spill = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec2 rel = vWorld.xz - uGate[i].xy;
    vec2 n = uGate[i].zw;
    float v = dot(rel, n);
    float u = dot(rel, vec2(n.y, -n.x));
    float vv = max(v, 0.0);
    float w = 5.0 + vv * 0.12;
    float soft = 0.5 + vv * 0.2;
    float m = 1.0 - smoothstep(w - soft * 0.4, w + soft, abs(u));
    float fall = exp(-vv / 26.0) * smoothstep(-1.4, 0.4, v);
    float wide = exp(-(u * u) / (140.0 + vv * vv * 0.5)) * exp(-vv / 46.0) * smoothstep(-8.0, 3.0, v) * 0.13;
    spill += uGateCol[i] * uGateI[i] * (m * fall + wide);
  }
  vec2 g = vWorld.xz / uCell;
  vec2 l1 = gridLines(g);
  vec2 l4 = gridLines(g / 4.0);
  // lines that run into the hall carry the grid; the cross rules stay quiet
  float fine = l1.x * 0.30 + l1.y * 0.07;
  float major = l4.x * 0.62 + l4.y * 0.26;
  vec3 col = vec3(0.002, 0.003, 0.007);
  col += spill * 0.34;
  vec3 lineCol = vec3(0.42, 0.50, 0.86) * 0.30 + spill * 1.25;
  col += lineCol * (fine + major) * exp(-dist * 0.005);
  // polished: mirror of the sky here, the mirrored gates come through the blend
  float cosT = clamp(-dir.y, 0.0, 1.0);
  float F = pow(1.0 - cosT, 4.0);
  float R = mix(0.34, 0.9, F);
  col += skyColor(vec3(dir.x, -dir.y, dir.z)) * R * 0.9;
  float f = hazeF(dist);
  // the floor runs on into the same light the sky holds at the horizon, so the hall has no back wall
  col = mix(col * uGlobal, hazeColor(dir) + (farGlow(dir) + farCore(dir)) * uGlobal, f);
  gl_FragColor = vec4(col, R * (1.0 - f));
}
`,ie=`
precision highp float;
varying vec3 vWorld;
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec4 uCrop;
uniform vec3 uCol;
uniform float uGain;
uniform float uTint;
uniform float uInvert;
uniform float uBoost;
uniform float uOn;
${V}
${U}
void main() {
  vec3 c = texture2D(uMap, uCrop.xy + vUv * uCrop.zw).rgb;
  if (uInvert > 0.5) {
    c = 1.0 - c;
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    c = (mx + mn) - c;
  }
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 graded = uCol * pow(l, 0.9) * 1.35 + vec3(pow(l, 2.2)) * 0.7;
  c = mix(c, graded, uTint) * uBoost;
  float edge = min(min(vUv.x, 1.0 - vUv.x) * ${L.toFixed(1)}, min(vUv.y, 1.0 - vUv.y) * ${R.toFixed(1)});
  float rim = exp(-edge * 1.9);
  c = c * (0.62 + 0.5 * uGain) + uCol * (0.045 + rim * 0.42) * uGain;
  // a soft shoulder, so a bright specimen keeps its detail when its gate is lit up
  vec3 over = max(c - 0.78, 0.0);
  c = min(c, 0.78) + over / (1.0 + over * 2.4);
  c *= uOn;
  vec3 V = vWorld - uCam;
  float dist = length(V);
  c = mix(c, hazeColor(V / dist), hazeF(dist) * 0.45);
  gl_FragColor = vec4(c * mirrorFade(vWorld.y), 1.0);
}
`,ae=`
precision highp float;
varying vec3 vWorld;
varying vec3 vObj;
varying vec3 vN;
uniform vec3 uCol;
uniform float uGain;
uniform float uOn;
${V}
${U}
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
void main() {
  vec3 p = vObj;
  vec3 n = vN;
  vec3 col = vec3(0.013, 0.015, 0.024);
  float lit = uGain * uOn;
  // cladding seams, one every storey
  float sy = abs(fract(p.y / 2.5) - 0.5);
  float seam = 1.0 - smoothstep(0.0, fwidth(p.y / 2.5) * 1.5, 0.5 - sy);
  float d = sdBox(p.xy - vec2(0.0, ${(R/2).toFixed(2)}), vec2(${(L/2).toFixed(2)}, ${(R/2).toFixed(2)}));
  float fd = fwidth(d);
  float eo = min(${(P/2).toFixed(1)} - abs(p.x), ${F.toFixed(1)} - p.y);
  float feo = fwidth(eo);
  if (n.z > 0.5) {
    float strip = 1.0 - smoothstep(0.05, 0.11 + fd * 1.5, d);
    float glow = exp(-d * 1.25) * 0.30 + exp(-d * 0.35) * 0.07;
    col += uCol * lit * (glow + strip * 1.1);
    col += vec3(1.0) * strip * lit * 0.25;
    col += uCol * lit * seam * 0.10 * exp(-d * 0.4);
    col += vec3(0.10, 0.12, 0.2) * seam * 0.16;
    col *= 0.82 + 0.18 * smoothstep(${F.toFixed(1)}, 0.0, p.y);
    col += vec3(0.5, 0.58, 0.9) * (1.0 - smoothstep(0.0, feo * 1.6, eo)) * 0.16;
  } else if ((abs(n.x) > 0.5 && abs(p.x) < ${5.02.toFixed(2)}) || (n.y < -0.5 && p.y < ${25.02.toFixed(2)} && p.y > 1.0)) {
    // the reveal: lit by the window it holds
    float depth = clamp((p.z - (${z.toFixed(2)})) / ${(I/2-z).toFixed(2)}, 0.0, 1.0);
    col += uCol * lit * mix(0.95, 0.30, depth);
    col += vec3(1.0) * lit * 0.20 * (1.0 - depth);
  } else {
    col += vec3(0.08, 0.09, 0.16) * 0.25 + vec3(0.10, 0.12, 0.2) * seam * 0.10;
  }
  vec3 V = vWorld - uCam;
  float dist = length(V);
  col = mix(col * uGlobal, hazeColor(V / dist), hazeF(dist));
  gl_FragColor = vec4(col * mirrorFade(vWorld.y), 1.0);
}
`,oe=`
precision highp float;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
uniform vec3 uCol;
uniform float uGain;
uniform float uOn;
${U}
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
void main() {
  float d = sdBox(vObj.xy, vec2(${(L/2).toFixed(2)}, ${(R/2).toFixed(2)}));
  float dd = max(d, 0.0);
  float g = exp(-dd * 0.6) * 0.34 + exp(-dd * 0.17) * 0.09;
  g *= d > 0.0 ? 1.0 : 0.22;
  vec2 q = abs(vUv - 0.5) * 2.0;
  g *= (1.0 - smoothstep(0.6, 1.0, q.x)) * (1.0 - smoothstep(0.6, 1.0, q.y));
  gl_FragColor = vec4(uCol * g * uGain * uGain * uOn * mirrorFade(vWorld.y), 1.0);
}
`,se=`
attribute float aK;
varying vec2 vUv;
varying float vK;
void main() {
  vUv = uv;
  vK = aK;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,ce=`
precision highp float;
varying vec2 vUv;
varying float vK;
uniform vec3 uCol;
uniform float uGain;
uniform float uOn;
uniform float uTime;
void main() {
  float qx = abs(vUv.x - 0.5) * 2.0;
  float mx = 1.0 - smoothstep(0.3, 1.0, qx);
  float my = (1.0 - smoothstep(0.45, 1.0, vUv.y)) * (0.55 + 0.45 * (1.0 - vUv.y));
  float n = 0.72 + 0.28 * sin(vUv.x * 11.0 + uTime * 0.23 + vK * 7.0) * sin(vUv.y * 6.0 - uTime * 0.17 + vK * 3.0);
  float a = mx * my * n * (1.0 - vK * 0.72) * 0.13;
  gl_FragColor = vec4(uCol * a * uGain * uGain * uOn, 1.0);
}
`,le=`
attribute float aSeed;
attribute float aBase;
attribute vec3 aCol;
uniform float uTime;
uniform float uPx;
varying vec3 vCol;
varying float vA;
void main() {
  vec3 p = position;
  float t = uTime * (0.22 + aSeed * 0.3);
  float y = mod(p.y + t * 0.8, 27.0);
  p.y = y + 0.4 + aBase;
  p.x += sin(t * 0.7 + aSeed * 40.0) * 1.6;
  p.z += cos(t * 0.5 + aSeed * 17.0) * 1.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = 0.07 + 0.17 * fract(aSeed * 7.13);
  gl_PointSize = max(1.2, s * uPx / -mv.z);
  vCol = aCol;
  vA = (0.3 + 0.7 * fract(aSeed * 3.7)) * smoothstep(0.0, 4.0, y) * (1.0 - smoothstep(19.0, 27.0, y));
}
`,ue=`
precision highp float;
varying vec3 vCol;
varying float vA;
uniform float uOnAll;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, d));
  gl_FragColor = vec4((vCol * 0.8 + 0.2) * a * a * vA * uOnAll * 1.25, 1.0);
}
`,de=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uOn;
void main() {
  vec3 c = texture2D(uMap, vUv).rgb;
  // feet of the letters sink into the haze
  float fade = 0.62 + 0.38 * smoothstep(0.2, 0.75, vUv.y);
  gl_FragColor = vec4(c * fade * uOn, 1.0);
}
`,fe=`
varying vec3 vWorld;
varying vec3 vNv;
varying vec3 vVv;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mv = viewMatrix * w;
  vNv = normalize(normalMatrix * normal);
  vVv = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`,pe=`
precision highp float;
varying vec3 vWorld;
varying vec3 vNv;
varying vec3 vVv;
${V}
${U}
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNv), normalize(vVv))), 2.2);
  vec3 col = vec3(0.012, 0.014, 0.022) + vec3(0.85, 0.9, 1.0) * rim * 0.75;
  gl_FragColor = vec4(col * uGlobal * mirrorFade(vWorld.y * 6.0), 1.0);
}
`,W=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,G=e=>1-(1-e)**3,K=e=>Math.min(1,Math.max(0,e));function me(){let e=2048,t=document.createElement(`canvas`);t.width=e,t.height=352;let n=t.getContext(`2d`);n.fillStyle=`#000`,n.fillRect(0,0,e,352);let r=`SUPERHUMANS`,i=`"Big Shoulders Variable", "Arial Narrow", Impact, sans-serif`,a=.075,o=300,s=e=>{n.font=`800 ${e}px ${i}`;let t=0;for(let e of r)t+=n.measureText(e).width;return t+a*e*10};o=o*1928/s(o),o=Math.min(o,330);let c=s(o);n.font=`800 ${o}px ${i}`,n.textBaseline=`alphabetic`;let l=n.measureText(`H`).actualBoundingBoxAscent,u=176+l/2,d=()=>{let t=(e-c)/2;for(let e of r)n.fillText(e,t,u),t+=n.measureText(e).width+a*o};n.shadowColor=`rgba(140, 165, 255, 0.8)`,n.shadowBlur=60,n.fillStyle=`rgba(190, 205, 255, 0.4)`,d(),n.shadowBlur=7,n.shadowColor=`rgba(255, 255, 255, 0.55)`;let f=n.createLinearGradient(0,u-l,0,u);f.addColorStop(0,`#ffffff`),f.addColorStop(1,`#cfd8ff`),n.fillStyle=f,d();let p=new h(t);return p.colorSpace=``,p.anisotropy=4,p}function he(){let e=new p(2,F,I).translate(-6,F/2,0),t=new p(2,F,I).translate(6,F/2,0),n=new p(L,5,I).translate(0,55/2,0),r=M([e,t,n]);return e.dispose(),t.dispose(),n.dispose(),r}function ge(){let e=[2.2,5,9,14.5,21],t=[],n=[],r=[],i=[];e.forEach((a,o)=>{let s=o/(e.length-1),c=(L+a*.75)/2,l=R+a*.25,u=o*4;t.push(-c,0,a,c,0,a,c,l,a,-c,l,a),n.push(0,0,1,0,1,1,0,1),r.push(s,s,s,s),i.push(u,u+1,u+2,u,u+2,u+3)});let a=new w;return a.setAttribute(`position`,new u(t,3)),a.setAttribute(`uv`,new u(n,2)),a.setAttribute(`aK`,new u(r,1)),a.setIndex(i),a}function _e(){let e=[],t=(t,n,r,i,a=0)=>{a&&t.rotateZ(a),t.translate(n,r,i),e.push(t)};t(new b(.1,.7,3,10),-.12,.46,0,-.03),t(new b(.1,.7,3,10),.12,.46,0,.03),t(new p(.19,.1,.32),-.13,.05,-.04),t(new p(.19,.1,.32),.13,.05,-.04),t(new b(.2,.34,3,12),0,1.2,0),t(new p(.5,.15,.25),0,1.45,0),t(new p(.36,.5,.17),0,1.25,.21),t(new b(.075,.54,3,8),-.31,1.1,0,-.07),t(new b(.075,.54,3,8),.31,1.1,0,.07),t(new x(.22,16,12),0,1.76,0);let n=M(e.map(e=>e.index?e.toNonIndexed():e));return e.forEach(e=>e.dispose()),n}var ve=class{renderer;canvas;scene=new v;camera=new f(40,1.6,.5,4e3);shared;floorU;gates=[];disposables=[];sky;nameMesh;nameU={uMap:{value:null},uOn:{value:0}};figure;terrace;motes;moteU={uTime:{value:0},uPx:{value:1e3},uOnAll:{value:0}};moteLocal;layout;rects=new Float32Array(24);raf=0;running=!1;disposed=!1;t0=performance.now();last=performance.now();frames=0;ready=!1;texLeft=0;focus=null;pointer=new c;drift=new c;fly=null;flyT=0;flyGate=0;introStart;opts;tmp=new y;tmpA=new y;tmpB=new y;w=1;h=1;constructor(e){this.opts=e;let t=document.createElement(`canvas`);t.setAttribute(`aria-hidden`,`true`),this.canvas=t,e.container.appendChild(t);try{this.renderer=new ee({canvas:t,antialias:!0,alpha:!1,powerPreference:`high-performance`})}catch(e){throw t.remove(),e}this.renderer.setClearColor(0,1),this.renderer.outputColorSpace=l,this.layout=te(1.6),this.introStart=e.reduced||e.from!==void 0?-1e9:performance.now(),this.shared={uCam:{value:new y},uTime:{value:0},uHaze:{value:.003},uArc:{value:new y(0,-.8,1.15)},uGlobal:{value:0}};let n=new x(1800,32,16),r=new C({vertexShader:H,fragmentShader:ne,uniforms:{...this.shared},side:1,depthTest:!1,depthWrite:!1});this.sky=new d(n,r),this.sky.renderOrder=-20,this.sky.frustumCulled=!1,this.scene.add(this.sky),this.disposables.push(n,r),this.floorU={uGate:{value:Array.from({length:B},()=>new s)},uGateCol:{value:e.checks.map(e=>new _(e.hue))},uGateI:{value:Array(B).fill(0)}};let i=new o(3600,3600).rotateX(-Math.PI/2),a=new C({vertexShader:H,fragmentShader:re,uniforms:{...this.shared,...this.floorU,uCell:{value:7}},transparent:!0,blending:5,blendEquation:100,blendSrc:201,blendDst:204,depthWrite:!0}),u=new d(i,a);u.position.z=-1200,u.renderOrder=-5,this.scene.add(u),this.disposables.push(i,a);let f=he(),h=new o(L,R).translate(0,R/2,z),v=new o(P*3.4,F*2.1),b=ge();this.disposables.push(f,h,v,b);let E=new m,D=L/R;this.texLeft=e.checks.length,e.checks.forEach(e=>{let t={uGain:{value:1},uOn:{value:0},uCol:{value:new _(e.hue)}},n=E.load(e.img,()=>{this.texLeft--},void 0,()=>{this.texLeft--});n.colorSpace=``,n.anisotropy=4,this.disposables.push(n);let r=e.zoom??1,i=Math.min(1,D/e.aspect)/r,a=Math.min(1,e.aspect/D)/r,o=Math.min(1-i,Math.max(0,e.at[0]-i/2)),l=Math.min(1-a,Math.max(0,1-e.at[1]-a/2)),u=new C({vertexShader:H,fragmentShader:ie,uniforms:{...this.shared,...t,uMap:{value:n},uCrop:{value:new s(o,l,i,a)},uTint:{value:e.tint},uInvert:{value:+!!e.invert},uBoost:{value:e.boost??1}},side:2}),p=new C({vertexShader:H,fragmentShader:ae,uniforms:{...this.shared,...t},side:2}),m=new C({vertexShader:H,fragmentShader:oe,uniforms:{...t},transparent:!0,blending:2,depthWrite:!1,side:2}),g=new C({vertexShader:se,fragmentShader:ce,uniforms:{...t,uTime:this.shared.uTime},transparent:!0,blending:2,depthWrite:!1,side:2});this.disposables.push(u,p,m,g);let y=e=>{let t=new T,n=new d(f,p),r=new d(h,u),i=new d(v,m);if(i.position.set(0,R/2,1.75),i.renderOrder=e?-8:2,t.add(n,r,i),e)t.scale.y=-1;else{let e=new d(b,g);e.renderOrder=3,t.add(e)}return this.scene.add(t),t};this.gates.push({group:y(!1),mirror:y(!0),uniforms:t,gain:1,normal:new c(0,1)})});let O=new o(1,1),k=new C({vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:de,uniforms:this.nameU,transparent:!0,blending:2,depthWrite:!1});this.nameMesh=new d(O,k),this.nameMesh.renderOrder=-4,this.nameMesh.visible=!1,this.scene.add(this.nameMesh),this.disposables.push(O,k);let A=()=>{this.disposed||(this.nameU.uMap.value?.dispose(),this.nameU.uMap.value=me(),this.nameMesh.visible=!0)},j=document.fonts;j?.load?j.load(`800 120px "Big Shoulders Variable"`,`SUPERHUMANS`).then(A,A):A();let M=_e(),N=new C({vertexShader:fe,fragmentShader:pe,uniforms:{...this.shared},side:2});this.figure=new T;let I=new d(M,N),W=new d(M,N);W.scale.y=-1,this.figure.add(I,W),this.scene.add(this.figure),this.disposables.push(M,N),this.terrace=new T;let G=new p(400,43,60).translate(0,21.5,-30),K=new C({vertexShader:H,fragmentShader:`
        precision highp float;
        varying vec3 vWorld; varying vec3 vObj; varying vec3 vN;
        ${V}
        ${U}
        void main(){
          vec3 col = vec3(0.012, 0.014, 0.024);
          float sy = abs(fract(vObj.y / 2.5) - 0.5);
          float seam = 1.0 - smoothstep(0.0, fwidth(vObj.y / 2.5) * 1.5, 0.5 - sy);
          col += vec3(0.10, 0.12, 0.2) * seam * 0.16;
          float lip = 1.0 - smoothstep(0.0, 0.5, 43.0 - vObj.y);
          col += vec3(0.6, 0.66, 1.0) * lip * 0.5 * step(0.5, vN.z);
          vec3 V = vWorld - uCam; float dist = length(V);
          col = mix(col * uGlobal, hazeColor(V / dist), hazeF(dist));
          gl_FragColor = vec4(col * mirrorFade(vWorld.y), 1.0);
        }`,uniforms:{...this.shared},side:2}),ve=new d(G,K),q=new d(G,K);q.scale.y=-1,this.terrace.add(ve,q),this.terrace.visible=!1,this.scene.add(this.terrace),this.disposables.push(G,K),this.moteLocal=new Float32Array(1260);let J=new Float32Array(420),Y=new Float32Array(1260),X=7,Z=()=>(X=X*16807%2147483647,X/2147483647);for(let e=0;e<420;e++){let t=Math.floor(e/70),n=1.5+Z()*Z()*30;this.moteLocal[e*3]=(Z()-.5)*(L+n*.5),this.moteLocal[e*3+1]=Z()*27,this.moteLocal[e*3+2]=n,J[e]=Z();let r=this.floorU.uGateCol.value[t];Y[e*3]=r.r,Y[e*3+1]=r.g,Y[e*3+2]=r.b}let Q=new w;Q.setAttribute(`position`,new S(new Float32Array(1260),3)),Q.setAttribute(`aSeed`,new S(J,1)),Q.setAttribute(`aBase`,new S(new Float32Array(420),1)),Q.setAttribute(`aCol`,new S(Y,3));let $=new C({vertexShader:le,fragmentShader:ue,uniforms:this.moteU,transparent:!0,blending:2,depthWrite:!1});this.motes=new g(Q,$),this.motes.frustumCulled=!1,this.motes.renderOrder=4,this.scene.add(this.motes),this.disposables.push(Q,$),t.addEventListener(`webglcontextlost`,this.onContextLost),document.addEventListener(`visibilitychange`,this.onVisibility),this.resize(),e.from!==void 0&&(this.flyGate=e.from,this.flyT=.74,this.fly={i:e.from,start:performance.now(),dur:1350,from:.74,to:0}),this.start()}onContextLost=e=>{e.preventDefault(),this.stop(),this.opts.onLost()};onVisibility=()=>{document.hidden?this.stop():this.start()};start(){this.running||this.disposed||(this.running=!0,this.last=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){this.running=!1,cancelAnimationFrame(this.raf)}resize(){let e=Math.max(1,this.opts.container.clientWidth),t=Math.max(1,this.opts.container.clientHeight);this.w=e,this.h=t,this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)),this.renderer.setSize(e,t,!1);let n=e/t;this.layout=te(n);let r=this.layout;this.camera.aspect=n,this.camera.fov=r.fov,this.camera.updateProjectionMatrix(),this.moteU.uPx.value=t*this.renderer.getPixelRatio()/(2*Math.tan(r.fov*Math.PI/360)),this.shared.uArc.value.set(r.arc[0],r.arc[1],r.arc[2]);let i=this.motes.geometry.getAttribute(`position`),a=this.motes.geometry.getAttribute(`aBase`),o=i.count/B;this.gates.forEach((e,t)=>{let n=r.gates[t],s=r.face[0]-n.x,c=r.face[1]-n.z,l=Math.hypot(s,c);e.normal.set(s/l,c/l);let u=Math.atan2(s,c);e.group.position.set(n.x,n.y,n.z),e.group.rotation.y=u,e.group.updateMatrixWorld(!0),e.mirror.position.set(n.x,0,n.z),e.mirror.rotation.y=u,e.mirror.visible=n.y===0,this.floorU.uGate.value[t].set(n.x+s/l*(I/2),n.z+c/l*(I/2),s/l,c/l);for(let r=t*o;r<(t+1)*o;r++)this.tmp.set(this.moteLocal[r*3],0,this.moteLocal[r*3+2]).applyMatrix4(e.group.matrixWorld),i.setXYZ(r,this.tmp.x,this.moteLocal[r*3+1],this.tmp.z),a.setX(r,n.y)}),i.needsUpdate=!0,a.needsUpdate=!0,this.nameMesh.position.set(0,r.name.y,r.name.z),this.nameMesh.scale.set(r.name.w,r.name.w*352/2048,1),this.figure.position.set(0,0,r.figureZ),this.terrace.visible=r.phone,this.terrace.position.set(0,0,-139)}setFocus(e){this.focus=e}setPointer(e,t){this.pointer.set(e,t)}pose(e,t){this.fly=null,this.flyGate=e,this.focus=e,this.flyT=t}flyTo(e,t,n){this.fly&&this.fly.to===1||(this.flyGate=e,this.focus=e,this.fly={i:e,start:performance.now(),dur:1150,from:this.flyT,to:1,onProgress:t,onDone:n})}tick=()=>{if(!this.running)return;this.raf=requestAnimationFrame(this.tick);let e=performance.now(),t=Math.min(.1,(e-this.last)/1e3);this.last=e;let n=(e-this.t0)/1e3,r=this.layout,i=this.opts.reduced;this.shared.uTime.value=i?0:n,this.moteU.uTime.value=i?3:n;let a=(e-this.introStart)/1e3;this.shared.uGlobal.value=K(a/.9),this.nameU.uOn.value=G(K((a-.7)/1.1)),this.moteU.uOnAll.value=K((a-.8)/1.2);let o;if(this.fly){let t=this.fly,n=K((e-t.start)/t.dur);this.flyT=t.from+(t.to-t.from)*(t.to===1?n:G(n)),t.onProgress?.(this.flyT),n>=1&&(o=t.onDone,this.fly=null)}let s=this.focus!==null,c=1-Math.exp(-t*7);this.gates.forEach((e,t)=>{let o=r.phone?(t%3==1?0:1)+ +(t>2):Math.abs(t-2.5)-.5,l=K((a-.25-o*.22)/.55),u=l>0&&l<1?.75+.25*Math.sin(l*28):1;e.uniforms.uOn.value=G(l)*u;let d=s?this.focus===t?1.55:.62:1;e.gain+=(d-e.gain)*c;let f=i?1:1+.035*Math.sin(n*.9+t*1.7);e.uniforms.uGain.value=e.gain*f,this.floorU.uGateI.value[t]=e.uniforms.uOn.value*e.gain**1.8*f*(r.gates[t].y===0)}),this.drift.x+=(this.pointer.x-this.drift.x)*(1-Math.exp(-t*2.6)),this.drift.y+=(this.pointer.y-this.drift.y)*(1-Math.exp(-t*2.6));let l=i?0:Math.sin(n*.17)*.5,u=i?0:(1-G(K(a/2.2)))*16,d=this.tmpA.set(r.cam[0]+this.drift.x*2.6+l,r.cam[1]-this.drift.y*.45-u*.05,r.cam[2]+u),f=this.tmpB.set(r.look[0]+this.drift.x*1.1,r.look[1]-this.drift.y*.9,r.look[2]);if(this.flyT>0){let e=this.gates[this.flyGate],t=r.gates[this.flyGate],n=W(this.flyT),i=G(K(this.flyT*1.5)),a=t.x+e.normal.x*2.7,o=t.z+e.normal.y*2.7;d.set(d.x+(a-d.x)*n,d.y+(t.y+10.5-d.y)*n,d.z+(o-d.z)*n),f.set(f.x+(t.x-e.normal.x*20-f.x)*i,f.y+(t.y+11-f.y)*i,f.z+(t.z-e.normal.y*20-f.z)*i)}this.camera.position.copy(d),this.camera.lookAt(f),this.camera.updateMatrixWorld(),this.shared.uCam.value.copy(d),this.sky.position.copy(d),this.renderer.render(this.scene,this.camera),this.project(),this.frames++,!this.ready&&this.texLeft<=0&&this.nameMesh.visible&&this.frames>3&&a>2.3&&!this.fly&&(this.ready=!0,this.opts.onReady()),o?.()};project(){let e=this.rects;for(let t=0;t<B;t++){let n=this.gates[t].group.matrixWorld,r=1e9,i=1e9,a=-1e9,o=-1e9,s=!1;for(let e=0;e<4;e++){this.tmp.set(e&1?P/2:-7,e&2?F:0,I/2).applyMatrix4(n).project(this.camera),this.tmp.z>1&&(s=!0);let t=(this.tmp.x*.5+.5)*this.w,c=(-this.tmp.y*.5+.5)*this.h;t<r&&(r=t),t>a&&(a=t),c<i&&(i=c),c>o&&(o=c)}s?(e[t*4]=-9999,e[t*4+1]=-9999,e[t*4+2]=0,e[t*4+3]=0):(e[t*4]=r,e[t*4+1]=i,e[t*4+2]=a-r,e[t*4+3]=o-i)}this.opts.onRects(e)}dispose(){this.disposed=!0,this.stop(),this.canvas.removeEventListener(`webglcontextlost`,this.onContextLost),document.removeEventListener(`visibilitychange`,this.onVisibility),this.nameU.uMap.value?.dispose(),this.disposables.forEach(e=>e.dispose()),this.scene.clear(),this.renderer.dispose(),this.renderer.forceContextLoss(),this.canvas.remove()}},q=n(),J=new Set;function Y(e){J.has(e)||(J.add(e),{page:()=>a(()=>import(`./Module-BvcBqXaa.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10]),import.meta.url),tracktrace:()=>a(()=>import(`./tracktrace-B3Z8TVj3.js`).then(e=>e.n),__vite__mapDeps([11,1,2,3,12,10,13]),import.meta.url),bubblegrade:()=>a(()=>import(`./bubblegrade-BmPWx0Me.js`).then(e=>e.n),__vite__mapDeps([14,1,2,3,15,10,16,17,18]),import.meta.url),veinsqueeze:()=>a(()=>import(`./veinsqueeze-CMLEZ5tp.js`).then(e=>e.r),__vite__mapDeps([19,1,2,3,10,20,21,22,18]),import.meta.url),braindrift:()=>a(()=>import(`./braindrift-D2wCYiXR.js`).then(e=>e.n),__vite__mapDeps([23,1,2,3,24,10,25,26,22,18]),import.meta.url),garnmeter:()=>a(()=>import(`./garnmeter-1cT-Z-yF.js`).then(e=>e.n),__vite__mapDeps([27,1,2,3,10,28,29]),import.meta.url)}[e]?.().catch(()=>J.delete(e)))}var X=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)};function Z({flood:e}){let t=(0,E.useRef)(null),n=(0,E.useRef)(null),i=(0,E.useRef)(null),a=(0,E.useRef)([]),o=(0,E.useRef)(new Float32Array(24).fill(-1)),[s,c]=(0,E.useState)(!1),[l,u]=(0,E.useState)(!1),[d,f]=(0,E.useState)(null),[p,m]=(0,E.useState)(null),[h,g]=(0,E.useState)(null),_=(0,E.useRef)(null),v=(0,E.useRef)(j.from),y=(0,E.useRef)(typeof matchMedia==`function`&&matchMedia(`(prefers-reduced-motion: reduce)`).matches),b=h??d??p;(0,E.useEffect)(()=>{let r=n.current,s=t.current;if(!r||!s)return;let l=v.current;j.from=void 0;let d=null,f=e=>{let t=o.current;for(let n=0;n<6;n++){let r=a.current[n];if(!r)continue;let i=n*4;Math.abs(e[i]-t[i])<.2&&Math.abs(e[i+1]-t[i+1])<.2&&Math.abs(e[i+2]-t[i+2])<.2&&Math.abs(e[i+3]-t[i+3])<.2||(t[i]=e[i],t[i+1]=e[i+1],t[i+2]=e[i+2],t[i+3]=e[i+3],r.style.transform=`translate3d(${e[i].toFixed(1)}px, ${e[i+1].toFixed(1)}px, 0)`,r.style.width=`${e[i+2].toFixed(1)}px`,r.style.height=`${e[i+3].toFixed(1)}px`,r.style.setProperty(`--fs`,`${Math.min(25,Math.max(10.5,e[i+2]*.118)).toFixed(1)}px`))}};try{d=new ve({container:r,checks:O,reduced:y.current,from:l,onRects:f,onReady:()=>u(!0),onLost:()=>c(!0)})}catch{c(!0),u(!0)}i.current=d,l!==void 0&&e.clear(900);let p=new ResizeObserver(()=>d?.resize());p.observe(r);let m=e=>{e.pointerType===`mouse`&&d?.setPointer(e.clientX/window.innerWidth*2-1,e.clientY/window.innerHeight*2-1)};return s.addEventListener(`pointermove`,m),()=>{p.disconnect(),s.removeEventListener(`pointermove`,m),d?.dispose(),i.current=null,o.current.fill(-1)}},[e]),(0,E.useEffect)(()=>{if(y.current||d!==null||h!==null||!l)return;let e=p,t=window.setTimeout(()=>{e=e===null?0:e+1,m(e>5?null:e)},p===null?6500:3600);return()=>window.clearTimeout(t)},[p,d,h,l]),(0,E.useEffect)(()=>{i.current?.setFocus(b)},[b]),(0,E.useEffect)(()=>{l&&Y(`page`)},[l]),(0,E.useEffect)(()=>{d!==null&&Y(O[d].id)},[d]);let x=(0,E.useCallback)(t=>{if(_.current!==null)return;_.current=t,g(t);let n=O[t];Y(`page`),Y(n.id);let a=()=>r(`proto/V01/${n.id}`),o=i.current;!o||y.current?(e.set(n.hue,1,0),a()):o.flyTo(t,t=>e.set(n.hue,X(.52,.98,t)),a)},[e]),S=(e,t)=>{let n=window.innerWidth/window.innerHeight<.8,r=-1;e.key===`ArrowRight`?r=(t+1)%6:e.key===`ArrowLeft`?r=(t+5)%6:e.key===`ArrowUp`||e.key===`ArrowDown`?r=n?(t+3)%6:e.key===`ArrowUp`?(t+5)%6:(t+1)%6:e.key===`Home`?r=0:e.key===`End`&&(r=5),r<0||(e.preventDefault(),a.current[r]?.focus())},C=b===null?null:O[b];return(0,q.jsxs)(`div`,{ref:t,className:`v01 v01-home${s?` is-still`:``}${h===null?``:` is-leaving`}${l?` is-ready`:``}`,"data-proto":`V01`,"data-ready":l?`1`:void 0,"data-focus":b??void 0,style:{"--hue":C?.hue??`#cfd8ff`},children:[(0,q.jsx)(`div`,{className:`v01-stage`,ref:n}),(0,q.jsx)(`h1`,{className:`v01-name`,children:`SuperHumans`}),(0,q.jsx)(`nav`,{className:`v01-gates`,"aria-label":`The six checks`,children:O.map((e,t)=>(0,q.jsxs)(`button`,{ref:e=>{a.current[t]=e},type:`button`,className:`v01-gate${b===t?` is-on`:b===null?``:` is-dim`}`,style:{"--hue":e.hue},"data-qa":t===0?`primary`:void 0,"aria-label":`${e.name}: ${e.sentence}`,onClick:()=>x(t),onPointerEnter:e=>e.pointerType===`mouse`&&f(t),onPointerLeave:e=>e.pointerType===`mouse`&&f(n=>n===t&&document.activeElement!==e.currentTarget?null:n),onFocus:()=>f(t),onBlur:()=>f(e=>e===t?null:e),onKeyDown:e=>S(e,t),children:[(0,q.jsx)(`span`,{className:`v01-gate-img${e.invert?` is-invert`:``}`,style:{backgroundImage:`url(${e.img})`,backgroundPosition:`${e.at[0]*100}% ${e.at[1]*100}%`},"aria-hidden":`true`}),(0,q.jsxs)(`span`,{className:`v01-gate-label`,"aria-hidden":`true`,children:[(0,q.jsx)(`i`,{children:e.n}),(0,q.jsx)(`b`,{children:e.name})]})]},e.id))}),(0,q.jsx)(`div`,{className:`v01-readout`,"aria-live":`polite`,children:C?(0,q.jsxs)(`div`,{className:`v01-now`,children:[(0,q.jsxs)(`p`,{className:`v01-now-name`,children:[(0,q.jsx)(`i`,{children:C.n}),C.name]}),(0,q.jsx)(`p`,{className:`v01-now-sentence`,children:C.sentence})]},C.id):(0,q.jsxs)(`div`,{className:`v01-now`,children:[(0,q.jsx)(`p`,{className:`v01-site`,children:k}),(0,q.jsx)(`p`,{className:`v01-hint`,children:`Choose a gate`})]},`site`)}),(0,q.jsx)(`p`,{className:`v01-aimark`,children:`AI-generated imagery`})]})}var Q=e({default:()=>ye}),$=(0,E.lazy)(()=>a(()=>import(`./Module-BvcBqXaa.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10]),import.meta.url));function ye({view:e}){let t=A(e),n=(0,E.useRef)(null),r=(0,E.useMemo)(()=>({set:(e,t,r=0)=>{let i=n.current;i&&(i.style.setProperty(`--hue`,e),i.style.transition=r?`opacity ${r}ms ease`:`none`,i.style.opacity=String(t))},clear:(e=700)=>{let t=n.current;t&&(t.style.transition=`opacity ${e}ms cubic-bezier(0.3, 0, 0.2, 1)`,t.style.opacity=`0`)}}),[]);return(0,q.jsxs)(q.Fragment,{children:[t?(0,q.jsx)(E.Suspense,{fallback:(0,q.jsx)(`div`,{className:`v01 v01-mod`}),children:(0,q.jsx)($,{check:t,flood:r},t.id)}):(0,q.jsx)(Z,{flood:r}),(0,q.jsx)(`div`,{className:`v01-flood`,ref:n,"aria-hidden":`true`})]})}export{ye as default,j as n,O as r,Q as t};
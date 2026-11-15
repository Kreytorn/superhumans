import{Ot as e,W as t,Z as n,et as r,f as i,ft as a,kt as o,o as s,pt as c,s as l,t as u,ut as d}from"./three.module-DS1lwPcu.js";import{a as f,i as p,n as m,r as h}from"./GALAXY-BZsTtNvY.js";import{t as g}from"./data-CYl6NtTJ.js";var _=`
attribute vec3 aNormal;
attribute vec4 aData;
uniform float uTime, uScale, uPart, uDim, uRayHead, uBeat, uMaxPt, uForm;
uniform vec3 uCam, uAxis, uRayA, uRayD;
uniform vec3 uHue[6];
uniform vec3 uSpot[6];
uniform float uHot[6];
varying vec3 vCol;
varying float vA;
void main() {
  float seed = aData.x, kind = aData.y, cl = aData.z;
  float ph = seed * 6.2831853;
  vec3 p = position;
  vec3 col = vec3(0.0);
  float a = 0.0;
  float world = 0.0059 * aData.w;
  float glow = 0.0;
  vec3 pink = vec3(1.0, 0.36, 0.72);

  if (kind < 1.5) {
    // the figure and its halo: breathe along the skin, twinkle
    float amp = kind < 0.5 ? 0.0035 : 0.014;
    p += aNormal * amp * sin(uTime * (0.5 + seed) + ph * 7.0);
    vec3 cool = mix(vec3(0.50, 0.42, 1.0), vec3(0.36, 0.70, 1.0), smoothstep(-1.0, 0.9, position.y + 0.25 * sin(ph * 3.0)));
    vec3 warm = vec3(1.0, 0.78, 0.55);
    col = seed > 0.93 ? warm : mix(cool, vec3(0.80, 0.90, 1.0), pow(fract(seed * 13.7), 3.0));
    // cells lit by the ray that just passed, fading
    vec3 r = position - uRayA;
    float t = dot(r, uRayD);
    float dl = length(r - uRayD * t);
    float behind = uRayHead - t;
    glow = step(0.0, behind) * exp(-behind * 0.3) * exp(-dl * dl / 0.0011);
  } else if (kind < 2.5) {
    int ci = int(cl + 0.5);
    vec3 c0 = uSpot[ci];
    vec3 d = p - c0;
    if (ci == 1) d *= 1.0 + 0.2 * uBeat;
    if (ci == 5) {
      float an = uTime * 0.7;
      d.yz = mat2(cos(an), -sin(an), sin(an), cos(an)) * d.yz;
    }
    p = c0 + d + 0.0035 * vec3(sin(uTime * 1.3 + ph * 11.0), cos(uTime * 1.1 + ph * 17.0), sin(uTime * 0.9 + ph * 5.0));
    col = mix(uHue[ci], vec3(1.0), aData.w > 2.0 ? 0.45 : 0.0);
    a = (ci == 1 ? 0.2 : ci == 5 ? 0.2 : ci == 4 ? 0.3 : ci == 0 ? 0.42 : ci == 3 ? 0.17 : 0.2) * (1.0 + (ci == 1 || ci == 5 ? 0.9 : 1.6) * uHot[ci]);
    if (ci == 2 || ci == 3) a *= 0.8 + 0.45 * sin(p.y * 46.0 + uTime * 3.2 + (ci == 3 ? 1.5 : 0.0));
    if (ci == 4) a *= 0.7 + 0.5 * sin(uTime * (2.0 + seed * 5.0) + ph * 3.0);
    if (ci == 0) a *= 0.75 + 0.9 * exp(-max(uRayHead - 0.9, 0.0) * 0.35) * step(0.9, uRayHead);
    a *= 1.0 - 0.55 * uDim * (1.0 - uHot[ci]);
    world *= 1.3 + 0.5 * uHot[ci];
  } else if (kind < 3.5) {
    int ci = int(cl + 0.5);
    col = uHue[ci];
    a = 0.05 + 0.1 * uHot[ci] + (ci == 1 ? 0.05 * uBeat : 0.0);
    a *= 1.0 - 0.6 * uDim * (1.0 - uHot[ci]);
    world = 0.2 + 0.1 * uHot[ci];
  } else {
    // the cosmic ray: a thin streak with a white head
    float behind = uRayHead - cl;
    a = step(0.0, behind) * exp(-behind * 1.7) * 2.4;
    col = mix(pink, vec3(1.0), exp(-behind * 7.0));
    world = 0.008 + 0.02 * exp(-behind * 14.0);
  }

  // at first load the stars are a loose, flat cloud that swirls in and settles into the person
  float fm = smoothstep(seed * 0.5, seed * 0.5 + 0.5, uForm);
  if (kind < 2.5 && fm < 1.0) {
    vec3 rnd = normalize(vec3(sin(ph * 12.9898), 0.5 * cos(ph * 78.233), sin(ph * 37.719)));
    vec3 far = rnd * (1.1 + 2.7 * fract(seed * 91.7));
    far.y = far.y * 0.45 + p.y * 0.35;
    vec3 q = mix(far, p, fm);
    float an = (1.0 - fm) * (2.2 + 2.4 * fract(seed * 5.3));
    q.xz = mat2(cos(an), -sin(an), sin(an), cos(an)) * q.xz;
    p = q;
  }

  vec4 wp = modelMatrix * vec4(p, 1.0);
  if (kind < 1.5) {
    vec3 wn = normalize(mat3(modelMatrix) * aNormal);
    vec3 v = normalize(uCam - wp.xyz);
    float rim = 1.0 - abs(dot(wn, v));
    float tw = 0.8 + 0.35 * sin(uTime * (0.8 + seed * 2.6) + ph * 13.0);
    float neb = 0.5 + 0.5 * sin(position.y * 8.0 + 1.4 * sin(position.x * 13.0 + position.z * 9.0) - uTime * 0.55);
    a = (kind < 0.5 ? 0.035 + 0.95 * pow(rim, 2.6) : 0.13) * tw * (0.5 + 0.95 * neb * neb);
    if (aData.w > 2.0) { a = max(a, 0.4) * 1.5; col = mix(col, vec3(1.0), 0.6); }
    a *= 1.0 - 0.5 * uDim;
    col = mix(col, pink, clamp(glow * 1.4, 0.0, 1.0));
    a += glow * 2.4;
  }

  // the points part round the line the camera flies along
  vec3 rel = wp.xyz - uCam;
  float al = dot(rel, uAxis);
  vec3 perp = rel - uAxis * al;
  float pd = length(perp) + 1e-5;
  wp.xyz += (perp / pd) * uPart * 0.085 * exp(-pd * pd / 0.02) * smoothstep(0.0, 0.12, al);

  vec4 mv = viewMatrix * wp;
  float px = world * uScale / max(-mv.z, 0.02);
  if (kind > 2.5 && kind < 3.5) {
    gl_PointSize = min(px, uMaxPt);
  } else {
    a *= min(1.0, px * px / 2.2);
    a *= min(1.0, pow(6.0 / max(px, 0.001), 1.15));
    gl_PointSize = clamp(px, 1.5, min(uMaxPt, 56.0));
  }
  a *= kind < 2.5 ? 0.5 + 0.5 * fm : smoothstep(0.85, 1.0, uForm);
  vCol = col;
  vA = a * step(0.02, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`,v=`
attribute vec4 aData;
uniform float uTime, uScale, uDim, uMaxPt, uForm;
varying vec3 vCol;
varying float vA;
void main() {
  float seed = aData.x, kind = aData.y, r = aData.z;
  vec3 p = position;
  float a;
  vec3 col;
  float world = 0.011 * aData.w;
  if (kind < 0.5) {
    // the arms turn faster near the core, like a real disc
    float an = uTime * 0.085 / (0.35 + r);
    float c = cos(an), s = sin(an);
    p.xz = mat2(c, -s, s, c) * p.xz;
    vec3 core = vec3(1.0, 0.84, 0.66);
    vec3 arm = vec3(0.46, 0.60, 1.0);
    vec3 rimc = vec3(0.72, 0.42, 0.95);
    col = mix(core, arm, smoothstep(0.1, 0.9, r));
    col = mix(col, rimc, smoothstep(1.3, 2.9, r) * fract(seed * 7.3));
    a = (0.05 + 0.2 * aData.y * 0.0 + 0.16 * smoothstep(0.25, 0.7, r)) * (0.75 + 0.35 * sin(uTime * (0.6 + seed * 2.0) + seed * 40.0));
    a *= 1.0 - smoothstep(2.3, 3.0, r);
  } else {
    p.x += 0.05 * sin(uTime * 0.05 + seed * 30.0);
    col = mix(vec3(0.45, 0.55, 0.9), vec3(0.9, 0.75, 0.7), step(0.8, seed));
    a = 0.14 + 0.2 * step(0.93, seed);
    world = 0.02 * aData.w;
  }
  a *= (1.0 - 0.35 * uDim) * smoothstep(0.15, 1.0, uForm);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float px = world * uScale / max(-mv.z, 0.02);
  a *= min(1.0, px * px / 2.2);
  a *= min(1.0, pow(5.0 / max(px, 0.001), 1.5));
  gl_PointSize = clamp(px, 1.5, min(uMaxPt, 48.0));
  vCol = col;
  vA = a * step(0.02, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`,y=`
precision mediump float;
varying vec3 vCol;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  float f = exp(-r2 * 4.0) - 0.018;
  if (f <= 0.0) discard;
  gl_FragColor = vec4(vCol * vA * f, 1.0);
}
`,b=`
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,x=`
precision highp float;
varying vec2 vUv;
uniform float uTime, uAspect, uClose;
uniform vec2 uC;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = mat2(1.6, -1.2, 1.2, 1.6) * p + 11.7;
    a *= 0.5;
  }
  return v;
}
void main() {
  vec2 p = vUv - uC;
  p.x *= uAspect;
  float r = length(p);
  vec3 col = vec3(0.010, 0.013, 0.030);
  // a soft light behind the figure
  col += vec3(0.07, 0.12, 0.34) * exp(-r * r * 4.2) * 0.62;
  col += vec3(0.20, 0.10, 0.30) * exp(-pow(length(p * vec2(0.55, 1.6) + vec2(0.0, 0.52)), 2.0) * 5.0) * 0.5;
  // faint dust lanes drifting across, never dots
  vec2 q = p * 1.5 + vec2(uTime * 0.008, -uTime * 0.003);
  float n = fbm(q + 0.9 * fbm(q * 1.6 + 3.1));
  float lane = exp(-pow((p.y + p.x * 0.42 - 0.04) * 1.7, 2.0));
  col += vec3(0.16, 0.09, 0.34) * pow(n, 2.4) * lane * 1.5;
  col += vec3(0.03, 0.17, 0.26) * pow(noise(q * 1.1 + 7.3) * 0.62 + n * 0.3, 3.0) * 0.9;
  col *= 1.0 - 0.15 * uClose;
  vec2 e = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= 1.0 - 0.6 * smoothstep(0.35, 1.15, length(e));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`,S=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,C=class{renderer;scene=new a;camera=new n(30,1,.02,60);body;disc;bodyU;discU;skyU;raf=0;last=0;time=0;w=1;h=1;dpr=1;maxDpr;focus=-1;hover=-1;hot=new Float32Array(6);dim=0;p=1;dur=1.7;close=0;closeFrom=0;from={pos:new o,look:new o,shift:0};cur={pos:new o(0,.4,5.3),look:new o,shift:0};mouse=new e;mouseS=new e;xy=new Float32Array(12);spots=g.map(e=>new o(...e.spot));tmp=new o;tmp2=new o;settled=!1;slow=0;frames=0;disposed=!1;rayPin=null;form=0;opts;canvas;constructor(n,a){this.canvas=n,this.opts=a,this.maxDpr=a.touch?1.5:2,this.renderer=new u({canvas:n,antialias:!1,alpha:!1,powerPreference:`high-performance`,stencil:!1,depth:!1}),this.renderer.setClearColor(197642,1),this.renderer.outputColorSpace=d;let S=this.renderer.getContext(),C=S.getParameter(S.ALIASED_POINT_SIZE_RANGE),w=C?C[1]:64,T=new l;T.setAttribute(`position`,new s(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),this.skyU={uTime:{value:0},uAspect:{value:1},uC:{value:new e(.5,.5)},uClose:{value:0}};let E=new t(T,new c({vertexShader:b,fragmentShader:x,uniforms:this.skyU,depthTest:!1,depthWrite:!1}));E.frustumCulled=!1,E.renderOrder=-2,this.scene.add(E);let D=a.touch?62e3:104e3,O=p(D),k=new l;k.setAttribute(`position`,new s(O.position,3)),k.setAttribute(`aNormal`,new s(O.normal,3)),k.setAttribute(`aData`,new s(O.data,4)),this.bodyU={uTime:{value:0},uScale:{value:1},uPart:{value:0},uDim:{value:0},uRayHead:{value:-5},uBeat:{value:0},uForm:{value:1},uMaxPt:{value:w},uCam:{value:new o},uAxis:{value:new o(0,0,-1)},uRayA:{value:new o(...m)},uRayD:{value:new o(...h)},uHue:{value:g.map(e=>new i(e.hue).convertLinearToSRGB())},uSpot:{value:this.spots},uHot:{value:this.hot}};let A={transparent:!0,depthTest:!1,depthWrite:!1,blending:2};this.body=new r(k,new c({vertexShader:_,fragmentShader:y,uniforms:this.bodyU,...A})),this.body.frustumCulled=!1,this.scene.add(this.body);let j=f(a.touch?12e3:22e3,a.touch?1400:2600),M=new l;M.setAttribute(`position`,new s(j.position,3)),M.setAttribute(`aData`,new s(j.data,4)),this.discU={uTime:{value:0},uScale:{value:1},uDim:{value:0},uMaxPt:{value:w},uForm:{value:1}},this.disc=new r(M,new c({vertexShader:v,fragmentShader:y,uniforms:this.discU,...A})),this.disc.frustumCulled=!1,this.disc.position.y=-1.03,this.disc.renderOrder=-1,this.scene.add(this.disc);let N=new URLSearchParams(window.location.hash.split(`?`)[1]??``).get(`ray`);N!==null&&N!==``&&(this.rayPin=Number(N)),a.reduced&&(this.form=1),this.resize(),this.homePose(this.cur),document.addEventListener(`visibilitychange`,this.onVis),window.addEventListener(`pointermove`,this.onMove,{passive:!0}),this.start()}onVis=()=>{document.hidden?cancelAnimationFrame(this.raf):this.start()};onMove=e=>{e.pointerType!==`touch`&&(this.mouse.set(e.clientX/this.w*2-1,e.clientY/this.h*2-1),this.settled&&this.focus<0&&this.start())};start(){cancelAnimationFrame(this.raf),this.disposed||(this.last=0,this.raf=requestAnimationFrame(this.tick))}get portrait(){return this.w/this.h<.8}homePose(e){let t=this.portrait,n=t?7.3:4.95;e.pos.set(this.mouseS.x*.34,.42-this.mouseS.y*.16,n),e.look.set(0,t?.16:-.03,0),e.shift=t?0:.085}spotPose(e,t){let n=this.tmp.copy(this.spots[e]).applyMatrix4(this.body.matrixWorld),r=this.tmp2.set(n.x*.5,.12,1).normalize();t.look.copy(n),t.pos.copy(n).addScaledVector(r,.46),t.shift=0}setHover(e){this.hover=e,this.settled&&this.focus<0&&this.start()}setFocus(e,t=!1){if(e===this.focus&&!t)return;this.from.pos.copy(this.cur.pos),this.from.look.copy(this.cur.look),this.from.shift=this.cur.shift,this.closeFrom=this.close;let n=this.focus>=0&&e>=0;this.focus=e,this.dur=this.opts.reduced?.01:e<0?1.35:n?2:1.75,this.p=+!!t,t&&(this.form=1),this.settled=!1,this.start()}resize(){let e=this.canvas.getBoundingClientRect();this.w=Math.max(1,e.width),this.h=Math.max(1,e.height),this.dpr=Math.min(window.devicePixelRatio||1,this.maxDpr),this.renderer.setPixelRatio(this.dpr),this.renderer.setSize(this.w,this.h,!1),this.camera.aspect=this.w/this.h,this.skyU.uAspect.value=this.w/this.h;let t=this.h*this.dpr*.5/Math.tan(this.camera.fov*Math.PI/360);this.bodyU.uScale.value=t,this.discU.uScale.value=t,this.settled&&this.start()}tick=e=>{if(this.disposed)return;let t=this.last?Math.min(.05,(e-this.last)/1e3):.016;this.last&&(this.frames++,e-this.last>21&&this.slow++,this.frames>=50&&(this.slow>19&&this.maxDpr>1&&(this.maxDpr=Math.max(1,this.maxDpr-.5),this.resize()),this.frames=0,this.slow=0)),this.last=e,this.p<1&&(this.p=Math.min(1,this.p+t/this.dur));let n=S(this.p),r=+(this.focus>=0);this.close=this.closeFrom+(r-this.closeFrom)*n;let i=this.focus>=0&&this.closeFrom>.5?Math.sin(Math.PI*n):0,a=this.opts.reduced?0:1-Math.min(1,this.close*1.15)+i*.3;this.time+=t*Math.max(0,a);let o=this.time;this.mouseS.lerp(this.mouse,Math.min(1,t*2.2)),this.body.rotation.y=this.opts.reduced?.18:.5*Math.sin(o*.21),this.body.updateMatrixWorld();let s=this.poseTo;this.focus>=0?this.spotPose(this.focus,s):this.homePose(s),this.cur.pos.lerpVectors(this.from.pos,s.pos,n),this.cur.look.lerpVectors(this.from.look,s.look,Math.min(1,n*1.25)),this.cur.shift=this.from.shift+(s.shift-this.from.shift)*n,i>0&&(this.cur.pos.z+=i*1.1),this.camera.position.copy(this.cur.pos),this.camera.lookAt(this.cur.look),this.camera.setViewOffset(this.w,this.h,-this.cur.shift*this.w,0,this.w,this.h),this.camera.updateMatrixWorld(),this.form<1&&(this.form=Math.min(1,this.form+t/2.8));let c=1-(1-this.form)**2.4;this.bodyU.uForm.value=c,this.discU.uForm.value=c;let l=o*1.05%1;this.bodyU.uTime.value=o,this.bodyU.uBeat.value=Math.exp(-l*9)+.6*Math.exp(-(((l-.28)*9)**2)),this.bodyU.uRayHead.value=this.rayPin??-1.9+(o+5.9)%7*3.4,this.bodyU.uPart.value=Math.max(0,Math.min(1,(this.close-.4)/.6))*(1-i*.7),this.bodyU.uCam.value.copy(this.camera.position),this.bodyU.uAxis.value.copy(this.cur.look).sub(this.camera.position).normalize();let u=Math.min(1,t*7);for(let e=0;e<6;e++){let t=+(e===this.hover||e===this.focus);this.hot[e]+=(t-this.hot[e])*u}this.dim+=(+(this.hover>=0&&this.focus<0)-this.dim)*u,this.bodyU.uDim.value=this.dim,this.discU.uDim.value=this.dim,this.discU.uTime.value=o,this.skyU.uTime.value=o,this.skyU.uClose.value=this.close;for(let e=0;e<6;e++){let t=this.tmp.copy(this.spots[e]).applyMatrix4(this.body.matrixWorld).project(this.camera);this.xy[e*2]=(t.x*.5+.5)*this.w,this.xy[e*2+1]=(-t.y*.5+.5)*this.h}let d=this.tmp.set(0,.1,0).project(this.camera);this.skyU.uC.value.set(d.x*.5+.5,d.y*.5+.5),this.renderer.render(this.scene,this.camera),this.opts.onFrame(this.xy),this.p>=1&&!this.settled&&(this.settled=!0,this.opts.onArrive(this.focus)),this.settled&&this.focus>=0&&Math.abs(this.hot[this.focus]-1)<.01||(this.raf=requestAnimationFrame(this.tick))};poseTo={pos:new o,look:new o,shift:0};dispose(){this.disposed=!0,cancelAnimationFrame(this.raf),document.removeEventListener(`visibilitychange`,this.onVis),window.removeEventListener(`pointermove`,this.onMove),this.body.geometry.dispose(),this.body.material.dispose(),this.disc.geometry.dispose(),this.disc.material.dispose(),this.renderer.dispose()}};export{C as GalaxyScene};
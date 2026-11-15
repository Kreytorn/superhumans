import{n as e,r as t}from"./rolldown-runtime-XKyaHtl9.js";import{n,s as r}from"./index-C4hP4w5Z.js";/* empty css                        *//* empty css                   */import{d as i,f as a,i as o,n as s,o as c,r as l,s as u,t as d,u as f}from"./braindrift-Jx2KAqI4.js";import{$ as p,B as m,M as h,R as g,Tt as _,Y as v,ct as y,d as b,h as x,lt as S,o as C,ot as ee,q as w,s as T,t as E,wt as te}from"./three.module-D8PUL0DB.js";var D=t(r(),1),O=176,k=176,ne=208,re={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};async function ie(e){let t=await fetch(e);if(!t.ok)throw Error(`braindrift moment: ${e} -> HTTP ${t.status}`);let n=await t.arrayBuffer(),r=new DataView(n);if(r.getUint32(0,!0)!==1179937895)throw Error(`braindrift moment: ${e} is not a .glb`);let i=r.getUint32(12,!0),a=JSON.parse(new TextDecoder().decode(new Uint8Array(n,20,i))),o=20+i+8,s=a.meshes[0].primitives[0],c=e=>{let t=a.accessors[e],r=a.bufferViews[t.bufferView],i=o+(r.byteOffset??0)+(t.byteOffset??0),s=t.componentType===5121?1:t.componentType===5123?2:4;return{a:t,data:n.slice(i,i+t.count*re[t.type]*s)}},l=e=>new Float32Array(c(e).data),u=c(s.indices),d=u.a.componentType===5125?new Uint32Array(u.data):Uint32Array.from(new Uint16Array(u.data)),f=s.attributes;return{position:l(f.POSITION),normal:l(f.NORMAL),index:d,disp:f._DISP_MM===void 0?null:l(f._DISP_MM)}}var A=`
attribute float aDisp;
attribute float aGrow;
uniform float uRise;
uniform float uInflate;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying float vGrow;
varying vec3 vW;
varying vec3 vON;
void main() {
  vec3 p = position + normal * uInflate;
  p.y += aDisp * uRise;
  vZ = p.z;
  vW = p;
  vGrow = aGrow;
  vON = normal;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`,j=`
uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uRimCol;
uniform vec3 uLight;
uniform float uCutZ;
uniform float uSpec;
uniform float uScan;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying vec3 vW;
varying vec3 vON;
void main() {
  if (vZ < uCutZ) discard;
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  vec3 l = normalize(uLight);
  float d = clamp((dot(n, l) + 0.08) / 1.08, 0.0, 1.0);
  d = d * d * (3.0 - 2.0 * d);
  float cav = dot(normalize(vON), normalize(vW - vec3(0.0, -6.0, 0.0)));
  float ao = mix(0.1, 1.0, smoothstep(0.3, 0.97, cav));
  ao *= ao;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  vec3 col = mix(uShadow, uColor * 0.74, (0.03 + 0.97 * d) * ao);
  col += uSpec * pow(max(dot(n, normalize(l + v)), 0.0), 54.0) * ao;
  // cool light from behind: on the turned-away side and along every edge
  col += uRimCol * (pow(1.0 - ndv, 2.4) * 0.42 + (1.0 - d) * 0.05 * ao);
  float edge = 1.0 - smoothstep(0.0, 1.5, vZ - uCutZ);
  col += uRimCol * edge * (0.1 + 1.3 * uScan);
  if (!gl_FrontFacing) col = mix(uShadow, uColor, 0.12);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,ae=`
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uShadow;
uniform vec3 uLight;
uniform float uCutZ;
uniform float uGrowth;
uniform float uRim;
uniform float uSpec;
uniform float uGlow;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying float vGrow;
varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  vec3 l = normalize(uLight);
  float d = clamp((dot(n, l) + 0.4) / 1.4, 0.0, 1.0);
  d = d * d * (3.0 - 2.0 * d);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  // the second colour is drawn only as a rim: the band of the surface that meets the cut slice
  float rimBand = uRim > 0.0 ? 1.0 - smoothstep(uRim * 0.55, uRim, abs(vZ - uCutZ)) : 1.0;
  vec3 base = mix(uColor, uColor2, smoothstep(0.15, 0.85, vGrow) * uGrowth * rimBand);
  float pulse = 0.5 + 0.5 * sin(uTime * 1.5 - vW.y * 0.09);
  vec3 col = mix(uShadow, base, 0.12 + 0.88 * d);
  // light from inside: a soft core that pulses, and a bright skin where the surface turns away
  // (unmeasured fluid stays unlit: the light comes on when the model has measured it)
  float g = uGlow * uGlow;
  col += base * pow(ndv, 2.0) * (0.06 + 0.26 * g) * (0.75 + 0.5 * pulse);
  col += mix(base, vec3(1.0), 0.55) * pow(1.0 - ndv, 2.6) * (0.05 + 0.8 * g);
  col += uSpec * g * pow(max(dot(n, normalize(l + v)), 0.0), 40.0);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,oe=`
uniform vec3 uColor;
uniform float uStrength;
uniform float uCutZ;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
void main() {
  // only the fluid in front of the scan slice gives off light (what lies behind it is hidden in the solid half)
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(ndv, 2.4) * uStrength * (1.0 - smoothstep(-4.0, 3.0, vZ - uCutZ));
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`,M=`
uniform vec3 uColor;
uniform vec3 uGlow;
uniform vec3 uLight;
uniform float uCutZ;
uniform float uAlpha;
uniform float uRead;
uniform float uDone;
uniform float uTime;
uniform sampler2D uFace;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying vec3 vW;
void main() {
  if (vZ > uCutZ) discard;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float f = pow(1.0 - abs(dot(n, v)), 2.2);
  float lit = clamp(dot(n, normalize(uLight)) * 0.5 + 0.5, 0.0, 1.0);
  float a = (0.008 + 0.3 * f * f) * (0.5 + 0.5 * lit);
  float w = fwidth(vZ);
  float dz = abs(fract(vZ * 0.25) - 0.5) * 4.0;
  float stripe = (1.0 - smoothstep(0.22, 0.4 + w, dz)) * (1.0 - smoothstep(1.1, 2.6, w));
  float behind = uCutZ - vZ;
  float trail = exp(-behind / 20.0);
  // once the model has read every slice, the contours keep a steady trace of that read
  float s = stripe * (0.06 + 0.06 * uDone + uRead * (0.12 + 0.85 * trail)) * (0.22 + 0.78 * f);
  // a slow shimmer runs along the contours at rest
  s *= 0.8 + 0.2 * sin(uTime * 0.9 + vZ * 0.12);
  vec3 col = mix(uColor, uGlow, clamp(0.35 + 0.65 * uRead * trail + stripe * 0.4, 0.0, 1.0));
  a = (a + s) * uAlpha;
  // where this fragment lies in front of the scan slice the glass steps back, so nothing is drawn across the scan
  vec3 ray = vW - cameraPosition;
  vec2 hit = cameraPosition.xy + ray.xy * ((uCutZ - cameraPosition.z) / ray.z);
  vec2 uv = vec2(hit.x + 88.5, hit.y + 87.5) / 176.0;
  float over = uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0 ? texture2D(uFace, uv).a : 0.0;
  a *= 1.0 - 0.92 * smoothstep(0.1, 0.9, over);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`,se=`
uniform vec3 uColor;
uniform float uStrength;
uniform float uCutZ;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying float vZ;
varying vec3 vW;
void main() {
  if (vZ < uCutZ + 0.6) discard;
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // deeper inside the solid half the light is softer
  float depth = exp(-(vZ - uCutZ) / 38.0);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.5 - vW.y * 0.09);
  // mostly the silhouette: an outline of light through the tissue, not a wash over the slice
  float a = (0.08 + 0.92 * pow(1.0 - ndv, 2.6)) * uStrength * (0.35 + 0.65 * depth) * pulse;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`,N=`
uniform vec3 uColor;
uniform vec2 uSize;
uniform float uA;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * uSize;
  vec2 d = min(p, uSize - p);
  float m = min(d.x, d.y);
  float w = max(fwidth(p.x), fwidth(p.y));
  float line = 1.0 - smoothstep(0.35, 0.35 + 1.5 * w, m);
  float corner = step(max(d.x, d.y), 12.0);
  float tx = abs(fract(p.x / 10.0 + 0.5) - 0.5) * 10.0;
  float ty = abs(fract(p.y / 10.0 + 0.5) - 0.5) * 10.0;
  float tick = (step(d.y, 3.5) * (1.0 - smoothstep(0.2, 0.2 + 1.5 * w, tx)) + step(d.x, 3.5) * (1.0 - smoothstep(0.2, 0.2 + 1.5 * w, ty)));
  float glow = exp(-m / 4.0) * 0.1 * (0.3 + 0.7 * corner);
  float sweep = exp(-abs(vUv.y - fract(uTime * 0.55)) * 60.0) * step(2.0, m) * 0.10;
  float a = (line * (0.12 + 0.88 * corner) + min(tick, 1.0) * 0.3 + glow + sweep + 0.012) * uA;
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`,P=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,ce=`
uniform sampler2D uMap;
uniform vec3 uEdge;
uniform float uScan;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.02) discard;
  vec3 col = t.rgb;
  float e = t.a * (1.0 - t.a) * 4.0;
  col += uEdge * e * (0.42 + 0.7 * uScan);
  float sweep = 1.0 - smoothstep(0.0, 0.035, abs(vUv.y - fract(uTime * 0.55)));
  col += uEdge * sweep * 0.22 * uScan;
  gl_FragColor = vec4(col, t.a);
  #include <colorspace_fragment>
}`;function F(e){return new b().setRGB(e[0]/255,e[1]/255,e[2]/255,ee)}var I=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n],le=class{renderer;scene=new y;camera=new w(19,1,10,4e3);rect={x0:0,y0:0,x1:0,y1:0};w=1;h=1;az0=0;el0=0;dist0=900;shellPos=null;far=null;glassBack=null;glassFront=null;vent;halos=[];xray;frame;vents=new Map;face;faceTex;faceData=new Uint8Array(123904);faceKey=``;mask=new Uint8Array(30976);grey=new Uint8Array(30976);depth=new Uint8Array(30976);queue=new Int32Array(30976);lut=new Float32Array(256);tokens=null;light=new _(.5,.78,.62).normalize();tmp=new _;lastVent=-1;kickAt=-10;constructor(e){this.renderer=new E({canvas:e,antialias:!0,alpha:!0}),this.renderer.setClearColor(0,0);for(let e=0;e<256;e++)this.lut[e]=Math.min(1,Math.max(0,(e/255-.02)/.8))**.78;this.faceTex=new x(this.faceData,O,k,p),this.faceTex.colorSpace=ee,this.faceTex.magFilter=h,this.faceTex.minFilter=h,this.face=new m(new v(O,k),new S({vertexShader:P,fragmentShader:ce,transparent:!0,side:2,uniforms:{uMap:{value:this.faceTex},uEdge:{value:new b(0,0,0)},uScan:{value:0},uTime:{value:0}}})),this.face.renderOrder=1,this.face.position.set(-.5,.5,0),this.scene.add(this.face),this.vent=new m(new T,new S({vertexShader:A,fragmentShader:ae,side:2,uniforms:{uColor:{value:new b(1,1,1)},uColor2:{value:new b(1,1,1)},uShadow:{value:new b(0,0,0)},uLight:{value:this.light},uCutZ:{value:0},uGrowth:{value:0},uRim:{value:0},uSpec:{value:.28},uGlow:{value:0},uTime:{value:0},uRise:{value:0},uInflate:{value:0}}})),this.vent.visible=!1,this.scene.add(this.vent);for(let[e,t]of[[2.2,.3],[6.5,.15]]){let n=new m(this.vent.geometry,new S({vertexShader:A,fragmentShader:oe,side:0,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,uniforms:{uColor:{value:new b(1,1,1)},uStrength:{value:t},uCutZ:{value:0},uRise:{value:0},uInflate:{value:e}}}));n.userData.strength=t,n.renderOrder=1.5,n.visible=!1,this.halos.push(n),this.scene.add(n)}this.xray=new m(this.vent.geometry,new S({vertexShader:A,fragmentShader:se,side:2,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,uniforms:{uColor:{value:new b(1,1,1)},uStrength:{value:0},uCutZ:{value:0},uTime:{value:0},uRise:{value:0},uInflate:{value:0}}})),this.xray.renderOrder=4,this.xray.visible=!1,this.scene.add(this.xray),this.frame=new m(new v(1,1),new S({vertexShader:P,fragmentShader:N,side:2,transparent:!0,depthWrite:!1,blending:2,uniforms:{uColor:{value:new b(1,1,1)},uSize:{value:new te(1,1)},uA:{value:0},uTime:{value:0}}})),this.frame.renderOrder=5,this.frame.visible=!1,this.scene.add(this.frame)}shell(){return new S({vertexShader:A,fragmentShader:j,side:2,uniforms:{uColor:{value:new b(1,1,1)},uShadow:{value:new b(0,0,0)},uRimCol:{value:new b(0,0,0)},uLight:{value:this.light},uCutZ:{value:0},uSpec:{value:.2},uScan:{value:0},uRise:{value:0},uInflate:{value:0}}})}glass(e,t){return new S({vertexShader:A,fragmentShader:M,side:e,transparent:!0,depthWrite:!1,uniforms:{uColor:{value:new b(1,1,1)},uGlow:{value:new b(1,1,1)},uLight:{value:this.light},uCutZ:{value:0},uFace:{value:this.faceTex},uAlpha:{value:t},uRead:{value:0},uDone:{value:0},uTime:{value:0},uRise:{value:0},uInflate:{value:0}}})}geometry(e){let t=new T;t.setAttribute(`position`,new C(e.position,3)),t.setAttribute(`normal`,new C(e.normal,3));let n=e.position.length/3;return t.setAttribute(`aDisp`,new C(e.disp??new Float32Array(n),1)),t.setAttribute(`aGrow`,new C(new Float32Array(n),1)),t.setIndex(new C(e.index,1)),t}setShell(e){let t=this.geometry(e);this.shellPos=e.position,this.far=new m(t,this.shell()),this.glassBack=new m(t,this.glass(1,.3)),this.glassBack.renderOrder=2,this.glassFront=new m(t,this.glass(0,1)),this.glassFront.renderOrder=3,this.scene.add(this.far,this.glassBack,this.glassFront);let n=1/0,r=-1/0,i=1/0,a=-1/0;for(let t=0;t<e.position.length;t+=3){let o=e.position[t],s=e.position[t+1];o<n&&(n=o),o>r&&(r=o),s<i&&(i=s),s>a&&(a=s)}let o=r-n+10,s=a-i+12;this.frame.scale.set(o,s,1),this.frame.position.set((n+r)/2,(i+a)/2+1.5,0),this.frame.material.uniforms.uSize.value.set(o,s),this.tokens&&this.setTokens(this.tokens)}hasVent(e){return this.vents.has(e)}setVent(e,t){this.vents.set(e,this.geometry(t))}setGrowth(e,t){let n=this.vents.get(e);n&&n.setAttribute(`aGrow`,new C(t,1))}setTokens(e){this.tokens=e,this.faceKey=``;let t=e.glow??e.mark;if(this.far){let n=this.far.material.uniforms;n.uColor.value=F(e.specimen),n.uShadow.value=F(I(I(I(e.specimen,[0,0,0],.88),e.stage,.3),t,.07)),n.uRimCol.value=F(t);for(let n of[this.glassBack,this.glassFront]){let r=n.material.uniforms;r.uColor.value=F(e.glass),r.uGlow.value=F(t)}}this.face.material.uniforms.uEdge.value=F(t),this.frame.material.uniforms.uColor.value=F(t);let n=this.vent.material.uniforms;n.uColor2.value=F(e.mark2)}resize(e,t,n,r,i=!1){this.w=e,this.h=t,this.renderer.setPixelRatio(n),this.renderer.setSize(e,t,!1);let a=e/t,o=Math.min(1,Math.max(0,(a-.7)/.8)),s=o*o*(3-2*o),c=g.degToRad(16+22*s);this.az0=c;let l=g.degToRad(27-5*s);this.el0=l;let u=new _(-Math.sin(c)*Math.cos(l),Math.sin(l),-Math.cos(c)*Math.cos(l)),d=this.camera;d.aspect=a,d.clearViewOffset();let f=Math.max(40,e-r.left-r.right),p=Math.max(40,t-r.top-r.bottom),m=900,h=this.shellPos;for(let n=0;n<3;n++){this.dist0=m,d.position.copy(u).multiplyScalar(m),d.lookAt(0,0,0),d.updateProjectionMatrix(),d.updateMatrixWorld(!0);let a=1/0,o=-1/0,s=1/0,c=-1/0;if(h)for(let e=0;e<h.length;e+=21)this.tmp.set(h[e],h[e+1]+1.3,h[e+2]).project(d),this.tmp.x<a&&(a=this.tmp.x),this.tmp.x>o&&(o=this.tmp.x),this.tmp.y<s&&(s=this.tmp.y),this.tmp.y>c&&(c=this.tmp.y);else a=s=-.5,o=c=.5;let l=(o-a)/2*e,g=(c-s)/2*t,_=Math.max(l/f,g/p);if(n<2){m*=_;continue}let v=(a+o)/2*.5*e+e/2,y=-(s+c)/2*.5*t+t/2,b=v-(r.left+f/2),x=y-(r.top+(i?g/2:p/2));d.setViewOffset(e,t,b,x,e,t),d.updateProjectionMatrix(),this.rect={x0:v-l/2-b,x1:v+l/2-b,y0:y-g/2-x,y1:y+g/2-x}}}project(e,t,n){return this.tmp.set(e,t,n).project(this.camera),[(this.tmp.x*.5+.5)*this.w,(-this.tmp.y*.5+.5)*this.h]}paintFace(e){let t=this.tokens;if(!t)return;let n=e=>Math.round(e*24),r=`${e.k}|${n(e.map)}|${n(e.measured)}|${n(e.growth)}|${+!!e.seg}`;if(r===this.faceKey)return;this.faceKey=r;let{vol:i,seg:a,preSeg:o}=e,s=this.faceData,c=e.k,l=[0,0,.86,.86,.86,.86];for(let n=0;n<O;n++)for(let r=0;r<k;r++){let u=(n*k+r)*ne+c,d=i[u],f=a?a[u]:0,p=o?o[u]:0,m=((175-r)*O+n)*4;if(this.grey[m>>2]=d,!(d>0||f>0||p>0)){s[m]=s[m+1]=s[m+2]=s[m+3]=0;continue}let h=this.lut[d],g=t.scan[0]*h,_=t.scan[1]*h,v=t.scan[2]*h;if(f===1&&e.measured>0){let n=t.mark;e.growth>0&&p!==1&&(n=I(t.mark,t.mark2,e.growth));let r=.94*e.measured;g+=(n[0]-g)*r,_+=(n[1]-_)*r,v+=(n[2]-v)*r}else if(f>=2&&e.map>0){let n=t.classes[f-2],r=l[f]*e.map;g+=(n[0]-g)*r,_+=(n[1]-_)*r,v+=(n[2]-v)*r}s[m]=g,s[m+1]=_,s[m+2]=v,s[m+3]=255}this.softenEdge(),this.faceTex.needsUpdate=!0}softenEdge(){let e=this.faceData,{mask:t,grey:n,depth:r,queue:i}=this,a=30976,o=0,s=0;for(let n=0;n<a;n++)t[n]=+!!e[n*4+3],r[n]=0,t[n]||(i[s++]=n);let c=(e,t)=>{let n=e%O;n>0&&t(e-1),n<175&&t(e+1),e>=O&&t(e-O),e<30800&&t(e+O)};for(;o<s;){let e=i[o++],a=r[e];a>=3||c(e,e=>{t[e]===1&&n[e]<40&&(t[e]=0,r[e]=a+1,i[s++]=e)})}for(let e=0;e<a;e++)if(t[e]===1){for(o=0,s=0,i[s++]=e,t[e]=2;o<s;)c(i[o++],e=>{t[e]===1&&(t[e]=2,i[s++]=e)});if(s<40)for(let e=0;e<s;e++)t[i[e]]=0}for(let n=0;n<2;n++){s=0;for(let n=0;n<a;n++){if(t[n])continue;let r=0,a=0,o=0,l=0;c(n,n=>{t[n]&&(r+=e[n*4],a+=e[n*4+1],o+=e[n*4+2],l++)}),l&&(e[n*4]=r/l,e[n*4+1]=a/l,e[n*4+2]=o/l,i[s++]=n)}for(let e=0;e<s;e++)t[i[e]]=3}for(let n=0;n<a;n++){let r=n%O;if(r===0||r===175||n<O||n>=30800){e[n*4+3]=0;continue}let i=0;for(let e=-1;e<=1;e++)for(let r=-1;r<=1;r++)t[n+e*O+r]===2&&(i+=(r?1:2)*(e?1:2));e[n*4+3]=i*16>255?255:i*16}}dirtyFace(){this.faceKey=``}draw(e){let t=this.tokens;if(!t)return;let n=e.time??0,r=e.scan??0,i=this.camera,a=this.az0+(e.daz??0),o=this.el0+(e.del??0);i.position.set(-Math.sin(a)*Math.cos(o),Math.sin(o),-Math.cos(a)*Math.cos(o)).multiplyScalar(this.dist0*(1-(e.dolly??0))),i.lookAt(0,0,0),i.updateMatrixWorld(!0),this.light.set(.62+.2*Math.sin(n*.33),.72,.34+.1*Math.cos(n*.33)).normalize();let s=e.cutK-104;this.face.position.z=s;let c=this.face.material.uniforms;if(c.uScan.value=r,c.uTime.value=n,this.far){let t=this.far.material.uniforms;t.uCutZ.value=s+.35,t.uRise.value=e.rise,t.uScan.value=r;for(let t of[this.glassBack,this.glassFront]){let i=t.material.uniforms;i.uCutZ.value=s,i.uRise.value=e.rise,i.uRead.value=r,i.uDone.value=e.measured,i.uTime.value=n}}this.frame.position.z=s;let l=this.frame.material.uniforms;l.uA.value=r,l.uTime.value=n,this.frame.visible=r>.01;let u=this.vents.get(e.ventIdx);if(u){let i=t.glow??t.mark,a=I(t.fluid,t.mark,e.measured);this.vent.geometry=u,this.vent.visible=!0;let o=this.vent.material.uniforms;o.uColor.value=F(a),o.uShadow.value=F(I(I(a,[0,0,0],.8),t.stage,.2)),o.uGrowth.value=e.growth,o.uCutZ.value=s,o.uRim.value=3,o.uGlow.value=.3+.7*e.measured,o.uTime.value=n,this.lastVent!==e.ventIdx&&(this.lastVent>=0&&n>0&&(this.kickAt=n),this.lastVent=e.ventIdx);let c=n>0?Math.exp(-Math.max(0,n-this.kickAt)*2.6):0,l=1+.16*Math.sin(n*1.5)+1.6*c;for(let n of this.halos){n.geometry=u,n.visible=!0;let r=n.material.uniforms;r.uColor.value=F(I(t.fluid,i,e.measured)),r.uStrength.value=n.userData.strength*(.3+.7*e.measured)*l,r.uCutZ.value=s}this.xray.geometry=u,this.xray.visible=!0;let d=this.xray.material.uniforms;d.uColor.value=F(I(t.fluid,i,e.measured)),d.uStrength.value=.03+.1*e.measured+.16*e.measured*r+.12*c,d.uCutZ.value=s,d.uTime.value=n}this.renderer.render(this.scene,this.camera)}dispose(){this.scene.traverse(e=>{let t=e;t.isMesh&&t.material.dispose()});for(let e of this.vents.values())e.dispose();this.far?.geometry.dispose(),this.face.geometry.dispose(),this.faceTex.dispose(),this.renderer.dispose()}},ue=176,L=208;function de(e,t,n,r){let i=Math.floor(t),a=Math.floor(n),o=Math.floor(r);if(i<0||a<0||o<0||i>=175||a>=175||o>=207)return 0;let s=t-i,c=n-a,l=r-o,u=0;for(let t=0;t<2;t++)for(let n=0;n<2;n++)for(let r=0;r<2;r++)e[((i+t)*ue+a+n)*L+o+r]===1&&(u+=(t?s:1-s)*(n?c:1-c)*(r?l:1-l));return u}function fe(e,t){let n=e.position.length/3,r=new Float32Array(n);for(let i=0;i<n;i++){let n=e.position[i*3]-.6*e.normal[i*3],a=e.position[i*3+1]-.6*e.normal[i*3+1],o=e.position[i*3+2]-.6*e.normal[i*3+2],s=de(t,n+88,88-a,o+104);r[i]=1-Math.min(1,Math.max(0,(s-.25)/.5))}let i=new Float32Array(n),a=new Uint16Array(n);for(let t=0;t<5;t++){i.fill(0),a.fill(0);for(let t=0;t<e.index.length;t+=3){let n=e.index[t],o=e.index[t+1],s=e.index[t+2],c=r[n]+r[o]+r[s];i[n]+=c,i[o]+=c,i[s]+=c,a[n]+=3,a[o]+=3,a[s]+=3}for(let e=0;e<n;e++)a[e]&&(r[e]=i[e]/a[e])}return r}var R={fly:[0,1500],seal:[1500,2100],read:[2100,5700],compare:[5700,7e3]},z=R.compare[1],B=e=>e<0?0:e>1?1:e,V=(e,[t,n])=>B((e-t)/(n-t)),H=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,U=e=>1-(1-e)**4;function pe(e){return e<=0?`idle`:e<R.fly[1]?`fly`:e<R.seal[1]?`seal`:e<R.read[1]?`read`:e<z?`compare`:`result`}function me(e,t,n){let r=pe(e),i=t/4*H(V(e,R.fly)),a=Math.min(t,Math.round(i*4)),o=n.restK;r===`seal`?o=n.restK+(n.k0-n.restK)*H(V(e,R.seal)):r===`read`?o=n.k0+(n.k1-n.k0)*V(e,R.read):(r===`compare`||r===`result`)&&(o=n.k1+(n.restK-n.k1)*H(V(e,[R.compare[0],R.compare[0]+800])));let s=e>=R.read[0],c=V(e,R.compare);return{beat:r,pos:i,frameIdx:a,cutK:o,map:s?1-.78*U(B(c*1.6)):0,measured:+!!s,growth:U(B((c-.5)/.3)),marks:B((c-.62)/.38)}}function he(e,t){return{beat:`idle`,pos:e,frameIdx:Math.round(e*4),cutK:t.restK,map:0,measured:0,growth:0,marks:0}}var W=e({BEATS:()=>R,BrainDriftMoment:()=>Q,END:()=>z,default:()=>Q,frameAt:()=>me}),G=n(),K=176,q=176,J=208,ge=100,_e=2600,ve=4,Y=e=>e===null?`n/a`:`${e>=0?`+`:`−`}${Math.abs(e).toFixed(1)} %`,ye=e=>`+${Math.round(e*100+1e-6)/100} %`,X=e=>e===null?`n/a`:`${Math.abs(e).toFixed(1)} mm`,be=e=>`${Math.round(e*100+1e-6)/100} mm`,Z=e=>e<0?0:e>1?1:e;function xe(e,t){let n=Z(e/t),r=n<.5?Math.cbrt(n/4):1-Math.cbrt(2*(1-n))/2;return R.fly[0]+r*(R.fly[1]-R.fly[0])}function Se(e,t){let n=[],r=q;for(let i=0;i<K;i++){let a=-1;for(let n=0;n<q;n++)if(e[(i*q+n)*J+t]>0){a=n;break}n.push(a),a>=0&&a<r&&(r=a)}let i=[];for(let e=0;e<K;e++){let t=n[e];for(let r=-6;r<=6&&t>=0;r++){let i=n[e+r];i!==void 0&&i>=0&&i<t&&(t=i)}i.push(t)}let a=[];for(let e=0;e<K;e++){if(i[e]<0||i[e]>r+30)continue;let t=0,n=0;for(let r=-5;r<=5;r++){let a=i[e+r];a!==void 0&&a>=0&&(t+=a,n++)}a.push(e-88,88-t/n+.5)}return a}function Ce(e){let t=new Uint8Array(J);for(let n=0;n<30976;n++){let r=n*J;for(let n=0;n<J;n++)e[r+n]&&(t[n]=1)}let n=0,r=207;for(;n<207&&!t[n];)n++;for(;r>0&&!t[r];)r--;return[n,r]}function we(e){let t=document.createElement(`canvas`);t.width=t.height=1;let n=t.getContext(`2d`,{willReadFrequently:!0}),r=t=>{e.style.color=`var(${t})`,n.clearRect(0,0,1,1),n.fillStyle=`#808080`,n.fillStyle=getComputedStyle(e).color,n.fillRect(0,0,1,1);let r=n.getImageData(0,0,1,1).data;return[r[0],r[1],r[2]]};return{specimen:r(`--m-specimen`),glass:r(`--m-glass`),fluid:r(`--m-fluid`),mark:r(`--m-mark`),mark2:r(`--m-mark-2`),scan:r(`--m-scan`),stage:r(`--m-stage`),glow:r(`--m-glow`),classes:[r(`--m-class-white`),r(`--m-class-cortex`),r(`--m-class-deep`),r(`--m-class-hind`)]}}var Q=(0,D.forwardRef)(function(e,t){let{sampleId:n,mode:r=`auto`,state:p,t:m,labels:h=!0,tags:g=!0,controls:_=!0,className:v,style:y}=e,b=(0,D.useRef)(null),x=(0,D.useRef)(null),S=(0,D.useRef)(null),C=(0,D.useRef)(null),ee=(0,D.useRef)(null),w=(0,D.useRef)(null),T=(0,D.useRef)(null),E=(0,D.useRef)(null),te=(0,D.useRef)(null),O=(0,D.useRef)(null),k=(0,D.useRef)(null),ne=(0,D.useRef)(null),re=(0,D.useRef)({onResult:e.onResult,onState:e.onState});re.current={onResult:e.onResult,onState:e.onState};let A=(0,D.useRef)({labels:h,mode:r,sampleId:n});A.current={labels:h,mode:r,sampleId:n};let[j,ae]=(0,D.useState)(`idle`),oe=(0,D.useRef)(`idle`),[M,se]=(0,D.useState)(!1),[N,P]=(0,D.useState)(``),[ce,F]=(0,D.useState)(null),[I,ue]=(0,D.useState)(``),[L,de]=(0,D.useState)(!1),[B,V]=(0,D.useState)(0),[U,pe]=(0,D.useState)(!0),W=(0,D.useRef)(null);(0,D.useImperativeHandle)(t,()=>({run:()=>W.current?.run(),reset:()=>W.current?.reset()}),[]),(0,D.useEffect)(()=>{let e=b.current,t=x.current,n=!1,r=0,h=null,g=null,_=null,v=null,y=!1,D=``,j=-1,M=0,N=0,ce=!0,I=``,L=null,B=``,V=0,U=0,G=!0,K=null,q=-1,J=!1,Y=0,X=matchMedia(`(prefers-reduced-motion: reduce)`).matches,be=matchMedia(`(pointer: coarse)`).matches,Q={t:0,startT:0,last:0,running:!1,target:ve,runId:0,live:!1,result:null,liveSeg:null,frontier:-1,fired:!1},Te=e=>{oe.current!==e&&(oe.current=e,ae(e),re.current.onState?.(e))},Ee=e=>{n||(console.error(`[braindrift moment]`,e),Q.running=!1,ue(e instanceof Error?e.message:String(e)),Te(`error`))},De=()=>{let e=A.current.mode;return e===`replay`||y?!1:e===`live`||!(be||window.innerWidth<700)},Oe=e=>{let t=g?g.frames.findIndex(t=>t.id===e):-1;return t>0?t:ve},ke=e=>!!g&&!!g.vols[e]&&!!h&&h.hasVent(e),Ae=e=>{let t=g,r=t.loading.get(e);if(!r){let i=t.frames[e];r=Promise.all([a(i.volume),ie(f(i.ventMesh))]).then(([r,i])=>{n||(t.vols[e]=r,t.vents.set(e,i),h?.setVent(e,i),$())}),t.loading.set(e,r),r.catch(()=>t.loading.delete(e))}return r},je=(e,t)=>{let n=g,r=n.vents.get(e);r&&h&&h.setGrowth(e,fe(r,t.pre.seg)),n.lines.set(e,{pre:Se(t.pre.seg,n.geo.restK),post:Se(t.post.seg,n.geo.restK)}),D=``},Me=()=>(!v&&g&&(v=c().then(()=>o(g.frames[0].id,{onProgress:e=>{if(!n){K=e.seg;for(let t of e.slices)t>q&&(q=t);Q.running&&Q.live&&!Q.result&&(h?.dirtyFace(),$())}}})).then(()=>{J=!0}),v.catch(()=>{y=!0})),v),Ne=async(e,t)=>{await Me();let r=await l(g.frames[e].id,{onProgress:e=>{if(!(n||Q.runId!==t)){Q.liveSeg=e.seg;for(let t of e.slices)t>Q.frontier&&(Q.frontier=t);h?.dirtyFace(),$()}}});if(r.kind!==`flight`)throw Error(`not a flight frame`);return r},Pe=()=>{let e=Q.result;if(!e||Q.fired)return;Q.fired=!0;let t=s(e);F({r:e,a:t}),re.current.onResult?.(e,t)},Fe=()=>{let e=1/0;if((!ke(Q.target)||X&&!Q.result)&&(e=Q.startT),!Q.result){let t=g.geo,n=Q.live?Z((Q.frontier-t.k0)/(t.k1-t.k0)):0;e=Math.min(e,R.read[0]+n*(R.read[1]-R.read[0]))}return e},Ie=()=>{let e=g.geo;return _===null?me(Q.t,Q.target,e):he(_,e)},Le=(t,n,r,i,a)=>{let o=g,s=h,c=e.clientWidth,l=e.clientHeight,u=c/l>1.25,d=o.geo.restK-104,f=o.vents.get(r),p=c/2,m=l/2;if(f){let e=[];for(let t=0;t<f.position.length;t+=15)f.position[t+2]>d-4||e.push(s.project(f.position[t],f.position[t+1],f.position[t+2]));if(e.sort((e,t)=>e[0]-t[0]),u){let t=e[Math.floor(e.length*.02)];t&&([p,m]=t)}else if(e.length){let t=Math.max(1,Math.floor(e.length*.25)),n=0,r=0;for(let i=0;i<t;i++)n+=e[i][0],r+=e[i][1];n/=t,r/=t;let i=1/0;for(let a=0;a<t;a++){let t=(e[a][0]-n)**2+(e[a][1]-r)**2;t<i&&(i=t,p=e[a][0],m=e[a][1])}}}let _=t?t.offsetWidth:170,v=t?t.offsetHeight:60,y,b,x;return u?(y=Math.max(16,s.rect.x0-_-18),b=i?m-v/2+22:Math.min(l-v-150,Math.max(16,m-v/2+34)),x=`M${(p+3).toFixed(1)} ${m.toFixed(1)}L${(y+_+10).toFixed(1)} ${(b+(i?v/2:18)).toFixed(1)}`):(y=Math.max(16,Math.min(c-_-16,p-34)),b=Math.min(l-v-134,Math.max(m+44,s.rect.y1+8)),x=`M${p.toFixed(1)} ${m.toFixed(1)}L${(y+18).toFixed(1)} ${(b-7).toFixed(1)}`),n.setAttribute(`d`,x),a&&(a.setAttribute(`cx`,p.toFixed(1)),a.setAttribute(`cy`,m.toFixed(1))),t&&(t.style.transform=`translate(${y.toFixed(0)}px, ${b.toFixed(0)}px)`),{vx:y,vy:b,vw:_,vh:v,wide:u,W:c}},Re=t=>{let n=w.current,r=g;if(!n||!r||!h)return;let i=E.current,a=n.querySelector(`[data-lead="idle"]`),o=n.querySelector(`[data-dot="idle"]`),s=!!i&&(t.beat===`idle`||t.beat===`fly`),c=k.current;if(i&&(I!==String(M)||L!==i)){I=String(M),L=i;let e=Le(i,a,0,!0,o);c&&(c.style.left=e.wide?`auto`:`12px`,c.style.right=e.wide?`${(e.W-e.vx-e.vw+36).toFixed(0)}px`:`12px`,c.toggleAttribute(`data-narrow`,!e.wide),c.style.top=`${(e.vy+e.vh+4).toFixed(0)}px`,c.dataset.at=`1`)}else!i&&c&&c.dataset.at&&!Q.result&&(c.style.left=c.style.right=c.style.top=``,delete c.dataset.at,c.removeAttribute(`data-narrow`),I=``);i&&(i.style.opacity=s?`1`:`0`),a.style.opacity=o.style.opacity=s?`1`:`0`;let l=Q.result?r.lines.get(Q.target):void 0,u=!!l&&t.marks>0&&_===null,d=T.current,f=te.current,p=n.querySelector(`[data-line="pre"]`);if(!u){let e=(t.beat===`idle`||t.beat===`fly`)&&t.frameIdx>0;if(e&&j!==M){j=M,D=``;let e=Se(r.preSeg,r.geo.restK),t=``;for(let n=0;n<e.length;n+=2){let[i,a]=h.project(e[n],e[n+1],r.geo.restK-104);t+=`${n?`L`:`M`}${i.toFixed(1)} ${a.toFixed(1)}`}p.setAttribute(`d`,t)}n.style.opacity=`1`,p.style.opacity=e?`1`:`0`,n.dataset.only=`pre`,n.style.setProperty(`--a`,`0`),d&&(d.style.opacity=`0`),f&&(f.style.opacity=`0`),c?.style.setProperty(`--gone`,`0`);return}n.style.opacity=`1`,p.style.opacity=`1`,delete n.dataset.only,j=-1;let m=`${M}|${Q.target}|${Q.runId}`;if(m!==D){D=m;let t=r.geo.restK-104,i=e=>{let n=``;for(let r=0;r<e.length;r+=2){let[i,a]=h.project(e[r],e[r+1],t);n+=`${r?`L`:`M`}${i.toFixed(1)} ${a.toFixed(1)}`}return n};n.querySelector(`[data-line="pre"]`).setAttribute(`d`,i(l.pre)),n.querySelector(`[data-line="post"]`).setAttribute(`d`,i(l.post)),n.querySelector(`[data-line="glow"]`).setAttribute(`d`,i(l.post));let a=[];for(let e=l.post.length-2;e>=0;e-=2)a.push(l.post[e],l.post[e+1]);n.querySelector(`[data-band]`).setAttribute(`d`,`${i(l.pre)}${i(a).replace(`M`,`L`)}Z`);let o=e.clientWidth,s=o/e.clientHeight>1.25,c=0;for(let e=0;e<l.post.length;e+=2)l.post[e+1]>l.post[c+1]&&(c=e);let[u,p]=h.project(l.post[c],l.post[c+1],t),g=Math.min(o-(f?f.offsetWidth:190)-14,u+(s?56:24)),_=Math.max(12,Math.min(p-70,h.rect.y0-(f?f.offsetHeight:60)-6));n.querySelector(`[data-lead="rise"]`).setAttribute(`d`,`M${u.toFixed(1)} ${(p-5).toFixed(1)}L${(g-8).toFixed(1)} ${(_+14).toFixed(1)}`),f&&(f.style.transform=`translate(${g.toFixed(0)}px, ${_.toFixed(0)}px)`),Le(d,n.querySelector(`[data-lead="vent"]`),Q.target,!1)}let v=Z(t.marks/.6),y=Z((t.marks-.3)/.7);n.style.setProperty(`--a`,String(1-v)),n.style.setProperty(`--b`,String(1-y)),d&&(d.style.opacity=String(y)),f&&(f.style.opacity=String(y)),c?.style.setProperty(`--gone`,d?String(y):`0`)},ze=()=>{let t=g;if(!t||!h)return;let n=Ie(),r=n.frameIdx;for(;r>0&&!ke(r);)r--;let i=n.beat===`read`&&Q.live&&!Q.result&&Q.frontier<t.geo.k0&&!J&&!!K&&q>=t.geo.k0,a=n.cutK;i!==e.hasAttribute(`data-pre-read`)&&(e.toggleAttribute(`data-pre-read`,i),h.dirtyFace()),i&&(r=0,a=Math.max(t.geo.k0,Math.min(q,Y)));let o=0;U&&(o=_!==null||Q.running?0:1-Z((performance.now()-U)/_e),o<=0&&(U=0,e.removeAttribute(`data-intro`))),o>0&&n.beat===`idle`&&(a=t.geo.k0+(a-t.geo.k0)*H(Z((1-o)*1.5-.3)));let s=1-H(1-o),c=Math.max(0,Math.min(207,Math.round(a))),l=i?K:n.measured>0?Q.result?.post.seg??Q.liveSeg:null;h.paintFace({k:c,vol:t.vols[r],seg:l,preSeg:i?null:t.preSeg,map:n.map,measured:n.measured,growth:n.growth});let u=Q.t,f=_===null&&u>R.seal[0]&&u<z,p=H(Z((u-R.seal[0])/(R.seal[1]-R.seal[0]))),m=H(Z((u-R.compare[0])/650)),v=H(Z((u-R.read[0])/(R.read[1]-R.read[0]))),y=f?p*(1-m):0;h.draw({rise:r/4,ventIdx:r,cutK:a,measured:n.measured,growth:n.growth,time:X?0:performance.now()/1e3,scan:Math.max(y,.55*Math.sin(Math.PI*Z((1-o)*1.5-.3))*(o>0)),daz:y*(.26-.5*v)+s*.62,del:y*-.1+s*.16,dolly:y*(.05+.05*Math.sin(Math.PI*v))-s*.32}),Re(n);let b=C.current;if(b&&_===null){let e=String(Math.round(n.pos*100));b.value!==e&&(b.value=e)}let x=String(n.pos);B!==x&&(B=x,ee.current?.style.setProperty(`--pos`,x));let S=String(Math.round(Q.t));e.dataset.beat!==n.beat&&(e.dataset.beat=n.beat),e.dataset.frame!==String(r)&&(e.dataset.frame=String(r)),e.dataset.t!==S&&(e.dataset.t=S);let w=n.beat===`idle`&&n.pos===0;if(w!==ce&&(ce=w,pe(w)),b){let e=t.frames[Math.round(n.pos*4)],r=e.f===0?`Before flight`:e.f===1?`After flight, simulated`:`Flight ${Math.round(e.f*100)} percent, ${d.middleFrames}`;b.getAttribute(`aria-valuetext`)!==r&&b.setAttribute(`aria-valuetext`,r)}let T=ne.current;if(T){let e=Math.round(n.pos*4),r=(n.beat===`idle`||n.beat===`fly`)&&e>0?`we put in ${ye(t.frames[e].injectedVentricleChangePct)}`:``;T.textContent!==r&&(T.textContent=r)}let E=O.current;if(E){let e=``;if(n.beat===`read`){let n=t.geo.k1-t.geo.k0+1,r=`slice ${Math.max(1,Math.min(n,c-t.geo.k0+1))} of ${n}`;e=i?`pre-flight scan first: ${r}`:Q.live&&!Q.result&&Q.frontier<t.geo.k0&&!J?`loading the model`:`the AI is mapping ${r}`}else Q.running&&!ke(Q.target)&&(e=`loading the scan`);E.textContent!==e&&(E.textContent=e)}},Be=e=>{if(r=0,n)return;if(Q.running){let t=Math.min(64,Math.max(0,e-Q.last));Q.last=e,Q.t=Math.min(Q.t+t,Fe()),q>Y&&(Y=Math.min(q,Y+t*.09)),Q.result&&(X||Q.t>=z)&&(Q.t=z),Q.t>=R.compare[0]&&Pe(),Q.t>=z&&(Q.running=!1,Te(`result`))}let t=!X&&G&&!document.hidden;(!t||Q.running||_!==null||U||e-V>30)&&(V=e,ze()),(Q.running||t)&&(r=requestAnimationFrame(Be))};function $(){V=0,!r&&!n&&(r=requestAnimationFrame(Be))}let Ve=(e,t)=>{if(!g)return;window.clearTimeout(N);let r=++Q.runId;Object.assign(Q,{target:e,t,startT:t,result:null,fired:!1,frontier:g.geo.k0-1,liveSeg:null,live:De(),running:!0,last:performance.now()}),_=null,D=``,Y=g.geo.k0,F(null),ue(``),P(Q.live?`live`:`replay`),Te(`running`),Ae(e).catch(Ee);let i=g.frames[e].id,a=(t,i)=>{n||Q.runId!==r||Ae(e).then(()=>{n||Q.runId!==r||(je(e,t),Q.result=t,Q.live=i,P(i?`live`:`replay`),$())}).catch(Ee)},o=()=>u(i).then(e=>{e.kind===`flight`&&a(e,!1)});Q.live?Ne(e,r).then(e=>a(e,!0)).catch(e=>{if(console.warn(`[braindrift moment] live run failed, replaying stored outputs`,e),y=!0,Q.runId===r)return Q.live=!1,P(`replay`),o()}).catch(Ee):o().catch(Ee),$()},He=()=>{window.clearTimeout(N),Q.runId++,Object.assign(Q,{t:0,startT:0,running:!1,result:null,fired:!1,liveSeg:null}),_=null,F(null),P(``),ue(``),Te(`idle`),U&&(U=0,e.removeAttribute(`data-intro`)),$()},Ue=()=>{g&&((be?[Q.target,4]:[Q.target,4,2,1,3]).filter((e,t,n)=>e>0&&n.indexOf(e)===t).reduce((e,t)=>e.then(()=>Ae(t)).catch(()=>void 0),Promise.resolve()),De()&&Me().catch(()=>void 0))};W.current={enter:()=>{g&&(_===null?!Q.running&&Q.result&&Q.t>=z?Ve(Q.target,0):!Q.running&&Q.t===0&&Ve(Oe(A.current.sampleId),0):(window.clearTimeout(N),W.current.release()))},run:()=>Ve(Oe(A.current.sampleId),0),reset:He,runTo:e=>e<=0?He():Ve(e,0),touch:Ue,drag:e=>{if(!g)return;(Q.running||Q.result||Q.t>0)&&(Q.runId++,Object.assign(Q,{t:0,startT:0,running:!1,result:null,fired:!1,liveSeg:null}),F(null),P(``),Te(`idle`)),_=Z(e);let t=Math.round(_*4);t>0&&Ae(t).catch(()=>void 0),$()},release:()=>{if(_===null)return;let e=Math.round(_*4);e===0?He():Ve(e,X?R.fly[1]:xe(_,e/4))},step:e=>{if(!g)return;let t=_===null?Q.t>0?Q.target:0:Math.round(_*4),n=Math.max(0,Math.min(4,t+e));Ue(),W.current.drag(n/4),C.current&&(C.current.value=String(n*25)),window.clearTimeout(N),N=window.setTimeout(()=>W.current?.release(),550)},relabel:()=>{D=``,$()},retoken:()=>{h&&S.current&&(h.setTokens(we(S.current)),$())}};let We=()=>{if(!h)return;let t=e.clientWidth,n=e.clientHeight;if(t<2||n<2)return;let r=t/n>1.25,i=A.current.labels,a=!!ee.current,o=r?{top:Math.max(i?n<500?70:92:28,n*.08),bottom:a?124:Math.max(28,n*.08),left:i?Math.max(290,t*.14):t*.06,right:t*.06}:{top:i?110:28,bottom:(a?104:24)+(i?92:0),left:-20,right:-20};h.resize(t,n,Math.min(window.devicePixelRatio||1,be?1.5:2),o,!r&&i);let s=h.rect;e.style.setProperty(`--bx`,`${((s.x0+s.x1)/2).toFixed(0)}px`),e.style.setProperty(`--by`,`${((s.y0+s.y1)/2).toFixed(0)}px`),e.style.setProperty(`--bw`,`${(s.x1-s.x0).toFixed(0)}px`),e.style.setProperty(`--bh`,`${(s.y1-s.y0).toFixed(0)}px`),M++,D=``,ze()};(async()=>{try{h=new le(t)}catch(e){console.warn(`[braindrift moment] no WebGL`,e),de(!0),se(!0);return}h.setTokens(we(S.current));let r=await i(),o=r.flight.frames,[s,c,l,d]=await Promise.all([ie(f(r.flight.brainMesh)),ie(f(o[0].ventMesh)),a(o[0].volume),a(o[0].seg)]);if(n)return;let[_,v]=Ce(d);g={frames:o,vols:[l,null,null,null,null],vents:new Map([[0,c]]),loading:new Map([[0,Promise.resolve()]]),preSeg:d,geo:{k0:_,k1:v,restK:ge},lines:new Map},h.setShell(s),h.setVent(0,c),Q.target=Oe(A.current.sampleId);let y=m===void 0?p===`result`?z:null:m;if(y!==null&&y>0){let e=Q.target;await Ae(e);let t=null,r=!1;if(A.current.mode===`live`)try{t=await Ne(e,Q.runId),r=!0}catch(e){console.warn(`[braindrift moment] live run failed, replaying stored outputs`,e)}if(!t){let n=await u(o[e].id);n.kind===`flight`&&(t=n)}if(n||!t)return;je(e,t),Object.assign(Q,{result:t,t:y,startT:y,live:r}),P(r?`live`:`replay`),y>=R.compare[0]&&Pe(),Te(y>=z?`result`:`running`)}We(),p===void 0&&m===void 0&&!X&&(U=performance.now(),e.setAttribute(`data-intro`,``),$()),se(!0),y===null&&De()&&window.setTimeout(()=>!n&&Me().catch(()=>void 0),900)})().catch(Ee);let Ge=new ResizeObserver(()=>We());Ge.observe(e);let Ke=new IntersectionObserver(e=>{G=e[e.length-1].isIntersecting,G&&$()});Ke.observe(e);let qe=()=>!document.hidden&&$();document.addEventListener(`visibilitychange`,qe);let Je=matchMedia(`(prefers-color-scheme: dark)`),Ye=()=>W.current?.retoken();return Je.addEventListener(`change`,Ye),()=>{n=!0,cancelAnimationFrame(r),window.clearTimeout(N),Ge.disconnect(),Ke.disconnect(),document.removeEventListener(`visibilitychange`,qe),Je.removeEventListener(`change`,Ye),W.current=null,h?.dispose()}},[p,m,n,r,B]),(0,D.useEffect)(()=>{W.current?.retoken()},[v,y]),(0,D.useEffect)(()=>{W.current?.relabel()},[ce,h,M]);let K=ce?.r,q=K?!K.citedNumbers:!1;return(0,G.jsxs)(`div`,{ref:b,className:`bdm${v?` ${v}`:``}`,style:y,"data-ready":M?`1`:void 0,"data-state":j,"data-live":N||void 0,"data-measured":K&&K.measured.ventricleChangePct!==null?K.measured.ventricleChangePct.toFixed(2):void 0,children:[(0,G.jsx)(`span`,{ref:S,className:`bdm-probe`,"aria-hidden":`true`}),(0,G.jsxs)(`div`,{className:`bdm-atmo`,"aria-hidden":`true`,children:[(0,G.jsx)(`i`,{className:`bdm-orbit bdm-orbit-a`}),(0,G.jsx)(`i`,{className:`bdm-orbit bdm-orbit-b`}),(0,G.jsx)(`i`,{className:`bdm-floor`})]}),(0,G.jsxs)(`div`,{className:`bdm-hero`,"data-qa":`hero`,role:`img`,"aria-label":`A real brain MRI, cut open: the fluid spaces (ventricles) the model measured are drawn in colour`,children:[L?(0,G.jsx)(`img`,{className:`bdm-poster`,src:`./_posters/braindrift.jpg`,alt:``}):(0,G.jsx)(`canvas`,{ref:x,className:`bdm-canvas`}),L?(0,G.jsx)(`canvas`,{ref:x,hidden:!0}):null]}),(0,G.jsxs)(`svg`,{ref:w,className:`bdm-marks`,"aria-hidden":`true`,children:[(0,G.jsx)(`path`,{"data-band":!0,className:`bdm-band`}),(0,G.jsx)(`path`,{"data-line":`glow`,className:`bdm-line bdm-line-glow`,pathLength:1}),(0,G.jsx)(`path`,{"data-line":`pre`,className:`bdm-line bdm-line-pre`,pathLength:1}),(0,G.jsx)(`path`,{"data-line":`post`,className:`bdm-line bdm-line-post`,pathLength:1}),(0,G.jsx)(`path`,{"data-lead":`rise`,className:`bdm-lead${h?``:` bdm-off`}`,pathLength:1}),(0,G.jsx)(`path`,{"data-lead":`vent`,className:`bdm-lead${h?``:` bdm-off`}`,pathLength:1}),(0,G.jsx)(`path`,{"data-lead":`idle`,className:`bdm-lead-idle${h?``:` bdm-off`}`}),(0,G.jsx)(`circle`,{"data-dot":`idle`,r:2.5,className:`bdm-dot-idle${h?``:` bdm-off`}`})]}),h&&M&&!L&&j!==`error`?(0,G.jsx)(`div`,{ref:E,className:`bdm-label bdm-label-idle`,"aria-hidden":K?!0:void 0,children:`fluid spaces`}):null,h&&K?(0,G.jsxs)(G.Fragment,{children:[(0,G.jsxs)(`div`,{ref:T,className:`bdm-label bdm-label-vent`,children:[(0,G.jsx)(`span`,{className:`bdm-big`,children:Y(K.measured.ventricleChangePct)}),(0,G.jsxs)(`span`,{className:`bdm-cap`,children:[`fluid spaces, as the AI measured`,g&&N?(0,G.jsx)(`span`,{className:`bdm-tag`,title:N===`replay`?d.offlineReplay:`the model is running in this browser`,children:N===`live`?`LIVE`:`REPLAY`}):null]}),(0,G.jsxs)(`span`,{className:`bdm-sub`,children:[`we put in `,ye(K.injected.ventricleChangePct),q?`, for illustration`:`, the published figure`]}),(0,G.jsxs)(`span`,{className:`bdm-key`,children:[(0,G.jsx)(`i`,{"aria-hidden":`true`}),`fluid here now, not before`]})]}),(0,G.jsxs)(`div`,{ref:te,className:`bdm-label bdm-label-rise`,children:[(0,G.jsx)(`span`,{className:`bdm-mid`,children:X(K.measured.riseMm)}),(0,G.jsx)(`span`,{className:`bdm-cap`,children:`rise at the top of the brain`}),(0,G.jsxs)(`span`,{className:`bdm-sub`,children:[`we put in `,be(K.injected.riseMm)]})]})]}):null,(0,G.jsxs)(`div`,{ref:k,className:`bdm-status`,"aria-live":`polite`,children:[g&&N?(0,G.jsx)(`span`,{className:`bdm-tag`,title:N===`replay`?d.offlineReplay:`the model is running in this browser`,children:N===`live`?`LIVE`:`REPLAY`}):null,(0,G.jsx)(`span`,{ref:O,className:`bdm-status-text`}),!M&&j!==`error`?(0,G.jsx)(`span`,{className:`bdm-status-text`,children:`loading the scan`}):null]}),j===`error`?(0,G.jsxs)(`div`,{className:`bdm-error`,role:`alert`,children:[(0,G.jsx)(`p`,{children:`The scan did not load.`}),(0,G.jsx)(`p`,{className:`bdm-error-detail`,children:I}),(0,G.jsx)(`button`,{type:`button`,className:`bdm-btn`,onClick:()=>{ue(``),oe.current=`idle`,ae(`idle`),re.current.onState?.(`idle`),se(!1),V(e=>e+1)},children:`Try again`})]}):null,_?(0,G.jsxs)(`div`,{ref:ee,className:`bdm-flight`,"data-middle":j===`result`&&q&&!h?`1`:void 0,children:[(0,G.jsxs)(`div`,{className:`bdm-track`,children:[(0,G.jsx)(`span`,{className:`bdm-rail`}),(0,G.jsx)(`span`,{className:`bdm-fill`}),[0,1,2,3,4].map(e=>(0,G.jsx)(`span`,{className:`bdm-tick`,style:{"--i":e/4}},e)),(0,G.jsxs)(`span`,{className:`bdm-cue`,"data-on":M&&!L&&U&&j===`idle`?`1`:void 0,children:[(0,G.jsx)(`span`,{children:`Drag to after flight:`}),` `,(0,G.jsx)(`span`,{children:`the AI measures what changed.`})]}),(0,G.jsxs)(`span`,{className:`bdm-note`,children:[(0,G.jsx)(`span`,{ref:ne,className:`bdm-note-put`}),(0,G.jsx)(`span`,{className:`bdm-note-ill`,title:d.middleFrames,children:`illustration`})]}),(0,G.jsx)(`input`,{ref:C,className:`bdm-range`,type:`range`,min:0,max:100,step:1,defaultValue:0,disabled:!M||L,"data-qa":`primary`,"aria-label":`Flight. Drag from before flight to after flight; on release the model measures the brain.`,onPointerDown:()=>W.current?.touch(),onFocus:()=>W.current?.touch(),onInput:e=>W.current?.drag(Number(e.currentTarget.value)/100),onPointerUp:()=>W.current?.release(),onPointerCancel:()=>W.current?.release(),onMouseUp:()=>W.current?.release(),onTouchEnd:()=>W.current?.release(),onBlur:()=>W.current?.release(),onKeyDown:e=>{let t=e.key===`ArrowRight`||e.key===`ArrowUp`?1:e.key===`ArrowLeft`||e.key===`ArrowDown`?-1:e.key===`End`?4:e.key===`Home`?-4:0;t?(e.preventDefault(),W.current?.step(t)):(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),W.current?.enter())}})]}),(0,G.jsx)(`button`,{type:`button`,className:`bdm-end bdm-end-a`,disabled:!M||L||U&&j===`idle`,"data-here":M&&U&&j===`idle`?`1`:void 0,onClick:()=>{W.current?.reset(),C.current?.focus({preventScroll:!0})},children:`Before flight`}),(0,G.jsxs)(`button`,{type:`button`,className:`bdm-end bdm-end-b`,disabled:!M||L,onClick:()=>{W.current?.touch(),W.current?.runTo(4)},children:[`After flight`,g?(0,G.jsx)(`span`,{className:`bdm-tag`,title:d.flightFrame,children:d.simulationBadge}):null]})]}):null]})});export{W as n,Q as t};
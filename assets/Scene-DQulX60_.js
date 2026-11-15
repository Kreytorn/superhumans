import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,s as n}from"./index-D1FNPufX.js";import{a as r,i,r as a,t as o}from"./react-three-fiber.esm-CQEH9Es2.js";import{Et as s,Q as c,Tt as l,d as u,gt as d,ot as f,s as p,x as m}from"./three.module-D8PUL0DB.js";import{i as h,n as g,r as _,t as v}from"./dist-DmyJedy2.js";import{n as y}from"./S2-DqwqvDJa.js";function b(){return b=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},b.apply(null,arguments)}var x=e(n()),S=x.forwardRef(function({children:e,follow:t=!0,lockX:n=!1,lockY:r=!1,lockZ:i=!1,...o},s){let l=x.useRef(null),u=x.useRef(null),d=new c;return a(({camera:e})=>{if(!t||!u.current)return;let a=l.current.rotation.clone();u.current.updateMatrix(),u.current.updateWorldMatrix(!1,!1),u.current.getWorldQuaternion(d),e.getWorldQuaternion(l.current.quaternion).premultiply(d.invert()),n&&(l.current.rotation.x=a.x),r&&(l.current.rotation.y=a.y),i&&(l.current.rotation.z=a.z)}),x.useImperativeHandle(s,()=>u.current,[]),x.createElement(`group`,b({ref:u},o),x.createElement(`group`,{ref:l},e))}),C=(0,x.createContext)(null);function w({iterations:e=10,ms:t=250,threshold:n=.75,step:r=.1,factor:i=.5,flipflops:o=1/0,bounds:s=e=>e>100?[60,100]:[40,60],onIncline:c,onDecline:l,onChange:u,onFallback:d,children:f}){let[p,m]=(0,x.useState)(()=>({fps:0,index:0,factor:i,flipped:0,refreshrate:0,fallback:!1,frames:[],averages:[],subscriptions:new Map,subscribe:e=>{let t=Symbol();return p.subscriptions.set(t,e.current),()=>void p.subscriptions.delete(t)}})),h=0;return a(()=>{let{frames:i,averages:a}=p;if(!p.fallback&&a.length<e){i.push(performance.now());let f=i[i.length-1]-i[0];if(f>=t){if(p.fps=Math.round(i.length/f*1e3*1)/1,p.refreshrate=Math.max(p.refreshrate,p.fps),a[p.index++%e]=p.fps,a.length===e){let[t,i]=s(p.refreshrate),f=a.filter(e=>e>=i),m=a.filter(e=>e<t);f.length>e*n&&(p.factor=Math.min(1,p.factor+r),p.flipped++,c&&c(p),p.subscriptions.forEach(e=>e.onIncline&&e.onIncline(p))),m.length>e*n&&(p.factor=Math.max(0,p.factor-r),p.flipped++,l&&l(p),p.subscriptions.forEach(e=>e.onDecline&&e.onDecline(p))),h!==p.factor&&(h=p.factor,u&&u(p),p.subscriptions.forEach(e=>e.onChange&&e.onChange(p))),p.flipped>o&&!p.fallback&&(p.fallback=!0,d&&d(p),p.subscriptions.forEach(e=>e.onFallback&&e.onFallback(p))),p.averages=[]}p.frames=[]}}}),x.createElement(C.Provider,{value:p},f)}var T=t();function E(e,t){if(t>e[0][0]||t<e[e.length-1][0])return null;for(let n=0;n<e.length-1;n++){let r=e[n],i=e[n+1];if(t<=r[0]&&t>=i[0]){let e=(r[0]-t)/(r[0]-i[0]||1);return e=e*e*(3-2*e),r.slice(1).map((t,n)=>t+(i[n+1]-t)*e)}}return null}var D=48,O=.0195,k=(e,t,n)=>Math.exp(-(((e-t)/n)**2));function A(){let e=[];for(let t=.992;t>=-1;t-=O)e.push(t);let t=[],n=[],r=Math.PI/2;for(let e=.997;e>=.738;e-=O*.62){let t=(e-.868)/.13;if(Math.abs(t)>=1)continue;let i=Math.sqrt(1-t*t),a=t<0?1+t*.24:1;n.push({x:0,y:e,z:.01,rx:.094*i*a,rz:.112*i*(t<0?1+t*.1:1),f:t=>{let n=k(t,r,.5),i=k(t,r,.2);return .007*k(e,.905,.012)*n+-.007*k(e,.884,.011)*(k(t,r-.42,.2)+k(t,r+.42,.2))+.02*k(e,.852,.02)*k(t,r,.13)*(e<.875?1:.4)+.006*k(e,.818,.008)*k(t,r,.32)+.008*k(e,.778,.014)*i+.006*k(e,.865,.03)*(k(t,.05,.16)+k(t,Math.PI-.05,.16))}})}t.push(n);let i=[[.76,.05,.054],[.71,.056,.058],[.682,.13,.076],[.64,.208,.1],[.53,.196,.127],[.39,.156,.103],[.23,.18,.117],[.11,.186,.122],[.055,.15,.108]],a=[];for(let t of e){let e=E(i,t);e&&a.push({x:0,y:t,z:0,rx:e[0],rz:e[1],f:e=>.012*k(t,.53,.06)*(k(e,r-.5,.35)+k(e,r+.5,.35))+.006*k(t,.56,.07)*k(e,-r,.6)})}t.push(a);let o=[[.652,.232,.016,.026],[.612,.254,.05,.056],[.46,.283,.05,.053],[.335,.3,.04,.042],[.23,.314,.041,.04],[.085,.332,.027,.025],[.035,.337,.022,.024]],s=[[.035,.337,.021,.024,0],[0,.34,.019,.04,.004],[-.04,.342,.017,.042,.002],[-.085,.344,.014,.034,-.002],[-.125,.344,.009,.02,-.004],[-.14,.344,.003,.006,-.004]];for(let e of[-1,1]){let n=[];for(let t=.035;t>=-.14;t-=O*.55){let i=E(s,t);i&&n.push({x:e*i[0],y:t,z:i[3],rx:i[1],rz:i[2],f:n=>.016*k(t,-.02,.026)*k(n,r-e*.35,.3)})}t.push(n)}let c=[[.1,.097,.09,.106,0],[-.1,.098,.081,.092,0],[-.4,.089,.055,.06,0],[-.57,.087,.06,.067,-.008],[-.9,.08,.033,.039,0],[-.955,.082,.043,.082,.04],[-1,.083,.046,.106,.055]];for(let n of[-1,1]){let r=[],i=[];for(let t of e){let e=E(o,t);e&&r.push({x:n*e[0],y:t,z:0,rx:e[1],rz:e[2]});let a=E(c,t);a&&i.push({x:n*a[0],y:t,z:a[3],rx:a[1],rz:a[2]})}t.push(r,i)}return t}function j(){let e=A(),t=[],n=[],r=[],i=[];for(let a of e){let e=t.length/3;a.forEach((o,s)=>{for(let c=0;c<D;c++){let l=c/D*Math.PI*2,u=Math.cos(l),d=Math.sin(l),f=o.f?o.f(l):0;t.push(o.x+(o.rx+f)*u,o.y,o.z+(o.rz+f)*d);let p=u/Math.max(o.rx,.001),m=d/Math.max(o.rz,.001),h=Math.hypot(p,m)||1;n.push(p/h,0,m/h);let g=e+s*D+c,_=e+s*D+(c+1)%D;i.push(g,_),s<a.length-1&&c%6==0&&i.push(g,g+D),s<a.length-1&&r.push(g,_,g+D,_,_+D,g+D)}})}let a=e=>{let r=new p;return r.setAttribute(`position`,new m(t,3)),r.setAttribute(`normal`,new m(n,3)),r.setIndex(e),r};return{fill:a(r),lines:a(i)}}var M=`
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vY = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`,N=`
  uniform float uTime;
  uniform float uReveal;
  uniform float uDim;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float top = -1.05 + uReveal * 2.2;
    if (vY > top) discard;
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
    float facing = step(0.0, dot(vN, vV));
    float scanY = -1.1 + mod(uTime * 0.42, 3.4);
    float scan = smoothstep(0.16, 0.0, abs(vY - scanY));
    float edge = smoothstep(0.12, 0.0, top - vY) * (1.0 - step(0.999, uReveal));
    vec3 deep = vec3(0.16, 0.36, 1.0);
    vec3 ice = vec3(0.62, 0.86, 1.0);
    vec3 c = mix(deep, ice, f) * (0.16 + 0.95 * f) * mix(0.42, 1.0, facing);
    c += ice * scan * 0.55;
    c += vec3(0.9, 0.97, 1.0) * edge * 1.4;
    gl_FragColor = vec4(c * uDim, 1.0);
    #include <colorspace_fragment>
  }
`,P=`
  uniform float uReveal;
  uniform float uDim;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float top = -1.05 + uReveal * 2.2;
    if (vY > top) discard;
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    vec3 c = vec3(0.18, 0.42, 1.0) * f * 0.42;
    gl_FragColor = vec4(c * uDim, 1.0);
    #include <colorspace_fragment>
  }
`,F=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,I=`
  uniform sampler2D uTex;
  uniform vec4 uCrop;
  uniform float uInvert;
  uniform float uGain;
  uniform vec3 uHue;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    // a slight magnifier bulge, so the disc reads as glass and not as a sticker
    vec2 q = 0.5 + (vUv - 0.5) * (0.86 + 0.14 * r * r);
    vec2 uv = vec2(uCrop.x + q.x * uCrop.z, 1.0 - (uCrop.y + (1.0 - q.y) * uCrop.w));
    vec3 c = texture2D(uTex, uv).rgb;
    if (uInvert > 0.5) c = (1.0 - c) * vec3(0.72, 0.84, 1.0);
    c *= mix(0.32, 1.0, smoothstep(1.02, 0.3, r)) * uGain;
    c += uHue * smoothstep(0.86, 1.0, r) * 0.5;
    c += vec3(0.07) * smoothstep(0.8, 0.0, length(p - vec2(-0.42, 0.5)));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`,L=`
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`,R=`
  uniform vec3 uSun;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 5.0);
    float sun = exp(-pow(distance(vW.xy, uSun.xy) / 1.5, 2.0));
    vec3 c = vec3(0.004, 0.008, 0.02);
    c += vec3(0.12, 0.34, 1.0) * f * (0.5 + 1.2 * sun);
    c += vec3(1.0, 0.82, 0.62) * pow(f, 1.6) * sun * 1.5;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`,z=`
  uniform vec3 uSun;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    float d = max(0.0, -dot(normalize(vN), normalize(vV)));
    float i = pow(clamp(d / 0.3, 0.0, 1.0), 2.4);
    float sun = exp(-pow(distance(vW.xy, uSun.xy) / 1.7, 2.0));
    vec3 c = vec3(0.1, 0.32, 1.0) * i * (0.3 + 1.3 * sun);
    c += vec3(1.0, 0.78, 0.55) * pow(i, 3.0) * sun * 1.1;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;function B(e,t){let n=Math.cos(t),r=Math.sin(t);return[e[0]*n+e[2]*r,e[1],-e[0]*r+e[2]*n]}var V=.205;function H({check:e,wide:t,k:n,active:r,featured:o,reduced:c,labels:p,onActive:m,onOpen:h}){let g=i(d,e.img),_=(0,x.useRef)(null),v=(0,x.useRef)(null),y=(0,x.useRef)(null),b=(0,x.useMemo)(()=>{g.colorSpace=f,g.anisotropy=4;let[t,n,r]=e.crop;return{uTex:{value:g},uCrop:{value:new s(t,n,r,r*e.aspect)},uInvert:{value:+!!e.invert},uGain:{value:1},uHue:{value:new u(e.hue)}}},[g,e]),S=(0,x.useMemo)(()=>t?e.lens:[e.lens[0]*.63,e.lens[1]*.98+(e.lens[1]>.9?.1:0),e.lens[2]],[t,e]),C=t?V:.15,w=r===e.id,E=o===e.id,D=(0,x.useRef)(null),O=(0,x.useMemo)(()=>new l,[]),k=r!==null&&!w;return a((e,t)=>{let r=_.current;if(!r)return;let i=e.clock.elapsedTime;r.position.set(S[0],S[1]+Math.sin(i*.6+n*1.7)*.018,S[2]),D.current===null&&(D.current=i);let a=1-(1-(c?1:Math.min(1,Math.max(0,(i-D.current-.55-n*.13)/.6))))**3,o=(w?1.14:E?1.06:1)*Math.max(.001,a),s=r.scale.x+(o-r.scale.x)*Math.min(1,t*9);if(r.scale.setScalar(s),r.rotation.y=e.pointer.x*.22-S[0]*.1,r.rotation.x=-e.pointer.y*.16,v.current){let e=v.current.uniforms.uGain;e.value+=((k?.42:w||E?1.18:.92)-e.value)*Math.min(1,t*8)}y.current&&(y.current.opacity+=((w||E?1:k?.25:.55)-y.current.opacity)*Math.min(1,t*8));let l=p.current[n];if(l){O.set(0,-C*1.2,0),r.localToWorld(O).project(e.camera);let t=(O.x*.5+.5)*e.size.width,n=(-O.y*.5+.5)*e.size.height;l.style.transform=`translate3d(${t.toFixed(1)}px, ${n.toFixed(1)}px, 0) translateX(-50%)`}}),(0,T.jsxs)(`group`,{ref:_,position:S,scale:c?1:.001,children:[(0,T.jsxs)(`mesh`,{onPointerOver:t=>{t.stopPropagation(),m(e.id),document.body.style.cursor=`pointer`},onPointerOut:()=>{m(null),document.body.style.cursor=``},onClick:t=>{t.stopPropagation(),h(e.id)},children:[(0,T.jsx)(`circleGeometry`,{args:[C,72]}),(0,T.jsx)(`shaderMaterial`,{ref:v,vertexShader:F,fragmentShader:I,uniforms:b})]}),(0,T.jsxs)(`mesh`,{children:[(0,T.jsx)(`ringGeometry`,{args:[C*1,C*1.022,96]}),(0,T.jsx)(`meshBasicMaterial`,{ref:y,color:new u(e.hue).multiplyScalar(1.9),transparent:!0,opacity:.7,toneMapped:!1})]}),(0,T.jsxs)(`mesh`,{rotation:[0,0,n],children:[(0,T.jsx)(`ringGeometry`,{args:[C*1.13,C*1.137,96,1,0,Math.PI*1.25]}),(0,T.jsx)(`meshBasicMaterial`,{color:`#9fc2ff`,transparent:!0,opacity:.34,toneMapped:!1})]})]})}function U({active:e,featured:t,leaving:n,labels:i,onActive:o,onOpen:s,onSettled:c,reduced:d}){let{viewport:f,size:h,camera:g}=r(),_=h.width/h.height>1.15,v=(0,x.useMemo)(j,[]),b=(0,x.useRef)(null),C=(0,x.useRef)(null),w=(0,x.useRef)(null),E=(0,x.useRef)(!1),D=()=>({uTime:{value:0},uReveal:{value:+!!d},uDim:{value:1}}),O=(0,x.useMemo)(D,[d]),k=(0,x.useMemo)(D,[d]),A=(0,x.useRef)(null),F=(0,x.useRef)(null),I=(0,x.useMemo)(()=>({uSun:{value:new l(1.6,-1.2,0)}}),[]),U=(0,x.useMemo)(()=>{let e=new p;e.setAttribute(`position`,new m(new Float32Array(y.length*6),3));let t=new Float32Array(y.length*6);return y.forEach((e,n)=>{let r=new u(e.hue);t.set([r.r*1.5,r.g*1.5,r.b*1.5,r.r*.25,r.g*.25,r.b*.25],n*6)}),e.setAttribute(`color`,new m(t,3)),e},[]),W=(0,x.useMemo)(()=>{let e=new p;e.setAttribute(`position`,new m(new Float32Array(30),3));let t=new Float32Array(30);for(let e=0;e<5;e++)t.set([1.5,.9,1.3,0,0,0],e*6);return e.setAttribute(`color`,new m(t,3)),{g:e,seeds:Array.from({length:5},(e,t)=>{let n=-1.05-t*.37%.4;return{ox:-.1+t*1.93%2.7,oy:2.4+t*.71%1.2,z:-2.4+t*.83%1.8,dx:Math.cos(n),dy:Math.sin(n),speed:2.6+t*.57%1.6,phase:t*3.1,span:13+t*2.3%9}})}},[]),G=(0,x.useMemo)(()=>{let e=new Float32Array(330),t=7,n=()=>(t=t*16807%2147483647)/2147483647;for(let t=0;t<110;t++)e.set([(n()-.5)*11,(n()-.35)*5.2,-2-n()*5],t*3);let r=new p;return r.setAttribute(`position`,new m(e,3)),r},[]),K=(0,x.useRef)(0);return a((e,t)=>{let r=e.clock.elapsedTime;w.current===null&&(w.current=r);let i=r-w.current,a=d?1:Math.min(1,Math.max(0,(i-.15)/1.7));for(let e of[A.current,F.current])e&&(e.uniforms.uTime.value=d?1.2:r,e.uniforms.uReveal.value=a);!E.current&&(d||i>2.1)&&(E.current=!0,c());let o=_?f.width*.185:0;C.current&&(C.current.position.x=o);let s=d?.3:Math.sin(r*.22)*.42+e.pointer.x*.3;b.current&&(b.current.rotation.y=s);let l=U.attributes.position;y.forEach((e,t)=>{let n=B(e.spot,s),r=_?e.lens[0]:e.lens[0]*.63,i=_?e.lens[1]:e.lens[1]*.98+(e.lens[1]>.9?.1:0),a=(_?V:.15)*1.02,o=n[0]-r,c=n[1]-i,u=Math.hypot(o,c)||1;l.setXYZ(t*2,n[0],n[1],n[2]),l.setXYZ(t*2+1,r+o/u*a,i+c/u*a,e.lens[2])}),l.needsUpdate=!0;let u=W.g.attributes.position;W.seeds.forEach((e,t)=>{let n=d?3+t:(r*e.speed+e.phase)%e.span,i=e.ox+e.dx*n,a=e.oy+e.dy*n;u.setXYZ(t*2,i,a,e.z),u.setXYZ(t*2+1,i-e.dx*.55,a-e.dy*.55,e.z)}),u.needsUpdate=!0,K.current+=(+!!n-K.current)*Math.min(1,t*4.5);let p=n?y.find(e=>e.id===n):void 0,m=p?o+p.lens[0]*(_?1:.63):0,h=p?p.lens[1]:0,v=K.current,x=d?0:e.pointer.x*.16,S=d?0:e.pointer.y*.08;g.position.set(x*(1-v)+m*v,.04+S*(1-v)+h*v,5.9-v*3.6),g.lookAt(m*v,.02+h*v,0)}),(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(`color`,{attach:`background`,args:[`#02040a`]}),(0,T.jsx)(`points`,{geometry:G,children:(0,T.jsx)(`pointsMaterial`,{size:.022,color:`#9fb6e8`,transparent:!0,opacity:.5,sizeAttenuation:!0,depthWrite:!1})}),(0,T.jsxs)(`group`,{position:[.6,-8.62,-1.6],children:[(0,T.jsxs)(`mesh`,{children:[(0,T.jsx)(`sphereGeometry`,{args:[7.5,96,48]}),(0,T.jsx)(`shaderMaterial`,{vertexShader:L,fragmentShader:R,uniforms:I})]}),(0,T.jsxs)(`mesh`,{scale:1.045,children:[(0,T.jsx)(`sphereGeometry`,{args:[7.5,96,48]}),(0,T.jsx)(`shaderMaterial`,{vertexShader:L,fragmentShader:z,uniforms:I,side:1,transparent:!0,blending:2,depthWrite:!1})]})]}),(0,T.jsx)(`lineSegments`,{geometry:W.g,frustumCulled:!1,visible:!d,children:(0,T.jsx)(`lineBasicMaterial`,{vertexColors:!0,transparent:!0,opacity:.5,blending:2,depthWrite:!1,toneMapped:!1})}),(0,T.jsxs)(`group`,{ref:C,position:[0,_?-.06:-.02,0],children:[(0,T.jsxs)(`group`,{ref:b,children:[(0,T.jsx)(`mesh`,{geometry:v.fill,frustumCulled:!1,children:(0,T.jsx)(`shaderMaterial`,{ref:F,vertexShader:M,fragmentShader:P,uniforms:k,transparent:!0,blending:2,depthWrite:!1,side:2})}),(0,T.jsx)(`lineSegments`,{geometry:v.lines,frustumCulled:!1,children:(0,T.jsx)(`shaderMaterial`,{ref:A,vertexShader:M,fragmentShader:N,uniforms:O,transparent:!0,blending:2,depthWrite:!1})}),y.map(e=>(0,T.jsxs)(`group`,{position:e.spot,children:[(0,T.jsxs)(`mesh`,{children:[(0,T.jsx)(`sphereGeometry`,{args:[.017,16,12]}),(0,T.jsx)(`meshBasicMaterial`,{color:new u(e.hue).multiplyScalar(2.4),toneMapped:!1})]}),(0,T.jsxs)(S,{children:[(0,T.jsxs)(`mesh`,{scale:t===e.id?1.8:1,children:[(0,T.jsx)(`ringGeometry`,{args:[.034,.039,40]}),(0,T.jsx)(`meshBasicMaterial`,{color:new u(e.hue).multiplyScalar(1.5),transparent:!0,opacity:.85,toneMapped:!1,depthWrite:!1})]}),(0,T.jsxs)(`mesh`,{onPointerOver:t=>{t.stopPropagation(),o(e.id),document.body.style.cursor=`pointer`},onPointerOut:()=>{o(null),document.body.style.cursor=``},onClick:t=>{t.stopPropagation(),s(e.id)},children:[(0,T.jsx)(`circleGeometry`,{args:[.075,20]}),(0,T.jsx)(`meshBasicMaterial`,{transparent:!0,opacity:0,depthWrite:!1})]})]})]},e.id))]}),(0,T.jsxs)(`group`,{position:[0,-1.03,0],rotation:[-Math.PI/2,0,0],children:[(0,T.jsxs)(`mesh`,{children:[(0,T.jsx)(`ringGeometry`,{args:[.6,.607,128]}),(0,T.jsx)(`meshBasicMaterial`,{color:`#7fb2ff`,transparent:!0,opacity:.75,toneMapped:!1,depthWrite:!1,side:2})]}),(0,T.jsxs)(`mesh`,{children:[(0,T.jsx)(`ringGeometry`,{args:[.82,.824,128,1,.4,4.6]}),(0,T.jsx)(`meshBasicMaterial`,{color:`#5a86e0`,transparent:!0,opacity:.4,toneMapped:!1,depthWrite:!1,side:2})]}),(0,T.jsxs)(`mesh`,{children:[(0,T.jsx)(`circleGeometry`,{args:[.6,64]}),(0,T.jsx)(`meshBasicMaterial`,{color:`#1d3f9a`,transparent:!0,opacity:.16,blending:2,depthWrite:!1,side:2})]})]}),(0,T.jsx)(`lineSegments`,{geometry:U,frustumCulled:!1,children:(0,T.jsx)(`lineBasicMaterial`,{vertexColors:!0,transparent:!0,opacity:.8,blending:2,depthWrite:!1,toneMapped:!1})}),y.map((n,r)=>(0,T.jsx)(H,{check:n,wide:_,k:r,active:e,featured:t,reduced:d,labels:i,onActive:o,onOpen:s},n.id))]})]})}function W(){try{let e=document.createElement(`canvas`);return!!(e.getContext(`webgl2`)||e.getContext(`webgl`))}catch{return!1}}function G(e){let[t,n]=(0,x.useState)(()=>Math.min(1.5,window.devicePixelRatio||1));return(0,x.useEffect)(()=>()=>void(document.body.style.cursor=``),[]),(0,T.jsxs)(o,{className:`s2-canvas`,flat:!0,dpr:t,camera:{fov:28,position:[0,.04,5.9],near:.1,far:60},gl:{antialias:!1,powerPreference:`high-performance`,alpha:!1},children:[(0,T.jsx)(w,{onDecline:()=>n(1)}),(0,T.jsx)(U,{...e}),(0,T.jsxs)(g,{multisampling:4,children:[(0,T.jsx)(v,{mipmapBlur:!0,intensity:.95,luminanceThreshold:.42,luminanceSmoothing:.3,radius:.72}),(0,T.jsx)(_,{opacity:.045}),(0,T.jsx)(h,{eskil:!1,offset:.22,darkness:.72})]})]})}export{G as default,W as hasWebGL};
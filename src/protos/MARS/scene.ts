// MARS "Mission to Mars": the whole scene in plain three.js. Sun at the origin, Earth and Mars on their orbits
// (sizes enlarged, distances compressed, so both read in one shot), the transfer path between them and our ship on it.
// Planet surfaces are painted once by a shader into textures at start-up, so each frame costs three texture reads.
import * as THREE from 'three'

export const STOP_S = [0.145, 0.255, 0.375, 0.505, 0.648, 0.79]

const DEG = Math.PI / 180
const PHI0 = 80 * DEG
const PHI1 = 0 * DEG
const R0 = 100
const R1 = 152
const EARTH_R = 13
const MARS_R = 6.9
const SHIP_START = 0.105
const SHIP_END = 0.95
const LOOP_S = 70 // seconds for one Earth-to-Mars run on the home screen

function pathPoint(s: number, out: THREE.Vector3) {
  const phi = PHI0 + (PHI1 - PHI0) * s
  const e = s * s * (3 - 2 * s)
  const r = R0 + (R1 - R0) * (0.3 * s + 0.7 * e)
  return out.set(Math.cos(phi) * r, 0, Math.sin(phi) * r)
}

const NOISE = /* glsl */ `
float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<6;i++){ s += a*noise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= 0.5; } return s; }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<3;i++){ s += a*noise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= 0.5; } return s*1.14; }
float ridged(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*(1.0-abs(noise(p)*2.0-1.0)); p = p*2.1 + vec3(4.1); a *= 0.5; } return s; }
`

const QUAD_VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const SPHERE_DIR = /* glsl */ `
vec3 dirOf(vec2 uv){ float lon = uv.x*6.28318530718; float lat = (uv.y-0.5)*3.14159265; return vec3(cos(lat)*cos(lon), sin(lat), cos(lat)*sin(lon)); }
`

// Earth surface: rgb = colour (stored as square root), a = open water
const EARTH_A = /* glsl */ `
varying vec2 vUv; ${NOISE} ${SPHERE_DIR}
void main(){
  vec3 p = dirOf(vUv);
  float h = fbm(p*1.7 + vec3(2.3,0.0,5.1)) + 0.34*fbm(p*5.3 + 11.0) - 0.17;
  float land = smoothstep(0.535, 0.56, h);
  float lat = abs(p.y);
  float dry = fbm(p*3.1 + 40.0) + (0.32 - abs(lat-0.32))*0.6;
  vec3 forest = vec3(0.035,0.10,0.035), desert = vec3(0.40,0.29,0.16), tundra = vec3(0.17,0.16,0.12);
  vec3 landc = mix(forest, desert, smoothstep(0.50, 0.72, dry));
  landc = mix(landc, tundra, smoothstep(0.55, 0.78, lat));
  landc *= 0.55 + 0.9*ridged(p*9.0)*0.7;
  vec3 ocean = mix(vec3(0.004,0.025,0.085), vec3(0.012,0.085,0.17), smoothstep(0.42, 0.535, h));
  vec3 col = mix(ocean, landc, land);
  float ice = smoothstep(0.86, 0.92, lat + 0.09*fbm(p*8.0));
  col = mix(col, vec3(0.82,0.88,0.93), ice);
  gl_FragColor = vec4(sqrt(col), (1.0-land)*(1.0-ice));
}`
// Earth extras: r = clouds, g = city lights
const EARTH_B = /* glsl */ `
varying vec2 vUv; ${NOISE} ${SPHERE_DIR}
void main(){
  vec3 p = dirOf(vUv);
  vec3 w = vec3(fbm(p*2.2+1.0), fbm(p*2.2+5.2), fbm(p*2.2+9.4));
  float c = fbm(p*3.0 + 2.4*w);
  float band = 0.10*cos(p.y*9.0);
  c = smoothstep(0.50, 0.80, c + band + 0.16*fbm(p*14.0) - 0.08);
  c *= 0.78 + 0.22*fbm(p*26.0);
  float h = fbm(p*1.7 + vec3(2.3,0.0,5.1)) + 0.34*fbm(p*5.3 + 11.0) - 0.17;
  float land = smoothstep(0.535, 0.56, h) * (1.0 - smoothstep(0.62, 0.75, abs(p.y)));
  float coast = 1.0 - smoothstep(0.56, 0.66, h);
  float city = land * (0.35 + 0.65*coast) * smoothstep(0.50, 0.66, fbm(p*6.0+3.0)) * smoothstep(0.56, 0.95, noise(p*96.0)*0.55 + noise(p*44.0)*0.55);
  gl_FragColor = vec4(c, city, 0.0, 1.0);
}`
const MARS_A = /* glsl */ `
varying vec2 vUv; ${NOISE} ${SPHERE_DIR}
void main(){
  vec3 p = dirOf(vUv);
  float h = fbm(p*1.6 + vec3(7.0,1.0,3.0));
  float d = fbm(p*4.2 + 2.0*h + 20.0);
  vec3 rust = vec3(0.56,0.23,0.09), dust = vec3(0.80,0.48,0.26), dark = vec3(0.17,0.085,0.055);
  vec3 col = mix(rust, dust, smoothstep(0.38, 0.68, d));
  float mare = smoothstep(0.50, 0.62, h + 0.25*(d-0.5)) * (1.0 - smoothstep(0.35, 0.8, abs(p.y+0.15)));
  col = mix(col, dark, mare*0.82);
  col *= 0.72 + 0.5*ridged(p*11.0)*0.75;
  float canyon = smoothstep(0.035, 0.0, abs(p.y + 0.12 + 0.07*sin(p.x*5.0) + 0.05*fbm(p*6.0)-0.03)) * smoothstep(0.2, 0.6, fbm(p*2.0+3.0));
  col *= 1.0 - 0.45*canyon;
  float ice = smoothstep(0.90, 0.94, abs(p.y) + 0.05*fbm(p*10.0));
  col = mix(col, vec3(0.90,0.86,0.82), ice);
  gl_FragColor = vec4(sqrt(col), 1.0);
}`

const PLANET_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`

const EARTH_FS = /* glsl */ `
uniform sampler2D uA; uniform sampler2D uB; uniform float uTime; uniform vec3 uLean;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 L = normalize(normalize(-vW) + uLean); vec3 V = normalize(cameraPosition - vW);
  vec4 a = texture2D(uA, vUv); vec3 col = a.rgb*a.rgb;
  float cl = texture2D(uB, vec2(vUv.x + uTime*0.0011, vUv.y)).r;
  float clShadow = texture2D(uB, vec2(vUv.x + uTime*0.0011 + 0.004, vUv.y)).r;
  float city = texture2D(uB, vUv).g;
  float ndl = dot(n, L);
  float diff = max(ndl, 0.0);
  float wrap = smoothstep(-0.2, 0.25, ndl);
  vec3 sunset = mix(vec3(1.0,0.42,0.18), vec3(1.0), smoothstep(-0.04, 0.17, ndl));
  float spec = (pow(max(dot(reflect(-L, n), V), 0.0), 55.0)*2.4 + pow(max(dot(reflect(-L, n), V), 0.0), 9.0)*0.22) * a.a * (1.0-cl);
  vec3 surf = col*diff*1.5*(1.0-0.45*clShadow) + vec3(1.0,0.88,0.7)*spec*diff;
  vec3 lit = mix(surf, vec3(1.0)*(0.7 + 0.45*cl)*diff*1.15, smoothstep(0.0, 0.75, cl)*0.96) * sunset;
  float fr = pow(1.0 - max(dot(n, V), 0.0), 3.6);
  lit += vec3(0.16,0.42,1.0)*fr*wrap*0.85 + vec3(0.05,0.14,0.36)*wrap*0.08;
  lit += vec3(1.0,0.45,0.2)*fr*smoothstep(-0.25,-0.02,ndl)*smoothstep(0.18,-0.02,ndl)*0.55;
  vec3 night = vec3(1.0,0.72,0.40)*city*0.8*(1.0-wrap)*(1.0-cl*0.85) + col*0.0025 + vec3(0.0,0.003,0.010)*fr;
  gl_FragColor = vec4(pow(lit + night, vec3(0.4545)), 1.0);
}`
const MARS_FS = /* glsl */ `
uniform sampler2D uA;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 L = normalize(-vW); vec3 V = normalize(cameraPosition - vW);
  vec4 a = texture2D(uA, vUv); vec3 col = a.rgb*a.rgb;
  float ndl = dot(n, L);
  float diff = pow(max(ndl, 0.0), 0.82);
  float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  float wrap = smoothstep(-0.1, 0.2, ndl);
  vec3 lit = col*diff*1.7 + vec3(0.95,0.58,0.36)*fr*wrap*0.42;
  gl_FragColor = vec4(pow(lit + col*0.004, vec3(0.4545)), 1.0);
}`
// thin air seen edge-on: a slightly larger shell, added over the limb on the sunlit side
const AIR_FS = /* glsl */ `
uniform vec3 uTint; uniform float uPow; uniform float uGain; uniform vec3 uLean;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN); vec3 L = normalize(normalize(-vW) + uLean); vec3 V = normalize(cameraPosition - vW);
  float rim = 1.0 - max(dot(n, V), 0.0);
  float a = pow(rim, uPow) * smoothstep(1.0, 0.86, rim);
  float sun = smoothstep(-0.38, 0.35, dot(n, L));
  gl_FragColor = vec4(uTint*a*sun*uGain, 1.0);
}`

const SKY_FS = /* glsl */ `
varying vec3 vDir; ${NOISE}
vec3 starLayer(vec3 d, float scale, float density, float size){
  vec3 p = d*scale; vec3 i = floor(p); vec3 f = fract(p);
  float h = hash(i);
  if (h > density) return vec3(0.0);
  vec3 c = vec3(hash(i+1.3), hash(i+2.7), hash(i+4.1))*0.6 + 0.2;
  float dist = length(f - c);
  float b = pow(hash(i+7.7), 7.0)*1.8 + 0.07;
  vec3 tint = mix(vec3(1.0,0.80,0.62), vec3(0.68,0.80,1.0), hash(i+9.1));
  return tint * b * smoothstep(size, 0.0, dist);
}
void main(){
  vec3 d = normalize(vDir);
  vec3 bn = normalize(vec3(0.42, 0.86, -0.28));
  float bd = dot(d, bn)*3.4;
  float band = exp(-bd*bd);
  vec3 col = vec3(0.0006,0.0008,0.0016);
  float lanes = 0.5;
  if (band > 0.03) {
    float dust = fbm3(d*5.0 + 3.0);
    lanes = smoothstep(0.38, 0.62, fbm3(d*9.0 + 20.0));
    col += band * band * smoothstep(0.34, 0.8, dust) * mix(vec3(0.008,0.006,0.005), vec3(0.004,0.006,0.013), dust) * (0.25 + 0.75*lanes);
  }
  float dens = 0.035 + 0.24*band*(0.4 + 0.6*lanes);
  col += starLayer(d, 95.0, dens*0.5, 0.11);
  col += starLayer(d, 230.0, dens, 0.16)*0.55;
  col += starLayer(d, 34.0, 0.05 + 0.05*band, 0.042)*2.4;
  gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);
}`

const SUN_VS = /* glsl */ `
uniform float uSize; varying vec2 vP;
void main(){ vP = position.xy; vec4 mv = viewMatrix*vec4(0.0,0.0,0.0,1.0); mv.xy += position.xy*uSize; gl_Position = projectionMatrix*mv; }`
const SUN_FS = /* glsl */ `
varying vec2 vP; uniform float uGain;
void main(){
  float r = length(vP);
  float ang = atan(vP.y, vP.x);
  float core = smoothstep(0.020, 0.011, r);
  float halo = exp(-r*26.0)*1.6 + 0.010/(r*r*40.0 + 0.012) + exp(-r*4.5)*0.10;
  float rays = pow(abs(cos(ang*3.0 + 0.4)), 140.0)*exp(-r*9.0)*0.42 + pow(abs(cos(ang*3.0 + 1.25)), 90.0)*exp(-r*22.0)*0.22;
  float streak = exp(-abs(vP.y)*150.0)*exp(-abs(vP.x)*2.6)*0.55;
  float fade = smoothstep(1.0, 0.25, r);
  vec3 col = vec3(1.0,0.97,0.9)*core*3.0 + vec3(1.0,0.80,0.56)*halo*0.42 + vec3(1.0,0.86,0.68)*rays + vec3(0.72,0.82,1.0)*streak;
  gl_FragColor = vec4(col*fade*uGain, 1.0);
}`

const PATH_VS = /* glsl */ `
uniform vec2 uRes; uniform float uWidth;
attribute vec3 aNext; attribute float aSide; attribute float aU;
varying float vU; varying float vSide;
void main(){
  vec4 c = projectionMatrix*viewMatrix*vec4(position,1.0);
  vec4 nx = projectionMatrix*viewMatrix*vec4(aNext,1.0);
  vec2 dir = (nx.xy*c.w - c.xy*nx.w)*uRes;
  dir = normalize(dir + vec2(1e-6, 0.0));
  vec2 nrm = vec2(-dir.y, dir.x);
  c.xy += nrm*aSide*uWidth/uRes*c.w;
  gl_Position = c; vU = aU; vSide = aSide;
}`
const PATH_FS = /* glsl */ `
uniform float uShip; uniform float uFade; uniform float uTime;
varying float vU; varying float vSide;
void main(){
  float a = smoothstep(0.0, 0.7, 1.0 - abs(vSide));
  float done = step(vU, uShip);
  float dash = step(0.42, fract(vU*120.0 - uTime*0.22));
  float trail = 0.34 + 0.66*exp(-max(uShip - vU, 0.0)*7.0);
  vec3 col = mix(vec3(0.62,0.74,1.0), vec3(1.0,0.84,0.62), done);
  float alpha = a*mix(0.40*dash, 0.95*trail, done);
  alpha *= smoothstep(0.094, 0.112, vU)*smoothstep(0.962, 0.948, vU)*uFade;
  gl_FragColor = vec4(col*alpha, 1.0);
}`

const DOT_VS = /* glsl */ `
uniform vec2 uRes; uniform float uPx; varying vec2 vP;
void main(){ vP = position.xy; vec4 c = projectionMatrix*viewMatrix*modelMatrix*vec4(0.0,0.0,0.0,1.0); c.xy += position.xy*uPx/uRes*c.w; gl_Position = c; }`
const DOT_FS = /* glsl */ `
varying vec2 vP; uniform float uGain; uniform vec3 uTint;
void main(){
  float r = length(vP);
  float g = exp(-r*9.0)*1.3 + 0.03/(r*r*30.0+0.03)*smoothstep(1.0,0.2,r);
  float cross = (exp(-abs(vP.y)*60.0)*exp(-abs(vP.x)*4.0) + exp(-abs(vP.x)*60.0)*exp(-abs(vP.y)*6.0))*0.5;
  gl_FragColor = vec4((uTint*g + vec3(1.0)*cross)*uGain*smoothstep(1.0,0.6,r), 1.0);
}`

function bake(renderer: THREE.WebGLRenderer, fs: string, w: number, h: number) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
  })
  rt.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const mat = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, depthTest: false, depthWrite: false })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  quad.frustumCulled = false
  const sc = new THREE.Scene()
  sc.add(quad)
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  renderer.setRenderTarget(rt)
  renderer.render(sc, cam)
  renderer.setRenderTarget(null)
  mat.dispose()
  quad.geometry.dispose()
  return rt
}

function buildShip() {
  const g = new THREE.Group()
  const hull = new THREE.MeshStandardMaterial({ color: 0xd8d6cf, metalness: 0.35, roughness: 0.5 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.6, roughness: 0.45 })
  const gold = new THREE.MeshStandardMaterial({ color: 0xc79a3e, metalness: 0.9, roughness: 0.35 })
  const panel = new THREE.MeshStandardMaterial({ color: 0x14285e, metalness: 0.85, roughness: 0.28, emissive: 0x050a1c })
  const rad = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, metalness: 0.1, roughness: 0.7 })
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rz = 0, rx = 0) => {
    const mesh = new THREE.Mesh(geo, m)
    mesh.position.set(x, y, z)
    mesh.rotation.set(rx, 0, rz)
    g.add(mesh)
    return mesh
  }
  const H = Math.PI / 2
  // the long axis is x (direction of travel is +x)
  add(new THREE.CylinderGeometry(0.105, 0.105, 0.42, 28), hull, 0.3, 0, 0, H) // habitat
  add(new THREE.SphereGeometry(0.105, 24, 16), hull, 0.51, 0, 0)
  add(new THREE.CylinderGeometry(0.108, 0.108, 0.03, 28), dark, 0.2, 0, 0, H)
  add(new THREE.CylinderGeometry(0.108, 0.108, 0.03, 28), dark, 0.4, 0, 0, H)
  add(new THREE.CylinderGeometry(0.05, 0.075, 0.12, 20), gold, 0.03, 0, 0, H) // node
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 12), dark, -0.33, 0, 0, H) // truss
  for (const x of [-0.14, -0.3, -0.46]) add(new THREE.TorusGeometry(0.045, 0.006, 6, 18), dark, x, 0, 0, 0, 0).rotation.y = H
  add(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 24), gold, -0.66, 0, 0, H) // tank
  add(new THREE.SphereGeometry(0.085, 20, 12), gold, -0.56, 0, 0)
  add(new THREE.CylinderGeometry(0.035, 0.09, 0.1, 20, 1, true), dark, -0.81, 0, 0, -H) // engine bell
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.012, 0.012, 0.16), dark, -0.3, 0, s * 0.1)
    add(new THREE.BoxGeometry(0.2, 0.006, 0.56), panel, -0.3, 0, s * 0.46)
    add(new THREE.BoxGeometry(0.006, 0.01, 0.56), rad, -0.3, 0.004, s * 0.46)
    add(new THREE.BoxGeometry(0.1, 0.26, 0.005), rad, -0.5, s * 0.17, 0) // radiators
  }
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), dark, 0.36, 0.17, 0)
  add(new THREE.SphereGeometry(0.035, 14, 10, 0, Math.PI * 2, 0, H), rad, 0.36, 0.25, 0) // dish
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }))
  lamp.position.set(0.62, 0, 0)
  g.add(lamp)
  return g
}

export interface MarsSceneCallbacks {
  /** every drawn frame: screen x, y and a visible flag for the six stops, then Earth, Mars and the ship; [27], [28] = Earth and Mars radius in px; w = 0 home .. 1 at a stop */
  onFrame(pts: Float32Array, w: number): void
  /** the camera has come to rest: at a stop (index) or back home (null) */
  onSettle(stop: number | null): void
  onFirstFrame(): void
}
export interface MarsScene {
  flyTo(stop: number | null, instant?: boolean): void
  pointer(nx: number, ny: number): void
  dispose(): void
}

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

export function createScene(canvas: HTMLCanvasElement, cb: MarsSceneCallbacks): MarsScene | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const touch = matchMedia('(pointer: coarse)').matches
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const maxDpr = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2)
  let dpr = maxDpr
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x010205, 1)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1.6, 0.08, 4000)

  // ---- textures painted once
  const earthA = bake(renderer, EARTH_A, 2048, 1024)
  const earthB = bake(renderer, EARTH_B, 2048, 1024)
  const marsA = bake(renderer, MARS_A, 1024, 512)

  // ---- sky
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2000, 32, 20),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }`,
      fragmentShader: SKY_FS,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  sky.renderOrder = -10
  scene.add(sky)

  // ---- planets
  const earthLean = new THREE.Vector3(49.11 - 17.36, 80.46, 183.53 - 98.48).normalize().multiplyScalar(0.62)
  const earthPos = pathPoint(0, new THREE.Vector3())
  const marsPos = pathPoint(1, new THREE.Vector3())
  const uTime = { value: 0 }
  const sphere = new THREE.SphereGeometry(1, 96, 64)
  const earth = new THREE.Mesh(
    sphere,
    new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: EARTH_FS, uniforms: { uA: { value: earthA.texture }, uB: { value: earthB.texture }, uTime, uLean: { value: earthLean } } }),
  )
  earth.position.copy(earthPos)
  earth.scale.setScalar(EARTH_R)
  earth.rotation.set(-0.62, 2.2, 0.16)
  scene.add(earth)
  const airMat = (tint: [number, number, number], pow: number, gain: number, lean = new THREE.Vector3()) =>
    new THREE.ShaderMaterial({
      vertexShader: PLANET_VS,
      fragmentShader: AIR_FS,
      uniforms: { uTint: { value: new THREE.Vector3(...tint) }, uPow: { value: pow }, uGain: { value: gain }, uLean: { value: lean } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  const earthAir = new THREE.Mesh(sphere, airMat([0.2, 0.48, 1.0], 4.5, 2.6, earthLean))
  earthAir.position.copy(earthPos)
  earthAir.scale.setScalar(EARTH_R * 1.028)
  scene.add(earthAir)

  const mars = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: MARS_FS, uniforms: { uA: { value: marsA.texture } } }))
  mars.position.copy(marsPos)
  mars.scale.setScalar(MARS_R)
  mars.rotation.set(0.44, 0.6, -0.1)
  scene.add(mars)
  const marsAir = new THREE.Mesh(sphere, airMat([0.95, 0.56, 0.34], 4.5, 0.7))
  marsAir.position.copy(marsPos)
  marsAir.scale.setScalar(MARS_R * 1.02)
  scene.add(marsAir)

  // ---- the Sun: a glare card that always faces the lens
  const sunMat = new THREE.ShaderMaterial({
    vertexShader: SUN_VS,
    fragmentShader: SUN_FS,
    uniforms: { uSize: { value: 95 }, uGain: { value: 1 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sunMat)
  sun.frustumCulled = false
  sun.renderOrder = 5
  scene.add(sun)

  // ---- the transfer path: a ribbon of constant width on screen
  const N = 320
  const pos = new Float32Array((N + 1) * 2 * 3)
  const nxt = new Float32Array((N + 1) * 2 * 3)
  const side = new Float32Array((N + 1) * 2)
  const uu = new Float32Array((N + 1) * 2)
  const idx: number[] = []
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let i = 0; i <= N; i++) {
    const s = i / N
    pathPoint(s, a)
    if (i < N) pathPoint((i + 1) / N, b)
    else b.copy(a).multiplyScalar(2).sub(pathPoint((N - 1) / N, new THREE.Vector3()))
    for (let k = 0; k < 2; k++) {
      const o = (i * 2 + k) * 3
      pos[o] = a.x
      pos[o + 1] = a.y
      pos[o + 2] = a.z
      nxt[o] = b.x
      nxt[o + 1] = b.y
      nxt[o + 2] = b.z
      side[i * 2 + k] = k ? 1 : -1
      uu[i * 2 + k] = s
    }
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const pathGeo = new THREE.BufferGeometry()
  pathGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  pathGeo.setAttribute('aNext', new THREE.BufferAttribute(nxt, 3))
  pathGeo.setAttribute('aSide', new THREE.BufferAttribute(side, 1))
  pathGeo.setAttribute('aU', new THREE.BufferAttribute(uu, 1))
  pathGeo.setIndex(idx)
  const pathMat = new THREE.ShaderMaterial({
    vertexShader: PATH_VS,
    fragmentShader: PATH_FS,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: 1.6 * dpr }, uShip: { value: SHIP_START }, uFade: { value: 1 }, uTime },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const pathMesh = new THREE.Mesh(pathGeo, pathMat)
  pathMesh.frustumCulled = false
  scene.add(pathMesh)

  // ---- the ship: a model for the close shots, a point of light for the wide one
  const ship = buildShip()
  scene.add(ship)
  const sunLight = new THREE.DirectionalLight(0xfff1dc, 3.4)
  scene.add(sunLight, sunLight.target)
  scene.add(new THREE.AmbientLight(0x35486e, 0.3))
  const fill = new THREE.DirectionalLight(0xa9bcff, 0.85)
  scene.add(fill, fill.target)
  const dotMat = new THREE.ShaderMaterial({
    vertexShader: DOT_VS,
    fragmentShader: DOT_FS,
    uniforms: { uRes: pathMat.uniforms.uRes, uPx: { value: 60 * dpr }, uGain: { value: 1 }, uTint: { value: new THREE.Vector3(1, 0.9, 0.74) } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })
  const dot = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dotMat)
  dot.frustumCulled = false
  dot.renderOrder = 6
  scene.add(dot)

  // ---- a cosmic ray, frozen mid-flight through the hull (deep-space stop only)
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xff9fd6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const rayGlow = new THREE.MeshBasicMaterial({ color: 0xff4fb0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const ray = new THREE.Group()
  ray.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 60, 6, 1, true), rayMat))
  ray.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 60, 8, 1, true), rayGlow))
  scene.add(ray)

  // ---- camera rig
  const OFF = [
    new THREE.Vector3(5.6, 2.6, 1.5),
    new THREE.Vector3(5.9, 2.9, 1.4),
    new THREE.Vector3(6.1, 3.0, 1.7),
    new THREE.Vector3(-6.2, 2.6, 1.6),
    new THREE.Vector3(-5.9, 3.0, 1.3),
    new THREE.Vector3(-6.0, 1.7, -0.15), // arrival: Mars fills the frame behind the ship
  ]
  const cur = { a: 0, w: 0, off: OFF[0].clone(), ray: 0 }
  let tween: { fa: number; fw: number; foff: THREE.Vector3; ta: number; tw: number; toff: THREE.Vector3; fs: number; ts: number; t0: number; dur: number; stop: number | null } | null = null
  let atStop: number | null = null
  let shipS = 0.2
  let W = 1
  let H = 1
  let portrait = false
  const homePos = new THREE.Vector3()
  const homeTarget = new THREE.Vector3()
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 }

  const P = new THREE.Vector3()
  const P2 = new THREE.Vector3()
  const T = new THREE.Vector3()
  const R = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  const frameAt = (s: number) => {
    const s0 = Math.min(s, 0.997)
    pathPoint(s0, P)
    pathPoint(s0 + 0.003, P2)
    T.copy(P2).sub(P).normalize()
    R.set(P.x, 0, P.z).normalize()
  }

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    W = Math.max(1, Math.round(r.width))
    H = Math.max(1, Math.round(r.height))
    dpr = Math.max(1, Math.min(maxDpr, Math.sqrt(3.6e6 / (W * H)))) // keep the drawn pixels within what a laptop chip handles
    renderer.setPixelRatio(dpr)
    renderer.setSize(W, H, false)
    pathMat.uniforms.uWidth.value = 1.6 * dpr
    const aspect = W / H
    portrait = aspect < 1
    camera.aspect = aspect
    pathMat.uniforms.uRes.value.set(W * dpr, H * dpr)
    if (portrait) {
      homePos.set(40.26, 118.42, 172.06)
      homeTarget.set(71.59, 1.17, 35.73)
    } else {
      homePos.set(49.11, 80.46, 183.53)
      homeTarget.set(66.85, -23.21, 24.97)
    }
    dirty = true
  }

  const camPos = new THREE.Vector3()
  const camTgt = new THREE.Vector3()
  const close = new THREE.Vector3()
  const shipPos = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const pts = new Float32Array(10 * 3)
  const project = (v: THREE.Vector3, i: number) => {
    tmp.copy(v).project(camera)
    pts[i * 3] = (tmp.x * 0.5 + 0.5) * W
    pts[i * 3 + 1] = (-tmp.y * 0.5 + 0.5) * H
    pts[i * 3 + 2] = tmp.z < 1 && tmp.z > -1 ? 1 : 0
  }

  let raf = 0
  let last = performance.now()
  let time = 0
  let dirty = true
  let first = true
  let disposed = false

  const draw = (now: number) => {
    raf = 0
    if (disposed) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    // --- tween
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur)
      const e = ease(k)
      cur.a = tween.fa + (tween.ta - tween.fa) * e
      cur.w = tween.fw + (tween.tw - tween.fw) * e
      cur.off.lerpVectors(tween.foff, tween.toff, e)
      shipS = tween.fs + (tween.ts - tween.fs) * ease(Math.min(1, k * 1.25))
      if (k >= 1) {
        const stop = tween.stop
        tween = null
        atStop = stop
        cb.onSettle(stop)
      }
    }
    const moving = tween !== null
    const running = atStop === null // time runs only on the way home and at home
    if (running && !moving) {
      time += dt
      shipS += dt * ((SHIP_END - SHIP_START) / LOOP_S)
      if (shipS > SHIP_END) shipS = SHIP_START
    } else if (running) time += dt
    cur.ray += ((atStop === 4 || tween?.stop === 4 ? 1 : 0) - cur.ray) * Math.min(1, dt * 3)

    // --- ship
    frameAt(shipS)
    shipPos.copy(P)
    ship.position.copy(P)
    tmp.copy(P).add(T)
    ship.up.copy(UP)
    ship.lookAt(tmp)
    ship.rotateY(-Math.PI / 2) // model's long axis is x
    ship.rotateX(0.35 + time * 0.05)
    sunLight.position.set(0, 0, 0)
    sunLight.target.position.copy(P)
    fill.target.position.copy(P)
    dot.position.copy(P)
    ray.position.copy(P).addScaledVector(T, 0.28)
    ray.rotation.set(0.5, 0.2, 1.05)
    rayMat.opacity = cur.ray * 0.95
    rayGlow.opacity = cur.ray * 0.22
    ray.visible = cur.ray > 0.01

    // --- camera
    ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 2.5)
    ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 2.5)
    const sway = reduce ? 0 : 1
    camPos.copy(homePos)
    camPos.x += (Math.sin(time * 0.11) * 2.2 + ptr.sx * 4.0) * sway
    camPos.y += (Math.cos(time * 0.083) * 1.1 - ptr.sy * 2.2) * sway
    camTgt.copy(homeTarget)
    frameAt(cur.a)
    close.copy(P).addScaledVector(T, cur.off.x).addScaledVector(R, cur.off.y).addScaledVector(UP, cur.off.z)
    camPos.lerp(close, cur.w)
    camTgt.lerp(shipPos, cur.w)
    camera.position.copy(camPos)
    fill.position.copy(camPos).addScaledVector(UP, 3)
    camera.up.copy(UP)
    camera.lookAt(camTgt)
    if (portrait) camera.rotateZ(-0.62 * (1 - cur.w)) // no up in space: tilt the frame so the path climbs the tall screen
    const baseFov = portrait ? Math.min(92, (2 * Math.atan(0.335 / camera.aspect)) / DEG) : camera.aspect >= 1.6 ? 35.7 : (2 * Math.atan(0.5153 / camera.aspect)) / DEG
    const closeFov = portrait ? 46 : 34
    camera.fov = baseFov + (closeFov - baseFov) * cur.w
    const sx = portrait ? 0.5 : 0.165
    const sy = portrait ? 0.105 : 0.235
    if (cur.w > 0.0005) camera.setViewOffset(W, H, (0.5 - sx) * W * cur.w, (0.5 - sy) * H * cur.w, W, H)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    sky.position.copy(camPos)

    const dShip = camPos.distanceTo(shipPos)
    dotMat.uniforms.uGain.value = THREE.MathUtils.smoothstep(dShip, 5, 40) * 1.0 + 0.0
    dotMat.uniforms.uPx.value = (portrait ? 40 : 60) * dpr
    pathMat.uniforms.uShip.value = shipS
    uTime.value = time
    earth.rotation.y = 4.1 + time * 0.004

    renderer.render(scene, camera)

    for (let i = 0; i < 6; i++) {
      pathPoint(STOP_S[i], tmp)
      project(P2.copy(tmp), i)
    }
    project(P2.copy(earthPos), 6)
    project(P2.copy(marsPos), 7)
    project(P2.copy(shipPos), 8)
    const pxPerUnit = H / 2 / Math.tan((camera.fov * DEG) / 2)
    pts[27] = (EARTH_R / Math.max(1, camPos.distanceTo(earthPos))) * pxPerUnit
    pts[28] = (MARS_R / Math.max(1, camPos.distanceTo(marsPos))) * pxPerUnit
    cb.onFrame(pts, cur.w)
    if (first) {
      first = false
      cb.onFirstFrame()
    }
    schedule()
  }

  // Draw while something moves; once the camera rests at a stop, time is stopped and so is the drawing.
  const schedule = () => {
    if (raf || disposed || document.hidden) return
    const rayDone = atStop === 4 ? cur.ray > 0.98 : cur.ray < 0.02
    if (atStop !== null && !tween && !dirty && rayDone) return
    dirty = false
    raf = requestAnimationFrame(draw)
  }
  const kick = () => {
    dirty = true
    last = performance.now()
    schedule()
  }

  const ro = new ResizeObserver(() => {
    resize()
    kick()
  })
  ro.observe(canvas)
  const onVis = () => {
    if (!document.hidden) kick()
  }
  document.addEventListener('visibilitychange', onVis)
  resize()
  kick()

  return {
    flyTo(stop, instant) {
      const from = atStop
      const to = stop
      if (tween && tween.stop === to) return // already on the way there
      if (!tween && from === to && (to !== null || cur.w === 0)) {
        cb.onSettle(to)
        return
      }
      const ta = to === null ? 0 : STOP_S[to]
      const tw = to === null ? 0 : 1
      const toff = to === null ? cur.off.clone() : OFF[to]
      const far = Math.abs(ta - cur.a)
      const dur = instant ? 1 : reduce ? 1100 : to === null ? 2200 : cur.w > 0.5 ? 1700 + far * 1400 : 2500 + far * 900
      tween = { fa: cur.w < 0.01 ? 0 : cur.a, fw: cur.w, foff: cur.w < 0.01 ? toff.clone() : cur.off.clone(), ta, tw, toff: toff.clone(), fs: shipS, ts: to === null ? shipS : STOP_S[to], t0: performance.now(), dur, stop: to }
      atStop = to === null ? null : atStop
      if (to !== null && from === null) atStop = null
      kick()
    },
    pointer(nx, ny) {
      ptr.x = nx
      ptr.y = ny
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      earthA.dispose()
      earthB.dispose()
      marsA.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose()
      })
      renderer.dispose()
    },
  }
}

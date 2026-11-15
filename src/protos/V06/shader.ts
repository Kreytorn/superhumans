// One full-screen fragment shader for the whole zoom: a warm floating person (signed-distance body, re-posed weightless
// from the old mockup's figure), the ship around them with its great round window, and a planet's lit curve in km.
export const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0., 1.); }`

export const FRAG = `#version 300 es
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
}`

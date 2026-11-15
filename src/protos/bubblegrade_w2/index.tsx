// BubbleGrade, free version w2 ("the listening wall"): the real Doppler clip drawn as a turning record,
// surrounded by the real recordings, the story of the bends and the work behind the check.
// Everything that reads as a result comes from app/src/engine/bubblegrade (analyze / replay / act).
import '@fontsource-variable/big-shoulders'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as bubble from '../../engine/bubblegrade'
import evaPhoto from './assets/eva_b.jpg'

type Phase = 'idle' | 'loading' | 'running' | 'result'
type Res = bubble.BubbleResult
interface Props {
  view: string
  params: URLSearchParams
}

const SENTENCE = 'After a spacewalk, it listens to the heart and grades the gas bubbles that cause the bends.'
const TWO_PI = Math.PI * 2
const SWEEP0 = ((-90 + 10) * Math.PI) / 180
const SWEEP = (340 * Math.PI) / 180
const R_IN = 0.47
const R_OUT = 0.775
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

type Stop = [number, number, number, number]
const COOL: Stop[] = [
  [0, 3, 12, 20],
  [0.45, 22, 92, 124],
  [0.78, 110, 214, 246],
  [1, 236, 251, 255],
]
const HOT: Stop[] = [
  [0, 26, 9, 3],
  [0.45, 176, 78, 22],
  [0.78, 255, 143, 58],
  [1, 255, 236, 200],
]
function ramp(stops: Stop[], n: number, out: number[]) {
  let i = 1
  while (i < stops.length - 1 && n > stops[i][0]) i++
  const a = stops[i - 1]
  const b = stops[i]
  const f = clamp((n - a[0]) / (b[0] - a[0]))
  out[0] = a[1] + (b[1] - a[1]) * f
  out[1] = a[2] + (b[2] - a[2]) * f
  out[2] = a[3] + (b[3] - a[3]) * f
}
const tone = (v: number) => {
  const n = clamp((v + 2.2) / 5.2)
  return n * n * (3 - 2 * n)
}

/** The record: the spectrogram the model read, bent into a ring. Low pitch inside, time clockwise. */
function buildDisc(res: Res, px: number) {
  const sp = res.spectrogram
  if (!sp) return null
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = c.height = px
    return c
  }
  const dim = mk()
  const lit = mk()
  const dctx = dim.getContext('2d')!
  const lctx = lit.getContext('2d')!
  const di = dctx.createImageData(px, px)
  const li = lctx.createImageData(px, px)
  const R = px / 2
  const r0 = R * R_IN
  const r1 = R * R_OUT
  const bm = res.bubbleMap.values
  const step = res.bubbleMap.stepS
  const c1 = [0, 0, 0]
  const c2 = [0, 0, 0]
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const dx = x + 0.5 - R
      const dy = y + 0.5 - R
      const r = Math.hypot(dx, dy)
      if (r < r0 - 1 || r > r1 + 1) continue
      let a = Math.atan2(dy, dx) - SWEEP0
      a = ((a % TWO_PI) + TWO_PI) % TWO_PI
      if (a > SWEEP) continue
      const t = (a / SWEEP) * res.durS
      const col = Math.min(sp.cols - 1, Math.floor(t / sp.frameHopS))
      const band = clamp(Math.floor(((r - r0) / (r1 - r0)) * sp.rows), 0, sp.rows - 1)
      const n = tone(sp.data[band * sp.cols + col])
      const b = clamp(bm[Math.min(bm.length - 1, Math.floor(t / step))] * 1.05)
      const edge = clamp(Math.min(r - r0 + 1, r1 + 1 - r))
      ramp(COOL, n, c1)
      ramp(HOT, n, c2)
      const o = (y * px + x) * 4
      li.data[o] = c1[0] + (c2[0] - c1[0]) * b
      li.data[o + 1] = c1[1] + (c2[1] - c1[1]) * b
      li.data[o + 2] = c1[2] + (c2[2] - c1[2]) * b
      li.data[o + 3] = 255 * edge
      const g = c1[0] * 0.3 + c1[1] * 0.5 + c1[2] * 0.2
      di.data[o] = g * 0.42 + c1[0] * 0.1
      di.data[o + 1] = g * 0.5 + c1[1] * 0.12
      di.data[o + 2] = g * 0.62 + c1[2] * 0.14
      di.data[o + 3] = 255 * edge
    }
  }
  dctx.putImageData(di, 0, 0)
  lctx.putImageData(li, 0, 0)
  return { dim, lit }
}

/** A straight strip of the same picture, for the tiles and the wall. */
function Strip({ res, tint = true, className }: { res: Res | undefined; tint?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const sp = res?.spectrogram
    if (!cv || !res || !sp) return
    const w = Math.min(1400, Math.max(120, Math.round(cv.clientWidth * Math.min(2, window.devicePixelRatio || 1))))
    const h = Math.max(40, Math.round(cv.clientHeight * Math.min(2, window.devicePixelRatio || 1)))
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')!
    const img = ctx.createImageData(w, h)
    const bm = res.bubbleMap.values
    const c1 = [0, 0, 0]
    const c2 = [0, 0, 0]
    for (let x = 0; x < w; x++) {
      const f = x / w
      const col = Math.min(sp.cols - 1, Math.floor(f * sp.cols))
      const b = tint ? clamp(bm[Math.min(bm.length - 1, Math.floor(f * bm.length))] * 1.05) : 0
      for (let y = 0; y < h; y++) {
        const band = clamp(Math.floor((1 - (y + 0.5) / h) * sp.rows), 0, sp.rows - 1)
        const n = tone(sp.data[band * sp.cols + col])
        ramp(COOL, n, c1)
        ramp(HOT, n, c2)
        const o = (y * w + x) * 4
        img.data[o] = c1[0] + (c2[0] - c1[0]) * b
        img.data[o + 1] = c1[1] + (c2[1] - c1[1]) * b
        img.data[o + 2] = c1[2] + (c2[2] - c1[2]) * b
        img.data[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [res, tint])
  return <canvas ref={ref} className={className} aria-hidden="true" />
}

const SEV_CLASS: Record<string, string> = { nominal: 'ok', caution: 'amber', warning: 'red', critical: 'crit' }
const whoWord = (who: string) =>
  who.startsWith('self') ? 'You' : who.startsWith('crew medical') ? 'Crew medical officer' : who.startsWith('flight') ? 'Flight surgeon' : who
const tierShort = (name: string) => name.replace(/^\d\s+\w+:\s*/, '').replace(/\s*\(.*\)$/, '')

interface Meta {
  n_clips: number
  n_divers: number
  headline: { alert_auroc: number; alert_auroc_ci: [number, number]; qwk: number; sens_tau: number; spec_tau: number }
  floors: Record<'duration' | 'loudness' | 'nuisance', { alert_auroc: number }>
  L7: { n: number; n_alert: number }
}
interface Dive {
  nClips: number
  points: { minutesAfterSurfacing: number; technicianGrade: number; E: number }[]
}

export default function BubbleGradeW2({ params }: Props) {
  const pinned = params.get('state')
  const [samples, setSamples] = useState<bubble.BubbleSample[]>([])
  const [stored, setStored] = useState<Record<string, Res>>({})
  const [sel, setSel] = useState(params.get('sample') || 'grade-3')
  const [result, setResult] = useState<Res | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [heard, setHeard] = useState(0)
  const [loadPct, setLoadPct] = useState<number | null>(null)
  const [crew, setCrew] = useState<bubble.CrewInputs>({})
  const [meta, setMeta] = useState<Meta | null>(null)
  const [dive, setDive] = useState<Dive | null>(null)
  const [ready, setReady] = useState(false)

  const discRef = useRef<HTMLCanvasElement>(null)
  const scopeRef = useRef<HTMLCanvasElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const layersRef = useRef<{ dim: HTMLCanvasElement; lit: HTMLCanvasElement } | null>(null)
  const waveRef = useRef<Float32Array | null>(null)
  const envRef = useRef<Float32Array | null>(null)
  const tRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')
  const silentRef = useRef(false)
  const busyRef = useRef(false)
  const autoRan = useRef(false)

  const shown: Res | undefined = result ?? stored[sel]
  const shownRef = useRef<Res | undefined>(shown)
  shownRef.current = shown
  phaseRef.current = phase
  const sample = samples.find((s) => s.id === sel)

  // ---- data: the six stored results (pictures for the wall), headline numbers, the dive curve ----
  useEffect(() => {
    let off = false
    bubble.listSamples().then(async (list) => {
      if (off) return
      setSamples(list)
      const first = await bubble.replay(sel)
      if (off) return
      setStored((s) => ({ ...s, [sel]: first }))
      for (const s of list) {
        if (s.id === sel) continue
        const r = await bubble.replay(s.id)
        if (off) return
        setStored((m) => ({ ...m, [s.id]: r }))
      }
    })
    fetch(bubble.assetUrl('bubblegrade/meta.json'))
      .then((r) => r.json())
      .then((m: Meta) => !off && setMeta(m))
      .catch(() => {})
    fetch(bubble.assetUrl('bubblegrade/dive_curve.json'))
      .then((r) => r.json())
      .then((d: Dive) => !off && setDive(d))
      .catch(() => {})
    return () => {
      off = true
      audioRef.current?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- the real waveform of the chosen clip (drawn only; no sound until a press) ----
  useEffect(() => {
    if (!sample) return
    let off = false
    waveRef.current = null
    envRef.current = null
    fetch(bubble.assetUrl(sample.audio))
      .then((r) => r.arrayBuffer())
      .then((buf) => bubble.decodeAudio(buf))
      .then(({ wave }) => {
        if (off) return
        waveRef.current = wave
        const N = 540
        const env = new Float32Array(N)
        const per = Math.floor(wave.length / N)
        let top = 1e-6
        for (let i = 0; i < N; i++) {
          let m = 0
          for (let j = i * per; j < (i + 1) * per; j += 4) m = Math.max(m, Math.abs(wave[j]))
          env[i] = m
          top = Math.max(top, m)
        }
        for (let i = 0; i < N; i++) env[i] /= top
        envRef.current = env
        draw()
      })
      .catch(() => {})
    return () => {
      off = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample?.id])

  // ---- drawing ----
  const draw = useCallback((scopeOnly?: boolean) => {
    const res = shownRef.current
    const cv = discRef.current
    const layers = layersRef.current
    const t = tRef.current
    const ph = phaseRef.current
    if (!scopeOnly && cv && res && layers) {
      const ctx = cv.getContext('2d')!
      const px = cv.width
      const R = px / 2
      const k = px / 600
      const dur = res.durS
      const f = clamp(t / dur)
      const ang = SWEEP0 + f * SWEEP
      const angOf = (s: number) => SWEEP0 + clamp(s / dur) * SWEEP
      ctx.clearRect(0, 0, px, px)
      ctx.globalAlpha = ph === 'idle' || ph === 'loading' ? 0.92 : 0.6
      ctx.drawImage(layers.dim, 0, 0, px, px)
      ctx.globalAlpha = 1
      if (f > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(R, R)
        ctx.arc(R, R, R, SWEEP0, ang)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(layers.lit, 0, 0, px, px)
        ctx.restore()
      }
      // hairline rings
      ctx.lineWidth = 1 * k
      ctx.strokeStyle = 'rgba(160,220,240,0.22)'
      for (const rr of [R_IN - 0.012, R_OUT + 0.012, 0.915]) {
        ctx.beginPath()
        ctx.arc(R, R, R * rr, 0, TWO_PI)
        ctx.stroke()
      }
      // outer ridge: the model's bubble map, revealed as the playhead passes
      const bm = res.bubbleMap.values
      const step = res.bubbleMap.stepS
      ctx.lineCap = 'butt'
      ctx.lineWidth = Math.max(1.4 * k, ((R * 0.84 * SWEEP) / bm.length) * 0.72)
      for (let i = 0; i < bm.length; i++) {
        const tk = i * step
        if (tk > dur) break
        const on = tk <= t
        const v = bm[i]
        const a = angOf(tk + step / 2)
        const ra = R * 0.8
        const rb = R * (0.8 + 0.008 + 0.1 * v)
        ctx.strokeStyle = on ? `rgba(255,${150 + Math.round(70 * v)},${70 + Math.round(90 * v)},${0.35 + 0.65 * v})` : 'rgba(150,200,220,0.10)'
        ctx.beginPath()
        ctx.moveTo(R + Math.cos(a) * ra, R + Math.sin(a) * ra)
        ctx.lineTo(R + Math.cos(a) * (on ? rb : R * 0.812), R + Math.sin(a) * (on ? rb : R * 0.812))
        ctx.stroke()
      }
      // inner ring: the clip's real waveform envelope
      const env = envRef.current
      if (env) {
        ctx.lineWidth = 1.3 * k
        for (let i = 0; i < env.length; i++) {
          const fi = (i + 0.5) / env.length
          const a = SWEEP0 + fi * SWEEP
          const amp = R * (0.004 + 0.027 * env[i])
          ctx.strokeStyle = fi <= f ? 'rgba(196,238,250,0.85)' : 'rgba(150,205,225,0.24)'
          ctx.beginPath()
          ctx.moveTo(R + Math.cos(a) * (R * 0.418 - amp), R + Math.sin(a) * (R * 0.418 - amp))
          ctx.lineTo(R + Math.cos(a) * (R * 0.418 + amp), R + Math.sin(a) * (R * 0.418 + amp))
          ctx.stroke()
        }
      }
      // seconds
      ctx.font = `${Math.round(11 * k)}px "Geist Mono Variable", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let s = 0; s <= Math.floor(dur); s++) {
        const a = angOf(s)
        const big = s % 5 === 0
        ctx.strokeStyle = big ? 'rgba(226,246,252,0.8)' : 'rgba(160,215,235,0.35)'
        ctx.lineWidth = (big ? 1.4 : 1) * k
        ctx.beginPath()
        ctx.moveTo(R + Math.cos(a) * R * 0.925, R + Math.sin(a) * R * 0.925)
        ctx.lineTo(R + Math.cos(a) * R * (big ? 0.95 : 0.938), R + Math.sin(a) * R * (big ? 0.95 : 0.938))
        ctx.stroke()
        if (big) {
          ctx.fillStyle = 'rgba(200,232,244,0.78)'
          ctx.fillText(`${s} s`, R + Math.cos(a) * R * 0.978, R + Math.sin(a) * R * 0.978)
        }
      }
      // playhead and the five seconds the model is hearing
      if (ph === 'running') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2 * k
        ctx.beginPath()
        ctx.arc(R, R, R * 0.915, angOf(Math.max(0, t - 5)), ang)
        ctx.stroke()
        ctx.save()
        ctx.shadowColor = 'rgba(140,230,255,0.95)'
        ctx.shadowBlur = 18 * k
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2 * k
        ctx.beginPath()
        ctx.moveTo(R + Math.cos(ang) * R * 0.355, R + Math.sin(ang) * R * 0.355)
        ctx.lineTo(R + Math.cos(ang) * R * 0.955, R + Math.sin(ang) * R * 0.955)
        ctx.stroke()
        ctx.restore()
      }
    }
    // scope: 60 ms of the real signal at the playhead; the whole clip's envelope when still
    const sc = scopeRef.current
    if (sc) {
      const ctx = sc.getContext('2d')!
      const w = sc.width
      const h = sc.height
      ctx.clearRect(0, 0, w, h)
      const wave = waveRef.current
      const env = envRef.current
      if (wave) {
        const ts = ph === 'running' ? t : ((performance.now() / 1000) * 0.16) % Math.max(0.2, wave.length / 16000 - 0.1)
        const i0 = Math.max(0, Math.floor(ts * 16000) - 480)
        const n = 960
        let top = 0.02
        for (let i = 0; i < n; i++) top = Math.max(top, Math.abs(wave[i0 + i] || 0))
        ctx.save()
        ctx.shadowColor = 'rgba(120,225,255,0.9)'
        ctx.shadowBlur = 10
        ctx.strokeStyle = ph === 'running' ? '#eafaff' : 'rgba(170,225,242,0.8)'
        ctx.lineWidth = Math.max(1.5, h / 70)
        ctx.beginPath()
        for (let i = 0; i < n; i += 2) {
          const x = (i / n) * w
          const y = h / 2 - ((wave[i0 + i] || 0) / top) * h * 0.42
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      } else if (env) {
        const f = ph === 'result' ? 1 : 0
        const bw = w / env.length
        for (let i = 0; i < env.length; i++) {
          const a = env[i] * h * 0.44 + 1
          ctx.fillStyle = f ? 'rgba(200,240,252,0.85)' : 'rgba(150,205,225,0.42)'
          ctx.fillRect(i * bw, h / 2 - a, Math.max(1, bw * 0.7), a * 2)
        }
      }
    }
    if (clockRef.current && res) {
      clockRef.current.textContent = `${t.toFixed(1).padStart(4, '0')} / ${res.durS.toFixed(1)} s`
    }
  }, [])

  // rebuild the record when the picture changes or the box resizes
  useEffect(() => {
    const cv = discRef.current
    if (!cv || !shown) return
    const build = () => {
      const css = cv.clientWidth || 600
      const px = Math.round(Math.min(1240, css * Math.min(2, window.devicePixelRatio || 1)))
      if (cv.width !== px) cv.width = cv.height = px
      layersRef.current = buildDisc(shown, px)
      const sc = scopeRef.current
      if (sc) {
        sc.width = Math.round(sc.clientWidth * Math.min(2, window.devicePixelRatio || 1))
        sc.height = Math.round(sc.clientHeight * Math.min(2, window.devicePixelRatio || 1))
      }
      draw()
      if (!pinned || pinned === 'idle') setReady(true)
    }
    build()
    const ro = new ResizeObserver(() => build())
    ro.observe(cv)
    return () => ro.disconnect()
  }, [shown, draw, pinned])

  // ---- the clock: the audio element when there is sound, a silent clock otherwise ----
  useEffect(() => {
    if (phase !== 'running') return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const res = shownRef.current
      if (!res) return
      const a = audioRef.current
      const dt = (now - last) / 1000
      last = now
      if (!silentRef.current && a && !a.paused) tRef.current = Math.min(res.durS, a.currentTime)
      else if (silentRef.current) tRef.current = Math.min(res.durS, tRef.current + dt * 2.6)
      const t = tRef.current
      let n = 0
      for (const w of res.windows) if (w.t1 <= t + 0.02) n++
      setHeard((h) => (h === n ? h : n))
      draw()
      if (t >= res.durS - 0.03 || (a && a.ended && !silentRef.current)) {
        tRef.current = res.durS
        setHeard(res.windows.length)
        phaseRef.current = 'result'
        setPhase('result')
        draw()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, draw])

  useEffect(() => {
    if (phase === 'running') return
    let raf = 0
    const loop = () => {
      draw(true)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, draw])

  useEffect(() => {
    draw()
    if (phase === 'result' && pinned === 'result' && samples.length && Object.keys(stored).length >= samples.length) setReady(true)
  }, [phase, draw, pinned, samples, stored])

  // laptops: open the model quietly once the page is idle, so the press starts at once
  useEffect(() => {
    if (!ready || pinned || window.matchMedia('(max-width: 640px)').matches) return
    const id = window.setTimeout(() => void bubble.load().catch(() => {}), 1500)
    return () => window.clearTimeout(id)
  }, [ready, pinned])

  const getResult = useCallback(async (id: string, stored = false): Promise<Res> => {
    const phone = window.matchMedia('(max-width: 640px)').matches
    if (!phone && !stored) {
      try {
        const live = await Promise.race([
          (async () => {
            await bubble.load((p) => setLoadPct(p.total ? p.loaded / p.total : null))
            return bubble.analyze(id)
          })(),
          new Promise<null>((ok) => setTimeout(() => ok(null), 24000)),
        ])
        if (live) return live
      } catch {
        /* fall through to the stored outputs */
      }
    }
    return bubble.replay(id)
  }, [])

  const run = useCallback(
    async (id: string, sound: boolean) => {
      if (busyRef.current) return
      const smp = samples.find((s) => s.id === id)
      if (!smp) return
      busyRef.current = true
      audioRef.current?.pause()
      tRef.current = 0
      setHeard(0)
      setResult(null)
      setPhase('loading')
      let a: HTMLAudioElement | null = null
      if (sound) {
        a = audioRef.current ?? new Audio()
        audioRef.current = a
        a.src = bubble.assetUrl(smp.audio)
        a.preload = 'auto'
        a.load()
      }
      const res = await getResult(id, !sound && !!pinned)
      setLoadPct(null)
      setResult(res)
      shownRef.current = res
      busyRef.current = false
      if (!sound || !a) {
        tRef.current = res.durS
        setHeard(res.windows.length)
        setPhase('result')
        return
      }
      silentRef.current = false
      try {
        a.currentTime = 0
        await a.play()
      } catch {
        silentRef.current = true
      }
      const started = performance.now()
      const watch = () => {
        if (phaseRef.current !== 'running') return
        if (!silentRef.current && a && a.currentTime < 0.05 && performance.now() - started > 2500) silentRef.current = true
        else if (performance.now() - started < 3000) setTimeout(watch, 400)
      }
      setTimeout(watch, 400)
      setPhase('running')
    },
    [samples, getResult, pinned],
  )

  // pinned frame for screenshots: ?state=result shows the settled result without sound
  useEffect(() => {
    if (pinned === 'result' && samples.length && !autoRan.current) {
      autoRan.current = true
      void run(sel, false)
    }
  }, [pinned, samples, run, sel])

  const press = () => {
    if (phase === 'loading') return
    if (phase === 'running') {
      const a = audioRef.current
      if (a && !silentRef.current) {
        if (a.paused) void a.play()
        else a.pause()
      }
      return
    }
    void run(sel, true)
  }
  const choose = (id: string, andRun = false) => {
    if (busyRef.current) return
    audioRef.current?.pause()
    tRef.current = 0
    setHeard(0)
    setResult(null)
    setPhase('idle')
    setSel(id)
    if (andRun) {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => void run(id, true), 30)
    }
  }

  // ---- what the screen says: only engine values ----
  const live = useMemo(() => {
    if (!result) return null
    if (phase === 'result') return { g: result.clip.g, grade: result.clip.grade as string, pGrade: result.clip.pGrade, alert: result.clip.alert }
    if (heard === 0) return null
    const p = [0, 0, 0, 0]
    for (let i = 0; i < heard; i++) for (let k = 0; k < 4; k++) p[k] += result.windows[i].pGe[k] / heard
    const g = p.filter((v) => v > 0.5).length
    return { g, grade: bubble.GRADES[g] as string, pGrade: [1 - p[0], p[0] - p[1], p[1] - p[2], p[2] - p[3], p[3]], alert: p[2] >= result.clip.tau }
  }, [result, heard, phase])
  const decision = useMemo(() => (result && phase === 'result' ? bubble.act(result, crew) : null), [result, phase, crew])
  const ladderRes = result && phase === 'result' ? result : stored[sel]
  const ladder = useMemo(() => (ladderRes ? bubble.act(ladderRes, crew) : null), [ladderRes, crew])
  const tech = sample?.meta.technicianGrade as string | undefined
  const techLine =
    result && phase === 'result' && tech
      ? tech === result.clip.grade
        ? `The human technician also heard ${tech}.`
        : `The human technician heard ${tech}: shown as a miss.`
      : ''
  const toggle = (kind: 'typeI' | 'typeII', s: string) =>
    setCrew((c) => {
      const cur = (c[kind] as string[] | undefined) ?? []
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
      return { ...c, [kind]: next } as bubble.CrewInputs
    })
  const sev = decision ? SEV_CLASS[decision.severity] : ''
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const order = ['grade-0', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'dcs-dive']
  const ordered = order.map((id) => samples.find((s) => s.id === id)).filter((s): s is bubble.BubbleSample => !!s)
  const tileNote = (s: bubble.BubbleSample) =>
    s.id === 'dcs-dive'
      ? 'from a dive that ended in decompression sickness'
      : s.meta.gradedCorrectly === false
        ? `model heard ${s.meta.modelGrade}: a miss`
        : `model heard ${s.meta.modelGrade}`

  return (
    <div
      ref={rootRef}
      className={`bgw2 is-${phase} ${sev ? `sev-${sev}` : ''}`}
      data-ready={ready ? '1' : '0'}
      data-state={phase === 'loading' ? 'running' : phase}
      data-source={result?.source ?? ''}
      data-grade={phase === 'result' && result ? result.clip.grade : ''}
    >
      {/* ============ first screen ============ */}
      <section className="bgw2-first">
        <div className="bgw2-sky" aria-hidden="true">
          <Strip res={stored[sel]} tint={false} className="bgw2-sky-strip" />
          <i className="bgw2-orbit o1" />
          <i className="bgw2-orbit o2" />
          <i className="bgw2-limb" />
        </div>

        <header className="bgw2-bar">
          <span className="bgw2-brand">SuperHumans</span>
          <span className="bgw2-barline" />
          <span>Check 02 of 06</span>
          <span className="bgw2-dot" />
          <span>Heart</span>
          <span className="bgw2-dot" />
          <span>After a spacewalk</span>
        </header>

        <div className="bgw2-left">
          <p className="bgw2-kicker">Doppler heart sound, graded by AI</p>
          <h1 className="bgw2-title">
            <span>Bubble</span>
            <span className="out">Grade</span>
          </h1>
          <p className="bgw2-sentence">{SENTENCE}</p>

          <div className="bgw2-cta">
            <button type="button" className="bgw2-play" data-qa="primary" onClick={press} aria-label={phase === 'result' ? 'Listen again' : 'Listen to the heart'}>
              <span className="bgw2-play-ic" aria-hidden="true">
                {phase === 'running' ? <i className="pause" /> : <i className="tri" />}
              </span>
              <span className="bgw2-play-tx">
                {phase === 'idle' && 'Listen'}
                {phase === 'loading' && (loadPct != null ? `Loading the model ${pct(loadPct)}` : 'Starting')}
                {phase === 'running' && 'Listening'}
                {phase === 'result' && 'Listen again'}
              </span>
            </button>
            <span className="bgw2-cta-note">
              {phase === 'idle' && 'Sound on. One press plays the clip and runs the model.'}
              {phase === 'loading' && 'The model is opening inside this browser.'}
              {phase === 'running' && 'Orange is where the model hears bubble-like sound.'}
              {phase === 'result' && result && (result.source === 'live' ? `Ran in this browser in ${Math.round(result.timing.ms)} ms.` : bubble.HONESTY.precomputed)}
            </span>
          </div>

          <div className="bgw2-verdict" aria-live="polite">
            {phase === 'result' && result && decision ? (
              <>
                <div className="bgw2-vrow">
                  <span className={`bgw2-tag ${result.source === 'live' ? 'live' : ''}`}>{result.source === 'live' ? 'LIVE' : 'REPLAY'}</span>
                  <span className={`bgw2-tier ${sev}`}>{tierShort(decision.tierName)}</span>
                </div>
                <p className="bgw2-vline">
                  Grade <b>{result.clip.grade}</b> of IV. <span>{techLine}</span>
                </p>
                <p className={`bgw2-act ${sev}`}>
                  <b>{whoWord(decision.whoActs)}:</b> {decision.headline}
                </p>
                <p className="bgw2-honest">{bubble.HONESTY.card}</p>
              </>
            ) : (
              <p className="bgw2-quiet">
                {sample ? `A real recording from a diver after a dive, ${(sample.meta.durS as number).toFixed(1)} s, never heard in training.` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="bgw2-stage">
          <div className="bgw2-disc" data-qa="hero">
            <i className="bgw2-halo" aria-hidden="true" />
            <i className="bgw2-sweep" aria-hidden="true" />
            <canvas ref={discRef} className="bgw2-disc-cv" role="img" aria-label="The heart sound drawn as a ring: time runs clockwise, pitch outward, orange where the model heard bubble-like sound" />
            <button type="button" className="bgw2-hub" onClick={press} aria-label={phase === 'result' ? 'Listen again' : 'Listen'}>
              {phase === 'idle' && (
                <>
                  <i className="tri big" aria-hidden="true" />
                  <em>press to listen</em>
                </>
              )}
              {phase === 'loading' && <em className="pulse">opening the model</em>}
              {(phase === 'running' || phase === 'result') && (
                <>
                  <small>{phase === 'result' ? 'bubble grade' : live ? 'grade so far' : 'listening'}</small>
                  <strong key={live?.grade ?? 'none'}>{live ? live.grade : '·'}</strong>
                  <small className="of">of IV</small>
                </>
              )}
            </button>
          </div>
          <div className="bgw2-under">
            <span className="mono" ref={clockRef}>
              00.0 s
            </span>
            <span className="bgw2-key">
              <i className="sw heat" /> model attention
            </span>
            <span className="bgw2-key">
              <i className="sw cool" /> heart sound, low pitch inside
            </span>
          </div>
        </div>

        <aside className="bgw2-right">
          <div className="bgw2-panel">
            <h3>
              The signal <span>{phase === 'running' ? '60 ms at the playhead' : '60 ms, scanning the clip'}</span>
            </h3>
            <canvas ref={scopeRef} className="bgw2-scope" aria-hidden="true" />
          </div>

          <div className="bgw2-panel">
            <h3>
              Slice by slice <span>height = alert score</span>
            </h3>
            <div className="bgw2-slices">
              {(shown?.windows ?? []).map((w, i) => {
                const on = !!result && i < heard
                return (
                  <span key={i} className={`bgw2-slice ${on ? 'on' : ''} ${on && w.A >= (result?.clip.tau ?? 1) ? 'hot' : ''}`}>
                    <i style={{ height: on ? `${Math.max(14, w.A * 100)}%` : '0%' }} />
                    <b>{on ? bubble.GRADES[w.g] : ''}</b>
                  </span>
                )
              })}
            </div>
            <p className="bgw2-cap">The model's belief, grade by grade</p>
            <div className="bgw2-bars" aria-label="How the model splits its belief over the five grades">
              {bubble.GRADES.map((g, k) => (
                <div key={g} className={`bgw2-bar-col ${live && live.g === k ? 'top' : ''}`}>
                  <i style={{ height: `${live ? Math.max(3, live.pGrade[k] * 100) : 3}%` }} />
                  <b>{g}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="bgw2-panel tiles">
            <h3>
              Six real recordings <span>press to load</span>
            </h3>
            <div className="bgw2-tiles">
              {ordered.map((s) => (
                <button type="button" key={s.id} className={`bgw2-tile ${s.id === sel ? 'sel' : ''}`} onClick={() => choose(s.id)} aria-pressed={s.id === sel}>
                  <Strip res={stored[s.id]} className="bgw2-tile-cv" />
                  <b>{s.meta.technicianGrade as string}</b>
                  <small>{s.id === 'dcs-dive' ? 'the bends dive' : 'technician'}</small>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <a className="bgw2-scrollcue" href="#bgw2-story" onClick={(e) => (e.preventDefault(), document.getElementById('bgw2-story')?.scrollIntoView({ behavior: 'smooth' }))}>
          <span>The story</span>
          <i aria-hidden="true" />
        </a>
      </section>

      {/* ============ the problem ============ */}
      <section className="bgw2-photo" id="bgw2-story">
        <div className="bgw2-photo-sq">
          <img src={evaPhoto} alt="An astronaut floating free, tiny against black space above the blue curve of the Earth" loading="lazy" />
          <div className="bgw2-reticle" aria-hidden="true">
            <i className="ring" />
            <i className="ring r2" />
            <i className="tick" />
            <span>
              Spacewalk, 1984
              <small>outside, the suit holds a lower pressure</small>
            </span>
          </div>
        </div>
        <div className="bgw2-photo-tx">
          <p className="bgw2-num">01 / the problem</p>
          <h2>
            Step outside,
            <br />
            and the pressure drops.
          </h2>
          <p className="bgw2-lede">Nitrogen dissolved in the body forms bubbles. Joint pain, breathing problems, blocked vessels, stroke-like symptoms: the bends.</p>
        </div>
        <p className="bgw2-credit">Photo: NASA, S84-27031, first untethered spacewalk, 1984. Public domain. Risk wording: NASA Human Research Program, Risk of Decompression Sickness.</p>
      </section>

      <section className="bgw2-body">
        <div className="bgw2-body-tx">
          <p className="bgw2-num">02 / where to listen</p>
          <h2>The bubbles ride the veins to the heart.</h2>
          <p className="bgw2-lede">An ultrasound probe over the heart turns blood flow into sound. A clean heart is a soft whoosh. Bubbles add sharp chirps on top of it.</p>
          <p className="bgw2-fine">{bubble.HONESTY.context}</p>
        </div>
        <div className="bgw2-diagram">
          <svg viewBox="0 0 640 400" role="img" aria-label="Diagram: gas bubbles ride a vein up to the heart, where a Doppler probe on the chest listens">
            <defs>
              <linearGradient id="bgw2-vein" x1="0" x2="1">
                <stop offset="0" stopColor="#0a2a3d" />
                <stop offset="1" stopColor="#15607f" />
              </linearGradient>
              <radialGradient id="bgw2-heart" cx="0.42" cy="0.38" r="0.75">
                <stop offset="0" stopColor="#ffb08a" />
                <stop offset="0.45" stopColor="#e2484a" />
                <stop offset="1" stopColor="#4a0f1d" />
              </radialGradient>
              <radialGradient id="bgw2-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ff6a55" stopOpacity="0.55" />
                <stop offset="1" stopColor="#ff6a55" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="bgw2-torso" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3fd0ff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#3fd0ff" stopOpacity="0.02" />
              </linearGradient>
              <pattern id="bgw2-scan" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M0 0.5 H6" stroke="rgba(120,220,255,0.10)" strokeWidth="1" />
              </pattern>
            </defs>
            {/* chest, drawn as a hologram */}
            <path className="bgw2-torso" d="M448 0 L448 30 C 428 50, 384 56, 360 74 C 340 92, 340 150, 350 210 C 356 260, 366 330, 372 400 L 588 400 C 594 330, 604 260, 610 210 C 620 150, 620 92, 600 74 C 576 56, 532 50, 512 30 L 512 0 Z" fill="url(#bgw2-torso)" stroke="rgba(140,225,255,0.55)" strokeWidth="1.3" />
            <path d="M448 0 L448 30 C 428 50, 384 56, 360 74 C 340 92, 340 150, 350 210 C 356 260, 366 330, 372 400 L 588 400 C 594 330, 604 260, 610 210 C 620 150, 620 92, 600 74 C 576 56, 532 50, 512 30 L 512 0 Z" fill="url(#bgw2-scan)" />
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M${392 + i * 4} ${118 + i * 30} Q 480 ${150 + i * 36} ${568 - i * 4} ${118 + i * 30}`} fill="none" stroke="rgba(140,225,255,0.13)" strokeWidth="1.2" />
            ))}
            <path d="M480 60 L480 300" stroke="rgba(140,225,255,0.16)" strokeWidth="1.2" strokeDasharray="3 6" />
            {/* the vein from the legs, carrying bubbles up to the heart */}
            <path d="M18 352 C 150 352, 210 292, 300 282 S 420 270, 452 226" fill="none" stroke="url(#bgw2-vein)" strokeWidth="40" strokeLinecap="round" />
            <path d="M18 352 C 150 352, 210 292, 300 282 S 420 270, 452 226" fill="none" stroke="rgba(120,220,255,0.4)" strokeWidth="1.2" strokeDasharray="2 9" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <circle key={i} r={2.6 + (i % 3) * 2.1} fill="rgba(230,250,255,0.16)" stroke="#e4f9ff" strokeWidth="1.2">
                <animateMotion dur={`${5.5 + (i % 4) * 1.2}s`} begin={`${-i * 0.8}s`} repeatCount="indefinite" path={`M18 ${352 + ((i * 7) % 18) - 9} C 150 ${352 + ((i * 5) % 14) - 7}, 210 292, 300 ${282 + ((i * 9) % 16) - 8} S 420 270, 452 226`} />
              </circle>
            ))}
            {/* the heart */}
            <circle cx="490" cy="205" r="92" fill="url(#bgw2-glow)" className="bgw2-hglow" />
            <g className="bgw2-heartbeat">
              <path d="M492 138 C 470 128, 446 140, 446 168 C 444 200, 468 236, 504 266 C 532 238, 548 206, 544 176 C 541 150, 520 134, 492 138 Z" fill="url(#bgw2-heart)" stroke="#ffc2ad" strokeWidth="1.4" />
              <path d="M486 140 C 480 116, 500 100, 522 108 C 534 112, 540 124, 536 136" fill="none" stroke="#ff8a74" strokeWidth="9" strokeLinecap="round" />
              <path d="M470 142 C 466 120, 470 104, 474 92" fill="none" stroke="#5b8fb0" strokeWidth="9" strokeLinecap="round" />
              <path d="M476 176 C 490 196, 498 220, 502 250" fill="none" stroke="rgba(255,210,195,0.45)" strokeWidth="1.2" />
            </g>
            {/* the probe on the chest, listening */}
            <g className="bgw2-probe">
              {[0, 1, 2].map((i) => (
                <path key={i} className={`bgw2-arc a${i}`} d={`M${536 - i * 6} ${150 + i * 14} Q ${514 - i * 10} ${168 + i * 12} ${508 - i * 14} ${194 + i * 10}`} fill="none" stroke="#9fe6ff" strokeWidth="1.8" strokeLinecap="round" />
              ))}
              <g transform="rotate(32 572 118)">
                <rect x="556" y="70" width="32" height="58" rx="9" fill="#0d1c26" stroke="#9fe6ff" strokeWidth="1.5" />
                <rect x="562" y="124" width="20" height="10" rx="3" fill="#9fe6ff" />
                <path d="M572 70 C 572 50, 590 40, 612 34" fill="none" stroke="#9fe6ff" strokeWidth="1.5" />
              </g>
            </g>
            <text x="626" y="24" textAnchor="end" className="lbl">Doppler probe</text>
            <text x="626" y="42" textAnchor="end" className="lbl dim">on the chest</text>
            <text x="626" y="290" textAnchor="end" className="lbl">heart</text>
            <text x="268" y="330" className="lbl">gas bubbles</text>
            <text x="22" y="392" className="lbl dim">vein, returning blood from the legs</text>
          </svg>
          <span className="bgw2-ai">AI-generated illustration</span>
        </div>
      </section>

      {/* ============ the wall ============ */}
      <section className="bgw2-wall">
        <div className="bgw2-wall-head">
          <p className="bgw2-num">03 / what a technician hears</p>
          <h2>Six real recordings, from silence to streaks.</h2>
          <p className="bgw2-lede">Each band is one heart recording from a diver after a dive, drawn as the picture the model reads. Press one to hear it and watch it graded.</p>
        </div>
        <div className="bgw2-rows">
          {ordered.map((s) => (
            <button type="button" key={s.id} className={`bgw2-row ${s.id === sel ? 'sel' : ''}`} onClick={() => choose(s.id, true)}>
              <span className="bgw2-row-g">
                <b>{s.meta.technicianGrade as string}</b>
                <small>technician</small>
              </span>
              <Strip res={stored[s.id]} className="bgw2-row-cv" />
              <span className="bgw2-row-n">
                {tileNote(s)}
                <i>{(s.meta.durS as number).toFixed(1)} s</i>
              </span>
            </button>
          ))}
        </div>
        <p className="bgw2-fine">
          Heat: {bubble.HONESTY.bubbleMap}; {bubble.HONESTY.precomputed}. {bubble.HONESTY.footer}
        </p>
      </section>

      {/* ============ the work ============ */}
      <section className="bgw2-work">
        <div className="bgw2-work-head">
          <p className="bgw2-num">04 / the work behind it</p>
          <h2>Trained on divers. Tested on divers it never heard.</h2>
        </div>
        <div className="bgw2-stats">
          <div>
            <b>{meta ? meta.n_clips.toLocaleString('en-US') : '—'}</b>
            <span>real Doppler recordings</span>
          </div>
          <div>
            <b>{meta ? meta.n_divers : '—'}</b>
            <span>divers, split so no test diver was in training</span>
          </div>
          <div>
            <b>{meta ? pct(meta.headline.sens_tau) : '—'}</b>
            <span>of high-bubble recordings (grade III to IV) flagged, at {meta ? pct(meta.headline.spec_tau) : ''} specificity</span>
          </div>
        </div>

        <div className="bgw2-grid">
          <div className="bgw2-card">
            <h3>How it listens</h3>
            <ol className="bgw2-pipe">
              <li>
                <b>Heart sound</b>
                <span>a probe over the heart</span>
              </li>
              <li>
                <b>5-second slices</b>
                <span>one every second</span>
              </li>
              <li>
                <b>Sound picture</b>
                <span>64 pitch bands</span>
              </li>
              <li>
                <b>MobileNetV4</b>
                <span>fine-tuned by us</span>
              </li>
              <li className="end">
                <b>Grade 0 to IV</b>
                <span>plus a spacewalk alert</span>
              </li>
            </ol>
            <p className="bgw2-fine">The model finishes first, in one pass. The reveal then follows the playhead. Nothing is counted, located or sized.</p>
          </div>

          <div className="bgw2-card">
            <h3>Is it cheating?</h3>
            <p className="bgw2-sub">Alert score (AUROC) of the model against rules that never listen to the bubbles.</p>
            {meta && (
              <div className="bgw2-floors">
                {(
                  [
                    ['Recording length only', meta.floors.duration.alert_auroc, false],
                    ['Loudness only', meta.floors.loudness.alert_auroc, false],
                    ['All recording circumstances', meta.floors.nuisance.alert_auroc, false],
                    ['BubbleGrade', meta.headline.alert_auroc, true],
                  ] as [string, number, boolean][]
                ).map(([name, v, us]) => (
                  <div key={name} className={`bgw2-floor ${us ? 'us' : ''}`}>
                    <span>{name}</span>
                    <i>
                      <u style={{ width: `${((v - 0.5) / 0.5) * 100}%` }} />
                    </i>
                    <b>{v.toFixed(2)}</b>
                  </div>
                ))}
              </div>
            )}
            <p className="bgw2-fine">Bars start at 0.5, the score of a coin flip.</p>
          </div>

          <div className="bgw2-card wide">
            <h3>One diver, one dive</h3>
            <p className="bgw2-sub">
              {dive ? `${dive.nClips} recordings over the hours after surfacing. Height is the model's grade; colour is the technician's.` : ''} A diver after a dive, not a spacewalk.
            </p>
            {dive && (
              <svg className="bgw2-dive" viewBox="0 0 720 240" role="img" aria-label="Model grade against minutes after surfacing for one diver">
                {[0, 1, 2, 3, 4].map((g) => (
                  <g key={g}>
                    <line x1="44" x2="708" y1={204 - g * 45} y2={204 - g * 45} stroke="rgba(160,215,235,0.14)" />
                    <text x="30" y={208 - g * 45} className="ax" textAnchor="end">
                      {bubble.GRADES[g]}
                    </text>
                  </g>
                ))}
                {[0, 60, 120, 180, 240, 300].map((m) => (
                  <text key={m} x={52 + (m / 330) * 650} y="232" className="ax" textAnchor="middle">
                    {m} min
                  </text>
                ))}
                {dive.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={52 + (p.minutesAfterSurfacing / 330) * 650 + ((i % 7) - 3) * 3.4}
                    cy={204 - clamp(p.E, 0, 4) * 45}
                    r="5.5"
                    className={`tg${p.technicianGrade}`}
                  />
                ))}
              </svg>
            )}
            <div className="bgw2-legend">
              {bubble.GRADES.map((g, k) => (
                <span key={g}>
                  <i className={`tg${k}`} /> technician {g}
                </span>
              ))}
            </div>
          </div>

          <div className="bgw2-card limits">
            <h3>What it does not do</h3>
            <ul>
              <li>Diver data, not astronaut data.</li>
              <li>Grade IV is mostly heard as III. The grade IV clip above is shown as a miss.</li>
              <li>{meta ? `A test on ${meta.L7.n} modern-probe recordings failed: ${meta.L7.n_alert} of ${meta.L7.n} were flagged.` : ''}</li>
              <li>It does not predict or rule out decompression sickness.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============ what to do next ============ */}
      <section className="bgw2-next">
        <div className="bgw2-next-head">
          <p className="bgw2-num">05 / what to do next</p>
          <h2>{bubble.HONESTY.card}</h2>
          <p className="bgw2-lede">Tick what the crew member feels. Symptoms always outrank the bubbles.</p>
        </div>
        <div className="bgw2-next-grid">
          <div className="bgw2-checks">
            <h4>Mild (Type I)</h4>
            <div>
              {bubble.SYMPTOMS_TYPE_I.map((s) => (
                <button type="button" key={s} className={crew.typeI?.includes(s) ? 'on' : ''} aria-pressed={!!crew.typeI?.includes(s)} onClick={() => toggle('typeI', s)}>
                  {s}
                </button>
              ))}
            </div>
            <h4>Serious (Type II)</h4>
            <div>
              {bubble.SYMPTOMS_TYPE_II.map((s) => (
                <button type="button" key={s} className={crew.typeII?.includes(s) ? 'on' : ''} aria-pressed={!!crew.typeII?.includes(s)} onClick={() => toggle('typeII', s)}>
                  {s}
                </button>
              ))}
            </div>
            <h4>After treatment in the suit</h4>
            <div>
              <button type="button" className={crew.unresolvedWithBTA ? 'on' : ''} aria-pressed={!!crew.unresolvedWithBTA} onClick={() => setCrew((c) => ({ ...c, unresolvedWithBTA: !c.unresolvedWithBTA }))}>
                {bubble.BTA_UNRESOLVED}
              </button>
            </div>
          </div>
          {ladder && (
            <div className={`bgw2-decision ${SEV_CLASS[ladder.severity]}`}>
              <div className="bgw2-steps" aria-hidden="true">
                {[0, 1, 2, 3].map((t) => (
                  <i key={t} className={t <= ladder.tier ? 'on' : ''} />
                ))}
              </div>
              <p className="bgw2-dtier">{tierShort(ladder.tierName)}</p>
              <p className="bgw2-dhead">
                <b>{whoWord(ladder.whoActs)}:</b> {ladder.headline}
              </p>
              <ul>
                {ladder.actions.slice(0, 4).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p className="bgw2-fine">
                For the clip on the stage. {ladder.ourRule ? 'The grade-to-action mapping is our product rule. ' : ''}
                Sources: {ladder.sources.map((s) => s.label).join('; ')}.
              </p>
            </div>
          )}
        </div>
        <footer className="bgw2-foot">
          <span>Recordings: Blogg et al. 2026, Zenodo 16877955, GPL-3.0-or-later.</span>
          <span>Photo: NASA S84-27031, public domain.</span>
          <a href="#bgw2-top" onClick={(e) => (e.preventDefault(), rootRef.current?.scrollIntoView({ behavior: 'smooth' }))}>
            Back to the check
          </a>
        </footer>
      </section>
    </div>
  )
}

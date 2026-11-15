// SpikeCount stage: image + image + number. Left, the microscope photo with the outliner's outlines; right, the
// same field as the grader reads it (every cell lit in its grade colour on a dark field); beside them the one
// number. One sweep line crosses both squares at the same x: everything the models drew is clipped to the line,
// so an outline appears exactly while the line passes it, and a cell is counted the moment the line clears it.
// Below: real example cells of every grade, smooth to very spiky. Stage only: no page chrome. See README.md.
import './moment.css'
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type Ref } from 'react'
import * as spike from '../../engine/spikecount'
import type { ClassName, SpikeActDecision, SpikeCell, SpikeResult } from '../../engine/spikecount'

export type MomentState = 'idle' | 'running' | 'result' | 'error'

export interface SpikeCountMomentHandle {
  run(): void
  reset(): void
}

export interface SpikeCountMomentProps {
  /** One of the 31 held-out fields, "field-<n>". Default field-96 (the most visual one). */
  sampleId?: string
  /** auto: the two real models on a laptop; stored outputs on a phone, when pinned, or after a failure. */
  mode?: 'auto' | 'live' | 'replay'
  /** Pins the stage while set. */
  state?: 'idle' | 'result'
  /** Pins the timeline at this clock time in ms while set. */
  t?: number
  /** The one line on the idle stage ('' removes it). */
  promise?: string
  /** A tap on an idle image starts the reading (default true). */
  tapToRun?: boolean
  /** The two images only: no number, no example strip, no words (posters). */
  bare?: boolean
  onResult?: (result: SpikeResult, act: SpikeActDecision) => void
  onState?: (state: MomentState) => void
  onReady?: (ready: boolean) => void
  className?: string
  style?: CSSProperties
  ref?: Ref<SpikeCountMomentHandle>
}

/** One clock. The line crosses the field between SWEEP0 and SWEEP1 at constant speed. */
export const BEAT_TIMES = { SWEEP0: 450, SWEEP1: 4650, VERDICT: 4780, ACT: 5200, END: 5700 } as const
const FIELD = 572
const CLASSES: ClassName[] = ['Disc', 'E1', 'E2', 'E3', 'E4', 'Cup']
const DEFAULT_PROMISE = 'Outline every red blood cell in this photo, and grade the spiky ones.'

/** Real example cells from the graded gallery (app/public/spikecount/gallery): expert and model agree on each. */
const EXAMPLES: { cls: ClassName; title: string; short: string; note: string; files: string[] }[] = [
  { cls: 'Disc', title: 'Normal disc', short: 'Disc', note: 'smooth', files: ['Disc_00', 'Disc_03'] },
  { cls: 'E1', title: 'Spiky 1', short: '1', note: 'a few bumps', files: ['E1_06', 'E1_05'] },
  { cls: 'E2', title: 'Spiky 2', short: '2', note: 'clear spikes', files: ['E2_10', 'E2_03'] },
  { cls: 'E3', title: 'Spiky 3', short: '3', note: 'spikes all round', files: ['E3_05', 'E3_00'] },
  { cls: 'E4', title: 'Spiky 4', short: '4', note: 'ball of fine spikes', files: ['E4_00', 'E4_09'] },
  { cls: 'Cup', title: 'Cup', short: 'Cup', note: 'not spiky', files: ['Cup_03', 'Cup_11'] },
]

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const isSpiky = (cls: number) => cls >= 1 && cls <= 4

interface PCell {
  c: SpikeCell
  path: Path2D
  minX: number
  maxX: number
  /** clock time at which the line has fully cleared this cell */
  tLand: number
}

interface Prog {
  landed: number
  spiky: number
  counts: number[]
  /** 0 before the sweep, 1 sweeping, 2 the number has landed, 3 "what to do next" is up */
  phase: 0 | 1 | 2 | 3
}
const ZERO: Prog = { landed: 0, spiky: 0, counts: [0, 0, 0, 0, 0, 0], phase: 0 }

interface Layout {
  narrow: boolean
  sq: number
  cell: number
  pad: number
  gap: number
}

function layoutFor(W: number, H: number, bare: boolean): Layout {
  if (W < 10 || H < 10) return { narrow: false, sq: 0, cell: 0, pad: 0, gap: 0 }
  if (bare) {
    const g = Math.round(clamp(Math.min(W, H) * 0.014, 8, 16))
    const stacked = H > W
    const sq = Math.floor(stacked ? Math.min(W - 2 * g, (H - 3 * g) / 2) : Math.min((W - 3 * g) / 2, H - 2 * g))
    return { narrow: stacked, sq, cell: 0, pad: g, gap: g }
  }
  const narrow = W < 760
  if (!narrow) {
    const pad = Math.round(clamp(W * 0.02, 14, 28))
    const gap = 14
    const numW = clamp(W * 0.185, 210, 290)
    const foot = 20
    const stripMin = clamp(H * 0.19, 118, 160)
    const sq = Math.floor(Math.min((W - 2 * pad - numW - 2 * gap) / 2, H - 2 * pad - stripMin - foot - 2 * gap))
    const stripH = H - 2 * pad - sq - foot - 2 * gap
    const colW = (W - 2 * pad - 5 * 12) / 6
    const cell = Math.floor(clamp(Math.min(stripH - 84, (colW - 4) / 2), 40, 132))
    return { narrow, sq, cell, pad, gap }
  }
  // phone: both squares full width, stacked under the number; the stage scrolls (data-narrow="1")
  const pad = 12
  const gap = 10
  const sq = Math.floor(Math.min(W - 2 * pad, 560))
  const cell = Math.floor(clamp((W - 2 * pad - 2 * 10) / 3, 60, 150))
  return { narrow, sq, cell, pad, gap }
}

function readVar(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

function prepare(res: SpikeResult): PCell[] {
  const dur = BEAT_TIMES.SWEEP1 - BEAT_TIMES.SWEEP0
  const out: PCell[] = []
  for (const c of res.cells) {
    if (!c.polygon || c.polygon.length < 3) continue
    const path = new Path2D()
    let minX = Infinity
    let maxX = -Infinity
    c.polygon.forEach((p, i) => {
      const x = p[0] + 0.5
      const y = p[1] + 0.5
      if (i === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    })
    path.closePath()
    out.push({ c, path, minX, maxX, tLand: BEAT_TIMES.SWEEP0 + (clamp(maxX, 0, FIELD) / FIELD) * dur })
  }
  out.sort((a, b) => a.maxX - b.maxX)
  return out
}

function progAt(cells: PCell[], t: number): Prog {
  const counts = [0, 0, 0, 0, 0, 0]
  let landed = 0
  let sp = 0
  for (const pc of cells) {
    if (pc.tLand > t) break
    landed++
    counts[pc.c.cls]++
    if (isSpiky(pc.c.cls)) sp++
  }
  const phase = t >= BEAT_TIMES.ACT ? 3 : t >= BEAT_TIMES.VERDICT ? 2 : t >= BEAT_TIMES.SWEEP0 ? 1 : 0
  return { landed, spiky: sp, counts, phase }
}
const sameProg = (a: Prog, b: Prog) => a.landed === b.landed && a.phase === b.phase

interface Layers {
  P: number
  outline: HTMLCanvasElement
  grade: HTMLCanvasElement
}

function buildLayers(img: HTMLImageElement, cells: PCell[], P: number, cssPx: number, colours: string[], pick: number | null): Layers {
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = c.height = P
    return c
  }
  const s = P / FIELD
  const px = FIELD / Math.max(1, cssPx) // one CSS pixel in field units
  const outline = mk()
  const grade = mk()
  const o = outline.getContext('2d')!
  const g = grade.getContext('2d')!
  o.setTransform(s, 0, 0, s, 0, 0)
  g.setTransform(s, 0, 0, s, 0, 0)
  o.lineJoin = g.lineJoin = 'round'
  for (const pc of cells) {
    const on = pick === null || pick === pc.c.cls
    const col = colours[pc.c.cls]
    // left image: the outliner's line, plain
    o.setLineDash(pc.c.border ? [4 * px, 3 * px] : [])
    if (pick === null) {
      o.strokeStyle = 'rgba(255,255,255,0.86)'
      o.lineWidth = 1.25 * px
    } else {
      o.strokeStyle = on ? col : 'rgba(255,255,255,0.22)'
      o.lineWidth = (on ? 2.4 : 1) * px
    }
    o.stroke(pc.path)
    // right image: the cell itself, lit in its grade colour
    g.save()
    g.clip(pc.path)
    g.globalAlpha = on ? 1 : 0.3
    g.filter = on ? 'contrast(2.3) brightness(1.5)' : 'none'
    g.drawImage(img, 0, 0, FIELD, FIELD)
    g.filter = 'none'
    if (on) {
      const x0 = pc.minX - 2
      const w = pc.maxX - pc.minX + 4
      g.globalCompositeOperation = 'multiply'
      g.fillStyle = col
      g.fillRect(x0, 0, w, FIELD)
      g.globalCompositeOperation = 'screen'
      g.globalAlpha = 0.1
      g.fillRect(x0, 0, w, FIELD)
      g.globalCompositeOperation = 'source-over'
    }
    g.restore()
    g.setLineDash(pc.c.border ? [4 * px, 3 * px] : [])
    if (on) {
      g.shadowColor = col
      g.shadowBlur = 9 * (P / Math.max(1, cssPx))
      g.strokeStyle = col
      g.lineWidth = 1.7 * px
      g.stroke(pc.path)
      g.shadowBlur = 0
    } else {
      g.strokeStyle = 'rgba(255,255,255,0.16)'
      g.lineWidth = 1 * px
      g.stroke(pc.path)
    }
  }
  return { P, outline, grade }
}

export default function SpikeCountMoment(props: SpikeCountMomentProps) {
  const { sampleId = 'field-96', mode = 'auto', state: pinState, t: pinT, promise = DEFAULT_PROMISE, tapToRun = true, bare = false, onResult, onState, onReady, className, style, ref } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const aRef = useRef<HTMLCanvasElement>(null)
  const bRef = useRef<HTMLCanvasElement>(null)
  const [lay, setLay] = useState<Layout>({ narrow: false, sq: 0, cell: 0, pad: 0, gap: 0 })
  const [data, setData] = useState<{ id: string; res: SpikeResult; img: HTMLImageElement; decision: SpikeActDecision } | null>(null)
  const [st, setSt] = useState<MomentState>('idle')
  const [prog, setProg] = useState<Prog>(ZERO)
  const [hover, setHover] = useState<number | null>(null)
  const [pick, setPick] = useState<number | null>(null)
  const [wait, setWait] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const sim = useRef({ t: 0, running: false, start: 0, raf: 0, token: 0, fired: false })
  const cb = useRef({ onResult, onState, onReady })
  cb.current = { onResult, onState, onReady }
  const dataRef = useRef(data)
  dataRef.current = data
  const pinned = pinState !== undefined || pinT !== undefined

  // ---- size
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const apply = () => {
      const r = el.getBoundingClientRect()
      const l = layoutFor(r.width, r.height, bare)
      setLay((p) => (p.sq === l.sq && p.narrow === l.narrow && p.cell === l.cell && p.pad === l.pad ? p : l))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [bare])

  // ---- sample: the photo and the stored outputs (7-34 KB), so the idle stage and pinned states need no model
  useEffect(() => {
    let dead = false
    setData(null)
    setFailed(false)
    setHover(null)
    setPick(null)
    setProg(ZERO)
    sim.current.token++
    sim.current.running = false
    sim.current.t = 0
    setSt('idle')
    setWait(null)
    const n = Number(/^field-(\d+)$/.exec(sampleId)?.[1] ?? NaN)
    const img = new Image()
    img.decoding = 'async'
    img.src = spike.ASSETS.url(`fields/${n}.png`)
    Promise.all([spike.replay(sampleId), img.decode().catch(() => new Promise<void>((ok, no) => ((img.onload = () => ok()), (img.onerror = () => no(new Error('image')))))) ])
      .then(([res]) => {
        if (dead) return
        setData({ id: sampleId, res, img, decision: spike.act(res) })
      })
      .catch(() => {
        if (dead) return
        setFailed(true)
        setSt('error')
      })
    return () => {
      dead = true
    }
  }, [sampleId])

  const cells = useMemo(() => (data ? prepare(data.res) : []), [data])
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  // ---- colours (read once per mount and whenever the sample changes)
  const colours = useMemo(() => {
    const el = rootRef.current
    const fb = ['#58c8ff', '#ffd75e', '#ff9d3f', '#ff5b52', '#ff3d94', '#b9a0ff']
    if (!el) return { cls: fb, ink: '#f3f1ea', stage: '#05070a' }
    const names = ['--m-c-disc', '--m-c-e1', '--m-c-e2', '--m-c-e3', '--m-c-e4', '--m-c-cup']
    return { cls: names.map((n, i) => readVar(el, n, fb[i])), ink: readVar(el, '--m-ink', '#f3f1ea'), stage: readVar(el, '--m-pane', '#05070a') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lay.sq])

  // ---- layers
  const layers = useRef<Layers | null>(null)
  const dpr = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1)

  const paint = useCallback(
    (t: number) => {
      const L = layers.current
      const d = dataRef.current
      const A = aRef.current
      const B = bRef.current
      if (!L || !d || !A || !B) return
      const P = L.P
      const s = P / FIELD
      const k = P / Math.max(1, lay.sq) // device px per CSS px
      const u = clamp((t - BEAT_TIMES.SWEEP0) / (BEAT_TIMES.SWEEP1 - BEAT_TIMES.SWEEP0), 0, 1)
      const x = u * FIELD
      const X = x * s
      const sweeping = t > BEAT_TIMES.SWEEP0 && t < BEAT_TIMES.SWEEP1 + 260
      const lineA = t < BEAT_TIMES.SWEEP1 ? 1 : clamp(1 - (t - BEAT_TIMES.SWEEP1) / 260, 0, 1)
      const list = cellsRef.current

      const line = (ctx: CanvasRenderingContext2D) => {
        if (!sweeping || lineA <= 0) return
        ctx.save()
        ctx.globalAlpha = lineA
        const trail = 64 * k
        const gr = ctx.createLinearGradient(X - trail, 0, X, 0)
        gr.addColorStop(0, 'rgba(255,255,255,0)')
        gr.addColorStop(1, 'rgba(255,255,255,0.17)')
        ctx.fillStyle = gr
        ctx.fillRect(X - trail, 0, trail, P)
        ctx.shadowColor = colours.ink
        ctx.shadowBlur = 14 * k
        ctx.fillStyle = colours.ink
        ctx.fillRect(X - 1 * k, 0, 2 * k, P)
        ctx.restore()
      }

      // left: the photo, and the outliner's outlines up to the line
      const a = A.getContext('2d')!
      a.setTransform(1, 0, 0, 1, 0, 0)
      a.clearRect(0, 0, P, P)
      a.drawImage(d.img, 0, 0, P, P)
      // right: the same field, dark, with the graded cells up to the line
      const b = B.getContext('2d')!
      b.setTransform(1, 0, 0, 1, 0, 0)
      b.fillStyle = colours.stage
      b.fillRect(0, 0, P, P)
      b.globalAlpha = 0.2
      b.drawImage(d.img, 0, 0, P, P)
      b.globalAlpha = 1

      if (X > 0) {
        a.save()
        a.beginPath()
        a.rect(0, 0, X, P)
        a.clip()
        a.drawImage(L.outline, 0, 0)
        // cells under the line right now: a brighter outline while it is being drawn
        a.setTransform(s, 0, 0, s, 0, 0)
        a.lineJoin = 'round'
        for (const pc of list) {
          if (pc.minX > x) continue
          const since = t - pc.tLand
          if (since > 320) continue
          const al = since <= 0 ? 1 : 1 - since / 320
          a.globalAlpha = al
          a.fillStyle = 'rgba(255,255,255,0.13)'
          a.fill(pc.path)
          a.strokeStyle = '#fff'
          a.lineWidth = (2.6 * FIELD) / Math.max(1, lay.sq)
          a.stroke(pc.path)
        }
        a.restore()

        b.save()
        b.beginPath()
        b.rect(0, 0, X, P)
        b.clip()
        b.drawImage(L.grade, 0, 0)
        b.restore()
        // a cell the line has just cleared: its grade colour blooms once
        b.save()
        b.setTransform(s, 0, 0, s, 0, 0)
        b.lineJoin = 'round'
        for (const pc of list) {
          const since = t - pc.tLand
          if (since < 0) break
          if (since > 460) continue
          const v = since / 460
          b.globalAlpha = (1 - v) * 0.5
          b.fillStyle = '#fff'
          if (since < 200) b.fill(pc.path)
          b.globalAlpha = (1 - v) * 0.9
          b.strokeStyle = colours.cls[pc.c.cls]
          b.lineWidth = ((2 + 7 * v) * FIELD) / Math.max(1, lay.sq)
          b.stroke(pc.path)
        }
        b.restore()
      }
      line(a)
      line(b)

      if (hoverRef.current !== null) {
        const pc = list[hoverRef.current]
        if (pc) {
          for (const ctx of [a, b]) {
            ctx.save()
            ctx.setTransform(s, 0, 0, s, 0, 0)
            ctx.lineJoin = 'round'
            ctx.shadowColor = '#fff'
            ctx.shadowBlur = 10 * k
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = (2.4 * FIELD) / Math.max(1, lay.sq)
            ctx.stroke(pc.path)
            ctx.restore()
          }
        }
      }
    },
    [colours, lay.sq],
  )
  const hoverRef = useRef<number | null>(null)
  hoverRef.current = hover
  const paintRef = useRef(paint)
  paintRef.current = paint

  const settle = useCallback((t: number) => {
    const p = progAt(cellsRef.current, t)
    setProg((q) => (sameProg(p, q) ? q : p))
  }, [])

  useEffect(() => {
    if (!data || lay.sq <= 0) return
    const P = Math.max(64, Math.round(lay.sq * dpr))
    for (const c of [aRef.current, bRef.current]) {
      if (c && c.width !== P) c.width = c.height = P
    }
    layers.current = buildLayers(data.img, cells, P, lay.sq, colours.cls, pick)
    paintRef.current(sim.current.t)
  }, [data, cells, lay.sq, dpr, colours, pick])

  useEffect(() => {
    paintRef.current(sim.current.t)
  }, [hover, paint])

  // ---- clock
  const stop = useCallback(() => {
    sim.current.running = false
    cancelAnimationFrame(sim.current.raf)
  }, [])

  const finish = useCallback(() => {
    const d = dataRef.current
    sim.current.t = BEAT_TIMES.END
    paintRef.current(BEAT_TIMES.END)
    settle(BEAT_TIMES.END)
    setSt('result')
    if (d && !sim.current.fired) {
      sim.current.fired = true
      cb.current.onResult?.(d.res, d.decision)
    }
  }, [settle])

  const startClock = useCallback(
    (my: number) => {
      const S = sim.current
      S.running = true
      S.start = performance.now()
      const tick = () => {
        if (!S.running || S.token !== my) return
        const t = performance.now() - S.start
        if (t >= BEAT_TIMES.END) {
          S.running = false
          finish()
          return
        }
        S.t = t
        paintRef.current(t)
        settle(t)
        S.raf = requestAnimationFrame(tick)
      }
      S.raf = requestAnimationFrame(tick)
    },
    [finish, settle],
  )

  const reset = useCallback(() => {
    stop()
    sim.current.token++
    sim.current.t = 0
    sim.current.fired = false
    setWait(null)
    setHover(null)
    setPick(null)
    setProg(ZERO)
    setSt(dataRef.current ? 'idle' : 'error')
    paintRef.current(0)
  }, [stop])

  const run = useCallback(() => {
    const d = dataRef.current
    if (!d) return
    stop()
    const S = sim.current
    const my = ++S.token
    S.t = 0
    S.fired = false
    setHover(null)
    setPick(null)
    setProg(ZERO)
    setSt('running')
    paintRef.current(0)
    const root = rootRef.current
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
    const small = (root?.getBoundingClientRect().width ?? 1000) < 700
    const live = mode === 'live' || (mode === 'auto' && !coarse && !small)
    const go = () => {
      if (S.token !== my) return
      setWait(null)
      if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // wait one frame so freshly built layers are in place
        requestAnimationFrame(() => S.token === my && finish())
        return
      }
      requestAnimationFrame(() => S.token === my && startClock(my))
    }
    if (!live) {
      if (d.res.source !== 'precomputed') {
        spike
          .replay(d.id)
          .then((res) => S.token === my && setData((p) => (p ? { ...p, res, decision: spike.act(res) } : p)))
          .finally(go)
      } else go()
      return
    }
    setWait('Loading the two models')
    const mb = (b: number) => (b / 1048576).toFixed(0)
    const limit = new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), 30000))
    Promise.race([
      (async () => {
        await spike.load((p) => S.token === my && p.stage !== 'ready' && setWait(`Loading the two models · ${mb(p.loadedBytes)} of ${mb(p.totalBytes)} MB`))
        if (S.token === my) setWait('The two models are reading the photo')
        return spike.analyze(d.id)
      })(),
      limit,
    ])
      .then((res) => {
        if (S.token !== my) return
        setData((p) => (p ? { ...p, res, decision: spike.act(res) } : p))
      })
      .catch(() => {
        /* keep the stored outputs: the stage then says REPLAY */
      })
      .finally(go)
  }, [finish, mode, startClock, stop])

  useImperativeHandle(ref, () => ({ run, reset }), [run, reset])
  useEffect(() => () => stop(), [stop])

  // ---- pins
  useEffect(() => {
    if (!data || !pinned) return
    stop()
    sim.current.token++
    const t = pinT !== undefined ? clamp(pinT, 0, BEAT_TIMES.END) : pinState === 'result' ? BEAT_TIMES.END : 0
    sim.current.t = t
    setWait(null)
    setSt(t >= BEAT_TIMES.END ? 'result' : t <= 0 ? 'idle' : 'running')
    settle(t)
    paintRef.current(t)
  }, [data, pinned, pinState, pinT, settle, stop])

  useEffect(() => {
    cb.current.onState?.(st)
  }, [st])
  const ready = !!data && lay.sq > 0
  useEffect(() => {
    cb.current.onReady?.(ready)
  }, [ready])

  // ---- pointing at a cell (after the result): the same cell lights in both images
  const hit = useMemo(() => (typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')), [])
  const cellAt = (e: RPointerEvent<HTMLElement>): number | null => {
    const r = e.currentTarget.getBoundingClientRect()
    const fx = ((e.clientX - r.left) / r.width) * FIELD
    const fy = ((e.clientY - r.top) / r.height) * FIELD
    if (!hit) return null
    for (let i = 0; i < cells.length; i++) if (hit.isPointInPath(cells[i].path, fx, fy)) return i
    return null
  }
  const onMove = (e: RPointerEvent<HTMLElement>) => {
    if (st !== 'result' || e.pointerType === 'touch') return
    const i = cellAt(e)
    if (i !== hover) setHover(i)
  }
  const onDown = (e: RPointerEvent<HTMLElement>) => {
    if (st === 'idle' && tapToRun && !pinned) {
      run()
      return
    }
    if (st !== 'result') return
    const i = cellAt(e)
    setHover(i === hover && e.pointerType === 'touch' ? null : i)
  }

  // ---- the lens: one cell enlarged (the model's own 96 px crop window). While the line moves it shows the cell
  // just graded; afterwards the spikiest cell, or whichever cell is pointed at.
  const lensRef = useRef<HTMLCanvasElement>(null)
  const lead = useMemo(() => {
    let best = -1
    let bi: number | null = null
    cells.forEach((pc, i) => {
      const [cx, cy] = pc.c.center
      const edge = pc.c.border || cx < 48 || cy < 48 || cx > FIELD - 48 || cy > FIELD - 48
      const v = (isSpiky(pc.c.cls) ? 10 : 0) + pc.c.severity + pc.c.confidence * 0.01 - (edge ? 0.5 : 0)
      if (v > best) {
        best = v
        bi = i
      }
    })
    return bi
  }, [cells])
  const focus = hover ?? (prog.phase === 1 ? (prog.landed > 0 ? prog.landed - 1 : null) : prog.phase >= 2 ? lead : null)
  const lensOn = !bare && !lay.narrow && lay.sq >= 430
  useEffect(() => {
    const c = lensRef.current
    if (!c || !data || !lensOn) return
    const size = Math.round(c.clientWidth * dpr)
    if (size <= 0) return
    if (c.width !== size) c.width = c.height = size
    const ctx = c.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = colours.stage
    ctx.fillRect(0, 0, size, size)
    const pc = focus !== null ? cells[focus] : null
    if (!pc) return
    const win = 96
    const x0 = pc.c.center[0] - win / 2
    const y0 = pc.c.center[1] - win / 2
    const k = size / win
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(data.img, x0, y0, win, win, 0, 0, size, size)
    ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = colours.cls[pc.c.cls]
    ctx.shadowColor = colours.cls[pc.c.cls]
    ctx.shadowBlur = 7 * dpr
    ctx.lineWidth = (2.2 * dpr) / k
    ctx.stroke(pc.path)
  }, [focus, cells, data, colours, dpr, lensOn, lay.sq])
  const focusCell = focus !== null ? (cells[focus] ?? null) : null

  // ---- words
  const res = data?.res
  const m = res?.metrics
  const total = m?.n ?? 0
  const spikyAll = m ? m.counts.E1 + m.counts.E2 + m.counts.E3 + m.counts.E4 : 0
  const done = prog.phase >= 2
  const hot = hover !== null ? cells[hover] : null
  const hotCls = hot ? hot.c.cls : null
  const srcTag = !res ? '' : res.source === 'live' ? `LIVE ${res.timing.total.ms < 1000 ? `${Math.round(res.timing.total.ms)} ms` : `${(res.timing.total.ms / 1000).toFixed(1)} s`} · ${res.timing.total.backend === 'webgpu' ? 'WebGPU' : String(res.timing.total.backend)}` : 'REPLAY'
  const plain = (c: number) => {
    const s = spike.CLASS_PLAIN[CLASSES[c]]
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  const vars = { '--lens': `${Math.round(clamp(lay.sq * 0.24, 96, 140))}px`, '--sq': `${lay.sq}px`, '--cell': `${lay.cell}px`, '--pad': `${lay.pad}px`, '--gap': `${lay.gap}px` } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={className ? `scm ${className}` : 'scm'}
      style={{ ...vars, ...style }}
      data-ready={ready ? '1' : '0'}
      data-state={st}
      data-narrow={lay.narrow ? '1' : '0'}
      data-bare={bare ? '1' : '0'}
      data-phase={prog.phase}
      data-count={prog.landed}
      data-spiky={prog.spiky}
      data-source={res?.source ?? ''}
      data-pick={pick === null ? '' : CLASSES[pick]}
    >
      <div className="scm-main" data-qa="hero">
        <figure className="scm-pane scm-pane-a" onPointerMove={onMove} onPointerLeave={() => setHover(null)} onPointerDown={onDown}>
          <canvas ref={aRef} role="img" aria-label="Microscope photo of red blood cells, with the model's outline around every cell" />
          {!bare && (
            <figcaption className="scm-cap">
              <i>1</i>Microscope photo
            </figcaption>
          )}
          {!bare && st !== 'idle' && prog.phase >= 1 && (
            <span className="scm-live">
              <b>{prog.landed}</b> cells outlined
            </span>
          )}
        </figure>
        <figure className="scm-pane scm-pane-b" onPointerMove={onMove} onPointerLeave={() => setHover(null)} onPointerDown={onDown}>
          <canvas ref={bRef} role="img" aria-label="The same field as the model reads it: every cell lit in the colour of its grade" />
          {!bare && (
            <figcaption className="scm-cap">
              <i>2</i>As the model reads it
            </figcaption>
          )}
          {!bare && st === 'idle' && !failed && <span className="scm-wait">{tapToRun && !pinned ? 'Press to read this sample' : 'Not read yet'}</span>}
          {!bare && wait && (
            <span className="scm-wait is-busy" role="status">
              {wait}
            </span>
          )}
          {!bare && st !== 'idle' && prog.phase >= 1 && (
            <span className="scm-live">
              <b>{prog.spiky}</b> graded spiky
            </span>
          )}
          {!bare && hot && (
            <span className="scm-chip" style={{ left: `${(hot.c.center[0] / FIELD) * 100}%`, top: `${(Math.min(...hot.c.polygon.map((p) => p[1])) / FIELD) * 100}%`, '--c': colours.cls[hot.c.cls] } as CSSProperties}>
              <b>{plain(hot.c.cls)}</b>
              <em>{Math.round(hot.c.confidence * 100)}% sure</em>
            </span>
          )}
        </figure>

        {!bare && (
          <div className="scm-read" aria-live="polite">
            <div className="scm-num">
              <span className="scm-label">Spiky cells</span>
              {st === 'idle' || !m ? (
                <p className="scm-promise">{failed ? 'The stored outlines could not be loaded.' : promise}</p>
              ) : done ? (
                <p className="scm-hero is-final" key="final">
                  {m.spikyPct.toFixed(1)}
                  <sup>%</sup>
                </p>
              ) : (
                <p className="scm-hero" key="count">
                  {prog.spiky}
                </p>
              )}
              {st !== 'idle' && m && <span className="scm-sub">{done ? `${spikyAll} of ${total} cells` : wait ? 'waiting for the models' : `of ${prog.landed} cells so far`}</span>}
              {st !== 'idle' && m && (
                <div className="scm-bar" aria-hidden="true">
                  {CLASSES.map((c, i) => (
                    <i key={c} style={{ flexGrow: prog.counts[i], background: colours.cls[i] }} />
                  ))}
                  <i className="scm-bar-rest" style={{ flexGrow: Math.max(0, total - prog.landed) }} />
                </div>
              )}
            </div>
            {lensOn && (
              <div className="scm-lens" data-show={focusCell ? '1' : '0'} style={{ '--c': focusCell ? colours.cls[focusCell.c.cls] : 'transparent' } as CSSProperties}>
                <canvas ref={lensRef} aria-hidden="true" />
                <div className="scm-lens-text">
                  <span className="scm-label">{hover !== null ? 'This cell' : prog.phase === 1 ? 'Grading now' : focusCell && isSpiky(focusCell.c.cls) ? 'Highest grade found' : 'Point at any cell'}</span>
                  <b>{focusCell ? EXAMPLES[focusCell.c.cls].title : ''}</b>
                  {focusCell && <i>{EXAMPLES[focusCell.c.cls].note}</i>}
                  <em>{focusCell ? `${Math.round(focusCell.c.confidence * 100)}% sure` : ''}</em>
                </div>
              </div>
            )}
            {st === 'idle' && lensOn && !failed && (
              <div className="scm-lens scm-lens-idle" style={{ '--c': colours.cls[3] } as CSSProperties}>
                <img src={spike.ASSETS.url('gallery/E3_05.png')} alt="A real spiky red blood cell, grade 3, from the graded lab set" draggable={false} />
                <div className="scm-lens-text">
                  <span className="scm-label">Looking for</span>
                  <b>Spiky cells</b>
                  <i>like this real grade-3 cell</i>
                </div>
              </div>
            )}
            {st === 'idle' && !lay.narrow && !failed && (
              <div className="scm-how">
                <span className="scm-label">Two neural networks</span>
                <p>
                  <i>1</i>
                  <span>
                    <b>Outliner</b> draws a line around every cell
                  </span>
                </p>
                <p>
                  <i>2</i>
                  <span>
                    <b>Grader</b> names each cell’s shape
                  </span>
                </p>
              </div>
            )}
            <div className="scm-next" data-show={prog.phase >= 3 && data ? '1' : '0'}>
              <span className="scm-label">What to do next</span>
              <p className="scm-tier">{data?.decision.tierName ?? ''}</p>
              <p className="scm-headline">{data?.decision.headline ?? ''}</p>
              <span className="scm-tag">
                {srcTag}
                {res?.source === 'precomputed' ? ` · ${spike.HONESTY.precomputed}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {!bare && (
        <div className="scm-strip">
          <div className="scm-strip-head">
            <b>What “spiky” means</b>
            <span>real cells from the same lab set; experts and our model gave each the same grade</span>
            <div className="scm-ramp" aria-hidden="true">
              smooth<i />very spiky
            </div>
          </div>
          <div className="scm-strip-row" role="group" aria-label="Cell shapes, smooth to very spiky">
            {EXAMPLES.map((g, i) => (
              <button
                key={g.cls}
                type="button"
                className="scm-g"
                style={{ '--c': colours.cls[i] } as CSSProperties}
                aria-pressed={pick === i}
                data-hot={hotCls === i ? '1' : '0'}
                data-qa-skip={st !== 'result' ? '1' : undefined}
                disabled={st !== 'result'}
                aria-label={`${spike.CLASS_PLAIN[g.cls]}: ${st === 'idle' ? '' : `${prog.counts[i]} in this photo. `}Show only these cells`}
                onClick={() => setPick((p) => (p === i ? null : i))}
              >
                <span className="scm-g-cells">
                  {g.files.map((f) => (
                    <img key={f} src={spike.ASSETS.url(`gallery/${f}.png`)} alt="" draggable={false} loading="eager" />
                  ))}
                </span>
                <span className="scm-g-text">
                  <b>{g.title}</b>
                  <em>{g.note}</em>
                  {st !== 'idle' && (
                    <span className="scm-g-n" key={prog.counts[i]}>
                      {prog.counts[i]}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!bare && (
        <p className="scm-foot">
          {spike.HONESTY.data} {spike.HONESTY.notDiagnosis} {spike.HONESTY.oneFieldOneSample}
        </p>
      )}
    </div>
  )
}

// braindrift_w1 (FREE, immersive): the BrainDrift check as a place: a holographic brain inside a scanner bore.
// Every number on screen is read from the engine at run time (analyze / replay / act / fetchMeta / HONESTY).
import { useCallback, useEffect, useRef, useState } from 'react'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import * as bd from '../../engine/braindrift'
import type { BrainDriftAct, BrainDriftMeta, BrainMapResult, FlightResult, PvsResult } from '../../engine/braindrift'
import { CLASS_RGB, HeroScene, MiniViewer, NI, NJ, NK, paintSlice, type MiniItem } from './scene'
import './w1.css'

interface ProtoProps {
  view: string
  params: URLSearchParams
}
type Phase = 'idle' | 'running' | 'result' | 'error'
type Step = 'rest' | 'pre' | 'fly' | 'post' | 'done'

const SENTENCE = 'In flight the brain rises and its fluid spaces swell. Drag: the AI measures a simulated flight.'
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const BRAIN_D =
  'M78 196 C62 160 70 110 108 82 C146 54 210 52 246 80 C276 104 284 150 270 188 C262 206 244 212 226 206 C206 200 196 206 184 214 C160 226 128 222 108 214 C94 208 84 204 78 196 Z'
const signed = (x: number, d: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(d)}`

interface Paint {
  vol: Uint8Array | null
  seg: Uint8Array | null
  preSeg: Uint8Array | null
}

/** A real coronal MRI slice with the model's map, drawn from engine volumes. */
function SliceCanvas({ vol, seg, preSeg, k, label }: { vol: Uint8Array | null; seg: Uint8Array | null; preSeg?: Uint8Array | null; k: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c || !vol) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(NI, NJ)
    paintSlice(img.data, k, vol, seg, preSeg ?? null)
    ctx.putImageData(img, 0, 0)
  }, [vol, seg, preSeg, k])
  return <canvas ref={ref} width={NI} height={NJ} className="bw1-slicecv" role="img" aria-label={label} />
}

/** Before and after, one coronal slice each, scrubbed together through the whole brain (stored Model B maps). */
function SliceScrub({ story }: { story: FlightResult | null }) {
  const [k, setK] = useState(100)
  const [held, setHeld] = useState(false)
  const box = useRef<HTMLElement>(null)
  const ks = story ? bd.brainSlices(story.post.volume) : null
  const lo = ks ? ks[0] : 0
  const hi = ks ? ks[ks.length - 1] : NK - 1
  useEffect(() => {
    if (!story || held) return
    const el = box.current
    if (!el) return
    let raf = 0
    let on = false
    let t0 = 0
    const tick = (now: number) => {
      if (!on) return
      raf = requestAnimationFrame(tick)
      if (!t0) t0 = now
      const u = (now - t0) / 1000
      if (u < 1.2) return // hold the middle slice a moment first
      const mid = 100
      const amp = Math.min(48, mid - lo - 4, hi - mid - 4)
      setK(Math.round(mid + Math.sin((u - 1.2) * 0.55) * amp))
    }
    const io = new IntersectionObserver((es) => {
      const vis = es.some((e) => e.isIntersecting)
      if (vis && !on) {
        on = true
        t0 = 0
        raf = requestAnimationFrame(tick)
      } else if (!vis) {
        on = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(el)
    return () => {
      on = false
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [story, held, lo, hi])
  return (
    <figure className="bw1-card bw1-pair" ref={box}>
      <div className="bw1-pair-row">
        <div>
          <SliceCanvas vol={story?.pre.volume ?? null} seg={story?.pre.seg ?? null} k={k} label="Real MRI slice before flight with the model's map" />
          <span>Before flight</span>
        </div>
        <div>
          <SliceCanvas vol={story?.post.volume ?? null} seg={story?.post.seg ?? null} preSeg={story?.pre.seg ?? null} k={k} label="The same slice after the simulated flight with the model's map" />
          <span>
            After flight <b className="bw1-tag bw1-tag-sim">{bd.HONESTY.simulationBadge}</b>
          </span>
        </div>
      </div>
      <div className="bw1-scrub">
        <span className="bw1-scrub-k">
          Slice <b>{k}</b> of {NK}
        </span>
        <input
          type="range"
          min={lo}
          max={hi}
          step={1}
          value={k}
          aria-label="Move through the brain, front to back"
          onChange={(e) => {
            setHeld(true)
            setK(Number(e.target.value))
          }}
          style={{ ['--p' as string]: `${((k - lo) / Math.max(1, hi - lo)) * 100}%` }}
        />
        <span className="bw1-scrub-hint">{held ? 'front to back' : 'drag to move through the brain'}</span>
      </div>
      <figcaption>
        <b>One real brain the model never saw.</b> Blue is fluid as the model maps it; white is fluid that is here now and was not before. Maps: {bd.HONESTY.offlineReplay}.
      </figcaption>
    </figure>
  )
}

/** Mounts a MiniViewer when its canvas scrolls into view and pauses it when it leaves. */
function useMini(items: MiniItem[] | null, dist: number, spin: number) {
  const ref = useRef<HTMLCanvasElement>(null)
  const viewer = useRef<MiniViewer | null>(null)
  const key = items ? items.map((i) => i.url).join('|') : ''
  useEffect(() => {
    const c = ref.current
    if (!c || !items) return
    let v: MiniViewer | null = null
    const io = new IntersectionObserver(
      (es) => {
        const on = es.some((e) => e.isIntersecting)
        if (on && !v) {
          v = new MiniViewer(c, items, dist, spin)
          viewer.current = v
        }
        v?.setRunning(on)
      },
      { rootMargin: '200px' },
    )
    io.observe(c)
    return () => {
      io.disconnect()
      v?.dispose()
      viewer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dist, spin])
  return { ref, viewer }
}

export default function BrainDriftW1({ params }: ProtoProps) {
  const pinned = params.get('state') === 'result'
  const modeParam = params.get('mode')
  const [meta, setMeta] = useState<BrainDriftMeta | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [step, setStep] = useState<Step>('rest')
  const [frame, setFrame] = useState(0)
  const [result, setResult] = useState<FlightResult | null>(null)
  const [act, setAct] = useState<BrainDriftAct | null>(null)
  const [prog, setProg] = useState<{ done: number; total: number } | null>(null)
  const [liveRun, setLiveRun] = useState(false)
  const [story, setStory] = useState<FlightResult | null>(null)
  const [small, setSmall] = useState<BrainMapResult | null>(null)
  const [large, setLarge] = useState<BrainMapResult | null>(null)
  const [pvs, setPvs] = useState<PvsResult | null>(null)
  const [pvsView, setPvsView] = useState<'model' | 'expert'>('model')

  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sliceRef = useRef<HTMLCanvasElement>(null)
  const sliceKRef = useRef<HTMLSpanElement>(null)
  const pinVent = useRef<HTMLSpanElement>(null)
  const pinPlane = useRef<HTMLSpanElement>(null)
  const scene = useRef<HeroScene | null>(null)
  const paint = useRef<Paint>({ vol: null, seg: null, preSeg: null })
  const vols = useRef(new Map<number, Promise<Uint8Array>>())
  const busy = useRef(false)
  const metaRef = useRef<BrainDriftMeta | null>(null)
  const pinnedDone = useRef(false)

  const useLive = useCallback(() => {
    if (modeParam === 'live') return true
    if (modeParam === 'replay' || pinned) return false
    return !(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700)
  }, [modeParam, pinned])

  const vol = useCallback((n: number) => {
    const m = metaRef.current
    if (!m) return Promise.reject(new Error('no meta'))
    let p = vols.current.get(n)
    if (!p) {
      p = bd.fetchVolume(m.flight.frames[n].volume)
      vols.current.set(n, p)
    }
    return p
  }, [])

  // ---- meta + scene
  useEffect(() => {
    let dead = false
    bd.fetchMeta()
      .then((m) => {
        if (dead) return
        metaRef.current = m
        setMeta(m)
      })
      .catch(() => setPhase('error'))
    return () => {
      dead = true
    }
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !meta) return
    const sc = new HeroScene(c, {
      shellUrl: bd.assetUrl(meta.flight.brainMesh),
      ventUrls: meta.flight.frames.map((f) => bd.assetUrl(f.ventMesh)),
      maxMm: meta.flight.fieldFile.maxMm,
      onReady: () => setReady(true),
      onError: () => setPhase('error'),
    })
    scene.current = sc
    if (params.get('fx') === '0') sc.fx = false
    const s2d = sliceRef.current?.getContext('2d') ?? null
    const img = s2d ? s2d.createImageData(NI, NJ) : null
    sc.onSlice = (k, buf) => {
      const p = paint.current
      if (!p.vol) return
      paintSlice(buf, k, p.vol, p.seg, p.preSeg)
      if (s2d && img) {
        img.data.set(buf)
        s2d.putImageData(img, 0, 0)
      }
      if (sliceKRef.current) sliceKRef.current.textContent = String(k)
    }
    vol(0)
      .then((v) => {
        if (!paint.current.vol) {
          paint.current.vol = v
          sc.dirty = true
        }
      })
      .catch(() => {})
    sc.onPins = ({ vent, plane }) => {
      if (pinVent.current) pinVent.current.style.transform = `translate(${vent[0].toFixed(1)}px, ${vent[1].toFixed(1)}px)`
      if (pinPlane.current) pinPlane.current.style.transform = `translate(${plane[0].toFixed(1)}px, ${plane[1].toFixed(1)}px)`
    }
    const fit = () => {
      const wide = window.innerWidth >= 900
      sc.shiftX = wide ? 0.035 : 0
      sc.shiftY = wide ? -0.02 : 0
    }
    fit()
    window.addEventListener('resize', fit)
    // pause the hero when it scrolls away
    const io = new IntersectionObserver((es) => sc.setRunning(es.some((e) => e.isIntersecting)), { threshold: 0.02 })
    if (heroRef.current) io.observe(heroRef.current)
    return () => {
      window.removeEventListener('resize', fit)
      io.disconnect()
      sc.dispose()
      scene.current = null
    }
  }, [meta, vol])

  // ---- material for the scroll section (stored outputs of the same models)
  useEffect(() => {
    if (!meta) return
    let dead = false
    const keep = <T,>(set: (v: T) => void) => (v: unknown) => !dead && set(v as T)
    bd.replay('flight-f100').then(keep<FlightResult>(setStory)).catch(() => {})
    bd.replay('brain-small').then(keep<BrainMapResult>(setSmall)).catch(() => {})
    bd.replay('brain-large').then(keep<BrainMapResult>(setLarge)).catch(() => {})
    bd.replay('pvs-high').then(keep<PvsResult>(setPvs)).catch(() => {})
    return () => {
      dead = true
    }
  }, [meta])

  // ---- warm the model on laptops
  useEffect(() => {
    if (!ready || !useLive()) return
    const t = setTimeout(() => void bd.load().catch(() => {}), 900)
    return () => clearTimeout(t)
  }, [ready, useLive])

  const showFrame = useCallback(
    (n: number) => {
      const sc = scene.current
      const m = metaRef.current
      if (!sc || !m) return
      setFrame(n)
      sc.frame = n
      sc.fTarget = m.flight.frames[n].f
      vol(n)
        .then((v) => {
          if (sc.frame === n && !busy.current) {
            paint.current = { vol: v, seg: null, preSeg: null }
            sc.dirty = true
          }
        })
        .catch(() => {})
    },
    [vol],
  )

  const reset = useCallback(() => {
    if (busy.current) return
    const sc = scene.current
    setResult(null)
    setAct(null)
    setProg(null)
    setStep('rest')
    setPhase('idle')
    if (sc) {
      sc.idleSweep = true
      sc.glow = 0
      sc.scan = 0
      sc.cut = 0.78
    }
    showFrame(0)
  }, [showFrame])

  const run = useCallback(
    async (target: number, fly: boolean, forceReplay = false) => {
      const sc = scene.current
      const m = metaRef.current
      if (!sc || !m || busy.current || target < 1) return
      busy.current = true
      const frames = m.flight.frames
      const live = !forceReplay && useLive()
      setLiveRun(live)
      setPhase('running')
      setResult(null)
      setAct(null)
      setProg(null)
      sc.idleSweep = false
      sc.glow = 0
      sc.scan = 1
      sc.cut = 0.94
      const onProgress = (p: { slices: number[]; done: number; total: number; seg: Uint8Array }) => {
        paint.current.seg = p.seg
        sc.planeKTarget = p.slices[p.slices.length - 1]
        sc.dirty = true
        setProg({ done: p.done, total: p.total })
      }
      const flyTo = async () => {
        setStep('fly')
        setProg(null)
        for (let n = 1; n <= target; n++) {
          setFrame(n)
          sc.frame = n
          sc.fTarget = frames[n].f
          await sleep(pinned ? 0 : 430)
        }
      }
      try {
        let res: FlightResult
        if (live) {
          setStep('pre')
          setFrame(0)
          sc.frame = 0
          sc.fTarget = 0
          paint.current = { vol: await vol(0), seg: null, preSeg: null }
          sc.planeK = sc.planeKTarget = 30
          sc.dirty = true
          await bd.analyze(frames[0].id, { onProgress })
          await sleep(350)
          paint.current = { vol: paint.current.vol, seg: null, preSeg: null }
          sc.dirty = true
          if (fly) await flyTo()
          else {
            setFrame(target)
            sc.frame = target
            sc.fTarget = frames[target].f
          }
          setStep('post')
          paint.current = { vol: await vol(target), seg: null, preSeg: null }
          sc.planeK = sc.planeKTarget = 30
          sc.dirty = true
          res = (await bd.analyze(frames[target].id, { onProgress })) as FlightResult
        } else {
          if (fly) await flyTo()
          else {
            setFrame(target)
            sc.frame = target
            sc.fTarget = frames[target].f
          }
          res = (await bd.replay(frames[target].id)) as FlightResult
          setStep('post')
          paint.current = { vol: res.post.volume, seg: res.post.seg, preSeg: null }
          const ks = bd.brainSlices(res.post.volume)
          if (!pinned) {
            sc.planeK = sc.planeKTarget = ks[0]
            const t0 = performance.now()
            const dur = 2400
            while (performance.now() - t0 < dur) {
              const u = (performance.now() - t0) / dur
              const n = Math.min(ks.length - 1, Math.floor(u * ks.length))
              sc.planeKTarget = ks[n]
              setProg({ done: n + 1, total: ks.length })
              await sleep(60)
            }
          }
          setProg({ done: ks.length, total: ks.length })
        }
        paint.current = { vol: res.post.volume, seg: res.post.seg, preSeg: res.pre.seg }
        sc.planeKTarget = 100
        if (pinned) {
          sc.planeK = 100
          sc.f = frames[target].f
        }
        sc.glow = 1
        sc.scan = 0.3
        sc.dirty = true
        setResult(res)
        setAct(bd.act(res))
        setStep('done')
        setPhase('result')
        busy.current = false
      } catch {
        busy.current = false
        if (live) return run(target, false, true) // any model failure: the stored outputs of the same model
        setPhase('error')
      }
    },
    [pinned, useLive, vol],
  )

  // pinned result for screenshots and deep links: ?state=result
  useEffect(() => {
    if (!pinned || !ready || pinnedDone.current) return
    pinnedDone.current = true
    void run(4, true)
  }, [pinned, ready, run])

  // ---- small viewers
  const compareItems: MiniItem[] | null = meta
    ? [
        { url: bd.assetUrl(meta.compare[0].ventMesh), kind: 'solid', color: 0x2fc8f5, x: -92 },
        { url: bd.assetUrl(meta.compare[1].ventMesh), kind: 'solid', color: 0x2fc8f5, x: 92 },
      ]
    : null
  const cmp = useMini(compareItems, 560, 0.3)
  const pvsItems: MiniItem[] | null = pvs
    ? [
        { url: bd.assetUrl(pvs.meshes.shell), kind: 'glass', color: 0x3f6dff },
        { url: bd.assetUrl(pvs.meshes.model), kind: 'glow', color: 0xffa838, group: 'model' },
      ]
    : null
  const web = useMini(pvsItems, 470, 0.22)
  const togglePvs = (which: 'model' | 'expert') => {
    setPvsView(which)
    const v = web.viewer.current
    if (!v || !pvs) return
    if (which === 'expert' && !v.has('expert')) {
      void v.add({ url: bd.assetUrl(pvs.meshes.expert), kind: 'glow', color: 0x5dffb4, group: 'expert' }).then(() => v.show('expert'))
    } else v.show(which)
  }

  // ---- derived text (engine values only)
  const frames = meta?.flight.frames ?? []
  const cur = frames[frame]
  const running = phase === 'running'
  const liveTag = result ? (result.live ? 'LIVE' : 'REPLAY') : null
  const changePct = result?.measured.ventricleChangePct ?? null
  const riseMm = result?.measured.riseMm ?? null
  const status =
    phase === 'error'
      ? 'The scan files did not load. Reload the page.'
      : step === 'pre'
        ? prog
          ? `Pre-flight scan first: the AI is mapping slice ${prog.done} of ${prog.total}`
          : 'Loading the model for the pre-flight scan'
        : step === 'fly'
          ? 'Flying the brain: we put the published change in'
          : step === 'post'
            ? prog
              ? liveRun
                ? `The AI is mapping slice ${prog.done} of ${prog.total}`
                : `The AI's stored map of this brain: slice ${prog.done} of ${prog.total}`
              : 'The AI is reading the flown brain'
            : step === 'done'
              ? 'Measured. Drag back to before flight, or fly again.'
              : frame > 0
                ? 'Let go: the AI measures what changed.'
                : 'Press, or drag to after flight: the AI measures what changed.'
  const otherRows = act ? act.rows.filter((r) => !act.headline.includes(r.actions[0]) && r.tier > 0) : []
  
  return (
    <div className="bw1" ref={rootRef} data-ready={ready && (!pinned || phase === 'result') ? '1' : '0'} data-state={phase} data-step={step} data-frame={frame}>
      <section className="bw1-hero" ref={heroRef}>
        <canvas ref={canvasRef} className="bw1-gl" data-qa="hero" aria-label="A real brain surface with the model's fluid spaces inside; drag to turn it" />
        <div className="bw1-veil" aria-hidden="true" />
        <div className="bw1-pins" aria-hidden="true">
          <span className="bw1-pin bw1-pin-vent" ref={pinVent}>
            <s />
            <i />
            <b>Fluid spaces</b>
            <em>the model&rsquo;s 3D map</em>
          </span>
          <span className="bw1-pin bw1-pin-plane" ref={pinPlane}>
            <i />
            <b>Scan plane</b>
            <em>real MRI, coloured by the model</em>
          </span>
        </div>

        <header className="bw1-top">
          <a className="bw1-back" href="#/">
            <span aria-hidden="true">&larr;</span> All checks
          </a>
          <span className="bw1-crumb">SuperHumans &middot; check 05 of 06 &middot; brain MRI</span>
        </header>

        <div className="bw1-left">
          <p className="bw1-eyebrow">Brain &middot; fluid shift</p>
          <h1 className="bw1-h1">
            Brain<em>Drift</em>
          </h1>
          <p className="bw1-sentence">{SENTENCE}</p>

          <div className="bw1-flight">
            <div className="bw1-btns">
              <button type="button" className="bw1-go" data-qa="primary" disabled={running || !ready} onClick={() => (phase === 'result' ? (reset(), setTimeout(() => void run(4, true), 60)) : void run(4, true))}>
                <span className="bw1-go-dot" aria-hidden="true" />
                {running ? 'Measuring…' : phase === 'result' ? 'Fly again' : 'Fly this brain'}
              </button>
              <button type="button" className="bw1-ghost" disabled={running || (phase === 'idle' && frame === 0)} onClick={reset}>
                Before flight
              </button>
            </div>
            <div className="bw1-track">
              <input
                type="range"
                min={0}
                max={Math.max(1, frames.length - 1)}
                step={1}
                value={frame}
                disabled={running || !ready}
                aria-label="Flight: before flight to after flight (simulated)"
                aria-valuetext={cur ? (frame === 0 ? 'before flight' : `we put in ${signed(cur.injectedVentricleChangePct, 2)}%`) : ''}
                style={{ ['--p' as string]: `${(frame / Math.max(1, frames.length - 1)) * 100}%` }}
                onChange={(e) => {
                  if (busy.current) return
                  if (phase === 'result') {
                    setResult(null)
                    setAct(null)
                    setStep('rest')
                    setPhase('idle')
                    if (scene.current) scene.current.glow = 0
                  }
                  showFrame(Number(e.target.value))
                }}
                onPointerUp={() => (frame > 0 && phase === 'idle' ? void run(frame, false) : frame === 0 && reset())}
                onKeyUp={(e) => (e.key === 'Enter' || e.key === ' ') && frame > 0 && phase === 'idle' && void run(frame, false)}
              />
              <div className="bw1-ends">
                <span>Before flight</span>
                <span>
                  After flight <b className="bw1-tag bw1-tag-sim" title={bd.HONESTY.flightFrame}>{bd.HONESTY.simulationBadge}</b>
                </span>
              </div>
            </div>
            <p className="bw1-status" aria-live="polite">
              {running && <i className="bw1-pulse" aria-hidden="true" />}
              {status}
            </p>
            {cur && frame > 0 && (
              <p className="bw1-putin">
                We put in <b>{signed(cur.injectedVentricleChangePct, cur.citedNumbers ? 1 : 2)}%</b> fluid spaces and a <b>{cur.injectedRiseMm.toFixed(2)} mm</b> rise
                {cur.citedNumbers ? ' (published values).' : `: ${bd.HONESTY.middleFrames}.`}
              </p>
            )}
          </div>
        </div>

        <aside className="bw1-right" aria-live="polite">
          <div className={`bw1-read ${result ? 'is-on' : ''}`}>
            <p className="bw1-kicker">
              {liveTag && (
                <b className={`bw1-tag ${result?.live ? 'bw1-tag-live' : ''}`} title={result?.live ? 'Measured in this browser just now' : bd.HONESTY.offlineReplay}>
                  {liveTag}
                </b>
              )}
              {result ? 'Measured by the AI' : running ? 'The flight, step by step' : 'Waiting for a flight'}
            </p>
            {result && changePct !== null ? (
              <>
                <p className="bw1-big">
                  {signed(changePct, 2)}
                  <span>%</span>
                </p>
                <p className="bw1-bigcap">
                  fluid spaces: {result.pre.ventricleMl.toFixed(2)} mL <span aria-hidden="true">&rarr;</span> {result.post.ventricleMl.toFixed(2)} mL
                </p>
                <p className="bw1-vs">
                  we put in <b>{signed(result.injected.ventricleChangePct, result.citedNumbers ? 1 : 2)}%</b>
                  {result.citedNumbers ? ' (published, long-duration flights)' : ', for illustration'}
                </p>
                {riseMm !== null && (
                  <div className="bw1-second">
                    <p className="bw1-mid">
                      {riseMm.toFixed(2)}
                      <span> mm</span>
                    </p>
                    <p className="bw1-vs">
                      the brain&rsquo;s top rose; we put in <b>{result.injected.riseMm.toFixed(2)} mm</b>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <ol className="bw1-steps">
                <li className={step === 'pre' ? 'is-now' : ''}>
                  <b>01</b> The AI maps the brain before flight
                </li>
                <li className={step === 'fly' ? 'is-now' : ''}>
                  <b>02</b> We fly it: a simulation built on published values
                </li>
                <li className={step === 'post' ? 'is-now' : ''}>
                  <b>03</b> The AI maps it again and measures the change
                </li>
              </ol>
            )}
          </div>

          {act && result && (
            <div className={`bw1-act sev-${act.severity}`}>
              <p className="bw1-kicker">
                What to do next <span className="bw1-who">{act.whoActs}</span>
              </p>
              <p className="bw1-acthead">{act.headline}</p>
              {otherRows.length > 0 && (
                <ul className="bw1-actrows">
                  {otherRows.slice(0, 3).map((r) => (
                    <li key={r.tierName}>{r.actions[0]}</li>
                  ))}
                </ul>
              )}
              <p className="bw1-fine">{bd.ACT_CAVEATS[3]}</p>
            </div>
          )}
        </aside>

        <div className="bw1-probe">
          <div className="bw1-probe-cv">
            <canvas ref={sliceRef} width={NI} height={NJ} aria-label="The scan plane: a real MRI slice with the model's map" role="img" />
          </div>
          <div className="bw1-probe-txt">
            <p className="bw1-kicker">
              Scan plane &middot; slice <span ref={sliceKRef}>104</span> of {NK}
            </p>
            <p className="bw1-probe-line">Real MRI. The colours are the model&rsquo;s map.</p>
            <ul className="bw1-legend">
              {bd.CLASS_NAMES.slice(1).map((n, i) => (
                <li key={n}>
                  <i style={{ background: `rgb(${CLASS_RGB[i + 1].join(',')})` }} />
                  {i === 0 ? 'fluid spaces (ventricles)' : n}
                </li>
              ))}
              <li>
                <i style={{ background: '#fff' }} />
                fluid here now, not before
              </li>
            </ul>
          </div>
        </div>

        <div className={`bw1-heat ${frame > 0 ? 'is-on' : ''}`}>
          <span className="bw1-heatbar" aria-hidden="true" />
          <span className="bw1-heatnum">0 &ndash; {meta ? meta.flight.fieldFile.maxMm.toFixed(2) : ''} mm upward shift</span>
          <span className="bw1-heatnote">{bd.HONESTY.fieldIsInjected}</span>
        </div>

        <a className="bw1-cue" href="#bw1-story" onClick={(e) => (e.preventDefault(), document.getElementById('bw1-story')?.scrollIntoView({ behavior: 'smooth' }))}>
          Why the brain drifts <span aria-hidden="true">&darr;</span>
        </a>
      </section>

      {/* ------------------------------------------------------------ the walk-through */}
      <section className="bw1-story" id="bw1-story">
        <div className="bw1-chap">
          <p className="bw1-eyebrow">The problem</p>
          <h2 className="bw1-h2">
            In flight, the brain <em>moves</em>.
          </h2>
          <p className="bw1-lede">It rises inside the skull, and the fluid spaces at its centre swell. Nobody on board can see it happen.</p>
        </div>

        <div className="bw1-trio">
          <figure className="bw1-card bw1-diagram">
            <svg viewBox="0 0 320 300" role="img" aria-label="Schematic, side view: the brain rises inside the skull and its fluid spaces swell">
              <defs>
                <radialGradient id="bw1g" cx="46%" cy="40%" r="62%">
                  <stop offset="0" stopColor="#6d8cff" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#1a2a6a" stopOpacity="0.08" />
                </radialGradient>
                <linearGradient id="bw1v" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#b9f4ff" />
                  <stop offset="1" stopColor="#3fc6f2" />
                </linearGradient>
              </defs>
              <path d="M52 214 C30 150 46 76 106 44 C158 18 232 26 270 64 C306 100 310 168 290 216" className="bw1-skull" />
              <path d={BRAIN_D} className="bw1-ghost-brain" />
              <g className="bw1-rise">
                <path d={BRAIN_D} fill="url(#bw1g)" className="bw1-brain" />
                <path d="M100 120 C116 112 126 124 140 112 M176 88 C186 100 204 92 214 104 M228 128 C240 140 254 136 262 150 M96 168 C110 158 124 172 138 162 M150 74 C150 86 162 92 160 104" className="bw1-gyri" />
                <path d="M216 216 C234 208 260 212 264 228 C266 246 240 254 220 248 C206 244 204 222 216 216 Z" className="bw1-cbl" />
                <path d="M182 214 C190 232 190 258 186 290 L168 290 C170 262 168 236 164 220 Z" className="bw1-stem" />
                <g className="bw1-swell">
                  <path d="M124 152 C134 124 186 112 212 138 C220 148 212 160 200 154 C186 140 154 140 144 156 C150 170 160 178 156 192 C150 196 138 180 132 168 C126 162 122 158 124 152 Z" className="bw1-vent" fill="url(#bw1v)" />
                </g>
              </g>
              <path d="M160 24 V 6" className="bw1-arrow" />
              <path d="M160 6 l-6 9 M160 6 l6 9" className="bw1-arrow" />
              <text x="12" y="80" className="bw1-svgt">skull</text>
              <text x="12" y="292" className="bw1-svgt">dashed: before flight</text>
              <text x="214" y="176" className="bw1-svgt bw1-svgt-c">fluid spaces</text>
            </svg>
            <figcaption>
              <b>Side view: the brain rises, its fluid spaces swell.</b> Schematic, exaggerated to be seen.
            </figcaption>
            <span className="bw1-ai">AI-generated illustration</span>
          </figure>

          <SliceScrub story={story} />

          <div className="bw1-card bw1-facts">
            {meta && frames[4] && (
              <>
                <p className="bw1-fact">
                  <b>{frames[4].injectedVentricleChangePct.toFixed(1)}%</b>
                  <span>larger fluid spaces after long-duration flights (Roberts 2019)</span>
                </p>
                <p className="bw1-fact">
                  <b>
                    {meta.flight.fieldFile.maxMm.toFixed(2)} <small>mm</small>
                  </b>
                  <span>upward shift, one-year crew (PNAS 2026)</span>
                </p>
              </>
            )}
            <p className="bw1-fact bw1-fact-zero">
              <b>0</b>
              <span>MRI scanners in orbit. {bd.HONESTY.noOrbitMri}</span>
            </p>
          </div>
        </div>

        <div className="bw1-chap bw1-chap-2">
          <p className="bw1-eyebrow">The range</p>
          <h2 className="bw1-h2">
            Real brains, <em>measured</em>.
          </h2>
        </div>
        <div className="bw1-duo">
          <div className="bw1-card bw1-stage">
            <canvas ref={cmp.ref} className="bw1-mini" aria-label="The fluid spaces of two real brains as the model maps them, side by side" role="img" />
            <div className="bw1-stage-cap">
              <p>
                <b>{small ? small.ventricleMl.toFixed(1) : '…'} mL</b>
                <span>smallest fluid spaces in our test set{small?.reference?.freesurferVentricleMl ? ` · FreeSurfer reference ${small.reference.freesurferVentricleMl} mL` : ''}</span>
              </p>
              <p>
                <b>{large ? large.ventricleMl.toFixed(1) : '…'} mL</b>
                <span>largest{large?.reference?.freesurferVentricleMl ? ` · FreeSurfer reference ${large.reference.freesurferVentricleMl} mL` : ''}</span>
              </p>
            </div>
            <span className="bw1-corner">Model B fluid-space surfaces, same scale &middot; {bd.HONESTY.offlineReplay}</span>
          </div>
          <div className="bw1-card bw1-stage bw1-web">
            <canvas ref={web.ref} className="bw1-mini" aria-label="A glass brain with the fluid channels around small vessels glowing inside" role="img" />
            <div className="bw1-stage-cap bw1-web-cap">
              <p>
                <b>{pvs ? (pvsView === 'model' ? pvs.modelChannels : pvs.expertChannels).toLocaleString('en-US') : '…'}</b>
                <span>fluid channels around small vessels in one person, {pvsView === 'model' ? 'found by our second model' : 'marked by the expert'}</span>
              </p>
              <div className="bw1-seg" role="group" aria-label="Whose map">
                <button type="button" aria-pressed={pvsView === 'model'} onClick={() => togglePvs('model')}>
                  Model
                </button>
                <button type="button" aria-pressed={pvsView === 'expert'} onClick={() => togglePvs('expert')}>
                  Expert
                </button>
              </div>
            </div>
            <span className="bw1-corner">{bd.HONESTY.modelA}</span>
          </div>
        </div>

        <div className="bw1-chap bw1-chap-2">
          <p className="bw1-eyebrow">The work behind it</p>
          <h2 className="bw1-h2">
            A real model, <em>honestly</em> tested.
          </h2>
        </div>
        <div className="bw1-work">
          <div className="bw1-card">
            <p className="bw1-kicker">The model</p>
            <p className="bw1-worklead">{bd.HONESTY.modelBTested}</p>
            <p className="bw1-fine">{bd.info.notes?.split('. ')[0]}.</p>
            <p className="bw1-fine">{bd.HONESTY.modelB}</p>
          </div>
          <div className="bw1-card">
            <p className="bw1-kicker">
              The flight <b className="bw1-tag bw1-tag-sim">{bd.HONESTY.simulationBadge}</b>
            </p>
            <p className="bw1-fine bw1-fine-lg">{bd.HONESTY.flightFrame}</p>
          </div>
          <div className="bw1-card">
            <p className="bw1-kicker">What it is not</p>
            <p className="bw1-fine bw1-fine-lg">{bd.HONESTY.noDiagnosis}</p>
            <p className="bw1-fine">{bd.HONESTY.noAlignment}</p>
            <p className="bw1-fine">{bd.HONESTY.pvsBand}</p>
          </div>
        </div>
        {pvs && (
          <figure className="bw1-card bw1-montage">
            <img src={bd.assetUrl(pvsView === 'model' ? pvs.axial.model : pvs.axial.expert)} alt="Twelve real MRI levels of one person with the fluid channels marked" loading="lazy" />
            <figcaption>
              <b>Levels of one real scan.</b> The marked dots are the channels; {bd.HONESTY.modelADisclosure}.
            </figcaption>
          </figure>
        )}
        <p className="bw1-credits">
          Data and tools: OASIS-1 (Marcus 2007) and neurite-oasis (Hoopes 2021), OASIS Data Use Terms &middot; OpenNeuro ds005595 (Chai et al., CC0) &middot; ds000239 (Maclaren 2014, CC0) &middot; nnU-Net ResEnc (Isensee) &middot; OpenMind
          (Wald et al. 2025, CC-BY-4.0) &middot; MobileNetV4 and timm (Apache-2.0) &middot; HD-BET (Apache-2.0) &middot; onnxruntime-web (MIT) &middot; three.js (MIT). Simulation values: PNAS 2026 and Roberts 2019.
        </p>
        <a className="bw1-top-link" href="#bw1-top" onClick={(e) => (e.preventDefault(), rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))}>
          <span aria-hidden="true">&uarr;</span> Back to the check
        </a>
      </section>
    </div>
  )
}

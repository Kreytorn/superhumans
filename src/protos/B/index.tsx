// Prototype B, "Body Map": a paper figure on which each check lives where it is taken; pressing a spot opens
// the real sample from that spot. Routes: #/proto/B/home, #/proto/B/spikecount, #/proto/B/<module> (preview).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Person } from '@phosphor-icons/react/dist/csr/Person'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource-variable/instrument-sans/index.css'
import './b.css'
import type { ProtoProps } from '../../App'
import * as spike from '../../engine/spikecount'
import type { SpikeCell, SpikeResult } from '../../engine/spikecount'
import { navigate, setParam } from '../../lib/route'
import { BLOOD_PHOTO, CHECKS, FIG_H, FIG_W, SAMPLE, STATUS_WORD, checkById, route, type Check, type CheckId } from './data'
import { Cells, Figure, Key, Layer, Mark, Poster, SiteMark, StatusLadder, Tag, cellsEnd, resolvePoster } from './parts'
import { Spike, canRunLive, prewarm } from './Spike'
import { Bubble } from './Bubble'
import { Track } from './Track'

type Phase = 'idle' | 'running' | 'result' | 'error'
type Report = (ready: boolean, state: Phase) => void
interface Point {
  x: number
  y: number
}
interface OpeningState extends Point {
  id: CheckId
  rect: DOMRect
  /** what the stage showed at the press: the blood photo with its stored outlines */
  cells: SpikeCell[]
}
type Open = (id: CheckId, from: (() => Point) | null, cells?: SpikeCell[]) => void

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches
const BLOOD = checkById('spikecount')!

export default function ProtoB({ view, params }: ProtoProps) {
  const v = view.split('/')[0] || 'home'
  const check = checkById(v)
  const kind = v === 'spikecount' ? 'spikecount' : v === 'tracktrace' ? 'tracktrace' : v === 'bubblegrade' ? 'bubblegrade' : check ? 'preview' : 'home'
  const [hook, setHook] = useState<{ ready: boolean; state: Phase }>({ ready: false, state: 'idle' })
  const report = useCallback<Report>((ready, state) => setHook((h) => (h.ready === ready && h.state === state ? h : { ready, state })), [])
  const [opening, setOpening] = useState<OpeningState | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const still = params.has('state') || params.has('t')

  // The page behind the root takes the paper colour while this prototype is mounted (and gives it back).
  useEffect(() => {
    const before = document.body.style.background
    document.body.style.background = '#E8E4DC'
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#E8E4DC'
    document.head.appendChild(meta)
    return () => {
      document.body.style.background = before
      meta.remove()
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [v])

  // Press the body: the route changes at once, and the sample grows out of the pressed site until it is the stage.
  const open = useCallback<Open>((id, from, cells = []) => {
    if (id !== 'spikecount' && from && !reducedMotion()) {
      window.scrollTo(0, 0)
      const stage = root.current?.querySelector('.pb-stage')
      if (stage) setOpening({ id, ...from(), rect: stage.getBoundingClientRect(), cells })
    }
    navigate(`proto/B/${id}`)
  }, [])
  const closeOpening = useCallback(() => setOpening(null), [])

  // If the visitor leaves the opened check before the opening has finished, drop the opening.
  const arrived = useRef(false)
  useEffect(() => {
    if (!opening) arrived.current = false
    else if (v === opening.id) arrived.current = true
    else if (arrived.current) setOpening(null)
  }, [v, opening])

  return (
    <div ref={root} className="pb" data-view={kind} data-ready={hook.ready ? '1' : undefined} data-state={hook.state} data-still={still ? '1' : undefined}>
      {kind === 'spikecount' ? (
        <Spike key="spikecount" params={params} report={report} />
      ) : kind === 'tracktrace' ? (
        <Track key="tracktrace" params={params} report={report} />
      ) : kind === 'bubblegrade' ? (
        <Bubble key="bubblegrade" params={params} report={report} />
      ) : kind === 'preview' ? (
        <Preview key={v} check={check!} params={params} report={report} />
      ) : (
        <Home key="home" params={params} report={report} onOpen={open} />
      )}
      {opening && <Opening {...opening} onDone={closeOpening} />}
    </div>
  )
}

function useFonts() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all([document.fonts.load('600 40px "Bricolage Grotesque Variable"'), document.fonts.load('500 16px "Instrument Sans Variable"')])
      .catch(() => null)
      .then(() => document.fonts.ready)
      .then(() => live && setOk(true))
    return () => {
      live = false
    }
  }, [])
  return ok
}

// ------------------------------------------------------------------ Home
function Home({ params, report, onOpen }: { params: URLSearchParams; report: Report; onOpen: Open }) {
  const layer = params.get('layer') === 'how'
  const settle = params.has('state') || params.has('t')
  const fontsOk = useFonts()
  const [photoOk, setPhotoOk] = useState(false)
  const [dataOk, setDataOk] = useState(false)
  const [result, setResult] = useState<SpikeResult | null>(null)
  const [t, setT] = useState(0)
  const [active, setActive] = useState<CheckId | null>(null)
  const [shown, setShown] = useState<Check | null>(null)
  const figBox = useRef<HTMLDivElement>(null)

  // Stored outputs only: the same result replay() gives. Home never waits for a model.
  useEffect(() => {
    let live = true
    spike
      .replay(SAMPLE)
      .then((r) => live && setResult(r))
      .catch(() => null)
      .then(() => live && setDataOk(true))
    return () => {
      live = false
    }
  }, [])

  // The stored outlines draw in once, in the model's own cell order.
  useEffect(() => {
    if (!result || !photoOk) return
    if (settle || reducedMotion()) return setT(Infinity)
    const end = cellsEnd(result.cells.length)
    const t0 = performance.now()
    let raf = requestAnimationFrame(function tick() {
      const now = performance.now() - t0
      if (now >= end) return setT(Infinity)
      setT(now)
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [result, photoOk, settle])

  const ready = photoOk && fontsOk && dataOk
  const urlState = params.get('state') === 'result' ? 'result' : 'idle'
  useEffect(() => report(ready, urlState), [ready, urlState, report])

  // The other five stills load quietly after the first paint, so a press or a hover shows them at once.
  useEffect(() => {
    if (!ready) return
    for (const c of CHECKS) if (c.id !== 'spikecount') void resolvePoster(c)
  }, [ready])

  // On a laptop the two blood models load quietly (in a worker) once Home is up, so the press in the blood check answers at once.
  useEffect(() => {
    if (!ready || settle || !canRunLive()) return
    const id = window.setTimeout(() => void prewarm(), 300)
    return () => clearTimeout(id)
  }, [ready, settle])

  const preview = active && active !== 'spikecount' ? checkById(active)! : null
  useEffect(() => {
    if (preview) setShown(preview)
  }, [preview])
  const onStage = preview ?? BLOOD

  const siteOf = (id: CheckId) => () => {
    const c = checkById(id)!
    const r = figBox.current?.getBoundingClientRect()
    return r ? { x: r.left + (c.site[0] / FIG_W) * r.width, y: r.top + (c.site[1] / FIG_H) * r.height } : { x: 0, y: 0 }
  }
  const go = (id: CheckId) => onOpen(id, siteOf(id), result?.cells)
  const hover = (id: CheckId | null) => finePointer() && setActive(id)
  const spikyPct = (result?.metrics.spikyPct ?? spike.FIELDS.find((f) => f.field === 96)!.modelSpikyPct).toFixed(1)
  const beforePct = spike.DEFAULT_BASELINES.model.spikyPct.toFixed(1)

  return (
    <>
      <div className="pb-stage pb-stage-home" data-qa="hero" onClick={() => go(onStage.id)}>
        <img className="pb-photo" src={BLOOD_PHOTO()} alt="Microscope photo of red blood cells, each one outlined" draggable={false} onLoad={() => setPhotoOk(true)} onError={() => setPhotoOk(true)} />
        {result && <Cells cells={result.cells} t={t} />}
        <div className="pb-preview" data-show={preview ? '1' : '0'}>
          {shown && <Poster check={shown} />}
        </div>
        <div className="pb-tab">
          <p className="pb-tab-line">
            {preview ? (
              preview.specimen
            ) : (
              <>
                <Key /> <Tag>REPLAY</Tag>
                <br />
                Blood check: <b>{spikyPct}%</b> spiky<span className="pb-wide"> cells</span>
                {`; ${beforePct}% before flight`}
              </>
            )}
          </p>
          <a
            className="pb-btn"
            data-qa="primary"
            href={route(onStage.id)}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              go(onStage.id)
            }}
          >
            Open the {onStage.short} check
          </a>
        </div>
      </div>

      <section className="pb-paper pb-home">
        <h1 className="pb-say">
          Six AI health checks for astronauts<span className="pb-wide">, running in your browser.</span>
        </h1>
        <p className="pb-state">
          Five are quiet. One asks for the crew medic. <Tag>Illustrative</Tag>
        </p>
        <div className="pb-map">
          <div className="pb-fig-box" ref={figBox}>
            <Figure active={active} />
            {CHECKS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pb-site"
                tabIndex={-1}
                aria-hidden="true"
                data-active={active === c.id ? '1' : '0'}
                style={{ left: `${(c.site[0] / FIG_W) * 100}%`, top: `${(c.site[1] / FIG_H) * 100}%` }}
                onClick={() => go(c.id)}
                onMouseEnter={() => hover(c.id)}
                onMouseLeave={() => hover(null)}
              >
                <SiteMark status={c.status} />
              </button>
            ))}
          </div>
          <nav className="pb-labels" aria-label="The six checks">
            {CHECKS.map((c) => (
              <a
                key={c.id}
                className="pb-label"
                href={route(c.id)}
                data-active={active === c.id ? '1' : '0'}
                data-ask={c.status !== 'you' ? '1' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  go(c.id)
                }}
                onMouseEnter={() => hover(c.id)}
                onMouseLeave={() => hover(null)}
                onFocus={() => setActive(c.id)}
                onBlur={() => setActive(null)}
              >
                <span className="pb-label-name">{c.name}</span>
                <br />
                <span className="pb-label-status">
                  <Mark status={c.status} size={12} /> {STATUS_WORD[c.status]}
                </span>
              </a>
            ))}
          </nav>
          <p className="pb-ai">AI-generated illustration</p>
        </div>
        <div className="pb-foot">
          <button type="button" className="pb-how-btn" aria-haspopup="dialog" aria-expanded={layer} onClick={() => setParam('layer', 'how')}>
            How do we know?
          </button>
        </div>
      </section>

      <Layer open={layer} onClose={() => setParam('layer', undefined)}>
        <div className="pb-how-body">
          <section>
            <h3>What you are looking at</h3>
            <p>The crew state on this page is a scripted demo: five checks quiet, one asking. It is not measured on a crew. Every sample is real research data, never astronaut data.</p>
            <p>The outlines on the blood photo are stored outputs of the same two models, so this page never waits for a model. On a laptop the two blood models load in the background, so the blood check answers at once.</p>
          </section>
          <section>
            <h3>The six checks</h3>
            <ul className="pb-list">
              {CHECKS.map((c) => (
                <li key={c.id}>
                  <b>{c.name}.</b> {c.evidence}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Where it runs</h3>
            <p>The models run in your browser, with no server. On a phone four checks show stored outputs, marked REPLAY.</p>
          </section>
          <section>
            <h3>Who acts</h3>
            <StatusLadder />
          </section>
          <section>
            <h3>The blood photo</h3>
            <p>{spike.HONESTY.data}</p>
          </section>
          <section>
            <h3>Credits</h3>
            <p className="pb-src">
              Built with AI assistance (Claude), disclosed in full in our submission. The body figure is an AI-generated illustration. Type: Bricolage Grotesque and Instrument Sans (SIL Open Font License). Icons: Phosphor (MIT). No NASA
              logos or insignia are used.
            </p>
          </section>
        </div>
      </Layer>
    </>
  )
}

// ------------------------------------------------------------------ the other five checks: a short preview
function Preview({ check, params, report }: { check: Check; params: URLSearchParams; report: Report }) {
  const fontsOk = useFonts()
  const [posterOk, setPosterOk] = useState(false)
  const onReady = useCallback(() => setPosterOk(true), [])
  const ready = fontsOk && posterOk
  const urlState = params.get('state') === 'result' ? 'result' : 'idle'
  useEffect(() => report(ready, urlState), [ready, urlState, report])
  return (
    <>
      <div className="pb-stage" data-qa="hero">
        <Poster check={check} onReady={onReady} />
      </div>
      <section className="pb-paper pb-check pb-soon">
        <a className="pb-back" href={route('home')}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          <Person size={20} weight="fill" aria-hidden="true" />
          <span>Body</span>
        </a>
        <h1 className="pb-say pb-say-long">{check.sentence}</h1>
        <p className="pb-soon-line">The full {check.short} check arrives in the complete build.</p>
        <a className="pb-btn" data-qa="primary" href={route('home')}>
          Back to the body
        </a>
        <a className="pb-how-btn" href={route('spikecount')}>
          The blood check is ready: open it
        </a>
      </section>
    </>
  )
}

// ------------------------------------------------------------------ the opening: the sample grows out of the pressed site
/** Critically damped spring, 0 -> 1 over the duration: no start-up jolt, a soft landing, no overshoot. */
const spring = (k: number) => {
  const f = (x: number) => 1 - (1 + 7.4 * x) * Math.exp(-7.4 * x)
  return Math.min(1, f(k) / f(1))
}

function Opening({ id, x, y, rect, cells, onDone }: OpeningState & { onDone: () => void }) {
  const check = checkById(id)!
  const disc = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  done.current = onDone
  useLayoutEffect(() => {
    const el = disc.current
    if (!el) return
    // The stage-sized image is scaled down onto the site, clipped to a disc, and grows until it is the stage.
    el.style.transformOrigin = `${x - rect.left}px ${y - rect.top}px`
    const t0 = performance.now()
    const DUR = 560
    let raf = 0
    const frame = () => {
      const k = Math.min(1, (performance.now() - t0) / DUR)
      const e = spring(k)
      el.style.transform = `scale(${0.06 + 0.94 * e})`
      el.style.clipPath = `circle(${46 + 26 * e * e * e}% at 50% 50%)`
      if (k < 1) raf = requestAnimationFrame(frame)
      else done.current()
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [x, y, rect])
  const box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  return (
    <div className="pb-opening" aria-hidden="true">
      <div className="pb-opening-under" style={box}>
        <img className="pb-photo" src={BLOOD_PHOTO()} alt="" draggable={false} />
        {cells.length > 0 && <Cells cells={cells} t={Infinity} />}
      </div>
      <div ref={disc} className="pb-opening-stage" style={box}>
        <Poster check={check} />
      </div>
    </div>
  )
}

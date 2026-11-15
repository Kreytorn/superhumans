// Prototype A "Viewbox": a light box with six real films. Pull one out to read it; the films are the navigation.
//   #/proto/A/home   #/proto/A/spikecount (the working check)   #/proto/A/<module> (short previews of the other five)
//   ?state=idle | result   ?t=<ms> pins the SpikeCount moment   ?how=1 opens "How do we know?"   ?replay=1 forces stored outputs
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/geist'
import './vb.css'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import type { ProtoProps } from '../../App'
import * as spike from '../../engine/spikecount'
import { setParam } from '../../lib/route'
import { CHECKS, SITE, SPIKE, STATUS_WORD, checkById, type Check, type CheckId } from './content'
import { HowHome, HowSpike } from './howContent'
import { How, Loupe, Mark, Marks, Still, Swatch, Tag } from './parts'
import { useBubble } from './bubble'
import { useTrack } from './track'

type Phase = 'idle' | 'running' | 'result' | 'error'
const ROOT = 'proto/A'
const STEP_MS = 40 // one cell every 40 ms, in the model's own order
const HOME_STEP_MS = 28
const f1 = (x: number) => x.toFixed(1)
const REAL_TRACK = true
const REAL_BUBBLE = true

/** The moment's clock starts when the models have answered. */
const timing = (n: number) => {
  const draw = n * STEP_MS
  return { draw, compare: draw + 180, act: draw + 480, done: draw + 900 }
}

function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const f = () => setOn(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [query])
  return on
}

function runClock(duration: number, set: (t: number) => void, done?: () => void) {
  const t0 = performance.now()
  let raf = 0
  const tick = (now: number) => {
    const e = now - t0
    if (e >= duration) {
      set(Infinity)
      done?.()
      return
    }
    set(e)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      },
    )
  })
}

/** Size of every film on screen right now, by check id. */
function filmRects() {
  const m = new Map<string, number>()
  document.querySelectorAll<HTMLElement>('.vb [data-film]').forEach((el) => {
    const r = el.getBoundingClientRect()
    m.set(el.dataset.film!, r.width * r.height)
  })
  return m
}

/**
 * Pull a film: the browser moves each film from its old place to its new one (same element name on both sides).
 * Home <-> check: films change size and shape, so they cross-fade; the larger picture scales, the smaller keeps its size.
 * Check -> check: the films only slide and crop; the closing film keeps its old picture until it is a spine.
 */
function go(path: string, instant: boolean) {
  const target = `#/${ROOT}/${path}`
  const from = location.hash.split('?')[0]
  if (from === target) return
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { ready?: Promise<void>; finished?: Promise<void> } }
  if (instant || !doc.startViewTransition) {
    location.hash = target
    return
  }
  const root = document.querySelector('.vb')
  const html = document.documentElement
  const closing = /\/proto\/A\/(?!home)([a-z]+)/.exec(from)?.[1] ?? null
  const slide = closing !== null && path !== 'home'
  const before = filmRects()
  const props: string[] = []
  const setProp = (k: string, v: string) => {
    html.style.setProperty(k, v)
    props.push(k)
  }
  root?.setAttribute('data-vt', slide ? 'slide' : 'zoom')
  const tr = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener('hashchange', () => setTimeout(resolve, 0), { once: true })
        location.hash = target
      }),
  )
  tr?.ready?.then(
    () => {
      const after = filmRects()
      for (const [id, a] of before) {
        const b = after.get(id)
        if (b === undefined) continue
        if (slide) {
          setProp(`--vb-old-${id}`, 'none')
          setProp(`--vb-new-${id}`, 'none')
          if (id === closing) setProp(`--vb-newop-${id}`, '0')
        } else if (a > 2 * b) setProp(`--vb-new-${id}`, 'none')
        else if (b > 2 * a) setProp(`--vb-old-${id}`, 'none')
      }
    },
    () => {},
  )
  const clear = () => {
    root?.removeAttribute('data-vt')
    for (const k of props) html.style.removeProperty(k)
  }
  if (tr?.finished) tr.finished.then(clear, clear)
  else setTimeout(clear, 700)
}

const vt = (id: CheckId): CSSProperties => ({ viewTransitionName: `vb-film-${id}` })

export default function ProtoA({ view, params }: ProtoProps) {
  const check = checkById(view.split('/')[0])
  const v: 'home' | CheckId = check ? check.id : 'home'
  const phone = useMedia('(max-width: 760px)')
  const coarse = useMedia('(pointer: coarse)')
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const stateParam = params.get('state')
  const tRaw = params.get('t')
  const pinned = tRaw !== null && tRaw !== '' && Number.isFinite(Number(tRaw)) ? Number(tRaw) : null
  const howOpen = params.get('how') === '1'
  const forceReplay = params.get('replay') === '1'
  const wantLive = !phone && !coarse && !forceReplay
  // ---- TrackTrace: the real check (track.tsx). Set REAL_TRACK to false to hang the preview film again.
  const isTrack = REAL_TRACK && v === 'tracktrace'
  const track = useTrack({ active: isTrack, params, phone, coarse, reduced })
  // ---- BubbleGrade: the real check (bubble.tsx). Set REAL_BUBBLE to false to hang the preview film again.
  const isBubble = REAL_BUBBLE && v === 'bubblegrade'
  const bubble = useBubble({ active: isBubble, params, phone, coarse })
  const real = isTrack ? track : isBubble ? bubble : null

  // ---- stored outputs of field-96 (Home's outlines, pinned states, and the numbers behind "How do we know?")
  const [stored, setStored] = useState<spike.SpikeResult | null>(null)
  const [storedFailed, setStoredFailed] = useState(false)
  useEffect(() => {
    let off = false
    spike
      .replay(SPIKE.sample)
      .then((r) => !off && setStored(r))
      .catch(() => !off && setStoredFailed(true))
    return () => {
      off = true
    }
  }, [])

  // ---- Home: the stored outlines draw in, in the model's own cell order
  const [homeT, setHomeT] = useState(0)
  useEffect(() => {
    if (v !== 'home' || !stored) return
    if (stateParam || reduced) {
      setHomeT(Infinity)
      return
    }
    setHomeT(0)
    return runClock(stored.cells.length * HOME_STEP_MS + 120, setHomeT)
  }, [v, stored, stateParam, reduced])

  // ---- SpikeCount: the moment
  const [phase, setPhase] = useState<Phase>('idle')
  const [run, setRun] = useState<{ res: spike.SpikeResult; live: boolean } | null>(null)
  const [t, setT] = useState(0)
  const [stage, setStage] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  // a mission sample hung on the film from inside "How do we know?" (stored outputs)
  const [mission, setMission] = useState<{ field: number; label: string; res: spike.SpikeResult } | null>(null)
  const stopClock = useRef<(() => void) | null>(null)
  const token = useRef(0)

  const urlSettled = v === 'spikecount' && (stateParam === 'result' || pinned !== null)
  useEffect(() => {
    stopClock.current?.()
    stopClock.current = null
    token.current++
    setPicked(null)
    setStage('')
    if (!urlSettled) {
      setPhase('idle')
      setRun(null)
      setT(0)
    }
  }, [v, stateParam, pinned, urlSettled])
  useEffect(() => {
    if (!urlSettled || !stored) return
    setRun({ res: stored, live: false })
    if (pinned !== null && pinned < timing(stored.cells.length).done) {
      setT(pinned)
      setPhase('running')
    } else {
      setT(Infinity)
      setPhase('result')
    }
  }, [urlSettled, stored, pinned])

  // When the check is opened on a laptop (never on Home), both models are fetched and run once on this photo, so the
  // sessions are compiled before the press. A press during that first run takes its result (it is a live run that ends
  // after the press); a later press runs the models again, which then takes about half a second.
  const warm = useRef<{ p: Promise<spike.SpikeResult>; done: boolean } | null>(null)
  /** Starts the first live run unless one has started already (only one run at a time). */
  const startWarm = useCallback(() => {
    if (warm.current) return warm.current
    const w = { p: spike.load().then(() => spike.analyze(SPIKE.sample)), done: false }
    w.p.then(
      () => {
        w.done = true
      },
      () => {
        if (warm.current === w) warm.current = null
      },
    )
    warm.current = w
    return w
  }, [])
  useEffect(() => {
    if (v !== 'spikecount' || !wantLive || stateParam || pinned !== null || warm.current) return
    const id = setTimeout(startWarm, 700) // after the film has been pulled out
    return () => clearTimeout(id)
  }, [v, wantLive, stateParam, pinned, startWarm])

  const grade = useCallback(async () => {
    const my = ++token.current
    stopClock.current?.()
    setPhase('running')
    setRun(null)
    setPicked(null)
    setT(-1)
    /** the outlines start landing */
    const start = (res: spike.SpikeResult, live: boolean) => {
      setStage('')
      setRun({ res, live })
      if (reduced) {
        setT(Infinity)
        setPhase('result')
        return
      }
      setT(0)
      stopClock.current = runClock(timing(res.cells.length).done, setT, () => setPhase('result'))
    }
    // Laptop: the real models run on this press. If their answer is not in almost at once (first run, slow machine),
    // the stored outlines start landing, tagged REPLAY, and the live ones take their place when they arrive (LIVE).
    let liveRun: Promise<spike.SpikeResult | null> = Promise.resolve(null)
    let grace = 0
    if (wantLive) {
      setStage('Outlining, then grading')
      const w = startWarm()
      grace = w.done ? 900 : 0
      liveRun = withTimeout(w.done ? spike.analyze(SPIKE.sample) : w.p, 30000).catch(() => null)
    }
    const first = grace ? await Promise.race([liveRun, new Promise<null>((r) => setTimeout(() => r(null), grace))]) : null
    if (token.current !== my) return
    if (first) return start(first, true)
    let kept: spike.SpikeResult | null = null
    try {
      kept = await spike.replay(SPIKE.sample)
    } catch {
      kept = null
    }
    if (token.current !== my) return
    if (kept) start(kept, false)
    const late = await liveRun
    if (token.current !== my) return
    if (late) {
      if (kept) setRun({ res: late, live: true })
      else start(late, true)
    } else if (!kept) {
      setStage('')
      setPhase('error')
    }
  }, [wantLive, reduced, startWarm])

  // ---- test hooks: ready when the fonts, the view's main still and its data are in
  const [fonts, setFonts] = useState(false)
  const [late, setLate] = useState(false)
  const [stills, setStills] = useState<Partial<Record<CheckId, boolean>>>({})
  useEffect(() => {
    let off = false
    const done = () => !off && setFonts(true)
    Promise.all([document.fonts.load('450 46px "Newsreader Variable"'), document.fonts.load('600 16px "Geist Variable"')]).then(done, done)
    const id = setTimeout(() => !off && setLate(true), 5000)
    return () => {
      off = true
      clearTimeout(id)
    }
  }, [])
  const stillReady = useCallback((id: CheckId) => setStills((s) => (s[id] ? s : { ...s, [id]: true })), [])
  const mainStill: CheckId = v === 'home' ? 'spikecount' : v
  const dataReady = v === 'home' ? !!stored || storedFailed : urlSettled ? !!run || storedFailed : true
  const ready = late || ((fonts || late) && (real ? real.ready : !!stills[mainStill] && dataReady))
  const dataState: Phase = real ? real.phase : v === 'spikecount' ? phase : stateParam === 'result' ? 'result' : 'idle'

  // ---- links: every film is one
  const link = (path: string) => ({
    href: `#/${ROOT}/${path}`,
    onClick: (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      go(path, reduced)
    },
  })
  const openHow = () => setParam('how', 1)
  const onMission = useCallback((field: number, label: string) => {
    spike
      .replay(`field-${field}`)
      .then((res) => setMission({ field, label, res }))
      .catch(() => setMission(null))
  }, [])
  useEffect(() => {
    if (!howOpen || v !== 'spikecount') setMission(null)
  }, [howOpen, v])
  const closeHow = useCallback(() => setParam('how', undefined), [])

  // ---- numbers on screen
  const baseline = spike.DEFAULT_BASELINES.model.spikyPct
  const cells = run?.res.cells ?? []
  const tm = timing(cells.length)
  const drawn = !run || t < 0 ? 0 : Math.min(cells.length, Math.floor(t / STEP_MS) + 1)
  const spikyDrawn = useMemo(() => cells.slice(0, drawn).filter((c) => c.cls >= 1 && c.cls <= 4).length, [cells, drawn])
  const landed = !!run && t >= tm.draw // every cell is drawn: the percentage may land
  const decision = useMemo(() => (run ? spike.act(run.res) : null), [run])
  const tier = Math.min(decision?.tier ?? 0, 2)
  const showAct = !!run && t >= tm.act
  const homeDrawn = stored ? Math.min(stored.cells.length, homeT === Infinity ? stored.cells.length : Math.floor(homeT / HOME_STEP_MS)) : 0

  const pickedCell = picked !== null && run && !mission ? (cells[picked] ?? null) : null

  const onCellKeys = (e: KeyboardEvent) => {
    if (!run || drawn === 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Escape')) return
    e.preventDefault()
    if (e.key === 'Escape') return setPicked(null)
    const d = e.key === 'ArrowRight' ? 1 : -1
    setPicked((p) => (p === null ? (d === 1 ? 0 : drawn - 1) : (p + d + drawn) % drawn))
  }

  // ---- pieces
  const bloodPhoto = (mode: 'contain' | 'cover', marks: ReactNode, interactive = false, field = 96) => (
    <div className="vb-photo-wrap" data-fit={mode}>
      <div
        className="vb-photo"
        {...(interactive
          ? { tabIndex: 0, role: 'group', 'aria-label': 'The blood photo. After grading, the arrow keys step through the outlined cells.', onKeyDown: onCellKeys, onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') setPicked(null) }, onPointerDown: (e: PointerEvent) => { if (!(e.target as Element).closest('.vb-cell')) setPicked(null) } }
          : {})}
      >
        <Still id="spikecount" onReady={stillReady} field={field} />
        {marks}
        {interactive && pickedCell ? <Loupe cell={pickedCell} /> : null}
      </div>
    </div>
  )

  const statusOf = (c: Check) => (c.id === 'spikecount' ? 'medic' : 'you') as 'medic' | 'you'

  const howButton = (
    <button type="button" className="vb-link" onClick={openHow} aria-haspopup="dialog">
      {SITE.how}
    </button>
  )
  // the tag stays on the sentence's last two words, so it never drops onto a line of its own
  const stateWords = SITE.state.split(' ')
  const stateHead = stateWords.slice(0, -2).join(' ')
  const stateTail = stateWords.slice(-2).join(' ')
  let body: ReactNode
  if (v === 'home') {
    body = (
      <>
        <header className="vb-band">
          <h1 className="vb-h1">{SITE.sentence}</h1>
          <div className="vb-band-side">
            <p className="vb-stateline">
              {stateHead}{' '}
              <span className="vb-nowrap">
                {stateTail} <Tag>Illustrative</Tag>
              </span>
            </p>
            {phone ? null : howButton}
          </div>
        </header>
        <nav className="vb-rail vb-rail--home" aria-label="The six checks">
          {CHECKS.map((c) => {
            const asks = c.id === 'spikecount'
            return (
              <a key={c.id} className="vb-col" data-asks={asks ? 1 : undefined} data-qa={asks ? 'primary' : undefined} {...link(c.id)}>
                <div className="vb-film" data-qa="hero" data-film={c.id} style={vt(c.id)}>
                  {asks ? (
                    <>
                      {bloodPhoto('cover', <Marks cells={stored?.cells ?? []} drawn={homeDrawn} />)}
                      <span className="vb-btn vb-btn--onfilm">{SITE.openBlood}</span>
                      <p className="vb-edge">
                        <Tag film>REPLAY</Tag>{' '}
                        {stored ? (
                          <>
                            <Swatch spiky /> {f1(stored.metrics.spikyPct)}% spiky cells; {f1(baseline)}% before flight
                          </>
                        ) : storedFailed ? (
                          'The stored result did not load.'
                        ) : (
                          ''
                        )}
                      </p>
                    </>
                  ) : (
                    <Still key={`${c.id}-${phone}`} id={c.id} frame={phone ? 'band' : 'slat'} onReady={stillReady} />
                  )}
                </div>
                <p className="vb-label">
                  <span className="vb-name">{c.name}</span>{' '}
                  <br />
                  <span className="vb-what">{c.what} </span>
                  <br className="vb-what" />
                  <Mark kind={statusOf(c)} /> <span className="vb-status">{asks ? STATUS_WORD.medic : SITE.quiet}</span>
                </p>
              </a>
            )
          })}
        </nav>
        {phone ? <div className="vb-home-foot">{howButton}</div> : null}
      </>
    )
  } else {
    const open = checkById(v)!
    const isSpike = v === 'spikecount'
    const tagWord = run ? (run.live ? 'LIVE' : 'REPLAY') : wantLive && !urlSettled ? 'LIVE' : 'REPLAY'
    const openFilm = (
      <section className="vb-film vb-open" data-qa={real ? undefined : 'hero'} data-film={v} style={vt(v)} aria-label={`${open.name}: ${open.specimen.toLowerCase()}`}>
        {isSpike ? (
          <>
            {mission
              ? bloodPhoto(phone ? 'cover' : 'contain', <Marks key={mission.field} cells={mission.res.cells} drawn={mission.res.cells.length} />, false, mission.field)
              : bloodPhoto(phone ? 'cover' : 'contain', <Marks cells={cells} drawn={drawn} picked={picked} onPick={setPicked} />, true)}
            <p className="vb-edge" aria-live="polite">
              <Tag film>{mission ? 'REPLAY' : tagWord}</Tag>{' '}
              {mission ? (
                `${mission.label}: ${mission.res.cells.length} cells outlined, ${f1(mission.res.metrics.spikyPct)}% spiky`
              ) : phase === 'error' ? (
                'The result did not load. Press the button again.'
              ) : stage ? (
                stage
              ) : drawn > 0 ? (
                <>
                  {drawn} cells outlined{' '}
                  <span className="vb-key">
                    <Swatch spiky /> {spikyDrawn} spiky
                  </span>{' '}
                  <span className="vb-key">
                    <Swatch spiky={false} /> smooth
                  </span>
                </>
              ) : (
                ''
              )}
            </p>
          </>
        ) : real ? (
          real.film
        ) : (
          <>
            <Still key={`${v}-${phone}`} id={v} frame="open" onReady={stillReady} />
            <p className="vb-edge">{open.specimen}</p>
          </>
        )}
      </section>
    )
    // a spine (laptop) is the middle of that film as it looks when open; a sliver (phone) is the film turned, with its name
    const spine = (c: Check, sliver: boolean) =>
      sliver ? (
        <a key={c.id} className="vb-sliver" aria-label={`${c.name}: open this check`} aria-current={c.id === v ? 'page' : undefined} {...link(c.id)}>
          <span className="vb-film vb-sliver-pic" data-film={c.id === v ? undefined : c.id} style={c.id === v ? undefined : vt(c.id)}>
            <Still id={c.id} frame="open" />
          </span>
          <span className="vb-sliver-name">{c.name}</span>
        </a>
      ) : (
        <a key={c.id} className="vb-film vb-spine" aria-label={`${c.name}: open this check`} data-film={c.id} style={vt(c.id)} {...link(c.id)}>
          <Still id={c.id} frame="open" />
          <span className="vb-spine-name">{c.name}</span>
        </a>
      )
    const wordmark = (
      <a className="vb-wordmark" aria-label="SuperHumans: back to all six checks" {...link('home')}>
        SuperHumans
      </a>
    )
    body = (
      <>
        {phone ? (
          <>
            {openFilm}
            <nav className="vb-strip" aria-label="The six checks">
              {CHECKS.map((c) => spine(c, true))}
            </nav>
          </>
        ) : (
          <nav className="vb-rail vb-rail--check" aria-label="The six checks">
            {CHECKS.map((c) => (c.id === v ? <Fragment key={c.id}>{openFilm}</Fragment> : spine(c, false)))}
          </nav>
        )}
        <aside className="vb-answer">
          {phone ? null : wordmark}
          {isSpike ? (
            <>
              <h1 className="vb-sentence">{open.sentence}</h1>
              <button type="button" className="vb-btn" data-qa="primary" data-quiet={phase === 'result' ? 1 : undefined} aria-busy={phase === 'running' && !run} aria-disabled={phase === 'running' && pinned === null} onClick={phase === 'running' && pinned === null ? undefined : grade}>
                {phase === 'result' ? SPIKE.again : phase === 'running' ? 'Reading the photo' : SPIKE.action}
              </button>
              <div className="vb-result" aria-live="polite">
                {run && landed ? (
                  <p className="vb-number">
                    <span className="vb-hero">{f1(run.res.metrics.spikyPct)}%</span> <span className="vb-hero-unit">spiky</span>{' '}
                    <br />
                    <span className="vb-compare" data-on={t >= tm.compare ? 1 : 0}>
                      {f1(baseline)}% before flight <Tag>Illustrative</Tag>{' '}
                    </span>
                  </p>
                ) : null}
                {run && landed ? (
                  <p className="vb-act" data-on={showAct ? 1 : 0}>
                    <Mark kind={SPIKE.who[tier]} /> <span className="vb-status">{STATUS_WORD[SPIKE.who[tier]]}</span>{' '}
                    <br />
                    <span className="vb-act-text">{SPIKE.act[tier]}</span>
                  </p>
                ) : null}
              </div>
            </>
          ) : real ? (
            real.answer
          ) : (
            <>
              <h1 className="vb-sentence">
                <span className="vb-name vb-name--lead">{open.name}</span>{' '}
                {open.sentence}
              </h1>
              <p className="vb-act" data-on="1">
                <Mark kind="you" /> <span className="vb-status">{SITE.quiet}</span>{' '}
                <br />
                <span className="vb-act-text vb-act-text--quiet">{SITE.comingLine}</span>
              </p>
              <a className="vb-btn" data-qa="primary" {...link('spikecount')}>
                {SITE.runBlood}
              </a>
            </>
          )}
          <div className="vb-foot">
            <button type="button" className="vb-link" onClick={openHow} aria-haspopup="dialog">
              {SITE.how}
            </button>
            {real ? real.foot : null}
            {phone ? wordmark : null}
          </div>
        </aside>
        {real ? real.below : null}
      </>
    )
  }

  const howRes = run?.res ?? stored
  return (
    <div className="vb" data-layout={v === 'home' ? 'home' : 'check'} data-view={v} data-ready={ready ? '1' : '0'} data-state={dataState} data-source={real ? real.source : v === 'spikecount' && run ? (run.live ? 'live' : 'replay') : undefined} data-scroll={isTrack ? 1 : undefined} data-real={real ? 1 : undefined}>
      {body}
      <How open={howOpen} onClose={closeHow}>
        {real ? real.how : v === 'spikecount' ? howRes ? <HowSpike res={howRes} live={!!run?.live} onStep={onMission} /> : <p className="vb-quiet">{storedFailed ? 'The evidence did not load. Close this and try again.' : 'Loading the evidence.'}</p> : <HowHome />}
      </How>
    </div>
  )
}

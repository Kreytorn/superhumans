// ST "Station" (r3): the cinematic space-station take. The whole screen is one film frame; the interface is a
// thin layer of light on top of it. Home = the station turning, with six hotspots riding on it. Press one:
// time stops, the camera goes in, a short frozen scene plays, and that check's working panel opens.
//
// This file is the shell: it loads the render manifest and the hotspot track, lays the film layers out with
// one cover box, and lets the director (lib/machine.ts) run the film from the address. The six checks live in
// modules/<id>/ (Scene.tsx, Stage.tsx); see modules/README.md. Contract: work/Station/CONTRACT.md.
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import './st.css'
import type { ProtoProps } from '../../App'
import { Finish } from './Finish'
import { Hotspots, type HotspotsHandle } from './Hotspots'
import { Panel, type PanelHandle } from './Panel'
import { Boundary } from './lib/Boundary'
import { frameBox, type Box, type Reach } from './lib/cover'
import { Director, type FilmEls, type FilmState, type Host } from './lib/machine'
import { assetUrl, loadManifest, loadTrack, pickVariant, safeWidth, type Manifest, type Track, type Variant } from './lib/manifest'
import { Preloader } from './lib/media'
import { SLOW_IN_MS, SLOW_RATE, easeRate } from './lib/rate'
import { watchFrames } from './lib/sync'
import type { CheckId, PanelLayout, StageState, VariantName } from './modules/types'
import { CHECKS, SITE_LINE, checkOf, isCheckId, neighbour, type SceneComponent } from './registry'

type TrackLoad = { for: string; track: Track | null } | null

/** A hotspot's press area is 56 px across: 30 px from the screen's edges keeps all of it on screen. */
const HOT_MARGIN = 30
/** On a portrait screen the sheet covers the lower 62 %: a check's subject is framed in the part above it. */
const SHEET_FREE = 0.38

/**
 * Where the hotspots go over the whole loop, as a part of the frame (0..1). A portrait screen that only has
 * landscape frames shows the film as large as this allows, instead of keeping the whole safe area on screen.
 * Before the track is in, the area the renders promise to keep the hotspots inside.
 */
function reachOf(t: Track | null, name: VariantName, v: Variant): Reach {
  if (t) {
    let x0 = 1
    let x1 = 0
    let y0 = 1
    let y1 = 0
    for (const id of Object.keys(t.x)) {
      const xs = t.x[id]
      const ys = t.y[id] ?? []
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i]
        const y = ys[i]
        if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) continue
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
    if (x1 > x0 && y1 > y0) return { x0, x1, y0, y1 }
  }
  const half = safeWidth(name, v) / v.w / 2
  return { x0: 0.5 - half, x1: 0.5 + half, y0: 0, y1: 1 }
}

/** Used when the render's track cannot be loaded: six fixed points round the middle, so the page still works. */
function standInTrack(): Track {
  const t: Track = { fps: 24, frames: 1, ids: CHECKS.map((c) => c.id), x: {}, y: {}, v: {}, s: {} }
  CHECKS.forEach((c, i) => {
    const a = (i / CHECKS.length) * Math.PI * 2 - Math.PI / 2
    t.x[c.id] = [0.5 + 0.2 * Math.cos(a)]
    t.y[c.id] = [0.47 + 0.24 * Math.sin(a)]
    t.v[c.id] = [1]
    t.s[c.id] = [1]
  })
  return t
}

export default function ST({ view, params }: ProtoProps) {
  const target: CheckId | null = isCheckId(view) ? view : null
  const stateParam = params.get('state')
  const pinned = stateParam === 'idle' || stateParam === 'result' ? stateParam : null
  const debug = params.get('debug') === '1'
  const motionParam = params.get('motion')

  // ?debug=1 and ?motion=full|reduce stay on while moving between the station and the checks.
  const sticky = [debug ? 'debug=1' : '', motionParam === 'full' || motionParam === 'reduce' ? `motion=${motionParam}` : ''].filter(Boolean).join('&')
  const hrefFor = useCallback((v: string) => `#/proto/ST/${v}${sticky ? `?${sticky}` : ''}`, [sticky])
  const go = useCallback(
    (v: string) => {
      window.location.hash = hrefFor(v)
    },
    [hrefFor],
  )

  const [osReduced, setOsReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setOsReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const reduced = motionParam === 'full' ? false : motionParam === 'reduce' ? true : osReduced

  // ------------------------------------------------------------------------------------------------ assets
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    loadManifest().then(
      (m) => {
        if (!live) return
        setManifest(m)
        setLoadError(null)
      },
      (e: unknown) => live && setLoadError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      live = false
    }
  }, [attempt])

  const rootRef = useRef<HTMLElement>(null)
  const [size, setSize] = useState<{ vw: number; vh: number } | null>(null)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const read = () =>
      setSize((s) => {
        const vw = el.clientWidth
        const vh = el.clientHeight
        return s && s.vw === vw && s.vh === vh ? s : { vw, vh }
      })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const portrait = !!size && size.vh > size.vw
  const layout: PanelLayout = portrait ? 'sheet' : 'side'
  const variantName = manifest ? pickVariant(manifest, portrait) : 'wide'
  const variant = manifest?.variants[variantName] ?? null
  const fps = manifest?.fps ?? 24

  const [trackLoad, setTrackLoad] = useState<TrackLoad>(null)
  const trackPath = variant?.loop.track ?? null
  useEffect(() => {
    if (!trackPath) return
    let live = true
    loadTrack(trackPath).then(
      (t) => live && setTrackLoad({ for: trackPath, track: t }),
      () => live && setTrackLoad((old) => (old?.for === trackPath && old.track ? old : { for: trackPath, track: null })),
    )
    // A track that has not come in after a moment does not hold the picture back: the stand-in points are used
    // until it arrives.
    const late = window.setTimeout(() => live && setTrackLoad((old) => (old?.for === trackPath ? old : { for: trackPath, track: null })), 2500)
    return () => {
      live = false
      window.clearTimeout(late)
    }
  }, [trackPath])
  const trackTried = !!trackLoad && trackLoad.for === trackPath
  const track = useMemo(() => (trackTried ? (trackLoad?.track ?? standInTrack()) : null), [trackTried, trackLoad])

  // ------------------------------------------------------------------------------------------------- film
  const [film, setFilm] = useState<FilmState>({ phase: 'boot', id: null, play: false })
  const loopWrapRef = useRef<HTMLDivElement>(null)
  const loopRef = useRef<HTMLVideoElement>(null)
  const shotRef = useRef<HTMLVideoElement>(null)
  const stillARef = useRef<HTMLImageElement>(null)
  const stillBRef = useRef<HTMLImageElement>(null)
  const hotRef = useRef<HotspotsHandle>(null)
  const riderRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<PanelHandle>(null)
  const boxRef = useRef<Box | null>(null)
  const frameRef = useRef(0)
  const debugRef = useRef<HTMLSpanElement>(null)
  const preRef = useRef<Preloader | null>(null)

  // Landscape: the frame covers the screen, centred. Portrait with only landscape frames: the frame is a band
  // as large as the hotspots' reach allows; at home the reach is centred, and while a check is open the band
  // moves so the still's subject sits in the middle of the part the sheet leaves free. The film waits for
  // the track (it sets the reach), so the band does not jump once it is in.
  const onCheck = film.phase === 'fly' || film.phase === 'scene' || film.phase === 'panel' || film.phase === 'leave'
  const reach = useMemo(() => (variant && trackTried ? reachOf(track, variantName, variant) : null), [variant, variantName, trackTried, track])
  const focus = film.id && variant ? variant.shots[film.id]?.anchors.focus : undefined
  const fx = focus?.[0] ?? 0.5
  const fy = focus?.[1] ?? 0.5
  const box = useMemo(() => {
    if (!size || !variant || !reach) return null
    const keep = { keep: reach, margin: HOT_MARGIN }
    if (!portrait) return frameBox(size.vw, size.vh, variant.w, variant.h, { ...keep, at: [0.5, 0.5], to: [0.5, 0.5] })
    const mid: [number, number] = [(reach.x0 + reach.x1) / 2, (reach.y0 + reach.y1) / 2]
    const home = frameBox(size.vw, size.vh, variant.w, variant.h, { ...keep, at: mid, to: [0.5, 0.45] })
    // A frame that fills the screen stays where it is in a check: the portrait stills keep their subject in the
    // top part, above the sheet, and a frame that moved at the cut into the clip (or out of it) would show as a
    // jump of a few px. Only a band (a frame shorter than the screen) moves, with its slide (st.css), to bring
    // the subject above the sheet.
    if (!onCheck || !home.letterboxed) return home
    return frameBox(size.vw, size.vh, variant.w, variant.h, { ...keep, at: [fx, fy], to: [0.5, SHEET_FREE / 2], floor: SHEET_FREE })
  }, [size, variant, reach, portrait, onCheck, fx, fy])
  useLayoutEffect(() => {
    boxRef.current = box
    hotRef.current?.apply(frameRef.current)
  }, [box, track])

  // What the director needs to know, always the latest values.
  const now = useRef({ variant, fps, reduced, held: pinned !== null && !target, coarse: false })
  now.current = {
    variant,
    fps,
    reduced,
    held: pinned !== null && !target,
    coarse: !!size && (size.vw < 700 || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)),
  }

  const directorRef = useRef<Director | null>(null)
  if (!directorRef.current) {
    const host: Host = {
      els(): FilmEls | null {
        const loopWrap = loopWrapRef.current
        const loop = loopRef.current
        const shot = shotRef.current
        const a = stillARef.current
        const b = stillBRef.current
        return loopWrap && loop && shot && a && b ? { loopWrap, loop, shot, stills: [a, b], rider: riderRef.current } : null
      },
      variant: () => now.current.variant,
      fps: () => now.current.fps,
      url: (path) => preRef.current?.url(path) ?? assetUrl(path),
      point(id) {
        const p = hotRef.current?.point(id)
        const b = boxRef.current
        return p ?? { x: (b?.w ?? 0) / 2, y: (b?.h ?? 0) / 2 }
      },
      box: () => boxRef.current,
      focus(id) {
        const b = boxRef.current
        const f = now.current.variant?.shots[id]?.anchors.focus
        return b && f ? { x: f[0] * b.w, y: f[1] * b.h } : null
      },
      reduced: () => now.current.reduced,
      held: () => now.current.held,
      // A full-screen blur costs frames on a phone; the push-in there is the zoom alone.
      blurPx: () => (now.current.coarse ? 0 : 7),
      set: (s) => setFilm((old) => (old.phase === s.phase && old.id === s.id && old.play === s.play ? old : s)),
    }
    directorRef.current = new Director(host)
  }
  useEffect(() => () => directorRef.current?.dispose(), [])

  // The address drives the film. The first time (and when the screen turns and the other frame set comes in)
  // the picture is set without animation; after that every change of address is played.
  const settledFor = useRef<string | null>(null)
  // The film's elements exist once there is a box (it waits for the track).
  const haveFilm = !!box
  useEffect(() => {
    const d = directorRef.current
    if (!d || (!haveFilm && !loadError)) return
    const key = loadError && !haveFilm ? 'none' : variantName
    if (settledFor.current !== key || d.phase === 'boot') {
      settledFor.current = key
      d.settle(target)
    } else d.goto(target)
  }, [haveFilm, loadError, variantName, target])

  // The hotspots follow the loop, frame by frame.
  useEffect(() => {
    const loop = loopRef.current
    if (!loop || !track) return
    return watchFrames(loop, track.fps || fps, track.frames, (f) => {
      frameRef.current = f
      hotRef.current?.apply(f)
      if (debugRef.current) debugRef.current.textContent = `f${String(f).padStart(3, '0')}`
    })
  }, [track, fps, variantName])

  // The poster is fetched as soon as the manifest is in, beside the track, so it is there when the film shows.
  const posterPath = variant?.loop.poster
  useEffect(() => {
    if (!posterPath) return
    const img = new Image()
    img.src = assetUrl(posterPath)
  }, [posterPath])

  // Clips and stills are fetched ahead, so a press starts its clip at once.
  useEffect(() => {
    const p = new Preloader(assetUrl)
    preRef.current = p
    return () => {
      p.dispose()
      preRef.current = null
    }
  }, [])

  // -------------------------------------------------------------------------------------- settled / state
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    let alive = true
    const done = () => alive && setFontsReady(true)
    if (document.fonts?.ready) document.fonts.ready.then(done, done)
    const t = window.setTimeout(done, 3000)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [])
  const [posterFor, setPosterFor] = useState<string | null>(null)
  const posterDone = useCallback(() => setPosterFor(variantName), [variantName])
  useEffect(() => {
    const t = window.setTimeout(posterDone, 4000)
    return () => window.clearTimeout(t)
  }, [posterDone])

  const [stageState, setStageState] = useState<StageState>('idle')
  const [stageReady, setStageReady] = useState(false)
  const onStageReady = useCallback(() => setStageReady(true), [])
  const inPanel = film.phase === 'panel'
  useEffect(() => {
    if (!inPanel) setStageReady(false)
  }, [inPanel])

  const [settled, setSettled] = useState(false)
  const homeReady = film.phase === 'home' && posterFor === variantName && trackTried
  const canSettle = fontsReady && (!!loadError || homeReady || (inPanel && stageReady))
  useEffect(() => {
    if (settled || !canSettle) return
    const t = window.setTimeout(() => setSettled(true), 260)
    return () => window.clearTimeout(t)
  }, [canSettle, settled])

  useEffect(() => {
    const variantNow = now.current.variant
    if (!settled || !variantNow) return
    const pre = preRef.current
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
    if (film.phase === 'home') {
      const t = window.setTimeout(() => {
        const paths: string[] = []
        for (const c of CHECKS) {
          const s = variantNow.shots[c.id]
          if (s) paths.push(s.still, s.in)
          // the frozen scenes are small: all six are fetched now, so a scene starts on time
          c.preload('scene')
        }
        pre?.want(paths)
      }, 1200)
      return () => window.clearTimeout(t)
    }
    if (film.id && (film.phase === 'scene' || film.phase === 'panel')) {
      const here = variantNow.shots[film.id]
      const next = variantNow.shots[neighbour(film.id, 1).id]
      pre?.want([here?.out, next?.in, next?.still].filter((p): p is string => !!p), true)
    }
  }, [settled, film.phase, film.id, variantName])

  // A pressed check's module chunks are fetched at once (the push and the fly-in give them two seconds or more),
  // and its neighbours' while a panel is open, so the scene starts on time and the panel opens on its stage
  // instead of on the loading line.
  useEffect(() => {
    if (!film.id || film.phase === 'leave' || film.phase === 'pull') return
    checkOf(film.id).preload()
    if (film.phase === 'panel') {
      neighbour(film.id, 1).preload()
      neighbour(film.id, -1).preload()
    }
  }, [film.phase, film.id])

  // --------------------------------------------------------------------------------- hover, focus and keys
  const [reveal, setReveal] = useState<CheckId | null>(null)
  const rateTimer = useRef(0)
  const onReveal = useCallback((id: CheckId | null, how: 'pointer' | 'focus') => {
    setReveal(id)
    window.clearTimeout(rateTimer.current)
    const d = directorRef.current
    const loop = loopRef.current
    if (!d || !loop || d.phase !== 'home') return
    // Aiming at a hotspot slows the station to a quarter of its speed, so the point is easy to press. It spins
    // back up when the pointer leaves, after a short grace so that moving from one point to the next does not
    // speed it up in between.
    if (id) easeRate(loop, SLOW_RATE, SLOW_IN_MS)
    else rateTimer.current = window.setTimeout(() => easeRate(loop, 1), how === 'focus' ? 0 : 160)
  }, [])
  useEffect(() => () => window.clearTimeout(rateTimer.current), [])
  // A check runs the loop frozen; when the station comes back it turns at full speed (a hotspot that gets
  // focus again on the way back slows it down again).
  useEffect(() => {
    if (film.phase === 'home') return
    window.clearTimeout(rateTimer.current)
    const loop = loopRef.current
    if (loop) easeRate(loop, 1, 0)
  }, [film.phase])
  const [touch] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)

  const lastInput = useRef<'key' | 'pointer'>('pointer')
  const cameFrom = useRef<CheckId | null>(null)
  useEffect(() => {
    if (film.phase !== 'home') setReveal(null)
    if (film.id && (film.phase === 'leave' || film.phase === 'pull')) cameFrom.current = film.id
    // Keyboard visitors land on the main button; a pointer or a fresh deep link leaves focus where it is (a
    // focus ring on a button nobody aimed at reads as a glitch).
    if (film.phase === 'panel' && lastInput.current === 'key') panelRef.current?.focusPrimary()
    if (film.phase === 'home' && cameFrom.current) {
      if (lastInput.current === 'key') hotRef.current?.focus(cameFrom.current)
      cameFrom.current = null
    }
  }, [film.phase, film.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      lastInput.current = 'key'
      const d = directorRef.current
      if (!d || e.metaKey || e.ctrlKey || e.altKey) return
      const phase = d.phase
      if (phase === 'scene') {
        if (e.key === 'Escape') go('home')
        else if (e.key !== 'Tab' && e.key !== 'Shift') d.skip()
        return
      }
      if (phase === 'push' || phase === 'fly') {
        if (e.key === 'Escape') go('home')
        return
      }
      if (phase === 'home') {
        if (/^[1-6]$/.test(e.key)) {
          e.preventDefault()
          go(CHECKS[Number(e.key) - 1].id)
          return
        }
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (dir) {
          e.preventDefault()
          hotRef.current?.step(dir)
        }
        return
      }
      if (phase === 'panel' && d.id) {
        if (e.defaultPrevented) return
        const el = e.target instanceof Element ? e.target : null
        const inStage = !!el?.closest('.st-stage')
        if (e.key === 'Escape') {
          // Inside the stage Esc belongs to the stage first; it then steps out to the Back link.
          if (inStage) panelRef.current?.focusBack()
          else go('home')
          return
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          if (inStage || el?.closest('input, textarea, select, [role="slider"], [contenteditable="true"]')) return
          e.preventDefault()
          go(neighbour(d.id, e.key === 'ArrowRight' ? 1 : -1).id)
        }
      }
    }
    const onPointer = () => {
      lastInput.current = 'pointer'
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, [go])

  const onPointerDown = (e: PointerEvent) => {
    if (e.button === 0) directorRef.current?.skip()
  }

  // -------------------------------------------------------------------------------------------- the scene
  // The frozen scene stays mounted while the panel is open and for its short fade-out afterwards.
  // The component is picked when a run starts (the plain one if its chunk is in, else the lazy wrapper) and kept
  // for the whole run, so a chunk that lands mid-scene does not remount it.
  const [scene, setScene] = useState<{ id: CheckId; run: number; Comp: SceneComponent } | null>(null)
  const sceneRuns = useRef(0)
  useEffect(() => {
    if (film.phase === 'scene' && film.id) {
      const id = film.id
      setScene((s) => (s && s.id === id && s.run === sceneRuns.current ? s : { id, run: ++sceneRuns.current, Comp: checkOf(id).scene() }))
      return
    }
    if (film.phase === 'panel' || film.phase === 'leave') return
    const t = window.setTimeout(() => setScene(null), 280)
    return () => window.clearTimeout(t)
  }, [film.phase, film.id])
  const sceneCheck = scene ? checkOf(scene.id) : null
  const sceneShot = scene && variant ? variant.shots[scene.id] : undefined
  const scenePlaying = film.phase === 'scene' && film.play && scene?.id === film.id
  const sceneDone = useCallback(() => directorRef.current?.sceneDone(), [])

  // ----------------------------------------------------------------------------------------------- render
  const shownReveal = !target && pinned === 'result' ? CHECKS[0].id : reveal
  const lastReveal = useRef<CheckId>(CHECKS[0].id)
  if (shownReveal) lastReveal.current = shownReveal
  const revealCheck = checkOf(lastReveal.current)
  const lastCheck = useRef<CheckId>(CHECKS[0].id)
  if (film.id) lastCheck.current = film.id
  const filmCheck = checkOf(lastCheck.current)

  const dataState: StageState = loadError
    ? 'error'
    : film.phase === 'home' || film.phase === 'boot'
      ? !target && pinned === 'result'
        ? 'result'
        : 'idle'
      : inPanel
        ? stageState
        : 'running'

  const boxStyle: CSSProperties | undefined = box
    ? { width: box.w, height: box.h, transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)` }
    : undefined

  return (
    <main
      ref={rootRef}
      className="st"
      data-ready={settled ? '1' : '0'}
      data-state={dataState}
      data-phase={film.phase}
      data-check={film.id ?? ''}
      data-variant={variantName}
      data-layout={layout}
      data-motion={reduced ? 'reduced' : 'full'}
      data-letterbox={box?.letterboxed ? 1 : 0}
      onPointerDown={onPointerDown}
    >
      <div className="st-film" data-qa="hero">
        {variant && box && (
          <div className="st-box" key={variantName} style={boxStyle}>
            <div className="st-loopwrap" ref={loopWrapRef}>
              <img
                className="st-poster"
                src={assetUrl(variant.loop.poster)}
                alt="A space station turning slowly in deep space."
                draggable={false}
                onLoad={posterDone}
                onError={posterDone}
              />
              <video
                className="st-loop"
                ref={loopRef}
                src={assetUrl(variant.loop.src)}
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                tabIndex={-1}
                aria-hidden="true"
                onLoadedData={(e) => {
                  e.currentTarget.dataset.on = '1'
                }}
              />
            </div>
            <video className="st-shot" ref={shotRef} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} aria-hidden="true" />
            <img className="st-still" ref={stillARef} alt="" draggable={false} />
            <img className="st-still" ref={stillBRef} alt="" draggable={false} />
            <div className="st-scene" data-scene={scenePlaying ? 'play' : 'end'} aria-hidden="true">
              {scene && sceneCheck && sceneShot && (
                <Boundary
                  key={scene.run}
                  fallback={null}
                  onError={() => {
                    // A scene that did not load is skipped now and fetched again on the next visit.
                    sceneCheck.retry('scene')
                    sceneDone()
                  }}
                >
                  <Suspense fallback={null}>
                    <scene.Comp
                      id={scene.id}
                      w={variant.w}
                      h={variant.h}
                      anchors={sceneShot.anchors}
                      variant={variantName}
                      play={scenePlaying}
                      onDone={sceneDone}
                    />
                  </Suspense>
                </Boundary>
              )}
            </div>
            {/* A landscape frame on a portrait screen is a band: its edges fade into the black of space. */}
            {box.letterboxed && <i className="st-bandfade" aria-hidden="true" />}
          </div>
        )}
      </div>
      <i className="st-shade" aria-hidden="true" />
      {/* Grain and vignette belong to the picture: they sit on the film, under the interface, so the words stay
          sharp. When time stops the grain stops with it, like a freeze frame. */}
      <Finish />
      {/* The hotspots have the same box as the film, one layer up: above the shade, under the words. */}
      {variant && box && (
        <div className="st-box st-box--hot" key={`hot-${variantName}`} style={boxStyle}>
          {/* the layer the director moves with the push-in and back (lib/machine.ts) */}
          <div className="st-rider" ref={riderRef}>
            <Hotspots
              ref={hotRef}
              track={track}
              boxRef={boxRef}
              pressed={film.phase === 'push' ? film.id : null}
              reveal={film.phase === 'home' ? shownReveal : null}
              primary={film.phase === 'home' || film.phase === 'boot'}
              hrefFor={hrefFor}
              onReveal={onReveal}
            />
          </div>
        </div>
      )}

      <a className="st-mark" href={hrefFor('home')}>
        SuperHumans
      </a>

      <div className="st-lower" data-mode={shownReveal ? 'check' : 'site'}>
        <div className="st-lower-site">
          <p className="st-siteline">{SITE_LINE}</p>
          <p className="st-hint">{touch ? 'Tap' : 'Press'} a point on the station</p>
        </div>
        <div className="st-lower-check" aria-hidden="true">
          <p className="st-lower-label">{revealCheck.label}</p>
          <p className="st-lower-name">{revealCheck.name}</p>
          <p className="st-lower-line">{revealCheck.sentence}</p>
        </div>
      </div>

      <p className="st-card" aria-hidden="true">
        {filmCheck.label}
      </p>

      <p className="st-ai" data-at="right">
        AI-generated imagery
      </p>
      <p className="st-ai" data-at="left" aria-hidden="true">
        AI-generated imagery
      </p>

      <Panel
        ref={panelRef}
        check={film.id ? filmCheck : null}
        open={inPanel}
        layout={layout}
        pinned={pinned}
        hrefFor={hrefFor}
        onState={setStageState}
        onReady={onStageReady}
      />

      {loadError && !manifest && (
        <div className="st-fail" role="alert">
          <p>The station pictures could not be loaded.</p>
          <button type="button" className="st-btn" onClick={() => setAttempt((a) => a + 1)}>
            <span>Load them again</span>
          </button>
          {film.phase === 'home' && (
            <nav aria-label="Health checks">
              {CHECKS.map((c) => (
                <a key={c.id} href={hrefFor(c.id)}>
                  {c.name}
                </a>
              ))}
            </nav>
          )}
        </div>
      )}

      {debug && (
        <p className="st-debug">
          {film.phase} {film.id ?? ''} {variantName} <span ref={debugRef}>f000</span>
        </p>
      )}
    </main>
  )
}

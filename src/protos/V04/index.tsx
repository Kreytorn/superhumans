// Prototype V04 "Prism Ring": a ring-world of crystal and light, seen from just inside its band. Six chambers set in
// the band show the six checks' real specimen images; pressing one flies the camera along the band and into it.
// Routes: #/proto/V04/home and #/proto/V04/<module id>.
import '@fontsource-variable/syne'
import '@fontsource-variable/red-hat-display'
import '@fontsource-variable/geist-mono'
import './v04.css'
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { CHECKS, SITE_LINE, checkIndex, type Check } from './data'
import { RingScene, hasWebGL, type RingCtl } from './scene'

// The check's page (and its six heavy working stages) is its own chunk: the ring does not wait for it. It is fetched
// as soon as the home has settled, and again (a no-op once loaded) on hover, focus or press of a chamber.
const loadModule = () => import('./Module')
const Module = lazy(loadModule)
const preload = () => {
  void loadModule().catch(() => {})
}

const go = (v: string) => {
  window.location.hash = `#/proto/V04/${v}`
}

// Where the six chambers sit when WebGL is missing and the ring is a still drawing (percent of the screen, size in vmin).
const STILL: [number, number, number][] = [
  [12, 62, 22],
  [27, 38, 17],
  [43, 24, 14],
  [58, 17, 11.5],
  [72, 19, 10],
  [84, 27, 9],
]

function thumb(c: Check): CSSProperties {
  const [x0, y0, x1, y1] = c.crop
  const sx = 1 / (x1 - x0)
  const sy = 1 / (y1 - y0)
  return {
    backgroundImage: `url(${c.img})`,
    backgroundSize: `${sx * 100}% ${sy * 100}%`,
    backgroundPosition: `${x1 - x0 >= 1 ? 0 : (x0 / (1 - (x1 - x0))) * 100}% ${y1 - y0 >= 1 ? 0 : (y0 / (1 - (y1 - y0))) * 100}%`,
    filter: c.invert ? 'invert(1) hue-rotate(180deg)' : undefined,
  }
}

export default function V04({ view, params }: { view: string; params: URLSearchParams }) {
  const idx = checkIndex(view) // -1 on the home view
  const [tall] = useState(() => window.innerWidth < 700 || window.innerWidth / window.innerHeight < 0.8)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // decided once: asking again on every route change would open a new WebGL context each time
  const [webgl, setWebgl] = useState(() => params.get('still') !== '1' && hasWebGL())
  const [sceneReady, setSceneReady] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [pressed, setPressed] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  // true while the camera flies back out of a chamber: the labels wait until it has landed (a press still counts)
  const [returning, setReturning] = useState(false)
  // true while the page is open but the camera is still going through the window, under the chamber's light
  const [landing, setLanding] = useState(false)
  const [flownTo, setFlownTo] = useState<number | null>(null)
  const [lastIdx, setLastIdx] = useState(idx)
  const host = useRef<HTMLDivElement>(null)
  const flash = useRef<HTMLDivElement>(null)
  const scene = useRef<RingScene | null>(null)
  const pressedRef = useRef(pressed)
  pressedRef.current = pressed

  const ctl = useRef<RingCtl | null>(null)
  if (!ctl.current) ctl.current = { buttons: [], outlines: [], pointer: [0, 0], flash: null, onNear: () => {}, onArrive: () => {}, onHome: () => {}, onReady: () => {}, onFail: () => {} }
  const c = ctl.current
  // the page is mounted as the camera reaches the window, so it is there, fully drawn, when the light clears
  c.onNear = (i) => {
    if (pressedRef.current !== i) return
    setLanding(true)
    setFlownTo(i)
    go(CHECKS[i].id)
  }
  c.onArrive = () => setLanding(false)
  c.onHome = () => {
    setReturning(false)
    setLanding(false)
  }
  c.onReady = () => setSceneReady(true)
  c.onFail = () => setWebgl(false)

  useEffect(() => {
    if (!webgl || !host.current) return
    let s: RingScene
    try {
      c.flash = flash.current
      s = new RingScene(host.current, c, { tall, reduced, cam: params.get('cam'), at: params.get('at'), startAt: idx >= 0 ? idx : null, hold: params.get('hold') ? Number(params.get('hold')) : null })
    } catch {
      setWebgl(false)
      return
    }
    scene.current = s
    s.setActive(idx < 0)
    s.start()
    return () => {
      s.dispose()
      scene.current = null
    }
    // the scene lives as long as this prototype is on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl])

  const target = idx >= 0 ? idx : pressed
  useEffect(() => {
    const s = scene.current
    if (!s) return
    s.setActive(idx < 0)
    s.setTarget(target, idx >= 0)
  }, [target, idx])
  useEffect(() => {
    scene.current?.setHover(target == null ? hover : null)
  }, [hover, target])
  useEffect(() => {
    setPressed(null)
    setHover(null)
    setPageReady(false)
    if (idx < 0) setLanding(false)
  }, [idx])
  // decided during render, so the home is never live for a frame while the camera is still inside the chamber
  if (lastIdx !== idx) {
    setLastIdx(idx)
    if (idx < 0 && lastIdx >= 0 && webgl) setReturning(true)
  }

  const press = useCallback(
    (i: number) => {
      preload()
      if (!scene.current || reduced) return go(CHECKS[i].id)
      // a press during the way back turns the camera round from where it is
      setReturning(false)
      setPressed(i)
    },
    [reduced],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (idx >= 0) {
        if (e.key === 'Escape') go('home')
        return
      }
      if (pressed != null) return
      if (e.key >= '1' && e.key <= '6') press(Number(e.key) - 1)
      else if (returning) return
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        // step round the ring
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1
        const cur = c.buttons.findIndex((b) => b === document.activeElement)
        const next = cur < 0 ? (hover ?? (dir > 0 ? -1 : 0)) + dir : cur + dir
        c.buttons[(next + 6) % 6]?.focus()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, pressed, returning, press, hover, c])

  const phase = idx >= 0 ? (landing ? 'land' : 'open') : pressed != null ? 'fly' : returning ? 'back' : 'home'
  // the picture is taken at data-ready: never in the middle of a camera move
  const ready = idx >= 0 ? pageReady && !landing : webgl ? sceneReady && phase === 'home' : true
  useEffect(() => {
    if (ready && idx < 0) preload()
  }, [ready, idx])
  // The page's first paint costs about a third of a second once per visit (the browser builds its blurs and gradients).
  // It is done here, once the home has settled, under a near-transparent copy of the page, so the first flight's light
  // clears smoothly instead of freezing at full strength.
  const warmed = useRef(false)
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    if (!ready || idx >= 0 || warmed.current) return
    warmed.current = true
    loadModule().then(
      () => setWarm(true),
      () => {},
    )
  }, [ready, idx])
  useEffect(() => {
    if (!warm) return
    const t = window.setTimeout(() => setWarm(false), 900)
    return () => window.clearTimeout(t)
  }, [warm])
  const lit = target != null ? CHECKS[target] : hover != null ? CHECKS[hover] : null

  return (
    <div
      className="v04"
      data-phase={phase}
      data-ready={ready ? '1' : '0'}
      data-webgl={webgl ? '1' : '0'}
      data-tall={tall ? '1' : '0'}
      data-via={idx >= 0 && idx === flownTo ? 'fly' : undefined}
      data-lit={lit && phase === 'home' ? '1' : '0'}
      style={{ ['--hue' as string]: lit?.hue ?? '#b9a8ff' }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') c.pointer = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
      }}
    >
      <div className="v04-scene" ref={host} aria-hidden="true">
        {!webgl && <div className="v04-still" />}
      </div>
      <div className="v04-veil" aria-hidden="true" />

      {/* the home's places exist on the home only (on a check's page they are unmounted, not hidden) */}
      {idx < 0 && (
      <div className="v04-home" inert={phase !== 'home' && phase !== 'back'}>
        <nav className="v04-chambers" aria-label="The six health checks">
          {CHECKS.map((k, i) => (
            <button
              key={k.id}
              type="button"
              className="v04-ch"
              data-vis={webgl ? '0' : '1'}
              data-hot={hover === i ? '1' : '0'}
              // names alternate above and below the band, so neighbours never share a row: 01 beside, 02 and 04 above
              data-tag={webgl && !tall ? (i === 0 ? 'side' : i === 1 || i === 3 ? 'top' : undefined) : undefined}
              data-qa={i === 0 ? 'primary' : undefined}
              aria-label={`${k.name}: ${k.sentence}`}
              style={{ ['--h' as string]: k.hue, ...(webgl ? null : { left: `${STILL[i][0]}%`, top: `${STILL[i][1]}%`, width: `${STILL[i][2] * 1.6}vmin`, height: `${STILL[i][2]}vmin` }) }}
              ref={(el) => {
                c.buttons[i] = el
              }}
              onClick={() => press(i)}
              onPointerEnter={(e) => {
                preload()
                if (e.pointerType === 'mouse') setHover(i)
              }}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => {
                preload()
                setHover(i)
              }}
              onBlur={() => setHover((h) => (h === i ? null : h))}
            >
              {webgl ? (
                <svg className="v04-ch-ring" aria-hidden="true">
                  <polygon
                    ref={(el) => {
                      c.outlines[i] = el
                    }}
                  />
                </svg>
              ) : (
                <span className="v04-ch-img" style={thumb(k)} />
              )}
              <span className="v04-ch-tag">
                <i>{k.n}</i>
                <b>{k.name}</b>
              </span>
            </button>
          ))}
        </nav>

        <header className="v04-title">
          <h1>
            <span>Super</span>
            <span>Humans</span>
          </h1>
          <div className="v04-read">
            <p className="v04-line">{SITE_LINE}</p>
            {lit && phase === 'home' && (
              <div className="v04-focus" key={lit.id}>
                <p className="v04-focus-name">
                  <i>{lit.n}</i>
                  {lit.name}
                </p>
                <p className="v04-focus-line">{lit.sentence}</p>
              </div>
            )}
          </div>
        </header>
        <p className="v04-hint">
          <span /> Press a chamber to fly in
        </p>
      </div>
      )}

      {warm && idx < 0 && pressed == null && (
        <div className="v04-ghost" aria-hidden="true" inert>
          <Suspense fallback={null}>
            <Module check={CHECKS[0]} index={0} shown={false} ghost onReady={() => {}} />
          </Suspense>
        </div>
      )}

      <p className="v04-mark">AI-generated imagery</p>
      <div className="v04-flash" ref={flash} data-out={phase === 'fly' || phase === 'land' ? '0' : '1'} aria-hidden="true" />

      {idx >= 0 && (
        // if the page's code is not in yet, its coloured ground is shown at once, never a held white-out
        <Suspense
          fallback={
            <div className="v04-mod" style={{ ['--hue' as string]: CHECKS[idx].hue }}>
              <div className="v04-mod-bg" aria-hidden="true" />
            </div>
          }
        >
          <Module key={CHECKS[idx].id} check={CHECKS[idx]} index={idx} shown={phase === 'open'} onReady={() => setPageReady(true)} />
        </Suspense>
      )}
    </div>
  )
}

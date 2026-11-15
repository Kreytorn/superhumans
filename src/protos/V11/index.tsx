// Prototype V11 "Crystal Human": a human figure cut from prismatic crystal floats weightless before a fierce white star.
// Six jewels glow inside the crystal, each holding one check's real specimen image; pressing one flies the camera into
// the crystal and into the jewel, which opens that check's page. Routes: #/proto/V11/home and #/proto/V11/<module id>.
import '@fontsource-variable/syne'
import '@fontsource-variable/red-hat-display'
import '@fontsource-variable/geist-mono'
import './v11.css'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BASE, CHECKS, SITE_LINE, checkIndex, cropCss } from './data'
import { CrystalScene, hasWebGL, type CrystalCtl } from './scene'

// the check's page carries all six working stages: it loads apart from the home, and is fetched once the home settles
const loadModule = () => import('./Module')
const Module = lazy(loadModule)

// start the first picture and the title's face as soon as this code runs, before the first render asks for them
const TALL0 = window.innerWidth < 700 || window.innerWidth / window.innerHeight < 0.8
new Image().src = `${BASE}themes/V11/${TALL0 ? 'still_tall' : 'still'}.jpg`
const fontsIn: Promise<unknown> = Promise.race([
  Promise.all([document.fonts.load("800 54px 'Syne Variable'"), document.fonts.load("500 18px 'Red Hat Display Variable'")]),
  new Promise((r) => window.setTimeout(r, 1200)),
]).catch(() => {})

const go = (v: string) => {
  window.location.hash = `#/proto/V11/${v}`
}

// The still picture (used under the live scene until it is ready, and alone when WebGL is missing): where each jewel
// sits (shares of the screen), the button's size (share of the height), and where its name sits (shares of the screen).
type Spot = [number, number, number, number, number]
const STILL: Spot[] = [
  [0.536, 0.451, 0.155, 0.324, 0.451],
  [0.552, 0.308, 0.112, 0.324, 0.309],
  [0.411, 0.389, 0.107, 0.324, 0.387],
  [0.499, 0.751, 0.102, 0.324, 0.751],
  [0.561, 0.104, 0.093, 0.324, 0.105],
  [0.527, 0.168, 0.076, 0.324, 0.169],
]
const STILL_TALL: Spot[] = [
  [0.646, 0.606, 0.075, 0.307, 0.611],
  [0.673, 0.537, 0.054, 0.307, 0.537],
  [0.438, 0.577, 0.052, 0.307, 0.575],
  [0.584, 0.751, 0.049, 0.307, 0.751],
  [0.688, 0.44, 0.044, 0.307, 0.441],
  [0.632, 0.471, 0.036, 0.307, 0.476],
]

function useViewport() {
  const [vp, setVp] = useState(() => [window.innerWidth, window.innerHeight])
  useEffect(() => {
    const on = () => setVp([window.innerWidth, window.innerHeight])
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/** Button, name and leader positions over the still, from its measured spots. The still is scaled as the live scene
 *  frames the figure: by height on a wide screen (the figure's centre at 53.5 % across), by width on a phone. */
function stillStyle([x, y, sz, cx, cy]: Spot, W: number, H: number, tall: boolean) {
  const k = tall ? W / 390 : H / 900
  const sw = tall ? W : 1440 * k
  const sh = tall ? 844 * k : H
  const ox = tall ? 0 : 0.535 * (W - sw)
  const oy = tall ? 0.63 * (H - sh) : 0
  const px = ox + x * sw
  const py = oy + y * sh
  const s = sz * sh
  const r = s / 2.3
  const ax = ox + cx * sw + 2
  const ay = oy + cy * sh
  const dx = px - ax
  const dy = py - ay
  return {
    transform: `translate3d(${px - s / 2}px, ${py - s / 2}px, 0)`,
    width: `${s}px`,
    height: `${s}px`,
    ['--gw' as string]: `${r * 2.4 + 16}px`,
    ['--lx' as string]: `${ax - 2 - px}px`,
    ['--ly' as string]: `${ay - py}px`,
    ['--ll' as string]: `${Math.max(0, Math.hypot(dx, dy) - r * 1.08 - 3)}px`,
    ['--la' as string]: `${Math.atan2(dy, dx)}rad`,
    ['--cy' as string]: `${Math.max(168, Math.min(tall ? H - 168 : H - 0.086 * H - 120 - 164, ay)) - py}px`,
  }
}

export default function V11({ view, params }: { view: string; params: URLSearchParams }) {
  const idx = checkIndex(view) // -1 on the home view
  const [tall] = useState(() => window.innerWidth < 700 || window.innerWidth / window.innerHeight < 0.8)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // decided once: asking again on every route change would open a new WebGL context each time
  const [webgl, setWebgl] = useState(() => params.get('still') !== '1' && hasWebGL())
  const [sceneReady, setSceneReady] = useState(false)
  const [fontOk, setFontOk] = useState(false)
  useEffect(() => {
    let on = true
    void fontsIn.then(() => on && setFontOk(true))
    return () => {
      on = false
    }
  }, [])
  const [pageReady, setPageReady] = useState(false)
  const [pressed, setPressed] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  // true while the camera flies back out of a jewel: the six buttons wait until it has landed
  const [returning, setReturning] = useState(false)
  const [lastIdx, setLastIdx] = useState(idx)
  const host = useRef<HTMLDivElement>(null)
  const flash = useRef<HTMLDivElement>(null)
  const scene = useRef<CrystalScene | null>(null)
  const pressedRef = useRef(pressed)
  pressedRef.current = pressed
  const bare = params.get('bare') === '1'
  const [W, H] = useViewport()

  const ctl = useRef<CrystalCtl | null>(null)
  if (!ctl.current) ctl.current = { buttons: [], pointer: [0, 0], flash: null, onArrive: () => {}, onHome: () => {}, onReady: () => {}, onFail: () => {} }
  const c = ctl.current
  c.onArrive = (i) => {
    if (pressedRef.current === i) go(CHECKS[i].id)
  }
  c.onHome = () => setReturning(false)
  c.onReady = () => setSceneReady(true)
  c.onFail = () => setWebgl(false)

  useEffect(() => {
    if (!webgl || !host.current) return
    let s: CrystalScene
    try {
      c.flash = flash.current
      s = new CrystalScene(host.current, c, { tall, reduced, startAt: idx >= 0 ? idx : null, hold: params.get('hold') ? Number(params.get('hold')) : null })
    } catch {
      setWebgl(false)
      return
    }
    scene.current = s
    ;(window as unknown as { __v11?: CrystalScene }).__v11 = s
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
  }, [idx])
  // decided during render, so the home is never live for a frame while the camera is still inside the jewel
  if (lastIdx !== idx) {
    setLastIdx(idx)
    if (idx < 0 && lastIdx >= 0 && webgl) setReturning(true)
  }

  const press = useCallback(
    (i: number) => {
      if (!scene.current || reduced) return go(CHECKS[i].id)
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
      if (pressed != null || returning) return
      if (e.key >= '1' && e.key <= '6') press(Number(e.key) - 1)
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
        const cur = c.buttons.findIndex((b) => b === document.activeElement)
        const next = cur < 0 ? (hover ?? (dir > 0 ? -1 : 0)) + dir : cur + dir
        c.buttons[(next + 6) % 6]?.focus()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, pressed, returning, press, hover, c])

  // once the home has settled: fetch the page's code and the first things each stage draws, so a press opens at once
  useEffect(() => {
    if (!sceneReady && webgl) return
    const t = window.setTimeout(() => {
      void loadModule()
      const urls = [...CHECKS.map((k) => k.wide), `${BASE}tracktrace/ionscan_architecture.svg`, `${BASE}spikecount/fields/96.png`]
      for (const u of urls) {
        const im = new Image()
        im.src = u
      }
      for (const u of [`${BASE}tracktrace/gallery/gallery.json`, `${BASE}tracktrace/gallery/gallery_P242_G4.f16.bin.gz`]) void fetch(u).catch(() => {})
    }, 500)
    return () => window.clearTimeout(t)
  }, [sceneReady, webgl])

  // the page is mounted, hidden, the moment a jewel is pressed: its cost is paid during the flight
  const pageIdx = idx >= 0 ? idx : pressed
  const shown = idx >= 0
  const phase = shown ? 'open' : pressed != null ? 'fly' : returning ? 'back' : 'home'
  const ready = shown ? pageReady : webgl ? sceneReady : true
  const lit = target != null ? CHECKS[target] : hover != null ? CHECKS[hover] : null
  const still = tall ? STILL_TALL : STILL

  return (
    <div
      className="v11"
      data-phase={phase}
      data-ready={ready ? '1' : '0'}
      data-webgl={webgl ? '1' : '0'}
      data-tall={tall ? '1' : '0'}
      data-scene={sceneReady ? '1' : '0'}
      data-font={fontOk ? '1' : '0'}
      data-bare={bare ? '1' : '0'}
      data-lit={lit && phase === 'home' ? '1' : '0'}
      style={{ ['--hue' as string]: lit?.hue ?? '#b9a8ff' }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') c.pointer = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
      }}
    >
      <div className="v11-scene" ref={host} aria-hidden="true">
        <div className="v11-still" style={{ backgroundImage: `url(${BASE}themes/V11/${tall ? 'still_tall' : 'still'}.jpg)` }} />
      </div>
      <div className="v11-veil" aria-hidden="true" />

      <div className="v11-home" inert={phase !== 'home'}>
        <nav className="v11-jewels" aria-label="The six health checks">
          {CHECKS.map((k, i) => (
            <button
              key={k.id}
              type="button"
              className="v11-ch"
              data-vis={webgl ? '0' : '1'}
              data-hot={hover === i ? '1' : '0'}
              data-qa={i === 0 ? 'primary' : undefined}
              aria-describedby={`v11-say-${k.id}`}
              style={{ ['--h' as string]: k.hue, ...(webgl ? null : stillStyle(still[i], W, H, tall)) }}
              ref={(el) => {
                c.buttons[i] = el
              }}
              onClick={() => press(i)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
            >
              <span className="v11-ch-ring" aria-hidden="true">
                <svg viewBox="-4 -4 108 123.47">
                  <polygon points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87" />
                </svg>
              </span>
              <span className="v11-ch-lead" aria-hidden="true" />
              <span className="v11-ch-tag">
                <b>{k.name}</b> <i>{k.n}</i>
              </span>
              <span className="v11-card" aria-hidden="true">
                <span className="v11-card-img" style={cropCss(k, 300, 176)} />
                <span className="v11-card-txt">
                  <span className="v11-card-name">
                    {k.name} <i>{k.n}</i>
                  </span>
                  <span className="v11-card-line">{k.sentence}</span>
                </span>
              </span>
            </button>
          ))}
        </nav>
        <div className="v11-say">
          {CHECKS.map((k) => (
            <span key={k.id} id={`v11-say-${k.id}`}>
              {k.sentence}
            </span>
          ))}
        </div>

        <header className="v11-title">
          <h1>
            Super<span>Humans</span>
          </h1>
          <div className="v11-read">
            <p className="v11-line">{SITE_LINE}</p>
            {tall && lit && phase === 'home' && (
              <div className="v11-focus" key={lit.id}>
                <p className="v11-focus-line">{lit.sentence}</p>
              </div>
            )}
          </div>
        </header>
      </div>

      <p className="v11-mark">AI-generated imagery</p>
      <div className="v11-flash" ref={flash} data-out={phase === 'fly' ? '0' : '1'} aria-hidden="true" />

      {pageIdx != null && pageIdx >= 0 && (
        <Suspense fallback={null}>
          <Module key={CHECKS[pageIdx].id} check={CHECKS[pageIdx]} index={pageIdx} shown={shown} onReady={setPageReady} />
        </Suspense>
      )}
    </div>
  )
}

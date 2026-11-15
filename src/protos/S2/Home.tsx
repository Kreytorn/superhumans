import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import { CHECKS, SITE_LINE, cropStyle } from './data'

const Scene = lazy(() => import('./Scene'))

function webgl(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Home() {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const gl = useMemo(webgl, [])
  const [hover, setHover] = useState<string | null>(null)
  const [tour, setTour] = useState(0)
  const [leaving, setLeaving] = useState<string | null>(null)
  const [settled, setSettled] = useState(!gl)
  const timer = useRef<number | undefined>(undefined)
  const labels = useRef<(HTMLElement | null)[]>([])

  // with nobody pointing, the readout walks through the six checks on its own
  useEffect(() => {
    if (hover || leaving || reduced) return
    const id = window.setInterval(() => setTour((t) => (t + 1) % CHECKS.length), 3600)
    return () => window.clearInterval(id)
  }, [hover, leaving, reduced])

  const open = useCallback(
    (id: string) => {
      if (leaving) return
      if (reduced || !gl) {
        location.hash = `#/proto/S2/${id}`
        return
      }
      setLeaving(id)
      timer.current = window.setTimeout(() => {
        location.hash = `#/proto/S2/${id}`
      }, 680)
    },
    [leaving, reduced, gl],
  )
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= CHECKS.length && !e.metaKey && !e.ctrlKey && !e.altKey) open(CHECKS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const onActive = useCallback((id: string | null) => {
    setHover(id)
    if (id) setTour(CHECKS.findIndex((c) => c.id === id))
  }, [])
  const featured = hover ? CHECKS.find((c) => c.id === hover)! : CHECKS[tour]

  return (
    <div className={`s2 s2-home${leaving ? ' is-leaving' : ''}${settled ? ' is-settled' : ''}`} data-ready={settled ? '1' : undefined} data-proto="S2">
      {gl && (
        <div className="s2-stagewrap" aria-hidden="true">
          <Suspense fallback={null}>
            <Scene labels={labels} active={hover} featured={featured.id} leaving={leaving} onActive={onActive} onOpen={open} onSettled={() => setSettled(true)} reduced={reduced} />
          </Suspense>
          <span className="s2-aimark">AI-generated illustration</span>
        </div>
      )}

      {gl && (
        <nav className="s2-labels" aria-label="Open a check">
          {CHECKS.map((c, i) => (
            <a
              key={c.id}
              ref={(el) => {
                labels.current[i] = el
              }}
              className={`s2-lenslabel${featured.id === c.id ? ' is-on' : ''}${hover && hover !== c.id ? ' is-dim' : ''}`}
              style={{ ['--k' as string]: i }}
              href={`#/proto/S2/${c.id}`}
              onClick={(e) => {
                e.preventDefault()
                open(c.id)
              }}
              onMouseEnter={() => onActive(c.id)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(c.id)}
              onBlur={() => onActive(null)}
            >
              <span className="s2-lenslabel-n">{c.n}</span>
              <span className="s2-lenslabel-name">{c.name}</span>
            </a>
          ))}
        </nav>
      )}

      <header className="s2-top">
        <a className="s2-brand" href="#/proto/S2/home">
          <i aria-hidden="true" />
          SuperHumans
        </a>
        <span className="s2-top-note">Space Apps Challenge 2026 · Istanbul</span>
      </header>

      <section className="s2-hero">
        <p className="s2-kicker">Deep-space crew health</p>
        <h1 className="s2-word">
          <span>Super</span>
          <span>Humans</span>
        </h1>
        <p className="s2-line">{SITE_LINE}</p>
        <div className="s2-cta">
          <button type="button" className="s2-btn" onClick={() => open('tracktrace')}>
            Start with TrackTrace
            <ArrowRight weight="bold" />
          </button>
          <span className="s2-cta-hint">or press any specimen</span>
        </div>
      </section>

      <section className="s2-readout" aria-label="The six checks">
        <div className="s2-tabs" role="list">
          {CHECKS.map((c) => (
            <a
              key={c.id}
              role="listitem"
              className={`s2-tab${featured.id === c.id ? ' is-on' : ''}`}
              style={{ ['--hue' as string]: c.hue }}
              href={`#/proto/S2/${c.id}`}
              onClick={(e) => {
                e.preventDefault()
                open(c.id)
              }}
              onMouseEnter={() => onActive(c.id)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(c.id)}
              onBlur={() => onActive(null)}
              aria-label={`${c.n} ${c.name}`}
            >
              {c.n}
            </a>
          ))}
        </div>
        <a
          className="s2-now"
          key={featured.id}
          style={{ ['--hue' as string]: featured.hue }}
          href={`#/proto/S2/${featured.id}`}
          onClick={(e) => {
            e.preventDefault()
            open(featured.id)
          }}
        >
          <span className="s2-now-site">{featured.site}</span>
          <span className="s2-now-name">
            {featured.name}
            <ArrowUpRight weight="bold" />
          </span>
          <span className="s2-now-sentence">{featured.sentence}</span>
        </a>
      </section>

      <section className={`s2-list${gl ? '' : ' is-fallback'}`} aria-label="All six checks">
        {CHECKS.map((c) => (
          <a
            key={c.id}
            className="s2-row"
            style={{ ['--hue' as string]: c.hue }}
            href={`#/proto/S2/${c.id}`}
            onClick={(e) => {
              e.preventDefault()
              open(c.id)
            }}
          >
            <span className="s2-row-lens" style={cropStyle(c)} />
            <span className="s2-row-text">
              <span className="s2-row-n">
                {c.n} · {c.site}
              </span>
              <span className="s2-row-name">{c.name}</span>
              <span className="s2-row-sentence">{c.sentence}</span>
            </span>
            <ArrowUpRight className="s2-row-go" weight="bold" />
          </a>
        ))}
      </section>

      <div className="s2-fade" aria-hidden="true" />
    </div>
  )
}

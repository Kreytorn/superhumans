// S3 "Eclipse": home. One idea: each real specimen is a world in eclipse; six of them share one orbit.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowDown, ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import Corona from './Corona'
import { CHECKS, SITE_LINE, hexToRgb } from './data'
import { Go, Specimen, go, useSpikeCells } from './shared'

const DOCK = -110
const EASE = [0.16, 1, 0.3, 1] as const
const H1_LINES = [['Six', 'AI', 'health'], ['checks', 'for'], ['astronauts,']]

export default function Home() {
  const reduced = !!useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const lensRef = useRef<HTMLAnchorElement | null>(null)
  const turns = useRef(0)
  const prev = useRef(0)
  const cells = useSpikeCells()
  const check = CHECKS[active]
  const tint = useMemo(() => hexToRgb(check.tint), [check.tint])

  // the orbit turns the short way round to bring the chosen world to the dock
  const rotTarget = useMotionValue(DOCK)
  const rot = useSpring(rotTarget, { stiffness: 60, damping: 18, mass: 1.1 })
  const counter = useTransform(rot, (v) => -v)
  useEffect(() => {
    let d = active - prev.current
    if (d > 3) d -= 6
    if (d < -3) d += 6
    turns.current -= d
    prev.current = active
    rotTarget.set(DOCK + turns.current * 60)
    if (reduced) rot.jump(DOCK + turns.current * 60)
  }, [active, reduced, rot, rotTarget])

  useEffect(() => {
    if (paused || reduced) return
    const id = window.setInterval(() => setActive((a) => (a + 1) % CHECKS.length), 4400)
    return () => window.clearInterval(id)
  }, [paused, reduced])

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), reduced ? 100 : 2300)
    return () => window.clearTimeout(id)
  }, [reduced])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= CHECKS.length) go(CHECKS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { scrollY } = useScroll()
  const stageY = useTransform(scrollY, [0, 900], [0, reduced ? 0 : 140])
  const copyY = useTransform(scrollY, [0, 900], [0, reduced ? 0 : -60])
  const fade = useTransform(scrollY, [0, 620], [1, 0.15])

  const toChecks = useCallback(() => {
    document.getElementById('s3-checks')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [reduced])

  const hold = { onPointerEnter: () => setPaused(true), onPointerLeave: () => setPaused(false), onFocus: () => setPaused(true), onBlur: () => setPaused(false) }
  let w = 0

  return (
    <div className="s3 s3-home" data-ready={ready ? '1' : undefined} style={{ '--tint': check.tint } as CSSProperties}>
      <div className="s3-grain" aria-hidden="true" />
      <header className="s3-nav">
        <Go to="home" className="s3-brand" aria-label="SuperHumans, home">
          <span className="s3-brand-mark" aria-hidden="true" />
          SuperHumans
        </Go>
        <nav className="s3-nav-links" aria-label="Main">
          <button type="button" className="s3-link" onClick={toChecks}>
            The six checks
          </button>
          <Go to="tracktrace" className="s3-btn s3-btn-line">
            Open the flagship
            <ArrowUpRight weight="bold" />
          </Go>
        </nav>
      </header>

      <section className="s3-hero" aria-label="SuperHumans">
        <Corona lens={lensRef} tint={tint} still={reduced} />
        <motion.div className="s3-hero-copy" style={{ y: copyY, opacity: fade }}>
          <p className="s3-eyebrow">
            <span className="s3-dot" aria-hidden="true" />
            SuperHumans · crew health for deep space
          </p>
          <h1 className="s3-h1" aria-label={SITE_LINE}>
            {H1_LINES.map((line, li) => (
              <span className="s3-h1-line" key={li} aria-hidden="true">
                {line.map((word) => {
                  const i = w++
                  return (
                    <span className="s3-word" key={word}>
                      <motion.span
                        initial={reduced ? false : { y: '112%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 1.1, delay: 0.15 + i * 0.07, ease: EASE }}
                      >
                        {word}
                      </motion.span>
                    </span>
                  )
                })}
              </span>
            ))}
            <span className="s3-h1-line s3-h1-serif" aria-hidden="true">
              <span className="s3-word">
                <motion.span initial={reduced ? false : { y: '112%' }} animate={{ y: 0 }} transition={{ duration: 1.2, delay: 0.62, ease: EASE }}>
                  running in your browser.
                </motion.span>
              </span>
            </span>
          </h1>
          <motion.div
            className="s3-cta"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.95, ease: EASE }}
          >
            <Go to="tracktrace" className="s3-btn s3-btn-solid">
              Start with TrackTrace
              <ArrowRight weight="bold" />
            </Go>
            <button type="button" className="s3-btn s3-btn-quiet" onClick={toChecks}>
              See all six
              <ArrowDown weight="bold" />
            </button>
          </motion.div>
        </motion.div>

        <motion.div className="s3-hero-stage" style={{ y: stageY }} {...hold}>
          <motion.div
            className="s3-stage-in"
            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, delay: 0.1, ease: EASE }}
          >
            <span className="s3-ticks" aria-hidden="true" />
            <span className="s3-orbit-line" aria-hidden="true" />
            <span className="s3-orbit-line s3-orbit-far" aria-hidden="true" />
            <motion.div className="s3-orbit" style={{ rotate: rot }}>
              {CHECKS.map((c, i) => {
                const a = (i * 60 * Math.PI) / 180
                return (
                  <span
                    key={c.id}
                    className="s3-moon-slot"
                    style={{ left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%`, '--tint': c.tint } as CSSProperties}
                  >
                    <motion.button
                      type="button"
                      className="s3-moon"
                      style={{ rotate: counter }}
                      data-active={i === active ? '1' : undefined}
                      aria-label={i === active ? `Open ${c.name}` : `Show ${c.name}`}
                      onClick={() => (i === active ? go(c.id) : setActive(i))}
                    >
                      <span className="s3-moon-img">
                        <Specimen check={c} kind="lens" cells={cells} eager />
                      </span>
                      <span className="s3-moon-no">{c.no}</span>
                    </motion.button>
                  </span>
                )
              })}
            </motion.div>

            <Go to={check.id} className="s3-lens" ref={lensRef} aria-label={`Open ${check.name}`}>
              {CHECKS.map((c, i) => (
                <span className="s3-lens-layer" key={c.id} data-on={i === active ? '1' : undefined}>
                  <Specimen check={c} kind="lens" cells={cells} eager />
                </span>
              ))}
              <span className="s3-lens-shade" aria-hidden="true" />
              <span className="s3-lens-cap" key={check.id}>
                <span className="s3-mono">
                  {check.no} · {check.site}
                </span>
                <span className="s3-lens-name">{check.name}</span>
              </span>
            </Go>
            <Go to={check.id} className="s3-open" aria-label={`Open ${check.name}`}>
              <span>Open</span>
              <ArrowUpRight weight="bold" />
            </Go>
          </motion.div>
        </motion.div>

        <ol className="s3-strip" {...hold}>
          {CHECKS.map((c, i) => (
            <motion.li
              key={c.id}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 + i * 0.06, ease: EASE }}
            >
              <Go
                to={c.id}
                className="s3-strip-item"
                data-active={i === active ? '1' : undefined}
                style={{ '--tint': c.tint } as CSSProperties}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
              >
                <span className="s3-strip-bar" aria-hidden="true">
                  <i key={`${active}-${paused}`} data-run={i === active && !paused && !reduced ? '1' : undefined} />
                </span>
                <span className="s3-mono">{c.no}</span>
                <span className="s3-strip-name">{c.name}</span>
                <span className="s3-strip-site">{c.site}</span>
              </Go>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="s3-checks" id="s3-checks" aria-label="The six checks">
        <div className="s3-checks-head">
          <p className="s3-eyebrow">
            <span className="s3-dot" aria-hidden="true" />
            The six checks
          </p>
          <motion.h2
            className="s3-h2"
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12% 0px' }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            Each one runs a real trained model on real medical data, <em>and ends in what to do next.</em>
          </motion.h2>
        </div>

        {CHECKS.map((c, i) => (
          <article className="s3-row" key={c.id} data-flip={i % 2 ? '1' : undefined} style={{ '--tint': c.tint } as CSSProperties}>
            <motion.div
              className="s3-plate-wrap"
              initial={reduced ? false : { opacity: 0, y: 70, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-14% 0px' }}
              transition={{ duration: 1.3, ease: EASE }}
            >
              <Go to={c.id} className="s3-plate" aria-label={`Open ${c.name}`} tabIndex={-1}>
                <Specimen check={c} kind="plate" cells={cells} />
                <span className="s3-plate-no" aria-hidden="true">
                  {c.no}
                </span>
                <span className="s3-plate-open" aria-hidden="true">
                  <ArrowUpRight weight="bold" />
                </span>
              </Go>
            </motion.div>
            <motion.div
              className="s3-row-copy"
              initial={reduced ? false : { opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-14% 0px' }}
              transition={{ duration: 1.1, delay: 0.12, ease: EASE }}
            >
              <p className="s3-mono s3-row-kicker">
                <b>{c.no}</b> / 06 · {c.site}
                {i === 0 ? <span className="s3-flag">Flagship</span> : null}
              </p>
              <h3 className="s3-row-name">{c.name}</h3>
              <p className="s3-row-line">{c.line}</p>
              <Go to={c.id} className="s3-btn s3-btn-line">
                Open {c.name}
                <ArrowRight weight="bold" />
              </Go>
            </motion.div>
          </article>
        ))}
      </section>

      <footer className="s3-foot">
        <div className="s3-foot-arc" aria-hidden="true" />
        <p className="s3-eyebrow">
          <span className="s3-dot" aria-hidden="true" />
          Begin
        </p>
        <h2 className="s3-foot-h">
          Start with <em>the flagship.</em>
        </h2>
        <Go to="tracktrace" className="s3-btn s3-btn-solid s3-btn-big">
          Open TrackTrace
          <ArrowRight weight="bold" />
        </Go>
        <div className="s3-foot-row">
          <span>SuperHumans</span>
          <span>Every image on this page is a real specimen or a real model result.</span>
          <span>Built with AI assistance. Research demo, not a medical device.</span>
        </div>
      </footer>
    </div>
  )
}

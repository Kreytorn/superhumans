// Home: one drape, one window. Five checks are quiet, the blood check asks; one tap opens it.
// No model loads here: the outlines are the stored result of field-96 (the same result replay() gives).
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import * as spike from '../../engine/spikecount'
import type { SpikeResult } from '../../engine/spikecount'
import { ASKING, CHECKS, STATUS, byId, hrefOf, posterUrl, type CheckId, type Level } from './data'
import { WDTH_MAX, prefersReducedMotion, useViewport, widthAt } from './fit'
import { DRAW_MS, Field, FitWord, HowLayer, Mark, STEP_MS, type FieldApi } from './pieces'
import type { ViewProps } from './index'

const FIELD_URL = () => spike.ASSETS.url('fields/96.png')

export function Home({ params, fonts, onStatus }: ViewProps) {
  const { desktop, u, vw } = useViewport()
  const reduced = prefersReducedMotion()
  const still = params.has('state') || params.has('t') || reduced
  const [sel, setSel] = useState<CheckId>(ASKING)
  const [shown, setShown] = useState<CheckId>(ASKING)
  const [stored, setStored] = useState<SpikeResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [imageDone, setImageDone] = useState(false)
  const [t, setT] = useState<number | null>(still ? null : 0)
  const [how, setHow] = useState(false)
  const api = useRef<FieldApi>(null)
  const navTimer = useRef(0)

  useEffect(() => {
    let live = true
    spike
      .replay('field-96')
      .then((r) => live && setStored(r))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      window.clearTimeout(navTimer.current)
    }
  }, [])

  // The only marks that move on Home: the stored outlines, drawn once in the model's own cell order.
  useEffect(() => {
    if (!stored || !imageDone || still || t === null) return
    const end = (stored.cells.length - 1) * STEP_MS + DRAW_MS
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const now = performance.now() - t0
      if (now >= end) return setT(null)
      api.current?.draw(now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, imageDone])

  // One window, re-cut: the clip travels at once, the picture swaps at the midpoint.
  useEffect(() => {
    if (sel === shown) return
    const id = window.setTimeout(() => setShown(sel), reduced ? 0 : 240)
    return () => window.clearTimeout(id)
  }, [sel, shown, reduced])

  const ready = fonts && imageDone && (stored !== null || failed)
  // Home has no model action: ?state=result is the same settled picture, reported as the settled state.
  const viewState = params.get('state') === 'result' ? 'result' : 'idle'
  useEffect(() => onStatus({ ready, state: viewState }), [ready, viewState, onStatus])

  // every name fitted to one column width with the font's own width axis
  const size = desktop ? 124 * u : 48
  const target = useMemo(() => {
    const max = desktop ? 392 * u : Math.max(150, vw - 148)
    if (!fonts) return max
    return Math.floor(Math.min(max, ...CHECKS.map((c) => widthAt(c.name, 300, size, WDTH_MAX))))
  }, [fonts, desktop, u, vw, size])

  const selCheck = byId(sel)!
  const shownCheck = byId(shown)!
  const [l, tp, w, h] = selCheck.rect
  const clip = `inset(${tp}% ${100 - l - w}% ${100 - tp - h}% ${l}%)`
  const stageAspect = desktop ? 1 : vw / Math.max(300, window.innerHeight * 0.504)
  const [pl, pt, pw, ph] = shownCheck.rect
  const portrait = (pw / ph) * stageAspect < 1.15
  const blood = sel === ASKING && shown === ASKING
  const spikyPct = stored ? stored.metrics.spikyPct.toFixed(1) : null
  const before = spike.DEFAULT_BASELINES.model.spikyPct.toFixed(1)

  const open = (id: CheckId, e: MouseEvent) => {
    if (sel === id && shown === id) return // already exposed: the link opens at once
    e.preventDefault()
    setSel(id)
    window.clearTimeout(navTimer.current)
    navTimer.current = window.setTimeout(() => {
      location.hash = hrefOf(id)
    }, reduced ? 0 : 560)
  }

  return (
    <div className="drp-sheet drp-home" data-shape="square" data-selected={sel}>
      <div className="drp-win" data-qa="hero">
        <a className="drp-stage" href={hrefOf(sel)} style={{ clipPath: clip }} data-shown={shown} aria-label={`Open the ${selCheck.name.toLowerCase()} check`}>
          {shown === ASKING ? (
            <Field url={FIELD_URL()} cells={stored ? stored.cells : null} t={t} api={api} label={shownCheck.specimen} onImage={() => setImageDone(true)} />
          ) : (
            <img
              className="drp-poster"
              src={posterUrl(shown, portrait)}
              alt={shownCheck.specimen}
              style={{ left: `${pl}%`, top: `${pt}%`, width: `${pw}%`, height: `${ph}%` }}
              draggable={false}
              onLoad={(e) => {
                e.currentTarget.style.visibility = 'visible'
              }}
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden' // a missing still leaves a quiet dark window, never a broken-image icon
              }}
            />
          )}
        </a>
        {blood && <span className="drp-tab drp-tab-tr drp-tag">REPLAY</span>}
        {blood && spikyPct && (
          <p className="drp-tab drp-numtab">
            <b>{spikyPct}%</b> spiky cells; {before}% before flight
          </p>
        )}
        {sel !== ASKING && desktop && (
          <p className="drp-cap" style={{ left: `${l}%`, top: `calc(${tp + h}% + ${14 * u}px)`, width: `${Math.max(w, 62)}%` }}>
            {selCheck.sentence}
          </p>
        )}
      </div>

      <div className="drp-col">
        <h1 className="drp-sentence">Six AI health checks for astronauts, running in your browser.</h1>
        <nav
          className="drp-rows"
          aria-label="The six checks"
          style={{ ['--fitw' as string]: `${target}px` }}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(ASKING)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !navTimer.current) setSel(ASKING)
          }}
        >
          {CHECKS.map((c) => {
            // weight means one thing only: this check asks. Hover and focus are shown by the window re-cut.
            const asks = c.id === ASKING
            const level: Level = asks ? 'medic' : 'you'
            return (
              <a
                key={c.id}
                className="drp-row"
                href={hrefOf(c.id)}
                data-asks={asks ? '1' : '0'}
                data-shown={sel === c.id ? '1' : '0'}
                aria-current={sel === c.id ? 'true' : undefined}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(c.id)}
                onFocus={() => setSel(c.id)}
                onClick={(e) => open(c.id, e)}
              >
                <Mark level={level} />
                <FitWord text={c.name} weight={asks ? 800 : 300} size={size} target={target} ready={fonts} />
                {asks && <span className="drp-who">{STATUS[level].word}</span>}
              </a>
            )
          })}
        </nav>
        <p className="drp-state">
          Five are quiet. One asks for the crew medic.<span className="drp-tag">Illustrative</span>
        </p>
        <div className="drp-bar">
          <a className="drp-btn" data-qa="primary" href={hrefOf(ASKING)}>
            Open the blood check
          </a>
          <button type="button" className="drp-link drp-how-link" aria-expanded={how} onClick={() => setHow(true)}>
            How do we know?
          </button>
        </div>
      </div>

      <HowLayer open={how} onClose={() => setHow(false)}>
        <section>
          <h3>What you are looking at</h3>
          <p>The crew state on this page is a scripted demo: five checks quiet, one asking. Every specimen is real research data, never astronaut data.</p>
          <p>The models run in your browser, with no server. On a phone four checks show stored outputs, marked REPLAY.</p>
        </section>
        <section>
          <h3>The six checks</h3>
          <ul className="drp-checks6">
            {CHECKS.map((c) => (
              <li key={c.id}>
                <b>
                  {c.name} ({c.product}).
                </b>{' '}
                {c.evidence}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Who acts</h3>
          <ul className="drp-ladder">
            {(['you', 'medic', 'surgeon', 'abort'] as Level[]).map((lv) => (
              <li key={lv} data-off={lv === 'abort' ? '1' : '0'}>
                <Mark level={lv} colour="var(--green)" />
                <span>
                  <b>{STATUS[lv].word}:</b> {STATUS[lv].calls}.
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p>{spike.HONESTY.data}</p>
          <p className="drp-fine">Built with AI assistance (Claude). Typefaces: Anybody and Hanken Grotesk, SIL Open Font License. Data credits and licences sit inside each check.</p>
        </section>
      </HowLayer>
    </div>
  )
}

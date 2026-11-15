// DF TrackTrace page (r4, the owner's note: W1's first screen, then its "Out there, radiation flies straight through
// you." page, then our architecture). It reuses the W1 "inside the beamline" take (../../tracktrace_w1/room.tsx):
// the WebGL room with the 3D hologram nucleus, the working stage in its instrument window, the Iron ion / X-rays switch,
// the IonScan-vs-NASA count and "What to do next"; then W1's section 01; then the IonScan figure; then Next check.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { CheckPageProps } from '../check'
import { href } from '../data'
import { NextNav } from '../story'
import ArchSection from '../arch'
import { ProblemSection, W1Room } from '../../tracktrace_w1/room'
import type { MomentState } from '../../tracktrace_w1/stage'
import './tracktrace.css'

/** Where a press on the page arms the scroll guard: the stage window, the Scan button, the nucleus switch. */
const STAGE_SEL = '.w1-window, .w1-btn[data-qa="primary"], .w1-seg'

export default function TrackTracePage({ mod, live, pin, sample, onStatus }: CheckPageProps) {
  const [phase, setPhase] = useState<MomentState>('idle')
  const [ready, setReady] = useState(false)
  const id = mod.id
  // the page counts as ready once its stage is on screen (its Scan button works then), or once it failed
  const shown = live && (ready || phase === 'error')
  useEffect(() => {
    onStatus?.({ id, ready: shown, phase })
  }, [onStatus, id, shown, phase])

  // The page stays where the presenter left it (same guard as the standard DF check page): it never scrolls sideways,
  // and from a press on the stage or Scan until 3 s after the run it moves only for the presenter's own scrolling
  // (wheel, touch drag, scroll keys, the scrollbar) or the "story" cue; any other scroll is put back.
  const pageRef = useRef<HTMLDivElement>(null)
  const keep = useRef({ top: 0, settled: 0, restoreTo: null as number | null, userUntil: 0, armedUntil: 0, running: false, drag: false, moved: false })
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const K = keep.current
    const now = () => performance.now()
    const user = (ms = 900) => {
      K.userUntil = Math.max(K.userUntil, now() + ms)
    }
    let settleTimer = 0
    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0
      const t = now()
      if (K.drag || t < K.userUntil) {
        K.top = K.settled = el.scrollTop
        user(250)
      } else if (K.running || t < K.armedUntil) {
        if (Math.abs(el.scrollTop - K.top) > 1) el.scrollTop = K.top
      } else {
        K.top = el.scrollTop
        window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(() => {
          if (Math.abs(el.scrollTop - K.top) <= 1) K.settled = K.top
        }, 400)
      }
    }
    const onWheel = () => user()
    const onTouchMove = () => {
      K.moved = true
      user()
    }
    const onTouchEnd = () => {
      if (K.moved) user(1500)
      K.moved = false
    }
    const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as Element | null)?.closest?.('button, input, select, textarea, [role="slider"], [role="button"]')
      if (SCROLL_KEYS.has(e.key) && !tag) user()
    }
    const onDown = (e: PointerEvent) => {
      const tgt = e.target as Element | null
      if (tgt === el) {
        K.drag = true
        return
      }
      if (tgt?.closest?.(STAGE_SEL)) {
        const t = now()
        K.restoreTo = t >= K.userUntil && Math.abs(el.scrollTop - K.settled) > 1 ? K.settled : null
        K.top = el.scrollTop
        K.armedUntil = t + 4000
      }
    }
    const onClick = (e: Event) => {
      const back = K.restoreTo
      K.restoreTo = null
      if (back === null || !(e.target as Element | null)?.closest?.(STAGE_SEL)) return
      requestAnimationFrame(() => {
        K.top = K.settled = back
        el.scrollTop = back
      })
    }
    const onUp = () => {
      if (K.drag) user(600)
      K.drag = false
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('keydown', onKey)
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('click', onClick, true)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('click', onClick, true)
      window.clearTimeout(settleTimer)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
  useEffect(() => {
    const K = keep.current
    if (phase === 'running') K.running = true
    else if (K.running) {
      K.running = false
      K.armedUntil = Math.max(K.armedUntil, performance.now() + 3000)
    }
  }, [phase])
  useEffect(() => {
    if (!live || !pageRef.current) return
    keep.current.top = keep.current.settled = 0
    pageRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [live])

  /** "The story behind it": glide the page (only the page: scrollIntoView would move DF's clipped layers too). */
  const toStory = useCallback(() => {
    const page = pageRef.current
    const story = page?.querySelector<HTMLElement>('#w1-problem')
    if (!page || !story) return
    keep.current.userUntil = performance.now() + 2000
    page.scrollTo({ top: page.scrollTop + story.getBoundingClientRect().top - page.getBoundingClientRect().top, behavior: 'smooth' })
  }, [])

  const top = useMemo(
    () => (
      <header className="w1-top tt-top">
        <a className="df-back" href={href('home')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </a>
        <span className="w1-brand">
          SuperHumans <i>/</i> TrackTrace
        </span>
      </header>
    ),
    [],
  )
  // Below the first screen (mounted once the zoom has landed): the problem, the architecture, the way on.
  const after = useMemo(
    () =>
      live ? (
        <>
          <div className="w1-story tt-story">
            <ProblemSection />
          </div>
          <div className="tt-tail">
            <ArchSection id="tracktrace" />
            <NextNav mod={mod} />
          </div>
        </>
      ) : null,
    [live, mod],
  )

  return (
    <div ref={pageRef} className="df-check tt-page" data-ready={shown ? '1' : undefined} data-state={phase} data-module={id} style={{ '--mc': mod.color } as CSSProperties}>
      <W1Room live={live} pin={pin} sample={sample} top={top} after={after} onCue={toStory} cue="The problem, and the model" onState={setPhase} onReady={setReady} />
    </div>
  )
}

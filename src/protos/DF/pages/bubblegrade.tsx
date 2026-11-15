// DF's BubbleGrade page (r4, the owner's note: "First and second page of this and last page a new architecture diagram
// similar style a little more simpler"). Four parts, top to bottom:
//   1. W1's listening chamber (protos/bubblegrade_w1/chamber.tsx): the heart recording as a 3D landscape, play, live grade;
//   2. W1's story section 01, the problem (protos/bubblegrade_w1/story.tsx, Problem);
//   3. the architecture figure (../arch, from public/bubblegrade/architecture.json; nothing shows until it exists);
//   4. NextNav: back to the body, or the next check.
// W1's sections 02 to 04 are left out. Every number on screen comes from the BubbleGrade engine at run time.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import ListeningChamber, { isClip, type ChamberReport } from '../../bubblegrade_w1/chamber'
import { Problem } from '../../bubblegrade_w1/story'
import ArchSection from '../arch'
import { NextNav } from '../story'
import { href } from '../data'
import type { CheckPageProps } from '../check'
import './bubblegrade.css'

const START: ChamberReport = { ready: false, phase: 'idle', error: false, source: '', grade: '' }

export default function BubbleGradePage({ mod, live, pin, sample, onStatus }: CheckPageProps) {
  const [clip, setClip] = useState<string>(() => (isClip(sample) ? sample : 'grade-3'))
  const [rep, setRep] = useState<ChamberReport>(START)
  const pageRef = useRef<HTMLDivElement>(null)
  const id = mod.id
  const phase = rep.error && !rep.ready ? 'error' : rep.phase
  const shown = live && (rep.ready || rep.error)

  useEffect(() => {
    onStatus?.({ id, ready: shown, phase })
  }, [onStatus, id, shown, phase])

  // The page stays where the presenter left it (the same guard as DF's standard check page). It never scrolls sideways,
  // and whatever scroll it picked up during the flight is dropped on landing. From a press inside the chamber until 3 s
  // after the clip ends, it moves only for the presenter's own scrolling (wheel, a touch drag, scroll keys, the
  // scrollbar) or the cue; any other scroll (a focus, the browser bringing something into view) is put back.
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
      if (tgt?.closest?.('.bgw1-chamber') && !tgt.closest('.bgw1-cue')) {
        const t = now()
        K.restoreTo = t >= K.userUntil && Math.abs(el.scrollTop - K.settled) > 1 ? K.settled : null
        K.top = el.scrollTop
        K.armedUntil = t + 4000
      }
    }
    const onClick = (e: Event) => {
      const back = K.restoreTo
      K.restoreTo = null
      if (back === null || !(e.target as Element | null)?.closest?.('.bgw1-chamber')) return
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

  /** The cue at the bottom of the chamber glides the page (only the page) down to the problem. */
  const toProblem = useCallback(() => {
    const page = pageRef.current
    const sec = page?.querySelector<HTMLElement>('.bgw1-problem')
    if (!page || !sec) return
    keep.current.userUntil = performance.now() + 2000
    page.scrollTo({ top: page.scrollTop + sec.getBoundingClientRect().top - page.getBoundingClientRect().top, behavior: 'smooth' })
  }, [])

  return (
    <div
      ref={pageRef}
      className="df-check dfbg"
      data-ready={shown ? '1' : undefined}
      data-state={phase}
      data-module={id}
      data-source={rep.source || undefined}
      data-grade={rep.grade || undefined}
      style={{ '--mc': mod.color } as CSSProperties}
    >
      <div className="bgw1 bgw1-embed">
        <ListeningChamber
          clip={clip}
          onClip={setClip}
          pin={pin}
          live={live}
          onReport={setRep}
          onCue={toProblem}
          cue="The problem, and the model"
          back={
            <a className="df-back" href={href('home')}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </a>
          }
        />
        <div className="bgw1-story">
          <Problem />
        </div>
      </div>
      <div className="dfbg-tail">
        <ArchSection id="bubblegrade" />
        <NextNav mod={mod} />
      </div>
    </div>
  )
}

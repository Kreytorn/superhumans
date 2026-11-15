// BubbleGrade, version w1 "the listening chamber": the real heart recording becomes a landscape you stand inside.
// The first screen lives in chamber.tsx (DF's BubbleGrade page reuses it); the scroll story below it in story.tsx.
// Every number on screen is read from the engine result for the chosen clip (app/src/engine/bubblegrade).
import { useCallback, useEffect, useRef, useState } from 'react'
import * as bubble from '../../engine/bubblegrade'
import type { BubbleSample } from '../../engine/bubblegrade'
import ListeningChamber, { isClip, type ChamberReport } from './chamber'
import Story from './story'

export default function BubbleGradeW1({ params }: { view: string; params: URLSearchParams }) {
  const pinned = params.get('state')
  const [sampleId, setSampleId] = useState<string>(() => {
    const c = params.get('clip')
    return isClip(c) ? c : 'grade-3'
  })
  const [samples, setSamples] = useState<BubbleSample[]>([])
  const [rep, setRep] = useState<ChamberReport>({ ready: false, phase: 'idle', error: false, source: '', grade: '' })
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bubble.listSamples().then(setSamples).catch(() => {})
  }, [])

  const toTop = useCallback(() => rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), [])

  return (
    <div ref={rootRef} className="bgw1" data-ready={rep.ready ? '1' : '0'} data-state={rep.phase} data-source={rep.source} data-grade={rep.grade}>
      <ListeningChamber
        clip={sampleId}
        onClip={setSampleId}
        pin={pinned}
        onReport={setRep}
        onPlay={toTop}
        onCue={() => rootRef.current?.querySelector('.bgw1-story')?.scrollIntoView({ behavior: 'smooth' })}
        back={
          <a className="bgw1-back" href="#/">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            All checks
          </a>
        }
      />
      <Story
        samples={samples}
        current={sampleId}
        onPick={(id) => {
          setSampleId(id)
          toTop()
        }}
      />
    </div>
  )
}

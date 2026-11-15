// Prototype D "Drape": one flat green drape with a single window cut in it.
//   #/proto/D/home         Home (stored stills only, no model)
//   #/proto/D/spikecount   the blood check (?state=idle | result, ?t=<ms> pins the moment)
//   #/proto/D/tracktrace   the radiation check, the flagship (?state=idle | result, ?t=<ms>)
//   #/proto/D/bubblegrade  the bubbles check (?state=idle | result, ?t=<ms>); sound only after the tap
//   #/proto/D/<module>     a short preview of each of the other three checks
import { useCallback, useEffect, useState } from 'react'
import './drape.css'
import { byId } from './data'
import { Bubble } from './Bubble'
import { useFonts } from './fit'
import { Home } from './Home'
import { Preview } from './Preview'
import { Spike } from './Spike'
import { Track } from './Track'

export type ViewState = 'idle' | 'running' | 'result' | 'error'
export interface ViewProps {
  params: URLSearchParams
  /** true once the two typefaces are loaded, so fitted words can be measured */
  fonts: boolean
  onStatus: (s: { ready: boolean; state: ViewState }) => void
}

const GREEN = '#12574A'

export default function ProtoD({ view, params }: { view: string; params: URLSearchParams }) {
  const fonts = useFonts()
  const [status, setStatus] = useState<{ ready: boolean; state: ViewState }>({ ready: false, state: 'idle' })
  const onStatus = useCallback((s: { ready: boolean; state: ViewState }) => setStatus((p) => (p.ready === s.ready && p.state === s.state ? p : s)), [])
  const name = view.split('/')[0] || 'home'
  const REAL = ['spikecount', 'tracktrace', 'bubblegrade']
  const check = name !== 'home' && !REAL.includes(name) ? byId(name) : undefined

  // The drape is the whole page: colour the body (and the phone's browser bar) while this prototype is mounted.
  useEffect(() => {
    const body = document.body
    const before = body.style.background
    body.style.background = GREEN
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const made = !meta
    const beforeTheme = meta?.content ?? ''
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = GREEN
    return () => {
      body.style.background = before
      if (made) meta.remove()
      else meta.content = beforeTheme
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [name])

  return (
    <main className="drp" data-ready={status.ready ? '1' : undefined} data-state={status.state} data-view={check ? check.id : REAL.includes(name) ? name : 'home'}>
      {name === 'spikecount' ? (
        <Spike key="spikecount" params={params} fonts={fonts} onStatus={onStatus} />
      ) : name === 'tracktrace' ? (
        <Track key="tracktrace" params={params} fonts={fonts} onStatus={onStatus} />
      ) : name === 'bubblegrade' ? (
        <Bubble key="bubblegrade" params={params} fonts={fonts} onStatus={onStatus} />
      ) : check ? (
        <Preview key={check.id} check={check} params={params} fonts={fonts} onStatus={onStatus} />
      ) : (
        <Home key="home" params={params} fonts={fonts} onStatus={onStatus} />
      )}
    </main>
  )
}

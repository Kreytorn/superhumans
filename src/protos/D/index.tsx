// Prototype D "Drape": one flat green drape with a single window cut in it.
//   #/proto/D/home         Home (stored stills only, no model)
//   #/proto/D/spikecount   the blood check (?state=idle | result, ?t=<ms> pins the moment)
//   #/proto/D/<module>     a short preview of each of the other five checks
import { useCallback, useEffect, useState } from 'react'
import './drape.css'
import { byId } from './data'
import { useFonts } from './fit'
import { Home } from './Home'
import { Preview } from './Preview'
import { Spike } from './Spike'

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
  const check = name !== 'home' && name !== 'spikecount' ? byId(name) : undefined

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
    <main className="drp" data-ready={status.ready ? '1' : undefined} data-state={status.state} data-view={check ? check.id : name === 'spikecount' ? 'spikecount' : 'home'}>
      {name === 'spikecount' ? (
        <Spike key="spikecount" params={params} fonts={fonts} onStatus={onStatus} />
      ) : check ? (
        <Preview key={check.id} check={check} params={params} fonts={fonts} onStatus={onStatus} />
      ) : (
        <Home key="home" params={params} fonts={fonts} onStatus={onStatus} />
      )}
    </main>
  )
}

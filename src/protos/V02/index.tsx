// Take V02, "Glass Body": a life-size glass figure in the weightless posture before a planet's lit limb; six organs
// glow inside it like lanterns and each is one check. Pressing one dives through the glass into its light.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/geist-mono'
import './v02.css'
import { lazy, Suspense, type CSSProperties } from 'react'
import Home from './Home'
import { checkById, cropStyle } from './data'
import { loadModule } from './preload'

const Module = lazy(loadModule)

export default function V02({ view, params }: { view: string; params: URLSearchParams }) {
  const check = checkById(view)
  if (!check) return <Home from={params.get('from')} still={params.get('still') === '1'} />
  // while the page's code arrives, the organ's light holds the screen, so the dive never cuts to black
  const hold = (
    <div className="v02 v02-module" style={{ ['--c' as string]: check.hue } as CSSProperties}>
      <div className="v02-veil v02-hold" aria-hidden="true">
        <i />
        <span style={cropStyle(check)} />
      </div>
    </div>
  )
  return (
    <Suspense fallback={hold}>
      <Module key={check.id} check={check} />
    </Suspense>
  )
}

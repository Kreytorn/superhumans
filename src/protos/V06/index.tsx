// Take V06, "Pull Back": one continuous zoom from a warm human chest out to a planet's lit curve and back in to the
// person in the ship's great round window. Six lit places on the body dive through the skin into each check.
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/geist-mono'
import './v06.css'
import { lazy, Suspense } from 'react'
import Home from './Home'
import { checkById } from './data'

const Module = lazy(() => import('./Module'))

export default function V06({ view, params }: { view: string; params: URLSearchParams }) {
  const check = checkById(view)
  if (!check) return <Home params={params} />
  // while the page's code loads, keep showing the specimen the dive ended on (never a black flash)
  const hold = (
    <div className="v6 v6-mod" style={{ ['--h' as string]: check.hue }}>
      <div className="v6-mod-bg is-hold" aria-hidden="true">
        <img className="v6-mod-bg-wide" src={check.img} alt="" />
        <img className="v6-mod-bg-tall" src={check.imgTall} alt="" />
      </div>
    </div>
  )
  return (
    <Suspense fallback={hold}>
      <Module key={check.id} check={check} />
    </Suspense>
  )
}

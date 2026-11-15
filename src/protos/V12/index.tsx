// Take V12, "Suit Cutaway": the whole screen is one luminous cutaway drawing of an astronaut, drawn by code.
// Six windows are cut through the suit into the body; each shows its check's real specimen. Pressing one zooms into it.
import '@fontsource-variable/big-shoulders'
import '@fontsource-variable/archivo'
import '@fontsource-variable/martian-mono'
import './v12.css'
import { lazy, Suspense } from 'react'
import Home from './Home'
import { checkById } from './data'
import { loadedModule, loadModule } from './load'

const ModuleLazy = lazy(loadModule)

export default function V12({ view, params }: { view: string; params: URLSearchParams }) {
  const check = checkById(view)
  if (!check) return <Home from={params.get('from')} />
  // the home loads the page before the zoom ends, so arriving from it never shows the fallback
  const Module = loadedModule() ?? ModuleLazy
  return (
    <Suspense fallback={<div className="v12 v12-module" />}>
      <Module check={check} />
    </Suspense>
  )
}

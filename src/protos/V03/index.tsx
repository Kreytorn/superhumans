// Take V03, "Cutaway": the whole screen is one luminous cutaway drawing of a deep-space ship.
// Six rooms are cut open and lit; each shows its check's real specimen on the wall. Pressing a room zooms into it.
import '@fontsource-variable/big-shoulders'
import '@fontsource-variable/archivo'
import '@fontsource-variable/martian-mono'
import './v03.css'
import { lazy, Suspense } from 'react'
import Home from './Home'
import { checkById } from './data'
import { loadedModule, loadModule } from './load'

const ModuleLazy = lazy(loadModule)

export default function V03({ view, params }: { view: string; params: URLSearchParams }) {
  const check = checkById(view)
  if (!check) return <Home from={params.get('from')} />
  // the home loads the page before the zoom ends, so arriving from it never shows the fallback
  const Module = loadedModule() ?? ModuleLazy
  return (
    <Suspense fallback={<div className="v03 v03-module" />}>
      <Module check={check} />
    </Suspense>
  )
}

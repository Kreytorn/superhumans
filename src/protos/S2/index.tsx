// Take S2, "Cinematic Web Experience": a figure of light above a planet's sunrise, six real specimens as lenses round it.
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './s2.css'
import './s2-polish.css'
import { lazy, Suspense } from 'react'
import Home from './Home'
import { checkById } from './data'

const Module = lazy(() => import('./Module'))

export default function S2({ view }: { view: string; params: URLSearchParams }) {
  const check = checkById(view)
  if (!check) return <Home />
  return (
    <Suspense fallback={<div className="s2 s2-module" />}>
      <Module key={check.id} check={check} />
    </Suspense>
  )
}

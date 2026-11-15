// Prototype S3 "Eclipse" (r3 one-shot): every real specimen is a world in eclipse; six of them share one orbit.
// Routes: #/proto/S3/home and #/proto/S3/<module id>. Everything is scoped under .s3.
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import './s3.css'
import { CHECKS } from './data'
import Home from './Home'
import Module from './Module'

export default function S3({ view }: { view: string; params: URLSearchParams }) {
  const check = CHECKS.find((c) => c.id === view)
  return check ? <Module check={check} /> : <Home />
}

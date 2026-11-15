// App shell (r4): a hash router that lazy-loads each prototype and each module moment from its own folder.
//   #/ or no hash        -> the website: the DF take's home (src/protos/DF), the same tree as #/proto/DF/home,
//                           so a body spot opened from the front page still flies into its check
//   #/proto/<X>/<view>   -> src/protos/<X>/index.tsx     (default export, props { view, params })
//   #/moment/<module>    -> src/moments/<module>/harness.tsx (default export, props { params })
//   #/dev                -> the developer build index (every prototype and moment)
//   #/r2                 -> the r2 prototype screen, #/selftest -> the engine self-test
//   any other address    -> the website's front page too (a mistyped or old link never shows the developer index)
// A folder appears here as soon as its entry file exists; nobody edits this file to register one.
import { Component, createElement, lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { useRoute } from './lib/route'

export interface ProtoProps {
  /** The part of the route after the prototype id, e.g. "home" or "spikecount". */
  view: string
  params: URLSearchParams
}
export interface HarnessProps {
  params: URLSearchParams
}

/** The take that is the website (the owner's pick in r3). The front page renders its home. */
const SITE = 'DF'
/** First route segments that lead somewhere other than the front page. */
const ROUTES = new Set(['proto', 'moment', 'dev', 'r2', 'selftest'])

const protoLoaders = import.meta.glob<{ default: ComponentType<ProtoProps> }>('./protos/*/index.tsx')
const momentLoaders = import.meta.glob<{ default: ComponentType<HarnessProps> }>('./moments/*/harness.tsx')
const R2 = lazy(() => import('./r2/R2App'))
const SelfTest = lazy(() => import('./dev/SelfTest').then((m) => ({ default: m.SelfTest })))

const lazyCache = new Map<string, ComponentType<never>>()
function lazyFrom<P>(key: string, loader: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  let c = lazyCache.get(key)
  if (!c) {
    c = lazy(loader) as unknown as ComponentType<never>
    lazyCache.set(key, c)
  }
  return c as unknown as ComponentType<P>
}

class Boundary extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <pre data-error="1" style={{ padding: 24, font: '14px ui-monospace, monospace', whiteSpace: 'pre-wrap' }}>
        {this.props.name} crashed: {this.state.error.message}
      </pre>
    )
  }
}

function DevIndex() {
  const ids = (keys: string[]) => keys.map((k) => k.split('/')[2]).sort()
  const row = (label: string, links: [string, string][]) => (
    <p>
      <b>{label}</b>{' '}
      {links.length ? links.map(([text, href]) => <a key={href} href={href} style={{ marginRight: 12 }}>{text}</a>) : 'none yet'}
    </p>
  )
  return (
    <main style={{ padding: 24, font: '16px system-ui, sans-serif', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
      <h1 style={{ fontSize: 20 }}>SuperHumans, build index</h1>
      {row('Website:', [['front page', '#/'], [`${SITE} credits`, `#/proto/${SITE}/credits`], [`${SITE} QR end screen`, `#/proto/${SITE}/qr`]])}
      {row('Prototypes:', ids(Object.keys(protoLoaders)).flatMap((x) => [[`${x} home`, `#/proto/${x}/home`], [`${x} spikecount`, `#/proto/${x}/spikecount`]] as [string, string][]))}
      {row('Moments:', ids(Object.keys(momentLoaders)).map((m) => [m, `#/moment/${m}`] as [string, string]))}
      {row('Other:', [['r2 prototype', '#/r2'], ['engine self-test', '#/selftest']])}
    </main>
  )
}

export default function App() {
  const { path, params } = useRoute()
  const seg = path.split('/').filter(Boolean)
  let node: ReactNode
  let name = path
  // The front page ("#/", "#/home" or no hash; parseHash calls all three "home") is the site's home. It gets the
  // same name and component as #/proto/<SITE>/..., so moving between them never remounts the page.
  const proto = seg[0] === 'proto' && seg[1] ? { id: seg[1], view: seg.slice(2).join('/') || 'home' } : !ROUTES.has(seg[0] ?? '') ? { id: SITE, view: 'home' } : null
  if (proto) {
    const key = `./protos/${proto.id}/index.tsx`
    const loader = protoLoaders[key]
    name = `prototype ${proto.id}`
    node = loader ? createElement(lazyFrom(key, loader), { view: proto.view, params }) : <DevIndex />
  } else if (seg[0] === 'moment' && seg[1]) {
    const key = `./moments/${seg[1]}/harness.tsx`
    const loader = momentLoaders[key]
    name = `moment ${seg[1]}`
    node = loader ? createElement(lazyFrom(key, loader), { params }) : <DevIndex />
  } else if (seg[0] === 'r2') node = <R2 />
  else if (seg[0] === 'selftest') node = <SelfTest />
  else node = <DevIndex />
  return (
    <Boundary name={name} key={name}>
      <Suspense fallback={null}>{node}</Suspense>
    </Boundary>
  )
}

// Tiny hash router: "#/spikecount?state=result&tier=2". Hash routes work on GitHub Pages and in Electron.
import { useSyncExternalStore } from 'react'

export interface Route {
  path: string
  params: URLSearchParams
}

export function parseHash(hash: string = location.hash): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  return { path: path || 'home', params: new URLSearchParams(query) }
}

export function navigate(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== false) q.set(k, String(v))
  const s = q.toString()
  location.hash = `#/${path}${s ? `?${s}` : ''}`
}

/** Updates one query parameter without leaving the screen. */
export function setParam(key: string, value: string | number | boolean | undefined) {
  const r = parseHash()
  if (value === undefined || value === false) r.params.delete(key)
  else r.params.set(key, String(value))
  const s = r.params.toString()
  history.replaceState(null, '', `#/${r.path}${s ? `?${s}` : ''}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parseHash(hash)
}

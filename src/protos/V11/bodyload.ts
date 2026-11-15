// The body is cut once per visit and kept: a worker does the work; if workers fail, the main thread does it.
import type { BodyMesh } from './body'

let cache: Promise<BodyMesh> | null = null

export function loadBody(): Promise<BodyMesh> {
  if (cache) return cache
  cache = new Promise<BodyMesh>((resolve, reject) => {
    const local = () =>
      import('./body')
        .then((m) => resolve(m.buildBody()))
        .catch(reject)
    try {
      const w = new Worker(new URL('./body.worker.ts', import.meta.url), { type: 'module' })
      const t = window.setTimeout(() => {
        w.terminate()
        local()
      }, 6000)
      w.onmessage = (e: MessageEvent<BodyMesh>) => {
        window.clearTimeout(t)
        w.terminate()
        resolve(e.data)
      }
      w.onerror = () => {
        window.clearTimeout(t)
        w.terminate()
        local()
      }
      w.postMessage(0)
    } catch {
      local()
    }
  })
  return cache
}

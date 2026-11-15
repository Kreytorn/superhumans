// Builds the crystal body off the main thread, so the page stays smooth while it is cut.
import { buildBody } from './body'

const post = self as unknown as { postMessage(m: unknown, transfer: Transferable[]): void }
self.onmessage = () => {
  const b = buildBody()
  post.postMessage(b, [b.position.buffer, b.normal.buffer, b.bary.buffer, b.facet.buffer, b.corner.buffer, b.smooth.buffer, b.shardMatrix.buffer, b.shardSeed.buffer])
}

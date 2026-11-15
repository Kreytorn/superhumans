// Records the settled home for some seconds (CDP screencast) and keeps a frame every <step> ms.
// node src/protos/V03/_tools/life.mjs <outDir> [WxH] [seconds] [step]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg = 'life', size = '1440x900', secs = '8', stepArg = '200'] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height } })
await page.goto('http://localhost:5503/#/proto/V03/home', { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
const cdp = await page.context().newCDPSession(page)
const frames = []
cdp.on('Page.screencastFrame', (f) => {
  frames.push({ t: f.metadata.timestamp * 1000, data: f.data })
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: width, maxHeight: height, everyNthFrame: 1 })
await page.waitForTimeout(Number(secs) * 1000)
await cdp.send('Page.stopScreencast')
await browser.close()
const t0 = frames[0]?.t ?? 0
const step = Number(stepArg)
let n = 0
for (let at = 0; at <= Number(secs) * 1000; at += step) {
  let best = null
  for (const f of frames) if (f.t - t0 <= at && (!best || f.t > best.t)) best = f
  if (best) writeFileSync(join(out, `life_${String(at).padStart(5, '0')}.jpg`), Buffer.from(best.data, 'base64'))
  n++
}
console.log(frames.length, 'frames over', secs, 's;', n, 'kept')

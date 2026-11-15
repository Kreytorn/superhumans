// Dev-only: film the first seconds of loading the home (screencast from navigation), frames named by ms since goto.
// node src/protos/V11/_tools/entry.mjs <outDir> [WxH]
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
const [outDir, size = '1440x900'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width, height } })
const cdp = await page.context().newCDPSession(page)
const frames = []
cdp.on('Page.screencastFrame', async (f) => {
  frames.push({ t: Date.now(), data: f.data })
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 1 })
const t0 = Date.now()
await page.goto('http://localhost:5511/#/proto/V11/home', { waitUntil: 'commit' })
const marks = {}
const poll = setInterval(async () => {
  try {
    const m = await page.evaluate(() => ({ still: !!document.querySelector('.v11-still'), scene: document.querySelector('.v11')?.dataset.scene, ready: document.querySelector('.v11')?.dataset.ready }))
    const t = Date.now() - t0
    if (m.still && !marks.still) marks.still = t
    if (m.scene === '1' && !marks.scene) marks.scene = t
    if (m.ready === '1' && !marks.ready) marks.ready = t
  } catch {}
}, 50)
await page.waitForTimeout(6000)
clearInterval(poll)
await cdp.send('Page.stopScreencast')
for (const f of frames) writeFileSync(`${outDir}/${String(f.t - t0).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'))
console.log(JSON.stringify(marks), 'frames', frames.length)
await browser.close()

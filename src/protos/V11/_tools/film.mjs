// Dev-only: film a press into a jewel in real time (screencast), saving each painted frame named by ms since the press.
// node src/protos/V11/_tools/film.mjs <n 1-6> <outDir> [WxH] [--ms 2600]
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
const a = process.argv.slice(2)
const [n, outDir, size = '1440x900'] = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--ms')
const ms = a.includes('--ms') ? Number(a[a.indexOf('--ms') + 1]) : 2600
const [width, height] = size.split('x').map(Number)
const phone = width < 700
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
await page.goto('http://localhost:5511/#/proto/V11/home', { waitUntil: 'load' })
await page.waitForSelector('.v11[data-ready="1"]', { timeout: 40000 })
await page.waitForTimeout(2500)
const cdp = await page.context().newCDPSession(page)
const frames = []
let t0 = 0
cdp.on('Page.screencastFrame', async (f) => {
  frames.push({ t: Date.now(), data: f.data })
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 })
await page.waitForTimeout(300)
t0 = Date.now()
await page.click(`.v11-ch:nth-child(${n})`, { force: true })
await page.waitForTimeout(ms)
await cdp.send('Page.stopScreencast')
const hash = await page.evaluate(() => location.hash)
let last = -1
const log = []
for (const f of frames) {
  const t = f.t - t0
  if (t < -100) continue
  const name = `${String(Math.max(0, t)).padStart(5, '0')}${t < 0 ? 'pre' : ''}.jpg`
  writeFileSync(`${outDir}/${name}`, Buffer.from(f.data, 'base64'))
  if (last >= 0 && t - last > 120) log.push(`gap ${last}->${t}`)
  last = t
}
console.log('frames', frames.length, 'hash', hash, log.join(' '))
await browser.close()

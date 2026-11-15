// Dev-only: press a chamber and log the phase, hash and canvas frame count over time (checks the flight's real length).
// node src/protos/V04/_tools/probe.mjs [n] [WxH]
import { chromium } from 'playwright-core'
const n = process.argv[2] ?? '1'
const [width, height] = (process.argv[3] ?? '1440x900').split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width, height } })
await page.goto('http://localhost:5504/#/proto/V04/home', { waitUntil: 'load' })
await page.waitForSelector('.v04[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(400)
await page.evaluate((n) => {
  window.__log = []
  let f = 0
  const t0 = performance.now()
  const loop = () => {
    f++
    const r = document.querySelector('.v04')
    const fl = document.querySelector('.v04-flash')
    window.__log.push(`${Math.round(performance.now() - t0)} f${f} ${r?.dataset.phase} ${location.hash.slice(10)} flash=${fl ? getComputedStyle(fl).opacity : '-'}`)
    if (performance.now() - t0 < 2600) requestAnimationFrame(loop)
  }
  document.querySelector(`.v04-ch:nth-child(${n})`).click()
  requestAnimationFrame(loop)
}, n)
await page.waitForTimeout(2800)
const log = await page.evaluate(() => window.__log)
console.log(log.filter((_, i) => i % 6 === 0 || i === log.length - 1).join('\n'))
await browser.close()

// Dev-only: time the press-to-open flight and the way back.
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await page.goto('http://localhost:5324/#/proto/HOLE/home', { waitUntil: 'load' })
await page.waitForSelector('.hole[data-ready="1"]')
await page.waitForTimeout(5000)
for (const n of [2, 5, 6]) {
  let t0 = Date.now()
  await page.click(`.hole-light:nth-child(${n})`, { force: true, noWaitAfter: true })
  const samples = []
  for (const at of [600, 1200, 1800]) { await page.waitForTimeout(Math.max(1, at - (Date.now() - t0))); samples.push(await page.textContent('.hole-clock-v')) }
  await page.waitForSelector('.hole[data-phase="open"]', { timeout: 10000 })
  const tIn = Date.now() - t0
  const name = await page.textContent('.hole-head h2')
  t0 = Date.now()
  await page.click('.hole-back')
  await page.waitForFunction(() => document.querySelector('.hole-clock-v')?.textContent === '1.00', null, { timeout: 10000 })
  console.log(n, name, 'in', tIn, 'ms; clock at 0.6/1.2/1.8 s:', samples.join(' '), '; back to full time', Date.now() - t0, 'ms', await page.evaluate(() => location.hash))
  await page.waitForTimeout(400)
}
if (errs.length) console.log(errs.slice(-6).join('\n'))
await browser.close()

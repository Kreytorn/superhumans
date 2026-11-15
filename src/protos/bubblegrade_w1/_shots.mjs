// Dev-only: screenshots of this prototype (a real press with mid-run frames, the settled result, the scroll section).
// node src/protos/bubblegrade_w1/_shots.mjs <outDir> [WxH] [all|run|scroll|pin]
import { chromium } from 'playwright-core'
const [out, size = '1440x900', what = 'all'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--enable-unsafe-webgpu'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const base = 'http://localhost:5602/#/proto/bubblegrade_w1/home'
const ready = () => page.waitForSelector('.bgw1[data-ready="1"]', { timeout: 60000 })
if (what === 'all' || what === 'run') {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await ready()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/idle_${width}.png` })
  await page.click('[data-qa="primary"]')
  let at = 0
  for (const ms of [3000, 7000, 12000]) {
    await page.waitForTimeout(ms - at)
    at = ms
    await page.screenshot({ path: `${out}/run_${width}_${ms}.png` })
  }
  await page.waitForSelector('.bgw1[data-state="result"]', { timeout: 30000 })
  if (!phone) await page.waitForSelector('.bgw1[data-source="live"]', { timeout: 30000 }).catch(() => console.log('live did not arrive'))
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${out}/screen_${width}.png` })
  console.log('source', await page.getAttribute('.bgw1', 'data-source'), 'grade', await page.getAttribute('.bgw1', 'data-grade'))
}
if (what === 'final') {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await ready()
  await page.click('[data-qa="primary"]')
  await page.waitForSelector('.bgw1[data-source="live"]', { timeout: 60000 }).catch(() => console.log('live did not arrive'))
  await page.waitForSelector('.bgw1[data-state="result"]', { timeout: 30000 })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${out}/screen_${width}.png` })
  console.log('source', await page.getAttribute('.bgw1', 'data-source'), 'grade', await page.getAttribute('.bgw1', 'data-grade'))
}
if (what === 'pin') {
  await page.goto(`${base}?state=result`, { waitUntil: 'domcontentloaded' })
  await ready()
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${out}/screen_${width}.png` })
}
if (what === 'all' || what === 'scroll') {
  await page.goto(`${base}?state=result`, { waitUntil: 'domcontentloaded' })
  await ready()
  await page.waitForTimeout(2500)
  const tops = await page.evaluate(() => [...document.querySelectorAll('.bgw1-sec')].map((s) => s.getBoundingClientRect().top + document.querySelector('.bgw1').scrollTop))
  let i = 0
  for (const top of tops) {
    await page.evaluate((y) => document.querySelector('.bgw1').scrollTo(0, y), top + 44)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/scroll${i ? `_${i + 1}` : ''}_${width}.png` })
    i++
  }
  await page.evaluate(() => document.querySelector('.bgw1').scrollTo(0, 1e6))
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/scroll_end_${width}.png` })
}
if (logs.length) console.log(logs.slice(-12).join('\n'))
await browser.close()

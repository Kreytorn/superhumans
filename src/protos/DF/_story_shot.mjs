// Dev-only: open a check page, save the first screen, then the second screen at a few scroll steps.
// node src/protos/DF/_story_shot.mjs <module> <outPrefix> [WxH] [--press] [--steps n]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const pos = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--steps')
const [view, out, size = '1440x900'] = pos
const steps = a.includes('--steps') ? Number(a[a.indexOf('--steps') + 1]) : 3
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text().slice(0, 300)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`))
await page.goto(`http://localhost:5310/#/proto/DF/${view}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.df-check[data-ready="1"]', { timeout: 60000 })
await page.waitForTimeout(4000)
if (a.includes('--press')) {
  await page.waitForSelector('.df-check-btn:not([disabled])', { timeout: 60000 }).catch(() => logs.push('button never enabled'))
  const btn = page.locator('.df-check-btn').first()
  await (phone ? btn.tap() : btn.click()).catch((e) => logs.push('press: ' + e.message.split('\n')[0]))
  await page.waitForSelector('.df-check[data-state="result"]', { timeout: 90000 }).catch(() => logs.push('no result state'))
  await page.waitForTimeout(1500)
}
await page.screenshot({ path: `${out}_0.png` })
const top = await page.evaluate(() => {
  const r = document.querySelector('.df-check')
  const s = document.querySelector('.df-story')
  return { top: s ? s.getBoundingClientRect().top + r.scrollTop - 24 : 0, sh: r.scrollHeight, sw: r.scrollWidth, cw: r.clientWidth }
})
for (let k = 0; k < steps; k++) {
  await page.evaluate((y) => document.querySelector('.df-check').scrollTo(0, y), top.top + k * (height - 80))
  await page.waitForTimeout(1300)
  await page.screenshot({ path: `${out}_${k + 1}.png` })
}
console.log(view, size, JSON.stringify(top))
if (logs.length) console.log(logs.slice(-8).join('\n'))
await browser.close()

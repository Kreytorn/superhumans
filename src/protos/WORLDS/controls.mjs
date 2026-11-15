// Dev-only: uses the story section's controls on a check page. node src/protos/WORLDS/controls.mjs [WxH]
import { chromium } from 'playwright-core'
const [size = '1440x900'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width <= 500
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars'],
})
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: phone ? 2 : 1,
  hasTouch: phone,
  isMobile: phone,
})
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => m.type() === 'error' && !m.text().includes('onnxruntime') && logs.push(`[console] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto('http://localhost:5323/#/proto/WORLDS/tracktrace', {
  waitUntil: 'load',
})
await page.waitForSelector('.wd-root[data-ready="1"]', { timeout: 40000 })
const top = () => page.evaluate(() => document.querySelector('.wd-page')?.scrollTop ?? -1)
await page.locator('.wd-cue').click()
await page.waitForTimeout(1500)
console.log('cue scrolls to story:', (await top()) > 300)
await page.locator('.wd-story-top').click()
await page.waitForTimeout(1500)
console.log('back to the check scrolls up:', (await top()) < 5)
await page.locator('.wd-story-next').scrollIntoViewIfNeeded()
await page.locator('.wd-story-next').click()
await page.waitForTimeout(800)
console.log('next world goes to:', await page.evaluate(() => location.hash))
await page.waitForSelector('.wd-page[data-open="1"]', { timeout: 20000 }).catch(() => logs.push('next page never opened'))
console.log('new page starts at top:', (await top()) < 5)
if (logs.length) console.log('--- errors ---\n' + [...new Set(logs)].join('\n'))
await browser.close()

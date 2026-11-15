// node src/protos/garnmeter_w2/_shot.mjs <port> <outDir> [state]   own screenshots (screen, story sections, full page)
import { chromium } from 'playwright-core'
const [port = '5612', out = '.', state = 'result'] = process.argv.slice(2)
const url = `http://localhost:${port}/#/proto/garnmeter_w2/home?state=${state}`
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars'] })
async function one(w, h, mobile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector(`.g2[data-ready="1"][data-state="${state}"]`, { timeout: 90000 }).catch(() => console.log('not settled', w))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/screen_${w}.png` })
  const n = await page.evaluate(() => document.querySelectorAll('.g2-sec').length)
  for (let i = 0; i < n; i++) {
    await page.evaluate((k) => document.querySelectorAll('.g2-sec')[k].scrollIntoView(), i)
    await page.waitForTimeout(w > 500 ? 2300 : 1600)
    await page.screenshot({ path: `${out}/sec${i + 1}_${w}.png`, timeout: 90000 })
  }
  await page.evaluate(() => document.getElementById('g2-story')?.scrollIntoView())
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/scroll_${w}.png` })
  await page.screenshot({ path: `${out}/full_${w}.jpg`, fullPage: true, type: "jpeg", quality: 60, timeout: 120000 })
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  console.log(w, 'sideways scroll px:', sw)
  await ctx.close()
}
await one(1440, 900, false)
await one(390, 844, true)
await browser.close()

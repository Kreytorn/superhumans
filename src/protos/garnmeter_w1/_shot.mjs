// node src/protos/garnmeter_w1/_shot.mjs <port> <outDir> <tag>   (own screenshots: waits long enough on a busy machine)
import { chromium } from 'playwright-core'
const [port = '5606', out = '.', tag = ''] = process.argv.slice(2)
const pre = tag ? `${tag}_` : ''
const url = `http://localhost:${port}/#/proto/garnmeter_w1/home?state=result`
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu'] })
async function one(w, h, mobile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  page.on('console', (m) => m.type() === 'error' && console.log('[error]', m.text().slice(0, 200)))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector('.gw1[data-state="result"][data-ready="1"]', { timeout: 150000 }).catch(() => console.log('not settled', w))
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/${pre}screen_${w}.png` })
  const src = await page.evaluate(() => document.querySelector('.gw1-chip')?.textContent)
  console.log(w, 'source tag:', src)
  await page.evaluate(() => document.getElementById('gw1-story')?.scrollIntoView())
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${pre}scroll_${w}.png` })
  await page.screenshot({ path: `${out}/${pre}full_${w}.jpg`, fullPage: true, type: 'jpeg', quality: 70 })
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  console.log(w, 'sideways scroll px:', sw)
  await ctx.close()
}
await Promise.all([one(1440, 900, false), one(390, 844, true)])
await browser.close()

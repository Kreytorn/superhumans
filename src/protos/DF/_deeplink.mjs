// Dev-only: open a check by its own link, press Back, and check that home arrives with the figure drawn.
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errs = []
page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message.slice(0, 200)}`))
await page.goto('http://localhost:5310/#/proto/DF/braindrift', { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.df[data-landed="1"] .df-check[data-ready="1"]', { timeout: 60000 }).catch(() => errs.push('check never ready'))
await page.locator('.df-back').first().click()
await page.waitForSelector('.df[data-view="home"][data-ready="1"]:not([data-landed])', { timeout: 20000 }).catch(() => errs.push('home never ready'))
await page.waitForTimeout(600)
await page.screenshot({ path: '../work/Web/shots/DF/r2_home_after_back_1440.png' })
console.log(await page.evaluate(() => ({ hash: location.hash, page: !!document.querySelector('.df-check'), scene: getComputedStyle(document.querySelector('.df-scene')).visibility })), errs.length ? errs.join('\n') : 'no errors')
await browser.close()

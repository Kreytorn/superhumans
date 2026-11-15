// Dev-only: open a check page, scroll its page to the bottom and save a screenshot (shows the IonScan figure card).
import { chromium } from 'playwright-core'
const [view, out, size = '1440x900', proto = 'DF'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 700, isMobile: width < 700 })
await page.goto(`http://localhost:5310/#/proto/${proto}/${view}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.df-check[data-ready="1"]', { timeout: 60000 })
await page.waitForTimeout(3000)
await page.evaluate(() => document.querySelector('.df-check').scrollTo(0, 1e6))
await page.waitForTimeout(800)
await page.screenshot({ path: out })
console.log(view, size, 'scrolled')
await browser.close()

// Dev-only: open a DF route, wait until the page reports data-ready="1", and save a screenshot.
// node src/protos/DF/_shot.mjs <view> <out.png> [WxH] [--wait ms] [--hover sel] [--click sel] [--scroll px] [--full]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--wait', '--hover', '--click', '--scroll'].includes(a[i - 1])))
const [view, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5310/#/proto/DF/${view}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.df[data-ready="1"]', { timeout: 45000 }).catch(() => logs.push('not ready'))
if (flag('--hover')) await page.hover(val('--hover'), { force: true }).catch((e) => logs.push('hover: ' + e.message))
if (flag('--click')) await page.click(val('--click'), { force: true }).catch((e) => logs.push('click: ' + e.message))
if (flag('--scroll')) await page.evaluate((y) => document.querySelector('.df-scroll')?.scrollTo(0, y), Number(val('--scroll')))
await page.waitForTimeout(Number(val('--wait', 500)))
await page.screenshot({ path: out, fullPage: flag('--full') })
const info = await page.evaluate(() => ({
  hash: location.hash,
  gl: !document.querySelector('.df-fig.nogl'),
  links: document.querySelectorAll('.df a[href]').length,
  sw: document.documentElement.scrollWidth,
  cw: document.documentElement.clientWidth,
}))
console.log(view, size, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-10).join('\n'))
await browser.close()

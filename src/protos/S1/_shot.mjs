// Dev-only: open an S1 route, optionally press the main button, wait, and save a screenshot.
// node src/protos/S1/_shot.mjs <view> <out.png> [WxH] [--run] [--wait ms] [--full] [--scroll px] [--hover sel]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--wait', '--scroll', '--hover', '--key', '--click'].includes(a[i - 1])))
const [view, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 700, isMobile: width < 700 })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5301/#/proto/S1/${view}`, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 20000 }).catch(() => logs.push('not ready'))
if (flag('--key')) await page.keyboard.press(val('--key'))
if (flag('--hover')) await page.hover(val('--hover'), { force: true }).catch((e) => logs.push('hover: ' + e.message))
if (flag('--click')) await page.click(val('--click'), { force: true }).catch((e) => logs.push('click: ' + e.message))
if (flag('--run')) await page.click('.s1-head .s1-btn').catch((e) => logs.push('click: ' + e.message))
await page.waitForTimeout(Number(val('--wait', 600)))
if (flag('--scroll')) await page.evaluate((y) => document.querySelector('.s1').scrollTo(0, y), Number(val('--scroll')))
if (flag('--scroll')) await page.waitForTimeout(400)
await page.screenshot({ path: out })
const info = await page.evaluate(() => ({ state: document.querySelector('.s1-mod')?.getAttribute('data-state'), next: document.querySelector('.s1-next-v')?.textContent, sw: document.querySelector('.s1').scrollWidth, cw: document.querySelector('.s1').clientWidth, sh: document.querySelector('.s1').scrollHeight }))
console.log(view, size, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-8).join('\n'))
await browser.close()

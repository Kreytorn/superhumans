// Dev-only: open a MARS route, optionally click things, wait, and save a screenshot.
// node src/protos/MARS/_shot.mjs <view> <out.png> [WxH] [--click sel] [--run] [--wait ms] [--scroll px] [--hover sel] [--then view2]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const opts = ['--wait', '--scroll', '--hover', '--click', '--then', '--wait2']
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && opts.includes(a[i - 1])))
const [view, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 700, isMobile: width < 700 })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5321/#/proto/MARS/${view}${flag("--still") ? "?still=1" : ""}`, { waitUntil: 'load' })
await page.waitForSelector('.mars[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
if (flag('--hover')) await page.hover(val('--hover'), { force: true }).catch((e) => logs.push('hover: ' + e.message))
if (flag('--click')) await page.click(val('--click'), { force: true }).catch((e) => logs.push('click: ' + e.message))
await page.waitForTimeout(Number(val('--wait', 2500)))
if (flag('--run')) {
  await page.click('.mars-run').catch((e) => logs.push('run: ' + e.message))
  await page.waitForTimeout(Number(val('--wait2', 9000)))
}
if (flag('--then')) {
  await page.evaluate((v) => (location.hash = `#/proto/MARS/${v}`), val('--then'))
  await page.waitForTimeout(Number(val('--wait2', 4000)))
}
if (flag('--scroll')) {
  await page.evaluate((y) => document.querySelector('.mars-mod')?.scrollTo(0, y), Number(val('--scroll')))
  await page.waitForTimeout(500)
}
await page.screenshot({ path: out })
const info = await page.evaluate(() => {
  const r = document.querySelector('.mars')
  return { gl: r?.dataset.gl, view: r?.dataset.view, fly: r?.dataset.fly, mod: document.querySelector('.mars-mod')?.getAttribute('data-state') ?? null, sw: r?.scrollWidth, cw: r?.clientWidth }
})
console.log(view, size, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-10).join('\n'))
await browser.close()

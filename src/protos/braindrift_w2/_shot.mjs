// Dev-only: node src/protos/braindrift_w2/_shot.mjs <query> <out.png> [WxH] [--scroll px|#id] [--wait ms] [--click sel] [--noready]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--wait', '--scroll', '--click'].includes(a[i - 1])))
const [query = '', out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--enable-unsafe-webgpu', '--use-angle=d3d11'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5611/#/proto/braindrift_w2/home${query ? '?' + query : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
if (!flag('--noready')) await page.waitForSelector('.bw2[data-ready="1"]', { timeout: 60000 }).catch(() => logs.push('not ready'))
if (flag('--click')) await page.click(val('--click'), { force: true }).catch((e) => logs.push('click: ' + e.message))
if (flag('--scroll')) {
  const s = val('--scroll')
  await page.evaluate((s) => {
    const root = document.querySelector('.bw2')
    if (s.startsWith('#')) root.scrollTo(0, document.querySelector(s.split('+')[0]).offsetTop + Number(s.split('+')[1] || 0))
    else root.scrollTo(0, Number(s))
  }, s)
}
await page.waitForTimeout(Number(val('--wait', 1500)))
await page.screenshot({ path: out, fullPage: false })
const info = await page.evaluate(() => {
  const r = document.querySelector('.bw2')
  return { state: r?.dataset.state, step: r?.dataset.step, sw: r?.scrollWidth, cw: r?.clientWidth, sh: r?.scrollHeight, text: (r?.querySelector('.bw2-act')?.innerText || '').replace(/\n+/g, ' | ').slice(0, 400) }
})
console.log(size, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-12).join('\n'))
await browser.close()

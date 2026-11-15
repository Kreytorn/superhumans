// Dev-only: node src/protos/spikecount_w2/_shot.mjs <query> <out.png> [WxH] [--run] [--wait ms] [--scroll px|story] [--click sel]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--wait', '--scroll', '--click', '--pre'].includes(a[i - 1])))
const [query, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 700 ? 2 : 1, hasTouch: width < 700, isMobile: width < 700 })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[err] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(`http://localhost:5609/#/proto/spikecount_w2/home${query === '-' ? '' : '?' + query}`, { waitUntil: 'load' })
await page.waitForSelector('[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push('not ready'))
if (flag('--pre')) await page.waitForTimeout(Number(val('--pre')))
if (flag('--run')) await page.click('[data-qa="primary"]').catch((e) => logs.push('click: ' + e.message))
if (flag('--click')) await page.click(val('--click'), { force: true }).catch((e) => logs.push('click: ' + e.message))
await page.waitForTimeout(Number(val('--wait', 800)))
if (flag('--scroll')) {
  const s = val('--scroll')
  await page.evaluate((s) => {
    const r = document.querySelector('.scw2')
    if (s === 'story') r.scrollTo(0, document.querySelector('#scw2-story').offsetTop)
    else r.scrollTo(0, Number(s))
  }, s)
  await page.waitForTimeout(1800)
}
await page.screenshot({ path: out })
const info = await page.evaluate(() => ({ state: document.querySelector('.scw2')?.getAttribute('data-state'), tag: document.querySelector('.scw2-tag')?.textContent, sw: document.querySelector('.scw2').scrollWidth, cw: document.querySelector('.scw2').clientWidth, sh: document.querySelector('.scw2').scrollHeight }))
console.log(JSON.stringify(info))
if (logs.length) console.log(logs.slice(-8).join('\n'))
await browser.close()

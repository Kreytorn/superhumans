// Dev-only: open a check page, optionally press its main button and wait for the result, save a screenshot.
// node src/protos/DF/_check_shot.mjs <module> <out.png> [WxH] [--press] [--wait ms] [--full] [--proto DFC] [--timeout ms]
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const flag = (n) => a.includes(n)
const val = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d)
const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--wait', '--proto', '--timeout'].includes(a[i - 1])))
const [view, out, size = '1440x900'] = pos
const [width, height] = size.split('x').map(Number)
const phone = width < 700
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`))
await page.goto(`http://localhost:5310/#/proto/${val('--proto', 'DF')}/${view}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('.df-check[data-ready="1"]', { timeout: 60000 }).catch(() => logs.push('not ready'))
await page.waitForTimeout(Number(val('--wait', 3500)))
if (flag('--press')) {
  await page.waitForSelector('.df-check-btn:not([disabled])', { timeout: 60000 }).catch(() => logs.push('button never enabled'))
  const btn = page.locator('.df-check-btn')
  if (await btn.count()) await (phone ? btn.tap() : btn.click()).catch((e) => logs.push('press: ' + e.message.split('\n')[0]))
  else logs.push('no button')
  await page.waitForSelector('.df-check[data-state="result"]', { timeout: Number(val('--timeout', 90000)) }).catch(() => logs.push('no result state'))
  await page.waitForTimeout(1200)
}
await page.screenshot({ path: out, fullPage: flag('--full') })
const info = await page.evaluate(() => {
  const r = document.querySelector('.df-check')
  const st = document.querySelector('.df-check-stage')?.getBoundingClientRect()
  return {
    state: r?.getAttribute('data-state'),
    stage: st ? `${Math.round(st.width)}x${Math.round(st.height)} = ${Math.round((100 * st.width * st.height) / (innerWidth * innerHeight))}% of screen` : null,
    big: document.querySelector('.df-check-big b')?.textContent ?? null,
    who: document.querySelector('.df-check-who')?.textContent ?? null,
    action: document.querySelector('.df-check-action')?.textContent ?? null,
    tag: document.querySelector('.df-check-tag')?.textContent ?? null,
    sw: r?.scrollWidth, cw: r?.clientWidth, sh: r?.scrollHeight,
  }
})
console.log(view, size, JSON.stringify(info))
if (logs.length) console.log(logs.slice(-8).join('\n'))
await browser.close()

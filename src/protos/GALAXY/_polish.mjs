// Dev-only screenshots for the polish pass. node src/protos/GALAXY/_polish.mjs <out dir> <shot> [<shot> ...]
// shot = <name>:<view>:<WxH>[:scroll=<px|story|how|arch|end>][:run][:wait=<ms>]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [out, ...shots] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const base = 'http://localhost:5322/#/proto/GALAXY/'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const logs = []
for (const spec of shots) {
  const [name, view, size, ...opts] = spec.split(':')
  const [width, height] = size.split('x').map(Number)
  const touch = width <= 500
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[${name}] ${m.text().slice(0, 240)}`))
  page.on('pageerror', (e) => logs.push(`[${name}] pageerror ${e.message.slice(0, 240)}`))
  await page.goto(base + view, { waitUntil: 'load' })
  await page.waitForSelector('.gx[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push(`[${name}] not ready`))
  let wait = view === 'home' ? 2200 : 1800
  for (const o of opts) {
    if (o === 'run') {
      await page.waitForTimeout(view === 'veinsqueeze' ? 6000 : 1500)
      await page.click('.gx-run')
      wait = 7000
    } else if (o.startsWith('wait=')) wait = Number(o.slice(5))
    else if (o.startsWith('hover=')) {
      await page.waitForTimeout(1500)
      await page.hover(o.slice(6))
    } else if (o.startsWith('scroll=')) {
      const v = o.slice(7)
      await page.waitForTimeout(1200)
      await page.evaluate((v) => {
        const sc = document.querySelector('.gx-mod-scroll')
        if (!sc) return
        const pick = { story: '.gx-story', how: '.gx-how', arch: '.gx-arch', scans: '.gx-scans', facts: '.gx-facts', end: '.gx-story-nav' }[v]
        if (pick) {
          const el = document.querySelector(pick)
          const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop
          sc.scrollTop = top - (v === 'story' ? 0 : v === 'arch' ? 24 : 60)
        } else sc.scrollTop = Number(v)
      }, v)
    }
  }
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${out}/${name}.png` })
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  if (sideways) logs.push(`[${name}] sideways scroll`)
  await ctx.close()
}
await browser.close()
console.log(logs.length ? logs.join('\n') : 'no errors')

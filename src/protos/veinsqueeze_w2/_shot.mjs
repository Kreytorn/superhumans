// Dev-only: screenshots for this proto. node src/protos/veinsqueeze_w2/_shot.mjs <outDir> [state] [--press]
import { chromium } from 'playwright-core'

const [outDir, state = 'result'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const press = process.argv.includes('--press')
const base = 'http://localhost:5610/#/proto/veinsqueeze_w2/home'
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--use-angle=d3d11'],
})
for (const [w, h, phone] of [
  [1440, 900, false],
  [390, 844, true],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
  page.on('pageerror', (e) => logs.push(e.message))
  const url = press ? base : `${base}?state=${state}`
  await page.goto(url, { waitUntil: 'load' })
  const t0 = Date.now()
  await page.waitForSelector('.w2-root[data-ready="1"]', { timeout: 120000 }).catch(() => logs.push('not ready'))
  if (press) {
    await page.waitForTimeout(800)
    await page.locator('[data-qa="primary"]').first().click().catch((e) => logs.push('click ' + e.message))
    await page.waitForTimeout(1700)
    await page.screenshot({ path: `${outDir}/running_${w}.png` })
  }
  if (state === 'result' || press)
    await page.waitForSelector('.w2-root[data-state="result"]', { timeout: 120000 }).catch(() => logs.push('no result'))
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${outDir}/screen_${w}.png` })
  // walk the sections below
  const secs = await page.$$eval('.w2-sec', (els) => els.map((e) => e.getBoundingClientRect().top + window.scrollY))
  for (let i = 0; i < secs.length; i++) {
    await page.evaluate((y) => window.scrollTo(0, y - 10), secs[i])
    await page.waitForTimeout(2200)
    await page.screenshot({ path: `${outDir}/scroll${i + 1}_${w}.png` })
  }
  console.log(w, 'ms', Date.now() - t0, logs.slice(0, 5).join(' | '))
  await ctx.close()
}
await browser.close()

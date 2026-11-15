// Dev-only check for prototype D's radiation check (not part of the app bundle).
//   node src/protos/D/qa-track.mjs <outDir> [port] [view]
// Warm press on a laptop (time to the first circle, LIVE tag), the lens over another cell, the "How do we know?"
// layer, the IonScan figure one scroll step down, and the same on a phone.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? 'qa-out')
const port = process.argv[3] ?? '5204'
const view = process.argv[4] ?? 'tracktrace'
const url = `http://localhost:${port}/#/proto/D/${view}`
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu'] })
const errors = []
const log = (...a) => console.log(...a)
const txt = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel)

for (const size of [{ name: '1440', viewport: { width: 1440, height: 900 } }, { name: '390', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]) {
  const ctx = await browser.newContext(size)
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`${size.name}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${size.name}: [pageerror] ${e.message}`))
  await page.goto(url)
  const t0 = Date.now()
  await page.waitForSelector('.drp[data-ready="1"]', { timeout: 30000 })
  log(size.name, 'ready after', Date.now() - t0, 'ms')
  const t1 = Date.now()
  await page.click('[data-qa="primary"]')
  await page.waitForFunction(() => /^[1-9]/.test(document.querySelector('[data-qa="answer"]')?.textContent ?? '') && !document.querySelector('[data-qa="answer"]').classList.contains('drp-out'), null, { timeout: 60000, polling: 16 })
  log(size.name, 'first circle after', Date.now() - t1, 'ms')
  await page.waitForSelector('.drp[data-state="result"]', { timeout: 60000 })
  log(size.name, 'result after', Date.now() - t1, 'ms |', await txt(page, '[data-qa="answer"]'), '|', await txt(page, '[data-qa="compare"]'), '|', await txt(page, '[data-qa="act"]'))
  await page.screenshot({ path: join(out, `pressed_result_${size.name}.png`) })
  // the lens over another cell
  const box = await page.locator('.ttm').boundingBox()
  const px = box.x + box.width * 0.62
  const py = box.y + box.height * 0.7
  if (size.hasTouch) await page.touchscreen.tap(px, py)
  else await page.mouse.move(px, py, { steps: 4 })
  await page.waitForTimeout(500)
  log(size.name, 'lens:', await txt(page, '[data-qa="answer"]'), '|', await txt(page, '[data-qa="compare"]'))
  await page.screenshot({ path: join(out, `lens_${size.name}.png`) })
  if (!size.hasTouch) await page.mouse.move(100, 500)
  // layer two
  await page.click('.drp-how-link')
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `how_${size.name}.png`) })
  log(size.name, 'how sections:', await page.evaluate(() => [...document.querySelectorAll('.drp-how h3')].map((h) => h.textContent).join(' / ')))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  // one scroll step down: the IonScan figure
  if (size.hasTouch) await page.evaluate(() => document.querySelector('.drp-ion').scrollIntoView({ block: 'start' }))
  else await page.click('.drp-cue')
  await page.waitForTimeout(1200)
  await page.waitForFunction(() => document.querySelector('.drp-ion-fig img')?.complete)
  log(size.name, 'scrollY', await page.evaluate(() => Math.round(scrollY)), 'figure', JSON.stringify(await page.evaluate(() => { const r = document.querySelector('.drp-ion-fig').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] })))
  await page.screenshot({ path: join(out, `ionscan_${size.name}.png`) })
  await ctx.close()
}
log(errors.length ? `console errors:\n${errors.join('\n')}` : 'console clean')
await browser.close()

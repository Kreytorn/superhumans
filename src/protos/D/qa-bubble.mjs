// Dev-only check for prototype D's bubbles check (not part of the app bundle).
//   node src/protos/D/qa-bubble.mjs <outDir> [port]
// Sound is off before the tap; one press plays the clip and runs the model; the grade, the technician line,
// the tag and the action land; "Stop" ends a run.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? 'qa-out')
const port = process.argv[3] ?? '5204'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--autoplay-policy=user-gesture-required'] })
const errors = []
const txt = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel)
const stageAttr = (page, name) => page.evaluate((n) => document.querySelector('[data-qa="hero"]')?.getAttribute(n) ?? null, name)
for (const size of [{ name: '1440', viewport: { width: 1440, height: 900 } }, { name: '390', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]) {
  const ctx = await browser.newContext(size)
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`${size.name}: ${m.text().slice(0, 160)}`))
  page.on('pageerror', (e) => errors.push(`${size.name}: [pageerror] ${e.message}`))
  await page.goto(`http://localhost:${port}/#/proto/D/bubblegrade`)
  const t0 = Date.now()
  await page.waitForSelector('.drp[data-ready="1"]', { timeout: 30000 })
  console.log(size.name, 'ready after', Date.now() - t0, 'ms | sound before the tap:', await stageAttr(page, 'data-sound'))
  const t1 = Date.now()
  await page.click('[data-qa="primary"]')
  await page.waitForTimeout(2500)
  console.log(size.name, '2.5 s in: button', JSON.stringify(await txt(page, '[data-qa="primary"]')), '| sound', await stageAttr(page, 'data-sound'), '| clip s', await stageAttr(page, 'data-clip-s'))
  await page.screenshot({ path: join(out, `bubble_running_${size.name}.png`) })
  await page.waitForSelector('.drp[data-state="result"]', { timeout: 60000 })
  console.log(size.name, 'result after', Date.now() - t1, 'ms |', await txt(page, '[data-qa="answer"]'), '|', await txt(page, '[data-qa="compare"]'), '|', await txt(page, '[data-qa="act"]'))
  await page.screenshot({ path: join(out, `bubble_pressed_result_${size.name}.png`) })
  await page.click('[data-qa="primary"]')
  await page.waitForTimeout(1200)
  await page.click('[data-qa="primary"]')
  await page.waitForTimeout(600)
  console.log(size.name, 'after Play again then Stop: state', await page.evaluate(() => document.querySelector('.drp').dataset.state), '| button', JSON.stringify(await txt(page, '[data-qa="primary"]')))
  await ctx.close()
}
console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'console clean')
await browser.close()

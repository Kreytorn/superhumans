// Dev-only checks for the SpikeCount stage (installed Microsoft Edge through playwright-core).
// node src/moments/spikecount/qa.mjs <port> <outDir> [what]   what = all | shots | posters | live | sync
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const [port = '5613', out = 'qa/out/spikecount', what = 'all'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const base = `http://localhost:${port}/#/moment/spikecount`
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11'] })
const logs = []
const open = async (query, w, h, phone = false) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  await page.goto(`${base}${query}`, { waitUntil: 'load' })
  await page.waitForSelector('.scm[data-ready="1"]', { timeout: 20000 })
  await page.waitForTimeout(700)
  return page
}
const want = (k) => what === 'all' || what === k

if (want('shots')) {
  for (const [w, h, phone] of [
    [1440, 900, false],
    [390, 844, true],
  ]) {
    for (const q of ['?state=idle', '?t=2600', '?state=result', '?state=result&sample=field-184', '?state=result&sample=field-81']) {
      const page = await open(q, w, h, phone)
      await page.screenshot({ path: `${out}/${q.replace(/[?&=]/g, '_').replace(/^_/, '')}_${w}.png` })
      await page.context().close()
    }
  }
  // pointing at a cell, and picking a grade in the strip
  const page = await open('?state=result', 1440, 900)
  const box = await page.locator('.scm-pane-b').boundingBox()
  await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.4)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/hover_1440.png` })
  console.log('hover chip:', await page.locator('.scm-chip').innerText().catch(() => 'NONE'))
  await page.mouse.move(5, 5)
  await page.locator('.scm-g').nth(4).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/pick_1440.png` })
  console.log('pick:', await page.locator('.scm').getAttribute('data-pick'))
  await page.context().close()
}

if (want('sync')) {
  // The line and the outlines are one clip: check the counter against the line position at several times.
  const page = await open('?t=0', 1440, 900)
  for (const t of [600, 1500, 2600, 3700, 4640, 5700]) {
    await page.goto(`${base}?t=${t}`)
    await page.waitForTimeout(250)
    const a = await page.locator('.scm').evaluate((el) => ({ count: el.dataset.count, spiky: el.dataset.spiky, phase: el.dataset.phase, state: el.dataset.state }))
    console.log(`t=${t}`, JSON.stringify(a))
  }
  await page.context().close()
}

if (want('live')) {
  const page = await open('?mode=live', 1440, 900)
  await page.locator('[data-qa="primary"]').click()
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${out}/live_wait_1440.png` })
  const t0 = Date.now()
  await page.waitForSelector('.scm[data-state="result"]', { timeout: 60000 })
  console.log('live run to result:', Date.now() - t0, 'ms; source =', await page.locator('.scm').getAttribute('data-source'), '; tag =', await page.locator('.scm-tag').innerText())
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/live_result_1440.png` })
  // second run, filmed at fixed offsets (warm models)
  await page.locator('[data-qa="primary"]').click()
  await page.waitForSelector('.scm[data-phase="1"]', { timeout: 30000 })
  for (const ms of [900, 2000, 3200]) {
    await page.waitForTimeout(ms === 900 ? 700 : 1100)
    await page.screenshot({ path: `${out}/live_film_${ms}.png` })
  }
  await page.waitForSelector('.scm[data-state="result"]', { timeout: 30000 })
  await page.context().close()
}

if (want('posters')) {
  for (const [w, h, name] of [
    [1600, 1000, 'poster'],
    [900, 1200, 'poster_portrait'],
  ]) {
    const page = await open('?bare=1&state=result', w, h)
    await page.screenshot({ path: `${out}/${name}.png` })
    await page.context().close()
  }
}

if (logs.length) console.log('--- errors ---\n' + logs.join('\n'))
else console.log('no console errors')
await browser.close()

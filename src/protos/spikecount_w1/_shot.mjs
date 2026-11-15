// Dev-only screenshot helper for this prototype (installed Edge via playwright-core).
// node src/protos/spikecount_w1/_shot.mjs <port> <outDir> [mode]   mode: final | film
import { chromium } from 'playwright-core'
const [port = '5603', out = '../work/Web/shots/k2/spikecount_w1', mode = 'final'] = process.argv.slice(2)
const base = `http://localhost:${port}/#/proto/spikecount_w1/home`
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const logs = []
async function open(w, h, q, phone) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, isMobile: !!phone, hasTouch: !!phone })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[${w}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[${w}] pageerror ${e.message}`))
  await page.goto(base + q, { waitUntil: 'load' })
  await page.waitForSelector('.sw1[data-ready="1"]', { timeout: 30000 }).catch(() => logs.push(`[${w}] no data-ready`))
  return page
}
if (mode === 'final') {
  let p = await open(1440, 900, '?state=result')
  await p.waitForSelector('.sw1[data-state="result"]', { timeout: 20000 }).catch(() => logs.push('no result 1440'))
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/screen_1440.png` })
  await p.waitForSelector('.sw1-xbtn', { timeout: 170000 }).catch(() => logs.push('no outliner view button'))
  await p.waitForTimeout(800)
  if (await p.$('.sw1-xbtn')) {
    await p.click('.sw1-xbtn')
    await p.waitForTimeout(1200)
    await p.screenshot({ path: `${out}/xray_1440.png` })
    await p.click('.sw1-xbtn')
    await p.waitForTimeout(900)
  }
  for (const [i, sel] of [['', '.sw1-story'], ['_2', '.sw1-strip'], ['_3', '.sw1-mission'], ['_4', '.sw1-tri'], ['_5', '.sw1-work']]) {
    await p.evaluate((s) => { const sc = document.querySelector('.sw1-scroll'); const el = document.querySelector(s); sc.scrollTo({ top: sc.scrollTop + el.getBoundingClientRect().top - (s === '.sw1-story' ? 0 : 40), behavior: 'instant' }) }, sel)
    await p.waitForTimeout(1500)
    await p.screenshot({ path: `${out}/scroll${i}_1440.png` })
  }
  await p.context().close()
  p = await open(390, 844, '?state=result', true)
  await p.waitForSelector('.sw1[data-state="result"]', { timeout: 20000 }).catch(() => logs.push('no result 390'))
  await p.waitForTimeout(2500)
  await p.screenshot({ path: `${out}/screen_390.png` })
  await p.evaluate(() => { const sc = document.querySelector('.sw1-scroll'); sc.scrollTo({ top: document.querySelector('.sw1-story').offsetTop, behavior: 'instant' }) })
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${out}/scroll_390.png` })
  await p.context().close()
  p = await open(1440, 900, '')
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${out}/idle_1440.png` })
  await p.context().close()
} else {
  const p = await open(1440, 900, '')
  await p.waitForTimeout(800)
  const t0 = Date.now()
  await p.click('[data-qa="primary"]')
  await p.waitForSelector('.sw1[data-phase="drawing"]', { timeout: 40000 }).catch(() => logs.push('no drawing phase'))
  console.log('models answered after ms', Date.now() - t0)
  for (const t of [900, 1900, 2900]) {
    await p.waitForTimeout(t === 900 ? 900 : 1000)
    await p.screenshot({ path: `${out}/film_${t}.png` })
  }
  await p.waitForSelector('.sw1[data-state="result"]', { timeout: 20000 }).catch(() => logs.push('no result after press'))
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${out}/film_result.png` })
  console.log(await p.evaluate(() => document.querySelector('.sw1-left').innerText + '\n' + document.querySelector('.sw1-cap').innerText + '\n' + document.querySelector('.sw1-tag-r')?.innerText))
  const box = await p.locator('.sw1-cell.hot').first().boundingBox({ timeout: 3000 }).catch(() => null)
  if (box) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/film_hover.png` }) }
  await p.context().close()
}
console.log(logs.length ? logs.join('\n') : 'no console errors')
await browser.close()

// Dev-only: screenshots of this proto (installed Edge through playwright-core).
// node src/protos/veinsqueeze_w1/_shot.mjs <outDir> [port]
import { chromium } from 'playwright-core'

const out = process.argv[2] ?? '../work/Web/shots/k2/veinsqueeze_w1'
const port = process.argv[3] ?? '5604'
const url = `http://localhost:${port}/#/proto/veinsqueeze_w1/home?state=result`
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] })
const logs = []
for (const [w, h, name] of [
  [1440, 900, '1440'],
  [390, 844, '390'],
]) {
  const phone = w <= 500
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[${name}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[${name}] pageerror ${e.message}`))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector('.vw1[data-ready="1"]', { timeout: 150000 }).catch(() => logs.push(`[${name}] no data-ready`))
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${out}/screen_${name}.png` })
  const ok = () => page.waitForSelector('.vw1[data-ready="1"]', { timeout: 150000 }).catch(() => {})
  await ok()
  const sideways = await page.evaluate(() => {
    const r = document.querySelector('.vw1')
    return r ? r.scrollWidth - r.clientWidth : -1
  })
  if (sideways > 0) logs.push(`[${name}] sideways scroll ${sideways}px`)
  // walk down the scroll section
  await ok()
  const marks = await page.evaluate(() => {
    const r = document.querySelector('.vw1')
    const top = (sel) => {
      const el = r.querySelector(sel)
      return el ? Math.round(el.getBoundingClientRect().top + r.scrollTop) : 0
    }
    return { story: top('#vw1-story'), beats: top('.vw1-beats'), neck: top('.vw1-beat-full'), work: top('.vw1-work'), facts: top('.vw1-facts'), end: r.scrollHeight }
  })
  const stops = { scroll: marks.story, scroll_b: marks.beats - 40, scroll_c: marks.neck - 30, scroll_d: marks.work, scroll_e: marks.facts - 30, scroll_f: marks.end }
  for (const [k, y] of Object.entries(stops)) {
    await ok()
    await page.evaluate((yy) => document.querySelector('.vw1')?.scrollTo({ top: yy, behavior: 'instant' }), y)
    await page.waitForTimeout(1400)
    await ok()
    await page.evaluate((yy) => document.querySelector('.vw1')?.scrollTo({ top: yy, behavior: 'instant' }), y)
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${out}/${k}_${name}.png` })
  }
  await ctx.close()
}
// the real press, at 1440: idle, mid-hold, and the settled result
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && logs.push(`[press] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[press] pageerror ${e.message}`))
  await page.goto(`http://localhost:${port}/#/proto/veinsqueeze_w1/home`, { waitUntil: 'load' })
  await page.waitForSelector('.vw1[data-ready="1"]', { timeout: 150000 }).catch(() => logs.push('[press] no data-ready'))
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/idle_1440.png` })
  const btn = page.locator('.vsq-hold')
  const box = await btn.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(2300)
    await page.screenshot({ path: `${out}/hold_1440.png` })
    await page.mouse.up()
    await page.waitForSelector('.vw1[data-state="result"]', { timeout: 150000 }).catch(() => logs.push('[press] never reached result'))
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${out}/pressed_result_1440.png` })
    console.log('act:', await page.locator('.vw1-act').innerText())
  }
  await ctx.close()
}
await browser.close()
console.log(logs.length ? logs.join('\n') : 'no console errors')

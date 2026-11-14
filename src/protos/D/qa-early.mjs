// Dev-only check for prototype D (not part of the app bundle).
//   node src/protos/D/qa-early.mjs <outDir> [port]
// 1. Presses "Grade this blood" before the models are warm: the stored outlines must start at once (REPLAY)
//    and the tag must turn LIVE when the model lands. 2. Presses it warm: time to the first outline.
// 3. Home hover: weight stays on Blood. 4. Small-screen stills (1366x700, 360x640).
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? 'qa-out')
const port = process.argv[3] ?? '5204'
const base = `http://localhost:${port}/#/proto/D/`
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu'] })
const errors = []
const log = (...a) => console.log(...a)
const watch = (page, name) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${name}: [pageerror] ${e.message}`))
}
const tag = (page) => page.textContent('[data-qa="mode"]')
const drawn = (page) => page.evaluate(() => [...document.querySelectorAll('.drp-field g[data-cells] > g')].filter((g) => g.style.visibility === 'visible').length)
const firstOutline = async (page, t0) => {
  await page.waitForFunction(() => [...document.querySelectorAll('.drp-field g[data-cells] > g')].some((g) => g.style.visibility === 'visible'), null, { timeout: 60000, polling: 16 })
  return Date.now() - t0
}

// ---- 1. early press (fresh context, so nothing is cached)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'early')
  await page.goto(base + 'spikecount')
  await page.waitForSelector('[data-qa="primary"]')
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  log('early: tag before press:', await tag(page), '| ready:', await page.evaluate(() => document.querySelector('.drp').dataset.ready ?? 'no'))
  const t0 = Date.now()
  await page.click('[data-qa="primary"]')
  log('early: first outline after', await firstOutline(page, t0), 'ms | tag:', await tag(page))
  await page.screenshot({ path: join(out, 'early_press_mid.png') })
  await page.waitForFunction(() => document.querySelector('.drp')?.dataset.state === 'result', null, { timeout: 60000 })
  log('early: settled after', Date.now() - t0, 'ms | tag:', await tag(page), '| hero:', await page.textContent('[data-qa="answer"]'))
  await page.waitForFunction(() => document.querySelector('[data-qa="mode"]')?.textContent === 'LIVE', null, { timeout: 60000 }).catch(() => log('early: tag never turned LIVE'))
  log('early: tag at', Date.now() - t0, 'ms:', await tag(page), '| hero:', await page.textContent('[data-qa="answer"]'), '| outlines:', await drawn(page))
  await page.screenshot({ path: join(out, 'early_press_live.png') })
  // grade again, now warm
  const t1 = Date.now()
  await page.click('[data-qa="primary"]')
  log('again (warm): first outline after', await firstOutline(page, t1), 'ms | tag:', await tag(page))
  await page.waitForFunction(() => document.querySelector('.drp')?.dataset.state === 'result', null, { timeout: 60000 })
  log('again: settled after', Date.now() - t1, 'ms | tag:', await tag(page), '| hero:', await page.textContent('[data-qa="answer"]'))
  await ctx.close()
}

// ---- 2. warm press (wait for data-ready)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'warm')
  const tl = Date.now()
  await page.goto(base + 'spikecount')
  await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
  log('warm: ready after', Date.now() - tl, 'ms | tag:', await tag(page))
  const t0 = Date.now()
  await page.click('[data-qa="primary"]')
  await page.waitForTimeout(120)
  await page.screenshot({ path: join(out, 'warm_press_120ms.png') })
  log('warm: first outline after', await firstOutline(page, t0), 'ms | tag:', await tag(page))
  await ctx.close()
}

// ---- 3. Home hover and small screens
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  watch(page, 'home')
  await page.goto(base + 'home?state=result')
  await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
  await page.hover('.drp-row:nth-child(4)')
  await page.waitForTimeout(900)
  log('home hover Veins: weights', await page.evaluate(() => [...document.querySelectorAll('.drp-row .drp-fit')].map((e) => e.style.fontWeight).join(',')), '| shown:', await page.getAttribute('.drp-stage', 'data-shown'))
  await page.screenshot({ path: join(out, 'home_hover_veins_1440.png') })
  await page.hover('.drp-row:nth-child(2)')
  await page.waitForTimeout(900)
  await page.screenshot({ path: join(out, 'home_hover_bubbles_1440.png') })
  await ctx.close()
}
for (const [w, h, phone] of [
  [1366, 700, false],
  [360, 640, true],
  [1920, 1080, false],
]) {
  const ctx = await browser.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } })
  for (const route of ['home?state=result', 'spikecount?state=result', 'spikecount?state=idle']) {
    const page = await ctx.newPage()
    watch(page, `${route}@${w}`)
    await page.goto(base + route)
    await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
    await page.waitForTimeout(300)
    const small = await page.evaluate(() => {
      const bad = []
      for (const el of document.querySelectorAll('.drp-sheet *')) {
        if (!el.checkVisibility({ visibilityProperty: true }) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) continue
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs < 12.9) bad.push(`${el.className || el.tagName}:${fs.toFixed(1)}`)
      }
      return { bad, scrollH: document.documentElement.scrollHeight, innerH: innerHeight, sideways: document.documentElement.scrollWidth > innerWidth }
    })
    log(`${route} @${w}x${h}: under 13 px: [${small.bad.join(', ')}] | page ${small.scrollH}/${small.innerH} | sideways ${small.sideways}`)
    await page.screenshot({ path: join(out, `${route.replace(/\?state=/, '_')}_${w}x${h}.png`) })
    await page.close()
  }
  await ctx.close()
}
log(errors.length ? `console errors:\n${errors.join('\n')}` : 'console: clean')
await browser.close()

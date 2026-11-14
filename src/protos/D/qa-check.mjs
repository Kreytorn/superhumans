// Dev-only interaction check for prototype D (not part of the app bundle).
//   node src/protos/D/qa-check.mjs <outDir> [port]
// Presses every control with mouse, keyboard and touch, saves screenshots, prints what changed.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? 'qa-out')
const port = process.argv[3] ?? '5204'
const base = `http://localhost:${port}/#/proto/D/`
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu'] })
const log = (...a) => console.log(...a)
const errors = []

async function open(ctx, route) {
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`${route}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${route}: [pageerror] ${e.message}`))
  await page.goto('about:blank')
  await page.goto(base + route)
  await page.waitForSelector('[data-ready="1"]', { timeout: 30000 })
  await page.evaluate(() => document.fonts.ready)
  return page
}
const shot = (page, name) => page.screenshot({ path: join(out, name) })
const state = (page) => page.evaluate(() => document.querySelector('.drp')?.getAttribute('data-state'))

// ---------------- laptop
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  let page = await open(ctx, 'spikecount')
  log('spike idle state:', await state(page), '| tag:', await page.textContent('[data-qa="mode"]'))
  const t0 = Date.now()
  await page.click('[data-qa="primary"]')
  await page.waitForTimeout(150)
  log('after press (150 ms): state', await state(page), '| button:', (await page.textContent('[data-qa="primary"]')).trim())
  await page.waitForFunction(() => document.querySelector('.drp')?.getAttribute('data-state') === 'result', null, { timeout: 60000 })
  log('result after', Date.now() - t0, 'ms | tag:', await page.textContent('[data-qa="mode"]'), '| hero:', await page.textContent('[data-qa="answer"]'), '| act:', (await page.textContent('[data-qa="act"]')).trim())
  await shot(page, 'live_result_1440.png')
  await page.mouse.click(584 + 600, 44 + 500)
  await page.waitForTimeout(150)
  const picked1 = await page.textContent('[data-qa="cell-note"]')
  await page.focus('.drp-field')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  log('cell press:', picked1, '| arrow key:', await page.textContent('[data-qa="cell-note"]'))
  await shot(page, 'cell_pick_1440.png')
  // keyboard: focus the layer link and open it with Enter
  await page.focus('.drp-how-link')
  await page.keyboard.press('Enter')
  await page.waitForSelector('dialog.drp-how[open]')
  await page.waitForTimeout(450)
  log('how open:', await page.evaluate(() => document.querySelector('dialog.drp-how').open), '| run note:', await page.textContent('[data-qa="run-note"]'))
  await shot(page, 'how_1440.png')
  await page.evaluate(() => document.querySelector('.drp-table')?.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  await shot(page, 'how_table_1440.png')
  await page.click('.drp-step:nth-child(3)')
  await page.waitForTimeout(900)
  log('mission step:', await page.textContent('[data-qa="step-note"]'), '| window field:', await page.getAttribute('.drp-stage', 'data-field'), '| tag:', await page.textContent('[data-qa="mode"]'))
  await page.evaluate(() => document.querySelector('.drp-steps').scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  await shot(page, 'how_step_1440.png')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)
  log('after Escape: open', await page.evaluate(() => document.querySelector('dialog.drp-how').open), '| window field:', await page.getAttribute('.drp-stage', 'data-field'), '| state:', await state(page))
  await page.close()

  page = await open(ctx, 'home')
  for (const [i, name] of [[0, 'radiation'], [1, 'bubbles'], [3, 'veins'], [4, 'brain'], [5, 'nausea']]) {
    await page.hover(`.drp-row:nth-child(${i + 1})`)
    await page.waitForTimeout(650)
    log('hover', name, '-> selected', await page.getAttribute('.drp-home', 'data-selected'), '| shown', await page.getAttribute('.drp-stage', 'data-shown'))
    await shot(page, `home_hover_${name}_1440.png`)
  }
  await page.mouse.move(1000, 880)
  await page.waitForTimeout(650)
  log('mouse away -> selected', await page.getAttribute('.drp-home', 'data-selected'))
  // keyboard: tab to the first row, Enter opens it
  await page.focus('.drp-row:nth-child(5)')
  await page.waitForTimeout(600)
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => location.hash.includes('braindrift'), null, { timeout: 3000 })
  await page.waitForSelector('[data-ready="1"][data-view="braindrift"]')
  log('keyboard Enter on Brain ->', await page.evaluate(() => location.hash))
  await page.close()
  page = await open(ctx, 'home')
  await page.click('.drp-how-link')
  await page.waitForSelector('dialog.drp-how[open]')
  await page.waitForTimeout(450)
  await shot(page, 'home_how_1440.png')
  await page.mouse.click(1100, 450) // a press on the window (outside the panel) closes the layer
  await page.waitForTimeout(300)
  log('home how closed by outside press:', !(await page.evaluate(() => document.querySelector('dialog.drp-how').open)))
  await page.click('.drp-stage')
  await page.waitForFunction(() => location.hash.includes('spikecount'), null, { timeout: 3000 })
  log('window press ->', await page.evaluate(() => location.hash))
  await page.close()
  for (const id of ['tracktrace', 'bubblegrade', 'veinsqueeze', 'braindrift', 'garnmeter']) {
    page = await open(ctx, id)
    await shot(page, `preview_${id}_1440.png`)
    const m = await page.evaluate(() => {
      const r = document.querySelector('[data-qa="hero"]').getBoundingClientRect()
      return Math.round((100 * r.width * r.height) / (innerWidth * innerHeight))
    })
    await page.click('[data-qa="primary"]')
    await page.waitForFunction(() => location.hash.endsWith('/home'), null, { timeout: 3000 })
    log('preview', id, 'window', m + '% | back ->', await page.evaluate(() => location.hash))
    await page.close()
  }
  await ctx.close()
}

// ---------------- phone (touch)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  let page = await open(ctx, 'spikecount')
  log('phone tag:', await page.textContent('[data-qa="mode"]'))
  await page.tap('[data-qa="primary"]')
  await page.waitForTimeout(1200)
  await shot(page, 'phone_running_390.png')
  await page.waitForFunction(() => document.querySelector('.drp')?.getAttribute('data-state') === 'result', null, { timeout: 20000 })
  log('phone result | tag:', await page.textContent('[data-qa="mode"]'), '| hero:', await page.textContent('[data-qa="answer"]'))
  await page.touchscreen.tap(200, 250)
  await page.waitForTimeout(200)
  log('phone cell tap:', await page.textContent('[data-qa="cell-note"]'))
  await shot(page, 'cell_pick_390.png')
  await page.tap('.drp-how-link')
  await page.waitForSelector('dialog.drp-how[open]')
  await page.waitForTimeout(500)
  await shot(page, 'how_390.png')
  await page.evaluate(() => document.querySelector('.drp-table')?.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  await shot(page, 'how_table_390.png')
  await page.tap('.drp-step:nth-child(1)')
  await page.waitForTimeout(900)
  await shot(page, 'how_step_390.png')
  log('phone step:', await page.textContent('[data-qa="step-note"]'))
  await page.tap('.drp-close')
  await page.waitForTimeout(600)
  log('phone how closed:', !(await page.evaluate(() => document.querySelector('dialog.drp-how').open)), '| overflow-x:', await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
  await page.close()

  page = await open(ctx, 'home')
  await page.tap('.drp-row:nth-child(4)')
  await page.waitForTimeout(380)
  await shot(page, 'phone_home_tap_veins_390.png')
  await page.waitForFunction(() => location.hash.includes('veinsqueeze'), null, { timeout: 3000 })
  await page.waitForSelector('[data-ready="1"][data-view="veinsqueeze"]')
  log('phone tap Veins ->', await page.evaluate(() => location.hash))
  await page.close()
  for (const id of ['tracktrace', 'bubblegrade', 'veinsqueeze', 'braindrift', 'garnmeter']) {
    page = await open(ctx, id)
    await shot(page, `preview_${id}_390.png`)
    await page.close()
  }
  page = await open(ctx, 'home')
  await page.tap('[data-qa="primary"]')
  await page.waitForFunction(() => location.hash.includes('spikecount'), null, { timeout: 3000 })
  log('phone primary ->', await page.evaluate(() => location.hash))
  await ctx.close()
}

log(errors.length ? `console errors (${errors.length}):\n` + errors.slice(0, 12).join('\n') : 'no console errors')
await browser.close()

// Dev-only screenshots for take V01 (installed Microsoft Edge through playwright-core, no download).
//   node src/protos/V01/_tools/shots.mjs <outDir> <job> [job...]
// jobs: home hover focus film back mod:<id> still gallery
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PORT = 5501
const BASE = `http://localhost:${PORT}/#/proto/V01`
const out = resolve(process.argv[2] ?? '.')
const jobs = process.argv.slice(3)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})
const logs = []
async function ctxFor(size, extra = {}) {
  const phone = size.w <= 500
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: phone ? 2 : 1,
    isMobile: phone,
    hasTouch: phone,
    ...extra,
  })
  const page = await ctx.newPage()
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`))
  return { ctx, page }
}
async function open(page, view) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/${view}`, { waitUntil: 'load' })
  await page.waitForSelector('[data-ready="1"]', { state: 'attached', timeout: 45000 }).catch(() => logs.push(`[shots] not ready: ${view}`))
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(350)
}
const DESK = { w: 1440, h: 900 }
const PHONE = { w: 390, h: 844 }
const shot = (page, name, opts = {}) => page.screenshot({ path: join(out, name), ...opts })

for (const job of jobs) {
  if (job === 'home' || job === 'gallery') {
    for (const size of [DESK, PHONE]) {
      const { ctx, page } = await ctxFor(size)
      await open(page, 'home')
      await shot(page, `home_${size.w}.png`)
      await ctx.close()
    }
  } else if (job === 'hover') {
    const { ctx, page } = await ctxFor(DESK)
    await open(page, 'home')
    for (const i of [1, 4]) {
      const box = await page.locator('.v01-gate').nth(i).boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
      await page.waitForTimeout(900)
      await shot(page, `hover${i}_1440.png`)
    }
    await ctx.close()
  } else if (job === 'focus') {
    const { ctx, page } = await ctxFor(DESK)
    await open(page, 'home')
    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(900)
    await shot(page, 'focus2_1440.png')
    const active = await page.evaluate(() => document.activeElement?.getAttribute('aria-label')?.slice(0, 30))
    console.log('focused:', active)
    await ctx.close()
  } else if (job === 'film' || job.startsWith('film:')) {
    const gi = job.startsWith('film:') ? Number(job.slice(5)) : null
    for (const size of [DESK, PHONE]) {
      const { ctx, page } = await ctxFor(size)
      await open(page, 'home')
      const box = await page.locator('.v01-gate').nth(gi ?? (size === DESK ? 4 : 1)).boundingBox()
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      if (size === DESK) {
        await page.mouse.move(x, y)
        await page.waitForTimeout(500)
        await page.mouse.down()
        await page.mouse.up()
      } else await page.touchscreen.tap(x, y)
      const t0 = Date.now()
      for (const t of [250, 500, 750, 950, 1150, 1500, 2600]) {
        await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
        await shot(page, `film_${size.w}_${String(t).padStart(4, '0')}.jpg`, { type: 'jpeg', quality: 80 })
      }
      console.log('after film url:', page.url())
      await ctx.close()
    }
  } else if (job === 'back') {
    const { ctx, page } = await ctxFor(DESK)
    await open(page, 'braindrift')
    await page.locator('.v01-back').click()
    const t0 = Date.now()
    for (const t of [200, 450, 800, 1300, 2200]) {
      await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)))
      await shot(page, `back_1440_${String(t).padStart(4, '0')}.jpg`, { type: 'jpeg', quality: 80 })
    }
    console.log('after back url:', page.url())
    await ctx.close()
  } else if (job.startsWith('mod:')) {
    const id = job.slice(4)
    for (const size of [DESK, PHONE]) {
      const { ctx, page } = await ctxFor(size)
      await open(page, id)
      await page.waitForTimeout(1500)
      await shot(page, `mod_${id}_${size.w}.png`)
      await shot(page, `mod_${id}_${size.w}_full.jpg`, { fullPage: true, type: 'jpeg', quality: 80 })
      if (size === DESK) {
        await page.locator('.v01-run').click()
        await page.waitForTimeout(6500)
        await shot(page, `mod_${id}_${size.w}_run.jpg`, { type: 'jpeg', quality: 82 })
      }
      await ctx.close()
    }
  } else if (job === 'still') {
    // no WebGL: the flat hall must still show six working buttons
    const b2 = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu', '--disable-3d-apis', '--hide-scrollbars'] })
    for (const size of [DESK, PHONE]) {
      const ctx = await b2.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.w <= 500 ? 2 : 1 })
      const page = await ctx.newPage()
      await open(page, 'home')
      await shot(page, `still_${size.w}.png`)
      if (size === DESK) {
        await page.locator('.v01-gate').nth(2).click()
        await page.waitForTimeout(1500)
        console.log('still click ->', page.url())
      }
      await ctx.close()
    }
    await b2.close()
  }
}
if (logs.length) console.log('--- console ---\n' + [...new Set(logs)].slice(-25).join('\n'))
await browser.close()

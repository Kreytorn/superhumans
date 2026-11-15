// Dev-only: walks the press-and-fly-in flow and saves frames. node src/protos/WORLDS/flow.mjs <outDir> [WxH]
import { chromium } from 'playwright-core'
const [out, size = '1440x900', only = ''] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const phone = width <= 500
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars'] })
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto('http://localhost:5323/#/proto/WORLDS/home', { waitUntil: 'load' })
await page.waitForSelector('.wd-root[data-ready="1"]', { timeout: 30000 })
await page.waitForTimeout(600)
const ids = only ? only.split(',') : ['tracktrace', 'bubblegrade', 'spikecount', 'veinsqueeze', 'braindrift', 'garnmeter']
const tag = phone ? '390' : '1440'
for (const id of ids) {
  const btn = page.locator(`.wd-label[data-id="${id}"]`)
  if (phone) await btn.tap({ force: true })
  else await btn.click({ force: true })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/fly_${id}_${tag}_a.jpg`, type: 'jpeg', quality: 86 })
  const ok = await page.waitForSelector('.wd-page[data-open="1"]', { timeout: 15000 }).then(() => true).catch(() => false)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/page_${id}_${tag}.jpg`, type: 'jpeg', quality: 88 })
  let state = 'n/a'
  if (ok) {
    await page.locator('.wd-run').click()
    await page.waitForFunction(() => document.querySelector('.wd-run')?.textContent?.includes('again'), null, { timeout: Number(process.env.RUN_WAIT || 45000) }).catch(() => undefined)
    await page.waitForTimeout(1200)
    state = (await page.locator('.wd-run').textContent()) ?? ''
    await page.screenshot({ path: `${out}/result_${id}_${tag}.jpg`, type: 'jpeg', quality: 88 })
  }
  const act = await page.locator('.wd-act').innerText().catch(() => '')
  console.log(`${id}: opened=${ok} run="${state.trim()}" act="${act.replace(/\n/g, ' | ').slice(0, 140)}"`)
  await page.locator('.wd-back').click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/back_${id}_${tag}.jpg`, type: 'jpeg', quality: 80 })
  await page.waitForTimeout(1500)
  const home = await page.evaluate(() => location.hash)
  if (!home.endsWith('/home')) console.log('  back did not return home: ' + home)
}
if (logs.length) console.log('--- errors ---\n' + [...new Set(logs)].slice(0, 20).join('\n'))
await browser.close()

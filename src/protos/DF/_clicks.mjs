// Dev-only: every body spot, callout, sample thumb and phone row must fly into its check, and Back must fly home.
import { chromium } from 'playwright-core'
const ids = ['tracktrace', 'bubblegrade', 'spikecount', 'veinsqueeze', 'braindrift', 'garnmeter']
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--mute-audio'] })
const errs = []
async function run(width, height, selectors) {
  const phone = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone })
  page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message.slice(0, 200)}`))
  await page.goto('http://localhost:5310/#/proto/DF/home', { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForSelector('.df[data-ready="1"]', { timeout: 45000 })
  const out = []
  for (const sel of selectors) {
    for (let i = 0; i < 6; i++) {
      const el = page.locator(sel).nth(i)
      await el.scrollIntoViewIfNeeded().catch(() => {})
      await (phone ? el.tap({ timeout: 5000 }) : el.click({ timeout: 5000 })).catch((e) => errs.push(`${sel}[${i}]: ${e.message.split('\n')[0]}`))
      await page.waitForSelector(`.df[data-landed="1"] .df-check[data-module="${ids[i]}"]`, { timeout: 15000 }).catch(() => errs.push(`${sel}[${i}] never landed on ${ids[i]}`))
      const got = await page.evaluate(() => location.hash)
      const back = page.locator('.df-back').first()
      await (phone ? back.tap({ timeout: 5000 }) : back.click({ timeout: 5000 })).catch((e) => errs.push('back: ' + e.message.split('\n')[0]))
      await page.waitForSelector('.df[data-view="home"]:not([data-landed])', { timeout: 15000 }).catch(() => errs.push(`${sel}[${i}] never came home`))
      await page.waitForFunction(() => !document.querySelector('.df-check'), null, { timeout: 15000 }).catch(() => errs.push(`${sel}[${i}] page still mounted`))
      const home = await page.evaluate(() => location.hash)
      out.push(`${got === '#/proto/DF/' + ids[i] && home === '#/proto/DF/home' ? 'ok ' : 'BAD'} ${width} ${sel}[${i}] -> ${got} -> ${home}`)
    }
  }
  console.log(out.join('\n'))
  await page.close()
}
await run(1440, 900, ['.df-hs', '.df-lab', '.df-thumb'])
await run(390, 844, ['.df-hs', '.df-row'])
console.log(errs.length ? errs.join('\n') : 'no errors')
await browser.close()

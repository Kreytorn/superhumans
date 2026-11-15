// Dev-only: the TrackTrace page scrolled to the IonScan figure, desktop and phone. node src/protos/WORLDS/arch.mjs <outDir>
import { chromium } from 'playwright-core'
const [out] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars'] })
for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5323/#/proto/WORLDS/tracktrace', { waitUntil: 'load' })
  await page.waitForSelector('.wd-page[data-open="1"]', { timeout: 30000 })
  await page.waitForTimeout(1200)
  const info = await page.evaluate(() => {
    const p = document.querySelector('.wd-page')
    const a = document.querySelector('.wd-arch')
    a.scrollIntoView({ block: 'end' })
    return { scrollW: p.scrollWidth, clientW: p.clientWidth, docW: document.documentElement.scrollWidth, winW: innerWidth }
  })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/arch_${w}.jpg`, type: 'jpeg', quality: 88 })
  console.log(w, JSON.stringify(info))
  await ctx.close()
}
await browser.close()

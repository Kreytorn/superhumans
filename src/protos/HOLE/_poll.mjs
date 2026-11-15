// Dev-only: press the main button on a module page and print the stage's state every 2 s.
// node src/protos/HOLE/_poll.mjs <module id> [seconds]
import { chromium } from 'playwright-core'
const [id, secs = '24'] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(`http://localhost:5324/#/proto/HOLE/${id}`, { waitUntil: 'load' })
await page.waitForSelector('.hole-run', { timeout: 20000 })
await page.waitForTimeout(Number(process.argv[4] ?? 3000))
await page.click('.hole-run')
const out = []
for (let i = 0; i < Number(secs) / 2; i++) {
  await page.waitForTimeout(2000)
  out.push(await page.evaluate(() => `${document.querySelector('.hole-mod')?.dataset.state}:${document.querySelector('.hole-run')?.textContent}`))
}
console.log(id, out.join(' | '))
console.log('act:', await page.textContent('.hole-act'))
if (errs.length) console.log(errs.slice(-4).join('\n'))
await browser.close()

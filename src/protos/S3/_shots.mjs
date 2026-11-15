// S3 screenshot driver (dev only): node src/protos/S3/_shots.mjs <outDir> [what]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const out = process.argv[2]
const what = process.argv[3] ?? 'all'
mkdirSync(out, { recursive: true })
const base = 'http://localhost:5303/#/proto/S3/'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--enable-unsafe-webgpu', '--use-angle=d3d11'] })
const logs = []
async function page(w, h) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 700, isMobile: w < 700 })
  p.on('pageerror', (e) => logs.push('[pageerror] ' + e.message))
  p.on('console', (m) => m.type() === 'error' && logs.push('[console] ' + m.text().slice(0, 200)))
  return p
}
const ready = (p) => p.waitForSelector('.s3[data-ready="1"]', { timeout: 20000 }).catch(() => logs.push('not ready'))
if (what === 'all' || what === 'home') {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await page(w, h)
    await p.goto(base + 'home'); await ready(p)
    await p.screenshot({ path: `${out}/home_${w}.png` })
    const total = await p.evaluate(() => document.documentElement.scrollHeight)
    let i = 0
    for (let y = h * 0.9; y < total - h * 0.2 && i < 9; y += h * 0.9) {
      await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(1500)
      await p.screenshot({ path: `${out}/home_${w}_scroll${++i}.png` })
    }
    if (w > 700) { // hover a strip item, then click it
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600)
      await p.hover('.s3-strip li:nth-child(5) a'); await p.waitForTimeout(2200)
      await p.screenshot({ path: `${out}/home_${w}_hover5.png` })
      await p.hover('.s3-strip li:nth-child(3) a'); await p.waitForTimeout(2200)
      await p.screenshot({ path: `${out}/home_${w}_hover3.png` })
      await p.click('.s3-strip li:nth-child(2) a'); await p.waitForTimeout(2600)
      logs.push('after strip click: ' + p.url())
      await p.screenshot({ path: `${out}/home_${w}_after_click_bubblegrade.png` })
    }
    await p.close()
  }
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const p = await page(w, h)
    await p.goto(base + 'home'); await ready(p)
    await p.screenshot({ path: `${out}/home_${w}.png` })
    await p.goto(base + 'veinsqueeze'); await ready(p); await p.waitForTimeout(1200)
    await p.screenshot({ path: `${out}/veinsqueeze_${w}_idle.png` })
    await p.close()
  }
}
const mods = what === 'all' || what === 'mods' ? ['tracktrace', 'bubblegrade', 'spikecount', 'veinsqueeze', 'braindrift', 'garnmeter'] : what === 'home' ? [] : what.split(',')
for (const m of mods) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await page(w, h)
    await p.goto(base + m); await ready(p); await p.waitForTimeout(1200)
    await p.screenshot({ path: `${out}/${m}_${w}_idle.png` })
    await p.click('.s3-stage-btns .s3-btn-solid').catch((e) => logs.push(m + ' run click failed ' + e.message.slice(0, 80)))
    await p.waitForSelector('.s3-stage-btns .s3-btn-solid[data-state="result"]', { timeout: 45000 }).catch(() => logs.push(m + ' ' + w + ': no result state'))
    await p.waitForTimeout(1500)
    await p.screenshot({ path: `${out}/${m}_${w}_result.png` })
    if (m === 'tracktrace' && w > 700) {
      await p.evaluate(() => document.querySelector('.s3-arch')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(1600)
      await p.screenshot({ path: `${out}/${m}_${w}_arch.png` })
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1200)
      await p.screenshot({ path: `${out}/${m}_${w}_pager.png` })
      await p.click('.s3-pager-next'); await p.waitForTimeout(1500)
      logs.push('after next: ' + p.url())
    }
    await p.close()
  }
}
console.log(logs.join('\n'))
await browser.close()

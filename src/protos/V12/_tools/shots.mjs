// Dev-only: screenshots of V12 at given sizes once the page says it has settled.
// node src/protos/V12/_tools/shots.mjs <route> <outPrefix> [WxH,...] [--hover id] [--focus id] [--wait ms] [--film] [--t 0,300,...]
import { chromium } from 'playwright-core'

const argv = process.argv.slice(2)
const flag = (k) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : undefined
}
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && !['--film'].includes(argv[i - 1])))
const [route, prefix, sizesArg = '1440x900,390x844'] = pos
const hover = flag('--hover')
const focus = flag('--focus')
const wait = Number(flag('--wait') ?? 300)
const film = argv.includes('--film')
const times = (flag('--t') ?? '0,300,600,900,1300,2500').split(',').map(Number)
const port = flag('--port') ?? '5512'
const intro = argv.includes('--intro')

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1'] })
for (const s of sizesArg.split(',')) {
  const [width, height] = s.split('x').map(Number)
  const mobile = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile })
  const logs = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  const t0 = Date.now()
  if (intro) {
    // warm the cache once, then film the entrance from a fresh load
    await page.goto(`http://localhost:${port}/#/${route}`, { waitUntil: 'load' })
    await page.waitForSelector('[data-ready="1"]', { timeout: 15000 }).catch(() => null)
    await page.goto('about:blank')
    await page.goto(`http://localhost:${port}/#/${route}`, { waitUntil: 'commit' })
    await page.waitForSelector('.v12-home', { timeout: 15000 })
    const s0 = Date.now()
    for (const t of times) {
      const left = t - (Date.now() - s0)
      if (left > 0) await page.waitForTimeout(left)
      await page.screenshot({ path: `${prefix}_intro_${width}_${String(t).padStart(5, '0')}.png` })
    }
    await page.close()
    continue
  }
  await page.goto(`http://localhost:${port}/#/${route}`, { waitUntil: 'load' })
  await page.waitForSelector('[data-ready="1"]', { timeout: 15000 }).catch(() => logs.push('[shots] never ready'))
  const readyMs = Date.now() - t0
  await page.waitForTimeout(wait)
  if (hover) await page.hover(`[data-win="${hover}"]`).catch((e) => logs.push('[hover] ' + e.message))
  if (focus) {
    await page.keyboard.press('Tab')
    await page.evaluate((id) => document.querySelector(`.v12-svg-home [data-win="${id}"]`)?.focus(), focus)
  }
  if (hover || focus) await page.waitForTimeout(500)
  if (film) {
    const el = await page.$('[data-qa="primary"]')
    const start = Date.now()
    await el.click()
    for (const t of times) {
      const left = t - (Date.now() - start)
      if (left > 0) await page.waitForTimeout(left)
      await page.screenshot({ path: `${prefix}_film_${width}_${String(t).padStart(5, '0')}.png` })
    }
  } else {
    await page.screenshot({ path: `${prefix}_${width}.png` })
  }
  console.log(`${width}x${height} ready in ${readyMs} ms`)
  if (logs.length) console.log(logs.slice(-12).join('\n'))
  await page.close()
}
await browser.close()

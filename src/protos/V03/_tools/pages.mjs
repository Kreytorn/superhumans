// V03 dev shots of any routes at any sizes, after the page reports ready.
// node src/protos/V03/_tools/pages.mjs <outDir> <WxH,WxH> <route,route> [fullPage]
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const [outArg, sizes, routes, full] = process.argv.slice(2)
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11'] })
for (const size of sizes.split(',')) {
  const [width, height] = size.split('x').map(Number)
  const mobile = width < 600
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile })
  const logs = []
  page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
  page.on('pageerror', (e) => logs.push(e.message))
  for (const route of routes.split(',')) {
    await page.goto('about:blank')
    await page.goto(`http://localhost:5503/#/proto/V03/${route}`, { waitUntil: 'load' })
    await page.waitForSelector('[data-ready="1"]', { timeout: 20000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(out, `${route.replace(/[^a-z0-9]+/gi, '_')}_${width}x${height}.png`), fullPage: !!full })
  }
  if (logs.length) console.log(size, 'errors:\n' + logs.join('\n'))
  await page.close()
}
await browser.close()

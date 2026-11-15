// Variety session's real-browser check: headed Edge with the real GPU, a timed walk through one take.
// node src/protos/V00/_tools/check.mjs <id> <port> <outDir> [module=tracktrace] [WxH=1440x731]
// Saves: home_0500/1500/4000.png, hover.png, move_0300/0700/1200/2000/4000.png, module.png, module_run.png, and timings.json.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'

const [id, port, out, mod = 'tracktrace', size = '1440x731'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
mkdirSync(out, { recursive: true })
const NAMES = { tracktrace: 'TrackTrace', bubblegrade: 'BubbleGrade', spikecount: 'SpikeCount', veinsqueeze: 'VeinSqueeze', braindrift: 'BrainDrift', garnmeter: 'Garn Meter' }
const browser = await chromium.launch({
  channel: 'msedge',
  headless: false,
  args: ['--force-device-scale-factor=1', '--enable-unsafe-webgpu', '--use-angle=d3d11', `--window-size=${width + 16},${height + 140}`],
})
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
await page.bringToFront()
const logs = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
const t = {}
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, timeout: 15000 }).catch((e) => logs.push(`[shot ${name}] ${e.message}`))
const url = `http://localhost:${port}/#/proto/${id}/home`
const t0 = Date.now()
await page.goto(url, { waitUntil: 'load' })
t.load_ms = Date.now() - t0
const ready = page.waitForSelector('[data-ready="1"]', { timeout: 20000 }).then(() => (t.ready_ms = Date.now() - t0)).catch(() => (t.ready_ms = 'none in 20 s'))
for (const ms of [500, 1500, 4000]) {
  const wait = t0 + ms - Date.now()
  if (wait > 0) await page.waitForTimeout(wait)
  await shot(`home_${String(ms).padStart(4, '0')}`)
}
await ready
await page.waitForTimeout(1500)
await shot('home_settled')
// frame rate over 2 s on the settled home
t.home_fps = await page.evaluate(() => new Promise((res) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(f); else res(Math.round((n * 1000) / (performance.now() - s))) }; requestAnimationFrame(f) }))
const nm = NAMES[mod] ?? mod
const btn = page.locator(`button[aria-label*="${nm}" i], a[aria-label*="${nm}" i], [role="button"][aria-label*="${nm}" i], [role="link"][aria-label*="${nm}" i], [tabindex][aria-label*="${nm}" i], button:has-text("${nm}"), a:has-text("${nm}")`).first()
try {
  await btn.hover({ timeout: 5000, force: true })
  await page.waitForTimeout(700)
  await shot('hover')
  const c0 = Date.now()
  await btn.click({ timeout: 5000, force: true })
  t.click_ok = true
  for (const ms of [300, 700, 1200, 2000, 4000]) {
    const wait = c0 + ms - Date.now()
    if (wait > 0) await page.waitForTimeout(wait)
    await shot(`move_${String(ms).padStart(4, '0')}`)
  }
  t.hash_after_click = await page.evaluate(() => location.hash)
} catch (e) {
  logs.push(`[click] ${e.message}`)
}
await page.waitForTimeout(2000)
await shot('module')
t.scroll_height = await page.evaluate(() => document.documentElement.scrollHeight)
t.overflows_viewport = t.scroll_height > height + 2
try {
  const primary = page.locator('[data-qa="primary"]').first()
  if (await primary.count()) {
    await primary.click({ timeout: 5000 })
    await page.waitForTimeout(6000)
    await shot('module_run')
  }
} catch (e) {
  logs.push(`[run] ${e.message}`)
}
t.console = logs.slice(-25)
writeFileSync(`${out}/timings.json`, JSON.stringify(t, null, 1))
console.log(JSON.stringify(t, null, 1))
await browser.close()

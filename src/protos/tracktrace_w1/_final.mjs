// Dev-only: final screenshots. node src/protos/tracktrace_w1/_final.mjs [desk|phone]
import { chromium } from 'playwright-core'
const OUT = '../work/Web/shots/k2/tracktrace_w1/'
const URL = 'http://localhost:5601/#/proto/tracktrace_w1/home?state=result'
const want = process.argv[2] || 'all'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const logs = []
async function open(w, h, mobile) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && !m.text().includes('onnxruntime') && logs.push(m.text().slice(0, 240)))
  p.on('pageerror', (e) => logs.push('[pageerror] ' + e.message.slice(0, 300)))
  await p.goto(URL, { waitUntil: 'load' })
  await p.waitForSelector('.w1[data-ready="1"][data-state="result"]', { timeout: 45000 }).catch(() => logs.push('not settled ' + w))
  await p.waitForTimeout(3000)
  return p
}
if (want !== 'phone') {
  const p = await open(1440, 900)
  await p.mouse.move(250, 560)
  await p.waitForTimeout(800)
  await p.screenshot({ path: OUT + 'screen_1440.png' })
  const at = async (id, dy, name) => { await p.evaluate(([i, d]) => { document.getElementById(i)?.scrollIntoView({ block: 'start' }); scrollBy(0, d) }, [id, dy]); await p.waitForTimeout(1600); await p.screenshot({ path: OUT + name }) }
  await at('w1-problem', 0, 'scroll_1440.png')
  await at('w1-problem', 820, 'scroll_1440_b.png')
  await p.click('.w1-bet-head button').catch(() => {})
  await at('w1-problem', 1500, 'scroll_1440_c.png')
  await at('w1-ionscan', 0, 'scroll_1440_d.png')
  await at('w1-ionscan', 700, 'scroll_1440_e.png')
  await at('w1-next', 0, 'scroll_1440_f.png')
  console.log('sideways1440', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth))
  await p.context().close()
}
if (want !== 'desk') {
  const p = await open(390, 844, true)
  await p.screenshot({ path: OUT + 'screen_390.png' })
  await p.evaluate(() => scrollBy(0, 760)); await p.waitForTimeout(900)
  await p.screenshot({ path: OUT + 'screen_390_b.png' })
  await p.evaluate(() => { const e = document.querySelector('.w1-ladder4'); e?.scrollIntoView({ block: 'start' }) }); await p.waitForTimeout(1500)
  await p.screenshot({ path: OUT + 'scroll_390_ladder.png' })
  console.log('sideways390', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth))
  await p.context().close()
}
if (logs.length) console.log([...new Set(logs)].slice(0, 12).join('\n'))
await browser.close()

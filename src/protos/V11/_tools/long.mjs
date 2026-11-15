// Dev-only: list the main thread's long tasks around a press into jewel n, and when the page was shown.
// node src/protos/V11/_tools/long.mjs <n> [WxH] [--cpu]   (--cpu: record a CPU profile and print the heaviest functions)
import { chromium } from 'playwright-core'
const a = process.argv.slice(2)
const [n, size = '1440x900'] = a.filter((x) => !x.startsWith('--'))
const [width, height] = size.split('x').map(Number)
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width, height } })
await page.goto('http://localhost:5511/#/proto/V11/home', { waitUntil: 'load' })
await page.waitForSelector('.v11[data-ready="1"]', { timeout: 40000 })
await page.waitForTimeout(2500)
await page.evaluate(() => {
  window.__lt = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask' })
  window.__shown = 0
  new MutationObserver(() => {
    if (!window.__shown && document.querySelector('.v11-mod[data-shown="1"]')) window.__shown = performance.now()
  }).observe(document.body, { subtree: true, attributes: true, childList: true })
})
const cdp = a.includes('--cpu') ? await page.context().newCDPSession(page) : null
if (cdp) {
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 })
  await cdp.send('Profiler.start')
}
const t0 = await page.evaluate(() => performance.now())
await page.click(`.v11-ch:nth-child(${n})`, { force: true })
await page.waitForTimeout(3000)
const r = await page.evaluate((t0) => ({ lt: window.__lt.map(([s, d]) => `${s - Math.round(t0)}+${d}`).join(' '), shown: Math.round(window.__shown - t0), hash: location.hash }), t0)
console.log(JSON.stringify(r))
if (cdp) {
  const { profile } = await cdp.send('Profiler.stop')
  const self = new Map()
  const byId = new Map(profile.nodes.map((x) => [x.id, x]))
  const dt = profile.timeDeltas
  profile.samples.forEach((id, i) => {
    const nd = byId.get(id)
    const k = `${nd.callFrame.functionName || '(anon)'} ${nd.callFrame.url.split('/').slice(-2).join('/')}:${nd.callFrame.lineNumber}`
    self.set(k, (self.get(k) || 0) + (dt[i] || 0) / 1000)
  })
  console.log([...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([k, v]) => `${v.toFixed(0)}ms ${k}`).join('\n'))
}
await browser.close()

import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
for (const url of ['#/moment/braindrift', '#/proto/GALAXY/braindrift', '#/proto/GALAXY/braindrift']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && console.log(url, 'ERR', m.text().slice(0, 200), JSON.stringify(m.location())))
  await p.goto('http://localhost:5322/' + url)
  await p.waitForTimeout(7000)
  console.log(url, 'contexts', await p.evaluate(() => document.querySelectorAll('canvas').length))
  await ctx.close()
}
await b.close()

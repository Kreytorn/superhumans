import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('pageerror', (e) => logs.push('pageerror ' + e.message))
page.on('console', (m) => { const t = m.text(); if (!t.includes('onnxruntime') && !t.includes('THREE.Clock')) logs.push(m.type() + ' ' + t.slice(0, 200)) })
page.on('framenavigated', (f) => f === page.mainFrame() && logs.push('NAV ' + f.url()))
page.on('load', () => logs.push('LOAD'))
await page.goto('http://localhost:5324/#/proto/HOLE/braindrift', { waitUntil: 'load' })
await page.waitForSelector('.hole-run', { timeout: 20000 })
await page.evaluate(() => { window.__mark = 1 })
await page.waitForTimeout(3000)
await page.click('.hole-run')
const out = []
for (let i = 0; i < 13; i++) {
  await page.waitForTimeout(2000)
  out.push(await page.evaluate(() => `${document.querySelector('.hole-mod')?.dataset.state}/${document.querySelector('.bdm')?.dataset.beat}/mark${window.__mark}/gl${document.querySelector('.hole')?.dataset.webgl}/ph:${document.querySelector('.hole')?.dataset.phase}`).catch((e) => 'eval failed: ' + e.message.slice(0, 60)))
}
console.log(out.join('\n'))
console.log('--- logs\n' + logs.slice(-14).join('\n'))
await browser.close()
